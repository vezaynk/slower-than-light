import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:escape-pod";
  b.name = "Escape pod";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Escape pod");
  return g.event;
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player").length;
}

describe("Escape pod", () => {
  it("jettisoning the pod spends nothing", () => {
    // Wiki citations:
    // > "Jettison the pod." — [[Escape pod]]
    // > "You send the pod back out the airlock. You're not stupid." — [[Escape pod]]
    // > "Nothing happens." — [[Escape pod]]
    const g = createGame(1);
    const crew = g.crew.map((c) => c.name);
    open(g);
    fillerChoose(g, "c:escape-pod:0");
    assert.match(g.event?.body ?? "", /airlock/);
    assert.equal(g.scrap, 10);
    assert.deepEqual(g.crew.map((c) => c.name), crew);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("prying it open boards one Mantis and loses a crewmember, or adds nobody", () => {
    // Wiki citations:
    // > "Pry it open." — [[Escape pod]]
    // > "The Mantis inside is FURIOUS. He cuts the closest person in half with a single swipe. Kill it before anyone else is hurt." — [[Escape pod]]
    // > "1 mantis boarder beams aboard your ship and you lose a crewmember." — [[Escape pod]]
    // > "The Mantis inside considers you a messenger from the god of mercy and demands to join your crew." — [[Escape pod]]
    // > "A man bursts out of the life-pod screaming and claws his way into a corner. A rare survivor of Mantis captivity. Once calm, the survivor offers to join your crew for a time." — [[Escape pod]]
    let boarded = false;
    let mantis = false;
    let human = false;
    for (let seed = 1; seed <= 80 && (!boarded || !mantis || !human); seed++) {
      const g = createGame(seed);
      const crew = players(g);
      const names = g.crew.map((c) => c.name);
      open(g);
      fillerChoose(g, "c:escape-pod:1");
      if (g.phase === "combat") {
        boarded = true;
        assert.equal(g.crew.filter((c) => c.side === "enemy" && c.kin === "blade").length, 1);
        assert.equal(players(g), crew - 1);
        assert.match(g.log.join(" "), /is lost/);
        assert.ok(g.log.includes("The Mantis inside is FURIOUS. He cuts the closest person in half with a single swipe. Kill it before anyone else is hurt."));
      } else if (/god of mercy/.test(g.event?.body ?? "")) {
        mantis = true;
        assert.equal(players(g), crew);
        assert.deepEqual(g.crew.map((c) => c.name), names);
      } else {
        human = true;
        assert.match(g.event?.body ?? "", /Mantis captivity/);
        assert.equal(players(g), crew);
        assert.deepEqual(g.crew.map((c) => c.name), names);
      }
    }
    assert.equal(boarded && mantis && human, true);
  });

  it("a clone bay revives the crewmember the Mantis kills", () => {
    // Wiki citations:
    // > "The lost crewmember is revived." — [[Escape pod]]
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = players(g);
      open(g);
      fillerChoose(g, "c:escape-pod:1");
      if (g.phase !== "combat") continue;
      seen = true;
      assert.equal(players(g), crew);
      assert.match(g.log.join(" "), /revived/);
      assert.equal(g.crew.filter((c) => c.side === "enemy" && c.kin === "blade").length, 1);
    }
    assert.equal(seen, true);
  });
});
