import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPulsarPulse, createGame, pulsarSystemIon, startCombat, step } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { eventHasPulsar, pickPulsarTargets, pulsarMainIon, pulsarShieldSpend, type PulsarPick } from "./cited-pulsar.ts";

function ionCount(g: Game, side: "player" | "enemy"): number {
  const ship = side === "player" ? g.player : g.enemy;
  if (!ship) return 0;
  return (Object.keys(ship.systems) as SysId[]).filter((id) => ship.systems[id].ion.length > 0).length;
}

function clearIon(g: Game, side: "player" | "enemy") {
  const ship = side === "player" ? g.player : g.enemy;
  if (!ship) return;
  for (const id of Object.keys(ship.systems) as SysId[]) ship.systems[id].ion = [];
}

function quietEnemy(g: Game) {
  const enemy = g.enemy;
  if (!enemy) return;
  for (const w of enemy.weapons) w.enabled = false;
  if (enemy.kits.swarm) enemy.kits.swarm.loadout = [];
}

describe("pulsar", () => {
  it("arms only a pulsar fight, on a cycle of 11 to 18 seconds", () => {
    const plain = createGame(1);
    startCombat(plain, "Pirate ship");
    assert.equal(plain.pulsar, false);
    assert.equal(eventHasPulsar("pirate-fight-near-sun"), false);
    assert.equal(eventHasPulsar("pirate-fight-near-pulsar"), true);
    assert.equal(eventHasPulsar("rebel-fight-near-pulsar"), true);
    assert.equal(eventHasPulsar("lanius-fight-near-pulsar"), true);

    const g = createGame(4);
    startCombat(g, "Pirate ship", false, "pirate-fight-near-pulsar");
    assert.equal(g.pulsar, true);
    assert.ok((g.pulsarWait ?? 0) >= 11 && (g.pulsarWait ?? 0) < 18);
  });

  it("warns 5 seconds ahead, then pulses", () => {
    const g = createGame(8);
    startCombat(g, "Pirate ship", false, "lanius-fight-near-pulsar");
    quietEnemy(g);
    g.pulsarWait = 6;
    g.pulsarT = 0;
    g.pulsarWarned = false;
    let t = 0;
    while (!g.pulsarWarned && t < 3) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.phase, "combat");
    assert.equal(g.pulsarWarned, true);
    assert.ok(t >= 1 && t < 1.1);
    assert.equal(g.log[0], "Periodic waves of electromagnetic energy will disrupt your systems.");
    while (g.pulsarWarned && t < 8) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.pulsarWarned, false);
    assert.ok(t >= 6 && t < 6.1);
    assert.ok((g.pulsarWait ?? 0) >= 11 && (g.pulsarWait ?? 0) < 18);
  });

  it("spends 3 or 4 on a bubble and leaves systems clear, including one layer", () => {
    assert.equal(pulsarShieldSpend(0), 3);
    assert.equal(pulsarShieldSpend(0.5), 4);
    const g = createGame(3);
    startCombat(g, "Pirate ship", false, "rebel-fight-near-pulsar");
    g.player.zoltan = 5;
    clearIon(g, "player");
    applyPulsarPulse(g);
    assert.ok(g.player.zoltan === 2 || g.player.zoltan === 1);
    assert.equal(ionCount(g, "player"), 0);
    assert.ok(ionCount(g, "enemy") > 0);

    g.player.zoltan = 1;
    clearIon(g, "player");
    applyPulsarPulse(g);
    assert.equal(g.player.zoltan, 0);
    assert.equal(ionCount(g, "player"), 0);
  });

  it("ignores the bubble when the ship has no Shields system", () => {
    const g = createGame(5);
    startCombat(g, "Pirate ship", false, "pirate-fight-near-pulsar");
    g.player.systems.shields.level = 0;
    g.player.systems.shields.power = 0;
    g.player.zoltan = 5;
    clearIon(g, "player");
    applyPulsarPulse(g);
    assert.equal(g.player.zoltan, 5);
    assert.equal(ionCount(g, "player"), 2);
  });

  it("always hits powered shields, and an unpowered shield is only 1 ion", () => {
    assert.equal(pulsarMainIon(0), 1);
    assert.equal(pulsarMainIon(2), 2);
    assert.equal(pulsarMainIon(4), 3);
    const systems: PulsarPick[] = [
      { id: "shields", points: 2, powered: true },
      { id: "engines", points: 2, powered: false },
      { id: "weapons", points: 2, powered: false },
      { id: "oxygen", points: 1, powered: false },
    ];
    for (let i = 0; i < 12; i++) {
      const picks = pickPulsarTargets(systems, () => 0.99);
      assert.equal(picks[0]?.id, "shields");
      assert.equal(picks.length, 2);
      assert.notEqual(picks[1]?.id, "shields");
    }
    const dark = systems.map((sys) => ({ ...sys, powered: false }));
    let missed = false;
    for (let i = 0; i < 30 && !missed; i++) {
      const picks = pickPulsarTargets(dark, Math.random);
      missed = picks.every((sys) => sys.id !== "shields");
    }
    assert.equal(missed, true);

    const g = createGame(6);
    startCombat(g, "scout");
    g.player.systems.shields.power = 0;
    g.player.zoltan = 0;
    assert.equal(pulsarSystemIon(g, g.player, "player", "shields"), 1);
    g.player.systems.weapons.level = 4;
    g.player.systems.weapons.power = 4;
    assert.equal(pulsarSystemIon(g, g.player, "player", "weapons"), 3);
  });

  it("gives manned level-2 doors 3 ion, and pilot stays on its level", () => {
    const g = createGame(7);
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    for (const c of g.crew) c.room = "p-doors";
    assert.equal(pulsarSystemIon(g, g.player, "player", "doors"), 3);
    for (const c of g.crew) c.room = "p-pilot";
    assert.equal(pulsarSystemIon(g, g.player, "player", "doors"), 2);
    g.player.systems.pilot.level = 2;
    assert.equal(pulsarSystemIon(g, g.player, "player", "pilot"), 2);
    // Environmental Hazards, Pulsar: ion follows the system level. Damage is not subtracted.
    g.player.systems.pilot.damage = 1;
    assert.equal(pulsarSystemIon(g, g.player, "player", "pilot"), 2);
    g.player.systems.doors.damage = 1;
    assert.equal(pulsarSystemIon(g, g.player, "player", "doors"), 2);
    for (const c of g.crew) c.room = "p-doors";
    assert.equal(pulsarSystemIon(g, g.player, "player", "doors"), 3);
    // Sensors, Manning: one level above the upgrade, capped at 4. Damage stays out of the figure.
    g.player.systems.sensors.level = 2;
    g.player.systems.sensors.damage = 1;
    for (const c of g.crew) c.room = "p-sensors";
    assert.equal(pulsarSystemIon(g, g.player, "player", "sensors"), 3);
    for (const c of g.crew) c.room = "p-pilot";
    assert.equal(pulsarSystemIon(g, g.player, "player", "sensors"), 2);
  });

  it("ionizes a damaged Backup Battery at its system level", () => {
    const g = createGame(11);
    startCombat(g, "scout");
    g.player.zoltan = 0;
    for (const id of Object.keys(g.player.systems) as SysId[]) {
      g.player.systems[id].level = 0;
      g.player.systems[id].power = 0;
      g.player.systems[id].damage = 0;
    }
    if (g.enemy) {
      g.enemy.zoltan = 0;
      for (const id of Object.keys(g.enemy.systems) as SysId[]) g.enemy.systems[id].level = 0;
    }
    g.player.kits.cell = {
      id: "cell",
      level: 2,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      damage: 1,
    };
    applyPulsarPulse(g);
    assert.equal(g.player.kits.cell?.cool, 25);
  });
});
