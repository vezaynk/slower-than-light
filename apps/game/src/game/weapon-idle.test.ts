import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onPlayerJump } from "./extras/index.ts";
import { createGame, startCombat, step } from "./sim.ts";
import { powerGuns } from "./fixtures.ts";

// Guns do not charge out of a fight (per the user; no wiki line states it), start at zero after a jump, and the Weapon
// Pre-Igniter primes them (Augmentations, Weapon Pre-Igniter: "Weapons are made immediately available after an FTL
// jump"; Weapon Control: "Weapons can get a full charge with Weapon Pre-Igniter augmentation, when player's ship
// arrives at the next beacon").
describe("weapons out of a fight", () => {
  it("do not charge on the map after a battle, and keep what they had", () => {
    const g = powerGuns(createGame(3, "PLAYER_SHIP_HARD"));
    g.phase = "map";
    const w = g.player.weapons[0]!;
    w.charge = 0.4;
    for (let i = 0; i < 200; i++) step(g, 0.05);
    assert.equal(w.charge, 0.4);
    assert.equal(g.shots.length, 0);
  });

  it("reset to zero on a jump, and keep what they built when a fight starts", () => {
    const g = powerGuns(createGame(3, "PLAYER_SHIP_HARD"));
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
    const g = powerGuns(createGame(3, "PLAYER_SHIP_HARD"));
    g.augments = ["WEAPON_PREIGNITE"];
    g.player.weapons[0]!.charge = 0.2;
    onPlayerJump(g);
    assert.equal(g.player.weapons[0]!.charge, 1);
  });
});
