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
  b.flag = "PIRATE_CIVILIAN";
  b.name = "Pirate ship attacking civilian";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Pirate ship attacking civilian");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Pirate ship attacking civilian", () => {
  it("aiding the civilian starts a pirate fight", () => {
    const g = createGame(1);
    open(g);
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian:0"),
      true,
    );
    choose(g, "c:pirate-ship-attacking-civilian:0");
    const lead = eventText("event_PIRATE_CIVILIAN_c1_text");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("a destroyed ship pays medium scrap, and a crew kill pays high, then the contact", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const guns = destroyed.player.weapons.length;
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const fuel = destroyed.fuel;
    const missiles = destroyed.missiles;
    const parts = destroyed.player.parts;
    assert.equal(pageWin(destroyed, "pirate-ship-attacking-civilian", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(
      body,
      textRe("ship_PIRATE_CIVILIAN_destroyed_text", "ship_PIRATE_REFUGEE_destroyed_text"),
    );
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.player.weapons.length, guns);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    const gained =
      destroyed.fuel - fuel + (destroyed.missiles - missiles) + (destroyed.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(
      destroyed.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"),
      true,
    );

    const killed = createGame(2);
    open(killed);
    const kFuel = killed.fuel;
    const kMissiles = killed.missiles;
    const kParts = killed.player.parts;
    assert.equal(pageWin(killed, "pirate-ship-attacking-civilian", true), true);
    const killedBody = killed.event?.body ?? "";
    assert.match(
      killedBody,
      textRe(
        "ship_LANIUS_CIVILIAN_deadCrew_text",
        "ship_LANIUS_CIVILIAN_destroyed_text",
        "ship_PIRATE_CIVILIAN_deadCrew_text",
        "ship_PIRATE_CIVILIAN_destroyed_text",
        "ship_REBEL_AUTO_CIVILIAN_destroyed_text",
      ),
    );
    const high = scraps(killedBody);
    assert.equal(high.length, 1, killedBody);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, killedBody);
    assert.equal(resources(killedBody), 2, killedBody);
    assert.equal(killed.scrap, 10 + high[0]!);
    const kGained =
      killed.fuel - kFuel + (killed.missiles - kMissiles) + (killed.player.parts - kParts);
    assert.ok(kGained >= 2 && kGained <= 6, killedBody);
    assert.equal(killed.fleet, 5);
  });

  it("contact pays low scrap, five repairs, medium scrap, low scrap with resources, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "pirate-ship-attacking-civilian", false);
      const before = g.scrap;
      const guns = weaponsHeld(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      g.player.hull = 20;
      choose(g, "q:lanius-civilian:contact");
      const body = g.event?.body ?? "";
      // The shipwright's weapon is unnamed: Rewards, "Weapon": "A random weapon & T scrap."
      assert.equal(
        weaponsHeld(g),
        guns + (textRe("event_SAVE_CIVILIAN_LIST_LANIUS_4_text").test(body) ? 1 : 0),
      );
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      if (textRe("event_SAVE_CIVILIAN_LIST_LANIUS_4_text").test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, before + paid[0]!);
        assert.equal(g.player.hull, 20);
        seen.add("weapon");
      } else if (
        textRe("event_QUEST_ESCORT_ARRIVE_3_text", "event_SAVE_CIVILIAN_LIST_LANIUS_5_text").test(
          body,
        )
      ) {
        assert.match(body, /Hull repairs: 5/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 25);
        seen.add("repair");
      } else if (textRe("event_SAVE_CIVILIAN_LIST_LANIUS_2_text").test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("medium");
      } else if (textRe("event_SAVE_CIVILIAN_LIST_LANIUS_3_text").test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        seen.add("low");
      } else {
        assert.match(body, textRe("event_SAVE_CIVILIAN_LIST_LANIUS_6_text"));
        assert.match(body, /Nothing happens/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        assert.equal(g.player.hull, 20);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["low", "medium", "nothing", "repair", "weapon"]);
  });

  it("staying out of it spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:pirate-ship-attacking-civilian:1");
    assert.equal(g.phase, "event");
    assert.match(
      g.event?.body ?? "",
      textRe("event_PIRATE_CIVILIAN_BEACON_c2_text", "event_PIRATE_CIVILIAN_c2_text"),
    );
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });
});
