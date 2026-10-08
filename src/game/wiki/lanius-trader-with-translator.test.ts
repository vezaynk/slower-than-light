import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

const BASE: Record<string, [number, number]> = {
  fuel: [15, 30],
  missiles: [20, 40],
  parts: [20, 40],
};

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-trader-with-translator";
  b.name = "Lanius trader with translator";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius trader with translator");
  g.missiles = 20;
  g.player.parts = 20;
}

function offer(body: string): { res: string; cost: number; scrap: number } {
  const m = /You lose (\d+) (fuel|missiles|drone parts) and receive (\d+) scrap/.exec(body);
  assert.ok(m, body);
  return { res: m[2] === "drone parts" ? "parts" : m[2]!, cost: Number(m[1]), scrap: Number(m[3]) };
}

function inBand(n: number, lo: number, hi: number) {
  assert.ok(n >= lo && n <= hi, `${n} not in ${lo}-${hi}`);
}

const HAIL =
  "A Lanius merchant appears to have a significantly improved translator as you clearly understand their message. \"Metal content more than sufficient. Does your ship care to exchange resources for our excess metal?\"";

describe("Lanius trader with translator", () => {
  it("shows the printed hail, then one base offer, and agreeing pays those amounts", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(body.startsWith(`${HAIL}\n\n`), body);
      const got = offer(body);
      inBand(got.cost, 3, 7);
      inBand(got.scrap, BASE[got.res]![0], BASE[got.res]![1]);
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Agree to the exchange.", "Decline", "Decline but ask about their translation device."],
      );
      const fuel = g.fuel;
      choose(g, g.event!.choices[0]!.id);
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
    assert.equal(g.event?.body, "They leave without a word.\n\nNothing happens.");
  });

  it("40 scrap buys a Lanius named Translator with no skill", () => {
    const poor = createGame(1);
    open(poor);
    choose(poor, "c:lanius-trader-with-translator:4");
    assert.match(poor.event?.body ?? "", /Care to purchase/);
    assert.equal(choiceDisabled(poor, "q:lanius-translator:buy"), "Need 40 scrap");
    choose(poor, "q:lanius-translator:buy");
    assert.equal(poor.scrap, 10);
    assert.equal(poor.crew.some((c) => c.name === "Translator"), false);

    const g = createGame(2);
    open(g);
    g.scrap = 40;
    const before = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:lanius-trader-with-translator:4");
    assert.equal(choiceDisabled(g, "q:lanius-translator:buy"), null);
    choose(g, "q:lanius-translator:buy");
    const body = g.event?.body ?? "";
    assert.match(body, /learned your language/);
    assert.match(body, /Translator joins you/);
    assert.equal(g.scrap, 0);
    const hired = g.crew.filter((c) => c.name === "Translator");
    assert.equal(hired.length, 1);
    assert.equal(hired[0]!.kin, "voidlung");
    assert.equal(hired[0]!.skills, undefined);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before + 1);

    const again = createGame(3);
    open(again);
    again.scrap = 40;
    choose(again, "q:lanius-translator:decline");
    assert.match(again.event?.body ?? "", /translation device has not yet been perfected/);
    assert.match(again.event?.body ?? "", /Nothing happens/);
    assert.equal(again.scrap, 40);
    assert.equal(again.crew.some((c) => c.name === "Translator"), false);
  });

  it("a full crew does not pay the 40 scrap", () => {
    const g = createGame(4);
    open(g);
    g.scrap = 40;
    while (joinCrew(g, "Human")) {}
    assert.equal(g.crew.filter((c) => c.side === "player").length, 8);
    choose(g, "q:lanius-translator:buy");
    assert.match(g.event?.body ?? "", /no room/);
    assert.equal(g.scrap, 40);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 8);
  });
});
