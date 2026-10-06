import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beginBoarding, createGame, step } from "./sim.ts";
import type { Crew, Game } from "./types.ts";
import { fillerChoose } from "./wiki/filler-events.ts";
import { questChoose } from "./wiki/quests.ts";
import { PART_B } from "./wiki/quests-b.ts";

function plant(g: Game, room: string, hp = 100): Crew {
  g.uid = (g.uid + 1) >>> 0;
  const c: Crew = {
    id: "u" + g.uid.toString(36),
    name: "Human",
    side: "enemy",
    aboard: "player",
    hp,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 30,
    tone: 3,
    kin: "plain",
  };
  g.crew.push(c);
  return c;
}

function humans(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "enemy" && c.aboard === "player" && c.name === "Human");
}

describe("Boarders with no enemy ship", () => {
  it("does not open a fight from a quiet map step", () => {
    const g = createGame(1);
    step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
  });

  it("trades blows on the first step and ends with no salvage", () => {
    const g = createGame(1);
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    const boarder = plant(g, nen.room, 0.2);
    const scrap = g.scrap;
    const kills = g.kills;
    beginBoarding(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const before = boarder.hp;
    step(g, 0.05);
    // One attacker at 6 HP/s. life() runs before the boarder can walk away.
    assert.ok(before - boarder.hp > 0.2 && before - boarder.hp < 0.4);
    assert.equal(g.phase, "map");
    assert.equal(g.crew.some((c) => c.side === "enemy" && c.hp > 0), false);
    assert.equal(g.kills, kills);
    assert.equal(g.scrap, scrap);
    assert.equal(g.log[0], "The boarders are dead.");
  });

  it("sabotages an empty system room at 0.08 per second", () => {
    const g = createGame(1);
    for (const c of g.crew) c.room = "p-pilot";
    plant(g, "p-weapons");
    const room = g.player.rooms.find((r) => r.id === "p-weapons")!;
    assert.ok(g.player.systems.weapons.level > 0);
    assert.equal(g.player.systems.weapons.damage, 0);
    beginBoarding(g);
    step(g, 0.05);
    assert.ok(Math.abs((room.sabotage ?? 0) - 0.08 * 0.05) < 1e-9);
    assert.equal(g.phase, "combat");
  });

  it("fires the planet-side battery on the existing 14s timer", () => {
    const g = createGame(1);
    plant(g, "p-sensors");
    beginBoarding(g, true);
    assert.equal(g.asb, true);
    assert.equal(g.asbT, 6);
    for (let i = 0; i < 140; i++) step(g, 0.05);
    assert.equal(g.shots.some((s) => s.label === "Artillery"), false);
    assert.equal(g.phase, "combat");
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(g.shots.some((s) => s.label === "Artillery"), true);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
  });

  it("braces 3-4 human boarders with no hull", () => {
    const g = createGame(1);
    PART_B.choices["q:research:brace"](g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.ok(humans(g).every((c) => c.kin === "plain"));
    assert.equal(g.crew.filter((c) => c.side === "player").length, 3);
  });

  it("turns one crewmember and beams 3-4 more on the drag", () => {
    const g = createGame(1);
    PART_B.choices["q:research:drag"](g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const turned = g.crew.filter((c) => c.side === "enemy" && c.name !== "Human");
    assert.equal(turned.length, 1);
    assert.equal(turned[0].aboard, "player");
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.equal(g.crew.filter((c) => c.side === "player" && c.hp > 0).length, 2);
  });

  it("turns one crewmember and no extras on the teleporter retrieve", () => {
    const g = createGame(1);
    PART_B.choices["q:research:beam"](g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(humans(g).length, 0);
    assert.equal(g.crew.filter((c) => c.side === "enemy").length, 1);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 2);
  });

  it("keeps the card when the teleporter retrieve would take the last crewmember", () => {
    const g = createGame(1);
    g.crew = g.crew.filter((c) => c.id === "c-ada");
    PART_B.choices["q:research:beam"](g);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.crew.length, 1);
    assert.equal(g.crew[0].side, "player");
  });

  it("keeps the crew and beams 3-4 boarders from the medbay", () => {
    const g = createGame(1);
    PART_B.choices["q:research:medbay"](g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 3);
  });

  it("draws the crazed clone, the refugee boarders, and the station battery", () => {
    let crazed = false;
    let refugee = false;
    let battery = false;
    for (let seed = 1; seed < 80 && !(crazed && refugee && battery); seed++) {
      const dna = createGame(seed);
      questChoose(dna, "q:station:dna");
      if (dna.phase === "combat" && !dna.enemy && humans(dna).length === 1) crazed = true;
      const ref = createGame(seed + 1000);
      fillerChoose(ref, "c:refugee-comms-down:0");
      const aboard = humans(ref);
      if (ref.phase === "combat" && !ref.enemy && aboard.length >= 2 && aboard.length <= 4 && !ref.asb) refugee = true;
      const station = createGame(seed + 2000);
      fillerChoose(station, "c:abandoned-station:0");
      const pirates = humans(station);
      if (station.phase === "combat" && !station.enemy && station.asb && pirates.length >= 2 && pirates.length <= 4) battery = true;
    }
    assert.equal(crazed, true);
    assert.equal(refugee, true);
    assert.equal(battery, true);
  });
});
