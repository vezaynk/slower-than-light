import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SECTOR_NAMES } from "../content.ts";
import {
  choose,
  chooseSector,
  commitJump,
  createGame,
  runScore,
  startCombat,
  step,
  upgrade,
  waitHere,
} from "../sim.ts";
import { stampEngiCache } from "./engi-cache.ts";
import { fleetToReach } from "./sector-map.ts";
import {
  citedAsb,
  citedAsbShot,
  citedBeaconCount,
  citedFleetAdvance,
  citedSector,
} from "./cited-sectors.ts";

function enterLastStand(seed = 1) {
  const g = createGame(seed, "PLAYER_SHIP_HARD", "normal");
  const from = g.route.find((n) => n.links.includes("sec-7"));
  assert.ok(from);
  g.sector = 7;
  g.phase = "map";
  g.sectorMap = true;
  g.routeHere = from.id;
  g.player.hull = 12;
  g.fuel = 4;
  g.missiles = 1;
  g.player.parts = 2;
  const scrap = g.scrap;
  chooseSector(g, "sec-7");
  return { g, scrap };
}

describe("Last Stand repair stations", () => {
  it("stamps three stations and does not grant their supplies or the entry bundle again", () => {
    const { g, scrap } = enterLastStand(4);
    assert.equal(g.sector, 8);
    assert.equal(g.sectorName, "The Last Stand");
    assert.equal(g.player.hull, 22);
    assert.equal(g.fuel, 14);
    assert.equal(g.missiles, 1);
    assert.equal(g.player.parts, 2);
    assert.equal(g.scrap, scrap);

    const repairs = g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION");
    assert.equal(repairs.length, 3);
    for (const b of repairs) {
      assert.equal(b.name, "Federation Repair Station");
      assert.equal(b.kind, "event");
      assert.equal(b.asteroid, false);
      assert.equal(b.resolved, false);
    }
    assert.equal(
      g.beacons.some((b) => b.kind === "store" && b.flag === "BOSS_REPAIR_STATION"),
      false,
    );
    assert.equal(
      g.beacons.some((b) => b.kind === "start" && b.flag === "BOSS_REPAIR_STATION"),
      false,
    );
    assert.ok(g.beacons.some((b) => b.kind === "boss" && b.name === "Flagship"));
    assert.equal(g.beacons.filter((b) => b.kind === "store").length >= 1, true);

    citedSector(g);
    assert.equal(g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION").length, 3);
    assert.equal(g.player.hull, 22);
    assert.equal(g.fuel, 14);
  });

  it("does not stamp any other sector name, and it leaves an Engi cache in place", () => {
    const g = createGame(2);
    citedSector(g);
    assert.equal(
      g.beacons.some((b) => b.flag === "BOSS_REPAIR_STATION"),
      false,
    );
    assert.equal(g.sectorId, "STANDARD_SPACE");

    g.sectorId = "ENGI_HOME";

    g.sectorName = "Engi Homeworlds";
    stampEngiCache(g);
    const cache = g.beacons.find((b) => b.flag === "engi-cache");
    assert.ok(cache);
    citedSector(g);
    assert.equal(cache.flag, "engi-cache");
    assert.equal(cache.name, "Engi cache");
    assert.equal(
      g.beacons.some((b) => b.flag === "BOSS_REPAIR_STATION"),
      false,
    );
  });

  it("will not overwrite the cache, the exit, or invent a station the map does not have", () => {
    const g = createGame(6);
    g.sectorId = "FINAL";
    g.sectorName = "The Last Stand";
    const cache = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "store",
    );
    assert.ok(cache);
    cache.flag = "engi-cache";
    const exit = g.beacons.find((b) => b.kind === "exit");
    const start = g.beacons.find((b) => b.kind === "start");
    const store = g.beacons.find((b) => b.kind === "store");
    citedSector(g);
    assert.equal(cache.flag, "engi-cache");
    assert.equal(exit?.kind, "exit");
    assert.notEqual(exit?.flag, "BOSS_REPAIR_STATION");
    assert.notEqual(start?.flag, "BOSS_REPAIR_STATION");
    assert.notEqual(store?.flag, "BOSS_REPAIR_STATION");
    assert.equal(g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION").length, 3);

    const thin = createGame(6);
    thin.sectorId = "FINAL";
    thin.sectorName = "The Last Stand";
    thin.beacons = thin.beacons.filter(
      (b) => b.kind === "start" || b.kind === "exit" || b.kind === "store",
    );
    citedSector(thin);
    assert.equal(
      thin.beacons.some((b) => b.flag === "BOSS_REPAIR_STATION"),
      false,
    );
  });

  it("does not pay the station when the ship jumps there", () => {
    const { g } = enterLastStand(8);
    const here = g.beacons.find((b) => b.id === g.here);
    const dest = g.beacons.find((b) => b.flag === "BOSS_REPAIR_STATION");
    assert.ok(here && dest);
    if (!here.links.includes(dest.id)) here.links.push(dest.id);
    const hull = g.player.hull;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const scrap = g.scrap;
    commitJump(g, dest.id);
    assert.equal(g.here, dest.id);
    assert.equal(g.event?.title, "Federation Repair Station");
    assert.equal(g.player.hull, hull);
    assert.equal(g.fuel, fuel - 1);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.scrap, scrap);
    assert.equal(dest.resolved, false);
  });

  it("pays 15 hull, scrap 22–44, 5 fuel, 4 missiles, and 5 drone parts once", () => {
    const { g } = enterLastStand(8);
    const here = g.beacons.find((b) => b.id === g.here);
    const dest = g.beacons.find((b) => b.flag === "BOSS_REPAIR_STATION");
    assert.ok(here && dest);
    if (!here.links.includes(dest.id)) here.links.push(dest.id);
    g.player.hull = 10;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const scrap = g.scrap;
    commitJump(g, dest.id);
    choose(g, "BOSS_REPAIR_STATION");
    assert.equal(g.player.hull, Math.min(g.player.hullMax, 25));
    const gained = g.scrap - scrap;
    assert.ok(gained >= 22 && gained <= 44, String(gained));
    assert.equal(g.fuel, fuel - 1 + 5);
    assert.equal(g.missiles, missiles + 4);
    assert.equal(g.player.parts, parts + 5);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ack");
    assert.equal(g.event?.body, `Federation Repair Station: ${gained} scrap.`);
    assert.equal(g.log.includes(`Federation Repair Station: ${gained} scrap.`), false);
    choose(g, "ack");
    assert.equal(dest.resolved, true);
    assert.equal(g.phase, "map");
    choose(g, "BOSS_REPAIR_STATION");
    assert.equal(g.scrap - scrap, gained);
    assert.equal(g.fuel, fuel - 1 + 5);
    assert.equal(g.player.hull, Math.min(g.player.hullMax, 25));
  });
});

describe("score beacons", () => {
  it("returns null so rebel columns do not rewrite beaconsVisited", () => {
    const g = createGame(1, undefined, "easy");
    g.scrapCollected = 10;
    g.beaconsVisited = 1;
    g.kills = 2;
    g.fleet = 4;
    for (const b of g.beacons) {
      if (b.col < g.fleet) b.visited = true;
    }
    assert.equal(citedBeaconCount(g), null);
    assert.equal(runScore(g), 10 + 10 + 40);
    g.beaconsVisited = 0;
    g.scrapCollected = 0;
    g.kills = 0;
    assert.equal(citedBeaconCount(g), null);
    assert.equal(runScore(g), 0);
  });
});

describe("fleet advance and the anti-ship battery", () => {
  it("halves a nebula beacon outside a nebula sector, and takes a fifth off inside one", () => {
    const g = createGame(1);
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.5);
    assert.equal(citedFleetAdvance(g, { kind: "empty" }), 1);
    g.sectorId = "SLUG_SECTOR";
    g.sectorName = "Slug Controlled Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.8);
    g.sectorId = "NEBULA_SECTOR";
    g.sectorName = "Uncharted Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.8);
    g.sectorId = "SLUG_HOME";
    g.sectorName = "Slug Home Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "empty" }), 1);

    g.fuel = 5;
    g.fleet = 2;
    g.phase = "map";
    g.sectorId = "CIVILIAN_SECTOR";
    g.sectorName = "Civilian Sector";
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    here.kind = "nebula";
    const before = g.fleet;
    waitHere(g);
    assert.equal(g.fleet, before + 0.5);

    const dest = g.beacons.find((b) => b.id !== g.here);
    assert.ok(dest);
    dest.kind = "nebula";
    if (!here.links.includes(dest.id)) here.links.push(dest.id);
    g.sectorId = "SLUG_HOME";
    g.sectorName = "Slug Home Nebula";
    const at = g.fleet;
    commitJump(g, dest.id);
    assert.equal(g.fleet, at + 0.8);
  });

  it("arms the battery on an overtaken beacon, not on a nebula, and not on an Easy exit", () => {
    const shot = citedAsbShot();
    assert.equal(shot.damage, 3);
    assert.equal(shot.breachChance, 1);
    assert.equal(shot.fireChance, 0);

    const g = createGame(1, "PLAYER_SHIP_HARD", "normal");
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    g.fleet = fleetToReach(g, here);
    here.kind = "empty";
    assert.equal(citedAsb(g, here), true);
    here.kind = "nebula";
    assert.equal(citedAsb(g, here), false);
    g.difficulty = "easy";
    here.kind = "exit";
    assert.equal(citedAsb(g, here), false);
    g.difficulty = "hard";
    here.kind = "exit";
    assert.equal(citedAsb(g, here), true);

    here.kind = "nebula";
    g.fleet += 1;
    startCombat(g, "scout");
    assert.equal(g.asb, false);
  });

  it("removes the nebula when an out-of-fuel wait is overtaken, and keeps the storm on a jump", () => {
    const waiting = createGame(4);
    waiting.phase = "map";
    waiting.fuel = 0;
    const spot = waiting.beacons.find((beacon) => beacon.id === waiting.here);
    assert.ok(spot);
    // A wait in a nebula moves the fleet half a step (32px), onto this beacon.
    waiting.fleet = fleetToReach(waiting, spot) - 0.5;
    spot.kind = "nebula";
    spot.resolved = false;
    waitHere(waiting);
    assert.equal(spot.cleared, true);
    assert.equal(waiting.player.storm, undefined);
    assert.equal(waiting.asb, true);
    assert.equal(waiting.phase, "combat");
    assert.equal(waiting.pending, "dive:4");

    const fueled = createGame(6);
    fueled.phase = "map";
    fueled.fuel = 3;
    const home = fueled.beacons.find((beacon) => beacon.id === fueled.here);
    assert.ok(home);
    fueled.fleet = fleetToReach(fueled, home) - 0.5;
    home.kind = "nebula";
    const hull = fueled.player.hull;
    waitHere(fueled);
    assert.equal(home.cleared, undefined);
    assert.equal(fueled.player.storm, true);
    assert.equal(fueled.phase, "map");
    assert.equal(fueled.player.hull, hull);

    const jumped = createGame(5);
    jumped.phase = "map";
    jumped.fuel = 1;
    const from = jumped.beacons.find((beacon) => beacon.id === jumped.here);
    const dest = jumped.beacons.find((beacon) => beacon.id !== jumped.here);
    assert.ok(from && dest);
    jumped.fleet = fleetToReach(jumped, dest);
    dest.kind = "nebula";
    dest.resolved = false;
    if (!from.links.includes(dest.id)) from.links.push(dest.id);
    commitJump(jumped, dest.id);
    assert.equal(jumped.fuel, 0);
    assert.equal(dest.cleared, undefined);
    assert.equal(jumped.player.storm, true);
    assert.equal(jumped.asb, false);
  });

  it("runs the elite for 90 seconds after a last-fuel jump into an overtaken nebula", () => {
    const jumpTo = (seed: number, kind: "nebula" | "exit" | "empty", fuel: number) => {
      const g = createGame(seed);
      g.phase = "map";
      g.fuel = fuel;
      const from = g.beacons.find((beacon) => beacon.id === g.here);
      const dest = g.beacons.find((beacon) => beacon.id !== g.here);
      assert.ok(from && dest);
      g.fleet = fleetToReach(g, dest);
      dest.kind = kind;
      dest.resolved = false;
      if (!from.links.includes(dest.id)) from.links.push(dest.id);
      commitJump(g, dest.id);
      return g;
    };
    const nebula = jumpTo(8, "nebula", 1);
    assert.equal(nebula.fuel, 0);
    assert.equal(nebula.player.storm, true);
    assert.equal(nebula.asb, false);
    assert.equal(nebula.enemyEscape?.mode, "start");
    assert.equal(nebula.enemyEscape?.seconds, 90);

    const fueled = jumpTo(9, "nebula", 3);
    assert.equal(fueled.fuel, 2);
    assert.equal(fueled.enemyEscape?.mode, "never");

    const empty = jumpTo(10, "empty", 1);
    assert.equal(empty.enemyEscape?.mode, "never");

    const exit = jumpTo(11, "exit", 1);
    assert.equal(exit.player.storm, undefined);
    assert.equal(exit.enemyEscape?.mode, "start");
    assert.equal(exit.enemyEscape?.seconds, 90);
  });

  it("warns 15–20s after an overtaken fight, then waits 5–10s for the real shot", () => {
    const g = createGame(2, "PLAYER_SHIP_HARD", "normal");
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    here.kind = "empty";
    g.fleet = fleetToReach(g, here);
    startCombat(g, "scout");
    assert.equal(g.asb, true);
    assert.equal(g.asbPhase, "warn");
    assert.equal(g.asbT, 0);
    assert.ok(g.asbWait >= 15 && g.asbWait < 20);
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy!.weapons) w.enabled = false;
    g.player.hull = 40;
    g.enemy!.hull = 40;
    let t = 0;
    while (g.asbPhase === "warn" && g.phase === "combat" && t < 21) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.phase, "combat");
    assert.equal(g.asbPhase, "shot");
    assert.ok(t >= 15 && t < 20.1);
    assert.equal(g.log[0], "The Fleet's Anti-Ship Batteries are targeting you.");
    assert.ok(g.asbWait >= 5 && g.asbWait < 10);
    assert.equal(
      g.shots.some((s) => s.label === "Artillery"),
      false,
    );
  });
});

describe("ship info screen while in danger", () => {
  it("refuses a reactor upgrade in a fight, a hazard, or with boarders, and still allows a storm", () => {
    const g = createGame(3);
    g.scrap = 200;
    g.player.reactor = 8;
    g.player.systems.engines.level = 1;
    upgrade(g, "reactor");
    assert.equal(g.player.reactor, 9);
    assert.equal(g.scrap, 180);

    const refuse = () => {
      const scrap = g.scrap;
      const reactor = g.player.reactor;
      const engines = g.player.systems.engines.level;
      upgrade(g, "reactor");
      upgrade(g, "engines");
      assert.equal(g.player.reactor, reactor);
      assert.equal(g.player.systems.engines.level, engines);
      assert.equal(g.scrap, scrap);
    };

    g.phase = "combat";
    refuse();
    g.shipSheet = true;
    step(g, 0.05);
    assert.equal(g.shipSheet, false);
    g.phase = "map";

    g.player.storm = true;
    g.shipSheet = true;
    upgrade(g, "reactor");
    step(g, 0.05);
    assert.equal(g.player.reactor, 10);
    assert.equal(g.shipSheet, true);
    g.player.storm = undefined;

    for (const flag of ["asteroid", "pulsar", "flare", "asb"] as const) {
      g[flag] = true;
      g.shipSheet = true;
      refuse();
      step(g, 0.05);
      assert.equal(g.shipSheet, false);
      g[flag] = false;
    }

    const mate = g.crew.find((c) => c.side === "player");
    assert.ok(mate);
    g.crew.push({ ...mate, id: "boarder", side: "enemy", aboard: "player", hp: 10 });
    g.shipSheet = true;
    refuse();
    // The boarder is not stepped: that fight can spend hull. The screen still closes.
    step(g, 0);
    assert.equal(g.shipSheet, false);
  });

  it("sends asteroids at the enemy ship too, in turn with the player's (xftl doc/asteroids)", () => {
    const g = createGame(12);
    startCombat(g, "scout", true);
    assert.ok(g.enemy);
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy.weapons) w.enabled = false;
    g.player.systems.engines.power = 0;
    g.player.systems.shields.power = 0;
    // The enemy's ship AI repowers anything switched off (extras/ship-ai.ts), so its engines and shields are removed.
    g.enemy.systems.engines.level = 0;
    g.enemy.systems.shields.level = 0;
    g.player.shieldNow = 0;
    g.enemy.shieldNow = 0;
    g.player.zoltan = undefined;
    g.enemy.zoltan = undefined;
    g.player.kits.drones = undefined;
    g.enemy.kits.drones = undefined;
    const playerHull = g.player.hull;
    const enemyHull = g.enemy.hull;
    g.asteroidPhase = "wave1";
    g.asteroidPhaseLeft = 100;
    for (let i = 0; i < 2; i++) {
      g.asteroidWait = 0.05;
      g.asteroidT = 0;
      step(g, 0.05);
    }
    const rocks = g.shots.filter((s) => s.label === "Rock");
    assert.equal(rocks.length, 2);
    const theirs = rocks.find((s) => s.at === "enemy");
    const ours = rocks.find((s) => s.at === "player");
    assert.ok(theirs && ours);
    assert.ok(g.enemy.rooms.some((r) => r.id === theirs.targetRoom));
    assert.ok(g.player.rooms.some((r) => r.id === ours.targetRoom));
    for (let t = 0; t < 1.2 && g.phase === "combat"; t += 0.05) step(g, 0.05);
    assert.equal(g.player.hull, playerHull - 1);
    assert.equal(g.enemy.hull, enemyHull - 1);
  });
});

describe("sector names left in place", () => {
  it("does not replace the invented sector-name list", () => {
    assert.deepEqual(SECTOR_NAMES, [
      "Cinder Reach",
      "Glass Margin",
      "Salt Lattice",
      "Red Kiln",
      "Quiet Arm",
      "Broken Mile",
      "Night Freight",
      "Shut Gate",
    ]);
  });
});
