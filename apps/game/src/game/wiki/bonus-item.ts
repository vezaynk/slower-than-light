/**
 * Rewards, "Standard" (3%) and "Stuff" (6%): "a bonus weapon, augmentation, or drone schematic".
 * INFERRED: the page does not split the three, so each kind has equal odds. A full rack does not block a kind: weapons
 * and drone schematics go to cargo, and make-room.ts asks what to leave behind when that is full too. See
 * grantBonusAugment for a duplicate augmentation.
 */
import { tx } from "../../i18n/index.ts";
import { allWeapons, weaponDef } from "../pack/registry.ts";
import { CATALOG } from "../extras/augments.ts";
import { rand } from "../sim.ts";
import type { AugmentId, Game } from "../types.ts";
import { CITED_DRONES, NOT_SOLD } from "./cited-stores.ts";
import { heldSchematics, receiveAugment, receiveDrone, receiveWeapon } from "./make-room.ts";

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
  const guns = allWeapons().filter((w) => w.price > 0 && !owned.has(w.id) && (!weapons || weapons(w.id)));
  // INFERRED: the loot pool is the store pool (no Rock Plating or Titanium System Casing).
  const augs = CATALOG.filter((row) => !NOT_SOLD.has(row.id));
  const held = heldSchematics(g);
  const drones = CITED_DRONES.filter((row) => !held.includes(row.ref));
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

/**
 * Rewards, "Weapon": "A random weapon & T scrap." "Augment": "A random augmentation & T scrap." "Drone": "A random drone
 * schematic & T scrap." For an event result that gives one of these without naming it ("You receive a weapon with low
 * scrap"). The caller pays the scrap. INFERRED: uniform over the same pools as the bonus item (rarity is not in the
 * dump). Returns the line for the result card; a full rack goes to cargo or the make-room choice.
 */
export function grantRandomItem(g: Game, kind: "weapon" | "augment" | "drone"): string {
  if (kind === "weapon") {
    const owned = new Set(g.player.weapons.map((w) => w.defId));
    const def = pickOne(g, allWeapons().filter((w) => w.price > 0 && !owned.has(w.id)));
    return def ? weaponLine(g, def.id) : tx("wiki.bonus-item.no-weapon-is-left-to-give");
  }
  if (kind === "augment") {
    const id = pickOne(g, CATALOG.filter((row) => !NOT_SOLD.has(row.id)))?.id;
    return id ? grantBonusAugment(g, id) : tx("wiki.bonus-item.no-augmentation-is-left-to-give");
  }
  const held = heldSchematics(g);
  const ref = pickOne(g, CITED_DRONES.filter((row) => !held.includes(row.ref)))?.ref;
  return ref ? droneLine(g, ref) : tx("wiki.bonus-item.no-drone-schematic-is-left-to");
}

/** Receives a weapon and returns the line for the result card. */
export function weaponLine(g: Game, defId: string): string {
  const name = weaponDef(defId)?.name ?? defId;
  const got = receiveWeapon(g, defId);
  if (got === "mounted") return `${name} mounted.`;
  if (got === "cargo") return tx("wiki.bonus-item.no-free-weapon-slot-is-stowed", { name: name });
  return tx("wiki.bonus-item.no-room-in-cargo-for-choose", { name: name });
}

/** What a looted augmentation does to this ship: fitted, 25 scrap for a duplicate, or a make-room choice. */
export function bonusAugmentFate(g: Game, id: AugmentId): "fit" | "scrap" | "full" {
  if (g.augments.includes(id) && !STACKS.has(id)) return "scrap";
  return g.augments.length >= 3 ? "full" : "fit";
}

/**
 * Augmentations, intro: "If you loot an augment that you already own and it does not stack, you will receive 25 scrap
 * instead (regardless of the augment's value). In other cases, if you loot an augment and don't have room for it, you
 * must choose one augment to leave behind": make-room.ts asks. Returns the line for the reward card.
 */
export function grantBonusAugment(g: Game, id: AugmentId): string {
  const name = augmentName(id);
  const fate = bonusAugmentFate(g, id);
  if (fate === "scrap") {
    g.scrap += 25;
    return tx("wiki.bonus-item.is-already-fitted-25-scrap-instead", { name: name });
  }
  if (receiveAugment(g, id) === "queued") return tx("wiki.bonus-item.no-free-augmentation-slot-for-choose", { name: name });
  return `${name} fitted.`;
}

export function augmentName(id: AugmentId): string {
  return CATALOG.find((row) => row.id === id)?.name ?? id;
}

export function augmentDetail(id: AugmentId): string {
  return CATALOG.find((row) => row.id === id)?.detail ?? "";
}

/** Receives a drone schematic and returns the line for the reward card. */
export function droneLine(g: Game, ref: string): string {
  const name = droneName(ref);
  const got = receiveDrone(g, ref);
  if (got === "fitted") return tx("wiki.bonus-item.schematic-fitted", { name: name });
  if (got === "cargo") return tx("wiki.bonus-item.schematic-stowed-in-cargo", { name: name });
  if (got === "queued") return tx("wiki.bonus-item.no-room-in-cargo-for-the", { name: name });
  return tx("wiki.bonus-item.you-already-have-the-schematic", { name: name });
}

export function droneName(ref: string): string {
  return CITED_DRONES.find((row) => row.ref === ref)?.name ?? ref;
}
