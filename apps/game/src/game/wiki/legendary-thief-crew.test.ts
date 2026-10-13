import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:legendary-thief-kazaaakplethkilik";
  b.name = "Legendary thief KazaaakplethKilik";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Legendary thief KazaaakplethKilik");
}

describe("Legendary thief KazaaakplethKilik crew", () => {
  it("preparing to fight fields a Mantis ship whose crew are all Mantis", () => {
    const hp = kinOf("blade").hp;
    const g = createGame(1);
    open(g);
    choose(g, "c:legendary-thief-kazaaakplethkilik:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.fightEvent, "legendary-thief-kazaaakplethkilik");
    assert.equal(g.scrap, 10);
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(theirs.length > 0);
    assert.ok(theirs.every((c) => c.kin === "blade" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp));
  });
});
