import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, choiceDisabled } from "../sim.ts";
import type { Game } from "../types.ts";
import { EXTRA_EVENTS } from "./cited-events-surrender.ts";
import { citedEvent } from "./cited-events.ts";

const DUEL = "s:the-black-raven:duel";

function arrive(seed: number): Game {
  const g = createGame(seed);
  g.sectorName = "Slug Home Nebula";
  const ev = EXTRA_EVENTS.find((e) => e.dest === "The Black Raven")!;
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store")!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = ev.dest;
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  choose(g, "c:the-black-raven:0");
  return g;
}

function slugsAboard(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "gel" && c.aboard === "player");
}

describe("The Black Raven mind duel", () => {
  it("stays closed without a living Slug, including a dead one", () => {
    const g = arrive(4);
    assert.equal(choiceDisabled(g, DUEL), "Needs a Slug crewmember");
    const weapons = g.player.weapons.length;
    choose(g, DUEL);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.player.weapons.length, weapons);
    g.crew[0].kin = "gel";
    g.crew[0].hp = 0;
    assert.equal(choiceDisabled(g, DUEL), "Needs a Slug crewmember");
    choose(g, DUEL);
    assert.equal(g.phase, "event");
  });

  it("a living Slug either beams 1-2 slug boarders into the fight or pays high scrap and no weapon", () => {
    let boarded = false;
    let paid = false;
    for (let seed = 1; seed <= 80 && !(boarded && paid); seed++) {
      const g = arrive(seed);
      g.crew[0].kin = "gel";
      assert.equal(choiceDisabled(g, DUEL), null);
      const weapons = g.player.weapons.map((w) => w.defId);
      const scrap = g.scrap;
      choose(g, DUEL);
      if (g.phase === "combat") {
        boarded = true;
        const boarders = slugsAboard(g);
        assert.ok(boarders.length >= 1 && boarders.length <= 2, String(boarders.length));
        assert.ok(boarders.every((c) => c.name === "Slug" && c.hp === 100));
        assert.equal(g.enemy!.faction, "slug");
        assert.ok(g.enemy!.pirate);
        assert.equal(g.fightEvent, "the-black-raven");
        assert.ok(g.log.some((line) => line.includes("grunts in pain and collapses onto the floor, stunned.")));
        assert.equal(g.scrap, scrap);
        assert.deepEqual(g.player.weapons.map((w) => w.defId), weapons);
      } else {
        paid = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        assert.equal(slugsAboard(g).length, 0);
        assert.ok(g.scrap > scrap);
        assert.deepEqual(g.player.weapons.map((w) => w.defId), weapons);
        assert.match(g.event!.body, /shakes off the daze and appears victorious/);
        assert.match(g.event!.body, /concedes his defeat/);
        assert.doesNotMatch(g.event!.body, /weapon/i);
      }
    }
    assert.ok(boarded && paid);
  });
});
