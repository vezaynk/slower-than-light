import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD =
  "Thankfully your improved subsystem is able to counter their hacking enough to keep the life support barely functional. That should keep you alive at least...";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-oxygen";
  b.name = "Slug hacker (oxygen)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (oxygen)");
}

describe("Slug hacker (oxygen) improved oxygen", () => {
  it("stays closed below Oxygen level 2", () => {
    const g = createGame(1);
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-oxygen:1"));
    assert.equal(choiceDisabled(g, "c:slug-hacker-oxygen:1"), "Needs level 2 Oxygen");
    choose(g, "c:slug-hacker-oxygen:1");
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("shows the printed counter sentence, halves Oxygen, and starts a Slug fight", () => {
    const g = createGame(2);
    g.player.systems.oxygen.level = 2;
    g.player.systems.oxygen.power = 2;
    g.player.systems.oxygen.damage = 0;
    g.player.systems.oxygen.ion = [];
    const away = g.player.rooms.find((r) => r.system !== "oxygen");
    assert.ok(away);
    for (const c of g.crew) if (c.side === "player") c.room = away.id;
    for (const d of g.player.doors) d.open = false;
    for (const r of g.player.rooms) {
      r.o2 = 50;
      r.fire = 0;
      r.breach = 0;
    }
    open(g);
    assert.equal(choiceDisabled(g, "c:slug-hacker-oxygen:1"), null);
    choose(g, "c:slug-hacker-oxygen:1");
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-oxygen");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.systems.oxygen.level, 2);
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    if (g.enemy.kits.spike) {
      g.enemy.kits.spike.on = false;
      g.enemy.kits.spike.power = 0;
    }
    const room = g.player.rooms[0];
    assert.ok(room);
    const before = room.o2;
    step(g, 0.05);
    const gained = room.o2 - before;
    assert.ok(gained > 0.04 && gained < 0.1, String(gained));
  });
});
