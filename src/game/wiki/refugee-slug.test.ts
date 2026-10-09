import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refugee-slug";
  b.name = "Refugee (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refugee (Slug)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Refugee (Slug)", () => {
  it("is a slug nebula card with hail and ignore", () => {
    const pages = citedPagesFor("Slug Controlled Nebula").filter((p) => p.dest === "Refugee (Slug)");
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0]?.sectors, ["Slug Controlled Nebula", "Slug Home Nebula"]);
    const home = citedPagesFor("Slug Home Nebula").some((p) => p.dest === "Refugee (Slug)");
    assert.equal(home, true);
    const g = createGame(1);
    open(g);
    assert.match(g.event?.body ?? "", /refugee ship drifting/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["Hail them.", "Ignore the refugees."],
    );
  });

  it("hails a trade or a pirate bait that does not run, and ignoring them does nothing", () => {
    let trade = false;
    let fight = false;
    for (let seed = 1; seed <= 40 && (!trade || !fight); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:refugee-slug:0");
      const text = `${g.event?.body ?? ""}\n${g.log.join("\n")}`;
      assert.equal(/Zoltan ship suddenly jumps|Slug ship jumps|pirate ambush/i.test(text), false);
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.enemyEscape?.mode, "never");
        assert.equal(g.fightEvent, "refugee-slug");
        assert.match(g.log.join("\n"), /using the refugee ship as bait/);
      } else {
        trade = true;
        assert.match(g.event?.body ?? "", /running low on supplies/);
        assert.equal(g.event?.choices[1]?.label, "Politely decline.");
        const scrap = g.scrap;
        const crew = g.crew.filter((c) => c.side === "player").length;
        choose(g, g.event?.choices[1]?.id ?? "");
        assert.equal(g.event?.body, "Nothing happens.");
        assert.equal(g.scrap, scrap);
        assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      }
    }
    assert.equal(trade && fight, true);

    const left = createGame(3);
    open(left);
    const scrap = left.scrap;
    const crew = left.crew.filter((c) => c.side === "player").length;
    choose(left, "c:refugee-slug:1");
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.scrap, scrap);
    assert.equal(left.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(left.phase, "event");
  });

  it("pays medium or high scrap with resources, then the printed contact for that ending", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const before = destroyed.scrap;
    assert.equal(pageWin(destroyed, "refugee-slug", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The pirate ship breaks apart and you salvage what you can/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, before + paid[0]!);
    choose(destroyed, "s:refugee-slug:contact");
    const thanks = destroyed.event?.body ?? "";
    assert.match(thanks, /thanks you for your assistance/);
    assert.equal(/hounding them/.test(thanks), false);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "refugee-slug", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /now empty of lifeforms/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    choose(killed, "s:refugee-slug:contact-dead");
    const followed = killed.event?.body ?? "";
    assert.match(followed, /pirates have been following their trail/);
  });
});
