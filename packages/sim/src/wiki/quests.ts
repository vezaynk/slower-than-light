/**
 * @agent:quests. Quest markers and the quest-marker destinations of the cited events that name one.
 *
 * Beacons, "Quest (marker) beacon":
 *   ''Unvisited. Quest destination.'' "To access the newly-spawned quest, you must navigate to a beacon marked 'QUEST',
 *   usually a couple jumps from your current position. Once spawned, quest beacons can be seen on the map from any
 *   distance away."
 *   "Quest beacons will normally be placed in the current sector ("Added a quest marker to your map!"). However, if you
 *   don't have many jumps left, the game will push the quest into the next sector instead ("Added a quest marker to the
 *   next sector!"): it will appear regardless of which sector you choose. If this happens in sector 7, the quest will be
 *   "cancelled", because quests are not allowed in sector 8 ("Upon examining your map, you realize you just won't have
 *   time and need to get to the Federation base! You leave the quest for another day.")."
 *   "A spawned quest marker will replace another event at the beacon that it overwrites, unless it is a store, exit, or
 *   another quest marker." "A quest marker cannot appear in nebula area: if the current sector event is bound to create a
 *   quest marker, while there is only nebula area to the right of the player ship or there are no suitable beacons to be
 *   overwritten, the quest marker beacon will be placed in the next sector."
 *
 * Rebel Fleet: no page in the dump says what the fleet does to a quest beacon. Beacons says Distress beacons "will remain
 * on the map till they get overtaken by rebels". INFERRED: a quest beacon is the same. Once the fleet column covers it,
 * sim.ts commitJump's overtaken rule (a Rebel Elite) applies there and the quest is lost.
 *
 * Beacons, "Quest (marker) beacon": a marker in the current sector goes on a beacon to the right of the ship. With no
 * such beacon it goes to the next sector. A beacon the ship already visited, one the fleet has taken, and a
 * ship-unlocking event page are not overwritten.
 * INFERRED everywhere below: a page that lists N results without odds rolls them with equal odds ({{DuplicateEvent|N}}
 * counts N times). An unnamed weapon, drone schematic or augment is a random one (bonus-item.ts grantRandomItem, per
 * Rewards "Weapon" / "Drone" / "Augment"); named ones are granted by name.
 * INVENTED: quest beacon names, and the one-word labels of "Fight ..." / "Continue" buttons where a page prints none.
 * Ship unlocks go through unlocks.ts grantUnlock.
 */
import { upgradeCost } from "../content.ts";
import { eventText } from "../event-text.ts";
import { adjustScrap } from "../extras/index.ts";
import { allEvents, crewDef, eventDef, fillerList, warnPack, weaponDef } from "@stl/pack";
import type { EventDef } from "@stl/pack";
import { xpNeedFor } from "../extras/lineage.ts";
import {
  aidPlayerAsb,
  beginBoarding,
  halvePlayerSystems,
  hurtSystem,
  log,
  openStoreHere,
  rand,
  sealEmptyEvent,
  showEventLines,
  shutPlayerHacking,
} from "../sim.ts";
import type { AugmentId, Beacon, Game, GameEvent, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts"; // @agent:unlocks
import { noteReactorEvent } from "../rules/achievement-track.ts";
import { grantRandomItem } from "../rules/bonus-item.ts";
import { locksOwned, ownedLock, eventMissileWeapon } from "./choice-locks.ts";
import { priceBand, priced, rollPrice } from "./event-prices.ts";
import { rollBand, upgradeRows } from "./event-bands.ts";
import { rollFuel } from "./fuel-gifts.ts";
import { fleetToReach, jumpsBetween, overtaken } from "../rules/sector-map.ts";
// @agent:quests-a. Quest-opener modules register a QuestPart; PARTS is read at call time (the modules import this one).
import { RUWEN_ENTRY } from "./ruwen-entry.ts";
import { PART_A } from "./quests-a.ts";
import { PART_B } from "./quests-b.ts"; // @agent:quests-b. Quest-opening events, part B.
import { hullRunSeconds, type EscapePlan } from "../rules/escape.ts";
import {
  between,
  closeFight,
  here,
  allMantisCrew,
  humanBoarders,
  slugBoarders,
  joinCrew,
  NEVER_RUN,
  pageCard,
  pageFight,
  payOffer,
  zoltanBoarders,
  randomRace,
  rollStandard,
  resourceBand,
  rollSurrenderOffer,
  scrapBand,
  type SurrenderOffer,
  type SurrenderTier,
} from "./surrender.ts";
import { receiveAugment } from "../rules/make-room.ts";
import { stampStockLabels } from "./stock-labels.ts";
import {
  affordStock,
  fuelLine,
  missileLine,
  partsLine,
  scrapLine,
  takeStock,
} from "./stock-spend.ts";
import { queueSfx } from "../sfx-queue.ts";

/**
 * @agent:quests-a. One quest-opener module (quests-a.ts, quests-b.ts): its quest ids, arrival cards, choices, page wins
 * and "gotaway" cards, merged after this file's own tables. Append a module to PARTS; do not reorder.
 */
export type QuestPart = {
  quests: Record<string, { page: string; title: string }>;
  arrive: Record<string, (g: Game, b: Beacon) => void>;
  choices: Record<string, (g: Game) => void>;
  disabled?: (g: Game, id: string) => string | null;
  wins: Record<string, Win>;
  gotAway: Record<string, (g: Game) => void>;
};
const PARTS = (): QuestPart[] => [PART_A, PART_B];
function fromParts<K extends "quests" | "arrive" | "choices" | "wins" | "gotAway">(
  k: K,
  id: string,
): QuestPart[K][string] | undefined {
  for (const part of PARTS()) {
    const table = part?.[k] as Record<string, QuestPart[K][string]> | undefined;
    if (table?.[id]) return table[id];
  }
  return undefined;
}

/** Quest id -> the event page whose "Quest Marker" section it is, and the INVENTED beacon name. */
export const QUESTS: Record<string, { page: string; title: string }> = {
  escort: { page: "Escort civilians", title: "Escort destination" },
  "mantis-war-camp": { page: "Mantis war camp", title: "Mantis encampment" },
  "space-station": { page: "Space station under construction", title: "Missing cargo ship" },
  "defector-cache": { page: "Rebel defector", title: "Defector's cache" },
  "mantis-chase": { page: "Mantis ship-collectors", title: "Quest: hostile Mantis Bomber" },
  "fed-base": {
    page: "Rebel ship attacking Federation loyalists",
    title: "Hidden Federation Base",
  },
  "thief-stash": { page: "Legendary thief KazaaakplethKilik", title: "Thief's cache" },
  "slug-pirate-trap": { page: "Slug comm tapping", title: "Quest: pirate ship and cache" },
  "engi-real": { page: "Engi fleet discussion", title: "Quest: Rebel base (first)" },
  "engi-fake": { page: "Engi fleet discussion", title: "Quest: Rebel base (second)" },
  "engi-final": { page: "Engi fleet discussion", title: "Quest: Mantis convoy" },
  "slug-platform": {
    page: "Slug Home Nebula surrender",
    title: "Quest: Slug construction platform",
  },
  "store-rescue": { page: "Settlement mercenary work", title: "Quest: space dock" },
};

/** The marker lines, read from the archive when printed (text_misc.xml ids). */
export const questAdded = () => eventText("added_quest");
export const questNext = () => eventText("added_quest_sector");
export const questCancelled = () => eventText("no_time");

/** Ship-unlocking event pages (Category:Ship Unlocking Events) are not overwritten by a marker. INFERRED (Beacons @to-do). */
const KEEP_FLAGS = new Set([
  "ENGI_UNLOCK_1",
  "MANTIS_NAMED_THIEF",
  "NEBULA_SLUG_FIGHT_UNLOCK",
  "BOSS_REPAIR_STATION",
  // @agent:quests-a. Category:Ship Unlocking Events pages wired in quests-a.ts.
  "ROCK_CRYSTAL_BEACON",
  "ROCK_UNLOCK",
  "ZOLTAN_PEACE_QUEST",
  "ZOLTAN_CREW_STUDY",
]);

/**
 * xftl doc/sector-map, StarMap::AddQuest, keeps a beacon that has "not been visited", is not a nebula beacon, "not the
 * exit beacon", has "not been overtaken by the rebel fleet", has no quest, "Is not a store", "Is not a distress beacon",
 * and "Is not the player's current beacon". "If there is no path, the beacon is skipped." Then, "unless the 'force'
 * argument is set, the number of jumps away from the player must be less than the number of jumps until this quest is
 * overtaken by the rebels" ("force ... is true when adding quests delayed from a previous sector").
 * Beacons, "Quest (marker) beacon": "A quest marker cannot appear in nebula area".
 * INFERRED: jumps until overtaken count normal 64px fleet steps (rules/sector-map.ts fleetToReach). The boss beacon and
 * the KEEP_FLAGS pages are also kept clear.
 */
function canHold(g: Game, b: Beacon, from: Beacon | undefined, force: boolean): boolean {
  if (b.kind === "start" || b.kind === "exit" || b.kind === "boss" || b.kind === "store")
    return false;
  if (b.kind === "nebula" || b.kind === "distress") return false;
  if (b.quest || b.visited || b.id === g.here || KEEP_FLAGS.has(b.flag)) return false;
  if (overtaken(g, b)) return false;
  // Beacons: a marker in this sector is placed to the right of the ship. Next-sector placement (force) skips that test.
  if (!force) {
    const ship = g.beacons.find((x) => x.id === g.here);
    if (ship && b.col <= ship.col) return false;
  }
  const jumps = from ? jumpsBetween(g.beacons, from.id, b.id) : 0;
  if (!Number.isFinite(jumps)) return false;
  return force || jumps < fleetToReach(g, b) - g.fleet;
}

/**
 * A beacon for a new marker, or undefined. Beacon-mix (wiki/beacon-mix.ts) leaves the Sectors page's "N quests" lines as
 * unflagged `event` beacons; those are taken first, then any other beacon a marker may overwrite.
 */
export function questSpot(g: Game, force = false): Beacon | undefined {
  const from = here(g);
  const ok = g.beacons.filter((b) => canHold(g, b, from, force));
  const slots = ok.filter((b) => b.kind === "event" && !b.flag);
  const pool = slots.length ? slots : ok;
  if (!pool.length) return undefined;
  return pool[Math.min(pool.length - 1, Math.floor(rand(g) * pool.length))];
}

function mark(b: Beacon, id: string) {
  b.quest = id;
  // Slug comm tapping and Slug Home Nebula: the marker beacon is a nebula. Other markers stay events.
  // Wiki citations:
  // > "Note: this event occurs at a regular quest marker beacon, but when you arrive there will be a nebula environment." — [[Slug Home Nebula surrender#Quest Marker]]
  b.kind = id === "slug-pirate-trap" || id === "slug-platform" ? "nebula" : "event";
  b.flag = `arrive-${id}`;
  b.name = QUESTS[id]?.title ?? fromParts("quests", id)?.title ?? "Quest";
  b.asteroid = false;
  b.resolved = false;
  b.visited = false;
  b.tier = "pool";
}

/** Adds a quest marker per Beacons, "Quest (marker) beacon". Returns the line the game prints. */
export function addQuest(g: Game, id: string): string {
  // "quests are not allowed in sector 8".
  if (g.sector >= 8) {
    log(g, questCancelled());
    return questCancelled();
  }
  const spot = questSpot(g);
  if (spot) {
    mark(spot, id);
    log(g, questAdded());
    return questAdded();
  }
  // "If this happens in sector 7, the quest will be "cancelled"".
  if (g.sector >= 7) {
    log(g, questCancelled());
    return questCancelled();
  }
  (g.questsNext ??= []).push(id);
  log(g, questNext());
  return questNext();
}

/**
 * Archive `<quest event>`. Placement follows addQuest. The id is an event or an event list,
 * and arrival plays that page. A missing id places nothing.
 */
export function addArchiveQuest(g: Game, eventId: string): void {
  if (!eventDef(eventId) && !(fillerList(eventId)?.entries.length ?? 0)) {
    warnPack(`A <quest event="${eventId}"> is not an event or an event list; it places nothing.`);
    return;
  }
  addQuest(g, eventId);
}

/** The archive page a quest marker plays, when the id is not a campaign quest slug. */
function archiveQuestPage(g: Game, id: string): EventDef | undefined {
  if (QUESTS[id] || fromParts("quests", id) || fromParts("arrive", id)) return undefined;
  const direct = eventDef(id);
  if (direct) return direct;
  const list = fillerList(id);
  if (!list?.entries.length) return undefined;
  const entry = list.entries[Math.floor(rand(g) * list.entries.length) % list.entries.length];
  return entry.page ?? eventDef(entry.id);
}

/** sim.ts nextSector, after the sector's events are stamped: "it will appear regardless of which sector you choose". */
export function placeQueuedQuests(g: Game) {
  const queued = g.questsNext ?? [];
  g.questsNext = [];
  for (const id of queued) {
    const spot = questSpot(g, true);
    if (spot) mark(spot, id);
    // INFERRED: a sector with no room (all nebula, say) loses the marker. The page does not cover this case.
    else log(g, "No room on this map for the quest marker.");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Cards and payouts
// ---------------------------------------------------------------------------------------------------------------

export type Choice = { id: string; label: string };

/** A button whose label is the archive's text for `key` (ftl.dat's choice id). */
function opt(id: string, key: string): Choice {
  return { id, label: eventText(key) };
}
const ACK = (): Choice[] => [opt("ack", "continue")];

/** Rewards, "Scrap only": T scrap. Same augment adjustment as the other rewards. */
export function scrapOnly(g: Game, tier: SurrenderTier): SurrenderOffer {
  const eligible = between(g, scrapBand(g, tier));
  return { tier, scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 };
}

/** Rewards, "Fuel" / "Missiles": T of that resource and T scrap. Bands are the page tooltips. */
function cargoAndScrap(g: Game, tier: "low" | "high", kind: "fuel" | "missiles"): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  offer[kind] = between(g, resourceBand(kind, tier));
  return offer;
}

const ENGI_DISTRESS_AFTER = (): Choice[] => [
  opt("q:engi-distress:scrap", "event_DISTRESS_ENGI_REBEL_RESULT_c1_choice"),
  opt("q:engi-distress:supplies", "event_DISTRESS_ENGI_REBEL_RESULT_c2_choice"),
  opt("q:engi-distress:nothing", "event_DISTRESS_ENGI_REBEL_RESULT_c3_choice"),
];

/**
 * Rebel ship attacking civilians in Last Stand. Contact the survivors. Three results, no odds. INFERRED: equal.
 * Supplies are Rewards, "Stuff", medium: two resources in the printed medium bands, plus low scrap.
 * The page names no weapon, so the Stuff bonus item is not granted.
 */
function lastStandSurvivors(g: Game) {
  const kind = pick(g, ["repair", "supplies", "thanks"] as const);
  if (kind === "repair") {
    result(g, eventText("event_BOSS_SCOUT_RESCUE_LIST_2_text"), undefined, [repair(g, 8)]);
    return;
  }
  if (kind === "supplies") {
    result(
      g,
      eventText("event_BOSS_SCOUT_RESCUE_LIST_3_text"),
      rollSurrenderOffer(g, "medium", true),
    );
    return;
  }
  result(g, eventText("event_BOSS_SCOUT_RESCUE_LIST_1_text"), undefined, ["Nothing happens."]);
}

/** Engi distress Rebel fight, destroyed low standard or a crew kill medium, then the Engi ask for help. */
function engiDistressWin(g: Game, deadCrew: boolean) {
  result(
    g,
    [
      eventText("ship_DISTRESS_ENGI_REBEL_destroyed_text"),
      eventText("event_DISTRESS_ENGI_REBEL_RESULT_text"),
    ].join(" "),
    rollStandard(g, deadCrew ? "medium" : "low"),
    [],
    ENGI_DISTRESS_AFTER(),
  );
}

/** Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is unnamed: Rewards, "Drone": "A
 * random drone schematic & T scrap." The page pays no scrap with it. */
function engiDistressGift(g: Game) {
  const cost = affordStock(g, "q:engi-distress:scrap", "scrap");
  if (cost == null) return;
  takeStock(g, "scrap", cost);
  const spent = scrapLine(cost);
  const r = pick(g, ["nothing", "heal", "schematic"] as const);
  if (r === "heal") {
    result(
      g,
      eventText("event_DISTRESS_ENGI_REBEL_LIST1_2_text"),
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "BOMB_HEAL" },
      [spent],
    );
    return;
  }
  if (r === "schematic") {
    result(g, eventText("event_DISTRESS_ENGI_REBEL_LIST1_3_text"), undefined, [
      spent,
      grantRandomItem(g, "drone"),
    ]);
    return;
  }
  result(g, eventText("event_DISTRESS_ENGI_REBEL_LIST1_1_text"), undefined, [
    "Nothing else happens.",
    spent,
  ]);
}

/** The result card: page text, what was paid, extras, and the next choices ("ack" by default). */
export function result(
  g: Game,
  text: string,
  offer?: SurrenderOffer,
  extras: string[] = [],
  choices: Choice[] = ACK(),
) {
  const lines: string[] = [text];
  const got: string[] = [];
  if (offer) {
    const paid = payOffer(g, offer, true);
    if (offer.scrap) got.push(`Scrap: ${offer.scrap}.`);
    if (offer.fuel) got.push(`Fuel: ${offer.fuel}.`);
    if (offer.missiles) got.push(`Missiles: ${offer.missiles}.`);
    if (offer.parts) got.push(`Drone parts: ${offer.parts}.`);
    if (paid.weaponName) got.push(`${paid.weaponName}.`);
    got.push(...paid.extras);
  }
  const tail = [...got, ...extras].filter(Boolean);
  if (tail.length) lines.push(tail.join(" "));
  g.event = {
    title: here(g)?.name ?? "Event",
    body: lines.join("\n\n"),
    choices: stampStockLabels(choices),
  };
  g.phase = "event";
  g.paused = true;
  sealEmptyEvent(g);
}

export function card(g: Game, body: string, choices: Choice[]) {
  pageCard(g, body, choices);
  g.paused = true;
}

export function weighted<T>(g: Game, items: [T, number][]): T {
  let roll = rand(g) * items.reduce((a, [, w]) => a + w, 0);
  for (const [item, w] of items) {
    roll -= w;
    if (roll < 0) return item;
  }
  return items[items.length - 1][0];
}

export function pick<T>(g: Game, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand(g) * items.length))];
}

export function repair(g: Game, n: number): string {
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + n);
  return `Hull repairs: ${n}.`;
}

const AUG_NAMES: Partial<Record<AugmentId, string>> = {
  SYSTEM_CASING: "Titanium System Casing",
  SLUG_GEL: "Slug Repair Gel",
  CREW_STIMS: "Mantis Pheromones",
  // Engi distress Rebel fight prints this name for the med-bot augment.
  NANO_MEDBAY: "Engi Med-bot Dispersal",
  // @agent:quests-a.
  ROCK_ARMOR: "Rock Plating",
  CRYSTAL_SHARDS: "Crystal Vengeance",
  ENERGY_SHIELD: "Zoltan Shield",
};

/**
 * A named augmentation. Augmentations: up to three; on a full rack "you must choose one augment to leave behind"
 * (make-room.ts). INFERRED: a named page reward the ship already has is not doubled and pays nothing.
 */
export function grantAug(g: Game, id: AugmentId): string {
  const name = AUG_NAMES[id] ?? id;
  if (g.augments.includes(id)) return `${name} is already fitted.`;
  if (receiveAugment(g, id) === "queued")
    return `No free augmentation slot for ${name}: choose what to leave behind.`;
  return `${name} fitted.`;
}

/** A crewmember joins; `skill` at level 1 (page: "with 1 skill in ..."). */
export function crew(g: Game, race: string, skill?: SkillName, name?: string): string {
  if (!joinCrew(g, race, name)) return "There is no room aboard for the new crewmember.";
  const c = g.crew[g.crew.length - 1];
  if (skill) c.skills = { ...(c.skills ?? {}), [skill]: xpNeedFor(c, skill) };
  return `A ${race} crewmember joins you.`;
}

function hasEngi(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "engi");
}
function hasSlug(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "slug");
}
function hasLanius(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "anaerobic");
}
function hasRock(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "rock");
}

/** Slug drink. Two results and no odds. INFERRED: equal. A Rock's trap is the fight; the drink's trap loses 25–35 scrap. */
function slugDrink(g: Game, rock: boolean) {
  if (pick(g, ["trust", "trap"] as const) === "trust") {
    const note = repair(g, 10);
    result(
      g,
      rock ? eventText("event_SLUG_DRINK_ROCK_1_text") : eventText("event_SLUG_DRINK_DRINK_1_text"),
      undefined,
      [note],
      [opt("q:open-store", "continue")],
    );
    return;
  }
  if (rock) {
    pageFight(g, eventText("event_SLUG_DRINK_ROCK_2_text"), "Slug ship", "slug-drink");
    return;
  }
  // INFERRED: scrap does not go below zero. A missing band loses nothing.
  const n = rollBand("slug-drink", "trap", "scrap", (lo, hi) => between(g, [lo, hi]));
  if (n == null) {
    result(g, eventText("event_SLUG_DRINK_DRINK_2_text"));
    return;
  }
  const lost = Math.min(g.scrap, n);
  g.scrap -= lost;
  result(g, eventText("event_SLUG_DRINK_DRINK_2_text"), undefined, [`Scrap: -${lost}.`]);
}

/** Lanius powered-down ship, "Investigate the vessel." Blue options stay visible when the ship cannot use them. */
function investigateDormant(g: Game) {
  card(g, eventText("event_LANIUS_DORMANT_INVESTIGATE_text"), [
    opt("q:lanius-dormant:ignore", "event_LANIUS_DORMANT_INVESTIGATE_c1_choice"),
    opt("q:lanius-dormant:navigate", "event_LANIUS_DORMANT_INVESTIGATE_c3_choice"),
    opt("q:lanius-dormant:plunder", "event_LANIUS_DORMANT_INVESTIGATE_c2_choice"),
    opt("q:lanius-dormant:autopilot", "event_LANIUS_DORMANT_INVESTIGATE_c4_choice"),
  ]);
}
export function sensors(g: Game): number {
  return g.player.systems.sensors?.level ?? 0;
}
export function hasTeleporter(g: Game): boolean {
  return (g.player.kits.teleporter?.level ?? 0) > 0;
}
function hasMissileWeapon(g: Game): boolean {
  // Weapons, Hull Missile: countedAsMissileInEvents is false. A Hull Missile does not open a Missile Weapon option.
  // A crystal gun is kind missile with ammo false. It is not a Missile Weapon.
  return eventMissileWeapon(g);
}

function damageHull(g: Game, n: number): boolean {
  g.player.hull = Math.max(0, g.player.hull - n);
  log(g, `Hull damage: ${n}.`);
  // sounds.xml eventDamage: an event's blast against the hull.
  if (n > 0) queueSfx(g, "eventDamage");
  if (g.player.hull > 0) return false;
  g.phase = "defeat";
  g.outcome = g.training ? "tutorial" : "hull";
  g.paused = true;
  g.event = null;
  return true;
}

export function startRun(seconds: number): EscapePlan {
  return { ...NEVER_RUN, mode: "start", seconds, running: true };
}
export function hullRun(chance: number, threshold: number, seconds: number): EscapePlan {
  return { ...NEVER_RUN, mode: "hull", seconds, chance, threshold };
}

// ---------------------------------------------------------------------------------------------------------------
// Arriving at a quest beacon (sim.ts eventFor)
// ---------------------------------------------------------------------------------------------------------------

/** Template:Escort Civilian Ship (Escort civilians and Escort civilians FTL haywire "Destination"). */
function arriveEscort(g: Game) {
  const r = pick(g, ["ambush", "reward", "store", "reactor"] as const);
  if (r === "ambush") {
    card(g, eventText("event_QUEST_ESCORT_ARRIVE_1_text"), [opt("q:escort:fight", "continue")]);
  } else if (r === "reward") {
    result(g, eventText("event_QUEST_ESCORT_ARRIVE_2_text"), rollStandard(g, "high"));
  } else if (r === "store") {
    // "Your ship receives 5 repairs and a store opens."
    result(
      g,
      eventText("event_QUEST_ESCORT_ARRIVE_3_text"),
      undefined,
      [repair(g, 5)],
      STORE_CHOICES(),
    );
  } else {
    // "Your ship reactor is upgraded." Ref: "If your ship reactor was already fully upgraded ... "Could not upgrade the
    // Reactor, it's maxed" - and nothing happens."
    let note = "Could not upgrade the Reactor, it's maxed";
    if (upgradeCost("reactor", g.player.reactor) != null) {
      g.player.reactor += 1;
      // Manpower: an event offer to upgrade the reactor does not count against the achievement.
      noteReactorEvent(g);
      note = `Reactor ${g.player.reactor}.`;
    }
    result(g, eventText("event_QUEST_ESCORT_ARRIVE_4_text"), undefined, [note]);
  }
}

export const STORE_CHOICES = (): Choice[] => [
  opt("q:open-store", "button_store"),
  opt("ack", "continue"),
];

/** Space station under construction, "Quest Marker": "One of the following subevents occurs". */
function arriveStation(g: Game) {
  const r = pick(g, ["rebel", "empty", "floating"] as const);
  if (r === "rebel") {
    card(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_1_text"), [
      opt("q:station:attack", "event_QUEST_CONSTRUCTIONYARD_LIST_1_c1_choice"),
      opt("q:station:leave", "event_QUEST_CONSTRUCTIONYARD_LIST_1_c2_choice"),
    ]);
  } else if (r === "empty") {
    // {{:Abandoned station}}.
    card(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_2_text"), [
      opt("q:station:examine", "event_QUEST_CONSTRUCTIONYARD_LIST_2_c1_choice"),
      opt("q:station:stay", "event_QUEST_CONSTRUCTIONYARD_LIST_2_c2_choice"),
    ]);
  } else {
    card(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_3_text"), [
      opt("q:station:fuel4", "event_QUEST_CONSTRUCTIONYARD_LIST_3_c1_choice"),
      opt("q:station:fuel1", "event_QUEST_CONSTRUCTIONYARD_LIST_3_c2_choice"),
      opt("q:station:none", "event_QUEST_CONSTRUCTIONYARD_LIST_3_c3_choice"),
    ]);
  }
}

/**
 * Template:Hidden federation base, Federation Base Assist. Four arrival bullets, no odds.
 * INFERRED: equal among the four. The two non-AE sentences are the same text on two of those four.
 * Each fight id fixes the contact, so the arrival is not rolled again after the fight.
 * Button labels the page does not print are INVENTED, in the style of "Fight the Auto-ship."
 */
export function arriveFedAssist(g: Game) {
  const r = pick(g, ["auto", "repair", "asb", "wing"] as const);
  if (r === "asb") {
    card(g, eventText("event_OVERRIDE_FEDERATION_BASE_ASSIST_4_text"), [
      opt("q:fed-base:assist-asb", "continue"),
    ]);
  } else if (r === "wing") {
    card(g, eventText("event_OVERRIDE_FEDERATION_BASE_ASSIST_3_text"), [
      opt("q:fed-base:assist-wing", "continue"),
    ]);
  } else if (r === "repair") {
    card(g, eventText("event_FEDERATION_BASE_ASSIST_1_text"), [
      opt("q:fed-base:assist-repair", "continue"),
    ]);
  } else {
    card(g, eventText("event_FEDERATION_BASE_ASSIST_1_text"), [
      opt("q:fed-base:assist", "continue"),
    ]);
  }
}

/** Template:Hidden federation base. Five results; the fifth is "Federation Base Assist". */
function arriveFedBase(g: Game) {
  const r = pick(g, ["schematic", "crew", "dock", "empty", "assist"] as const);
  if (r === "schematic") {
    // "You receive a drone schematic with high scrap." The schematic is not named: Rewards, "Drone": "A random drone schematic & T scrap."
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_1_text"), scrapOnly(g, "high"), [
      grantRandomItem(g, "drone"),
    ]);
  } else if (r === "crew") {
    // "You receive a crewmember and low scrap with resources." Race not named: INFERRED random.
    const joined = crew(g, randomRace(g));
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_2_text"), rollStandard(g, "low"), [
      joined,
    ]);
  } else if (r === "dock") {
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_3_text"), rollStandard(g, "medium"), [
      repair(g, 35),
    ]);
  } else if (r === "empty") {
    const choices: Choice[] = [opt("ack", "event_HIDDEN_FEDERATION_BASE_LIST_4_c1_choice")];
    // {{Blue Option|Improved Sensors|...|level=2}} / {{Blue Option|Advanced Sensors|...|level=3}} / Long-Ranged Scanners.
    // The same label is printed on each. A ship that meets more than one requirement can pick.
    if (sensors(g) >= 2)
      choices.push(opt("q:fed-base:scan-2", "event_HIDDEN_FEDERATION_BASE_LIST_4_c2_choice"));
    if (sensors(g) >= 3)
      choices.push(opt("q:fed-base:scan-3", "event_HIDDEN_FEDERATION_BASE_LIST_4_c3_choice"));
    if (g.augments.includes("ADV_SCANNERS"))
      choices.push(opt("q:fed-base:scan-glass", "event_HIDDEN_FEDERATION_BASE_LIST_4_c4_choice"));
    card(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_4_text"), choices);
  } else {
    arriveFedAssist(g);
  }
}

/** Builds the card for a quest beacon on arrival, or null when `b` holds no live quest. sim.ts eventFor calls this. */
export function questEvent(g: Game, b: Beacon): GameEvent | null {
  if (!b.quest || b.resolved) return null;
  // An arrival page is named arrive- plus the quest id. The sim still chose this beacon.
  if (b.quest !== RUWEN_ENTRY) {
    const packed = allEvents().find((ev) => ev.id === `arrive-${b.quest}`);
    if (packed) {
      g.event = {
        title: here(g)?.name ?? packed.dest,
        body: packed.body,
        choices: stampStockLabels(
          packed.choices.map((choice) => ({ id: choice.id, label: choice.label })),
        ),
      };
      g.phase = "event";
      g.paused = true;
      return g.event;
    }
    const archive = archiveQuestPage(g, b.quest);
    if (archive) {
      const choices = archive.choices.map((choice) => ({ id: choice.id, label: choice.label }));
      if (choices.length === 0) choices.push(opt("ack", "continue"));
      g.event = {
        title: here(g)?.name ?? archive.dest,
        body: archive.body,
        choices: stampStockLabels(choices),
      };
      g.phase = "event";
      g.paused = true;
      b.flag = archive.id;
      return g.event;
    }
  }
  switch (b.quest) {
    case "escort":
      arriveEscort(g);
      break;
    case "mantis-war-camp": {
      // Mantis war camp, "Quest Marker".
      const choices: Choice[] = [opt("q:war-camp:leave", "event_QUEST_MANTIS_INVASION_c1_choice")];
      // {{Blue Option|Missile Weapon|Bombard their key structures.}} [1 missile]
      if (hasMissileWeapon(g))
        choices.push(opt("q:war-camp:missile", "event_QUEST_MANTIS_INVASION_c2_choice"));
      // {{Blue Option|Fire Bomb|Teleport fire bombs into key structures.}} [2 missiles]. Fire Bomb is fitted as "BOMB_FIRE".
      if (g.player.weapons.some((w) => w.defId === "BOMB_FIRE"))
        choices.push(opt("q:war-camp:firebomb", "event_QUEST_MANTIS_INVASION_c3_choice"));
      card(g, eventText("event_QUEST_MANTIS_INVASION_text"), choices);
      break;
    }
    case "space-station":
      arriveStation(g);
      break;
    case "defector-cache":
      // Wiki citations:
      // > "Arriving at the specified coordinates, you find a sizable stash of useful materials." — [[Rebel defector#Quest Marker]]
      // > "You receive high resources with some scrap." — [[Rebel defector#Quest Marker]]
      // > "You arrive at location of the hoard, but discover that it was not quite as large as advertised." — [[Rebel defector#Quest Marker]]
      // > "You receive low scrap." — [[Rebel defector#Quest Marker]]
      // Rebel defector, "Quest Marker": two results.
      if (rand(g) < 0.5) {
        result(
          g,
          eventText("event_ALISON_DEFECTOR_QUEST_1_text"),
          rollSurrenderOffer(g, "high", true),
        );
      } else {
        result(g, eventText("event_ALISON_DEFECTOR_QUEST_2_text"), scrapOnly(g, "low"));
      }
      break;
    case "fed-base":
      arriveFedBase(g);
      break;
    case "thief-stash":
      // "You receive a weapon with high scrap." The weapon is not named: Rewards, "Weapon": "A random weapon & T scrap."
      result(g, eventText("event_MANTIS_NAMED_THIEF_STASH_text"), scrapOnly(g, "high"), [
        grantRandomItem(g, "weapon"),
      ]);
      break;
    case RUWEN_ENTRY:
      // Ancient device: the QUEST tag does not replace the card. eventFor falls through to that page.
      return null;
    default: {
      // @agent:quests-a. Quest-opener modules.
      const arrive = fromParts("arrive", b.quest);
      if (!arrive) return null;
      arrive(g, b);
    }
  }
  return g.event;
}

// ---------------------------------------------------------------------------------------------------------------
// Choices (routed by surrender.ts surrenderChoose, before citedChoose)
// ---------------------------------------------------------------------------------------------------------------

const DEFECTOR_FIGHT = "Rebel ship";

function defectorFight(g: Game, text: string) {
  pageFight(g, text, DEFECTOR_FIGHT, "rebel-defector");
}

/** Rebel Defector victories after the Federation loyalists fight: "Contact the Federation ship". */
function loyalistsRescueCard(g: Game) {
  const choices: Choice[] = [
    opt("q:loyalists:rescue", "event_REBEL_VS_FEDERATION_SAVED_LIST_2_c1_choice"),
  ];
  // {{Blue Option|Nano Med-bot Dispersal|...}} ("NANO_MEDBAY"), {{Blue Option|Teleporter|...}}, {{Blue Option|Healing Burst|...}}.
  if (g.augments.includes("NANO_MEDBAY"))
    choices.push(opt("q:loyalists:medbot", "event_REBEL_VS_FEDERATION_SAVED_LIST_2_c2_choice"));
  if (hasTeleporter(g))
    choices.push(opt("q:loyalists:teleport", "event_REBEL_VS_FEDERATION_SAVED_LIST_2_c3_choice"));
  if (g.player.weapons.some((w) => w.defId === "BOMB_HEAL"))
    choices.push(opt("q:loyalists:heal", "event_REBEL_VS_FEDERATION_SAVED_LIST_2_c4_choice"));
  card(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_2_text"), choices);
}

function thiefDyingCard(g: Game, scan: boolean) {
  const choices: Choice[] = [
    {
      id: "q:thief:mercy",
      label: scan
        ? eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c3_c1_choice")
        : eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c1_choice"),
    },
    {
      id: "q:thief:listen",
      label: scan
        ? eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c3_c2_choice")
        : eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c2_choice"),
    },
  ];
  // {{Blue Option|Adv. Medbay|...|level=2+}}, {{Blue Option|Adv. Clonebay|...|level=2+}}.
  if ((g.player.systems.medbay?.level ?? 0) >= 2) {
    choices.push({
      id: "q:thief:save",
      label: scan
        ? eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c3_c3_choice")
        : eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c3_choice"),
    });
  }
  if ((g.player.kits.clonebay?.level ?? 0) >= 2)
    choices.push(opt("q:thief:clone", "event_MANTIS_NAMED_THIEF_DEFEAT_c2_c4_choice"));
  card(
    g,
    scan
      ? eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c3_text")
      : eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_text"),
    choices,
  );
}

function engiVictory(g: Game, text = "", offer?: SurrenderOffer) {
  // Wiki citations:
  // > "Victory." — [[Engi fleet discussion#Final Quest Marker]]
  // > "The Engi emerge victorious from their battles with only minor losses. They message you, \"Project X-ME56 commissioned by Federation military research division. Advanced stealth cruiser. Project finished during rebellion. Unable to reconnect with Federation military command.\"" — [[Engi fleet discussion#Victory]]
  // > "Ask about the Mantis ships." — [[Engi fleet discussion#Victory]]
  const body = eventText("event_ENGI_UNLOCK_4_text");
  const choices = [opt("q:engi-victory:ask", "event_ENGI_UNLOCK_4_c1_choice")];
  if (offer) result(g, `${text}\n\n${body}`, offer, [], choices);
  else card(g, text ? `${text}\n\n${body}` : body, choices);
}

/** Deactivated Auto-ship, "Attempt to download the ship's data stores." Two results, no odds.
 *  INFERRED: equal. The sector map reveal is not wired. */
function deactivatedDownload(g: Game) {
  if (pick(g, ["data", "fight"] as const) === "fight") {
    pageFight(
      g,
      eventText("event_DOWNLOAD_DRONE_DATA_2_text"),
      "Auto-ship",
      "deactivated-auto-ship",
    );
    return;
  }
  result(g, eventText("event_DOWNLOAD_DRONE_DATA_1_text"), rollStandard(g, "low"));
}

/** Refueling platform dock. 3 damage to engines. `fires` is the ignite result's 1-2 fires. */
function refuelEngines(g: Game, fires: boolean) {
  hurtSystem(g.player, "engines", 3);
  if (!fires) return;
  const room = g.player.rooms.find((r) => r.system === "engines");
  if (!room) return;
  // The fire icon says 1-2 fires and prints no odds. INFERRED: the second flame is a coin flip.
  const n = 1 + (rand(g) < 0.5 ? 1 : 0);
  room.fire = Math.min(4, room.fire + n);
  log(g, n === 1 ? `1 fire in ${room.title}.` : `2 fires in ${room.title}.`);
}

/** The berth that is already a Pirate ship. 3 hull, 3 engine damage, then the default Pirate fight. No fires. */
function refuelAmbush(g: Game) {
  const text = eventText("event_FUELING_STATION_PIRATE_LIST_2_text");
  if (damageHull(g, 3)) {
    log(g, text);
    return;
  }
  refuelEngines(g, false);
  pageFight(g, text, "Pirate ship", "refueling-platform");
}

const REBEL_SUPPLY_NEXT = (): Choice[] => [
  opt("s:rebel-supply:steal", "ship_REBEL_HELPERS_SHIP_destroyed_c1_choice"),
  opt("s:rebel-supply:leave", "ship_REBEL_HELPERS_SHIP_destroyed_c2_choice"),
];

// Leave the civilians alone. Four printed sentences, no odds. INFERRED: equal.
const REBEL_SUPPLY_LEAVE = () => [
  eventText("text_REBEL_HELPER_NO_SUPPLIES_TEXT_1"),
  eventText("text_REBEL_HELPER_NO_SUPPLIES_TEXT_2"),
  eventText("text_REBEL_HELPER_NO_SUPPLIES_TEXT_3"),
  eventText("text_REBEL_HELPER_NO_SUPPLIES_TEXT_4"),
];

/**
 * "2 damage with a random effect (1-2 fires or a breach) to a random room."
 * INFERRED: every player room is equally likely, and that room's system takes the 2 damage when a bar is left.
 * The two effects are equally likely. The second flame is a coin flip, the same as Fire Bomb.
 */
function rebelSupplyRoom(g: Game): string {
  const rooms = g.player.rooms;
  if (!rooms.length) return "";
  const room = pick(g, rooms);
  const bits: string[] = [];
  const id = room.system;
  const sys = id ? g.player.systems[id] : undefined;
  if (id && sys && sys.level > 0 && sys.damage < sys.level) {
    const before = sys.damage;
    hurtSystem(g.player, id, 2);
    const applied = sys.damage - before;
    if (applied) bits.push(`${applied} damage to ${id}.`);
  }
  if (rand(g) < 0.5) {
    const n = 1 + (rand(g) < 0.5 ? 1 : 0);
    room.fire = Math.min(4, room.fire + n);
    bits.push(n === 1 ? `1 fire in ${room.title}.` : `2 fires in ${room.title}.`);
  } else {
    room.breach += 1;
    bits.push(`A breach opens in ${room.title}.`);
  }
  return bits.join(" ");
}

/** Steal the civilian supplies. Four printed results, no odds. INFERRED: equal. */
function rebelSupplySteal(g: Game) {
  const kind = pick(g, ["parts", "scrap", "trap", "plague"] as const);
  if (kind === "parts") {
    // Rewards, Drone parts: "T drone parts & T scrap." The event tooltip prints low as 1 drone part.
    const offer = scrapOnly(g, "low");
    offer.parts = 1;
    result(g, eventText("event_REBEL_HELPERS_SUPPLIES_1_text"), offer);
    return;
  }
  if (kind === "scrap") {
    result(g, eventText("event_REBEL_HELPERS_SUPPLIES_3_text"), scrapOnly(g, "low"));
    return;
  }
  if (kind === "trap") {
    const text = eventText("event_REBEL_HELPERS_SUPPLIES_4_text");
    if (damageHull(g, 2)) return;
    const room = rebelSupplyRoom(g);
    result(g, text, undefined, ["Hull damage: 2.", room].filter(Boolean));
    return;
  }
  result(g, eventText("event_REBEL_HELPERS_SUPPLIES_2_text"), undefined, ["Nothing happens."]);
}

function rebelSupplyLeave(g: Game) {
  result(g, pick(g, REBEL_SUPPLY_LEAVE()), undefined, ["Nothing happens."]);
}

/** Destroyed pays low scrap with resources. A crew kill pays medium. Then steal or leave. */
function rebelSupplyWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? eventText("ship_REBEL_HELPERS_SHIP_deadCrew_text")
    : eventText("ship_REBEL_HELPERS_SHIP_destroyed_text");
  result(g, text, rollStandard(g, deadCrew ? "medium" : "low"), [], REBEL_SUPPLY_NEXT());
}

const ZOLTAN_RAFT_NEXT = (): Choice[] => [
  opt("s:zoltan-raft:go", "ship_ZOLTAN_LIFERAFT_destroyed_c1_c1_choice"),
  opt("s:zoltan-raft:hire", "ship_ZOLTAN_LIFERAFT_destroyed_c1_c2_choice"),
];

/**
 * Zoltan retake the ship. Destroyed pays medium scrap with resources, then the hire.
 * A crew kill pays high scrap and an unnamed augmentation: Rewards, "Augment": "A random augmentation & T scrap."
 */
function zoltanRaftWin(g: Game, deadCrew: boolean) {
  if (deadCrew) {
    result(g, eventText("ship_ZOLTAN_LIFERAFT_deadCrew_text"), scrapOnly(g, "high"), [
      grantRandomItem(g, "augment"),
    ]);
    return;
  }
  result(
    g,
    eventText("ship_ZOLTAN_LIFERAFT_destroyed_text"),
    rollStandard(g, "medium"),
    [eventText("ship_ZOLTAN_LIFERAFT_destroyed_c1_text")],
    ZOLTAN_RAFT_NEXT(),
  );
}

/** Offer to hire him for 40 scrap. Two printed results, no odds. INFERRED: equal. */
function zoltanRaftHire(g: Game) {
  const cost = affordStock(g, "s:zoltan-raft:hire", "scrap");
  if (cost == null) return;
  if (pick(g, ["accept", "refuse"] as const) === "accept") {
    takeStock(g, "scrap", cost);
    const spent = scrapLine(cost);
    const joined = crew(g, "Zoltan");
    result(g, eventText("event_ZOLTAN_LIFERAFT_HIRE_2_text"), undefined, [spent, joined]);
    return;
  }
  result(g, eventText("event_ZOLTAN_LIFERAFT_HIRE_1_text"), undefined, ["Nothing happens."]);
}

/**
 * Slug hacker (doors), the hacking counter. Both endings pay high scrap with resources.
 * Continue does not set this, so a destroyed ship on that path stays medium.
 */
const doorsCounterWin = new WeakMap<Game, true>();

/**
 * Slug hacker (choice). All four fights share the event id, so the reward follows the choice.
 * Shields: destroyed medium, crew kill high. Oxygen: both medium. Weapons and the hacking counter: both high.
 */
const choiceWin = new WeakMap<Game, "shields" | "oxygen" | "weapons" | "hack">();

/**
 * Rebel ship attacking Crystal ship, "Attack the Rebel."
 * That path pays medium or high, then contact. Attacking the Crystalline ship does not set this,
 * so that fight stays on default rewards.
 */
const rebelCrystalBones = new WeakMap<Game, true>();

/** The dock offer is a scrap price. Scrap stock 5 on the button is only the floor. */
function refuelOffer(): boolean {
  return priceBand("refueling-platform", "offer")?.k === "scrap";
}

const CHOICES: Record<string, (g: Game) => void> = {
  // ---- Cited cards that open a quest branch ----
  // Slug comm tapping. "Ignore them." One printed result.
  "c:slug-comm-tapping:1": (g) => {
    // Wiki citations:
    // > "You have no interest in anything the Slugs could make business out of. Time to move on." — [[Slug comm tapping]]
    // > "Nothing happens." — [[Slug comm tapping]]
    result(g, eventText("event_QUEST_SLUG_PIRATE_TRAP_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian, "Contact the civilian ship." Template:Save the Civilian Ship.
  // Six results, no odds. The unnamed crewmember is not offered. INFERRED: the other five are equal.
  // The weapon is unnamed: Rewards, "Weapon": "A random weapon & T scrap."
  "q:lanius-civilian:contact": (g) => {
    const kind = weighted(g, [
      ["weapon", 1],
      ["repair", 1],
      ["medium", 1],
      ["low", 1],
      ["nothing", 1],
    ] as const);
    if (kind === "weapon") {
      result(g, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_4_text"), scrapOnly(g, "low"), [
        grantRandomItem(g, "weapon"),
      ]);
      return;
    }
    if (kind === "repair") {
      result(g, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_5_text"), undefined, [repair(g, 5)]);
      return;
    }
    if (kind === "medium") {
      result(g, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_2_text"), rollStandard(g, "medium"));
      return;
    }
    if (kind === "low") {
      result(g, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_3_text"), rollStandard(g, "low"));
      return;
    }
    result(g, eventText("event_SAVE_CIVILIAN_LIST_LANIUS_6_text"), undefined, ["Nothing happens."]);
  },
  // Crystal ship attacking Federation loyalists, "You contact the Federation ship."
  // Two results and no odds. INFERRED: equal.
  // The crewmember is unnamed and not granted. Low scrap with resources still is.
  // "a random amount of resources with some scrap" is Rewards, Stuff. The unnamed bonus item is not granted.
  "q:crystal-loyalists:contact": (g) => {
    if (
      weighted(g, [
        ["survivor", 1],
        ["materials", 1],
      ] as const) === "survivor"
    ) {
      result(g, eventText("event_CRYSTAL_FED_LIST_2_text"), rollStandard(g, "low"));
      return;
    }
    result(g, eventText("event_CRYSTAL_FED_LIST_1_text"), rollSurrenderOffer(g, undefined, true));
  },
  // Lanius ship attacking Rock, "Contact the Rockmen." Two results, no odds. INFERRED: equal.
  "q:lanius-rock:contact": (g) => {
    if (
      weighted(g, [
        ["scrap", 1],
        ["nothing", 1],
      ] as const) === "scrap"
    ) {
      result(g, eventText("event_LANIUS_ROCK_DISTRESS_END_2_text"), rollStandard(g, "medium"));
      return;
    }
    result(g, eventText("event_LANIUS_ROCK_DISTRESS_END_1_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Mantis, "Contact the Mantis." Two results, no odds. INFERRED: equal.
  // Rewards, Missiles: "T missiles & T scrap." The page tooltip prints medium as 2-4 missiles.
  "q:lanius-mantis:contact": (g) => {
    if (
      weighted(g, [
        ["missiles", 1],
        ["wreck", 1],
      ] as const) === "missiles"
    ) {
      const offer = scrapOnly(g, "medium");
      offer.missiles = between(g, resourceBand("missiles", "medium"));
      result(g, eventText("event_LANIUS_MANTIS_DISTRESS_END_1_text"), offer);
      return;
    }
    result(g, eventText("event_LANIUS_MANTIS_DISTRESS_END_2_text"), rollStandard(g, "medium"));
  },
  // Lanius ship attacking Slug, "Contact the Slugs." Two results, no odds. INFERRED: equal.
  "q:lanius-slug:contact": (g) => {
    if (
      weighted(g, [
        ["supplies", 1],
        ["nothing", 1],
      ] as const) === "supplies"
    ) {
      result(g, eventText("event_LANIUS_SLUG_DISTRESS_END_2_text"), rollStandard(g, "medium"));
      return;
    }
    result(g, eventText("event_LANIUS_SLUG_DISTRESS_END_1_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship in rich debris field. Improved Piloting level 2 and Advanced Piloting level 3.
  "c:lanius-ship-in-rich-debris-field:3": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, eventText("event_LANIUS_HARVESTER_c2_text"), rollStandard(g, "medium"));
  },
  "c:lanius-ship-in-rich-debris-field:4": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 3) return;
    result(g, eventText("event_LANIUS_HARVESTER_c3_text"), rollStandard(g, "high"));
  },
  // Investigate the debris. Three results, no odds. INFERRED: equal.
  "q:lanius-debris:investigate": (g) => {
    const kind = weighted(g, [
      ["high", 1],
      ["medium", 1],
      ["low", 1],
    ] as const);
    if (kind === "high") {
      result(g, eventText("event_LANIUS_HARVESTER_SHIP_LIST_3_text"), rollStandard(g, "high"));
      return;
    }
    if (kind === "medium") {
      result(g, eventText("event_LANIUS_HARVESTER_SHIP_LIST_2_text"), rollStandard(g, "medium"));
      return;
    }
    result(g, eventText("event_LANIUS_HARVESTER_SHIP_LIST_1_text"), rollStandard(g, "low"));
  },
  // Lanius ship salvager. "Attack the ship." One printed lead-in, then a Lanius ship fight.
  // The nested scoff attack prints "were doing". This choice prints "are doing".
  "c:lanius-ship-salvager:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_SOLO_SALVAGE_c1_text"),
      "Lanius ship",
      "lanius-ship-salvager",
    );
  },
  // Lanius ship salvager. "Leave them alone." One printed result.
  "c:lanius-ship-salvager:1": (g) => {
    result(g, eventText("event_LANIUS_SOLO_SALVAGE_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship salvager, {{Blue Option|Lanius Crew|Request some scrap.}}
  // Three results, no odds. INFERRED: equal. Medium scrap is scrap only, not scrap with resources.
  // The nested fight is default Lanius rewards: no PAGE_WINS row, so winCombat pays the default salvage.
  "c:lanius-ship-salvager:2": (g) => {
    if (!hasLanius(g)) return;
    const kind = weighted(g, [
      ["share", 1],
      ["scoff", 1],
      ["low", 1],
    ] as const);
    if (kind === "share") {
      result(g, eventText("event_LANIUS_SOLO_SALVAGE_LIST_1_text"), scrapOnly(g, "medium"));
      return;
    }
    if (kind === "scoff") {
      card(g, eventText("event_LANIUS_SOLO_SALVAGE_LIST_3_text"), [
        opt("q:lanius-salvager:attack", "event_LANIUS_SOLO_SALVAGE_LIST_3_c1_choice"),
        opt("q:lanius-salvager:leave", "event_LANIUS_SOLO_SALVAGE_LIST_3_c2_choice"),
      ]);
      return;
    }
    result(g, eventText("event_LANIUS_SOLO_SALVAGE_LIST_2_text"), undefined, ["Nothing happens."]);
  },
  "q:lanius-salvager:attack": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_SOLO_SALVAGE_LIST_3_c1_text"),
      "Lanius ship",
      "lanius-ship-salvager",
    );
  },
  "q:lanius-salvager:leave": (g) => {
    result(g, eventText("event_LANIUS_SOLO_SALVAGE_LIST_3_c2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // Lanius ship absorbing automated scout. Two inspect results, no odds. INFERRED: equal.
  // "a random amount of scrap". The page notes lowercase "low" is treated as RANDOM.
  // INFERRED: low, medium, and high scrap only are equal. The map reveal is not wired.
  // Auto-ship near sensor station. Sensors level 3. Two results, no odds. INFERRED: equal.
  // The map reveal is not wired. The fight uses the same destroyed reward.
  "c:auto-ship-near-sensor-station:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["fight", "map"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_AUTO_DEFENSE_MAP_SENSORS_2_text"),
        "Auto-ship",
        "auto-ship-near-sensor-station",
      );
      return;
    }
    result(g, eventText("event_AUTO_DEFENSE_MAP_SENSORS_1_text"));
  },
  // Crew Teleporter. The map reveal is not wired.
  // Auto-ship fight in plasma storm. Engines 3-5. Two results, no odds. INFERRED: equal.
  "c:auto-ship-fight-in-plasma-storm:1": (g) => {
    const level = g.player.systems.engines?.level ?? 0;
    if (level < 3 || level > 5) return;
    if (pick(g, ["lose", "fight"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_STORM_AUTO_ESCAPE_2_text"),
        "Auto-ship",
        "auto-ship-fight-in-plasma-storm",
      );
      return;
    }
    result(g, eventText("event_STORM_AUTO_ESCAPE_1_text"), undefined, ["Nothing happens."]);
  },
  // Improved Engines, level 6+. Always lose the ship.
  "c:auto-ship-fight-in-plasma-storm:2": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    result(g, eventText("event_STORM_AUTO_c3_text"), undefined, ["Nothing happens."]);
  },
  // Cloaking. Always lose the ship. The page prints no drone-part cost.
  "c:auto-ship-fight-in-plasma-storm:3": (g) => {
    if ((g.player.kits.cloaking?.level ?? 0) <= 0) return;
    result(g, eventText("event_STORM_AUTO_c4_text"), undefined, ["Nothing happens."]);
  },
  // Deactivated Auto-ship. Download, two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:1": (g) => {
    deactivatedDownload(g);
  },
  // Sensors level 3. Two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["safe", "standby"] as const) === "safe") {
      result(g, eventText("event_BROKEN_REBEL_DRONE_SENSORS_1_text"), rollStandard(g, "low"));
      return;
    }
    card(g, eventText("event_BROKEN_REBEL_DRONE_SENSORS_2_text"), [
      opt("q:deactivated-auto:yes", "event_BROKEN_REBEL_DRONE_SENSORS_2_c1_choice"),
      opt("q:deactivated-auto:no", "event_BROKEN_REBEL_DRONE_SENSORS_2_c2_choice"),
    ]);
  },
  // Standby "Yes." reuses the download's two results.
  "q:deactivated-auto:yes": (g) => {
    deactivatedDownload(g);
  },
  "q:deactivated-auto:no": (g) => {
    result(g, eventText("event_BROKEN_REBEL_DRONE_SENSORS_2_c2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // Rock ship in plasma storm. A living Rock crewmember. High standard. The map is not involved.
  "c:rock-ship-in-plasma-storm:2": (g) => {
    if (!hasRock(g)) return;
    result(g, eventText("event_NEBULA_ROCK_RACIST_c3_text"), rollStandard(g, "high"));
  },
  // Slug drink. Two results, no odds. INFERRED: equal.
  "c:slug-drink:1": (g) => {
    slugDrink(g, false);
  },
  // {{Blue Option|Rock Crew|Have your Rockman pose as captain.}} A dead Rock does not count.
  "c:slug-drink:2": (g) => {
    if (!hasRock(g)) return;
    slugDrink(g, true);
  },
  // Zoltan quest primitives. "Leave." One printed result.
  "c:zoltan-quest-primitives:2": (g) => {
    // Wiki citations:
    // > "You don't want to alert the Rebels of your presence and you don't want to anger the Zoltan in their territory. The best solution is to leave." — [[Zoltan quest primitives]]
    // > "Nothing happens." — [[Zoltan quest primitives]]
    result(g, eventText("event_ZOLTAN_QUEST_PRIMITIVES_c1_c3_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // Escort civilians FTL haywire. "Decline." One printed result. No quest marker.
  "c:escort-civilians-ftl-haywire:1": (g) => {
    result(g, eventText("event_ESCORT_BEACON_c2_text"), undefined, ["Nothing happens."]);
  },
  // Escort civilians FTL haywire. Advanced FTL Navigation. High scrap with resources. No quest marker.
  "c:escort-civilians-ftl-haywire:2": (g) => {
    if (!g.augments.includes("FTL_JUMPER")) return;
    result(g, eventText("event_ESCORT_BEACON_c3_text"), rollStandard(g, "high"));
  },
  // Auto-ship warning has no choice. Arrival calls this id.
  // One printed lead-in, then "Fight an Auto-ship that is running away." Escape stays the 40 second pursuit row.
  "c:auto-ship-warning:0": (g) => {
    pageFight(
      g,
      eventText("ship_REBEL_AUTO_WARNING_escape_text"),
      "Auto-ship",
      "auto-ship-warning",
    );
  },
  // Pirate briber. Low scrap with resources. The static tier note does not pay the resources.
  "c:pirate-briber:0": (g) => {
    result(g, eventText("event_PIRATE_BRIBER_c1_text"), rollStandard(g, "low"));
  },
  // Pirate briber. "Try to be a hero. Attack the pirate." One printed lead-in, then a Pirate ship fight.
  "c:pirate-briber:1": (g) => {
    pageFight(g, eventText("event_PIRATE_BRIBER_c2_text"), "Pirate ship", "pirate-briber");
  },
  // Engi distress Rebel fight. {{SurrenderEscape(alt)|no}}: never runs away, never surrenders.
  "c:engi-distress-rebel-fight:0": (g) => {
    pageFight(
      g,
      eventText("event_DISTRESS_ENGI_REBEL_text"),
      "Rebel Ship",
      "engi-distress-rebel-fight",
      { ...NEVER_RUN },
    );
  },
  // Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is a random one (engiDistressGift).
  "q:engi-distress:scrap": (g) => {
    engiDistressGift(g);
  },
  "q:engi-distress:supplies": (g) => {
    const id = "q:engi-distress:supplies";
    const scrap = affordStock(g, id, "scrap");
    const missiles = affordStock(g, id, "missiles");
    const fuel = affordStock(g, id, "fuel");
    if (scrap == null || missiles == null || fuel == null) return;
    takeStock(g, "scrap", scrap);
    takeStock(g, "missiles", missiles);
    takeStock(g, "fuel", fuel);
    const spentScrap = scrapLine(scrap);
    const spentMissiles = missileLine(missiles);
    const spentFuel = fuelLine(fuel);
    result(g, eventText("event_DISTRESS_ENGI_REBEL_LIST2_text"), undefined, [
      grantAug(g, "NANO_MEDBAY"),
      spentScrap,
      spentMissiles,
      spentFuel,
    ]);
  },
  "q:engi-distress:nothing": (g) => {
    result(g, eventText("event_DISTRESS_ENGI_REBEL_RESULT_c3_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // Pirate smuggler. Weapon Control level 6+. Medium fuel (2-4) and medium scrap.
  "c:pirate-smuggler:2": (g) => {
    // Wiki citations:
    // > "(Weapons) Activate your advanced weapons threateningly." — [[Pirate smuggler]]
    // > "They hail you, \"There's no need for aggression... Perhaps this would convince you to look the other way?\"" — [[Pirate smuggler]]
    // > "Take their bribe." — [[Pirate smuggler]]
    // > "Ignore their bribe and attack." — [[Pirate smuggler]]
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    card(g, eventText("event_NEBULA_PIRATE_SMUGGLE_c3_text"), [
      opt("q:pirate-smuggler:bribe", "event_NEBULA_PIRATE_SMUGGLE_c3_c1_choice"),
      opt("q:pirate-smuggler:attack", "event_NEBULA_PIRATE_SMUGGLE_c3_c2_choice"),
    ]);
  },
  "q:pirate-smuggler:bribe": (g) => {
    // Wiki citations:
    // > "Take their bribe." — [[Pirate smuggler]]
    // > "You receive medium fuel and scrap." — [[Pirate smuggler]]
    const offer = scrapOnly(g, "medium");
    offer.fuel = rollFuel("q:pirate-smuggler:bribe", (lo, hi) => between(g, [lo, hi]));
    result(g, "", offer);
  },
  "q:pirate-smuggler:attack": (g) => {
    // Wiki citations:
    // > "Ignore their bribe and attack." — [[Pirate smuggler]]
    // > "You power up your weapons and move in to engage." — [[Pirate smuggler]]
    // > "Fight the pirate ship." — [[Pirate smuggler]]
    pageFight(
      g,
      eventText("event_NEBULA_PIRATE_SMUGGLE_c1_text"),
      "Pirate ship",
      "pirate-smuggler",
    );
  },
  // Pirate ship attacking Crystal. Template:Crystal Ship Saved. The Crystal weapon is not named.
  "q:crystal-pirate:contact": (g) => crystalContact(g),
  // Pirate ship selling drones. Hail opens the dock, the slug warning, and the hacking toll.
  "q:pirate-drones:hail": (g) => {
    card(g, eventText("event_CONTACT_PIRATE_SALESMAN_text"), [
      opt("q:pirate-drones:dock", "event_CONTACT_PIRATE_SALESMAN_c1_choice"),
      opt("q:pirate-drones:leave", "event_CONTACT_PIRATE_SALESMAN_c2_choice"),
      opt("q:pirate-drones:slug", "event_CONTACT_PIRATE_SALESMAN_c3_choice"),
      opt("q:pirate-drones:hack", "event_CONTACT_PIRATE_SALESMAN_c4_choice"),
    ]);
  },
  // Slug blue: "Same as the first option." That option is Dock.
  "q:pirate-drones:slug": (g) => {
    if (!hasSlug(g)) return;
    pirateDroneDock(g);
  },
  "q:pirate-drones:dock": (g) => pirateDroneDock(g),
  "q:pirate-drones:leave": (g) => {
    pageFight(
      g,
      eventText("event_CONTACT_PIRATE_SALESMAN_c2_text"),
      "Pirate ship",
      "pirate-ship-selling-drones",
    );
  },
  "q:pirate-drones:hack": (g) => {
    if ((g.player.kits.hacking?.level ?? 0) <= 0) return;
    result(g, eventText("event_CONTACT_PIRATE_SALESMAN_c4_text"), scrapOnly(g, "low"));
  },
  "q:pirate-drones:nothing": (g) => pirateDroneNothing(g),
  // Three sibling results and no odds. INFERRED: equal. The system must already be installed.
  "q:pirate-drones:upgrade": (g) => pirateDroneUpgrade(g),
  // Rebel checkpoint. Four contact results, no odds. INFERRED: equal.
  "q:rebel-checkpoint:contact": (g) => rebelCheckpointContact(g),
  // Pirate ships in plasma storm. Fuel cargo. The pirate escape row is already 50% at 20-40% hull.
  // "never surrenders" is NO_SURRENDER_EVENTS. The page prints no escape timer.
  "c:pirate-ships-in-plasma-storm:0": (g) => {
    // Wiki citations:
    // > "Secure the fuel supply." — [[Pirate ships in plasma storm]]
    // > "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!" — [[Pirate ships in plasma storm]]
    pageFight(
      g,
      eventText("event_STORM_ZOLTAN_SUPPLY_CHOICE_c1_text"),
      "Pirate ship",
      "pirate-ships-in-plasma-storm",
    );
  },
  // Ammunition cargo. A second fight slug so the missile table is not the fuel table.
  "c:pirate-ships-in-plasma-storm:1": (g) => {
    // Wiki citations:
    // > "Secure the ammunition." — [[Pirate ships in plasma storm]]
    // > "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!" — [[Pirate ships in plasma storm]]
    pageFight(
      g,
      eventText("event_STORM_ZOLTAN_SUPPLY_CHOICE_c2_text"),
      "Pirate ship",
      "pirate-ships-in-plasma-storm-ammo",
    );
  },
  // Pirate ships in plasma storm. "Let them leave." One printed result.
  "c:pirate-ships-in-plasma-storm:2": (g) => {
    // Wiki citations:
    // > "Let them leave." — [[Pirate ships in plasma storm]]
    // > "Sometimes discretion is the better part of valor." — [[Pirate ships in plasma storm]]
    // > "Nothing happens." — [[Pirate ships in plasma storm]]
    result(g, eventText("event_STORM_ZOLTAN_SUPPLY_CHOICE_c3_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  "q:pirate-briber:gone": (g) => {
    pirateGone(g);
  },
  "q:pirate-briber:salvage": (g) => {
    result(g, eventText("event_PIRATE_BRIBER_WIN_1_c1_text"), rollStandard(g, "low"));
  },
  // No effect in The Last Stand.
  "q:pirate-briber:delay": (g) => {
    if (g.sector === 8 || g.sectorId === "FINAL") {
      result(g, eventText("event_PIRATE_BRIBER_WIN_1_c2_text"), undefined, [
        "No effect in The Last Stand.",
      ]);
      return;
    }
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, eventText("event_PIRATE_BRIBER_WIN_1_c2_text"), undefined, [
      "The Rebel Fleet is delayed for 1 turn.",
    ]);
  },
  // Rebel fight choice in nebula. Conceal lists three results and prints no odds. INFERRED: equal.
  // Caught opens Prepare to fight, or Engines 4+. Chase doubles pursuit for 1 jump (citedChoose `faster`: one extra step).
  "c:rebel-fight-choice-in-nebula:1": (g) => {
    // Wiki citations:
    // > "Attempt to remain concealed." — [[Rebel fight choice in nebula]]
    // > "You immediately slip further into the clouds, but not quickly enough. The rebel catches sight of you and moves in to engage!" — [[Rebel fight choice in nebula]]
    // > "Prepare to fight." — [[Rebel fight choice in nebula]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight choice in nebula]]
    // > "The ship spots you and gives chase. After some quick maneuvering you were able to lose your pursuers in the clouds. You expect they warned the fleet of your position, however." — [[Rebel fight choice in nebula]]
    // > "Rebel Fleet pursuit is doubled for 1 jump." — [[Rebel fight choice in nebula]]
    // > "You power down non-essential systems and slip into the cloud. The ship never noticed you." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
    const r = pick(g, ["caught", "chase", "hidden"] as const);
    if (r === "caught") {
      card(g, eventText("event_NEBULA_REBEL_UNDETECTED_LIST_1_text"), [
        opt("q:rebel-nebula:fight", "event_NEBULA_REBEL_UNDETECTED_LIST_1_c1_choice"),
        opt("q:rebel-nebula:engines", "event_NEBULA_REBEL_UNDETECTED_LIST_1_c2_choice"),
      ]);
      return;
    }
    if (r === "chase") {
      g.fleet += 1;
      result(g, eventText("event_NEBULA_REBEL_UNDETECTED_LIST_3_text"), undefined, [
        "Rebel Fleet pursuit is doubled for 1 jump.",
      ]);
      return;
    }
    result(g, eventText("event_NEBULA_REBEL_UNDETECTED_LIST_2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  "q:rebel-nebula:fight": (g) => {
    pageFight(g, "", "Rebel ship", "rebel-fight-choice-in-nebula");
  },
  // Engines level 4+. The page prints no percent.
  "q:rebel-nebula:engines": (g) => {
    // Wiki citations:
    // > "(Engines) Fully power the engines to out-run them." — [[Rebel fight choice in nebula]]
    // > "Your powerful engines allow you to out-distance the ship and eventually lose it within the nebula." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
    if ((g.player.systems.engines?.level ?? 0) < 4) return;
    result(g, eventText("event_NEBULA_REBEL_UNDETECTED_LIST_1_c2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // Cloaking. Nothing happens.
  "c:rebel-fight-choice-in-nebula:2": (g) => {
    // Wiki citations:
    // > "(Cloaking) Cloak to stay hidden." — [[Rebel fight choice in nebula]]
    // > "You use your cloaking system to slip further into the nebula undetected." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
    if ((g.player.kits.cloaking?.level ?? 0) <= 0) return;
    result(g, eventText("event_NEBULA_REBEL_UNDETECTED_c3_text"), undefined, ["Nothing happens."]);
  },
  // Mantis fight choice. Conceal: {{DuplicateEvent|2}} on the fight, once on nothing.
  // The printed OR is the two fight sentences. INFERRED: those two are equal inside the doubled result.
  "c:mantis-fight-choice:1": (g) => {
    // Wiki citations:
    // > "Attempt to remain concealed." — [[Mantis fight choice]]
    // > "You power down non-essential systems in an attempt to remain unnoticed. It looks like they are about to leave when suddenly they turn and set course toward you, weapons powered." — [[Mantis fight choice]]
    // > "Before you have a chance to slink away the Mantis ship notices you and powers up their weapons." — [[Mantis fight choice]]
    // > "You power down non-essential systems and wait for the FTL drive to charge. They either don't want to fight or have failed to notice your ship, the latter being more likely." — [[Mantis fight choice]]
    // > "Nothing happens." — [[Mantis fight choice]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice]]
    const spotted = weighted(g, [
      [true, 2],
      [false, 1],
    ] as [boolean, number][]);
    if (!spotted) {
      result(g, eventText("event_MANTIS_FIGHT_CHOICE_AVOID_1_text"), undefined, [
        "Nothing happens.",
      ]);
      return;
    }
    const line = pick(g, [
      eventText("event_MANTIS_FIGHT_CHOICE_AVOID_3_text"),
      eventText("event_MANTIS_FIGHT_CHOICE_AVOID_2_text"),
    ] as const);
    pageFight(g, line, "Mantis ship", "mantis-fight-choice");
  },
  // Cloaking. {{DuplicateEvent|2}} on nothing, once on the fight.
  // The printed OR is the two nothing sentences. INFERRED: those two are equal inside the doubled result.
  "c:mantis-fight-choice:2": (g) => {
    // Wiki citations:
    // > "(Cloaking) Cloak to stay hidden." — [[Mantis fight choice]]
    // > "You cloak and shut down non-essential systems. In a short time the Mantis ship jumps away, no doubt in search of prey." — [[Mantis fight choice]]
    // > "You quickly cloak the ship and move out of immediate scanning range. You appear to have gotten away undetected." — [[Mantis fight choice]]
    // > "Nothing happens." — [[Mantis fight choice]]
    // > "You quickly cloak the ship, but not quickly enough. They spot you and move in to engage." — [[Mantis fight choice]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice]]
    if ((g.player.kits.cloaking?.level ?? 0) <= 0) return;
    const away = weighted(g, [
      [true, 2],
      [false, 1],
    ] as [boolean, number][]);
    if (away) {
      const line = pick(g, [
        eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_2_text"),
        eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_1_text"),
      ] as const);
      result(g, line, undefined, ["Nothing happens."]);
      return;
    }
    pageFight(
      g,
      eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_3_text"),
      "Mantis ship",
      "mantis-fight-choice",
    );
  },
  // Pirate ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian:0": (g) => {
    pageFight(
      g,
      eventText("event_PIRATE_CIVILIAN_c1_text"),
      "Pirate ship",
      "pirate-ship-attacking-civilian",
    );
  },
  // Pirate ship attacking civilian. "Stay out of it." One printed result.
  "c:pirate-ship-attacking-civilian:1": (g) => {
    result(g, eventText("event_PIRATE_CIVILIAN_c2_text"), undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking civilian distress. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian-distress:0": (g) => {
    pageFight(
      g,
      eventText("event_PIRATE_CIVILIAN_c1_text"),
      "Pirate ship",
      "pirate-ship-attacking-civilian-distress",
    );
  },
  // Pirate ship attacking civilian distress. The distress page's stay-out line.
  "c:pirate-ship-attacking-civilian-distress:1": (g) => {
    result(g, eventText("event_PIRATE_CIVILIAN_BEACON_c2_text"), undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking civilian (Lanius). "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian-lanius:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_PIRATE_CIVILIAN_c1_text"),
      "Pirate ship",
      "pirate-ship-attacking-civilian-lanius",
    );
  },
  // Pirate ship attacking civilian (Lanius). "Avoid the conflict." One printed result.
  "c:pirate-ship-attacking-civilian-lanius:1": (g) => {
    result(g, eventText("event_LANIUS_CIVILIAN_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-civilian:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_CIVILIAN_c1_text"),
      "Lanius ship",
      "lanius-ship-attacking-civilian",
    );
  },
  // Lanius ship attacking civilian. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian:1": (g) => {
    result(g, eventText("event_LANIUS_CIVILIAN_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian distress. "Fight the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-civilian-distress:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_DISTRESS_FIGHT_c1_text"),
      "Lanius ship",
      "lanius-ship-attacking-civilian-distress",
    );
  },
  // The Mercenary. "Fight the ship." One printed lead-in, then a Pirate ship fight.
  "c:the-mercenary:1": (g) => {
    pageFight(g, eventText("event_MERCENARY_c3_text"), "Pirate ship", "the-mercenary");
  },
  // Pirate toll. "Reject their offer." One printed lead-in, then a Pirate ship fight.
  "c:pirate-toll:1": (g) => {
    pageFight(g, eventText("event_PIRATE_CHOICE_c2_text"), "Pirate ship", "pirate-toll");
  },
  // Lanius ship attacking Rock. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-rock:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_ROCK_DISTRESS_c1_text"),
      "Lanius ship",
      "lanius-ship-attacking-rock",
    );
  },
  // Lanius ship attacking Rock. "Leave the Rockmen to their fate." One printed result.
  "c:lanius-ship-attacking-rock:1": (g) => {
    result(g, eventText("event_LANIUS_ROCK_DISTRESS_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship absorbing automated scout. "Leave them alone." One printed result. Do not inspect the scout.
  "c:lanius-ship-absorbing-automated-scout:1": (g) => {
    result(g, eventText("event_LANIUS_AUTO_REBEL_c2_text"), undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking Crystal. "Ignore them." One printed result.
  "c:mantis-ship-attacking-crystal:1": (g) => {
    result(g, eventText("event_CRYSTAL_MANTIS_CRYSTAL_c2_text"), undefined, ["Nothing happens."]);
  },
  // Mantis ship with Rock body parts. "Ignore them." One printed result.
  "c:mantis-ship-with-rock-body-parts:1": (g) => {
    // Wiki citations:
    // > "Ignore them." — [[Mantis ship with Rock body parts]]
    // > "The Mantis take no interest in your ship - they're lying in wait for the next Rock ship to venture through. You're able to spin up the engines and jump at your leisure." — [[Mantis ship with Rock body parts]]
    // > "Nothing happens." — [[Mantis ship with Rock body parts]]
    result(g, eventText("event_ROCK_MANTIS_HUNTER_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius lone ship. "Stay out of it." One printed result.
  "c:lanius-lone-ship:1": (g) => {
    result(g, eventText("event_LANIUS_SCARED_CIVILIAN_c2_text"), undefined, ["Nothing happens."]);
  },
  // Crystal fight choice. "Leave them alone." One printed result.
  "c:crystal-fight-choice:1": (g) => {
    // Wiki citations:
    // > "Leave them alone." — [[Crystal fight choice]]
    // > "It's best to take advantage of the rare occasions when the Rebels aren't shooting at you. You prepare to jump." — [[Crystal fight choice]]
    // > "Nothing happens." — [[Crystal fight choice]]
    result(g, eventText("event_CRYSTAL_REBEL_CRYSTAL2_c2_text"), undefined, ["Nothing happens."]);
  },
  // Destroyed cargo ship. "Leave it alone, this looks suspicious." One printed result.
  "c:destroyed-cargo-ship:1": (g) => {
    // Wiki citations:
    // > "You leave the cargo alone and prepare to jump." — [[Destroyed cargo ship]]
    // > "Nothing happens." — [[Destroyed cargo ship]]
    result(g, eventText("event_FLOATING_CARGO_c2_text"), undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking Crystal. "Ignore them." One printed result.
  "c:pirate-ship-attacking-crystal:1": (g) => {
    // Wiki citations:
    // > "Ignore them." — [[Pirate ship attacking Crystal]]
    // > "You assume the Crystalline ship can handle itself. You have enough of your own problems." — [[Pirate ship attacking Crystal]]
    // > "Nothing happens." — [[Pirate ship attacking Crystal]]
    result(g, eventText("event_CRYSTAL_PIRATE_CRYSTAL_c2_text"), undefined, ["Nothing happens."]);
  },
  // Escort civilians. "Decline." One printed result.
  "c:escort-civilians:1": (g) => {
    result(g, eventText("event_QUEST_ESCORT_c2_text"), undefined, ["Nothing happens."]);
  },
  // Remote settlement. "Ignore them." One printed result.
  "c:remote-settlement:1": (g) => {
    result(g, eventText("event_PIRATE_STATION_CROPS_c2_text"), undefined, ["Nothing happens."]);
  },
  // Pirate smuggler. "Ignore the ship." One printed result.
  "c:pirate-smuggler:1": (g) => {
    result(g, eventText("event_NEBULA_PIRATE_SMUGGLE_c2_text"), undefined, ["Nothing happens."]);
  },
  // Refueling platform garbled broadcast. "Ignore the platform." One printed result.
  "c:refueling-platform-garbled-broadcast:1": (g) => {
    result(g, eventText("event_LANIUS_FUELING_STATION_c3_text"), undefined, ["Nothing happens."]);
  },
  // Refueling platform garbled broadcast. "Dock with the platform." The berth, then signal or the blast doors.
  "c:refueling-platform-garbled-broadcast:2": (g) => {
    card(g, eventText("event_LANIUS_FUELING_STATION_c2_text"), [
      opt("s:garbled-dock:signal", "event_LANIUS_FUELING_STATION_c2_c1_choice"),
      opt("s:garbled-dock:doors", "event_LANIUS_FUELING_STATION_c2_c2_choice"),
    ]);
  },
  // "Signal for a refuel." Three results, no odds and no DuplicateEvent. INFERRED: equal, one of three.
  "s:garbled-dock:signal": (g) => {
    const kind = pick(g, ["abandoned", "trap", "breach"] as const);
    if (kind === "abandoned") {
      const n = rollFuel("s:garbled-dock:signal", (lo, hi) => between(g, [lo, hi]));
      g.fuel += n;
      card(
        g,
        `${eventText("event_LANIUS_FUELING_STATION_LIST_3_text")}

Fuel: ${n}.`,
        [
          opt("s:garbled-dock:continue", "continue"),
          opt("s:garbled-dock:sensors2", "event_LANIUS_FUELING_STATION_LIST_3_c2_choice"),
          opt("s:garbled-dock:sensors3", "event_LANIUS_FUELING_STATION_LIST_3_c3_choice"),
        ],
      );
      return;
    }
    if (kind === "trap") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 3);
      pageFight(
        g,
        eventText("event_LANIUS_FUELING_STATION_LIST_2_text"),
        "Lanius ship",
        "refueling-platform-garbled-broadcast",
      );
      return;
    }
    // A breach in one room. INFERRED: every player room is equally likely. The page prints no system damage.
    const rooms = g.player.rooms;
    const hit = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
    if (hit) hit.breach += 1;
    pageFight(
      g,
      eventText("event_LANIUS_FUELING_STATION_LIST_1_text"),
      "Lanius ship",
      "refueling-platform-garbled-broadcast",
    );
    const land = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
    const hp = crewDef("anaerobic").hp;
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Lanius",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room: land?.id ?? "p-medbay",
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "anaerobic",
    });
    log(g, "1 lanius boarder beams aboard your ship.");
  },
  // Blast Doors, level 2+. questChoose already skips this when the requirement fails.
  "s:garbled-dock:doors": (g) => {
    if ((g.player.systems.doors?.level ?? 0) < 2) return;
    g.fuel += rollFuel("s:garbled-dock:doors", (lo, hi) => between(g, [lo, hi]));
    result(g, eventText("event_LANIUS_FUELING_STATION_c2_c2_text"), undefined, ["Fuel: 5."]);
  },
  // Abandoned follow-up. The page prints no italic before this line.
  "s:garbled-dock:continue": (g) => {
    result(g, "Nothing happens.");
  },
  // Improved Sensors, level 2. The button stays on the abandoned card. questChoose skips a ship that is short.
  "s:garbled-dock:sensors2": (g) => {
    if (sensors(g) < 2) return;
    const n = rollFuel("s:garbled-dock:sensors2", (lo, hi) => between(g, [lo, hi]));
    g.fuel += n;
    result(g, eventText("event_LANIUS_FUELING_STATION_LIST_3_c2_text"), undefined, [`Fuel: ${n}.`]);
  },
  // Advanced Sensors, level 3. Same label as the level-2 scan. A level-3 ship may take either; neither is picked for it.
  "s:garbled-dock:sensors3": (g) => {
    if (sensors(g) < 3) return;
    const fuel = rollFuel("s:garbled-dock:sensors3", (lo, hi) => between(g, [lo, hi]));
    const parts = rollBand("refueling-platform-garbled-broadcast", "sensors3", "parts", (lo, hi) =>
      between(g, [lo, hi]),
    );
    g.fuel += fuel;
    if (parts != null) g.player.parts += parts;
    result(
      g,
      eventText("event_LANIUS_FUELING_STATION_LIST_3_c3_text"),
      undefined,
      [`Fuel: ${fuel}.`, parts != null ? `Drone parts: ${parts}.` : ""].filter(Boolean),
    );
  },
  // Refueling platform. "Ignore the refueling platform."
  // {{DuplicateEvent|2}} is Nothing happens, then one printed pirate-bait fight.
  // INFERRED: those three printed slots are weights 2 and 1. Nothing has no italic.
  // This handler returns before citedChoose, so the choice fx does not also start a fight.
  "c:refueling-platform:1": (g) => {
    const r = weighted(g, [
      ["nothing", 2],
      ["fight", 1],
    ] as const);
    if (r === "nothing") {
      result(g, "Nothing happens.");
      return;
    }
    pageFight(
      g,
      eventText("event_FUELING_STATION_IGNORE_1_text"),
      "Pirate ship",
      "refueling-platform",
    );
  },
  // Refueling platform. "Dock with the refueling platform." Five printed results and no odds.
  // INFERRED: equal, one of five. The offer's packed scrap price is rolled on accept.
  "c:refueling-platform:0": (g) => {
    const kind = pick(g, ["offer", "steal", "ignite", "staff", "ambush"] as const);
    if (kind === "offer") {
      const choices = [
        opt("s:refuel-dock:reject", "event_FUELING_STATION_NORMAL_LIST_1_c2_choice"),
      ];
      if (refuelOffer()) {
        choices.unshift(
          opt("s:refuel-dock:accept", "event_FUELING_STATION_NORMAL_LIST_1_c1_choice"),
        );
      }
      card(g, eventText("event_FUELING_STATION_NORMAL_LIST_1_text"), choices);
      return;
    }
    if (kind === "steal") {
      card(g, eventText("event_FUELING_STATION_NORMAL_LIST_2_text"), [
        opt("s:refuel-dock:steal", "event_FUELING_STATION_NORMAL_LIST_2_c1_choice"),
        opt("s:refuel-dock:values", "event_FUELING_STATION_NORMAL_LIST_2_c2_choice"),
      ]);
      return;
    }
    if (kind === "ignite") {
      card(g, eventText("event_FUELING_STATION_NORMAL_LIST_3_text"), [
        opt("s:refuel-dock:quick", "event_FUELING_STATION_NORMAL_LIST_3_c1_choice"),
        opt("s:refuel-dock:berth", "event_FUELING_STATION_NORMAL_LIST_3_c2_choice"),
      ]);
      return;
    }
    if (kind === "staff") {
      card(g, eventText("event_FUELING_STATION_PIRATE_LIST_1_text"), [
        opt("s:refuel-dock:wait", "event_FUELING_STATION_PIRATE_LIST_1_c1_choice"),
        opt("s:refuel-dock:doors", "event_FUELING_STATION_PIRATE_LIST_1_c2_choice"),
      ]);
      return;
    }
    refuelAmbush(g);
  },
  "s:refuel-dock:accept": (g) => {
    if (!refuelOffer()) return;
    const n = rollPrice("FUELING_STATION", "offer", (lo, hi) => between(g, [lo, hi]));
    if (n == null || g.scrap < n) return;
    g.scrap -= n;
    const fuel = rollFuel("s:refuel-dock:accept", (lo, hi) => between(g, [lo, hi]));
    g.fuel += fuel;
    result(g, "", undefined, [`Scrap: -${n}.`, `Fuel: ${fuel}.`]);
  },
  "s:refuel-dock:reject": (g) => {
    result(g, "Nothing happens.");
  },
  "s:refuel-dock:steal": (g) => {
    const n = rollFuel("s:refuel-dock:steal", (lo, hi) => between(g, [lo, hi]));
    g.fuel += n;
    result(g, eventText("event_FUELING_STATION_NORMAL_LIST_2_c1_text"), undefined, [`Fuel: ${n}.`]);
  },
  "s:refuel-dock:values": (g) => {
    result(g, "Nothing happens.");
  },
  // Quickly dock. Two printed results and no odds. INFERRED: equal.
  "s:refuel-dock:quick": (g) => {
    if (pick(g, ["safe", "boom"] as const) === "safe") {
      g.fuel += rollFuel("s:refuel-dock:quick", (lo, hi) => between(g, [lo, hi]));
      result(g, eventText("event_FUELING_STATION_BLOW_1_text"), undefined, ["Fuel: 5."]);
      return;
    }
    const text = eventText("event_FUELING_STATION_BLOW_2_text");
    if (damageHull(g, 3)) return;
    refuelEngines(g, true);
    // The page says lose 3 fuel. INFERRED: fuel does not go below zero.
    const lost = Math.min(g.fuel, 3);
    g.fuel -= lost;
    result(g, text, undefined, [`Fuel: -${lost}.`]);
  },
  "s:refuel-dock:berth": (g) => {
    result(g, eventText("event_FUELING_STATION_NORMAL_LIST_3_c2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  "s:refuel-dock:wait": (g) => {
    const text = eventText("event_FUELING_STATION_PIRATE_LIST_1_c1_text");
    if (damageHull(g, 3)) return;
    hurtSystem(g.player, "engines", 3);
    // "2-4 boarders". The race is not named. INFERRED: human, the same as the pirate burst on Abandoned station.
    humanBoarders(g, 2, 4, "boarders beam aboard your ship.");
    beginBoarding(g);
    showEventLines(g, [text]);
  },
  "s:refuel-dock:doors": (g) => {
    if ((g.player.systems.doors?.level ?? 0) < 2) return;
    g.fuel += rollFuel("s:refuel-dock:doors", (lo, hi) => between(g, [lo, hi]));
    result(g, eventText("event_FUELING_STATION_PIRATE_LIST_1_c2_text"), undefined, ["Fuel: 5."]);
  },
  // Rebel ship supplying civilians. "Leave them be." One printed result.
  "c:rebel-ship-supplying-civilians:1": (g) => {
    result(g, "Nothing happens.");
  },
  // "Wait and steal the supplies from the civilians." The same four results as the post-fight steal.
  "c:rebel-ship-supplying-civilians:2": (g) => {
    rebelSupplySteal(g);
  },
  "s:rebel-supply:steal": (g) => {
    rebelSupplySteal(g);
  },
  "s:rebel-supply:leave": (g) => {
    rebelSupplyLeave(g);
  },
  "s:zoltan-raft:go": (g) => {
    result(g, "Nothing happens.");
  },
  "s:zoltan-raft:hire": (g) => {
    zoltanRaftHire(g);
  },
  // Zoltan ship asks to dock. "Have them keep their distance." One printed result.
  "c:zoltan-ship-asks-to-dock:1": (g) => {
    // Wiki citations:
    // > "They leave without a word." — [[Zoltan ship asks to dock]]
    // > "Nothing happens." — [[Zoltan ship asks to dock]]
    result(g, eventText("event_ZOLTAN_SCIENCE_DOCK_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Mantis. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-mantis:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_MANTIS_DISTRESS_c1_text"),
      "Lanius ship",
      "lanius-ship-attacking-mantis",
    );
  },
  // Lanius ship attacking Mantis. "Leave the Mantis to their fate." One printed result.
  "c:lanius-ship-attacking-mantis:1": (g) => {
    result(g, eventText("event_LANIUS_MANTIS_DISTRESS_c2_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Slug. "Leave the Slugs to their fate." One printed result.
  "c:lanius-ship-attacking-slug:1": (g) => {
    result(g, eventText("event_LANIUS_SLUG_DISTRESS_c2_text"), undefined, ["Nothing happens."]);
  },
  // Zoltan ship follows Mantis ship. "Interfere and save the Mantis ship." One printed lead-in, then a Zoltan ship fight in the asteroid field.
  "c:zoltan-ship-follows-mantis-ship:0": (g) => {
    // Wiki citations:
    // > "Interfere and save the Mantis ship." — [[Zoltan ship follows Mantis ship]]
    // > "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there." — [[Zoltan ship follows Mantis ship]]
    // > "Fight a Zoltan ship." — [[Zoltan ship follows Mantis ship]]
    pageFight(
      g,
      eventText("event_ZOLTAN_DISTRESS_MANTIS_c1_text"),
      "Zoltan ship",
      "zoltan-ship-follows-mantis-ship",
      undefined,
      true,
    );
  },
  // Zoltan ship follows Mantis ship. "Interfere and help the Zoltan ship." One printed lead-in, then a Mantis ship fight in the asteroid field.
  // The page prints "crew entirely composed of Mantis." allMantisCrew replaces any other race after the fight starts.
  "c:zoltan-ship-follows-mantis-ship:1": (g) => {
    // Wiki citations:
    // > "Interfere and help the Zoltan ship." — [[Zoltan ship follows Mantis ship]]
    // > "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends." — [[Zoltan ship follows Mantis ship]]
    // > "Fight a Mantis ship with crew entirely composed of Mantis." — [[Zoltan ship follows Mantis ship]]
    pageFight(
      g,
      eventText("event_ZOLTAN_DISTRESS_MANTIS_c2_text"),
      "Mantis ship",
      "zoltan-ship-follows-mantis-ship",
      undefined,
      true,
    );
    allMantisCrew(g);
  },
  // Zoltan ship follows Mantis ship. "Don't interfere." One printed result.
  "c:zoltan-ship-follows-mantis-ship:2": (g) => {
    // Wiki citations:
    // > "Don't interfere." — [[Zoltan ship follows Mantis ship]]
    // > "The Zoltan know their business better than most - best to leave them to it. You prepare to jump." — [[Zoltan ship follows Mantis ship]]
    // > "Nothing happens." — [[Zoltan ship follows Mantis ship]]
    result(g, eventText("event_ZOLTAN_DISTRESS_MANTIS_c3_text"), undefined, ["Nothing happens."]);
  },
  // Zoltan wise man. "Mantis." One printed lead-in, then a Mantis ship whose crew are all Mantis.
  "c:zoltan-wise-man:0": (g) => {
    pageFight(g, eventText("event_ZOLTAN_RIFT_FIGHT_c1_text"), "Mantis ship", "zoltan-wise-man");
    allMantisCrew(g);
  },
  // Zoltan wise man. "Slug." One printed lead-in, then a Slug ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:1": (g) => {
    pageFight(g, eventText("event_ZOLTAN_RIFT_FIGHT_c2_text"), "Slug ship", "zoltan-wise-man");
  },
  // Zoltan wise man. "Rockmen." One printed lead-in, then a Rock ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:2": (g) => {
    pageFight(g, eventText("event_ZOLTAN_RIFT_FIGHT_c3_text"), "Rock ship", "zoltan-wise-man");
  },
  // Space station under construction. "Decline." One printed result.
  "c:space-station-under-construction:1": (g) => {
    result(g, eventText("event_QUEST_CONSTRUCTIONYARD_c2_text"), undefined, ["Nothing happens."]);
  },
  // Space station under construction. {{Blue Option|Lanius Crew}}. The sale loses that Lanius.
  // Clone Bay: "Your clonebay obviously does not revive your crewmember since they did not die."
  "c:space-station-under-construction:2": (g) => {
    if (!hasLanius(g)) return;
    card(g, eventText("event_QUEST_CONSTRUCTIONYARD_c3_text"), [
      opt("q:station:sale", "event_QUEST_CONSTRUCTIONYARD_c3_c1_c1_choice"),
      opt("q:station:nosale", "event_QUEST_CONSTRUCTIONYARD_c3_c1_c2_choice"),
    ]);
  },
  "q:station:sale": (g) => {
    const living = g.crew.filter((c) => c.side === "player" && c.hp > 0);
    const sold = living.find((c) => c.kin === "anaerobic");
    // The project does not remove the last living crewmember. A clone bay does not bring a sold Lanius back.
    if (!sold || living.length < 2) return;
    g.crew = g.crew.filter((c) => c.id !== sold.id);
    result(g, eventText("event_QUEST_CONSTRUCTIONYARD_c3_c1_c1_text"), scrapOnly(g, "high"), [
      `${sold.name} is gone.`,
      grantRandomItem(g, "augment"),
    ]);
  },
  "q:station:nosale": (g) => {
    result(g, eventText("event_QUEST_CONSTRUCTIONYARD_c3_c1_c2_text"), scrapOnly(g, "medium"));
  },
  // Crystal ship attacking Federation loyalists. "Save the Federation ship." One printed lead-in, then a Crystal ship fight.
  // {{SurrenderEscape(alt)|no|CRYSTAL_FED}} is not this line.
  "c:crystal-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(
      g,
      eventText("event_CRYSTAL_FED_c1_text"),
      "Crystal ship",
      "crystal-ship-attacking-federation-loyalists",
    );
  },
  // Crystal ship attacking Federation loyalists. "Prepare to leave." One printed result.
  "c:crystal-ship-attacking-federation-loyalists:1": (g) => {
    result(g, eventText("event_CRYSTAL_FED_c2_text"), undefined, ["Nothing happens."]);
  },
  // Engi smashed ships. "Attempt to help the ships by prying them apart." One printed lead-in, then an Engi ship fight.
  "c:engi-smashed-ships:0": (g) => {
    pageFight(g, eventText("event_ENGI_SEX_c1_text"), "Engi ship", "engi-smashed-ships");
  },
  // The Engi virus. "Attack the Engi vessel!" One printed lead-in, then an Engi ship fight. Halving engines and shields is the other choice.
  "c:the-engi-virus:1": (g) => {
    pageFight(g, eventText("event_ENGI_VIRUS_c1_c2_text"), "Engi ship", "the-engi-virus");
  },
  // The Engi virus. "Hold on! Let us try to purge the system code!" One printed lead-in, then an Engi ship fight.
  // The page halves Engines and Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:the-engi-virus:0": (g) => {
    pageFight(g, eventText("event_ENGI_VIRUS_c1_c1_text"), "Engi ship", "the-engi-virus");
    halvePlayerSystems(g, ["engines", "shields"]);
  },
  // Slug hacker (choice). "Shields." One printed lead-in, then a Slug ship fight.
  // The page halves Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Destroyed pays medium scrap with resources. A crew kill pays high.
  "c:slug-hacker-choice:0": (g) => {
    choiceWin.set(g, "shields");
    pageFight(
      g,
      eventText("event_NEBULA_SLUG_CHOOSE_DEATH_c1_text"),
      "Slug ship",
      "slug-hacker-choice",
    );
    halvePlayerSystems(g, ["shields"]);
  },
  // Slug hacker (choice). "Oxygen." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Both endings pay medium scrap with resources.
  "c:slug-hacker-choice:1": (g) => {
    choiceWin.set(g, "oxygen");
    pageFight(
      g,
      eventText("event_NEBULA_SLUG_CHOOSE_DEATH_c2_text"),
      "Slug ship",
      "slug-hacker-choice",
    );
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (choice). "Weapons." One printed lead-in, then a Slug ship fight.
  // The page halves Weapon Control, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Both endings pay high scrap with resources.
  "c:slug-hacker-choice:2": (g) => {
    choiceWin.set(g, "weapons");
    pageFight(
      g,
      eventText("event_NEBULA_SLUG_CHOOSE_DEATH_c3_text"),
      "Slug ship",
      "slug-hacker-choice",
    );
    halvePlayerSystems(g, ["weapons"]);
  },
  // Slug hacker (choice). "Offer 35 scrap to leave you alone." One printed result. The page spends 35 scrap.
  // This handler returns before citedChoose, so the scrap is spent here.
  "c:slug-hacker-choice:3": (g) => {
    if (g.scrap < 35) return;
    g.scrap -= 35;
    result(g, eventText("event_NEBULA_SLUG_CHOOSE_DEATH_c4_text"), undefined, [
      "You avoided the fight.",
    ]);
  },
  // Slug hacker (choice). "Counter any hack attempt." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  // Both endings pay high scrap with resources. The wiki's "[sic]" after "weapon system" is not shown.
  "c:slug-hacker-choice:4": (g) => {
    choiceWin.set(g, "hack");
    pageFight(
      g,
      eventText("event_NEBULA_SLUG_CHOOSE_DEATH_c5_text"),
      "Slug ship",
      "slug-hacker-choice",
    );
    shutPlayerHacking(g);
  },
  // Rebel ship attacking Crystal ship. "Attack the Rebel." One printed lead-in, then a Rebel ship fight.
  // Destroyed pays medium scrap with resources. A crew kill pays high. Both use the same sentence.
  // Then "You contact the Crystal ship." This handler returns before citedChoose.
  // Attacking the Crystalline ship stays on default rewards and is not this map.
  "c:rebel-ship-attacking-crystal-ship:0": (g) => {
    rebelCrystalBones.set(g, true);
    pageFight(
      g,
      eventText("event_CRYSTAL_REBEL_CRYSTAL_c1_text"),
      "Rebel ship",
      "rebel-ship-attacking-crystal-ship",
    );
  },
  // Rebel ship attacking Crystal ship. "Ignore them." One printed result.
  "c:rebel-ship-attacking-crystal-ship:2": (g) => {
    result(g, eventText("event_CRYSTAL_REBEL_CRYSTAL_c3_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking Crystal ship. Template:Crystal Ship Saved. The Crystal weapon is not named.
  "q:rebel-crystal:contact": (g) => crystalContact(g),
  // Slug hacker (oxygen). "Try to squeeze some extra power to the system." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-oxygen:1": (g) => {
    pageFight(g, eventText("event_NEBULA_SLUG_OXYGEN_c2_text"), "Slug ship", "slug-hacker-oxygen");
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (oxygen). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  "c:slug-hacker-oxygen:2": (g) => {
    pageFight(g, eventText("event_NEBULA_SLUG_OXYGEN_c3_text"), "Slug ship", "slug-hacker-oxygen");
    shutPlayerHacking(g);
  },
  // Slug hacker (doors). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". The Door System stays online on this path.
  // INFERRED: the installed hacking level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's door shutdown does not run.
  // Both endings on this path pay high scrap. Continue pays medium when the ship is destroyed.
  "c:slug-hacker-doors:1": (g) => {
    doorsCounterWin.set(g, true);
    pageFight(g, eventText("event_NEBULA_SLUG_DOORS_c2_text"), "Slug ship", "slug-hacker-doors");
    shutPlayerHacking(g);
  },
  // Slug hacker (medical). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page beams 2 slug boarders and says "Hacking offline". Medbay stays online on this path.
  // INFERRED: the installed hacking level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's medical shutdown and boarders do not run.
  "c:slug-hacker-medical:1": (g) => {
    pageFight(g, eventText("event_NEBULA_SLUG_MEDBAY_c3_text"), "Slug ship", "slug-hacker-medical");
    shutPlayerHacking(g);
    slugBoarders(g, 2, 2, "slug boarders beam aboard your ship.");
  },
  // Slug hacker (medical). "Try to squeeze some extra power to the system." One printed lead-in, then a Slug ship fight.
  // The page halves the Medbay, rounding down, and beams 2 slug boarders. Clone Bay stays online.
  // This handler returns before citedChoose, so the Continue path's full medical shutdown does not run.
  "c:slug-hacker-medical:2": (g) => {
    if ((g.player.systems.medbay?.level ?? 0) < 2) return;
    pageFight(g, eventText("event_NEBULA_SLUG_MEDBAY_c2_text"), "Slug ship", "slug-hacker-medical");
    halvePlayerSystems(g, ["medbay"]);
    slugBoarders(g, 2, 2, "slug boarders beam aboard your ship.");
  },
  // Legendary thief KazaaakplethKilik. "Attempt to hail him." One printed lead-in, then a Mantis ship fight.
  // The page prints "crew entirely composed of Mantis." This handler returns before citedChoose.
  "c:legendary-thief-kazaaakplethkilik:1": (g) => {
    pageFight(
      g,
      eventText("event_MANTIS_NAMED_THIEF_c1_text"),
      "Mantis ship",
      "legendary-thief-kazaaakplethkilik",
    );
    allMantisCrew(g);
  },
  // Mantis ship with Rock body parts. "Put your Rock crewmember on the comm." One printed lead-in, then a Mantis ship.
  // This handler returns before citedChoose so the Rock requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:2": (g) => {
    // Wiki citations:
    // > "(Rock Crew) Put your Rock crewmember on the comm." — [[Mantis ship with Rock body parts]]
    // > "The two aliens face one another over the vidscreen. \"Cave-dwelling pebble-man!\" yells the furious Mantis captain. \"See, I paint my ship with your companions! I paint my ship with you!\"" — [[Mantis ship with Rock body parts]]
    // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
    pageFight(
      g,
      eventText("event_ROCK_MANTIS_HUNTER_c4_text"),
      "Mantis ship",
      "mantis-ship-with-rock-body-parts",
    );
  },
  // Mantis ship with Rock body parts. "Ram the bastards." One printed lead-in, then a Mantis ship.
  // The page says their engines are disabled. INFERRED: every installed engine bar is damaged. The page prints no bar count.
  // This handler returns before citedChoose so the Rock Plating requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:3": (g) => {
    // Wiki citations:
    // > "(Rock Ship) Ram the bastards. (Requires Rock Plating)" — [[Mantis ship with Rock body parts]]
    // > "Before they have a chance, you ram your ship into theirs, causing irreparable damage to their engines. Luckily, your ship's armored hull is hardly dented from the impact. The Mantis ship careens away and you move in to attack." — [[Mantis ship with Rock body parts]]
    // > "Fight the Mantis ship (default rewards), whose engines are disabled." — [[Mantis ship with Rock body parts]]
    pageFight(
      g,
      eventText("event_ROCK_MANTIS_HUNTER_c3_text"),
      "Mantis ship",
      "mantis-ship-with-rock-body-parts",
    );
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage)
      hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },
  // Pirate engine hacker. "Counter the remote hacking." One printed lead-in, then a Pirate ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's engine cap does not apply.
  "c:pirate-engine-hacker:1": (g) => {
    // Wiki citations:
    // > "(Hacking System) Counter the remote hacking." — [[Pirate engine hacker]]
    // > "Your Hacking System automatically counters the digital assault and you move in to fight the ship." — [[Pirate engine hacker]]
    // > "Fight the Pirate ship with your Hacking offline." — [[Pirate engine hacker]]
    pageFight(g, eventText("event_AUTO_HACKER_c2_text"), "Pirate ship", "pirate-engine-hacker");
    shutPlayerHacking(g);
  },
  // Zoltan retake the ship. "Leave." One printed result.
  "c:zoltan-retake-the-ship:1": (g) => {
    result(g, eventText("event_ZOLTAN_LIFERAFT_c2_text"), undefined, ["Nothing happens."]);
  },
  // Federation Deserters. "Attack the traitors." One printed lead-in, then a Federation ship fight.
  "c:federation-deserters:0": (g) => {
    pageFight(
      g,
      eventText("event_CRYSTAL_FED_DESERTER_c2_text"),
      "Federation ship",
      "federation-deserters",
    );
  },
  // Federation Deserters. "Leave them be." One printed result.
  "c:federation-deserters:1": (g) => {
    result(g, eventText("event_CRYSTAL_FED_DESERTER_c3_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking refueling outpost. "Intervene to defend the outpost." One printed lead-in, then a Rebel ship fight.
  // Never-escape and never-surrender stay on this fight slug.
  "c:rebel-ship-attacking-refueling-outpost:0": (g) => {
    pageFight(
      g,
      eventText("event_SQUAT_REFUEL_STATION_c1_text"),
      "Rebel ship",
      "rebel-ship-attacking-refueling-outpost",
    );
  },
  // Auto-ship attacking outpost. "Intervene to defend the outpost." One printed lead-in, then an Auto-ship fight.
  "c:auto-ship-attacking-outpost:0": (g) => {
    pageFight(
      g,
      eventText("event_AUTO_REFUEL_STATION_c1_text"),
      "Auto-ship",
      "auto-ship-attacking-outpost",
    );
  },
  // Auto-ship attacking outpost. "Avoid the conflict." One printed result.
  "c:auto-ship-attacking-outpost:1": (g) => {
    result(g, eventText("event_AUTO_REFUEL_STATION_c2_text"), undefined, ["Nothing happens."]);
  },
  // Auto-ship attacking civilian. "Stay out of it." One printed result.
  "c:auto-ship-attacking-civilian:1": (g) => {
    result(g, eventText("event_AUTO_CIVILIAN_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking refueling outpost. "Avoid the conflict." One printed result.
  "c:rebel-ship-attacking-refueling-outpost:1": (g) => {
    result(g, eventText("event_SQUAT_REFUEL_STATION_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking refueling outpost. "Contact the outpost." Medium fuel (tooltip 2-4) and medium scrap.
  "q:refuel-outpost:contact": (g) => {
    const offer = scrapOnly(g, "medium");
    offer.fuel = rollFuel("q:refuel-outpost:contact", (lo, hi) => between(g, [lo, hi]));
    result(g, eventText("ship_SQUAT_REFUEL_STATION_destroyed_c1_text"), offer);
  },
  // Rebel ship attacking civilians in Last Stand. "Prepare to fight the Rebel ship!" One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-civilians-in-last-stand:0": (g) => {
    pageFight(
      g,
      eventText("event_BOSS_SCOUT_RESCUE_c1_text"),
      "Rebel ship",
      "rebel-ship-attacking-civilians-in-last-stand",
    );
  },
  // Rebel ship attacking civilians in Last Stand. "There's no time, get ready to jump." One printed result.
  "c:rebel-ship-attacking-civilians-in-last-stand:1": (g) => {
    result(g, eventText("event_BOSS_SCOUT_RESCUE_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking civilians in Last Stand. "Contact the survivors." Three results, no odds. INFERRED: equal.
  // The supplies line is Rewards, Stuff: medium resources and low scrap. The page names no bonus item, so none is granted.
  "q:last-stand-survivors:contact": (g) => lastStandSurvivors(g),
  // Lanius ship in rich debris field. "Attempt to harvest some for yourself." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:0": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_HARVESTER_c1_text"),
      "Lanius ship",
      "lanius-ship-in-rich-debris-field",
    );
  },
  // Zoltan security checkpoint. "You don't have time for this nonsense. Attack!" One printed lead-in, then a Zoltan ship fight.
  "c:zoltan-security-checkpoint:0": (g) => {
    // Wiki citations:
    // > "You don't have time for this nonsense. Attack!" — [[Zoltan security checkpoint]]
    // > "Expecting resistance, their Energy Shield is raised and ready for combat." — [[Zoltan security checkpoint]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan security checkpoint]]
    pageFight(
      g,
      eventText("event_ZOLTAN_CREW_SCAN_c1_text"),
      "Zoltan ship",
      "zoltan-security-checkpoint",
    );
  },
  // Lanius ship in rich debris field. "Attack the vessel." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:1": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_HARVESTER_c4_text"),
      "Lanius ship",
      "lanius-ship-in-rich-debris-field",
    );
  },
  // Lanius ship in rich debris field. "Ignore the vessel." One printed result.
  "c:lanius-ship-in-rich-debris-field:2": (g) => {
    result(g, eventText("event_LANIUS_HARVESTER_c5_text"), undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian distress. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian-distress:1": (g) => {
    result(g, eventText("event_LANIUS_DISTRESS_FIGHT_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking Federation loyalists. "Aid the Federation ship." One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(
      g,
      eventText("event_REBEL_VS_FEDERATION_c1_text"),
      "Rebel ship",
      "rebel-ship-attacking-federation-loyalists",
    );
  },
  // Rebel ship warning has no choice. Arrival calls this id.
  // "Fight a Rebel ship that is running away." One printed lead-in, then the running Rebel fight.
  "c:rebel-ship-warning:0": (g) => {
    pageFight(g, eventText("ship_SQUAT_WARNING_escape_text"), "Rebel ship", "rebel-ship-warning");
  },
  // Rebel ship attacking Federation loyalists. "Use this chance to escape." One printed result.
  "c:rebel-ship-attacking-federation-loyalists:1": (g) => {
    result(g, eventText("event_REBEL_VS_FEDERATION_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel shipyard. "Leave immediately." One printed result. Do not grant the unnamed salvage or start the Flagship fight.
  "c:rebel-shipyard:1": (g) => {
    result(g, eventText("event_FLAGSHIP_CONSTRUCTION_c2_text"), undefined, ["Nothing happens."]);
  },
  // Rebel transport ship. "Avoid the ship." One printed result.
  "c:rebel-transport-ship:1": (g) => {
    result(g, eventText("event_REBEL_TRANSPORT_c2_text"), undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Mantis ship fight.
  "c:mantis-ship-attacking-civilian:0": (g) => {
    // Wiki citations:
    // > "Aid the civilian ship." — [[Mantis ship attacking civilian]]
    // > "You frown, power up the weapons and prepare to engage the Mantis ship. Not today." — [[Mantis ship attacking civilian]]
    // > "Fight the Mantis Ship." — [[Mantis ship attacking civilian]]
    pageFight(
      g,
      eventText("event_MANTIS_CIVILIAN_c1_text"),
      "Mantis ship",
      "mantis-ship-attacking-civilian",
    );
  },
  // Mantis ship attacking civilian. "Stay out of it." Three results and no odds. INFERRED: equal.
  "c:mantis-ship-attacking-civilian:1": (g) => {
    // Wiki citations:
    // > "Stay out of it." — [[Mantis ship attacking civilian]]
    // > "Smoking, the civilian ship limps on. You set your sights on the future." — [[Mantis ship attacking civilian]]
    // > "The noise of the FTL spinning up almost drowns out the explosions. Almost." — [[Mantis ship attacking civilian]]
    // > "You let them pass and try not to think about it." — [[Mantis ship attacking civilian]]
    // > "Nothing happens." — [[Mantis ship attacking civilian]]
    const line = pick(g, [
      eventText("text_MANTIS_CIVILIAN_AVOID_1"),
      eventText("text_MANTIS_CIVILIAN_AVOID_2"),
      eventText("text_MANTIS_CIVILIAN_AVOID_3"),
    ] as const);
    result(g, line, undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking Slug ship. {{SurrenderEscape(alt)|no}}. The Mantis fight keeps the page slug.
  "c:mantis-ship-attacking-slug-ship:0": (g) => {
    // Wiki citations:
    // > "Attack the Mantis ship." — [[Mantis ship attacking Slug ship]]
    // > "You lock onto the Mantis ship and engage." — [[Mantis ship attacking Slug ship]]
    // > "Fight a Mantis Ship." — [[Mantis ship attacking Slug ship]]
    pageFight(
      g,
      eventText("event_SLUG_DISTRESS_MANTIS_c1_text"),
      "Mantis ship",
      "mantis-ship-attacking-slug-ship",
      { ...NEVER_RUN },
    );
  },
  // The Slug fight must not use the Mantis win. It does not surrender or escape.
  "c:mantis-ship-attacking-slug-ship:1": (g) => {
    // Wiki citations:
    // > "Attack the Slug ship." — [[Mantis ship attacking Slug ship]]
    // > "You move to finish what the Mantis have started." — [[Mantis ship attacking Slug ship]]
    // > "Fight a Slug ship." — [[Mantis ship attacking Slug ship]]
    pageFight(
      g,
      eventText("event_SLUG_DISTRESS_MANTIS_c2_text"),
      "Slug ship",
      "mantis-ship-attacking-slug-ship-slug",
      { ...NEVER_RUN },
    );
  },
  "q:mantis-slug:leave": (g) => {
    // Wiki citations:
    // > "Leave them be." — [[Mantis ship attacking Slug ship]]
    // > "These wretches aren't worth fighting. Time to spin up and jump off." — [[Mantis ship attacking Slug ship]]
    // > "Nothing happens." — [[Mantis ship attacking Slug ship]]
    result(g, eventText("ship_SLUG_DISTRESS_MANTIS_destroyed_c1_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  "q:mantis-slug:finish": (g) => {
    mantisSlugFinish(g);
  },
  // Zoltan security checkpoint. Two results, no odds. INFERRED: equal.
  "c:zoltan-security-checkpoint:1": (g) => {
    // Wiki citations:
    // > "Submit to profiling." — [[Zoltan security checkpoint]]
    if (pick(g, ["wanted", "pass"] as const) === "pass") {
      // Wiki citations:
      // > "After a few moments of uncertainty, your crew is allowed to pass." — [[Zoltan security checkpoint]]
      // > "Nothing happens." — [[Zoltan security checkpoint]]
      result(g, eventText("event_ZOLTAN_CREW_SCAN_LIST_1_text"), undefined, ["Nothing happens."]);
      return;
    }
    // Wiki citations:
    // > "The Zoltan security staff board your ship and begin scanning the crew's faces into a computer. Suddenly alarms go off and the Zoltan leap on one of your crew! \"This person is wanted on five charges of Utter Villainy! Surrender them to us!\"" — [[Zoltan security checkpoint]]
    card(g, eventText("event_ZOLTAN_CREW_SCAN_LIST_2_text"), [
      opt("q:zoltan-checkpoint:give", "event_ZOLTAN_CREW_SCAN_LIST_2_c1_choice"),
      opt("q:zoltan-checkpoint:fight", "event_ZOLTAN_CREW_SCAN_LIST_2_c2_choice"),
    ]);
  },
  // Clone Bay has no effect. INFERRED: never the last crewmember.
  "q:zoltan-checkpoint:give": (g) => {
    // Wiki citations:
    // > "Give up your crewmember." — [[Zoltan security checkpoint]]
    // > "It's a tough call, but Zoltan law holds sway here. Besides, that one always seemed a bit shifty." — [[Zoltan security checkpoint]]
    // > "You lose a crewmember." — [[Zoltan security checkpoint]]
    // > "(Clone Bay) [no effect] Unfortunately your crewmember was taken away unharmed so your Clone Bay was unable to retrieve them." — [[Zoltan security checkpoint]]
    const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
    const extras: string[] = [];
    if (mine.length > 1) {
      const lost = pick(g, mine);
      g.crew = g.crew.filter((c) => c.id !== lost.id);
      extras.push(`${lost.name} is lost.`);
    }
    if (g.player.kits.clonebay) extras.push(eventText("event_ZOLTAN_CREW_SCAN_LIST_2_c1_c0_clone"));
    result(g, eventText("event_ZOLTAN_CREW_SCAN_LIST_2_c1_text"), undefined, extras);
  },
  // The scan fight is not the attack fight. Weapon Control is halved, and 2-4 Zoltan boarders come aboard.
  "q:zoltan-checkpoint:fight": (g) => {
    // Wiki citations:
    // > "Refuse and fight." — [[Zoltan security checkpoint]]
    // > "You're not going to leave anyone behind. You pull away from the station with the enemy guards on board. Unfortunately, they are able to sabotage your weapon system in the chaos. It's time to leave!" — [[Zoltan security checkpoint]]
    // > "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship with your Weapon Control halved." — [[Zoltan security checkpoint]]
    pageFight(
      g,
      eventText("event_ZOLTAN_CREW_SCAN_LIST_2_c2_text"),
      "Zoltan ship",
      "zoltan-security-checkpoint-scan",
    );
    halvePlayerSystems(g, ["weapons"]);
    zoltanBoarders(g, 2, 4);
  },
  // {{Blue Option|Slug Crew}}. Medium fuel, 2-4. A dead Slug does not count.
  "c:zoltan-security-checkpoint:2": (g) => {
    // Wiki citations:
    // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
    // > "You give the guards permission to dock with the ship, but before they come on board your crew member slowly advances to meet them. As far as you can tell no words were exchanged, but the guards offer you some supplies and say the ship checks out. Best to not ask questions." — [[Zoltan security checkpoint]]
    // > "You receive medium fuel." — [[Zoltan security checkpoint]]
    if (!hasSlug(g)) return;
    zoltanCheckpointFuel(
      g,
      "c:zoltan-security-checkpoint:2",
      eventText("event_ZOLTAN_CREW_SCAN_c3_text"),
    );
  },
  // {{Blue Option|Mind Control}}. Medium fuel, 2-4.
  "c:zoltan-security-checkpoint:3": (g) => {
    // Wiki citations:
    // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
    // > "The captain of the guard appears on the vid screen \"Back so soon friend! Well, no need to waste your time further. Here, take these spare fuel canisters and get on with your mission.\" Your ship is cleared to pass." — [[Zoltan security checkpoint]]
    // > "You receive medium fuel." — [[Zoltan security checkpoint]]
    if ((g.player.kits.mind?.level ?? 0) <= 0) return;
    zoltanCheckpointFuel(
      g,
      "c:zoltan-security-checkpoint:3",
      eventText("event_ZOLTAN_CREW_SCAN_c4_text"),
    );
  },
  // Pirate ship attacking civilian distress. Improved Weapons, level 6+. Two results, no odds. INFERRED: equal.
  // The scare-off path offers the same civilian contact. The page's scrap preview is not a separate payout.
  "c:pirate-ship-attacking-civilian-distress:2": (g) => {
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    if (pick(g, ["fight", "leave"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_PIRATE_CIVILIAN_BEACON_BEAM_1_text"),
        "Pirate ship",
        "pirate-ship-attacking-civilian-distress",
      );
      return;
    }
    card(g, eventText("event_PIRATE_CIVILIAN_BEACON_BEAM_2_text"), [
      opt("q:lanius-civilian:contact", "continue"),
    ]);
  },
  // Auto-ship near storage station. Two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station:2": (g) => {
    if ((g.player.kits.cloaking?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_AUTO_DEFENSE_ITEM_CLOAK_2_text"),
        "Auto-ship",
        "auto-ship-near-storage-station",
      );
      return;
    }
    storageInvestigate(g, eventText("event_AUTO_DEFENSE_ITEM_CLOAK_1_text"));
  },
  // Auto-ship near storage station in nebula. Cloaking: two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station-in-nebula:2": (g) => {
    if ((g.player.kits.cloaking?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_NEBULA_AUTO_DEFENSE_ITEM_CLOAK_2_text"),
        "Auto-ship",
        "auto-ship-near-storage-station-in-nebula",
      );
      return;
    }
    storageInvestigate(g, eventText("event_NEBULA_AUTO_DEFENSE_ITEM_c4_text"));
  },
  // Improved Cloaking, level 2+. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:3": (g) => {
    if ((g.player.kits.cloaking?.level ?? 0) < 2) return;
    storageInvestigate(g, eventText("event_NEBULA_AUTO_DEFENSE_ITEM_c4_text"));
  },
  // Hacking, one drone part. Two results, no odds. INFERRED: equal. The part is spent either way.
  "c:auto-ship-near-storage-station-in-nebula:4": (g) => {
    const n = affordStock(g, "c:auto-ship-near-storage-station-in-nebula:4", "parts");
    if ((g.player.kits.hacking?.level ?? 0) <= 0 || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(
        g,
        eventText("event_NEBULA_AUTO_DEFENSE_ITEM_HACK_2_text"),
        "Auto-ship",
        "auto-ship-near-storage-station-in-nebula",
      );
      showEventLines(g, [spent]);
      return;
    }
    storageInvestigate(g, eventText("event_NEBULA_AUTO_DEFENSE_ITEM_HACK_1_text"));
    showEventLines(g, [spent]);
  },
  // Improved Hacking, level 2+, one drone part. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:5": (g) => {
    const n = affordStock(g, "c:auto-ship-near-storage-station-in-nebula:5", "parts");
    if ((g.player.kits.hacking?.level ?? 0) < 2 || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    storageInvestigate(g, eventText("event_NEBULA_AUTO_DEFENSE_ITEM_c6_text"));
    showEventLines(g, [spent]);
  },
  // Auto-ship near radar station. {{DuplicateEvent|2}} on the station, once on the fight.
  // The two station sentences have no odds between them. INFERRED: equal. The part is spent either way.
  // The map reveal inside Access the station is not wired.
  "c:auto-ship-near-radar-station:2": (g) => {
    const n = affordStock(g, "c:auto-ship-near-radar-station:2", "parts");
    if (!hasRadarCombat(g) || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    if (
      weighted(g, [
        ["station", 2],
        ["fight", 1],
      ] as const) === "fight"
    ) {
      pageFight(
        g,
        eventText("event_AUTO_DEFENSE_RADAR_COMBAT_3_text"),
        "Auto-ship",
        "auto-ship-near-radar-station",
      );
      showEventLines(g, [spent]);
      return;
    }
    const lead = pick(g, [
      eventText("event_AUTO_DEFENSE_RADAR_COMBAT_1_text"),
      eventText("event_AUTO_DEFENSE_RADAR_COMBAT_2_text"),
    ] as const);
    autoRadarAccess(g, lead);
    showEventLines(g, [spent]);
  },
  "q:auto-radar:hack": (g) => {
    autoRadarAccess(g);
  },
  "q:auto-radar:leave": (g) => {
    result(g, "", undefined, ["Nothing happens."]);
  },
  // Hacking spends one drone part. The page prints one result: a one-turn fleet delay and a map download.
  // The map reveal is not wired.
  "q:auto-radar:drone": (g) => {
    const n = affordStock(g, "q:auto-radar:drone", "parts");
    if ((g.player.kits.hacking?.level ?? 0) <= 0 || n == null) return;
    takeStock(g, "parts", n);
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, eventText("ship_REBEL_AUTO_RADAR_destroyed_c3_text"), undefined, [
      partsLine(n),
      "The Rebel Fleet is delayed for 1 turn.",
    ]);
  },
  // Template:Investigate the station. Four results, no odds. INFERRED: equal.
  // The weapon and the drone schematic are unnamed: Rewards, "Weapon": "A random weapon & T scrap." / "Drone": "A
  // random drone schematic & T scrap."
  "q:auto-storage:investigate": (g) => {
    const kind = pick(g, ["weapon", "schematic", "resources", "nothing"] as const);
    if (kind === "weapon") {
      result(g, eventText("event_DEFENSE_ITEM_LIST_3_text"), scrapOnly(g, "low"), [
        grantRandomItem(g, "weapon"),
      ]);
      return;
    }
    if (kind === "schematic") {
      result(g, eventText("event_DEFENSE_ITEM_LIST_2_text"), scrapOnly(g, "low"), [
        grantRandomItem(g, "drone"),
      ]);
      return;
    }
    if (kind === "resources") {
      result(g, eventText("event_DEFENSE_ITEM_LIST_4_text"), rollSurrenderOffer(g, "medium", true));
      return;
    }
    result(g, eventText("event_DEFENSE_ITEM_LIST_1_text"), undefined, ["Nothing happens."]);
  },
  "c:auto-ship-near-sensor-station:3": (g) => {
    if (!hasTeleporter(g)) return;
    result(g, eventText("event_AUTO_DEFENSE_MAP_c4_text"));
  },
  "q:lanius-scout:inspect": (g) => {
    const offer = scrapOnly(g, pick(g, ["low", "medium", "high"]));
    if (pick(g, ["map", "fleet"] as const) === "fleet") {
      g.fleet = Math.max(0, g.fleet - 1);
      result(g, eventText("event_LANIUS_AUTO_REBEL_LIST_2_text"), offer, [
        "The Rebel Fleet is delayed for 1 turn.",
      ]);
      return;
    }
    result(g, eventText("event_LANIUS_AUTO_REBEL_LIST_1_text"), offer);
  },
  // Lanius lone ship, "Try to contact the Lanius ship." The civilian warning, then one button.
  "c:lanius-lone-ship:2": (g) => {
    card(g, eventText("event_LANIUS_SCARED_CIVILIAN_c3_text"), [
      opt("q:lanius-lone:continue", "event_LANIUS_SCARED_CIVILIAN_c3_c1_choice"),
    ]);
  },
  // Three results, no odds. INFERRED: equal. The fight is default Lanius rewards, so there is no PAGE_WINS row.
  "q:lanius-lone:continue": (g) => {
    const kind = weighted(g, [
      ["store", 1],
      ["fight", 1],
      ["nothing", 1],
    ] as const);
    if (kind === "store") {
      result(
        g,
        eventText("event_LANIUS_SCARED_CIVILIAN_LIST_1_text"),
        undefined,
        [],
        [opt("q:open-store", "continue")],
      );
      return;
    }
    if (kind === "fight") {
      pageFight(
        g,
        eventText("event_LANIUS_SCARED_CIVILIAN_LIST_3_text"),
        "Lanius ship",
        "lanius-lone-ship",
      );
      return;
    }
    result(g, eventText("event_LANIUS_SCARED_CIVILIAN_LIST_2_text"), undefined, [
      "Nothing happens.",
    ]);
  },
  // {{Blue Option|Lanius Crew|Try to contact the ship.}} A dead Lanius does not count.
  "c:lanius-lone-ship:3": (g) => {
    if (!hasLanius(g)) return;
    result(
      g,
      eventText("event_LANIUS_SCARED_CIVILIAN_c4_text"),
      undefined,
      [],
      [opt("q:open-store", "continue")],
    );
  },
  // Lanius powered-down ship. Fights stay on default Lanius rewards: no PAGE_WINS row.
  // Power weapons: two results, no odds. INFERRED: equal.
  "c:lanius-powered-down-ship:1": (g) => {
    if (
      weighted(g, [
        ["fight", 1],
        ["silent", 1],
      ] as const) === "fight"
    ) {
      pageFight(
        g,
        eventText("event_LANIUS_DORMANT_WEAPONS_1_text"),
        "Lanius ship",
        "lanius-powered-down-ship",
      );
      return;
    }
    card(g, eventText("event_LANIUS_DORMANT_WEAPONS_2_text"), [
      opt("q:lanius-dormant:investigate", "event_LANIUS_DORMANT_WEAPONS_2_c1_choice"),
      opt("q:lanius-dormant:destroy", "event_LANIUS_DORMANT_WEAPONS_2_c2_choice"),
    ]);
  },
  "c:lanius-powered-down-ship:2": (g) => investigateDormant(g),
  "q:lanius-dormant:investigate": (g) => investigateDormant(g),
  "q:lanius-dormant:destroy": (g) => {
    pageFight(
      g,
      eventText("event_LANIUS_DORMANT_WEAPONS_2_c2_text"),
      "Lanius ship",
      "lanius-powered-down-ship",
    );
  },
  "q:lanius-dormant:ignore": (g) => {
    result(g, "Nothing happens.");
  },
  // Navigate carefully. Two results, no odds. INFERRED: equal. Low scrap is scrap only.
  "q:lanius-dormant:navigate": (g) => {
    if (
      weighted(g, [
        ["fight", 1],
        ["scrap", 1],
      ] as const) === "fight"
    ) {
      pageFight(
        g,
        eventText("event_LANIUS_DORMANT_PILOT_1_text"),
        "Lanius ship",
        "lanius-powered-down-ship",
      );
      return;
    }
    result(g, eventText("event_LANIUS_DORMANT_PILOT_2_text"), scrapOnly(g, "low"));
  },
  // {{Blue Option|Lanius Crew}}. Medium resources with some scrap (Rewards, Stuff). The unnamed bonus item is not granted.
  "q:lanius-dormant:plunder": (g) => {
    if (!hasLanius(g)) return;
    result(
      g,
      eventText("event_LANIUS_DORMANT_INVESTIGATE_c2_text"),
      rollSurrenderOffer(g, "medium", true),
    );
  },
  // {{Blue Option|Advanced Piloting|level=2+}}. Medium scrap with resources.
  "q:lanius-dormant:autopilot": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, eventText("event_LANIUS_DORMANT_INVESTIGATE_c4_text"), rollStandard(g, "medium"));
  },
  // Engi fleet discussion, "Message them and ask if you can help." -> "Nothing happens."
  "c:engi-fleet-discussion:0": (g) => {
    // Wiki citations:
    // > "Slightly shocked at your question, their leader quickly responds, \"Declined offer with apologetic gratitude. Topic of discussion private matter, no concern of Federation.\"" — [[Engi fleet discussion]]
    result(g, eventText("event_ENGI_UNLOCK_1_c1_text"));
  },
  // Engi fleet discussion. "Ignore it and move on." One printed result.
  "c:engi-fleet-discussion:1": (g) => {
    // Wiki citations:
    // > "You can't help but wonder what they were discussing as you prepare to jump." — [[Engi fleet discussion]]
    result(g, eventText("event_ENGI_UNLOCK_1_c2_text"), undefined, ["Nothing happens."]);
  },
  // {{Blue Option|Engi Crew|Have your Engi crewmember contact them.}}
  "c:engi-fleet-discussion:2": (g) => {
    if (!hasEngi(g)) return;
    // Wiki citations:
    // > "Your crew member syncs with the comm unit to communicate with them directly. You offer your help and a summary of the ship's mission. They respond, \"Our goals have analogous elements. However, not all available for disclosure, discretion necessary.\"" — [[Engi fleet discussion]]
    // > "Offer your help." — [[Engi fleet discussion]]
    card(g, eventText("event_ENGI_UNLOCK_1_c3_text"), [
      opt("q:engi-fleet:offer", "event_ENGI_UNLOCK_1_c3_c1_choice"),
    ]);
  },
  "q:engi-fleet:offer": (g) => {
    // Wiki citations:
    // > "\"Secret technologies stolen by Mantis. Implicit connection to Rebels. Implicit. Tracked Mantis to hidden Rebel base, uploading coordinates.\"" — [[Engi fleet discussion]]
    // > "A quest marker is added to your map." — [[Engi fleet discussion]]
    // > "\"However, tracked second ship to different base. Would calculate probability but data insufficient. Cannot risk obvious Rebel-Engi conflict. Also, need time to acquire military ships. Assist in finding technology?\"" — [[Engi fleet discussion]]
    // > "A second quest marker is added to your map." — [[Engi fleet discussion]]
    // "A quest marker is added to your map." ... "A second quest marker is added to your map." -> "Agree."
    const first = addQuest(g, "engi-real");
    const second = addQuest(g, "engi-fake");
    card(
      g,
      [
        eventText("event_ENGI_UNLOCK_1_c3_c1_text"),
        first,
        eventText("event_ENGI_UNLOCK_1_c3_c1_c1_text"),
        second,
      ].join("\n\n"),
      [opt("ack", "event_ENGI_UNLOCK_1_c3_c1_c1_c1_choice")],
    );
  },
  // Rebel defector, "Accept his proposal." {{DuplicateEvent|3}} on the crew result; the other three once each.
  // No quest marker on any branch. The trigger branch does not damage piloting.
  "c:rebel-defector:0": (g) => {
    // Wiki citations:
    // > "Accept his proposal, and prepare to fight the Rebel ship." — [[Rebel defector]]
    // > "3× Relieved and light-headed, your new crew member gets to work as the Rebel ship attacks." — [[Rebel defector]]
    // > "You receive a Human crewmember and fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "steals ship information before teleporting away." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled, and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "Your new crew-member smiles, then reveals a small remote trigger in the palm of his hand." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage; 2 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "The Rebel makes to take his assigned station, then suddenly turns and eviscerates the nearest crew-member. Red Alert!" — [[Rebel defector]]
    // > "You lose a crewmember; 1 human boarder beams aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "The eviscerated crewmember's clone launches out of the clone bay, eager to seek revenge." — [[Rebel defector]]
    const r = weighted(g, [
      ["join", 3],
      ["deceive", 1],
      ["trigger", 1],
      ["evisc", 1],
    ] as ["join" | "deceive" | "trigger" | "evisc", number][]);
    if (r === "join") {
      const joined = crew(g, "Human");
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_3_text"));
      showEventLines(g, [joined]);
    } else if (r === "deceive") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 1);
      g.fleet *= 2;
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_1_text"));
      showEventLines(g, ["Rebel Fleet pursuit is doubled."]);
    } else if (r === "trigger") {
      if (damageHull(g, 3)) return;
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_2_text"));
      humanBoarders(g, 2, 2);
    } else {
      // "You lose a crewmember" (Clone Bay: "The lost crewmember is revived."). Never the last living crewmember.
      const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
      let extra = "";
      if (g.player.kits.clonebay) extra = eventText("event_ALISON_DEFECTOR_HELP_6_c0_clone");
      else if (mine.length > 1) {
        const lost = pick(g, mine);
        g.crew = g.crew.filter((c) => c.id !== lost.id);
        extra = `${lost.name} is gone.`;
      }
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_6_text"));
      humanBoarders(g, 1, 1);
      if (extra) showEventLines(g, [extra]);
    }
  },
  // Rebel defector, "Reject his offer. You can never trust these Rebels." Three results.
  "c:rebel-defector:1": (g) => {
    // Wiki citations:
    // > "Reject his offer. You can never trust these Rebels." — [[Rebel defector]]
    // > "He offers to lead you to a secret cache of scrap nearby if you let him join your crew." — [[Rebel defector]]
    // > "Attempting to deal with attacks from inside and out is never easy!" — [[Rebel defector]]
    // > "Your fearless crew easily overcome the intruder, but the Rebel ship still needs to be dealt with." — [[Rebel defector]]
    // > "You fight a Rebel ship (default rewards)." — [[Rebel defector]]
    const r = pick(g, ["cache", "boarder", "fight"] as const);
    if (r === "cache") {
      card(g, eventText("event_ALISON_DEFECTOR_REJECT_3_text"), [
        opt("q:defector:reluctant", "event_ALISON_DEFECTOR_REJECT_3_c1_choice"),
        opt("q:defector:execute", "event_ALISON_DEFECTOR_REJECT_3_c2_choice"),
        opt("q:defector:again", "event_ALISON_DEFECTOR_REJECT_3_c3_choice"),
      ]);
    } else if (r === "boarder") {
      defectorFight(g, eventText("event_ALISON_DEFECTOR_REJECT_2_text"));
      humanBoarders(g, 1, 1);
    } else {
      defectorFight(g, eventText("event_ALISON_DEFECTOR_REJECT_1_text"));
    }
  },
  "q:defector:reluctant": (g) => {
    // Wiki citations:
    // > "Reluctantly accept his proposal and fight the Rebel ship." — [[Rebel defector]]
    // > "3× Relieved and light-headed, your new crew member gets to work as the Rebel ship attacks." — [[Rebel defector]]
    // > "You receive a Human crewmember and a quest marker is added to your map; you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "steals ship information before teleporting away." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled, and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "Your new crew-member smiles, then reveals a small remote trigger in the palm of his hand." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage, 1 damage to piloting; 2 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "The Rebel makes to take his assigned station, then suddenly turns and eviscerates the nearest crew-member. Red Alert!" — [[Rebel defector]]
    // > "You lose a crewmember; 1 human boarder beams aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "The eviscerated crewmember's clone launches out of the clone bay, eager to seek revenge." — [[Rebel defector]]
    // {{DuplicateEvent|3}} on the crew + quest result; the other three once each.
    const r = weighted(g, [
      ["join", 3],
      ["deceive", 1],
      ["trigger", 1],
      ["evisc", 1],
    ] as ["join" | "deceive" | "trigger" | "evisc", number][]);
    if (r === "join") {
      const joined = crew(g, "Human");
      const line = addQuest(g, "defector-cache");
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_2_3_text"));
      showEventLines(g, [joined, line]);
    } else if (r === "deceive") {
      // "3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled". Doubling as cited-events.ts fx "double".
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 1);
      g.fleet *= 2;
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_2_1_text"));
      showEventLines(g, ["Rebel Fleet pursuit is doubled."]);
    } else if (r === "trigger") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "pilot", 1);
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_2_2_text"));
      humanBoarders(g, 2, 2);
    } else {
      // "You lose a crewmember" (Clone Bay: "The lost crewmember is revived."). INFERRED: never the last crewmember.
      const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
      let extra = "";
      if (g.player.kits.clonebay) extra = eventText("event_ALISON_DEFECTOR_HELP_2_6_c0_clone");
      else if (mine.length > 1) {
        const lost = pick(g, mine);
        g.crew = g.crew.filter((c) => c.id !== lost.id);
        extra = `${lost.name} is gone.`;
      }
      defectorFight(g, eventText("event_ALISON_DEFECTOR_HELP_2_6_text"));
      humanBoarders(g, 1, 1);
      if (extra) showEventLines(g, [extra]);
    }
  },
  "q:defector:execute": (g) => {
    // Wiki citations:
    // > "Reject him outright and execute him on the spot." — [[Rebel defector]]
    // > "You fight a Rebel ship (default rewards)." — [[Rebel defector]]
    defectorFight(g, "");
  },
  "q:defector:again": (g) => {
    // Wiki citations:
    // > "Reject his offer again." — [[Rebel defector]]
    defectorFight(g, "");
    humanBoarders(g, 1, 1);
  },

  // ---- Quest-beacon choices ----
  "q:open-store": (g) => {
    openStoreHere(g);
  },
  "q:escort:fight": (g) => pageFight(g, "", "", "quest-escort"),

  "q:war-camp:leave": (g) => {
    if (rand(g) < 0.5) {
      pageFight(
        g,
        eventText("event_MANTIS_LANDING_PARTY_LEAVE_1_text"),
        "Mantis ship",
        "quest-mantis-war-camp",
        { ...NEVER_RUN },
      );
    } else {
      result(g, eventText("event_MANTIS_LANDING_PARTY_LEAVE_2_text"));
    }
  },
  "q:war-camp:missile": (g) => {
    const n = affordStock(g, "q:war-camp:missile", "missiles");
    if (n == null || !hasMissileWeapon(g)) return;
    takeStock(g, "missiles", n);
    pageFight(
      g,
      eventText("event_QUEST_MANTIS_INVASION_c2_text"),
      "Mantis ship",
      "quest-mantis-war-camp",
      { ...NEVER_RUN },
    );
  },
  "q:war-camp:firebomb": (g) => {
    const n = affordStock(g, "q:war-camp:firebomb", "missiles");
    if (n == null) return;
    takeStock(g, "missiles", n);
    const joined = crew(g, "Engi");
    result(
      g,
      eventText("event_QUEST_MANTIS_INVASION_c3_text"),
      rollSurrenderOffer(g, "high", true),
      [joined],
    );
  },

  "q:station:attack": (g) => {
    pageFight(
      g,
      eventText("event_QUEST_CONSTRUCTIONYARD_LIST_1_c1_text"),
      "Rebel ship",
      "quest-space-station-rebel",
      { ...NEVER_RUN },
    );
    // "while a planet-side Anti-Ship Battery periodically fires on your ship."
    g.asb = true;
  },
  "q:station:leave": (g) => result(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_1_c2_text")),
  "q:station:contact": (g) => {
    result(
      g,
      eventText("ship_QUEST_CONSTRUCTIONYARD_SHIP_destroyed_c1_text"),
      scrapOnly(g, "medium"),
    );
  },
  // Abandoned station, "Move in to examine the station." DuplicateEvent|2 on the scrap text, then one each of the
  // pirate ship, the battery with no ship, the cloning bay, and the empty shell. Race of the unnamed boarders is
  // INFERRED human (the pirate burst on this page already uses humanBoarders).
  "q:station:examine": (g) => {
    // DuplicateEvent|2 is the two printed supply lines. INFERRED: equal, so scrap stays twice as common.
    const r = weighted(g, [
      ["rest", 1],
      ["hull", 1],
      ["pirate", 1],
      ["battery", 1],
      ["clone", 1],
      ["engi", 1],
    ] as ["rest" | "hull" | "pirate" | "battery" | "clone" | "engi", number][]);
    if (r === "rest") {
      result(g, eventText("event_EMPTY_STATION2_LIST_2_text"), scrapOnly(g, "low"));
    } else if (r === "hull") {
      result(g, eventText("event_EMPTY_STATION2_LIST_3_text"), scrapOnly(g, "low"));
    } else if (r === "pirate") {
      pageFight(
        g,
        eventText("event_EMPTY_STATION2_LIST_5_text"),
        "Pirate ship",
        "quest-abandoned-station",
      );
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      humanBoarders(g, 2, 4, "boarders beam aboard.");
      beginBoarding(g, true);
      showEventLines(g, [eventText("event_EMPTY_STATION2_LIST_6_text")]);
    } else if (r === "clone") {
      const choices: Choice[] = [
        opt("q:station:scrapmachines", "event_EMPTY_STATION2_LIST_4_c2_choice"),
      ];
      if (g.player.kits.clonebay)
        choices.unshift(opt("q:station:dna", "event_EMPTY_STATION2_LIST_4_c1_choice"));
      card(g, eventText("event_EMPTY_STATION2_LIST_4_text"), choices);
    } else {
      result(g, eventText("event_EMPTY_STATION2_LIST_1_text"));
    }
  },
  // Clonebay DNA: DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The crazed boarder's race is not named. INFERRED human, same as the unnamed boarders on this page.
  "q:station:dna": (g) => {
    const rebuilt = eventText("event_EMPTY_STATION2_LIST_4_c1_text");
    if (
      weighted(g, [
        ["calm", 2],
        ["crazed", 1],
      ] as ["calm" | "crazed", number][]) === "crazed"
    ) {
      humanBoarders(g, 1, 1, "boarder beams aboard.");
      beginBoarding(g);
      showEventLines(g, [`${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_3_text")}`]);
      return;
    }
    // DuplicateEvent|2: calms down, or seems to accept. INFERRED: equal.
    const calm =
      rand(g) < 0.5
        ? `${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_1_text")}`
        : `${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_2_text")}`;
    result(g, calm, undefined, [crew(g, randomRace(g))]);
  },
  "q:station:scrapmachines": (g) =>
    result(g, eventText("event_EMPTY_STATION2_LIST_4_c2_text"), scrapOnly(g, "low")),
  "q:station:stay": (g) => result(g, eventText("event_EMPTY_STATION2_c2_text")),
  "q:station:fuel4": (g) => {
    const n = affordStock(g, "q:station:fuel4", "fuel");
    if (n == null) return;
    takeStock(g, "fuel", n);
    result(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_3_c1_text"), scrapOnly(g, "medium"));
  },
  "q:station:fuel1": (g) => {
    const n = affordStock(g, "q:station:fuel1", "fuel");
    if (n == null) return;
    takeStock(g, "fuel", n);
    result(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_3_c2_text"));
  },
  "q:station:none": (g) => result(g, eventText("event_QUEST_CONSTRUCTIONYARD_LIST_3_c3_text")),

  "q:mantis-collectors:forget": (g) => {
    // Wiki citations:
    // > "Forget it." — [[Mantis ship-collectors]]
    // > "They're not worth the trouble. You prepare to leave." — [[Mantis ship-collectors]]
    // > "Nothing happens." — [[Mantis ship-collectors]]
    result(g, eventText("ship_DONOR_MANTIS_CHASE1_gotaway_c2_text"));
  },
  // DONOR_MANTIS_CHASE2: "attempts to escape at 60% hull (12 seconds timer)". INFERRED: a certain attempt, like CHASE1.
  // "Fight a Mantis Bomber" with crew entirely composed of Mantis.
  "q:mantis-chase:fight": (g) => {
    // Wiki citations:
    // > "Fight a Mantis Bomber with crew entirely composed of Mantis." — [[Mantis ship-collectors#Quest Marker]]
    pageFight(g, "", "Mantis Bomber", "quest-mantis-chase", hullRun(100, 60, 12));
    allMantisCrew(g);
  },

  "q:loyalists:contact": (g) => {
    const r = pick(g, ["base", "supplies", "rescue"] as const);
    if (r === "base") {
      result(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_1_text"), undefined, [
        addQuest(g, "fed-base"),
      ]);
    } else if (r === "supplies") {
      result(
        g,
        eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_3_text"),
        rollStandard(g, "medium"),
      );
    } else loyalistsRescueCard(g);
  },
  "q:loyalists:rescue": (g) => {
    result(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_2_c1_text"), rollStandard(g, "low"), [
      crew(g, randomRace(g)),
    ]);
  },
  "q:loyalists:medbot": (g) => {
    // "a crewmember with 1 skill in shields, and high (3-6 fuel) fuel and scrap" (Rewards, "Fuel": T fuel & T scrap).
    const offer = scrapOnly(g, "high");
    offer.fuel = rollFuel("q:loyalists:medbot", (lo, hi) => between(g, [lo, hi]));
    result(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_2_c2_text"), offer, [
      crew(g, randomRace(g), "shields"),
    ]);
  },
  "q:loyalists:teleport": (g) => {
    const joined = crew(g, randomRace(g), "combat");
    result(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_2_c3_text"), scrapOnly(g, "medium"), [
      joined,
      addQuest(g, "fed-base"),
    ]);
  },
  // {{Blue Option|Healing Burst}}. 1 missile. A crewmember with 1 skill in engines, medium scrap, and the Federation base.
  "q:loyalists:heal": (g) => {
    const n = affordStock(g, "q:loyalists:heal", "missiles");
    if (n == null || !g.player.weapons.some((w) => w.defId === "BOMB_HEAL")) return;
    takeStock(g, "missiles", n);
    const joined = crew(g, randomRace(g), "engines");
    result(g, eventText("event_REBEL_VS_FEDERATION_SAVED_LIST_2_c4_text"), scrapOnly(g, "medium"), [
      missileLine(n),
      joined,
      addQuest(g, "fed-base"),
    ]);
  },
  // Improved Sensors, level 2: medium scrap with resources.
  "q:fed-base:scan-2": (g) => {
    if (sensors(g) < 2) return;
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_4_c2_text"), rollStandard(g, "medium"));
  },
  // Advanced Sensors, level 3: a weapon with medium scrap.
  "q:fed-base:scan-3": (g) => {
    if (sensors(g) < 3) return;
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_4_c3_text"), scrapOnly(g, "medium"), [
      grantRandomItem(g, "weapon"),
    ]);
  },
  // Long-Ranged Scanners: a weapon with medium scrap. The weapon is not named.
  "q:fed-base:scan-glass": (g) => {
    if (!g.augments.includes("ADV_SCANNERS")) return;
    result(g, eventText("event_HIDDEN_FEDERATION_BASE_LIST_4_c4_text"), scrapOnly(g, "medium"), [
      grantRandomItem(g, "weapon"),
    ]);
  },
  "q:fed-base:assist": (g) => pageFight(g, "", "Auto-ship", "quest-fed-assist"),
  // The other non-AE arrival. Same sentence, a different contact.
  "q:fed-base:assist-repair": (g) => pageFight(g, "", "Auto-ship", "quest-fed-assist-repair"),
  // AE Auto-ship. "periodically" prints no seconds: aidPlayerAsb is the existing friendly battery.
  "q:fed-base:assist-asb": (g) => {
    pageFight(g, "", "Auto-ship", "quest-fed-assist-asb");
    aidPlayerAsb(g);
  },
  // AE Elite Rebel. {{SurrenderEscape(alt)|escapechance|REBEL_FEDERATION_PDS|dlcEventsOverwrite.xml|20|40-60|4-6}}
  // escapechance is an escape attempt only (no surrender). 20 is the percent; 40-60 is hull percent.
  // 4-6 is the template's actual-hull warning, not a timer, so the typical 15 seconds stays.
  // INFERRED: the threshold is uniform inside 40..60, the same reading as escape.ts.
  "q:fed-base:assist-wing": (g) => {
    pageFight(
      g,
      "",
      "elite",
      "quest-fed-assist-wing",
      hullRun(20, 40 + rand(g) * 20, hullRunSeconds()),
    );
    aidPlayerAsb(g);
  },
  // Non-AE contact fixed by the weapon arrival: a crewmember and a weapon with low scrap.
  "q:fed-assist:contact": (g) => {
    result(g, eventText("ship_AUTO_FEDERATION_BASE_destroyed_c1_text"), scrapOnly(g, "low"), [
      crew(g, randomRace(g)),
      grantRandomItem(g, "weapon"),
    ]);
  },
  // Non-AE contact fixed by the repair arrival: a crewmember, high scrap with resources, and 7 repairs.
  "q:fed-assist-repair:contact": (g) => {
    result(g, eventText("ship_AUTO_FEDERATION_BASE2_destroyed_c1_text"), rollStandard(g, "high"), [
      crew(g, randomRace(g)),
      repair(g, 7),
    ]);
  },
  // AE Auto-ship contact: a crewmember, high scrap with resources, and 7 repairs.
  "q:fed-assist-asb:contact": (g) => {
    result(g, eventText("ship_AUTO_FEDERATION_BASE2_destroyed_c1_text"), rollStandard(g, "high"), [
      crew(g, randomRace(g)),
      repair(g, 7),
    ]);
  },
  // AE Elite contact: a crewmember and no scrap. The footnote drops only the scrap.
  "q:fed-assist-wing:contact": (g) => {
    result(g, eventText("ship_REBEL_FEDERATION_PDS_gotaway_c1_text"), undefined, [
      crew(g, randomRace(g)),
    ]);
  },

  "q:thief:strip": (g) => {
    result(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c1_text"), rollStandard(g, "high"));
  },
  "q:thief:teleport": (g) => thiefDyingCard(g, false),
  "q:thief:scan": (g) => thiefDyingCard(g, true),
  "q:thief:mercy": (g) => {
    result(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c1_text"), rollStandard(g, "high"));
  },
  "q:thief:listen": (g) => {
    result(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c2_text"), rollStandard(g, "high"), [
      addQuest(g, "thief-stash"),
    ]);
  },
  "q:thief:save": (g) => {
    card(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c3_text"), [
      opt("q:thief:accept", "event_MANTIS_NAMED_THIEF_DEFEAT_c2_c3_c1_choice"),
    ]);
  },
  "q:thief:clone": (g) => {
    card(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c4_text"), [
      opt("q:thief:accept", "event_MANTIS_NAMED_THIEF_DEFEAT_c2_c3_c1_choice"),
    ]);
  },
  "q:thief:accept": (g) => {
    // "receive high scrap, Mantis Pheromones augmentation, Mantis crewmember named Kazaaak maxed in all skills, and a
    // quest marker". The Mantis Cruiser unlock is the grantUnlock line below.
    grantUnlock(g, "PLAYER_SHIP_MANTIS"); // @agent:unlocks. "You unlock the Mantis Cruiser".
    let joined = "There is no room aboard for Kazaaak.";
    if (joinCrew(g, "Mantis", "Kazaaak")) {
      const c = g.crew[g.crew.length - 1];
      const all: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];
      c.skills = Object.fromEntries(all.map((s) => [s, xpNeedFor(c, s) * 2]));
      joined = "Kazaaak joins your crew.";
    }
    result(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_c2_c3_c1_text"), scrapOnly(g, "high"), [
      joined,
      grantAug(g, "CREW_STIMS"),
      addQuest(g, "thief-stash"),
    ]);
  },

  "q:slug-trap:engage": (g) => {
    // Wiki citations:
    // > "There's money to be made here. The Slugs know that. You turn on the pirate and intercept just before he can reach the cache!" — [[Slug comm tapping#Quest Marker]]
    // > "Fight a Pirate ship." — [[Slug comm tapping#Quest Marker]]
    // INFERRED: the page prints no escape for this pirate.
    pageFight(
      g,
      eventText("event_QUEST_SLUG_PIRATE_TRAP2_c1_c1_text"),
      "Pirate ship",
      "quest-slug-pirate-trap-engage",
      { ...NEVER_RUN },
    );
  },
  "q:slug-trap:cache": (g) => {
    // Wiki citations:
    // > "When he sees you making for the cache the Slug captain hails: \"Foolish alienss, no eye for profit. Bessst of luck to you.\" They jump off, leaving you toe to toe with the pirate!" — [[Slug comm tapping#Quest Marker]]
    // > "Fight a Pirate ship." — [[Slug comm tapping#Quest Marker]]
    pageFight(
      g,
      eventText("event_QUEST_SLUG_PIRATE_TRAP2_c1_c2_text"),
      "Pirate ship",
      "quest-slug-pirate-trap-cache",
      { ...NEVER_RUN },
    );
  },

  // REBEL_ENGI_UNLOCK_2REAL / 2FAKE: "immediately starts to escape (40 seconds timer)".
  "q:engi-real:fight": (g) => {
    // Wiki citations:
    // > "When the ship wants to escape As soon as they see you they power up their engines to jump away. Stop them!" — [[Engi fleet discussion#First Quest Marker (Real)]]
    pageFight(
      g,
      eventText("ship_REBEL_ENGI_UNLOCK_2REAL_escape_text"),
      "Rebel ship",
      "quest-engi-real",
      startRun(40),
    );
  },
  "q:engi-fake:fight": (g) => {
    // Wiki citations:
    // > "When the ship wants to escape As soon as they see you, they power up their engines to jump away. Stop them!" — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    pageFight(
      g,
      eventText("ship_REBEL_ENGI_UNLOCK_2FAKE_escape_text"),
      "Rebel ship",
      "quest-engi-fake",
      startRun(40),
    );
  },
  // Fake marker, after "Demand information": "Let them go." -> "The ship turns neutral." / "Ignore him and attack."
  "q:engi-fake:go": (g) => {
    // Wiki citations:
    // > "The ship turns neutral." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    closeFight(g);
    result(g, "");
  },
  "q:engi-fake:attack": (g) => {
    // Wiki citations:
    // > "\"No, wait...\" You cut the transmission and continue the assault." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "Continue the fight." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    const plan = g.enemySurrender;
    if (plan) plan.refused = true;
    g.event = null;
    showEventLines(g, [eventText("event_ENGI_UNLOCK_2FAKE_SURRENDER_c1_c2_text")]);
  },
  // MANTIS_ENGI_UNLOCK_3: "Fight the Mantis Ship controlled by Humans", {{SurrenderEscape(alt)|no|...}}.
  "q:engi-final:fight": (g) => {
    // Wiki citations:
    // > "Fight the Mantis Ship controlled by Humans." — [[Engi fleet discussion#Final Quest Marker]]
    pageFight(g, "", "", "quest-engi-final", {
      ...NEVER_RUN,
    });
    const hp = crewDef("human").hp;
    for (const c of g.crew) {
      if (c.side !== "enemy") continue;
      c.kin = "human";
      c.hp = hp;
      c.maxHp = hp;
    }
  },
  "q:engi-victory:ask": (g) => {
    // Wiki citations:
    // > "\"Likely ploy by Rebels to avoid breaking non-aggression pact with Engi. 97.56 percent likely. Your mission to assist last Federation fleet, correct? Coordinates?\"" — [[Engi fleet discussion#Victory]]
    // > "Transmit coordinates of Federation command." — [[Engi fleet discussion#Victory]]
    card(g, eventText("event_ENGI_UNLOCK_4_c1_text"), [
      opt("q:engi-victory:transmit", "event_ENGI_UNLOCK_4_c1_c1_choice"),
    ]);
  },
  "q:engi-victory:transmit": (g) => {
    // Wiki citations:
    // > "\"Satisfactory. Delivery of tech will assist in Federation cause. Gratitude alone insufficient. Commencing ship repair and compensation.\" Their crews deliver a weapon for installation but you're more pleased to hear that the Federation will have an improved arsenal." — [[Engi fleet discussion#Victory]]
    // > "You unlock the Stealth Cruiser; you receive Titanium System Casing augmentation, high scrap with resources and your ship receives 20 repairs." — [[Engi fleet discussion#Victory]]
    // "You unlock the Stealth Cruiser; you receive Titanium System Casing augmentation, high scrap with resources and your
    // ship receives 20 repairs." The unlock is the grantUnlock line below.
    grantUnlock(g, "PLAYER_SHIP_STEALTH"); // @agent:unlocks. "You unlock the Stealth Cruiser".
    result(g, eventText("event_ENGI_UNLOCK_4_c1_c1_text"), rollStandard(g, "high"), [
      grantAug(g, "SYSTEM_CASING"),
      repair(g, 20),
    ]);
  },

  // "this ship is always a Slug Assault class" / the interceptor: "It is always a Slug Interceptor class" (enemy-gen classId).
  "q:slug-platform:charge": (g) => {
    pageFight(g, eventText("event_SLUG_UNLOCK_1_c1_text"), "Slug Assault", "quest-slug-platform", {
      ...NEVER_RUN,
    });
  },
  "q:slug-platform:tail": (g) => {
    const choices: Choice[] = [
      opt("q:slug-platform:slow", "event_SLUG_UNLOCK_2_c1_choice"),
      opt("q:slug-platform:wait", "event_SLUG_UNLOCK_2_c2_choice"),
    ];
    // {{Blue Option|Slug Crew|...}}, {{Blue Option|Improved Sensors|...|level=2+}}.
    if (hasSlug(g)) choices.push(opt("q:slug-platform:slug", "event_SLUG_UNLOCK_2_c3_choice"));
    if (sensors(g) >= 2)
      choices.push(opt("q:slug-platform:sensors", "event_SLUG_UNLOCK_2_c4_choice"));
    card(g, eventText("event_SLUG_UNLOCK_2_text"), choices);
  },
  "q:slug-platform:slow": (g) => {
    pageFight(g, eventText("event_SLUG_UNLOCK_2_c1_text"), "Slug Assault", "quest-slug-platform", {
      ...NEVER_RUN,
    });
  },
  "q:slug-platform:wait": (g) => {
    result(g, eventText("event_SLUG_UNLOCK_2_c2_text"));
  },
  "q:slug-platform:slug": (g) => {
    card(
      g,
      `${eventText("event_SLUG_UNLOCK_2_c3_text")}\n\n${eventText("event_SLUG_UNLOCK_2_c3_c1_text")}`,
      [opt("q:slug-platform:interceptor", "continue")],
    );
  },
  "q:slug-platform:sensors": (g) => {
    card(
      g,
      `${eventText("event_SLUG_UNLOCK_2_c4_text")}\n\n${eventText("event_SLUG_UNLOCK_2_c3_c1_text")}`,
      [opt("q:slug-platform:interceptor", "continue")],
    );
  },
  // "This ship starts to escape with 35 seconds countdown timer."
  "q:slug-platform:interceptor": (g) => {
    // Wiki citations:
    // > "Fight the interceptor." — [[Slug Home Nebula surrender#Quest Marker]]
    // > "This ship starts to escape with 35 seconds countdown timer. It is always a Slug Interceptor class." — [[Slug Home Nebula surrender#Fight the interceptor]]
    // > "When the ship wants to escape The interceptor powers up its FTL drive in preparation to escape. At the same time, the cruiser's FTL drive does the same. They must be linked! Don't let them get away!" — [[Slug Home Nebula surrender#Fight the interceptor]]
    pageFight(
      g,
      eventText("ship_JELLY_UNLOCK3_escape_text"),
      "Slug Interceptor",
      "quest-slug-interceptor",
      startRun(35),
    );
  },

  "q:store-rescue:engage": (g) => {
    // Wiki citations:
    // > "The \"SQUAT_STORE_RESCUE\" ship assaulting the space dock doesn't surrender, nor tries to escape." — [[Settlement mercenary work#Trivia]]
    pageFight(g, "", "", "quest-store-rescue", {
      ...NEVER_RUN,
    });
  },
  "q:store-rescue:avoid": (g) => {
    // Wiki citations:
    // > "After a time the ship powers down its weapons and jumps away. No life-signs are detected on the moon." — [[Settlement mercenary work#Quest marker]]
    // > "Nothing happens." — [[Settlement mercenary work#Quest marker]]
    result(g, eventText("event_QUEST_STORE_RESCUE_c2_text"));
  },
};

/** surrender.ts surrenderChoose calls this first. True when the id was a quest choice. */
export function questChoose(g: Game, id: string): boolean {
  const checkpoint = /^q:rebel-checkpoint:bribe:(\d+)$/.exec(id);
  if (checkpoint) {
    if (questChoiceDisabled(g, id)) return true;
    rebelCheckpointBribe(g, Number(checkpoint[1]));
    return true;
  }
  const run = CHOICES[id] ?? fromParts("choices", id);
  if (!run) return false;
  if (questChoiceDisabled(g, id)) return true;
  run(g);
  return true;
}

/** sim.ts choiceDisabled: a lock stored on the choice, then a price parsed from the choice id. */
export function questChoiceDisabled(g: Game, id: string): string | null {
  const locked = ownedLock(g, id, locksOwned("quest"));
  if (locked) return locked;
  // Rebel checkpoint. The bribe amount is the one shown on the button.
  const checkpoint = /^q:rebel-checkpoint:bribe:(\d+)$/.exec(id);
  if (checkpoint && g.scrap < Number(checkpoint[1])) return `Need ${checkpoint[1]} scrap`;
  // Wiki citations:
  // > "(Engi Crew) Have your Engi crewmember contact them." — [[Engi fleet discussion]]
  // Lanius ship in rich debris field. Improved Piloting is level 2. Advanced Piloting is level 3.
  // Lanius ship salvager, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  // Lanius trader, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  // Space station under construction, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  // Lanius lone ship, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  // Lanius powered-down ship. Advanced Piloting prints level=2+. A dead Lanius does not count.
  // Lanius trader with translator. Purchase the translator for 40 scrap.
  // Auto-ship near sensor station. Sensors level 3. A Crew Teleporter.
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  // Deactivated Auto-ship. Sensors level 3. The button stays visible.
  // Rock ship in plasma storm. A dead Rock does not count. The button stays visible.
  // Slug drink. A dead Rock does not count. The button stays visible.
  // Slug hacker (choice). {{Blue Option|Hacking System|Counter any hack attempt.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Slug hacker (oxygen). {{Blue Option|Improved Oxygen|...|level=2+|shortreq=Oxygen}}.
  // INFERRED: the refusal line. The page names level 2+ and does not print this sentence.
  // Slug hacker (oxygen). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Slug hacker (doors). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Slug hacker (medical). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Slug hacker (medical). {{Blue Option|Improved Medbay|Try to squeeze some extra power to the system.|level=2+|shortreq=Medbay}}.
  // INFERRED: the refusal line. The page names level 2+ and does not print this sentence.
  // Legendary thief KazaaakplethKilik. {{Blue Option|Mantis crewmember|Attempt to hail him.|shortreq=Mantis Crew}}.
  // INFERRED: the refusal line. A dead Mantis does not count. The page names the crew and does not print this sentence.
  // Mantis ship with Rock body parts. {{Blue Option|Rock Crew|Put your Rock crewmember on the comm.}}.
  // INFERRED: the refusal line. A dead Rock does not count. The page names the crew and does not print this sentence.
  // Wiki citations:
  // > "(Rock Crew) Put your Rock crewmember on the comm." — [[Mantis ship with Rock body parts]]
  // Mantis ship with Rock body parts. {{Blue Option|Rock Ship|Ram the bastards.|shortreq=Rock Plating}}.
  // INFERRED: the refusal line. The page names Rock Plating and does not print this sentence.
  // Wiki citations:
  // > "(Rock Ship) Ram the bastards. (Requires Rock Plating)" — [[Mantis ship with Rock body parts]]
  // Pirate engine hacker. {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Escort civilians FTL haywire. Advanced FTL Navigation. The button stays visible.
  // Zoltan security checkpoint. A dead Slug does not count. Mind Control is the installed system.
  // Wiki citations:
  // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
  // Wiki citations:
  // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
  // Pirate ship attacking civilian distress. Improved Weapons is level 6+. The button stays visible.
  // Pirate smuggler. Improved Weapons is level 6+. The button stays visible.
  // Rock atheists. Improved Sensors is level 2+. The button stays visible.
  // Pirate ship selling drones. A dead Slug does not count. Hacking and Drone Control must already be installed.
  // Rebel checkpoint. The bribe amount is the one shown on the button.
  // Engi distress Rebel fight. 25 scrap, or 40 scrap plus 2 missiles and 2 fuel.
  // Rebel fight choice in nebula. Cloaking, and Engines level 4+ on the caught follow-up.
  // Mantis fight choice. Cloaking, any installed level.
  // Auto-ship near storage station. Cloaking, any installed level.
  // Auto-ship near storage station in nebula. Improved Cloaking is level 2+. Hacking spends 1 drone part.
  // Auto-ship near radar station. Combat Drone is one of the four named schematics. Hacking spends 1 drone part.
  // The Black Raven, {{Blue Option|Slugman Crew}}. A dead Slug does not count.
  // Wiki citations:
  // > "(Slugman Crew) Engage in a duel of the mind." — [[The Black Raven]]
  // Refueling platform garbled broadcast. Blast Doors, level 2+.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Improved Sensors, level 2. The scan stays on the abandoned card.
  // INFERRED: the refusal line. The page names level 2 and does not print this sentence.
  // Advanced Sensors, level 3.
  // INFERRED: the refusal line. The page names level 3 and does not print this sentence.
  // Refueling platform dock. Accept costs 5-10 scrap. Blast Doors are level 2+.
  // INFERRED: the refusal lines. The page prints the price and the system, not these sentences.
  // Zoltan retake the ship. The hire costs 40 scrap.
  // INFERRED: the refusal line. The page prints the price and does not print this sentence.
  for (const part of PARTS()) {
    const why = part?.disabled?.(g, id);
    if (why) return why;
  }
  return null;
}

/** Cited choices whose table fx stays in citedChoose; the quest marker is added after it (sim.ts choose). */
const AFTER_CITED: Record<string, string> = {
  // Escort civilians: "You receive low (1-3) fuel and a quest marker is added to your map."
  "c:escort-civilians:0": "escort",
  // Escort civilians FTL haywire: "You receive low scrap and a quest marker is added to your map."
  "c:escort-civilians-ftl-haywire:0": "escort",
  // Mantis war camp: "You receive medium scrap and a quest marker is added to your map."
  "c:mantis-war-camp:0": "mantis-war-camp",
  // Space station under construction: "You receive 2-4 fuel 0-4 missiles 0-2 drone parts, and a quest marker".
  "c:space-station-under-construction:0": "space-station",
};

/** sim.ts choose, after citedChoose applied a choice. */
export function questAfterCited(g: Game, id: string) {
  const quest = AFTER_CITED[id];
  if (quest) {
    const line = addQuest(g, quest);
    // Escort civilians, Accept. The dump prints the italic reply, then the marker line.
    // Fuel (1-3) is already applied by citedChoose; the card does not print a count.
    // Mantis war camp, Pledge. The dump prints the italic reply, then the marker line.
    // Medium scrap is already applied by citedChoose; the card does not print a count.
    // Space station under construction, Offer your help. Supplies are already applied; the card does not print a count.
    // Escort civilians FTL haywire, Lead them. Low scrap is already applied; the card does not print a count.
    const body =
      id === "c:escort-civilians:0"
        ? `${eventText("event_QUEST_ESCORT_c1_text")}

${line}`
        : id === "c:mantis-war-camp:0"
          ? `${eventText("event_QUEST_MANTIS_INVASION_START_c1_text")}

${line}`
          : id === "c:space-station-under-construction:0"
            ? `${eventText("event_QUEST_CONSTRUCTIONYARD_c1_text")}

${line}`
            : id === "c:escort-civilians-ftl-haywire:0"
              ? `${eventText("event_ESCORT_BEACON_c1_text")}

${line}`
              : line;
    // A short card so the marker line is seen; "ack" goes back to the map (the beacon is already resolved).
    g.event = { title: here(g)?.name ?? "Event", body, choices: ACK() };
    g.phase = "event";
    g.paused = true;
    return;
  }
  // Mantis ship-collectors, DONOR_MANTIS_CHASE1: {{SurrenderEscape(alt)|escapechance100timer|...|50|5|5}}, "attempts to
  // escape at 50% hull (5 seconds timer)". Its "gotaway" result offers the quest marker (pageGotAway).
  if (id === "c:mantis-ship-collectors:0" && g.phase === "combat" && g.enemy) {
    g.enemyEscape = hullRun(100, 50, 5);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Page win rewards (sim.ts winCombat) and "gotaway" results (sim.ts step, enemy escape)
// ---------------------------------------------------------------------------------------------------------------

/** False: the page prints no result for this ending, so winCombat pays its default salvage. */
export type Win = (g: Game, deadCrew: boolean) => boolean | void;

/** Rewards, "Standard" by destroyed / crew-killed, with the page's text. */
/** Text read when it is shown: a table built at module load holds `lazyText(id)`, not the line itself. */
export type LazyText = string | (() => string);
export const lazyText =
  (id: string): (() => string) =>
  () =>
    eventText(id);
const shown = (t: LazyText): string => (typeof t === "function" ? t() : t);

export function std(
  destroyed: SurrenderTier,
  killed: SurrenderTier,
  textD: LazyText,
  textK: LazyText = textD,
  then?: Choice[] | (() => Choice[]),
): Win {
  return (g, deadCrew) =>
    result(
      g,
      shown(deadCrew ? textK : textD),
      rollStandard(g, deadCrew ? killed : destroyed),
      [],
      typeof then === "function" ? then() : then,
    );
}

/** Rock and Slug standoff. "Your ship reactor is upgraded." No step is printed. INFERRED: one bar.
 * Template:Reactor power cost caps the reactor at 25. Past that the bar does not move.
 */
function eventReactor(g: Game): string {
  // Wiki citations:
  // > "Your ship reactor is upgraded." — [[Rock and Slug standoff#Slug reward]]
  if (upgradeCost("reactor", g.player.reactor) == null) return "";
  g.player.reactor += 1;
  noteReactorEvent(g);
  return "Your ship reactor is upgraded.";
}

function offerLines(g: Game, offer: SurrenderOffer): string[] {
  const paid = payOffer(g, offer, true);
  const got: string[] = [];
  if (offer.scrap) got.push(`Scrap: ${offer.scrap}.`);
  if (offer.fuel) got.push(`Fuel: ${offer.fuel}.`);
  if (offer.missiles) got.push(`Missiles: ${offer.missiles}.`);
  if (offer.parts) got.push(`Drone parts: ${offer.parts}.`);
  if (paid.weaponName) got.push(`${paid.weaponName}.`);
  got.push(...paid.extras);
  return got;
}

/** The grateful Slug captain. Three results and no odds. INFERRED: equal. */
export function slugCaptainGrateful(g: Game, lead: string, extras: string[] = []) {
  const kind = weighted(g, [
    ["free", 1],
    ["price", 1],
    ["thanks", 1],
  ] as const);
  if (kind === "free") {
    // Wiki citations:
    // > "The Slug Captain offers a free reactor upgrade for your help. It never hurts to get a little power boost!" — [[Rock and Slug standoff#Slug reward]]
    // > "Your ship reactor is upgraded." — [[Rock and Slug standoff#Slug reward]]
    const note = eventReactor(g);
    result(
      g,
      `${lead} ${eventText("event_ROCK_SLUG_GRATEFUL_2_text")}`,
      undefined,
      [...extras, note].filter(Boolean),
    );
    return;
  }
  if (kind === "price") {
    // Wiki citations:
    // > "The Slug Captain, thankful for your help, offers a reactor upgrade for your ship... for a 'fair' price." — [[Rock and Slug standoff#Slug reward]]
    // > "Agree to the price. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff#Slug reward]]
    // > "Decline the offer." — [[Rock and Slug standoff#Slug reward]]
    const n = rollPrice("ROCK_SLUG_ARGUMENT", "upgrade", (lo, hi) => between(g, [lo, hi]));
    const tail = extras.length ? ` ${extras.join(" ")}` : "";
    const choices = [];
    if (n != null) {
      choices.push({
        id: `s:rock-slug:upgrade:${n}`,
        label: `${eventText("event_ROCK_SLUG_GRATEFUL_3_c1_choice")} [${n} scrap]`,
      });
    }
    choices.push(opt("s:rock-slug:decline", "event_ROCK_SLUG_GRATEFUL_3_c2_choice"));
    card(g, `${lead} ${eventText("event_ROCK_SLUG_GRATEFUL_3_text")}${tail}`, choices);
    return;
  }
  // Wiki citations:
  // > "The Slugs offer their thanks for your help, and jump away. Their true appreciation is questionable, but at least you can get back to your mission." — [[Rock and Slug standoff#Slug reward]]
  // > "Nothing happens." — [[Rock and Slug standoff#Slug reward]]
  result(g, `${lead} ${eventText("event_ROCK_SLUG_GRATEFUL_1_text")}`, undefined, [
    ...extras,
    "Nothing happens.",
  ]);
}

/** Transaction 10-15 subtract_scrap. The amount is the one shown on the choice. */
export function rockSlugPay(g: Game, kind: "debt" | "upgrade", n: number): boolean {
  if (!priced("rock-and-slug-standoff", kind, n, "scrap") || g.scrap < n) return true;
  g.scrap -= n;
  if (kind === "debt") {
    // Wiki citations:
    // > "Offer to pay off the Rock debt. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff]]
    // > "You pay off the debt. The Rock Captain still seems annoyed at the Slug's getting their 'undeserved' scrap, but at least the situation will remain peaceful." — [[Rock and Slug standoff]]
    slugCaptainGrateful(g, eventText("event_ROCK_SLUG_ARGUMENT_c1_c1_text"), [`Scrap: -${n}.`]);
    return true;
  }
  // Wiki citations:
  // > "Agree to the price. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff#Slug reward]]
  // > "You let their team on board and after a short time they finish their work." — [[Rock and Slug standoff#Slug reward]]
  // > "Your ship reactor is upgraded." — [[Rock and Slug standoff#Slug reward]]
  const note = eventReactor(g);
  result(
    g,
    eventText("event_ROCK_SLUG_GRATEFUL_3_c1_text"),
    undefined,
    [`Scrap: -${n}.`, note].filter(Boolean),
  );
  return true;
}

/** Lanius ship attacking civilian, and the distress page, print the same two endings. */
function laniusCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? eventText("ship_LANIUS_CIVILIAN_deadCrew_text")
    : eventText("ship_LANIUS_CIVILIAN_destroyed_text");
  result(
    g,
    text,
    rollStandard(g, deadCrew ? "high" : "medium"),
    [],
    [opt("q:lanius-civilian:contact", "ship_LANIUS_CIVILIAN_destroyed_c1_choice")],
  );
}

const SCOUT_INSPECT = (): Choice[] => [opt("q:lanius-scout:inspect", "continue")];

/** Lanius ship absorbing automated scout. Destroyed pays medium standard. A crew kill pays high. Then inspect. */
function laniusScoutWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? eventText("ship_LANIUS_AUTO_REBEL_deadCrew_text")
    : eventText("ship_LANIUS_AUTO_REBEL_destroyed_text");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], SCOUT_INSPECT());
}

const STORAGE_INVESTIGATE = (): Choice[] => [
  opt("q:auto-storage:investigate", "ship_REBEL_AUTO_ITEM_destroyed_c1_choice"),
];

/** Auto-ship near storage station, and the nebula page. Destroyed pays medium scrap only. No crew-kill reward. */
function autoStorageWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(
    g,
    eventText("ship_REBEL_AUTO_ITEM_destroyed_text"),
    scrapOnly(g, "medium"),
    [],
    STORAGE_INVESTIGATE(),
  );
}

function storageInvestigate(g: Game, text: string) {
  card(g, text, STORAGE_INVESTIGATE());
}

/** Auto-ship near radar station. Combat Drone Mark I and II, and Anti-Ship Beam Drone I and II. */
const RADAR_COMBAT = ["COMBAT_1", "COMBAT_2", "COMBAT_BEAM", "COMBAT_BEAM_2"];

function hasRadarCombat(g: Game): boolean {
  const kit = g.player.kits.drones;
  return !!kit && kit.level > 0 && RADAR_COMBAT.includes(kit.target ?? "");
}

const RADAR_AFTER = (): Choice[] => [
  opt("q:auto-radar:hack", "ship_REBEL_AUTO_RADAR_destroyed_c1_choice"),
  opt("q:auto-radar:leave", "ship_REBEL_AUTO_RADAR_destroyed_c2_choice"),
  opt("q:auto-radar:drone", "ship_REBEL_AUTO_RADAR_destroyed_c3_choice"),
];

/** Destroyed pays medium scrap only. The page prints no crew-kill reward. */
function autoRadarWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(
    g,
    eventText("ship_REBEL_AUTO_RADAR_destroyed_text"),
    scrapOnly(g, "medium"),
    [],
    RADAR_AFTER(),
  );
}

/**
 * Access the station. Four results, no odds. INFERRED: equal.
 * The map sentence is flavor. This game has no map reveal.
 */
function autoRadarAccess(g: Game, lead = "") {
  const kind = pick(g, ["delay", "map", "pursuit", "nothing"] as const);
  let text: string;
  const extras: string[] = [];
  if (kind === "delay") {
    g.fleet = Math.max(0, g.fleet - 1);
    text = eventText("event_DEFENSE_RADAR_LIST_1_text");
    extras.push("The Rebel Fleet is delayed for 1 turn.");
  } else if (kind === "map") {
    text = eventText("event_DEFENSE_RADAR_LIST_2_text");
  } else if (kind === "pursuit") {
    g.pursuitDouble = true;
    text = eventText("event_DEFENSE_RADAR_LIST_4_text");
    extras.push("Rebel Fleet pursuit is doubled for 1 jump.");
  } else {
    text = eventText("event_DEFENSE_RADAR_LIST_3_text");
    extras.push("Nothing happens.");
  }
  result(g, lead ? `${lead} ${text}` : text, undefined, extras);
}

/** Pirate briber. Continue is not printed. INVENTED label. The five victim results have no odds. INFERRED: equal. */
const PIRATE_GONE = (): Choice[] => [opt("q:pirate-briber:gone", "continue")];

/** Destroyed pays a random scrap-only amount. INFERRED: low, medium, and high are equal.
 *  A crew kill pays medium standard. Then the victim. */
function pirateBriberWin(g: Game, deadCrew: boolean) {
  if (deadCrew) {
    result(
      g,
      eventText("ship_PIRATE_BRIBER_deadCrew_text"),
      rollStandard(g, "medium"),
      [],
      PIRATE_GONE(),
    );
    return;
  }
  result(
    g,
    eventText("ship_PIRATE_BRIBER_destroyed_text"),
    scrapOnly(g, pick(g, ["low", "medium", "high"])),
    [],
    PIRATE_GONE(),
  );
}

/**
 * Template:Pirate Smuggler / Rebel Transport. The weapon and drone schematic are not named: Rewards, "Weapon": "A
 * random weapon & T scrap." / "Drone": "A random drone schematic & T scrap." (`item`). The crewmember is not named,
 * so none is granted. The map sentence is not a reveal.
 * {{DuplicateEvent|2}} counts that result twice. The printed OR is the two sentences. INFERRED: those two
 * sentences are equal, and the other results are one each. A random scrap amount is low, medium, or high
 * scrap only, equal, because the page's code note says the lowercase "low" is treated as RANDOM.
 */
type SmugglePay =
  | { k: "scrap"; tier: SurrenderTier }
  | { k: "standard"; tier: SurrenderTier }
  | { k: "random" }
  | { k: "parts" };

/** `textId` is the archive text id of the row's result. */
type SmuggleRow = { textId: string; pay: SmugglePay; item?: "weapon" | "drone" };

function smugglePay(g: Game, pay: SmugglePay): SurrenderOffer {
  if (pay.k === "random") return scrapOnly(g, pick(g, ["low", "medium", "high"]));
  if (pay.k === "standard") return rollStandard(g, pay.tier);
  if (pay.k === "parts") {
    const offer = scrapOnly(g, "medium");
    // Template tooltip: medium drone parts is 1 drone part, plus medium scrap.
    offer.parts = 1;
    return offer;
  }
  return scrapOnly(g, pay.tier);
}

const SMUGGLE_HULL: [SmuggleRow, number][] = [
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_1_text",
      pay: { k: "scrap", tier: "medium" },
      item: "weapon",
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_3_text",
      pay: { k: "random" },
      item: "weapon",
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_5_text",
      pay: { k: "scrap", tier: "medium" },
      item: "drone",
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_9_text",
      pay: { k: "standard", tier: "low" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_7_text",
      pay: { k: "scrap", tier: "medium" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_11_text",
      pay: { k: "standard", tier: "high" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_6_text",
      pay: { k: "parts" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_4_text",
      pay: { k: "scrap", tier: "medium" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_8_text",
      pay: { k: "scrap", tier: "medium" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_10_text",
      pay: { k: "standard", tier: "low" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_DESTROYED_2_text",
      pay: { k: "standard", tier: "low" },
    },
    1,
  ],
];

const SMUGGLE_CREW: [SmuggleRow, number][] = [
  [
    {
      textId: "event_REBEL_TRANSPORT_CAPTURED_1_text",
      pay: { k: "scrap", tier: "medium" },
      item: "weapon",
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_CAPTURED_4_text",
      pay: { k: "scrap", tier: "medium" },
      item: "drone",
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_CAPTURED_2_text",
      pay: { k: "scrap", tier: "high" },
    },
    1,
  ],
  [
    {
      textId: "event_REBEL_TRANSPORT_CAPTURED_3_text",
      pay: { k: "scrap", tier: "medium" },
    },
    1,
  ],
];

/** Pirate smuggler. Template:Pirate Smuggler / Rebel Transport, destroyed and a crew kill. */
function smuggleCargoWin(g: Game, deadCrew: boolean) {
  const row = weighted(g, deadCrew ? SMUGGLE_CREW : SMUGGLE_HULL);
  result(
    g,
    eventText(row.textId),
    smugglePay(g, row.pay),
    row.item ? [grantRandomItem(g, row.item)] : [],
  );
}

const CRYSTAL_CONTACT = (): Choice[] => [opt("q:crystal-pirate:contact", "continue")];

/**
 * Template:Crystal Ship Saved. {{DuplicateEvent|2}} on the reward and on nothing. The printed OR is the two
 * sentences. INFERRED: each sentence is one copy. The Crystal weapon is not named, so none is granted.
 * A random amount of resources is rollStandard with no tier.
 */
const CRYSTAL_SAVED = (): [string, "stuff" | "nothing" | "weapon"][] => [
  [eventText("event_CRYSTAL_SAVED_3_text"), "stuff"],
  [eventText("event_CRYSTAL_SAVED_4_text"), "stuff"],
  [eventText("event_CRYSTAL_SAVED_1_text"), "nothing"],
  [eventText("event_CRYSTAL_SAVED_2_text"), "nothing"],
  [eventText("event_CRYSTAL_SAVED_5_text"), "weapon"],
];

function crystalContact(g: Game) {
  const [text, kind] = pick(g, CRYSTAL_SAVED());
  if (kind === "stuff") {
    result(g, text, rollStandard(g));
    return;
  }
  if (kind === "weapon") {
    result(g, text, undefined, ["You receive a Crystal weapon."]);
    return;
  }
  result(g, text, undefined, ["Nothing happens."]);
}

/**
 * Pirate ship selling drones. The unnamed schematic is not offered. Five parts for 25 scrap stay on the static choice.
 */
function pirateDroneDock(g: Game) {
  card(g, eventText("event_DOCK_DRONE_SALESMAN_text"), [
    opt("c:pirate-ship-selling-drones:0", "event_DOCK_DRONE_SALESMAN_c1_choice"),
    opt("q:pirate-drones:nothing", "event_DOCK_DRONE_SALESMAN_c6_choice"),
    opt("q:pirate-drones:upgrade", "event_DOCK_DRONE_SALESMAN_c3_choice"),
  ]);
}

/**
 * Tooltip "1-2 fires or a breach". The page prints no odds.
 * INFERRED: the two effects are equally likely. The second flame is a coin flip, the same as Fire Bomb.
 */
function salesmanMark(g: Game, room: { fire: number; breach: number; title: string }): string {
  if (rand(g) < 0.5) {
    const n = 1 + (rand(g) < 0.5 ? 1 : 0);
    room.fire = Math.min(4, room.fire + n);
    return n === 1 ? `1 fire in ${room.title}.` : `2 fires in ${room.title}.`;
  }
  room.breach += 1;
  return `A breach opens in ${room.title}.`;
}

/** 1 damage to that room's system when a bar is left, plus the tooltip's effect. */
function salesmanRoom(
  g: Game,
  room: { fire: number; breach: number; title: string; system?: string | null },
): string {
  const bits: string[] = [];
  const id = room.system;
  const sys = id ? g.player.systems[id as "engines"] : undefined;
  if (id && sys && sys.level > 0 && sys.damage < sys.level) {
    hurtSystem(g.player, id as "engines", 1);
    bits.push(`1 damage to ${id}.`);
  }
  bits.push(salesmanMark(g, room));
  return bits.join(" ");
}

/** Buy nothing: 3 hull, engines, two random rooms, then a default Pirate ship fight. */
function pirateDroneNothing(g: Game) {
  const dead = damageHull(g, 3);
  const engines = g.player.rooms.find((r) => r.system === "engines");
  if (engines) salesmanRoom(g, engines);
  else if ((g.player.systems.engines?.level ?? 0) > (g.player.systems.engines?.damage ?? 0)) {
    hurtSystem(g.player, "engines", 1);
  }
  // INFERRED: every player room is equally likely, and the two draws are distinct when the ship has two rooms.
  const rooms = g.player.rooms;
  const first = pick(g, rooms);
  const rest = rooms.filter((r) => r !== first);
  const second = rest.length ? pick(g, rest) : first;
  salesmanRoom(g, first);
  salesmanRoom(g, second);
  if (dead) return;
  pageFight(
    g,
    eventText("event_DOCK_DRONE_SALESMAN_c6_text"),
    "Pirate ship",
    "pirate-ship-selling-drones",
  );
}

/**
 * Buy Drone Control system upgrade. The packed rows have no odds. INFERRED: equal.
 * The level is set to a whole number in the printed band. The scrap is a whole number in that result's band.
 * An empty table leaves the system alone. One row is not a pick. The level rolls only after the ship can pay.
 */
function pirateDroneUpgrade(g: Game) {
  const kit = g.player.kits.drones;
  if (!kit || kit.level <= 0) return;
  const rows = upgradeRows("pirate-ship-selling-drones");
  if (rows.length === 0) return;
  const id = rows.length === 1 ? rows[0] : pick(g, rows);
  const cost = rollBand("pirate-ship-selling-drones", id, "scrap", (lo, hi) =>
    between(g, [lo, hi]),
  );
  if (cost == null || g.scrap < cost) return;
  const level = rollBand("pirate-ship-selling-drones", id, "level", (lo, hi) =>
    between(g, [lo, hi]),
  );
  if (level == null) return;
  g.scrap -= cost;
  kit.level = level;
  if (kit.power > kit.level) kit.power = kit.level;
  result(g, `Drone Control at level ${level}.`, undefined, [`Scrap: -${cost}.`]);
}

const REBEL_CHECKPOINT_BRIBE = () => [
  eventText("text_REBEL_BRIBE_TEXT_1"),
  eventText("text_REBEL_BRIBE_TEXT_2"),
  eventText("text_REBEL_BRIBE_TEXT_3"),
  eventText("text_REBEL_BRIBE_TEXT_4"),
];

/** Rebel checkpoint. The packed scrap band. The four texts have no odds. INFERRED: equal. Then the civilians. */
function rebelCheckpointBribe(g: Game, n: number) {
  if (!priced("rebel-checkpoint", "bribe", n, "scrap") || g.scrap < n) return;
  g.scrap -= n;
  const text = pick(g, REBEL_CHECKPOINT_BRIBE());
  card(
    g,
    `${text}

Scrap: -${n}.`,
    [opt("q:rebel-checkpoint:contact", "event_REBEL_CHECKPOINT_c2_c1_choice")],
  );
}

/** Contact the civilian ships. Four results and no odds. INFERRED: equal. */
function rebelCheckpointContact(g: Game) {
  const kind = pick(g, ["fight", "standard", "scrap", "nothing"] as const);
  if (kind === "fight") {
    pageFight(g, eventText("event_REBEL_BRIBE_RESULT_4_text"), "Rebel ship", "rebel-checkpoint");
    return;
  }
  if (kind === "standard") {
    result(g, eventText("event_REBEL_BRIBE_RESULT_3_text"), rollStandard(g, "low"));
    return;
  }
  if (kind === "scrap") {
    result(g, eventText("event_REBEL_BRIBE_RESULT_2_text"), scrapOnly(g, "low"));
    return;
  }
  result(g, eventText("event_REBEL_BRIBE_RESULT_1_text"), undefined, ["Nothing happens."]);
}

/** Pirate ship attacking Crystal, and Mantis ship attacking Crystal.
 * Both print the same destroyed and crew-kill sentences, then Template:Crystal Ship Saved.
 * Destroyed pays medium standard. A crew kill pays high.
 */
function crystalPirateWin(g: Game, deadCrew: boolean) {
  // Wiki citations:
  // > "After destroying enemy ship The ship explodes and you scrap what you can." — [[Pirate ship attacking Crystal]]
  // > "You receive medium scrap with resources." — [[Pirate ship attacking Crystal]]
  // > "You contact the Crystal ship." — [[Pirate ship attacking Crystal]]
  // > "After killing enemy crew With the crew dead you take as much salvage from the ship as possible." — [[Pirate ship attacking Crystal]]
  // > "You receive high scrap with resources." — [[Pirate ship attacking Crystal]]
  const text = deadCrew
    ? eventText("ship_PIRATE_CRYSTAL_deadCrew_text")
    : eventText("ship_PIRATE_CRYSTAL_destroyed_text");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], CRYSTAL_CONTACT());
}

const MANTIS_SLUG_AFTER = (): Choice[] => [
  opt("q:mantis-slug:leave", "ship_SLUG_DISTRESS_MANTIS_destroyed_c1_choice"),
  opt("q:mantis-slug:finish", "ship_SLUG_DISTRESS_MANTIS_destroyed_c2_choice"),
];

/** Mantis ship attacking Slug ship. Both endings pay medium standard, then the Slug vessel. */
function mantisSlugSaved(g: Game) {
  // Wiki citations:
  // > "After destroying enemy ship or after killing enemy crew The Mantis defeated, you contact the weakened Slug vessel. \"You ssseee,\" they begin, \"we are are most grateful, but, that is, we do not currently have the liquid asssets to reward you at this time.\"" — [[Mantis ship attacking Slug ship]]
  // > "You receive medium scrap with resources." — [[Mantis ship attacking Slug ship]]
  result(
    g,
    eventText("ship_SLUG_DISTRESS_MANTIS_destroyed_text"),
    rollStandard(g, "medium"),
    [],
    MANTIS_SLUG_AFTER(),
  );
}

/** Finish them off. Two results, no odds. INFERRED: equal. The augmentation is not named: Rewards, "Augment": "A random
 *  augmentation & T scrap."
 *  The loot is a random standard reward. INFERRED: low, medium, and high are equal. */
function mantisSlugFinish(g: Game) {
  // Wiki citations:
  // > "Finish them off." — [[Mantis ship attacking Slug ship]]
  if (pick(g, ["augment", "loot"] as const) === "augment") {
    // Wiki citations:
    // > "The Slug captain hails you: \"A misstake! A sssimple misstake. Of course we can pay you! Ssseee? An augmentation has already transported.\" You allow them to leave with their lives." — [[Mantis ship attacking Slug ship]]
    // > "You receive an augmentation with low scrap." — [[Mantis ship attacking Slug ship]]
    result(g, eventText("event_SLUG_DISTRESS_MANTIS_SURRENDER_2_text"), scrapOnly(g, "low"), [
      grantRandomItem(g, "augment"),
    ]);
    return;
  }
  // Wiki citations:
  // > "It doesn't look like they can stand much more damage. After a few shots their ship breaks apart and you move in to loot the remains." — [[Mantis ship attacking Slug ship]]
  // > "You receive a random amount of scrap with resources." — [[Mantis ship attacking Slug ship]]
  result(
    g,
    eventText("event_SLUG_DISTRESS_MANTIS_SURRENDER_1_text"),
    rollStandard(g, pick(g, ["low", "medium", "high"])),
  );
}

/** Zoltan security checkpoint. Medium fuel is 2-4. */
function zoltanCheckpointFuel(g: Game, id: string, text: string) {
  const n = rollFuel(id, (lo, hi) => between(g, [lo, hi]));
  g.fuel += n;
  result(g, text, undefined, [`Fuel: ${n}.`]);
}

/** The pirate is gone. Five results, no odds. INFERRED: equal. */
function pirateGone(g: Game) {
  const kind = pick(g, ["store", "repair", "rebel", "scrap", "nothing"] as const);
  if (kind === "store") {
    result(
      g,
      eventText("event_PIRATE_BRIBER_WIN_4_text"),
      undefined,
      [],
      [opt("q:open-store", "continue")],
    );
    return;
  }
  if (kind === "repair") {
    result(g, eventText("event_PIRATE_BRIBER_WIN_5_text"), undefined, [repair(g, 15)]);
    return;
  }
  if (kind === "rebel") {
    card(g, eventText("event_PIRATE_BRIBER_WIN_1_text"), [
      opt("q:pirate-briber:salvage", "event_PIRATE_BRIBER_WIN_1_c1_choice"),
      opt("q:pirate-briber:delay", "event_PIRATE_BRIBER_WIN_1_c2_choice"),
    ]);
    return;
  }
  if (kind === "scrap") {
    result(g, eventText("event_PIRATE_BRIBER_WIN_2_text"), scrapOnly(g, "medium"));
    return;
  }
  result(g, eventText("event_PIRATE_BRIBER_WIN_3_text"), undefined, ["Nothing happens."]);
}

/** Refueling platform garbled broadcast. Both endings pay medium scrap with resources, then the station's fuel.
 *  The extra fuel is the printed band, inclusive 3-5 in campaign, on top of whatever rollStandard already paid.
 *  A missing band adds no fuel and does not roll. No Investigate button. */
function garbledBroadcastWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? eventText("ship_LANIUS_FUELING_STATION_SHIP_deadCrew_text")
    : eventText("ship_LANIUS_FUELING_STATION_SHIP_destroyed_text");
  const offer = rollStandard(g, "medium");
  const extra = rollBand("refueling-platform-garbled-broadcast", "extra", "fuel", (lo, hi) =>
    between(g, [lo, hi]),
  );
  const station = `${text}

${eventText("event_LANIUS_FUELING_STATION_END_text")}`;
  if (extra == null) {
    result(g, station, offer);
    return;
  }
  const line = `Fuel: ${extra}.`;
  g.fuel += extra;
  result(g, station, offer, [line]);
}

/** Refugee (Zoltan) and Refugee distress (Zoltan). Destroyed pays medium scrap with resources. A crew kill pays high. */
function refugeeZoltanWin(slug: string): Win {
  return (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_ZOLTAN_REFUGEE_deadCrew_text")
      : eventText("ship_ZOLTAN_REFUGEE_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, deadCrew ? "high" : "medium"),
      [],
      [{ id: `s:${slug}:contact`, label: eventText("ship_ZOLTAN_REFUGEE_destroyed_c1_choice") }],
    );
  };
}

/** Refugee (Pirate). Destroyed pays medium scrap with resources and the shared thanks.
 *  A crew kill pays high, and that contact says the pirates have been following them. */
function refugeePirateWin(slug: string): Win {
  return (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_PIRATE_REFUGEE_deadCrew_text")
      : eventText("ship_PIRATE_REFUGEE_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, deadCrew ? "high" : "medium"),
      [],
      [
        {
          id: deadCrew ? `s:${slug}:contact-dead` : `s:${slug}:contact`,
          label: eventText("ship_PIRATE_REFUGEE_destroyed_c1_choice"),
        },
      ],
    );
  };
}

/** Pirate ship attacking civilian, and the Lanius variant. Destroyed is medium standard.
 *  A crew kill is high. Then Contact the civilian ship. */
function pirateCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? eventText("ship_PIRATE_CIVILIAN_deadCrew_text")
    : eventText("ship_PIRATE_CIVILIAN_destroyed_text");
  result(
    g,
    text,
    rollStandard(g, deadCrew ? "high" : "medium"),
    [],
    [opt("q:lanius-civilian:contact", "ship_PIRATE_CIVILIAN_destroyed_c1_choice")],
  );
}

/**
 * Event pages that print their own {{Winning|destroyed=true}} / {{Winning|deadCrew=true}} reward, keyed by the slug
 * startCombat received. A page with "(default rewards)" is not listed; winCombat pays the default then.
 */
export const PAGE_WINS: Record<string, Win> = {
  // ---- Ship surrender Events pages (cited-events-surrender.ts) ----
  // Settlement mercenary work: "destroyed/deadCrew ... You receive low scrap with resources."
  // Wiki citations:
  // > "After destroying enemy ship or after killing enemy crew With all of the would-be pirates dead, you think it best not to return to the settlement... You prepare to jump." — [[Settlement mercenary work]]
  // > "You receive low scrap with resources." — [[Settlement mercenary work]]
  "settlement-mercenary-work": std(
    "low",
    "low",
    lazyText("ship_SQUAT_PIRATE_MERCENARY_destroyed_text"),
  ),
  // The Black Raven: destroyed -> medium, deadCrew -> high scrap with resources.
  // Wiki citations:
  // > "\"The Black Raven\" breaks apart and you salvage the remains." — [[The Black Raven#Fighting the Black Raven]]
  // > "You receive medium scrap with resources." — [[The Black Raven#Fighting the Black Raven]]
  // > "The once-dreaded pirate Nights has been killed and you proceed to loot his ship." — [[The Black Raven#Fighting the Black Raven]]
  // > "You receive high scrap with resources." — [[The Black Raven#Fighting the Black Raven]]
  "the-black-raven": std(
    "medium",
    "high",
    lazyText("ship_DONOR_BLACK_RAVEN_destroyed_text"),
    lazyText("ship_DONOR_BLACK_RAVEN_deadCrew_text"),
  ),
  // Zoltan ship asks to dock: destroyed -> low, deadCrew -> medium scrap with resources.
  // Wiki citations:
  // > "While you search the debris, you wonder what it was that could have provoked them to act so irrationally." — [[Zoltan ship asks to dock]]
  // > "You receive low scrap with resources." — [[Zoltan ship asks to dock]]
  // > "While you scrap their ship, you wonder what it was that could have provoked them to act so irrationally." — [[Zoltan ship asks to dock]]
  // > "You receive medium scrap with resources." — [[Zoltan ship asks to dock]]
  "zoltan-ship-asks-to-dock": std(
    "low",
    "medium",
    lazyText("ship_ZOLTAN_SCIENCE_DOCK_destroyed_text"),
    lazyText("ship_ZOLTAN_SCIENCE_DOCK_deadCrew_text"),
  ),
  // ---- Other cited pages with a quest branch ----
  // Mantis ship-collectors: destroyed -> medium, deadCrew -> high scrap with resources.
  // Wiki citations:
  // > "After destroying enemy ship Their ship breaks apart and you move in to scrap the remains." — [[Mantis ship-collectors]]
  // > "You receive medium scrap with resources." — [[Mantis ship-collectors]]
  // > "After killing enemy crew With no more crew on board you are free to salvage what you can from the remains." — [[Mantis ship-collectors]]
  // > "You receive high scrap with resources." — [[Mantis ship-collectors]]
  "mantis-ship-collectors": std(
    "medium",
    "high",
    lazyText("ship_DONOR_MANTIS_CHASE1_destroyed_text"),
    lazyText("ship_DONOR_MANTIS_CHASE1_deadCrew_text"),
  ),
  // Rebel ship attacking Federation loyalists: "medium scrap with resources" -> "Contact the Federation ship".
  "rebel-ship-attacking-federation-loyalists": std(
    "medium",
    "medium",
    lazyText("ship_REBEL_VS_FEDERATION_destroyed_text"),
    lazyText("ship_REBEL_VS_FEDERATION_deadCrew_text"),
    () => [opt("q:loyalists:contact", "ship_REBEL_VS_FEDERATION_destroyed_c1_choice")],
  ),
  // Slug ship boarding Rock ship: both endings pay medium scrap, then the freighter.
  // The nothing result is printed twice. The two sentences are alternatives. INFERRED: equal.
  "slug-ship-boarding-rock-ship": (g, deadCrew) => {
    // Wiki citations:
    // > "After destroying enemy ship With the Slug ship destroyed, you retrieve some scrap and return to the Rock ship.After killing enemy crew With the Slugs no longer a threat, you strip the ship and return to the Rockmen." — [[Slug ship boarding Rock ship]]
    // > "You receive medium scrap with resources." — [[Slug ship boarding Rock ship]]
    const text = deadCrew
      ? eventText("ship_JELLY_DISTRESS_ROCK_deadCrew_text")
      : eventText("ship_JELLY_DISTRESS_ROCK_destroyed_text");
    const extras: string[] = [];
    if (
      weighted(g, [
        ["nothing", 2],
        ["abandoned", 1],
      ] as const) === "abandoned"
    ) {
      // Wiki citations:
      // > "It appears the Rock ship was long since abandoned. You strip what you can from it." — [[Slug ship boarding Rock ship]]
      // > "You receive medium scrap with resources." — [[Slug ship boarding Rock ship]]
      const more = rollStandard(g, "medium");
      payOffer(g, more, true);
      extras.push(eventText("event_SLUG_DISTRESS_ROCK_RESULT_3_text"));
      if (more.scrap) extras.push(`Scrap: ${more.scrap}.`);
      if (more.fuel) extras.push(`Fuel: ${more.fuel}.`);
      if (more.missiles) extras.push(`Missiles: ${more.missiles}.`);
      if (more.parts) extras.push(`Drone parts: ${more.parts}.`);
    } else {
      // Wiki citations:
      // > "2× It appears that the Rock ship left during your battle. You doubt they could have been more ungrateful for your assistance. OR After the battle the Rock ship hails you. Their captain simply says, \"Thanks.\" and jumps away. That's pretty gracious of them, considering the Rockmen's reputation." — [[Slug ship boarding Rock ship]]
      // > "Nothing happens." — [[Slug ship boarding Rock ship]]
      const line =
        weighted(g, [
          ["left", 1],
          ["thanks", 1],
        ] as const) === "left"
          ? eventText("event_SLUG_DISTRESS_ROCK_RESULT_1_text")
          : eventText("event_SLUG_DISTRESS_ROCK_RESULT_2_text");
      extras.push(line, "Nothing happens.");
    }
    result(g, text, rollStandard(g, "medium"), extras);
  },
  // Mantis ships battle for Rock freighter. Both endings pay medium standard. Default salvage is not paid.
  "mantis-ships-battle-for-rock-freighter": (g) => {
    // Wiki citations:
    // > "After destroying enemy ship or after killing enemy crew In the time it took you to eliminate the Mantis ship the Rock must have repaired their FTL drive and jumped away. You pick the bones of both Mantis vessels." — [[Mantis ships battle for Rock freighter]]
    // > "You receive medium scrap with resources." — [[Mantis ships battle for Rock freighter]]
    result(
      g,
      eventText("ship_MANTIS_ROCK_MANTIS_FREIGHTER_destroyed_text"),
      rollStandard(g, "medium"),
    );
  },
  // Lanius ship absorbing automated scout. Destroyed pays medium standard. A crew kill pays high. Then inspect.
  "lanius-ship-absorbing-automated-scout": laniusScoutWin,
  // Auto-ship near storage station. Destroyed pays medium scrap only, then the station.
  // The page prints no crew-kill reward.
  "auto-ship-near-storage-station": autoStorageWin,
  "auto-ship-near-storage-station-in-nebula": autoStorageWin,
  // Auto-ship near radar station. Destroyed pays medium scrap only. The page prints no crew-kill reward.
  "auto-ship-near-radar-station": autoRadarWin,
  // Auto-ship near sensor station. Destroyed pays low scrap only. The map reveal is not wired.
  // The page prints no crew-kill reward.
  "auto-ship-near-sensor-station": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("ship_REBEL_AUTO_MAP_destroyed_text"), scrapOnly(g, "low"));
  },
  // Auto-ship fight in nebula. The page prints medium scrap with resources on a destroyed ship and no crew-kill reward.
  "auto-ship-fight-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Auto-ship fight (Crystal) has no choice. Arrival calls this fight.
  // The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward.
  "auto-ship-fight-crystal": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Auto-ship fight near sun. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The red giant stays on the fight slug.
  "auto-ship-fight-near-sun": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Auto-ship fight in asteroid field. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The asteroid field stays on the fight.
  "auto-ship-fight-in-asteroid-field": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Auto-ship fight. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward.
  "auto-ship-fight": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Crystal ship attacking Federation loyalists. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then "You contact the Federation ship." Default salvage is not paid.
  "crystal-ship-attacking-federation-loyalists": std(
    "medium",
    "high",
    lazyText("ship_CRYSTAL_FED_destroyed_text"),
    lazyText("ship_CRYSTAL_FED_deadCrew_text"),
    [opt("q:crystal-loyalists:contact", "continue")],
  ),
  // Crystal fight with surrender offer (Human crew). Both endings pay medium scrap with resources.
  // The surrender human is a separate offer. This win does not grant a crewmember.
  "crystal-fight-with-surrender-offer-human-crew": std(
    "medium",
    "medium",
    lazyText("ship_CRYSTAL_HUNTER_destroyed_text"),
    lazyText("ship_CRYSTAL_HUNTER_deadCrew_text"),
  ),
  // Crystal fight with surrender offer (hull repairs). Both endings pay medium scrap with resources.
  // The surrender's fuel and 8 repairs are a separate offer. This win does not repair the hull.
  "crystal-fight-with-surrender-offer-hull-repairs": std(
    "medium",
    "medium",
    lazyText("ship_CRYSTAL_CONVOY_destroyed_text"),
    lazyText("ship_CRYSTAL_CONVOY_deadCrew_text"),
  ),
  // Rebel ship attacking civilians in Last Stand. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then contact the survivors.
  "rebel-ship-attacking-civilians-in-last-stand": std(
    "medium",
    "high",
    lazyText("ship_BOSS_SCOUT_RESCUE_destroyed_text"),
    lazyText("ship_BOSS_SCOUT_RESCUE_deadCrew_text"),
    () => [opt("q:last-stand-survivors:contact", "ship_BOSS_SCOUT_RESCUE_destroyed_c1_choice")],
  ),
  // Rebel ship attacking refueling outpost. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then contact the outpost.
  "rebel-ship-attacking-refueling-outpost": std(
    "medium",
    "high",
    lazyText("ship_SQUAT_REFUEL_STATION_destroyed_text"),
    lazyText("ship_SQUAT_REFUEL_STATION_deadCrew_text"),
    [opt("q:refuel-outpost:contact", "continue")],
  ),
  // Rebel ship attacking Crystal ship. Attack the Rebel: both endings share the bones sentence.
  // Destroyed pays medium scrap with resources. A crew kill pays high. Then contact the Crystal ship.
  // Attack the Crystalline ship does not set the map, so winCombat pays the default salvage.
  "rebel-ship-attacking-crystal-ship": (g, deadCrew) => {
    if (rebelCrystalBones.get(g) !== true) return false;
    rebelCrystalBones.delete(g);
    result(
      g,
      eventText("ship_REBEL_CRYSTAL_REBEL_CRYSTAL_destroyed_text"),
      rollStandard(g, deadCrew ? "high" : "medium"),
      [],
      [opt("q:rebel-crystal:contact", "continue")],
    );
  },
  // Zoltan wise man. After the fight, both endings contact him and then he implodes.
  // Destroyed pays low scrap with resources, then high. A crew kill pays medium, then high.
  // The page nests the two rewards and prints no choice, so both are paid on this card.
  "zoltan-wise-man": (g, deadCrew) => {
    const lead = deadCrew
      ? eventText("ship_ZOLTAN_RIFT_MANTIS_deadCrew_text")
      : eventText("ship_ZOLTAN_RIFT_MANTIS_destroyed_text");
    const rage = eventText("event_ZOLTAN_RIFT_SUCCESS_text");
    const first = rollStandard(g, deadCrew ? "medium" : "low");
    const second = rollStandard(g, "high");
    result(g, `${lead}\n\n${rage}`, first, offerLines(g, second));
  },
  // Slug hacker (choice). The four fights share this id. The choice sets the tier.
  // No choice: the page prints no reward, so winCombat pays the default salvage.
  "slug-hacker-choice": (g, deadCrew) => {
    const path = choiceWin.get(g);
    choiceWin.delete(g);
    if (path === "shields") {
      result(
        g,
        deadCrew
          ? eventText("ship_JELLY_STATUS_SHIELDS_deadCrew_text")
          : eventText("ship_JELLY_STATUS_SHIELDS_destroyed_text"),
        rollStandard(g, deadCrew ? "high" : "medium"),
      );
      return;
    }
    if (path === "oxygen") {
      result(
        g,
        deadCrew
          ? eventText("ship_JELLY_STATUS_OXYGEN_deadCrew_text")
          : eventText("ship_JELLY_STATUS_OXYGEN_destroyed_text"),
        rollStandard(g, "medium"),
      );
      return;
    }
    if (path === "weapons") {
      result(
        g,
        deadCrew
          ? eventText("ship_JELLY_STATUS_WEAPONS_deadCrew_text")
          : eventText("ship_JELLY_STATUS_WEAPONS_destroyed_text"),
        rollStandard(g, "high"),
      );
      return;
    }
    if (path === "hack") {
      result(
        g,
        deadCrew
          ? eventText("ship_JELLY_STATUS_WEAPONS_deadCrew_text")
          : eventText("ship_JELLY_STATUS_HACKING_destroyed_text"),
        rollStandard(g, "high"),
      );
      return;
    }
    return false;
  },
  // Slug hacker (doors). Continue: destroyed pays medium scrap with resources, a crew kill pays high.
  // Counter the remote hacking: both endings pay high. The wiki's "[sic]" after "weapon system" is not shown.
  "slug-hacker-doors": (g, deadCrew) => {
    const counter = doorsCounterWin.get(g) === true;
    doorsCounterWin.delete(g);
    if (counter) {
      result(
        g,
        deadCrew
          ? eventText("ship_JELLY_STATUS_WEAPONS_deadCrew_text")
          : eventText("ship_JELLY_STATUS_HACKING_destroyed_text"),
        rollStandard(g, "high"),
      );
      return;
    }
    result(
      g,
      deadCrew
        ? eventText("ship_JELLY_STATUS_OXYGEN_FIRE_deadCrew_text")
        : eventText("ship_JELLY_STATUS_DOORS_destroyed_text"),
      rollStandard(g, deadCrew ? "high" : "medium"),
    );
  },
  // Slug hacker (oxygen). Both endings pay medium scrap with resources.
  // The oxygen shutdown, the halved oxygen, and the hacking shutdown already end with the fight.
  "slug-hacker-oxygen": std(
    "medium",
    "medium",
    lazyText("ship_JELLY_STATUS_OXYGEN_destroyed_text"),
    lazyText("ship_JELLY_STATUS_OXYGEN_FIRE_deadCrew_text"),
  ),
  // Slug hacker (medical). Fight a Slug ship: both endings pay high scrap with resources.
  // The medbay shutdown, the halved medbay, and the hacking shutdown already end with the fight.
  "slug-hacker-medical": std(
    "high",
    "high",
    lazyText("ship_JELLY_STATUS_MEDBAY_destroyed_text"),
    lazyText("ship_JELLY_STATUS_MEDBAY_deadCrew_text"),
  ),
  // Lanius fight with friendly ASB support. Destroyed pays medium scrap with resources.
  // A crew kill pays high. After the fight, two results and no odds. INFERRED: equal.
  // The battery shot itself stays on the fight. Default salvage is not paid.
  "lanius-fight-with-friendly-asb-support": (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_LANIUS_BOARDERS_PDS_deadCrew_text")
      : eventText("ship_LANIUS_BOARDERS_PDS_destroyed_text");
    const tier = deadCrew ? "high" : "medium";
    if (
      weighted(g, [
        ["repair", 1],
        ["leave", 1],
      ] as const) === "repair"
    ) {
      result(
        g,
        `${text} ${eventText("event_LANIUS_BOARDERS_PDS_LIST_1_text")}`,
        rollStandard(g, tier),
        [repair(g, 8)],
      );
      return;
    }
    result(
      g,
      `${text} ${eventText("event_LANIUS_BOARDERS_PDS_LIST_2_text")}`,
      rollStandard(g, tier),
      ["Nothing happens."],
    );
  },
  // Auto-ship fight in plasma storm. Both fight paths print that destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The engines and cloaking escapes stay as they are.
  "auto-ship-fight-in-plasma-storm": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("event_DESTROYED_DEFAULT_1_text"), rollStandard(g, "medium"));
  },
  // Rebel ship warning. Both endings pay medium scrap with resources.
  // The 40 second run and doubled pursuit are the ship event's escape and gotaway.
  "rebel-ship-warning": std(
    "medium",
    "medium",
    lazyText("ship_SQUAT_WARNING_destroyed_text"),
    lazyText("ship_SQUAT_WARNING_deadCrew_text"),
  ),
  // Auto-ship warning. {{Winning|destroyed=true}}: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit are the ship event's escape and gotaway.
  "auto-ship-warning": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("ship_REBEL_AUTO_WARNING_destroyed_text"), rollStandard(g, "low"));
  },
  // Auto-ship warning in nebula. Same destroyed line: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit are the ship event's escape and gotaway.
  "auto-ship-warning-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("ship_REBEL_AUTO_WARNING_destroyed_text"), rollStandard(g, "low"));
  },
  // Auto-ship attacking civilian. Destroyed pays low standard, then Contact the civilian ship.
  // Template:Save the Civilian Ship is the same card as the Lanius civilian contact.
  // The page prints no crew-kill reward. Stay out of it is the nothing choice.
  "auto-ship-attacking-civilian": (g, deadCrew) => {
    if (deadCrew) return false;
    result(
      g,
      eventText("ship_REBEL_AUTO_CIVILIAN_destroyed_text"),
      rollStandard(g, "low"),
      [],
      [opt("q:lanius-civilian:contact", "ship_REBEL_AUTO_CIVILIAN_destroyed_c1_choice")],
    );
  },
  // Mantis ship attacking civilian. Destroyed and a crew kill both pay medium standard,
  // then Attempt to contact the civilian ship. Template:Save the Civilian Ship is the
  // same card as the Lanius civilian contact. Stay out of it is three sentences in CHOICES.
  "mantis-ship-attacking-civilian": (g, deadCrew) => {
    // Wiki citations:
    // > "The Mantis ship breaks apart." — [[Mantis ship attacking civilian]]
    // > "No more life signs detected on the pirate ship. You hasten to contact the civilian ship." — [[Mantis ship attacking civilian]]
    // > "You receive medium scrap with resources." — [[Mantis ship attacking civilian]]
    // > "Attempt to contact the civilian ship." — [[Mantis ship attacking civilian]]
    const text = deadCrew
      ? eventText("ship_MANTIS_CIVILIAN_deadCrew_text")
      : eventText("ship_MANTIS_CIVILIAN_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, "medium"),
      [],
      [opt("q:lanius-civilian:contact", "ship_MANTIS_CIVILIAN_destroyed_c1_choice")],
    );
  },
  // Pirate ship attacking civilian, and the Lanius variant. Destroyed pays medium standard.
  // A crew kill pays high. Then Contact the civilian ship. Template:Save the Civilian Ship
  // is the same card. Stay out / Avoid the conflict are the nothing choices.
  "pirate-ship-attacking-civilian": pirateCivilianWin,
  // Pirate briber. Destroyed pays random scrap only. A crew kill pays medium standard. Then the victim.
  "pirate-briber": pirateBriberWin,
  // Pirate smuggler. Template:Pirate Smuggler / Rebel Transport. Unnamed weapon and schematic are random; crew is not granted.
  "pirate-smuggler": smuggleCargoWin,
  // Rebel transport ship. The same template. The 40 second run and the refusal to surrender stay in escape.ts and surrender.ts.
  "rebel-transport-ship": smuggleCargoWin,
  // Rebel ship supplying civilians. Destroyed pays low scrap with resources. A crew kill pays medium.
  // Then steal the supplies or leave the civilians. Default salvage is not paid.
  "rebel-ship-supplying-civilians": rebelSupplyWin,
  "zoltan-retake-the-ship": zoltanRaftWin,
  // Refugee (Zoltan) and Refugee distress (Zoltan). Contact pays low scrap with resources in filler-events.ts.
  "refugee-zoltan": refugeeZoltanWin("refugee-zoltan"),
  "refugee-distress-zoltan": refugeeZoltanWin("refugee-distress-zoltan"),
  // Refugee (Pirate). Contact after a hull kill is the shared thanks. A crew kill uses the following-trail sentence.
  "refugee-pirate": refugeePirateWin("refugee-pirate"),
  "refugee-distress-pirate": refugeePirateWin("refugee-distress-pirate"),
  // Refugee (Slug). type=slug is the pirate bait, so the contacts match Refugee (Pirate).
  "refugee-slug": refugeePirateWin("refugee-slug"),
  "refugee-distress-slug": refugeePirateWin("refugee-distress-slug"),
  // Pirate ship attacking Crystal. Destroyed pays medium standard. A crew kill pays high. Then Crystal Ship Saved.
  "pirate-ship-attacking-crystal": crystalPirateWin,
  // Mantis ship attacking Crystal. The same two endings and the same Crystal ship contact.
  "mantis-ship-attacking-crystal": crystalPirateWin,
  // Engi distress Rebel fight. Destroyed pays low standard. A crew kill pays medium. Then the Engi.
  "engi-distress-rebel-fight": engiDistressWin,
  // Rebel fight among Rebel fleet. The page prints low scrap only on a hull kill and medium scrap with resources on a crew kill.
  // The two endings are separate printed results. Default salvage is not paid.
  "rebel-fight-among-rebel-fleet": (g, deadCrew) => {
    // Wiki citations:
    // > "After destroying enemy ship There's no time to salvage all of the wreck, the fleet is still nearby. Get ready to jump!" — [[Rebel fight among Rebel fleet]]
    // > "You receive low scrap." — [[Rebel fight among Rebel fleet]]
    // > "After killing enemy crew There isn't time to salvage the enemy ship but your crew made off with a few nearby materials. Prepare to jump." — [[Rebel fight among Rebel fleet]]
    // > "You receive medium scrap with resources." — [[Rebel fight among Rebel fleet]]
    if (deadCrew) {
      result(g, eventText("ship_BOSS_FLEETS_REBEL_deadCrew_text"), rollStandard(g, "medium"));
      return;
    }
    result(g, eventText("ship_BOSS_FLEETS_REBEL_destroyed_text"), scrapOnly(g, "low"));
  },
  // Rebel fight among Federation and Rebel fleets. This page prints low scrap only on a hull kill and medium scrap with resources on a crew kill.
  // The two endings are separate printed results. Default salvage is not paid.
  "rebel-fight-among-federation-and-rebel-fleets": (g, deadCrew) => {
    if (deadCrew) {
      result(g, eventText("ship_BOSS_FLEETS_REBEL_deadCrew_text"), rollStandard(g, "medium"));
      return;
    }
    result(g, eventText("ship_BOSS_FLEETS_REBEL_destroyed_text"), scrapOnly(g, "low"));
  },
  // Pirate ships in plasma storm. Destroyed: low fuel (1-3) and low scrap. Crew kill: high fuel (3-6) and high scrap.
  // Rewards, "Fuel": T fuel and T scrap. The ion-storm sentence is the page's text. No storm duration is printed.
  "pirate-ships-in-plasma-storm": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew With the ship in one piece, you are able to salvage most of the fuel supplies before the ion storm clears and you have to jump away." — [[Pirate ships in plasma storm]]
      // > "You receive high fuel and scrap." — [[Pirate ships in plasma storm]]
      result(
        g,
        eventText("ship_STORM_PIRATE_SUPPLY_FUEL_deadCrew_text"),
        cargoAndScrap(g, "high", "fuel"),
      );
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship The ship obliterated, only scant fuel canisters can be scavenged from the wreckage before the ion storm clears and you have to jump away." — [[Pirate ships in plasma storm]]
    // > "You receive low fuel and scrap." — [[Pirate ships in plasma storm]]
    result(
      g,
      eventText("ship_STORM_PIRATE_SUPPLY_FUEL_destroyed_text"),
      cargoAndScrap(g, "low", "fuel"),
    );
  },
  // Destroyed: low missiles (1-2) and low scrap. Crew kill: high missiles (4-8) and high scrap.
  "pirate-ships-in-plasma-storm-ammo": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew With the ship in one piece, you are able to salvage most of the ammunition before the ion storm clears and you have to jump away." — [[Pirate ships in plasma storm]]
      // > "You receive high missiles and scrap." — [[Pirate ships in plasma storm]]
      result(
        g,
        eventText("ship_STORM_PIRATE_SUPPLY_AMMO_deadCrew_text"),
        cargoAndScrap(g, "high", "missiles"),
      );
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship The ship obliterated, only scant ammunition crates can be scavenged from the wreckage before the ion storm clears and you have to jump away." — [[Pirate ships in plasma storm]]
    // > "You receive low missiles and scrap." — [[Pirate ships in plasma storm]]
    result(
      g,
      eventText("ship_STORM_PIRATE_SUPPLY_AMMO_destroyed_text"),
      cargoAndScrap(g, "low", "missiles"),
    );
  },
  // Mantis ship attacking Slug ship. Saving the Slugs pays medium either way. Killing them pays high either way.
  "mantis-ship-attacking-slug-ship": (g) => {
    mantisSlugSaved(g);
  },
  "mantis-ship-attacking-slug-ship-slug": (g) => {
    // Wiki citations:
    // > "After destroying enemy ship or after killing enemy crew At last the Slugs' prized possessions are yours for the taking. After, that is, you split your takings with the Mantis." — [[Mantis ship attacking Slug ship]]
    // > "You receive high scrap with resources." — [[Mantis ship attacking Slug ship]]
    result(g, eventText("ship_SLUG_DISTRESS_MANTIS_SLUG_destroyed_text"), rollStandard(g, "high"));
  },
  // Zoltan security checkpoint, the scan fight. Destroyed pays low standard. A crew kill pays medium. The attack stays default.
  "zoltan-security-checkpoint-scan": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew You scrap what you can and prepare to jump before the other guards arrive." — [[Zoltan security checkpoint]]
      // > "You receive medium scrap with resources." — [[Zoltan security checkpoint]]
      result(g, eventText("ship_ZOLTAN_CREW_SCAN_destroyed_text"), rollStandard(g, "medium"));
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship You scrap what you can and prepare to jump before the other guards arrive." — [[Zoltan security checkpoint]]
    // > "You receive low scrap with resources." — [[Zoltan security checkpoint]]
    result(g, eventText("ship_ZOLTAN_CREW_SCAN_destroyed_text"), rollStandard(g, "low"));
  },
  "pirate-ship-attacking-civilian-lanius": pirateCivilianWin,
  // Pirate ship attacking civilian distress. Same destroyed and crew-kill rewards.
  "pirate-ship-attacking-civilian-distress": pirateCivilianWin,
  // Auto-ship attacking outpost. Destroyed pays low standard, then the outpost pays medium standard.
  // The page prints no crew-kill reward. Avoid the conflict is the nothing choice.
  "auto-ship-attacking-outpost": (g, deadCrew) => {
    if (deadCrew) return false;
    const more = rollStandard(g, "medium");
    payOffer(g, more, true);
    const extras = [eventText("ship_REBEL_AUTO_REFUEL_destroyed_c1_text")];
    if (more.scrap) extras.push(`Scrap: ${more.scrap}.`);
    if (more.fuel) extras.push(`Fuel: ${more.fuel}.`);
    if (more.missiles) extras.push(`Missiles: ${more.missiles}.`);
    if (more.parts) extras.push(`Drone parts: ${more.parts}.`);
    result(g, eventText("ship_REBEL_AUTO_REFUEL_destroyed_text"), rollStandard(g, "low"), extras);
  },
  // Auto-ship carrying shield virus. Both fights (Continue and the hacking counter) use this slug.
  // Destroyed pays medium scrap with resources. The page prints no crew-kill reward.
  "auto-ship-carrying-shield-virus": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, eventText("ship_REBEL_AUTO_HACKSHIELDS_destroyed_text"), rollStandard(g, "medium"));
  },
  // Lanius ship attacking civilian. Destroyed pays medium standard. A crew kill pays high. Then the civilians.
  // Lanius ship attacking civilian distress prints the same two endings and the same contact.
  "lanius-ship-attacking-civilian": laniusCivilianWin,
  "lanius-ship-attacking-civilian-distress": laniusCivilianWin,
  // Lanius ship attacking Rock. Both endings pay medium standard, then "Contact the Rockmen."
  "lanius-ship-attacking-rock": (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_LANIUS_ROCK_DISTRESS_SHIP_deadCrew_text")
      : eventText("ship_LANIUS_ROCK_DISTRESS_SHIP_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, "medium"),
      [],
      [opt("q:lanius-rock:contact", "ship_LANIUS_ROCK_DISTRESS_SHIP_destroyed_c1_choice")],
    );
  },
  // Lanius ship attacking Mantis. Both endings pay medium standard, then "Contact the Mantis."
  "lanius-ship-attacking-mantis": (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_LANIUS_MANTIS_DISTRESS_SHIP_deadCrew_text")
      : eventText("ship_LANIUS_MANTIS_DISTRESS_SHIP_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, "medium"),
      [],
      [opt("q:lanius-mantis:contact", "ship_LANIUS_MANTIS_DISTRESS_SHIP_destroyed_c1_choice")],
    );
  },
  // Lanius ship attacking Slug. Both endings pay medium standard, then "Contact the Slugs."
  "lanius-ship-attacking-slug": (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_LANIUS_SLUG_DISTRESS_SHIP_deadCrew_text")
      : eventText("ship_LANIUS_SLUG_DISTRESS_SHIP_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, "medium"),
      [],
      [opt("q:lanius-slug:contact", "ship_LANIUS_SLUG_DISTRESS_SHIP_destroyed_c1_choice")],
    );
  },
  // Lanius ship in rich debris field. Both fights pay medium standard, then "Investigate the debris."
  "lanius-ship-in-rich-debris-field": (g, deadCrew) => {
    const text = deadCrew
      ? eventText("ship_LANIUS_HARVESTER_SHIP_deadCrew_text")
      : eventText("ship_LANIUS_HARVESTER_SHIP_destroyed_text");
    result(
      g,
      text,
      rollStandard(g, "medium"),
      [],
      [opt("q:lanius-debris:investigate", "ship_LANIUS_HARVESTER_SHIP_destroyed_c1_choice")],
    );
  },
  // Refueling platform garbled broadcast. Every Lanius fight on the page, including the hail.
  // Both endings pay medium scrap with resources, then 3-5 fuel from the station. Not default salvage.
  "refueling-platform-garbled-broadcast": garbledBroadcastWin,
  // Engi smashed ships. Both endings explain the consolidation, then nothing. Default salvage is not paid.
  "engi-smashed-ships": (g, deadCrew) => {
    const hail = deadCrew
      ? eventText("ship_ENGI_SEX_SHIP_deadCrew_text")
      : eventText("ship_ENGI_SEX_SHIP_destroyed_text");
    result(g, `${hail} ${eventText("event_ENGI_SEX_SHIP_DONE_text")}`, undefined, [
      "Nothing happens.",
    ]);
  },
  // Rock and Slug standoff. Destroyed pays low standard. A crew kill pays medium. Then the Slug captain.
  "rock-and-slug-standoff": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "After killing enemy crew With the Rock crew dead, you scrap the ship for supplies." — [[Rock and Slug standoff]]
      // > "You receive medium scrap with resources." — [[Rock and Slug standoff]]
      slugCaptainGrateful(
        g,
        eventText("ship_ROCK_SLUG_REACTOR_SHIP_deadCrew_text"),
        offerLines(g, rollStandard(g, "medium")),
      );
      return;
    }
    // Wiki citations:
    // > "After destroying enemy ship With the Rock Ship destroyed, you take the time to collect what little scrap remains." — [[Rock and Slug standoff]]
    // > "You receive low scrap with resources." — [[Rock and Slug standoff]]
    slugCaptainGrateful(
      g,
      eventText("ship_ROCK_SLUG_REACTOR_SHIP_destroyed_text"),
      offerLines(g, rollStandard(g, "low")),
    );
  },
  // Legendary thief KazaaakplethKilik: destroyed -> medium; deadCrew opens the strip / survivors card.
  "legendary-thief-kazaaakplethkilik": (g, deadCrew) => {
    if (!deadCrew) {
      result(g, eventText("ship_MANTIS_NAMED_THIEF_destroyed_text"), rollStandard(g, "medium"));
      return;
    }
    const choices: Choice[] = [opt("q:thief:strip", "event_MANTIS_NAMED_THIEF_DEFEAT_c1_choice")];
    // {{Blue Option|Teleporter|...}}, {{Blue Option|Sensors|...|level=3}}.
    if (hasTeleporter(g))
      choices.push(opt("q:thief:teleport", "event_MANTIS_NAMED_THIEF_DEFEAT_c2_choice"));
    if (sensors(g) >= 3)
      choices.push(opt("q:thief:scan", "event_MANTIS_NAMED_THIEF_DEFEAT_c3_choice"));
    card(g, eventText("event_MANTIS_NAMED_THIEF_DEFEAT_text"), choices);
  },
  // ---- Quest-marker fights ----
  "quest-mantis-war-camp": std(
    "medium",
    "high",
    lazyText("ship_MANTIS_LANDING_PARTY_destroyed_text"),
    lazyText("ship_MANTIS_LANDING_PARTY_deadCrew_text"),
  ),
  // Space station under construction: destroyed -> medium, deadCrew -> high; then "Contact the cargo ship." -> medium scrap.
  "quest-space-station-rebel": std(
    "medium",
    "high",
    lazyText("ship_QUEST_CONSTRUCTIONYARD_SHIP_destroyed_text"),
    lazyText("ship_QUEST_CONSTRUCTIONYARD_SHIP_destroyed_text"),
    () => [opt("q:station:contact", "ship_QUEST_CONSTRUCTIONYARD_SHIP_destroyed_c1_choice")],
  ),
  // Mantis ship-collectors marker: "a weapon and medium" / "a weapon and high scrap with resources". The weapon is not
  // named: Rewards, "Weapon": "A random weapon & T scrap."
  "quest-mantis-chase": (g, deadCrew) => {
    // Wiki citations:
    // > "After destroying enemy ship Their ship breaks apart and you salvage the two ships." — [[Mantis ship-collectors#Quest Marker]]
    // > "You receive a weapon and medium scrap with resources." — [[Mantis ship-collectors#Quest Marker]]
    // > "After killing enemy crew You find an intact weapon on their now empty ship. You take as much scrap from the ships as possible." — [[Mantis ship-collectors#Quest Marker]]
    // > "You receive a weapon and high scrap with resources." — [[Mantis ship-collectors#Quest Marker]]
    const text = deadCrew
      ? eventText("ship_DONOR_MANTIS_CHASE2_deadCrew_text")
      : eventText("ship_DONOR_MANTIS_CHASE2_destroyed_text");
    result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [grantRandomItem(g, "weapon")]);
  },
  // Slug comm tapping marker: Engage -> medium / high; Head for the cache -> low / medium (scrap with resources).
  // Wiki citations:
  // > "After destroying enemy ship With the pirate defeated you scan the debris for anything useful. The Slug ship is long gone, spoils from the cache in hand." — [[Slug comm tapping#Quest Marker]]
  // > "After killing enemy crew With the pirate defeated you scan the debris for anything useful. The Slug ship is long gone, spoils from the cache in hand." — [[Slug comm tapping#Quest Marker]]
  // > "You receive medium scrap with resources." — [[Slug comm tapping#Quest Marker]]
  // > "You receive high scrap with resources." — [[Slug comm tapping#Quest Marker]]
  "quest-slug-pirate-trap-engage": std(
    "medium",
    "high",
    lazyText("ship_QUEST_SLUG_PIRATE_TRAP1_destroyed_text"),
  ),
  // Wiki citations:
  // > "With the pirate taken care of, you search again for the cache he was protecting, but it's lost in the clouds. You console yourself with the salvage from the well-armed pirate ship." — [[Slug comm tapping#Quest Marker]]
  // > "You receive low scrap with resources." — [[Slug comm tapping#Quest Marker]]
  // > "With the pirate defeated, you search again for the cache he was protecting, but it's lost in the clouds. You console yourself with the salvage from the well-armed pirate ship." — [[Slug comm tapping#Quest Marker]]
  // > "You receive medium scrap with resources." — [[Slug comm tapping#Quest Marker]]
  "quest-slug-pirate-trap-cache": std(
    "low",
    "medium",
    lazyText("ship_QUEST_SLUG_PIRATE_TRAP2_destroyed_text"),
    lazyText("ship_QUEST_SLUG_PIRATE_TRAP2_deadCrew_text"),
  ),
  // Engi fleet discussion, real marker: deadCrew -> "high scrap with resources and a final quest marker". The page prints
  // no destroyed result. INFERRED: a destroyed ship pays the default reward and the trail is lost.
  "quest-engi-real": (g, deadCrew) => {
    if (!deadCrew) return false;
    // Wiki citations:
    // > "Once their crew is dead you scan the log for information regarding the envoy. You're in luck! It seems ships matching the thieves' description passed through here not too long ago. You strip the ship and prepare to pursue them." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "You receive high scrap with resources and a final quest marker is added to your map." — [[Engi fleet discussion#First Quest Marker (Real)]]
    result(g, eventText("ship_REBEL_ENGI_UNLOCK_2REAL_deadCrew_text"), rollStandard(g, "high"), [
      addQuest(g, "engi-final"),
    ]);
  },
  // Fake marker: destroyed / deadCrew -> medium scrap with resources.
  // Wiki citations:
  // > "You take what you can from the debris." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
  // > "A quick search of their communication logs shows that the tech you were searching for never passed through this base... It must have been a decoy! You strip what you can and prepare to jump." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
  // > "You receive medium scrap with resources." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
  "quest-engi-fake": std(
    "medium",
    "medium",
    lazyText("ship_REBEL_ENGI_UNLOCK_2FAKE_destroyed_text"),
    lazyText("ship_REBEL_ENGI_UNLOCK_2FAKE_deadCrew_text"),
  ),
  // Final marker: destroyed -> Victory; deadCrew -> medium scrap with resources, then Victory.
  "quest-engi-final": (g, deadCrew) => {
    if (deadCrew) {
      // Wiki citations:
      // > "You strip what you can and contact the Engi ships." — [[Engi fleet discussion#Final Quest Marker]]
      // > "You receive medium scrap with resources." — [[Engi fleet discussion#Final Quest Marker]]
      engiVictory(
        g,
        eventText("ship_MANTIS_ENGI_UNLOCK_3_deadCrew_text"),
        rollStandard(g, "medium"),
      );
    } else engiVictory(g);
  },
  // Slug Home Nebula marker: the platform guard -> high scrap with resources.
  "quest-slug-platform": std("high", "high", lazyText("ship_JELLY_UNLOCK2_destroyed_text")),
  // The interceptor: "receive high scrap with resources and Slug Repair Gel augmentation". The Slug Cruiser unlock is the grantUnlock line.
  "quest-slug-interceptor": (g) => {
    // Wiki citations:
    // > "After destroying enemy ship or after killing enemy crew With the escort destroyed you take a look at your impressive prize. Your mission is too pressing to take a test flight. Before you rig the ship's computer to guide the it back to the main Federation hangar you discover a unique augment that duplicates the Slug's ability to heal breaches!" — [[Slug Home Nebula surrender#Fight the interceptor]]
    // > "You unlock the Slug Cruiser; receive high scrap with resources and Slug Repair Gel augmentation." — [[Slug Home Nebula surrender#Fight the interceptor]]
    grantUnlock(g, "PLAYER_SHIP_JELLY"); // @agent:unlocks. Slug Home Nebula surrender: "You unlock the Slug Cruiser".
    result(g, eventText("ship_JELLY_UNLOCK3_destroyed_text"), rollStandard(g, "high"), [
      grantAug(g, "SLUG_GEL"),
    ]);
  },
  // Settlement mercenary work marker: "medium scrap, your ship receives 5 repairs and a store opens."
  "quest-store-rescue": (g) => {
    // Wiki citations:
    // > "The outpost hails you, \"Thank you! I don't know what we did to anger the Rebels, but they were ready to kill us. I'll show you our goods and patch up your hull.\"" — [[Settlement mercenary work#Quest marker]]
    // > "You receive medium scrap, your ship receives 5 repairs and a store opens." — [[Settlement mercenary work#Quest marker]]
    result(
      g,
      eventText("ship_SQUAT_STORE_RESCUE_destroyed_text"),
      scrapOnly(g, "medium"),
      [repair(g, 5)],
      STORE_CHOICES(),
    );
  },
  // Federation Base Assist (Auto-ship, weapon contact): "low scrap with resources", then that contact.
  "quest-fed-assist": std(
    "low",
    "low",
    lazyText("ship_AUTO_FEDERATION_BASE_destroyed_text"),
    lazyText("ship_AUTO_FEDERATION_BASE_destroyed_text"),
    [opt("q:fed-assist:contact", "continue")],
  ),
  // The other non-AE Auto-ship. Same salvage, then the repair contact.
  "quest-fed-assist-repair": std(
    "low",
    "low",
    lazyText("ship_AUTO_FEDERATION_BASE2_destroyed_text"),
    lazyText("ship_AUTO_FEDERATION_BASE2_destroyed_text"),
    [opt("q:fed-assist-repair:contact", "continue")],
  ),
  // AE Auto-ship. Destroyed, and INFERRED a crew-kill the template does not list, both use this sentence and low scrap.
  "quest-fed-assist-asb": std(
    "low",
    "low",
    lazyText("ship_AUTO_FEDERATION_BASE2_destroyed_text"),
    lazyText("ship_AUTO_FEDERATION_BASE2_destroyed_text"),
    [opt("q:fed-assist-asb:contact", "continue")],
  ),
  // AE Elite Rebel. Destroyed is low scrap with resources; a crew kill is medium. Then the outpost contact.
  "quest-fed-assist-wing": std(
    "low",
    "medium",
    lazyText("ship_REBEL_FEDERATION_PDS_destroyed_text"),
    lazyText("ship_REBEL_FEDERATION_PDS_deadCrew_text"),
    [opt("q:fed-assist-wing:contact", "continue")],
  ),
};

/**
 * sim.ts winCombat, after the fight is cleaned up. True when the page paid its own reward (and set the next card).
 * `deadCrew`: the fight ended because the enemy crew died ({{Winning|deadCrew=true}}), not the hull.
 */
export function pageWin(g: Game, slug: string | null | undefined, deadCrew: boolean): boolean {
  const win = slug ? (PAGE_WINS[slug] ?? fromParts("wins", slug)) : undefined;
  if (!win) return false;
  if (win(g, deadCrew) === false) return false;
  if (g.phase === "event") g.sfx.push("win");
  return g.phase === "event" || g.phase === "reward";
}

/** "gotaway" results, keyed like PAGE_WINS. */
const GOT_AWAY: Record<string, (g: Game) => void> = {
  // Pirate briber. Escape pays no fight scrap. Then the victim.
  "pirate-briber": (g) => {
    card(g, eventText("ship_PIRATE_BRIBER_gotaway_text"), PIRATE_GONE());
  },
  // Lanius ship absorbing automated scout. Escape pays no fight scrap. Then inspect.
  "lanius-ship-absorbing-automated-scout": (g) => {
    card(g, eventText("ship_LANIUS_AUTO_REBEL_gotaway_text"), SCOUT_INSPECT());
  },
  // Mantis ship-collectors: "After them!" -> quest marker / "Forget it." -> nothing.
  "mantis-ship-collectors": (g) => {
    // Wiki citations:
    // > "The ship made an emergency FTL jump, but it looks like they didn't mask their signatures. You could easily follow them if you want." — [[Mantis ship-collectors]]
    // > "After them!" — [[Mantis ship-collectors]]
    // > "Forget it." — [[Mantis ship-collectors]]
    card(g, eventText("ship_DONOR_MANTIS_CHASE1_gotaway_text"), [
      opt("q:mantis-collectors:follow", "ship_DONOR_MANTIS_CHASE1_gotaway_c1_choice"),
      opt("q:mantis-collectors:forget", "ship_DONOR_MANTIS_CHASE1_gotaway_c2_choice"),
    ]);
  },
  "quest-mantis-chase": (g) => {
    // Wiki citations:
    // > "Looks like they got away. At least you're able to scrap their abandoned fighter." — [[Mantis ship-collectors#Quest Marker]]
    // > "You receive high scrap with resources." — [[Mantis ship-collectors#Quest Marker]]
    result(g, eventText("ship_DONOR_MANTIS_CHASE2_gotaway_text"), rollStandard(g, "high"));
  },
  // "Nothing happens. [unlock quest is failed]"
  "quest-engi-real": (g) => {
    // Wiki citations:
    // > "With the ship gone, you search through the abandoned base for any signs of their destination but find none." — [[Engi fleet discussion#First Quest Marker (Real)]]
    result(g, eventText("ship_REBEL_ENGI_UNLOCK_2REAL_gotaway_text"));
  },
  "quest-engi-fake": (g) => {
    // Wiki citations:
    // > "With the ship gone you search through the abandoned base for any signs of their destination but find none." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    result(g, eventText("ship_REBEL_ENGI_UNLOCK_2FAKE_gotaway_text"));
  },
  "quest-slug-interceptor": (g) => {
    // Wiki citations:
    // > "After the ship successfully escaped The interceptor jumps away with the cruiser linked to its FTL signatures. You were so close..." — [[Slug Home Nebula surrender#Fight the interceptor]]
    result(g, eventText("ship_JELLY_UNLOCK3_gotaway_text"));
  },
  // The mid-run sentence "After watching their squadron get destroyed, it looks like their leader is prepared to turn tail and run." has no separate card hook.
  "quest-fed-assist-wing": (g) => {
    card(g, eventText("ship_REBEL_FEDERATION_PDS_gotaway_text"), [
      opt("q:fed-assist-wing:contact", "continue"),
    ]);
  },
  // Rebel ship warning. The escape already doubles pursuit (sim.ts). This card prints the page's sentence.
  "rebel-ship-warning": (g) => {
    card(g, `${eventText("ship_SQUAT_WARNING_gotaway_text")}\n\nRebel Fleet pursuit is doubled.`, [
      opt("ack", "continue"),
    ]);
  },
};

/** sim.ts step, right after an enemy escapes. Opens the page's "gotaway" card; the beacon is spent either way. */
export function pageGotAway(g: Game, slug: string | null | undefined) {
  const run = slug ? (GOT_AWAY[slug] ?? fromParts("gotAway", slug)) : undefined;
  if (!run) return;
  const b = here(g);
  if (b) b.resolved = true;
  run(g);
}
