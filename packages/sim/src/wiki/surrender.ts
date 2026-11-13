/**
 * Enemy surrender offers: what is handed over, and the page choices that pay it.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "Enemies may also surrender after dropping below a hull threshold."
 * Rewards, "Stuff": "This type of reward is most often used in non-scripted (i.e. not guaranteed to occur) ship
 * surrenders." Template:SurrenderEscape links every surrender offer to Rewards#Stuff.
 *
 * When a fight offers, and the anti-stalemate break-off, are rules/surrender.ts. This file is the offers.
 * choose routes the two offer choices here.
 */
import { crewPool } from "../crew-look.ts";
import { adjustScrap } from "../extras/index.ts";
import { type KinId } from "../extras/kin.ts";
import {
  allWeapons,
  crewDef,
  crewNames,
  eventDef,
  resourceRange,
  rewardBonus,
  scrapRange,
  storedId,
  warnPack,
  weaponDef,
  type SurrenderOfferDef,
} from "@stl/pack";
import { clearEnemyLeash } from "../extras/leash.ts";
import { rollSectorRace } from "../rarity.ts";
import {
  beginBoarding,
  intruderOnPlayer,
  log,
  rand,
  sealEmptyEvent,
  showEventLines,
  startCombat,
} from "../sim.ts";
import type { Crew, Game } from "../types.ts";
import {
  droneLine,
  grantBonusAugment,
  grantRandomItem,
  rollBonusItem,
} from "../rules/bonus-item.ts";
import { checkCrewRoom, receiveWeapon } from "../rules/make-room.ts";
import { hullRunSeconds, type EscapePlan } from "../rules/escape.ts";
// @agent:quests. Quest markers (circular import: only called inside functions, never at module load).
import { rollBand } from "./event-bands.ts";
import { addQuest, questChoose } from "./quests.ts";
import { stampStockLabels } from "./stock-labels.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
import { eventText } from "../event-text.ts";

export type SurrenderTier = "low" | "medium" | "high";

/** What the enemy hands over if the player accepts. Rolled once, when the offer is made. */
export type SurrenderOffer = {
  tier: SurrenderTier;
  scrap: number;
  /** Score, s: the band amount before augment adjustments. */
  eligible: number;
  fuel: number;
  missiles: number;
  parts: number;
  /** Rewards, "Stuff": the bonus item, when the 6% roll lands and a slot is free. A scripted surrender's named weapon. */
  weapon?: string;
  /** Rewards, "Stuff": the bonus item when the roll lands on an augmentation (bonus-item.ts). */
  augment?: string;
  /** Rewards, "Stuff": the bonus item when the roll lands on a drone schematic (bonus-item.ts). */
  drone?: string;
  /**
   * Rewards, "Weapon": "A random weapon & T scrap." "Augment": "A random augmentation & T scrap." "Drone": "A random
   * drone schematic & T scrap." An item the page gives without naming it; drawn when paid (bonus-item.ts grantRandomItem).
   */
  random?: "weapon" | "augment" | "drone";
  /** Scripted surrender (SCRIPTED_SURRENDERS): a crewmember of this race joins. */
  crew?: string;
  /** Scripted surrender: hull repairs. */
  repairs?: number;
  /** Scripted surrender: accepting does not end the fight (Crystal hunter). */
  continues?: boolean;
  /** Scripted surrender: what the page says is handed over, for the event card. */
  note?: string;
};

/** {{DuplicateEvent|3}} on the goods. The printed OR is the three sentences (ftl.dat text ids). INFERRED: equal inside that weight. */
const CRYSTAL_FIGHT_GOODS = [
  // Wiki citations:
  // > "\"Thank you. I hope our early aggression will not prevent a future accord between our peoples.\" They transfer some goods as a means of compensation." — [[Crystal fight#The ship surrenders]]
  // > "They thank you for sparing them, their extreme aggression quickly changing to a calm acceptance. You're not sure if they're mocking you when they dryly state that \"your species has a knack for warfare\"." — [[Crystal fight#The ship surrenders]]
  // > "\"We would like to apologize for our xenophobia. You have shown that aliens can be compassionate, a fact unwritten in our history records. Please, take this.\"" — [[Crystal fight#The ship surrenders]]
  "event_CRYSTAL_SHIP_SURRENDER_3_text",
  "event_CRYSTAL_SHIP_SURRENDER_5_text",
  "event_CRYSTAL_SHIP_SURRENDER_6_text",
];

/** {{DuplicateEvent|2}} on nothing. The printed OR is the two sentences (ftl.dat text ids). INFERRED: equal inside that weight. */
const CRYSTAL_FIGHT_NOTHING = [
  // Wiki citations:
  // > "\"Thank you. We have misjudged you and will not forget your kindness.\" They leave without another word." — [[Crystal fight#The ship surrenders]]
  // > "They respond, \"Good. I'm glad to hear that there are still those who value life throughout the galaxy.\" They abruptly cut communications and prepare to jump away." — [[Crystal fight#The ship surrenders]]
  "event_CRYSTAL_SHIP_SURRENDER_1_text",
  "event_CRYSTAL_SHIP_SURRENDER_2_text",
];

export const ACCEPT_ID = "surrender-accept";
export const REFUSE_ID = "surrender-refuse";

/** The fight page's offer, once the pack has loaded it. */
function scriptedFor(id: string | undefined): SurrenderOfferDef | undefined {
  return id ? eventDef(storedId(id))?.surrender : undefined;
}

/** Inclusive scrap band from the loaded reward table. This does not roll. */
export function scrapBand(g: Game, tier: SurrenderTier): [number, number] {
  return scrapRange(g.difficulty ?? "normal", g.sector, tier);
}

/** Absolute fuel, missile, or drone-part band. A fixed band still has equal ends. */
export function resourceBand(
  kind: "fuel" | "missiles" | "parts",
  tier: SurrenderTier,
): [number, number] {
  return resourceRange(kind, tier);
}

export function between(g: Game, [lo, hi]: [number, number]): number {
  return lo + Math.floor(rand(g) * (hi - lo + 1));
}

/**
 * Rewards, "Stuff": "T resources (2 random resources among fuel, missiles, and drone parts) + low scrap + roughly a 6%
 * chance to include a bonus weapon, augmentation, or drone schematic." "Ships surrender offers in fights with default
 * rewards ... are random tier." "A successful 6% bonus item roll modifies the scrap part of the reward to match the
 * resources tier."
 * INFERRED: "random tier" is low, medium or high with equal odds; the two resources are different ones.
 * The bonus item is drawn by bonus-item.ts rollBonusItem (weapon, augmentation or drone schematic).
 */
export function rollSurrenderOffer(
  g: Game,
  fixed?: SurrenderTier,
  noBonus = false,
): SurrenderOffer {
  // A scripted page can name the tier ("high ... resources with some scrap"); the draw is skipped then.
  const tier = fixed ?? (["low", "medium", "high"] as const)[Math.min(2, Math.floor(rand(g) * 3))];
  const kinds = ["fuel", "missiles", "parts"] as const;
  const skip = Math.min(2, Math.floor(rand(g) * 3));
  const offer: SurrenderOffer = { tier, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  kinds.forEach((k, i) => {
    if (i !== skip) offer[k] = between(g, resourceBand(k, tier));
  });
  // `noBonus`: a page gift (not a surrender) that names its reward; the unnamed bonus item is not granted there.
  const chance = rewardBonus("stuff");
  const bonus = !noBonus && chance != null && rand(g) < chance;
  const item = bonus ? rollBonusItem(g) : undefined;
  if (item?.kind === "weapon") offer.weapon = item.id;
  else if (item?.kind === "augment") offer.augment = item.id;
  else if (item?.kind === "drone") offer.drone = item.id;
  offer.eligible = between(g, scrapBand(g, bonus ? tier : "low"));
  offer.scrap = adjustScrap(g, offer.eligible);
  return offer;
}

/** Display race -> kin id for joinCrew. Crew rewards do not draw from this list; an unnamed race is randomRace. */
const RACES: [string, KinId][] = [
  ["Human", "human"],
  ["Engi", "engi"],
  ["Mantis", "mantis"],
  ["Slug", "slug"],
  ["Rock", "rock"],
  ["Zoltan", "energy"],
  ["Crystal", "crystal"],
  ["Lanius", "anaerobic"],
  ["Ghost", "ghost"],
];

/** The kin a surrender's crew race joins as (joinCrew), for the offer card's portrait too. */
export function raceKin(race: string): KinId {
  return RACES.find(([r]) => r === race)?.[1] ?? "human";
}

function cap(t: string): string {
  return t[0].toUpperCase() + t.slice(1);
}

function randomTier(g: Game): SurrenderTier {
  return (["low", "medium", "high"] as const)[Math.min(2, Math.floor(rand(g) * 3))];
}

/**
 * @agent:surrender. Rewards, "Standard": "T scrap + low resources (2 random resources among fuel, missiles, and drone
 * parts) + roughly a 3% chance to include a bonus weapon, augmentation, or drone schematic."
 * No tier given = "a random amount" (Rewards: "Random (one of the other 3 tiers is randomly chosen)"). INFERRED:
 * equal odds. The 3% bonus item is rolled by sim.ts winCombat, not here.
 */
export function rollStandard(g: Game, tier?: SurrenderTier): SurrenderOffer {
  const t = tier ?? randomTier(g);
  const offer: SurrenderOffer = { tier: t, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  const skip = Math.min(2, Math.floor(rand(g) * 3));
  (["fuel", "missiles", "parts"] as const).forEach((k, i) => {
    if (i !== skip) offer[k] = between(g, resourceBand(k, "low"));
  });
  offer.eligible = between(g, scrapBand(g, t));
  offer.scrap = adjustScrap(g, offer.eligible);
  return offer;
}

/** The page's reward for a scripted surrender, rolled when the offer is made. Only what the page names. */
export function rollScriptedOffer(g: Game, s: SurrenderOfferDef): SurrenderOffer {
  const r = s.reward;
  if (r.k === "stuff") {
    const offer = rollSurrenderOffer(g, r.tier);
    offer.note = r.tier
      ? `${r.tier[0].toUpperCase()}${r.tier.slice(1)} resources with some scrap.`
      : "Resources with some scrap.";
    return offer;
  }
  if (r.k === "standard") {
    // @agent:surrender. "You receive a Zoltan crewmember and low scrap with resources."
    const offer = rollStandard(g, r.tier);
    if (r.race) offer.crew = r.race;
    const what = `${cap(r.tier)} scrap with resources.`;
    offer.note = r.race ? `A ${r.race} crewmember, and ${r.tier} scrap with resources.` : what;
    if (s.continues) offer.continues = true;
    return offer;
  }
  const offer: SurrenderOffer = {
    tier: "low",
    scrap: 0,
    eligible: 0,
    fuel: 0,
    missiles: 0,
    parts: 0,
  };
  if (r.k === "scrap") {
    // @agent:surrender. Rewards, "Scrap only" / "Weapon": T scrap. An unnamed item is drawn when paid (payOffer).
    offer.tier = r.tier;
    offer.eligible = between(g, scrapBand(g, r.tier));
    offer.scrap = adjustScrap(g, offer.eligible);
    const item = {
      weapon: "A weapon",
      augment: "An augmentation",
      drone: "A drone schematic",
    } as const;
    offer.note = r.unnamed ? `${item[r.unnamed]} and ${r.tier} scrap.` : `${cap(r.tier)} scrap.`;
    if (r.unnamed) offer.random = r.unnamed;
  } else if (r.k === "crew") {
    offer.crew = r.race ?? randomRace(g);
    offer.note = `A ${offer.crew} crewmember.`;
  } else if (r.k === "fuel-repairs") {
    // Rewards, "Fuel": "T fuel & T scrap"; the page's tooltip "low: 1-3 fuel" is Template:Resources rewards' low fuel.
    offer.fuel = between(g, resourceBand("fuel", "low"));
    offer.eligible = between(g, scrapBand(g, "low"));
    offer.scrap = adjustScrap(g, offer.eligible);
    offer.repairs = r.repairs;
    offer.note = `Fuel, scrap, and ${r.repairs} hull repairs.`;
  } else if (r.k === "none") {
    // @agent:quests. Nothing is handed over; the page's answer is a quest marker or a follow-up card.
  } else {
    offer.weapon = allWeapons().find((w) => w.name === r.name)?.id;
    offer.note = `The ${r.name}.`;
  }
  if (s.continues) offer.continues = true;
  return offer;
}

/**
 * Category:Crew Rewards: "If a crewmember's race is not predefined/hard-coded or specified, then it can be of any of
 * the possible races for the current sector type." FTL EventGenerator::CreateEvent draws it with GetRandomCrew, weighted
 * by the sector's crew rarities (rarity.ts rollSectorRace).
 * When the archive leaves no race to draw, the crewmember is Human, with a warning.
 * @agent:quests. A page that gives "a crewmember" without naming one.
 */
export function randomRace(g: Game): string {
  const race = rollSectorRace(g.sectorId, () => rand(g));
  if (race) return race;
  warnPack(`No crew race has a rarity in sector ${g.sectorId}; a Human crewmember is used.`);
  return "Human";
}

/**
 * A crewmember joins the player. Same cap and fields as sim.ts addCrew, which this module cannot import.
 * @agent:quests: `name` and `skills` for a page's named crewmember (Kazaaak); exported for wiki/quests.ts.
 */
export function joinCrew(g: Game, race: string, name?: string, skills?: Crew["skills"]): boolean {
  // Crew: "If the player receives a 9th crew, the game will require to relieve one of the crewmembers, be it the new
  // one or from the existing crew." The 9th comes aboard; make-room.ts asks who is relieved.
  const kin = raceKin(race);
  const used = new Set(g.crew.map((c) => c.name));
  const pool = crewNames(kin).filter((n) => !used.has(n));
  const named =
    name ??
    (pool.length > 0 ? pool[Math.floor(rand(g) * pool.length)] : undefined) ??
    crewPool().find((n) => !used.has(n)) ??
    "Rook Vale";
  const hp = crewDef(kin).hp;
  const roomId =
    g.player.rooms.find((x) => x.id === "p-medbay")?.id ?? g.player.rooms[0]?.id ?? "p-medbay";
  g.uid = (g.uid + 1) >>> 0;
  g.crew.push({
    id: "u" + g.uid.toString(36),
    name: named,
    side: "player",
    aboard: "player",
    hp,
    maxHp: hp,
    room: roomId,
    path: [],
    move: 0,
    think: 0,
    tone: g.crew.length % 3,
    kin,
    ...(skills ? { skills: { ...skills } } : {}),
  });
  // Ancient device: gaining Ruwen turns that Rock Homeworlds beacon into a quest beacon.
  markRuwenEntry(g);
  checkCrewRoom(g);
  return true;
}

/** The offer on screen, for the event card. Null when the open event is not a surrender. */
export function surrenderOfferView(g: Game): SurrenderOffer | null {
  const plan = g.enemySurrender;
  if (g.phase !== "event" || !g.enemy || !plan?.offered || plan.refused) return null;
  return plan.offer;
}

/** The beacon the player is at. */
export function here(g: Game) {
  return g.beacons.find((b) => b.id === g.here);
}

/**
 * Ends the fight without a wreck: the same clean-up winCombat does, minus its salvage.
 * Mind Control: an enemy hold ends with the fight.
 */
export function closeFight(g: Game) {
  clearEnemyLeash(g);
  // Game.wreck: the ship that surrendered (or broke off) is still there until the jump, for a teleporter recall.
  g.wreck = g.enemy && g.enemy.hull > 0 ? g.enemy : null;
  // Per the user: that ship stays a running ship, now neutral (sim.ts truce): its crew stay aboard and keep working.
  // Per the user: intruders on your ship stay until they are killed. A surrender does not remove them.
  g.crew = g.crew.filter(
    (c) =>
      c.side === "player" || intruderOnPlayer(c) || (!!g.wreck && c.aboard === "enemy" && c.hp > 0),
  );
  g.enemy = null;
  g.enemyEscape = null;
  g.enemyFlee = 0;
  g.shots = [];
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.stalemate = null;
  const b = here(g);
  if (b) b.resolved = true;
  // Same as winCombat: a guarded exit opens once its guard is gone. INFERRED for a surrender or a stalemate.
  if (g.pending === "exit-clear" && b) b.flag = "";
  // A pending event bonus (crew, scrap) was for wrecking the ship, not for a surrender or a stalemate. INFERRED.
  g.pending = null;
}

export function openOffer(g: Game) {
  const plan = g.enemySurrender;
  if (!plan) return;
  plan.offered = true;
  const scripted = scriptedFor(plan.event);
  plan.offer = scripted ? rollScriptedOffer(g, scripted) : rollSurrenderOffer(g);
  // Enemy Ships: "Enemies will never start running away if they have already offered a surrender."
  // A hull-triggered escape that has not rolled yet is spent here. One already charging keeps charging. INFERRED.
  if (g.enemyEscape && !g.enemyEscape.running) g.enemyEscape.rolled = true;
  g.phase = "event";
  g.paused = true;
  g.targeting = false;
  g.beamAnchor = null;
  // A scripted surrender uses its page's hail. A generic offer has no hail on Enemy Ships, so the card
  // uses that page's sentence and two printed choice labels.
  const hail = scripted?.hails?.length
    ? scripted.hails[
        Math.min(scripted.hails.length - 1, Math.floor(rand(g) * scripted.hails.length))
      ]!
    : scripted?.hail;
  g.event = scripted
    ? {
        title: "Surrender",
        body: hail!,
        // @agent:surrender. A `forced` page ("no option or prompt to decline") shows only the accept choice.
        choices: [
          ...(scripted.forced
            ? [{ id: ACCEPT_ID, label: scripted.accept }]
            : [
                { id: ACCEPT_ID, label: scripted.accept },
                { id: REFUSE_ID, label: scripted.refuse },
              ]),
          // @agent:quests. A page's other answer (Slug Home Nebula surrender: "we want information"), wiki/quests.ts.
          ...(scripted.extra ? [scripted.extra] : []),
        ],
      }
    : {
        title: "Surrender",
        body: "Enemies may also surrender after dropping below a hull threshold.",
        choices: [
          { id: ACCEPT_ID, label: "Accept their surrender." },
          { id: REFUSE_ID, label: "Refuse. Keep firing." },
        ],
      };
  g.sfx.push("alarm");
}

/** Pays an offer: resources, a weapon, a bonus augmentation or drone schematic, an unnamed (random) item, and the crew and repairs a scripted page names. A full rack asks what to leave behind (make-room.ts). */
export function payOffer(
  g: Game,
  offer: SurrenderOffer,
  _scripted: boolean,
): { weaponName?: string; extras: string[] } {
  g.scrap += offer.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + offer.eligible;
  g.fuel += offer.fuel;
  g.missiles += offer.missiles;
  g.player.parts += offer.parts;
  let weaponName: string | undefined;
  // A full rack asks what to leave behind (make-room.ts).
  const extras: string[] = [];
  if (offer.weapon && !g.player.weapons.some((w) => w.defId === offer.weapon)) {
    weaponName = weaponDef(offer.weapon)?.name;
    const got = receiveWeapon(g, offer.weapon);
    if (got === "cargo")
      extras.push(`No free weapon slot: ${weaponName ?? offer.weapon} is stowed in cargo.`);
    if (got === "queued")
      extras.push(
        `No room in cargo for ${weaponName ?? offer.weapon}: choose what to leave behind.`,
      );
  }
  // Scripted surrenders (SCRIPTED_SURRENDERS): a crewmember and hull repairs the page names.
  if (offer.crew)
    extras.push(
      joinCrew(g, offer.crew)
        ? `A ${offer.crew} crewmember joins you.`
        : "There is no room aboard for their crewmember.",
    );
  if (offer.repairs) {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + offer.repairs);
    extras.push(`Hull repairs: ${offer.repairs}.`);
  }
  if (offer.augment) extras.push(grantBonusAugment(g, offer.augment));
  if (offer.drone) extras.push(droneLine(g, offer.drone));
  if (offer.random) extras.push(grantRandomItem(g, offer.random));
  return { weaponName, extras };
}

function weightedPick<T>(g: Game, items: [T, number][]): T {
  let roll = rand(g) * items.reduce((sum, [, w]) => sum + w, 0);
  for (const [item, w] of items) {
    roll -= w;
    if (roll < 0) return item;
  }
  return items[items.length - 1]![0];
}

/**
 * Crystal fight, Accept their surrender. Soldier once, goods {{DuplicateEvent|3}}, nothing {{DuplicateEvent|2}}.
 * A random amount of resources is rollStandard with no tier.
 */
function crystalFightAccept(g: Game) {
  const kind = weightedPick(g, [
    ["soldier", 1],
    ["goods", 3],
    ["nothing", 2],
  ] as ["soldier" | "goods" | "nothing", number][]);
  if (kind === "soldier") {
    // Wiki citations:
    // > "What appears to be a young soldier pushes its way onto the vid screen, \"A captain both able and merciful? I have always wanted to explore beyond our restricted sector... Please, permit me to join your crew?\"" — [[Crystal fight#The ship surrenders]]
    pageCard(g, eventText("event_CRYSTAL_SHIP_SURRENDER_7_text"), [
      { id: "s:crystal-fight:yes", label: eventText("event_CRYSTAL_SHIP_SURRENDER_7_c1_choice") },
      { id: "s:crystal-fight:no", label: eventText("event_CRYSTAL_SHIP_SURRENDER_7_c2_choice") },
    ]);
    g.paused = true;
    return;
  }
  closeFight(g);
  if (kind === "goods") {
    // Wiki citations:
    // > "You receive a random amount of resources with some scrap." — [[Crystal fight#The ship surrenders]]
    const line =
      CRYSTAL_FIGHT_GOODS[
        Math.min(CRYSTAL_FIGHT_GOODS.length - 1, Math.floor(rand(g) * CRYSTAL_FIGHT_GOODS.length))
      ]!;
    pageResult(g, eventText(line), rollStandard(g));
    return;
  }
  // Wiki citations:
  // > "Nothing happens." — [[Crystal fight#The ship surrenders]]
  const line =
    CRYSTAL_FIGHT_NOTHING[
      Math.min(CRYSTAL_FIGHT_NOTHING.length - 1, Math.floor(rand(g) * CRYSTAL_FIGHT_NOTHING.length))
    ]!;
  pageResult(g, eventText(line));
}

/** choose() routes here first. Returns true when the id was a surrender choice. */
export function surrenderChoose(g: Game, id: string): boolean {
  // @agent:quests. Quest-marker destinations, their follow-up cards, and the cited choices that start a quest branch.
  if (questChoose(g, id)) return true;
  // @agent:surrender. Ship surrender Events pages (cited-events-surrender.ts): random branches and follow-up cards.
  if (pageChoose(g, id)) return true;
  if (id !== ACCEPT_ID && id !== REFUSE_ID) return false;
  const plan = g.enemySurrender;
  if (!plan?.offered || !g.enemy) {
    g.event = null;
    g.phase = g.enemy ? "combat" : "map";
    return true;
  }
  g.event = null;
  // @agent:surrender. A forced surrender cannot be declined; a stray refuse id is read as accept.
  const forced = !!scriptedFor(plan.event)?.forced;
  if (id === REFUSE_ID && !forced) {
    plan.refused = true;
    g.phase = "combat";
    g.paused = false;
    // Enemy Ships: "If you jump away after rejecting an enemy's surrender offer, then return, the enemy will not be
    // present. The enemy indicator on the map will also disappear after jumping away."
    const b = here(g);
    if (b && b.kind !== "boss") b.resolved = true;
    // Crystal fight, Ignore them: "The fight continues."
    // Crystal fight with surrender offer (hull repairs), Finish them off: the fight continues.
    // Crystal fight with surrender offer (Human crew), Finish them off: the fight continues.
    // Wiki citations:
    // > "You cut off communications and prepare to finish them off." — [[Crystal fight#The ship surrenders]]
    showEventLines(g, [
      plan.event === "crystal-fight"
        ? eventText("ship_CRYSTAL_SHIP_surrender_c2_text")
        : plan.event === "the-black-raven"
          ? // Wiki citations:
            // > "\"Wait! There is no need to be....\" You cut off the transmission and prepare to fire." — [[The Black Raven#Fighting the Black Raven]]
            // > "Continue the fight." — [[The Black Raven#Fighting the Black Raven]]
            eventText("ship_DONOR_BLACK_RAVEN_surrender_c2_text")
          : plan.event === "crystal-fight-with-surrender-offer-hull-repairs"
            ? eventText("ship_CRYSTAL_CONVOY_surrender_c2_text")
            : plan.event === "crystal-fight-with-surrender-offer-human-crew"
              ? eventText("ship_CRYSTAL_HUNTER_surrender_c2_text")
              : "Offer refused. The fight continues.",
    ]);
    return true;
  }
  // Crystal fight, Accept. Soldier once, goods three times, nothing twice. The reward is not shown before this.
  if (plan.event === "crystal-fight") {
    plan.accepted = true;
    crystalFightAccept(g);
    return true;
  }
  const offer = plan.offer ?? rollSurrenderOffer(g);
  // @agent:quests. The page's answer opens a follow-up card while the enemy is still there (Engi fleet discussion, fake).
  const page = scriptedFor(plan.event);
  if (page?.card) {
    plan.accepted = true;
    pageCard(g, page.card.body, page.card.choices);
    g.paused = true;
    return true;
  }
  if (offer.continues) {
    // "Crystal fight with surrender offer (Human crew)": "You receive a Human crewmember and the fight continues."
    plan.accepted = true;
    const joined = offer.crew ? joinCrew(g, offer.crew) : false;
    g.phase = "combat";
    g.paused = false;
    if (joined && plan.event === "crystal-fight-with-surrender-offer-human-crew") {
      log(g, eventText("ship_CRYSTAL_HUNTER_surrender_c1_text"));
      log(g, "You receive a Human crewmember and the fight continues.");
    } else if (joined) {
      log(g, `A ${offer.crew} crewmember joins you. The fight continues.`);
    } else {
      // INFERRED: the wiki page does not print this no-room sentence.
      log(g, "No room aboard. The fight continues.");
    }
    return true;
  }
  // Score, k: "k = ships defeated by reducing hull or crew to zero. Defeating the flagship does NOT increase the count
  // (none of the 3 phases)." Accepting ends the fight with the offered cargo; hull and crew were not reduced to zero.
  closeFight(g);
  const { weaponName, extras } = payOffer(g, offer, !!plan.event);
  // @agent:quests. The page's own after-accept text, and a quest marker its answer adds (wiki/quests.ts addQuest).
  if (page?.quest) extras.push(addQuest(g, page.quest));
  const base = page?.result
    ? page.result + (weaponName ? ` ${weaponName}.` : "")
    : weaponName
      ? `Gain ${weaponName}.`
      : "Surrender accepted.";
  g.reward = {
    scrap: offer.scrap,
    note: [base, ...extras].join(" "),
    res: { fuel: offer.fuel, missiles: offer.missiles, parts: offer.parts },
  };
  g.phase = "reward";
  g.paused = true;
  g.sfx.push("win");
  log(g, "Surrender accepted.");
  return true;
}

// ---------------------------------------------------------------------------------------------------------------
// @agent:surrender. Category:Ship surrender Events pages wired by cited-events-surrender.ts. Their opening choices
// have random results (odds not stated on the pages) or a follow-up dialogue, which the cited table format cannot
// say, so surrenderChoose routes those ids here before citedChoose. Follow-up card choices use "s:<slug>:<name>" ids
// (not "c:", so citedOwns and eventSlugOf leave them alone). Each fight passes its page slug to startCombat, which
// picks the page's row in SCRIPTED_SURRENDERS above.
// INFERRED everywhere below: a page that lists N results without odds rolls them with equal odds.
// ---------------------------------------------------------------------------------------------------------------

/** The result card: page text, what was paid, and "ack" (sim.ts choose resolves the beacon). */
export function pageResult(g: Game, text: string, offer?: SurrenderOffer) {
  const lines: string[] = [text];
  if (offer) {
    const { weaponName, extras } = payOffer(g, offer, true);
    const got: string[] = [];
    if (offer.scrap) got.push(`Scrap: ${offer.scrap}.`);
    if (offer.fuel) got.push(`Fuel: ${offer.fuel}.`);
    if (offer.missiles) got.push(`Missiles: ${offer.missiles}.`);
    if (offer.parts) got.push(`Drone parts: ${offer.parts}.`);
    if (weaponName) got.push(`${weaponName}.`);
    lines.push([...got, ...extras].join(" "));
  }
  g.event = {
    title: here(g)?.name ?? "Event",
    body: lines.filter(Boolean).join("\n\n"),
    choices: [{ id: "ack", label: "Continue" }],
  };
  g.phase = "event";
}

/** A follow-up dialogue card on the same beacon. */
export function pageCard(g: Game, body: string, choices: { id: string; label: string }[]) {
  g.event = { title: here(g)?.name ?? "Event", body, choices: stampStockLabels(choices) };
  g.phase = "event";
  sealEmptyEvent(g);
}

/** Starts the page's fight. `escape` replaces the default escape plan when the page states its own. */
export function pageFight(
  g: Game,
  text: string,
  tier: string,
  slug: string,
  escape?: EscapePlan,
  asteroid = false,
) {
  g.event = null;
  startCombat(g, tier, asteroid, slug);
  if (escape) g.enemyEscape = escape;
  if (text.trim()) showEventLines(g, [text]);
}

/**
 * "Destroyed cargo ship": "2-4 human boarders beam aboard your ship". INFERRED: each lands in a random room.
 * `line` replaces the crate sentence on pages that are not the cargo ambush (`${n} ${line}`).
 * `lungs` is Boarders: Humans (Abandoned): Emergency Respirators after a Lanius fight.
 */
export function humanBoarders(g: Game, lo: number, hi: number, line?: string, lungs = false) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("human").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Human",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "human",
      ...(lungs ? { lungs: true } : {}),
    });
  }
  log(g, line ? `${n} ${line}` : `${n} boarders burst out of the crates.`);
}

/**
 * Boarders: Humans in plasma storm: "3-4 human boarders beam aboard your ship" with medium scrap and no enemy ship.
 * Call this after the choice's medium scrap tier. INFERRED: the count is inclusive 3..4.
 * beginBoarding opens the crew fight. startCombat would drop the boarders and put a hull on the scope.
 */
export function plasmaHumanBoarders(g: Game) {
  humanBoarders(g, 3, 4, "human boarders beam aboard your ship.");
  beginBoarding(g);
}

/**
 * The Black Raven, Slugman Crew: "1-2 slug boarders beam aboard your ship."
 * Slug hacker (medical): "2 slug boarders beam aboard your ship".
 * INFERRED: each lands in a random player room, the same as human boarders. Call this after startCombat.
 * A new fight keeps intruders already aboard. `line` replaces the short log (`${n} ${line}`).
 */
export function slugBoarders(g: Game, lo: number, hi: number, line?: string) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("slug").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Slug",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "slug",
    });
  }
  log(g, line ? `${n} ${line}` : `${n} slug boarders beam aboard.`);
}

/**
 * Rock fight with boarders: "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
 * Call this after startCombat (ctx.fight). A new fight keeps intruders already aboard.
 * INFERRED: the count is an inclusive whole number from 1 to 3, and each boarder lands in a random player room,
 * the same pattern as humanBoarders. INFERRED: the display name is "Rock" because the page does not print names.
 * HP is crewDef("rock").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
export function rockBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("rock").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Rock",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "rock",
    });
  }
  log(g, `${n} rock boarders beam aboard your ship.`);
}

/**
 * Mantis outcasts: "2-3 mantis boarders beam aboard your ship and you fight a Mantis Ship (default rewards)."
 * Call this after startCombat (ctx.fight). A new fight keeps intruders already aboard.
 * INFERRED: the count is an inclusive whole number from 2 to 3, and each boarder lands in a random player room,
 * the same pattern as rockBoarders. INFERRED: the display name is "Mantis" because the page does not print names.
 * HP is crewDef("mantis").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
export function mantisBoarders(g: Game, lo: number, hi: number) {
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
  log(g, `${n} mantis boarders beam aboard your ship.`);
}

/**
 * "crew entirely composed of Mantis."
 * Call this after startCombat. The class mix can still roll an Engi; this replaces that crew.
 * INFERRED: only enemy crew aboard the enemy ship change. A Mantis already there keeps the health
 * startCombat gave them. A converted crew member uses crewDef("mantis") health. The display name is "Mantis".
 */
export function allMantisCrew(g: Game) {
  const hp = crewDef("mantis").hp;
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "enemy") continue;
    if (c.kin === "mantis") continue;
    c.kin = "mantis";
    c.name = "Mantis";
    c.hp = hp;
    c.maxHp = hp;
  }
}

/**
 * Zoltan border police: "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)."
 * Call this after startCombat (ctx.fight). A new fight keeps intruders already aboard.
 * INFERRED: the count is an inclusive whole number from 3 to 4, and each boarder lands in a random player room,
 * the same pattern as mantisBoarders. INFERRED: the display name is "Zoltan" because the page does not print names.
 * HP is crewDef("energy").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
export function zoltanBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("energy").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Zoltan",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "energy",
    });
  }
  log(g, `${n} zoltan boarders beam aboard your ship.`);
}

/**
 * Boarders: Crystal: "2-3 crystal boarders beam aboard your ship."
 * INFERRED: the count is inclusive (between()), and each boarder lands in a random player room.
 * INFERRED: the display name is "Crystal" because the page does not print names. HP is crewDef("crystal").hp.
 * Not a crew grant. No ship.
 */
export function crystalBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = crewDef("crystal").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: "Crystal",
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "crystal",
    });
  }
  log(g, `${n} crystal boarders beam aboard your ship.`);
}

function livingSlug(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "slug");
}

function pick<T>(g: Game, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand(g) * items.length))];
}

export const NEVER_RUN: EscapePlan = {
  mode: "never",
  seconds: 0,
  chance: 0,
  threshold: 0,
  rolled: false,
  running: false,
  pursuit: false,
};

/**
 * Destroyed cargo ship, "Scan the boxes". Three results and no odds. INFERRED: equal.
 * 20-35 scrap is the printed transaction, not a scrap tier. Medium is scrap with resources.
 */
function cargoScan(g: Game) {
  const r = pick(g, ["dull", "supplies", "ambush"] as const);
  if (r === "dull") {
    // Wiki citations:
    // > "The cargo appears to contain nothing of much interest. You salvage some scrap from the destroyed ship." — [[Destroyed cargo ship#Scan the boxes]]
    // > "You receive Scrap gained: 20-35." — [[Destroyed cargo ship#Scan the boxes]]
    const eligible = rollBand("destroyed-cargo-ship", "scan", "scrap", (lo, hi) =>
      between(g, [lo, hi]),
    );
    if (eligible == null) {
      pageResult(g, eventText("event_FLOATING_CARGO_SCAN_LIST_1_text"));
      return;
    }
    const offer: SurrenderOffer = {
      tier: "low",
      scrap: 0,
      eligible,
      fuel: 0,
      missiles: 0,
      parts: 0,
    };
    offer.scrap = adjustScrap(g, eligible);
    pageResult(g, eventText("event_FLOATING_CARGO_SCAN_LIST_1_text"), offer);
    return;
  }
  if (r === "supplies") {
    // Wiki citations:
    // > "Your Advanced Sensors are able to breach the protective barrier and scan the cargo. It appears to be filled with military supplies! You take everything you can use." — [[Destroyed cargo ship#Scan the boxes]]
    // > "You receive medium scrap with resources." — [[Destroyed cargo ship#Scan the boxes]]
    pageResult(g, eventText("event_FLOATING_CARGO_SCAN_LIST_2_text"), rollStandard(g, "medium"));
    return;
  }
  // Wiki citations:
  // > "Your advanced sensors pick up faint life signatures inside the cargo. The life forms appear to be armed. This looks like a planned pirate ambush." — [[Destroyed cargo ship#Scan the boxes]]
  // > "Destroy the crates to prevent another ship from falling victim." — [[Destroyed cargo ship#Scan the boxes]]
  // > "Leave it alone and prepare to jump." — [[Destroyed cargo ship#Scan the boxes]]
  pageCard(g, eventText("event_FLOATING_CARGO_SCAN_LIST_3_text"), [
    {
      id: "s:destroyed-cargo-ship:destroy",
      label: eventText("event_FLOATING_CARGO_SCAN_LIST_3_c1_choice"),
    },
    {
      id: "s:destroyed-cargo-ship:leave",
      label: eventText("event_FLOATING_CARGO_SCAN_LIST_3_c2_choice"),
    },
  ]);
}

export const PAGE_CHOICES: Record<string, (g: Game) => void> = {
  // ---- "Engi surrender" (no fight: the ship surrenders on arrival) ----
  // Explain that you're friendly. Two results: "Nothing happens." / "You receive a random amount of scrap with resources."
  "c:engi-surrender:0": (g) => {
    if (rand(g) < 0.5) {
      // Wiki citations:
      // > "The Engi seem relieved, and eager to get underway. They set off without saying goodbye." — [[Engi surrender]]
      // > "Nothing happens." — [[Engi surrender]]
      pageResult(g, eventText("event_ENGI_SURRENDER_LIST_1_text"));
    } else {
      // Wiki citations:
      // > "The Engi are satisfied with your explanation. \"Beneficial. Subject goal: long, long journey. Remains compatible with transfer of goods from Engi.\" They send over the gear willingly, and you feel better for it." — [[Engi surrender]]
      // > "You receive a random amount of scrap with resources." — [[Engi surrender]]
      pageResult(g, eventText("event_ENGI_SURRENDER_LIST_2_text"), rollStandard(g));
    }
  },
  // Accept their offer of surrender. -> "You receive a random amount of scrap with resources."
  "c:engi-surrender:1": (g) => {
    // Wiki citations:
    // > "The Engi obediently transfer over the goods and get on their way. Money for nothing." — [[Engi surrender]]
    // > "You receive a random amount of scrap with resources." — [[Engi surrender]]
    pageResult(g, eventText("event_ENGI_SURRENDER_c2_text"), rollStandard(g));
  },

  // ---- "Destroyed cargo ship", Bring it aboard. Four results on the page, no odds (equal, INFERRED). ----
  // "medium scrap with resources"; "low scrap" (Scrap only); "2-4 human boarders" with no ship; the ambush fight.
  "c:destroyed-cargo-ship:0": (g) => {
    const r = pick(g, ["supplies", "goods", "boarders", "ambush"] as const);
    if (r === "supplies") {
      // Wiki citations:
      // > "They appear to be filled with military supplies! You take everything you can use and jettison the rest." — [[Destroyed cargo ship]]
      // > "You receive medium scrap with resources." — [[Destroyed cargo ship]]
      pageResult(g, eventText("event_FLOATING_CARGO_LIST_1_text"), rollStandard(g, "medium"));
    } else if (r === "goods") {
      // Wiki citations:
      // > "The cargo was primarily consumer goods and clothing, nothing particularly useful. You manage to collect some scrap." — [[Destroyed cargo ship]]
      // > "You receive low scrap." — [[Destroyed cargo ship]]
      const offer: SurrenderOffer = {
        tier: "low",
        scrap: 0,
        eligible: between(g, scrapBand(g, "low")),
        fuel: 0,
        missiles: 0,
        parts: 0,
      };
      offer.scrap = adjustScrap(g, offer.eligible);
      pageResult(g, eventText("event_FLOATING_CARGO_LIST_2_text"), offer);
    } else if (r === "boarders") {
      // Wiki citations:
      // > "Once you bring the cargo onto your ship, a pirate bursts out of one of the crates saying, \"Ugh... I was getting cramped in there. Oh, yeah! Prepare to die!\" Immediately after this battle-cry your ship is filled with the sound of crates breaking open..." — [[Destroyed cargo ship]]
      humanBoarders(g, 2, 4);
      beginBoarding(g);
      showEventLines(g, [eventText("event_FLOATING_CARGO_LIST_3_text")]);
    } else {
      // Wiki citations:
      // > "You bring the cargo aboard. Before you have a chance to open them a pirate ship appears out of hiding and charges. At the same time, the crates fly open. Intruders aboard the ship!" — [[Destroyed cargo ship]]
      // > "2-4 human boarders beam aboard your ship and you fight a Pirate ship (default rewards)." — [[Destroyed cargo ship]]
      // JELLY_PIRATE_WITHBOARDERS: "70% chance for escape attempt at 20-40% hull with 15 seconds countdown timer".
      const escape: EscapePlan = {
        ...NEVER_RUN,
        mode: "hull",
        seconds: hullRunSeconds(),
        chance: 70,
        threshold: 20 + rand(g) * 20,
      };
      pageFight(
        g,
        eventText("event_FLOATING_CARGO_LIST_4_text"),
        "Pirate ship",
        "destroyed-cargo-ship",
        escape,
      );
      humanBoarders(g, 2, 4);
    }
  },

  // Destroyed cargo ship. Advanced Sensors level=2+ and Long-Ranged Scanners both open "Scan the boxes".
  // Three results, no odds. INFERRED: equal. The life-signature result is a follow-up card, not a reward.
  "c:destroyed-cargo-ship:2": (g) => {
    if ((g.player.systems.sensors?.level ?? 0) < 2) return;
    cargoScan(g);
  },
  "c:destroyed-cargo-ship:3": (g) => {
    if (!g.augments.includes("ADV_SCANNERS")) return;
    cargoScan(g);
  },
  "s:destroyed-cargo-ship:destroy": (g) => {
    // Wiki citations:
    // > "You fire on the crates, breaking them open and scattering the pirates into empty space. A pirate ship appears out of nowhere with a message, \"You will pay for that!\"" — [[Destroyed cargo ship#Scan the boxes]]
    // > "Fight a Pirate ship (default rewards)." — [[Destroyed cargo ship#Scan the boxes]]
    // SurrenderEscape(alt) escape+surrender PIRATE: 50% escape at 20-40% hull and 50% surrender at 30-40% hull.
    // Those are the Pirate default rows. A new slug keeps the bring-aboard 100% offer off this fight.
    // The template's 2-4 and 3-4 are its actual-hull warning, the same reading as the other Pirate rows.
    pageFight(
      g,
      eventText("event_FLOATING_CARGO_SCAN_LIST_3_c1_text"),
      "Pirate ship",
      "destroyed-cargo-ship-scan",
    );
  },
  "s:destroyed-cargo-ship:leave": (g) => {
    // Wiki citations:
    // > "Nothing happens." — [[Destroyed cargo ship#Scan the boxes]]
    // The page prints no italic before "Nothing happens."
    pageResult(g, "Nothing happens.");
  },

  // ---- "Settlement mercenary work", Listen to their offer. Two offers on the page. ----
  "c:settlement-mercenary-work:0": (g) => {
    if (rand(g) < 0.5) {
      // Wiki citations:
      // > "\"Some of our friends have taken to piracy in the recent chaos of the war. We'd like you to \"convince\" them of their poor decision by severely damaging the ship. We'll pay you well as long as you don't kill them all.\"" — [[Settlement mercenary work]]
      pageCard(g, eventText("event_MERCENARY_WORK_LIST_2_text"), [
        {
          id: "s:settlement-mercenary-work:accept",
          label: eventText("event_MERCENARY_WORK_LIST_2_c1_choice"),
        },
        {
          id: "s:settlement-mercenary-work:decline",
          label: eventText("event_MERCENARY_WORK_LIST_1_c2_choice"),
        },
      ]);
    } else {
      // The space dock offer: "Agree to rescue the store." adds a quest marker (@agent:quests, wiki/quests.ts).
      // Wiki citations:
      // > "\"A space dock is under assault from the Rebels. Although the dock is... technically... illegal within their laws, it's very important for our trade. We'll pay you in fuel and scrap if you promise to save them.\"" — [[Settlement mercenary work]]
      // > "Agree to rescue the store." — [[Settlement mercenary work]]
      pageCard(g, eventText("event_MERCENARY_WORK_LIST_1_text"), [
        {
          id: "s:settlement-mercenary-work:dock",
          label: eventText("event_MERCENARY_WORK_LIST_1_c1_choice"),
        },
        {
          id: "s:settlement-mercenary-work:nodock",
          label: eventText("event_MERCENARY_WORK_LIST_1_c2_choice"),
        },
      ]);
    }
  },
  // Accept. -> "Fight a Pirate ship." Trivia: "The 'SQUAT_PIRATE_MERCENARY' ship from the settlement never runs away."
  "s:settlement-mercenary-work:accept": (g) => {
    // Wiki citations:
    // > "\"Just be sure not to blow them up!\" they say nervously as they direct you to a nearby moon. You find the pirate ship docked there. They immediately respond to your appearance with, \"Your money or your life!\" They must be new to this." — [[Settlement mercenary work]]
    // > "Fight a Pirate ship." — [[Settlement mercenary work]]
    // > "The \"SQUAT_PIRATE_MERCENARY\" ship from the settlement never runs away." — [[Settlement mercenary work#Trivia]]
    pageFight(
      g,
      eventText("event_MERCENARY_WORK_LIST_2_c1_text"),
      "Pirate ship",
      "settlement-mercenary-work",
      { ...NEVER_RUN },
    );
  },
  "s:settlement-mercenary-work:decline": (g) => {
    // Wiki citations:
    // > "\"Fine. I don't know what we'll do about them though...\" You prepare to jump away from this sector." — [[Settlement mercenary work]]
    // > "Nothing happens." — [[Settlement mercenary work]]
    pageResult(g, eventText("event_MERCENARY_WORK_LIST_2_c2_text"));
  },
  // "A quest marker is added to your map." @agent:quests: the space dock rescue (wiki/quests.ts "store-rescue").
  "s:settlement-mercenary-work:dock": (g) => {
    // Wiki citations:
    // > "They transmit the space dock's coordinates." — [[Settlement mercenary work]]
    // > "A quest marker is added to your map." — [[Settlement mercenary work]]
    pageResult(
      g,
      `${eventText("event_MERCENARY_WORK_LIST_1_c1_text")}\n\n${addQuest(g, "store-rescue")}`,
    );
  },
  "s:settlement-mercenary-work:nodock": (g) => {
    // Wiki citations:
    // > "They regretfully accept your decision." — [[Settlement mercenary work]]
    // > "Nothing happens." — [[Settlement mercenary work]]
    pageResult(g, eventText("event_MERCENARY_WORK_LIST_1_c2_text"));
  },

  // ---- "The Black Raven", No. -> the challenge. Both answers fight the Black Raven. ----
  // Trivia: "always a Slug Assault class": asked for by class (enemy-gen.ts classId), as a pirate (Captain Nights).
  "c:the-black-raven:0": (g) => {
    // Wiki citations:
    // > "\"Well I have heard of you and I must see if you are as dangerousss as they say. I challenge you!\"" — [[The Black Raven]]
    // > "Accept his challenge." — [[The Black Raven]]
    // > "Decline." — [[The Black Raven]]
    // > "(Slugman Crew) Engage in a duel of the mind." — [[The Black Raven]]
    pageCard(g, eventText("event_DONOR_BLACK_RAVEN_c1_text"), [
      { id: "s:the-black-raven:accept", label: eventText("event_DONOR_BLACK_RAVEN_c1_c1_choice") },
      { id: "s:the-black-raven:decline", label: eventText("event_DONOR_BLACK_RAVEN_c1_c2_choice") },
      // {{Blue Option|Slugman Crew|Engage in a duel of the mind.}}
      { id: "s:the-black-raven:duel", label: eventText("event_DONOR_BLACK_RAVEN_c1_c3_choice") },
    ]);
  },
  // Two results, no odds. INFERRED: equal odds. The win gives a weapon with high scrap; the weapon is unnamed, so
  // Rewards, "Weapon": "A random weapon & T scrap."
  // The stunned collapse prints no duration, so no stun is applied.
  "s:the-black-raven:duel": (g) => {
    if (!livingSlug(g)) return;
    if (rand(g) < 0.5) {
      // Wiki citations:
      // > "Your Slug crewman's eyes glaze over as the two telepaths concentrate. You can only wonder what is happening. After a short time your comrade grunts in pain and collapses onto the floor, stunned. Nights responds, \"Hah! It'll take more than that to defeat me! Let the real battle begin!\"" — [[The Black Raven]]
      // > "1-2 slug boarders beam aboard your ship and you fight the Black Raven." — [[The Black Raven]]
      // > "Captain Nights' cruiser, the Black Raven, is always a Slug Assault class." — [[The Black Raven#Trivia]]
      pageFight(
        g,
        eventText("event_DONOR_BLACK_RAVEN_SLUG_1_text"),
        "Slug Assault pirate ship",
        "the-black-raven",
      );
      slugBoarders(g, 1, 2);
    } else {
      // Wiki citations:
      // > "Your Slug crewman's eyes glaze over as the two telepaths concentrate. You are powerless to help, but after a short time your comrade shakes off the daze and appears victorious." — [[The Black Raven]]
      // > "His face contorted with pain, Nights concedes his defeat: \"If this is the caliber of subordinatesss you keep, there iss no way we can defeat you. Take thisss and let us leave in shame.\"" — [[The Black Raven]]
      // > "You receive a weapon with high scrap." — [[The Black Raven]]
      const eligible = between(g, scrapBand(g, "high"));
      pageResult(
        g,
        `${eventText("event_DONOR_BLACK_RAVEN_SLUG_2_text")}\n\n${eventText("event_DONOR_BLACK_RAVEN_SLUG_2_c1_text")}`,
        {
          tier: "high",
          scrap: adjustScrap(g, eligible),
          eligible,
          fuel: 0,
          missiles: 0,
          parts: 0,
          random: "weapon",
        },
      );
    }
  },
  // The page goes straight to the fight: no lead-in line.
  "s:the-black-raven:accept": (g) => {
    // Wiki citations:
    // > "Fight the Black Raven." — [[The Black Raven]]
    // > "Captain Nights' cruiser, the Black Raven, is always a Slug Assault class." — [[The Black Raven#Trivia]]
    pageFight(g, "", "Slug Assault pirate ship", "the-black-raven");
  },
  "s:the-black-raven:decline": (g) => {
    // Wiki citations:
    // > "\"I sssee... However you have no choice in the matter!\" They move in to attack." — [[The Black Raven]]
    // > "Fight the Black Raven." — [[The Black Raven]]
    // > "Captain Nights' cruiser, the Black Raven, is always a Slug Assault class." — [[The Black Raven#Trivia]]
    pageFight(
      g,
      eventText("event_DONOR_BLACK_RAVEN_c1_c2_text"),
      "Slug Assault pirate ship",
      "the-black-raven",
    );
  },

  // Crystal fight, Accept, Yes. A Crystal crewmember. The ship still holds at most 8 (INFERRED: the page prints no ninth).
  "s:crystal-fight:yes": (g) => {
    // Wiki citations:
    // > "\"Great!\" As he brings his few belongings on board, you wonder how a being made of crystal can move with such lightness and enthusiasm." — [[Crystal fight#The ship surrenders]]
    // > "You receive a Crystal crewmember." — [[Crystal fight#The ship surrenders]]
    closeFight(g);
    const joined = joinCrew(g, "Crystal");
    pageResult(
      g,
      `${eventText("event_CRYSTAL_SHIP_SURRENDER_7_c1_text")}\n\n${
        joined
          ? "You receive a Crystal crewmember."
          : "There is no room aboard for their crewmember."
      }`,
    );
  },
  // Crystal fight, Accept, No. "a random amount of resources with some scrap."
  "s:crystal-fight:no": (g) => {
    // Wiki citations:
    // > "\"I understand. We did try to kill you...\" They transfer some materials over before leaving." — [[Crystal fight#The ship surrenders]]
    // > "You receive a random amount of resources with some scrap." — [[Crystal fight#The ship surrenders]]
    closeFight(g);
    pageResult(g, eventText("event_CRYSTAL_SHIP_SURRENDER_7_c2_text"), rollStandard(g));
  },

  // ---- "Zoltan ship asks to dock", Dock with them. Two results on the page. ----
  "c:zoltan-ship-asks-to-dock:0": (g) => {
    if (rand(g) < 0.5) {
      // Wiki citations:
      // > "You allow them to approach, but are caught unaware when they open fire!" — [[Zoltan ship asks to dock]]
      // > "Fight a Zoltan ship." — [[Zoltan ship asks to dock]]
      // "Fight a Zoltan ship." "never tries to escape" (Zoltan ships never run in rules/escape.ts already).
      pageFight(
        g,
        eventText("event_ZOLTAN_SCIENCE_DOCK_LIST_1_text"),
        "Zoltan ship",
        "zoltan-ship-asks-to-dock",
        { ...NEVER_RUN },
      );
    } else {
      // Wiki citations:
      // > "We have been studying the relationships between the species and have determined that the 'Federation' still has potential to be a net positive for the galaxy. Please accept this gift to aid your journey." — [[Zoltan ship asks to dock]]
      // > "You receive medium resources with some scrap." — [[Zoltan ship asks to dock]]
      // "You receive medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap." (Rewards#Stuff)
      pageResult(
        g,
        eventText("event_ZOLTAN_SCIENCE_DOCK_LIST_2_text"),
        rollSurrenderOffer(g, "medium", true),
      );
    }
  },
};

/** Runs a Ship surrender Events page choice. False when the id is not one of PAGE_CHOICES. */
export function pageChoose(g: Game, id: string): boolean {
  const run = PAGE_CHOICES[id];
  if (!run) return false;
  run(g);
  return true;
}
