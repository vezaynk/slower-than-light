import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-attacking-civilian-distress";
  b.name = "Pirate ship attacking civilian distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Pirate ship attacking civilian distress");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Pirate ship attacking civilian distress", () => {
  it("aiding the civilian starts a pirate fight, and staying out spends nothing", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:pirate-ship-attacking-civilian-distress:2"), true);
    choose(g, "c:pirate-ship-attacking-civilian-distress:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-distress");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);

    const out = createGame(1);
    open(out);
    choose(out, "c:pirate-ship-attacking-civilian-distress:1");
    assert.equal(out.phase, "map");
    assert.equal(out.scrap, 10);
    assert.equal(out.fleet, 5);
  });

  it("a destroyed ship pays medium scrap, and a crew kill pays high, then the contact", () => {
    const destroyed = createGame(1);
    open(destroyed);
    assert.equal(pageWin(destroyed, "pirate-ship-attacking-civilian-distress", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /The pirate ship breaks apart/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "pirate-ship-attacking-civilian-distress", true), true);
    const high = scraps(killed.event?.body ?? "");
    assert.equal(high.length, 1);
    assert.ok(high[0]! >= 19 && high[0]! <= 23);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("level 6 weapons starts that fight or sends the pirate away", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:pirate-ship-attacking-civilian-distress:2"), "Needs level 6 Weapons");
    choose(bare, "c:pirate-ship-attacking-civilian-distress:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    let fight = false;
    let left = false;
    for (let seed = 1; seed <= 40 && (!fight || !left); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.systems.weapons.level = 6;
      assert.equal(choiceDisabled(g, "c:pirate-ship-attacking-civilian-distress:2"), null);
      choose(g, "c:pirate-ship-attacking-civilian-distress:2");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "pirate-ship-attacking-civilian-distress");
        assert.equal(g.enemy?.pirate, true);
        assert.equal(g.scrap, 10);
        assert.match(g.log.join("\n"), /greater threat/);
      } else {
        left = true;
        assert.match(g.event?.body ?? "", /wasn't looking for a fight/);
        assert.equal(g.scrap, 10);
        assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);
        assert.equal(g.phase, "event");
      }
    }
    assert.equal(fight && left, true);
  });
});
