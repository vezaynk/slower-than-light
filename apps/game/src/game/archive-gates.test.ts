import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, fillerList, hullDef, shipPreviewPath, weaponDef } from "@stl/pack";
import { shieldOval } from "../components/game/shield-bubble.ts";
import { deploy, swarmIntercept, tickSwarm } from "./extras/swarm.ts";
import { currentLocale, localeFace, localeLabel, selectLocale } from "./locale.ts";
import { baseGlowShift } from "./pack/ship-art.ts";
import { projectileSpin } from "./projectile-spin.ts";
import {
  applyImpact,
  chargerCap,
  choiceDisabled,
  choose,
  createGame,
  startCombat,
  step,
} from "./sim.ts";
import type { Game, Kit, Shot } from "./types.ts";
import { choiceBlue, choiceOmitted } from "./wiki/choice-locks.ts";
import { citedCrewDamage } from "./wiki/cited-weapons.ts";
import { flak2Landing, flakScatterRadius } from "./wiki/weapons-flak-crystal.ts";

afterEach(() => selectLocale("en"));

function bomb(partial: Partial<Shot> & Pick<Shot, "targetRoom" | "defId">): Shot {
  return {
    id: "s",
    kind: "bomb",
    from: "player",
    damage: 0,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function gatesGame(): { g: Game; ids: string[]; id: (label: string) => string } {
  const page = eventDef("STANDIN_GATES");
  assert.ok(page);
  const g = createGame(3);
  g.phase = "event";
  g.event = {
    title: page.dest,
    body: page.body,
    choices: page.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
  const ids = page.choices.map((choice) => choice.id);
  const id = (label: string) => {
    const found = page.choices.find((choice) => choice.label === label);
    assert.ok(found, label);
    return found.id;
  };
  return { g, ids, id };
}

describe("archive gates and combat figures", () => {
  it("hides an unmet medbay band and leaves the phase alone", () => {
    const { g, ids, id } = gatesGame();
    const medbay = id("Medbay band.");
    g.player.systems.medbay.level = 1;
    assert.equal(choiceOmitted(g, medbay, ids), true);
    choose(g, medbay);
    assert.equal(g.phase, "event");
    g.player.systems.medbay.level = 2;
    assert.equal(choiceOmitted(g, medbay, ids), false);
    assert.equal(choiceDisabled(g, medbay), null);
    assert.equal(choiceBlue(g, medbay), true);
  });

  it("disables a reactor past its ceiling and keeps one hacking band", () => {
    const { g, ids, id } = gatesGame();
    const reactor = id("Reactor cap.");
    g.player.reactor = 25;
    assert.equal(choiceOmitted(g, reactor, ids), false);
    assert.ok(choiceDisabled(g, reactor));
    g.player.reactor = 24;
    assert.equal(choiceDisabled(g, reactor), null);
    assert.equal(choiceBlue(g, reactor), false);

    const low = id("Hack one.");
    const high = id("Hack two.");
    g.player.kits.hacking = {
      id: "hacking",
      level: 2,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    } as Kit;
    assert.equal(choiceOmitted(g, low, ids), true);
    assert.equal(choiceOmitted(g, high, ids), false);
    g.player.kits.hacking.level = 1;
    assert.equal(choiceOmitted(g, low, ids), false);
    assert.equal(choiceOmitted(g, high, ids), true);
    assert.equal(choiceOmitted(g, id("Continue."), ids), false);
  });

  it("stuns from the heavy laser tenth and heals from a negative crew figure", () => {
    assert.equal(weaponDef("LASER_HEAVY_1")?.stunChance, 0.2);
    assert.equal(weaponDef("ION_STUN")?.stunChance, undefined);
    assert.equal(
      citedCrewDamage(bomb({ defId: "BEAM_BIO", targetRoom: "r", kind: "beam" }), 0),
      60,
    );
    assert.equal(citedCrewDamage(bomb({ defId: "BOMB_HEAL", targetRoom: "r" }), 0), -150);

    const g = createGame(4);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    g.enemy.shieldNow = 0;
    g.enemy.zoltan = 0;
    g.player.systems.weapons.level = 2;
    g.player.systems.weapons.power = 2;
    g.player.systems.weapons.damage = 0;
    g.autofireAll = true;
    const target = g.enemy.rooms[0]?.id ?? "e-pilot";
    g.player.weapons = [
      {
        uid: "heavy",
        defId: "LASER_HEAVY_1",
        charge: 1,
        enabled: true,
        autofire: true,
        target,
      },
    ];
    step(g, 0.05);
    const shot = g.shots.find((row) => row.defId === "LASER_HEAVY_1");
    assert.equal(shot?.stunChance, 0.2);

    const bay = g.player.rooms.find((room) => room.system === "medbay");
    assert.ok(bay && bay.system);
    g.player.systems[bay.system].level = 2;
    g.player.systems[bay.system].damage = 0;
    const hull = g.player.hull;
    applyImpact(g, bomb({ defId: "BOMB_1", damage: 0, targetRoom: bay.id, own: true }));
    assert.equal(g.player.systems[bay.system].damage, 2);
    assert.equal(g.player.hull, hull);

    const crew = g.crew.find((row) => row.side === "player" && row.hp > 0);
    assert.ok(crew);
    crew.room = bay.id;
    crew.aboard = "player";
    crew.hp = 20;
    crew.maxHp = 200;
    applyImpact(g, bomb({ defId: "BOMB_HEAL", targetRoom: bay.id, own: true }));
    assert.equal(crew.hp, 170);
  });

  it("reads charge banks and flak radius without changing the room odds", () => {
    assert.equal(weaponDef("LASER_CHARGEGUN")?.shots, 1);
    assert.equal(weaponDef("LASER_CHARGEGUN")?.chargeLevels, 2);
    assert.equal(chargerCap("LASER_CHARGEGUN"), 2);
    assert.equal(weaponDef("LASER_BURST_2")?.shots, 2);
    assert.equal(weaponDef("LASER_BURST_2")?.chargeLevels, undefined);
    assert.equal(flakScatterRadius("SHOTGUN_2", 40), 55);
    assert.equal(flakScatterRadius("ARTILLERY_FED_C", 35), 35);
    assert.equal(flakScatterRadius("flak-artillery", 35), 35);
    const rooms = [{ id: "a", x: 0, y: 0, w: 1, h: 2 }];
    assert.deepEqual(flak2Landing(rooms, "a", 0.1, 0), { kind: "stay" });
    assert.deepEqual(flak2Landing(rooms, "a", 0.1), flak2Landing(rooms, "a", 0.1, 55));
  });

  it("spins a tagged flak and lets a defense drone shoot only that tag", () => {
    assert.equal(projectileSpin("SHOTGUN", "flak", 1), (720 * Math.PI) / 180);
    assert.equal(projectileSpin("LASER_BURST_1", "flak", 1), 0);
    assert.equal(projectileSpin("SHOTGUN", "laser", 1), 0);
    const g = createGame(5);
    const kit: Kit = {
      id: "drones",
      level: 3,
      power: 3,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    g.player.kits.drones = kit;
    g.player.parts = 2;
    assert.equal(deploy(g, "DEFENSE_1"), true);
    assert.equal(swarmIntercept(g, { kind: "flak", from: "enemy", defId: "SHOTGUN" }), true);
    tickSwarm(g, 1);
    assert.equal(swarmIntercept(g, { kind: "flak", from: "enemy" }), false);
    assert.equal(swarmIntercept(g, { kind: "flak", from: "enemy", defId: "LASER_BURST_1" }), false);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), true);
    tickSwarm(g, 1);
    assert.equal(deploy(g, "DEFENSE_2"), true);
    assert.equal(swarmIntercept(g, { kind: "laser", from: "enemy" }), true);
  });

  it("draws the layout ellipse, shifts the glow hull, and keeps an empty list empty", () => {
    const hard = hullDef("PLAYER_SHIP_HARD");
    const stealth = hullDef("PLAYER_SHIP_STEALTH");
    assert.ok(hard?.grid?.ellipse && hard.picture);
    assert.equal(hard.grid.vertical, 4);
    assert.equal(hard.grid.horizontal, 6);
    assert.deepEqual(hard.glow, { x: 4, y: -2 });
    assert.equal(stealth?.grid?.horizontal, undefined);
    assert.deepEqual(stealth?.glow, { x: 0, y: 0 });
    const box = { w: 200, h: 100 };
    const pad = 8;
    const oval = shieldOval(box, hard.picture, hard.grid.ellipse, pad, 6, 4);
    assert.ok(oval);
    const sx = box.w / hard.picture.w;
    const sy = box.h / hard.picture.h;
    assert.equal(oval.rx, (hard.grid.ellipse.w / 2 + 6) * sx + pad);
    assert.equal(oval.ry, (hard.grid.ellipse.h / 2 + 4) * sy + pad);
    assert.equal(oval.dx, hard.grid.ellipse.x * sx);
    assert.equal(oval.dy, hard.grid.ellipse.y * sy);
    assert.deepEqual(baseGlowShift({ x: 4, y: -2 }), { offsetX: -4, offsetY: 2 });
    assert.deepEqual(baseGlowShift({ x: 0, y: 0 }), { offsetX: 0, offsetY: 0 });
    assert.equal(fillerList("STANDIN_EMPTY")?.entries.length, 0);
    assert.equal(shipPreviewPath("kestral", true), "img/ships_glow/kestral_base.png");
    assert.equal(shipPreviewPath("kestral", false), "img/ships_noglow/kestral_base.png");
  });

  it("switches the sample locale string and face", () => {
    assert.equal(currentLocale(), "en");
    assert.equal(localeLabel("menu_title", "Slower than Light"), "Slower than Light");
    assert.equal(localeFace(), undefined);
    selectLocale("eo");
    assert.equal(localeLabel("menu_title", "Slower than Light"), "Malrapida ol lumo");
    assert.equal(localeFace(), "EoFont");
    selectLocale("en");
    assert.equal(localeLabel("menu_title", "Slower than Light"), "Slower than Light");
  });
});
