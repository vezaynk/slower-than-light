import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { deathAnimSeconds, onCradleDeath, tickCradle } from "./cradle.ts";
import type { KinId } from "./kin.ts";
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
    assert.equal(ada.cloned, true);
    assert.equal(g.log[0], "Clone Bay returned Ada Voss.");
  });

  it("keeps 80 percent of a skill and loses one combat point", () => {
    // Crew skills: 20% off every skill, and Combat loses 1 point rather than 20%.
    const g = createGame(2);
    g.player.kits.cradle = poweredKit();
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(ada);
    ada.hp = 0;
    ada.skills = { repair: 100, combat: 10 };
    assert.equal(onCradleDeath(g, ada), true);
    tickCradle(g, ada.cloneIn ?? 0);
    assert.equal(ada.skills?.repair, 80);
    assert.equal(ada.skills?.combat, 9);
  });

  it("starts the clone timer after the printed death animation", () => {
    // Clone Bay, Overview: animation, then the 12/9/7 system time.
    const g = createGame(3);
    g.player.kits.cradle = poweredKit(1);
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(ada);
    const pauses: [KinId | undefined, number][] = [
      [undefined, 1.8],
      ["plain", 1.8],
      ["gel", 1.8],
      ["voidlung", 1.8],
      ["shell", 2],
      ["stone", 2],
      ["shard", 2],
      ["blade", 1.7],
      ["spark", 1.5],
    ];
    for (const [kin, pause] of pauses) {
      ada.hp = 0;
      ada.kin = kin;
      ada.cloneIn = undefined;
      ada.cloneSeq = undefined;
      assert.equal(deathAnimSeconds(kin), pause);
      assert.equal(onCradleDeath(g, ada), true);
      assert.equal(ada.cloneIn, 12 + pause);
      ada.cloneIn = undefined;
      ada.cloneSeq = undefined;
      ada.hp = ada.maxHp;
    }
    g.player.kits.cradle = poweredKit(2);
    ada.hp = 0;
    ada.kin = "spark";
    ada.cloneIn = undefined;
    assert.equal(onCradleDeath(g, ada), true);
    assert.equal(ada.cloneIn, 9 + 1.5);
  });
});
