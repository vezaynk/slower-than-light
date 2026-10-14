import { tx } from "../../i18n/index.ts";
/**
 * Leftover Zoltan pages. An opening choice is kept only when it states one
 * amount, scrap tier, hull number, fleet delay, or one named fight.
 * Winning branches, blue options, crew, and map reveals are not granted. An unnamed
 * weapon, augmentation or drone schematic is a random one (Rewards; the "item" fx).
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
  // Engi fight has no choice. Arrival calls c:engi-fight:0.
  // "Fight an Engi ship (default rewards)." unique=true.
  {
    dest: "Engi fight",
    slug: "engi-fight",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Engi fight]]
    // > "It is unique." — [[Engi fight]]
    // > "You jump into a debris field that used to be a Zoltan cruiser. Unfortunately, its Engi escort takes you for the attacker and retaliates! They refuse all hails." — [[Engi fight]]
    flag: "cited:engi-fight",
    aliases: ["Engi fight", "Engi fight (Zoltan)", "Zoltan Engi fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-jump-into-a-debris-field"),
    choices: [
      {
        id: "c:engi-fight:0",
        // Wiki citations:
        // > "Fight an Engi ship (default rewards)." — [[Engi fight]]
        label: tx("wiki.cited-events-zoltan.fight-an-engi-ship"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Mantis fight (Zoltan)]]
    // > "It is unique." — [[Mantis fight (Zoltan)]]
    // > "You pick up the last broadcast from a rupturing Zoltan freighter: \"The Mantis, they're here, please-\" You're interrupted by fire off the port bow!" — [[Mantis fight (Zoltan)]]
    flag: "cited:mantis-fight-zoltan",
    aliases: ["Mantis fight (Zoltan)", "Zoltan Mantis fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-pick-up-the-last-broadcast"),
    choices: [
      {
        id: "c:mantis-fight-zoltan:0",
        // Wiki citations:
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Zoltan)]]
        label: tx("wiki.cited-events-zoltan.fight-a-mantis-ship"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Pirate fight (Zoltan)]]
    flag: "cited:pirate-fight-zoltan",
    aliases: ["Pirate fight (Zoltan)", "Zoltan Pirate Fight", "Zoltan Pirate fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-zoltan:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Zoltan)]]
        label: tx("wiki.cited-events-zoltan.fight-a-pirate-ship"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Pirate ships in plasma storm]]
    // > "It is unique." — [[Pirate ships in plasma storm]]
    // > "You spy two pirate ships lurking in the nebula here. They remain unaware of your presence; you're able to get your scanners to at least identify their cargo: One is carrying the fuel supplies, the other the ammunition. They begin to drift away from each other in the storm." — [[Pirate ships in plasma storm]]
    flag: "cited:pirate-ships-in-plasma-storm",
    aliases: ["Pirate ships in plasma storm", "Plasma storm pirate ships", "Two pirate ships in plasma storm"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-spy-two-pirate-ships-lurking"),
    choices: [
      {
        id: "c:pirate-ships-in-plasma-storm:0",
        // Wiki citations:
        // > "Secure the fuel supply." — [[Pirate ships in plasma storm]]
        // > "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!" — [[Pirate ships in plasma storm]]
        label: tx("wiki.cited-events-zoltan.secure-the-fuel-supply"),
        fx: [
          // "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:1",
        // Wiki citations:
        // > "Secure the ammunition." — [[Pirate ships in plasma storm]]
        // > "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!" — [[Pirate ships in plasma storm]]
        label: tx("wiki.cited-events-zoltan.secure-the-ammunition"),
        fx: [
          // "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:2",
        // Wiki citations:
        // > "Let them leave." — [[Pirate ships in plasma storm]]
        // > "Sometimes discretion is the better part of valor." — [[Pirate ships in plasma storm]]
        // > "Nothing happens." — [[Pirate ships in plasma storm]]
        label: tx("wiki.cited-events-zoltan.let-them-leave"),
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
    ],
  },
  // "Fight a Rock ship (default rewards)." Rock fight in nebula has no choice. Arrival calls this fight. The printed sentence is the card body. nebula=true. unique=true. No nebula environment is added.
  {
    dest: "Rock fight in nebula",
    slug: "rock-fight-in-nebula",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Rock fight in nebula]]
    // > "It is unique." — [[Rock fight in nebula]]
    // > "This nebula turns out to be the hiding place of a terrified rock crew taking refuge from the Zoltan border police. They don't seem prepared to risk your leaving with their co-ordinates, and open fire!" — [[Rock fight in nebula]]
    flag: "cited:rock-fight-in-nebula",
    aliases: ["Rock fight in nebula", "Zoltan Rock fight in nebula"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.this-nebula-turns-out-to-be"),
    choices: [
      {
        id: "c:rock-fight-in-nebula:0",
        // Wiki citations:
        // > "Fight a Rock ship (default rewards)." — [[Rock fight in nebula]]
        label: tx("wiki.cited-events-zoltan.fight-a-rock-ship"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan border police]]
    // > "It is unique." — [[Zoltan border police]]
    // > "There are few more zealous in their customs checks than the Zoltan. A team of border police beam on board. There's just a little confusion over your weapons licences, but things escalate rapidly from heated discussion to gunfire!" — [[Zoltan border police]]
    flag: "cited:zoltan-border-police",
    aliases: ["Zoltan border police", "Zoltan Border Police"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.there-are-few-more-zealous-in"),
    choices: [
      {
        id: "c:zoltan-border-police:0",
        // Wiki citations:
        // > "3-4 zoltan boarders beam aboard your ship, and you fight a Zoltan ship (default rewards)." — [[Zoltan border police]]
        label: tx("wiki.cited-events-zoltan.fight-a-zoltan-ship"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan fight]]
    flag: "cited:zoltan-fight",
    aliases: ["Zoltan fight", "Zoltan Fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:zoltan-fight:0",
        // Wiki citations:
        // > "Fight a Zoltan ship (default rewards)." — [[Zoltan fight]]
        label: tx("wiki.cited-events-zoltan.fight-a-zoltan-ship"),
        fx: [
          // "Fight a Zoltan ship (default rewards)."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
    ],
  },
  // Zoltan fight in asteroid field has no choice. Arrival calls c:zoltan-fight-in-asteroid-field:0.
  // "Fight a Zoltan ship (default rewards)." asteroidfield=true. unique=true.
  {
    dest: "Zoltan fight in asteroid field",
    slug: "zoltan-fight-in-asteroid-field",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan fight in asteroid field]]
    // > "It is unique." — [[Zoltan fight in asteroid field]]
    // > "You arrive in an asteroid field and are greeted by a Zoltan guard, \"By attempting to access these closed mining fields, you are in violation of the Natural Mineral Protection Act. Your weaponry will be confiscated for processing.\" You don't have time for this." — [[Zoltan fight in asteroid field]]
    flag: "cited:zoltan-fight-in-asteroid-field",
    aliases: ["Zoltan fight in asteroid field"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-in-an-asteroid-field"),
    choices: [
      {
        id: "c:zoltan-fight-in-asteroid-field:0",
        // Wiki citations:
        // > "Fight a Zoltan ship (default rewards)." — [[Zoltan fight in asteroid field]]
        label: tx("wiki.cited-events-zoltan.fight-a-zoltan-ship"),
        fx: [
          // "Fight a Zoltan ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Zoltan ship", asteroid: true },
        ],
      },
    ],
  },
  {
    // Rewards, "Augment": "A random augmentation & T scrap." The page does not name the augmentation.
    dest: "Zoltan free augment",
    slug: "zoltan-free-augment",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan free augment]]
    // > "It is unique." — [[Zoltan free augment]]
    // > "A Zoltan academy sits docked just outside the beacon perimeter. They're happy to show you the fruits of their labor, and offer something to take home with you." — [[Zoltan free augment]]
    flag: "cited:zoltan-free-augment",
    aliases: ["Zoltan free augment", "Zoltan Academy Free Augment", "Zoltan academy free augment"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.a-zoltan-academy-sits-docked-just"),
    choices: [
      {
        id: "c:zoltan-free-augment:0",
        // Wiki citations:
        // > "You receive an augmentation with low scrap." — [[Zoltan free augment]]
        label: tx("wiki.cited-events-zoltan.you-receive-an-augmentation-with-low"),
        fx: [
          // "You receive an augmentation with low scrap." The augmentation is a random one (Rewards, above).
          { k: "tier", tier: "low" },
          { k: "item", item: "augment" },
        ],
      },
    ],
  },
  {
    dest: "Zoltan quest primitives",
    slug: "zoltan-quest-primitives",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan quest primitives]]
    // > "It is unique." — [[Zoltan quest primitives]]
    // > "You arrive at the primitive planet that you heard about at the cantina and are surprised to see a Zoltan ship facing off against a Rebel assault craft." — [[Zoltan quest primitives]]
    // > "You tap into their frequency and hear the Rebel captain yelling, \"We are liberating this planet in the name of the new Galactic government! These aliens will not be left in ignorance where they cannot be of use!\"" — [[Zoltan quest primitives]]
    flag: "cited:zoltan-quest-primitives",
    aliases: ["Zoltan quest primitives"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-at-the-primitive-planet"),
    choices: [
      {
        id: "c:zoltan-quest-primitives:0",
        // Wiki citations:
        // > "Interfere - make first contact with the primitive aliens." — [[Zoltan quest primitives]]
        // > "The local people - furry, one-eyed tree lizard things - begin chanting when they see you. Suddenly the sky is lit by laser fire - the Zoltan opened fire on your ship! You dash back to the shuttle and join the fight." — [[Zoltan quest primitives]]
        // > "Fight the Zoltan ship." — [[Zoltan quest primitives]]
        label: tx("wiki.cited-events-zoltan.interfere-make-first-contact-with-the"),
        fx: [
          // "Fight the Zoltan ship."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:1",
        // Wiki citations:
        // > "Protect the aliens' way of life - Attack the Rebel ship." — [[Zoltan quest primitives]]
        // > "These creatures should be left to develop at their own pace. You direct all weapons on the Rebel ship and begin the firing sequence." — [[Zoltan quest primitives]]
        // > "Fight the Rebel Ship." — [[Zoltan quest primitives]]
        label: tx("wiki.cited-events-zoltan.protect-the-aliens-way-of-life"),
        fx: [
          // "Fight the Rebel Ship."
          { k: "fight", tier: "Rebel Ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:2",
        // Wiki citations:
        // > "You don't want to alert the Rebels of your presence and you don't want to anger the Zoltan in their territory. The best solution is to leave." — [[Zoltan quest primitives]]
        // > "Nothing happens." — [[Zoltan quest primitives]]
        label: tx("wiki.cited-events-zoltan.leave"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan security checkpoint]]
    // > "It is unique." — [[Zoltan security checkpoint]]
    // > "You arrive at a Zoltan security checkpoint set up in a perimeter around the beacon. \"Traveling vessel, you will submit to crew profiling to identify fugitives of the empire.\"" — [[Zoltan security checkpoint]]
    flag: "cited:zoltan-security-checkpoint",
    aliases: ["Zoltan security checkpoint", "Zoltan Security Checkpoint"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-at-a-zoltan-security"),
    choices: [
      {
        id: "c:zoltan-security-checkpoint:0",
        // Wiki citations:
        // > "You don't have time for this nonsense. Attack!" — [[Zoltan security checkpoint]]
        // > "Expecting resistance, their Energy Shield is raised and ready for combat." — [[Zoltan security checkpoint]]
        // > "Fight a Zoltan ship (default rewards)." — [[Zoltan security checkpoint]]
        label: tx("wiki.cited-events-zoltan.you-don-t-have-time-for"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan ship follows Mantis ship]]
    // > "It is unique." — [[Zoltan ship follows Mantis ship]]
    // > "Your jump interrupts a Zoltan security ship as it follows a Mantis pirate into an asteroid field. They message you, \"Your presence here will continue to be tolerated - but please, do not interfere.\"" — [[Zoltan ship follows Mantis ship]]
    flag: "cited:zoltan-ship-follows-mantis-ship",
    aliases: ["Zoltan ship follows Mantis ship", "Zoltan Follows Mantis", "Zoltan follows Mantis"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.your-jump-interrupts-a-zoltan-security"),
    choices: [
      {
        id: "c:zoltan-ship-follows-mantis-ship:0",
        // Wiki citations:
        // > "Interfere and save the Mantis ship." — [[Zoltan ship follows Mantis ship]]
        // > "Sometimes you have to bet on the underdog - even on the rare occasions that the underdog is a Mantis warship. You set off for the heart of the asteroid field and engage the Zoltan there." — [[Zoltan ship follows Mantis ship]]
        // > "Fight a Zoltan ship." — [[Zoltan ship follows Mantis ship]]
        label: tx("wiki.cited-events-zoltan.interfere-and-save-the-mantis-ship"),
        fx: [
          // "Fight a Zoltan ship." Locations: asteroidfield=true.
          { k: "fight", tier: "Zoltan ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:1",
        // Wiki citations:
        // > "Interfere and help the Zoltan ship." — [[Zoltan ship follows Mantis ship]]
        // > "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends." — [[Zoltan ship follows Mantis ship]]
        // > "Fight a Mantis ship with crew entirely composed of Mantis." — [[Zoltan ship follows Mantis ship]]
        label: tx("wiki.cited-events-zoltan.interfere-and-help-the-zoltan-ship"),
        fx: [
          // "Fight a Mantis ship with crew entirely composed of Mantis." Locations: asteroidfield=true.
          { k: "fight", tier: "Mantis ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:2",
        // Wiki citations:
        // > "Don't interfere." — [[Zoltan ship follows Mantis ship]]
        // > "The Zoltan know their business better than most - best to leave them to it. You prepare to jump." — [[Zoltan ship follows Mantis ship]]
        // > "Nothing happens." — [[Zoltan ship follows Mantis ship]]
        label: tx("wiki.cited-events-zoltan.don-t-interfere"),
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
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Boarders: Humans jammed sensors]]
    // > "It is unique." — [[Boarders: Humans jammed sensors]]
    // > "You catch a glimpse of a strange signal coming from a space station before your sensors shut off unexpectedly. As you discover that your sensors are being jammed, you hear hostiles beam onto your ship." — [[Boarders: Humans jammed sensors]]
    flag: "cited:boarders-humans-jammed-sensors",
    aliases: ["Boarders: Humans jammed sensors"],
    sectors: ["Pirate Controlled Sector", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-catch-a-glimpse-of-a"),
    choices: [
      {
        id: "c:boarders-humans-jammed-sensors:0",
        // Wiki citations:
        // > "Continue..." — [[Boarders: Humans jammed sensors]]
        // > "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!" — [[Boarders: Humans jammed sensors]]
        // > "3-5 human boarders beam aboard your ship, and your Sensors are disabled." — [[Boarders: Humans jammed sensors]]
        label: tx("wiki.cited-events-zoltan.continue"),
        fx: [
          // "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
          { k: "nothing" },
        ],
      },
      {
        id: "c:boarders-humans-jammed-sensors:1",
        // Wiki citations:
        // > "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders." — [[Boarders: Humans jammed sensors]]
        // > "3-5 human boarders beam aboard your ship." — [[Boarders: Humans jammed sensors]]
        label: tx("wiki.cited-events-zoltan.counter-the-remote-hacking"),
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
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan Great Eye]]
    // > "It is unique." — [[Zoltan Great Eye]]
    // > "Inside this nebula you detect a rogue planet drifting through space, on its surface a huge monolith visible at this distance even to the naked eye. A Zoltan elder hails you from the planet. \"Through luck or intent, you have discovered the Great Eye. Look into its depths and receive your just deserts.\"" — [[Zoltan Great Eye]]
    flag: "cited:zoltan-great-eye",
    aliases: ["Zoltan Great Eye"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.inside-this-nebula-you-detect-a"),
    choices: [
      {
        id: "c:zoltan-great-eye:0",
        // Wiki citations:
        // > "Pull the ship in closer." — [[Zoltan Great Eye]]
        label: tx("wiki.cited-events-zoltan.pull-the-ship-in-closer"),
        // Four results, no odds. INFERRED: equal.
        fx: [{ k: "note", text: tx("wiki.cited-events-zoltan.lose-a-crewmember-a-zoltan-ship") }],
      },
      {
        id: "c:zoltan-great-eye:1",
        // Wiki citations:
        // > "Your mission is to save the Federation, not discover new wonders around the galaxy. You prepare to jump." — [[Zoltan Great Eye]]
        label: tx("wiki.cited-events-zoltan.leave-2"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
