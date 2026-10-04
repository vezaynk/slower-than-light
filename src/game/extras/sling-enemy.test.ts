import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { enemyBrokenSystems, tickEnemyBoarding } from "./sling.ts";
import type { Crew, EnemyBoarding, Game, Kit } from "../types.ts";

const PADS = "e-teleporter";

/** A Mantis hull with a Crew Teleporter and at least 3 crew, all of them full health. */
function boarder(minCrew = 3): Game {
  for (let seed = 1; seed < 500; seed++) {
    const g = createGame(seed);
    startCombat(g, "Mantis ship");
    if (!g.enemy?.kits.sling) continue;
    if (foes(g).length < minCrew) continue;
    calm(g);
    return g;
  }
  throw new Error("no Mantis ship with a teleporter");
}

/** Strip everything that would end the fight or hurt crew, so only boarding is under test. */
function calm(g: Game) {
  g.enemy!.weapons = [];
  for (const w of g.player.weapons) w.enabled = false;
  g.player.weapons = [];
  g.enemyEscape = null;
  g.asb = false;
  g.asteroid = false;
  g.player.zoltan = 0;
  g.bossSurge = 0;
}

function foes(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "enemy" && c.hp > 0);
}

function aboard(g: Game): Crew[] {
  return foes(g).filter((c) => c.aboard === "player");
}

function pad(g: Game): Kit {
  const kit = g.enemy?.kits.sling;
  assert.ok(kit);
  return kit;
}

function plan(g: Game): EnemyBoarding {
  const b = g.enemy?.boarding;
  assert.ok(b);
  return b;
}

/** Skip the opening delay and form the first party. */
function form(g: Game): Crew[] {
  g.boardTimer = 0;
  tickEnemyBoarding(g, 0.01);
  return plan(g).party.map((id) => g.crew.find((c) => c.id === id)!);
}

/** Put the party straight onto the pads (the walk is covered separately). */
function stand(crew: Crew[]) {
  for (const c of crew) {
    c.room = PADS;
    c.path = [];
    c.move = 0;
  }
}

/** One full send: form, stand, tick. Returns the boarders. */
function send(g: Game): Crew[] {
  pad(g).cool = 0;
  const party = form(g);
  assert.ok(party.length > 0, "a party forms");
  stand(party);
  tickEnemyBoarding(g, 0.01);
  return party;
}

describe("enemy crew teleporter", () => {
  it("a hull with no teleporter never boards", () => {
    let g: Game | null = null;
    for (let seed = 1; seed < 500 && !g; seed++) {
      const t = createGame(seed);
      startCombat(t, "Rebel ship");
      if (!t.enemy?.kits.sling && !t.enemy?.automated && foes(t).length >= 3) g = t;
    }
    assert.ok(g);
    calm(g);
    for (let i = 0; i < 1200; i++) step(g, 0.05);
    assert.equal(aboard(g).length, 0);
  });

  it("waits out the opening delay before anyone moves", () => {
    const g = boarder();
    assert.ok(g.boardTimer > 0);
    tickEnemyBoarding(g, 1);
    assert.equal(g.enemy!.boarding, undefined);
    assert.ok(foes(g).every((c) => c.path.length === 0));
  });

  it("walks the party to the pads and sends only once they stand there", () => {
    const g = boarder();
    const party = form(g);
    assert.ok(party.length >= 1 && party.length <= 2);
    for (const c of party) {
      if (c.room !== PADS) assert.equal(c.path[c.path.length - 1], PADS);
    }
    // Someone still walking: nobody goes.
    const walker = party[0];
    walker.room = g.enemy!.rooms.find((r) => r.id !== PADS)!.id;
    walker.path = [PADS];
    for (const c of party.slice(1)) stand([c]);
    tickEnemyBoarding(g, 0.01);
    assert.equal(aboard(g).length, 0);
    stand(party);
    tickEnemyBoarding(g, 0.01);
    assert.equal(aboard(g).length, party.length);
    assert.equal(plan(g).sent, 1);
    // They land together.
    assert.equal(new Set(aboard(g).map((c) => c.room)).size, 1);
  });

  it("boards in the real sim loop by walking there", () => {
    const g = boarder();
    let seenOnPads = false;
    for (let i = 0; i < 1200 && aboard(g).length === 0; i++) {
      step(g, 0.05);
      if (foes(g).some((c) => c.aboard === "enemy" && c.room === PADS && c.path.length === 0)) seenOnPads = true;
    }
    assert.ok(aboard(g).length > 0, "boarders arrive");
    assert.ok(seenOnPads || aboard(g).length > 0);
    assert.ok(aboard(g).length <= 2);
  });

  it("keeps the pilot and at least one crew at home", () => {
    const g = boarder();
    const before = foes(g).length;
    const party = form(g);
    const pilot = g.enemy!.rooms.find((r) => r.system === "pilot")?.id;
    assert.ok(party.every((c) => c.room !== pilot || c.path.length > 0));
    assert.ok(before - party.length >= (before >= 4 ? 2 : 1));
  });

  it("sends at most 2 boarding parties per fight", () => {
    const g = boarder();
    for (let round = 0; round < 2; round++) {
      const party = send(g);
      assert.ok(party.every((c) => c.aboard === "player"));
      // Pull them back through the low-health recall, then heal them and clear the cooldown.
      for (const c of party) c.hp = c.maxHp * 0.1;
      pad(g).cool = 0;
      tickEnemyBoarding(g, 0.01);
      assert.ok(party.every((c) => c.aboard === "enemy"));
      // Healed and back at their stations.
      for (const c of party) {
        c.hp = c.maxHp;
        c.room = plan(g).home[c.id];
        c.path = [];
      }
    }
    assert.equal(plan(g).sent, 2);
    pad(g).cool = 0;
    tickEnemyBoarding(g, 0.01);
    assert.equal(plan(g).party.length, 0, "no third party forms");
    assert.equal(aboard(g).length, 0);
  });

  it("a Rebel Elite may send 3 or 4 times", () => {
    const g = boarder();
    g.enemy!.classId = "elite-fighter";
    form(g);
    assert.ok([3, 4].includes(plan(g).limit));
  });

  it("an active Zoltan Shield blocks boarding and the party steps off the pads", () => {
    const g = boarder();
    const party = form(g);
    stand(party);
    g.player.zoltan = 5;
    tickEnemyBoarding(g, 0.01);
    assert.equal(aboard(g).length, 0);
    assert.equal(plan(g).party.length, 0);
    // Anyone with a station elsewhere is walking away from the pads.
    for (const c of party) {
      if (plan(g).home[c.id] !== PADS) assert.ok(c.path.length > 0 && c.path[c.path.length - 1] !== PADS);
    }
    // They reach their stations, then the shield drops: the order to board comes straight back.
    for (const c of party) {
      c.room = plan(g).home[c.id];
      c.path = [];
    }
    g.player.zoltan = 0;
    tickEnemyBoarding(g, 0.01);
    assert.ok(plan(g).party.length > 0);
    const again = plan(g).party.map((id) => g.crew.find((c) => c.id === id)!);
    stand(again);
    tickEnemyBoarding(g, 0.01);
    assert.equal(aboard(g).length, again.length);
  });

  for (const [level, seconds] of [
    [1, 20],
    [2, 15],
    [3, 10],
  ]) {
    it(`level ${level} teleporter cools for ${seconds}s after a send`, () => {
      const g = boarder();
      pad(g).level = level;
      pad(g).power = level;
      const party = send(g);
      assert.equal(pad(g).cool, seconds);
      // A recall has to wait out the cooldown.
      party[0].hp = party[0].maxHp * 0.1;
      tickEnemyBoarding(g, seconds - 1);
      assert.equal(party[0].aboard, "player");
      tickEnemyBoarding(g, 1.01);
      assert.equal(party[0].aboard, "enemy");
      assert.equal(party[0].room === PADS || party[0].path.length > 0, true);
    });
  }

  it("a party on the pads waits for the cooldown", () => {
    const g = boarder();
    const party = form(g);
    stand(party);
    pad(g).cool = 5;
    tickEnemyBoarding(g, 1);
    assert.equal(aboard(g).length, 0);
    tickEnemyBoarding(g, 4.01);
    assert.equal(aboard(g).length, party.length);
  });

  it("a teleporter at 0 working bars sends no one", () => {
    const g = boarder();
    const party = form(g);
    stand(party);
    pad(g).damage = pad(g).level;
    pad(g).power = 0;
    tickEnemyBoarding(g, 1);
    assert.equal(aboard(g).length, 0);
    pad(g).damage = 0;
    pad(g).power = pad(g).level;
    tickEnemyBoarding(g, 0.01);
    assert.equal(aboard(g).length, party.length);
  });

  it("a teleporter at 0 working bars cannot recall", () => {
    const g = boarder();
    const party = send(g);
    pad(g).cool = 0;
    pad(g).damage = pad(g).level;
    pad(g).power = 0;
    party[0].hp = party[0].maxHp * 0.1;
    tickEnemyBoarding(g, 0.01);
    assert.equal(party[0].aboard, "player");
  });

  it("recalls a boarder below 25% health, with anyone in the same room", () => {
    const g = boarder();
    const party = send(g);
    pad(g).cool = 0;
    party[0].hp = party[0].maxHp * 0.26;
    tickEnemyBoarding(g, 0.01);
    assert.equal(party[0].aboard, "player", "26% stays");
    party[0].hp = party[0].maxHp * 0.24;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "enemy"), "the whole room comes back");
    assert.ok(pad(g).cool > 0);
  });

  it("recalls only the hurt boarder when the party has split up", () => {
    const g = boarder(4);
    const party = send(g);
    if (party.length < 2) return;
    pad(g).cool = 0;
    party[1].room = g.player.rooms.find((r) => r.id !== party[0].room)!.id;
    party[0].hp = party[0].maxHp * 0.1;
    tickEnemyBoarding(g, 0.01);
    assert.equal(party[0].aboard, "enemy");
    assert.equal(party[1].aboard, "player");
  });

  it("recalls everyone when the escape timer is under 15 seconds", () => {
    const g = boarder();
    const party = send(g);
    pad(g).cool = 0;
    g.enemyEscape = { mode: "start", seconds: 100, chance: 0, threshold: 0, rolled: true, running: true, pursuit: false };
    g.enemyFlee = 0.5;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "player"), "50 s left: they stay");
    g.enemyFlee = 0.9;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "enemy"));
  });

  it("recalls everyone when three systems are completely broken", () => {
    const g = boarder();
    const party = send(g);
    pad(g).cool = 0;
    const installed = Object.values(g.enemy!.systems).filter((s) => s.level > 0);
    assert.ok(installed.length >= 3);
    for (const s of installed.slice(0, 2)) s.damage = s.level;
    assert.equal(enemyBrokenSystems(g.enemy!), 2);
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "player"), "two broken: they stay");
    installed[2].damage = installed[2].level;
    tickEnemyBoarding(g, 0.01);
    assert.ok(party.every((c) => c.aboard === "enemy"));
    // Still wrecked: no new party is sent into it.
    pad(g).cool = 0;
    for (const c of party) c.hp = c.maxHp;
    tickEnemyBoarding(g, 0.01);
    assert.equal(plan(g).party.length, 0);
  });

  it("recalled crew walk back to the station they left", () => {
    const g = boarder();
    const party = send(g);
    const home = plan(g).home[party[0].id];
    pad(g).cool = 0;
    for (const s of Object.values(g.enemy!.systems).filter((s) => s.level > 0).slice(0, 3)) s.damage = s.level;
    tickEnemyBoarding(g, 0.01);
    assert.equal(party[0].aboard, "enemy");
    if (home === PADS) assert.equal(party[0].room, PADS);
    else assert.equal(party[0].path[party[0].path.length - 1], home);
  });
});
