import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFlarePulse, applyImpact, createGame, evasionPercent, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";

function laser(targetRoom: string, breachChance: number, at: "player" | "enemy"): Shot {
  return {
    id: "rp",
    kind: "laser",
    from: at === "enemy" ? "player" : "enemy",
    at,
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance,
    targetRoom,
    wait: 0,
    t: 1,
    duration: 1,
  };
}

function bareHull(g: Game, at: "player" | "enemy") {
  const ship = at === "enemy" ? g.enemy : g.player;
  assert.ok(ship);
  ship.shieldNow = 0;
  ship.zoltan = undefined;
  ship.systems.engines.power = 0;
  ship.hull = 20;
  ship.hullMax = 30;
  const room = ship.rooms.find((item) => item.system);
  assert.ok(room && room.system);
  ship.systems[room.system].damage = 0;
  assert.equal(evasionPercent(g, ship, at), 0);
  return { ship, room };
}

describe("Rock ship plating", () => {
  it("negates about 15 percent of hull hits, still hurts the system, and skips flares and sure breaches", () => {
    const g = createGame(1);
    g.sector = 3;
    g.augments = [];
    startCombat(g, "Rock ship");
    assert.equal(g.enemy?.faction, "rock");
    const { ship, room } = bareHull(g, "enemy");
    const system = room.system!;
    let held = 0;
    let systemWhileHeld = 0;
    const shots = 800;
    for (let seed = 1; seed <= shots; seed++) {
      g.seed = seed;
      ship.hull = 20;
      const before = ship.systems[system].damage;
      g.log = [];
      applyImpact(g, laser(room.id, 0, "enemy"));
      if (g.log.some((line) => line === "Rock Plating held the hull.")) {
        held += 1;
        assert.equal(ship.hull, 20);
        if (ship.systems[system].damage > before) systemWhileHeld += 1;
      } else {
        assert.equal(ship.hull, 19);
      }
    }
    assert.ok(held > shots * 0.1 && held < shots * 0.2, `held ${held} of ${shots}`);
    assert.ok(systemWhileHeld > 0);

    g.seed = 1;
    ship.hull = 20;
    g.log = [];
    applyImpact(g, laser(room.id, 1, "enemy"));
    assert.equal(g.log.some((line) => line === "Rock Plating held the hull."), false);
    assert.equal(ship.hull, 19);

    const pirate = createGame(2);
    pirate.sector = 3;
    pirate.augments = [];
    startCombat(pirate, "Rock pirate ship");
    assert.equal(pirate.enemy?.faction, "rock");
    assert.equal(pirate.enemy?.pirate, true);
    const pir = bareHull(pirate, "enemy");
    let pirateHeld = 0;
    for (let seed = 1; seed <= shots; seed++) {
      pirate.seed = seed;
      pir.ship.hull = 20;
      pirate.log = [];
      applyImpact(pirate, laser(pir.room.id, 0, "enemy"));
      if (pirate.log.some((line) => line === "Rock Plating held the hull.")) pirateHeld += 1;
    }
    assert.ok(pirateHeld > shots * 0.1 && pirateHeld < shots * 0.2, `pirate held ${pirateHeld}`);

    const rebel = createGame(3);
    startCombat(rebel, "Rebel ship");
    assert.notEqual(rebel.enemy?.faction, "rock");
    const reb = bareHull(rebel, "enemy");
    for (let seed = 1; seed <= 40; seed++) {
      rebel.seed = seed;
      reb.ship.hull = 20;
      rebel.log = [];
      applyImpact(rebel, laser(reb.room.id, 0, "enemy"));
      assert.equal(rebel.log.some((line) => line === "Rock Plating held the hull."), false);
      assert.equal(reb.ship.hull, 19);
    }

    const own = createGame(4);
    own.augments = ["keel"];
    startCombat(own, "Rebel ship");
    const player = bareHull(own, "player");
    let ownHeld = 0;
    for (let seed = 1; seed <= shots; seed++) {
      own.seed = seed;
      player.ship.hull = 20;
      own.log = [];
      applyImpact(own, laser(player.room.id, 0, "player"));
      if (own.log.some((line) => line === "Rock Plating held the hull.")) ownHeld += 1;
    }
    assert.ok(ownHeld > shots * 0.1 && ownHeld < shots * 0.2, `player held ${ownHeld}`);

    const flareHulls = (seed: number, keel: boolean, faction: string) => {
      const flare = createGame(1);
      flare.sector = 3;
      startCombat(flare, "Rock ship");
      flare.augments = keel ? ["keel"] : [];
      flare.enemy!.faction = faction;
      flare.player.hull = 40;
      flare.enemy!.hull = 40;
      flare.seed = seed;
      applyFlarePulse(flare);
      return [flare.player.hull, flare.enemy!.hull];
    };
    let dropped = false;
    for (let seed = 1; seed <= 40; seed++) {
      const withKeel = flareHulls(seed, true, "rock");
      assert.deepEqual(withKeel, flareHulls(seed, false, "rock"));
      assert.deepEqual(flareHulls(seed, false, "rock"), flareHulls(seed, false, "rebel"));
      if (withKeel[0] < 40 && withKeel[1] < 40) dropped = true;
    }
    assert.equal(dropped, true);
  });
});
