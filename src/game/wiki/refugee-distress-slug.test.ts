import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refugee-distress-slug";
  b.name = "Refugee distress (Slug)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refugee distress (Slug)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Refugee distress (Slug)", () => {
  it("is a slug sector card with the distress intro", () => {
    const pages = citedPagesFor("Slug Controlled Nebula").filter((p) => p.dest === "Refugee distress (Slug)");
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0]?.sectors, ["Slug Controlled Nebula", "Slug Home Nebula"]);
    const home = citedPagesFor("Slug Home Nebula").some((p) => p.dest === "Refugee distress (Slug)");
    assert.equal(home, true);
    const g = createGame(1);
    open(g);
    assert.match(g.event?.body ?? "", /distress beacon is active/);
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
      choose(g, "c:refugee-distress-slug:0");
      const text = `${g.event?.body ?? ""}\n${g.log.join("\n")}`;
      assert.equal(/Zoltan ship suddenly jumps|Slug ship jumps|pirate ambush/i.test(text), false);
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.enemyEscape?.mode, "never");
        assert.equal(g.fightEvent, "refugee-distress-slug");
        assert.match(g.log.join("\n"), /using the refugee ship as bait/);
      } else {
        trade = true;
        assert.match(g.event?.body ?? "", /running low on supplies/);
        const scrap = g.scrap;
        choose(g, g.event?.choices[1]?.id ?? "");
        assert.equal(g.event?.body, "Nothing happens.");
        assert.equal(g.scrap, scrap);
      }
    }
    assert.equal(trade && fight, true);

    const left = createGame(3);
    open(left);
    const scrap = left.scrap;
    choose(left, "c:refugee-distress-slug:1");
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.scrap, scrap);
    assert.equal(left.phase, "event");
  });

  it("pays medium or high scrap with resources, then the printed contact for that ending", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const before = destroyed.scrap;
    assert.equal(pageWin(destroyed, "refugee-distress-slug", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The pirate ship breaks apart and you salvage what you can/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, before + paid[0]!);
    choose(destroyed, "s:refugee-distress-slug:contact");
    const thanks = destroyed.event?.body ?? "";
    assert.match(thanks, /thanks you for your assistance/);
    const low = scraps(thanks);
    assert.equal(low.length, 1, thanks);
    assert.ok(low[0]! >= 7 && low[0]! <= 10, thanks);
    assert.equal(resources(thanks), 2, thanks);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "refugee-distress-slug", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /now empty of lifeforms/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    choose(killed, "s:refugee-distress-slug:contact-dead");
    assert.match(killed.event?.body ?? "", /pirates have been following their trail/);
  });
});
