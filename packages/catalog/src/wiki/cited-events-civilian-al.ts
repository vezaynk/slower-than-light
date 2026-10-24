/**
 * Leftover Civilian and Abandoned pages with one stated opening outcome.
 * A choice with several results is left out. Blue options, crew, map reveals,
 * and upgrades are not granted. An unnamed weapon, augmentation or drone schematic is a random one
 * (Rewards; the "item" fx).
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  /** Rewards, "Weapon" / "Augment" / "Drone": a random one the page does not name (bonus-item.ts grantRandomItem). */
  | { k: "item"; item: "weapon" | "augment" | "drone" }
  | { k: "nothing" };

export type CitedEventDef = {
  dest: string;
  slug: string;
  flag: string;
  aliases: string[];
  sectors: string[];
  body: string;
  choices: { id: string; label: string; fx: CitedFx[] }[];
};

export const EXTRA_EVENTS: CitedEventDef[] = [
  // Auto-ship fight has no choice. Arrival applies this fight.
  // "Fight an Auto-ship." unique=false.
  {
    dest: "Auto-ship fight",
    slug: "auto-ship-fight",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship fight]]
    flag: "cited:auto-ship-fight",
    aliases: ["Auto-ship fight"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:auto-ship-fight:0",
        // Wiki citations:
        // > "Fight an Auto-ship." — [[Auto-ship fight]]
        label: "Fight an Auto-ship",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // Prepare to fight. Fight an Auto-ship.
  {
    dest: "Auto-ship fight in plasma storm",
    slug: "auto-ship-fight-in-plasma-storm",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship fight in plasma storm]]
    // > "It is unique." — [[Auto-ship fight in plasma storm]]
    // > "You jump into a sector of the nebula beset by a plasma storm. An automated Rebel scout stationed at the beacon moves in to attack." — [[Auto-ship fight in plasma storm]]
    flag: "cited:auto-ship-fight-in-plasma-storm",
    aliases: ["Auto-ship fight in plasma storm"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "You jump into a sector of the nebula beset by a plasma storm. An automated Rebel scout stationed at the beacon moves in to attack.",
    choices: [
      {
        id: "c:auto-ship-fight-in-plasma-storm:0",
        // Wiki citations:
        // > "Prepare to fight." — [[Auto-ship fight in plasma storm]]
        // > "Fight an Auto-ship." — [[Auto-ship fight in plasma storm]]
        label: "Prepare to fight",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // Attack the automated ship to get to the storage cache. Fight the Auto-ship.
  {
    dest: "Auto-ship near storage station",
    slug: "auto-ship-near-storage-station",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Slug Controlled Nebula, Slug Home Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship near storage station]]
    // > "It is unique." — [[Auto-ship near storage station]]
    // > "An advanced Rebel automated ship remains stationed near a small Rebel space-station. Sensors indicate it's a storage vessel for military goods." — [[Auto-ship near storage station]]
    flag: "cited:auto-ship-near-storage-station",
    aliases: ["Auto-ship near storage station"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "An advanced Rebel automated ship remains stationed near a small Rebel space-station. Sensors indicate it's a storage vessel for military goods.",
    choices: [
      {
        id: "c:auto-ship-near-storage-station:0",
        // Wiki citations:
        // > "Attack the automated ship to get to the storage cache." — [[Auto-ship near storage station]]
        // > "Fight the Auto-ship." — [[Auto-ship near storage station]]
        label: "Attack the automated ship to get to the storage cache",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
      {
        id: "c:auto-ship-near-storage-station:1",
        // Wiki citations:
        // > "Avoid provoking the ship." — [[Auto-ship near storage station]]
        // > "Nothing happens." — [[Auto-ship near storage station]]
        label: "Avoid provoking the ship",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Auto-ship warning in nebula has no choice. Arrival applies this fight.
  // "Fight an Auto-ship that is running away." unique=true. nebula=true.
  {
    dest: "Auto-ship warning in nebula",
    slug: "auto-ship-warning-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Auto-ship warning in nebula]]
    // > "It is unique." — [[Auto-ship warning in nebula]]
    // > "It appears that an automated Rebel scout was positioned within the nebula to warn of your passing." — [[Auto-ship warning in nebula]]
    flag: "cited:auto-ship-warning-in-nebula",
    aliases: ["Auto-ship warning in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "It appears that an automated Rebel scout was positioned within the nebula to warn of your passing.",
    choices: [
      {
        id: "c:auto-ship-warning-in-nebula:0",
        // Wiki citations:
        // > "Fight an Auto-ship that is running away." — [[Auto-ship warning in nebula]]
        label: "Fight an Auto-ship that is running away",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // You receive {{tooltip|low|1-3}} fuel and a quest marker is added to your map.
  {
    dest: "Escort civilians",
    slug: "escort-civilians",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds." — [[Escort civilians]]
    flag: "cited:escort-civilians",
    aliases: ["Escort civilians"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:escort-civilians:0",
        // Wiki citations:
        // > "Accept." — [[Escort civilians]]
        // > "You receive low fuel and a quest marker is added to your map." — [[Escort civilians]]
        label: "Accept",
        fx: [
          { k: "res", id: "fuel", sign: 1, lo: 1, hi: 3 },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          { k: "nothing" },
        ],
      },
      {
        id: "c:escort-civilians:1",
        // Wiki citations:
        // > "Decline." — [[Escort civilians]]
        // > "Nothing happens." — [[Escort civilians]]
        label: "Decline",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // You receive a weapon with low scrap.
  {
    dest: "Free weapon",
    slug: "free-weapon",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Hidden Crystal Worlds, Mantis Controlled Sector, Mantis Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Slug Controlled Nebula, Slug Home Nebula, Uncharted Nebula." — [[Free weapon]]
    flag: "cited:free-weapon",
    aliases: ["Free weapon"],
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
    ],
    body: "",
    choices: [
      {
        id: "c:free-weapon:0",
        // Wiki citations:
        // > "You receive a weapon with low scrap." — [[Free weapon]]
        label: "You receive a weapon with low scrap",
        fx: [
          { k: "tier", tier: "low" },
          { k: "item", item: "weapon" },
        ],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight has no choice. Arrival calls this fight. One of the eleven printed intros, including the repeated line. unique=false.
  {
    dest: "Lanius fight",
    slug: "lanius-fight",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight]]
    flag: "cited:lanius-fight",
    aliases: ["Lanius fight"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-fight:0",
        // Wiki citations:
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius fight]]
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight distress has no choice. Arrival calls this fight. The printed sentence is the card body. distress=true. unique=true.
  {
    dest: "Lanius fight distress",
    slug: "lanius-fight-distress",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight distress]]
    // > "It is unique." — [[Lanius fight distress]]
    // > "You are too late - whatever once was emitting the distress signal from this system drew a Lanius ship as well as your own. Having consumed the original target, the Lanius turn their attention to your vessel." — [[Lanius fight distress]]
    flag: "cited:lanius-fight-distress",
    aliases: ["Lanius fight distress"],
    sectors: ["Abandoned Sector"],
    body: "You are too late - whatever once was emitting the distress signal from this system drew a Lanius ship as well as your own. Having consumed the original target, the Lanius turn their attention to your vessel.",
    choices: [
      {
        id: "c:lanius-fight-distress:0",
        // Wiki citations:
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius fight distress]]
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight in asteroid field has no choice. Arrival calls this fight. The printed sentence is the card body. asteroidfield=true. unique=true.
  {
    dest: "Lanius fight in asteroid field",
    slug: "lanius-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight in asteroid field]]
    // > "It is unique." — [[Lanius fight in asteroid field]]
    // > "This beacon appears to have been set up within an asteroid field to access a mining settlement. However, half of the settlement has been disassembled by a number of Lanius scavengers. Their military escort moves in to scare you off." — [[Lanius fight in asteroid field]]
    flag: "cited:lanius-fight-in-asteroid-field",
    aliases: ["Lanius fight in asteroid field"],
    sectors: ["Abandoned Sector"],
    body: "This beacon appears to have been set up within an asteroid field to access a mining settlement. However, half of the settlement has been disassembled by a number of Lanius scavengers. Their military escort moves in to scare you off.",
    choices: [
      {
        id: "c:lanius-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius fight in asteroid field]]
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship", asteroid: true }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight near pulsar has no choice. Arrival calls this fight. The printed sentence is the card body. pulsar=true. unique=true.
  {
    dest: "Lanius fight near pulsar",
    slug: "lanius-fight-near-pulsar",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius fight near pulsar]]
    // > "It is unique." — [[Lanius fight near pulsar]]
    // > "There appears to be some sort of research station near a pulsar, although it's hard to tell since a portion of it has been melted. The Lanius ship that has been working at it moves in to intercept you, totally oblivious to the threat of EM pulses." — [[Lanius fight near pulsar]]
    flag: "cited:lanius-fight-near-pulsar",
    aliases: ["Lanius fight near pulsar"],
    sectors: ["Abandoned Sector"],
    body: "There appears to be some sort of research station near a pulsar, although it's hard to tell since a portion of it has been melted. The Lanius ship that has been working at it moves in to intercept you, totally oblivious to the threat of EM pulses.",
    choices: [
      {
        id: "c:lanius-fight-near-pulsar:0",
        // Wiki citations:
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius fight near pulsar]]
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // Attack the Lanius ship. Fight a Lanius ship.
  {
    dest: "Lanius lone ship",
    slug: "lanius-lone-ship",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius lone ship]]
    // > "It is unique." — [[Lanius lone ship]]
    // > "You arrive at the beacon to discover a civilian ship fleeing from a lone Lanius craft. The civilian messages you, \"Help! The metal monsters are coming to melt down our ship!\" Strangely, no active weapon signatures are detected." — [[Lanius lone ship]]
    flag: "cited:lanius-lone-ship",
    aliases: ["Lanius lone ship"],
    sectors: ["Abandoned Sector"],
    body: 'You arrive at the beacon to discover a civilian ship fleeing from a lone Lanius craft. The civilian messages you, "Help! The metal monsters are coming to melt down our ship!" Strangely, no active weapon signatures are detected.',
    choices: [
      {
        id: "c:lanius-lone-ship:0",
        // Wiki citations:
        // > "Attack the Lanius ship." — [[Lanius lone ship]]
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius lone ship]]
        label: "Attack the Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-lone-ship:1",
        // Wiki citations:
        // > "Stay out of it." — [[Lanius lone ship]]
        // > "Nothing happens." — [[Lanius lone ship]]
        label: "Stay out of it",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:lanius-lone-ship:2",
        // Wiki citations:
        // > "Try to contact the Lanius ship." — [[Lanius lone ship]]
        label: "Try to contact the Lanius ship.",
        fx: [
          { k: "note", text: "Continuing may open a store, start a Lanius fight, or do nothing." },
        ],
      },
      {
        id: "c:lanius-lone-ship:3",
        // Wiki citations:
        // > "Try to contact the ship." — [[Lanius lone ship]]
        // > "A store opens." — [[Lanius lone ship]]
        label: "Try to contact the ship.",
        fx: [{ k: "note", text: "A Lanius crewmember opens a store." }],
      },
    ],
  },
  // Scan the ship for lifeforms. Fight a Lanius ship. Power weapons and investigate are quest branches.
  {
    dest: "Lanius powered-down ship",
    slug: "lanius-powered-down-ship",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius powered-down ship]]
    // > "It is unique." — [[Lanius powered-down ship]]
    // > "You have picked up a Lanius vessel drifting in this sector. There is no damage to the hull, and it appears to be powered down." — [[Lanius powered-down ship]]
    flag: "cited:lanius-powered-down-ship",
    aliases: ["Lanius powered-down ship"],
    sectors: ["Abandoned Sector"],
    body: "You have picked up a Lanius vessel drifting in this sector. There is no damage to the hull, and it appears to be powered down.",
    choices: [
      {
        id: "c:lanius-powered-down-ship:0",
        // Wiki citations:
        // > "Scan the ship for lifeforms." — [[Lanius powered-down ship]]
        // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius powered-down ship]]
        label: "Scan the ship for lifeforms",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-powered-down-ship:1",
        // Wiki citations:
        // > "Power weapons to attack." — [[Lanius powered-down ship]]
        label: "Power weapons to attack.",
        fx: [{ k: "note", text: "They wake and fight, or stay silent." }],
      },
      {
        id: "c:lanius-powered-down-ship:2",
        // Wiki citations:
        // > "Investigate the vessel." — [[Lanius powered-down ship]]
        label: "Investigate the vessel.",
        fx: [
          { k: "note", text: "Ignore, strip the hull, send a Lanius, or use level 2 piloting." },
        ],
      },
    ],
  },
  // Attack the Lanius ship. Fight a Lanius ship.
  {
    dest: "Lanius ship attacking Slug",
    slug: "lanius-ship-attacking-slug",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius ship attacking Slug]]
    // > "It is unique." — [[Lanius ship attacking Slug]]
    // > "The distress signal from this system is coming from a Slug vessel under attack by the Lanius! The Slugs beg for assistance as the Lanius tear into their hull plating." — [[Lanius ship attacking Slug]]
    flag: "cited:lanius-ship-attacking-slug",
    aliases: ["Lanius ship attacking Slug"],
    sectors: ["Abandoned Sector"],
    body: "The distress signal from this system is coming from a Slug vessel under attack by the Lanius! The Slugs beg for assistance as the Lanius tear into their hull plating.",
    choices: [
      {
        id: "c:lanius-ship-attacking-slug:0",
        // Wiki citations:
        // > "Attack the Lanius ship." — [[Lanius ship attacking Slug]]
        // > "Fight a Lanius ship." — [[Lanius ship attacking Slug]]
        label: "Attack the Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-ship-attacking-slug:1",
        // Wiki citations:
        // > "Leave the Slugs to their fate." — [[Lanius ship attacking Slug]]
        // > "Nothing happens." — [[Lanius ship attacking Slug]]
        label: "Leave the Slugs to their fate",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Boarders: Humans in nebula. The page prints no button. The red line is the outcome, applied on arrival.
  // "2-4 human boarders beam aboard your ship." nebula=true, LRSmap=noship+nebula, unique=true.
  // The page prints three intros; this card uses the first. Not a crew grant. No ship.
  {
    dest: "Boarders: Humans in nebula",
    slug: "boarders-humans-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Uncharted Nebula." — [[Boarders: Humans in nebula]]
    // > "It is unique." — [[Boarders: Humans in nebula]]
    // > "You see a small station nearby and feel the shudder of shots ringing through the ship. You can't be sure without sensors, but it seems there may be intruders on the ship!" — [[Boarders: Humans in nebula]]
    flag: "cited:boarders-humans-in-nebula",
    aliases: ["Boarders: Humans in nebula"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "You see a small station nearby and feel the shudder of shots ringing through the ship. You can't be sure without sensors, but it seems there may be intruders on the ship!",
    choices: [
      {
        id: "c:boarders-humans-in-nebula:0",
        // Wiki citations:
        // > "2-4 human boarders beam aboard your ship." — [[Boarders: Humans in nebula]]
        label: "2-4 human boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Boarders: rebels in nebula. The page prints no button. The red line is the outcome, applied on arrival.
  // "3-4 human boarders beam aboard your ship." nebula=true, LRSmap=noship+nebula, unique=true.
  // Not a crew grant. No ship.
  {
    dest: "Boarders: rebels in nebula",
    slug: "boarders-rebels-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Uncharted Nebula, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Boarders: rebels in nebula]]
    // > "It is unique." — [[Boarders: rebels in nebula]]
    // > "There appear to be a number of small stations nearby. Before you have time to scan them, warnings go off. A Rebel teleporter was used in one of the stations. You've been boarded!" — [[Boarders: rebels in nebula]]
    flag: "cited:boarders-rebels-in-nebula",
    aliases: ["Boarders: rebels in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "There appear to be a number of small stations nearby. Before you have time to scan them, warnings go off. A Rebel teleporter was used in one of the stations. You've been boarded!",
    choices: [
      {
        id: "c:boarders-rebels-in-nebula:0",
        // Wiki citations:
        // > "3-4 human boarders beam aboard your ship." — [[Boarders: rebels in nebula]]
        label: "3-4 human boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
