import type { TuneDef } from "@stl/pack";

/**
 * The catalogs are imported by file URL. A static import would pull the game
 * into this package's typecheck.
 */

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
  tunes: TuneDef[];
  beamTiles: Readonly<Record<string, number>>;
  beamSpeed: Readonly<Record<string, number>>;
  beamCrew: Readonly<Record<string, number>>;
  tx: (key: string) => string;
};

const gameRoot = new URL("../../../apps/game/src/", import.meta.url);

async function loadModule<T>(path: string): Promise<T> {
  return (await import(new URL(path, gameRoot).href)) as T;
}

export async function loadSources(): Promise<StandInSources> {
  await loadModule("game/pack/base.ts");
  const content = await loadModule<{
    CREW_POOL: readonly string[];
    WEAPONS: Record<string, WeaponRow>;
  }>("game/content.ts");
  const look = await loadModule<{ NAME_SYLLABLES: readonly string[] }>("game/crew-look.ts");
  const augments = await loadModule<{ CATALOG: AugmentRow[] }>("game/extras/augment-catalog.ts");
  const drones = await loadModule<{ CITED_DRONES: readonly DroneRow[] }>(
    "game/wiki/drone-catalog.ts",
  );
  const systems = await loadModule<{ CITED_SYSTEMS: readonly SystemRow[] }>(
    "game/wiki/system-catalog.ts",
  );
  const tunes = await loadModule<{ SYSTEM_TUNES: TuneDef[] }>("game/wiki/system-tunes.ts");
  const beams = await loadModule<{
    BEAM_TILES: Readonly<Record<string, number>>;
    BEAM_SPEED: Readonly<Record<string, number>>;
    BEAM_CREW: Readonly<Record<string, number>>;
  }>("game/wiki/weapons-beam.ts");
  const i18n = await loadModule<{ tx: (key: string) => string }>("i18n/index.ts");
  return {
    crewPool: content.CREW_POOL,
    syllables: look.NAME_SYLLABLES,
    weapons: Object.values(content.WEAPONS),
    augments: augments.CATALOG,
    drones: drones.CITED_DRONES,
    systems: systems.CITED_SYSTEMS,
    tunes: tunes.SYSTEM_TUNES,
    beamTiles: beams.BEAM_TILES,
    beamSpeed: beams.BEAM_SPEED,
    beamCrew: beams.BEAM_CREW,
    tx: i18n.tx,
  };
}
