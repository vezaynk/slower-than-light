import { continueLabel } from "../interface-copy.ts";
import { eventText } from "../event-text.ts";
import { XP_NEED, upgradeCost } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import {
  allEmptyBeacons,
  allEvents,
  allWeapons,
  crewDef,
  eventDef,
  fillerList,
  openingLine,
  storedId,
  weaponDef,
} from "@stl/pack";
import type { EmptyBeaconDef, EventChoice, EventDef } from "@stl/pack";
import {
  beginBoarding,
  hurtSystem,
  log,
  rand,
  restorePlayerSensors,
  showEventLines,
  shutPlayerSensors,
  startCombat,
} from "../sim.ts";
import type { Beacon, Crew, Game, GameEvent, SkillName, SysId } from "../types.ts";
import {
  NEVER_RUN,
  between,
  here,
  humanBoarders,
  mantisBoarders,
  rockBoarders,
  crystalBoarders,
  joinCrew,
  payOffer,
  randomRace,
  resourceBand,
  rollStandard,
  rollSurrenderOffer,
  scrapBand,
  type SurrenderOffer,
  type SurrenderTier,
} from "./surrender.ts";
// Circular imports (beacon-mix -> here -> cited-events -> beacon-mix): only read inside functions, never at load.
import { noteReactorEvent } from "../rules/achievement-track.ts";
import { rollBand } from "./event-bands.ts";
import { priced, rollPrice } from "./event-prices.ts";
import { rockSlugPay, slugCaptainGrateful } from "./quests.ts";
import { keepNewHire, receiveAugment } from "../rules/make-room.ts";
import { grantRandomItem } from "../rules/bonus-item.ts";
import {
  archiveAuthoredChoices,
  eventMissileWeapon,
  locksOwned,
  ownedLock,
  scrapStock,
} from "./choice-locks.ts";
import { stampStockLabels } from "./stock-labels.ts";
import { affordStock, partsLine, takeStock } from "./stock-spend.ts";
import { queueSfx } from "../sfx-queue.ts";

/**
 * @agent:filler. Documented events for the plain beacons that the cited tables do not fill.
 *
 * Sectors, "Technical details of sector generation and events", "Fallback events": "Sometimes the game can reach the
 * end of the sector definition, and still have beacons left over that have not been assigned events. Those beacons
 * will then be assigned events from the "NEUTRAL" event list, which is used as a fallback. In Advanced Edition, the
 * "OVERRIDE_NEUTRAL" list replaces it." That list is Category:Filler Events: the pages whose {{Locations}} line says
 * alsooccur=filler or alsooccur=exitandfiller. Category:Nebula Filler Events is the default "NEBULA" list.
 * "When a list of events is used, an event will be picked at random from that list. The same event can be picked
 * multiple times without limit, unless it is specified as a unique event. Unique events can only occur once per
 * sector".
 *
 * Plain slots (wiki/beacon-mix.ts) draw from the list for their slot type once this sector's cited pages run out:
 *   neutral, special, quest left over -> FILLER (OVERRIDE_NEUTRAL)
 *   distress                         -> DISTRESS (Template:EventList DISTRESS BEACON)
 *   items                            -> ITEMS (Template:EventList ITEMS)
 *   nebula, nebula-neutral           -> NEBULA (Template:EventList NEBULA); "N empty nebula beacons" -> Empty nebula beacon
 *   empty                            -> the sector's "Empty beacon (...)" page ("Nothing happens.")
 * INFERRED: the per-sector neutral/distress/items lists (NEUTRAL_ENGI and so on) are not on the wiki as tables, so a
 * slot whose sector pages are used up falls back to these documented lists. Draws are uniform over the rows that
 * have a card; a row without a card here or in a cited table is left out of the draw.
 *
 * A row reuses the cited table card when one exists (looked up by dest or alias). Opening cards live in
 * filler-pages.ts and load as event records. A slug a sector page already uses stays that page. Their choices run
 * in FILLER_CHOICES because most results are random (equal odds, INFERRED, with {{DuplicateEvent|N}} counted N times)
 * or open a follow-up card. Blue options, crew skills and map reveals are not granted, as in the other tables. An
 * unnamed weapon, augmentation or drone schematic is a random one (grantRandomItem, per the Rewards page). A result
 * that prints fires or a breach applies that hazard.
 */

/**
 * The empty-beacon page for a sector. Civilian is the first plain page, so an unlisted sector uses it.
 * A nebula slot uses the Slug page in a Slug sector (SLUG_SECTOR, SLUG_HOME), and the other nebula page otherwise.
 * `sectorId` is the ftl.dat sector id.
 */
export function emptyPageFor(sectorId: string, nebula = false): EmptyBeaconDef {
  const pages = allEmptyBeacons();
  if (nebula) {
    const slug = sectorId.startsWith("SLUG_");
    const hit = slug
      ? pages.find((page) => page.id === "NEBULA_NOTHING_SLUG")
      : pages.find((page) => page.nebula && page.id !== "NEBULA_NOTHING_SLUG");
    const any = hit ?? pages.find((page) => page.nebula);
    if (any) return any;
  } else {
    const plain = pages.filter((page) => !page.nebula);
    const hit = plain.find((page) => page.sectors.includes(sectorId)) ?? plain[0];
    if (hit) return hit;
  }
  throw new Error(`empty beacon pack has no page for ${sectorId}`);
}

// ---- Lookup and draw -------------------------------------------------------------------------------------------

type Page = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: EventChoice[];
};

let citedIndex: Map<string, Page> | null = null;
let citedStamp = "";

/** Loaded pages by dest and alias. Arrivals and filler twins stay out, so the sector page wins a name. */
function citedByName(name: string): Page | undefined {
  const events = allEvents();
  const stamp = events.map((ev) => ev.id).join("\0");
  if (!citedIndex || citedStamp !== stamp) {
    citedIndex = new Map();
    citedStamp = stamp;
    for (const ev of events) {
      if (ev.id.startsWith("arrive-") || ev.id.startsWith("filler-")) continue;
      const page = pageFromEvent(ev);
      for (const n of [ev.dest, ...ev.aliases]) if (!citedIndex.has(n)) citedIndex.set(n, page);
    }
  }
  return citedIndex.get(name);
}

const packedPages = new Map<string, { source: EventDef; page: Page }>();

function pageFromEvent(event: EventDef): Page {
  return {
    dest: event.dest,
    slug: event.id,
    flag: event.flag,
    aliases: event.aliases,
    sectors: event.sectors,
    body: event.body,
    choices: event.choices as Page["choices"],
  };
}

/** The packed page for an id. The same record returns the same card, so a draw matches `pageForRow`. */
function packedPage(id: string): Page | undefined {
  const event = eventDef(id);
  if (!event) {
    packedPages.delete(id);
    return undefined;
  }
  const hit = packedPages.get(id);
  if (hit?.source === event) return hit.page;
  const page = pageFromEvent(event);
  packedPages.set(id, { source: event, page });
  return page;
}

function withListSlug(page: Page, slug: string): Page {
  if (page.slug === slug) return page;
  return { ...page, slug };
}

/**
 * A filler card stored beside the sector page that already uses its slug.
 * The record id is filler-<slug>. The stamp and the arrival still use the list id.
 */
function fillerTwin(slug: string): Page | undefined {
  const twin = packedPage(`filler-${slug}`);
  if (!twin) return undefined;
  return withListSlug(twin, slug);
}

/** The card for a list row: the sector page first, else the packed opening card. */
export function pageForRow(dest: string): Page | undefined {
  const cited = citedByName(dest);
  if (cited) return cited;
  for (const ev of allEvents()) {
    if (ev.id.startsWith("arrive-")) continue;
    if (ev.dest !== dest && !ev.aliases.includes(dest)) continue;
    if (ev.id.startsWith("filler-")) return fillerTwin(ev.id.slice("filler-".length));
    return pageForEntry(ev.id);
  }
  return undefined;
}

/** The card a list row names. A filler twin wins, and the page slug stays the list id. */
function pageForEntry(id: string): Page | undefined {
  const twin = fillerTwin(id);
  if (twin) return twin;
  const packed = packedPage(id);
  if (!packed) return undefined;
  return withListSlug(packed, id);
}

/** The card a filler stamp opens. A shared slug keeps the filler card while the pack holds the sector page. */
function pageBySlug(slug: string): Page | undefined {
  return fillerTwin(slug) ?? packedPage(slug);
}

export const FILLER_FLAG = "filler:";

/** True when a beacon on this map already holds that page (unique events: "only once per sector"). */
function onMap(beacons: Beacon[], page: Page): boolean {
  return beacons.some(
    (b) => b.flag === page.flag || b.flag === FILLER_FLAG + page.slug || b.name === page.dest,
  );
}

/**
 * Draws one page from the packed list. The row id is the page slug.
 * A unique row already on the map, or named in `reserved` (the sector's own cited pages, which the mix may still
 * place), is skipped. Remembering that page stays here. `r` is beacon-mix's shadow state or the live game.
 */
export function drawFiller(
  r: Game,
  list: string,
  beacons: Beacon[],
  reserved: ReadonlySet<string> = new Set(),
  extras: Page[] = [],
): Page | null {
  const pool: Page[] = [];
  for (const row of fillerList(list)?.entries ?? []) {
    const page = pageForEntry(row.id);
    if (!page) continue;
    if (row.unique && (reserved.has(page.flag) || onMap(beacons, page))) continue;
    pool.push(page);
  }
  // A repeatable opener already placed once is one more candidate, the same weight as one filler row.
  for (const page of extras) if (!pool.includes(page)) pool.push(page);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand(r) * pool.length))];
}

/** An "N empty nebula beacons" slot: Empty nebula beacon, or Empty nebula beacon (Slug) in the Slug sectors. */
export function stampEmptyNebula(b: Beacon, sectorId: string) {
  const page = emptyPageFor(sectorId, true);
  b.flag = FILLER_FLAG + page.id;
  b.name = page.dest;
  b.asteroid = false;
}

/** Marks a beacon with a drawn filler page (the kind stays: distress, nebula, cache or event). */
export function stampFiller(b: Beacon, page: Page) {
  b.flag = FILLER_FLAG + page.slug;
  b.name = page.dest;
  b.asteroid = false;
}

// ---- Arrival ---------------------------------------------------------------------------------------------------

const LIST_FOR_KIND: Partial<Record<Beacon["kind"], "FILLER" | "NEBULA" | "DISTRESS" | "ITEMS">> = {
  event: "FILLER",
  distress: "DISTRESS",
  cache: "ITEMS",
  nebula: "NEBULA",
};

function emptyCard(g: Game, page: EmptyBeaconDef): GameEvent {
  const text = page.texts[Math.min(page.texts.length - 1, Math.floor(rand(g) * page.texts.length))];
  // "Nothing happens." The "ack" choice resolves the beacon (sim.ts choose).
  return {
    title: page.dest.replace(/ \(.*\)$/, ""),
    body: text,
    choices: [{ id: "ack", label: "Continue" }],
  };
}

/** Friendly ship out of fuel: "the requested amount of fuel is shown before you make the choice". */
function friendlyCard(g: Game, page: Page): GameEvent {
  const n = rollPrice("FRIENDLY_BEACON", "give", (lo, hi) => between(g, [lo, hi]));
  const choices = [];
  if (n != null) {
    choices.push({
      id: `s:friendly-ship-out-of-fuel:give:${n}`,
      label: `${eventText("event_FRIENDLY_BEACON_c1_choice")} [${n} fuel]`,
    });
  }
  choices.push({ id: page.choices[1].id, label: page.choices[1].label });
  return { title: page.dest, body: page.body, choices };
}

const TRADE_IDS = ["oxygen", "pilot", "doors", "sensors", "reactor"] as const;
type TradeId = (typeof TRADE_IDS)[number];
type TradeOffer = { id: TradeId; lo: number; hi: number };

function isTradeId(id: string): id is TradeId {
  return (TRADE_IDS as readonly string[]).includes(id);
}

/**
 * Trade scrap for upgrades. Each specialty is a result of inquiring, with a scrap band for the level already owned.
 * The bands are packed rows. A missing row is not offered.
 * Trivia: a missing subsystem is not offered, and a system already at its maximum is not offered.
 * The reactor row has no level, and the reactor cannot pass 25. The page does not say the reactor step is one bar.
 * INFERRED: that step is one bar, the same unit as the 25-bar cap.
 * INFERRED: the specialties that can still be bought are equally likely. No odds are printed.
 */
function tradeOffers(g: Game): TradeOffer[] {
  const rows = eventDef("TRADER_UPGRADES")?.trades ?? [];
  const reactorAt = g.player.reactor;
  const reactorRow =
    rows.find((row) => row.id === "reactor" && row.level === reactorAt) ??
    rows.find((row) => row.id === "reactor" && row.level == null);
  const out: TradeOffer[] = [];
  const seen = new Set<TradeId>();
  for (const row of rows) {
    if (!isTradeId(row.id) || seen.has(row.id) || row.lo > row.hi) continue;
    if (row.id === "reactor") {
      if (row !== reactorRow || upgradeCost("reactor", reactorAt) == null) continue;
      seen.add("reactor");
      out.push({ id: "reactor", lo: row.lo, hi: row.hi });
      continue;
    }
    if (row.level == null) continue;
    const level = g.player.systems[row.id].level;
    if (level !== row.level) continue;
    seen.add(row.id);
    out.push({ id: row.id, lo: row.lo, hi: row.hi });
  }
  return out;
}

/** One packed opening sentence. Filler pages that use rand keep that draw. A nested list spends one draw per list. */
function randOpening(g: Game, id: string): string {
  const key = storedId(id) ?? id;
  const picked = openingLine(key, (n) => Math.min(n - 1, Math.floor(rand(g) * n)));
  if (picked != null) return picked;
  const texts = eventDef(key)?.texts ?? [];
  if (texts.length === 0) return "";
  return texts[Math.min(texts.length - 1, Math.floor(rand(g) * texts.length))] ?? "";
}

/** One packed opening sentence. Pages that use between keep that draw. A nested list spends one draw per list. */
function betweenOpening(g: Game, id: string): string {
  const key = storedId(id) ?? id;
  const picked = openingLine(key, (n) => between(g, [0, n - 1]));
  if (picked != null) return picked;
  const texts = eventDef(key)?.texts ?? [];
  const hi = texts.length > 0 ? texts.length - 1 : 0;
  return texts[between(g, [0, hi])] ?? "";
}

function tradeIntro(g: Game, page: Page): GameEvent {
  const text = randOpening(g, page.slug);
  return {
    title: page.dest,
    body: text,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function hireCard(g: Game, page: Page): GameEvent {
  const text = randOpening(g, page.slug);
  return {
    title: page.dest,
    body: text,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function tradeOfferText(o: TradeOffer): string {
  if (o.id === "reactor") return eventText("event_TRADER_UPGRADES_LIST_5_text");
  if (o.id === "oxygen") return eventText("event_TRADER_UPGRADES_LIST_1_text");
  if (o.id === "pilot") return eventText("event_TRADER_UPGRADES_LIST_2_text");
  if (o.id === "doors") return eventText("event_TRADER_UPGRADES_LIST_3_text");
  return eventText("event_TRADER_UPGRADES_LIST_4_text");
}

function cardFor(g: Game, page: Page): GameEvent {
  if (archiveAuthoredChoices(page.choices)) {
    const text = randOpening(g, page.slug);
    return {
      title: page.dest,
      body: text || page.body,
      choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
    };
  }
  const slug = storedId(page.slug) ?? page.slug;
  if (slug === "NEBULA_EMPTY") return emptyCard(g, emptyPageFor("", true));
  // The fuel amount is rolled when the card opens. The page may be the packed record or the authored card.
  if (slug === "FRIENDLY_BEACON") return friendlyCard(g, page);
  if (slug === "TRADER_UPGRADES") return tradeIntro(g, page);
  if (slug === "TAVERN_HIRE") return hireCard(g, page);
  if (slug === "HELP_MINERS") return miningCard(g, page);
  if (slug === "TRADER_UPGRADES_EXCHANGE") return supplyCard(g, page);
  if (slug === "DISTRESS_INFESTATION") return spiderCard(g, page);
  if (slug === "DISTRESS_TRAPPED_MINER") return pirateCard(g, page);
  if (slug === "DISTRESS_STATION_DISEASE") return diseaseCard(g, page);
  if (slug === "DISTRESS_STATION_FIRE") return fireCard(g, page);
  if (slug === "TRAP_BEACON") return trapCard(g, page);
  if (slug === "EMPTY_STATION2") return abandonedStationCard(g, page);
  if (slug === "ROGUE_REBEL") return rebelChanceCard(g, page);
  if (slug === "WRECKAGE_EVENT") return wreckageCard(g, page);
  return {
    title: page.dest,
    body: page.body,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

/**
 * sim.ts eventFor, after the quest and cited lookups: the card for a filler-stamped beacon, or for a plain beacon
 * nothing stamped (a quest slot no quest took, an unlisted sector). Plain beacons draw now, with rand(g), and keep
 * the draw on the beacon. Null for exits and anything else this module does not own.
 */
function fillerEventRaw(g: Game, b: Beacon): GameEvent | null {
  if (b.flag.startsWith(FILLER_FLAG)) {
    const slug = b.flag.slice(FILLER_FLAG.length);
    const quiet = allEmptyBeacons().find((page) => page.id === slug);
    if (quiet?.nebula) return emptyCard(g, quiet);
    const page = pageBySlug(slug);
    return page ? cardFor(g, page) : emptyCard(g, emptyPageFor(g.sectorId));
  }
  if (b.flag) return null;
  if (b.kind === "empty" || b.kind === "start") return emptyCard(g, emptyPageFor(g.sectorId));
  const list = LIST_FOR_KIND[b.kind];
  if (!list) return null;
  const page = drawFiller(g, list, g.beacons);
  if (!page) return emptyCard(g, emptyPageFor(g.sectorId, b.kind === "nebula"));
  stampFiller(b, page);
  return cardFor(g, page);
}

export function fillerEvent(g: Game, b: Beacon): GameEvent | null {
  const ev = fillerEventRaw(g, b);
  if (!ev) return null;
  ev.choices = stampStockLabels(ev.choices);
  return ev;
}

// ---- Choices ---------------------------------------------------------------------------------------------------

/** Ends the event with nothing more ("Nothing happens."). */
function done(g: Game) {
  const b = here(g);
  if (b) b.resolved = true;
  g.event = null;
  g.phase = "map";
  g.paused = false;
}

/** The result card ("ack" resolves the beacon in sim.ts choose). */
function show(g: Game, text: string, offer?: SurrenderOffer, extras: string[] = []) {
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
  const tail = [...got, ...extras].filter(Boolean).join(" ");
  g.event = {
    title: here(g)?.name ?? "Event",
    body: tail ? `${text}\n\n${tail}` : text,
    choices: [{ id: "ack", label: "Continue" }],
  };
  g.phase = "event";
  g.paused = true;
}

function card(g: Game, body: string, choices: { id: string; label: string }[]) {
  g.event = { title: here(g)?.name ?? "Event", body, choices: stampStockLabels(choices) };
  g.phase = "event";
  g.paused = true;
}

function fight(
  g: Game,
  text: string,
  tier: string,
  slug: string,
  opts: { asteroid?: boolean; never?: boolean } = {},
) {
  g.event = null;
  startCombat(g, tier, !!opts.asteroid, slug);
  // "doesn't surrender nor tries to escape" (Template:Drifting Refugee Ship ambushers).
  if (opts.never) g.enemyEscape = { ...NEVER_RUN };
  if (text.trim()) showEventLines(g, [text]);
}

/** Rewards, "Scrap only": T scrap. No tier given ("a random amount") = one of the three, equal odds (INFERRED). */
function scrapOnly(g: Game, tier?: SurrenderTier): SurrenderOffer {
  const t = tier ?? (["low", "medium", "high"] as const)[Math.min(2, Math.floor(rand(g) * 3))];
  const eligible = between(g, scrapBand(g, t));
  return { tier: t, scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 };
}

/** One page-stated resource plus T scrap (Rewards, "Missiles" / "Drone parts"), or the resource alone ("Fuel only"). */
function resource(
  g: Game,
  id: "fuel" | "missiles" | "parts",
  tier: SurrenderTier,
  scrapTier?: SurrenderTier,
): SurrenderOffer {
  const offer = scrapTier
    ? scrapOnly(g, scrapTier)
    : { tier: "low" as SurrenderTier, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  offer[id] = between(g, resourceBand(id, tier));
  return offer;
}

/** Rewards, "Weapon": "A random weapon & T scrap". INFERRED: a priced weapon the ship does not own. */
function weaponOffer(g: Game, tier: SurrenderTier): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  const options = allWeapons().filter((w) => w.price > 0 && !owned.has(w.id));
  if (options.length)
    offer.weapon = options[Math.min(options.length - 1, Math.floor(rand(g) * options.length))].id;
  return offer;
}

/** Hull damage. True when the ship is lost (same defeat as citedChoose). */
function hurt(g: Game, n: number): boolean {
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

/** Cut the wire. Medium scrap, or 6 hull, a breached room, and a lost crewmember. Clone Bay brings them back. */
function cutMineWire(g: Game) {
  if (
    weighted(g, [
      ["safe", 1],
      ["boom", 1],
    ] as const) === "safe"
  ) {
    // Wiki citations:
    // > "You receive medium scrap." — [[Rock live mine#Cut the wire]]
    show(g, eventText("event_ROCK_STARSHIP_MINE_DEFUSE2_1_text"), scrapOnly(g, "medium"));
    return;
  }
  // Wiki citations:
  // > "Your ship takes 6 hull damage, 1 damage with a breach to a random room, and you lose a crewmember." — [[Rock live mine#Cut the wire]]
  // > "The lost crewmember is revived." — [[Rock live mine#Cut the wire]]
  if (hurt(g, 6)) return;
  const note = loseCrew(g);
  show(
    g,
    eventText("event_ROCK_STARSHIP_MINE_DEFUSE2_2_text"),
    undefined,
    ["Hull damage: 6.", roomBreach(g), note].filter(Boolean),
  );
}

/** "1 damage with a breach to a random room."
 * INFERRED: every player room is equally likely. The 1 damage hits that room's system when a bar is left.
 * A systemless room still breaches.
 */
function roomBreach(g: Game): string {
  const rooms = g.player.rooms;
  if (!rooms.length) return "";
  const r = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
  const sys = r.system ? g.player.systems[r.system] : undefined;
  let bar = "";
  if (sys && sys.level > 0 && sys.damage < sys.level) {
    hurtSystem(g.player, r.system!, 1);
    bar = `1 damage to ${r.system}.`;
  }
  r.breach += 1;
  return [bar, `A breach opens in ${r.title}.`].filter(Boolean).join(" ");
}

/** Beam Drone, not an Anti-Ship Fire Drone and not Beam Drone II. The fitted schematic is kit.target. */
function ownsMineBeam(g: Game): boolean {
  const kit = g.player.kits.drones;
  if (!kit) return false;
  return kit.target === "COMBAT_BEAM" || (kit.loadout ?? []).includes("COMBAT_BEAM");
}

/**
 * "1 damage to a random room" when the sentence prints no fire.
 * INFERRED: that room's system loses one bar when a bar is left. A systemless room takes none.
 */
function roomBar(g: Game): string {
  const rooms = g.player.rooms;
  if (!rooms.length) return "";
  const r = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
  const sys = r.system ? g.player.systems[r.system] : undefined;
  if (!sys || sys.level <= 0 || sys.damage >= sys.level) return "";
  hurtSystem(g.player, r.system!, 1);
  return `1 damage to ${r.system}.`;
}

/** Mantis fugitive, mantis-controlled Engi ship. INFERRED: the Engi hull's crew are Mantis. */
function mantisControlled(g: Game) {
  const hp = crewDef("mantis").hp;
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "enemy") continue;
    c.kin = "mantis";
    c.hp = hp;
    c.maxHp = hp;
  }
}

/** "Rebel Fleet is delayed for 1 turn." The Engi cache moves the column back by its printed count. */
function delayFleetOne(g: Game) {
  // INFERRED: a fleet already at column 0 stays there.
  g.fleet = Math.max(0, g.fleet - 1);
}

/** Rock and Slug standoff: "1 damage to each of 2 random systems".
 * INFERRED: two different installed systems when two exist.
 */
function twoSystems(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter(
    (id) => (g.player.systems[id]?.level ?? 0) > 0,
  );
  const pool = [...ids];
  const lines: string[] = [];
  for (let n = 0; n < 2 && pool.length; n++) {
    const i = Math.min(pool.length - 1, Math.floor(rand(g) * pool.length));
    const id = pool.splice(i, 1)[0]!;
    hurtSystem(g.player, id, 1);
    lines.push(`1 damage to ${id}.`);
  }
  return lines.join(" ");
}

/** "1 damage to a random system". INFERRED: one of the installed systems, equal odds. */
function hurtRandomSystem(g: Game, amount = 1): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter(
    (id) => (g.player.systems[id]?.level ?? 0) > 0,
  );
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  const before = g.player.systems[id]?.damage ?? 0;
  hurtSystem(g.player, id, amount);
  if (amount === 1) return `System damage: ${id}.`;
  const applied = (g.player.systems[id]?.damage ?? 0) - before;
  return applied ? `${applied} damage to ${id}.` : "";
}

/**
 * Large asteroid field: "1 damage with 1-2 fires to a random room."
 * INFERRED: every player room is equally likely. The 1 damage hits that room's system when it has a bar left.
 * A systemless room still burns. The page prints 1-2 fires and not the odds. The second fire is a coin flip,
 * the same as Fire Bomb.
 */
function rockFires(g: Game): string {
  const rooms = g.player.rooms;
  if (!rooms.length) return "";
  const r = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))];
  const sys = r.system ? g.player.systems[r.system] : undefined;
  let bar = "";
  if (sys && sys.level > 0 && sys.damage < sys.level) {
    hurtSystem(g.player, r.system!, 1);
    bar = `1 damage to ${r.system}.`;
  }
  const n = 1 + (rand(g) < 0.5 ? 1 : 0);
  // Fires, "Fires and enemy AI": a room stacks to four flames. This event still adds only its 1-2.
  r.fire = Math.min(4, r.fire + n);
  return [bar, `${n === 1 ? "1 fire" : "2 fires"} in ${r.title}.`].filter(Boolean).join(" ");
}

/**
 * Plasma storm incapacitated ships: "a breach to a random system."
 * Trivia on that page: the hull-and-breach outcome "does not destroy any system."
 * INFERRED: installed systems are equally likely. The breach opens in that system's room and spends no bar.
 * A system with no room is skipped.
 */
function breachRandomSystem(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter(
    (id) => (g.player.systems[id]?.level ?? 0) > 0,
  );
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  const room = g.player.rooms.find((r) => r.system === id);
  if (!room) return "";
  room.breach += 1;
  return `A breach opens in ${room.title}.`;
}

/** "You lose a crewmember." Clone Bay: "The lost crewmember is revived" unless `noClone`. INFERRED: never the last one. */
function loseCrew(g: Game, noClone = false): string {
  if (!noClone && g.player.kits.clonebay) return "The lost crewmember is revived.";
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[Math.min(mine.length - 1, Math.floor(rand(g) * mine.length))];
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  return `${lost.name} is lost.`;
}

function gainCrew(g: Game, race = randomRace(g)): string {
  return joinCrew(g, race)
    ? `A ${race} crewmember joins you.`
    : "There is no room aboard for the new crewmember.";
}

/** Equal odds over the listed results, a {{DuplicateEvent|N}} result counted N times. */
function weighted<T>(g: Game, items: [T, number][]): T {
  let roll = rand(g) * items.reduce((a, [, w]) => a + w, 0);
  for (const [item, w] of items) {
    roll -= w;
    if (roll < 0) return item;
  }
  return items[items.length - 1][0];
}

/** Missile (Weapons), Hull Missile: "BUGGED: not considered a missile weapon for events." A crystal gun spends no ammo, so it is not one either. */
function miningMissile(g: Game): boolean {
  return eventMissileWeapon(g);
}

function miningOffers(): { id: string; label: string }[] {
  return [
    { id: "c:asteroid-mining-colony:1", label: eventText("event_HELP_MINERS_c1_c1_choice") },
    { id: "c:asteroid-mining-colony:2", label: eventText("event_HELP_MINERS_c1_c2_choice") },
    { id: "c:asteroid-mining-colony:3", label: eventText("event_HELP_MINERS_c1_c3_choice") },
  ];
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsDrone(g: Game, kind: string): boolean {
  const kit = g.player.kits.drones;
  if (!kit) return false;
  return kit.target === kind || (kit.loadout ?? []).includes(kind);
}

function ownsAntiBio(g: Game): boolean {
  return g.player.weapons.some((w) => w.defId === "BEAM_BIO");
}

/** Malfunctioning defense system, Ion Weapon: kind ion, or any weapon that deals ion, including Ion Bomb and Stun Bomb. */
function ownsIon(g: Game): boolean {
  return g.player.weapons.some((w) => {
    const def = weaponDef(w.defId);
    return !!def && (def.kind === "ion" || def.ion > 0);
  });
}

/** Cloaking with no level named is any installed Cloaking. Improved is 2. Advanced is 3. */
function cloakLevel(g: Game): number {
  return g.player.kits.cloaking?.level ?? 0;
}

/** Crushed pirate: Anti-Bio Beam and Fire Beam are excluded. Artillery Beam is the lance kit. */
function ownsCuttingBeam(g: Game): boolean {
  if ((g.player.kits.artillery?.level ?? 0) > 0) return true;
  return g.player.weapons.some((w) => {
    const def = weaponDef(w.defId);
    return def?.kind === "beam" && w.defId !== "BEAM_BIO" && w.defId !== "BEAM_FIRE";
  });
}

function livingKin(g: Game, kin: string): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === kin);
}

/** Adv. Medbay, level=2+. INFERRED: the installed level, the same reading as Improved Sensors. */
function medbayLevel(g: Game): number {
  return g.player.systems.medbay?.level ?? 0;
}

/** A beam drone, not an Anti-Ship Fire Drone. The fitted schematic is kit.target, and a loadout entry counts. */
function ownsBeamDrone(g: Game): boolean {
  const kit = g.player.kits.drones;
  if (!kit) return false;
  return [kit.target, ...(kit.loadout ?? [])].some(
    (kind) => kind === "COMBAT_BEAM" || kind === "COMBAT_BEAM_2",
  );
}

/** The launch offer is a blue option. It is absent without a missile weapon. */
function miningCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => c.id !== "c:asteroid-mining-colony:0" || miningMissile(g))
    .map((c) => ({ id: c.id, label: c.label }));
  return { title: page.dest, body: page.body, choices };
}

/**
 * "Your ship reactor is upgraded." No step is printed. INFERRED: one bar.
 * Template:Reactor power cost caps the reactor at 25. Past that, the missiles stay spent and the bar does not move.
 */
function bumpReactor(g: Game): string {
  if (upgradeCost("reactor", g.player.reactor) == null) return "";
  g.player.reactor += 1;
  // Manpower: an event offer to upgrade the reactor does not count against the achievement.
  noteReactorEvent(g);
  return "Your ship reactor is upgraded.";
}

function payMiners(g: Game, base: number, hull: number): string[] {
  const got = adjustScrap(g, base);
  if (got > 0) g.scrap += got;
  if (base > 0) g.scrapCollected = (g.scrapCollected ?? 0) + base;
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + hull);
  const lines = [`You receive ${got} scrap.`];
  if (hull > 0) lines.push(`Your ship receives ${hull} repairs.`);
  return lines;
}

/** Asteroid mining colony. A shortfall leaves the card up. The reward table follows the button, not the packed count. */
function giveMiners(g: Game, id: "c:asteroid-mining-colony:1" | "c:asteroid-mining-colony:2") {
  const n = affordStock(g, id, "missiles");
  if (n == null) return;
  takeStock(g, "missiles", n);
  if (id === "c:asteroid-mining-colony:1") {
    // No odds on the three results. INFERRED: equal.
    const r = weighted(g, [
      ["hull", 1],
      ["reactor", 1],
      ["scrap", 1],
    ] as const);
    if (r === "hull") {
      g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
      show(g, eventText("event_HELP_MINERS_1_2_text"), undefined, [
        "Your ship receives 10 repairs.",
      ]);
    } else if (r === "reactor") {
      const note = bumpReactor(g);
      show(g, eventText("event_HELP_MINERS_1_3_text"), undefined, note ? [note] : []);
    } else {
      const base = rollBand("asteroid-mining-colony", "thanks", "scrap", (lo, hi) =>
        between(g, [lo, hi]),
      );
      show(
        g,
        eventText("event_HELP_MINERS_1_1_text"),
        undefined,
        base == null ? [] : payMiners(g, base, 0),
      );
    }
    return;
  }
  // No odds on the three results. INFERRED: equal.
  // The augment result names no augment. Rewards, "Augment": "A random augmentation & T scrap." (no scrap printed).
  const r = weighted(g, [
    ["both", 1],
    ["augment", 1],
    ["scrap", 1],
  ] as const);
  if (r === "both") {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 15);
    const note = bumpReactor(g);
    show(
      g,
      eventText("event_HELP_MINERS_2_2_text"),
      undefined,
      ["Your ship receives 15 repairs.", note].filter(Boolean),
    );
  } else if (r === "augment") {
    show(g, eventText("event_HELP_MINERS_2_3_text"), undefined, [grantRandomItem(g, "augment")]);
  } else {
    const base = rollBand("asteroid-mining-colony", "wow", "scrap", (lo, hi) =>
      between(g, [lo, hi]),
    );
    show(
      g,
      eventText("event_HELP_MINERS_2_1_text"),
      undefined,
      base == null ? [] : payMiners(g, base, 5),
    );
  }
}

/** Supply bundles from the packed page. A 0-wide band stays 0. The bundle draw stays rand. */
function supplyRows(id: string) {
  const rows = [];
  for (const row of eventDef(storedId(id))?.offers ?? []) if (row.k === "supply") rows.push(row);
  return rows;
}

function supplyLegal(id: string, missiles: number, parts: number, fuel: number): boolean {
  return supplyRows(id).some(
    (b) =>
      missiles >= b.missiles[0] &&
      missiles <= b.missiles[1] &&
      parts >= b.parts[0] &&
      parts <= b.parts[1] &&
      fuel >= b.fuel[0] &&
      fuel <= b.fuel[1],
  );
}

function supplyPrice(missiles: number, parts: number, fuel: number): string {
  const bits: string[] = [];
  if (missiles) bits.push(`${missiles} missiles`);
  if (parts) bits.push(`${parts} drone parts`);
  if (fuel) bits.push(`${fuel} fuel`);
  return bits.join(", ");
}

/** The bundle is rolled when the card opens, so the price is on the button. */
function supplyCard(g: Game, page: Page): GameEvent {
  const intro = randOpening(g, page.slug);
  const bundles = supplyRows(page.slug);
  const bundle = bundles[Math.min(bundles.length - 1, Math.floor(rand(g) * bundles.length))]!;
  const missiles = between(g, bundle.missiles);
  const parts = between(g, bundle.parts);
  const fuel = between(g, bundle.fuel);
  return {
    title: page.dest,
    body: intro,
    choices: [
      {
        id: `s:improve-reactor-for-supplies:agree:${missiles}:${parts}:${fuel}`,
        label: `${eventText("event_TRADER_UPGRADES_EXCHANGE_c1_choice")} [${supplyPrice(missiles, parts, fuel)}]`,
      },
      {
        id: "c:improve-reactor-for-supplies:1",
        label: eventText("event_TRADER_UPGRADES_EXCHANGE_c2_choice"),
      },
    ],
  };
}

/** Blue options stay off the card until that drone or the Anti-Bio Beam is fitted. */
function spiderCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => {
      if (c.id === "c:giant-alien-spiders:2") return ownsDrone(g, "personnel");
      if (c.id === "c:giant-alien-spiders:3") return ownsDrone(g, "BOARDER");
      if (c.id === "c:giant-alien-spiders:4") return ownsAntiBio(g);
      return true;
    })
    .map((c) => ({ id: c.id, label: c.label }));
  return { title: page.dest, body: page.body, choices };
}

/**
 * Promise to help. Blue options stay off until the ship qualifies.
 * INFERRED: the parenthetical names the requirement, because the three cloaking buttons print the same sentence.
 */
function defenseOptions(g: Game): { id: string; label: string }[] {
  const choices: { id: string; label: string }[] = [
    {
      id: "c:malfunctioning-defense-system:2",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c1_choice"),
    },
  ];
  if (ownsIon(g))
    choices.push({
      id: "c:malfunctioning-defense-system:3",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c2_choice"),
    });
  const cloak = cloakLevel(g);
  if (cloak >= 1)
    choices.push({
      id: "c:malfunctioning-defense-system:4",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c3_choice"),
    });
  if (cloak >= 2)
    choices.push({
      id: "c:malfunctioning-defense-system:5",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c4_choice"),
    });
  if (cloak >= 3)
    choices.push({
      id: "c:malfunctioning-defense-system:6",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c5_choice"),
    });
  if (livingKin(g, "engi"))
    choices.push({
      id: "c:malfunctioning-defense-system:7",
      label: eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c6_choice"),
    });
  return choices;
}

/**
 * The drone-part bug: no part is required when the rolled reward includes drone parts.
 * adjustScrap may already have healed, so a refused roll puts that hull and log back.
 */
function payDronePart(g: Game, offer: SurrenderOffer, body: string, hull: number, lines: string[]) {
  if (offer.parts <= 0) {
    if (g.player.parts < 1) {
      g.player.hull = hull;
      g.log = lines;
      return;
    }
    g.player.parts -= 1;
  }
  show(g, body, offer, offer.parts <= 0 ? ["Drone parts: -1."] : []);
}

function spiderDrone(g: Game, kind: "personnel" | "BOARDER", body: string) {
  if (!ownsDrone(g, kind)) return;
  const hull = g.player.hull;
  const lines = g.log.slice();
  const offer =
    kind === "personnel" ? rollSurrenderOffer(g, "medium", true) : rollStandard(g, "low");
  payDronePart(g, offer, body, hull, lines);
}

/** Blue options stay off the card until a cutting beam or a beam drone is fitted. */
function pirateCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => {
      if (c.id === "c:crushed-pirate:2") return ownsCuttingBeam(g);
      if (c.id === "c:crushed-pirate:3") return ownsBeamDrone(g);
      return true;
    })
    .map((c) => ({ id: c.id, label: c.label }));
  return { title: page.dest, body: page.body, choices };
}

/** Rock, Engi, and a level-2 medbay stay off the card until the ship has them. */
function diseaseCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => {
      if (c.id === "c:unknown-disease-on-mining-colony:2") return livingKin(g, "rock");
      if (c.id === "c:unknown-disease-on-mining-colony:3") return livingKin(g, "engi");
      if (c.id === "c:unknown-disease-on-mining-colony:4") return medbayLevel(g) >= 2;
      return true;
    })
    .map((c) => ({ id: c.id, label: c.label }));
  return { title: page.dest, body: page.body, choices };
}

/** A living Rock and a Repair Drone stay off the card until the ship has them. */
function fireCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => {
      if (c.id === "c:fire-on-research-station:3") return livingKin(g, "rock");
      if (c.id === "c:fire-on-research-station:4") return ownsDrone(g, "REPAIR");
      return true;
    })
    .map((c) => ({ id: c.id, label: c.label }));
  return { title: page.dest, body: page.body, choices };
}

/** "1 skill" is skill rank 1. The stored amount is the printed experience for that rank. */
const MOON_SKILLS = ["weapons", "shields", "pilot", "engines", "combat", "repair"] as const;

function moonRank(name: SkillName): Crew["skills"] {
  return { [name]: XP_NEED[name] };
}

function moonRanks(): Crew["skills"] {
  const skills: Crew["skills"] = {};
  for (const name of MOON_SKILLS) skills[name] = XP_NEED[name];
  return skills;
}

function charlieJoins(g: Game, skills?: Crew["skills"]): string {
  // The page names Charlie and not a race. An unnamed race is that sector's crew list.
  return joinCrew(g, randomRace(g), "Charlie", skills)
    ? "Charlie joins you."
    : "There is no room aboard for Charlie.";
}

function clonebayLevel(g: Game): number {
  return g.player.kits.clonebay?.level ?? 0;
}

/** The cave. Blue options stay off until the ship meets the printed level. */
function moonCave(g: Game) {
  const choices = [
    {
      id: "s:moon:bring",
      label: eventText("event_STRANDED_2_c1_choice"),
    },
    { id: "s:moon:leave", label: eventText("event_STRANDED_2_c2_choice") },
  ];
  // Template:Blue Option, "Requires level 2" and "Requires level 3". A higher medbay still meets the lower line.
  const med = medbayLevel(g);
  if (med >= 2)
    choices.push({ id: "s:moon:medbay2", label: eventText("event_STRANDED_2_c3_choice") });
  if (med >= 3)
    choices.push({ id: "s:moon:medbay3", label: eventText("event_STRANDED_2_c4_choice") });
  if (livingKin(g, "slug"))
    choices.push({ id: "s:moon:slug", label: eventText("event_STRANDED_2_c5_choice") });
  card(g, eventText("event_STRANDED_2_text"), choices);
}

/** Four printed intros, no odds. INFERRED: equal. */
function trapCard(g: Game, page: Page): GameEvent {
  const body = randOpening(g, "pirate-ship-distress-trap");
  return {
    title: page.dest,
    body,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function abandonedStationCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: betweenOpening(g, page.slug),
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function rebelChanceCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: betweenOpening(g, page.slug),
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function wreckageCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: betweenOpening(g, page.slug),
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function moonCollapse(g: Game) {
  const choices = [{ id: "s:moon:collapse-continue", label: continueLabel() }];
  if (medbayLevel(g) >= 2)
    choices.push({
      id: "s:moon:collapse-medbay",
      label: eventText("event_MADMAN_4_c2_choice"),
    });
  if (clonebayLevel(g) >= 2)
    choices.push({
      id: "s:moon:collapse-clone",
      label: eventText("event_MADMAN_4_c3_choice"),
    });
  card(g, eventText("event_MADMAN_4_text"), choices);
}

function diseaseCure(g: Game) {
  const choices = [{ id: "s:unknown-disease:continue", label: continueLabel() }];
  if (g.augments.includes("NANO_MEDBAY")) {
    choices.push({
      id: "s:unknown-disease:medbot",
      label: eventText("event_DISTRESS_STATION_DISEASE_c5_c2_choice"),
    });
  }
  card(g, eventText("event_DISTRESS_STATION_DISEASE_c5_text"), choices);
}

/** Refueling station: the printed scrap cost buys that many fuel. A shortfall leaves the card up. */
function buyFuel(g: Game, id: string, fuel: number) {
  const cost = affordStock(g, id, "scrap");
  if (cost == null) return;
  takeStock(g, "scrap", cost);
  g.fuel += fuel;
  show(g, eventText("event_REFUEL_STATION_c1_text"), undefined, [`You receive ${fuel} fuel.`]);
}

/** The page says the engines are upgraded and prints no step. INFERRED: one level. A maxed system stays put. */
function bumpEngines(g: Game): string {
  const sys = g.player.systems.engines;
  if (!sys || sys.level <= 0 || upgradeCost("engines", sys.level) == null)
    return "The engines cannot take the upgrade.";
  sys.level += 1;
  return "Engines upgraded.";
}

function robertJoins(g: Game): string {
  return joinCrew(g, "Mantis", "Robert Smith")
    ? "Robert Smith joins you."
    : "There is no room aboard for Robert Smith.";
}

function ownsMindControl(g: Game): boolean {
  return (g.player.kits.mind?.level ?? 0) > 0;
}

/** Confused Mantis, after listening. Blue options stay off until the ship has them. */
function confusedMantisCard(g: Game) {
  const choices = [
    { id: "s:confused-mantis:shuttle", label: eventText("event_CONFUSED_MANTIS_c1_c1_choice") },
    { id: "s:confused-mantis:leave", label: eventText("event_CONFUSED_MANTIS_c1_c2_choice") },
  ];
  if (livingKin(g, "human"))
    choices.push({
      id: "s:confused-mantis:human",
      label: eventText("event_CONFUSED_MANTIS_c1_c3_choice"),
    });
  if (livingKin(g, "mantis"))
    choices.push({
      id: "s:confused-mantis:mantis",
      label: eventText("event_CONFUSED_MANTIS_c1_c4_choice"),
    });
  if (ownsMindControl(g))
    choices.push({
      id: "s:confused-mantis:mind",
      label: eventText("event_CONFUSED_MANTIS_c1_c5_choice"),
    });
  card(g, eventText("event_CONFUSED_MANTIS_c1_text"), choices);
}

function mantisColony(g: Game) {
  // Wiki citations:
  // > "The colony is a mining operation that specializes in FTL fuel. Robert's family, the head engineers, are excited to see him, and very grateful for his return. Apparently he ran away to 'join the Federation' like his older brother, but was never accepted onto a ship." — [[Confused Mantis#Mining Colony]]
  card(g, eventText("event_CONFUSED_MANTIS_HOME_text"), [
    { id: "s:confused-mantis:hire", label: eventText("event_CONFUSED_MANTIS_HOME_c1_choice") },
    { id: "s:confused-mantis:engines", label: eventText("event_CONFUSED_MANTIS_HOME_c2_choice") },
  ]);
}

function upgradeOxygen(g: Game): string {
  const sys = g.player.systems.oxygen;
  if (!sys || sys.level <= 0 || upgradeCost("oxygen", sys.level) == null)
    return "The oxygen system cannot take the upgrade.";
  sys.level += 1;
  return "Oxygen system upgraded.";
}

/** Terraforming scan, Improved Sensors level=2+. The page does not say whether damage drops it. INFERRED: the installed level. */
function sensorsLevel(g: Game): number {
  return g.player.systems.sensors?.level ?? 0;
}

/** Terraforming scan, Zoltan Crew. A dead Zoltan does not count. */
function livingZoltan(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "energy");
}

/**
 * Terraforming scan, Successful Scan, on the same page: oxygen upgrade, a Pirate ship, or the mold.
 * The three results print no odds. INFERRED: equal. The blue options land here and skip the failed scan.
 * "Set sensors to maximum" is that scan, not a permanent sensor upgrade.
 */
function successfulScan(g: Game, lead?: string) {
  const withLead = (text: string) => (lead ? `${lead}\n\n${text}` : text);
  const r = weighted(g, [
    ["oxygen", 1],
    ["pirate", 1],
    ["mold", 1],
  ] as const);
  if (r === "oxygen")
    show(g, withLead(eventText("event_HIGH_SCAN_TERRAFORMING_1_text")), undefined, [
      upgradeOxygen(g),
    ]);
  else if (r === "pirate")
    fight(
      g,
      withLead(eventText("event_HIGH_SCAN_TERRAFORMING_2_text")),
      "Pirate ship",
      "terraforming-scan",
    );
  else {
    card(g, withLead(eventText("event_HIGH_SCAN_TERRAFORMING_3_text")), [
      {
        id: "s:terraforming-scan:stop",
        label: eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_choice"),
      },
      {
        id: "s:terraforming-scan:leave",
        label: eventText("event_HIGH_SCAN_TERRAFORMING_3_c2_choice"),
      },
    ]);
  }
}

const WORD = { fuel: "fuel", missiles: "missiles", parts: "drone parts" } as const;

function stock(g: Game, id: "fuel" | "missiles" | "parts"): number {
  return id === "fuel" ? g.fuel : id === "missiles" ? g.missiles : g.player.parts;
}

/** Packed trade rows. The hail pick already happened. An empty table stays on the hail card. */
function refugeeOffers(id: string) {
  const rows = [];
  for (const row of eventDef(storedId(id))?.offers ?? []) if (row.k === "trade") rows.push(row);
  return rows;
}

function refugeeTrade(g: Game, slug: string) {
  const rows = refugeeOffers(slug);
  if (rows.length === 0) return;
  const t = rows[between(g, [0, rows.length - 1])]!;
  const pay = between(g, t.cost);
  const get = between(g, t.gain);
  card(g, eventText("event_REFUGEE_TRADER_text"), [
    {
      id: `s:${slug}:trade:${t.pay}:${pay}:${t.get}:${get}`,
      label: `${eventText("event_REFUGEE_TRADER_c1_choice")} [${pay} ${WORD[t.pay]} for ${get} ${WORD[t.get]}]`,
    },
    { id: `s:${slug}:decline`, label: eventText("event_REFUGEE_TRADER_c2_choice") },
  ]);
}

/** type=zoltan. The trade is one result, not DuplicateEvent|4. The other printed hail is the Zoltan ship. No odds. INFERRED: equal. */
function refugeeZoltanHail(g: Game, slug: string) {
  if (
    weighted(g, [
      ["trade", 1],
      ["zoltan", 1],
    ] as const) === "trade"
  ) {
    refugeeTrade(g, slug);
    return;
  }
  fight(g, eventText("event_REFUGEE_HAIL_LIST_ZOLTAN_1_text"), "Zoltan ship", slug, {
    never: true,
  });
}

function refugeeZoltanContact(g: Game) {
  show(g, eventText("ship_PIRATE_REFUGEE_destroyed_c1_text"), rollStandard(g, "low"));
}

/** type=pirate. The trade is one result, not DuplicateEvent|4. The other printed hail is the pirate bait. No odds. INFERRED: equal. */
function refugeePirateHail(g: Game, slug: string) {
  if (
    weighted(g, [
      ["trade", 1],
      ["bait", 1],
    ] as const) === "trade"
  ) {
    refugeeTrade(g, slug);
    return;
  }
  fight(
    g,
    slug.endsWith("slug")
      ? eventText("event_REFUGEE_HAIL_LIST_SLUG_1_text")
      : eventText("event_REFUGEE_HAIL_LIST_PIRATE_1_text"),
    "Pirate ship",
    slug,
    { never: true },
  );
}

/** deadCrew contact on type=pirate. The destroyed-ship contact stays the shared thanks. */
function refugeePirateFollow(g: Game) {
  show(g, eventText("ship_PIRATE_REFUGEE_deadCrew_c1_text"), rollStandard(g, "low"));
}

function refugeeHail(g: Game, slug: string) {
  const r = weighted(g, [
    ["trade", 4],
    ["ambush", 1],
    ["zoltan", 1],
    ["bait", 1],
    ["slug", 1],
  ] as const);
  if (r === "trade") {
    refugeeTrade(g, slug);
  } else if (r === "ambush") {
    fight(g, eventText("event_REFUGEE_HAIL_LIST_1_text"), "Pirate ship", slug);
  } else if (r === "zoltan") {
    fight(g, eventText("event_REFUGEE_HAIL_LIST_2_text"), "Zoltan ship", slug, { never: true });
  } else if (r === "bait") {
    fight(g, eventText("event_REFUGEE_HAIL_LIST_3_text"), "Pirate ship", slug, { never: true });
  } else {
    fight(g, eventText("event_REFUGEE_HAIL_LIST_4_text"), "Slug ship", slug, { never: true });
  }
}

function standardLines(offer: SurrenderOffer): string[] {
  const lines: string[] = [];
  if (offer.scrap) lines.push(`Scrap: ${offer.scrap}.`);
  if (offer.fuel) lines.push(`Fuel: ${offer.fuel}.`);
  if (offer.missiles) lines.push(`Missiles: ${offer.missiles}.`);
  if (offer.parts) lines.push(`Drone parts: ${offer.parts}.`);
  return lines;
}

/** Dense asteroid field distress, "Find remains of a ship". Both the search and Rock Plating open this card. */
function asteroidRemains(g: Game) {
  // Wiki citations:
  // > "Find remains of a ship." — [[Dense asteroid field distress]]
  // > "You find the decaying remains of some kind of ship coated with ice or crystal." — [[Dense asteroid field distress#Find remains of a ship]]
  card(g, eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_3_text"), [
    {
      id: "s:dense-asteroid-field-distress:weapon",
      label: eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_3_c1_c1_choice"),
    },
    {
      id: "s:dense-asteroid-field-distress:pod",
      label: eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_3_c1_c2_choice"),
    },
  ]);
}

/**
 * Lanius ship absorbing jump beacon, Leave.
 * DuplicateEvent|3 is three copies of nothing and one Lanius fight. Established, not invented.
 */
function beaconEaterLeave(g: Game) {
  // Wiki citations:
  // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
  if (
    weighted(g, [
      ["nothing", 3],
      ["fight", 1],
    ] as const) === "nothing"
  ) {
    show(g, eventText("event_LANIUS_BEACON_EATER_LEAVE_1_text"));
    return;
  }
  fight(
    g,
    eventText("event_LANIUS_BEACON_EATER_LEAVE_4_text"),
    "Lanius ship",
    "lanius-ship-absorbing-jump-beacon",
  );
}

/** Lanius craftsmen. Each craft button prints and spends its packed scrap count. */
function craftsmenMenu(g: Game, discount: boolean) {
  // Wiki citations:
  // > "Scrap lost: 45" — [[Lanius craftsmen]]
  // > "Scrap lost: 50" — [[Lanius craftsmen]]
  // > "Scrap lost: 40" — [[Lanius craftsmen]]
  // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
  const prefix = discount ? "s:lanius-craftsmen:help" : "s:lanius-craftsmen";
  const choices: { id: string; label: string }[] = [];
  const offer = (suffix: "aug" | "weapon" | "drone", label: (n: number) => string) => {
    const id = `${prefix}:${suffix}`;
    const n = scrapStock(id);
    if (n == null) return;
    choices.push({ id, label: label(n) });
  };
  offer("aug", (n) => `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c1_choice")} [${n} scrap]`);
  offer("weapon", (n) => `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c2_choice")} [${n} scrap]`);
  offer("drone", (n) => `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c3_choice")} [${n} scrap]`);
  choices.push({
    id: "s:lanius-craftsmen:decline",
    label: eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c4_choice"),
  });
  if (!discount)
    choices.push({
      id: "s:lanius-craftsmen:help",
      label: eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_choice"),
    });
  card(
    g,
    discount
      ? eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_text")
      : eventText("event_LANIUS_RESEARCHER_CRAFT_c1_text"),
    choices,
  );
}

/** Unnamed augmentation, weapon, or drone schematic. Rewards names the kind and not the item. */
function craftItem(g: Game, id: string, kind: "augment" | "weapon" | "drone", story: string) {
  const cost = scrapStock(id);
  if (cost == null || g.scrap < cost) return;
  g.scrap -= cost;
  const spent = `Scrap: -${cost}.`;
  show(g, story, undefined, [spent, grantRandomItem(g, kind)]);
}

function parseTrade(id: string): {
  pay: "fuel" | "missiles" | "parts";
  n: number;
  get: "fuel" | "missiles" | "parts";
  m: number;
} | null {
  const m = id.match(
    /^s:refugee(?:-distress-zoltan|-distress-pirate|-distress-slug|-distress|-zoltan|-pirate|-slug)?:trade:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/,
  );
  if (!m) return null;
  return { pay: m[1] as "fuel", n: Number(m[2]), get: m[3] as "fuel", m: Number(m[4]) };
}

export const FILLER_CHOICES: Record<string, (g: Game) => void> = {
  // ---- Large asteroid field ----
  "c:large-asteroid-field:0": (g) => {
    const r = weighted(g, [
      ["fuel", 1],
      ["missiles", 1],
      ["parts", 1],
      ["pirate", 1],
      ["rocks", 1],
      ["nothing", 1],
    ] as const);
    if (r === "fuel")
      show(g, eventText("event_ASTEROID_EXPLORE_RESULTS_2_text"), resource(g, "fuel", "high"));
    else if (r === "missiles")
      show(
        g,
        eventText("event_ASTEROID_EXPLORE_RESULTS_3_text"),
        resource(g, "missiles", "medium", "medium"),
      );
    else if (r === "parts")
      show(
        g,
        eventText("event_ASTEROID_EXPLORE_RESULTS_4_text"),
        resource(g, "parts", "medium", "medium"),
      );
    else if (r === "pirate")
      fight(
        g,
        eventText("event_ASTEROID_EXPLORE_RESULTS_6_text"),
        "Pirate ship",
        "large-asteroid-field",
        { asteroid: true },
      );
    else if (r === "rocks") {
      // Large asteroid field: "5 hull damage, 1 damage to a random system, 1 damage with 1-2 fires to a random room."
      if (hurt(g, 5)) return;
      show(g, eventText("event_ASTEROID_EXPLORE_RESULTS_5_text"), undefined, [
        "Hull damage: 5.",
        hurtRandomSystem(g),
        rockFires(g),
      ]);
    } else show(g, eventText("event_ASTEROID_EXPLORE_RESULTS_1_text"));
  },
  "c:large-asteroid-field:1": done,
  // Large asteroid field, Scrap Recovery Arm: "You receive high scrap." The arm must be fitted.
  "c:large-asteroid-field:2": (g) => {
    if (!g.augments.includes("SCRAP_COLLECTOR")) return;
    show(g, eventText("event_ASTEROID_EXPLORE_c3_text"), scrapOnly(g, "high"));
  },

  // ---- Battlefield wreckage ----
  "c:battlefield-wreckage:0": (g) => {
    const r = weighted(g, [
      ["little", 4],
      ["slug", 1],
      ["salvage", 1],
      ["mantis", 1],
      ["rebel", 1],
      ["zoltan", 1],
    ] as const);
    if (r === "little") show(g, eventText("event_WRECKAGE_INVESTIGATE_1_text"));
    else if (r === "slug") show(g, eventText("event_WRECKAGE_INVESTIGATE_9_text"));
    else if (r === "salvage")
      show(
        g,
        eventText("event_WRECKAGE_INVESTIGATE_5_text"),
        rollSurrenderOffer(g, "medium", true),
      );
    else if (r === "mantis")
      fight(
        g,
        eventText("event_WRECKAGE_INVESTIGATE_6_text"),
        "Mantis ship",
        "battlefield-wreckage",
      );
    else if (r === "rebel")
      fight(
        g,
        eventText("event_WRECKAGE_INVESTIGATE_7_text"),
        "Rebel ship",
        "battlefield-wreckage",
      );
    else
      fight(
        g,
        eventText("event_WRECKAGE_INVESTIGATE_8_text"),
        "Zoltan ship",
        "battlefield-wreckage",
      );
  },
  "c:battlefield-wreckage:1": done,
  // Battlefield wreckage. {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}.
  // The only printed result. level=2 means at least that installed level. Not a fight, and no "Nothing happens."
  // Advanced Sensors (level=3) can grant an unnamed weapon and prints no odds. Left unwired.
  "c:battlefield-wreckage:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    show(g, eventText("event_WRECKAGE_EVENT_c1_text"), rollSurrenderOffer(g, "medium", true));
  },

  // ---- Plagued station ----
  "c:plagued-station:0": (g) => {
    const r = weighted(g, [
      ["dead", 1],
      ["survivor", 1],
      ["sick", 1],
    ] as const);
    if (r === "dead") show(g, eventText("event_DONOR_PLAGUE_LIST_1_text"), scrapOnly(g, "low"));
    else if (r === "survivor")
      show(g, eventText("event_DONOR_PLAGUE_LIST_2_text"), scrapOnly(g, "low"), [
        gainCrew(g, "Human"),
      ]);
    else {
      const offer = scrapOnly(g, "low");
      payOffer(g, offer, true);
      card(g, `${eventText("event_DONOR_PLAGUE_LIST_3_text")}\n\nScrap: ${offer.scrap}.`, [
        { id: "s:plagued-station:continue", label: continueLabel() },
        // {{Blue Option|Improved Medbay|Try to cure the disease.|level=2+|shortreq=Medbay}}. The button stays on the card.
        { id: "s:plagued-station:cure", label: eventText("event_DONOR_PLAGUE_LIST_3_c2_choice") },
      ]);
    }
  },
  // "You lose a crewmember." Clone Bay has [no effect]. The page says "(Clone Bay)", any installed level, not level 2+.
  "s:plagued-station:continue": (g) => {
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.clonebay) extras.push(eventText("event_DONOR_PLAGUE_LIST_3_c1_c0_clone"));
    show(g, eventText("event_DONOR_PLAGUE_LIST_3_c1_text"), undefined, extras);
  },
  // Improved Medbay level=2+. The page's next line is "Nothing happens." The low scrap was already paid on the disease card.
  "s:plagued-station:cure": (g) => {
    if (medbayLevel(g) < 2) return;
    show(g, eventText("event_DONOR_PLAGUE_LIST_3_c2_text"));
  },
  "c:plagued-station:1": (g) => {
    show(g, eventText("event_DONOR_PLAGUE_c2_text"), scrapOnly(g));
  },

  // ---- Rebel fight chance ----
  "c:rebel-fight-chance:0": (g) => {
    const r = weighted(g, [
      ["found", 2],
      ["slow", 1],
      ["none", 1],
    ] as const);
    if (r === "found")
      fight(g, eventText("event_ROGUE_REBEL_SEARCH_2_text"), "Rebel ship", "rebel-fight-chance");
    else if (r === "slow") {
      // "Rebel Fleet pursuit is doubled for 1 jump" (citedChoose `faster`: one extra step).
      g.fleet += 1;
      fight(g, eventText("event_ROGUE_REBEL_SEARCH_4_text"), "Rebel ship", "rebel-fight-chance");
      showEventLines(g, ["Rebel Fleet pursuit is doubled for 1 jump."]);
    } else show(g, eventText("event_ROGUE_REBEL_SEARCH_1_text"));
  },
  "c:rebel-fight-chance:1": done,
  // Rebel fight chance. {{Blue Option|Improved Sensors|Perform a scan of the area.|level=2|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship. level=2 means at least that installed level.
  "c:rebel-fight-chance:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    fight(g, eventText("event_ROGUE_REBEL_c3_text"), "Rebel ship", "rebel-fight-chance");
  },
  // Rebel fight chance. {{Blue Option|Advanced Sensors|Pinpoint the Rebel's location.|level=3|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship whose engines are disabled.
  // INFERRED: "disabled" damages every installed engine bar. The page prints no bar count.
  // level=3 means at least that installed level.
  "c:rebel-fight-chance:3": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(g, eventText("event_ROGUE_REBEL_c4_text"), "Rebel ship", "rebel-fight-chance");
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage)
      hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },

  // Rebel fight chance in nebula. The chase lists three results and prints no odds. INFERRED: equal.
  "c:rebel-fight-chance-in-nebula:0": (g) => {
    // Wiki citations:
    // > "Stay hidden." — [[Rebel fight chance in nebula]]
    // > "Nothing happens." — [[Rebel fight chance in nebula]]
    show(g, eventText("event_NEBULA_REBEL_CHASE_c1_text"));
  },
  "c:rebel-fight-chance-in-nebula:1": (g) => {
    // Wiki citations:
    // > "Prepare to chase them!" — [[Rebel fight chance in nebula]]
    const r = weighted(g, [
      ["fight", 1],
      ["double", 1],
      ["none", 1],
    ] as const);
    if (r === "fight") {
      // Wiki citations:
      // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
      fight(
        g,
        eventText("event_NEBULA_REBEL_CHASE_LIST_1_text"),
        "Rebel ship",
        "rebel-fight-chance-in-nebula",
      );
      return;
    }
    if (r === "double") {
      // "Rebel Fleet pursuit is doubled." No jump count is printed. INFERRED: the current fleet position doubles, the same step as cited-events.ts fx double.
      // Wiki citations:
      // > "Rebel Fleet pursuit is doubled." — [[Rebel fight chance in nebula]]
      g.fleet *= 2;
      show(g, eventText("event_NEBULA_REBEL_CHASE_LIST_3_text"), undefined, [
        "Rebel Fleet pursuit is doubled.",
      ]);
      return;
    }
    // Wiki citations:
    // > "Nothing happens." — [[Rebel fight chance in nebula]]
    show(g, eventText("event_NEBULA_REBEL_CHASE_LIST_2_text"));
  },
  // Advanced Sensors level=3: at least that level. Long-Ranged Scanners and Lifeform Scanner each start the same Rebel fight.
  "c:rebel-fight-chance-in-nebula:2": (g) => {
    // Wiki citations:
    // > "(Advanced Sensors) Try to track them as you move to engage. (Requires level 3 Sensors)" — [[Rebel fight chance in nebula]]
    // > "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range." — [[Rebel fight chance in nebula]]
    // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
    if (sensorsLevel(g) < 3) return;
    fight(
      g,
      eventText("event_NEBULA_REBEL_CHASE_c3_text"),
      "Rebel ship",
      "rebel-fight-chance-in-nebula",
    );
  },
  "c:rebel-fight-chance-in-nebula:3": (g) => {
    // Wiki citations:
    // > "(Long-ranged Scanner) Try to track them as you move to engage." — [[Rebel fight chance in nebula]]
    // > "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range." — [[Rebel fight chance in nebula]]
    // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
    if (!g.augments.includes("ADV_SCANNERS")) return;
    fight(
      g,
      eventText("event_NEBULA_REBEL_CHASE_c3_text"),
      "Rebel ship",
      "rebel-fight-chance-in-nebula",
    );
  },
  "c:rebel-fight-chance-in-nebula:4": (g) => {
    // Wiki citations:
    // > "(Lifeform Scanner) Use their life signatures to follow." — [[Rebel fight chance in nebula]]
    // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
    if (!g.augments.includes("LIFE_SCANNER")) return;
    fight(
      g,
      eventText("event_NEBULA_REBEL_CHASE_c5_text"),
      "Rebel ship",
      "rebel-fight-chance-in-nebula",
    );
  },

  // Zoltan Great Eye. Pulling closer lists four results and prints no odds. INFERRED: equal.
  // Clone Bay has no effect. Healing Burst is named. A full weapon list is not installed (INFERRED: the page prints no full-slot sentence).
  "c:zoltan-great-eye:0": (g) => {
    // Wiki citations:
    // > "Pull the ship in closer." — [[Zoltan Great Eye]]
    const r = weighted(g, [
      ["lose", 1],
      ["fight", 1],
      ["scrap", 1],
      ["heal", 1],
    ] as const);
    if (r === "lose") {
      // Wiki citations:
      // > "As you approach, a kaleidoscope of colours fills the view-screen and one of your crew begins to age rapidly in reverse, eventually disappearing into nothingness. Let's hope they've transcended physical existence, and not just been forced out of it." — [[Zoltan Great Eye]]
      // > "You lose a crewmember." — [[Zoltan Great Eye]]
      // > "(Clone Bay) [no effect] You check your Cloning Bay but it lies dormant. Whatever just happened to your crewmember must be irreversible." — [[Zoltan Great Eye]]
      const extras = [];
      if (g.player.kits.clonebay) extras.push(eventText("event_NEBULA_ZOLTAN_EYE_LIST_4_c0_clone"));
      const note = loseCrew(g, true);
      if (note) extras.push(note);
      show(g, eventText("event_NEBULA_ZOLTAN_EYE_LIST_4_text"), undefined, extras);
      return;
    }
    if (r === "fight") {
      // Wiki citations:
      // > "Fight a Zoltan ship (default rewards)." — [[Zoltan Great Eye]]
      fight(g, eventText("event_NEBULA_ZOLTAN_EYE_LIST_2_text"), "Zoltan ship", "zoltan-great-eye");
      return;
    }
    if (r === "scrap") {
      // Wiki citations:
      // > "You receive high scrap." — [[Zoltan Great Eye]]
      show(g, eventText("event_NEBULA_ZOLTAN_EYE_LIST_3_text"), scrapOnly(g, "high"));
      return;
    }
    // Wiki citations:
    // > "You receive Healing Burst." — [[Zoltan Great Eye]]
    show(g, eventText("event_NEBULA_ZOLTAN_EYE_LIST_1_text"), {
      tier: "low",
      scrap: 0,
      eligible: 0,
      fuel: 0,
      missiles: 0,
      parts: 0,
      weapon: "BOMB_HEAL",
    });
  },
  "c:zoltan-great-eye:1": (g) => {
    show(g, eventText("event_NEBULA_ZOLTAN_EYE_c2_text"));
  },

  // Slocknog. The hire spends the packed scrap count. The page says the skills are shown and prints no numbers, so none are stored.
  // "when you arrive there will be a nebula environment" stays unwired: there is no separate per-fight nebula here.
  "c:slocknog:0": (g) => {
    // Wiki citations:
    // > "Hire Slocknog." — [[Slocknog]]
    // > "You receive a Slug crewmember named Slocknog." — [[Slocknog]]
    // > "Scrap lost: 55" — [[Slocknog]]
    const cost = scrapStock("c:slocknog:0");
    if (cost == null || g.scrap < cost) return;
    // Crew: at full crew a hire relieves someone already aboard (make-room.ts keepNewHire).
    joinCrew(g, "Slug", "Slocknog");
    keepNewHire(g);
    g.scrap -= cost;
    show(g, eventText("event_SLUG_DISTRESS_RESCUE_c1_text"), undefined, [`Scrap: -${cost}.`]);
  },
  "c:slocknog:1": (g) => {
    // Wiki citations:
    // > "Ignore Slocknog." — [[Slocknog]]
    card(g, eventText("event_SLUG_DISTRESS_RESCUE_LIST_1_text"), [
      { id: "s:slocknog:rescue", label: eventText("event_SLUG_DISTRESS_RESCUE_LIST_1_c1_choice") },
      { id: "s:slocknog:leave", label: eventText("event_SLUG_DISTRESS_RESCUE_LIST_1_c2_choice") },
    ]);
  },
  "s:slocknog:rescue": (g) => {
    // Wiki citations:
    // > "You receive a Slug crewmember named Slocknog." — [[Slocknog]]
    const note = joinCrew(g, "Slug", "Slocknog")
      ? "Slocknog joins you."
      : "There is no room aboard for Slocknog.";
    show(g, eventText("event_SLUG_DISTRESS_RESCUE_LIST_1_c1_text"), undefined, [note]);
  },
  "s:slocknog:leave": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Slocknog]]
    show(g, eventText("event_SLUG_DISTRESS_RESCUE_LIST_1_c2_text"));
  },

  // Dense asteroid field distress. Search lists three results and prints no odds. INFERRED: equal.
  // The salvaged weapon with low scrap: Rewards, "Weapon": "A random weapon & T scrap."
  "c:dense-asteroid-field-distress:0": (g) => {
    // Wiki citations:
    // > "Search for the ship." — [[Dense asteroid field distress]]
    // > "You find what appears to be pieces of a derelict ship coated with ice or crystal." — [[Dense asteroid field distress]]
    // > "Your ship takes 5 hull damage, 1 damage to engines." — [[Dense asteroid field distress]]
    // > "You receive a random amount of scrap with resources." — [[Dense asteroid field distress]]
    const r = weighted(g, [
      ["hit", 1],
      ["scrap", 1],
      ["remains", 1],
    ] as const);
    if (r === "hit") {
      if (hurt(g, 5)) return;
      if (g.player.systems.engines) hurtSystem(g.player, "engines", 1);
      show(g, eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_1_text"), undefined, [
        "Hull damage: 5.",
        "1 damage to engines.",
      ]);
      return;
    }
    if (r === "scrap") {
      show(g, eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_2_text"), rollStandard(g));
      return;
    }
    asteroidRemains(g);
  },
  "c:dense-asteroid-field-distress:1": (g) => {
    // Wiki citations:
    // > "Avoid the area." — [[Dense asteroid field distress]]
    // > "Nothing happens." — [[Dense asteroid field distress]]
    show(g, eventText("event_ASTEROID_DERELICT_SHIP_c2_text"));
  },
  "c:dense-asteroid-field-distress:2": (g) => {
    // Wiki citations:
    // > "Make a thorough search for the ship without fear of stray asteroids." — [[Dense asteroid field distress]]
    // > "Find remains of a ship." — [[Dense asteroid field distress]]
    if (!g.augments.includes("ROCK_ARMOR")) return;
    asteroidRemains(g);
  },
  "s:dense-asteroid-field-distress:weapon": (g) => {
    // Wiki citations:
    // > "Your crew grabs what they can and returns to the ship before the asteroid hits." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "You receive a weapon with low scrap." — [[Dense asteroid field distress#Find remains of a ship]]
    show(g, eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_3_c1_c1_text"), scrapOnly(g, "low"), [
      grantRandomItem(g, "weapon"),
    ]);
  },
  "s:dense-asteroid-field-distress:pod": (g) => {
    // Wiki citations:
    // > "The pod appears to be functioning but you see nothing but shards of crystal inside." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "You receive Damaged Stasis Pod augmentation with low scrap." — [[Dense asteroid field distress#Find remains of a ship]]
    // Damaged Stasis Pod can be held more than once. Three augments is the ship cap. INFERRED: a fourth is not installed.
    const note =
      receiveAugment(g, "STASIS_POD") === "queued"
        ? "No free augmentation slot for the Damaged Stasis Pod: choose what to leave behind."
        : "Damaged Stasis Pod.";
    show(g, eventText("event_ASTEROID_DERELICT_SHIP_SEARCH_3_c1_c2_text"), scrapOnly(g, "low"), [
      note,
    ]);
  },

  // Disabled Rock ship. Strip lists two results and prints no odds. INFERRED: equal.
  // Leave prints the nothing result twice. The Slug lookout's two sentences are alternatives. INFERRED: equal.
  "c:disabled-rock-ship:0": (g) => {
    // Wiki citations:
    // > "Strip the ship." — [[Disabled Rock ship]]
    const offer = rollStandard(g);
    if (
      weighted(g, [
        ["patrol", 1],
        ["quiet", 1],
      ] as const) === "patrol"
    ) {
      // Wiki citations:
      // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
      // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
      payOffer(g, offer, true);
      const paid = standardLines(offer);
      fight(g, eventText("event_ROCK_LOOTING_STRIP_2_text"), "Rock ship", "disabled-rock-ship");
      showEventLines(g, paid);
      return;
    }
    // Wiki citations:
    // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
    show(g, eventText("event_ROCK_LOOTING_STRIP_1_text"), offer);
  },
  "c:disabled-rock-ship:1": (g) => {
    // Wiki citations:
    // > "Leave it alone." — [[Disabled Rock ship]]
    if (
      weighted(g, [
        ["nothing", 2],
        ["fight", 1],
      ] as const) === "nothing"
    ) {
      // Wiki citations:
      // > "2× The Rock people are not known for setting traps but you hasten to leave anyway." — [[Disabled Rock ship]]
      // > "Nothing happens." — [[Disabled Rock ship]]
      show(g, eventText("event_ROCK_LOOTING_LEAVE_1_text"));
      return;
    }
    // Wiki citations:
    // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
    fight(g, eventText("event_ROCK_LOOTING_LEAVE_3_text"), "Rock ship", "disabled-rock-ship");
  },
  "c:disabled-rock-ship:2": (g) => {
    // Wiki citations:
    // > "(Slug Crew) Check for lifeforms and keep a lookout for ships while looting the wreck." — [[Disabled Rock ship]]
    // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
    if (!livingKin(g, "slug")) return;
    const clear =
      weighted(g, [
        ["clear", 1],
        ["ship", 1],
      ] as const) === "clear";
    const line = clear
      ? eventText("event_ROCK_LOOTING_SLUG_1_text")
      : eventText("event_ROCK_LOOTING_SLUG_2_text");
    show(g, line, rollStandard(g));
  },

  // Mantis fugitive. Each list prints no odds. INFERRED: equal.
  // The thanked Mantis is not named, so that crewmember is not added.
  "c:mantis-fugitive:0": (g) => {
    // Wiki citations:
    // > "Your ship takes 5 hull damage, 1 damage to a random system, 1 damage to a random room, and you fight a mantis-controlled Engi ship (default rewards)." — [[Mantis fugitive]]
    if (
      weighted(g, [
        ["trap", 1],
        ["thanks", 1],
      ] as const) === "trap"
    ) {
      if (hurt(g, 5)) return;
      const lines = ["Hull damage: 5.", hurtRandomSystem(g), roomBar(g)].filter(Boolean);
      fight(g, eventText("event_ALISON_MANTIS_CREW_HELP_1_text"), "Engi ship", "mantis-fugitive");
      mantisControlled(g);
      showEventLines(g, lines);
      return;
    }
    fight(g, eventText("event_ALISON_MANTIS_CREW_HELP_2_text"), "Engi ship", "mantis-fugitive");
  },
  "c:mantis-fugitive:1": (g) => {
    // Wiki citations:
    // > "You receive high scrap." — [[Mantis fugitive]]
    // > "Your ship takes 5 hull damage, 1 damage with alt=fire (S_fire2.png) to a random room, and you receive high scrap." — [[Mantis fugitive]]
    // > "1 mantis boarder beams aboard your ship, and you fight a mantis-controlled Engi ship (default rewards)." — [[Mantis fugitive]]
    const r = weighted(g, [
      ["scrap", 1],
      ["fire", 1],
      ["trap", 1],
    ] as const);
    if (r === "scrap") {
      show(g, eventText("event_ALISON_MANTIS_CREW_REJECT_1_text"), scrapOnly(g, "high"));
      return;
    }
    if (r === "fire") {
      if (hurt(g, 5)) return;
      show(g, eventText("event_ALISON_MANTIS_CREW_REJECT_2_text"), scrapOnly(g, "high"), [
        "Hull damage: 5.",
        rockFires(g),
      ]);
      return;
    }
    fight(g, eventText("event_ALISON_MANTIS_CREW_REJECT_3_text"), "Engi ship", "mantis-fugitive");
    mantisBoarders(g, 1, 1);
    mantisControlled(g);
  },

  // Slug ship boarding Rock ship. Engage lists a fight and a back-down and prints no odds. INFERRED: equal.
  // Ignore prints the nothing result twice.
  "c:slug-ship-boarding-rock-ship:0": (g) => {
    // Wiki citations:
    // > "Engage the Slug ship." — [[Slug ship boarding Rock ship]]
    if (
      weighted(g, [
        ["fight", 1],
        ["down", 1],
      ] as const) === "fight"
    ) {
      // Wiki citations:
      // > "Fight a Slug ship." — [[Slug ship boarding Rock ship]]
      fight(
        g,
        eventText("event_SLUG_DISTRESS_ROCK_FIGHT_2_text"),
        "Slug ship",
        "slug-ship-boarding-rock-ship",
      );
      return;
    }
    // Wiki citations:
    // > "You charge your weapons and the Slugs immediately back down. When you return to the freighter, the Rockmen have already repaired the worst of their damage and jump away without another word." — [[Slug ship boarding Rock ship]]
    // > "Nothing happens." — [[Slug ship boarding Rock ship]]
    show(g, eventText("event_SLUG_DISTRESS_ROCK_FIGHT_1_text"));
  },
  "c:slug-ship-boarding-rock-ship:1": (g) => {
    // Wiki citations:
    // > "Ignore them." — [[Slug ship boarding Rock ship]]
    if (
      weighted(g, [
        ["nothing", 2],
        ["fight", 1],
      ] as const) === "nothing"
    ) {
      // Wiki citations:
      // > "2× You have no desire to provoke Slugs in their own territory. You leave them alone." — [[Slug ship boarding Rock ship]]
      // > "Nothing happens." — [[Slug ship boarding Rock ship]]
      show(g, eventText("event_SLUG_DISTRESS_ROCK_AVOID_1_text"));
      return;
    }
    // Wiki citations:
    // > "Fight a Rock ship (default rewards)." — [[Slug ship boarding Rock ship]]
    fight(
      g,
      eventText("event_SLUG_DISTRESS_ROCK_AVOID_3_text"),
      "Rock ship",
      "slug-ship-boarding-rock-ship-rock",
    );
  },

  // Rock and Slug standoff. The debt is 10-15 scrap, shown on the button. Demand lists three results and prints no odds. INFERRED: equal.
  "c:rock-and-slug-standoff:0": (g) => {
    // Wiki citations:
    // > "Hail them to see what's wrong." — [[Rock and Slug standoff]]
    // > "Offer to pay off the Rock debt. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff]]
    const debt = rollPrice("ROCK_SLUG_ARGUMENT", "debt", (lo, hi) => between(g, [lo, hi]));
    const choices = [];
    if (debt != null) {
      choices.push({
        id: `s:rock-slug:debt:${debt}`,
        label: `${eventText("event_ROCK_SLUG_ARGUMENT_c1_c1_choice")} [${debt} scrap]`,
      });
    }
    choices.push(
      { id: "s:rock-slug:demand", label: eventText("event_ROCK_SLUG_ARGUMENT_c1_c2_choice") },
      { id: "s:rock-slug:leave", label: eventText("event_ROCK_SLUG_ARGUMENT_c1_c3_choice") },
    );
    card(g, eventText("event_ROCK_SLUG_ARGUMENT_c1_text"), choices);
  },
  "c:rock-and-slug-standoff:1": (g) => {
    // Wiki citations:
    // > "Leave them be." — [[Rock and Slug standoff]]
    // > "Nothing happens." — [[Rock and Slug standoff]]
    show(g, "Nothing happens.");
  },

  // Lanius ship absorbing rebel base. Three results and no odds. INFERRED: equal.
  // The fight pays default rewards, not up front.
  "c:lanius-ship-absorbing-rebel-base:0": (g) => {
    // Wiki citations:
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    const r = weighted(g, [
      ["delay", 1],
      ["fight", 1],
      ["nothing", 1],
    ] as const);
    if (r === "delay") {
      delayFleetOne(g);
      show(g, eventText("event_LANIUS_GROUP_AUTO_LIST_3_text"), rollStandard(g, "medium"), [
        "Rebel Fleet is delayed for 1 turn.",
      ]);
      return;
    }
    if (r === "fight") {
      fight(
        g,
        eventText("event_LANIUS_GROUP_AUTO_LIST_2_text"),
        "Lanius ship",
        "lanius-ship-absorbing-rebel-base-fight",
      );
      return;
    }
    show(g, eventText("event_LANIUS_GROUP_AUTO_LIST_1_text"));
  },
  "c:lanius-ship-absorbing-rebel-base:1": (g) => {
    // Wiki citations:
    // > "Leave them alone." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    show(g, eventText("event_LANIUS_GROUP_AUTO_c2_text"));
  },

  // Mantis ships battle for Rock freighter. Two fights and no odds. INFERRED: equal.
  // The weakened ship has Weapon Control reduced by 2. A ship with fewer bars loses only those bars. INFERRED.
  "c:mantis-ships-battle-for-rock-freighter:0": (g) => {
    // Wiki citations:
    // > "Wait, then attack the surviving Mantis." — [[Mantis ships battle for Rock freighter]]
    const weak =
      weighted(g, [
        ["weak", 1],
        ["full", 1],
      ] as const) === "weak";
    if (weak) {
      // Wiki citations:
      // > "Fight a Mantis ship whose Weapon Control system power level is reduced by 2." — [[Mantis ships battle for Rock freighter]]
      fight(
        g,
        eventText("event_ROCK_MANTIS_FREIGHTER_LIST_1_text"),
        "Mantis ship",
        "mantis-ships-battle-for-rock-freighter",
      );
      if (g.enemy) hurtSystem(g.enemy, "weapons", 2);
      return;
    }
    // Wiki citations:
    // > "Fight a Mantis ship." — [[Mantis ships battle for Rock freighter]]
    fight(
      g,
      eventText("event_ROCK_MANTIS_FREIGHTER_LIST_2_text"),
      "Mantis ship",
      "mantis-ships-battle-for-rock-freighter",
    );
  },
  "c:mantis-ships-battle-for-rock-freighter:1": (g) => {
    // Wiki citations:
    // > "Ignore them." — [[Mantis ships battle for Rock freighter]]
    // > "Nothing happens." — [[Mantis ships battle for Rock freighter]]
    show(g, eventText("event_ROCK_MANTIS_FREIGHTER_c2_text"));
  },
  // Repair Drone. High standard. Printed bug: no drone part is required when that reward includes drone parts.
  // The unnamed standard bonus stays unwired.
  "c:mantis-ships-battle-for-rock-freighter:2": (g) => {
    // Wiki citations:
    // > "(Repair Drone) Repair the Rock ship. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
    // > "You receive high scrap with resources." — [[Mantis ships battle for Rock freighter]]
    if (!ownsDrone(g, "REPAIR")) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(
      g,
      rollStandard(g, "high"),
      eventText("event_ROCK_MANTIS_FREIGHTER_c3_text"),
      hull,
      lines,
    );
  },
  // Hull Repair Drone. One drone part, then a Mantis ship. The bug note is not on this choice.
  "c:mantis-ships-battle-for-rock-freighter:3": (g) => {
    // Wiki citations:
    // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
    // > "Fight a Mantis ship." — [[Mantis ships battle for Rock freighter]]
    const n = affordStock(g, "c:mantis-ships-battle-for-rock-freighter:3", "parts");
    if (!ownsDrone(g, "SHIP_REPAIR") || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    fight(
      g,
      eventText("event_ROCK_MANTIS_FREIGHTER_c4_text"),
      "Mantis ship",
      "mantis-ships-battle-for-rock-freighter",
    );
    showEventLines(g, [spent]);
  },

  // Rock live mine. The turning circle always fails. The defuse lists two results and prints no odds. INFERRED: equal.
  "c:rock-live-mine:0": (g) => {
    // Wiki citations:
    // > "Attempt evasive maneuvers." — [[Rock live mine]]
    // > "(Missile Weapon) Attempt a controlled detonation using a missile. [ Icon missiles (cropped).png1 ] -- bugged: Hull Missile doesn't count" — [[Rock live mine]]
    // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
    card(g, eventText("event_ROCK_STARSHIP_MINE_c1_text"), [
      { id: "s:rock-mine:defuse", label: eventText("event_ROCK_STARSHIP_MINE_c1_c1_choice") },
      { id: "s:rock-mine:missile", label: eventText("event_ROCK_STARSHIP_MINE_c1_c2_choice") },
      {
        id: "s:rock-mine:beam",
        label: eventText("event_ROCK_STARSHIP_MINE_c1_c3_choice"),
      },
    ]);
  },
  "c:rock-live-mine:1": (g) => {
    // Wiki citations:
    // > "(Improved Engines) Reverse thrusters! (Requires level 5+ Engines)" — [[Rock live mine]]
    // > "Nothing happens." — [[Rock live mine]]
    if ((g.player.systems.engines?.level ?? 0) < 5) return;
    show(g, eventText("event_ROCK_STARSHIP_MINE_c2_text"));
  },
  "s:rock-mine:defuse": (g) => {
    if (
      weighted(g, [
        ["scrap", 1],
        ["wires", 1],
      ] as const) === "scrap"
    ) {
      // Wiki citations:
      // > "You receive medium scrap." — [[Rock live mine]]
      show(g, eventText("event_ROCK_STARSHIP_MINE_DEFUSE_1_text"), scrapOnly(g, "medium"));
      return;
    }
    card(g, eventText("event_ROCK_STARSHIP_MINE_DEFUSE_2_text"), [
      { id: "s:rock-mine:red", label: eventText("event_ROCK_STARSHIP_MINE_DEFUSE_2_c1_choice") },
      { id: "s:rock-mine:blue", label: eventText("event_ROCK_STARSHIP_MINE_DEFUSE_2_c2_choice") },
    ]);
  },
  // Both colors load Cut the wire. Two results and no odds. INFERRED: equal.
  "s:rock-mine:red": (g) => {
    // Wiki citations:
    // > "Cut the wire." — [[Rock live mine]]
    cutMineWire(g);
  },
  "s:rock-mine:blue": (g) => {
    // Wiki citations:
    // > "Cut the wire." — [[Rock live mine]]
    cutMineWire(g);
  },
  // Trivia: the missile item type is misspelled, so the ammo is not spent. Hull Missile does not count.
  "s:rock-mine:missile": (g) => {
    // Wiki citations:
    // > "(Missile Weapon) Attempt a controlled detonation using a missile. [ Icon missiles (cropped).png1 ] -- bugged: Hull Missile doesn't count" — [[Rock live mine]]
    // > "Your ship takes 4 hull damage, 1 damage to a random system, and you receive low scrap." — [[Rock live mine]]
    if (!miningMissile(g)) return;
    if (hurt(g, 4)) return;
    show(g, eventText("event_ROCK_STARSHIP_MINE_c1_c2_text"), scrapOnly(g, "low"), [
      "Hull damage: 4.",
      hurtRandomSystem(g),
    ]);
  },
  // Beam Drone. One drone part, then low scrap. The Anti-Ship Fire Drone does not count.
  "s:rock-mine:beam": (g) => {
    // Wiki citations:
    // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
    const n = affordStock(g, "s:rock-mine:beam", "parts");
    if (!ownsMineBeam(g) || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    show(g, eventText("event_ROCK_STARSHIP_MINE_c1_c3_text"), scrapOnly(g, "low"), [spent]);
  },

  // Engi smashed ships. "a random amount of resources with some scrap."
  // Rewards Stuff includes an unnamed bonus item. That grant stays unwired.
  "c:engi-smashed-ships:2": (g) => {
    if (!livingKin(g, "engi")) return;
    show(g, eventText("event_ENGI_SEX_c3_text"), rollSurrenderOffer(g, undefined, true));
  },
  "c:lanius-ship-absorbing-rebel-base:2": (g) => {
    // Wiki citations:
    // > "(Lanius Crew) Try to use them to delay the Rebels." — [[Lanius ship absorbing rebel base]]
    // > "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    if (!livingKin(g, "anaerobic")) return;
    delayFleetOne(g);
    show(g, eventText("event_LANIUS_GROUP_AUTO_c3_text"), rollStandard(g, "medium"), [
      "Rebel Fleet is delayed for 1 turn.",
    ]);
  },
  // Lanius ship absorbing jump beacon. Two ask results and no odds. INFERRED: equal.
  // Giving them 30 scrap grants an unnamed augmentation and stays off this card.
  "c:lanius-ship-absorbing-jump-beacon:0": (g) => {
    // Wiki citations:
    // > "After a long message the translator only able to spurt out \"critical... must... metal...\" You can only surmise they must be desperate for scrap." — [[Lanius ship absorbing jump beacon]]
    if (
      weighted(g, [
        ["talk", 1],
        ["fight", 1],
      ] as const) === "fight"
    ) {
      fight(
        g,
        eventText("event_LANIUS_BEACON_EATER_ASK_2_text"),
        "Lanius ship",
        "lanius-ship-absorbing-jump-beacon",
      );
      return;
    }
    card(g, eventText("event_LANIUS_BEACON_EATER_ASK_1_text"), [
      {
        id: "s:lanius-beacon-eater:leave",
        label: eventText("event_LANIUS_BEACON_EATER_ASK_1_c2_choice"),
      },
    ]);
  },
  "c:lanius-ship-absorbing-jump-beacon:1": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    beaconEaterLeave(g);
  },
  "s:lanius-beacon-eater:leave": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    beaconEaterLeave(g);
  },
  // Lanius crew. Decline does nothing. The 30 scrap, 6 missile, and 6 drone-part trades grant an unnamed augmentation and stay unwired.
  "c:lanius-ship-absorbing-jump-beacon:2": (g) => {
    // Wiki citations:
    // > "(Lanius Crew) Ask if they require assistance." — [[Lanius ship absorbing jump beacon]]
    if (!livingKin(g, "anaerobic")) return;
    card(g, eventText("event_LANIUS_BEACON_EATER_c4_text"), [
      {
        id: "s:lanius-beacon-eater:decline",
        label: eventText("event_LANIUS_BEACON_EATER_c4_c4_choice"),
      },
    ]);
  },
  "s:lanius-beacon-eater:decline": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    show(g, "Nothing happens.");
  },
  // Lanius craftsmen. 45, 50, and 40 scrap. The item is not named: Rewards, "Augment" / "Weapon" / "Drone".
  // {{Blue Option|Lanius Crew|Offer to help in the process.}} is the same trades at a 10 scrap discount.
  "c:lanius-craftsmen:0": (g) => {
    // Wiki citations:
    // > "Inquire about the process." — [[Lanius craftsmen]]
    craftsmenMenu(g, false);
  },
  "s:lanius-craftsmen:aug": (g) => {
    // Wiki citations:
    // > "Scrap lost: 45" — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content augmentation." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:aug",
      "augment",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c1_text"),
    );
  },
  "s:lanius-craftsmen:weapon": (g) => {
    // Wiki citations:
    // > "Scrap lost: 50" — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content weapon." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:weapon",
      "weapon",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c2_text"),
    );
  },
  "s:lanius-craftsmen:drone": (g) => {
    // Wiki citations:
    // > "Scrap lost: 40" — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content drone schematic." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:drone",
      "drone",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c3_text"),
    );
  },
  "s:lanius-craftsmen:help": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    if (!livingKin(g, "anaerobic")) return;
    craftsmenMenu(g, true);
  },
  "s:lanius-craftsmen:help:aug": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content augmentation." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:aug",
      "augment",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c1_text"),
    );
  },
  "s:lanius-craftsmen:help:weapon": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content weapon." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:weapon",
      "weapon",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c2_text"),
    );
  },
  "s:lanius-craftsmen:help:drone": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content drone schematic." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:drone",
      "drone",
      eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c3_text"),
    );
  },
  "s:lanius-craftsmen:decline": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Lanius craftsmen]]
    show(g, eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c4_text"));
  },
  "c:lanius-craftsmen:1": (g) => {
    // Wiki citations:
    // > "Leave them to their research." — [[Lanius craftsmen]]
    // > "Nothing happens." — [[Lanius craftsmen]]
    show(g, eventText("event_LANIUS_RESEARCHER_CRAFT_c2_text"));
  },
  // Crew hiring station. "Don't hire anyone." Nothing happens.
  // The 25-45 and 25-55 scrap hires grant an unnamed crewmember and stay unwired.
  "c:crew-hiring-station:0": (g) => {
    show(g, "Nothing happens.");
  },
  // Hull Repair Drone. The page prints no drone-part cost, so the part stays.
  // A full ship refuses the crewmember. INFERRED from the crew cap. The page does not print that sentence.
  "c:lanius-ship-absorbing-jump-beacon:3": (g) => {
    // Wiki citations:
    // > "(Hull Repair Drone) Send a drone to help." — [[Lanius ship absorbing jump beacon]]
    // > "You receive a Lanius crewmember." — [[Lanius ship absorbing jump beacon]]
    if (!ownsDrone(g, "SHIP_REPAIR")) return;
    const joined = joinCrew(g, "Lanius");
    show(g, eventText("event_LANIUS_BEACON_EATER_c5_text"), undefined, [
      joined
        ? "You receive a Lanius crewmember."
        : "There is no room aboard for the new crewmember.",
    ]);
  },
  // Lanius ship attacking civilian distress. Two results and no odds. INFERRED: equal.
  // A fight pays the page's medium or high standard. Powering down skips that and opens the same contact.
  "c:lanius-ship-attacking-civilian-distress:2": (g) => {
    if (!livingKin(g, "anaerobic")) return;
    if (
      weighted(g, [
        ["fight", 1],
        ["peace", 1],
      ] as const) === "fight"
    ) {
      fight(
        g,
        eventText("event_LANIUS_DISTRESS_FIGHT_LANIUS_2_text"),
        "Lanius ship",
        "lanius-ship-attacking-civilian-distress",
      );
      return;
    }
    card(g, eventText("event_LANIUS_DISTRESS_FIGHT_LANIUS_1_text"), [
      {
        id: "q:lanius-civilian:contact",
        label: eventText("ship_LANIUS_CIVILIAN_destroyed_c1_choice"),
      },
    ]);
  },

  // ---- Refugee / Refugee distress ----
  "c:refugee:0": (g) => refugeeHail(g, "refugee"),
  "c:refugee:1": done,
  // Refugee (Zoltan) and Refugee distress (Zoltan). type=zoltan.
  // Pirate ambush, pirate bait, and the Slug hunt are not on this type.
  "c:refugee-zoltan:0": (g) => refugeeZoltanHail(g, "refugee-zoltan"),
  "c:refugee-distress-zoltan:0": (g) => refugeeZoltanHail(g, "refugee-distress-zoltan"),
  "c:refugee-zoltan:1": (g) => {
    show(g, "Nothing happens.");
  },
  "c:refugee-distress-zoltan:1": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-zoltan:decline": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-distress-zoltan:decline": (g) => {
    show(g, "Nothing happens.");
  },
  // "Contact the refugee ship." Low scrap with resources. The fight reward is already paid.
  "s:refugee-zoltan:contact": refugeeZoltanContact,
  "s:refugee-distress-zoltan:contact": refugeeZoltanContact,
  // Refugee (Pirate). type=pirate. Not the Zoltan ship, the pirate ambush, or the Slug hunt.
  "c:refugee-pirate:0": (g) => refugeePirateHail(g, "refugee-pirate"),
  "c:refugee-pirate:1": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-pirate:decline": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-pirate:contact": refugeeZoltanContact,
  "s:refugee-pirate:contact-dead": refugeePirateFollow,
  // Refugee distress (Pirate). Same type=pirate hail as Refugee (Pirate).
  "c:refugee-distress-pirate:0": (g) => refugeePirateHail(g, "refugee-distress-pirate"),
  "c:refugee-distress-pirate:1": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-distress-pirate:decline": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-distress-pirate:contact": refugeeZoltanContact,
  "s:refugee-distress-pirate:contact-dead": refugeePirateFollow,
  // Refugee (Slug). type=slug uses the same pirate bait as type=pirate, not the Slug hunt.
  "c:refugee-slug:0": (g) => refugeePirateHail(g, "refugee-slug"),
  "c:refugee-slug:1": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-slug:decline": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-slug:contact": refugeeZoltanContact,
  "s:refugee-slug:contact-dead": refugeePirateFollow,
  // Refugee distress (Slug). Same type=slug hail as Refugee (Slug).
  "c:refugee-distress-slug:0": (g) => refugeePirateHail(g, "refugee-distress-slug"),
  "c:refugee-distress-slug:1": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-distress-slug:decline": (g) => {
    show(g, "Nothing happens.");
  },
  "s:refugee-distress-slug:contact": refugeeZoltanContact,
  "s:refugee-distress-slug:contact-dead": refugeePirateFollow,
  "c:refugee-distress:0": (g) => refugeeHail(g, "refugee-distress"),
  "c:refugee-distress:1": done,
  "s:refugee:decline": done,
  "s:refugee-distress:decline": done,

  // ---- Intelligent ponies ----
  "c:intelligent-ponies:0": (g) => {
    card(g, eventText("event_DONOR_PONY_c1_text"), [
      { id: "s:intelligent-ponies:talk", label: eventText("event_DONOR_PONY_c1_c1_choice") },
      { id: "s:intelligent-ponies:sell", label: eventText("event_DONOR_PONY_c1_c2_choice") },
      { id: "s:intelligent-ponies:leave", label: eventText("event_DONOR_PONY_c1_c3_choice") },
    ]);
  },
  "s:intelligent-ponies:talk": (g) => {
    if (rand(g) < 0.5) {
      show(g, eventText("event_DONOR_PONY_PEACE_1_text"), rollStandard(g, "low"), [
        gainCrew(g, "Engi"),
      ]);
    } else show(g, eventText("event_DONOR_PONY_PEACE_2_text"));
  },
  "s:intelligent-ponies:sell": (g) => {
    if (rand(g) < 0.5) {
      show(g, eventText("event_DONOR_PONY_SELL_2_text"), undefined, [loseCrew(g)]);
    } else show(g, eventText("event_DONOR_PONY_SELL_1_text"));
  },
  "s:intelligent-ponies:leave": (g) => show(g, eventText("event_DONOR_PONY_c1_c3_text")),
  "c:intelligent-ponies:1": (g) => show(g, eventText("event_DONOR_PONY_c2_text")),

  // ---- Abandoned station ----
  "c:abandoned-station:0": (g) => {
    // DuplicateEvent|2 is the two printed supply lines. INFERRED: equal, so scrap stays twice as common.
    const r = weighted(g, [
      ["rest", 1],
      ["hull", 1],
      ["pirates", 1],
      ["battery", 1],
      ["clone", 1],
      ["shell", 1],
    ] as const);
    if (r === "rest") show(g, eventText("event_EMPTY_STATION2_LIST_2_text"), scrapOnly(g, "low"));
    else if (r === "hull")
      show(g, eventText("event_EMPTY_STATION2_LIST_3_text"), scrapOnly(g, "low"));
    else if (r === "pirates") {
      fight(g, eventText("event_EMPTY_STATION2_LIST_5_text"), "Pirate ship", "abandoned-station");
      // "2 boarders beam aboard your ship" (surrender.ts humanBoarders, the same intruder kit).
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      humanBoarders(g, 2, 4, "boarders beam aboard.");
      beginBoarding(g, true);
      showEventLines(g, [eventText("event_EMPTY_STATION2_LIST_6_text")]);
    } else if (r === "clone") {
      // {{Blue Option|Clonebay|Search for a surviving DNA bank.}} The button stays visible.
      card(g, eventText("event_EMPTY_STATION2_LIST_4_text"), [
        {
          id: "s:abandoned-station:dna",
          label: eventText("event_EMPTY_STATION2_LIST_4_c1_choice"),
        },
        {
          id: "s:abandoned-station:scrap",
          label: eventText("event_EMPTY_STATION2_LIST_4_c2_choice"),
        },
      ]);
    } else show(g, eventText("event_EMPTY_STATION2_LIST_1_text"));
  },
  "s:abandoned-station:scrap": (g) =>
    show(g, eventText("event_EMPTY_STATION2_LIST_4_c2_text"), scrapOnly(g, "low")),
  // Clonebay DNA. DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The two calm sentences are the duplicate. INFERRED: equal inside that weight. The boarder's race is not named.
  "s:abandoned-station:dna": (g) => {
    if ((g.player.kits.clonebay?.level ?? 0) <= 0) return;
    const rebuilt = eventText("event_EMPTY_STATION2_LIST_4_c1_text");
    if (
      weighted(g, [
        ["calm", 2],
        ["crazed", 1],
      ] as const) === "crazed"
    ) {
      humanBoarders(g, 1, 1, "boarder beams aboard.");
      beginBoarding(g);
      showEventLines(g, [`${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_3_text")}`]);
      return;
    }
    const calm =
      rand(g) < 0.5
        ? `${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_1_text")}`
        : `${rebuilt} ${eventText("event_EMPTY_STATION2_CLONE_2_text")}`;
    show(g, calm, undefined, [gainCrew(g)]);
  },
  // Abandoned station. "Stay near the Beacon." One printed result.
  "c:abandoned-station:1": (g) => show(g, eventText("event_EMPTY_STATION2_c2_text")),

  // ---- Terraforming scan ----
  "c:terraforming-scan:0": (g) => {
    card(g, eventText("event_TERRAFORMING_SCAN_c1_text"), [
      { id: "s:terraforming-scan:scan", label: eventText("event_TERRAFORMING_SCAN_c1_c1_choice") },
      {
        id: "s:terraforming-scan:sensors",
        label: eventText("event_TERRAFORMING_SCAN_c1_c2_choice"),
      },
      {
        id: "s:terraforming-scan:zoltan",
        label: eventText("event_TERRAFORMING_SCAN_c1_c3_choice"),
      },
    ]);
  },
  // Attempt to scan. One of the two printed results. INFERRED: equal. The modulate line is only this success.
  // Improved Sensors and a Zoltan go straight to Successful Scan and do not print it.
  "s:terraforming-scan:scan": (g) => {
    if (rand(g) < 0.5) {
      show(g, eventText("event_NORMAL_SCAN_TERRAFORMING_1_text"));
      return;
    }
    successfulScan(g, eventText("event_NORMAL_SCAN_TERRAFORMING_2_text"));
  },
  // Improved Sensors level 2+ goes straight to Successful Scan.
  "s:terraforming-scan:sensors": (g) => {
    if (sensorsLevel(g) < 2) return;
    successfulScan(g);
  },
  // A living Zoltan goes straight to Successful Scan.
  "s:terraforming-scan:zoltan": (g) => {
    if (!livingZoltan(g)) return;
    successfulScan(g);
  },
  "s:terraforming-scan:stop": (g) => {
    // "[ the actual trade offer is shown prior to making the choice ]": 15-25 scrap either way.
    const n = rollPrice("TERRAFORMING_SCAN", "scan", (lo, hi) => between(g, [lo, hi]));
    const choices = [];
    if (n != null) {
      choices.push(
        {
          id: `s:terraforming-scan:bribe:${n}`,
          label: `${eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_c1_choice")} [+${n} scrap]`,
        },
        {
          id: `s:terraforming-scan:pay:${n}`,
          label: `${eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_c2_choice")} [${n} scrap]`,
        },
      );
    }
    choices.push({
      id: "s:terraforming-scan:demand",
      label: eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_c3_choice"),
    });
    card(g, eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_text"), choices);
  },
  "s:terraforming-scan:demand": (g) =>
    show(g, eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_c3_text")),
  "s:terraforming-scan:leave": done,
  "c:terraforming-scan:1": (g) => show(g, eventText("event_TERRAFORMING_SCAN_c2_text")),

  // ---- Nebula lost ship ----
  "c:nebula-lost-ship:0": (g) => {
    const r = weighted(g, [
      ["found", 1],
      ["rebel", 1],
      ["none", 1],
    ] as const);
    if (r === "found")
      show(g, eventText("event_NEBULA_LOST_SHIP_LIST_3_text"), undefined, [gainCrew(g)]);
    else if (r === "rebel")
      fight(g, eventText("event_NEBULA_LOST_SHIP_LIST_2_text"), "Rebel ship", "nebula-lost-ship");
    else show(g, eventText("event_NEBULA_LOST_SHIP_LIST_1_text"));
  },
  "c:nebula-lost-ship:1": done,
  // {{Blue Option|Teleporter}}. A crewmember and medium scrap.
  "c:nebula-lost-ship:2": (g) => {
    if ((g.player.kits.teleporter?.level ?? 0) <= 0) return;
    show(g, eventText("event_NEBULA_LOST_SHIP_c3_text"), scrapOnly(g, "medium"), [gainCrew(g)]);
  },
  // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
  "c:nebula-lost-ship:3": (g) => {
    if (!g.augments.includes("ADV_SCANNERS")) return;
    if (rand(g) < 0.5)
      show(g, eventText("event_NEBULA_LOST_SHIP_LIST2_2_text"), undefined, [gainCrew(g)]);
    else show(g, eventText("event_NEBULA_LOST_SHIP_LIST2_1_text"), scrapOnly(g, "medium"));
  },

  // ---- Plasma storm incapacitated ships ----
  "c:plasma-storm-incapacitated-ships:0": (g) => {
    const r = weighted(g, [
      ["debris", 1],
      ["passenger", 1],
      ["tether", 1],
      ["schematic", 1],
      ["weapon", 1],
    ] as const);
    if (r === "debris") {
      // "4 hull damage, a breach to a random system" and high resources with some scrap.
      // The breach does not destroy the system.
      if (hurt(g, 4)) return;
      const breach = breachRandomSystem(g);
      show(g, eventText("event_STORM_ITEMS_LIST_1_text"), rollSurrenderOffer(g, "high", true), [
        "Hull damage: 4.",
        breach,
      ]);
    } else if (r === "passenger") {
      show(g, eventText("event_STORM_ITEMS_LIST_2_text"), rollStandard(g, "low"), [gainCrew(g)]);
    } else if (r === "tether") {
      show(g, eventText("event_STORM_ITEMS_LIST_3_text"), rollStandard(g, "low"), [loseCrew(g)]);
    } else if (r === "schematic") {
      // A drone schematic with medium scrap. Rewards, "Drone": "A random drone schematic & T scrap."
      show(g, eventText("event_STORM_ITEMS_LIST_4_text"), scrapOnly(g, "medium"), [
        grantRandomItem(g, "drone"),
      ]);
    } else {
      show(g, eventText("event_STORM_ITEMS_LIST_5_text"), weaponOffer(g, "medium"));
    }
  },
  "c:plasma-storm-incapacitated-ships:1": done,
  // {{Blue Option|Piloting|level=2+}}. Four results, no odds. INFERRED: equal.
  // The weapon result is low scrap. The manual search's weapon result is medium.
  "c:plasma-storm-incapacitated-ships:2": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    const r = weighted(g, [
      ["passenger", 1],
      ["schematic", 1],
      ["weapon", 1],
      ["nothing", 1],
    ] as const);
    if (r === "passenger") {
      show(g, eventText("event_STORM_ITEMS_LIST_2_text"), rollStandard(g, "low"), [gainCrew(g)]);
    } else if (r === "schematic") {
      show(g, eventText("event_STORM_ITEMS_PILOTING_2_text"), scrapOnly(g, "medium"), [
        grantRandomItem(g, "drone"),
      ]);
    } else if (r === "weapon") {
      show(g, eventText("event_STORM_ITEMS_PILOTING_3_text"), weaponOffer(g, "low"));
    } else {
      show(g, eventText("event_STORM_ITEMS_PILOTING_4_text"));
    }
  },

  // ---- Friendly ship out of fuel (the give id carries the amount; fillerChoose parses it) ----
  "c:friendly-ship-out-of-fuel:1": (g) => show(g, eventText("event_FRIENDLY_BEACON_c2_text")),

  // ---- Refugee comms down ----
  "c:refugee-comms-down:0": (g) => {
    const r = weighted(g, [
      ["cannibals", 1],
      ["freezer", 1],
      ["supplies", 1],
      ["boarders", 1],
      ["ghost", 1],
    ] as const);
    if (r === "cannibals") {
      // Clone Bay revives them. The page prints that waiting sentence, then "The lost crewmember is revived."
      const extras = [loseCrew(g)];
      if (g.player.kits.clonebay) extras.unshift(eventText("event_REFUGEE_GHOST_LIST_4_c0_clone"));
      show(g, eventText("event_REFUGEE_GHOST_LIST_4_text"), undefined, extras);
    } else if (r === "freezer")
      show(g, eventText("event_REFUGEE_GHOST_LIST_3_text"), undefined, [gainCrew(g)]);
    else if (r === "supplies")
      show(
        g,
        eventText("event_REFUGEE_GHOST_LIST_2_text"),
        resource(g, "missiles", "medium", "medium"),
      );
    else if (r === "boarders") {
      humanBoarders(g, 2, 4, "human boarders beam aboard.");
      beginBoarding(g);
      showEventLines(g, [eventText("event_REFUGEE_GHOST_LIST_5_text")]);
    } else show(g, eventText("event_REFUGEE_GHOST_LIST_1_text"));
  },
  "c:refugee-comms-down:1": done,
  "c:empty-nebula-beacon:0": done,

  // Boarders: Humans (Abandoned). The page has no choice. Arrival calls this id so the red line
  // "3-4 human boarders beam aboard your ship" is the outcome, not a button. No ship.
  // After a Lanius fight, and on a repeat before another fight, they have Emergency Respirators.
  // INFERRED: lastFaction is that fight.
  "c:boarders-humans-abandoned:0": (g) => {
    const lungs = g.lastFaction === "lanius";
    humanBoarders(g, 3, 4, "human boarders beam aboard your ship.", lungs);
    beginBoarding(g);
  },

  // Boarders: Humans (Pirate). The page has no choice. Arrival calls this id so the red line
  // "3-5 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). No ship. No lungs. Not a crew grant.
  "c:boarders-humans-pirate:0": (g) => {
    // Wiki citations:
    // > "3-5 human boarders beam aboard your ship." — [[Boarders: Humans (Pirate)]]
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Boarders: Humans near sun. The page has no choice. Arrival calls this id so the red line
  // "2-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). redgiant=true arms the existing flare clock. No ship.
  "c:boarders-humans-near-sun:0": (g) => {
    // Wiki citations:
    // > "2-4 human boarders beam aboard your ship." — [[Boarders: Humans near sun]]
    humanBoarders(g, 2, 4, "human boarders beam aboard your ship.");
    beginBoarding(g, false, true);
  },

  // Boarders: Rockmen near sun. The page has no choice. Arrival calls this id so the red line
  // "2-3 rock boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). redgiant=true arms the existing flare clock. No ship. Not a crew grant.
  "c:boarders-rockmen-near-sun:0": (g) => {
    // Wiki citations:
    // > "2-3 rock boarders beam aboard your ship." — [[Boarders: Rockmen near sun]]
    rockBoarders(g, 2, 3);
    beginBoarding(g, false, true);
  },

  // Boarders: Mantis. The page has no choice. Arrival calls this id so the red line
  // "2-4 mantis boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). No ship. Not a crew grant.
  "c:boarders-mantis:0": (g) => {
    // Wiki citations:
    // > "2-4 mantis boarders beam aboard your ship." — [[Boarders: Mantis]]
    mantisBoarders(g, 2, 4);
    beginBoarding(g);
  },

  // Boarders: Humans in nebula. The page has no choice. Arrival calls this id so the red line
  // "2-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). nebula=true is the beacon, not a new hazard. No ship.
  "c:boarders-humans-in-nebula:0": (g) => {
    humanBoarders(g, 2, 4, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Boarders: rebels in nebula. The page has no choice. Arrival calls this id so the red line
  // "3-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). nebula=true is the beacon, not a new hazard. No ship.
  "c:boarders-rebels-in-nebula:0": (g) => {
    humanBoarders(g, 3, 4, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Boarders: Crystal. The page has no choice. Arrival calls this id so the red line
  // "2-3 crystal boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). unique=false: Template:Locations says this event can occur multiple times per sector.
  // No ship. Not a crew grant.
  "c:boarders-crystal:0": (g) => {
    // Wiki citations:
    // > "2-3 crystal boarders beam aboard your ship." — [[Boarders: Crystal]]
    crystalBoarders(g, 2, 3);
    beginBoarding(g);
  },

  // Boarders: Humans jammed sensors. "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
  // INFERRED: the count is inclusive (between()). No ship. Not a crew grant.
  "c:boarders-humans-jammed-sensors:0": (g) => {
    // Wiki citations:
    // > "Continue..." — [[Boarders: Humans jammed sensors]]
    // > "3-5 human boarders beam aboard your ship, and your Sensors are disabled." — [[Boarders: Humans jammed sensors]]
    // > "If you don't counter the jam, the Sensors functionality is not restored till you jump to another beacon." — [[Boarders: Humans jammed sensors#Notes]]
    shutPlayerSensors(g);
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
    showEventLines(g, [eventText("event_BOARDERS_HACKING_c1_text")]);
  },

  // Refueling station. "Buy 6 Fuel for 12 Scrap", "Buy 3 Fuel for 6 Scrap", "Buy 1 Fuel for 2 Scrap".
  "c:refueling-station:0": (g) => buyFuel(g, "c:refueling-station:0", 6),
  "c:refueling-station:1": (g) => buyFuel(g, "c:refueling-station:1", 3),
  "c:refueling-station:2": (g) => buyFuel(g, "c:refueling-station:2", 1),
  "c:refueling-station:3": done,

  // Asteroid mining colony. The launch "has no effect" and the non-blue choices return.
  "c:asteroid-mining-colony:0": (g) => {
    if (!miningMissile(g)) return;
    card(g, eventText("event_HELP_MINERS_c1_text"), miningOffers());
  },
  "c:asteroid-mining-colony:1": (g) => giveMiners(g, "c:asteroid-mining-colony:1"),
  "c:asteroid-mining-colony:2": (g) => giveMiners(g, "c:asteroid-mining-colony:2"),
  "c:asteroid-mining-colony:3": (g) => {
    show(g, eventText("event_HELP_MINERS_c1_c3_text"));
  },

  // Improve reactor for supplies. The static agree button opens the priced card.
  "c:improve-reactor-for-supplies:0": (g) => {
    const ev = supplyCard(g, pageBySlug("improve-reactor-for-supplies")!);
    g.event = ev;
    g.phase = "event";
    g.paused = true;
  },
  "c:improve-reactor-for-supplies:1": (g) => {
    show(g, eventText("event_TRADER_UPGRADES_EXCHANGE_c2_text"));
  },

  // Giant alien spiders. Two crew results, no odds. INFERRED: equal.
  "c:giant-alien-spiders:0": (g) => {
    const r = weighted(g, [
      ["lose", 1],
      ["reward", 1],
    ] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, eventText("event_DISTRESS_INFESTATION_LIST_1_text"), undefined, note ? [note] : []);
      return;
    }
    show(
      g,
      eventText("event_DISTRESS_INFESTATION_LIST_2_text"),
      rollSurrenderOffer(g, "high", true),
    );
  },
  "c:giant-alien-spiders:1": (g) => {
    show(g, eventText("event_DISTRESS_INFESTATION_c2_text"));
  },
  "c:giant-alien-spiders:2": (g) => {
    spiderDrone(g, "personnel", eventText("event_DISTRESS_INFESTATION_c3_text"));
  },
  "c:giant-alien-spiders:3": (g) => {
    spiderDrone(g, "BOARDER", eventText("event_DISTRESS_INFESTATION_c4_text"));
  },
  "c:giant-alien-spiders:4": (g) => {
    if (!ownsAntiBio(g)) return;
    show(g, eventText("event_DISTRESS_INFESTATION_c5_text"), rollSurrenderOffer(g, "high", true));
  },

  // Crushed pirate. Each pair of results has no odds. INFERRED: equal.
  "c:crushed-pirate:0": (g) => {
    const r = weighted(g, [
      ["shock", 1],
      ["free", 1],
    ] as const);
    if (r === "shock") {
      if (hurt(g, 2)) return;
      show(g, eventText("event_DISTRESS_TRAPPED_MINER_SHOOT_1_text"), scrapOnly(g, "low"), [
        "Hull damage: 2.",
        hurtRandomSystem(g, 2),
      ]);
      return;
    }
    show(g, eventText("event_DISTRESS_TRAPPED_MINER_SHOOT_2_text"), rollStandard(g, "medium"));
  },
  "c:crushed-pirate:1": (g) => {
    const r = weighted(g, [
      ["loot", 1],
      ["fight", 1],
    ] as const);
    if (r === "loot") {
      show(g, eventText("event_DISTRESS_TRAPPED_MINER_LOOT_1_text"), rollStandard(g, "medium"));
      return;
    }
    // Fight a Pirate ship (default rewards). The PIRATE surrender and escape rows are that faction's plan.
    fight(
      g,
      eventText("event_DISTRESS_TRAPPED_MINER_LOOT_2_text"),
      "Pirate ship",
      "crushed-pirate",
    );
  },
  "c:crushed-pirate:2": (g) => {
    if (!ownsCuttingBeam(g)) return;
    show(g, eventText("event_DISTRESS_TRAPPED_MINER_c3_text"), rollStandard(g, "medium"));
  },
  "c:crushed-pirate:3": (g) => {
    if (!ownsBeamDrone(g)) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(
      g,
      rollStandard(g, "medium"),
      eventText("event_DISTRESS_TRAPPED_MINER_c4_text"),
      hull,
      lines,
    );
  },

  // Unknown disease. Two crew results, no odds. INFERRED: equal. Clone Bay does not revive them.
  "c:unknown-disease-on-mining-colony:0": (g) => {
    const r = weighted(g, [
      ["lose", 1],
      ["nothing", 1],
    ] as const);
    if (r === "nothing") {
      show(g, eventText("event_DISTRESS_STATION_DISEASE_LIST_1_text"));
      return;
    }
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.clonebay)
      extras.push(eventText("event_DISTRESS_STATION_DISEASE_LIST_2_c0_clone"));
    show(
      g,
      eventText("event_DISTRESS_STATION_DISEASE_LIST_2_text"),
      rollSurrenderOffer(g, "medium", true),
      extras,
    );
  },
  "c:unknown-disease-on-mining-colony:1": (g) => {
    show(g, eventText("event_DISTRESS_STATION_DISEASE_c2_text"));
  },
  "c:unknown-disease-on-mining-colony:2": (g) => {
    if (!livingKin(g, "rock")) return;
    show(
      g,
      eventText("event_DISTRESS_STATION_DISEASE_c3_text"),
      rollSurrenderOffer(g, "medium", true),
    );
  },
  "c:unknown-disease-on-mining-colony:3": (g) => {
    if (!livingKin(g, "engi")) return;
    show(
      g,
      eventText("event_DISTRESS_STATION_DISEASE_c4_text"),
      rollSurrenderOffer(g, "medium", true),
    );
  },
  "c:unknown-disease-on-mining-colony:4": (g) => {
    if (medbayLevel(g) < 2) return;
    diseaseCure(g);
  },

  // Fire on research station. Each pair has no odds. INFERRED: equal.
  "c:fire-on-research-station:0": (g) => {
    const r = weighted(g, [
      ["lose", 1],
      ["scrap", 1],
    ] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(
        g,
        eventText("event_DISTRESS_STATION_FIRE_CREW_1_text"),
        scrapOnly(g, "low"),
        note ? [note] : [],
      );
      return;
    }
    show(g, eventText("event_DISTRESS_STATION_FIRE_CREW_2_text"), scrapOnly(g, "high"));
  },
  "c:fire-on-research-station:1": (g) => {
    const r = weighted(g, [
      ["blast", 1],
      ["jones", 1],
    ] as const);
    if (r === "blast") {
      if (hurt(g, 4)) return;
      show(g, eventText("event_DISTRESS_STATION_FIRE_RESCUE_1_text"), scrapOnly(g, "low"), [
        "Hull damage: 4.",
        hurtRandomSystem(g),
      ]);
      return;
    }
    // The page names Dr. Jones and not a race. An unnamed race is that sector's crew list.
    const race = randomRace(g);
    const joined = joinCrew(g, race, "Dr. Jones");
    show(g, eventText("event_DISTRESS_STATION_FIRE_RESCUE_2_text"), scrapOnly(g, "low"), [
      joined ? "Dr. Jones joins you." : "There is no room aboard for Dr. Jones.",
    ]);
  },
  "c:fire-on-research-station:2": (g) => {
    show(g, eventText("event_DISTRESS_STATION_FIRE_c3_text"));
  },
  "c:fire-on-research-station:3": (g) => {
    if (!livingKin(g, "rock")) return;
    // An augmentation with high scrap. Rewards, "Augment": "A random augmentation & T scrap."
    show(g, eventText("event_DISTRESS_STATION_FIRE_c4_text"), scrapOnly(g, "high"), [
      grantRandomItem(g, "augment"),
    ]);
  },
  "c:fire-on-research-station:4": (g) => {
    if (!ownsDrone(g, "REPAIR")) return;
    // A drone schematic with high scrap. Rewards, "Drone": "A random drone schematic & T scrap."
    show(g, eventText("event_DISTRESS_STATION_FIRE_c5_text"), scrapOnly(g, "high"), [
      grantRandomItem(g, "drone"),
    ]);
  },

  // Single life form on moon. Two scenes, no odds. INFERRED: equal.
  "c:single-life-form-on-moon:0": (g) => {
    const scene = weighted(g, [
      ["colony", 1],
      ["cave", 1],
    ] as const);
    if (scene === "colony") {
      card(g, eventText("event_STRANDED_1_text"), [
        { id: "s:moon:invite", label: eventText("event_STRANDED_1_c1_choice") },
        {
          id: "s:moon:home",
          label: eventText("event_STRANDED_1_c2_choice"),
        },
      ]);
      return;
    }
    moonCave(g);
  },
  "c:single-life-form-on-moon:1": (g) => {
    show(g, "Nothing happens.");
  },

  // Pirate ship distress trap. Default rewards. The PIRATE surrender and escape rows are that faction's plan.
  "c:pirate-ship-distress-trap:0": (g) => {
    fight(
      g,
      g.event?.body ?? eventDef("TRAP_BEACON")?.texts?.[0] ?? "",
      "Pirate ship",
      "pirate-ship-distress-trap",
    );
  },

  // Malfunctioning defense system. Promise opens the options. Leave them alone does nothing.
  "c:malfunctioning-defense-system:0": (g) => {
    card(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_text"), defenseOptions(g));
  },
  "c:malfunctioning-defense-system:1": (g) => {
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c2_text"));
  },
  // Simply fire's other printed result (5 hull, 1 random system, 1 breached room) stays unwired.
  // The page prints no odds, so this button does not roll a weight between the two results.
  "c:malfunctioning-defense-system:2": (g) => {
    show(g, eventText("event_SATELLITE_DEFENSE_BORING_1_text"), rollStandard(g, "low"));
  },
  // Any ion weapon, including Ion Bomb and Stun Bomb. Missile ammo is not required and not wasted.
  "c:malfunctioning-defense-system:3": (g) => {
    if (!ownsIon(g)) return;
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c2_text"), rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:4": (g) => {
    if (cloakLevel(g) < 1) return;
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c3_text"), rollStandard(g, "low"));
  },
  "c:malfunctioning-defense-system:5": (g) => {
    if (cloakLevel(g) < 2) return;
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c4_text"), rollStandard(g, "medium"));
  },
  "c:malfunctioning-defense-system:6": (g) => {
    if (cloakLevel(g) < 3) return;
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c5_text"), rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:7": (g) => {
    if (!livingKin(g, "engi")) return;
    show(g, eventText("event_DISTRESS_SATELLITE_DEFENSE_c1_c6_text"), rollStandard(g, "high"));
  },

  // Escape pod. Three pry results, no odds. INFERRED: equal.
  "c:escape-pod:0": (g) => {
    // Wiki citations:
    // > "Jettison the pod." — [[Escape pod]]
    // > "Nothing happens." — [[Escape pod]]
    show(g, eventText("event_MANTIS_CREW_c1_text"));
  },
  "c:escape-pod:1": (g) => {
    // Wiki citations:
    // > "Pry it open." — [[Escape pod]]
    // > "1 mantis boarder beams aboard your ship and you lose a crewmember." — [[Escape pod]]
    // > "The lost crewmember is revived." — [[Escape pod]]
    const r = weighted(g, [
      ["boarder", 1],
      ["mantis", 1],
      ["human", 1],
    ] as const);
    if (r === "boarder") {
      const note = loseCrew(g);
      mantisBoarders(g, 1, 1);
      beginBoarding(g);
      showEventLines(
        g,
        [eventText("event_MANTIS_CREW_LIST_1_text"), note].filter((line): line is string => !!line),
      );
      return;
    }
    if (r === "mantis") {
      // The crewmember is not named. That grant stays unwired.
      show(g, eventText("event_MANTIS_CREW_LIST_2_text"));
      return;
    }
    // The crewmember is not named. That grant stays unwired.
    show(g, eventText("event_MANTIS_CREW_LIST_3_text"));
  },

  // Confused Mantis. Listening opens the assistance card. Leaving spends nothing.
  "c:confused-mantis:0": (g) => {
    // Wiki citations:
    // > "Listen to their problem." — [[Confused Mantis]]
    confusedMantisCard(g);
  },
  "c:confused-mantis:1": (g) => {
    // Wiki citations:
    // > "Explain that you can't do any programming and leave." — [[Confused Mantis]]
    // > "Nothing happens." — [[Confused Mantis]]
    show(g, "Nothing happens.");
  },

  // Trade scrap for upgrades. "Inquire about their specialty." One of the printed offers, or nothing
  // when every listed system is missing or already at the printed maximum and the reactor is at 25.
  // INFERRED: that empty case uses the decline's "Nothing happens" line.
  "c:trade-scrap-for-upgrades:0": (g) => {
    const list = tradeOffers(g);
    if (!list.length) {
      show(g, eventText("event_TRADER_UPGRADES_LIST_1_c3_text"));
      return;
    }
    const o = list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
    const cost = o.lo === o.hi ? o.lo : between(g, [o.lo, o.hi]);
    card(g, tradeOfferText(o), [
      {
        id: `s:trade-scrap-for-upgrades:agree:${o.id}:${cost}`,
        label: `${eventText("event_TRADER_UPGRADES_LIST_1_c1_choice")} [${cost} scrap]`,
      },
      {
        id: "s:trade-scrap-for-upgrades:decline",
        label: eventText("event_TRADER_UPGRADES_LIST_1_c3_choice"),
      },
    ]);
  },

  // Hacking blue option. "3-5 human boarders beam aboard your ship." Sensors flicker back on.
  // "If you counter the jam, the Hacking system is not disabled."
  "c:boarders-humans-jammed-sensors:1": (g) => {
    // Wiki citations:
    // > "(Hacking System) Counter the remote hacking." — [[Boarders: Humans jammed sensors]]
    // > "3-5 human boarders beam aboard your ship." — [[Boarders: Humans jammed sensors]]
    // > "If you counter the jam, the Hacking system is not disabled." — [[Boarders: Humans jammed sensors#Notes]]
    if ((g.player.kits.hacking?.level ?? 0) <= 0) return;
    restorePlayerSensors(g);
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
    showEventLines(g, [eventText("event_BOARDERS_HACKING_c2_text")]);
  },

  // Slaver (hostile). "Draw straws and send a crew-member over to the slavers."
  // You lose a crewmember. Clone Bay [no effect]: the printed duplicate-law sentence, and they stay lost.
  // INFERRED: never the last living crewmember (loseCrew).
  "c:slaver-hostile:2": (g) => {
    const note = loseCrew(g, true);
    if (!note) return;
    const extras = [note];
    if (g.player.kits.clonebay) extras.push(eventText("event_PIRATE_SLAVER_c1_c0_clone"));
    show(g, eventText("event_PIRATE_SLAVER_c1_text"), undefined, extras);
  },

  // Slaver (hostile). {{Blue Option|Engines|Attempt to out-run the slaver ship.|level=6+}}.
  // {{DuplicateEvent|2}} is the two get-away sentences, then one fight. INFERRED: those three printed results are equal.
  // level=6+ means at least that installed level. Get away shows the printed sentence and does not append "Nothing happens."
  "c:slaver-hostile:1": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    const r = weighted(g, [
      ["divert", 1],
      ["pace", 1],
      ["fight", 1],
    ] as const);
    if (r === "divert") {
      show(g, eventText("event_PIRATE_SLAVER_RUN_2_text"));
      return;
    }
    if (r === "pace") {
      show(g, eventText("event_PIRATE_SLAVER_RUN_3_text"));
      return;
    }
    fight(g, eventText("event_PIRATE_SLAVER_RUN_1_text"), "Pirate ship", "slaver-hostile");
  },
};

/** Choices whose id carries a rolled amount: refugee trades, the fuel gift, the terraformers' bribe. */
function chooseRolled(g: Game, id: string): boolean {
  const trade = parseTrade(id);
  if (trade) {
    if (stock(g, trade.pay) < trade.n) return true;
    if (trade.pay === "fuel") g.fuel -= trade.n;
    else if (trade.pay === "missiles") g.missiles -= trade.n;
    else g.player.parts -= trade.n;
    const offer: SurrenderOffer = {
      tier: "low",
      scrap: 0,
      eligible: 0,
      fuel: 0,
      missiles: 0,
      parts: 0,
    };
    offer[trade.get] = trade.m;
    show(g, `You trade ${trade.n} ${WORD[trade.pay]}.`, offer);
    return true;
  }
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (!priced("friendly-ship-out-of-fuel", "give", n, "fuel") || g.fuel < n) return true;
    g.fuel -= n;
    const spent = `Fuel: -${n}.`;
    const r = weighted(g, [
      ["scrap", 2],
      ["weapon", 1],
      ["map", 1],
      ["reactor", 1],
    ] as const);
    if (r === "scrap")
      show(g, eventText("event_RANDOM_GIFT_2_text"), scrapOnly(g, "high"), [spent]);
    else if (r === "weapon") {
      const offer = weaponOffer(g, "low");
      offer.scrap = 0;
      offer.eligible = 0;
      show(g, eventText("event_RANDOM_GIFT_4_text"), offer, [spent]);
    } else if (r === "map") {
      // "The current sector map is revealed." Not wired: this game has no map reveal.
      show(g, eventText("event_RANDOM_GIFT_1_text"), undefined, [spent]);
    } else {
      // "If your ship reactor was already fully upgraded ... "Could not upgrade the Reactor, it's maxed""
      let note = "Could not upgrade the Reactor, it's maxed";
      if (upgradeCost("reactor", g.player.reactor) != null) {
        g.player.reactor += 1;
        // Manpower: an event offer to upgrade the reactor does not count against the achievement.
        noteReactorEvent(g);
        note = `Reactor ${g.player.reactor}.`;
      }
      show(g, eventText("event_RANDOM_GIFT_5_text"), undefined, [spent, note]);
    }
    return true;
  }
  m = id.match(/^s:trade-scrap-for-upgrades:agree:(oxygen|pilot|doors|sensors|reactor):(\d+)$/);
  if (m) {
    const idSys = m[1] as TradeId;
    const cost = Number(m[2]);
    const offer = tradeOffers(g).find((o) => o.id === idSys);
    if (!offer || cost < offer.lo || cost > offer.hi || g.scrap < cost) return true;
    g.scrap -= cost;
    if (idSys === "reactor") {
      g.player.reactor += 1;
      // Manpower: an event offer to upgrade the reactor does not count against the achievement.
      noteReactorEvent(g);
      show(g, eventText("event_TRADER_UPGRADES_LIST_1_c1_text"), undefined, [
        `You lose ${cost} scrap and your ship reactor is upgraded.`,
      ]);
      return true;
    }
    const sys = g.player.systems[idSys];
    sys.level += 1;
    // Store upgrade powers a subsystem to its new level. The page does not say the new bar starts powered.
    // INFERRED: piloting, doors, and sensors take that same step.
    if (idSys !== "oxygen") sys.power = sys.level;
    const line =
      idSys === "sensors"
        ? `You lose ${cost} scrap and your Sensors are upgraded to level ${sys.level}.`
        : `You lose ${cost} scrap and your ${idSys === "oxygen" ? "Oxygen system" : idSys === "pilot" ? "Piloting" : "Door System"} is upgraded to level ${sys.level}.`;
    show(g, eventText("event_TRADER_UPGRADES_LIST_1_c1_text"), undefined, [line]);
    return true;
  }
  if (id === "s:trade-scrap-for-upgrades:decline") {
    show(g, eventText("event_TRADER_UPGRADES_LIST_1_c3_text"));
    return true;
  }
  m = id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  if (m) {
    const missiles = Number(m[1]);
    const parts = Number(m[2]);
    const fuel = Number(m[3]);
    // Notes: a maxed reactor does not prevent the trade. The supplies are still lost.
    if (!supplyLegal("improve-reactor-for-supplies", missiles, parts, fuel)) return true;
    if (g.missiles < missiles || g.player.parts < parts || g.fuel < fuel) return true;
    g.missiles -= missiles;
    g.player.parts -= parts;
    g.fuel -= fuel;
    const note = bumpReactor(g);
    const lines = [
      missiles ? `Missiles: -${missiles}.` : "",
      parts ? `Drone parts: -${parts}.` : "",
      fuel ? `Fuel: -${fuel}.` : "",
      note,
    ].filter(Boolean);
    show(g, eventText("event_TRADER_UPGRADES_EXCHANGE_LIST_1_text"), undefined, lines);
    return true;
  }
  m = id.match(/^s:terraforming-scan:(bribe|pay):(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    if (!priced("terraforming-scan", "scan", n, "scrap")) return true;
    if (m[1] === "bribe") {
      // "You receive 15-25 add_scrap": the amount shown on the choice.
      show(g, "", {
        tier: "low",
        scrap: adjustScrap(g, n),
        eligible: n,
        fuel: 0,
        missiles: 0,
        parts: 0,
      });
      return true;
    }
    if (g.scrap < n) return true;
    g.scrap -= n;
    show(g, eventText("event_HIGH_SCAN_TERRAFORMING_3_c1_c2_text"), undefined, [
      `Scrap: -${n}.`,
      upgradeOxygen(g),
    ]);
    return true;
  }
  if (id === "s:unknown-disease:continue") {
    show(
      g,
      eventText("event_DISTRESS_STATION_DISEASE_c5_c1_text"),
      rollSurrenderOffer(g, "medium", true),
    );
    return true;
  }
  if (id === "s:unknown-disease:medbot") {
    if (!g.augments.includes("NANO_MEDBAY")) return true;
    // A weapon with high scrap. Rewards, "Weapon": "A random weapon & T scrap."
    show(g, eventText("event_DISTRESS_STATION_DISEASE_c5_c2_text"), scrapOnly(g, "high"), [
      grantRandomItem(g, "weapon"),
    ]);
    return true;
  }
  const rock = id.match(/^s:rock-slug:(debt|upgrade):(\d+)$/);
  if (rock) return rockSlugPay(g, rock[1] === "debt" ? "debt" : "upgrade", Number(rock[2]));
  if (id === "s:rock-slug:decline") {
    // Wiki citations:
    // > "Decline the offer." — [[Rock and Slug standoff#Slug reward]]
    // > "Nothing happens." — [[Rock and Slug standoff#Slug reward]]
    show(g, eventText("event_ROCK_SLUG_GRATEFUL_3_c2_text"));
    return true;
  }
  if (id === "s:rock-slug:leave") {
    // Wiki citations:
    // > "Nothing happens." — [[Rock and Slug standoff]]
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:rock-slug:demand") {
    // Agree, a Rock fight, or the explosion. No odds. INFERRED: equal.
    const r = weighted(g, [
      ["pay", 1],
      ["fight", 1],
      ["boom", 1],
    ] as const);
    if (r === "pay") {
      slugCaptainGrateful(g, eventText("event_ROCK_SLUG_COMMAND_2_text"));
      return true;
    }
    if (r === "fight") {
      // Wiki citations:
      // > "Fight a Rock ship." — [[Rock and Slug standoff]]
      fight(g, eventText("event_ROCK_SLUG_COMMAND_1_text"), "Rock ship", "rock-and-slug-standoff");
      return true;
    }
    // Wiki citations:
    // > "Your ship takes 5 hull damage, 1 damage to each of 2 random systems." — [[Rock and Slug standoff]]
    if (hurt(g, 5)) return true;
    const sys = twoSystems(g);
    show(g, eventText("event_ROCK_SLUG_COMMAND_3_text"), undefined, [sys].filter(Boolean));
    return true;
  }
  if (id.startsWith("s:moon:")) return moonChoice(g, id);
  if (id.startsWith("s:confused-mantis:")) return confusedMantisChoice(g, id);
  // Pirate ship selling weapon. "Nothing happens."
  if (id === "c:pirate-ship-selling-weapon:1") {
    show(g, "Nothing happens.");
    return true;
  }
  // Mind Control. Two results and no odds. INFERRED: equal.
  // Both buys grant an unnamed weapon, so neither spends the printed 45 scrap.
  if (id === "c:pirate-ship-selling-weapon:2") {
    if (!ownsMindControl(g)) return true;
    if (
      weighted(g, [
        ["deal", 1],
        ["lie", 1],
      ] as const) === "deal"
    ) {
      card(g, eventText("event_NEBULA_WEAPONS_TRADER_LIST2_1_text"), [
        {
          id: "s:pirate-weapon:decline",
          label: eventText("event_NEBULA_WEAPONS_TRADER_LIST2_1_c2_choice"),
        },
      ]);
      return true;
    }
    fight(
      g,
      eventText("event_NEBULA_WEAPONS_TRADER_LIST2_2_text"),
      "Pirate ship",
      "pirate-ship-selling-weapon",
    );
    return true;
  }
  if (id === "s:pirate-weapon:decline") {
    show(g, eventText("event_NEBULA_WEAPONS_TRADER_LIST2_1_c2_text"));
    return true;
  }
  return false;
}

/** Confused Mantis follow-ups. The shuttle's three results have no odds. INFERRED: equal. */
function confusedMantisChoice(g: Game, id: string): boolean {
  if (id === "s:confused-mantis:shuttle") {
    const r = weighted(g, [
      ["home", 1],
      ["lose", 1],
      ["nothing", 1],
    ] as const);
    if (r === "home") {
      // The printed next step is Return him home, on this same page.
      card(g, eventText("event_CONFUSED_MANTIS_DEFAULT_1_text"), [
        {
          id: "s:confused-mantis:return",
          label: eventText("event_CONFUSED_MANTIS_c1_c3_c1_choice"),
        },
      ]);
      return true;
    }
    if (r === "lose") {
      // Wiki citations:
      // > "You lose a crewmember." — [[Confused Mantis]]
      // > "(Clone Bay) Your crew's clone is waiting when you return to the ship." — [[Confused Mantis]]
      // > "The lost crewmember is revived." — [[Confused Mantis]]
      const revived = !!g.player.kits.clonebay;
      const note = loseCrew(g);
      const extras = revived ? [eventText("event_CONFUSED_MANTIS_DEFAULT_2_c0_clone")] : [];
      if (note) extras.push(note);
      show(g, eventText("event_CONFUSED_MANTIS_DEFAULT_2_text"), undefined, extras);
      return true;
    }
    // Wiki citations:
    // > "Nothing happens." — [[Confused Mantis]]
    show(g, eventText("event_CONFUSED_MANTIS_DEFAULT_3_text"));
    return true;
  }
  if (id === "s:confused-mantis:human") {
    if (!livingKin(g, "human")) return true;
    card(g, eventText("event_CONFUSED_MANTIS_c1_c3_text"), [
      { id: "s:confused-mantis:return", label: eventText("event_CONFUSED_MANTIS_c1_c3_c1_choice") },
    ]);
    return true;
  }
  if (id === "s:confused-mantis:return") {
    mantisColony(g);
    return true;
  }
  if (id === "s:confused-mantis:leave") {
    // Wiki citations:
    // > "Nothing happens." — [[Confused Mantis]]
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:confused-mantis:mantis") {
    // Wiki citations:
    // > "You receive low scrap with resources." — [[Confused Mantis]]
    if (!livingKin(g, "mantis")) return true;
    show(g, eventText("event_CONFUSED_MANTIS_c1_c4_text"), rollStandard(g, "low"));
    return true;
  }
  if (id === "s:confused-mantis:mind") {
    // Wiki citations:
    // > "You receive medium scrap with resources." — [[Confused Mantis]]
    if (!ownsMindControl(g)) return true;
    show(g, eventText("event_CONFUSED_MANTIS_c1_c5_text"), rollStandard(g, "medium"));
    return true;
  }
  if (id === "s:confused-mantis:hire") {
    // Wiki citations:
    // > "You receive a Mantis crewmember named Robert Smith." — [[Confused Mantis#Mining Colony]]
    show(g, eventText("event_CONFUSED_MANTIS_HOME_c1_text"), undefined, [robertJoins(g)]);
    return true;
  }
  if (id === "s:confused-mantis:engines") {
    // Wiki citations:
    // > "Your ship engines are upgraded." — [[Confused Mantis#Mining Colony]]
    show(g, eventText("event_CONFUSED_MANTIS_HOME_c2_text"), undefined, [bumpEngines(g)]);
    return true;
  }
  return false;
}

const CHARLIE_POST: Record<(typeof MOON_SKILLS)[number], string> = {
  weapons: eventText("event_STRANDED_CHARLIES_1_text"),
  shields: eventText("event_STRANDED_CHARLIES_2_text"),
  pilot: eventText("event_STRANDED_CHARLIES_3_text"),
  engines: eventText("event_STRANDED_CHARLIES_4_text"),
  combat: eventText("event_STRANDED_CHARLIES_5_text"),
  repair: eventText("event_STRANDED_CHARLIES_6_text"),
};

/** Follow-ups on Single life form on moon. Each list has no odds. INFERRED: equal. */
function moonChoice(g: Game, id: string): boolean {
  if (id === "s:moon:invite") {
    const skill =
      MOON_SKILLS[Math.min(MOON_SKILLS.length - 1, Math.floor(rand(g) * MOON_SKILLS.length))];
    show(g, CHARLIE_POST[skill], undefined, [charlieJoins(g, moonRank(skill))]);
    return true;
  }
  if (id === "s:moon:home") {
    // Template:ReturnSurvivor, this page's three rewards.
    const r = weighted(g, [
      ["high", 1],
      ["medium", 1],
      ["hull", 1],
    ] as const);
    if (r === "high") {
      show(g, eventText("event_FAMILY_RETURN_1_text"), scrapOnly(g, "high"));
      return true;
    }
    if (r === "medium") {
      show(g, eventText("event_FAMILY_RETURN_2_text"), scrapOnly(g, "medium"));
      return true;
    }
    const before = g.player.hull;
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    const got = g.player.hull - before;
    show(g, eventText("event_FAMILY_RETURN_3_text"), undefined, [
      `Your ship receives ${got} repairs.`,
    ]);
    return true;
  }
  if (id === "s:moon:bring") {
    const r = weighted(g, [
      ["lose", 1],
      ["charlie", 1],
      ["blast", 1],
      ["collapse", 1],
    ] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, eventText("event_MADMAN_1_text"), undefined, note ? [note] : []);
      return true;
    }
    if (r === "charlie") {
      show(g, eventText("event_MADMAN_2_text"), undefined, [charlieJoins(g)]);
      return true;
    }
    if (r === "blast") {
      if (hurt(g, 5)) return true;
      show(g, eventText("event_MADMAN_3_text"), undefined, [
        "Hull damage: 5.",
        hurtRandomSystem(g),
      ]);
      return true;
    }
    moonCollapse(g);
    return true;
  }
  if (id === "s:moon:leave") {
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:moon:medbay2" || id === "s:moon:collapse-medbay") {
    if (medbayLevel(g) < 2) return true;
    const text =
      id === "s:moon:medbay2"
        ? eventText("event_STRANDED_2_c3_text")
        : eventText("event_MADMAN_4_c2_text");
    show(g, text, undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:medbay3") {
    if (medbayLevel(g) < 3) return true;
    show(g, eventText("event_STRANDED_2_c4_text"), undefined, [charlieJoins(g, moonRanks())]);
    return true;
  }
  if (id === "s:moon:collapse-clone") {
    if (clonebayLevel(g) < 2) return true;
    show(g, eventText("event_MADMAN_4_c3_text"), undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:collapse-continue") {
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:moon:slug") {
    if (!livingKin(g, "slug")) return true;
    const r = weighted(g, [
      ["stay", 1],
      ["leave", 1],
    ] as const);
    if (r === "stay") {
      // The crewmember is not named. That grant stays unwired.
      show(g, eventText("event_MADMAN_SLUG_2_text"));
      return true;
    }
    show(g, eventText("event_MADMAN_SLUG_1_text"));
    return true;
  }
  return false;
}

/** True when `id` belongs to this module. sim.ts choose calls it after surrenderChoose. */
export function fillerOwns(id: string): boolean {
  return (
    id in FILLER_CHOICES ||
    id === "c:pirate-ship-selling-weapon:1" ||
    id === "c:pirate-ship-selling-weapon:2" ||
    id.startsWith("s:pirate-weapon:") ||
    /^s:(refugee|refugee-distress|refugee-zoltan|refugee-distress-zoltan|refugee-pirate|refugee-distress-pirate|refugee-slug|refugee-distress-slug|friendly-ship-out-of-fuel|terraforming-scan|trade-scrap-for-upgrades|improve-reactor-for-supplies|unknown-disease|moon|confused-mantis|rock-slug):/.test(
      id,
    )
  );
}

/** Runs a filler card choice. False when the id is not one of this module's. */
export function fillerChoose(g: Game, id: string): boolean {
  const run = FILLER_CHOICES[id];
  if (run) {
    run(g);
    return true;
  }
  return fillerOwns(id) ? chooseRolled(g, id) : false;
}

/** sim.ts choiceDisabled: a rolled price parsed from the choice id, then a lock stored on the choice. */
export function fillerChoiceDisabled(g: Game, id: string): string | null {
  const trade = parseTrade(id);
  if (trade && stock(g, trade.pay) < trade.n) return `Need ${trade.n} ${WORD[trade.pay]}`;
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m && g.fuel < Number(m[1])) return `Need ${m[1]} fuel`;
  m = id.match(/^s:terraforming-scan:pay:(\d+)$/);
  if (m && g.scrap < Number(m[1])) return `Need ${m[1]} scrap`;
  m = id.match(/^s:trade-scrap-for-upgrades:agree:(?:oxygen|pilot|doors|sensors|reactor):(\d+)$/);
  if (m && g.scrap < Number(m[1])) return `Need ${m[1]} scrap`;
  // Rock and Slug standoff. The button shows the rolled 10-15 scrap.
  m = id.match(/^s:rock-slug:(?:debt|upgrade):(\d+)$/);
  if (m && g.scrap < Number(m[1])) {
    // Wiki citations:
    // > "Offer to pay off the Rock debt. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff]]
    // > "Agree to the price. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff#Slug reward]]
    return `Need ${m[1]} scrap`;
  }
  m = id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  if (m) {
    const missiles = Number(m[1]);
    const parts = Number(m[2]);
    const fuel = Number(m[3]);
    if (g.missiles < missiles) return `Need ${missiles} missiles`;
    if (g.player.parts < parts) return `Need ${parts} drone parts`;
    if (g.fuel < fuel) return `Need ${fuel} fuel`;
  }
  // Giant alien spiders blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Pirate ship selling weapon. {{Blue Option|Mind Control}}.
  // INFERRED: the refusal line. The page names Mind Control and does not print this sentence.
  // Malfunctioning defense system blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Crushed pirate blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Unknown disease blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Plagued station. Improved Medbay level=2+. INFERRED: the refusal line. The page names the system and prints no refusal sentence.
  // Fire on research station blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Single life form on moon blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Confused Mantis blue options. INFERRED: the refusal line. The page names the crew or system and prints no sentence.
  // Battlefield wreckage. Improved Sensors level=2. INFERRED: the refusal line. The page names Sensors level 2 and prints no sentence.
  // Rebel fight chance. Improved Sensors level=2. INFERRED: the refusal line. The page names the system and prints no sentence.
  // Rebel fight chance. Advanced Sensors level=3. INFERRED: the refusal line. The page names the system and prints no sentence.
  // Rebel fight chance in nebula. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Advanced Sensors level=3 means at least that installed level.
  // Wiki citations:
  // > "(Advanced Sensors) Try to track them as you move to engage. (Requires level 3 Sensors)" — [[Rebel fight chance in nebula]]
  // Wiki citations:
  // > "(Long-ranged Scanner) Try to track them as you move to engage." — [[Rebel fight chance in nebula]]
  // Wiki citations:
  // > "(Lifeform Scanner) Use their life signatures to follow." — [[Rebel fight chance in nebula]]
  // Wiki citations:
  // > "Scrap lost: 55" — [[Slocknog]]
  // Engi smashed ships. INFERRED: the refusal line. The page names an Engi crewmember.
  // Mantis ships battle for Rock freighter. INFERRED: the refusal line. The page names the drone and prints no sentence.
  // Wiki citations:
  // > "(Repair Drone) Repair the Rock ship. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
  // Wiki citations:
  // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
  // Wiki citations:
  // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
  // Rock live mine. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Wiki citations:
  // > "(Improved Engines) Reverse thrusters! (Requires level 5+ Engines)" — [[Rock live mine]]
  // Wiki citations:
  // > "(Missile Weapon) Attempt a controlled detonation using a missile. [ Icon missiles (cropped).png1 ] -- bugged: Hull Missile doesn't count" — [[Rock live mine]]
  // Wiki citations:
  // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
  // Wiki citations:
  // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
  // Lanius ship absorbing rebel base. INFERRED: the refusal line. The page names a Lanius crewmember.
  // Wiki citations:
  // > "(Lanius Crew) Try to use them to delay the Rebels." — [[Lanius ship absorbing rebel base]]
  // Lanius ship absorbing jump beacon. INFERRED: the refusal lines. The page names the crew and the drone and prints no sentence.
  // Wiki citations:
  // > "(Lanius Crew) Ask if they require assistance." — [[Lanius ship absorbing jump beacon]]
  // Wiki citations:
  // > "(Hull Repair Drone) Send a drone to help." — [[Lanius ship absorbing jump beacon]]
  // Lanius ship attacking civilian distress. INFERRED: the refusal line. The page names a Lanius crewmember.
  // Lanius craftsmen. {{Blue Option|Lanius Crew}}. INFERRED: the refusal line. The page names a Lanius crewmember.
  // Wiki citations:
  // > "Scrap lost: 45" — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Scrap lost: 50" — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Scrap lost: 40" — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
  // Nebula lost ship. Teleporter, and Long-Ranged Scanners. INFERRED: the refusal lines. The page names the gear.
  // Plasma storm incapacitated ships. Piloting level 2+. INFERRED: the refusal line. The page names the system.
  // Abandoned station. Clone Bay. INFERRED: the refusal line. The page names the system and prints no sentence.
  // Rock and Slug standoff. INFERRED: the refusal line. The button shows the rolled 10-15 scrap.
  // Wiki citations:
  // > "Offer to pay off the Rock debt. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff]]
  // > "Agree to the price. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff#Slug reward]]
  // Dense asteroid field distress. INFERRED: the refusal line. The page names Rock Plating and prints no sentence.
  // Wiki citations:
  // > "Make a thorough search for the ship without fear of stray asteroids." — [[Dense asteroid field distress]]
  // Disabled Rock ship. INFERRED: the refusal line. The page names a Slug crewmember and prints no sentence.
  // Wiki citations:
  // > "(Slug Crew) Check for lifeforms and keep a lookout for ships while looting the wreck." — [[Disabled Rock ship]]
  // Boarders: Humans jammed sensors, {{Blue Option|Hacking System|...|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  // Wiki citations:
  // > "(Hacking System) Counter the remote hacking." — [[Boarders: Humans jammed sensors]]
  // Slaver (hostile). Engines level=6+. INFERRED: the refusal line. The page names the system and prints no sentence.
  return ownedLock(g, id, locksOwned("filler"));
}

/** The sector's "Empty beacon (...)" card ("Nothing happens."), for sim.ts eventFor's last resort. */
export function emptyEvent(g: Game): GameEvent {
  return emptyCard(g, emptyPageFor(g.sectorId));
}
