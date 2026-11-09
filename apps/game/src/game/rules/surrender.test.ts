import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadPack,
  onPackWarning,
  packFromFtl,
  resetPackForTests,
  stalemate,
  stalemateStat,
} from "@stl/pack";
import { createGame, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";

function run(g: Game, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 30) && g.phase === "combat"; i++) step(g, 1 / 30);
}

/** A Rebel fight where nothing shoots, so hull only moves when the test moves it. */
function quietFight(seed = 4): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, "Rebel ship");
  g.enemy!.weapons = [];
  g.enemy!.boards = false;
  g.boardTimer = 0;
  return g;
}

function warned(runBody: () => void): string[] {
  const lines: string[] = [];
  const restore = onPackWarning((message) => lines.push(message));
  try {
    runBody();
  } finally {
    restore();
  }
  return lines;
}

describe("surrender numbers from the gap mod", () => {
  it("reads FTL's numbers from the loaded gap", () => {
    assert.deepEqual(stalemate(), { threshold: 40, seconds: 60, fuel: 2 });
    const lines = warned(() => {
      assert.equal(stalemateStat("threshold"), 40);
      assert.equal(stalemateStat("seconds"), 60);
      assert.equal(stalemateStat("fuel"), 2);
    });
    assert.deepEqual(lines, []);
  });

  it("follows a gap file that overrides one number", () => {
    // A mod's gap.xml: a quiet fight breaks off after 1 second instead of a minute. Fuel stays 2.
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><stalemate seconds="1"/></FTL>` }]),
      "append",
    );
    try {
      const g = quietFight();
      const fuel = g.fuel;
      g.enemySurrender!.chance = 0;
      g.enemyEscape!.mode = "never";
      g.enemy!.hull = Math.max(1, Math.floor(g.enemy!.hullMax * 0.3));
      run(g, 0.5);
      assert.equal(g.phase, "combat");
      assert.equal(g.fuel, fuel);
      run(g, 1);
      assert.equal(g.phase, "reward");
      assert.equal(g.enemy, null);
      assert.equal(g.fuel, fuel + 2);
      assert.equal(g.reward?.res?.fuel, 2);
      assert.equal(stalemateStat("threshold"), 40);
      assert.equal(stalemateStat("fuel"), 2);
    } finally {
      resetPackForTests();
    }
    const after = quietFight(5);
    const fuel = after.fuel;
    after.enemySurrender!.chance = 0;
    after.enemyEscape!.mode = "never";
    after.enemy!.hull = Math.max(1, Math.floor(after.enemy!.hullMax * 0.3));
    run(after, 2);
    assert.equal(after.phase, "combat");
    assert.equal(after.fuel, fuel);
    assert.equal(stalemateStat("seconds"), 60);
  });
});
