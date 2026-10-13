import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Kit } from "../types.ts";
import { CATALOG } from "./augments.ts";
import { enemyFtlScale, hackStuns, helixHolds, lampSees, mendOnSend, partsBack } from "./moreaugs.ts";

const NAMES = {
  jammer: "FTL Jammer",
  recover: "Drone Recovery Arm",
  stun: "Hacking Stun",
  dna: "Backup DNA Bank",
  mend: "Reconstructive Teleport",
  pulseeye: "Lifeform Scanner",
} as const;

const COSTS = {
  jammer: 30,
  recover: 50,
  stun: 60,
  dna: 40,
  mend: 70,
  pulseeye: 40,
} as const;

function swarm(power: number, target: string | null): Kit {
  return {
    id: "swarm",
    level: 2,
    power,
    left: 0,
    cool: 0,
    target,
    on: true,
    aux: 0,
  };
}

describe("more augments", () => {
  it("lists the new ids on CATALOG with the wiki costs", () => {
    const ids = Object.keys(NAMES) as (keyof typeof NAMES)[];
    for (const id of ids) {
      const row = CATALOG.find((item) => item.id === id);
      assert.ok(row, id);
      assert.equal(row.name, NAMES[id]);
      assert.equal(row.cost, COSTS[id]);
      assert.ok(row.detail.length > 0);
    }
  });

  it("doubles enemy jump time only when the jammer is fitted", () => {
    const g = createGame(1);
    assert.equal(enemyFtlScale(g), 1);
    g.augments = ["spool"];
    assert.equal(enemyFtlScale(g), 1);
    g.augments = ["jammer"];
    assert.equal(enemyFtlScale(g), 2);
  });

  it("returns one part for a defense drone on the jump, and for a combat drone only after the fight", () => {
    const g = createGame(1);
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = swarm(2, "striker");
    assert.equal(partsBack(g), 0);

    g.augments = ["recover"];
    assert.equal(partsBack(g), 1);

    g.phase = "combat";
    g.enemy = g.player;
    for (const kind of ["striker", "combat2", "beam", "beam2", "fire"]) {
      g.player.kits.swarm = swarm(2, kind);
      assert.equal(partsBack(g), 0, kind);
    }
    for (const kind of ["ward", "ward2", "wardcut", "overcharger", "overchargerplus", "hull"]) {
      g.player.kits.swarm = swarm(2, kind);
      assert.equal(partsBack(g), 1, kind);
    }
    for (const kind of ["board", "ionintruder", "patch", "personnel"]) {
      g.player.kits.swarm = swarm(2, kind);
      assert.equal(partsBack(g), 0, kind);
    }

    g.phase = "reward";
    g.enemy = null;
    g.player.kits.swarm = swarm(2, "striker");
    assert.equal(partsBack(g), 1);
    g.player.kits.swarm = swarm(2, "board");
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = swarm(0, "ward");
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = swarm(1, "");
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = swarm(1, null);
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = undefined;
    assert.equal(partsBack(g), 0);

    g.player.kits.swarm = swarm(3, "ward");
    g.player.kits.swarm.on = false;
    assert.equal(partsBack(g), 0);
  });

  it("flags pulse lock, spare helix, mend jump, and life lamp only when fitted", () => {
    const g = createGame(1);
    assert.equal(hackStuns(g), false);
    assert.equal(helixHolds(g), false);
    assert.equal(mendOnSend(g), false);
    assert.equal(lampSees(g), false);

    g.augments = ["glass"];
    assert.equal(hackStuns(g), false);
    assert.equal(helixHolds(g), false);
    assert.equal(mendOnSend(g), false);
    assert.equal(lampSees(g), false);

    g.augments = ["stun", "dna", "mend", "pulseeye"];
    assert.equal(hackStuns(g), true);
    assert.equal(helixHolds(g), true);
    assert.equal(mendOnSend(g), true);
    assert.equal(lampSees(g), true);
  });
});
