import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cellOccupied } from "../layouts.ts";
import { createGame, log, rand, sparePower, startCombat } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  CHARGE_SECONDS,
  DISPLAY_NAME,
  INSTALL_COST,
  UPGRADE_COSTS,
  aimLance,
  installLance,
  tickLance,
  lowerLancePower,
  raiseLancePower,
  toggleLancePower,
} from "./lance.ts";

function armed(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.player.kits.lance = {
    id: "lance",
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

describe("lance", () => {
  it("drops enemy hull on a short tick and leaves the shield bubble alone", () => {
    const g = armed(1);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    assert.ok(bubble > 0);
    const room = g.enemy.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    const broken = g.enemy.systems.shields.damage;
    aimLance(g, room.id);
    log(g, "mark");
    tickLance(g, 0.1);
    assert.ok(g.enemy.hull < hull);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.shields.damage, broken + 1);
    assert.equal(g.shots.length, 0);
    assert.equal(g.player.kits.lance?.aux, 0);
    assert.equal(g.log[0], `${DISPLAY_NAME} cuts ${g.enemy.name}.`);
    assert.equal(g.log[1], "mark");
  });

  it("cuts the aimed room and one door neighbor", () => {
    const g = armed(2);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    const room = g.enemy.rooms.find((r) => r.id === "e-weapons");
    assert.ok(room);
    aimLance(g, room.id);
    tickLance(g, 0.1);
    assert.equal(g.enemy.hull, hull - 2);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.weapons.damage, 1);
  });

  it("cuts only the target when no door links it", () => {
    const g = armed(3);
    assert.ok(g.enemy);
    g.enemy.doors = [];
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    // Documented hulls differ (auto-ships have no oxygen room), so take any system room but weapons and shields:
    // wrecking shields would drop the bubble this test checks is untouched.
    const room = g.enemy.rooms.find((r) => r.system && r.system !== "weapons" && r.system !== "shields");
    assert.ok(room?.system);
    g.enemy.systems[room.system].damage = g.enemy.systems[room.system].level;
    aimLance(g, room.id);
    tickLance(g, 0.1);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems[room.system].damage, g.enemy.systems[room.system].level);
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
    aimLance(g, room.id);
    let tiles = 0;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cellOccupied(room, x, y)) tiles += 1;
      }
    }
    assert.equal(tiles, 2);
    const saved = g.seed;
    let fires = 0;
    for (let i = 0; i < tiles; i++) if (rand(g) < 0.1) fires += 1;
    g.seed = saved;
    tickLance(g, 0.1);
    assert.equal(room.fire, Math.min(4, fires));
  });

  it("does not charge without a reactor bar, and a stored charge drains", () => {
    const g = armed(5);
    assert.ok(g.enemy);
    const kit = g.player.kits.lance;
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
    const kit = g.player.kits.lance;
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
    assert.ok(g.enemy.hull < hull);
  });

  it("divides the charge clock by the Automated Re-loader rate", () => {
    // Artillery Beam, Overview: "Automated Re-loaders augmentations work."
    // The same paragraph: the system cannot be manned to reduce the charge time.
    // Augmentations, Automated Re-loader: one copy divides cooldown by 1.1; three raise firing rate by 30%.
    const once = armed(60);
    assert.ok(once.enemy);
    const kit = once.player.kits.lance;
    assert.ok(kit);
    kit.aux = 0;
    kit.target = null;
    once.augments.push("feed");
    const hull = once.enemy.hull;
    tickLance(once, 50 / 1.1 - 0.05);
    assert.equal(once.enemy.hull, hull);
    assert.ok(kit.aux < 1);
    tickLance(once, 0.1);
    assert.ok(once.enemy.hull < hull);

    const triple = armed(61);
    assert.ok(triple.enemy);
    const fast = triple.player.kits.lance;
    assert.ok(fast);
    fast.aux = 0;
    fast.target = null;
    triple.augments.push("feed", "feed", "feed");
    const before = triple.enemy.hull;
    tickLance(triple, 50 / 1.3 - 0.05);
    assert.equal(triple.enemy.hull, before);
    tickLance(triple, 0.1);
    assert.ok(triple.enemy.hull < before);

    const draining = armed(62);
    const dark = draining.player.kits.lance;
    assert.ok(dark);
    dark.power = 0;
    dark.aux = 1;
    draining.augments.push("feed", "feed", "feed");
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
    tickLance(held, 0.1);
    assert.equal(held.enemy.zoltan, 3);
    assert.equal(held.enemy.hull, hull);
    assert.equal(held.enemy.systems[room.system].damage, broken);
    assert.equal(held.player.kits.lance?.aux, 0);

    const open = armed(71);
    assert.ok(open.enemy);
    open.enemy.zoltan = 1;
    const before = open.enemy.hull;
    const target = open.enemy.rooms.find((r) => r.system);
    assert.ok(target);
    aimLance(open, target.id);
    tickLance(open, 0.1);
    assert.equal(open.enemy.zoltan, 0);
    assert.ok(open.enemy.hull < before);
  });

  it("stops charging at a cloaked ship unless the clock is 20 seconds", () => {
    // Cloaking, Overview: artillery stops charging and cannot target a cloaked ship.
    // Artillery Beam at system level 4 is the example that still fires, because that clock is 20 seconds.
    const cloak = (g: Game) => {
      assert.ok(g.enemy);
      g.enemy.kits.veil = {
        id: "veil",
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
    const kit = slow.player.kits.lance;
    assert.ok(kit);
    kit.aux = 0;
    kit.level = 1;
    kit.power = 1;
    tickLance(slow, 10);
    assert.equal(kit.aux, 0);

    const fast = armed(81);
    cloak(fast);
    const four = fast.player.kits.lance;
    assert.ok(four && fast.enemy);
    four.level = 4;
    four.power = 4;
    four.aux = 0;
    const hull = fast.enemy.hull;
    tickLance(fast, 20);
    assert.ok(fast.enemy.hull < hull);
  });

  it("mounts for free and records the wiki costs", () => {
    const g = createGame(7);
    assert.equal(INSTALL_COST, null);
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.deepEqual(UPGRADE_COSTS, { 2: 30, 3: 50, 4: 80 });
    assert.equal(DISPLAY_NAME, "Artillery Beam");
    const scrap = g.scrap;
    assert.equal(installLance(g), true);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.kits.lance?.id, "lance");
    assert.equal(g.player.kits.lance?.power, 0);
    assert.equal(installLance(g), false);
  });

  it("takes one spare reactor bar and gives it back", () => {
    const g = createGame(8);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.lance;
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
    const kit = g.player.kits.lance;
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
    const kit = g.player.kits.lance;
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
    const kit = g.player.kits.lance;
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
    const g = createGame(11);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.lance;
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
    const g = createGame(12);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.lance;
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
    const g = createGame(13);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.lance;
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
