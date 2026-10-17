/**
 * Hangar bay taken from the loaded ship.
 * The cruiser pages stay the article. The bay no longer reads their lines.
 */
import { augmentDef, droneDef, hullDef, systemDef, weaponDef } from "@stl/pack";
import { droneKeyForName, droneKeyOf, type DroneKey } from "../gear-look.ts";
import type { IconName } from "../icons.ts";
import { MISSING_AUGMENTS } from "./augments-missing.ts";

/** Titles for augments that have no blueprint. */
const MISSING_NAME = new Map(MISSING_AUGMENTS.map((row) => [row.id, row.name]));

const SYSTEM_NAME: Record<string, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  medbay: "Medbay",
  weapons: "Weapons",
  pilot: "Piloting",
  sensors: "Sensors",
  doors: "Door System",
  drones: "Drone Control",
  clonebay: "Clone Bay",
  cloaking: "Cloaking",
  hacking: "Hacking",
  mind: "Mind Control",
  teleporter: "Crew Teleporter",
  battery: "Backup Battery",
  artillery: "Artillery",
};

export type BaySystem = { id: string; name: string; icon: IconName; level: number };
export type BayWeapon = { id: string; name: string };
export type BayDrone = { id: string | null; name: string; kind: DroneKey | null; unfitted: boolean };

export type HangarBay = {
  name: string;
  unlock: string[];
  systems: BaySystem[];
  weapons: BayWeapon[];
  weaponSlots: number | null;
  drones: BayDrone[];
  droneSlots: number | null;
  droneSystem: boolean;
  augments: string[];
};

function systemName(id: string, weapon?: string): string {
  if (id === "artillery" && weapon === "ARTILLERY_FED_C") return "Flak Artillery";
  return SYSTEM_NAME[id] ?? systemDef(id)?.name ?? id;
}

function systemIcon(id: string, weapon?: string): IconName {
  if (id === "artillery" && weapon === "ARTILLERY_FED_C") return "ARTILLERY_FED_C";
  return id as IconName;
}

/** The bay for one loaded hull. Absent when that id is not in the pack. */
export function hangarBay(id: string | undefined): HangarBay | undefined {
  const hull = hullDef(id);
  if (!hull) return undefined;
  const systems: BaySystem[] = [];
  for (const [sysId, pair] of Object.entries(hull.systems)) {
    if (!pair || pair[0] <= 0) continue;
    systems.push({ id: sysId, name: systemName(sysId), icon: systemIcon(sysId), level: pair[0] });
  }
  for (const [kitId, kit] of Object.entries(hull.kits)) {
    if (!kit || kit.level <= 0) continue;
    systems.push({
      id: kitId,
      name: systemName(kitId, kit.weapon),
      icon: systemIcon(kitId, kit.weapon),
      level: kit.level,
    });
  }
  const droneKit = hull.kits.drones;
  const schematicIds = droneKit?.loadout?.length ? droneKit.loadout : droneKit?.target ? [droneKit.target] : [];
  const drones: BayDrone[] = schematicIds.map((schematic) => {
    const name = droneDef(schematic)?.name ?? schematic;
    return { id: schematic, name, kind: droneKeyOf(schematic) ?? droneKeyForName(name), unfitted: false };
  });
  for (const label of hull.unfitted) {
    drones.push({ id: null, name: label, kind: droneKeyForName(label), unfitted: true });
  }
  return {
    name: hull.name,
    unlock: hull.unlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
    systems,
    weapons: hull.weapons.map((weaponId) => ({ id: weaponId, name: weaponDef(weaponId)?.name ?? weaponId })),
    weaponSlots: hull.weaponSlots ?? null,
    drones,
    droneSlots: hull.droneSlots ?? null,
    droneSystem: Boolean(droneKit),
    augments: hull.augments.map(
      (augmentId) => augmentDef(augmentId)?.name ?? MISSING_NAME.get(augmentId) ?? augmentId,
    ),
  };
}
