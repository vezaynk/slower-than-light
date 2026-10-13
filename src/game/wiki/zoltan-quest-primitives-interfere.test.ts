import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

const LEAD =
  "The local people - furry, one-eyed tree lizard things - begin chanting when they see you. Suddenly the sky is lit by laser fire - the Zoltan opened fire on your ship! You dash back to the shuttle and join the fight.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-quest-primitives";
  b.name = "Zoltan quest primitives";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan quest primitives");
}

describe("Zoltan quest primitives interfere", () => {
  it("interfering shows the printed chant sentence and starts a Zoltan fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-quest-primitives:0");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "zoltan-quest-primitives-interfere");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(g.scrap, 10);
  });

  it("both endings double the pursuit for one jump and pay scrap with resources", () => {
    for (const deadCrew of [false, true]) {
      const g = createGame(deadCrew ? 2 : 3);
      open(g);
      choose(g, "c:zoltan-quest-primitives:0");
      assert.equal(pageWin(g, "zoltan-quest-primitives-interfere", deadCrew), true);
      assert.equal(g.pursuitDouble, true);
      const body = g.event?.body ?? "";
      assert.ok(body.startsWith("The Rebel contacts you."));
      assert.match(body, /Rebel Fleet pursuit is doubled for 1 jump/);
      const paid = Number(body.match(/Scrap: (\d+)/)?.[1]);
      if (deadCrew) assert.ok(paid >= 7 && paid <= 23, body);
      else assert.ok(paid >= 7 && paid <= 10, body);
      assert.equal(["Fuel:", "Missiles:", "Drone parts:"].filter((label) => body.includes(label)).length, 2, body);
    }
  });
});
