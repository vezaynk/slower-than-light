/**
 * Blueprint lists the executable consults by name. A hull load or an event grant never
 * mentions these, so the store, the hangar, and the crew roll read them here.
 */
import { blueprintList, weaponDef } from "@stl/pack";
import { noteListPlayed } from "./played-lists.ts";

/** This game is the full edition with Advanced Edition on. The lists are still the switch. */
const FULL_EDITION = true;
const ADVANCED_EDITION = true;

function existing(id: string): readonly string[] | undefined {
  const names = blueprintList(id);
  if (names) noteListPlayed(id);
  return names;
}

/**
 * Demo builds hide DEMO_LOCKED_ITEMS. The base game hides DLC_ITEMS.
 * Both editions this game ships leave the named gear on the shelf.
 */
export function editionSells(id: string): boolean {
  const demo = existing("DEMO_LOCKED_ITEMS");
  const dlc = existing("DLC_ITEMS");
  if (demo?.includes(id) && !FULL_EDITION) return false;
  if (dlc?.includes(id) && !ADVANCED_EDITION) return false;
  return true;
}

/**
 * Sector 1 sells the hangar's starting weapons. Later sectors sell the standard pool.
 * Advanced Edition adds the DLC weapons on top of whichever pool is open.
 */
export function shelfWeaponIds(sector: number): ReadonlySet<string> | undefined {
  const starting = existing("STARTING_WEAPONS");
  const standard = existing("STANDARD_WEAPONS");
  const names = sector <= 1 && starting?.length ? starting : standard;
  if (!names?.length) return undefined;
  const allow = new Set(names);
  if (ADVANCED_EDITION) {
    for (const id of existing("DLC_ITEMS") ?? []) {
      if (weaponDef(id)) allow.add(id);
    }
  }
  return allow;
}

/** Basic guns a broke captain can still be handed. They are not a store section. */
export function freeWeaponIds(): readonly string[] | undefined {
  const names = existing("WEAPONS_FREE");
  return names?.length ? names : undefined;
}

/** Repair and battle crew. They are not cargo and not a random external schematic. */
export function internalDrones(): ReadonlySet<string> {
  return new Set(existing("DRONES_INTERNAL") ?? []);
}

/** Races a `random` crew row or boarder draws from. */
export function crewRandomIds(): readonly string[] | undefined {
  const names = existing("CREW_RANDOM");
  return names?.length ? names : undefined;
}

/** The hangar's three customization lists. A player cruiser keeps blueprint gear that is on them. */
export function startingCatalog(): {
  weapons: readonly string[] | undefined;
  drones: readonly string[] | undefined;
  augments: readonly string[] | undefined;
} {
  return {
    weapons: existing("STARTING_WEAPONS"),
    drones: existing("STARTING_DRONES"),
    augments: existing("STARTING_AUGS"),
  };
}

/**
 * Gear the blueprint named stays when it exists or the customization list allows it.
 * An id neither knows is replaced by the first list entry the game can use.
 */
export function resolveStart(
  id: string,
  names: readonly string[] | undefined,
  known: (id: string) => boolean,
): string {
  if (known(id) || names?.includes(id)) return id;
  return names?.find((name) => known(name)) ?? id;
}
