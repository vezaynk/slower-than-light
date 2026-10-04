import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPAIR_SECONDS, createGame, evasionPercent, ftlSeconds, startCombat, step } from "./sim.ts";
import { hackHoldsWeapons } from "./extras/spike.ts";
import type { Game } from "./types.ts";

function playerHack(g: Game, target: string) {
  g.player.kits.spike = { id: "spike", level: 3, power: 3, left: 5, cool: 0, target, on: true, aux: 0 };
}

describe("rates from the wiki", () => {
  it("repairs a bar or a breach in 12.5 crew-seconds (Template:Crew races (comparison))", () => {
    assert.equal(REPAIR_SECONDS, 12.5);
  });

  it("burns 0.96% oxygen per fire per second (Fires)", () => {
    // Same fight twice; the only difference is one fire in an empty room, so the oxygen gap is the fire's share.
    const run = (fire: number) => {
      const g = createGame(1);
      startCombat(g, "Rebel ship");
      const room = g.player.rooms.find((r) => !g.crew.some((c) => c.aboard === "player" && c.room === r.id))!;
      for (const d of g.player.doors) d.open = false;
      room.o2 = 50;
      room.fire = fire;
      step(g, 0.05);
      return room.o2;
    };
    assert.ok(Math.abs(run(0) - run(1) - 0.96 * 0.05) < 0.002, `${run(0) - run(1)}`);
  });
});

describe("the player's own hacking", () => {
  it("holds the enemy's weapons while the player pulses their Weapons", () => {
    const g = createGame(2);
    startCombat(g, "Rebel ship");
    playerHack(g, "weapons");
    assert.equal(hackHoldsWeapons(g, "enemy"), true);
    assert.equal(hackHoldsWeapons(g, "player"), false);
  });

  it("does not freeze the player's own FTL when hacking the enemy's Engines", () => {
    const g = createGame(3);
    startCombat(g, "Rebel ship");
    const before = ftlSeconds(g, g.player);
    playerHack(g, "engines");
    assert.equal(ftlSeconds(g, g.player), before);
  });

  it("keeps cloak evasion while base evasion is hacked to zero", () => {
    const g = createGame(4);
    startCombat(g, "Rebel ship");
    playerHack(g, "engines");
    assert.equal(evasionPercent(g, g.enemy!, "enemy"), 0);
    g.enemy!.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: "fire", on: true, aux: 0 };
    assert.ok(evasionPercent(g, g.enemy!, "enemy") > 0);
  });
});
