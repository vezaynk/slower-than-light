import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { deathAnimSeconds, onCradleDeath, tickCradle } from "./cradle.ts";
import type { KinId } from "./kin.ts";
import type { Kit } from "../types.ts";

function poweredKit(level = 1): Kit {
  return {
    id: "clonebay",
    level,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: true,
    aux: 0,
  };
}

describe("clonebay", () => {
  it("returns Ada at full health and keeps 80% of a skill", () => {
    // Wiki citations:
    // > "Revives dead crewmembers after several seconds with a 20% skill penalty (but only 1 point of combat experience is lost)." — [[Clone Bay#Overview]]
    const g = createGame(1);
    g.player.kits.clonebay = poweredKit();
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
    // Wiki citations:
    // > "Revives dead crewmembers after several seconds with a 20% skill penalty (but only 1 point of combat experience is lost)." — [[Clone Bay#Overview]]
    const g = createGame(2);
    g.player.kits.clonebay = poweredKit();
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
    // Wiki citations:
    // > "The cloning starts immediately after the crew dying animation is over. (animation duration: 2 seconds for Rock, Crystal, and Engi; 1.8 seconds for Humans, Slugs, and Lanius; 1.7 seconds for Mantis; 1.5 seconds for Zoltans)" — [[Clone Bay#Overview]]
    // > "12 sec 8 HP 2 35 Ftlgame-scrap.png 9 sec 16 HP" — [[Clone Bay#System Upgrades]]
    const g = createGame(3);
    g.player.kits.clonebay = poweredKit(1);
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    assert.ok(ada);
    const pauses: [KinId | undefined, number][] = [
      [undefined, 1.8],
      ["human", 1.8],
      ["slug", 1.8],
      ["anaerobic", 1.8],
      ["engi", 2],
      ["rock", 2],
      ["crystal", 2],
      ["mantis", 1.7],
      ["energy", 1.5],
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
    g.player.kits.clonebay = poweredKit(2);
    ada.hp = 0;
    ada.kin = "energy";
    ada.cloneIn = undefined;
    assert.equal(onCradleDeath(g, ada), true);
    assert.equal(ada.cloneIn, 9 + 1.5);
  });
});
