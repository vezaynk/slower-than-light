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
const BETTER: Record<string, [number, number]> = {
  fuel: [20, 35],
  missiles: [25, 50],
  parts: [25, 50],
};

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-trader";
  b.name = "Lanius trader";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius trader");
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

describe("Lanius trader", () => {
  it("shows one base offer and agreeing pays those amounts", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const got = offer(body);
      inBand(got.cost, 3, 7);
      inBand(got.scrap, BASE[got.res]![0], BASE[got.res]![1]);
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Agree to the exchange.", "Decline", "Ask for an alternative trade."],
      );
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, g.event!.choices[0]!.id);
      assert.equal(g.phase, "map");
      assert.equal(g.scrap, 10 + got.scrap);
      if (got.res === "fuel") assert.equal(g.fuel, fuel - got.cost);
      else assert.equal(g.fuel, fuel);
      if (got.res === "missiles") assert.equal(g.missiles, missiles - got.cost);
      else assert.equal(g.missiles, missiles);
      if (got.res === "parts") assert.equal(g.player.parts, parts - got.cost);
      else assert.equal(g.player.parts, parts);
      seen.add(got.res);
    }
    assert.deepEqual([...seen].sort(), ["fuel", "missiles", "parts"]);
  });

  it("declining spends nothing", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    const fuel = g.fuel;
    choose(g, "c:lanius-trader:3");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, fuel);
  });

  it("a short offer stays closed", () => {
    const g = createGame(1);
    open(g);
    const got = offer(g.event?.body ?? "");
    if (got.res === "fuel") g.fuel = got.cost - 1;
    else if (got.res === "missiles") g.missiles = got.cost - 1;
    else g.player.parts = got.cost - 1;
    const id = g.event!.choices[0]!.id;
    const word = got.res === "parts" ? "drone parts" : got.res;
    assert.equal(choiceDisabled(g, id), `Need ${got.cost} ${word}`);
    const scrap = g.scrap;
    choose(g, id);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
  });

  it("asking again needs a living Lanius and pays a better band", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-trader:4"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-trader:4");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.phase, "event");

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "voidlung");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(choiceDisabled(dead, "c:lanius-trader:4"), "Needs a Lanius crewmember");

    const seen = new Set<string>();
    for (let seed = 1; seed <= 60 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(joinCrew(g, "Lanius"), true);
      assert.equal(choiceDisabled(g, "c:lanius-trader:4"), null);
      choose(g, "c:lanius-trader:4");
      const body = g.event?.body ?? "";
      assert.match(body, /second proposal/);
      const got = offer(body);
      inBand(got.cost, 3, 7);
      inBand(got.scrap, BETTER[got.res]![0], BETTER[got.res]![1]);
      assert.equal(g.scrap, 10);
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Agree to the exchange.", "Decline"],
      );
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, g.event!.choices[0]!.id);
      assert.equal(g.phase, "map");
      assert.equal(g.scrap, 10 + got.scrap);
      if (got.res === "fuel") assert.equal(g.fuel, fuel - got.cost);
      else assert.equal(g.fuel, fuel);
      if (got.res === "missiles") assert.equal(g.missiles, missiles - got.cost);
      else assert.equal(g.missiles, missiles);
      if (got.res === "parts") assert.equal(g.player.parts, parts - got.cost);
      else assert.equal(g.player.parts, parts);
      seen.add(got.res);
    }
    assert.deepEqual([...seen].sort(), ["fuel", "missiles", "parts"]);
  });
});
