import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-drink";
  b.name = "Slug drink";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Slug drink");
  assert.equal(
    g.event?.body,
    "A Slug captain hails and invites himself aboard your ship to present a flask of something slimy. \"Now, most gracioussss captain, you must join me please in a drink to our alliance!\"",
  );
}

describe("Slug drink", () => {
  it("refusing starts a Slug fight, and a Rock is required to pose as captain", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["Drink.", "Refuse", "Have your Rockman pose as captain."],
    );
    assert.equal(choiceDisabled(g, "c:slug-drink:1"), null);
    assert.equal(choiceDisabled(g, "c:slug-drink:2"), "Needs a Rock crewmember");
    choose(g, "c:slug-drink:2");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);

    const dead = createGame(2);
    open(dead);
    dead.crew[0].kin = "stone";
    dead.crew[0].hp = 0;
    assert.equal(choiceDisabled(dead, "c:slug-drink:2"), "Needs a Rock crewmember");

    const fight = createGame(3);
    open(fight);
    choose(fight, "c:slug-drink:0");
    assert.ok(fight.log.includes("The Slug feigns offense at your refusal, but you sense that he respects your caution. This does not, however, prevent him from returning to his ship and opening fire."));
    assert.equal(fight.phase, "combat");
    assert.equal(fight.fightEvent, "slug-drink");
    assert.equal(fight.enemy?.faction, "slug");
    assert.equal(fight.scrap, 10);
    assert.equal(fight.fleet, 5);
  });

  it("drinking repairs 10 and opens a store, or loses 25-35 scrap", () => {
    let trust = false;
    let trap = false;
    for (let seed = 1; seed <= 40 && (!trust || !trap); seed++) {
      const g = createGame(seed);
      open(g);
      g.scrap = 100;
      g.player.hull = g.player.hullMax - 20;
      const hull = g.player.hull;
      const crew = g.crew.filter((c) => c.side === "player").length;
      const guns = g.player.weapons.length;
      choose(g, "c:slug-drink:1");
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.fleet, 5);
      if (g.phase === "store") {
        trust = true;
        assert.equal(g.player.hull, hull + 10);
        assert.equal(g.scrap, 100);
        assert.ok(g.log.includes("Hull repairs: 10."));
        assert.ok(g.log.some((line) => /trustworthy/.test(line)));
        assert.ok((g.stock?.length ?? 0) > 0);
        assert.equal(g.beacons.find((b) => b.id === g.here)?.kind, "store");
      } else {
        trap = true;
        assert.equal(g.phase, "event");
        assert.equal(g.player.hull, hull);
        const body = g.event?.body ?? "";
        assert.match(body, /cargo hold/);
        const lost = Number(body.match(/Scrap: -(\d+)/)?.[1]);
        assert.ok(lost >= 25 && lost <= 35, body);
        assert.equal(g.scrap, 100 - lost);
        assert.equal(g.stock, null);
      }
    }
    assert.equal(trust, true);
    assert.equal(trap, true);
  });

  it("a living Rock is repaired and sold to, or starts that Slug fight", () => {
    let trust = false;
    let trap = false;
    for (let seed = 1; seed <= 40 && (!trust || !trap); seed++) {
      const g = createGame(seed);
      open(g);
      g.crew[0].kin = "stone";
      g.scrap = 80;
      g.player.hull = g.player.hullMax - 20;
      const hull = g.player.hull;
      assert.equal(choiceDisabled(g, "c:slug-drink:2"), null);
      choose(g, "c:slug-drink:2");
      assert.equal(g.fleet, 5);
      if (g.phase === "store") {
        trust = true;
        assert.equal(g.player.hull, hull + 10);
        assert.equal(g.scrap, 80);
        assert.ok(g.log.includes("Hull repairs: 10."));
        assert.ok(g.log.some((line) => /Rock digestive system/.test(line)));
        assert.equal(g.beacons.find((b) => b.id === g.here)?.kind, "store");
      } else {
        trap = true;
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "slug-drink");
        assert.equal(g.enemy?.faction, "slug");
        assert.equal(g.scrap, 80);
        assert.equal(g.player.hull, hull);
        assert.ok(g.log.some((line) => /anaesthetic/.test(line)));
      }
    }
    assert.equal(trust, true);
    assert.equal(trap, true);
  });
});
