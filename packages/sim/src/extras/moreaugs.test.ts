import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Kit } from "../types.ts";
import { allAugments } from "@stl/pack";
import {
  enemyFtlScale,
  hackStuns,
  helixHolds,
  lampSees,
  mendOnSend,
  partsBack,
} from "./moreaugs.ts";

const NAMES = {
  FTL_JAMMER: "FTL Jammer",
  DRONE_RECOVERY: "Drone Recovery Arm",
  HACKING_STUN: "Hacking Stun",
  BACKUP_DNA: "Backup DNA Bank",
  TELEPORT_HEAL: "Reconstructive Teleport",
  LIFE_SCANNER: "Lifeform Scanner",
} as const;

const COSTS = {
  FTL_JAMMER: 30,
  DRONE_RECOVERY: 50,
  HACKING_STUN: 60,
  BACKUP_DNA: 40,
  TELEPORT_HEAL: 70,
  LIFE_SCANNER: 40,
} as const;

function swarm(power: number, target: string | null): Kit {
  return {
    id: "drones",
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
  it("lists the new ids with the wiki costs", () => {
    const ids = Object.keys(NAMES) as (keyof typeof NAMES)[];
    for (const id of ids) {
      const row = allAugments().find((item) => item.id === id);
      assert.ok(row, id);
      assert.equal(row.name, NAMES[id]);
      assert.equal(row.cost, COSTS[id]);
      assert.ok(row.detail.length > 0);
    }
  });

  it("doubles enemy jump time only when the jammer is fitted", () => {
    const g = createGame(1);
    assert.equal(enemyFtlScale(g), 1);
    g.augments = ["FTL_BOOSTER"];
    assert.equal(enemyFtlScale(g), 1);
    g.augments = ["FTL_JAMMER"];
    assert.equal(enemyFtlScale(g), 2);
  });

  it("returns one part for a defense drone on the jump, and for a combat drone only after the fight", () => {
    const g = createGame(1);
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = swarm(2, "COMBAT_1");
    assert.equal(partsBack(g), 0);

    g.augments = ["DRONE_RECOVERY"];
    assert.equal(partsBack(g), 1);

    g.phase = "combat";
    g.enemy = g.player;
    for (const kind of ["COMBAT_1", "COMBAT_2", "COMBAT_BEAM", "COMBAT_BEAM_2", "fire"]) {
      g.player.kits.drones = swarm(2, kind);
      assert.equal(partsBack(g), 0, kind);
    }
    for (const kind of [
      "DEFENSE_1",
      "DEFENSE_2",
      "ANTI_DRONE",
      "DRONE_SHIELD",
      "DRONE_SHIELD_PLAYER",
      "SHIP_REPAIR",
    ]) {
      g.player.kits.drones = swarm(2, kind);
      assert.equal(partsBack(g), 1, kind);
    }
    for (const kind of ["BOARDER", "BOARDER_ION", "REPAIR", "personnel"]) {
      g.player.kits.drones = swarm(2, kind);
      assert.equal(partsBack(g), 0, kind);
    }

    g.phase = "reward";
    g.enemy = null;
    g.player.kits.drones = swarm(2, "COMBAT_1");
    assert.equal(partsBack(g), 1);
    g.player.kits.drones = swarm(2, "BOARDER");
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = swarm(0, "DEFENSE_1");
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = swarm(1, "");
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = swarm(1, null);
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = undefined;
    assert.equal(partsBack(g), 0);

    g.player.kits.drones = swarm(3, "DEFENSE_1");
    g.player.kits.drones.on = false;
    assert.equal(partsBack(g), 0);
  });

  it("flags pulse lock, spare helix, mend jump, and life lamp only when fitted", () => {
    const g = createGame(1);
    assert.equal(hackStuns(g), false);
    assert.equal(helixHolds(g), false);
    assert.equal(mendOnSend(g), false);
    assert.equal(lampSees(g), false);

    g.augments = ["ADV_SCANNERS"];
    assert.equal(hackStuns(g), false);
    assert.equal(helixHolds(g), false);
    assert.equal(mendOnSend(g), false);
    assert.equal(lampSees(g), false);

    g.augments = ["HACKING_STUN", "BACKUP_DNA", "TELEPORT_HEAL", "LIFE_SCANNER"];
    assert.equal(hackStuns(g), true);
    assert.equal(helixHolds(g), true);
    assert.equal(mendOnSend(g), true);
    assert.equal(lampSees(g), true);
  });
});
