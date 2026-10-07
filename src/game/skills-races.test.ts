import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollEnemy } from "./enemy-gen.ts";
import { armFlak, tickFlak } from "./extras/flakart.ts";
import { tickLance } from "./extras/lance.ts";
import { tickSabotage } from "./extras/sabotage.ts";
import { tickSwarm } from "./extras/swarm.ts";
import { aim, applyImpact, createGame, depowerWeapon, evasionPercent, fireReady, repairPace, startCombat, step, toggleWeapon } from "./sim.ts";
import type { Shot } from "./types.ts";
import { WEAPONS, XP_NEED, skillRank } from "./content.ts";
import { xpNeedFor } from "./extras/lineage.ts";
import type { SkillName } from "./types.ts";
import { ALL_CREW_RACES, COMBAT_SKILL_MULT, REPAIR_SKILL_MULT, SECTOR_CREW_RACES, pirateCrewRaces } from "./wiki/skills.ts";
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

describe("Crew skills, Repair skill: one point when a bar finishes", () => {
  function quiet(g: Game) {
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
    g.asteroid = false;
  }

  it("grants nothing on a partial bar and one point when that bar finishes", () => {
    const g = createGame(21);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    const s = g.player.systems[sys as keyof typeof g.player.systems];
    s.damage = 1;
    s.fix = 0;
    step(g, 0.05);
    assert.ok(s.fix > 0 && s.fix < 12.5);
    assert.equal(s.damage, 1);
    assert.equal(worker.skills?.repair ?? 0, 0);
    const helper = g.crew.find((c) => c.side === "player" && c.id !== worker.id);
    assert.ok(helper);
    assert.notEqual(helper.room, roomId);
    s.fix = 12.49;
    step(g, 0.05);
    assert.equal(s.damage, 0);
    assert.equal(worker.skills?.repair ?? 0, 1);
    assert.equal(helper.skills?.repair ?? 0, 0);
  });

  it("gives the point to each crew still in the room", () => {
    // INFERRED: the page names one finisher. Both stay, so both receive it.
    const g = createGame(22);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    const helper = g.crew.find((c) => c.side === "player" && c.id !== worker.id)!;
    helper.room = roomId;
    helper.path = [];
    helper.stun = 0;
    helper.kin = "plain";
    worker.skills = {};
    helper.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    const s = g.player.systems[sys as keyof typeof g.player.systems];
    s.damage = 1;
    s.fix = 12.49;
    step(g, 0.05);
    assert.equal(s.damage, 0);
    assert.equal(worker.skills?.repair ?? 0, 1);
    assert.equal(helper.skills?.repair ?? 0, 1);
  });

  it("sealing a breach trains nothing", () => {
    const g = createGame(23);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
    room.fire = 0;
    room.breach = 1;
    room.breachFix = 12.49;
    room.o2 = 100;
    g.augments = [];
    step(g, 0.05);
    assert.equal(room.breach, 0);
    assert.equal(worker.skills?.repair ?? 0, 0);
  });

  it("putting out a fire trains nothing", () => {
    const g = createGame(25);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
    room.breach = 0;
    room.o2 = 100;
    room.fire = 0.001;
    step(g, 0.05);
    assert.equal(room.fire, 0);
    assert.equal(worker.skills?.repair ?? 0, 0);
  });

  it("grants one point when a kit bar finishes", () => {
    const g = createGame(24);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    room.kit = "veil";
    g.player.kits.veil = {
      id: "veil",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      damage: 1,
      fix: 12.49,
    };
    step(g, 0.05);
    assert.equal(g.player.kits.veil.damage ?? 0, 0);
    assert.equal(worker.skills?.repair ?? 0, 1);
  });

  it("a mind-controlled crew member still gains a repair point", () => {
    // Crew skills, lead: "your mind-controlled crew still gains skill points by performing the tasks."
    const g = createGame(36);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.enemy!.rooms.find((r) => r.system && g.enemy!.systems[r.system].level > 0)!;
    const away = g.enemy!.rooms.find((r) => r.id !== room.id)!;
    const sys = g.enemy!.systems[room.system!];
    sys.damage = 1;
    sys.fix = 12.49;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    const hero = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) {
      c.path = [];
      c.skills = {};
      if (c.id !== hero.id && c.aboard === "enemy" && c.room === room.id) c.room = away.id;
    }
    hero.aboard = "enemy";
    hero.room = room.id;
    hero.path = [];
    hero.stun = 0;
    hero.leashed = 10;
    hero.kin = "plain";
    step(g, 0.05);
    assert.equal(sys.damage, 0);
    assert.equal(hero.skills?.repair ?? 0, 1);
  });

  it("grants one repair point per finished bar to every race", () => {
    // Crew skills, lead: "all races gain experience at the same rate (per job done)".
    for (const kin of ["plain", "shell", "blade"] as const) {
      const g = createGame(39);
      const { worker, roomId, sys } = lone(g);
      quiet(g);
      worker.kin = kin;
      worker.skills = {};
      const room = g.player.rooms.find((r) => r.id === roomId)!;
      room.fire = 0;
      room.breach = 0;
      room.o2 = 100;
      const s = g.player.systems[sys as keyof typeof g.player.systems];
      s.damage = 1;
      s.fix = 12.49;
      step(g, 0.05);
      assert.equal(s.damage, 0, kin);
      assert.equal(worker.skills?.repair ?? 0, 1, kin);
    }
  });

  it("an Engi repairs faster and a Mantis kills faster", () => {
    // Crew skills, lead: "Mantis can kill faster and Engi can finish repairs faster."
    // "The inverse is also true: Engi are slow killers and Mantis complete the repairs slower."
    const fix = (kin: "plain" | "shell" | "blade") => {
      const g = createGame(48);
      const { worker, roomId, sys } = lone(g);
      quiet(g);
      worker.kin = kin;
      worker.skills = {};
      const room = g.player.rooms.find((r) => r.id === roomId)!;
      room.fire = 0;
      room.breach = 0;
      room.o2 = 100;
      const s = g.player.systems[sys as keyof typeof g.player.systems];
      s.damage = 1;
      s.fix = 0;
      step(g, 0.05);
      return s.fix;
    };
    const humanFix = fix("plain");
    assert.ok(Math.abs(fix("shell") / humanFix - 2) < 1e-6);
    assert.ok(Math.abs(fix("blade") / humanFix - 0.5) < 1e-6);

    const hurt = (kin: "plain" | "shell" | "blade") => {
      const g = createGame(49);
      startCombat(g, "scout");
      for (const w of g.player.weapons) w.enabled = false;
      for (const w of g.enemy?.weapons ?? []) w.enabled = false;
      if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
      const room = g.player.rooms.find((r) => r.system === "sensors") ?? g.player.rooms[0]!;
      const away = g.player.rooms.find((r) => r.id !== room.id)!;
      const hero = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
      const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0)!;
      for (const c of g.crew) {
        if (c.id !== hero.id && c.id !== foe.id) c.room = away.id;
        c.path = [];
        c.think = 30;
        c.stun = 0;
        c.skills = {};
      }
      hero.room = room.id;
      hero.aboard = "player";
      hero.kin = kin;
      hero.hp = hero.maxHp;
      foe.room = room.id;
      foe.aboard = "player";
      foe.kin = "plain";
      foe.hp = foe.maxHp;
      foe.leashed = undefined;
      const before = foe.hp;
      step(g, 0.05);
      return before - foe.hp;
    };
    const humanHurt = hurt("plain");
    assert.ok(humanHurt > 0);
    assert.ok(Math.abs(hurt("shell") / humanHurt - 0.5) < 1e-6);
    assert.ok(Math.abs(hurt("blade") / humanHurt - 1.5) < 1e-6);
  });

  it("an untrained human finishes one system bar in 12.5 seconds", () => {
    // Crew skills, Repair skill: "It takes 12.5 seconds for an untrained Human to repair one system bar".
    const g = createGame(55);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    if (g.enemy?.kits.spike) {
      g.enemy.kits.spike.on = false;
      g.enemy.kits.spike.left = 0;
      g.enemy.kits.spike.cool = 999;
    }
    if (g.enemy?.kits.sling) g.enemy.kits.sling.power = 0;
    worker.kin = "plain";
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    room.fire = 0;
    room.breach = 0;
    room.o2 = 100;
    const s = g.player.systems[sys as keyof typeof g.player.systems];
    s.damage = 1;
    s.fix = 0;
    let steps = 0;
    while (s.damage > 0 && steps < 300) {
      step(g, 0.05);
      steps++;
    }
    assert.equal(s.damage, 0);
    // Each combat step is 0.05s, so 250 steps is the printed 12.5 seconds.
    assert.equal(steps, 250);
  });

  it("an untrained human seals one breach in 12.5 seconds", () => {
    // Crew skills, Repair skill: the same 12.5 seconds "to repair a breach."
    const g = createGame(56);
    const { worker, roomId, sys } = lone(g);
    quiet(g);
    if (g.enemy?.kits.spike) {
      g.enemy.kits.spike.on = false;
      g.enemy.kits.spike.left = 0;
      g.enemy.kits.spike.cool = 999;
    }
    if (g.enemy?.kits.sling) g.enemy.kits.sling.power = 0;
    g.augments = [];
    worker.kin = "plain";
    worker.skills = {};
    const room = g.player.rooms.find((r) => r.id === roomId)!;
    g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
    room.fire = 0;
    room.breach = 1;
    room.breachFix = 0;
    room.o2 = 100;
    let steps = 0;
    while (room.breach > 0 && steps < 300) {
      step(g, 0.05);
      steps++;
    }
    assert.equal(room.breach, 0);
    assert.equal(steps, 250);
    assert.equal(worker.skills?.repair ?? 0, 0);
  });

  it("a Rock fights a fire at 1.67 and a Crystal at 0.83", () => {
    // Crew skills, Repair skill: Rocks have a hidden 1.67 multiplier, Crystals a 0.83 multiplier.
    const drop = (kin: "plain" | "stone" | "shard") => {
      const g = createGame(58);
      const { worker, roomId, sys } = lone(g);
      quiet(g);
      worker.kin = kin;
      worker.skills = {};
      const room = g.player.rooms.find((r) => r.id === roomId)!;
      g.player.systems[sys as keyof typeof g.player.systems].damage = 0;
      room.breach = 0;
      room.o2 = 100;
      room.fire = 1;
      step(g, 0.05);
      return 1 - room.fire;
    };
    const human = drop("plain");
    assert.ok(human > 0);
    assert.ok(Math.abs(drop("stone") / human - 1.67) < 1e-6);
    assert.ok(Math.abs(drop("shard") / human - 0.83) < 1e-6);
  });
});

describe("Crew skills: sabotage damage ignores race", () => {
  it("deals the same system damage for a Human, an Engi, and a Mantis", () => {
    // Crew skills, lead: other jobs "are performed equally well by all crew races, including inflicting sabotage damage".
    const progress = (kin: "plain" | "shell" | "blade") => {
      const g = createGame(50);
      startCombat(g, "scout");
      for (const w of g.player.weapons) w.enabled = false;
      for (const w of g.enemy?.weapons ?? []) w.enabled = false;
      const room = g.enemy!.rooms.find((r) => r.system && g.enemy!.systems[r.system].level > 0)!;
      const away = g.enemy!.rooms.find((r) => r.id !== room.id)!;
      g.enemy!.systems[room.system!].damage = 0;
      room.fire = 0;
      room.sabotage = 0;
      const hero = g.crew.find((c) => c.side === "player")!;
      for (const c of g.crew) {
        c.path = [];
        if (c.id !== hero.id && c.room === room.id && c.aboard === "enemy") c.room = away.id;
      }
      hero.aboard = "enemy";
      hero.room = room.id;
      hero.path = [];
      hero.stun = 0;
      hero.leashed = undefined;
      hero.kin = kin;
      tickSabotage(g, 0.5);
      return room.sabotage ?? 0;
    };
    const human = progress("plain");
    assert.ok(human > 0);
    assert.equal(progress("shell"), human);
    assert.equal(progress("blade"), human);
  });

  it("one boarder breaks one bar in 12.5 seconds, skill and race aside", () => {
    // Crew skills, Combat skill: "always 12.5 seconds per crew for one system bar, regardless of the crew type or skills."
    const steps = (kin: "plain" | "shell" | "blade", combat: number) => {
      const g = createGame(57);
      startCombat(g, "scout");
      for (const w of g.player.weapons) w.enabled = false;
      for (const w of g.enemy?.weapons ?? []) w.enabled = false;
      const room = g.enemy!.rooms.find((r) => r.system && g.enemy!.systems[r.system].level > 0)!;
      const away = g.enemy!.rooms.find((r) => r.id !== room.id)!;
      const sys = g.enemy!.systems[room.system!];
      sys.damage = 0;
      room.fire = 0;
      room.sabotage = 0;
      const hero = g.crew.find((c) => c.side === "player")!;
      for (const c of g.crew) {
        c.path = [];
        if (c.id !== hero.id && c.aboard === "enemy" && c.room === room.id) c.room = away.id;
      }
      hero.aboard = "enemy";
      hero.room = room.id;
      hero.path = [];
      hero.stun = 0;
      hero.leashed = undefined;
      hero.kin = kin;
      hero.skills = { combat };
      let n = 0;
      while (sys.damage === 0 && n < 300) {
        tickSabotage(g, 0.05);
        n++;
      }
      return n;
    };
    assert.equal(steps("plain", 0), 250);
    assert.equal(steps("shell", 0), 250);
    assert.equal(steps("blade", 14), 250);
  });
});

describe("Crew skills: a repair drone cannot gain experience", () => {
  it("finishes a system bar and trains nobody", () => {
    // Crew skills, lead: repair drones "are totally unable to gain experience or achieve higher skill levels."
    const g = createGame(37);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    for (const c of g.crew) c.skills = {};
    const room = g.player.rooms.find((r) => r.system === "weapons")!;
    room.fire = 0;
    room.breach = 0;
    g.player.systems.weapons.damage = 1;
    g.player.systems.weapons.fix = 12.49;
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "patch",
      on: true,
      aux: 0,
      room: room.id,
      path: [],
    };
    tickSwarm(g, 0.05);
    assert.equal(g.player.systems.weapons.damage, 0);
    assert.ok(g.crew.every((c) => (c.skills?.repair ?? 0) === 0));
  });
});

describe("Crew skills: human experience column", () => {
  it("uses the printed parenthetical requirements", () => {
    // Crew skills, Skills table: the value in parentheses is the human requirement.
    const human = { kin: "plain" } as Crew;
    assert.equal(xpNeedFor(human, "pilot"), 13);
    assert.equal(xpNeedFor(human, "engines"), 13);
    assert.equal(xpNeedFor(human, "shields"), 50);
    assert.equal(xpNeedFor(human, "weapons"), 58);
    assert.equal(xpNeedFor(human, "repair"), 16);
    assert.equal(xpNeedFor(human, "combat"), 7);
    assert.equal(skillRank(12, xpNeedFor(human, "pilot")), 0);
    assert.equal(skillRank(13, xpNeedFor(human, "pilot")), 1);
  });
});

describe("Crew skills: the next rank costs the same", () => {
  it("asks for the same experience to reach level 1 and level 2", () => {
    // Crew skills, lead: "The amount of experience required to achieve skill level 1 and level 2 is exactly the same for a specific skill".
    const human = { kin: "plain" } as Crew;
    const need = xpNeedFor(human, "pilot");
    assert.equal(need, 13);
    assert.equal(skillRank(need - 1, need), 0);
    assert.equal(skillRank(need, need), 1);
    assert.equal(skillRank(need * 2 - 1, need), 1);
    assert.equal(skillRank(need * 2, need), 2);
  });
});

describe("Crew skills: repair skill speed", () => {
  it("repairs 10 percent faster at level 1 and 20 percent faster at level 2", () => {
    // Crew skills, Repair skill: "Level 1 (Green) | 10% faster repair", "Level 2 (Gold) | 20% faster repair".
    // INFERRED: "faster" is a rate multiplier, the reading the Shields section gives its own bonus.
    const g = createGame(59);
    const { worker } = lone(g);
    const need = xpNeedFor(worker, "repair");
    assert.equal(need, 16);
    const pace = (xp: number) => {
      worker.skills = { repair: xp };
      return repairPace(worker);
    };
    assert.ok(Math.abs(pace(0) - 1) < 1e-9);
    assert.ok(Math.abs(pace(need) - 1.1) < 1e-9);
    assert.ok(Math.abs(pace(need * 2) - 1.2) < 1e-9);
  });
});

describe("Crew skills: player crew start untrained", () => {
  it("starts every player crew member at skill level 0", () => {
    // Crew skills, lead: "All crew on every player ship start untrained, i.e. at skill level 0."
    const g = createGame(38);
    const yours = g.crew.filter((c) => c.side === "player");
    assert.ok(yours.length >= 1);
    const names: SkillName[] = ["pilot", "engines", "shields", "weapons", "repair", "combat"];
    for (const c of yours) {
      for (const skill of names) {
        assert.equal(c.skills?.[skill] ?? 0, 0);
        assert.equal(skillRank(c.skills?.[skill] ?? 0, xpNeedFor(c, skill)), 0);
      }
    }
  });
});

describe("Crew skills, Combat skill: 10% / 20% more damage dealt", () => {
  it("prints the table, with level 0 as default damage", () => {
    assert.deepEqual([...COMBAT_SKILL_MULT], [1, 1.1, 1.2]);
  });

  it("a gold fighter deals 20% more and does not take 20% more", () => {
    const g = createGame(11);
    startCombat(g, "scout");
    const room = g.player.rooms.find((r) => r.system === "sensors") ?? g.player.rooms.find((r) => !r.system);
    assert.ok(room);
    const away = g.player.rooms.find((r) => r.id !== room.id);
    assert.ok(away);
    const hero = g.crew.find((c) => c.side === "player" && c.hp > 0);
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(hero && foe);
    for (const c of g.crew) {
      if (c.id !== hero.id && c.id !== foe.id) c.room = away.id;
      c.path = [];
      c.think = 30;
      c.stun = 0;
    }
    hero.room = room.id;
    hero.aboard = "player";
    hero.kin = "plain";
    hero.skills = { combat: 14 };
    hero.hp = hero.maxHp;
    foe.room = room.id;
    foe.aboard = "player";
    foe.side = "enemy";
    foe.kin = "plain";
    foe.skills = {};
    foe.hp = foe.maxHp;
    foe.leashed = undefined;
    const heroBefore = hero.hp;
    const foeBefore = foe.hp;
    step(g, 1);
    const dealt = foeBefore - foe.hp;
    const taken = heroBefore - hero.hp;
    assert.ok(Math.abs(dealt / taken - 1.2) < 1e-6, `${dealt} vs ${taken}`);
  });

  it("does not speed sabotage", () => {
    const rates = [0, 100].map((xp) => {
      const g = createGame(13);
      startCombat(g, "scout");
      const room = g.enemy?.rooms.find((r) => r.system && g.enemy!.systems[r.system].level > 0);
      assert.ok(room && g.enemy);
      const away = g.enemy.rooms.find((r) => r.id !== room.id);
      assert.ok(away);
      for (const c of g.crew) if (c.side === "enemy") c.room = away.id;
      const hero = g.crew.find((c) => c.side === "player" && c.hp > 0);
      assert.ok(hero);
      hero.aboard = "enemy";
      hero.room = room.id;
      hero.path = [];
      hero.stun = 0;
      hero.think = 30;
      hero.skills = { combat: xp };
      room.fire = 0;
      room.sabotage = 0;
      step(g, 0.5);
      return room.sabotage ?? 0;
    });
    assert.ok(rates[0] > 0);
    assert.ok(Math.abs(rates[1] - rates[0]) < 1e-9);
  });
});

describe("Crew skills, Combat skill: one point for a killing blow or one system level", () => {
  function duel() {
    const g = createGame(31);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.player.rooms.find((r) => r.system === "sensors") ?? g.player.rooms[0]!;
    const away = g.player.rooms.find((r) => r.id !== room.id)!;
    const hero = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0)!;
    for (const c of g.crew) {
      if (c.id !== hero.id && c.id !== foe.id) c.room = away.id;
      c.path = [];
      c.think = 30;
      c.stun = 0;
      c.skills = {};
    }
    hero.room = room.id;
    hero.aboard = "player";
    hero.kin = "plain";
    hero.hp = hero.maxHp;
    foe.room = room.id;
    foe.aboard = "player";
    foe.side = "enemy";
    foe.kin = "plain";
    foe.hp = foe.maxHp;
    foe.leashed = undefined;
    return { g, hero, foe, room };
  }

  it("grants nothing while both crew still stand, then one point for the killing blow", () => {
    const { g, hero, foe } = duel();
    step(g, 0.05);
    assert.ok(foe.hp > 0 && foe.hp < foe.maxHp);
    assert.equal(hero.skills?.combat ?? 0, 0);
    foe.hp = 0.05;
    step(g, 0.05);
    assert.ok(foe.hp <= 0);
    assert.equal(hero.skills?.combat ?? 0, 1);
  });

  it("gives the point to each attacker still striking", () => {
    // INFERRED: the page names one final hit. Both are still striking, so both receive it.
    const { g, hero, foe, room } = duel();
    const mate = g.crew.find((c) => c.side === "player" && c.id !== hero.id)!;
    mate.room = room.id;
    mate.path = [];
    mate.kin = "plain";
    mate.skills = {};
    foe.hp = 0.05;
    step(g, 0.05);
    assert.ok(foe.hp <= 0);
    assert.equal(hero.skills?.combat ?? 0, 1);
    assert.equal(mate.skills?.combat ?? 0, 1);
  });

  it("killing a cloned crew member trains nothing", () => {
    const { g, hero, foe } = duel();
    foe.cloned = true;
    foe.hp = 0.05;
    step(g, 0.05);
    assert.ok(foe.hp <= 0);
    assert.equal(hero.skills?.combat ?? 0, 0);
  });

  it("grants one point when a sabotage bar finishes, and nothing to a fire", () => {
    const g = createGame(32);
    startCombat(g, "scout");
    g.crew = g.crew.filter((c) => c.side === "player");
    const room = g.enemy!.rooms.find((r) => r.system && g.enemy!.systems[r.system].level > 0)!;
    const sys = g.enemy!.systems[room.system!];
    sys.damage = 0;
    room.fire = 0;
    room.sabotage = 0.99;
    const hero = g.crew.find((c) => c.side === "player")!;
    hero.aboard = "enemy";
    hero.room = room.id;
    hero.path = [];
    hero.stun = 0;
    hero.skills = {};
    const bystander = g.crew.find((c) => c.side === "player" && c.id !== hero.id)!;
    bystander.skills = {};
    bystander.aboard = "player";
    tickSabotage(g, 0.05);
    assert.equal(sys.damage, 0);
    assert.equal(hero.skills?.combat ?? 0, 0);
    tickSabotage(g, 0.3);
    assert.equal(sys.damage, 1);
    assert.equal(hero.skills?.combat ?? 0, 1);
    assert.equal(bystander.skills?.combat ?? 0, 0);

    const burned = createGame(33);
    startCombat(burned, "scout");
    for (const c of burned.crew) c.skills = {};
    const hot = burned.enemy!.rooms.find((r) => r.system && burned.enemy!.systems[r.system].level > 0)!;
    burned.enemy!.systems[hot.system!].damage = 0;
    hot.fire = 1;
    hot.sabotage = 0.99;
    for (const c of burned.crew) if (c.aboard === "enemy" && c.room === hot.id) c.room = burned.player.rooms[0]!.id;
    tickSabotage(burned, 0.3);
    assert.equal(burned.enemy!.systems[hot.system!].damage, 1);
    assert.ok(burned.crew.every((c) => (c.skills?.combat ?? 0) === 0));
  });

  it("a mind-controlled crew member gains the point for damaging your system", () => {
    const g = createGame(34);
    startCombat(g, "scout");
    const room = g.player.rooms.find((r) => r.system && g.player.systems[r.system].level > 0)!;
    g.player.systems[room.system!].damage = 0;
    room.fire = 0;
    room.sabotage = 0.99;
    const turned = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) {
      c.skills = {};
      if (c.id !== turned.id && c.room === room.id) c.room = g.player.rooms.find((r) => r.id !== room.id)!.id;
    }
    turned.aboard = "player";
    turned.room = room.id;
    turned.path = [];
    turned.stun = 0;
    turned.leashed = 10;
    tickSabotage(g, 0.3);
    assert.equal(g.player.systems[room.system!].damage, 1);
    assert.equal(turned.skills?.combat ?? 0, 1);
  });

  it("destroying a crew drone trains nothing", () => {
    const g = createGame(35);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.enemy!.rooms[0]!;
    const hero = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) if (c.side === "player" && c.id !== hero.id) c.skills = {};
    hero.aboard = "enemy";
    hero.room = room.id;
    hero.path = [];
    hero.stun = 0;
    hero.leashed = undefined;
    hero.skills = {};
    hero.kin = "plain";
    const unit = {
      id: "crew-drone",
      kind: "personnel",
      alive: true,
      powered: true,
      aux: 0,
      cool: 0,
      hp: 0.2,
      room: room.id,
    };
    g.enemy!.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      loadout: ["personnel"],
      drones: [unit],
    };
    step(g, 0.05);
    assert.equal(unit.alive, false);
    assert.equal(hero.skills?.combat ?? 0, 0);
  });

  it("an enemy killing blow leaves that crew untrained", () => {
    // Crew skills, lead: "the enemy ships crew is always untrained and cannot reach higher skill levels."
    const { g, hero, foe } = duel();
    hero.hp = 0.05;
    step(g, 0.05);
    assert.ok(hero.hp <= 0);
    assert.equal(foe.skills?.combat ?? 0, 0);
  });
});

describe("Crew skills, Weapons: artillery grants one point", () => {
  function gunner(seed: number) {
    const g = createGame(seed);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.player.rooms.find((r) => r.system === "weapons")!;
    const away = g.player.rooms.find((r) => r.id !== room.id)!;
    const crew = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) if (c.side === "player") c.room = away.id;
    crew.room = room.id;
    crew.aboard = "player";
    crew.path = [];
    crew.stun = 0;
    crew.leashed = undefined;
    crew.skills = {};
    room.fire = 0;
    room.o2 = 100;
    return { g, crew, room, away };
  }

  it("grants one point when the artillery beam fires, and none while it is still charging", () => {
    const { g, crew } = gunner(41);
    g.player.kits.lance = {
      id: "lance",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: g.enemy!.rooms[0]!.id,
      on: true,
      aux: 0.5,
    };
    tickLance(g, 0.1);
    assert.equal(crew.skills?.weapons ?? 0, 0);
    g.player.kits.lance.aux = 0.999;
    tickLance(g, 0.1);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });

  it("counts a seven-shot flak burst as one fire", () => {
    const { g, crew, room, away } = gunner(42);
    armFlak(g, 1);
    g.player.kits.flak!.aux = 49.9;
    const before = g.shots.length;
    tickFlak(g, 0.2);
    assert.equal(g.shots.length - before, 7);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    crew.room = away.id;
    g.player.kits.flak!.aux = 49.9;
    tickFlak(g, 0.2);
    assert.equal(g.shots.length - before, 14);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    assert.equal(room.system, "weapons");
  });
});

describe("Crew skills: a Basic Laser charge", () => {
  it("drops from 10 seconds unmanned to 8 seconds fully trained", () => {
    // Crew skills, Weapons skill: "a Basic Laser improves from 10 seconds to 8 seconds."
    const fill = (trained: boolean) => {
      const g = createGame(60);
      startCombat(g, "scout");
      for (const w of g.enemy?.weapons ?? []) w.enabled = false;
      if (g.enemy?.kits.veil) {
        g.enemy.kits.veil.on = false;
        g.enemy.kits.veil.power = 0;
      }
      if (g.enemy?.kits.spike) {
        g.enemy.kits.spike.on = false;
        g.enemy.kits.spike.left = 0;
        g.enemy.kits.spike.cool = 999;
      }
      if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
      g.augments = [];
      g.asteroid = false;
      g.player.systems.weapons.level = 1;
      g.player.systems.weapons.power = 1;
      g.player.systems.weapons.damage = 0;
      g.player.systems.weapons.ion = [];
      const room = g.player.rooms.find((r) => r.system === "weapons")!;
      const away = g.player.rooms.find((r) => r.id !== room.id)!;
      for (const c of g.crew) {
        if (c.side !== "player") continue;
        c.room = away.id;
        c.path = [];
        c.stun = 999;
      }
      if (trained) {
        const crew = g.crew.find((c) => c.side === "player")!;
        crew.room = room.id;
        crew.kin = "plain";
        crew.stun = 0;
        crew.skills = { weapons: xpNeedFor(crew, "weapons") * 2 };
        assert.equal(xpNeedFor(crew, "weapons"), 58);
      }
      g.player.weapons = [{ uid: "gun", defId: "spark", charge: 0, enabled: true, autofire: false, target: null }];
      assert.equal(WEAPONS.spark.charge, 10);
      let steps = 0;
      while ((g.player.weapons[0]?.charge ?? 0) < 1 && steps < 250) {
        step(g, 0.05);
        steps++;
      }
      return steps;
    };
    // 200 steps of the 0.05s combat tick is 10 seconds. 8 seconds is 160 of those steps.
    // 0.05 does not divide 8 in binary, so the trained bar crosses full on the next step.
    assert.equal(fill(false), 200);
    assert.equal(fill(true), 161);
  });
});

describe("Crew skills, Weapons: turning a gun off just after the increment drops the shot", () => {
  function primed(seed: number, defId: string) {
    const g = createGame(seed);
    startCombat(g, "scout");
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.player.rooms.find((r) => r.system === "weapons")!;
    const away = g.player.rooms.find((r) => r.id !== room.id)!;
    const crew = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) if (c.side === "player") c.room = away.id;
    crew.room = room.id;
    crew.aboard = "player";
    crew.path = [];
    crew.stun = 0;
    crew.leashed = undefined;
    crew.skills = {};
    room.fire = 0;
    room.o2 = 100;
    g.player.systems.weapons.level = 4;
    g.player.systems.weapons.power = 4;
    g.player.systems.weapons.damage = 0;
    g.player.systems.weapons.ion = [];
    g.player.weapons = [{ uid: "gun", defId, charge: 0, enabled: true, autofire: false, target: null }];
    g.missiles = 3;
    const target = g.enemy!.rooms[0]!.id;
    g.armed = "gun";
    g.targeting = true;
    aim(g, target);
    assert.equal(g.shots.length, 0);
    g.player.weapons[0]!.charge = 1;
    fireReady(g);
    return { g, crew, target };
  }

  it("drops a three-shot volley, keeps the one point, and the next fire trains again", () => {
    const { g, crew, target } = primed(43, "lineburst");
    assert.equal(g.shots.length, 3);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    assert.equal(g.player.weapons[0]!.charge, 0);
    depowerWeapon(g, "gun");
    assert.equal(g.shots.length, 0);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    assert.equal(g.missiles, 3);
    const w = g.player.weapons[0]!;
    w.enabled = true;
    w.charge = 1;
    g.armed = "gun";
    g.targeting = true;
    aim(g, target);
    assert.equal(g.shots.length, 3);
    assert.equal(crew.skills?.weapons ?? 0, 2);
  });

  it("still drops the shot one tick later, and a missile spent for it comes back", () => {
    const { g, crew } = primed(44, "artemis");
    assert.equal(g.shots.length, 1);
    assert.equal(g.missiles, 2);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    step(g, 0.05);
    assert.equal(g.shots.length, 1);
    toggleWeapon(g, "gun");
    assert.equal(g.shots.length, 0);
    assert.equal(g.missiles, 3);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });

  it("leaves the shot once the window has passed", () => {
    // INFERRED: 0.15s. Four 0.05s steps are past it. A laser flight is 0.7s, so the shot is still in the air.
    const { g, crew } = primed(45, "spark");
    assert.equal(g.shots.length, 1);
    for (let i = 0; i < 4; i++) step(g, 0.05);
    depowerWeapon(g, "gun");
    assert.equal(g.shots.length, 1);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });

  it("grants one point as the shot leaves, hit or miss", () => {
    // Crew skills, Weapons: "It doesn't matter whether it hits or misses, or whether it can do damage."
    const { g, crew } = primed(52, "spark");
    assert.equal(g.shots.length, 1);
    assert.equal(crew.skills?.weapons ?? 0, 1);
    for (let i = 0; i < 20 && g.shots.length; i++) step(g, 0.05);
    assert.equal(g.shots.length, 0);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });

  it("counts a three-shot burst as one fire", () => {
    // Crew skills, Weapons: "Volleys of multi-shot weapons such as burst lasers count as a single fire".
    const { g, crew } = primed(54, "lineburst");
    assert.equal(g.shots.length, 3);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });
});

describe("Crew skills, Weapons: a bomb fired at your own ship still trains", () => {
  it("grants one point and spends one missile", () => {
    const g = createGame(46);
    startCombat(g, "scout");
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    const room = g.player.rooms.find((r) => r.system === "weapons")!;
    const bay = g.player.rooms.find((r) => r.system === "medbay")!;
    const away = g.player.rooms.find((r) => r.id !== room.id && r.id !== bay.id)!;
    const crew = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) if (c.side === "player") c.room = away.id;
    crew.room = room.id;
    crew.aboard = "player";
    crew.path = [];
    crew.stun = 0;
    crew.leashed = undefined;
    crew.skills = {};
    room.fire = 0;
    room.o2 = 100;
    g.player.systems.weapons.level = 4;
    g.player.systems.weapons.power = 4;
    g.player.systems.weapons.damage = 0;
    g.player.systems.weapons.ion = [];
    g.player.weapons = [{ uid: "gun", defId: "smallbomb", charge: 0, enabled: true, autofire: false, target: null }];
    g.missiles = 4;
    g.armed = "gun";
    g.targeting = true;
    aim(g, bay.id);
    assert.equal(g.player.weapons[0]!.own, true);
    assert.equal(g.shots.length, 0);
    assert.equal(crew.skills?.weapons ?? 0, 0);
    g.player.weapons[0]!.charge = 1;
    fireReady(g);
    assert.equal(g.shots.length, 1);
    assert.equal(g.shots[0]!.own, true);
    assert.equal(g.shots[0]!.targetRoom, bay.id);
    assert.equal(g.missiles, 3);
    assert.equal(crew.skills?.weapons ?? 0, 1);
  });
});

describe("Crew skills, Shields: an ion hit on the bubble ionizes shields", () => {
  it("puts the ion on shields, leaves the aimed room clear, and trains nothing", () => {
    const g = createGame(51);
    startCombat(g, "scout");
    g.player.systems.engines.power = 0;
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.shieldNow = 2;
    g.player.systems.shields.ion = [];
    g.player.systems.weapons.ion = [];
    const shields = g.player.rooms.find((r) => r.system === "shields")!;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    nen.room = shields.id;
    nen.path = [];
    nen.skills = {};
    const shot: Shot = {
      id: "ion",
      kind: "ion",
      from: "enemy",
      damage: 0,
      ion: 1,
      fireChance: 0,
      breachChance: 0,
      targetRoom: "p-weapons",
      wait: 0,
      t: 1,
      duration: 1,
    };
    applyImpact(g, shot);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(g.player.systems.shields.ion.length, 1);
    assert.equal(g.player.systems.weapons.ion.length, 0);
    assert.equal(nen.skills?.shields ?? 0, 0);
  });
});

describe("AI-Controlled Rebel Ships, manning bonuses", () => {
  function autoHull(seed: number) {
    const g = createGame(seed);
    startCombat(g, "scout");
    const e = g.enemy;
    assert.ok(e);
    e.automated = true;
    e.flagship = undefined;
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    e.systems.engines.level = 2;
    e.systems.engines.power = 2;
    e.systems.engines.damage = 0;
    e.systems.engines.ion = [];
    e.systems.pilot.level = 1;
    e.systems.pilot.power = 1;
    e.systems.pilot.damage = 0;
    e.systems.pilot.ion = [];
    assert.ok(e.rooms.some((r) => r.system === "pilot"));
    return { g, e };
  }

  it("adds the untrained +5/+5 while both systems are undamaged", () => {
    const { g, e } = autoHull(15);
    // Engines level 2 is 10, plus 5 engines and 5 piloting.
    assert.equal(evasionPercent(g, e, "enemy"), 20);
    e.systems.engines.damage = 1;
    // One bar left is 5, and only piloting still adds 5.
    assert.equal(evasionPercent(g, e, "enemy"), 10);
  });

  it("keeps the bonus while engines are ionized and drops it when piloting is destroyed", () => {
    const { g, e } = autoHull(16);
    e.systems.engines.ion = [5, 5];
    assert.equal(evasionPercent(g, e, "enemy"), 10);
    e.systems.engines.ion = [];
    e.systems.pilot.damage = 1;
    // Piloting is gone, so only the undamaged engines table plus its +5.
    assert.equal(evasionPercent(g, e, "enemy"), 15);
  });

  it("charges an undamaged Weapon Control at the untrained 0.9", () => {
    const charged = (damage: number) => {
      const { g, e } = autoHull(17);
      e.systems.weapons.level = 2;
      e.systems.weapons.power = 2;
      e.systems.weapons.damage = damage;
      e.systems.weapons.ion = [];
      e.weapons = [{ id: "w", defId: "spark", charge: 0, enabled: true, target: "p-pilot" }];
      if (e.kits.veil) {
        e.kits.veil.power = 0;
        e.kits.veil.on = false;
      }
      step(g, 0.05);
      return e.weapons[0].charge;
    };
    const bare = 0.05 / WEAPONS.spark.charge;
    assert.ok(Math.abs(charged(0) - bare / 0.9) < 1e-9);
    assert.ok(Math.abs(charged(1) - bare) < 1e-9);
  });

  it("recharges undamaged shields at the untrained 1.1", () => {
    const gained = (damage: number) => {
      const { g, e } = autoHull(18);
      e.systems.shields.level = 4;
      e.systems.shields.power = 4;
      e.systems.shields.damage = damage;
      e.systems.shields.ion = [];
      e.shieldNow = 0;
      e.shieldCharge = 0;
      for (const w of e.weapons) w.enabled = false;
      for (const w of g.player.weapons) w.enabled = false;
      // step clamps one call to 0.05s. 37 calls is 1.85s: past 2/1.1 and short of 2.
      for (let i = 0; i < 37; i++) step(g, 0.05);
      return e.shieldNow;
    };
    assert.equal(gained(0), 1);
    assert.equal(gained(1), 0);
  });
});

describe("Crew skills, Piloting: a cloak does not train evasion", () => {
  it("skips piloting and engines while cloaked, and still trains shields on a bubble hit", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
    g.asteroid = false;
    g.player.systems.engines.power = 0;
    g.enemy!.systems.engines.power = 0;
    g.player.systems.shields.power = 2;
    g.player.shieldNow = 1;
    const ada = g.crew.find((c) => c.id === "c-ada");
    const ivo = g.crew.find((c) => c.id === "c-ivo");
    const nen = g.crew.find((c) => c.id === "c-nen");
    assert.ok(ada && ivo && nen);
    nen.room = "p-shields";
    nen.path = [];
    g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 15, cool: 0, target: null, on: true, aux: 0 };
    const poke = () => {
      g.player.shieldNow = 1;
      g.player.hull = g.player.hullMax;
      g.shots.push({
        id: "poke",
        kind: "laser",
        from: "enemy",
        at: "player",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: "p-shields",
        wait: 0,
        t: 0,
        duration: 0.05,
        label: "Pew",
      });
      step(g, 0.05);
    };
    let missed = false;
    let hit = false;
    for (let i = 0; i < 40 && !(missed && hit); i++) {
      poke();
      assert.equal(ada.skills?.pilot ?? 0, 0);
      assert.equal(ivo.skills?.engines ?? 0, 0);
      if (g.log[0] === "Shot missed the Lark.") missed = true;
      else {
        hit = true;
        assert.ok((nen.skills?.shields ?? 0) > 0);
      }
    }
    assert.equal(missed, true);
    assert.equal(hit, true);

    g.player.kits.veil.on = false;
    g.player.kits.veil.left = 0;
    g.player.systems.engines.level = 8;
    g.player.systems.engines.power = 8;
    let trained = false;
    for (let i = 0; i < 40 && !trained; i++) {
      poke();
      if ((ada.skills?.pilot ?? 0) > 0 && (ivo.skills?.engines ?? 0) > 0) trained = true;
    }
    assert.equal(trained, true);
  });

  it("grants one piloting point and one engines point for each dodge, and none for a hit", () => {
    // Crew skills, Piloting: "one point of experience for each projectile dodged during combat."
    // Engines: "one point of experience for each projectile evaded."
    const g = createGame(51);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
    g.asteroid = false;
    g.player.systems.engines.level = 8;
    g.player.systems.engines.power = 8;
    g.player.systems.engines.damage = 0;
    g.player.systems.pilot.damage = 0;
    g.player.systems.shields.power = 2;
    g.player.shieldNow = 1;
    const ada = g.crew.find((c) => c.id === "c-ada")!;
    const ivo = g.crew.find((c) => c.id === "c-ivo")!;
    ada.room = "p-pilot";
    ivo.room = "p-engines";
    ada.path = [];
    ivo.path = [];
    ada.skills = {};
    ivo.skills = {};
    for (const c of g.crew) {
      if (c.id !== ada.id && c.id !== ivo.id) c.skills = {};
    }
    let misses = 0;
    let hits = 0;
    for (let i = 0; i < 80 && (misses < 2 || hits < 1); i++) {
      const pilotBefore = ada.skills?.pilot ?? 0;
      const enginesBefore = ivo.skills?.engines ?? 0;
      g.player.shieldNow = 1;
      g.player.hull = g.player.hullMax;
      // A shield hit logs nothing, so a previous miss would stay at the front of the log.
      g.log.length = 0;
      g.shots.push({
        id: "poke-" + i,
        kind: "laser",
        from: "enemy",
        at: "player",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: "p-shields",
        wait: 0,
        t: 0,
        duration: 0.05,
        label: "Pew",
      });
      step(g, 0.05);
      const pilot = ada.skills?.pilot ?? 0;
      const engines = ivo.skills?.engines ?? 0;
      if (g.log[0] === "Shot missed the Lark.") {
        misses++;
        assert.equal(pilot - pilotBefore, 1);
        assert.equal(engines - enginesBefore, 1);
      } else {
        hits++;
        assert.equal(pilot, pilotBefore);
        assert.equal(engines, enginesBefore);
      }
    }
    assert.ok(misses >= 2);
    assert.ok(hits >= 1);
  });
});

describe("Crew skills, Shields: one point per bubble hit", () => {
  it("grants one shields point when a shot depletes the bubble, and none when it misses", () => {
    // Crew skills, Shields: "one point of experience for every projectile that hits your shield bubble and depletes it".
    const g = createGame(53);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    if (g.enemy?.kits.swarm) g.enemy.kits.swarm.loadout = [];
    g.asteroid = false;
    g.player.systems.engines.level = 8;
    g.player.systems.engines.power = 8;
    g.player.systems.engines.damage = 0;
    g.player.systems.shields.level = 2;
    g.player.systems.shields.power = 2;
    g.player.systems.shields.damage = 0;
    g.player.shieldNow = 1;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    const shields = g.player.rooms.find((r) => r.system === "shields")!;
    nen.room = shields.id;
    nen.path = [];
    nen.stun = 0;
    nen.leashed = undefined;
    nen.skills = {};
    shields.fire = 0;
    shields.o2 = 100;
    for (const c of g.crew) if (c.id !== nen.id && c.room === shields.id) c.room = "p-pilot";
    let hits = 0;
    let misses = 0;
    for (let i = 0; i < 80 && (hits < 2 || misses < 1); i++) {
      const before = nen.skills?.shields ?? 0;
      g.player.shieldNow = 1;
      g.player.hull = g.player.hullMax;
      g.log.length = 0;
      g.shots.push({
        id: "bubble-" + i,
        kind: "laser",
        from: "enemy",
        at: "player",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: shields.id,
        wait: 0,
        t: 0,
        duration: 0.05,
        label: "Pew",
      });
      step(g, 0.05);
      const gained = (nen.skills?.shields ?? 0) - before;
      if (g.log[0] === "Shot missed the Lark.") {
        misses++;
        assert.equal(gained, 0);
        assert.equal(g.player.shieldNow, 1);
      } else {
        hits++;
        assert.equal(g.player.shieldNow, 0);
        assert.equal(gained, 1);
      }
    }
    assert.ok(hits >= 2);
    assert.ok(misses >= 1);
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
