import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { offeredChoices } from "./choice-locks.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

const BASE: Record<string, [number, number]> = {
  fuel: [15, 30],
  missiles: [20, 40],
  parts: [20, 40],
};

const HAIL =
  "This Lanius hail comes through clean. They have metal they cannot use, and they want supplies for it.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_TRADER_TRANSLATOR";
  b.name = "Lanius trader with translator";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius trader with translator");
  g.missiles = 20;
  g.player.parts = 20;
}

function inBand(n: number, lo: number, hi: number) {
  assert.ok(n >= lo && n <= hi, `${n} not in ${lo}-${hi}`);
}

function paid(body: string): { res: string; cost: number; scrap: number } {
  const cost = /(?:Fuel|Missiles|Drone parts): -(\d+)\./.exec(body);
  const scrap = /Scrap: (\d+)\./.exec(body);
  assert.ok(cost, body);
  assert.ok(scrap, body);
  const res = body.includes("Fuel:") ? "fuel" : body.includes("Missiles:") ? "missiles" : "parts";
  return { res, cost: Number(cost[1]), scrap: Number(scrap[1]) };
}

describe("Lanius trader with translator", () => {
  it("shows the hail, then one base trade, and agreeing pays that page", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(g.event?.body, HAIL);
      assert.deepEqual(
        offeredChoices(g, g.event!.choices).map((c) => c.label),
        ["Make the trade.", "Send them off.", "Ask what made the hail so clear."],
      );
      const fuel = g.fuel;
      choose(g, "c:lanius-trader-with-translator:0");
      const got = paid(g.event?.body ?? "");
      inBand(got.cost, 3, 7);
      inBand(got.scrap, BASE[got.res]![0], BASE[got.res]![1]);
      assert.equal(g.log.includes(`Scrap: ${got.scrap}.`), false);
      assert.equal(g.event?.choices[0]?.id, "ack");
      choose(g, "ack");
      assert.equal(g.phase, "map");
      assert.equal(g.scrap, 10 + got.scrap);
      if (got.res === "fuel") assert.equal(g.fuel, fuel - got.cost);
      else assert.equal(g.fuel, fuel);
      seen.add(got.res);
    }
    assert.deepEqual([...seen].sort(), ["fuel", "missiles", "parts"]);
  });

  it("declining spends nothing", () => {
    const g = createGame(1);
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    choose(g, "c:lanius-trader-with-translator:3");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.event?.body, "They cut the hail and jump.");
  });

  it("40 scrap hires a Lanius named Translator with no skill, and a short purse hires nobody", () => {
    const poor = createGame(1);
    open(poor);
    choose(poor, "c:lanius-trader-with-translator:4");
    assert.equal(poor.event?.body, "They tap a crate and offer it for 40 scrap.");
    assert.deepEqual(
      poor.event?.choices.map((c) => c.label),
      ["Pay 40 scrap for the crate.", "Keep your scrap."],
    );
    const scrap = poor.scrap;
    choose(poor, "c:lanius-trader-with-translator:4:0");
    assert.equal(poor.scrap, scrap);
    assert.equal(
      poor.crew.some((c) => c.name === "Translator"),
      false,
    );
    assert.equal(poor.event?.body, "They tap a crate and offer it for 40 scrap.");

    const g = createGame(2);
    open(g);
    g.scrap = 40;
    const before = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:lanius-trader-with-translator:4");
    choose(g, "c:lanius-trader-with-translator:4:0");
    const body = g.event?.body ?? "";
    assert.match(body, /called Translator/);
    assert.match(body, /Scrap: -40\./);
    assert.equal(g.scrap, 0);
    const hired = g.crew.filter((c) => c.name === "Translator");
    assert.equal(hired.length, 1);
    assert.equal(hired[0]!.kin, "anaerobic");
    assert.equal(hired[0]!.skills, undefined);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before + 1);

    const again = createGame(3);
    open(again);
    again.scrap = 40;
    choose(again, "c:lanius-trader-with-translator:4");
    choose(again, "c:lanius-trader-with-translator:4:1");
    assert.equal(again.event?.body, "They keep the crate and jump.");
    assert.equal(again.scrap, 40);
    assert.equal(
      again.crew.some((c) => c.name === "Translator"),
      false,
    );
  });

  it("a full crew still hires, and the ship asks who is relieved", () => {
    const g = createGame(4);
    open(g);
    g.scrap = 40;
    while (g.crew.filter((c) => c.side === "player").length < 8) joinCrew(g, "Human");
    choose(g, "c:lanius-trader-with-translator:4");
    choose(g, "c:lanius-trader-with-translator:4:0");
    assert.equal(g.scrap, 0);
    const translator = g.crew.find((c) => c.name === "Translator");
    assert.ok(translator);
    assert.equal(translator.kin, "anaerobic");
    assert.deepEqual(g.overflow, [{ kind: "crew" }]);
  });
});
