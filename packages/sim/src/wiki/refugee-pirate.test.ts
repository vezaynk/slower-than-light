import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REFUGEE_NO_DISTRESS_PIRATE";
  b.name = "Refugee ship (pirate)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refugee ship (pirate)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Refugee ship (pirate)", () => {
  it("is a pirate sector card with hail and ignore", () => {
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Refugee (Pirate)]]
    const pages = citedPagesFor("PIRATE_SECTOR").filter((p) => p.dest === "Refugee ship (pirate)");
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0]?.sectors, ["PIRATE_SECTOR"]);
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "Refugee ship.");
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["1 in 2: trade. 1 in 2: fight a pirate ship.", "Nothing happens."],
    );
  });

  it("hails a trade or a pirate bait that does not run, and ignoring them does nothing", () => {
    let trade = false;
    let fight = false;
    for (let seed = 1; seed <= 40 && (!trade || !fight); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:refugee-pirate:0");
      const text = `${g.event?.body ?? ""}\n${g.log.join("\n")}`;
      assert.equal(/Zoltan ship suddenly jumps|Slug ship jumps|pirate ambush/i.test(text), false);
      if (g.event?.choices.some((c) => c.id === "ship-resume")) {
        fight = true;
        assert.match(g.event?.body ?? "", /using the refugee ship as bait/);
        assert.equal(/using the refugee ship as bait/.test(g.log.join("\n")), false);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemyEscape?.mode, "never");
        assert.equal(g.fightEvent, "refugee-pirate");
        assert.equal(/using the refugee ship as bait/.test(g.log.join("\n")), false);
      } else {
        trade = true;
        assert.ok((g.event?.body ?? "").includes(eventText("event_REFUGEE_TRADER_text")));
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
    choose(left, "c:refugee-pirate:1");
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.scrap, scrap);
    assert.equal(left.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(left.phase, "event");
  });

  it("pays medium or high scrap with resources, then the printed contact for that ending", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const before = destroyed.scrap;
    assert.equal(pageWin(destroyed, "refugee-pirate", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, textRe("ship_PIRATE_REFUGEE_destroyed_text"));
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, before + paid[0]!);
    assert.deepEqual(
      destroyed.event?.choices.map((c) => c.label),
      [eventText("ship_ZOLTAN_REFUGEE_destroyed_c1_choice")],
    );
    const mid = destroyed.scrap;
    choose(destroyed, "s:refugee-pirate:contact");
    const thanks = destroyed.event?.body ?? "";
    assert.ok((thanks).includes(eventText("ship_PIRATE_REFUGEE_destroyed_c1_text")));
    assert.equal((thanks).includes(eventText("ship_PIRATE_REFUGEE_deadCrew_c1_text")), false);
    const low = scraps(thanks);
    assert.equal(low.length, 1, thanks);
    assert.ok(low[0]! >= 7 && low[0]! <= 10, thanks);
    assert.equal(resources(thanks), 2, thanks);
    assert.equal(destroyed.scrap, mid + low[0]!);

    const killed = createGame(2);
    open(killed);
    const start = killed.scrap;
    assert.equal(pageWin(killed, "refugee-pirate", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, textRe("ship_PIRATE_REFUGEE_deadCrew_text", "ship_ZOLTAN_REFUGEE_deadCrew_text"));
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, start + high[0]!);
    const after = killed.scrap;
    choose(killed, "s:refugee-pirate:contact-dead");
    const followed = killed.event?.body ?? "";
    assert.ok((followed).includes(eventText("ship_PIRATE_REFUGEE_deadCrew_c1_text")));
    const spare = scraps(followed);
    assert.equal(spare.length, 1, followed);
    assert.ok(spare[0]! >= 7 && spare[0]! <= 10, followed);
    assert.equal(resources(followed), 2, followed);
    assert.equal(killed.scrap, after + spare[0]!);
  });
});
