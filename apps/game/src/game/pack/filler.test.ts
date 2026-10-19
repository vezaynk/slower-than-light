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
  return dest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("filler lists", () => {
  it("stores each row's page id in authored order", () => {
    for (const row of [
      ...FILLER,
      ...NEBULA,
      ...DISTRESS,
      ...ITEMS,
      ...EXIT_NEUTRAL,
      ...EXIT_ITEMS,
    ]) {
      assert.equal(row.id, pageForRow(row.dest)?.slug ?? formula(row.dest), row.dest);
    }
    assert.equal(fillerList("filler")?.entries.length, FILLER.length);
    assert.equal(fillerList("filler")?.entries[0]?.id, FILLER[0]?.id);
    assert.equal(fillerList("nebula")?.entries.length, NEBULA.length);
    assert.equal(fillerList("distress")?.entries.length, DISTRESS.length);
    assert.equal(fillerList("items")?.entries.length, ITEMS.length);
    assert.equal(fillerList("exitNeutral")?.entries.length, EXIT_NEUTRAL.length);
    assert.equal(fillerList("exitItems")?.entries.length, EXIT_ITEMS.length);
    assert.equal(
      fillerList("exitItems")?.entries.some((entry) => entry.id === "large-trade-station"),
      true,
    );
  });

  it("draws an appended list and leaves the campaign list in place", () => {
    const before = fillerList("filler")?.entries.length;
    loadPack(
      { lists: [{ id: "ember-list", entries: [{ id: "large-asteroid-field", unique: false }] }] },
      "append",
    );
    assert.equal(fillerList("filler")?.entries.length, before);
    const page = drawFiller(createGame(1), "ember-list", []);
    assert.equal(page, pageForRow("Large asteroid field"));
    assert.equal(page?.slug, "large-asteroid-field");
    resetPackForTests();
    assert.equal(drawFiller(createGame(1), "ember-list", []), null);
    assert.equal(fillerList("filler")?.entries.length, before);
  });

  it("replaces a campaign list when the same id is appended", () => {
    loadPack(
      { lists: [{ id: "filler", entries: [{ id: "large-asteroid-field", unique: false }] }] },
      "append",
    );
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
    loadPack(
      { lists: [{ id: "ember-list", entries: [{ id: "refueling-station", unique: false }] }] },
      "append",
    );
    assert.equal(drawFiller(createGame(1), "ember-list", []), pageForRow("Refueling station"));
  });

  it("reads an appended empty beacon and falls back to Civilian", () => {
    loadPack(
      {
        empties: [
          {
            id: "ember-quiet",
            dest: "Ember quiet",
            sectors: ["Ember Reach"],
            texts: ["The reach is still."],
          },
        ],
      },
      "append",
    );
    assert.equal(emptyPageFor("Ember Reach").dest, "Ember quiet");
    assert.deepEqual(emptyPageFor("Ember Reach").texts, ["The reach is still."]);
    assert.equal(emptyPageFor("CIVILIAN_SECTOR").dest, "Empty beacon (Civilian)");
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
    const beacon = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
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
    for (const id of [
      "no-fuel-fuel-trader-distress-off",
      "no-fuel-fuel-trader-distress-on",
      "no-fuel-prepare-to-dock",
    ]) {
      const rows = eventDef(id)?.offers ?? [];
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "high").length, 3, id);
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "pt2").length, 3, id);
    }
    const lanius = eventDef("lanius-trader")?.offers ?? [];
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "base").length, 3);
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "better").length, 3);
    const translator = eventDef("lanius-trader-with-translator")?.offers ?? [];
    assert.equal(translator.length, 3);
    assert.equal(
      translator.every((row) => row.k === "lanius" && row.band === "base"),
      true,
    );
    const supply = eventDef("improve-reactor-for-supplies")?.offers ?? [];
    assert.equal(supply.length, 3);
    assert.equal(
      supply.some((row) => row.k === "supply" && row.fuel[0] === 0 && row.fuel[1] === 0),
      true,
    );

    const row = eventDef("trade-resources");
    assert.ok(row);
    loadPack(
      {
        events: [
          {
            ...row,
            offers: [{ k: "trade", pay: "parts", cost: [2, 2], get: "fuel", gain: [9, 9] }],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    const beacon = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
    assert.ok(beacon);
    beacon.flag = row.flag;
    assert.match(citedEvent(g, beacon)?.body ?? "", /You lose 2 drone parts and receive 9 fuel\./);
    resetPackForTests();
    assert.equal(eventDef("trade-resources")?.offers?.length, 4);
  });

  it("stores the campaign roll lists and draws an appended entry", () => {
    const hulls = eventDef("fight-in-last-stand")?.rolls ?? [];
    assert.equal(hulls.length, 12);
    assert.equal(hulls.filter((row) => row.k === "hull" && row.id === "Auto-Scout").length, 2);
    const labels = eventDef("rebel-checkpoint")?.rolls ?? [];
    assert.deepEqual(
      labels.map((row) => (row.k === "label" ? row.text : "")),
      [
        "Fly behind a moon and stay hidden.",
        "Shut down all non-vital systems and stay hidden.",
        "Stay quiet and hope they don't notice you.",
        "Stay out of their way and charge your FTL drive.",
      ],
    );
    const moons = eventDef("slug-moons-question")?.rolls ?? [];
    assert.deepEqual(moons, [
      { k: "count", n: 5, word: "five" },
      { k: "count", n: 6, word: "six" },
      { k: "count", n: 7, word: "seven" },
      { k: "count", n: 11, word: "eleven" },
    ]);

    const stand = eventDef("fight-in-last-stand");
    assert.ok(stand);
    loadPack({ events: [{ ...stand, rolls: [{ k: "hull", id: "Ember" }] }] }, "append");
    const g = createGame(1);
    const beacon = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
    assert.ok(beacon);
    beacon.flag = stand.flag;
    assert.equal(citedEvent(g, beacon)?.choices[0]?.id, "c:fight-in-last-stand:go:Ember");
    resetPackForTests();
    assert.equal(eventDef("fight-in-last-stand")?.rolls?.length, 12);

    const checkpoint = eventDef("rebel-checkpoint");
    assert.ok(checkpoint);
    loadPack(
      { events: [{ ...checkpoint, rolls: [{ k: "label", text: "Ember hide." }] }] },
      "append",
    );
    beacon.flag = checkpoint.flag;
    const card = citedEvent(createGame(1), beacon);
    assert.equal(
      card?.choices.find((choice) => choice.id === "c:rebel-checkpoint:1")?.label,
      "Ember hide.",
    );
    resetPackForTests();
    assert.equal(eventDef("rebel-checkpoint")?.rolls?.length, 4);

    const moonsPage = eventDef("slug-moons-question");
    assert.ok(moonsPage);
    loadPack({ events: [{ ...moonsPage, rolls: [{ k: "count", n: 9, word: "nine" }] }] }, "append");
    beacon.flag = moonsPage.flag;
    const moonCard = citedEvent(createGame(1), beacon);
    assert.match(moonCard?.body ?? "", /one of the nine moons/);
    assert.equal(moonCard?.choices[0]?.id, "c:slug-moons-question:ask:9");
    resetPackForTests();
    assert.equal(eventDef("slug-moons-question")?.rolls?.length, 4);
  });

  it("stores the refugee trading cards and draws an appended card", () => {
    const cards = eventDef("no-fuel-refugee-trading")?.cards ?? [];
    assert.equal(cards.length, 3);
    assert.deepEqual(
      cards.map((card) => card.choices.map((choice) => choice.id)),
      [
        ["c:no-fuel-refugee-trading:low"],
        [
          "c:no-fuel-refugee-trading:trade",
          "c:no-fuel-refugee-trading:engi",
          "c:no-fuel-refugee-trading:refuse",
          "c:no-fuel-refugee-trading:attack",
        ],
        ["c:no-fuel-refugee-trading:missiles", "c:no-fuel-refugee-trading:arm-no"],
      ],
    );
    assert.match(cards[0]?.body ?? "", /offers to split its remaining fuel/);
    assert.match(cards[1]?.body ?? "", /its hull looks damaged/);
    assert.match(cards[2]?.body ?? "", /bad need of armaments/);

    const page = eventDef("no-fuel-refugee-trading");
    assert.ok(page);
    loadPack(
      {
        events: [
          {
            ...page,
            cards: [
              {
                body: "Ember offers fuel.",
                choices: [{ id: "c:no-fuel-refugee-trading:ember", label: "Take it." }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    const beacon = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
    assert.ok(beacon);
    beacon.flag = page.flag;
    const card = citedEvent(g, beacon);
    assert.equal(card?.body, "Ember offers fuel.");
    assert.equal(card?.choices[0]?.id, "c:no-fuel-refugee-trading:ember");
    resetPackForTests();
    assert.equal(eventDef("no-fuel-refugee-trading")?.cards?.length, 3);
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
    assert.match(
      fillerEvent(g, beacon)?.choices[0]?.id ?? "",
      /^s:friendly-ship-out-of-fuel:give:\d+$/,
    );
  });

  it("stamps the packed nebula sentences onto a quiet nebula beacon", () => {
    const g = createGame(1);
    const beacon = g.beacons[0];
    assert.ok(beacon);
    stampEmptyNebula(beacon, "NEBULA_SECTOR");
    assert.equal(beacon.flag, "filler:empty-nebula-beacon");
    assert.equal(beacon.name, "Empty nebula beacon");
    stampEmptyNebula(beacon, "SLUG_HOME");
    assert.equal(beacon.flag, "filler:empty-nebula-beacon-slug");
    assert.equal(beacon.name, "Empty nebula beacon (Slug)");
  });
});
