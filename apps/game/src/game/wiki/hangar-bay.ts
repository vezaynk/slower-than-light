/**
 * Hangar bay and cruiser article taken from the loaded ship.
 * The cruiser pages stay the index. Neither surface reads their lines.
 */
import {
  augmentDef,
  crewDef,
  droneDef,
  hullDef,
  startingFit,
  systemDef,
  weaponDef,
} from "@stl/pack";
import { droneKeyForName, droneKeyOf, type DroneKey } from "../gear-look.ts";
import type { IconName } from "../icons.ts";
import { canDeploy } from "../extras/swarm.ts";
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
export type BayDrone = {
  id: string | null;
  name: string;
  kind: DroneKey | null;
  unfitted: boolean;
};

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
  const fit = startingFit(hull);
  const systems: BaySystem[] = [];
  for (const [sysId, pair] of Object.entries(fit.systems)) {
    if (!pair || pair[0] <= 0) continue;
    systems.push({ id: sysId, name: systemName(sysId), icon: systemIcon(sysId), level: pair[0] });
  }
  for (const [kitId, kit] of Object.entries(fit.kits)) {
    if (!kit || kit.level <= 0) continue;
    systems.push({
      id: kitId,
      name: systemName(kitId, kit.weapon),
      icon: systemIcon(kitId, kit.weapon),
      level: kit.level,
    });
  }
  const droneKit = fit.kits.drones;
  // The blueprint's drone list. A schematic Drone Control cannot fly (The Engi Cruiser, Layout B: the Anti-Personnel
  // Drone) stays on the card, dimmed.
  const drones: BayDrone[] = (hull.drones ?? []).map((schematic) => {
    const name = droneDef(schematic)?.name ?? schematic;
    const flown = canDeploy(schematic);
    return {
      id: flown ? schematic : null,
      name,
      kind: droneKeyOf(schematic) ?? droneKeyForName(name),
      unfitted: !flown,
    };
  });
  return {
    name: hull.name,
    unlock: unlockLines(hull.unlock),
    systems,
    weapons: hull.weapons.map((weaponId) => ({
      id: weaponId,
      name: weaponDef(weaponId)?.name ?? weaponId,
    })),
    weaponSlots: hull.weaponSlots ?? null,
    drones,
    droneSlots: hull.droneSlots ?? null,
    droneSystem: Boolean(droneKit),
    augments: hull.augments.map(
      (augmentId) => augmentDef(augmentId)?.name ?? MISSING_NAME.get(augmentId) ?? augmentId,
    ),
  };
}

function unlockLines(unlock: string): string[] {
  return unlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
