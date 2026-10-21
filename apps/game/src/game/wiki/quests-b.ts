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
import { adjustScrap } from "../extras/index.ts";
import { crewDef } from "@stl/pack";
import { beginBoarding, deselectCrew, hurtSystem, log, rand, showEventLines } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { grantRandomItem } from "./bonus-item.ts";
import { rollBand } from "./event-bands.ts";
import { rollFuel } from "./fuel-gifts.ts";
import { affordStock, partsLine, takeStock } from "./stock-spend.ts";
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
  resourceBand,
  rollSurrenderOffer,
  type SurrenderOffer,
} from "./surrender.ts";

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function hasKin(g: Game, kin: string): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === kin);
}
const hasEngi = (g: Game) => hasKin(g, "engi");
const hasSlug = (g: Game) => hasKin(g, "slug");
function medbay(g: Game): number {
  return g.player.systems.medbay?.level ?? 0;
}
function hasClonebay(g: Game): boolean {
  return (g.player.kits.clonebay?.level ?? 0) > 0;
}
/** The player's Drone Control schematic (extras/swarm.ts kit.target). */
function hasDrone(g: Game, kinds: string[]): boolean {
  const kit = g.player.kits.drones;
  return !!kit && kit.level > 0 && kinds.includes(kit.target ?? "");
}

/** Same as quests.ts damageHull: true when the ship is destroyed (phase "defeat"). */
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

/** "1 damage to a random system". INFERRED: an installed system with an undamaged bar. */
function systemHit(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => {
    const s = g.player.systems[id];
    return s && s.level > 0 && s.damage < s.level;
  });
  if (!ids.length) return "";
  const id = pick(g, ids);
  hurtSystem(g.player, id, 1);
  return `1 damage to ${id}.`;
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
  // Fires, "Fires and enemy AI": a room stacks to four flames. The icon says 1-2 fires and prints no odds.
  // INFERRED: the second flame is a coin flip, the same reading as refuelEngines.
  const flames = rand(g) < 0.5 ? 1 : 2;
  r.fire = Math.min(4, r.fire + flames);
  if (breach) r.breach += 1;
  return breach ? "A fire and a breach break out." : "A fire breaks out.";
}

/** "Rebel Fleet pursuit is doubled for 1 jump": the next advance counts twice (sim.ts pursuit). */
function doublePursuit(g: Game): string {
  g.pursuitDouble = true;
  return "Rebel Fleet pursuit is doubled for 1 jump.";
}

/** Rewards, "Fuel": T fuel & T scrap ("high (3-6 fuel) fuel and scrap", "medium (2-4 fuel) fuel and scrap"). */
function fuelAndScrap(g: Game, tier: "medium" | "high"): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  offer.fuel = between(g, resourceBand("fuel", tier));
  return offer;
}

/** {{Transaction|lo-hi|add_scrap}}: the packed range, not a tier. A missing band grants nothing. */
function printedScrap(g: Game, id: string): SurrenderOffer | undefined {
  const eligible = rollBand("merchant-s-request", id, "scrap", (lo, hi) => between(g, [lo, hi]));
  if (eligible == null) return undefined;
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
  return `${lost.name} is lost.`;
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
  log(g, `${turned.name} turns on the crew.`);
  return true;
}

/** {{SurrenderEscape(alt)|no|...}}: no escape (NEVER_RUN) and no surrender offer. */
function noRun(g: Game, text: string, tier: string, slug: string) {
  pageFight(g, text, tier, slug, { ...NEVER_RUN });
  g.enemySurrender = {
    chance: 0,
    threshold: 0,
    rolled: false,
    offered: false,
    refused: false,
    offer: null,
  };
}

/** "1-2 mantis boarders beam aboard your ship". INFERRED: each lands in a random room (as surrender.ts humanBoarders). */
function mantisBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("mantis").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Mantis",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "mantis",
    });
  }
  log(g, `${n} Mantis boarders teleport aboard.`);
}

// ---------------------------------------------------------------------------------------------------------------
// Asteroid belt distress (CIVILIAN_ASTEROIDS_BEACON)
// ---------------------------------------------------------------------------------------------------------------

function asteroidCard(g: Game) {
  // Wiki citations:
  // > "Help! Our shields are down and we won't last long!" — [[Asteroid belt distress]]
  // > "Try to shield their ship with yours and escort them out of the field." — [[Asteroid belt distress]]
  // > "Don't risk our ship. Leave them to their fate." — [[Asteroid belt distress]]
  // > "(Defense Drone) Use a Defense Drone to protect their ship." — [[Asteroid belt distress]]
  // > "(Repair Drone) Send a Repair Drone to fix their Shields." — [[Asteroid belt distress]]
  // > "(Teleporter) Offer to beam them aboard your ship." — [[Asteroid belt distress]]
  // > "(Rock Armor) Shield their ship with yours and escort them out. (Requires Rock Plating)" — [[Asteroid belt distress]]
  const choices: Choice[] = [
    {
      id: "q:asteroid:shield",
      label: "Try to shield their ship with yours and escort them out of the field.",
    },
    { id: "q:asteroid:leave", label: "Don't risk our ship. Leave them to their fate." },
  ];
  // {{Blue Option|Defense Drone|...}} / {{Blue Option|Repair Drone|...}}, each [1 drone part]. INFERRED: "Repair Drone"
  // is the System Repair drone ("REPAIR"): it is sent "to fix their Shields", a system.
  if (hasDrone(g, ["DEFENSE_1", "DEFENSE_2"]))
    choices.push({ id: "q:asteroid:defense", label: "Use a Defense Drone to protect their ship." });
  if (hasDrone(g, ["REPAIR"]))
    choices.push({ id: "q:asteroid:repair", label: "Send a Repair Drone to fix their Shields." });
  if (hasTeleporter(g))
    choices.push({ id: "q:asteroid:teleport", label: "Offer to beam them aboard your ship." });
  // {{Blue Option|Rock Armor|...|shortreq=Rock Plating}}. Rock Plating is fitted as "ROCK_ARMOR" (extras/augments.ts).
  if (g.augments.includes("ROCK_ARMOR"))
    choices.push({
      id: "q:asteroid:rock",
      label: "Shield their ship with yours and escort them out.",
    });
  card(g, 'They respond: "Help! Our shields are down and we won\'t last long!"', choices);
}

function asteroidDrone(g: Game, id: string) {
  // Wiki citations:
  // > "Your drone succeeds in keeping their ship from breaking apart" — [[Asteroid belt distress]]
  // > "Your ship takes 4 hull damage, 1 damage to a random system" — [[Asteroid belt distress]]
  // > "you receive a weapon with medium scrap." — [[Asteroid belt distress]]
  // > "Hidden Federation Base quest marker is added to your map." — [[Asteroid belt distress]]
  const n = affordStock(g, id, "parts");
  if (n == null) return;
  takeStock(g, "parts", n);
  if (rand(g) < 0.5) {
    // "4 hull damage, 1 damage to a random system, 1 damage with fire to a random room, and you receive a weapon with
    // medium scrap." Rewards, "Weapon": "A random weapon & T scrap."
    if (damageHull(g, 4)) return;
    const sys = systemHit(g);
    const fire = roomHit(g);
    result(
      g,
      "Your drone succeeds in keeping their ship from breaking apart while they fix it, however you take some damage while attempting to leave the asteroid field. They offer you some military supplies as thanks for saving them.",
      scrapOnly(g, "medium"),
      ["Hull damage: 4.", sys, fire, grantRandomItem(g, "weapon")],
    );
  } else {
    result(
      g,
      "The drone keeps the ship stable enough to allow them to escape the asteroid field. They message you with map coordinates, \"You're that Federation ship the Rebels are after, aren't you? I can't offer much but I heard there was a Federation loyalist base nearby. Maybe they can help you?\"",
      undefined,
      [addQuest(g, "fed-base")],
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Capture the ship (QUEST_CREWDEAD_START)
// ---------------------------------------------------------------------------------------------------------------

function captureOffer(g: Game) {
  // Wiki citations:
  // > "Offer a solution." — [[Capture the ship]]
  // > "Agree to capture the ship." — [[Capture the ship#Offer a solution]]
  // > "A quest marker is added to your map." — [[Capture the ship#Offer a solution]]
  card(
    g,
    'They quickly scan your ship and say, "It appears you could help. A bandit has made off with some very important cargo, though I doubt they have any understanding of what it is they stole. We need you to capture the ship intact."',
    [
      { id: "q:capture:agree", label: "Agree to capture the ship." },
      { id: "q:capture:decline", label: "Decline." },
    ],
  );
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
    result(
      g,
      "They thank you for the assistance and when you tell them of your mission, one of the Engi asks if he can assist your crew. You welcome him aboard.",
      rollStandard(g, "low"),
      [crew(g, "Engi")],
    );
  } else if (r === "fuel") {
    // Rewards, "Fuel only": medium (2-4) fuel.
    result(
      g,
      "The station was in the process of being evacuated. A number of civilian Engi offer their gratitude as they finalize their preparations to leave. They offer some fuel as a reward.",
      {
        tier: "medium",
        scrap: 0,
        eligible: 0,
        fuel: rollFuel("q:engi-station:contact", (lo, hi) => between(g, [lo, hi])),
        missiles: 0,
        parts: 0,
      },
    );
  } else if (r === "empty") {
    result(
      g,
      "The Engi station is stripped bare and there are signs of a fierce battle. The Mantis must have left the distress call active to lure other ships into a trap.",
    );
  } else {
    const choices: Choice[] = [
      { id: "q:engi-station:fuel", label: "Request fuel." },
      { id: "q:engi-station:weapon", label: "Request weapon." },
      { id: "q:engi-station:drone", label: "Request drone." },
    ];
    // {{Blue Option|Engi Crew|Threat unresolved. Current Mission imperative: Protocol 52.34.}}
    if (hasEngi(g))
      choices.push({
        id: "q:engi-station:protocol",
        label: "Threat unresolved. Current Mission imperative: Protocol 52.34.",
      });
    card(
      g,
      'The station hails you, "Gratitude. Expected probability of defeat without assistance... 86.2 percent. Request suitable reward."',
      choices,
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Merchant's request (MERCHANT_REQUEST)
// ---------------------------------------------------------------------------------------------------------------

const PARTS_OWED = 5;

function fullPriceCard(g: Game, text: string) {
  card(g, text, [
    { id: "q:merchant:full", label: "Accept the new offer." },
    { id: "q:merchant:leave", label: "Leave." },
  ]);
}

function payParts(g: Game, id: string): string | null {
  const n = affordStock(g, id, "parts");
  if (n == null) return null;
  takeStock(g, "parts", n);
  return partsLine(n);
}

/** Merchant's request, "Investigate the Cargo": three results. */
function investigateCargo(g: Game) {
  const r = pick(g, ["note", "weapon", "supplies"] as const);
  if (r === "note") {
    result(
      g,
      "The cargo was some food and medical supplies, nothing that you need right now. You make a note of the delivery destination in case you want to drop off the cargo for the payment.",
      undefined,
      [addQuest(g, "merchant-station")],
    );
  } else if (r === "weapon") {
    // "You receive a weapon." Not named: a random one, as Rewards, "Weapon": "A random weapon & T scrap." (no scrap here).
    result(
      g,
      "You find a prototype weapon inside. You quickly install it on the ship.",
      undefined,
      [grantRandomItem(g, "weapon")],
    );
  } else {
    result(
      g,
      "There were general military supplies in the cargo crates. You take what you can use.",
      rollStandard(g, "high"),
    );
  }
}

/** Research station with no response, as the Merchant's Delivery "station doesn't respond" subevent ({{:...}} include). */
function researchStation(g: Game, intro: string) {
  // The include lists the Anti-Personnel Drone beside dock and leave. Lifeform Scanner stays on the standalone card.
  card(
    g,
    `${intro}

You find the small research station and discover that it's putting out a distress signal. Strangely, there is no response to your hails.`,
    [
      { id: "q:research:dock", label: "Dock with the station and investigate." },
      { id: "q:research:leave", label: "Leave it alone." },
      { id: "q:research:drone", label: "Send your battle drone in to help." },
    ],
  );
}

const APD_TEAR =
  "You send your Anti-Personnel drone to explore the station. What you find is disconcerting... It appears that something has caused the scientists and guards to tear each other to pieces. You abandon the drone on the station for fear that it is contagious.";
const APD_MOB =
  "Once on board the station, your drone is immediately beset by frenzied scientists and guards. It eventually gets torn apart by the mob but it has bought you enough time to disengage from the station and escape into empty space.";
const APD_CAMERAS =
  "The cameras mounted to your Anti-Personnel drone show a chaotic scene. No people are to be found but the remnants of a recent battle on-board the ship are obvious. You instruct the drone to retrieve some useful materials before leaving.";
const SCAN_CLEAR =
  "There are no life signs detected on the ship although there appears to be a number of deceased crew. There does not appear to be any airborn contagions so your crew quickly salvages what they can before moving on. You can only wonder what befell the station.";
const SCAN_LIFE =
  "Sensors show scattered signs of life although most of the crew are deceased. However the health signatures of the living indicate they are violent and unstable. You decide it's better to move on than risk engaging the remaining crew.";

/** Dock with the station. Three results and no odds. INFERRED: equal. Shared with Merchant's Delivery. */
function researchDock(g: Game) {
  const r = pick(g, ["parts", "survivor", "infected"] as const);
  if (r === "parts") {
    // "medium (1 drone part) drone parts and scrap" (Rewards#Drone parts).
    // Wiki citations:
    // > "Inside there are signs of a great struggle; scientists lie dead where they fell, brutally dismembered. You grab a few research drone parts lying on a desk near the door and leave quickly." — [[Research station with no response]]
    // > "You receive medium drone parts and scrap." — [[Research station with no response]]
    const offer = scrapOnly(g, "medium");
    offer.parts = 1;
    result(
      g,
      "Inside there are signs of a great struggle; scientists lie dead where they fell, brutally dismembered. You grab a few research drone parts lying on a desk near the door and leave quickly.",
      offer,
    );
  } else if (r === "survivor") {
    // Wiki citations:
    // > "You dock with the station and see a frantic person banging on the airlock door. Once inside your ship, he drops to the floor saying, \"My... friends... They've gone insane... They're coming!\" You hand him a blaster and turn to see a number of people charging toward the ship." — [[Research station with no response]]
    // > "You receive a crewmember." — [[Research station with no response]]
    // > "Prepare for a fight!" — [[Research station with no response]]
    // > "(Medbay) Have the advanced medbay analyze their condition. (Requires level 3 Medbay)" — [[Research station with no response]]
    const joined = crew(g, randomRace(g));
    const choices: Choice[] = [{ id: "q:research:brace", label: "Prepare for a fight!" }];
    // {{Blue Option|Medbay|Have the advanced medbay analyze their condition.|level=3}}
    if (medbay(g) >= 3)
      choices.push({
        id: "q:research:antidote",
        label: "Have the advanced medbay analyze their condition.",
      });
    card(
      g,
      `You dock with the station and see a frantic person banging on the airlock door. Once inside your ship, he drops to the floor saying, "My... friends... They've gone insane... They're coming!" You hand him a blaster and turn to see a number of people charging toward the ship.

${joined}`,
      choices,
    );
  } else {
    // Wiki citations:
    // > "As you explore the base, crazed screams are heard. Your team retreats back to your ship with a number of armed scientists in pursuit. One of your team starts to cough and falls in a spasm onto the floor." — [[Research station with no response]]
    // > "Drag him back to the ship and prepare for a fight." — [[Research station with no response]]
    // > "(Teleporter) Use your Teleporter to retrieve your crew." — [[Research station with no response]]
    // > "(Medbay) Drag him back to the Medbay. (Requires level 2 Medbay)" — [[Research station with no response]]
    // > "(Medbay) Have the Advanced Medbay analyze their condition. (Requires level 3 Medbay)" — [[Research station with no response]]
    const choices: Choice[] = [
      { id: "q:research:drag", label: "Drag him back to the ship and prepare for a fight." },
    ];
    if (hasTeleporter(g))
      choices.push({ id: "q:research:beam", label: "Use your Teleporter to retrieve your crew." });
    if (medbay(g) >= 2)
      choices.push({ id: "q:research:medbay", label: "Drag him back to the Medbay." });
    if (medbay(g) >= 3)
      choices.push({
        id: "q:research:cure",
        label: "Have the Advanced Medbay analyze their condition.",
      });
    card(
      g,
      "As you explore the base, crazed screams are heard. Your team retreats back to your ship with a number of armed scientists in pursuit. One of your team starts to cough and falls in a spasm onto the floor.",
      choices,
    );
  }
}

/** [ {{Transaction|1|subtract_drones}} ]. False when the ship has no part to spend. */
function spendDronePart(g: Game): boolean {
  if (g.player.parts < 1) return false;
  g.player.parts -= 1;
  return true;
}

/**
 * Anti-Personnel Drone. {{DuplicateEvent|2}} on the nothing pair, once on the cameras. INFERRED: those weights.
 * The printed OR is the two nothing sentences. INFERRED: equal inside that weight.
 * Footnote: no drone part is required if the reward includes drone parts. The printed 2/9 is that case, not a second roll.
 */
function researchDrone(g: Game) {
  if (!hasDrone(g, ["BATTLE"])) return;
  const kind = weighted(g, [
    ["nothing", 2],
    ["scrap", 1],
  ] as const);
  if (kind === "nothing") {
    // Wiki citations:
    // > "You send your Anti-Personnel drone to explore the station. What you find is disconcerting... It appears that something has caused the scientists and guards to tear each other to pieces. You abandon the drone on the station for fear that it is contagious." — [[Research station with no response]]
    // > "Once on board the station, your drone is immediately beset by frenzied scientists and guards. It eventually gets torn apart by the mob but it has bought you enough time to disengage from the station and escape into empty space." — [[Research station with no response]]
    // > "Nothing happens." — [[Research station with no response]]
    // > "Drone parts lost: 1" — [[Research station with no response]]
    if (!spendDronePart(g)) return;
    const text = pick(g, [APD_TEAR, APD_MOB] as const);
    result(g, text, undefined, ["Nothing happens.", "Drone parts: -1."]);
    return;
  }
  // Wiki citations:
  // > "The cameras mounted to your Anti-Personnel drone show a chaotic scene. No people are to be found but the remnants of a recent battle on-board the ship are obvious. You instruct the drone to retrieve some useful materials before leaving." — [[Research station with no response]]
  // > "You receive medium scrap with resources." — [[Research station with no response]]
  // > "Drone parts lost: 1" — [[Research station with no response]]
  const hull = g.player.hull;
  const lines = g.log.slice();
  const offer = rollStandard(g, "medium");
  if (offer.parts <= 0 && !spendDronePart(g)) {
    g.player.hull = hull;
    g.log = lines;
    return;
  }
  result(g, APD_CAMERAS, offer, offer.parts <= 0 ? ["Drone parts: -1."] : []);
}

/** Lifeform Scanner. Two results and no odds. INFERRED: equal. Standalone card only. */
function researchScan(g: Game) {
  if (!g.augments.includes("LIFE_SCANNER")) return;
  if (
    weighted(g, [
      ["clear", 1],
      ["life", 1],
    ] as const) === "clear"
  ) {
    // Wiki citations:
    // > "There are no life signs detected on the ship although there appears to be a number of deceased crew. There does not appear to be any airborn contagions so your crew quickly salvages what they can before moving on. You can only wonder what befell the station." — [[Research station with no response]]
    // > "You receive medium scrap with resources." — [[Research station with no response]]
    result(g, SCAN_CLEAR, rollStandard(g, "medium"));
    return;
  }
  // Wiki citations:
  // > "Sensors show scattered signs of life although most of the crew are deceased. However the health signatures of the living indicate they are violent and unstable. You decide it's better to move on than risk engaging the remaining crew." — [[Research station with no response]]
  // > "Nothing happens." — [[Research station with no response]]
  result(g, SCAN_LIFE, undefined, ["Nothing happens."]);
}

// ---------------------------------------------------------------------------------------------------------------
// Nebula wreckage (NEBULA_BATTLEFIELD)
// ---------------------------------------------------------------------------------------------------------------

/** The two choices that follow a found survivor. INVENTED: the label "Assist the survivor." (the page links a section). */
const survivorChoices = (): Choice[] => [
  { id: "q:nebula:assist", label: "Assist the survivor." },
  { id: "q:nebula:leave", label: "Leave the battlefield before other ships arrive." },
];

function zoltanCard(g: Game, lead: string) {
  const choices: Choice[] = [
    { id: "q:abadoth:explain", label: "Explain about finding the dead crewman." },
  ];
  // {{Blue Option|Engi Crew|Say ABADOTH.}}
  if (hasEngi(g)) choices.push({ id: "q:abadoth:engi", label: "Say ABADOTH." });
  choices.push(
    { id: "q:abadoth:anodyne", label: "Say ANODYNE." },
    { id: "q:abadoth:abadoth", label: "Say ABADOTH." },
    { id: "q:abadoth:abatodh", label: "Say ABATODH." },
  );
  const body = "A Zoltan ship decloaks and demands your reason for being here!";
  card(g, lead ? `${lead}\n\n${body}` : body, choices);
}

const ZOLTAN_FIGHT =
  "There is a moment of silence, and suddenly the Zoltan ship cloaks - must have been the wrong word to use... now you've got a fight on your hands!";
/** "Fight a Zoltan ship (default rewards)": no PAGE_WINS row, so winCombat pays the default salvage. */
function zoltanFight(g: Game) {
  // Wiki citations:
  // > "Fight a Zoltan ship (default rewards)." — [[Nebula wreckage#Find a Zoltan ship]]
  pageFight(g, ZOLTAN_FIGHT, "Zoltan ship", "quest-abadoth-zoltan");
}
function zoltanThanks(g: Game, lead: string) {
  result(
    g,
    `${lead}There is a moment of silence, and the ship's captain solemnly thanks you for the information. He wishes you well on your journey, and he offers several upgrades to assist you in exchange for your service to the Zoltan race.`,
    rollStandard(g, "medium"),
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The part (wiki/quests.ts PARTS). Built only from functions and literals, so it is safe in the import cycle.
// ---------------------------------------------------------------------------------------------------------------

export const PART_B: QuestPart = {
  quests: {
    // Asteroid belt distress, Encrypted federation signal and Engi ship attacked by Mantis ship also add the existing
    // "fed-base" marker ({{Hidden federation base}}, wiki/quests.ts).
    "capture-ship": { page: "Capture the ship", title: "Bandit ship" },
    "fed-assist": { page: "Encrypted federation signal", title: "Federation outpost" },
    "merchant-delivery": { page: "Merchant's request", title: "Delivery station" },
    "merchant-investigation": { page: "Merchant's request", title: "Lost freighter" },
    "merchant-station": { page: "Merchant's request", title: "Cargo destination" },
    abadoth: { page: "Nebula wreckage", title: "Dead crewman's coordinates" },
  },

  arrive: {
    // Template:Hidden federation base, "Federation Base Assist": the same four arrivals as arriveFedAssist.
    "fed-assist": (g) => {
      arriveFedAssist(g);
    },
    // Merchant's request, "Merchant's Delivery": the station doesn't respond / responds.
    "merchant-delivery": (g) => {
      const intro =
        "You arrive at the location given to you by the merchant. You are supposed to deliver drone parts to a station here.";
      if (rand(g) < 0.5) {
        researchStation(g, intro);
        return;
      }
      const choices: Choice[] = [
        { id: "q:merchant:paltry", label: "Accept the paltry payment." },
        { id: "q:merchant:refuse", label: "Refuse and keep the drone parts." },
      ];
      // {{Blue Option|Mind Control|...}} (the Mind Control system is the "mind" kit); {{Blue Option|Weapons|...|level=6+}}.
      if ((g.player.kits.mind?.level ?? 0) > 0)
        choices.push({ id: "q:merchant:mind", label: "Convince him that he's being 'unfair'." });
      if ((g.player.systems.weapons?.level ?? 0) >= 6)
        choices.push({
          id: "q:merchant:weapons",
          label: "Remain silent but power up your weapons.",
        });
      card(
        g,
        `${intro}

You find the station and they respond to your hails immediately, saying, "It took you long enough! We have practically no use for these now... I refuse to pay full price, take this and leave the cargo in our holds."`,
        choices,
      );
    },
    // Merchant's request, "Merchant's Investigation": three results.
    "merchant-investigation": (g) => {
      const intro =
        "You arrive at the last known location of the merchant's delivery. You begin to scan for the lost ship.";
      const r = pick(g, ["remains", "crew", "pirate"] as const);
      if (r === "remains") {
        result(
          g,
          `${intro}

You find the remains of the ship. It seems to have severe external damage, but you cannot pinpoint a cause. The majority of its cargo seems intact. You manage to discern the ship's intended destination.`,
          rollStandard(g, "medium"),
          [],
          [
            {
              id: "q:merchant:cargo-deliver",
              label: "Take the cargo and head to its original destination in search of a reward.",
            },
            { id: "q:merchant:cargo-take", label: "Take the cargo for yourself." },
          ],
        );
      } else if (r === "crew") {
        const choices: Choice[] = [
          {
            id: "q:merchant:promise",
            label:
              "Promise to deliver the cargo and ask if any would be interested in joining your crew.",
          },
          {
            id: "q:merchant:cargo-drop",
            label: "Take the cargo but drop them off at a nearby station.",
          },
        ];
        if (hasTeleporter(g))
          choices.push({
            id: "q:merchant:cargo-beam",
            label: "Beam the cargo aboard and leave them to their fate.",
          });
        card(
          g,
          `${intro}

You find a severely damaged ship floating among some debris. The crew hails you, "I can't believe that cheap bastard sent someone after us! I thought we would freeze to death. If you help us complete the delivery, we'll share the reward and join your crew."`,
          choices,
        );
      } else {
        // An arrival must leave a card (sim.ts eventFor falls through when questEvent returns no event), so the fight
        // starts from a button. Merchant's request, Merchant's Investigation: "Fight a Pirate ship."
        card(
          g,
          `${intro}

After a quick scan, you find a ship being chased by a pirate. This must be the missing delivery ship! You move in to rescue them.`,
          [{ id: "q:merchant:pirate", label: "Fight a Pirate ship." }],
        );
      }
    },
    // Merchant's request, "Deliver to the Station quest marker": "a drone schematic with medium scrap". Rewards,
    // "Drone": "A random drone schematic & T scrap."
    "merchant-station": (g) => {
      // Wiki citations:
      // > "You receive a drone schematic with medium scrap." — [[Merchant's request#Deliver to the Station quest marker]]
      result(
        g,
        'You find the station that had ordered your cargo. You drop it off and they respond, "Ignoring the fact that this is days late, we really appreciate that you delivered our materials. We realize how dangerous this sector is these days. Take this as payment."',
        scrapOnly(g, "medium"),
        [grantRandomItem(g, "drone")],
      );
    },
    // Nebula wreckage, "Quest Marker".
    abadoth: (g) => {
      const choices: Choice[] = [];
      // {{Blue Option|Slug Crew|Ask your Slug crewmember to scan for life forms.}}
      if (hasSlug(g))
        choices.push({
          id: "q:abadoth:slug",
          label: "Ask your Slug crewmember to scan for life forms.",
        });
      choices.push({
        id: "q:abadoth:scan",
        label:
          "Do a full system scan - though you're sure to lose some of your lead with the Rebels.",
      });
      card(
        g,
        "You have arrived at the coordinates given to you by the dead crewman you attempted to save. There doesn't seem to be anything here - no planets, no vessels, and no clue as to what he meant by sending you here.",
        choices,
      );
    },
  },

  choices: {
    // ---- Asteroid belt distress ----
    "c:asteroid-belt-distress:0": (g) => asteroidCard(g),
    "q:asteroid:shield": (g) => {
      // Wiki citations:
      // > "You succeed in preventing them from being entirely destroyed, but your ship took a number of hits in the process." — [[Asteroid belt distress]]
      // > "Your ship takes 1 hull damage" — [[Asteroid belt distress]]
      // > "Despite your best efforts, the civilian ship breaks apart from the constant barrage." — [[Asteroid belt distress]]
      // > "Your ship takes 4 hull damage, and you receive low scrap." — [[Asteroid belt distress]]
      // > "You try your best but one stray rock hits a key structure in their ship." — [[Asteroid belt distress]]
      // > "You receive low scrap." — [[Asteroid belt distress]]
      const r = pick(g, ["saved", "lost", "rock"] as const);
      if (r === "saved") {
        if (damageHull(g, 1)) return;
        const fire = roomHit(g);
        result(
          g,
          "You succeed in preventing them from being entirely destroyed, but your ship took a number of hits in the process. They offer some of the scrap and fuel they were mining out of the asteroid as thanks.",
          fuelAndScrap(g, "high"),
          ["Hull damage: 1.", fire],
        );
      } else if (r === "lost") {
        if (damageHull(g, 4)) return;
        result(
          g,
          "Despite your best efforts, the civilian ship breaks apart from the constant barrage. You are barely able to break out of the asteroid field yourself. The ship sustains some damage in the process.",
          scrapOnly(g, "low"),
          ["Hull damage: 4."],
        );
      } else {
        result(
          g,
          "You try your best but one stray rock hits a key structure in their ship. It breaks apart in front of your eyes. You salvage what you can before leaving, and try not to think about the lost crew.",
          scrapOnly(g, "low"),
        );
      }
    },
    "q:asteroid:leave": (g) => {
      // Wiki citations:
      // > "Rebel Fleet pursuit is doubled for 1 jump." — [[Asteroid belt distress]]
      // > "Nothing happens." — [[Asteroid belt distress]]
      if (rand(g) < 0.5) {
        result(
          g,
          "You regretfully leave the area, not able to watch them get destroyed. A short while later you get a second message, \"We survived, no thanks to you! Don't think I don't know that the Rebels are hunting for you. I'll be sure to tell them where you are the next time I see them!\"",
          undefined,
          [doublePursuit(g)],
        );
      } else {
        result(g, "You watch helplessly as their ship smashes against a cruiser-sized rock...");
      }
    },
    "q:asteroid:defense": (g) => asteroidDrone(g, "q:asteroid:defense"),
    "q:asteroid:repair": (g) => asteroidDrone(g, "q:asteroid:repair"),
    "q:asteroid:teleport": (g) => {
      // Wiki citations:
      // > "You receive a crewmember." — [[Asteroid belt distress]]
      // > "Take them to the nearby planet, where they're from." — [[Asteroid belt distress]]
      if (rand(g) < 0.5) {
        // "You receive a crewmember." Race not named: INFERRED random.
        result(
          g,
          "They reluctantly agree. Once aboard, you watch as their ship crashes against a massive rock. They thank you, but say \"I don't know what we'll do without our ship. As the Captain, I feel obligated to help you with your mission.\"",
          undefined,
          [crew(g, randomRace(g))],
        );
      } else {
        card(
          g,
          'They refuse at first, but after another blast rocks their ship they agree and beam aboard your ship. They say, "Thank you but we really should return to our families... I\'m sure we can muster up a reward if you take us home."',
          [{ id: "q:asteroid:home", label: "Take them to the nearby planet, where they're from." }],
        );
      }
    },
    // Template:ReturnSurvivor|Asteroid belt distress: three results.
    "q:asteroid:home": (g) => {
      const r = pick(g, ["rich", "modest", "repair"] as const);
      if (r === "rich") {
        result(
          g,
          "The family apparently owns one of the most valuable mining enterprises in the sector. For the safe return of his son, the patron of the family offers you a substantial reward.",
          scrapOnly(g, "high"),
        );
      } else if (r === "modest") {
        result(
          g,
          "The survivor's family is of modest means, yet they manage to offer you a reward for your virtuous deed.",
          scrapOnly(g, "medium"),
        );
      } else {
        result(
          g,
          "Overjoyed with the return of their son, the family of the survivor arranges to repair your ship's hull as compensation.",
          undefined,
          [repair(g, 10)],
        );
      }
    },
    "q:asteroid:rock": (g) => {
      // Wiki citations:
      // > "You receive medium fuel and scrap." — [[Asteroid belt distress]]
      result(
        g,
        "You succeed in preventing them from being entirely destroyed, your improved hull taking the brunt of the asteroids that make it past your defenses. They offer you some of the scrap and fuel they were mining out of the asteroid as thanks.",
        fuelAndScrap(g, "medium"),
      );
    },

    // ---- Capture the ship ----
    "c:capture-the-ship:0": (g) => {
      result(
        g,
        'They briefly scan your ship and inform you that you are not "properly equipped" for this type of mission.',
      );
    },
    "c:capture-the-ship:1": (g) =>
      result(g, "If they wanted your help they would surely ask for it. You prepare to leave."),
    "c:capture-the-ship:2": (g) => captureOffer(g),
    "c:capture-the-ship:3": (g) => captureOffer(g),
    "c:capture-the-ship:4": (g) => captureOffer(g),
    "q:capture:decline": (g) => {
      result(
        g,
        '"We understand. Hopefully we can find a solution to this on our own." You prepare to jump.',
      );
    },
    // PIRATE_QUEST_CREWDEAD, {{SurrenderEscape(alt)|no|...}}. INVENTED: the log line (the page prints none).
    "q:capture:fight": (g) => {
      // Wiki citations:
      // > "Fight a Pirate ship." — [[Capture the ship#Quest Marker]]
      noRun(g, "The pirate ship moves to engage.", "Pirate ship", "quest-capture-ship");
    },
    // {{Winning|destroyed=true}}: "15 hull damage, 1 damage to a random system, 1 damage with fire and a breach to a
    // random room". Applied on this card's button, not inside winCombat: a hull loss there would be overwritten by the
    // default salvage (sim.ts winCombat pays it when pageWin does not leave an event card).
    "q:capture:blast": (g) => {
      // Wiki citations:
      // > "Your ship takes 15 hull damage, 1 damage to a random system" — [[Capture the ship#Quest Marker]]
      if (damageHull(g, 15)) return;
      paid(g, undefined, ["Hull damage: 15.", systemHit(g), roomHit(g, true)]);
    },

    // ---- Encrypted federation signal ----
    "c:encrypted-federation-signal:0": (g) => {
      // Wiki citations:
      // > "A Hidden Federation Base quest marker is added to your map." — [[Encrypted federation signal]]
      // > "You find a small cache of supplies that were surely left for any loyal Federation ships in trouble." — [[Encrypted federation signal]]
      const r = pick(g, ["base", "assist", "cache", "trap", "empty"] as const);
      if (r === "base") {
        result(
          g,
          "You find a secret federation outpost. They are regrettably out of supplies but are eager to tell you of another secret base. They give you the coordinates.",
          undefined,
          [addQuest(g, "fed-base")],
        );
      } else if (r === "assist") {
        // "medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap" (Rewards#Stuff).
        result(
          g,
          'You find a hidden federation outpost. They message you, "Quick, we just got word from a sister outpost that they\'ve been discovered by the Rebels and are under attack! If you are still loyal to the Federation, go save them!"',
          rollSurrenderOffer(g, "medium", true),
          [addQuest(g, "fed-assist")],
        );
      } else if (r === "cache") {
        result(
          g,
          "You find a small cache of supplies that were surely left for any loyal Federation ships in trouble. You take all that you need, leaving some for others to find.",
          rollStandard(g, "high"),
        );
      } else if (r === "trap") {
        // Wiki citations:
        // > "2-3 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Encrypted federation signal]]
        pageFight(
          g,
          'As you approach the signal you receive a message on a Rebel channel, "I knew we\'d catch some Federation fish with this signal. Prepare to be boarded, scum!"',
          "Rebel ship",
          "encrypted-federation-signal",
        );
        humanBoarders(g, 2, 3);
      } else {
        result(
          g,
          "You find a secret Federation outpost... but it appears the Rebels have found it before you; the place is empty and faint bloodstains can be seen in the living quarters. You find the encrypted signal emitter and shut it off before leaving.",
        );
      }
    },

    // ---- Engi ship attacked by Mantis ship ----
    "c:engi-ship-attacked-by-mantis-ship:0": (g) => {
      // Wiki citations:
      // > "You fight a normal Mantis ship." — [[Engi ship attacked by Mantis ship]]
      // > "1-2 mantis boarders beam aboard your ship and you fight a mantis-controlled Engi ship (default rewards)." — [[Engi ship attacked by Mantis ship]]
      if (rand(g) < 0.5) {
        noRun(
          g,
          "You approach to find a Mantis ship assaulting a small Engi space station. You prepare for a fight!",
          "Mantis ship",
          ENGI_PAGE,
        );
      } else {
        // "1-2 mantis boarders beam aboard your ship and you fight a mantis-controlled Engi ship (default rewards)."
        // ENGI_MANTIS_CONTROLLED, {{SurrenderEscape(alt)|no|...}}. INFERRED: its crew are Mantis.
        noRun(
          g,
          'You receive another message from the ship, this time with a Mantis at the comm-log. "Foolish meatsacks," he yells. Sensors indicate the ship is moving in to attack and boarders teleport from the station.',
          "Engi ship",
          ENGI_PAGE_ENGI,
        );
        const hp = crewDef("mantis").hp;
        for (const c of g.crew) {
          if (c.side !== "enemy") continue;
          c.kin = "mantis";
          c.hp = hp;
          c.maxHp = hp;
        }
        mantisBoarders(g, 1, 2);
      }
    },
    "q:engi-station:contact": (g) => engiContact(g),
    "q:engi-station:fuel": (g) =>
      result(g, '"Request granted. Fuel transferring."', fuelAndScrap(g, "high")),
    // "a weapon with low scrap" / "a drone schematic with low scrap". Rewards, "Weapon": "A random weapon & T scrap."
    // "Drone": "A random drone schematic & T scrap."
    "q:engi-station:weapon": (g) => {
      // Wiki citations:
      // > "You receive a weapon with low scrap." — [[Engi ship attacked by Mantis ship#Contact the Engi]]
      result(g, '"Request granted. Weapon transferring."', scrapOnly(g, "low"), [
        grantRandomItem(g, "weapon"),
      ]);
    },
    "q:engi-station:drone": (g) => {
      // Wiki citations:
      // > "You receive a drone schematic with low scrap." — [[Engi ship attacked by Mantis ship#Contact the Engi]]
      result(g, '"Request granted. Drone schematic transferring."', scrapOnly(g, "low"), [
        grantRandomItem(g, "drone"),
      ]);
    },
    // "a weapon with low scrap, your ship receives 10 repairs and a Hidden Federation Base quest marker". Rewards,
    // "Weapon": "A random weapon & T scrap."
    "q:engi-station:protocol": (g) => {
      // Wiki citations:
      // > "(Engi Crew) Threat unresolved. Current Mission imperative: Protocol 52.34." — [[Engi ship attacked by Mantis ship#Contact the Engi]]
      // > "You receive a weapon with low scrap, your ship receives 10 repairs and a Hidden Federation Base quest marker is added to your map." — [[Engi ship attacked by Mantis ship#Contact the Engi]]
      result(
        g,
        'They respond, "Understood. Re-establishment of Federation highest import. Transmitting hidden base coordinates. Repairing hull and attaching ship to ship ordnance."',
        scrapOnly(g, "low"),
        [grantRandomItem(g, "weapon"), repair(g, 10), addQuest(g, "fed-base")],
      );
    },

    // ---- Merchant's request ----
    "c:merchant-s-request:0": (g) => {
      if (rand(g) < 0.5) {
        card(
          g,
          '"Great, I was worried no one would respond. My usual carrier is days late. I need you to deliver this cargo of drone parts to a small station a few jumps from here. I\'ll pay you a bit of scrap now, but they will surely tip you generously."',
          [
            { id: "q:merchant:deliver", label: "Accept." },
            { id: "q:merchant:deliver-no", label: "Decline." },
          ],
        );
      } else {
        card(
          g,
          "\"Your ship seems reasonably equipped... A freighter carrying a shipment of my goods is a week late. The fools flew through a pirate-filled sector in their haste and I fear for the cargo's safety. I'm looking for a less incompetent captain to investigate.\"",
          [
            { id: "q:merchant:investigate", label: "Accept." },
            { id: "q:merchant:investigate-no", label: "Decline" },
          ],
        );
      }
    },
    // "You receive 5 drone parts and Merchant's Delivery quest marker is added to your map."
    "q:merchant:deliver": (g) => {
      // Wiki citations:
      // > "You receive Drone parts gained: 5 and Merchant's Delivery quest marker is added to your map." — [[Merchant's request]]
      g.player.parts += PARTS_OWED;
      result(
        g,
        "Great! I uploaded their location to your star map. I'm running out of options, so I have no choice but to trust you'll do what you have agreed to do.",
        undefined,
        [`Drone parts: ${PARTS_OWED}.`, addQuest(g, "merchant-delivery")],
      );
    },
    "q:merchant:deliver-no": (g) =>
      result(g, '"Fine, I\'ll keep looking for someone who wishes to make some easy money..."'),
    "q:merchant:investigate-no": (g) => {
      result(
        g,
        '"At least YOU are willing to admit your incompetence. Thank you for saving me the cost of paying more fools to go to their death."',
      );
    },
    // "You receive 20-30 scrap and lose 5 drone parts."
    "q:merchant:paltry": (g) => {
      // Wiki citations:
      // > "You receive Scrap gained: 20-30 and lose Drone parts lost: 5." — [[Merchant's request#The station responds]]
      const parts = payParts(g, "q:merchant:paltry");
      if (!parts) return;
      result(g, "You drop the parts off and take your pay.", printedScrap(g, "paltry"), [parts]);
    },
    "q:merchant:refuse": (g) => {
      if (rand(g) < 0.5) fullPriceCard(g, '"Fine, I was bluffing. I\'ll pay the full price."');
      else result(g, "The merchant disconnects in a huff.");
    },
    "q:merchant:mind": (g) => {
      fullPriceCard(
        g,
        '"I\'m being unfair. You did the job and the parts are here safe and sound. Here is the agreed upon amount."',
      );
    },
    // "You receive 40-55 scrap and lose 5 drone parts." The page prints no text for it.
    "q:merchant:full": (g) => {
      const parts = payParts(g, "q:merchant:full");
      if (!parts) return;
      paid(g, printedScrap(g, "full"), [parts]);
    },
    "q:merchant:leave": (g) => done(g),
    // "You receive 55-70 scrap, 2-5 fuel and lose 5 drone parts."
    "q:merchant:weapons": (g) => {
      const parts = payParts(g, "q:merchant:weapons");
      if (!parts) return;
      const offer = printedScrap(g, "weapons") ?? {
        tier: "low" as const,
        scrap: 0,
        eligible: 0,
        fuel: 0,
        missiles: 0,
        parts: 0,
      };
      offer.fuel = rollFuel("q:merchant:weapons", (lo, hi) => between(g, [lo, hi]));
      result(
        g,
        '"You make a good point. You traveled all the way out here to fulfill our request, despite what must have been... a difficult scenario to cause such a delay. Here, we\'ll even tip you for the inconvenience you must have gone through..."',
        offer,
        [parts],
      );
    },
    // JELLY_PIRATE_MERCHANT, {{SurrenderEscape(alt)|no|...}}. INVENTED: the log line.
    "q:merchant:pirate": (g) =>
      noRun(g, "The pirate turns on you.", "Pirate ship", "quest-merchant-pirate"),
    "q:merchant:cargo-deliver": (g) => paid(g, undefined, [addQuest(g, "merchant-station")]),
    "q:merchant:cargo-take": (g) => investigateCargo(g),
    "q:merchant:cargo-drop": (g) => investigateCargo(g),
    "q:merchant:cargo-beam": (g) => investigateCargo(g),
    // "You receive a crewmember and Deliver to the Station quest marker". Race not named: INFERRED random.
    "q:merchant:promise": (g) => {
      // Wiki citations:
      // > "You receive a crewmember and Deliver to the Station quest marker is added to your map." — [[Merchant's request#Merchant's Investigation]]
      result(
        g,
        "They upload the delivery destination once on board. One takes you up on your offer, the rest you drop off at a nearby station.",
        undefined,
        [crew(g, randomRace(g)), addQuest(g, "merchant-station")],
      );
    },

    // ---- Research station with no response (Merchant's Delivery and the standalone card) ----
    "q:research:dock": (g) => researchDock(g),
    "c:research-station-with-no-response:0": (g) => researchDock(g),
    // Standalone "Leave it alone." prints "Nothing happens." Merchant's Delivery still uses q:research:leave.
    "c:research-station-with-no-response:1": (g) => {
      // Wiki citations:
      // > "Leave it alone." — [[Research station with no response]]
      // > "Nothing happens." — [[Research station with no response]]
      result(g, "Nothing happens.");
    },
    "q:research:drone": (g) => researchDrone(g),
    "c:research-station-with-no-response:2": (g) => researchDrone(g),
    "c:research-station-with-no-response:3": (g) => researchScan(g),
    "q:research:leave": (g) => done(g),
    // "3-4 human boarders beam aboard your ship." No enemy ship.
    "q:research:brace": (g) => {
      // Wiki citations:
      // > "Prepare for a fight!" — [[Research station with no response]]
      humanBoarders(g, 3, 4, "human boarders beam aboard.");
      beginBoarding(g);
    },
    "q:research:antidote": (g) => {
      // Wiki citations:
      // > "You hold them off while retreating into the med-bay. Its advanced systems determine that an alien neurotoxin is the cause of their frenzy. It synthesizes an antidote and releases it into the room. After a time, the scientists recover. One offers their services as thanks for saving them." — [[Research station with no response]]
      // > "You receive a crewmember with 1 skill in repair and medium scrap." — [[Research station with no response]]
      result(
        g,
        "You hold them off while retreating into the med-bay. Its advanced systems determine that an alien neurotoxin is the cause of their frenzy. It synthesizes an antidote and releases it into the room. After a time, the scientists recover. One offers their services as thanks for saving them.",
        scrapOnly(g, "medium"),
        [crew(g, randomRace(g), "repair")],
      );
    },
    // "You lose a crewmember, who becomes an enemy, and 3-4 human boarders beam aboard your ship."
    "q:research:drag": (g) => {
      // Wiki citations:
      // > "As you get back on board, your injured friend rises up and starts to attack you, screaming. Caught off-guard, your remaining crew fall back as the other scientists fight their way onto the ship." — [[Research station with no response]]
      // > "You lose a crewmember, who becomes an enemy, and 3-4 human boarders beam aboard your ship." — [[Research station with no response]]
      turnCoat(g);
      humanBoarders(g, 3, 4, "human boarders beam aboard.");
      beginBoarding(g);
      showEventLines(g, [
        "As you get back on board, your injured friend rises up and starts to attack you, screaming. Caught off-guard, your remaining crew fall back as the other scientists fight their way onto the ship.",
      ]);
    },
    // Teleporter: "lose a crewmember, who becomes an enemy." No extra boarders. Last crew stays (the card remains).
    "q:research:beam": (g) => {
      // Wiki citations:
      // > "(Teleporter) Use your Teleporter to retrieve your crew." — [[Research station with no response]]
      // > "You beam your away team back to the ship and disengage from the station. Although the ship is safe, the infected crew member quickly becomes frenzied and attacks." — [[Research station with no response]]
      // > "You lose a crewmember, who becomes an enemy." — [[Research station with no response]]
      const text =
        "You beam your away team back to the ship and disengage from the station. Although the ship is safe, the infected crew member quickly becomes frenzied and attacks.";
      if (!turnCoat(g)) {
        result(g, text);
        return;
      }
      beginBoarding(g);
      showEventLines(g, [text]);
    },
    // Medbay level 2: "3-4 human boarders beam aboard your ship." The crewmember recovers.
    "q:research:medbay": (g) => {
      // Wiki citations:
      // > "(Medbay) Drag him back to the Medbay. (Requires level 2 Medbay)" — [[Research station with no response]]
      // > "You hold him down and the medbay is able to stop whatever neurotoxin was on the ship from fully infecting your crew. Once he recovers, you prepare to fight off the scientists, who are beyond help." — [[Research station with no response]]
      humanBoarders(g, 3, 4, "human boarders beam aboard.");
      beginBoarding(g);
      showEventLines(g, [
        "You hold him down and the medbay is able to stop whatever neurotoxin was on the ship from fully infecting your crew. Once he recovers, you prepare to fight off the scientists, who are beyond help.",
      ]);
    },
    "q:research:cure": (g) => {
      // Wiki citations:
      // > "(Medbay) Have the Advanced Medbay analyze their condition. (Requires level 3 Medbay)" — [[Research station with no response]]
      // > "You hold them off while retreating into the med-bay. Its advanced systems determine that an alien neurotoxin is driving your crew member insane. It synthesizes an antidote and releases it into the ship. After a time, the frenzied scientists recover and one offers to help out as thanks for saving them." — [[Research station with no response]]
      // > "You receive a crewmember." — [[Research station with no response]]
      result(
        g,
        "You hold them off while retreating into the med-bay. Its advanced systems determine that an alien neurotoxin is driving your crew member insane. It synthesizes an antidote and releases it into the ship. After a time, the frenzied scientists recover and one offers to help out as thanks for saving them.",
        undefined,
        [crew(g, randomRace(g))],
      );
    },

    // ---- Nebula wreckage ----
    "c:nebula-wreckage:0": (g) => {
      // Wiki citations:
      // > "(Slug Crew) Ask your Slug crew to scan for survivors." — [[Nebula wreckage]]
      if (!hasSlug(g)) return;
      card(
        g,
        "Despite the destruction filling the system, your crewman is able to pick up the faint thoughts of a life form in the debris - it looks like they won't last much longer without help.",
        survivorChoices(),
      );
    },
    "c:nebula-wreckage:1": (g) => {
      // Wiki citations:
      // > "3× The wreckage is drifting faster than it first appeared." — [[Nebula wreckage]]
      // > "Nothing happens." — [[Nebula wreckage]]
      // > "Your ship takes 5 hull damage" — [[Nebula wreckage]]
      // > "You spot a life form floating within the wreckage." — [[Nebula wreckage]]
      const r = weighted(g, [
        ["nothing", 3],
        ["pummeled", 1],
        ["survivor", 1],
      ] as ["nothing" | "pummeled" | "survivor", number][]);
      if (r === "nothing") {
        result(
          g,
          "The wreckage is drifting faster than it first appeared. You barely avoid being pummeled by drifting wreckage - unable to detect anything of interest, you decide not to risk your ship and prepare to jump.",
        );
      } else if (r === "pummeled") {
        if (damageHull(g, 5)) return;
        result(
          g,
          "As you investigate the battlefield, your ship is pummeled by drifting wreckage - unable to detect anything of interest, you decide not to risk any further damage to your hull and prepare to jump.",
          undefined,
          ["Hull damage: 5.", roomHit(g)],
        );
      } else {
        card(g, "You spot a life form floating within the wreckage.", survivorChoices());
      }
    },
    "q:nebula:leave": (g) => done(g),
    "q:nebula:assist": (g) => {
      const choices: Choice[] = [
        { id: "q:nebula:comfort", label: "Make them comfortable for their final moments." },
      ];
      // {{Blue Option|Advanced Medbay|...|level=2+}}, {{Blue Option|Clonebay|...}}.
      if (medbay(g) >= 2)
        choices.push({ id: "q:nebula:medbay", label: "Get them into the medbay!" });
      if (hasClonebay(g))
        choices.push({ id: "q:nebula:clone", label: "Try to clone them before it's too late." });
      card(
        g,
        "You bring the survivor aboard, but discover their wounds are severe. They won't live much longer.",
        choices,
      );
    },
    // "You receive a crewmember." Race not named: INFERRED random.
    "q:nebula:medbay": (g) => {
      result(
        g,
        "Using your upgraded medical bay, you are able to heal the survivor's wounds and they recover quickly. Grateful to be saved, they offer to join your crew and help however they can.",
        undefined,
        [crew(g, randomRace(g))],
      );
    },
    "q:nebula:clone": (g) => {
      result(
        g,
        "You clone the individual and let the host pass away. The clone decides to join you - although it has little choice in the matter.",
        undefined,
        [crew(g, randomRace(g))],
      );
    },
    "q:abadoth:slug": (g) => zoltanCard(g, ""),
    "q:abadoth:scan": (g) => {
      // Wiki citations:
      // > "Rebel Fleet pursuit is doubled for 1 jump and you find a Zoltan ship." — [[Nebula wreckage#Quest Marker]]
      const line = doublePursuit(g);
      zoltanCard(
        g,
        `You start the arduous task of a full system scan. This better be worth it.

${line}`,
      );
    },
    "q:abadoth:explain": (g) => {
      // Wiki citations:
      // > "Fight a Zoltan ship (default rewards)." — [[Nebula wreckage#Find a Zoltan ship]]
      zoltanFight(g);
    },
    "q:abadoth:anodyne": (g) => zoltanFight(g),
    "q:abadoth:abatodh": (g) => zoltanFight(g),
    "q:abadoth:abadoth": (g) => {
      // Wiki citations:
      // > "You receive medium scrap with resources." — [[Nebula wreckage#Find a Zoltan ship]]
      zoltanThanks(g, "");
    },
    "q:abadoth:engi": (g) =>
      zoltanThanks(
        g,
        "Your Engi crewman easily recalls the phrase the deadman used from its memory banks. ",
      ),
  },

  disabled: (_g, _id) => {
    // Wiki citations:
    // > "(Teleporter) Offer to board their ship." — [[Capture the ship]]
    // > "(Fire Bomb) Offer to burn the crew out." — [[Capture the ship]]
    // > "(Bio Beam) Offer to 'remove' their crew. (Requires Anti-Bio Beam)" — [[Capture the ship]]
    // > "(Slug Crew) Ask your Slug crew to scan for survivors." — [[Nebula wreckage]]
    // [ {{Transaction|1|subtract_drones}} ] and "lose 5 drone parts".
    // Research station with no response. The fitted schematic is kit.target. A missing part does not close the drone:
    // the footnote waives it when the reward includes drone parts.
    // INFERRED: the refusal lines. The page names the drone and the scanner and does not print these sentences.
    // Wiki citations:
    // > "(Anti-Personnel Drone) Send your battle drone in to help. [ Drone parts lost: 1 ]" — [[Research station with no response]]
    // Wiki citations:
    // > "(Life Scanner) Run advanced life scans." — [[Research station with no response]]
    return null;
  },

  wins: {
    // Capture the ship: destroyed -> the chain explosion (applied by "q:capture:blast"); deadCrew -> "a weapon with high
    // scrap". Rewards, "Weapon": "A random weapon & T scrap."
    "quest-capture-ship": (g, deadCrew) => {
      // Wiki citations:
      // > "You secure the ship and wait for the merchants to arrive." — [[Capture the ship#Quest Marker]]
      // > "You receive a weapon with high scrap." — [[Capture the ship#Quest Marker]]
      // > "The explosion rocks the pirate ship and a brilliant light begins to shine from the wreckage." — [[Capture the ship#Quest Marker]]
      if (deadCrew) {
        result(
          g,
          'You secure the ship and wait for the merchants to arrive. Upon arrival they message you, saying "Good job. We would prefer if you did not speak of this to anyone."',
          scrapOnly(g, "high"),
          [grantRandomItem(g, "weapon")],
        );
        return;
      }
      card(
        g,
        "The explosion rocks the pirate ship and a brilliant light begins to shine from the wreckage. Before you can react the ship is consumed in a massive chain of explosions that send you careening toward a nearby planet. You struggle to put out the fires and your pilot desperately tries to get the controls online before you're dragged down to the surface. Apparently when they said the ship should not be destroyed they had good reason...",
        [{ id: "q:capture:blast", label: "Continue" }],
      );
    },
    // Engi ship attacked by Mantis ship: destroyed -> medium, deadCrew -> high scrap with resources, then "Attempt to
    // contact the Engi". The mantis-controlled Engi ship pays the default rewards (no row).
    // Wiki citations:
    // > "The Mantis ship breaks apart." — [[Engi ship attacked by Mantis ship]]
    // > "You receive medium scrap with resources." — [[Engi ship attacked by Mantis ship]]
    // > "No more life signs detected on the Mantis ship." — [[Engi ship attacked by Mantis ship]]
    // > "You receive high scrap with resources." — [[Engi ship attacked by Mantis ship]]
    // > "Attempt to contact the Engi." — [[Engi ship attacked by Mantis ship]]
    [ENGI_PAGE]: (g, deadCrew) =>
      std(
        "medium",
        "high",
        "The Mantis ship breaks apart.",
        "No more life signs detected on the Mantis ship. You hasten to contact the Engi.",
        [{ id: "q:engi-station:contact", label: "Attempt to contact the Engi." }],
      )(g, deadCrew),
    // Merchant's Investigation: {{Winning|destroyed/deadCrew=true}} -> medium scrap with resources.
    // Wiki citations:
    // > "Fight a Pirate ship." — [[Merchant's request#Merchant's Investigation]]
    // > "You receive medium scrap with resources." — [[Merchant's request#Merchant's Investigation]]
    "quest-merchant-pirate": (g, deadCrew) =>
      std(
        "medium",
        "medium",
        "You contact the delivery ship, who are grateful for your assistance. They offer you a reward for saving them.",
      )(g, deadCrew),
  },

  gotAway: {},
};
