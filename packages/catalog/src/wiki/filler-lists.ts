import type { EmptyBeaconDef, FillerListDef } from "@stl/pack";

/**
 * Filler lists and the sentences for a quiet beacon.
 * `base.ts` loads these records. This file does not import the sim.
 * A row id is the page slug the draw already resolves. Large trade station has no card;
 * its id is that same slug, and a draw skips it until a page with that id exists.
 * Choice handlers stay in filler-events.ts. Remembering a unique page stays in the sim.
 */

export type FillerRow = { id: string; dest: string; unique: boolean };

/** Category:Filler Events ("OVERRIDE_NEUTRAL"): every page with alsooccur=filler or exitandfiller, and its unique=. */
export const FILLER: FillerRow[] = [
  { id: "abandoned-station", dest: "Abandoned station", unique: true },
  { id: "auto-ship-attacking-outpost", dest: "Auto-ship attacking outpost", unique: true },
  { id: "auto-ship-near-storage-station", dest: "Auto-ship near storage station", unique: true },
  { id: "battlefield-wreckage", dest: "Battlefield wreckage", unique: false },
  { id: "deactivated-auto-ship", dest: "Deactivated Auto-ship", unique: true },
  { id: "intelligent-ponies", dest: "Intelligent ponies", unique: true },
  { id: "large-asteroid-field", dest: "Large asteroid field", unique: true },
  { id: "pirate-briber", dest: "Pirate briber", unique: true },
  { id: "pirate-ship-attacking-civilian", dest: "Pirate ship attacking civilian", unique: false },
  { id: "pirate-ship-selling-drones", dest: "Pirate ship selling drones", unique: true },
  { id: "plagued-station", dest: "Plagued station", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  { id: "rebel-fight-chance", dest: "Rebel fight chance", unique: false },
  { id: "rebel-ship-supplying-civilians", dest: "Rebel ship supplying civilians", unique: false },
  { id: "rebel-transport-ship", dest: "Rebel transport ship", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "refugee", dest: "Refugee", unique: false },
  { id: "slaver-friendly", dest: "Slaver (friendly)", unique: true },
  { id: "terraforming-scan", dest: "Terraforming scan", unique: true },
  { id: "the-mercenary", dest: "The mercenary", unique: false },
];

/** Template:EventList NEBULA (the "nebula filler" rows), Event name (wiki) and Unique? columns. */
export const NEBULA: FillerRow[] = [
  { id: "auto-ship-fight-in-nebula", dest: "Auto-ship fight in nebula", unique: false },
  {
    id: "auto-ship-near-storage-station-in-nebula",
    dest: "Auto-ship near storage station in nebula",
    unique: true,
  },
  { id: "auto-ship-warning-in-nebula", dest: "Auto-ship warning in nebula", unique: true },
  { id: "boarders-humans-in-nebula", dest: "Boarders: Humans in nebula", unique: true },
  { id: "empty-nebula-beacon", dest: "Empty nebula beacon", unique: false },
  { id: "nebula-lost-ship", dest: "Nebula lost ship", unique: true },
  { id: "mantis-fight-in-nebula", dest: "Mantis fight in nebula", unique: false },
  { id: "pirate-smuggler", dest: "Pirate smuggler", unique: false },
  { id: "rebel-fight-in-nebula", dest: "Rebel fight in nebula", unique: false },
  { id: "trade-resources-in-nebula", dest: "Trade resources in nebula", unique: true },
  { id: "pirate-ship-selling-weapon", dest: "Pirate ship selling weapon", unique: true },
  { id: "auto-ship-fight-in-plasma-storm", dest: "Auto-ship fight in plasma storm", unique: true },
  { id: "boarders-humans-in-plasma-storm", dest: "Boarders: Humans in plasma storm", unique: true },
  {
    id: "plasma-storm-incapacitated-ships",
    dest: "Plasma storm incapacitated ships",
    unique: true,
  },
  { id: "rebel-fight-in-plasma-storm", dest: "Rebel fight in plasma storm", unique: true },
];

/** Template:EventList DISTRESS BEACON, Event name (wiki) and Unique? columns. */
export const DISTRESS: FillerRow[] = [
  { id: "asteroid-belt-distress", dest: "Asteroid belt distress", unique: true },
  { id: "giant-alien-spiders", dest: "Giant alien spiders", unique: true },
  { id: "malfunctioning-defense-system", dest: "Malfunctioning defense system", unique: true },
  {
    id: "unknown-disease-on-mining-colony",
    dest: "Unknown disease on mining colony",
    unique: true,
  },
  { id: "fire-on-research-station", dest: "Fire on research station", unique: true },
  { id: "crushed-pirate", dest: "Crushed pirate", unique: true },
  { id: "escort-civilians-ftl-haywire", dest: "Escort civilians FTL haywire", unique: true },
  { id: "friendly-ship-out-of-fuel", dest: "Friendly ship out of fuel", unique: false },
  {
    id: "pirate-ship-attacking-civilian-distress",
    dest: "Pirate ship attacking civilian distress",
    unique: false,
  },
  { id: "refugee-distress", dest: "Refugee distress", unique: false },
  { id: "refugee-comms-down", dest: "Refugee comms down", unique: false },
  { id: "single-life-form-on-moon", dest: "Single life form on moon", unique: true },
  { id: "pirate-ship-distress-trap", dest: "Pirate ship distress trap", unique: true },
];

/** Template:EventList ITEMS (OVERRIDE_ITEMS adds Large trade station), Event name (wiki) and Unique? columns. */
export const ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Asteroid mining colony", unique: true },
  { id: "refueling-station", dest: "Refueling station", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Sell drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Sell missiles for scrap", unique: true },
  { id: "crew-hiring-station", dest: "Crew hiring station", unique: true },
  { id: "trade-resources", dest: "Trade resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Improve reactor for supplies", unique: true },
];

/**
 * Exit beacons (Template:EventList EXIT LIST): "This event list is actually comprised of 2 event lists - NEUTRAL_EXIT and
 * ITEMS (OVERRIDE_NEUTRAL_EXIT and OVERRIDE_ITEMS - when Advanced Edition Content is enabled)". This game is AE.
 * Rows are Template:EventList OVERRIDE NEUTRAL EXIT and Template:EventList OVERRIDE ITEMS, Event name (wiki) and Unique?.
 */
export const EXIT_NEUTRAL: FillerRow[] = [
  { id: "large-asteroid-field", dest: "Large asteroid field", unique: true },
  { id: "auto-ship-near-storage-station", dest: "Auto-ship near storage station", unique: true },
  { id: "auto-ship-attacking-outpost", dest: "Auto-ship attacking outpost", unique: true },
  { id: "plagued-station", dest: "Plagued station", unique: true },
  { id: "intelligent-ponies", dest: "Intelligent ponies", unique: true },
  { id: "abandoned-station", dest: "Abandoned station", unique: true },
  { id: "slaver-friendly", dest: "Slaver (friendly)", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "pirate-briber", dest: "Pirate briber", unique: true },
  { id: "pirate-ship-attacking-civilian", dest: "Pirate ship attacking civilian", unique: false },
  { id: "pirate-ship-selling-drones", dest: "Pirate ship selling drones", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  { id: "rebel-ship-supplying-civilians", dest: "Rebel ship supplying civilians", unique: false },
  { id: "rebel-transport-ship", dest: "Rebel transport ship", unique: true },
  { id: "refugee", dest: "Refugee", unique: false },
  { id: "rebel-fight-chance", dest: "Rebel fight chance", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "battlefield-wreckage", dest: "Battlefield wreckage", unique: false },
];

export const EXIT_ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Asteroid mining colony", unique: true },
  { id: "refueling-station", dest: "Refueling station", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Sell drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Sell missiles for scrap", unique: true },
  { id: "large-trade-station", dest: "Large trade station", unique: true },
  { id: "crew-hiring-station", dest: "Crew hiring station", unique: true },
  { id: "trade-resources", dest: "Trade resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Improve reactor for supplies", unique: true },
];

export type FillerList = "filler" | "nebula" | "distress" | "items" | "exitNeutral" | "exitItems";

/** "Empty beacon (...)" pages: {{Locations}} sectors and the intro texts. Every one ends "Nothing happens." */
export type EmptyPage = {
  id: string;
  dest: string;
  sectors: string[];
  texts: string[];
  nebula?: boolean;
};

export const EMPTY_PAGES: EmptyPage[] = [
  {
    id: "empty-beacon-civilian",
    dest: "Empty beacon (Civilian)",
    sectors: ["Civilian Sector"],
    texts: [
      "Your jump leads you to nothing but empty space. This Jump Beacon serves no purpose other than as a connection.",
      "You jump into an unremarkable system. No life signs detected within scanning range.",
      "Your scans reveal a mining base on a nearby planet long since abandoned. No life signs detected.",
      "Your scans reveal an ore refinery and several factories, all standing still and empty. No life signs detected.",
      "You discover a nearby planet speckled with settlements, although none respond to your hails.",
      "This beacon has been built for a nearby civilian space-station. No one hails your ship.",
      'The nearby planet shows sign of habitation and great beauty. A rudimentary automated planetary defense system is looping its message into space: "Warning! Quarantine Level 5 in effect under FHA Act 22, article 11.2. Warning! Quarantine Level 5..."',
      "Your jump leads to a completely unremarkable binary star system. There is nothing else around.",
      "Your jump leads to a remarkable binary star system. The view is beautiful, but there is nothing else around.",
    ],
  },
  {
    id: "empty-beacon-crystal",
    dest: "Empty beacon (Crystal)",
    sectors: ["Hidden Crystal Worlds"],
    texts: [
      "As soon as you arrive, all of the ships docked at a nearby station scatter and jump away, while the station itself uses some form of cloak technology to disappear. They mustn't like outsiders here...",
      "No ships are in range, so you take the time to scan the area. It seems like every planet you've seen so far shows signs of highly developed habitation without overpopulation. They must have a very structured and well regulated society.",
      "There appears to be no one living near this node, a rare sight in this highly developed sector.",
      "You arrive near a civilian settlement. It looks like their homes, ships and stations all rely heavily on an intriguing crystalline material. You wonder how they are able to create so much of this substance, as yet undiscovered in the rest of the galaxy.",
      "A few merchant ships pass nearby but they are either ignoring your hails or their computer isn't designed to work through the same frequencies...",
      'A number of civilian ships seem to be evacuating a small colony. One ship messages you before jumping away, "Damn you aliens! This is why we closed that Long-range Beacon in the first place!"',
    ],
  },
  {
    id: "empty-beacon-engi",
    dest: "Empty beacon (Engi)",
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    texts: [
      "The complex arrangements of ship hulls and FTL drive capacitors floating abandoned in space suggest the Engi were here not too long ago; but no longer.",
      "You arrive at a green planet with great plains and rolling waterfalls. It would be of little interest to the Engi nearby.",
      "You have arrived near an Engi construction yard. Most Engi maintain their bi-pedal appearance out of habit but here you see a number of Engi hives working together to create massive organic machines adept at building ships. Truly a sight to behold.",
      'Even though each "individual" Engi is made up of trillions of nano-machines, their culture still revolves around traditional social interactions. A nearby station seems to be constructed for entertainment of passing Engi travellers.',
      "You see a number of Engi space stations and fleets nearby. Despite looking like piles of junk loosely tied together they are actually a model of efficiency. They just lack a certain aesthetic emphasis in their constructions.",
      "This system appears quite peaceful. You're not sure how long it'll last between the combined threats of the Rebels and Mantis.",
      "There are a number of merchant ships passing through the area despite the threat of Mantis invasion. No doubt interested in buying the efficient technology of the Engi.",
      "You see a small Rebel carrier in the distance. You lay low and try to blend in with the other traffic. However it's surprising to see a Rebel military ship alone deep in Engi space.",
      "The Engi seem to have avoided this particular node, along with every other life-form. You keep your eyes peeled for reasons why, but spin up the FTL without event.",
      "A cluster of Engi satellites in orbit of a nearby planet are the only clue the mechanical species was ever here. You have other places to be.",
    ],
  },
  {
    id: "empty-beacon-lanius",
    dest: "Empty beacon (Lanius)",
    sectors: ["Abandoned Sector"],
    texts: [
      "The charts indicate this was the location of a small skirmish over a military facility on a nearby moon. Oddly, scans pick up no signs of debris from either the battle or the station. Yet another area sucked dry by the Lanius.",
      "Scans show no signs of any ships or settlements nearby. You have no way of knowing if the area was always uninhabited or if it was simply erased by the Lanius.",
      "A few refugee ships are preparing for the long journey to another sector. They explain how a number of Lanius military ships surrounded them and began to hack their FTL drives. Fortunately the Lanius moved on after briefly scanning the civilian ships, leaving them more than a little shaken up.",
      'You pass a civilian ship that warns of the nearby Lanius. "One of them attacked a civilian transport and started to melt their fracking hull. But then the weirdest thing happened... another metal ship actually fired on its companion until it backed off." Apparently there are disagreements among the Lanius about what should be salvaged.',
      "You question a local settlement and they describe a fleet of metal ships wordlessly collecting all of the abandoned metal and debris in the area. When they approached important satellites, the settlements fired a few ASB warning shots. The Lanius moved on despite clearly having the firepower to overwhelm the settlements.",
      'You come across a human civilian ship preparing to leave the sector. They message you, "We\'re getting out of here! There was some cult rambling about the spreading of the disease, Humanitis. They forcefully boarded our ship and tried to open all of our airlocks, shouting, "Be purged!" Is nowhere safe anymore?"',
    ],
  },
  {
    id: "empty-beacon-last-stand",
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
    id: "empty-beacon-mantis",
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
    id: "empty-beacon-pirate",
    dest: "Empty beacon (Pirate)",
    sectors: ["Pirate Controlled Sector"],
    texts: [
      "As soon as you arrive, a small ship de-cloaks behind yours. You immediately power up the shields and weapons, but they continue on their trajectory unimpressed. You try to calm your nerves.",
      'A small pirate ship messages you, "That sure is a shiny ship you got there." You fire a warning shot across their bow and they respond, "Hey! No need for violence! It was just a comment..."',
      "The only thing within scanning range is an old abandoned mining structure and a resupply station. They appear to have been picked clean by marauders.",
      'You arrive to have a small fleet of Engi ships target you with a message, "Piracy results in negative societal impact. Not permitted." You assure them of your honest intentions and they allow you to pass.',
    ],
  },
  {
    id: "empty-beacon-rebel",
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
    id: "empty-beacon-rock",
    dest: "Empty beacon (Rock)",
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    texts: [
      "You receive a message meant to degrade you as aliens. You half expect an attack but it seems to have come from a small civilian shuttle.",
      "No one bothers your ship as you float among numerous space stations and mining platforms. The Rock certainly run efficient operations.",
      "You arrive and detect signs of battle. A few ships are taking passes at each other near a small station. You don't know if it's a territory issue, a contest or a rite of passage but you decide it's best to stay out of it.",
      "There's not much at this beacon. Just a few abandoned depots, stripped clean.",
      "A few freighters pass by but they refuse all communications. Must not want to sully their reputation by talking with foreigners.",
      'You see a small trading post and ask about refuelling but they respond, "Go away! We don\'t serve your kind here."',
      'You see a Zoltan merchant and ask about his wares. He responds, "Sorry, but it took years to gain their trust. I can\'t be seen communicating with you. I hope you understand." He cuts communications.',
    ],
  },
  {
    id: "empty-beacon-slug",
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
    id: "empty-beacon-zoltan",
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
    id: "empty-nebula-beacon",
    nebula: true,
    dest: "Empty nebula beacon",
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
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
    id: "empty-nebula-beacon-slug",
    nebula: true,
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

function listEntry(row: FillerRow): { id: string; unique: boolean } {
  return { id: row.id, unique: row.unique };
}

/** The six lists, in authored order. A draw walks that order. */
export function fillerListRecords(): FillerListDef[] {
  return [
    { id: "filler", entries: FILLER.map(listEntry) },
    { id: "nebula", entries: NEBULA.map(listEntry) },
    { id: "distress", entries: DISTRESS.map(listEntry) },
    { id: "items", entries: ITEMS.map(listEntry) },
    { id: "exitNeutral", entries: EXIT_NEUTRAL.map(listEntry) },
    { id: "exitItems", entries: EXIT_ITEMS.map(listEntry) },
  ];
}

/** Quiet-beacon sentences. Civilian is first. The two nebula pages are marked. */
export function emptyBeaconRecords(): EmptyBeaconDef[] {
  return EMPTY_PAGES.map((page) => {
    const copy: EmptyBeaconDef = {
      id: page.id,
      dest: page.dest,
      sectors: [...page.sectors],
      texts: [...page.texts],
    };
    if (page.nebula) copy.nebula = true;
    return copy;
  });
}
