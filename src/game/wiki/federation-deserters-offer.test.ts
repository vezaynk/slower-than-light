import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const ID = "c:federation-deserters:2";
const SENTENCE =
  "You send over some supplies to help them on their way and in return they upload their flight plan to your computer, allowing you to map the sector! \"The Federation fleet's still standing - get there while you can!\"";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:federation-deserters";
  b.name = "Federation deserters";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Federation deserters offer supplies", () => {
  it("stays closed without 15 scrap or 1 fuel", () => {
    const poor = createGame(1);
    open(poor);
    poor.scrap = 14;
    poor.fuel = 10;
    assert.equal(choiceDisabled(poor, ID), "Need 15 scrap");
    choose(poor, ID);
    assert.equal(poor.scrap, 14);
    assert.equal(poor.phase, "event");

    const dry = createGame(2);
    open(dry);
    dry.scrap = 40;
    dry.fuel = 0;
    assert.equal(choiceDisabled(dry, ID), "Need 1 fuel");
    choose(dry, ID);
    assert.equal(dry.fuel, 0);
    assert.equal(dry.scrap, 40);
  });

  it("spends 15 to 25 scrap and 1 to 3 fuel and shows the printed flight-plan sentence", () => {
    const g = createGame(3);
    open(g);
    g.scrap = 40;
    g.fuel = 10;
    const map = g.sectorMap;
    choose(g, ID);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, `${SENTENCE}\n\nThe current sector map is revealed.`);
    assert.ok(g.scrap <= 25 && g.scrap >= 15, String(g.scrap));
    assert.ok(g.fuel <= 9 && g.fuel >= 7, String(g.fuel));
    assert.equal(g.sectorMap, map);
    assert.equal(g.enemy, null);
  });
});
