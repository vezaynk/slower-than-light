import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { aiCrew, jobsOn, planCrew, tickEnemyCrewAi } from "./crewai.ts";
import type { Crew, Game, Room } from "../types.ts";

/** A Rebel hull with a Medbay, no subsystem kits (no teleporter to borrow crew), and 4+ crew. */
function fight(minCrew = 4): Game {
  for (let seed = 1; seed < 500; seed++) {
    const g = createGame(seed);
    startCombat(g, "Rebel ship");
    const e = g.enemy!;
    if (Object.keys(e.kits).length) continue;
    if (!e.rooms.some((r) => r.system === "medbay")) continue;
    if (foes(g).length < minCrew) continue;
    calm(g);
    return g;
  }
  throw new Error("no Rebel hull with a Medbay");
}

/** Strip everything that would end the fight or hurt crew. */
function calm(g: Game) {
  g.enemy!.weapons = [];
  g.player.weapons = [];
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = false;
  g.asteroid = false;
  g.bossSurge = 0;
  g.boardTimer = 0;
}

function foes(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);
}

function room(g: Game, sys: string): Room {
  const r = g.enemy!.rooms.find((x) => x.system === sys);
  assert.ok(r, sys);
  return r;
}

function run(g: Game, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) step(g, 0.05);
}

/** A player crew member standing on the enemy hull. */
function board(g: Game, roomId: string, hp = 1000): Crew {
  const c: Crew = {
    id: `b${g.crew.length}`,
    name: "Boarder",
    side: "player",
    aboard: "enemy",
    hp,
    maxHp: hp,
    room: roomId,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
  };
  g.crew.push(c);
  return c;
}

describe("enemy crew AI: stations", () => {
  it("posts each crew member where it starts and walks it back when idle", () => {
    const g = fight();
    const c = foes(g).find((x) => x.room === room(g, "weapons").id)!;
    tickEnemyCrewAi(g, 0.05);
    assert.equal(g.enemy!.crewAi!.post[c.id], room(g, "weapons").id);
    c.room = room(g, "oxygen").id;
    run(g, 6);
    assert.equal(c.room, room(g, "weapons").id);
    assert.equal(c.path.length, 0);
  });

  it("refills an empty Piloting station from a lower post", () => {
    const g = fight();
    tickEnemyCrewAi(g, 0.05);
    const pilot = foes(g).find((x) => x.room === room(g, "pilot").id)!;
    pilot.hp = 0;
    g.crew = g.crew.filter((c) => c.hp > 0);
    planCrew(g, g.enemy!, g.enemy!.crewAi!);
    const posts = Object.values(g.enemy!.crewAi!.post);
    const live = foes(g).map((c) => g.enemy!.crewAi!.post[c.id]);
    assert.ok(posts.length > live.length);
    assert.ok(live.includes(room(g, "pilot").id));
  });
});

describe("enemy crew AI: intruders", () => {
  it("sends one defender per boarder and returns them after", () => {
    const g = fight();
    const ox = room(g, "oxygen").id;
    board(g, ox);
    board(g, ox);
    tickEnemyCrewAi(g, 0.05);
    const tasks = Object.values(g.enemy!.crewAi!.task).filter((t) => t.kind === "defend" && t.room === ox);
    assert.equal(tasks.length, 2);
    g.crew = g.crew.filter((c) => c.side === "enemy");
    run(g, 8);
    for (const c of foes(g)) assert.equal(c.room, g.enemy!.crewAi!.post[c.id]);
  });

  it("counts an enemy crew member under the player's Mind Control as an intruder", () => {
    const g = fight();
    const ox = room(g, "oxygen").id;
    const turned = foes(g)[0];
    turned.leashed = 10;
    turned.room = ox;
    const jobs = jobsOn(g, g.enemy!);
    assert.ok(jobs.some((j) => j.kind === "defend" && j.room === ox && j.slots === 1));
    // and is not driven by this AI
    assert.ok(!aiCrew(g, g.enemy!).includes(turned));
  });
});

describe("enemy crew AI: shields first", () => {
  it("puts the shield room ahead of every other job", () => {
    const g = fight();
    g.enemy!.systems.engines.damage = 1;
    g.enemy!.systems.shields.damage = 1;
    room(g, "weapons").fire = 1;
    const jobs = jobsOn(g, g.enemy!);
    assert.equal(jobs[0].kind, "shields");
  });

  it("pulls a crew member off another job to the shield room", () => {
    const g = fight();
    const sh = room(g, "shields").id;
    // The shield crew is away; everyone else is busy.
    tickEnemyCrewAi(g, 0.05);
    const ai = g.enemy!.crewAi!;
    for (const c of foes(g)) ai.task[c.id] = { kind: "repair", room: room(g, "engines").id };
    g.enemy!.systems.engines.damage = 1;
    for (const c of foes(g)) if (c.room === sh) c.room = room(g, "oxygen").id;
    board(g, sh);
    planCrew(g, g.enemy!, ai);
    assert.ok(Object.values(ai.task).some((t) => t.kind === "shields"));
  });
});

describe("enemy crew AI: fires and repairs", () => {
  it("sends two crew to a fire", () => {
    const g = fight();
    const ox = room(g, "oxygen");
    ox.fire = 1;
    tickEnemyCrewAi(g, 0.05);
    const n = Object.values(g.enemy!.crewAi!.task).filter((t) => t.kind === "fire" && t.room === ox.id).length;
    assert.equal(n, 2);
  });

  it("repairs a damaged system and goes home", () => {
    const g = fight();
    const ox = room(g, "oxygen");
    g.enemy!.systems.oxygen.damage = 1;
    run(g, 20);
    assert.equal(g.enemy!.systems.oxygen.damage, 0);
    run(g, 8);
    for (const c of foes(g)) assert.equal(c.room, g.enemy!.crewAi!.post[c.id]);
    assert.ok(!foes(g).some((c) => c.room === ox.id && g.enemy!.crewAi!.post[c.id] !== ox.id));
  });

  it("leaves a fully burning, breached room alone", () => {
    const g = fight();
    const big = g.enemy!.rooms.find((r) => r.system !== "shields" && r.w * r.h >= 2);
    assert.ok(big);
    big.fire = 3;
    big.breach = 1;
    const jobs = jobsOn(g, g.enemy!);
    assert.ok(!jobs.some((j) => j.kind === "fire" && j.room === big.id));
    // A one-tile room with a fire is still fought.
    const small = g.enemy!.rooms.find((r) => r.system !== "shields" && r.w * r.h === 1);
    if (small) {
      small.fire = 1;
      assert.ok(jobsOn(g, g.enemy!).some((j) => j.kind === "fire" && j.room === small.id));
    }
  });
});

describe("enemy crew AI: health", () => {
  it("sends a hurt crew member to the Medbay and keeps it there until full", () => {
    const g = fight();
    const med = room(g, "medbay").id;
    const c = foes(g).find((x) => x.room === room(g, "weapons").id)!;
    c.hp = c.maxHp * 0.2;
    run(g, 1);
    assert.equal(g.enemy!.crewAi!.task[c.id]?.kind, "heal");
    run(g, 6);
    assert.equal(c.room, med);
    assert.ok(c.hp < c.maxHp);
    run(g, 30);
    assert.equal(c.hp, c.maxHp);
    run(g, 6);
    assert.equal(c.room, room(g, "weapons").id);
  });

  it("weak crew leave a burning room", () => {
    const g = fight();
    const c = foes(g).find((x) => x.room === room(g, "weapons").id)!;
    // No Medbay to run to.
    g.enemy!.systems.medbay.level = 0;
    c.hp = c.maxHp * 0.15;
    room(g, "weapons").fire = 1;
    tickEnemyCrewAi(g, 0.05);
    assert.equal(g.enemy!.crewAi!.task[c.id]?.kind, "flee");
    assert.notEqual(c.path.length, 0);
  });
});

describe("enemy crew AI: scope", () => {
  it("does nothing on an automated ship", () => {
    const g = fight();
    g.enemy!.automated = true;
    tickEnemyCrewAi(g, 0.05);
    assert.equal(g.enemy!.crewAi, undefined);
  });

  it("is deterministic per seed", () => {
    const a = fight();
    const b = fight();
    for (const g of [a, b]) {
      g.enemy!.systems.engines.damage = 2;
      room(g, "oxygen").fire = 1;
      board(g, room(g, "shields").id, 50);
      run(g, 10);
    }
    assert.deepEqual(
      foes(a).map((c) => [c.room, c.hp, c.path]),
      foes(b).map((c) => [c.room, c.hp, c.path]),
    );
  });
});
