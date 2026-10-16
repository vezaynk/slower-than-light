/**
 * Location pages that were still only a title or a plain hostile ship.
 * Sibling results with no printed odds roll equally (INFERRED). {{DuplicateEvent|N}} counts N times.
 * An unnamed weapon, drone schematic, or augmentation is grantRandomItem. A crystal weapon is an even
 * draw of the crystal guns already in the game. Out-of-fuel pages name no sector; they join the wait roll only.
 */
import { eventDef } from "@stl/pack";
import { EXTRA_EVENTS } from "./cited-missing-pages.ts";
import { ownedLock } from "./choice-locks.ts";
import { priced, rollPrice } from "./event-prices.ts";
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

const OWNED = new Set(
  EXTRA_EVENTS.map((ev) => ev.slug).concat([
    "no-fuel-slug-fuel-trader",
    "no-fuel-drifting-debris",
    "no-fuel-fuel-trader-distress-off",
    "no-fuel-fuel-trader-distress-on",
    "no-fuel-prepare-to-dock",
    "no-fuel-refugee-trading",
  ]),
);

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
  if (!noClone && g.player.kits.cradle) return "The lost crewmember is revived.";
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[ctx.irand(mine.length)]!;
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  const line = `${lost.name} is lost.`;
  // Drifting debris prints the Clone Bay's silence. Buried leave prints no such line.
  // Wiki citations:
  // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
  if (quiet && g.player.kits.cradle)
    return `${line} ${"Before preparing to jump you check the Clone Bay but there is no sign of activity."}`;
  return line;
}

function fleetJump(ctx: Ctx) {
  ctx.g.fleet += 1;
  ctx.note("Rebel Fleet pursuit is doubled for 1 jump.");
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

function offerLine(fuel: number, kind: PayKind, amt: number): string {
  return `You receive ${fuel} fuel and lose ${amt} ${payWord(kind)}.`;
}

/** Fuel-trader rows of one band. The draw stays between: the row, then the fuel, then the payment. */
function fuelRows(id: string, band: "high" | "pt2") {
  const rows = [];
  for (const row of eventDef(id)?.offers ?? [])
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
    { id: `c:${slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`, label: "Gladly trade." },
    { id: `c:${slug}:decline`, label: "Respectfully decline." },
  ]);
}

function showPt2(ctx: Ctx, slug: string) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    done(
      ctx.g,
      'Before they jump away, their captain says, "I\'m sorry, but we are unable to help in any other way."',
    );
    return;
  }
  const offer = rollTrade(ctx.g, fuelRows(slug, branch === 0 ? "pt2" : "high"));
  const kind = branch === 0 ? "pt2" : "high2";
  const intro =
    branch === 0
      ? 'They respond: "Seeing that you\'re in need, is this trade acceptable?"'
      : '"I\'m not doing this for charity, you know," says their captain. "This is the only other way I\'ll part with my fuel."';
  card(ctx.g, `${intro}\n\n${offerLine(offer.fuel, offer.kind, offer.amt)}`, [
    {
      id: `c:${slug}:${kind}:${offer.fuel}:${offer.kind}:${offer.amt}`,
      label: "Accept the offer.",
    },
    {
      id: branch === 0 ? `c:${slug}:pity` : `c:${slug}:walk`,
      label: "Decline again.",
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
  return `${room?.title ?? id} takes 1 damage.`;
}

function investigate(ctx: Ctx) {
  const branch = ctx.irand(3);
  if (branch === 2) {
    card(
      ctx.g,
      "You send a crewmember down to check out the cache. The comm goes dead, and shortly thereafter massive gravity readings are detected on the asteroid. You must have triggered some kind of singularity booby trap! We've got to leave now before we're pulled in!",
      [
        { id: "c:crystalline-cache:pull", label: "Pull out now!" },
        {
          id: "c:crystalline-cache:detonate",
          label: "Detonate your entire fuel reserves to escape with your crew and the cargo.",
        },
        { id: "c:crystalline-cache:teleport", label: "Beam your crewmember back on board." },
        { id: "c:crystalline-cache:engines", label: "Rescue your crewmember and the cargo." },
      ],
    );
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
  done(
    ctx.g,
    `${"On arriving at the base of the crater, your team discovers a long-forgotten weapons cache. Most of the equipment is out of action, but not all of it!"}\n\n${gun}`,
    offer,
  );
}

function digCard(ctx: Ctx, second: boolean) {
  const slug = "crystalline-men-buried";
  card(
    ctx.g,
    second
      ? 'Another cycle passes while the Rebel fleet draws ever nearer. You contact the captain again. "Alien Captain, your knowledge of our customs has most impressed us. Your crewmember is on their way back to you now, along with a token of our respect."'
      : "You do as you're asked and send a crewmember down to the planet to assist. They discover a massive Crystal excavation operation and it quickly becomes clear this is a task that will take days, not hours.",
    [
      { id: `c:${slug}:${second ? "leave2" : "leave"}`, label: "Leave your crew member behind." },
      { id: `c:${slug}:${second ? "pull2" : "pull"}`, label: "Pull your guy out." },
      { id: `c:${slug}:${second ? "wait2" : "wait"}`, label: "Wait." },
    ],
  );
}

function crystalFight(ctx: Ctx) {
  ctx.note(
    'The Crystalline captain contacts you urgently: "What is the meaning of this?! Had you no wish to aid us you might simply have declined, but THIS... is an insult!" His turns his massive ship on yours and you prepare to fight for your life.',
  );
  ctx.fight("Crystal ship");
}

function demandCard(ctx: Ctx, repairsN: number) {
  const g = ctx.g;
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + repairsN);
  ctx.note(`Hull repairs: ${repairsN}.`);
  card(
    g,
    repairsN === 10
      ? "You pull up to the automatic station and after a short time they repair 10 hull damage. You begin to offer your thanks but discover that you can't detach from the station."
      : "You dock with the station hoping for a quick turnaround, but the automatic machines take their sweet time. When the process finally finishes, you notice only one damage has been repaired.",
    [{ id: "c:slug-repair-station:demand", label: "Demand an explanation." }],
  );
}

function engineFight(ctx: Ctx) {
  ctx.note(
    "As you dock with the station your readings go haywire. An EMP blast resonates throughout the ship and your engines shut down. You're a sitting duck as a ship reveals itself and silently moves in to attack!",
  );
  ctx.fight("Slug ship", undefined, "slug-repair-engines");
}

function halfFight(ctx: Ctx) {
  ctx.note(
    "You activate your thrusters and force your way away from the station. A ship quickly moves in to engage. You'll need to get out of here fast; there may not be time to get the weapons fully operational!",
  );
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
  if (boarders) humanBoarders(ctx.g, 2, 3, "human boarders beam aboard your ship.");
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

export function missingCard(
  g: Game,
  b: Beacon,
  ev: { slug: string; dest: string },
): GameEvent | null {
  if (NEBULA_ON_ARRIVAL.has(ev.slug)) b.kind = "nebula";
  if (ev.slug === "free-scrap-with-resources-engi") {
    return {
      title: ev.dest,
      body: opening(g, "free-scrap-with-resources-engi"),
      choices: [
        {
          id: "c:free-scrap-with-resources-engi:take",
          label: "You receive a random amount of scrap with resources.",
        },
      ],
    };
  }
  if (ev.slug === "fight-in-last-stand") {
    const hull = rollHull(g, "fight-in-last-stand");
    return {
      title: ev.dest,
      body: opening(g, "fight-in-last-stand"),
      choices: [{ id: `c:fight-in-last-stand:go:${hull}`, label: "Fight the scout." }],
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
      body: "A poorly armed Slug ship cruises by and offers assistance. Their captain seems to be chuckling to himself, perhaps at the prices he's charging.",
      choices: [
        { id: "c:no-fuel-slug-fuel-trader:pay", label: "Pay 15 scrap for 5 fuel." },
        { id: "c:no-fuel-slug-fuel-trader:ignore", label: "Ignore the offer." },
        { id: "c:no-fuel-slug-fuel-trader:slug", label: "Have your Slug make the purchase." },
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
      body: "As you await either salvation or death, your attention is drawn to a sea of debris drifting past the starboard view port. The chunks gliding by grow bigger in size until the stern of a Rock frigate, gutted in some distant war, comes into view.",
      choices: [
        { id: "c:no-fuel-drifting-debris:send", label: "Send an away team." },
        { id: "c:no-fuel-drifting-debris:drift", label: "Let it drift by." },
        { id: "c:no-fuel-drifting-debris:scan", label: "Run additional scans." },
      ],
    };
  }
  if (
    ev.slug === "no-fuel-fuel-trader-distress-off" ||
    ev.slug === "no-fuel-fuel-trader-distress-on"
  ) {
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
        { id: `c:${ev.slug}:buy:${offer.fuel}:${offer.kind}:${offer.amt}`, label: "Gladly trade." },
        { id: `c:${ev.slug}:decline`, label: "Respectfully decline." },
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
      body: 'A ship approaches. They hail you saying, "You need some fuel? We\'ll prepare to dock to help."',
      choices: [
        { id: "c:no-fuel-prepare-to-dock:accept", label: "Graciously accept their offer." },
        { id: "c:no-fuel-prepare-to-dock:distance", label: "Request they keep their distance." },
        {
          id: "c:no-fuel-prepare-to-dock:sensors",
          label: "Run a detailed scan with your sensors before responding.",
        },
        {
          id: "c:no-fuel-prepare-to-dock:scanners",
          label: "Run a detailed scan before responding.",
        },
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
  // > "You doubt he is trustworthy but have no choice but to make the deal. However you complete the exchange without event." — [[No fuel: Slug fuel trader]]
  // > "You receive Fuel gained: 5." — [[No fuel: Slug fuel trader]]
  // > "Continue..." — [[No fuel: Slug fuel trader]]
  if (ctx.g.scrap < 15) return false;
  ctx.g.scrap -= 15;
  ctx.g.fuel += rollFuel(id, (lo, hi) => span(ctx, lo, hi));
  const text =
    "You doubt he is trustworthy but have no choice but to make the deal. However you complete the exchange without event. You receive 5 fuel.";
  if (!theft) {
    done(ctx.g, text);
    return true;
  }
  card(ctx.g, text, [{ id: "c:no-fuel-slug-fuel-trader:theft", label: "Continue" }]);
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
    id === "c:no-fuel-refugee-trading:trade"
      ? "The refugees thank you for the parts, and gladly pass along the much-needed fuel. They wish you well on your mission, and declare their support for the Federation."
      : "You receive 6 fuel and lose 10 scrap.",
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
      card(g, '"What do you eat? What is your culture like? How long do your people live?"', [
        { id: "c:crystal-chat:answer", label: "Try to answer his questions." },
        { id: "c:crystal-chat:busy", label: "I don't have time for this." },
      ]);
      return true;
    }
    if (name === "no") {
      done(
        g,
        '"I see. Oh well. Maybe the next alien I meet will be nicer..." You prepare to jump.',
      );
      return true;
    }
    if (name === "busy") {
      done(g, '"I see... I guess you\'re busy."');
      return true;
    }
    if (name === "answer") {
      const branch = ctx.irand(3);
      if (branch === 0) {
        ctx.note(
          "You speak at length about nothing particularly interesting. \"Wow, thanks. Oh look, another alien ship! I wonder if they're as nice as you.\" Seeing the Rebel decals you doubt they're friendly. They spot you and move in to attack, while the Crystalline civilian jumps away.",
        );
        ctx.fight("Rebel ship");
        return true;
      }
      if (branch === 1) {
        done(
          g,
          'You speak at length about nothing particularly interesting. "Wow, thanks! I don\'t know if this is of any use to you, but we have some supplies we can offer you. Perhaps you can use them on your trip!"',
          rollSurrenderOffer(g),
        );
        return true;
      }
      done(
        g,
        'You speak at length about nothing particularly interesting. "Wow, thanks! Perhaps we can fix up a bit of your hull for sating my curiosity. We\'re pretty handy with repairs."',
        repairs(6),
      );
      return true;
    }
    if (name === "crystal") {
      const tier = (["low", "medium", "high"] as const)[ctx.irand(3)]!;
      done(
        g,
        "\"Wow, you're one of us! I didn't know we made an alliance with the aliens. I guess I won't bother you, but here, have some of our extra supplies!\"",
        fuelAndScrap(g, tier),
      );
      return true;
    }
  }

  if (slug === "crystalline-cache") {
    if (name === "weapons") {
      if (ctx.irand(2) === 0)
        done(
          g,
          "You fire everything you have, but the crystal barrier remains strong. After a time you give up and move on.",
        );
      else investigate(ctx);
      return true;
    }
    if (name === "breach") {
      g.missiles -= 1;
      ctx.note(
        "Your Breach warheads dislodge and shatter a massive shard of crystal, leaving your away team enough space to climb down and take a look.",
      );
      investigate(ctx);
      return true;
    }
    if (name === "crystal") {
      investigate(ctx);
      return true;
    }
    if (name === "pull") {
      done(
        g,
        `${"You push the impulse engines to their limit and are able to break out of the gravity well. Your crewmember, along with the stockpile, is reduced to the size of a tennis ball — but you're left in one piece."}\n\n${loseCrew(ctx, false)}`,
      );
      return true;
    }
    if (name === "detonate") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      const loss = cacheFuelLoss(g.fuel, offer.fuel);
      const text = loss
        ? `${"You swoop into the heart of the distortion and pick up your crewmember and the cargo. You then eject your FTL fuel and ignite it, sending a shock wave that thrust your ship well beyond the event horizon of the singularity. That was close."} ${`You lose ${loss} fuel.`}`
        : "You swoop into the heart of the distortion and pick up your crewmember and the cargo. You then eject your FTL fuel and ignite it, sending a shock wave that thrust your ship well beyond the event horizon of the singularity. That was close.";
      done(g, text, offer);
      g.fuel = Math.max(0, g.fuel - loss);
      return true;
    }
    if (name === "teleport") {
      done(
        g,
        "You floor the engines to escape the gravity well while trying to get a teleporter lock on your crewmember despite the massive interference. You're barely able to get them back on board before the entire area is consumed into the singularity.",
      );
      return true;
    }
    if (name === "engines") {
      const offer = rollSurrenderOffer(g, "low", true);
      offer.random = "weapon";
      done(
        g,
        "You swoop into the heart of the distortion and pick up your crewmember and the cargo. Your top of the line impulse engines are barely able to get your ship out with the gravity well before the whole ship is consumed. That was close.",
        offer,
      );
      return true;
    }
  }

  if (slug === "crystalline-men-buried") {
    if (name === "send") {
      digCard(ctx, false);
      return true;
    }
    if (name === "refuse") {
      done(
        g,
        '"We understand. You rely on machines for so much. Yours is a soft and weak species — we would hardly even have noticed your presence. Fly well."',
      );
      return true;
    }
    if (name === "leave" || name === "leave2") {
      const tier = name === "leave" ? "medium" : "high";
      const lost = loseCrew(ctx, true);
      done(
        g,
        `${"You're committed to both saving the Federation and upholding the principles it worked to maintain. Your crewmember will remain and make good on the promise — you still have a galaxy to save. They give you some supplies for your trouble."}\n\n${lost}`,
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
      const line = weaponLine(g, "heavycrystal2");
      fleetJump(ctx);
      done(
        g,
        `${"You receive Heavy Crystal Mark II."}\n\n${line}\n\n${"Rebel Fleet pursuit is doubled for 1 jump."}`,
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
          `${'After a short time the scientist returns, "We... must regret... we have made a grave miscalculation. Your bodies are considerably more fragile than we expected and your companion is... broken. We apologize and offer a fine military-grade weapon as consolation."'}\n\n${loseCrew(ctx, false)}`,
          offer,
        );
        return true;
      }
      if (branch === 1) {
        done(
          g,
          'Your crew member is brought on board their station and forced to undergo a few quick scans and tests. "Thank you for this opportunity! We hope to learn much from your kind." They transfer some supplies as payment.',
          rollSurrenderOffer(g, "medium"),
        );
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(
        g,
        "The large Crystalline Beings escort your crew onto the station and gingerly help them into a scanning chamber. After a few seconds, they inform you they have mapped their entire genome and have everything they need. They give you a schematic as compensation.",
        offer,
      );
      return true;
    }
    if (name === "refuse") {
      if (pickW(ctx, [2, 1]) === 0)
        done(
          g,
          '"I see. That is a shame. Perhaps the next aliens we meet will have some respect for the advancement of science."',
        );
      else {
        ctx.note(
          '"I see. That is a shame. However we must not let this opportunity pass us by. Submit and you will be treated reasonably well!" A military ship docked nearby detaches and charges you.',
        );
        ctx.fight("Crystal ship");
      }
      return true;
    }
    if (name === "rock") {
      done(
        g,
        '"Ah! My dear evolutionary cousin! This is truly wonderful! We have countless historical records of your kind but we lack information on the past few hundreds of years. We can learn so much from these scans, we must get to analysing them as soon as possible! Please, take this."',
        rollStandard(g, "medium"),
      );
      return true;
    }
    if (name === "dna") {
      const offer = scrapOnly(g, "medium");
      offer.random = "weapon";
      done(
        g,
        '"What is this? Full genetic and personal profiles stored digitally? I did not think this possible... This will help our research immeasurably. Please, take this in exchange for your help."',
        offer,
      );
      return true;
    }
  }

  if (slug === "engi-research-station") {
    if (name === "board") {
      if (ctx.irand(2) === 0)
        done(
          g,
          "You send an away team to investigate, but there's nothing save for the acidic stench of burnt Engi parts. This place is dead.",
        );
      else {
        card(
          g,
          "Your away team reports a wounded Engi and a functioning drone schematic. Then someone yells. The station reactor is overloading and they're running out of time!",
          [
            { id: "c:engi-research-station:save-engi", label: "Save the Engi!" },
            { id: "c:engi-research-station:save-schematic", label: "Save the drone schematic." },
            { id: "c:engi-research-station:save-selves", label: "Save yourselves!" },
          ],
        );
      }
      return true;
    }
    if (name === "ignore") {
      done(g, "The place looks in bad state, probably nothing of use there. Time to move on.");
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      card(
        g,
        "Scans reveal the station's reactor is overloading! Not only that, but an injured Engi and a functioning drone schematic are still on board! There's not time for both...",
        [
          { id: "c:engi-research-station:scan-engi", label: "Save the Engi!" },
          { id: "c:engi-research-station:scan-drone", label: "Save the drone schematic." },
        ],
      );
      return true;
    }
    if (name === "save-engi") {
      const lost = ctx.irand(2) === 0 ? loseCrew(ctx, false) : "";
      const offer = scrapOnly(g, "low");
      offer.crew = "Engi";
      done(
        g,
        `${lost || "Your crew return safely to the airlock with the injured Engi and you put some distance on the station before it blows. The Engi, impressed by your crew, volunteers to join you."}`,
        offer,
      );
      return true;
    }
    if (name === "save-schematic") {
      if (ctx.irand(2) === 0) {
        done(
          g,
          `${"Your away team heads home with the goods, but as they transfer back to the ship, a small explosion blows the airlock and one of the crew is sucked out into space!"}\n\n${loseCrew(ctx, false)}`,
          scrapOnly(g, "low"),
        );
        return true;
      }
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(
        g,
        "The Engi don't feel things the same way other species do. They'd want the tech to be saved. Your crew return safely to the airlock with the drone control and you put some distance on the station before it blows.",
        offer,
      );
      return true;
    }
    if (name === "save-selves") {
      done(
        g,
        "It's a tough order, but your crew's lives are the priority. They drop everything and return to ship unharmed. You put some distance on the station before it blows.",
        scrapOnly(g, "low"),
      );
      return true;
    }
    if (name === "scan-engi") {
      const offer = scrapOnly(g, "low");
      offer.crew = "Engi";
      done(
        g,
        "Your away team heads straight for the Engi and returns with time to spare. You put some distance on the station before it blows and the Engi is so impressed by your crew that they volunteer to join you!",
        offer,
      );
      return true;
    }
    if (name === "scan-drone") {
      const offer = scrapOnly(g, "low");
      offer.random = "drone";
      done(
        g,
        "The Engi don't feel things the same way other species do. They'd want the tech to be saved. Your away team heads straight for the goods and returns with time to spare. You put some distance on the station before it blows.",
        offer,
      );
      return true;
    }
  }

  if (slug === "lanius-with-federation-science-craft") {
    if (name === "ask") {
      const branch = ctx.irand(4);
      if (branch === 0) {
        done(
          g,
          `${'"We were doing research on some Lanius weaponry before. I hope you don\'t have to use it but perhaps it will aid you on your mission." You thank them and prepare to move on.'}\n\n${grantRandomItem(g, "weapon")}`,
        );
        return true;
      }
      if (branch === 1) {
        const offer = scrapOnly(g, "medium");
        offer.parts = 1;
        done(
          g,
          '"We use drones frequently in our work and have extra parts lying around." They transfer the parts over and you thank them for their generosity.',
          offer,
        );
        return true;
      }
      if (branch === 2) {
        done(
          g,
          '"There should be some extra junk metal in some cargo bay..." You thank them once they transfer the scrap and prepare to move on.',
          scrapOnly(g, "medium"),
        );
        return true;
      }
      done(
        g,
        '"Sorry we don\'t carry much equipment that would be of use to a military vessel." You thank them and prepare to move on.',
      );
      return true;
    }
    if (name === "lanius") {
      const branch = ctx.irand(3);
      const kind = (["weapon", "drone", "augment"] as const)[branch]!;
      done(
        g,
        `${"Your Lanius crew had tweaked the ship's translator to slowly improve itself over time. They are grateful for your contribution and offer you some Lanius equipment that they were previously studying."}\n\n${grantRandomItem(g, kind)}`,
      );
      return true;
    }
    if (name === "leave") {
      done(g, "You wish them well and prepare to jump.");
      return true;
    }
  }

  if (slug === "free-scrap-with-resources-engi" || slug === "free-scrap-with-resources-zoltan") {
    if (name === "take") {
      done(g, "You receive a random amount of scrap with resources.", rollStandard(g));
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
        done(
          g,
          "You cautiously board their ship and immediately smell the stale air of a malfunctioning life support. In no time at all you're able to fix up the problem and head off again with some extra scrap in your hold.",
          scrapOnly(g, "high"),
        );
        return true;
      }
      if (branch === 1) {
        ctx.note(
          "As soon as you board their ship their hostile intentions become clear. Despite being outnumbered, your crew is able to break free of the slug trap and fight back to the airlock. You pull away from the enemy ship but not before a few Slugs make it on board.",
        );
        ctx.fight("Slug ship");
        slugBoarders(g, 1, 3);
        return true;
      }
      ctx.note(
        `${"As soon as you board their ship their hostile intentions become clear. On your way back to the airlock, one of your crewmembers is taken out by a well aimed Slug blaster shot."}\n\n${loseCrew(ctx, false)}`,
      );
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "ignore") {
      done(
        g,
        "You know better than to trust the Slugs. You cut communications and prepare to jump.",
      );
      return true;
    }
    if (name === "mantis") {
      done(
        g,
        "Once on board, it becomes clear that nothing is wrong with their O2 system. Almost expecting this, your Mantis calmly responds to the trap. Once a couple of the Slugs have been spread across the walls of their ship, the rest surrender.",
        scrapOnly(g, "high"),
      );
      return true;
    }
  }

  if (slug === "slug-repair-station") {
    if (name === "no") {
      done(g, '"Too bad! Trussst iss a rare commodity these days." You prepare to jump.');
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
        ctx.note(
          "Just before the transmission is cut you hear, \"They're not falling for it. Just kill the crew and we can ssstrip...\" Looks like you're not getting out of here without a fight.",
        );
        ctx.fight("Slug ship");
        return true;
      }
      card(g, '"Ahhh. A fellow businessman. We offer to fix 10 damage for 50 ssscrap."', [
        { id: "c:slug-repair-station:accept50", label: "Accept." },
        { id: "c:slug-repair-station:decline50", label: "Decline." },
      ]);
      return true;
    }
    if (name === "accept50") {
      g.scrap -= 50;
      done(
        g,
        "You perform the transaction and watch carefully as their machines patch the hull. However, everything seems fine. Once they're complete you get ready to jump.",
        repairs(10),
      );
      return true;
    }
    if (name === "decline50") {
      done(g, '"Too bad. Farewell, traveller." Their mobile station slips into the clouds.');
      return true;
    }
    if (name === "demand") {
      if (ctx.irand(2) === 0) {
        card(
          g,
          '"We\'re glad you have enjoyed our servicessss. Perhaps some fuel would be an appropriate compensssation?"',
          [
            { id: "c:slug-repair-station:fuel", label: "Give them the 15 fuel they demand." },
            { id: "c:slug-repair-station:ridiculous", label: "That's ridiculous!" },
          ],
        );
      } else {
        card(
          g,
          "\"We're glad you have enjoyed our servicessss. Now for payment. To enssssure your cooperation we've taken the liberty of installing a limiter on your weapons system.\"",
          [
            { id: "c:slug-repair-station:scrap50", label: "Give them the 50 scrap they demand." },
            { id: "c:slug-repair-station:half", label: "Let's get out of here!" },
          ],
        );
      }
      return true;
    }
    if (name === "fuel") {
      g.fuel -= 15;
      done(g, "Nothing else happens.");
      return true;
    }
    if (name === "ridiculous") {
      g.player.hull = Math.max(0, g.player.hull - 5);
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
      g.scrap -= 50;
      done(g, "Nothing else happens.");
      return true;
    }
    if (name === "half") {
      halfFight(ctx);
      return true;
    }
  }

  if (slug === "slug-store-ship") {
    if (name === "decline") {
      done(
        g,
        '"Oh well... We ssshall wait here then." You cautiously put distance between your ships before preparing to jump.',
      );
      return true;
    }
    if (name === "ask") {
      card(
        g,
        '"Before we get ahead of ourssselves, I need to explain sssome ground ruless of our transsaction. Thesse are dangerous times, yess?" "Firssst... We accept no tradesss, couponss or refundss. Purchasess are final. Underssstand?"',
        [
          { id: "c:slug-store-ship:understood", label: "Understood." },
          { id: "c:slug-store-ship:forget-outer", label: "Forget this." },
          {
            id: "c:slug-store-ship:slug",
            label: "Our Slug senses someone aboard the ship. Investigate it.",
          },
        ],
      );
      return true;
    }
    if (name === "forget-outer") {
      done(g, '"Fine... Not everyone appreciates good dealss..."');
      return true;
    }
    if (name === "slug") {
      ctx.note(
        "It looks like the merchant was trying to stall you while someone teleported on board. You catch him before he could finish and he teleports away. You immediately prepare for battle.",
      );
      ctx.fight("Slug ship");
      return true;
    }
    if (name === "understood") {
      card(
        g,
        '"We hold no liability for productsss damaged post ssale. We offer no insurance or customer sservice. Not a problem?"',
        [
          { id: "c:slug-store-ship:ok", label: "Not a problem." },
          { id: "c:slug-store-ship:forget-inner", label: "Forget this." },
        ],
      );
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
        ctx.note(
          '"Thank you. If you could do me one more courtesssy... please die quietly." You suddenly hear gunshots aboard the ship. He must have been stalling for time while they boarded your ship!',
        );
        slugFight(ctx, 2);
        return true;
      }
      ctx.note(
        '"During our discussion, my man hass taken the liberty of disabling your weaponss to prevent any complications while completing our... transssaction..." You suddenly register multiple weapon locks, but your own weapons are not responding. Get out of there!',
      );
      sealFight(ctx, 1);
      return true;
    }
    if (name === "weapons") {
      ctx.note(
        '"During our discussion, my man hass taken the liberty of disabling your weaponss to prevent any complications while completing our... transssaction..." You suddenly register multiple weapon locks, but your own weapons are not responding. Get out of there!',
      );
      sealFight(ctx, 1);
      return true;
    }
    if (name === "forget-inner") {
      if (ctx.irand(2) === 0) {
        ctx.note(
          "You prepare to leave but notice noises in your ship. It looks like the merchant was trying to stall you while they hacked into your systems. You barely have time to order a red alert before a military ship flies through the clouds intent on your destruction!",
        );
        slugFight(ctx, 1);
        return true;
      }
      done(g, '"Very well... Impatient alienss..." You prepare to jump.');
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
      done(
        g,
        "You know better than to do business with a Slugman who seems like he knows something you don't. He jumps off with another chuckle.",
      );
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
      done(
        g,
        `Everything looks secure but suddenly a number of supplies disappear! He must have planted a portable teleporter into your cargo bay somehow. Before you can react the ship is long gone. You lose ${missiles} missiles and ${scrap} scrap.`,
      );
      return true;
    }
  }

  if (slug === "no-fuel-drifting-debris") {
    if (name === "send") {
      // Wiki citations:
      // > "Perhaps there's some viable fuel left on board; a small away team boards the vessel." — [[No fuel: drifting debris]]
      card(
        g,
        "Perhaps there's some viable fuel left on board; a small away team boards the vessel.",
        [{ id: "c:no-fuel-drifting-debris:report", label: "Report!" }],
      );
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
        done(
          g,
          `${"One of the crew reports that the main computer was housed in this section and is still partially operational. They're able to download local telemetry as well the location of the ship's reserve fuel! Your map has been updated."} ${"The current sector map is revealed."}`,
          fuelOnly(g, "medium"),
        );
        return true;
      }
      if (branch === 1) {
        done(
          g,
          "The team returns home rather sooner than expected. Turns out just as they were making entry to the frigate, the ship's emergency fuel cell just happened to drift by!",
          fuelOnly(g, "medium"),
        );
        return true;
      }
      if (branch === 2) {
        const offer = scrapOnly(g, "medium");
        offer.missiles = between(g, [2, 4]);
        done(
          g,
          "A short time later the team returns with a stash of ammunition and scrap — but all the fuel on board is long gone.",
          offer,
        );
        return true;
      }
      const cost = rollPrice("no-fuel-drifting-debris", "ransom", (lo, hi) => between(g, [lo, hi]));
      // Wiki citations:
      // > "You lose Scrap lost: 25-40." — [[No fuel: drifting debris]]
      const choices = [];
      if (cost != null) {
        choices.push({ id: `c:no-fuel-drifting-debris:pay:${cost}`, label: `Pay ${cost} scrap.` });
      }
      choices.push({ id: "c:no-fuel-drifting-debris:refuse", label: "Refuse." });
      card(
        g,
        "The away team reports in, but then screams are heard and the comm goes dead! When it comes back online a Rockman can be heard — he's the lone survivor from the frigate's crew, and completely mad. He demands you pay a scrap ransom in return for your crew-member's life!",
        choices,
      );
      return true;
    }
    if (name.startsWith("pay:")) {
      // Wiki citations:
      // > "Despite his fragile condition, the Rockman is good to his word and returns your crew-member, who is suitably grateful. Sadly, gratitude doesn't power the FTL drive." — [[No fuel: drifting debris]]
      const cost = Number(name.slice(4));
      if (!priced("no-fuel-drifting-debris", "ransom", cost, "scrap") || g.scrap < cost)
        return false;
      g.scrap -= cost;
      done(
        g,
        `Despite his fragile condition, the Rockman is good to his word and returns your crew-member, who is suitably grateful. Sadly, gratitude doesn't power the FTL drive. You lose ${cost} scrap.`,
      );
      return true;
    }
    if (name === "refuse") {
      // Wiki citations:
      // > "It's a tough call, but it's for the Federation and the liberty of all. You set off before you can change your mind." — [[No fuel: drifting debris]]
      // > "You lose a crewmember." — [[No fuel: drifting debris]]
      // > "(Clone Bay) [no effect] Before preparing to jump you check the Clone Bay but there is no sign of activity." — [[No fuel: drifting debris]]
      done(
        g,
        `${"It's a tough call, but it's for the Federation and the liberty of all. You set off before you can change your mind."}\n\n${loseCrew(ctx, true, true)}`,
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
      // > "The ship appears to be entirely lifeless. Your crew is able to find some usable fuel cells after a brief search." — [[No fuel: drifting debris]]
      // > "You receive medium fuel." — [[No fuel: drifting debris]]
      done(
        g,
        "The ship appears to be entirely lifeless. Your crew is able to find some usable fuel cells after a brief search.",
        fuelOnly(g, "medium"),
      );
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
        done(g, "They take pity on you and offer you some fuel free of charge.", {
          tier: "low",
          scrap: 0,
          eligible: 0,
          fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
          missiles: 0,
          parts: 0,
        });
      else done(g, "They end the discussion and prepare to jump away.");
      return true;
    }
    if (name === "walk") {
      done(
        g,
        "Their captain disconnects from the channel and without another word their ship prepares to jump away.",
      );
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
        done(
          g,
          'They pull close to your ship and unload some fuel saying, "Try not to run out of fuel again. These are dangerous times; who knows who could have showed up."',
          {
            tier: "low",
            scrap: 0,
            eligible: 0,
            fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
            missiles: 0,
            parts: 0,
          },
        );
        return true;
      }
      if (branch === 1) {
        showTrader(
          g,
          slug,
          "They approach and dock with your ship. On board they present an offer.",
        );
        return true;
      }
      if (branch === 2) {
        ctx.note(
          "As they approach, you detect their weapons powering up. It seems their intentions are hostile!",
        );
        pirateFight(ctx, "no-fuel-prepare-dock-90");
        return true;
      }
      ctx.note(
        "As their ship pulls up next to yours, their captain continues, \"Yes, we'll certainly help... Help to relieve you of that nice ship!\" Sensors detect a hidden teleporter has been activated. We've been boarded!",
      );
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
        done(
          g,
          '"I assure you that we mean no harm. See, we\'ll send some fuel over on a transport." A small ship docks and offloads some fuel just as they said. They leave, saying, "Stay cautious, friend."',
          {
            tier: "low",
            scrap: 0,
            eligible: 0,
            fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
            missiles: 0,
            parts: 0,
          },
        );
        return true;
      }
      if (branch === 1) {
        ctx.note(
          'They reply, "Keep our distance? Let\'s see if you can stop us!" They power up their weapons and advance.',
        );
        pirateFight(ctx, "no-fuel-prepare-dock-80");
        return true;
      }
      done(g, '"No one trusts anyone these days..." The ship jumps away.');
      return true;
    }
    if (name === "sensors" || name === "scanners") {
      // Wiki citations:
      // > "Scan the ship." — [[No fuel: prepare to dock]]
      card(g, "Scan the ship.", [{ id: "c:no-fuel-prepare-to-dock:scan", label: "Continue" }]);
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
        done(
          g,
          "Sensors indicate their ship is without military-grade weaponry, even small arms. You allow them to dock and they give you some fuel saying, \"I remember a time when we didn't have to be so paranoid about each others' intentions... Stay safe.\"",
          {
            tier: "low",
            scrap: 0,
            eligible: 0,
            fuel: rollFuel(id, (lo, hi) => span(ctx, lo, hi)),
            missiles: 0,
            parts: 0,
          },
        );
        return true;
      }
      card(
        g,
        "Sensors are picking up armed crew and considerably more weaponry than is legal for a craft of this size. This is surely a trap.",
        [
          {
            id: "c:no-fuel-prepare-to-dock:trap",
            label: "Power up weapons and prepare for a fight.",
          },
          {
            id: "c:no-fuel-prepare-to-dock:cloak",
            label: "Cloak and get out of scanning range before they have a chance to lock on.",
          },
        ],
      );
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
      done(
        g,
        "Your highly advanced cloaking system allows you to get out of range easily since they were still out of firing range. Eventually the ship jumps away.",
      );
      return true;
    }
  }

  if (slug === "no-fuel-refugee-trading") {
    if (name === "low") {
      // Wiki citations:
      // > "You receive low fuel." — [[No fuel: refugee trading]]
      done(g, "You receive a small share of their remaining fuel.", fuelOnly(g, "low"));
      return true;
    }
    if (name === "trade" || name === "better" || name === "again") return betterTrade(ctx, id);
    if (name === "engi") {
      // Wiki citations:
      // > "Your Engi analyzes scans of the extensive damage to their hull, calculating potential repair costs. The refugees grumble and protest, but in the end, they admit that their need for repairs is greater than their fuel surplus and offer a better trade." — [[No fuel: refugee trading]]
      // > "Accept it. [ the actual trade offer is shown prior to making the choice ]" — [[No fuel: refugee trading]]
      // > "Refuse it." — [[No fuel: refugee trading]]
      card(
        g,
        "Your Engi analyzes scans of the extensive damage to their hull, calculating potential repair costs. The refugees grumble and protest, but in the end, they admit that their need for repairs is greater than their fuel surplus and offer a better trade.",
        [
          { id: "c:no-fuel-refugee-trading:better", label: "Accept it. 6 fuel for 10 scrap." },
          { id: "c:no-fuel-refugee-trading:better-no", label: "Refuse." },
        ],
      );
      return true;
    }
    if (name === "better-no" || name === "again-no") {
      // Wiki citations:
      // > "Nothing happens." — [[No fuel: refugee trading]]
      done(g, "Nothing happens.");
      return true;
    }
    if (name === "refuse") {
      // Wiki citations:
      // > "The refugee ship cuts communications and jumps from the system without another word, the galactic equivalent of giving you the cold shoulder." — [[No fuel: refugee trading]]
      // > "The refugees become desperate at your refusal - apparently, their hull is even more damaged than it first appears. Almost begging, they offer a better trade than before." — [[No fuel: refugee trading]]
      // > "Refuse their offer again." — [[No fuel: refugee trading]]
      if (ctx.irand(2) === 0)
        done(
          g,
          "The refugee ship cuts communications and jumps from the system without another word, the galactic equivalent of giving you the cold shoulder.",
        );
      else {
        card(
          g,
          "The refugees become desperate at your refusal — apparently, their hull is even more damaged than it first appears. Almost begging, they offer a better trade than before.",
          [
            { id: "c:no-fuel-refugee-trading:again", label: "Accept it. 6 fuel for 10 scrap." },
            { id: "c:no-fuel-refugee-trading:again-no", label: "Refuse their offer again." },
          ],
        );
      }
      return true;
    }
    if (name === "attack") {
      // Wiki citations:
      // > "Panicked, the refugees immediately surrender as your weapons power up. They pass along their fuel and what few other supplies they have left in exchange for their lives." — [[No fuel: refugee trading]]
      // > "You receive medium fuel and scrap." — [[No fuel: refugee trading]]
      done(
        g,
        "Panicked, the refugees immediately surrender as your weapons power up. They pass along their fuel and what few other supplies they have left in exchange for their lives.",
        fuelAndScrap(g, "medium"),
      );
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
        done(
          g,
          `The refugee ship makes the exchange, and wishes you well on your mission. You lose 1 missile and receive ${fuel} fuel.`,
        );
        return true;
      }
      ctx.note(
        `Having traded supplies, the ship suddenly powers up and attacks — it's a pirate ship! You lose 1 missile and receive ${fuel} fuel.`,
      );
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
        ctx.note(
          "Taking your reluctance as weakness, the refugee ship suddenly bristles with weapons — it's a pirate ship, and it believes it's found easy prey!",
        );
        ctx.fight("Pirate ship", undefined, "no-fuel-refugee-trading");
        return true;
      }
      if (branch === 1) {
        done(
          g,
          "Sensing your reluctance, the refugee ship nevertheless parts with a small amount of fuel. It warns you to leave the sector as quickly as possible before it is overtaken by Rebels, then it jumps and vanishes to parts unknown.",
          fuelOnly(g, "low"),
        );
        return true;
      }
      done(
        g,
        "The refugee ship apologizes, but they need their fuel. They wish you well, and then vanish from the system.",
      );
      return true;
    }
  }

  return null;
}

const ENGINE_WIN_DESTROYED =
  "The Slug ship breaks apart and your engines return to normal. You collect what you can.";
const ENGINE_WIN_CREW =
  "With their crew dead, you quickly shut off their hacking module and your engines return to normal. You strip the ship.";
const HALF_WIN_DESTROYED =
  "The Slug ship breaks apart and your weapon system returns to normal. You collect what you can.";
const HALF_WIN_CREW =
  "With their crew dead, you quickly shut off their hacking module and your weapon system returns to normal. You strip the ship.";

/** Slug repair station wins that replace default salvage. */
export function missingPageWin(
  g: Game,
  slug: string | null | undefined,
  deadCrew: boolean,
): boolean {
  if (slug !== "slug-repair-engines" && slug !== "slug-repair-half") return false;
  const text =
    slug === "slug-repair-engines"
      ? deadCrew
        ? ENGINE_WIN_CREW
        : ENGINE_WIN_DESTROYED
      : deadCrew
        ? HALF_WIN_CREW
        : HALF_WIN_DESTROYED;
  const tier: SurrenderTier = slug === "slug-repair-half" || deadCrew ? "high" : "medium";
  done(g, text, rollStandard(g, tier));
  g.sfx.push("win");
  return true;
}
