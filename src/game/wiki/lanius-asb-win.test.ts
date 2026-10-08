import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-fight-with-friendly-asb-support";
  b.name = "Lanius fight with friendly ASB support";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius fight with friendly ASB support");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius fight with friendly ASB support reward", () => {
  it("a destroyed ship pays medium scrap and a crew kill pays high, then 8 repairs or nothing", () => {
    let repaired = false;
    let left = false;
    for (let seed = 1; seed <= 40 && (!repaired || !left); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.hull = 10;
      const crew = g.crew.filter((c) => c.side === "player").length;
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "lanius-fight-with-friendly-asb-support", false), true);
      const body = g.event?.body ?? "";
      assert.match(body, /The ship breaks apart\. You decide to salvage it when the opportunity arises/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.player.weapons.length, guns);
      if (body.includes("patch up your ship")) {
        repaired = true;
        assert.match(body, /Hull repairs: 8/);
        assert.equal(g.player.hull, 18);
      } else {
        left = true;
        assert.match(body, /fight rages on in the distance/);
        assert.match(body, /Nothing happens/);
        assert.equal(g.player.hull, 10);
      }
    }
    assert.equal(repaired && left, true);

    const killed = createGame(2);
    open(killed);
    killed.player.hull = killed.player.hullMax;
    assert.equal(pageWin(killed, "lanius-fight-with-friendly-asb-support", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /No more life signs detected on the Lanius ship/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
    assert.ok(killed.player.hull <= killed.player.hullMax);
  });
});
