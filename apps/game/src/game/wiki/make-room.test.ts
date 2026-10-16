import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, halted, weaponSlotCap } from "../sim.ts";
import { CARGO_SLOTS, cargoOf, fitFromCargo, pendingOverflow, receiveAugment, receiveDrone, receiveWeapon, resolveOverflow, stowWeapon } from "./make-room.ts";
import { joinCrew } from "./surrender.ts";

describe("make room (Augmentations, Crew: choose what to leave behind)", () => {
  it("asks which augmentation to leave behind and swaps the chosen one out", () => {
    const g = createGame(1);
    g.paused = false;
    g.augments = ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR", "WEAPON_PREIGNITE"];
    assert.equal(receiveAugment(g, "SHIELD_RECHARGE"), "queued");
    assert.deepEqual(pendingOverflow(g), { kind: "augment", id: "SHIELD_RECHARGE" });
    assert.equal(halted(g), true);
    assert.equal(resolveOverflow(g, "a:1"), true);
    assert.deepEqual(g.augments, ["AUTO_COOLDOWN", "SHIELD_RECHARGE", "WEAPON_PREIGNITE"]);
    assert.equal(pendingOverflow(g), null);
    assert.equal(halted(g), false);
  });

  it("puts a weapon with no free slot into cargo, and asks only when the cargo is full too", () => {
    const g = createGame(1);
    while (g.player.weapons.length < weaponSlotCap(g)) receiveWeapon(g, "LASER_BURST_1");
    for (let i = 0; i < CARGO_SLOTS; i++) assert.equal(receiveWeapon(g, "LASER_BURST_2"), "cargo");
    assert.equal(cargoOf(g).length, CARGO_SLOTS);
    assert.equal(pendingOverflow(g), null);
    assert.equal(receiveWeapon(g, "LASER_HEAVY_1"), "queued");
    assert.deepEqual(pendingOverflow(g), { kind: "weapon", id: "LASER_HEAVY_1" });
  });

  it("can leave the new item, a fitted one, or a cargo item behind", () => {
    const full = () => {
      const g = createGame(1);
      while (g.player.weapons.length < weaponSlotCap(g)) receiveWeapon(g, "LASER_BURST_1");
      for (let i = 0; i < CARGO_SLOTS; i++) receiveWeapon(g, "LASER_BURST_2");
      receiveWeapon(g, "LASER_HEAVY_1");
      return g;
    };
    const keep = full();
    const before = keep.player.weapons.map((w) => w.defId);
    resolveOverflow(keep, "new");
    assert.deepEqual(keep.player.weapons.map((w) => w.defId), before);
    assert.equal(pendingOverflow(keep), null);

    const swap = full();
    resolveOverflow(swap, swap.player.weapons[0]!.uid);
    assert.equal(swap.player.weapons[0]!.defId, "LASER_HEAVY_1");

    const cargo = full();
    resolveOverflow(cargo, "c:2");
    assert.deepEqual(cargoOf(cargo)[2], { kind: "weapon", id: "LASER_HEAVY_1" });
    assert.equal(cargoOf(cargo).length, CARGO_SLOTS);
  });

  it("moves weapons between the rack and cargo, keeping only a full charge", () => {
    const g = createGame(1);
    const w = g.player.weapons[0]!;
    w.charge = 5;
    assert.equal(stowWeapon(g, w.uid), true);
    assert.deepEqual(cargoOf(g), [{ kind: "weapon", id: w.defId, charge: 5 }]);
    assert.equal(fitFromCargo(g, 0), true);
    assert.equal(cargoOf(g).length, 0);
    assert.equal(g.player.weapons.at(-1)!.charge, 5);
    // Weapon Control: only a full charge is stored.
    const half = g.player.weapons[0]!;
    half.charge = 0.5;
    stowWeapon(g, half.uid);
    assert.deepEqual(cargoOf(g), [{ kind: "weapon", id: half.defId }]);
  });

  it("keeps a drone schematic in cargo without Drone Control", () => {
    const g = createGame(1);
    delete g.player.kits.drones;
    assert.equal(receiveDrone(g, "COMBAT_1"), "cargo");
    assert.equal(receiveDrone(g, "COMBAT_1"), "owned");
    assert.deepEqual(cargoOf(g), [{ kind: "drone", id: "COMBAT_1" }]);
  });

  it("brings a 9th crewmember aboard, then relieves the one picked", () => {
    const g = createGame(1);
    while (g.crew.filter((c) => c.side === "player").length < 8) joinCrew(g, "Engi");
    assert.equal(pendingOverflow(g), null);
    assert.equal(joinCrew(g, "Mantis"), true);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 9);
    assert.deepEqual(pendingOverflow(g), { kind: "crew" });
    const leaving = g.crew.find((c) => c.side === "player")!.id;
    assert.equal(resolveOverflow(g, leaving), true);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 8);
    assert.equal(g.crew.some((c) => c.id === leaving), false);
    assert.equal(pendingOverflow(g), null);
  });
});
