/**
 * Rewards, "Standard" (3%) and "Stuff" (6%): "a bonus weapon, augmentation, or drone schematic".
 * INFERRED: the page does not split the three, so each kind has equal odds. A full rack does not block a kind: weapons
 * and drone schematics go to cargo, and make-room.ts asks what to leave behind when that is full too. See
 * grantBonusAugment for a duplicate augmentation.
 */
import { allAugments, allDrones, allWeapons, augmentDef, droneDef, weaponDef } from "@stl/pack";
import { editionSells, freeWeaponIds, internalDrones, shelfWeaponIds } from "../blueprint-use.ts";
import { CRYSTAL_SECTOR } from "../sector-ids.ts";
import { rand } from "../sim.ts";
import type { Game } from "../types.ts";
import { NOT_SOLD } from "./cited-stores.ts";
import { heldSchematics, receiveAugment, receiveDrone, receiveWeapon } from "./make-room.ts";

export type BonusItem =
  { kind: "weapon"; id: string } | { kind: "augment"; id: string } | { kind: "drone"; id: string };

/**
 * Augmentations, intro: "Most stat-boosting Augmentations stack with each other." The stackable ones are the five the
 * augments.ts header lists: Automated Re-loader, Reverse Ion Field, Shield Charge Booster, FTL Recharge Booster and
 * Scrap Recovery Arm.
 */
const STACKS: ReadonlySet<string> = new Set([
  "AUTO_COOLDOWN",
  "ION_ARMOR",
  "SHIELD_RECHARGE",
  "FTL_BOOSTER",
  "SCRAP_COLLECTOR",
]);

function pickOne<T>(g: Game, items: readonly T[]): T | undefined {
  return items.length
    ? items[Math.min(items.length - 1, Math.floor(rand(g) * items.length))]
    : undefined;
}

function weaponPool(g: Game, owned: Set<string>, weapons?: (id: string) => boolean) {
  const allow = g.sectorId === CRYSTAL_SECTOR ? undefined : shelfWeaponIds(g.sector);
  const guns = allWeapons().filter(
    (w) =>
      w.price > 0 &&
      !owned.has(w.id) &&
      editionSells(w.id) &&
      (!allow || allow.has(w.id)) &&
      (!weapons || weapons(w.id)),
  );
  if (guns.length > 0) return guns;
  return (freeWeaponIds() ?? []).flatMap((id) => {
    const row = weaponDef(id);
    return row && !owned.has(row.id) && (!weapons || weapons(row.id)) ? [row] : [];
  });
}

/** Draws the bonus item, or nothing when no kind fits. `weapons` narrows the weapon pool (Hidden Crystal Worlds). */
export function rollBonusItem(g: Game, weapons?: (id: string) => boolean): BonusItem | undefined {
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  const guns = weaponPool(g, owned, weapons);
  // INFERRED: the loot pool is the store pool (no Rock Plating or Titanium System Casing).
  const augs = allAugments().filter((row) => !NOT_SOLD.has(row.id));
  const held = heldSchematics(g);
  const internal = internalDrones();
  const drones = allDrones().filter(
    (row) => !held.includes(row.id) && !internal.has(row.id) && editionSells(row.id),
  );
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
  if (kind === "drone") return { kind, id: pickOne(g, drones)!.id };
  return undefined;
}

/**
 * Rewards, "Weapon": "A random weapon & T scrap." "Augment": "A random augmentation & T scrap." "Drone": "A random drone
 * schematic & T scrap." For an event result that gives one of these without naming it ("You receive a weapon with low
 * scrap"). The caller pays the scrap. INFERRED: uniform over the same pools as the bonus item (rarity is not in the
 * dump). Returns the line for the result card; a full rack goes to cargo or the make-room choice.
 */
export function grantRandomItem(g: Game, kind: "weapon" | "augment" | "drone"): string {
  if (kind === "weapon") {
    const owned = new Set(g.player.weapons.map((w) => w.defId));
    const def = pickOne(g, weaponPool(g, owned));
    return def ? weaponLine(g, def.id) : "No weapon is left to give.";
  }
  if (kind === "augment") {
    const id = pickOne(
      g,
      allAugments().filter((row) => !NOT_SOLD.has(row.id)),
    )?.id;
    return id ? grantBonusAugment(g, id) : "No augmentation is left to give.";
  }
  const held = heldSchematics(g);
  const internal = internalDrones();
  const ref = pickOne(
    g,
    allDrones().filter(
      (row) => !held.includes(row.id) && !internal.has(row.id) && editionSells(row.id),
    ),
  )?.id;
  return ref ? droneLine(g, ref) : "No drone schematic is left to give.";
}

/** Receives a weapon and returns the line for the result card. */
export function weaponLine(g: Game, defId: string): string {
  const name = weaponDef(defId)?.name ?? defId;
  const got = receiveWeapon(g, defId);
  if (got === "mounted") return `${name} mounted.`;
  if (got === "cargo") return `No free weapon slot: ${name} is stowed in cargo.`;
  return `No room in cargo for ${name}: choose what to leave behind.`;
}

/** What a looted augmentation does to this ship: fitted, 25 scrap for a duplicate, or a make-room choice. */
export function bonusAugmentFate(g: Game, id: string): "fit" | "scrap" | "full" {
  if (g.augments.includes(id) && !STACKS.has(id)) return "scrap";
  return g.augments.length >= 3 ? "full" : "fit";
}

/**
 * Augmentations, intro: "If you loot an augment that you already own and it does not stack, you will receive 25 scrap
 * instead (regardless of the augment's value). In other cases, if you loot an augment and don't have room for it, you
 * must choose one augment to leave behind": make-room.ts asks. Returns the line for the reward card.
 */
export function grantBonusAugment(g: Game, id: string): string {
  const name = augmentName(id);
  const fate = bonusAugmentFate(g, id);
  if (fate === "scrap") {
    g.scrap += 25;
    return `${name} is already fitted: 25 scrap instead.`;
  }
  if (receiveAugment(g, id) === "queued")
    return `No free augmentation slot for ${name}: choose what to leave behind.`;
  return `${name} fitted.`;
}

export function augmentName(id: string): string {
  return augmentDef(id)?.name ?? id;
}

export function augmentDetail(id: string): string {
  return augmentDef(id)?.detail ?? "";
}

/** Receives a drone schematic and returns the line for the reward card. */
export function droneLine(g: Game, ref: string): string {
  const name = droneName(ref);
  const got = receiveDrone(g, ref);
  if (got === "fitted") return `${name} schematic fitted.`;
  if (got === "cargo") return `${name} schematic stowed in cargo.`;
  if (got === "queued")
    return `No room in cargo for the ${name} schematic: choose what to leave behind.`;
  return `You already have the ${name} schematic.`;
}

export function droneName(ref: string): string {
  return droneDef(ref)?.name ?? ref;
}
