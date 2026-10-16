import {
  BEAM_CREW,
  BEAM_SPEED,
  BEAM_TILES,
  CATALOG,
  CITED_DRONES,
  CITED_SYSTEMS,
  CREW_POOL,
  loadCatalog,
  NAME_SYLLABLES,
  SYSTEM_TUNES,
  WEAPONS,
} from "@stl/catalog";
import type { TuneDef } from "@stl/pack";

export type WeaponRow = {
  id: string;
  name: string;
  kind: "laser" | "missile" | "ion" | "beam" | "flak" | "bomb";
  power: number;
  charge: number;
  shots: number;
  gap: number;
  damage: number;
  ion: number;
  fire: number;
  breach: number;
  ammo: boolean;
  price: number;
};

export type AugmentRow = { id: string; name: string; detail: string; cost: number };
export type DroneRow = { ref: string; name: string; cost: number };
export type SystemRow = { ref: string; name: string; cost: number; slot: "sys" | "kit" };

export type StandInSources = {
  crewPool: readonly string[];
  syllables: readonly string[];
  weapons: WeaponRow[];
  augments: AugmentRow[];
  drones: readonly DroneRow[];
  systems: readonly SystemRow[];
  tunes: readonly TuneDef[];
  beamTiles: Readonly<Record<string, number>>;
  beamSpeed: Readonly<Record<string, number>>;
  beamCrew: Readonly<Record<string, number>>;
};

export async function loadSources(): Promise<StandInSources> {
  loadCatalog();
  return {
    crewPool: CREW_POOL,
    syllables: NAME_SYLLABLES,
    weapons: Object.values(WEAPONS),
    augments: CATALOG,
    drones: CITED_DRONES,
    systems: CITED_SYSTEMS,
    tunes: SYSTEM_TUNES,
    beamTiles: BEAM_TILES,
    beamSpeed: BEAM_SPEED,
    beamCrew: BEAM_CREW,
  };
}
