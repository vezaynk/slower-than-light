import { tx } from "../../i18n/index.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { allAugments, allDrones, allSystems, augmentDef, droneDef, systemDef, weaponDef } from "../pack/registry.ts";
import type { Game, Kit, KitId, StockItem, SysId } from "../types.ts";
import { seatKits } from "../layouts.ts";
import { OVERCHARGER_PLUS } from "./cited-overcharger.ts";
import { CARGO_SLOTS, cargoOf, receiveDrone } from "./make-room.ts";

/**
 * Extra store rows whose price and stock the wiki states.
 * Fuel, missiles, drone parts, and hull repair stay in rollStock.
 * rollStock fills the weapons section when storeSections rolls one. This module does not add a second one.
 * xftl doc/stores, "Resources": fuel 3–7, missiles 2–6, drone parts 2–4. rollStock rolls those ranges.
 *
 * The ten single-price systems live in system-catalog.ts and load through the pack.
 * Drone Control is a bundle, not a row of that list: 75 with a System Repair Drone,
 * 85 with a Defense Drone Mark I or a Combat Drone Mark I. The naked 60 is not a shelf price.
 * Artillery Beam and Flak Artillery have kit ids and no purchase price on that list.
 */

type Offer = { slot: "sys" | "kit"; ref: string; name: string; cost: number };

/** Authored single-price system list. The store reads the loaded copy. */
export { CITED_SYSTEMS } from "./system-catalog.ts";

const SYS_IDS: readonly SysId[] = ["shields", "engines", "oxygen", "medbay", "weapons", "pilot", "sensors", "doors"];
const KIT_IDS: readonly KitId[] = ["veil", "sling", "spike", "swarm", "leash", "cradle", "cell", "lance", "flak"];

function isSysId(id: string): id is SysId {
  return (SYS_IDS as readonly string[]).includes(id);
}

function isKitId(id: string): id is KitId {
  return (KIT_IDS as readonly string[]).includes(id);
}

function catalogOffers(): Offer[] {
  return allSystems().map((row) => ({ slot: row.slot, ref: row.id, name: row.name, cost: row.cost }));
}

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
export const NOT_SOLD: ReadonlySet<string> = new Set(["keel", "casing"]);

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

/** Authored schematic list. The store reads the loaded copy. Fire Drone, Shield Overcharger +, and Drone Control stay off it. */
export { CITED_DRONES } from "./drone-catalog.ts";

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
const AUGMENT_SELL: Partial<Record<string, number>> = {
  medbot: 30,
  pheromone: 25,
  gel: 30,
  // Augmentations, "Crystal Vengeance": "Sell price: 40". No purchase price, so it is not in CATALOG.
  vengeance: 40,
  // Zoltan Shield, "Sell value: 40". No purchase price, so it is not in CATALOG.
  zshield: 40,
};

const AUGMENT_SELL_NAME: Partial<Record<string, string>> = {
  medbot: tx("wiki.cited-stores.engi-med-bot-dispersal"),
  pheromone: tx("wiki.cited-stores.mantis-pheromones"),
  gel: tx("wiki.cited-stores.slug-repair-gel"),
  vengeance: tx("wiki.cited-stores.crystal-vengeance"),
  zshield: tx("wiki.cited-stores.zoltan-shield"),
};

export type SellQuote = {
  id: string;
  kind: "weapon" | "augment" | "drone";
  ref: string;
  name: string;
  scrap: number;
};

function ownedSystem(g: Game, row: Offer): boolean {
  if (row.slot === "sys") return isSysId(row.ref) && g.player.systems[row.ref].level > 0;
  return isKitId(row.ref) && (g.player.kits[row.ref]?.level ?? 0) > 0;
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

function swarmBundle(g: Game) {
  return SWARM_BUNDLE[((g.seed % 3) + 3) % 3];
}

function hasSwarm(g: Game): boolean {
  return (g.player.kits.swarm?.level ?? 0) > 0;
}

/**
 * INVENTED: plumbing, not a game rule. A private roll stream for one store, seeded from g.seed. The run seed is not
 * advanced, so rollStock and citedStock read the same sections. `salt` keeps the section and system rolls apart.
 */
function storeRoll(g: Game, salt: number): () => number {
  let a = (g.seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StoreSection = "weapons" | "drones" | "augments" | "crew" | "systems";
const SECTION_KINDS: readonly StoreSection[] = ["weapons", "drones", "augments", "crew", "systems"];
// xftl doc/stores: "any drones section found will be replaced with - in order of preference: weapons, augments, crew, system".
const DRONE_STAND_INS: readonly StoreSection[] = ["weapons", "augments", "crew", "systems"];

/** Systems and subsystems the ship has installed (main systems, Piloting, Sensors, Doors, and fitted kits). */
function installedSystems(g: Game): number {
  const systems = Object.values(g.player.systems).filter((s) => s.level > 0).length;
  const kits = Object.values(g.player.kits).filter((k) => k && k.level > 0).length;
  return systems + kits;
}

/**
 * Store::OnInit (xftl doc/stores, "Section generation"):
 * - "The number of sections is picked randomly between 2..4 inclusive."
 * - Stores and resources, "Systems" (the wiki outranks xftl): "If your ship has less than 11 systems+subsystems,
 *   there is a 50% chance the first store slot will be forced to be systems". xftl: "The other system slots are then
 *   picked, avoiding duplicates." INFERRED: those other slots draw from all five kinds, so a ship at 11 or more, or a
 *   coin-flip miss, can still roll systems.
 * - "If you don't have a drones system and the store does not contain a systems section, any drones section found
 *   will be replaced with" the first of weapons, augments, crew, system not already in the store.
 */
export function storeSections(g: Game): StoreSection[] {
  const roll = storeRoll(g, 0);
  const count = 2 + Math.floor(roll() * 3);
  const out: StoreSection[] = [];
  const coin = roll() < 0.5;
  if (coin && installedSystems(g) < 11) out.push("systems");
  while (out.length < count) {
    const pick = SECTION_KINDS[Math.floor(roll() * SECTION_KINDS.length)];
    if (!out.includes(pick)) out.push(pick);
  }
  if (!hasSwarm(g) && !out.includes("systems")) {
    const at = out.indexOf("drones");
    const swap = DRONE_STAND_INS.find((kind) => !out.includes(kind));
    if (at >= 0 && swap) out[at] = swap;
  }
  return out;
}

/**
 * xftl doc/stores, "Selecting systems":
 * - The random list holds missing systems, but Drone Control only when the store has no drones section, and a
 *   medical system only when the player "must already have a medical system".
 * - "The store picks how many systems to sell. This is either the number of systems in the randomised list above,
 *   or three - whichever is lower."
 * - Guaranteed first (Stores and resources, "Systems"): "A drone system is guaranteed if the store also sells drones";
 *   "Shields are guaranteed if you don't have them"; "A medical system is guaranteed if you don't have one". The wiki
 *   outranks xftl's "Clonebay in AE". INFERRED: that medical system is the Medbay or the Clone Bay, an even roll.
 * - "The rest are randomly selected systems that you don't have, without any duplicates."
 */
function systemItems(g: Game, sections: readonly StoreSection[]): StockItem[] {
  const bundle = swarmBundle(g);
  const swarmRow: Offer = { slot: "kit", ref: "swarm", name: tx("wiki.cited-stores.drone-control"), cost: bundle.cost };
  const catalog = catalogOffers();
  const missing = catalog.filter((row) => !ownedSystem(g, row));
  const drones = sections.includes("drones");
  const medical = (row: Offer) => row.ref === "medbay" || row.ref === "cradle";
  const pool = missing.filter((row) => !medical(row) || !missingMedical(g));
  if (!drones && !hasSwarm(g)) pool.push(swarmRow);
  const count = Math.min(SLOT, pool.length);
  const picked: Offer[] = [];
  if (drones && !hasSwarm(g)) picked.push(swarmRow);
  if (missingShields(g)) {
    const shields = catalog.find((row) => row.ref === "shields");
    if (shields) picked.push(shields);
  }
  const roll = storeRoll(g, 1);
  if (missingMedical(g)) {
    const ref = roll() < 0.5 ? "medbay" : "cradle";
    const row = catalog.find((offer) => offer.ref === ref);
    if (row) picked.push(row);
  }
  // The guarantees count toward that total: doc/stores' closing example ("every system except a medbay and two
  // others ... the store will only sell two systems"). INFERRED: when the guarantees alone pass it, the first ones
  // listed above are kept.
  const rest = pool.filter((row) => !picked.includes(row));
  while (picked.length < count && rest.length) picked.push(rest.splice(Math.floor(roll() * rest.length), 1)[0]);
  return picked.slice(0, count).map((row) => ({
    id: row.ref === "swarm" ? `sys-swarm-${bundle.schematic}` : `sys-${row.ref}`,
    kind: "system" as const,
    ref: row.ref,
    name: row.name,
    detail:
      row.ref === "swarm"
        ? tx("wiki.cited-stores.drone-control-the-paragraph-above-overview", { label: bundle.label })
        : tx("wiki.cited-stores.template-purchasable-systems", { name: row.name, cost: row.cost }),
    cost: row.cost,
    amount: 1,
  }));
}

export function droneItems(g: Game): StockItem[] {
  // Stores and resources, "Stores assortment": a drone slot holds three schematics.
  // The slot does not require Drone Control. Buying one still needs that system and a free slot.
  // Fire Drone and Shield Overcharger + are not in the catalog.
  const rows = allDrones();
  const n = rows.length;
  if (n === 0) return [];
  // INFERRED: rarity is named and the likelihood formula is not in the dump.
  // g.seed picks the start of a window of three. The seed is not advanced.
  const start = ((g.seed % n) + n) % n;
  return Array.from({ length: Math.min(SLOT, n) }, (_, i) => rows[(start + i) % n]).map((row) => ({
    id: `drone-${row.id}`,
    kind: "drone" as const,
    ref: row.id,
    name: row.name,
    detail: tx("wiki.cited-stores.drone-control-purchase-price", { name: row.name, cost: row.cost }),
    cost: row.cost,
    amount: 1,
  }));
}

export function augmentItems(g: Game): StockItem[] {
  const have = g.augments ?? [];
  const free = AUGMENT_CAP - have.length;
  if (free <= 0) return [];
  const pool = allAugments().filter((row) => !NOT_SOLD.has(row.id) && !have.includes(row.id));
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
  // Crew: "If the player wishes to replace a crewmember at a store or a hiring station while being at full crew count,
  // the game will require to relieve one of the existing crewmembers before purchase/hire." So a full crew still sees
  // the section; the store asks who leaves first (StoreBoard), and grantCrew keeps the cap of 8.
  // Sectors, "Hidden Crystal Worlds", "Crewmembers": only Crystal crew can be purchased.
  // Not a random draw. The run RNG is left alone. First rows of the comparison table that still fit.
  const rows = g.sectorName === "Hidden Crystal Worlds" ? CREW.filter((row) => row.ref === "shard") : CREW;
  return rows.slice(0, SLOT).map((row) => {
    const kin = KIN[row.ref];
    return {
      id: `crew-${row.ref}`,
      kind: "crew" as const,
      ref: row.ref,
      name: kin.name,
      detail: tx("wiki.cited-stores.template-crew-races-comparison-costs-health", { name: kin.name, cost: row.cost, hp: kin.hp }),
      cost: row.cost,
      amount: 1,
    };
  });
}

/**
 * The non-weapon sections of storeSections, in store order. rollStock fills the weapons section.
 * INFERRED: a section with nothing left to sell (a full crew, three augments) shows nothing. The notes do not say
 * whether the game rerolls it.
 */
export function citedStock(g: Game): StockItem[] {
  const sections = storeSections(g);
  const built: Record<Exclude<StoreSection, "weapons">, () => StockItem[]> = {
    systems: () => systemItems(g, sections),
    drones: () => droneItems(g),
    augments: () => augmentItems(g),
    crew: () => crewItems(g),
  };
  return sections.flatMap((kind) => (kind === "weapons" ? [] : built[kind]()));
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
  const row = systemDef(item.ref);
  if (!row) return false;
  const medbayLevel = g.player.systems.medbay.level;
  const cradleLevel = g.player.kits.cradle?.level ?? 0;
  // Systems, and Template:Purchasable systems: buying one medical system replaces the other.
  // Upgrade levels are kept. Power bars are not copied and not added.
  if (row.id === "medbay" && medbayLevel <= 0 && cradleLevel > 0) {
    delete g.player.kits.cradle;
    g.player.systems.medbay.level = cradleLevel;
    g.player.systems.medbay.power = 0;
    return true;
  }
  if (row.id === "cradle" && cradleLevel <= 0 && medbayLevel > 0) {
    clearMedbay(g);
    const kit = blankKit("cradle");
    kit.level = medbayLevel;
    g.player.kits.cradle = kit;
    return true;
  }
  if (ownedSystem(g, { slot: row.slot, ref: row.id, name: row.name, cost: row.cost })) return false;
  if (row.slot === "sys") {
    if (!isSysId(row.id)) return false;
    const sys = g.player.systems[row.id];
    // The Stealth Cruiser: "Installing shields requires 125 scrap, and will start with two power bars making one shield layer."
    // Level 2 is those two bars. One layer is what both bars produce once they are powered.
    // Power stays unassigned, the same as every other system purchase.
    sys.level = row.id === "shields" ? 2 : 1;
    sys.power = 0;
    if (row.id === "shields") g.player.shieldNow = 0;
    return true;
  }
  if (!isKitId(row.id)) return false;
  g.player.kits[row.id] = blankKit(row.id);
  return true;
}

function grantAugment(g: Game, item: StockItem): boolean {
  const row = augmentDef(item.ref);
  if (!row || NOT_SOLD.has(row.id)) return false;
  if (!g.augments) g.augments = [];
  if (g.augments.includes(row.id) || g.augments.length >= AUGMENT_CAP) return false;
  g.augments.push(row.id);
  return true;
}

export function fieldedSchematics(kit: Kit): string[] {
  if (kit.loadout?.length) return [...kit.loadout];
  return kit.target ? [kit.target] : [];
}

/**
 * Drone Control, Overview: most playable ships have 2 schematic slots.
 * All Engi ships and Stealth C have 3. Upgrading powers more drones; it does not add a slot.
 */
function schematicCap(g: Game): number {
  const id = g.hullId ?? "";
  if (id.startsWith("engi-") || id === "stealth-c") return 3;
  return 2;
}

/** Schematic slots this hull can field. Zero when Drone Control is not installed — there is no slot to draw. */
export function droneSlotCap(g: Game): number {
  if (!g.player.kits.swarm) return 0;
  return schematicCap(g);
}

/** The Engi Cruiser, Layout B: two System Repair ids are two drones, not one swapped schematic. */
function pairedRepair(kit: Kit): boolean {
  return (kit.loadout?.filter((kind) => kind === "patch").length ?? 0) > 1;
}

/** Per the user: a schematic that cannot be fitted goes to cargo. The store will not sell it when cargo is full too. */
function grantDrone(g: Game, item: StockItem): boolean {
  if (!canFieldDrone(g, item.ref) && cargoOf(g).length >= CARGO_SLOTS) return false;
  const got = receiveDrone(g, item.ref);
  return got === "fitted" || got === "cargo";
}

/** A schematic the ship can take now: Drone Control fitted, a free schematic slot, and not one it already fields. */
export function canFieldDrone(g: Game, ref: string): boolean {
  const kit = g.player.kits.swarm;
  if (!kit || !droneDef(ref)) return false;
  const have = fieldedSchematics(kit);
  return !have.includes(ref) && have.length < schematicCap(g) && (!pairedRepair(kit) || ref === "patch");
}

/** Fits a drone schematic (a store purchase, or a loot bonus item). */
export function fieldDroneSchematic(g: Game, ref: string): boolean {
  const row = droneDef(ref);
  const kit = g.player.kits.swarm;
  if (!row || !kit) return false;
  const have = fieldedSchematics(kit);
  // Stores and resources: a store will never sell duplicate drone schematics.
  // INFERRED: a schematic the ship already fields is not fitted a second time.
  if (have.includes(row.id)) return false;
  if (have.length >= schematicCap(g)) return false;
  // INFERRED: a non-repair id on the paired System Repair list would fly as one swapped drone.
  if (pairedRepair(kit) && row.id !== "patch") return false;
  if (!kit.loadout?.length && !kit.target) {
    kit.target = row.id;
    return true;
  }
  if (!kit.loadout?.length && kit.target) {
    kit.loadout = [kit.target, row.id];
    return true;
  }
  kit.loadout = [...(kit.loadout ?? []), row.id];
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
  if (item.kind === "drone") return grantDrone(g, item);
  return false;
}

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
  const printed = AUGMENT_SELL[id];
  if (printed != null) return printed;
  const row = augmentDef(id);
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
      name: weaponDef(weapon.defId)?.name ?? weapon.defId,
      scrap,
    });
  }
  // Per the user: weapons in cargo sell like fitted ones.
  cargoOf(g).forEach((item, index) => {
    if (item.kind !== "weapon") return;
    const scrap = weaponSell(item.id);
    if (scrap == null || scrap <= 0) return;
    quotes.push({ id: `c:${index}:${item.id}`, kind: "weapon", ref: item.id, name: `${weaponDef(item.id)?.name ?? item.id} (cargo)`, scrap });
  });
  (g.augments ?? []).forEach((id, index) => {
    const scrap = augmentSell(id);
    if (scrap == null || scrap <= 0) return;
    const row = augmentDef(id);
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
      name: tx("wiki.cited-stores.shield-overcharger-2"),
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
  if (quote.kind === "weapon" && id.startsWith("c:")) {
    const index = Number(id.split(":")[1]);
    if (cargoOf(g)[index]?.id !== quote.ref) return false;
    g.cargo = cargoOf(g).filter((_, i) => i !== index);
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
      g.beamAnchor = null;
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
  // Zoltan Shield prints "Sell value: 40" and does not print a leftover overcharger amount.
  // INFERRED: clearing the bubble is the augment leaving.
  if (quote.ref === "zshield") {
    g.player.zoltan = undefined;
    delete g.player.zoltanOver;
  }
  g.scrap += quote.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + quote.scrap;
  return true;
}
