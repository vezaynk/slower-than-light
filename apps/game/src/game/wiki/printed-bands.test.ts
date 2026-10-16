import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { EventBand } from "@stl/pack";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { printedBand, rollBand, upgradeRows } from "./event-bands.ts";

const DULL = "nothing of much interest";
const GULP = "cargo hold";
const THANKS = "scrap in exchange";
const WOW = "repair part of your hull";
const ABANDONED = "No one answers your hails";
const SCAN = "unclaimed fuel and drone parts";
const S3 = "s:garbled-dock:sensors3";

afterEach(() => resetPackForTests());

function rewrite(eventId: string, bands: EventBand[] | undefined) {
  const row = eventDef(eventId);
  assert.ok(row);
  loadPack({ events: [{ ...row, bands }] }, "append");
}

function swarm(level = 1, power = level) {
  return { id: "swarm" as const, level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function upgrade(seed: number, scrap: number, power = 0): Game {
  const g = createGame(seed);
  g.player.kits.swarm = swarm(1, power);
  g.scrap = scrap;
  return g;
}

function pair(id: string, scrap: [number, number], level: [number, number]): EventBand[] {
  return [
    { id, k: "scrap", lo: scrap[0], hi: scrap[1] },
    { id, k: "level", lo: level[0], hi: level[1] },
  ];
}

function scan(seed: number): Game {
  const g = createGame(seed);
  g.player.systems.sensors.level = 2;
  return g;
}

function dullSeed(): number {
  for (let seed = 1; seed <= 80; seed++) {
    const g = scan(seed);
    choose(g, "c:destroyed-cargo-ship:2");
    if ((g.event?.body ?? "").includes(DULL)) return seed;
  }
  assert.fail("no dull scan");
}

function drink(seed: number, rock: boolean): Game {
  const g = createGame(seed);
  g.scrap = rock ? 80 : 100;
  if (rock) g.crew[0]!.kin = "stone";
  choose(g, rock ? "c:slug-drink:2" : "c:slug-drink:1");
  return g;
}

function miners(seed: number, missiles: number): Game {
  const g = createGame(seed);
  g.missiles = missiles;
  g.scrap = 0;
  g.player.hull = g.player.hullMax - 20;
  choose(g, missiles === 5 ? "c:asteroid-mining-colony:1" : "c:asteroid-mining-colony:2");
  return g;
}

function docked(seed: number): Game {
  const g = createGame(seed);
  const here = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(here);
  here.flag = "cited:refueling-platform-garbled-broadcast";
  here.name = "Refueling platform garbled broadcast";
  g.here = here.id;
  g.event = citedEvent(g, here);
  g.phase = "event";
  choose(g, "c:refueling-platform-garbled-broadcast:2");
  return g;
}

function abandonedSeed(): number {
  for (let seed = 1; seed <= 80; seed++) {
    const g = docked(seed);
    choose(g, "s:garbled-dock:signal");
    if ((g.event?.body ?? "").includes(ABANDONED)) return seed;
  }
  assert.fail("no abandoned dock");
}

function atSensors(seed: number, level: number): Game {
  const g = docked(seed);
  choose(g, "s:garbled-dock:signal");
  g.player.systems.sensors.level = level;
  return g;
}

describe("printed bands", () => {
  it("packs the six ranges and does not roll a fixed or missing band", () => {
    assert.deepEqual(upgradeRows("pirate-ship-selling-drones"), ["low", "mid", "high"]);
    assert.deepEqual(printedBand("merchant-s-request", "paltry", "scrap"), { id: "paltry", k: "scrap", lo: 20, hi: 30 });
    assert.deepEqual(printedBand("merchant-s-request", "full", "scrap"), { id: "full", k: "scrap", lo: 40, hi: 55 });
    assert.deepEqual(printedBand("merchant-s-request", "weapons", "scrap"), { id: "weapons", k: "scrap", lo: 55, hi: 70 });
    assert.deepEqual(printedBand("asteroid-mining-colony", "thanks", "scrap"), { id: "thanks", k: "scrap", lo: 15, hi: 25 });
    assert.deepEqual(printedBand("asteroid-mining-colony", "wow", "scrap"), { id: "wow", k: "scrap", lo: 30, hi: 40 });
    assert.deepEqual(printedBand("destroyed-cargo-ship", "scan", "scrap"), { id: "scan", k: "scrap", lo: 20, hi: 35 });
    assert.deepEqual(printedBand("slug-drink", "trap", "scrap"), { id: "trap", k: "scrap", lo: 25, hi: 35 });
    assert.deepEqual(printedBand("refueling-platform-garbled-broadcast", "sensors3", "parts"), {
      id: "sensors3",
      k: "parts",
      lo: 1,
      hi: 3,
    });

    let calls = 0;
    const roll = (lo: number, hi: number) => {
      calls += 1;
      assert.deepEqual([lo, hi], [15, 20]);
      return lo;
    };
    assert.equal(rollBand("pirate-ship-selling-drones", "low", "scrap", roll), 15);
    assert.equal(calls, 1);
    rewrite("pirate-ship-selling-drones", pair("low", [12, 12], [4, 4]));
    calls = 0;
    assert.equal(rollBand("pirate-ship-selling-drones", "low", "scrap", roll), 12);
    assert.equal(rollBand("pirate-ship-selling-drones", "low", "level", roll), 4);
    assert.equal(calls, 0);
    rewrite("pirate-ship-selling-drones", undefined);
    calls = 0;
    assert.equal(rollBand("pirate-ship-selling-drones", "low", "scrap", roll), null);
    assert.equal(calls, 0);
    assert.deepEqual(upgradeRows("pirate-ship-selling-drones"), []);
  });

  it("sells one drone upgrade without a pick, and leaves the system alone when the table is missing", () => {
    rewrite("pirate-ship-selling-drones", [
      ...pair("low", [12, 12], [4, 4]),
      { id: "mid", k: "scrap", lo: 50, hi: 50 },
    ]);
    const paid = upgrade(1, 100, 8);
    const paidSeed = paid.seed;
    choose(paid, "q:pirate-drones:upgrade");
    assert.equal(paid.scrap, 88);
    assert.equal(paid.player.kits.swarm?.level, 4);
    assert.equal(paid.player.kits.swarm?.power, 4);
    assert.equal(paid.seed, paidSeed);
    assert.match(paid.event?.body ?? "", /level 4/);

    rewrite("pirate-ship-selling-drones", pair("only", [40, 40], [3, 6]));
    const short = upgrade(2, 10, 1);
    const shortSeed = short.seed;
    choose(short, "q:pirate-drones:upgrade");
    assert.equal(short.scrap, 10);
    assert.equal(short.player.kits.swarm?.level, 1);
    assert.equal(short.seed, shortSeed);

    rewrite("pirate-ship-selling-drones", pair("only", [15, 20], [6, 7]));
    const rolledShort = upgrade(3, 10, 1);
    const rolledSeed = rolledShort.seed;
    choose(rolledShort, "q:pirate-drones:upgrade");
    assert.equal(rolledShort.scrap, 10);
    assert.equal(rolledShort.player.kits.swarm?.level, 1);
    assert.notEqual(rolledShort.seed, rolledSeed);

    rewrite("pirate-ship-selling-drones", undefined);
    const gone = upgrade(4, 200, 1);
    const goneSeed = gone.seed;
    choose(gone, "q:pirate-drones:upgrade");
    assert.equal(gone.scrap, 200);
    assert.equal(gone.player.kits.swarm?.level, 1);
    assert.equal(gone.seed, goneSeed);

    rewrite("pirate-ship-selling-drones", [
      ...pair("a", [5, 5], [2, 2]),
      ...pair("b", [5, 5], [9, 9]),
    ]);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 20 && seen.size < 2; seed++) {
      const g = upgrade(seed, 100);
      const before = g.seed;
      choose(g, "q:pirate-drones:upgrade");
      assert.equal(g.scrap, 95);
      assert.notEqual(g.seed, before);
      const level = g.player.kits.swarm?.level ?? 0;
      assert.ok(level === 2 || level === 9, `level ${level}`);
      seen.add(level);
    }
    assert.equal(seen.size, 2);
  });

  it("pays the merchant's packed scrap after the parts, and still grants fuel when the scrap band is missing", () => {
    const paltry = createGame(1);
    paltry.player.parts = 5;
    paltry.scrap = 0;
    const paltrySeed = paltry.seed;
    choose(paltry, "q:merchant:paltry");
    assert.ok(paltry.scrap >= 20 && paltry.scrap <= 30, `scrap ${paltry.scrap}`);
    assert.equal(paltry.player.parts, 0);
    assert.notEqual(paltry.seed, paltrySeed);

    rewrite("merchant-s-request", [{ id: "paltry", k: "scrap", lo: 12, hi: 12 }]);
    const fixed = createGame(2);
    fixed.player.parts = 5;
    fixed.scrap = 10;
    const fixedSeed = fixed.seed;
    choose(fixed, "q:merchant:paltry");
    assert.equal(fixed.scrap, 22);
    assert.equal(fixed.player.parts, 0);
    assert.equal(fixed.seed, fixedSeed);
    assert.match(fixed.event?.body ?? "", /You drop the parts off/);
    assert.match(fixed.event?.body ?? "", /Drone parts: -5\./);
    assert.match(fixed.event?.body ?? "", /Scrap: 12\./);

    rewrite("merchant-s-request", undefined);
    const gone = createGame(3);
    gone.player.parts = 5;
    gone.scrap = 10;
    const goneSeed = gone.seed;
    choose(gone, "q:merchant:paltry");
    assert.equal(gone.scrap, 10);
    assert.equal(gone.player.parts, 0);
    assert.equal(gone.seed, goneSeed);
    assert.match(gone.event?.body ?? "", /You drop the parts off/);
    assert.match(gone.event?.body ?? "", /Drone parts: -5\./);
    assert.equal((gone.event?.body ?? "").includes("Scrap:"), false);

    rewrite("merchant-s-request", [{ id: "full", k: "scrap", lo: 12, hi: 12 }]);
    const full = createGame(4);
    full.player.parts = 5;
    full.scrap = 10;
    const fullSeed = full.seed;
    choose(full, "q:merchant:full");
    assert.equal(full.scrap, 22);
    assert.equal(full.player.parts, 0);
    assert.equal(full.seed, fullSeed);

    rewrite("merchant-s-request", [{ id: "weapons", k: "scrap", lo: 12, hi: 12 }]);
    const tipped = createGame(5);
    tipped.player.parts = 5;
    tipped.scrap = 10;
    choose(tipped, "q:merchant:weapons");
    rewrite("merchant-s-request", undefined);
    const quiet = createGame(5);
    quiet.player.parts = 5;
    quiet.scrap = 10;
    choose(quiet, "q:merchant:weapons");
    assert.equal(tipped.player.parts, 0);
    assert.equal(quiet.player.parts, 0);
    assert.equal(tipped.scrap, 22);
    assert.equal(quiet.scrap, 10);
    assert.equal(tipped.seed, quiet.seed);
    assert.ok(tipped.fuel - createGame(5).fuel >= 2 && tipped.fuel - createGame(5).fuel <= 5);
    assert.equal(tipped.fuel, quiet.fuel);
    assert.match(quiet.event?.body ?? "", /good point/);
  });

  it("pays the miner who was thanked, and skips the hull when that scrap band is missing", () => {
    let thanks = 0;
    let wow = 0;
    for (let seed = 1; seed <= 80 && (thanks === 0 || wow === 0); seed++) {
      if (thanks === 0 && (miners(seed, 5).event?.body ?? "").includes(THANKS)) thanks = seed;
      if (wow === 0 && (miners(seed, 15).event?.body ?? "").includes(WOW)) wow = seed;
    }
    assert.ok(thanks > 0 && wow > 0);

    rewrite("asteroid-mining-colony", [
      { id: "thanks", k: "scrap", lo: 7, hi: 7 },
      { id: "wow", k: "scrap", lo: 9, hi: 9 },
    ]);
    const thankYou = miners(thanks, 5);
    const generous = miners(wow, 15);
    assert.match(thankYou.event?.body ?? "", /scrap in exchange/);
    assert.equal(thankYou.scrap, 7);
    assert.equal(thankYou.player.hull, thankYou.player.hullMax - 20);
    assert.match(generous.event?.body ?? "", /repair part of your hull/);
    assert.equal(generous.scrap, 9);
    assert.equal(generous.player.hull, generous.player.hullMax - 15);
    assert.match(generous.event?.body ?? "", /5 repairs/);

    rewrite("asteroid-mining-colony", undefined);
    const quietThanks = miners(thanks, 5);
    const quietWow = miners(wow, 15);
    assert.equal(quietThanks.seed, thankYou.seed);
    assert.equal(quietWow.seed, generous.seed);
    assert.equal(quietThanks.scrap, 0);
    assert.equal(quietWow.scrap, 0);
    assert.equal(quietThanks.missiles, 0);
    assert.equal(quietWow.missiles, 0);
    assert.equal(quietThanks.player.hull, quietThanks.player.hullMax - 20);
    assert.equal(quietWow.player.hull, quietWow.player.hullMax - 20);
    assert.match(quietThanks.event?.body ?? "", /scrap in exchange/);
    assert.match(quietWow.event?.body ?? "", /repair part of your hull/);
    assert.equal((quietWow.event?.body ?? "").includes("repairs"), false);
  });

  it("pays the dull cargo scan from its band, and grants nothing when that band is missing", () => {
    const seed = dullSeed();
    const campaign = scan(seed);
    choose(campaign, "c:destroyed-cargo-ship:2");
    const gained = campaign.scrap - 10;
    assert.ok(gained >= 20 && gained <= 35, `scrap ${gained}`);
    assert.match(campaign.event?.body ?? "", /nothing of much interest/);

    rewrite("destroyed-cargo-ship", [{ id: "scan", k: "scrap", lo: 8, hi: 8 }]);
    const fixed = scan(seed);
    choose(fixed, "c:destroyed-cargo-ship:2");
    rewrite("destroyed-cargo-ship", undefined);
    const gone = scan(seed);
    choose(gone, "c:destroyed-cargo-ship:2");
    assert.equal(fixed.scrap, 18);
    assert.equal(gone.scrap, 10);
    assert.equal(fixed.seed, gone.seed);
    assert.match(fixed.event?.body ?? "", /nothing of much interest/);
    assert.match(gone.event?.body ?? "", /nothing of much interest/);
    assert.equal((gone.event?.body ?? "").includes("Scrap:"), false);
  });

  it("takes the slug drink's scrap from its band, and a Rock's trap does not", () => {
    let trap = 0;
    let trust = 0;
    let rockFight = 0;
    for (let seed = 1; seed <= 40 && (trap === 0 || trust === 0 || rockFight === 0); seed++) {
      const drunk = drink(seed, false);
      if (trap === 0 && drunk.phase === "event" && (drunk.event?.body ?? "").includes(GULP)) trap = seed;
      if (trust === 0 && drunk.phase === "store") trust = seed;
      if (rockFight === 0 && drink(seed, true).phase === "combat") rockFight = seed;
    }
    assert.ok(trap > 0 && trust > 0 && rockFight > 0);

    const campaign = drink(trap, false);
    const lost = 100 - campaign.scrap;
    assert.ok(lost >= 25 && lost <= 35, `lost ${lost}`);

    rewrite("slug-drink", [{ id: "trap", k: "scrap", lo: 4, hi: 4 }]);
    const fixed = drink(trap, false);
    rewrite("slug-drink", undefined);
    const gone = drink(trap, false);
    assert.equal(fixed.scrap, 96);
    assert.equal(gone.scrap, 100);
    assert.equal(fixed.seed, gone.seed);
    assert.match(fixed.event?.body ?? "", /cargo hold/);
    assert.match(gone.event?.body ?? "", /cargo hold/);
    assert.match(fixed.event?.body ?? "", /Scrap: -4\./);
    assert.equal((gone.event?.body ?? "").includes("Scrap:"), false);

    rewrite("slug-drink", [{ id: "trap", k: "scrap", lo: 1, hi: 80 }]);
    const rock = drink(rockFight, true);
    rewrite("slug-drink", undefined);
    const rockGone = drink(rockFight, true);
    assert.equal(rock.phase, "combat");
    assert.equal(rockGone.phase, "combat");
    assert.equal(rock.scrap, 80);
    assert.equal(rockGone.scrap, 80);
    assert.equal(rock.seed, rockGone.seed);

    rewrite("slug-drink", [{ id: "trap", k: "scrap", lo: 1, hi: 80 }]);
    const sold = drink(trust, false);
    rewrite("slug-drink", undefined);
    const soldGone = drink(trust, false);
    assert.equal(sold.phase, "store");
    assert.equal(soldGone.phase, "store");
    assert.equal(sold.scrap, 100);
    assert.equal(soldGone.scrap, 100);
    assert.equal(sold.seed, soldGone.seed);
  });

  it("grants the level-3 sensor parts after the fuel, and still grants the fuel when the parts are missing", () => {
    const seed = abandonedSeed();
    const campaign = atSensors(seed, 3);
    const campaignFuel = campaign.fuel;
    const campaignParts = campaign.player.parts;
    choose(campaign, S3);
    const fuelGain = campaign.fuel - campaignFuel;
    const partsGain = campaign.player.parts - campaignParts;
    assert.ok(fuelGain >= 2 && fuelGain <= 3, `fuel ${fuelGain}`);
    assert.ok(partsGain >= 1 && partsGain <= 3, `parts ${partsGain}`);
    assert.match(campaign.event?.body ?? "", new RegExp(SCAN));

    rewrite("refueling-platform-garbled-broadcast", [{ id: "sensors3", k: "parts", lo: 2, hi: 2 }]);
    const fixed = atSensors(seed, 3);
    const fixedFuel = fixed.fuel;
    const fixedParts = fixed.player.parts;
    choose(fixed, S3);
    rewrite("refueling-platform-garbled-broadcast", undefined);
    const gone = atSensors(seed, 3);
    const goneFuel = gone.fuel;
    const goneParts = gone.player.parts;
    choose(gone, S3);
    assert.equal(fixed.player.parts, fixedParts + 2);
    assert.equal(gone.player.parts, goneParts);
    assert.equal(fixed.fuel - fixedFuel, gone.fuel - goneFuel);
    assert.ok(fixed.fuel - fixedFuel >= 2 && fixed.fuel - fixedFuel <= 3);
    assert.equal(fixed.seed, gone.seed);
    assert.match(gone.event?.body ?? "", new RegExp(SCAN));
    assert.equal(gone.log.some((line) => line.startsWith("Drone parts:")), false);

    const holder = eventDef("blue-button-reqs");
    assert.ok(holder);
    loadPack(
      {
        events: [
          {
            ...holder,
            choices: holder.choices.map((choice) => (choice.id === S3 ? { ...choice, reqs: undefined } : choice)),
          },
        ],
      },
      "append",
    );
    rewrite("refueling-platform-garbled-broadcast", [{ id: "sensors3", k: "parts", lo: 1, hi: 3 }]);
    const low = atSensors(seed, 2);
    const lowFuel = low.fuel;
    const lowParts = low.player.parts;
    const lowSeed = low.seed;
    choose(low, S3);
    assert.equal(low.fuel, lowFuel);
    assert.equal(low.player.parts, lowParts);
    assert.equal(low.seed, lowSeed);
    assert.match(low.event?.body ?? "", new RegExp(ABANDONED));
  });
});
