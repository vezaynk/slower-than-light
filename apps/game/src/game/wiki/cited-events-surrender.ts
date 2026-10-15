import { tx } from "../../i18n/index.ts";
/**
 * @agent:surrender. Category:Ship surrender Events pages that no other cited table wires. Same format as the other
 * cited-events-*.ts tables: one card per page, stamped only in the sectors its {{Locations}} line names.
 *
 * Choices whose page outcome is random (two or more results, odds not stated), or that open a follow-up dialogue,
 * are taken over by wiki/surrender.ts (PAGE_CHOICES, routed through surrenderChoose before citedChoose). Their `fx`
 * below is what this table format can say about them; surrender.ts holds the full branch with its quotes.
 *
 * @agent:quests. Slug comm tapping and Engi fleet discussion: their surrender fights sit at quest-marker beacons. The
 * opening cards are below; the choices that add a marker run in wiki/quests.ts (QUEST_CHOICES, routed through
 * surrenderChoose before citedChoose), and the marker fights use the "quest-*" rows in surrender.ts.
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  | { k: "quest"; id: string }
  | { k: "goto"; id: string }
  | { k: "close" }
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
  {
    dest: "Engi surrender",
    slug: "engi-surrender",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi surrender]]
    // > "It is unique." — [[Engi surrender]]
    // > "An Engi ship in the vicinity, seeing you jump in armed to the teeth, immediately broadcasts its surrender. \"Subject goal: wealth. Engi motivation: survival. Transfer of goods acceptable?\"" — [[Engi surrender]]
    flag: "cited:engi-surrender",
    aliases: ["Engi surrender", "Engi Surrender"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: tx("wiki.cited-events-surrender.an-engi-ship-in-the-vicinity"),
    choices: [
      {
        id: "c:engi-surrender:0",
        // Wiki citations:
        // > "Explain that you're friendly." — [[Engi surrender]]
        label: tx("wiki.cited-events-surrender.explain-that-you-re-friendly"),
        // "You receive a random amount of scrap with resources." Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.the-engi-answer") }],
      },
      {
        id: "c:engi-surrender:1",
        // Wiki citations:
        // > "Accept their offer of surrender." — [[Engi surrender]]
        label: tx("wiki.cited-events-surrender.accept-their-offer-of-surrender"),
        // "You receive a random amount of scrap with resources." Rolled in surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.the-engi-transfer-the-goods") }],
      },
    ],
  },
  {
    dest: "Destroyed cargo ship",
    slug: "destroyed-cargo-ship",
    // Wiki citations:
    // > "This random event occurs in Pirate Controlled Sector." — [[Destroyed cargo ship]]
    // > "It is unique." — [[Destroyed cargo ship]]
    // > "Not too far from the beacon, you detect a destroyed cargo ship with its cargo scattered nearby, intact." — [[Destroyed cargo ship]]
    flag: "cited:destroyed-cargo-ship",
    aliases: ["Destroyed cargo ship", "Destroyed Cargo Ship"],
    sectors: ["Pirate Controlled Sector"],
    body: tx("wiki.cited-events-surrender.not-too-far-from-the-beacon"),
    choices: [
      {
        id: "c:destroyed-cargo-ship:0",
        // Wiki citations:
        // > "Bring it aboard." — [[Destroyed cargo ship]]
        label: tx("wiki.cited-events-surrender.bring-it-aboard"),
        // "beam aboard your ship and you fight a Pirate ship" Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:destroyed-cargo-ship:1",
        // Wiki citations:
        // > "Leave it alone, this looks suspicious." — [[Destroyed cargo ship]]
        label: tx("wiki.cited-events-surrender.leave-it-alone-this-looks-suspicious"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:destroyed-cargo-ship:2",
        // Wiki citations:
        // > "(Advanced Sensors) Run an advanced scan on the boxes. (Requires level 2+ Sensors)" — [[Destroyed cargo ship]]
        // > "Scan the boxes." — [[Destroyed cargo ship]]
        label: tx("wiki.cited-events-surrender.run-an-advanced-scan-on-the"),
        // Advanced Sensors level=2+. Three scan results: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.scan-the-boxes") }],
      },
      {
        id: "c:destroyed-cargo-ship:3",
        // Wiki citations:
        // > "(Long-Ranged Scanners) Run an advanced scan on the boxes." — [[Destroyed cargo ship]]
        // > "Scan the boxes." — [[Destroyed cargo ship]]
        label: tx("wiki.cited-events-surrender.run-an-advanced-scan-on-the"),
        // Long-Ranged Scanners. The same three scan results: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.scan-the-boxes") }],
      },
    ],
  },
  {
    dest: "Settlement mercenary work",
    slug: "settlement-mercenary-work",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds." — [[Settlement mercenary work]]
    // > "It is unique." — [[Settlement mercenary work]]
    // > "You are immediately contacted by a settlement, \"Hello, travelers. Your ship seems to be outfitted for combat...care to take up a bit of mercenary work?\"" — [[Settlement mercenary work]]
    flag: "cited:settlement-mercenary-work",
    aliases: ["Settlement mercenary work", "Settlement Mercenary Work"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
    ],
    body: tx("wiki.cited-events-surrender.you-are-immediately-contacted-by-a"),
    choices: [
      {
        id: "c:settlement-mercenary-work:0",
        // Wiki citations:
        // > "Listen to their offer." — [[Settlement mercenary work]]
        label: tx("wiki.cited-events-surrender.listen-to-their-offer"),
        // "Fight a Pirate ship." One of two offers: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:settlement-mercenary-work:1",
        // Wiki citations:
        // > "Decline." — [[Settlement mercenary work]]
        // > "Nothing happens." — [[Settlement mercenary work]]
        label: tx("wiki.cited-events-surrender.decline"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "The Black Raven",
    slug: "the-black-raven",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[The Black Raven]]
    // > "It is unique." — [[The Black Raven]]
    // > "As you jump in, you immediately see an impressive Slug pirate ship with \"The Black Raven\" painted on one side. They hail you, \"Greetingsss. I am the dreaded pirate, Captain Nights. You mussst be full of fear, no? You have heard of me... no?\"" — [[The Black Raven]]
    flag: "cited:the-black-raven",
    aliases: ["The Black Raven"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-surrender.as-you-jump-in-you-immediately"),
    choices: [
      {
        id: "c:the-black-raven:0",
        label: tx("wiki.cited-events-surrender.no"),
        // "Fight the Black Raven" Dialogue first: surrender.ts PAGE_CHOICES. INFERRED tier: a Slug pirate ship.
        fx: [{ k: "fight", tier: "Slug pirate ship" }],
      },
    ],
  },
  {
    dest: "Zoltan ship asks to dock",
    slug: "zoltan-ship-asks-to-dock",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan ship asks to dock]]
    // > "It is unique." — [[Zoltan ship asks to dock]]
    // > "What appears to be a Zoltan science ship requests permission to dock." — [[Zoltan ship asks to dock]]
    flag: "cited:zoltan-ship-asks-to-dock",
    // "Zoltan science ship" is the same page under its old title (the dump keeps both with the same text).
    aliases: ["Zoltan ship asks to dock", "Zoltan science ship"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-surrender.what-appears-to-be-a-zoltan"),
    choices: [
      {
        id: "c:zoltan-ship-asks-to-dock:0",
        // Wiki citations:
        // > "Dock with them." — [[Zoltan ship asks to dock]]
        label: tx("wiki.cited-events-surrender.dock-with-them"),
        // "Fight a Zoltan ship." Random branch (fight or gift): surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:zoltan-ship-asks-to-dock:1",
        // Wiki citations:
        // > "Have them keep their distance." — [[Zoltan ship asks to dock]]
        label: tx("wiki.cited-events-surrender.have-them-keep-their-distance"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Slug comm tapping" ({{Locations|Slug Controlled Nebula|Slug Home Nebula|...}}).
  {
    dest: "Slug comm tapping",
    slug: "slug-comm-tapping",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug comm tapping]]
    // > "It is unique." — [[Slug comm tapping]]
    // > "You arrive to the sight of two Slug ships in communication range. They don't see you." — [[Slug comm tapping]]
    flag: "cited:slug-comm-tapping",
    aliases: ["Slug comm tapping", "Slug Comm Tapping"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-surrender.you-arrive-to-the-sight-of"),
    choices: [
      {
        id: "c:slug-comm-tapping:0",
        // Wiki citations:
        // > "Tap their comm frequency." — [[Slug comm tapping]]
        label: tx("wiki.cited-events-surrender.tap-their-comm-frequency"),
        fx: [
          { k: "note", text: tx("wiki.quests.you-overhear-their-conversation-and-learn") },
          { k: "quest", id: "slug-pirate-trap" },
        ],
      },
      {
        id: "c:slug-comm-tapping:1",
        // Wiki citations:
        // > "Ignore them." — [[Slug comm tapping]]
        label: tx("wiki.cited-events-surrender.ignore-them"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // @agent:quests. "Engi fleet discussion" ({{Locations|Engi Homeworlds|...}}), the Stealth Cruiser unlocking event.
  {
    dest: "Engi fleet discussion",
    slug: "engi-fleet-discussion",
    // Wiki citations:
    // > "This random event occurs in Engi Homeworlds." — [[Engi fleet discussion]]
    // > "It is unique." — [[Engi fleet discussion]]
    // > "This is the Stealth Cruiser ship unlocking event." — [[Engi fleet discussion]]
    // > "You arrive near a small fleet of civilian Engi ships. A simple decryption and translation of their comm frequency tells you that they are having a frantic discussion about something obviously troubling them." — [[Engi fleet discussion]]
    flag: "cited:engi-fleet-discussion",
    aliases: ["Engi fleet discussion", "Engi Fleet Discussion"],
    sectors: ["Engi Homeworlds"],
    body: tx("wiki.cited-events-surrender.you-arrive-near-a-small-fleet"),
    choices: [
      {
        id: "c:engi-fleet-discussion:0",
        // Wiki citations:
        // > "Message them and ask if you can help." — [[Engi fleet discussion]]
        label: tx("wiki.cited-events-surrender.message-them-and-ask-if-you"),
        // "Nothing happens." (after the leader declines; the reply text is in wiki/quests.ts)
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.they-decline") }],
      },
      {
        id: "c:engi-fleet-discussion:1",
        // Wiki citations:
        // > "Ignore it and move on." — [[Engi fleet discussion]]
        label: tx("wiki.cited-events-surrender.ignore-it-and-move-on"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:engi-fleet-discussion:2",
        // Wiki citations:
        // > "(Engi Crew) Have your Engi crewmember contact them." — [[Engi fleet discussion]]
        // {{Blue Option|Engi Crew|...}}: needs an Engi crewmember (wiki/quests.ts questChoiceDisabled).
        label: tx("wiki.cited-events-surrender.have-your-engi-crewmember-contact-them"),
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.two-quest-markers-are-added-to") }],
      },
    ],
  },
];
