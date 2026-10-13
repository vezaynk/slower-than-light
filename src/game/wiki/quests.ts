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
import { tx } from "../../i18n/index.ts";
import { upgradeCost, WEAPONS } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { kinOf } from "../extras/kin.ts";
import { xpNeedFor } from "../extras/lineage.ts";
import { aidPlayerAsb, beginBoarding, halvePlayerSystems, hurtSystem, log, openStoreHere, rand, shutPlayerHacking } from "../sim.ts";
import type { AugmentId, Beacon, Game, GameEvent, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts"; // @agent:unlocks
import { noteReactorEvent } from "./achievement-track.ts";
import { grantRandomItem } from "./bonus-item.ts";
import { fleetToReach, jumpsBetween, overtaken } from "./sector-map.ts";
// @agent:quests-a. Quest-opener modules register a QuestPart; PARTS is read at call time (the modules import this one).
import { laniusTraderOfferText, laniusTraderTakeId, rollLaniusTrader } from "./cited-events.ts";
import { RUWEN_ENTRY } from "./ruwen-entry.ts";
import { PART_A } from "./quests-a.ts";
import { PART_B } from "./quests-b.ts"; // @agent:quests-b. Quest-opening events, part B.
import { HULL_RUN_SECONDS, type EscapePlan } from "./escape.ts";
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
  rollSurrenderOffer,
  scrapBand,
  type SurrenderOffer,
  type SurrenderTier,
} from "./surrender.ts";
import { keepNewHire, receiveAugment } from "./make-room.ts";

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
function fromParts<K extends "quests" | "arrive" | "choices" | "wins" | "gotAway">(k: K, id: string): QuestPart[K][string] | undefined {
  for (const part of PARTS()) {
    const table = part?.[k] as Record<string, QuestPart[K][string]> | undefined;
    if (table?.[id]) return table[id];
  }
  return undefined;
}

/** Quest id -> the event page whose "Quest Marker" section it is, and the INVENTED beacon name. */
export const QUESTS: Record<string, { page: string; title: string }> = {
  escort: { page: "Escort civilians", title: tx("wiki.quests.escort-destination") },
  "mantis-war-camp": { page: "Mantis war camp", title: tx("wiki.quests.mantis-encampment") },
  "space-station": { page: "Space station under construction", title: tx("wiki.quests.missing-cargo-ship") },
  "defector-cache": { page: "Rebel defector", title: tx("wiki.quests.defector-s-cache") },
  "mantis-chase": { page: "Mantis ship-collectors", title: tx("wiki.quests.mantis-trail") },
  "fed-base": { page: "Rebel ship attacking Federation loyalists", title: tx("wiki.quests.hidden-federation-base") },
  "thief-stash": { page: "Legendary thief KazaaakplethKilik", title: tx("wiki.quests.thief-s-cache") },
  "slug-pirate-trap": { page: "Slug comm tapping", title: tx("wiki.quests.slug-raid") },
  "engi-real": { page: "Engi fleet discussion", title: tx("wiki.quests.rebel-base") },
  "engi-fake": { page: "Engi fleet discussion", title: tx("wiki.quests.rebel-base") },
  "engi-final": { page: "Engi fleet discussion", title: tx("wiki.quests.mantis-convoy") },
  "slug-platform": { page: "Slug Home Nebula surrender", title: tx("wiki.quests.construction-platform") },
  "store-rescue": { page: "Settlement mercenary work", title: tx("wiki.quests.space-dock") },
};

export const QUEST_ADDED = tx("wiki.quests.added-a-quest-marker-to-your");
export const QUEST_NEXT = tx("wiki.quests.added-a-quest-marker-to-the");
export const QUEST_CANCELLED =
  tx("wiki.quests.upon-examining-your-map-you-realize");

/** Ship-unlocking event pages (Category:Ship Unlocking Events) are not overwritten by a marker. INFERRED (Beacons @to-do). */
const KEEP_FLAGS = new Set([
  "cited:engi-fleet-discussion",
  "cited:legendary-thief-kazaaakplethkilik",
  "cited:slug-home-nebula-surrender",
  "engi-cache",
  "last-stand-repair",
  // @agent:quests-a. Category:Ship Unlocking Events pages wired in quests-a.ts.
  "cited:ancient-device",
  "cited:rock-war-vessel-encounter",
  "cited:unarmed-zoltan-transport",
  "cited:zoltan-research-facility",
]);

/**
 * xftl doc/sector-map, StarMap::AddQuest, keeps a beacon that has "not been visited", is not a nebula beacon, "not the
 * exit beacon", has "not been overtaken by the rebel fleet", has no quest, "Is not a store", "Is not a distress beacon",
 * and "Is not the player's current beacon". "If there is no path, the beacon is skipped." Then, "unless the 'force'
 * argument is set, the number of jumps away from the player must be less than the number of jumps until this quest is
 * overtaken by the rebels" ("force ... is true when adding quests delayed from a previous sector").
 * Beacons, "Quest (marker) beacon": "A quest marker cannot appear in nebula area".
 * INFERRED: jumps until overtaken count normal 64px fleet steps (wiki/sector-map.ts fleetToReach). The boss beacon and
 * the KEEP_FLAGS pages are also kept clear.
 */
function canHold(g: Game, b: Beacon, from: Beacon | undefined, force: boolean): boolean {
  if (b.kind === "start" || b.kind === "exit" || b.kind === "boss" || b.kind === "store") return false;
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
  b.kind = id === "slug-pirate-trap" || id === "slug-platform" ? "nebula" : "event";
  b.flag = `quest:${id}`;
  b.name = QUESTS[id]?.title ?? fromParts("quests", id)?.title ?? tx("wiki.quests.quest");
  b.asteroid = false;
  b.resolved = false;
  b.visited = false;
  b.tier = "pool";
}

/** Adds a quest marker per Beacons, "Quest (marker) beacon". Returns the line the game prints. */
export function addQuest(g: Game, id: string): string {
  // "quests are not allowed in sector 8".
  if (g.sector >= 8) {
    log(g, QUEST_CANCELLED);
    return QUEST_CANCELLED;
  }
  const spot = questSpot(g);
  if (spot) {
    mark(spot, id);
    log(g, QUEST_ADDED);
    return QUEST_ADDED;
  }
  // "If this happens in sector 7, the quest will be "cancelled"".
  if (g.sector >= 7) {
    log(g, QUEST_CANCELLED);
    return QUEST_CANCELLED;
  }
  (g.questsNext ??= []).push(id);
  log(g, QUEST_NEXT);
  return QUEST_NEXT;
}

/** sim.ts nextSector, after the sector's events are stamped: "it will appear regardless of which sector you choose". */
export function placeQueuedQuests(g: Game) {
  const queued = g.questsNext ?? [];
  g.questsNext = [];
  for (const id of queued) {
    const spot = questSpot(g, true);
    if (spot) mark(spot, id);
    // INFERRED: a sector with no room (all nebula, say) loses the marker. The page does not cover this case.
    else log(g, tx("wiki.quests.no-room-on-this-map-for"));
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Cards and payouts
// ---------------------------------------------------------------------------------------------------------------

export type Choice = { id: string; label: string };
const ACK: Choice[] = [{ id: "ack", label: tx("wiki.quests.continue") }];

/** Rewards, "Scrap only": T scrap. Same augment adjustment as the other rewards. */
export function scrapOnly(g: Game, tier: SurrenderTier): SurrenderOffer {
  const eligible = between(g, scrapBand(g, tier));
  return { tier, scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 };
}

/** Rewards, "Fuel" / "Missiles": T of that resource and T scrap. Bands are the page tooltips. */
function cargoAndScrap(g: Game, tier: "low" | "high", kind: "fuel" | "missiles"): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  const band = kind === "fuel" ? (tier === "high" ? [3, 6] : [1, 3]) : tier === "high" ? [4, 8] : [1, 2];
  offer[kind] = between(g, band as [number, number]);
  return offer;
}

const ENGI_DISTRESS_AFTER: Choice[] = [
  { id: "q:engi-distress:scrap", label: tx("wiki.quests.give-them-25-scrap") },
  { id: "q:engi-distress:supplies", label: tx("wiki.quests.give-them-40-scrap-2-missiles") },
  { id: "q:engi-distress:nothing", label: tx("wiki.quests.give-them-nothing") },
];

/**
 * Rebel ship attacking civilians in Last Stand. Contact the survivors. Three results, no odds. INFERRED: equal.
 * Supplies are Rewards, "Stuff", medium: two resources in the printed medium bands, plus low scrap.
 * The page names no weapon, so the Stuff bonus item is not granted.
 */
function lastStandSurvivors(g: Game) {
  const kind = pick(g, ["repair", "supplies", "thanks"] as const);
  if (kind === "repair") {
    result(
      g,
      tx("wiki.quests.you-are-hailed-thank-you-it"),
      undefined,
      [repair(g, 8)],
    );
    return;
  }
  if (kind === "supplies") {
    result(
      g,
      tx("wiki.quests.the-survivors-send-a-message-thanks"),
      rollSurrenderOffer(g, "medium", true),
    );
    return;
  }
  result(
    g,
    tx("wiki.quests.the-people-you-rescued-were-primarily"),
    undefined,
    [tx("wiki.quests.nothing-happens")],
  );
}

/** Engi distress Rebel fight, destroyed low standard or a crew kill medium, then the Engi ask for help. */
function engiDistressWin(g: Game, deadCrew: boolean) {
  result(
    g,
    tx("wiki.quests.the-rebels-destroyed-you-pick-the"),
    rollStandard(g, deadCrew ? "medium" : "low"),
    [],
    ENGI_DISTRESS_AFTER,
  );
}

/** Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is unnamed: Rewards, "Drone": "A
 * random drone schematic & T scrap." The page pays no scrap with it. */
function engiDistressGift(g: Game) {
  if (g.scrap < 25) return;
  g.scrap -= 25;
  log(g, tx("wiki.quests.scrap-25"));
  const r = pick(g, ["nothing", "heal", "schematic"] as const);
  if (r === "heal") {
    result(
      g,
      tx("wiki.quests.the-engies-are-grateful-they-don"),
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "healburst" },
      [tx("wiki.quests.scrap-25")],
    );
    return;
  }
  if (r === "schematic") {
    result(
      g,
      tx("wiki.quests.the-engies-are-grateful-they-don-2"),
      undefined,
      [tx("wiki.quests.scrap-25"), grantRandomItem(g, "drone")],
    );
    return;
  }
  result(
    g,
    tx("wiki.quests.the-words-they-use-are-need"),
    undefined,
    [tx("wiki.quests.nothing-else-happens"), tx("wiki.quests.scrap-25")],
  );
}

/** The result card: page text, what was paid, extras, and the next choices ("ack" by default). */
export function result(g: Game, text: string, offer?: SurrenderOffer, extras: string[] = [], choices: Choice[] = ACK) {
  const lines: string[] = [text];
  const got: string[] = [];
  if (offer) {
    const paid = payOffer(g, offer, true);
    if (offer.scrap) got.push(tx("wiki.quests.scrap", { scrap: offer.scrap }));
    if (offer.fuel) got.push(tx("wiki.quests.fuel", { fuel: offer.fuel }));
    if (offer.missiles) got.push(tx("wiki.quests.missiles", { missiles: offer.missiles }));
    if (offer.parts) got.push(tx("wiki.quests.drone-parts", { parts: offer.parts }));
    if (paid.weaponName) got.push(`${paid.weaponName}.`);
    got.push(...paid.extras);
  }
  const tail = [...got, ...extras].filter(Boolean);
  if (tail.length) lines.push(tail.join(" "));
  for (const l of got) log(g, l);
  g.event = { title: here(g)?.name ?? "Event", body: lines.join("\n\n"), choices };
  g.phase = "event";
  g.paused = true;
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
  return tx("wiki.quests.hull-repairs", { n: n });
}

const AUG_NAMES: Partial<Record<AugmentId, string>> = {
  casing: tx("wiki.quests.titanium-system-casing"),
  gel: tx("wiki.quests.slug-repair-gel"),
  pheromone: tx("wiki.quests.mantis-pheromones"),
  // Engi distress Rebel fight prints this name for the med-bot augment.
  medbot: tx("wiki.quests.engi-med-bot-dispersal"),
  // @agent:quests-a.
  keel: tx("wiki.quests.rock-plating"),
  vengeance: tx("wiki.quests.crystal-vengeance"),
  zshield: tx("wiki.quests.zoltan-shield"),
};

/**
 * A named augmentation. Augmentations: up to three; on a full rack "you must choose one augment to leave behind"
 * (make-room.ts). INFERRED: a named page reward the ship already has is not doubled and pays nothing.
 */
export function grantAug(g: Game, id: AugmentId): string {
  const name = AUG_NAMES[id] ?? id;
  if (g.augments.includes(id)) return tx("wiki.quests.is-already-fitted", { name: name });
  if (receiveAugment(g, id) === "queued") return tx("wiki.quests.no-free-augmentation-slot-for-choose", { name: name });
  return `${name} fitted.`;
}

/** A crewmember joins; `skill` at level 1 (page: "with 1 skill in ..."). */
export function crew(g: Game, race: string, skill?: SkillName, name?: string): string {
  if (!joinCrew(g, race, name)) return tx("wiki.quests.there-is-no-room-aboard-for");
  const c = g.crew[g.crew.length - 1];
  if (skill) c.skills = { ...(c.skills ?? {}), [skill]: xpNeedFor(c, skill) };
  return tx("wiki.quests.a-crewmember-joins-you", { race: race });
}

function hasEngi(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "shell");
}
function hasSlug(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "gel");
}
function hasLanius(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "voidlung");
}
function hasRock(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "stone");
}
function hasMantis(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "blade");
}

/** Slug drink. Two results and no odds. INFERRED: equal. A Rock's trap is the fight; the drink's trap loses 25–35 scrap. */
function slugDrink(g: Game, rock: boolean) {
  if (pick(g, ["trust", "trap"] as const) === "trust") {
    const note = repair(g, 10);
    log(
      g,
      rock
        ? tx("wiki.quests.even-if-there-was-something-malicious")
        : tx("wiki.quests.you-take-a-cautious-gulp-it"),
    );
    log(g, note);
    openStoreHere(g);
    return;
  }
  if (rock) {
    pageFight(
      g,
      tx("wiki.quests.your-crewmember-is-able-to-identify"),
      tx("wiki.quests.slug-ship"),
      "slug-drink",
    );
    return;
  }
  // INFERRED: scrap does not go below zero.
  const n = between(g, [25, 35]);
  const lost = Math.min(g.scrap, n);
  g.scrap -= lost;
  log(g, tx("wiki.quests.scrap-2", { lost: lost }));
  result(
    g,
    tx("wiki.quests.you-take-one-gulp-and-wake"),
    undefined,
    [tx("wiki.quests.scrap-2", { lost: lost })],
  );
}

/** Lanius powered-down ship, "Investigate the vessel." Blue options stay visible when the ship cannot use them. */
function investigateDormant(g: Game) {
  card(g, tx("wiki.quests.the-vessel-appears-to-be-dormant"), [
    { id: "q:lanius-dormant:ignore", label: tx("wiki.quests.ignore-the-vessel") },
    { id: "q:lanius-dormant:navigate", label: tx("wiki.quests.navigate-carefully-around-the-ship-and") },
    { id: "q:lanius-dormant:plunder", label: tx("wiki.quests.send-over-a-lanius-crewmember-to") },
    { id: "q:lanius-dormant:autopilot", label: tx("wiki.quests.engage-the-autopilot-to-strip-the") },
  ]);
}
export function sensors(g: Game): number {
  return g.player.systems.sensors?.level ?? 0;
}
export function hasTeleporter(g: Game): boolean {
  return (g.player.kits.sling?.level ?? 0) > 0;
}
function hasMissileWeapon(g: Game): boolean {
  // Weapons, Hull Missile: countedAsMissileInEvents is false. A Hull Missile does not open a Missile Weapon option.
  return g.player.weapons.some((w) => w.defId !== "hullmissile" && WEAPONS[w.defId]?.kind === "missile");
}

function damageHull(g: Game, n: number): boolean {
  g.player.hull = Math.max(0, g.player.hull - n);
  log(g, tx("wiki.quests.hull-damage", { n: n }));
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
    card(g, tx("wiki.quests.you-escort-the-ship-to-the"), [
      { id: "q:escort:fight", label: tx("wiki.quests.fight-the-rebel-ship") },
    ]);
  } else if (r === "reward") {
    result(g, tx("wiki.quests.shortly-after-you-arrive-the-ship"), rollStandard(g, "high"));
  } else if (r === "store") {
    // "Your ship receives 5 repairs and a store opens."
    result(g, tx("wiki.quests.the-ship-you-were-escorting-thanks"), undefined, [repair(g, 5)], STORE_CHOICES);
  } else {
    // "Your ship reactor is upgraded." Ref: "If your ship reactor was already fully upgraded ... "Could not upgrade the
    // Reactor, it's maxed" - and nothing happens."
    let note = tx("wiki.quests.could-not-upgrade-the-reactor-it");
    if (upgradeCost("reactor", g.player.reactor) != null) {
      g.player.reactor += 1;
      // Manpower: an event offer to upgrade the reactor does not count against the achievement.
      noteReactorEvent(g);
      note = tx("wiki.quests.reactor", { reactor: g.player.reactor });
    }
    result(g, tx("wiki.quests.you-arrive-and-the-ship-you"), undefined, [note]);
  }
}

export const STORE_CHOICES: Choice[] = [
  { id: "q:open-store", label: tx("wiki.quests.see-their-wares") },
  { id: "ack", label: tx("wiki.quests.leave") },
];

/** Space station under construction, "Quest Marker": "One of the following subevents occurs". */
function arriveStation(g: Game) {
  const r = pick(g, ["rebel", "empty", "floating"] as const);
  if (r === "rebel") {
    card(g, tx("wiki.quests.you-find-the-missing-cargo-ship"), [
      { id: "q:station:attack", label: tx("wiki.quests.attack-the-rebels-to-help-them") },
      { id: "q:station:leave", label: tx("wiki.quests.leave") },
    ]);
  } else if (r === "empty") {
    // {{:Abandoned station}}.
    card(g, tx("wiki.quests.you-find-the-missing-cargo-ship-2"), [
      { id: "q:station:examine", label: tx("wiki.quests.move-in-to-examine-the-station") },
      { id: "q:station:stay", label: tx("wiki.quests.stay-near-the-beacon") },
    ]);
  } else {
    card(g, tx("wiki.quests.you-find-the-missing-cargo-ship-3"), [
      { id: "q:station:fuel4", label: tx("wiki.quests.give-them-the-requested-4-fuel") },
      { id: "q:station:fuel1", label: tx("wiki.quests.give-them-1-fuel") },
      { id: "q:station:none", label: tx("wiki.quests.do-not-give-them-any") },
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
    card(g, tx("wiki.quests.you-arrive-in-the-sector-to"), [
      { id: "q:fed-base:assist-asb", label: tx("wiki.quests.fight-the-auto-ship") },
    ]);
  } else if (r === "wing") {
    card(g, tx("wiki.quests.you-arrive-in-the-sector-to-2"), [
      { id: "q:fed-base:assist-wing", label: tx("wiki.quests.fight-the-elite-rebel") },
    ]);
  } else if (r === "repair") {
    card(g, tx("wiki.quests.you-arrive-in-the-sector-to-3"), [
      { id: "q:fed-base:assist-repair", label: tx("wiki.quests.fight-the-auto-ship") },
    ]);
  } else {
    card(g, tx("wiki.quests.you-arrive-in-the-sector-to-3"), [
      { id: "q:fed-base:assist", label: tx("wiki.quests.fight-the-auto-ship") },
    ]);
  }
}

/** Template:Hidden federation base. Five results; the fifth is "Federation Base Assist". */
function arriveFedBase(g: Game) {
  const r = pick(g, ["schematic", "crew", "dock", "empty", "assist"] as const);
  if (r === "schematic") {
    // "You receive a drone schematic with high scrap." The schematic is not named: Rewards, "Drone": "A random drone schematic & T scrap."
    result(g, tx("wiki.quests.you-find-the-planet-at-the"), scrapOnly(g, "high"), [grantRandomItem(g, "drone")]);
  } else if (r === "crew") {
    // "You receive a crewmember and low scrap with resources." Race not named: INFERRED random.
    const joined = crew(g, randomRace(g));
    result(g, tx("wiki.quests.by-following-the-directions-given-to"), rollStandard(g, "low"), [joined]);
  } else if (r === "dock") {
    result(g, tx("wiki.quests.after-a-quick-search-you-discover"), rollStandard(g, "medium"), [repair(g, 35)]);
  } else if (r === "empty") {
    const choices: Choice[] = [{ id: "ack", label: tx("wiki.quests.leave") }];
    // {{Blue Option|Improved Sensors|...|level=2}} / {{Blue Option|Advanced Sensors|...|level=3}} / Long-Ranged Scanners.
    // The same label is printed on each. A ship that meets more than one requirement can pick.
    const scan = tx("wiki.quests.run-a-second-scan-pass");
    if (sensors(g) >= 2) choices.push({ id: "q:fed-base:scan-2", label: scan });
    if (sensors(g) >= 3) choices.push({ id: "q:fed-base:scan-3", label: scan });
    if (g.augments.includes("glass")) choices.push({ id: "q:fed-base:scan-glass", label: scan });
    card(g, tx("wiki.quests.you-search-near-the-coordinates-given"), choices);
  } else {
    arriveFedAssist(g);
  }
}

/** Builds the card for a quest beacon on arrival, or null when `b` holds no live quest. sim.ts eventFor calls this. */
export function questEvent(g: Game, b: Beacon): GameEvent | null {
  if (!b.quest || b.resolved) return null;
  switch (b.quest) {
    case "escort":
      arriveEscort(g);
      break;
    case "mantis-war-camp": {
      // Mantis war camp, "Quest Marker".
      const choices: Choice[] = [{ id: "q:war-camp:leave", label: tx("wiki.quests.leave-before-they-notice-you") }];
      // {{Blue Option|Missile Weapon|Bombard their key structures.}} [1 missile]
      if (hasMissileWeapon(g)) choices.push({ id: "q:war-camp:missile", label: tx("wiki.quests.bombard-their-key-structures") });
      // {{Blue Option|Fire Bomb|Teleport fire bombs into key structures.}} [2 missiles]. Fire Bomb is fitted as "cask".
      if (g.player.weapons.some((w) => w.defId === "cask")) choices.push({ id: "q:war-camp:firebomb", label: tx("wiki.quests.teleport-fire-bombs-into-key-structures") });
      card(g, tx("wiki.quests.you-find-the-mantis-encampment-but"), choices);
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
        result(g, tx("wiki.quests.arriving-at-the-specified-coordinates-you"), rollSurrenderOffer(g, "high", true));
      } else {
        result(g, tx("wiki.quests.you-arrive-at-location-of-the"), scrapOnly(g, "low"));
      }
      break;
    case "mantis-chase":
      card(g, tx("wiki.quests.you-catch-up-with-the-mantis"), [
        { id: "q:mantis-chase:fight", label: tx("wiki.quests.fight-the-mantis-bomber") },
      ]);
      break;
    case "fed-base":
      arriveFedBase(g);
      break;
    case "thief-stash":
      // "You receive a weapon with high scrap." The weapon is not named: Rewards, "Weapon": "A random weapon & T scrap."
      result(g, tx("wiki.quests.you-arrive-at-small-asteroid-field"), scrapOnly(g, "high"), [grantRandomItem(g, "weapon")]);
      break;
    case "slug-pirate-trap":
      // Not wired: "when you arrive there will be a nebula environment" (no per-fight nebula environment here).
      card(g, tx("wiki.quests.you-catch-up-with-the-two"), [
        { id: "q:slug-trap:engage", label: tx("wiki.quests.engage-the-pirate") },
        { id: "q:slug-trap:cache", label: tx("wiki.quests.head-for-the-cache") },
      ]);
      break;
    case "engi-real":
    case "engi-fake":
      card(g, tx("wiki.quests.you-arrive-at-one-of-the"), [
        { id: `q:${b.quest}:fight`, label: tx("wiki.quests.fight-the-rebel-ship") },
      ]);
      break;
    case "engi-final":
      card(g, tx("wiki.quests.you-have-finally-caught-up-with"), [
        { id: "q:engi-final:fight", label: tx("wiki.quests.fight-the-mantis-ship") },
      ]);
      break;
    case "slug-platform":
      card(g, tx("wiki.quests.you-arrive-to-discover-an-impressive"), [
        { id: "q:slug-platform:charge", label: tx("wiki.quests.charge-them-before-they-escape") },
        { id: "q:slug-platform:tail", label: tx("wiki.quests.try-to-tail-them-without-being") },
      ]);
      break;
    case "store-rescue":
      card(g, tx("wiki.quests.once-you-arrive-at-the-beacon"), [
        { id: "q:store-rescue:engage", label: tx("wiki.quests.engage-the-rebel-and-rescue-the") },
        { id: "q:store-rescue:avoid", label: tx("wiki.quests.avoid-a-fight") },
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

const DEFECTOR_FIGHT = tx("wiki.quests.rebel-ship");

function defectorFight(g: Game, text: string) {
  pageFight(g, text, DEFECTOR_FIGHT, "rebel-defector");
}

/** Rebel Defector victories after the Federation loyalists fight: "Contact the Federation ship". */
function loyalistsRescueCard(g: Game) {
  const choices: Choice[] = [{ id: "q:loyalists:rescue", label: tx("wiki.quests.quickly-try-to-rescue-the-crew") }];
  // {{Blue Option|Nano Med-bot Dispersal|...}} ("medbot"), {{Blue Option|Teleporter|...}}, {{Blue Option|Healing Burst|...}}.
  if (g.augments.includes("medbot")) choices.push({ id: "q:loyalists:medbot", label: tx("wiki.quests.pump-their-ship-with-nano-med") });
  if (hasTeleporter(g)) choices.push({ id: "q:loyalists:teleport", label: tx("wiki.quests.lock-on-to-all-remaining-life") });
  if (g.player.weapons.some((w) => w.defId === "healburst")) choices.push({ id: "q:loyalists:heal", label: tx("wiki.quests.use-a-healing-bomb-to-keep") });
  card(g, tx("wiki.quests.their-ship-looks-to-be-on"), choices);
}

function thiefDyingCard(g: Game, scan: boolean) {
  const choices: Choice[] = [
    { id: "q:thief:mercy", label: scan ? tx("wiki.quests.let-him-die") : tx("wiki.quests.put-him-out-of-his-misery") },
    { id: "q:thief:listen", label: scan ? tx("wiki.quests.dock-and-try-to-speak-with") : tx("wiki.quests.listen-to-what-he-has-to") },
  ];
  // {{Blue Option|Adv. Medbay|...|level=2+}}, {{Blue Option|Adv. Clonebay|...|level=2+}}.
  if ((g.player.systems.medbay?.level ?? 0) >= 2) {
    choices.push({ id: "q:thief:save", label: scan ? tx("wiki.quests.dock-and-quickly-take-him-back") : tx("wiki.quests.quickly-teleport-him-back-to-the") });
  }
  if ((g.player.kits.cradle?.level ?? 0) >= 2) choices.push({ id: "q:thief:clone", label: tx("wiki.quests.quickly-configure-the-clonebay-to-save") });
  card(g, scan ? tx("wiki.quests.you-detect-kazaaakplethkilik-slumped-in-a") : tx("wiki.quests.you-find-kazaaakplethkilik-slumped-in-a"), choices);
}

function engiVictory(g: Game, text = "", offer?: SurrenderOffer) {
  const body = tx("wiki.quests.the-engi-emerge-victorious-from-their");
  const choices = [{ id: "q:engi-victory:ask", label: tx("wiki.quests.ask-about-the-mantis-ships") }];
  if (offer) result(g, `${text}\n\n${body}`, offer, [], choices);
  else card(g, text ? `${text}\n\n${body}` : body, choices);
}

/** Deactivated Auto-ship, "Attempt to download the ship's data stores." Two results, no odds.
 *  INFERRED: equal. The sector map reveal is not wired. */
function deactivatedDownload(g: Game) {
  if (pick(g, ["data", "fight"] as const) === "fight") {
    pageFight(
      g,
      tx("wiki.quests.you-accidentally-reactivate-the-ships-ai"),
      "Auto-ship",
      "deactivated-auto-ship",
    );
    return;
  }
  result(g, tx("wiki.quests.you-are-able-to-pull-all"), rollStandard(g, "low"));
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
  log(g, n === 1 ? tx("wiki.quests.1-fire-in", { title: room.title }) : tx("wiki.quests.2-fires-in", { title: room.title }));
}

/** The berth that is already a Pirate ship. 3 hull, 3 engine damage, then the default Pirate fight. No fires. */
function refuelAmbush(g: Game) {
  const text = tx("wiki.quests.the-refueling-station-welcomes-you-into");
  if (damageHull(g, 3)) {
    log(g, text);
    return;
  }
  refuelEngines(g, false);
  pageFight(g, text, tx("wiki.quests.pirate-ship"), "refueling-platform");
}

const REBEL_SUPPLY_NEXT: Choice[] = [
  { id: "s:rebel-supply:steal", label: tx("wiki.quests.steal-the-civilian-supplies") },
  { id: "s:rebel-supply:leave", label: tx("wiki.quests.leave-the-civilians-alone") },
];

// Leave the civilians alone. Four printed sentences, no odds. INFERRED: equal.
const REBEL_SUPPLY_LEAVE = [
  tx("wiki.quests.you-make-the-preparations-to-leave"),
  tx("wiki.quests.you-leave-the-civilians-with-the"),
  tx("wiki.quests.you-wonder-if-any-more-rebels"),
  tx("wiki.quests.before-your-ftl-drive-charges-you"),
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
    if (applied) bits.push(tx("wiki.quests.damage-to", { applied: applied, id: id }));
  }
  if (rand(g) < 0.5) {
    const n = 1 + (rand(g) < 0.5 ? 1 : 0);
    room.fire = Math.min(4, room.fire + n);
    bits.push(n === 1 ? tx("wiki.quests.1-fire-in", { title: room.title }) : tx("wiki.quests.2-fires-in", { title: room.title }));
  } else {
    room.breach += 1;
    bits.push(tx("wiki.quests.a-breach-opens-in", { title: room.title }));
  }
  const line = bits.join(" ");
  if (line) log(g, line);
  return line;
}

/** Steal the civilian supplies. Four printed results, no odds. INFERRED: equal. */
function rebelSupplySteal(g: Game) {
  const kind = pick(g, ["parts", "scrap", "trap", "plague"] as const);
  if (kind === "parts") {
    // Rewards, Drone parts: "T drone parts & T scrap." The event tooltip prints low as 1 drone part.
    const offer = scrapOnly(g, "low");
    offer.parts = 1;
    result(g, tx("wiki.quests.the-colonists-hand-over-the-supplies"), offer);
    return;
  }
  if (kind === "scrap") {
    result(g, tx("wiki.quests.you-make-the-colonists-teleport-the"), scrapOnly(g, "low"));
    return;
  }
  if (kind === "trap") {
    const text = tx("wiki.quests.the-colonists-willingly-give-up-their");
    log(g, text);
    if (damageHull(g, 2)) return;
    const room = rebelSupplyRoom(g);
    result(g, text, undefined, [tx("wiki.quests.hull-damage-2"), room].filter(Boolean));
    return;
  }
  result(g, tx("wiki.quests.the-colonists-hand-over-the-supplies-2"), undefined, [tx("wiki.quests.nothing-happens")]);
}

function rebelSupplyLeave(g: Game) {
  result(g, pick(g, REBEL_SUPPLY_LEAVE), undefined, [tx("wiki.quests.nothing-happens")]);
}

/** Destroyed pays low scrap with resources. A crew kill pays medium. Then steal or leave. */
function rebelSupplyWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.with-the-rebel-crew-dead-you")
    : tx("wiki.quests.with-the-rebel-ship-destroyed-you");
  result(g, text, rollStandard(g, deadCrew ? "medium" : "low"), [], REBEL_SUPPLY_NEXT);
}

const ZOLTAN_RAFT_NEXT: Choice[] = [
  { id: "s:zoltan-raft:go", label: tx("wiki.quests.let-him-go") },
  { id: "s:zoltan-raft:hire", label: tx("wiki.quests.offer-to-hire-him-for-40") },
];

/**
 * Zoltan retake the ship. Destroyed pays medium scrap with resources, then the hire.
 * A crew kill pays high scrap and an unnamed augmentation: Rewards, "Augment": "A random augmentation & T scrap."
 */
function zoltanRaftWin(g: Game, deadCrew: boolean) {
  if (deadCrew) {
    result(g, tx("wiki.quests.the-last-pirate-life-signs-blink"), scrapOnly(g, "high"), [grantRandomItem(g, "augment")]);
    return;
  }
  result(
    g,
    tx("wiki.quests.you-salvage-what-you-can-from"),
    rollStandard(g, "medium"),
    [tx("wiki.quests.the-zoltan-looks-deeply-dissatisfied-with")],
    ZOLTAN_RAFT_NEXT,
  );
}

/** Offer to hire him for 40 scrap. Two printed results, no odds. INFERRED: equal. */
function zoltanRaftHire(g: Game) {
  if (g.scrap < 40) return;
  if (pick(g, ["accept", "refuse"] as const) === "accept") {
    g.scrap -= 40;
    log(g, tx("wiki.quests.scrap-40"));
    const joined = crew(g, tx("wiki.quests.zoltan"));
    result(g, tx("wiki.quests.he-responds-defeatedly-i-suppose-i"), undefined, [tx("wiki.quests.scrap-40"), joined]);
    return;
  }
  result(g, tx("wiki.quests.he-responds-haughtily-you-would-presume"), undefined, [tx("wiki.quests.nothing-happens")]);
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

const CHOICES: Record<string, (g: Game) => void> = {
  // ---- Cited cards that open a quest branch ----
  // Slug comm tapping, "Tap their comm frequency." -> "A quest marker is added to your map."
  "c:slug-comm-tapping:0": (g) => {
    const line = addQuest(g, "slug-pirate-trap");
    result(g, tx("wiki.quests.you-overhear-their-conversation-and-learn"), undefined, [line]);
  },
  // Slug comm tapping. "Ignore them." One printed result.
  "c:slug-comm-tapping:1": (g) => {
    result(g, tx("wiki.quests.you-have-no-interest-in-anything"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking civilian, "Contact the civilian ship." Template:Save the Civilian Ship.
  // Six results, no odds. The unnamed crewmember is not offered. INFERRED: the other five are equal.
  // The weapon is unnamed: Rewards, "Weapon": "A random weapon & T scrap."
  "q:lanius-civilian:contact": (g) => {
    const kind = weighted(g, [["weapon", 1], ["repair", 1], ["medium", 1], ["low", 1], ["nothing", 1]] as const);
    if (kind === "weapon") {
      result(g, tx("wiki.quests.they-respond-it-s-a-good"), scrapOnly(g, "low"), [grantRandomItem(g, "weapon")]);
      return;
    }
    if (kind === "repair") {
      result(g, tx("wiki.quests.this-sector-has-become-increasingly-dangerous"), undefined, [repair(g, 5)]);
      return;
    }
    if (kind === "medium") {
      result(g, tx("wiki.quests.apparently-the-ship-that-was-being"), rollStandard(g, "medium"));
      return;
    }
    if (kind === "low") {
      result(g, tx("wiki.quests.it-seems-the-crew-did-not"), rollStandard(g, "low"));
      return;
    }
    result(g, tx("wiki.quests.the-civilian-ship-wisely-made-a"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Crystal ship attacking Federation loyalists, "You contact the Federation ship."
  // Two results and no odds. INFERRED: equal.
  // The crewmember is unnamed and not granted. Low scrap with resources still is.
  // "a random amount of resources with some scrap" is Rewards, Stuff. The unnamed bonus item is not granted.
  "q:crystal-loyalists:contact": (g) => {
    if (weighted(g, [["survivor", 1], ["materials", 1]] as const) === "survivor") {
      result(
        g,
        tx("wiki.quests.the-ship-looks-battered-and-ready"),
        rollStandard(g, "low"),
      );
      return;
    }
    result(
      g,
      tx("wiki.quests.thank-you-we-heard-you-jumped"),
      rollSurrenderOffer(g, undefined, true),
    );
  },
  // Lanius ship attacking Rock, "Contact the Rockmen." Two results, no odds. INFERRED: equal.
  "q:lanius-rock:contact": (g) => {
    if (weighted(g, [["scrap", 1], ["nothing", 1]] as const) === "scrap") {
      result(g, tx("wiki.quests.the-rockman-ship-jumped-away-during"), rollStandard(g, "medium"));
      return;
    }
    result(g, tx("wiki.quests.the-rockmen-give-an-awkwardly-translated"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking Mantis, "Contact the Mantis." Two results, no odds. INFERRED: equal.
  // Rewards, Missiles: "T missiles & T scrap." The page tooltip prints medium as 2-4 missiles.
  "q:lanius-mantis:contact": (g) => {
    if (weighted(g, [["missiles", 1], ["wreck", 1]] as const) === "missiles") {
      const offer = scrapOnly(g, "medium");
      offer.missiles = between(g, [2, 4]);
      result(g, tx("wiki.quests.the-mantis-hiss-and-click-angry"), offer);
      return;
    }
    result(g, tx("wiki.quests.the-mantis-ship-sustained-too-much"), rollStandard(g, "medium"));
  },
  // Lanius ship attacking Slug, "Contact the Slugs." Two results, no odds. INFERRED: equal.
  "q:lanius-slug:contact": (g) => {
    if (weighted(g, [["supplies", 1], ["nothing", 1]] as const) === "supplies") {
      result(g, tx("wiki.quests.the-slugs-reluctantly-thank-you-for"), rollStandard(g, "medium"));
      return;
    }
    result(g, tx("wiki.quests.the-slugs-taking-advantage-of-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship in rich debris field. Improved Piloting level 2 and Advanced Piloting level 3.
  "c:lanius-ship-in-rich-debris-field:3": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, tx("wiki.quests.with-help-from-the-computer-you"), rollStandard(g, "medium"));
  },
  "c:lanius-ship-in-rich-debris-field:4": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 3) return;
    result(g, tx("wiki.quests.with-help-from-the-computer-you-2"), rollStandard(g, "high"));
  },
  // Investigate the debris. Three results, no odds. INFERRED: equal.
  "q:lanius-debris:investigate": (g) => {
    const kind = weighted(g, [["high", 1], ["medium", 1], ["low", 1]] as const);
    if (kind === "high") {
      result(g, tx("wiki.quests.it-looks-like-you-interrupted-the"), rollStandard(g, "high"));
      return;
    }
    if (kind === "medium") {
      result(g, tx("wiki.quests.the-competitor-gone-you-proceed-to"), rollStandard(g, "medium"));
      return;
    }
    result(g, tx("wiki.quests.the-competitor-gone-you-investigate-the"), rollStandard(g, "low"));
  },
  // Lanius ship salvager. "Attack the ship." One printed lead-in, then a Lanius ship fight.
  // The nested scoff attack prints "were doing". This choice prints "are doing".
  "c:lanius-ship-salvager:0": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-and-power-up"), tx("wiki.quests.lanius-ship"), "lanius-ship-salvager");
  },
  // Lanius ship salvager. "Leave them alone." One printed result.
  "c:lanius-ship-salvager:1": (g) => {
    result(g, tx("wiki.quests.you-ignore-the-ship-and-prepare"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship salvager, {{Blue Option|Lanius Crew|Request some scrap.}}
  // Three results, no odds. INFERRED: equal. Medium scrap is scrap only, not scrap with resources.
  // The nested fight is default Lanius rewards: no PAGE_WINS row, so winCombat pays the default salvage.
  "c:lanius-ship-salvager:2": (g) => {
    if (!hasLanius(g)) return;
    const kind = weighted(g, [["share", 1], ["scoff", 1], ["low", 1]] as const);
    if (kind === "share") {
      result(g, tx("wiki.quests.your-crew-hails-their-ship-wondering"), scrapOnly(g, "medium"));
      return;
    }
    if (kind === "scoff") {
      card(g, tx("wiki.quests.they-scoff-at-your-crewmember-s"), [
        { id: "q:lanius-salvager:attack", label: tx("wiki.quests.attack-the-ship") },
        { id: "q:lanius-salvager:leave", label: tx("wiki.quests.leave") },
      ]);
      return;
    }
    result(g, tx("wiki.quests.your-crewmember-hails-them-asking-if"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "q:lanius-salvager:attack": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-and-power-up-2"), tx("wiki.quests.lanius-ship"), "lanius-ship-salvager");
  },
  "q:lanius-salvager:leave": (g) => {
    result(g, tx("wiki.quests.you-ignore-their-derisive-tone-and"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius trader. "Decline." One printed result. Also the second proposal's Decline, same id.
  "c:lanius-trader:3": (g) => {
    result(g, tx("wiki.quests.they-leave-without-a-word"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius trader, {{Blue Option|Lanius Crew|Ask for an alternative trade.}}
  // A new roll of resource, cost, and scrap. INFERRED: the three better bands are equal.
  // The named Translator is the other page, not this one.
  "c:lanius-trader:4": (g) => {
    if (!hasLanius(g)) return;
    const offer = rollLaniusTrader(g, true);
    card(g, tx("wiki.quests.after-a-short-discussion-you-do", { laniusTraderOfferText: laniusTraderOfferText(offer) }), [
      { id: laniusTraderTakeId(offer), label: tx("wiki.quests.agree-to-the-exchange") },
      { id: "c:lanius-trader:3", label: tx("wiki.quests.decline") },
    ]);
  },
  // Lanius trader with translator. "Decline." One printed result.
  "c:lanius-trader-with-translator:3": (g) => {
    result(g, tx("wiki.quests.they-leave-without-a-word"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius trader with translator. "Decline but ask about their translation device."
  "c:lanius-trader-with-translator:4": (g) => {
    card(g, tx("wiki.quests.yes-it-is-quality-our-ship"), [
      { id: "q:lanius-translator:buy", label: tx("wiki.quests.purchase-the-translator-for-40-scrap") },
      { id: "q:lanius-translator:decline", label: tx("wiki.quests.decline-again") },
    ]);
  },
  // 40 scrap for a Lanius named Translator. The page prints no skill.
  // At full crew the hire goes ahead and someone already aboard is relieved (make-room.ts keepNewHire).
  "q:lanius-translator:buy": (g) => {
    if (g.scrap < 40) return;
    joinCrew(g, tx("wiki.quests.lanius"), tx("wiki.quests.translator"));
    keepNewHire(g);
    g.scrap -= 40;
    result(g, tx("wiki.quests.your-ships-dock-and-you-are"), undefined, [tx("wiki.quests.a-lanius-crewmember-named-translator-joins")]);
  },
  "q:lanius-translator:decline": (g) => {
    result(g, tx("wiki.quests.no-matter-this-one-does-not"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship absorbing automated scout. Two inspect results, no odds. INFERRED: equal.
  // "a random amount of scrap". The page notes lowercase "low" is treated as RANDOM.
  // INFERRED: low, medium, and high scrap only are equal. The map reveal is not wired.
  // Auto-ship near sensor station. Sensors level 3. Two results, no odds. INFERRED: equal.
  // The map reveal is not wired. The fight uses the same destroyed reward.
  "c:auto-ship-near-sensor-station:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["fight", "map"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.the-automated-ship-must-be-remotely"), "Auto-ship", "auto-ship-near-sensor-station");
      return;
    }
    result(g, tx("wiki.quests.your-improved-sensors-are-able-to"));
  },
  // Crew Teleporter. The map reveal is not wired.
  // Auto-ship fight in plasma storm. Engines 3-5. Two results, no odds. INFERRED: equal.
  "c:auto-ship-fight-in-plasma-storm:1": (g) => {
    const level = g.player.systems.engines?.level ?? 0;
    if (level < 3 || level > 5) return;
    if (pick(g, ["lose", "fight"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.despite-your-advanced-engines-you-are"), "Auto-ship", "auto-ship-fight-in-plasma-storm");
      return;
    }
    result(g, tx("wiki.quests.you-successfully-lose-the-ship-in"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Improved Engines, level 6+. Always lose the ship.
  "c:auto-ship-fight-in-plasma-storm:2": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    result(g, tx("wiki.quests.you-successfully-lose-the-ship-in"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Cloaking. Always lose the ship. The page prints no drone-part cost.
  "c:auto-ship-fight-in-plasma-storm:3": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    result(g, tx("wiki.quests.by-using-your-advanced-cloaking-system"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Deactivated Auto-ship. Download, two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:1": (g) => {
    deactivatedDownload(g);
  },
  // Sensors level 3. Two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["safe", "standby"] as const) === "safe") {
      result(g, tx("wiki.quests.your-improved-sensors-indicate-that-it"), rollStandard(g, "low"));
      return;
    }
    card(g, tx("wiki.quests.your-improved-sensors-indicate-the-ship"), [
      { id: "q:deactivated-auto:yes", label: tx("wiki.quests.yes") },
      { id: "q:deactivated-auto:no", label: tx("wiki.quests.no") },
    ]);
  },
  // Standby "Yes." reuses the download's two results.
  "q:deactivated-auto:yes": (g) => {
    deactivatedDownload(g);
  },
  "q:deactivated-auto:no": (g) => {
    result(g, tx("wiki.quests.you-leave-the-ship-alone-and"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rock ship in plasma storm. A living Rock crewmember. High standard. The map is not involved.
  "c:rock-ship-in-plasma-storm:2": (g) => {
    if (!hasRock(g)) return;
    result(g, tx("wiki.quests.the-rock-grudgingly-transfer-control-of"), rollStandard(g, "high"));
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
    result(g, tx("wiki.quests.you-don-t-want-to-alert"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Escort civilians FTL haywire. "Decline." One printed result. No quest marker.
  "c:escort-civilians-ftl-haywire:1": (g) => {
    result(g, tx("wiki.quests.alright-if-you-re-not-going"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Escort civilians FTL haywire. Advanced FTL Navigation. High scrap with resources. No quest marker.
  "c:escort-civilians-ftl-haywire:2": (g) => {
    if (!g.augments.includes("nav")) return;
    result(g, tx("wiki.quests.we-re-receiving-your-transmission-wow"), rollStandard(g, "high"));
  },
  // Auto-ship warning has no choice. Arrival calls this id.
  // One printed lead-in, then "Fight an Auto-ship that is running away." Escape stays the 40 second pursuit row.
  "c:auto-ship-warning:0": (g) => {
    pageFight(g, tx("wiki.quests.the-ship-starts-to-power-up"), "Auto-ship", "auto-ship-warning");
  },
  // Pirate briber. Low scrap with resources. The static tier note does not pay the resources.
  "c:pirate-briber:0": (g) => {
    result(g, tx("wiki.quests.good-choice-son-we-ve-both"), rollStandard(g, "low"));
  },
  // Pirate briber. "Try to be a hero. Attack the pirate." One printed lead-in, then a Pirate ship fight.
  "c:pirate-briber:1": (g) => {
    pageFight(g, tx("wiki.quests.the-pirate-ship-stops-its-pursuit"), tx("wiki.quests.pirate-ship"), "pirate-briber");
  },
  // Engi distress Rebel fight. {{SurrenderEscape(alt)|no}}: never runs away, never surrenders.
  "c:engi-distress-rebel-fight:0": (g) => {
    pageFight(
      g,
      tx("wiki.quests.the-distress-signal-originates-at-a"),
      tx("wiki.quests.rebel-ship-2"),
      "engi-distress-rebel-fight",
      { ...NEVER_RUN },
    );
  },
  // Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is a random one (engiDistressGift).
  "q:engi-distress:scrap": (g) => {
    engiDistressGift(g);
  },
  "q:engi-distress:supplies": (g) => {
    if (g.scrap < 40 || g.missiles < 2 || g.fuel < 2) return;
    g.scrap -= 40;
    g.missiles -= 2;
    g.fuel -= 2;
    log(g, tx("wiki.quests.scrap-40"));
    log(g, tx("wiki.quests.missiles-2"));
    log(g, tx("wiki.quests.fuel-2"));
    result(
      g,
      tx("wiki.quests.they-wouldn-t-get-more-than"),
      undefined,
      [grantAug(g, "medbot"), tx("wiki.quests.scrap-40"), tx("wiki.quests.missiles-2"), tx("wiki.quests.fuel-2")],
    );
  },
  "q:engi-distress:nothing": (g) => {
    result(
      g,
      tx("wiki.quests.engi-can-t-feel-fear-so"),
      undefined,
      [tx("wiki.quests.nothing-happens")],
    );
  },
  // Pirate smuggler. Weapon Control level 6+. Medium fuel (2-4) and medium scrap.
  "c:pirate-smuggler:2": (g) => {
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    card(g, tx("wiki.quests.they-hail-you-there-s-no"), [
      { id: "q:pirate-smuggler:bribe", label: tx("wiki.quests.take-their-bribe") },
      { id: "q:pirate-smuggler:attack", label: tx("wiki.quests.ignore-their-bribe-and-attack") },
    ]);
  },
  "q:pirate-smuggler:bribe": (g) => {
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, [2, 4]);
    result(g, tx("wiki.quests.you-receive-medium-fuel-and-scrap"), offer);
  },
  "q:pirate-smuggler:attack": (g) => {
    pageFight(g, tx("wiki.quests.you-power-up-your-weapons-and"), tx("wiki.quests.pirate-ship"), "pirate-smuggler");
  },
  // Pirate ship attacking Crystal. Template:Crystal Ship Saved. The Crystal weapon is not named.
  "q:crystal-pirate:contact": (g) => crystalContact(g),
  // Rock atheists. Two texts, no odds. INFERRED: equal. The fight marker sits under the second sentence; both charge.
  "c:rock-atheists:0": (g) => {
    const text = pick(g, [
      tx("wiki.quests.they-barely-hear-out-your-appeals"),
      tx("wiki.quests.they-listen-to-your-appeals-and"),
    ]);
    pageFight(g, text, tx("wiki.quests.rock-ship"), "rock-atheists");
  },
  // Promise. {{DuplicateEvent|2}} on nothing. The Rockman is one result.
  "c:rock-atheists:1": (g) => rockAtheistPromise(g),
  // Improved Sensors level 2+. A Rockman joins. No skill is printed.
  "c:rock-atheists:2": (g) => {
    if ((g.player.systems.sensors?.level ?? 0) < 2) return;
    rockAtheistJoins(g, tx("wiki.quests.the-rock-captain-is-impressed-by"));
  },
  // Pirate ship selling drones. Hail opens the dock, the slug warning, and the hacking toll.
  "q:pirate-drones:hail": (g) => {
    card(g, tx("wiki.quests.the-ship-responds-yes-we-have"), [
      { id: "q:pirate-drones:dock", label: tx("wiki.quests.dock-with-the-ship") },
      { id: "q:pirate-drones:leave", label: tx("wiki.quests.this-seems-dangerous-leave") },
      { id: "q:pirate-drones:slug", label: tx("wiki.quests.sir-we-can-dock-but-i") },
      { id: "q:pirate-drones:hack", label: tx("wiki.quests.disable-their-weapon-system-before-docking") },
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
      tx("wiki.quests.as-soon-as-you-start-to"),
      tx("wiki.quests.pirate-ship"),
      "pirate-ship-selling-drones",
    );
  },
  "q:pirate-drones:hack": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0) return;
    result(
      g,
      tx("wiki.quests.you-receive-a-hail-as-soon"),
      scrapOnly(g, "low"),
    );
  },
  "q:pirate-drones:nothing": (g) => pirateDroneNothing(g),
  // Three sibling results and no odds. INFERRED: equal. The system must already be installed.
  "q:pirate-drones:upgrade": (g) => pirateDroneUpgrade(g),
  // Rebel checkpoint. Four contact results, no odds. INFERRED: equal.
  "q:rebel-checkpoint:contact": (g) => rebelCheckpointContact(g),
  // Pirate ships in plasma storm. Fuel cargo. The pirate escape row is already 50% at 20-40% hull.
  // "never surrenders" is NO_SURRENDER_EVENTS. The page prints no escape timer.
  "c:pirate-ships-in-plasma-storm:0": (g) => {
    pageFight(
      g,
      tx("wiki.quests.you-jet-toward-the-pirate-with"),
      tx("wiki.quests.pirate-ship"),
      "pirate-ships-in-plasma-storm",
    );
  },
  // Ammunition cargo. A second fight slug so the missile table is not the fuel table.
  "c:pirate-ships-in-plasma-storm:1": (g) => {
    pageFight(
      g,
      tx("wiki.quests.you-jet-toward-the-pirate-with-2"),
      tx("wiki.quests.pirate-ship"),
      "pirate-ships-in-plasma-storm-ammo",
    );
  },
  // Pirate ships in plasma storm. "Let them leave." One printed result.
  "c:pirate-ships-in-plasma-storm:2": (g) => {
    result(g, tx("wiki.quests.sometimes-discretion-is-the-better-part"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "q:pirate-briber:gone": (g) => {
    pirateGone(g);
  },
  "q:pirate-briber:salvage": (g) => {
    result(g, tx("wiki.quests.you-strip-the-ship-of-anything"), rollStandard(g, "low"));
  },
  // No effect in The Last Stand.
  "q:pirate-briber:delay": (g) => {
    if (g.sector === 8 || g.sectorName === "The Last Stand") {
      result(g, tx("wiki.quests.hopefully-that-will-buy-you-more"), undefined, [tx("wiki.quests.no-effect-in-the-last-stand")]);
      return;
    }
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, tx("wiki.quests.hopefully-that-will-buy-you-more"), undefined, [tx("wiki.quests.the-rebel-fleet-is-delayed-for")]);
  },
  // Rebel fight choice in nebula. Conceal lists three results and prints no odds. INFERRED: equal.
  // Caught opens Prepare to fight, or Engines 4+. Chase doubles pursuit for 1 jump (citedChoose `faster`: one extra step).
  "c:rebel-fight-choice-in-nebula:1": (g) => {
    const r = pick(g, ["caught", "chase", "hidden"] as const);
    if (r === "caught") {
      card(g, tx("wiki.quests.you-immediately-slip-further-into-the"), [
        { id: "q:rebel-nebula:fight", label: tx("wiki.quests.prepare-to-fight") },
        { id: "q:rebel-nebula:engines", label: tx("wiki.quests.fully-power-the-engines-to-out") },
      ]);
      return;
    }
    if (r === "chase") {
      g.fleet += 1;
      log(g, tx("wiki.quests.rebel-fleet-pursuit-is-doubled-for"));
      result(
        g,
        tx("wiki.quests.the-ship-spots-you-and-gives"),
        undefined,
        [tx("wiki.quests.rebel-fleet-pursuit-is-doubled-for")],
      );
      return;
    }
    result(g, tx("wiki.quests.you-power-down-non-essential-systems"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "q:rebel-nebula:fight": (g) => {
    pageFight(g, tx("wiki.quests.prepare-to-fight"), tx("wiki.quests.rebel-ship"), "rebel-fight-choice-in-nebula");
  },
  // Engines level 4+. The page prints no percent.
  "q:rebel-nebula:engines": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 4) return;
    result(g, tx("wiki.quests.your-powerful-engines-allow-you-to"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Cloaking. Nothing happens.
  "c:rebel-fight-choice-in-nebula:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    result(g, tx("wiki.quests.you-use-your-cloaking-system-to"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Mantis fight choice. Conceal: {{DuplicateEvent|2}} on the fight, once on nothing.
  // The printed OR is the two fight sentences. INFERRED: those two are equal inside the doubled result.
  "c:mantis-fight-choice:1": (g) => {
    const spotted = weighted(g, [[true, 2], [false, 1]] as [boolean, number][]);
    if (!spotted) {
      result(g, tx("wiki.quests.you-power-down-non-essential-systems-2"), undefined, [tx("wiki.quests.nothing-happens")]);
      return;
    }
    const line = pick(g, [
      "You power down non-essential systems in an attempt to remain unnoticed. It looks like they are about to leave when suddenly they turn and set course toward you, weapons powered.",
      "Before you have a chance to slink away the Mantis ship notices you and powers up their weapons.",
    ] as const);
    pageFight(g, line, tx("wiki.quests.mantis-ship"), "mantis-fight-choice");
  },
  // Cloaking. {{DuplicateEvent|2}} on nothing, once on the fight.
  // The printed OR is the two nothing sentences. INFERRED: those two are equal inside the doubled result.
  "c:mantis-fight-choice:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    const away = weighted(g, [[true, 2], [false, 1]] as [boolean, number][]);
    if (away) {
      const line = pick(g, [
        "You cloak and shut down non-essential systems. In a short time the Mantis ship jumps away, no doubt in search of prey.",
        "You quickly cloak the ship and move out of immediate scanning range. You appear to have gotten away undetected.",
      ] as const);
      result(g, line, undefined, [tx("wiki.quests.nothing-happens")]);
      return;
    }
    pageFight(g, tx("wiki.quests.you-quickly-cloak-the-ship-but"), tx("wiki.quests.mantis-ship"), "mantis-fight-choice");
  },
  // Pirate ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian:0": (g) => {
    pageFight(g, tx("wiki.quests.you-power-up-your-weapons-and-2"), tx("wiki.quests.pirate-ship"), "pirate-ship-attacking-civilian");
  },
  // Pirate ship attacking civilian. "Stay out of it." One printed result.
  "c:pirate-ship-attacking-civilian:1": (g) => {
    result(g, tx("wiki.quests.the-fight-brings-them-out-of"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Pirate ship attacking civilian distress. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian-distress:0": (g) => {
    pageFight(g, tx("wiki.quests.you-power-up-your-weapons-and-2"), tx("wiki.quests.pirate-ship"), "pirate-ship-attacking-civilian-distress");
  },
  // Pirate ship attacking civilian distress. The distress page's stay-out line.
  "c:pirate-ship-attacking-civilian-distress:1": (g) => {
    result(g, tx("wiki.quests.the-fight-brings-them-out-of-2"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Pirate ship attacking civilian (Lanius). "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian-lanius:0": (g) => {
    pageFight(g, tx("wiki.quests.you-charge-the-weapons-which-quickly"), tx("wiki.quests.pirate-ship"), "pirate-ship-attacking-civilian-lanius");
  },
  // Pirate ship attacking civilian (Lanius). "Avoid the conflict." One printed result.
  "c:pirate-ship-attacking-civilian-lanius:1": (g) => {
    result(g, tx("wiki.quests.unfortunately-it-is-not-your-mission"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking civilian. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-civilian:0": (g) => {
    pageFight(g, tx("wiki.quests.you-charge-your-weapons-which-quickly"), tx("wiki.quests.lanius-ship"), "lanius-ship-attacking-civilian");
  },
  // Lanius ship attacking civilian. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian:1": (g) => {
    result(g, tx("wiki.quests.unfortunately-it-is-not-your-mission"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking civilian distress. "Fight the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-civilian-distress:0": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-to-intercept-the"), tx("wiki.quests.lanius-ship"), "lanius-ship-attacking-civilian-distress");
  },
  // The Mercenary. "Fight the ship." One printed lead-in, then a Pirate ship fight.
  "c:the-mercenary:1": (g) => {
    pageFight(g, tx("wiki.quests.mercenaries-are-worse-than-rebels-the"), tx("wiki.quests.pirate-ship"), "the-mercenary");
  },
  // Pirate toll. "Reject their offer." One printed lead-in, then a Pirate ship fight.
  "c:pirate-toll:1": (g) => {
    pageFight(g, tx("wiki.quests.too-bad-you-will-regret-this"), tx("wiki.quests.pirate-ship"), "pirate-toll");
  },
  // Lanius ship attacking Rock. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-rock:0": (g) => {
    pageFight(g, tx("wiki.quests.the-rockmen-need-your-help-you"), tx("wiki.quests.lanius-ship"), "lanius-ship-attacking-rock");
  },
  // Lanius ship attacking Rock. "Leave the Rockmen to their fate." One printed result.
  "c:lanius-ship-attacking-rock:1": (g) => {
    result(g, tx("wiki.quests.as-you-make-your-escape-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship absorbing automated scout. "Leave them alone." One printed result. Do not inspect the scout.
  "c:lanius-ship-absorbing-automated-scout:1": (g) => {
    result(g, tx("wiki.quests.whatever-assistance-the-disabled-scout-could"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Mantis ship attacking Crystal. "Ignore them." One printed result.
  "c:mantis-ship-attacking-crystal:1": (g) => {
    result(g, tx("wiki.quests.you-try-to-keep-a-low"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Mantis ship with Rock body parts. "Ignore them." One printed result.
  "c:mantis-ship-with-rock-body-parts:1": (g) => {
    result(g, tx("wiki.quests.the-mantis-take-no-interest-in"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius lone ship. "Stay out of it." One printed result.
  "c:lanius-lone-ship:1": (g) => {
    result(g, tx("wiki.quests.you-ignore-the-ship-s-pleas"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Crystal fight choice. "Leave them alone." One printed result.
  "c:crystal-fight-choice:1": (g) => {
    result(g, tx("wiki.quests.it-s-best-to-take-advantage"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Destroyed cargo ship. "Leave it alone, this looks suspicious." One printed result.
  "c:destroyed-cargo-ship:1": (g) => {
    result(g, tx("wiki.quests.you-leave-the-cargo-alone-and"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Pirate ship attacking Crystal. "Ignore them." One printed result.
  "c:pirate-ship-attacking-crystal:1": (g) => {
    result(g, tx("wiki.quests.you-assume-the-crystalline-ship-can"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Escort civilians. "Decline." One printed result.
  "c:escort-civilians:1": (g) => {
    result(g, tx("wiki.quests.we-understand-not-everyone-is-confident"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Remote settlement. "Ignore them." One printed result.
  "c:remote-settlement:1": (g) => {
    result(g, tx("wiki.quests.it-s-just-not-possible-to"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Pirate smuggler. "Ignore the ship." One printed result.
  "c:pirate-smuggler:1": (g) => {
    result(g, tx("wiki.quests.it-jumps-away-after-a-time"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Refueling platform garbled broadcast. "Ignore the platform." One printed result.
  "c:refueling-platform-garbled-broadcast:1": (g) => {
    result(g, tx("wiki.quests.you-leave-the-platform-alone-and"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Refueling platform garbled broadcast. "Dock with the platform." The berth, then signal or the blast doors.
  "c:refueling-platform-garbled-broadcast:2": (g) => {
    card(g, tx("wiki.quests.your-ship-enters-one-of-the"), [
      { id: "s:garbled-dock:signal", label: tx("wiki.quests.signal-for-a-refuel") },
      { id: "s:garbled-dock:doors", label: tx("wiki.quests.secure-your-blast-doors-best-to") },
    ]);
  },
  // "Signal for a refuel." Three results, no odds and no DuplicateEvent. INFERRED: equal, one of three.
  "s:garbled-dock:signal": (g) => {
    const kind = pick(g, ["abandoned", "trap", "breach"] as const);
    if (kind === "abandoned") {
      const n = between(g, [3, 5]);
      g.fuel += n;
      log(g, tx("wiki.quests.fuel-3", { n: n }));
      card(g, tx("wiki.quests.no-one-answers-your-hails-you"), [
        { id: "s:garbled-dock:continue", label: tx("wiki.quests.continue-2") },
        { id: "s:garbled-dock:sensors2", label: tx("wiki.quests.run-another-scan-at-maximum-sensitivity") },
        { id: "s:garbled-dock:sensors3", label: tx("wiki.quests.run-another-scan-at-maximum-sensitivity") },
      ]);
      return;
    }
    if (kind === "trap") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 3);
      pageFight(g, tx("wiki.quests.what-seemed-to-be-a-brief"), tx("wiki.quests.lanius-ship"), "refueling-platform-garbled-broadcast");
      return;
    }
    // A breach in one room. INFERRED: every player room is equally likely. The page prints no system damage.
    const rooms = g.player.rooms;
    const hit = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
    if (hit) hit.breach += 1;
    pageFight(g, tx("wiki.quests.your-ship-s-dash-suddenly-lights"), tx("wiki.quests.lanius-ship"), "refueling-platform-garbled-broadcast");
    const land = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
    const hp = kinOf("voidlung").hp;
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: tx("wiki.quests.lanius"),
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room: land?.id ?? "p-medbay",
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "voidlung",
    });
    log(g, tx("wiki.quests.1-lanius-boarder-beams-aboard-your"));
  },
  // Blast Doors, level 2+. questChoose already skips this when the requirement fails.
  "s:garbled-dock:doors": (g) => {
    if ((g.player.systems.doors?.level ?? 0) < 2) return;
    g.fuel += 5;
    log(g, tx("wiki.quests.fuel-5"));
    result(g, tx("wiki.quests.your-reinforced-doors-save-you-from"));
  },
  // Abandoned follow-up. The page prints no italic before this line.
  "s:garbled-dock:continue": (g) => {
    result(g, tx("wiki.quests.nothing-happens"));
  },
  // Improved Sensors, level 2. The button stays on the abandoned card. questChoose skips a ship that is short.
  "s:garbled-dock:sensors2": (g) => {
    if (sensors(g) < 2) return;
    const n = between(g, [1, 3]);
    g.fuel += n;
    log(g, tx("wiki.quests.fuel-3", { n: n }));
    result(g, tx("wiki.quests.you-run-an-additional-more-focused"));
  },
  // Advanced Sensors, level 3. Same label as the level-2 scan. A level-3 ship may take either; neither is picked for it.
  "s:garbled-dock:sensors3": (g) => {
    if (sensors(g) < 3) return;
    const fuel = between(g, [2, 3]);
    const parts = between(g, [1, 3]);
    g.fuel += fuel;
    g.player.parts += parts;
    log(g, tx("wiki.quests.fuel", { fuel: fuel }));
    log(g, tx("wiki.quests.drone-parts", { parts: parts }));
    result(g, tx("wiki.quests.you-run-an-additional-more-focused-2"));
  },
  // Refueling platform. "Ignore the refueling platform."
  // {{DuplicateEvent|2}} is Nothing happens, then one printed pirate-bait fight.
  // INFERRED: those three printed slots are weights 2 and 1. Nothing has no italic.
  // This handler returns before citedChoose, so the choice fx does not also start a fight.
  "c:refueling-platform:1": (g) => {
    const r = weighted(g, [["nothing", 2], ["fight", 1]] as const);
    if (r === "nothing") {
      result(g, tx("wiki.quests.nothing-happens"));
      return;
    }
    pageFight(g, tx("wiki.quests.as-you-prepare-to-leave-the"), tx("wiki.quests.pirate-ship"), "refueling-platform");
  },
  // Refueling platform. "Dock with the refueling platform." Five printed results and no odds.
  // INFERRED: equal, one of five. The offer's price is rolled on accept.
  "c:refueling-platform:0": (g) => {
    const kind = pick(g, ["offer", "steal", "ignite", "staff", "ambush"] as const);
    if (kind === "offer") {
      card(g, tx("wiki.quests.the-platform-makes-an-offer"), [
        { id: "s:refuel-dock:accept", label: tx("wiki.quests.accept-it") },
        { id: "s:refuel-dock:reject", label: tx("wiki.quests.reject-it") },
      ]);
      return;
    }
    if (kind === "steal") {
      card(g, tx("wiki.quests.the-automated-platform-seems-to-be"), [
        { id: "s:refuel-dock:steal", label: tx("wiki.quests.steal-it") },
        { id: "s:refuel-dock:values", label: tx("wiki.quests.war-doesn-t-justify-abandoning-one") },
      ]);
      return;
    }
    if (kind === "ignite") {
      card(g, tx("wiki.quests.the-platform-seems-to-be-malfunctioning"), [
        { id: "s:refuel-dock:quick", label: tx("wiki.quests.quickly-dock-and-refuel") },
        { id: "s:refuel-dock:berth", label: tx("wiki.quests.give-the-station-a-wide-berth") },
      ]);
      return;
    }
    if (kind === "staff") {
      card(g, tx("wiki.quests.you-dock-and-signal-the-fuel"), [
        { id: "s:refuel-dock:wait", label: tx("wiki.quests.wait-for-them-to-finish") },
        { id: "s:refuel-dock:doors", label: tx("wiki.quests.seal-your-blast-doors-one-can") },
      ]);
      return;
    }
    refuelAmbush(g);
  },
  "s:refuel-dock:accept": (g) => {
    const n = between(g, [5, 10]);
    if (g.scrap < n) return;
    g.scrap -= n;
    g.fuel += 5;
    log(g, tx("wiki.quests.scrap-3", { n: n }));
    log(g, tx("wiki.quests.fuel-5"));
    result(g, tx("wiki.quests.you-receive-5-fuel"), undefined, [tx("wiki.quests.scrap-3", { n: n }), tx("wiki.quests.fuel-5")]);
  },
  "s:refuel-dock:reject": (g) => {
    result(g, tx("wiki.quests.nothing-happens"));
  },
  "s:refuel-dock:steal": (g) => {
    const n = between(g, [3, 5]);
    g.fuel += n;
    log(g, tx("wiki.quests.fuel-3", { n: n }));
    result(g, tx("wiki.quests.if-you-take-the-fuel-at"), undefined, [tx("wiki.quests.fuel-3", { n: n })]);
  },
  "s:refuel-dock:values": (g) => {
    result(g, tx("wiki.quests.nothing-happens"));
  },
  // Quickly dock. Two printed results and no odds. INFERRED: equal.
  "s:refuel-dock:quick": (g) => {
    if (pick(g, ["safe", "boom"] as const) === "safe") {
      g.fuel += 5;
      log(g, tx("wiki.quests.fuel-5"));
      result(g, tx("wiki.quests.you-re-able-to-safely-refuel"), undefined, [tx("wiki.quests.fuel-5")]);
      return;
    }
    const text = tx("wiki.quests.just-as-you-hook-up-to");
    log(g, text);
    if (damageHull(g, 3)) return;
    refuelEngines(g, true);
    // The page says lose 3 fuel. INFERRED: fuel does not go below zero.
    const lost = Math.min(g.fuel, 3);
    g.fuel -= lost;
    log(g, tx("wiki.quests.fuel-4", { lost: lost }));
    result(g, text, undefined, [tx("wiki.quests.fuel-4", { lost: lost })]);
  },
  "s:refuel-dock:berth": (g) => {
    result(g, tx("wiki.quests.you-pull-away-from-the-station"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "s:refuel-dock:wait": (g) => {
    log(g, tx("wiki.quests.as-you-dock-with-the-refueling"));
    if (damageHull(g, 3)) return;
    hurtSystem(g.player, "engines", 3);
    // "2-4 boarders". The race is not named. INFERRED: human, the same as the pirate burst on Abandoned station.
    humanBoarders(g, 2, 4, tx("wiki.quests.boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },
  "s:refuel-dock:doors": (g) => {
    if ((g.player.systems.doors?.level ?? 0) < 2) return;
    g.fuel += 5;
    log(g, tx("wiki.quests.fuel-5"));
    result(g, tx("wiki.quests.pirates-hidden-on-the-station-are"), undefined, [tx("wiki.quests.fuel-5")]);
  },
  // Rebel ship supplying civilians. "Leave them be." One printed result.
  "c:rebel-ship-supplying-civilians:1": (g) => {
    result(g, tx("wiki.quests.nothing-happens"));
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
    result(g, tx("wiki.quests.nothing-happens"));
  },
  "s:zoltan-raft:hire": (g) => {
    zoltanRaftHire(g);
  },
  // Zoltan ship asks to dock. "Have them keep their distance." One printed result.
  "c:zoltan-ship-asks-to-dock:1": (g) => {
    result(g, tx("wiki.quests.they-leave-without-a-word"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking Mantis. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-mantis:0": (g) => {
    pageFight(g, tx("wiki.quests.the-lanius-haven-t-noticed-you"), tx("wiki.quests.lanius-ship"), "lanius-ship-attacking-mantis");
  },
  // Lanius ship attacking Mantis. "Leave the Mantis to their fate." One printed result.
  "c:lanius-ship-attacking-mantis:1": (g) => {
    result(g, tx("wiki.quests.the-mantis-ship-is-quickly-overcome"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking Slug. "Leave the Slugs to their fate." One printed result.
  "c:lanius-ship-attacking-slug:1": (g) => {
    result(g, tx("wiki.quests.you-leave-the-lanius-ship-alone"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Zoltan ship follows Mantis ship. "Interfere and save the Mantis ship." One printed lead-in, then a Zoltan ship fight in the asteroid field.
  "c:zoltan-ship-follows-mantis-ship:0": (g) => {
    pageFight(
      g,
      tx("wiki.quests.sometimes-you-have-to-bet-on"),
      tx("wiki.quests.zoltan-ship"),
      "zoltan-ship-follows-mantis-ship",
      undefined,
      true,
    );
  },
  // Zoltan ship follows Mantis ship. "Interfere and help the Zoltan ship." One printed lead-in, then a Mantis ship fight in the asteroid field.
  // The page prints "crew entirely composed of Mantis." allMantisCrew replaces any other race after the fight starts.
  "c:zoltan-ship-follows-mantis-ship:1": (g) => {
    pageFight(
      g,
      tx("wiki.quests.you-overtake-the-zoltan-and-catch"),
      tx("wiki.quests.mantis-ship"),
      "zoltan-ship-follows-mantis-ship",
      undefined,
      true,
    );
    allMantisCrew(g);
  },
  // Zoltan ship follows Mantis ship. "Don't interfere." One printed result.
  "c:zoltan-ship-follows-mantis-ship:2": (g) => {
    result(g, tx("wiki.quests.the-zoltan-know-their-business-better"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Zoltan wise man. "Mantis." One printed lead-in, then a Mantis ship whose crew are all Mantis.
  "c:zoltan-wise-man:0": (g) => {
    pageFight(g, tx("wiki.quests.you-like-a-challenge-so-be"), tx("wiki.quests.mantis-ship"), "zoltan-wise-man");
    allMantisCrew(g);
  },
  // Zoltan wise man. "Slug." One printed lead-in, then a Slug ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:1": (g) => {
    pageFight(g, tx("wiki.quests.do-not-be-fooled-federation-by"), tx("wiki.quests.slug-ship"), "zoltan-wise-man");
  },
  // Zoltan wise man. "Rockmen." One printed lead-in, then a Rock ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:2": (g) => {
    pageFight(g, tx("wiki.quests.a-hardened-foe-for-a-hardened"), tx("wiki.quests.rock-ship"), "zoltan-wise-man");
  },
  // Space station under construction. "Decline." One printed result.
  "c:space-station-under-construction:1": (g) => {
    result(g, tx("wiki.quests.i-understand-transmission-has-been-cut"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Space station under construction. {{Blue Option|Lanius Crew}}. The sale loses that Lanius.
  // Clone Bay: "Your clonebay obviously does not revive your crewmember since they did not die."
  "c:space-station-under-construction:2": (g) => {
    if (!hasLanius(g)) return;
    card(g, tx("wiki.quests.interesting-so-this-metal-man-can"), [
      { id: "q:station:sale", label: tx("wiki.quests.ask-your-crew-if-they-agree") },
      { id: "q:station:nosale", label: tx("wiki.quests.our-crew-is-not-for-sale") },
    ]);
  },
  "q:station:sale": (g) => {
    const living = g.crew.filter((c) => c.side === "player" && c.hp > 0);
    const sold = living.find((c) => c.kin === "voidlung");
    // The project does not remove the last living crewmember. A clone bay does not bring a sold Lanius back.
    if (!sold || living.length < 2) return;
    g.crew = g.crew.filter((c) => c.id !== sold.id);
    log(g, tx("wiki.quests.is-gone", { name: sold.name }));
    result(g, tx("wiki.quests.once-your-lanius-crewmember-understands"), scrapOnly(g, "high"), [grantRandomItem(g, "augment")]);
  },
  "q:station:nosale": (g) => {
    result(
      g,
      tx("wiki.quests.a-pity-in-terms-of-payment"),
      scrapOnly(g, "medium"),
    );
  },
  // Crystal ship attacking Federation loyalists. "Save the Federation ship." One printed lead-in, then a Crystal ship fight.
  // {{SurrenderEscape(alt)|no|CRYSTAL_FED}} is not this line.
  "c:crystal-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(g, tx("wiki.quests.it-doesn-t-look-like-the"), tx("wiki.quests.crystal-ship"), "crystal-ship-attacking-federation-loyalists");
  },
  // Crystal ship attacking Federation loyalists. "Prepare to leave." One printed result.
  "c:crystal-ship-attacking-federation-loyalists:1": (g) => {
    result(g, tx("wiki.quests.with-the-federation-ship-distracting-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Engi smashed ships. "Attempt to help the ships by prying them apart." One printed lead-in, then an Engi ship fight.
  "c:engi-smashed-ships:0": (g) => {
    pageFight(g, tx("wiki.quests.to-your-surprise-one-of-the"), tx("wiki.quests.engi-ship"), "engi-smashed-ships");
  },
  // The Engi virus. "Attack the Engi vessel!" One printed lead-in, then an Engi ship fight. Halving engines and shields is the other choice.
  "c:the-engi-virus:1": (g) => {
    pageFight(g, tx("wiki.quests.the-engi-be-damned-no-one"), tx("wiki.quests.engi-ship"), "the-engi-virus");
  },
  // The Engi virus. "Hold on! Let us try to purge the system code!" One printed lead-in, then an Engi ship fight.
  // The page halves Engines and Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:the-engi-virus:0": (g) => {
    pageFight(g, tx("wiki.quests.wiping-your-engine-core-and-shields"), tx("wiki.quests.engi-ship"), "the-engi-virus");
    halvePlayerSystems(g, ["engines", "shields"]);
  },
  // Slug hacker (choice). "Shields." One printed lead-in, then a Slug ship fight.
  // The page halves Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Destroyed pays medium scrap with resources. A crew kill pays high.
  "c:slug-hacker-choice:0": (g) => {
    choiceWin.set(g, "shields");
    pageFight(g, tx("wiki.quests.very-good-then-your-shield-power"), tx("wiki.quests.slug-ship"), "slug-hacker-choice");
    halvePlayerSystems(g, ["shields"]);
  },
  // Slug hacker (choice). "Oxygen." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Both endings pay medium scrap with resources.
  "c:slug-hacker-choice:1": (g) => {
    choiceWin.set(g, "oxygen");
    pageFight(g, tx("wiki.quests.a-being-that-would-choose-sssuffocation"), tx("wiki.quests.slug-ship"), "slug-hacker-choice");
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (choice). "Weapons." One printed lead-in, then a Slug ship fight.
  // The page halves Weapon Control, rounding down. This handler returns before citedChoose, so the half is applied here.
  // Both endings pay high scrap with resources.
  "c:slug-hacker-choice:2": (g) => {
    choiceWin.set(g, "weapons");
    pageFight(g, tx("wiki.quests.your-acceptance-of-death-is-almosst"), tx("wiki.quests.slug-ship"), "slug-hacker-choice");
    halvePlayerSystems(g, ["weapons"]);
  },
  // Slug hacker (choice). "Offer 35 scrap to leave you alone." One printed result. The page spends 35 scrap.
  // This handler returns before citedChoose, so the scrap is spent here.
  "c:slug-hacker-choice:3": (g) => {
    if (g.scrap < 35) return;
    g.scrap -= 35;
    result(g, tx("wiki.quests.i-really-am-feeling-generousss-they"), undefined, [tx("wiki.quests.you-avoided-the-fight")]);
  },
  // Slug hacker (choice). "Counter any hack attempt." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  // Both endings pay high scrap with resources. The wiki's "[sic]" after "weapon system" is not shown.
  "c:slug-hacker-choice:4": (g) => {
    choiceWin.set(g, "hack");
    pageFight(g, tx("wiki.quests.sssilence-won-t-protect-you-i"), tx("wiki.quests.slug-ship"), "slug-hacker-choice");
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
      tx("wiki.quests.you-message-the-crystalline-ship-your"),
      tx("wiki.quests.rebel-ship"),
      "rebel-ship-attacking-crystal-ship",
    );
  },
  // Rebel ship attacking Crystal ship. "Ignore them." One printed result.
  "c:rebel-ship-attacking-crystal-ship:2": (g) => {
    result(g, tx("wiki.quests.with-the-two-ships-engaged-in"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking Crystal ship. Template:Crystal Ship Saved. The Crystal weapon is not named.
  "q:rebel-crystal:contact": (g) => crystalContact(g),
  // Slug hacker (oxygen). "Try to squeeze some extra power to the system." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-oxygen:1": (g) => {
    pageFight(g, tx("wiki.quests.thankfully-your-improved-subsystem-is-able"), tx("wiki.quests.slug-ship"), "slug-hacker-oxygen");
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (oxygen). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  "c:slug-hacker-oxygen:2": (g) => {
    pageFight(g, tx("wiki.quests.your-hacking-system-automatically-counters-the"), tx("wiki.quests.slug-ship"), "slug-hacker-oxygen");
    shutPlayerHacking(g);
  },
  // Slug hacker (doors). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". The Door System stays online on this path.
  // INFERRED: the installed hacking level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's door shutdown does not run.
  // Both endings on this path pay high scrap. Continue pays medium when the ship is destroyed.
  "c:slug-hacker-doors:1": (g) => {
    doorsCounterWin.set(g, true);
    pageFight(g, tx("wiki.quests.your-hacking-system-automatically-counters-the"), tx("wiki.quests.slug-ship"), "slug-hacker-doors");
    shutPlayerHacking(g);
  },
  // Slug hacker (medical). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page beams 2 slug boarders and says "Hacking offline". Medbay stays online on this path.
  // INFERRED: the installed hacking level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's medical shutdown and boarders do not run.
  "c:slug-hacker-medical:1": (g) => {
    pageFight(g, tx("wiki.quests.you-are-able-to-undo-the"), tx("wiki.quests.slug-ship"), "slug-hacker-medical");
    shutPlayerHacking(g);
    slugBoarders(g, 2, 2, tx("wiki.quests.slug-boarders-beam-aboard-your-ship"));
  },
  // Slug hacker (medical). "Try to squeeze some extra power to the system." One printed lead-in, then a Slug ship fight.
  // The page halves the Medbay, rounding down, and beams 2 slug boarders. Clone Bay stays online.
  // This handler returns before citedChoose, so the Continue path's full medical shutdown does not run.
  "c:slug-hacker-medical:2": (g) => {
    if ((g.player.systems.medbay?.level ?? 0) < 2) return;
    pageFight(g, tx("wiki.quests.fearing-the-imminent-battle-you-desperately"), tx("wiki.quests.slug-ship"), "slug-hacker-medical");
    halvePlayerSystems(g, ["medbay"]);
    slugBoarders(g, 2, 2, tx("wiki.quests.slug-boarders-beam-aboard-your-ship"));
  },
  // Legendary thief KazaaakplethKilik. "Attempt to hail him." One printed lead-in, then a Mantis ship fight.
  // The page prints "crew entirely composed of Mantis." This handler returns before citedChoose.
  "c:legendary-thief-kazaaakplethkilik:1": (g) => {
    pageFight(g, tx("wiki.quests.your-mantis-crew-member-steps-forward"), tx("wiki.quests.mantis-ship"), "legendary-thief-kazaaakplethkilik");
    allMantisCrew(g);
  },
  // Mantis ship with Rock body parts. "Put your Rock crewmember on the comm." One printed lead-in, then a Mantis ship.
  // This handler returns before citedChoose so the Rock requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:2": (g) => {
    pageFight(g, tx("wiki.quests.the-two-aliens-face-one-another"), tx("wiki.quests.mantis-ship"), "mantis-ship-with-rock-body-parts");
  },
  // Mantis ship with Rock body parts. "Ram the bastards." One printed lead-in, then a Mantis ship.
  // The page says their engines are disabled. INFERRED: every installed engine bar is damaged. The page prints no bar count.
  // This handler returns before citedChoose so the Rock Plating requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:3": (g) => {
    pageFight(g, tx("wiki.quests.before-they-have-a-chance-you"), tx("wiki.quests.mantis-ship"), "mantis-ship-with-rock-body-parts");
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage) hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },
  // Pirate engine hacker. "Counter the remote hacking." One printed lead-in, then a Pirate ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's engine cap does not apply.
  "c:pirate-engine-hacker:1": (g) => {
    pageFight(g, tx("wiki.quests.your-hacking-system-automatically-counters-the-2"), tx("wiki.quests.pirate-ship"), "pirate-engine-hacker");
    shutPlayerHacking(g);
  },
  // Zoltan retake the ship. "Leave." One printed result.
  "c:zoltan-retake-the-ship:1": (g) => {
    result(g, tx("wiki.quests.you-refuse-to-get-his-ship"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Federation Deserters. "Attack the traitors." One printed lead-in, then a Federation ship fight.
  "c:federation-deserters:0": (g) => {
    pageFight(g, tx("wiki.quests.deserters-cannot-be-tolerated-you-open"), tx("wiki.quests.federation-ship"), "federation-deserters");
  },
  // Federation Deserters. "Leave them be." One printed result.
  "c:federation-deserters:1": (g) => {
    result(g, tx("wiki.quests.you-send-them-a-friendly-warning"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking refueling outpost. "Intervene to defend the outpost." One printed lead-in, then a Rebel ship fight.
  // Never-escape and never-surrender stay on this fight slug.
  "c:rebel-ship-attacking-refueling-outpost:0": (g) => {
    pageFight(g, tx("wiki.quests.the-rebel-responds-to-your-threat"), tx("wiki.quests.rebel-ship"), "rebel-ship-attacking-refueling-outpost");
  },
  // Auto-ship attacking outpost. "Intervene to defend the outpost." One printed lead-in, then an Auto-ship fight.
  "c:auto-ship-attacking-outpost:0": (g) => {
    pageFight(g, tx("wiki.quests.detecting-the-higher-threat-the-automated"), "Auto-ship", "auto-ship-attacking-outpost");
  },
  // Auto-ship attacking outpost. "Avoid the conflict." One printed result.
  "c:auto-ship-attacking-outpost:1": (g) => {
    result(g, tx("wiki.quests.you-steer-clear-of-the-conflict"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Auto-ship attacking civilian. "Stay out of it." One printed result.
  "c:auto-ship-attacking-civilian:1": (g) => {
    result(g, tx("wiki.quests.the-fight-brings-them-out-of-3"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking refueling outpost. "Avoid the conflict." One printed result.
  "c:rebel-ship-attacking-refueling-outpost:1": (g) => {
    result(g, tx("wiki.quests.the-rebel-ship-fires-some-warning"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking refueling outpost. "Contact the outpost." Medium fuel (tooltip 2-4) and medium scrap.
  "q:refuel-outpost:contact": (g) => {
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, [2, 4]);
    result(
      g,
      tx("wiki.quests.the-outpost-hails-you-the-pompous"),
      offer,
    );
  },
  // Rebel ship attacking civilians in Last Stand. "Prepare to fight the Rebel ship!" One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-civilians-in-last-stand:0": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-to-intercept"), tx("wiki.quests.rebel-ship"), "rebel-ship-attacking-civilians-in-last-stand");
  },
  // Rebel ship attacking civilians in Last Stand. "There's no time, get ready to jump." One printed result.
  "c:rebel-ship-attacking-civilians-in-last-stand:1": (g) => {
    result(g, tx("wiki.quests.you-try-to-block-out-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking civilians in Last Stand. "Contact the survivors." Three results, no odds. INFERRED: equal.
  // The supplies line is Rewards, Stuff: medium resources and low scrap. The page names no bonus item, so none is granted.
  "q:last-stand-survivors:contact": (g) => lastStandSurvivors(g),
  // Lanius ship in rich debris field. "Attempt to harvest some for yourself." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:0": (g) => {
    pageFight(g, tx("wiki.quests.as-you-attempt-to-navigate-the"), tx("wiki.quests.lanius-ship"), "lanius-ship-in-rich-debris-field");
  },
  // Zoltan security checkpoint. "You don't have time for this nonsense. Attack!" One printed lead-in, then a Zoltan ship fight.
  "c:zoltan-security-checkpoint:0": (g) => {
    pageFight(g, tx("wiki.quests.expecting-resistance-their-energy-shield-is"), tx("wiki.quests.zoltan-ship"), "zoltan-security-checkpoint");
  },
  // Lanius ship in rich debris field. "Attack the vessel." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:1": (g) => {
    pageFight(g, tx("wiki.quests.you-go-on-the-offensive-and"), tx("wiki.quests.lanius-ship"), "lanius-ship-in-rich-debris-field");
  },
  // Lanius ship in rich debris field. "Ignore the vessel." One printed result.
  "c:lanius-ship-in-rich-debris-field:2": (g) => {
    result(g, tx("wiki.quests.you-charge-up-your-drive-and"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Lanius ship attacking civilian distress. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian-distress:1": (g) => {
    result(g, tx("wiki.quests.your-crew-seems-unhappy-to-leave"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel ship attacking Federation loyalists. "Aid the Federation ship." One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(g, tx("wiki.quests.you-power-up-your-weapons-and-3"), tx("wiki.quests.rebel-ship"), "rebel-ship-attacking-federation-loyalists");
  },
  // Rebel ship warning has no choice. Arrival calls this id.
  // "Fight a Rebel ship that is running away." One printed lead-in, then the running Rebel fight.
  "c:rebel-ship-warning:0": (g) => {
    pageFight(g, tx("wiki.quests.they-are-powering-up-their-ftl"), tx("wiki.quests.rebel-ship"), "rebel-ship-warning");
  },
  // Rebel ship attacking Federation loyalists. "Use this chance to escape." One printed result.
  "c:rebel-ship-attacking-federation-loyalists:1": (g) => {
    result(g, tx("wiki.quests.the-rebel-s-preoccupation-with-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel shipyard. "Leave immediately." One printed result. Do not grant the unnamed salvage or start the Flagship fight.
  "c:rebel-shipyard:1": (g) => {
    result(g, tx("wiki.quests.you-feel-the-mission-is-the"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rebel transport ship. "Avoid the ship." One printed result.
  "c:rebel-transport-ship:1": (g) => {
    result(g, tx("wiki.quests.they-stay-outside-your-weapons-range"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Mantis ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Mantis ship fight.
  "c:mantis-ship-attacking-civilian:0": (g) => {
    pageFight(g, tx("wiki.quests.you-frown-power-up-the-weapons"), tx("wiki.quests.mantis-ship"), "mantis-ship-attacking-civilian");
  },
  // Mantis ship attacking civilian. "Stay out of it." Three results and no odds. INFERRED: equal.
  "c:mantis-ship-attacking-civilian:1": (g) => {
    const line = pick(g, [
      "Smoking, the civilian ship limps on. You set your sights on the future.",
      "The noise of the FTL spinning up almost drowns out the explosions. Almost.",
      "You let them pass and try not to think about it.",
    ] as const);
    result(g, line, undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Mantis ship attacking Slug ship. {{SurrenderEscape(alt)|no}}. The Mantis fight keeps the page slug.
  "c:mantis-ship-attacking-slug-ship:0": (g) => {
    pageFight(g, tx("wiki.quests.you-lock-onto-the-mantis-ship"), tx("wiki.quests.mantis-ship"), "mantis-ship-attacking-slug-ship", { ...NEVER_RUN });
  },
  // The Slug fight must not use the Mantis win. It does not surrender or escape.
  "c:mantis-ship-attacking-slug-ship:1": (g) => {
    pageFight(g, tx("wiki.quests.you-move-to-finish-what-the"), tx("wiki.quests.slug-ship"), "mantis-ship-attacking-slug-ship-slug", { ...NEVER_RUN });
  },
  "q:mantis-slug:leave": (g) => {
    result(g, tx("wiki.quests.these-wretches-aren-t-worth-fighting"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "q:mantis-slug:finish": (g) => {
    mantisSlugFinish(g);
  },
  // Zoltan security checkpoint. Two results, no odds. INFERRED: equal.
  "c:zoltan-security-checkpoint:1": (g) => {
    if (pick(g, ["wanted", "pass"] as const) === "pass") {
      result(g, tx("wiki.quests.after-a-few-moments-of-uncertainty"), undefined, [tx("wiki.quests.nothing-happens")]);
      return;
    }
    card(g, tx("wiki.quests.the-zoltan-security-staff-board-your"), [
      { id: "q:zoltan-checkpoint:give", label: tx("wiki.quests.give-up-your-crewmember") },
      { id: "q:zoltan-checkpoint:fight", label: tx("wiki.quests.refuse-and-fight") },
    ]);
  },
  // Clone Bay has no effect. INFERRED: never the last crewmember.
  "q:zoltan-checkpoint:give": (g) => {
    const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
    const extras: string[] = [];
    if (mine.length > 1) {
      const lost = pick(g, mine);
      g.crew = g.crew.filter((c) => c.id !== lost.id);
      extras.push(tx("wiki.quests.is-lost", { name: lost.name }));
    }
    if (g.player.kits.cradle) extras.push(tx("wiki.quests.unfortunately-your-crewmember-was-taken-away"));
    result(g, tx("wiki.quests.it-s-a-tough-call-but"), undefined, extras);
  },
  // The scan fight is not the attack fight. Weapon Control is halved, and 2-4 Zoltan boarders come aboard.
  "q:zoltan-checkpoint:fight": (g) => {
    pageFight(g, tx("wiki.quests.you-re-not-going-to-leave"), tx("wiki.quests.zoltan-ship"), "zoltan-security-checkpoint-scan");
    halvePlayerSystems(g, ["weapons"]);
    zoltanBoarders(g, 2, 4);
  },
  // {{Blue Option|Slug Crew}}. Medium fuel, 2-4. A dead Slug does not count.
  "c:zoltan-security-checkpoint:2": (g) => {
    if (!hasSlug(g)) return;
    zoltanCheckpointFuel(g, tx("wiki.quests.you-give-the-guards-permission-to"));
  },
  // {{Blue Option|Mind Control}}. Medium fuel, 2-4.
  "c:zoltan-security-checkpoint:3": (g) => {
    if ((g.player.kits.leash?.level ?? 0) <= 0) return;
    zoltanCheckpointFuel(g, tx("wiki.quests.the-captain-of-the-guard-appears"));
  },
  // Pirate ship attacking civilian distress. Improved Weapons, level 6+. Two results, no odds. INFERRED: equal.
  // The scare-off path offers the same civilian contact. The page's scrap preview is not a separate payout.
  "c:pirate-ship-attacking-civilian-distress:2": (g) => {
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    if (pick(g, ["fight", "leave"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.detecting-the-greater-threat-and-potential"), tx("wiki.quests.pirate-ship"), "pirate-ship-attacking-civilian-distress");
      return;
    }
    card(g, tx("wiki.quests.it-seems-the-pirate-wasn-t"), [
      { id: "q:lanius-civilian:contact", label: tx("wiki.quests.contact-the-civilian-ship") },
    ]);
  },
  // Auto-ship near storage station. Two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.before-you-can-get-close-enough"), "Auto-ship", "auto-ship-near-storage-station");
      return;
    }
    storageInvestigate(g, tx("wiki.quests.the-ship-patrols-wide-around-the"));
  },
  // Auto-ship near storage station in nebula. Cloaking: two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station-in-nebula:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.you-try-to-sneak-past-the"), "Auto-ship", "auto-ship-near-storage-station-in-nebula");
      return;
    }
    storageInvestigate(g, tx("wiki.quests.you-successfully-sneak-by-the-ship"));
  },
  // Improved Cloaking, level 2+. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:3": (g) => {
    if ((g.player.kits.veil?.level ?? 0) < 2) return;
    storageInvestigate(g, tx("wiki.quests.you-successfully-sneak-by-the-ship"));
  },
  // Hacking, one drone part. Two results, no odds. INFERRED: equal. The part is spent either way.
  "c:auto-ship-near-storage-station-in-nebula:4": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.quests.drone-parts-1"));
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, tx("wiki.quests.you-send-a-drone-to-hack"), "Auto-ship", "auto-ship-near-storage-station-in-nebula");
      return;
    }
    storageInvestigate(g, tx("wiki.quests.you-successfully-hack-into-the-station"));
  },
  // Improved Hacking, level 2+, one drone part. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:5": (g) => {
    if ((g.player.kits.spike?.level ?? 0) < 2 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.quests.drone-parts-1"));
    storageInvestigate(g, tx("wiki.quests.you-successfully-hack-into-the-station-2"));
  },
  // Auto-ship near radar station. {{DuplicateEvent|2}} on the station, once on the fight.
  // The two station sentences have no odds between them. INFERRED: equal. The part is spent either way.
  // The map reveal inside Access the station is not wired.
  "c:auto-ship-near-radar-station:2": (g) => {
    if (!hasRadarCombat(g) || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.quests.drone-parts-1"));
    if (weighted(g, [["station", 2], ["fight", 1]] as const) === "fight") {
      pageFight(g, tx("wiki.quests.before-your-drone-has-a-chance"), "Auto-ship", "auto-ship-near-radar-station");
      return;
    }
    const lead = pick(g, [
      "Your combat drone attacks the automated ship and then retreats, luring it away. You quickly move up to the radar station to access it.",
      "Your combat drone repeatedly fires at the automated ship. It can't break through its shields, but is at least enough of a distraction to allow you to access the radar station.",
    ] as const);
    autoRadarAccess(g, lead);
  },
  "q:auto-radar:hack": (g) => {
    autoRadarAccess(g);
  },
  "q:auto-radar:leave": (g) => {
    result(g, tx("wiki.quests.you-leave-the-station-and-prepare"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Hacking spends one drone part. The page prints one result: a one-turn fleet delay and a map download.
  // The map reveal is not wired.
  "q:auto-radar:drone": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.quests.drone-parts-1"));
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, tx("wiki.quests.you-successfully-hack-into-their-system"), undefined, [tx("wiki.quests.the-rebel-fleet-is-delayed-for")]);
  },
  // Template:Investigate the station. Four results, no odds. INFERRED: equal.
  // The weapon and the drone schematic are unnamed: Rewards, "Weapon": "A random weapon & T scrap." / "Drone": "A
  // random drone schematic & T scrap."
  "q:auto-storage:investigate": (g) => {
    const kind = pick(g, ["weapon", "schematic", "resources", "nothing"] as const);
    if (kind === "weapon") {
      result(g, tx("wiki.quests.the-station-is-a-storage-site"), scrapOnly(g, "low"), [grantRandomItem(g, "weapon")]);
      return;
    }
    if (kind === "schematic") {
      result(g, tx("wiki.quests.the-station-was-apparently-designed-to"), scrapOnly(g, "low"), [grantRandomItem(g, "drone")]);
      return;
    }
    if (kind === "resources") {
      result(g, tx("wiki.quests.the-station-is-a-storage-site-2"), rollSurrenderOffer(g, "medium", true));
      return;
    }
    result(g, tx("wiki.quests.the-station-was-either-abandoned-or"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  "c:auto-ship-near-sensor-station:3": (g) => {
    if (!hasTeleporter(g)) return;
    result(g, tx("wiki.quests.once-on-board-your-crew-is"));
  },
  "q:lanius-scout:inspect": (g) => {
    const offer = scrapOnly(g, pick(g, ["low", "medium", "high"]));
    if (pick(g, ["map", "fleet"] as const) === "fleet") {
      g.fleet = Math.max(0, g.fleet - 1);
      result(g, tx("wiki.quests.you-find-the-ship-has-a"), offer, [tx("wiki.quests.the-rebel-fleet-is-delayed-for")]);
      return;
    }
    result(g, tx("wiki.quests.you-are-able-to-retrieve-a"), offer);
  },
  // Lanius lone ship, "Try to contact the Lanius ship." The civilian warning, then one button.
  "c:lanius-lone-ship:2": (g) => {
    card(g, tx("wiki.quests.you-approach-the-ship-without-activating"), [
      { id: "q:lanius-lone:continue", label: tx("wiki.quests.ignore-them-and-continue") },
    ]);
  },
  // Three results, no odds. INFERRED: equal. The fight is default Lanius rewards, so there is no PAGE_WINS row.
  "q:lanius-lone:continue": (g) => {
    const kind = weighted(g, [["store", 1], ["fight", 1], ["nothing", 1]] as const);
    if (kind === "store") {
      log(g, tx("wiki.quests.you-ask-what-they-want-and"));
      openStoreHere(g);
      return;
    }
    if (kind === "fight") {
      pageFight(g, tx("wiki.quests.you-ask-what-they-are-doing"), tx("wiki.quests.lanius-ship"), "lanius-lone-ship");
      return;
    }
    result(g, tx("wiki.quests.you-ask-what-they-are-doing-2"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // {{Blue Option|Lanius Crew|Try to contact the ship.}} A dead Lanius does not count.
  "c:lanius-lone-ship:3": (g) => {
    if (!hasLanius(g)) return;
    log(g, tx("wiki.quests.your-crewmember-opens-a-channel-with"));
    openStoreHere(g);
  },
  // Lanius powered-down ship. Fights stay on default Lanius rewards: no PAGE_WINS row.
  // Power weapons: two results, no odds. INFERRED: equal.
  "c:lanius-powered-down-ship:1": (g) => {
    if (weighted(g, [["fight", 1], ["silent", 1]] as const) === "fight") {
      pageFight(g, tx("wiki.quests.you-power-up-your-weapons-and-4"), tx("wiki.quests.lanius-ship"), "lanius-powered-down-ship");
      return;
    }
    card(g, tx("wiki.quests.you-power-up-your-weapons-but"), [
      { id: "q:lanius-dormant:investigate", label: tx("wiki.quests.investigate-the-vessel") },
      { id: "q:lanius-dormant:destroy", label: tx("wiki.quests.destroy-and-scrap-it") },
    ]);
  },
  "c:lanius-powered-down-ship:2": (g) => investigateDormant(g),
  "q:lanius-dormant:investigate": (g) => investigateDormant(g),
  "q:lanius-dormant:destroy": (g) => {
    pageFight(g, tx("wiki.quests.as-soon-as-you-lock-your"), tx("wiki.quests.lanius-ship"), "lanius-powered-down-ship");
  },
  "q:lanius-dormant:ignore": (g) => {
    result(g, tx("wiki.quests.nothing-happens"));
  },
  // Navigate carefully. Two results, no odds. INFERRED: equal. Low scrap is scrap only.
  "q:lanius-dormant:navigate": (g) => {
    if (weighted(g, [["fight", 1], ["scrap", 1]] as const) === "fight") {
      pageFight(g, tx("wiki.quests.as-you-drift-toward-the-vessel"), tx("wiki.quests.lanius-ship"), "lanius-powered-down-ship");
      return;
    }
    result(g, tx("wiki.quests.you-clumsily-manage-to-strip-some"), scrapOnly(g, "low"));
  },
  // {{Blue Option|Lanius Crew}}. Medium resources with some scrap (Rewards, Stuff). The unnamed bonus item is not granted.
  "q:lanius-dormant:plunder": (g) => {
    if (!hasLanius(g)) return;
    result(g, tx("wiki.quests.your-crewmember-manages-to-salvage-some"), rollSurrenderOffer(g, "medium", true));
  },
  // {{Blue Option|Advanced Piloting|level=2+}}. Medium scrap with resources.
  "q:lanius-dormant:autopilot": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, tx("wiki.quests.the-computer-matches-the-rotation-and"), rollStandard(g, "medium"));
  },
  // Engi fleet discussion, "Message them and ask if you can help." -> "Nothing happens."
  "c:engi-fleet-discussion:0": (g) => {
    result(g, tx("wiki.quests.slightly-shocked-at-your-question-their"));
  },
  // Engi fleet discussion. "Ignore it and move on." One printed result.
  "c:engi-fleet-discussion:1": (g) => {
    result(g, tx("wiki.quests.you-can-t-help-but-wonder"), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // {{Blue Option|Engi Crew|Have your Engi crewmember contact them.}}
  "c:engi-fleet-discussion:2": (g) => {
    if (!hasEngi(g)) return;
    card(g, tx("wiki.quests.your-crew-member-syncs-with-the"), [
      { id: "q:engi-fleet:offer", label: tx("wiki.quests.offer-your-help") },
    ]);
  },
  "q:engi-fleet:offer": (g) => {
    // "A quest marker is added to your map." ... "A second quest marker is added to your map." -> "Agree."
    const first = addQuest(g, "engi-real");
    const second = addQuest(g, "engi-fake");
    card(
      g,
      tx("wiki.quests.secret-technologies-stolen-by-mantis-implicit", { first: first, second: second }),
      [{ id: "ack", label: tx("wiki.quests.agree") }],
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
      const joined = crew(g, tx("wiki.quests.human"));
      log(g, joined);
      defectorFight(g, tx("wiki.quests.relieved-and-light-headed-your-new"));
    } else if (r === "deceive") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 1);
      g.fleet *= 2;
      log(g, tx("wiki.quests.rebel-fleet-pursuit-is-doubled"));
      defectorFight(g, tx("wiki.quests.the-dishonorable-rebel-has-deceived-you"));
    } else if (r === "trigger") {
      if (damageHull(g, 3)) return;
      defectorFight(g, tx("wiki.quests.your-new-crew-member-smiles-then"));
      humanBoarders(g, 2, 2);
    } else {
      // "You lose a crewmember" (Clone Bay: "The lost crewmember is revived."). Never the last living crewmember.
      const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
      if (g.player.kits.cradle) log(g, tx("wiki.quests.the-eviscerated-crewmember-s-clone-launches"));
      else if (mine.length > 1) {
        const lost = pick(g, mine);
        g.crew = g.crew.filter((c) => c.id !== lost.id);
        log(g, tx("wiki.quests.is-gone", { name: lost.name }));
      }
      defectorFight(g, tx("wiki.quests.the-rebel-makes-to-take-his"));
      humanBoarders(g, 1, 1);
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
      card(g, tx("wiki.quests.he-offers-to-lead-you-to"), [
        { id: "q:defector:reluctant", label: tx("wiki.quests.reluctantly-accept-his-proposal-and-fight") },
        { id: "q:defector:execute", label: tx("wiki.quests.reject-him-outright-and-execute-him") },
        { id: "q:defector:again", label: tx("wiki.quests.reject-his-offer-again") },
      ]);
    } else if (r === "boarder") {
      defectorFight(g, tx("wiki.quests.attempting-to-deal-with-attacks-from"));
      humanBoarders(g, 1, 1);
    } else {
      defectorFight(g, tx("wiki.quests.your-fearless-crew-easily-overcome-the"));
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
      const joined = crew(g, tx("wiki.quests.human"));
      const line = addQuest(g, "defector-cache");
      log(g, joined);
      defectorFight(g, tx("wiki.quests.relieved-and-light-headed-your-new"));
      log(g, line);
    } else if (r === "deceive") {
      // "3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled". Doubling as cited-events.ts fx "double".
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 1);
      g.fleet *= 2;
      log(g, tx("wiki.quests.rebel-fleet-pursuit-is-doubled"));
      defectorFight(g, tx("wiki.quests.the-dishonorable-rebel-has-deceived-you"));
    } else if (r === "trigger") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "pilot", 1);
      defectorFight(g, tx("wiki.quests.your-new-crew-member-smiles-then"));
      humanBoarders(g, 2, 2);
    } else {
      // "You lose a crewmember" (Clone Bay: "The lost crewmember is revived."). INFERRED: never the last crewmember.
      const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
      if (g.player.kits.cradle) log(g, tx("wiki.quests.the-eviscerated-crewmember-s-clone-launches"));
      else if (mine.length > 1) {
        const lost = pick(g, mine);
        g.crew = g.crew.filter((c) => c.id !== lost.id);
        log(g, tx("wiki.quests.is-gone", { name: lost.name }));
      }
      defectorFight(g, tx("wiki.quests.the-rebel-makes-to-take-his"));
      humanBoarders(g, 1, 1);
    }
  },
  "q:defector:execute": (g) => {
    // Wiki citations:
    // > "Reject him outright and execute him on the spot." — [[Rebel defector]]
    // > "You fight a Rebel ship (default rewards)." — [[Rebel defector]]
    defectorFight(g, tx("wiki.quests.you-execute-the-defector-and-turn"));
  },
  "q:defector:again": (g) => {
    // Wiki citations:
    // > "Reject his offer again." — [[Rebel defector]]
    defectorFight(g, tx("wiki.quests.you-reject-his-offer-again"));
    humanBoarders(g, 1, 1);
  },

  // ---- Quest-beacon choices ----
  "q:open-store": (g) => {
    openStoreHere(g);
  },
  "q:escort:fight": (g) => pageFight(g, tx("wiki.quests.the-rebel-ship-attacks"), tx("wiki.quests.rebel-ship"), "quest-escort"),

  "q:war-camp:leave": (g) => {
    if (rand(g) < 0.5) {
      pageFight(g, tx("wiki.quests.as-you-try-to-leave-a"), tx("wiki.quests.mantis-ship"), "quest-mantis-war-camp", { ...NEVER_RUN });
    } else {
      result(g, tx("wiki.quests.they-must-have-been-focused-on"));
    }
  },
  "q:war-camp:missile": (g) => {
    if (g.missiles < 1 || !hasMissileWeapon(g)) return;
    g.missiles -= 1;
    pageFight(g, tx("wiki.quests.you-fire-at-their-fuel-depot"), tx("wiki.quests.mantis-ship"), "quest-mantis-war-camp", { ...NEVER_RUN });
  },
  "q:war-camp:firebomb": (g) => {
    if (g.missiles < 2) return;
    g.missiles -= 2;
    const joined = crew(g, tx("wiki.quests.engi"));
    result(
      g,
      tx("wiki.quests.it-appears-they-have-not-set"),
      rollSurrenderOffer(g, "high", true),
      [joined],
    );
  },

  "q:station:attack": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-to-attack-the"), tx("wiki.quests.rebel-ship"), "quest-space-station-rebel", { ...NEVER_RUN });
    // "while a planet-side Anti-Ship Battery periodically fires on your ship."
    g.asb = true;
  },
  "q:station:leave": (g) => result(g, tx("wiki.quests.you-apologize-but-it-s-not")),
  "q:station:contact": (g) => {
    result(g, tx("wiki.quests.amidst-the-blasts-from-the-anti"), scrapOnly(g, "medium"));
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
      ["shell", 1],
    ] as ["rest" | "hull" | "pirate" | "battery" | "clone" | "shell", number][]);
    if (r === "rest") {
      result(g, tx("wiki.quests.you-approach-cautiously-but-you-detect"), scrapOnly(g, "low"));
    } else if (r === "hull") {
      result(g, tx("wiki.quests.upon-closer-inspection-it-appears-to"), scrapOnly(g, "low"));
    } else if (r === "pirate") {
      pageFight(g, tx("wiki.quests.you-dock-with-the-station-to"), tx("wiki.quests.pirate-ship"), "quest-abandoned-station");
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      log(g, tx("wiki.quests.you-dock-with-the-station-to-2"));
      humanBoarders(g, 2, 4, tx("wiki.quests.boarders-beam-aboard"));
      beginBoarding(g, true);
    } else if (r === "clone") {
      const choices: Choice[] = [{ id: "q:station:scrapmachines", label: tx("wiki.quests.scrap-the-machinery") }];
      if (g.player.kits.cradle) choices.unshift({ id: "q:station:dna", label: tx("wiki.quests.search-for-a-surviving-dna-bank") });
      card(g, tx("wiki.quests.the-station-is-in-disarray-you"), choices);
    } else {
      result(g, tx("wiki.quests.as-you-approach-it-becomes-clear"));
    }
  },
  // Clonebay DNA: DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The crazed boarder's race is not named. INFERRED human, same as the unnamed boarders on this page.
  "q:station:dna": (g) => {
    const rebuilt = tx("wiki.quests.while-the-cloning-facilities-are-no");
    if (weighted(g, [["calm", 2], ["crazed", 1]] as ["calm" | "crazed", number][]) === "crazed") {
      log(g, tx("wiki.quests.the-clone-emerges-in-a-crazed", { rebuilt: rebuilt }));
      humanBoarders(g, 1, 1, tx("wiki.quests.boarder-beams-aboard"));
      beginBoarding(g);
      return;
    }
    // DuplicateEvent|2: calms down, or seems to accept. INFERRED: equal.
    const calm = rand(g) < 0.5
      ? tx("wiki.quests.the-clone-is-extremely-confused-but", { rebuilt: rebuilt })
      : tx("wiki.quests.the-clone-is-extremely-confused-but-2", { rebuilt: rebuilt });
    result(g, calm, undefined, [crew(g, randomRace(g))]);
  },
  "q:station:scrapmachines": (g) => result(g, tx("wiki.quests.you-take-what-you-can-and"), scrapOnly(g, "low")),
  "q:station:stay": (g) => result(g, tx("wiki.quests.you-decide-it-s-not-worth")),
  "q:station:fuel4": (g) => {
    if (g.fuel < 4) return;
    g.fuel -= 4;
    result(g, tx("wiki.quests.great-thank-you-here-s-some"), scrapOnly(g, "medium"));
  },
  "q:station:fuel1": (g) => {
    if (g.fuel < 1) return;
    g.fuel -= 1;
    result(g, tx("wiki.quests.well-i-suppose-that-s-better"));
  },
  "q:station:none": (g) => result(g, tx("wiki.quests.i-see")),

  "q:mantis-collectors:follow": (g) => {
    result(g, tx("wiki.quests.you-input-their-coordinates-into-your"), undefined, [addQuest(g, "mantis-chase")]);
  },
  "q:mantis-collectors:forget": (g) => result(g, tx("wiki.quests.they-re-not-worth-the-trouble")),
  // DONOR_MANTIS_CHASE2: "attempts to escape at 60% hull (12 seconds timer)". INFERRED: a certain attempt, like CHASE1.
  // "Fight a Mantis Bomber" with crew entirely composed of Mantis.
  "q:mantis-chase:fight": (g) => {
    pageFight(g, tx("wiki.quests.the-mantis-bomber-moves-in"), tx("wiki.quests.mantis-bomber"), "quest-mantis-chase", hullRun(100, 60, 12));
    allMantisCrew(g);
  },

  "q:loyalists:contact": (g) => {
    const r = pick(g, ["base", "supplies", "rescue"] as const);
    if (r === "base") {
      result(g, tx("wiki.quests.thank-you-for-saving-us-this"), undefined, [addQuest(g, "fed-base")]);
    } else if (r === "supplies") {
      result(g, tx("wiki.quests.thanks-we-didn-t-think-there"), rollStandard(g, "medium"));
    } else loyalistsRescueCard(g);
  },
  "q:loyalists:rescue": (g) => {
    result(g, tx("wiki.quests.despite-your-efforts-the-majority-do"), rollStandard(g, "low"), [crew(g, randomRace(g))]);
  },
  "q:loyalists:medbot": (g) => {
    // "a crewmember with 1 skill in shields, and high (3-6 fuel) fuel and scrap" (Rewards, "Fuel": T fuel & T scrap).
    const offer = scrapOnly(g, "high");
    offer.fuel = between(g, [3, 6]);
    result(g, tx("wiki.quests.you-drag-the-injured-and-dying"), offer, [crew(g, randomRace(g), "shields")]);
  },
  "q:loyalists:teleport": (g) => {
    const joined = crew(g, randomRace(g), "combat");
    result(g, tx("wiki.quests.your-quick-reactions-allow-you-to"), scrapOnly(g, "medium"), [joined, addQuest(g, "fed-base")]);
  },
  // {{Blue Option|Healing Burst}}. 1 missile. A crewmember with 1 skill in engines, medium scrap, and the Federation base.
  "q:loyalists:heal": (g) => {
    if (g.missiles < 1 || !g.player.weapons.some((w) => w.defId === "healburst")) return;
    g.missiles -= 1;
    const joined = crew(g, randomRace(g), "engines");
    result(g, tx("wiki.quests.you-launch-a-healing-bomb"), scrapOnly(g, "medium"), [
      tx("wiki.quests.missiles-1"),
      joined,
      addQuest(g, "fed-base"),
    ]);
  },
  // Improved Sensors, level 2: medium scrap with resources.
  "q:fed-base:scan-2": (g) => {
    if (sensors(g) < 2) return;
    result(g, tx("wiki.quests.your-advanced-sensors-pick-faint-signatures"), rollStandard(g, "medium"));
  },
  // Advanced Sensors, level 3: a weapon with medium scrap.
  "q:fed-base:scan-3": (g) => {
    if (sensors(g) < 3) return;
    result(g, tx("wiki.quests.your-sensors-pick-faint-signatures-of"), scrapOnly(g, "medium"), [grantRandomItem(g, "weapon")]);
  },
  // Long-Ranged Scanners: a weapon with medium scrap. The weapon is not named.
  "q:fed-base:scan-glass": (g) => {
    if (!g.augments.includes("glass")) return;
    result(g, tx("wiki.quests.your-sensors-pick-faint-signatures-of"), scrapOnly(g, "medium"), [grantRandomItem(g, "weapon")]);
  },
  "q:fed-base:assist": (g) => pageFight(g, tx("wiki.quests.the-automated-drone-turns-on-you"), "Auto-ship", "quest-fed-assist"),
  // The other non-AE arrival. Same sentence, a different contact.
  "q:fed-base:assist-repair": (g) => pageFight(g, tx("wiki.quests.the-automated-drone-turns-on-you"), "Auto-ship", "quest-fed-assist-repair"),
  // AE Auto-ship. "periodically" prints no seconds: aidPlayerAsb is the existing friendly battery.
  "q:fed-base:assist-asb": (g) => {
    pageFight(g, tx("wiki.quests.you-move-in-to-assist"), "Auto-ship", "quest-fed-assist-asb");
    aidPlayerAsb(g);
  },
  // AE Elite Rebel. {{SurrenderEscape(alt)|escapechance|REBEL_FEDERATION_PDS|dlcEventsOverwrite.xml|20|40-60|4-6}}
  // escapechance is an escape attempt only (no surrender). 20 is the percent; 40-60 is hull percent.
  // 4-6 is the template's actual-hull warning, not a timer, so the typical 15 seconds stays.
  // INFERRED: the threshold is uniform inside 40..60, the same reading as escape.ts.
  "q:fed-base:assist-wing": (g) => {
    pageFight(g, tx("wiki.quests.you-swoop-in-to-assist-taking"), "elite", "quest-fed-assist-wing", hullRun(20, 40 + rand(g) * 20, HULL_RUN_SECONDS));
    aidPlayerAsb(g);
  },
  // Non-AE contact fixed by the weapon arrival: a crewmember and a weapon with low scrap.
  "q:fed-assist:contact": (g) => {
    result(g, tx("wiki.quests.with-the-threat-gone-you-contact"), scrapOnly(g, "low"), [crew(g, randomRace(g)), grantRandomItem(g, "weapon")]);
  },
  // Non-AE contact fixed by the repair arrival: a crewmember, high scrap with resources, and 7 repairs.
  "q:fed-assist-repair:contact": (g) => {
    result(g, tx("wiki.quests.you-contact-the-station-once-the"), rollStandard(g, "high"), [crew(g, randomRace(g)), repair(g, 7)]);
  },
  // AE Auto-ship contact: a crewmember, high scrap with resources, and 7 repairs.
  "q:fed-assist-asb:contact": (g) => {
    result(g, tx("wiki.quests.you-contact-the-station-once-the"), rollStandard(g, "high"), [crew(g, randomRace(g)), repair(g, 7)]);
  },
  // AE Elite contact: a crewmember and no scrap. The footnote drops only the scrap.
  "q:fed-assist-wing:contact": (g) => {
    result(g, tx("wiki.quests.with-the-threat-gone-you-contact"), undefined, [crew(g, randomRace(g))]);
  },

  "q:thief:strip": (g) => {
    result(g, tx("wiki.quests.it-seems-almost-a-waste-for"), rollStandard(g, "high"));
  },
  "q:thief:teleport": (g) => thiefDyingCard(g, false),
  "q:thief:scan": (g) => thiefDyingCard(g, true),
  "q:thief:mercy": (g) => {
    result(g, tx("wiki.quests.thus-ends-the-life-of-the"), rollStandard(g, "high"));
  },
  "q:thief:listen": (g) => {
    result(g, tx("wiki.quests.in-his-dying-moments-he-gives"), rollStandard(g, "high"), [addQuest(g, "thief-stash")]);
  },
  "q:thief:save": (g) => {
    card(g, tx("wiki.quests.your-haste-has-paid-off-and"), [
      { id: "q:thief:accept", label: tx("wiki.quests.accept") },
    ]);
  },
  "q:thief:clone": (g) => {
    card(g, tx("wiki.quests.your-haste-has-paid-off-and-2"), [
      { id: "q:thief:accept", label: tx("wiki.quests.accept") },
    ]);
  },
  "q:thief:accept": (g) => {
    // "receive high scrap, Mantis Pheromones augmentation, Mantis crewmember named Kazaaak maxed in all skills, and a
    // quest marker". The Mantis Cruiser unlock is the grantUnlock line below.
    grantUnlock(g, "mantis-a"); // @agent:unlocks. "You unlock the Mantis Cruiser".
    let joined = tx("wiki.quests.there-is-no-room-aboard-for-2");
    if (joinCrew(g, tx("wiki.quests.mantis"), tx("wiki.quests.kazaaak"))) {
      const c = g.crew[g.crew.length - 1];
      const all: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];
      c.skills = Object.fromEntries(all.map((s) => [s, xpNeedFor(c, s) * 2]));
      joined = tx("wiki.quests.kazaaak-joins-your-crew");
    }
    result(g, tx("wiki.quests.kazaaakplethkilik-joins-your-crew-offers-the"), scrapOnly(g, "high"), [joined, grantAug(g, "pheromone"), addQuest(g, "thief-stash")]);
  },

  "q:slug-trap:engage": (g) => {
    // INFERRED: the page prints no escape for this pirate.
    pageFight(g, tx("wiki.quests.there-s-money-to-be-made"), tx("wiki.quests.pirate-ship"), "quest-slug-pirate-trap-engage", { ...NEVER_RUN });
  },
  "q:slug-trap:cache": (g) => {
    pageFight(g, tx("wiki.quests.when-he-sees-you-making-for"), tx("wiki.quests.pirate-ship"), "quest-slug-pirate-trap-cache", { ...NEVER_RUN });
  },

  // REBEL_ENGI_UNLOCK_2REAL / 2FAKE: "immediately starts to escape (40 seconds timer)".
  "q:engi-real:fight": (g) => {
    pageFight(g, tx("wiki.quests.as-soon-as-they-see-you"), tx("wiki.quests.rebel-ship"), "quest-engi-real", startRun(40));
  },
  "q:engi-fake:fight": (g) => {
    pageFight(g, tx("wiki.quests.as-soon-as-they-see-you-2"), tx("wiki.quests.rebel-ship"), "quest-engi-fake", startRun(40));
  },
  // Fake marker, after "Demand information": "Let them go." -> "The ship turns neutral." / "Ignore him and attack."
  "q:engi-fake:go": (g) => {
    closeFight(g);
    result(g, tx("wiki.quests.the-ship-turns-neutral-and-jumps"));
  },
  "q:engi-fake:attack": (g) => {
    const plan = g.enemySurrender;
    if (plan) plan.refused = true;
    g.event = null;
    g.phase = g.enemy ? "combat" : "map";
    g.paused = false;
    log(g, tx("wiki.quests.no-wait-you-cut-the-transmission"));
  },
  // MANTIS_ENGI_UNLOCK_3: "Fight the Mantis Ship controlled by Humans", {{SurrenderEscape(alt)|no|...}}.
  "q:engi-final:fight": (g) => {
    pageFight(g, tx("wiki.quests.the-mantis-escort-turns-to-meet"), tx("wiki.quests.mantis-ship"), "quest-engi-final", { ...NEVER_RUN });
    const hp = kinOf("plain").hp;
    for (const c of g.crew) {
      if (c.side !== "enemy") continue;
      c.kin = "plain";
      c.hp = hp;
      c.maxHp = hp;
    }
  },
  "q:engi-victory:ask": (g) => {
    card(g, tx("wiki.quests.likely-ploy-by-rebels-to-avoid"), [
      { id: "q:engi-victory:transmit", label: tx("wiki.quests.transmit-coordinates-of-federation-command") },
    ]);
  },
  "q:engi-victory:transmit": (g) => {
    // "You unlock the Stealth Cruiser; you receive Titanium System Casing augmentation, high scrap with resources and your
    // ship receives 20 repairs." The unlock is the grantUnlock line below.
    grantUnlock(g, "stealth-a"); // @agent:unlocks. "You unlock the Stealth Cruiser".
    result(g, tx("wiki.quests.satisfactory-delivery-of-tech-will-assist"), rollStandard(g, "high"), [grantAug(g, "casing"), repair(g, 20)]);
  },

  // "this ship is always a Slug Assault class" / the interceptor: "It is always a Slug Interceptor class" (enemy-gen classId).
  "q:slug-platform:charge": (g) => {
    pageFight(g, tx("wiki.quests.you-charge-the-assault-ship-guarding"), tx("wiki.quests.slug-assault"), "quest-slug-platform", { ...NEVER_RUN });
  },
  "q:slug-platform:tail": (g) => {
    const choices: Choice[] = [
      { id: "q:slug-platform:slow", label: tx("wiki.quests.fly-slowly-toward-their-last-known") },
      { id: "q:slug-platform:wait", label: tx("wiki.quests.wait-and-hope-the-escort-leaves") },
    ];
    // {{Blue Option|Slug Crew|...}}, {{Blue Option|Improved Sensors|...|level=2+}}.
    if (hasSlug(g)) choices.push({ id: "q:slug-platform:slug", label: tx("wiki.quests.have-your-crewmember-monitor-their-life") });
    if (sensors(g) >= 2) choices.push({ id: "q:slug-platform:sensors", label: tx("wiki.quests.try-to-maintain-a-lock-on") });
    card(g, tx("wiki.quests.you-slip-into-the-nebula-undetected"), choices);
  },
  "q:slug-platform:slow": (g) => {
    pageFight(g, tx("wiki.quests.you-are-advancing-slowly-when-suddenly"), tx("wiki.quests.slug-assault"), "quest-slug-platform", { ...NEVER_RUN });
  },
  "q:slug-platform:wait": (g) => {
    result(g, tx("wiki.quests.you-wait-for-a-time-before"));
  },
  "q:slug-platform:slug": (g) => {
    card(g, tx("wiki.quests.you-try-to-stay-just-far"), [
      { id: "q:slug-platform:interceptor", label: tx("wiki.quests.fight-the-interceptor") },
    ]);
  },
  "q:slug-platform:sensors": (g) => {
    card(g, tx("wiki.quests.you-overclock-your-sensors-trying-to"), [
      { id: "q:slug-platform:interceptor", label: tx("wiki.quests.fight-the-interceptor") },
    ]);
  },
  // "This ship starts to escape with 35 seconds countdown timer."
  "q:slug-platform:interceptor": (g) => {
    pageFight(g, tx("wiki.quests.the-interceptor-powers-up-its-ftl"), tx("wiki.quests.slug-interceptor"), "quest-slug-interceptor", startRun(35));
  },

  "q:store-rescue:engage": (g) => {
    pageFight(g, tx("wiki.quests.you-engage-the-rebel-scout"), tx("wiki.quests.rebel-ship"), "quest-store-rescue", { ...NEVER_RUN });
  },
  "q:store-rescue:avoid": (g) => {
    result(g, tx("wiki.quests.after-a-time-the-ship-powers"));
  },

  // Slug Home Nebula surrender, "Let them live." -> "We don't want the weapon, we want information." (the `extra` answer).
  "s:slug-home-nebula-surrender:info": (g) => {
    if (!g.enemy) return;
    // Score, k: "k = ships defeated by reducing hull or crew to zero. Defeating the flagship does NOT increase the count
    // (none of the 3 phases)." Letting them live and taking information does not reduce hull or crew to zero.
    closeFight(g);
    result(g, tx("wiki.quests.you-ask-where-they-were-delivering"), undefined, [addQuest(g, "slug-platform")]);
  },
};

const LANIUS_TRADER_TAKE = /^q:lanius-(?:trader|translator):take:(fuel|missiles|parts):(\d+):(\d+)$/;

/** The shown Lanius trader offer. The page prints those amounts before the choice, so this does not roll again. */
function payLaniusTrader(g: Game, id: string) {
  const m = LANIUS_TRADER_TAKE.exec(id);
  if (!m) return;
  const res = m[1] as "fuel" | "missiles" | "parts";
  const cost = Number(m[2]);
  const scrap = Number(m[3]);
  const have = res === "fuel" ? g.fuel : res === "missiles" ? g.missiles : g.player.parts;
  if (have < cost) return;
  if (res === "fuel") g.fuel -= cost;
  else if (res === "missiles") g.missiles -= cost;
  else g.player.parts -= cost;
  g.scrap += scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + scrap;
  log(g, tx("wiki.quests.after-the-exchange-is-complete-they"));
  log(g, tx("wiki.quests.scrap", { scrap: scrap }));
  const b = here(g);
  if (b) b.resolved = true;
  g.event = null;
  g.phase = "map";
  g.paused = false;
}

/** surrender.ts surrenderChoose calls this first. True when the id was a quest choice. */
export function questChoose(g: Game, id: string): boolean {
  if (id.startsWith("q:lanius-trader:take:") || id.startsWith("q:lanius-translator:take:")) {
    if (!LANIUS_TRADER_TAKE.test(id)) return false;
    if (questChoiceDisabled(g, id)) return true;
    payLaniusTrader(g, id);
    return true;
  }
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

/** sim.ts choiceDisabled: a price or a blue-option requirement the ship does not meet. */
export function questChoiceDisabled(g: Game, id: string): string | null {
  if (id === "c:engi-fleet-discussion:2" && !hasEngi(g)) return tx("wiki.quests.needs-an-engi-crewmember");
  // Lanius ship in rich debris field. Improved Piloting is level 2. Advanced Piloting is level 3.
  if (id === "c:lanius-ship-in-rich-debris-field:3" && (g.player.systems.pilot?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-piloting");
  if (id === "c:lanius-ship-in-rich-debris-field:4" && (g.player.systems.pilot?.level ?? 0) < 3) return tx("wiki.quests.needs-level-3-piloting");
  // Lanius ship salvager, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-ship-salvager:2" && !hasLanius(g)) return tx("wiki.quests.needs-a-lanius-crewmember");
  // Lanius trader, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-trader:4" && !hasLanius(g)) return tx("wiki.quests.needs-a-lanius-crewmember");
  // Space station under construction, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:space-station-under-construction:2" && !hasLanius(g)) return tx("wiki.quests.needs-a-lanius-crewmember");
  // Lanius lone ship, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-lone-ship:3" && !hasLanius(g)) return tx("wiki.quests.needs-a-lanius-crewmember");
  // Lanius powered-down ship. Advanced Piloting prints level=2+. A dead Lanius does not count.
  if (id === "q:lanius-dormant:plunder" && !hasLanius(g)) return tx("wiki.quests.needs-a-lanius-crewmember");
  if (id === "q:lanius-dormant:autopilot" && (g.player.systems.pilot?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-piloting");
  // Lanius trader with translator. Purchase the translator for 40 scrap.
  if (id === "q:lanius-translator:buy" && g.scrap < 40) return tx("wiki.quests.need-40-scrap");
  // Auto-ship near sensor station. Sensors level 3. A Crew Teleporter.
  if (id === "c:auto-ship-near-sensor-station:2" && sensors(g) < 3) return tx("wiki.quests.needs-level-3-sensors");
  if (id === "c:auto-ship-near-sensor-station:3" && !hasTeleporter(g)) return tx("wiki.quests.needs-a-teleporter");
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  if (id === "c:auto-ship-fight-in-plasma-storm:1") {
    const level = g.player.systems.engines?.level ?? 0;
    if (level < 3 || level > 5) return tx("wiki.quests.needs-engines-level-3-5");
  }
  if (id === "c:auto-ship-fight-in-plasma-storm:2" && (g.player.systems.engines?.level ?? 0) < 6) return tx("wiki.quests.needs-level-6-engines");
  if (id === "c:auto-ship-fight-in-plasma-storm:3" && (g.player.kits.veil?.level ?? 0) <= 0) return tx("wiki.quests.needs-cloaking");
  // Deactivated Auto-ship. Sensors level 3. The button stays visible.
  if (id === "c:deactivated-auto-ship:2" && sensors(g) < 3) return tx("wiki.quests.needs-level-3-sensors");
  // Rock ship in plasma storm. A dead Rock does not count. The button stays visible.
  if (id === "c:rock-ship-in-plasma-storm:2" && !hasRock(g)) return tx("wiki.quests.needs-a-rock-crewmember");
  // Slug drink. A dead Rock does not count. The button stays visible.
  if (id === "c:slug-drink:2" && !hasRock(g)) return tx("wiki.quests.needs-a-rock-crewmember");
  // Slug hacker (choice). {{Blue Option|Hacking System|Counter any hack attempt.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-choice:4" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  // Slug hacker (oxygen). {{Blue Option|Improved Oxygen|...|level=2+|shortreq=Oxygen}}.
  // INFERRED: the refusal line. The page names level 2+ and does not print this sentence.
  if (id === "c:slug-hacker-oxygen:1" && (g.player.systems.oxygen?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-oxygen");
  // Slug hacker (oxygen). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-oxygen:2" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  // Slug hacker (doors). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-doors:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  // Slug hacker (medical). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-medical:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  // Slug hacker (medical). {{Blue Option|Improved Medbay|Try to squeeze some extra power to the system.|level=2+|shortreq=Medbay}}.
  // INFERRED: the refusal line. The page names level 2+ and does not print this sentence.
  if (id === "c:slug-hacker-medical:2" && (g.player.systems.medbay?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-medbay");
  // Legendary thief KazaaakplethKilik. {{Blue Option|Mantis crewmember|Attempt to hail him.|shortreq=Mantis Crew}}.
  // INFERRED: the refusal line. A dead Mantis does not count. The page names the crew and does not print this sentence.
  if (id === "c:legendary-thief-kazaaakplethkilik:1" && !hasMantis(g)) return tx("wiki.quests.needs-a-mantis-crewmember");
  // Mantis ship with Rock body parts. {{Blue Option|Rock Crew|Put your Rock crewmember on the comm.}}.
  // INFERRED: the refusal line. A dead Rock does not count. The page names the crew and does not print this sentence.
  if (id === "c:mantis-ship-with-rock-body-parts:2" && !hasRock(g)) return tx("wiki.quests.needs-a-rock-crewmember");
  // Mantis ship with Rock body parts. {{Blue Option|Rock Ship|Ram the bastards.|shortreq=Rock Plating}}.
  // INFERRED: the refusal line. The page names Rock Plating and does not print this sentence.
  if (id === "c:mantis-ship-with-rock-body-parts:3" && !g.augments.includes("keel")) return tx("wiki.quests.needs-rock-plating");
  // Pirate engine hacker. {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:pirate-engine-hacker:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  // Escort civilians FTL haywire. Advanced FTL Navigation. The button stays visible.
  if (id === "c:escort-civilians-ftl-haywire:2" && !g.augments.includes("nav")) return tx("wiki.quests.needs-adv-ftl-navigation");
  // Zoltan security checkpoint. A dead Slug does not count. Mind Control is the installed system.
  if (id === "c:zoltan-security-checkpoint:2" && !hasSlug(g)) return tx("wiki.quests.needs-a-slug-crewmember");
  if (id === "c:zoltan-security-checkpoint:3" && (g.player.kits.leash?.level ?? 0) <= 0) return tx("wiki.quests.needs-mind-control");
  // Pirate ship attacking civilian distress. Improved Weapons is level 6+. The button stays visible.
  if (id === "c:pirate-ship-attacking-civilian-distress:2" && (g.player.systems.weapons?.level ?? 0) < 6) return tx("wiki.quests.needs-level-6-weapons");
  // Pirate smuggler. Improved Weapons is level 6+. The button stays visible.
  if (id === "c:pirate-smuggler:2" && (g.player.systems.weapons?.level ?? 0) < 6) return tx("wiki.quests.needs-level-6-weapons");
  // Rock atheists. Improved Sensors is level 2+. The button stays visible.
  if (id === "c:rock-atheists:2" && (g.player.systems.sensors?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-sensors");
  // Pirate ship selling drones. A dead Slug does not count. Hacking and Drone Control must already be installed.
  if (id === "q:pirate-drones:slug" && !hasSlug(g)) return tx("wiki.quests.needs-a-slug-crewmember");
  if (id === "q:pirate-drones:hack" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  if (id === "q:pirate-drones:upgrade" && (g.player.kits.swarm?.level ?? 0) <= 0) return tx("wiki.quests.needs-drone-control");
  // Rebel checkpoint. The bribe amount is the one shown on the button.
  const checkpoint = /^q:rebel-checkpoint:bribe:(\d+)$/.exec(id);
  if (checkpoint && g.scrap < Number(checkpoint[1])) return tx("wiki.quests.need-scrap", { v: checkpoint[1] });
  // Engi distress Rebel fight. 25 scrap, or 40 scrap plus 2 missiles and 2 fuel.
  if (id === "q:engi-distress:scrap" && g.scrap < 25) return tx("wiki.quests.need-25-scrap");
  if (id === "q:engi-distress:supplies" && g.scrap < 40) return tx("wiki.quests.need-40-scrap");
  if (id === "q:engi-distress:supplies" && g.missiles < 2) return tx("wiki.quests.need-2-missiles");
  if (id === "q:engi-distress:supplies" && g.fuel < 2) return tx("wiki.quests.need-2-fuel");
  // Rebel fight choice in nebula. Cloaking, and Engines level 4+ on the caught follow-up.
  if (id === "c:rebel-fight-choice-in-nebula:2" && (g.player.kits.veil?.level ?? 0) <= 0) return tx("wiki.quests.needs-cloaking");
  if (id === "q:rebel-nebula:engines" && (g.player.systems.engines?.level ?? 0) < 4) return tx("wiki.quests.needs-level-4-engines");
  // Mantis fight choice. Cloaking, any installed level.
  if (id === "c:mantis-fight-choice:2" && (g.player.kits.veil?.level ?? 0) <= 0) return tx("wiki.quests.needs-cloaking");
  // Auto-ship near storage station. Cloaking, any installed level.
  if (id === "c:auto-ship-near-storage-station:2" && (g.player.kits.veil?.level ?? 0) <= 0) return tx("wiki.quests.needs-cloaking");
  // Auto-ship near storage station in nebula. Improved Cloaking is level 2+. Hacking spends 1 drone part.
  if (id === "c:auto-ship-near-storage-station-in-nebula:2" && (g.player.kits.veil?.level ?? 0) <= 0) return tx("wiki.quests.needs-cloaking");
  if (id === "c:auto-ship-near-storage-station-in-nebula:3" && (g.player.kits.veil?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-cloaking");
  if (id === "c:auto-ship-near-storage-station-in-nebula:4" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  if (id === "c:auto-ship-near-storage-station-in-nebula:4" && g.player.parts < 1) return tx("wiki.quests.need-1-drone-part");
  if (id === "c:auto-ship-near-storage-station-in-nebula:5" && (g.player.kits.spike?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-hacking");
  if (id === "c:auto-ship-near-storage-station-in-nebula:5" && g.player.parts < 1) return tx("wiki.quests.need-1-drone-part");
  // Auto-ship near radar station. Combat Drone is one of the four named schematics. Hacking spends 1 drone part.
  if (id === "c:auto-ship-near-radar-station:2" && !hasRadarCombat(g)) return tx("wiki.quests.needs-a-combat-drone");
  if (id === "c:auto-ship-near-radar-station:2" && g.player.parts < 1) return tx("wiki.quests.need-1-drone-part");
  if (id === "q:auto-radar:drone" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.quests.needs-a-hacking-system");
  if (id === "q:auto-radar:drone" && g.player.parts < 1) return tx("wiki.quests.need-1-drone-part");
  const trader = LANIUS_TRADER_TAKE.exec(id);
  if (trader) {
    const res = trader[1];
    const cost = Number(trader[2]);
    const have = res === "fuel" ? g.fuel : res === "missiles" ? g.missiles : g.player.parts;
    if (have < cost) return tx("wiki.quests.need", { cost: cost, v: res === "parts" ? "drone parts" : res });
  }
  // The Black Raven, {{Blue Option|Slugman Crew}}. A dead Slug does not count.
  if (id === "s:the-black-raven:duel" && !hasSlug(g)) return tx("wiki.quests.needs-a-slug-crewmember");
  // Refueling platform garbled broadcast. Blast Doors, level 2+.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "s:garbled-dock:doors" && (g.player.systems.doors?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-door-system");
  // Improved Sensors, level 2. The scan stays on the abandoned card.
  // INFERRED: the refusal line. The page names level 2 and does not print this sentence.
  if (id === "s:garbled-dock:sensors2" && sensors(g) < 2) return tx("wiki.quests.needs-sensors-level-2");
  // Advanced Sensors, level 3.
  // INFERRED: the refusal line. The page names level 3 and does not print this sentence.
  if (id === "s:garbled-dock:sensors3" && sensors(g) < 3) return tx("wiki.quests.needs-sensors-level-3");
  // Refueling platform dock. Accept costs 5-10 scrap. Blast Doors are level 2+.
  // INFERRED: the refusal lines. The page prints the price and the system, not these sentences.
  if (id === "s:refuel-dock:accept" && g.scrap < 5) return tx("wiki.quests.need-5-scrap");
  // Zoltan retake the ship. The hire costs 40 scrap.
  // INFERRED: the refusal line. The page prints the price and does not print this sentence.
  if (id === "s:zoltan-raft:hire" && g.scrap < 40) return tx("wiki.quests.need-40-scrap");
  if (id === "s:refuel-dock:doors" && (g.player.systems.doors?.level ?? 0) < 2) return tx("wiki.quests.needs-level-2-door-system");
  if (id === "q:war-camp:missile" && g.missiles < 1) return tx("wiki.quests.need-1-missiles");
  if (id === "q:loyalists:heal" && g.missiles < 1) return tx("wiki.quests.need-1-missiles");
  if (id === "q:war-camp:firebomb" && g.missiles < 2) return tx("wiki.quests.need-2-missiles");
  if (id === "q:station:fuel4" && g.fuel < 4) return tx("wiki.quests.need-4-fuel");
  if (id === "q:station:fuel1" && g.fuel < 1) return tx("wiki.quests.need-1-fuel");
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
        ? tx("wiki.quests.great-take-this-bit-of-fuel", { line: line })
        : id === "c:mantis-war-camp:0"
          ? tx("wiki.quests.thank-you-if-you-can-just", { line: line })
          : id === "c:space-station-under-construction:0"
            ? tx("wiki.quests.great-thanks-for-your-help-i", { line: line })
            : id === "c:escort-civilians-ftl-haywire:0"
              ? tx("wiki.quests.take-this-bit-of-scrap-as", { line: line })
              : line;
    // A short card so the marker line is seen; "ack" goes back to the map (the beacon is already resolved).
    g.event = { title: here(g)?.name ?? "Event", body, choices: ACK };
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
export function std(destroyed: SurrenderTier, killed: SurrenderTier, textD: string, textK = textD, then?: Choice[]): Win {
  return (g, deadCrew) => result(g, deadCrew ? textK : textD, rollStandard(g, deadCrew ? killed : destroyed), [], then);
}

/** Rock and Slug standoff. "Your ship reactor is upgraded." No step is printed. INFERRED: one bar.
 * Template:Reactor power cost caps the reactor at 25. Past that the bar does not move.
 */
function eventReactor(g: Game): string {
  if (upgradeCost("reactor", g.player.reactor) == null) return "";
  g.player.reactor += 1;
  noteReactorEvent(g);
  return tx("wiki.quests.your-ship-reactor-is-upgraded");
}

function offerLines(g: Game, offer: SurrenderOffer): string[] {
  const paid = payOffer(g, offer, true);
  const got: string[] = [];
  if (offer.scrap) got.push(tx("wiki.quests.scrap", { scrap: offer.scrap }));
  if (offer.fuel) got.push(tx("wiki.quests.fuel", { fuel: offer.fuel }));
  if (offer.missiles) got.push(tx("wiki.quests.missiles", { missiles: offer.missiles }));
  if (offer.parts) got.push(tx("wiki.quests.drone-parts", { parts: offer.parts }));
  if (paid.weaponName) got.push(`${paid.weaponName}.`);
  got.push(...paid.extras);
  for (const line of got) log(g, line);
  return got;
}

/** The grateful Slug captain. Three results and no odds. INFERRED: equal. */
export function slugCaptainGrateful(g: Game, lead: string, extras: string[] = []) {
  const kind = weighted(g, [["free", 1], ["price", 1], ["thanks", 1]] as const);
  if (kind === "free") {
    const note = eventReactor(g);
    result(g, tx("wiki.quests.the-slug-captain-offers-a-free", { lead: lead }), undefined, [...extras, note].filter(Boolean));
    return;
  }
  if (kind === "price") {
    const n = between(g, [10, 15]);
    const tail = extras.length ? ` ${extras.join(" ")}` : "";
    card(g, tx("wiki.quests.the-slug-captain-thankful-for-your", { lead: lead, tail: tail }), [
      { id: `s:rock-slug:upgrade:${n}`, label: tx("wiki.quests.agree-to-the-price-scrap", { n: n }) },
      { id: "s:rock-slug:decline", label: tx("wiki.quests.decline-the-offer") },
    ]);
    return;
  }
  result(g, tx("wiki.quests.the-slugs-offer-their-thanks-for", { lead: lead }), undefined, [...extras, tx("wiki.quests.nothing-happens")]);
}

/** Transaction 10-15 subtract_scrap. The amount is the one shown on the choice. */
export function rockSlugPay(g: Game, kind: "debt" | "upgrade", n: number): boolean {
  if (!Number.isInteger(n) || n < 10 || n > 15 || g.scrap < n) return true;
  g.scrap -= n;
  log(g, tx("wiki.quests.scrap-3", { n: n }));
  if (kind === "debt") {
    slugCaptainGrateful(g, tx("wiki.quests.you-pay-off-the-debt-the"), [tx("wiki.quests.scrap-3", { n: n })]);
    return true;
  }
  const note = eventReactor(g);
  result(g, tx("wiki.quests.you-let-their-team-on-board"), undefined, [tx("wiki.quests.scrap-3", { n: n }), note].filter(Boolean));
  return true;
}

/** Lanius ship attacking civilian, and the distress page, print the same two endings. */
function laniusCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.no-more-life-signs-detected-on")
    : tx("wiki.quests.the-lanius-craft-breaks-apart-you");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [{ id: "q:lanius-civilian:contact", label: tx("wiki.quests.contact-the-civilian-ship") }]);
}

const SCOUT_INSPECT: Choice[] = [{ id: "q:lanius-scout:inspect", label: tx("wiki.quests.inspect-the-automated-ship") }];

/** Lanius ship absorbing automated scout. Destroyed pays medium standard. A crew kill pays high. Then inspect. */
function laniusScoutWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.no-more-life-signs-detected-on-2")
    : tx("wiki.quests.the-lanius-craft-breaks-apart-you-2");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], SCOUT_INSPECT);
}

const STORAGE_INVESTIGATE: Choice[] = [{ id: "q:auto-storage:investigate", label: tx("wiki.quests.investigate-the-station") }];

/** Auto-ship near storage station, and the nebula page. Destroyed pays medium scrap only. No crew-kill reward. */
function autoStorageWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(g, tx("wiki.quests.you-salvage-what-you-can-from-2"), scrapOnly(g, "medium"), [], STORAGE_INVESTIGATE);
}

function storageInvestigate(g: Game, text: string) {
  card(g, text, STORAGE_INVESTIGATE);
}

/** Auto-ship near radar station. Combat Drone Mark I and II, and Anti-Ship Beam Drone I and II. */
const RADAR_COMBAT = ["striker", "combat2", "beam", "beam2"];

function hasRadarCombat(g: Game): boolean {
  const kit = g.player.kits.swarm;
  return !!kit && kit.level > 0 && RADAR_COMBAT.includes(kit.target ?? "");
}

const RADAR_AFTER: Choice[] = [
  { id: "q:auto-radar:hack", label: tx("wiki.quests.attempt-to-manually-hack-into-the") },
  { id: "q:auto-radar:leave", label: tx("wiki.quests.don-t-risk-it-leave-the") },
  { id: "q:auto-radar:drone", label: tx("wiki.quests.use-a-drone-to-hack-into") },
];

/** Destroyed pays medium scrap only. The page prints no crew-kill reward. */
function autoRadarWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(g, tx("wiki.quests.you-salvage-what-you-can-and"), scrapOnly(g, "medium"), [], RADAR_AFTER);
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
    text = tx("wiki.quests.you-successfully-hack-into-their-system-2");
    extras.push(tx("wiki.quests.the-rebel-fleet-is-delayed-for"));
  } else if (kind === "map") {
    text = tx("wiki.quests.the-firewalls-prove-too-difficult-to");
  } else if (kind === "pursuit") {
    g.pursuitDouble = true;
    text = tx("wiki.quests.as-you-attempt-to-hack-in");
    extras.push(tx("wiki.quests.rebel-fleet-pursuit-is-doubled-for"));
  } else {
    text = tx("wiki.quests.you-are-unable-to-penetrate-the");
    extras.push(tx("wiki.quests.nothing-happens"));
  }
  result(g, lead ? `${lead} ${text}` : text, undefined, extras);
}

/** Pirate briber. Continue is not printed. INVENTED label. The five victim results have no odds. INFERRED: equal. */
const PIRATE_GONE: Choice[] = [{ id: "q:pirate-briber:gone", label: tx("wiki.quests.continue-3") }];

/** Destroyed pays a random scrap-only amount. INFERRED: low, medium, and high are equal.
 *  A crew kill pays medium standard. Then the victim. */
function pirateBriberWin(g: Game, deadCrew: boolean) {
  if (deadCrew) {
    result(g, tx("wiki.quests.the-pirates-are-all-dead-leaving"), rollStandard(g, "medium"), [], PIRATE_GONE);
    return;
  }
  result(g, tx("wiki.quests.the-pirate-explodes-leaving-behind-a"), scrapOnly(g, pick(g, ["low", "medium", "high"])), [], PIRATE_GONE);
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

type SmuggleRow = { text: string; pay: SmugglePay; item?: "weapon" | "drone" };

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
  [{ text: tx("wiki.quests.you-search-the-ship-and-discover"), pay: { k: "scrap", tier: "medium" }, item: "weapon" }, 1],
  [{ text: tx("wiki.quests.the-ship-was-transporting-weaponry-you"), pay: { k: "random" }, item: "weapon" }, 1],
  [{ text: tx("wiki.quests.searching-the-remains-you-find-that"), pay: { k: "scrap", tier: "medium" }, item: "drone" }, 1],
  [{ text: tx("wiki.quests.you-detect-faint-life-signatures-from"), pay: { k: "standard", tier: "low" } }, 1],
  [{ text: tx("wiki.quests.this-ship-s-cargo-was-not"), pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: tx("wiki.quests.the-ship-was-carrying-military-supplies"), pay: { k: "standard", tier: "high" } }, 1],
  [{ text: tx("wiki.quests.the-debris-implies-that-the-ship"), pay: { k: "parts" } }, 1],
  [{ text: tx("wiki.quests.the-ship-was-apparently-transporting-weaponry"), pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: tx("wiki.quests.from-the-bits-and-pieces-you"), pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: tx("wiki.quests.the-ship-appears-to-have-been"), pay: { k: "standard", tier: "low" } }, 1],
  [{ text: tx("wiki.quests.you-search-the-remains-of-the"), pay: { k: "standard", tier: "low" } }, 1],
];

const SMUGGLE_CREW: [SmuggleRow, number][] = [
  [{ text: tx("wiki.quests.with-the-crew-dead-you-search"), pay: { k: "scrap", tier: "medium" }, item: "weapon" }, 1],
  [{ text: tx("wiki.quests.searching-the-remains-you-find-that-2"), pay: { k: "scrap", tier: "medium" }, item: "drone" }, 1],
  [{ text: tx("wiki.quests.the-ship-refuses-to-fight-but"), pay: { k: "scrap", tier: "high" } }, 1],
  [{ text: tx("wiki.quests.this-ship-was-apparently-carrying-information"), pay: { k: "scrap", tier: "medium" } }, 1],
];

/** Pirate smuggler. Template:Pirate Smuggler / Rebel Transport, destroyed and a crew kill. */
function smuggleCargoWin(g: Game, deadCrew: boolean) {
  const row = weighted(g, deadCrew ? SMUGGLE_CREW : SMUGGLE_HULL);
  result(g, row.text, smugglePay(g, row.pay), row.item ? [grantRandomItem(g, row.item)] : []);
}

const CRYSTAL_CONTACT: Choice[] = [{ id: "q:crystal-pirate:contact", label: tx("wiki.quests.contact-the-crystal-ship") }];

/**
 * Template:Crystal Ship Saved. {{DuplicateEvent|2}} on the reward and on nothing. The printed OR is the two
 * sentences. INFERRED: each sentence is one copy. The Crystal weapon is not named, so none is granted.
 * A random amount of resources is rollStandard with no tier.
 */
const CRYSTAL_SAVED: [string, "stuff" | "nothing" | "weapon"][] = [
  [tx("wiki.quests.you-contact-the-other-ship-thank"), "stuff"],
  [tx("wiki.quests.the-crystalline-ship-hails-you-it"), "stuff"],
  [tx("wiki.quests.you-contact-the-crystalline-ship-to"), "nothing"],
  [tx("wiki.quests.the-crystalline-ship-messages-you-you"), "nothing"],
  [tx("wiki.quests.the-crystalline-ship-messages-you-thank"), "weapon"],
];

function crystalContact(g: Game) {
  const [text, kind] = pick(g, CRYSTAL_SAVED);
  if (kind === "stuff") {
    result(g, text, rollStandard(g));
    return;
  }
  if (kind === "weapon") {
    result(g, text, undefined, [tx("wiki.quests.you-receive-a-crystal-weapon")]);
    return;
  }
  result(g, text, undefined, [tx("wiki.quests.nothing-happens")]);
}

/**
 * Rock atheists. {{DuplicateEvent|2}} on the refusal. The Rockman joins once.
 * INFERRED: the refusal is twice as likely as the join.
 */
function rockAtheistPromise(g: Game) {
  const join = weighted(g, [[false, 2], [true, 1]] as [boolean, number][]);
  if (!join) {
    result(g, tx("wiki.quests.they-seem-tempted-by-your-offer"), undefined, [tx("wiki.quests.nothing-happens")]);
    return;
  }
  rockAtheistJoins(g, tx("wiki.quests.your-promises-gain-their-attention-and"));
}

/** The page names a Rockman and prints no skill. */
function rockAtheistJoins(g: Game, text: string) {
  const joined = joinCrew(g, tx("wiki.quests.rock"));
  result(g, text, undefined, [joined ? tx("wiki.quests.a-rockman-crewmember-joins-you") : tx("wiki.quests.there-is-no-room-aboard-for")]);
}

/** Pirate ship selling drones. The unnamed schematic is not offered. Five parts for 25 scrap stay on the static choice. */
function pirateDroneDock(g: Game) {
  card(g, tx("wiki.quests.a-human-in-an-exquisite-suit"), [
    { id: "c:pirate-ship-selling-drones:0", label: tx("wiki.quests.buy-some-drone-parts-25-scrap") },
    { id: "q:pirate-drones:nothing", label: tx("wiki.quests.buy-nothing") },
    { id: "q:pirate-drones:upgrade", label: tx("wiki.quests.buy-drone-control-system-upgrade") },
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
    return n === 1 ? tx("wiki.quests.1-fire-in", { title: room.title }) : tx("wiki.quests.2-fires-in", { title: room.title });
  }
  room.breach += 1;
  return tx("wiki.quests.a-breach-opens-in", { title: room.title });
}

/** 1 damage to that room's system when a bar is left, plus the tooltip's effect. */
function salesmanRoom(g: Game, room: { fire: number; breach: number; title: string; system?: string | null }): string {
  const bits: string[] = [];
  const id = room.system;
  const sys = id ? g.player.systems[id as "engines"] : undefined;
  if (id && sys && sys.level > 0 && sys.damage < sys.level) {
    hurtSystem(g.player, id as "engines", 1);
    bits.push(tx("wiki.quests.1-damage-to", { id: id }));
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
    tx("wiki.quests.ah-i-m-sorry-to-hear"),
    tx("wiki.quests.pirate-ship"),
    "pirate-ship-selling-drones",
  );
}

/**
 * Buy Drone Control system upgrade. Three results, no odds. INFERRED: equal.
 * The level is set to a whole number in the printed band. The scrap is a whole number in that result's band.
 */
function pirateDroneUpgrade(g: Game) {
  const kit = g.player.kits.swarm;
  if (!kit || kit.level <= 0) return;
  const band = pick(g, [
    { scrap: [15, 20] as [number, number], level: [2, 3] as [number, number] },
    { scrap: [25, 33] as [number, number], level: [4, 5] as [number, number] },
    { scrap: [50, 65] as [number, number], level: [6, 7] as [number, number] },
  ]);
  const cost = between(g, band.scrap);
  if (g.scrap < cost) return;
  const level = between(g, band.level);
  g.scrap -= cost;
  kit.level = level;
  if (kit.power > kit.level) kit.power = kit.level;
  log(g, tx("wiki.quests.scrap-4", { cost: cost }));
  result(g, tx("wiki.quests.drone-control-at-level", { level: level }), undefined, [tx("wiki.quests.scrap-4", { cost: cost })]);
}

const REBEL_CHECKPOINT_BRIBE = [
  tx("wiki.quests.these-rebels-are-easily-swayed-by"),
  tx("wiki.quests.like-most-rebels-these-are-just"),
  tx("wiki.quests.as-everyone-currently-awaiting-inspection-is"),
  tx("wiki.quests.they-eagerly-accept-your-bribe-obviously"),
];

/** Rebel checkpoint. Transaction 10-15. The four texts have no odds. INFERRED: equal. Then the civilians. */
function rebelCheckpointBribe(g: Game, n: number) {
  if (!Number.isInteger(n) || n < 10 || n > 15 || g.scrap < n) return;
  g.scrap -= n;
  log(g, tx("wiki.quests.scrap-3", { n: n }));
  const text = pick(g, REBEL_CHECKPOINT_BRIBE);
  card(g, tx("wiki.quests.scrap-5", { text: text, n: n }), [{ id: "q:rebel-checkpoint:contact", label: tx("wiki.quests.contact-the-civilian-ships") }]);
}

/** Contact the civilian ships. Four results and no odds. INFERRED: equal. */
function rebelCheckpointContact(g: Game) {
  const kind = pick(g, ["fight", "standard", "scrap", "nothing"] as const);
  if (kind === "fight") {
    pageFight(
      g,
      tx("wiki.quests.one-of-the-civilian-ships-contacts"),
      tx("wiki.quests.rebel-ship"),
      "rebel-checkpoint",
    );
    return;
  }
  if (kind === "standard") {
    result(g, tx("wiki.quests.one-of-the-civilian-ships-quietly"), rollStandard(g, "low"));
    return;
  }
  if (kind === "scrap") {
    result(g, tx("wiki.quests.some-of-the-civilians-pool-together"), scrapOnly(g, "low"));
    return;
  }
  result(g, tx("wiki.quests.the-civilians-are-grateful-however-none"), undefined, [tx("wiki.quests.nothing-happens")]);
}

/** Pirate ship attacking Crystal, and Mantis ship attacking Crystal.
 * Both print the same destroyed and crew-kill sentences, then Template:Crystal Ship Saved.
 * Destroyed pays medium standard. A crew kill pays high.
 */
function crystalPirateWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.with-the-crew-dead-you-take")
    : tx("wiki.quests.the-ship-explodes-and-you-scrap");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], CRYSTAL_CONTACT);
}

const MANTIS_SLUG_AFTER: Choice[] = [
  { id: "q:mantis-slug:leave", label: tx("wiki.quests.leave-them-be") },
  { id: "q:mantis-slug:finish", label: tx("wiki.quests.finish-them-off") },
];

/** Mantis ship attacking Slug ship. Both endings pay medium standard, then the Slug vessel. */
function mantisSlugSaved(g: Game) {
  result(
    g,
    tx("wiki.quests.the-mantis-defeated-you-contact-the"),
    rollStandard(g, "medium"),
    [],
    MANTIS_SLUG_AFTER,
  );
}

/** Finish them off. Two results, no odds. INFERRED: equal. The augmentation is not named: Rewards, "Augment": "A random
 *  augmentation & T scrap."
 *  The loot is a random standard reward. INFERRED: low, medium, and high are equal. */
function mantisSlugFinish(g: Game) {
  if (pick(g, ["augment", "loot"] as const) === "augment") {
    result(
      g,
      tx("wiki.quests.the-slug-captain-hails-you-a"),
      scrapOnly(g, "low"),
      [grantRandomItem(g, "augment")],
    );
    return;
  }
  result(
    g,
    tx("wiki.quests.it-doesn-t-look-like-they"),
    rollStandard(g, pick(g, ["low", "medium", "high"])),
  );
}

/** Zoltan security checkpoint. Medium fuel is 2-4. */
function zoltanCheckpointFuel(g: Game, text: string) {
  const n = between(g, [2, 4]);
  g.fuel += n;
  log(g, tx("wiki.quests.fuel-3", { n: n }));
  result(g, text, undefined, [tx("wiki.quests.fuel-3", { n: n })]);
}

/** The pirate is gone. Five results, no odds. INFERRED: equal. */
function pirateGone(g: Game) {
  const kind = pick(g, ["store", "repair", "rebel", "scrap", "nothing"] as const);
  if (kind === "store") {
    log(g, tx("wiki.quests.thank-you-for-the-aid-i"));
    openStoreHere(g);
    return;
  }
  if (kind === "repair") {
    result(g, tx("wiki.quests.thank-the-heavens-you-showed-up"), undefined, [repair(g, 15)]);
    return;
  }
  if (kind === "rebel") {
    card(g, tx("wiki.quests.upon-closer-inspection-you-realize-the"), [
      { id: "q:pirate-briber:salvage", label: tx("wiki.quests.destroy-the-ship-and-salvage-it") },
      { id: "q:pirate-briber:delay", label: tx("wiki.quests.use-the-leverage-you-gained-by") },
    ]);
    return;
  }
  if (kind === "scrap") {
    result(g, tx("wiki.quests.you-were-too-late-a-hull"), scrapOnly(g, "medium"));
    return;
  }
  result(g, tx("wiki.quests.the-pirate-s-victim-quickly-jumps"), undefined, [tx("wiki.quests.nothing-happens")]);
}

/** Refueling platform garbled broadcast. Both endings pay medium scrap with resources, then the station's fuel.
 *  The extra fuel is inclusive 3-5 on top of whatever rollStandard already paid. No Investigate button. */
function garbledBroadcastWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.there-are-no-more-life-signs")
    : tx("wiki.quests.the-ship-explodes-leaving-behind-a");
  const offer = rollStandard(g, "medium");
  const extra = between(g, [3, 5]);
  const line = tx("wiki.quests.fuel-6", { extra: extra });
  g.fuel += extra;
  result(g, tx("wiki.quests.it-looks-as-if-the-lanius", { text: text }), offer, [line]);
  log(g, line);
}

/** Refugee (Zoltan) and Refugee distress (Zoltan). Destroyed pays medium scrap with resources. A crew kill pays high. */
function refugeeZoltanWin(slug: string): Win {
  return (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.the-zoltan-ship-now-empty-of")
      : tx("wiki.quests.the-zoltan-ship-breaks-apart-and");
    result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [
      { id: `s:${slug}:contact`, label: tx("wiki.quests.contact-the-refugee-ship") },
    ]);
  };
}

/** Refugee (Pirate). Destroyed pays medium scrap with resources and the shared thanks.
 *  A crew kill pays high, and that contact says the pirates have been following them. */
function refugeePirateWin(slug: string): Win {
  return (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.the-pirate-ship-now-empty-of")
      : tx("wiki.quests.the-pirate-ship-breaks-apart-and");
    result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [
      { id: deadCrew ? `s:${slug}:contact-dead` : `s:${slug}:contact`, label: tx("wiki.quests.contact-the-refugee-ship") },
    ]);
  };
}

/** Pirate ship attacking civilian, and the Lanius variant. Destroyed is medium standard.
 *  A crew kill is high. Then Contact the civilian ship. */
function pirateCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? tx("wiki.quests.no-more-life-signs-detected-on-3")
    : tx("wiki.quests.the-pirate-ship-breaks-apart-you");
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [
    { id: "q:lanius-civilian:contact", label: tx("wiki.quests.contact-the-civilian-ship") },
  ]);
}

/**
 * Event pages that print their own {{Winning|destroyed=true}} / {{Winning|deadCrew=true}} reward, keyed by the slug
 * startCombat received. A page with "(default rewards)" is not listed; winCombat pays the default then.
 */
export const PAGE_WINS: Record<string, Win> = {
  // ---- Ship surrender Events pages (cited-events-surrender.ts) ----
  // Settlement mercenary work: "destroyed/deadCrew ... You receive low scrap with resources."
  "settlement-mercenary-work": std("low", "low", tx("wiki.quests.with-all-of-the-would-be")),
  // The Black Raven: destroyed -> medium, deadCrew -> high scrap with resources.
  "the-black-raven": std("medium", "high", tx("wiki.quests.the-black-raven-breaks-apart-and"), tx("wiki.quests.the-once-dreaded-pirate-nights-has")),
  // Zoltan ship asks to dock: destroyed -> low, deadCrew -> medium scrap with resources.
  "zoltan-ship-asks-to-dock": std("low", "medium", tx("wiki.quests.while-you-search-the-debris-you"), tx("wiki.quests.while-you-scrap-their-ship-you")),
  // ---- Other cited pages with a quest branch ----
  // Mantis ship-collectors: destroyed -> medium, deadCrew -> high scrap with resources.
  "mantis-ship-collectors": std("medium", "high", tx("wiki.quests.their-ship-breaks-apart-and-you"), tx("wiki.quests.with-no-more-crew-on-board")),
  // Rebel ship attacking Federation loyalists: "medium scrap with resources" -> "Contact the Federation ship".
  "rebel-ship-attacking-federation-loyalists": std("medium", "medium", tx("wiki.quests.with-the-ship-destroyed-you-quickly"), tx("wiki.quests.with-the-crew-of-the-rebel"), [
    { id: "q:loyalists:contact", label: tx("wiki.quests.contact-the-federation-ship") },
  ]),
  // Slug ship boarding Rock ship: both endings pay medium scrap, then the freighter.
  // The nothing result is printed twice. The two sentences are alternatives. INFERRED: equal.
  "slug-ship-boarding-rock-ship": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.with-the-slugs-no-longer-a")
      : tx("wiki.quests.with-the-slug-ship-destroyed-you");
    const extras: string[] = [];
    if (weighted(g, [["nothing", 2], ["abandoned", 1]] as const) === "abandoned") {
      const more = rollStandard(g, "medium");
      payOffer(g, more, true);
      extras.push(tx("wiki.quests.it-appears-the-rock-ship-was"));
      if (more.scrap) extras.push(tx("wiki.quests.scrap", { scrap: more.scrap }));
      if (more.fuel) extras.push(tx("wiki.quests.fuel", { fuel: more.fuel }));
      if (more.missiles) extras.push(tx("wiki.quests.missiles", { missiles: more.missiles }));
      if (more.parts) extras.push(tx("wiki.quests.drone-parts", { parts: more.parts }));
      for (const line of extras.slice(1)) log(g, line);
    } else {
      const line = weighted(g, [["left", 1], ["thanks", 1]] as const) === "left"
        ? tx("wiki.quests.it-appears-that-the-rock-ship")
        : tx("wiki.quests.after-the-battle-the-rock-ship");
      extras.push(line, tx("wiki.quests.nothing-happens"));
    }
    result(g, text, rollStandard(g, "medium"), extras);
  },
  // Mantis ships battle for Rock freighter. Both endings pay medium standard. Default salvage is not paid.
  "mantis-ships-battle-for-rock-freighter": (g) => {
    result(g, tx("wiki.quests.in-the-time-it-took-you"), rollStandard(g, "medium"));
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
    result(g, tx("wiki.quests.you-access-the-recent-scans-from"), scrapOnly(g, "low"));
  },
  // Auto-ship fight in nebula. The page prints medium scrap with resources on a destroyed ship and no crew-kill reward.
  "auto-ship-fight-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Auto-ship fight (Crystal) has no choice. Arrival calls this fight.
  // The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward.
  "auto-ship-fight-crystal": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Auto-ship fight near sun. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The red giant stays on the fight slug.
  "auto-ship-fight-near-sun": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Auto-ship fight in asteroid field. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The asteroid field stays on the fight.
  "auto-ship-fight-in-asteroid-field": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Auto-ship fight. The page prints the same destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward.
  "auto-ship-fight": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Crystal ship attacking Federation loyalists. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then "You contact the Federation ship." Default salvage is not paid.
  "crystal-ship-attacking-federation-loyalists": std(
    "medium",
    "high",
    tx("wiki.quests.the-crystalline-ship-shatters-and-you"),
    tx("wiki.quests.the-crew-of-the-enemy-ship"),
    [{ id: "q:crystal-loyalists:contact", label: tx("wiki.quests.you-contact-the-federation-ship") }],
  ),
  // Crystal fight with surrender offer (Human crew). Both endings pay medium scrap with resources.
  // The surrender human is a separate offer. This win does not grant a crewmember.
  "crystal-fight-with-surrender-offer-human-crew": std(
    "medium",
    "medium",
    tx("wiki.quests.the-crystalline-ship-shatters-and-you-2"),
    tx("wiki.quests.the-crew-of-the-enemy-ship-2"),
  ),
  // Crystal fight with surrender offer (hull repairs). Both endings pay medium scrap with resources.
  // The surrender's fuel and 8 repairs are a separate offer. This win does not repair the hull.
  "crystal-fight-with-surrender-offer-hull-repairs": std(
    "medium",
    "medium",
    tx("wiki.quests.the-crystalline-ship-shatters-and-you-3"),
    tx("wiki.quests.the-crew-of-the-enemy-ship-3"),
  ),
  // Rebel ship attacking civilians in Last Stand. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then contact the survivors.
  "rebel-ship-attacking-civilians-in-last-stand": std(
    "medium",
    "high",
    tx("wiki.quests.with-the-rebel-ship-destroyed-you-2"),
    tx("wiki.quests.with-the-rebel-ship-defeated-you"),
    [{ id: "q:last-stand-survivors:contact", label: tx("wiki.quests.contact-the-survivors") }],
  ),
  // Rebel ship attacking refueling outpost. Destroyed pays medium scrap with resources.
  // A crew kill pays high. Then contact the outpost.
  "rebel-ship-attacking-refueling-outpost": std(
    "medium",
    "high",
    tx("wiki.quests.the-ship-breaks-apart-and-you"),
    tx("wiki.quests.with-the-crew-dead-you-quickly"),
    [{ id: "q:refuel-outpost:contact", label: tx("wiki.quests.contact-the-outpost") }],
  ),
  // Rebel ship attacking Crystal ship. Attack the Rebel: both endings share the bones sentence.
  // Destroyed pays medium scrap with resources. A crew kill pays high. Then contact the Crystal ship.
  // Attack the Crystalline ship does not set the map, so winCombat pays the default salvage.
  "rebel-ship-attacking-crystal-ship": (g, deadCrew) => {
    if (rebelCrystalBones.get(g) !== true) return false;
    rebelCrystalBones.delete(g);
    result(
      g,
      tx("wiki.quests.the-rebels-destroyed-you-pick-the-2"),
      rollStandard(g, deadCrew ? "high" : "medium"),
      [],
      [{ id: "q:rebel-crystal:contact", label: tx("wiki.quests.you-contact-the-crystal-ship") }],
    );
  },
  // Zoltan wise man. After the fight, both endings contact him and then he implodes.
  // Destroyed pays low scrap with resources, then high. A crew kill pays medium, then high.
  // The page nests the two rewards and prints no choice, so both are paid on this card.
  "zoltan-wise-man": (g, deadCrew) => {
    const lead = deadCrew
      ? tx("wiki.quests.you-salvage-the-ship-and-contact")
      : tx("wiki.quests.you-salvage-the-remains-and-contact");
    const rage =
      tx("wiki.quests.when-he-sees-you-have-emerged");
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
          ? tx("wiki.quests.with-their-crew-dead-you-quickly")
          : tx("wiki.quests.the-slug-ship-breaks-apart-and"),
        rollStandard(g, deadCrew ? "high" : "medium"),
      );
      return;
    }
    if (path === "oxygen") {
      result(
        g,
        deadCrew
          ? tx("wiki.quests.with-their-crew-dead-you-quickly-2")
          : tx("wiki.quests.the-slug-ship-breaks-apart-and-2"),
        rollStandard(g, "medium"),
      );
      return;
    }
    if (path === "weapons") {
      result(
        g,
        deadCrew
          ? tx("wiki.quests.with-their-crew-dead-you-quickly-3")
          : tx("wiki.quests.the-slug-ship-breaks-apart-and-3"),
        rollStandard(g, "high"),
      );
      return;
    }
    if (path === "hack") {
      result(
        g,
        deadCrew
          ? tx("wiki.quests.with-their-crew-dead-you-quickly-3")
          : tx("wiki.quests.the-slug-ship-breaks-apart-and-4"),
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
          ? tx("wiki.quests.with-their-crew-dead-you-quickly-3")
          : tx("wiki.quests.the-slug-ship-breaks-apart-and-4"),
        rollStandard(g, "high"),
      );
      return;
    }
    result(
      g,
      deadCrew
        ? tx("wiki.quests.with-their-crew-dead-their-hacking")
        : tx("wiki.quests.the-slug-ship-breaks-apart-and-2"),
      rollStandard(g, deadCrew ? "high" : "medium"),
    );
  },
  // Slug hacker (oxygen). Both endings pay medium scrap with resources.
  // The oxygen shutdown, the halved oxygen, and the hacking shutdown already end with the fight.
  "slug-hacker-oxygen": std(
    "medium",
    "medium",
    tx("wiki.quests.the-slug-ship-breaks-apart-and-2"),
    tx("wiki.quests.with-their-crew-dead-their-hacking"),
  ),
  // Slug hacker (medical). Fight a Slug ship: both endings pay high scrap with resources.
  // The medbay shutdown, the halved medbay, and the hacking shutdown already end with the fight.
  "slug-hacker-medical": std(
    "high",
    "high",
    tx("wiki.quests.the-slug-ship-breaks-apart-and-2"),
    tx("wiki.quests.with-their-crew-dead-you-quickly-2"),
  ),
  // Lanius fight with friendly ASB support. Destroyed pays medium scrap with resources.
  // A crew kill pays high. After the fight, two results and no odds. INFERRED: equal.
  // The battery shot itself stays on the fight. Default salvage is not paid.
  "lanius-fight-with-friendly-asb-support": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.no-more-life-signs-detected-on-4")
      : tx("wiki.quests.the-ship-breaks-apart-you-decide");
    const tier = deadCrew ? "high" : "medium";
    if (weighted(g, [["repair", 1], ["leave", 1]] as const) === "repair") {
      result(
        g,
        tx("wiki.quests.after-your-skirmish-the-fighting-dies", { text: text }),
        rollStandard(g, tier),
        [repair(g, 8)],
      );
      return;
    }
    result(
      g,
      tx("wiki.quests.you-finish-off-your-assailant-with", { text: text }),
      rollStandard(g, tier),
      [tx("wiki.quests.nothing-happens")],
    );
  },
  // Auto-ship fight in plasma storm. Both fight paths print that destroyed line and medium scrap with resources.
  // The page prints no crew-kill reward. The engines and cloaking escapes stay as they are.
  "auto-ship-fight-in-plasma-storm": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a-2"), rollStandard(g, "medium"));
  },
  // Rebel ship warning. Both endings pay medium scrap with resources.
  // The 40 second run and doubled pursuit stay in wiki/escape.ts.
  "rebel-ship-warning": std(
    "medium",
    "medium",
    tx("wiki.quests.their-ship-breaks-apart-and-you-2"),
    tx("wiki.quests.their-ship-goes-silent-and-you"),
  ),
  // Auto-ship warning. {{Winning|destroyed=true}}: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit stay in wiki/escape.ts.
  "auto-ship-warning": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-breaks-apart-and-you-2"), rollStandard(g, "low"));
  },
  // Auto-ship warning in nebula. Same destroyed line: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit stay in wiki/escape.ts.
  "auto-ship-warning-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-breaks-apart-and-you-2"), rollStandard(g, "low"));
  },
  // Auto-ship attacking civilian. Destroyed pays low standard, then Contact the civilian ship.
  // Template:Save the Civilian Ship is the same card as the Lanius civilian contact.
  // The page prints no crew-kill reward. Stay out of it is the nothing choice.
  "auto-ship-attacking-civilian": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-breaks-apart-you-hasten"), rollStandard(g, "low"), [], [
      { id: "q:lanius-civilian:contact", label: tx("wiki.quests.contact-the-civilian-ship") },
    ]);
  },
  // Mantis ship attacking civilian. Destroyed and a crew kill both pay medium standard,
  // then Attempt to contact the civilian ship. Template:Save the Civilian Ship is the
  // same card as the Lanius civilian contact. Stay out of it is three sentences in CHOICES.
  "mantis-ship-attacking-civilian": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.no-more-life-signs-detected-on-3")
      : tx("wiki.quests.the-mantis-ship-breaks-apart");
    result(g, text, rollStandard(g, "medium"), [], [
      { id: "q:lanius-civilian:contact", label: tx("wiki.quests.attempt-to-contact-the-civilian-ship") },
    ]);
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
      result(
        g,
        tx("wiki.quests.there-isn-t-time-to-salvage"),
        rollStandard(g, "medium"),
      );
      return;
    }
    result(g, tx("wiki.quests.there-s-no-time-to-salvage"), scrapOnly(g, "low"));
  },
  // Rebel fight among Federation and Rebel fleets. This page prints low scrap only on a hull kill and medium scrap with resources on a crew kill.
  // The two endings are separate printed results. Default salvage is not paid.
  "rebel-fight-among-federation-and-rebel-fleets": (g, deadCrew) => {
    if (deadCrew) {
      result(
        g,
        tx("wiki.quests.there-isn-t-time-to-salvage"),
        rollStandard(g, "medium"),
      );
      return;
    }
    result(g, tx("wiki.quests.there-s-no-time-to-salvage"), scrapOnly(g, "low"));
  },
  // Pirate ships in plasma storm. Destroyed: low fuel (1-3) and low scrap. Crew kill: high fuel (3-6) and high scrap.
  // Rewards, "Fuel": T fuel and T scrap. The ion-storm sentence is the page's text. No storm duration is printed.
  "pirate-ships-in-plasma-storm": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.with-the-ship-in-one-piece")
      : tx("wiki.quests.the-ship-obliterated-only-scant-fuel");
    result(g, text, cargoAndScrap(g, deadCrew ? "high" : "low", "fuel"));
  },
  // Destroyed: low missiles (1-2) and low scrap. Crew kill: high missiles (4-8) and high scrap.
  "pirate-ships-in-plasma-storm-ammo": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.with-the-ship-in-one-piece-2")
      : tx("wiki.quests.the-ship-obliterated-only-scant-ammunition");
    result(g, text, cargoAndScrap(g, deadCrew ? "high" : "low", "missiles"));
  },
  // Mantis ship attacking Slug ship. Saving the Slugs pays medium either way. Killing them pays high either way.
  "mantis-ship-attacking-slug-ship": (g) => {
    mantisSlugSaved(g);
  },
  "mantis-ship-attacking-slug-ship-slug": (g) => {
    result(g, tx("wiki.quests.at-last-the-slugs-prized-possessions"), rollStandard(g, "high"));
  },
  // Zoltan security checkpoint, the scan fight. Destroyed pays low standard. A crew kill pays medium. The attack stays default.
  "zoltan-security-checkpoint-scan": (g, deadCrew) => {
    result(g, tx("wiki.quests.you-scrap-what-you-can-and"), rollStandard(g, deadCrew ? "medium" : "low"));
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
    const extras = [
      tx("wiki.quests.the-outpost-hails-you-after-the"),
    ];
    if (more.scrap) extras.push(tx("wiki.quests.scrap", { scrap: more.scrap }));
    if (more.fuel) extras.push(tx("wiki.quests.fuel", { fuel: more.fuel }));
    if (more.missiles) extras.push(tx("wiki.quests.missiles", { missiles: more.missiles }));
    if (more.parts) extras.push(tx("wiki.quests.drone-parts", { parts: more.parts }));
    result(g, tx("wiki.quests.the-ship-breaks-apart-and-you"), rollStandard(g, "low"), extras);
  },
  // Auto-ship carrying shield virus. Both fights (Continue and the hacking counter) use this slug.
  // Destroyed pays medium scrap with resources. The page prints no crew-kill reward.
  "auto-ship-carrying-shield-virus": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, tx("wiki.quests.the-ship-explodes-leaving-behind-a"), rollStandard(g, "medium"));
  },
  // Lanius ship attacking civilian. Destroyed pays medium standard. A crew kill pays high. Then the civilians.
  // Lanius ship attacking civilian distress prints the same two endings and the same contact.
  "lanius-ship-attacking-civilian": laniusCivilianWin,
  "lanius-ship-attacking-civilian-distress": laniusCivilianWin,
  // Lanius ship attacking Rock. Both endings pay medium standard, then "Contact the Rockmen."
  "lanius-ship-attacking-rock": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.there-are-no-more-life-signs")
      : tx("wiki.quests.the-ship-explodes-leaving-behind-a");
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-rock:contact", label: tx("wiki.quests.contact-the-rockmen") }]);
  },
  // Lanius ship attacking Mantis. Both endings pay medium standard, then "Contact the Mantis."
  "lanius-ship-attacking-mantis": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.there-are-no-more-life-signs")
      : tx("wiki.quests.the-ship-explodes-leaving-behind-a");
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-mantis:contact", label: tx("wiki.quests.contact-the-mantis") }]);
  },
  // Lanius ship attacking Slug. Both endings pay medium standard, then "Contact the Slugs."
  "lanius-ship-attacking-slug": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.there-are-no-more-life-signs")
      : tx("wiki.quests.the-ship-explodes-leaving-behind-a");
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-slug:contact", label: tx("wiki.quests.contact-the-slugs") }]);
  },
  // Lanius ship in rich debris field. Both fights pay medium standard, then "Investigate the debris."
  "lanius-ship-in-rich-debris-field": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.there-are-no-more-life-signs")
      : tx("wiki.quests.the-ship-explodes-leaving-behind-a");
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-debris:investigate", label: tx("wiki.quests.investigate-the-debris") }]);
  },
  // Refueling platform garbled broadcast. Every Lanius fight on the page, including the hail.
  // Both endings pay medium scrap with resources, then 3-5 fuel from the station. Not default salvage.
  "refueling-platform-garbled-broadcast": garbledBroadcastWin,
  // Engi smashed ships. Both endings explain the consolidation, then nothing. Default salvage is not paid.
  "engi-smashed-ships": (g, deadCrew) => {
    const hail = deadCrew
      ? tx("wiki.quests.with-the-ship-disabled-the-remaining")
      : tx("wiki.quests.with-the-ship-destroyed-the-remaining");
    result(g, tx("wiki.quests.apparently-you-interrupted-the-equivalent-of", { hail: hail }), undefined, [tx("wiki.quests.nothing-happens")]);
  },
  // Rock and Slug standoff. Destroyed pays low standard. A crew kill pays medium. Then the Slug captain.
  "rock-and-slug-standoff": (g, deadCrew) => {
    const text = deadCrew
      ? tx("wiki.quests.with-the-rock-crew-dead-you")
      : tx("wiki.quests.with-the-rock-ship-destroyed-you");
    slugCaptainGrateful(g, text, offerLines(g, rollStandard(g, deadCrew ? "medium" : "low")));
  },
  // Legendary thief KazaaakplethKilik: destroyed -> medium; deadCrew opens the strip / survivors card.
  "legendary-thief-kazaaakplethkilik": (g, deadCrew) => {
    if (!deadCrew) {
      result(g, tx("wiki.quests.kazaaakplethkilik-fights-to-the-last-and"), rollStandard(g, "medium"));
      return;
    }
    const choices: Choice[] = [{ id: "q:thief:strip", label: tx("wiki.quests.move-in-to-strip-their-ship") }];
    // {{Blue Option|Teleporter|...}}, {{Blue Option|Sensors|...|level=3}}.
    if (hasTeleporter(g)) choices.push({ id: "q:thief:teleport", label: tx("wiki.quests.quickly-teleport-additional-crew-and-check") });
    if (sensors(g) >= 3) choices.push({ id: "q:thief:scan", label: tx("wiki.quests.quickly-scan-their-ship-for-survivors") });
    card(g, tx("wiki.quests.no-more-life-signs-are-detected"), choices);
  },
  // ---- Quest-marker fights ----
  "quest-mantis-war-camp": std("medium", "high", tx("wiki.quests.with-the-patrol-ship-destroyed-you"), tx("wiki.quests.with-the-patrol-ship-taken-care")),
  // Space station under construction: destroyed -> medium, deadCrew -> high; then "Contact the cargo ship." -> medium scrap.
  "quest-space-station-rebel": std("medium", "high", tx("wiki.quests.you-quickly-salvage-what-you-can"), tx("wiki.quests.you-quickly-salvage-what-you-can"), [
    { id: "q:station:contact", label: tx("wiki.quests.contact-the-cargo-ship") },
  ]),
  // Mantis ship-collectors marker: "a weapon and medium" / "a weapon and high scrap with resources". The weapon is not
  // named: Rewards, "Weapon": "A random weapon & T scrap."
  "quest-mantis-chase": (g, deadCrew) => {
    const text = deadCrew ? tx("wiki.quests.you-find-an-intact-weapon-on") : tx("wiki.quests.their-ship-breaks-apart-and-you-3");
    result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [grantRandomItem(g, "weapon")]);
  },
  // Slug comm tapping marker: Engage -> medium / high; Head for the cache -> low / medium (scrap with resources).
  "quest-slug-pirate-trap-engage": std("medium", "high", tx("wiki.quests.with-the-pirate-defeated-you-scan")),
  "quest-slug-pirate-trap-cache": std("low", "medium", tx("wiki.quests.with-the-pirate-taken-care-of"), tx("wiki.quests.with-the-pirate-defeated-you-search")),
  // Engi fleet discussion, real marker: deadCrew -> "high scrap with resources and a final quest marker". The page prints
  // no destroyed result. INFERRED: a destroyed ship pays the default reward and the trail is lost.
  "quest-engi-real": (g, deadCrew) => {
    if (!deadCrew) return false;
    result(g, tx("wiki.quests.once-their-crew-is-dead-you"), rollStandard(g, "high"), [addQuest(g, "engi-final")]);
  },
  // Fake marker: destroyed / deadCrew -> medium scrap with resources.
  "quest-engi-fake": std("medium", "medium", tx("wiki.quests.you-take-what-you-can-from"), tx("wiki.quests.a-quick-search-of-their-communication")),
  // Final marker: destroyed -> Victory; deadCrew -> medium scrap with resources, then Victory.
  "quest-engi-final": (g, deadCrew) => {
    if (deadCrew) engiVictory(g, tx("wiki.quests.you-strip-what-you-can-and"), rollStandard(g, "medium"));
    else engiVictory(g);
  },
  // Slug Home Nebula marker: the platform guard -> high scrap with resources.
  "quest-slug-platform": std("high", "high", tx("wiki.quests.with-the-assault-ship-taken-care")),
  // The interceptor: "receive high scrap with resources and Slug Repair Gel augmentation". The Slug Cruiser unlock is the grantUnlock line.
  "quest-slug-interceptor": (g) => {
    grantUnlock(g, "slug-a"); // @agent:unlocks. Slug Home Nebula surrender: "You unlock the Slug Cruiser".
    result(g, tx("wiki.quests.with-the-escort-destroyed-you-take"), rollStandard(g, "high"), [grantAug(g, "gel")]);
  },
  // Settlement mercenary work marker: "medium scrap, your ship receives 5 repairs and a store opens."
  "quest-store-rescue": (g) => {
    result(g, tx("wiki.quests.the-outpost-hails-you-thank-you"), scrapOnly(g, "medium"), [repair(g, 5)], STORE_CHOICES);
  },
  // Federation Base Assist (Auto-ship, weapon contact): "low scrap with resources", then that contact.
  "quest-fed-assist": std("low", "low", tx("wiki.quests.you-scrap-the-wreckage"), tx("wiki.quests.you-scrap-the-wreckage"), [{ id: "q:fed-assist:contact", label: tx("wiki.quests.contact-the-federation-outpost") }]),
  // The other non-AE Auto-ship. Same salvage, then the repair contact.
  "quest-fed-assist-repair": std("low", "low", tx("wiki.quests.you-scrap-the-wreckage"), tx("wiki.quests.you-scrap-the-wreckage"), [{ id: "q:fed-assist-repair:contact", label: tx("wiki.quests.contact-the-federation-outpost") }]),
  // AE Auto-ship. Destroyed, and INFERRED a crew-kill the template does not list, both use this sentence and low scrap.
  "quest-fed-assist-asb": std("low", "low", tx("wiki.quests.you-scrap-the-wreckage"), tx("wiki.quests.you-scrap-the-wreckage"), [{ id: "q:fed-assist-asb:contact", label: tx("wiki.quests.contact-the-federation-outpost") }]),
  // AE Elite Rebel. Destroyed is low scrap with resources; a crew kill is medium. Then the outpost contact.
  "quest-fed-assist-wing": std("low", "medium", tx("wiki.quests.you-scrap-the-wreckage"), tx("wiki.quests.with-the-crew-dead-you-scrap"), [{ id: "q:fed-assist-wing:contact", label: tx("wiki.quests.contact-the-federation-outpost") }]),
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
    card(g, tx("wiki.quests.the-pirate-has-abandoned-pursuit-of"), PIRATE_GONE);
  },
  // Lanius ship absorbing automated scout. Escape pays no fight scrap. Then inspect.
  "lanius-ship-absorbing-automated-scout": (g) => {
    card(g, tx("wiki.quests.the-lanius-ship-has-escaped-you"), SCOUT_INSPECT);
  },
  // Mantis ship-collectors: "After them!" -> quest marker / "Forget it." -> nothing.
  "mantis-ship-collectors": (g) => {
    card(g, tx("wiki.quests.the-ship-made-an-emergency-ftl"), [
      { id: "q:mantis-collectors:follow", label: tx("wiki.quests.after-them") },
      { id: "q:mantis-collectors:forget", label: tx("wiki.quests.forget-it") },
    ]);
  },
  "quest-mantis-chase": (g) => result(g, tx("wiki.quests.looks-like-they-got-away-at"), rollStandard(g, "high")),
  // "Nothing happens. [unlock quest is failed]"
  "quest-engi-real": (g) => result(g, tx("wiki.quests.with-the-ship-gone-you-search")),
  "quest-engi-fake": (g) => result(g, tx("wiki.quests.with-the-ship-gone-you-search-2")),
  "quest-slug-interceptor": (g) => result(g, tx("wiki.quests.the-interceptor-jumps-away-with-the")),
  // The mid-run sentence "After watching their squadron get destroyed, it looks like their leader is prepared to turn tail and run." has no separate card hook.
  "quest-fed-assist-wing": (g) => {
    card(g, tx("wiki.quests.the-rebel-ship-jumped-away"), [{ id: "q:fed-assist-wing:contact", label: tx("wiki.quests.contact-the-federation-outpost") }]);
  },
  // Rebel ship warning. The escape already doubles pursuit (sim.ts). This card prints the page's sentence.
  "rebel-ship-warning": (g) => {
    card(
      g,
      tx("wiki.quests.the-scout-jumps-away-they-are"),
      [{ id: "ack", label: tx("wiki.quests.continue") }],
    );
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
