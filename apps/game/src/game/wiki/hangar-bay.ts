/**
 * Hangar bay and cruiser article taken from the loaded ship.
 * The cruiser pages stay the index. Neither surface reads their lines.
 */
import {
  START_FUEL,
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

export type ArticleLine = { depth: number; text: string };

/**
 * The cruiser article for one loaded hull.
 * One spelling for every layout: the bay's names, in the hull's order.
 * Absent when that id is not in the pack.
 */
export function cruiserArticle(id: string | undefined): ArticleLine[] | undefined {
  const hull = hullDef(id);
  const bay = hangarBay(id);
  if (!hull || !bay) return undefined;
  const lines: ArticleLine[] = [];
  const quote = hull.quote.trim();
  if (quote) lines.push({ depth: 0, text: `"${quote}"` });
  lines.push({ depth: 1, text: `Default name: ${hull.name}` });
  lines.push({ depth: 1, text: `Reactor: ${hull.reactor}` });
  lines.push({ depth: 1, text: "Crew:" });
  for (const seat of countedCrew(startingFit(hull).crew)) lines.push({ depth: 2, text: seat });
  lines.push({ depth: 1, text: "Systems:" });
  for (const system of bay.systems)
    lines.push({ depth: 2, text: `${system.name} (${system.level})` });
  lines.push({ depth: 1, text: slotHeader("Weapons", bay.weaponSlots) });
  for (const weapon of bay.weapons) lines.push({ depth: 2, text: weapon.name });
  lines.push({ depth: 1, text: slotHeader("Drones", bay.droneSlots) });
  if (bay.droneSystem) {
    for (const drone of bay.drones) lines.push({ depth: 2, text: drone.name });
  } else {
    lines.push({ depth: 2, text: "none (system not installed)" });
  }
  if (bay.augments.length > 0) {
    lines.push({ depth: 1, text: "Augmentations:" });
    for (const name of bay.augments) lines.push({ depth: 2, text: name });
  }
  lines.push({ depth: 1, text: "Resources:" });
  lines.push({ depth: 2, text: `${START_FUEL} Fuel` });
  lines.push({ depth: 2, text: `${hull.missiles} Missiles` });
  lines.push({ depth: 2, text: `${hull.parts} Drone parts` });
  lines.push({ depth: 0, text: "Unlock:" });
  for (const line of bay.unlock) lines.push({ depth: 1, text: line });
  return lines;
}

function slotHeader(label: string, slots: number | null): string {
  return slots != null ? `${label} (${slots} slots):` : `${label}:`;
}

/** One line per race, in the order the seats first name that race. */
function countedCrew(crew: { kin: string }[]): string[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const seat of crew) {
    if (!counts.has(seat.kin)) order.push(seat.kin);
    counts.set(seat.kin, (counts.get(seat.kin) ?? 0) + 1);
  }
  return order.map((kin) => `${crewDef(kin).name} (${counts.get(kin)})`);
}
