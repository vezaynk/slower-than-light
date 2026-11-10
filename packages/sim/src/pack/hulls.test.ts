import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { hullById } from "../hulls.ts";
import { layoutFor } from "../layouts.ts";
import { createGame, hangarLoadout } from "../sim.ts";
import "./base.ts";
import { START_FUEL, allHulls, crewDef, hullDef, loadPack, resetPackForTests } from "@stl/pack";
import type { HullDef } from "@stl/pack";

afterEach(() => resetPackForTests());

function emberHull(): HullDef {
  return {
    id: "ember",
    cruiser: "Ember",
    layout: "C",
    name: "The Ember",
    quote: "",
    unlock: "",
    reactor: 6,
    missiles: 1,
    parts: 2,
    weapons: ["LASER_BURST_3", "no-such-gun"],
    augments: ["ENERGY_SHIELD"],
    installs: [
      { id: "shields", power: 1, start: true },
      { id: "ember", power: 3, start: true },
      { id: "pilot", power: 1, start: true },
      { id: "engines", power: 1, start: true },
      { id: "emberkit", power: 2, start: true },
    ],
    crewCounts: [
      { amount: 1, class: "human" },
      { amount: 1, class: "not-a-race" },
    ],
  };
}

describe("hull listings", () => {
  it("an append changes the run and the live player hull", () => {
    const packed = hullDef("PLAYER_SHIP_HARD");
    assert.ok(packed);
    assert.equal(packed.reactor, 8);
    loadPack({ hulls: [{ ...packed, name: "Red Lark", reactor: 12 }] }, "append");
    assert.equal(hullById("PLAYER_SHIP_HARD")?.name, "Red Lark");
    assert.equal(hullById("PLAYER_SHIP_HARD")?.reactor, 12);
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.name, "Red Lark");
    assert.equal(hullDef("PLAYER_SHIP_HARD")?.reactor, 12);
    const started = createGame(1, "PLAYER_SHIP_HARD");
    assert.equal(started.player.name, "Red Lark");
    assert.equal(started.player.reactor, 12);
    assert.deepEqual(
      started.player.weapons.map((weapon) => weapon.defId),
      ["LASER_BURST_3", "MISSILES_2_PLAYER"],
    );
    assert.equal(started.crew.filter((member) => member.side === "player").length, 3);
    assert.deepEqual(
      hangarLoadout("PLAYER_SHIP_HARD").ship.weapons.map((weapon) => weapon.defId),
      ["LASER_BURST_3", "MISSILES_2_PLAYER"],
    );
    assert.equal(hangarLoadout("PLAYER_SHIP_HARD").ship.name, "Red Lark");
    const rooms = layoutFor("PLAYER_SHIP_HARD")?.rooms.length;
    assert.equal(started.player.rooms.length, rooms);

    // A pack that changes Drone Control's level and the drone list changes the run's kit.
    const engi = hullDef("PLAYER_SHIP_CIRCLE_2");
    assert.ok(engi?.installs?.some((item) => item.id === "drones" && item.start));
    assert.ok(engi);
    loadPack(
      {
        hulls: [
          {
            ...engi,
            installs: (engi.installs ?? []).map((item) =>
              item.id === "drones" ? { ...item, power: 1 } : item,
            ),
            drones: ["DEFENSE_1"],
          },
        ],
      },
      "append",
    );
    const boarded = createGame(1, "PLAYER_SHIP_CIRCLE_2");
    assert.equal(boarded.player.kits.drones?.level, 1);
    assert.deepEqual(boarded.player.kits.drones?.loadout, ["DEFENSE_1"]);
    assert.equal(hullById("PLAYER_SHIP_CIRCLE_2")?.kits.drones?.level, 1);
    assert.equal(boarded.player.rooms.length, layoutFor("PLAYER_SHIP_CIRCLE_2")?.rooms.length);
  });

  it("starts an appended hull without a new room grid or an unknown kit", () => {
    const kestrel = hullById("PLAYER_SHIP_HARD")?.name;
    assert.ok(kestrel);
    loadPack({ hulls: [emberHull()] }, "append");
    assert.equal(hullById("ember"), undefined);
    assert.equal(allHulls().at(-1)?.id, "ember");
    const started = createGame(1, "ember");
    assert.equal(started.hullId, "ember");
    assert.equal(started.player.name, "The Ember");
    assert.equal(started.player.reactor, 6);
    assert.equal(started.fuel, START_FUEL);
    assert.equal(started.missiles, 1);
    assert.equal(started.player.parts, 2);
    assert.equal(started.player.systems.shields.level, 1);
    assert.equal(started.player.systems.shields.power, 1);
    assert.equal(Object.hasOwn(started.player.systems, "ember"), false);
    assert.deepEqual(
      started.player.weapons.map((weapon) => weapon.defId),
      ["LASER_BURST_3", "no-such-gun"],
    );
    const crew = started.crew.filter((member) => member.side === "player");
    assert.deepEqual(
      crew.map((member) => member.kin),
      ["human", "not-a-race"],
    );
    assert.equal(crew[0]?.hp, crewDef("human").hp);
    assert.equal(crew[1]?.hp, crewDef("human").hp);
    assert.equal(Object.hasOwn(started.player.kits, "emberkit"), false);
    assert.equal(started.player.rooms.length, 8);
    assert.equal(started.player.cols, 4);
    assert.equal(started.player.rows, 3);
    assert.deepEqual(started.augments, ["ENERGY_SHIELD"]);
    assert.equal(started.player.zoltan, 5);
    assert.equal(layoutFor("ember"), undefined);
    resetPackForTests();
    assert.equal(hullDef("ember"), undefined);
    assert.equal(hullById("PLAYER_SHIP_HARD")?.name, kestrel);
    assert.equal(createGame(1, "PLAYER_SHIP_HARD").player.name, kestrel);
  });
});
