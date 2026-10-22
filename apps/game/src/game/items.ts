import { itemBlueprint } from "@stl/pack";
import type { Game } from "./types.ts";

/** Which hold an item blueprint fills. */
export type ItemHold = "fuel" | "missiles" | "parts";

const HOLDS: Record<string, ItemHold> = {
  ITEM_FUEL: "fuel",
  ITEM_MISSILE: "missiles",
  ITEM_DRONE: "parts",
};

/** Fuel, missiles, or drone parts for one loaded item blueprint. */
export function itemHold(id: string): ItemHold | undefined {
  const row = itemBlueprint(id);
  return row ? HOLDS[row.type] : undefined;
}

/**
 * Adds `count` of a loaded item blueprint to fuel, missiles, or drone parts.
 * Nothing is added when that blueprint was not loaded.
 */
export function grantItem(g: Game, id: string, count = 1): boolean {
  const hold = itemHold(id);
  if (!hold || !(count > 0)) return false;
  if (hold === "fuel") g.fuel += count;
  else if (hold === "missiles") g.missiles += count;
  else g.player.parts += count;
  return true;
}
