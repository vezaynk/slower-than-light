import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Kit } from "../types.ts";
import { droneLine } from "../wiki/bonus-item.ts";
import { citedBuy, droneItems } from "../wiki/cited-stores.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import "./base.ts";
import { droneDef, loadPack, resetPackForTests } from "./registry.ts";

afterEach(() => resetPackForTests());

function swarm(): Kit {
  return { id: "swarm", level: 2, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

describe("drone listings", () => {
  it("stocks the packed name and cost in the same window", () => {
    const striker = droneDef("striker");
    assert.ok(striker);
    loadPack({ drones: [{ ...striker, name: "Mark", cost: 80 }] }, "append");
    const g = createGame(1);
    g.seed = 13;
    const shelf = droneItems(g);
    assert.deepEqual(
      shelf.map((row) => row.ref),
      ["striker", "combat2", "beam"],
    );
    assert.equal(shelf[0]?.name, "Mark");
    assert.equal(shelf[0]?.cost, 80);
    assert.equal(shelf[0]?.detail, 'Drone Control, "Mark". Purchase price 80.');
    const authored = CITED_DRONES.find((row) => row.ref === "striker");
    assert.equal(authored?.name, "Combat Drone Mark I");
    assert.equal(authored?.cost, 50);
  });

  it("awards, buys, and fields an appended listing", () => {
    loadPack({ drones: [{ id: "ember", name: "Ember", cost: 15 }] }, "append");
    const g = createGame(1);
    g.seed = 13;
    const shelf = droneItems(g);
    assert.deepEqual(
      shelf.map((row) => row.ref),
      ["ember", "striker", "combat2"],
    );
    assert.equal(shelf[0]?.name, "Ember");
    assert.equal(shelf[0]?.cost, 15);
    assert.equal(droneLine(g, "ember"), "Ember schematic stowed in cargo.");
    assert.deepEqual(g.cargo, [{ kind: "drone", id: "ember" }]);
    assert.equal(g.player.kits.swarm, undefined);

    const bought = createGame(1);
    bought.player.kits.swarm = swarm();
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
    assert.equal(bought.player.kits.swarm?.target, "ember");
    assert.equal(droneDef("overchargerplus"), undefined);
  });
});
