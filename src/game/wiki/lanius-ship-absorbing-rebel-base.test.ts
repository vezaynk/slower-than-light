import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-absorbing-rebel-base";
  b.name = "Lanius ship absorbing rebel base";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Lanius ship absorbing rebel base");
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius ship absorbing rebel base", () => {
  it("leaves them with nothing spent", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-absorbing-rebel-base:1");
    assert.match(g.event?.body ?? "", /leave them be/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("asking them delays the fleet with medium scrap, starts a Lanius fight, or does nothing", () => {
    let delay = false;
    let fight = false;
    let nothing = false;
    for (let seed = 1; seed <= 80 && (!delay || !fight || !nothing); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:lanius-ship-absorbing-rebel-base:0");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.enemy?.faction, "lanius");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
        assert.ok(g.log.some((line) => line.includes("scoff")));
      } else if (/delayed for 1 turn/.test(g.event?.body ?? "")) {
        delay = true;
        assert.equal(g.fleet, 4);
        const body = g.event?.body ?? "";
        const paid = [...body.matchAll(/Scrap: (\d+)/g)].map((m) => Number(m[1]));
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
      } else {
        nothing = true;
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
      }
    }
    assert.equal(delay && fight && nothing, true);
  });

  it("a Lanius crewmember delays the fleet for medium scrap, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-ship-absorbing-rebel-base:2"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-ship-absorbing-rebel-base:2");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.fleet, 5);

    const g = createGame(2);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    assert.equal(choiceDisabled(g, "c:lanius-ship-absorbing-rebel-base:2"), null);
    choose(g, "c:lanius-ship-absorbing-rebel-base:2");
    assert.equal(g.fleet, 4);
    const body = g.event?.body ?? "";
    assert.match(body, /delayed for 1 turn/);
    const paid = [...body.matchAll(/Scrap: (\d+)/g)].map((m) => Number(m[1]));
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.phase, "event");
  });
});
