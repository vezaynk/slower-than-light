import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";

describe("Slug hacker (doors) fire weapons", () => {
  it("fits a Fire Beam or a Fire Bomb on that fight", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      startCombat(g, "Slug ship", false, "slug-hacker-doors");
      const guns = g.enemy?.weapons ?? [];
      assert.ok(
        guns.some((w) => w.defId === "firebeam" || w.defId === "cask"),
        `seed ${seed}: ${guns.map((w) => w.defId).join(",")}`,
      );
    }
  });

  it("still starts a plain Slug fight", () => {
    const g = createGame(1);
    startCombat(g, "Slug ship", false, "slug-fight");
    assert.equal(g.phase, "combat");
  });
});
