import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ROCK_ATHIEST";
  b.name = "Rock atheists";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock atheists");
}

function rocks(g: Game): number {
  return g.crew.filter((c) => c.side === "player" && c.kin === "rock").length;
}

describe("Rock atheists", () => {
  it("telling them their god sent them starts a Rock fight after one of the two lines", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20 && seen.size < 2; seed++) {
      const g = createGame(seed);
      open(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:rock-atheists:0");
      assert.equal(g.phase, "event");
      assert.equal(g.event?.choices[0]?.id, "ship-resume");
      const line = g.event?.body ?? "";
      assert.ok(line.includes("lies") || line.includes("Traitors"), line);
      assert.equal(
        g.log.some((l) => l.includes("lies") || l.includes("Traitors")),
        false,
      );
      seen.add(line);
      choose(g, "ship-resume");
      assert.equal(g.phase, "combat");
      assert.equal(g.fightEvent, "rock-atheists");
      assert.equal(g.enemy?.faction, "rock");
      assert.equal(g.enemy?.pirate, false);
      assert.equal(g.scrap, 10);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    }
    assert.equal(seen.size, 2);
    const g = createGame(1);
    open(g);
    assert.equal(pageWin(g, "rock-atheists", false), false);
  });

  it("a promise refuses twice as often as it adds a Rockman, and sensors level 2 adds one", () => {
    let joined = 0;
    let refused = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      open(g);
      const before = rocks(g);
      choose(g, "c:rock-atheists:1");
      assert.notEqual(g.phase, "combat");
      assert.equal(g.scrap, 10);
      if (rocks(g) === before + 1) {
        joined += 1;
        assert.match(g.event?.body ?? "", /serve with you/);
      } else {
        refused += 1;
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(rocks(g), before);
      }
    }
    assert.ok(refused > joined);
    assert.ok(joined > 0);

    const closed = createGame(3);
    open(closed);
    closed.player.systems.sensors.level = 1;
    assert.equal(choiceDisabled(closed, "c:rock-atheists:2"), "Needs level 2 Sensors");
    const crew = closed.crew.length;
    choose(closed, "c:rock-atheists:2");
    assert.equal(closed.crew.length, crew);

    const g = createGame(4);
    open(g);
    g.player.systems.sensors.level = 2;
    assert.equal(choiceDisabled(g, "c:rock-atheists:2"), null);
    const before = rocks(g);
    choose(g, "c:rock-atheists:2");
    assert.equal(rocks(g), before + 1);
    assert.match(g.event?.body ?? "", /impressed by the data/);
    assert.equal(g.phase, "event");
  });
});
