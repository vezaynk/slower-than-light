import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-lone-ship";
  b.name = "Lanius lone ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius lone ship");
}

describe("Lanius lone ship", () => {
  it("attacking starts a Lanius fight on default rewards", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, `You arrive at the beacon to discover a civilian ship fleeing from a lone Lanius craft. The civilian messages you, "Help! The metal monsters are coming to melt down our ship!" Strangely, no active weapon signatures are detected.`);
    choose(g, "c:lanius-lone-ship:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-lone-ship");
    assert.equal(pageWin(g, "lanius-lone-ship", false), false);
    assert.equal(pageWin(g, "lanius-lone-ship", true), false);
    assert.equal(g.scrap, 10);
  });

  it("staying out shows the printed escape sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 5;
    choose(g, "c:lanius-lone-ship:1");
    assert.equal(
      g.event?.body,
      "You ignore the ship's pleas and watch as it hastily escapes. Oddly, the Lanius ship makes no move to chase it. You wonder if they were ever a threat at all.\n\nNothing happens.",
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
      assert.match(g.event?.body ?? "", /Don't go any closer/);
      assert.equal(g.scrap, 10);
      choose(g, "q:lanius-lone:continue");
      if (g.phase === "store") {
        assert.ok(g.stock && g.stock.length > 0);
        assert.equal(g.scrap, 10);
        assert.match(g.log.join("\n"), /trade potential/);
        seen.add("store");
      } else if (g.phase === "combat") {
        assert.equal(g.fightEvent, "lanius-lone-ship");
        assert.equal(pageWin(g, "lanius-lone-ship", false), false);
        assert.equal(g.scrap, 10);
        assert.match(g.log.join("\n"), /enraged/);
        seen.add("fight");
      } else {
        assert.match(g.event?.body ?? "", /Expunge/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
        seen.add("nothing");
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "nothing", "store"]);
  });

  it("a living Lanius opens the store", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-lone-ship:3"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-lone-ship:3");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "voidlung");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(choiceDisabled(dead, "c:lanius-lone-ship:3"), "Needs a Lanius crewmember");

    const g = createGame(3);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    assert.equal(choiceDisabled(g, "c:lanius-lone-ship:3"), null);
    choose(g, "c:lanius-lone-ship:3");
    assert.equal(g.phase, "store");
    assert.ok(g.stock && g.stock.length > 0);
    assert.equal(g.scrap, 10);
    assert.match(g.log.join("\n"), /merchant's guild/);
  });
});
