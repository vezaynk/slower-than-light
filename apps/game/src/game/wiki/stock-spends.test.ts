import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allEvents, eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { ChoiceReq, EventDef } from "@stl/pack";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit, KitId } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { stockCount, type StockKind } from "./choice-locks.ts";
import { fillerEvent } from "./filler-events.ts";
import { pageWin, questEvent } from "./quests.ts";
import { stampStockLabels } from "./stock-labels.ts";
import { joinCrew } from "./surrender.ts";

afterEach(() => resetPackForTests());

function holds(ev: EventDef, id: string): boolean {
  return (
    ev.choices.some((choice) => choice.id === id) ||
    (ev.cards ?? []).some((card) => card.choices.some((choice) => choice.id === id))
  );
}

function rewriteStock(id: string, reqs: ChoiceReq[] | undefined) {
  const hits = allEvents().filter((ev) => holds(ev, id));
  assert.ok(hits.length > 0, id);
  const mapChoice = <T extends { id: string; reqs?: ChoiceReq[] }>(choice: T): T =>
    choice.id === id ? { ...choice, reqs } : choice;
  loadPack(
    {
      events: hits.map((ev) => ({
        ...ev,
        choices: ev.choices.map(mapChoice),
        ...(ev.cards
          ? { cards: ev.cards.map((card) => ({ ...card, choices: card.choices.map(mapChoice) })) }
          : {}),
      })),
    },
    "append",
  );
}

function stock(kind: StockKind, n: number, text = `Need ${n} ${kind}`): ChoiceReq {
  return { k: "stock", id: kind, n, text };
}

function kit(id: KitId, level = 1): Kit {
  return { id, level, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function gun(defId: string) {
  return { uid: defId, defId, charge: 0, enabled: false, autofire: false, target: null as string | null };
}

function spot(g: Game) {
  const beacon = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(beacon);
  return beacon;
}

function labelOf(choices: { id: string; label: string }[] | undefined, id: string): string | undefined {
  return choices?.find((choice) => choice.id === id)?.label;
}

const CAMPAIGN: [string, StockKind, number][] = [
  ["q:lanius-translator:buy", "scrap", 40],
  ["s:zoltan-raft:hire", "scrap", 40],
  ["q:engi-distress:scrap", "scrap", 25],
  ["q:engi-distress:supplies", "scrap", 40],
  ["q:engi-distress:supplies", "missiles", 2],
  ["q:engi-distress:supplies", "fuel", 2],
  ["c:zoltan-trade-hub:2", "scrap", 10],
  ["c:no-fuel-slug-fuel-trader:pay", "scrap", 15],
  ["c:no-fuel-slug-fuel-trader:slug", "scrap", 15],
  ["c:no-fuel-refugee-trading:trade", "scrap", 10],
  ["c:no-fuel-refugee-trading:better", "scrap", 10],
  ["c:no-fuel-refugee-trading:again", "scrap", 10],
  ["c:no-fuel-refugee-trading:missiles", "missiles", 1],
  ["c:slug-repair-station:accept50", "scrap", 50],
  ["c:slug-repair-station:scrap50", "scrap", 50],
  ["c:slug-repair-station:fuel", "fuel", 15],
  ["c:refueling-station:0", "scrap", 12],
  ["c:refueling-station:1", "scrap", 6],
  ["c:refueling-station:2", "scrap", 2],
  ["c:asteroid-mining-colony:1", "missiles", 5],
  ["c:asteroid-mining-colony:2", "missiles", 15],
  ["q:war-camp:missile", "missiles", 1],
  ["q:war-camp:firebomb", "missiles", 2],
  ["q:loyalists:heal", "missiles", 1],
  ["q:station:fuel4", "fuel", 4],
  ["q:station:fuel1", "fuel", 1],
  ["c:zoltan-odd-moon:drone", "parts", 1],
  ["c:no-fuel-engi-ship-repair:2", "parts", 1],
  ["c:crystalline-cache:breach", "missiles", 1],
  ["q:asteroid:defense", "parts", 1],
  ["q:asteroid:repair", "parts", 1],
  ["c:auto-ship-near-storage-station-in-nebula:4", "parts", 1],
  ["c:auto-ship-near-storage-station-in-nebula:5", "parts", 1],
  ["c:auto-ship-near-radar-station:2", "parts", 1],
  ["q:auto-radar:drone", "parts", 1],
  ["q:merchant:paltry", "parts", 5],
  ["q:merchant:full", "parts", 5],
  ["q:merchant:weapons", "parts", 5],
  ["c:mantis-ships-battle-for-rock-freighter:3", "parts", 1],
  ["s:rock-mine:beam", "parts", 1],
];

describe("packed stock counts", () => {
  it("reads the campaign count for every button that already stores one", () => {
    for (const [id, kind, n] of CAMPAIGN) assert.equal(stockCount(id, kind), n, `${id} ${kind}`);
    assert.equal(stockCount("c:zoltan-odd-moon:boom", "missiles"), null);
    assert.equal(stockCount("q:research:drone", "parts"), null);
    assert.equal(stockCount("c:mantis-ships-battle-for-rock-freighter:2", "parts"), null);
  });

  it("restores a campaign count after a rewrite", () => {
    rewriteStock("q:lanius-translator:buy", undefined);
    assert.equal(stockCount("q:lanius-translator:buy", "scrap"), null);
    resetPackForTests();
    assert.equal(stockCount("q:lanius-translator:buy", "scrap"), 40);
    assert.equal(stockCount("c:refueling-station:0", "scrap"), 12);
  });
});

describe("stock labels", () => {
  it("prints the campaign sentence and keeps the same button when that sentence is already there", () => {
    const buy = { id: "q:lanius-translator:buy", label: "Purchase the translator for 40 scrap." };
    const once = stampStockLabels([buy]);
    assert.equal(once[0], buy);
    assert.equal(stampStockLabels(once)[0], buy);
    const slug = { id: "c:no-fuel-slug-fuel-trader:slug", label: "Have your Slug make the purchase." };
    const accept = { id: "c:slug-repair-station:accept50", label: "Accept." };
    const plain = stampStockLabels([slug, accept]);
    assert.equal(plain[0], slug);
    assert.equal(plain[1], accept);
  });

  it("overlays a rewritten count and drops a button whose printed row is gone", () => {
    const rows: [string, string, StockKind, number, string][] = [
      ["q:lanius-translator:buy", "Purchase the translator for 40 scrap.", "scrap", 7, "Purchase the translator for 7 scrap."],
      ["s:zoltan-raft:hire", "Offer to hire him for 40 scrap.", "scrap", 7, "Offer to hire him for 7 scrap."],
      ["q:engi-distress:scrap", "Give them 25 scrap.", "scrap", 7, "Give them 7 scrap."],
      ["c:no-fuel-slug-fuel-trader:pay", "Pay 15 scrap for 5 fuel.", "scrap", 4, "Pay 4 scrap for 5 fuel."],
      ["c:no-fuel-refugee-trading:trade", "Trade 10 scrap for 3 fuel.", "scrap", 4, "Trade 4 scrap for 3 fuel."],
      ["c:no-fuel-refugee-trading:better", "Accept it. 6 fuel for 10 scrap.", "scrap", 4, "Accept it. 6 fuel for 4 scrap."],
      ["c:slug-repair-station:scrap50", "Give them the 50 scrap they demand.", "scrap", 7, "Give them the 7 scrap they demand."],
      ["c:slug-repair-station:fuel", "Give them the 15 fuel they demand.", "fuel", 3, "Give them the 3 fuel they demand."],
      ["c:refueling-station:0", "Buy 6 Fuel for 12 Scrap.", "scrap", 4, "Buy 6 Fuel for 4 Scrap."],
      ["c:asteroid-mining-colony:1", "Give them the requested 5 missiles.", "missiles", 7, "Give them the requested 7 missiles."],
      ["c:asteroid-mining-colony:2", "Give them 15 missiles.", "missiles", 7, "Give them 7 missiles."],
      ["q:station:fuel4", "Give them the requested 4 fuel.", "fuel", 3, "Give them the requested 3 fuel."],
      ["q:station:fuel1", "Give them 1 fuel.", "fuel", 3, "Give them 3 fuel."],
    ];
    for (const [id, campaign, kind, n, next] of rows) {
      assert.equal(stampStockLabels([{ id, label: "old" }])[0]?.label, campaign, id);
      rewriteStock(id, [stock(kind, n)]);
      assert.equal(stampStockLabels([{ id, label: "old" }])[0]?.label, next, id);
      rewriteStock(id, undefined);
      assert.equal(stampStockLabels([{ id, label: campaign }]).length, 0, id);
      resetPackForTests();
    }
    const numberless = { id: "c:slug-repair-station:accept50", label: "Accept." };
    rewriteStock(numberless.id, undefined);
    assert.equal(stampStockLabels([numberless])[0], numberless);
  });

  it("drops the supplies button unless scrap, missiles, and fuel are all packed", () => {
    assert.equal(
      stampStockLabels([{ id: "q:engi-distress:supplies", label: "old" }])[0]?.label,
      "Give them 40 scrap, 2 missiles and 2 fuel.",
    );
    rewriteStock("q:engi-distress:supplies", [stock("scrap", 4), stock("fuel", 1)]);
    assert.equal(stampStockLabels([{ id: "q:engi-distress:supplies", label: "old" }]).length, 0);
    rewriteStock("q:engi-distress:supplies", [stock("scrap", 4), stock("missiles", 1), stock("fuel", 1)]);
    assert.equal(
      stampStockLabels([{ id: "q:engi-distress:supplies", label: "old" }])[0]?.label,
      "Give them 4 scrap, 1 missiles and 1 fuel.",
    );
  });
});

describe("stock spends", () => {
  it("sells the packed scrap at the refueling station and leaves the stored label alone", () => {
    const g = createGame(1);
    const beacon = spot(g);
    beacon.flag = "filler:refueling-station";
    assert.equal(labelOf(fillerEvent(g, beacon)?.choices, "c:refueling-station:0"), "Buy 6 Fuel for 12 Scrap.");
    assert.equal(eventDef("refueling-station")?.choices[0]?.label, "Buy 6 Fuel for 12 Scrap");

    rewriteStock("c:refueling-station:0", [stock("scrap", 4)]);
    assert.equal(labelOf(fillerEvent(g, beacon)?.choices, "c:refueling-station:0"), "Buy 6 Fuel for 4 Scrap.");
    assert.equal(eventDef("refueling-station")?.choices[0]?.label, "Buy 6 Fuel for 12 Scrap");
    const had = g.fuel;
    g.scrap = 3;
    const short = g.seed;
    choose(g, "c:refueling-station:0");
    assert.equal(g.scrap, 3);
    assert.equal(g.fuel, had);
    assert.equal(g.seed, short);
    g.scrap = 4;
    choose(g, "c:refueling-station:0");
    assert.equal(g.scrap, 0);
    assert.equal(g.fuel, had + 6);

    resetPackForTests();
    rewriteStock("c:refueling-station:0", undefined);
    const skipped = createGame(2);
    const quiet = spot(skipped);
    quiet.flag = "filler:refueling-station";
    assert.equal(fillerEvent(skipped, quiet)?.choices.some((choice) => choice.id === "c:refueling-station:0"), false);
    skipped.scrap = 40;
    const fuel = skipped.fuel;
    const seed = skipped.seed;
    choose(skipped, "c:refueling-station:0");
    assert.equal(skipped.scrap, 40);
    assert.equal(skipped.fuel, fuel);
    assert.equal(skipped.seed, seed);
  });

  it("spends the packed missile count on the five-missile miner reward", () => {
    const shown = createGame(1);
    const beacon = spot(shown);
    beacon.flag = "filler:asteroid-mining-colony";
    assert.equal(
      labelOf(fillerEvent(shown, beacon)?.choices, "c:asteroid-mining-colony:1"),
      "Give them the requested 5 missiles.",
    );
    rewriteStock("c:asteroid-mining-colony:1", [stock("missiles", 7)]);
    assert.equal(
      labelOf(fillerEvent(shown, beacon)?.choices, "c:asteroid-mining-colony:1"),
      "Give them the requested 7 missiles.",
    );
    const paid = createGame(2);
    paid.missiles = 7;
    choose(paid, "c:asteroid-mining-colony:1");
    assert.equal(paid.missiles, 0);
    assert.match(paid.event?.body ?? "", /thank you/i);
    assert.doesNotMatch(paid.event?.body ?? "", /Wow/);

    const short = createGame(3);
    short.missiles = 6;
    const seed = short.seed;
    choose(short, "c:asteroid-mining-colony:1");
    assert.equal(short.missiles, 6);
    assert.equal(short.seed, seed);

    resetPackForTests();
    rewriteStock("c:asteroid-mining-colony:1", undefined);
    const gone = createGame(4);
    const quiet = spot(gone);
    quiet.flag = "filler:asteroid-mining-colony";
    assert.equal(fillerEvent(gone, quiet)?.choices.some((choice) => choice.id === "c:asteroid-mining-colony:1"), false);
    gone.missiles = 9;
    const held = gone.seed;
    choose(gone, "c:asteroid-mining-colony:1");
    assert.equal(gone.missiles, 9);
    assert.equal(gone.seed, held);
  });

  it("pays the Engi gift and the supply bundle from the packed rows", () => {
    const shown = createGame(1);
    assert.equal(pageWin(shown, "engi-distress-rebel-fight", false), true);
    assert.equal(labelOf(shown.event?.choices, "q:engi-distress:scrap"), "Give them 25 scrap.");
    assert.equal(labelOf(shown.event?.choices, "q:engi-distress:supplies"), "Give them 40 scrap, 2 missiles and 2 fuel.");

    const paid = createGame(2);
    paid.scrap = 25;
    const before = paid.seed;
    choose(paid, "q:engi-distress:scrap");
    assert.equal(paid.scrap, 0);
    assert.match(paid.event?.body ?? "", /Scrap: -25\./);
    assert.notEqual(paid.seed, before);

    rewriteStock("q:engi-distress:scrap", undefined);
    const skipped = createGame(3);
    skipped.scrap = 25;
    const seed = skipped.seed;
    choose(skipped, "q:engi-distress:scrap");
    assert.equal(skipped.scrap, 25);
    assert.equal(skipped.seed, seed);

    resetPackForTests();
    const bundle = createGame(4);
    bundle.scrap = 40;
    bundle.missiles = 2;
    bundle.fuel = 2;
    choose(bundle, "q:engi-distress:supplies");
    assert.equal(bundle.scrap, 0);
    assert.equal(bundle.missiles, 0);
    assert.equal(bundle.fuel, 0);
    assert.equal(bundle.augments.includes("medbot"), true);
    assert.match(bundle.event?.body ?? "", /Scrap: -40\./);
    assert.match(bundle.event?.body ?? "", /Missiles: -2\./);
    assert.match(bundle.event?.body ?? "", /Fuel: -2\./);

    rewriteStock("q:engi-distress:supplies", [stock("scrap", 40), stock("fuel", 2)]);
    const partial = createGame(5);
    partial.scrap = 40;
    partial.missiles = 0;
    partial.fuel = 2;
    const partialSeed = partial.seed;
    assert.equal(choiceDisabled(partial, "q:engi-distress:supplies"), null);
    choose(partial, "q:engi-distress:supplies");
    assert.equal(partial.scrap, 40);
    assert.equal(partial.missiles, 0);
    assert.equal(partial.fuel, 2);
    assert.equal(partial.augments.includes("medbot"), false);
    assert.equal(partial.seed, partialSeed);

    rewriteStock("q:engi-distress:supplies", [stock("scrap", 4), stock("missiles", 1), stock("fuel", 1)]);
    const smaller = createGame(6);
    smaller.scrap = 4;
    smaller.missiles = 1;
    smaller.fuel = 1;
    choose(smaller, "q:engi-distress:supplies");
    assert.equal(smaller.scrap, 0);
    assert.equal(smaller.missiles, 0);
    assert.equal(smaller.fuel, 0);
    assert.equal(smaller.augments.includes("medbot"), true);
    assert.match(smaller.event?.body ?? "", /Scrap: -4\./);
    assert.match(smaller.event?.body ?? "", /Missiles: -1\./);
    assert.match(smaller.event?.body ?? "", /Fuel: -1\./);
  });

  it("buys the translator for the packed scrap and hires nobody when the row is gone", () => {
    const shown = createGame(1);
    const beacon = spot(shown);
    beacon.flag = "cited:lanius-trader-with-translator";
    beacon.name = "Lanius trader with translator";
    shown.here = beacon.id;
    shown.event = citedEvent(shown, beacon);
    choose(shown, "c:lanius-trader-with-translator:4");
    assert.equal(labelOf(shown.event?.choices, "q:lanius-translator:buy"), "Purchase the translator for 40 scrap.");

    rewriteStock("q:lanius-translator:buy", [stock("scrap", 7)]);
    const renamed = createGame(2);
    const next = spot(renamed);
    next.flag = "cited:lanius-trader-with-translator";
    next.name = "Lanius trader with translator";
    renamed.here = next.id;
    renamed.event = citedEvent(renamed, next);
    choose(renamed, "c:lanius-trader-with-translator:4");
    assert.equal(labelOf(renamed.event?.choices, "q:lanius-translator:buy"), "Purchase the translator for 7 scrap.");

    resetPackForTests();
    const paid = createGame(3);
    paid.scrap = 40;
    choose(paid, "q:lanius-translator:buy");
    assert.equal(paid.scrap, 0);
    assert.equal(paid.crew.some((crew) => crew.name === "Translator"), true);

    rewriteStock("q:lanius-translator:buy", undefined);
    const skipped = createGame(4);
    const quiet = spot(skipped);
    quiet.flag = "cited:lanius-trader-with-translator";
    quiet.name = "Lanius trader with translator";
    skipped.here = quiet.id;
    skipped.event = citedEvent(skipped, quiet);
    choose(skipped, "c:lanius-trader-with-translator:4");
    assert.equal(skipped.event?.choices.some((choice) => choice.id === "q:lanius-translator:buy"), false);
    skipped.scrap = 40;
    const seed = skipped.seed;
    choose(skipped, "q:lanius-translator:buy");
    assert.equal(skipped.scrap, 40);
    assert.equal(skipped.crew.some((crew) => crew.name === "Translator"), false);
    assert.equal(skipped.seed, seed);
  });

  it("offers the raft hire at the packed scrap and rolls only after the ship can pay", () => {
    const shown = createGame(1);
    assert.equal(pageWin(shown, "zoltan-retake-the-ship", false), true);
    assert.equal(labelOf(shown.event?.choices, "s:zoltan-raft:hire"), "Offer to hire him for 40 scrap.");

    rewriteStock("s:zoltan-raft:hire", undefined);
    const gone = createGame(2);
    gone.scrap = 80;
    const goneSeed = gone.seed;
    choose(gone, "s:zoltan-raft:hire");
    assert.equal(gone.scrap, 80);
    assert.equal(gone.seed, goneSeed);

    resetPackForTests();
    rewriteStock("s:zoltan-raft:hire", [stock("scrap", 7)]);
    let accepted = false;
    for (let n = 1; n <= 40 && !accepted; n++) {
      const g = createGame(n);
      g.scrap = 7;
      choose(g, "s:zoltan-raft:hire");
      if (!g.event?.body.includes("Scrap: -7.")) continue;
      accepted = true;
      assert.equal(g.scrap, 0);
      assert.notEqual(g.seed, createGame(n).seed);
    }
    assert.equal(accepted, true);
  });

  it("spends the trade-hub fee when a Zoltan is aboard", () => {
    const bare = createGame(1);
    bare.scrap = 10;
    const bareSeed = bare.seed;
    choose(bare, "c:zoltan-trade-hub:2");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.seed, bareSeed);

    const paid = createGame(2);
    joinCrew(paid, "Zoltan");
    paid.scrap = 10;
    choose(paid, "c:zoltan-trade-hub:2");
    assert.equal(paid.scrap, 0);
    assert.match(paid.log.join("\n"), /Scrap: -10\./);

    rewriteStock("c:zoltan-trade-hub:2", undefined);
    const gone = createGame(3);
    joinCrew(gone, "Zoltan");
    gone.scrap = 10;
    const seed = gone.seed;
    choose(gone, "c:zoltan-trade-hub:2");
    assert.equal(gone.scrap, 10);
    assert.equal(gone.seed, seed);
  });

  it("buys the slug's fuel for the packed scrap and leaves the slug button's sentence alone", () => {
    const g = createGame(1);
    const beacon = spot(g);
    beacon.flag = "cited:no-fuel-slug-fuel-trader";
    beacon.name = "No fuel: Slug fuel trader";
    const card = citedEvent(g, beacon);
    assert.equal(labelOf(card?.choices, "c:no-fuel-slug-fuel-trader:pay"), "Pay 15 scrap for 5 fuel.");
    assert.equal(labelOf(card?.choices, "c:no-fuel-slug-fuel-trader:slug"), "Have your Slug make the purchase.");

    rewriteStock("c:no-fuel-slug-fuel-trader:pay", [stock("scrap", 4)]);
    const renamed = citedEvent(g, beacon);
    assert.equal(labelOf(renamed?.choices, "c:no-fuel-slug-fuel-trader:pay"), "Pay 4 scrap for 5 fuel.");
    assert.equal(labelOf(renamed?.choices, "c:no-fuel-slug-fuel-trader:slug"), "Have your Slug make the purchase.");

    resetPackForTests();
    const paid = createGame(2);
    const fuel = paid.fuel;
    paid.scrap = 15;
    choose(paid, "c:no-fuel-slug-fuel-trader:pay");
    assert.equal(paid.scrap, 0);
    assert.equal(paid.fuel, fuel + 5);

    const slug = createGame(3);
    joinCrew(slug, "Slug");
    const slugFuel = slug.fuel;
    slug.scrap = 15;
    const slugSeed = slug.seed;
    choose(slug, "c:no-fuel-slug-fuel-trader:slug");
    assert.equal(slug.scrap, 0);
    assert.equal(slug.fuel, slugFuel + 5);
    assert.equal(slug.seed, slugSeed);

    rewriteStock("c:no-fuel-slug-fuel-trader:pay", undefined);
    const quiet = createGame(4);
    const quietBeacon = spot(quiet);
    quietBeacon.flag = "cited:no-fuel-slug-fuel-trader";
    quietBeacon.name = "No fuel: Slug fuel trader";
    const quietCard = citedEvent(quiet, quietBeacon);
    assert.equal(quietCard?.choices.some((choice) => choice.id === "c:no-fuel-slug-fuel-trader:pay"), false);
    assert.equal(labelOf(quietCard?.choices, "c:no-fuel-slug-fuel-trader:slug"), "Have your Slug make the purchase.");
    quiet.scrap = 15;
    const held = quiet.fuel;
    const seed = quiet.seed;
    choose(quiet, "c:no-fuel-slug-fuel-trader:pay");
    assert.equal(quiet.scrap, 15);
    assert.equal(quiet.fuel, held);
    assert.equal(quiet.seed, seed);
  });

  it("trades the packed refugee scrap and prints the packed missile loss", () => {
    const trade = createGame(1);
    const fuel = trade.fuel;
    trade.scrap = 10;
    const seed = trade.seed;
    choose(trade, "c:no-fuel-refugee-trading:trade");
    assert.equal(trade.scrap, 0);
    assert.equal(trade.fuel, fuel + 3);
    assert.equal(trade.seed, seed);

    rewriteStock("c:no-fuel-refugee-trading:trade", undefined);
    const skipped = createGame(2);
    skipped.scrap = 10;
    const skippedFuel = skipped.fuel;
    const skippedSeed = skipped.seed;
    choose(skipped, "c:no-fuel-refugee-trading:trade");
    assert.equal(skipped.scrap, 10);
    assert.equal(skipped.fuel, skippedFuel);
    assert.equal(skipped.seed, skippedSeed);

    resetPackForTests();
    const missiles = createGame(3);
    missiles.missiles = 1;
    choose(missiles, "c:no-fuel-refugee-trading:missiles");
    assert.equal(missiles.missiles, 0);
    assert.match(`${missiles.event?.body ?? ""}\n${missiles.log.join("\n")}`, /You lose 1 missile/);

    rewriteStock("c:no-fuel-refugee-trading:missiles", [stock("missiles", 3)]);
    const three = createGame(4);
    three.missiles = 3;
    choose(three, "c:no-fuel-refugee-trading:missiles");
    assert.equal(three.missiles, 0);
    assert.match(`${three.event?.body ?? ""}\n${three.log.join("\n")}`, /You lose 3 missile/);

    rewriteStock("c:no-fuel-refugee-trading:missiles", undefined);
    const gone = createGame(5);
    gone.missiles = 1;
    const held = gone.seed;
    choose(gone, "c:no-fuel-refugee-trading:missiles");
    assert.equal(gone.missiles, 1);
    assert.equal(gone.seed, held);
  });

  it("keeps the numberless repair button and spends fifty only while the row is there", () => {
    const accept = { id: "c:slug-repair-station:accept50", label: "Accept." };
    rewriteStock(accept.id, undefined);
    assert.equal(stampStockLabels([accept])[0], accept);
    const skipped = createGame(1);
    skipped.scrap = 50;
    const seed = skipped.seed;
    choose(skipped, accept.id);
    assert.equal(skipped.scrap, 50);
    assert.equal(skipped.seed, seed);

    resetPackForTests();
    const paid = createGame(2);
    paid.scrap = 50;
    choose(paid, accept.id);
    assert.equal(paid.scrap, 0);
  });

  it("spends station fuel before the scrap reward and prints the packed count", () => {
    let found = false;
    for (let n = 1; n <= 40 && !found; n++) {
      const g = createGame(n);
      const beacon = spot(g);
      beacon.quest = "space-station";
      g.here = beacon.id;
      const card = questEvent(g, beacon);
      if (!card?.choices.some((choice) => choice.id === "q:station:fuel4")) continue;
      found = true;
      assert.equal(labelOf(card.choices, "q:station:fuel4"), "Give them the requested 4 fuel.");
      assert.equal(labelOf(card.choices, "q:station:fuel1"), "Give them 1 fuel.");
    }
    assert.equal(found, true);

    const paid = createGame(2);
    paid.fuel = 4;
    const before = paid.seed;
    choose(paid, "q:station:fuel4");
    assert.equal(paid.fuel, 0);
    assert.notEqual(paid.seed, before);

    const one = createGame(3);
    one.fuel = 1;
    const oneSeed = one.seed;
    choose(one, "q:station:fuel1");
    assert.equal(one.fuel, 0);
    assert.equal(one.seed, oneSeed);

    rewriteStock("q:station:fuel4", undefined);
    const gone = createGame(4);
    gone.fuel = 4;
    const seed = gone.seed;
    choose(gone, "q:station:fuel4");
    assert.equal(gone.fuel, 4);
    assert.equal(gone.seed, seed);
  });

  it("spends a merchant's packed parts and still grants five on delivery", () => {
    const paid = createGame(1);
    paid.player.parts = 5;
    const before = paid.seed;
    choose(paid, "q:merchant:paltry");
    assert.equal(paid.player.parts, 0);
    assert.match(paid.event?.body ?? "", /Drone parts: -5\./);
    assert.notEqual(paid.seed, before);

    rewriteStock("q:merchant:paltry", undefined);
    const gone = createGame(2);
    gone.player.parts = 5;
    const seed = gone.seed;
    choose(gone, "q:merchant:paltry");
    assert.equal(gone.player.parts, 5);
    assert.equal(gone.seed, seed);

    resetPackForTests();
    rewriteStock("q:merchant:paltry", [stock("parts", 2)]);
    const two = createGame(3);
    two.player.parts = 2;
    choose(two, "q:merchant:paltry");
    assert.equal(two.player.parts, 0);
    assert.match(two.event?.body ?? "", /Drone parts: -2\./);

    resetPackForTests();
    const deliver = createGame(4);
    deliver.player.parts = 0;
    choose(deliver, "q:merchant:deliver");
    assert.equal(deliver.player.parts, 5);
  });

  it("spends one asteroid-defense part and does not roll when the row is gone", () => {
    const paid = createGame(1);
    paid.player.parts = 1;
    const before = paid.seed;
    choose(paid, "q:asteroid:defense");
    assert.equal(paid.player.parts, 0);
    assert.notEqual(paid.seed, before);

    rewriteStock("q:asteroid:defense", undefined);
    const gone = createGame(2);
    gone.player.parts = 1;
    const seed = gone.seed;
    choose(gone, "q:asteroid:defense");
    assert.equal(gone.player.parts, 1);
    assert.equal(gone.seed, seed);
  });

  it("holds the war-camp missile until the ship has both the weapon and the ammo", () => {
    const bare = createGame(1);
    bare.missiles = 1;
    const seed = bare.seed;
    choose(bare, "q:war-camp:missile");
    assert.equal(bare.missiles, 1);
    assert.equal(bare.phase, "map");
    assert.equal(bare.seed, seed);

    const paid = createGame(2);
    paid.player.weapons.push(gun("artemis"));
    paid.missiles = 1;
    choose(paid, "q:war-camp:missile");
    assert.equal(paid.missiles, 0);
    assert.equal(paid.phase, "combat");
  });

  it("spends a boarding-drone part and leaves the moon's missile blast on its literal one", () => {
    const paid = createGame(1);
    paid.player.kits.swarm = kit("swarm", 2);
    paid.player.kits.swarm.target = "board";
    paid.player.parts = 1;
    const sparks = paid.crew.filter((crew) => crew.kin === "spark").length;
    choose(paid, "c:zoltan-odd-moon:drone");
    assert.equal(paid.player.parts, 0);
    assert.equal(paid.crew.filter((crew) => crew.kin === "spark").length, sparks + 1);
    assert.match(paid.event?.body ?? "", /Drone parts: -1\./);

    rewriteStock("c:zoltan-odd-moon:drone", undefined);
    const gone = createGame(2);
    gone.player.kits.swarm = kit("swarm", 2);
    gone.player.kits.swarm.target = "board";
    gone.player.parts = 1;
    const held = gone.crew.filter((crew) => crew.kin === "spark").length;
    const seed = gone.seed;
    choose(gone, "c:zoltan-odd-moon:drone");
    assert.equal(gone.player.parts, 1);
    assert.equal(gone.crew.filter((crew) => crew.kin === "spark").length, held);
    assert.equal(gone.seed, seed);
    assert.equal(stockCount("c:zoltan-odd-moon:boom", "missiles"), null);
  });

  it("spends a hull-repair part before the fuel gift", () => {
    const paid = createGame(1);
    paid.player.kits.swarm = kit("swarm", 2);
    paid.player.kits.swarm.target = "hull";
    paid.player.parts = 1;
    const fuel = paid.fuel;
    choose(paid, "c:no-fuel-engi-ship-repair:2");
    assert.equal(paid.player.parts, 0);
    assert.ok(paid.fuel >= fuel + 4 && paid.fuel <= fuel + 6);

    rewriteStock("c:no-fuel-engi-ship-repair:2", undefined);
    const gone = createGame(2);
    gone.player.kits.swarm = kit("swarm", 2);
    gone.player.kits.swarm.target = "hull";
    gone.player.parts = 1;
    const held = gone.fuel;
    const seed = gone.seed;
    choose(gone, "c:no-fuel-engi-ship-repair:2");
    assert.equal(gone.player.parts, 1);
    assert.equal(gone.fuel, held);
    assert.equal(gone.seed, seed);
  });

  it("spends the cache missile before the search and prints the story without a count", () => {
    const paid = createGame(1);
    paid.player.weapons.push(gun("breachmissiles"));
    paid.missiles = 1;
    const before = paid.seed;
    choose(paid, "c:crystalline-cache:breach");
    assert.equal(paid.missiles, 0);
    assert.match(paid.log.join("\n"), /Breach warheads/);
    assert.notEqual(paid.seed, before);

    rewriteStock("c:crystalline-cache:breach", undefined);
    const gone = createGame(2);
    gone.missiles = 1;
    const seed = gone.seed;
    choose(gone, "c:crystalline-cache:breach");
    assert.equal(gone.missiles, 1);
    assert.equal(gone.seed, seed);
  });

  it("spends one hacking part at the storage station and one combat-drone part at the radar", () => {
    const storage = createGame(1);
    storage.player.kits.spike = kit("spike", 1);
    storage.player.parts = 1;
    const storageSeed = storage.seed;
    choose(storage, "c:auto-ship-near-storage-station-in-nebula:4");
    assert.equal(storage.player.parts, 0);
    assert.notEqual(storage.seed, storageSeed);

    rewriteStock("c:auto-ship-near-storage-station-in-nebula:4", undefined);
    const quiet = createGame(2);
    quiet.player.kits.spike = kit("spike", 1);
    quiet.player.parts = 1;
    const quietSeed = quiet.seed;
    choose(quiet, "c:auto-ship-near-storage-station-in-nebula:4");
    assert.equal(quiet.player.parts, 1);
    assert.equal(quiet.seed, quietSeed);

    resetPackForTests();
    const radar = createGame(3);
    radar.player.kits.swarm = kit("swarm", 1);
    radar.player.kits.swarm.target = "striker";
    radar.player.parts = 1;
    choose(radar, "c:auto-ship-near-radar-station:2");
    assert.equal(radar.player.parts, 0);
    assert.match(radar.log.join("\n"), /Drone parts: -1\./);

    const fleet = createGame(4);
    fleet.player.kits.spike = kit("spike", 1);
    fleet.player.parts = 1;
    const delay = fleet.fleet;
    const fleetSeed = fleet.seed;
    choose(fleet, "q:auto-radar:drone");
    assert.equal(fleet.player.parts, 0);
    assert.equal(fleet.fleet, Math.max(0, delay - 1));
    assert.equal(fleet.seed, fleetSeed);
  });

  it("spends a hull-repair part on the freighter and a beam-drone part on the mine", () => {
    const freighter = createGame(1);
    freighter.player.kits.swarm = kit("swarm", 2);
    freighter.player.kits.swarm.target = "hull";
    freighter.player.parts = 1;
    choose(freighter, "c:mantis-ships-battle-for-rock-freighter:3");
    assert.equal(freighter.player.parts, 0);
    assert.equal(freighter.phase, "combat");
    assert.equal(stockCount("c:mantis-ships-battle-for-rock-freighter:2", "parts"), null);

    const mine = createGame(2);
    mine.player.kits.swarm = kit("swarm", 2);
    mine.player.kits.swarm.target = "beam2";
    mine.player.parts = 1;
    const ignored = mine.seed;
    choose(mine, "s:rock-mine:beam");
    assert.equal(mine.player.parts, 1);
    assert.equal(mine.seed, ignored);
    mine.player.kits.swarm.target = "beam";
    choose(mine, "s:rock-mine:beam");
    assert.equal(mine.player.parts, 0);
    assert.match(mine.event?.body ?? "", /Drone parts: -1\./);
  });

  it("spends the healing missile only when a Healing Burst is fitted", () => {
    const bare = createGame(1);
    bare.missiles = 1;
    const seed = bare.seed;
    choose(bare, "q:loyalists:heal");
    assert.equal(bare.missiles, 1);
    assert.equal(bare.seed, seed);

    const paid = createGame(2);
    paid.player.weapons.push(gun("healburst"));
    paid.missiles = 1;
    choose(paid, "q:loyalists:heal");
    assert.equal(paid.missiles, 0);
    assert.match(paid.event?.body ?? "", /Missiles: -1\./);
  });
});
