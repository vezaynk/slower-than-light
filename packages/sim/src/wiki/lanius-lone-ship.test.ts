import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { joinCrew } from "./surrender.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_SCARED_CIVILIAN";
  b.name = "Optional fight: unarmed Lanius ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: unarmed Lanius ship");
}

describe("Optional fight: unarmed Lanius ship", () => {
  it("attacking starts a Lanius fight on default rewards", () => {
    // Wiki citations:
    // > "You arrive at the beacon to discover a civilian ship fleeing from a lone Lanius craft. The civilian messages you, \"Help! The metal monsters are coming to melt down our ship!\" Strangely, no active weapon signatures are detected." — [[Lanius lone ship]]
    // > "Attack the Lanius ship." — [[Lanius lone ship]]
    // > "The civilian ship hastily retreats while you intercept the path of the ship and lock on weapons. It turns and prepares for a fight." — [[Lanius lone ship]]
    // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius lone ship]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "Unarmed Lanius ship chasing a civilian ship.");
    const lead = eventText("event_LANIUS_SCARED_CIVILIAN_c1_text");
    choose(g, "c:lanius-lone-ship:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-lone-ship");
    assert.equal(pageWin(g, "lanius-lone-ship", false), false);
    assert.equal(pageWin(g, "lanius-lone-ship", true), false);
    assert.equal(g.scrap, 10);
  });

  it("staying out shows the printed escape sentence and nothing happens", () => {
    // Wiki citations:
    // > "Stay out of it." — [[Lanius lone ship]]
    // > "You ignore the ship's pleas and watch as it hastily escapes. Oddly, the Lanius ship makes no move to chase it. You wonder if they were ever a threat at all." — [[Lanius lone ship]]
    // > "Nothing happens." — [[Lanius lone ship]]
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:lanius-lone-ship:1");
    assert.equal(
      g.event?.body,
      [eventText("event_LANIUS_SCARED_CIVILIAN_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
  });

  it("contacting continues into a store, a default fight, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:lanius-lone-ship:2");
      assert.match(g.event?.body ?? "", textRe("event_LANIUS_SCARED_CIVILIAN_c3_text"));
      assert.equal(g.scrap, 10);
      choose(g, "q:lanius-lone:continue");
      const body = g.event?.body ?? "";
      const store = g.event?.choices.some((c) => c.id === "q:open-store") === true;
      const fight =
        g.enemy != null && g.event?.choices.some((c) => c.id === "ship-resume") === true;
      if (store) {
        assert.match(body, textRe("event_LANIUS_SCARED_CIVILIAN_LIST_1_text"));
        assert.equal(g.log.includes(eventText("event_LANIUS_SCARED_CIVILIAN_LIST_1_text")), false);
        choose(g, "q:open-store");
        assert.equal(g.phase, "store");
        assert.ok(g.stock && g.stock.length > 0);
        assert.equal(g.scrap, 10);
        seen.add("store");
      } else if (fight) {
        assert.match(body, textRe("event_LANIUS_SCARED_CIVILIAN_LIST_3_text"));
        assert.equal(g.log.includes(eventText("event_LANIUS_SCARED_CIVILIAN_LIST_3_text")), false);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "lanius-lone-ship");
        assert.equal(pageWin(g, "lanius-lone-ship", false), false);
        assert.equal(g.scrap, 10);
        seen.add("fight");
      } else {
        assert.match(g.event?.body ?? "", textRe("event_LANIUS_SCARED_CIVILIAN_LIST_2_text"));
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "nothing", "store"]);
  });

  it("a living Lanius opens the store", () => {
    // Wiki citations:
    // > "Try to contact the ship." — [[Lanius lone ship]]
    // > "A store opens." — [[Lanius lone ship]]
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-lone-ship:3"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-lone-ship:3");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "anaerobic");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(choiceDisabled(dead, "c:lanius-lone-ship:3"), "Needs a Lanius crewmember");

    const g = createGame(3);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    assert.equal(choiceDisabled(g, "c:lanius-lone-ship:3"), null);
    choose(g, "c:lanius-lone-ship:3");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "q:open-store");
    assert.match(g.event?.body ?? "", textRe("event_LANIUS_SCARED_CIVILIAN_c4_text"));
    assert.equal(g.log.includes(eventText("event_LANIUS_SCARED_CIVILIAN_c4_text")), false);
    choose(g, "q:open-store");
    assert.equal(g.phase, "store");
    assert.ok(g.stock && g.stock.length > 0);
    assert.equal(g.scrap, 10);
  });
});
