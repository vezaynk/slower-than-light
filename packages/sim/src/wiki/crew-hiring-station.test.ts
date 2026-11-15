import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, choiceDisabled } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = ["Crew for hire.", "Crew for hire.", "Crew for hire."];

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
    assert.equal(page?.slug, "TAVERN_HIRE");
    assert.equal(page?.choices.length, 1);
    assert.equal(page?.choices[0]?.label, "Nothing happens.");
  });

  it("shows each printed intro and two priced hires", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < new Set(INTROS).size; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const hit = INTROS.find((mark) => body.includes(mark));
      assert.ok(hit, body);
      seen.add(hit);
      const choices = g.event?.choices ?? [];
      assert.equal(choices.at(-1)?.id, "c:crew-hiring-station:0");
      assert.equal(choices.at(-1)?.label, "Nothing happens.");
      const offers = choices.slice(0, -1);
      assert.equal(offers.length, 2);
      const prices = offers.map((c) => {
        const m = /^s:hire:(\d+):([A-Za-z]+)$/.exec(c.id);
        assert.ok(m, c.id);
        assert.equal(c.label, `${m[2]} crew. [${m[1]} scrap]`);
        return Number(m[1]);
      });
      assert.ok(prices[0]! >= 25 && prices[0]! <= 45, String(prices[0]));
      assert.ok(prices[1]! >= 25 && prices[1]! <= 55, String(prices[1]));
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

  it("hiring spends the shown scrap and adds that race", () => {
    const g = createGame(5);
    open(g);
    const offer = g.event?.choices.find((c) => c.id.startsWith("s:hire:"));
    assert.ok(offer);
    const m = /^s:hire:(\d+):([A-Za-z]+)$/.exec(offer.id);
    assert.ok(m);
    const price = Number(m[1]);
    const race = m[2]!;
    g.scrap = price - 1;
    assert.equal(choiceDisabled(g, offer.id), `Need ${price} scrap`);
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, offer.id);
    assert.equal(g.scrap, price - 1);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    g.scrap = price;
    choose(g, offer.id);
    assert.equal(g.scrap, 0);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
    assert.match(g.event?.body ?? "", new RegExp(`Crew gained: ${race}`));
  });
});
