import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "Your Mantis crew-member steps forward. He and KazaaakplethKilik perform a weird kind of alien haka. You, meanwhile, charge the battle systems.";

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

describe("Legendary thief KazaaakplethKilik hail", () => {
  it("stays closed without a Mantis crewmember", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:legendary-thief-kazaaakplethkilik:1" && c.label === "Attempt to hail him."));
    assert.equal(choiceDisabled(g, "c:legendary-thief-kazaaakplethkilik:1"), "Needs a Mantis crewmember");
    choose(g, "c:legendary-thief-kazaaakplethkilik:1");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("hailing shows the printed haka sentence and fights a Mantis ship whose crew are all Mantis", () => {
    const hp = kinOf("blade").hp;
    const g = createGame(2);
    const pilot = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(pilot);
    pilot.kin = "blade";
    open(g);
    assert.equal(choiceDisabled(g, "c:legendary-thief-kazaaakplethkilik:1"), null);
    choose(g, "c:legendary-thief-kazaaakplethkilik:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "legendary-thief-kazaaakplethkilik");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.scrap, 10);
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
    assert.ok(theirs.length > 0);
    assert.ok(theirs.every((c) => c.kin === "blade" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp));
  });
});
