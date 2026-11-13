import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = ["Crew for hire.", "Crew for hire.", "Crew for hire."];

function open(g: Game): Beacon {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "filler:crew-hiring-station";
  b.name = "Crew for hire";
  b.kind = "cache";
  g.here = b.id;
  g.event = fillerEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crew for hire");
  return b;
}

describe("Crew for hire", () => {
  it("is an items card", () => {
    const page = pageForRow("Crew for hire");
    assert.equal(page?.slug, "TAVERN_HIRE");
    assert.equal(page?.choices.length, 1);
    assert.equal(page?.choices[0]?.label, "Nothing happens.");
  });

  it("shows each printed intro and does not offer a hire", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const hit = INTROS.find((mark) => body.includes(mark));
      assert.ok(hit, body);
      seen.add(hit);
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Nothing happens."],
      );
      assert.equal(
        /25|hire a crewmember/i.test(g.event?.choices.map((c) => c.label).join(" ")),
        false,
      );
    }
    assert.equal(seen.size, new Set(INTROS).size);
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
