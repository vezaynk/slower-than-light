import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canFlyDrone } from "./extras/flown.ts";
import { playerDroneSlots } from "./extras/swarm.ts";
import { hullById, playerHulls } from "./hulls.ts";
import { augmentDef, droneDef, emitFtlShips, hullDef, packFromFtl, startingFit } from "@stl/pack";
import { createGame, hangarLoadout } from "./sim.ts";
import { MISSING_AUGMENTS } from "./wiki/augments-missing.ts";
import { hangarBay } from "./wiki/hangar-bay.ts";
import { hangarPages } from "./hangar-roster.ts";

const picks = [
  { name: "Ada", uniform: 1 },
  { name: "Ivo", uniform: 2 },
];

describe("hangar loadout", () => {
  it("matches the rooms, weapons, doors, and crew a run starts with", () => {
    for (const spec of playerHulls()) {
      const preview = hangarLoadout(spec.id, picks);
      const run = createGame(3, spec.id, "normal", picks);
      assert.equal(preview.ship.cols, run.player.cols, spec.id);
      assert.equal(preview.ship.rows, run.player.rows, spec.id);
      assert.equal(preview.ship.hull, 30, spec.id);
      assert.equal(preview.ship.hullMax, 30, spec.id);
      assert.equal(run.player.hull, 30, spec.id);
      assert.equal(run.player.hullMax, 30, spec.id);
      assert.deepEqual(
        preview.ship.rooms.map((room) => `${room.id}:${room.x},${room.y},${room.w},${room.h}`),
        run.player.rooms.map((room) => `${room.id}:${room.x},${room.y},${room.w},${room.h}`),
        spec.id,
      );
      assert.deepEqual(
        preview.ship.weapons.map((w) => w.defId),
        run.player.weapons.map((w) => w.defId),
        spec.id,
      );
      assert.deepEqual(
        preview.ship.doors.map((d) => `${d.a}|${d.b}|${d.open}`),
        run.player.doors.map((d) => `${d.a}|${d.b}|${d.open}`),
        spec.id,
      );
      assert.ok(preview.ship.doors.length > 0, spec.id);
      assert.ok(
        preview.ship.doors.every((d) => !d.open),
        spec.id,
      );
      assert.deepEqual(
        preview.crew.map((c) => `${c.name}|${c.kin}|${c.room}|${c.uniform}`),
        run.crew
          .filter((c) => c.side === "player")
          .map((c) => `${c.name}|${c.kin}|${c.room}|${c.uniform}`),
        spec.id,
      );
    }
  });
});

const sorted = (list: readonly string[]) => [...list].sort();

const layouts = hangarPages().flatMap((page) => page.layouts);

describe("hangar sheet vs run, every layout", () => {
  it("has a hull for every playable layout", () => {
    for (const layout of layouts) assert.ok(hullById(layout.id), layout.id);
  });
});

describe("hangar bay", () => {
  it("names the run's weapons, drones, systems, and augments from the loaded hull", () => {
    for (const layout of layouts) {
      const bay = hangarBay(layout.id);
      assert.ok(bay, layout.id);
      const run = createGame(3, layout.id, "normal", picks);
      assert.deepEqual(
        bay.weapons.map((weapon) => weapon.id),
        run.player.weapons.map((weapon) => weapon.defId),
        layout.id,
      );
      const kit = run.player.kits.drones;
      const spec = hullById(layout.id);
      assert.equal(bay.droneSystem, !!kit, layout.id);
      const loadout = playerDroneSlots(kit);
      const listed = startingFit(hullDef(layout.id)!).kits.drones?.loadout ?? [];
      assert.deepEqual(
        bay.drones.filter((drone) => !drone.unfitted).map((drone) => drone.id),
        loadout.filter((id) => canFlyDrone(id)),
        layout.id,
      );
      const runUnfitted = listed
        .filter((id) => !canFlyDrone(id))
        .map((id) => droneDef(id)?.name ?? id);
      assert.deepEqual(spec?.unfitted, runUnfitted, layout.id);
      assert.deepEqual(
        bay.drones.filter((drone) => drone.unfitted).map((drone) => drone.name),
        runUnfitted,
        layout.id,
      );
      if (bay.weaponSlots != null) assert.ok(bay.weapons.length <= bay.weaponSlots, layout.id);
      const levels = new Map<string, number>();
      for (const [id, system] of Object.entries(run.player.systems))
        if (system.level > 0) levels.set(id, system.level);
      for (const [id, installed] of Object.entries(run.player.kits))
        if (installed && installed.level > 0) levels.set(id, installed.level);
      assert.deepEqual(
        Object.fromEntries(bay.systems.map((system) => [system.id, system.level]).sort()),
        Object.fromEntries([...levels].sort()),
        layout.id,
      );
      const augmentIds = hullById(layout.id)?.augments ?? [];
      assert.deepEqual(sorted(augmentIds), sorted(run.augments), layout.id);
      const missing = new Map(MISSING_AUGMENTS.map((row) => [row.id, row.name]));
      assert.deepEqual(
        bay.augments,
        augmentIds.map((id) => augmentDef(id)?.name ?? missing.get(id) ?? id),
        layout.id,
      );
    }
  });

  it("keeps the Kestrel sentence and both Federation lines through the document", () => {
    const kestrel = hullDef("PLAYER_SHIP_HARD");
    const fed = hullDef("PLAYER_SHIP_FED");
    assert.ok(kestrel && fed);
    const back = packFromFtl([{ path: "data/blueprints.xml", xml: emitFtlShips([kestrel, fed]) }]);
    const first = back.hulls?.find((hull) => hull.id === "PLAYER_SHIP_HARD");
    const second = back.hulls?.find((hull) => hull.id === "PLAYER_SHIP_FED");
    assert.equal(first?.weaponSlots, 4);
    assert.equal(first?.droneSlots, 2);
    assert.equal(first?.health, 30);
    assert.equal(
      first?.unlock,
      "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)",
    );
    assert.deepEqual(second?.unlock.split("\n"), [
      "Defeat the Flagship prototype in the Rebel Stronghold sector to unlock this ship.",
      "Alternatively, defeat the Rebel Flagship with the Engi Cruiser.",
    ]);
    assert.equal(second?.weaponSlots, 4);
    assert.equal(second?.droneSlots, 2);
    assert.equal(second?.health, 30);
  });
});
