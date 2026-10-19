import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aim,
  armWeapon,
  buy,
  choose,
  chooseSector,
  clearSave,
  commitJump,
  createGame,
  loadGame,
  lockdown,
  saveGame,
  startCombat,
  step,
  zoltanBars,
} from "./sim.ts";
import { SECTOR_NAMES } from "./content.ts";
import { sectorIdOf } from "./sector-ids.ts";
import type { Game } from "./types.ts";
import { citedSell, citedSellQuote } from "./wiki/cited-stores.ts";
import { citedEvent } from "./wiki/cited-events.ts";
import { FLAGSHIP_PHASES } from "./wiki/flagship.ts";
import { ACCEPT_ID, joinCrew } from "./wiki/surrender.ts";
import {
  augmentDef,
  crewDef,
  droneDef,
  hullDef,
  sectorDef,
  storeDef,
  systemDef,
  weaponDef,
} from "@stl/pack";

/**
 * The manual checks left open on the pack milestones, played as seeded Kestrel runs.
 * Store seed 8 is one jump onto the sector's store. That shelf carries fuel, a Human,
 * Automated Re-loader, Anti-Combat Drone, Drone Control, and Mind Control together.
 */

const STORE_SEED = 8;

function kestrel(seed: number): Game {
  return createGame(seed, "PLAYER_SHIP_HARD");
}

function visitStore(seed: number): Game {
  const g = kestrel(seed);
  const store = g.beacons.find((b) => b.kind === "store");
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(store);
  assert.ok(here);
  if (!here.links.includes(store.id)) here.links.push(store.id);
  g.fuel = 20;
  g.scrap = 800;
  commitJump(g, store.id);
  assert.equal(g.phase, "store");
  return g;
}

function stock(g: Game, id: string) {
  const item = g.stock?.find((row) => row.id === id);
  assert.ok(item, id);
  return item;
}

function pay(g: Game, id: string, cost: number) {
  const scrap = g.scrap;
  buy(g, id);
  assert.equal(g.scrap, scrap - cost, id);
}

describe("a seeded Kestrel run", () => {
  it("starts The Kestrel with the campaign guns, crew, and reactor", () => {
    const g = kestrel(2);
    const hull = hullDef("PLAYER_SHIP_HARD");
    assert.ok(hull);
    assert.equal(hull.name, "The Kestrel");
    assert.equal(g.player.name, hull.name);
    assert.equal(hull.reactor, 8);
    assert.equal(g.player.reactor, hull.reactor);
    assert.equal(g.fuel, 16);
    assert.equal(g.missiles, 8);
    assert.equal(g.player.parts, 2);
    assert.equal(g.scrap, 10);
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      ["LASER_BURST_3", "MISSILES_2_PLAYER"],
    );
    assert.deepEqual(
      g.player.weapons.map((w) => weaponDef(w.defId)?.name),
      ["Burst Laser II", "Artemis Missiles"],
    );
    const crew = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(
      crew.map((c) => ({ kin: c.kin, room: c.room, hp: c.hp })),
      [
        { kin: "human", room: "p-pilot", hp: crewDef("human").hp },
        { kin: "human", room: "p-engines", hp: crewDef("human").hp },
        { kin: "human", room: "p-weapons", hp: crewDef("human").hp },
      ],
    );
    assert.equal(g.player.systems.shields.level, 2);
    assert.equal(g.player.systems.shields.power, 2);
    assert.equal(g.player.systems.engines.level, 2);
    // FTL's starting power: shields full, one bar for every other reactor system, the weapon system off.
    assert.equal(g.player.systems.engines.power, 1);
    assert.equal(g.player.systems.oxygen.level, 1);
    assert.equal(g.player.systems.oxygen.power, 1);
    assert.equal(g.player.systems.medbay.level, 1);
    assert.equal(g.player.systems.medbay.power, 1);
    assert.equal(g.player.systems.weapons.level, 3);
    assert.equal(g.player.systems.weapons.power, 0);
    assert.deepEqual(
      g.player.weapons.map((w) => w.enabled),
      [false, false],
    );
    assert.equal(g.player.systems.sensors.level, 1);
    assert.equal(g.player.systems.sensors.power, 1);
    assert.equal(g.player.systems.pilot.level, 1);
    assert.equal(g.player.systems.pilot.power, 1);
    assert.equal(g.player.systems.doors.level, 1);
    assert.equal(g.player.systems.doors.power, 1);
  });

  it("opens the chart on STANDARD_SPACE, under that sector's own title", () => {
    const g = kestrel(3);
    assert.equal(g.sectorId, "STANDARD_SPACE");
    assert.equal(g.sectorName, sectorDef("STANDARD_SPACE")?.name);
    assert.equal(SECTOR_NAMES.includes(g.sectorName), false);
    assert.equal(sectorIdOf("Civilian (Starting) Sector"), "STANDARD_SPACE");
    assert.equal(sectorIdOf("STANDARD_SPACE"), "STANDARD_SPACE");
    assert.equal(sectorIdOf("Cinder Reach"), undefined);
    assert.equal(g.routeHere, "sec-0");
    assert.equal(g.route[0]?.id, "sec-0");
    assert.equal(g.route[0]?.sector, "STANDARD_SPACE");
    const exit = g.beacons.find((b) => b.kind === "exit");
    assert.ok(exit);
    g.here = exit.id;
    g.phase = "map";
    g.event = null;
    choose(g, "exit-leave");
    assert.equal(g.sectorMap, true);
    assert.equal(g.phase, "map");
    assert.equal(g.sector, 1);
    assert.equal(g.routeHere, "sec-0");
    assert.equal(g.route.find((n) => n.id === g.routeHere)?.sector, "STANDARD_SPACE");
  });

  it("jumps to a sector id stored as a title, and stays put on an invented name", () => {
    const g = kestrel(4);
    const here = g.route.find((n) => n.id === g.routeHere);
    assert.ok(here);
    const dest = g.route.find((n) => n.id === here.links[0]);
    assert.ok(dest);
    const title = dest.name;
    const id = dest.sector;
    dest.sector = "";
    g.phase = "map";
    g.sectorMap = true;
    chooseSector(g, dest.id);
    assert.equal(g.sector, 2);
    assert.equal(g.sectorId, id);
    assert.equal(g.sectorName, title);
    assert.equal(dest.sector, id);
    assert.equal(SECTOR_NAMES.includes(g.sectorName), false);

    const stuck = kestrel(5);
    const stay = stuck.route.find((n) => n.id === stuck.routeHere);
    assert.ok(stay);
    const invented = stuck.route.find((n) => n.id === stay.links[0]);
    assert.ok(invented);
    invented.sector = "";
    invented.name = "Cinder Reach";
    stuck.phase = "map";
    stuck.sectorMap = true;
    chooseSector(stuck, invented.id);
    assert.equal(stuck.sectorMap, true);
    assert.equal(stuck.sector, 1);
    assert.equal(stuck.sectorId, "STANDARD_SPACE");
    assert.equal(stuck.routeHere, stay.id);
    assert.equal(invented.sector, "");
  });

  it("fills sector ids from the archive when a save has only titles", () => {
    const g = kestrel(5);
    const mids = g.route.filter((n) => n.col === 1);
    assert.equal(mids.length, 2);
    const start = g.route.find((n) => n.id === "sec-0");
    const last = g.route.find((n) => n.id === "sec-7");
    assert.ok(start && last);
    g.sector = 3;
    g.sectorId = "";
    g.sectorName = "Cinder Reach";
    g.routeHere = mids[0].id;
    mids[0].sector = "";
    mids[0].name = "Engi Homeworlds";
    mids[1].sector = "";
    mids[1].name = "Cinder Reach";
    start.sector = "";
    start.name = "Civilian Sector";
    last.sector = "";
    last.name = "Shut Gate";

    const mem = new Map<string, string>();
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => void mem.set(key, value),
        removeItem: (key: string) => void mem.delete(key),
      },
    });
    try {
      saveGame(g);
      const loaded = loadGame();
      assert.ok(loaded);
      assert.equal(loaded.sectorId, "ENGI_HOME");
      assert.equal(loaded.sectorName, "Engi Homeworlds");
      assert.equal(loaded.route.find((n) => n.id === "sec-0")?.sector, "STANDARD_SPACE");
      assert.equal(
        loaded.route.find((n) => n.id === "sec-0")?.name,
        sectorDef("STANDARD_SPACE")?.name,
      );
      assert.equal(loaded.route.find((n) => n.id === "sec-7")?.sector, "FINAL");
      assert.equal(loaded.route.find((n) => n.id === "sec-7")?.name, "The Last Stand");
      assert.equal(loaded.route.find((n) => n.id === mids[0].id)?.sector, "ENGI_HOME");
      assert.equal(loaded.route.find((n) => n.id === mids[1].id)?.sector, "");
      assert.equal(loaded.route.find((n) => n.id === mids[1].id)?.name, "Cinder Reach");

      clearSave();
      g.sector = 1;
      g.sectorId = "";
      g.sectorName = "Cinder Reach";
      g.crystalRestart = true;
      saveGame(g);
      const restarted = loadGame();
      assert.ok(restarted);
      assert.equal(restarted.sectorId, "CIVILIAN_SECTOR");
      assert.equal(restarted.sectorName, sectorDef("CIVILIAN_SECTOR")?.name);
    } finally {
      clearSave();
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  it("counts one Zoltan bar, coats a Crystal lockdown, and fires the fitted laser", () => {
    const g = kestrel(6);
    const reactor = g.player.reactor;
    const shieldPower = g.player.systems.shields.power;
    const shields = g.player.rooms.find((r) => r.system === "shields");
    assert.ok(shields);
    assert.equal(joinCrew(g, "Zoltan"), true);
    const zoltan = g.crew.find((c) => c.side === "player" && c.kin === "energy");
    assert.ok(zoltan);
    zoltan.room = shields.id;
    assert.equal(crewDef("energy").bonusPower, 1);
    assert.equal(zoltan.hp, 70);
    assert.equal(zoltan.maxHp, 70);
    assert.equal(zoltanBars(g.crew, g.player, "player", "shields"), 1);
    assert.equal(g.player.reactor, reactor);
    assert.equal(g.player.systems.shields.power, shieldPower);

    const human = g.crew.find((c) => c.side === "player" && c.kin === "human");
    assert.ok(human);
    assert.equal(joinCrew(g, "Crystal"), true);
    const crystal = g.crew.find((c) => c.side === "player" && c.kin === "crystal");
    assert.ok(crystal);
    assert.equal(crewDef("crystal").lockdown, true);
    assert.equal(crewDef("crystal").lockCooldown, 50);
    assert.equal(crystal.hp, 125);
    assert.equal(lockdown(g, human.id), false);
    assert.equal(lockdown(g, crystal.id), true);
    assert.equal(g.player.rooms.find((r) => r.id === crystal.room)?.lock, 12);
    assert.equal(crystal.lockCool, 50);

    startCombat(g, "scout");
    g.paused = false;
    const laser = g.player.weapons.find((w) => w.defId === "LASER_BURST_3");
    assert.ok(laser);
    assert.equal(weaponDef(laser.defId)?.name, "Burst Laser II");
    const room = g.enemy?.rooms[0];
    assert.ok(room);
    armWeapon(g, laser.uid);
    aim(g, room.id);
    laser.charge = 0.999;
    for (let i = 0; i < 10 && laser.charge !== 0; i++) step(g, 1 / 30);
    assert.ok(g.shots.some((s) => s.from === "player" && s.defId === "LASER_BURST_3"));
  });

  it("hires Robert Smith as a Mantis and accepts the Anti-Bio Beam", () => {
    const hired = kestrel(1);
    const beacon = hired.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
    assert.ok(beacon);
    beacon.flag = "cited:confused-mantis";
    beacon.name = "Confused Mantis";
    hired.here = beacon.id;
    hired.event = citedEvent(hired, beacon);
    hired.phase = "event";
    choose(hired, "c:confused-mantis:0");
    choose(hired, "s:confused-mantis:human");
    choose(hired, "s:confused-mantis:return");
    choose(hired, "s:confused-mantis:hire");
    const robert = hired.crew.find((c) => c.side === "player" && c.name === "Robert Smith");
    assert.ok(robert);
    assert.equal(robert.kin, "mantis");
    assert.equal(robert.hp, crewDef("mantis").hp);
    assert.equal(robert.maxHp, 100);
    assert.equal(robert.hp, 100);

    const g = kestrel(4);
    startCombat(g, "pool", false, "slug-home-nebula-surrender");
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.hull = Math.max(1, Math.floor(enemy.hullMax * 0.2));
    g.paused = false;
    step(g, 1 / 30);
    assert.equal(g.phase, "event");
    assert.ok(g.event?.choices.some((c) => c.id === ACCEPT_ID));
    choose(g, ACCEPT_ID);
    const beam = weaponDef("BEAM_BIO");
    assert.equal(beam?.name, "Anti-Bio Beam");
    assert.ok(g.player.weapons.some((w) => w.defId === "BEAM_BIO"));
    assert.equal(g.phase, "reward");
  });

  it("sells Artemis for 19 and meets the flagship's stage-one guns", () => {
    const g = kestrel(9);
    const burst = g.player.weapons.find((w) => w.defId === "LASER_BURST_3");
    const artemis = g.player.weapons.find((w) => w.defId === "MISSILES_2_PLAYER");
    assert.ok(burst);
    assert.ok(artemis);
    const quotes = citedSellQuote(g);
    const burstQuote = quotes.find((q) => q.id === `w:${burst.uid}`);
    const artQuote = quotes.find((q) => q.id === `w:${artemis.uid}`);
    assert.ok(burstQuote);
    assert.ok(artQuote);
    assert.equal(burstQuote.name, weaponDef("LASER_BURST_3")?.name);
    assert.equal(burstQuote.name, "Burst Laser II");
    assert.equal(burstQuote.scrap, 40);
    assert.equal(artQuote.name, weaponDef("MISSILES_2_PLAYER")?.name);
    assert.equal(artQuote.name, "Artemis Missiles");
    assert.equal(artQuote.scrap, 19);
    assert.equal(quotes.filter((q) => q.kind === "weapon").length, 2);
    const scrap = g.scrap;
    assert.equal(citedSell(g, artQuote.id), true);
    assert.equal(g.scrap, scrap + 19);
    assert.equal(
      g.player.weapons.some((w) => w.defId === "MISSILES_2_PLAYER"),
      false,
    );
    assert.equal(
      g.player.weapons.some((w) => w.defId === "LASER_BURST_3"),
      true,
    );

    const fight = kestrel(11);
    const boss = fight.beacons.find((b) => b.kind === "exit");
    assert.ok(boss);
    boss.kind = "boss";
    fight.here = boss.id;
    startCombat(fight, "boss");
    const guns = fight.enemy?.weapons ?? [];
    assert.deepEqual(
      guns.map((w) => w.defId),
      ["ARTILLERY_BOSS_4", "ARTILLERY_BOSS_1", "ARTILLERY_BOSS_2", "ARTILLERY_BOSS_3"],
    );
    assert.deepEqual(
      guns.map((w) => weaponDef(w.defId)?.name),
      [...FLAGSHIP_PHASES[0].weapons],
    );
    assert.deepEqual(
      guns.map((w) => weaponDef(w.defId)?.name),
      ["Boss Ion", "Boss Laser", "Boss Missile", "Boss Beam"],
    );
  });

  it("buys fuel, a Human, the Re-loader, Drone Control, a schematic, and Mind Control", () => {
    const g = visitStore(STORE_SEED);
    const fuelLine = storeDef("standard")?.lines.find((row) => row.id === "fuel");
    const humanLine = storeDef("standard")?.lines.find((row) => row.id === "human");
    assert.equal(fuelLine?.name, "Fuel");
    assert.equal(fuelLine?.cost, 3);
    assert.equal(humanLine?.name, "Human");
    assert.equal(humanLine?.cost, 45);
    const fuel = stock(g, "fuel");
    const human = stock(g, "crew-human");
    const loader = stock(g, "aug-AUTO_COOLDOWN");
    const drone = stock(g, "drone-ANTI_DRONE");
    const control = stock(g, "sys-drones-DEFENSE_1");
    const mind = stock(g, "sys-mind");
    assert.equal(fuel.name, fuelLine?.name);
    assert.equal(fuel.cost, 3);
    assert.equal(fuel.amount, 5);
    assert.equal(human.name, humanLine?.name);
    assert.equal(human.cost, 45);
    assert.equal(loader.name, augmentDef("AUTO_COOLDOWN")?.name);
    assert.equal(loader.name, "Automated Re-loader");
    assert.equal(loader.cost, augmentDef("AUTO_COOLDOWN")?.cost);
    assert.equal(loader.cost, 40);
    assert.equal(drone.name, droneDef("ANTI_DRONE")?.name);
    assert.equal(drone.name, "Anti-Combat Drone");
    assert.equal(drone.cost, droneDef("ANTI_DRONE")?.cost);
    assert.equal(drone.cost, 35);
    assert.equal(control.name, "Drone Control");
    assert.equal(control.cost, 85);
    assert.equal(mind.name, systemDef("mind")?.name);
    assert.equal(mind.name, "Mind Control");
    assert.equal(mind.cost, systemDef("mind")?.cost);
    assert.equal(mind.cost, 75);

    const fuelBefore = g.fuel;
    const crewBefore = g.crew.filter((c) => c.side === "player").length;
    pay(g, "fuel", 3);
    assert.equal(g.fuel, fuelBefore + 1);
    assert.equal(stock(g, "fuel").amount, 4);
    pay(g, "crew-human", 45);
    const hired = g.crew.filter((c) => c.side === "player" && c.kin === "human");
    assert.equal(hired.length, crewBefore + 1);
    assert.equal(hired.at(-1)?.name, "Human");
    assert.equal(hired.at(-1)?.hp, crewDef("human").hp);
    pay(g, "aug-AUTO_COOLDOWN", 40);
    assert.ok(g.augments.includes("AUTO_COOLDOWN"));
    pay(g, "sys-drones-DEFENSE_1", 85);
    assert.equal(g.player.kits.drones?.level, 2);
    assert.equal(g.player.kits.drones?.power, 0);
    assert.equal(g.player.kits.drones?.target, "DEFENSE_1");
    pay(g, "drone-ANTI_DRONE", 35);
    assert.deepEqual(g.player.kits.drones?.loadout, ["DEFENSE_1", "ANTI_DRONE"]);
    pay(g, "sys-mind", 75);
    assert.equal(g.player.kits.mind?.level, 1);
    assert.equal(g.player.kits.mind?.power, 0);
    assert.equal(
      g.stock?.some((row) => row.id === "crew-human"),
      false,
    );
    assert.equal(
      g.stock?.some((row) => row.id === "aug-AUTO_COOLDOWN"),
      false,
    );
    assert.equal(
      g.stock?.some((row) => row.id === "drone-ANTI_DRONE"),
      false,
    );
    assert.equal(
      g.stock?.some((row) => row.id === "sys-drones-DEFENSE_1"),
      false,
    );
    assert.equal(
      g.stock?.some((row) => row.id === "sys-mind"),
      false,
    );
  });
});
