import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame, doorLevel, playerHackingOff } from "../sim.ts";
import type { Game } from "../types.ts";

function fitHacking(g: Game) {
  g.player.kits.spike = {
    id: "spike",
    level: 1,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
  g.player.parts = 2;
}

function jumpTo(g: Game, flag: string, name: string): boolean[] {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = g.beacons.find((b) => here.links.includes(b.id));
  assert.ok(dest);
  dest.flag = flag;
  dest.name = name;
  dest.kind = "event";
  dest.resolved = false;
  g.fuel = 5;
  g.player.systems.doors.level = 3;
  g.player.systems.doors.damage = 0;
  g.player.systems.doors.ion = [];
  const open = g.player.doors.map((d) => d.open);
  commitJump(g, dest.id);
  return open;
}

describe("Slug hacker (doors) stuck on arrival", () => {
  it("freezes doors in the state they had before the jump", () => {
    const g = createGame(1);
    const open = jumpTo(g, "cited:slug-hacker-doors", "Slug hacker (doors)");
    assert.equal(g.event?.title, "Slug hacker (doors)");
    assert.equal(doorLevel(g, g.player, "player"), 0);
    assert.deepEqual(
      g.player.doors.map((d) => d.open),
      open,
    );
  });

  it("leaves the Door System online when the hack is countered", () => {
    const g = createGame(2);
    fitHacking(g);
    jumpTo(g, "cited:slug-hacker-doors", "Slug hacker (doors)");
    assert.equal(doorLevel(g, g.player, "player"), 0);
    choose(g, "c:slug-hacker-doors:1");
    assert.ok(doorLevel(g, g.player, "player") >= 2);
    assert.equal(playerHackingOff(g), true);
  });

  it("keeps the Door System offline on Continue", () => {
    const g = createGame(3);
    jumpTo(g, "cited:slug-hacker-doors", "Slug hacker (doors)");
    choose(g, "c:slug-hacker-doors:0");
    assert.equal(doorLevel(g, g.player, "player"), 0);
  });

  it("does not take the Door System offline at a different cited event", () => {
    const g = createGame(4);
    jumpTo(g, "cited:slug-hacker-oxygen", "Slug hacker (oxygen)");
    assert.equal(g.event?.title, "Slug hacker (oxygen)");
    assert.ok(doorLevel(g, g.player, "player") > 0);
  });
});
