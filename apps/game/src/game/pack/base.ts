import { WEAPONS } from "../content.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";
import { rockExtinguishScale } from "../wiki/cited-rock-fire.ts";
import { BEAM_CREW, BEAM_SPEED, BEAM_TILES } from "../wiki/weapons-beam.ts";
import { loadPack } from "./registry.ts";
import type { CrewDef, WeaponBlueprint } from "./types.ts";

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
  },
  "base",
);
