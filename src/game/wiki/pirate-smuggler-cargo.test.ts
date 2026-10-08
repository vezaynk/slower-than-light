import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-smuggler";
  b.name = "Pirate smuggler";
  g.here = b.id;
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resourceLines(body: string): string[] {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body));
}

describe("Pirate smuggler cargo", () => {
  it("a destroyed ship pays the printed cargo table and does not grant an unnamed item", () => {
    const seen = new Set<string>();
    const randomTiers = new Set<string>();
    for (let seed = 1; seed <= 160; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = g.player.weapons.length;
      const crew = g.crew.length;
      const visited = g.beacons.filter((b) => b.visited).length;
      assert.equal(pageWin(g, "pirate-smuggler", false), true);
      const body = g.event?.body ?? "";
      const text = body.split("\n\n")[0] ?? "";
      seen.add(text);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns, body);
      assert.equal(g.crew.length, crew, body);
      assert.equal(g.beacons.filter((b) => b.visited).length, visited);
      const lines = resourceLines(body);
      if (text.startsWith("The debris implies")) {
        assert.deepEqual(lines, ["Drone parts"]);
        assert.equal(g.player.parts, 1);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      } else if (text.startsWith("You detect faint life") || text.startsWith("The ship appears to have been transporting prisoners") || text.startsWith("You search the remains of the ship")) {
        assert.equal(lines.length, 2, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
      } else if (text.startsWith("The ship was carrying military supplies")) {
        assert.equal(lines.length, 2, body);
        assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      } else if (text.startsWith("The ship was transporting weaponry")) {
        assert.equal(lines.length, 0, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 23, body);
        if (paid[0]! >= 7 && paid[0]! <= 10) randomTiers.add("low");
        else if (paid[0]! >= 12 && paid[0]! <= 18) randomTiers.add("medium");
        else if (paid[0]! >= 20 && paid[0]! <= 23) randomTiers.add("high");
      } else {
        assert.equal(lines.length, 0, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      }
    }
    assert.equal(seen.size, 11, [...seen].join(" | "));
    assert.equal(randomTiers.has("low") && randomTiers.has("medium") && randomTiers.has("high"), true);
  });

  it("a crew kill pays the printed cargo table and does not grant an unnamed item", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = g.player.weapons.length;
      const crew = g.crew.length;
      const visited = g.beacons.filter((b) => b.visited).length;
      assert.equal(pageWin(g, "pirate-smuggler", true), true);
      const body = g.event?.body ?? "";
      const text = body.split("\n\n")[0] ?? "";
      seen.add(text);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.length, crew);
      assert.equal(g.beacons.filter((b) => b.visited).length, visited);
      assert.equal(resourceLines(body).length, 0, body);
      if (text.startsWith("The ship refuses")) assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      else assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    }
    assert.equal(seen.size, 4);
  });
});
