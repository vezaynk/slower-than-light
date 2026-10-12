import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onPlayerJump } from "./extras/index.ts";
import { createGame, startCombat, step } from "./sim.ts";

// Per the user: weapons charge out of a fight too, start at zero after a jump, and the Weapon Pre-Igniter primes them
// (Augmentations, Weapon Pre-Igniter: "Weapons are made immediately available after an FTL jump").
describe("weapons out of a fight", () => {
  it("charge on the map, hold one finished shot, and fire nothing", () => {
    const g = createGame(3, "kestrel-a");
    g.phase = "map";
    const w = g.player.weapons[0]!;
    w.charge = 0;
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.ok(w.charge > 0 && w.charge < 1, `${w.charge}`);
    for (let i = 0; i < 600; i++) step(g, 0.05);
    assert.equal(w.charge, 1);
    assert.equal(g.shots.length, 0);
  });

  it("reset to zero on a jump, and keep what they built when a fight starts", () => {
    const g = createGame(3, "kestrel-a");
    g.phase = "map";
    const w = g.player.weapons[0]!;
    w.charge = 1;
    onPlayerJump(g);
    assert.equal(w.charge, 0);
    w.charge = 0.6;
    startCombat(g, "scout");
    assert.equal(w.charge, 0.6);
  });

  it("are primed by the Weapon Pre-Igniter after the jump's reset", () => {
    const g = createGame(3, "kestrel-a");
    g.augments = ["hot"];
    g.player.weapons[0]!.charge = 0.2;
    onPlayerJump(g);
    assert.equal(g.player.weapons[0]!.charge, 1);
  });
});
