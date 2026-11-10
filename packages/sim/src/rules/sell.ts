/**
 * Selling weapons, drones, and augments, including cargo.
 * Template:In-game tips, Selling: half the purchase price, rounded down.
 * A printed "Sells for" replaces that half. Fuel, missiles, drone parts, hull repair, crew, and systems are not sold.
 * Cargo schematics sell the same way. A price of 0 is not sold.
 * The numbers that are not half a blueprint price stay here: the printed sell prices, and the Shield Overcharger + at 30.
 */
import { augmentDef, droneDef, weaponDef } from "@stl/pack";
import type { Game } from "../types.ts";
import { OVERCHARGER_PLUS_SELL } from "./cited-overcharger.ts";
import { fieldedSchematics, cargoOf, unfieldSchematic } from "./make-room.ts";

// Augmentations, "Non-Purchasable Augmentations". The catalog's 50 is marked invented there.
export const NOT_SOLD: ReadonlySet<string> = new Set(["ROCK_ARMOR", "SYSTEM_CASING"]);
// Weapon pages that print "Sells for: N" instead of a purchase price. Half of 0 is not used.
const WEAPON_SELL: Readonly<Record<string, number>> = {
  LASER_BURST_1: 10,
  LASER_BURST_2: 12,
  LASER_HEAVY_1_SP: 27,
  LASER_CHARGEGUN_PLAYER: 15,
  BEAM_1: 10,
  BOMB_BREACH_1: 25,
  SHOTGUN_PLAYER: 30,
  MISSILES_2_PLAYER: 19,
  MISSILES_1: 10,
};

// content.ts marks the Dart entry INVENTED, including its 40 scrap price. No sale.
const INVENTED_WEAPON_PRICE: ReadonlySet<string> = new Set(["dart"]);

export type SellQuote = {
  id: string;
  kind: "weapon" | "augment" | "drone";
  ref: string;
  name: string;
  scrap: number;
};

function weaponSell(defId: string): number | null {
  if (INVENTED_WEAPON_PRICE.has(defId)) return null;
  const printed = WEAPON_SELL[defId];
  if (printed != null) return printed;
  const def = weaponDef(defId);
  if (!def || def.price <= 0) return null;
  return Math.floor(def.price / 2);
}

function augmentSell(id: string): number | null {
  if (NOT_SOLD.has(id)) return null;
  const row = augmentDef(id);
  if (!row || row.cost <= 0) return null;
  return Math.floor(row.cost / 2);
}

/** Half the schematic's purchase price, rounded down. No blueprint, or a price of 0, is not sold. */
function droneSell(id: string): number | null {
  const row = droneDef(id);
  if (!row || row.cost <= 0) return null;
  return Math.floor(row.cost / 2);
}

/** The deployed schematic is gone. A fitted Shield Overcharger + sale clears these same fields. */
function groundDrone(kit: NonNullable<Game["player"]["kits"]["drones"]>) {
  kit.target = null;
  kit.on = false;
  kit.left = 0;
  kit.aux = 0;
  delete kit.hp;
}

/** Fitted means the id is in the fielded list. A stale kit.target left by stowing a loadout slot is not fitted. */
function shieldPlusFielded(g: Game): boolean {
  const kit = g.player.kits.drones;
  return !!kit && fieldedSchematics(kit).includes("DRONE_SHIELD_PLAYER");
}

/**
 * Template:In-game tips, Selling: weapons, drones, and augments sell for half the purchase price.
 * Scrap: half-price, rounded down against the player.
 * A printed "Sells for" or "Sell price" replaces that half.
 * Fuel, missiles, drone parts, hull repair, crew, and systems are not sold. Drone Control is not sold.
 * Cargo drone schematics sell the same way. A schematic with no purchase price, or a price of 0, is not sold.
 * A fitted schematic is not quoted, except a fitted Shield Overcharger +.
 * Fitted means the id is in the fielded list, not merely kit.target.
 * That plus row is the only fitted sale, so a schematic both fitted and in cargo is quoted once.
 * A Shield Overcharger + in cargo and not fielded is that cargo row, at the printed 30.
 * Selling a cargo schematic that is no longer fielded clears a stale target, so it cannot launch.
 * Drone Control, "Shield Overcharger +": "Sells for: 30 (cannot be bought or found)."
 * The regular Shield Overcharger has a purchase price and no printed sell line used here.
 */
export function citedSellQuote(g: Game): SellQuote[] {
  const quotes: SellQuote[] = [];
  for (const weapon of g.player.weapons) {
    const scrap = weaponSell(weapon.defId);
    if (scrap == null || scrap <= 0) continue;
    quotes.push({
      id: `w:${weapon.uid}`,
      kind: "weapon",
      ref: weapon.defId,
      name: weaponDef(weapon.defId)?.name ?? weapon.defId,
      scrap,
    });
  }
  // A fielded Shield Overcharger + keeps its own row. The same id in cargo is not quoted again.
  const plusFielded = shieldPlusFielded(g);
  // Per the user: weapons in cargo sell like fitted ones. Cargo schematics sell for half their cost.
  cargoOf(g).forEach((item, index) => {
    if (item.kind === "weapon") {
      const scrap = weaponSell(item.id);
      if (scrap == null || scrap <= 0) return;
      quotes.push({
        id: `c:${index}:${item.id}`,
        kind: "weapon",
        ref: item.id,
        name: `${weaponDef(item.id)?.name ?? item.id} (cargo)`,
        scrap,
      });
      return;
    }
    if (item.kind !== "drone") return;
    if (item.id === "DRONE_SHIELD_PLAYER") {
      // The plus has no blueprint, so droneSell is null. Fielded: one fitted row. Otherwise this cargo slot.
      if (plusFielded) return;
      quotes.push({
        id: `c:${index}:${item.id}`,
        kind: "drone",
        ref: item.id,
        name: "Shield Overcharger + (cargo)",
        scrap: OVERCHARGER_PLUS_SELL,
      });
      return;
    }
    const scrap = droneSell(item.id);
    if (scrap == null || scrap <= 0) return;
    quotes.push({
      id: `c:${index}:${item.id}`,
      kind: "drone",
      ref: item.id,
      name: `${droneDef(item.id)?.name ?? item.id} (cargo)`,
      scrap,
    });
  });
  (g.augments ?? []).forEach((id, index) => {
    const scrap = augmentSell(id);
    if (scrap == null || scrap <= 0) return;
    const row = augmentDef(id);
    quotes.push({
      id: `a:${index}:${id}`,
      kind: "augment",
      ref: id,
      name: row?.name ?? id,
      scrap,
    });
  });
  const over = g.player.kits.drones;
  // A fitted Shield Overcharger + only. Fitted is the fielded list, and it is the active drone.
  // Identified by the drone id, not by the scrap amount.
  if (plusFielded && over?.target === "DRONE_SHIELD_PLAYER") {
    quotes.push({
      id: "d:overchargerplus",
      kind: "drone",
      ref: "DRONE_SHIELD_PLAYER",
      name: "Shield Overcharger +",
      scrap: OVERCHARGER_PLUS_SELL,
    });
  }
  return quotes;
}

/** Add the quoted scrap. Remove that one weapon, cargo schematic, augment, or fitted Shield Overcharger +. Do not subtract scrap. */
export function citedSell(g: Game, id: string): boolean {
  const quote = citedSellQuote(g).find((row) => row.id === id);
  if (!quote) return false;
  if (id.startsWith("c:")) {
    const index = Number(id.split(":")[1]);
    const item = cargoOf(g)[index];
    if (!item || item.id !== quote.ref || item.kind !== quote.kind) return false;
    g.cargo = cargoOf(g).filter((_, i) => i !== index);
    const kit = g.player.kits.drones;
    // Stow on a loadout rewrites the list and can leave this id deployed. It is gone once it is not fielded.
    // A copy that is still fielded keeps flying.
    if (
      item.kind === "drone" &&
      kit &&
      kit.target === item.id &&
      !fieldedSchematics(kit).includes(item.id)
    ) {
      groundDrone(kit);
    }
    g.scrap += quote.scrap;
    g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
    g.sfx.push("sell");
    return true;
  }
  if (quote.kind === "drone") {
    const kit = g.player.kits.drones;
    if (!kit || kit.target !== quote.ref) return false;
    unfieldSchematic(kit, quote.ref);
    g.scrap += quote.scrap;
    g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
    g.sfx.push("sell");
    return true;
  }
  if (quote.kind === "weapon") {
    const uid = id.slice(2);
    const index = g.player.weapons.findIndex((weapon) => weapon.uid === uid);
    if (index < 0) return false;
    g.player.weapons.splice(index, 1);
    if (g.armed === uid) {
      g.armed = null;
      g.targeting = false;
      g.beamAnchor = null;
    }
    g.scrap += quote.scrap;
    g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
    g.sfx.push("sell");
    return true;
  }
  const match = /^a:(\d+):(.+)$/.exec(id);
  if (!match || !g.augments) return false;
  const index = Number(match[1]);
  if (g.augments[index] !== quote.ref) return false;
  g.augments.splice(index, 1);
  // Zoltan Shield prints "Sell value: 40" and does not print a leftover overcharger amount.
  // INFERRED: clearing the bubble is the augment leaving.
  if (quote.ref === "ENERGY_SHIELD") {
    g.player.zoltan = undefined;
    delete g.player.zoltanOver;
  }
  g.scrap += quote.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
  g.sfx.push("sell");
  return true;
}
