import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aidPlayerAsb,
  beginBoarding,
  commitJump,
  continueReward,
  createGame,
  startCombat,
  step,
} from "../sim.ts";
import type { Crew, Game } from "../types.ts";

function quietFight(g: Game) {
  for (const w of g.player.weapons) w.enabled = false;
  for (const w of g.enemy?.weapons ?? []) w.enabled = false;
  g.player.systems.engines.power = 0;
  if (g.enemy) g.enemy.systems.engines.power = 0;
  g.enemySurrender = null;
}

/** The next environment tick is due to pulse, flare, and fire. */
function dueNow(g: Game) {
  g.pulsarWait = 0.01;
  g.pulsarT = 0;
  g.pulsarWarned = true;
  g.flareWait = 0.01;
  g.flareT = 0;
  g.flareWarned = true;
  g.asbPhase = "shot";
  g.asbWait = 0.01;
  g.asbT = 0;
}

function plantBoarder(g: Game, room: string) {
  g.uid = (g.uid + 1) >>> 0;
  const c: Crew = {
    id: "u" + g.uid.toString(36),
    name: "Human",
    side: "enemy",
    aboard: "player",
    hp: 100,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 9999,
    tone: 3,
    kin: "human",
  };
  g.crew.push(c);
  return c;
}

describe("environmental hazards after the battle", () => {
  it("keeps the pulsar, the star, and the battery until the jump", () => {
    const g = createGame(11);
    startCombat(g, "scout");
    quietFight(g);
    g.pulsar = true;
    g.flare = true;
    g.asb = true;
    g.asbAim = "all";
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "reward");
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, true);
    assert.equal(g.asb, true);
    assert.equal(g.asbAim, "all");
    continueReward(g);
    assert.equal(g.phase, "map");
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, true);
    assert.equal(g.asb, true);
    dueNow(g);
    const hull = g.player.hull;
    step(g, 0.05);
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, true);
    assert.equal(g.asb, true);
    assert.equal(g.asbAim, "all");
    assert.ok(g.log.some((line) => line.startsWith("The pulsar ionizes")));
    assert.ok(g.log.some((line) => line.startsWith("A solar flare lights")));
    assert.ok(g.player.hull < hull);
    const artillery = g.shots.filter((s) => s.label === "Artillery");
    assert.equal(artillery.length, 1);
    assert.equal(artillery[0]!.at, undefined);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "empty";
    dest.flag = "";
    dest.col = 20;
    dest.resolved = true;
    g.fleet = 0;
    g.sector = 1;
    g.fuel = 3;
    g.player.systems.engines.power = 1;
    g.flee = 1;
    commitJump(g, dest.id);
    assert.equal(g.pulsar, false);
    assert.equal(g.flare, false);
    assert.equal(g.asb, false);
    assert.equal(g.asbAim, undefined);
  });

  it("keeps them when the enemy escapes", () => {
    const g = createGame(4);
    startCombat(g, "scout");
    quietFight(g);
    g.pulsar = true;
    g.flare = true;
    g.asb = true;
    g.asbAim = "player";
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = enemy.systems.engines.level;
    enemy.systems.pilot.damage = 0;
    const pilot = enemy.rooms.find((r) => r.system === "pilot");
    const crew = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(pilot && crew);
    crew.room = pilot.id;
    crew.aboard = "enemy";
    crew.path = [];
    g.enemyEscape = {
      mode: "start",
      seconds: 0.05,
      chance: 0,
      threshold: 0,
      rolled: true,
      running: true,
      pursuit: false,
    };
    g.enemyFlee = 0;
    step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, true);
    assert.equal(g.asb, true);
    assert.equal(g.asbAim, "player");
    dueNow(g);
    step(g, 0.05);
    assert.ok(g.log.some((line) => line.startsWith("The pulsar ionizes")));
    assert.ok(g.shots.some((s) => s.label === "Artillery" && s.at == null));
  });

  it("retires a friendly battery with the fight", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    quietFight(g);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    here.kind = "nebula";
    here.cleared = false;
    aidPlayerAsb(g);
    assert.equal(g.asb, true);
    g.asbPhase = "shot";
    g.asbWait = 0.01;
    g.asbT = 0;
    step(g, 0.05);
    const during = g.shots.find((s) => s.label === "Artillery");
    assert.equal(during?.at, "enemy");
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "reward");
    assert.equal(g.asb, false);
    continueReward(g);
    g.shots = [];
    step(g, 0.05);
    assert.equal(
      g.shots.some((s) => s.label === "Artillery"),
      false,
    );
  });

  it("keeps the planet-side battery after the boarders die", () => {
    const g = createGame(26);
    const boarder = plantBoarder(g, "p-sensors");
    beginBoarding(g, true);
    assert.equal(g.asb, true);
    g.flee = 0.4;
    const mate = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(mate);
    boarder.room = mate.room;
    boarder.hp = 0.2;
    for (let i = 0; i < 80 && g.phase === "combat"; i++) step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.asb, true);
    assert.ok(g.flee > 0.4 && g.flee < 1);
    g.asbPhase = "shot";
    g.asbWait = 0.01;
    g.asbT = 0;
    step(g, 0.05);
    assert.equal(g.asb, true);
    assert.ok(g.shots.some((s) => s.label === "Artillery" && s.at == null));
  });

  it("leaves the beacon hazard up between flagship stages", () => {
    const g = createGame(7);
    const boss = g.beacons.find((b) => b.kind === "exit");
    assert.ok(boss);
    boss.kind = "boss";
    g.here = boss.id;
    startCombat(g, "boss");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    g.pulsar = true;
    g.flare = true;
    g.asb = true;
    g.asbAim = "player";
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "reward");
    assert.equal(g.enemy, null);
    assert.equal(g.pulsar, true);
    assert.equal(g.flare, true);
    assert.equal(g.asb, true);
    assert.equal(g.asbAim, "player");
  });
});
