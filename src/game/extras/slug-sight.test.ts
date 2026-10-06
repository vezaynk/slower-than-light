import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { playerSensorLevel } from "./spike.ts";
import { shipSight } from "./slug-sight.ts";
import type { Crew, Game } from "../types.ts";

function gel(g: Game, room: string, id = "slug"): Crew {
  const crew: Crew = {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp: 100,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "gel",
  };
  g.crew.push(crew);
  return crew;
}

function dark(g: Game) {
  g.player.systems.sensors.level = 0;
  g.player.systems.sensors.damage = 0;
  g.player.systems.sensors.ion = [];
}

describe("Slug vision", () => {
  it("opens rooms that share an edge with the Slug, including a room whose door was removed", () => {
    const g = createGame(21);
    startCombat(g, "scout");
    dark(g);
    gel(g, "p-engines");
    g.player.doors = g.player.doors.filter(
      (d) => !((d.a === "p-engines" && d.b === "p-shields") || (d.b === "p-engines" && d.a === "p-shields")),
    );
    const sight = shipSight(g);
    assert.equal(sight.interior("player", "p-engines"), true);
    assert.equal(sight.interior("player", "p-shields"), true);
    assert.equal(sight.interior("player", "p-oxygen"), true);
    assert.equal(sight.interior("player", "p-medbay"), true);
    assert.equal(sight.interior("player", "p-pilot"), false);
    assert.equal(sight.interior("player", "p-weapons"), false);
  });

  it("reveals live enemy crew on both ships and does not reveal a friendly boarder or a dead Slug", () => {
    const g = createGame(22);
    startCombat(g, "scout");
    dark(g);
    const slug = gel(g, "p-engines");
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    const boarder = g.crew.find((c) => c.side === "player" && c.id !== slug.id);
    assert.ok(boarder);
    boarder.aboard = "enemy";
    boarder.room = g.enemy!.rooms.find((r) => r.id !== foe.room)?.id ?? foe.room;
    const sight = shipSight(g);
    assert.equal(sight.showCrew(foe), true);
    assert.equal(sight.interior("enemy", foe.room), false);
    assert.equal(sight.showCrew(boarder), false);
    assert.equal(sight.showCrew(slug), true);

    slug.hp = 0;
    const blind = shipSight(g);
    assert.equal(blind.showCrew(foe), false);
    assert.equal(blind.interior("player", "p-engines"), false);
  });

  it("lets level 2 sensors show the enemy ship, and level 2 still shows their crew through a cloak", () => {
    const g = createGame(23);
    startCombat(g, "scout");
    g.player.systems.sensors.level = 2;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe && g.enemy);
    const open = shipSight(g);
    assert.equal(open.interior("enemy", foe.room), true);
    g.enemy.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    const cloaked = shipSight(g);
    assert.equal(cloaked.interior("enemy", foe.room), false);
    assert.equal(cloaked.showCrew(foe), true);
  });

  it("still opens adjacent rooms when a nebula has disabled Sensors", () => {
    const g = createGame(25);
    startCombat(g, "scout");
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    here.kind = "nebula";
    g.player.systems.sensors.level = 3;
    gel(g, "p-engines");
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    const sight = shipSight(g);
    assert.equal(playerSensorLevel(g), 0);
    assert.equal(sight.interior("player", "p-engines"), true);
    assert.equal(sight.interior("player", "p-shields"), true);
    assert.equal(sight.interior("enemy", foe.room), false);
  });

  it("an enemy Slug does not open rooms for you", () => {
    const g = createGame(24);
    startCombat(g, "scout");
    dark(g);
    const foe = g.crew.find((c) => c.side === "enemy");
    assert.ok(foe);
    foe.kin = "gel";
    const sight = shipSight(g);
    assert.equal(sight.interior("player", "p-engines"), false);
    assert.equal(sight.showCrew(foe), false);
  });
});
