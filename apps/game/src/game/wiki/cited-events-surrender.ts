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
    flag: "cited:engi-surrender",
    aliases: ["Engi surrender", "Engi Surrender"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: tx("wiki.cited-events-surrender.an-engi-ship-in-the-vicinity"),
    choices: [
      {
        id: "c:engi-surrender:0",
        label: tx("wiki.cited-events-surrender.explain-that-you-re-friendly"),
        // "You receive a random amount of scrap with resources." Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.the-engi-answer") }],
      },
      {
        id: "c:engi-surrender:1",
        label: tx("wiki.cited-events-surrender.accept-their-offer-of-surrender"),
        // "You receive a random amount of scrap with resources." Rolled in surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.the-engi-transfer-the-goods") }],
      },
    ],
  },
  {
    dest: "Destroyed cargo ship",
    slug: "destroyed-cargo-ship",
    flag: "cited:destroyed-cargo-ship",
    aliases: ["Destroyed cargo ship", "Destroyed Cargo Ship"],
    sectors: ["Pirate Controlled Sector"],
    body: tx("wiki.cited-events-surrender.not-too-far-from-the-beacon"),
    choices: [
      {
        id: "c:destroyed-cargo-ship:0",
        label: tx("wiki.cited-events-surrender.bring-it-aboard"),
        // "beam aboard your ship and you fight a Pirate ship" Random branch: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:destroyed-cargo-ship:1",
        label: tx("wiki.cited-events-surrender.leave-it-alone-this-looks-suspicious"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:destroyed-cargo-ship:2",
        label: tx("wiki.cited-events-surrender.run-an-advanced-scan-on-the"),
        // Advanced Sensors level=2+. Three scan results: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.scan-the-boxes") }],
      },
      {
        id: "c:destroyed-cargo-ship:3",
        label: tx("wiki.cited-events-surrender.run-an-advanced-scan-on-the"),
        // Long-Ranged Scanners. The same three scan results: surrender.ts PAGE_CHOICES.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.scan-the-boxes") }],
      },
    ],
  },
  {
    dest: "Settlement mercenary work",
    slug: "settlement-mercenary-work",
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
        label: tx("wiki.cited-events-surrender.listen-to-their-offer"),
        // "Fight a Pirate ship." One of two offers: surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:settlement-mercenary-work:1",
        label: tx("wiki.cited-events-surrender.decline"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "The Black Raven",
    slug: "the-black-raven",
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
    flag: "cited:zoltan-ship-asks-to-dock",
    // "Zoltan science ship" is the same page under its old title (the dump keeps both with the same text).
    aliases: ["Zoltan ship asks to dock", "Zoltan science ship"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-surrender.what-appears-to-be-a-zoltan"),
    choices: [
      {
        id: "c:zoltan-ship-asks-to-dock:0",
        label: tx("wiki.cited-events-surrender.dock-with-them"),
        // "Fight a Zoltan ship." Random branch (fight or gift): surrender.ts PAGE_CHOICES.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:zoltan-ship-asks-to-dock:1",
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
    flag: "cited:slug-comm-tapping",
    aliases: ["Slug comm tapping", "Slug Comm Tapping"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: tx("wiki.cited-events-surrender.you-arrive-to-the-sight-of"),
    choices: [
      {
        id: "c:slug-comm-tapping:0",
        label: tx("wiki.cited-events-surrender.tap-their-comm-frequency"),
        // "A quest marker is added to your map." wiki/quests.ts QUEST_CHOICES adds it.
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.a-quest-marker-is-added-to") }],
      },
      {
        id: "c:slug-comm-tapping:1",
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
    flag: "cited:engi-fleet-discussion",
    aliases: ["Engi fleet discussion", "Engi Fleet Discussion"],
    sectors: ["Engi Homeworlds"],
    body: tx("wiki.cited-events-surrender.you-arrive-near-a-small-fleet"),
    choices: [
      {
        id: "c:engi-fleet-discussion:0",
        label: tx("wiki.cited-events-surrender.message-them-and-ask-if-you"),
        // "Nothing happens." (after the leader declines; the reply text is in wiki/quests.ts)
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.they-decline") }],
      },
      {
        id: "c:engi-fleet-discussion:1",
        label: tx("wiki.cited-events-surrender.ignore-it-and-move-on"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:engi-fleet-discussion:2",
        // {{Blue Option|Engi Crew|...}}: needs an Engi crewmember (wiki/quests.ts questChoiceDisabled).
        label: tx("wiki.cited-events-surrender.have-your-engi-crewmember-contact-them"),
        fx: [{ k: "note", text: tx("wiki.cited-events-surrender.two-quest-markers-are-added-to") }],
      },
    ],
  },
];
