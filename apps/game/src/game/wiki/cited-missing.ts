/**
 * Location pages that were still only a title or a plain hostile ship.
 * Sibling results with no printed odds roll equally (INFERRED). {{DuplicateEvent|N}} counts N times.
 * An unnamed weapon, drone schematic, or augmentation is grantRandomItem. A crystal weapon is an even
 * draw of the crystal guns already in the game. Out-of-fuel pages name no sector; they join the wait roll only.
 */
import { tx } from "../../i18n/index.ts";
import { eventDef } from "@stl/pack";
import { EXTRA_EVENTS } from "./cited-missing-pages.ts";
import { ownedLock } from "./choice-locks.ts";
import { rollFuel } from "./fuel-gifts.ts";
import { MISSING_LOCKS } from "./choice-reqs.ts";
import { adjustScrap } from "../extras/index.ts";
import { beginBoarding, hurtSystem, openStoreHere } from "../sim.ts";
import type { Beacon, Game, GameEvent, SysId } from "../types.ts";
import { grantRandomItem, weaponLine } from "./bonus-item.ts";
import { CRYSTAL_SECTOR_WEAPONS } from "./cited-stores.ts";
import {
  between,
  crystalBoarders,
  humanBoarders,
  pageCard,
  pageResult,
  payOffer,
  rollStandard,
  rollSurrenderOffer,
  scrapBand,
  slugBoarders,
  type SurrenderOffer,
  type SurrenderTier,
} from "./surrender.ts";

type Ctx = {
  g: Game;
  resolve: () => void;
  fight: (tier: string, asteroid?: boolean, slug?: string) => void;
  scrap: (n: number) => void;
  note: (text: string) => void;
  irand: (n: number) => number;
};

const NEBULA_ON_ARRIVAL = new Set([
  "slug-oxygen-malfunction",
  "slug-repair-station",
  "slug-store-ship",
  "slug-and-rock-standoff-in-nebula",
]);

type PayKind = "parts" | "missiles" | "scrap";

const FUEL_BAND: Record<SurrenderTier, [number, number]> = {
  low: [1, 3],
  medium: [2, 4],
  high: [3, 6],
};

const OWNED = new Set(EXTRA_EVENTS.map((ev) => ev.slug).concat([
  "no-fuel-slug-fuel-trader",
  "no-fuel-drifting-debris",
  "no-fuel-fuel-trader-distress-off",
  "no-fuel-fuel-trader-distress-on",
  "no-fuel-prepare-to-dock",
  "no-fuel-refugee-trading",
]));

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
  return { tier, scrap: 0, eligible: 0, fuel: between(g, FUEL_BAND[tier]), missiles: 0, parts: 0 };
}

/** Rewards, "Fuel": T fuel and T scrap. No bonus item. */
function fuelAndScrap(g: Game, tier: SurrenderTier): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  offer.fuel = between(g, FUEL_BAND[tier]);
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
  if (!noClone && g.player.kits.cradle) return tx("wiki.filler-events.the-lost-crewmember-is-revived");
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[ctx.irand(mine.length)]!;
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  const line = tx("wiki.filler-events.is-lost", { name: lost.name });
  // Drifting debris prints the Clone Bay's silence. Buried leave prints no such line.
  // Wiki citations:
  // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
  if (quiet && g.player.kits.cradle) return `${line} ${tx("wiki.cited-missing.clone-bay-quiet")}`;
  return line;
}

function fleetJump(ctx: Ctx) {
  ctx.g.fleet += 1;
  ctx.note(tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for"));
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
  if (kind === "parts") return tx("wiki.cited-missing.drone-parts");
  if (kind === "missiles") return tx("wiki.cited-missing.missiles");
  return tx("wiki.cited-missing.scrap");
}

function offerLine(fuel: number, kind: PayKind, amt: number): string {
  return tx("wiki.cited-missing.receive-fuel-lose", { fuel, amt, pay: payWord(kind) });
}

/** Fuel-trader rows of one band. The draw stays between: the row, then the fuel, then the payment. */
function fuelRows(id: string, band: "high" | "pt2") {
  const rows = [];
  for (const row of eventDef(id)?.offers ?? []) if (row.k === "fuel" && row.band === band) rows.push(row);
  return rows;
}

function rollTrade(g: Game, table: ReturnType<typeof fuelRows>): { fuel: number; kind: PayKind; amt: number } {
  const rowN = table[between(g, [0, table.length - 1])]!;
  return { fuel: between(g, rowN.fuel), kind: rowN.pay, amt: between(g, rowN.amt) };
}

const TRADE_ID = /^(buy|pt2|high2):(\d+):(parts|missiles|scrap):(\d+)$/;

function showTrader(g: Game, slug: string, intro: string) {
  const offer = rollTrade(g, fuelRows(slug, "high"));
  card(g, `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`, [
    { id: `c:${slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`, label: tx("wiki.cited-missing.gladly-trade") },
    { id: `c:${slug}:decline`, label: tx("wiki.cited-missing.respectfully-decline") },
  ]);
}

function showPt2(ctx: Ctx, slug: string) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    done(ctx.g, tx("wiki.cited-missing.unable-to-help"));
    return;
  }
  const offer = rollTrade(ctx.g, fuelRows(slug, branch === 0 ? "pt2" : "high"));
  const kind = branch === 0 ? "pt2" : "high2";
  const intro = branch === 0 ? tx("wiki.cited-missing.seeing-that-youre-in-need") : tx("wiki.cited-missing.not-for-charity");
  card(ctx.g, `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`, [
    { id: `c:${slug}:${kind}:${offer.fuel}:${offer.kind}:${offer.amt}`, label: tx("wiki.cited-missing.accept") },
    {
      id: branch === 0 ? `c:${slug}:pity` : `c:${slug}:walk`,
      label: tx("wiki.cited-missing.decline-again"),
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
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  if (!ids.length) return "";
  const id = ids[ctx.irand(ids.length)]!;
  hurtSystem(g.player, id, 1);
  const room = g.player.rooms.find((r) => r.system === id);
  return tx("wiki.cited-missing.system-damaged", { name: room?.title ?? id });
}

function investigate(ctx: Ctx) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    card(ctx.g, tx("wiki.cited-missing.cache-trap"), [
      { id: "c:crystalline-cache:pull", label: tx("wiki.cited-missing.pull-out-now") },
      { id: "c:crystalline-cache:detonate", label: tx("wiki.cited-missing.detonate-fuel") },
      { id: "c:crystalline-cache:teleport", label: tx("wiki.cited-missing.beam-crew-back") },
      { id: "c:crystalline-cache:engines", label: tx("wiki.cited-missing.rescue-with-engines") },
    ]);
    return;
  }
  const gun = crystalGun(ctx);
  const offer = rollSurrenderOffer(ctx.g, "low", true);
  if (branch === 1) {
    const paid = payOffer(ctx.g, offer, true);
    ctx.note(gun);
    if (offer.scrap) ctx.note(tx("wiki.surrender.scrap", { scrap: offer.scrap }));
    if (offer.fuel) ctx.note(tx("wiki.surrender.fuel", { fuel: offer.fuel }));
    if (offer.missiles) ctx.note(tx("wiki.surrender.missiles", { missiles: offer.missiles }));
    if (offer.parts) ctx.note(tx("wiki.surrender.drone-parts", { parts: offer.parts }));
    for (const line of paid.extras) ctx.note(line);
    crystalBoarders(ctx.g, 2, 3);
    beginBoarding(ctx.g);
    return;
  }
  done(ctx.g, `${tx("wiki.cited-missing.cache-weapons")}\n\n${gun}`, offer);
}

function digCard(ctx: Ctx, second: boolean) {
  const slug = "crystalline-men-buried";
  card(ctx.g, second ? tx("wiki.cited-missing.buried-waited") : tx("wiki.cited-missing.buried-dig"), [
    { id: `c:${slug}:${second ? "leave2" : "leave"}`, label: tx("wiki.cited-missing.leave-them") },
    { id: `c:${slug}:${second ? "pull2" : "pull"}`, label: tx("wiki.cited-missing.pull-them-out") },
    { id: `c:${slug}:${second ? "wait2" : "wait"}`, label: tx("wiki.cited-missing.wait") },
  ]);
}

function crystalFight(ctx: Ctx) {
  ctx.note(tx("wiki.cited-missing.crystal-insult"));
  ctx.fight(tx("wiki.cited-events.crystal-ship"));
}

function demandCard(ctx: Ctx, repairsN: number) {
  const g = ctx.g;
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + repairsN);
  ctx.note(tx("wiki.surrender.hull-repairs", { repairs: repairsN }));
  card(g, tx(repairsN === 10 ? "wiki.cited-missing.repair-ten" : "wiki.cited-missing.repair-one"), [
    { id: "c:slug-repair-station:demand", label: tx("wiki.cited-missing.demand-an-explanation") },
  ]);
}

function engineFight(ctx: Ctx) {
  ctx.note(tx("wiki.cited-missing.repair-engines-down"));
  ctx.fight("Slug ship", undefined, "slug-repair-engines");
}

function halfFight(ctx: Ctx) {
  ctx.note(tx("wiki.cited-missing.repair-weapons-half"));
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
  ctx.fight("Pirate ship", undefined, slug);
  if (boarders) humanBoarders(ctx.g, 2, 3, tx("wiki.cited-events.human-boarders-beam-aboard-your-ship"));
}

export function missingAutoFight(flag: string): boolean {
  return flag === "cited:fight-in-last-stand";
}

export function missingOwns(id: string): boolean {
  const slug = slugOf(id);
  return slug != null && OWNED.has(slug);
}

/** Last-stand hulls. A repeated name stays repeated. The draw stays between, before the opening sentence. */
function hullList(id: string): string[] {
  const rows = [];
  for (const row of eventDef(id)?.rolls ?? []) if (row.k === "hull") rows.push(row.id);
  return rows;
}

function rollHull(g: Game, id: string): string {
  const rows = hullList(id);
  return rows[between(g, [0, rows.length - 1])]!;
}

/** One opening sentence from the packed page. The draw stays between, over the packed list. */
function opening(g: Game, id: string): string {
  const texts = eventDef(id)?.texts ?? [];
  const hi = texts.length > 0 ? texts.length - 1 : 0;
  return texts[between(g, [0, hi])] ?? "";
}

export function missingCard(g: Game, b: Beacon, ev: { slug: string; dest: string }): GameEvent | null {
  if (NEBULA_ON_ARRIVAL.has(ev.slug)) b.kind = "nebula";
  if (ev.slug === "free-scrap-with-resources-engi") {
    return {
      title: ev.dest,
      body: opening(g, "free-scrap-with-resources-engi"),
      choices: [{ id: "c:free-scrap-with-resources-engi:take", label: tx("wiki.cited-missing.standard-gift") }],
    };
  }
  if (ev.slug === "fight-in-last-stand") {
    const hull = rollHull(g, "fight-in-last-stand");
    return {
      title: ev.dest,
      body: opening(g, "fight-in-last-stand"),
      choices: [{ id: `c:fight-in-last-stand:go:${hull}`, label: tx("wiki.cited-missing.fight-the-scout") }],
    };
  }
  if (ev.slug === "no-fuel-slug-fuel-trader") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: Slug fuel trader]]
    // > "A poorly armed Slug ship cruises by and offers assistance. Their captain seems to be chuckling to himself, perhaps at the prices he's charging." — [[No fuel: Slug fuel trader]]
    // > "Pay 15 scrap for 5 fuel. [ Scrap lost: 15 ]" — [[No fuel: Slug fuel trader]]
    // > "Ignore the offer." — [[No fuel: Slug fuel trader]]
    // > "(Slug Crew) Have your Slug make the purchase." — [[No fuel: Slug fuel trader]]
    return {
      title: ev.dest,
      body: tx("wiki.cited-missing.slug-trader-intro"),
      choices: [
        { id: "c:no-fuel-slug-fuel-trader:pay", label: tx("wiki.cited-missing.pay-15-for-5") },
        { id: "c:no-fuel-slug-fuel-trader:ignore", label: tx("wiki.cited-missing.ignore-the-offer") },
        { id: "c:no-fuel-slug-fuel-trader:slug", label: tx("wiki.cited-missing.slug-makes-the-purchase") },
      ],
    };
  }
  if (ev.slug === "no-fuel-drifting-debris") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: drifting debris]]
    // > "As you await either salvation or death, your attention is drawn to a sea of debris drifting past the starboard view port. The chunks gliding by grow bigger in size until the stern of a Rock frigate, gutted in some distant war, comes into view." — [[No fuel: drifting debris]]
    // > "Send an away team." — [[No fuel: drifting debris]]
    // > "Let it drift by." — [[No fuel: drifting debris]]
    // > "(Life Scanner) Run additional scans." — [[No fuel: drifting debris]]
    return {
      title: ev.dest,
      body: tx("wiki.cited-missing.debris-intro"),
      choices: [
        { id: "c:no-fuel-drifting-debris:send", label: tx("wiki.cited-missing.send-an-away-team") },
        { id: "c:no-fuel-drifting-debris:drift", label: tx("wiki.cited-missing.let-it-drift") },
        { id: "c:no-fuel-drifting-debris:scan", label: tx("wiki.cited-missing.lifeform-scan") },
      ],
    };
  }
  if (ev.slug === "no-fuel-fuel-trader-distress-off" || ev.slug === "no-fuel-fuel-trader-distress-on") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: fuel trader (distress off)]]
    // > "Gladly trade. [ the actual trade offer is shown prior to the exchange ]" — [[No fuel: fuel trader (distress off)]]
    // > "Respectfully decline." — [[No fuel: fuel trader (distress off)]]
    // > "This random event occurs." — [[No fuel: fuel trader (distress on)]]
    // > "Gladly trade. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: fuel trader (distress on)]]
    // > "Respectfully decline." — [[No fuel: fuel trader (distress on)]]
    const intro = opening(g, ev.slug);
    const offer = rollTrade(g, fuelRows(ev.slug, "high"));
    return {
      title: ev.dest,
      body: `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`,
      choices: [
        { id: `c:${ev.slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`, label: tx("wiki.cited-missing.gladly-trade") },
        { id: `c:${ev.slug}:decline`, label: tx("wiki.cited-missing.respectfully-decline") },
      ],
    };
  }
  if (ev.slug === "no-fuel-prepare-to-dock") {
    // Wiki citations:
    // > "This random event occurs." — [[No fuel: prepare to dock]]
    // > "A ship approaches. They hail you saying, \"You need some fuel? We'll prepare to dock to help.\"" — [[No fuel: prepare to dock]]
    // > "Graciously accept their offer." — [[No fuel: prepare to dock]]
    // > "Request they keep their distance." — [[No fuel: prepare to dock]]
    // > "(Advanced Sensors) Run a detailed scan with your sensors before responding. (Requires level 3 Sensors)" — [[No fuel: prepare to dock]]
    // > "(Long-Ranged Scanners) Run a detailed scan before responding." — [[No fuel: prepare to dock]]
    return {
      title: ev.dest,
      body: tx("wiki.cited-missing.prepare-intro"),
      choices: [
        { id: "c:no-fuel-prepare-to-dock:accept", label: tx("wiki.cited-missing.accept-their-offer") },
        { id: "c:no-fuel-prepare-to-dock:distance", label: tx("wiki.cited-missing.keep-distance") },
        { id: "c:no-fuel-prepare-to-dock:sensors", label: tx("wiki.cited-missing.scan-sensors") },
        { id: "c:no-fuel-prepare-to-dock:scanners", label: tx("wiki.cited-missing.scan-lrs") },
      ],
    };
  }
  if (ev.slug === "no-fuel-refugee-trading") {
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
  if (!slug || !OWNED.has(slug)) return null;
  const name = tail(id);
  const locked = ownedLock(g, id, MISSING_LOCKS);
  if (locked) return locked;
  const trade = TRADE_ID.exec(name);
  if (trade && stockOf(g, trade[3] as PayKind) < Number(trade[4])) {
    return tx("wiki.cited-events.need", { cost: Number(trade[4]), v: payWord(trade[3] as PayKind) });
  }
  const ransom = /^pay:(\d+)$/.exec(name);
  if (ransom && slug === "no-fuel-drifting-debris" && g.scrap < Number(ransom[1])) {
    return tx("wiki.cited-events.need", { cost: Number(ransom[1]), v: "scrap" });
  }
  return null;
}

function payFifteen(ctx: Ctx, id: string, theft: boolean): boolean {
  // Wiki citations:
  // > "You doubt he is trustworthy but have no choice but to make the deal. However you complete the exchange without event." — [[No fuel: Slug fuel trader]]
  // > "You receive Fuel gained: 5." — [[No fuel: Slug fuel trader]]
  // > "Continue..." — [[No fuel: Slug fuel trader]]
  if (ctx.g.scrap < 15) return false;
  ctx.g.scrap -= 15;
  ctx.g.fuel += rollFuel(id, (lo, hi) => span(ctx, lo, hi));
  const text = tx("wiki.cited-missing.slug-exchange");
  if (!theft) {
    done(ctx.g, text);
    return true;
  }
  card(ctx.g, text, [{ id: "c:no-fuel-slug-fuel-trader:theft", label: tx("wiki.cited-missing.continue") }]);
  return true;
}

function betterTrade(ctx: Ctx, id: string): boolean {
  // Wiki citations:
  // > "The refugees thank you for the parts, and gladly pass along the much-needed fuel. They wish you well on your mission, and declare their support for the Federation." — [[No fuel: refugee trading]]
  // > "You receive Fuel gained: 3 and lose Scrap lost: 10." — [[No fuel: refugee trading]]
  // > "You receive Fuel gained: 6 and lose Scrap lost: 10." — [[No fuel: refugee trading]]
  if (ctx.g.scrap < 10) return false;
  ctx.g.scrap -= 10;
  ctx.g.fuel += rollFuel(id, (lo, hi) => span(ctx, lo, hi));
  done(
    ctx.g,
    tx(
      id === "c:no-fuel-refugee-trading:trade"
        ? "wiki.cited-missing.refugee-thanks"
        : "wiki.cited-missing.refugee-better-done",
    ),
  );
  return true;
}

export function missingChoose(ctx: Ctx, id: string): boolean | null {
  const slug = slugOf(id);
  if (!slug || !OWNED.has(slug)) return null;
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
      card(g, tx("wiki.cited-missing.crystal-questions"), [
        { id: "c:crystal-chat:answer", label: tx("wiki.cited-missing.try-to-answer") },
        { id: "c:crystal-chat:busy", label: tx("wiki.cited-missing.no-time") },
      ]);
      return true;
    }
    if (name === "no") {
      done(g, tx("wiki.cited-missing.crystal-busy"));
      return true;
    }
    if (name === "busy") {
      done(g, tx("wiki.cited-missing.crystal-next-time"));
      return true;
    }
    if (name === "answer") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        ctx.note(tx("wiki.cited-missing.crystal-rebel"));
        ctx.fight("Rebel ship");
        return true;
      }
      if (branch === 1) {
        done(g, tx("wiki.cited-missing.crystal-supplies"), rollSurrenderOffer(g));
        return true;
      }
      done(g, tx("wiki.cited-missing.crystal-repairs"), repairs(6));
      return true;
    }
    if (name === "crystal") {
      const tier = (["low", "medium", "high"] as const)[ctx.irand(3)]!;
      done(g, tx("wiki.cited-missing.crystal-kin"), fuelAndScrap(g, tier));
      return true;
    }
  }

  if (slug === "crystalline-cache") {
    if (name === "weapons") {
      if (ctx.irand(2) === 0) done(g, tx("wiki.cited-missing.cache-holds"));
      else investigate(ctx);
      return true;
    }
    if (name === "breach") {
      g.missiles -= 1;
      ctx.note(tx("wiki.cited-missing.missile-spent"));
      investigate(ctx);
      return true;
    }
    if (name === "crystal") {
      investigate(ctx);
      return true;
    }
    if (name === "pull") {
      done(g, `${tx("wiki.cited-missing.cache-pull")}\n\n${loseCrew(ctx, false)}`);
      return true;
    }
    if (name === "detonate") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      const loss = cacheFuelLoss(g.fuel, offer.fuel);
      const text = loss
        ? `${tx("wiki.cited-missing.cache-detonate")} ${tx("wiki.cited-missing.fuel-lost", { n: loss })}`
        : tx("wiki.cited-missing.cache-detonate");
      done(g, text, offer);
      g.fuel = Math.max(0, g.fuel - loss);
      return true;
    }
    if (name === "teleport") {
      done(g, tx("wiki.cited-missing.cache-teleport"));
      return true;
    }
    if (name === "engines") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      done(g, tx("wiki.cited-missing.cache-engines"), offer);
      return true;
    }
  }

  if (slug === "crystalline-men-buried") {
    if (name === "send") {
      digCard(ctx, false);
      return true;
    }
    if (name === "refuse") {
      done(g, tx("wiki.cited-missing.buried-refuse"));
      return true;
    }
    if (name === "leave" || name === "leave2") {
      const tier = name === "leave" ? "medium" : "high";
      const lost = loseCrew(ctx, true);
      done(g, `${tx("wiki.cited-missing.buried-leave")}\n\n${lost}`, fuelAndScrap(g, tier));
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
      const line = weaponLine(g, "heavycrystal2");
      fleetJump(ctx);
      done(g, `${tx("wiki.cited-missing.buried-gift")}\n\n${line}\n\n${tx("wiki.cited-events.rebel-fleet-pursuit-is-doubled-for")}`);
      return true;
    }
  }

  if (slug === "crystalline-research-facility") {
    if (name === "allow") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        const offer = scrapOnly(g, "low");
        offer.random = "weapon";
        done(g, `${tx("wiki.cited-missing.research-broken")}\n\n${loseCrew(ctx, false)}`, offer);
        return true;
      }
      if (branch === 1) {
        done(g, tx("wiki.cited-missing.research-scans"), rollSurrenderOffer(g, "medium"));
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, tx("wiki.cited-missing.research-genome"), offer);
      return true;
    }
    if (name === "refuse") {
      if (pickW(ctx, [2, 1]) === 0) done(g, tx("wiki.cited-missing.research-shame"));
      else {
        ctx.note(tx("wiki.cited-missing.research-submit"));
        ctx.fight(tx("wiki.cited-events.crystal-ship"));
      }
      return true;
    }
    if (name === "rock") {
      done(g, tx("wiki.cited-missing.research-rock"), rollStandard(g, "medium"));
      return true;
    }
    if (name === "dna") {
      const offer = scrapOnly(g, "medium");
      offer.random = "weapon";
      done(g, tx("wiki.cited-missing.research-dna"), offer);
      return true;
    }
  }

  if (slug === "engi-research-station") {
    if (name === "board") {
      if (ctx.irand(2) === 0) done(g, tx("wiki.cited-missing.engi-dead"));
      else {
        card(g, tx("wiki.cited-missing.engi-reactor"), [
          { id: "c:engi-research-station:save-engi", label: tx("wiki.cited-missing.save-the-engi") },
          { id: "c:engi-research-station:save-schematic", label: tx("wiki.cited-missing.save-the-schematic") },
          { id: "c:engi-research-station:save-selves", label: tx("wiki.cited-missing.save-yourselves") },
        ]);
      }
      return true;
    }
    if (name === "ignore") {
      done(g, tx("wiki.cited-missing.engi-ignore"));
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      card(g, tx("wiki.cited-missing.engi-second-scan"), [
        { id: "c:engi-research-station:scan-engi", label: tx("wiki.cited-missing.save-the-engi") },
        { id: "c:engi-research-station:scan-drone", label: tx("wiki.cited-missing.save-the-schematic") },
      ]);
      return true;
    }
    if (name === "save-engi") {
      const lost = ctx.irand(2) === 0 ? loseCrew(ctx, false) : "";
      const offer = scrapOnly(g, "low");
      offer.crew = tx("wiki.surrender.engi");
      done(g, `${lost || tx("wiki.cited-missing.engi-safe")}`, offer);
      return true;
    }
    if (name === "save-schematic") {
      if (ctx.irand(2) === 0) {
        done(g, `${tx("wiki.cited-missing.engi-sucked-out")}\n\n${loseCrew(ctx, false)}`, scrapOnly(g, "low"));
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, tx("wiki.cited-missing.engi-schematic-saved"), offer);
      return true;
    }
    if (name === "save-selves") {
      done(g, tx("wiki.cited-missing.engi-selves"), scrapOnly(g, "low"));
      return true;
    }
    if (name === "scan-engi") {
      const offer = scrapOnly(g, "low");
      offer.crew = tx("wiki.surrender.engi");
      done(g, tx("wiki.cited-missing.engi-scan-saved"), offer);
      return true;
    }
    if (name === "scan-drone") {
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(g, tx("wiki.cited-missing.engi-scan-drone"), offer);
      return true;
    }
  }

  if (slug === "lanius-with-federation-science-craft") {
    if (name === "ask") {
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(g, `${tx("wiki.cited-missing.lanius-weapon")}\n\n${grantRandomItem(g, "weapon")}`);
        return true;
      }
      if (branch === 1) {
        const offer = scrapOnly(g, "medium");
        offer.parts = 1;
        done(g, tx("wiki.cited-missing.lanius-parts"), offer);
        return true;
      }
      if (branch === 2) {
        done(g, tx("wiki.cited-missing.lanius-scrap"), scrapOnly(g, "medium"));
        return true;
      }
      done(g, tx("wiki.cited-missing.lanius-nothing"));
      return true;
    }
    if (name === "lanius") {
      const branch = ctx.irand(3);
      const kind = (["weapon", "drone", "augment"] as const)[branch]!;
      done(g, `${tx("wiki.cited-missing.lanius-blue")}\n\n${grantRandomItem(g, kind)}`);
      return true;
    }
    if (name === "leave") {
      done(g, tx("wiki.cited-missing.lanius-leave"));
      return true;
    }
  }

  if (slug === "free-scrap-with-resources-engi" || slug === "free-scrap-with-resources-zoltan") {
    if (name === "take") {
      done(g, tx("wiki.cited-missing.standard-gift"), rollStandard(g));
      return true;
    }
  }

  if (slug === "fight-in-last-stand") {
    const hull = name.startsWith("go:") ? name.slice(3) : rollHull(g, "fight-in-last-stand");
    ctx.fight(hull, undefined, "fight-in-last-stand");
    return true;
  }

  if (slug === "slug-oxygen-malfunction") {
    if (name === "send") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        done(g, tx("wiki.cited-missing.oxygen-fixed"), scrapOnly(g, "high"));
        return true;
      }
      if (branch === 1) {
        ctx.note(tx("wiki.cited-missing.oxygen-boarded"));
        ctx.fight("Slug ship");
        slugBoarders(g, 1, 3);
        return true;
      }
      ctx.note(`${tx("wiki.cited-missing.oxygen-shot")}\n\n${loseCrew(ctx, false)}`);
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "ignore") {
      done(g, tx("wiki.cited-missing.oxygen-ignore"));
      return true;
    }
    if (name === "mantis") {
      done(g, tx("wiki.cited-missing.oxygen-mantis"), scrapOnly(g, "high"));
      return true;
    }
  }

  if (slug === "slug-repair-station") {
    if (name === "no") {
      done(g, tx("wiki.cited-missing.repair-no"));
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
        ctx.note(tx("wiki.cited-missing.repair-ambush"));
        ctx.fight("Slug ship");
        return true;
      }
      card(g, tx("wiki.cited-missing.repair-price"), [
        { id: "c:slug-repair-station:accept50", label: tx("wiki.cited-missing.accept-50") },
        { id: "c:slug-repair-station:decline50", label: tx("wiki.cited-missing.decline") },
      ]);
      return true;
    }
    if (name === "accept50") {
      g.scrap -= 50;
      done(g, tx("wiki.cited-missing.repair-paid"), repairs(10));
      return true;
    }
    if (name === "decline50") {
      done(g, tx("wiki.cited-missing.repair-declined"));
      return true;
    }
    if (name === "demand") {
      if (ctx.irand(2) === 0) {
        card(g, tx("wiki.cited-missing.repair-fuel-demand"), [
          { id: "c:slug-repair-station:fuel", label: tx("wiki.cited-missing.give-15-fuel") },
          { id: "c:slug-repair-station:ridiculous", label: tx("wiki.cited-missing.thats-ridiculous") },
        ]);
      } else {
        card(g, tx("wiki.cited-missing.repair-scrap-demand"), [
          { id: "c:slug-repair-station:scrap50", label: tx("wiki.cited-missing.give-50-scrap") },
          { id: "c:slug-repair-station:half", label: tx("wiki.cited-missing.lets-get-out") },
        ]);
      }
      return true;
    }
    if (name === "fuel") {
      g.fuel -= 15;
      done(g, tx("wiki.cited-missing.nothing-else"));
      return true;
    }
    if (name === "ridiculous") {
      g.player.hull = Math.max(0, g.player.hull - 5);
      const sys = hurtRandom(ctx);
      ctx.note(tx("wiki.cited-events.hull-damage", { v: 5 }));
      if (sys) ctx.note(sys);
      if (g.player.hull <= 0) {
        defeat(g);
        return true;
      }
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "scrap50") {
      g.scrap -= 50;
      done(g, tx("wiki.cited-missing.nothing-else"));
      return true;
    }
    if (name === "half") {
      halfFight(ctx);
      return true;
    }
  }

  if (slug === "slug-store-ship") {
    if (name === "decline") {
      done(g, tx("wiki.cited-missing.store-decline"));
      return true;
    }
    if (name === "ask") {
      card(g, tx("wiki.cited-missing.store-rules"), [
        { id: "c:slug-store-ship:understood", label: tx("wiki.cited-missing.understood") },
        { id: "c:slug-store-ship:forget-outer", label: tx("wiki.cited-missing.forget-this") },
        { id: "c:slug-store-ship:slug", label: tx("wiki.cited-missing.slug-senses-someone") },
      ]);
      return true;
    }
    if (name === "forget-outer") {
      done(g, tx("wiki.cited-missing.store-forget-outer"));
      return true;
    }
    if (name === "slug") {
      ctx.note(tx("wiki.cited-missing.store-slug-caught"));
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "understood") {
      card(g, tx("wiki.cited-missing.store-liability"), [
        { id: "c:slug-store-ship:ok", label: tx("wiki.cited-missing.not-a-problem") },
        { id: "c:slug-store-ship:forget-inner", label: tx("wiki.cited-missing.forget-this") },
      ]);
      return true;
    }
    if (name === "ok") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        const fuel = rollFuel(id, (lo, hi) => span(ctx, lo, hi));
        g.fuel += fuel;
        ctx.note(tx("wiki.surrender.fuel", { fuel }));
        openStoreHere(g);
        return true;
      }
      if (branch === 1) {
        ctx.note(tx("wiki.cited-missing.store-die"));
        slugFight(ctx, 2);
        return true;
      }
      ctx.note(tx("wiki.cited-missing.store-weapons-down"));
      sealFight(ctx, 1);
      return true;
    }
    if (name === "weapons") {
      ctx.note(tx("wiki.cited-missing.store-weapons-down"));
      sealFight(ctx, 1);
      return true;
    }
    if (name === "forget-inner") {
      if (ctx.irand(2) === 0) {
        ctx.note(tx("wiki.cited-missing.store-red-alert"));
        slugFight(ctx, 1);
        return true;
      }
      done(g, tx("wiki.cited-missing.store-impatient"));
      return true;
    }
  }

  if (slug === "no-fuel-slug-fuel-trader") {
    if (name === "pay") return payFifteen(ctx, id, ctx.irand(2) === 1);
    if (name === "slug") {
      // Wiki citations:
      // > "You receive Fuel gained: 5 and lose Scrap lost: 15." — [[No fuel: Slug fuel trader]]
      return payFifteen(ctx, id, false);
    }
    if (name === "ignore") {
      // Wiki citations:
      // > "You know better than to do business with a Slugman who seems like he knows something you don't. He jumps off with another chuckle." — [[No fuel: Slug fuel trader]]
      // > "Nothing happens." — [[No fuel: Slug fuel trader]]
      done(g, tx("wiki.cited-missing.slug-trader-ignore"));
      return true;
    }
    if (name === "theft") {
      // Wiki citations:
      // > "Everything looks secure but suddenly a number of supplies disappear ! He must have planted a portable teleporter into your cargo bay somehow. Before you can react the ship is long gone." — [[No fuel: Slug fuel trader]]
      // > "You lose Missiles lost: 2-4 and Scrap lost: 20-35." — [[No fuel: Slug fuel trader]]
      const missiles = Math.min(g.missiles, span(ctx, 2, 4));
      const scrap = Math.min(g.scrap, span(ctx, 20, 35));
      g.missiles -= missiles;
      g.scrap -= scrap;
      done(g, tx("wiki.cited-missing.slug-theft", { missiles, scrap }));
      return true;
    }
  }

  if (slug === "no-fuel-drifting-debris") {
    if (name === "send") {
      // Wiki citations:
      // > "Perhaps there's some viable fuel left on board; a small away team boards the vessel." — [[No fuel: drifting debris]]
      card(g, tx("wiki.cited-missing.debris-board"), [
        { id: "c:no-fuel-drifting-debris:report", label: tx("wiki.cited-missing.report") },
      ]);
      return true;
    }
    if (name === "report") {
      // Wiki citations:
      // > "One of the crew reports that the main computer was housed in this section and is still partially operational. They're able to download local telemetry as well the location of the ship's reserve fuel! Your map has been updated." — [[No fuel: drifting debris]]
      // > "You receive medium fuel and the current sector map is revealed." — [[No fuel: drifting debris]]
      // > "The team returns home rather sooner than expected. Turns out just as they were making entry to the frigate, the ship's emergency fuel cell just happened to drift by!" — [[No fuel: drifting debris]]
      // > "You receive medium fuel." — [[No fuel: drifting debris]]
      // > "A short time later the team returns with a stash of ammunition and scrap - but all the fuel on board is long gone." — [[No fuel: drifting debris]]
      // > "You receive medium missiles and scrap." — [[No fuel: drifting debris]]
      // > "The away team reports in, but then screams are heard and the comm goes dead! When it comes back online a Rockman can be heard - he's the lone survivor from the frigate's crew, and completely mad. He demands you pay a scrap ransom in return for your crew-member's life!" — [[No fuel: drifting debris]]
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(g, `${tx("wiki.cited-missing.debris-map")} ${tx("wiki.cited-events.the-current-sector-map-is-revealed")}`, fuelOnly(g, "medium"));
        return true;
      }
      if (branch === 1) {
        done(g, tx("wiki.cited-missing.debris-cell"), fuelOnly(g, "medium"));
        return true;
      }
      if (branch === 2) {
        const offer = scrapOnly(g, "medium");
        offer.missiles = between(g, [2, 4]);
        done(g, tx("wiki.cited-missing.debris-ammo"), offer);
        return true;
      }
      const cost = between(g, [25, 40]);
      // Wiki citations:
      // > "You lose Scrap lost: 25-40." — [[No fuel: drifting debris]]
      card(g, tx("wiki.cited-missing.debris-ransom"), [
        { id: `c:no-fuel-drifting-debris:pay:${cost}`, label: tx("wiki.cited-missing.pay-ransom", { cost }) },
        { id: "c:no-fuel-drifting-debris:refuse", label: tx("wiki.cited-missing.refuse") },
      ]);
      return true;
    }
    if (name.startsWith("pay:")) {
      // Wiki citations:
      // > "Despite his fragile condition, the Rockman is good to his word and returns your crew-member, who is suitably grateful. Sadly, gratitude doesn't power the FTL drive." — [[No fuel: drifting debris]]
      const cost = Number(name.slice(4));
      if (g.scrap < cost) return false;
      g.scrap -= cost;
      done(g, tx("wiki.cited-missing.debris-paid", { cost }));
      return true;
    }
    if (name === "refuse") {
      // Wiki citations:
      // > "It's a tough call, but it's for the Federation and the liberty of all. You set off before you can change your mind." — [[No fuel: drifting debris]]
      // > "You lose a crewmember." — [[No fuel: drifting debris]]
      // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
      done(g, `${tx("wiki.cited-missing.debris-refused")}\n\n${loseCrew(ctx, true, true)}`);
      return true;
    }
    if (name === "drift") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: drifting debris]]
      done(g, tx("wiki.cited-events.nothing-happens"));
      return true;
    }
    if (name === "scan") {
      // Wiki citations:
      // > "The ship appears to be entirely lifeless. Your crew is able to find some usable fuel cells after a brief search." — [[No fuel: drifting debris]]
      // > "You receive medium fuel." — [[No fuel: drifting debris]]
      done(g, tx("wiki.cited-missing.debris-scan"), fuelOnly(g, "medium"));
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
      if (ctx.irand(2) === 0) done(g, tx("wiki.cited-missing.pity-fuel"), {
        tier: "low",
        scrap: 0,
        eligible: 0,
        fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
        missiles: 0,
        parts: 0,
      });
      else done(g, tx("wiki.cited-missing.discussion-ends"));
      return true;
    }
    if (name === "walk") {
      done(g, tx("wiki.cited-missing.captain-leaves"));
      return true;
    }
  }

  if (slug === "no-fuel-prepare-to-dock") {
    if (name === "accept") {
      // Wiki citations:
      // > "They pull close to your ship and unload some fuel saying, \"Try not to run out of fuel again. These are dangerous times; who knows who could have showed up.\"" — [[No fuel: prepare to dock]]
      // > "You receive Fuel gained: 2-6." — [[No fuel: prepare to dock]]
      // > "They approach and dock with your ship. On board they present an offer." — [[No fuel: prepare to dock]]
      // > "Gladly Trade. [ the actual trade offer is shown ]" — [[No fuel: prepare to dock]]
      // > "Respectfully Decline." — [[No fuel: prepare to dock]]
      // > "As they approach, you detect their weapons powering up. It seems their intentions are hostile!" — [[No fuel: prepare to dock]]
      // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      // > "As their ship pulls up next to yours, their captain continues, \"Yes, we'll certainly help... Help to relieve you of that nice ship!\" Sensors detect a hidden teleporter has been activated. We've been boarded!" — [[No fuel: prepare to dock]]
      // > "2-3 human boarders beam aboard your ship and you fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(g, tx("wiki.cited-missing.dock-fuel"), {
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
        showTrader(g, slug, tx("wiki.cited-missing.dock-and-trade"));
        return true;
      }
      if (branch === 2) {
        ctx.note(tx("wiki.cited-missing.dock-hostile"));
        pirateFight(ctx, "no-fuel-prepare-dock-90");
        return true;
      }
      ctx.note(tx("wiki.cited-missing.dock-boarded"));
      pirateFight(ctx, "no-fuel-prepare-dock-80", true);
      return true;
    }
    if (name === "distance") {
      // Wiki citations:
      // > "\"I assure you that we mean no harm. See, we'll send some fuel over on a transport.\" A small ship docks and offloads some fuel just as they said. They leave, saying, \"Stay cautious, friend.\"" — [[No fuel: prepare to dock]]
      // > "You receive Fuel gained: 1-4." — [[No fuel: prepare to dock]]
      // > "They reply,\"Keep our distance? Let's see if you can stop us!\" They power up their weapons and advance." — [[No fuel: prepare to dock]]
      // > "Fight a Pirate ship (default rewards). (80 seconds escape countdown timer if not interrupted)" — [[No fuel: prepare to dock]]
      // > "\"No one trusts anyone these days...\" The ship jumps away." — [[No fuel: prepare to dock]]
      // > "Nothing happens." — [[No fuel: prepare to dock]]
      const branch = ctx.irand(3);
      if (branch === 0) {
        done(g, tx("wiki.cited-missing.distance-fuel"), {
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
        ctx.note(tx("wiki.cited-missing.distance-fight"));
        pirateFight(ctx, "no-fuel-prepare-dock-80");
        return true;
      }
      done(g, tx("wiki.cited-missing.distance-leave"));
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      // Wiki citations:
      // > "Scan the ship." — [[No fuel: prepare to dock]]
      card(g, tx("wiki.cited-missing.scan-the-ship"), [
        { id: "c:no-fuel-prepare-to-dock:scan", label: tx("wiki.cited-missing.continue") },
      ]);
      return true;
    }
    if (name === "scan") {
      // Wiki citations:
      // > "Sensors indicate their ship is without military-grade weaponry, even small arms. You allow them to dock and they give you some fuel saying, \"I remember a time when we didn't have to be so paranoid about each others' intentions... Stay safe.\"" — [[No fuel: prepare to dock#Scan the ship]]
      // > "You receive Fuel gained: 3-7." — [[No fuel: prepare to dock#Scan the ship]]
      // > "Sensors are picking up armed crew and considerably more weaponry than is legal for a craft of this size. This is surely a trap." — [[No fuel: prepare to dock#Scan the ship]]
      // > "Power up weapons and prepare for a fight." — [[No fuel: prepare to dock#Scan the ship]]
      // > "(Cloaking) Cloak and get out of scanning range before they have a chance to lock on." — [[No fuel: prepare to dock#Scan the ship]]
      if (ctx.irand(2) === 0) {
        done(g, tx("wiki.cited-missing.scan-safe"), {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
        return true;
      }
      card(g, tx("wiki.cited-missing.scan-trap"), [
        { id: "c:no-fuel-prepare-to-dock:trap", label: tx("wiki.cited-missing.power-weapons") },
        { id: "c:no-fuel-prepare-to-dock:cloak", label: tx("wiki.cited-missing.cloak-away") },
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
      // > "Your highly advanced cloaking system allows you to get out of range easily since they were still out of firing range. Eventually the ship jumps away." — [[No fuel: prepare to dock#Scan the ship]]
      // > "Nothing happens." — [[No fuel: prepare to dock#Scan the ship]]
      done(g, tx("wiki.cited-missing.cloak-clear"));
      return true;
    }
  }

  if (slug === "no-fuel-refugee-trading") {
    if (name === "low") {
      // Wiki citations:
      // > "You receive low fuel." — [[No fuel: refugee trading]]
      done(g, tx("wiki.cited-missing.refugee-low-fuel"), fuelOnly(g, "low"));
      return true;
    }
    if (name === "trade" || name === "better" || name === "again") return betterTrade(ctx, id);
    if (name === "engi") {
      // Wiki citations:
      // > "Your Engi analyzes scans of the extensive damage to their hull, calculating potential repair costs. The refugees grumble and protest, but in the end, they admit that their need for repairs is greater than their fuel surplus and offer a better trade." — [[No fuel: refugee trading]]
      // > "Accept it. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: refugee trading]]
      // > "Refuse it." — [[No fuel: refugee trading]]
      card(g, tx("wiki.cited-missing.refugee-engi"), [
        { id: "c:no-fuel-refugee-trading:better", label: tx("wiki.cited-missing.accept-6-for-10") },
        { id: "c:no-fuel-refugee-trading:better-no", label: tx("wiki.cited-missing.refuse") },
      ]);
      return true;
    }
    if (name === "better-no" || name === "again-no") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: refugee trading]]
      done(g, tx("wiki.cited-events.nothing-happens"));
      return true;
    }
    if (name === "refuse") {
      // Wiki citations:
      // > "The refugee ship cuts communications and jumps from the system without another word, the galactic equivalent of giving you the cold shoulder." — [[No fuel: refugee trading]]
      // > "The refugees become desperate at your refusal - apparently, their hull is even more damaged than it first appears. Almost begging, they offer a better trade than before." — [[No fuel: refugee trading]]
      // > "Refuse their offer again." — [[No fuel: refugee trading]]
      if (ctx.irand(2) === 0) done(g, tx("wiki.cited-missing.refugee-cold"));
      else {
        card(g, tx("wiki.cited-missing.refugee-desperate"), [
          { id: "c:no-fuel-refugee-trading:again", label: tx("wiki.cited-missing.accept-6-for-10") },
          { id: "c:no-fuel-refugee-trading:again-no", label: tx("wiki.cited-missing.refuse-again") },
        ]);
      }
      return true;
    }
    if (name === "attack") {
      // Wiki citations:
      // > "Panicked, the refugees immediately surrender as your weapons power up. They pass along their fuel and what few other supplies they have left in exchange for their lives." — [[No fuel: refugee trading]]
      // > "You receive medium fuel and scrap." — [[No fuel: refugee trading]]
      done(g, tx("wiki.cited-missing.refugee-surrender"), fuelAndScrap(g, "medium"));
      return true;
    }
    if (name === "missiles") {
      // Wiki citations:
      // > "The refugee ship makes the exchange, and wishes you well on your mission." — [[No fuel: refugee trading]]
      // > "You lose Missiles lost: 1 and receive Fuel gained: 5-7." — [[No fuel: refugee trading]]
      // > "Having traded supplies, the ship suddenly powers up and attacks - it's a pirate ship!" — [[No fuel: refugee trading]]
      // > "You lose Missiles lost: 1, receive Fuel gained: 5-7, and you fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
      g.missiles -= 1;
      const fuel = rollFuel(id, (lo, hi) => span(ctx, lo, hi));
      g.fuel += fuel;
      if (ctx.irand(2) === 0) {
        done(g, tx("wiki.cited-missing.refugee-missile-trade", { fuel }));
        return true;
      }
      ctx.note(tx("wiki.cited-missing.refugee-missile-trap", { fuel }));
      ctx.fight("Pirate ship", undefined, "no-fuel-refugee-trading");
      return true;
    }
    if (name === "arm-no") {
      // Wiki citations:
      // > "2× Taking your reluctance as weakness, the refugee ship suddenly bristles with weapons - it's a pirate ship, and it believes it's found easy prey!" — [[No fuel: refugee trading]]
      // > "Fight a Pirate ship (default rewards). (90 seconds escape countdown timer if not interrupted)" — [[No fuel: refugee trading]]
      // > "Sensing your reluctance, the refugee ship nevertheless parts with a small amount of fuel. It warns you to leave the sector as quickly as possible before it is overtaken by Rebels, then it jumps and vanishes to parts unknown." — [[No fuel: refugee trading]]
      // > "You receive low fuel." — [[No fuel: refugee trading]]
      // > "The refugee ship apologizes, but they need their fuel. They wish you well, and then vanish from the system." — [[No fuel: refugee trading]]
      // > "Nothing happens." — [[No fuel: refugee trading]]
      const branch = pickW(ctx, [2, 1, 1]);
      if (branch === 0) {
        ctx.note(tx("wiki.cited-missing.refugee-prey"));
        ctx.fight("Pirate ship", undefined, "no-fuel-refugee-trading");
        return true;
      }
      if (branch === 1) {
        done(g, tx("wiki.cited-missing.refugee-small-fuel"), fuelOnly(g, "low"));
        return true;
      }
      done(g, tx("wiki.cited-missing.refugee-apologizes"));
      return true;
    }
  }

  return null;
}

const ENGINE_WIN_DESTROYED = tx("wiki.cited-missing.repair-engines-destroyed");
const ENGINE_WIN_CREW = tx("wiki.cited-missing.repair-engines-crew");
const HALF_WIN_DESTROYED = tx("wiki.cited-missing.repair-weapons-destroyed");
const HALF_WIN_CREW = tx("wiki.cited-missing.repair-weapons-crew");

/** Slug repair station wins that replace default salvage. */
export function missingPageWin(g: Game, slug: string | null | undefined, deadCrew: boolean): boolean {
  if (slug !== "slug-repair-engines" && slug !== "slug-repair-half") return false;
  const text = slug === "slug-repair-engines"
    ? (deadCrew ? ENGINE_WIN_CREW : ENGINE_WIN_DESTROYED)
    : (deadCrew ? HALF_WIN_CREW : HALF_WIN_DESTROYED);
  const tier: SurrenderTier = slug === "slug-repair-half" || deadCrew ? "high" : "medium";
  done(g, text, rollStandard(g, tier));
  g.sfx.push("win");
  return true;
}
