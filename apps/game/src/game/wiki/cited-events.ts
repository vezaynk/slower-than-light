import { tx } from "../../i18n/index.ts";
import type { Beacon, Difficulty, Game, GameEvent } from "../types.ts";
import { mediumScrapBand } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { allEvents, eventDef } from "@stl/pack";
import { CITED_EVENT_ROWS } from "./event-catalog.ts";
import { missingCard, missingChoose, missingDisabled, missingOwns } from "./cited-missing.ts";
// @agent:beacon-mix. Per-sector beacon composition from the Sectors page.
import { mixBeacons } from "./beacon-mix.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
// Rock fight with boarders. Called only from citedChoose, after ctx.fight (surrender.ts imports sim.ts).
import { allMantisCrew, between, closeFight, crystalBoarders, humanBoarders, joinCrew, mantisBoarders, pageCard, plasmaHumanBoarders, rockBoarders, slugBoarders, zoltanBoarders } from "./surrender.ts";
import { addQuest, result } from "./quests.ts";
import { grantRandomItem } from "./bonus-item.ts";

/** Pirate engine hacker: "Fight the Pirate ship with your Engines limited to level 1." */
export function citedEngineCap(id: string): number | null {
  if (id === "c:pirate-engine-hacker:0") return 1;
  // Slug repair station: "Engines limited to level 1."
  if (id === "c:slug-repair-engines:fight") return 1;
  return null;
}

/** Auto-ship carrying shield virus: "Fight an Auto-ship with your Shields halved" and "rounds down against you". */
export function citedShieldHalf(id: string): boolean {
  return id === "c:auto-ship-carrying-shield-virus:0";
}

/**
 * Slug hacker (choice): "Shields halved", "Oxygen system halved", or "Weapon Control halved".
 * The Engi virus: "Engines and Shields systems halved".
 * Each tooltip says "rounds down against you".
 */
/**
 * Slug hacker (doors): "Fight a Slug ship with your Door System offline."
 * Slug hacker (oxygen): "Fight a Slug ship with your Oxygen system offline."
 * Slug hacker (medical): "Medbay / Clone Bay offline."
 */
export function citedSystemOff(id: string): Array<"doors" | "oxygen" | "medbay"> | null {
  if (id === "c:slug-hacker-doors:0") return ["doors"];
  if (id === "c:slug-hacker-oxygen:0") return ["oxygen"];
  if (id === "c:slug-hacker-medical:0") return ["medbay"];
  return null;
}

/** Lanius fight with friendly ASB support: "Anti-Ship Battery on your side." */
export function citedFriendlyAsb(id: string): boolean {
  return id === "c:lanius-fight-with-friendly-asb-support:0";
}

export function citedSystemHalf(id: string): Array<"shields" | "oxygen" | "weapons" | "engines"> | null {
  if (id === "c:slug-hacker-choice:0") return ["shields"];
  if (id === "c:slug-hacker-choice:1") return ["oxygen"];
  if (id === "c:slug-hacker-choice:2") return ["weapons"];
  // The Engi virus: "Engines and Shields systems halved" and "rounds down against you".
  if (id === "c:the-engi-virus:0") return ["engines", "shields"];
  // Slug repair station: "Weapon Control halved" and "rounds down against you".
  if (id === "c:slug-repair-half:fight") return ["weapons"];
  return null;
}

/**
 * Event pages whose opening choice states a number, a scrap tier, or a fight.
 * Engi cache stays in sim.ts. A page that only says "a random amount" is absent.
 * Blue options, crew, map reveals, and upgrades are not granted. An unnamed weapon, augmentation or
 * drone schematic is a random one (Rewards; the "item" fx, or grantRandomItem in a handler).
 * Template:Scrap rewards low and high columns are the WIKI-SPEC section 14 table.
 * Medium uses mediumScrapBand.
 */

type ResId = "scrap" | "fuel" | "missiles" | "parts";

type Fx =
  | { k: "res"; id: ResId; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  /** Rewards, "Weapon" / "Augment" / "Drone": a random one the page does not name (bonus-item.ts grantRandomItem). */
  | { k: "item"; item: "weapon" | "augment" | "drone" }
  | { k: "quest"; id: string }
  | { k: "goto"; id: string }
  | { k: "close" }
  | { k: "nothing" };

type ChoiceDef = { id: string; label: string; fx: Fx[] };

type EventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: ChoiceDef[];
};

/** Template:Scrap rewards, Low column, sectors 1–8. Easy, Normal, Hard. */
const SCRAP_LOW: Record<Difficulty, [number, number][]> = {
  easy: [[10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39], [31, 44]],
  normal: [[7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39]],
  hard: [[7, 10], [7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35]],
};

/** Template:Scrap rewards, High column, sectors 1–8. Easy, Normal, Hard. */
const SCRAP_HIGH: Record<Difficulty, [number, number][]> = {
  easy: [[27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88], [81, 97]],
  normal: [[19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88]],
  hard: [[19, 23], [19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79]],
};

const RES_WORD: Record<ResId, string> = {
  scrap: "scrap",
  fuel: "fuel",
  missiles: "missiles",
  parts: "drone parts",
};

/** Authored page order. Beacon placement and choice payment read the loaded pack instead. */
const EVENTS: EventDef[] = CITED_EVENT_ROWS;

/** Pack order. An appended page sits at the end until the stamp hash reorders a sector. */
function loadedEvents(): EventDef[] {
  return allEvents().map((ev) => ({
    dest: ev.dest,
    slug: ev.id,
    flag: ev.flag,
    aliases: ev.aliases,
    sectors: ev.sectors,
    body: ev.body,
    choices: ev.choices,
  }));
}

function band(g: Game, tier: "low" | "medium" | "high"): [number, number] {
  if (tier === "medium") return mediumScrapBand(g.difficulty, g.sector);
  const table = tier === "low" ? SCRAP_LOW : SCRAP_HIGH;
  const row = table[g.difficulty] ?? table.normal;
  return row[Math.min(7, Math.max(0, g.sector - 1))];
}

function stock(g: Game, id: ResId): number {
  if (id === "scrap") return g.scrap;
  if (id === "fuel") return g.fuel;
  if (id === "missiles") return g.missiles;
  return g.player.parts;
}

function spend(g: Game, id: ResId, n: number) {
  if (id === "scrap") g.scrap -= n;
  else if (id === "fuel") g.fuel -= n;
  else if (id === "missiles") g.missiles -= n;
  else g.player.parts -= n;
}

function findChoice(id: string): ChoiceDef | null {
  for (const ev of loadedEvents()) {
    for (const c of ev.choices) if (c.id === id) return c;
  }
  return null;
}

type TradeRes = "fuel" | "missiles" | "parts";

// Trade resources. The page prints six intros and four offers, and no odds.
// INFERRED: each intro is equally likely, and each of the four offers is equally likely.
const TRADE_RESOURCE_INTROS = [
  tx("wiki.cited-events.you-arrive-at-a-quiet-spaceport"),
  tx("wiki.cited-events.you-jump-into-a-sector-filled"),
  tx("wiki.cited-events.your-ship-is-flooded-with-advertisement"),
  tx("wiki.cited-events.despite-the-barren-area-a-trader"),
  tx("wiki.cited-events.the-beacon-at-first-glance-seems"),
  tx("wiki.cited-events.a-pawn-broker-has-set-up"),
];

const TRADE_RESOURCE_OFFERS: { pay: TradeRes; cost: [number, number]; get: TradeRes; gain: [number, number] }[] = [
  { pay: "parts", cost: [1, 2], get: "fuel", gain: [5, 10] },
  { pay: "fuel", cost: [1, 2], get: "missiles", gain: [4, 5] },
  { pay: "missiles", cost: [2, 3], get: "parts", gain: [2, 3] },
  { pay: "missiles", cost: [2, 4], get: "fuel", gain: [4, 10] },
];

const TRADE_RESOURCES_TAKE = /^c:trade-resources:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

// Trade resources in nebula. One intro and the same four offers, and no odds.
// INFERRED: each offer is equally likely. The numbers are rolled once and stay on Trade.
const TRADE_RESOURCES_NEBULA_INTRO =
  tx("wiki.cited-events.it-s-hard-to-see-why");

const TRADE_RESOURCES_NEBULA_TAKE =
  /^c:trade-resources-in-nebula:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

function tradeTake(id: string): RegExpExecArray | null {
  return TRADE_RESOURCES_TAKE.exec(id) ?? TRADE_RESOURCES_NEBULA_TAKE.exec(id);
}

function tradeNote(id: TradeRes, n: number): string {
  const word = id === "fuel" ? tx("wiki.cited-events.fuel") : id === "missiles" ? tx("wiki.cited-events.missiles") : tx("wiki.cited-events.drone-parts");
  return `${word}: ${n}.`;
}

function tradeResourcesEvent(g: Game, title: string): GameEvent {
  const intro = TRADE_RESOURCE_INTROS[between(g, [0, 5])]!;
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = tx("wiki.cited-events.you-lose-and-receive", { cost: cost, v: RES_WORD[offer.pay], gain: gain, v2: RES_WORD[offer.get] });
  return {
    title,
    body: `${intro} ${sentence}`,
    choices: [
      { id: `c:trade-resources:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: tx("wiki.cited-events.trade") },
      { id: "c:trade-resources:4", label: tx("wiki.cited-events.ignore") },
    ],
  };
}

function tradeResourcesNebulaEvent(g: Game, title: string): GameEvent {
  const offer = TRADE_RESOURCE_OFFERS[between(g, [0, 3])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = tx("wiki.cited-events.you-lose-and-receive", { cost: cost, v: RES_WORD[offer.pay], gain: gain, v2: RES_WORD[offer.get] });
  return {
    title,
    body: `${TRADE_RESOURCES_NEBULA_INTRO} ${sentence}`,
    choices: [
      { id: `c:trade-resources-in-nebula:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: tx("wiki.cited-events.trade") },
      { id: "c:trade-resources-in-nebula:4", label: tx("wiki.cited-events.ignore") },
    ],
  };
}

/** True when this id is one of the wired choices, including a price the ship cannot pay. */
export function citedOwns(id: string): boolean {
  return (
    findChoice(id) != null ||
    tradeTake(id) != null ||
    id.startsWith("c:slug-moons-question:") ||
    id.startsWith("c:zoltan-odd-moon:") ||
    missingOwns(id)
  );
}

// @agent:beacon-mix. Read-only view for beacon-mix.test.ts: the cited pages that name a sector.
export function citedPagesFor(sectorName: string): readonly Readonly<EventDef>[] {
  return EVENTS.filter((ev) => ev.sectors.includes(sectorName));
}

function matchEvent(b: Beacon): EventDef | null {
  for (const ev of loadedEvents()) {
    if (b.flag === ev.flag || b.flag === ev.slug) return ev;
    if (b.name === ev.dest || ev.aliases.includes(b.name)) return ev;
  }
  return null;
}

const PLACE_KIND = ["event", "empty", "distress", "nebula", "cache", "hostile"] as const;

/** One beacon per cited page, only in a sector the page names. Does not touch a beacon that already has a flag. */
/** Seeded order for one sector's events (FNV-1a over seed, sector and flag); keeps g.seed's rolls untouched. */
function stampKey(g: Game, flag: string): number {
  let h = 2166136261 ^ g.seed ^ (g.sector * 0x9e3779b1);
  for (let i = 0; i < flag.length; i++) h = Math.imul(h ^ flag.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function stampCitedEvents(g: Game) {
  // Placed in a per-run seeded order rather than table order: in table order the free beacons ran out
  // before most of each sector's list (e.g. 11 of 56 Civilian Sector events), so later events never appeared.
  const mine = loadedEvents().filter((ev) => ev.sectors.includes(g.sectorName));
  mine.sort((a, b) => stampKey(g, a.flag) - stampKey(g, b.flag));
  // @agent:beacon-mix. Sectors, "Beacons:" lists: the free beacons are re-dealt by the sector's counts and
  // this seeded order fills hostile/neutral/distress/items slots (wiki/beacon-mix.ts). The loop below only
  // runs for a sector name the page does not list.
  if (mixBeacons(g, mine)) {
    markRuwenEntry(g);
    return;
  }
  for (const ev of mine) {
    if (g.beacons.some((b) => b.flag === ev.flag)) continue;
    const pool = g.beacons.filter(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && b.kind !== "store" && !b.flag,
    );
    let spot: Beacon | undefined;
    for (const kind of PLACE_KIND) {
      spot = pool.find((b) => b.kind === kind);
      if (spot) break;
    }
    if (!spot) continue;
    spot.flag = ev.flag;
    spot.kind = "event";
    spot.asteroid = false;
    spot.name = ev.dest;
  }
  markRuwenEntry(g);
}

export type LaniusTraderRes = "fuel" | "missiles" | "parts";
export type LaniusTraderOffer = { res: LaniusTraderRes; cost: number; scrap: number };

// Lanius trader. One offer is shown before the choice. Three resources, no odds. INFERRED: equal.
// Base scrap is 15-30 fuel, 20-40 missiles, 20-40 drone parts. A Lanius asks again for 20-35, 25-50, and 25-50.
const LANIUS_TRADER_BASE: Record<LaniusTraderRes, [number, number]> = {
  fuel: [15, 30],
  missiles: [20, 40],
  parts: [20, 40],
};
const LANIUS_TRADER_BETTER: Record<LaniusTraderRes, [number, number]> = {
  fuel: [20, 35],
  missiles: [25, 50],
  parts: [25, 50],
};

export function rollLaniusTrader(g: Game, better: boolean): LaniusTraderOffer {
  const kinds: LaniusTraderRes[] = ["fuel", "missiles", "parts"];
  const res = kinds[between(g, [0, 2])]!;
  const [lo, hi] = (better ? LANIUS_TRADER_BETTER : LANIUS_TRADER_BASE)[res];
  return { res, cost: between(g, [3, 7]), scrap: between(g, [lo, hi]) };
}

export function laniusTraderOfferText(offer: LaniusTraderOffer): string {
  const word = offer.res === "parts" ? "drone parts" : offer.res;
  return tx("wiki.cited-events.you-lose-and-receive-scrap", { cost: offer.cost, word: word, scrap: offer.scrap });
}

// Lanius trader. The page prints three intros and no odds. INFERRED: equal.
const LANIUS_TRADER_INTROS = [
  tx("wiki.cited-events.aided-by-a-modified-translator-a"),
  tx("wiki.cited-events.a-small-lanius-craft-approaches-you"),
  tx("wiki.cited-events.you-arrive-to-find-a-large"),
];

export function laniusTraderTakeId(offer: LaniusTraderOffer): string {
  return tx("wiki.cited-events.q-lanius-trader-take", { res: offer.res, cost: offer.cost, scrap: offer.scrap });
}

// Pirate fight. The page prints five intros and then a default Pirate ship fight, and it prints no odds.
// INFERRED: the five intros are equally likely.
const PIRATE_FIGHT_INTROS = [
  tx("wiki.cited-events.as-you-jump-into-the-system"),
  tx("wiki.cited-events.soon-after-arriving-in-the-system"),
  tx("wiki.cited-events.at-first-it-appears-you-ve"),
  tx("wiki.cited-events.the-only-other-ship-at-this"),
  tx("wiki.cited-events.you-barely-have-time-to-register"),
];

// Free scrap with resources. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-scrap-with-resources:0.
const FREE_SCRAP_WITH_RESOURCES_INTROS = [
  tx("wiki.cited-events.you-arrive-in-a-system-and"),
  tx("wiki.cited-events.not-much-remains-in-this-abandoned"),
  tx("wiki.cited-events.as-you-arrive-in-the-system"),
  tx("wiki.cited-events.debris-from-a-forgotten-battle-still"),
  tx("wiki.cited-events.you-receive-a-message-from-a"),
  tx("wiki.cited-events.you-happen-upon-the-remains-of"),
];

// Slug fight in plasma storm. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:slug-fight-in-plasma-storm:0.
// Pirate ship distress trap. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:pirate-ship-distress-trap:0.
const PIRATE_DISTRESS_TRAP_INTROS = [
  tx("wiki.cited-events.you-arrive-at-the-beacon-and"),
  tx("wiki.cited-events.haha-i-knew-someone-would-fall"),
  tx("wiki.cited-events.your-cockpit-lights-up-with-warning"),
  tx("wiki.cited-events.as-soon-as-you-arrive-at"),
];

const SLUG_PLASMA_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in plasma storm]]
  // > "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures." — [[Slug fight in plasma storm]]
  // > "The Slug ship that descends into view as you enter the ion storm must have sensed your distress - defensive action!" — [[Slug fight in plasma storm]]
  // > "You arrive in the middle of an ion storm. Slugs generally avoid these storms but you find one waiting in ambush. Prepare for a fight!" — [[Slug fight in plasma storm]]
  // > "You find yourself stuck in the middle of an ion storm with a Slug ship just a short distance away, refusing all hails. You cautiously try to slip further into the clouds, but they turn suddenly to attack!" — [[Slug fight in plasma storm]]
  tx("wiki.cited-events.the-ion-storm-here-threatens-to"),
  tx("wiki.cited-events.the-slug-ship-that-descends-into"),
  tx("wiki.cited-events.you-arrive-in-the-middle-of-2"),
  tx("wiki.cited-events.you-find-yourself-stuck-in-the"),
];

// Free weapon. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-weapon:0.
const FREE_WEAPON_INTROS = [
  tx("wiki.cited-events.holy-crap-a-weapon-is-just"),
  tx("wiki.cited-events.you-inform-a-nearby-station-of"),
  tx("wiki.cited-events.a-settlement-still-loyal-to-the"),
  tx("wiki.cited-events.as-soon-as-you-arrive-a"),
  tx("wiki.cited-events.a-small-merchant-ship-messages-you"),
  tx("wiki.cited-events.debris-from-a-battle-is-scattered"),
];

// Rebel checkpoint. Four intros and four hide labels, no odds. INFERRED: equal.
const REBEL_CHECKPOINT_INTROS = [
  tx("wiki.cited-events.a-rather-large-fleet-of-civilian"),
  tx("wiki.cited-events.another-rebel-checkpoint-is-monitoring-this"),
  tx("wiki.cited-events.a-rebel-space-station-and-single"),
  tx("wiki.cited-events.it-looks-like-this-beacon-is"),
];
// Pirate fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-near-pulsar:0.
const PIRATE_PULSAR_INTROS = [
  tx("wiki.cited-events.sensors-go-wild-as-a-nearby"),
  tx("wiki.cited-events.you-arrive-to-find-a-pulsar"),
  tx("wiki.cited-events.a-small-research-station-orbits-a"),
];

// Rock fight. Eight printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight:0.
const ROCK_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight]]
  // > "You encounter a Rock vessel and attempt to open trading frequencies, but they take it as an act of cultural transgression and open fire." — [[Rock fight]]
  // > "You jump into the middle of a Rock excavation project on a nearby moon. Unimpressed with your intrusion they move to defend themselves!" — [[Rock fight]]
  // > "You intercept chatter from an approaching Rock ship: \"Weapons, moving in to engage, arm the tubes.\" There is no talking to these guys." — [[Rock fight]]
  // > "As you jump in, a vast figure appears on the view-screen. The Rock captain rubs the green, moss-like appendage on his chin and then orders his crew to open fire." — [[Rock fight]]
  // > "It looks quiet, but you realize your computer is being scanned. A hidden Rock vessel hails you: \"Why do you fill your computer with lies?! These are not the holy words!\" Before you can interject they open fire." — [[Rock fight]]
  // > "You notice a Rock ship performing combat exercises. However, they quickly change their course to engage your ship. They apparently treat unregistered alien ships as handy target practice." — [[Rock fight]]
  // > "A loud 'thud' resounds through the ship after jump completion - you've just shunted a Rock fighter and he's already preparing to fire!" — [[Rock fight]]
  // > "You're intercepted by a Rock salvage operation. They don't seem to mind that you're still on board while they junk your ship." — [[Rock fight]]
  tx("wiki.cited-events.you-encounter-a-rock-vessel-and"),
  tx("wiki.cited-events.you-jump-into-the-middle-of"),
  tx("wiki.cited-events.you-intercept-chatter-from-an-approaching"),
  tx("wiki.cited-events.as-you-jump-in-a-vast"),
  tx("wiki.cited-events.it-looks-quiet-but-you-realize"),
  tx("wiki.cited-events.you-notice-a-rock-ship-performing"),
  tx("wiki.cited-events.a-loud-thud-resounds-through-the"),
  tx("wiki.cited-events.you-re-intercepted-by-a-rock"),
];

// Rebel fight (Lanius). Six printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-lanius:0.
const LANIUS_REBEL_INTROS = [
  tx("wiki.cited-events.you-intercept-discussions-between-a-rebel"),
  tx("wiki.cited-events.you-arrive-to-see-a-number"),
  tx("wiki.cited-events.a-rebel-scout-patrols-near-the"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-2"),
  tx("wiki.cited-events.a-rebel-messages-you-who-would"),
  tx("wiki.cited-events.your-arrival-coincides-almost-exactly-with"),
];

// Rock fight with boarders. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-with-boarders:0.
const ROCK_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders]]
  // > "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!" — [[Rock fight with boarders]]
  // > "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!" — [[Rock fight with boarders]]
  tx("wiki.cited-events.you-passively-scan-a-small-rock"),
  tx("wiki.cited-events.you-find-a-rock-ship-docked"),
];

// Auto-ship fight. Nine printed intros, no odds. INFERRED: equal. The fight stays c:auto-ship-fight:0.
// Auto-ship warning prints the same nine lines. That fight stays c:auto-ship-warning:0.
const AUTO_SHIP_FIGHT_INTROS = [
  tx("wiki.cited-events.you-discover-one-of-the-rebel"),
  tx("wiki.cited-events.your-ship-is-hailed-this-is"),
  tx("wiki.cited-events.a-rebel-autonomous-scout-is-exploring"),
  tx("wiki.cited-events.the-ai-of-a-nearby-small"),
  tx("wiki.cited-events.a-rebel-ship-moves-in-to"),
  tx("wiki.cited-events.this-must-be-one-of-the"),
  tx("wiki.cited-events.another-unmanned-ship-patrols-this-area"),
  tx("wiki.cited-events.this-beacon-is-being-patrolled-by"),
  tx("wiki.cited-events.a-small-shuttle-appears-on-the"),
];

// Rebel fight with boarders. Four printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-with-boarders:0.
const REBEL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight with boarders]]
  // > "You receive a message from a nearby Rebel station, \"You have a lot of guts passing through our space, I'll give you that.\" He turns giving an order, \"Kill their crew, I want that ship intact.\"" — [[Rebel fight with boarders]]
  // > "Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, \"Ready to die? I sure am ready to get a promotion!\"" — [[Rebel fight with boarders]]
  // > "Incoming message, \"Hello Captain,\" says a Rebel in an officer's garb. \"How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient.\"" — [[Rebel fight with boarders]]
  // > "You receive a message on a low-band channel. \"You're surrounded, just like the last of your Federation friends. Just die already.\" The enemy has teleported onto your ship!" — [[Rebel fight with boarders]]
  tx("wiki.cited-events.you-receive-a-message-from-a-2"),
  tx("wiki.cited-events.your-sensors-warn-of-an-incoming"),
  tx("wiki.cited-events.incoming-message-hello-captain-says-a"),
  tx("wiki.cited-events.you-receive-a-message-on-a"),
];

// Boarders: Mantis. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-mantis:0.
const MANTIS_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Mantis]]
  // > "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!" — [[Boarders: Mantis]]
  // > "Your world, all of a sudden, changes. The Mantis are on board your ship." — [[Boarders: Mantis]]
  // > "You hear a grating rattle and a soft clicking. You reach for your pistol." — [[Boarders: Mantis]]
  tx("wiki.cited-events.a-derelict-and-still-smoking-mantis"),
  tx("wiki.cited-events.your-world-all-of-a-sudden"),
  tx("wiki.cited-events.you-hear-a-grating-rattle-and"),
];

// Boarders: Humans in nebula. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-in-nebula:0.
const NEBULA_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.you-see-a-small-station-nearby"),
  tx("wiki.cited-events.you-arrive-in-the-nebula-and"),
  tx("wiki.cited-events.you-see-a-number-of-derelict"),
];

// Boarders: Crystal. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-crystal:0.
const CRYSTAL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Crystal]]
  // > "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off." — [[Boarders: Crystal]]
  // > "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!" — [[Boarders: Crystal]]
  // > "You pick up chatter from a nearby ship, \"Yes... Here are some interesting specimens. Try to take them alive this time, there's a lot of money to be had on aliens.\" Scanners indicate a remote teleporter was just used." — [[Boarders: Crystal]]
  tx("wiki.cited-events.you-detect-a-heavily-armed-crystalline"),
  tx("wiki.cited-events.you-arrive-near-a-small-settlement"),
  tx("wiki.cited-events.you-pick-up-chatter-from-a"),
];

// Boarders: Rockmen near sun. The page prints two intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-rockmen-near-sun:0.
const ROCK_SUN_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Rockmen near sun]]
  // > "As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, \"Prepare to burn, fleshy meat-sack aliens!\"" — [[Boarders: Rockmen near sun]]
  // > "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement." — [[Boarders: Rockmen near sun]]
  tx("wiki.cited-events.as-soon-as-you-arrive-you"),
  tx("wiki.cited-events.with-their-high-resistance-to-heat"),
];

// Boarders: Humans (Pirate). The page prints five intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-pirate:0.
const PIRATE_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.what-appears-to-be-a-civilian"),
  tx("wiki.cited-events.a-heavily-damaged-ship-is-drifting"),
  tx("wiki.cited-events.you-detect-life-signs-actually-on"),
  tx("wiki.cited-events.your-ship-detects-a-faint-distress"),
  tx("wiki.cited-events.as-you-arrive-you-become-aware"),
];

// Rock fight with boarders in asteroid field. Two printed intros, no odds. INFERRED: equal.
// The fight stays c:rock-fight-with-boarders-in-asteroid-field:0, which already beams 1-2 Rock boarders inside an asteroid field.
const ROCK_BOARDER_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders in asteroid field]]
  // > "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!" — [[Rock fight with boarders in asteroid field]]
  // > "''Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.'" — [[Rock fight with boarders in asteroid field]]
  tx("wiki.cited-events.you-arrive-in-an-asteroid-field"),
  tx("wiki.cited-events.your-shields-are-being-taxed-as"),
];

// Lanius fight. Eleven printed intros, one repeated, no odds. INFERRED: equal, so the repeated line is twice as likely.
// The fight stays c:lanius-fight:0. Default Lanius rewards are not a separate payout.
const LANIUS_FIGHT_INTROS = [
  tx("wiki.cited-events.you-receive-a-message-on-a-2"),
  tx("wiki.cited-events.sensors-indicate-a-small-lanius-cruiser"),
  tx("wiki.cited-events.shortly-after-your-arrival-a-lanius"),
  tx("wiki.cited-events.a-military-lanius-vessel-stops-repurposing"),
  tx("wiki.cited-events.the-beacon-is-surrounded-by-many"),
  tx("wiki.cited-events.you-arrive-to-see-a-well"),
  tx("wiki.cited-events.as-you-arrive-in-the-system-2"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
  tx("wiki.cited-events.at-first-everything-seems-quiet-then"),
  tx("wiki.cited-events.you-have-stumbled-across-a-mining"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
];

// Mantis fight (Engi). Four printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-engi:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_ENGI_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight (Engi)]]
  // > "A mixed radar signal turns out to be a Mantis attack ship scavenging the remains of an Engi carrier. They turn and fight." — [[Mantis fight (Engi)]]
  // > "You come across a Mantis raider taking pot shots at a defenceless Engi supply station. Discovering its weapons aren't much of a match for the station's armour, it turns on your ship. Battle stations!" — [[Mantis fight (Engi)]]
  // > "The area looks clear, and you prepare to jump off, but a Mantis scout jumps in behind you! They're as surprised as you are, but their weapons are already online." — [[Mantis fight (Engi)]]
  // > "You find a Mantis ship harrying a small squad of Engi. They make it to the node and jump off, leaving you toe to toe with their pursuer!" — [[Mantis fight (Engi)]]
  tx("wiki.cited-events.a-mixed-radar-signal-turns-out"),
  tx("wiki.cited-events.you-come-across-a-mantis-raider"),
  tx("wiki.cited-events.the-area-looks-clear-and-you"),
  tx("wiki.cited-events.you-find-a-mantis-ship-harrying"),
];

// Mantis fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-in-nebula:0. Default Mantis rewards are not a separate payout.
// The storm words are the printed lines. They do not arm an ion storm.
const MANTIS_NEBULA_INTROS = [
  tx("wiki.cited-events.nebulas-are-known-to-be-popular"),
  tx("wiki.cited-events.you-detect-a-mantis-expedition-vessel"),
  tx("wiki.cited-events.a-mantis-ship-lost-in-the"),
  tx("wiki.cited-events.a-mantis-ship-hails-you-through"),
  tx("wiki.cited-events.you-notice-a-mantis-attack-ship"),
];

// Mantis fight. Twenty printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_INTROS = [
  tx("wiki.cited-events.a-mantis-military-ship-appears-on"),
  tx("wiki.cited-events.a-mantis-military-scout-hails-your"),
  tx("wiki.cited-events.a-small-mantis-cruiser-is-broadcasting"),
  tx("wiki.cited-events.you-detect-a-small-military-outpost"),
  tx("wiki.cited-events.you-discover-yet-another-unlicensed-and"),
  tx("wiki.cited-events.a-mantis-military-scout-seems-to"),
  tx("wiki.cited-events.a-small-military-craft-hails-you"),
  tx("wiki.cited-events.a-nearby-mantis-ship-begins-aggressive"),
  tx("wiki.cited-events.a-stream-of-clicks-and-gurgling"),
  tx("wiki.cited-events.the-mantis-ship-is-pleased-to"),
  tx("wiki.cited-events.you-recognize-the-outline-of-a"),
  tx("wiki.cited-events.something-red-looms-it-s-the"),
  tx("wiki.cited-events.a-mantis-vessel-hails-you-this"),
  tx("wiki.cited-events.you-notice-a-flurry-of-laser"),
  tx("wiki.cited-events.the-mantis-hail-you-their-captain"),
  tx("wiki.cited-events.a-mantis-female-comes-on-the"),
  tx("wiki.cited-events.a-mantis-ship-with-the-markings"),
  tx("wiki.cited-events.a-mantis-ship-hails-ah-fine"),
  tx("wiki.cited-events.children-on-earth-are-told-terrible"),
  tx("wiki.cited-events.a-youthful-looking-mantis-captain-hails"),
];

// Mantis fight choice. Six printed intros, no odds. INFERRED: equal.
// Attack stays c:mantis-fight-choice:0. Conceal and cloaking are quests.ts.
const MANTIS_CHOICE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight choice]]
  // > "You're greeted by a rare sight: a Mantis ship that appears not to have noticed you." — [[Mantis fight choice]]
  // > "For once, you see the Mantis before they see you." — [[Mantis fight choice]]
  // > "When they see the Mantis warship waiting in ambush at your intended coordinates, your crew is relieved to note you've jumped someway off the mark." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"Negative, I have killed more humans!\" You gulp noticeably, but luckily they don't see you yet." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"The one on the right is starting to rot. Take him down. Take off his fingers. Put him out of the airlock.\" They certainly don't seem to be friendly..." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"Agreed. Next ship is your turn. Good hunting.\" They don't see you yet." — [[Mantis fight choice]]
  tx("wiki.cited-events.you-re-greeted-by-a-rare"),
  tx("wiki.cited-events.for-once-you-see-the-mantis"),
  tx("wiki.cited-events.when-they-see-the-mantis-warship"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-negative"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-the"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-agreed"),
];

// Mantis ship attacking civilian. Five printed intros, no odds. INFERRED: equal.
// Aid stays c:mantis-ship-attacking-civilian:0. Stay out stays :1. The three stay-out sentences are quests.ts.
const MANTIS_CIVILIAN_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis ship attacking civilian]]
  // > "You spot a Mantis ship hunting in the distance." — [[Mantis ship attacking civilian]]
  // > "A Mantis ship engaging a civilian hails you. Sparks fly about his cockpit as he yells, \"Stay out of this human! Else you are next!\"" — [[Mantis ship attacking civilian]]
  // > "Local sensors pick up two ships engaged in a heated battle. It seems the Mantis military ship will surely defeat its prey." — [[Mantis ship attacking civilian]]
  // > "A Mantis vessel flashes past your view-screen, weapons and engines at full. A tiny blip on the sensor readout marks its quarry." — [[Mantis ship attacking civilian]]
  // > "You pick up a distress call from a civilian ship. It's being chased by a Mantis ship!" — [[Mantis ship attacking civilian]]
  tx("wiki.cited-events.you-spot-a-mantis-ship-hunting"),
  tx("wiki.cited-events.a-mantis-ship-engaging-a-civilian"),
  tx("wiki.cited-events.local-sensors-pick-up-two-ships"),
  tx("wiki.cited-events.a-mantis-vessel-flashes-past-your"),
  tx("wiki.cited-events.you-pick-up-a-distress-call"),
];

// Pirate ship attacking civilian. Six printed intros, no odds. INFERRED: equal.
// Aid stays c:pirate-ship-attacking-civilian:0. Stay out stays :1. The stay-out sentence is quests.ts.
const PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-system-to"),
  tx("wiki.cited-events.scanners-indicate-that-a-battle-is"),
  tx("wiki.cited-events.you-detect-two-ships-one-chasing"),
  tx("wiki.cited-events.there-are-only-two-ships-within"),
  tx("wiki.cited-events.you-arrive-at-the-next-beacon"),
  tx("wiki.cited-events.you-come-out-of-the-jump"),
];

// Pirate ship attacking civilian (Lanius). Three printed intros, no odds. INFERRED: equal.
// Attack stays c:pirate-ship-attacking-civilian-lanius:0. Avoid stays :1.
const LANIUS_PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-discover-an-abandoned-mining-facility"),
  tx("wiki.cited-events.a-pirate-ship-emerges-from-hiding"),
  tx("wiki.cited-events.a-pirate-ship-is-firing-on"),
];

// Pirate fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:pirate-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight in nebula]]
  // > "As you drift through the nebula an unmarked vessel descends from the clouds and into your wake. Their weapons come online." — [[Pirate fight in nebula]]
  // > "A pirate ship pulls out of the ether and hails: \"You know what I love about this part of the galaxy? The explorers! You always carry such fine loot.\" They lock weapons." — [[Pirate fight in nebula]]
  // > "As you coast through the nebula a pirate ship matches your course and closes the distance. Better to pick your battleground, but beggars can't be choosers." — [[Pirate fight in nebula]]
  // > "A hostile vessel descends from out of the nebula. Combat stations!" — [[Pirate fight in nebula]]
  // > "You try to read the ID of a ship ahead in the fog, but it's too thick to penetrate. You have your answer when the ship turns, weapons hot!" — [[Pirate fight in nebula]]
  tx("wiki.cited-events.as-you-drift-through-the-nebula"),
  tx("wiki.cited-events.a-pirate-ship-pulls-out-of"),
  tx("wiki.cited-events.as-you-coast-through-the-nebula"),
  tx("wiki.cited-events.a-hostile-vessel-descends-from-out"),
  tx("wiki.cited-events.you-try-to-read-the-id"),
];

// Rebel fight in nebula. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_REBEL_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.a-ship-bearing-rebel-colors-can"),
  tx("wiki.cited-events.the-rebels-must-have-anticipated-you"),
  tx("wiki.cited-events.it-looks-like-you-will-be"),
  tx("wiki.cited-events.shortly-after-you-arrive-a-rebel"),
  tx("wiki.cited-events.newton-knows-what-brings-this-rebel"),
  tx("wiki.cited-events.a-rebel-ship-hails-but-you"),
];

// Auto-ship fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:auto-ship-fight-in-nebula:0. The destroyed reward is quests.ts. No nebula environment is added.
const NEBULA_AUTO_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.you-jump-into-a-calmer-part"),
  tx("wiki.cited-events.the-tangled-wrecks-of-many-ships"),
  tx("wiki.cited-events.this-drone-isn-t-looking-for"),
  tx("wiki.cited-events.it-s-worrying-that-the-rebels"),
];

// Zoltan fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:zoltan-fight:0. Default rewards. No extra payout is added here.
const ZOLTAN_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Zoltan fight]]
  // > "A Zoltan ship makes contact. \"The nature of the day is rotational. The fever is emaciated. The reason is-\" They've caught some nasty deep space dementia. Before you can consider finding help for them, they open fire." — [[Zoltan fight]]
  // > "You're surprised when a stationary Zoltan ship opens fire. It appears there are aggressive pugilists even among the 'enlightened'." — [[Zoltan fight]]
  // > "You receive a message, \"This area is off limits. Submit your ship to processing.\" It's only one guard ship in a lonely beacon. You decide to fight your way out." — [[Zoltan fight]]
  // > "You discover a number of Zoltan civilian ships fighting off pirates. Unfortunately one ship mistakes your purpose and moves in to attack! They are refusing all communication; you have no choice but to fight." — [[Zoltan fight]]
  // > "Like many areas in Zoltan space, the residents of this sector prepared well for Galactic war. The military here seem to have given up reasoning with foreigners, preferring instead to attack on sight!" — [[Zoltan fight]]
  // > "A Zoltan ship is waiting at this beacon. They request your identification, but radiation from the sun in this system is disrupting your communications. They take your silence for aggression and move in to attack." — [[Zoltan fight]]
  // > "The Zoltan ship patrolling this area hails you: \"This area is off limits. Secrecy is vital.\" They power their weapons." — [[Zoltan fight]]
  tx("wiki.cited-events.a-zoltan-ship-makes-contact-the"),
  tx("wiki.cited-events.you-re-surprised-when-a-stationary"),
  tx("wiki.cited-events.you-receive-a-message-this-area"),
  tx("wiki.cited-events.you-discover-a-number-of-zoltan"),
  tx("wiki.cited-events.like-many-areas-in-zoltan-space"),
  tx("wiki.cited-events.a-zoltan-ship-is-waiting-at"),
  tx("wiki.cited-events.the-zoltan-ship-patrolling-this-area"),
];

// Crystal fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:crystal-fight:0. The unique surrender is surrender.ts.
const CRYSTAL_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Crystal fight]]
  // > "You arrive near a fleet of crystal ships, civilian or mercantile from the looks of them. You pause to scan one but they react immediately and send an escort to fight you off. Prepare to engage!" — [[Crystal fight]]
  // > "You arrive at the Beacon and are immediately greeted by an automatic message or warning of some kind. The translator can't seem to discern its purpose but after a few short moments an alarm goes off and a hostile ship jumps in!" — [[Crystal fight]]
  // > "You receive a message, \"Hah. It looks like another worthless alien-filled craft. Prepare to meet your maker!\" Weapon locks detected." — [[Crystal fight]]
  // > "A Crystalline ship messages you, \"I've heard tales that our isolation has finally ended. As a warrior I must demand to test my skills against you!\" Before you can respond they move in to attack." — [[Crystal fight]]
  // > "You arrive in a busy sector. At first no one pays any mind to your alien ship but soon you're registering a number of scan signatures. You get the feeling you're not wanted here just seconds before registering enemy weapon locks!" — [[Crystal fight]]
  // > "You jump next to a node busy with traffic, but before long all nearby ships notice you and keep their distance, uncertain of your allegiance. After an awkward standoff, a military ship breaks away from the rest and charges you." — [[Crystal fight]]
  // > "A barrage of rasps and clicks is broadcast over the comm; the universal translator understands little, but the words 'aliens', 'allowed' and 'no' come through quite clearly. You'll have to prove your right to be here in combat!" — [[Crystal fight]]
  tx("wiki.cited-events.you-arrive-near-a-fleet-of"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-3"),
  tx("wiki.cited-events.you-receive-a-message-hah-it"),
  tx("wiki.cited-events.a-crystalline-ship-messages-you-i"),
  tx("wiki.cited-events.you-arrive-in-a-busy-sector"),
  tx("wiki.cited-events.you-jump-next-to-a-node"),
  tx("wiki.cited-events.a-barrage-of-rasps-and-clicks"),
];

// Rebel fight among Rebel fleet. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-rebel-fleet:0. The low scrap and medium scrap payouts are not added here.
const REBEL_FLEET_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight among Rebel fleet]]
  // > "Although you were expecting the Rebels, you never imagined their fleet could have grown so fast. Your scanners can hardly register them all before a fighter stationed nearby moves in to attack." — [[Rebel fight among Rebel fleet]]
  // > "This system is flooded with Rebel warships. Luckily your ship's signature is disguised as a civilian transport. Most heavy vessels ignore you but a small fighter is approaching with weapons hot!" — [[Rebel fight among Rebel fleet]]
  // > "You arrive to find a Rebel battalion encircling a nearby planet, launching landing parties. A small scout moves toward your position. Prepare for a fight!" — [[Rebel fight among Rebel fleet]]
  // > "As soon as you arrive you find yourself in the debris of a fierce battle. However, only Rebel warships remain and you find yourself immediately under attack." — [[Rebel fight among Rebel fleet]]
  // > "Shots fly by and your computer registers multiple weapon locks as soon as you arrive. Evasive action!" — [[Rebel fight among Rebel fleet]]
  // > "What was once a great series of space stations is now nothing but a small ring of debris around the nearby moon. There's no time to mourn the dead; an enemy approaches!" — [[Rebel fight among Rebel fleet]]
  // > "The Federation seems to have put up a good fight. A number of Rebel ships lie broken or wounded. However their overwhelming numbers force the remaining Federation forces to retreat. Hopefully you can get away in time as well." — [[Rebel fight among Rebel fleet]]
  tx("wiki.cited-events.although-you-were-expecting-the-rebels"),
  tx("wiki.cited-events.this-system-is-flooded-with-rebel"),
  tx("wiki.cited-events.you-arrive-to-find-a-rebel"),
  tx("wiki.cited-events.as-soon-as-you-arrive-you-2"),
  tx("wiki.cited-events.shots-fly-by-and-your-computer"),
  tx("wiki.cited-events.what-was-once-a-great-series"),
  tx("wiki.cited-events.the-federation-seems-to-have-put"),
];

// Rebel fight among Federation and Rebel fleets. Six printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-federation-and-rebel-fleets:0. Escape and the scrap payouts stay elsewhere.
const FEDERATION_FLEET_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-middle-of-3"),
  tx("wiki.cited-events.two-fleets-fight-nearby-you-try"),
  tx("wiki.cited-events.it-s-hard-to-tell-who"),
  tx("wiki.cited-events.the-sheer-scale-of-the-destruction"),
  tx("wiki.cited-events.the-destruction-in-the-distance-is"),
  tx("wiki.cited-events.you-don-t-have-any-time"),
];

// Lanius ship attacking civilian. Three printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-attacking-civilian:0. Avoid stays the nothing choice.
const LANIUS_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-immediately-receive-a-message-upon"),
  tx("wiki.cited-events.you-scan-the-area-after-arriving"),
  tx("wiki.cited-events.you-arrive-at-the-location-of"),
];

// Lanius ship salvager. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-salvager:0. Leave stays :1. The Lanius scrap request stays :2.
const LANIUS_SALVAGER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-single-lanius"),
  tx("wiki.cited-events.there-are-remnants-of-a-fierce"),
  tx("wiki.cited-events.when-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.a-small-asteroid-belt-is-near"),
  tx("wiki.cited-events.a-lanius-ship-is-slowly-salvaging"),
];

// The mercenary. Six printed intros, no odds. INFERRED: equal.
// Delay stays c:the-mercenary:0. Fight stays :1. Decline stays :2.
const MERCENARY_INTROS = [
  tx("wiki.cited-events.you-find-a-mercenary-for-hire"),
  tx("wiki.cited-events.a-mercenary-hails-you-greetings-friend"),
  tx("wiki.cited-events.there-s-a-ship-with-pirate"),
  tx("wiki.cited-events.the-captain-of-this-ship-claims"),
  tx("wiki.cited-events.mercenaries-are-swarming-the-galaxy-now"),
  tx("wiki.cited-events.a-ship-hails-you-good-sir"),
];

// Rebel ship supplying civilians. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:rebel-ship-supplying-civilians:0. Leave stays :1. Wait and steal stays :2.
const REBEL_SUPPLY_INTROS = [
  tx("wiki.cited-events.you-stumble-across-a-rebel-ship"),
  tx("wiki.cited-events.you-find-a-rebel-combat-ship"),
  tx("wiki.cited-events.the-rebels-in-this-system-are"),
  tx("wiki.cited-events.civilian-colonists-loyal-to-the-rebel"),
  tx("wiki.cited-events.because-of-the-war-thousands-of"),
];

// Rebel ship attacking Federation loyalists. Three printed intros, no odds. INFERRED: equal.
// Aid stays c:rebel-ship-attacking-federation-loyalists:0. Escape stays :1.
const REBEL_LOYALIST_INTROS = [
  tx("wiki.cited-events.upon-arriving-at-this-beacon-you"),
  tx("wiki.cited-events.you-immediately-notice-a-rebel-ship"),
  tx("wiki.cited-events.your-sensors-are-picking-up-a"),
];

// Pirate briber. Three printed intros, no odds. INFERRED: equal.
// Accept stays c:pirate-briber:0. Attack stays c:pirate-briber:1.
const PIRATE_BRIBER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-pirate-in"),
  tx("wiki.cited-events.an-unidentified-ship-is-badly-damaged"),
  tx("wiki.cited-events.a-missile-shoots-across-your-bow"),
];

// Slug fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:slug-fight-in-nebula:0. No nebula environment is added. Surrender stays the Slug row.
const NEBULA_SLUG_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in nebula]]
  // > "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!" — [[Slug fight in nebula]]
  // > "The Slug vessel you encounter here has obviously made a big score and is looking to test its new armaments. They picked the wrong ship to attack." — [[Slug fight in nebula]]
  // > "A Slug passenger ship hails: \"Please, your worthy alien highnessesss, we are unarmed and sseeking asssylum.\" You approach cautiously, and weapons immediately spring from their hull!" — [[Slug fight in nebula]]
  // > "A Slug ship - a rogue, you suspect - approaches, but when he sees you're Federation he thinks better of the sneak attack and fires everything he has." — [[Slug fight in nebula]]
  // > "Direct attacks are not preferred by the Slugs, but of the three you see at this beacon, one has the brass to make a move on your position!" — [[Slug fight in nebula]]
  tx("wiki.cited-events.your-sensors-are-no-match-for"),
  tx("wiki.cited-events.the-slug-vessel-you-encounter-here"),
  tx("wiki.cited-events.a-slug-passenger-ship-hails-please"),
  tx("wiki.cited-events.a-slug-ship-a-rogue-you"),
  tx("wiki.cited-events.direct-attacks-are-not-preferred-by"),
];

// Escort civilians. Three printed intros, no odds. INFERRED: equal.
// Accept stays the low fuel and the quest marker. Decline stays nothing.
const ESCORT_CIVILIAN_INTROS = [
  tx("wiki.cited-events.after-a-short-time-you-receive"),
  tx("wiki.cited-events.there-is-a-single-ship-at"),
  tx("wiki.cited-events.hello-your-communicator-opens-a-hail"),
];

// Trade fuel for drone parts. Three printed intros, no odds. INFERRED: equal.
// The trade stays lose 2-4 fuel for 1-3 drone parts. Reject stays nothing.
const FUEL_FOR_DRONES_INTROS = [
  tx("wiki.cited-events.a-nearby-space-station-hails-you"),
  tx("wiki.cited-events.a-strange-vessel-approaches-a-digital"),
  tx("wiki.cited-events.you-arrive-in-the-sector-and"),
];

// Rock pirates fight near sun. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-near-sun:0.
const ROCK_PIRATE_SUN_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight near sun]]
  // > "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship." — [[Rock pirates fight near sun]]
  // > "A Rock ship is silhouetted against a sun in supernova. They hail: \"Even out here you follow us! We only wish to be left alone!\" Out of panic or anger, they charge their weapons." — [[Rock pirates fight near sun]]
  tx("wiki.cited-events.unusual-solar-activity-in-this-region"),
  tx("wiki.cited-events.a-rock-ship-is-silhouetted-against"),
];

// Rock pirates fight in asteroid field. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
const ROCK_PIRATE_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight in asteroid field]]
  // > "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship." — [[Rock pirates fight in asteroid field]]
  // > "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!" — [[Rock pirates fight in asteroid field]]
  tx("wiki.cited-events.minute-fissures-in-the-shields-spark"),
  tx("wiki.cited-events.you-exit-the-jump-surrounded-by"),
];

// Rock fight in asteroid field. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-in-asteroid-field:0.
const ROCK_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight in asteroid field]]
  // > "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!" — [[Rock fight in asteroid field]]
  // > "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in." — [[Rock fight in asteroid field]]
  // > "The captain of a Rock freighter lost in the asteroid field hails you: \"Our co-ordinates led us here, but only death greets us. What must be must be. Death to all.\" You power up the battle systems and wonder how long they've been stuck here." — [[Rock fight in asteroid field]]
  tx("wiki.cited-events.a-rock-mining-vessel-is-harvesting"),
  tx("wiki.cited-events.a-rookie-rock-cargo-ship-has"),
  tx("wiki.cited-events.the-captain-of-a-rock-freighter"),
];

// Rebel fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-slug:0.
const SLUG_REBEL_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight (Slug)]]
  // > "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!" — [[Rebel fight (Slug)]]
  // > "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!" — [[Rebel fight (Slug)]]
  // > "You receive a message from a nearby ship, \"Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!\"" — [[Rebel fight (Slug)]]
  tx("wiki.cited-events.as-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.you-jump-into-empty-space-and"),
  tx("wiki.cited-events.you-receive-a-message-from-a-3"),
];

// Pirate fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-slug:0.
const SLUG_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
  // > "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous." — [[Pirate fight (Slug)]]
  // > "\"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live.\" You cut the transmission in lieu of a response." — [[Pirate fight (Slug)]]
  // > "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire." — [[Pirate fight (Slug)]]
  tx("wiki.cited-events.there-appears-to-be-a-pirate"),
  tx("wiki.cited-events.we-knew-anyone-foolish-enough-to"),
  tx("wiki.cited-events.before-you-can-take-a-moment"),
];

// Pirate fight (Lanius). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-lanius:0.
const LANIUS_PIRATE_INTROS = [
  tx("wiki.cited-events.an-upgraded-pirate-ship-sits-among"),
  tx("wiki.cited-events.the-pirate-ship-patrolling-this-sector"),
  tx("wiki.cited-events.a-pirate-ship-appears-to-be"),
  tx("wiki.cited-events.debris-from-a-number-of-battleships"),
  tx("wiki.cited-events.the-pirate-sees-you-before-you"),
];

// Pirate fight (Zoltan). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-zoltan:0.
const ZOLTAN_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Zoltan)]]
  // > "\"Emergency, all ships in range, we are under attack!\" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards." — [[Pirate fight (Zoltan)]]
  // > "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!" — [[Pirate fight (Zoltan)]]
  // > "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack." — [[Pirate fight (Zoltan)]]
  // > "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed." — [[Pirate fight (Zoltan)]]
  // > "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge." — [[Pirate fight (Zoltan)]]
  tx("wiki.cited-events.emergency-all-ships-in-range-we"),
  tx("wiki.cited-events.you-jump-just-in-time-to"),
  tx("wiki.cited-events.despite-their-precautions-pirates-have-begun"),
  tx("wiki.cited-events.a-ship-with-pirate-markings-demand"),
  tx("wiki.cited-events.you-spot-a-pirate-ship-looting"),
];

// Rock pirates fight. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight:0.
const ROCK_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight]]
  // > "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type." — [[Rock pirates fight]]
  // > "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!" — [[Rock pirates fight]]
  // > "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!" — [[Rock pirates fight]]
  tx("wiki.cited-events.as-a-naturally-warlike-species-with"),
  tx("wiki.cited-events.a-rock-ship-flies-past-your"),
  tx("wiki.cited-events.a-motley-collection-of-rock-ships"),
];

// Rebel fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-near-pulsar:0.
const REBEL_PULSAR_INTROS = [
  tx("wiki.cited-events.a-rebel-captain-appears-on-the"),
  tx("wiki.cited-events.a-small-rebel-research-station-overlooks"),
  tx("wiki.cited-events.you-arrive-at-an-infrequently-used"),
];

// Rebel fight. Ten printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight:0.
const REBEL_FIGHT_INTROS = [
  tx("wiki.cited-events.your-ship-is-hailed-we-ve"),
  tx("wiki.cited-events.a-small-rebel-ship-is-docked"),
  tx("wiki.cited-events.a-rebel-ship-has-been-patrolling"),
  tx("wiki.cited-events.a-rebel-ship-hails-you-federation"),
  tx("wiki.cited-events.you-receive-a-transmission-sorry-sir"),
  tx("wiki.cited-events.by-the-time-you-notice-the"),
  tx("wiki.cited-events.a-rebel-ship-hails-we-did"),
  tx("wiki.cited-events.a-rebel-ship-approaches-cautiously-personally"),
  tx("wiki.cited-events.you-re-hailed-by-a-rebel"),
  tx("wiki.cited-events.a-rebel-ship-is-guarding-this"),
];

// Rebel ship attacking civilians in Last Stand. Five printed intros, no odds. INFERRED: equal. Both choices stay.
const LAST_STAND_CIVILIAN_INTROS = [
  tx("wiki.cited-events.a-number-of-large-transports-are"),
  tx("wiki.cited-events.shots-fly-by-your-port-windows"),
  tx("wiki.cited-events.there-seems-to-be-a-small"),
  tx("wiki.cited-events.a-battle-rages-nearby-between-small"),
  tx("wiki.cited-events.a-civilian-ship-is-broadcasting-a"),
];

const REBEL_CHECKPOINT_HIDE = [
  tx("wiki.cited-events.fly-behind-a-moon-and-stay-2"),
  tx("wiki.cited-events.shut-down-all-non-vital-systems"),
  tx("wiki.cited-events.stay-quiet-and-hope-they-don"),
  tx("wiki.cited-events.stay-out-of-their-way-and"),
];

// Four printed tracks. The page gives no odds. INFERRED: each count is equally likely.
const SLUG_MOON_COUNTS = [5, 6, 7, 11] as const;

const SLUG_MOON_WORD: Record<(typeof SLUG_MOON_COUNTS)[number], string> = {
  5: "five",
  6: "six",
  7: "seven",
  11: "eleven",
};

const SLUG_MOON_QUESTION =
  tx("wiki.cited-events.as-you-drift-closer-you-are");

const SLUG_MOON_CORRECT =
  tx("wiki.cited-events.that-isss-correct-you-sssurprise-me");

const SLUG_MOON_WRONG =
  tx("wiki.cited-events.that-issss-incorrect-further-i-have");

const SLUG_MOON_ASK = /^c:slug-moons-question:ask:(5|6|7|11)$/;
const SLUG_MOON_ANSWER = /^c:slug-moons-question:answer:(5|6|7|11):(5|6|7|11)$/;

function slugMoonWord(n: number): string {
  return SLUG_MOON_WORD[n as (typeof SLUG_MOON_COUNTS)[number]] ?? "five";
}

/**
 * Slug moons question. The note: a regular beacon, and a nebula environment on arrival.
 * beacon.kind "nebula" is that environment (fleet step and the anti-ship battery).
 */
function slugMoonsCard(g: Game, b: Beacon, title: string): GameEvent {
  // Wiki citations:
  // > "this event occurs at a regular beacon, but when you arrive there will be a nebula environment." — [[Slug moons question]]
  // > "You arrive near the distress beacon's signal." — [[Slug moons question]]
  // > "You track the distress beacon with difficulty to one of the five moons of a planet hidden in the nebula." — [[Slug moons question]]
  // > "You track the distress beacon with difficulty to one of the six moons of a planet hidden in the nebula." — [[Slug moons question]]
  // > "You track the distress beacon with difficulty to one of the seven moons of a planet hidden in the nebula." — [[Slug moons question]]
  // > "You track the distress beacon with difficulty to one of the eleven moons of a planet hidden in the nebula." — [[Slug moons question]]
  // > "Investigate." — [[Slug moons question]]
  b.kind = "nebula";
  const n = SLUG_MOON_COUNTS[between(g, [0, SLUG_MOON_COUNTS.length - 1])]!;
  return {
    title,
    body: tx("wiki.cited-events.you-arrive-near-the-distress-beacon", { slugMoonWord: slugMoonWord(n) }),
    choices: [{ id: `c:slug-moons-question:ask:${n}`, label: tx("wiki.cited-events.investigate") }],
  };
}

function slugMoonsQuestion(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith("c:slug-moons-question:")) return null;
  const ask = SLUG_MOON_ASK.exec(id);
  if (ask) {
    // Wiki citations:
    // > "As you drift closer, you are contacted by a Slug marooned on the moon's surface." — [[Slug moons question]]
    // > "How many moons are there in orbit here?" — [[Slug moons question]]
    const n = Number(ask[1]);
    const title = ctx.g.beacons.find((b) => b.id === ctx.g.here)?.name ?? tx("wiki.cited-events.slug-moons-question");
    ctx.g.event = {
      title,
      body: SLUG_MOON_QUESTION,
      choices: [5, 6, 7, 11].map((pick) => ({
        id: `c:slug-moons-question:answer:${n}:${pick}`,
        label: `${slugMoonWord(pick)[0]!.toUpperCase()}${slugMoonWord(pick).slice(1)}.`,
      })),
    };
    ctx.g.phase = "event";
    ctx.g.paused = true;
    return true;
  }
  const answer = SLUG_MOON_ANSWER.exec(id);
  if (!answer) return false;
  const correct = Number(answer[1]);
  const picked = Number(answer[2]);
  if (picked === correct) {
    // Wiki citations:
    // > "That isss... correct. You sssurprise me." — [[Slug moons question#Correct Answer]]
    // > "You receive a Slug crewmember." — [[Slug moons question#Correct Answer]]
    // Crew: eight is the cap. A ninth is not added. This page does not print that refusal.
    const joined = joinCrew(ctx.g, tx("wiki.cited-events.slug"));
    const line = joined ? tx("wiki.cited-events.you-receive-a-slug-crewmember") : tx("wiki.cited-events.there-is-no-room-aboard-for");
    ctx.note(line);
    citedResult(ctx.g, SLUG_MOON_CORRECT, [line]);
    return true;
  }
  // Wiki citations:
  // > "That issss... incorrect." — [[Slug moons question#Incorrect Answer]]
  // > "You lose Scrap lost: 35, Fuel lost: 2-4, Drone parts lost: 1-2." — [[Slug moons question#Incorrect Answer]]
  // "You lose 35 scrap, 2-4 fuel, and 1-2 drone parts." Inclusive ranges.
  // A shortfall returns before any spend, the same way a cited price does.
  const fuel = roll(ctx, 2, 4);
  const parts = roll(ctx, 1, 2);
  const g = ctx.g;
  if (g.scrap < 35 || g.fuel < fuel || g.player.parts < parts) return false;
  g.scrap -= 35;
  g.fuel -= fuel;
  g.player.parts -= parts;
  const paid = [tx("wiki.cited-events.scrap-35"), tx("wiki.cited-events.fuel-2", { fuel: fuel }), tx("wiki.cited-events.drone-parts-2", { parts: parts })];
  for (const line of paid) ctx.note(line);
  citedResult(g, SLUG_MOON_WRONG, paid);
  return true;
}

const ZOLTAN_MOON_OPEN = tx("wiki.cited-events.something-strikes-you-as-odd-about");
const ZOLTAN_MOON_CAVE =
  tx("wiki.cited-events.it-looks-as-if-a-team");
const ZOLTAN_MOON_SHUTTLE =
  tx("wiki.cited-events.sending-a-shuttle-to-explore-a");
const ZOLTAN_MOON_HEAP =
  tx("wiki.cited-events.a-deep-scan-of-the-surface");
const ZOLTAN_MOON_QUIET =
  tx("wiki.cited-events.a-closer-inspection-reveals-signs-of");
const ZOLTAN_MOON_LEAVE =
  tx("wiki.cited-events.you-try-not-to-fixate-on");
const ZOLTAN_MOON_BASE =
  tx("wiki.cited-events.your-explosives-reveal-the-cave-is");
const ZOLTAN_MOON_REMAINS =
  tx("wiki.cited-events.a-portion-of-the-surface-layer");
const ZOLTAN_MOON_WASTE = tx("wiki.cited-events.the-explosives-are-set-remotely-but");
const ZOLTAN_MOON_DRONE =
  tx("wiki.cited-events.initial-scans-indicate-a-network-of");

function zoltanMoonTitle(g: Game): string {
  return g.beacons.find((b) => b.id === g.here)?.name ?? tx("wiki.cited-events.zoltan-odd-moon");
}

function zoltanOddCard(title: string): GameEvent {
  // Wiki citations:
  // > "Something strikes you as odd about a moon in the distance." — [[Zoltan odd moon]]
  return {
    title,
    body: ZOLTAN_MOON_OPEN,
    choices: [
      {
        id: "c:zoltan-odd-moon:look",
        // Wiki citations:
        // > "Check it out." — [[Zoltan odd moon]]
        label: tx("wiki.cited-events.check-it-out"),
      },
      {
        id: "c:zoltan-odd-moon:leave",
        // Wiki citations:
        // > "Leave it be." — [[Zoltan odd moon]]
        label: tx("wiki.cited-events.leave-it-be"),
      },
      {
        id: "c:zoltan-odd-moon:drone",
        // Wiki citations:
        // > "Send a drone to probe the surface." — [[Zoltan odd moon]]
        // > "(Boarding Drone)" — [[Zoltan odd moon]]
        // > "Drone parts lost: 1" — [[Zoltan odd moon]]
        label: tx("wiki.cited-events.send-a-drone-to-probe-the"),
      },
    ],
  };
}

/** Rewards, "Scrap only": a random amount is a low, medium, or high band. INFERRED: equally likely. */
function payRandomTier(ctx: CitedChoice): string {
  const tier = (["low", "medium", "high"] as const)[ctx.irand(3)]!;
  const [lo, hi] = band(ctx.g, tier);
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const name = tier === "low" ? tx("wiki.cited-events.low") : tier === "medium" ? tx("wiki.cited-events.medium") : tx("wiki.cited-events.high");
  const line = tx("wiki.cited-events.scrap", { name: name, n: n });
  ctx.note(line);
  return line;
}

function payTier(ctx: CitedChoice, tier: "low" | "medium"): string {
  const [lo, hi] = band(ctx.g, tier);
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const name = tier === "low" ? tx("wiki.cited-events.low") : tx("wiki.cited-events.medium");
  const line = tx("wiki.cited-events.scrap", { name: name, n: n });
  ctx.note(line);
  return line;
}

/**
 * Zoltan odd moon. Check it out has four results and the explosives have three, and the page prints no odds.
 * INFERRED: each of those results is equally likely.
 * Rewards, "Weapon": "A random weapon & T scrap." The page does not name either weapon, so it is a random one.
 * Rewards, "Scrap only": the remains' random scrap is a low, medium, or high band. The page prints no odds.
 * INFERRED: those three bands are equally likely. The base's "random amount" with its weapon uses the same draw.
 */
function zoltanOddMoon(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith("c:zoltan-odd-moon:")) return null;
  const g = ctx.g;
  if (id === "c:zoltan-odd-moon:look") {
    // Four results, no odds. INFERRED: equal.
    const which = ctx.irand(4);
    if (which === 0) {
      // Wiki citations:
      // > "It looks as if a team could break through the fragile layer of the moon's surface into a hidden cavern." — [[Zoltan odd moon]]
      g.event = {
        title: zoltanMoonTitle(g),
        body: ZOLTAN_MOON_CAVE,
        choices: [
          {
            id: "c:zoltan-odd-moon:boom",
            // Wiki citations:
            // > "Attempt to detonate some explosives to break through the surface." — [[Zoltan odd moon]]
            label: "Attempt to detonate some explosives to break through the surface.",
          },
          {
            id: "c:zoltan-odd-moon:spare",
            // Wiki citations:
            // > "Explosives are too valuable to waste on excavation work. Let's get out of here." — [[Zoltan odd moon]]
            label: "Explosives are too valuable to waste on excavation work. Let's get out of here.",
          },
        ],
      };
      g.phase = "event";
      g.paused = true;
      return true;
    }
    if (which === 1) {
      // Wiki citations:
      // > "Sending a shuttle to explore a beckoning cave system you discover signs of a battle - and a still-functioning weapon!" — [[Zoltan odd moon]]
      // > "You receive a weapon with low scrap." — [[Zoltan odd moon]]
      const line = payTier(ctx, "low");
      const item = grantRandomItem(g, "weapon");
      ctx.note(item);
      citedResult(g, ZOLTAN_MOON_SHUTTLE, [tx("wiki.cited-events.you-receive-a-weapon-with-low"), line, item]);
      return true;
    }
    if (which === 2) {
      // Wiki citations:
      // > "A deep scan of the surface reveals a cave system that runs for miles, and what looks like a scrap heap left over from some heavy-duty construction." — [[Zoltan odd moon]]
      // > "You receive medium scrap." — [[Zoltan odd moon]]
      const line = payTier(ctx, "medium");
      citedResult(g, ZOLTAN_MOON_HEAP, [tx("wiki.cited-events.you-receive-medium-scrap"), line]);
      return true;
    }
    // Wiki citations:
    // > "A closer inspection reveals signs of habitation on the surface, but nothing else particularly interesting." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_QUIET, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:leave") {
    // Wiki citations:
    // > "You try not to fixate on the moon in the aft scanner as you set the coordinates for the next jump." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_LEAVE, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:spare") {
    // Wiki citations:
    // > "Explosives are too valuable to waste on excavation work. Let's get out of here." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, tx("wiki.cited-events.nothing-happens"), [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:boom") {
    if (g.missiles < 1) return false;
    g.missiles -= 1;
    ctx.note(tx("wiki.cited-events.missiles-1"));
    // Wiki citations:
    // > "Attempt to detonate some explosives to break through the surface." — [[Zoltan odd moon]]
    // > "Missiles lost: 1" — [[Zoltan odd moon]]
    // Three results, no odds. INFERRED: equal.
    const which = ctx.irand(3);
    if (which === 0) {
      // Wiki citations:
      // > "Your explosives reveal the 'cave' is actually a secret base, located in a network of bunkers just under the surface. Everyone inside is dead; Mantis clearly came through here recently. It looks like the Zoltan were researching advanced ship weaponry. You take one of the better examples back to your ship." — [[Zoltan odd moon]]
      // > "You receive a weapon with a random amount of scrap." — [[Zoltan odd moon]]
      const line = payRandomTier(ctx);
      const item = grantRandomItem(g, "weapon");
      ctx.note(item);
      citedResult(g, ZOLTAN_MOON_BASE, [tx("wiki.cited-events.you-receive-a-weapon-with-a"), line, item, tx("wiki.cited-events.missiles-1")]);
      return true;
    }
    if (which === 1) {
      // Wiki citations:
      // > "A portion of the surface layer is destroyed in an impressive display, revealing miles of caves. You don't have time to fully explore them, but you find some remains of an old subterranean base that could be useful." — [[Zoltan odd moon]]
      // > "You receive a random amount of scrap." — [[Zoltan odd moon]]
      const line = payRandomTier(ctx);
      citedResult(g, ZOLTAN_MOON_REMAINS, [tx("wiki.cited-events.you-receive-a-random-amount-of"), line, tx("wiki.cited-events.missiles-1")]);
      return true;
    }
    // Wiki citations:
    // > "The explosives are set remotely, but the detonation achieves nothing. What a waste." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_WASTE, [tx("wiki.cited-events.nothing-happens"), tx("wiki.cited-events.missiles-1")]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:drone") {
    // Wiki citations:
    // > "Send a drone to probe the surface." — [[Zoltan odd moon]]
    // > "(Boarding Drone)" — [[Zoltan odd moon]]
    // > "Drone parts lost: 1" — [[Zoltan odd moon]]
    // > "Initial scans indicate a network of caves not far underground. You launch a boarding drone and it breaks through the surface into the cavern below." — [[Zoltan odd moon]]
    // > "Your drone discovers a vast cave network and evidence of excavation. Buried deep below you find a Zoltan scientist, still hard at work. He tells you that all his colleagues are long dead. You decide not to ask questions and offer to let him join your crew." — [[Zoltan odd moon]]
    // > "You receive a Zoltan crewmember." — [[Zoltan odd moon]]
    if (!ownsBoardDrone(g) || g.player.parts < 1) return false;
    g.player.parts -= 1;
    ctx.note(tx("wiki.cited-events.drone-parts-1"));
    // Crew: eight is the cap. A ninth is not added. This page does not print that refusal.
    const joined = joinCrew(g, tx("wiki.cited-events.zoltan"));
    const line = joined ? tx("wiki.cited-events.you-receive-a-zoltan-crewmember") : tx("wiki.cited-events.there-is-no-room-aboard-for");
    ctx.note(line);
    citedResult(g, ZOLTAN_MOON_DRONE, [line, tx("wiki.cited-events.drone-parts-1")]);
    return true;
  }
  return false;
}

export function citedEvent(g: Game, b: Beacon): GameEvent | null {
  const ev = matchEvent(b);
  if (!ev) return null;
  const missing = missingCard(g, b, ev);
  if (missing) return missing;
  if (ev.slug === "slug-moons-question") return slugMoonsCard(g, b, ev.dest);
  if (ev.slug === "zoltan-odd-moon") return zoltanOddCard(ev.dest);
  if (ev.slug === "lanius-trader") {
    const offer = rollLaniusTrader(g, false);
    // The offer is rolled first so the shown trade stays on the same draws. The intro uses the next draw.
    const intro = LANIUS_TRADER_INTROS[between(g, [0, 2])]!;
    return {
      title: ev.dest,
      body: `${intro}\n\n${laniusTraderOfferText(offer)}`,
      choices: [
        { id: laniusTraderTakeId(offer), label: tx("wiki.cited-events.agree-to-the-exchange") },
        { id: "c:lanius-trader:3", label: tx("wiki.cited-events.decline") },
        { id: "c:lanius-trader:4", label: tx("wiki.cited-events.ask-for-an-alternative-trade") },
      ],
    };
  }
  // Auto-ship near radar station. Combat Drone Mark I or II, or an Anti-Ship Beam Drone.
  if (ev.slug === "auto-ship-near-radar-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-radar-station:2", label: tx("wiki.cited-events.send-a-drone-to-distract-the") },
      ],
    };
  }
  // Auto-ship near storage station in nebula. Cloaking, Improved Cloaking, Hacking, and Improved Hacking.
  if (ev.slug === "auto-ship-near-storage-station-in-nebula") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-storage-station-in-nebula:2", label: tx("wiki.cited-events.attempt-to-stealthily-access-the-space") },
        { id: "c:auto-ship-near-storage-station-in-nebula:3", label: tx("wiki.cited-events.use-your-stealth-to-access-the") },
        { id: "c:auto-ship-near-storage-station-in-nebula:4", label: tx("wiki.cited-events.try-to-hack-the-station-to") },
        { id: "c:auto-ship-near-storage-station-in-nebula:5", label: tx("wiki.cited-events.hack-the-station-to-prevent-an") },
      ],
    };
  }
  // Pirate ship attacking civilian distress. Improved Weapons is Weapon Control level 6+.
  if (ev.slug === "pirate-ship-attacking-civilian-distress") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-ship-attacking-civilian-distress:2", label: tx("wiki.cited-events.fire-a-warning-shot-from-your") },
      ],
    };
  }
  // Zoltan security checkpoint. Profiling, a Slug, and Mind Control. The attack stays the fight.
  if (ev.slug === "zoltan-security-checkpoint") {
    // Wiki citations:
    // > "Submit to profiling." — [[Zoltan security checkpoint]]
    // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
    // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:zoltan-security-checkpoint:1", label: tx("wiki.cited-events.submit-to-profiling") },
        { id: "c:zoltan-security-checkpoint:2", label: tx("wiki.cited-events.have-your-slug-talk-them-into") },
        { id: "c:zoltan-security-checkpoint:3", label: tx("wiki.cited-events.make-the-guards-believe-they-have") },
      ],
    };
  }
  // Escort civilians FTL haywire. Advanced FTL Navigation uploads the route. Leading them stays the low scrap and the marker.
  if (ev.slug === "escort-civilians-ftl-haywire") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:escort-civilians-ftl-haywire:2", label: tx("wiki.cited-events.have-your-navigation-software-calculate-and") },
      ],
    };
  }
  // Slug drink. Drink, and a Rock crewmember poses as captain. Refuse stays the fight.
  if (ev.slug === "slug-drink") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:slug-drink:1", label: tx("wiki.cited-events.drink") },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:slug-drink:2", label: tx("wiki.cited-events.have-your-rockman-pose-as-captain") },
      ],
    };
  }
  // Rock ship in plasma storm. A Rock crewmember leads them out.
  if (ev.slug === "rock-ship-in-plasma-storm") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:rock-ship-in-plasma-storm:2", label: tx("wiki.cited-events.offer-to-lead-them-out-of") },
      ],
    };
  }
  // Deactivated Auto-ship. Download, and Sensors level 3. The strip choice is already on the card.
  if (ev.slug === "deactivated-auto-ship") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:deactivated-auto-ship:1", label: tx("wiki.cited-events.attempt-to-download-the-ship-s") },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:deactivated-auto-ship:2", label: tx("wiki.cited-events.remotely-scan-the-ship") },
      ],
    };
  }
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  if (ev.slug === "auto-ship-fight-in-plasma-storm") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-fight-in-plasma-storm:1", label: tx("wiki.cited-events.attempt-to-out-run-it") },
        { id: "c:auto-ship-fight-in-plasma-storm:2", label: tx("wiki.cited-events.attempt-to-out-run-it") },
        { id: "c:auto-ship-fight-in-plasma-storm:3", label: tx("wiki.cited-events.use-your-cloaking-to-escape") },
      ],
    };
  }
  // Auto-ship near storage station. Cloaking is a blue option.
  if (ev.slug === "auto-ship-near-storage-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-storage-station:2", label: tx("wiki.cited-events.attempt-to-cloak-and-access-the") },
      ],
    };
  }
  // Auto-ship near sensor station. Sensors level 3 and a Crew Teleporter are blue options.
  if (ev.slug === "auto-ship-near-sensor-station") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-near-sensor-station:2", label: tx("wiki.cited-events.use-your-sensors-to-attempt-to") },
        { id: "c:auto-ship-near-sensor-station:3", label: tx("wiki.cited-events.beam-directly-onto-the-station-to") },
      ],
    };
  }
  // Trade resources. One rolled offer is shown before Trade or Ignore. Not the nebula page.
  if (ev.slug === "trade-resources") return tradeResourcesEvent(g, ev.dest);
  // Trade resources in nebula. One intro, then one rolled offer. Trade or Ignore. No scrap.
  if (ev.slug === "trade-resources-in-nebula") return tradeResourcesNebulaEvent(g, ev.dest);
  // Pirate smuggler. {{Blue Option|Weapons|level=6+}}. The button stays visible.
  if (ev.slug === "pirate-smuggler") {
    return {
      title: ev.dest,
      body: tx("wiki.cited-events.a-pirate-ship-arrives-shortly-after"),
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-smuggler:2", label: tx("wiki.cited-events.activate-your-advanced-weapons-threateningly") },
      ],
    };
  }
  // Pirate fight has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight") {
    return {
      title: ev.dest,
      body: PIRATE_FIGHT_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "pirate-fight-in-nebula") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight in nebula]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight in nebula]]
    return {
      title: ev.dest,
      body: NEBULA_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight in nebula has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "rebel-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_REBEL_INTROS[between(g, [0, 6])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Auto-ship fight in nebula has no choice. Arrival calls c:auto-ship-fight-in-nebula:0.
  // One of the five printed intros. "Fight an Auto-ship." nebula=true. unique=false.
  if (ev.slug === "auto-ship-fight-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_AUTO_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock atheists. {{Blue Option|Improved Sensors|level=2+}}. The button stays visible.
  if (ev.slug === "rock-atheists") {
    return {
      title: ev.dest,
      body: tx("wiki.cited-events.you-encounter-a-small-craft-with"),
      choices: [
        { id: "c:rock-atheists:0", label: tx("wiki.cited-events.tell-them-their-god-sent-them-2") },
        { id: "c:rock-atheists:1", label: tx("wiki.cited-events.promise-to-share-with-them-the") },
        { id: "c:rock-atheists:2", label: tx("wiki.cited-events.show-them-to-your-data-suite") },
      ],
    };
  }
  // Pirate ship selling drones. Hail, then dock. The unnamed schematic is not a button.
  if (ev.slug === "pirate-ship-selling-drones") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "q:pirate-drones:hail", label: tx("wiki.cited-events.hail-the-ship") },
        { id: "c:pirate-ship-selling-drones:1", label: tx("wiki.cited-events.attack-him-before-he-can-attack") },
        { id: "c:pirate-ship-selling-drones:2", label: tx("wiki.cited-events.quickly-prepare-to-jump-away-2") },
      ],
    };
  }
  // Rebel fight (Lanius) has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_REBEL_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-lanius:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight with boarders. One of the two printed intros. The fight stays c:rock-fight-with-boarders:0.
  if (ev.slug === "rock-fight-with-boarders") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders]]
    // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
    return {
      title: ev.dest,
      body: ROCK_BOARDER_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Auto-ship fight has no choice. Arrival calls c:auto-ship-fight:0.
  // One of the nine printed intros. "Fight an Auto-ship." unique=false.
  if (ev.slug === "auto-ship-fight") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-fight:0", label: tx("wiki.cited-events.fight-an-auto-ship") }],
    };
  }
  // Auto-ship warning has no choice. Arrival calls c:auto-ship-warning:0.
  // The page shares those nine intros. "Fight an Auto-ship that is running away."
  // The red line is the escape: Rebel Fleet pursuit is doubled. unique=true.
  if (ev.slug === "auto-ship-warning") {
    return {
      title: ev.dest,
      body: AUTO_SHIP_FIGHT_INTROS[between(g, [0, 8])]!,
      choices: [{ id: "c:auto-ship-warning:0", label: tx("wiki.cited-events.fight-an-auto-ship-that-is") }],
    };
  }
  // Rebel fight with boarders. One of the four printed intros. The fight stays c:rebel-fight-with-boarders:0.
  if (ev.slug === "rebel-fight-with-boarders") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight with boarders]]
    return {
      title: ev.dest,
      body: REBEL_BOARDER_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:rebel-fight-with-boarders:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight with boarders in asteroid field. One of the two printed intros. The fight stays c:rock-fight-with-boarders-in-asteroid-field:0.
  if (ev.slug === "rock-fight-with-boarders-in-asteroid-field") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders in asteroid field]]
    // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
    return {
      title: ev.dest,
      body: ROCK_BOARDER_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-fight-with-boarders-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Lanius fight has no choice. Arrival calls this fight.
  // One of the eleven printed intros, including the repeated line. "Fight a Lanius ship (default Lanius rewards)." unique=false.
  if (ev.slug === "lanius-fight") {
    return {
      title: ev.dest,
      body: LANIUS_FIGHT_INTROS[between(g, [0, 10])]!,
      choices: [{ id: "c:lanius-fight:0", label: tx("wiki.cited-events.fight-a-lanius-ship") }],
    };
  }
  // Mantis fight (Engi) has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "mantis-fight-engi") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight (Engi)]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Engi)]]
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_ENGI_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:mantis-fight-engi:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
    };
  }
  // Mantis fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Mantis ship (default rewards)." nebula=true. unique=false.
  if (ev.slug === "mantis-fight-in-nebula") {
    return {
      title: ev.dest,
      body: MANTIS_NEBULA_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:mantis-fight-in-nebula:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
    };
  }
  // Mantis fight has no choice. Arrival calls this fight.
  // One of the twenty printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "mantis-fight") {
    return {
      title: ev.dest,
      body: MANTIS_FIGHT_INTROS[between(g, [0, 19])]!,
      choices: [{ id: "c:mantis-fight:0", label: tx("wiki.cited-events.fight-a-mantis-ship") }],
    };
  }
  // Mantis fight choice. One of the six printed intros. Attack, conceal, and cloaking stay on the def.
  if (ev.slug === "mantis-fight-choice") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight choice]]
    return {
      title: ev.dest,
      body: MANTIS_CHOICE_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Mantis ship attacking civilian. One of the five printed intros. Both printed choices stay.
  if (ev.slug === "mantis-ship-attacking-civilian") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis ship attacking civilian]]
    return {
      title: ev.dest,
      body: MANTIS_CIVILIAN_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian. One of the six printed intros. Both printed choices stay.
  if (ev.slug === "pirate-ship-attacking-civilian") {
    return {
      title: ev.dest,
      body: PIRATE_CIVILIAN_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian (Lanius). One of the three printed intros. Both printed choices stay.
  if (ev.slug === "pirate-ship-attacking-civilian-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_PIRATE_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Zoltan fight has no choice. Arrival calls c:zoltan-fight:0.
  // One of the seven printed intros. "Fight a Zoltan ship (default rewards)." unique=false.
  if (ev.slug === "zoltan-fight") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Zoltan fight]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan fight]]
    return {
      title: ev.dest,
      body: ZOLTAN_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:zoltan-fight:0", label: tx("wiki.cited-events.fight-a-zoltan-ship") }],
    };
  }
  // Crystal fight has no choice. Arrival calls c:crystal-fight:0.
  // One of the seven printed intros. "Fight a Crystal ship (default rewards)." unique=false.
  if (ev.slug === "crystal-fight") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Crystal fight]]
    // > "Fight a Crystal ship (default rewards)." — [[Crystal fight]]
    return {
      title: ev.dest,
      body: CRYSTAL_FIGHT_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:crystal-fight:0", label: tx("wiki.cited-events.fight-a-crystal-ship-default-rewards") }],
    };
  }
  // Rebel fight among Rebel fleet has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "rebel-fight-among-rebel-fleet") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight among Rebel fleet]]
    // > "Fight a Rebel ship." — [[Rebel fight among Rebel fleet]]
    // > "no surrender offers, no escape attempts" — [[Rebel fight among Rebel fleet]]
    return {
      title: ev.dest,
      body: REBEL_FLEET_INTROS[between(g, [0, 6])]!,
      choices: [{ id: "c:rebel-fight-among-rebel-fleet:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // The mercenary. One of the six printed intros. Delay, Fight, and Decline stay the existing choices.
  if (ev.slug === "the-mercenary") {
    return {
      title: ev.dest,
      body: MERCENARY_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship supplying civilians. One of the five printed intros. Attack and Leave stay the existing choices.
  if (ev.slug === "rebel-ship-supplying-civilians") {
    return {
      title: ev.dest,
      body: REBEL_SUPPLY_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship attacking Federation loyalists. One of the three printed intros. Aid and Escape stay the existing choices.
  if (ev.slug === "rebel-ship-attacking-federation-loyalists") {
    return {
      title: ev.dest,
      body: REBEL_LOYALIST_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate briber. One of the three printed intros. Accept and Attack stay the existing choices.
  if (ev.slug === "pirate-briber") {
    return {
      title: ev.dest,
      body: PIRATE_BRIBER_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Slug ship (default rewards)." nebula=true. unique=false. No nebula environment is added. Surrender stays the Slug row.
  if (ev.slug === "slug-fight-in-nebula") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in nebula]]
    // > "Fight a Slug ship (default rewards)." — [[Slug fight in nebula]]
    return {
      title: ev.dest,
      body: NEBULA_SLUG_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:slug-fight-in-nebula:0", label: tx("wiki.cited-events.fight-a-slug-ship") }],
    };
  }
  // Lanius ship attacking civilian. One of the three printed intros. Attack and Avoid stay the existing choices.
  if (ev.slug === "lanius-ship-attacking-civilian") {
    return {
      title: ev.dest,
      body: LANIUS_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Lanius ship salvager. One of the five printed intros. Attack, Leave, and the scrap request stay the existing choices.
  if (ev.slug === "lanius-ship-salvager") {
    return {
      title: ev.dest,
      body: LANIUS_SALVAGER_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight among Federation and Rebel fleets has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "rebel-fight-among-federation-and-rebel-fleets") {
    return {
      title: ev.dest,
      body: FEDERATION_FLEET_INTROS[between(g, [0, 5])]!,
      choices: [{ id: "c:rebel-fight-among-federation-and-rebel-fleets:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Escort civilians. One of the three printed intros. Accept and Decline stay the existing choices.
  if (ev.slug === "escort-civilians") {
    return {
      title: ev.dest,
      body: ESCORT_CIVILIAN_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Trade fuel for drone parts. One of the three printed intros. The trade and the reject stay the existing choices.
  if (ev.slug === "trade-fuel-for-drone-parts") {
    return {
      title: ev.dest,
      body: FUEL_FOR_DRONES_INTROS[between(g, [0, 2])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock pirates fight near sun has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." redgiant=true. unique=true.
  if (ev.slug === "rock-pirates-fight-near-sun") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight near sun]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight near sun]]
    return {
      title: ev.dest,
      body: ROCK_PIRATE_SUN_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-near-sun:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rock pirates fight in asteroid field has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "rock-pirates-fight-in-asteroid-field") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight in asteroid field]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight in asteroid field]]
    return {
      title: ev.dest,
      body: ROCK_PIRATE_ASTEROID_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:rock-pirates-fight-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rock fight in asteroid field has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "rock-fight-in-asteroid-field") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight in asteroid field]]
    // > "Fight a Rock ship (default rewards)." — [[Rock fight in asteroid field]]
    return {
      title: ev.dest,
      body: ROCK_ASTEROID_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-fight-in-asteroid-field:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Rebel fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight-slug") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight (Slug)]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Slug)]]
    return {
      title: ev.dest,
      body: SLUG_REBEL_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-slug:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Pirate fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-slug") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Slug)]]
    return {
      title: ev.dest,
      body: SLUG_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-slug:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight (Lanius) has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-lanius") {
    return {
      title: ev.dest,
      body: LANIUS_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-lanius:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Pirate fight (Zoltan) has no choice. Arrival calls c:pirate-fight-zoltan:0.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "pirate-fight-zoltan") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Zoltan)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Zoltan)]]
    return {
      title: ev.dest,
      body: ZOLTAN_PIRATE_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:pirate-fight-zoltan:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Rock pirates fight has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock pirate ship (default rewards)." unique=false.
  if (ev.slug === "rock-pirates-fight") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight]]
    return {
      title: ev.dest,
      body: ROCK_PIRATE_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rock-pirates-fight:0", label: tx("wiki.cited-events.fight-a-rock-pirate-ship") }],
    };
  }
  // Rebel fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "rebel-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: REBEL_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:rebel-fight-near-pulsar:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rock fight has no choice. Arrival calls this fight.
  // One of the eight printed intros. "Fight a Rock ship (default rewards)." unique=false.
  if (ev.slug === "rock-fight") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight]]
    // > "Fight a Rock ship (default rewards)." — [[Rock fight]]
    return {
      title: ev.dest,
      body: ROCK_FIGHT_INTROS[between(g, [0, 7])]!,
      choices: [{ id: "c:rock-fight:0", label: tx("wiki.cited-events.fight-a-rock-ship") }],
    };
  }
  // Pirate fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "pirate-fight-near-pulsar") {
    return {
      title: ev.dest,
      body: PIRATE_PULSAR_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:pirate-fight-near-pulsar:0", label: tx("wiki.cited-events.fight-a-pirate-ship") }],
    };
  }
  // Rebel fight has no choice. Arrival calls this fight.
  // One of the ten printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "rebel-fight") {
    return {
      title: ev.dest,
      body: REBEL_FIGHT_INTROS[between(g, [0, 9])]!,
      choices: [{ id: "c:rebel-fight:0", label: tx("wiki.cited-events.fight-a-rebel-ship") }],
    };
  }
  // Rebel checkpoint. The bribe amount is a whole number from 10 to 15, shown on the button.
  if (ev.slug === "rebel-checkpoint") {
    const cost = between(g, [10, 15]);
    return {
      title: ev.dest,
      body: REBEL_CHECKPOINT_INTROS[between(g, [0, 3])]!,
      choices: [
        { id: "c:rebel-checkpoint:0", label: tx("wiki.cited-events.fend-for-yourself-attack-and-escape-2") },
        { id: `q:rebel-checkpoint:bribe:${cost}`, label: tx("wiki.cited-events.bribe-the-rebels-to-release-the", { cost: cost }) },
        { id: "c:rebel-checkpoint:1", label: REBEL_CHECKPOINT_HIDE[between(g, [0, 3])]! },
      ],
    };
  }
  // Lanius trader with translator. The printed hail, then the same one shown base trade. No better-band blue option.
  if (ev.slug === "lanius-trader-with-translator") {
    const offer = rollLaniusTrader(g, false);
    return {
      title: ev.dest,
      body: tx("wiki.cited-events.a-lanius-merchant-appears-to-have", { laniusTraderOfferText: laniusTraderOfferText(offer) }),
      choices: [
        { id: `q:lanius-translator:take:${offer.res}:${offer.cost}:${offer.scrap}`, label: tx("wiki.cited-events.agree-to-the-exchange") },
        { id: "c:lanius-trader-with-translator:3", label: tx("wiki.cited-events.decline") },
        { id: "c:lanius-trader-with-translator:4", label: tx("wiki.cited-events.decline-but-ask-about-their-translation") },
      ],
    };
  }
  // Rebel ship attacking civilians in Last Stand. One of the five printed intros. Both choices stay.
  if (ev.slug === "rebel-ship-attacking-civilians-in-last-stand") {
    return {
      title: ev.dest,
      body: LAST_STAND_CIVILIAN_INTROS[between(g, [0, 4])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Free scrap with resources. One of the six printed intros. The gift stays c:free-scrap-with-resources:0.
  if (ev.slug === "free-scrap-with-resources") {
    return {
      title: ev.dest,
      body: FREE_SCRAP_WITH_RESOURCES_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship distress trap has no choice. Arrival calls this fight.
  // One of the four printed intros. No odds. INFERRED: equal. "Fight a Pirate ship (default rewards)." distress=true. unique=true.
  if (ev.slug === "pirate-ship-distress-trap") {
    return {
      title: ev.dest,
      body: PIRATE_DISTRESS_TRAP_INTROS[between(g, [0, 3])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in plasma storm has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Slug ship (default rewards)." plasmastorm=true. unique=false. The beacon stays outside a nebula. Surrender stays the Slug row.
  if (ev.slug === "slug-fight-in-plasma-storm") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in plasma storm]]
    // > "Note: This event has a plasma storm environment, but the beacon is not inside a nebula." — [[Slug fight in plasma storm]]
    // > "Fight a Slug ship (default rewards)." — [[Slug fight in plasma storm]]
    return {
      title: ev.dest,
      body: SLUG_PLASMA_INTROS[between(g, [0, 3])]!,
      choices: [{ id: "c:slug-fight-in-plasma-storm:0", label: tx("wiki.cited-events.fight-a-slug-ship") }],
    };
  }
  // Boarders: Mantis. One of the three printed intros. The boarders stay c:boarders-mantis:0.
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Mantis]]
  // > "2-4 mantis boarders beam aboard your ship." — [[Boarders: Mantis]]
  if (ev.slug === "boarders-mantis") {
    return {
      title: ev.dest,
      body: MANTIS_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-mantis:0", label: tx("wiki.cited-events.2-4-mantis-boarders-beam-aboard") }],
    };
  }
  // Boarders: Humans in nebula. One of the three printed intros. The boarders stay c:boarders-humans-in-nebula:0.
  if (ev.slug === "boarders-humans-in-nebula") {
    return {
      title: ev.dest,
      body: NEBULA_HUMAN_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-humans-in-nebula:0", label: tx("wiki.cited-events.2-4-human-boarders-beam-aboard") }],
    };
  }
  // Boarders: Crystal. One of the three printed intros. The boarders stay c:boarders-crystal:0.
  if (ev.slug === "boarders-crystal") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Crystal]]
    // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
    return {
      title: ev.dest,
      body: CRYSTAL_BOARDER_INTROS[between(g, [0, 2])]!,
      choices: [{ id: "c:boarders-crystal:0", label: tx("wiki.cited-events.2-3-crystal-boarders-beam-aboard") }],
    };
  }
  // Boarders: Rockmen near sun. One of the two printed intros. The boarders stay c:boarders-rockmen-near-sun:0.
  if (ev.slug === "boarders-rockmen-near-sun") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Rockmen near sun]]
    // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
    return {
      title: ev.dest,
      body: ROCK_SUN_BOARDER_INTROS[between(g, [0, 1])]!,
      choices: [{ id: "c:boarders-rockmen-near-sun:0", label: tx("wiki.cited-events.2-3-rock-boarders-beam-aboard") }],
    };
  }
  // Boarders: Humans (Pirate). One of the five printed intros. The boarders stay c:boarders-humans-pirate:0.
  if (ev.slug === "boarders-humans-pirate") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Humans (Pirate)]]
    // > "What appears to be a civilian ship sends a friendly hail." — [[Boarders: Humans (Pirate)]]
    // > "As you approach the vessel, you detect a teleporter signal but it's too late... intruders have beamed aboard!" — [[Boarders: Humans (Pirate)]]
    // > "A heavily damaged ship is drifting near this beacon." — [[Boarders: Humans (Pirate)]]
    // > "Nice of you to drop by. As you can see, our ship has seen better days." — [[Boarders: Humans (Pirate)]]
    // > "I think we might be taking it from you now." — [[Boarders: Humans (Pirate)]]
    // > "Intruders beam aboard." — [[Boarders: Humans (Pirate)]]
    // > "You detect life-signs actually on the beacon itself! A teleporter signal warns you but it's too late, they've beamed from the beacon onto your ship and seem intent on taking it over." — [[Boarders: Humans (Pirate)]]
    // > "Your ship detects a faint distress signal on a nearby moon. As you approach the rock, warning lights flash as hostiles beam aboard the ship from some hidden location." — [[Boarders: Humans (Pirate)]]
    // > "As you arrive, you become aware of a small Rebel outpost near the beacon. You are hardly able to bark an order before a small team is beamed aboard your ship. They must have been expecting you..." — [[Boarders: Humans (Pirate)]]
    return {
      title: ev.dest,
      body: PIRATE_HUMAN_BOARDER_INTROS[between(g, [0, 4])]!,
      choices: [{ id: "c:boarders-humans-pirate:0", label: tx("wiki.cited-events.3-5-human-boarders-beam-aboard") }],
    };
  }
  // Free weapon. One of the six printed intros. The gift stays c:free-weapon:0.
  if (ev.slug === "free-weapon") {
    return {
      title: ev.dest,
      body: FREE_WEAPON_INTROS[between(g, [0, 5])]!,
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Space station under construction. {{Blue Option|Lanius Crew|Offer to have your crewmember help.}}
  // The button stays visible. Agreeing to the sale is the follow-up card in wiki/quests.ts.
  if (ev.slug === "space-station-under-construction") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:space-station-under-construction:2", label: tx("wiki.cited-events.offer-to-have-your-crewmember-help") },
      ],
    };
  }
  return {
    title: ev.dest,
    body: ev.body,
    choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsBoardDrone(g: Game): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === "board" || (kit.loadout ?? []).includes("board");
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsHullRepair(g: Game): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === "hull" || (kit.loadout ?? []).includes("hull");
}

export function citedChoiceDisabled(g: Game, id: string): string | null {
  const missing = missingDisabled(g, id);
  if (missing) return missing;
  // Zoltan odd moon. Boarding Drone. INFERRED: the refusal lines. The page names the drone and the part.
  // Wiki citations:
  // > "(Boarding Drone)" — [[Zoltan odd moon]]
  // > "Drone parts lost: 1" — [[Zoltan odd moon]]
  if (id === "c:zoltan-odd-moon:drone" && !ownsBoardDrone(g)) return tx("wiki.cited-events.needs-a-boarding-drone");
  if (id === "c:zoltan-odd-moon:drone" && g.player.parts < 1) return tx("wiki.cited-events.need-1-drone-part");
  // No fuel: Engi ship repair. Hull Repair Drone, 1 drone part.
  // INFERRED: the refusal lines. The page names the drone and the part.
  // Wiki citations:
  // > "(Hull Repair Drone) Offer to help repair their hull. [ Drone parts lost: 1 ]" — [[No fuel: Engi ship repair]]
  if (id === "c:no-fuel-engi-ship-repair:2" && !ownsHullRepair(g)) return tx("wiki.cited-events.needs-a-hull-repair-drone");
  if (id === "c:no-fuel-engi-ship-repair:2" && g.player.parts < 1) return tx("wiki.cited-events.need-1-drone-part");
  // Destroyed cargo ship. Advanced Sensors prints level=2+. Long-Ranged Scanners is the augment.
  // INFERRED: the refusal lines. The page names the requirement and does not print these sentences.
  // Wiki citations:
  // > "(Advanced Sensors) Run an advanced scan on the boxes. (Requires level 2+ Sensors)" — [[Destroyed cargo ship]]
  // > "(Long-Ranged Scanners) Run an advanced scan on the boxes." — [[Destroyed cargo ship]]
  if (id === "c:destroyed-cargo-ship:2" && (g.player.systems.sensors?.level ?? 0) < 2) return tx("wiki.cited-events.needs-sensors-level-2");
  if (id === "c:destroyed-cargo-ship:3" && !g.augments.includes("glass")) return tx("wiki.cited-events.needs-long-ranged-scanners");
  // Auto-ship carrying shield virus. Hacking, "Counter the remote hacking."
  // INFERRED: the refusal line. The page names Hacking and does not print the sentence.
  if (id === "c:auto-ship-carrying-shield-virus:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.cited-events.needs-a-hacking-system");
  // Crystalline ship messaging about Rebels. Distraction Buoys.
  // INFERRED: the refusal line. The page names the augment and does not print the refusal sentence.
  if (id === "c:crystalline-ship-messaging-about-rebels:2" && !g.augments.includes("falsebuoy")) return tx("wiki.cited-events.needs-distraction-buoys");
  const take = tradeTake(id);
  if (take) {
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    if (stock(g, pay) < cost) return tx("wiki.cited-events.need", { cost: cost, v: RES_WORD[pay] });
    return null;
  }
  const choice = findChoice(id);
  if (!choice) return null;
  // Remote settlement. {{Blue Option|Fire Beam}} and {{Blue Option|Fire Bomb}}.
  // INFERRED: the refusal sentences. The page names the requirement and does not print the refusal.
  if (id === "c:remote-settlement:2" && !g.player.weapons.some((w) => w.defId === "firebeam")) return tx("wiki.cited-events.needs-a-fire-beam");
  if (id === "c:remote-settlement:3" && !g.player.weapons.some((w) => w.defId === "cask")) return tx("wiki.cited-events.needs-a-fire-bomb");
  for (const fx of choice.fx) {
    if (fx.k === "res" && fx.sign < 0 && stock(g, fx.id) < fx.lo) {
      return tx("wiki.cited-events.need-2", { lo: fx.lo, v: RES_WORD[fx.id] });
    }
  }
  return null;
}

export type CitedChoice = {
  g: Game;
  resolve: () => void;
  fight: (tier: string, asteroid?: boolean, slug?: string) => void;
  scrap: (n: number) => void;
  note: (text: string) => void;
  irand: (n: number) => number;
};

function roll(ctx: CitedChoice, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return lo + ctx.irand(hi - lo + 1);
}

/**
 * Sell missiles for scrap: "Thank you, this will help greatly."
 * Sell drone parts for scrap: "Thank you for your business."
 * Trivia on both pages: Scrap Recovery Arm and Repair Arm change the scrap reward.
 * The percents are Augmentations. These pages do not print them.
 */
function sellStationThanks(id: string): string | null {
  if (
    id === "c:sell-missiles-for-scrap:0" ||
    id === "c:sell-missiles-for-scrap:1" ||
    id === "c:sell-missiles-for-scrap:2"
  ) {
    return tx("wiki.cited-events.thank-you-this-will-help-greatly");
  }
  if (
    id === "c:sell-drone-parts-for-scrap:0" ||
    id === "c:sell-drone-parts-for-scrap:1" ||
    id === "c:sell-drone-parts-for-scrap:2"
  ) {
    return tx("wiki.cited-events.thank-you-for-your-business");
  }
  return null;
}

const CRYSTAL_PLANS = "c:crystalline-ship-messaging-about-rebels";
const CRYSTAL_OUTRUN =
  tx("wiki.cited-events.it-was-never-your-intention-to");
const CRYSTAL_CRUISE =
  tx("wiki.cited-events.unable-to-interpret-it-themselves-the");
const CRYSTAL_LIE =
  tx("wiki.cited-events.they-take-one-look-at-your");
const CRYSTAL_BUOY =
  tx("wiki.cited-events.your-distraction-buoy-allows-you-to");
const CRYSTAL_REFUSE =
  tx("wiki.cited-events.you-apologize-for-the-trouble-you");

function citedResult(g: Game, sentence: string, paid: string[]) {
  const title = g.beacons.find((b) => b.id === g.here)?.name ?? tx("wiki.cited-events.event");
  g.event = {
    title,
    body: `${sentence}\n\n${paid.join(" ")}`,
    choices: [{ id: "ack", label: "Continue" }],
  };
  g.phase = "event";
  g.paused = true;
}

function highScrapNote(ctx: CitedChoice): string {
  const [lo, hi] = band(ctx.g, "high");
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const line = tx("wiki.cited-events.high-scrap", { n: n });
  ctx.note(line);
  return line;
}

/** Existing faster fx: one extra step, not a doubled column. */
function doubledPursuit(ctx: CitedChoice): string {
  ctx.g.fleet += 1;
  const line = tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for");
  ctx.note(line);
  return line;
}

function delayedPursuit(ctx: CitedChoice): string {
  ctx.g.fleet = Math.max(0, ctx.g.fleet - 1);
  const line = tx("wiki.cited-events.rebel-fleet-pursuit-is-delayed-for");
  ctx.note(line);
  return line;
}

/**
 * Crystalline ship messaging about Rebels. Null when this id is some other card.
 * False when Distraction Buoys are missing: nothing is paid and the card stays.
 */
function crystallineRebelPlans(ctx: CitedChoice, id: string): boolean | null {
  if (!id.startsWith(`${CRYSTAL_PLANS}:`)) return null;
  const g = ctx.g;
  if (id === `${CRYSTAL_PLANS}:0`) {
    citedResult(g, CRYSTAL_OUTRUN, [highScrapNote(ctx), doubledPursuit(ctx)]);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:1`) {
    // Two results, no odds. INFERRED: equal.
    if (ctx.irand(2) === 0) {
      citedResult(g, CRYSTAL_CRUISE, [highScrapNote(ctx), delayedPursuit(ctx)]);
      return true;
    }
    ctx.note(CRYSTAL_LIE);
    ctx.fight(tx("wiki.cited-events.crystal-ship"));
    // INFERRED: the count is inclusive, and the call is after ctx.fight because startCombat drops enemy crew already aboard.
    crystalBoarders(g, 1, 2);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:2`) {
    if (!g.augments.includes("falsebuoy")) return false;
    citedResult(g, CRYSTAL_BUOY, [highScrapNote(ctx), delayedPursuit(ctx)]);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:3`) {
    citedResult(g, CRYSTAL_REFUSE, [tx("wiki.cited-events.nothing-happens")]);
    return true;
  }
  return null;
}

/** True only after the choice is applied. A shortfall returns false and changes nothing. */
export function citedChoose(ctx: CitedChoice, id: string): boolean {
  const missing = missingChoose(ctx, id);
  if (missing !== null) return missing;
  // Slug and Rock standoff in nebula: Get closer loads Rock and Slug standoff. The nebula stays.
  if (id === "c:slug-and-rock-standoff-in-nebula:0") {
    const b = ctx.g.beacons.find((x) => x.id === ctx.g.here);
    if (!b) return false;
    b.flag = "cited:rock-and-slug-standoff";
    b.name = "Rock and Slug standoff";
    b.kind = "nebula";
    const card = citedEvent(ctx.g, b);
    if (!card) return false;
    ctx.g.event = card;
    ctx.g.phase = "event";
    ctx.g.paused = true;
    return true;
  }
  const moons = slugMoonsQuestion(ctx, id);
  if (moons !== null) return moons;
  const moon = zoltanOddMoon(ctx, id);
  if (moon !== null) return moon;
  const take = tradeTake(id);
  if (take) {
    const g = ctx.g;
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    const get = take[3] as TradeRes;
    const gain = Number(take[4]);
    if (stock(g, pay) < cost) return false;
    spend(g, pay, cost);
    if (get === "fuel") g.fuel += gain;
    else if (get === "missiles") g.missiles += gain;
    else g.player.parts += gain;
    ctx.note(tradeNote(pay, -cost));
    ctx.note(tradeNote(get, gain));
    ctx.resolve();
    return true;
  }
  const choice = findChoice(id);
  if (!choice) return false;
  const g = ctx.g;
  // Letting a ship live ends the fight only while that ship is still there.
  if (choice.fx.some((fx) => fx.k === "close") && !g.enemy) return true;
  // Remote settlement. Fire Beam and Fire Bomb. citedChoose does not read citedChoiceDisabled.
  // A missing weapon returns before the res loop, so the missile is not spent.
  if (id === "c:remote-settlement:2" && !g.player.weapons.some((w) => w.defId === "firebeam")) return false;
  if (id === "c:remote-settlement:3" && !g.player.weapons.some((w) => w.defId === "cask")) return false;
  // Before the generic fleet/tier loops, so the old :0 rows are not applied twice.
  const crystalPlans = crystallineRebelPlans(ctx, id);
  if (crystalPlans !== null) return crystalPlans;
  const costs: { id: ResId; n: number }[] = [];
  const gains: { id: ResId; n: number }[] = [];
  for (const fx of choice.fx) {
    if (fx.k !== "res") continue;
    const n = roll(ctx, fx.lo, fx.hi);
    if (fx.sign < 0) {
      if (stock(g, fx.id) < n) return false;
      costs.push({ id: fx.id, n });
    } else gains.push({ id: fx.id, n });
  }
  for (const c of costs) spend(g, c.id, c.n);
  for (const gn of gains) {
    const thanks = gn.id === "scrap" ? sellStationThanks(id) : null;
    if (thanks) {
      // Score: Scrap Recovery Arm's bonus is not eligible. Repair Arm's cut stays in the eligible amount.
      const got = adjustScrap(g, gn.n);
      if (got > 0) g.scrap += got;
      if (gn.n > 0) g.scrapCollected = (g.scrapCollected ?? 0) + gn.n;
      ctx.note(thanks);
      ctx.note(tx("wiki.cited-events.you-receive-scrap", { got: got }));
      continue;
    }
    if (gn.id === "scrap") ctx.scrap(gn.n);
    else if (gn.id === "fuel") g.fuel += gn.n;
    else if (gn.id === "missiles") g.missiles += gn.n;
    else g.player.parts += gn.n;
    const word = gn.id === "scrap" ? tx("wiki.cited-events.scrap-2") : gn.id === "fuel" ? tx("wiki.cited-events.fuel") : gn.id === "missiles" ? tx("wiki.cited-events.missiles") : tx("wiki.cited-events.drone-parts");
    ctx.note(`${word}: ${gn.n}.`);
  }
  for (const fx of choice.fx) {
    if (fx.k !== "tier") continue;
    const [lo, hi] = band(g, fx.tier);
    const n = roll(ctx, lo, hi);
    ctx.scrap(n);
    const name = fx.tier === "low" ? tx("wiki.cited-events.low") : fx.tier === "high" ? tx("wiki.cited-events.high") : tx("wiki.cited-events.medium");
    ctx.note(tx("wiki.cited-events.scrap", { name: name, n: n }));
    if (fx.resources) ctx.note(tx("wiki.cited-events.resource-amounts-are-not-stated"));
  }
  for (const fx of choice.fx) {
    if (fx.k !== "hull") continue;
    if (fx.n >= 0) g.player.hull = Math.min(g.player.hullMax, g.player.hull + fx.n);
    else g.player.hull = Math.max(0, g.player.hull + fx.n);
    ctx.note(fx.n >= 0 ? tx("wiki.cited-events.hull-repairs", { n: fx.n }) : tx("wiki.cited-events.hull-damage", { v: -fx.n }));
  }
  for (const fx of choice.fx) {
    if (fx.k !== "fleet") continue;
    const last = !!fx.lastStand && (g.sector === 8 || g.sectorName === "The Last Stand");
    if (fx.faster) {
      g.fleet += fx.n;
      ctx.note(tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for-2", { n: fx.n, v: fx.n === 1 ? "jump" : "jumps" }));
    } else if (fx.double) {
      g.fleet *= 2;
      ctx.note(tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled"));
    } else if (last) {
      ctx.note(tx("wiki.cited-events.no-effect-in-the-last-stand"));
    } else {
      g.fleet = Math.max(0, g.fleet - fx.n);
      ctx.note(tx("wiki.cited-events.rebel-fleet-is-delayed-for-turns", { n: fx.n }));
    }
  }
  for (const fx of choice.fx) {
    if (fx.k === "item") ctx.note(grantRandomItem(g, fx.item));
  }
  const placesQuest = choice.fx.some((fx) => fx.k === "quest");
  for (const fx of choice.fx) {
    if (fx.k === "note" && !placesQuest) ctx.note(fx.text);
  }
  if (g.player.hull <= 0) {
    g.phase = "defeat";
    g.outcome = g.training ? "tutorial" : "hull";
    g.paused = true;
    g.event = null;
    return true;
  }
  // Rebel transport ship. "Demand the surrender of their goods." One printed lead-in, then the running Rebel fight.
  if (id === "c:rebel-transport-ship:0") ctx.note(tx("wiki.cited-events.you-prepare-to-secure-their-cargo"));
  // Lanius ship absorbing automated scout. "Fight the ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-ship-absorbing-automated-scout:0") ctx.note(tx("wiki.cited-events.you-power-up-your-weapons-which"));
  // Mantis ship attacking Crystal. "Attack the Mantis." One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-attacking-crystal:0") ctx.note(tx("wiki.cited-events.you-activate-your-impulse-engines-and"));
  // Mantis ship with Rock body parts. "Attack!" One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-with-rock-body-parts:0") {
    // Wiki citations:
    // > "No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!" — [[Mantis ship with Rock body parts]]
    // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
    ctx.note(tx("wiki.cited-events.no-species-deserves-a-mantis-hunter"));
  }
  // Lanius lone ship. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-lone-ship:0") ctx.note(tx("wiki.cited-events.the-civilian-ship-hastily-retreats-while"));
  // Auto-ship near radar station. "Approach the station." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-near-radar-station:0") ctx.note(tx("wiki.cited-events.the-ship-powers-up-and-targets"));
  // Crystal fight choice. "Engage the Rebel ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:crystal-fight-choice:0") {
    // Wiki citations:
    // > "Engage the Rebel ship." — [[Crystal fight choice]]
    // > "Before you can engage, the Crystalline ship scores a direct hit and obliterates the Rebel ship! They hail: \"You, you are like these other aliens! You brought them here!\" With that they turn their cannons on you!" — [[Crystal fight choice]]
    // > "Fight a Crystal ship (default rewards)." — [[Crystal fight choice]]
    ctx.note(tx("wiki.cited-events.before-you-can-engage-the-crystalline"));
  }
  // Lanius powered-down ship. "Scan the ship for lifeforms." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-powered-down-ship:0") ctx.note(tx("wiki.cited-events.as-you-scan-the-vessel-the"));
  // Pirate ship attacking Crystal. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-ship-attacking-crystal:0") {
    // Wiki citations:
    // > "Attack the pirate." — [[Pirate ship attacking Crystal]]
    // > "You chase down the pirate before it has a chance to engage the civilian ship. When it detects the real threat, it turns to face you." — [[Pirate ship attacking Crystal]]
    // > "Fight a Pirate ship." — [[Pirate ship attacking Crystal]]
    ctx.note(tx("wiki.cited-events.you-chase-down-the-pirate-before"));
  }
  // Remote settlement. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:remote-settlement:0") ctx.note(tx("wiki.cited-events.you-asked-for-it-they-pull"));
  // Pirate smuggler. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-smuggler:0") ctx.note(tx("wiki.cited-events.you-power-up-your-weapons-and"));
  // Refueling platform garbled broadcast. "Hail the platform and attempt to communicate." One printed lead-in, then a Lanius ship fight.
  if (id === "c:refueling-platform-garbled-broadcast:0") ctx.note(tx("wiki.cited-events.there-is-a-screech-from-your"));
  // Slug drink. "Refuse." One printed lead-in, then a Slug ship fight.
  if (id === "c:slug-drink:0") ctx.note(tx("wiki.cited-events.the-slug-feigns-offense-at-your"));
  // Zoltan quest primitives. "Interfere - make first contact with the primitive aliens." One printed lead-in, then a Zoltan ship fight.
  if (id === "c:zoltan-quest-primitives:0") ctx.note(tx("wiki.cited-events.the-local-people-furry-one-eyed"));
  // Zoltan quest primitives. "Protect the aliens' way of life - Attack the Rebel ship." One printed lead-in, then a Rebel ship fight.
  if (id === "c:zoltan-quest-primitives:1") ctx.note(tx("wiki.cited-events.these-creatures-should-be-left-to"));
  // Rebel ship attacking Crystal ship. "Attack the Rebel." One printed lead-in, then a Rebel ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:0") ctx.note(tx("wiki.cited-events.you-message-the-crystalline-ship-your"));
  // Rebel ship attacking Crystal ship. "Attack the Crystalline ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:1") ctx.note(tx("wiki.cited-events.you-move-in-to-intercept-the"));
  // Auto-ship carrying shield virus. "Counter the remote hacking." Without Hacking the arrival card stays open.
  // citedChoose does not read citedChoiceDisabled, so this returns before the fight note and the fight.
  if (id === "c:auto-ship-carrying-shield-virus:1" && (g.player.kits.spike?.level ?? 0) <= 0) return true;
  // Auto-ship carrying shield virus. "Counter the remote hacking." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-carrying-shield-virus:1") ctx.note(tx("wiki.cited-events.your-hacking-system-automatically-counters-the"));
  // Rebel shipyard. "Look around." One printed warning, then the same second Flagship fight. No salvage is granted here.
  if (id === "c:rebel-shipyard:0") ctx.note(tx("wiki.cited-events.warning-lights-flash-as-scans-identify"));
  const fight = choice.fx.find((fx) => fx.k === "fight");
  if (fight && fight.k === "fight") {
    ctx.fight(fight.tier, fight.asteroid ? true : undefined);
    // Rock fight with boarders has no choice. Arrival calls this id.
    // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
    // Rock fight with boarders in asteroid field has no choice. Arrival calls this id.
    // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." asteroidfield=true.
    // INFERRED: the count is an inclusive whole number. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:rock-fight-with-boarders:0") {
      // Wiki citations:
      // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
      rockBoarders(g, 1, 3);
    }
    if (id === "c:rock-fight-with-boarders-in-asteroid-field:0") {
      // Wiki citations:
      // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
      rockBoarders(g, 1, 2);
    }
    // Mantis outcasts has no choice. Arrival calls this id.
    // "2-3 mantis boarders beam aboard your ship" and a Mantis ship (default rewards).
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:mantis-outcasts:0") mantisBoarders(g, 2, 3);
    // Zoltan border police has no choice. Arrival calls this id.
    // "3-4 zoltan boarders beam aboard your ship" and a Zoltan ship (default rewards).
    // INFERRED: inclusive 3..4. After ctx.fight: startCombat drops enemy crew already aboard.
    if (id === "c:zoltan-border-police:0") {
      // Wiki citations:
      // > "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)." — [[Zoltan border police]]
      zoltanBoarders(g, 3, 4);
    }
    // Rebel fight with boarders has no choice. Arrival calls this id.
    // INFERRED: inclusive 2..3. After ctx.fight: startCombat drops enemy crew already aboard.
    // Wiki citations:
    // > "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)." — [[Rebel fight with boarders]]
    if (id === "c:rebel-fight-with-boarders:0") humanBoarders(g, 2, 3, tx("wiki.cited-events.human-boarders-beam-aboard-your-ship"));
    // "2 slug boarders beam aboard your ship" (Slug hacker (medical)).
    if (id === "c:slug-hacker-medical:0") slugBoarders(g, 2, 2, tx("wiki.cited-events.slug-boarders-beam-aboard-your-ship"));
    // "crew entirely composed of Mantis" (Mantis ship-collectors; Zoltan ship follows Mantis ship; Legendary thief KazaaakplethKilik).
    // Wiki citations:
    // > "Fight a Mantis Fighter with crew entirely composed of Mantis." — [[Mantis ship-collectors]]
    if (id === "c:mantis-ship-collectors:0") allMantisCrew(g);
    if (id === "c:zoltan-ship-follows-mantis-ship:1" || id === "c:legendary-thief-kazaaakplethkilik:0") allMantisCrew(g);
    return true;
  }
  // Boarders: Humans in plasma storm has no choice. Arrival calls this id.
  // "3-4 human boarders beam aboard your ship" and medium scrap with resources. No enemy ship.
  // Resource amounts are not stated.
  if (id === "c:boarders-humans-in-plasma-storm:0") {
    plasmaHumanBoarders(g);
    return true;
  }
  // Pirate toll. "Pay their toll." One printed result. The 15-25 scrap is already spent above. No fight.
  if (id === "c:pirate-toll:0") {
    citedResult(g, tx("wiki.cited-events.you-made-the-right-decision-friend"), [tx("wiki.cited-events.you-avoid-the-fight")]);
    return true;
  }
  // The mercenary. "Hire the mercenary to delay the Rebels." One printed result. Scrap and the 2-turn delay are already applied.
  if (id === "c:the-mercenary:0") {
    const last = g.sector === 8 || g.sectorName === "The Last Stand";
    citedResult(g, tx("wiki.cited-events.the-mercenary-ship-masks-its-jump"), [
      last ? tx("wiki.cited-events.no-effect-in-the-last-stand") : tx("wiki.cited-events.rebel-fleet-is-delayed-for-2"),
    ]);
    return true;
  }
  // Federation deserters. "Offer supplies." 15-25 scrap and 1-3 fuel are already spent.
  // "The current sector map is revealed." This beacon chart has no hidden nodes, so that line uncovers none.
  // sectorMap is the between-sector chart and stays untouched.
  if (id === "c:federation-deserters:2") {
    citedResult(
      g,
      tx("wiki.cited-events.you-send-over-some-supplies-to"),
      [tx("wiki.cited-events.the-current-sector-map-is-revealed")],
    );
    return true;
  }
  // Remote settlement. Fire Beam and Fire Bomb. High scrap is already applied above.
  // "You receive a drone schematic with high scrap." Rewards, "Drone": "A random drone schematic & T scrap."
  if (id === "c:remote-settlement:2" || id === "c:remote-settlement:3") {
    const item = grantRandomItem(g, "drone");
    ctx.note(item);
    citedResult(
      g,
      id === "c:remote-settlement:2"
        ? tx("wiki.cited-events.the-pirate-watches-as-you-start")
        : tx("wiki.cited-events.the-pirate-watches-as-you-teleport"),
      [tx("wiki.cited-events.you-receive-a-drone-schematic-with-2"), item],
    );
    return true;
  }
  // No fuel: Engi ship repair. Hull Repair Drone spends 1 drone part and pays 4-6 fuel.
  // citedChoose does not read citedChoiceDisabled, so a missing drone returns before the part is spent.
  if (id === "c:no-fuel-engi-ship-repair:2") {
    // Wiki citations:
    // > "(Hull Repair Drone) Offer to help repair their hull. [ Drone parts lost: 1 ]" — [[No fuel: Engi ship repair]]
    // > "They happily accept your offer for help. Once the drone does its work they transfer over some fuel for your trouble." — [[No fuel: Engi ship repair]]
    // > "You receive Fuel gained: 4-6." — [[No fuel: Engi ship repair]]
    if (!ownsHullRepair(g) || g.player.parts < 1) return false;
    g.player.parts -= 1;
    const fuel = roll(ctx, 4, 6);
    g.fuel += fuel;
    const spent = tx("wiki.cited-events.drone-parts-1");
    const got = `${tx("wiki.cited-events.fuel")}: ${fuel}.`;
    ctx.note(spent);
    ctx.note(got);
    citedResult(g, tx("wiki.cited-events.they-happily-accept-your-offer"), [got, spent]);
    return true;
  }
  const questFx = choice.fx.find((fx) => fx.k === "quest");
  if (questFx && questFx.k === "quest") {
    if (choice.fx.some((fx) => fx.k === "close")) closeFight(g);
    const notes = choice.fx.flatMap((fx) => (fx.k === "note" ? [fx.text] : []));
    const line = addQuest(g, questFx.id);
    const sentence = notes.join("\n\n");
    result(g, sentence || line, undefined, sentence ? [line] : []);
    return true;
  }
  const gotoFx = choice.fx.find((fx) => fx.k === "goto");
  if (gotoFx && gotoFx.k === "goto") {
    const page = eventDef(gotoFx.id);
    if (!page) return false;
    pageCard(
      g,
      page.body,
      page.choices.map((next) => ({ id: next.id, label: next.label })),
    );
    g.paused = true;
    return true;
  }
  ctx.resolve();
  return true;
}
