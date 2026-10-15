import { WEAPONS } from "../content.ts";
import { CATALOG } from "../extras/augment-catalog.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { HULLS, type HullSpec } from "../hulls.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";
import { rockExtinguishScale } from "../wiki/cited-rock-fire.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import { SECTOR_TYPES, type SectorType } from "../wiki/sectors.ts";
import { STORES } from "../wiki/store-catalog.ts";
import { CITED_SYSTEMS } from "../wiki/system-catalog.ts";
import { SYSTEM_TUNES } from "../wiki/system-tunes.ts";
import { BEAM_CREW, BEAM_SPEED, BEAM_TILES } from "../wiki/weapons-beam.ts";
import { loadPack } from "./registry.ts";
import type { AugmentDef, CrewDef, DroneDef, HullDef, HullKitDef, SectorDef, StoreDef, SystemDef, TuneDef, WeaponBlueprint } from "./types.ts";

/**
 * Ability flags the sim used to select by race id. The numbers stay the authored ones:
 * one Zoltan bar, the 15 HP / 7.5 drone burst, Lanius counted as a drain, Slug sight
 * and mind-control immunity, Crystal lockdown at 50s, Rock and Crystal fire-fighting.
 */
function crewRow(id: KinId): CrewDef {
  const kin = KIN[id];
  return {
    id,
    name: kin.name,
    hp: kin.hp,
    move: kin.move,
    repair: kin.repair,
    fight: kin.fight,
    suffocate: kin.suffocate,
    fireTaken: kin.fireTaken,
    bonusPower: id === "spark" ? 1 : 0,
    hasDeathExplosion: id === "spark",
    drainsOxygen: id === "voidlung",
    detectsLifeforms: id === "gel",
    resistsMindControl: id === "gel",
    lockdown: id === "shard",
    lockCooldown: id === "shard" ? 50 : 0,
    fireRepairMultiplier: id === "stone" ? rockExtinguishScale() : id === "shard" ? crystalExtinguishScale() : 1,
  };
}

function augmentRow(row: (typeof CATALOG)[number]): AugmentDef {
  return { id: row.id, name: row.name, detail: row.detail, cost: row.cost };
}

function droneRow(row: (typeof CITED_DRONES)[number]): DroneDef {
  return { id: row.ref, name: row.name, cost: row.cost };
}

function systemRow(row: (typeof CITED_SYSTEMS)[number]): SystemDef {
  return { id: row.ref, name: row.name, cost: row.cost, slot: row.slot };
}

function sectorRow(row: SectorType): SectorDef {
  return { id: row.id, name: row.name, group: row.group, notes: [...row.notes] };
}

function storeRow(row: StoreDef): StoreDef {
  return {
    id: row.id,
    name: row.name,
    slot: row.slot,
    weapons: row.weapons,
    sections: [...row.sections],
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function tuneRow(row: TuneDef): TuneDef {
  return { id: row.id, start: row.start, costs: row.costs.map((step) => ({ ...step })) };
}

function hullRow(spec: HullSpec): HullDef {
  const systems: Record<string, [number, number]> = {};
  for (const [id, pair] of Object.entries(spec.systems)) {
    if (!pair) continue;
    systems[id] = [pair[0], pair[1]];
  }
  const kits: Record<string, HullKitDef> = {};
  for (const [id, kit] of Object.entries(spec.kits)) {
    if (!kit) continue;
    const copy: HullKitDef = { level: kit.level, power: kit.power };
    if (kit.target !== undefined) copy.target = kit.target;
    if (kit.loadout) copy.loadout = [...kit.loadout];
    if (kit.on !== undefined) copy.on = kit.on;
    kits[id] = copy;
  }
  return {
    id: spec.id,
    cruiser: spec.cruiser,
    layout: spec.layout,
    name: spec.name,
    quote: spec.quote,
    unlock: spec.unlock,
    source: spec.source,
    reactor: spec.reactor,
    fuel: spec.fuel,
    missiles: spec.missiles,
    parts: spec.parts,
    systems,
    weapons: [...spec.weapons],
    crew: spec.crew.map((seat) => ({ kin: seat.kin, room: seat.room })),
    kits,
    augments: [...spec.augments],
    unfitted: [...spec.unfitted],
  };
}

function weaponRow(id: string): WeaponBlueprint {
  const row: WeaponBlueprint = { ...WEAPONS[id] };
  if (Object.prototype.hasOwnProperty.call(BEAM_TILES, id)) row.lengthTiles = BEAM_TILES[id];
  if (Object.prototype.hasOwnProperty.call(BEAM_SPEED, id)) row.speed = BEAM_SPEED[id];
  if (id === "shear") row.crewDamage = BEAM_CREW.pike;
  else if (Object.prototype.hasOwnProperty.call(BEAM_CREW, id)) row.crewDamage = BEAM_CREW[id];
  return row;
}

loadPack(
  {
    crew: (Object.keys(KIN) as KinId[]).map(crewRow),
    weapons: Object.keys(WEAPONS).map(weaponRow),
    augments: CATALOG.map(augmentRow),
    drones: CITED_DRONES.map(droneRow),
    systems: CITED_SYSTEMS.map(systemRow),
    hulls: HULLS.map(hullRow),
    sectors: SECTOR_TYPES.map(sectorRow),
    stores: STORES.map(storeRow),
    tunes: SYSTEM_TUNES.map(tuneRow),
  },
  "base",
);
