import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-in-rich-debris-field";
  b.name = "Lanius ship in rich debris field";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship in rich debris field");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function inBand(n: number, lo: number, hi: number) {
  assert.ok(n >= lo && n <= hi, `${n} not in ${lo}-${hi}`);
}

describe("Lanius ship in rich debris field", () => {
  it("harvesting or attacking starts a Lanius fight", () => {
    for (const id of ["c:lanius-ship-in-rich-debris-field:0", "c:lanius-ship-in-rich-debris-field:1"]) {
      const g = createGame(1);
      open(g);
      choose(g, id);
      assert.equal(g.phase, "combat");
      assert.equal(g.fightEvent, "lanius-ship-in-rich-debris-field");
      assert.equal(g.scrap, 10);
    }
  });

  it("winning either ending pays medium scrap, then the debris", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "lanius-ship-in-rich-debris-field", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /no more life-signs/ : /useful scrap material/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      inBand(paid[0]!, 12, 19);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-debris:investigate"), true);
    }
  });

  it("the debris pays high, medium, or low scrap with resources", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-in-rich-debris-field", false);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, "q:lanius-debris:investigate");
      const body = g.event?.body ?? "";
      const extra = scraps(body);
      assert.equal(extra.length, 1, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, before + extra[0]!);
      assert.equal(g.player.weapons.length, guns);
      if (/good haul/.test(body)) {
        inBand(extra[0]!, 19, 23);
        seen.add("high");
      } else if (/scavenge what you can/.test(body)) {
        inBand(extra[0]!, 12, 19);
        seen.add("medium");
      } else {
        assert.match(body, /harvested much of it/);
        inBand(extra[0]!, 7, 10);
        seen.add("low");
      }
    }
    assert.deepEqual([...seen].sort(), ["high", "low", "medium"]);
  });

  it("level 2 piloting pays medium scrap and level 3 pays high", () => {
    const low = createGame(1);
    open(low);
    low.player.systems.pilot.level = 1;
    assert.equal(choiceDisabled(low, "c:lanius-ship-in-rich-debris-field:3"), "Needs level 2 Piloting");
    assert.equal(choiceDisabled(low, "c:lanius-ship-in-rich-debris-field:4"), "Needs level 3 Piloting");
    choose(low, "c:lanius-ship-in-rich-debris-field:3");
    assert.equal(low.phase, "event");
    assert.equal(low.scrap, 10);

    const mid = createGame(2);
    open(mid);
    mid.player.systems.pilot.level = 2;
    const guns = mid.player.weapons.length;
    assert.equal(choiceDisabled(mid, "c:lanius-ship-in-rich-debris-field:3"), null);
    assert.equal(choiceDisabled(mid, "c:lanius-ship-in-rich-debris-field:4"), "Needs level 3 Piloting");
    choose(mid, "c:lanius-ship-in-rich-debris-field:3");
    const midBody = mid.event?.body ?? "";
    assert.match(midBody, /gather resources from the debris field/);
    const midPaid = scraps(midBody);
    assert.equal(midPaid.length, 1, midBody);
    inBand(midPaid[0]!, 12, 19);
    assert.equal(resources(midBody), 2, midBody);
    assert.equal(mid.scrap, 10 + midPaid[0]!);
    assert.equal(mid.player.weapons.length, guns);

    const high = createGame(3);
    open(high);
    high.player.systems.pilot.level = 3;
    choose(high, "c:lanius-ship-in-rich-debris-field:4");
    const highBody = high.event?.body ?? "";
    assert.match(highBody, /considerable amount/);
    const highPaid = scraps(highBody);
    assert.equal(highPaid.length, 1, highBody);
    inBand(highPaid[0]!, 19, 23);
    assert.equal(resources(highBody), 2, highBody);
    assert.equal(high.scrap, 10 + highPaid[0]!);
  });

  it("ignoring the vessel spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-in-rich-debris-field:2");
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /You charge up your drive and prepare to make the next jump/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
  });
});
