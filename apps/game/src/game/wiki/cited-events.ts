import type { Beacon, Game, GameEvent } from "../types.ts";
import { adjustScrap } from "../extras/index.ts";
import { allEvents, allFillerLists, eventDef, fillerList, openingLine, warnPack } from "@stl/pack";
import type { EventDef as PackEvent } from "@stl/pack";
import { storedId } from "@stl/catalog/src/wiki/ftl-slugs.ts";
import { SECTOR_TYPES } from "@stl/catalog/src/wiki/sectors.ts";
import { CITED_EVENT_ROWS } from "./event-catalog.ts";
import { missingCard, missingChoose, missingDisabled, missingOwns } from "./cited-missing.ts";
import { ownedLock } from "./choice-locks.ts";
import { CITED_LOCKS } from "./choice-reqs.ts";
// @agent:beacon-mix. Per-sector beacon composition from the Sectors page.
import { mixBeacons } from "./beacon-mix.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
// Rock fight with boarders. Called only from citedChoose, after ctx.fight (surrender.ts imports sim.ts).
import {
  allMantisCrew,
  between,
  closeFight,
  crystalBoarders,
  humanBoarders,
  joinCrew,
  mantisBoarders,
  pageCard,
  plasmaHumanBoarders,
  scrapBand,
  rockBoarders,
  slugBoarders,
  zoltanBoarders,
} from "./surrender.ts";
import { rollPrice } from "./event-prices.ts";
import { eventGrade, rollGrade } from "./event-grades.ts";
import { addQuest, result } from "./quests.ts";
import { rollFuel } from "./fuel-gifts.ts";
import { stampStockLabels } from "./stock-labels.ts";
import { affordStock, partsLine, takeStock } from "./stock-spend.ts";
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

export function citedSystemHalf(
  id: string,
): Array<"shields" | "oxygen" | "weapons" | "engines"> | null {
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
 * Medium, low, and high all read the loaded reward table.
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

const RES_WORD: Record<ResId, string> = {
  scrap: "scrap",
  fuel: "fuel",
  missiles: "missiles",
  parts: "drone parts",
};

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
  return scrapBand(g, tier);
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
  // A page written inside an ftl.dat list (goto TRADER_LIST) keeps its choices on the list entry.
  for (const list of allFillerLists()) {
    for (const entry of list.entries) {
      for (const c of entry.page?.choices ?? []) if (c.id === id) return c;
    }
  }
  return null;
}

/** A goto names a page, or an ftl.dat eventList whose one page is drawn, as FTL draws it. */
function gotoPage(ctx: CitedChoice, id: string): PackEvent | undefined {
  const page = eventDef(id);
  if (page) return page;
  const entries = fillerList(id)?.entries ?? [];
  if (entries.length === 0) return undefined;
  const entry = entries[ctx.irand(entries.length)]!;
  return entry.page ?? eventDef(entry.id);
}

type TradeRes = "fuel" | "missiles" | "parts";

const TRADE_RESOURCES_TAKE =
  /^c:trade-resources:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

// Trade resources in nebula. One intro and the same four offers, and no odds.
// INFERRED: each offer is equally likely. The numbers are rolled once and stay on Trade.
const TRADE_RESOURCES_NEBULA_INTRO =
  "It's hard to see why, but this beacon is apparently a tourist destination. One of the ships at the small station is offering a deal.";

const TRADE_RESOURCES_NEBULA_TAKE =
  /^c:trade-resources-in-nebula:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

function tradeTake(id: string): RegExpExecArray | null {
  return TRADE_RESOURCES_TAKE.exec(id) ?? TRADE_RESOURCES_NEBULA_TAKE.exec(id);
}

function tradeNote(id: TradeRes, n: number): string {
  const word = id === "fuel" ? "Fuel" : id === "missiles" ? "Missiles" : "Drone parts";
  return `${word}: ${n}.`;
}

/** One opening sentence from the packed page. The draw stays between, over the packed list. A nested list spends one draw per list. */
function opening(g: Game, id: string): string {
  const key = storedId(id) ?? id;
  const picked = openingLine(key, (n) => between(g, [0, n - 1]));
  if (picked != null) return picked;
  const texts = eventDef(key)?.texts ?? [];
  const hi = texts.length > 0 ? texts.length - 1 : 0;
  return texts[between(g, [0, hi])] ?? "";
}

/** Trade-resource rows. The draw stays between, after the opening sentence. */
function tradeRows(id: string) {
  const rows = [];
  for (const row of eventDef(storedId(id))?.offers ?? []) if (row.k === "trade") rows.push(row);
  return rows;
}

function tradeResourcesEvent(g: Game, title: string): GameEvent {
  const intro = opening(g, "TRADER_CIV");
  const rows = tradeRows("TRADER_CIV");
  const offer = rows[between(g, [0, rows.length - 1])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = `You lose ${cost} ${RES_WORD[offer.pay]} and receive ${gain} ${RES_WORD[offer.get]}.`;
  return {
    title,
    body: `${intro} ${sentence}`,
    choices: [
      { id: `c:trade-resources:take:${offer.pay}:${cost}:${offer.get}:${gain}`, label: "Trade." },
      { id: "c:trade-resources:4", label: "Ignore." },
    ],
  };
}

function tradeResourcesNebulaEvent(g: Game, title: string): GameEvent {
  const rows = tradeRows("NEBULA_TRADER");
  const offer = rows[between(g, [0, rows.length - 1])]!;
  const cost = between(g, offer.cost);
  const gain = between(g, offer.gain);
  const sentence = `You lose ${cost} ${RES_WORD[offer.pay]} and receive ${gain} ${RES_WORD[offer.get]}.`;
  return {
    title,
    body: `${TRADE_RESOURCES_NEBULA_INTRO} ${sentence}`,
    choices: [
      {
        id: `c:trade-resources-in-nebula:take:${offer.pay}:${cost}:${offer.get}:${gain}`,
        label: "Trade.",
      },
      { id: "c:trade-resources-in-nebula:4", label: "Ignore." },
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

/** The wiki names an authored page's sectors by heading; the chart keys sectors by ftl.dat id. */
const SECTOR_ID = new Map(SECTOR_TYPES.map((row) => [row.name, row.id]));

// @agent:beacon-mix. Read-only view for beacon-mix.test.ts: the authored pages that name a sector (by ftl.dat id).
export function citedPagesFor(sectorId: string): readonly Readonly<EventDef>[] {
  return CITED_EVENT_ROWS.map((ev) => ({
    ...ev,
    sectors: ev.sectors.map((name) => SECTOR_ID.get(name) ?? name),
  })).filter((ev) => ev.sectors.includes(sectorId));
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
  const mine = loadedEvents().filter((ev) => ev.sectors.includes(g.sectorId));
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
      (b) =>
        b.kind !== "start" &&
        b.kind !== "exit" &&
        b.kind !== "boss" &&
        b.kind !== "store" &&
        !b.flag,
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

/** One Lanius row from the packed page. The resource draw stays between, then the cost, then the scrap. */
export function rollLaniusTrader(
  g: Game,
  better: boolean,
  id = "LANIUS_TRADER",
): LaniusTraderOffer {
  const band = better ? "better" : "base";
  const rows = [];
  for (const row of eventDef(storedId(id))?.offers ?? [])
    if (row.k === "lanius" && row.band === band) rows.push(row);
  const row = rows[between(g, [0, rows.length - 1])]!;
  return { res: row.res, cost: between(g, row.cost), scrap: between(g, row.scrap) };
}

export function laniusTraderOfferText(offer: LaniusTraderOffer): string {
  const word = offer.res === "parts" ? "drone parts" : offer.res;
  return `You lose ${offer.cost} ${word} and receive ${offer.scrap} scrap.`;
}

export function laniusTraderTakeId(offer: LaniusTraderOffer): string {
  return `q:lanius-trader:take:${offer.res}:${offer.cost}:${offer.scrap}`;
}

const SLUG_MOON_QUESTION =
  'As you drift closer, you are contacted by a Slug marooned on the moon\'s surface. "I shall join your crew, sssay I, if you can answer me this simple quesssstion. How many moons are there in orbit here?"';

const SLUG_MOON_CORRECT =
  '"That isss... correct. You sssurprise me. Human, is it? Yesss... we can be partners." The Slug beams aboard and joins your crew!';

const SLUG_MOON_WRONG =
  '"That issss... incorrect." Further, I have taken advantage of your lack of acuity to beam aboard your ship and steal your stuff!';

const SLUG_MOON_ASK = /^c:slug-moons-question:ask:(\d+)$/;
const SLUG_MOON_ANSWER = /^c:slug-moons-question:answer:(\d+):(\d+)$/;

/** Moon counts from the packed page. The draw stays between. The buttons stay the whole list, in order. */
function moonRows(id: string) {
  const rows = [];
  for (const row of eventDef(storedId(id))?.rolls ?? []) if (row.k === "count") rows.push(row);
  return rows;
}

/** Hide labels from the packed page. The draw stays between, after the bribe and the opening sentence. */
function hideLabels(id: string): string[] {
  const rows = [];
  for (const row of eventDef(storedId(id))?.rolls ?? []) if (row.k === "label") rows.push(row.text);
  return rows;
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
  const rows = moonRows("SLUG_DISTRESS_QUESTION");
  const row = rows[between(g, [0, rows.length - 1])]!;
  return {
    title,
    body: `You arrive near the distress beacon's signal.

You track the distress beacon with difficulty to one of the ${row.word} moons of a planet hidden in the nebula.`,
    choices: [{ id: `c:slug-moons-question:ask:${row.n}`, label: "Investigate." }],
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
    const title = ctx.g.beacons.find((b) => b.id === ctx.g.here)?.name ?? "Slug moons question";
    ctx.g.event = {
      title,
      body: SLUG_MOON_QUESTION,
      choices: moonRows("SLUG_DISTRESS_QUESTION").map((pick) => ({
        id: `c:slug-moons-question:answer:${n}:${pick.n}`,
        label: `${pick.word[0]!.toUpperCase()}${pick.word.slice(1)}.`,
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
    const grade = eventGrade("slug-moons-question");
    if (!grade) return false;
    const joined = joinCrew(ctx.g, grade.hire);
    const line = joined
      ? "You receive a Slug crewmember."
      : "There is no room aboard for the new crewmember.";
    ctx.note(line);
    citedResult(ctx.g, SLUG_MOON_CORRECT, [line]);
    return true;
  }
  // Wiki citations:
  // > "That issss... incorrect." — [[Slug moons question#Incorrect Answer]]
  // > "You lose Scrap lost: 35, Fuel lost: 2-4, Drone parts lost: 1-2." — [[Slug moons question#Incorrect Answer]]
  // "You lose 35 scrap, 2-4 fuel, and 1-2 drone parts." Inclusive ranges.
  // A shortfall returns before any spend, the same way a cited price does.
  const bill = rollGrade("slug-moons-question", (lo, hi) => roll(ctx, lo, hi));
  if (!bill) return false;
  const g = ctx.g;
  if (g.scrap < bill.scrap || g.fuel < bill.fuel || g.player.parts < bill.parts) return false;
  g.scrap -= bill.scrap;
  g.fuel -= bill.fuel;
  g.player.parts -= bill.parts;
  const paid: string[] = [];
  if (bill.scrap) paid.push(bill.scrap === 35 ? "Scrap: -35." : `Scrap: -${bill.scrap}.`);
  if (bill.fuel) paid.push(`Fuel: -${bill.fuel}.`);
  if (bill.parts) paid.push(`Drone parts: -${bill.parts}.`);
  for (const line of paid) ctx.note(line);
  citedResult(g, SLUG_MOON_WRONG, paid);
  return true;
}

const ZOLTAN_MOON_OPEN = "Something strikes you as odd about a moon in the distance.";
const ZOLTAN_MOON_CAVE =
  "It looks as if a team could break through the fragile layer of the moon's surface into a hidden cavern.";
const ZOLTAN_MOON_SHUTTLE =
  "Sending a shuttle to explore a beckoning cave system you discover signs of a battle - and a still-functioning weapon!";
const ZOLTAN_MOON_HEAP =
  "A deep scan of the surface reveals a cave system that runs for miles, and what looks like a scrap heap left over from some heavy-duty construction.";
const ZOLTAN_MOON_QUIET =
  "A closer inspection reveals signs of habitation on the surface, but nothing else particularly interesting.";
const ZOLTAN_MOON_LEAVE =
  "You try not to fixate on the moon in the aft scanner as you set the coordinates for the next jump.";
const ZOLTAN_MOON_BASE =
  "Your explosives reveal the 'cave' is actually a secret base, located in a network of bunkers just under the surface. Everyone inside is dead; Mantis clearly came through here recently. It looks like the Zoltan were researching advanced ship weaponry. You take one of the better examples back to your ship.";
const ZOLTAN_MOON_REMAINS =
  "A portion of the surface layer is destroyed in an impressive display, revealing miles of caves. You don't have time to fully explore them, but you find some remains of an old subterranean base that could be useful.";
const ZOLTAN_MOON_WASTE =
  "The explosives are set remotely, but the detonation achieves nothing. What a waste.";
const ZOLTAN_MOON_DRONE = `Initial scans indicate a network of caves not far underground. You launch a boarding drone and it breaks through the surface into the cavern below.

Your drone discovers a vast cave network and evidence of excavation. Buried deep below you find a Zoltan scientist, still hard at work. He tells you that all his colleagues are long dead. You decide not to ask questions and offer to let him join your crew.`;

function zoltanMoonTitle(g: Game): string {
  return g.beacons.find((b) => b.id === g.here)?.name ?? "Zoltan odd moon";
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
        label: "Check it out.",
      },
      {
        id: "c:zoltan-odd-moon:leave",
        // Wiki citations:
        // > "Leave it be." — [[Zoltan odd moon]]
        label: "Leave it be.",
      },
      {
        id: "c:zoltan-odd-moon:drone",
        // Wiki citations:
        // > "Send a drone to probe the surface." — [[Zoltan odd moon]]
        // > "(Boarding Drone)" — [[Zoltan odd moon]]
        // > "Drone parts lost: 1" — [[Zoltan odd moon]]
        label: "Send a drone to probe the surface.",
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
  const name = tier === "low" ? "Low" : tier === "medium" ? "Medium" : "High";
  const line = `${name} scrap: ${n}.`;
  ctx.note(line);
  return line;
}

function payTier(ctx: CitedChoice, tier: "low" | "medium"): string {
  const [lo, hi] = band(ctx.g, tier);
  const n = roll(ctx, lo, hi);
  ctx.scrap(n);
  const name = tier === "low" ? "Low" : "Medium";
  const line = `${name} scrap: ${n}.`;
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
            label:
              "Explosives are too valuable to waste on excavation work. Let's get out of here.",
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
      citedResult(g, ZOLTAN_MOON_SHUTTLE, ["You receive a weapon with low scrap.", line, item]);
      return true;
    }
    if (which === 2) {
      // Wiki citations:
      // > "A deep scan of the surface reveals a cave system that runs for miles, and what looks like a scrap heap left over from some heavy-duty construction." — [[Zoltan odd moon]]
      // > "You receive medium scrap." — [[Zoltan odd moon]]
      const line = payTier(ctx, "medium");
      citedResult(g, ZOLTAN_MOON_HEAP, ["You receive medium scrap.", line]);
      return true;
    }
    // Wiki citations:
    // > "A closer inspection reveals signs of habitation on the surface, but nothing else particularly interesting." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_QUIET, ["Nothing happens."]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:leave") {
    // Wiki citations:
    // > "You try not to fixate on the moon in the aft scanner as you set the coordinates for the next jump." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_LEAVE, ["Nothing happens."]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:spare") {
    // Wiki citations:
    // > "Explosives are too valuable to waste on excavation work. Let's get out of here." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, "Nothing happens.", ["Nothing happens."]);
    return true;
  }
  if (id === "c:zoltan-odd-moon:boom") {
    if (g.missiles < 1) return false;
    g.missiles -= 1;
    ctx.note("Missiles: -1.");
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
      citedResult(g, ZOLTAN_MOON_BASE, [
        "You receive a weapon with a random amount of scrap.",
        line,
        item,
        "Missiles: -1.",
      ]);
      return true;
    }
    if (which === 1) {
      // Wiki citations:
      // > "A portion of the surface layer is destroyed in an impressive display, revealing miles of caves. You don't have time to fully explore them, but you find some remains of an old subterranean base that could be useful." — [[Zoltan odd moon]]
      // > "You receive a random amount of scrap." — [[Zoltan odd moon]]
      const line = payRandomTier(ctx);
      citedResult(g, ZOLTAN_MOON_REMAINS, [
        "You receive a random amount of scrap.",
        line,
        "Missiles: -1.",
      ]);
      return true;
    }
    // Wiki citations:
    // > "The explosives are set remotely, but the detonation achieves nothing. What a waste." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    citedResult(g, ZOLTAN_MOON_WASTE, ["Nothing happens.", "Missiles: -1."]);
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
    const n = affordStock(g, id, "parts");
    if (!ownsBoardDrone(g) || n == null) return false;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    ctx.note(spent);
    // Crew: eight is the cap. A ninth is not added. This page does not print that refusal.
    const joined = joinCrew(g, "Zoltan");
    const line = joined
      ? "You receive a Zoltan crewmember."
      : "There is no room aboard for the new crewmember.";
    ctx.note(line);
    citedResult(g, ZOLTAN_MOON_DRONE, [line, spent]);
    return true;
  }
  return false;
}

/** Cards that roll a row off a campaign table on their own page, by the row kind they roll. */
const ROW_CARDS: Record<string, string> = {
  TRADER_CIV: "trade",
  NEBULA_TRADER: "trade",
  LANIUS_TRADER: "lanius",
  LANIUS_TRADER_TRANSLATOR: "lanius",
  FUEL_TRADER: "fuel",
  FUEL_TRADER_DISTRESS: "fuel",
  SLUG_DISTRESS_QUESTION: "count",
};
const warnedRows = new Set<string>();

/** A ftl.dat page under a campaign card's id carries no such table. It shows as the archive wrote it. */
function lacksRows(slug: string): boolean {
  const kind = ROW_CARDS[slug];
  if (!kind) return false;
  const page = eventDef(storedId(slug));
  const rows: { k: string }[] = [...(page?.offers ?? []), ...(page?.rolls ?? [])];
  if (rows.some((row) => row.k === kind)) return false;
  if (!warnedRows.has(slug)) {
    warnedRows.add(slug);
    warnPack(`Event ${slug} has no ${kind} rows; its page shows as written.`);
  }
  return true;
}

function citedEventRaw(g: Game, b: Beacon): GameEvent | null {
  const ev = matchEvent(b);
  if (!ev) return null;
  // The beacon holds the bare id, so a null card would fall through to the empty-beacon page.
  if (lacksRows(ev.slug)) return asWritten(ev);
  const missing = missingCard(g, b, ev);
  if (missing) return missing;
  if (ev.slug === "SLUG_DISTRESS_QUESTION") return slugMoonsCard(g, b, ev.dest);
  if (ev.slug === "ZOLTAN_ODD_MOON") return zoltanOddCard(ev.dest);
  if (ev.slug === "LANIUS_TRADER") {
    const offer = rollLaniusTrader(g, false);
    // The offer is rolled first so the shown trade stays on the same draws. The intro uses the next draw.
    const intro = opening(g, "LANIUS_TRADER");
    return {
      title: ev.dest,
      body: `${intro}\n\n${laniusTraderOfferText(offer)}`,
      choices: [
        { id: laniusTraderTakeId(offer), label: "Agree to the exchange." },
        { id: "c:lanius-trader:3", label: "Decline" },
        { id: "c:lanius-trader:4", label: "Ask for an alternative trade." },
      ],
    };
  }
  // Auto-ship near radar station. Combat Drone Mark I or II, or an Anti-Ship Beam Drone.
  if (ev.slug === "AUTO_DEFENSE_RADAR") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:auto-ship-near-radar-station:2",
          label: "Send a drone to distract the automated ship.",
        },
      ],
    };
  }
  // Auto-ship near storage station in nebula. Cloaking, Improved Cloaking, Hacking, and Improved Hacking.
  if (ev.slug === "NEBULA_AUTO_DEFENSE_ITEM") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:auto-ship-near-storage-station-in-nebula:2",
          label: "Attempt to stealthily access the space station.",
        },
        {
          id: "c:auto-ship-near-storage-station-in-nebula:3",
          label: "Use your stealth to access the space station.",
        },
        {
          id: "c:auto-ship-near-storage-station-in-nebula:4",
          label: "Try to hack the station to prevent an alert.",
        },
        {
          id: "c:auto-ship-near-storage-station-in-nebula:5",
          label: "Hack the station to prevent an alert.",
        },
      ],
    };
  }
  // Pirate ship attacking civilian distress. Improved Weapons is Weapon Control level 6+.
  if (ev.slug === "PIRATE_CIVILIAN_BEACON") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:pirate-ship-attacking-civilian-distress:2",
          label: "Fire a warning shot from your strongest weapon.",
        },
      ],
    };
  }
  // Zoltan security checkpoint. Profiling, a Slug, and Mind Control. The attack stays the fight.
  if (ev.slug === "ZOLTAN_CREW_SCAN") {
    // Wiki citations:
    // > "Submit to profiling." — [[Zoltan security checkpoint]]
    // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
    // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:zoltan-security-checkpoint:1", label: "Submit to profiling." },
        {
          id: "c:zoltan-security-checkpoint:2",
          label: "Have your Slug talk them into letting you go.",
        },
        {
          id: "c:zoltan-security-checkpoint:3",
          label: "Make the guards believe they have already checked your crew today.",
        },
      ],
    };
  }
  // Escort civilians FTL haywire. Advanced FTL Navigation uploads the route. Leading them stays the low scrap and the marker.
  if (ev.slug === "ESCORT_BEACON") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:escort-civilians-ftl-haywire:2",
          label:
            "Have your navigation software calculate and upload route instructions to their ship.",
        },
      ],
    };
  }
  // Slug drink. Drink, and a Rock crewmember poses as captain. Refuse stays the fight.
  if (ev.slug === "SLUG_DRINK") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:slug-drink:1", label: "Drink." },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:slug-drink:2", label: "Have your Rockman pose as captain." },
      ],
    };
  }
  // Rock ship in plasma storm. A Rock crewmember leads them out.
  if (ev.slug === "NEBULA_ROCK_RACIST") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:rock-ship-in-plasma-storm:2", label: "Offer to lead them out of the nebula." },
      ],
    };
  }
  // Deactivated Auto-ship. Download, and Sensors level 3. The strip choice is already on the card.
  if (ev.slug === "BROKEN_REBEL_DRONE") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "c:deactivated-auto-ship:1", label: "Attempt to download the ship's data stores." },
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:deactivated-auto-ship:2", label: "Remotely scan the ship." },
      ],
    };
  }
  // Auto-ship fight in plasma storm. Engines 3-5, Engines 6+, and Cloaking.
  if (ev.slug === "STORM_AUTO") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:auto-ship-fight-in-plasma-storm:1", label: "Attempt to out-run it." },
        { id: "c:auto-ship-fight-in-plasma-storm:2", label: "Attempt to out-run it." },
        { id: "c:auto-ship-fight-in-plasma-storm:3", label: "Use your cloaking to escape." },
      ],
    };
  }
  // Auto-ship near storage station. Cloaking is a blue option.
  if (ev.slug === "AUTO_DEFENSE_ITEM") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:auto-ship-near-storage-station:2",
          label: "Attempt to cloak and access the cache.",
        },
      ],
    };
  }
  // Auto-ship near sensor station. Sensors level 3 and a Crew Teleporter are blue options.
  if (ev.slug === "AUTO_DEFENSE_MAP") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:auto-ship-near-sensor-station:2",
          label: "Use your sensors to attempt to access the data.",
        },
        {
          id: "c:auto-ship-near-sensor-station:3",
          label: "Beam directly onto the station to try to avoid detection.",
        },
      ],
    };
  }
  // Trade resources. One rolled offer is shown before Trade or Ignore. Not the nebula page.
  if (ev.slug === "TRADER_CIV") return tradeResourcesEvent(g, ev.dest);
  // Trade resources in nebula. One intro, then one rolled offer. Trade or Ignore. No scrap.
  if (ev.slug === "NEBULA_TRADER") return tradeResourcesNebulaEvent(g, ev.dest);
  // Pirate smuggler. {{Blue Option|Weapons|level=6+}}. The button stays visible.
  if (ev.slug === "NEBULA_PIRATE_SMUGGLE") {
    return {
      title: ev.dest,
      body: "A pirate ship arrives shortly after you. Judging from the fact that it is attempting to avoid your ship, you assume that it's a smuggler trying to stay away from beacons.",
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        { id: "c:pirate-smuggler:2", label: "Activate your advanced weapons threateningly." },
      ],
    };
  }
  // Pirate fight has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "PIRATE") {
    return {
      title: ev.dest,
      body: opening(g, "PIRATE"),
      choices: [{ id: "c:pirate-fight:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "NEBULA_PIRATE") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight in nebula]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight in nebula]]
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_PIRATE"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight in nebula has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship (default rewards)." nebula=true. unique=false. No nebula environment is added.
  if (ev.slug === "NEBULA_REBEL") {
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_REBEL"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Auto-ship fight in nebula has no choice. Arrival calls c:auto-ship-fight-in-nebula:0.
  // One of the five printed intros. "Fight an Auto-ship." nebula=true. unique=false.
  if (ev.slug === "NEBULA_AUTO") {
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_AUTO"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock atheists. {{Blue Option|Improved Sensors|level=2+}}. The button stays visible.
  if (ev.slug === "ROCK_ATHIEST") {
    return {
      title: ev.dest,
      body: "You encounter a small craft with minimal propulsion; its Rock crew-member explains that the Rock home-world is run on lies and propaganda that keep the populace in check, and that they want no part of it.",
      choices: [
        { id: "c:rock-atheists:0", label: "Tell them their god sent them here to join your crew." },
        {
          id: "c:rock-atheists:1",
          label: "Promise to share with them the truths they've been denied.",
        },
        { id: "c:rock-atheists:2", label: "Show them to your data suite." },
      ],
    };
  }
  // Pirate ship selling drones. Hail, then dock. The unnamed schematic is not a button.
  if (ev.slug === "PIRATE_SALESMAN") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        { id: "q:pirate-drones:hail", label: "Hail the ship." },
        { id: "c:pirate-ship-selling-drones:1", label: "Attack him before he can attack!" },
        { id: "c:pirate-ship-selling-drones:2", label: "Quickly prepare to jump away." },
      ],
    };
  }
  // Rebel fight (Lanius) has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "LANIUS_REBEL_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_REBEL_FIGHT"),
      choices: [{ id: "c:rebel-fight-lanius:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight with boarders. One of the two printed intros. The fight stays c:rock-fight-with-boarders:0.
  if (ev.slug === "ROCK_BOARDERS_SHIP") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders]]
    // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_BOARDERS_SHIP"),
      choices: [{ id: "c:rock-fight-with-boarders:0", label: "Fight a Rock ship" }],
    };
  }
  // Auto-ship fight has no choice. Arrival calls c:auto-ship-fight:0.
  // One of the nine printed intros. "Fight an Auto-ship." unique=false.
  if (ev.slug === "REBEL_AUTO") {
    return {
      title: ev.dest,
      body: opening(g, "REBEL_AUTO"),
      choices: [{ id: "c:auto-ship-fight:0", label: "Fight an Auto-ship" }],
    };
  }
  // Auto-ship warning has no choice. Arrival calls c:auto-ship-warning:0.
  // The page shares those nine intros. "Fight an Auto-ship that is running away."
  // The red line is the escape: Rebel Fleet pursuit is doubled. unique=true.
  if (ev.slug === "AUTO_WARNING") {
    return {
      title: ev.dest,
      body: opening(g, "AUTO_WARNING"),
      choices: [{ id: "c:auto-ship-warning:0", label: "Fight an Auto-ship that is running away" }],
    };
  }
  // Rebel fight with boarders. One of the four printed intros. The fight stays c:rebel-fight-with-boarders:0.
  if (ev.slug === "BOARDERS_REBEL_SHIP") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight with boarders]]
    return {
      title: ev.dest,
      body: opening(g, "BOARDERS_REBEL_SHIP"),
      choices: [{ id: "c:rebel-fight-with-boarders:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight with boarders in asteroid field. One of the two printed intros. The fight stays c:rock-fight-with-boarders-in-asteroid-field:0.
  if (ev.slug === "ROCK_BOARDERS_ASTEROID") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders in asteroid field]]
    // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_BOARDERS_ASTEROID"),
      choices: [
        { id: "c:rock-fight-with-boarders-in-asteroid-field:0", label: "Fight a Rock ship" },
      ],
    };
  }
  // Lanius fight has no choice. Arrival calls this fight.
  // One of the eleven printed intros, including the repeated line. "Fight a Lanius ship (default Lanius rewards)." unique=false.
  if (ev.slug === "LANIUS_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_FIGHT"),
      choices: [{ id: "c:lanius-fight:0", label: "Fight a Lanius ship" }],
    };
  }
  // Mantis fight (Engi) has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "ENGI_MANTIS_FIGHT") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight (Engi)]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Engi)]]
    return {
      title: ev.dest,
      body: opening(g, "ENGI_MANTIS_FIGHT"),
      choices: [{ id: "c:mantis-fight-engi:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Mantis ship (default rewards)." nebula=true. unique=false.
  if (ev.slug === "NEBULA_MANTIS_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_MANTIS_FIGHT"),
      choices: [{ id: "c:mantis-fight-in-nebula:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight has no choice. Arrival calls this fight.
  // One of the twenty printed intros. "Fight a Mantis ship (default rewards)." unique=false.
  if (ev.slug === "MANTIS_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "MANTIS_FIGHT"),
      choices: [{ id: "c:mantis-fight:0", label: "Fight a Mantis ship" }],
    };
  }
  // Mantis fight choice. One of the six printed intros. Attack, conceal, and cloaking stay on the def.
  if (ev.slug === "MANTIS_FIGHT_CHOICE") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight choice]]
    return {
      title: ev.dest,
      body: opening(g, "MANTIS_FIGHT_CHOICE"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Mantis ship attacking civilian. One of the five printed intros. Both printed choices stay.
  if (ev.slug === "MANTIS_CIVILIAN") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Mantis ship attacking civilian]]
    return {
      title: ev.dest,
      body: opening(g, "MANTIS_CIVILIAN"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian. One of the six printed intros. Both printed choices stay.
  if (ev.slug === "PIRATE_CIVILIAN") {
    return {
      title: ev.dest,
      body: opening(g, "PIRATE_CIVILIAN"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship attacking civilian (Lanius). One of the three printed intros. Both printed choices stay.
  if (ev.slug === "LANIUS_PIRATE_CIVILIAN") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_PIRATE_CIVILIAN"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Zoltan fight has no choice. Arrival calls c:zoltan-fight:0.
  // One of the seven printed intros. "Fight a Zoltan ship (default rewards)." unique=false.
  if (ev.slug === "ZOLTAN_FIGHT") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Zoltan fight]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan fight]]
    return {
      title: ev.dest,
      body: opening(g, "ZOLTAN_FIGHT"),
      choices: [{ id: "c:zoltan-fight:0", label: "Fight a Zoltan ship" }],
    };
  }
  // Crystal fight has no choice. Arrival calls c:crystal-fight:0.
  // One of the seven printed intros. "Fight a Crystal ship (default rewards)." unique=false.
  if (ev.slug === "CRYSTAL_FIGHT") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Crystal fight]]
    // > "Fight a Crystal ship (default rewards)." — [[Crystal fight]]
    return {
      title: ev.dest,
      body: opening(g, "CRYSTAL_FIGHT"),
      choices: [{ id: "c:crystal-fight:0", label: "Fight a Crystal ship (default rewards)" }],
    };
  }
  // Rebel fight among Rebel fleet has no choice. Arrival calls this fight.
  // One of the seven printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "BOSS_FLEETS_REBEL") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight among Rebel fleet]]
    // > "Fight a Rebel ship." — [[Rebel fight among Rebel fleet]]
    // > "no surrender offers, no escape attempts" — [[Rebel fight among Rebel fleet]]
    return {
      title: ev.dest,
      body: opening(g, "BOSS_FLEETS_REBEL"),
      choices: [{ id: "c:rebel-fight-among-rebel-fleet:0", label: "Fight a Rebel ship" }],
    };
  }
  // The mercenary. One of the six printed intros. Delay, Fight, and Decline stay the existing choices.
  if (ev.slug === "MERCENARY") {
    return {
      title: ev.dest,
      body: opening(g, "MERCENARY"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship supplying civilians. One of the five printed intros. Attack and Leave stay the existing choices.
  if (ev.slug === "REBEL_HELPERS") {
    return {
      title: ev.dest,
      body: opening(g, "REBEL_HELPERS"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel ship attacking Federation loyalists. One of the three printed intros. Aid and Escape stay the existing choices.
  if (ev.slug === "REBEL_VS_FEDERATION") {
    return {
      title: ev.dest,
      body: opening(g, "REBEL_VS_FEDERATION"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate briber. One of the three printed intros. Accept and Attack stay the existing choices.
  if (ev.slug === "PIRATE_BRIBER") {
    return {
      title: ev.dest,
      body: opening(g, "PIRATE_BRIBER"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in nebula has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Slug ship (default rewards)." nebula=true. unique=false. No nebula environment is added. Surrender stays the Slug row.
  if (ev.slug === "NEBULA_SLUG_FIGHT") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in nebula]]
    // > "Fight a Slug ship (default rewards)." — [[Slug fight in nebula]]
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_SLUG_FIGHT"),
      choices: [{ id: "c:slug-fight-in-nebula:0", label: "Fight a Slug ship" }],
    };
  }
  // Lanius ship attacking civilian. One of the three printed intros. Attack and Avoid stay the existing choices.
  if (ev.slug === "LANIUS_CIVILIAN") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_CIVILIAN"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Lanius ship salvager. One of the five printed intros. Attack, Leave, and the scrap request stay the existing choices.
  if (ev.slug === "LANIUS_SOLO_SALVAGE") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_SOLO_SALVAGE"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rebel fight among Federation and Rebel fleets has no choice. Arrival calls this fight.
  // One of the six printed intros. "Fight a Rebel ship." unique=false. The low scrap and medium scrap payouts stay the winning results.
  if (ev.slug === "BOSS_FLEETS_BOTH_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "BOSS_FLEETS_BOTH_FIGHT"),
      choices: [
        { id: "c:rebel-fight-among-federation-and-rebel-fleets:0", label: "Fight a Rebel ship" },
      ],
    };
  }
  // Escort civilians. One of the three printed intros. Accept and Decline stay the existing choices.
  if (ev.slug === "QUEST_ESCORT") {
    return {
      title: ev.dest,
      body: opening(g, "QUEST_ESCORT"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Trade fuel for drone parts. One of the three printed intros. The trade and the reject stay the existing choices.
  if (ev.slug === "FUEL_FOR_DRONE") {
    return {
      title: ev.dest,
      body: opening(g, "FUEL_FOR_DRONE"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Rock pirates fight near sun has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." redgiant=true. unique=true.
  if (ev.slug === "ROCK_PIRATE_SUN") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight near sun]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight near sun]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_PIRATE_SUN"),
      choices: [{ id: "c:rock-pirates-fight-near-sun:0", label: "Fight a Rock pirate ship" }],
    };
  }
  // Rock pirates fight in asteroid field has no choice. Arrival calls this fight.
  // One of the two printed intros. "Fight a Rock pirate ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "ROCK_PIRATE_ASTEROID") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight in asteroid field]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight in asteroid field]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_PIRATE_ASTEROID"),
      choices: [
        { id: "c:rock-pirates-fight-in-asteroid-field:0", label: "Fight a Rock pirate ship" },
      ],
    };
  }
  // Rock fight in asteroid field has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock ship (default rewards)." asteroidfield=true. unique=true.
  if (ev.slug === "ROCK_FIGHT_ASTEROID") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight in asteroid field]]
    // > "Fight a Rock ship (default rewards)." — [[Rock fight in asteroid field]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_FIGHT_ASTEROID"),
      choices: [{ id: "c:rock-fight-in-asteroid-field:0", label: "Fight a Rock ship" }],
    };
  }
  // Rebel fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "SLUG_REBEL") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight (Slug)]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Slug)]]
    return {
      title: ev.dest,
      body: opening(g, "SLUG_REBEL"),
      choices: [{ id: "c:rebel-fight-slug:0", label: "Fight a Rebel ship" }],
    };
  }
  // Pirate fight (Slug) has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "SLUG_PIRATE") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Slug)]]
    return {
      title: ev.dest,
      body: opening(g, "SLUG_PIRATE"),
      choices: [{ id: "c:pirate-fight-slug:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight (Lanius) has no choice. Arrival calls this fight.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "LANIUS_PIRATE_FIGHT") {
    return {
      title: ev.dest,
      body: opening(g, "LANIUS_PIRATE_FIGHT"),
      choices: [{ id: "c:pirate-fight-lanius:0", label: "Fight a Pirate ship" }],
    };
  }
  // Pirate fight (Zoltan) has no choice. Arrival calls c:pirate-fight-zoltan:0.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  if (ev.slug === "ZOLTAN_PIRATE") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Zoltan)]]
    // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Zoltan)]]
    return {
      title: ev.dest,
      body: opening(g, "ZOLTAN_PIRATE"),
      choices: [{ id: "c:pirate-fight-zoltan:0", label: "Fight a Pirate ship" }],
    };
  }
  // Rock pirates fight has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rock pirate ship (default rewards)." unique=false.
  if (ev.slug === "ROCK_PIRATE") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight]]
    // > "Fight a Rock pirate ship (default rewards)." — [[Rock pirates fight]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_PIRATE"),
      choices: [{ id: "c:rock-pirates-fight:0", label: "Fight a Rock pirate ship" }],
    };
  }
  // Rebel fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Rebel ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "REBEL_PULSAR") {
    return {
      title: ev.dest,
      body: opening(g, "REBEL_PULSAR"),
      choices: [{ id: "c:rebel-fight-near-pulsar:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rock fight has no choice. Arrival calls this fight.
  // One of the eight printed intros. "Fight a Rock ship (default rewards)." unique=false.
  if (ev.slug === "ROCK_SHIP") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight]]
    // > "Fight a Rock ship (default rewards)." — [[Rock fight]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_SHIP"),
      choices: [{ id: "c:rock-fight:0", label: "Fight a Rock ship" }],
    };
  }
  // Pirate fight near pulsar has no choice. Arrival calls this fight.
  // One of the three printed intros. "Fight a Pirate ship (default rewards)." pulsar=true. unique=true.
  if (ev.slug === "PIRATE_PULSAR") {
    return {
      title: ev.dest,
      body: opening(g, "PIRATE_PULSAR"),
      choices: [{ id: "c:pirate-fight-near-pulsar:0", label: "Fight a Pirate ship" }],
    };
  }
  // Rebel fight has no choice. Arrival calls this fight.
  // One of the ten printed intros. "Fight a Rebel ship (default rewards)." unique=false.
  if (ev.slug === "REBEL") {
    return {
      title: ev.dest,
      body: opening(g, "REBEL"),
      choices: [{ id: "c:rebel-fight:0", label: "Fight a Rebel ship" }],
    };
  }
  // Rebel checkpoint. The bribe is the packed scrap band, shown on the button.
  if (ev.slug === "REBEL_CHECKPOINT") {
    const cost = rollPrice(ev.slug, "bribe", (lo, hi) => between(g, [lo, hi]));
    const body = opening(g, "REBEL_CHECKPOINT");
    const labels = hideLabels("REBEL_CHECKPOINT");
    const choices = [
      { id: "c:rebel-checkpoint:0", label: "Fend for yourself, attack, and escape." },
    ];
    if (cost != null) {
      choices.push({
        id: `q:rebel-checkpoint:bribe:${cost}`,
        label: `Bribe the Rebels to release the civilian ships. [${cost} scrap]`,
      });
    }
    choices.push({
      id: "c:rebel-checkpoint:1",
      label: labels[between(g, [0, labels.length - 1])]!,
    });
    return { title: ev.dest, body, choices };
  }
  // Lanius trader with translator. The printed hail, then the same one shown base trade. No better-band blue option.
  if (ev.slug === "LANIUS_TRADER_TRANSLATOR") {
    const offer = rollLaniusTrader(g, false, "LANIUS_TRADER_TRANSLATOR");
    return {
      title: ev.dest,
      body: `A Lanius merchant appears to have a significantly improved translator as you clearly understand their message. "Metal content more than sufficient. Does your ship care to exchange resources for our excess metal?"

${laniusTraderOfferText(offer)}`,
      choices: [
        {
          id: `q:lanius-translator:take:${offer.res}:${offer.cost}:${offer.scrap}`,
          label: "Agree to the exchange.",
        },
        { id: "c:lanius-trader-with-translator:3", label: "Decline" },
        {
          id: "c:lanius-trader-with-translator:4",
          label: "Decline but ask about their translation device.",
        },
      ],
    };
  }
  // Rebel ship attacking civilians in Last Stand. One of the five printed intros. Both choices stay.
  if (ev.slug === "BOSS_SCOUT_RESCUE") {
    return {
      title: ev.dest,
      body: opening(g, "BOSS_SCOUT_RESCUE"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Free scrap with resources. One of the six printed intros. The gift stays c:free-scrap-with-resources:0.
  if (ev.slug === "FREE_ITEMS") {
    return {
      title: ev.dest,
      body: opening(g, "FREE_ITEMS"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Pirate ship distress trap has no choice. Arrival calls this fight.
  // One of the four printed intros. No odds. INFERRED: equal. "Fight a Pirate ship (default rewards)." distress=true. unique=true.
  if (ev.slug === "TRAP_BEACON") {
    return {
      title: ev.dest,
      body: opening(g, "TRAP_BEACON"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Slug fight in plasma storm has no choice. Arrival calls this fight.
  // One of the four printed intros. "Fight a Slug ship (default rewards)." plasmastorm=true. unique=false. The beacon stays outside a nebula. Surrender stays the Slug row.
  if (ev.slug === "STORM_SLUG_FIGHT") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in plasma storm]]
    // > "Note: This event has a plasma storm environment, but the beacon is not inside a nebula." — [[Slug fight in plasma storm]]
    // > "Fight a Slug ship (default rewards)." — [[Slug fight in plasma storm]]
    return {
      title: ev.dest,
      body: opening(g, "STORM_SLUG_FIGHT"),
      choices: [{ id: "c:slug-fight-in-plasma-storm:0", label: "Fight a Slug ship" }],
    };
  }
  // Boarders: Mantis. One of the three printed intros. The boarders stay c:boarders-mantis:0.
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Mantis]]
  // > "2-4 mantis boarders beam aboard your ship." — [[Boarders: Mantis]]
  if (ev.slug === "MANTIS_BOARDERS") {
    return {
      title: ev.dest,
      body: opening(g, "MANTIS_BOARDERS"),
      choices: [{ id: "c:boarders-mantis:0", label: "2-4 mantis boarders beam aboard your ship." }],
    };
  }
  // Boarders: Humans in nebula. One of the three printed intros. The boarders stay c:boarders-humans-in-nebula:0.
  if (ev.slug === "NEBULA_BOARDING") {
    return {
      title: ev.dest,
      body: opening(g, "NEBULA_BOARDING"),
      choices: [
        { id: "c:boarders-humans-in-nebula:0", label: "2-4 human boarders beam aboard your ship." },
      ],
    };
  }
  // Boarders: Crystal. One of the three printed intros. The boarders stay c:boarders-crystal:0.
  if (ev.slug === "BOARDERS_CRYSTAL") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Crystal]]
    // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
    return {
      title: ev.dest,
      body: opening(g, "BOARDERS_CRYSTAL"),
      choices: [
        { id: "c:boarders-crystal:0", label: "2-3 crystal boarders beam aboard your ship." },
      ],
    };
  }
  // Boarders: Rockmen near sun. One of the two printed intros. The boarders stay c:boarders-rockmen-near-sun:0.
  if (ev.slug === "ROCK_BOARDERS_SUN") {
    // Wiki citations:
    // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Rockmen near sun]]
    // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
    return {
      title: ev.dest,
      body: opening(g, "ROCK_BOARDERS_SUN"),
      choices: [
        { id: "c:boarders-rockmen-near-sun:0", label: "2-3 rock boarders beam aboard your ship." },
      ],
    };
  }
  // Boarders: Humans (Pirate). One of the five printed intros. The boarders stay c:boarders-humans-pirate:0.
  if (ev.slug === "BOARDERS") {
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
      body: opening(g, "BOARDERS"),
      choices: [
        { id: "c:boarders-humans-pirate:0", label: "3-5 human boarders beam aboard your ship." },
      ],
    };
  }
  // Free weapon. One of the six printed intros. The gift stays c:free-weapon:0.
  if (ev.slug === "FIND_WEAPON") {
    return {
      title: ev.dest,
      body: opening(g, "FIND_WEAPON"),
      choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  // Space station under construction. {{Blue Option|Lanius Crew|Offer to have your crewmember help.}}
  // The button stays visible. Agreeing to the sale is the follow-up card in wiki/quests.ts.
  if (ev.slug === "QUEST_CONSTRUCTIONYARD") {
    return {
      title: ev.dest,
      body: ev.body,
      choices: [
        ...ev.choices.map((c) => ({ id: c.id, label: c.label })),
        {
          id: "c:space-station-under-construction:2",
          label: "Offer to have your crewmember help.",
        },
      ],
    };
  }
  return asWritten(ev);
}

/** The page's own text and choices. */
function asWritten(ev: EventDef): GameEvent {
  return {
    title: ev.dest,
    body: ev.body,
    choices: ev.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

export function citedEvent(g: Game, b: Beacon): GameEvent | null {
  const ev = citedEventRaw(g, b);
  if (!ev) return null;
  ev.choices = stampStockLabels(ev.choices);
  return ev;
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsBoardDrone(g: Game): boolean {
  const kit = g.player.kits.drones;
  if (!kit) return false;
  return kit.target === "BOARDER" || (kit.loadout ?? []).includes("BOARDER");
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsHullRepair(g: Game): boolean {
  const kit = g.player.kits.drones;
  if (!kit) return false;
  return kit.target === "SHIP_REPAIR" || (kit.loadout ?? []).includes("SHIP_REPAIR");
}

export function citedChoiceDisabled(g: Game, id: string): string | null {
  const missing = missingDisabled(g, id);
  if (missing) return missing;
  const locked = ownedLock(g, id, CITED_LOCKS);
  if (locked) return locked;
  // Zoltan odd moon. Boarding Drone. INFERRED: the refusal lines. The page names the drone and the part.
  // Wiki citations:
  // > "(Boarding Drone)" — [[Zoltan odd moon]]
  // > "Drone parts lost: 1" — [[Zoltan odd moon]]
  // No fuel: Engi ship repair. Hull Repair Drone, 1 drone part.
  // INFERRED: the refusal lines. The page names the drone and the part.
  // Wiki citations:
  // > "(Hull Repair Drone) Offer to help repair their hull. [ Drone parts lost: 1 ]" — [[No fuel: Engi ship repair]]
  // Destroyed cargo ship. Advanced Sensors prints level=2+. Long-Ranged Scanners is the augment.
  // INFERRED: the refusal lines. The page names the requirement and does not print these sentences.
  // Wiki citations:
  // > "(Advanced Sensors) Run an advanced scan on the boxes. (Requires level 2+ Sensors)" — [[Destroyed cargo ship]]
  // > "(Long-Ranged Scanners) Run an advanced scan on the boxes." — [[Destroyed cargo ship]]
  // Auto-ship carrying shield virus. Hacking, "Counter the remote hacking."
  // INFERRED: the refusal line. The page names Hacking and does not print the sentence.
  // Crystalline ship messaging about Rebels. Distraction Buoys.
  // INFERRED: the refusal line. The page names the augment and does not print the refusal sentence.
  // Remote settlement. {{Blue Option|Fire Beam}} and {{Blue Option|Fire Bomb}}.
  // INFERRED: the refusal sentences. The page names the requirement and does not print the refusal.
  const take = tradeTake(id);
  if (take) {
    const pay = take[1] as TradeRes;
    const cost = Number(take[2]);
    if (stock(g, pay) < cost) return `Need ${cost} ${RES_WORD[pay]}`;
    return null;
  }
  const choice = findChoice(id);
  if (!choice) return null;
  for (const fx of choice.fx) {
    if (fx.k === "res" && fx.sign < 0 && stock(g, fx.id) < fx.lo) {
      return `Need ${fx.lo} ${RES_WORD[fx.id]}`;
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

const RES_LABEL: Record<ResId, string> = {
  scrap: "Scrap",
  fuel: "Fuel",
  missiles: "Missiles",
  parts: "Drone parts",
};

/** Rolls and pays a choice's or page's res effects. False, and nothing paid, when a cost is more than the ship holds. */
function payRes(
  ctx: CitedChoice,
  fxs: readonly Fx[],
  id: string,
  note: (text: string) => void,
  costLines = false,
): boolean {
  const g = ctx.g;
  const costs: { id: ResId; n: number }[] = [];
  const gains: { id: ResId; n: number }[] = [];
  for (const fx of fxs) {
    if (fx.k !== "res") continue;
    const n = roll(ctx, fx.lo, fx.hi);
    if (fx.sign < 0) {
      if (stock(g, fx.id) < n) return false;
      costs.push({ id: fx.id, n });
    } else gains.push({ id: fx.id, n });
  }
  for (const c of costs) {
    spend(g, c.id, c.n);
    if (costLines) note(`${RES_LABEL[c.id]}: -${c.n}.`);
  }
  for (const gn of gains) {
    const thanks = gn.id === "scrap" ? sellStationThanks(id) : null;
    if (thanks) {
      // Score: Scrap Recovery Arm's bonus is not eligible. Repair Arm's cut stays in the eligible amount.
      const got = adjustScrap(g, gn.n);
      if (got > 0) g.scrap += got;
      if (gn.n > 0) g.scrapCollected = (g.scrapCollected ?? 0) + gn.n;
      note(thanks);
      note(`You receive ${got} scrap.`);
      continue;
    }
    if (gn.id === "scrap") ctx.scrap(gn.n);
    else if (gn.id === "fuel") g.fuel += gn.n;
    else if (gn.id === "missiles") g.missiles += gn.n;
    else g.player.parts += gn.n;
    note(`${RES_LABEL[gn.id]}: ${gn.n}.`);
  }
  return true;
}

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
    return '"Thank you, this will help greatly."';
  }
  if (
    id === "c:sell-drone-parts-for-scrap:0" ||
    id === "c:sell-drone-parts-for-scrap:1" ||
    id === "c:sell-drone-parts-for-scrap:2"
  ) {
    return '"Thank you for your business."';
  }
  return null;
}

const CRYSTAL_PLANS = "c:crystalline-ship-messaging-about-rebels";
const CRYSTAL_OUTRUN =
  "It was never your intention to lead the Rebels here, and frankly you could do with the scrap. The Crystalline ship immediately jumps off to inform the Rebels, leaving you with a fleet to outrun!";
const CRYSTAL_CRUISE =
  "Unable to interpret it themselves, the Crystalline Beings assume your data will mean something to the Rebels. It should see the pursuing fleet taking a leisurely cruise before they get back on track.";
const CRYSTAL_LIE =
  "They take one look at your fake telemetry and realize what you've done. They apparently do not take being lied to well - they immediately attack";
const CRYSTAL_BUOY =
  "Your distraction buoy allows you to create a very convincing flight plan. They accept it as true and give you the scrap. The deception may not be the most honorable tactic but staying ahead of the fleet is your highest priority.";
const CRYSTAL_REFUSE =
  "You apologize for the trouble you've brought them, but explain that you have no choice. They seem to understand, and break the comm link to set about preparing defenses.";

function citedResult(g: Game, sentence: string, paid: string[]) {
  const title = g.beacons.find((b) => b.id === g.here)?.name ?? "Event";
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
  const line = `High scrap: ${n}.`;
  ctx.note(line);
  return line;
}

/** Existing faster fx: one extra step, not a doubled column. */
function doubledPursuit(ctx: CitedChoice): string {
  ctx.g.fleet += 1;
  const line = "Rebel Fleet pursuit is doubled for 1 jump.";
  ctx.note(line);
  return line;
}

function delayedPursuit(ctx: CitedChoice): string {
  ctx.g.fleet = Math.max(0, ctx.g.fleet - 1);
  const line = "Rebel Fleet pursuit is delayed for 1 jump.";
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
    ctx.fight("Crystal ship");
    // INFERRED: the count is inclusive. The boarders are added after the fight starts. A new fight keeps intruders already aboard.
    crystalBoarders(g, 1, 2);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:2`) {
    if (!g.augments.includes("FLEET_DISTRACTION")) return false;
    citedResult(g, CRYSTAL_BUOY, [highScrapNote(ctx), delayedPursuit(ctx)]);
    return true;
  }
  if (id === `${CRYSTAL_PLANS}:3`) {
    citedResult(g, CRYSTAL_REFUSE, ["Nothing happens."]);
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
    b.flag = "ROCK_SLUG_ARGUMENT";
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
  if (id === "c:remote-settlement:2" && !g.player.weapons.some((w) => w.defId === "BEAM_FIRE"))
    return false;
  if (id === "c:remote-settlement:3" && !g.player.weapons.some((w) => w.defId === "BOMB_FIRE"))
    return false;
  // Before the generic fleet/tier loops, so the old :0 rows are not applied twice.
  const crystalPlans = crystallineRebelPlans(ctx, id);
  if (crystalPlans !== null) return crystalPlans;
  if (!payRes(ctx, choice.fx, id, ctx.note)) return false;
  for (const fx of choice.fx) {
    if (fx.k !== "tier") continue;
    const [lo, hi] = band(g, fx.tier);
    const n = roll(ctx, lo, hi);
    ctx.scrap(n);
    const name = fx.tier === "low" ? "Low" : fx.tier === "high" ? "High" : "Medium";
    ctx.note(`${name} scrap: ${n}.`);
    if (fx.resources) ctx.note("Resource amounts are not stated.");
  }
  for (const fx of choice.fx) {
    if (fx.k !== "hull") continue;
    if (fx.n >= 0) g.player.hull = Math.min(g.player.hullMax, g.player.hull + fx.n);
    else g.player.hull = Math.max(0, g.player.hull + fx.n);
    ctx.note(fx.n >= 0 ? `Hull repairs: ${fx.n}.` : `Hull damage: ${-fx.n}.`);
  }
  for (const fx of choice.fx) {
    if (fx.k !== "fleet") continue;
    const last = !!fx.lastStand && (g.sector === 8 || g.sectorId === "FINAL");
    if (fx.faster) {
      g.fleet += fx.n;
      ctx.note(`Rebel Fleet pursuit is doubled for ${fx.n} ${fx.n === 1 ? "jump" : "jumps"}.`);
    } else if (fx.double) {
      g.fleet *= 2;
      ctx.note("Rebel Fleet pursuit is doubled.");
    } else if (last) {
      ctx.note("No effect in The Last Stand.");
    } else {
      g.fleet = Math.max(0, g.fleet - fx.n);
      ctx.note(`Rebel Fleet is delayed for ${fx.n} turns.`);
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
  if (id === "c:rebel-transport-ship:0") ctx.note("You prepare to secure their cargo by force.");
  // Lanius ship absorbing automated scout. "Fight the ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-ship-absorbing-automated-scout:0")
    ctx.note("You power up your weapons, which quickly gets the attention of the ship.");
  // Mantis ship attacking Crystal. "Attack the Mantis." One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-attacking-crystal:0")
    ctx.note(
      "You activate your impulse engines and fly between the Mantis and their prey, weapons charging. You appear to have their full attention.",
    );
  // Mantis ship with Rock body parts. "Attack!" One printed lead-in, then a Mantis ship fight.
  if (id === "c:mantis-ship-with-rock-body-parts:0") {
    // Wiki citations:
    // > "No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!" — [[Mantis ship with Rock body parts]]
    // > "Fight the Mantis ship (default rewards)." — [[Mantis ship with Rock body parts]]
    ctx.note(
      "No species deserves a Mantis hunter on their back - time to make the galaxy a little safer. Engage!",
    );
  }
  // Lanius lone ship. "Attack the Lanius ship." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-lone-ship:0")
    ctx.note(
      "The civilian ship hastily retreats while you intercept the path of the ship and lock on weapons. It turns and prepares for a fight.",
    );
  // Auto-ship near radar station. "Approach the station." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-near-radar-station:0") ctx.note("The ship powers up and targets you.");
  // Crystal fight choice. "Engage the Rebel ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:crystal-fight-choice:0") {
    // Wiki citations:
    // > "Engage the Rebel ship." — [[Crystal fight choice]]
    // > "Before you can engage, the Crystalline ship scores a direct hit and obliterates the Rebel ship! They hail: \"You, you are like these other aliens! You brought them here!\" With that they turn their cannons on you!" — [[Crystal fight choice]]
    // > "Fight a Crystal ship (default rewards)." — [[Crystal fight choice]]
    ctx.note(
      'Before you can engage, the Crystalline ship scores a direct hit and obliterates the Rebel ship! They hail: "You, you are like these other aliens! You brought them here!" With that they turn their cannons on you!',
    );
  }
  // Lanius powered-down ship. "Scan the ship for lifeforms." One printed lead-in, then a Lanius ship fight.
  if (id === "c:lanius-powered-down-ship:0")
    ctx.note(
      "As you scan the vessel, the scan frequencies awaken the Lanius from hibernation - and they're hungry for raw materials!",
    );
  // Pirate ship attacking Crystal. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-ship-attacking-crystal:0") {
    // Wiki citations:
    // > "Attack the pirate." — [[Pirate ship attacking Crystal]]
    // > "You chase down the pirate before it has a chance to engage the civilian ship. When it detects the real threat, it turns to face you." — [[Pirate ship attacking Crystal]]
    // > "Fight a Pirate ship." — [[Pirate ship attacking Crystal]]
    ctx.note(
      "You chase down the pirate before it has a chance to engage the civilian ship. When it detects the real threat, it turns to face you.",
    );
  }
  // Remote settlement. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:remote-settlement:0")
    ctx.note('"You asked for it!" They pull away from the planet and move in to engage.');
  // Pirate smuggler. "Attack the pirate." One printed lead-in, then a Pirate ship fight.
  if (id === "c:pirate-smuggler:0") ctx.note("You power up your weapons and move in to engage.");
  // Refueling platform garbled broadcast. "Hail the platform and attempt to communicate." One printed lead-in, then a Lanius ship fight.
  if (id === "c:refueling-platform-garbled-broadcast:0")
    ctx.note(
      "There is a screech from your comm system, and the broadcast suddenly cuts off. The platform suddenly begins to move, revealing itself to be a Lanius ship!",
    );
  // Slug drink. "Refuse." One printed lead-in, then a Slug ship fight.
  if (id === "c:slug-drink:0")
    ctx.note(
      "The Slug feigns offense at your refusal, but you sense that he respects your caution. This does not, however, prevent him from returning to his ship and opening fire.",
    );
  // Zoltan quest primitives. "Interfere - make first contact with the primitive aliens." One printed lead-in, then a Zoltan ship fight.
  if (id === "c:zoltan-quest-primitives:0")
    ctx.note(
      "The local people - furry, one-eyed tree lizard things - begin chanting when they see you. Suddenly the sky is lit by laser fire - the Zoltan opened fire on your ship! You dash back to the shuttle and join the fight.",
    );
  // Zoltan quest primitives. "Protect the aliens' way of life - Attack the Rebel ship." One printed lead-in, then a Rebel ship fight.
  if (id === "c:zoltan-quest-primitives:1")
    ctx.note(
      "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence.",
    );
  // Rebel ship attacking Crystal ship. "Attack the Rebel." One printed lead-in, then a Rebel ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:0")
    ctx.note(
      "You message the Crystalline ship your intentions and move in to intercept the Rebel ship.",
    );
  // Rebel ship attacking Crystal ship. "Attack the Crystalline ship." One printed lead-in, then a Crystal ship fight.
  if (id === "c:rebel-ship-attacking-crystal-ship:1")
    ctx.note(
      "You move in to intercept the Crystalline ship. As soon as the Rebel scans your ship it takes the opportunity to jump. You have the sneaking suspicion they will inform the fleet of your position, but that's the least of your current concerns.",
    );
  // Auto-ship carrying shield virus. "Counter the remote hacking." Without Hacking the arrival card stays open.
  // citedChoose does not read citedChoiceDisabled, so this returns before the fight note and the fight.
  if (id === "c:auto-ship-carrying-shield-virus:1" && (g.player.kits.hacking?.level ?? 0) <= 0)
    return true;
  // Auto-ship carrying shield virus. "Counter the remote hacking." One printed lead-in, then an Auto-ship fight.
  if (id === "c:auto-ship-carrying-shield-virus:1")
    ctx.note(
      "Your hacking system automatically counters the digital assault and you move in to fight the ship.",
    );
  // Rebel shipyard. "Look around." One printed warning, then the same second Flagship fight. No salvage is granted here.
  if (id === "c:rebel-shipyard:0")
    ctx.note(
      "Warning lights flash as scans identify the gigantic ship under construction - it's a second Rebel Flagship! This must be the secret shipyards where the first one was built, and you've accidentally stumbled across it! Even in its weakened state, the Rebel ship powers up... get ready, you've got a hell of a fight on your hands!",
    );
  const fight = choice.fx.find((fx) => fx.k === "fight");
  if (fight && fight.k === "fight") {
    ctx.fight(fight.tier, fight.asteroid ? true : undefined);
    // Rock fight with boarders has no choice. Arrival calls this id.
    // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
    // Rock fight with boarders in asteroid field has no choice. Arrival calls this id.
    // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." asteroidfield=true.
    // INFERRED: the count is an inclusive whole number. After ctx.fight: a new fight keeps intruders already aboard.
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
    // INFERRED: inclusive 2..3. After ctx.fight: a new fight keeps intruders already aboard.
    if (id === "c:mantis-outcasts:0") mantisBoarders(g, 2, 3);
    // Zoltan border police has no choice. Arrival calls this id.
    // "3-4 zoltan boarders beam aboard your ship" and a Zoltan ship (default rewards).
    // INFERRED: inclusive 3..4. After ctx.fight: a new fight keeps intruders already aboard.
    if (id === "c:zoltan-border-police:0") {
      // Wiki citations:
      // > "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)." — [[Zoltan border police]]
      zoltanBoarders(g, 3, 4);
    }
    // Rebel fight with boarders has no choice. Arrival calls this id.
    // INFERRED: inclusive 2..3. After ctx.fight: a new fight keeps intruders already aboard.
    // Wiki citations:
    // > "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)." — [[Rebel fight with boarders]]
    if (id === "c:rebel-fight-with-boarders:0")
      humanBoarders(g, 2, 3, "human boarders beam aboard your ship.");
    // "2 slug boarders beam aboard your ship" (Slug hacker (medical)).
    if (id === "c:slug-hacker-medical:0")
      slugBoarders(g, 2, 2, "slug boarders beam aboard your ship.");
    // "crew entirely composed of Mantis" (Mantis ship-collectors; Zoltan ship follows Mantis ship; Legendary thief KazaaakplethKilik).
    // Wiki citations:
    // > "Fight a Mantis Fighter with crew entirely composed of Mantis." — [[Mantis ship-collectors]]
    if (id === "c:mantis-ship-collectors:0") allMantisCrew(g);
    if (
      id === "c:zoltan-ship-follows-mantis-ship:1" ||
      id === "c:legendary-thief-kazaaakplethkilik:0"
    )
      allMantisCrew(g);
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
    citedResult(g, '"You made the right decision, friend."', ["You avoid the fight."]);
    return true;
  }
  // The mercenary. "Hire the mercenary to delay the Rebels." One printed result. Scrap and the 2-turn delay are already applied.
  if (id === "c:the-mercenary:0") {
    const last = g.sector === 8 || g.sectorId === "FINAL";
    citedResult(
      g,
      "The mercenary ship masks its jump signature to mimic your own and then jumps off in the opposite direction. This should keep the Rebels guessing.",
      [last ? "No effect in The Last Stand." : "Rebel Fleet is delayed for 2 turns."],
    );
    return true;
  }
  // Federation deserters. "Offer supplies." 15-25 scrap and 1-3 fuel are already spent.
  // "The current sector map is revealed." This beacon chart has no hidden nodes, so that line uncovers none.
  // sectorMap is the between-sector chart and stays untouched.
  if (id === "c:federation-deserters:2") {
    citedResult(
      g,
      'You send over some supplies to help them on their way and in return they upload their flight plan to your computer, allowing you to map the sector! "The Federation fleet\'s still standing - get there while you can!"',
      ["The current sector map is revealed."],
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
        ? "The pirate watches as you start to light the meager crops on fire. In a few moments the settlement surrenders, offering tribute to leave them alone. The pirate seems impressed."
        : "The pirate watches as you teleport an incendiary explosive into their settlement. As the settlers scramble to put out the fires, their rudimentary planetary defenses power down. Forcing their surrender was almost laughably easy, but the pirate seems impressed with your tactics and agrees to share the settlement's 'tribute'.",
      ["You receive a drone schematic with high scrap.", item],
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
    const n = affordStock(g, id, "parts");
    if (!ownsHullRepair(g) || n == null) return false;
    takeStock(g, "parts", n);
    const fuel = rollFuel(id, (lo, hi) => roll(ctx, lo, hi));
    g.fuel += fuel;
    const spent = partsLine(n);
    const got = `Fuel: ${fuel}.`;
    ctx.note(spent);
    ctx.note(got);
    citedResult(
      g,
      "They happily accept your offer for help. Once the drone does its work they transfer over some fuel for your trouble.",
      [got, spent],
    );
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
    const page = gotoPage(ctx, gotoFx.id);
    if (!page) return false;
    // An ftl.dat result page pays its own item_modify. With no choice of its own, that is the result card.
    const lines: string[] = [];
    const note = (line: string) => {
      lines.push(line);
      ctx.note(line);
    };
    if (!payRes(ctx, (page.fx ?? []) as Fx[], gotoFx.id, note, true)) return false;
    if (lines.length > 0 && page.choices.length === 0) {
      result(g, page.body || lines.join(" "), undefined, page.body ? lines : []);
      g.paused = true;
      return true;
    }
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
