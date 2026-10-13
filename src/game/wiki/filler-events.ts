import { tx } from "../../i18n/index.ts";
import { WEAPONS, XP_NEED, upgradeCost } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { kinOf } from "../extras/kin.ts";
import { beginBoarding, hurtSystem, log, rand, restorePlayerSensors, shutPlayerSensors, startCombat } from "../sim.ts";
import type { Beacon, Crew, Game, GameEvent, SkillName, SysId } from "../types.ts";
import type { CitedEventDef } from "./cited-events-surrender.ts";
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
import { rockSlugPay, slugCaptainGrateful } from "./quests.ts";
import { keepNewHire, receiveAugment } from "./make-room.ts";
import { grantRandomItem } from "./bonus-item.ts";

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
 * A row reuses the cited table card when one exists (looked up by dest or alias). FILLER_PAGES below are the list
 * pages no cited table has, in the cited-events-surrender.ts table format. They are not stamped by sector (no import
 * into cited-events.ts); their choices run in FILLER_CHOICES because most results are random (equal odds, INFERRED,
 * with {{DuplicateEvent|N}} counted N times) or open a follow-up card. Blue options, crew skills and map reveals are
 * not granted, as in the other tables. An unnamed weapon, augmentation or drone schematic is a random one
 * (grantRandomItem, per the Rewards page). A result that prints fires or a breach applies that hazard.
 */

export type FillerRow = { dest: string; unique: boolean };

/** Category:Filler Events ("OVERRIDE_NEUTRAL"): every page with alsooccur=filler or exitandfiller, and its unique=. */
export const FILLER: FillerRow[] = [
  { dest: "Abandoned station", unique: true },
  { dest: "Auto-ship attacking outpost", unique: true },
  { dest: "Auto-ship near storage station", unique: true },
  { dest: "Battlefield wreckage", unique: false },
  { dest: "Deactivated Auto-ship", unique: true },
  { dest: "Intelligent ponies", unique: true },
  { dest: "Large asteroid field", unique: true },
  { dest: "Pirate briber", unique: true },
  { dest: "Pirate ship attacking civilian", unique: false },
  { dest: "Pirate ship selling drones", unique: true },
  { dest: "Plagued station", unique: true },
  { dest: "Rebel checkpoint", unique: false },
  { dest: "Rebel fight chance", unique: false },
  { dest: "Rebel ship supplying civilians", unique: false },
  { dest: "Rebel transport ship", unique: true },
  { dest: "Refueling platform", unique: true },
  { dest: "Refugee", unique: false },
  { dest: "Slaver (friendly)", unique: true },
  { dest: "Terraforming scan", unique: true },
  { dest: "The mercenary", unique: false },
];

/** Template:EventList NEBULA (the "nebula filler" rows), Event name (wiki) and Unique? columns. */
export const NEBULA: FillerRow[] = [
  { dest: "Auto-ship fight in nebula", unique: false },
  { dest: "Auto-ship near storage station in nebula", unique: true },
  { dest: "Auto-ship warning in nebula", unique: true },
  { dest: "Boarders: Humans in nebula", unique: true },
  { dest: "Empty nebula beacon", unique: false },
  { dest: "Nebula lost ship", unique: true },
  { dest: "Mantis fight in nebula", unique: false },
  { dest: "Pirate smuggler", unique: false },
  { dest: "Rebel fight in nebula", unique: false },
  { dest: "Trade resources in nebula", unique: true },
  { dest: "Pirate ship selling weapon", unique: true },
  { dest: "Auto-ship fight in plasma storm", unique: true },
  { dest: "Boarders: Humans in plasma storm", unique: true },
  { dest: "Plasma storm incapacitated ships", unique: true },
  { dest: "Rebel fight in plasma storm", unique: true },
];

/** Template:EventList DISTRESS BEACON, Event name (wiki) and Unique? columns. */
export const DISTRESS: FillerRow[] = [
  { dest: "Asteroid belt distress", unique: true },
  { dest: "Giant alien spiders", unique: true },
  { dest: "Malfunctioning defense system", unique: true },
  { dest: "Unknown disease on mining colony", unique: true },
  { dest: "Fire on research station", unique: true },
  { dest: "Crushed pirate", unique: true },
  { dest: "Escort civilians FTL haywire", unique: true },
  { dest: "Friendly ship out of fuel", unique: false },
  { dest: "Pirate ship attacking civilian distress", unique: false },
  { dest: "Refugee distress", unique: false },
  { dest: "Refugee comms down", unique: false },
  { dest: "Single life form on moon", unique: true },
  { dest: "Pirate ship distress trap", unique: true },
];

/** Template:EventList ITEMS (OVERRIDE_ITEMS adds Large trade station), Event name (wiki) and Unique? columns. */
export const ITEMS: FillerRow[] = [
  { dest: "Free drone schematic", unique: false },
  { dest: "Free weapon", unique: false },
  { dest: "Free scrap with resources", unique: false },
  { dest: "Trade fuel for drone parts", unique: false },
  { dest: "Asteroid mining colony", unique: true },
  { dest: "Refueling station", unique: true },
  { dest: "Repair station", unique: true },
  { dest: "Sell drone parts for scrap", unique: true },
  { dest: "Sell missiles for scrap", unique: true },
  { dest: "Crew hiring station", unique: true },
  { dest: "Trade resources", unique: false },
  { dest: "Trade scrap for upgrades", unique: true },
  { dest: "Improve reactor for supplies", unique: true },
];

/**
 * Exit beacons (Template:EventList EXIT LIST): "This event list is actually comprised of 2 event lists - NEUTRAL_EXIT and
 * ITEMS (OVERRIDE_NEUTRAL_EXIT and OVERRIDE_ITEMS - when Advanced Edition Content is enabled)". This game is AE.
 * Rows are Template:EventList OVERRIDE NEUTRAL EXIT and Template:EventList OVERRIDE ITEMS, Event name (wiki) and Unique?.
 */
export const EXIT_NEUTRAL: FillerRow[] = [
  { dest: "Large asteroid field", unique: true },
  { dest: "Auto-ship near storage station", unique: true },
  { dest: "Auto-ship attacking outpost", unique: true },
  { dest: "Plagued station", unique: true },
  { dest: "Intelligent ponies", unique: true },
  { dest: "Abandoned station", unique: true },
  { dest: "Slaver (friendly)", unique: true },
  { dest: "Refueling platform", unique: true },
  { dest: "Pirate briber", unique: true },
  { dest: "Pirate ship attacking civilian", unique: false },
  { dest: "Pirate ship selling drones", unique: true },
  { dest: "Rebel checkpoint", unique: false },
  { dest: "Rebel ship supplying civilians", unique: false },
  { dest: "Rebel transport ship", unique: true },
  { dest: "Refugee", unique: false },
  { dest: "Rebel fight chance", unique: false },
  { dest: "Trade scrap for upgrades", unique: true },
  { dest: "Battlefield wreckage", unique: false },
];

export const EXIT_ITEMS: FillerRow[] = [
  { dest: "Free drone schematic", unique: false },
  { dest: "Free weapon", unique: false },
  { dest: "Free scrap with resources", unique: false },
  { dest: "Trade fuel for drone parts", unique: false },
  { dest: "Asteroid mining colony", unique: true },
  { dest: "Refueling station", unique: true },
  { dest: "Repair station", unique: true },
  { dest: "Sell drone parts for scrap", unique: true },
  { dest: "Sell missiles for scrap", unique: true },
  { dest: "Large trade station", unique: true },
  { dest: "Crew hiring station", unique: true },
  { dest: "Trade resources", unique: false },
  { dest: "Trade scrap for upgrades", unique: true },
  { dest: "Improve reactor for supplies", unique: true },
];

export type FillerList = "filler" | "nebula" | "distress" | "items" | "exitNeutral" | "exitItems";
const LISTS: Record<FillerList, FillerRow[]> = {
  filler: FILLER,
  nebula: NEBULA,
  distress: DISTRESS,
  items: ITEMS,
  exitNeutral: EXIT_NEUTRAL,
  exitItems: EXIT_ITEMS,
};

/** "Empty beacon (...)" pages: {{Locations}} sectors and the intro texts. Every one ends "Nothing happens." */
type EmptyPage = { dest: string; sectors: string[]; texts: string[] };

export const EMPTY_PAGES: EmptyPage[] = [
  {
    dest: "Empty beacon (Civilian)",
    sectors: ["Civilian Sector"],
    texts: [
      tx("wiki.filler-events.your-jump-leads-you-to-nothing"),
      tx("wiki.filler-events.you-jump-into-an-unremarkable-system"),
      tx("wiki.filler-events.your-scans-reveal-a-mining-base"),
      tx("wiki.filler-events.your-scans-reveal-an-ore-refinery"),
      tx("wiki.filler-events.you-discover-a-nearby-planet-speckled"),
      tx("wiki.filler-events.this-beacon-has-been-built-for"),
      tx("wiki.filler-events.the-nearby-planet-shows-sign-of"),
      tx("wiki.filler-events.your-jump-leads-to-a-completely"),
      tx("wiki.filler-events.your-jump-leads-to-a-remarkable"),
    ],
  },
  {
    dest: "Empty beacon (Crystal)",
    sectors: ["Hidden Crystal Worlds"],
    texts: [
      tx("wiki.filler-events.as-soon-as-you-arrive-all"),
      tx("wiki.filler-events.no-ships-are-in-range-so"),
      tx("wiki.filler-events.there-appears-to-be-no-one"),
      tx("wiki.filler-events.you-arrive-near-a-civilian-settlement"),
      tx("wiki.filler-events.a-few-merchant-ships-pass-nearby"),
      tx("wiki.filler-events.a-number-of-civilian-ships-seem"),
    ],
  },
  {
    dest: "Empty beacon (Engi)",
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    texts: [
      tx("wiki.filler-events.the-complex-arrangements-of-ship-hulls"),
      tx("wiki.filler-events.you-arrive-at-a-green-planet"),
      tx("wiki.filler-events.you-have-arrived-near-an-engi"),
      tx("wiki.filler-events.even-though-each-individual-engi-is"),
      tx("wiki.filler-events.you-see-a-number-of-engi"),
      tx("wiki.filler-events.this-system-appears-quite-peaceful-you"),
      tx("wiki.filler-events.there-are-a-number-of-merchant"),
      tx("wiki.filler-events.you-see-a-small-rebel-carrier"),
      tx("wiki.filler-events.the-engi-seem-to-have-avoided"),
      tx("wiki.filler-events.a-cluster-of-engi-satellites-in"),
    ],
  },
  {
    dest: "Empty beacon (Lanius)",
    sectors: ["Abandoned Sector"],
    texts: [
      tx("wiki.filler-events.the-charts-indicate-this-was-the"),
      tx("wiki.filler-events.scans-show-no-signs-of-any"),
      tx("wiki.filler-events.a-few-refugee-ships-are-preparing"),
      tx("wiki.filler-events.you-pass-a-civilian-ship-that"),
      tx("wiki.filler-events.you-question-a-local-settlement-and"),
      tx("wiki.filler-events.you-come-across-a-human-civilian"),
    ],
  },
  {
    dest: "Empty beacon (Last Stand)",
    sectors: ["The Last Stand"],
    texts: [
      tx("wiki.filler-events.you-arrive-to-see-a-number"),
      tx("wiki.filler-events.there-are-a-few-federation-fleets"),
      tx("wiki.filler-events.a-few-scattered-heavy-vessels-are"),
      tx("wiki.filler-events.a-large-host-of-federation-heavy"),
      tx("wiki.filler-events.a-battalion-of-federation-fighters-are"),
    ],
  },
  {
    dest: "Empty beacon (Mantis)",
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    texts: [
      tx("wiki.filler-events.at-this-point-you-almost-expect"),
      tx("wiki.filler-events.the-only-thing-this-beacon-offers"),
      tx("wiki.filler-events.a-nearby-mantis-mining-operation-is"),
      tx("wiki.filler-events.there-aren-t-so-many-parts"),
      tx("wiki.filler-events.there-s-nothing-here-but-space"),
      tx("wiki.filler-events.you-fancy-you-see-something-moving"),
    ],
  },
  {
    dest: "Empty beacon (Pirate)",
    sectors: ["Pirate Controlled Sector"],
    texts: [
      tx("wiki.filler-events.as-soon-as-you-arrive-a"),
      tx("wiki.filler-events.a-small-pirate-ship-messages-you"),
      tx("wiki.filler-events.the-only-thing-within-scanning-range"),
      tx("wiki.filler-events.you-arrive-to-have-a-small"),
    ],
  },
  {
    dest: "Empty beacon (Rebel)",
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    texts: [
      tx("wiki.filler-events.you-enter-a-system-bustling-with"),
      tx("wiki.filler-events.you-arrive-near-a-small-rebel"),
      tx("wiki.filler-events.there-is-not-much-of-interest"),
      tx("wiki.filler-events.there-are-no-other-ships-near"),
      tx("wiki.filler-events.there-is-a-small-planet-nearby"),
    ],
  },
  {
    dest: "Empty beacon (Rock)",
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    texts: [
      tx("wiki.filler-events.you-receive-a-message-meant-to"),
      tx("wiki.filler-events.no-one-bothers-your-ship-as"),
      tx("wiki.filler-events.you-arrive-and-detect-signs-of"),
      tx("wiki.filler-events.there-s-not-much-at-this"),
      tx("wiki.filler-events.a-few-freighters-pass-by-but"),
      tx("wiki.filler-events.you-see-a-small-trading-post"),
      tx("wiki.filler-events.you-see-a-zoltan-merchant-and"),
    ],
  },
  {
    dest: "Empty beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      tx("wiki.filler-events.you-arrive-at-the-beacon-and"),
      tx("wiki.filler-events.this-beacon-marks-a-small-gap"),
      tx("wiki.filler-events.you-are-relieved-to-see-your"),
      tx("wiki.filler-events.the-slugs-rely-heavily-on-their"),
      tx("wiki.filler-events.you-arrive-in-an-area-clear"),
    ],
  },
  {
    dest: "Empty beacon (Zoltan)",
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      tx("wiki.filler-events.there-are-some-mineral-rich-asteroids"),
      tx("wiki.filler-events.you-have-to-admit-zoltan-space"),
      tx("wiki.filler-events.a-light-asteroid-field-is-entering"),
      tx("wiki.filler-events.you-stumble-upon-some-zoltan-military"),
      tx("wiki.filler-events.you-don-t-have-time-to"),
      tx("wiki.filler-events.a-zoltan-shipyard-is-stationed-at"),
      tx("wiki.filler-events.a-message-broadcast-from-a-nearby"),
    ],
  },
  {
    // Template:EventList NEBULA row NEBULA_EMPTY; also an "empty nebula beacons" slot outside the Slug sectors.
    dest: "Empty nebula beacon",
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      tx("wiki.filler-events.you-can-t-see-anything-through"),
      tx("wiki.filler-events.without-active-sensors-you-have-no"),
      tx("wiki.filler-events.as-you-wait-for-the-ftl"),
      tx("wiki.filler-events.you-feel-naked-without-functioning-sensors"),
      tx("wiki.filler-events.your-crew-are-constantly-looking-out"),
      tx("wiki.filler-events.you-nervously-glance-out-the-windows"),
      tx("wiki.filler-events.you-cycle-through-wide-band-comm"),
      tx("wiki.filler-events.with-the-sensors-down-you-spend"),
      tx("wiki.filler-events.there-s-nothing-here-save-for"),
    ],
  },
  {
    dest: "Empty nebula beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      tx("wiki.filler-events.when-it-comes-to-slugs-no"),
      tx("wiki.filler-events.it-s-not-unusual-to-feel"),
      tx("wiki.filler-events.either-this-part-of-slug-space"),
      tx("wiki.filler-events.this-area-of-the-nebula-seems"),
      tx("wiki.filler-events.you-explore-around-the-beacon-and"),
      tx("wiki.filler-events.there-are-a-number-of-small"),
    ],
  },
];

/** The empty-beacon page for a sector. INFERRED: Civilian (Starting) Sector and any unlisted sector use the Civilian page. */
export function emptyPageFor(sectorName: string, nebula = false): EmptyPage {
  const slug = sectorName.startsWith("Slug");
  if (nebula) return EMPTY_PAGES.find((p) => p.dest === (slug ? "Empty nebula beacon (Slug)" : "Empty nebula beacon"))!;
  return EMPTY_PAGES.find((p) => !p.dest.startsWith("Empty nebula") && p.sectors.includes(sectorName)) ?? EMPTY_PAGES[0];
}

// ---- Cards for list pages no cited table has ------------------------------------------------------------------

export const FILLER_PAGES: CitedEventDef[] = [
  // ASTEROID_EXPLORE. Explore: fuel "high|3-6"; "medium|2-4 missiles" missiles and scrap; "medium|1 drone part"; a
  // Pirate ship in an asteroid field; "5 hull damage"; nothing. Scrap Recovery Arm mines high scrap.
  {
    dest: "Large asteroid field",
    slug: "large-asteroid-field",
    flag: "cited:large-asteroid-field",
    aliases: ["Large asteroid field", "Large Asteroid Field"],
    sectors: ["Abandoned Sector", "Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Pirate Controlled Sector", "Slug Controlled Nebula", "Slug Home Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.scans-reveal-a-large-asteroid-field"),
    choices: [
      {
        id: "c:large-asteroid-field:0",
        label: tx("wiki.filler-events.explore-the-asteroid-field"),
        // Six results: FILLER_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
      { id: "c:large-asteroid-field:1", label: tx("wiki.filler-events.too-dangerous-we-ll-just-wait"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Scrap Recovery Arm|Attempt to mine the asteroids.}} High scrap only.
      { id: "c:large-asteroid-field:2", label: tx("wiki.filler-events.attempt-to-mine-the-asteroids"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap") }] },
    ],
  },
  // WRECKAGE_EVENT. Investigate: nothing ({{DuplicateEvent|4}}), nothing (Slug ship), medium resources with some scrap,
  // a Mantis ship, a Rebel ship, a Zoltan ship. Improved Sensors: that same medium salvage, and no fight.
  // Advanced Sensors can grant an unnamed weapon and prints no odds. Left unwired.
  {
    dest: "Battlefield wreckage",
    slug: "battlefield-wreckage",
    flag: "cited:battlefield-wreckage",
    aliases: ["Battlefield wreckage", "Battlefield Wreckage"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-have-jumped-into-the-aftermath"),
    choices: [
      { id: "c:battlefield-wreckage:0", label: tx("wiki.filler-events.investigate-the-battlefield"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:battlefield-wreckage:1", label: tx("wiki.filler-events.ignore-the-wreckage-and-continue-on"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}
      { id: "c:battlefield-wreckage:2", label: tx("wiki.filler-events.use-your-sensors-to-scan-the"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
    ],
  },
  // DONOR_PLAGUE. Board: low scrap; a Human crewmember with low scrap; low scrap then "You lose a crewmember".
  // The sick card's Continue still loses that crewmember. Clone Bay has [no effect].
  // Improved Medbay level=2+ is "Try to cure the disease." Scrap: "a random amount of scrap".
  {
    dest: "Plagued station",
    slug: "plagued-station",
    flag: "cited:plagued-station",
    aliases: ["Plagued station", "Plagued Station"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-arrive-near-a-damaged-and"),
    choices: [
      { id: "c:plagued-station:0", label: tx("wiki.filler-events.board-the-station-and-look-for"), fx: [{ k: "tier", tier: "low" }] },
      { id: "c:plagued-station:1", label: tx("wiki.filler-events.scrap-some-of-the-debris"), fx: [{ k: "note", text: tx("wiki.filler-events.a-random-amount-of-scrap") }] },
    ],
  },
  // ROGUE_REBEL. Go looking: a Rebel ship ({{DuplicateEvent|2}}); pursuit doubled for 1 jump and a Rebel ship; nothing.
  {
    dest: "Rebel fight chance",
    slug: "rebel-fight-chance",
    flag: "cited:rebel-fight-chance",
    aliases: ["Rebel fight chance", "Rebel Fight Chance"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-arrive-at-a-beacon-located"),
    choices: [
      { id: "c:rebel-fight-chance:0", label: tx("wiki.filler-events.go-looking-for-the-rebel-ship"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:1", label: tx("wiki.filler-events.no-time-to-search-you-prepare"), fx: [{ k: "nothing" }] },
      { id: "c:rebel-fight-chance:2", label: tx("wiki.filler-events.perform-a-scan-of-the-area"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:3", label: tx("wiki.filler-events.pinpoint-the-rebel-s-location"), fx: [{ k: "fight", tier: "Rebel ship" }] },
    ],
  },
  // REFUGEE_NO_DISTRESS, Template:Drifting Refugee Ship (type=main). Hail: a trade ({{DuplicateEvent|4}}); a Pirate
  // ambush; a Zoltan ship; a pirate ship using them as bait; a Slug ship.
  {
    dest: "Refugee",
    slug: "refugee",
    flag: "cited:refugee",
    aliases: ["Refugee"],
    sectors: ["Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.your-sensors-have-picked-up-a"),
    choices: [
      { id: "c:refugee:0", label: tx("wiki.filler-events.hail-them"), fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee:1", label: tx("wiki.filler-events.ignore-the-refugees"), fx: [{ k: "nothing" }] },
    ],
  },
  // DONOR_PONY. Investigate opens three choices: communicate (Engi crewmember and low scrap with resources, or
  // nothing), sell (lose a crewmember, or nothing), leave.
  {
    dest: "Intelligent ponies",
    slug: "intelligent-ponies",
    flag: "cited:intelligent-ponies",
    aliases: ["Intelligent ponies", "Intelligent Ponies"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.scanners-are-showing-intelligent-life-forms"),
    choices: [
      { id: "c:intelligent-ponies:0", label: tx("wiki.filler-events.investigate"), fx: [{ k: "note", text: tx("wiki.filler-events.three-follow-up-choices") }] },
      { id: "c:intelligent-ponies:1", label: tx("wiki.filler-events.ignore-it"), fx: [{ k: "nothing" }] },
    ],
  },
  // EMPTY_STATION2. Examine: low scrap ({{DuplicateEvent|2}}); 2 boarders and a Pirate ship; 2-4 boarders and a
  // planet-side Anti-Ship Battery with no ship; a cloning bay (scrap the machinery: low scrap); an empty shell.
  // Unnamed boarders are INFERRED human. The Clonebay DNA blue option is not offered on this copy.
  {
    dest: "Abandoned station",
    slug: "abandoned-station",
    flag: "cited:abandoned-station",
    aliases: ["Abandoned station", "Abandoned Station"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-find-a-small-space-station"),
    choices: [
      { id: "c:abandoned-station:0", label: tx("wiki.filler-events.move-in-to-examine-the-station"), fx: [{ k: "tier", tier: "low" }] },
      { id: "c:abandoned-station:1", label: tx("wiki.filler-events.stay-near-the-beacon"), fx: [{ k: "nothing" }] },
    ],
  },
  // TERRAFORMING_SCAN. Scan: nothing, or "Successful Scan" (oxygen upgraded; a Pirate ship; the mold, with a 15-25 scrap
  // bribe either way).
  {
    dest: "Terraforming scan",
    slug: "terraforming-scan",
    flag: "cited:terraforming-scan",
    aliases: ["Terraforming scan", "Terraforming Scan"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.filler-events.you-receive-a-hail-from-a"),
    choices: [
      { id: "c:terraforming-scan:0", label: tx("wiki.filler-events.you-offer-your-assistance"), fx: [{ k: "note", text: tx("wiki.filler-events.they-ask-for-a-scan") }] },
      { id: "c:terraforming-scan:1", label: tx("wiki.filler-events.you-do-not-have-time"), fx: [{ k: "nothing" }] },
    ],
  },
  // NEBULA_EMPTY. "Nothing happens." The intro is one of the page's nine texts (EMPTY_PAGES), drawn on arrival.
  {
    dest: "Empty nebula beacon",
    slug: "empty-nebula-beacon",
    flag: "cited:empty-nebula-beacon",
    aliases: ["Empty nebula beacon", "Empty Nebula Beacon", "Nebula empty beacon"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.there-s-nothing-here-save-for"),
    choices: [{ id: "c:empty-nebula-beacon:0", label: tx("wiki.filler-events.continue"), fx: [{ k: "nothing" }] }],
  },
  // NEBULA_LOST_SHIP. Follow: a crewmember; a Rebel ship; nothing.
  {
    dest: "Nebula lost ship",
    slug: "nebula-lost-ship",
    flag: "cited:nebula-lost-ship",
    aliases: ["Nebula lost ship", "Nebula Lost Ship"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.a-heavily-damaged-federation-ship-is"),
    choices: [
      { id: "c:nebula-lost-ship:0", label: tx("wiki.filler-events.attempt-to-follow-and-help-them"), fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:nebula-lost-ship:1", label: tx("wiki.filler-events.keep-your-position-they-can-handle"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Teleporter}}. Crewmember and medium scrap. The button stays visible.
      { id: "c:nebula-lost-ship:2", label: tx("wiki.filler-events.lock-onto-their-life-signs"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
      { id: "c:nebula-lost-ship:3", label: tx("wiki.filler-events.pump-extra-power-into-your-sensors"), fx: [{ k: "nothing" }] },
    ],
  },
  // STORM_ITEMS. Search: "4 hull damage" and high resources with some scrap; a crewmember and low scrap with resources;
  // lose a crewmember and low scrap with resources; a drone schematic with medium scrap; a weapon with medium scrap.
  {
    dest: "Plasma storm incapacitated ships",
    slug: "plasma-storm-incapacitated-ships",
    flag: "cited:plasma-storm-incapacitated-ships",
    aliases: ["Plasma storm incapacitated ships", "Plasma Storm Incapacitated Ships"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.you-jump-into-the-middle-of"),
    choices: [
      { id: "c:plasma-storm-incapacitated-ships:0", label: tx("wiki.filler-events.manually-search-the-wreckage-for-survivors"), fx: [{ k: "hull", n: -4 }] },
      { id: "c:plasma-storm-incapacitated-ships:1", label: tx("wiki.filler-events.avoid-the-risk-and-wait-to"), fx: [{ k: "nothing" }] },
      // {{Blue Option|Piloting|level=2+}}. Four results, no odds. INFERRED: equal. The weapon pays low scrap.
      { id: "c:plasma-storm-incapacitated-ships:2", label: tx("wiki.filler-events.have-your-pilot-carefully-explore"), fx: [{ k: "nothing" }] },
    ],
  },
  // FRIENDLY_BEACON. Give "2-4" fuel: high scrap ({{DuplicateEvent|2}}); a weapon; the sector map (not wired); the
  // reactor upgraded.
  {
    dest: "Friendly ship out of fuel",
    slug: "friendly-ship-out-of-fuel",
    flag: "cited:friendly-ship-out-of-fuel",
    aliases: ["Friendly ship out of fuel", "Friendly Ship Out of Fuel"],
    sectors: ["Abandoned Sector", "Civilian Sector", "Engi Controlled Sector", "Engi Homeworlds", "Mantis Controlled Sector", "Mantis Homeworlds", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Rock Controlled Sector", "Rock Homeworlds", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.filler-events.greetings-it-is-so-good-to"),
    choices: [
      { id: "c:friendly-ship-out-of-fuel:0", label: tx("wiki.filler-events.give-them-the-fuel"), fx: [{ k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 }, { k: "tier", tier: "high" }] },
      { id: "c:friendly-ship-out-of-fuel:1", label: tx("wiki.filler-events.apologize-wish-them-luck-and-continue"), fx: [{ k: "nothing" }] },
    ],
  },
  // REFUGEE_DISTRESS, Template:Drifting Refugee Ship (introtext=distress, type=main). Same results as Refugee.
  {
    dest: "Refugee distress",
    slug: "refugee-distress",
    flag: "cited:refugee-distress",
    aliases: ["Refugee distress", "Refugee Distress"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: tx("wiki.filler-events.you-have-encountered-a-refugee-ship"),
    choices: [
      { id: "c:refugee-distress:0", label: tx("wiki.filler-events.hail-them"), fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee-distress:1", label: tx("wiki.filler-events.ignore-the-refugees"), fx: [{ k: "nothing" }] },
    ],
  },
  // REFUGEE_GHOST. Board, five results, no odds: lose a crewmember; a crewmember; "medium|2-4 missiles" missiles
  // and scrap; "2-4 human boarders" with no ship; nothing.
  {
    dest: "Refugee comms down",
    slug: "refugee-comms-down",
    flag: "cited:refugee-comms-down",
    aliases: ["Refugee comms down", "Refugee Comms Down"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: tx("wiki.filler-events.you-have-encountered-a-refugee-ship-2"),
    choices: [
      { id: "c:refugee-comms-down:0", label: tx("wiki.filler-events.prepare-to-board-and-investigate"), fx: [{ k: "res", id: "missiles", sign: 1, lo: 2, hi: 4 }, { k: "tier", tier: "medium" }] },
      { id: "c:refugee-comms-down:1", label: tx("wiki.filler-events.ignore-the-ship"), fx: [{ k: "nothing" }] },
    ],
  },
  // TRADER_UPGRADES. Inquire offers one of Oxygen, Piloting, Door System, Sensors, or the reactor.
  // alsooccur=exit stays with the unwired exit list. The items row is Template:EventList ITEMS.
  {
    dest: "Trade scrap for upgrades",
    slug: "trade-scrap-for-upgrades",
    flag: "cited:trade-scrap-for-upgrades",
    aliases: ["Trade scrap for upgrades"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-pick-up-an-automated-message"),
    choices: [
      { id: "c:trade-scrap-for-upgrades:0", label: tx("wiki.filler-events.inquire-about-their-specialty"), fx: [{ k: "note", text: tx("wiki.filler-events.one-printed-upgrade-offer") }] },
    ],
  },
  // REFUEL_STATION. Each buy is a fixed scrap cost for a fixed fuel amount. Ignore does nothing.
  {
    dest: "Refueling station",
    slug: "refueling-station",
    flag: "cited:refueling-station",
    aliases: ["Refueling station"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Hidden Crystal Worlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.filler-events.a-ship-re-fueling-station-is"),
    choices: [
      { id: "c:refueling-station:0", label: tx("wiki.filler-events.buy-6-fuel-for-12-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 12, hi: 12 }, { k: "res", id: "fuel", sign: 1, lo: 6, hi: 6 }] },
      { id: "c:refueling-station:1", label: tx("wiki.filler-events.buy-3-fuel-for-6-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 6, hi: 6 }, { k: "res", id: "fuel", sign: 1, lo: 3, hi: 3 }] },
      { id: "c:refueling-station:2", label: tx("wiki.filler-events.buy-1-fuel-for-2-scrap"), fx: [{ k: "res", id: "scrap", sign: -1, lo: 2, hi: 2 }, { k: "res", id: "fuel", sign: 1, lo: 1, hi: 1 }] },
      { id: "c:refueling-station:3", label: tx("wiki.filler-events.ignore-the-station"), fx: [{ k: "nothing" }] },
    ],
  },
  // HELP_MINERS. Five missiles: 10 hull, a reactor step, or 15-25 scrap. No odds. INFERRED: equal.
  // Fifteen missiles: 15 hull and a reactor step, an unnamed augment, or 30-40 scrap and 5 hull.
  // INFERRED: those three are equal. The unnamed augment is a random one (Rewards, "Augment").
  // The reactor step size is not printed. INFERRED: one bar, and not past the reactor maximum.
  // A missile weapon's launch offer does nothing and returns the non-blue choices.
  // Hull Missile is not a missile weapon for events.
  {
    dest: "Asteroid mining colony",
    slug: "asteroid-mining-colony",
    flag: "cited:asteroid-mining-colony",
    aliases: ["Asteroid mining colony"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-come-across-an-asteroid-mining"),
    choices: [
      { id: "c:asteroid-mining-colony:0", label: tx("wiki.filler-events.offer-to-solve-their-problem-by"), fx: [{ k: "nothing" }] },
      { id: "c:asteroid-mining-colony:1", label: tx("wiki.filler-events.give-them-the-requested-5-missiles"), fx: [{ k: "res", id: "missiles", sign: -1, lo: 5, hi: 5 }] },
      { id: "c:asteroid-mining-colony:2", label: tx("wiki.filler-events.give-them-15-missiles"), fx: [{ k: "res", id: "missiles", sign: -1, lo: 15, hi: 15 }] },
      { id: "c:asteroid-mining-colony:3", label: tx("wiki.filler-events.decline"), fx: [{ k: "nothing" }] },
    ],
  },
  // TRADER_UPGRADES_EXCHANGE. One of three supply bundles, shown before the choice. No odds. INFERRED: equal.
  // Each band is inclusive. A maxed reactor still takes the supplies and gains no bar.
  // The reactor step size is not printed. INFERRED: one bar, and not past 25.
  {
    dest: "Improve reactor for supplies",
    slug: "improve-reactor-for-supplies",
    flag: "cited:improve-reactor-for-supplies",
    aliases: ["Improve reactor for supplies"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-receive-a-message-from-a"),
    choices: [
      { id: "c:improve-reactor-for-supplies:0", label: tx("wiki.filler-events.agree-to-the-trade"), fx: [{ k: "note", text: tx("wiki.filler-events.one-printed-supply-bundle") }] },
      { id: "c:improve-reactor-for-supplies:1", label: tx("wiki.filler-events.respectfully-decline"), fx: [{ k: "nothing" }] },
    ],
  },
  // DISTRESS_INFESTATION. Send the crew: lose a crewmember, or high resources with some scrap. No odds. INFERRED: equal.
  // Leave them alone: nothing. Anti-Personnel Drone: 1 drone part, medium resources with some scrap.
  // Boarding Drone: 1 drone part, low scrap with resources. The breach flavor names no hull number.
  // Both drone costs skip the part when the reward includes drone parts. That is the two-of-three resource draw.
  // Anti-Bio Beam: high resources with some scrap. The unnamed bonus item is not granted.
  {
    dest: "Giant alien spiders",
    slug: "giant-alien-spiders",
    flag: "cited:giant-alien-spiders",
    aliases: ["Giant alien spiders"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-find-a-number-of-ships"),
    choices: [
      { id: "c:giant-alien-spiders:0", label: tx("wiki.filler-events.send-the-crew-to-help-giant"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-or-high-resources-with") }] },
      { id: "c:giant-alien-spiders:1", label: tx("wiki.filler-events.leave-them-alone"), fx: [{ k: "nothing" }] },
      { id: "c:giant-alien-spiders:2", label: tx("wiki.filler-events.send-your-battle-drone-in-to"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:giant-alien-spiders:3", label: tx("wiki.filler-events.launch-a-boarding-drone-into-the"), fx: [{ k: "note", text: tx("wiki.filler-events.low-scrap-with-resources") }] },
      { id: "c:giant-alien-spiders:4", label: tx("wiki.filler-events.use-the-beam-to-pick-off"), fx: [{ k: "note", text: tx("wiki.filler-events.high-resources-with-some-scrap") }] },
    ],
  },
  // DISTRESS_TRAPPED_MINER. Shooting the rocks: 2 hull, 2 system damage, and low scrap, or medium scrap with resources.
  // No odds. INFERRED: equal. Looting: medium scrap with resources, or a Pirate ship. INFERRED: equal.
  // A beam that is not Anti-Bio or Fire, including Artillery Beam, pays medium scrap with resources.
  // A beam drone that is not an Anti-Ship Fire Drone spends 1 part for the same reward, with the drone-part bug.
  {
    dest: "Crushed pirate",
    slug: "crushed-pirate",
    flag: "cited:crushed-pirate",
    aliases: ["Crushed pirate"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-arrive-at-the-distress-beacon"),
    choices: [
      { id: "c:crushed-pirate:0", label: tx("wiki.filler-events.try-to-dislodge-the-ship-by"), fx: [{ k: "note", text: tx("wiki.filler-events.2-hull-2-system-damage-and") }] },
      { id: "c:crushed-pirate:1", label: tx("wiki.filler-events.destroy-and-loot-the-ship-they"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources-or-a") }] },
      { id: "c:crushed-pirate:2", label: tx("wiki.filler-events.carefully-cut-the-ship-out"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources") }] },
      { id: "c:crushed-pirate:3", label: tx("wiki.filler-events.have-your-drone-cut-the-ship"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-scrap-with-resources") }] },
    ],
  },
  // DISTRESS_STATION_DISEASE. Send the crew: lose a crewmember and medium resources, or nothing. No odds. INFERRED: equal.
  // Clone Bay has no effect. Ignore: nothing. A living Rock or Engi pays medium resources with some scrap.
  // Medbay level 2 or more opens the cure. Continue pays that same reward. Engi Med-bot Dispersal pays high scrap.
  // Its weapon is not named: a random one (Rewards, "Weapon").
  {
    dest: "Unknown disease on mining colony",
    slug: "unknown-disease-on-mining-colony",
    flag: "cited:unknown-disease-on-mining-colony",
    aliases: ["Unknown disease on mining colony"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.you-locate-a-nearby-human-mining"),
    choices: [
      { id: "c:unknown-disease-on-mining-colony:0", label: tx("wiki.filler-events.send-in-your-crew-to-help"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-and-medium-resources-or") }] },
      { id: "c:unknown-disease-on-mining-colony:1", label: tx("wiki.filler-events.ignore-their-request-and-move-on"), fx: [{ k: "nothing" }] },
      { id: "c:unknown-disease-on-mining-colony:2", label: tx("wiki.filler-events.send-your-rock-crew-member-to"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:unknown-disease-on-mining-colony:3", label: tx("wiki.filler-events.send-your-engi-to-calm-down"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-with-some-scrap") }] },
      { id: "c:unknown-disease-on-mining-colony:4", label: tx("wiki.filler-events.use-your-medbay-to-help-synthesize"), fx: [{ k: "note", text: tx("wiki.filler-events.medium-resources-or-high-scrap") }] },
    ],
  },
  // DISTRESS_STATION_FIRE. Send the crew: lose a crewmember and low scrap, or high scrap. No odds. INFERRED: equal.
  // Clone Bay revives that crewmember. Docking: 4 hull, 1 system damage, and low scrap, or Dr. Jones and low scrap.
  // INFERRED: equal. Leave: nothing. A living Rock pays high scrap and an unnamed augmentation. A Repair Drone pays high
  // scrap and an unnamed drone schematic. Each is a random one (Rewards, "Augment" / "Drone").
  {
    dest: "Fire on research station",
    slug: "fire-on-research-station",
    flag: "cited:fire-on-research-station",
    aliases: ["Fire on research station"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.filler-events.you-find-the-source-of-the"),
    choices: [
      { id: "c:fire-on-research-station:0", label: tx("wiki.filler-events.send-your-crew-in-a-shuttle"), fx: [{ k: "note", text: tx("wiki.filler-events.a-crewmember-and-low-scrap-or") }] },
      { id: "c:fire-on-research-station:1", label: tx("wiki.filler-events.dock-and-try-to-rescue-the"), fx: [{ k: "note", text: tx("wiki.filler-events.4-hull-1-system-damage-and") }] },
      { id: "c:fire-on-research-station:2", label: tx("wiki.filler-events.leave"), fx: [{ k: "nothing" }] },
      { id: "c:fire-on-research-station:3", label: tx("wiki.filler-events.send-your-rock-crew-member-in"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap-and-a-random-augmentation") }] },
      { id: "c:fire-on-research-station:4", label: tx("wiki.filler-events.send-your-repair-drone-into-the"), fx: [{ k: "note", text: tx("wiki.filler-events.high-scrap-and-a-random-drone") }] },
    ],
  },
  // STRANDED_BEACON. Go down: a survivor, or a man in a cave. No odds. INFERRED: equal.
  // Invite: Charlie with 1 skill in one of the six stations. No odds. INFERRED: equal. The page names Charlie and not a race.
  // Take him home is Template:ReturnSurvivor: high scrap, medium scrap, or 10 repairs. No odds. INFERRED: equal.
  // Bring him back: a crewmember, Charlie, 5 hull and 1 system damage, or he collapses. No odds. INFERRED: equal.
  // A level 2 medbay, a level 3 medbay, and a living Slug are blue options. The Slug's crewmember is not named.
  {
    dest: "Single life form on moon",
    slug: "single-life-form-on-moon",
    flag: "cited:single-life-form-on-moon",
    aliases: ["Single life form on moon"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.filler-events.it-appears-the-distress-beacon-is"),
    choices: [
      { id: "c:single-life-form-on-moon:0", label: tx("wiki.filler-events.go-down-to-the-surface-to"), fx: [{ k: "note", text: tx("wiki.filler-events.charlie-a-crewmember-5-hull-or") }] },
      { id: "c:single-life-form-on-moon:1", label: tx("wiki.filler-events.ignore-the-signal"), fx: [{ k: "nothing" }] },
    ],
  },
  // TRAP_BEACON. The intro is one of four printed lines. No odds. INFERRED: equal.
  // Fight a Pirate ship. Default rewards are the destroy salvage. The PIRATE surrender and escape rows are that faction's plan.
  {
    dest: "Pirate ship distress trap",
    slug: "pirate-ship-distress-trap",
    flag: "cited:pirate-ship-distress-trap",
    aliases: ["Pirate ship distress trap"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.filler-events.you-arrive-at-the-beacon-and-2"),
    choices: [
      { id: "c:pirate-ship-distress-trap:0", label: tx("wiki.filler-events.fight-the-pirate-ship"), fx: [{ k: "fight", tier: "Pirate ship" }] },
    ],
  },
  // DISTRESS_SATELLITE_DEFENSE. Promise opens the printed options. No odds on simply fire.
  // The other printed result (5 hull, 1 random system, 1 breached room) stays unwired, so that button does not roll a weight.
  // The commented-out Lanius crew option is not in the game. It is not added here.
  {
    dest: "Malfunctioning defense system",
    slug: "malfunctioning-defense-system",
    flag: "cited:malfunctioning-defense-system",
    aliases: ["Malfunctioning defense system"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.filler-events.the-distress-signal-is-coming-from"),
    choices: [
      { id: "c:malfunctioning-defense-system:0", label: tx("wiki.filler-events.promise-to-help"), fx: [{ k: "note", text: tx("wiki.filler-events.ion-cloaking-an-engi-or-low") }] },
      { id: "c:malfunctioning-defense-system:1", label: tx("wiki.filler-events.leave-them-alone"), fx: [{ k: "nothing" }] },
    ],
  },
  // TAVERN_HIRE. The intro varies. Don't hire anyone does nothing.
  // Both hire prices grant an unnamed crewmember and stay unwired.
  {
    dest: "Crew hiring station",
    slug: "crew-hiring-station",
    flag: "cited:crew-hiring-station",
    aliases: ["Crew hiring station"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
    ],
    body: tx("wiki.filler-events.this-beacon-seems-to-serve-as"),
    choices: [
      { id: "c:crew-hiring-station:0", label: tx("wiki.filler-events.don-t-hire-anyone"), fx: [{ k: "nothing" }] },
    ],
  },
];

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

/** The card for a list row: the cited table's page first, else FILLER_PAGES. */
export function pageForRow(dest: string): Page | undefined {
  return citedByName(dest) ?? FILLER_PAGES.find((p) => p.dest === dest || p.aliases.includes(dest));
}

function pageBySlug(slug: string): Page | undefined {
  const own = FILLER_PAGES.find((p) => p.slug === slug);
  if (own) return own;
  if (!citedIndex) citedByName("");
  for (const p of citedIndex!.values()) if (p.slug === slug) return p;
  return undefined;
}

export const FILLER_FLAG = "filler:";

/** True when a beacon on this map already holds that page (unique events: "only once per sector"). */
function onMap(beacons: Beacon[], page: Page): boolean {
  return beacons.some((b) => b.flag === page.flag || b.flag === FILLER_FLAG + page.slug || b.name === page.dest);
}

/**
 * Draws one row from `list` that has a card. A unique row already on the map, or named in `reserved` (the sector's
 * own cited pages, which the mix may still place), is skipped. `r` is beacon-mix's shadow state or the live game.
 */
export function drawFiller(
  r: Game,
  list: FillerList,
  beacons: Beacon[],
  reserved: ReadonlySet<string> = new Set(),
  extras: Page[] = [],
): Page | null {
  const pool: Page[] = [];
  for (const row of LISTS[list]) {
    const page = pageForRow(row.dest);
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
  const slug = sectorName.startsWith("Slug");
  b.flag = FILLER_FLAG + (slug ? "empty-nebula-beacon-slug" : "empty-nebula-beacon");
  b.name = slug ? tx("wiki.filler-events.empty-nebula-beacon-slug") : tx("wiki.filler-events.empty-nebula-beacon");
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

function emptyCard(g: Game, page: EmptyPage): GameEvent {
  const text = page.texts[Math.min(page.texts.length - 1, Math.floor(rand(g) * page.texts.length))];
  // "Nothing happens." The "ack" choice resolves the beacon (sim.ts choose).
  return { title: page.dest.replace(/ \(.*\)$/, ""), body: text, choices: [{ id: "ack", label: tx("wiki.filler-events.continue") }] };
}

/** Friendly ship out of fuel: "the requested amount of fuel is shown before you make the choice". */
function friendlyCard(g: Game, page: Page): GameEvent {
  const n = between(g, [2, 4]);
  return {
    title: page.dest,
    body: page.body,
    choices: [
      { id: `s:friendly-ship-out-of-fuel:give:${n}`, label: tx("wiki.filler-events.give-them-the-fuel-fuel", { n: n }) },
      { id: page.choices[1].id, label: page.choices[1].label },
    ],
  };
}

/**
 * Trade scrap for upgrades. The intro "can be any of the following".
 * INFERRED: the four printed texts are equally likely.
 */
const TRADE_INTROS = [
  tx("wiki.filler-events.you-pick-up-an-automated-message"),
  tx("wiki.filler-events.there-are-a-number-of-privately"),
  tx("wiki.filler-events.you-receive-a-message-from-a-2"),
  tx("wiki.filler-events.you-are-immediately-hailed-by-a"),
];

type TradeId = "oxygen" | "pilot" | "doors" | "sensors" | "reactor";

type TradeOffer = { id: TradeId; name: string; lo: number; hi: number; next: number };

/**
 * Trade scrap for upgrades. Each specialty is a result of inquiring, with a scrap band for the level already owned.
 * Trivia: a missing subsystem is not offered, and a system already at its maximum is not offered.
 * The reactor band is 15-25, and the reactor cannot pass 25. The page does not say the reactor step is one bar.
 * INFERRED: that step is one bar, the same unit as the 25-bar cap.
 * INFERRED: the specialties that can still be bought are equally likely. No odds are printed.
 */
function tradeOffers(g: Game): TradeOffer[] {
  const out: TradeOffer[] = [];
  const sys = (id: Exclude<TradeId, "reactor">, name: string, bands: Record<number, [number, number]>) => {
    const level = g.player.systems[id]?.level ?? 0;
    const band = bands[level];
    if (!band) return;
    out.push({ id, name, lo: band[0], hi: band[1], next: level + 1 });
  };
  sys("oxygen", tx("wiki.filler-events.oxygen"), { 1: [15, 20], 2: [25, 40] });
  sys("pilot", tx("wiki.filler-events.piloting"), { 1: [8, 15], 2: [25, 40] });
  sys("doors", tx("wiki.filler-events.door-system"), { 1: [8, 15], 2: [25, 40] });
  sys("sensors", tx("wiki.filler-events.sensors"), { 1: [10, 20], 2: [35, 45] });
  if (upgradeCost("reactor", g.player.reactor) != null) out.push({ id: "reactor", name: "reactor", lo: 15, hi: 25, next: g.player.reactor + 1 });
  return out;
}

function tradeIntro(g: Game, page: Page): GameEvent {
  const text = TRADE_INTROS[Math.min(TRADE_INTROS.length - 1, Math.floor(rand(g) * TRADE_INTROS.length))];
  return { title: page.dest, body: text, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

/**
 * Crew hiring station. "The intro text for this event varies, and could be any of the following".
 * Three texts and no odds. INFERRED: equal.
 * The hire prices grant an unnamed crewmember and stay off this card.
 */
const HIRE_INTROS = [
  tx("wiki.filler-events.this-beacon-seems-to-serve-as"),
  tx("wiki.filler-events.you-find-a-space-station-set"),
  tx("wiki.filler-events.there-are-a-number-of-ships"),
];

function hireCard(g: Game, page: Page): GameEvent {
  const text = HIRE_INTROS[Math.min(HIRE_INTROS.length - 1, Math.floor(rand(g) * HIRE_INTROS.length))];
  return { title: page.dest, body: text, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

function tradeOfferText(o: TradeOffer): string {
  if (o.id === "reactor") return tx("wiki.filler-events.they-offer-to-upgrade-your-reactor");
  if (o.id === "oxygen") return tx("wiki.filler-events.they-offer-to-upgrade-your-oxygen");
  if (o.id === "pilot") return tx("wiki.filler-events.they-offer-to-upgrade-your-piloting");
  if (o.id === "doors") return tx("wiki.filler-events.they-offer-to-upgrade-your-door");
  return tx("wiki.filler-events.they-offer-to-upgrade-your-sensors");
}

function cardFor(g: Game, page: Page): GameEvent {
  if (page.slug === "empty-nebula-beacon") return emptyCard(g, emptyPageFor("", true));
  if (page.slug === "friendly-ship-out-of-fuel" && FILLER_PAGES.includes(page as CitedEventDef)) return friendlyCard(g, page);
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
  return { title: page.dest, body: page.body, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

/**
 * sim.ts eventFor, after the quest and cited lookups: the card for a filler-stamped beacon, or for a plain beacon
 * nothing stamped (a quest slot no quest took, an unlisted sector). Plain beacons draw now, with rand(g), and keep
 * the draw on the beacon. Null for exits and anything else this module does not own.
 */
export function fillerEvent(g: Game, b: Beacon): GameEvent | null {
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
    if (offer.scrap) got.push(tx("wiki.filler-events.scrap", { scrap: offer.scrap }));
    if (offer.fuel) got.push(tx("wiki.filler-events.fuel", { fuel: offer.fuel }));
    if (offer.missiles) got.push(tx("wiki.filler-events.missiles", { missiles: offer.missiles }));
    if (offer.parts) got.push(tx("wiki.filler-events.drone-parts", { parts: offer.parts }));
    if (paid.weaponName) got.push(`${paid.weaponName}.`);
    got.push(...paid.extras);
  }
  for (const l of got) log(g, l);
  const tail = [...got, ...extras].filter(Boolean).join(" ");
  g.event = { title: here(g)?.name ?? "Event", body: tail ? `${text}\n\n${tail}` : text, choices: [{ id: "ack", label: "Continue" }] };
  g.phase = "event";
  g.paused = true;
}

function card(g: Game, body: string, choices: { id: string; label: string }[]) {
  g.event = { title: here(g)?.name ?? "Event", body, choices };
  g.phase = "event";
  g.paused = true;
}

function fight(g: Game, text: string, tier: string, slug: string, opts: { asteroid?: boolean; never?: boolean } = {}) {
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
function resource(g: Game, id: "fuel" | "missiles" | "parts", range: [number, number], scrapTier?: SurrenderTier): SurrenderOffer {
  const offer = scrapTier ? scrapOnly(g, scrapTier) : { tier: "low" as SurrenderTier, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  offer[id] = between(g, range);
  return offer;
}

/** Rewards, "Weapon": "A random weapon & T scrap". INFERRED: a priced weapon the ship does not own. */
function weaponOffer(g: Game, tier: SurrenderTier): SurrenderOffer {
  const offer = scrapOnly(g, tier);
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  const options = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
  if (options.length) offer.weapon = options[Math.min(options.length - 1, Math.floor(rand(g) * options.length))].id;
  return offer;
}

/** Hull damage. True when the ship is lost (same defeat as citedChoose). */
function hurt(g: Game, n: number): boolean {
  g.player.hull = Math.max(0, g.player.hull - n);
  log(g, tx("wiki.filler-events.hull-damage", { n: n }));
  if (g.player.hull > 0) return false;
  g.phase = "defeat";
  g.outcome = g.training ? "tutorial" : "hull";
  g.paused = true;
  g.event = null;
  return true;
}

/** Cut the wire. Medium scrap, or 6 hull, a breached room, and a lost crewmember. Clone Bay brings them back. */
function cutMineWire(g: Game) {
  if (weighted(g, [["safe", 1], ["boom", 1]] as const) === "safe") {
    show(g, tx("wiki.filler-events.you-open-your-eyes-and-everything"), scrapOnly(g, "medium"));
    return;
  }
  if (hurt(g, 6)) return;
  const note = loseCrew(g);
  show(g, tx("wiki.filler-events.the-weapon-detonates-everything-goes-dark"), undefined, [tx("wiki.filler-events.hull-damage-6"), roomBreach(g), note].filter(Boolean));
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
    bar = tx("wiki.filler-events.1-damage-to", { system: r.system });
  }
  r.breach += 1;
  return [bar, tx("wiki.filler-events.a-breach-opens-in", { title: r.title })].filter(Boolean).join(" ");
}

/** Beam Drone, not an Anti-Ship Fire Drone and not Beam Drone II. The fitted schematic is kit.target. */
function ownsMineBeam(g: Game): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === "beam" || (kit.loadout ?? []).includes("beam");
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
  return tx("wiki.filler-events.1-damage-to", { system: r.system });
}

/** Mantis fugitive, mantis-controlled Engi ship. INFERRED: the Engi hull's crew are Mantis. */
function mantisControlled(g: Game) {
  const hp = kinOf("blade").hp;
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "enemy") continue;
    c.kin = "blade";
    c.hp = hp;
    c.maxHp = hp;
  }
}

/** "Rebel Fleet is delayed for 1 turn." The Engi cache moves the column back by its printed count. */
function delayFleetOne(g: Game) {
  // INFERRED: a fleet already at column 0 stays there.
  g.fleet = Math.max(0, g.fleet - 1);
  log(g, tx("wiki.filler-events.rebel-fleet-is-delayed-for-1"));
}

/** Rock and Slug standoff: "1 damage to each of 2 random systems".
 * INFERRED: two different installed systems when two exist.
 */
function twoSystems(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  const pool = [...ids];
  const lines: string[] = [];
  for (let n = 0; n < 2 && pool.length; n++) {
    const i = Math.min(pool.length - 1, Math.floor(rand(g) * pool.length));
    const id = pool.splice(i, 1)[0]!;
    hurtSystem(g.player, id, 1);
    lines.push(tx("wiki.filler-events.1-damage-to-2", { id: id }));
    log(g, tx("wiki.filler-events.1-damage-to-2", { id: id }));
  }
  return lines.join(" ");
}

/** "1 damage to a random system". INFERRED: one of the installed systems, equal odds. */
function hurtRandomSystem(g: Game, amount = 1): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  const before = g.player.systems[id]?.damage ?? 0;
  hurtSystem(g.player, id, amount);
  if (amount === 1) return tx("wiki.filler-events.system-damage", { id: id });
  const applied = (g.player.systems[id]?.damage ?? 0) - before;
  return applied ? tx("wiki.filler-events.damage-to", { applied: applied, id: id }) : "";
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
    bar = tx("wiki.filler-events.1-damage-to", { system: r.system });
  }
  const n = 1 + (rand(g) < 0.5 ? 1 : 0);
  // Fires, "Fires and enemy AI": a room stacks to four flames. This event still adds only its 1-2.
  r.fire = Math.min(4, r.fire + n);
  return [bar, tx("wiki.filler-events.in", { v: n === 1 ? "1 fire" : "2 fires", title: r.title })].filter(Boolean).join(" ");
}

/**
 * Plasma storm incapacitated ships: "a breach to a random system."
 * Trivia on that page: the hull-and-breach outcome "does not destroy any system."
 * INFERRED: installed systems are equally likely. The breach opens in that system's room and spends no bar.
 * A system with no room is skipped.
 */
function breachRandomSystem(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  const room = g.player.rooms.find((r) => r.system === id);
  if (!room) return "";
  room.breach += 1;
  return tx("wiki.filler-events.a-breach-opens-in", { title: room.title });
}

/** "You lose a crewmember." Clone Bay: "The lost crewmember is revived" unless `noClone`. INFERRED: never the last one. */
function loseCrew(g: Game, noClone = false): string {
  if (!noClone && g.player.kits.cradle) return tx("wiki.filler-events.the-lost-crewmember-is-revived");
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[Math.min(mine.length - 1, Math.floor(rand(g) * mine.length))];
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  return tx("wiki.filler-events.is-lost", { name: lost.name });
}

function gainCrew(g: Game, race = randomRace(g)): string {
  return joinCrew(g, race) ? tx("wiki.filler-events.a-crewmember-joins-you", { race: race }) : tx("wiki.filler-events.there-is-no-room-aboard-for");
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
  return g.player.weapons.some((w) => w.defId !== "hullmissile" && WEAPONS[w.defId]?.kind === "missile");
}

function miningOffers(): { id: string; label: string }[] {
  return [
    { id: "c:asteroid-mining-colony:1", label: tx("wiki.filler-events.give-them-the-requested-5-missiles") },
    { id: "c:asteroid-mining-colony:2", label: tx("wiki.filler-events.give-them-15-missiles") },
    { id: "c:asteroid-mining-colony:3", label: tx("wiki.filler-events.decline") },
  ];
}

/** The fitted schematic is kit.target. A loadout entry counts the same way. */
function ownsDrone(g: Game, kind: string): boolean {
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return kit.target === kind || (kit.loadout ?? []).includes(kind);
}

function ownsAntiBio(g: Game): boolean {
  return g.player.weapons.some((w) => w.defId === "antibio");
}

/** Malfunctioning defense system, Ion Weapon: kind ion, or any weapon that deals ion, including Ion Bomb and Stun Bomb. */
function ownsIon(g: Game): boolean {
  return g.player.weapons.some((w) => {
    const def = WEAPONS[w.defId];
    return !!def && (def.kind === "ion" || def.ion > 0);
  });
}

/** Cloaking with no level named is any installed Cloaking. Improved is 2. Advanced is 3. */
function cloakLevel(g: Game): number {
  return g.player.kits.veil?.level ?? 0;
}

/** Crushed pirate: Anti-Bio Beam and Fire Beam are excluded. Artillery Beam is the lance kit. */
function ownsCuttingBeam(g: Game): boolean {
  if ((g.player.kits.lance?.level ?? 0) > 0) return true;
  return g.player.weapons.some((w) => {
    const def = WEAPONS[w.defId];
    return def?.kind === "beam" && w.defId !== "antibio" && w.defId !== "firebeam";
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
  const kit = g.player.kits.swarm;
  if (!kit) return false;
  return [kit.target, ...(kit.loadout ?? [])].some((kind) => kind === "beam" || kind === "beam2");
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
  return tx("wiki.filler-events.your-ship-reactor-is-upgraded");
}

function payMiners(g: Game, base: number, hull: number): string[] {
  const got = adjustScrap(g, base);
  if (got > 0) g.scrap += got;
  if (base > 0) g.scrapCollected = (g.scrapCollected ?? 0) + base;
  g.player.hull = Math.min(g.player.hullMax, g.player.hull + hull);
  const lines = [tx("wiki.filler-events.you-receive-scrap", { got: got })];
  if (hull > 0) lines.push(tx("wiki.filler-events.your-ship-receives-repairs", { hull: hull }));
  return lines;
}

/** Asteroid mining colony. A shortfall leaves the card up. */
function giveMiners(g: Game, n: 5 | 15) {
  if (g.missiles < n) return;
  g.missiles -= n;
  if (n === 5) {
    // No odds on the three results. INFERRED: equal.
    const r = weighted(g, [["hull", 1], ["reactor", 1], ["scrap", 1]] as const);
    if (r === "hull") {
      g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
      show(g, tx("wiki.filler-events.they-thank-you-and-offer-to"), undefined, [tx("wiki.filler-events.your-ship-receives-10-repairs")]);
    } else if (r === "reactor") {
      const note = bumpReactor(g);
      show(g, tx("wiki.filler-events.they-thank-you-and-offer-to-2"), undefined, note ? [note] : []);
    } else {
      const base = between(g, [15, 25]);
      show(g, tx("wiki.filler-events.they-thank-you-for-your-generosity"), undefined, payMiners(g, base, 0));
    }
    return;
  }
  // No odds on the three results. INFERRED: equal.
  // The augment result names no augment. Rewards, "Augment": "A random augmentation & T scrap." (no scrap printed).
  const r = weighted(g, [["both", 1], ["augment", 1], ["scrap", 1]] as const);
  if (r === "both") {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 15);
    const note = bumpReactor(g);
    show(g, tx("wiki.filler-events.wow-this-will-help-our-efforts"), undefined, [tx("wiki.filler-events.your-ship-receives-15-repairs"), note].filter(Boolean));
  } else if (r === "augment") {
    show(g, tx("wiki.filler-events.wow-this-will-help-our-efforts-2"), undefined, [grantRandomItem(g, "augment")]);
  } else {
    const base = between(g, [30, 40]);
    show(g, tx("wiki.filler-events.wow-this-will-help-our-efforts-3"), undefined, payMiners(g, base, 5));
  }
}

const SUPPLY_INTROS = [
  tx("wiki.filler-events.you-look-like-a-military-vessel"),
  tx("wiki.filler-events.you-receive-a-message-from-a"),
];

/** Missiles, drone parts, fuel. A 0-wide band stays 0. */
const SUPPLY_BUNDLES: { missiles: [number, number]; parts: [number, number]; fuel: [number, number] }[] = [
  { missiles: [3, 5], parts: [0, 2], fuel: [0, 0] },
  { missiles: [0, 2], parts: [2, 3], fuel: [0, 0] },
  { missiles: [0, 2], parts: [0, 2], fuel: [2, 3] },
];

function supplyLegal(missiles: number, parts: number, fuel: number): boolean {
  return SUPPLY_BUNDLES.some((b) =>
    missiles >= b.missiles[0] && missiles <= b.missiles[1]
    && parts >= b.parts[0] && parts <= b.parts[1]
    && fuel >= b.fuel[0] && fuel <= b.fuel[1],
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
  const intro = SUPPLY_INTROS[Math.min(SUPPLY_INTROS.length - 1, Math.floor(rand(g) * SUPPLY_INTROS.length))];
  const bundle = SUPPLY_BUNDLES[Math.min(SUPPLY_BUNDLES.length - 1, Math.floor(rand(g) * SUPPLY_BUNDLES.length))];
  const missiles = between(g, bundle.missiles);
  const parts = between(g, bundle.parts);
  const fuel = between(g, bundle.fuel);
  return {
    title: page.dest,
    body: intro,
    choices: [
      { id: `s:improve-reactor-for-supplies:agree:${missiles}:${parts}:${fuel}`, label: tx("wiki.filler-events.agree-to-the-trade-2", { supplyPrice: supplyPrice(missiles, parts, fuel) }) },
      { id: "c:improve-reactor-for-supplies:1", label: tx("wiki.filler-events.respectfully-decline") },
    ],
  };
}

/** Blue options stay off the card until that drone or the Anti-Bio Beam is fitted. */
function spiderCard(g: Game, page: Page): GameEvent {
  const choices = page.choices
    .filter((c) => {
      if (c.id === "c:giant-alien-spiders:2") return ownsDrone(g, "personnel");
      if (c.id === "c:giant-alien-spiders:3") return ownsDrone(g, "board");
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
    { id: "c:malfunctioning-defense-system:2", label: tx("wiki.filler-events.simply-fire-on-the-defense-system") },
  ];
  if (ownsIon(g)) choices.push({ id: "c:malfunctioning-defense-system:3", label: tx("wiki.filler-events.ion-weapon-disable-the-defense-system") });
  const cloak = cloakLevel(g);
  if (cloak >= 1) choices.push({ id: "c:malfunctioning-defense-system:4", label: tx("wiki.filler-events.cloaking-use-your-cloaking-to-disable") });
  if (cloak >= 2) choices.push({ id: "c:malfunctioning-defense-system:5", label: tx("wiki.filler-events.improved-cloaking-use-your-cloaking-to") });
  if (cloak >= 3) choices.push({ id: "c:malfunctioning-defense-system:6", label: tx("wiki.filler-events.advanced-cloaking-use-your-cloaking-to") });
  if (livingKin(g, "shell")) choices.push({ id: "c:malfunctioning-defense-system:7", label: tx("wiki.filler-events.engi-crew-remotely-repair-its-targeting") });
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
  show(g, body, offer, offer.parts <= 0 ? [tx("wiki.filler-events.drone-parts-1")] : []);
}

function spiderDrone(g: Game, kind: "personnel" | "board", body: string) {
  if (!ownsDrone(g, kind)) return;
  const hull = g.player.hull;
  const lines = g.log.slice();
  const offer = kind === "personnel" ? rollSurrenderOffer(g, "medium", true) : rollStandard(g, "low");
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
      if (c.id === "c:unknown-disease-on-mining-colony:2") return livingKin(g, "stone");
      if (c.id === "c:unknown-disease-on-mining-colony:3") return livingKin(g, "shell");
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
      if (c.id === "c:fire-on-research-station:3") return livingKin(g, "stone");
      if (c.id === "c:fire-on-research-station:4") return ownsDrone(g, "patch");
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
  return joinCrew(g, randomRace(g), tx("wiki.filler-events.charlie"), skills) ? tx("wiki.filler-events.charlie-joins-you") : tx("wiki.filler-events.there-is-no-room-aboard-for-2");
}

function clonebayLevel(g: Game): number {
  return g.player.kits.cradle?.level ?? 0;
}

/** The cave. Blue options stay off until the ship meets the printed level. */
function moonCave(g: Game) {
  const choices = [
    { id: "s:moon:bring", label: tx("wiki.filler-events.bring-him-back-to-your-ship") },
    { id: "s:moon:leave", label: tx("wiki.filler-events.leave-the-madman-to-his-ravings") },
  ];
  // Template:Blue Option, "Requires level 2" and "Requires level 3". A higher medbay still meets the lower line.
  const med = medbayLevel(g);
  if (med >= 2) choices.push({ id: "s:moon:medbay2", label: tx("wiki.filler-events.improved-medbay-bring-him-to-your") });
  if (med >= 3) choices.push({ id: "s:moon:medbay3", label: tx("wiki.filler-events.advanced-medbay-bring-him-to-your") });
  if (livingKin(g, "gel")) choices.push({ id: "s:moon:slug", label: tx("wiki.filler-events.sir-allow-me-to-assess-his") });
  card(g, tx("wiki.filler-events.you-find-a-man-living-alone"), choices);
}

const TRAP_INTRO = [
  tx("wiki.filler-events.you-arrive-at-the-beacon-and-2"),
  tx("wiki.filler-events.haha-i-knew-someone-would-fall"),
  tx("wiki.filler-events.your-cockpit-lights-up-with-warning"),
  tx("wiki.filler-events.as-soon-as-you-arrive-at"),
];

/** Four printed intros, no odds. INFERRED: equal. */
function trapCard(g: Game, page: Page): GameEvent {
  const body = TRAP_INTRO[Math.min(TRAP_INTRO.length - 1, Math.floor(rand(g) * TRAP_INTRO.length))];
  return { title: page.dest, body, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

// Abandoned station. The page prints three opening intros and no odds.
// INFERRED: equal. Examine and stay stay the existing choices.
const ABANDONED_STATION_INTROS = [
  tx("wiki.filler-events.you-arrive-to-find-what-appears"),
  tx("wiki.filler-events.you-find-a-small-space-station"),
  tx("wiki.filler-events.this-area-shows-signs-of-a"),
];

function abandonedStationCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: ABANDONED_STATION_INTROS[between(g, [0, 2])]!,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

// Rebel fight chance. The page prints four opening intros and no odds.
// INFERRED: equal. The search, the jump, and the two scans stay the existing choices.
const REBEL_CHANCE_INTROS = [
  tx("wiki.filler-events.you-arrive-at-a-beacon-located"),
  tx("wiki.filler-events.as-soon-as-you-arrive-you"),
  tx("wiki.filler-events.you-begin-charging-your-ftl-drive"),
  tx("wiki.filler-events.you-jump-into-a-field-of"),
];

function rebelChanceCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: REBEL_CHANCE_INTROS[between(g, [0, 3])]!,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

// Battlefield wreckage. The page prints two opening intros and no odds.
// INFERRED: equal. Investigate, ignore, and the sensors scan stay the existing choices.
const WRECKAGE_INTROS = [
  tx("wiki.filler-events.what-at-first-seems-to-be"),
  tx("wiki.filler-events.you-have-jumped-into-the-aftermath"),
];

function wreckageCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: WRECKAGE_INTROS[between(g, [0, 1])]!,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function moonCollapse(g: Game) {
  const choices = [{ id: "s:moon:collapse-continue", label: tx("wiki.filler-events.continue-2") }];
  if (medbayLevel(g) >= 2) choices.push({ id: "s:moon:collapse-medbay", label: tx("wiki.filler-events.improved-medbay-quickly-bring-him-to") });
  if (clonebayLevel(g) >= 2) choices.push({ id: "s:moon:collapse-clone", label: tx("wiki.filler-events.improved-clonebay-quickly-register-him-into") });
  card(g, tx("wiki.filler-events.it-seems-he-was-in-worse"), choices);
}

function diseaseCure(g: Game) {
  const choices = [{ id: "s:unknown-disease:continue", label: tx("wiki.filler-events.continue-2") }];
  if (g.augments.includes("medbot")) {
    choices.push({ id: "s:unknown-disease:medbot", label: tx("wiki.filler-events.use-the-nano-med-bots-to") });
  }
  card(g, tx("wiki.filler-events.your-military-grade-medical-computers-are"), choices);
}

/** Refueling station: the printed scrap cost buys that many fuel. A shortfall leaves the card up. */
function buyFuel(g: Game, cost: number, fuel: number) {
  if (g.scrap < cost) return;
  g.scrap -= cost;
  g.fuel += fuel;
  show(g, tx("wiki.filler-events.thank-you-for-your-business"), undefined, [tx("wiki.filler-events.you-receive-fuel", { fuel: fuel })]);
}

/** The page says the engines are upgraded and prints no step. INFERRED: one level. A maxed system stays put. */
function bumpEngines(g: Game): string {
  const sys = g.player.systems.engines;
  if (!sys || sys.level <= 0 || upgradeCost("engines", sys.level) == null) return tx("wiki.filler-events.the-engines-cannot-take-the-upgrade");
  sys.level += 1;
  return tx("wiki.filler-events.engines-upgraded");
}

function robertJoins(g: Game): string {
  return joinCrew(g, tx("wiki.filler-events.mantis"), tx("wiki.filler-events.robert-smith")) ? tx("wiki.filler-events.robert-smith-joins-you") : tx("wiki.filler-events.there-is-no-room-aboard-for-3");
}

function ownsMindControl(g: Game): boolean {
  return (g.player.kits.leash?.level ?? 0) > 0;
}

/** Confused Mantis, after listening. Blue options stay off until the ship has them. */
function confusedMantisCard(g: Game) {
  const choices = [
    { id: "s:confused-mantis:shuttle", label: tx("wiki.filler-events.send-a-shuttle-with-an-away") },
    { id: "s:confused-mantis:leave", label: tx("wiki.filler-events.leave-them-a-cornered-mantis-is") },
  ];
  if (livingKin(g, "plain")) choices.push({ id: "s:confused-mantis:human", label: tx("wiki.filler-events.send-your-human-crewmember-to-communicate") });
  if (livingKin(g, "blade")) choices.push({ id: "s:confused-mantis:mantis", label: tx("wiki.filler-events.send-your-mantis-crewmember-to-communicate") });
  if (ownsMindControl(g)) choices.push({ id: "s:confused-mantis:mind", label: tx("wiki.filler-events.use-your-mind-control-system-to") });
  card(g, tx("wiki.filler-events.found-malfunctioning-mantis-believes-it-is"), choices);
}

function mantisColony(g: Game) {
  card(g, tx("wiki.filler-events.the-colony-is-a-mining-operation"), [
    { id: "s:confused-mantis:hire", label: tx("wiki.filler-events.offer-him-a-position-on-your") },
    { id: "s:confused-mantis:engines", label: tx("wiki.filler-events.ask-if-they-can-take-a") },
  ]);
}

function upgradeOxygen(g: Game): string {
  const sys = g.player.systems.oxygen;
  if (!sys || sys.level <= 0 || upgradeCost("oxygen", sys.level) == null) return tx("wiki.filler-events.the-oxygen-system-cannot-take-the");
  sys.level += 1;
  return tx("wiki.filler-events.oxygen-system-upgraded");
}

/** Terraforming scan, Improved Sensors level=2+. The page does not say whether damage drops it. INFERRED: the installed level. */
function sensorsLevel(g: Game): number {
  return g.player.systems.sensors?.level ?? 0;
}

/** Terraforming scan, Zoltan Crew. A dead Zoltan does not count. */
function livingZoltan(g: Game): boolean {
  return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === "spark");
}

/**
 * Terraforming scan, Successful Scan, on the same page: oxygen upgrade, a Pirate ship, or the mold.
 * The three results print no odds. INFERRED: equal. The blue options land here and skip the failed scan.
 * "Set sensors to maximum" is that scan, not a permanent sensor upgrade.
 */
function successfulScan(g: Game, lead?: string) {
  const withLead = (text: string) => (lead ? `${lead}\n\n${text}` : text);
  const r = weighted(g, [["oxygen", 1], ["pirate", 1], ["mold", 1]] as const);
  if (r === "oxygen") show(g, withLead(tx("wiki.filler-events.after-a-complete-scan-of-the")), undefined, [upgradeOxygen(g)]);
  else if (r === "pirate") fight(g, withLead(tx("wiki.filler-events.a-complete-scan-of-the-planet")), tx("wiki.filler-events.pirate-ship"), "terraforming-scan");
  else {
    card(g, withLead(tx("wiki.filler-events.a-complete-scan-of-the-planet-2")), [
      { id: "s:terraforming-scan:stop", label: tx("wiki.filler-events.tell-them-to-stop-any-life") },
      { id: "s:terraforming-scan:leave", label: tx("wiki.filler-events.leave-them-to-their-work") },
    ]);
  }
}

/** Template:Drifting Refugee Ship (type=main): the four trade offers; "the actual trade offer is shown" first. */
const REFUGEE_TRADES: { pay: "parts" | "fuel" | "missiles"; payR: [number, number]; get: "fuel" | "missiles" | "parts"; getR: [number, number] }[] = [
  { pay: "parts", payR: [1, 2], get: "fuel", getR: [5, 10] },
  { pay: "fuel", payR: [1, 2], get: "missiles", getR: [4, 5] },
  { pay: "missiles", payR: [2, 3], get: "parts", getR: [2, 3] },
  { pay: "missiles", payR: [2, 4], get: "fuel", getR: [4, 10] },
];
const WORD = { fuel: "fuel", missiles: "missiles", parts: "drone parts" } as const;

function stock(g: Game, id: "fuel" | "missiles" | "parts"): number {
  return id === "fuel" ? g.fuel : id === "missiles" ? g.missiles : g.player.parts;
}

function refugeeTrade(g: Game, slug: string) {
  const t = REFUGEE_TRADES[Math.min(3, Math.floor(rand(g) * 4))];
  const pay = between(g, t.payR);
  const get = between(g, t.getR);
  card(g, tx("wiki.filler-events.the-vessel-is-relieved-to-hear"), [
    { id: `s:${slug}:trade:${t.pay}:${pay}:${t.get}:${get}`, label: tx("wiki.filler-events.trade-with-them-for", { pay: pay, v: WORD[t.pay], get: get, v2: WORD[t.get] }) },
    { id: `s:${slug}:decline`, label: tx("wiki.filler-events.politely-decline") },
  ]);
}

/** type=zoltan. The trade is one result, not DuplicateEvent|4. The other printed hail is the Zoltan ship. No odds. INFERRED: equal. */
function refugeeZoltanHail(g: Game, slug: string) {
  if (weighted(g, [["trade", 1], ["zoltan", 1]] as const) === "trade") {
    refugeeTrade(g, slug);
    return;
  }
  fight(g, tx("wiki.filler-events.as-you-hail-the-refugee-ship"), tx("wiki.filler-events.zoltan-ship"), slug, { never: true });
}

function refugeeZoltanContact(g: Game) {
  show(g, tx("wiki.filler-events.the-refugee-ship-thanks-you-for"), rollStandard(g, "low"));
}

/** type=pirate. The trade is one result, not DuplicateEvent|4. The other printed hail is the pirate bait. No odds. INFERRED: equal. */
function refugeePirateHail(g: Game, slug: string) {
  if (weighted(g, [["trade", 1], ["bait", 1]] as const) === "trade") {
    refugeeTrade(g, slug);
    return;
  }
  fight(g, tx("wiki.filler-events.as-you-hail-the-refugee-ship-2"), tx("wiki.filler-events.pirate-ship"), slug, { never: true });
}

/** deadCrew contact on type=pirate. The destroyed-ship contact stays the shared thanks. */
function refugeePirateFollow(g: Game) {
  show(g, tx("wiki.filler-events.the-refugee-ship-claims-pirates-have"), rollStandard(g, "low"));
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
    fight(g, tx("wiki.filler-events.as-you-hail-the-freighter-it"), tx("wiki.filler-events.pirate-ship"), slug);
  } else if (r === "zoltan") {
    fight(g, tx("wiki.filler-events.as-you-hail-the-refugee-ship"), tx("wiki.filler-events.zoltan-ship"), slug, { never: true });
  } else if (r === "bait") {
    fight(g, tx("wiki.filler-events.as-you-hail-the-refugee-ship-2"), tx("wiki.filler-events.pirate-ship"), slug, { never: true });
  } else {
    fight(g, tx("wiki.filler-events.as-you-hail-the-refugee-ship-3"), tx("wiki.filler-events.slug-ship"), slug, { never: true });
  }
}

function standardLines(offer: SurrenderOffer): string[] {
  const lines: string[] = [];
  if (offer.scrap) lines.push(tx("wiki.filler-events.scrap", { scrap: offer.scrap }));
  if (offer.fuel) lines.push(tx("wiki.filler-events.fuel", { fuel: offer.fuel }));
  if (offer.missiles) lines.push(tx("wiki.filler-events.missiles", { missiles: offer.missiles }));
  if (offer.parts) lines.push(tx("wiki.filler-events.drone-parts", { parts: offer.parts }));
  return lines;
}

/** Dense asteroid field distress, "Find remains of a ship". Both the search and Rock Plating open this card. */
function asteroidRemains(g: Game) {
  card(g, tx("wiki.filler-events.you-find-the-decaying-remains-of"), [
    { id: "s:dense-asteroid-field-distress:weapon", label: tx("wiki.filler-events.take-the-weapon-and-any-spare") },
    { id: "s:dense-asteroid-field-distress:pod", label: tx("wiki.filler-events.grab-the-stasis-chamber") },
  ]);
}

/**
 * Lanius ship absorbing jump beacon, Leave.
 * DuplicateEvent|3 is three copies of nothing and one Lanius fight. Established, not invented.
 */
function beaconEaterLeave(g: Game) {
  if (weighted(g, [["nothing", 3], ["fight", 1]] as const) === "nothing") {
    show(g, tx("wiki.filler-events.you-prepare-to-jump-as-soon"), undefined, [tx("wiki.filler-events.nothing-happens")]);
    return;
  }
  fight(g, tx("wiki.filler-events.you-make-preparations-to-jump-but"), tx("wiki.filler-events.lanius-ship"), "lanius-ship-absorbing-jump-beacon");
}

/** Lanius craftsmen. The discount is 10 scrap off 45, 50, and 40. INFERRED: the button prints that reduced price. */
function craftsmenMenu(g: Game, discount: boolean) {
  const aug = discount ? 35 : 45;
  const weapon = discount ? 40 : 50;
  const drone = discount ? 30 : 40;
  const id = discount ? "s:lanius-craftsmen:help" : "s:lanius-craftsmen";
  const choices = [
    { id: `${id}:aug`, label: tx("wiki.filler-events.give-n-scrap-to-craft-an", { n: aug }) },
    { id: `${id}:weapon`, label: tx("wiki.filler-events.give-n-scrap-to-craft-a", { n: weapon }) },
    { id: `${id}:drone`, label: tx("wiki.filler-events.give-n-scrap-to-craft-a-2", { n: drone }) },
    { id: "s:lanius-craftsmen:decline", label: tx("wiki.filler-events.decline-their-offer") },
  ];
  if (!discount) choices.push({ id: "s:lanius-craftsmen:help", label: tx("wiki.filler-events.offer-to-help-in-the-process") });
  card(
    g,
    discount ? tx("wiki.filler-events.your-crewmember-offers-to-aid-in") : tx("wiki.filler-events.they-respond-we-haven-t-the"),
    choices,
  );
}

/** Unnamed augmentation, weapon, or drone schematic. Rewards names the kind and not the item. */
function craftItem(g: Game, cost: number, kind: "augment" | "weapon" | "drone", story: string) {
  if (g.scrap < cost) return;
  g.scrap -= cost;
  const spent = tx("wiki.filler-events.scrap-2", { n: cost });
  log(g, spent);
  show(g, story, undefined, [spent, grantRandomItem(g, kind)]);
}

function parseTrade(id: string): { pay: "fuel" | "missiles" | "parts"; n: number; get: "fuel" | "missiles" | "parts"; m: number } | null {
  const m = id.match(/^s:refugee(?:-distress-zoltan|-distress-pirate|-distress-slug|-distress|-zoltan|-pirate|-slug)?:trade:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/);
  if (!m) return null;
  return { pay: m[1] as "fuel", n: Number(m[2]), get: m[3] as "fuel", m: Number(m[4]) };
}

export const FILLER_CHOICES: Record<string, (g: Game) => void> = {
  // ---- Large asteroid field ----
  "c:large-asteroid-field:0": (g) => {
    const r = weighted(g, [["fuel", 1], ["missiles", 1], ["parts", 1], ["pirate", 1], ["rocks", 1], ["nothing", 1]] as const);
    if (r === "fuel") show(g, tx("wiki.filler-events.scans-reveal-a-number-of-asteroids"), resource(g, "fuel", [3, 6]));
    else if (r === "missiles") show(g, tx("wiki.filler-events.you-discover-the-remains-of-ship"), resource(g, "missiles", [2, 4], "medium"));
    else if (r === "parts") show(g, tx("wiki.filler-events.you-happen-upon-an-abandoned-mining"), resource(g, "parts", [1, 1], "medium"));
    else if (r === "pirate") fight(g, tx("wiki.filler-events.a-pirate-ship-hiding-behind-one"), tx("wiki.filler-events.pirate-ship"), "large-asteroid-field", { asteroid: true });
    else if (r === "rocks") {
      // Large asteroid field: "5 hull damage, 1 damage to a random system, 1 damage with 1-2 fires to a random room."
      if (hurt(g, 5)) return;
      show(g, tx("wiki.filler-events.the-asteroid-field-proved-more-dangerous"), undefined, [tx("wiki.filler-events.hull-damage-5"), hurtRandomSystem(g), rockFires(g)]);
    } else show(g, tx("wiki.filler-events.a-brief-exploration-yields-nothing-of"));
  },
  "c:large-asteroid-field:1": done,
  // Large asteroid field, Scrap Recovery Arm: "You receive high scrap." The arm must be fitted.
  "c:large-asteroid-field:2": (g) => {
    if (!g.augments.includes("hook")) return;
    show(g, tx("wiki.filler-events.you-carefully-extract-as-much-usable"), scrapOnly(g, "high"));
  },

  // ---- Battlefield wreckage ----
  "c:battlefield-wreckage:0": (g) => {
    const r = weighted(g, [["little", 4], ["slug", 1], ["salvage", 1], ["mantis", 1], ["rebel", 1], ["zoltan", 1]] as const);
    if (r === "little") show(g, tx("wiki.filler-events.you-scan-the-battlefield-and-find"));
    else if (r === "slug") show(g, tx("wiki.filler-events.as-you-approach-the-wreckage-a"));
    else if (r === "salvage") show(g, tx("wiki.filler-events.you-scan-the-battlefield-and-are"), rollSurrenderOffer(g, "medium", true));
    else if (r === "mantis") fight(g, tx("wiki.filler-events.as-you-approach-the-wreckage-a-2"), tx("wiki.filler-events.mantis-ship"), "battlefield-wreckage");
    else if (r === "rebel") fight(g, tx("wiki.filler-events.the-wreckage-appears-to-be-a"), tx("wiki.filler-events.rebel-ship"), "battlefield-wreckage");
    else fight(g, tx("wiki.filler-events.as-you-approach-the-wreckage-a-3"), tx("wiki.filler-events.zoltan-ship"), "battlefield-wreckage");
  },
  "c:battlefield-wreckage:1": done,
  // Battlefield wreckage. {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}.
  // The only printed result. level=2 means at least that installed level. Not a fight, and no "Nothing happens."
  // Advanced Sensors (level=3) can grant an unnamed weapon and prints no odds. Left unwired.
  "c:battlefield-wreckage:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    show(g, tx("wiki.filler-events.you-scan-the-battlefield-and-with"), rollSurrenderOffer(g, "medium", true));
  },

  // ---- Plagued station ----
  "c:plagued-station:0": (g) => {
    const r = weighted(g, [["dead", 1], ["survivor", 1], ["sick", 1]] as const);
    if (r === "dead") show(g, tx("wiki.filler-events.all-around-you-is-the-stench"), scrapOnly(g, "low"));
    else if (r === "survivor") show(g, tx("wiki.filler-events.human-corpses-are-scattered-across-the"), scrapOnly(g, "low"), [gainCrew(g, tx("wiki.filler-events.human"))]);
    else {
      const offer = scrapOnly(g, "low");
      payOffer(g, offer, true);
      card(g, tx("wiki.filler-events.all-around-you-is-the-stench-2", { scrap: offer.scrap }), [
        { id: "s:plagued-station:continue", label: tx("wiki.filler-events.continue-2") },
        // {{Blue Option|Improved Medbay|Try to cure the disease.|level=2+|shortreq=Medbay}}. The button stays on the card.
        { id: "s:plagued-station:cure", label: tx("wiki.filler-events.try-to-cure-the-disease") },
      ]);
    }
  },
  // "You lose a crewmember." Clone Bay has [no effect]. The page says "(Clone Bay)", any installed level, not level 2+.
  "s:plagued-station:continue": (g) => {
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.cradle) extras.push(tx("wiki.filler-events.you-stop-your-crew-s-clone"));
    show(g, tx("wiki.filler-events.your-crewmember-insists-you-leave-them"), undefined, extras);
  },
  // Improved Medbay level=2+. The page's next line is "Nothing happens." The low scrap was already paid on the disease card.
  "s:plagued-station:cure": (g) => {
    if (medbayLevel(g) < 2) return;
    show(g, tx("wiki.filler-events.your-advanced-medical-suite-is-able"));
  },
  "c:plagued-station:1": (g) => {
    show(g, tx("wiki.filler-events.while-waiting-for-the-ftl-drive"), scrapOnly(g));
  },

  // ---- Rebel fight chance ----
  "c:rebel-fight-chance:0": (g) => {
    const r = weighted(g, [["found", 2], ["slow", 1], ["none", 1]] as const);
    if (r === "found") fight(g, tx("wiki.filler-events.after-a-short-search-you-find"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance");
    else if (r === "slow") {
      // "Rebel Fleet pursuit is doubled for 1 jump" (citedChoose `faster`: one extra step).
      g.fleet += 1;
      log(g, tx("wiki.filler-events.rebel-fleet-pursuit-is-doubled-for"));
      fight(g, tx("wiki.filler-events.after-far-too-much-time-spent"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance");
    } else show(g, tx("wiki.filler-events.you-spend-some-time-looking-but"));
  },
  "c:rebel-fight-chance:1": done,
  // Rebel fight chance. {{Blue Option|Improved Sensors|Perform a scan of the area.|level=2|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship. level=2 means at least that installed level.
  "c:rebel-fight-chance:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    fight(g, tx("wiki.filler-events.you-quickly-find-the-rebel-ship"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance");
  },
  // Rebel fight chance. {{Blue Option|Advanced Sensors|Pinpoint the Rebel's location.|level=3|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship whose engines are disabled.
  // INFERRED: "disabled" damages every installed engine bar. The page prints no bar count.
  // level=3 means at least that installed level.
  "c:rebel-fight-chance:3": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(g, tx("wiki.filler-events.you-find-the-rebel-ship-hiding"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance");
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage) hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },

  // Rebel fight chance in nebula. The chase lists three results and prints no odds. INFERRED: equal.
  "c:rebel-fight-chance-in-nebula:0": (g) => {
    show(g, tx("wiki.filler-events.you-try-and-stay-out-of"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "c:rebel-fight-chance-in-nebula:1": (g) => {
    const r = weighted(g, [["fight", 1], ["double", 1], ["none", 1]] as const);
    if (r === "fight") {
      fight(g, tx("wiki.filler-events.you-follow-their-vapour-trails-and"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance-in-nebula");
      return;
    }
    if (r === "double") {
      // "Rebel Fleet pursuit is doubled." No jump count is printed. INFERRED: the current fleet position doubles, the same step as cited-events.ts fx double.
      g.fleet *= 2;
      show(g, tx("wiki.filler-events.you-get-disoriented-in-the-nebula"), undefined, [tx("wiki.filler-events.rebel-fleet-pursuit-is-doubled")]);
      return;
    }
    show(g, tx("wiki.filler-events.without-sensors-you-can-t-maintain"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  // Advanced Sensors level=3: at least that level. Long-Ranged Scanners and Lifeform Scanner each start the same Rebel fight.
  "c:rebel-fight-chance-in-nebula:2": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(g, tx("wiki.filler-events.as-soon-as-they-see-you"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance-in-nebula");
  },
  "c:rebel-fight-chance-in-nebula:3": (g) => {
    if (!g.augments.includes("glass")) return;
    fight(g, tx("wiki.filler-events.as-soon-as-they-see-you"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance-in-nebula");
  },
  "c:rebel-fight-chance-in-nebula:4": (g) => {
    if (!g.augments.includes("pulseeye")) return;
    fight(g, tx("wiki.filler-events.your-augment-s-ability-to-keep"), tx("wiki.filler-events.rebel-ship"), "rebel-fight-chance-in-nebula");
  },

  // Zoltan Great Eye. Pulling closer lists four results and prints no odds. INFERRED: equal.
  // Clone Bay has no effect. Healing Burst is named. A full weapon list is not installed (INFERRED: the page prints no full-slot sentence).
  "c:zoltan-great-eye:0": (g) => {
    const r = weighted(g, [["lose", 1], ["fight", 1], ["scrap", 1], ["heal", 1]] as const);
    if (r === "lose") {
      const extras = [];
      if (g.player.kits.cradle) extras.push(tx("wiki.filler-events.you-check-your-cloning-bay-but"));
      const note = loseCrew(g, true);
      if (note) extras.push(note);
      show(g, tx("wiki.filler-events.as-you-approach-a-kaleidoscope-of"), undefined, extras);
      return;
    }
    if (r === "fight") {
      fight(g, tx("wiki.filler-events.you-approach-the-planet-and-wait"), tx("wiki.filler-events.zoltan-ship"), "zoltan-great-eye");
      return;
    }
    if (r === "scrap") {
      show(g, tx("wiki.filler-events.you-approach-the-planet-carefully-trying"), scrapOnly(g, "high"));
      return;
    }
    show(g, tx("wiki.filler-events.as-you-approach-an-ancient-alien"), {
      tier: "low",
      scrap: 0,
      eligible: 0,
      fuel: 0,
      missiles: 0,
      parts: 0,
      weapon: "healburst",
    });
  },
  "c:zoltan-great-eye:1": (g) => {
    show(g, tx("wiki.filler-events.your-mission-is-to-save-the"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },

  // Slocknog. Hire costs 55 scrap. The page says the skills are shown and prints no numbers, so none are stored.
  // "when you arrive there will be a nebula environment" stays unwired: there is no separate per-fight nebula here.
  "c:slocknog:0": (g) => {
    if (g.scrap < 55) return;
    // Crew: at full crew a hire relieves someone already aboard (make-room.ts keepNewHire).
    joinCrew(g, tx("wiki.filler-events.slug"), tx("wiki.filler-events.slocknog"));
    keepNewHire(g);
    g.scrap -= 55;
    show(g, tx("wiki.filler-events.you-receive-a-slug-crewmember-named"), undefined, [tx("wiki.filler-events.scrap-55")]);
  },
  "c:slocknog:1": (g) => {
    card(g, tx("wiki.filler-events.you-power-up-the-ftl-at"), [
      { id: "s:slocknog:rescue", label: tx("wiki.filler-events.rescue-him") },
      { id: "s:slocknog:leave", label: tx("wiki.filler-events.leave-him") },
    ]);
  },
  "s:slocknog:rescue": (g) => {
    const note = joinCrew(g, tx("wiki.filler-events.slug"), tx("wiki.filler-events.slocknog")) ? tx("wiki.filler-events.slocknog-joins-you") : tx("wiki.filler-events.there-is-no-room-aboard-for-4");
    show(g, tx("wiki.filler-events.when-he-sees-the-shuttle-headed"), undefined, [note]);
  },
  "s:slocknog:leave": (g) => {
    show(g, tx("wiki.filler-events.you-close-the-frequency-and-continue"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },

  // Dense asteroid field distress. Search lists three results and prints no odds. INFERRED: equal.
  // The salvaged weapon with low scrap: Rewards, "Weapon": "A random weapon & T scrap."
  "c:dense-asteroid-field-distress:0": (g) => {
    const r = weighted(g, [["hit", 1], ["scrap", 1], ["remains", 1]] as const);
    if (r === "hit") {
      if (hurt(g, 5)) return;
      if (g.player.systems.engines) hurtSystem(g.player, "engines", 1);
      show(g, tx("wiki.filler-events.you-find-what-appears-to-be"), undefined, [tx("wiki.filler-events.hull-damage-5"), tx("wiki.filler-events.1-damage-to-engines")]);
      return;
    }
    if (r === "scrap") {
      show(g, tx("wiki.filler-events.you-find-a-pirate-ship-damaged"), rollStandard(g));
      return;
    }
    asteroidRemains(g);
  },
  "c:dense-asteroid-field-distress:1": (g) => {
    show(g, tx("wiki.filler-events.discretion-is-the-better-part-of"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "c:dense-asteroid-field-distress:2": (g) => {
    if (!g.augments.includes("keel")) return;
    asteroidRemains(g);
  },
  "s:dense-asteroid-field-distress:weapon": (g) => {
    show(g, tx("wiki.filler-events.your-crew-grabs-what-they-can"), scrapOnly(g, "low"), [grantRandomItem(g, "weapon")]);
  },
  "s:dense-asteroid-field-distress:pod": (g) => {
    // Damaged Stasis Pod can be held more than once. Three augments is the ship cap. INFERRED: a fourth is not installed.
    const note = receiveAugment(g, "stasis") === "queued" ? tx("wiki.filler-events.no-free-augmentation-slot-for-the") : tx("wiki.filler-events.damaged-stasis-pod");
    show(g, tx("wiki.filler-events.your-crew-drags-the-pod-back"), scrapOnly(g, "low"), [note]);
  },

  // Disabled Rock ship. Strip lists two results and prints no odds. INFERRED: equal.
  // Leave prints the nothing result twice. The Slug lookout's two sentences are alternatives. INFERRED: equal.
  "c:disabled-rock-ship:0": (g) => {
    const offer = rollStandard(g);
    if (weighted(g, [["patrol", 1], ["quiet", 1]] as const) === "patrol") {
      payOffer(g, offer, true);
      for (const line of standardLines(offer)) log(g, line);
      fight(g, tx("wiki.filler-events.a-rock-patrol-ship-jumps-in"), tx("wiki.filler-events.rock-ship"), "disabled-rock-ship");
      return;
    }
    show(g, tx("wiki.filler-events.you-salvage-what-you-can-from"), offer);
  },
  "c:disabled-rock-ship:1": (g) => {
    if (weighted(g, [["nothing", 2], ["fight", 1]] as const) === "nothing") {
      show(g, tx("wiki.filler-events.the-rock-people-are-not-known"), undefined, [tx("wiki.filler-events.nothing-happens")]);
      return;
    }
    fight(g, tx("wiki.filler-events.before-you-have-a-chance-to"), tx("wiki.filler-events.rock-ship"), "disabled-rock-ship");
  },
  "c:disabled-rock-ship:2": (g) => {
    if (!livingKin(g, "gel")) return;
    const line = weighted(g, [["clear", 1], ["ship", 1]] as const) === "clear"
      ? tx("wiki.filler-events.you-salvage-what-you-can-from-2")
      : tx("wiki.filler-events.you-begin-the-salvage-operation-but");
    show(g, line, rollStandard(g));
  },

  // Mantis fugitive. Each list prints no odds. INFERRED: equal.
  // The thanked Mantis is not named, so that crewmember is not added.
  "c:mantis-fugitive:0": (g) => {
    if (weighted(g, [["trap", 1], ["thanks", 1]] as const) === "trap") {
      if (hurt(g, 5)) return;
      const lines = [tx("wiki.filler-events.hull-damage-5"), hurtRandomSystem(g), roomBar(g)].filter(Boolean);
      for (const line of lines) log(g, line);
      fight(g, tx("wiki.filler-events.it-was-a-trap-the-mantis"), tx("wiki.filler-events.engi-ship"), "mantis-fugitive");
      mantisControlled(g);
      return;
    }
    fight(g, tx("wiki.filler-events.he-expresses-his-thanks-and-prepares"), tx("wiki.filler-events.engi-ship"), "mantis-fugitive");
  },
  "c:mantis-fugitive:1": (g) => {
    const r = weighted(g, [["scrap", 1], ["fire", 1], ["trap", 1]] as const);
    if (r === "scrap") {
      show(g, tx("wiki.filler-events.the-engi-captain-is-delighted-and"), scrapOnly(g, "high"));
      return;
    }
    if (r === "fire") {
      if (hurt(g, 5)) return;
      show(g, tx("wiki.filler-events.fury-sparks-in-the-eyes-of"), scrapOnly(g, "high"), [tx("wiki.filler-events.hull-damage-5"), rockFires(g)]);
      return;
    }
    fight(g, tx("wiki.filler-events.the-pursuing-ship-responds-with-a"), tx("wiki.filler-events.engi-ship"), "mantis-fugitive");
    mantisBoarders(g, 1, 1);
    mantisControlled(g);
  },

  // Slug ship boarding Rock ship. Engage lists a fight and a back-down and prints no odds. INFERRED: equal.
  // Ignore prints the nothing result twice.
  "c:slug-ship-boarding-rock-ship:0": (g) => {
    if (weighted(g, [["fight", 1], ["down", 1]] as const) === "fight") {
      fight(g, tx("wiki.filler-events.you-charge-weapons-and-the-slugs"), tx("wiki.filler-events.slug-ship"), "slug-ship-boarding-rock-ship");
      return;
    }
    show(g, tx("wiki.filler-events.you-charge-your-weapons-and-the"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "c:slug-ship-boarding-rock-ship:1": (g) => {
    if (weighted(g, [["nothing", 2], ["fight", 1]] as const) === "nothing") {
      show(g, tx("wiki.filler-events.you-have-no-desire-to-provoke"), undefined, [tx("wiki.filler-events.nothing-happens")]);
      return;
    }
    fight(g, tx("wiki.filler-events.after-the-slugs-board-the-ship"), tx("wiki.filler-events.rock-ship"), "slug-ship-boarding-rock-ship-rock");
  },

  // Rock and Slug standoff. The debt is 10-15 scrap, shown on the button. Demand lists three results and prints no odds. INFERRED: equal.
  "c:rock-and-slug-standoff:0": (g) => {
    const debt = between(g, [10, 15]);
    card(g, tx("wiki.filler-events.the-slug-captain-explains-that-they"), [
      { id: `s:rock-slug:debt:${debt}`, label: tx("wiki.filler-events.offer-to-pay-off-the-rock", { debt: debt }) },
      { id: "s:rock-slug:demand", label: tx("wiki.filler-events.demand-the-rock-ship-pay-the") },
      { id: "s:rock-slug:leave", label: tx("wiki.filler-events.you-have-better-things-to-attend") },
    ]);
  },
  "c:rock-and-slug-standoff:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },

  // Lanius ship absorbing rebel base. Three results and no odds. INFERRED: equal.
  // The fight pays default rewards, not up front.
  "c:lanius-ship-absorbing-rebel-base:0": (g) => {
    const r = weighted(g, [["delay", 1], ["fight", 1], ["nothing", 1]] as const);
    if (r === "delay") {
      delayFleetOne(g);
      show(g, tx("wiki.filler-events.you-try-your-best-to-convey"), rollStandard(g, "medium"), [tx("wiki.filler-events.rebel-fleet-is-delayed-for-1")]);
      return;
    }
    if (r === "fight") {
      fight(g, tx("wiki.filler-events.you-try-your-best-to-convey-2"), tx("wiki.filler-events.lanius-ship"), "lanius-ship-absorbing-rebel-base-fight");
      return;
    }
    show(g, tx("wiki.filler-events.you-try-your-best-to-convey-3"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "c:lanius-ship-absorbing-rebel-base:1": (g) => {
    show(g, tx("wiki.filler-events.you-decide-it-would-be-better"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },

  // Mantis ships battle for Rock freighter. Two fights and no odds. INFERRED: equal.
  // The weakened ship has Weapon Control reduced by 2. A ship with fewer bars loses only those bars. INFERRED.
  "c:mantis-ships-battle-for-rock-freighter:0": (g) => {
    const weak = weighted(g, [["weak", 1], ["full", 1]] as const) === "weak";
    const text = weak
      ? tx("wiki.filler-events.the-mantis-craft-are-both-too")
      : tx("wiki.filler-events.the-mantis-craft-may-have-their");
    fight(g, text, tx("wiki.filler-events.mantis-ship"), "mantis-ships-battle-for-rock-freighter");
    if (weak && g.enemy) hurtSystem(g.enemy, "weapons", 2);
  },
  "c:mantis-ships-battle-for-rock-freighter:1": (g) => {
    show(g, tx("wiki.filler-events.there-s-quite-enough-action-here"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  // Repair Drone. High standard. Printed bug: no drone part is required when that reward includes drone parts.
  // The unnamed standard bonus stays unwired.
  "c:mantis-ships-battle-for-rock-freighter:2": (g) => {
    if (!ownsDrone(g, "patch")) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(g, rollStandard(g, "high"), tx("wiki.filler-events.while-the-two-mantis-fight-you"), hull, lines);
  },
  // Hull Repair Drone. One drone part, then a Mantis ship. The bug note is not on this choice.
  "c:mantis-ships-battle-for-rock-freighter:3": (g) => {
    if (!ownsDrone(g, "hull") || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.filler-events.drone-parts-1"));
    fight(g, tx("wiki.filler-events.while-the-two-mantis-fight-you-2"), tx("wiki.filler-events.mantis-ship"), "mantis-ships-battle-for-rock-freighter");
  },

  // Rock live mine. The turning circle always fails. The defuse lists two results and prints no odds. INFERRED: equal.
  "c:rock-live-mine:0": (g) => {
    card(g, tx("wiki.filler-events.the-ship-s-turning-circle-proves"), [
      { id: "s:rock-mine:defuse", label: tx("wiki.filler-events.send-someone-out-there-to-defuse") },
      { id: "s:rock-mine:missile", label: tx("wiki.filler-events.attempt-a-controlled-detonation-using-a") },
      { id: "s:rock-mine:beam", label: tx("wiki.filler-events.use-a-drone-to-cut-away") },
    ]);
  },
  "c:rock-live-mine:1": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 5) return;
    show(g, tx("wiki.filler-events.it-stresses-the-inertial-dampeners-but"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "s:rock-mine:defuse": (g) => {
    if (weighted(g, [["scrap", 1], ["wires", 1]] as const) === "scrap") {
      show(g, tx("wiki.filler-events.your-crewmember-dons-a-space-suit"), scrapOnly(g, "medium"));
      return;
    }
    card(g, tx("wiki.filler-events.your-crewmember-dons-a-space-suit-2"), [
      { id: "s:rock-mine:red", label: tx("wiki.filler-events.red") },
      { id: "s:rock-mine:blue", label: tx("wiki.filler-events.blue") },
    ]);
  },
  // Both colors load Cut the wire. Two results and no odds. INFERRED: equal.
  "s:rock-mine:red": (g) => cutMineWire(g),
  "s:rock-mine:blue": (g) => cutMineWire(g),
  // Trivia: the missile item type is misspelled, so the ammo is not spent. Hull Missile does not count.
  "s:rock-mine:missile": (g) => {
    if (!miningMissile(g)) return;
    if (hurt(g, 4)) return;
    show(g, tx("wiki.filler-events.after-drawing-straws-a-crewmember-goes"), scrapOnly(g, "low"), [tx("wiki.filler-events.hull-damage-4"), hurtRandomSystem(g)]);
  },
  // Beam Drone. One drone part, then low scrap. The Anti-Ship Fire Drone does not count.
  "s:rock-mine:beam": (g) => {
    if (!ownsMineBeam(g) || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, tx("wiki.filler-events.drone-parts-1"));
    show(g, tx("wiki.filler-events.carefully-guided-from-the-bridge-your"), scrapOnly(g, "low"), [tx("wiki.filler-events.drone-parts-1")]);
  },

  // Engi smashed ships. "a random amount of resources with some scrap."
  // Rewards Stuff includes an unnamed bonus item. That grant stays unwired.
  "c:engi-smashed-ships:2": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, tx("wiki.filler-events.your-engi-crewmember-refuses-in-a"), rollSurrenderOffer(g, undefined, true));
  },
  "c:lanius-ship-absorbing-rebel-base:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    delayFleetOne(g);
    show(g, tx("wiki.filler-events.your-crewmember-tells-them-of-the"), rollStandard(g, "medium"), [tx("wiki.filler-events.rebel-fleet-is-delayed-for-1")]);
  },
  // Lanius ship absorbing jump beacon. Two ask results and no odds. INFERRED: equal.
  // Giving them 30 scrap grants an unnamed augmentation and stays off this card.
  "c:lanius-ship-absorbing-jump-beacon:0": (g) => {
    if (weighted(g, [["talk", 1], ["fight", 1]] as const) === "fight") {
      fight(g, tx("wiki.filler-events.you-begin-to-message-the-ship"), tx("wiki.filler-events.lanius-ship"), "lanius-ship-absorbing-jump-beacon");
      return;
    }
    card(g, tx("wiki.filler-events.after-a-long-message-the-translator"), [
      { id: "s:lanius-beacon-eater:leave", label: tx("wiki.filler-events.leave") },
    ]);
  },
  "c:lanius-ship-absorbing-jump-beacon:1": (g) => beaconEaterLeave(g),
  "s:lanius-beacon-eater:leave": (g) => beaconEaterLeave(g),
  // Lanius crew. Decline does nothing. The 30 scrap, 6 missile, and 6 drone-part trades grant an unnamed augmentation and stay unwired.
  "c:lanius-ship-absorbing-jump-beacon:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    card(g, tx("wiki.filler-events.after-a-time-you-are-told"), [
      { id: "s:lanius-beacon-eater:decline", label: tx("wiki.filler-events.decline") },
    ]);
  },
  "s:lanius-beacon-eater:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  // Lanius craftsmen. 45, 50, and 40 scrap. The item is not named: Rewards, "Augment" / "Weapon" / "Drone".
  // {{Blue Option|Lanius Crew|Offer to help in the process.}} is the same trades at a 10 scrap discount.
  "c:lanius-craftsmen:0": (g) => {
    craftsmenMenu(g, false);
  },
  "s:lanius-craftsmen:aug": (g) => {
    craftItem(g, 45, "augment", tx("wiki.filler-events.you-transfer-over-the-scrap-and"));
  },
  "s:lanius-craftsmen:weapon": (g) => {
    craftItem(g, 50, "weapon", tx("wiki.filler-events.you-transfer-over-the-scrap-and-2"));
  },
  "s:lanius-craftsmen:drone": (g) => {
    craftItem(g, 40, "drone", tx("wiki.filler-events.you-transfer-over-the-scrap-and-3"));
  },
  "s:lanius-craftsmen:help": (g) => {
    if (!livingKin(g, "voidlung")) return;
    craftsmenMenu(g, true);
  },
  "s:lanius-craftsmen:help:aug": (g) => {
    craftItem(g, 35, "augment", tx("wiki.filler-events.you-transfer-over-the-scrap-and"));
  },
  "s:lanius-craftsmen:help:weapon": (g) => {
    craftItem(g, 40, "weapon", tx("wiki.filler-events.you-transfer-over-the-scrap-and-2"));
  },
  "s:lanius-craftsmen:help:drone": (g) => {
    craftItem(g, 30, "drone", tx("wiki.filler-events.you-transfer-over-the-scrap-and-3"));
  },
  "s:lanius-craftsmen:decline": (g) => {
    show(g, tx("wiki.filler-events.you-thank-them-for-the-information"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  "c:lanius-craftsmen:1": (g) => {
    show(g, tx("wiki.filler-events.while-replicating-their-innate-ability-would"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  // Crew hiring station. "Don't hire anyone." Nothing happens.
  // The 25-45 and 25-55 scrap hires grant an unnamed crewmember and stay unwired.
  "c:crew-hiring-station:0": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  // Hull Repair Drone. The page prints no drone-part cost, so the part stays.
  // A full ship refuses the crewmember. INFERRED from the crew cap. The page does not print that sentence.
  "c:lanius-ship-absorbing-jump-beacon:3": (g) => {
    if (!ownsDrone(g, "hull")) return;
    const joined = joinCrew(g, tx("wiki.filler-events.lanius"));
    show(g, tx("wiki.filler-events.as-soon-as-the-drone-gets"), undefined, [
      joined ? tx("wiki.filler-events.you-receive-a-lanius-crewmember") : tx("wiki.filler-events.there-is-no-room-aboard-for"),
    ]);
  },
  // Lanius ship attacking civilian distress. Two results and no odds. INFERRED: equal.
  // A fight pays the page's medium or high standard. Powering down skips that and opens the same contact.
  "c:lanius-ship-attacking-civilian-distress:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    if (weighted(g, [["fight", 1], ["peace", 1]] as const) === "fight") {
      fight(g, tx("wiki.filler-events.the-ship-refuses-all-hails-even"), tx("wiki.filler-events.lanius-ship"), "lanius-ship-attacking-civilian-distress");
      return;
    }
    card(g, tx("wiki.filler-events.after-a-discussion-that-your-translator"), [
      { id: "q:lanius-civilian:contact", label: tx("wiki.filler-events.contact-the-civilian-ship") },
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
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "c:refugee-distress-zoltan:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-zoltan:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-distress-zoltan:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  // "Contact the refugee ship." Low scrap with resources. The fight reward is already paid.
  "s:refugee-zoltan:contact": refugeeZoltanContact,
  "s:refugee-distress-zoltan:contact": refugeeZoltanContact,
  // Refugee (Pirate). type=pirate. Not the Zoltan ship, the pirate ambush, or the Slug hunt.
  "c:refugee-pirate:0": (g) => refugeePirateHail(g, "refugee-pirate"),
  "c:refugee-pirate:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-pirate:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-pirate:contact": refugeeZoltanContact,
  "s:refugee-pirate:contact-dead": refugeePirateFollow,
  // Refugee distress (Pirate). Same type=pirate hail as Refugee (Pirate).
  "c:refugee-distress-pirate:0": (g) => refugeePirateHail(g, "refugee-distress-pirate"),
  "c:refugee-distress-pirate:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-distress-pirate:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-distress-pirate:contact": refugeeZoltanContact,
  "s:refugee-distress-pirate:contact-dead": refugeePirateFollow,
  // Refugee (Slug). type=slug uses the same pirate bait as type=pirate, not the Slug hunt.
  "c:refugee-slug:0": (g) => refugeePirateHail(g, "refugee-slug"),
  "c:refugee-slug:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-slug:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-slug:contact": refugeeZoltanContact,
  "s:refugee-slug:contact-dead": refugeePirateFollow,
  // Refugee distress (Slug). Same type=slug hail as Refugee (Slug).
  "c:refugee-distress-slug:0": (g) => refugeePirateHail(g, "refugee-distress-slug"),
  "c:refugee-distress-slug:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-distress-slug:decline": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },
  "s:refugee-distress-slug:contact": refugeeZoltanContact,
  "s:refugee-distress-slug:contact-dead": refugeePirateFollow,
  "c:refugee-distress:0": (g) => refugeeHail(g, "refugee-distress"),
  "c:refugee-distress:1": done,
  "s:refugee:decline": done,
  "s:refugee-distress:decline": done,

  // ---- Intelligent ponies ----
  "c:intelligent-ponies:0": (g) => {
    card(g, tx("wiki.filler-events.you-land-a-small-shuttle-in"), [
      { id: "s:intelligent-ponies:talk", label: tx("wiki.filler-events.try-to-communicate-peacefully") },
      { id: "s:intelligent-ponies:sell", label: tx("wiki.filler-events.bring-some-of-the-creatures-on") },
      { id: "s:intelligent-ponies:leave", label: tx("wiki.filler-events.leave") },
    ]);
  },
  "s:intelligent-ponies:talk": (g) => {
    if (rand(g) < 0.5) {
      show(g, tx("wiki.filler-events.none-of-your-attempts-to-communicate"), rollStandard(g, "low"), [gainCrew(g, tx("wiki.filler-events.engi"))]);
    } else show(g, tx("wiki.filler-events.you-try-to-communicate-in-every"));
  },
  "s:intelligent-ponies:sell": (g) => {
    if (rand(g) < 0.5) {
      show(g, tx("wiki.filler-events.the-seemingly-docile-creatures-quickly-turn"), undefined, [loseCrew(g)]);
    } else show(g, tx("wiki.filler-events.the-seemingly-docile-creatures-quickly-turn-2"));
  },
  "s:intelligent-ponies:leave": (g) => show(g, tx("wiki.filler-events.this-isn-t-the-time-for")),
  "c:intelligent-ponies:1": (g) => show(g, tx("wiki.filler-events.you-ignore-the-readings-and-prepare"), undefined, [tx("wiki.filler-events.nothing-happens")]),

  // ---- Abandoned station ----
  "c:abandoned-station:0": (g) => {
    // DuplicateEvent|2 is the two printed supply lines. INFERRED: equal, so scrap stays twice as common.
    const r = weighted(g, [["rest", 1], ["hull", 1], ["pirates", 1], ["battery", 1], ["clone", 1], ["shell", 1]] as const);
    if (r === "rest") show(g, tx("wiki.filler-events.you-approach-cautiously-but-you-detect"), scrapOnly(g, "low"));
    else if (r === "hull") show(g, tx("wiki.filler-events.upon-closer-inspection-it-appears-to"), scrapOnly(g, "low"));
    else if (r === "pirates") {
      fight(g, tx("wiki.filler-events.you-dock-with-the-station-to"), tx("wiki.filler-events.pirate-ship"), "abandoned-station");
      // "2 boarders beam aboard your ship" (surrender.ts humanBoarders, the same intruder kit).
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      log(g, tx("wiki.filler-events.you-dock-with-the-station-to-2"));
      humanBoarders(g, 2, 4, tx("wiki.filler-events.boarders-beam-aboard"));
      beginBoarding(g, true);
    } else if (r === "clone") {
      // {{Blue Option|Clonebay|Search for a surviving DNA bank.}} The button stays visible.
      card(g, tx("wiki.filler-events.the-station-is-in-disarray-you"), [
        { id: "s:abandoned-station:dna", label: tx("wiki.quests.search-for-a-surviving-dna-bank") },
        { id: "s:abandoned-station:scrap", label: tx("wiki.filler-events.scrap-the-machinery") },
      ]);
    } else show(g, tx("wiki.filler-events.as-you-approach-it-becomes-clear"));
  },
  "s:abandoned-station:scrap": (g) => show(g, tx("wiki.filler-events.you-take-what-you-can-and"), scrapOnly(g, "low")),
  // Clonebay DNA. DuplicateEvent|2 calm crewmember, or 1 crazed boarder. No printed odds (weight 2 / 1).
  // The two calm sentences are the duplicate. INFERRED: equal inside that weight. The boarder's race is not named.
  "s:abandoned-station:dna": (g) => {
    if ((g.player.kits.cradle?.level ?? 0) <= 0) return;
    const rebuilt = tx("wiki.quests.while-the-cloning-facilities-are-no");
    if (weighted(g, [["calm", 2], ["crazed", 1]] as const) === "crazed") {
      log(g, tx("wiki.quests.the-clone-emerges-in-a-crazed", { rebuilt }));
      humanBoarders(g, 1, 1, tx("wiki.quests.boarder-beams-aboard"));
      beginBoarding(g);
      return;
    }
    const calm = rand(g) < 0.5
      ? tx("wiki.quests.the-clone-is-extremely-confused-but", { rebuilt })
      : tx("wiki.quests.the-clone-is-extremely-confused-but-2", { rebuilt });
    show(g, calm, undefined, [gainCrew(g)]);
  },
  // Abandoned station. "Stay near the Beacon." One printed result.
  "c:abandoned-station:1": (g) => show(g, tx("wiki.filler-events.you-decide-it-s-not-worth"), undefined, [tx("wiki.filler-events.nothing-happens")]),

  // ---- Terraforming scan ----
  "c:terraforming-scan:0": (g) => {
    card(g, tx("wiki.filler-events.thank-you-we-need-to-scan"), [
      { id: "s:terraforming-scan:scan", label: tx("wiki.filler-events.attempt-to-scan-the-planet") },
      { id: "s:terraforming-scan:sensors", label: tx("wiki.filler-events.set-sensors-to-maximum-and-scan") },
      { id: "s:terraforming-scan:zoltan", label: tx("wiki.filler-events.send-your-crewman-to-overcharge-their") },
    ]);
  },
  // Attempt to scan. One of the two printed results. INFERRED: equal. The modulate line is only this success.
  // Improved Sensors and a Zoltan go straight to Successful Scan and do not print it.
  "s:terraforming-scan:scan": (g) => {
    if (rand(g) < 0.5) {
      show(g, tx("wiki.filler-events.it-seems-your-sensors-are-no"));
      return;
    }
    successfulScan(g, tx("wiki.filler-events.you-find-if-you-modulate-the"));
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
    const n = between(g, [15, 25]);
    card(g, tx("wiki.filler-events.but-our-livelihood-depends-on-this"), [
      { id: `s:terraforming-scan:bribe:${n}`, label: tx("wiki.filler-events.accept-the-bribe-and-leave-scrap", { n: n }) },
      { id: `s:terraforming-scan:pay:${n}`, label: tx("wiki.filler-events.offer-to-pay-them-to-at", { n: n }) },
      { id: "s:terraforming-scan:demand", label: tx("wiki.filler-events.power-your-weapons-and-demand-they") },
    ]);
  },
  "s:terraforming-scan:demand": (g) => show(g, tx("wiki.filler-events.they-shut-off-communications-but-you")),
  "s:terraforming-scan:leave": done,
  "c:terraforming-scan:1": (g) => show(g, tx("wiki.filler-events.we-understand-best-of-luck-on")),

  // ---- Nebula lost ship ----
  "c:nebula-lost-ship:0": (g) => {
    const r = weighted(g, [["found", 1], ["rebel", 1], ["none", 1]] as const);
    if (r === "found") show(g, tx("wiki.filler-events.you-get-lucky-and-find-them"), undefined, [gainCrew(g)]);
    else if (r === "rebel") fight(g, tx("wiki.filler-events.while-searching-fruitlessly-through-the-nebula"), tx("wiki.filler-events.rebel-ship"), "nebula-lost-ship");
    else show(g, tx("wiki.filler-events.your-search-is-hopeless-your-sensors"));
  },
  "c:nebula-lost-ship:1": done,
  // {{Blue Option|Teleporter}}. A crewmember and medium scrap.
  "c:nebula-lost-ship:2": (g) => {
    if ((g.player.kits.sling?.level ?? 0) <= 0) return;
    show(g, tx("wiki.filler-events.you-beam-the-federation-crew-aboard"), scrapOnly(g, "medium"), [gainCrew(g)]);
  },
  // {{Blue Option|Long-ranged Scanner}}. A crewmember, or medium scrap. No odds. INFERRED: equal.
  "c:nebula-lost-ship:3": (g) => {
    if (!g.augments.includes("glass")) return;
    if (rand(g) < 0.5) show(g, tx("wiki.filler-events.you-follow-the-faint-signatures"), undefined, [gainCrew(g)]);
    else show(g, tx("wiki.filler-events.your-local-radar-flickers"), scrapOnly(g, "medium"));
  },

  // ---- Plasma storm incapacitated ships ----
  "c:plasma-storm-incapacitated-ships:0": (g) => {
    const r = weighted(g, [["debris", 1], ["passenger", 1], ["tether", 1], ["schematic", 1], ["weapon", 1]] as const);
    if (r === "debris") {
      // "4 hull damage, a breach to a random system" and high resources with some scrap.
      // The breach does not destroy the system.
      if (hurt(g, 4)) return;
      const breach = breachRandomSystem(g);
      show(g, tx("wiki.filler-events.despite-your-caution-the-lack-of"), rollSurrenderOffer(g, "high", true), [tx("wiki.filler-events.hull-damage-4"), breach]);
    } else if (r === "passenger") {
      show(g, tx("wiki.filler-events.within-the-ship-graveyard-you-find"), rollStandard(g, "low"), [gainCrew(g)]);
    } else if (r === "tether") {
      show(g, tx("wiki.filler-events.while-the-crew-is-off-the"), rollStandard(g, "low"), [loseCrew(g)]);
    } else if (r === "schematic") {
      // A drone schematic with medium scrap. Rewards, "Drone": "A random drone schematic & T scrap."
      show(g, tx("wiki.filler-events.among-the-junk-and-scrap-you"), scrapOnly(g, "medium"), [grantRandomItem(g, "drone")]);
    } else {
      show(g, tx("wiki.filler-events.most-of-the-debris-is-hardly"), weaponOffer(g, "medium"));
    }
  },
  "c:plasma-storm-incapacitated-ships:1": done,
  // {{Blue Option|Piloting|level=2+}}. Four results, no odds. INFERRED: equal.
  // The weapon result is low scrap. The manual search's weapon result is medium.
  "c:plasma-storm-incapacitated-ships:2": (g) => {
    if ((g.player.systems.pilot?.level ?? 0) < 2) return;
    const r = weighted(g, [["passenger", 1], ["schematic", 1], ["weapon", 1], ["nothing", 1]] as const);
    if (r === "passenger") {
      show(g, tx("wiki.filler-events.within-the-ship-graveyard-you-find-2"), rollStandard(g, "low"), [gainCrew(g)]);
    } else if (r === "schematic") {
      show(g, tx("wiki.filler-events.among-the-junk-and-scrap-you"), scrapOnly(g, "medium"), [grantRandomItem(g, "drone")]);
    } else if (r === "weapon") {
      show(g, tx("wiki.filler-events.most-of-the-debris-is-hardly"), weaponOffer(g, "low"));
    } else {
      show(g, tx("wiki.filler-events.your-pilot-carefully-explores-the-wrecks"), undefined, [tx("wiki.filler-events.nothing-happens")]);
    }
  },

  // ---- Friendly ship out of fuel (the give id carries the amount; fillerChoose parses it) ----
  "c:friendly-ship-out-of-fuel:1": (g) => show(g, tx("wiki.filler-events.we-understand-please-send-help-our")),

  // ---- Refugee comms down ----
  "c:refugee-comms-down:0": (g) => {
    const r = weighted(g, [["cannibals", 1], ["freezer", 1], ["supplies", 1], ["boarders", 1], ["ghost", 1]] as const);
    if (r === "cannibals") {
      // Clone Bay revives them. The page prints that waiting sentence, then "The lost crewmember is revived."
      const extras = [loseCrew(g)];
      if (g.player.kits.cradle) extras.unshift(tx("wiki.filler-events.your-abandoned-crewmember-is-waiting-on"));
      show(g, tx("wiki.filler-events.as-you-investigate-the-ship-you"), undefined, extras);
    }
    else if (r === "freezer") show(g, tx("wiki.filler-events.it-looks-as-if-the-ship"), undefined, [gainCrew(g)]);
    else if (r === "supplies") show(g, tx("wiki.filler-events.the-ship-is-completely-abandoned-it"), resource(g, "missiles", [2, 4], "medium"));
    else if (r === "boarders") {
      log(g, tx("wiki.filler-events.as-you-approach-the-ship-the"));
      humanBoarders(g, 2, 4, tx("wiki.filler-events.human-boarders-beam-aboard"));
      beginBoarding(g);
    } else show(g, tx("wiki.filler-events.the-ship-is-completely-abandoned-there"));
  },
  "c:refugee-comms-down:1": done,
  "c:empty-nebula-beacon:0": done,

  // Boarders: Humans (Abandoned). The page has no choice. Arrival calls this id so the red line
  // "3-4 human boarders beam aboard your ship" is the outcome, not a button. No ship.
  // After a Lanius fight, and on a repeat before another fight, they have Emergency Respirators.
  // INFERRED: lastFaction is that fight.
  "c:boarders-humans-abandoned:0": (g) => {
    const lungs = g.lastFaction === "lanius";
    humanBoarders(g, 3, 4, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"), lungs);
    beginBoarding(g);
  },

  // Boarders: Humans (Pirate). The page has no choice. Arrival calls this id so the red line
  // "3-5 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). No ship. No lungs. Not a crew grant.
  "c:boarders-humans-pirate:0": (g) => {
    humanBoarders(g, 3, 5, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },

  // Boarders: Humans near sun. The page has no choice. Arrival calls this id so the red line
  // "2-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). redgiant=true arms the existing flare clock. No ship.
  "c:boarders-humans-near-sun:0": (g) => {
    humanBoarders(g, 2, 4, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g, false, true);
  },

  // Boarders: Rockmen near sun. The page has no choice. Arrival calls this id so the red line
  // "2-3 rock boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). redgiant=true arms the existing flare clock. No ship. Not a crew grant.
  "c:boarders-rockmen-near-sun:0": (g) => {
    rockBoarders(g, 2, 3);
    beginBoarding(g, false, true);
  },

  // Boarders: Mantis. The page has no choice. Arrival calls this id so the red line
  // "2-4 mantis boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). No ship. Not a crew grant.
  "c:boarders-mantis:0": (g) => {
    mantisBoarders(g, 2, 4);
    beginBoarding(g);
  },

  // Boarders: Humans in nebula. The page has no choice. Arrival calls this id so the red line
  // "2-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). nebula=true is the beacon, not a new hazard. No ship.
  "c:boarders-humans-in-nebula:0": (g) => {
    humanBoarders(g, 2, 4, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },

  // Boarders: rebels in nebula. The page has no choice. Arrival calls this id so the red line
  // "3-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). nebula=true is the beacon, not a new hazard. No ship.
  "c:boarders-rebels-in-nebula:0": (g) => {
    humanBoarders(g, 3, 4, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },

  // Boarders: Crystal. The page has no choice. Arrival calls this id so the red line
  // "2-3 crystal boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). unique=false: Template:Locations says this event can occur multiple times per sector.
  // No ship. Not a crew grant.
  "c:boarders-crystal:0": (g) => {
    crystalBoarders(g, 2, 3);
    beginBoarding(g);
  },

  // Boarders: Humans jammed sensors. "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
  // INFERRED: the count is inclusive (between()). No ship. Not a crew grant.
  "c:boarders-humans-jammed-sensors:0": (g) => {
    log(g, tx("wiki.filler-events.until-you-are-able-to-jump"));
    shutPlayerSensors(g);
    humanBoarders(g, 3, 5, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },

  // Refueling station. "Buy 6 Fuel for 12 Scrap", "Buy 3 Fuel for 6 Scrap", "Buy 1 Fuel for 2 Scrap".
  "c:refueling-station:0": (g) => buyFuel(g, 12, 6),
  "c:refueling-station:1": (g) => buyFuel(g, 6, 3),
  "c:refueling-station:2": (g) => buyFuel(g, 2, 1),
  "c:refueling-station:3": done,

  // Asteroid mining colony. The launch "has no effect" and the non-blue choices return.
  "c:asteroid-mining-colony:0": (g) => {
    if (!miningMissile(g)) return;
    card(g, tx("wiki.filler-events.while-i-appreciate-your-enthusiasm-we"), miningOffers());
  },
  "c:asteroid-mining-colony:1": (g) => giveMiners(g, 5),
  "c:asteroid-mining-colony:2": (g) => giveMiners(g, 15),
  "c:asteroid-mining-colony:3": (g) => {
    show(g, tx("wiki.filler-events.i-understand-good-luck-out-there"));
  },

  // Improve reactor for supplies. The static agree button opens the priced card.
  "c:improve-reactor-for-supplies:0": (g) => {
    const ev = supplyCard(g, pageBySlug("improve-reactor-for-supplies")!);
    g.event = ev;
    g.phase = "event";
    g.paused = true;
  },
  "c:improve-reactor-for-supplies:1": (g) => {
    show(g, tx("wiki.filler-events.you-decide-you-need-what-supplies"));
  },

  // Giant alien spiders. Two crew results, no odds. INFERRED: equal.
  "c:giant-alien-spiders:0": (g) => {
    const r = weighted(g, [["lose", 1], ["reward", 1]] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, tx("wiki.filler-events.your-crew-boards-the-station-cautiously"), undefined, note ? [note] : []);
      return;
    }
    show(g, tx("wiki.filler-events.your-crew-slowly-creeps-up-on"), rollSurrenderOffer(g, "high", true));
  },
  "c:giant-alien-spiders:1": (g) => {
    show(g, tx("wiki.filler-events.you-can-t-risk-fighting-some"));
  },
  "c:giant-alien-spiders:2": (g) => {
    spiderDrone(g, "personnel", tx("wiki.filler-events.you-pull-up-alongside-the-station"));
  },
  "c:giant-alien-spiders:3": (g) => {
    spiderDrone(g, "board", tx("wiki.filler-events.you-launch-the-drone-and-it"));
  },
  "c:giant-alien-spiders:4": (g) => {
    if (!ownsAntiBio(g)) return;
    show(g, tx("wiki.filler-events.you-instruct-them-to-drop-their"), rollSurrenderOffer(g, "high", true));
  },

  // Crushed pirate. Each pair of results has no odds. INFERRED: equal.
  "c:crushed-pirate:0": (g) => {
    const r = weighted(g, [["shock", 1], ["free", 1]] as const);
    if (r === "shock") {
      if (hurt(g, 2)) return;
      show(g, tx("wiki.filler-events.you-take-a-few-careful-shots"), scrapOnly(g, "low"), [tx("wiki.filler-events.hull-damage-2"), hurtRandomSystem(g, 2)]);
      return;
    }
    show(g, tx("wiki.filler-events.you-fire-a-few-volleys-into"), rollStandard(g, "medium"));
  },
  "c:crushed-pirate:1": (g) => {
    const r = weighted(g, [["loot", 1], ["fight", 1]] as const);
    if (r === "loot") {
      show(g, tx("wiki.filler-events.you-decide-the-pirate-is-not"), rollStandard(g, "medium"));
      return;
    }
    // Fight a Pirate ship (default rewards). The PIRATE surrender and escape rows are that faction's plan.
    fight(g, tx("wiki.filler-events.you-decide-the-pirate-is-not-2"), tx("wiki.filler-events.pirate-ship"), "crushed-pirate");
  },
  "c:crushed-pirate:2": (g) => {
    if (!ownsCuttingBeam(g)) return;
    show(g, tx("wiki.filler-events.you-use-your-beam-to-make"), rollStandard(g, "medium"));
  },
  "c:crushed-pirate:3": (g) => {
    if (!ownsBeamDrone(g)) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(g, rollStandard(g, "medium"), tx("wiki.filler-events.you-program-the-drone-to-work"), hull, lines);
  },

  // Unknown disease. Two crew results, no odds. INFERRED: equal. Clone Bay does not revive them.
  "c:unknown-disease-on-mining-colony:0": (g) => {
    const r = weighted(g, [["lose", 1], ["nothing", 1]] as const);
    if (r === "nothing") {
      show(g, tx("wiki.filler-events.your-crew-tries-to-keep-the"));
      return;
    }
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.cradle) extras.push(tx("wiki.filler-events.as-your-crewman-is-still-alive"));
    show(g, tx("wiki.filler-events.with-the-visible-threat-of-your"), rollSurrenderOffer(g, "medium", true), extras);
  },
  "c:unknown-disease-on-mining-colony:1": (g) => {
    show(g, tx("wiki.filler-events.unfortunately-your-mission-is-too-important"));
  },
  "c:unknown-disease-on-mining-colony:2": (g) => {
    if (!livingKin(g, "stone")) return;
    show(g, tx("wiki.filler-events.it-s-unlikely-the-rock-s"), rollSurrenderOffer(g, "medium", true));
  },
  "c:unknown-disease-on-mining-colony:3": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, tx("wiki.filler-events.with-no-fear-of-catching-the"), rollSurrenderOffer(g, "medium", true));
  },
  "c:unknown-disease-on-mining-colony:4": (g) => {
    if (medbayLevel(g) < 2) return;
    diseaseCure(g);
  },

  // Fire on research station. Each pair has no odds. INFERRED: equal.
  "c:fire-on-research-station:0": (g) => {
    const r = weighted(g, [["lose", 1], ["scrap", 1]] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, tx("wiki.filler-events.you-send-your-crew-into-the"), scrapOnly(g, "low"), note ? [note] : []);
      return;
    }
    show(g, tx("wiki.filler-events.your-crew-valiantly-keeps-the-fire"), scrapOnly(g, "high"));
  },
  "c:fire-on-research-station:1": (g) => {
    const r = weighted(g, [["blast", 1], ["jones", 1]] as const);
    if (r === "blast") {
      if (hurt(g, 4)) return;
      show(g, tx("wiki.filler-events.you-locate-the-highest-concentration-of"), scrapOnly(g, "low"), [tx("wiki.filler-events.hull-damage-4"), hurtRandomSystem(g)]);
      return;
    }
    // The page names Dr. Jones and not a race. An unnamed race is that sector's crew list.
    const race = randomRace(g);
    const joined = joinCrew(g, race, tx("wiki.filler-events.dr-jones"));
    show(g, tx("wiki.filler-events.you-pull-up-alongside-the-station-2"), scrapOnly(g, "low"), [joined ? tx("wiki.filler-events.dr-jones-joins-you") : tx("wiki.filler-events.there-is-no-room-aboard-for-5")]);
  },
  "c:fire-on-research-station:2": (g) => {
    show(g, tx("wiki.filler-events.you-coldly-shut-off-communications-and"));
  },
  "c:fire-on-research-station:3": (g) => {
    if (!livingKin(g, "stone")) return;
    // An augmentation with high scrap. Rewards, "Augment": "A random augmentation & T scrap."
    show(g, tx("wiki.filler-events.your-rock-soldier-tears-through-the"), scrapOnly(g, "high"), [grantRandomItem(g, "augment")]);
  },
  "c:fire-on-research-station:4": (g) => {
    if (!ownsDrone(g, "patch")) return;
    // A drone schematic with high scrap. Rewards, "Drone": "A random drone schematic & T scrap."
    show(g, tx("wiki.filler-events.you-send-the-repair-drone-in"), scrapOnly(g, "high"), [grantRandomItem(g, "drone")]);
  },

  // Single life form on moon. Two scenes, no odds. INFERRED: equal.
  "c:single-life-form-on-moon:0": (g) => {
    const scene = weighted(g, [["colony", 1], ["cave", 1]] as const);
    if (scene === "colony") {
      card(g, tx("wiki.filler-events.you-find-a-colony-that-seems"), [
        { id: "s:moon:invite", label: tx("wiki.filler-events.invite-him-to-join-your-crew") },
        { id: "s:moon:home", label: tx("wiki.filler-events.take-him-home-to-his-family") },
      ]);
      return;
    }
    moonCave(g);
  },
  "c:single-life-form-on-moon:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },

  // Pirate ship distress trap. Default rewards. The PIRATE surrender and escape rows are that faction's plan.
  "c:pirate-ship-distress-trap:0": (g) => {
    fight(g, g.event?.body ?? TRAP_INTRO[0], tx("wiki.filler-events.pirate-ship"), "pirate-ship-distress-trap");
  },

  // Malfunctioning defense system. Promise opens the options. Leave them alone does nothing.
  "c:malfunctioning-defense-system:0": (g) => {
    card(g, tx("wiki.filler-events.you-consider-your-options"), defenseOptions(g));
  },
  "c:malfunctioning-defense-system:1": (g) => {
    show(g, tx("wiki.filler-events.you-can-t-help-them-so"), undefined, [tx("wiki.filler-events.nothing-happens")]);
  },
  // Simply fire's other printed result (5 hull, 1 random system, 1 breached room) stays unwired.
  // The page prints no odds, so this button does not roll a weight between the two results.
  "c:malfunctioning-defense-system:2": (g) => {
    show(g, tx("wiki.filler-events.you-fire-a-few-volleys-from"), rollStandard(g, "low"));
  },
  // Any ion weapon, including Ion Bomb and Stun Bomb. Missile ammo is not required and not wasted.
  "c:malfunctioning-defense-system:3": (g) => {
    if (!ownsIon(g)) return;
    show(g, tx("wiki.filler-events.you-use-your-ion-weaponry-to"), rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:4": (g) => {
    if (cloakLevel(g) < 1) return;
    show(g, tx("wiki.filler-events.you-use-your-ship-s-cloaking"), rollStandard(g, "low"));
  },
  "c:malfunctioning-defense-system:5": (g) => {
    if (cloakLevel(g) < 2) return;
    show(g, tx("wiki.filler-events.you-use-your-ships-cloaking-to"), rollStandard(g, "medium"));
  },
  "c:malfunctioning-defense-system:6": (g) => {
    if (cloakLevel(g) < 3) return;
    show(g, tx("wiki.filler-events.your-ship-s-advanced-cloaking-allows"), rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:7": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, tx("wiki.filler-events.your-crew-member-is-able-to"), rollStandard(g, "high"));
  },

  // Escape pod. Three pry results, no odds. INFERRED: equal.
  "c:escape-pod:0": (g) => {
    show(g, tx("wiki.filler-events.you-send-the-pod-back-out"));
  },
  "c:escape-pod:1": (g) => {
    const r = weighted(g, [["boarder", 1], ["mantis", 1], ["human", 1]] as const);
    if (r === "boarder") {
      log(g, tx("wiki.filler-events.the-mantis-inside-is-furious-he"));
      const note = loseCrew(g);
      if (note) log(g, note);
      mantisBoarders(g, 1, 1);
      beginBoarding(g);
      return;
    }
    if (r === "mantis") {
      // The crewmember is not named. That grant stays unwired.
      show(g, tx("wiki.filler-events.the-mantis-inside-considers-you-a"));
      return;
    }
    // The crewmember is not named. That grant stays unwired.
    show(g, tx("wiki.filler-events.a-man-bursts-out-of-the"));
  },

  // Confused Mantis. Listening opens the assistance card. Leaving spends nothing.
  "c:confused-mantis:0": (g) => {
    confusedMantisCard(g);
  },
  "c:confused-mantis:1": (g) => {
    show(g, tx("wiki.filler-events.nothing-happens"));
  },

  // Trade scrap for upgrades. "Inquire about their specialty." One of the printed offers, or nothing
  // when every listed system is missing or already at the printed maximum and the reactor is at 25.
  // INFERRED: that empty case uses the decline's "Nothing happens" line.
  "c:trade-scrap-for-upgrades:0": (g) => {
    const list = tradeOffers(g);
    if (!list.length) {
      show(g, tx("wiki.filler-events.you-thank-them-but-prepare-to"));
      return;
    }
    const o = list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
    const cost = between(g, [o.lo, o.hi]);
    card(g, tradeOfferText(o), [
      { id: `s:trade-scrap-for-upgrades:agree:${o.id}:${cost}`, label: tx("wiki.filler-events.agree-to-the-exchange-scrap", { cost: cost }) },
      { id: "s:trade-scrap-for-upgrades:decline", label: tx("wiki.filler-events.decline") },
    ]);
  },

  // Hacking blue option. "3-5 human boarders beam aboard your ship." Sensors flicker back on.
  // "If you counter the jam, the Hacking system is not disabled."
  "c:boarders-humans-jammed-sensors:1": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0) return;
    log(g, tx("wiki.filler-events.your-hacking-system-automatically-counters-the"));
    restorePlayerSensors(g);
    humanBoarders(g, 3, 5, tx("wiki.filler-events.human-boarders-beam-aboard-your-ship"));
    beginBoarding(g);
  },

  // Slaver (hostile). "Draw straws and send a crew-member over to the slavers."
  // You lose a crewmember. Clone Bay [no effect]: the printed duplicate-law sentence, and they stay lost.
  // INFERRED: never the last living crewmember (loseCrew).
  "c:slaver-hostile:2": (g) => {
    const note = loseCrew(g, true);
    if (!note) return;
    const extras = [note];
    if (g.player.kits.cradle) extras.push(tx("wiki.filler-events.you-briefly-consider-cloning-a-replacement"));
    show(g, tx("wiki.filler-events.you-lose-a-crewmember"), undefined, extras);
  },

  // Slaver (hostile). {{Blue Option|Engines|Attempt to out-run the slaver ship.|level=6+}}.
  // {{DuplicateEvent|2}} is the two get-away sentences, then one fight. INFERRED: those three printed results are equal.
  // level=6+ means at least that installed level. Get away shows the printed sentence and does not append "Nothing happens."
  "c:slaver-hostile:1": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    const r = weighted(g, [["divert", 1], ["pace", 1], ["fight", 1]] as const);
    if (r === "divert") {
      show(g, tx("wiki.filler-events.you-divert-all-available-power-to"));
      return;
    }
    if (r === "pace") {
      show(g, tx("wiki.filler-events.you-fire-up-the-engines-and"));
      return;
    }
    fight(g, tx("wiki.filler-events.you-quickly-fire-up-your-engines"), tx("wiki.filler-events.pirate-ship"), "slaver-hostile");
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
    const offer: SurrenderOffer = { tier: "low", scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
    offer[trade.get] = trade.m;
    show(g, tx("wiki.filler-events.you-trade", { n: trade.n, v: WORD[trade.pay] }), offer);
    return true;
  }
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (g.fuel < n) return true;
    g.fuel -= n;
    log(g, tx("wiki.filler-events.fuel-2", { n: n }));
    const r = weighted(g, [["scrap", 2], ["weapon", 1], ["map", 1], ["reactor", 1]] as const);
    if (r === "scrap") show(g, tx("wiki.filler-events.you-give-them-the-fuel-thank"), scrapOnly(g, "high"));
    else if (r === "weapon") {
      const offer = weaponOffer(g, "low");
      offer.scrap = 0;
      offer.eligible = 0;
      show(g, tx("wiki.filler-events.you-give-them-the-fuel-thank-2"), offer);
    } else if (r === "map") {
      // "The current sector map is revealed." Not wired: this game has no map reveal.
      show(g, tx("wiki.filler-events.you-give-them-the-fuel-thank-3"));
    } else {
      // "If your ship reactor was already fully upgraded ... "Could not upgrade the Reactor, it's maxed""
      let note = tx("wiki.filler-events.could-not-upgrade-the-reactor-it");
      if (upgradeCost("reactor", g.player.reactor) != null) {
        g.player.reactor += 1;
        // Manpower: an event offer to upgrade the reactor does not count against the achievement.
        noteReactorEvent(g);
        note = tx("wiki.filler-events.reactor", { reactor: g.player.reactor });
      }
      show(g, tx("wiki.filler-events.you-give-them-the-fuel-thank-4"), undefined, [note]);
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
      show(g, tx("wiki.filler-events.you-let-their-team-on-board"), undefined, [tx("wiki.filler-events.you-lose-scrap-and-your-ship", { cost: cost })]);
      return true;
    }
    const sys = g.player.systems[idSys];
    sys.level += 1;
    // Store upgrade powers a subsystem to its new level. The page does not say the new bar starts powered.
    // INFERRED: piloting, doors, and sensors take that same step.
    if (idSys !== "oxygen") sys.power = sys.level;
    const line = idSys === "sensors"
      ? tx("wiki.filler-events.you-lose-scrap-and-your-sensors", { cost: cost, level: sys.level })
      : tx("wiki.filler-events.you-lose-scrap-and-your-is", { cost: cost, v: idSys === "oxygen" ? "Oxygen system" : idSys === "pilot" ? "Piloting" : "Door System", level: sys.level });
    show(g, tx("wiki.filler-events.you-let-their-team-on-board"), undefined, [line]);
    return true;
  }
  if (id === "s:trade-scrap-for-upgrades:decline") {
    show(g, tx("wiki.filler-events.you-thank-them-but-prepare-to"));
    return true;
  }
  m = id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  if (m) {
    const missiles = Number(m[1]);
    const parts = Number(m[2]);
    const fuel = Number(m[3]);
    // Notes: a maxed reactor does not prevent the trade. The supplies are still lost.
    if (!supplyLegal(missiles, parts, fuel)) return true;
    if (g.missiles < missiles || g.player.parts < parts || g.fuel < fuel) return true;
    g.missiles -= missiles;
    g.player.parts -= parts;
    g.fuel -= fuel;
    const note = bumpReactor(g);
    const lines = [
      missiles ? tx("wiki.filler-events.missiles-2", { missiles: missiles }) : "",
      parts ? tx("wiki.filler-events.drone-parts-2", { parts: parts }) : "",
      fuel ? tx("wiki.filler-events.fuel-3", { fuel: fuel }) : "",
      note,
    ].filter(Boolean);
    show(g, tx("wiki.filler-events.you-make-the-exchange-and-their"), undefined, lines);
    return true;
  }
  m = id.match(/^s:terraforming-scan:(bribe|pay):(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    if (m[1] === "bribe") {
      // "You receive 15-25 add_scrap": the amount shown on the choice.
      show(g, tx("wiki.filler-events.you-accept-the-bribe-and-leave"), { tier: "low", scrap: adjustScrap(g, n), eligible: n, fuel: 0, missiles: 0, parts: 0 });
      return true;
    }
    if (g.scrap < n) return true;
    g.scrap -= n;
    show(g, tx("wiki.filler-events.they-see-reason-and-accept-the"), undefined, [tx("wiki.filler-events.scrap-2", { n: n }), upgradeOxygen(g)]);
    return true;
  }
  if (id === "s:unknown-disease:continue") {
    show(g, tx("wiki.filler-events.thank-you-so-much-we-don"), rollSurrenderOffer(g, "medium", true));
    return true;
  }
  if (id === "s:unknown-disease:medbot") {
    if (!g.augments.includes("medbot")) return true;
    // A weapon with high scrap. Rewards, "Weapon": "A random weapon & T scrap."
    show(g, tx("wiki.filler-events.you-reconfigure-your-ship-s-nano"), scrapOnly(g, "high"), [grantRandomItem(g, "weapon")]);
    return true;
  }
  const rock = id.match(/^s:rock-slug:(debt|upgrade):(\d+)$/);
  if (rock) return rockSlugPay(g, rock[1] === "debt" ? "debt" : "upgrade", Number(rock[2]));
  if (id === "s:rock-slug:decline") {
    show(g, tx("wiki.filler-events.you-break-communications-and-prepare-to"), undefined, [tx("wiki.filler-events.nothing-happens")]);
    return true;
  }
  if (id === "s:rock-slug:leave") {
    show(g, tx("wiki.filler-events.nothing-happens"));
    return true;
  }
  if (id === "s:rock-slug:demand") {
    // Agree, a Rock fight, or the explosion. No odds. INFERRED: equal.
    const r = weighted(g, [["pay", 1], ["fight", 1], ["boom", 1]] as const);
    if (r === "pay") {
      slugCaptainGrateful(g, tx("wiki.filler-events.with-much-grumbling-the-rock-captain"));
      return true;
    }
    if (r === "fight") {
      fight(g, tx("wiki.filler-events.apparently-the-rock-captain-was-more"), tx("wiki.filler-events.rock-ship"), "rock-and-slug-standoff");
      return true;
    }
    if (hurt(g, 5)) return true;
    const sys = twoSystems(g);
    show(g, tx("wiki.filler-events.a-massive-explosion-emanates-from-the"), undefined, [sys].filter(Boolean));
    return true;
  }
  if (id.startsWith("s:moon:")) return moonChoice(g, id);
  if (id.startsWith("s:confused-mantis:")) return confusedMantisChoice(g, id);
  // Pirate ship selling weapon. "Nothing happens."
  if (id === "c:pirate-ship-selling-weapon:1") {
    show(g, tx("wiki.filler-events.nothing-happens"));
    return true;
  }
  // Mind Control. Two results and no odds. INFERRED: equal.
  // Both buys grant an unnamed weapon, so neither spends the printed 45 scrap.
  if (id === "c:pirate-ship-selling-weapon:2") {
    if (!ownsMindControl(g)) return true;
    if (weighted(g, [["deal", 1], ["lie", 1]] as const) === "deal") {
      card(g, tx("wiki.filler-events.once-convinced-to-help-he-lowers"), [
        { id: "s:pirate-weapon:decline", label: tx("wiki.filler-events.decline") },
      ]);
      return true;
    }
    fight(g, tx("wiki.filler-events.once-convinced-to-help-he-casually"), tx("wiki.filler-events.pirate-ship"), "pirate-ship-selling-weapon");
    return true;
  }
  if (id === "s:pirate-weapon:decline") {
    show(g, tx("wiki.filler-events.you-thank-him-for-his-offer"), undefined, [tx("wiki.filler-events.nothing-happens")]);
    return true;
  }
  return false;
}

/** Confused Mantis follow-ups. The shuttle's three results have no odds. INFERRED: equal. */
function confusedMantisChoice(g: Game, id: string): boolean {
  if (id === "s:confused-mantis:shuttle") {
    const r = weighted(g, [["home", 1], ["lose", 1], ["nothing", 1]] as const);
    if (r === "home") {
      // The printed next step is Return him home, on this same page.
      card(g, tx("wiki.filler-events.after-an-hour-of-convincing-the"), [
        { id: "s:confused-mantis:return", label: tx("wiki.filler-events.return-him-home") },
      ]);
      return true;
    }
    if (r === "lose") {
      const revived = !!g.player.kits.cradle;
      const note = loseCrew(g);
      const extras = revived ? [tx("wiki.filler-events.your-crew-s-clone-is-waiting")] : [];
      if (note) extras.push(note);
      show(g, tx("wiki.filler-events.the-cornered-and-frightened-mantis-attacks"), undefined, extras);
      return true;
    }
    show(g, tx("wiki.filler-events.the-cornered-and-frightened-mantis-attacks-2"), undefined, [tx("wiki.filler-events.nothing-happens")]);
    return true;
  }
  if (id === "s:confused-mantis:human") {
    if (!livingKin(g, "plain")) return true;
    card(g, tx("wiki.filler-events.the-mantis-is-grateful-to-see"), [
      { id: "s:confused-mantis:return", label: tx("wiki.filler-events.return-him-home") },
    ]);
    return true;
  }
  if (id === "s:confused-mantis:return") {
    mantisColony(g);
    return true;
  }
  if (id === "s:confused-mantis:leave") {
    show(g, tx("wiki.filler-events.nothing-happens"));
    return true;
  }
  if (id === "s:confused-mantis:mantis") {
    if (!livingKin(g, "blade")) return true;
    show(g, tx("wiki.filler-events.the-mantis-is-terrified-at-the"), rollStandard(g, "low"));
    return true;
  }
  if (id === "s:confused-mantis:mind") {
    if (!ownsMindControl(g)) return true;
    show(g, tx("wiki.filler-events.the-mantis-calms-down-and-communicates"), rollStandard(g, "medium"));
    return true;
  }
  if (id === "s:confused-mantis:hire") {
    show(g, tx("wiki.filler-events.he-graciously-accepts-having-always-wanted"), undefined, [robertJoins(g)]);
    return true;
  }
  if (id === "s:confused-mantis:engines") {
    show(g, tx("wiki.filler-events.they-are-happy-to-take-a"), undefined, [bumpEngines(g)]);
    return true;
  }
  return false;
}

const CHARLIE_POST: Record<(typeof MOON_SKILLS)[number], string> = {
  weapons: tx("wiki.filler-events.he-states-that-he-was-a"),
  shields: tx("wiki.filler-events.he-states-that-he-was-a-2"),
  pilot: tx("wiki.filler-events.he-states-that-he-was-a-3"),
  engines: tx("wiki.filler-events.he-states-that-he-was-an"),
  combat: tx("wiki.filler-events.he-states-that-he-was-an-2"),
  repair: tx("wiki.filler-events.he-states-that-he-was-a-4"),
};

/** Follow-ups on Single life form on moon. Each list has no odds. INFERRED: equal. */
function moonChoice(g: Game, id: string): boolean {
  if (id === "s:moon:invite") {
    const skill = MOON_SKILLS[Math.min(MOON_SKILLS.length - 1, Math.floor(rand(g) * MOON_SKILLS.length))];
    show(g, CHARLIE_POST[skill], undefined, [charlieJoins(g, moonRank(skill))]);
    return true;
  }
  if (id === "s:moon:home") {
    // Template:ReturnSurvivor, this page's three rewards.
    const r = weighted(g, [["high", 1], ["medium", 1], ["hull", 1]] as const);
    if (r === "high") {
      show(g, tx("wiki.filler-events.the-family-apparently-owns-one-of"), scrapOnly(g, "high"));
      return true;
    }
    if (r === "medium") {
      show(g, tx("wiki.filler-events.the-survivor-s-family-is-of"), scrapOnly(g, "medium"));
      return true;
    }
    const before = g.player.hull;
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    const got = g.player.hull - before;
    show(g, tx("wiki.filler-events.overjoyed-with-the-return-of-their"), undefined, [tx("wiki.filler-events.your-ship-receives-repairs-2", { got: got })]);
    return true;
  }
  if (id === "s:moon:bring") {
    const r = weighted(g, [["lose", 1], ["charlie", 1], ["blast", 1], ["collapse", 1]] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, tx("wiki.filler-events.once-back-in-orbit-the-man"), undefined, note ? [note] : []);
      return true;
    }
    if (r === "charlie") {
      show(g, tx("wiki.filler-events.he-seems-to-improve-immensely-upon"), undefined, [charlieJoins(g)]);
      return true;
    }
    if (r === "blast") {
      if (hurt(g, 5)) return true;
      show(g, tx("wiki.filler-events.being-back-in-space-terrifies-him"), undefined, [tx("wiki.filler-events.hull-damage-5"), hurtRandomSystem(g)]);
      return true;
    }
    moonCollapse(g);
    return true;
  }
  if (id === "s:moon:leave") {
    show(g, tx("wiki.filler-events.nothing-happens"));
    return true;
  }
  if (id === "s:moon:medbay2" || id === "s:moon:collapse-medbay") {
    if (medbayLevel(g) < 2) return true;
    const text = id === "s:moon:medbay2"
      ? tx("wiki.filler-events.once-inside-your-medbay-the-system")
      : tx("wiki.filler-events.your-improved-medbay-was-able-to");
    show(g, text, undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:medbay3") {
    if (medbayLevel(g) < 3) return true;
    show(g, tx("wiki.filler-events.once-inside-your-advanced-medbay-the"), undefined, [charlieJoins(g, moonRanks())]);
    return true;
  }
  if (id === "s:moon:collapse-clone") {
    if (clonebayLevel(g) < 2) return true;
    show(g, tx("wiki.filler-events.your-quick-reaction-allowed-your-clonebay"), undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:collapse-continue") {
    show(g, tx("wiki.filler-events.nothing-happens"));
    return true;
  }
  if (id === "s:moon:slug") {
    if (!livingKin(g, "gel")) return true;
    const r = weighted(g, [["stay", 1], ["leave", 1]] as const);
    if (r === "stay") {
      // The crewmember is not named. That grant stays unwired.
      show(g, tx("wiki.filler-events.you-bring-the-ship-closer-and"));
      return true;
    }
    show(g, tx("wiki.filler-events.you-bring-the-ship-closer-the"));
    return true;
  }
  return false;
}

/** True when `id` belongs to this module. sim.ts choose calls it after surrenderChoose. */
export function fillerOwns(id: string): boolean {
  return id in FILLER_CHOICES || id === "c:pirate-ship-selling-weapon:1" || id === "c:pirate-ship-selling-weapon:2" || id.startsWith("s:pirate-weapon:") || /^s:(refugee|refugee-distress|refugee-zoltan|refugee-distress-zoltan|refugee-pirate|refugee-distress-pirate|refugee-slug|refugee-distress-slug|friendly-ship-out-of-fuel|terraforming-scan|trade-scrap-for-upgrades|improve-reactor-for-supplies|unknown-disease|moon|confused-mantis|rock-slug):/.test(id);
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

/** sim.ts choiceDisabled: a rolled price the ship cannot pay. */
export function fillerChoiceDisabled(g: Game, id: string): string | null {
  const trade = parseTrade(id);
  if (trade && stock(g, trade.pay) < trade.n) return tx("wiki.filler-events.need", { n: trade.n, v: WORD[trade.pay] });
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m && g.fuel < Number(m[1])) return tx("wiki.filler-events.need-fuel", { v: m[1] });
  m = id.match(/^s:terraforming-scan:pay:(\d+)$/);
  if (m && g.scrap < Number(m[1])) return tx("wiki.filler-events.need-scrap", { v: m[1] });
  m = id.match(/^s:trade-scrap-for-upgrades:agree:(?:oxygen|pilot|doors|sensors|reactor):(\d+)$/);
  if (m && g.scrap < Number(m[1])) return tx("wiki.filler-events.need-scrap", { v: m[1] });
  if (id === "c:refueling-station:0" && g.scrap < 12) return tx("wiki.filler-events.need-12-scrap");
  if (id === "c:refueling-station:1" && g.scrap < 6) return tx("wiki.filler-events.need-6-scrap");
  if (id === "c:refueling-station:2" && g.scrap < 2) return tx("wiki.filler-events.need-2-scrap");
  if (id === "c:asteroid-mining-colony:0" && !miningMissile(g)) return tx("wiki.filler-events.needs-a-missile-weapon");
  if (id === "c:asteroid-mining-colony:1" && g.missiles < 5) return tx("wiki.filler-events.need-5-missiles");
  if (id === "c:asteroid-mining-colony:2" && g.missiles < 15) return tx("wiki.filler-events.need-15-missiles");
  // Giant alien spiders blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Pirate ship selling weapon. {{Blue Option|Mind Control}}.
  // INFERRED: the refusal line. The page names Mind Control and does not print this sentence.
  if (id === "c:pirate-ship-selling-weapon:2" && !ownsMindControl(g)) return tx("wiki.filler-events.needs-mind-control");
  if (id === "c:giant-alien-spiders:2" && !ownsDrone(g, "personnel")) return tx("wiki.filler-events.needs-an-anti-personnel-drone");
  if (id === "c:giant-alien-spiders:3" && !ownsDrone(g, "board")) return tx("wiki.filler-events.needs-a-boarding-drone");
  if (id === "c:giant-alien-spiders:4" && !ownsAntiBio(g)) return tx("wiki.filler-events.needs-an-anti-bio-beam");
  // Malfunctioning defense system blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:malfunctioning-defense-system:3" && !ownsIon(g)) return tx("wiki.filler-events.needs-an-ion-weapon");
  if (id === "c:malfunctioning-defense-system:4" && cloakLevel(g) < 1) return tx("wiki.filler-events.needs-cloaking");
  if (id === "c:malfunctioning-defense-system:5" && cloakLevel(g) < 2) return tx("wiki.filler-events.needs-improved-cloaking");
  if (id === "c:malfunctioning-defense-system:6" && cloakLevel(g) < 3) return tx("wiki.filler-events.needs-advanced-cloaking");
  if (id === "c:malfunctioning-defense-system:7" && !livingKin(g, "shell")) return tx("wiki.filler-events.needs-an-engi-crewmember");
  // Crushed pirate blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:crushed-pirate:2" && !ownsCuttingBeam(g)) return tx("wiki.filler-events.needs-a-beam-weapon");
  if (id === "c:crushed-pirate:3" && !ownsBeamDrone(g)) return tx("wiki.filler-events.needs-a-beam-drone");
  // Unknown disease blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:unknown-disease-on-mining-colony:2" && !livingKin(g, "stone")) return tx("wiki.filler-events.needs-a-rock-crewmember");
  if (id === "c:unknown-disease-on-mining-colony:3" && !livingKin(g, "shell")) return tx("wiki.filler-events.needs-an-engi-crewmember");
  if (id === "c:unknown-disease-on-mining-colony:4" && medbayLevel(g) < 2) return tx("wiki.filler-events.needs-a-level-2-medbay");
  // Plagued station. Improved Medbay level=2+. INFERRED: the refusal line. The page names the system and prints no refusal sentence.
  if (id === "s:plagued-station:cure" && medbayLevel(g) < 2) return tx("wiki.filler-events.needs-a-level-2-medbay");
  if (id === "s:unknown-disease:medbot" && !g.augments.includes("medbot")) return tx("wiki.filler-events.needs-engi-med-bot-dispersal");
  // Fire on research station blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:fire-on-research-station:3" && !livingKin(g, "stone")) return tx("wiki.filler-events.needs-a-rock-crewmember");
  if (id === "c:fire-on-research-station:4" && !ownsDrone(g, "patch")) return tx("wiki.filler-events.needs-a-repair-drone");
  // Single life form on moon blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if ((id === "s:moon:medbay2" || id === "s:moon:collapse-medbay") && medbayLevel(g) < 2) return tx("wiki.filler-events.needs-a-level-2-medbay");
  if (id === "s:moon:medbay3" && medbayLevel(g) < 3) return tx("wiki.filler-events.needs-a-level-3-medbay");
  if (id === "s:moon:collapse-clone" && clonebayLevel(g) < 2) return tx("wiki.filler-events.needs-a-level-2-clone-bay");
  if (id === "s:moon:slug" && !livingKin(g, "gel")) return tx("wiki.filler-events.needs-a-slug-crewmember");
  // Confused Mantis blue options. INFERRED: the refusal line. The page names the crew or system and prints no sentence.
  if (id === "s:confused-mantis:human" && !livingKin(g, "plain")) return tx("wiki.filler-events.needs-a-human-crewmember");
  if (id === "s:confused-mantis:mantis" && !livingKin(g, "blade")) return tx("wiki.filler-events.needs-a-mantis-crewmember");
  if (id === "s:confused-mantis:mind" && !ownsMindControl(g)) return tx("wiki.filler-events.needs-mind-control");
  // Battlefield wreckage. Improved Sensors level=2. INFERRED: the refusal line. The page names Sensors level 2 and prints no sentence.
  if (id === "c:battlefield-wreckage:2" && sensorsLevel(g) < 2) return tx("wiki.filler-events.needs-sensors-level-2");
  // Rebel fight chance. Improved Sensors level=2. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:rebel-fight-chance:2" && sensorsLevel(g) < 2) return tx("wiki.filler-events.needs-sensors-level-2");
  // Rebel fight chance. Advanced Sensors level=3. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:rebel-fight-chance:3" && sensorsLevel(g) < 3) return tx("wiki.filler-events.needs-sensors-level-3");
  // Rebel fight chance in nebula. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Advanced Sensors level=3 means at least that installed level.
  if (id === "c:rebel-fight-chance-in-nebula:2" && sensorsLevel(g) < 3) return tx("wiki.filler-events.needs-sensors-level-3");
  if (id === "c:rebel-fight-chance-in-nebula:3" && !g.augments.includes("glass")) return tx("wiki.filler-events.needs-long-ranged-scanners");
  if (id === "c:rebel-fight-chance-in-nebula:4" && !g.augments.includes("pulseeye")) return tx("wiki.filler-events.needs-a-lifeform-scanner");
  if (id === "c:slocknog:0" && g.scrap < 55) return tx("wiki.filler-events.need-55-scrap");
  // Engi smashed ships. INFERRED: the refusal line. The page names an Engi crewmember.
  if (id === "c:engi-smashed-ships:2" && !livingKin(g, "shell")) return tx("wiki.filler-events.needs-an-engi-crewmember");
  // Mantis ships battle for Rock freighter. INFERRED: the refusal line. The page names the drone and prints no sentence.
  if (id === "c:mantis-ships-battle-for-rock-freighter:2" && !ownsDrone(g, "patch")) return tx("wiki.filler-events.needs-a-repair-drone");
  if (id === "c:mantis-ships-battle-for-rock-freighter:3" && !ownsDrone(g, "hull")) return tx("wiki.filler-events.needs-a-hull-repair-drone");
  if (id === "c:mantis-ships-battle-for-rock-freighter:3" && g.player.parts < 1) return tx("wiki.filler-events.need-1-drone-part");
  // Rock live mine. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:rock-live-mine:1" && (g.player.systems.engines?.level ?? 0) < 5) return tx("wiki.filler-events.needs-engines-level-5");
  if (id === "s:rock-mine:missile" && !miningMissile(g)) return tx("wiki.filler-events.needs-a-missile-weapon");
  if (id === "s:rock-mine:beam" && !ownsMineBeam(g)) return tx("wiki.filler-events.needs-a-beam-drone-2");
  if (id === "s:rock-mine:beam" && g.player.parts < 1) return tx("wiki.filler-events.need-1-drone-part");
  // Lanius ship absorbing rebel base. INFERRED: the refusal line. The page names a Lanius crewmember.
  if (id === "c:lanius-ship-absorbing-rebel-base:2" && !livingKin(g, "voidlung")) return tx("wiki.filler-events.needs-a-lanius-crewmember");
  // Lanius ship absorbing jump beacon. INFERRED: the refusal lines. The page names the crew and the drone and prints no sentence.
  if (id === "c:lanius-ship-absorbing-jump-beacon:2" && !livingKin(g, "voidlung")) return tx("wiki.filler-events.needs-a-lanius-crewmember");
  if (id === "c:lanius-ship-absorbing-jump-beacon:3" && !ownsDrone(g, "hull")) return tx("wiki.filler-events.needs-a-hull-repair-drone");
  // Lanius ship attacking civilian distress. INFERRED: the refusal line. The page names a Lanius crewmember.
  if (id === "c:lanius-ship-attacking-civilian-distress:2" && !livingKin(g, "voidlung")) return tx("wiki.filler-events.needs-a-lanius-crewmember");
  // Lanius craftsmen. {{Blue Option|Lanius Crew}}. INFERRED: the refusal line. The page names a Lanius crewmember.
  if (id === "s:lanius-craftsmen:help" && !livingKin(g, "voidlung")) return tx("wiki.filler-events.needs-a-lanius-crewmember");
  if (id === "s:lanius-craftsmen:aug" && g.scrap < 45) return tx("wiki.filler-events.need-scrap", { v: 45 });
  if (id === "s:lanius-craftsmen:weapon" && g.scrap < 50) return tx("wiki.filler-events.need-scrap", { v: 50 });
  if (id === "s:lanius-craftsmen:drone" && g.scrap < 40) return tx("wiki.filler-events.need-scrap", { v: 40 });
  if (id === "s:lanius-craftsmen:help:aug" && g.scrap < 35) return tx("wiki.filler-events.need-scrap", { v: 35 });
  if (id === "s:lanius-craftsmen:help:weapon" && g.scrap < 40) return tx("wiki.filler-events.need-scrap", { v: 40 });
  if (id === "s:lanius-craftsmen:help:drone" && g.scrap < 30) return tx("wiki.filler-events.need-scrap", { v: 30 });
  // Nebula lost ship. Teleporter, and Long-Ranged Scanners. INFERRED: the refusal lines. The page names the gear.
  if (id === "c:nebula-lost-ship:2" && (g.player.kits.sling?.level ?? 0) <= 0) return tx("wiki.filler-events.needs-a-teleporter");
  if (id === "c:nebula-lost-ship:3" && !g.augments.includes("glass")) return tx("wiki.filler-events.needs-long-ranged-scanners");
  // Plasma storm incapacitated ships. Piloting level 2+. INFERRED: the refusal line. The page names the system.
  if (id === "c:plasma-storm-incapacitated-ships:2" && (g.player.systems.pilot?.level ?? 0) < 2) return tx("wiki.filler-events.needs-level-2-piloting");
  // Abandoned station. Clone Bay. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "s:abandoned-station:dna" && (g.player.kits.cradle?.level ?? 0) <= 0) return tx("wiki.filler-events.needs-a-clone-bay");
  // Rock and Slug standoff. INFERRED: the refusal line. The button shows the rolled 10-15 scrap.
  m = id.match(/^s:rock-slug:(?:debt|upgrade):(\d+)$/);
  if (m && g.scrap < Number(m[1])) return tx("wiki.filler-events.need-scrap", { v: m[1] });
  // Dense asteroid field distress. INFERRED: the refusal line. The page names Rock Plating and prints no sentence.
  if (id === "c:dense-asteroid-field-distress:2" && !g.augments.includes("keel")) return tx("wiki.filler-events.needs-rock-plating");
  // Disabled Rock ship. INFERRED: the refusal line. The page names a Slug crewmember and prints no sentence.
  if (id === "c:disabled-rock-ship:2" && !livingKin(g, "gel")) return tx("wiki.filler-events.needs-a-slug-crewmember");
  m = id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  if (m) {
    const missiles = Number(m[1]);
    const parts = Number(m[2]);
    const fuel = Number(m[3]);
    if (g.missiles < missiles) return tx("wiki.filler-events.need-missiles", { missiles: missiles });
    if (g.player.parts < parts) return tx("wiki.filler-events.need-drone-parts", { parts: parts });
    if (g.fuel < fuel) return tx("wiki.filler-events.need-fuel-2", { fuel: fuel });
  }
  if (id === "s:terraforming-scan:sensors" && sensorsLevel(g) < 2) return tx("wiki.filler-events.needs-sensors-level-2");
  if (id === "s:terraforming-scan:zoltan" && !livingZoltan(g)) return tx("wiki.filler-events.needs-a-zoltan-crewmember");
  if (id === "c:large-asteroid-field:2" && !g.augments.includes("hook")) return tx("wiki.filler-events.needs-a-scrap-recovery-arm");
  // Boarders: Humans jammed sensors, {{Blue Option|Hacking System|...|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:boarders-humans-jammed-sensors:1" && (g.player.kits.spike?.level ?? 0) <= 0) return tx("wiki.filler-events.needs-a-hacking-system");
  // Slaver (hostile). Engines level=6+. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:slaver-hostile:1" && (g.player.systems.engines?.level ?? 0) < 6) return tx("wiki.filler-events.needs-engines-level-6");
  return null;
}

/** The sector's "Empty beacon (...)" card ("Nothing happens."), for sim.ts eventFor's last resort. */
export function emptyEvent(g: Game): GameEvent {
  return emptyCard(g, emptyPageFor(g.sectorName));
}
