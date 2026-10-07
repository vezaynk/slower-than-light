import { WEAPONS, upgradeCost } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { beginBoarding, hurtSystem, log, rand, startCombat } from "../sim.ts";
import type { Beacon, Game, GameEvent, SysId } from "../types.ts";
import type { CitedEventDef } from "./cited-events-surrender.ts";
import {
  NEVER_RUN,
  between,
  here,
  humanBoarders,
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
import { SECTOR_MIX } from "./beacon-mix.ts";
import { citedPagesFor } from "./cited-events.ts";

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
  // a Mantis ship, a Rebel ship, a Zoltan ship.
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
    ],
  },
  // DONOR_PLAGUE. Board: low scrap; a Human crewmember with low scrap; low scrap then "You lose a crewmember".
  // Scrap: "a random amount of scrap".
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

function cardFor(g: Game, page: Page): GameEvent {
  if (page.slug === "empty-nebula-beacon") return emptyCard(g, emptyPageFor("", true));
  if (page.slug === "friendly-ship-out-of-fuel" && FILLER_PAGES.includes(page as CitedEventDef)) return friendlyCard(g, page);
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

/** "1 damage to a random system". INFERRED: one of the installed systems, equal odds. */
function hurtRandomSystem(g: Game): string {
  const ids = (Object.keys(g.player.systems) as SysId[]).filter((id) => (g.player.systems[id]?.level ?? 0) > 0);
  if (!ids.length) return "";
  const id = ids[Math.min(ids.length - 1, Math.floor(rand(g) * ids.length))];
  hurtSystem(g.player, id, 1);
  return `System damage: ${id}.`;
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
  r.fire = Math.min(3, r.fire + n);
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
function successfulScan(g: Game) {
  const r = weighted(g, [["oxygen", 1], ["pirate", 1], ["mold", 1]] as const);
  if (r === "oxygen") show(g, "After a complete scan of the planet, you find no life. The team is grateful and ready to get to work. The station scientists have a unique talent for life support units and offer to upgrade your oxygen system as thanks.", undefined, [upgradeOxygen(g)]);
  else if (r === "pirate") fight(g, "A complete scan of the planet reveals no life signs other than a single ship on the surface. The terraformers thank you for your help, and attempt to contact the ship. Just as you're about to jump away, the ship takes off and attacks, it's a pirate!", "Pirate ship", "terraforming-scan");
  else {
    card(g, "A complete scan of the planet reveals a simple mold as the only life present. The terraformers claim their terraforming plans are only hindered by intelligent life; they can begin their work.", [
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
      ]);
    }
  },
  // "You lose a crewmember." Clone Bay: "[no effect] You stop your crew's clone from forming".
  "s:plagued-station:continue": (g) => {
    show(g, "Your crewmember insists you leave them behind, not wanting to endanger the rest of the crew. Knowing the truth of this, you hurry back to the ship.", undefined, [loseCrew(g, true)]);
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
  "c:intelligent-ponies:1": done,

  // ---- Abandoned station ----
  "c:abandoned-station:0": (g) => {
    const r = weighted(g, [["supplies", 2], ["pirates", 1], ["battery", 1], ["clone", 1], ["shell", 1]] as const);
    if (r === "supplies") show(g, "You approach cautiously but you detect no danger. It appears to have been a small rest stop that was abandoned a while ago. You take what few supplies you can find.", scrapOnly(g, "low"));
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
  "c:abandoned-station:1": done,

  // ---- Terraforming scan ----
  "c:terraforming-scan:0": (g) => {
    card(g, "\"Thank you! We need to scan this planet for life before we can begin terraforming, but our sensors can't get the necessary power to scan through this atmosphere. We've got a schedule to keep, any chance you could help?\"", [
      { id: "s:terraforming-scan:scan", label: "Attempt to scan the planet." },
      { id: "s:terraforming-scan:sensors", label: "Set sensors to maximum and scan." },
      { id: "s:terraforming-scan:zoltan", label: "Send your crewman to overcharge their systems." },
    ]);
  },
  "s:terraforming-scan:scan": (g) => {
    if (rand(g) < 0.5) {
      show(g, "It seems your sensors are no more powerful than the terraformer's. You apologize and continue on your way.");
      return;
    }
    successfulScan(g);
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
    if (r === "cannibals") show(g, "As you investigate the ship, you are attacked by the now-cannibalistic crew! Driven mad by lack of food, they have turned to feeding on each other. As you fight your way off the ship, one of your crew falls to the crazed attackers, and you are forced to leave them behind or else lose your entire ship.", undefined, [loseCrew(g)]);
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

  // Boarders: Humans (Abandoned). fillerChoose runs before citedChoose, whose fx is nothing.
  // "3-4 human boarders beam aboard your ship." No ship. After a Lanius fight, and on a repeat
  // before another fight, they have Emergency Respirators. INFERRED: lastFaction is that fight.
  "c:boarders-humans-abandoned:0": (g) => {
    const lungs = g.lastFaction === "lanius";
    humanBoarders(g, 3, 4, "human boarders beam aboard your ship.", lungs);
    beginBoarding(g);
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
        note = `Reactor ${g.player.reactor}.`;
      }
      show(g, "You give them the fuel. \"Thank you. Perhaps as payment our engineer can try to optimize your ship's reactor output?\"", undefined, [note]);
    }
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
  return false;
}

/** True when `id` belongs to this module. sim.ts choose calls it after surrenderChoose. */
export function fillerOwns(id: string): boolean {
  return id in FILLER_CHOICES || /^s:(refugee|refugee-distress|friendly-ship-out-of-fuel|terraforming-scan):/.test(id);
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
  if (id === "s:terraforming-scan:sensors" && sensorsLevel(g) < 2) return "Needs Sensors level 2";
  if (id === "s:terraforming-scan:zoltan" && !livingZoltan(g)) return "Needs a Zoltan crewmember";
  if (id === "c:large-asteroid-field:2" && !g.augments.includes("hook")) return "Needs a Scrap Recovery Arm";
  return null;
}

/** The sector's "Empty beacon (...)" card ("Nothing happens."), for sim.ts eventFor's last resort. */
export function emptyEvent(g: Game): GameEvent {
  return emptyCard(g, emptyPageFor(g.sectorName));
}
