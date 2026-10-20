import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ftlEventId } from "@stl/catalog/src/wiki/ftl-event-ids.ts";
import { packId } from "@stl/catalog/src/wiki/ftl-slugs.ts";
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
      const slug = pageForRow(row.dest)?.slug ?? formula(row.dest);
      assert.ok(slug === row.id || slug === ftlEventId(row.dest), row.dest);
    }
    assert.equal(fillerList("FILLER")?.entries.length, FILLER.length);
    assert.equal(
      fillerList("FILLER")?.entries[0]?.id,
      ftlEventId(FILLER[0]?.dest ?? "") ?? FILLER[0]?.id,
    );
    assert.equal(fillerList("NEBULA")?.entries.length, NEBULA.length);
    assert.equal(fillerList("DISTRESS")?.entries.length, DISTRESS.length);
    assert.equal(fillerList("ITEMS")?.entries.length, ITEMS.length);
    assert.equal(fillerList("EXIT_NEUTRAL")?.entries.length, EXIT_NEUTRAL.length);
    assert.equal(fillerList("EXIT_ITEMS")?.entries.length, EXIT_ITEMS.length);
    assert.equal(
      fillerList("EXIT_ITEMS")?.entries.some((entry) => entry.id === "STORE_REBELSIDE"),
      true,
    );
  });

  it("draws an appended list and leaves the campaign list in place", () => {
    const before = fillerList("FILLER")?.entries.length;
    loadPack(
      { lists: [{ id: "ember-list", entries: [{ id: "large-asteroid-field", unique: false }] }] },
      "append",
    );
    assert.equal(fillerList("FILLER")?.entries.length, before);
    const page = drawFiller(createGame(1), "ember-list", []);
    assert.equal(page, pageForRow("Large asteroid field"));
    assert.equal(page?.slug, "ASTEROID_EXPLORE");
    resetPackForTests();
    assert.equal(drawFiller(createGame(1), "ember-list", []), null);
    assert.equal(fillerList("FILLER")?.entries.length, before);
  });

  it("replaces a campaign list when the same id is appended", () => {
    loadPack(
      { lists: [{ id: "FILLER", entries: [{ id: "large-asteroid-field", unique: false }] }] },
      "append",
    );
    assert.equal(fillerList("FILLER")?.entries.length, 1);
    assert.equal(fillerList("NEBULA")?.entries.length, NEBULA.length);
    const page = drawFiller(createGame(1), "FILLER", []);
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
      const record = eventDef(packId(page.slug));
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
    assert.equal(eventDef("REFUEL_STATION")?.choices[0]?.label, "Buy 6 Fuel for 12 Scrap");
    assert.equal(eventDef("TRAP_BEACON")?.body, "");
    assert.equal(eventDef("TRAP_BEACON")?.texts?.length, 4);
    assert.equal(eventDef("PIRATE")?.body, "");
    assert.equal(eventDef("PIRATE")?.texts?.length, 5);
    const hire = eventDef("TAVERN_HIRE");
    assert.equal(hire?.texts?.length, 3);
    assert.equal(hire?.body, hire?.texts?.[0]);
    const slugFight = eventDef("SLUG_REBEL");
    assert.ok(slugFight?.texts && slugFight.texts.length > 1);
    assert.notEqual(slugFight.body, slugFight.texts?.[0]);
    assert.equal(eventDef("AUTO_WARNING")?.texts?.length, 9);
    assert.deepEqual(eventDef("AUTO_WARNING")?.texts, eventDef("REBEL_AUTO")?.texts);
    const before = allEvents().length;
    loadPack(
      {
        events: [
          {
            id: "ASTEROID_EXPLORE",
            dest: "Ember field",
            flag: "ASTEROID_EXPLORE",
            aliases: [],
            sectors: [],
            body: "Replaced.",
            choices: [{ id: "c:large-asteroid-field:0", label: "Go", fx: [{ k: "nothing" }] }],
          },
        ],
        lists: [{ id: "ember-list", entries: [{ id: "ASTEROID_EXPLORE", unique: false }] }],
      },
      "append",
    );
    assert.equal(allEvents().length, before);
    assert.equal(drawFiller(createGame(1), "ember-list", [])?.body, "Replaced.");
    resetPackForTests();
    assert.equal(eventDef("ASTEROID_EXPLORE")?.dest, "Large asteroid field");
  });

  it("rolls an appended opening list and restores the campaign sentences", () => {
    const row = eventDef("PIRATE");
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
    assert.equal(eventDef("PIRATE")?.texts?.length, 5);
    assert.equal(eventDef("PIRATE")?.texts?.includes("Ember one."), false);
  });

  it("stores the campaign offer rows and rolls an appended trade", () => {
    const trade = eventDef("TRADER_CIV")?.offers ?? [];
    const nebula = eventDef("NEBULA_TRADER")?.offers ?? [];
    assert.equal(trade.length, 4);
    assert.deepEqual(nebula, trade);
    for (const id of [
      "no-fuel-fuel-trader-distress-off",
      "no-fuel-fuel-trader-distress-on",
      "no-fuel-prepare-to-dock",
    ]) {
      const rows = eventDef(packId(id))?.offers ?? [];
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "high").length, 3, id);
      assert.equal(rows.filter((row) => row.k === "fuel" && row.band === "pt2").length, 3, id);
    }
    const lanius = eventDef("LANIUS_TRADER")?.offers ?? [];
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "base").length, 3);
    assert.equal(lanius.filter((row) => row.k === "lanius" && row.band === "better").length, 3);
    const translator = eventDef("LANIUS_TRADER_TRANSLATOR")?.offers ?? [];
    assert.equal(translator.length, 3);
    assert.equal(
      translator.every((row) => row.k === "lanius" && row.band === "base"),
      true,
    );
    const supply = eventDef("TRADER_UPGRADES_EXCHANGE")?.offers ?? [];
    assert.equal(supply.length, 3);
    assert.equal(
      supply.some((row) => row.k === "supply" && row.fuel[0] === 0 && row.fuel[1] === 0),
      true,
    );

    const row = eventDef("TRADER_CIV");
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
    assert.equal(eventDef("TRADER_CIV")?.offers?.length, 4);
  });

  it("stores the campaign roll lists and draws an appended entry", () => {
    const hulls = eventDef("BOSS_SCOUT")?.rolls ?? [];
    assert.equal(hulls.length, 12);
    assert.equal(hulls.filter((row) => row.k === "hull" && row.id === "Auto-Scout").length, 2);
    const labels = eventDef("REBEL_CHECKPOINT")?.rolls ?? [];
    assert.deepEqual(
      labels.map((row) => (row.k === "label" ? row.text : "")),
      [
        "Fly behind a moon and stay hidden.",
        "Shut down all non-vital systems and stay hidden.",
        "Stay quiet and hope they don't notice you.",
        "Stay out of their way and charge your FTL drive.",
      ],
    );
    const moons = eventDef("SLUG_DISTRESS_QUESTION")?.rolls ?? [];
    assert.deepEqual(moons, [
      { k: "count", n: 5, word: "five" },
      { k: "count", n: 6, word: "six" },
      { k: "count", n: 7, word: "seven" },
      { k: "count", n: 11, word: "eleven" },
    ]);

    const stand = eventDef("BOSS_SCOUT");
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
    assert.equal(eventDef("BOSS_SCOUT")?.rolls?.length, 12);

    const checkpoint = eventDef("REBEL_CHECKPOINT");
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
    assert.equal(eventDef("REBEL_CHECKPOINT")?.rolls?.length, 4);

    const moonsPage = eventDef("SLUG_DISTRESS_QUESTION");
    assert.ok(moonsPage);
    loadPack({ events: [{ ...moonsPage, rolls: [{ k: "count", n: 9, word: "nine" }] }] }, "append");
    beacon.flag = moonsPage.flag;
    const moonCard = citedEvent(createGame(1), beacon);
    assert.match(moonCard?.body ?? "", /one of the nine moons/);
    assert.equal(moonCard?.choices[0]?.id, "c:slug-moons-question:ask:9");
    resetPackForTests();
    assert.equal(eventDef("SLUG_DISTRESS_QUESTION")?.rolls?.length, 4);
  });

  it("stores the refugee trading cards and draws an appended card", () => {
    const cards = eventDef("NO_FUEL_REFUGEE")?.cards ?? [];
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

    const page = eventDef("NO_FUEL_REFUGEE");
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
    assert.equal(eventDef("NO_FUEL_REFUGEE")?.cards?.length, 3);
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
    assert.equal(beacon.flag, "filler:NEBULA_EMPTY");
    assert.equal(beacon.name, "Empty nebula beacon");
    stampEmptyNebula(beacon, "SLUG_HOME");
    assert.equal(beacon.flag, "filler:NEBULA_NOTHING_SLUG");
    assert.equal(beacon.name, "Empty nebula beacon (Slug)");
  });
});
