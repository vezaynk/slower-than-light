import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = [
  /distress beacon was a trap/,
  /dastardly trap/,
  /warning signals/,
  /shots are fired toward your ship/,
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Pirate ship distress trap",
    tier: "",
    flag: "filler:pirate-ship-distress-trap",
    asteroid: false,
  };
}

function open(g: Game) {
  g.beacons = [beacon()];
  g.here = "b";
  const ev = fillerEvent(g, g.beacons[0]);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

describe("Pirate ship distress trap", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Pirate ship distress trap")?.slug, "pirate-ship-distress-trap");
    const ev = open(createGame(1));
    assert.deepEqual(ev.choices.map((c) => c.id), ["c:pirate-ship-distress-trap:0"]);
  });

  it("shows one of the four printed intros", () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const body = open(createGame(seed)).body;
      const hit = INTROS.findIndex((re) => re.test(body));
      assert.ok(hit >= 0, body);
      seen.add(hit);
    }
    assert.equal(seen.size, INTROS.length);
  });

  it("starts a pirate fight and pays nothing up front", () => {
    const g = createGame(3);
    const hull = g.player.hull;
    open(g);
    const body = g.event?.body ?? "";
    fillerChoose(g, "c:pirate-ship-distress-trap:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    assert.ok(g.log.some((line) => line.includes(body.slice(0, 24))));
  });
});
