/**
 * Rewards, "Standard" (3%) and "Stuff" (6%): "a bonus weapon, augmentation, or drone schematic".
 * INFERRED: the page does not split the three, so each kind the ship can take has equal odds. A weapon needs a free
 * printed slot and a drone schematic needs Drone Control with a free schematic slot (there is no cargo hold here).
 * An augmentation can always drop: see grantBonusAugment for a duplicate or a full rack.
 */
import { WEAPONS } from "../content.ts";
import { CATALOG } from "../extras/augments.ts";
import { rand, weaponSlotCap } from "../sim.ts";
import type { AugmentId, Game } from "../types.ts";
import { CITED_DRONES, NOT_SOLD, canFieldDrone } from "./cited-stores.ts";

export type BonusItem = { kind: "weapon"; id: string } | { kind: "augment"; id: AugmentId } | { kind: "drone"; id: string };

/**
 * Augmentations, intro: "Most stat-boosting Augmentations stack with each other." The stackable ones are the five the
 * augments.ts header lists: Automated Re-loader, Reverse Ion Field, Shield Charge Booster, FTL Recharge Booster and
 * Scrap Recovery Arm.
 */
const STACKS: ReadonlySet<AugmentId> = new Set(["feed", "baffle", "coil", "spool", "hook"]);

function pickOne<T>(g: Game, items: readonly T[]): T | undefined {
  return items.length ? items[Math.min(items.length - 1, Math.floor(rand(g) * items.length))] : undefined;
}

/** Draws the bonus item, or nothing when no kind fits. `weapons` narrows the weapon pool (Hidden Crystal Worlds). */
export function rollBonusItem(g: Game, weapons?: (id: string) => boolean): BonusItem | undefined {
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  const guns =
    g.player.weapons.length < weaponSlotCap(g)
      ? Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id) && (!weapons || weapons(w.id)))
      : [];
  // INFERRED: the loot pool is the store pool (no Rock Plating or Titanium System Casing).
  const augs = CATALOG.filter((row) => !NOT_SOLD.has(row.id));
  const drones = CITED_DRONES.filter((row) => canFieldDrone(g, row.ref));
  const kinds = (
    [
      ["weapon", guns.length],
      ["augment", augs.length],
      ["drone", drones.length],
    ] as const
  ).filter(([, n]) => n > 0);
  const kind = pickOne(g, kinds)?.[0];
  if (kind === "weapon") return { kind, id: pickOne(g, guns)!.id };
  if (kind === "augment") return { kind, id: pickOne(g, augs)!.id };
  if (kind === "drone") return { kind, id: pickOne(g, drones)!.ref };
  return undefined;
}

/** What a looted augmentation does to this ship: fitted, 25 scrap for a duplicate, or left behind on a full rack. */
export function bonusAugmentFate(g: Game, id: AugmentId): "fit" | "scrap" | "full" {
  if (g.augments.includes(id) && !STACKS.has(id)) return "scrap";
  return g.augments.length >= 3 ? "full" : "fit";
}

/**
 * Augmentations, intro: "If you loot an augment that you already own and it does not stack, you will receive 25 scrap
 * instead (regardless of the augment's value). In other cases, if you loot an augment and don't have room for it, you
 * must choose one augment to leave behind". INFERRED: with no picker here, the new one is the one left behind (the
 * page lets you choose it). Returns the line for the reward card.
 */
export function grantBonusAugment(g: Game, id: AugmentId): string {
  const name = augmentName(id);
  const fate = bonusAugmentFate(g, id);
  if (fate === "scrap") {
    g.scrap += 25;
    return `${name} is already fitted: 25 scrap instead.`;
  }
  if (fate === "full") return `No free augmentation slot: ${name} is left behind.`;
  g.augments.push(id);
  return `${name} fitted.`;
}

export function augmentName(id: AugmentId): string {
  return CATALOG.find((row) => row.id === id)?.name ?? id;
}

export function augmentDetail(id: AugmentId): string {
  return CATALOG.find((row) => row.id === id)?.detail ?? "";
}

export function droneName(ref: string): string {
  return CITED_DRONES.find((row) => row.ref === ref)?.name ?? ref;
}
