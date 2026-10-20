import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { priceBand, rollPrice } from "./event-prices.ts";

const DOCK = "c:refueling-platform:0";
const OFFER = "The platform makes an offer.";

afterEach(() => resetPackForTests());

function beacon(g: Game): Beacon {
  const found = g.beacons.find(
    (item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss",
  );
  assert.ok(found);
  return found;
}

function docked(seed: number): Game {
  const g = createGame(seed);
  const here = beacon(g);
  here.flag = "FUELING_STATION";
  here.name = "Refueling platform";
  g.here = here.id;
  g.event = citedEvent(g, here);
  g.phase = "event";
  choose(g, DOCK);
  return g;
}

function offerSeed(): number {
  for (let seed = 1; seed <= 400; seed++) {
    if (docked(seed).event?.body === OFFER) return seed;
  }
  assert.fail("no offer");
}

describe("refuel dock price", () => {
  it("packs the offer and pays an appended band", () => {
    assert.deepEqual(eventDef("FUELING_STATION")?.prices, [
      { id: "offer", k: "scrap", lo: 5, hi: 10 },
    ]);
    assert.deepEqual(priceBand("refueling-platform", "offer"), {
      id: "offer",
      k: "scrap",
      lo: 5,
      hi: 10,
    });

    const seed = offerSeed();
    const row = eventDef("FUELING_STATION");
    assert.ok(row);

    loadPack(
      { events: [{ ...row, prices: [{ id: "offer", k: "scrap", lo: 7, hi: 7 }] }] },
      "append",
    );
    const fixed = docked(seed);
    assert.equal(
      fixed.event?.choices.some((choice) => choice.id === "s:refuel-dock:accept"),
      true,
    );
    const fixedScrap = fixed.scrap;
    const fixedFuel = fixed.fuel;
    const fixedSeed = fixed.seed;
    choose(fixed, "s:refuel-dock:accept");
    assert.equal(fixed.scrap, fixedScrap - 7);
    assert.equal(fixed.fuel, fixedFuel + 5);
    assert.equal(fixed.seed, fixedSeed);
    assert.match(fixed.event?.body ?? "", /You receive 5 fuel/);
    assert.match(fixed.log.join("\n"), /Scrap: -7\./);

    fixed.scrap = 6;
    const shortSeed = fixed.seed;
    const shortFuel = fixed.fuel;
    choose(fixed, "s:refuel-dock:accept");
    assert.equal(fixed.scrap, 6);
    assert.equal(fixed.fuel, shortFuel);
    assert.equal(fixed.seed, shortSeed);

    loadPack(
      { events: [{ ...row, prices: [{ id: "offer", k: "scrap", lo: 20, hi: 30 }] }] },
      "append",
    );
    const rolled = docked(seed);
    rolled.scrap = 100;
    const fuel = rolled.fuel;
    choose(rolled, "s:refuel-dock:accept");
    const before = 100;
    const paid = before - rolled.scrap;
    assert.ok(paid >= 20 && paid <= 30, `scrap ${paid}`);
    assert.equal(rolled.fuel, fuel + 5);

    loadPack({ events: [{ ...row, prices: undefined }] }, "append");
    const quiet = docked(seed);
    assert.equal(
      quiet.event?.choices.some((choice) => choice.id === "s:refuel-dock:accept"),
      false,
    );
    assert.equal(
      quiet.event?.choices.some((choice) => choice.id === "s:refuel-dock:reject"),
      true,
    );
    const held = quiet.scrap;
    const heldFuel = quiet.fuel;
    const heldSeed = quiet.seed;
    choose(quiet, "s:refuel-dock:accept");
    assert.equal(quiet.scrap, held);
    assert.equal(quiet.fuel, heldFuel);
    assert.equal(quiet.seed, heldSeed);
    assert.equal(quiet.event?.body, OFFER);
    assert.equal(priceBand("refueling-platform", "offer"), null);

    loadPack(
      { events: [{ ...row, prices: [{ id: "offer", k: "fuel", lo: 5, hi: 10 }] }] },
      "append",
    );
    const fuelPrice = docked(seed);
    assert.equal(
      fuelPrice.event?.choices.some((choice) => choice.id === "s:refuel-dock:accept"),
      false,
    );
    const fuelSeed = fuelPrice.seed;
    const fuelScrap = fuelPrice.scrap;
    choose(fuelPrice, "s:refuel-dock:accept");
    assert.equal(fuelPrice.scrap, fuelScrap);
    assert.equal(fuelPrice.seed, fuelSeed);

    resetPackForTests();
    assert.deepEqual(eventDef("FUELING_STATION")?.prices, [
      { id: "offer", k: "scrap", lo: 5, hi: 10 },
    ]);
    const poor = docked(seed);
    poor.scrap = 4;
    assert.equal(choiceDisabled(poor, "s:refuel-dock:accept"), "Need 5 scrap");
    choose(poor, "s:refuel-dock:accept");
    assert.equal(poor.scrap, 4);
    assert.equal(poor.event?.body, OFFER);
  });

  it("does not roll a fixed offer and rolls nothing when the price is missing", () => {
    let calls = 0;
    const roll = (lo: number, hi: number) => {
      calls += 1;
      assert.deepEqual([lo, hi], [5, 10]);
      return lo;
    };
    assert.equal(rollPrice("FUELING_STATION", "offer", roll), 5);
    assert.equal(calls, 1);

    const row = eventDef("FUELING_STATION");
    assert.ok(row);
    loadPack(
      { events: [{ ...row, prices: [{ id: "offer", k: "scrap", lo: 8, hi: 8 }] }] },
      "append",
    );
    calls = 0;
    assert.equal(rollPrice("FUELING_STATION", "offer", roll), 8);
    assert.equal(calls, 0);

    loadPack({ events: [{ ...row, prices: undefined }] }, "append");
    calls = 0;
    assert.equal(rollPrice("FUELING_STATION", "offer", roll), null);
    assert.equal(calls, 0);
  });
});
