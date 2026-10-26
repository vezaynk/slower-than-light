import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Kit } from "../types.ts";
import { droneLine } from "../wiki/bonus-item.ts";
import { citedBuy, droneItems } from "../wiki/cited-stores.ts";
import "./base.ts";
import { droneDef, loadPack, resetPackForTests } from "@stl/pack";

afterEach(() => resetPackForTests());

function swarm(): Kit {
  return { id: "drones", level: 2, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

describe("drone listings", () => {
  it("stocks the packed name and cost in the same window", () => {
    assert.equal(droneDef("COMBAT_1")?.name, "Combat Drone Mark I");
    assert.equal(droneDef("COMBAT_1")?.cost, 50);
    const striker = droneDef("COMBAT_1");
    assert.ok(striker);
    loadPack({ drones: [{ ...striker, name: "Mark", cost: 80 }] }, "append");
    const g = createGame(1);
    g.seed = 13;
    const shelf = droneItems(g);
    assert.deepEqual(
      shelf.map((row) => row.ref),
      ["COMBAT_1", "COMBAT_2", "COMBAT_BEAM"],
    );
    assert.equal(shelf[0]?.name, "Mark");
    assert.equal(shelf[0]?.cost, 80);
    assert.equal(shelf[0]?.detail, 'Drone Control, "Mark". Purchase price 80.');
    resetPackForTests();
    assert.equal(droneDef("COMBAT_1")?.name, "Combat Drone Mark I");
    assert.equal(droneDef("COMBAT_1")?.cost, 50);
  });

  it("awards, buys, and fields an appended listing", () => {
    loadPack({ drones: [{ id: "ember", name: "Ember", cost: 15 }] }, "append");
    const g = createGame(1);
    g.seed = 13;
    const shelf = droneItems(g);
    assert.deepEqual(
      shelf.map((row) => row.ref),
      ["ember", "COMBAT_1", "COMBAT_2"],
    );
    assert.equal(shelf[0]?.name, "Ember");
    assert.equal(shelf[0]?.cost, 15);
    assert.equal(droneLine(g, "ember"), "Ember schematic stowed in cargo.");
    assert.deepEqual(g.cargo, [{ kind: "drone", id: "ember" }]);
    assert.equal(g.player.kits.drones, undefined);

    const bought = createGame(1);
    bought.player.kits.drones = swarm();
    assert.equal(
      citedBuy(bought, {
        id: "drone-ember",
        kind: "drone",
        ref: "ember",
        name: "Ember",
        detail: "",
        cost: 15,
        amount: 1,
      }),
      true,
    );
    assert.equal(bought.player.kits.drones?.target, "ember");
    assert.equal(droneDef("DRONE_SHIELD_PLAYER"), undefined);
  });
});
