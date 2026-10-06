import type { Crew, Game, Ship } from "../types";
import {
  adjustScrapAmount,
  baffleHolds,
  casingHolds,
  coilRate,
  feedRate,
  keelHolds,
  lungScale,
  onNewSector,
  primeWeapons,
  saveMissile,
  spoolRate,
  tickSquall,
} from "./augments.ts";
import { cellBonus, tickCell } from "./cell.ts";
import { onCradleDeath, onCradleJump, tickCradle } from "./cradle.ts";
import { tickLance } from "./lance.ts";
import { tickFlak } from "./flakart.ts";
import { leashedDamageBonus, tickLeash } from "./leash.ts";
import { tickPlayerSabotage, tickSabotage } from "./sabotage.ts";
import { tickLanius } from "./lineage.ts";
import { partsBack } from "./moreaugs.ts";
import { onJumpSling, tickSling } from "./sling.ts";
import { spikeEvadeZero, spikeFreezesFtl, tickSpike } from "./spike.ts";
import { enemyDefenseIntercept, onJumpSwarm, swarmIntercept, tickSwarm } from "./swarm.ts";
import { tickVeil, veilBlocks, veilEvade } from "./veil.ts";
import { flagshipAiEvade } from "../wiki/flagship-systems.ts";

export { enemyDefenseIntercept, onNewSector, swarmIntercept, tickPlayerSabotage };

export function tickExtras(g: Game, dt: number) {
  tickVeil(g, dt);
  tickSling(g, dt);
  tickSpike(g, dt);
  tickLeash(g, dt);
  tickCradle(g, dt);
  tickCell(g, dt);
  tickLance(g, dt);
  tickFlak(g, dt);
  tickSwarm(g, dt);
  tickSabotage(g, dt);
  tickSquall(g, dt);
  tickLanius(g, dt);
}

/**
 * Evasion added on top of the Engines table. Cloak evasion survives a Piloting/Engines hack
 * (Hacking, "Overview": "Does not affect evasion gained from Cloak").
 */
export function extraEvade(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  // @agent:flagship. The Rebel Flagship, Dodge Rate "If controlled by AI" (wiki/flagship-systems.ts).
  return veilEvade(g, ship, aboard) + flagshipAiEvade(g, ship);
}

export function targetIsCloaked(g: Game, from: "player" | "enemy"): boolean {
  return veilBlocks(g, from);
}

export function ftlFrozen(g: Game): boolean {
  return spikeFreezesFtl(g);
}

export function batteryBonus(ship: Ship): number {
  return cellBonus(ship);
}

export function suffocateScale(g: Game, crew: Crew): number {
  return lungScale(g, crew);
}

export function noteDeath(g: Game, c: Crew): boolean {
  return onCradleDeath(g, c);
}

export function onPlayerJump(g: Game) {
  onJumpSling(g);
  for (const c of g.crew) {
    if (c.hp <= 0) onCradleDeath(g, c);
  }
  g.crew = g.crew.filter((c) => c.hp > 0 || (c.cloneIn ?? 0) > 0);
  onCradleJump(g);
  primeWeapons(g);
  // Augmentations, "Misc. Augmentations", Drone Recovery Arm: "Non-destroyed drones will be retrieved when jumping, allowing their parts to be reused."
  // INVENTED: one part, and only if the drone is still powered. The page never states that part count.
  g.player.parts += partsBack(g);
  onJumpSwarm(g);
}

export function adjustScrap(g: Game, scrap: number): number {
  return adjustScrapAmount(g, scrap);
}

export function negateHull(g: Game): boolean {
  return keelHolds(g);
}

export function negateSystem(g: Game): boolean {
  return casingHolds(g);
}

export function negateIon(g: Game): boolean {
  return baffleHolds(g);
}

export function shieldBoost(g: Game, aboard: "player" | "enemy"): number {
  return coilRate(g, aboard);
}

export function weaponBoost(g: Game, from: "player" | "enemy"): number {
  return feedRate(g, from);
}

export function ftlBoost(g: Game): number {
  return spoolRate(g);
}

export function keepMissile(g: Game): boolean {
  return saveMissile(g);
}

export function leashMult(c: Crew): number {
  return leashedDamageBonus(c);
}
