import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollEnemy } from "./enemy-gen.ts";
import { createGame, repairPace, startCombat, step } from "./sim.ts";
import { XP_NEED } from "./content.ts";
import { ALL_CREW_RACES, REPAIR_SKILL_MULT, SECTOR_CREW_RACES, pirateCrewRaces } from "./wiki/skills.ts";
import { ENEMY_CLASSES } from "./wiki/enemy-ships.ts";
import type { Crew, Game } from "./types.ts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** One player crew alone in a system room; everyone else moved out. */
function lone(g: Game): { worker: Crew; roomId: string; sys: string } {
  // life() runs only in combat.
  startCombat(g, "scout");
  const room = g.player.rooms.find((r) => r.system && r.system !== "oxygen")!;
  const worker = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
  const away = g.player.rooms.find((r) => r.id !== room.id)!;
  for (const c of g.crew) if (c.side === "player" && c.id !== worker.id && c.room === room.id) c.room = away.id;
  worker.room = room.id;
  worker.path = [];
  worker.stun = 0;
  worker.kin = "plain";
  return { worker, roomId: room.id, sys: room.system! };
}

function rankFor(rank: 0 | 1 | 2) {
  return rank * XP_NEED.repair;
}

describe("Skills, Repair skill: 10% / 20% faster repair", () => {
  it("prints the table", () => {
    assert.deepEqual([...REPAIR_SKILL_MULT], [1, 1.1, 1.2]);
  });

  it("scales repair pace by rank (Human, so the 16-point Human table)", () => {
    const g = createGame(3);
    const { worker } = lone(g);
    const paces = ([0, 1, 2] as const).map((rank) => {
      worker.skills = { repair: rank === 0 ? 0 : rankFor(rank) };
      return repairPace(worker);
    });
    assert.ok(Math.abs(paces[0] - 1) < 1e-9);
    assert.ok(Math.abs(paces[1] - 1.1) < 1e-9);
    assert.ok(Math.abs(paces[2] - 1.2) < 1e-9);
  });

  function sysFixRate(rank: 0 | 1 | 2): number {
    const g = createGame(5);
    const { worker, roomId, sys } = lone(g);
    worker.skills = { repair: rankFor(rank) };
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    const s = g.player.systems[sys as keyof typeof g.player.systems];
    s.damage = 1;
    s.fix = 0;
    step(g, 0.05);
    return s.fix;
  }

  it("a gold repairer fixes a system bar 20% faster", () => {
    const base = sysFixRate(0);
    assert.ok(base > 0);
    assert.ok(Math.abs(sysFixRate(1) / base - 1.1) < 1e-6);
    assert.ok(Math.abs(sysFixRate(2) / base - 1.2) < 1e-6);
  });

  function fireDrop(rank: 0 | 1 | 2): number {
    const g = createGame(7);
    const { worker, roomId } = lone(g);
    worker.skills = { repair: rankFor(rank) };
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    room.o2 = 100;
    room.fire = 1;
    room.fireTick = 0;
    step(g, 0.05);
    return 1 - room.fire;
  }

  it("repair skill also speeds fire-fighting (repairSkillMult)", () => {
    const base = fireDrop(0);
    assert.ok(base > 0);
    assert.ok(Math.abs(fireDrop(2) / base - 1.2) < 1e-6);
  });

  it("speeds breach sealing", () => {
    const rates = ([0, 2] as const).map((rank) => {
      const g = createGame(9);
      const { worker, roomId, sys } = lone(g);
      worker.skills = { repair: rankFor(rank) };
      const room = g.player.rooms.find((r) => r.id === roomId)!;
      g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
      room.fire = 0;
      room.breach = 1;
      room.breachFix = 0;
      g.augments = [];
      step(g, 0.05);
      return room.breachFix;
    });
    assert.ok(rates[0] > 0);
    assert.ok(Math.abs(rates[1] / rates[0] - 1.2) < 1e-6);
  });
});

describe("Enemy Ships, Pirated ships: crew from the sector's races", () => {
  const pirateCls = ENEMY_CLASSES.find((c) => !!c.pirate || c.faction === "federation")!;

  function racesIn(sectorName: string): Set<string> {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const spec = rollEnemy(pirateCls, true, { sector: 3, sectorName, difficulty: "normal" }, rng(seed));
      for (const c of spec.crew) seen.add(c.race);
    }
    return seen;
  }

  it("Engi Controlled Sector pirates are Engi, Human, or Zoltan", () => {
    const seen = racesIn("Engi Controlled Sector");
    for (const r of seen) assert.ok(["Engi", "Human", "Zoltan"].includes(r), r);
    assert.equal(seen.size, 3);
  });

  it("Hidden Crystal Worlds pirates are Crystal only; Lanius only where listed", () => {
    assert.deepEqual([...racesIn("Hidden Crystal Worlds")], ["Crystal"]);
    for (const [name, list] of Object.entries(SECTOR_CREW_RACES)) {
      if (name !== "Abandoned Sector") assert.ok(!list.includes("Lanius"), name);
    }
    assert.ok(racesIn("Abandoned Sector").has("Lanius"));
  });

  it("an unlisted sector name falls back to every race (INFERRED)", () => {
    assert.deepEqual(pirateCrewRaces("Cinder Reach"), ALL_CREW_RACES);
    assert.equal(racesIn("Cinder Reach").size, ALL_CREW_RACES.length);
  });

  it("non-pirate crews still use the class crew mix", () => {
    const cls = ENEMY_CLASSES.find((c) => c.faction === "rebel" && c.crewMix.length)!;
    const spec = rollEnemy(cls, false, { sector: 3, sectorName: "Hidden Crystal Worlds", difficulty: "normal" }, rng(4));
    const mix = new Set(cls.crewMix.map(([race]) => race));
    for (const c of spec.crew) assert.ok(mix.has(c.race) || c.race === cls.crewMix[0][0], c.race);
  });
});
