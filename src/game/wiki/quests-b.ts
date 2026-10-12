/**
 * @agent:quests-b. Quest-opening events, part B: Asteroid belt distress, Capture the ship, Encrypted federation signal,
 * Engi ship attacked by Mantis ship, Merchant's request, Nebula wreckage. Each page's opening card is a cited table row
 * (cited-events-quests-b.ts); every branch with a random result, a follow-up dialogue, a quest marker, a fight or a page
 * win reward runs here. Registered in wiki/quests.ts PARTS (QuestPart), next to quests-a.ts.
 *
 * Conventions are wiki/quests.ts's (read its header): a page that lists N results without odds rolls them with equal
 * odds ({{DuplicateEvent|N}} counts N times); an unnamed weapon or drone schematic is a random one (grantRandomItem,
 * per the Rewards page) beside the printed scrap; quest beacon names and "Fight ..." labels the page does not print are INVENTED.
 * Blue options on follow-up cards are listed only when the ship meets them (as quests.ts does); blue options on the
 * opening cited cards are always listed and disabled by PART_B.disabled.
 *
 * Fights whose ref is {{SurrenderEscape(alt)|no|...}} (PIRATE_QUEST_CREWDEAD, MANTIS_ENGI_STATION, ENGI_MANTIS_CONTROLLED,
 * JELLY_PIRATE_MERCHANT) never run and never surrender (`noRun`). The Encrypted federation signal REBEL ship keeps the
 * default Rebel rows ("escape+surrender|REBEL|50|30-40|3-4|50|20-30|2-3" is the standard Rebel row). Nebula wreckage's
 * Zoltan ship prints no ref: default rows.
 *
 * Shipless boarders (Research station with no response) run through beginBoarding (sim.ts): no enemy hull, same melee.
 * The standalone card lists the Anti-Personnel Drone and the Lifeform Scanner. The drone's combat stays in drones-missing.ts.
 * Merchant's Delivery does not list either blue option.
 */
import { tx } from "../../i18n/index.ts";
import { adjustScrap } from "../extras/index.ts";
import { kinOf } from "../extras/kin.ts";
import { beginBoarding, deselectCrew, hurtSystem, log, rand } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { grantRandomItem } from "./bonus-item.ts";
import {
  addQuest,
  arriveFedAssist,
  card,
  crew,
  hasTeleporter,
  pick,
  repair,
  result,
  scrapOnly,
  std,
  weighted,
  type Choice,
  type QuestPart,
} from "./quests.ts";
import {
  between,
  here,
  humanBoarders,
  NEVER_RUN,
  pageFight,
  randomRace,
  rollStandard,
  rollSurrenderOffer,
  type SurrenderOffer,
} from "./surrender.ts";

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function hasKin(g: Game, kin: string): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === kin);
}
const hasEngi = (g: Game) => hasKin(g, "shell");
const hasSlug = (g: Game) => hasKin(g, "gel");
function medbay(g: Game): number {
  return g.player.systems.medbay?.level ?? 0;
}
function hasClonebay(g: Game): boolean {
  return (g.player.kits.cradle?.level ?? 0) > 0;
}
function hasWeapon(g: Game, defId: string): boolean {
  return g.player.weapons.some((w) => w.defId === defId);
}
/** The player's Drone Control schematic (extras/swarm.ts kit.target). */
function hasDrone(g: Game, kinds: string[]): boolean {
  const kit = g.player.kits.swarm;
  return !!kit && kit.level > 0 && kinds.includes(kit.target ?? "");
}

/** Same as quests.ts damageHull: true when the ship is destroyed (phase "defeat"). */
function damageHull(g: Game, n: number): boolean {
  g.player.hull = Math.max(0, g.player.hull - n);
  log(g, tx("wiki.quests-b.hull-damage", { n: n }));
  if (g.player.hull > 0) return false;
  g.phase = "defeat";
  g.outcome = g.training ? "tutorial" : "hull";
  g.paused = true;
  g.event = null;
  return true;
}

/** "1 damage to a random system". INFERRED: an installed system with an undamaged bar. */
function systemHit(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => {
    const s = g.player.systems[id];
    return s && s.level > 0 && s.damage < s.level;
  });
  if (!ids.length) return "";
  const id = pick(g, ids);
  hurtSystem(g.player, id, 1);
  return tx("wiki.quests-b.1-damage-to", { id: id });
}

/**
 * "1 damage with [fire] to a random room" (and "a breach"). INFERRED: the room's system (if any) takes the 1 damage.
 * The fire and breach stay until put out. A fire spreads, eats oxygen, and burns crew outside a fight (sim.ts tickIdleFires).
 */
function roomHit(g: Game, breach = false): string {
  const rooms = g.player.rooms;
  if (!rooms.length) return "";
  const r = pick(g, rooms);
  const sys = r.system && g.player.systems[r.system];
  if (sys && sys.level > 0) hurtSystem(g.player, r.system!, 1);
  // Fires, "Fires and enemy AI": a room stacks to four flames. This hit still adds one.
  r.fire = Math.min(4, r.fire + 1);
  if (breach) r.breach += 1;
  const line = breach ? tx("wiki.quests-b.a-fire-and-a-breach-break") : tx("wiki.quests-b.a-fire-breaks-out");
  log(g, line);
  return line;
}

/** "Rebel Fleet pursuit is doubled for 1 jump": the next advance counts twice (sim.ts pursuit). */
function doublePursuit(g: Game): string {
  g.pursuitDouble = true;
  const line = tx("wiki.quests-b.rebel-fleet-pursuit-is-doubled-for");
  log(g, line);
  return line;
}

/** Rewards, "Fuel": T fuel & T scrap ("high (3-6 fuel) fuel and scrap", "medium (2-4 fuel) fuel and scrap"). */
function fuelAndScrap(g: Game, tier: "medium" | "high"): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  offer.fuel = between(g, tier === "high" ? [3, 6] : [2, 4]);
  return offer;
}

/** {{Transaction|lo-hi|add_scrap}}: a fixed range, not a tier. */
function fixedScrap(g: Game, lo: number, hi: number): SurrenderOffer {
  const eligible = between(g, [lo, hi]);
  return { tier: "low", scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 };
}

/** A card that only shows what was paid (the page prints no text for that result). */
function paid(g: Game, offer?: SurrenderOffer, extras: string[] = []) {
  result(g, "", offer, extras);
  if (g.event) g.event.body = g.event.body.trim();
}

/** "Nothing happens." with no text: the beacon is spent and the map returns (sim.ts choose "ack"). */
function done(g: Game) {
  const b = here(g);
  if (b) b.resolved = true;
  g.event = null;
  g.phase = "map";
  g.paused = false;
}

/** "You lose a crewmember". INFERRED (as quests.ts Rebel defector): never the last crewmember aboard. */
function loseCrew(g: Game): string {
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = pick(g, mine);
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  const line = tx("wiki.quests-b.is-lost", { name: lost.name });
  log(g, line);
  return line;
}

/** "who becomes an enemy": that crew fights aboard your ship. INFERRED: never the last living crewmember. */
function turnCoat(g: Game): boolean {
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return false;
  const turned = pick(g, mine);
  turned.side = "enemy";
  turned.aboard = "player";
  turned.path = [];
  turned.move = 0;
  turned.think = 0;
  deselectCrew(g, turned.id);
  log(g, tx("wiki.quests-b.turns-on-the-crew", { name: turned.name }));
  return true;
}

/** {{SurrenderEscape(alt)|no|...}}: no escape (NEVER_RUN) and no surrender offer. */
function noRun(g: Game, text: string, tier: string, slug: string) {
  pageFight(g, text, tier, slug, { ...NEVER_RUN });
  g.enemySurrender = { chance: 0, threshold: 0, rolled: false, offered: false, refused: false, offer: null };
}

/** "1-2 mantis boarders beam aboard your ship". INFERRED: each lands in a random room (as surrender.ts humanBoarders). */
function mantisBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("blade").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({ id: "u" + g.uid.toString(36), name: tx("wiki.quests-b.mantis"), side: "enemy", aboard: "player", hp, maxHp: hp, room, path: [], move: 0, think: 0, tone: 3, kin: "blade" });
  }
  log(g, tx("wiki.quests-b.mantis-boarders-teleport-aboard", { n: n }));
}

// ---------------------------------------------------------------------------------------------------------------
// Asteroid belt distress (CIVILIAN_ASTEROIDS_BEACON)
// ---------------------------------------------------------------------------------------------------------------

function asteroidCard(g: Game) {
  const choices: Choice[] = [
    { id: "q:asteroid:shield", label: tx("wiki.quests-b.try-to-shield-their-ship-with") },
    { id: "q:asteroid:leave", label: tx("wiki.quests-b.don-t-risk-our-ship-leave") },
  ];
  // {{Blue Option|Defense Drone|...}} / {{Blue Option|Repair Drone|...}}, each [1 drone part]. INFERRED: "Repair Drone"
  // is the System Repair drone ("patch"): it is sent "to fix their Shields", a system.
  if (hasDrone(g, ["ward", "ward2"])) choices.push({ id: "q:asteroid:defense", label: tx("wiki.quests-b.use-a-defense-drone-to-protect") });
  if (hasDrone(g, ["patch"])) choices.push({ id: "q:asteroid:repair", label: tx("wiki.quests-b.send-a-repair-drone-to-fix") });
  if (hasTeleporter(g)) choices.push({ id: "q:asteroid:teleport", label: tx("wiki.quests-b.offer-to-beam-them-aboard-your") });
  // {{Blue Option|Rock Armor|...|shortreq=Rock Plating}}. Rock Plating is fitted as "keel" (extras/augments.ts).
  if (g.augments.includes("keel")) choices.push({ id: "q:asteroid:rock", label: tx("wiki.quests-b.shield-their-ship-with-yours-and") });
  card(g, tx("wiki.quests-b.they-respond-help-our-shields-are"), choices);
}

function asteroidDrone(g: Game) {
  if (g.player.parts < 1) return;
  g.player.parts -= 1;
  if (rand(g) < 0.5) {
    // "4 hull damage, 1 damage to a random system, 1 damage with fire to a random room, and you receive a weapon with
    // medium scrap." Rewards, "Weapon": "A random weapon & T scrap."
    if (damageHull(g, 4)) return;
    const sys = systemHit(g);
    const fire = roomHit(g);
    result(g, tx("wiki.quests-b.your-drone-succeeds-in-keeping-their"), scrapOnly(g, "medium"), [tx("wiki.quests-b.hull-damage-4"), sys, fire, grantRandomItem(g, "weapon")]);
  } else {
    result(g, tx("wiki.quests-b.the-drone-keeps-the-ship-stable"), undefined, [addQuest(g, "fed-base")]);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Capture the ship (QUEST_CREWDEAD_START)
// ---------------------------------------------------------------------------------------------------------------

function captureOffer(g: Game) {
  card(g, tx("wiki.quests-b.they-quickly-scan-your-ship-and"), [
    { id: "q:capture:agree", label: tx("wiki.quests-b.agree-to-capture-the-ship") },
    { id: "q:capture:decline", label: tx("wiki.quests-b.decline") },
  ]);
}

// ---------------------------------------------------------------------------------------------------------------
// Engi ship attacked by Mantis ship (ENGI_STATION_DISTRESS)
// ---------------------------------------------------------------------------------------------------------------

const ENGI_PAGE = "engi-ship-attacked-by-mantis-ship";
/** The mantis-controlled Engi ship: a second slug so its default rewards are not the Mantis ship's page win. */
const ENGI_PAGE_ENGI = "engi-ship-attacked-by-mantis-ship-engi";

function engiContact(g: Game) {
  const r = pick(g, ["crew", "fuel", "empty", "request"] as const);
  if (r === "crew") {
    result(g, tx("wiki.quests-b.they-thank-you-for-the-assistance"), rollStandard(g, "low"), [crew(g, tx("wiki.quests-b.engi"))]);
  } else if (r === "fuel") {
    // Rewards, "Fuel only": medium (2-4) fuel.
    result(g, tx("wiki.quests-b.the-station-was-in-the-process"), { tier: "medium", scrap: 0, eligible: 0, fuel: between(g, [2, 4]), missiles: 0, parts: 0 });
  } else if (r === "empty") {
    result(g, tx("wiki.quests-b.the-engi-station-is-stripped-bare"));
  } else {
    const choices: Choice[] = [
      { id: "q:engi-station:fuel", label: tx("wiki.quests-b.request-fuel") },
      { id: "q:engi-station:weapon", label: tx("wiki.quests-b.request-weapon") },
      { id: "q:engi-station:drone", label: tx("wiki.quests-b.request-drone") },
    ];
    // {{Blue Option|Engi Crew|Threat unresolved. Current Mission imperative: Protocol 52.34.}}
    if (hasEngi(g)) choices.push({ id: "q:engi-station:protocol", label: tx("wiki.quests-b.threat-unresolved-current-mission-imperative-pro") });
    card(g, tx("wiki.quests-b.the-station-hails-you-gratitude-expected"), choices);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Merchant's request (MERCHANT_REQUEST)
// ---------------------------------------------------------------------------------------------------------------

const PARTS_OWED = 5;

function fullPriceCard(g: Game, text: string) {
  card(g, text, [
    { id: "q:merchant:full", label: tx("wiki.quests-b.accept-the-new-offer") },
    { id: "q:merchant:leave", label: tx("wiki.quests-b.leave") },
  ]);
}

function payParts(g: Game): string {
  g.player.parts -= PARTS_OWED;
  return tx("wiki.quests-b.drone-parts", { PARTS_OWED: PARTS_OWED });
}

/** Merchant's request, "Investigate the Cargo": three results. */
function investigateCargo(g: Game) {
  const r = pick(g, ["note", "weapon", "supplies"] as const);
  if (r === "note") {
    result(g, tx("wiki.quests-b.the-cargo-was-some-food-and"), undefined, [addQuest(g, "merchant-station")]);
  } else if (r === "weapon") {
    // "You receive a weapon." Not named: a random one, as Rewards, "Weapon": "A random weapon & T scrap." (no scrap here).
    result(g, tx("wiki.quests-b.you-find-a-prototype-weapon-inside"), undefined, [grantRandomItem(g, "weapon")]);
  } else {
    result(g, tx("wiki.quests-b.there-were-general-military-supplies-in"), rollStandard(g, "high"));
  }
}

/** Research station with no response, as the Merchant's Delivery "station doesn't respond" subevent ({{:...}} include). */
function researchStation(g: Game, intro: string) {
  // The standalone card lists the Anti-Personnel Drone and the Lifeform Scanner. This include does not.
  card(g, tx("wiki.quests-b.you-find-the-small-research-station", { intro: intro }), [
    { id: "q:research:dock", label: tx("wiki.quests-b.dock-with-the-station-and-investigate") },
    { id: "q:research:leave", label: tx("wiki.quests-b.leave-it-alone") },
  ]);
}

const APD_TEAR = tx("wiki.quests-b.you-send-your-anti-personnel-drone");
const APD_MOB = tx("wiki.quests-b.once-on-board-the-station-your");
const APD_CAMERAS = tx("wiki.quests-b.the-cameras-mounted-to-your-anti");
const SCAN_CLEAR = tx("wiki.quests-b.there-are-no-life-signs-detected");
const SCAN_LIFE = tx("wiki.quests-b.sensors-show-scattered-signs-of-life");

/** Dock with the station. Three results and no odds. INFERRED: equal. Shared with Merchant's Delivery. */
function researchDock(g: Game) {
  const r = pick(g, ["parts", "survivor", "infected"] as const);
  if (r === "parts") {
    // "medium (1 drone part) drone parts and scrap" (Rewards#Drone parts).
    const offer = scrapOnly(g, "medium");
    offer.parts = 1;
    result(g, tx("wiki.quests-b.inside-there-are-signs-of-a"), offer);
  } else if (r === "survivor") {
    const joined = crew(g, randomRace(g));
    const choices: Choice[] = [{ id: "q:research:brace", label: tx("wiki.quests-b.prepare-for-a-fight") }];
    // {{Blue Option|Medbay|Have the advanced medbay analyze their condition.|level=3}}
    if (medbay(g) >= 3) choices.push({ id: "q:research:antidote", label: tx("wiki.quests-b.have-the-advanced-medbay-analyze-their") });
    card(g, tx("wiki.quests-b.you-dock-with-the-station-and", { joined: joined }), choices);
  } else {
    const choices: Choice[] = [{ id: "q:research:drag", label: tx("wiki.quests-b.drag-him-back-to-the-ship") }];
    if (hasTeleporter(g)) choices.push({ id: "q:research:beam", label: tx("wiki.quests-b.use-your-teleporter-to-retrieve-your") });
    if (medbay(g) >= 2) choices.push({ id: "q:research:medbay", label: tx("wiki.quests-b.drag-him-back-to-the-medbay") });
    if (medbay(g) >= 3) choices.push({ id: "q:research:cure", label: tx("wiki.quests-b.have-the-advanced-medbay-analyze-their-2") });
    card(g, tx("wiki.quests-b.as-you-explore-the-base-crazed"), choices);
  }
}

/** [ {{Transaction|1|subtract_drones}} ]. False when the ship has no part to spend. */
function spendDronePart(g: Game): boolean {
  if (g.player.parts < 1) return false;
  g.player.parts -= 1;
  log(g, tx("wiki.quests-b.drone-parts-1"));
  return true;
}

/**
 * Anti-Personnel Drone. {{DuplicateEvent|2}} on the nothing pair, once on the cameras. INFERRED: those weights.
 * The printed OR is the two nothing sentences. INFERRED: equal inside that weight.
 * Footnote: no drone part is required if the reward includes drone parts. The printed 2/9 is that case, not a second roll.
 */
function researchDrone(g: Game) {
  if (!hasDrone(g, ["antipersonnel"])) return;
  const kind = weighted(g, [["nothing", 2], ["scrap", 1]] as const);
  if (kind === "nothing") {
    if (!spendDronePart(g)) return;
    const text = pick(g, [APD_TEAR, APD_MOB] as const);
    result(g, text, undefined, [tx("wiki.quests-b.nothing-happens"), tx("wiki.quests-b.drone-parts-1")]);
    return;
  }
  const hull = g.player.hull;
  const lines = g.log.slice();
  const offer = rollStandard(g, "medium");
  if (offer.parts <= 0 && !spendDronePart(g)) {
    g.player.hull = hull;
    g.log = lines;
    return;
  }
  result(g, APD_CAMERAS, offer, offer.parts <= 0 ? [tx("wiki.quests-b.drone-parts-1")] : []);
}

/** Lifeform Scanner. Two results and no odds. INFERRED: equal. Standalone card only. */
function researchScan(g: Game) {
  if (!g.augments.includes("pulseeye")) return;
  if (weighted(g, [["clear", 1], ["life", 1]] as const) === "clear") {
    result(g, SCAN_CLEAR, rollStandard(g, "medium"));
    return;
  }
  result(g, SCAN_LIFE, undefined, [tx("wiki.quests-b.nothing-happens")]);
}

// ---------------------------------------------------------------------------------------------------------------
// Nebula wreckage (NEBULA_BATTLEFIELD)
// ---------------------------------------------------------------------------------------------------------------

/** The two choices that follow a found survivor. INVENTED: the label "Assist the survivor." (the page links a section). */
const survivorChoices = (): Choice[] => [
  { id: "q:nebula:assist", label: tx("wiki.quests-b.assist-the-survivor") },
  { id: "q:nebula:leave", label: tx("wiki.quests-b.leave-the-battlefield-before-other-ships") },
];

function zoltanCard(g: Game, lead: string) {
  const choices: Choice[] = [{ id: "q:abadoth:explain", label: tx("wiki.quests-b.explain-about-finding-the-dead-crewman") }];
  // {{Blue Option|Engi Crew|Say ABADOTH.}}
  if (hasEngi(g)) choices.push({ id: "q:abadoth:engi", label: tx("wiki.quests-b.say-abadoth") });
  choices.push(
    { id: "q:abadoth:anodyne", label: tx("wiki.quests-b.say-anodyne") },
    { id: "q:abadoth:abadoth", label: tx("wiki.quests-b.say-abadoth") },
    { id: "q:abadoth:abatodh", label: tx("wiki.quests-b.say-abatodh") },
  );
  const body = tx("wiki.quests-b.a-zoltan-ship-decloaks-and-demands");
  card(g, lead ? `${lead}\n\n${body}` : body, choices);
}

const ZOLTAN_FIGHT = tx("wiki.quests-b.there-is-a-moment-of-silence");
/** "Fight a Zoltan ship (default rewards)": no PAGE_WINS row, so winCombat pays the default salvage. */
function zoltanFight(g: Game) {
  pageFight(g, ZOLTAN_FIGHT, tx("wiki.quests-b.zoltan-ship"), "quest-abadoth-zoltan");
}
function zoltanThanks(g: Game, lead: string) {
  result(g, tx("wiki.quests-b.there-is-a-moment-of-silence-2", { lead: lead }), rollStandard(g, "medium"));
}

// ---------------------------------------------------------------------------------------------------------------
// The part (wiki/quests.ts PARTS). Built only from functions and literals, so it is safe in the import cycle.
// ---------------------------------------------------------------------------------------------------------------

export const PART_B: QuestPart = {
  quests: {
    // Asteroid belt distress, Encrypted federation signal and Engi ship attacked by Mantis ship also add the existing
    // "fed-base" marker ({{Hidden federation base}}, wiki/quests.ts).
    "capture-ship": { page: "Capture the ship", title: tx("wiki.quests-b.bandit-ship") },
    "fed-assist": { page: "Encrypted federation signal", title: tx("wiki.quests-b.federation-outpost") },
    "merchant-delivery": { page: "Merchant's request", title: tx("wiki.quests-b.delivery-station") },
    "merchant-investigation": { page: "Merchant's request", title: tx("wiki.quests-b.lost-freighter") },
    "merchant-station": { page: "Merchant's request", title: tx("wiki.quests-b.cargo-destination") },
    abadoth: { page: "Nebula wreckage", title: tx("wiki.quests-b.dead-crewman-s-coordinates") },
  },

  arrive: {
    // Capture the ship, "Quest Marker": "Fight a Pirate ship."
    "capture-ship": (g) => {
      card(g, tx("wiki.quests-b.you-find-the-ship-that-you"), [
        { id: "q:capture:fight", label: tx("wiki.quests-b.fight-a-pirate-ship") },
      ]);
    },
    // Template:Hidden federation base, "Federation Base Assist": the same three cards as arriveFedAssist.
    "fed-assist": (g) => {
      arriveFedAssist(g);
    },
    // Merchant's request, "Merchant's Delivery": the station doesn't respond / responds.
    "merchant-delivery": (g) => {
      const intro = tx("wiki.quests-b.you-arrive-at-the-location-given");
      if (rand(g) < 0.5) {
        researchStation(g, intro);
        return;
      }
      const choices: Choice[] = [
        { id: "q:merchant:paltry", label: tx("wiki.quests-b.accept-the-paltry-payment") },
        { id: "q:merchant:refuse", label: tx("wiki.quests-b.refuse-and-keep-the-drone-parts") },
      ];
      // {{Blue Option|Mind Control|...}} (the Mind Control system is the "leash" kit); {{Blue Option|Weapons|...|level=6+}}.
      if ((g.player.kits.leash?.level ?? 0) > 0) choices.push({ id: "q:merchant:mind", label: tx("wiki.quests-b.convince-him-that-he-s-being") });
      if ((g.player.systems.weapons?.level ?? 0) >= 6) choices.push({ id: "q:merchant:weapons", label: tx("wiki.quests-b.remain-silent-but-power-up-your") });
      card(g, tx("wiki.quests-b.you-find-the-station-and-they", { intro: intro }), choices);
    },
    // Merchant's request, "Merchant's Investigation": three results.
    "merchant-investigation": (g) => {
      const intro = tx("wiki.quests-b.you-arrive-at-the-last-known");
      const r = pick(g, ["remains", "crew", "pirate"] as const);
      if (r === "remains") {
        result(g, tx("wiki.quests-b.you-find-the-remains-of-the", { intro: intro }), rollStandard(g, "medium"), [], [
          { id: "q:merchant:cargo-deliver", label: tx("wiki.quests-b.take-the-cargo-and-head-to") },
          { id: "q:merchant:cargo-take", label: tx("wiki.quests-b.take-the-cargo-for-yourself") },
        ]);
      } else if (r === "crew") {
        const choices: Choice[] = [
          { id: "q:merchant:promise", label: tx("wiki.quests-b.promise-to-deliver-the-cargo-and") },
          { id: "q:merchant:cargo-drop", label: tx("wiki.quests-b.take-the-cargo-but-drop-them") },
        ];
        if (hasTeleporter(g)) choices.push({ id: "q:merchant:cargo-beam", label: tx("wiki.quests-b.beam-the-cargo-aboard-and-leave") });
        card(g, tx("wiki.quests-b.you-find-a-severely-damaged-ship", { intro: intro }), choices);
      } else {
        // An arrival must leave a card (sim.ts eventFor falls through when questEvent returns no event), so the fight
        // starts from a button. Merchant's request, Merchant's Investigation: "Fight a Pirate ship."
        card(g, tx("wiki.quests-b.after-a-quick-scan-you-find", { intro: intro }), [
          { id: "q:merchant:pirate", label: tx("wiki.quests-b.fight-a-pirate-ship") },
        ]);
      }
    },
    // Merchant's request, "Deliver to the Station quest marker": "a drone schematic with medium scrap". Rewards,
    // "Drone": "A random drone schematic & T scrap."
    "merchant-station": (g) => {
      result(g, tx("wiki.quests-b.you-find-the-station-that-had"), scrapOnly(g, "medium"), [grantRandomItem(g, "drone")]);
    },
    // Nebula wreckage, "Quest Marker".
    abadoth: (g) => {
      const choices: Choice[] = [];
      // {{Blue Option|Slug Crew|Ask your Slug crewmember to scan for life forms.}}
      if (hasSlug(g)) choices.push({ id: "q:abadoth:slug", label: tx("wiki.quests-b.ask-your-slug-crewmember-to-scan") });
      choices.push({ id: "q:abadoth:scan", label: tx("wiki.quests-b.do-a-full-system-scan-though") });
      card(g, tx("wiki.quests-b.you-have-arrived-at-the-coordinates"), choices);
    },
  },

  choices: {
    // ---- Asteroid belt distress ----
    "c:asteroid-belt-distress:0": (g) => asteroidCard(g),
    "q:asteroid:shield": (g) => {
      const r = pick(g, ["saved", "lost", "rock"] as const);
      if (r === "saved") {
        // "1 hull damage, 1 damage with fire to a random room, and you receive high (3-6 fuel) fuel and scrap".
        if (damageHull(g, 1)) return;
        const fire = roomHit(g);
        result(g, tx("wiki.quests-b.you-succeed-in-preventing-them-from"), fuelAndScrap(g, "high"), [tx("wiki.quests-b.hull-damage-1"), fire]);
      } else if (r === "lost") {
        if (damageHull(g, 4)) return;
        result(g, tx("wiki.quests-b.despite-your-best-efforts-the-civilian"), scrapOnly(g, "low"), [tx("wiki.quests-b.hull-damage-4")]);
      } else {
        result(g, tx("wiki.quests-b.you-try-your-best-but-one"), scrapOnly(g, "low"));
      }
    },
    "q:asteroid:leave": (g) => {
      if (rand(g) < 0.5) {
        result(g, tx("wiki.quests-b.you-regretfully-leave-the-area-not"), undefined, [doublePursuit(g)]);
      } else {
        result(g, tx("wiki.quests-b.you-watch-helplessly-as-their-ship"));
      }
    },
    "q:asteroid:defense": (g) => asteroidDrone(g),
    "q:asteroid:repair": (g) => asteroidDrone(g),
    "q:asteroid:teleport": (g) => {
      if (rand(g) < 0.5) {
        // "You receive a crewmember." Race not named: INFERRED random.
        result(g, tx("wiki.quests-b.they-reluctantly-agree-once-aboard-you"), undefined, [crew(g, randomRace(g))]);
      } else {
        card(g, tx("wiki.quests-b.they-refuse-at-first-but-after"), [
          { id: "q:asteroid:home", label: tx("wiki.quests-b.take-them-to-the-nearby-planet") },
        ]);
      }
    },
    // Template:ReturnSurvivor|Asteroid belt distress: three results.
    "q:asteroid:home": (g) => {
      const r = pick(g, ["rich", "modest", "repair"] as const);
      if (r === "rich") {
        result(g, tx("wiki.quests-b.the-family-apparently-owns-one-of"), scrapOnly(g, "high"));
      } else if (r === "modest") {
        result(g, tx("wiki.quests-b.the-survivor-s-family-is-of"), scrapOnly(g, "medium"));
      } else {
        result(g, tx("wiki.quests-b.overjoyed-with-the-return-of-their"), undefined, [repair(g, 10)]);
      }
    },
    "q:asteroid:rock": (g) => {
      result(g, tx("wiki.quests-b.you-succeed-in-preventing-them-from-2"), fuelAndScrap(g, "medium"));
    },

    // ---- Capture the ship ----
    "c:capture-the-ship:0": (g) => {
      result(g, tx("wiki.quests-b.they-briefly-scan-your-ship-and"));
    },
    "c:capture-the-ship:1": (g) => result(g, tx("wiki.quests-b.if-they-wanted-your-help-they")),
    "c:capture-the-ship:2": (g) => captureOffer(g),
    "c:capture-the-ship:3": (g) => captureOffer(g),
    "c:capture-the-ship:4": (g) => captureOffer(g),
    "q:capture:agree": (g) => {
      result(g, tx("wiki.quests-b.great-we-ll-relay-their-coordinates"), undefined, [addQuest(g, "capture-ship")]);
    },
    "q:capture:decline": (g) => {
      result(g, tx("wiki.quests-b.we-understand-hopefully-we-can-find"));
    },
    // PIRATE_QUEST_CREWDEAD, {{SurrenderEscape(alt)|no|...}}. INVENTED: the log line (the page prints none).
    "q:capture:fight": (g) => {
      noRun(g, tx("wiki.quests-b.the-pirate-ship-moves-to-engage"), tx("wiki.quests-b.pirate-ship"), "quest-capture-ship");
    },
    // {{Winning|destroyed=true}}: "15 hull damage, 1 damage to a random system, 1 damage with fire and a breach to a
    // random room". Applied on this card's button, not inside winCombat: a hull loss there would be overwritten by the
    // default salvage (sim.ts winCombat pays it when pageWin does not leave an event card).
    "q:capture:blast": (g) => {
      if (damageHull(g, 15)) return;
      paid(g, undefined, [tx("wiki.quests-b.hull-damage-15"), systemHit(g), roomHit(g, true)]);
    },

    // ---- Encrypted federation signal ----
    "c:encrypted-federation-signal:0": (g) => {
      const r = pick(g, ["base", "assist", "cache", "trap", "empty"] as const);
      if (r === "base") {
        result(g, tx("wiki.quests-b.you-find-a-secret-federation-outpost"), undefined, [addQuest(g, "fed-base")]);
      } else if (r === "assist") {
        // "medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap" (Rewards#Stuff).
        result(g, tx("wiki.quests-b.you-find-a-hidden-federation-outpost"), rollSurrenderOffer(g, "medium", true), [addQuest(g, "fed-assist")]);
      } else if (r === "cache") {
        result(g, tx("wiki.quests-b.you-find-a-small-cache-of"), rollStandard(g, "high"));
      } else if (r === "trap") {
        // "2-3 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)". REBEL: default rows.
        pageFight(g, tx("wiki.quests-b.as-you-approach-the-signal-you"), tx("wiki.quests-b.rebel-ship"), "encrypted-federation-signal");
        humanBoarders(g, 2, 3);
      } else {
        result(g, tx("wiki.quests-b.you-find-a-secret-federation-outpost-2"));
      }
    },

    // ---- Engi ship attacked by Mantis ship ----
    "c:engi-ship-attacked-by-mantis-ship:0": (g) => {
      if (rand(g) < 0.5) {
        // "You fight a normal Mantis ship." MANTIS_ENGI_STATION, {{SurrenderEscape(alt)|no|...}}.
        noRun(g, tx("wiki.quests-b.you-approach-to-find-a-mantis"), tx("wiki.quests-b.mantis-ship"), ENGI_PAGE);
      } else {
        // "1-2 mantis boarders beam aboard your ship and you fight a mantis-controlled Engi ship (default rewards)."
        // ENGI_MANTIS_CONTROLLED, {{SurrenderEscape(alt)|no|...}}. INFERRED: its crew are Mantis.
        noRun(g, tx("wiki.quests-b.you-receive-another-message-from-the"), tx("wiki.quests-b.engi-ship"), ENGI_PAGE_ENGI);
        const hp = kinOf("blade").hp;
        for (const c of g.crew) {
          if (c.side !== "enemy") continue;
          c.kin = "blade";
          c.hp = hp;
          c.maxHp = hp;
        }
        mantisBoarders(g, 1, 2);
      }
    },
    "q:engi-station:contact": (g) => engiContact(g),
    "q:engi-station:fuel": (g) => result(g, tx("wiki.quests-b.request-granted-fuel-transferring"), fuelAndScrap(g, "high")),
    // "a weapon with low scrap" / "a drone schematic with low scrap". Rewards, "Weapon": "A random weapon & T scrap."
    // "Drone": "A random drone schematic & T scrap."
    "q:engi-station:weapon": (g) => result(g, tx("wiki.quests-b.request-granted-weapon-transferring"), scrapOnly(g, "low"), [grantRandomItem(g, "weapon")]),
    "q:engi-station:drone": (g) => result(g, tx("wiki.quests-b.request-granted-drone-schematic-transferring"), scrapOnly(g, "low"), [grantRandomItem(g, "drone")]),
    // "a weapon with low scrap, your ship receives 10 repairs and a Hidden Federation Base quest marker". Rewards,
    // "Weapon": "A random weapon & T scrap."
    "q:engi-station:protocol": (g) => {
      result(g, tx("wiki.quests-b.they-respond-understood-re-establishment-of"), scrapOnly(g, "low"), [grantRandomItem(g, "weapon"), repair(g, 10), addQuest(g, "fed-base")]);
    },

    // ---- Merchant's request ----
    "c:merchant-s-request:0": (g) => {
      if (rand(g) < 0.5) {
        card(g, tx("wiki.quests-b.great-i-was-worried-no-one"), [
          { id: "q:merchant:deliver", label: tx("wiki.quests-b.accept") },
          { id: "q:merchant:deliver-no", label: tx("wiki.quests-b.decline") },
        ]);
      } else {
        card(g, tx("wiki.quests-b.your-ship-seems-reasonably-equipped-a"), [
          { id: "q:merchant:investigate", label: tx("wiki.quests-b.accept") },
          { id: "q:merchant:investigate-no", label: tx("wiki.quests-b.decline-2") },
        ]);
      }
    },
    // "You receive 5 drone parts and Merchant's Delivery quest marker is added to your map."
    "q:merchant:deliver": (g) => {
      g.player.parts += PARTS_OWED;
      log(g, tx("wiki.quests-b.drone-parts-2", { PARTS_OWED: PARTS_OWED }));
      result(g, tx("wiki.quests-b.great-i-uploaded-their-location-to"), undefined, [tx("wiki.quests-b.drone-parts-2", { PARTS_OWED: PARTS_OWED }), addQuest(g, "merchant-delivery")]);
    },
    "q:merchant:deliver-no": (g) => result(g, tx("wiki.quests-b.fine-i-ll-keep-looking-for")),
    "q:merchant:investigate": (g) => {
      result(g, tx("wiki.quests-b.at-least-you-re-confident-for"), undefined, [addQuest(g, "merchant-investigation")]);
    },
    "q:merchant:investigate-no": (g) => {
      result(g, tx("wiki.quests-b.at-least-you-are-willing-to"));
    },
    // "You receive 20-30 scrap and lose 5 drone parts."
    "q:merchant:paltry": (g) => {
      const parts = payParts(g);
      result(g, tx("wiki.quests-b.you-drop-the-parts-off-and"), fixedScrap(g, 20, 30), [parts]);
    },
    "q:merchant:refuse": (g) => {
      if (rand(g) < 0.5) fullPriceCard(g, tx("wiki.quests-b.fine-i-was-bluffing-i-ll"));
      else result(g, tx("wiki.quests-b.the-merchant-disconnects-in-a-huff"));
    },
    "q:merchant:mind": (g) => {
      fullPriceCard(g, tx("wiki.quests-b.i-m-being-unfair-you-did"));
    },
    // "You receive 40-55 scrap and lose 5 drone parts." The page prints no text for it.
    "q:merchant:full": (g) => {
      const parts = payParts(g);
      paid(g, fixedScrap(g, 40, 55), [parts]);
    },
    "q:merchant:leave": (g) => done(g),
    // "You receive 55-70 scrap, 2-5 fuel and lose 5 drone parts."
    "q:merchant:weapons": (g) => {
      const parts = payParts(g);
      const offer = fixedScrap(g, 55, 70);
      offer.fuel = between(g, [2, 5]);
      result(g, tx("wiki.quests-b.you-make-a-good-point-you"), offer, [parts]);
    },
    // JELLY_PIRATE_MERCHANT, {{SurrenderEscape(alt)|no|...}}. INVENTED: the log line.
    "q:merchant:pirate": (g) => noRun(g, tx("wiki.quests-b.the-pirate-turns-on-you"), tx("wiki.quests-b.pirate-ship"), "quest-merchant-pirate"),
    "q:merchant:cargo-deliver":(g) => paid(g, undefined, [addQuest(g, "merchant-station")]),
    "q:merchant:cargo-take": (g) => investigateCargo(g),
    "q:merchant:cargo-drop": (g) => investigateCargo(g),
    "q:merchant:cargo-beam": (g) => investigateCargo(g),
    // "You receive a crewmember and Deliver to the Station quest marker". Race not named: INFERRED random.
    "q:merchant:promise": (g) => {
      result(g, tx("wiki.quests-b.they-upload-the-delivery-destination-once"), undefined, [crew(g, randomRace(g)), addQuest(g, "merchant-station")]);
    },

    // ---- Research station with no response (Merchant's Delivery and the standalone card) ----
    "q:research:dock": (g) => researchDock(g),
    "c:research-station-with-no-response:0": (g) => researchDock(g),
    // Standalone "Leave it alone." prints "Nothing happens." Merchant's Delivery still uses q:research:leave.
    "c:research-station-with-no-response:1": (g) => result(g, tx("wiki.quests-b.nothing-happens")),
    "c:research-station-with-no-response:2": (g) => researchDrone(g),
    "c:research-station-with-no-response:3": (g) => researchScan(g),
    "q:research:leave": (g) => done(g),
    // "3-4 human boarders beam aboard your ship." No enemy ship.
    "q:research:brace": (g) => {
      humanBoarders(g, 3, 4, tx("wiki.quests-b.human-boarders-beam-aboard"));
      beginBoarding(g);
    },
    "q:research:antidote": (g) => {
      result(g, tx("wiki.quests-b.you-hold-them-off-while-retreating"), scrapOnly(g, "medium"), [crew(g, randomRace(g), "repair")]);
    },
    // "You lose a crewmember, who becomes an enemy, and 3-4 human boarders beam aboard your ship."
    "q:research:drag": (g) => {
      log(g, tx("wiki.quests-b.as-you-get-back-on-board"));
      turnCoat(g);
      humanBoarders(g, 3, 4, tx("wiki.quests-b.human-boarders-beam-aboard"));
      beginBoarding(g);
    },
    // Teleporter: "lose a crewmember, who becomes an enemy." No extra boarders. Last crew stays (the card remains).
    "q:research:beam": (g) => {
      const text = tx("wiki.quests-b.you-beam-your-away-team-back");
      if (!turnCoat(g)) {
        result(g, text);
        return;
      }
      log(g, text);
      beginBoarding(g);
    },
    // Medbay level 2: "3-4 human boarders beam aboard your ship." The crewmember recovers.
    "q:research:medbay": (g) => {
      log(g, tx("wiki.quests-b.you-hold-him-down-and-the"));
      humanBoarders(g, 3, 4, tx("wiki.quests-b.human-boarders-beam-aboard"));
      beginBoarding(g);
    },
    "q:research:cure": (g) => {
      result(g, tx("wiki.quests-b.you-hold-them-off-while-retreating-2"), undefined, [crew(g, randomRace(g))]);
    },

    // ---- Nebula wreckage ----
    "c:nebula-wreckage:0": (g) => {
      if (!hasSlug(g)) return;
      card(g, tx("wiki.quests-b.despite-the-destruction-filling-the-system"), survivorChoices());
    },
    "c:nebula-wreckage:1": (g) => {
      const r = weighted(g, [
        ["nothing", 3],
        ["pummeled", 1],
        ["survivor", 1],
      ] as ["nothing" | "pummeled" | "survivor", number][]);
      if (r === "nothing") {
        result(g, tx("wiki.quests-b.the-wreckage-is-drifting-faster-than"));
      } else if (r === "pummeled") {
        if (damageHull(g, 5)) return;
        result(g, tx("wiki.quests-b.as-you-investigate-the-battlefield-your"), undefined, [tx("wiki.quests-b.hull-damage-5"), roomHit(g)]);
      } else {
        card(g, tx("wiki.quests-b.you-spot-a-life-form-floating"), survivorChoices());
      }
    },
    "q:nebula:leave": (g) => done(g),
    "q:nebula:assist": (g) => {
      const choices: Choice[] = [{ id: "q:nebula:comfort", label: tx("wiki.quests-b.make-them-comfortable-for-their-final") }];
      // {{Blue Option|Advanced Medbay|...|level=2+}}, {{Blue Option|Clonebay|...}}.
      if (medbay(g) >= 2) choices.push({ id: "q:nebula:medbay", label: tx("wiki.quests-b.get-them-into-the-medbay") });
      if (hasClonebay(g)) choices.push({ id: "q:nebula:clone", label: tx("wiki.quests-b.try-to-clone-them-before-it") });
      card(g, tx("wiki.quests-b.you-bring-the-survivor-aboard-but"), choices);
    },
    "q:nebula:comfort": (g) => {
      result(g, tx("wiki.quests-b.on-their-death-bed-they-croak"), undefined, [addQuest(g, "abadoth")]);
    },
    // "You receive a crewmember." Race not named: INFERRED random.
    "q:nebula:medbay": (g) => {
      result(g, tx("wiki.quests-b.using-your-upgraded-medical-bay-you"), undefined, [crew(g, randomRace(g))]);
    },
    "q:nebula:clone": (g) => {
      result(g, tx("wiki.quests-b.you-clone-the-individual-and-let"), undefined, [crew(g, randomRace(g))]);
    },
    "q:abadoth:slug": (g) => zoltanCard(g, ""),
    "q:abadoth:scan": (g) => {
      const line = doublePursuit(g);
      zoltanCard(g, tx("wiki.quests-b.you-start-the-arduous-task-of", { line: line }));
    },
    "q:abadoth:explain": (g) => zoltanFight(g),
    "q:abadoth:anodyne": (g) => zoltanFight(g),
    "q:abadoth:abatodh": (g) => zoltanFight(g),
    "q:abadoth:abadoth": (g) => zoltanThanks(g, ""),
    "q:abadoth:engi": (g) => zoltanThanks(g, tx("wiki.quests-b.your-engi-crewman-easily-recalls-the")),
  },

  disabled: (g, id) => {
    // Opening-card blue options (always listed on the cited card).
    if (id === "c:capture-the-ship:2" && !hasTeleporter(g)) return tx("wiki.quests-b.needs-a-teleporter");
    if (id === "c:capture-the-ship:3" && !hasWeapon(g, "cask")) return tx("wiki.quests-b.needs-a-fire-bomb");
    if (id === "c:capture-the-ship:4" && !hasWeapon(g, "antibio")) return tx("wiki.quests-b.needs-an-anti-bio-beam");
    if (id === "c:nebula-wreckage:0" && !hasSlug(g)) return tx("wiki.quests-b.needs-a-slug-crewmember");
    // [ {{Transaction|1|subtract_drones}} ] and "lose 5 drone parts".
    if ((id === "q:asteroid:defense" || id === "q:asteroid:repair") && g.player.parts < 1) return tx("wiki.quests-b.need-1-drone-parts");
    if ((id === "q:merchant:paltry" || id === "q:merchant:full" || id === "q:merchant:weapons") && g.player.parts < PARTS_OWED) {
      return tx("wiki.quests-b.need-drone-parts", { PARTS_OWED: PARTS_OWED });
    }
    // Research station with no response. The fitted schematic is kit.target. A missing part does not close the drone:
    // the footnote waives it when the reward includes drone parts.
    // INFERRED: the refusal lines. The page names the drone and the scanner and does not print these sentences.
    if (id === "c:research-station-with-no-response:2" && !hasDrone(g, ["antipersonnel"])) return tx("wiki.quests-b.needs-an-anti-personnel-drone");
    if (id === "c:research-station-with-no-response:3" && !g.augments.includes("pulseeye")) return tx("wiki.quests-b.needs-a-lifeform-scanner");
    return null;
  },

  wins: {
    // Capture the ship: destroyed -> the chain explosion (applied by "q:capture:blast"); deadCrew -> "a weapon with high
    // scrap". Rewards, "Weapon": "A random weapon & T scrap."
    "quest-capture-ship": (g, deadCrew) => {
      if (deadCrew) {
        result(g, tx("wiki.quests-b.you-secure-the-ship-and-wait"), scrapOnly(g, "high"), [grantRandomItem(g, "weapon")]);
        return;
      }
      card(g, tx("wiki.quests-b.the-explosion-rocks-the-pirate-ship"), [
        { id: "q:capture:blast", label: tx("wiki.quests-b.continue") },
      ]);
    },
    // Engi ship attacked by Mantis ship: destroyed -> medium, deadCrew -> high scrap with resources, then "Attempt to
    // contact the Engi". The mantis-controlled Engi ship pays the default rewards (no row).
    [ENGI_PAGE]: (g, deadCrew) =>
      std("medium", "high", tx("wiki.quests-b.the-mantis-ship-breaks-apart"), tx("wiki.quests-b.no-more-life-signs-detected-on"), [
        { id: "q:engi-station:contact", label: tx("wiki.quests-b.attempt-to-contact-the-engi") },
      ])(g, deadCrew),
    // Merchant's Investigation: {{Winning|destroyed/deadCrew=true}} -> medium scrap with resources.
    "quest-merchant-pirate": (g, deadCrew) =>
      std("medium", "medium", tx("wiki.quests-b.you-contact-the-delivery-ship-who"))(g, deadCrew),
  },

  gotAway: {},
};
