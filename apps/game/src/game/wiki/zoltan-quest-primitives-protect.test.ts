import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

const LEAD =
  "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence.";

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

describe("Zoltan quest primitives protect", () => {
  it("protecting the aliens shows the printed firing sentence and starts a Rebel fight", () => {
    // Wiki citations:
    // > "Protect the aliens' way of life - Attack the Rebel ship." — [[Zoltan quest primitives]]
    // > "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence." — [[Zoltan quest primitives]]
    // > "Fight the Rebel Ship." — [[Zoltan quest primitives]]
    const g = createGame(1);
    open(g);
    choose(g, "c:zoltan-quest-primitives:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "zoltan-quest-primitives-protect");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.scrap, 10);
  });

  it("pays a weapon with low scrap when the hull breaks, and medium scrap for a crew kill, with no resources", () => {
    // Wiki citations:
    // > "After destroying enemy ship The Zoltan hail once the smoke disperses. \"Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times' sake.\" You accept their reward and scrap, then collect some remains from the Rebel ship." — [[Zoltan quest primitives]]
    // > "You receive a weapon with low scrap." — [[Zoltan quest primitives]]
    // > "After killing enemy crew The Zoltan hail once the smoke disperses. \"Thank you. We were led to believe Federation ideals died along with the Federation itself. Let us aid you a little, for old times' sake.\" You accept their reward and scrap, then collect some remains from the Rebel ship." — [[Zoltan quest primitives]]
    // > "You receive a weapon with medium scrap." — [[Zoltan quest primitives]]
    for (const deadCrew of [false, true]) {
      const g = createGame(deadCrew ? 4 : 5);
      open(g);
      choose(g, "c:zoltan-quest-primitives:1");
      assert.ok(!g.pursuitDouble);
      assert.equal(pageWin(g, "zoltan-quest-primitives-protect", deadCrew), true);
      assert.ok(!g.pursuitDouble);
      const body = g.event?.body ?? "";
      assert.ok(body.startsWith("The Zoltan hail once the smoke"));
      assert.match(body, /mounted\.|stowed in cargo\./);
      assert.equal(/Fuel:|Missiles:|Drone parts:/.test(body), false, body);
      const paid = Number(body.match(/Scrap: (\d+)/)?.[1]);
      if (deadCrew) assert.ok(paid >= 12 && paid <= 19, body);
      else assert.ok(paid >= 7 && paid <= 10, body);
    }
  });
});
