import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, applyImpact, evasionPercent, maxBubbles, startCombat, step } from "./sim.ts";
import type { Shot } from "./types.ts";

function laser(damage: number, room = "p-weapons"): Shot {
  return {
    id: "t",
    kind: "laser",
    from: "enemy",
    damage,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: room,
    wait: 0,
    t: 1,
    duration: 1,
  };
}

describe("ashwake rules", () => {
  it("starts with one shield layer and wiki evasion from engines plus manning", () => {
    const g = createGame(2);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(g.fuel, 16);
    assert.equal(g.player.hull, 30);
    const evade = evasionPercent(g, g.player, "player");
    // engines 2 = 10%, manned engines +5, manned pilot +5
    assert.equal(evade, 20);
  });

  it("drops evasion to zero when the pilot leaves a level-1 chair", () => {
    const g = createGame(2);
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(ada);
    ada.room = "p-medbay";
    assert.equal(evasionPercent(g, g.player, "player"), 0);
  });

  it("lets one shield layer swallow a two-damage shot", () => {
    const g = createGame(3);
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 1;
    const before = g.player.hull;
    applyImpact(g, laser(2));
    assert.equal(g.player.shieldNow, 0);
    assert.equal(g.player.hull, before);
  });

  it("lets a missile ignore shields", () => {
    const g = createGame(4);
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 1;
    const before = g.player.hull;
    applyImpact(g, { ...laser(2), kind: "missile" });
    assert.equal(g.player.shieldNow, 1);
    assert.equal(g.player.hull, before - 2);
  });

  it("does not strip shields with a one-damage beam", () => {
    const g = createGame(5);
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 1;
    const before = g.player.hull;
    applyImpact(g, {
      ...laser(1),
      kind: "beam",
      beamRooms: ["p-weapons", "p-sensors"],
    });
    assert.equal(g.player.shieldNow, 1);
    assert.equal(g.player.hull, before);
  });

  it("counts shield layers as half the powered bars, rounded down", () => {
    const g = createGame(6);
    g.player.systems.shields.level = 8;
    g.player.systems.shields.power = 5;
    g.player.systems.shields.damage = 0;
    g.player.systems.shields.ion = [];
    assert.equal(maxBubbles(g.player), 2);
    g.player.systems.shields.power = 2;
    assert.equal(maxBubbles(g.player), 1);
    g.player.systems.shields.power = 1;
    assert.equal(maxBubbles(g.player), 0);
  });

  it("keeps the crew alive in a sealed, supplied ship", () => {
    const g = createGame(7);
    startCombat(g, "scout");
    step(g, 2);
    for (const c of g.crew.filter((c) => c.side === "player")) assert.ok(c.hp > 90);
  });

  it("can start a fight without throwing", () => {
    const g = createGame(8);
    const hostile = g.beacons.find((b) => b.kind === "hostile");
    assert.ok(hostile);
    g.here = hostile.id;
    startCombat(g, "scout");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    step(g, 0.5);
    assert.equal(g.phase, "combat");
  });
});
