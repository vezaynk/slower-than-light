import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { onCradleDeath, tickCradle } from "./cradle.ts";
import type { Kit } from "../types.ts";

function poweredKit(level = 1): Kit {
  return {
    id: "cradle",
    level,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: true,
    aux: 0,
  };
}

describe("cradle", () => {
  it("returns Ada at full health and keeps 80% of a skill", () => {
    const g = createGame(1);
    g.player.kits.cradle = poweredKit();
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(ada);
    ada.hp = 0;
    ada.skills = { repair: 100 };
    assert.equal(onCradleDeath(g, ada), true);
    assert.ok((ada.cloneIn ?? 0) > 0);
    tickCradle(g, ada.cloneIn ?? 0);
    assert.equal(ada.hp, 100);
    assert.equal(ada.skills?.repair, 80);
    assert.equal(ada.cloneIn, undefined);
    assert.equal(g.log[0], "Clone Bay returned Ada Voss.");
  });
});
