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
  b.flag = "cited:lanius-ship-attacking-civilian-distress";
  b.name = "Lanius ship attacking civilian distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking civilian distress");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius ship attacking civilian distress", () => {
  it("fighting starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian-distress:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian-distress");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays medium scrap and a crew kill pays high", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      assert.equal(pageWin(g, "lanius-ship-attacking-civilian-distress", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /No more life signs/ : /Lanius craft breaks apart/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= (dead ? 19 : 12) && paid[0]! <= (dead ? 23 : 19), body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);
    }
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian-distress:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });

  it("a Lanius crewmember starts that fight or powers the ship down, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-ship-attacking-civilian-distress:2"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-ship-attacking-civilian-distress:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    let fight = false;
    let peace = false;
    for (let seed = 1; seed <= 40 && (!fight || !peace); seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(joinCrew(g, "Lanius"), true);
      assert.equal(choiceDisabled(g, "c:lanius-ship-attacking-civilian-distress:2"), null);
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:lanius-ship-attacking-civilian-distress:2");
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "lanius-ship-attacking-civilian-distress");
        assert.equal(g.enemy?.faction, "lanius");
        assert.equal(g.scrap, 10);
        assert.ok(g.log.some((line) => line.includes("gone completely rogue")));
      } else {
        peace = true;
        assert.match(g.event?.body ?? "", /powers down its weapons/);
        assert.equal(g.event?.body.includes("Scrap:"), false);
        assert.equal(g.scrap, 10);
        assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"), true);
      }
    }
    assert.equal(fight && peace, true);
  });
});
