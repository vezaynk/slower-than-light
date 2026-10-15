import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allEvents, eventDef, fillerList, loadPack, resetPackForTests } from "@stl/pack";
import { createGame } from "../sim.ts";
import "./base.ts";
import { citedEvent } from "../wiki/cited-events.ts";
import {
  DISTRESS,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  FILLER_PAGES,
  ITEMS,
  NEBULA,
  drawFiller,
  emptyPageFor,
  fillerEvent,
  pageForRow,
  stampEmptyNebula,
} from "../wiki/filler-events.ts";

afterEach(() => resetPackForTests());

function formula(dest: string): string {
  return dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

describe("filler lists", () => {
  it("stores each row's page id in authored order", () => {
    for (const row of [...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS, ...EXIT_NEUTRAL, ...EXIT_ITEMS]) {
      assert.equal(row.id, pageForRow(row.dest)?.slug ?? formula(row.dest), row.dest);
    }
    assert.equal(fillerList("filler")?.entries.length, FILLER.length);
    assert.equal(fillerList("filler")?.entries[0]?.id, FILLER[0]?.id);
    assert.equal(fillerList("nebula")?.entries.length, NEBULA.length);
    assert.equal(fillerList("distress")?.entries.length, DISTRESS.length);
    assert.equal(fillerList("items")?.entries.length, ITEMS.length);
    assert.equal(fillerList("exitNeutral")?.entries.length, EXIT_NEUTRAL.length);
    assert.equal(fillerList("exitItems")?.entries.length, EXIT_ITEMS.length);
    assert.equal(fillerList("exitItems")?.entries.some((entry) => entry.id === "large-trade-station"), true);
  });

  it("draws an appended list and leaves the campaign list in place", () => {
    const before = fillerList("filler")?.entries.length;
    loadPack({ lists: [{ id: "ember-list", entries: [{ id: "large-asteroid-field", unique: false }] }] }, "append");
    assert.equal(fillerList("filler")?.entries.length, before);
    const page = drawFiller(createGame(1), "ember-list", []);
    assert.equal(page, pageForRow("Large asteroid field"));
    assert.equal(page?.slug, "large-asteroid-field");
    resetPackForTests();
    assert.equal(drawFiller(createGame(1), "ember-list", []), null);
    assert.equal(fillerList("filler")?.entries.length, before);
  });

  it("replaces a campaign list when the same id is appended", () => {
    loadPack({ lists: [{ id: "filler", entries: [{ id: "large-asteroid-field", unique: false }] }] }, "append");
    assert.equal(fillerList("filler")?.entries.length, 1);
    assert.equal(fillerList("nebula")?.entries.length, NEBULA.length);
    const page = drawFiller(createGame(1), "filler", []);
    assert.equal(page, pageForRow("Large asteroid field"));
  });

  it("draws a packed event that the campaign lists do not name", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-page",
            dest: "Ember page",
            flag: "cited:ember-page",
            aliases: [],
            sectors: [],
            body: "Packed.",
            choices: [{ id: "c:ember-page:0", label: "Go", fx: [{ k: "nothing" }] }],
          },
        ],
        lists: [{ id: "ember-list", entries: [{ id: "ember-page", unique: true }] }],
      },
      "append",
    );
    const page = drawFiller(createGame(1), "ember-list", []);
    assert.equal(page?.dest, "Ember page");
    assert.equal(page?.body, "Packed.");
    assert.equal(drawFiller(createGame(2), "ember-list", [], new Set(["cited:ember-page"])), null);
  });

  it("keeps the cited card when a filler page shares its slug", () => {
    loadPack({ lists: [{ id: "ember-list", entries: [{ id: "refueling-station", unique: false }] }] }, "append");
    assert.equal(drawFiller(createGame(1), "ember-list", []), pageForRow("Refueling station"));
  });

  it("reads an appended empty beacon and falls back to Civilian", () => {
    loadPack(
      {
        empties: [{ id: "ember-quiet", dest: "Ember quiet", sectors: ["Ember Reach"], texts: ["The reach is still."] }],
      },
      "append",
    );
    assert.equal(emptyPageFor("Ember Reach").dest, "Ember quiet");
    assert.deepEqual(emptyPageFor("Ember Reach").texts, ["The reach is still."]);
    assert.equal(emptyPageFor("Civilian Sector").dest, "Empty beacon (Civilian)");
    assert.equal(emptyPageFor("Nowhere").dest, "Empty beacon (Civilian)");
    resetPackForTests();
    assert.equal(emptyPageFor("Ember Reach").dest, "Empty beacon (Civilian)");
  });

  it("loads opening cards and keeps the two shared slugs as sector pages", () => {
    const shared = new Set(["refueling-station", "pirate-ship-distress-trap"]);
    assert.equal(FILLER_PAGES.length, 26);
    let packed = 0;
    for (const page of FILLER_PAGES) {
      const record = eventDef(page.slug);
      assert.ok(record, page.slug);
      const same =
        record.body === page.body &&
        record.choices.length === page.choices.length &&
        record.choices.every((choice, i) => choice.label === page.choices[i]?.label);
      if (shared.has(page.slug)) assert.equal(same, false, page.slug);
      else {
        assert.equal(same, true, page.slug);
        packed += 1;
      }
    }
    assert.equal(packed, 24);
    assert.equal(eventDef("refueling-station")?.choices[0]?.label, "Buy 6 Fuel for 12 Scrap");
    assert.equal(eventDef("pirate-ship-distress-trap")?.body, "");
    assert.equal(eventDef("pirate-ship-distress-trap")?.texts?.length, 4);
    assert.equal(eventDef("pirate-fight")?.body, "");
    assert.equal(eventDef("pirate-fight")?.texts?.length, 5);
    const hire = eventDef("crew-hiring-station");
    assert.equal(hire?.texts?.length, 3);
    assert.equal(hire?.body, hire?.texts?.[0]);
    const slugFight = eventDef("rebel-fight-slug");
    assert.ok(slugFight?.texts && slugFight.texts.length > 1);
    assert.notEqual(slugFight.body, slugFight.texts?.[0]);
    assert.equal(eventDef("auto-ship-warning")?.texts?.length, 9);
    assert.deepEqual(eventDef("auto-ship-warning")?.texts, eventDef("auto-ship-fight")?.texts);
    const before = allEvents().length;
    loadPack(
      {
        events: [
          {
            id: "large-asteroid-field",
            dest: "Ember field",
            flag: "cited:large-asteroid-field",
            aliases: [],
            sectors: [],
            body: "Replaced.",
            choices: [{ id: "c:large-asteroid-field:0", label: "Go", fx: [{ k: "nothing" }] }],
          },
        ],
        lists: [{ id: "ember-list", entries: [{ id: "large-asteroid-field", unique: false }] }],
      },
      "append",
    );
    assert.equal(allEvents().length, before);
    assert.equal(drawFiller(createGame(1), "ember-list", [])?.body, "Replaced.");
    resetPackForTests();
    assert.equal(eventDef("large-asteroid-field")?.dest, "Large asteroid field");
  });

  it("rolls an appended opening list and restores the campaign sentences", () => {
    const row = eventDef("pirate-fight");
    assert.ok(row);
    loadPack({ events: [{ ...row, texts: ["Ember one.", "Ember two."] }] }, "append");
    const g = createGame(1);
    const beacon = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
    assert.ok(beacon);
    beacon.flag = row.flag;
    const body = citedEvent(g, beacon)?.body ?? "";
    assert.ok(body === "Ember one." || body === "Ember two.", body);
    resetPackForTests();
    assert.equal(eventDef("pirate-fight")?.texts?.length, 5);
    assert.equal(eventDef("pirate-fight")?.texts?.includes("Ember one."), false);
  });

  it("stores the campaign offer rows and rolls an appended trade", () => {
    const trade = eventDef("trade-resources")?.offers ?? [];
    const nebula = eventDef("trade-resources-in-nebula")?.offers ?? [];
    assert.equal(trade.length, 4);
    assert.deepEqual(nebula, trade);
    for (const id of ["no-fuel-fuel-trader-distress-off", "no-fuel-fuel-trader-distress-on", "no-fuel-prepare-to-dock"]) {
      const rows = eventDef(id)?.offers ?? [];
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "high").length, 3, id);
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "pt2").length, 3, id);
    }
    const lanius = eventDef("lanius-trader")?.offers ?? [];
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "base").length, 3);
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "better").length, 3);
    const translator = eventDef("lanius-trader-with-translator")?.offers ?? [];
    assert.equal(translator.length, 3);
    assert.equal(translator.every((row) => row.k === "lanius" && row.band === "base"), true);
    const supply = eventDef("improve-reactor-for-supplies")?.offers ?? [];
    assert.equal(supply.length, 3);
    assert.equal(supply.some((row) => row.k === "supply" && row.fuel[0] === 0 && row.fuel[1] === 0), true);

    const row = eventDef("trade-resources");
    assert.ok(row);
    loadPack(
      {
        events: [{
          ...row,
          offers: [{ k: "trade", pay: "parts", cost: [2, 2], get: "fuel", gain: [9, 9] }],
        }],
      },
      "append",
    );
    const g = createGame(1);
    const beacon = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
    assert.ok(beacon);
    beacon.flag = row.flag;
    assert.match(citedEvent(g, beacon)?.body ?? "", /You lose 2 drone parts and receive 9 fuel\./);
    resetPackForTests();
    assert.equal(eventDef("trade-resources")?.offers?.length, 4);
  });

  it("opens the filler card for a shared slug and rolls the fuel gift", () => {
    const g = createGame(1);
    const beacon = g.beacons[0];
    assert.ok(beacon);
    beacon.flag = "filler:refueling-station";
    assert.equal(fillerEvent(g, beacon)?.choices[0]?.label, "Buy 6 Fuel for 12 Scrap.");
    beacon.flag = "filler:pirate-ship-distress-trap";
    assert.equal(fillerEvent(g, beacon)?.choices[0]?.label, "Fight the pirate ship.");
    beacon.flag = "filler:friendly-ship-out-of-fuel";
    assert.match(fillerEvent(g, beacon)?.choices[0]?.id ?? "", /^s:friendly-ship-out-of-fuel:give:\d+$/);
  });

  it("stamps the packed nebula sentences onto a quiet nebula beacon", () => {
    const g = createGame(1);
    const beacon = g.beacons[0];
    assert.ok(beacon);
    stampEmptyNebula(beacon, "Uncharted Nebula");
    assert.equal(beacon.flag, "filler:empty-nebula-beacon");
    assert.equal(beacon.name, "Empty nebula beacon");
    stampEmptyNebula(beacon, "Slug Home Nebula");
    assert.equal(beacon.flag, "filler:empty-nebula-beacon-slug");
    assert.equal(beacon.name, "Empty nebula beacon (Slug)");
  });
});
