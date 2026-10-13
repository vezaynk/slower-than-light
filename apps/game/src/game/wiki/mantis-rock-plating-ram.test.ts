import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "Before they have a chance, you ram your ship into theirs, causing irreparable damage to their engines. Luckily, your ship's armored hull is hardly dented from the impact. The Mantis ship careens away and you move in to attack.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-with-rock-body-parts";
  b.name = "Mantis ship with Rock body parts";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Mantis ship with Rock body parts Rock Plating ram", () => {
  it("stays closed without Rock Plating", () => {
    const g = createGame(1);
    open(g);
    const hull = g.player.hull;
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-with-rock-body-parts:3" && c.label === "Ram the bastards."));
    assert.equal(choiceDisabled(g, "c:mantis-ship-with-rock-body-parts:3"), "Needs Rock Plating");
    choose(g, "c:mantis-ship-with-rock-body-parts:3");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
  });

  it("ramming with Rock Plating disables the Mantis engines and leaves the hull untouched", () => {
    const g = createGame(2);
    g.augments.push("keel");
    open(g);
    assert.equal(choiceDisabled(g, "c:mantis-ship-with-rock-body-parts:3"), null);
    const hull = g.player.hull;
    choose(g, "c:mantis-ship-with-rock-body-parts:3");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "mantis-ship-with-rock-body-parts");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    const engines = g.enemy?.systems.engines;
    assert.ok(engines);
    assert.ok(engines.level > 0);
    assert.equal(engines.damage, engines.level);
    assert.equal(engines.power, 0);
  });
});
