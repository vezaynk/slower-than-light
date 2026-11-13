import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { choiceOmitted, offeredChoices } from "./choice-locks.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";
import { eventText } from "../event-text.ts";

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

const INTROS = [
  "A Lanius skiff holds its guns cold and asks for spare supplies, scrap in return.",
  "A small Lanius hull drifts in with empty racks. The hail is clumsy, but it is a trade.",
  "A laden Lanius hull is already turning away. They will trade the metal they cannot use.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_TRADER";
  b.name = "Lanius trader";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius trader");
  g.missiles = 20;
  g.player.parts = 20;
}

function inBand(n: number, lo: number, hi: number) {
  assert.ok(n >= lo && n <= hi, `${n} not in ${lo}-${hi}`);
}

/** The list page pays on the click. Notes are "Fuel: -N." and "Scrap: M." */
function paid(body: string): { res: string; cost: number; scrap: number } {
  const cost = /(?:Fuel|Missiles|Drone parts): -(\d+)\./.exec(body);
  const scrap = /Scrap: (\d+)\./.exec(body);
  assert.ok(cost, body);
  assert.ok(scrap, body);
  const res = body.includes("Fuel:") ? "fuel" : body.includes("Missiles:") ? "missiles" : "parts";
  return { res, cost: Number(cost[1]), scrap: Number(scrap[1]) };
}

describe("Lanius trader", () => {
  it("rotates the three hails, then one base trade, and agreeing pays that page", () => {
    const seenIntro = new Set<string>();
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const intro = INTROS.find((line) => line === body);
      assert.ok(intro, body);
      seenIntro.add(intro);
      assert.deepEqual(
        offeredChoices(g, g.event!.choices).map((c) => c.label),
        ["Make the trade.", "Send them off."],
      );
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, "c:lanius-trader:0");
      assert.equal(g.phase, "event");
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
      if (got.res === "missiles") assert.equal(g.missiles, missiles - got.cost);
      else assert.equal(g.missiles, missiles);
      if (got.res === "parts") assert.equal(g.player.parts, parts - got.cost);
      else assert.equal(g.player.parts, parts);
      seen.add(got.res);
    }
    assert.equal(seenIntro.size, 1);
    assert.deepEqual([...seen].sort(), ["fuel", "missiles", "parts"]);
  });

  it("declining spends nothing", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    const fuel = g.fuel;
    choose(g, "c:lanius-trader:3");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, fuel);
    assert.equal(g.event?.body, "They cut the hail and jump.");
    assert.equal(g.event?.choices[0]?.id, "ack");
  });

  it("a short stock leaves the trade unpaid", () => {
    const g = createGame(1);
    open(g);
    g.fuel = 2;
    g.missiles = 2;
    g.player.parts = 2;
    const scrap = g.scrap;
    assert.equal(choiceDisabled(g, "c:lanius-trader:0"), null);
    choose(g, "c:lanius-trader:0");
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, 2);
    assert.equal(g.missiles, 2);
    assert.equal(g.player.parts, 2);
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:lanius-trader:0"),
      true,
    );
  });

  it("a living Lanius opens the heavier list, and a dead one does not", () => {
    const bare = createGame(1);
    open(bare);
    const bareIds = bare.event!.choices.map((c) => c.id);
    assert.equal(choiceOmitted(bare, "c:lanius-trader:4", bareIds), true);
    assert.equal(
      offeredChoices(bare, bare.event!.choices).some((c) => c.id === "c:lanius-trader:4"),
      false,
    );
    assert.equal(choiceDisabled(bare, "c:lanius-trader:4"), "Needs Lanius");
    choose(bare, "c:lanius-trader:4");
    assert.equal(bare.scrap, 10);
    assert.equal(
      bare.event?.choices.some((c) => c.id === "c:lanius-trader:0"),
      true,
    );

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "anaerobic");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(
      choiceOmitted(
        dead,
        "c:lanius-trader:4",
        dead.event!.choices.map((c) => c.id),
      ),
      true,
    );

    const seen = new Set<string>();
    for (let seed = 1; seed <= 60 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(joinCrew(g, "Lanius"), true);
      assert.equal(
        choiceOmitted(
          g,
          "c:lanius-trader:4",
          g.event!.choices.map((c) => c.id),
        ),
        false,
      );
      assert.equal(choiceDisabled(g, "c:lanius-trader:4"), null);
      choose(g, "c:lanius-trader:4");
      assert.equal(g.scrap, 10);
      assert.equal(
        g.event?.body,
        "Your Lanius speaks, and the trader answers with a heavier offer.",
      );
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Take the heavier offer.", "Turn it down."],
      );
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, "c:lanius-trader:4:0");
      const got = paid(g.event?.body ?? "");
      inBand(got.cost, 3, 7);
      inBand(got.scrap, BETTER[got.res]![0], BETTER[got.res]![1]);
      assert.equal(g.event?.choices[0]?.id, "ack");
      choose(g, "ack");
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
