import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { HULLS, hullById } from "../hulls.ts";
import { layoutFor } from "../layouts.ts";
import { createGame, hangarLoadout } from "../sim.ts";
import "./base.ts";
import { allHulls, crewDef, hullDef, loadPack, resetPackForTests } from "@stl/pack";
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
    source: "",
    reactor: 6,
    fuel: 3,
    missiles: 1,
    parts: 2,
    systems: { shields: [1, 1], ember: [3, 3] },
    weapons: ["lineburst", "no-such-gun"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "not-a-race", room: "p-engines" },
    ],
    kits: {
      emberkit: { level: 2, power: 1 },
    },
    augments: ["zshield"],
    unfitted: ["Spare"],
  };
}

describe("hull listings", () => {
  it("starts from the packed name and reactor while the authored row stays", () => {
    const authored = HULLS.find((row) => row.id === "kestrel-a");
    assert.ok(authored);
    const packed = hullDef("kestrel-a");
    assert.ok(packed);
    loadPack({ hulls: [{ ...packed, name: "Red Lark", reactor: 12 }] }, "append");
    assert.equal(authored.name, hullById("kestrel-a")?.name);
    assert.equal(authored.reactor, 8);
    assert.equal(hullDef("kestrel-a")?.name, "Red Lark");
    assert.equal(hullDef("kestrel-a")?.reactor, 12);
    const started = createGame(1, "kestrel-a");
    assert.equal(started.player.name, "Red Lark");
    assert.equal(started.player.reactor, 12);
    assert.deepEqual(
      started.player.weapons.map((weapon) => weapon.defId),
      ["lineburst", "artemis"],
    );
    assert.equal(started.crew.filter((member) => member.side === "player").length, 3);
    assert.deepEqual(hangarLoadout("kestrel-a").ship.weapons.map((weapon) => weapon.defId), ["lineburst", "artemis"]);
    assert.equal(hangarLoadout("kestrel-a").ship.name, "Red Lark");
    const rooms = layoutFor("kestrel-a")?.rooms.length;
    assert.equal(started.player.rooms.length, rooms);

    const engi = hullDef("engi-b");
    assert.ok(engi?.kits.swarm);
    loadPack(
      {
        hulls: [
          {
            ...engi,
            kits: { ...engi.kits, swarm: { level: 1, power: engi.kits.swarm.power, loadout: ["ward"] } },
          },
        ],
      },
      "append",
    );
    const boarded = createGame(1, "engi-b");
    assert.equal(boarded.player.kits.swarm?.level, 1);
    assert.deepEqual(boarded.player.kits.swarm?.loadout, ["ward"]);
    assert.equal(HULLS.find((row) => row.id === "engi-b")?.kits.swarm?.level, 3);
    assert.equal(boarded.player.rooms.length, layoutFor("engi-b")?.rooms.length);
  });

  it("starts an appended hull without a new room grid or an unknown kit", () => {
    loadPack({ hulls: [emberHull()] }, "append");
    assert.equal(hullById("ember"), undefined);
    assert.equal(allHulls().at(-1)?.id, "ember");
    const started = createGame(1, "ember");
    assert.equal(started.hullId, "ember");
    assert.equal(started.player.name, "The Ember");
    assert.equal(started.player.reactor, 6);
    assert.equal(started.fuel, 3);
    assert.equal(started.missiles, 1);
    assert.equal(started.player.parts, 2);
    assert.equal(started.player.systems.shields.level, 1);
    assert.equal(started.player.systems.shields.power, 1);
    assert.equal(Object.hasOwn(started.player.systems, "ember"), false);
    assert.deepEqual(
      started.player.weapons.map((weapon) => weapon.defId),
      ["lineburst", "no-such-gun"],
    );
    const crew = started.crew.filter((member) => member.side === "player");
    assert.deepEqual(
      crew.map((member) => member.kin),
      ["plain", "not-a-race"],
    );
    assert.equal(crew[0]?.hp, crewDef("plain").hp);
    assert.equal(crew[1]?.hp, crewDef("plain").hp);
    assert.equal(Object.hasOwn(started.player.kits, "emberkit"), false);
    assert.equal(started.player.rooms.length, 8);
    assert.equal(started.player.cols, 4);
    assert.equal(started.player.rows, 3);
    assert.deepEqual(started.augments, ["zshield"]);
    assert.equal(started.player.zoltan, 5);
    assert.equal(layoutFor("ember"), undefined);
    resetPackForTests();
    assert.equal(hullDef("ember"), undefined);
    assert.equal(createGame(1, "kestrel-a").player.name, HULLS.find((row) => row.id === "kestrel-a")?.name);
  });
});
