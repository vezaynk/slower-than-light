import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bars, createGame, maxBubbles, powerDown, powerUp, sparePower, zoltanBars } from "./sim.ts";
import type { Crew } from "./types.ts";

function spark(room: string): Crew {
  return {
    id: "z",
    name: "z",
    side: "player",
    aboard: "player",
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "spark",
  };
}

describe("power steps", () => {
  it("raises and lowers shields by a whole layer", () => {
    const g = createGame(3, "kestrel-a");
    g.player.reactor = 30;
    const sys = g.player.systems.shields;
    sys.level = 8;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 0;
    g.player.shieldNow = 0;
    for (const pair of [2, 4, 6, 8]) {
      powerUp(g, "shields");
      assert.equal(sys.power, pair);
      assert.equal(maxBubbles(g.player), pair / 2);
    }
    powerUp(g, "shields");
    assert.equal(sys.power, 8);
    for (const pair of [6, 4, 2, 0]) {
      powerDown(g, "shields");
      assert.equal(sys.power, pair);
    }
  });

  it("does not spend a lone shield bar when a pair is out of reach", () => {
    const g = createGame(3, "kestrel-a");
    const sys = g.player.systems.shields;
    sys.level = 4;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 2;
    const used = g.player.reactor - sparePower(g.player);
    g.player.reactor = used + 1;
    assert.equal(sparePower(g.player), 1);
    powerUp(g, "shields");
    assert.equal(sys.power, 2);
    assert.equal(maxBubbles(g.player), 1);
  });

  it("lets one Zoltan finish a shield pair", () => {
    const g = createGame(3, "kestrel-a");
    g.player.reactor = 30;
    const sys = g.player.systems.shields;
    sys.level = 4;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 0;
    const room = g.player.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    g.crew.push(spark(room.id));
    assert.equal(zoltanBars(g.crew, g.player, "player", "shields"), 1);
    powerUp(g, "shields");
    assert.equal(sys.power, 1);
    assert.equal(bars(sys, 1), 2);
    assert.equal(maxBubbles(g.player, 1), 1);
    powerUp(g, "shields");
    assert.equal(sys.power, 3);
    assert.equal(bars(sys, 1), 4);
    powerDown(g, "shields");
    assert.equal(sys.power, 1);
    assert.equal(bars(sys, 1), 2);
  });

  it("will not power a weapon with a partial bar", () => {
    const g = createGame(3, "kestrel-a");
    const sys = g.player.systems.weapons;
    sys.level = 8;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 0;
    g.player.weapons = [
      { uid: "burst", defId: "lineburst", charge: 0, enabled: false, autofire: false, target: null },
      { uid: "laser", defId: "spark", charge: 0, enabled: false, autofire: false, target: null },
    ];
    const used = g.player.reactor - sparePower(g.player);
    g.player.reactor = used + 1;
    assert.equal(sparePower(g.player), 1);
    powerUp(g, "weapons");
    assert.equal(sys.power, 0);
    assert.equal(g.player.weapons[0]!.enabled, false);
    assert.equal(g.player.weapons[1]!.enabled, false);
  });

  it("still moves engines one bar at a time", () => {
    const g = createGame(3, "kestrel-a");
    g.player.reactor = 20;
    const sys = g.player.systems.engines;
    sys.level = 4;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 1;
    powerUp(g, "engines");
    assert.equal(sys.power, 2);
    powerDown(g, "engines");
    assert.equal(sys.power, 1);
  });
});
