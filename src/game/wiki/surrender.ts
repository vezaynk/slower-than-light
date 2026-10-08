/**
 * Enemy surrender offers and the anti-stalemate rule.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "Enemies may also surrender after dropping below a hull threshold."
 * Enemy Ships: "When enemies run or surrender in reaction to hull damage, it's often just a chance for that to happen
 * rather than a guarantee." "Enemies will never start running away if they have already offered a surrender."
 * Rewards, "Stuff": "This type of reward is most often used in non-scripted (i.e. not guaranteed to occur) ship
 * surrenders." Template:SurrenderEscape links every surrender offer to Rewards#Stuff.
 *
 * Hooks in sim.ts (marked @agent:surrender): startCombat sets the plan, step calls surrenderTick before
 * enemyEscapeStep, and choose routes the two offer choices here.
 */
import { CREW_POOL, WEAPONS, mediumScrapBand } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { kinOf, type KinId } from "../extras/kin.ts";
import { clearEnemyLeash } from "../extras/leash.ts";
import { CREW_CAP, beginBoarding, log, rand, startCombat, weaponSlotCap } from "../sim.ts";
import type { Crew, Difficulty, Game } from "../types.ts";
import { HULL_RUN_SECONDS, type EscapePlan } from "./escape.ts";
// @agent:quests. Quest markers (circular import: only called inside functions, never at module load).
import { addQuest, questChoose } from "./quests.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
import { pirateCrewRaces } from "./skills.ts";

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
  /** Scripted surrender (SCRIPTED_SURRENDERS): a crewmember of this race joins. */
  crew?: string;
  /** Scripted surrender: hull repairs. */
  repairs?: number;
  /** Scripted surrender: accepting does not end the fight (Crystal hunter). */
  continues?: boolean;
  /** Scripted surrender: what the page says is handed over, for the event card. */
  note?: string;
};

export type SurrenderPlan = {
  /** Percent chance of an offer, rolled once when hull first drops to `threshold`. 0 means never. */
  chance: number;
  /** Percent of max hull. */
  threshold: number;
  rolled: boolean;
  /** The offer is on screen, or was made and answered. */
  offered: boolean;
  /** The player said no. The fight goes on. */
  refused: boolean;
  offer: SurrenderOffer | null;
  /** Slug of the event page whose scripted surrender this fight uses (SCRIPTED_SURRENDERS). */
  event?: string;
  /** A "continues" surrender was accepted: its reward is paid and the fight goes on. */
  accepted?: boolean;
};

export type SurrenderContext = {
  tier: string;
  faction?: string;
  pirate?: boolean;
  event?: string;
};

/**
 * Enemy Ships, "Surrender/escape values for ships of various factions with 'Default rewards'":
 * Crystal ("CRYSTAL_SHIP") "40% surrender offer chance at 30-40% hull"; Slug ("JELLY") "50% ... at 30-40% hull";
 * Lanius ("LANIUS_SHIP") "80% ... at 30-40% hull"; Pirate ("PIRATE") "50% ... at 30-40% hull";
 * Rebel ("REBEL") "50% ... at 20-30% hull"; Rock ("ROCK_SHIP") "30% ... at 30-40% hull".
 * "Remember that pirates are different from their regular counterparts", so a pirate uses the Pirate row.
 */
export const SURRENDER_ROWS: Record<string, { chance: number; low: number; high: number }> = {
  crystal: { chance: 40, low: 30, high: 40 },
  slug: { chance: 50, low: 30, high: 40 },
  lanius: { chance: 80, low: 30, high: 40 },
  pirate: { chance: 50, low: 30, high: 40 },
  rebel: { chance: 50, low: 20, high: 30 },
  rock: { chance: 30, low: 30, high: 40 },
};

/**
 * Enemy Ships, "Never run away, never surrender": Auto-ships, Engi ships, Mantis ships, Zoltan ships.
 * Federation has no row; Template:SurrenderEscape reads a ship with no data as "should not escape or offer surrender".
 * "Crystal ships (some ships only)" also appear there, but the page does not say which, so every Crystal ship uses
 * the 40% row. INFERRED.
 */
export const NEVER_SURRENDER = new Set(["auto", "engi", "mantis", "zoltan", "federation"]);

/**
 * Enemy Ships, "Never run away, never surrender": "Rebel ships in certain events ([[Rebel ship attacking Federation
 * loyalists]], [[Rebel ship attacking refueling outpost]], [[Rebel ship supplying civilians]], [[Engi distress Rebel
 * fight]], and some other events)" and "Rock pirate ships in events that specifically load a Rock pirate ([[Rock pirate
 * fight]], [[Rock pirate fight near sun]], [[Rock pirate fight in asteroid field]])". The "other events" are not named.
 */
export const NO_SURRENDER_EVENTS = new Set([
  "rebel-ship-attacking-federation-loyalists",
  "rebel-ship-attacking-refueling-outpost",
  "rebel-ship-supplying-civilians",
  "engi-distress-rebel-fight",
  "rock-pirate-fight",
  "rock-pirate-fight-near-sun",
  "rock-pirate-fight-in-asteroid-field",
  // @agent:sector-hostiles. The wired event slugs for those three pages are plural ("Rock pirates fight", ...).
  "rock-pirates-fight",
  "rock-pirates-fight-near-sun",
  "rock-pirates-fight-in-asteroid-field",
  // Event pages whose fight carries {{SurrenderEscape|surrenderno...}} ("no surrender"): Rebel ship warning, Rebel
  // transport ship, Pirate ship attacking civilian (and its distress variant), Rebel fight among Rebel fleet, Rebel fight
  // among Federation and Rebel fleets, Rebel ship attacking Crystal ship ("CRYSTAL_SHIP_NO_SURRENDER"),
  // No fuel: Engi ship repair, No fuel: Slug fuel depot.
  "rebel-ship-warning",
  "rebel-transport-ship",
  "pirate-ship-attacking-civilian",
  "pirate-ship-attacking-civilian-distress",
  "rebel-fight-among-rebel-fleet",
  "rebel-fight-among-federation-and-rebel-fleets",
  "rebel-ship-attacking-crystal-ship",
  "no-fuel-engi-ship-repair",
  "no-fuel-slug-fuel-depot",
  // Category:Ship surrender Events: "There are no surrenders in the 1st fight of [[Mantis ship-collectors]]". The wired
  // choice is that first fight (the Mantis Fighter).
  "mantis-ship-collectors",
  // @agent:quests. Quest-marker fights (wiki/quests.ts). {{SurrenderEscape(alt)|no|...}}: Space station under
  // construction (QUEST_CONSTRUCTIONYARD_SHIP), Engi fleet discussion final marker (MANTIS_ENGI_UNLOCK_3), Mantis war camp
  // (MANTIS_LANDING_PARTY). Settlement mercenary work Trivia: "The "SQUAT_STORE_RESCUE" ship ... doesn't surrender".
  // INFERRED (the page prints no surrender result): Slug comm tapping "Head for the cache." pirate, the Slug Home Nebula
  // platform guard and interceptor.
  "quest-space-station-rebel",
  "quest-engi-final",
  "quest-mantis-war-camp",
  "quest-store-rescue",
  // Lanius ship absorbing automated scout: {{SurrenderEscape(alt)|escapechance|...|80|20-40|2-4}}.
  // escapechance is an escape attempt only. The 2-4 is the hull tooltip, not a timer.
  "lanius-ship-absorbing-automated-scout",
  "quest-slug-pirate-trap-cache",
  "quest-slug-platform",
  "quest-slug-interceptor",
  // Mantis ship attacking Slug ship, the Slug fight: {{SurrenderEscape(alt)|no|SLUG_DISTRESS_MANTIS_SLUG}}.
  "mantis-ship-attacking-slug-ship-slug",
]);

/** What a scripted surrender hands over. Each kind is the page's own reward line, quoted on its row below. */
export type ScriptedReward =
  | { k: "crew"; race?: string }
  | { k: "stuff"; tier?: SurrenderTier }
  | { k: "fuel-repairs"; repairs: number }
  | { k: "weapon"; name: string }
  // Rewards, "Standard": T scrap + low resources. `race`: the page also names a crewmember of that race.
  | { k: "standard"; tier: SurrenderTier; race?: string }
  // Rewards, "Scrap only" / "Weapon": T scrap. `unnamed`: an item the page gives without naming it; not granted.
  | { k: "scrap"; tier: SurrenderTier; unnamed?: string }
  // @agent:quests. The page's accept line pays nothing (it adds a quest marker or opens a dialogue instead).
  | { k: "none" };

export type ScriptedSurrender = {
  /** Wiki event page. */
  page: string;
  /** Percent chance of the offer, and the hull range (percent of max hull) it is rolled at. */
  chance: number;
  low: number;
  high: number;
  reward: ScriptedReward;
  /** Accepting pays the reward and the fight goes on. */
  continues?: boolean;
  /** The page says there is no option to decline: the card shows only `accept`. */
  forced?: boolean;
  /** The page's surrender text, and its accept / refuse choices. */
  hail: string;
  accept: string;
  refuse: string;
  /** @agent:quests. Accepting adds this quest marker (wiki/quests.ts QUESTS key). */
  quest?: string;
  /** @agent:quests. The page's text after accepting, for the reward card. */
  result?: string;
  /** @agent:quests. Accepting opens this card instead of ending the fight (the enemy is still there). */
  card?: { body: string; choices: { id: string; label: string }[] };
  /** @agent:quests. A third answer the page prints on the surrender card, handled in wiki/quests.ts. */
  extra?: { id: string; label: string };
};

/**
 * Scripted surrenders: event pages whose ship carries its own surrender offer and reward. Keyed by the event slug that
 * startCombat receives (wiki/escape.ts eventSlugOf). Only pages the cited events wire to a fight are listed.
 * Each reward is only what the page names; nothing else is added.
 */
export const SCRIPTED_SURRENDERS: Record<string, ScriptedSurrender> = {
  // "Crystal fight with surrender offer (Human crew)": CRYSTAL_HUNTER, {{SurrenderEscape(alt)|surrenderofferchance*|...|50|30-40}}.
  // "Accept their surrender." -> "You receive a Human crewmember and the fight continues." (ref: "The surrender is
  // lacking the usual tag to stop the fight").
  "crystal-fight-with-surrender-offer-human-crew": {
    page: "Crystal fight with surrender offer (Human crew)",
    chance: 50,
    low: 30,
    high: 40,
    reward: { k: "crew", race: "Human" },
    continues: true,
    hail: "The hunters message you, \"We surrender. Take one of these squishy meat sacks that we've captured.\" He must be referring to the human captives.",
    accept: "Accept their surrender.",
    refuse: "Finish them off.",
  },
  // "Crystal fight with surrender offer (hull repairs)": CRYSTAL_CONVOY, "surrenderofferchance100", 30-40.
  // "Stop the fight." -> "You receive low (1-3 fuel) fuel and scrap, and your ship receives 8 repairs."
  // Rewards, "Fuel": "T fuel & T scrap" (low fuel and low scrap).
  "crystal-fight-with-surrender-offer-hull-repairs": {
    page: "Crystal fight with surrender offer (hull repairs)",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "fuel-repairs", repairs: 8 },
    hail: "Their ship seems severely damaged and they look to be reconsidering the fight. Should you power down your weapons and explain that you mean no threat?",
    accept: "Stop the fight.",
    refuse: "Finish them off.",
  },
  // "Pirate briber": "(has 70% chance to surrender at 30-40% hull)". "Accept the more generous bribe and leave." ->
  // "You receive high (fuel: 3-6 ; missiles: 4-8 ; drone parts: 1-2) resources with some scrap" (Rewards#Stuff).
  "pirate-briber": {
    page: "Pirate briber",
    chance: 70,
    low: 30,
    high: 40,
    reward: { k: "stuff", tier: "high" },
    hail: "\"Fine! Our previous offer was not generous enough, let's improve it.\"",
    accept: "Accept the more generous bribe and leave.",
    refuse: "Reject the offer and continue your assault.",
  },
  // "Pirate smuggler", Fight the Pirate ship: "(enemy ship has 50% chance to surrender at 20-40% hull)".
  // "Accept their offer." -> "You receive a random amount of resources with some scrap" (Rewards#Stuff, random tier).
  "pirate-smuggler": {
    page: "Pirate smuggler",
    chance: 50,
    low: 20,
    high: 40,
    reward: { k: "stuff" },
    hail: "They hail you, \"We realize our ship is no match for yours. If you let us go we can make it worth your while.\"",
    accept: "Accept their offer.",
    refuse: "Ignore their pleas and attack.",
  },
  // "Remote settlement", Fight the pirate ship: "(50% chance for surrender offer at 20-40% hull)". "Let them go." ->
  // "You receive medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap" (Rewards#Stuff).
  "remote-settlement": {
    page: "Remote settlement",
    chance: 50,
    low: 20,
    high: 40,
    reward: { k: "stuff", tier: "medium" },
    hail: "\"Alright! We give up! We're terrible at this pirating thing anyway...\"",
    accept: "Let them go.",
    refuse: "Piracy cannot be forgiven. Attack!",
  },
  // Template:Slaver Fight (used by "Slaver (hostile)" and "Slaver (friendly)"): "(enemy ship has 80% chance to surrender
  // at 20-40% hull)". "Accept their offer." -> "You receive a crewmember." The race is not named.
  // Category:Crew Rewards: any of the possible races for the current sector type (randomRace), not a global race.
  // INFERRED: each race on that sector's Sectors "Crewmembers" list is equally likely. The Sectors page says rarity
  // only affects the store assortment probability.
  "slaver-hostile": {
    page: "Slaver (hostile)",
    chance: 80,
    low: 20,
    high: 40,
    reward: { k: "crew" },
    hail: "We surrender! Take one of our slaves as tribute; if you destroy us they'll all die anyway!",
    accept: "Accept their offer.",
    refuse: "Surrender is not an option.",
  },
  "slaver-friendly": {
    page: "Slaver (friendly)",
    chance: 80,
    low: 20,
    high: 40,
    reward: { k: "crew" },
    hail: "We surrender! Take one of our slaves as tribute; if you destroy us they'll all die anyway!",
    accept: "Accept their offer.",
    refuse: "Surrender is not an option.",
  },
  // "Slug Home Nebula surrender": "surrender offer: 100% chance at 30-40% hull". "Let them live." -> "Accept the
  // prototype weapon." -> "You receive Anti-Bio Beam." @agent:quests: the other branch, "We don't want the weapon, we
  // want information." -> "A quest marker is added to your map.", is the `extra` answer (wiki/quests.ts). The Slug
  // Cruiser unlock is the interceptor fight on that marker, not this offer (@agent:unlocks, wiki/quests.ts grantUnlock).
  "slug-home-nebula-surrender": {
    page: "Slug Home Nebula surrender",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "weapon", name: "Anti-Bio Beam" },
    hail: "\"You have besssted us! Will you accept what is in our storeesss in exchange for our livess?\" \"Take thisss newly developed weapon we're transporting...\"",
    accept: "Let them live. Accept the prototype weapon.",
    refuse: "We will not accept surrender!",
    extra: { id: "s:slug-home-nebula-surrender:info", label: "Let them live. We don't want the weapon, we want information." },
  },
  // ---- @agent:surrender (pages wired by cited-events-surrender.ts; their fights start in PAGE_CHOICES below) ----
  // "Destroyed cargo ship", Bring it aboard, ambush result: JELLY_PIRATE_WITHBOARDERS "makes a surrender offer at
  // 0-50% hull". Category:Ship surrender Events: "only the 'bring it aboard' ship fight has a guaranteed surrender
  // offer", so 100%. The page names no surrender reward; Template:SurrenderEscape links every offer to Rewards#Stuff
  // (random tier, as the default rows). INVENTED: the hail and both labels; the page prints none.
  "destroyed-cargo-ship": {
    page: "Destroyed cargo ship",
    chance: 100,
    low: 0,
    high: 50,
    reward: { k: "stuff" },
    hail: "The pirates hail you: \"Enough! Take what's left of the cargo and let us go.\"",
    accept: "Accept their surrender.",
    refuse: "Refuse. Keep firing.",
  },
  // "Settlement mercenary work", Accept: SQUAT_PIRATE_MERCENARY "(surrenders at 30-40% hull)"; the Category page:
  // "only the fight with a Pirate ship ... has a guaranteed surrender offer". "Let them live and then return to the
  // settlement." -> "You receive a weapon with medium scrap." The weapon is not named: only the medium scrap is paid.
  "settlement-mercenary-work": {
    page: "Settlement mercenary work",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "medium", unnamed: "weapon" },
    hail: "They hail your ship saying, \"You win! We're not cut out for this!\"",
    accept: "Let them live and then return to the settlement.",
    refuse: "Forget your promise, they die!",
  },
  // "The Black Raven", Trivia: "proposes a surrender offer when its hull integrity falls down to 30-40%". The page
  // gives no percent chance; INFERRED 100% (a scripted surrender, listed in Category:Ship surrender Events).
  // "Accept his surrender." -> "You receive a weapon with high scrap." The weapon is not named: only the high scrap.
  "the-black-raven": {
    page: "The Black Raven",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "high", unnamed: "weapon" },
    hail: "\"I see the rumorsss are true. I yield, we are no match for you. Take this and let us leave in ssshame.\"",
    accept: "Accept his surrender.",
    refuse: "Ignore him and attack.",
  },
  // "Zoltan ship asks to dock" (old title "Zoltan science ship"), ZOLTAN_SCIENCE_DOCK: "Enemy ship has 50% chance to
  // surrender at 30-40% hull". -> "You receive a Zoltan crewmember and low scrap with resources." Trivia: "there is
  // no option or prompt to decline the surrender". INVENTED: the accept label (the page has no choice there).
  "zoltan-ship-asks-to-dock": {
    page: "Zoltan ship asks to dock",
    chance: 50,
    low: 30,
    high: 40,
    reward: { k: "standard", tier: "low", race: "Zoltan" },
    forced: true,
    hail: "The Zoltan captain sends an urgent hail: \"Wait, this was all a test! A test that you passed! A diverse crew, working together, surely a sight to warm the heart of any dispassionate observer. Come, I shall join your crew!\"",
    accept: "Welcome the captain aboard.",
    refuse: "",
  },
  // ---- @agent:quests. Fights at quest-marker beacons (wiki/quests.ts starts them with these slugs) ----
  // "Slug comm tapping", Quest Marker, Engage the pirate: QUEST_SLUG_PIRATE_TRAP1 "(surrenders at 30-40% hull)". No
  // percent is printed: INFERRED 100% (a scripted surrender). "Let the pirate escape and go after the Slugman ship."
  // -> "You receive high scrap." (Rewards#Scrap only).
  "quest-slug-pirate-trap-engage": {
    page: "Slug comm tapping",
    chance: 100,
    low: 30,
    high: 40,
    reward: { k: "scrap", tier: "high" },
    hail: "When the pirate ship looks ready to break apart you notice the Slug ship has secured the loot and is preparing to jump away!",
    accept: "Let the pirate escape and go after the Slugman ship.",
    refuse: "Continue fighting the pirate.",
    result: "The pirate's too badly damaged to pursue you, and you catch up to the Slugs before they jump. \"Ah, of courssse, we would never leave without providing the agreed upon ssspoils.\" They transfer over a decent chunk of the profits and set off.",
  },
  // "Engi fleet discussion", First Quest Marker (Real): REBEL_ENGI_UNLOCK_2REAL "surrenders at 50% hull". No percent
  // chance printed: INFERRED 100%. The page prints one answer, "Demand information on the stolen technology." -> "A final
  // quest marker is added to your map." -> "Let them go." So the card has no refuse (forced) and pays nothing.
  "quest-engi-real": {
    page: "Engi fleet discussion",
    chance: 100,
    low: 50,
    high: 50,
    reward: { k: "none" },
    forced: true,
    quest: "engi-final",
    hail: "\"Stop!  This isn't worth dying for...\"",
    accept: "Demand information on the stolen technology.",
    refuse: "",
    result: "\"Of course, that's why you're here. Yes, they passed by here but I had nothing to do with it, I don't know what they were carrying. I'll transmit coordinates. Now just let us go...\" You prepare an FTL message containing the coordinates to send to the Engies and get ready to jump.",
  },
  // "Engi fleet discussion", Second Quest Marker (Fake): REBEL_ENGI_UNLOCK_2FAKE "surrenders at 40% hull" (INFERRED 100%).
  // "Demand information on the stolen technology." opens the page's follow-up: "Let them go." ("The ship turns neutral.")
  // or "Ignore him and attack." ("Continue the fight."), handled in wiki/quests.ts.
  "quest-engi-fake": {
    page: "Engi fleet discussion",
    chance: 100,
    low: 40,
    high: 40,
    reward: { k: "none" },
    forced: true,
    hail: "\"Stop! I don't want to die here.\"",
    accept: "Demand information on the stolen technology.",
    refuse: "",
    card: {
      body: "\"Ah, so that's what you're after. Too bad, you followed the wrong ship. The envoy that passed through here was a fake, to trick fools like you. Now let us go!\"",
      choices: [
        { id: "q:engi-fake:go", label: "Let them go." },
        { id: "q:engi-fake:attack", label: "Ignore him and attack." },
      ],
    },
  },
  // "Mantis ship-collectors", Quest Marker: DONOR_MANTIS_CHASE2 "makes a surrender offer at 20% hull" (INFERRED 100%).
  // "Let them live." -> "You receive a weapon with high scrap." The weapon is not named: only the high scrap is paid.
  "quest-mantis-chase": {
    page: "Mantis ship-collectors",
    chance: 100,
    low: 20,
    high: 20,
    reward: { k: "scrap", tier: "high", unnamed: "weapon" },
    hail: "\"Look, you proved your point. We don't want to die... Take this and let us go. Please?\"",
    accept: "Let them live.",
    refuse: "Finish them off.",
    result: "\"Thank you. But do you have any idea how much repairing TWO ships will set us back?...\" What an odd Mantis. You prepare to leave.",
  },
};

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)": "when the enemy ship is below a certain hull threshold (likely below
 * 50%, closer to 30-40%) and doesn't receive any more hull damage for 1 minute, the fight will end by granting you 2 fuel."
 * INFERRED: 40%, the top of the "closer to 30-40%" range.
 */
export const STALEMATE_THRESHOLD = 40;
export const STALEMATE_SECONDS = 60;
export const STALEMATE_FUEL = 2;

export const ACCEPT_ID = "surrender-accept";
export const REFUSE_ID = "surrender-refuse";

function never(): SurrenderPlan {
  return { chance: 0, threshold: 0, rolled: false, offered: false, refused: false, offer: null };
}

export function surrenderPlan(ctx: SurrenderContext, roll: () => number): SurrenderPlan {
  // Enemy Ships, "Never run away, never surrender": "Rebel Elite ships" and the Flagship.
  // INFERRED for the boss: the Flagship is on no surrender row (Template:SurrenderEscape "verify").
  if (ctx.tier === "boss" || ctx.tier === "elite") return never();
  if (ctx.event && NO_SURRENDER_EVENTS.has(ctx.event)) return never();
  // @agent:sector-hostiles. The event page's own surrender row replaces the faction row.
  const scripted = ctx.event ? SCRIPTED_SURRENDERS[ctx.event] : undefined;
  if (scripted) {
    const threshold = scripted.low + roll() * (scripted.high - scripted.low);
    return { ...never(), chance: scripted.chance, threshold, event: ctx.event };
  }
  if (!ctx.pirate && NEVER_SURRENDER.has(ctx.faction ?? "")) return never();
  // INFERRED: a ship with no faction field is a generic Rebel, as in wiki/escape.ts.
  const row = SURRENDER_ROWS[ctx.pirate ? "pirate" : (ctx.faction ?? "rebel")];
  if (!row) return never();
  // Enemy Ships, DISCLAIMER: the percent "may be incorrect as a concept"; read as a percent of max hull here.
  // INFERRED: one threshold drawn uniformly inside the row's range, like the escape threshold.
  const threshold = row.low + roll() * (row.high - row.low);
  return { ...never(), chance: row.chance, threshold };
}

/** Template:Scrap rewards, Low and High columns, sectors 1–8. Medium comes from content.ts. */
const SCRAP_LOW: Record<Difficulty, [number, number][]> = {
  easy: [[10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39], [31, 44]],
  normal: [[7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39]],
  hard: [[7, 10], [7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35]],
};
const SCRAP_HIGH: Record<Difficulty, [number, number][]> = {
  easy: [[27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88], [81, 97]],
  normal: [[19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88]],
  hard: [[19, 23], [19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79]],
};

export function scrapBand(g: Game, tier: SurrenderTier): [number, number] {
  if (tier === "medium") return mediumScrapBand(g.difficulty ?? "normal", g.sector);
  const table = tier === "low" ? SCRAP_LOW : SCRAP_HIGH;
  return (table[g.difficulty] ?? table.normal)[Math.min(7, Math.max(0, g.sector - 1))];
}

/** Template:Resources rewards: Fuel 1–3 / 2–4 / 3–6, Missiles 1–2 / 2–4 / 4–8, Drone parts 1 / 1 / 1–2. */
const RESOURCES: Record<"fuel" | "missiles" | "parts", Record<SurrenderTier, [number, number]>> = {
  fuel: { low: [1, 3], medium: [2, 4], high: [3, 6] },
  missiles: { low: [1, 2], medium: [2, 4], high: [4, 8] },
  parts: { low: [1, 1], medium: [1, 1], high: [1, 2] },
};

export function between(g: Game, [lo, hi]: [number, number]): number {
  return lo + Math.floor(rand(g) * (hi - lo + 1));
}

/**
 * Rewards, "Stuff": "T resources (2 random resources among fuel, missiles, and drone parts) + low scrap + roughly a 6%
 * chance to include a bonus weapon, augmentation, or drone schematic." "Ships surrender offers in fights with default
 * rewards ... are random tier." "A successful 6% bonus item roll modifies the scrap part of the reward to match the
 * resources tier."
 * INFERRED: "random tier" is low, medium or high with equal odds; the two resources are different ones.
 * INFERRED: the bonus item is a weapon the ship does not own, and is dropped when the printed slot count is full.
 */
export function rollSurrenderOffer(g: Game, fixed?: SurrenderTier, noBonus = false): SurrenderOffer {
  // A scripted page can name the tier ("high ... resources with some scrap"); the draw is skipped then.
  const tier = fixed ?? (["low", "medium", "high"] as const)[Math.min(2, Math.floor(rand(g) * 3))];
  const kinds = ["fuel", "missiles", "parts"] as const;
  const skip = Math.min(2, Math.floor(rand(g) * 3));
  const offer: SurrenderOffer = { tier, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  kinds.forEach((k, i) => {
    if (i !== skip) offer[k] = between(g, RESOURCES[k][tier]);
  });
  // `noBonus`: a page gift (not a surrender) that names its reward; the unnamed bonus item is not granted there.
  const bonus = !noBonus && rand(g) < 0.06;
  if (bonus && g.player.weapons.length < weaponSlotCap(g)) {
    const owned = new Set(g.player.weapons.map((w) => w.defId));
    const options = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
    if (options.length) offer.weapon = options[Math.min(options.length - 1, Math.floor(rand(g) * options.length))].id;
  }
  offer.eligible = between(g, scrapBand(g, bonus ? tier : "low"));
  offer.scrap = adjustScrap(g, offer.eligible);
  return offer;
}

/** Display race -> kin id for joinCrew. Crew rewards do not draw from this list; an unnamed race is randomRace. */
const RACES: [string, KinId][] = [
  ["Human", "plain"],
  ["Engi", "shell"],
  ["Mantis", "blade"],
  ["Slug", "gel"],
  ["Rock", "stone"],
  ["Zoltan", "spark"],
  ["Crystal", "shard"],
  ["Lanius", "voidlung"],
];

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
 * equal odds. The 3% bonus item is unnamed and not granted.
 */
export function rollStandard(g: Game, tier?: SurrenderTier): SurrenderOffer {
  const t = tier ?? randomTier(g);
  const offer: SurrenderOffer = { tier: t, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  const skip = Math.min(2, Math.floor(rand(g) * 3));
  (["fuel", "missiles", "parts"] as const).forEach((k, i) => {
    if (i !== skip) offer[k] = between(g, RESOURCES[k].low);
  });
  offer.eligible = between(g, scrapBand(g, t));
  offer.scrap = adjustScrap(g, offer.eligible);
  return offer;
}

/** The page's reward for a scripted surrender, rolled when the offer is made. Only what the page names. */
export function rollScriptedOffer(g: Game, s: ScriptedSurrender): SurrenderOffer {
  const r = s.reward;
  if (r.k === "stuff") {
    const offer = rollSurrenderOffer(g, r.tier);
    offer.note = r.tier ? `${r.tier[0].toUpperCase()}${r.tier.slice(1)} resources with some scrap.` : "Resources with some scrap.";
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
  const offer: SurrenderOffer = { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  if (r.k === "scrap") {
    // @agent:surrender. Rewards, "Scrap only" / "Weapon": T scrap. A weapon the page leaves unnamed is not granted.
    offer.tier = r.tier;
    offer.eligible = between(g, scrapBand(g, r.tier));
    offer.scrap = adjustScrap(g, offer.eligible);
    offer.note = `${cap(r.tier)} scrap.`;
  } else if (r.k === "crew") {
    offer.crew = r.race ?? randomRace(g);
    offer.note = `A ${offer.crew} crewmember.`;
  } else if (r.k === "fuel-repairs") {
    // Rewards, "Fuel": "T fuel & T scrap"; the page's tooltip "low: 1-3 fuel" is Template:Resources rewards' low fuel.
    offer.fuel = between(g, RESOURCES.fuel.low);
    offer.eligible = between(g, scrapBand(g, "low"));
    offer.scrap = adjustScrap(g, offer.eligible);
    offer.repairs = r.repairs;
    offer.note = `Fuel, scrap, and ${r.repairs} hull repairs.`;
  } else if (r.k === "none") {
    // @agent:quests. Nothing is handed over; the page's answer is a quest marker or a follow-up card.
  } else {
    offer.weapon = Object.values(WEAPONS).find((w) => w.name === r.name)?.id;
    offer.note = `The ${r.name}.`;
  }
  if (s.continues) offer.continues = true;
  return offer;
}

/**
 * Category:Crew Rewards: "If a crewmember's race is not predefined/hard-coded or specified, then it can be of any of
 * the possible races for the current sector type." Those races are the sector's Sectors "Crewmembers" list
 * (pirateCrewRaces). Hidden Crystal Worlds: "only Crystal crewmembers can be purchased or received as a crew kill
 * reward."
 * INFERRED: each race on that sector list is equally likely. The Sectors page says rarity only affects the store
 * assortment probability.
 * @agent:quests. A page that gives "a crewmember" without naming one.
 */
export function randomRace(g: Game): string {
  const list = pirateCrewRaces(g.sectorName);
  return list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
}

/**
 * A crewmember joins the player. Same cap and fields as sim.ts addCrew, which this module cannot import.
 * @agent:quests: `name` and `skills` for a page's named crewmember (Kazaaak); exported for wiki/quests.ts.
 */
export function joinCrew(g: Game, race: string, name?: string, skills?: Crew["skills"]): boolean {
  // Crew: "can carry a maximum of 8 crewmembers." A 9th is not added.
  if (g.crew.filter((c) => c.side === "player").length >= CREW_CAP) return false;
  const kin = RACES.find(([r]) => r === race)?.[1] ?? "plain";
  const used = new Set(g.crew.map((c) => c.name));
  const named = name ?? CREW_POOL.find((n) => !used.has(n)) ?? "Rook Vale";
  const hp = kinOf(kin).hp;
  const roomId = g.player.rooms.find((x) => x.id === "p-medbay")?.id ?? g.player.rooms[0]?.id ?? "p-medbay";
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
  return true;
}

/** The offer on screen, for the event card. Null when the open event is not a surrender. */
export function surrenderOfferView(g: Game): SurrenderOffer | null {
  const plan = g.enemySurrender;
  if (g.phase !== "event" || !g.enemy || !plan?.offered || plan.refused) return null;
  return plan.offer;
}

function ratio(g: Game): number {
  const ship = g.enemy;
  if (!ship) return 1;
  return (ship.hull / Math.max(1, ship.hullMax)) * 100;
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
  g.crew = g.crew.filter((c) => c.side === "player");
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

function openOffer(g: Game) {
  const plan = g.enemySurrender;
  if (!plan) return;
  plan.offered = true;
  const scripted = plan.event ? SCRIPTED_SURRENDERS[plan.event] : undefined;
  plan.offer = scripted ? rollScriptedOffer(g, scripted) : rollSurrenderOffer(g);
  // Enemy Ships: "Enemies will never start running away if they have already offered a surrender."
  // A hull-triggered escape that has not rolled yet is spent here. One already charging keeps charging. INFERRED.
  if (g.enemyEscape && !g.enemyEscape.running) g.enemyEscape.rolled = true;
  g.phase = "event";
  g.paused = true;
  g.targeting = false;
  g.beamAnchor = null;
  // INVENTED: the hail text. The page gives no generic surrender line. A scripted surrender uses its page's text.
  g.event = scripted
    ? {
        title: "Surrender",
        body: plan.offer.note ? `${scripted.hail} They offer: ${plan.offer.note}` : scripted.hail,
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
        body: `${g.enemy?.name ?? "The enemy"} hails you: "Enough! We surrender. Take our cargo and let us go."`,
        choices: [
          { id: ACCEPT_ID, label: "Accept their surrender." },
          { id: REFUSE_ID, label: "Refuse. Keep firing." },
        ],
      };
  log(g, "The enemy is offering to surrender.");
  g.sfx.push("alarm");
}

/**
 * One combat tick, run before enemyEscapeStep. Returns true when the tick opened an offer or ended the fight,
 * so the rest of step should not run.
 *
 * Order when both thresholds are crossed on the same hit: the surrender roll goes first, because "Enemies will never
 * start running away if they have already offered a surrender". If no offer is made, the escape roll still happens on
 * this same tick. INFERRED: the page does not say which the game checks first.
 */
export function surrenderTick(g: Game, h: number): boolean {
  const ship = g.enemy;
  if (!ship || g.phase !== "combat") return false;
  if (g.enemySurrender === undefined) {
    // Saves from before this module: build the plan from the ship that is already here.
    const boss = here(g)?.kind === "boss";
    g.enemySurrender = surrenderPlan({ tier: boss ? "boss" : "pool", faction: ship.faction, pirate: ship.pirate }, () => rand(g));
  }
  const plan = g.enemySurrender;
  if (plan && plan.chance > 0 && !plan.rolled && ship.hull > 0 && ratio(g) <= plan.threshold) {
    // Enemy Ships: "it's often just a chance". One roll, the first time hull drops that low.
    plan.rolled = true;
    if (rand(g) * 100 < plan.chance) {
      openOffer(g);
      return true;
    }
  }
  return stalemateTick(g, h);
}

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)". The clock runs only while hull is below the threshold, and any hull
 * damage starts it over. INFERRED: not for the Flagship, whose fight is the run's ending; a paused game does not count.
 */
export function stalemateTick(g: Game, h: number): boolean {
  const ship = g.enemy;
  if (!ship || g.phase !== "combat" || here(g)?.kind === "boss") return false;
  const clock = g.stalemate && g.stalemate.ship === ship.name ? g.stalemate : { ship: ship.name, hull: ship.hull, quiet: 0 };
  g.stalemate = clock;
  if (ship.hull < clock.hull) clock.quiet = 0;
  clock.hull = ship.hull;
  if (ship.hull <= 0 || ratio(g) >= STALEMATE_THRESHOLD) {
    clock.quiet = 0;
    return false;
  }
  clock.quiet += h;
  if (clock.quiet < STALEMATE_SECONDS) return false;
  // "the fight will end by granting you 2 fuel." INFERRED: no scrap, and it does not count as a kill.
  closeFight(g);
  g.fuel += STALEMATE_FUEL;
  log(g, `A minute without a hit. The fight breaks off. +${STALEMATE_FUEL} fuel.`);
  g.reward = { scrap: 0, note: "Neither ship can finish it. Both crews break off.", res: { fuel: STALEMATE_FUEL } };
  g.phase = "reward";
  g.paused = true;
  g.sfx.push("win");
  return true;
}

/** Pays an offer: resources, a free-slot weapon, and the crew and repairs a scripted page names. */
export function payOffer(g: Game, offer: SurrenderOffer, scripted: boolean): { weaponName?: string; extras: string[] } {
  g.scrap += offer.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + offer.eligible;
  g.fuel += offer.fuel;
  g.missiles += offer.missiles;
  g.player.parts += offer.parts;
  let weaponName: string | undefined;
  if (offer.weapon && g.player.weapons.length < weaponSlotCap(g) && !g.player.weapons.some((w) => w.defId === offer.weapon)) {
    // Same slot rule and id scheme as sim.ts giveWeapon.
    g.uid = (g.uid + 1) >>> 0;
    g.player.weapons.push({ uid: "u" + g.uid.toString(36), defId: offer.weapon, charge: 0, enabled: false, autofire: false, target: null });
    weaponName = WEAPONS[offer.weapon]?.name;
  }
  // Scripted surrenders (SCRIPTED_SURRENDERS): a crewmember and hull repairs the page names.
  const extras: string[] = [];
  if (offer.crew) extras.push(joinCrew(g, offer.crew) ? `A ${offer.crew} crewmember joins you.` : "There is no room aboard for their crewmember.");
  if (offer.repairs) {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + offer.repairs);
    extras.push(`Hull repairs: ${offer.repairs}.`);
  }
  if (scripted && offer.weapon && !weaponName) extras.push("No free weapon slot for it.");
  return { weaponName, extras };
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
  const forced = !!(plan.event && SCRIPTED_SURRENDERS[plan.event]?.forced);
  if (id === REFUSE_ID && !forced) {
    plan.refused = true;
    g.phase = "combat";
    g.paused = false;
    // Enemy Ships: "If you jump away after rejecting an enemy's surrender offer, then return, the enemy will not be
    // present. The enemy indicator on the map will also disappear after jumping away."
    const b = here(g);
    if (b && b.kind !== "boss") b.resolved = true;
    log(g, "Offer refused. They brace for more.");
    return true;
  }
  const offer = plan.offer ?? rollSurrenderOffer(g);
  // @agent:quests. The page's answer opens a follow-up card while the enemy is still there (Engi fleet discussion, fake).
  const page = plan.event ? SCRIPTED_SURRENDERS[plan.event] : undefined;
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
    log(g, joined ? `A ${offer.crew} crewmember joins you. The fight continues.` : "No room aboard. The fight continues.");
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
      ? `They hand over their cargo, and a ${weaponName}.`
      : "They hand over their cargo and limp away.";
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
    for (const l of got) log(g, l);
  }
  g.event = { title: here(g)?.name ?? "Event", body: lines.filter(Boolean).join("\n\n"), choices: [{ id: "ack", label: "Continue" }] };
  g.phase = "event";
}

/** A follow-up dialogue card on the same beacon. */
export function pageCard(g: Game, body: string, choices: { id: string; label: string }[]) {
  g.event = { title: here(g)?.name ?? "Event", body, choices };
  g.phase = "event";
}

/** Starts the page's fight. `escape` replaces the default escape plan when the page states its own. */
export function pageFight(g: Game, text: string, tier: string, slug: string, escape?: EscapePlan) {
  log(g, text);
  g.event = null;
  startCombat(g, tier, false, slug);
  if (escape) g.enemyEscape = escape;
}

/**
 * "Destroyed cargo ship": "2-4 human boarders beam aboard your ship". INFERRED: each lands in a random room.
 * `line` replaces the crate sentence on pages that are not the cargo ambush (`${n} ${line}`).
 * `lungs` is Boarders: Humans (Abandoned): Emergency Respirators after a Lanius fight.
 */
export function humanBoarders(g: Game, lo: number, hi: number, line?: string, lungs = false) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("plain").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "plain",
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
 * INFERRED: each lands in a random player room, the same as human boarders. Call this after startCombat,
 * which drops enemy crew that were already aboard. `line` replaces the short log (`${n} ${line}`).
 */
export function slugBoarders(g: Game, lo: number, hi: number, line?: string) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("gel").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "gel",
    });
  }
  log(g, line ? `${n} ${line}` : `${n} slug boarders beam aboard.`);
}

/**
 * Rock fight with boarders: "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
 * Call this after startCombat (ctx.fight): that drops enemy crew that were already aboard.
 * INFERRED: the count is an inclusive whole number from 1 to 3, and each boarder lands in a random player room,
 * the same pattern as humanBoarders. INFERRED: the display name is "Rock" because the page does not print names.
 * HP is kinOf("stone").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
export function rockBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("stone").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "stone",
    });
  }
  log(g, `${n} rock boarders beam aboard your ship.`);
}

/**
 * Mantis outcasts: "2-3 mantis boarders beam aboard your ship and you fight a Mantis Ship (default rewards)."
 * Call this after startCombat (ctx.fight): that drops enemy crew that were already aboard.
 * INFERRED: the count is an inclusive whole number from 2 to 3, and each boarder lands in a random player room,
 * the same pattern as rockBoarders. INFERRED: the display name is "Mantis" because the page does not print names.
 * HP is kinOf("blade").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
export function mantisBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("blade").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "blade",
    });
  }
  log(g, `${n} mantis boarders beam aboard your ship.`);
}

/**
 * Zoltan border police: "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)."
 * Call this after startCombat (ctx.fight): that drops enemy crew that were already aboard.
 * INFERRED: the count is an inclusive whole number from 3 to 4, and each boarder lands in a random player room,
 * the same pattern as mantisBoarders. INFERRED: the display name is "Zoltan" because the page does not print names.
 * HP is kinOf("spark").hp. No weapon, schematic, augment, crew reward, or scrap.
 */
/**
 * "crew entirely composed of Mantis."
 * Call this after startCombat. The class mix can still roll an Engi; this replaces that crew.
 * INFERRED: only enemy crew aboard the enemy ship change. A Mantis already there keeps the health
 * startCombat gave them. A converted crew member uses kinOf("blade") health. The display name is "Mantis".
 */
export function allMantisCrew(g: Game) {
  const hp = kinOf("blade").hp;
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "enemy") continue;
    if (c.kin === "blade") continue;
    c.kin = "blade";
    c.name = "Mantis";
    c.hp = hp;
    c.maxHp = hp;
  }
}

export function zoltanBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("spark").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "spark",
    });
  }
  log(g, `${n} zoltan boarders beam aboard your ship.`);
}

/**
 * Boarders: Crystal: "2-3 crystal boarders beam aboard your ship."
 * INFERRED: the count is inclusive (between()), and each boarder lands in a random player room.
 * INFERRED: the display name is "Crystal" because the page does not print names. HP is kinOf("shard").hp.
 * Not a crew grant. No ship.
 */
export function crystalBoarders(g: Game, lo: number, hi: number) {
  const n = between(g, [lo, hi]);
  const hp = kinOf("shard").hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room = rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
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
      kin: "shard",
    });
  }
  log(g, `${n} crystal boarders beam aboard your ship.`);
}

function livingSlug(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "gel");
}

function pick<T>(g: Game, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand(g) * items.length))];
}

export const NEVER_RUN: EscapePlan = { mode: "never", seconds: 0, chance: 0, threshold: 0, rolled: false, running: false, pursuit: false };

export const PAGE_CHOICES: Record<string, (g: Game) => void> = {
  // ---- "Engi surrender" (no fight: the ship surrenders on arrival) ----
  // Explain that you're friendly. Two results: "Nothing happens." / "You receive a random amount of scrap with resources."
  "c:engi-surrender:0": (g) => {
    if (rand(g) < 0.5) {
      pageResult(g, "The Engi seem relieved, and eager to get underway. They set off without saying goodbye.");
    } else {
      pageResult(
        g,
        "The Engi are satisfied with your explanation. \"Beneficial. Subject goal: long, long journey. Remains compatible with transfer of goods from Engi.\" They send over the gear willingly, and you feel better for it.",
        rollStandard(g),
      );
    }
  },
  // Accept their offer of surrender. -> "You receive a random amount of scrap with resources."
  "c:engi-surrender:1": (g) => {
    pageResult(g, "The Engi obediently transfer over the goods and get on their way. Money for nothing.", rollStandard(g));
  },

  // ---- "Destroyed cargo ship", Bring it aboard. Four results on the page, no odds (equal, INFERRED). ----
  // "medium scrap with resources"; "low scrap" (Scrap only); "2-4 human boarders" with no ship; the ambush fight.
  "c:destroyed-cargo-ship:0": (g) => {
    const r = pick(g, ["supplies", "goods", "boarders", "ambush"] as const);
    if (r === "supplies") {
      pageResult(g, "They appear to be filled with military supplies! You take everything you can use and jettison the rest.", rollStandard(g, "medium"));
    } else if (r === "goods") {
      const offer: SurrenderOffer = { tier: "low", scrap: 0, eligible: between(g, scrapBand(g, "low")), fuel: 0, missiles: 0, parts: 0 };
      offer.scrap = adjustScrap(g, offer.eligible);
      pageResult(g, "The cargo was primarily consumer goods and clothing, nothing particularly useful. You manage to collect some scrap.", offer);
    } else if (r === "boarders") {
      log(g, "Once you bring the cargo onto your ship, a pirate bursts out of one of the crates saying, \"Ugh... I was getting cramped in there. Oh, yeah! Prepare to die!\" Immediately after this battle-cry your ship is filled with the sound of crates breaking open...");
      humanBoarders(g, 2, 4);
      beginBoarding(g);
    } else {
      // JELLY_PIRATE_WITHBOARDERS: "70% chance for escape attempt at 20-40% hull with 15 seconds countdown timer".
      const escape: EscapePlan = { ...NEVER_RUN, mode: "hull", seconds: HULL_RUN_SECONDS, chance: 70, threshold: 20 + rand(g) * 20 };
      pageFight(
        g,
        "You bring the cargo aboard. Before you have a chance to open them a pirate ship appears out of hiding and charges. At the same time, the crates fly open. Intruders aboard the ship!",
        "Pirate ship",
        "destroyed-cargo-ship",
        escape,
      );
      humanBoarders(g, 2, 4);
    }
  },

  // ---- "Settlement mercenary work", Listen to their offer. Two offers on the page. ----
  "c:settlement-mercenary-work:0": (g) => {
    if (rand(g) < 0.5) {
      pageCard(
        g,
        "\"Some of our friends have taken to piracy in the recent chaos of the war. We'd like you to \"convince\" them of their poor decision by severely damaging the ship. We'll pay you well as long as you don't kill them all.\"",
        [
          { id: "s:settlement-mercenary-work:accept", label: "Accept." },
          { id: "s:settlement-mercenary-work:decline", label: "Decline." },
        ],
      );
    } else {
      // The space dock offer: "Agree to rescue the store." adds a quest marker (@agent:quests, wiki/quests.ts).
      pageCard(
        g,
        "\"A space dock is under assault from the Rebels. Although the dock is... technically... illegal within their laws, it's very important for our trade. We'll pay you in fuel and scrap if you promise to save them.\"",
        [
          { id: "s:settlement-mercenary-work:dock", label: "Agree to rescue the store." },
          { id: "s:settlement-mercenary-work:nodock", label: "Decline." },
        ],
      );
    }
  },
  // Accept. -> "Fight a Pirate ship." Trivia: "The 'SQUAT_PIRATE_MERCENARY' ship from the settlement never runs away."
  "s:settlement-mercenary-work:accept": (g) => {
    pageFight(
      g,
      "\"Just be sure not to blow them up!\" they say nervously as they direct you to a nearby moon. You find the pirate ship docked there. They immediately respond to your appearance with, \"Your money or your life!\" They must be new to this.",
      "Pirate ship",
      "settlement-mercenary-work",
      { ...NEVER_RUN },
    );
  },
  "s:settlement-mercenary-work:decline": (g) => {
    pageResult(g, "\"Fine. I don't know what we'll do about them though...\" You prepare to jump away from this sector.");
  },
  // "A quest marker is added to your map." @agent:quests: the space dock rescue (wiki/quests.ts "store-rescue").
  "s:settlement-mercenary-work:dock": (g) => {
    pageResult(g, `They transmit the space dock's coordinates.\n\n${addQuest(g, "store-rescue")}`);
  },
  "s:settlement-mercenary-work:nodock": (g) => {
    pageResult(g, "They regretfully accept your decision.");
  },

  // ---- "The Black Raven", No. -> the challenge. Both answers fight the Black Raven. ----
  // Trivia: "always a Slug Assault class": asked for by class (enemy-gen.ts classId), as a pirate (Captain Nights).
  "c:the-black-raven:0": (g) => {
    pageCard(g, "\"Well I have heard of you and I must see if you are as dangerousss as they say. I challenge you!\"", [
      { id: "s:the-black-raven:accept", label: "Accept his challenge." },
      { id: "s:the-black-raven:decline", label: "Decline." },
      // {{Blue Option|Slugman Crew|Engage in a duel of the mind.}}
      { id: "s:the-black-raven:duel", label: "Engage in a duel of the mind." },
    ]);
  },
  // Two results, no odds. INFERRED: equal odds. The weapon is unnamed and is not granted. High scrap is.
  // The stunned collapse prints no duration, so no stun is applied.
  "s:the-black-raven:duel": (g) => {
    if (!livingSlug(g)) return;
    if (rand(g) < 0.5) {
      pageFight(g, "Nights responds, \"Hah! It'll take more than that to defeat me! Let the real battle begin!\"", "Slug Assault pirate ship", "the-black-raven");
      slugBoarders(g, 1, 2);
    } else {
      const eligible = between(g, scrapBand(g, "high"));
      pageResult(
        g,
        "His face contorted with pain, Nights concedes his defeat: \"If this is the caliber of subordinatesss you keep, there iss no way we can defeat you. Take thisss and let us leave in shame.\"",
        { tier: "high", scrap: adjustScrap(g, eligible), eligible, fuel: 0, missiles: 0, parts: 0 },
      );
    }
  },
  // INVENTED: the log line (the page goes straight to the fight).
  "s:the-black-raven:accept": (g) => {
    pageFight(g, "Captain Nights accepts. The Black Raven moves in.", "Slug Assault pirate ship", "the-black-raven");
  },
  "s:the-black-raven:decline": (g) => {
    pageFight(g, "\"I sssee... However you have no choice in the matter!\" They move in to attack.", "Slug Assault pirate ship", "the-black-raven");
  },

  // ---- "Zoltan ship asks to dock", Dock with them. Two results on the page. ----
  "c:zoltan-ship-asks-to-dock:0": (g) => {
    if (rand(g) < 0.5) {
      // "Fight a Zoltan ship." "never tries to escape" (Zoltan ships never run in wiki/escape.ts already).
      pageFight(g, "You allow them to approach, but are caught unaware when they open fire!", "Zoltan ship", "zoltan-ship-asks-to-dock", { ...NEVER_RUN });
    } else {
      // "You receive medium (fuel: 2-4 ; missiles: 2-4 ; drone parts: 1) resources with some scrap." (Rewards#Stuff)
      pageResult(
        g,
        "We have been studying the relationships between the species and have determined that the 'Federation' still has potential to be a net positive for the galaxy. Please accept this gift to aid your journey.",
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
