/**
 * Leftover Zoltan pages. An opening choice is kept only when it states one
 * amount, scrap tier, hull number, fleet delay, or one named fight.
 * Winning branches, blue options, crew, map reveals, and unnamed items are not granted.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
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
  // Engi fight has no choice. Arrival calls c:engi-fight:0.
  // "Fight an Engi ship (default rewards)." unique=true.
  {
    dest: "Engi fight",
    slug: "engi-fight",
    flag: "cited:engi-fight",
    aliases: ["Engi fight", "Engi fight (Zoltan)", "Zoltan Engi fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You jump into a debris field that used to be a Zoltan cruiser. Unfortunately, its Engi escort takes you for the attacker and retaliates! They refuse all hails.",
    choices: [
      {
        id: "c:engi-fight:0",
        label: "Fight an Engi ship",
        fx: [
          // "Fight an Engi ship (default rewards)."
          { k: "fight", tier: "Engi ship" },
        ],
      },
    ],
  },
  // Mantis fight (Zoltan) has no choice. Arrival calls c:mantis-fight-zoltan:0.
  // "Fight a Mantis ship (default rewards)." unique=true.
  {
    dest: "Mantis fight (Zoltan)",
    slug: "mantis-fight-zoltan",
    flag: "cited:mantis-fight-zoltan",
    aliases: ["Mantis fight (Zoltan)", "Zoltan Mantis fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You pick up the last broadcast from a rupturing Zoltan freighter: \"The Mantis, they're here, please-\" You're interrupted by fire off the port bow!",
    choices: [
      {
        id: "c:mantis-fight-zoltan:0",
        label: "Fight a Mantis ship",
        fx: [
          // "Fight a Mantis ship (default rewards)."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
    ],
  },
  // Pirate fight (Zoltan) has no choice. Arrival calls c:pirate-fight-zoltan:0.
  // One of the five printed intros. "Fight a Pirate ship (default rewards)." unique=false.
  {
    dest: "Pirate fight (Zoltan)",
    slug: "pirate-fight-zoltan",
    flag: "cited:pirate-fight-zoltan",
    aliases: ["Pirate fight (Zoltan)", "Zoltan Pirate Fight", "Zoltan Pirate fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-zoltan:0",
        label: "Fight a Pirate ship",
        fx: [
          // "Fight a Pirate ship (default rewards)."
          { k: "fight", tier: "Pirate ship" },
        ],
      },
    ],
  },
  {
    dest: "Pirate ships in plasma storm",
    slug: "pirate-ships-in-plasma-storm",
    flag: "cited:pirate-ships-in-plasma-storm",
    aliases: ["Pirate ships in plasma storm", "Plasma storm pirate ships", "Two pirate ships in plasma storm"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You spy two pirate ships lurking in the nebula here. They remain unaware of your presence; you're able to get your scanners to at least identify their cargo: One is carrying the fuel supplies, the other the ammunition. They begin to drift away from each other in the storm.",
    choices: [
      {
        id: "c:pirate-ships-in-plasma-storm:0",
        label: "Secure the fuel supply",
        fx: [
          // "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:1",
        label: "Secure the ammunition",
        fx: [
          // "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:2",
        label: "Let them leave",
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
    ],
  },
  {
    dest: "Rock fight in nebula",
    slug: "rock-fight-in-nebula",
    flag: "cited:rock-fight-in-nebula",
    aliases: ["Rock fight in nebula", "Zoltan Rock fight in nebula"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "This nebula turns out to be the hiding place of a terrified rock crew taking refuge from the Zoltan border police. They don't seem prepared to risk your leaving with their co-ordinates, and open fire!",
    choices: [
      {
        id: "c:rock-fight-in-nebula:0",
        label: "Fight a Rock ship",
        fx: [
          // "Fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  {
    dest: "Zoltan border police",
    slug: "zoltan-border-police",
    flag: "cited:zoltan-border-police",
    aliases: ["Zoltan border police", "Zoltan Border Police"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "There are few more zealous in their customs checks than the Zoltan. A team of border police beam on board. There's just a little confusion over your weapons licences, but things escalate rapidly from heated discussion to gunfire!",
    choices: [
      {
        id: "c:zoltan-border-police:0",
        label: "Fight a Zoltan ship",
        fx: [
          // "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
    ],
  },
  // Zoltan fight has no choice. Arrival calls c:zoltan-fight:0.
  // One of the seven printed intros. "Fight a Zoltan ship (default rewards)." unique=false.
  {
    dest: "Zoltan fight",
    slug: "zoltan-fight",
    flag: "cited:zoltan-fight",
    aliases: ["Zoltan fight", "Zoltan Fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:zoltan-fight:0",
        label: "Fight a Zoltan ship",
        fx: [
          // "Fight a Zoltan ship (default rewards)."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
    ],
  },
  {
    dest: "Zoltan fight in asteroid field",
    slug: "zoltan-fight-in-asteroid-field",
    flag: "cited:zoltan-fight-in-asteroid-field",
    aliases: ["Zoltan fight in asteroid field"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You arrive in an asteroid field and are greeted by a Zoltan guard, \"By attempting to access these closed mining fields, you are in violation of the Natural Mineral Protection Act. Your weaponry will be confiscated for processing.\" You don't have time for this.",
    choices: [
      {
        id: "c:zoltan-fight-in-asteroid-field:0",
        label: "Fight a Zoltan ship",
        fx: [
          // "Fight a Zoltan ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Zoltan ship", asteroid: true },
        ],
      },
    ],
  },
  {
    dest: "Zoltan free augment",
    slug: "zoltan-free-augment",
    flag: "cited:zoltan-free-augment",
    aliases: ["Zoltan free augment", "Zoltan Academy Free Augment", "Zoltan academy free augment"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "A Zoltan academy sits docked just outside the beacon perimeter. They're happy to show you the fruits of their labor, and offer something to take home with you.",
    choices: [
      {
        id: "c:zoltan-free-augment:0",
        label: "You receive low scrap",
        fx: [
          // "You receive an augmentation with low scrap."
          { k: "tier", tier: "low" },
          { k: "note", text: "The page's augmentation is not added." },
        ],
      },
    ],
  },
  {
    dest: "Zoltan quest primitives",
    slug: "zoltan-quest-primitives",
    flag: "cited:zoltan-quest-primitives",
    aliases: ["Zoltan quest primitives"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You arrive at the primitive planet that you heard about at the cantina and are surprised to see a Zoltan ship facing off against a Rebel assault craft.\n\nYou tap into their frequency and hear the Rebel captain yelling, \"We are liberating this planet in the name of the new Galactic government! These aliens will not be left in ignorance where they cannot be of use!\"",
    choices: [
      {
        id: "c:zoltan-quest-primitives:0",
        label: "Interfere - make first contact with the primitive aliens",
        fx: [
          // "Fight the Zoltan ship."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:1",
        label: "Protect the aliens' way of life - Attack the Rebel ship",
        fx: [
          // "Fight the Rebel Ship."
          { k: "fight", tier: "Rebel Ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:2",
        label: "Leave",
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
    ],
  },
  {
    dest: "Zoltan security checkpoint",
    slug: "zoltan-security-checkpoint",
    flag: "cited:zoltan-security-checkpoint",
    aliases: ["Zoltan security checkpoint", "Zoltan Security Checkpoint"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You arrive at a Zoltan security checkpoint set up in a perimeter around the beacon. \"Traveling vessel, you will submit to crew profiling to identify fugitives of the empire.\"",
    choices: [
      {
        id: "c:zoltan-security-checkpoint:0",
        label: "You don't have time for this nonsense. Attack!",
        fx: [
          // "Fight a Zoltan ship (default rewards)."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
    ],
  },
  {
    dest: "Zoltan ship follows Mantis ship",
    slug: "zoltan-ship-follows-mantis-ship",
    flag: "cited:zoltan-ship-follows-mantis-ship",
    aliases: ["Zoltan ship follows Mantis ship", "Zoltan Follows Mantis", "Zoltan follows Mantis"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "Your jump interrupts a Zoltan security ship as it follows a Mantis pirate into an asteroid field. They message you, \"Your presence here will continue to be tolerated - but please, do not interfere.\"",
    choices: [
      {
        id: "c:zoltan-ship-follows-mantis-ship:0",
        label: "Interfere and save the Mantis ship",
        fx: [
          // "Fight a Zoltan ship." Locations: asteroidfield=true.
          { k: "fight", tier: "Zoltan ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:1",
        label: "Interfere and help the Zoltan ship",
        fx: [
          // "Fight a Mantis ship with crew entirely composed of Mantis." Locations: asteroidfield=true.
          { k: "fight", tier: "Mantis ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:2",
        label: "Don't interfere",
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
    ],
  },
  {
    // Boarders: Humans jammed sensors. LRSmap=noship, unique=true. Not a crew grant.
    dest: "Boarders: Humans jammed sensors",
    slug: "boarders-humans-jammed-sensors",
    flag: "cited:boarders-humans-jammed-sensors",
    aliases: ["Boarders: Humans jammed sensors"],
    sectors: ["Pirate Controlled Sector", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You catch a glimpse of a strange signal coming from a space station before your sensors shut off unexpectedly. As you discover that your sensors are being jammed, you hear hostiles beam onto your ship.",
    choices: [
      {
        id: "c:boarders-humans-jammed-sensors:0",
        label: "Continue...",
        fx: [
          // "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
          { k: "nothing" },
        ],
      },
      {
        id: "c:boarders-humans-jammed-sensors:1",
        label: "Counter the remote hacking.",
        fx: [
          // "3-5 human boarders beam aboard your ship."
          { k: "nothing" },
        ],
      },
    ],
  },
  {
    // Zoltan Great Eye. The four pull results, including Healing Burst, run in filler-events.ts.
    dest: "Zoltan Great Eye",
    slug: "zoltan-great-eye",
    flag: "cited:zoltan-great-eye",
    aliases: ["Zoltan Great Eye"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "Inside this nebula you detect a rogue planet drifting through space, on its surface a huge monolith visible at this distance even to the naked eye. A Zoltan elder hails you from the planet. \"Through luck or intent, you have discovered the Great Eye. Look into its depths and receive your just deserts.\"",
    choices: [
      {
        id: "c:zoltan-great-eye:0",
        label: "Pull the ship in closer.",
        // Four results, no odds. INFERRED: equal.
        fx: [{ k: "note", text: "Lose a crewmember, a Zoltan ship, high scrap, or Healing Burst." }],
      },
      {
        id: "c:zoltan-great-eye:1",
        label: "Leave.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
