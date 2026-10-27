import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cellOccupied } from "../layouts.ts";
import { createGame, log, rand, sparePower, startCombat } from "../sim.ts";
import type { Game, Room, Ship } from "../types.ts";
import { ARTILLERY_SHOT_LABEL, artillerySwipeSeconds } from "../wiki/weapons-beam.ts";
import {
  CHARGE_SECONDS,
  DISPLAY_NAME,
  lanceInstallCost,
  UPGRADE_COSTS,
  aimLance,
  cutLine,
  installLance,
  tickLance,
  lowerLancePower,
  raiseLancePower,
  toggleLancePower,
} from "./lance.ts";

/** The charge tick starts the swipe. The next tick of the time still left lands the cut. */
function land(g: Game, chargeDt: number): void {
  tickLance(g, chargeDt);
  const kit = g.player.kits.artillery;
  if (kit && kit.left > 0) tickLance(g, kit.left);
}

/** A Federation A hull with its beam taken off, so installLance fits a fresh one. */
function fedFresh(seed: number): Game {
  const g = createGame(seed, "PLAYER_SHIP_FED");
  delete g.player.kits.artillery;
  return g;
}

function armed(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.player.kits.artillery = {
    id: "artillery",
    weapon: "ARTILLERY_FED",
    level: 1,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: true,
    aux: 0.999,
  };
  return g;
}

describe("artillery", () => {
  it("drops enemy hull on a short tick and leaves the shield bubble alone", () => {
    const g = armed(1);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    assert.ok(bubble > 0);
    const room = g.enemy.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    const broken = g.enemy.systems.shields.damage;
    // The swipe cannot be aimed (Artillery Beam, "Overview"): a one-room hull fixes where it lands.
    g.enemy.rooms = [room];
    log(g, "mark");
    tickLance(g, 0.1);
    // Template:Beam weapons: speed 13 over 500px. Per the user: the room takes its cut as the swipe touches it.
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.shots.length, 1);
    assert.equal(g.shots[0]?.label, ARTILLERY_SHOT_LABEL);
    assert.equal(g.shots[0]?.duration, artillerySwipeSeconds());
    assert.equal(g.player.kits.artillery?.aux, 0);
    assert.equal(g.log[0], `${DISPLAY_NAME} cuts ${g.enemy.name}.`);
    const left = g.player.kits.artillery?.left ?? 0;
    assert.ok(left > 0);
    tickLance(g, left);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.shields.damage, broken + 1);
    assert.equal(g.shots.length, 0);
    assert.equal(g.player.kits.artillery?.aux, 0);
    assert.equal(g.log[0], `${DISPLAY_NAME} cuts ${g.enemy.name}.`);
    assert.equal(g.log[1], "mark");
  });

  it("cuts from a random room to the room farthest from it, one hull point per room, and ignores an aim", () => {
    // Artillery Beam, "Overview": the swipe "cannot be controlled". xftl doc/artillery: a random room, then "a second
    // room that is as far away from the first room as possible".
    const g = armed(2);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    aimLance(g, g.enemy.rooms[0].id);
    assert.equal(g.player.kits.artillery?.target, null);
    const saved = g.seed;
    const first = g.enemy.rooms[Math.floor(rand(g) * g.enemy.rooms.length)];
    g.seed = saved;
    const line = cutLine(g.enemy, first.id);
    assert.equal(line[0], first);
    const c = (r: (typeof line)[number]) => [r.x + r.w / 2, r.y + r.h / 2];
    const d = (r: (typeof line)[number]) =>
      Math.hypot(c(r)[0] - c(first)[0], c(r)[1] - c(first)[1]);
    assert.equal(d(line[line.length - 1]), Math.max(...g.enemy.rooms.map(d)));
    land(g, 0.1);
    assert.equal(g.enemy.hull, hull - line.length);
    assert.equal(g.enemy.shieldNow, bubble);
  });

  it("the line takes the rooms it passes through, not the ones beside it", () => {
    const room = (id: string, x: number, y: number, w = 1, h = 1) =>
      ({ id, x, y, w, h, o2: 100, fire: 0, breach: 0, breachFix: 0, title: id }) as unknown as Room;
    // a b c in a row, d above b. From a, c is farthest; the line a-c crosses b and misses d.
    const ship = {
      rooms: [room("a", 0, 0), room("b", 1, 0), room("c", 2, 0), room("d", 1, -1)],
      doors: [],
    } as unknown as Ship;
    assert.deepEqual(
      cutLine(ship, "a").map((r) => r.id),
      ["a", "b", "c"],
    );
    // From d, a and c tie for farthest; the first in room order wins, and the line d-a only clips corners.
    assert.deepEqual(
      cutLine(ship, "d").map((r) => r.id),
      ["d", "a"],
    );
  });

  it("rolls a ten percent fire chance for each tile the swipe passes", () => {
    // Artillery Beam, Overview: 10% in each tile it passes.
    // INFERRED: with no drawn path, that is every occupied tile of the cut room.
    const g = armed(4);
    assert.ok(g.enemy);
    g.enemy.doors = [];
    const room = g.enemy.rooms[0];
    room.w = 2;
    room.h = 1;
    room.omit = undefined;
    g.enemy.rooms = [room];
    let tiles = 0;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cellOccupied(room, x, y)) tiles += 1;
      }
    }
    assert.equal(tiles, 2);
    const saved = g.seed;
    // The first draw picks the room (the only one), then one roll per tile.
    rand(g);
    let fires = 0;
    for (let i = 0; i < tiles; i++) if (rand(g) < 0.1) fires += 1;
    g.seed = saved;
    land(g, 0.1);
    assert.equal(room.fire, Math.min(4, fires));
  });

  it("lands each room as the swipe reaches it, and stops the swipe when the bars go dark", () => {
    // Per the user: the cut lands on contact, and powering the system down stops the beam there.
    const g = armed(18);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    tickLance(g, 0.1);
    const kit = g.player.kits.artillery;
    assert.ok(kit && kit.left > 0);
    const path = kit.path ?? [];
    assert.ok(path.length >= 3);
    assert.equal(g.enemy.hull, hull - 1);
    kit.power = 0;
    tickLance(g, kit.left);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.shots.length, 0);
    assert.equal(kit.left, 0);
    assert.equal(kit.path, undefined);
    assert.equal(kit.aux, 0);
    assert.equal(g.log[0], `${DISPLAY_NAME} cut out.`);

    const full = armed(18);
    assert.ok(full.enemy);
    land(full, 0.1);
    assert.equal(full.enemy.hull, hull - path.length);
  });

  it("does not charge without a reactor bar, and a stored charge drains", () => {
    const g = armed(5);
    assert.ok(g.enemy);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.power = 0;
    kit.aux = 0.25;
    const hull = g.enemy.hull;
    tickLance(g, 0.5);
    assert.equal(kit.aux, 0);
    assert.equal(g.enemy.hull, hull);
  });

  it("fills aux on the level clock and fires on its own", () => {
    const g = armed(6);
    assert.ok(g.enemy);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    const hull = g.enemy.hull;
    kit.level = 1;
    kit.aux = 0;
    kit.target = null;
    tickLance(g, 25);
    assert.equal(kit.aux, 0.5);
    assert.equal(g.enemy.hull, hull);
    tickLance(g, 25);
    assert.equal(kit.aux, 0);
    // The first room takes its cut as the swipe starts.
    assert.equal(g.enemy.hull, hull - 1);
    assert.ok(kit.left > 0);
    tickLance(g, kit.left);
    assert.equal(kit.aux, 0);
    assert.ok(g.enemy.hull < hull);
  });

  it("divides the charge clock by the Automated Re-loader rate", () => {
    // Artillery Beam, Overview: "Automated Re-loaders augmentations work."
    // The same paragraph: the system cannot be manned to reduce the charge time.
    // Augmentations, Automated Re-loader: one copy divides cooldown by 1.1; three raise firing rate by 30%.
    const once = armed(60);
    assert.ok(once.enemy);
    const kit = once.player.kits.artillery;
    assert.ok(kit);
    kit.aux = 0;
    kit.target = null;
    once.augments.push("AUTO_COOLDOWN");
    const hull = once.enemy.hull;
    tickLance(once, 50 / 1.1 - 0.05);
    assert.equal(once.enemy.hull, hull);
    assert.ok(kit.aux < 1);
    tickLance(once, 0.1);
    assert.equal(once.enemy.hull, hull - 1);
    assert.ok(kit.left > 0);
    tickLance(once, kit.left);
    assert.ok(once.enemy.hull < hull);

    const triple = armed(61);
    assert.ok(triple.enemy);
    const fast = triple.player.kits.artillery;
    assert.ok(fast);
    fast.aux = 0;
    fast.target = null;
    triple.augments.push("AUTO_COOLDOWN", "AUTO_COOLDOWN", "AUTO_COOLDOWN");
    const before = triple.enemy.hull;
    tickLance(triple, 50 / 1.3 - 0.05);
    assert.equal(triple.enemy.hull, before);
    tickLance(triple, 0.1);
    assert.equal(triple.enemy.hull, before - 1);
    assert.ok(fast.left > 0);
    tickLance(triple, fast.left);
    assert.ok(triple.enemy.hull < before);

    const draining = armed(62);
    const dark = draining.player.kits.artillery;
    assert.ok(dark);
    dark.power = 0;
    dark.aux = 1;
    draining.augments.push("AUTO_COOLDOWN", "AUTO_COOLDOWN", "AUTO_COOLDOWN");
    tickLance(draining, 0.2);
    assert.equal(dark.aux, 0.9);
  });

  it("deals 2 Zoltan Shield damage and does not cut a fuller bubble", () => {
    // Artillery Beam, Overview: 1 damage on each of the 2 ticks.
    // Zoltan Shield: Artillery Beam deals 2 damage in total. The hull stays protected until the bubble is gone.
    const held = armed(70);
    assert.ok(held.enemy);
    held.enemy.zoltan = 5;
    const hull = held.enemy.hull;
    const room = held.enemy.rooms.find((r) => r.system);
    assert.ok(room?.system);
    const broken = held.enemy.systems[room.system].damage;
    aimLance(held, room.id);
    land(held, 0.1);
    assert.equal(held.enemy.zoltan, 3);
    assert.equal(held.enemy.hull, hull);
    assert.equal(held.enemy.systems[room.system].damage, broken);
    assert.equal(held.player.kits.artillery?.aux, 0);

    const open = armed(71);
    assert.ok(open.enemy);
    open.enemy.zoltan = 1;
    const before = open.enemy.hull;
    const target = open.enemy.rooms.find((r) => r.system);
    assert.ok(target);
    aimLance(open, target.id);
    land(open, 0.1);
    assert.equal(open.enemy.zoltan, 0);
    assert.ok(open.enemy.hull < before);
  });

  it("stops charging at a cloaked ship unless the clock is 20 seconds", () => {
    // Cloaking, Overview: artillery stops charging and cannot target a cloaked ship.
    // Artillery Beam at system level 4 is the example that still fires, because that clock is 20 seconds.
    // Wiki citations:
    // > "Weapons and artillery systems stop charging and cannot target a cloaked ship." — [[Cloaking#Overview]]
    // > "make the beam weapon fire if the weapons charge time is <=20 seconds (e.g. Glaive Beam with fully trained crew, Artillery Beam at system level 4)." — [[Cloaking#Overview]]
    const cloak = (g: Game) => {
      assert.ok(g.enemy);
      g.enemy.kits.cloaking = {
        id: "cloaking",
        level: 1,
        power: 1,
        left: 10,
        cool: 0,
        target: null,
        on: true,
        aux: 0,
      };
    };
    const slow = armed(80);
    cloak(slow);
    const kit = slow.player.kits.artillery;
    assert.ok(kit);
    kit.aux = 0;
    kit.level = 1;
    kit.power = 1;
    tickLance(slow, 10);
    assert.equal(kit.aux, 0);

    const fast = armed(81);
    cloak(fast);
    const four = fast.player.kits.artillery;
    assert.ok(four && fast.enemy);
    four.level = 4;
    four.power = 4;
    four.aux = 0;
    const hull = fast.enemy.hull;
    tickLance(fast, 20);
    assert.equal(fast.enemy.hull, hull - 1);
    assert.ok(four.left > 0);
    tickLance(fast, four.left);
    assert.ok(fast.enemy.hull < hull);
  });

  it("is fitted only on Federation A and B, free, and records the wiki costs", () => {
    // Wiki citations:
    // > "Level Cost Charge time 1 - 50 sec" — [[Artillery Beam#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png 40 sec" — [[Artillery Beam#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png 30 sec" — [[Artillery Beam#System Upgrades]]
    // > "4 80 Ftlgame-scrap.png 20 sec" — [[Artillery Beam#System Upgrades]]
    // Artillery Beam, "Overview": pre-installed only on the Federation Cruiser A and B. No purchase price is printed.
    const lark = createGame(7);
    assert.equal(installLance(lark), false);
    assert.equal(lark.player.kits.artillery, undefined);
    const g = fedFresh(7);
    assert.equal(lanceInstallCost(), null);
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.deepEqual(UPGRADE_COSTS, { 2: 30, 3: 50, 4: 80 });
    assert.equal(DISPLAY_NAME, "Artillery Beam");
    const scrap = g.scrap;
    assert.equal(installLance(g), true);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.kits.artillery?.id, "artillery");
    assert.equal(g.player.kits.artillery?.power, 0);
    assert.equal(installLance(g), false);
  });

  it("takes one spare reactor bar and gives it back", () => {
    const g = fedFresh(8);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    const spare = sparePower(g.player);
    assert.ok(spare >= 1);
    toggleLancePower(g);
    assert.equal(kit.power, 1);
    assert.equal(sparePower(g.player), spare - 1);
    toggleLancePower(g);
    assert.equal(kit.power, 0);
    assert.equal(sparePower(g.player), spare);
    g.player.reactor -= spare;
    assert.ok(sparePower(g.player) < 1);
    toggleLancePower(g);
    assert.equal(kit.power, 0);
  });

  it("level 2 with one bar charges on the 50 second clock", () => {
    const g = armed(9);
    assert.ok(g.enemy);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 2;
    kit.power = 1;
    kit.aux = 0;
    const hull = g.enemy.hull;
    tickLance(g, 25);
    assert.equal(kit.aux, 25 / 50);
    assert.equal(g.enemy.hull, hull);
  });

  it("level 2 with two bars charges on the 40 second clock", () => {
    const g = armed(10);
    assert.ok(g.enemy);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 2;
    kit.power = 2;
    kit.aux = 0;
    const hull = g.enemy.hull;
    tickLance(g, 25);
    assert.equal(kit.aux, 25 / 40);
    assert.equal(g.enemy.hull, hull);
  });

  it("a stamped zoltan bar counts as one power level and does not change reactor power", () => {
    const g = armed(14);
    assert.ok(g.enemy);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 2;
    kit.power = 1;
    kit.zoltan = 1;
    kit.aux = 0;
    tickLance(g, 25);
    assert.equal(kit.power, 1);
    assert.equal(kit.aux, 25 / 40);
  });

  it("level 4 with four bars charges in 20 seconds and three bars charge in 30", () => {
    const g = fedFresh(11);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 4;
    const missing = 4 - sparePower(g.player);
    if (missing > 0) g.player.reactor += missing;
    assert.ok(sparePower(g.player) >= 4);
    toggleLancePower(g);
    toggleLancePower(g);
    toggleLancePower(g);
    toggleLancePower(g);
    assert.equal(kit.power, 4);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    kit.aux = 0;
    const hull = g.enemy.hull;
    tickLance(g, 10);
    assert.equal(kit.aux, 10 / 20);
    kit.power = 3;
    kit.aux = 0;
    tickLance(g, 15);
    assert.equal(kit.aux, 15 / 30);
    assert.equal(g.enemy.hull, hull);
  });

  it("damage 1 on a level 3 beam caps power at 2", () => {
    const g = fedFresh(12);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 3;
    kit.damage = 1;
    const missing = 3 - sparePower(g.player);
    if (missing > 0) g.player.reactor += missing;
    assert.ok(sparePower(g.player) >= 2);
    toggleLancePower(g);
    toggleLancePower(g);
    assert.equal(kit.power, 2);
    assert.ok(sparePower(g.player) >= 1);
    toggleLancePower(g);
    assert.ok(kit.power <= 2);
    assert.notEqual(kit.power, 3);
  });

  it("the more control stops at the cap and the less control removes a bar", () => {
    const g = fedFresh(13);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.artillery;
    assert.ok(kit);
    kit.level = 2;
    const missing = 2 - sparePower(g.player);
    if (missing > 0) g.player.reactor += missing;
    raiseLancePower(g);
    raiseLancePower(g);
    assert.equal(kit.power, 2);
    const spare = sparePower(g.player);
    raiseLancePower(g);
    assert.equal(kit.power, 2);
    assert.equal(sparePower(g.player), spare);
    lowerLancePower(g);
    assert.equal(kit.power, 1);
  });
});
