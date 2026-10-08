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
 * INFERRED: "a couple jumps" / "don't have many jumps left" is read as: the marker goes on a beacon at least two columns to
 * the right of the ship; with no such beacon it goes to the next sector. A beacon the ship already visited, one the fleet
 * has taken, and a ship-unlocking event page are not overwritten.
 * INFERRED everywhere below: a page that lists N results without odds rolls them with equal odds ({{DuplicateEvent|N}}
 * counts N times). Unnamed weapons, drone schematics and augments are not granted (as in surrender.ts); named ones are.
 * INVENTED: quest beacon names, and the one-word labels of "Fight ..." / "Continue" buttons where a page prints none.
 * Ship unlocks (Stealth, Mantis, Slug Cruisers) are not wired: hulls.ts says "unlock is a label, not a gate".
 */
import { upgradeCost, WEAPONS } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { kinOf } from "../extras/kin.ts";
import { xpNeedFor } from "../extras/lineage.ts";
import { beginBoarding, halvePlayerSystems, hurtSystem, log, openStoreHere, rand, shutPlayerHacking } from "../sim.ts";
import type { AugmentId, Beacon, Game, GameEvent, SkillName } from "../types.ts";
import { grantUnlock } from "../unlocks.ts"; // @agent:unlocks
import { noteReactorEvent } from "./achievement-track.ts";
// @agent:quests-a. Quest-opener modules register a QuestPart; PARTS is read at call time (the modules import this one).
import { laniusTraderOfferText, laniusTraderTakeId, rollLaniusTrader } from "./cited-events.ts";
import { RUWEN_ENTRY } from "./ruwen-entry.ts";
import { PART_A } from "./quests-a.ts";
import { PART_B } from "./quests-b.ts"; // @agent:quests-b. Quest-opening events, part B.
import type { EscapePlan } from "./escape.ts";
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
  escort: { page: "Escort civilians", title: "Escort destination" },
  "mantis-war-camp": { page: "Mantis war camp", title: "Mantis encampment" },
  "space-station": { page: "Space station under construction", title: "Missing cargo ship" },
  "defector-cache": { page: "Rebel defector", title: "Defector's cache" },
  "mantis-chase": { page: "Mantis ship-collectors", title: "Mantis trail" },
  "fed-base": { page: "Rebel ship attacking Federation loyalists", title: "Hidden Federation Base" },
  "thief-stash": { page: "Legendary thief KazaaakplethKilik", title: "Thief's cache" },
  "slug-pirate-trap": { page: "Slug comm tapping", title: "Slug raid" },
  "engi-real": { page: "Engi fleet discussion", title: "Rebel base" },
  "engi-fake": { page: "Engi fleet discussion", title: "Rebel base" },
  "engi-final": { page: "Engi fleet discussion", title: "Mantis convoy" },
  "slug-platform": { page: "Slug Home Nebula surrender", title: "Construction platform" },
  "store-rescue": { page: "Settlement mercenary work", title: "Space dock" },
};

export const QUEST_ADDED = "Added a quest marker to your map!";
export const QUEST_NEXT = "Added a quest marker to the next sector!";
export const QUEST_CANCELLED =
  "Upon examining your map, you realize you just won't have time and need to get to the Federation base! You leave the quest for another day.";

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

function canHold(g: Game, b: Beacon, from: Beacon | undefined): boolean {
  if (b.kind === "start" || b.kind === "exit" || b.kind === "boss" || b.kind === "store") return false;
  // "A quest marker cannot appear in nebula area".
  if (b.kind === "nebula") return false;
  if (b.quest || b.visited || b.id === g.here || KEEP_FLAGS.has(b.flag)) return false;
  // Rebel Fleet: a beacon the column has taken is not a quest destination. INFERRED.
  if (b.col < g.fleet) return false;
  // "usually a couple jumps from your current position": two columns or more to the right. INFERRED.
  return b.col >= (from?.col ?? 0) + 2;
}

/**
 * A beacon for a new marker, or undefined. Beacon-mix (wiki/beacon-mix.ts) leaves the Sectors page's "N quests" lines as
 * unflagged `event` beacons; those are taken first, then any other beacon a marker may overwrite.
 */
export function questSpot(g: Game): Beacon | undefined {
  const from = here(g);
  const ok = g.beacons.filter((b) => canHold(g, b, from));
  const slots = ok.filter((b) => b.kind === "event" && !b.flag);
  const pool = slots.length ? slots : ok;
  if (!pool.length) return undefined;
  return pool[Math.min(pool.length - 1, Math.floor(rand(g) * pool.length))];
}

function mark(b: Beacon, id: string) {
  b.quest = id;
  b.kind = "event";
  b.flag = `quest:${id}`;
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
    const spot = questSpot(g);
    if (spot) mark(spot, id);
    // INFERRED: a sector with no room (all nebula, say) loses the marker. The page does not cover this case.
    else log(g, "No room on this map for the quest marker.");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Cards and payouts
// ---------------------------------------------------------------------------------------------------------------

export type Choice = { id: string; label: string };
const ACK: Choice[] = [{ id: "ack", label: "Continue" }];

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
  { id: "q:engi-distress:scrap", label: "Give them 25 scrap." },
  { id: "q:engi-distress:supplies", label: "Give them 40 scrap, 2 missiles and 2 fuel." },
  { id: "q:engi-distress:nothing", label: "Give them nothing." },
];

/** Engi distress Rebel fight, destroyed low standard or a crew kill medium, then the Engi ask for help. */
function engiDistressWin(g: Game, deadCrew: boolean) {
  result(
    g,
    "The rebels destroyed, you pick the bones of their ship and wait for the small Engi ship to catch up. The Engi vessel turns out to be very poorly equipped - barely a runabout, really. They're trying to outrun the rebels, and need all the help they can get.",
    rollStandard(g, deadCrew ? "medium" : "low"),
    [],
    ENGI_DISTRESS_AFTER,
  );
}

/** Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is unnamed and not granted. */
function engiDistressGift(g: Game) {
  if (g.scrap < 25) return;
  g.scrap -= 25;
  log(g, "Scrap: -25.");
  const r = pick(g, ["nothing", "heal", "schematic"] as const);
  if (r === "heal") {
    result(
      g,
      "The Engies are grateful. They don't have any supplies or weapons to spare, but they do send over a self-teleporting med-bot disperser they hope they won't need.",
      { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, weapon: "healburst" },
      ["Scrap: -25."],
    );
    return;
  }
  if (r === "schematic") {
    result(
      g,
      "The Engies are grateful. They don't have much by way of supplies but they do offer a drone schematic for your use.",
      undefined,
      ["Scrap: -25."],
    );
    return;
  }
  result(
    g,
    "The words they use are \"Need = fulfilled\", but you take it for gratitude. They take the next jump in their long journey home.",
    undefined,
    ["Nothing else happens.", "Scrap: -25."],
  );
}

/** The result card: page text, what was paid, extras, and the next choices ("ack" by default). */
export function result(g: Game, text: string, offer?: SurrenderOffer, extras: string[] = [], choices: Choice[] = ACK) {
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
  return `Hull repairs: ${n}.`;
}

const AUG_NAMES: Partial<Record<AugmentId, string>> = {
  casing: "Titanium System Casing",
  gel: "Slug Repair Gel",
  pheromone: "Mantis Pheromones",
  // Engi distress Rebel fight prints this name for the med-bot augment.
  medbot: "Engi Med-bot Dispersal",
  // @agent:quests-a.
  keel: "Rock Plating",
  vengeance: "Crystal Vengeance",
};

/** A named augmentation. Three is the cap (augments.ts installAugment); a full rack loses it. INFERRED. */
export function grantAug(g: Game, id: AugmentId): string {
  const name = AUG_NAMES[id] ?? id;
  if (g.augments.includes(id)) return `${name} is already fitted.`;
  if (g.augments.length >= 3) return `No free augmentation slot for ${name}.`;
  g.augments.push(id);
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
        ? "Even if there was something malicious in the drink, you doubt it would affect the Rock digestive system. The Slug casually celebrates your newfound trust by repairing part of your ship and offering to sell you his wares."
        : "You take a cautious gulp. It's foul, but doesn't do any lasting damage. It's a thousand to one chance, but this Slug actually seems to be trustworthy. He casually celebrates your newfound trust by repairing part of your ship and offering to sell you his wares.",
    );
    log(g, note);
    openStoreHere(g);
    return;
  }
  if (rock) {
    pageFight(
      g,
      "Your crewmember is able to identify a heavy anaesthetic contained in the flask when he feels slightly drowsy (the Rock digestion system is very robust). His ruse discovered, the Slug immediately returns to his ship and opens fire.",
      "Slug ship",
      "slug-drink",
    );
    return;
  }
  // INFERRED: scrap does not go below zero.
  const n = between(g, [25, 35]);
  const lost = Math.min(g.scrap, n);
  g.scrap -= lost;
  log(g, `Scrap: -${lost}.`);
  result(
    g,
    "You take one gulp and wake up with the rest of the crew in the cargo hold... which contains noticeably less scrap than before.",
    undefined,
    [`Scrap: -${lost}.`],
  );
}

/** Lanius powered-down ship, "Investigate the vessel." Blue options stay visible when the ship cannot use them. */
function investigateDormant(g: Game) {
  card(g, "The vessel appears to be dormant. It is likely there are Lanius on board, but they may be in hibernation until the ship comes within range of new materials.", [
    { id: "q:lanius-dormant:ignore", label: "Ignore the vessel." },
    { id: "q:lanius-dormant:navigate", label: "Navigate carefully around the ship and strip what materials from the hull you can." },
    { id: "q:lanius-dormant:plunder", label: "Send over a Lanius crewmember to plunder the ship of resources." },
    { id: "q:lanius-dormant:autopilot", label: "Engage the autopilot to strip the ship safely." },
  ]);
}
export function sensors(g: Game): number {
  return g.player.systems.sensors?.level ?? 0;
}
export function hasTeleporter(g: Game): boolean {
  return (g.player.kits.sling?.level ?? 0) > 0;
}
function hasMissileWeapon(g: Game): boolean {
  return g.player.weapons.some((w) => WEAPONS[w.defId]?.kind === "missile");
}

function damageHull(g: Game, n: number): boolean {
  g.player.hull = Math.max(0, g.player.hull - n);
  log(g, `Hull damage: ${n}.`);
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
    card(g, "You escort the ship to the requested beacon. Much to your dismay you are ambushed by a Rebel ship. You walked right into their trap!", [
      { id: "q:escort:fight", label: "Fight the Rebel ship." },
    ]);
  } else if (r === "reward") {
    result(g, "Shortly after you arrive, the ship you were escorting jumps nearby. They thank you for your help and offer you a reward.", rollStandard(g, "high"));
  } else if (r === "store") {
    // "Your ship receives 5 repairs and a store opens."
    result(g, "The ship you were escorting thanks you, \"I don't think we could have made it without your help. Let my friends patch up some of your hull and show you their wares.\"", undefined, [repair(g, 5)], STORE_CHOICES);
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
    result(g, "You arrive and the ship you were escorting jumps in behind you. \"Thanks for the help. We work at a nearby fusion power plant, we could try to improve your reactor's output as a form of compensation.\"", undefined, [note]);
  }
}

export const STORE_CHOICES: Choice[] = [
  { id: "q:open-store", label: "See their wares." },
  { id: "ack", label: "Leave." },
];

/** Space station under construction, "Quest Marker": "One of the following subevents occurs". */
function arriveStation(g: Game) {
  const r = pick(g, ["rebel", "empty", "floating"] as const);
  if (r === "rebel") {
    card(g, "You find the missing cargo ship docked to a Rebel station. You send a short-band message to them and discover they are being held against their will and forced to 'donate to their supplies for the war effort.'", [
      { id: "q:station:attack", label: "Attack the Rebels to help them escape." },
      { id: "q:station:leave", label: "Leave." },
    ]);
  } else if (r === "empty") {
    // {{:Abandoned station}}.
    card(g, "You find the missing cargo ship docked to an empty space station. However their hold appears to be empty and there are no obvious signs that anyone is inside the ship or station. Everything looks abandoned.", [
      { id: "q:station:examine", label: "Move in to examine the station." },
      { id: "q:station:stay", label: "Stay near the Beacon." },
    ]);
  } else {
    card(g, "You find the missing cargo ship floating near the beacon. \"Thank heavens! We've been drifting here after using the last of our fuel to escape a pirate raid.\"", [
      { id: "q:station:fuel4", label: "Give them the requested 4 fuel." },
      { id: "q:station:fuel1", label: "Give them 1 fuel." },
      { id: "q:station:none", label: "Do not give them any." },
    ]);
  }
}

/** Template:Hidden federation base. Five results; the fifth is "Federation Base Assist". */
function arriveFedBase(g: Game) {
  const r = pick(g, ["schematic", "crew", "dock", "empty", "assist"] as const);
  if (r === "schematic") {
    // "You receive a drone schematic with high scrap." The schematic is not named: only the high scrap.
    result(g, "You find the planet at the indicated coordinates. Your initial scans show the planet to be barren and devoid of life, but you get a prompt reply when you broadcast on Federation frequencies. \"Hello! So nice to see friends. We'll bring you up some supplies.\"", scrapOnly(g, "high"));
  } else if (r === "crew") {
    // "You receive a crewmember and low scrap with resources." Race not named: INFERRED random.
    const joined = crew(g, randomRace(g));
    result(g, "By following the directions given to you, you find a well-disguised outpost. You are welcomed by a friendly face who offers to assist you in your quest by joining your crew.", rollStandard(g, "low"), [joined]);
  } else if (r === "dock") {
    result(g, "After a quick search you discover the hidden Federation space-dock. They offer you some supplies in addition to fully repairing your ship.", rollStandard(g, "medium"), [repair(g, 35)]);
  } else if (r === "empty") {
    const choices: Choice[] = [{ id: "ack", label: "Leave." }];
    // {{Blue Option|Improved Sensors|...|level=2}} / {{Blue Option|Advanced Sensors|...|level=3}} / Long-Ranged Scanners.
    if (sensors(g) >= 2 || g.augments.includes("glass")) choices.push({ id: "q:fed-base:scan", label: "Run a second scan pass." });
    card(g, "You search near the coordinates given to you, but your search yields no results. Perhaps they were mistaken.", choices);
  } else {
    // Federation Base Assist: two Auto-ship variants are wired. Not wired: the AE variants with a friendly Anti-Ship
    // Battery (this game's battery only fires on the player), including the Elite Rebel one.
    card(g, "You arrive in the sector to see a small outpost being bombarded by an automated drone. This must be the Federation base you were told about!", [
      { id: "q:fed-base:assist", label: "Fight the Auto-ship." },
    ]);
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
      const choices: Choice[] = [{ id: "q:war-camp:leave", label: "Leave before they notice you." }];
      // {{Blue Option|Missile Weapon|Bombard their key structures.}} [1 missile]
      if (hasMissileWeapon(g)) choices.push({ id: "q:war-camp:missile", label: "Bombard their key structures." });
      // {{Blue Option|Fire Bomb|Teleport fire bombs into key structures.}} [2 missiles]. Fire Bomb is fitted as "cask".
      if (g.player.weapons.some((w) => w.defId === "cask")) choices.push({ id: "q:war-camp:firebomb", label: "Teleport fire bombs into key structures." });
      card(g, "You find the Mantis encampment but there are far too many of them to count accurately. You send a long range message back to the settlement with your findings but unfortunately there's not much you can do. It would be suicide to attack directly.", choices);
      break;
    }
    case "space-station":
      arriveStation(g);
      break;
    case "defector-cache":
      // Rebel defector, "Quest Marker": two results.
      if (rand(g) < 0.5) {
        result(g, "Arriving at the specified coordinates, you find a sizable stash of useful materials.", rollSurrenderOffer(g, "high", true));
      } else {
        result(g, "You arrive at location of the hoard, but discover that it was not quite as large as advertised.", scrapOnly(g, "low"));
      }
      break;
    case "mantis-chase":
      card(g, "You catch up with the Mantis ship that escaped before, only to see them transferring their crew into an even bigger ship!\n\n\"Not YOU again! Do you know how much these repairs are going to cost me? Time to take out the big guns.\"", [
        { id: "q:mantis-chase:fight", label: "Fight the Mantis Bomber." },
      ]);
      break;
    case "fed-base":
      arriveFedBase(g);
      break;
    case "thief-stash":
      // "You receive a weapon with high scrap." The weapon is not named: only the high scrap.
      result(g, "You arrive at small asteroid field and discover the hidden cache among the debris. You input the codes given to you by KazaaakplethKilik and find a weapon inside.", scrapOnly(g, "high"));
      break;
    case "slug-pirate-trap":
      // Not wired: "when you arrive there will be a nebula environment" (no per-fight nebula environment here).
      card(g, "You catch up with the two Slug ships and they're already carrying out their raid! One is in close combat with the pirate, the other seems to be heading for a small space cache the pirate was protecting.\n\nSuddenly the first ship bursts into flames, and an urgent call arrives from the remaining Slugs. \"We sssugest you distract the pirate vesssel while we retrieve the valuables. Fifty fifty sssplit.\"", [
        { id: "q:slug-trap:engage", label: "Engage the pirate." },
        { id: "q:slug-trap:cache", label: "Head for the cache." },
      ]);
      break;
    case "engi-real":
    case "engi-fake":
      card(g, "You arrive at one of the Rebel bases that the Engi told you about. It appears abandoned except for one scout ship. Perhaps you could extract information from them.", [
        { id: `q:${b.quest}:fight`, label: "Fight the Rebel ship." },
      ]);
      break;
    case "engi-final":
      card(g, "You have finally caught up with the ships you've been hunting. A hangar-sized cargo ship is being escorted by a number of Mantis ships. As you reconsider the assault, a squadron of Engi ships with pirate emblems jump in and assist you. You prepare to fight the Mantis but scans indicate they are manned by Rebels!", [
        { id: "q:engi-final:fight", label: "Fight the Mantis ship." },
      ]);
      break;
    case "slug-platform":
      card(g, "You arrive to discover an impressive cruiser being worked on by a few smaller ships and guarded by an assault ship. The mobile construction platform is slowly slipping into the clouds. You have not yet been noticed.", [
        { id: "q:slug-platform:charge", label: "Charge them before they escape." },
        { id: "q:slug-platform:tail", label: "Try to tail them without being noticed." },
      ]);
      break;
    case "store-rescue":
      card(g, "Once you arrive at the beacon you detect a Rebel scout assaulting a compound on a nearby desolate moon.", [
        { id: "q:store-rescue:engage", label: "Engage the Rebel and rescue the space dock." },
        { id: "q:store-rescue:avoid", label: "Avoid a fight." },
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
  const choices: Choice[] = [{ id: "q:loyalists:rescue", label: "Quickly try to rescue the crew." }];
  // {{Blue Option|Nano Med-bot Dispersal|...}} ("medbot"), {{Blue Option|Teleporter|...}}. Healing Burst is not wired.
  if (g.augments.includes("medbot")) choices.push({ id: "q:loyalists:medbot", label: "Pump their ship with Nano Med-bots to aid in the rescue." });
  if (hasTeleporter(g)) choices.push({ id: "q:loyalists:teleport", label: "Lock on to all remaining life signatures and beam them onto your ship." });
  card(g, "Their ship looks to be on the verge of destruction and life signs are fading quickly.", choices);
}

function thiefDyingCard(g: Game, scan: boolean) {
  const choices: Choice[] = [
    { id: "q:thief:mercy", label: scan ? "Let him die." : "Put him out of his misery." },
    { id: "q:thief:listen", label: scan ? "Dock and try to speak with him." : "Listen to what he has to say." },
  ];
  // {{Blue Option|Adv. Medbay|...|level=2+}}, {{Blue Option|Adv. Clonebay|...|level=2+}}.
  if ((g.player.systems.medbay?.level ?? 0) >= 2) {
    choices.push({ id: "q:thief:save", label: scan ? "Dock and quickly take him back to the medbay." : "Quickly teleport him back to the medbay." });
  }
  if ((g.player.kits.cradle?.level ?? 0) >= 2) choices.push({ id: "q:thief:clone", label: "Quickly configure the Clonebay to save him." });
  card(g, scan ? "You detect KazaaakplethKilik slumped in a corner dying." : "You find KazaaakplethKilik slumped in a corner dying.", choices);
}

function engiVictory(g: Game, text = "", offer?: SurrenderOffer) {
  const body = "The Engi emerge victorious from their battles with only minor losses. They message you, \"Project X-ME56 commissioned by Federation military research division. Advanced stealth cruiser. Project finished during rebellion. Unable to reconnect with Federation military command.\"";
  const choices = [{ id: "q:engi-victory:ask", label: "Ask about the Mantis ships." }];
  if (offer) result(g, `${text}\n\n${body}`, offer, [], choices);
  else card(g, text ? `${text}\n\n${body}` : body, choices);
}

/** Deactivated Auto-ship, "Attempt to download the ship's data stores." Two results, no odds.
 *  INFERRED: equal. The sector map reveal is not wired. */
function deactivatedDownload(g: Game) {
  if (pick(g, ["data", "fight"] as const) === "fight") {
    pageFight(
      g,
      "You accidentally reactivate the ships AI. Its weapons and shields immediately go online; prepare for a fight!",
      "Auto-ship",
      "deactivated-auto-ship",
    );
    return;
  }
  result(g, "You are able to pull all of the ship's data about this sector. Your map has been updated.", rollStandard(g, "low"));
}

const CHOICES: Record<string, (g: Game) => void> = {
  // ---- Cited cards that open a quest branch ----
  // Slug comm tapping, "Tap their comm frequency." -> "A quest marker is added to your map."
  "c:slug-comm-tapping:0": (g) => {
    const line = addQuest(g, "slug-pirate-trap");
    result(g, "You overhear their conversation and learn they're planning to raid an infamous and likely wealthy pirate ship in the area. The pair jump off and you note down their target co-ordinates.", undefined, [line]);
  },
  // Slug comm tapping. "Ignore them." One printed result.
  "c:slug-comm-tapping:1": (g) => {
    result(g, "You have no interest in anything the Slugs could make business out of. Time to move on.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian, "Contact the civilian ship." Template:Save the Civilian Ship.
  // Six results, no odds. The unnamed crewmember is not offered. INFERRED: the other five are equal.
  // The weapon is unnamed and not granted; only the low scrap is paid.
  "q:lanius-civilian:contact": (g) => {
    const kind = weighted(g, [["weapon", 1], ["repair", 1], ["medium", 1], ["low", 1], ["nothing", 1]] as const);
    if (kind === "weapon") {
      result(g, "They respond, \"It's a good thing you came when you did; we'd be dead now otherwise. I'm a shipwright and I'd like to help you like you helped me.\" The captain offers to install a piece of equipment on your ship.", scrapOnly(g, "low"));
      return;
    }
    if (kind === "repair") {
      result(g, "\"This sector has become increasingly dangerous for friends of the Federation. I think my crew can patch up some of your hull damage as thanks.\"", undefined, [repair(g, 5)]);
      return;
    }
    if (kind === "medium") {
      result(g, "Apparently the ship that was being assaulted was a science vessel. They thank you for saving them and offer a small reward.", rollStandard(g, "medium"));
      return;
    }
    if (kind === "low") {
      result(g, "It seems the crew did not survive the assault. You take what you can from the remains of the ship.", rollStandard(g, "low"));
      return;
    }
    result(g, "The civilian ship wisely made a fast retreat while you distracted the hostile ship.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Rock, "Contact the Rockmen." Two results, no odds. INFERRED: equal.
  "q:lanius-rock:contact": (g) => {
    if (weighted(g, [["scrap", 1], ["nothing", 1]] as const) === "scrap") {
      result(g, "The Rockman ship jumped away during the battle, but it left much of its hull and spare parts floating behind - you salvage what you can, and prepare to jump.", rollStandard(g, "medium"));
      return;
    }
    result(g, "The Rockmen give an awkwardly-translated message that seems to indicate something about gratitude. They then jump away without another word.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Mantis, "Contact the Mantis." Two results, no odds. INFERRED: equal.
  // Rewards, Missiles: "T missiles & T scrap." The page tooltip prints medium as 2-4 missiles.
  "q:lanius-mantis:contact": (g) => {
    if (weighted(g, [["missiles", 1], ["wreck", 1]] as const) === "missiles") {
      const offer = scrapOnly(g, "medium");
      offer.missiles = between(g, [2, 4]);
      result(g, "The Mantis hiss and click, angry at being saved, and angry at themselves for needing to be saved. They part ways with some scrap metal that is no longer attached to their hull and a few missiles they can no longer use.", offer);
      return;
    }
    result(g, "The Mantis ship sustained too much damage - there are no survivors. You gather what resources you can from the wreckage.", rollStandard(g, "medium"));
  },
  // Lanius ship attacking Slug, "Contact the Slugs." Two results, no odds. INFERRED: equal.
  "q:lanius-slug:contact": (g) => {
    if (weighted(g, [["supplies", 1], ["nothing", 1]] as const) === "supplies") {
      result(g, "The Slugs reluctantly thank you for your help, protest they had the whole situation under control, attempt to make you pay for them helping you, and an hour later, finally relent and give you some supplies.", rollStandard(g, "medium"));
      return;
    }
    result(g, "The Slugs, taking advantage of the firefight, have fled the system. So much for gratitude.", undefined, ["Nothing happens."]);
  },
  // Lanius ship in rich debris field. Improved Piloting level 2 and Advanced Piloting level 3.
  "c:lanius-ship-in-rich-debris-field:3": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, "With help from the computer, you are able to keep a comfortable distance between you and the Lanius ship, and you are able to gather resources from the debris field without conflict.", rollStandard(g, "medium"));
  },
  "c:lanius-ship-in-rich-debris-field:4": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 3) return;
    result(g, "With help from the computer, you are able to keep a comfortable distance between you and the Lanius ship, and you gather a considerable amount of resources from the debris field without conflict.", rollStandard(g, "high"));
  },
  // Investigate the debris. Three results, no odds. INFERRED: equal.
  "q:lanius-debris:investigate": (g) => {
    const kind = weighted(g, [["high", 1], ["medium", 1], ["low", 1]] as const);
    if (kind === "high") {
      result(g, "It looks like you interrupted the Lanius before they had a chance to scavenge much from the debris, and you make off with a good haul.", rollStandard(g, "high"));
      return;
    }
    if (kind === "medium") {
      result(g, "The competitor gone, you proceed to investigate the field and scavenge what you can.", rollStandard(g, "medium"));
      return;
    }
    result(g, "The competitor gone, you investigate the debris, but it looks as if the Lanius harvested much of it before you arrived.", rollStandard(g, "low"));
  },
  // Lanius ship salvager. "Attack the ship." One printed lead-in, then a Lanius ship fight.
  // The nested scoff attack prints "were doing". This choice prints "are doing".
  "c:lanius-ship-salvager:0": (g) => {
    pageFight(g, "You move in and power up your weapons. Detecting the threat, they stop what they are doing and prepare for a fight.", "Lanius ship", "lanius-ship-salvager");
  },
  // Lanius ship salvager. "Leave them alone." One printed result.
  "c:lanius-ship-salvager:1": (g) => {
    result(g, "You ignore the ship and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Lanius ship salvager, {{Blue Option|Lanius Crew|Request some scrap.}}
  // Three results, no odds. INFERRED: equal. Medium scrap is scrap only, not scrap with resources.
  // The nested fight is default Lanius rewards: no PAGE_WINS row, so winCombat pays the default salvage.
  "c:lanius-ship-salvager:2": (g) => {
    if (!hasLanius(g)) return;
    const kind = weighted(g, [["share", 1], ["scoff", 1], ["low", 1]] as const);
    if (kind === "share") {
      result(g, "Your crew hails their ship, wondering if they have any extra salvage. Their crew seems happy to share.", scrapOnly(g, "medium"));
      return;
    }
    if (kind === "scoff") {
      card(g, "They scoff at your crewmember's request and utter something that was translated as, \"Get your own, lazy solder.\"", [
        { id: "q:lanius-salvager:attack", label: "Attack the ship." },
        { id: "q:lanius-salvager:leave", label: "Leave." },
      ]);
      return;
    }
    result(g, "Your crewmember hails them, asking if they have any extra scrap. They state that they are extremely low and cannot spare any.", undefined, ["Nothing happens."]);
  },
  "q:lanius-salvager:attack": (g) => {
    pageFight(g, "You move in and power up your weapons. Detecting the threat, they stop what they were doing and prepare for a fight.", "Lanius ship", "lanius-ship-salvager");
  },
  "q:lanius-salvager:leave": (g) => {
    result(g, "You ignore their derisive tone and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Lanius trader, {{Blue Option|Lanius Crew|Ask for an alternative trade.}}
  // A new roll of resource, cost, and scrap. INFERRED: the three better bands are equal.
  // The named Translator is the other page, not this one.
  "c:lanius-trader:4": (g) => {
    if (!hasLanius(g)) return;
    const offer = rollLaniusTrader(g, true);
    card(g, `After a short discussion you do not understand, the trader comes back with a second proposal.\n\n${laniusTraderOfferText(offer)}`, [
      { id: laniusTraderTakeId(offer), label: "Agree to the exchange." },
      { id: "c:lanius-trader:3", label: "Decline" },
    ]);
  },
  // Lanius trader with translator. "Decline but ask about their translation device."
  "c:lanius-trader-with-translator:4": (g) => {
    card(g, "\"Yes. It is quality. Our ship contains excess. Care to purchase?\"", [
      { id: "q:lanius-translator:buy", label: "Purchase the translator for 40 scrap." },
      { id: "q:lanius-translator:decline", label: "Decline again." },
    ]);
  },
  // 40 scrap for a Lanius named Translator. The page prints no skill.
  // INFERRED: a full crew of 8 does not pay the 40, because the crewmember does not come aboard.
  "q:lanius-translator:buy": (g) => {
    if (g.scrap < 40) return;
    if (!joinCrew(g, "Lanius", "Translator")) {
      result(g, "There is no room aboard for the new crewmember.");
      return;
    }
    g.scrap -= 40;
    result(g, "Your ships dock and you are more than a little surprised when the Lanius you spoke with boards your ship. It appears the 'device' you purchased was one of the beings that learned your language.", undefined, ["A Lanius crewmember named Translator joins you."]);
  },
  "q:lanius-translator:decline": (g) => {
    result(g, "\"No matter. This one does not mind this ship.\" They pull away and you are left to wonder what it meant by that. Perhaps the translation device has not yet been perfected?", undefined, ["Nothing happens."]);
  },
  // Lanius ship absorbing automated scout. Two inspect results, no odds. INFERRED: equal.
  // "a random amount of scrap". The page notes lowercase "low" is treated as RANDOM.
  // INFERRED: low, medium, and high scrap only are equal. The map reveal is not wired.
  // Auto-ship near sensor station. Sensors level 3. Two results, no odds. INFERRED: equal.
  // The map reveal is not wired. The fight uses the same destroyed reward.
  "c:auto-ship-near-sensor-station:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["fight", "map"] as const) === "fight") {
      pageFight(g, "The automated ship must be remotely connected to the station; as soon as you attempt to log on, the ship activates and charges you.", "Auto-ship", "auto-ship-near-sensor-station");
      return;
    }
    result(g, "Your improved sensors are able to remotely access and download the public radar station's local map data.");
  },
  // Crew Teleporter. The map reveal is not wired.
  // Auto-ship fight in plasma storm. Engines 3-5. Two results, no odds. INFERRED: equal.
  "c:auto-ship-fight-in-plasma-storm:1": (g) => {
    const level = g.player.systems.engines?.level ?? 0;
    if (level < 3 || level > 5) return;
    if (pick(g, ["lose", "fight"] as const) === "fight") {
      pageFight(g, "Despite your advanced engines you are unable to shake them; you turn and prepare for a fight.", "Auto-ship", "auto-ship-fight-in-plasma-storm");
      return;
    }
    result(g, "You successfully lose the ship in the storm.", undefined, ["Nothing happens."]);
  },
  // Improved Engines, level 6+. Always lose the ship.
  "c:auto-ship-fight-in-plasma-storm:2": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    result(g, "You successfully lose the ship in the storm.", undefined, ["Nothing happens."]);
  },
  // Cloaking. Always lose the ship. The page prints no drone-part cost.
  "c:auto-ship-fight-in-plasma-storm:3": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    result(g, "By using your advanced cloaking system you easily lose your pursuer in the storm.", undefined, ["Nothing happens."]);
  },
  // Deactivated Auto-ship. Download, two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:1": (g) => {
    deactivatedDownload(g);
  },
  // Sensors level 3. Two results, no odds. INFERRED: equal. The map reveal is not wired.
  "c:deactivated-auto-ship:2": (g) => {
    if (sensors(g) < 3) return;
    if (pick(g, ["safe", "standby"] as const) === "safe") {
      result(g, "Your improved sensors indicate that it's safe to hack into the drone. You upload its map data to your navigation system and strip the ship of useful materials.", rollStandard(g, "low"));
      return;
    }
    card(g, "Your improved sensors indicate the ship is on standby, ready to activate at a moment's notice. Will you still attempt to access the ship's data?", [
      { id: "q:deactivated-auto:yes", label: "Yes." },
      { id: "q:deactivated-auto:no", label: "No." },
    ]);
  },
  // Standby "Yes." reuses the download's two results.
  "q:deactivated-auto:yes": (g) => {
    deactivatedDownload(g);
  },
  "q:deactivated-auto:no": (g) => {
    result(g, "You leave the ship alone and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Rock ship in plasma storm. A living Rock crewmember. High standard. The map is not involved.
  "c:rock-ship-in-plasma-storm:2": (g) => {
    if (!hasRock(g)) return;
    result(g, "The rock grudgingly transfer control of their helm to you and you steer them to a thinner part of the nebula. They're not sure what to think, but transfer over some supplies all the same.", rollStandard(g, "high"));
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
    result(g, "You don't want to alert the Rebels of your presence and you don't want to anger the Zoltan in their territory. The best solution is to leave.", undefined, ["Nothing happens."]);
  },
  // Escort civilians FTL haywire. "Decline." One printed result. No quest marker.
  "c:escort-civilians-ftl-haywire:1": (g) => {
    result(g, "Alright... If you're not going that way I guess it can't be helped. We'll just wait for the next ship to come.", undefined, ["Nothing happens."]);
  },
  // Escort civilians FTL haywire. Advanced FTL Navigation. High scrap with resources. No quest marker.
  "c:escort-civilians-ftl-haywire:2": (g) => {
    if (!g.augments.includes("nav")) return;
    result(g, "We're receiving your transmission... Wow, I didn't know that chain-jumping was possible with this class of ship. We'll get back in a single jump! Thank you so much, please accept this.", rollStandard(g, "high"));
  },
  // Auto-ship warning. One printed lead-in, then the running Auto-ship. Escape stays the 40 second pursuit row.
  "c:auto-ship-warning:0": (g) => {
    pageFight(g, "The ship starts to power up its FTL Drive. If it gets away, it will no doubt warn the fleet of your position!", "Auto-ship", "auto-ship-warning");
  },
  // Pirate briber. Low scrap with resources. The static tier note does not pay the resources.
  "c:pirate-briber:0": (g) => {
    result(g, "\"Good choice, son. We've both come out of this richer.\"", rollStandard(g, "low"));
  },
  // Pirate briber. "Try to be a hero. Attack the pirate." One printed lead-in, then a Pirate ship fight.
  "c:pirate-briber:1": (g) => {
    pageFight(g, "The pirate ship stops its pursuit and locks weapons onto your ship.", "Pirate ship", "pirate-briber");
  },
  // Engi distress Rebel fight. {{SurrenderEscape(alt)|no}}: never runs away, never surrenders.
  "c:engi-distress-rebel-fight:0": (g) => {
    pageFight(
      g,
      "The distress signal originates at a small Engi ship under attack by a rebel fighter - but when they see Federation markings they turn to attack!",
      "Rebel Ship",
      "engi-distress-rebel-fight",
      { ...NEVER_RUN },
    );
  },
  // Give them 25 scrap. Three results, no odds. INFERRED: equal. The drone schematic is unnamed and not granted.
  "q:engi-distress:scrap": (g) => {
    engiDistressGift(g);
  },
  "q:engi-distress:supplies": (g) => {
    if (g.scrap < 40 || g.missiles < 2 || g.fuel < 2) return;
    g.scrap -= 40;
    g.missiles -= 2;
    g.fuel -= 2;
    log(g, "Scrap: -40.");
    log(g, "Missiles: -2.");
    log(g, "Fuel: -2.");
    result(
      g,
      "They wouldn't get more than a few jumps with that load-out. You provide them with all the munitions and supplies they should need for the journey home. \"Generosity magnitude unpredicted. Well-being syntax error [value too high]. Accept this token.\"",
      undefined,
      [grantAug(g, "medbot"), "Scrap: -40.", "Missiles: -2.", "Fuel: -2."],
    );
  },
  "q:engi-distress:nothing": (g) => {
    result(
      g,
      "Engi can't feel fear, so they bear you no ill will when you explain you're unwilling to help. They set off on their journey and you do the same.",
      undefined,
      ["Nothing happens."],
    );
  },
  // Pirate smuggler. Weapon Control level 6+. Medium fuel (2-4) and medium scrap.
  "c:pirate-smuggler:2": (g) => {
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    card(g, "They hail you, \"There's no need for aggression... Perhaps this would convince you to look the other way?\"", [
      { id: "q:pirate-smuggler:bribe", label: "Take their bribe." },
      { id: "q:pirate-smuggler:attack", label: "Ignore their bribe and attack." },
    ]);
  },
  "q:pirate-smuggler:bribe": (g) => {
    const offer = scrapOnly(g, "medium");
    offer.fuel = between(g, [2, 4]);
    result(g, "You receive medium fuel and scrap.", offer);
  },
  "q:pirate-smuggler:attack": (g) => {
    pageFight(g, "You power up your weapons and move in to engage.", "Pirate ship", "pirate-smuggler");
  },
  // Pirate ship attacking Crystal. Template:Crystal Ship Saved. The Crystal weapon is not named.
  "q:crystal-pirate:contact": (g) => crystalContact(g),
  // Rock atheists. Two texts, no odds. INFERRED: equal. The fight marker sits under the second sentence; both charge.
  "c:rock-atheists:0": (g) => {
    const text = pick(g, [
      "They barely hear out your appeals before yelling, \"These are the lies I sought to escape!\" Looks like they're charging weapons!",
      "They listen to your appeals and whisper, \"Traitors to truth. You're no better than them!\" Chaos ensues.",
    ]);
    pageFight(g, text, "Rock ship", "rock-atheists");
  },
  // Promise. {{DuplicateEvent|2}} on nothing. The Rockman is one result.
  "c:rock-atheists:1": (g) => rockAtheistPromise(g),
  // Improved Sensors level 2+. A Rockman joins. No skill is printed.
  "c:rock-atheists:2": (g) => {
    if ((g.player.systems.sensors?.level ?? 0) < 2) return;
    rockAtheistJoins(g, "The Rock captain is impressed by the data you've collected and agrees to stay with you until they find their footing in the galaxy.");
  },
  // Pirate ship selling drones. Hail opens the dock, the slug warning, and the hacking toll.
  "q:pirate-drones:hail": (g) => {
    card(g, `The ship responds "Yes, we have an extensive stock! Come aboard and see our wares!"`, [
      { id: "q:pirate-drones:dock", label: "Dock with the ship." },
      { id: "q:pirate-drones:leave", label: "This seems dangerous, leave." },
      { id: "q:pirate-drones:slug", label: "Sir: We can dock, but I sense that we better plan on making a purchase..." },
      { id: "q:pirate-drones:hack", label: "Disable their Weapon system before docking." },
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
      "As soon as you start to reverse your ship, the pirate reveals hidden weaponry and sets off in pursuit. You'll have to fight him to escape!",
      "Pirate ship",
      "pirate-ship-selling-drones",
    );
  },
  "q:pirate-drones:hack": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0) return;
    result(
      g,
      `You receive a hail as soon as your Hacking system finishes: "What have you done!? You can never trust a Federation ship! Here, take your 'standard toll'. I really should do business elsewhere, scum."`,
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
      "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!",
      "Pirate ship",
      "pirate-ships-in-plasma-storm",
    );
  },
  // Ammunition cargo. A second fight slug so the missile table is not the fuel table.
  "c:pirate-ships-in-plasma-storm:1": (g) => {
    pageFight(
      g,
      "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!",
      "Pirate ship",
      "pirate-ships-in-plasma-storm-ammo",
    );
  },
  // Pirate ships in plasma storm. "Let them leave." One printed result.
  "c:pirate-ships-in-plasma-storm:2": (g) => {
    result(g, "Sometimes discretion is the better part of valor.", undefined, ["Nothing happens."]);
  },
  "q:pirate-briber:gone": (g) => {
    pirateGone(g);
  },
  "q:pirate-briber:salvage": (g) => {
    result(g, "You strip the ship of anything useful and leave its crew to hope help arrives.", rollStandard(g, "low"));
  },
  // No effect in The Last Stand.
  "q:pirate-briber:delay": (g) => {
    if (g.sector === 8 || g.sectorName === "The Last Stand") {
      result(g, "Hopefully that will buy you more time to get to the next sector.", undefined, ["No effect in The Last Stand."]);
      return;
    }
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, "Hopefully that will buy you more time to get to the next sector.", undefined, ["The Rebel Fleet is delayed for 1 turn."]);
  },
  // Rebel fight choice in nebula. Conceal lists three results and prints no odds. INFERRED: equal.
  // Caught opens Prepare to fight, or Engines 4+. Chase doubles pursuit for 1 jump (citedChoose `faster`: one extra step).
  "c:rebel-fight-choice-in-nebula:1": (g) => {
    const r = pick(g, ["caught", "chase", "hidden"] as const);
    if (r === "caught") {
      card(g, "You immediately slip further into the clouds, but not quickly enough. The rebel catches sight of you and moves in to engage!", [
        { id: "q:rebel-nebula:fight", label: "Prepare to fight." },
        { id: "q:rebel-nebula:engines", label: "Fully power the engines to out-run them." },
      ]);
      return;
    }
    if (r === "chase") {
      g.fleet += 1;
      log(g, "Rebel Fleet pursuit is doubled for 1 jump.");
      result(
        g,
        "The ship spots you and gives chase. After some quick maneuvering you were able to lose your pursuers in the clouds. You expect they warned the fleet of your position, however.",
        undefined,
        ["Rebel Fleet pursuit is doubled for 1 jump."],
      );
      return;
    }
    result(g, "You power down non-essential systems and slip into the cloud. The ship never noticed you.", undefined, ["Nothing happens."]);
  },
  "q:rebel-nebula:fight": (g) => {
    pageFight(g, "Prepare to fight.", "Rebel ship", "rebel-fight-choice-in-nebula");
  },
  // Engines level 4+. The page prints no percent.
  "q:rebel-nebula:engines": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 4) return;
    result(g, "Your powerful engines allow you to out-distance the ship and eventually lose it within the nebula.", undefined, ["Nothing happens."]);
  },
  // Cloaking. Nothing happens.
  "c:rebel-fight-choice-in-nebula:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    result(g, "You use your cloaking system to slip further into the nebula undetected.", undefined, ["Nothing happens."]);
  },
  // Mantis fight choice. Conceal: {{DuplicateEvent|2}} on the fight, once on nothing.
  // The printed OR is the two fight sentences. INFERRED: those two are equal inside the doubled result.
  "c:mantis-fight-choice:1": (g) => {
    const spotted = weighted(g, [[true, 2], [false, 1]] as [boolean, number][]);
    if (!spotted) {
      result(g, "You power down non-essential systems and wait for the FTL drive to charge. They either don't want to fight or have failed to notice your ship, the latter being more likely.", undefined, ["Nothing happens."]);
      return;
    }
    const line = pick(g, [
      "You power down non-essential systems in an attempt to remain unnoticed. It looks like they are about to leave when suddenly they turn and set course toward you, weapons powered.",
      "Before you have a chance to slink away the Mantis ship notices you and powers up their weapons.",
    ] as const);
    pageFight(g, line, "Mantis ship", "mantis-fight-choice");
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
      result(g, line, undefined, ["Nothing happens."]);
      return;
    }
    pageFight(g, "You quickly cloak the ship, but not quickly enough. They spot you and move in to engage.", "Mantis ship", "mantis-fight-choice");
  },
  // Pirate ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian:0": (g) => {
    pageFight(g, "You power up your weapons and engage the pirate ship.", "Pirate ship", "pirate-ship-attacking-civilian");
  },
  // Pirate ship attacking civilian. "Stay out of it." One printed result.
  "c:pirate-ship-attacking-civilian:1": (g) => {
    result(g, "The fight brings them out of your immediate scanning range. After a time the distress calls stop.", undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking civilian distress. "Aid the civilian ship." One printed lead-in, then a Pirate ship fight.
  "c:pirate-ship-attacking-civilian-distress:0": (g) => {
    pageFight(g, "You power up your weapons and engage the pirate ship.", "Pirate ship", "pirate-ship-attacking-civilian-distress");
  },
  // Pirate ship attacking civilian distress. The distress page's stay-out line.
  "c:pirate-ship-attacking-civilian-distress:1": (g) => {
    result(g, "The fight brings them out of your immediate scanning range; however, after a time the distress calls stop.", undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking civilian (Lanius). "Avoid the conflict." One printed result.
  "c:pirate-ship-attacking-civilian-lanius:1": (g) => {
    result(g, "Unfortunately it is not your mission to save every person affected by this war or the Lanius invasion.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian:1": (g) => {
    result(g, "Unfortunately it is not your mission to save every person affected by this war or the Lanius invasion.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking civilian distress. "Fight the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-civilian-distress:0": (g) => {
    pageFight(g, "You move in to intercept the ship. Detecting a greater threat, the Lanius prepare to fight.", "Lanius ship", "lanius-ship-attacking-civilian-distress");
  },
  // The Mercenary. "Fight the ship." One printed lead-in, then a Pirate ship fight.
  "c:the-mercenary:1": (g) => {
    pageFight(g, "Mercenaries are worse than rebels. The only honorable course is to engage the mercenary in battle.", "Pirate ship", "the-mercenary");
  },
  // Pirate toll. "Reject their offer." One printed lead-in, then a Pirate ship fight.
  "c:pirate-toll:1": (g) => {
    pageFight(g, "\"Too bad... You will regret this decision!\"", "Pirate ship", "pirate-toll");
  },
  // Lanius ship attacking Rock. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-rock:0": (g) => {
    pageFight(g, "The Rockmen need your help - you target the Lanius ship and grimly prepare for battle.", "Lanius ship", "lanius-ship-attacking-rock");
  },
  // Lanius ship attacking Rock. "Leave the Rockmen to their fate." One printed result.
  "c:lanius-ship-attacking-rock:1": (g) => {
    result(g, "As you make your escape, the Rockman's ship's engines explode, and you watch the Lanius ship slowly feed on the remains - and the crew.", undefined, ["Nothing happens."]);
  },
  // Lanius ship absorbing automated scout. "Leave them alone." One printed result. Do not inspect the scout.
  "c:lanius-ship-absorbing-automated-scout:1": (g) => {
    result(g, "Whatever assistance the disabled scout could provide is not worth the risk of fighting another Lanius. You prepare to move on.", undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking Crystal. "Ignore them." One printed result.
  "c:mantis-ship-attacking-crystal:1": (g) => {
    result(g, "You try to keep a low profile and quickly prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Mantis ship with Rock body parts. "Ignore them." One printed result.
  "c:mantis-ship-with-rock-body-parts:1": (g) => {
    result(g, "The Mantis take no interest in your ship - they're lying in wait for the next Rock ship to venture through. You're able to spin up the engines and jump at your leisure.", undefined, ["Nothing happens."]);
  },
  // Lanius lone ship. "Stay out of it." One printed result.
  "c:lanius-lone-ship:1": (g) => {
    result(g, "You ignore the ship's pleas and watch as it hastily escapes. Oddly, the Lanius ship makes no move to chase it. You wonder if they were ever a threat at all.", undefined, ["Nothing happens."]);
  },
  // Crystal fight choice. "Leave them alone." One printed result.
  "c:crystal-fight-choice:1": (g) => {
    result(g, "It's best to take advantage of the rare occasions when the Rebels aren't shooting at you. You prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Destroyed cargo ship. "Leave it alone, this looks suspicious." One printed result.
  "c:destroyed-cargo-ship:1": (g) => {
    result(g, "You leave the cargo alone and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Pirate ship attacking Crystal. "Ignore them." One printed result.
  "c:pirate-ship-attacking-crystal:1": (g) => {
    result(g, "You assume the Crystalline ship can handle itself. You have enough of your own problems.", undefined, ["Nothing happens."]);
  },
  // Escort civilians. "Decline." One printed result.
  "c:escort-civilians:1": (g) => {
    result(g, "\"We understand. Not everyone is confident they can survive in these hostile times, let alone take the responsibility of protecting others.\"", undefined, ["Nothing happens."]);
  },
  // Remote settlement. "Ignore them." One printed result.
  "c:remote-settlement:1": (g) => {
    result(g, "It's just not possible to save every civilian affected by this war. You prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Pirate smuggler. "Ignore the ship." One printed result.
  "c:pirate-smuggler:1": (g) => {
    result(g, "It jumps away after a time.", undefined, ["Nothing happens."]);
  },
  // Refueling platform garbled broadcast. "Ignore the platform." One printed result.
  "c:refueling-platform-garbled-broadcast:1": (g) => {
    result(g, "You leave the platform alone, and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Zoltan ship asks to dock. "Have them keep their distance." One printed result.
  "c:zoltan-ship-asks-to-dock:1": (g) => {
    result(g, "They leave without a word.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Mantis. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-attacking-mantis:0": (g) => {
    pageFight(g, "The Lanius haven't noticed you yet - but they will. Launching into the fray, you target the Lanius vessel!", "Lanius ship", "lanius-ship-attacking-mantis");
  },
  // Lanius ship attacking Mantis. "Leave the Mantis to their fate." One printed result.
  "c:lanius-ship-attacking-mantis:1": (g) => {
    result(g, "The Mantis ship is quickly overcome by the Lanius vessel, and you move away as the Lanius feed on the remains.", undefined, ["Nothing happens."]);
  },
  // Lanius ship attacking Slug. "Leave the Slugs to their fate." One printed result.
  "c:lanius-ship-attacking-slug:1": (g) => {
    result(g, "You leave the Lanius ship alone, and prepare to jump to the next beacon.", undefined, ["Nothing happens."]);
  },
  // Zoltan ship follows Mantis ship. "Interfere and save the Mantis ship." One printed lead-in, then a Zoltan ship fight in the asteroid field.
  "c:zoltan-ship-follows-mantis-ship:0": (g) => {
    pageFight(
      g,
      "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there.",
      "Zoltan ship",
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
      "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends.",
      "Mantis ship",
      "zoltan-ship-follows-mantis-ship",
      undefined,
      true,
    );
    allMantisCrew(g);
  },
  // Zoltan ship follows Mantis ship. "Don't interfere." One printed result.
  "c:zoltan-ship-follows-mantis-ship:2": (g) => {
    result(g, "The Zoltan know their business better than most - best to leave them to it. You prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Zoltan wise man. "Mantis." One printed lead-in, then a Mantis ship whose crew are all Mantis.
  "c:zoltan-wise-man:0": (g) => {
    pageFight(g, `"You like a challenge. So be it!" A wormhole forms and a confused, angry Mantis ship hurtles toward you!`, "Mantis ship", "zoltan-wise-man");
    allMantisCrew(g);
  },
  // Zoltan wise man. "Slug." One printed lead-in, then a Slug ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:1": (g) => {
    pageFight(g, `"Do not be fooled, Federation, by a soft underbelly." You detect a wormhole opening up, and seconds later a Slug ship is attacking from the other direction!`, "Slug ship", "zoltan-wise-man");
  },
  // Zoltan wise man. "Rockmen." One printed lead-in, then a Rock ship fight. The page does not say the crew are all Mantis.
  "c:zoltan-wise-man:2": (g) => {
    pageFight(g, `"A hardened foe for a hardened veteran." You detect a wormhole opening up, and a Rock ship appears with guns blazing. It appears they were in combat when they were thrust across space-time.`, "Rock ship", "zoltan-wise-man");
  },
  // Space station under construction. "Decline." One printed result.
  "c:space-station-under-construction:1": (g) => {
    result(g, `"I understand." Transmission has been cut.`, undefined, ["Nothing happens."]);
  },
  // Crystal ship attacking Federation loyalists. "Save the Federation ship." One printed lead-in, then a Crystal ship fight.
  // {{SurrenderEscape(alt)|no|CRYSTAL_FED}} is not this line.
  "c:crystal-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(g, "It doesn't look like the Fed ship can stand much more pressure. You fly in and intercept the Crystalline ship.", "Crystal ship", "crystal-ship-attacking-federation-loyalists");
  },
  // Crystal ship attacking Federation loyalists. "Prepare to leave." One printed result.
  "c:crystal-ship-attacking-federation-loyalists:1": (g) => {
    result(g, "With the Federation ship distracting the guard, you are free to continue on your mission.", undefined, ["Nothing happens."]);
  },
  // Engi smashed ships. "Attempt to help the ships by prying them apart." One printed lead-in, then an Engi ship fight.
  "c:engi-smashed-ships:0": (g) => {
    pageFight(g, "To your surprise, one of the Engi vessels attacks! One ship detaches itself, surprisingly still quite whole, and opens fire - it looks like it's somehow identified you as hostile!", "Engi ship", "engi-smashed-ships");
  },
  // The Engi virus. "Attack the Engi vessel!" One printed lead-in, then an Engi ship fight. Halving engines and shields is the other choice.
  "c:the-engi-virus:1": (g) => {
    pageFight(g, "The Engi be damned, no one threatens your ship. You prepare for a fight!", "Engi ship", "the-engi-virus");
  },
  // The Engi virus. "Hold on! Let us try to purge the system code!" One printed lead-in, then an Engi ship fight.
  // The page halves Engines and Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:the-engi-virus:0": (g) => {
    pageFight(g, "Wiping your engine core and shields proves useless... eventually you trap the virus in the weapons systems to purge it, but before you do, the Engi grow restless and attack!", "Engi ship", "the-engi-virus");
    halvePlayerSystems(g, ["engines", "shields"]);
  },
  // Slug hacker (choice). "Shields." One printed lead-in, then a Slug ship fight.
  // The page halves Shields, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-choice:0": (g) => {
    pageFight(g, `"Very good then!" Your shield power suddenly drops and they charge.`, "Slug ship", "slug-hacker-choice");
    halvePlayerSystems(g, ["shields"]);
  },
  // Slug hacker (choice). "Oxygen." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-choice:1": (g) => {
    pageFight(g, `"A being that would choose sssuffocation? Who am I to judge..." Your life support shuts off and they move in to attack.`, "Slug ship", "slug-hacker-choice");
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (choice). "Weapons." One printed lead-in, then a Slug ship fight.
  // The page halves Weapon Control, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-choice:2": (g) => {
    pageFight(g, `"Your acceptance of death is almosst admirable... Almosst." Your weapons system registers a hacking module. You hardly have time to respond before they attack.`, "Slug ship", "slug-hacker-choice");
    halvePlayerSystems(g, ["weapons"]);
  },
  // Slug hacker (choice). "Offer 35 scrap to leave you alone." One printed result. The page spends 35 scrap.
  // This handler returns before citedChoose, so the scrap is spent here.
  "c:slug-hacker-choice:3": (g) => {
    if (g.scrap < 35) return;
    g.scrap -= 35;
    result(g, `"I really am feeling generousss..." They take the scrap and leave.`, undefined, ["You avoided the fight."]);
  },
  // Slug hacker (choice). "Counter any hack attempt." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  "c:slug-hacker-choice:4": (g) => {
    pageFight(g, `"Sssilence won't protect you. I'll make the choice mysself... Wait. Why isn't this working?" You cut transmission and move in to attack.`, "Slug ship", "slug-hacker-choice");
    shutPlayerHacking(g);
  },
  // Rebel ship attacking Crystal ship. "Ignore them." One printed result.
  "c:rebel-ship-attacking-crystal-ship:2": (g) => {
    result(g, "With the two ships engaged in combat, you sneak by unnoticed.", undefined, ["Nothing happens."]);
  },
  // Slug hacker (oxygen). "Try to squeeze some extra power to the system." One printed lead-in, then a Slug ship fight.
  // The page halves the Oxygen system, rounding down. This handler returns before citedChoose, so the half is applied here.
  "c:slug-hacker-oxygen:1": (g) => {
    pageFight(g, "Thankfully your improved subsystem is able to counter their hacking enough to keep the life support barely functional. That should keep you alive at least...", "Slug ship", "slug-hacker-oxygen");
    halvePlayerSystems(g, ["oxygen"]);
  },
  // Slug hacker (oxygen). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  "c:slug-hacker-oxygen:2": (g) => {
    pageFight(g, "Your hacking system automatically counters the digital assault and you move in to fight the ship.", "Slug ship", "slug-hacker-oxygen");
    shutPlayerHacking(g);
  },
  // Slug hacker (medical). "Counter the remote hacking." One printed lead-in, then a Slug ship fight.
  // The page beams 2 slug boarders and says "Hacking offline". Medbay stays online on this path.
  // INFERRED: the installed hacking level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's medical shutdown and boarders do not run.
  "c:slug-hacker-medical:1": (g) => {
    pageFight(g, "You are able to undo the damage of their remote hacking satellite but it's taking everything your hacking system has. Time to take out the enemy the old fashioned way.", "Slug ship", "slug-hacker-medical");
    shutPlayerHacking(g);
    slugBoarders(g, 2, 2, "slug boarders beam aboard your ship.");
  },
  // Legendary thief KazaaakplethKilik. "Attempt to hail him." One printed lead-in, then a Mantis ship fight.
  // The page prints "crew entirely composed of Mantis." This handler returns before citedChoose.
  "c:legendary-thief-kazaaakplethkilik:1": (g) => {
    pageFight(g, "Your Mantis crew-member steps forward. He and KazaaakplethKilik perform a weird kind of alien haka. You, meanwhile, charge the battle systems.", "Mantis ship", "legendary-thief-kazaaakplethkilik");
    allMantisCrew(g);
  },
  // Mantis ship with Rock body parts. "Put your Rock crewmember on the comm." One printed lead-in, then a Mantis ship.
  // This handler returns before citedChoose so the Rock requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:2": (g) => {
    pageFight(g, "The two aliens face one another over the vidscreen. \"Cave-dwelling pebble-man!\" yells the furious Mantis captain. \"See, I paint my ship with your companions! I paint my ship with you!\"", "Mantis ship", "mantis-ship-with-rock-body-parts");
  },
  // Mantis ship with Rock body parts. "Ram the bastards." One printed lead-in, then a Mantis ship.
  // The page says their engines are disabled. INFERRED: every installed engine bar is damaged. The page prints no bar count.
  // This handler returns before citedChoose so the Rock Plating requirement can close the button.
  "c:mantis-ship-with-rock-body-parts:3": (g) => {
    pageFight(g, "Before they have a chance, you ram your ship into theirs, causing irreparable damage to their engines. Luckily, your ship's armored hull is hardly dented from the impact. The Mantis ship careens away and you move in to attack.", "Mantis ship", "mantis-ship-with-rock-body-parts");
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage) hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },
  // Pirate engine hacker. "Counter the remote hacking." One printed lead-in, then a Pirate ship fight.
  // The page says "Hacking offline". INFERRED: the installed level stays, and a launch is refused until that fight ends.
  // This handler returns before citedChoose, so the Continue path's engine cap does not apply.
  "c:pirate-engine-hacker:1": (g) => {
    pageFight(g, "Your Hacking System automatically counters the digital assault and you move in to fight the ship.", "Pirate ship", "pirate-engine-hacker");
    shutPlayerHacking(g);
  },
  // Zoltan retake the ship. "Leave." One printed result.
  "c:zoltan-retake-the-ship:1": (g) => {
    result(g, "You refuse to get his ship back, but still offer to drop him off at the next station. The Zoltan is displeased, but directs you to a nearby starbase just the same.", undefined, ["Nothing happens."]);
  },
  // Federation Deserters. "Attack the traitors." One printed lead-in, then a Federation ship fight.
  "c:federation-deserters:0": (g) => {
    pageFight(g, "Deserters cannot be tolerated. You open fire on the cowards - though it doesn't please you to do so. The Federation needs every soldier it can get.", "Federation ship", "federation-deserters");
  },
  // Federation Deserters. "Leave them be." One printed result.
  "c:federation-deserters:1": (g) => {
    result(g, "You send them a friendly warning regarding the armada of Rebel ships pursuing you, and then get underway lest they catch you up.", undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking refueling outpost. "Intervene to defend the outpost." One printed lead-in, then a Rebel ship fight.
  // Never-escape and never-surrender stay on this fight slug.
  "c:rebel-ship-attacking-refueling-outpost:0": (g) => {
    pageFight(g, `The rebel responds to your threat, "I don't know who you are, but no one defies the Rebel Fleet!" They move in to engage.`, "Rebel ship", "rebel-ship-attacking-refueling-outpost");
  },
  // Auto-ship attacking outpost. "Intervene to defend the outpost." One printed lead-in, then an Auto-ship fight.
  "c:auto-ship-attacking-outpost:0": (g) => {
    pageFight(g, "Detecting the higher threat, the automated ship moves in to engage your ship.", "Auto-ship", "auto-ship-attacking-outpost");
  },
  // Auto-ship attacking outpost. "Avoid the conflict." One printed result.
  "c:auto-ship-attacking-outpost:1": (g) => {
    result(g, "You steer clear of the conflict. The outpost receives a beating but the ship stops its attack before it's destroyed.", undefined, ["Nothing happens."]);
  },
  // Auto-ship attacking civilian. "Stay out of it." One printed result.
  "c:auto-ship-attacking-civilian:1": (g) => {
    result(g, "The fight brings them out of your immediate scanning range.", undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking refueling outpost. "Avoid the conflict." One printed result.
  "c:rebel-ship-attacking-refueling-outpost:1": (g) => {
    result(g, "The Rebel ship fires some warning shots but eventually powers down their weapons. The outpost seems to have given them what they demanded.", undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking civilians in Last Stand. "Prepare to fight the Rebel ship!" One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-civilians-in-last-stand:0": (g) => {
    pageFight(g, "You move in to intercept.", "Rebel ship", "rebel-ship-attacking-civilians-in-last-stand");
  },
  // Rebel ship attacking civilians in Last Stand. "There's no time, get ready to jump." One printed result.
  "c:rebel-ship-attacking-civilians-in-last-stand:1": (g) => {
    result(g, "You try to block out the horrors of war and focus on your mission.", undefined, ["Nothing happens."]);
  },
  // Lanius ship in rich debris field. "Attempt to harvest some for yourself." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:0": (g) => {
    pageFight(g, "As you attempt to navigate the debris, you come too close to the Lanius ship - and they proceed to try to harvest you!", "Lanius ship", "lanius-ship-in-rich-debris-field");
  },
  // Zoltan security checkpoint. "You don't have time for this nonsense. Attack!" One printed lead-in, then a Zoltan ship fight.
  "c:zoltan-security-checkpoint:0": (g) => {
    pageFight(g, "Expecting resistance, their Energy Shield is raised and ready for combat.", "Zoltan ship", "zoltan-security-checkpoint");
  },
  // Lanius ship in rich debris field. "Attack the vessel." One printed lead-in, then a Lanius ship fight.
  "c:lanius-ship-in-rich-debris-field:1": (g) => {
    pageFight(g, "You go on the offensive and power up your weapons - with any luck, you'll soon have the mineral field all to yourself.", "Lanius ship", "lanius-ship-in-rich-debris-field");
  },
  // Lanius ship attacking civilian distress. "Avoid the conflict." One printed result.
  "c:lanius-ship-attacking-civilian-distress:1": (g) => {
    result(g, "Your crew seems unhappy to leave the civilians to such a fate but you try to convince them of the greater good. You don't speak of your own misgivings, however.", undefined, ["Nothing happens."]);
  },
  // Rebel ship attacking Federation loyalists. "Aid the Federation ship." One printed lead-in, then a Rebel ship fight.
  "c:rebel-ship-attacking-federation-loyalists:0": (g) => {
    pageFight(g, "You power up your weapons and engage the Rebel ship.", "Rebel ship", "rebel-ship-attacking-federation-loyalists");
  },
  // Rebel ship attacking Federation loyalists. "Use this chance to escape." One printed result.
  "c:rebel-ship-attacking-federation-loyalists:1": (g) => {
    result(g, "The Rebel's preoccupation with the Federation ship allows you to slip away undetected. However, you can't help but feel you should have helped them.", undefined, ["Nothing happens."]);
  },
  // Rebel shipyard. "Leave immediately." One printed result. Do not grant the unnamed salvage or start the Flagship fight.
  "c:rebel-shipyard:1": (g) => {
    result(g, "You feel the mission is the highest priority and it's too risky to stay in such a dangerous location.", undefined, ["Nothing happens."]);
  },
  // Rebel transport ship. "Avoid the ship." One printed result.
  "c:rebel-transport-ship:1": (g) => {
    result(g, "They stay outside your weapons range, and eventually jump away.", undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking civilian. "Aid the civilian ship." One printed lead-in, then a Mantis ship fight.
  "c:mantis-ship-attacking-civilian:0": (g) => {
    pageFight(g, "You frown, power up the weapons and prepare to engage the Mantis ship. Not today.", "Mantis ship", "mantis-ship-attacking-civilian");
  },
  // Mantis ship attacking civilian. "Stay out of it." Three results and no odds. INFERRED: equal.
  "c:mantis-ship-attacking-civilian:1": (g) => {
    const line = pick(g, [
      "Smoking, the civilian ship limps on. You set your sights on the future.",
      "The noise of the FTL spinning up almost drowns out the explosions. Almost.",
      "You let them pass and try not to think about it.",
    ] as const);
    result(g, line, undefined, ["Nothing happens."]);
  },
  // Mantis ship attacking Slug ship. {{SurrenderEscape(alt)|no}}. The Mantis fight keeps the page slug.
  "c:mantis-ship-attacking-slug-ship:0": (g) => {
    pageFight(g, "You lock onto the Mantis ship and engage.", "Mantis ship", "mantis-ship-attacking-slug-ship", { ...NEVER_RUN });
  },
  // The Slug fight must not use the Mantis win. It does not surrender or escape.
  "c:mantis-ship-attacking-slug-ship:1": (g) => {
    pageFight(g, "You move to finish what the Mantis have started.", "Slug ship", "mantis-ship-attacking-slug-ship-slug", { ...NEVER_RUN });
  },
  "q:mantis-slug:leave": (g) => {
    result(g, "These wretches aren't worth fighting. Time to spin up and jump off.", undefined, ["Nothing happens."]);
  },
  "q:mantis-slug:finish": (g) => {
    mantisSlugFinish(g);
  },
  // Zoltan security checkpoint. Two results, no odds. INFERRED: equal.
  "c:zoltan-security-checkpoint:1": (g) => {
    if (pick(g, ["wanted", "pass"] as const) === "pass") {
      result(g, "After a few moments of uncertainty, your crew is allowed to pass.", undefined, ["Nothing happens."]);
      return;
    }
    card(g, "The Zoltan security staff board your ship and begin scanning the crew's faces into a computer. Suddenly alarms go off and the Zoltan leap on one of your crew! \"This person is wanted on five charges of Utter Villainy! Surrender them to us!\"", [
      { id: "q:zoltan-checkpoint:give", label: "Give up your crewmember." },
      { id: "q:zoltan-checkpoint:fight", label: "Refuse and fight." },
    ]);
  },
  // Clone Bay has no effect. INFERRED: never the last crewmember.
  "q:zoltan-checkpoint:give": (g) => {
    const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
    const extras: string[] = [];
    if (mine.length > 1) {
      const lost = pick(g, mine);
      g.crew = g.crew.filter((c) => c.id !== lost.id);
      extras.push(`${lost.name} is lost.`);
    }
    if (g.player.kits.cradle) extras.push("Unfortunately your crewmember was taken away unharmed so your Clone Bay was unable to retrieve them.");
    result(g, "It's a tough call, but Zoltan law holds sway here. Besides, that one always seemed a bit shifty.", undefined, extras);
  },
  // The scan fight is not the attack fight. Weapon Control is halved, and 2-4 Zoltan boarders come aboard.
  "q:zoltan-checkpoint:fight": (g) => {
    pageFight(g, "You're not going to leave anyone behind. You pull away from the station with the enemy guards on board. Unfortunately, they are able to sabotage your weapon system in the chaos. It's time to leave!", "Zoltan ship", "zoltan-security-checkpoint-scan");
    halvePlayerSystems(g, ["weapons"]);
    zoltanBoarders(g, 2, 4);
  },
  // {{Blue Option|Slug Crew}}. Medium fuel, 2-4. A dead Slug does not count.
  "c:zoltan-security-checkpoint:2": (g) => {
    if (!hasSlug(g)) return;
    zoltanCheckpointFuel(g, "You give the guards permission to dock with the ship, but before they come on board your crew member slowly advances to meet them. As far as you can tell no words were exchanged, but the guards offer you some supplies and say the ship checks out. Best to not ask questions.");
  },
  // {{Blue Option|Mind Control}}. Medium fuel, 2-4.
  "c:zoltan-security-checkpoint:3": (g) => {
    if ((g.player.kits.leash?.level ?? 0) <= 0) return;
    zoltanCheckpointFuel(g, "The captain of the guard appears on the vid screen \"Back so soon friend! Well, no need to waste your time further. Here, take these spare fuel canisters and get on with your mission.\" Your ship is cleared to pass.");
  },
  // Pirate ship attacking civilian distress. Improved Weapons, level 6+. Two results, no odds. INFERRED: equal.
  // The scare-off path offers the same civilian contact. The page's scrap preview is not a separate payout.
  "c:pirate-ship-attacking-civilian-distress:2": (g) => {
    if ((g.player.systems.weapons?.level ?? 0) < 6) return;
    if (pick(g, ["fight", "leave"] as const) === "fight") {
      pageFight(g, "Detecting the greater threat (and potential reward), they turn and engage your ship.", "Pirate ship", "pirate-ship-attacking-civilian-distress");
      return;
    }
    card(g, "It seems the pirate wasn't looking for a fight with someone who could fight back. They leave and you move to contact the civilian ship.", [
      { id: "q:lanius-civilian:contact", label: "Contact the civilian ship." },
    ]);
  },
  // Auto-ship near storage station. Two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, "Before you can get close enough to scan the station, the automated ship detects you and moves in to attack!", "Auto-ship", "auto-ship-near-storage-station");
      return;
    }
    storageInvestigate(g, "The ship patrols wide around the area, successfully approaching the station while avoiding detection.");
  },
  // Auto-ship near storage station in nebula. Cloaking: two results, no odds. INFERRED: equal.
  "c:auto-ship-near-storage-station-in-nebula:2": (g) => {
    if ((g.player.kits.veil?.level ?? 0) <= 0) return;
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, "You try to sneak past the automated ship but it quickly turns and attacks!", "Auto-ship", "auto-ship-near-storage-station-in-nebula");
      return;
    }
    storageInvestigate(g, "You successfully sneak by the ship and access the station undetected.");
  },
  // Improved Cloaking, level 2+. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:3": (g) => {
    if ((g.player.kits.veil?.level ?? 0) < 2) return;
    storageInvestigate(g, "You successfully sneak by the ship and access the station undetected.");
  },
  // Hacking, one drone part. Two results, no odds. INFERRED: equal. The part is spent either way.
  "c:auto-ship-near-storage-station-in-nebula:4": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    if (pick(g, ["fight", "station"] as const) === "fight") {
      pageFight(g, "You send a drone to hack the station but the automated ship notices and turns to attack!", "Auto-ship", "auto-ship-near-storage-station-in-nebula");
      return;
    }
    storageInvestigate(g, "You successfully hack into the station and sever the connection to the automated ship. You access the station undetected.");
  },
  // Improved Hacking, level 2+, one drone part. Always the station.
  "c:auto-ship-near-storage-station-in-nebula:5": (g) => {
    if ((g.player.kits.spike?.level ?? 0) < 2 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    storageInvestigate(g, "You successfully hack into the station and sever the connection to the automated ship, accessing the station completely undetected.");
  },
  // Auto-ship near radar station. {{DuplicateEvent|2}} on the station, once on the fight.
  // The two station sentences have no odds between them. INFERRED: equal. The part is spent either way.
  // The map reveal inside Access the station is not wired.
  "c:auto-ship-near-radar-station:2": (g) => {
    if (!hasRadarCombat(g) || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    if (weighted(g, [["station", 2], ["fight", 1]] as const) === "fight") {
      pageFight(g, "Before your drone has a chance to attack, the automated ship activates and shoots it down. It then detects your ship and moves in on your position.", "Auto-ship", "auto-ship-near-radar-station");
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
    result(g, "You leave the station and prepare to jump.", undefined, ["Nothing happens."]);
  },
  // Hacking spends one drone part. The page prints one result: a one-turn fleet delay and a map download.
  // The map reveal is not wired.
  "q:auto-radar:drone": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0 || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    g.fleet = Math.max(0, g.fleet - 1);
    result(g, "You successfully hack into their system and transmit false information about your location. That should hold off the fleet for at least a little while. You also are able to download data about the surrounding beacons.", undefined, ["The Rebel Fleet is delayed for 1 turn."]);
  },
  // Template:Investigate the station. Four results, no odds. INFERRED: equal.
  // The weapon and the drone schematic are unnamed and not granted. The low scrap still is.
  "q:auto-storage:investigate": (g) => {
    const kind = pick(g, ["weapon", "schematic", "resources", "nothing"] as const);
    if (kind === "weapon") {
      result(g, "The station is a storage site for military grade weapons. You find one that can be easily attached to the ship.", scrapOnly(g, "low"));
      return;
    }
    if (kind === "schematic") {
      result(g, "The station was apparently designed to outfit Rebel ships with Drone Systems. You find a functioning Schematic.", scrapOnly(g, "low"));
      return;
    }
    if (kind === "resources") {
      result(g, "The station is a storage site for various resources. You salvage everything possible.", rollSurrenderOffer(g, "medium", true));
      return;
    }
    result(g, "The station was either abandoned or stripped clean. It seems to have lain unused for quite some time. You find nothing useful.", undefined, ["Nothing happens."]);
  },
  "c:auto-ship-near-sensor-station:3": (g) => {
    if (!hasTeleporter(g)) return;
    result(g, "Once on board, your crew is able to access and download the long-range scanner's archived information. Your map has been updated.");
  },
  "q:lanius-scout:inspect": (g) => {
    const offer = scrapOnly(g, pick(g, ["low", "medium", "high"]));
    if (pick(g, ["map", "fleet"] as const) === "fleet") {
      g.fleet = Math.max(0, g.fleet - 1);
      result(g, "You find the ship has a built-in method of warning the Rebel fleet of contact with your ship. You feed it some false data about your ship's whereabouts that should keep the fleet off your tail for a time.", offer, ["The Rebel Fleet is delayed for 1 turn."]);
      return;
    }
    result(g, "You are able to retrieve a significant amount of data about the surrounding beacons from the scout before you scrap it.", offer);
  },
  // Lanius lone ship, "Try to contact the Lanius ship." The civilian warning, then one button.
  "c:lanius-lone-ship:2": (g) => {
    card(g, "You approach the ship without activating weapons and the civilian ship says, \"Don't go any closer! Just kill them!\" before hastily making their retreat.", [
      { id: "q:lanius-lone:continue", label: "Ignore them and continue." },
    ]);
  },
  // Three results, no odds. INFERRED: equal. The fight is default Lanius rewards, so there is no PAGE_WINS row.
  "q:lanius-lone:continue": (g) => {
    const kind = weighted(g, [["store", 1], ["fight", 1], ["nothing", 1]] as const);
    if (kind === "store") {
      log(g, "You ask what they want and the translator chirps their response, \"Explore. Assess trade potential.\" It appears to be a merchant ship attempting to make connections with the other races. The civilian must have simply been too scared to ask. You check what they have to sell at the moment.");
      openStoreHere(g);
      return;
    }
    if (kind === "fight") {
      pageFight(g, "You ask what they are doing here but the translator clearly has problems with the request. The Lanius seem enraged for an indiscernible reason. They cut transmission and power their weapons. Looks like you'll have to fight after all!", "Lanius ship", "lanius-lone-ship");
      return;
    }
    result(g, "You ask what they are doing here but the translator clearly has problems with the request. It chirps with their response, \"Expunge... Floral... Proposition...\" You try to clarify their answer but to no avail. Both you and the Lanius captain end the transmission despondently.", undefined, ["Nothing happens."]);
  },
  // {{Blue Option|Lanius Crew|Try to contact the ship.}} A dead Lanius does not count.
  "c:lanius-lone-ship:3": (g) => {
    if (!hasLanius(g)) return;
    log(g, "Your crewmember opens a channel with them. It seems they are scouting for a merchant's guild which is seeking to establish connections with other sentient races. You suggest they invest research time into developing better translators and ask to see if they are selling anything at the moment.");
    openStoreHere(g);
  },
  // Lanius powered-down ship. Fights stay on default Lanius rewards: no PAGE_WINS row.
  // Power weapons: two results, no odds. INFERRED: equal.
  "c:lanius-powered-down-ship:1": (g) => {
    if (weighted(g, [["fight", 1], ["silent", 1]] as const) === "fight") {
      pageFight(g, "You power up your weapons, and in response, the Lanius ship does the same! Prepare for a fight.", "Lanius ship", "lanius-powered-down-ship");
      return;
    }
    card(g, "You power up your weapons, but don't get a response.", [
      { id: "q:lanius-dormant:investigate", label: "Investigate the vessel." },
      { id: "q:lanius-dormant:destroy", label: "Destroy and scrap it." },
    ]);
  },
  "c:lanius-powered-down-ship:2": (g) => investigateDormant(g),
  "q:lanius-dormant:investigate": (g) => investigateDormant(g),
  "q:lanius-dormant:destroy": (g) => {
    pageFight(g, "As soon as you lock your weapons onto their vessel, it awakens... they must have been in hibernation and were awoken by the danger!", "Lanius ship", "lanius-powered-down-ship");
  },
  "q:lanius-dormant:ignore": (g) => {
    result(g, "Nothing happens.");
  },
  // Navigate carefully. Two results, no odds. INFERRED: equal. Low scrap is scrap only.
  "q:lanius-dormant:navigate": (g) => {
    if (weighted(g, [["fight", 1], ["scrap", 1]] as const) === "fight") {
      pageFight(g, "As you drift toward the vessel, your piloting skill is unable to match your intent - the Lanius ship powers up, hungry for raw materials!", "Lanius ship", "lanius-powered-down-ship");
      return;
    }
    result(g, "You clumsily manage to strip some hull plating before being forced to retreat or risk collision.", scrapOnly(g, "low"));
  },
  // {{Blue Option|Lanius Crew}}. Medium resources with some scrap (Rewards, Stuff). The unnamed bonus item is not granted.
  "q:lanius-dormant:plunder": (g) => {
    if (!hasLanius(g)) return;
    result(g, "Your crewmember manages to salvage some resources without waking the hibernating crew.", rollSurrenderOffer(g, "medium", true));
  },
  // {{Blue Option|Advanced Piloting|level=2+}}. Medium scrap with resources.
  "q:lanius-dormant:autopilot": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    result(g, "The computer matches the rotation and speed of the target ship, and you take the opportunity to gather what residual scrap you can without awakening the Lanius crew. You get an excellent haul!", rollStandard(g, "medium"));
  },
  // Engi fleet discussion, "Message them and ask if you can help." -> "Nothing happens."
  "c:engi-fleet-discussion:0": (g) => {
    result(g, "Slightly shocked at your question, their leader quickly responds, \"Declined offer with apologetic gratitude. Topic of discussion private matter, no concern of Federation.\"");
  },
  // Engi fleet discussion. "Ignore it and move on." One printed result.
  "c:engi-fleet-discussion:1": (g) => {
    result(g, "You can't help but wonder what they were discussing as you prepare to jump.", undefined, ["Nothing happens."]);
  },
  // {{Blue Option|Engi Crew|Have your Engi crewmember contact them.}}
  "c:engi-fleet-discussion:2": (g) => {
    if (!hasEngi(g)) return;
    card(g, "Your crew member syncs with the comm unit to communicate with them directly. You offer your help and a summary of the ship's mission. They respond, \"Our goals have analogous elements. However, not all available for disclosure, discretion necessary.\"", [
      { id: "q:engi-fleet:offer", label: "Offer your help." },
    ]);
  },
  "q:engi-fleet:offer": (g) => {
    // "A quest marker is added to your map." ... "A second quest marker is added to your map." -> "Agree."
    const first = addQuest(g, "engi-real");
    const second = addQuest(g, "engi-fake");
    card(
      g,
      `"Secret technologies stolen by Mantis. Implicit connection to Rebels. Implicit. Tracked Mantis to hidden Rebel base, uploading coordinates."\n\n${first}\n\n"However, tracked second ship to different base. Would calculate probability but data insufficient. Cannot risk obvious Rebel-Engi conflict. Also, need time to acquire military ships. Assist in finding technology?"\n\n${second}`,
      [{ id: "ack", label: "Agree." }],
    );
  },
  // Rebel defector, "Reject his offer. You can never trust these Rebels." Three results.
  "c:rebel-defector:1": (g) => {
    const r = pick(g, ["cache", "boarder", "fight"] as const);
    if (r === "cache") {
      card(g, "He offers to lead you to a secret cache of scrap nearby if you let him join your crew.", [
        { id: "q:defector:reluctant", label: "Reluctantly accept his proposal and fight the Rebel ship." },
        { id: "q:defector:execute", label: "Reject him outright and execute him on the spot." },
        { id: "q:defector:again", label: "Reject his offer again." },
      ]);
    } else if (r === "boarder") {
      defectorFight(g, "Attempting to deal with attacks from inside and out is never easy!");
      humanBoarders(g, 1, 1);
    } else {
      defectorFight(g, "Your fearless crew easily overcome the intruder, but the Rebel ship still needs to be dealt with.");
    }
  },
  "q:defector:reluctant": (g) => {
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
      log(g, joined);
      defectorFight(g, "Relieved and light-headed, your new crew member gets to work as the Rebel ship attacks.");
      log(g, line);
    } else if (r === "deceive") {
      // "3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled". Doubling as cited-events.ts fx "double".
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "engines", 1);
      g.fleet *= 2;
      log(g, "Rebel Fleet pursuit is doubled.");
      defectorFight(g, "The dishonorable Rebel has deceived you. He damages your ship and steals ship information before teleporting away. The fleet will be able to track you with ease. If they can't kill you now, that is!");
    } else if (r === "trigger") {
      if (damageHull(g, 3)) return;
      hurtSystem(g.player, "pilot", 1);
      defectorFight(g, "Your new crew-member smiles, then reveals a small remote trigger in the palm of his hand. Explosions rocket around the ship as more intruders teleport aboard!");
      humanBoarders(g, 2, 2);
    } else {
      // "You lose a crewmember" (Clone Bay: "The lost crewmember is revived."). INFERRED: never the last crewmember.
      const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
      if (g.player.kits.cradle) log(g, "The eviscerated crewmember's clone launches out of the clone bay, eager to seek revenge.");
      else if (mine.length > 1) {
        const lost = pick(g, mine);
        g.crew = g.crew.filter((c) => c.id !== lost.id);
        log(g, `${lost.name} is gone.`);
      }
      defectorFight(g, "The Rebel makes to take his assigned station, then suddenly turns and eviscerates the nearest crew-member. Red Alert!");
      humanBoarders(g, 1, 1);
    }
  },
  "q:defector:execute": (g) => defectorFight(g, "You execute the defector and turn to the Rebel ship."),
  "q:defector:again": (g) => {
    defectorFight(g, "You reject his offer again.");
    humanBoarders(g, 1, 1);
  },

  // ---- Quest-beacon choices ----
  "q:open-store": (g) => {
    openStoreHere(g);
  },
  "q:escort:fight": (g) => pageFight(g, "The Rebel ship attacks.", "Rebel ship", "quest-escort"),

  "q:war-camp:leave": (g) => {
    if (rand(g) < 0.5) {
      pageFight(g, "As you try to leave, a patrol spots you. Wailing sirens begin to blare around the camp and the ship moves in to attack!", "Mantis ship", "quest-mantis-war-camp", { ...NEVER_RUN });
    } else {
      result(g, "They must have been focused on setting up camp since you got far enough away to attempt a jump without being noticed.");
    }
  },
  "q:war-camp:missile": (g) => {
    if (g.missiles < 1 || !hasMissileWeapon(g)) return;
    g.missiles -= 1;
    pageFight(g, "You fire at their fuel depot, but a shot from the surface rips the missile to shreds. They must have a planetary defense system set up already! You try to get away but a nearby patrol ship moves in to attack.", "Mantis ship", "quest-mantis-war-camp", { ...NEVER_RUN });
  },
  "q:war-camp:firebomb": (g) => {
    if (g.missiles < 2) return;
    g.missiles -= 2;
    const joined = crew(g, "Engi");
    result(
      g,
      "It appears they have not set up a Teleporter disruption field yet. You deposit one bomb in a fuel depot and another in the barracks. Mantis comm channels fill with panicked chatter and you watch a number of structures go up in flames.\n\nWith most of their ships and forces focused on the chaos, you slip undetected to a nearby depot. You find some useful resources and an Engi slave who gladly accepts your liberation.",
      rollSurrenderOffer(g, "high", true),
      [joined],
    );
  },

  "q:station:attack": (g) => {
    pageFight(g, "You move in to attack the Rebel ship that is threatening them and scanners detect weapon locks from a nearby Anti-Ship Battery. It's about to get hectic!", "Rebel ship", "quest-space-station-rebel", { ...NEVER_RUN });
    // "while a planet-side Anti-Ship Battery periodically fires on your ship."
    g.asb = true;
  },
  "q:station:leave": (g) => result(g, "You apologize but it's not worth the risk to attack a Rebel station."),
  "q:station:contact": (g) => {
    result(g, "Amidst the blasts from the Anti-Ship Battery, the cargo ship escaped from the station. They jettisoned some scrap towards your ship before jumping away.", scrapOnly(g, "medium"));
  },
  // Abandoned station, "Move in to examine the station." DuplicateEvent|2 on the scrap text, then one each of the
  // pirate ship, the battery with no ship, the cloning bay, and the empty shell. Race of the unnamed boarders is
  // INFERRED human (the pirate burst on this page already uses humanBoarders).
  "q:station:examine": (g) => {
    const r = weighted(g, [
      ["scrap", 2],
      ["pirate", 1],
      ["battery", 1],
      ["clone", 1],
      ["shell", 1],
    ] as ["scrap" | "pirate" | "battery" | "clone" | "shell", number][]);
    if (r === "scrap") {
      result(g, "You approach cautiously but you detect no danger. It appears to have been a small rest stop that was abandoned a while ago. You take what few supplies you can find.", scrapOnly(g, "low"));
    } else if (r === "pirate") {
      pageFight(g, "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile scanners pick up a previously undetected pirate ship moving in to attack!", "Pirate ship", "quest-abandoned-station");
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      log(g, "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile multiple warning signals go off on the bridge. The pirates have activated a remote planetary defense system and it's locking onto your ship!");
      humanBoarders(g, 2, 4, "boarders beam aboard.");
      beginBoarding(g, true);
    } else if (r === "clone") {
      const choices: Choice[] = [{ id: "q:station:scrapmachines", label: "Scrap the machinery." }];
      if (g.player.kits.cradle) choices.unshift({ id: "q:station:dna", label: "Search for a surviving DNA bank." });
      card(g, "The station is in disarray. You find a cloning bay partially intact but nothing else seems to be functioning.", choices);
    } else {
      result(g, "As you approach it becomes clear that the station is simply an empty shell. It has been stripped of useful materials long ago.");
    }
  },
  // Clonebay DNA: DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The crazed boarder's race is not named. INFERRED human, same as the unnamed boarders on this page.
  "q:station:dna": (g) => {
    const rebuilt = "While the cloning facilities are no longer functioning, you find someone was in queue to be cloned. You transfer their data to your Clonebay and after a time their body is rebuilt.";
    if (weighted(g, [["calm", 2], ["crazed", 1]] as ["calm" | "crazed", number][]) === "crazed") {
      log(g, `${rebuilt} The clone emerges in a crazed frenzy and refuses to calm down. You have no choice but to fight.`);
      humanBoarders(g, 1, 1, "boarder beams aboard.");
      beginBoarding(g);
      return;
    }
    result(g, `${rebuilt} The clone is extremely confused but calms down after you try to explain the situation. With no other options the clone offers to work on your ship for a time.`, undefined, [crew(g, randomRace(g))]);
  },
  "q:station:scrapmachines": (g) => result(g, "You take what you can and prepare to move on.", scrapOnly(g, "low")),
  "q:station:stay": (g) => result(g, "You decide it's not worth the time to examine."),
  "q:station:fuel4": (g) => {
    if (g.fuel < 4) return;
    g.fuel -= 4;
    result(g, "\"Great, thank you. Here's some scrap metal for your troubles. Be careful out there.\"", scrapOnly(g, "medium"));
  },
  "q:station:fuel1": (g) => {
    if (g.fuel < 1) return;
    g.fuel -= 1;
    result(g, "\"Well, I suppose that's better than nothing. Thank you. Hopefully we can find a station at the next Beacon.\"");
  },
  "q:station:none": (g) => result(g, "\"I see...\""),

  "q:mantis-collectors:follow": (g) => {
    result(g, "You input their coordinates into your map and prepare to follow.", undefined, [addQuest(g, "mantis-chase")]);
  },
  "q:mantis-collectors:forget": (g) => result(g, "They're not worth the trouble. You prepare to leave."),
  // DONOR_MANTIS_CHASE2: "attempts to escape at 60% hull (12 seconds timer)". INFERRED: a certain attempt, like CHASE1.
  // "Fight a Mantis Bomber" with crew entirely composed of Mantis.
  "q:mantis-chase:fight": (g) => {
    pageFight(g, "The Mantis Bomber moves in.", "Mantis Bomber", "quest-mantis-chase", hullRun(100, 60, 12));
    allMantisCrew(g);
  },

  "q:loyalists:contact": (g) => {
    const r = pick(g, ["base", "supplies", "rescue"] as const);
    if (r === "base") {
      result(g, "\"Thank you for saving us. This ship is transporting Federation civilians on the run from the rebellion and we don't have the equipment to fight for ourselves. I don't have much to offer, but I can inform you of a hidden Federation base nearby. Perhaps they can assist you more.\"", undefined, [addQuest(g, "fed-base")]);
    } else if (r === "supplies") {
      result(g, "\"Thanks, we didn't think there would be Rebel ships all the way out here. They seem to be searching for something. Take some extra supplies as thanks for your aid.\"", rollStandard(g, "medium"));
    } else loyalistsRescueCard(g);
  },
  "q:loyalists:rescue": (g) => {
    result(g, "Despite your efforts the majority do not survive. The sole survivor offers to join your crew and helps you strip the now derelict ship of useful components.", rollStandard(g, "low"), [crew(g, randomRace(g))]);
  },
  "q:loyalists:medbot": (g) => {
    // "a crewmember with 1 skill in shields, and high (3-6 fuel) fuel and scrap" (Rewards, "Fuel": T fuel & T scrap).
    const offer = scrapOnly(g, "high");
    offer.fuel = between(g, [3, 6]);
    result(g, "You drag the injured and dying crew on to your ship. The Med-bots help stabilize their condition, but most perish. The surviving shields operator offers to join your crew and helps you strip their broken ship of scrap.", offer, [crew(g, randomRace(g), "shields")]);
  },
  "q:loyalists:teleport": (g) => {
    const joined = crew(g, randomRace(g), "combat");
    result(g, "Your quick reactions allow you to stabilize a few of the seriously wounded crewmembers. An infantryman offers to join your crew and the rest tell you of a hidden Federation base a few jumps from here.", scrapOnly(g, "medium"), [joined, addQuest(g, "fed-base")]);
  },
  "q:fed-base:scan": (g) => {
    if (sensors(g) >= 3 || g.augments.includes("glass")) {
      // "You receive a weapon with medium scrap." The weapon is not named: only the medium scrap.
      result(g, "Your sensors pick faint signatures of what appears to be a storage space hidden under the rock. You find the access point and discover a weapons cache whose Federation signal emitter has malfunctioned.", scrapOnly(g, "medium"));
    } else {
      result(g, "Your Advanced Sensors pick faint signatures of what appears to be a storage space hidden under the rock. You find the access point and discover a supply cache whose Federation signal emitter has malfunctioned.", rollStandard(g, "medium"));
    }
  },
  "q:fed-base:assist": (g) => pageFight(g, "The automated drone turns on you.", "Auto-ship", "quest-fed-assist"),
  "q:fed-assist:contact": (g) => {
    if (rand(g) < 0.5) {
      // "You receive a crewmember and a weapon with low scrap." The weapon is not named.
      result(g, "With the threat gone, you contact the Federation outpost. They respond, \"Our location has been compromised! Take everything you can and please drop our survivors off at the next station.\" One soldier offers to stay and fight.", scrapOnly(g, "low"), [crew(g, randomRace(g))]);
    } else {
      result(g, "You contact the station once the Rebel ship is destroyed. The lone survivor responds, \"This base is no longer safe. Let me join your crew and I'll have the station's drones patch up your ship.\"", rollStandard(g, "high"), [crew(g, randomRace(g)), repair(g, 7)]);
    }
  },

  "q:thief:strip": (g) => {
    result(g, "It seems almost a waste for such a fierce foe to die in such an anticlimactic fashion. You shrug it off and take what you can.", rollStandard(g, "high"));
  },
  "q:thief:teleport": (g) => thiefDyingCard(g, false),
  "q:thief:scan": (g) => thiefDyingCard(g, true),
  "q:thief:mercy": (g) => {
    result(g, "Thus ends the life of the famed captain, KazaaakplethKilik... You wonder what secrets went with him to the grave as you thoroughly loot his ship.", rollStandard(g, "high"));
  },
  "q:thief:listen": (g) => {
    result(g, "In his dying moments he gives up the location of his secret stash. You strip the ship wondering what other secrets went with him to the grave.", rollStandard(g, "high"), [addQuest(g, "thief-stash")]);
  },
  "q:thief:save": (g) => {
    card(g, "Your haste has paid off and you are able to bring him back from the brink of death. When his senses return he says, \"I never thought I would see this day, but... I am willing to devote myself and my ships to your cause.\"", [
      { id: "q:thief:accept", label: "Accept." },
    ]);
  },
  "q:thief:clone": (g) => {
    card(g, "Your haste has paid off and you register him into the Clonebay's database. After he passes away he is quickly reconstructed on board your ship. When his senses return he says, \"I never thought I would see this day, but... I am willing to devote myself and my ships to your cause.\"", [
      { id: "q:thief:accept", label: "Accept." },
    ]);
  },
  "q:thief:accept": (g) => {
    // "receive high scrap, Mantis Pheromones augmentation, Mantis crewmember named Kazaaak maxed in all skills, and a
    // quest marker". The Mantis Cruiser unlock is the grantUnlock line below.
    grantUnlock(g, "mantis-a"); // @agent:unlocks. "You unlock the Mantis Cruiser".
    let joined = "There is no room aboard for Kazaaak.";
    if (joinCrew(g, "Mantis", "Kazaaak")) {
      const c = g.crew[g.crew.length - 1];
      const all: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];
      c.skills = Object.fromEntries(all.map((s) => [s, xpNeedFor(c, s) * 2]));
      joined = "Kazaaak joins your crew.";
    }
    result(g, "KazaaakplethKilik joins your crew, offers the coordinates for a nearby stash of stolen military goods and transmits the coordinates for a custom cruiser he has been working on. You forward it to the Federation, sure they can make good use of it.", scrapOnly(g, "high"), [joined, grantAug(g, "pheromone"), addQuest(g, "thief-stash")]);
  },

  "q:slug-trap:engage": (g) => {
    // INFERRED: the page prints no escape for this pirate.
    pageFight(g, "There's money to be made here. The Slugs know that. You turn on the pirate and intercept just before he can reach the cache!", "Pirate ship", "quest-slug-pirate-trap-engage", { ...NEVER_RUN });
  },
  "q:slug-trap:cache": (g) => {
    pageFight(g, "When he sees you making for the cache the Slug captain hails: \"Foolish alienss, no eye for profit. Bessst of luck to you.\" They jump off, leaving you toe to toe with the pirate!", "Pirate ship", "quest-slug-pirate-trap-cache", { ...NEVER_RUN });
  },

  // REBEL_ENGI_UNLOCK_2REAL / 2FAKE: "immediately starts to escape (40 seconds timer)".
  "q:engi-real:fight": (g) => {
    pageFight(g, "As soon as they see you they power up their engines to jump away. Stop them!", "Rebel ship", "quest-engi-real", startRun(40));
  },
  "q:engi-fake:fight": (g) => {
    pageFight(g, "As soon as they see you, they power up their engines to jump away.  Stop them!", "Rebel ship", "quest-engi-fake", startRun(40));
  },
  // Fake marker, after "Demand information": "Let them go." -> "The ship turns neutral." / "Ignore him and attack."
  "q:engi-fake:go": (g) => {
    closeFight(g);
    result(g, "The ship turns neutral and jumps away.");
  },
  "q:engi-fake:attack": (g) => {
    const plan = g.enemySurrender;
    if (plan) plan.refused = true;
    g.event = null;
    g.phase = g.enemy ? "combat" : "map";
    g.paused = false;
    log(g, "\"No, wait...\" You cut the transmission and continue the assault.");
  },
  // MANTIS_ENGI_UNLOCK_3: "Fight the Mantis Ship controlled by Humans", {{SurrenderEscape(alt)|no|...}}.
  "q:engi-final:fight": (g) => {
    pageFight(g, "The Mantis escort turns to meet you.", "Mantis ship", "quest-engi-final", { ...NEVER_RUN });
    const hp = kinOf("plain").hp;
    for (const c of g.crew) {
      if (c.side !== "enemy") continue;
      c.kin = "plain";
      c.hp = hp;
      c.maxHp = hp;
    }
  },
  "q:engi-victory:ask": (g) => {
    card(g, "\"Likely ploy by Rebels to avoid breaking non-aggression pact with Engi. 97.56 percent likely. Your mission to assist last Federation fleet, correct? Coordinates?\"", [
      { id: "q:engi-victory:transmit", label: "Transmit coordinates of Federation command." },
    ]);
  },
  "q:engi-victory:transmit": (g) => {
    // "You unlock the Stealth Cruiser; you receive Titanium System Casing augmentation, high scrap with resources and your
    // ship receives 20 repairs." The unlock is the grantUnlock line below.
    grantUnlock(g, "stealth-a"); // @agent:unlocks. "You unlock the Stealth Cruiser".
    result(g, "\"Satisfactory. Delivery of tech will assist in Federation cause. Gratitude alone insufficient. Commencing ship repair and compensation.\" Their crews deliver a weapon for installation but you're more pleased to hear that the Federation will have an improved arsenal.", rollStandard(g, "high"), [grantAug(g, "casing"), repair(g, 20)]);
  },

  // "this ship is always a Slug Assault class" / the interceptor: "It is always a Slug Interceptor class" (enemy-gen classId).
  "q:slug-platform:charge": (g) => {
    pageFight(g, "You charge the assault ship guarding the platform.", "Slug Assault", "quest-slug-platform", { ...NEVER_RUN });
  },
  "q:slug-platform:tail": (g) => {
    const choices: Choice[] = [
      { id: "q:slug-platform:slow", label: "Fly slowly toward their last known position." },
      { id: "q:slug-platform:wait", label: "Wait and hope the escort leaves." },
    ];
    // {{Blue Option|Slug Crew|...}}, {{Blue Option|Improved Sensors|...|level=2+}}.
    if (hasSlug(g)) choices.push({ id: "q:slug-platform:slug", label: "Have your crewmember monitor their life signatures." });
    if (sensors(g) >= 2) choices.push({ id: "q:slug-platform:sensors", label: "Try to maintain a lock on their ships from a distance." });
    card(g, "You slip into the nebula undetected but at this rate you are likely to get lost and lose track of them.", choices);
  },
  "q:slug-platform:slow": (g) => {
    pageFight(g, "You are advancing slowly when suddenly the assault ship bursts through the clouds. They must have been able to detect you with their telepathy!", "Slug Assault", "quest-slug-platform", { ...NEVER_RUN });
  },
  "q:slug-platform:wait": (g) => {
    result(g, "You wait for a time before attempting to advance toward the platform. However, after some frantic searching you can't tell if they left or you simply miscalculated your trajectory... You give up the search and prepare to leave.");
  },
  "q:slug-platform:slug": (g) => {
    card(g, "You try to stay just far enough away that they won't detect your life signatures without actively searching for you. After a time, your Slug tells you the ship with a larger crew has jumped away. He guides the helm toward the platform...\n\nThe only ship left near the cruiser is an interceptor. This should be easy!", [
      { id: "q:slug-platform:interceptor", label: "Fight the interceptor." },
    ]);
  },
  "q:slug-platform:sensors": (g) => {
    card(g, "You overclock your sensors, trying to get them to function in the clouds. They work just enough to let you keep tabs on their general position. After a time, the assault ship and most of the escort jumps away from the platform. You take the opportunity and move in to attack.\n\nThe only ship left near the cruiser is an interceptor. This should be easy!", [
      { id: "q:slug-platform:interceptor", label: "Fight the interceptor." },
    ]);
  },
  // "This ship starts to escape with 35 seconds countdown timer."
  "q:slug-platform:interceptor": (g) => {
    pageFight(g, "The interceptor powers up its FTL drive in preparation to escape. At the same time, the cruiser's FTL drive does the same. They must be linked! Don't let them get away!", "Slug Interceptor", "quest-slug-interceptor", startRun(35));
  },

  "q:store-rescue:engage": (g) => {
    pageFight(g, "You engage the Rebel scout.", "Rebel ship", "quest-store-rescue", { ...NEVER_RUN });
  },
  "q:store-rescue:avoid": (g) => {
    result(g, "After a time the ship powers down its weapons and jumps away. No life-signs are detected on the moon.");
  },

  // Slug Home Nebula surrender, "Let them live." -> "We don't want the weapon, we want information." (the `extra` answer).
  "s:slug-home-nebula-surrender:info": (g) => {
    if (!g.enemy) return;
    // Score, k: "k = ships defeated by reducing hull or crew to zero. Defeating the flagship does NOT increase the count
    // (none of the 3 phases)." Letting them live and taking information does not reduce hull or crew to zero.
    closeFight(g);
    result(g, "You ask where they were delivering the weapon. \"By telling you we will probably die jussst as like as not... Oh well.\" They give you the coordinates of the a prototype cruiser's mobile construction platform.", undefined, [addQuest(g, "slug-platform")]);
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
  log(g, "After the exchange is complete they leave without a word.");
  log(g, `Scrap: ${scrap}.`);
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
  if (id === "c:engi-fleet-discussion:2" && !hasEngi(g)) return "Needs an Engi crewmember";
  // Lanius ship in rich debris field. Improved Piloting is level 2. Advanced Piloting is level 3.
  if (id === "c:lanius-ship-in-rich-debris-field:3" && (g.player.systems.pilot?.level ?? 0) < 2) return "Needs level 2 Piloting";
  if (id === "c:lanius-ship-in-rich-debris-field:4" && (g.player.systems.pilot?.level ?? 0) < 3) return "Needs level 3 Piloting";
  // Lanius ship salvager, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-ship-salvager:2" && !hasLanius(g)) return "Needs a Lanius crewmember";
  // Lanius trader, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-trader:4" && !hasLanius(g)) return "Needs a Lanius crewmember";
  // Lanius lone ship, {{Blue Option|Lanius Crew}}. A dead Lanius does not count.
  if (id === "c:lanius-lone-ship:3" && !hasLanius(g)) return "Needs a Lanius crewmember";
  // Lanius powered-down ship. Advanced Piloting prints level=2+. A dead Lanius does not count.
  if (id === "q:lanius-dormant:plunder" && !hasLanius(g)) return "Needs a Lanius crewmember";
  if (id === "q:lanius-dormant:autopilot" && (g.player.systems.pilot?.level ?? 0) < 2) return "Needs level 2 Piloting";
  // Lanius trader with translator. Purchase the translator for 40 scrap.
  if (id === "q:lanius-translator:buy" && g.scrap < 40) return "Need 40 scrap";
  // Auto-ship near sensor station. Sensors level 3. A Crew Teleporter.
  if (id === "c:auto-ship-near-sensor-station:2" && sensors(g) < 3) return "Needs level 3 Sensors";
  if (id === "c:auto-ship-near-sensor-station:3" && !hasTeleporter(g)) return "Needs a Teleporter";
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  if (id === "c:auto-ship-fight-in-plasma-storm:1") {
    const level = g.player.systems.engines?.level ?? 0;
    if (level < 3 || level > 5) return "Needs Engines level 3-5";
  }
  if (id === "c:auto-ship-fight-in-plasma-storm:2" && (g.player.systems.engines?.level ?? 0) < 6) return "Needs level 6 Engines";
  if (id === "c:auto-ship-fight-in-plasma-storm:3" && (g.player.kits.veil?.level ?? 0) <= 0) return "Needs Cloaking";
  // Deactivated Auto-ship. Sensors level 3. The button stays visible.
  if (id === "c:deactivated-auto-ship:2" && sensors(g) < 3) return "Needs level 3 Sensors";
  // Rock ship in plasma storm. A dead Rock does not count. The button stays visible.
  if (id === "c:rock-ship-in-plasma-storm:2" && !hasRock(g)) return "Needs a Rock crewmember";
  // Slug drink. A dead Rock does not count. The button stays visible.
  if (id === "c:slug-drink:2" && !hasRock(g)) return "Needs a Rock crewmember";
  // Slug hacker (choice). {{Blue Option|Hacking System|Counter any hack attempt.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-choice:4" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  // Slug hacker (oxygen). {{Blue Option|Improved Oxygen|...|level=2+|shortreq=Oxygen}}.
  // INFERRED: the refusal line. The page names level 2+ and does not print this sentence.
  if (id === "c:slug-hacker-oxygen:1" && (g.player.systems.oxygen?.level ?? 0) < 2) return "Needs level 2 Oxygen";
  // Slug hacker (oxygen). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-oxygen:2" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  // Slug hacker (medical). {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:slug-hacker-medical:1" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  // Legendary thief KazaaakplethKilik. {{Blue Option|Mantis crewmember|Attempt to hail him.|shortreq=Mantis Crew}}.
  // INFERRED: the refusal line. A dead Mantis does not count. The page names the crew and does not print this sentence.
  if (id === "c:legendary-thief-kazaaakplethkilik:1" && !hasMantis(g)) return "Needs a Mantis crewmember";
  // Mantis ship with Rock body parts. {{Blue Option|Rock Crew|Put your Rock crewmember on the comm.}}.
  // INFERRED: the refusal line. A dead Rock does not count. The page names the crew and does not print this sentence.
  if (id === "c:mantis-ship-with-rock-body-parts:2" && !hasRock(g)) return "Needs a Rock crewmember";
  // Mantis ship with Rock body parts. {{Blue Option|Rock Ship|Ram the bastards.|shortreq=Rock Plating}}.
  // INFERRED: the refusal line. The page names Rock Plating and does not print this sentence.
  if (id === "c:mantis-ship-with-rock-body-parts:3" && !g.augments.includes("keel")) return "Needs Rock Plating";
  // Pirate engine hacker. {{Blue Option|Hacking System|Counter the remote hacking.|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:pirate-engine-hacker:1" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  // Escort civilians FTL haywire. Advanced FTL Navigation. The button stays visible.
  if (id === "c:escort-civilians-ftl-haywire:2" && !g.augments.includes("nav")) return "Needs Adv. FTL Navigation";
  // Zoltan security checkpoint. A dead Slug does not count. Mind Control is the installed system.
  if (id === "c:zoltan-security-checkpoint:2" && !hasSlug(g)) return "Needs a Slug crewmember";
  if (id === "c:zoltan-security-checkpoint:3" && (g.player.kits.leash?.level ?? 0) <= 0) return "Needs Mind Control";
  // Pirate ship attacking civilian distress. Improved Weapons is level 6+. The button stays visible.
  if (id === "c:pirate-ship-attacking-civilian-distress:2" && (g.player.systems.weapons?.level ?? 0) < 6) return "Needs level 6 Weapons";
  // Pirate smuggler. Improved Weapons is level 6+. The button stays visible.
  if (id === "c:pirate-smuggler:2" && (g.player.systems.weapons?.level ?? 0) < 6) return "Needs level 6 Weapons";
  // Rock atheists. Improved Sensors is level 2+. The button stays visible.
  if (id === "c:rock-atheists:2" && (g.player.systems.sensors?.level ?? 0) < 2) return "Needs level 2 Sensors";
  // Pirate ship selling drones. A dead Slug does not count. Hacking and Drone Control must already be installed.
  if (id === "q:pirate-drones:slug" && !hasSlug(g)) return "Needs a Slug crewmember";
  if (id === "q:pirate-drones:hack" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  if (id === "q:pirate-drones:upgrade" && (g.player.kits.swarm?.level ?? 0) <= 0) return "Needs Drone Control";
  // Rebel checkpoint. The bribe amount is the one shown on the button.
  const checkpoint = /^q:rebel-checkpoint:bribe:(\d+)$/.exec(id);
  if (checkpoint && g.scrap < Number(checkpoint[1])) return `Need ${checkpoint[1]} scrap`;
  // Engi distress Rebel fight. 25 scrap, or 40 scrap plus 2 missiles and 2 fuel.
  if (id === "q:engi-distress:scrap" && g.scrap < 25) return "Need 25 scrap";
  if (id === "q:engi-distress:supplies" && g.scrap < 40) return "Need 40 scrap";
  if (id === "q:engi-distress:supplies" && g.missiles < 2) return "Need 2 missiles";
  if (id === "q:engi-distress:supplies" && g.fuel < 2) return "Need 2 fuel";
  // Rebel fight choice in nebula. Cloaking, and Engines level 4+ on the caught follow-up.
  if (id === "c:rebel-fight-choice-in-nebula:2" && (g.player.kits.veil?.level ?? 0) <= 0) return "Needs Cloaking";
  if (id === "q:rebel-nebula:engines" && (g.player.systems.engines?.level ?? 0) < 4) return "Needs level 4 Engines";
  // Mantis fight choice. Cloaking, any installed level.
  if (id === "c:mantis-fight-choice:2" && (g.player.kits.veil?.level ?? 0) <= 0) return "Needs Cloaking";
  // Auto-ship near storage station. Cloaking, any installed level.
  if (id === "c:auto-ship-near-storage-station:2" && (g.player.kits.veil?.level ?? 0) <= 0) return "Needs Cloaking";
  // Auto-ship near storage station in nebula. Improved Cloaking is level 2+. Hacking spends 1 drone part.
  if (id === "c:auto-ship-near-storage-station-in-nebula:2" && (g.player.kits.veil?.level ?? 0) <= 0) return "Needs Cloaking";
  if (id === "c:auto-ship-near-storage-station-in-nebula:3" && (g.player.kits.veil?.level ?? 0) < 2) return "Needs level 2 Cloaking";
  if (id === "c:auto-ship-near-storage-station-in-nebula:4" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  if (id === "c:auto-ship-near-storage-station-in-nebula:4" && g.player.parts < 1) return "Need 1 drone part";
  if (id === "c:auto-ship-near-storage-station-in-nebula:5" && (g.player.kits.spike?.level ?? 0) < 2) return "Needs level 2 Hacking";
  if (id === "c:auto-ship-near-storage-station-in-nebula:5" && g.player.parts < 1) return "Need 1 drone part";
  // Auto-ship near radar station. Combat Drone is one of the four named schematics. Hacking spends 1 drone part.
  if (id === "c:auto-ship-near-radar-station:2" && !hasRadarCombat(g)) return "Needs a Combat Drone";
  if (id === "c:auto-ship-near-radar-station:2" && g.player.parts < 1) return "Need 1 drone part";
  if (id === "q:auto-radar:drone" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  if (id === "q:auto-radar:drone" && g.player.parts < 1) return "Need 1 drone part";
  const trader = LANIUS_TRADER_TAKE.exec(id);
  if (trader) {
    const res = trader[1];
    const cost = Number(trader[2]);
    const have = res === "fuel" ? g.fuel : res === "missiles" ? g.missiles : g.player.parts;
    if (have < cost) return `Need ${cost} ${res === "parts" ? "drone parts" : res}`;
  }
  // The Black Raven, {{Blue Option|Slugman Crew}}. A dead Slug does not count.
  if (id === "s:the-black-raven:duel" && !hasSlug(g)) return "Needs a Slug crewmember";
  if (id === "q:war-camp:missile" && g.missiles < 1) return "Need 1 missiles";
  if (id === "q:war-camp:firebomb" && g.missiles < 2) return "Need 2 missiles";
  if (id === "q:station:fuel4" && g.fuel < 4) return "Need 4 fuel";
  if (id === "q:station:fuel1" && g.fuel < 1) return "Need 1 fuel";
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
    // A short card so the marker line is seen; "ack" goes back to the map (the beacon is already resolved).
    g.event = { title: here(g)?.name ?? "Event", body: line, choices: ACK };
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
  for (const line of got) log(g, line);
  return got;
}

/** The grateful Slug captain. Three results and no odds. INFERRED: equal. */
export function slugCaptainGrateful(g: Game, lead: string, extras: string[] = []) {
  const kind = weighted(g, [["free", 1], ["price", 1], ["thanks", 1]] as const);
  if (kind === "free") {
    const note = eventReactor(g);
    result(g, `${lead} The Slug Captain offers a free reactor upgrade for your help. It never hurts to get a little power boost!`, undefined, [...extras, note].filter(Boolean));
    return;
  }
  if (kind === "price") {
    const n = between(g, [10, 15]);
    const tail = extras.length ? ` ${extras.join(" ")}` : "";
    card(g, `${lead} The Slug Captain, thankful for your help, offers a reactor upgrade for your ship... for a 'fair' price.${tail}`, [
      { id: `s:rock-slug:upgrade:${n}`, label: `Agree to the price. [${n} scrap]` },
      { id: "s:rock-slug:decline", label: "Decline the offer." },
    ]);
    return;
  }
  result(g, `${lead} The Slugs offer their thanks for your help, and jump away. Their true appreciation is questionable, but at least you can get back to your mission.`, undefined, [...extras, "Nothing happens."]);
}

/** Transaction 10-15 subtract_scrap. The amount is the one shown on the choice. */
export function rockSlugPay(g: Game, kind: "debt" | "upgrade", n: number): boolean {
  if (!Number.isInteger(n) || n < 10 || n > 15 || g.scrap < n) return true;
  g.scrap -= n;
  log(g, `Scrap: -${n}.`);
  if (kind === "debt") {
    slugCaptainGrateful(g, "You pay off the debt. The Rock Captain still seems annoyed at the Slug's getting their 'undeserved' scrap, but at least the situation will remain peaceful.", [`Scrap: -${n}.`]);
    return true;
  }
  const note = eventReactor(g);
  result(g, "You let their team on board and after a short time they finish their work.", undefined, [`Scrap: -${n}.`, note].filter(Boolean));
  return true;
}

/** Lanius ship attacking civilian, and the distress page, print the same two endings. */
function laniusCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? "No more life signs detected on the Lanius ship. You hasten to contact the civilian ship."
    : "The Lanius craft breaks apart. You hasten to contact the civilian ship.";
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [{ id: "q:lanius-civilian:contact", label: "Contact the civilian ship." }]);
}

const SCOUT_INSPECT: Choice[] = [{ id: "q:lanius-scout:inspect", label: "Inspect the automated ship." }];

/** Lanius ship absorbing automated scout. Destroyed pays medium standard. A crew kill pays high. Then inspect. */
function laniusScoutWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? "No more life signs detected on the Lanius ship. You move to inspect the automated Rebel ship that it was absorbing."
    : "The Lanius craft breaks apart. You move to inspect the automated Rebel ship that it was absorbing.";
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], SCOUT_INSPECT);
}

const STORAGE_INVESTIGATE: Choice[] = [{ id: "q:auto-storage:investigate", label: "Investigate the station." }];

/** Auto-ship near storage station, and the nebula page. Destroyed pays medium scrap only. No crew-kill reward. */
function autoStorageWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(g, "You salvage what you can from the broken ship.", scrapOnly(g, "medium"), [], STORAGE_INVESTIGATE);
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
  { id: "q:auto-radar:hack", label: "Attempt to manually hack into the station." },
  { id: "q:auto-radar:leave", label: "Don't risk it. Leave the station." },
  { id: "q:auto-radar:drone", label: "Use a drone to hack into the station." },
];

/** Destroyed pays medium scrap only. The page prints no crew-kill reward. */
function autoRadarWin(g: Game, deadCrew: boolean) {
  if (deadCrew) return false;
  result(g, "You salvage what you can and approach the station. It is used to relay information to the Rebel Fleet. You could attempt to hack it to give the Rebels false information.", scrapOnly(g, "medium"), [], RADAR_AFTER);
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
    text = "You successfully hack into their system and transmit false information about your location. That should hold off the fleet for at least a little while.";
    extras.push("The Rebel Fleet is delayed for 1 turn.");
  } else if (kind === "map") {
    text = "The firewalls prove too difficult to bypass. As you are about to disconnect, you stumble across unprotected information about the surrounding beacons. Your map is updated.";
  } else if (kind === "pursuit") {
    g.pursuitDouble = true;
    text = "As you attempt to hack in, you set off a hidden alarm system. It seems that now the Rebels must surely be aware of your position! You hasten back to the ship to jump away.";
    extras.push("Rebel Fleet pursuit is doubled for 1 jump.");
  } else {
    text = "You are unable to penetrate the computer's defenses. You give up and return to the ship.";
    extras.push("Nothing happens.");
  }
  result(g, lead ? `${lead} ${text}` : text, undefined, extras);
}

/** Pirate briber. Continue is not printed. INVENTED label. The five victim results have no odds. INFERRED: equal. */
const PIRATE_GONE: Choice[] = [{ id: "q:pirate-briber:gone", label: "Continue." }];

/** Destroyed pays a random scrap-only amount. INFERRED: low, medium, and high are equal.
 *  A crew kill pays medium standard. Then the victim. */
function pirateBriberWin(g: Game, deadCrew: boolean) {
  if (deadCrew) {
    result(g, "The pirates are all dead, leaving the ship dead in space. You scrounge what you can from their ship before contacting its former prey.", rollStandard(g, "medium"), [], PIRATE_GONE);
    return;
  }
  result(g, "The pirate explodes, leaving behind a substantial collection of useful scrap material. You go to examine the ship you just saved.", scrapOnly(g, pick(g, ["low", "medium", "high"])), [], PIRATE_GONE);
}

/**
 * Template:Pirate Smuggler / Rebel Transport. The weapon, drone schematic, and crewmember are not named,
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

const SMUGGLE_HULL: [{ text: string; pay: SmugglePay }, number][] = [
  [{ text: "You search the ship and discover that its cargo was new military-grade weaponry! It was somehow undamaged in the fight and can easily be mounted on the ship.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "The ship was transporting weaponry. You find a piece still intact, despite the battle.", pay: { k: "random" } }, 1],
  [{ text: "Searching the remains, you find that the cargo was military-grade Drone Schematics! You bring them aboard to install in your ship.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "You detect faint life signatures from an intact piece of the hull. They were transporting prisoners, and the sole survivor offers to join your crew, as a first step on his path to get revenge.", pay: { k: "standard", tier: "low" } }, 1],
  [{ text: "This ship's cargo was not salvageable. However, they seem to have been surveying the region; they possess detailed maps and data. You download what you can to the ship's map.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "The ship was carrying military supplies. You pick up anything that looks salvageable from the debris.", pay: { k: "standard", tier: "high" } }, 1],
  [{ text: "The debris implies that the ship was carrying Drone Schematics, but unfortunately nothing remains. You do find functioning Drone Parts, however.", pay: { k: "parts" } }, 1],
  [{ text: "The ship was apparently transporting weaponry; however, nothing seems to have survived the battle.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "From the bits and pieces you find, you decide that this ship was gathering information. Nothing seems useful.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "The ship appears to have been transporting prisoners. Unfortunately they were all killed in the battle. You salvage what you can.", pay: { k: "standard", tier: "low" } }, 1],
  [{ text: "You search the remains of the ship, but only come across blueprints and debris from broken machinery. A shame, but you take what scrap you can salvage.", pay: { k: "standard", tier: "low" } }, 1],
];

const SMUGGLE_CREW: [{ text: string; pay: SmugglePay }, number][] = [
  [{ text: "With the crew dead, you search the ship. You find military-grade weaponry and take what looks most useful.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "Searching the remains you find that the cargo was military-grade Drone Schematics! You bring them aboard to install on your ship.", pay: { k: "scrap", tier: "medium" } }, 1],
  [{ text: "The ship refuses to fight, but you still detect life signatures. Apparently this was a prisoner transport. The single survivor offers to join your crew in exchange for their freedom.", pay: { k: "scrap", tier: "high" } }, 1],
  [{ text: "This ship was apparently carrying information about the surrounding beacons. You download what you can to the ship's map, and scrap the rest of the ship.", pay: { k: "scrap", tier: "medium" } }, 1],
];

/** Pirate smuggler. Template:Pirate Smuggler / Rebel Transport, destroyed and a crew kill. */
function smuggleCargoWin(g: Game, deadCrew: boolean) {
  const row = weighted(g, deadCrew ? SMUGGLE_CREW : SMUGGLE_HULL);
  result(g, row.text, smugglePay(g, row.pay));
}

const CRYSTAL_CONTACT: Choice[] = [{ id: "q:crystal-pirate:contact", label: "Contact the Crystal ship." }];

/**
 * Template:Crystal Ship Saved. {{DuplicateEvent|2}} on the reward and on nothing. The printed OR is the two
 * sentences. INFERRED: each sentence is one copy. The Crystal weapon is not named, so none is granted.
 * A random amount of resources is rollStandard with no tier.
 */
const CRYSTAL_SAVED: [string, "stuff" | "nothing" | "weapon"][] = [
  ["You contact the other ship, \"Thank you for your assistance. It's glad to know that not all of you foreigners are so barbaric. Take this as a reward.\"", "stuff"],
  ["The Crystalline ship hails you, \"It's a good thing you came when you did. We appreciate the assistance. Please take this for your help.\"", "stuff"],
  ["You contact the Crystalline ship to hear, \"It seems you have brought war to our doorstep. I hope you're not too surprised that we don't welcome you with open arms. I should kill you myself...\" They cut communications.", "nothing"],
  ["The Crystalline ship messages you, \"You're the one that opened our sector to the outside, aren't you! Bastards, my home was just overrun by your 'Rebels'. Just leave us in peace!\" They quickly jump away.", "nothing"],
  ["The Crystalline ship messages you, \"Thank you. We were not prepared for the savagery with which you aliens battle. We will give you one of our weapons if you intend on assisting our kind in the future.\"", "weapon"],
];

function crystalContact(g: Game) {
  const [text, kind] = pick(g, CRYSTAL_SAVED);
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
 * Rock atheists. {{DuplicateEvent|2}} on the refusal. The Rockman joins once.
 * INFERRED: the refusal is twice as likely as the join.
 */
function rockAtheistPromise(g: Game) {
  const join = weighted(g, [[false, 2], [true, 1]] as [boolean, number][]);
  if (!join) {
    result(g, "They seem tempted by your offer, but decide they can't risk being lied to again. They close frequencies and jump away.", undefined, ["Nothing happens."]);
    return;
  }
  rockAtheistJoins(g, "Your promises gain their attention and they agree to serve with you, for a while.");
}

/** The page names a Rockman and prints no skill. */
function rockAtheistJoins(g: Game, text: string) {
  const joined = joinCrew(g, "Rock");
  result(g, text, undefined, [joined ? "A Rockman crewmember joins you." : "There is no room aboard for the new crewmember."]);
}

/** Pirate ship selling drones. The unnamed schematic is not offered. Five parts for 25 scrap stay on the static choice. */
function pirateDroneDock(g: Game) {
  card(g, `A human in an exquisite suit meets you on board. "Welcome to my ship! We specialize in drones of all kinds, can I interest you in any?"`, [
    { id: "c:pirate-ship-selling-drones:0", label: "Buy some Drone parts. [25 scrap]" },
    { id: "q:pirate-drones:nothing", label: "Buy nothing." },
    { id: "q:pirate-drones:upgrade", label: "Buy Drone Control system upgrade." },
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
function salesmanRoom(g: Game, room: { fire: number; breach: number; title: string; system?: string }): string {
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
    `"Ah, I'm sorry to hear that! Pleasant journeys." Once back to the helm, a series of explosions rocks your ship. The pirate ship has powered its weapons! You receive a message, "You shouldn't waste people's time Captain!"`,
    "Pirate ship",
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
  log(g, `Scrap: -${cost}.`);
  result(g, `Drone Control at level ${level}.`, undefined, [`Scrap: -${cost}.`]);
}

const REBEL_CHECKPOINT_BRIBE = [
  "These Rebels are easily swayed by the prospect of additional scrap. They release the civilian ships and everyone is free to go.",
  "Like most Rebels, these are just men trying to get by in a rough galaxy. They take your scrap and let everyone continue their journeys.",
  "As everyone currently awaiting inspection is human anyway, the Rebels let them go. They take your scrap and tell you to hurry along.",
  "They eagerly accept your bribe, obviously revolutionaries are under paid. The civilian ships all begin to jump away.",
];

/** Rebel checkpoint. Transaction 10-15. The four texts have no odds. INFERRED: equal. Then the civilians. */
function rebelCheckpointBribe(g: Game, n: number) {
  if (!Number.isInteger(n) || n < 10 || n > 15 || g.scrap < n) return;
  g.scrap -= n;
  log(g, `Scrap: -${n}.`);
  const text = pick(g, REBEL_CHECKPOINT_BRIBE);
  card(g, `${text}\n\nScrap: -${n}.`, [{ id: "q:rebel-checkpoint:contact", label: "Contact the civilian ships." }]);
}

/** Contact the civilian ships. Four results and no odds. INFERRED: equal. */
function rebelCheckpointContact(g: Game) {
  const kind = pick(g, ["fight", "standard", "scrap", "nothing"] as const);
  if (kind === "fight") {
    pageFight(
      g,
      "One of the civilian ships contacts you and reveals they are Federation loyalists. An eavesdropping Rebel swoops in, destroys the ship, and turns to attack you!",
      "Rebel ship",
      "rebel-checkpoint",
    );
    return;
  }
  if (kind === "standard") {
    result(g, "One of the civilian ships quietly teleports over a crate of Federation military supplies.", rollStandard(g, "low"));
    return;
  }
  if (kind === "scrap") {
    result(g, "Some of the civilians pool together their excess scrap to try to repay you for your help.", scrapOnly(g, "low"));
    return;
  }
  result(g, "The civilians are grateful. However, none of them seem eager to be mistaken as Federation loyalists so they quickly jump away.", undefined, ["Nothing happens."]);
}

/** Pirate ship attacking Crystal. Destroyed pays medium standard. A crew kill pays high. Then the Crystal ship. */
function crystalPirateWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? "With the crew dead you take as much salvage from the ship as possible."
    : "The ship explodes and you scrap what you can.";
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], CRYSTAL_CONTACT);
}

const MANTIS_SLUG_AFTER: Choice[] = [
  { id: "q:mantis-slug:leave", label: "Leave them be." },
  { id: "q:mantis-slug:finish", label: "Finish them off." },
];

/** Mantis ship attacking Slug ship. Both endings pay medium standard, then the Slug vessel. */
function mantisSlugSaved(g: Game) {
  result(
    g,
    "The Mantis defeated, you contact the weakened Slug vessel. \"You ssseee,\" they begin, \"we are are most grateful, but, that is, we do not currently have the liquid asssets to reward you at this time.\"",
    rollStandard(g, "medium"),
    [],
    MANTIS_SLUG_AFTER,
  );
}

/** Finish them off. Two results, no odds. INFERRED: equal. The augmentation is not named, so none is granted.
 *  The loot is a random standard reward. INFERRED: low, medium, and high are equal. */
function mantisSlugFinish(g: Game) {
  if (pick(g, ["augment", "loot"] as const) === "augment") {
    result(
      g,
      "The Slug captain hails you: \"A misstake! A sssimple misstake. Of course we can pay you! Ssseee? An augmentation has already transported.\" You allow them to leave with their lives.",
      scrapOnly(g, "low"),
    );
    return;
  }
  result(
    g,
    "It doesn't look like they can stand much more damage. After a few shots their ship breaks apart and you move in to loot the remains.",
    rollStandard(g, pick(g, ["low", "medium", "high"])),
  );
}

/** Zoltan security checkpoint. Medium fuel is 2-4. */
function zoltanCheckpointFuel(g: Game, text: string) {
  const n = between(g, [2, 4]);
  g.fuel += n;
  log(g, `Fuel: ${n}.`);
  result(g, text, undefined, [`Fuel: ${n}.`]);
}

/** The pirate is gone. Five results, no odds. INFERRED: equal. */
function pirateGone(g: Game) {
  const kind = pick(g, ["store", "repair", "rebel", "scrap", "nothing"] as const);
  if (kind === "store") {
    log(g, "Thank you for the aid! I'm an arms dealer that usually only works with rebels, but considering the circumstances I'll make an exception.");
    openStoreHere(g);
    return;
  }
  if (kind === "repair") {
    result(g, "Thank the heavens you showed up! We don't have much to offer as a reward, but our engineer should be proficient enough to patch your ship up a bit after that nasty fight.", undefined, [repair(g, 15)]);
    return;
  }
  if (kind === "rebel") {
    card(g, "Upon closer inspection, you realize the ship under attack was a Rebel scout! It's too damaged to put up much of a fight.", [
      { id: "q:pirate-briber:salvage", label: "Destroy the ship and salvage it." },
      { id: "q:pirate-briber:delay", label: "Use the leverage you gained by saving their lives to convince them to delay the pursuing fleet." },
    ]);
    return;
  }
  if (kind === "scrap") {
    result(g, "You were too late. A hull breach deprived the crew of oxygen during your fight with the pirate. You salvage what you can.", scrapOnly(g, "medium"));
    return;
  }
  result(g, "The pirate's victim quickly jumps away before you have a chance to speak to them.", undefined, ["Nothing happens."]);
}

/** Pirate ship attacking civilian, and the Lanius variant. Destroyed is medium standard.
 *  A crew kill is high. Then Contact the civilian ship. */
function pirateCivilianWin(g: Game, deadCrew: boolean) {
  const text = deadCrew
    ? "No more life signs detected on the pirate ship. You hasten to contact the civilian ship."
    : "The pirate ship breaks apart. You hasten to contact the civilian ship.";
  result(g, text, rollStandard(g, deadCrew ? "high" : "medium"), [], [
    { id: "q:lanius-civilian:contact", label: "Contact the civilian ship." },
  ]);
}

/**
 * Event pages that print their own {{Winning|destroyed=true}} / {{Winning|deadCrew=true}} reward, keyed by the slug
 * startCombat received. A page with "(default rewards)" is not listed; winCombat pays the default then.
 */
export const PAGE_WINS: Record<string, Win> = {
  // ---- Ship surrender Events pages (cited-events-surrender.ts) ----
  // Settlement mercenary work: "destroyed/deadCrew ... You receive low scrap with resources."
  "settlement-mercenary-work": std("low", "low", "With all of the would-be pirates dead, you think it best not to return to the settlement... You prepare to jump."),
  // The Black Raven: destroyed -> medium, deadCrew -> high scrap with resources.
  "the-black-raven": std("medium", "high", "\"The Black Raven\" breaks apart and you salvage the remains.", "The once-dreaded pirate Nights has been killed and you proceed to loot his ship."),
  // Zoltan ship asks to dock: destroyed -> low, deadCrew -> medium scrap with resources.
  "zoltan-ship-asks-to-dock": std("low", "medium", "While you search the debris, you wonder what it was that could have provoked them to act so irrationally.", "While you scrap their ship, you wonder what it was that could have provoked them to act so irrationally."),
  // ---- Other cited pages with a quest branch ----
  // Mantis ship-collectors: destroyed -> medium, deadCrew -> high scrap with resources.
  "mantis-ship-collectors": std("medium", "high", "Their ship breaks apart and you move in to scrap the remains.", "With no more crew on board you are free to salvage what you can from the remains."),
  // Rebel ship attacking Federation loyalists: "medium scrap with resources" -> "Contact the Federation ship".
  "rebel-ship-attacking-federation-loyalists": std("medium", "medium", "With the ship destroyed, you quickly collect useful resources.", "With the crew of the Rebel ship dead, you salvage what you can.", [
    { id: "q:loyalists:contact", label: "Contact the Federation ship." },
  ]),
  // Slug ship boarding Rock ship: both endings pay medium scrap, then the freighter.
  // The nothing result is printed twice. The two sentences are alternatives. INFERRED: equal.
  "slug-ship-boarding-rock-ship": (g, deadCrew) => {
    const text = deadCrew
      ? "With the Slugs no longer a threat, you strip the ship and return to the Rockmen."
      : "With the Slug ship destroyed, you retrieve some scrap and return to the Rock ship.";
    const extras: string[] = [];
    if (weighted(g, [["nothing", 2], ["abandoned", 1]] as const) === "abandoned") {
      const more = rollStandard(g, "medium");
      payOffer(g, more, true);
      extras.push("It appears the Rock ship was long since abandoned. You strip what you can from it.");
      if (more.scrap) extras.push(`Scrap: ${more.scrap}.`);
      if (more.fuel) extras.push(`Fuel: ${more.fuel}.`);
      if (more.missiles) extras.push(`Missiles: ${more.missiles}.`);
      if (more.parts) extras.push(`Drone parts: ${more.parts}.`);
      for (const line of extras.slice(1)) log(g, line);
    } else {
      const line = weighted(g, [["left", 1], ["thanks", 1]] as const) === "left"
        ? "It appears that the Rock ship left during your battle. You doubt they could have been more ungrateful for your assistance."
        : "After the battle the Rock ship hails you. Their captain simply says, \"Thanks.\" and jumps away. That's pretty gracious of them, considering the Rockmen's reputation.";
      extras.push(line, "Nothing happens.");
    }
    result(g, text, rollStandard(g, "medium"), extras);
  },
  // Mantis ships battle for Rock freighter. Both endings pay medium standard. Default salvage is not paid.
  "mantis-ships-battle-for-rock-freighter": (g) => {
    result(g, "In the time it took you to eliminate the Mantis ship the Rock must have repaired their FTL drive and jumped away. You pick the bones of both Mantis vessels.", rollStandard(g, "medium"));
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
    result(g, "You access the recent scans from the unguarded station. Your map has been updated with details of the surrounding area.", scrapOnly(g, "low"));
  },
  // Auto-ship fight in nebula. The page prints medium scrap with resources on a destroyed ship and no crew-kill reward.
  "auto-ship-fight-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, "The ship explodes, leaving behind a substantial collection of useful scrap material.", rollStandard(g, "medium"));
  },
  // Auto-ship warning. {{Winning|destroyed=true}}: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit stay in wiki/escape.ts.
  "auto-ship-warning": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, "The ship breaks apart and you feel relief in the knowledge that you will hopefully still be one step ahead of the fleet.", rollStandard(g, "low"));
  },
  // Auto-ship warning in nebula. Same destroyed line: "You receive low scrap with resources."
  // The page prints no crew-kill reward. The 40 second run and doubled pursuit stay in wiki/escape.ts.
  "auto-ship-warning-in-nebula": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, "The ship breaks apart and you feel relief in the knowledge that you will hopefully still be one step ahead of the fleet.", rollStandard(g, "low"));
  },
  // Auto-ship attacking civilian. Destroyed pays low standard, then Contact the civilian ship.
  // Template:Save the Civilian Ship is the same card as the Lanius civilian contact.
  // The page prints no crew-kill reward. Stay out of it is the nothing choice.
  "auto-ship-attacking-civilian": (g, deadCrew) => {
    if (deadCrew) return false;
    result(g, "The ship breaks apart. You hasten to contact the civilian ship.", rollStandard(g, "low"), [], [
      { id: "q:lanius-civilian:contact", label: "Contact the civilian ship." },
    ]);
  },
  // Mantis ship attacking civilian. Destroyed and a crew kill both pay medium standard,
  // then Attempt to contact the civilian ship. Template:Save the Civilian Ship is the
  // same card as the Lanius civilian contact. Stay out of it is three sentences in CHOICES.
  "mantis-ship-attacking-civilian": (g, deadCrew) => {
    const text = deadCrew
      ? "No more life signs detected on the pirate ship. You hasten to contact the civilian ship."
      : "The Mantis ship breaks apart.";
    result(g, text, rollStandard(g, "medium"), [], [
      { id: "q:lanius-civilian:contact", label: "Attempt to contact the civilian ship." },
    ]);
  },
  // Pirate ship attacking civilian, and the Lanius variant. Destroyed pays medium standard.
  // A crew kill pays high. Then Contact the civilian ship. Template:Save the Civilian Ship
  // is the same card. Stay out / Avoid the conflict are the nothing choices.
  "pirate-ship-attacking-civilian": pirateCivilianWin,
  // Pirate briber. Destroyed pays random scrap only. A crew kill pays medium standard. Then the victim.
  "pirate-briber": pirateBriberWin,
  // Pirate smuggler. Template:Pirate Smuggler / Rebel Transport. Unnamed weapon, schematic, and crew are not granted.
  "pirate-smuggler": smuggleCargoWin,
  // Rebel transport ship. The same template. The 40 second run and the refusal to surrender stay in escape.ts and surrender.ts.
  "rebel-transport-ship": smuggleCargoWin,
  // Pirate ship attacking Crystal. Destroyed pays medium standard. A crew kill pays high. Then Crystal Ship Saved.
  "pirate-ship-attacking-crystal": crystalPirateWin,
  // Engi distress Rebel fight. Destroyed pays low standard. A crew kill pays medium. Then the Engi.
  "engi-distress-rebel-fight": engiDistressWin,
  // Rebel fight among Rebel fleet. The page prints low scrap only on a hull kill and medium scrap with resources on a crew kill.
  // The two endings are separate printed results. Default salvage is not paid.
  "rebel-fight-among-rebel-fleet": (g, deadCrew) => {
    if (deadCrew) {
      result(
        g,
        "There isn't time to salvage the enemy ship but your crew made off with a few nearby materials. Prepare to jump.",
        rollStandard(g, "medium"),
      );
      return;
    }
    result(g, "There's no time to salvage all of the wreck, the fleet is still nearby. Get ready to jump!", scrapOnly(g, "low"));
  },
  // Rebel fight among Federation and Rebel fleets. This page prints low scrap only on a hull kill and medium scrap with resources on a crew kill.
  // The two endings are separate printed results. Default salvage is not paid.
  "rebel-fight-among-federation-and-rebel-fleets": (g, deadCrew) => {
    if (deadCrew) {
      result(
        g,
        "There isn't time to salvage the enemy ship but your crew made off with a few nearby materials. Prepare to jump.",
        rollStandard(g, "medium"),
      );
      return;
    }
    result(g, "There's no time to salvage all of the wreck, the fleet is still nearby. Get ready to jump!", scrapOnly(g, "low"));
  },
  // Pirate ships in plasma storm. Destroyed: low fuel (1-3) and low scrap. Crew kill: high fuel (3-6) and high scrap.
  // Rewards, "Fuel": T fuel and T scrap. The ion-storm sentence is the page's text. No storm duration is printed.
  "pirate-ships-in-plasma-storm": (g, deadCrew) => {
    const text = deadCrew
      ? "With the ship in one piece, you are able to salvage most of the fuel supplies before the ion storm clears and you have to jump away."
      : "The ship obliterated, only scant fuel canisters can be scavenged from the wreckage before the ion storm clears and you have to jump away.";
    result(g, text, cargoAndScrap(g, deadCrew ? "high" : "low", "fuel"));
  },
  // Destroyed: low missiles (1-2) and low scrap. Crew kill: high missiles (4-8) and high scrap.
  "pirate-ships-in-plasma-storm-ammo": (g, deadCrew) => {
    const text = deadCrew
      ? "With the ship in one piece, you are able to salvage most of the ammunition before the ion storm clears and you have to jump away."
      : "The ship obliterated, only scant ammunition crates can be scavenged from the wreckage before the ion storm clears and you have to jump away.";
    result(g, text, cargoAndScrap(g, deadCrew ? "high" : "low", "missiles"));
  },
  // Mantis ship attacking Slug ship. Saving the Slugs pays medium either way. Killing them pays high either way.
  "mantis-ship-attacking-slug-ship": (g) => {
    mantisSlugSaved(g);
  },
  "mantis-ship-attacking-slug-ship-slug": (g) => {
    result(g, "At last the Slugs' prized possessions are yours for the taking. After, that is, you split your takings with the Mantis.", rollStandard(g, "high"));
  },
  // Zoltan security checkpoint, the scan fight. Destroyed pays low standard. A crew kill pays medium. The attack stays default.
  "zoltan-security-checkpoint-scan": (g, deadCrew) => {
    result(g, "You scrap what you can and prepare to jump before the other guards arrive.", rollStandard(g, deadCrew ? "medium" : "low"));
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
      "The outpost hails you after the scout was destroyed, \"Thanks for the help. We've been harassed non-stop by those scouts. Take this on the house.\"",
    ];
    if (more.scrap) extras.push(`Scrap: ${more.scrap}.`);
    if (more.fuel) extras.push(`Fuel: ${more.fuel}.`);
    if (more.missiles) extras.push(`Missiles: ${more.missiles}.`);
    if (more.parts) extras.push(`Drone parts: ${more.parts}.`);
    result(g, "The ship breaks apart and you quickly salvage what you can.", rollStandard(g, "low"), extras);
  },
  // Lanius ship attacking civilian. Destroyed pays medium standard. A crew kill pays high. Then the civilians.
  // Lanius ship attacking civilian distress prints the same two endings and the same contact.
  "lanius-ship-attacking-civilian": laniusCivilianWin,
  "lanius-ship-attacking-civilian-distress": laniusCivilianWin,
  // Lanius ship attacking Rock. Both endings pay medium standard, then "Contact the Rockmen."
  "lanius-ship-attacking-rock": (g, deadCrew) => {
    const text = deadCrew
      ? "There are no more life-signs remaining on the ship. You strip it of useful materials."
      : "The ship explodes, leaving behind a collection of useful scrap material.";
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-rock:contact", label: "Contact the Rockmen." }]);
  },
  // Lanius ship attacking Mantis. Both endings pay medium standard, then "Contact the Mantis."
  "lanius-ship-attacking-mantis": (g, deadCrew) => {
    const text = deadCrew
      ? "There are no more life-signs remaining on the ship. You strip it of useful materials."
      : "The ship explodes, leaving behind a collection of useful scrap material.";
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-mantis:contact", label: "Contact the Mantis." }]);
  },
  // Lanius ship attacking Slug. Both endings pay medium standard, then "Contact the Slugs."
  "lanius-ship-attacking-slug": (g, deadCrew) => {
    const text = deadCrew
      ? "There are no more life-signs remaining on the ship. You strip it of useful materials."
      : "The ship explodes, leaving behind a collection of useful scrap material.";
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-slug:contact", label: "Contact the Slugs." }]);
  },
  // Lanius ship in rich debris field. Both fights pay medium standard, then "Investigate the debris."
  "lanius-ship-in-rich-debris-field": (g, deadCrew) => {
    const text = deadCrew
      ? "There are no more life-signs remaining on the ship. You strip it of useful materials."
      : "The ship explodes, leaving behind a collection of useful scrap material.";
    result(g, text, rollStandard(g, "medium"), [], [{ id: "q:lanius-debris:investigate", label: "Investigate the debris." }]);
  },
  // Engi smashed ships. Both endings explain the consolidation, then nothing. Default salvage is not paid.
  "engi-smashed-ships": (g, deadCrew) => {
    const hail = deadCrew
      ? "With the ship disabled, the remaining Engi hails you frantically and explains the situation to you."
      : "With the ship destroyed, the remaining Engi hails you frantically and explains the situation to you.";
    result(g, `${hail} Apparently, you interrupted the equivalent of a "consolidation" of two ships that were using each other's parts to construct a new vessel. The Engi were not truly hostile, their targeting computers had not finished adjusting. There's nothing to be done about it now. You leave the remains for the surviving ship.`, undefined, ["Nothing happens."]);
  },
  // Rock and Slug standoff. Destroyed pays low standard. A crew kill pays medium. Then the Slug captain.
  "rock-and-slug-standoff": (g, deadCrew) => {
    const text = deadCrew
      ? "With the Rock crew dead, you scrap the ship for supplies."
      : "With the Rock Ship destroyed, you take the time to collect what little scrap remains.";
    slugCaptainGrateful(g, text, offerLines(g, rollStandard(g, deadCrew ? "medium" : "low")));
  },
  // Legendary thief KazaaakplethKilik: destroyed -> medium; deadCrew opens the strip / survivors card.
  "legendary-thief-kazaaakplethkilik": (g, deadCrew) => {
    if (!deadCrew) {
      result(g, "KazaaakplethKilik fights to the last, and you pick the scraps from the corpse of his ship. You sense, though, that his death has left a great mystery unresolved.", rollStandard(g, "medium"));
      return;
    }
    const choices: Choice[] = [{ id: "q:thief:strip", label: "Move in to strip their ship." }];
    // {{Blue Option|Teleporter|...}}, {{Blue Option|Sensors|...|level=3}}.
    if (hasTeleporter(g)) choices.push({ id: "q:thief:teleport", label: "Quickly teleport additional crew and check for survivors." });
    if (sensors(g) >= 3) choices.push({ id: "q:thief:scan", label: "Quickly scan their ship for survivors." });
    card(g, "No more life signs are detected aboard their ship.  You appear to have won.", choices);
  },
  // ---- Quest-marker fights ----
  "quest-mantis-war-camp": std("medium", "high", "With the patrol ship destroyed you hasten to leave. It won't be long before the other ships catch up.", "With the patrol ship taken care of you hasten to leave. It won't be long before the other ships catch up."),
  // Space station under construction: destroyed -> medium, deadCrew -> high; then "Contact the cargo ship." -> medium scrap.
  "quest-space-station-rebel": std("medium", "high", "You quickly salvage what you can from the ship.", "You quickly salvage what you can from the ship.", [
    { id: "q:station:contact", label: "Contact the cargo ship." },
  ]),
  // Mantis ship-collectors marker: "a weapon and medium" / "a weapon and high scrap with resources". The weapon is not named.
  "quest-mantis-chase": std("medium", "high", "Their ship breaks apart and you salvage the two ships.", "You find an intact weapon on their now empty ship. You take as much scrap from the ships as possible."),
  // Slug comm tapping marker: Engage -> medium / high; Head for the cache -> low / medium (scrap with resources).
  "quest-slug-pirate-trap-engage": std("medium", "high", "With the pirate defeated you scan the debris for anything useful. The Slug ship is long gone, spoils from the cache in hand."),
  "quest-slug-pirate-trap-cache": std("low", "medium", "With the pirate taken care of, you search again for the cache he was protecting, but it's lost in the clouds. You console yourself with the salvage from the well-armed pirate ship.", "With the pirate defeated, you search again for the cache he was protecting, but it's lost in the clouds. You console yourself with the salvage from the well-armed pirate ship."),
  // Engi fleet discussion, real marker: deadCrew -> "high scrap with resources and a final quest marker". The page prints
  // no destroyed result. INFERRED: a destroyed ship pays the default reward and the trail is lost.
  "quest-engi-real": (g, deadCrew) => {
    if (!deadCrew) return false;
    result(g, "Once their crew is dead you scan the log for information regarding the envoy. You're in luck! It seems ships matching the thieves' description passed through here not too long ago. You strip the ship and prepare to pursue them.", rollStandard(g, "high"), [addQuest(g, "engi-final")]);
  },
  // Fake marker: destroyed / deadCrew -> medium scrap with resources.
  "quest-engi-fake": std("medium", "medium", "You take what you can from the debris.", "A quick search of their communication logs shows that the tech you were searching for never passed through this base... It must have been a decoy! You strip what you can and prepare to jump."),
  // Final marker: destroyed -> Victory; deadCrew -> medium scrap with resources, then Victory.
  "quest-engi-final": (g, deadCrew) => {
    if (deadCrew) engiVictory(g, "You strip what you can and contact the Engi ships.", rollStandard(g, "medium"));
    else engiVictory(g);
  },
  // Slug Home Nebula marker: the platform guard -> high scrap with resources.
  "quest-slug-platform": std("high", "high", "With the assault ship taken care of, you turn your attention to the construction platform. However, you find that it has long since disappeared into the clouds. You scrap what you can and prepare to move on."),
  // The interceptor: "receive high scrap with resources and Slug Repair Gel augmentation". The Slug Cruiser unlock is the grantUnlock line.
  "quest-slug-interceptor": (g) => {
    grantUnlock(g, "slug-a"); // @agent:unlocks. Slug Home Nebula surrender: "You unlock the Slug Cruiser".
    result(g, "With the escort destroyed you take a look at your impressive prize. Your mission is too pressing to take a test flight. Before you rig the ship's computer to guide the it back to the main Federation hangar you discover a unique augment that duplicates the Slug's ability to heal breaches!", rollStandard(g, "high"), [grantAug(g, "gel")]);
  },
  // Settlement mercenary work marker: "medium scrap, your ship receives 5 repairs and a store opens."
  "quest-store-rescue": (g) => {
    result(g, "The outpost hails you, \"Thank you! I don't know what we did to anger the Rebels, but they were ready to kill us. I'll show you our goods and patch up your hull.\"", scrapOnly(g, "medium"), [repair(g, 5)], STORE_CHOICES);
  },
  // Federation Base Assist (Auto-ship): "low scrap with resources", then one of two follow-ups.
  "quest-fed-assist": std("low", "low", "You scrap the wreckage.", "You scrap the wreckage.", [{ id: "q:fed-assist:contact", label: "Contact the Federation outpost." }]),
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
    card(g, "The pirate has abandoned pursuit of both you and its former prey. You attempt to hail the damaged ship.", PIRATE_GONE);
  },
  // Lanius ship absorbing automated scout. Escape pays no fight scrap. Then inspect.
  "lanius-ship-absorbing-automated-scout": (g) => {
    card(g, "The Lanius ship has escaped. You move to inspect the automated Rebel ship that it was absorbing.", SCOUT_INSPECT);
  },
  // Mantis ship-collectors: "After them!" -> quest marker / "Forget it." -> nothing.
  "mantis-ship-collectors": (g) => {
    card(g, "The ship made an emergency FTL jump, but it looks like they didn't mask their signatures. You could easily follow them if you want.", [
      { id: "q:mantis-collectors:follow", label: "After them!" },
      { id: "q:mantis-collectors:forget", label: "Forget it." },
    ]);
  },
  "quest-mantis-chase": (g) => result(g, "Looks like they got away. At least you're able to scrap their abandoned fighter.", rollStandard(g, "high")),
  // "Nothing happens. [unlock quest is failed]"
  "quest-engi-real": (g) => result(g, "With the ship gone, you search through the abandoned base for any signs of their destination but find none."),
  "quest-engi-fake": (g) => result(g, "With the ship gone you search through the abandoned base for any signs of their destination but find none."),
  "quest-slug-interceptor": (g) => result(g, "The interceptor jumps away with the cruiser linked to its FTL signatures. You were so close..."),
};

/** sim.ts step, right after an enemy escapes. Opens the page's "gotaway" card; the beacon is spent either way. */
export function pageGotAway(g: Game, slug: string | null | undefined) {
  const run = slug ? (GOT_AWAY[slug] ?? fromParts("gotAway", slug)) : undefined;
  if (!run) return;
  const b = here(g);
  if (b) b.resolved = true;
  run(g);
}
