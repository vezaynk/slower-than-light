import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG } from "./extras/augments.ts";
import { playerDroneSlots } from "./extras/swarm.ts";
import { droneKeyForName, weaponIdForName } from "./gear-look.ts";
import { HULLS, hullById } from "./hulls.ts";
import { iconForName } from "./icons.ts";
import { augmentDef, emitFtlShips, hullDef, packFromFtl } from "@stl/pack";
import { createGame, hangarLoadout } from "./sim.ts";
import { MISSING_AUGMENTS } from "./wiki/augments-missing.ts";
import { hangarBay } from "./wiki/hangar-bay.ts";
import { hangarSheet, orderByIds } from "./wiki/hangar-sheet.ts";
import { CRUISER_PAGES } from "./wiki/layout-pages.ts";

const picks = [
  { name: "Ada", uniform: 1 },
  { name: "Ivo", uniform: 2 },
];

describe("hangar loadout", () => {
  it("matches the rooms, weapons, doors, and crew a run starts with", () => {
    for (const spec of HULLS) {
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

/**
 * Every playable layout (CRUISER_PAGES): the hangar sheet parsed from the wiki layout lines carries no placeholder
 * lines, and it names the same weapons, drones, systems, crew, augments, and resources a run starts with (hulls.ts).
 */
const RACE_KIN: Record<string, string> = {
  human: "human",
  engi: "engi",
  zoltan: "energy",
  mantis: "mantis",
  slug: "slug",
  rockman: "rock",
  rockmen: "rock",
  lanius: "anaerobic",
  crystal: "crystal",
};

/** gear-look DroneKey -> Drone Control schematic id, where the two differ. */
const DRONE_KIT_ID: Record<string, string> = {
  overcharge: "DRONE_SHIELD",
  overcharge2: "DRONE_SHIELD_PLAYER",
  striker2: "COMBAT_2",
  intruder: "BOARDER_ION",
};

const AUGMENT_ID = new Map<string, string>(
  [...CATALOG, ...MISSING_AUGMENTS].map((row) => [row.name.toLowerCase(), row.id]),
);

const sorted = (list: readonly string[]) => [...list].sort();

const layouts = CRUISER_PAGES.flatMap((page) => page.layouts);

describe("hangar sheet vs run, every layout", () => {
  it("has a hull for every playable layout", () => {
    for (const layout of layouts) assert.ok(hullById(layout.id), layout.id);
  });

  it("shows no placeholder or count junk", () => {
    for (const layout of layouts) {
      const sheet = hangarSheet(layout);
      for (const name of [...sheet.weapons, ...sheet.drones, ...sheet.augments]) {
        assert.doesNotMatch(name, /^none\b/i, `${layout.id} ${name}`);
        assert.doesNotMatch(name, /\(x\d+\)/i, `${layout.id} ${name}`);
        assert.doesNotMatch(name, /requires system|not installed/i, `${layout.id} ${name}`);
      }
      assert.ok(sheet.unlock.length > 0, `${layout.id} unlock`);
      for (const line of sheet.unlock)
        assert.doesNotMatch(line, /^(special )?notes?:/i, `${layout.id} ${line}`);
      for (const system of sheet.systems)
        assert.ok(iconForName(system.name), `${layout.id} ${system.name}`);
    }
  });

  it("names the run's weapons, in the run's slot order", () => {
    for (const layout of layouts) {
      const sheet = hangarSheet(layout);
      const run = createGame(3, layout.id, "normal", picks);
      const ids = run.player.weapons.map((weapon) => weapon.defId);
      assert.deepEqual(
        sorted(sheet.weapons.map((name) => weaponIdForName(name) ?? `?${name}`)),
        sorted(ids),
        layout.id,
      );
      assert.deepEqual(
        orderByIds(sheet.weapons, ids, weaponIdForName).map(weaponIdForName),
        ids,
        layout.id,
      );
      if (sheet.weaponSlots != null) assert.ok(ids.length <= sheet.weaponSlots, layout.id);
    }
  });

  it("names the run's drone schematics, apart from the hull's unfitted names", () => {
    for (const layout of layouts) {
      const sheet = hangarSheet(layout);
      const spec = hullById(layout.id)!;
      const run = createGame(3, layout.id, "normal", picks);
      const kit = run.player.kits.drones;
      assert.equal(sheet.droneSystem, !!kit, layout.id);
      const named = sheet.drones
        .filter((name) => !spec.unfitted.includes(name))
        .map((name) => {
          const key = droneKeyForName(name) ?? `?${name}`;
          return DRONE_KIT_ID[key] ?? key;
        });
      assert.deepEqual(sorted(named), sorted(playerDroneSlots(kit)), layout.id);
      for (const name of spec.unfitted)
        assert.ok(sheet.drones.includes(name), `${layout.id} unfitted ${name}`);
    }
  });

  it("matches system levels, crew, augments, reactor, and resources", () => {
    for (const layout of layouts) {
      const sheet = hangarSheet(layout);
      const run = createGame(3, layout.id, "normal", picks);
      const levels = new Map<string, number>();
      for (const [id, system] of Object.entries(run.player.systems))
        if (system.level > 0) levels.set(id, system.level);
      for (const [id, kit] of Object.entries(run.player.kits))
        if (kit && kit.level > 0) levels.set(id, kit.level);
      const shown = new Map(
        sheet.systems.map((system) => {
          const icon = iconForName(system.name);
          const id = icon === "ARTILLERY_FED_C" ? "artillery" : icon;
          return [id as string, system.level];
        }),
      );
      assert.deepEqual(
        Object.fromEntries([...shown].sort()),
        Object.fromEntries([...levels].sort()),
        layout.id,
      );

      const kin = run.crew
        .filter((crew) => crew.side === "player")
        .map((crew) => crew.kin as string);
      assert.deepEqual(
        sorted(sheet.crew.map((race) => RACE_KIN[race.toLowerCase()] ?? "human")),
        sorted(kin),
        layout.id,
      );

      assert.deepEqual(
        sorted(sheet.augments.map((name) => AUGMENT_ID.get(name.toLowerCase()) ?? `?${name}`)),
        sorted(run.augments),
        layout.id,
      );

      const text = layout.lines.map((line) => line.text);
      const reactor = text.map((line) => line.match(/reactor:\s*(\d+)/i)).find(Boolean);
      const count = (re: RegExp) => Number(text.map((line) => line.match(re)).find(Boolean)?.[1]);
      assert.equal(run.player.reactor, Number(reactor?.[1]), `${layout.id} reactor`);
      assert.equal(run.fuel, count(/^(\d+) Fuel$/), `${layout.id} fuel`);
      assert.equal(run.missiles, count(/^(\d+) Missiles$/), `${layout.id} missiles`);
      assert.equal(run.player.parts, count(/^(\d+) Drone parts$/), `${layout.id} parts`);
    }
  });

  it("stores the page unlock lines and the printed bays on the hull", () => {
    for (const layout of layouts) {
      const sheet = hangarSheet(layout);
      const hull = hullById(layout.id);
      assert.ok(hull, layout.id);
      assert.deepEqual(hull.unlock.split("\n"), sheet.unlock, layout.id);
      assert.equal(hull.weaponSlots, sheet.weaponSlots, layout.id);
      assert.equal(hull.droneSlots, sheet.droneSlots, layout.id);
      assert.equal(hull.health, 30, layout.id);
    }
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
      assert.equal(bay.droneSystem, !!kit, layout.id);
      assert.deepEqual(
        bay.drones.filter((drone) => !drone.unfitted).map((drone) => drone.id),
        playerDroneSlots(kit),
        layout.id,
      );
      assert.deepEqual(
        bay.drones.filter((drone) => drone.unfitted).map((drone) => drone.name),
        hullById(layout.id)?.unfitted,
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
