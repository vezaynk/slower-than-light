import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roomNames, startingFit, START_FUEL } from "./hull-fit.ts";
import type { HullDef, HullInstall } from "./types.ts";

function room(id: number) {
  return { id, x: id * 2, y: 0, w: 2, h: 1 };
}

function hull(installs: HullInstall[], patch: Partial<HullDef> = {}): HullDef {
  return {
    id: "TEST_SHIP",
    cruiser: "",
    layout: "test",
    name: "Test",
    quote: "",
    unlock: "",
    reactor: 8,
    missiles: 0,
    parts: 0,
    weapons: [],
    augments: [],
    installs,
    grid: { rooms: installs.map((_, i) => room(i)).concat(room(installs.length)), doors: [] },
    ...patch,
  };
}

const KESTREL: HullInstall[] = [
  { id: "pilot", power: 1, room: 0, start: true },
  { id: "doors", power: 1, room: 1, start: true },
  { id: "sensors", power: 1, room: 2, start: true },
  { id: "medbay", power: 1, room: 3, start: true },
  { id: "clonebay", power: 1, room: 3, start: false },
  { id: "oxygen", power: 1, room: 4, start: true },
  { id: "shields", power: 2, room: 5, start: true },
  { id: "engines", power: 2, room: 6, start: true },
  { id: "weapons", power: 3, room: 7, start: true },
  { id: "drones", power: 2, room: 8, start: false },
];

describe("starting fit", () => {
  it("powers shields to their level, one bar for the other reactor systems, and leaves weapons off", () => {
    const fit = startingFit(hull(KESTREL));
    assert.deepEqual(fit.systems, {
      shields: [2, 2],
      engines: [2, 1],
      oxygen: [1, 1],
      medbay: [1, 1],
      weapons: [3, 0],
      sensors: [1, 1],
      pilot: [1, 1],
      doors: [1, 1],
    });
    // A system the ship can only buy is not fitted.
    assert.equal(fit.kits.drones, undefined);
    assert.equal(fit.kits.clonebay, undefined);
    assert.equal(START_FUEL, 16);
  });

  it("hands out bars in FTL's system order until the reactor runs out", () => {
    const fit = startingFit(hull(KESTREL, { reactor: 3 }));
    // Shields (2), then engines (1). Oxygen and the medbay get nothing; subsystems draw no reactor power.
    assert.equal(fit.systems.shields?.[1], 2);
    assert.equal(fit.systems.engines?.[1], 1);
    assert.equal(fit.systems.oxygen?.[1], 0);
    assert.equal(fit.systems.medbay?.[1], 0);
    assert.equal(fit.systems.pilot?.[1], 1);
  });

  it("starts kits at one bar, drone control off, and carries the artillery gun and drone list", () => {
    const fit = startingFit(
      hull(
        [
          { id: "shields", power: 2, room: 0, start: true },
          { id: "drones", power: 3, room: 1, start: true },
          { id: "cloaking", power: 2, room: 2, start: true },
          { id: "artillery", power: 1, room: 3, start: true, weapon: "ARTILLERY_FED" },
          { id: "battery", power: 2, room: 4, start: true },
        ],
        { drones: ["REPAIR", "COMBAT_1"] },
      ),
    );
    assert.deepEqual(fit.kits.drones, {
      level: 3,
      power: 0,
      target: "REPAIR",
      loadout: ["REPAIR", "COMBAT_1"],
    });
    assert.deepEqual(fit.kits.cloaking, { level: 2, power: 1 });
    assert.deepEqual(fit.kits.artillery, { level: 1, power: 1, weapon: "ARTILLERY_FED" });
    assert.deepEqual(fit.kits.battery, { level: 2, power: 0 });
  });

  it("seats crew in FTL's station order, then the free rooms", () => {
    const fit = startingFit(
      hull(KESTREL, {
        crewCounts: [
          { amount: 4, class: "human" },
          { amount: 1, class: "engi" },
        ],
      }),
    );
    assert.deepEqual(
      fit.crew.map((seat) => `${seat.kin}@${seat.room}`),
      ["human@p-pilot", "human@p-engines", "human@p-weapons", "human@p-shields", "engi@p-oxygen"],
    );
  });

  it("seats crew by system name on a blueprint with no layout", () => {
    const fit = startingFit(
      hull(
        [
          { id: "pilot", power: 1, start: true },
          { id: "engines", power: 1, start: true },
        ],
        { grid: undefined, crewCounts: [{ amount: 2, class: "human" }] },
      ),
    );
    assert.deepEqual(
      fit.crew.map((seat) => seat.room),
      ["p-pilot", "p-engines"],
    );
  });
});

describe("room names", () => {
  it("names a room for the system installed there, the bought one in a shared room, and the rest halls", () => {
    const names = roomNames(
      hull([
        { id: "pilot", power: 1, room: 0, start: true },
        { id: "teleporter", power: 1, room: 1, start: false },
        { id: "clonebay", power: 1, room: 2, start: true },
        { id: "medbay", power: 1, room: 2, start: false },
      ]),
    );
    assert.deepEqual([...names.values()], ["p-pilot", "p-tele", "p-clone", "p-hall0", "p-hall1"]);
  });
});
