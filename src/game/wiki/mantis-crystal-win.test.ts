import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-crystal";
  b.name = "Mantis ship attacking Crystal";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ship attacking Crystal");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Mantis ship attacking Crystal reward", () => {
  it("a destroyed ship pays medium scrap with resources, and a crew kill pays high", () => {
    const destroyed = createGame(3);
    open(destroyed);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    assert.equal(pageWin(destroyed, "mantis-ship-attacking-crystal", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The ship explodes and you scrap what you can/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.event?.choices.some((c) => c.id === "q:crystal-pirate:contact"), true);

    const killed = createGame(4);
    open(killed);
    assert.equal(pageWin(killed, "mantis-ship-attacking-crystal", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /With the crew dead you take as much salvage from the ship as possible/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("contacting the Crystal ship pays random resources, nothing, or no Crystal weapon", () => {
    const seen = new Set<string>();
    let nothing = false;
    let weapon = false;
    let paid = false;
    for (let seed = 1; seed <= 80 && (seen.size < 5 || !nothing || !weapon || !paid); seed++) {
      const g = createGame(seed);
      open(g);
      pageWin(g, "mantis-ship-attacking-crystal", false);
      const scrap = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, "q:crystal-pirate:contact");
      const body = g.event?.body ?? "";
      seen.add(body.split("\n\n")[0] ?? "");
      assert.equal(g.player.weapons.length, guns, body);
      if (body.includes("Crystal weapon")) {
        weapon = true;
        assert.equal(g.scrap, scrap);
        assert.equal(resources(body), 0);
      } else if (body.includes("Nothing happens")) {
        nothing = true;
        assert.equal(g.scrap, scrap);
      } else {
        paid = true;
        const got = scraps(body);
        assert.equal(got.length, 1, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, scrap + got[0]!);
      }
    }
    assert.equal(seen.size, 5);
    assert.equal(nothing && weapon && paid, true);
  });
});
