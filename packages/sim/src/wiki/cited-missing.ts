/**
 * Location pages that were still only a title or a plain hostile ship.
 * Sibling results with no printed odds roll equally (INFERRED). {{DuplicateEvent|N}} counts N times.
 * An unnamed weapon, drone schematic, or augmentation is grantRandomItem. A crystal weapon is an even
 * draw of the crystal guns already in the game. Out-of-fuel pages name no sector; they join the wait roll only.
 */
import { allEvents, eventDef, openingLine, storedId } from "@stl/pack";
import type { EventChoice } from "@stl/pack";
import { locksOwned, ownedLock } from "./choice-locks.ts";
import { priced, rollPrice } from "./event-prices.ts";
import { rollBand } from "./event-bands.ts";
import { rollFuel } from "./fuel-gifts.ts";
import { affordStock, takeStock } from "./stock-spend.ts";
import { adjustScrap } from "../extras/index.ts";
import { beginBoarding, hurtSystem, openStoreHere } from "../sim.ts";
import type { Beacon, Game, GameEvent, SysId } from "../types.ts";
import { grantRandomItem, weaponLine } from "../rules/bonus-item.ts";
import { CRYSTAL_SECTOR_WEAPONS } from "./cited-stores.ts";
import {
  between,
  crystalBoarders,
  humanBoarders,
  pageCard,
  pageResult,
  payOffer,
  rollStandard,
  resourceBand,
  rollSurrenderOffer,
  scrapBand,
  slugBoarders,
  type SurrenderOffer,
  type SurrenderTier,
} from "./surrender.ts";
import { queueSfx } from "../sfx-queue.ts";
import { eventText } from "../event-text.ts";
import { continueLabel } from "../interface-copy.ts";

type Ctx = {
  g: Game;
  resolve: () => void;
  fight: (tier: string, asteroid?: boolean, slug?: string) => void;
  scrap: (n: number) => void;
  note: (text: string) => void;
  irand: (n: number) => number;
};

const NEBULA_ON_ARRIVAL = new Set([
  "SLUG_DISTRESS_TRICK",
  "NEBULA_SLUG_HULLFIX",
  "NEBULA_SLUG_FAKE_STORE",
  "ROCK_SLUG_ARGUMENT_NEBULA",
]);

type PayKind = "parts" | "missiles" | "scrap";

let missingSlugs: Set<string> | null = null;
let missingStamp = "";

function visitMissing(
  choices: readonly { id: string; owner?: string; choices?: readonly EventChoice[] }[] | undefined,
  slugs: Set<string>,
) {
  for (const choice of choices ?? []) {
    if (choice.owner === "missing") {
      const slug = slugOf(choice.id);
      if (slug) slugs.add(slug);
    }
    visitMissing(choice.choices, slugs);
  }
}

/** Authoring slugs whose buttons this file handles. Read from the loaded pack. */
function ownsMissing(slug: string): boolean {
  const events = allEvents();
  const stamp = events.map((ev) => ev.id).join("\0");
  if (!missingSlugs || missingStamp !== stamp) {
    const slugs = new Set<string>();
    for (const ev of events) {
      visitMissing(ev.choices, slugs);
      for (const card of ev.cards ?? []) visitMissing(card.choices, slugs);
    }
    missingSlugs = slugs;
    missingStamp = stamp;
  }
  return missingSlugs.has(slug);
}

function slugOf(id: string): string | null {
  return /^c:([^:]+):/.exec(id)?.[1] ?? null;
}

function tail(id: string): string {
  const slug = slugOf(id);
  return slug ? id.slice(`c:${slug}:`.length) : "";
}

function span(ctx: Ctx, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return lo + ctx.irand(hi - lo + 1);
}

/** Inclusive weights. A {{DuplicateEvent|N}} entry is weight N. */
function pickW(ctx: Ctx, weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = ctx.irand(total);
  for (let i = 0; i < weights.length; i++) {
    if (roll < weights[i]!) return i;
    roll -= weights[i]!;
  }
  return weights.length - 1;
}

function done(g: Game, text: string, offer?: SurrenderOffer) {
  pageResult(g, text, offer);
  g.paused = true;
}

function card(g: Game, body: string, choices: { id: string; label: string }[]) {
  pageCard(g, body, choices);
  g.paused = true;
}

function scrapOnly(g: Game, tier: SurrenderTier): SurrenderOffer {
  const eligible = between(g, scrapBand(g, tier));
  return { tier, scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 };
}

function fuelOnly(g: Game, tier: SurrenderTier): SurrenderOffer {
  return {
    tier,
    scrap: 0,
    eligible: 0,
    fuel: between(g, resourceBand("fuel", tier)),
    missiles: 0,
    parts: 0,
  };
}

/** Rewards, "Fuel": T fuel and T scrap. No bonus item. */
function fuelAndScrap(g: Game, tier: SurrenderTier): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  offer.fuel = between(g, resourceBand("fuel", tier));
  return offer;
}

function repairs(n: number): SurrenderOffer {
  return { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0, repairs: n };
}

/**
 * "You lose a crewmember." Clone Bay revives unless the page says it has no effect.
 * INFERRED: the last living crewmember stays, matching the other event pages.
 */
function loseCrew(ctx: Ctx, noClone: boolean, quiet = false): string {
  const g = ctx.g;
  if (!noClone && g.player.kits.clonebay) return "Clone Bay: crew revived.";
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[ctx.irand(mine.length)]!;
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  const line = `Crew lost: ${lost.name}.`;
  // Drifting debris prints the Clone Bay's silence. Buried leave prints no such line.
  // Wiki citations:
  // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
  if (quiet && g.player.kits.clonebay)
    return `${line} ${eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_c2_c0_clone")}`;
  return line;
}

function fleetJump(ctx: Ctx) {
  ctx.g.fleet += 1;
  ctx.note("Rebel fleet speed x2 for 1 jump.");
}

function crystalGun(ctx: Ctx): string {
  const id = CRYSTAL_SECTOR_WEAPONS[ctx.irand(CRYSTAL_SECTOR_WEAPONS.length)]!;
  return weaponLine(ctx.g, id);
}

/** Crystalline cache, detonate: "Bugged: no fuel loss if the reward includes fuel (2/3 chance)." */
export function cacheFuelLoss(current: number, rewardFuel: number): number {
  if (rewardFuel > 0) return 0;
  return Math.min(100, Math.max(0, current));
}

function stockOf(g: Game, kind: PayKind): number {
  if (kind === "scrap") return g.scrap;
  if (kind === "missiles") return g.missiles;
  return g.player.parts;
}

function spendKind(g: Game, kind: PayKind, n: number) {
  if (kind === "scrap") g.scrap -= n;
  else if (kind === "missiles") g.missiles -= n;
  else g.player.parts -= n;
}

function payWord(kind: PayKind): string {
  if (kind === "parts") return "drone parts";
  if (kind === "missiles") return "missiles";
  return "scrap";
}

const PAY_LINE = { scrap: "Scrap", missiles: "Missiles", parts: "Drone parts" } as const;

function offerLine(fuel: number, kind: PayKind, amt: number): string {
  return `Fuel: ${fuel}. ${PAY_LINE[kind]}: -${amt}.`;
}

/** Fuel-trader rows of one band. The draw stays between: the row, then the fuel, then the payment. */
function fuelRows(id: string, band: "high" | "pt2") {
  const rows = [];
  for (const row of eventDef(storedId(id))?.offers ?? [])
    if (row.k === "fuel" && row.band === band) rows.push(row);
  return rows;
}

function rollTrade(
  g: Game,
  table: ReturnType<typeof fuelRows>,
): { fuel: number; kind: PayKind; amt: number } {
  const rowN = table[between(g, [0, table.length - 1])]!;
  return { fuel: between(g, rowN.fuel), kind: rowN.pay, amt: between(g, rowN.amt) };
}

const TRADE_ID = /^(buy|pt2|high2):(\d+):(parts|missiles|scrap):(\d+)$/;

function showTrader(g: Game, slug: string, intro: string) {
  const offer = rollTrade(g, fuelRows(slug, "high"));
  card(g, `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`, [
    {
      id: `c:${slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`,
      label: eventText("event_FUEL_APPROACH_ACCEPT_LIST_2_c1_choice"),
    },
    { id: `c:${slug}:decline`, label: eventText("event_FUEL_APPROACH_ACCEPT_LIST_2_c2_choice") },
  ]);
}

function showPt2(ctx: Ctx, slug: string) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    done(ctx.g, eventText("event_FUEL_TRADER_PT2_3_text"));
    return;
  }
  const offer = rollTrade(ctx.g, fuelRows(slug, branch === 0 ? "pt2" : "high"));
  const kind = branch === 0 ? "pt2" : "high2";
  const intro =
    branch === 0
      ? eventText("event_FUEL_TRADER_PT2_1_text")
      : eventText("event_FUEL_TRADER_PT2_2_text");
  card(ctx.g, `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`, [
    {
      id: `c:${slug}:${kind}:${offer.fuel}:${offer.kind}:${offer.amt}`,
      label: eventText("event_FUEL_TRADER_PT2_1_c1_choice"),
    },
    {
      id: branch === 0 ? `c:${slug}:pity` : `c:${slug}:walk`,
      label:
        branch === 0
          ? eventText("event_FUEL_TRADER_PT2_1_c2_choice")
          : eventText("event_FUEL_TRADER_PT2_2_c2_choice"),
    },
  ]);
}

function payTrade(ctx: Ctx, fuel: number, kind: PayKind, amt: number): boolean {
  if (stockOf(ctx.g, kind) < amt) return false;
  spendKind(ctx.g, kind, amt);
  ctx.g.fuel += fuel;
  done(ctx.g, offerLine(fuel, kind, amt));
  return true;
}

function defeat(g: Game) {
  g.phase = "defeat";
  g.outcome = g.training ? "tutorial" : "hull";
  g.paused = true;
  g.event = null;
}

function hurtRandom(ctx: Ctx): string {
  const g = ctx.g;
  const ids = (Object.keys(g.player.systems) as SysId[]).filter(
    (id) => (g.player.systems[id]?.level ?? 0) > 0,
  );
  if (!ids.length) return "";
  const id = ids[ctx.irand(ids.length)]!;
  hurtSystem(g.player, id, 1);
  const room = g.player.rooms.find((r) => r.system === id);
  return `System damage: ${room?.title ?? id}.`;
}

function investigate(ctx: Ctx) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    card(ctx.g, eventText("event_CRYSTAL_CACHE_LIST_3_text"), [
      { id: "c:crystalline-cache:pull", label: eventText("event_CRYSTAL_CACHE_LIST_3_c1_choice") },
      {
        id: "c:crystalline-cache:detonate",
        label: eventText("event_CRYSTAL_CACHE_LIST_3_c2_choice"),
      },
      {
        id: "c:crystalline-cache:teleport",
        label: eventText("event_CRYSTAL_CACHE_LIST_3_c3_choice"),
      },
      {
        id: "c:crystalline-cache:engines",
        label: eventText("event_CRYSTAL_CACHE_LIST_3_c4_choice"),
      },
    ]);
    return;
  }
  const gun = crystalGun(ctx);
  const offer = rollSurrenderOffer(ctx.g, "low", true);
  if (branch === 1) {
    const paid = payOffer(ctx.g, offer, true);
    ctx.note(gun);
    if (offer.scrap) ctx.note(`Scrap: ${offer.scrap}.`);
    if (offer.fuel) ctx.note(`Fuel: ${offer.fuel}.`);
    if (offer.missiles) ctx.note(`Missiles: ${offer.missiles}.`);
    if (offer.parts) ctx.note(`Drone parts: ${offer.parts}.`);
    for (const line of paid.extras) ctx.note(line);
    crystalBoarders(ctx.g, 2, 3);
    beginBoarding(ctx.g);
    return;
  }
  done(ctx.g, `${eventText("event_CRYSTAL_CACHE_LIST_1_text")}\n\n${gun}`, offer);
}

function digCard(ctx: Ctx, second: boolean) {
  const slug = "crystalline-men-buried";
  card(
    ctx.g,
    second
      ? eventText("event_CRYSTAL_HELP_DIG_c1_c3_text")
      : eventText("event_CRYSTAL_HELP_DIG_c1_text"),
    [
      {
        id: `c:${slug}:${second ? "leave2" : "leave"}`,
        label: eventText("event_CRYSTAL_HELP_DIG_c1_c1_choice"),
      },
      {
        id: `c:${slug}:${second ? "pull2" : "pull"}`,
        label: eventText("event_CRYSTAL_HELP_DIG_c1_c2_choice"),
      },
      {
        id: `c:${slug}:${second ? "wait2" : "wait"}`,
        label: eventText("event_CRYSTAL_HELP_DIG_c1_c3_choice"),
      },
    ],
  );
}

function crystalFight(ctx: Ctx) {
  ctx.note(eventText("event_CRYSTAL_HELP_DIG_c1_c2_text"));
  ctx.fight("Crystal ship");
}

function demandCard(ctx: Ctx, repairsN: number) {
  const g = ctx.g;
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + repairsN);
  ctx.note(`Hull repairs: ${repairsN}.`);
  card(
    g,
    repairsN === 10
      ? eventText("event_NEBULA_SLUG_HULLFIX_RESULT1_1_text")
      : eventText("event_NEBULA_SLUG_HULLFIX_RESULT1_2_text"),
    [
      {
        id: "c:slug-repair-station:demand",
        label: eventText("event_NEBULA_SLUG_HULLFIX_RESULT1_1_c1_choice"),
      },
    ],
  );
}

function engineFight(ctx: Ctx) {
  ctx.note(eventText("event_NEBULA_SLUG_HULLFIX_RESULT1_3_text"));
  ctx.fight("Slug ship", undefined, "slug-repair-engines");
}

function halfFight(ctx: Ctx) {
  ctx.note(eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_2_c2_text"));
  ctx.fight("Slug ship", undefined, "slug-repair-half");
}

function sealFight(ctx: Ctx, boarders: number) {
  ctx.fight("Slug ship", undefined, "slug-store-weapons");
  slugBoarders(ctx.g, boarders, boarders);
}

function slugFight(ctx: Ctx, boarders: number) {
  ctx.fight("Slug ship");
  if (boarders > 0) slugBoarders(ctx.g, boarders, boarders);
}

function pirateFight(ctx: Ctx, slug: string, boarders = false) {
  // 80s from the start, including on the last fuel. The 90s branch stays a Pirate ship so last fuel is the timer.
  const tier = slug === "no-fuel-prepare-dock-80" ? "PIRATE_DOCK_80" : "Pirate ship";
  ctx.fight(tier, undefined, slug);
  if (boarders) humanBoarders(ctx.g, 2, 3, "human boarders beam aboard your ship.");
}

export function missingAutoFight(flag: string): boolean {
  return flag === "BOSS_SCOUT";
}

export function missingOwns(id: string): boolean {
  const slug = slugOf(id);
  return slug != null && ownsMissing(slug);
}

/** Last-stand hulls. A repeated name stays repeated. The draw stays between, before the opening sentence. */
function hullList(id: string): string[] {
  const rows = [];
  for (const row of eventDef(storedId(id))?.rolls ?? []) if (row.k === "hull") rows.push(row.id);
  return rows;
}

function rollHull(g: Game, id: string): string {
  const rows = hullList(id);
  return rows[between(g, [0, rows.length - 1])]!;
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

export function missingCard(
  g: Game,
  b: Beacon,
  ev: { slug: string; dest: string },
): GameEvent | null {
  if (NEBULA_ON_ARRIVAL.has(ev.slug)) b.kind = "nebula";
  if (ev.slug === "ENGI_GIFT") {
    return {
      title: ev.dest,
      body: opening(g, "ENGI_GIFT"),
      choices: [
        {
          id: "c:free-scrap-with-resources-engi:take",
          label: continueLabel(),
        },
      ],
    };
  }
  if (ev.slug === "BOSS_SCOUT") {
    const hull = rollHull(g, "BOSS_SCOUT");
    return {
      title: ev.dest,
      body: opening(g, "BOSS_SCOUT"),
      choices: [{ id: `c:fight-in-last-stand:go:${hull}`, label: continueLabel() }],
    };
  }
  if (ev.slug === "FUEL_ON_SLUG_CHUCKLE") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Slug fuel trader]]
    // > "Pay 15 scrap for 5 fuel. [ Scrap lost: 15 ]" — [[No fuel: Slug fuel trader]]
    return {
      title: ev.dest,
      body: eventText("event_FUEL_ON_SLUG_CHUCKLE_text"),
      choices: [
        {
          id: "c:no-fuel-slug-fuel-trader:pay",
          label: eventText("event_FUEL_ON_SLUG_CHUCKLE_c1_choice"),
        },
        {
          id: "c:no-fuel-slug-fuel-trader:ignore",
          label: eventText("event_FUEL_ON_SLUG_CHUCKLE_c2_choice"),
        },
        {
          id: "c:no-fuel-slug-fuel-trader:slug",
          label: eventText("event_FUEL_ON_SLUG_CHUCKLE_c3_choice"),
        },
      ],
    };
  }
  if (ev.slug === "FUEL_OFF_ROCK_WRECK") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: drifting debris]]
    return {
      title: ev.dest,
      body: eventText("event_FUEL_OFF_ROCK_WRECK_text"),
      choices: [
        {
          id: "c:no-fuel-drifting-debris:send",
          label: eventText("event_FUEL_OFF_ROCK_WRECK_c1_choice"),
        },
        {
          id: "c:no-fuel-drifting-debris:drift",
          label: eventText("event_FUEL_OFF_ROCK_WRECK_c2_choice"),
        },
        {
          id: "c:no-fuel-drifting-debris:scan",
          label: eventText("event_FUEL_OFF_ROCK_WRECK_c3_choice"),
        },
      ],
    };
  }
  if (ev.slug === "FUEL_TRADER" || ev.slug === "FUEL_TRADER_DISTRESS") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: fuel trader (distress off)]]
    // > "Gladly trade. [ the actual trade offer is shown prior to the exchange ]" — [[No fuel: fuel trader (distress off)]]
    // > "This random event occurs." — [[No fuel: fuel trader (distress on)]]
    // > "Gladly trade. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: fuel trader (distress on)]]
    const slug =
      ev.slug === "FUEL_TRADER_DISTRESS"
        ? "no-fuel-fuel-trader-distress-on"
        : "no-fuel-fuel-trader-distress-off";
    const intro = opening(g, ev.slug);
    const offer = rollTrade(g, fuelRows(ev.slug, "high"));
    return {
      title: ev.dest,
      body: `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`,
      choices: [
        {
          id: `c:${slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`,
          label: eventText(`event_${ev.slug}_c1_choice`),
        },
        { id: `c:${slug}:decline`, label: eventText(`event_${ev.slug}_c2_choice`) },
      ],
    };
  }
  if (ev.slug === "FUEL_APPROACH") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: prepare to dock]]
    // > "Request they keep their distance." — [[No fuel: prepare to dock]]
    // > "(Advanced Sensors) Run a detailed scan with your sensors before responding. (Requires level 3 Sensors)" — [[No fuel: prepare to dock]]
    return {
      title: ev.dest,
      body: eventText("event_FUEL_APPROACH_text"),
      choices: [
        {
          id: "c:no-fuel-prepare-to-dock:accept",
          label: eventText("event_FUEL_APPROACH_c1_choice"),
        },
        {
          id: "c:no-fuel-prepare-to-dock:distance",
          label: eventText("event_FUEL_APPROACH_c2_choice"),
        },
        {
          id: "c:no-fuel-prepare-to-dock:sensors",
          label: eventText("event_FUEL_APPROACH_c3_choice"),
        },
        {
          id: "c:no-fuel-prepare-to-dock:scanners",
          label: eventText("event_FUEL_APPROACH_c4_choice"),
        },
      ],
    };
  }
  if (ev.slug === "NO_FUEL_REFUGEE") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: refugee trading]]
    // > "This event varies, and could be any of the following:" — [[No fuel: refugee trading]]
    // > "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you." — [[No fuel: refugee trading]]
    // > "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, it's hull looks damaged - it is in bad need of scrap and is willing to trade fuel for it." — [[No fuel: refugee trading]]
    // > "Trade some scrap for fuel. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: refugee trading]]
    // > "(Engi Crew) Negotiate a better trade." — [[No fuel: refugee trading]]
    // > "Refuse their offer." — [[No fuel: refugee trading]]
    // > "The helpless refugees make easy targets. Attack them." — [[No fuel: refugee trading]]
    // > "A refugee ship fleeing the Rebel advance enters the system, having picked up your distress beacon. While it doesn't have much fuel to spare, it is bad need of armaments and is willing to trade for them." — [[No fuel: refugee trading]]
    // > "Offer some missiles for fuel." — [[No fuel: refugee trading]]
    const cards = eventDef(ev.slug)?.cards ?? [];
    if (cards.length === 0) return null;
    const card = cards[between(g, [0, cards.length - 1])]!;
    return {
      title: ev.dest,
      body: card.body,
      choices: card.choices.map((choice) => ({ id: choice.id, label: choice.label })),
    };
  }
  return null;
}

export function missingDisabled(g: Game, id: string): string | null {
  const slug = slugOf(id);
  if (!slug || !ownsMissing(slug)) return null;
  const name = tail(id);
  const locked = ownedLock(g, id, locksOwned("missing"));
  if (locked) return locked;
  const trade = TRADE_ID.exec(name);
  if (trade && stockOf(g, trade[3] as PayKind) < Number(trade[4])) {
    return `Need ${Number(trade[4])} ${payWord(trade[3] as PayKind)}`;
  }
  const ransom = /^pay:(\d+)$/.exec(name);
  if (ransom && slug === "no-fuel-drifting-debris" && g.scrap < Number(ransom[1])) {
    return `Need ${Number(ransom[1])} ${"scrap"}`;
  }
  return null;
}

function payFifteen(ctx: Ctx, id: string, theft: boolean): boolean {
  // Wiki citations:
  // > "You receive Fuel gained: 5." — [[No fuel: Slug fuel trader]]
  // > "Continue..." — [[No fuel: Slug fuel trader]]
  const cost = affordStock(ctx.g, id, "scrap");
  if (cost == null) return false;
  takeStock(ctx.g, "scrap", cost);
  ctx.g.fuel += rollFuel(id, (lo, hi) => span(ctx, lo, hi));
  const text = eventText("event_FUEL_ON_SLUG_CHUCKLE_LIST_1_text");
  if (!theft) {
    done(ctx.g, text);
    return true;
  }
  card(ctx.g, text, [{ id: "c:no-fuel-slug-fuel-trader:theft", label: "Continue" }]);
  return true;
}

function betterTrade(ctx: Ctx, id: string): boolean {
  // Wiki citations:
  // > "You receive Fuel gained: 3 and lose Scrap lost: 10." — [[No fuel: refugee trading]]
  // > "You receive Fuel gained: 6 and lose Scrap lost: 10." — [[No fuel: refugee trading]]
  const cost = affordStock(ctx.g, id, "scrap");
  if (cost == null) return false;
  takeStock(ctx.g, "scrap", cost);
  ctx.g.fuel += rollFuel(id, (lo, hi) => span(ctx, lo, hi));
  done(
    ctx.g,
    id === "c:no-fuel-refugee-trading:trade"
      ? eventText("event_NO_FUEL_REFUGEE_DAMAGED_c1_text")
      : "Fuel: 6. Scrap: -10.",
  );
  return true;
}

export function missingChoose(ctx: Ctx, id: string): boolean | null {
  const slug = slugOf(id);
  if (!slug || !ownsMissing(slug)) return null;
  if (
    id === "c:lanius-empty-distress-beacon-1:0" ||
    id === "c:lanius-empty-distress-beacon-2:0" ||
    id === "c:zoltan-free-map:0" ||
    id.startsWith("c:slug-and-rock-standoff-in-nebula:")
  ) {
    return null;
  }
  if (missingDisabled(ctx.g, id)) return false;
  const name = tail(id);
  const g = ctx.g;

  if (slug === "crystal-chat") {
    if (name === "yes") {
      card(g, eventText("event_CRYSTAL_CHATTY_c1_text"), [
        { id: "c:crystal-chat:answer", label: eventText("event_CRYSTAL_CHATTY_c1_c1_choice") },
        { id: "c:crystal-chat:busy", label: eventText("event_CRYSTAL_CHATTY_c1_c2_choice") },
      ]);
      return true;
    }
    if (name === "no") {
      done(g, eventText("event_CRYSTAL_CHATTY_c1_c2_text"));
      return true;
    }
    if (name === "busy") {
      done(g, eventText("event_CRYSTAL_CHATTY_c2_text"));
      return true;
    }
    if (name === "answer") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        ctx.note(eventText("event_CRYSTAL_CHATTY_LIST_1_text"));
        ctx.fight("Rebel ship");
        return true;
      }
      if (branch === 1) {
        done(g, eventText("event_CRYSTAL_CHATTY_LIST_2_text"), rollSurrenderOffer(g));
        return true;
      }
      done(g, eventText("event_CRYSTAL_CHATTY_LIST_3_text"), repairs(6));
      return true;
    }
    if (name === "crystal") {
      const tier = (["low", "medium", "high"] as const)[ctx.irand(3)]!;
      done(g, eventText("event_CRYSTAL_CHATTY_c3_text"), fuelAndScrap(g, tier));
      return true;
    }
  }

  if (slug === "crystalline-cache") {
    if (name === "weapons") {
      if (ctx.irand(2) === 0) done(g, eventText("event_CRYSTAL_CACHE_BREAK_1_text"));
      else investigate(ctx);
      return true;
    }
    if (name === "breach") {
      const n = affordStock(g, id, "missiles");
      if (n == null) return true;
      takeStock(g, "missiles", n);
      ctx.note(eventText("event_CRYSTAL_CACHE_c2_text"));
      investigate(ctx);
      return true;
    }
    if (name === "crystal") {
      investigate(ctx);
      return true;
    }
    if (name === "pull") {
      done(g, `${eventText("event_CRYSTAL_CACHE_LIST_3_c1_text")}\n\n${loseCrew(ctx, false)}`);
      return true;
    }
    if (name === "detonate") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      const loss = cacheFuelLoss(g.fuel, offer.fuel);
      const text = loss
        ? `${eventText("event_CRYSTAL_CACHE_LIST_3_c2_text")} Fuel: -${loss}.`
        : eventText("event_CRYSTAL_CACHE_LIST_3_c2_text");
      done(g, text, offer);
      g.fuel = Math.max(0, g.fuel - loss);
      return true;
    }
    if (name === "teleport") {
      done(g, eventText("event_CRYSTAL_CACHE_LIST_3_c3_text"));
      return true;
    }
    if (name === "engines") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      done(g, eventText("event_CRYSTAL_CACHE_LIST_3_c4_text"), offer);
      return true;
    }
  }

  if (slug === "crystalline-men-buried") {
    if (name === "send") {
      digCard(ctx, false);
      return true;
    }
    if (name === "refuse") {
      done(g, eventText("event_CRYSTAL_HELP_DIG_c2_text"));
      return true;
    }
    if (name === "leave" || name === "leave2") {
      const tier = name === "leave" ? "medium" : "high";
      const lost = loseCrew(ctx, true);
      done(
        g,
        `${eventText("event_CRYSTAL_HELP_DIG_c1_c1_text")}\n\n${lost}`,
        fuelAndScrap(g, tier),
      );
      return true;
    }
    if (name === "pull" || name === "pull2") {
      crystalFight(ctx);
      return true;
    }
    if (name === "wait") {
      fleetJump(ctx);
      digCard(ctx, true);
      return true;
    }
    if (name === "wait2") {
      const line = weaponLine(g, "CRYSTAL_HEAVY_2");
      fleetJump(ctx);
      done(
        g,
        `${eventText("event_CRYSTAL_HELP_DIG_c1_c3_c3_text")}\n\n${line}\n\nRebel fleet speed x2 for 1 jump.`,
      );
      return true;
    }
  }

  if (slug === "crystalline-research-facility") {
    if (name === "allow") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        const offer = scrapOnly(g, "low");
        offer.random = "weapon";
        done(
          g,
          `${eventText("event_CRYSTAL_HUMAN_TESTS_ACCEPT_1_text")}\n\n${loseCrew(ctx, false)}`,
          offer,
        );
        return true;
      }
      if (branch === 1) {
        done(
          g,
          eventText("event_CRYSTAL_HUMAN_TESTS_ACCEPT_2_text"),
          rollSurrenderOffer(g, "medium"),
        );
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, eventText("event_CRYSTAL_HUMAN_TESTS_ACCEPT_3_text"), offer);
      return true;
    }
    if (name === "refuse") {
      if (pickW(ctx, [2, 1]) === 0) done(g, eventText("event_CRYSTAL_HUMAN_TESTS_REFUSE_1_text"));
      else {
        ctx.note(eventText("event_CRYSTAL_HUMAN_TESTS_REFUSE_3_text"));
        ctx.fight("Crystal ship");
      }
      return true;
    }
    if (name === "rock") {
      done(g, eventText("event_CRYSTAL_HUMAN_TESTS_c3_text"), rollStandard(g, "medium"));
      return true;
    }
    if (name === "BACKUP_DNA") {
      const offer = scrapOnly(g, "medium");
      offer.random = "weapon";
      done(g, eventText("event_CRYSTAL_HUMAN_TESTS_c4_text"), offer);
      return true;
    }
  }

  if (slug === "engi-research-station") {
    if (name === "board") {
      if (ctx.irand(2) === 0) done(g, eventText("event_DISTRESS_ENGI_REACTOR_LIST1_1_text"));
      else {
        card(g, eventText("event_DISTRESS_ENGI_REACTOR_LIST1_2_text"), [
          {
            id: "c:engi-research-station:save-engi",
            label: eventText("event_DISTRESS_ENGI_REACTOR_LIST1_2_c1_choice"),
          },
          {
            id: "c:engi-research-station:save-schematic",
            label: eventText("event_DISTRESS_ENGI_REACTOR_LIST1_2_c2_choice"),
          },
          {
            id: "c:engi-research-station:save-selves",
            label: eventText("event_DISTRESS_ENGI_REACTOR_LIST1_2_c3_choice"),
          },
        ]);
      }
      return true;
    }
    if (name === "ignore") {
      done(g, eventText("event_DISTRESS_ENGI_REACTOR_c2_text"));
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      card(g, eventText("event_DISTRESS_ENGI_REACTOR_SCAN_text"), [
        {
          id: "c:engi-research-station:scan-engi",
          label: eventText("event_DISTRESS_ENGI_REACTOR_SCAN_c1_choice"),
        },
        {
          id: "c:engi-research-station:scan-drone",
          label: eventText("event_DISTRESS_ENGI_REACTOR_SCAN_c2_choice"),
        },
      ]);
      return true;
    }
    if (name === "save-engi") {
      const lost = ctx.irand(2) === 0 ? loseCrew(ctx, false) : "";
      const offer = scrapOnly(g, "low");
      offer.crew = "Engi";
      done(g, `${lost || eventText("event_DISTRESS_ENGI_REACTOR_ENGI_2_text")}`, offer);
      return true;
    }
    if (name === "save-schematic") {
      if (ctx.irand(2) === 0) {
        done(
          g,
          `${eventText("event_DISTRESS_ENGI_REACTOR_DRONE_1_text")}\n\n${loseCrew(ctx, false)}`,
          scrapOnly(g, "low"),
        );
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, eventText("event_DISTRESS_ENGI_REACTOR_DRONE_2_text"), offer);
      return true;
    }
    if (name === "save-selves") {
      done(g, eventText("event_DISTRESS_ENGI_REACTOR_LIST1_2_c3_text"), scrapOnly(g, "low"));
      return true;
    }
    if (name === "scan-engi") {
      const offer = scrapOnly(g, "low");
      offer.crew = "Engi";
      done(g, eventText("event_DISTRESS_ENGI_REACTOR_SCAN_c1_text"), offer);
      return true;
    }
    if (name === "scan-drone") {
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, eventText("event_DISTRESS_ENGI_REACTOR_SCAN_c2_text"), offer);
      return true;
    }
  }

  if (slug === "lanius-with-federation-science-craft") {
    if (name === "ask") {
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(
          g,
          `${eventText("event_LANIUS_RESEARCHER_CONTACT_LIST_3_text")}\n\n${grantRandomItem(g, "weapon")}`,
        );
        return true;
      }
      if (branch === 1) {
        const offer = scrapOnly(g, "medium");
        offer.parts = 1;
        done(g, eventText("event_LANIUS_RESEARCHER_CONTACT_LIST_2_text"), offer);
        return true;
      }
      if (branch === 2) {
        done(g, eventText("event_LANIUS_RESEARCHER_CONTACT_LIST_1_text"), scrapOnly(g, "medium"));
        return true;
      }
      done(g, eventText("event_LANIUS_RESEARCHER_CONTACT_LIST_4_text"));
      return true;
    }
    if (name === "lanius") {
      const branch = ctx.irand(3);
      const kind = (["weapon", "drone", "augment"] as const)[branch]!;
      done(
        g,
        `${eventText("event_LANIUS_RESEARCHER_CONTACT_c2_text")}\n\n${grantRandomItem(g, kind)}`,
      );
      return true;
    }
    if (name === "leave") {
      done(g, eventText("event_LANIUS_RESEARCHER_CONTACT_c3_text"));
      return true;
    }
  }

  if (slug === "free-scrap-with-resources-engi" || slug === "free-scrap-with-resources-zoltan") {
    if (name === "take") {
      done(g, "", rollStandard(g));
      return true;
    }
  }

  if (slug === "fight-in-last-stand") {
    const hull = name.startsWith("go:") ? name.slice(3) : rollHull(g, "BOSS_SCOUT");
    ctx.fight(hull, undefined, "fight-in-last-stand");
    return true;
  }

  if (slug === "slug-oxygen-malfunction") {
    if (name === "send") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        done(g, eventText("event_SLUG_DISTRESS_TRICK_LIST_3_text"), scrapOnly(g, "high"));
        return true;
      }
      if (branch === 1) {
        ctx.note(eventText("event_SLUG_DISTRESS_TRICK_LIST_1_text"));
        ctx.fight("Slug ship");
        slugBoarders(g, 1, 3);
        return true;
      }
      ctx.note(`${eventText("event_SLUG_DISTRESS_TRICK_LIST_2_text")}\n\n${loseCrew(ctx, false)}`);
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "ignore") {
      done(g, eventText("event_SLUG_DISTRESS_TRICK_c2_text"));
      return true;
    }
    if (name === "mantis") {
      done(g, eventText("event_SLUG_DISTRESS_TRICK_c3_text"), scrapOnly(g, "high"));
      return true;
    }
  }

  if (slug === "slug-repair-station") {
    if (name === "no") {
      done(g, eventText("event_NEBULA_SLUG_HULLFIX_c1_text"));
      return true;
    }
    if (name === "sure") {
      const branch = ctx.irand(3);
      if (branch === 0) demandCard(ctx, 10);
      else if (branch === 1) demandCard(ctx, 1);
      else engineFight(ctx);
      return true;
    }
    if (name === "engines") {
      engineFight(ctx);
      return true;
    }
    if (name === "pay") {
      if (ctx.irand(2) === 0) {
        ctx.note(eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_2_text"));
        ctx.fight("Slug ship");
        return true;
      }
      card(g, eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_1_text"), [
        {
          id: "c:slug-repair-station:accept50",
          label: eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_1_c1_choice"),
        },
        {
          id: "c:slug-repair-station:decline50",
          label: eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_1_c2_choice"),
        },
      ]);
      return true;
    }
    if (name === "accept50") {
      const cost = affordStock(g, id, "scrap");
      if (cost == null) return true;
      takeStock(g, "scrap", cost);
      done(g, eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_1_c1_text"), repairs(10));
      return true;
    }
    if (name === "decline50") {
      done(g, eventText("event_NEBULA_SLUG_HULLFIX_REQUEST_1_c2_text"));
      return true;
    }
    if (name === "demand") {
      if (ctx.irand(2) === 0) {
        card(g, eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_1_text"), [
          {
            id: "c:slug-repair-station:fuel",
            label: eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_1_c1_choice"),
          },
          {
            id: "c:slug-repair-station:ridiculous",
            label: eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_1_c2_choice"),
          },
        ]);
      } else {
        card(g, eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_2_text"), [
          {
            id: "c:slug-repair-station:scrap50",
            label: eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_2_c1_choice"),
          },
          {
            id: "c:slug-repair-station:half",
            label: eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_2_c2_choice"),
          },
        ]);
      }
      return true;
    }
    if (name === "fuel") {
      const n = affordStock(g, id, "fuel");
      if (n == null) return true;
      takeStock(g, "fuel", n);
      done(g, eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_1_c1_text"));
      return true;
    }
    if (name === "ridiculous") {
      g.player.hull = Math.max(0, g.player.hull - 5);
      queueSfx(g, "eventDamage");
      const sys = hurtRandom(ctx);
      ctx.note(`Hull damage: ${5}.`);
      if (sys) ctx.note(sys);
      if (g.player.hull <= 0) {
        defeat(g);
        return true;
      }
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "scrap50") {
      const cost = affordStock(g, id, "scrap");
      if (cost == null) return true;
      takeStock(g, "scrap", cost);
      done(g, eventText("event_NEBULA_SLUG_HULLFIX_RESULT2_2_c1_text"));
      return true;
    }
    if (name === "half") {
      halfFight(ctx);
      return true;
    }
  }

  if (slug === "slug-store-ship") {
    if (name === "decline") {
      done(g, eventText("event_NEBULA_SLUG_FAKE_STORE_c1_text"));
      return true;
    }
    if (name === "ask") {
      card(
        g,
        `${eventText("event_NEBULA_SLUG_FAKE_STORE_c2_text")} ${eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_text")}`,
        [
          {
            id: "c:slug-store-ship:understood",
            label: eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c1_choice"),
          },
          {
            id: "c:slug-store-ship:forget-outer",
            label: eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c1_c2_choice"),
          },
          {
            id: "c:slug-store-ship:slug",
            label: eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c3_choice"),
          },
        ],
      );
      return true;
    }
    if (name === "forget-outer") {
      done(g, eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c2_text"));
      return true;
    }
    if (name === "slug") {
      ctx.note(eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c3_text"));
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "understood") {
      card(g, eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c1_text"), [
        {
          id: "c:slug-store-ship:ok",
          label: eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c1_c1_choice"),
        },
        {
          id: "c:slug-store-ship:forget-inner",
          label: eventText("event_NEBULA_SLUG_FAKE_STORE_c2_c1_c1_c2_choice"),
        },
      ]);
      return true;
    }
    if (name === "ok") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        const fuel = rollFuel(id, (lo, hi) => span(ctx, lo, hi));
        g.fuel += fuel;
        ctx.note(`Fuel: ${fuel}.`);
        openStoreHere(g);
        return true;
      }
      if (branch === 1) {
        ctx.note(eventText("event_NEBULA_SLUG_FAKE_STORE_LIST_3_text"));
        slugFight(ctx, 2);
        return true;
      }
      ctx.note(eventText("event_NEBULA_SLUG_FAKE_STORE_LIST_2_text"));
      sealFight(ctx, 1);
      return true;
    }
    if (name === "weapons") {
      ctx.note(eventText("event_NEBULA_SLUG_FAKE_STORE_LIST_2_text"));
      sealFight(ctx, 1);
      return true;
    }
    if (name === "forget-inner") {
      if (ctx.irand(2) === 0) {
        ctx.note(eventText("event_NEBULA_SLUG_FAKE_STORE_LEAVING_2_text"));
        slugFight(ctx, 1);
        return true;
      }
      done(g, eventText("event_NEBULA_SLUG_FAKE_STORE_LEAVING_1_text"));
      return true;
    }
  }

  if (slug === "no-fuel-slug-fuel-trader") {
    if (name === "pay") {
      if (affordStock(g, id, "scrap") == null) return false;
      return payFifteen(ctx, id, ctx.irand(2) === 1);
    }
    if (name === "slug") {
      // Wiki citations:
      // > "You receive Fuel gained: 5 and lose Scrap lost: 15." — [[No fuel: Slug fuel trader]]
      if (affordStock(g, id, "scrap") == null) return false;
      return payFifteen(ctx, id, false);
    }
    if (name === "ignore") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: Slug fuel trader]]
      done(g, eventText("event_FUEL_ON_SLUG_CHUCKLE_c2_text"));
      return true;
    }
    if (name === "theft") {
      // Wiki citations:
      // > "Everything looks secure but suddenly a number of supplies disappear ! He must have planted a portable teleporter into your cargo bay somehow. Before you can react the ship is long gone." — [[No fuel: Slug fuel trader]]
      // > "You lose Missiles lost: 2-4 and Scrap lost: 20-35." — [[No fuel: Slug fuel trader]]
      const missiles = Math.min(
        g.missiles,
        rollBand("no-fuel-slug-fuel-trader", "theft", "missiles", (lo, hi) => span(ctx, lo, hi)) ??
          0,
      );
      const scrap = Math.min(
        g.scrap,
        rollBand("no-fuel-slug-fuel-trader", "theft", "scrap", (lo, hi) => span(ctx, lo, hi)) ?? 0,
      );
      g.missiles -= missiles;
      g.scrap -= scrap;
      done(
        g,
        `${eventText("event_FUEL_ON_SLUG_CHUCKLE_LIST_1_c1_text")} Missiles: -${missiles}. Scrap: -${scrap}.`,
      );
      return true;
    }
  }

  if (slug === "no-fuel-drifting-debris") {
    if (name === "send") {
      card(g, eventText("event_FUEL_OFF_ROCK_WRECK_c1_text"), [
        {
          id: "c:no-fuel-drifting-debris:report",
          label: eventText("event_FUEL_OFF_ROCK_WRECK_c1_c1_choice"),
        },
      ]);
      return true;
    }
    if (name === "report") {
      // Wiki citations:
      // > "You receive medium fuel and the current sector map is revealed." — [[No fuel: drifting debris]]
      // > "You receive medium fuel." — [[No fuel: drifting debris]]
      // > "You receive medium missiles and scrap." — [[No fuel: drifting debris]]
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(
          g,
          `${eventText("event_FUEL_OFF_ROCK_WRECK_LIST_2_text")} Sector map revealed.`,
          fuelOnly(g, "medium"),
        );
        return true;
      }
      if (branch === 1) {
        done(g, eventText("event_FUEL_OFF_ROCK_WRECK_LIST_3_text"), fuelOnly(g, "medium"));
        return true;
      }
      if (branch === 2) {
        const offer = scrapOnly(g, "medium");
        offer.missiles = between(g, resourceBand("missiles", "medium"));
        done(g, eventText("event_FUEL_OFF_ROCK_WRECK_LIST_1_text"), offer);
        return true;
      }
      const cost = rollPrice("FUEL_OFF_ROCK_WRECK", "ransom", (lo, hi) => between(g, [lo, hi]));
      // Wiki citations:
      // > "You lose Scrap lost: 25-40." — [[No fuel: drifting debris]]
      const choices = [];
      if (cost != null) {
        choices.push({
          id: `c:no-fuel-drifting-debris:pay:${cost}`,
          label: `${eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_c1_choice")} [${cost} scrap]`,
        });
      }
      choices.push({
        id: "c:no-fuel-drifting-debris:refuse",
        label: eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_c2_choice"),
      });
      card(g, eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_text"), choices);
      return true;
    }
    if (name.startsWith("pay:")) {
      const cost = Number(name.slice(4));
      if (!priced("no-fuel-drifting-debris", "ransom", cost, "scrap") || g.scrap < cost)
        return false;
      g.scrap -= cost;
      done(g, `${eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_c1_text")} Scrap: -${cost}.`);
      return true;
    }
    if (name === "refuse") {
      // Wiki citations:
      // > "You lose a crewmember." — [[No fuel: drifting debris]]
      // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
      done(
        g,
        `${eventText("event_FUEL_OFF_ROCK_WRECK_LIST_4_c2_text")}\n\n${loseCrew(ctx, true, true)}`,
      );
      return true;
    }
    if (name === "drift") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: drifting debris]]
      done(g, "Nothing happens.");
      return true;
    }
    if (name === "scan") {
      // Wiki citations:
      // > "You receive medium fuel." — [[No fuel: drifting debris]]
      done(g, eventText("event_FUEL_OFF_ROCK_WRECK_c3_text"), fuelOnly(g, "medium"));
      return true;
    }
  }

  if (
    slug === "no-fuel-fuel-trader-distress-off" ||
    slug === "no-fuel-fuel-trader-distress-on" ||
    slug === "no-fuel-prepare-to-dock"
  ) {
    const trade = TRADE_ID.exec(name);
    if (trade) return payTrade(ctx, Number(trade[2]), trade[3] as PayKind, Number(trade[4]));
    if (name === "decline") {
      showPt2(ctx, slug);
      return true;
    }
    if (name === "pity") {
      if (ctx.irand(2) === 0)
        done(g, eventText("event_FUEL_TRADER_PT3_1_text"), {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
      else done(g, eventText("event_FUEL_TRADER_PT3_2_text"));
      return true;
    }
    if (name === "walk") {
      done(g, eventText("event_FUEL_TRADER_PT2_2_c2_text"));
      return true;
    }
  }

  if (slug === "no-fuel-prepare-to-dock") {
    if (name === "accept") {
      // Wiki citations:
      // > "You receive Fuel gained: 2-6." — [[No fuel: prepare to dock]]
      // > "Gladly Trade. [ the actual trade offer is shown ]" — [[No fuel: prepare to dock]]
      // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      // > "2-3 human boarders beam aboard your ship and you fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(g, eventText("event_FUEL_APPROACH_ACCEPT_LIST_1_text"), {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
        return true;
      }
      if (branch === 1) {
        showTrader(g, slug, eventText("event_FUEL_APPROACH_ACCEPT_LIST_2_text"));
        return true;
      }
      if (branch === 2) {
        ctx.note(eventText("event_FUEL_APPROACH_ACCEPT_LIST_4_text"));
        pirateFight(ctx, "no-fuel-prepare-dock-90");
        return true;
      }
      ctx.note(eventText("event_FUEL_APPROACH_ACCEPT_LIST_3_text"));
      pirateFight(ctx, "no-fuel-prepare-dock-80", true);
      return true;
    }
    if (name === "distance") {
      // Wiki citations:
      // > "You receive Fuel gained: 1-4." — [[No fuel: prepare to dock]]
      // > "Fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      // > "Nothing happens." — [[No fuel: prepare to dock]]
      const branch = ctx.irand(3);
      if (branch === 0) {
        done(g, eventText("event_FUEL_APPROACH_DECLINE_LIST_1_text"), {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
        return true;
      }
      if (branch === 1) {
        ctx.note(eventText("event_FUEL_APPROACH_DECLINE_LIST_3_text"));
        pirateFight(ctx, "no-fuel-prepare-dock-80");
        return true;
      }
      done(g, eventText("event_FUEL_APPROACH_DECLINE_LIST_2_text"));
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      // Wiki citations:
      // > "Scan the ship." — [[No fuel: prepare to dock]]
      card(g, "", [{ id: "c:no-fuel-prepare-to-dock:scan", label: "Continue" }]);
      return true;
    }
    if (name === "scan") {
      // Wiki citations:
      // > "You receive Fuel gained: 3-7." — [[No fuel: prepare to dock#Scan the ship]]
      if (ctx.irand(2) === 0) {
        done(g, eventText("event_FUEL_APPROACH_SCAN_LIST_1_text"), {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
        return true;
      }
      card(g, eventText("event_FUEL_APPROACH_SCAN_LIST_2_text"), [
        {
          id: "c:no-fuel-prepare-to-dock:trap",
          label: eventText("event_FUEL_APPROACH_SCAN_LIST_2_c1_choice"),
        },
        {
          id: "c:no-fuel-prepare-to-dock:cloak",
          label: eventText("event_FUEL_APPROACH_SCAN_LIST_2_c2_choice"),
        },
      ]);
      return true;
    }
    if (name === "trap") {
      // Wiki citations:
      // > "Fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock#Scan the ship]]
      pirateFight(ctx, "no-fuel-prepare-dock-80");
      return true;
    }
    if (name === "cloak") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: prepare to dock#Scan the ship]]
      done(g, eventText("event_FUEL_APPROACH_SCAN_LIST_2_c2_text"));
      return true;
    }
  }

  if (slug === "no-fuel-refugee-trading") {
    if (name === "low") {
      // Wiki citations:
      // > "You receive low fuel." — [[No fuel: refugee trading]]
      done(g, "", fuelOnly(g, "low"));
      return true;
    }
    if (name === "trade" || name === "better" || name === "again") return betterTrade(ctx, id);
    if (name === "engi") {
      // Wiki citations:
      // > "Accept it. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: refugee trading]]
      card(g, eventText("event_NO_FUEL_REFUGEE_DAMAGED_c2_text"), [
        {
          id: "c:no-fuel-refugee-trading:better",
          label: eventText("event_NO_FUEL_REFUGEE_DAMAGED_c2_c1_choice"),
        },
        {
          id: "c:no-fuel-refugee-trading:better-no",
          label: eventText("event_NO_FUEL_REFUGEE_DAMAGED_c2_c2_choice"),
        },
      ]);
      return true;
    }
    if (name === "better-no" || name === "again-no") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: refugee trading]]
      done(g, "Nothing happens.");
      return true;
    }
    if (name === "refuse") {
      if (ctx.irand(2) === 0) done(g, eventText("event_NO_FUEL_REFUGEE_REFUSE_1_text"));
      else {
        card(g, eventText("event_NO_FUEL_REFUGEE_REFUSE_2_text"), [
          {
            id: "c:no-fuel-refugee-trading:again",
            label: eventText("event_NO_FUEL_REFUGEE_REFUSE_2_c1_choice"),
          },
          {
            id: "c:no-fuel-refugee-trading:again-no",
            label: eventText("event_NO_FUEL_REFUGEE_REFUSE_2_c2_choice"),
          },
        ]);
      }
      return true;
    }
    if (name === "attack") {
      // Wiki citations:
      // > "You receive medium fuel and scrap." — [[No fuel: refugee trading]]
      done(g, eventText("event_NO_FUEL_REFUGEE_DAMAGED_c4_text"), fuelAndScrap(g, "medium"));
      return true;
    }
    if (name === "missiles") {
      // Wiki citations:
      // > "You lose Missiles lost: 1 and receive Fuel gained: 5-7." — [[No fuel: refugee trading]]
      // > "You lose Missiles lost: 1, receive Fuel gained: 5-7, and you fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
      const n = affordStock(g, id, "missiles");
      if (n == null) return true;
      takeStock(g, "missiles", n);
      const fuel = rollFuel(id, (lo, hi) => span(ctx, lo, hi));
      g.fuel += fuel;
      if (ctx.irand(2) === 0) {
        done(
          g,
          `${eventText("event_NO_FUEL_REFUGEE_PIRATE_ACCEPT_1_text")} Missiles: -${n}. Fuel: ${fuel}.`,
        );
        return true;
      }
      ctx.note(
        `${eventText("event_NO_FUEL_REFUGEE_PIRATE_ACCEPT_2_text")} Missiles: -${n}. Fuel: ${fuel}.`,
      );
      ctx.fight("PIRATE_REFUGEE", undefined, "no-fuel-refugee-trading");
      return true;
    }
    if (name === "arm-no") {
      // Wiki citations:
      // > "2× Taking your reluctance as weakness, the refugee ship suddenly bristles with weapons - it's a pirate ship, and it believes it's found easy prey!" — [[No fuel: refugee trading]]
      // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
      // > "You receive low fuel." — [[No fuel: refugee trading]]
      // > "Nothing happens." — [[No fuel: refugee trading]]
      const branch = pickW(ctx, [2, 1, 1]);
      if (branch === 0) {
        ctx.note(eventText("event_NO_FUEL_REFUGEE_PIRATE_REJECT_3_text"));
        ctx.fight("PIRATE_REFUGEE", undefined, "no-fuel-refugee-trading");
        return true;
      }
      if (branch === 1) {
        done(g, eventText("event_NO_FUEL_REFUGEE_PIRATE_REJECT_2_text"), fuelOnly(g, "low"));
        return true;
      }
      done(g, eventText("event_NO_FUEL_REFUGEE_PIRATE_REJECT_1_text"));
      return true;
    }
  }

  return null;
}

/** Slug repair station wins that replace default salvage. */
export function missingPageWin(
  g: Game,
  slug: string | null | undefined,
  deadCrew: boolean,
): boolean {
  if (slug !== "slug-repair-engines" && slug !== "slug-repair-half") return false;
  const text = eventText(
    slug === "slug-repair-engines"
      ? deadCrew
        ? "ship_JELLY_STATUS_ENGINES_deadCrew_text"
        : "ship_JELLY_STATUS_ENGINES_destroyed_text"
      : deadCrew
        ? "ship_JELLY_STATUS_WEAPONS_deadCrew_text"
        : "ship_JELLY_STATUS_WEAPONS_destroyed_text",
  );
  const tier: SurrenderTier = slug === "slug-repair-half" || deadCrew ? "high" : "medium";
  done(g, text, rollStandard(g, tier));
  g.sfx.push("win");
  return true;
}
