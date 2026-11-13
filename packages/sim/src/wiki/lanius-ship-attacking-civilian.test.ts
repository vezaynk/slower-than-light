import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

/** Weapons held anywhere: rack, cargo, or a make-room choice. */
function weaponsHeld(g: Game): number {
  return (
    g.player.weapons.length +
    [...(g.cargo ?? []), ...(g.overflow ?? [])].filter((x) => x.kind === "weapon").length
  );
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_CIVILIAN";
  b.name = "Lanius ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Lanius ship attacking civilian", () => {
  it("attacking starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    const lead = eventText("event_LANIUS_CIVILIAN_c1_text");
    choose(g, "c:lanius-ship-attacking-civilian:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays medium scrap and a crew kill pays high", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      assert.equal(pageWin(g, "lanius-ship-attacking-civilian", dead), true);
      const body = g.event?.body ?? "";
      assert.match(
        body,
        dead
          ? textRe("ship_LANIUS_CIVILIAN_deadCrew_text")
          : textRe("ship_LANIUS_AUTO_REBEL_destroyed_text", "ship_LANIUS_CIVILIAN_destroyed_text"),
      );
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= (dead ? 19 : 12) && paid[0]! <= (dead ? 23 : 19), body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(
        g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"),
        true,
      );
    }
  });

  it("contact pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-attacking-civilian", false);
      const before = g.scrap;
      const guns = weaponsHeld(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      g.player.hull = 20;
      choose(g, "q:lanius-civilian:contact");
      const body = g.event?.body ?? "";
      const lead = body.split("\n\n")[0];
      const weapon = lead === eventText("event_SAVE_CIVILIAN_LIST_LANIUS_4_text");
      // The shipwright's weapon is unnamed: Rewards, "Weapon": "A random weapon & T scrap."
      assert.equal(weaponsHeld(g), guns + (weapon ? 1 : 0));
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      if (weapon) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, before + paid[0]!);
        assert.equal(g.player.hull, 20);
        seen.add("weapon");
      } else if (lead === eventText("event_SAVE_CIVILIAN_LIST_LANIUS_5_text")) {
        assert.match(body, /Hull repairs: 5/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 25);
        seen.add("repair");
      } else if (lead === eventText("event_SAVE_CIVILIAN_LIST_LANIUS_2_text")) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("medium");
      } else if (lead === eventText("event_SAVE_CIVILIAN_LIST_LANIUS_3_text")) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("low");
      } else {
        assert.equal(lead, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_6_text"));
        assert.match(body, /Nothing happens/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 20);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["low", "medium", "nothing", "repair", "weapon"]);
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian:1");
    assert.equal(
      g.event?.body,
      [eventText("event_LANIUS_CIVILIAN_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.notEqual(g.phase, "combat");
    assert.equal(g.scrap, 10);
  });
});
