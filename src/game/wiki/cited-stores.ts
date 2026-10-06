import { CATALOG } from "../extras/augments.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { WEAPONS } from "../content.ts";
import type { AugmentId, Game, Kit, KitId, StockItem, SysId } from "../types.ts";
import { seatKits } from "../layouts.ts";
import { OVERCHARGER_PLUS } from "./cited-overcharger.ts";

/**
 * Extra store rows whose price and stock the wiki states.
 * Fuel, missiles, drone parts, and hull repair stay in rollStock.
 * rollStock also contributes the weapon slot. This module does not add a second one.
 *
 * Template:Purchasable systems (WIKI-SPEC section 7):
 * Shields 125, Medbay 50, Clone Bay 50, Crew Teleporter 90, Cloaking 150,
 * Mind Control 75, Hacking 80, Sensors 40, Door System 60, Backup Battery 35.
 * Drone Control is a bundle, not a row of this list: 75 with a System Repair Drone,
 * 85 with a Defense Drone Mark I or a Combat Drone Mark I. The naked 60 is not a shelf price.
 * Artillery Beam and Flak Artillery have kit ids and no purchase price on that list.
 */

type SysOffer = { slot: "sys"; ref: SysId; name: string; cost: number };
type KitOffer = { slot: "kit"; ref: KitId; name: string; cost: number };
type Offer = SysOffer | KitOffer;

const SYSTEMS: readonly Offer[] = [
  { slot: "sys", ref: "shields", name: "Shields", cost: 125 },
  { slot: "sys", ref: "medbay", name: "Medbay", cost: 50 },
  { slot: "kit", ref: "cradle", name: "Clone Bay", cost: 50 },
  { slot: "kit", ref: "sling", name: "Crew Teleporter", cost: 90 },
  { slot: "kit", ref: "veil", name: "Cloaking", cost: 150 },
  { slot: "kit", ref: "leash", name: "Mind Control", cost: 75 },
  { slot: "kit", ref: "spike", name: "Hacking", cost: 80 },
  { slot: "sys", ref: "sensors", name: "Sensors", cost: 40 },
  { slot: "sys", ref: "doors", name: "Door System", cost: 60 },
  { slot: "kit", ref: "cell", name: "Backup Battery", cost: 35 },
];

/**
 * Drone Control, the paragraph above "Overview": a store purchase always includes one of
 * System Repair Drone (75), Defense Drone Mark I (85), or Combat Drone Mark I (85).
 * Template:Purchasable systems names the same split. The base 60 is not charged.
 * INFERRED: g.seed % 3 picks which of the three, and the seed is not advanced.
 * Template order puts Drone Control after Hacking, so the sort key is 6.5.
 */
const SWARM_BUNDLE = [
  { schematic: "patch", label: "System Repair Drone", cost: 75 },
  { schematic: "ward", label: "Defense Drone Mark I", cost: 85 },
  { schematic: "striker", label: "Combat Drone Mark I", cost: 85 },
] as const;
const SWARM_SORT = 6.5;

// Augmentations, the paragraph above "Offensive Augmentations": up to three augmentations.
const AUGMENT_CAP = 3;
// Stores and resources, "Stores assortment": each slot contains 3 items.
const SLOT = 3;
// Crew, and Ship: a ship holds 8. A ninth forces a dismissal, which this store does not do.
const CREW_CAP = 8;

// Augmentations, "Non-Purchasable Augmentations". The catalog's 50 is marked invented there.
const NOT_SOLD: ReadonlySet<AugmentId> = new Set(["keel", "casing"]);

/**
 * Sectors, "Hidden Crystal Worlds", "Sector specifics": "only crystal weapons (including Lockdown Bomb)
 * can be purchased in stores or received as a crew kill reward".
 * Page order of Crystal (Weapons), then Bomb (Weapons) "Crystal Lockdown Bomb".
 * Store rarity on those rows is not used. This list is the allowed set.
 */
export const CRYSTAL_SECTOR_WEAPONS = ["crystalburst", "crystalburst2", "heavycrystal", "heavycrystal2", "lockdown"] as const;

// Template:Crew races (comparison). Store cost column, table order.
const CREW: readonly { ref: KinId; cost: number }[] = [
  { ref: "plain", cost: 45 },
  { ref: "shell", cost: 50 },
  { ref: "blade", cost: 55 },
  { ref: "stone", cost: 55 },
  { ref: "spark", cost: 60 },
  { ref: "gel", cost: 45 },
  { ref: "shard", cost: 60 },
  { ref: "voidlung", cost: 50 },
];

/**
 * Drone Control purchase-price bullets, one number each.
 * Template:Purchasable drones prints the same number, except the Fire Drone.
 * Drone Control prices that drone at 50. The template prices it at 60.
 * Two printed prices, so that schematic is not in this list.
 * Shield Overcharger + prints "Sells for: 30" and no purchase price, so it is not here.
 * Drone Control itself is the system bundle below, not a schematic row.
 */
export const CITED_DRONES: readonly { ref: string; name: string; cost: number }[] = [
  { ref: "striker", name: "Combat Drone Mark I", cost: 50 },
  { ref: "combat2", name: "Combat Drone Mark II", cost: 75 },
  { ref: "beam", name: "Anti-Ship Beam Drone I", cost: 50 },
  { ref: "beam2", name: "Anti-Ship Beam Drone II", cost: 60 },
  { ref: "ward", name: "Defense Drone Mark I", cost: 50 },
  { ref: "ward2", name: "Defense Drone Mark II", cost: 70 },
  { ref: "wardcut", name: "Anti-Combat Drone", cost: 35 },
  { ref: "overcharger", name: "Shield Overcharger", cost: 60 },
  { ref: "antipersonnel", name: "Anti-Personnel Drone", cost: 35 },
  { ref: "patch", name: "System Repair Drone", cost: 30 },
  { ref: "hull", name: "Hull Repair Drone", cost: 85 },
  { ref: "board", name: "Boarding Drone", cost: 70 },
  { ref: "ionintruder", name: "Ion Intruder Drone", cost: 65 },
];

type SlotKind = "systems" | "drones" | "augments" | "crew";

// Weapon pages that print "Sells for: N" instead of a purchase price. Half of 0 is not used.
const WEAPON_SELL: Readonly<Record<string, number>> = {
  spark: 10,
  twin: 12,
  heavypierce: 27,
  chargers: 15,
  mini: 10,
  breach1: 25,
  advflak: 30,
  artemis: 19,
  leto: 10,
};

// content.ts marks the Dart entry INVENTED, including its 40 scrap price. No sale.
const INVENTED_WEAPON_PRICE: ReadonlySet<string> = new Set(["dart"]);

// Augmentations prints "Sell price:" on the non-purchasable rows. That is the sell line.
const AUGMENT_SELL: Partial<Record<AugmentId, number>> = {
  medbot: 30,
  pheromone: 25,
  gel: 30,
  // Augmentations, "Crystal Vengeance": "Sell price: 40". No purchase price, so it is not in CATALOG.
  vengeance: 40,
};

const AUGMENT_SELL_NAME: Partial<Record<AugmentId, string>> = {
  medbot: "Engi Med-bot Dispersal",
  pheromone: "Mantis Pheromones",
  gel: "Slug Repair Gel",
  vengeance: "Crystal Vengeance",
};

export type SellQuote = {
  id: string;
  kind: "weapon" | "augment" | "drone";
  ref: string;
  name: string;
  scrap: number;
};

function ownedSystem(g: Game, row: Offer): boolean {
  if (row.slot === "sys") return g.player.systems[row.ref].level > 0;
  return (g.player.kits[row.ref]?.level ?? 0) > 0;
}

function missingShields(g: Game): boolean {
  return g.player.systems.shields.level <= 0;
}

function missingMedical(g: Game): boolean {
  return g.player.systems.medbay.level <= 0 && (g.player.kits.cradle?.level ?? 0) <= 0;
}

function blankKit(id: KitId): Kit {
  return { id, level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function systemRank(g: Game, row: Offer): number {
  if (row.ref === "shields") return 0;
  if (row.ref === "medbay" || row.ref === "cradle") return missingMedical(g) ? 1 : 2;
  return 3;
}

function swarmBundle(g: Game) {
  return SWARM_BUNDLE[((g.seed % 3) + 3) % 3];
}

function hasSwarm(g: Game): boolean {
  return (g.player.kits.swarm?.level ?? 0) > 0;
}

function systemItems(g: Game): StockItem[] {
  const bundle = swarmBundle(g);
  const rows = SYSTEMS.filter((row) => !ownedSystem(g, row)).map((row) => ({
    row,
    index: SYSTEMS.indexOf(row),
  }));
  if (!hasSwarm(g)) {
    rows.push({
      row: { slot: "kit", ref: "swarm", name: "Drone Control", cost: bundle.cost },
      index: SWARM_SORT,
    });
  }
  rows.sort((a, b) => systemRank(g, a.row) - systemRank(g, b.row) || a.index - b.index);
  return rows.slice(0, SLOT).map(({ row }) => ({
    id: row.ref === "swarm" ? `sys-swarm-${bundle.schematic}` : `sys-${row.ref}`,
    kind: "system" as const,
    ref: row.ref,
    name: row.name,
    detail:
      row.ref === "swarm"
        ? `Drone Control, the paragraph above Overview. Bundled with ${bundle.label}.`
        : `Template:Purchasable systems. ${row.name} ${row.cost}.`,
    cost: row.cost,
    amount: 1,
  }));
}

function droneItems(): StockItem[] {
  // CITED_DRONES is the single-price list. Game has no schematic field, so none are stocked.
  // buy() would spend the scrap and keep nothing.
  if (CITED_DRONES.some((row) => row.cost <= 0)) return [];
  return [];
}

function augmentItems(g: Game): StockItem[] {
  const have = g.augments ?? [];
  const free = AUGMENT_CAP - have.length;
  if (free <= 0) return [];
  const pool = CATALOG.filter((row) => !NOT_SOLD.has(row.id) && !have.includes(row.id));
  return pool.slice(0, Math.min(SLOT, free)).map((row) => ({
    id: `aug-${row.id}`,
    kind: "augment" as const,
    ref: row.id,
    name: row.name,
    detail: row.detail,
    cost: row.cost,
    amount: 1,
  }));
}

function crewItems(g: Game): StockItem[] {
  const aboard = g.crew.filter((c) => c.side === "player").length;
  const free = CREW_CAP - aboard;
  if (free <= 0) return [];
  // Sectors, "Hidden Crystal Worlds", "Crewmembers": only Crystal crew can be purchased.
  // Not a random draw. The run RNG is left alone. First rows of the comparison table that still fit.
  const rows = g.sectorName === "Hidden Crystal Worlds" ? CREW.filter((row) => row.ref === "shard") : CREW;
  return rows.slice(0, Math.min(SLOT, free)).map((row) => {
    const kin = KIN[row.ref];
    return {
      id: `crew-${row.ref}`,
      kind: "crew" as const,
      ref: row.ref,
      name: kin.name,
      detail: `Template:Crew races (comparison). ${kin.name} costs ${row.cost}. Health ${kin.hp}.`,
      cost: row.cost,
      amount: 1,
    };
  });
}

/**
 * Stores and resources: 2–4 slots of systems, weapons, drones, augments, and crew.
 * rollStock already adds the weapon slot, so this adds 1, 2, or 3 more.
 * g.seed % 3 is the bucket. rand() can leave a negative seed, so the residue is non-negative.
 * The seed is not advanced.
 */
function extraSlots(g: Game): number {
  const bucket = g.seed % 3;
  return ((bucket + 3) % 3) + 1;
}

export function citedStock(g: Game): StockItem[] {
  const built: Record<SlotKind, StockItem[]> = {
    systems: systemItems(g),
    drones: droneItems(),
    augments: augmentItems(g),
    crew: crewItems(g),
  };
  const order: SlotKind[] = ["systems", "drones", "augments", "crew"];
  const legal = order.filter((kind) => built[kind].length > 0);
  const forced: SlotKind[] = [];
  if (legal.includes("systems") && (missingShields(g) || missingMedical(g))) forced.push("systems");
  const rest = legal.filter((kind) => !forced.includes(kind));
  const chosen = [...forced, ...rest].slice(0, extraSlots(g));
  return chosen.flatMap((kind) => built[kind]);
}

function clearMedbay(g: Game) {
  g.player.systems.medbay.level = 0;
  g.player.systems.medbay.power = 0;
}

function grantSystem(g: Game, item: StockItem): boolean {
  if (item.ref === "swarm") {
    const schematic = SWARM_BUNDLE.find((row) => item.id === `sys-swarm-${row.schematic}`)?.schematic;
    if (!schematic || hasSwarm(g)) return false;
    // Same shape as installSwarmBundle. buy() spends the scrap. 2 levels, schematic selected, not deployed.
    g.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 0,
      left: 0,
      cool: 0,
      target: schematic,
      on: false,
      aux: 0,
    };
    return true;
  }
  const row = SYSTEMS.find((offer) => offer.ref === item.ref);
  if (!row) return false;
  const medbayLevel = g.player.systems.medbay.level;
  const cradleLevel = g.player.kits.cradle?.level ?? 0;
  // Systems, and Template:Purchasable systems: buying one medical system replaces the other.
  // Upgrade levels are kept. Power bars are not copied and not added.
  if (row.ref === "medbay" && medbayLevel <= 0 && cradleLevel > 0) {
    delete g.player.kits.cradle;
    g.player.systems.medbay.level = cradleLevel;
    g.player.systems.medbay.power = 0;
    return true;
  }
  if (row.ref === "cradle" && cradleLevel <= 0 && medbayLevel > 0) {
    clearMedbay(g);
    const kit = blankKit("cradle");
    kit.level = medbayLevel;
    g.player.kits.cradle = kit;
    return true;
  }
  if (ownedSystem(g, row)) return false;
  if (row.slot === "sys") {
    const sys = g.player.systems[row.ref];
    sys.level = 1;
    sys.power = 0;
    if (row.ref === "shields") g.player.shieldNow = 0;
    return true;
  }
  g.player.kits[row.ref] = blankKit(row.ref);
  return true;
}

function grantAugment(g: Game, item: StockItem): boolean {
  const row = CATALOG.find((entry) => entry.id === item.ref);
  if (!row || NOT_SOLD.has(row.id)) return false;
  if (!g.augments) g.augments = [];
  if (g.augments.includes(row.id) || g.augments.length >= AUGMENT_CAP) return false;
  g.augments.push(row.id);
  return true;
}

function grantCrew(g: Game, item: StockItem): boolean {
  const row = CREW.find((entry) => entry.ref === item.ref);
  if (!row) return false;
  const aboard = g.crew.filter((c) => c.side === "player");
  if (aboard.length >= CREW_CAP) return false;
  const kin = KIN[row.ref];
  const room = g.player.rooms.find((r) => r.system === "medbay") ?? g.player.rooms[0];
  if (!room) return false;
  g.uid = (g.uid + 1) >>> 0;
  g.crew.push({
    id: "u" + g.uid.toString(36),
    name: kin.name,
    side: "player",
    aboard: "player",
    hp: kin.hp,
    maxHp: kin.hp,
    room: room.id,
    path: [],
    move: 0,
    think: 0,
    tone: g.crew.length % 3,
    kin: row.ref,
  });
  return true;
}

/**
 * Handle a stock row this module added.
 * Return true after the purchase is applied. Scrap is spent by buy().
 */
export function citedBuy(g: Game, item: StockItem): boolean {
  if (item.kind === "system") {
    const ok = grantSystem(g, item);
    // Kit room (layouts.ts seatKits): a bought kit takes its hull's room; a Medbay swap takes the Clone Bay room back.
    if (ok) seatKits(g.player);
    return ok;
  }
  if (item.kind === "augment") return grantAugment(g, item);
  if (item.kind === "crew") return grantCrew(g, item);
  return false;
}

function weaponSell(defId: string): number | null {
  if (INVENTED_WEAPON_PRICE.has(defId)) return null;
  const printed = WEAPON_SELL[defId];
  if (printed != null) return printed;
  const def = WEAPONS[defId];
  if (!def || def.price <= 0) return null;
  return Math.floor(def.price / 2);
}

function augmentSell(id: AugmentId): number | null {
  if (NOT_SOLD.has(id)) return null;
  const printed = AUGMENT_SELL[id];
  if (printed != null) return printed;
  const row = CATALOG.find((entry) => entry.id === id);
  if (!row || row.cost <= 0) return null;
  return Math.floor(row.cost / 2);
}

/**
 * Template:In-game tips, Selling: weapons, drones, and augments sell for half the purchase price.
 * Scrap: half-price, rounded down against the player.
 * A printed "Sells for" or "Sell price" replaces that half.
 * Fuel, missiles, drone parts, hull repair, crew, and systems are not sold. Drone Control is not sold.
 * Drone schematics are not quoted, except a fitted Shield Overcharger +.
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
      name: WEAPONS[weapon.defId]?.name ?? weapon.defId,
      scrap,
    });
  }
  (g.augments ?? []).forEach((id, index) => {
    const scrap = augmentSell(id);
    if (scrap == null || scrap <= 0) return;
    const row = CATALOG.find((entry) => entry.id === id);
    quotes.push({
      id: `a:${index}:${id}`,
      kind: "augment",
      ref: id,
      name: row?.name ?? AUGMENT_SELL_NAME[id] ?? id,
      scrap,
    });
  });
  const over = g.player.kits.swarm;
  // A fitted Shield Overcharger + only. Identified by the drone id, not by the scrap amount.
  if (over?.target === "overchargerplus") {
    quotes.push({
      id: "d:overchargerplus",
      kind: "drone",
      ref: "overchargerplus",
      name: "Shield Overcharger +",
      scrap: OVERCHARGER_PLUS.sell,
    });
  }
  return quotes;
}

/** Add the quoted scrap. Remove that one weapon, augment, or fitted Shield Overcharger +. Do not subtract scrap. */
export function citedSell(g: Game, id: string): boolean {
  const quote = citedSellQuote(g).find((row) => row.id === id);
  if (!quote) return false;
  if (quote.kind === "drone") {
    const kit = g.player.kits.swarm;
    if (!kit || kit.target !== quote.ref) return false;
    kit.target = null;
    kit.on = false;
    kit.left = 0;
    kit.aux = 0;
    delete kit.hp;
    g.scrap += quote.scrap;
    g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
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
    }
    g.scrap += quote.scrap;
    g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
    return true;
  }
  const match = /^a:(\d+):(.+)$/.exec(id);
  if (!match || !g.augments) return false;
  const index = Number(match[1]);
  if (g.augments[index] !== quote.ref) return false;
  g.augments.splice(index, 1);
  g.scrap += quote.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
  return true;
}
