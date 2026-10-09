import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = [
  "meeting place for local traffic",
  "tavern full of mercenaries",
  "you've come to the right place",
];

function open(g: Game): Beacon {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "filler:crew-hiring-station";
  b.name = "Crew hiring station";
  b.kind = "cache";
  g.here = b.id;
  g.event = fillerEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crew hiring station");
  return b;
}

describe("Crew hiring station", () => {
  it("is an items card", () => {
    const page = pageForRow("Crew hiring station");
    assert.equal(page?.slug, "crew-hiring-station");
    assert.equal(page?.choices.length, 1);
    assert.equal(page?.choices[0]?.label, "Don't hire anyone.");
  });

  it("shows each printed intro and does not offer a hire", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const hit = INTROS.find((mark) => body.includes(mark));
      assert.ok(hit, body);
      seen.add(hit);
      assert.deepEqual(g.event?.choices.map((c) => c.label), ["Don't hire anyone."]);
      assert.equal(/25|hire a crewmember/i.test(g.event?.choices.map((c) => c.label).join(" ")), false);
    }
    assert.equal(seen.size, INTROS.length);
  });

  it("not hiring anyone does nothing and spends nothing", () => {
    const g = createGame(4);
    open(g);
    const scrap = g.scrap;
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:crew-hiring-station:0");
    assert.equal(g.event?.body, "Nothing happens.");
    assert.equal(g.scrap, scrap);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(g.phase, "event");
  });
});
