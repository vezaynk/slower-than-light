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
 * with {{DuplicateEvent|N}} counted N times) or open a follow-up card. Blue options, crew skills, drone schematics,
 * and map reveals are not granted, as in the other tables. A result that prints fires or a breach applies that hazard.
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
  { dest: "Rebel ship attacking Federation loyalists", unique: true },
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

export type FillerList = "filler" | "nebula" | "distress" | "items";
const LISTS: Record<FillerList, FillerRow[]> = { filler: FILLER, nebula: NEBULA, distress: DISTRESS, items: ITEMS };

/** "Empty beacon (...)" pages: {{Locations}} sectors and the intro texts. Every one ends "Nothing happens." */
type EmptyPage = { dest: string; sectors: string[]; texts: string[] };

export const EMPTY_PAGES: EmptyPage[] = [
  {
    dest: "Empty beacon (Civilian)",
    sectors: ["Civilian Sector"],
    texts: [
      "Your jump leads you to nothing but empty space. This Jump Beacon serves no purpose other than as a connection.",
      "You jump into an unremarkable system. No life signs detected within scanning range.",
      "Your scans reveal a mining base on a nearby planet long since abandoned. No life signs detected.",
      "Your scans reveal an ore refinery and several factories, all standing still and empty. No life signs detected.",
      "You discover a nearby planet speckled with settlements, although none respond to your hails.",
      "This beacon has been built for a nearby civilian space-station. No one hails your ship.",
      "The nearby planet shows sign of habitation and great beauty. A rudimentary automated planetary defense system is looping its message into space: \"Warning! Quarantine Level 5 in effect under FHA Act 22, article 11.2. Warning! Quarantine Level 5...\"",
      "Your jump leads to a completely unremarkable binary star system. There is nothing else around.",
      "Your jump leads to a remarkable binary star system. The view is beautiful, but there is nothing else around.",
    ],
  },
  {
    dest: "Empty beacon (Crystal)",
    sectors: ["Hidden Crystal Worlds"],
    texts: [
      "As soon as you arrive, all of the ships docked at a nearby station scatter and jump away, while the station itself uses some form of cloak technology to disappear. They mustn't like outsiders here...",
      "No ships are in range, so you take the time to scan the area. It seems like every planet you've seen so far shows signs of highly developed habitation without overpopulation. They must have a very structured and well regulated society.",
      "There appears to be no one living near this node, a rare sight in this highly developed sector.",
      "You arrive near a civilian settlement. It looks like their homes, ships and stations all rely heavily on an intriguing crystalline material. You wonder how they are able to create so much of this substance, as yet undiscovered in the rest of the galaxy.",
      "A few merchant ships pass nearby but they are either ignoring your hails or their computer isn't designed to work through the same frequencies...",
      "A number of civilian ships seem to be evacuating a small colony. One ship messages you before jumping away, \"Damn you aliens! This is why we closed that Long-range Beacon in the first place!\"",
    ],
  },
  {
    dest: "Empty beacon (Engi)",
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    texts: [
      "The complex arrangements of ship hulls and FTL drive capacitors floating abandoned in space suggest the Engi were here not too long ago; but no longer.",
      "You arrive at a green planet with great plains and rolling waterfalls. It would be of little interest to the Engi nearby.",
      "You have arrived near an Engi construction yard. Most Engi maintain their bi-pedal appearance out of habit but here you see a number of Engi hives working together to create massive organic machines adept at building ships. Truly a sight to behold.",
      "Even though each \"individual\" Engi is made up of trillions of nano-machines, their culture still revolves around traditional social interactions. A nearby station seems to be constructed for entertainment of passing Engi travellers.",
      "You see a number of Engi space stations and fleets nearby. Despite looking like piles of junk loosely tied together they are actually a model of efficiency. They just lack a certain aesthetic emphasis in their constructions.",
      "This system appears quite peaceful. You're not sure how long it'll last between the combined threats of the Rebels and Mantis.",
      "There are a number of merchant ships passing through the area despite the threat of Mantis invasion. No doubt interested in buying the efficient technology of the Engi.",
      "You see a small Rebel carrier in the distance. You lay low and try to blend in with the other traffic. However it's surprising to see a Rebel military ship alone deep in Engi space.",
      "The Engi seem to have avoided this particular node, along with every other life-form. You keep your eyes peeled for reasons why, but spin up the FTL without event.",
      "A cluster of Engi satellites in orbit of a nearby planet are the only clue the mechanical species was ever here. You have other places to be.",
    ],
  },
  {
    dest: "Empty beacon (Lanius)",
    sectors: ["Abandoned Sector"],
    texts: [
      "The charts indicate this was the location of a small skirmish over a military facility on a nearby moon. Oddly, scans pick up no signs of debris from either the battle or the station. Yet another area sucked dry by the Lanius.",
      "Scans show no signs of any ships or settlements nearby. You have no way of knowing if the area was always uninhabited or if it was simply erased by the Lanius.",
      "A few refugee ships are preparing for the long journey to another sector. They explain how a number of Lanius military ships surrounded them and began to hack their FTL drives. Fortunately the Lanius moved on after briefly scanning the civilian ships, leaving them more than a little shaken up.",
      "You pass a civilian ship that warns of the nearby Lanius. \"One of them attacked a civilian transport and started to melt their fracking hull. But then the weirdest thing happened... another metal ship actually fired on its companion until it backed off.\" Apparently there are disagreements among the Lanius about what should be salvaged.",
      "You question a local settlement and they describe a fleet of metal ships wordlessly collecting all of the abandoned metal and debris in the area. When they approached important satellites, the settlements fired a few ASB warning shots. The Lanius moved on despite clearly having the firepower to overwhelm the settlements.",
      "You come across a human civilian ship preparing to leave the sector. They message you, \"We're getting out of here! There was some cult rambling about the spreading of the disease, Humanitis. They forcefully boarded our ship and tried to open all of our airlocks, shouting, \"Be purged!\" Is nowhere safe anymore?\"",
    ],
  },
  {
    dest: "Empty beacon (Last Stand)",
    sectors: ["The Last Stand"],
    texts: [
      "You arrive to see a number of Federation forward-carriers and dreadnoughts. This must be a system of high importance to warrant such a fleet.",
      "There are a few Federation fleets in the nearby area as well as a lot of wreckage. There must have been minor skirmishes in the area.",
      "A few scattered heavy vessels are left to defend the nearby Federation settlement. They seem to be in the process of evacuation.",
      "A large host of Federation heavy vessels are in formation around the beacon. Sensors run hot with missile locks, but once you transmit your ship signature they leave you alone.",
      "A battalion of Federation fighters are fighting around a nearby moon with their carriers waiting in the distance. They must have encountered a Rebel scout squadron.",
    ],
  },
  {
    dest: "Empty beacon (Mantis)",
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    texts: [
      "At this point you almost expect a fight with the Mantis, but this beacon appears to be entirely devoid of other ships. You take the time to catch your breath and double check the ship's systems.",
      "The only thing this beacon offers is a view of deep space and a brief respite from battles. For some this must be a welcome refuge.",
      "A nearby Mantis mining operation is clearly using heavy Engi slave labor. You briefly consider the possibility of emancipating the slaves, but the Mantis presence is too formidable. You decide to lay low.",
      "There aren't so many parts of Mantis space that aren't dotted by the wrecks of battles past, but this is one of them. You take a deep breath and prepare to move on.",
      "There's nothing here but space debris and some uninhabitable planetoids.",
      "You fancy you see something moving in the shadow of the beacon, but all remains still.",
    ],
  },
  {
    dest: "Empty beacon (Pirate)",
    sectors: ["Pirate Controlled Sector"],
    texts: [
      "As soon as you arrive, a small ship de-cloaks behind yours. You immediately power up the shields and weapons, but they continue on their trajectory unimpressed. You try to calm your nerves.",
      "A small pirate ship messages you, \"That sure is a shiny ship you got there.\" You fire a warning shot across their bow and they respond, \"Hey! No need for violence! It was just a comment...\"",
      "The only thing within scanning range is an old abandoned mining structure and a resupply station. They appear to have been picked clean by marauders.",
      "You arrive to have a small fleet of Engi ships target you with a message, \"Piracy results in negative societal impact. Not permitted.\" You assure them of your honest intentions and they allow you to pass.",
    ],
  },
  {
    dest: "Empty beacon (Rebel)",
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    texts: [
      "You enter a system bustling with Rebel activity. Supply freighters and re-supply stations are dwarfed by a few heavy warships. Luckily, no one seems to be paying attention to small cruisers. No ships are scanning or messaging you.",
      "You arrive near a small Rebel refueling depot. Your ship is being scanned multiple times so they must recognize you, but there appears to be no combat-ready ships in the vicinity. The only message you receive is a denial to your request to dock at the depot.",
      "There is not much of interest nearby. A small sun in the distance with a few orbiting planets in nearby space provide little of interest.",
      "There are no other ships near this beacon, however you detect a small communication relay. You tap into it without a problem; there is no encryption. Most of the chatter revolves around troop and fleet movements, not particularly interesting.",
      "There is a small planet nearby with scattered settlements. A small Rebel fleet is in orbit with many ships ferrying back and forth. It must be a more recently 'liberated' planet.",
    ],
  },
  {
    dest: "Empty beacon (Rock)",
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    texts: [
      "You receive a message meant to degrade you as aliens. You half expect an attack but it seems to have come from a small civilian shuttle.",
      "No one bothers your ship as you float among numerous space stations and mining platforms. The Rock certainly run efficient operations.",
      "You arrive and detect signs of battle. A few ships are taking passes at each other near a small station. You don't know if it's a territory issue, a contest or a rite of passage but you decide it's best to stay out of it.",
      "There's not much at this beacon. Just a few abandoned depots, stripped clean.",
      "A few freighters pass by but they refuse all communications. Must not want to sully their reputation by talking with foreigners.",
      "You see a small trading post and ask about refuelling but they respond, \"Go away! We don't serve your kind here.\"",
      "You see a Zoltan merchant and ask about his wares. He responds, \"Sorry, but it took years to gain their trust. I can't be seen communicating with you. I hope you understand.\" He cuts communications.",
    ],
  },
  {
    dest: "Empty beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      "You arrive at the beacon and are relieved at the sight of open space. Nebulas are terribly claustrophobic.",
      "This beacon marks a 'small' gap in the nebula. No colonies or ships in scanning distance.",
      "You are relieved to see your sensors blink back on after the jump. No ships detected.",
      "The Slugs rely heavily on their telepathic powers and are reluctant to give up that advantage by extending beyond nebulas. It's unlikely you'll encounter any this far from the clouds.",
      "You arrive in an area clear of nebula and quickly check to see if the sensors are working. Everything is fine and no ships are detected in the vicinity.",
    ],
  },
  {
    dest: "Empty beacon (Zoltan)",
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      "There are some mineral-rich asteroids here that the Zoltan have left idle, but you've none of the necessary equipment to mine them.",
      "You have to admit - Zoltan space is a beautiful and peaceful place indeed. However, re-engaging the FTL and finishing your mission is your priority, not sight-seeing.",
      "A light asteroid field is entering the atmosphere of a nearby planet - a fireworks show on a galactic scale. There's little for it but to take in the ambience and program the next jump.",
      "You stumble upon some Zoltan military vessels engaging in combat training. Their Energy Shields are impressive, but you note how quickly beam and ion weaponry take them down.",
      "You don't have time to hail the Zoltan ship that was waiting at this beacon before it jumps away. They are a careful race.",
      "A Zoltan shipyard is stationed at this beacon. You admire the display of hundreds of glowing Zoltan performing delicate exterior work on a massive transport ship.",
      "A message broadcast from a nearby planet announces the presence of an ancient Zoltan monastery available for visiting. Likely just a tourist trap, but still too bad you don't have the time to visit.",
    ],
  },
  {
    // Template:EventList NEBULA row NEBULA_EMPTY; also an "empty nebula beacons" slot outside the Slug sectors.
    dest: "Empty nebula beacon",
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      "You can't see anything through the thick gases surrounding your ship. Without knowing what is out there, all you can do is wait for your FTL to charge.",
      "Without active sensors you have no other option but to look out of the view-ports in apprehension. It's eerily quiet.",
      "As you wait for the FTL drive to charge, you half expect to be ambushed at any moment. However, no attack comes...",
      "You feel naked without functioning sensors. You half expect a Rebel ship to appear from behind a cloud at any moment, but none come.",
      "Your crew are constantly looking out of the windows, checking for hostiles. They jump at every creak and moan of the ship. The tension is almost palpable...",
      "You nervously glance out the windows but the only thing to greet you is more clouds and silence.",
      "You cycle through wide-band comm channels as soon as you arrive. Nothing but static.",
      "With the sensors down, you spend a good deal of time staring out the window. It is, you must admit, rather beautiful here.",
      "There's nothing here, save for vast swirls of gas reflecting rays from a distant sun.",
    ],
  },
  {
    dest: "Empty nebula beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      "When it comes to Slugs, no news is not necessarily good news. However, if they are watching, they don't seem to want to confront you.",
      "It's not unusual to feel paranoia in a Slug controlled nebula, but for once, it is unfounded.",
      "Either this part of Slug space is deserted, or it's too dense for even Slugs to detect your presence. Time to move.",
      "This area of the nebula seems entirely empty until a small Slug transport and its escorts emerges suddenly from through the clouds, only to disappear again in a matter of seconds.",
      "You explore around the beacon and are shocked when a rock the size of a small moon suddenly looms ahead of you. Scans reveal the solid-looking rock is just a husk, almost entirely mined out of useful minerals.",
      "There are a number of small stations for travellers in the area, lit up by guiding lights and advertisements. Only Slug ships are docked so you decide it's better to avoid a confrontation and steer clear.",
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
    body: "Scans reveal a large asteroid field nearby. Short-range scanners may discover useful materials while we wait for the FTL to recharge.",
    choices: [
      {
        id: "c:large-asteroid-field:0",
        label: "Explore the asteroid field.",
        // Six results: FILLER_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
      { id: "c:large-asteroid-field:1", label: "Too dangerous. We'll just wait for the FTL to charge.", fx: [{ k: "nothing" }] },
      // {{Blue Option|Scrap Recovery Arm|Attempt to mine the asteroids.}} High scrap only.
      { id: "c:large-asteroid-field:2", label: "Attempt to mine the asteroids.", fx: [{ k: "note", text: "High scrap." }] },
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
    body: "You have jumped into the aftermath of what seems to have been a brutal exchange between several ships. Wreckage drifts by your screens, and you can still see the remains of the dying ships sparking and breaking apart. It's hard to determine who the combatants were without closer investigation.",
    choices: [
      { id: "c:battlefield-wreckage:0", label: "Investigate the battlefield.", fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:battlefield-wreckage:1", label: "Ignore the wreckage and continue on.", fx: [{ k: "nothing" }] },
      // {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}
      { id: "c:battlefield-wreckage:2", label: "Use your Sensors to scan the wreckage.", fx: [{ k: "note", text: "Medium resources with some scrap." }] },
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
    body: "You arrive near a damaged and dilapidated space station. It appears to be abandoned but you detect faint life signatures on board.",
    choices: [
      { id: "c:plagued-station:0", label: "Board the station and look for survivors.", fx: [{ k: "tier", tier: "low" }] },
      { id: "c:plagued-station:1", label: "Scrap some of the debris.", fx: [{ k: "note", text: "A random amount of scrap." }] },
    ],
  },
  // ROGUE_REBEL. Go looking: a Rebel ship ({{DuplicateEvent|2}}); pursuit doubled for 1 jump and a Rebel ship; nothing.
  {
    dest: "Rebel fight chance",
    slug: "rebel-fight-chance",
    flag: "cited:rebel-fight-chance",
    aliases: ["Rebel fight chance", "Rebel Fight Chance"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You arrive at a beacon located in a civilian star system. A nearby colony contacts you: \"We've got a rogue Rebel ship harassing this system. Do you have time to find it?\"",
    choices: [
      { id: "c:rebel-fight-chance:0", label: "Go looking for the Rebel ship.", fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:1", label: "No time to search, you prepare to jump away.", fx: [{ k: "nothing" }] },
      { id: "c:rebel-fight-chance:2", label: "Perform a scan of the area.", fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:rebel-fight-chance:3", label: "Pinpoint the Rebel's location.", fx: [{ k: "fight", tier: "Rebel ship" }] },
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
    body: "Your sensors have picked up a refugee ship drifting through the system, no doubt one of many fleeing the Rebel advance. It doesn't appear to have detected you... or else it is trying to avoid notice.",
    choices: [
      { id: "c:refugee:0", label: "Hail them.", fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
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
    body: "Scanners are showing intelligent life forms on a nearby planet. No match for them can be found in the database.",
    choices: [
      { id: "c:intelligent-ponies:0", label: "Investigate.", fx: [{ k: "note", text: "Three follow-up choices." }] },
      { id: "c:intelligent-ponies:1", label: "Ignore it.", fx: [{ k: "nothing" }] },
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
    body: "You find a small space station that appears to be abandoned.",
    choices: [
      { id: "c:abandoned-station:0", label: "Move in to examine the station.", fx: [{ k: "tier", tier: "low" }] },
      { id: "c:abandoned-station:1", label: "Stay near the Beacon.", fx: [{ k: "nothing" }] },
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
    body: "You receive a hail from a station orbiting a nearby planet. \"Captain, we are Federation Terraforming Team C12 and are in need of assistance. Do you have some time?\"",
    choices: [
      { id: "c:terraforming-scan:0", label: "You offer your assistance.", fx: [{ k: "note", text: "They ask for a scan." }] },
      { id: "c:terraforming-scan:1", label: "You do not have time.", fx: [{ k: "nothing" }] },
    ],
  },
  // NEBULA_EMPTY. "Nothing happens." The intro is one of the page's nine texts (EMPTY_PAGES), drawn on arrival.
  {
    dest: "Empty nebula beacon",
    slug: "empty-nebula-beacon",
    flag: "cited:empty-nebula-beacon",
    aliases: ["Empty nebula beacon", "Empty Nebula Beacon", "Nebula empty beacon"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "There's nothing here, save for vast swirls of gas reflecting rays from a distant sun.",
    choices: [{ id: "c:empty-nebula-beacon:0", label: "Continue", fx: [{ k: "nothing" }] }],
  },
  // NEBULA_LOST_SHIP. Follow: a crewmember; a Rebel ship; nothing.
  {
    dest: "Nebula lost ship",
    slug: "nebula-lost-ship",
    flag: "cited:nebula-lost-ship",
    aliases: ["Nebula lost ship", "Nebula Lost Ship"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Slug Controlled Nebula", "Slug Home Nebula", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "A heavily damaged Federation ship is hiding in the nebula at this beacon. Before you have time to make contact with them, they fade into the nebula.",
    choices: [
      { id: "c:nebula-lost-ship:0", label: "Attempt to follow and help them.", fx: [{ k: "fight", tier: "Rebel ship" }] },
      { id: "c:nebula-lost-ship:1", label: "Keep your position, they can handle themselves.", fx: [{ k: "nothing" }] },
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
    body: "You jump into the middle of a plasma storm. Multiple recently incapacitated ships loom in the shadows, briefly illuminated by the lightning.",
    choices: [
      { id: "c:plasma-storm-incapacitated-ships:0", label: "Manually search the wreckage for survivors and equipment.", fx: [{ k: "hull", n: -4 }] },
      { id: "c:plasma-storm-incapacitated-ships:1", label: "Avoid the risk and wait to jump away unscathed.", fx: [{ k: "nothing" }] },
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
    body: "\"Greetings! It is so good to see you! We've been out of fuel and floating out here for weeks. We were terrified a pirate or those damn Rebels would find us first. Could you spare some fuel?\"",
    choices: [
      { id: "c:friendly-ship-out-of-fuel:0", label: "Give them the fuel.", fx: [{ k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 }, { k: "tier", tier: "high" }] },
      { id: "c:friendly-ship-out-of-fuel:1", label: "Apologize, wish them luck, and continue on.", fx: [{ k: "nothing" }] },
    ],
  },
  // REFUGEE_DISTRESS, Template:Drifting Refugee Ship (introtext=distress, type=main). Same results as Refugee.
  {
    dest: "Refugee distress",
    slug: "refugee-distress",
    flag: "cited:refugee-distress",
    aliases: ["Refugee distress", "Refugee Distress"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "You have encountered a refugee ship drifting in space. It looks as if it was fleeing the Rebel advance and ran out of fuel. Its distress beacon is active, but you're not sure anyone is on board.",
    choices: [
      { id: "c:refugee-distress:0", label: "Hail them.", fx: [{ k: "fight", tier: "Pirate ship" }] },
      { id: "c:refugee-distress:1", label: "Ignore the refugees.", fx: [{ k: "nothing" }] },
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
    body: "You have encountered a refugee ship drifting in space. It looks as if it was fleeing the Rebel advance and ran out of fuel. Its distress beacon is active, but you're not sure anyone is on board, and its communications seem to be down.",
    choices: [
      { id: "c:refugee-comms-down:0", label: "Prepare to board and investigate.", fx: [{ k: "res", id: "missiles", sign: 1, lo: 2, hi: 4 }, { k: "tier", tier: "medium" }] },
      { id: "c:refugee-comms-down:1", label: "Ignore the ship.", fx: [{ k: "nothing" }] },
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
    body: "You pick up an automated message from a nearby space station. There appears to be a local shipwright that can perform emergency work on military ships.",
    choices: [
      { id: "c:trade-scrap-for-upgrades:0", label: "Inquire about their specialty.", fx: [{ k: "note", text: "One printed upgrade offer." }] },
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
    body: "A ship re-fueling station is stationed at this beacon. We can purchase fuel here.",
    choices: [
      { id: "c:refueling-station:0", label: "Buy 6 Fuel for 12 Scrap.", fx: [{ k: "res", id: "scrap", sign: -1, lo: 12, hi: 12 }, { k: "res", id: "fuel", sign: 1, lo: 6, hi: 6 }] },
      { id: "c:refueling-station:1", label: "Buy 3 Fuel for 6 Scrap.", fx: [{ k: "res", id: "scrap", sign: -1, lo: 6, hi: 6 }, { k: "res", id: "fuel", sign: 1, lo: 3, hi: 3 }] },
      { id: "c:refueling-station:2", label: "Buy 1 Fuel for 2 Scrap.", fx: [{ k: "res", id: "scrap", sign: -1, lo: 2, hi: 2 }, { k: "res", id: "fuel", sign: 1, lo: 1, hi: 1 }] },
      { id: "c:refueling-station:3", label: "Ignore the station.", fx: [{ k: "nothing" }] },
    ],
  },
  // HELP_MINERS. Five missiles: 10 hull, a reactor step, or 15-25 scrap. No odds. INFERRED: equal.
  // Fifteen missiles: 15 hull and a reactor step, an unnamed augment, or 30-40 scrap and 5 hull.
  // INFERRED: those three are equal. The augment is not named, so that result installs nothing.
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
    body: "You come across an asteroid mining colony. They message you immediately, saying, \"Greetings. Our supplies of mining explosives have run out ever since the Rebels blockaded this system. Do you have any extra explosives?\"",
    choices: [
      { id: "c:asteroid-mining-colony:0", label: "Offer to solve their problem by launching a missile.", fx: [{ k: "nothing" }] },
      { id: "c:asteroid-mining-colony:1", label: "Give them the requested 5 missiles.", fx: [{ k: "res", id: "missiles", sign: -1, lo: 5, hi: 5 }] },
      { id: "c:asteroid-mining-colony:2", label: "Give them 15 missiles.", fx: [{ k: "res", id: "missiles", sign: -1, lo: 15, hi: 15 }] },
      { id: "c:asteroid-mining-colony:3", label: "Decline.", fx: [{ k: "nothing" }] },
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
    body: "You receive a message from a small convoy. They're looking for some military supplies and are offering to try to improve your reactor in exchange.",
    choices: [
      { id: "c:improve-reactor-for-supplies:0", label: "Agree to the trade.", fx: [{ k: "note", text: "One printed supply bundle." }] },
      { id: "c:improve-reactor-for-supplies:1", label: "Respectfully decline.", fx: [{ k: "nothing" }] },
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
    body: "You find a number of ships fleeing from a small space station. You hail them, asking what's wrong: \"Help! We're being overrun by some sort of giant alien spiders!\"",
    choices: [
      { id: "c:giant-alien-spiders:0", label: "Send the crew to help! Giant alien spiders are no joke.", fx: [{ k: "note", text: "A crewmember, or high resources with some scrap." }] },
      { id: "c:giant-alien-spiders:1", label: "Leave them alone.", fx: [{ k: "nothing" }] },
      { id: "c:giant-alien-spiders:2", label: "Send your battle drone in to help.", fx: [{ k: "note", text: "Medium resources with some scrap." }] },
      { id: "c:giant-alien-spiders:3", label: "Launch a Boarding drone into the station.", fx: [{ k: "note", text: "Low scrap with resources." }] },
      { id: "c:giant-alien-spiders:4", label: "Use the beam to pick off the spiders.", fx: [{ k: "note", text: "High resources with some scrap." }] },
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
    body: "You arrive at the distress beacon near a small asteroid belt and find a ship with pirate markings partially crushed between two large rocks. It must have been illegally mining the belt without proper equipment.",
    choices: [
      { id: "c:crushed-pirate:0", label: "Try to dislodge the ship by shooting at the rocks.", fx: [{ k: "note", text: "2 hull, 2 system damage, and low scrap, or medium scrap with resources." }] },
      { id: "c:crushed-pirate:1", label: "Destroy and loot the ship. They're just pirates.", fx: [{ k: "note", text: "Medium scrap with resources, or a Pirate ship." }] },
      { id: "c:crushed-pirate:2", label: "Carefully cut the ship out.", fx: [{ k: "note", text: "Medium scrap with resources." }] },
      { id: "c:crushed-pirate:3", label: "Have your drone cut the ship out.", fx: [{ k: "note", text: "Medium scrap with resources." }] },
    ],
  },
  // DISTRESS_STATION_DISEASE. Send the crew: lose a crewmember and medium resources, or nothing. No odds. INFERRED: equal.
  // Clone Bay has no effect. Ignore: nothing. A living Rock or Engi pays medium resources with some scrap.
  // Medbay level 2 or more opens the cure. Continue pays that same reward. Engi Med-bot Dispersal pays high scrap.
  // The weapon on that result is not named, so it is not granted.
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
    body: "You locate a nearby human mining colony where an unknown disease has spread virulently. They are setting up a quarantine to contain it but a riot has broken out.",
    choices: [
      { id: "c:unknown-disease-on-mining-colony:0", label: "Send in your crew to help control the crowds.", fx: [{ k: "note", text: "A crewmember and medium resources, or nothing." }] },
      { id: "c:unknown-disease-on-mining-colony:1", label: "Ignore their request and move on.", fx: [{ k: "nothing" }] },
      { id: "c:unknown-disease-on-mining-colony:2", label: "Send your Rock crew-member to prevent a riot.", fx: [{ k: "note", text: "Medium resources with some scrap." }] },
      { id: "c:unknown-disease-on-mining-colony:3", label: "Send your Engi to calm down the infected.", fx: [{ k: "note", text: "Medium resources with some scrap." }] },
      { id: "c:unknown-disease-on-mining-colony:4", label: "Use your medbay to help synthesize a cure.", fx: [{ k: "note", text: "Medium resources, or high scrap." }] },
    ],
  },
  // DISTRESS_STATION_FIRE. Send the crew: lose a crewmember and low scrap, or high scrap. No odds. INFERRED: equal.
  // Clone Bay revives that crewmember. Docking: 4 hull, 1 system damage, and low scrap, or Dr. Jones and low scrap.
  // INFERRED: equal. Leave: nothing. A living Rock pays high scrap. The augmentation is not named, so it is not installed.
  // A Repair Drone pays high scrap. The schematic is not named, so it is not granted.
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
    body: "You find the source of the distress call, a small research station. It appears a small laboratory fire got out of control and is threatening to destroy the station. Their fire suppression system is not responding.",
    choices: [
      { id: "c:fire-on-research-station:0", label: "Send your crew in a shuttle to help put out the fire.", fx: [{ k: "note", text: "A crewmember and low scrap, or high scrap." }] },
      { id: "c:fire-on-research-station:1", label: "Dock and try to rescue the survivors.", fx: [{ k: "note", text: "4 hull, 1 system damage, and low scrap, or Dr. Jones and low scrap." }] },
      { id: "c:fire-on-research-station:2", label: "Leave.", fx: [{ k: "nothing" }] },
      { id: "c:fire-on-research-station:3", label: "Send your Rock crew-member in.", fx: [{ k: "note", text: "High scrap. The augmentation is unnamed." }] },
      { id: "c:fire-on-research-station:4", label: "Send your repair drone into the fire.", fx: [{ k: "note", text: "High scrap. The schematic is unnamed." }] },
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
    body: "It appears the distress beacon is coming from the surface of a nearby moon. Your sensors are picking up a single life form.",
    choices: [
      { id: "c:single-life-form-on-moon:0", label: "Go down to the surface to investigate.", fx: [{ k: "note", text: "Charlie, a crewmember, 5 hull, or scrap and repairs." }] },
      { id: "c:single-life-form-on-moon:1", label: "Ignore the signal.", fx: [{ k: "nothing" }] },
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
    body: "You arrive at the beacon and immediately detect a pirate ship. It seems this distress beacon was a trap!",
    choices: [
      { id: "c:pirate-ship-distress-trap:0", label: "Fight the pirate ship.", fx: [{ k: "fight", tier: "Pirate ship" }] },
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
    body: "The distress signal is coming from a small space station orbiting an uninhabited planet. Their satellite defense system has gone haywire and their repair crew can't approach without being fired on. They're looking for help to fix or disable it.",
    choices: [
      { id: "c:malfunctioning-defense-system:0", label: "Promise to help.", fx: [{ k: "note", text: "Ion, cloaking, an Engi, or low scrap. The 5 hull result stays unwired." }] },
      { id: "c:malfunctioning-defense-system:1", label: "Leave them alone.", fx: [{ k: "nothing" }] },
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
    body: "This Beacon seems to serve as meeting place for local traffic. It seems you can find crew willing to fight on your ship here... for a price.",
    choices: [
      { id: "c:crew-hiring-station:0", label: "Don't hire anyone.", fx: [{ k: "nothing" }] },
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
export function drawFiller(r: Game, list: FillerList, beacons: Beacon[], reserved: ReadonlySet<string> = new Set()): Page | null {
  const pool: Page[] = [];
  for (const row of LISTS[list]) {
    const page = pageForRow(row.dest);
    if (!page) continue;
    if (row.unique && (reserved.has(page.flag) || onMap(beacons, page))) continue;
    pool.push(page);
  }
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rand(r) * pool.length))];
}

/** An "N empty nebula beacons" slot: Empty nebula beacon, or Empty nebula beacon (Slug) in the Slug sectors. */
export function stampEmptyNebula(b: Beacon, sectorName: string) {
  const slug = sectorName.startsWith("Slug");
  b.flag = FILLER_FLAG + (slug ? "empty-nebula-beacon-slug" : "empty-nebula-beacon");
  b.name = slug ? "Empty nebula beacon (Slug)" : "Empty nebula beacon";
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
  return { title: page.dest.replace(/ \(.*\)$/, ""), body: text, choices: [{ id: "ack", label: "Continue" }] };
}

/** Friendly ship out of fuel: "the requested amount of fuel is shown before you make the choice". */
function friendlyCard(g: Game, page: Page): GameEvent {
  const n = between(g, [2, 4]);
  return {
    title: page.dest,
    body: page.body,
    choices: [
      { id: `s:friendly-ship-out-of-fuel:give:${n}`, label: `Give them the fuel. [${n} fuel]` },
      { id: page.choices[1].id, label: page.choices[1].label },
    ],
  };
}

/**
 * Trade scrap for upgrades. The intro "can be any of the following".
 * INFERRED: the four printed texts are equally likely.
 */
const TRADE_INTROS = [
  "You pick up an automated message from a nearby space station. There appears to be a local shipwright that can perform emergency work on military ships.",
  "There are a number of privately owned ship construction platforms in the area. You find one that has a slot open for some immediate work.",
  "You receive a message from a small refugee convoy, \"Hail. We'd like to help you on your mission but don't have much to offer. If you have extra metal perhaps we could work on your ship?\"",
  "You are immediately hailed by a mobile docking platform upon arrival, \"Welcome to Uncle Joe's Fix-it Shop! Need a tune-up? We got you covered!\"",
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
  sys("oxygen", "Oxygen", { 1: [15, 20], 2: [25, 40] });
  sys("pilot", "Piloting", { 1: [8, 15], 2: [25, 40] });
  sys("doors", "Door System", { 1: [8, 15], 2: [25, 40] });
  sys("sensors", "Sensors", { 1: [10, 20], 2: [35, 45] });
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
  "This Beacon seems to serve as meeting place for local traffic. It seems you can find crew willing to fight on your ship here... for a price.",
  "You find a space station set up for travelers. Browsing through its listings, you find a tavern full of mercenaries for hire. You look for potential crewmembers.",
  "There are a number of ships stationed around a rest stop. You immediately receive a message saying, \"If you're looking for some bodies to fill your ship, you've come to the right place!\"",
];

function hireCard(g: Game, page: Page): GameEvent {
  const text = HIRE_INTROS[Math.min(HIRE_INTROS.length - 1, Math.floor(rand(g) * HIRE_INTROS.length))];
  return { title: page.dest, body: text, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

function tradeOfferText(o: TradeOffer): string {
  if (o.id === "reactor") return "They offer to upgrade your reactor in exchange for some scrap.";
  if (o.id === "oxygen") return "They offer to upgrade your Oxygen system in exchange for some scrap.";
  if (o.id === "pilot") return "They offer to upgrade your Piloting subsystem in exchange for some scrap.";
  if (o.id === "doors") return "They offer to upgrade your Door subsystem in exchange for some scrap.";
  return "They offer to upgrade your Sensors subsystem in exchange for some scrap.";
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
    if (offer.scrap) got.push(`Scrap: ${offer.scrap}.`);
    if (offer.fuel) got.push(`Fuel: ${offer.fuel}.`);
    if (offer.missiles) got.push(`Missiles: ${offer.missiles}.`);
    if (offer.parts) got.push(`Drone parts: ${offer.parts}.`);
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
  if (weighted(g, [["safe", 1], ["boom", 1]] as const) === "safe") {
    show(g, "You open your eyes and everything is still where it was a moment ago. You did it!", scrapOnly(g, "medium"));
    return;
  }
  if (hurt(g, 6)) return;
  const note = loseCrew(g);
  show(g, "The weapon detonates. Everything goes dark, the bridge illuminated by flames pouring from the hull, your bomb disposal volunteer spinning off toward a nearby sun. You put out the fires and prepare to move on.", undefined, ["Hull damage: 6.", roomBreach(g), note].filter(Boolean));
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
  return `1 damage to ${r.system}.`;
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
  log(g, "Rebel Fleet is delayed for 1 turn.");
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
    lines.push(`1 damage to ${id}.`);
    log(g, `1 damage to ${id}.`);
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
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  const room = g.player.rooms.find((r) => r.system === id);
  if (!room) return "";
  room.breach += 1;
  return `A breach opens in ${room.title}.`;
}

/** "You lose a crewmember." Clone Bay: "The lost crewmember is revived" unless `noClone`. INFERRED: never the last one. */
function loseCrew(g: Game, noClone = false): string {
  if (!noClone && g.player.kits.cradle) return "The lost crewmember is revived.";
  const mine = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
  if (mine.length <= 1) return "";
  const lost = mine[Math.min(mine.length - 1, Math.floor(rand(g) * mine.length))];
  g.crew = g.crew.filter((c) => c.id !== lost.id);
  return `${lost.name} is lost.`;
}

function gainCrew(g: Game, race = randomRace(g)): string {
  return joinCrew(g, race) ? `A ${race} crewmember joins you.` : "There is no room aboard for the new crewmember.";
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
    { id: "c:asteroid-mining-colony:1", label: "Give them the requested 5 missiles." },
    { id: "c:asteroid-mining-colony:2", label: "Give them 15 missiles." },
    { id: "c:asteroid-mining-colony:3", label: "Decline." },
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

/** Asteroid mining colony. A shortfall leaves the card up. */
function giveMiners(g: Game, n: 5 | 15) {
  if (g.missiles < n) return;
  g.missiles -= n;
  if (n === 5) {
    // No odds on the three results. INFERRED: equal.
    const r = weighted(g, [["hull", 1], ["reactor", 1], ["scrap", 1]] as const);
    if (r === "hull") {
      g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
      show(g, "They thank you and offer to have their engineers repair some of your ship's hull.", undefined, ["Your ship receives 10 repairs."]);
    } else if (r === "reactor") {
      const note = bumpReactor(g);
      show(g, "They thank you and offer to have their engineers upgrade your reactor.", undefined, note ? [note] : []);
    } else {
      const base = between(g, [15, 25]);
      show(g, "They thank you for your generosity and offer some scrap in exchange.", undefined, payMiners(g, base, 0));
    }
    return;
  }
  // No odds on the three results. INFERRED: equal.
  // The augment result names no augment. That grant stays unwired.
  const r = weighted(g, [["both", 1], ["augment", 1], ["scrap", 1]] as const);
  if (r === "both") {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 15);
    const note = bumpReactor(g);
    show(g, "\"Wow. This will help our efforts considerably.\" They offer to have their engineers fix up your ship and upgrade your reactor.", undefined, ["Your ship receives 15 repairs.", note].filter(Boolean));
  } else if (r === "augment") {
    show(g, "\"Wow. This will help our efforts considerably. What could I offer for your troubles...\" After some time they deliver a ship Augment for installation on your ship.");
  } else {
    const base = between(g, [30, 40]);
    show(g, "\"Wow. This will help our efforts considerably. Let me see what I can scrounge up to offer you.\" They deliver some scrap and have their team try to repair part of your hull.", undefined, payMiners(g, base, 5));
  }
}

const SUPPLY_INTROS = [
  "\"You look like a military vessel. We're trying to get back to our homes alive. I'm an engineer by trade and could try to improve your reactor if you have any extra supplies.\"",
  "You receive a message from a small convoy. They're looking for some military supplies and are offering to try to improve your reactor in exchange.",
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
      { id: `s:improve-reactor-for-supplies:agree:${missiles}:${parts}:${fuel}`, label: `Agree to the trade. [${supplyPrice(missiles, parts, fuel)}]` },
      { id: "c:improve-reactor-for-supplies:1", label: "Respectfully decline." },
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
    { id: "c:malfunctioning-defense-system:2", label: "Simply fire on the defense system from a distance." },
  ];
  if (ownsIon(g)) choices.push({ id: "c:malfunctioning-defense-system:3", label: "(Ion Weapon) Disable the defense system." });
  const cloak = cloakLevel(g);
  if (cloak >= 1) choices.push({ id: "c:malfunctioning-defense-system:4", label: "(Cloaking) Use your cloaking to disable the system." });
  if (cloak >= 2) choices.push({ id: "c:malfunctioning-defense-system:5", label: "(Improved Cloaking) Use your cloaking to disable the system." });
  if (cloak >= 3) choices.push({ id: "c:malfunctioning-defense-system:6", label: "(Advanced Cloaking) Use your cloaking to disable the system." });
  if (livingKin(g, "shell")) choices.push({ id: "c:malfunctioning-defense-system:7", label: "(Engi Crew) Remotely repair its targeting system." });
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
  return joinCrew(g, randomRace(g), "Charlie", skills) ? "Charlie joins you." : "There is no room aboard for Charlie.";
}

function clonebayLevel(g: Game): number {
  return g.player.kits.cradle?.level ?? 0;
}

/** The cave. Blue options stay off until the ship meets the printed level. */
function moonCave(g: Game) {
  const choices = [
    { id: "s:moon:bring", label: "Bring him back to your ship in hopes of finding some help for him." },
    { id: "s:moon:leave", label: "Leave the madman to his ravings, he's not worth the risk." },
  ];
  // Template:Blue Option, "Requires level 2" and "Requires level 3". A higher medbay still meets the lower line.
  const med = medbayLevel(g);
  if (med >= 2) choices.push({ id: "s:moon:medbay2", label: "(Improved Medbay) Bring him to your medbay." });
  if (med >= 3) choices.push({ id: "s:moon:medbay3", label: "(Advanced Medbay) Bring him to your medbay." });
  if (livingKin(g, "gel")) choices.push({ id: "s:moon:slug", label: "Sir, allow me to assess his mental state." });
  card(g, "You find a man living alone in a cave. From the appearance of his wrecked ship, it seems he's been here for many years. He looks healthy, but his mental state is questionable.", choices);
}

const TRAP_INTRO = [
  "You arrive at the beacon and immediately detect a pirate ship. It seems this distress beacon was a trap!",
  "\"Haha! I knew someone would fall into our dastardly trap!\" It appears this distress beacon was nothing but a decoy for a pirate ambush.",
  "Your cockpit lights up with warning signals. You are being targeted by a nearby ship. The distress call was a lure to attract unwitting ships into weapons range. You prepare for a fight.",
  "As soon as you arrive at the distress signal, shots are fired toward your ship. A trap!",
];

/** Four printed intros, no odds. INFERRED: equal. */
function trapCard(g: Game, page: Page): GameEvent {
  const body = TRAP_INTRO[Math.min(TRAP_INTRO.length - 1, Math.floor(rand(g) * TRAP_INTRO.length))];
  return { title: page.dest, body, choices: page.choices.map((c) => ({ id: c.id, label: c.label })) };
}

// Abandoned station. The page prints three opening intros and no odds.
// INFERRED: equal. Examine and stay stay the existing choices.
const ABANDONED_STATION_INTROS = [
  "You arrive to find what appears to be a colonized moon, however scans show it has been abandoned. You also detect an abandoned space station near the Beacon.",
  "You find a small space station that appears to be abandoned.",
  "This area shows signs of a battle some time ago. There are scattered remains of ships but one station appears to be intact.",
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
  `You arrive at a beacon located in a civilian star system. A nearby colony contacts you: "We've got a rogue Rebel ship harassing this system. Do you have time to find it?"`,
  `As soon as you arrive, you receive a Federation encrypted message: "A Rebel ship has been terrorizing the local civilians in this system, please seek and destroy it."`,
  "You begin charging your FTL drive, and do a quick scan of a local planet. You find the ruins of a recently destroyed federation colony on the surface. There must be a Rebel ship in the vicinity...",
  `You jump into a field of debris. It appears a battle recently took place here, and the loser seems to have been a civilian ship. A message was left on repeat before it was destroyed: "Rebels attacking, please send aid!" The responsible Rebels are likely still nearby.`,
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
  "What at first seems to be a simple nebula is actually filled with a good amount of debris from a brutal exchange between several ships. Wreckage drifts by your screens and tumbles into the depths of the nebula to be lost to sight. It's hard to determine who the combatants were without closer investigation.",
  "You have jumped into the aftermath of what seems to have been a brutal exchange between several ships. Wreckage drifts by your screens, and you can still see the remains of the dying ships sparking and breaking apart. It's hard to determine who the combatants were without closer investigation.",
];

function wreckageCard(g: Game, page: Page): GameEvent {
  return {
    title: page.dest,
    body: WRECKAGE_INTROS[between(g, [0, 1])]!,
    choices: page.choices.map((c) => ({ id: c.id, label: c.label })),
  };
}

function moonCollapse(g: Game) {
  const choices = [{ id: "s:moon:collapse-continue", label: "Continue..." }];
  if (medbayLevel(g) >= 2) choices.push({ id: "s:moon:collapse-medbay", label: "(Improved Medbay) Quickly bring him to the medbay." });
  if (clonebayLevel(g) >= 2) choices.push({ id: "s:moon:collapse-clone", label: "(Improved Clonebay) Quickly register him into the clonebay." });
  card(g, "It seems he was in worse health than we first thought. He collapses on the trip up to the ship. It doesn't look like he's going to make it...", choices);
}

function diseaseCure(g: Game) {
  const choices = [{ id: "s:unknown-disease:continue", label: "Continue..." }];
  if (g.augments.includes("medbot")) {
    choices.push({ id: "s:unknown-disease:medbot", label: "Use the Nano med-bots to accelerate the dispersal of the cure." });
  }
  card(g, "Your military-grade medical computers are easily able to isolate the cause of the virus, a previously unknown spore that was unearthed during excavations. You are quickly able to inform the colony's leaders of your success in reverse engineering a cure.", choices);
}

/** Refueling station: the printed scrap cost buys that many fuel. A shortfall leaves the card up. */
function buyFuel(g: Game, cost: number, fuel: number) {
  if (g.scrap < cost) return;
  g.scrap -= cost;
  g.fuel += fuel;
  show(g, "\"Thank you for your business.\"", undefined, [`You receive ${fuel} fuel.`]);
}

/** The page says the engines are upgraded and prints no step. INFERRED: one level. A maxed system stays put. */
function bumpEngines(g: Game): string {
  const sys = g.player.systems.engines;
  if (!sys || sys.level <= 0 || upgradeCost("engines", sys.level) == null) return "The engines cannot take the upgrade.";
  sys.level += 1;
  return "Engines upgraded.";
}

function robertJoins(g: Game): string {
  return joinCrew(g, "Mantis", "Robert Smith") ? "Robert Smith joins you." : "There is no room aboard for Robert Smith.";
}

function ownsMindControl(g: Game): boolean {
  return (g.player.kits.leash?.level ?? 0) > 0;
}

/** Confused Mantis, after listening. Blue options stay off until the ship has them. */
function confusedMantisCard(g: Game) {
  const choices = [
    { id: "s:confused-mantis:shuttle", label: "Send a shuttle with an away team to help." },
    { id: "s:confused-mantis:leave", label: "Leave them, a cornered Mantis is too dangerous." },
  ];
  if (livingKin(g, "plain")) choices.push({ id: "s:confused-mantis:human", label: "Send your human crewmember to communicate with the Mantis." });
  if (livingKin(g, "blade")) choices.push({ id: "s:confused-mantis:mantis", label: "Send your Mantis crewmember to communicate with the Mantis." });
  if (ownsMindControl(g)) choices.push({ id: "s:confused-mantis:mind", label: "Use your Mind control system to calm him down." });
  card(g, "Found malfunctioning Mantis. Believes it is human. Will receive input only from human. Danger Evaluation: Extremely High. Provide assistance.", choices);
}

function mantisColony(g: Game) {
  card(g, "The colony is a mining operation that specializes in FTL fuel. Robert's family, the head engineers, are excited to see him, and very grateful for his return. Apparently he ran away to 'join the Federation' like his older brother, but was never accepted onto a ship.", [
    { id: "s:confused-mantis:hire", label: "Offer him a position on your ship." },
    { id: "s:confused-mantis:engines", label: "Ask if they can take a look at your engines." },
  ]);
}

function upgradeOxygen(g: Game): string {
  const sys = g.player.systems.oxygen;
  if (!sys || sys.level <= 0 || upgradeCost("oxygen", sys.level) == null) return "The oxygen system cannot take the upgrade.";
  sys.level += 1;
  return "Oxygen system upgraded.";
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
  if (r === "oxygen") show(g, withLead("After a complete scan of the planet, you find no life. The team is grateful and ready to get to work. The station scientists have a unique talent for life support units and offer to upgrade your oxygen system as thanks."), undefined, [upgradeOxygen(g)]);
  else if (r === "pirate") fight(g, withLead("A complete scan of the planet reveals no life signs other than a single ship on the surface. The terraformers thank you for your help, and attempt to contact the ship. Just as you're about to jump away, the ship takes off and attacks, it's a pirate!"), "Pirate ship", "terraforming-scan");
  else {
    card(g, withLead("A complete scan of the planet reveals a simple mold as the only life present. The terraformers claim their terraforming plans are only hindered by intelligent life; they can begin their work."), [
      { id: "s:terraforming-scan:stop", label: "Tell them to stop. Any life is valuable." },
      { id: "s:terraforming-scan:leave", label: "Leave them to their work." },
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

function refugeeHail(g: Game, slug: string) {
  const r = weighted(g, [
    ["trade", 4],
    ["ambush", 1],
    ["zoltan", 1],
    ["bait", 1],
    ["slug", 1],
  ] as const);
  if (r === "trade") {
    const t = REFUGEE_TRADES[Math.min(3, Math.floor(rand(g) * 4))];
    const pay = between(g, t.payR);
    const get = between(g, t.getR);
    card(g, "The vessel is relieved to hear from you! They are running low on supplies. They suggest a trade.", [
      { id: `s:${slug}:trade:${t.pay}:${pay}:${t.get}:${get}`, label: `Trade with them. [${pay} ${WORD[t.pay]} for ${get} ${WORD[t.get]}]` },
      { id: `s:${slug}:decline`, label: "Politely decline." },
    ]);
  } else if (r === "ambush") {
    fight(g, "As you hail the freighter, it advances, weapons bristling from its hull! It's a pirate ambush!", "Pirate ship", slug);
  } else if (r === "zoltan") {
    fight(g, "As you hail the refugee ship, a Zoltan ship suddenly jumps into the system... it claims the refugees are criminals, and accuses you of escorting fugitives! Before you can respond, it cuts communications, and powers up its weapons!", "Zoltan ship", slug, { never: true });
  } else if (r === "bait") {
    fight(g, "As you hail the refugee ship, a pirate ship jumps into the system... it was using the refugee ship as bait!", "Pirate ship", slug, { never: true });
  } else {
    fight(g, "As you hail the refugee ship, a Slug ship jumps into the system... it was hunting the refugee ship for sport and now they've found you instead!", "Slug ship", slug, { never: true });
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
  card(g, "You find the decaying remains of some kind of ship coated with ice or crystal. You send some crew aboard to explore. Nearly everything is either destroyed or unidentifiable, but one of the weapons appears salvageable and there's a strange stasis pod that catches your eye. It looks like a massive asteroid is in a direct collision course with the derelict ship! You have to pull your crew out but they want to grab what they can first. What do they take?", [
    { id: "s:dense-asteroid-field-distress:weapon", label: "Take the weapon and any spare scrap." },
    { id: "s:dense-asteroid-field-distress:pod", label: "Grab the stasis chamber." },
  ]);
}

/**
 * Lanius ship absorbing jump beacon, Leave.
 * DuplicateEvent|3 is three copies of nothing and one Lanius fight. Established, not invented.
 */
function beaconEaterLeave(g: Game) {
  if (weighted(g, [["nothing", 3], ["fight", 1]] as const) === "nothing") {
    show(g, "You prepare to jump as soon as possible. You don't want to be around if they disable this beacon.", undefined, ["Nothing happens."]);
    return;
  }
  fight(g, "You make preparations to jump but are surprised when the Lanius ship pulls away from the beacon towards you. It appears to be fully operational!", "Lanius ship", "lanius-ship-absorbing-jump-beacon");
}

function parseTrade(id: string): { pay: "fuel" | "missiles" | "parts"; n: number; get: "fuel" | "missiles" | "parts"; m: number } | null {
  const m = id.match(/^s:refugee(?:-distress)?:trade:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/);
  if (!m) return null;
  return { pay: m[1] as "fuel", n: Number(m[2]), get: m[3] as "fuel", m: Number(m[4]) };
}

export const FILLER_CHOICES: Record<string, (g: Game) => void> = {
  // ---- Large asteroid field ----
  "c:large-asteroid-field:0": (g) => {
    const r = weighted(g, [["fuel", 1], ["missiles", 1], ["parts", 1], ["pirate", 1], ["rocks", 1], ["nothing", 1]] as const);
    if (r === "fuel") show(g, "Scans reveal a number of asteroids with useful compositions. You extract some fuel.", resource(g, "fuel", [3, 6]));
    else if (r === "missiles") show(g, "You discover the remains of ship embedded into an asteroid. It still has some functional missiles.", resource(g, "missiles", [2, 4], "medium"));
    else if (r === "parts") show(g, "You happen upon an abandoned mining site. A few mining drones were left behind and could be repurposed.", resource(g, "parts", [1, 1], "medium"));
    else if (r === "pirate") fight(g, "A pirate ship hiding behind one of the larger asteroids attacks you!", "Pirate ship", "large-asteroid-field", { asteroid: true });
    else if (r === "rocks") {
      // Large asteroid field: "5 hull damage, 1 damage to a random system, 1 damage with 1-2 fires to a random room."
      if (hurt(g, 5)) return;
      show(g, "The asteroid field proved more dangerous than expected. Some asteroids managed to get through your ship's defenses.", undefined, ["Hull damage: 5.", hurtRandomSystem(g), rockFires(g)]);
    } else show(g, "A brief exploration yields nothing of interest.");
  },
  "c:large-asteroid-field:1": done,
  // Large asteroid field, Scrap Recovery Arm: "You receive high scrap." The arm must be fitted.
  "c:large-asteroid-field:2": (g) => {
    if (!g.augments.includes("hook")) return;
    show(g, "You carefully extract as much usable material as possible from the nearest asteroids while waiting for the FTL to charge.", scrapOnly(g, "high"));
  },

  // ---- Battlefield wreckage ----
  "c:battlefield-wreckage:0": (g) => {
    const r = weighted(g, [["little", 4], ["slug", 1], ["salvage", 1], ["mantis", 1], ["rebel", 1], ["zoltan", 1]] as const);
    if (r === "little") show(g, "You scan the battlefield, and find little remains. Disappointed, you prepare to jump.");
    else if (r === "slug") show(g, "As you approach the wreckage, a Slug ship makes its arrival. It hesitates for a moment, as if surprised to see anyone remaining, and then jumps away without a word. You resume scanning the system, wary of any other visitors.");
    else if (r === "salvage") show(g, "You scan the battlefield, and are able to salvage some useful material from the wreckage.", rollSurrenderOffer(g, "medium", true));
    else if (r === "mantis") fight(g, "As you approach the wreckage, a Mantis ship screams into the system... either sensing prey - or to finish the job its fellows started.", "Mantis ship", "battlefield-wreckage");
    else if (r === "rebel") fight(g, "The wreckage appears to be a battle between Federation fighters and Rebel cruisers. Though outnumbered, it looks like the Federation fought valiantly. As you begin a more detailed scan of the wreckage, Rebel reinforcements arrive in the system and target your ship!", "Rebel ship", "battlefield-wreckage");
    else fight(g, "As you approach the wreckage, a Zoltan ship makes its arrival. It immediately mistakes you for one of the attackers, declares you as hostile aggressors in violation of Zoltan space, and opens fire!", "Zoltan ship", "battlefield-wreckage");
  },
  "c:battlefield-wreckage:1": done,
  // Battlefield wreckage. {{Blue Option|Improved Sensors|Use your Sensors to scan the wreckage.|level=2|shortreq=Sensors}}.
  // The only printed result. level=2 means at least that installed level. Not a fight, and no "Nothing happens."
  // Advanced Sensors (level=3) can grant an unnamed weapon and prints no odds. Left unwired.
  "c:battlefield-wreckage:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    show(g, "You scan the battlefield, and with the aid of your Sensors, you are able to salvage a moderate amount of material from the wreckage. You prepare to jump.", rollSurrenderOffer(g, "medium", true));
  },

  // ---- Plagued station ----
  "c:plagued-station:0": (g) => {
    const r = weighted(g, [["dead", 1], ["survivor", 1], ["sick", 1]] as const);
    if (r === "dead") show(g, "All around you is the stench of death and decay. The life sign readings must have been malfunctioning because you really doubt anything could be alive in here. You quickly return to the ship.", scrapOnly(g, "low"));
    else if (r === "survivor") show(g, "Human corpses are scattered across the station. You find the source of the signal, a lone survivor that locked themselves in a storage closet. You quickly retreat with them in tow back to the ship, and hope they can recover enough to be of some use.", scrapOnly(g, "low"), [gainCrew(g, "Human")]);
    else {
      const offer = scrapOnly(g, "low");
      payOffer(g, offer, true);
      card(g, `All around you is the stench of death and decay. Suddenly, one of your crew bends over and starts retching violently. Some sort of disease must have wiped out this station. You pull back to the ship, but it looks like your crew member is not going to make it.\n\nScrap: ${offer.scrap}.`, [
        { id: "s:plagued-station:continue", label: "Continue..." },
        // {{Blue Option|Improved Medbay|Try to cure the disease.|level=2+|shortreq=Medbay}}. The button stays on the card.
        { id: "s:plagued-station:cure", label: "Try to cure the disease." },
      ]);
    }
  },
  // "You lose a crewmember." Clone Bay has [no effect]. The page says "(Clone Bay)", any installed level, not level 2+.
  "s:plagued-station:continue": (g) => {
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.cradle) extras.push("You stop your crew's clone from forming, knowing that the disease would follow into his next life.");
    show(g, "Your crewmember insists you leave them behind, not wanting to endanger the rest of the crew. Knowing the truth of this, you hurry back to the ship.", undefined, extras);
  },
  // Improved Medbay level=2+. The page's next line is "Nothing happens." The low scrap was already paid on the disease card.
  "s:plagued-station:cure": (g) => {
    if (medbayLevel(g) < 2) return;
    show(g, "Your advanced medical suite is able to isolate the cause of the problem and administer an antidote. That was a close one.");
  },
  "c:plagued-station:1": (g) => {
    show(g, "While waiting for the FTL drive to charge, you skirt around the edge of the station and collect some scrap.", scrapOnly(g));
  },

  // ---- Rebel fight chance ----
  "c:rebel-fight-chance:0": (g) => {
    const r = weighted(g, [["found", 2], ["slow", 1], ["none", 1]] as const);
    if (r === "found") fight(g, "After a short search you find the Rebel ship. Let's hope he's as easy to defeat in combat as he was to find.", "Rebel ship", "rebel-fight-chance");
    else if (r === "slow") {
      // "Rebel Fleet pursuit is doubled for 1 jump" (citedChoose `faster`: one extra step).
      g.fleet += 1;
      log(g, "Rebel Fleet pursuit is doubled for 1 jump.");
      fight(g, "After far too much time spent searching, you are finally able to track him down. You go into the fight pondering just how much of a head start you've lost on the Rebel Fleet...", "Rebel ship", "rebel-fight-chance");
    } else show(g, "You spend some time looking but your scanners cannot pick up any trace of the Rebel ship. You prepare to move on.");
  },
  "c:rebel-fight-chance:1": done,
  // Rebel fight chance. {{Blue Option|Improved Sensors|Perform a scan of the area.|level=2|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship. level=2 means at least that installed level.
  "c:rebel-fight-chance:2": (g) => {
    if (sensorsLevel(g) < 2) return;
    fight(g, "You quickly find the rebel ship's location and move to intercept.", "Rebel ship", "rebel-fight-chance");
  },
  // Rebel fight chance. {{Blue Option|Advanced Sensors|Pinpoint the Rebel's location.|level=3|shortreq=Sensors}}.
  // One printed lead-in, then a Rebel ship whose engines are disabled.
  // INFERRED: "disabled" damages every installed engine bar. The page prints no bar count.
  // level=3 means at least that installed level.
  "c:rebel-fight-chance:3": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(g, "You find the Rebel ship hiding on a nearby asteroid. You are able to get a shot off and permanently disable their engines before they notice you.", "Rebel ship", "rebel-fight-chance");
    const engines = g.enemy?.systems.engines;
    if (g.enemy && engines && engines.level > engines.damage) hurtSystem(g.enemy, "engines", engines.level - engines.damage);
  },

  // Rebel fight chance in nebula. The chase lists three results and prints no odds. INFERRED: equal.
  "c:rebel-fight-chance-in-nebula:0": (g) => {
    show(g, "You try and stay out of sight. You doubt they saw you.", undefined, ["Nothing happens."]);
  },
  "c:rebel-fight-chance-in-nebula:1": (g) => {
    const r = weighted(g, [["fight", 1], ["double", 1], ["none", 1]] as const);
    if (r === "fight") {
      fight(g, "You follow their vapour trails and surf onto their six o' clock, weapons hot.", "Rebel ship", "rebel-fight-chance-in-nebula");
      return;
    }
    if (r === "double") {
      // "Rebel Fleet pursuit is doubled." No jump count is printed. INFERRED: the current fleet position doubles, the same step as cited-events.ts fx double.
      g.fleet *= 2;
      show(g, "You get disoriented in the nebula and lose your bearings completely. It takes some time to get back to the beacon. It's likely the fleet has had time to advance closer to your position.", undefined, ["Rebel Fleet pursuit is doubled."]);
      return;
    }
    show(g, "Without sensors you can't maintain a lock for long. The rebels slip away.", undefined, ["Nothing happens."]);
  },
  // Advanced Sensors level=3: at least that level. Long-Ranged Scanners and Lifeform Scanner each start the same Rebel fight.
  "c:rebel-fight-chance-in-nebula:2": (g) => {
    if (sensorsLevel(g) < 3) return;
    fight(g, "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range.", "Rebel ship", "rebel-fight-chance-in-nebula");
  },
  "c:rebel-fight-chance-in-nebula:3": (g) => {
    if (!g.augments.includes("glass")) return;
    fight(g, "As soon as they see you they make a run for it. You squeeze what you can out of the malfunctioning sensors and are able to keep track of them enough to get in firing range.", "Rebel ship", "rebel-fight-chance-in-nebula");
  },
  "c:rebel-fight-chance-in-nebula:4": (g) => {
    if (!g.augments.includes("pulseeye")) return;
    fight(g, "Your augment's ability to keep track of their life signatures within the nebula proves useful. You catch up to the ship and prepare for a fight.", "Rebel ship", "rebel-fight-chance-in-nebula");
  },

  // Zoltan Great Eye. Pulling closer lists four results and prints no odds. INFERRED: equal.
  // Clone Bay has no effect. Healing Burst is named. A full weapon list is not installed (INFERRED: the page prints no full-slot sentence).
  "c:zoltan-great-eye:0": (g) => {
    const r = weighted(g, [["lose", 1], ["fight", 1], ["scrap", 1], ["heal", 1]] as const);
    if (r === "lose") {
      const extras = [];
      if (g.player.kits.cradle) extras.push("You check your Cloning Bay but it lies dormant. Whatever just happened to your crewmember must be irreversible.");
      const note = loseCrew(g, true);
      if (note) extras.push(note);
      show(g, "As you approach, a kaleidoscope of colours fills the view-screen and one of your crew begins to age rapidly in reverse, eventually disappearing into nothingness. Let's hope they've transcended physical existence, and not just been forced out of it.", undefined, extras);
      return;
    }
    if (r === "fight") {
      fight(g, "You approach the planet and wait, but nothing happens. The Zoltan hail: \"And in the coming times, when the monolith speaks not with a man he has no future and must be left wanting.\"", "Zoltan ship", "zoltan-great-eye");
      return;
    }
    if (r === "scrap") {
      show(g, "You approach the planet carefully, trying to keep your ship from breaking up in orbit. The monolith, whatever it is, must sense as much because the next thing you know you have enough scrap to patch up your damage and more besides!", scrapOnly(g, "high"));
      return;
    }
    show(g, "As you approach, an ancient alien voice speaks to you: \"Your mission has brought you great battles, and great losses. This will help ease the pain.\" A few minutes later someone reports medical equipment has appeared on the ship!", {
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
    show(g, "Your mission is to save the Federation, not discover new wonders around the galaxy. You prepare to jump.", undefined, ["Nothing happens."]);
  },

  // Slocknog. Hire costs 55 scrap. The page says the skills are shown and prints no numbers, so none are stored.
  // "when you arrive there will be a nebula environment" stays unwired: there is no separate per-fight nebula here.
  "c:slocknog:0": (g) => {
    if (g.scrap < 55) return;
    if (!joinCrew(g, "Slug", "Slocknog")) {
      show(g, "There is no room aboard for Slocknog.");
      return;
    }
    g.scrap -= 55;
    show(g, "You receive a Slug crewmember named Slocknog.", undefined, ["Scrap: -55."]);
  },
  "c:slocknog:1": (g) => {
    card(g, "You power up the FTL, at which point the Slug sends an urgent plea. \"Please, I ssee you are a sssly captain. You have an advantage. Very well. I will join your crew - but please remove me from this rock!\"", [
      { id: "s:slocknog:rescue", label: "Rescue him." },
      { id: "s:slocknog:leave", label: "Leave him." },
    ]);
  },
  "s:slocknog:rescue": (g) => {
    const note = joinCrew(g, "Slug", "Slocknog") ? "Slocknog joins you." : "There is no room aboard for Slocknog.";
    show(g, "When he sees the shuttle headed for his position the Slug thanks you with what looks like sincerity. He readily joins your crew.", undefined, [note]);
  },
  "s:slocknog:leave": (g) => {
    show(g, "You close the frequency and continue jump prep. If this Slug is such a hero he'll find a way off that moon on his own.", undefined, ["Nothing happens."]);
  },

  // Dense asteroid field distress. Search lists three results and prints no odds. INFERRED: equal.
  // The salvaged weapon is not named, so only the low scrap is paid.
  "c:dense-asteroid-field-distress:0": (g) => {
    const r = weighted(g, [["hit", 1], ["scrap", 1], ["remains", 1]] as const);
    if (r === "hit") {
      if (hurt(g, 5)) return;
      if (g.player.systems.engines) hurtSystem(g.player, "engines", 1);
      show(g, "You find what appears to be pieces of a derelict ship coated with ice or crystal. Before you have a chance to dock, a few asteroids get past your shields and partially damage your engines. You'll have to pull out!", undefined, ["Hull damage: 5.", "1 damage to engines."]);
      return;
    }
    if (r === "scrap") {
      show(g, "You find a pirate ship, damaged and abandoned. You salvage what you can and move on.", rollStandard(g));
      return;
    }
    asteroidRemains(g);
  },
  "c:dense-asteroid-field-distress:1": (g) => {
    show(g, "Discretion is the better part of valor. Better not risk it.", undefined, ["Nothing happens."]);
  },
  "c:dense-asteroid-field-distress:2": (g) => {
    if (!g.augments.includes("keel")) return;
    asteroidRemains(g);
  },
  "s:dense-asteroid-field-distress:weapon": (g) => {
    show(g, "Your crew grabs what they can and returns to the ship before the asteroid hits. You take a look at what you've recovered once you move clear of the asteroid field.", scrapOnly(g, "low"));
  },
  "s:dense-asteroid-field-distress:pod": (g) => {
    // Damaged Stasis Pod can be held more than once. Three augments is the ship cap. INFERRED: a fourth is not installed.
    const note = g.augments.length >= 3 ? "Three augments is the cap." : (g.augments.push("stasis"), "Damaged Stasis Pod.");
    show(g, "Your crew drags the pod back to your ship before the asteroid smashes into the ship, shattering through the crystal coating and destroying the ship. The pod appears to be functioning but you see nothing but shards of crystal inside. Perhaps someone else will know how to open it.", scrapOnly(g, "low"), [note]);
  },

  // Disabled Rock ship. Strip lists two results and prints no odds. INFERRED: equal.
  // Leave prints the nothing result twice. The Slug lookout's two sentences are alternatives. INFERRED: equal.
  "c:disabled-rock-ship:0": (g) => {
    const offer = rollStandard(g);
    if (weighted(g, [["patrol", 1], ["quiet", 1]] as const) === "patrol") {
      payOffer(g, offer, true);
      for (const line of standardLines(offer)) log(g, line);
      fight(g, "A Rock patrol ship jumps in while you are salvaging the ship. They message you, \"Filthy pirates! Prepare to die!\" You doubt explaining your mission will convince them of your need.", "Rock ship", "disabled-rock-ship");
      return;
    }
    show(g, "You salvage what you can from the ship. No one bothers you during the operation.", offer);
  },
  "c:disabled-rock-ship:1": (g) => {
    if (weighted(g, [["nothing", 2], ["fight", 1]] as const) === "nothing") {
      show(g, "The Rock people are not known for setting traps but you hasten to leave anyway.", undefined, ["Nothing happens."]);
      return;
    }
    fight(g, "Before you have a chance to leave, a Rock patrol ship arrives and you intercept their comm chatter, \"...appears we've finally found them. Their killing spree ends now!\" Before you can plead your innocence they move in to attack.", "Rock ship", "disabled-rock-ship");
  },
  "c:disabled-rock-ship:2": (g) => {
    if (!livingKin(g, "gel")) return;
    const line = weighted(g, [["clear", 1], ["ship", 1]] as const) === "clear"
      ? "You salvage what you can from the ship. No lifeforms or ships are detected nearby."
      : "You begin the salvage operation but before long your crew warns you of an approaching ship. You hasten to leave before they get within firing range.";
    show(g, line, rollStandard(g));
  },

  // Mantis fugitive. Each list prints no odds. INFERRED: equal.
  // The thanked Mantis is not named, so that crewmember is not added.
  "c:mantis-fugitive:0": (g) => {
    if (weighted(g, [["trap", 1], ["thanks", 1]] as const) === "trap") {
      if (hurt(g, 5)) return;
      const lines = ["Hull damage: 5.", hurtRandomSystem(g), roomBar(g)].filter(Boolean);
      for (const line of lines) log(g, line);
      fight(g, "It was a trap! The Mantis sabotages your ship before teleporting away.", "Engi ship", "mantis-fugitive");
      mantisControlled(g);
      return;
    }
    fight(g, "He expresses his thanks and prepares to help you fight his pursuer.", "Engi ship", "mantis-fugitive");
  },
  "c:mantis-fugitive:1": (g) => {
    const r = weighted(g, [["scrap", 1], ["fire", 1], ["trap", 1]] as const);
    if (r === "scrap") {
      show(g, "The Engi captain is delighted, and quickly arranges for the transfer of the prisoner.", scrapOnly(g, "high"));
      return;
    }
    if (r === "fire") {
      if (hurt(g, 5)) return;
      show(g, "Fury sparks in the eyes of the Mantis. He won't go easily, and causes serious damage before he can be captured.", scrapOnly(g, "high"), ["Hull damage: 5.", rockFires(g)]);
      return;
    }
    fight(g, "The pursuing ship responds with a completely unintelligible message. The young Mantis jerks to attention and assumes a battle stance. It was a trap!", "Engi ship", "mantis-fugitive");
    mantisBoarders(g, 1, 1);
    mantisControlled(g);
  },

  // Slug ship boarding Rock ship. Engage lists a fight and a back-down and prints no odds. INFERRED: equal.
  // Ignore prints the nothing result twice.
  "c:slug-ship-boarding-rock-ship:0": (g) => {
    if (weighted(g, [["fight", 1], ["down", 1]] as const) === "fight") {
      fight(g, "You charge weapons and the Slugs quickly change course to meet your charge.", "Slug ship", "slug-ship-boarding-rock-ship");
      return;
    }
    show(g, "You charge your weapons and the Slugs immediately back down. When you return to the freighter, the Rockmen have already repaired the worst of their damage and jump away without another word.", undefined, ["Nothing happens."]);
  },
  "c:slug-ship-boarding-rock-ship:1": (g) => {
    if (weighted(g, [["nothing", 2], ["fight", 1]] as const) === "nothing") {
      show(g, "You have no desire to provoke Slugs in their own territory. You leave them alone.", undefined, ["Nothing happens."]);
      return;
    }
    fight(g, "After the Slugs board the ship, you are surprised to see the Rock ship spring to life and decimate the other ship. They message you, \"Pathetic. You are either a coward or an ally of the Slugs. Either way, you don't deserve to live.\"", "Rock ship", "slug-ship-boarding-rock-ship-rock");
  },

  // Rock and Slug standoff. The debt is 10-15 scrap, shown on the button. Demand lists three results and prints no odds. INFERRED: equal.
  "c:rock-and-slug-standoff:0": (g) => {
    const debt = between(g, [10, 15]);
    card(g, "The Slug captain explains that they upgraded the Rock ship's reactor and now the 'thick boulder heads' are refusing to pay for the work done. The Rock Captain says the 'slime balls' did a poor job that is not worth their agreed upon price.", [
      { id: `s:rock-slug:debt:${debt}`, label: `Offer to pay off the Rock debt. [${debt} scrap]` },
      { id: "s:rock-slug:demand", label: "Demand the Rock ship pay the agreed upon price." },
      { id: "s:rock-slug:leave", label: "You have better things to attend to, leave them." },
    ]);
  },
  "c:rock-and-slug-standoff:1": (g) => {
    show(g, "Nothing happens.");
  },

  // Lanius ship absorbing rebel base. Three results and no odds. INFERRED: equal.
  // The fight pays default rewards, not up front.
  "c:lanius-ship-absorbing-rebel-base:0": (g) => {
    const r = weighted(g, [["delay", 1], ["fight", 1], ["nothing", 1]] as const);
    if (r === "delay") {
      delayFleetOne(g);
      show(g, "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. They thank you for the tip and prepare to jump in the direction you came. That will hopefully delay the fleet. You scrap what remains of the Rebel station.", rollStandard(g, "medium"), ["Rebel Fleet is delayed for 1 turn."]);
      return;
    }
    if (r === "fight") {
      fight(g, "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. You're not certain if you were misunderstood but they appear to scoff at your suggestion. Most ships continue what they were doing but a single ship moves to fight you.", "Lanius ship", "lanius-ship-absorbing-rebel-base-fight");
      return;
    }
    show(g, "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. However, either the translation device has failed or they're simply not interested. They cut the channel and continue to absorb the ships.", undefined, ["Nothing happens."]);
  },
  "c:lanius-ship-absorbing-rebel-base:1": (g) => {
    show(g, "You decide it would be better to leave them be.", undefined, ["Nothing happens."]);
  },

  // Mantis ships battle for Rock freighter. Two fights and no odds. INFERRED: equal.
  // The weakened ship has Weapon Control reduced by 2. A ship with fewer bars loses only those bars. INFERRED.
  "c:mantis-ships-battle-for-rock-freighter:0": (g) => {
    const weak = weighted(g, [["weak", 1], ["full", 1]] as const) === "weak";
    const text = weak
      ? "The Mantis craft are both too busy slaughtering one another to notice you. Eventually the smaller ship gets the upper hand, but they must have blown a fuse in the assault and their weapons system is inoperable. Now is the time to attack!"
      : "The Mantis craft may have their differences, but when it comes to you they are of one mind. The smaller ship suffers a power failure as it moves to engage, but the larger one lets off a volley of fire and moves in to attack!";
    fight(g, text, "Mantis ship", "mantis-ships-battle-for-rock-freighter");
    if (weak && g.enemy) hurtSystem(g.enemy, "weapons", 2);
  },
  "c:mantis-ships-battle-for-rock-freighter:1": (g) => {
    show(g, "There's quite enough action here already - prepare for light speed.", undefined, ["Nothing happens."]);
  },
  // Repair Drone. High standard. Printed bug: no drone part is required when that reward includes drone parts.
  // The unnamed standard bonus stays unwired.
  "c:mantis-ships-battle-for-rock-freighter:2": (g) => {
    if (!ownsDrone(g, "patch")) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(g, rollStandard(g, "high"), "While the two Mantis fight you approach the Rock ship and send a repair drone through one of the many breaches. It fixes the ship up enough to make at least a single jump. You're surprised when, instead, they embark on a kamikaze run on the two Mantis, which results in the obliteration of all three!", hull, lines);
  },
  // Hull Repair Drone. One drone part, then a Mantis ship. The bug note is not on this choice.
  "c:mantis-ships-battle-for-rock-freighter:3": (g) => {
    if (!ownsDrone(g, "hull") || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    fight(g, "While the two Mantis fight you approach the Rock ship and use a drone to fix up the ship. Once the breaches are fixed the life support flickers back on. In a matter of moments they are already in pursuit of one of the Mantis ships. Meanwhile the second Mantis turns toward you.", "Mantis ship", "mantis-ships-battle-for-rock-freighter");
  },

  // Rock live mine. The turning circle always fails. The defuse lists two results and prints no odds. INFERRED: equal.
  "c:rock-live-mine:0": (g) => {
    card(g, "The ship's turning circle proves too wide and the mine bites down onto the hull. You can hear it now, chewing through the armor.", [
      { id: "s:rock-mine:defuse", label: "Send someone out there to defuse it." },
      { id: "s:rock-mine:missile", label: "Attempt a controlled detonation using a missile." },
      { id: "s:rock-mine:beam", label: "Use a drone to cut away the mine with a precision beam." },
    ]);
  },
  "c:rock-live-mine:1": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 5) return;
    show(g, "It stresses the inertial dampeners, but you reverse course and outrun the mine. You prepare to jump off.", undefined, ["Nothing happens."]);
  },
  "s:rock-mine:defuse": (g) => {
    if (weighted(g, [["scrap", 1], ["wires", 1]] as const) === "scrap") {
      show(g, "Your crewmember dons a space suit and exits the airlock. They make quick work of the basic device and return inside to relief all round. The mine makes good scrap pickings too.", scrapOnly(g, "medium"));
      return;
    }
    card(g, "Your crewmember dons a space suit and exits the airlock. When they open up the mine housing, though, they panic. The red wire or the blue?! 3... 2... 1...", [
      { id: "s:rock-mine:red", label: "Red!" },
      { id: "s:rock-mine:blue", label: "Blue!" },
    ]);
  },
  // Both colors load Cut the wire. Two results and no odds. INFERRED: equal.
  "s:rock-mine:red": (g) => cutMineWire(g),
  "s:rock-mine:blue": (g) => cutMineWire(g),
  // Trivia: the missile item type is misspelled, so the ammo is not spent. Hull Missile does not count.
  "s:rock-mine:missile": (g) => {
    if (!miningMissile(g)) return;
    if (hurt(g, 4)) return;
    show(g, "After drawing straws, a crewmember goes out to fix a modified warhead to the mine. You detonate the missile in a way that dislodges the mine. It blows up shortly after. The ship takes some damage in the blasts, but you're still sailing.", scrapOnly(g, "low"), ["Hull damage: 4.", hurtRandomSystem(g)]);
  },
  // Beam Drone. One drone part, then low scrap. The Anti-Ship Fire Drone does not count.
  "s:rock-mine:beam": (g) => {
    if (!ownsMineBeam(g) || g.player.parts < 1) return;
    g.player.parts -= 1;
    log(g, "Drone parts: -1.");
    show(g, "Carefully guided from the bridge, your beam drone removes the mine's grappling arms and sends it drifting off into space, where you shoot at it until it detonates at a safe distance.", scrapOnly(g, "low"), ["Drone parts: -1."]);
  },

  // Engi smashed ships. "a random amount of resources with some scrap."
  // Rewards Stuff includes an unnamed bonus item. That grant stays unwired.
  "c:engi-smashed-ships:2": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, "Your Engi crewmember refuses. In a halting use of adjectives and nouns, followed by some animated holographic aids, the Engi explains the ships are using each other to, loosely translated, \"achieve a union.\" For some reason, this consolidation of ship matter sounds embarrassing and personal. You elect to leave the two Engi ships to their \"business.\" After questioning your Engi crewmember, however, you do manage to salvage what scrap parts you can from the perimeter, even though you feel slightly dirty for doing so.", rollSurrenderOffer(g, undefined, true));
  },
  "c:lanius-ship-absorbing-rebel-base:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    delayFleetOne(g);
    show(g, "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station.", rollStandard(g, "medium"), ["Rebel Fleet is delayed for 1 turn."]);
  },
  // Lanius ship absorbing jump beacon. Two ask results and no odds. INFERRED: equal.
  // Giving them 30 scrap grants an unnamed augmentation and stays off this card.
  "c:lanius-ship-absorbing-jump-beacon:0": (g) => {
    if (weighted(g, [["talk", 1], ["fight", 1]] as const) === "fight") {
      fight(g, "You begin to message the ship but it quickly powers on its weapons defensively. It appears to be fully functional and looking for a fight!", "Lanius ship", "lanius-ship-absorbing-jump-beacon");
      return;
    }
    card(g, "After a long message the translator only able to spurt out \"critical... must... metal...\" You can only surmise they must be desperate for scrap.", [
      { id: "s:lanius-beacon-eater:leave", label: "Leave." },
    ]);
  },
  "c:lanius-ship-absorbing-jump-beacon:1": (g) => beaconEaterLeave(g),
  "s:lanius-beacon-eater:leave": (g) => beaconEaterLeave(g),
  // Lanius crew. Decline does nothing. The 30 scrap, 6 missile, and 6 drone-part trades grant an unnamed augmentation and stay unwired.
  "c:lanius-ship-absorbing-jump-beacon:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    card(g, "After a time you are told they were damaged and unable to repair their ship due to a lack of metal. They offer to exchange a piece of their ship's equipment for some scrap or other useful materials.", [
      { id: "s:lanius-beacon-eater:decline", label: "Decline." },
    ]);
  },
  "s:lanius-beacon-eater:decline": (g) => {
    show(g, "Nothing happens.");
  },
  // Lanius craftsmen. Decline does nothing. 45, 50, and 40 scrap grant an unnamed augmentation, weapon, or schematic and stay off this card.
  // The Lanius discount is on those same trades and stays unwired.
  "c:lanius-craftsmen:0": (g) => {
    card(g, "They respond, \"We haven't the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something.\"", [
      { id: "s:lanius-craftsmen:decline", label: "Decline their offer." },
    ]);
  },
  "s:lanius-craftsmen:decline": (g) => {
    show(g, "You thank them for the information and prepare to jump.", undefined, ["Nothing happens."]);
  },
  "c:lanius-craftsmen:1": (g) => {
    show(g, "While replicating their innate ability would have immeasurable consequences on commercial manufacturing, your mission has a much higher priority at the moment.", undefined, ["Nothing happens."]);
  },
  // Crew hiring station. "Don't hire anyone." Nothing happens.
  // The 25-45 and 25-55 scrap hires grant an unnamed crewmember and stay unwired.
  "c:crew-hiring-station:0": (g) => {
    show(g, "Nothing happens.");
  },
  // Hull Repair Drone. The page prints no drone-part cost, so the part stays.
  // A full ship refuses the crewmember. INFERRED from the crew cap. The page does not print that sentence.
  "c:lanius-ship-absorbing-jump-beacon:3": (g) => {
    if (!ownsDrone(g, "hull")) return;
    const joined = joinCrew(g, "Lanius");
    show(g, "As soon as the drone gets close, a Lanius in a type of spacewalk maneuvering unit grabs it and immediately starts breaking it down for metal. You prepare for a fight but they appear quite grateful for the act. They start to use the metal to repair key portions of their ship. From what you can understand from the translator it appears one of their crew wishes to join you.", undefined, [
      joined ? "You receive a Lanius crewmember." : "There is no room aboard for the new crewmember.",
    ]);
  },
  // Lanius ship attacking civilian distress. Two results and no odds. INFERRED: equal.
  // A fight pays the page's medium or high standard. Powering down skips that and opens the same contact.
  "c:lanius-ship-attacking-civilian-distress:2": (g) => {
    if (!livingKin(g, "voidlung")) return;
    if (weighted(g, [["fight", 1], ["peace", 1]] as const) === "fight") {
      fight(g, "The ship refuses all hails, even from one of its own kind. It appears to have gone completely rogue. Before you can react, it begins to target your ship. Prepare for a fight.", "Lanius ship", "lanius-ship-attacking-civilian-distress");
      return;
    }
    card(g, "After a discussion that your translator fails to comprehend, the enemy ship powers down its weapons. You learn that your crewmember sucessfully reminded them of their treatise promising to leave the property of sentient aliens alone. If this is a widespread rule of this race, there appear to be many who disagree with it. You attempt to hail the civilian ship now that it's safe.", [
      { id: "q:lanius-civilian:contact", label: "Contact the civilian ship." },
    ]);
  },

  // ---- Refugee / Refugee distress ----
  "c:refugee:0": (g) => refugeeHail(g, "refugee"),
  "c:refugee:1": done,
  "c:refugee-distress:0": (g) => refugeeHail(g, "refugee-distress"),
  "c:refugee-distress:1": done,
  "s:refugee:decline": done,
  "s:refugee-distress:decline": done,

  // ---- Intelligent ponies ----
  "c:intelligent-ponies:0": (g) => {
    card(g, "You land a small shuttle in an enormous field, whose only occupants are small, brightly colored, six-legged, horse-like animals. Could they be what your scans picked up?", [
      { id: "s:intelligent-ponies:talk", label: "Try to communicate peacefully." },
      { id: "s:intelligent-ponies:sell", label: "Bring some of the creatures on board to sell." },
      { id: "s:intelligent-ponies:leave", label: "Leave." },
    ]);
  },
  "s:intelligent-ponies:talk": (g) => {
    if (rand(g) < 0.5) {
      show(g, "None of your attempts to communicate seem to work: they just stare at you silently. As you prepare to leave, one of the creatures canters forward and forcefully nudges you away from the ship. He seems to want you to follow him. Eventually, the creatures guide you to an old Engi ship's crash site. Inside you are able to find and reactivate an Engi!", rollStandard(g, "low"), [gainCrew(g, "Engi")]);
    } else show(g, "You try to communicate in every possible way you can but they just stand there, silently judging you with their large, expressionless eyes. You prepare to leave.");
  },
  "s:intelligent-ponies:sell": (g) => {
    if (rand(g) < 0.5) {
      show(g, "The seemingly docile creatures quickly turn violent when you show your hostile intentions. They stampede with terrifying force, trampling one of your crew before you have time to react. You fight your way back to the shuttle and prepare to jump.", undefined, [loseCrew(g)]);
    } else show(g, "The seemingly docile creatures quickly turn violent when you reveal your hostile intentions. Their well-organized stampede forces you to draw weapons and make a rushed and shambolic retreat to the shuttle.");
  },
  "s:intelligent-ponies:leave": (g) => show(g, "This isn't the time for exobiology. You head back to the ship."),
  "c:intelligent-ponies:1": (g) => show(g, "You ignore the readings and prepare to move on.", undefined, ["Nothing happens."]),

  // ---- Abandoned station ----
  "c:abandoned-station:0": (g) => {
    // DuplicateEvent|2 is the two printed supply lines. INFERRED: equal, so scrap stays twice as common.
    const r = weighted(g, [["rest", 1], ["hull", 1], ["pirates", 1], ["battery", 1], ["clone", 1], ["shell", 1]] as const);
    if (r === "rest") show(g, "You approach cautiously but you detect no danger. It appears to have been a small rest stop that was abandoned a while ago. You take what few supplies you can find.", scrapOnly(g, "low"));
    else if (r === "hull") show(g, "Upon closer inspection it appears to have a large portion of its hull destroyed. You take what few supplies you can find.", scrapOnly(g, "low"));
    else if (r === "pirates") {
      fight(g, "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile scanners pick up a previously undetected pirate ship moving in to attack!", "Pirate ship", "abandoned-station");
      // "2 boarders beam aboard your ship" (surrender.ts humanBoarders, the same intruder kit).
      humanBoarders(g, 2, 2);
    } else if (r === "battery") {
      log(g, "You dock with the station to take a look inside. However no sooner do you open the airlock than pirates burst in. Meanwhile multiple warning signals go off on the bridge. The pirates have activated a remote planetary defense system and it's locking onto your ship!");
      humanBoarders(g, 2, 4, "boarders beam aboard.");
      beginBoarding(g, true);
    } else if (r === "clone") {
      // The Clonebay blue option is not wired; "Scrap the machinery." is.
      card(g, "The station is in disarray. You find a cloning bay partially intact but nothing else seems to be functioning.", [
        { id: "s:abandoned-station:scrap", label: "Scrap the machinery." },
      ]);
    } else show(g, "As you approach it becomes clear that the station is simply an empty shell. It has been stripped of useful materials long ago.");
  },
  "s:abandoned-station:scrap": (g) => show(g, "You take what you can and prepare to move on.", scrapOnly(g, "low")),
  // Abandoned station. "Stay near the Beacon." One printed result.
  "c:abandoned-station:1": (g) => show(g, "You decide it's not worth the time to examine.", undefined, ["Nothing happens."]),

  // ---- Terraforming scan ----
  "c:terraforming-scan:0": (g) => {
    card(g, "\"Thank you! We need to scan this planet for life before we can begin terraforming, but our sensors can't get the necessary power to scan through this atmosphere. We've got a schedule to keep, any chance you could help?\"", [
      { id: "s:terraforming-scan:scan", label: "Attempt to scan the planet." },
      { id: "s:terraforming-scan:sensors", label: "Set sensors to maximum and scan." },
      { id: "s:terraforming-scan:zoltan", label: "Send your crewman to overcharge their systems." },
    ]);
  },
  // Attempt to scan. One of the two printed results. INFERRED: equal. The modulate line is only this success.
  // Improved Sensors and a Zoltan go straight to Successful Scan and do not print it.
  "s:terraforming-scan:scan": (g) => {
    if (rand(g) < 0.5) {
      show(g, "It seems your sensors are no more powerful than the terraformer's. You apologize and continue on your way.");
      return;
    }
    successfulScan(g, "You find if you modulate the feedback signal of your sensors to just the right frequency, you're able to get through the atmosphere and perform a complete scan!");
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
    card(g, "\"But our livelihood depends on this job! Who cares about some silly mold? We'll pay you to look the other way!\"", [
      { id: `s:terraforming-scan:bribe:${n}`, label: `Accept the bribe and leave. [+${n} scrap]` },
      { id: `s:terraforming-scan:pay:${n}`, label: `Offer to pay them to at least delay until the mold can be studied. [${n} scrap]` },
      { id: "s:terraforming-scan:demand", label: "Power your weapons and demand they leave at once." },
    ]);
  },
  "s:terraforming-scan:demand": (g) => show(g, "They shut off communications, but you can tell they have begun an evacuation procedure."),
  "s:terraforming-scan:leave": done,
  "c:terraforming-scan:1": (g) => show(g, "\"We understand. Best of luck on your mission, sir!\""),

  // ---- Nebula lost ship ----
  "c:nebula-lost-ship:0": (g) => {
    const r = weighted(g, [["found", 1], ["rebel", 1], ["none", 1]] as const);
    if (r === "found") show(g, "You get lucky and find them floating not too deep into the nebula. Thrilled to be found by friendlies, they come on board and abandon their wrecked ship.", undefined, [gainCrew(g)]);
    else if (r === "rebel") fight(g, "While searching fruitlessly through the nebula, you stumble upon the rebel ship which the Federation loyalists were likely hiding from. You prepare for a fight.", "Rebel ship", "nebula-lost-ship");
    else show(g, "Your search is hopeless. Your sensors can't pick up anything in the nebula.");
  },
  "c:nebula-lost-ship:1": done,

  // ---- Plasma storm incapacitated ships ----
  "c:plasma-storm-incapacitated-ships:0": (g) => {
    const r = weighted(g, [["debris", 1], ["passenger", 1], ["tether", 1], ["schematic", 1], ["weapon", 1]] as const);
    if (r === "debris") {
      // "4 hull damage, a breach to a random system" and high resources with some scrap.
      // The breach does not destroy the system. The drone schematic on the other result stays ungranted.
      if (hurt(g, 4)) return;
      const breach = breachRandomSystem(g);
      show(g, "Despite your caution, the lack of detection equipment allows debris to crash into your ship, damaging the hull. You salvage what you can and prepare to jump before anything worse happens.", rollSurrenderOffer(g, "high", true), ["Hull damage: 4.", breach]);
    } else if (r === "passenger") {
      show(g, "Within the ship graveyard you find one ship that seems relatively untouched. On board you find an unconscious passenger, and take them back to the ship. Once awake they offer to join your crew in thanks.", rollStandard(g, "low"), [gainCrew(g)]);
    } else if (r === "tether") {
      show(g, "While the crew is off the ship searching through the wrecks, two hulls crash into each other breaking the crew's tethers. You have no time to react as someone is knocked away, floating helplessly into the gaseous clouds...", rollStandard(g, "low"), [loseCrew(g)]);
    } else if (r === "schematic") {
      // The drone schematic is not granted (as in the other tables); the medium scrap is.
      show(g, "Among the junk and scrap you find a salvageable drone schematic. You decide to quit while ahead and prepare to jump with your recent find.", scrapOnly(g, "medium"));
    } else {
      show(g, "Most of the debris is hardly even usable as scrap. However, you eventually find an intact weapon that can be mounted on your ship.", weaponOffer(g, "medium"));
    }
  },
  "c:plasma-storm-incapacitated-ships:1": done,

  // ---- Friendly ship out of fuel (the give id carries the amount; fillerChoose parses it) ----
  "c:friendly-ship-out-of-fuel:1": (g) => show(g, "\"We understand... Please send help our way if you meet anyone trustworthy.\""),

  // ---- Refugee comms down ----
  "c:refugee-comms-down:0": (g) => {
    const r = weighted(g, [["cannibals", 1], ["freezer", 1], ["supplies", 1], ["boarders", 1], ["ghost", 1]] as const);
    if (r === "cannibals") {
      // Clone Bay revives them. The page prints that waiting sentence, then "The lost crewmember is revived."
      const extras = [loseCrew(g)];
      if (g.player.kits.cradle) extras.unshift("Your abandoned crewmember is waiting on the ship when you return, trying not to dwell on the fate of his previous incarnation.");
      show(g, "As you investigate the ship, you are attacked by the now-cannibalistic crew! Driven mad by lack of food, they have turned to feeding on each other. As you fight your way off the ship, one of your crew falls to the crazed attackers, and you are forced to leave them behind or else lose your entire ship.", undefined, extras);
    }
    else if (r === "freezer") show(g, "It looks as if the ship ran out of fuel, and the crew ran out of food not long after. Despite the grisly scene that remains, you find one surviving crewman locked in the freezer, almost perfectly preserved and apparently overlooked by the starving crew.", undefined, [gainCrew(g)]);
    else if (r === "supplies") show(g, "The ship is completely abandoned. It looks like it ran out of fuel... and the crew ran out of food not long after. Despite the grisly scene that remains, you are able to scavenge some supplies from the cargo hold.", resource(g, "missiles", [2, 4], "medium"));
    else if (r === "boarders") {
      log(g, "As you approach the ship, the other ship's transporters suddenly power up, and your decks swarm with now-cannibalistic refugees! Driven mad by lack of food, they have turned to feeding on each other - and now your crew is next!");
      humanBoarders(g, 2, 4, "human boarders beam aboard.");
      beginBoarding(g);
    } else show(g, "The ship is completely abandoned. There is no trace of the crew or any cargo. Mystified, you leave the ghost ship and continue on.");
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
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
    beginBoarding(g);
  },

  // Boarders: Humans near sun. The page has no choice. Arrival calls this id so the red line
  // "2-4 human boarders beam aboard your ship." is the outcome, not a button.
  // INFERRED: the count is inclusive (between()). redgiant=true arms the existing flare clock. No ship.
  "c:boarders-humans-near-sun:0": (g) => {
    humanBoarders(g, 2, 4, "human boarders beam aboard your ship.");
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
    crystalBoarders(g, 2, 3);
    beginBoarding(g);
  },

  // Boarders: Humans jammed sensors. "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
  // INFERRED: the count is inclusive (between()). No ship. Not a crew grant.
  "c:boarders-humans-jammed-sensors:0": (g) => {
    log(g, "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!");
    shutPlayerSensors(g);
    humanBoarders(g, 3, 5, "human boarders beam aboard your ship.");
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
    card(g, "\"While I appreciate your enthusiasm, we have certain protocols for the use of explosives around the workplace. Launching a military grade weapon into our mines isn't exactly what I'd call 'union-friendly'.\"", miningOffers());
  },
  "c:asteroid-mining-colony:1": (g) => giveMiners(g, 5),
  "c:asteroid-mining-colony:2": (g) => giveMiners(g, 15),
  "c:asteroid-mining-colony:3": (g) => {
    show(g, "\"I understand. Good luck out there. We'll try to make do with what we have.\"");
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
    const r = weighted(g, [["lose", 1], ["reward", 1]] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, "Your crew boards the station, cautiously moving between corridors. Suddenly a man-sized arachnid bursts from a vent in the ceiling, followed by countless more. You fight your way back to the airlock and are forced to leave before accounting for all crew members. Not everybody made it back.", undefined, note ? [note] : []);
      return;
    }
    show(g, "Your crew slowly creeps up on a cluster of the creatures from behind. Without warning, the giant arachnids turn and charge. However, your team stays in control and before long you've beaten them back. They are thrilled with your success and offer you a reward.", rollSurrenderOffer(g, "high", true));
  },
  "c:giant-alien-spiders:1": (g) => {
    show(g, "You can't risk fighting some unknown alien on every backwater station you come across. You prepare to jump.");
  },
  "c:giant-alien-spiders:2": (g) => {
    spiderDrone(g, "personnel", "You pull up alongside the station and release the drone through the airlock. Within a short time the majority of the creatures are dead, with only a little collateral damage. They express their most sincere gratitude.");
  },
  "c:giant-alien-spiders:3": (g) => {
    spiderDrone(g, "board", "You launch the drone and it crashes through their hull, leaving a huge breach. You watch as the drone tears through the creatures while debris and dead bodies fly out of the breach. The owners of the station are less than effusive when they thank you, and offer only a meager payment. Maybe it's a good time to leave...");
  },
  "c:giant-alien-spiders:4": (g) => {
    if (!ownsAntiBio(g)) return;
    show(g, "You instruct them to drop their shields and you are able to kill the creatures without damaging the station. \"The monsters just started bursting into flame as we watched. What a terrifying weapon... Here, take this for your help, friend.\"", rollSurrenderOffer(g, "high", true));
  },

  // Crushed pirate. Each pair of results has no odds. INFERRED: equal.
  "c:crushed-pirate:0": (g) => {
    const r = weighted(g, [["shock", 1], ["free", 1]] as const);
    if (r === "shock") {
      if (hurt(g, 2)) return;
      show(g, "You take a few careful shots but you expose a mineral patch in the rock that reacts violently with your weapon. A shockwave forces you back as debris pelts against your hull. When you regain control you find there is not much left of the ship.", scrapOnly(g, "low"), ["Hull damage: 2.", hurtRandomSystem(g, 2)]);
      return;
    }
    show(g, "You fire a few volleys into the rock and it starts to shudder and break apart. Without shields the pirate ship takes a beating but eventually pulls free. They thank you for your assistance.", rollStandard(g, "medium"));
  },
  "c:crushed-pirate:1": (g) => {
    const r = weighted(g, [["loot", 1], ["fight", 1]] as const);
    if (r === "loot") {
      show(g, "You decide the pirate is not worth saving and fire a few volleys into their hull causing the ship to depressurize and break apart. You move in to loot the remains.", rollStandard(g, "medium"));
      return;
    }
    // Fight a Pirate ship (default rewards). The PIRATE surrender and escape rows are that faction's plan.
    fight(g, "You decide the pirate is not worth saving and fire a few volleys into their hull. Before you can scrap the remains another pirate ship flashes on your radar. Perhaps they saw your deed, or perhaps they want to claim the spoils for themselves, but for whatever reason, they're charging weapons!", "Pirate ship", "crushed-pirate");
  },
  "c:crushed-pirate:2": (g) => {
    if (!ownsCuttingBeam(g)) return;
    show(g, "You use your beam to make a few precision cuts in the asteroid. The ship gives a quick burst of thrust and the rock crumbles away. They thank you and offer some of the resources they have collected.", rollStandard(g, "medium"));
  },
  "c:crushed-pirate:3": (g) => {
    if (!ownsBeamDrone(g)) return;
    const hull = g.player.hull;
    const lines = g.log.slice();
    payDronePart(g, rollStandard(g, "medium"), "You program the drone to work carefully around the trapped ship. In a short time it allows the ship to easily slip out of its cage. They thank you and offer some of the resources they have collected.", hull, lines);
  },

  // Unknown disease. Two crew results, no odds. INFERRED: equal. Clone Bay does not revive them.
  "c:unknown-disease-on-mining-colony:0": (g) => {
    const r = weighted(g, [["lose", 1], ["nothing", 1]] as const);
    if (r === "nothing") {
      show(g, "Your crew tries to keep the crowds in line but the scene quickly turns ugly. Half-crazed with fear, the infected grab mining tools and push back at your crew, forcing them to retreat hastily. They barely get away without injury but the same can't be said for the colony's leaders. You quickly leave.");
      return;
    }
    const extras: string[] = [];
    const note = loseCrew(g, true);
    if (note) extras.push(note);
    if (g.player.kits.cradle) extras.push("As your crewman is still alive and working towards a cure, it would be against Federation regulation to create a clone to continue with you on your journey.");
    show(g, "With the visible threat of your weapons, the infected become subdued enough for you to set up a rudimentary quarantine. However before you leave, one of your crew presents signs of infection. You have no choice but to leave them on the station in the hopes that they discover a cure quickly. You leave before more crew succumb.", rollSurrenderOffer(g, "medium", true), extras);
  },
  "c:unknown-disease-on-mining-colony:1": (g) => {
    show(g, "Unfortunately your mission is too important and you're not willing to risk your crew. You prepare to move on.");
  },
  "c:unknown-disease-on-mining-colony:2": (g) => {
    if (!livingKin(g, "stone")) return;
    show(g, "It's unlikely the Rock's impressive immune system is susceptible to a human virus so you send it in. It is able to intimidate the workers long enough for the colony forces to set up a quarantine. Their leaders offer a reward and assure you they will try to find a cure as soon as possible.", rollSurrenderOffer(g, "medium", true));
  },
  "c:unknown-disease-on-mining-colony:3": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, "With no fear of catching the disease, your Engi crewmember helps reassure and organize the infected humans. Calmed by its extensive knowledge of human physiology, the infected submit to the quarantine in the hopes that a cure can be found soon. The colony leaders offer a reward for helping to prevent an ugly incident.", rollSurrenderOffer(g, "medium", true));
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
      show(g, "You send your crew into the station. Unfortunately as soon as they enter the fire breaches the station's fuel cell containment. You quickly try to dock and retrieve your crew but not before an unfortunate soul is lost in the inferno.", scrapOnly(g, "low"), note ? [note] : []);
      return;
    }
    show(g, "Your crew valiantly keeps the fire at bay long enough to allow some of the scientists to escape, but it appears to be a losing battle. Before long you order the retreat. The few scientists they were able to save are distraught but grateful. You'll drop them off at the next station.", scrapOnly(g, "high"));
  },
  "c:fire-on-research-station:1": (g) => {
    const r = weighted(g, [["blast", 1], ["jones", 1]] as const);
    if (r === "blast") {
      if (hurt(g, 4)) return;
      show(g, "You locate the highest concentration of life forms and bring the ship alongside the station. Before you can begin to offload the survivors a huge blast splits the station apart. Your ship is thrown away and some debris pierces your hull. You watch helplessly as the last of the survivors are consumed in the collapse of the station.", scrapOnly(g, "low"), ["Hull damage: 4.", hurtRandomSystem(g)]);
      return;
    }
    // The page names Dr. Jones and not a race. An unnamed race is that sector's crew list.
    const race = randomRace(g);
    const joined = joinCrew(g, race, "Dr. Jones");
    show(g, "You pull up alongside the station and cut through their hull. You are able to rescue a few survivors but many more are lost. One of the survivors offers to join your crew and you offload the rest on a nearby station.", scrapOnly(g, "low"), [joined ? "Dr. Jones joins you." : "There is no room aboard for Dr. Jones."]);
  },
  "c:fire-on-research-station:2": (g) => {
    show(g, "You coldly shut off communications and prepare to leave. Your crew seems upset but you assure them that nothing could have been done.");
  },
  "c:fire-on-research-station:3": (g) => {
    if (!livingKin(g, "stone")) return;
    // The augmentation is unnamed. That grant stays unwired. High scrap is printed.
    show(g, "Your Rock soldier tears through the airlock directly into the fire. You've never seen someone that large move that fast. It disperses as much fire suppressant as possible into the heart of the blaze and eventually the fires start to die down. With most of the fire under control, the scientists are able to help secure the station. They offer you their sincere gratitude and a generous reward.", scrapOnly(g, "high"));
  },
  "c:fire-on-research-station:4": (g) => {
    if (!ownsDrone(g, "patch")) return;
    // The drone schematic is unnamed. That grant stays unwired. High scrap is printed.
    show(g, "You send the repair drone in and it methodically puts out the fires. Once it has made some progress, the rest of your crew helps to secure the station. They offer you their sincere gratitude; the station would have surely been destroyed without your assistance. They transfer a small reward and an additional drone schematic.", scrapOnly(g, "high"));
  },

  // Single life form on moon. Two scenes, no odds. INFERRED: equal.
  "c:single-life-form-on-moon:0": (g) => {
    const scene = weighted(g, [["colony", 1], ["cave", 1]] as const);
    if (scene === "colony") {
      card(g, "You find a colony that seems to have been recently attacked. Exploring the devastation, you find a lone survivor.", [
        { id: "s:moon:invite", label: "Invite him to join your crew." },
        { id: "s:moon:home", label: "Take him home to his family on a nearby planet in this system." },
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
    fight(g, g.event?.body ?? TRAP_INTRO[0], "Pirate ship", "pirate-ship-distress-trap");
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
    show(g, "You fire a few volleys from a distance and it is clear the defense system is no match for your weapons. However, the station does not seem happy with your 'solution'. You salvage what you can and jump before there is trouble.", rollStandard(g, "low"));
  },
  // Any ion weapon, including Ion Bomb and Stun Bomb. Missile ammo is not required and not wasted.
  "c:malfunctioning-defense-system:3": (g) => {
    if (!ownsIon(g)) return;
    show(g, "You use your ion weaponry to disable the gun long enough for their repair crews to fix it. They message you, \"I've never seen a weapon like that before! Thanks for your help! Please, accept this reward.\"", rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:4": (g) => {
    if (cloakLevel(g) < 1) return;
    show(g, "You use your ship's Cloaking to try to prevent the defense system from getting a lock. However before you are able to safely disable the system your cloaking gives out and you are forced to destroy the satellite. No one was harmed but they don't seem happy with your solution.", rollStandard(g, "low"));
  },
  "c:malfunctioning-defense-system:5": (g) => {
    if (cloakLevel(g) < 2) return;
    show(g, "You use your ships Cloaking to prevent the defense system from getting a lock. Once closer, you hasten to disable the system without damaging it. It was a sloppy job but they appreciate it and offer a reward.", rollStandard(g, "medium"));
  },
  "c:malfunctioning-defense-system:6": (g) => {
    if (cloakLevel(g) < 3) return;
    show(g, "Your ship's Advanced Cloaking allows you to approach the defense system without an issue. Once closer, you are able to safely disable the system. They thank you for your help and offer a reward.", rollStandard(g, "high"));
  },
  "c:malfunctioning-defense-system:7": (g) => {
    if (!livingKin(g, "shell")) return;
    show(g, "Your crew-member is able to remotely fix the glitch in the defense AI, allowing the repair crew to close in and finish the job. The station gives you its thanks along with a reward.", rollStandard(g, "high"));
  },

  // Escape pod. Three pry results, no odds. INFERRED: equal.
  "c:escape-pod:0": (g) => {
    show(g, "You send the pod back out the airlock. You're not stupid.");
  },
  "c:escape-pod:1": (g) => {
    const r = weighted(g, [["boarder", 1], ["mantis", 1], ["human", 1]] as const);
    if (r === "boarder") {
      log(g, "The Mantis inside is FURIOUS. He cuts the closest person in half with a single swipe. Kill it before anyone else is hurt.");
      const note = loseCrew(g);
      if (note) log(g, note);
      mantisBoarders(g, 1, 1);
      beginBoarding(g);
      return;
    }
    if (r === "mantis") {
      // The crewmember is not named. That grant stays unwired.
      show(g, "The Mantis inside considers you a messenger from the god of mercy and demands to join your crew.");
      return;
    }
    // The crewmember is not named. That grant stays unwired.
    show(g, "A man bursts out of the life-pod screaming and claws his way into a corner. A rare survivor of Mantis captivity. Once calm, the survivor offers to join your crew for a time.");
  },

  // Confused Mantis. Listening opens the assistance card. Leaving spends nothing.
  "c:confused-mantis:0": (g) => {
    confusedMantisCard(g);
  },
  "c:confused-mantis:1": (g) => {
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
    const cost = between(g, [o.lo, o.hi]);
    card(g, tradeOfferText(o), [
      { id: `s:trade-scrap-for-upgrades:agree:${o.id}:${cost}`, label: `Agree to the exchange. [${cost} scrap]` },
      { id: "s:trade-scrap-for-upgrades:decline", label: "Decline." },
    ]);
  },

  // Hacking blue option. "3-5 human boarders beam aboard your ship." Sensors flicker back on.
  // "If you counter the jam, the Hacking system is not disabled."
  "c:boarders-humans-jammed-sensors:1": (g) => {
    if ((g.player.kits.spike?.level ?? 0) <= 0) return;
    log(g, "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders.");
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
    if (g.player.kits.cradle) extras.push("You briefly consider cloning a replacement, but decide to respect the Federation laws regarding simultaneous duplicates.");
    show(g, "You lose a crewmember.", undefined, extras);
  },

  // Slaver (hostile). {{Blue Option|Engines|Attempt to out-run the slaver ship.|level=6+}}.
  // {{DuplicateEvent|2}} is the two get-away sentences, then one fight. INFERRED: those three printed results are equal.
  // level=6+ means at least that installed level. Get away shows the printed sentence and does not append "Nothing happens."
  "c:slaver-hostile:1": (g) => {
    if ((g.player.systems.engines?.level ?? 0) < 6) return;
    const r = weighted(g, [["divert", 1], ["pace", 1], ["fight", 1]] as const);
    if (r === "divert") {
      show(g, "You divert all available power to your engines and flee. You caught them off-guard, but they seem to be gaining on you. Luckily you are able to stay out of range long enough to charge the FTL drive.");
      return;
    }
    if (r === "pace") {
      show(g, "You fire up the engines and try to escape. Their slower ship is unable to keep pace; eventually it gives up and returns to the beacon to await an easier target.");
      return;
    }
    fight(g, "You quickly fire up your engines and make a break for it. However, it seems to be in vain. They catch up to you effortlessly and power up their weapons.", "Pirate ship", "slaver-hostile");
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
    show(g, `You trade ${trade.n} ${WORD[trade.pay]}.`, offer);
    return true;
  }
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (g.fuel < n) return true;
    g.fuel -= n;
    log(g, `Fuel: -${n}.`);
    const r = weighted(g, [["scrap", 2], ["weapon", 1], ["map", 1], ["reactor", 1]] as const);
    if (r === "scrap") show(g, "You give them the fuel. \"Thank you. Here, have this extra scrap as payment.\"", scrapOnly(g, "high"));
    else if (r === "weapon") {
      const offer = weaponOffer(g, "low");
      offer.scrap = 0;
      offer.eligible = 0;
      show(g, "You give them the fuel. \"Thank the Gods. We can finally get out of here! We're jumping straight home so take this extra weapon. We won't need it, hopefully.\"", offer);
    } else if (r === "map") {
      // "The current sector map is revealed." Not wired: this game has no map reveal.
      show(g, "You give them the fuel. \"Thank you so much! We don't have much to offer, but have a look at the sector scans we took.\" Your map is updated.");
    } else {
      // "If your ship reactor was already fully upgraded ... "Could not upgrade the Reactor, it's maxed""
      let note = "Could not upgrade the Reactor, it's maxed";
      if (upgradeCost("reactor", g.player.reactor) != null) {
        g.player.reactor += 1;
        // Manpower: an event offer to upgrade the reactor does not count against the achievement.
        noteReactorEvent(g);
        note = `Reactor ${g.player.reactor}.`;
      }
      show(g, "You give them the fuel. \"Thank you. Perhaps as payment our engineer can try to optimize your ship's reactor output?\"", undefined, [note]);
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
      show(g, "You let their team on board and after a short time they finish their work.", undefined, [`You lose ${cost} scrap and your ship reactor is upgraded.`]);
      return true;
    }
    const sys = g.player.systems[idSys];
    sys.level += 1;
    // Store upgrade powers a subsystem to its new level. The page does not say the new bar starts powered.
    // INFERRED: piloting, doors, and sensors take that same step.
    if (idSys !== "oxygen") sys.power = sys.level;
    const line = idSys === "sensors"
      ? `You lose ${cost} scrap and your Sensors are upgraded to level ${sys.level}.`
      : `You lose ${cost} scrap and your ${idSys === "oxygen" ? "Oxygen system" : idSys === "pilot" ? "Piloting" : "Door System"} is upgraded to level ${sys.level}.`;
    show(g, "You let their team on board and after a short time they finish their work.", undefined, [line]);
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
    if (!supplyLegal(missiles, parts, fuel)) return true;
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
    show(g, "You make the exchange and their team comes on board to try to improve your reactor.", undefined, lines);
    return true;
  }
  m = id.match(/^s:terraforming-scan:(bribe|pay):(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    if (m[1] === "bribe") {
      // "You receive 15-25 add_scrap": the amount shown on the choice.
      show(g, "You accept the bribe and leave.", { tier: "low", scrap: adjustScrap(g, n), eligible: n, fuel: 0, missiles: 0, parts: 0 });
      return true;
    }
    if (g.scrap < n) return true;
    g.scrap -= n;
    show(g, "They see reason and accept the offer. The station scientists have a unique talent for life support units and offer to upgrade your oxygen system as an apology for their behaviour.", undefined, [`Scrap: -${n}.`, upgradeOxygen(g)]);
    return true;
  }
  if (id === "s:unknown-disease:continue") {
    show(g, "\"Thank you so much! We don't have the funds to hire outside help and it would have taken our staff weeks to figure that out. Here, take this as payment!\"", rollSurrenderOffer(g, "medium", true));
    return true;
  }
  if (id === "s:unknown-disease:medbot") {
    if (!g.augments.includes("medbot")) return true;
    // The weapon is unnamed. That grant stays unwired. High scrap is printed.
    show(g, "You reconfigure your ship's nano dispersal system. In a matter of minutes all of the workers are cured. The leaders can hardly believe what you have achieved. They offer you what they can as payment.", scrapOnly(g, "high"));
    return true;
  }
  let rock = id.match(/^s:rock-slug:(debt|upgrade):(\d+)$/);
  if (rock) return rockSlugPay(g, rock[1] === "debt" ? "debt" : "upgrade", Number(rock[2]));
  if (id === "s:rock-slug:decline") {
    show(g, "You break communications and prepare to move on.", undefined, ["Nothing happens."]);
    return true;
  }
  if (id === "s:rock-slug:leave") {
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:rock-slug:demand") {
    // Agree, a Rock fight, or the explosion. No odds. INFERRED: equal.
    const r = weighted(g, [["pay", 1], ["fight", 1], ["boom", 1]] as const);
    if (r === "pay") {
      slugCaptainGrateful(g, "With much grumbling, the Rock Captain agrees to pay the price.");
      return true;
    }
    if (r === "fight") {
      fight(g, "Apparently the Rock Captain was more annoyed than you thought, they shut off all communication and turn on you, the 'slime balls' defender.", "Rock ship", "rock-and-slug-standoff");
      return true;
    }
    if (hurt(g, 5)) return true;
    const sys = twoSystems(g);
    show(g, "A massive explosion emanates from the Rock Ship, shattering its hull and sending debris on an unavoidable collision course to your ship. Seems like that reactor upgrade was poorly done after all, and the Slugs took the opportunity to jump away.", undefined, [sys].filter(Boolean));
    return true;
  }
  if (id.startsWith("s:moon:")) return moonChoice(g, id);
  if (id.startsWith("s:confused-mantis:")) return confusedMantisChoice(g, id);
  return false;
}

/** Confused Mantis follow-ups. The shuttle's three results have no odds. INFERRED: equal. */
function confusedMantisChoice(g: Game, id: string): boolean {
  if (id === "s:confused-mantis:shuttle") {
    const r = weighted(g, [["home", 1], ["lose", 1], ["nothing", 1]] as const);
    if (r === "home") {
      // The printed next step is Return him home, on this same page.
      card(g, "After an hour of convincing, the Mantis finally calms down and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there.", [
        { id: "s:confused-mantis:return", label: "Return him home." },
      ]);
      return true;
    }
    if (r === "lose") {
      const revived = !!g.player.kits.cradle;
      const note = loseCrew(g);
      const extras = revived ? ["Your crew's clone is waiting when you return to the ship."] : [];
      if (note) extras.push(note);
      show(g, "The cornered and frightened Mantis attacks as soon as you approach. One of your crew is eviscerated before the rest are able to stop him. The Engi apologize for your loss.", undefined, extras);
      return true;
    }
    show(g, "The cornered and frightened Mantis attacks as soon as you approach. You're able to subdue him and leave him at a Mantis colony in a neighboring system. They don't seem pleased or grateful at his return.", undefined, ["Nothing happens."]);
    return true;
  }
  if (id === "s:confused-mantis:human") {
    if (!livingKin(g, "plain")) return true;
    card(g, "The Mantis is grateful to see 'another human', and introduces himself as Robert Smith. He explains he's from a nearby human colony and would appreciate being returned there.", [
      { id: "s:confused-mantis:return", label: "Return him home." },
    ]);
    return true;
  }
  if (id === "s:confused-mantis:return") {
    mantisColony(g);
    return true;
  }
  if (id === "s:confused-mantis:leave") {
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:confused-mantis:mantis") {
    if (!livingKin(g, "blade")) return true;
    show(g, "The Mantis is terrified at the sight of your crewmember. He immediately attacks his Engi rescuers, and your crewmember is forced to kill him. The Engi are grateful for your help and offer a small reward.", rollStandard(g, "low"));
    return true;
  }
  if (id === "s:confused-mantis:mind") {
    if (!ownsMindControl(g)) return true;
    show(g, "The Mantis calms down and communicates thanks to the Engi and yourself for helping. He requests to be dropped off at a nearby planet, at the human colony where he was raised. They are grateful for his return and offer a reward.", rollStandard(g, "medium"));
    return true;
  }
  if (id === "s:confused-mantis:hire") {
    show(g, "He graciously accepts, having always wanted to serve in the Federation.", undefined, [robertJoins(g)]);
    return true;
  }
  if (id === "s:confused-mantis:engines") {
    show(g, "They are happy to take a look, and are able to offer some suggestions for improvements.", undefined, [bumpEngines(g)]);
    return true;
  }
  return false;
}

const CHARLIE_POST: Record<(typeof MOON_SKILLS)[number], string> = {
  weapons: "He states that he was a weapons operator before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
  shields: "He states that he was a shield operator before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
  pilot: "He states that he was a pilot before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
  engines: "He states that he was an engineer before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
  combat: "He states that he was an infantryman before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
  repair: "He states that he was a shipwright before being stranded. He happily offers his services for a time in exchange for \"getting off that rock\".",
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
      show(g, "The family apparently owns one of the most valuable mining enterprises in the sector. For the safe return of his son, the patron of the family offers you a substantial reward.", scrapOnly(g, "high"));
      return true;
    }
    if (r === "medium") {
      show(g, "The survivor's family is of modest means, yet they manage to offer you a reward for your virtuous deed.", scrapOnly(g, "medium"));
      return true;
    }
    const before = g.player.hull;
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    const got = g.player.hull - before;
    show(g, "Overjoyed with the return of their son, the family of the survivor arranges to repair your ship's hull as compensation.", undefined, [`Your ship receives ${got} repairs.`]);
    return true;
  }
  if (id === "s:moon:bring") {
    const r = weighted(g, [["lose", 1], ["charlie", 1], ["blast", 1], ["collapse", 1]] as const);
    if (r === "lose") {
      const note = loseCrew(g);
      show(g, "Once back in orbit, the man turns increasingly violent. Eventually he turns on your crew and manages to kill one before you can subdue him.", undefined, note ? [note] : []);
      return true;
    }
    if (r === "charlie") {
      show(g, "He seems to improve immensely upon getting back to the ship. It might take a while for him to truly be well again, but until them he seems happy to serve as a member of your crew.", undefined, [charlieJoins(g)]);
      return true;
    }
    if (r === "blast") {
      if (hurt(g, 5)) return true;
      show(g, "Being back in space terrifies him. He goes mad and nearly blows a hole in the side of your ship with a makeshift explosive in an attempt to \"escape this metal prison.\" He dies in the explosion.", undefined, ["Hull damage: 5.", hurtRandomSystem(g)]);
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
    const text = id === "s:moon:medbay2"
      ? "Once inside your medbay, the system is able to restore his body and undo some of the damage to his brain. Once awake he states, \"I feel almost like my old self again... Thank you. Please let me serve on your ship.\""
      : "Your improved medbay was able to resuscitate him. After a short time he recovers greatly saying, \"I really thought I was a goner... I haven't eaten for days. Would you mind if I stayed on your ship?\"";
    show(g, text, undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:medbay3") {
    if (medbayLevel(g) < 3) return true;
    show(g, "Once inside your advanced medbay, the system is able to identify and minimize the trauma associated with being alone for so long. Once awake he states, \"I don't know how to repay you, I feel 10 years younger... Let me serve on your ship.\"", undefined, [charlieJoins(g, moonRanks())]);
    return true;
  }
  if (id === "s:moon:collapse-clone") {
    if (clonebayLevel(g) < 2) return true;
    show(g, "Your quick reaction allowed your Clonebay to revive him after he passes. After he steps out of the machine he states, \"How am I alive? Wasn't I just dying on some shuttle? Technology sure has changed.\"", undefined, [charlieJoins(g)]);
    return true;
  }
  if (id === "s:moon:collapse-continue") {
    show(g, "Nothing happens.");
    return true;
  }
  if (id === "s:moon:slug") {
    if (!livingKin(g, "gel")) return true;
    const r = weighted(g, [["stay", 1], ["leave", 1]] as const);
    if (r === "stay") {
      // The crewmember is not named. That grant stays unwired.
      show(g, "You bring the ship closer and the Slug, after a pause, says that the person is stable and with good intentions. You offer a position in your crew and it is graciously accepted.");
      return true;
    }
    show(g, "You bring the ship closer. The Slug enters a trance-like state for 1 to 2 seconds, then quickly snaps out of it. He states, \"This person is clearly unstable. It is best we leave them alone.\"");
    return true;
  }
  return false;
}

/** True when `id` belongs to this module. sim.ts choose calls it after surrenderChoose. */
export function fillerOwns(id: string): boolean {
  return id in FILLER_CHOICES || /^s:(refugee|refugee-distress|friendly-ship-out-of-fuel|terraforming-scan|trade-scrap-for-upgrades|improve-reactor-for-supplies|unknown-disease|moon|confused-mantis|rock-slug):/.test(id);
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
  if (trade && stock(g, trade.pay) < trade.n) return `Need ${trade.n} ${WORD[trade.pay]}`;
  let m = id.match(/^s:friendly-ship-out-of-fuel:give:(\d+)$/);
  if (m && g.fuel < Number(m[1])) return `Need ${m[1]} fuel`;
  m = id.match(/^s:terraforming-scan:pay:(\d+)$/);
  if (m && g.scrap < Number(m[1])) return `Need ${m[1]} scrap`;
  m = id.match(/^s:trade-scrap-for-upgrades:agree:(?:oxygen|pilot|doors|sensors|reactor):(\d+)$/);
  if (m && g.scrap < Number(m[1])) return `Need ${m[1]} scrap`;
  if (id === "c:refueling-station:0" && g.scrap < 12) return "Need 12 scrap";
  if (id === "c:refueling-station:1" && g.scrap < 6) return "Need 6 scrap";
  if (id === "c:refueling-station:2" && g.scrap < 2) return "Need 2 scrap";
  if (id === "c:asteroid-mining-colony:0" && !miningMissile(g)) return "Needs a missile weapon";
  if (id === "c:asteroid-mining-colony:1" && g.missiles < 5) return "Need 5 missiles";
  if (id === "c:asteroid-mining-colony:2" && g.missiles < 15) return "Need 15 missiles";
  // Giant alien spiders blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:giant-alien-spiders:2" && !ownsDrone(g, "personnel")) return "Needs an Anti-Personnel Drone";
  if (id === "c:giant-alien-spiders:3" && !ownsDrone(g, "board")) return "Needs a Boarding Drone";
  if (id === "c:giant-alien-spiders:4" && !ownsAntiBio(g)) return "Needs an Anti-Bio Beam";
  // Malfunctioning defense system blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:malfunctioning-defense-system:3" && !ownsIon(g)) return "Needs an ion weapon";
  if (id === "c:malfunctioning-defense-system:4" && cloakLevel(g) < 1) return "Needs Cloaking";
  if (id === "c:malfunctioning-defense-system:5" && cloakLevel(g) < 2) return "Needs Improved Cloaking";
  if (id === "c:malfunctioning-defense-system:6" && cloakLevel(g) < 3) return "Needs Advanced Cloaking";
  if (id === "c:malfunctioning-defense-system:7" && !livingKin(g, "shell")) return "Needs an Engi crewmember";
  // Crushed pirate blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:crushed-pirate:2" && !ownsCuttingBeam(g)) return "Needs a beam weapon";
  if (id === "c:crushed-pirate:3" && !ownsBeamDrone(g)) return "Needs a beam drone";
  // Unknown disease blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:unknown-disease-on-mining-colony:2" && !livingKin(g, "stone")) return "Needs a Rock crewmember";
  if (id === "c:unknown-disease-on-mining-colony:3" && !livingKin(g, "shell")) return "Needs an Engi crewmember";
  if (id === "c:unknown-disease-on-mining-colony:4" && medbayLevel(g) < 2) return "Needs a level 2 Medbay";
  // Plagued station. Improved Medbay level=2+. INFERRED: the refusal line. The page names the system and prints no refusal sentence.
  if (id === "s:plagued-station:cure" && medbayLevel(g) < 2) return "Needs a level 2 Medbay";
  if (id === "s:unknown-disease:medbot" && !g.augments.includes("medbot")) return "Needs Engi Med-bot Dispersal";
  // Fire on research station blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:fire-on-research-station:3" && !livingKin(g, "stone")) return "Needs a Rock crewmember";
  if (id === "c:fire-on-research-station:4" && !ownsDrone(g, "patch")) return "Needs a Repair Drone";
  // Single life form on moon blue options. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if ((id === "s:moon:medbay2" || id === "s:moon:collapse-medbay") && medbayLevel(g) < 2) return "Needs a level 2 Medbay";
  if (id === "s:moon:medbay3" && medbayLevel(g) < 3) return "Needs a level 3 Medbay";
  if (id === "s:moon:collapse-clone" && clonebayLevel(g) < 2) return "Needs a level 2 Clone Bay";
  if (id === "s:moon:slug" && !livingKin(g, "gel")) return "Needs a Slug crewmember";
  // Confused Mantis blue options. INFERRED: the refusal line. The page names the crew or system and prints no sentence.
  if (id === "s:confused-mantis:human" && !livingKin(g, "plain")) return "Needs a Human crewmember";
  if (id === "s:confused-mantis:mantis" && !livingKin(g, "blade")) return "Needs a Mantis crewmember";
  if (id === "s:confused-mantis:mind" && !ownsMindControl(g)) return "Needs Mind Control";
  // Battlefield wreckage. Improved Sensors level=2. INFERRED: the refusal line. The page names Sensors level 2 and prints no sentence.
  if (id === "c:battlefield-wreckage:2" && sensorsLevel(g) < 2) return "Needs Sensors level 2";
  // Rebel fight chance. Improved Sensors level=2. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:rebel-fight-chance:2" && sensorsLevel(g) < 2) return "Needs Sensors level 2";
  // Rebel fight chance. Advanced Sensors level=3. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:rebel-fight-chance:3" && sensorsLevel(g) < 3) return "Needs Sensors level 3";
  // Rebel fight chance in nebula. INFERRED: the refusal line. The page names the gear and prints no sentence.
  // Advanced Sensors level=3 means at least that installed level.
  if (id === "c:rebel-fight-chance-in-nebula:2" && sensorsLevel(g) < 3) return "Needs Sensors level 3";
  if (id === "c:rebel-fight-chance-in-nebula:3" && !g.augments.includes("glass")) return "Needs Long-Ranged Scanners";
  if (id === "c:rebel-fight-chance-in-nebula:4" && !g.augments.includes("pulseeye")) return "Needs a Lifeform Scanner";
  if (id === "c:slocknog:0" && g.scrap < 55) return "Need 55 scrap";
  // Engi smashed ships. INFERRED: the refusal line. The page names an Engi crewmember.
  if (id === "c:engi-smashed-ships:2" && !livingKin(g, "shell")) return "Needs an Engi crewmember";
  // Mantis ships battle for Rock freighter. INFERRED: the refusal line. The page names the drone and prints no sentence.
  if (id === "c:mantis-ships-battle-for-rock-freighter:2" && !ownsDrone(g, "patch")) return "Needs a Repair Drone";
  if (id === "c:mantis-ships-battle-for-rock-freighter:3" && !ownsDrone(g, "hull")) return "Needs a Hull Repair Drone";
  if (id === "c:mantis-ships-battle-for-rock-freighter:3" && g.player.parts < 1) return "Need 1 drone part";
  // Rock live mine. INFERRED: the refusal line. The page names the gear and prints no sentence.
  if (id === "c:rock-live-mine:1" && (g.player.systems.engines?.level ?? 0) < 5) return "Needs Engines level 5";
  if (id === "s:rock-mine:missile" && !miningMissile(g)) return "Needs a missile weapon";
  if (id === "s:rock-mine:beam" && !ownsMineBeam(g)) return "Needs a Beam Drone";
  if (id === "s:rock-mine:beam" && g.player.parts < 1) return "Need 1 drone part";
  // Lanius ship absorbing rebel base. INFERRED: the refusal line. The page names a Lanius crewmember.
  if (id === "c:lanius-ship-absorbing-rebel-base:2" && !livingKin(g, "voidlung")) return "Needs a Lanius crewmember";
  // Lanius ship absorbing jump beacon. INFERRED: the refusal lines. The page names the crew and the drone and prints no sentence.
  if (id === "c:lanius-ship-absorbing-jump-beacon:2" && !livingKin(g, "voidlung")) return "Needs a Lanius crewmember";
  if (id === "c:lanius-ship-absorbing-jump-beacon:3" && !ownsDrone(g, "hull")) return "Needs a Hull Repair Drone";
  // Lanius ship attacking civilian distress. INFERRED: the refusal line. The page names a Lanius crewmember.
  if (id === "c:lanius-ship-attacking-civilian-distress:2" && !livingKin(g, "voidlung")) return "Needs a Lanius crewmember";
  // Rock and Slug standoff. INFERRED: the refusal line. The button shows the rolled 10-15 scrap.
  m = id.match(/^s:rock-slug:(?:debt|upgrade):(\d+)$/);
  if (m && g.scrap < Number(m[1])) return `Need ${m[1]} scrap`;
  // Dense asteroid field distress. INFERRED: the refusal line. The page names Rock Plating and prints no sentence.
  if (id === "c:dense-asteroid-field-distress:2" && !g.augments.includes("keel")) return "Needs Rock Plating";
  // Disabled Rock ship. INFERRED: the refusal line. The page names a Slug crewmember and prints no sentence.
  if (id === "c:disabled-rock-ship:2" && !livingKin(g, "gel")) return "Needs a Slug crewmember";
  m = id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  if (m) {
    const missiles = Number(m[1]);
    const parts = Number(m[2]);
    const fuel = Number(m[3]);
    if (g.missiles < missiles) return `Need ${missiles} missiles`;
    if (g.player.parts < parts) return `Need ${parts} drone parts`;
    if (g.fuel < fuel) return `Need ${fuel} fuel`;
  }
  if (id === "s:terraforming-scan:sensors" && sensorsLevel(g) < 2) return "Needs Sensors level 2";
  if (id === "s:terraforming-scan:zoltan" && !livingZoltan(g)) return "Needs a Zoltan crewmember";
  if (id === "c:large-asteroid-field:2" && !g.augments.includes("hook")) return "Needs a Scrap Recovery Arm";
  // Boarders: Humans jammed sensors, {{Blue Option|Hacking System|...|shortreq=Hacking}}.
  // INFERRED: the refusal line. The page names the system and does not print this sentence.
  if (id === "c:boarders-humans-jammed-sensors:1" && (g.player.kits.spike?.level ?? 0) <= 0) return "Needs a Hacking system";
  // Slaver (hostile). Engines level=6+. INFERRED: the refusal line. The page names the system and prints no sentence.
  if (id === "c:slaver-hostile:1" && (g.player.systems.engines?.level ?? 0) < 6) return "Needs Engines level 6";
  return null;
}

/** The sector's "Empty beacon (...)" card ("Nothing happens."), for sim.ts eventFor's last resort. */
export function emptyEvent(g: Game): GameEvent {
  return emptyCard(g, emptyPageFor(g.sectorName));
}
