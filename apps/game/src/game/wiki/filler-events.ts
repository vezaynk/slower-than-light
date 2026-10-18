import { XP_NEED, upgradeCost } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { allEmptyBeacons, allWeapons, crewDef, eventDef, fillerList, weaponDef } from "@stl/pack";
import type { EmptyBeaconDef, EventDef } from "@stl/pack";
import type { FillerList } from "./filler-lists.ts";
import {
  beginBoarding,
  hurtSystem,
  log,
  rand,
  restorePlayerSensors,
  shutPlayerSensors,
  startCombat,
} from "../sim.ts";
import type { Beacon, Crew, Game, GameEvent, SkillName, SysId } from "../types.ts";
import type { CitedEventDef } from "./cited-events-surrender.ts";
import { FILLER_PAGES } from "./filler-pages.ts";
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
import { noteReactorEvent } from "./achievement-track.ts";
import { SECTOR_MIX } from "./beacon-mix.ts";
import { citedPagesFor } from "./cited-events.ts";
import { rollBand } from "./event-bands.ts";
import { priced, rollPrice } from "./event-prices.ts";
import { rockSlugPay, slugCaptainGrateful } from "./quests.ts";
import { keepNewHire, receiveAugment } from "./make-room.ts";
import { grantRandomItem } from "./bonus-item.ts";
import { ownedLock, scrapStock } from "./choice-locks.ts";
import { stampStockLabels } from "./stock-labels.ts";
import { affordStock, partsLine, takeStock } from "./stock-spend.ts";
import { FILLER_LOCKS } from "./choice-reqs.ts";

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

export type { EmptyPage, FillerList, FillerRow } from "./filler-lists.ts";
export {
  DISTRESS,
  EMPTY_PAGES,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  ITEMS,
  NEBULA,
} from "./filler-lists.ts";
export { FILLER_PAGES } from "./filler-pages.ts";

/**
 * The empty-beacon page for a sector. Civilian is the first plain page, so an unlisted sector uses it.
 * A nebula slot uses the Slug page when the sector name starts with Slug, and the other nebula page otherwise.
 */
export function emptyPageFor(sectorName: string, nebula = false): EmptyBeaconDef {
  const pages = allEmptyBeacons();
  if (nebula) {
    const slug = sectorName.startsWith("Slug");
    const hit = slug
      ? pages.find((page) => page.nebula && page.id === "empty-nebula-beacon-slug")
      : pages.find((page) => page.nebula && page.id !== "empty-nebula-beacon-slug");
    const any = hit ?? pages.find((page) => page.nebula);
    if (any) return any;
  } else {
    const plain = pages.filter((page) => !page.nebula);
    const hit = plain.find((page) => page.sectors.includes(sectorName)) ?? plain[0];
    if (hit) return hit;
  }
  throw new Error(`empty beacon pack has no page for ${sectorName}`);
}

// ---- Lookup and draw -------------------------------------------------------------------------------------------

type Page = Readonly<CitedEventDef>;
let citedIndex: Map<string, Page> | null = null;

/** Cited table pages by dest and alias (every sector the beacon mix lists). Built on first use. */
function citedByName(name: string): Page | undefined {
  if (!citedIndex) {
    citedIndex = new Map();
    for (const sector of Object.keys(SECTOR_MIX)) {
      for (const ev of citedPagesFor(sector) as Page[]) {
        for (const n of [ev.dest, ...ev.aliases]) if (!citedIndex.has(n)) citedIndex.set(n, ev);
      }
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

function citedPage(slug: string): Page | undefined {
  if (!citedIndex) citedByName("");
  for (const page of citedIndex!.values()) if (page.slug === slug) return page;
  return undefined;
}

function sameOpening(
  a: { body: string; choices: { id: string; label: string }[] },
  b: { body: string; choices: { id: string; label: string }[] },
): boolean {
  if (a.body !== b.body || a.choices.length !== b.choices.length) return false;
  return a.choices.every((choice, i) => {
    const other = b.choices[i];
    return other !== undefined && choice.id === other.id && choice.label === other.label;
  });
}

/**
 * A filler card that shares its slug with a sector page.
 * While the pack still holds that sector page, a filler stamp shows this card.
 * A pack that replaces the record is what arrival shows.
 */
function fillerTwin(slug: string): Page | undefined {
  const own = FILLER_PAGES.find((page) => page.slug === slug);
  const packed = eventDef(slug);
  const cited = citedPage(slug);
  if (!own || !packed || !cited) return undefined;
  if (sameOpening(packed, cited) && !sameOpening(packed, own)) return own;
  return undefined;
}

/** The card for a list row: the cited table's page first, else the packed opening card. */
export function pageForRow(dest: string): Page | undefined {
  const cited = citedByName(dest);
  if (cited) return cited;
  const own = FILLER_PAGES.find((page) => page.dest === dest || page.aliases.includes(dest));
  if (!own) return undefined;
  return pageForEntry(own.slug) ?? own;
}

/** The card a list row names. A sector page wins. Otherwise the packed event, then the authored card. */
function pageForEntry(id: string): Page | undefined {
  const cited = citedPage(id);
  if (cited) return cited;
  return packedPage(id) ?? FILLER_PAGES.find((page) => page.slug === id);
}

/** The card a filler stamp opens. A shared slug keeps the filler card while the pack holds the sector page. */
function pageBySlug(slug: string): Page | undefined {
  return (
    fillerTwin(slug) ??
    packedPage(slug) ??
    FILLER_PAGES.find((page) => page.slug === slug) ??
    citedPage(slug)
  );
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
export function stampEmptyNebula(b: Beacon, sectorName: string) {
  const page = emptyPageFor(sectorName, true);
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

const LIST_FOR_KIND: Partial<Record<Beacon["kind"], FillerList>> = {
  event: "filler",
  distress: "distress",
  cache: "items",
  nebula: "nebula",
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
  const n = rollPrice("friendly-ship-out-of-fuel", "give", (lo, hi) => between(g, [lo, hi]));
  const choices = [];
  if (n != null) {
    choices.push({
      id: `s:friendly-ship-out-of-fuel:give:${n}`,
      label: `Give them the fuel. [${n} fuel]`,
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
  const rows = eventDef("trade-scrap-for-upgrades")?.trades ?? [];
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

/** One packed opening sentence. Filler pages that use rand keep that draw. */
function randOpening(g: Game, id: string): string {
  const texts = eventDef(id)?.texts ?? [];
  if (texts.length === 0) return "";
  return texts[Math.min(texts.length - 1, Math.floor(rand(g) * texts.length))] ?? "";
}

/** One packed opening sentence. Pages that use between keep that draw. */
function betweenOpening(g: Game, id: string): string {
  const texts = eventDef(id)?.texts ?? [];
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
  if (o.id === "reactor") return "They offer to upgrade your reactor in exchange for some scrap.";
  if (o.id === "oxygen")
    return "They offer to upgrade your Oxygen system in exchange for some scrap.";
  if (o.id === "pilot")
    return "They offer to upgrade your Piloting subsystem in exchange for some scrap.";
  if (o.id === "doors")
    return "They offer to upgrade your Door subsystem in exchange for some scrap.";
  return "They offer to upgrade your Sensors subsystem in exchange for some scrap.";
}

function cardFor(g: Game, page: Page): GameEvent {
  if (page.slug === "empty-nebula-beacon") return emptyCard(g, emptyPageFor("", true));
  // The fuel amount is rolled when the card opens. The page may be the packed record, so this keys off the slug.
  if (page.slug === "friendly-ship-out-of-fuel") return friendlyCard(g, page);
  if (page.slug === "trade-scrap-for-upgrades") return tradeIntro(g, page);
  if (page.slug === "crew-hiring-station") return hireCard(g, page);
  if (page.slug === "asteroid-mining-colony") return miningCard(g, page);
  if (page.slug === "improve-reactor-for-supplies") return supplyCard(g, page);
  if (page.slug === "giant-alien-spiders") return spiderCard(g, page);
  if (page.slug === "crushed-pirate") return pirateCard(g, page);
  if (page.slug === "unknown-disease-on-mining-colony") return diseaseCard(g, page);
  if (page.slug === "fire-on-research-station") return fireCard(g, page);
  if (page.slug === "pirate-ship-distress-trap") return trapCard(g, page);
  if (page.slug === "abandoned-station") return abandonedStationCard(g, page);
  if (page.slug === "rebel-fight-chance") return rebelChanceCard(g, page);
  if (page.slug === "battlefield-wreckage") return wreckageCard(g, page);
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
    if (slug === "empty-nebula-beacon-slug") return emptyCard(g, emptyPageFor(g.sectorName, true));
    const page = pageBySlug(slug);
    return page ? cardFor(g, page) : emptyCard(g, emptyPageFor(g.sectorName));
  }
  if (b.flag) return null;
  if (b.kind === "empty" || b.kind === "start") return emptyCard(g, emptyPageFor(g.sectorName));
  const list = LIST_FOR_KIND[b.kind];
  if (!list) return null;
  const page = drawFiller(g, list, g.beacons);
  if (!page) return emptyCard(g, emptyPageFor(g.sectorName, b.kind === "nebula"));
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
  for (const l of got) log(g, l);
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
  log(g, text);
  g.event = null;
  startCombat(g, tier, !!opts.asteroid, slug);
  // "doesn't surrender nor tries to escape" (Template:Drifting Refugee Ship ambushers).
  if (opts.never) g.enemyEscape = { ...NEVER_RUN };
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
    // > "You open your eyes and everything is still where it was a moment ago. You did it!" — [[Rock live mine#Cut the wire]]
    // > "You receive medium scrap." — [[Rock live mine#Cut the wire]]
    show(
      g,
      "You open your eyes and everything is still where it was a moment ago. You did it!",
      scrapOnly(g, "medium"),
    );
    return;
  }
  // Wiki citations:
  // > "The weapon detonates. Everything goes dark, the bridge illuminated by flames pouring from the hull, your bomb disposal volunteer spinning off toward a nearby sun. You put out the fires and prepare to move on." — [[Rock live mine#Cut the wire]]
  // > "Your ship takes 6 hull damage, 1 damage with a breach to a random room, and you lose a crewmember." — [[Rock live mine#Cut the wire]]
  // > "The lost crewmember is revived." — [[Rock live mine#Cut the wire]]
  if (hurt(g, 6)) return;
  const note = loseCrew(g);
  show(
    g,
    "The weapon detonates. Everything goes dark, the bridge illuminated by flames pouring from the hull, your bomb disposal volunteer spinning off toward a nearby sun. You put out the fires and prepare to move on.",
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
  log(g, "Rebel Fleet is delayed for 1 turn.");
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
    log(g, `1 damage to ${id}.`);
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

/** Missile (Weapons), Hull Missile: "BUGGED: not considered a missile weapon for events." */
function miningMissile(g: Game): boolean {
  return g.player.weapons.some(
    (w) => w.defId !== "MISSILES_HULL" && weaponDef(w.defId)?.kind === "missile",
  );
}

function miningOffers(): { id: string; label: string }[] {
  return [
    { id: "c:asteroid-mining-colony:1", label: "Give them the requested 5 missiles." },
    { id: "c:asteroid-mining-colony:2", label: "Give them 15 missiles." },
    { id: "c:asteroid-mining-colony:3", label: "Decline." },
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
      show(
        g,
        "They thank you and offer to have their engineers repair some of your ship's hull.",
        undefined,
        ["Your ship receives 10 repairs."],
      );
    } else if (r === "reactor") {
      const note = bumpReactor(g);
      show(
        g,
        "They thank you and offer to have their engineers upgrade your reactor.",
        undefined,
        note ? [note] : [],
      );
    } else {
      const base = rollBand("asteroid-mining-colony", "thanks", "scrap", (lo, hi) =>
        between(g, [lo, hi]),
      );
      show(
        g,
        "They thank you for your generosity and offer some scrap in exchange.",
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
      '"Wow. This will help our efforts considerably." They offer to have their engineers fix up your ship and upgrade your reactor.',
      undefined,
      ["Your ship receives 15 repairs.", note].filter(Boolean),
    );
  } else if (r === "augment") {
    show(
      g,
      '"Wow. This will help our efforts considerably. What could I offer for your troubles..." After some time they deliver a ship Augment for installation on your ship.',
      undefined,
      [grantRandomItem(g, "augment")],
    );
  } else {
    const base = rollBand("asteroid-mining-colony", "wow", "scrap", (lo, hi) =>
      between(g, [lo, hi]),
    );
    show(
      g,
      '"Wow. This will help our efforts considerably. Let me see what I can scrounge up to offer you." They deliver some scrap and have their team try to repair part of your hull.',
      undefined,
      base == null ? [] : payMiners(g, base, 5),
    );
  }
}

/** Supply bundles from the packed page. A 0-wide band stays 0. The bundle draw stays rand. */
function supplyRows(id: string) {
  const rows = [];
  for (const row of eventDef(id)?.offers ?? []) if (row.k === "supply") rows.push(row);
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
        label: `Agree to the trade. [${supplyPrice(missiles, parts, fuel)}]`,
      },
      { id: "c:improve-reactor-for-supplies:1", label: "Respectfully decline." },
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
      label: "Simply fire on the defense system from a distance.",
    },
  ];
  if (ownsIon(g))
    choices.push({
      id: "c:malfunctioning-defense-system:3",
      label: "(Ion Weapon) Disable the defense system.",
    });
  const cloak = cloakLevel(g);
  if (cloak >= 1)
    choices.push({
      id: "c:malfunctioning-defense-system:4",
      label: "(Cloaking) Use your cloaking to disable the system.",
    });
  if (cloak >= 2)
    choices.push({
      id: "c:malfunctioning-defense-system:5",
      label: "(Improved Cloaking) Use your cloaking to disable the system.",
    });
  if (cloak >= 3)
    choices.push({
      id: "c:malfunctioning-defense-system:6",
      label: "(Advanced Cloaking) Use your cloaking to disable the system.",
    });
  if (livingKin(g, "engi"))
    choices.push({
      id: "c:malfunctioning-defense-system:7",
      label: "(Engi Crew) Remotely repair its targeting system.",
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
      label: "Bring him back to your ship in hopes of finding some help for him.",
    },
    { id: "s:moon:leave", label: "Leave the madman to his ravings, he's not worth the risk." },
  ];
  // Template:Blue Option, "Requires level 2" and "Requires level 3". A higher medbay still meets the lower line.
  const med = medbayLevel(g);
  if (med >= 2)
    choices.push({ id: "s:moon:medbay2", label: "(Improved Medbay) Bring him to your medbay." });
  if (med >= 3)
    choices.push({ id: "s:moon:medbay3", label: "(Advanced Medbay) Bring him to your medbay." });
  if (livingKin(g, "slug"))
    choices.push({ id: "s:moon:slug", label: "Sir, allow me to assess his mental state." });
  card(
    g,
    "You find a man living alone in a cave. From the appearance of his wrecked ship, it seems he's been here for many years. He looks healthy, but his mental state is questionable.",
    choices,
  );
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
  const choices = [{ id: "s:moon:collapse-continue", label: "Continue..." }];
  if (medbayLevel(g) >= 2)
    choices.push({
      id: "s:moon:collapse-medbay",
      label: "(Improved Medbay) Quickly bring him to the medbay.",
    });
  if (clonebayLevel(g) >= 2)
    choices.push({
      id: "s:moon:collapse-clone",
      label: "(Improved Clonebay) Quickly register him into the clonebay.",
    });
  card(
    g,
    "It seems he was in worse health than we first thought. He collapses on the trip up to the ship. It doesn't look like he's going to make it...",
    choices,
  );
}

function diseaseCure(g: Game) {
  const choices = [{ id: "s:unknown-disease:continue", label: "Continue..." }];
  if (g.augments.includes("NANO_MEDBAY")) {
    choices.push({
      id: "s:unknown-disease:medbot",
      label: "Use the Nano med-bots to accelerate the dispersal of the cure.",
    });
  }
  card(
    g,
    "Your military-grade medical computers are easily able to isolate the cause of the virus, a previously unknown spore that was unearthed during excavations. You are quickly able to inform the colony's leaders of your success in reverse engineering a cure.",
    choices,
  );
}

/** Refueling station: the printed scrap cost buys that many fuel. A shortfall leaves the card up. */
function buyFuel(g: Game, id: string, fuel: number) {
  const cost = affordStock(g, id, "scrap");
  if (cost == null) return;
  takeStock(g, "scrap", cost);
  g.fuel += fuel;
  show(g, '"Thank you for your business."', undefined, [`You receive ${fuel} fuel.`]);
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
  // Wiki citations:
  // > "\"Found malfunctioning Mantis. Believes it is human. Will receive input only from human. Danger Evaluation: Extremely High. Provide assistance.\"" — [[Confused Mantis]]
  // > "Send a shuttle with an away team to help." — [[Confused Mantis]]
  // > "Leave them, a cornered Mantis is too dangerous." — [[Confused Mantis]]
  // > "(Human Crew) Send your human crewmember to communicate with the Mantis." — [[Confused Mantis]]
  // > "(Mantis Crew) Send your Mantis crewmember to communicate with the Mantis." — [[Confused Mantis]]
  // > "(Mind Control) Use your Mind control system to calm him down." — [[Confused Mantis]]
  const choices = [
    { id: "s:confused-mantis:shuttle", label: "Send a shuttle with an away team to help." },
    { id: "s:confused-mantis:leave", label: "Leave them, a cornered Mantis is too dangerous." },
  ];
  if (livingKin(g, "human"))
    choices.push({
      id: "s:confused-mantis:human",
      label: "Send your human crewmember to communicate with the Mantis.",
    });
  if (livingKin(g, "mantis"))
    choices.push({
      id: "s:confused-mantis:mantis",
      label: "Send your Mantis crewmember to communicate with the Mantis.",
    });
  if (ownsMindControl(g))
    choices.push({
      id: "s:confused-mantis:mind",
      label: "Use your Mind control system to calm him down.",
    });
  card(
    g,
    "Found malfunctioning Mantis. Believes it is human. Will receive input only from human. Danger Evaluation: Extremely High. Provide assistance.",
    choices,
  );
}

function mantisColony(g: Game) {
  // Wiki citations:
  // > "The colony is a mining operation that specializes in FTL fuel. Robert's family, the head engineers, are excited to see him, and very grateful for his return. Apparently he ran away to 'join the Federation' like his older brother, but was never accepted onto a ship." — [[Confused Mantis#Mining Colony]]
  // > "Offer him a position on your ship." — [[Confused Mantis#Mining Colony]]
  // > "Ask if they can take a look at your engines." — [[Confused Mantis#Mining Colony]]
  card(
    g,
    "The colony is a mining operation that specializes in FTL fuel. Robert's family, the head engineers, are excited to see him, and very grateful for his return. Apparently he ran away to 'join the Federation' like his older brother, but was never accepted onto a ship.",
    [
      { id: "s:confused-mantis:hire", label: "Offer him a position on your ship." },
      { id: "s:confused-mantis:engines", label: "Ask if they can take a look at your engines." },
    ],
  );
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
    show(
      g,
      withLead(
        "After a complete scan of the planet, you find no life. The team is grateful and ready to get to work. The station scientists have a unique talent for life support units and offer to upgrade your oxygen system as thanks.",
      ),
      undefined,
      [upgradeOxygen(g)],
    );
  else if (r === "pirate")
    fight(
      g,
      withLead(
        "A complete scan of the planet reveals no life signs other than a single ship on the surface. The terraformers thank you for your help, and attempt to contact the ship. Just as you're about to jump away, the ship takes off and attacks, it's a pirate!",
      ),
      "Pirate ship",
      "terraforming-scan",
    );
  else {
    card(
      g,
      withLead(
        "A complete scan of the planet reveals a simple mold as the only life present. The terraformers claim their terraforming plans are only hindered by intelligent life; they can begin their work.",
      ),
      [
        { id: "s:terraforming-scan:stop", label: "Tell them to stop. Any life is valuable." },
        { id: "s:terraforming-scan:leave", label: "Leave them to their work." },
      ],
    );
  }
}

const WORD = { fuel: "fuel", missiles: "missiles", parts: "drone parts" } as const;

function stock(g: Game, id: "fuel" | "missiles" | "parts"): number {
  return id === "fuel" ? g.fuel : id === "missiles" ? g.missiles : g.player.parts;
}

/** Packed trade rows. The hail pick already happened. An empty table stays on the hail card. */
function refugeeOffers(id: string) {
  const rows = [];
  for (const row of eventDef(id)?.offers ?? []) if (row.k === "trade") rows.push(row);
  return rows;
}

function refugeeTrade(g: Game, slug: string) {
  const rows = refugeeOffers(slug);
  if (rows.length === 0) return;
  const t = rows[between(g, [0, rows.length - 1])]!;
  const pay = between(g, t.cost);
  const get = between(g, t.gain);
  card(
    g,
    "The vessel is relieved to hear from you! They are running low on supplies. They suggest a trade.",
    [
      {
        id: `s:${slug}:trade:${t.pay}:${pay}:${t.get}:${get}`,
        label: `Trade with them. [${pay} ${WORD[t.pay]} for ${get} ${WORD[t.get]}]`,
      },
      { id: `s:${slug}:decline`, label: "Politely decline." },
    ],
  );
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
  fight(
    g,
    "As you hail the refugee ship, a Zoltan ship suddenly jumps into the system... it claims the refugees are criminals, and accuses you of escorting fugitives! Before you can respond, it cuts communications, and powers up its weapons!",
    "Zoltan ship",
    slug,
    { never: true },
  );
}

function refugeeZoltanContact(g: Game) {
  show(
    g,
    "The refugee ship thanks you for your assistance. As a gesture of good will (and seeing how effectively you dispatched the enemy ship), they offer up what supplies they can spare.",
    rollStandard(g, "low"),
  );
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
    "As you hail the refugee ship, a pirate ship jumps into the system... it was using the refugee ship as bait!",
    "Pirate ship",
    slug,
    { never: true },
  );
}

/** deadCrew contact on type=pirate. The destroyed-ship contact stays the shared thanks. */
function refugeePirateFollow(g: Game) {
  show(
    g,
    "The refugee ship claims pirates have been following their trail since they left their homeworld. As a gesture of good will (and seeing how effectively you dispatched the enemy ship), they offer up what supplies they can spare.",
    rollStandard(g, "low"),
  );
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
    fight(
      g,
      "As you hail the freighter, it advances, weapons bristling from its hull! It's a pirate ambush!",
      "Pirate ship",
      slug,
    );
  } else if (r === "zoltan") {
    fight(
      g,
      "As you hail the refugee ship, a Zoltan ship suddenly jumps into the system... it claims the refugees are criminals, and accuses you of escorting fugitives! Before you can respond, it cuts communications, and powers up its weapons!",
      "Zoltan ship",
      slug,
      { never: true },
    );
  } else if (r === "bait") {
    fight(
      g,
      "As you hail the refugee ship, a pirate ship jumps into the system... it was using the refugee ship as bait!",
      "Pirate ship",
      slug,
      { never: true },
    );
  } else {
    fight(
      g,
      "As you hail the refugee ship, a Slug ship jumps into the system... it was hunting the refugee ship for sport and now they've found you instead!",
      "Slug ship",
      slug,
      { never: true },
    );
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
  // > "Take the weapon and any spare scrap." — [[Dense asteroid field distress#Find remains of a ship]]
  // > "Grab the stasis chamber." — [[Dense asteroid field distress#Find remains of a ship]]
  card(
    g,
    "You find the decaying remains of some kind of ship coated with ice or crystal. You send some crew aboard to explore. Nearly everything is either destroyed or unidentifiable, but one of the weapons appears salvageable and there's a strange stasis pod that catches your eye. It looks like a massive asteroid is in a direct collision course with the derelict ship! You have to pull your crew out but they want to grab what they can first. What do they take?",
    [
      {
        id: "s:dense-asteroid-field-distress:weapon",
        label: "Take the weapon and any spare scrap.",
      },
      { id: "s:dense-asteroid-field-distress:pod", label: "Grab the stasis chamber." },
    ],
  );
}

/**
 * Lanius ship absorbing jump beacon, Leave.
 * DuplicateEvent|3 is three copies of nothing and one Lanius fight. Established, not invented.
 */
function beaconEaterLeave(g: Game) {
  // Wiki citations:
  // > "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon." — [[Lanius ship absorbing jump beacon]]
  // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
  // > "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!" — [[Lanius ship absorbing jump beacon]]
  if (
    weighted(g, [
      ["nothing", 3],
      ["fight", 1],
    ] as const) === "nothing"
  ) {
    show(
      g,
      "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon.",
      undefined,
      ["Nothing happens."],
    );
    return;
  }
  fight(
    g,
    "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!",
    "Lanius ship",
    "lanius-ship-absorbing-jump-beacon",
  );
}

/** Lanius craftsmen. Each craft button prints and spends its packed scrap count. */
function craftsmenMenu(g: Game, discount: boolean) {
  // Wiki citations:
  // > "They respond, \"We haven't the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something.\"" — [[Lanius craftsmen]]
  // > "Give 45 scrap to craft an augmentation." — [[Lanius craftsmen]]
  // > "Scrap lost: 45" — [[Lanius craftsmen]]
  // > "Give 50 scrap to craft a weapon." — [[Lanius craftsmen]]
  // > "Scrap lost: 50" — [[Lanius craftsmen]]
  // > "Give 40 scrap to craft a drone schematic." — [[Lanius craftsmen]]
  // > "Scrap lost: 40" — [[Lanius craftsmen]]
  // > "Decline their offer." — [[Lanius craftsmen]]
  // > "(Lanius Crew) Offer to help in the process." — [[Lanius craftsmen]]
  // > "Your crewmember offers to aid in the process to speed it along. They think it can be performed a bit more efficiently with the extra help and request less scrap." — [[Lanius craftsmen]]
  // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
  const prefix = discount ? "s:lanius-craftsmen:help" : "s:lanius-craftsmen";
  const choices: { id: string; label: string }[] = [];
  const offer = (suffix: "aug" | "weapon" | "drone", label: (n: number) => string) => {
    const id = `${prefix}:${suffix}`;
    const n = scrapStock(id);
    if (n == null) return;
    choices.push({ id, label: label(n) });
  };
  offer("aug", (n) => `Give ${n} scrap to craft an augmentation.`);
  offer("weapon", (n) => `Give ${n} scrap to craft a weapon.`);
  offer("drone", (n) => `Give ${n} scrap to craft a drone schematic.`);
  choices.push({ id: "s:lanius-craftsmen:decline", label: "Decline their offer." });
  if (!discount)
    choices.push({ id: "s:lanius-craftsmen:help", label: "Offer to help in the process." });
  card(
    g,
    discount
      ? "Your crewmember offers to aid in the process to speed it along. They think it can be performed a bit more efficiently with the extra help and request less scrap."
      : 'They respond, "We haven\'t the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something."',
    choices,
  );
}

/** Unnamed augmentation, weapon, or drone schematic. Rewards names the kind and not the item. */
function craftItem(g: Game, id: string, kind: "augment" | "weapon" | "drone", story: string) {
  const cost = scrapStock(id);
  if (cost == null || g.scrap < cost) return;
  g.scrap -= cost;
  const spent = `Scrap: -${cost}.`;
  log(g, spent);
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
      show(
        g,
        "Scans reveal a number of asteroids with useful compositions. You extract some fuel.",
        resource(g, "fuel", "high"),
      );
    else if (r === "missiles")
      show(
        g,
        "You discover the remains of ship embedded into an asteroid. It still has some functional missiles.",
        resource(g, "missiles", "medium", "medium"),
      );
    else if (r === "parts")
      show(
        g,
        "You happen upon an abandoned mining site. A few mining drones were left behind and could be repurposed.",
        resource(g, "parts", "medium", "medium"),
      );
    else if (r === "pirate")
      fight(
        g,
        "A pirate ship hiding behind one of the larger asteroids attacks you!",
        "Pirate ship",
        "large-asteroid-field",
        { asteroid: true },
      );
    else if (r === "rocks") {
      // Large asteroid field: "5 hull damage, 1 damage to a random system, 1 damage with 1-2 fires to a random room."
      if (hurt(g, 5)) return;
      show(
        g,
        "The asteroid field proved more dangerous than expected. Some asteroids managed to get through your ship's defenses.",
        undefined,
        ["Hull damage: 5.", hurtRandomSystem(g), rockFires(g)],
      );
    } else show(g, "A brief exploration yields nothing of interest.");
  },
  "c:large-asteroid-field:1": done,
  // Large asteroid field, Scrap Recovery Arm: "You receive high scrap." The arm must be fitted.
  "c:large-asteroid-field:2": (g) => {
    if (!g.augments.includes("SCRAP_COLLECTOR")) return;
    show(
      g,
      "You carefully extract as much usable material as possible from the nearest asteroids while waiting for the FTL to charge.",
      scrapOnly(g, "high"),
    );
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
    if (r === "little")
      show(
        g,
        "You scan the battlefield, and find little remains. Disappointed, you prepare to jump.",
      );
    else if (r === "slug")
      show(
        g,
        "As you approach the wreckage, a Slug ship makes its arrival. It hesitates for a moment, as if surprised to see anyone remaining, and then jumps away without a word. You resume scanning the system, wary of any other visitors.",
      );
    else if (r === "salvage")
      show(
        g,
        "You scan the battlefield, and are able to salvage some useful material from the wreckage.",
        rollSurrenderOffer(g, "medium", true),
      );
    else if (r === "mantis")
      fight(
        g,
        "As you approach the wreckage, a Mantis ship screams into the system... either sensing prey - or to finish the job its fellows started.",
        "Mantis ship",
        "battlefield-wreckage",
      );
    else if (r === "rebel")
      fight(
        g,
        "The wreckage appears to be a battle between Federation fighters and Rebel cruisers. Though outnumbered, it looks like the Federation fought valiantly. As you begin a more detailed scan of the wreckage, Rebel reinforcements arrive in the system and target your ship!",
        "Rebel ship",
        "battlefield-wreckage",
      );
    else
      fight(
        g,
        "As you approach the wreckage, a Zoltan ship makes its arrival. It immediately mistakes you for one of the attackers, declares you as hostile aggressors in violation of Zoltan space, and opens fire!",
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
    show(
      g,
      "You scan the battlefield, and with the aid of your Sensors, you are able to salvage a moderate amount of material from the wreckage. You prepare to jump.",
      rollSurrenderOffer(g, "medium", true),
    );
  },

  // ---- Plagued station ----
  "c:plagued-station:0": (g) => {
    const r = weighted(g, [
      ["dead", 1],
      ["survivor", 1],
      ["sick", 1],
    ] as const);
    if (r === "dead")
      show(
        g,
        "All around you is the stench of death and decay. The life sign readings must have been malfunctioning because you really doubt anything could be alive in here. You quickly return to the ship.",
        scrapOnly(g, "low"),
      );
    else if (r === "survivor")
      show(
        g,
        "Human corpses are scattered across the station. You find the source of the signal, a lone survivor that locked themselves in a storage closet. You quickly retreat with them in tow back to the ship, and hope they can recover enough to be of some use.",
        scrapOnly(g, "low"),
        [gainCrew(g, "Human")],
      );
    else {
      const offer = scrapOnly(g, "low");
      payOffer(g, offer, true);
      card(
        g,
        `All around you is the stench of death and decay. Suddenly, one of your crew bends over and starts retching violently. Some sort of disease must have wiped out this station. You pull back to the ship, but it looks like your crew member is not going to make it.

Scrap: ${offer.scrap}.`,
        [
          { id: "s:plagued-station:continue", label: "Continue..." },
          // {{Blue Option|Improved Medbay|Try to cure the disease.|level=2+|shortreq=Medbay}}. The button stays on the card.
          { id: "s:plagued-station:cure", label: "Try to cure the disease." },
        ],
      );
    }
  },
  // "You lose a crewmember." Clone Bay has [no effect]. The page says "(Clone Bay)", any installed level, not level 2+.
  "s:plagued-station:continue": (g) => {
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.clonebay)
      extras.push(
        "You stop your crew's clone from forming, knowing that the disease would follow into his next life.",
      );
    show(
      g,
      "Your crewmember insists you leave them behind, not wanting to endanger the rest of the crew. Knowing the truth of this, you hurry back to the ship.",
      undefined,
      extras,
    );
  },
  // Improved Medbay level=2+. The page's next line is "Nothing happens." The low scrap was already paid on the disease card.
  "s:plagued-station:cure": (g) => {
    if (medbayLevel(g) < 2) return;
    show(
      g,
      "Your advanced medical suite is able to isolate the cause of the problem and administer an antidote. That was a close one.",
    );
  },
  "c:plagued-station:1": (g) => {
    show(
      g,
      "While waiting for the FTL drive to charge, you skirt around the edge of the station and collect some scrap.",
      scrapOnly(g),
    );
  },

  // ---- Rebel fight chance ----
  "c:rebel-fight-chance:0": (g) => {
    const r = weighted(g, [
      ["found", 2],
      ["slow", 1],
      ["none", 1],
    ] as const);
    if (r === "found")
      fight(
        g,
        "After a short search you find the Rebel ship. Let's hope he's as easy to defeat in combat as he was to find.",
        "Rebel ship",
        "rebel-fight-chance",
      );
    else if (r === "slow") {
      // "Rebel Fleet pursuit is doubled for 1 jump" (citedChoose `faster`: one extra step).
      g.fleet += 1;
      log(g, "Rebel Fleet pursuit is doubled for 1 jump.");
      fight(
        g,
        "After far too much time spent searching, you are finally able to track him down. You go into the fight pondering just how much of a head start you've lost on the Rebel Fleet...",
        "Rebel ship",
        "rebel-fight-chance",
      );
    } else
      show(
        g,
        "You spend some time looking but your scanners cannot pick up any trace of the Rebel ship. You prepare to move on.",
      );
  },
  "c:rebel-fight-chance:1": done,
  // Rebel fight chance. {{Blue Option|Improved Sensors|Perform a scan of the area.|level=2|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship. level=2 means at least that installed level.
  "c:rebel-fight-chance:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    fight(
      g,
      "You quickly find the rebel ship's location and move to intercept.",
      "Rebel ship",
      "rebel-fight-chance",
    );
  },
  // Rebel fight chance. {{Blue Option|Advanced Sensors|Pinpoint the Rebel's location.|level=3|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship whose engines are disabled.
  // INFERRED: "disabled" damages every installed engine bar. The page prints no bar count.
  // level=3 means at least that installed level.
  "c:rebel-fight-chance:3": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(
      g,
      "You find the Rebel ship hiding on a nearby asteroid. You are able to get a shot off and permanently disable their engines before they notice you.",
      "Rebel ship",
      "rebel-fight-chance",
    );
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage)
      hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },

  // Rebel fight chance in nebula. The chase lists three results and prints no odds. INFERRED: equal.
  "c:rebel-fight-chance-in-nebula:0": (g) => {
    // Wiki citations:
    // > "Stay hidden." — [[Rebel fight chance in nebula]]
    // > "You try and stay out of sight. You doubt they saw you." — [[Rebel fight chance in nebula]]
    // > "Nothing happens." — [[Rebel fight chance in nebula]]
    show(g, "You try and stay out of sight. You doubt they saw you.", undefined, [
      "Nothing happens.",
    ]);
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
      // > "You follow their vapour trails and surf onto their six o' clock, weapons hot." — [[Rebel fight chance in nebula]]
      // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
      fight(
        g,
        "You follow their vapour trails and surf onto their six o' clock, weapons hot.",
        "Rebel ship",
        "rebel-fight-chance-in-nebula",
      );
      return;
    }
    if (r === "double") {
      // "Rebel Fleet pursuit is doubled." No jump count is printed. INFERRED: the current fleet position doubles, the same step as cited-events.ts fx double.
      // Wiki citations:
      // > "You get disoriented in the nebula and lose your bearings completely. It takes some time to get back to the beacon. It's likely the fleet has had time to advance closer to your position." — [[Rebel fight chance in nebula]]
      // > "Rebel Fleet pursuit is doubled." — [[Rebel fight chance in nebula]]
      g.fleet *= 2;
      show(
        g,
        "You get disoriented in the nebula and lose your bearings completely. It takes some time to get back to the beacon. It's likely the fleet has had time to advance closer to your position.",
        undefined,
        ["Rebel Fleet pursuit is doubled."],
      );
      return;
    }
    // Wiki citations:
    // > "Without sensors you can't maintain a lock for long. The rebels slip away." — [[Rebel fight chance in nebula]]
    // > "Nothing happens." — [[Rebel fight chance in nebula]]
    show(
      g,
      "Without sensors you can't maintain a lock for long. The rebels slip away.",
      undefined,
      ["Nothing happens."],
    );
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
      "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range.",
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
      "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range.",
      "Rebel ship",
      "rebel-fight-chance-in-nebula",
    );
  },
  "c:rebel-fight-chance-in-nebula:4": (g) => {
    // Wiki citations:
    // > "(Lifeform Scanner) Use their life signatures to follow." — [[Rebel fight chance in nebula]]
    // > "Your augment's ability to keep track of their life signatures within the nebula proves useful. You catch up to the ship and prepare for a fight." — [[Rebel fight chance in nebula]]
    // > "Fight the Rebel ship (default rewards)." — [[Rebel fight chance in nebula]]
    if (!g.augments.includes("LIFE_SCANNER")) return;
    fight(
      g,
      "Your augment's ability to keep track of their life signatures within the nebula proves useful. You catch up to the ship and prepare for a fight.",
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
      if (g.player.kits.clonebay)
        extras.push(
          "You check your Cloning Bay but it lies dormant. Whatever just happened to your crewmember must be irreversible.",
        );
      const note = loseCrew(g, true);
      if (note) extras.push(note);
      show(
        g,
        "As you approach, a kaleidoscope of colours fills the view-screen and one of your crew begins to age rapidly in reverse, eventually disappearing into nothingness. Let's hope they've transcended physical existence, and not just been forced out of it.",
        undefined,
        extras,
      );
      return;
    }
    if (r === "fight") {
      // Wiki citations:
      // > "You approach the planet and wait, but nothing happens. The Zoltan hail: \"And in the coming times, when the monolith speaks not with a man he has no future and must be left wanting.\"" — [[Zoltan Great Eye]]
      // > "Fight a Zoltan ship (default rewards)." — [[Zoltan Great Eye]]
      fight(
        g,
        'You approach the planet and wait, but nothing happens. The Zoltan hail: "And in the coming times, when the monolith speaks not with a man he has no future and must be left wanting."',
        "Zoltan ship",
        "zoltan-great-eye",
      );
      return;
    }
    if (r === "scrap") {
      // Wiki citations:
      // > "You approach the planet carefully, trying to keep your ship from breaking up in orbit. The monolith, whatever it is, must sense as much because the next thing you know you have enough scrap to patch up your damage and more besides!" — [[Zoltan Great Eye]]
      // > "You receive high scrap." — [[Zoltan Great Eye]]
      show(
        g,
        "You approach the planet carefully, trying to keep your ship from breaking up in orbit. The monolith, whatever it is, must sense as much because the next thing you know you have enough scrap to patch up your damage and more besides!",
        scrapOnly(g, "high"),
      );
      return;
    }
    // Wiki citations:
    // > "As you approach, an ancient alien voice speaks to you: \"Your mission has brought you great battles, and great losses. This will help ease the pain.\" A few minutes later someone reports medical equipment has appeared on the ship!" — [[Zoltan Great Eye]]
    // > "You receive Healing Burst." — [[Zoltan Great Eye]]
    show(
      g,
      'As you approach, an ancient alien voice speaks to you: "Your mission has brought you great battles, and great losses. This will help ease the pain." A few minutes later someone reports medical equipment has appeared on the ship!',
      {
        tier: "low",
        scrap: 0,
        eligible: 0,
        fuel: 0,
        missiles: 0,
        parts: 0,
        weapon: "BOMB_HEAL",
      },
    );
  },
  "c:zoltan-great-eye:1": (g) => {
    // Wiki citations:
    // > "Your mission is to save the Federation, not discover new wonders around the galaxy. You prepare to jump." — [[Zoltan Great Eye]]
    show(
      g,
      "Your mission is to save the Federation, not discover new wonders around the galaxy. You prepare to jump.",
      undefined,
      ["Nothing happens."],
    );
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
    show(g, "You receive a Slug crewmember named Slocknog.", undefined, [`Scrap: -${cost}.`]);
  },
  "c:slocknog:1": (g) => {
    // Wiki citations:
    // > "Ignore Slocknog." — [[Slocknog]]
    // > "You power up the FTL, at which point the Slug sends an urgent plea. \"Please, I ssee you are a sssly captain. You have an advantage. Very well. I will join your crew - but please remove me from this rock!\"" — [[Slocknog]]
    card(
      g,
      'You power up the FTL, at which point the Slug sends an urgent plea. "Please, I ssee you are a sssly captain. You have an advantage. Very well. I will join your crew - but please remove me from this rock!"',
      [
        { id: "s:slocknog:rescue", label: "Rescue him." },
        { id: "s:slocknog:leave", label: "Leave him." },
      ],
    );
  },
  "s:slocknog:rescue": (g) => {
    // Wiki citations:
    // > "Rescue him." — [[Slocknog]]
    // > "When he sees the shuttle headed for his position the Slug thanks you with what looks like sincerity. He readily joins your crew." — [[Slocknog]]
    // > "You receive a Slug crewmember named Slocknog." — [[Slocknog]]
    const note = joinCrew(g, "Slug", "Slocknog")
      ? "Slocknog joins you."
      : "There is no room aboard for Slocknog.";
    show(
      g,
      "When he sees the shuttle headed for his position the Slug thanks you with what looks like sincerity. He readily joins your crew.",
      undefined,
      [note],
    );
  },
  "s:slocknog:leave": (g) => {
    // Wiki citations:
    // > "Leave him." — [[Slocknog]]
    // > "You close the frequency and continue jump prep. If this Slug is such a hero he'll find a way off that moon on his own." — [[Slocknog]]
    // > "Nothing happens." — [[Slocknog]]
    show(
      g,
      "You close the frequency and continue jump prep. If this Slug is such a hero he'll find a way off that moon on his own.",
      undefined,
      ["Nothing happens."],
    );
  },

  // Dense asteroid field distress. Search lists three results and prints no odds. INFERRED: equal.
  // The salvaged weapon with low scrap: Rewards, "Weapon": "A random weapon & T scrap."
  "c:dense-asteroid-field-distress:0": (g) => {
    // Wiki citations:
    // > "Search for the ship." — [[Dense asteroid field distress]]
    // > "You find what appears to be pieces of a derelict ship coated with ice or crystal." — [[Dense asteroid field distress]]
    // > "Your ship takes 5 hull damage, 1 damage to engines." — [[Dense asteroid field distress]]
    // > "You find a pirate ship, damaged and abandoned. You salvage what you can and move on." — [[Dense asteroid field distress]]
    // > "You receive a random amount of scrap with resources." — [[Dense asteroid field distress]]
    const r = weighted(g, [
      ["hit", 1],
      ["scrap", 1],
      ["remains", 1],
    ] as const);
    if (r === "hit") {
      if (hurt(g, 5)) return;
      if (g.player.systems.engines) hurtSystem(g.player, "engines", 1);
      show(
        g,
        "You find what appears to be pieces of a derelict ship coated with ice or crystal. Before you have a chance to dock, a few asteroids get past your shields and partially damage your engines. You'll have to pull out!",
        undefined,
        ["Hull damage: 5.", "1 damage to engines."],
      );
      return;
    }
    if (r === "scrap") {
      show(
        g,
        "You find a pirate ship, damaged and abandoned. You salvage what you can and move on.",
        rollStandard(g),
      );
      return;
    }
    asteroidRemains(g);
  },
  "c:dense-asteroid-field-distress:1": (g) => {
    // Wiki citations:
    // > "Avoid the area." — [[Dense asteroid field distress]]
    // > "Discretion is the better part of valor. Better not risk it." — [[Dense asteroid field distress]]
    // > "Nothing happens." — [[Dense asteroid field distress]]
    show(g, "Discretion is the better part of valor. Better not risk it.", undefined, [
      "Nothing happens.",
    ]);
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
    show(
      g,
      "Your crew grabs what they can and returns to the ship before the asteroid hits. You take a look at what you've recovered once you move clear of the asteroid field.",
      scrapOnly(g, "low"),
      [grantRandomItem(g, "weapon")],
    );
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
    show(
      g,
      "Your crew drags the pod back to your ship before the asteroid smashes into the ship, shattering through the crystal coating and destroying the ship. The pod appears to be functioning but you see nothing but shards of crystal inside. Perhaps someone else will know how to open it.",
      scrapOnly(g, "low"),
      [note],
    );
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
      // > "A Rock patrol ship jumps in while you are salvaging the ship. They message you, \"Filthy pirates! Prepare to die!\" You doubt explaining your mission will convince them of your need." — [[Disabled Rock ship]]
      // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
      // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
      payOffer(g, offer, true);
      for (const line of standardLines(offer)) log(g, line);
      fight(
        g,
        'A Rock patrol ship jumps in while you are salvaging the ship. They message you, "Filthy pirates! Prepare to die!" You doubt explaining your mission will convince them of your need.',
        "Rock ship",
        "disabled-rock-ship",
      );
      return;
    }
    // Wiki citations:
    // > "You salvage what you can from the ship. No one bothers you during the operation." — [[Disabled Rock ship]]
    // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
    show(
      g,
      "You salvage what you can from the ship. No one bothers you during the operation.",
      offer,
    );
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
      show(
        g,
        "The Rock people are not known for setting traps but you hasten to leave anyway.",
        undefined,
        ["Nothing happens."],
      );
      return;
    }
    // Wiki citations:
    // > "Before you have a chance to leave, a Rock patrol ship arrives and you intercept their comm chatter, \"...appears we've finally found them. Their killing spree ends now!\" Before you can plead your innocence they move in to attack." — [[Disabled Rock ship]]
    // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
    fight(
      g,
      'Before you have a chance to leave, a Rock patrol ship arrives and you intercept their comm chatter, "...appears we\'ve finally found them. Their killing spree ends now!" Before you can plead your innocence they move in to attack.',
      "Rock ship",
      "disabled-rock-ship",
    );
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
    // Wiki citations:
    // > "You salvage what you can from the ship. No lifeforms or ships are detected nearby." — [[Disabled Rock ship]]
    // > "You begin the salvage operation but before long your crew warns you of an approaching ship. You hasten to leave before they get within firing range." — [[Disabled Rock ship]]
    const line = clear
      ? "You salvage what you can from the ship. No lifeforms or ships are detected nearby."
      : "You begin the salvage operation but before long your crew warns you of an approaching ship. You hasten to leave before they get within firing range.";
    show(g, line, rollStandard(g));
  },

  // Mantis fugitive. Each list prints no odds. INFERRED: equal.
  // The thanked Mantis is not named, so that crewmember is not added.
  "c:mantis-fugitive:0": (g) => {
    // Wiki citations:
    // > "It was a trap! The Mantis sabotages your ship before teleporting away." — [[Mantis fugitive]]
    // > "Your ship takes 5 hull damage, 1 damage to a random system, 1 damage to a random room, and you fight a mantis-controlled Engi ship (default rewards)." — [[Mantis fugitive]]
    // > "He expresses his thanks and prepares to help you fight his pursuer." — [[Mantis fugitive]]
    if (
      weighted(g, [
        ["trap", 1],
        ["thanks", 1],
      ] as const) === "trap"
    ) {
      if (hurt(g, 5)) return;
      const lines = ["Hull damage: 5.", hurtRandomSystem(g), roomBar(g)].filter(Boolean);
      for (const line of lines) log(g, line);
      fight(
        g,
        "It was a trap! The Mantis sabotages your ship before teleporting away.",
        "Engi ship",
        "mantis-fugitive",
      );
      mantisControlled(g);
      return;
    }
    fight(
      g,
      "He expresses his thanks and prepares to help you fight his pursuer.",
      "Engi ship",
      "mantis-fugitive",
    );
  },
  "c:mantis-fugitive:1": (g) => {
    // Wiki citations:
    // > "The Engi captain is delighted, and quickly arranges for the transfer of the prisoner." — [[Mantis fugitive]]
    // > "You receive high scrap." — [[Mantis fugitive]]
    // > "Fury sparks in the eyes of the Mantis. He won't go easily, and causes serious damage before he can be captured." — [[Mantis fugitive]]
    // > "Your ship takes 5 hull damage, 1 damage with alt=fire (S_fire2.png) to a random room, and you receive high scrap." — [[Mantis fugitive]]
    // > "The pursuing ship responds with a completely unintelligible message. The young Mantis jerks to attention and assumes a battle stance. It was a trap!" — [[Mantis fugitive]]
    // > "1 mantis boarder beams aboard your ship, and you fight a mantis-controlled Engi ship (default rewards)." — [[Mantis fugitive]]
    const r = weighted(g, [
      ["scrap", 1],
      ["fire", 1],
      ["trap", 1],
    ] as const);
    if (r === "scrap") {
      show(
        g,
        "The Engi captain is delighted, and quickly arranges for the transfer of the prisoner.",
        scrapOnly(g, "high"),
      );
      return;
    }
    if (r === "fire") {
      if (hurt(g, 5)) return;
      show(
        g,
        "Fury sparks in the eyes of the Mantis. He won't go easily, and causes serious damage before he can be captured.",
        scrapOnly(g, "high"),
        ["Hull damage: 5.", rockFires(g)],
      );
      return;
    }
    fight(
      g,
      "The pursuing ship responds with a completely unintelligible message. The young Mantis jerks to attention and assumes a battle stance. It was a trap!",
      "Engi ship",
      "mantis-fugitive",
    );
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
      // > "You charge weapons and the Slugs quickly change course to meet your charge." — [[Slug ship boarding Rock ship]]
      // > "Fight a Slug ship." — [[Slug ship boarding Rock ship]]
      fight(
        g,
        "You charge weapons and the Slugs quickly change course to meet your charge.",
        "Slug ship",
        "slug-ship-boarding-rock-ship",
      );
      return;
    }
    // Wiki citations:
    // > "You charge your weapons and the Slugs immediately back down. When you return to the freighter, the Rockmen have already repaired the worst of their damage and jump away without another word." — [[Slug ship boarding Rock ship]]
    // > "Nothing happens." — [[Slug ship boarding Rock ship]]
    show(
      g,
      "You charge your weapons and the Slugs immediately back down. When you return to the freighter, the Rockmen have already repaired the worst of their damage and jump away without another word.",
      undefined,
      ["Nothing happens."],
    );
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
      show(
        g,
        "You have no desire to provoke Slugs in their own territory. You leave them alone.",
        undefined,
        ["Nothing happens."],
      );
      return;
    }
    // Wiki citations:
    // > "After the Slugs board the ship, you are surprised to see the Rock ship spring to life and decimate the other ship. They message you, \"Pathetic. You are either a coward or an ally of the Slugs. Either way, you don't deserve to live.\"" — [[Slug ship boarding Rock ship]]
    // > "Fight a Rock ship (default rewards)." — [[Slug ship boarding Rock ship]]
    fight(
      g,
      'After the Slugs board the ship, you are surprised to see the Rock ship spring to life and decimate the other ship. They message you, "Pathetic. You are either a coward or an ally of the Slugs. Either way, you don\'t deserve to live."',
      "Rock ship",
      "slug-ship-boarding-rock-ship-rock",
    );
  },

  // Rock and Slug standoff. The debt is 10-15 scrap, shown on the button. Demand lists three results and prints no odds. INFERRED: equal.
  "c:rock-and-slug-standoff:0": (g) => {
    // Wiki citations:
    // > "Hail them to see what's wrong." — [[Rock and Slug standoff]]
    // > "The Slug captain explains that they upgraded the Rock ship's reactor and now the 'thick boulder heads' are refusing to pay for the work done. The Rock Captain says the 'slime balls' did a poor job that is not worth their agreed upon price." — [[Rock and Slug standoff]]
    // > "Offer to pay off the Rock debt. [ Scrap lost: 10-15 ]" — [[Rock and Slug standoff]]
    // > "Demand the Rock ship pay the agreed upon price." — [[Rock and Slug standoff]]
    // > "You have better things to attend to, leave them." — [[Rock and Slug standoff]]
    const debt = rollPrice("rock-and-slug-standoff", "debt", (lo, hi) => between(g, [lo, hi]));
    const choices = [];
    if (debt != null) {
      choices.push({
        id: `s:rock-slug:debt:${debt}`,
        label: `Offer to pay off the Rock debt. [${debt} scrap]`,
      });
    }
    choices.push(
      { id: "s:rock-slug:demand", label: "Demand the Rock ship pay the agreed upon price." },
      { id: "s:rock-slug:leave", label: "You have better things to attend to, leave them." },
    );
    card(
      g,
      "The Slug captain explains that they upgraded the Rock ship's reactor and now the 'thick boulder heads' are refusing to pay for the work done. The Rock Captain says the 'slime balls' did a poor job that is not worth their agreed upon price.",
      choices,
    );
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
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. They thank you for the tip and prepare to jump in the direction you came. That will hopefully delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. You're not certain if you were misunderstood but they appear to scoff at your suggestion. Most ships continue what they were doing but a single ship moves to fight you." — [[Lanius ship absorbing rebel base]]
    // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius ship absorbing rebel base]]
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. However, either the translation device has failed or they're simply not interested. They cut the channel and continue to absorb the ships." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    const r = weighted(g, [
      ["delay", 1],
      ["fight", 1],
      ["nothing", 1],
    ] as const);
    if (r === "delay") {
      delayFleetOne(g);
      show(
        g,
        "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. They thank you for the tip and prepare to jump in the direction you came. That will hopefully delay the fleet. You scrap what remains of the Rebel station.",
        rollStandard(g, "medium"),
        ["Rebel Fleet is delayed for 1 turn."],
      );
      return;
    }
    if (r === "fight") {
      fight(
        g,
        "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. You're not certain if you were misunderstood but they appear to scoff at your suggestion. Most ships continue what they were doing but a single ship moves to fight you.",
        "Lanius ship",
        "lanius-ship-absorbing-rebel-base-fight",
      );
      return;
    }
    show(
      g,
      "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. However, either the translation device has failed or they're simply not interested. They cut the channel and continue to absorb the ships.",
      undefined,
      ["Nothing happens."],
    );
  },
  "c:lanius-ship-absorbing-rebel-base:1": (g) => {
    // Wiki citations:
    // > "Leave them alone." — [[Lanius ship absorbing rebel base]]
    // > "You decide it would be better to leave them be." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    show(g, "You decide it would be better to leave them be.", undefined, ["Nothing happens."]);
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
      // > "The Mantis craft are both too busy slaughtering one another to notice you. Eventually the smaller ship gets the upper hand, but they must have blown a fuse in the assault and their weapons system is inoperable. Now is the time to attack!" — [[Mantis ships battle for Rock freighter]]
      // > "Fight a Mantis ship whose Weapon Control system power level is reduced by 2." — [[Mantis ships battle for Rock freighter]]
      fight(
        g,
        "The Mantis craft are both too busy slaughtering one another to notice you. Eventually the smaller ship gets the upper hand, but they must have blown a fuse in the assault and their weapons system is inoperable. Now is the time to attack!",
        "Mantis ship",
        "mantis-ships-battle-for-rock-freighter",
      );
      if (g.enemy) hurtSystem(g.enemy, "weapons", 2);
      return;
    }
    // Wiki citations:
    // > "The Mantis craft may have their differences, but when it comes to you they are of one mind. The smaller ship suffers a power failure as it moves to engage, but the larger one lets off a volley of fire and moves in to attack!" — [[Mantis ships battle for Rock freighter]]
    // > "Fight a Mantis ship." — [[Mantis ships battle for Rock freighter]]
    fight(
      g,
      "The Mantis craft may have their differences, but when it comes to you they are of one mind. The smaller ship suffers a power failure as it moves to engage, but the larger one lets off a volley of fire and moves in to attack!",
      "Mantis ship",
      "mantis-ships-battle-for-rock-freighter",
    );
  },
  "c:mantis-ships-battle-for-rock-freighter:1": (g) => {
    // Wiki citations:
    // > "Ignore them." — [[Mantis ships battle for Rock freighter]]
    // > "There's quite enough action here already - prepare for light speed." — [[Mantis ships battle for Rock freighter]]
    // > "Nothing happens." — [[Mantis ships battle for Rock freighter]]
    show(g, "There's quite enough action here already - prepare for light speed.", undefined, [
      "Nothing happens.",
    ]);
  },
  // Repair Drone. High standard. Printed bug: no drone part is required when that reward includes drone parts.
  // The unnamed standard bonus stays unwired.
  "c:mantis-ships-battle-for-rock-freighter:2": (g) => {
    // Wiki citations:
    // > "(Repair Drone) Repair the Rock ship. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
    // > "While the two Mantis fight you approach the Rock ship and send a repair drone through one of the many breaches. It fixes the ship up enough to make at least a single jump. You're surprised when, instead, they embark on a kamikaze run on the two Mantis, which results in the obliteration of all three!" — [[Mantis ships battle for Rock freighter]]
    // > "You receive high scrap with resources." — [[Mantis ships battle for Rock freighter]]
    if (!ownsDrone(g, "REPAIR")) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(
      g,
      rollStandard(g, "high"),
      "While the two Mantis fight you approach the Rock ship and send a repair drone through one of the many breaches. It fixes the ship up enough to make at least a single jump. You're surprised when, instead, they embark on a kamikaze run on the two Mantis, which results in the obliteration of all three!",
      hull,
      lines,
    );
  },
  // Hull Repair Drone. One drone part, then a Mantis ship. The bug note is not on this choice.
  "c:mantis-ships-battle-for-rock-freighter:3": (g) => {
    // Wiki citations:
    // > "(Hull Repair Drone) Repair their hull. [ Drone parts lost: 1 ]" — [[Mantis ships battle for Rock freighter]]
    // > "While the two Mantis fight you approach the Rock ship and use a drone to fix up the ship. Once the breaches are fixed the life support flickers back on. In a matter of moments they are already in pursuit of one of the Mantis ships. Meanwhile the second Mantis turns toward you." — [[Mantis ships battle for Rock freighter]]
    // > "Fight a Mantis ship." — [[Mantis ships battle for Rock freighter]]
    const n = affordStock(g, "c:mantis-ships-battle-for-rock-freighter:3", "parts");
    if (!ownsDrone(g, "SHIP_REPAIR") || n == null) return;
    takeStock(g, "parts", n);
    log(g, partsLine(n));
    fight(
      g,
      "While the two Mantis fight you approach the Rock ship and use a drone to fix up the ship. Once the breaches are fixed the life support flickers back on. In a matter of moments they are already in pursuit of one of the Mantis ships. Meanwhile the second Mantis turns toward you.",
      "Mantis ship",
      "mantis-ships-battle-for-rock-freighter",
    );
  },

  // Rock live mine. The turning circle always fails. The defuse lists two results and prints no odds. INFERRED: equal.
  "c:rock-live-mine:0": (g) => {
    // Wiki citations:
    // > "Attempt evasive maneuvers." — [[Rock live mine]]
    // > "The ship's turning circle proves too wide and the mine bites down onto the hull. You can hear it now, chewing through the armor." — [[Rock live mine]]
    // > "Send someone out there to defuse it." — [[Rock live mine]]
    // > "(Missile Weapon) Attempt a controlled detonation using a missile. [ Icon missiles (cropped).png1 ] -- bugged: Hull Missile doesn't count" — [[Rock live mine]]
    // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
    card(
      g,
      "The ship's turning circle proves too wide and the mine bites down onto the hull. You can hear it now, chewing through the armor.",
      [
        { id: "s:rock-mine:defuse", label: "Send someone out there to defuse it." },
        { id: "s:rock-mine:missile", label: "Attempt a controlled detonation using a missile." },
        {
          id: "s:rock-mine:beam",
          label: "Use a drone to cut away the mine with a precision beam.",
        },
      ],
    );
  },
  "c:rock-live-mine:1": (g) => {
    // Wiki citations:
    // > "(Improved Engines) Reverse thrusters! (Requires level 5+ Engines)" — [[Rock live mine]]
    // > "It stresses the inertial dampeners, but you reverse course and outrun the mine. You prepare to jump off." — [[Rock live mine]]
    // > "Nothing happens." — [[Rock live mine]]
    if ((g.player.systems.engines?.level ?? 0) < 5) return;
    show(
      g,
      "It stresses the inertial dampeners, but you reverse course and outrun the mine. You prepare to jump off.",
      undefined,
      ["Nothing happens."],
    );
  },
  "s:rock-mine:defuse": (g) => {
    // Wiki citations:
    // > "Send someone out there to defuse it." — [[Rock live mine]]
    if (
      weighted(g, [
        ["scrap", 1],
        ["wires", 1],
      ] as const) === "scrap"
    ) {
      // Wiki citations:
      // > "Your crewmember dons a space suit and exits the airlock. They make quick work of the basic device and return inside to relief all round. The mine makes good scrap pickings too." — [[Rock live mine]]
      // > "You receive medium scrap." — [[Rock live mine]]
      show(
        g,
        "Your crewmember dons a space suit and exits the airlock. They make quick work of the basic device and return inside to relief all round. The mine makes good scrap pickings too.",
        scrapOnly(g, "medium"),
      );
      return;
    }
    // Wiki citations:
    // > "Your crewmember dons a space suit and exits the airlock. When they open up the mine housing, though, they panic. The red wire or the blue?! 3... 2... 1..." — [[Rock live mine]]
    card(
      g,
      "Your crewmember dons a space suit and exits the airlock. When they open up the mine housing, though, they panic. The red wire or the blue?! 3... 2... 1...",
      [
        { id: "s:rock-mine:red", label: "Red!" },
        { id: "s:rock-mine:blue", label: "Blue!" },
      ],
    );
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
    // > "After drawing straws, a crewmember goes out to fix a modified warhead to the mine. You detonate the missile in a way that dislodges the mine. It blows up shortly after. The ship takes some damage in the blasts, but you're still sailing." — [[Rock live mine]]
    // > "Your ship takes 4 hull damage, 1 damage to a random system, and you receive low scrap." — [[Rock live mine]]
    if (!miningMissile(g)) return;
    if (hurt(g, 4)) return;
    show(
      g,
      "After drawing straws, a crewmember goes out to fix a modified warhead to the mine. You detonate the missile in a way that dislodges the mine. It blows up shortly after. The ship takes some damage in the blasts, but you're still sailing.",
      scrapOnly(g, "low"),
      ["Hull damage: 4.", hurtRandomSystem(g)],
    );
  },
  // Beam Drone. One drone part, then low scrap. The Anti-Ship Fire Drone does not count.
  "s:rock-mine:beam": (g) => {
    // Wiki citations:
    // > "(Beam Drone) Use a drone to cut away the mine with a precision beam. [ Drone parts lost: 1 ] (Anti-Ship Fire Drone doesn't count)" — [[Rock live mine]]
    // > "Carefully guided from the bridge, your beam drone removes the mine's grappling arms and sends it drifting off into space, where you shoot at it until it detonates at a safe distance." — [[Rock live mine]]
    const n = affordStock(g, "s:rock-mine:beam", "parts");
    if (!ownsMineBeam(g) || n == null) return;
    takeStock(g, "parts", n);
    const spent = partsLine(n);
    log(g, spent);
    show(
      g,
      "Carefully guided from the bridge, your beam drone removes the mine's grappling arms and sends it drifting off into space, where you shoot at it until it detonates at a safe distance.",
      scrapOnly(g, "low"),
      [spent],
    );
  },

  // Engi smashed ships. "a random amount of resources with some scrap."
  // Rewards Stuff includes an unnamed bonus item. That grant stays unwired.
  "c:engi-smashed-ships:2": (g) => {
    if (!livingKin(g, "engi")) return;
    show(
      g,
      'Your Engi crewmember refuses. In a halting use of adjectives and nouns, followed by some animated holographic aids, the Engi explains the ships are using each other to, loosely translated, "achieve a union." For some reason, this consolidation of ship matter sounds embarrassing and personal. You elect to leave the two Engi ships to their "business." After questioning your Engi crewmember, however, you do manage to salvage what scrap parts you can from the perimeter, even though you feel slightly dirty for doing so.',
      rollSurrenderOffer(g, undefined, true),
    );
  },
  "c:lanius-ship-absorbing-rebel-base:2": (g) => {
    // Wiki citations:
    // > "(Lanius Crew) Try to use them to delay the Rebels." — [[Lanius ship absorbing rebel base]]
    // > "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    if (!livingKin(g, "anaerobic")) return;
    delayFleetOne(g);
    show(
      g,
      "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station.",
      rollStandard(g, "medium"),
      ["Rebel Fleet is delayed for 1 turn."],
    );
  },
  // Lanius ship absorbing jump beacon. Two ask results and no odds. INFERRED: equal.
  // Giving them 30 scrap grants an unnamed augmentation and stays off this card.
  "c:lanius-ship-absorbing-jump-beacon:0": (g) => {
    // Wiki citations:
    // > "After a long message the translator only able to spurt out \"critical... must... metal...\" You can only surmise they must be desperate for scrap." — [[Lanius ship absorbing jump beacon]]
    // > "You begin to message the ship but it quickly powers on its weapons defensively. It appears to be fully functional and looking for a fight!" — [[Lanius ship absorbing jump beacon]]
    if (
      weighted(g, [
        ["talk", 1],
        ["fight", 1],
      ] as const) === "fight"
    ) {
      fight(
        g,
        "You begin to message the ship but it quickly powers on its weapons defensively. It appears to be fully functional and looking for a fight!",
        "Lanius ship",
        "lanius-ship-absorbing-jump-beacon",
      );
      return;
    }
    card(
      g,
      'After a long message the translator only able to spurt out "critical... must... metal..." You can only surmise they must be desperate for scrap.',
      [{ id: "s:lanius-beacon-eater:leave", label: "Leave." }],
    );
  },
  "c:lanius-ship-absorbing-jump-beacon:1": (g) => {
    // Wiki citations:
    // > "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon." — [[Lanius ship absorbing jump beacon]]
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    // > "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!" — [[Lanius ship absorbing jump beacon]]
    beaconEaterLeave(g);
  },
  "s:lanius-beacon-eater:leave": (g) => {
    // Wiki citations:
    // > "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon." — [[Lanius ship absorbing jump beacon]]
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    // > "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!" — [[Lanius ship absorbing jump beacon]]
    beaconEaterLeave(g);
  },
  // Lanius crew. Decline does nothing. The 30 scrap, 6 missile, and 6 drone-part trades grant an unnamed augmentation and stay unwired.
  "c:lanius-ship-absorbing-jump-beacon:2": (g) => {
    // Wiki citations:
    // > "(Lanius Crew) Ask if they require assistance." — [[Lanius ship absorbing jump beacon]]
    // > "After a time you are told they were damaged and unable to repair their ship due to a lack of metal. They offer to exchange a piece of their ship's equipment for some scrap or other useful materials." — [[Lanius ship absorbing jump beacon]]
    // > "Decline." — [[Lanius ship absorbing jump beacon]]
    if (!livingKin(g, "anaerobic")) return;
    card(
      g,
      "After a time you are told they were damaged and unable to repair their ship due to a lack of metal. They offer to exchange a piece of their ship's equipment for some scrap or other useful materials.",
      [{ id: "s:lanius-beacon-eater:decline", label: "Decline." }],
    );
  },
  "s:lanius-beacon-eater:decline": (g) => {
    // Wiki citations:
    // > "Decline." — [[Lanius ship absorbing jump beacon]]
    // > "Nothing happens." — [[Lanius ship absorbing jump beacon]]
    show(g, "Nothing happens.");
  },
  // Lanius craftsmen. 45, 50, and 40 scrap. The item is not named: Rewards, "Augment" / "Weapon" / "Drone".
  // {{Blue Option|Lanius Crew|Offer to help in the process.}} is the same trades at a 10 scrap discount.
  "c:lanius-craftsmen:0": (g) => {
    // Wiki citations:
    // > "Inquire about the process." — [[Lanius craftsmen]]
    // > "They respond, \"We haven't the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something.\"" — [[Lanius craftsmen]]
    craftsmenMenu(g, false);
  },
  "s:lanius-craftsmen:aug": (g) => {
    // Wiki citations:
    // > "Give 45 scrap to craft an augmentation." — [[Lanius craftsmen]]
    // > "Scrap lost: 45" — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the augmentation. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content augmentation." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:aug",
      "augment",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the augmentation. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:weapon": (g) => {
    // Wiki citations:
    // > "Give 50 scrap to craft a weapon." — [[Lanius craftsmen]]
    // > "Scrap lost: 50" — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the weapon. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content weapon." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:weapon",
      "weapon",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the weapon. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:drone": (g) => {
    // Wiki citations:
    // > "Give 40 scrap to craft a drone schematic." — [[Lanius craftsmen]]
    // > "Scrap lost: 40" — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the schematic. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content drone schematic." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:drone",
      "drone",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the schematic. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:help": (g) => {
    // Wiki citations:
    // > "(Lanius Crew) Offer to help in the process." — [[Lanius craftsmen]]
    // > "Your crewmember offers to aid in the process to speed it along. They think it can be performed a bit more efficiently with the extra help and request less scrap." — [[Lanius craftsmen]]
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    if (!livingKin(g, "anaerobic")) return;
    craftsmenMenu(g, true);
  },
  "s:lanius-craftsmen:help:aug": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the augmentation. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content augmentation." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:aug",
      "augment",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the augmentation. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:help:weapon": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the weapon. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content weapon." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:weapon",
      "weapon",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the weapon. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:help:drone": (g) => {
    // Wiki citations:
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the schematic. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content drone schematic." — [[Lanius craftsmen]]
    craftItem(
      g,
      "s:lanius-craftsmen:help:drone",
      "drone",
      "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the schematic. You thank them and load it onto your ship.",
    );
  },
  "s:lanius-craftsmen:decline": (g) => {
    // Wiki citations:
    // > "Decline their offer." — [[Lanius craftsmen]]
    // > "You thank them for the information and prepare to jump." — [[Lanius craftsmen]]
    // > "Nothing happens." — [[Lanius craftsmen]]
    show(g, "You thank them for the information and prepare to jump.", undefined, [
      "Nothing happens.",
    ]);
  },
  "c:lanius-craftsmen:1": (g) => {
    // Wiki citations:
    // > "Leave them to their research." — [[Lanius craftsmen]]
    // > "While replicating their innate ability would have immeasurable consequences on commercial manufacturing, your mission has a much higher priority at the moment." — [[Lanius craftsmen]]
    // > "Nothing happens." — [[Lanius craftsmen]]
    show(
      g,
      "While replicating their innate ability would have immeasurable consequences on commercial manufacturing, your mission has a much higher priority at the moment.",
      undefined,
      ["Nothing happens."],
    );
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
    // > "As soon as the drone gets close, a Lanius in a type of spacewalk maneuvering unit grabs it and immediately starts breaking it down for metal. You prepare for a fight but they appear quite grateful for the act. They start to use the metal to repair key portions of their ship. From what you can understand from the translator it appears one of their crew wishes to join you." — [[Lanius ship absorbing jump beacon]]
    // > "You receive a Lanius crewmember." — [[Lanius ship absorbing jump beacon]]
    if (!ownsDrone(g, "SHIP_REPAIR")) return;
    const joined = joinCrew(g, "Lanius");
    show(
      g,
      "As soon as the drone gets close, a Lanius in a type of spacewalk maneuvering unit grabs it and immediately starts breaking it down for metal. You prepare for a fight but they appear quite grateful for the act. They start to use the metal to repair key portions of their ship. From what you can understand from the translator it appears one of their crew wishes to join you.",
      undefined,
      [
        joined
          ? "You receive a Lanius crewmember."
          : "There is no room aboard for the new crewmember.",
      ],
    );
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
        "The ship refuses all hails, even from one of its own kind. It appears to have gone completely rogue. Before you can react, it begins to target your ship. Prepare for a fight.",
        "Lanius ship",
        "lanius-ship-attacking-civilian-distress",
      );
      return;
    }
    card(
      g,
      "After a discussion that your translator fails to comprehend, the enemy ship powers down its weapons. You learn that your crewmember sucessfully reminded them of their treatise promising to leave the property of sentient aliens alone. If this is a widespread rule of this race, there appear to be many who disagree with it. You attempt to hail the civilian ship now that it's safe.",
      [{ id: "q:lanius-civilian:contact", label: "Contact the civilian ship." }],
    );
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
    card(
      g,
      "You land a small shuttle in an enormous field, whose only occupants are small, brightly colored, six-legged, horse-like animals. Could they be what your scans picked up?",
      [
        { id: "s:intelligent-ponies:talk", label: "Try to communicate peacefully." },
        { id: "s:intelligent-ponies:sell", label: "Bring some of the creatures on board to sell." },
        { id: "s:intelligent-ponies:leave", label: "Leave." },
      ],
    );
  },
  "s:intelligent-ponies:talk": (g) => {
    if (rand(g) < 0.5) {
      show(
        g,
        "None of your attempts to communicate seem to work: they just stare at you silently. As you prepare to leave, one of the creatures canters forward and forcefully nudges you away from the ship. He seems to want you to follow him. Eventually, the creatures guide you to an old Engi ship's crash site. Inside you are able to find and reactivate an Engi!",
        rollStandard(g, "low"),
        [gainCrew(g, "Engi")],
      );
    } else
      show(
        g,
        "You try to communicate in every possible way you can but they just stand there, silently judging you with their large, expressionless eyes. You prepare to leave.",
      );
  },
  "s:intelligent-ponies:sell": (g) => {
    if (rand(g) < 0.5) {
      show(
        g,
        "The seemingly docile creatures quickly turn violent when you show your hostile intentions. They stampede with terrifying force, trampling one of your crew before you have time to react. You fight your way back to the shuttle and prepare to jump.",
        undefined,
        [loseCrew(g)],
      );
    } else
      show(
        g,
        "The seemingly docile creatures quickly turn violent when you reveal your hostile intentions. Their well-organized stampede forces you to draw weapons and make a rushed and shambolic retreat to the shuttle.",
      );
  },
  "s:intelligent-ponies:leave": (g) =>
    show(g, "This isn't the time for exobiology. You head back to the ship."),
  "c:intelligent-ponies:1": (g) =>
    show(g, "You ignore the readings and prepare to move on.", undefined, ["Nothing happens."]),

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
    if (r === "rest")
      show(
        g,
        "You approach cautiously but you detect no danger. It appears to have been a small rest stop that was abandoned a while ago. You take what few supplies you can find.",
        scrapOnly(g, "low"),
      );
    else if (r === "hull")
      show(
        g,
        "Upon closer inspection it appears to have a large portion of its hull destroyed. You take what few supplies you can find.",
        scrapOnly(g, "low"),
      );
    else if (r === "pirates") {
      fight(
        g,
        "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile scanners pick up a previously undetected pirate ship moving in to attack!",
        "Pirate ship",
        "abandoned-station",
      );
      // "2 boarders beam aboard your ship" (surrender.ts humanBoarders, the same intruder kit).
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      log(
        g,
        "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile multiple warning signals go off on the bridge. The pirates have activated a remote planetary defense system and it's locking onto your ship!",
      );
      humanBoarders(g, 2, 4, "boarders beam aboard.");
      beginBoarding(g, true);
    } else if (r === "clone") {
      // {{Blue Option|Clonebay|Search for a surviving DNA bank.}} The button stays visible.
      card(
        g,
        "The station is in disarray. You find a cloning bay partially intact but nothing else seems to be functioning.",
        [
          { id: "s:abandoned-station:dna", label: "Search for a surviving DNA bank." },
          { id: "s:abandoned-station:scrap", label: "Scrap the machinery." },
        ],
      );
    } else
      show(
        g,
        "As you approach it becomes clear that the station is simply an empty shell. It has been stripped of useful materials long ago.",
      );
  },
  "s:abandoned-station:scrap": (g) =>
    show(g, "You take what you can and prepare to move on.", scrapOnly(g, "low")),
  // Clonebay DNA. DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The two calm sentences are the duplicate. INFERRED: equal inside that weight. The boarder's race is not named.
  "s:abandoned-station:dna": (g) => {
    if ((g.player.kits.clonebay?.level ?? 0) <= 0) return;
    const rebuilt =
      "While the cloning facilities are no longer functioning, you find someone was in queue to be cloned. You transfer their data to your Clonebay and after a time their body is rebuilt.";
    if (
      weighted(g, [
        ["calm", 2],
        ["crazed", 1],
      ] as const) === "crazed"
    ) {
      log(
        g,
        `${rebuilt} The clone emerges in a crazed frenzy and refuses to calm down. You have no choice but to fight.`,
      );
      humanBoarders(g, 1, 1, "boarder beams aboard.");
      beginBoarding(g);
      return;
    }
    const calm =
      rand(g) < 0.5
        ? `${rebuilt} The clone is extremely confused but calms down after you try to explain the situation. With no other options the clone offers to work on your ship for a time.`
        : `${rebuilt} The clone is extremely confused but seems to accept their new situation. With no other options the clone offers to work on your ship for a time.`;
    show(g, calm, undefined, [gainCrew(g)]);
  },
  // Abandoned station. "Stay near the Beacon." One printed result.
  "c:abandoned-station:1": (g) =>
    show(g, "You decide it's not worth the time to examine.", undefined, ["Nothing happens."]),

  // ---- Terraforming scan ----
  "c:terraforming-scan:0": (g) => {
    card(
      g,
      "\"Thank you! We need to scan this planet for life before we can begin terraforming, but our sensors can't get the necessary power to scan through this atmosphere. We've got a schedule to keep, any chance you could help?\"",
      [
        { id: "s:terraforming-scan:scan", label: "Attempt to scan the planet." },
        { id: "s:terraforming-scan:sensors", label: "Set sensors to maximum and scan." },
        {
          id: "s:terraforming-scan:zoltan",
          label: "Send your crewman to overcharge their systems.",
        },
      ],
    );
  },
  // Attempt to scan. One of the two printed results. INFERRED: equal. The modulate line is only this success.
  // Improved Sensors and a Zoltan go straight to Successful Scan and do not print it.
  "s:terraforming-scan:scan": (g) => {
    if (rand(g) < 0.5) {
      show(
        g,
        "It seems your sensors are no more powerful than the terraformer's. You apologize and continue on your way.",
      );
      return;
    }
    successfulScan(
      g,
      "You find if you modulate the feedback signal of your sensors to just the right frequency, you're able to get through the atmosphere and perform a complete scan!",
    );
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
    const n = rollPrice("terraforming-scan", "scan", (lo, hi) => between(g, [lo, hi]));
    const choices = [];
    if (n != null) {
      choices.push(
        {
          id: `s:terraforming-scan:bribe:${n}`,
          label: `Accept the bribe and leave. [+${n} scrap]`,
        },
        {
          id: `s:terraforming-scan:pay:${n}`,
          label: `Offer to pay them to at least delay until the mold can be studied. [${n} scrap]`,
        },
      );
    }
    choices.push({
      id: "s:terraforming-scan:demand",
      label: "Power your weapons and demand they leave at once.",
    });
    card(
      g,
      '"But our livelihood depends on this job! Who cares about some silly mold? We\'ll pay you to look the other way!"',
      choices,
    );
  },
  "s:terraforming-scan:demand": (g) =>
    show(
      g,
      "They shut off communications, but you can tell they have begun an evacuation procedure.",
    ),
  "s:terraforming-scan:leave": done,
  "c:terraforming-scan:1": (g) => show(g, '"We understand. Best of luck on your mission, sir!"'),

  // ---- Nebula lost ship ----
  "c:nebula-lost-ship:0": (g) => {
    const r = weighted(g, [
      ["found", 1],
      ["rebel", 1],
      ["none", 1],
    ] as const);
    if (r === "found")
      show(
        g,
        "You get lucky and find them floating not too deep into the nebula. Thrilled to be found by friendlies, they come on board and abandon their wrecked ship.",
        undefined,
        [gainCrew(g)],
      );
    else if (r === "rebel")
      fight(
        g,
        "While searching fruitlessly through the nebula, you stumble upon the rebel ship which the Federation loyalists were likely hiding from. You prepare for a fight.",
        "Rebel ship",
        "nebula-lost-ship",
      );
    else show(g, "Your search is hopeless. Your sensors can't pick up anything in the nebula.");
  },
  "c:nebula-lost-ship:1": done,
  // {{Blue Option|Teleporter}}. A crewmember and medium scrap.
  "c:nebula-lost-ship:2": (g) => {
    if ((g.player.kits.teleporter?.level ?? 0) <= 0) return;
    show(
      g,
      "You beam the Federation crew aboard. One gladly joins your crew, the rest wait to be dropped off at the next station.",
      scrapOnly(g, "medium"),
      [gainCrew(g)],
    );
  },
  // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
  "c:nebula-lost-ship:3": (g) => {
    if (!g.augments.includes("ADV_SCANNERS")) return;
    if (rand(g) < 0.5)
      show(
        g,
        "You follow the faint signatures and find them floating not too far away into the nebula. Thrilled to be found by friendlies, they come on board and abandon their wrecked ship.",
        undefined,
        [gainCrew(g)],
      );
    else
      show(
        g,
        "Your local radar flickers, periodically showing signs of a large object in the clouds nearby. However it's enough to get coordinates and you find the ship... an empty hull, long since stripped of functioning components.",
        scrapOnly(g, "medium"),
      );
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
      show(
        g,
        "Despite your caution, the lack of detection equipment allows debris to crash into your ship, damaging the hull. You salvage what you can and prepare to jump before anything worse happens.",
        rollSurrenderOffer(g, "high", true),
        ["Hull damage: 4.", breach],
      );
    } else if (r === "passenger") {
      show(
        g,
        "Within the ship graveyard you find one ship that seems relatively untouched. On board you find an unconscious passenger, and take them back to the ship. Once awake they offer to join your crew in thanks.",
        rollStandard(g, "low"),
        [gainCrew(g)],
      );
    } else if (r === "tether") {
      show(
        g,
        "While the crew is off the ship searching through the wrecks, two hulls crash into each other breaking the crew's tethers. You have no time to react as someone is knocked away, floating helplessly into the gaseous clouds...",
        rollStandard(g, "low"),
        [loseCrew(g)],
      );
    } else if (r === "schematic") {
      // A drone schematic with medium scrap. Rewards, "Drone": "A random drone schematic & T scrap."
      show(
        g,
        "Among the junk and scrap you find a salvageable drone schematic. You decide to quit while ahead and prepare to jump with your recent find.",
        scrapOnly(g, "medium"),
        [grantRandomItem(g, "drone")],
      );
    } else {
      show(
        g,
        "Most of the debris is hardly even usable as scrap. However, you eventually find an intact weapon that can be mounted on your ship.",
        weaponOffer(g, "medium"),
      );
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
      show(
        g,
        "Within the ship graveyard you find one ship that seems relatively untouched. On board you find an unconscious passenger and take them back to the ship. Once awake they offer to join your crew in thanks.",
        rollStandard(g, "low"),
        [gainCrew(g)],
      );
    } else if (r === "schematic") {
      show(
        g,
        "Among the junk and scrap you find a salvageable drone schematic. You decide to quit while ahead and prepare to jump with your recent find.",
        scrapOnly(g, "medium"),
        [grantRandomItem(g, "drone")],
      );
    } else if (r === "weapon") {
      show(
        g,
        "Most of the debris is hardly even usable as scrap. However, you eventually find an intact weapon that can be mounted on your ship.",
        weaponOffer(g, "low"),
      );
    } else {
      show(
        g,
        "Your pilot carefully explores the wrecks, but the storm has taken its toll. Any crew are long-since dead and the floating debris has been scorched beyond repair.",
        undefined,
        ["Nothing happens."],
      );
    }
  },

  // ---- Friendly ship out of fuel (the give id carries the amount; fillerChoose parses it) ----
  "c:friendly-ship-out-of-fuel:1": (g) =>
    show(g, '"We understand... Please send help our way if you meet anyone trustworthy."'),

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
      if (g.player.kits.clonebay)
        extras.unshift(
          "Your abandoned crewmember is waiting on the ship when you return, trying not to dwell on the fate of his previous incarnation.",
        );
      show(
        g,
        "As you investigate the ship, you are attacked by the now-cannibalistic crew! Driven mad by lack of food, they have turned to feeding on each other. As you fight your way off the ship, one of your crew falls to the crazed attackers, and you are forced to leave them behind or else lose your entire ship.",
        undefined,
        extras,
      );
    } else if (r === "freezer")
      show(
        g,
        "It looks as if the ship ran out of fuel, and the crew ran out of food not long after. Despite the grisly scene that remains, you find one surviving crewman locked in the freezer, almost perfectly preserved and apparently overlooked by the starving crew.",
        undefined,
        [gainCrew(g)],
      );
    else if (r === "supplies")
      show(
        g,
        "The ship is completely abandoned. It looks like it ran out of fuel... and the crew ran out of food not long after. Despite the grisly scene that remains, you are able to scavenge some supplies from the cargo hold.",
        resource(g, "missiles", "medium", "medium"),
      );
    else if (r === "boarders") {
      log(
        g,
        "As you approach the ship, the other ship's transporters suddenly power up, and your decks swarm with now-cannibalistic refugees! Driven mad by lack of food, they have turned to feeding on each other - and now your crew is next!",
      );
      humanBoarders(g, 2, 4, "human boarders beam aboard.");
      beginBoarding(g);
    } else
      show(
        g,
        "The ship is completely abandoned. There is no trace of the crew or any cargo. Mystified, you leave the ghost ship and continue on.",
      );
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
    // > "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!" — [[Boarders: Humans jammed sensors]]
    // > "3-5 human boarders beam aboard your ship, and your Sensors are disabled." — [[Boarders: Humans jammed sensors]]
    // > "If you don't counter the jam, the Sensors functionality is not restored till you jump to another beacon." — [[Boarders: Humans jammed sensors#Notes]]
    log(
      g,
      "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!",
    );
    shutPlayerSensors(g);
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Refueling station. "Buy 6 Fuel for 12 Scrap", "Buy 3 Fuel for 6 Scrap", "Buy 1 Fuel for 2 Scrap".
  "c:refueling-station:0": (g) => buyFuel(g, "c:refueling-station:0", 6),
  "c:refueling-station:1": (g) => buyFuel(g, "c:refueling-station:1", 3),
  "c:refueling-station:2": (g) => buyFuel(g, "c:refueling-station:2", 1),
  "c:refueling-station:3": done,

  // Asteroid mining colony. The launch "has no effect" and the non-blue choices return.
  "c:asteroid-mining-colony:0": (g) => {
    if (!miningMissile(g)) return;
    card(
      g,
      "\"While I appreciate your enthusiasm, we have certain protocols for the use of explosives around the workplace. Launching a military grade weapon into our mines isn't exactly what I'd call 'union-friendly'.\"",
      miningOffers(),
    );
  },
  "c:asteroid-mining-colony:1": (g) => giveMiners(g, "c:asteroid-mining-colony:1"),
  "c:asteroid-mining-colony:2": (g) => giveMiners(g, "c:asteroid-mining-colony:2"),
  "c:asteroid-mining-colony:3": (g) => {
    show(g, '"I understand. Good luck out there. We\'ll try to make do with what we have."');
  },

  // Improve reactor for supplies. The static agree button opens the priced card.
  "c:improve-reactor-for-supplies:0": (g) => {
    const ev = supplyCard(g, pageBySlug("improve-reactor-for-supplies")!);
    g.event = ev;
    g.phase = "event";
    g.paused = true;
  },
  "c:improve-reactor-for-supplies:1": (g) => {
    show(g, "You decide you need what supplies you have.");
  },

  // Giant alien spiders. Two crew results, no odds. INFERRED: equal.
  "c:giant-alien-spiders:0": (g) => {
    const r = weighted(g, [
      ["lose", 1],
      ["reward", 1],
    ] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(
        g,
        "Your crew boards the station, cautiously moving between corridors. Suddenly a man-sized arachnid bursts from a vent in the ceiling, followed by countless more. You fight your way back to the airlock and are forced to leave before accounting for all crew members. Not everybody made it back.",
        undefined,
        note ? [note] : [],
      );
      return;
    }
    show(
      g,
      "Your crew slowly creeps up on a cluster of the creatures from behind. Without warning, the giant arachnids turn and charge. However, your team stays in control and before long you've beaten them back. They are thrilled with your success and offer you a reward.",
      rollSurrenderOffer(g, "high", true),
    );
  },
  "c:giant-alien-spiders:1": (g) => {
    show(
      g,
      "You can't risk fighting some unknown alien on every backwater station you come across. You prepare to jump.",
    );
  },
  "c:giant-alien-spiders:2": (g) => {
    spiderDrone(
      g,
      "personnel",
      "You pull up alongside the station and release the drone through the airlock. Within a short time the majority of the creatures are dead, with only a little collateral damage. They express their most sincere gratitude.",
    );
  },
  "c:giant-alien-spiders:3": (g) => {
    spiderDrone(
      g,
      "BOARDER",
      "You launch the drone and it crashes through their hull, leaving a huge breach. You watch as the drone tears through the creatures while debris and dead bodies fly out of the breach. The owners of the station are less than effusive when they thank you, and offer only a meager payment. Maybe it's a good time to leave...",
    );
  },
  "c:giant-alien-spiders:4": (g) => {
    if (!ownsAntiBio(g)) return;
    show(
      g,
      'You instruct them to drop their shields and you are able to kill the creatures without damaging the station. "The monsters just started bursting into flame as we watched. What a terrifying weapon... Here, take this for your help, friend."',
      rollSurrenderOffer(g, "high", true),
    );
  },

  // Crushed pirate. Each pair of results has no odds. INFERRED: equal.
  "c:crushed-pirate:0": (g) => {
    const r = weighted(g, [
      ["shock", 1],
      ["free", 1],
    ] as const);
    if (r === "shock") {
      if (hurt(g, 2)) return;
      show(
        g,
        "You take a few careful shots but you expose a mineral patch in the rock that reacts violently with your weapon. A shockwave forces you back as debris pelts against your hull. When you regain control you find there is not much left of the ship.",
        scrapOnly(g, "low"),
        ["Hull damage: 2.", hurtRandomSystem(g, 2)],
      );
      return;
    }
    show(
      g,
      "You fire a few volleys into the rock and it starts to shudder and break apart. Without shields the pirate ship takes a beating but eventually pulls free. They thank you for your assistance.",
      rollStandard(g, "medium"),
    );
  },
  "c:crushed-pirate:1": (g) => {
    const r = weighted(g, [
      ["loot", 1],
      ["fight", 1],
    ] as const);
    if (r === "loot") {
      show(
        g,
        "You decide the pirate is not worth saving and fire a few volleys into their hull causing the ship to depressurize and break apart. You move in to loot the remains.",
        rollStandard(g, "medium"),
      );
      return;
    }
    // Fight a Pirate ship (default rewards). The PIRATE surrender and escape rows are that faction's plan.
    fight(
      g,
      "You decide the pirate is not worth saving and fire a few volleys into their hull. Before you can scrap the remains another pirate ship flashes on your radar. Perhaps they saw your deed, or perhaps they want to claim the spoils for themselves, but for whatever reason, they're charging weapons!",
      "Pirate ship",
      "crushed-pirate",
    );
  },
  "c:crushed-pirate:2": (g) => {
    if (!ownsCuttingBeam(g)) return;
    show(
      g,
      "You use your beam to make a few precision cuts in the asteroid. The ship gives a quick burst of thrust and the rock crumbles away. They thank you and offer some of the resources they have collected.",
      rollStandard(g, "medium"),
    );
  },
  "c:crushed-pirate:3": (g) => {
    if (!ownsBeamDrone(g)) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(
      g,
      rollStandard(g, "medium"),
      "You program the drone to work carefully around the trapped ship. In a short time it allows the ship to easily slip out of its cage. They thank you and offer some of the resources they have collected.",
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
      show(
        g,
        "Your crew tries to keep the crowds in line but the scene quickly turns ugly. Half-crazed with fear, the infected grab mining tools and push back at your crew, forcing them to retreat hastily. They barely get away without injury but the same can't be said for the colony's leaders. You quickly leave.",
      );
      return;
    }
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.clonebay)
      extras.push(
        "As your crewman is still alive and working towards a cure, it would be against Federation regulation to create a clone to continue with you on your journey.",
      );
    show(
      g,
      "With the visible threat of your weapons, the infected become subdued enough for you to set up a rudimentary quarantine. However before you leave, one of your crew presents signs of infection. You have no choice but to leave them on the station in the hopes that they discover a cure quickly. You leave before more crew succumb.",
      rollSurrenderOffer(g, "medium", true),
      extras,
    );
  },
  "c:unknown-disease-on-mining-colony:1": (g) => {
    show(
      g,
      "Unfortunately your mission is too important and you're not willing to risk your crew. You prepare to move on.",
    );
  },
  "c:unknown-disease-on-mining-colony:2": (g) => {
    if (!livingKin(g, "rock")) return;
    show(
      g,
      "It's unlikely the Rock's impressive immune system is susceptible to a human virus so you send it in. It is able to intimidate the workers long enough for the colony forces to set up a quarantine. Their leaders offer a reward and assure you they will try to find a cure as soon as possible.",
      rollSurrenderOffer(g, "medium", true),
    );
  },
  "c:unknown-disease-on-mining-colony:3": (g) => {
    if (!livingKin(g, "engi")) return;
    show(
      g,
      "With no fear of catching the disease, your Engi crewmember helps reassure and organize the infected humans. Calmed by its extensive knowledge of human physiology, the infected submit to the quarantine in the hopes that a cure can be found soon. The colony leaders offer a reward for helping to prevent an ugly incident.",
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
        "You send your crew into the station. Unfortunately as soon as they enter the fire breaches the station's fuel cell containment. You quickly try to dock and retrieve your crew but not before an unfortunate soul is lost in the inferno.",
        scrapOnly(g, "low"),
        note ? [note] : [],
      );
      return;
    }
    show(
      g,
      "Your crew valiantly keeps the fire at bay long enough to allow some of the scientists to escape, but it appears to be a losing battle. Before long you order the retreat. The few scientists they were able to save are distraught but grateful. You'll drop them off at the next station.",
      scrapOnly(g, "high"),
    );
  },
  "c:fire-on-research-station:1": (g) => {
    const r = weighted(g, [
      ["blast", 1],
      ["jones", 1],
    ] as const);
    if (r === "blast") {
      if (hurt(g, 4)) return;
      show(
        g,
        "You locate the highest concentration of life forms and bring the ship alongside the station. Before you can begin to offload the survivors a huge blast splits the station apart. Your ship is thrown away and some debris pierces your hull. You watch helplessly as the last of the survivors are consumed in the collapse of the station.",
        scrapOnly(g, "low"),
        ["Hull damage: 4.", hurtRandomSystem(g)],
      );
      return;
    }
    // The page names Dr. Jones and not a race. An unnamed race is that sector's crew list.
    const race = randomRace(g);
    const joined = joinCrew(g, race, "Dr. Jones");
    show(
      g,
      "You pull up alongside the station and cut through their hull. You are able to rescue a few survivors but many more are lost. One of the survivors offers to join your crew and you offload the rest on a nearby station.",
      scrapOnly(g, "low"),
      [joined ? "Dr. Jones joins you." : "There is no room aboard for Dr. Jones."],
    );
  },
  "c:fire-on-research-station:2": (g) => {
    show(
      g,
      "You coldly shut off communications and prepare to leave. Your crew seems upset but you assure them that nothing could have been done.",
    );
  },
  "c:fire-on-research-station:3": (g) => {
    if (!livingKin(g, "rock")) return;
    // An augmentation with high scrap. Rewards, "Augment": "A random augmentation & T scrap."
    show(
      g,
      "Your Rock soldier tears through the airlock directly into the fire. You've never seen someone that large move that fast. It disperses as much fire suppressant as possible into the heart of the blaze and eventually the fires start to die down. With most of the fire under control, the scientists are able to help secure the station. They offer you their sincere gratitude and a generous reward.",
      scrapOnly(g, "high"),
      [grantRandomItem(g, "augment")],
    );
  },
  "c:fire-on-research-station:4": (g) => {
    if (!ownsDrone(g, "REPAIR")) return;
    // A drone schematic with high scrap. Rewards, "Drone": "A random drone schematic & T scrap."
    show(
      g,
      "You send the repair drone in and it methodically puts out the fires. Once it has made some progress, the rest of your crew helps to secure the station. They offer you their sincere gratitude; the station would have surely been destroyed without your assistance. They transfer a small reward and an additional drone schematic.",
      scrapOnly(g, "high"),
      [grantRandomItem(g, "drone")],
    );
  },

  // Single life form on moon. Two scenes, no odds. INFERRED: equal.
  "c:single-life-form-on-moon:0": (g) => {
    const scene = weighted(g, [
      ["colony", 1],
      ["cave", 1],
    ] as const);
    if (scene === "colony") {
      card(
        g,
        "You find a colony that seems to have been recently attacked. Exploring the devastation, you find a lone survivor.",
        [
          { id: "s:moon:invite", label: "Invite him to join your crew." },
          {
            id: "s:moon:home",
            label: "Take him home to his family on a nearby planet in this system.",
          },
        ],
      );
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
      g.event?.body ?? eventDef("pirate-ship-distress-trap")?.texts?.[0] ?? "",
      "Pirate ship",
      "pirate-ship-distress-trap",
    );
  },

  // Malfunctioning defense system. Promise opens the options. Leave them alone does nothing.
  "c:malfunctioning-defense-system:0": (g) => {
    card(g, "You consider your options.", defenseOptions(g));
  },
  "c:malfunctioning-defense-system:1": (g) => {
    show(g, "You can't help them so you prepare to move on.", undefined, ["Nothing happens."]);
  },
  // Simply fire's other printed result (5 hull, 1 random system, 1 breached room) stays unwired.
  // The page prints no odds, so this button does not roll a weight between the two results.
  "c:malfunctioning-defense-system:2": (g) => {
    show(
      g,
      "You fire a few volleys from a distance and it is clear the defense system is no match for your weapons. However, the station does not seem happy with your 'solution'. You salvage what you can and jump before there is trouble.",
      rollStandard(g, "low"),
    );
  },
  // Any ion weapon, including Ion Bomb and Stun Bomb. Missile ammo is not required and not wasted.
  "c:malfunctioning-defense-system:3": (g) => {
    if (!ownsIon(g)) return;
    show(
      g,
      'You use your ion weaponry to disable the gun long enough for their repair crews to fix it. They message you, "I\'ve never seen a weapon like that before! Thanks for your help! Please, accept this reward."',
      rollStandard(g, "high"),
    );
  },
  "c:malfunctioning-defense-system:4": (g) => {
    if (cloakLevel(g) < 1) return;
    show(
      g,
      "You use your ship's Cloaking to try to prevent the defense system from getting a lock. However before you are able to safely disable the system your cloaking gives out and you are forced to destroy the satellite. No one was harmed but they don't seem happy with your solution.",
      rollStandard(g, "low"),
    );
  },
  "c:malfunctioning-defense-system:5": (g) => {
    if (cloakLevel(g) < 2) return;
    show(
      g,
      "You use your ships Cloaking to prevent the defense system from getting a lock. Once closer, you hasten to disable the system without damaging it. It was a sloppy job but they appreciate it and offer a reward.",
      rollStandard(g, "medium"),
    );
  },
  "c:malfunctioning-defense-system:6": (g) => {
    if (cloakLevel(g) < 3) return;
    show(
      g,
      "Your ship's Advanced Cloaking allows you to approach the defense system without an issue. Once closer, you are able to safely disable the system. They thank you for your help and offer a reward.",
      rollStandard(g, "high"),
    );
  },
  "c:malfunctioning-defense-system:7": (g) => {
    if (!livingKin(g, "engi")) return;
    show(
      g,
      "Your crew-member is able to remotely fix the glitch in the defense AI, allowing the repair crew to close in and finish the job. The station gives you its thanks along with a reward.",
      rollStandard(g, "high"),
    );
  },

  // Escape pod. Three pry results, no odds. INFERRED: equal.
  "c:escape-pod:0": (g) => {
    // Wiki citations:
    // > "Jettison the pod." — [[Escape pod]]
    // > "You send the pod back out the airlock. You're not stupid." — [[Escape pod]]
    // > "Nothing happens." — [[Escape pod]]
    show(g, "You send the pod back out the airlock. You're not stupid.");
  },
  "c:escape-pod:1": (g) => {
    // Wiki citations:
    // > "Pry it open." — [[Escape pod]]
    // > "The Mantis inside is FURIOUS. He cuts the closest person in half with a single swipe. Kill it before anyone else is hurt." — [[Escape pod]]
    // > "1 mantis boarder beams aboard your ship and you lose a crewmember." — [[Escape pod]]
    // > "The lost crewmember is revived." — [[Escape pod]]
    // > "The Mantis inside considers you a messenger from the god of mercy and demands to join your crew." — [[Escape pod]]
    // > "A man bursts out of the life-pod screaming and claws his way into a corner. A rare survivor of Mantis captivity. Once calm, the survivor offers to join your crew for a time." — [[Escape pod]]
    const r = weighted(g, [
      ["boarder", 1],
      ["mantis", 1],
      ["human", 1],
    ] as const);
    if (r === "boarder") {
      log(
        g,
        "The Mantis inside is FURIOUS. He cuts the closest person in half with a single swipe. Kill it before anyone else is hurt.",
      );
      const note = loseCrew(g);
      if (note) log(g, note);
      mantisBoarders(g, 1, 1);
      beginBoarding(g);
      return;
    }
    if (r === "mantis") {
      // The crewmember is not named. That grant stays unwired.
      show(
        g,
        "The Mantis inside considers you a messenger from the god of mercy and demands to join your crew.",
      );
      return;
    }
    // The crewmember is not named. That grant stays unwired.
    show(
      g,
      "A man bursts out of the life-pod screaming and claws his way into a corner. A rare survivor of Mantis captivity. Once calm, the survivor offers to join your crew for a time.",
    );
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
      show(g, "You thank them but prepare to move on.");
      return;
    }
    const o = list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
    const cost = o.lo === o.hi ? o.lo : between(g, [o.lo, o.hi]);
    card(g, tradeOfferText(o), [
      {
        id: `s:trade-scrap-for-upgrades:agree:${o.id}:${cost}`,
        label: `Agree to the exchange. [${cost} scrap]`,
      },
      { id: "s:trade-scrap-for-upgrades:decline", label: "Decline." },
    ]);
  },

  // Hacking blue option. "3-5 human boarders beam aboard your ship." Sensors flicker back on.
  // "If you counter the jam, the Hacking system is not disabled."
  "c:boarders-humans-jammed-sensors:1": (g) => {
    // Wiki citations:
    // > "(Hacking System) Counter the remote hacking." — [[Boarders: Humans jammed sensors]]
    // > "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders." — [[Boarders: Humans jammed sensors]]
    // > "3-5 human boarders beam aboard your ship." — [[Boarders: Humans jammed sensors]]
    // > "If you counter the jam, the Hacking system is not disabled." — [[Boarders: Humans jammed sensors#Notes]]
    if ((g.player.kits.hacking?.level ?? 0) <= 0) return;
    log(
      g,
      "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders.",
    );
    restorePlayerSensors(g);
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Slaver (hostile). "Draw straws and send a crew-member over to the slavers."
  // You lose a crewmember. Clone Bay [no effect]: the printed duplicate-law sentence, and they stay lost.
  // INFERRED: never the last living crewmember (loseCrew).
  "c:slaver-hostile:2": (g) => {
    const note = loseCrew(g, true);
    if (!note) return;
    const extras = [note];
    if (g.player.kits.clonebay)
      extras.push(
        "You briefly consider cloning a replacement, but decide to respect the Federation laws regarding simultaneous duplicates.",
      );
    show(g, "You lose a crewmember.", undefined, extras);
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
      show(
        g,
        "You divert all available power to your engines and flee. You caught them off-guard, but they seem to be gaining on you. Luckily you are able to stay out of range long enough to charge the FTL drive.",
      );
      return;
    }
    if (r === "pace") {
      show(
        g,
        "You fire up the engines and try to escape. Their slower ship is unable to keep pace; eventually it gives up and returns to the beacon to await an easier target.",
      );
      return;
    }
    fight(
      g,
      "You quickly fire up your engines and make a break for it. However, it seems to be in vain. They catch up to you effortlessly and power up their weapons.",
      "Pirate ship",
      "slaver-hostile",
    );
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
    log(g, `Fuel: -${n}.`);
    const r = weighted(g, [
      ["scrap", 2],
      ["weapon", 1],
      ["map", 1],
      ["reactor", 1],
    ] as const);
    if (r === "scrap")
      show(
        g,
        'You give them the fuel. "Thank you. Here, have this extra scrap as payment."',
        scrapOnly(g, "high"),
      );
    else if (r === "weapon") {
      const offer = weaponOffer(g, "low");
      offer.scrap = 0;
      offer.eligible = 0;
      show(
        g,
        "You give them the fuel. \"Thank the Gods. We can finally get out of here! We're jumping straight home so take this extra weapon. We won't need it, hopefully.\"",
        offer,
      );
    } else if (r === "map") {
      // "The current sector map is revealed." Not wired: this game has no map reveal.
      show(
        g,
        'You give them the fuel. "Thank you so much! We don\'t have much to offer, but have a look at the sector scans we took." Your map is updated.',
      );
    } else {
      // "If your ship reactor was already fully upgraded ... "Could not upgrade the Reactor, it's maxed""
      let note = "Could not upgrade the Reactor, it's maxed";
      if (upgradeCost("reactor", g.player.reactor) != null) {
        g.player.reactor += 1;
        // Manpower: an event offer to upgrade the reactor does not count against the achievement.
        noteReactorEvent(g);
        note = `Reactor ${g.player.reactor}.`;
      }
      show(
        g,
        'You give them the fuel. "Thank you. Perhaps as payment our engineer can try to optimize your ship\'s reactor output?"',
        undefined,
        [note],
      );
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
      show(
        g,
        "You let their team on board and after a short time they finish their work.",
        undefined,
        [`You lose ${cost} scrap and your ship reactor is upgraded.`],
      );
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
    show(
      g,
      "You let their team on board and after a short time they finish their work.",
      undefined,
      [line],
    );
    return true;
  }
  if (id === "s:trade-scrap-for-upgrades:decline") {
    show(g, "You thank them but prepare to move on.");
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
    show(
      g,
      "You make the exchange and their team comes on board to try to improve your reactor.",
      undefined,
      lines,
    );
    return true;
  }
  m = id.match(/^s:terraforming-scan:(bribe|pay):(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    if (!priced("terraforming-scan", "scan", n, "scrap")) return true;
    if (m[1] === "bribe") {
      // "You receive 15-25 add_scrap": the amount shown on the choice.
      show(g, "You accept the bribe and leave.", {
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
    show(
      g,
      "They see reason and accept the offer. The station scientists have a unique talent for life support units and offer to upgrade your oxygen system as an apology for their behaviour.",
      undefined,
      [`Scrap: -${n}.`, upgradeOxygen(g)],
    );
    return true;
  }
  if (id === "s:unknown-disease:continue") {
    show(
      g,
      '"Thank you so much! We don\'t have the funds to hire outside help and it would have taken our staff weeks to figure that out. Here, take this as payment!"',
      rollSurrenderOffer(g, "medium", true),
    );
    return true;
  }
  if (id === "s:unknown-disease:medbot") {
    if (!g.augments.includes("NANO_MEDBAY")) return true;
    // A weapon with high scrap. Rewards, "Weapon": "A random weapon & T scrap."
    show(
      g,
      "You reconfigure your ship's nano dispersal system. In a matter of minutes all of the workers are cured. The leaders can hardly believe what you have achieved. They offer you what they can as payment.",
      scrapOnly(g, "high"),
      [grantRandomItem(g, "weapon")],
    );
    return true;
  }
  const rock = id.match(/^s:rock-slug:(debt|upgrade):(\d+)$/);
  if (rock) return rockSlugPay(g, rock[1] === "debt" ? "debt" : "upgrade", Number(rock[2]));
  if (id === "s:rock-slug:decline") {
    // Wiki citations:
    // > "Decline the offer." — [[Rock and Slug standoff#Slug reward]]
    // > "You break communications and prepare to move on." — [[Rock and Slug standoff#Slug reward]]
    // > "Nothing happens." — [[Rock and Slug standoff#Slug reward]]
    show(g, "You break communications and prepare to move on.", undefined, ["Nothing happens."]);
    return true;
  }
  if (id === "s:rock-slug:leave") {
    // Wiki citations:
    // > "You have better things to attend to, leave them." — [[Rock and Slug standoff]]
    // > "Nothing happens." — [[Rock and Slug standoff]]
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:rock-slug:demand") {
    // Wiki citations:
    // > "Demand the Rock ship pay the agreed upon price." — [[Rock and Slug standoff]]
    // Agree, a Rock fight, or the explosion. No odds. INFERRED: equal.
    const r = weighted(g, [
      ["pay", 1],
      ["fight", 1],
      ["boom", 1],
    ] as const);
    if (r === "pay") {
      // Wiki citations:
      // > "With much grumbling, the Rock Captain agrees to pay the price." — [[Rock and Slug standoff]]
      slugCaptainGrateful(g, "With much grumbling, the Rock Captain agrees to pay the price.");
      return true;
    }
    if (r === "fight") {
      // Wiki citations:
      // > "Apparently the Rock Captain was more annoyed than you thought, they shut off all communication and turn on you, the 'slime balls' defender." — [[Rock and Slug standoff]]
      // > "Fight a Rock ship." — [[Rock and Slug standoff]]
      fight(
        g,
        "Apparently the Rock Captain was more annoyed than you thought, they shut off all communication and turn on you, the 'slime balls' defender.",
        "Rock ship",
        "rock-and-slug-standoff",
      );
      return true;
    }
    // Wiki citations:
    // > "A massive explosion emanates from the Rock Ship, shattering its hull and sending debris on an unavoidable collision course to your ship. Seems like that reactor upgrade was poorly done after all, and the Slugs took the opportunity to jump away." — [[Rock and Slug standoff]]
    // > "Your ship takes 5 hull damage, 1 damage to each of 2 random systems." — [[Rock and Slug standoff]]
    if (hurt(g, 5)) return true;
    const sys = twoSystems(g);
    show(
      g,
      "A massive explosion emanates from the Rock Ship, shattering its hull and sending debris on an unavoidable collision course to your ship. Seems like that reactor upgrade was poorly done after all, and the Slugs took the opportunity to jump away.",
      undefined,
      [sys].filter(Boolean),
    );
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
      card(
        g,
        'Once "convinced" to help he lowers the price and describes the weapon. However, he eventually comes to his senses and confusedly takes back his discount. He is clearly unsure why he offered it in the first place.',
        [{ id: "s:pirate-weapon:decline", label: "Decline." }],
      );
      return true;
    }
    fight(
      g,
      'Once "convinced" to help, he casually states that his offer was actually a lie and that they planned to attack your ship. By the time he returns to his senses you\'ve already prepared your ship to fight.',
      "Pirate ship",
      "pirate-ship-selling-weapon",
    );
    return true;
  }
  if (id === "s:pirate-weapon:decline") {
    show(g, "You thank him for his offer and prepare to move on.", undefined, ["Nothing happens."]);
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
      // Wiki citations:
      // > "After an hour of convincing, the Mantis finally calms down and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there." — [[Confused Mantis]]
      // > "Return him home." — [[Confused Mantis]]
      // The printed next step is Return him home, on this same page.
      card(
        g,
        "After an hour of convincing, the Mantis finally calms down and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there.",
        [{ id: "s:confused-mantis:return", label: "Return him home." }],
      );
      return true;
    }
    if (r === "lose") {
      // Wiki citations:
      // > "The cornered and frightened Mantis attacks as soon as you approach. One of your crew is eviscerated before the rest are able to stop him. The Engi apologize for your loss." — [[Confused Mantis]]
      // > "You lose a crewmember." — [[Confused Mantis]]
      // > "(Clone Bay) Your crew's clone is waiting when you return to the ship." — [[Confused Mantis]]
      // > "The lost crewmember is revived." — [[Confused Mantis]]
      const revived = !!g.player.kits.clonebay;
      const note = loseCrew(g);
      const extras = revived ? ["Your crew's clone is waiting when you return to the ship."] : [];
      if (note) extras.push(note);
      show(
        g,
        "The cornered and frightened Mantis attacks as soon as you approach. One of your crew is eviscerated before the rest are able to stop him. The Engi apologize for your loss.",
        undefined,
        extras,
      );
      return true;
    }
    // Wiki citations:
    // > "The cornered and frightened Mantis attacks as soon as you approach. You're able to subdue him and leave him at a Mantis colony in a neighboring system. They don't seem pleased or grateful at his return." — [[Confused Mantis]]
    // > "Nothing happens." — [[Confused Mantis]]
    show(
      g,
      "The cornered and frightened Mantis attacks as soon as you approach. You're able to subdue him and leave him at a Mantis colony in a neighboring system. They don't seem pleased or grateful at his return.",
      undefined,
      ["Nothing happens."],
    );
    return true;
  }
  if (id === "s:confused-mantis:human") {
    // Wiki citations:
    // > "The Mantis is grateful to see 'another human', and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there." — [[Confused Mantis]]
    // > "Return him home." — [[Confused Mantis]]
    if (!livingKin(g, "human")) return true;
    card(
      g,
      "The Mantis is grateful to see 'another human', and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there.",
      [{ id: "s:confused-mantis:return", label: "Return him home." }],
    );
    return true;
  }
  if (id === "s:confused-mantis:return") {
    mantisColony(g);
    return true;
  }
  if (id === "s:confused-mantis:leave") {
    // Wiki citations:
    // > "Leave them, a cornered Mantis is too dangerous." — [[Confused Mantis]]
    // > "Nothing happens." — [[Confused Mantis]]
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:confused-mantis:mantis") {
    // Wiki citations:
    // > "The Mantis is terrified at the sight of your crewmember. He immediately attacks his Engi rescuers, and your crewmember is forced to kill him. The Engi are grateful for your help and offer a small reward." — [[Confused Mantis]]
    // > "You receive low scrap with resources." — [[Confused Mantis]]
    if (!livingKin(g, "mantis")) return true;
    show(
      g,
      "The Mantis is terrified at the sight of your crewmember. He immediately attacks his Engi rescuers, and your crewmember is forced to kill him. The Engi are grateful for your help and offer a small reward.",
      rollStandard(g, "low"),
    );
    return true;
  }
  if (id === "s:confused-mantis:mind") {
    // Wiki citations:
    // > "The Mantis calms down and communicates thanks to the Engi and yourself for helping. He requests to be dropped off at a nearby planet, at the human colony where he was raised. They are grateful for his return and offer a reward." — [[Confused Mantis]]
    // > "You receive medium scrap with resources." — [[Confused Mantis]]
    if (!ownsMindControl(g)) return true;
    show(
      g,
      "The Mantis calms down and communicates thanks to the Engi and yourself for helping. He requests to be dropped off at a nearby planet, at the human colony where he was raised. They are grateful for his return and offer a reward.",
      rollStandard(g, "medium"),
    );
    return true;
  }
  if (id === "s:confused-mantis:hire") {
    // Wiki citations:
    // > "He graciously accepts, having always wanted to serve in the Federation." — [[Confused Mantis#Mining Colony]]
    // > "You receive a Mantis crewmember named Robert Smith." — [[Confused Mantis#Mining Colony]]
    show(g, "He graciously accepts, having always wanted to serve in the Federation.", undefined, [
      robertJoins(g),
    ]);
    return true;
  }
  if (id === "s:confused-mantis:engines") {
    // Wiki citations:
    // > "They are happy to take a look, and are able to offer some suggestions for improvements." — [[Confused Mantis#Mining Colony]]
    // > "Your ship engines are upgraded." — [[Confused Mantis#Mining Colony]]
    show(
      g,
      "They are happy to take a look, and are able to offer some suggestions for improvements.",
      undefined,
      [bumpEngines(g)],
    );
    return true;
  }
  return false;
}

const CHARLIE_POST: Record<(typeof MOON_SKILLS)[number], string> = {
  weapons:
    'He states that he was a weapons operator before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
  shields:
    'He states that he was a shield operator before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
  pilot:
    'He states that he was a pilot before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
  engines:
    'He states that he was an engineer before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
  combat:
    'He states that he was an infantryman before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
  repair:
    'He states that he was a shipwright before being stranded. He happily offers his services for a time in exchange for "getting off that rock".',
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
      show(
        g,
        "The family apparently owns one of the most valuable mining enterprises in the sector. For the safe return of his son, the patron of the family offers you a substantial reward.",
        scrapOnly(g, "high"),
      );
      return true;
    }
    if (r === "medium") {
      show(
        g,
        "The survivor's family is of modest means, yet they manage to offer you a reward for your virtuous deed.",
        scrapOnly(g, "medium"),
      );
      return true;
    }
    const before = g.player.hull;
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    const got = g.player.hull - before;
    show(
      g,
      "Overjoyed with the return of their son, the family of the survivor arranges to repair your ship's hull as compensation.",
      undefined,
      [`Your ship receives ${got} repairs.`],
    );
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
      show(
        g,
        "Once back in orbit, the man turns increasingly violent. Eventually he turns on your crew and manages to kill one before you can subdue him.",
        undefined,
        note ? [note] : [],
      );
      return true;
    }
    if (r === "charlie") {
      show(
        g,
        "He seems to improve immensely upon getting back to the ship. It might take a while for him to truly be well again, but until them he seems happy to serve as a member of your crew.",
        undefined,
        [charlieJoins(g)],
      );
      return true;
    }
    if (r === "blast") {
      if (hurt(g, 5)) return true;
      show(
        g,
        'Being back in space terrifies him. He goes mad and nearly blows a hole in the side of your ship with a makeshift explosive in an attempt to "escape this metal prison." He dies in the explosion.',
        undefined,
        ["Hull damage: 5.", hurtRandomSystem(g)],
      );
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
        ? 'Once inside your medbay, the system is able to restore his body and undo some of the damage to his brain. Once awake he states, "I feel almost like my old self again... Thank you. Please let me serve on your ship."'
        : 'Your improved medbay was able to resuscitate him. After a short time he recovers greatly saying, "I really thought I was a goner... I haven\'t eaten for days. Would you mind if I stayed on your ship?"';
    show(g, text, undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:medbay3") {
    if (medbayLevel(g) < 3) return true;
    show(
      g,
      'Once inside your advanced medbay, the system is able to identify and minimize the trauma associated with being alone for so long. Once awake he states, "I don\'t know how to repay you, I feel 10 years younger... Let me serve on your ship."',
      undefined,
      [charlieJoins(g, moonRanks())],
    );
    return true;
  }
  if (id === "s:moon:collapse-clone") {
    if (clonebayLevel(g) < 2) return true;
    show(
      g,
      'Your quick reaction allowed your Clonebay to revive him after he passes. After he steps out of the machine he states, "How am I alive? Wasn\'t I just dying on some shuttle? Technology sure has changed."',
      undefined,
      [charlieJoins(g)],
    );
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
      show(
        g,
        "You bring the ship closer and the Slug, after a pause, says that the person is stable and with good intentions. You offer a position in your crew and it is graciously accepted.",
      );
      return true;
    }
    show(
      g,
      'You bring the ship closer. The Slug enters a trance-like state for 1 to 2 seconds, then quickly snaps out of it. He states, "This person is clearly unstable. It is best we leave them alone."',
    );
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
  // > "(Lanius Crew) Offer to help in the process." — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Give 45 scrap to craft an augmentation." — [[Lanius craftsmen]]
  // > "Scrap lost: 45" — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Give 50 scrap to craft a weapon." — [[Lanius craftsmen]]
  // > "Scrap lost: 50" — [[Lanius craftsmen]]
  // Wiki citations:
  // > "Give 40 scrap to craft a drone schematic." — [[Lanius craftsmen]]
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
  return ownedLock(g, id, FILLER_LOCKS);
}

/** The sector's "Empty beacon (...)" card ("Nothing happens."), for sim.ts eventFor's last resort. */
export function emptyEvent(g: Game): GameEvent {
  return emptyCard(g, emptyPageFor(g.sectorName));
}
