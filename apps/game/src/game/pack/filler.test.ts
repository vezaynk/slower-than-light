import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fillerList, loadPack, resetPackForTests } from "@stl/pack";
import { createGame } from "../sim.ts";
import "./base.ts";
import {
  DISTRESS,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  ITEMS,
  NEBULA,
  drawFiller,
  emptyPageFor,
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
