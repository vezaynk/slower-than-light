import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import type { DroneUnit, Game, Kit, Shot } from "../types.ts";
import {
  ACQUIRE_S,
  DRONE_BLAST_S,
  DRONE_LABEL,
  ION_STUN_PER,
  LINE_OF_FIRE,
  MARK2_OWN_LASER,
  REDEPLOY_S,
  ROCK_HIT,
  deploy,
  enemyDefenseIntercept,
  shotHitsDrone,
  tickSwarm,
} from "./swarm.ts";

/** A quiet fight: no guns, no rocks, no fleet. */
function quiet(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.charge = 0;
    w.target = null;
  }
  return g;
}

function fleet(g: Game, loadout: string[], level = 8) {
  g.enemy!.kits.swarm = { id: "swarm", level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0, loadout };
  g.enemy!.parts = 8;
  tickSwarm(g, 0.05);
  return g.enemy!.kits.swarm.drones!;
}

function mine(g: Game, kind: string): Kit {
  g.player.kits.swarm = { id: "swarm", level: 3, power: 3, left: 0, cool: 0, target: null, on: false, aux: 0 };
  g.player.parts = 5;
  assert.equal(deploy(g, kind), true);
  return g.player.kits.swarm;
}

function shot(g: Game, over: Partial<Shot>): Shot {
  const target = over.from === "player" ? g.enemy! : g.player;
  return {
    id: "t" + Math.random(),
    kind: "laser",
    from: "enemy",
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: target.rooms[0].id,
    wait: 0,
    t: 0,
    duration: 0.7,
    ...over,
  };
}

/** Fire `n` copies of a shot at fresh setups; count how many a drone took. */
function rate(n: number, setup: (g: Game) => void, make: (g: Game) => Shot): number {
  let hits = 0;
  for (let seed = 1; seed <= n; seed++) {
    const g = quiet(seed);
    setup(g);
    if (shotHitsDrone(g, make(g))) hits += 1;
  }
  return hits / n;
}

describe("shots in the line of fire (Drone Control, Overview)", () => {
  it("an enemy shot sometimes takes out your defense drone, and the drone then waits 10 s", () => {
    let seen = 0;
    for (let seed = 1; seed <= 200 && !seen; seed++) {
      const g = quiet(seed);
      const kit = mine(g, "ward");
      if (!shotHitsDrone(g, shot(g, { from: "enemy" }))) continue;
      seen += 1;
      assert.equal(kit.on, false);
      assert.equal(kit.lost, REDEPLOY_S);
      assert.equal(g.droneBlasts?.[0]?.side, "player");
      assert.equal(g.droneBlasts?.[0]?.at, "player-orbit");
      assert.equal(g.droneBlasts?.[0]?.result, "down");
    }
    assert.equal(seen, 1);
    const r = rate(600, (g) => void mine(g, "ward"), (g) => shot(g, { from: "enemy" }));
    assert.ok(Math.abs(r - LINE_OF_FIRE) < 0.03, String(r));
  });

  it("your weapons never hit your own drones", () => {
    assert.equal(rate(200, (g) => void mine(g, "striker"), (g) => shot(g, { from: "player" })), 0);
    assert.equal(rate(200, (g) => void mine(g, "ward"), (g) => shot(g, { from: "player" })), 0);
  });

  it("their outgoing shots cross your combat drone orbiting them, and yours cross theirs orbiting you", () => {
    const r1 = rate(400, (g) => void mine(g, "striker"), (g) => shot(g, { from: "enemy" }));
    assert.ok(r1 > 0 && r1 < 0.12, String(r1));
    const r2 = rate(400, (g) => void fleet(g, ["striker"], 2), (g) => shot(g, { from: "player" }));
    assert.ok(r2 > 0 && r2 < 0.12, String(r2));
  });

  it("a drone's own shot starts beside the target, so it never crosses drones round the far hull", () => {
    // Their combat drone orbits the Lark; your striker's laser leaves from orbit round them.
    assert.equal(rate(300, (g) => void fleet(g, ["striker"], 2), (g) => shot(g, { from: "player", label: "swarm" })), 0);
    // Their defense drone round their own hull is in its way.
    assert.ok(rate(300, (g) => void fleet(g, ["ward"], 2), (g) => shot(g, { from: "player", label: "swarm" })) > 0);
  });

  it("beams, bombs, and ASB shots never collide (Weapons, lead)", () => {
    const setup = (g: Game) => {
      mine(g, "ward");
      fleet(g, ["striker", "ward"]);
    };
    assert.equal(rate(200, setup, (g) => shot(g, { kind: "beam" })), 0);
    assert.equal(rate(200, setup, (g) => shot(g, { kind: "bomb" })), 0);
    assert.equal(rate(200, setup, (g) => shot(g, { kind: "missile", from: "env" })), 0);
  });

  it("an ion shot stuns an enemy drone 5 s per ion instead of destroying it", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = quiet(seed);
      const [ward] = fleet(g, ["ward"], 2);
      if (!shotHitsDrone(g, shot(g, { from: "player", kind: "ion", damage: 0, ion: 2 }))) continue;
      assert.equal(ward.alive, true);
      assert.equal(ward.stun, 2 * ION_STUN_PER);
      assert.equal(ward.ionT, 0);
      assert.equal(g.droneBlasts?.[0]?.result, "ion");
      return;
    }
    assert.fail("no ion hit in 300 seeds");
  });

  it("an ion-stunned player drone can burn out, which starts the redeploy delay", () => {
    let burnt = 0;
    let survived = 0;
    for (let seed = 1; seed <= 400 && (burnt < 2 || survived < 2); seed++) {
      const g = quiet(seed);
      const kit = mine(g, "ward");
      if (!shotHitsDrone(g, shot(g, { from: "enemy", kind: "ion", damage: 0, ion: 1 }))) continue;
      assert.equal(kit.on, true);
      assert.equal(kit.stun, ION_STUN_PER);
      for (let i = 0; i < 120; i++) tickSwarm(g, 0.05);
      if (!kit.on) {
        burnt += 1;
        assert.ok((kit.lost ?? 0) > 0);
      } else {
        survived += 1;
        assert.equal(kit.ionT, undefined);
      }
    }
    assert.ok(burnt > 0 && survived > 0, `${burnt} ${survived}`);
  });

  it("stepShots spends a shot a drone took: the hull is untouched", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = quiet(seed);
      mine(g, "ward2");
      g.player.kits.swarm!.cool = 99; // keep the defense drone from shooting the laser itself
      g.player.kits.swarm!.aux = 99;
      g.player.systems.shields.power = 0;
      g.player.shieldNow = 0;
      const hull = g.player.hull;
      g.shots.push(shot(g, { from: "enemy", t: 0.99, duration: 1 }));
      step(g, 0.05);
      if (!g.droneBlasts?.length) continue;
      assert.equal(g.player.hull, hull);
      assert.equal(g.shots.length, 0);
      for (let i = 0; i < 30; i++) step(g, 0.05);
      assert.equal(g.droneBlasts.length, 0, `blasts clear after ${DRONE_BLAST_S}s`);
      return;
    }
    assert.fail("no hit in 300 seeds");
  });
});

describe("asteroids (Drone Control, Overview: \"destroyed by colliding with asteroids\")", () => {
  const rock = (g: Game) => shot(g, { from: "env", label: "Rock" });

  it("a rock can smash any drone orbiting the Lark, either side's", () => {
    const own = rate(600, (g) => void mine(g, "ward"), rock);
    assert.ok(Math.abs(own - ROCK_HIT) < 0.04, String(own));
    let theirs = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const g = quiet(seed);
      const [striker] = fleet(g, ["striker"], 2);
      if (shotHitsDrone(g, rock(g))) {
        theirs += 1;
        assert.equal(striker.alive, false);
        assert.equal(striker.cool, REDEPLOY_S);
        assert.equal(g.droneBlasts?.[0]?.by, "rock");
      }
    }
    assert.ok(theirs > 0);
  });

  it("rocks fly at the Lark only, so drones round the enemy hull are safe", () => {
    assert.equal(rate(300, (g) => void mine(g, "striker"), rock), 0);
    assert.equal(rate(300, (g) => void fleet(g, ["ward"], 2), rock), 0);
  });
});

describe("player redeploy delay (Overview: \"10 second delay before it can be deployed again\")", () => {
  it("refuses for 10 s after a loss, then spends another part", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = quiet(seed);
      const kit = mine(g, "ward");
      if (!shotHitsDrone(g, shot(g, { from: "enemy" }))) continue;
      const parts = g.player.parts;
      assert.equal(deploy(g, "ward"), false);
      assert.equal(deploy(g, "striker"), false);
      for (let t = 0; t < REDEPLOY_S - 0.5; t += 0.5) tickSwarm(g, 0.5);
      assert.equal(deploy(g, "ward"), false);
      tickSwarm(g, 0.6);
      assert.equal(kit.lost, 0);
      assert.equal(deploy(g, "ward"), true);
      assert.equal(g.player.parts, parts - 1);
      return;
    }
    assert.fail("no hit in 300 seeds");
  });
});

describe("stray defense fire (Combat Drones (offensive drones))", () => {
  it("their Defense Drone Mark II shooting your combat drone's laser sometimes destroys your drone", () => {
    let killed = 0;
    const n = 400;
    for (let seed = 1; seed <= n; seed++) {
      const g = quiet(seed);
      const kit = mine(g, "striker");
      fleet(g, ["ward2"], 3);
      tickSwarm(g, ACQUIRE_S);
      assert.equal(enemyDefenseIntercept(g, { kind: "laser", from: "player", label: "swarm" }), true);
      if (!kit.on) {
        killed += 1;
        assert.equal(kit.lost, REDEPLOY_S);
      }
    }
    assert.ok(Math.abs(killed / n - MARK2_OWN_LASER) < 0.05, String(killed / n));
  });

  it("your Mark II shooting their combat drone's laser can destroy that drone", () => {
    let killed = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const g = quiet(seed);
      const [striker] = fleet(g, ["striker"], 2) as DroneUnit[];
      const kit = mine(g, "ward2");
      kit.cool = 0;
      kit.aux = 0;
      const s = shot(g, { from: "enemy", label: DRONE_LABEL + striker.id, t: 0.99, duration: 1 });
      g.shots = [s];
      step(g, 0.05);
      if (!striker.alive) killed += 1;
    }
    assert.ok(killed > 0);
  });
});
