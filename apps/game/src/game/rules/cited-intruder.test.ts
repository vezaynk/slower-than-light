import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deploy, tickSwarm } from "../extras/swarm.ts";
import { createGame, startCombat } from "../sim.ts";
import type { Game } from "../types.ts";
import { droneDef, loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import {
  intruderIon,
  intruderPower,
  intruderPulseMax,
  intruderPulseMin,
  intruderStun,
} from "./cited-intruder.ts";

describe("Ion Intruder pulse", () => {
  it("records power, ion, and stun", () => {
    assert.equal(intruderPower(), 3);
    assert.equal(intruderIon(), 3);
    assert.equal(intruderStun(), 6);
  });

  it("keeps the pulse a range", () => {
    assert.equal(intruderPulseMin(), 8.2);
    assert.equal(intruderPulseMax(), 10);
    assert.notEqual(intruderPulseMin(), intruderPulseMax());
    assert.ok(intruderPulseMax() > intruderPulseMin());
  });
});

function arm(g: Game) {
  g.player.parts = 3;
  g.player.kits.drones = {
    id: "drones",
    level: 4,
    power: 3,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function ionPoints(g: Game): number {
  return Object.values(g.enemy!.systems).reduce((sum, sys) => sum + sys.ion.length, 0);
}

describe("Ion Intruder numbers from the archive", () => {
  it("follows a gap file that shortens the pulse and the ion", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><ionIntruder ion="1" stun="2" pulseMin="0.5" pulseMax="0.5"/></FTL>`,
        },
      ]),
      "append",
    );
    try {
      const g = createGame(4);
      startCombat(g, "Rebel ship");
      assert.ok(g.enemy);
      g.enemy.weapons = [];
      arm(g);
      assert.equal(deploy(g, "BOARDER_ION"), true);
      const before = ionPoints(g);
      tickSwarm(g, 0.5);
      assert.equal(ionPoints(g) - before, 1);
    } finally {
      resetPackForTests();
    }
    const again = createGame(4);
    startCombat(again, "Rebel ship");
    assert.ok(again.enemy);
    again.enemy.weapons = [];
    arm(again);
    assert.equal(deploy(again, "BOARDER_ION"), true);
    const before = ionPoints(again);
    tickSwarm(again, 0.5);
    assert.equal(ionPoints(again) - before, 0);
  });

  it("follows a blueprint that changes the power", () => {
    const row = droneDef("BOARDER_ION");
    assert.ok(row);
    loadPack({ drones: [{ ...row, power: 1 }] }, "append");
    try {
      assert.equal(intruderPower(), 1);
      const g = createGame(5);
      startCombat(g, "Rebel ship");
      assert.ok(g.enemy);
      g.enemy.weapons = [];
      arm(g);
      g.player.kits.drones!.power = 1;
      assert.equal(deploy(g, "BOARDER_ION"), true);
      loadPack(
        packFromFtl([
          {
            path: "data/gap.xml",
            xml: `<FTL><ionIntruder pulseMin="0.5" pulseMax="0.5"/></FTL>`,
          },
        ]),
        "append",
      );
      tickSwarm(g, 0.5);
      assert.ok(ionPoints(g) >= 1);
    } finally {
      resetPackForTests();
    }
  });
});
