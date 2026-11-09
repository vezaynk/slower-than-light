/**
 * The hangar's loadout for one hull, from the loaded archive.
 * Weapons, drones, augments, and the starting fit are the player blueprint's lists.
 * A system title is its `systemBlueprint` title. An artillery kit whose weapon blueprint has a title uses that
 * title (the archive's name for that gun). A system the archive leaves untitled keeps `systemLabel`
 * (Engines, Piloting, Drone Control, and the rest) and does not warn. No English names are written here.
 */
import {
  augmentDef,
  droneDef,
  hullDef,
  startingFit,
  systemDef,
  warnPack,
  weaponDef,
} from "@stl/pack";
import { droneKeyForName, droneKeyOf, type DroneKey } from "./gear-look.ts";
import type { IconName } from "./icons.ts";
import { canDeploy } from "./extras/swarm.ts";
import { systemLabel } from "./content.ts";

/** The augment's blueprint title. An id the archive has no `augBlueprint` for shows as the id, with a warning. */
function augmentName(id: string): string {
  const name = augmentDef(id)?.name;
  if (name) return name;
  warnPack(`Augment "${id}" has no augBlueprint; the hangar shows its id.`);
  return id;
}

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

/**
 * A blueprint title. The reader copies the id into `name` when the archive wrote no `<title>`, and that is not a title.
 */
function distinctTitle(row: { id: string; name: string } | undefined): string | undefined {
  if (!row?.name || row.name === row.id) return undefined;
  return row.name;
}

/** The weapon blueprint's own title. The hull names the gun. */
function weaponTitle(id: string): string | undefined {
  return distinctTitle(weaponDef(id));
}

/**
 * Artillery is named by its weapon blueprint when that blueprint has a title. Otherwise the systemBlueprint title.
 * A tune the archive leaves untitled keeps the short name the rest of the ship already uses.
 */
function systemName(id: string, weapon?: string): string {
  const fromWeapon = weapon ? weaponTitle(weapon) : undefined;
  if (fromWeapon) return fromWeapon;
  const fromSystem = distinctTitle(systemDef(id));
  if (fromSystem) return fromSystem;
  return systemLabel(id);
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
    augments: hull.augments.map(augmentName),
  };
}

function unlockLines(unlock: string): string[] {
  return unlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
