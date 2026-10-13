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
    flag: "cited:engi-fight",
    aliases: ["Engi fight", "Engi fight (Zoltan)", "Zoltan Engi fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-jump-into-a-debris-field"),
    choices: [
      {
        id: "c:engi-fight:0",
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
    flag: "cited:mantis-fight-zoltan",
    aliases: ["Mantis fight (Zoltan)", "Zoltan Mantis fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-pick-up-the-last-broadcast"),
    choices: [
      {
        id: "c:mantis-fight-zoltan:0",
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
    flag: "cited:pirate-fight-zoltan",
    aliases: ["Pirate fight (Zoltan)", "Zoltan Pirate Fight", "Zoltan Pirate fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-zoltan:0",
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
    flag: "cited:pirate-ships-in-plasma-storm",
    aliases: ["Pirate ships in plasma storm", "Plasma storm pirate ships", "Two pirate ships in plasma storm"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-spy-two-pirate-ships-lurking"),
    choices: [
      {
        id: "c:pirate-ships-in-plasma-storm:0",
        label: tx("wiki.cited-events-zoltan.secure-the-fuel-supply"),
        fx: [
          // "You jet toward the pirate with the fuel supplies and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:1",
        label: tx("wiki.cited-events-zoltan.secure-the-ammunition"),
        fx: [
          // "You jet toward the pirate with the ammunition and engage - hopefully you can leave the ship in one piece!" Category: Pirate ship fights.
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ships-in-plasma-storm:2",
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
    flag: "cited:rock-fight-in-nebula",
    aliases: ["Rock fight in nebula", "Zoltan Rock fight in nebula"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.this-nebula-turns-out-to-be"),
    choices: [
      {
        id: "c:rock-fight-in-nebula:0",
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
    flag: "cited:zoltan-border-police",
    aliases: ["Zoltan border police", "Zoltan Border Police"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.there-are-few-more-zealous-in"),
    choices: [
      {
        id: "c:zoltan-border-police:0",
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
    flag: "cited:zoltan-fight",
    aliases: ["Zoltan fight", "Zoltan Fight"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:zoltan-fight:0",
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
    flag: "cited:zoltan-fight-in-asteroid-field",
    aliases: ["Zoltan fight in asteroid field"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-in-an-asteroid-field"),
    choices: [
      {
        id: "c:zoltan-fight-in-asteroid-field:0",
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
    flag: "cited:zoltan-free-augment",
    aliases: ["Zoltan free augment", "Zoltan Academy Free Augment", "Zoltan academy free augment"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.a-zoltan-academy-sits-docked-just"),
    choices: [
      {
        id: "c:zoltan-free-augment:0",
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
    flag: "cited:zoltan-quest-primitives",
    aliases: ["Zoltan quest primitives"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-at-the-primitive-planet"),
    choices: [
      {
        id: "c:zoltan-quest-primitives:0",
        label: tx("wiki.cited-events-zoltan.interfere-make-first-contact-with-the"),
        fx: [
          // "Fight the Zoltan ship."
          { k: "fight", tier: "Zoltan ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:1",
        label: tx("wiki.cited-events-zoltan.protect-the-aliens-way-of-life"),
        fx: [
          // "Fight the Rebel Ship."
          { k: "fight", tier: "Rebel Ship" },
        ],
      },
      {
        id: "c:zoltan-quest-primitives:2",
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
    flag: "cited:zoltan-security-checkpoint",
    aliases: ["Zoltan security checkpoint", "Zoltan Security Checkpoint"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-arrive-at-a-zoltan-security"),
    choices: [
      {
        id: "c:zoltan-security-checkpoint:0",
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
    flag: "cited:zoltan-ship-follows-mantis-ship",
    aliases: ["Zoltan ship follows Mantis ship", "Zoltan Follows Mantis", "Zoltan follows Mantis"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.your-jump-interrupts-a-zoltan-security"),
    choices: [
      {
        id: "c:zoltan-ship-follows-mantis-ship:0",
        label: tx("wiki.cited-events-zoltan.interfere-and-save-the-mantis-ship"),
        fx: [
          // "Fight a Zoltan ship." Locations: asteroidfield=true.
          { k: "fight", tier: "Zoltan ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:1",
        label: tx("wiki.cited-events-zoltan.interfere-and-help-the-zoltan-ship"),
        fx: [
          // "Fight a Mantis ship with crew entirely composed of Mantis." Locations: asteroidfield=true.
          { k: "fight", tier: "Mantis ship", asteroid: true },
        ],
      },
      {
        id: "c:zoltan-ship-follows-mantis-ship:2",
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
    flag: "cited:boarders-humans-jammed-sensors",
    aliases: ["Boarders: Humans jammed sensors"],
    sectors: ["Pirate Controlled Sector", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.you-catch-a-glimpse-of-a"),
    choices: [
      {
        id: "c:boarders-humans-jammed-sensors:0",
        label: tx("wiki.cited-events-zoltan.continue"),
        fx: [
          // "3-5 human boarders beam aboard your ship, and your Sensors are disabled."
          { k: "nothing" },
        ],
      },
      {
        id: "c:boarders-humans-jammed-sensors:1",
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
    flag: "cited:zoltan-great-eye",
    aliases: ["Zoltan Great Eye"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-zoltan.inside-this-nebula-you-detect-a"),
    choices: [
      {
        id: "c:zoltan-great-eye:0",
        label: tx("wiki.cited-events-zoltan.pull-the-ship-in-closer"),
        // Four results, no odds. INFERRED: equal.
        fx: [{ k: "note", text: tx("wiki.cited-events-zoltan.lose-a-crewmember-a-zoltan-ship") }],
      },
      {
        id: "c:zoltan-great-eye:1",
        label: tx("wiki.cited-events-zoltan.leave-2"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
