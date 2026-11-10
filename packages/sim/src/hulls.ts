/**
 * Player hulls, read from the loaded ship blueprints.
 * Layout A/B/C is the id suffix. Systems, kits, and seated crew come from the starting fit.
 */
import "./pack/base.ts";
import { START_FUEL, allHulls, droneDef, hullDef, startingFit, type HullDef } from "@stl/pack";
import type { AugmentId, KitId, SysId } from "@stl/pack";
import { canFlyDrone } from "./extras/flown.ts";

export type HullCrew = {
  kin: string;
  room: string;
};

export type HullKit = {
  level: number;
  power: number;
  target?: string | null;
  loadout?: string[];
  on?: boolean;
  weapon?: string;
};

export type HullSpec = {
  id: string;
  cruiser: string;
  layout: "A" | "B" | "C";
  name: string;
  quote: string;
  unlock: string;
  weaponSlots: number;
  droneSlots: number;
  health: number;
  source: string;
  reactor: number;
  fuel: number;
  missiles: number;
  parts: number;
  systems: Partial<Record<SysId, [number, number]>>;
  weapons: string[];
  crew: HullCrew[];
  kits: Partial<Record<KitId, HullKit>>;
  augments: AugmentId[];
  /** Drone names the blueprint lists that this game cannot fly. */
  unfitted: string[];
};

function layoutLetter(id: string): "A" | "B" | "C" {
  if (id.endsWith("_3")) return "C";
  if (id.endsWith("_2")) return "B";
  return "A";
}

function asSpec(hull: HullDef): HullSpec {
  const fit = startingFit(hull);
  return {
    id: hull.id,
    cruiser: hull.cruiser,
    layout: layoutLetter(hull.id),
    name: hull.name,
    quote: hull.quote,
    unlock: hull.unlock,
    weaponSlots: hull.weaponSlots ?? 0,
    droneSlots: hull.droneSlots ?? 0,
    health: hull.health ?? 30,
    source: "",
    reactor: hull.reactor,
    fuel: START_FUEL,
    missiles: hull.missiles,
    parts: hull.parts,
    systems: fit.systems as HullSpec["systems"],
    weapons: [...hull.weapons],
    crew: fit.crew.map((seat) => ({ kin: seat.kin, room: seat.room })),
    kits: fit.kits as HullSpec["kits"],
    augments: [...hull.augments] as AugmentId[],
    unfitted: (hull.drones ?? [])
      .filter((id) => !canFlyDrone(id))
      .map((id) => droneDef(id)?.name ?? id),
  };
}

/** Playable ships, in pack order. A later append sits at the end. */
export function playerHulls(): HullSpec[] {
  return allHulls()
    .filter((hull) => hull.id.startsWith("PLAYER_SHIP_"))
    .map(asSpec);
}

/** One playable ship. An enemy blueprint, including an appended one, is absent. */
export function hullById(id: string | undefined): HullSpec | undefined {
  if (!id?.startsWith("PLAYER_SHIP_")) return undefined;
  const hull = hullDef(id);
  return hull ? asSpec(hull) : undefined;
}
