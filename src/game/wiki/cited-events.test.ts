import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { choose, chooseSector, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedChoiceDisabled, citedChoose, citedEvent, stampCitedEvents, type CitedChoice } from "./cited-events.ts";

function beacon(name: string, flag = ""): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name,
    tier: "",
    flag,
    asteroid: false,
  };
}

function harness(g: Game, rolls: number[]) {
  const notes: string[] = [];
  const scrapCalls: number[] = [];
  let fought: { tier: string; asteroid?: boolean } | null = null;
  const ctx: CitedChoice = {
    g,
    resolve() {
      g.event = null;
      g.phase = "map";
    },
    fight(tier, asteroid) {
      fought = { tier, asteroid };
      g.event = null;
      g.phase = "combat";
    },
    scrap(n) {
      scrapCalls.push(n);
      if (n > 0) {
        g.scrap += n;
        g.scrapCollected += n;
      }
    },
    note(text) {
      notes.push(text);
    },
    irand(n) {
      const v = rolls.shift();
      assert.equal(typeof v, "number");
      assert.ok(v !== undefined && v >= 0 && v < n, `irand ${v} of ${n}`);
      return v as number;
    },
  };
  return { ctx, notes, scrapCalls, fought: () => fought };
}

describe("cited events", () => {
  it("spends 3 drone parts for 12 scrap and refuses when short", () => {
    const g = createGame(4, "kestrel-a", "normal");
    const ev = citedEvent(g, beacon("Sell drone parts for scrap"));
    assert.ok(ev);
    const sell = ev.choices.find((c) => c.label === "Sell 3 drone parts for 12 scrap");
    assert.ok(sell);
    g.player.parts = 2;
    g.scrap = 40;
    g.scrapCollected = 0;
    assert.equal(citedChoiceDisabled(g, sell.id), "Need 3 drone parts");
    const short = harness(g, []);
    assert.equal(citedChoose(short.ctx, sell.id), false);
    assert.equal(g.player.parts, 2);
    assert.equal(g.scrap, 40);
    assert.equal(g.scrapCollected, 0);
    assert.deepEqual(short.scrapCalls, []);

    g.player.parts = 3;
    assert.equal(citedChoiceDisabled(g, sell.id), null);
    const paid = harness(g, []);
    assert.equal(citedChoose(paid.ctx, sell.id), true);
    assert.equal(g.player.parts, 0);
    assert.equal(g.scrap, 52);
    assert.equal(g.scrapCollected, 12);
    assert.deepEqual(paid.scrapCalls, [12]);
    assert.equal(g.phase, "map");
  });

  it("rolls medium scrap inside the cited band and does not invent resources", () => {
    const g = createGame(5, "kestrel-a", "normal");
    g.sector = 1;
    g.difficulty = "normal";
    const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
    assert.deepEqual([lo, hi], [12, 19]);
    const ev = citedEvent(g, beacon("Free scrap with resources", "cited:free-scrap-with-resources"));
    assert.ok(ev);
    assert.equal(ev.body, "");
    assert.equal(ev.choices.length, 1);
    const id = ev.choices[0].id;
    const weapons = g.player.weapons.map((w) => w.defId).join(",");
    const kits = JSON.stringify(g.player.kits);
    const parts = g.player.parts;
    const crew = g.crew.length;
    const augments = g.augments.length;

    g.scrap = 0;
    g.scrapCollected = 0;
    const low = harness(g, [0]);
    assert.equal(citedChoose(low.ctx, id), true);
    assert.equal(g.scrap, lo);
    assert.equal(g.scrapCollected, lo);
    assert.ok(low.notes.some((n) => n === "Resource amounts are not stated."));
    assert.ok(low.notes.some((n) => n === `Medium scrap: ${lo}.`));

    g.scrap = 0;
    g.scrapCollected = 0;
    const high = harness(g, [hi - lo]);
    assert.equal(citedChoose(high.ctx, id), true);
    assert.equal(g.scrap, hi);
    assert.equal(g.player.weapons.map((w) => w.defId).join(","), weapons);
    assert.equal(JSON.stringify(g.player.kits), kits);
    assert.equal(g.player.parts, parts);
    assert.equal(g.crew.length, crew);
    assert.equal(g.augments.length, augments);
  });

  it("leaves Free scrap with resources (Engi) unwired because the page states no amount", () => {
    const g = createGame(6);
    assert.equal(citedEvent(g, beacon("Free scrap with resources (Engi)")), null);
    assert.equal(citedEvent(g, beacon("Engi Free Stuff")), null);
    assert.equal(citedChoose(harness(g, []).ctx, "c:free-scrap-with-resources-engi:0"), false);
  });

  it("stamps a named sector once and leaves an existing flag alone", () => {
    const quiet = createGame(7);
    quiet.sectorName = "Cinder Reach";
    stampCitedEvents(quiet);
    assert.equal(quiet.beacons.some((b) => b.flag.startsWith("cited:")), false);

    const g = createGame(8);
    g.sectorName = "Civilian Sector";
    const held = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && b.kind !== "store");
    assert.ok(held);
    held.flag = "engi-cache";
    held.name = "Engi cache";
    stampCitedEvents(g);
    const first = g.beacons.filter((b) => b.flag.startsWith("cited:")).map((b) => b.flag);
    stampCitedEvents(g);
    const second = g.beacons.filter((b) => b.flag.startsWith("cited:")).map((b) => b.flag);
    assert.ok(first.length >= 1);
    assert.deepEqual(second, first);
    assert.equal(new Set(first).size, first.length);
    assert.equal(held.flag, "engi-cache");
    assert.equal(g.beacons.some((b) => (b.kind === "exit" || b.kind === "start" || b.kind === "store") && b.flag.startsWith("cited:")), false);
    const marked = g.beacons.find((b) => b.flag.startsWith("cited:"));
    assert.ok(marked);
    assert.equal(marked.kind, "event");
    assert.ok(citedEvent(g, marked));
  });

  it("rolls the mercenary's 10-25 scrap cost and skips the delay in The Last Stand", () => {
    const g = createGame(9);
    g.sector = 3;
    g.sectorName = "Civilian Sector";
    const ev = citedEvent(g, beacon("The mercenary"));
    assert.ok(ev);
    const hire = ev.choices.find((c) => c.label === "Hire the mercenary to delay the Rebels");
    assert.ok(hire);
    g.scrap = 9;
    assert.equal(citedChoiceDisabled(g, hire.id), "Need 10 scrap");
    g.scrap = 10;
    g.fleet = 5;
    assert.equal(citedChoiceDisabled(g, hire.id), null);
    const over = harness(g, [15]);
    assert.equal(citedChoose(over.ctx, hire.id), false);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);

    g.scrap = 40;
    g.scrapCollected = 0;
    g.fleet = 6;
    const hired = harness(g, [0]);
    assert.equal(citedChoose(hired.ctx, hire.id), true);
    assert.equal(g.scrap, 30);
    assert.equal(g.scrapCollected, 0);
    assert.equal(g.fleet, 4);

    g.sector = 8;
    g.sectorName = "The Last Stand";
    g.scrap = 40;
    g.fleet = 6;
    const last = harness(g, [0]);
    assert.equal(citedChoose(last.ctx, hire.id), true);
    assert.equal(g.scrap, 30);
    assert.equal(g.fleet, 6);
    assert.ok(last.notes.includes("No effect in The Last Stand."));
  });

  it("places the station when the sector opens and keeps the panel up if the price is short", () => {
    const g = createGame(3, "kestrel-a", "normal");
    assert.equal(g.beacons.some((b) => b.flag.startsWith("cited:")), false);
    const start = g.route.find((node) => node.id === g.routeHere);
    assert.ok(start);
    g.phase = "map";
    g.sectorMap = true;
    const destId = start.links[0];
    const dest = g.route.find((node) => node.id === destId);
    assert.ok(dest);
    chooseSector(g, destId);
    assert.equal(g.sectorName, dest.name);
    const stamped = g.beacons.filter((b) => b.flag.startsWith("cited:"));
    assert.ok(stamped.length >= 1, dest.name);
    assert.equal(g.beacons.filter((b) => b.flag === "last-stand-repair").length, dest.name === "The Last Stand" ? 3 : 0);

    const shop = createGame(4, "kestrel-a", "normal");
    const sell = shop.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "store");
    assert.ok(sell);
    sell.flag = "cited:sell-drone-parts-for-scrap";
    sell.name = "Sell drone parts for scrap";
    sell.kind = "event";
    const here = shop.beacons.find((b) => b.id === shop.here);
    assert.ok(here);
    sell.col = 6;
    shop.fleet = 0;
    shop.fuel = 6;
    shop.phase = "map";
    shop.player.parts = 1;
    if (!here.links.includes(sell.id)) here.links.push(sell.id);
    commitJump(shop, sell.id);
    assert.equal(shop.phase, "event");
    const choice = shop.event?.choices.find((c) => c.label === "Sell 3 drone parts for 12 scrap");
    assert.ok(choice);
    choose(shop, choice.id);
    assert.equal(shop.phase, "event");
    assert.equal(shop.player.parts, 1);
    shop.player.parts = 3;
    const scrap = shop.scrap;
    choose(shop, choice.id);
    assert.equal(shop.phase, "map");
    assert.equal(shop.player.parts, 0);
    assert.equal(shop.scrap, scrap + 12);
  });
});
