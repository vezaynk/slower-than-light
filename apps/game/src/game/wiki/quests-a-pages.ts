/**
 * @agent:quests-a. Opening cards of the sector-special quest-opening event pages wired in wiki/quests-a.ts. Same format
 * as the other cited-events-*.ts tables (cited-events-surrender.ts): one card per page, stamped only in the sectors its
 * {{Locations}} line names. Data only (no imports but a type), so cited-events.ts can spread it without an import cycle.
 *
 * Every choice below is taken over by wiki/quests.ts questChoose (PART_A in quests-a.ts), routed through surrenderChoose
 * before citedChoose. The `fx` here is what this table format can say about it; quests-a.ts holds the full branch with
 * its quotes. Four pages are Sectors-page special lines ("1 Ancient device event", "1 Rock war vessel encounter
 * event", "1 Zoltan research facility event", "1 Unarmed Zoltan transport event"); beacon-mix.ts places them by dest.
 */
import { tx } from "../../i18n/index.ts";
import type { CitedEventDef } from "./cited-events-surrender.ts";

export const EXTRA_EVENTS: CitedEventDef[] = [
  // "Ancient device" ({{Locations|Rock Homeworlds|...|unique=true}}), ROCK_CRYSTAL_BEACON, the Crystal Cruiser's 3rd step.
  {
    dest: "Ancient device",
    slug: "ancient-device",
    // Wiki citations:
    // > "This random event occurs in Rock Homeworlds." — [[Ancient device]]
    // > "It is unique." — [[Ancient device]]
    // > "An ancient device is orbiting within the crystal rings of a nearby gas giant." — [[Ancient device]]
    flag: "cited:ancient-device",
    aliases: ["Ancient device", "Ancient Device"],
    sectors: ["Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.an-ancient-device-is-orbiting-within"),
    choices: [
      {
        id: "c:ancient-device:0",
        // Wiki citations:
        // > "Scrap it." — [[Ancient device]]
        // > "You receive high scrap." — [[Ancient device]]
        // > "Fight a Rock ship (default rewards)." — [[Ancient device]]
        label: tx("wiki.quests-a-pages.scrap-it"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.you-break-it-apart-or-a") }],
      },
      {
        id: "c:ancient-device:1",
        // Wiki citations:
        // > "Leave it alone." — [[Ancient device]]
        // > "Nothing happens." — [[Ancient device]]
        label: tx("wiki.quests-a-pages.leave-it-alone"),
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:ancient-device:2",
        // Wiki citations:
        // > "(Crystal Crew) Reactivate it." — [[Ancient device]]
        label: tx("wiki.quests-a-pages.reactivate-it"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.the-device-opens-a-wormhole") }],
      },
    ],
  },
  // "Rock war vessel encounter" ({{Locations|Rock Homeworlds|...|unique=true}}), ROCK_UNLOCK, the Rock Cruiser unlock.
  {
    dest: "Rock war vessel encounter",
    slug: "rock-war-vessel-encounter",
    // Wiki citations:
    // > "This random event occurs in Rock Homeworlds." — [[Rock war vessel encounter]]
    // > "It is unique." — [[Rock war vessel encounter]]
    // > "You are immediately messaged by an imposing looking Rock war vessel" — [[Rock war vessel encounter]]
    flag: "cited:rock-war-vessel-encounter",
    aliases: ["Rock war vessel encounter", "Rock War Vessel Encounter"],
    sectors: ["Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.you-are-immediately-messaged-by-an"),
    choices: [
      {
        id: "c:rock-war-vessel-encounter:0",
        // Wiki citations:
        // > "We're going to save them or die trying." — [[Rock war vessel encounter]]
        // > "A quest marker is added to your map." — [[Rock war vessel encounter]]
        label: tx("wiki.quests-a-pages.we-re-going-to-save-them"),
        fx: [
          { k: "note", text: tx("wiki.quests-a.the-latter-being-more-likely-still") },
          { k: "quest", id: "rock-sun" },
        ],
      },
      {
        id: "c:rock-war-vessel-encounter:1",
        // Wiki citations:
        // > "We're strong enough to destroy you!" — [[Rock war vessel encounter]]
        // > "A quest marker is added to your map." — [[Rock war vessel encounter]]
        label: tx("wiki.quests-a-pages.we-re-strong-enough-to-destroy"),
        fx: [
          { k: "note", text: tx("wiki.quests-a.one-ship-is-not-the-same") },
          { k: "quest", id: "rock-sun" },
        ],
      },
      {
        id: "c:rock-war-vessel-encounter:2",
        // Wiki citations:
        // > "Ignore them." — [[Rock war vessel encounter]]
        // > "Nothing happens." — [[Rock war vessel encounter]]
        label: tx("wiki.quests-a-pages.ignore-them"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Unarmed Zoltan transport" ({{Locations|Zoltan Homeworlds|...|unique=true}}), ZOLTAN_PEACE_QUEST, the Zoltan Cruiser unlock.
  {
    dest: "Unarmed Zoltan transport",
    slug: "unarmed-zoltan-transport",
    // Wiki citations:
    // > "This random event occurs in Zoltan Homeworlds." — [[Unarmed Zoltan transport]]
    // > "It is unique." — [[Unarmed Zoltan transport]]
    // > "An unarmed Zoltan transport vessel is slowly making its way toward the beacon here." — [[Unarmed Zoltan transport]]
    flag: "cited:unarmed-zoltan-transport",
    aliases: ["Unarmed Zoltan transport", "Unarmed Zoltan Transport"],
    sectors: ["Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.an-unarmed-zoltan-transport-vessel-is"),
    choices: [
      {
        id: "c:unarmed-zoltan-transport:0",
        // Wiki citations:
        // > "Attack them." — [[Unarmed Zoltan transport]]
        // > "Fight an unarmed Zoltan ship." — [[Unarmed Zoltan transport]]
        // > "Fight a Zoltan ship." — [[Unarmed Zoltan transport]]
        label: tx("wiki.quests-a-pages.attack-them"),
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:unarmed-zoltan-transport:1",
        // Wiki citations:
        // > "Hear them out." — [[Unarmed Zoltan transport]]
        // > "A quest marker is added to your map." — [[Unarmed Zoltan transport]]
        label: tx("wiki.quests-a-pages.hear-them-out"),
        fx: [
          { k: "note", text: tx("wiki.quests-a.they-continue-we-take-your-silence") },
          { k: "quest", id: "zoltan-peace" },
        ],
      },
      {
        id: "c:unarmed-zoltan-transport:2",
        // Wiki citations:
        // > "Nothing happens." — [[Unarmed Zoltan transport]]
        label: tx("wiki.quests-a-pages.leave"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // The stasis button stays visible until a pod is aboard.
  {
    dest: "Zoltan research facility",
    slug: "zoltan-research-facility",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan research facility]]
    // > "You arrive at a Zoltan research facility." — [[Zoltan research facility]]
    flag: "cited:zoltan-research-facility",
    aliases: ["Zoltan research facility", "Zoltan Research Facility"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.you-arrive-at-a-zoltan-research"),
    choices: [
      {
        id: "c:zoltan-research-facility:0",
        // Wiki citations:
        // > "Participate in their study." — [[Zoltan research facility]]
        label: tx("wiki.quests-a-pages.participate-in-their-study"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.the-zoltans-take-their-readings") }],
      },
      {
        id: "c:zoltan-research-facility:1",
        // Wiki citations:
        // > "Decline." — [[Zoltan research facility]]
        label: tx("wiki.quests-a-pages.decline"),
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:zoltan-research-facility:2",
        // Wiki citations:
        // > "Give them your medical records." — [[Zoltan research facility]]
        label: tx("wiki.quests-a-pages.give-them-your-medical-records"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.they-pay-for-the-data") }],
      },
      {
        id: "c:zoltan-research-facility:3",
        // Wiki citations:
        // > "(Damaged Stasis Pod) Ask if they can fix this." — [[Zoltan research facility]]
        label: tx("wiki.quests-a.ask-if-they-can-fix-this"),
        fx: [{ k: "note", text: tx("wiki.quests-a.interesting-i-ve-never-seen") }],
      },
    ],
  },
  // "Zoltan trade hub" ({{Locations|Zoltan Controlled Sector|Zoltan Homeworlds|...|unique=true}}), ZOLTAN_TRADE_HUB.
  {
    dest: "Zoltan trade hub",
    slug: "zoltan-trade-hub",
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan trade hub]]
    // > "It is unique." — [[Zoltan trade hub]]
    // > "You come to a Zoltan trade and supply hub" — [[Zoltan trade hub]]
    flag: "cited:zoltan-trade-hub",
    aliases: ["Zoltan trade hub", "Zoltan Trade Hub"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.you-come-to-a-zoltan-trade"),
    choices: [
      {
        id: "c:zoltan-trade-hub:0",
        // Wiki citations:
        // > "Try to talk your way in." — [[Zoltan trade hub]]
        // > "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship (default rewards)." — [[Zoltan trade hub]]
        label: tx("wiki.quests-a-pages.try-to-talk-your-way-in"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.you-try-your-luck-at-the") }],
      },
      {
        id: "c:zoltan-trade-hub:1",
        // Wiki citations:
        // > "(Teleporter) Beam directly to the civilian deck." — [[Zoltan trade hub]]
        label: tx("wiki.quests-a-pages.beam-directly-to-the-civilian-deck"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.in-the-zoltan-hub") }],
      },
      {
        id: "c:zoltan-trade-hub:2",
        // Wiki citations:
        // > "(Zoltan Crew) Present his official documentation and pay the entry fee." — [[Zoltan trade hub]]
        // > "You lose Scrap lost: 10." — [[Zoltan trade hub]]
        label: tx("wiki.quests-a-pages.present-his-official-documentation-and-pay"),
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 }],
      },
      {
        id: "c:zoltan-trade-hub:3",
        // Wiki citations:
        // > "Nothing happens." — [[Zoltan trade hub]]
        label: tx("wiki.quests-a-pages.leave"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Rock bride" ({{Locations|Rock Controlled Sector|Rock Homeworlds|...|unique=true}}), ROCK_QUEST_MARRIAGE_START.
  {
    dest: "Rock bride",
    slug: "rock-bride",
    // Wiki citations:
    // > "This random event occurs in Rock Controlled Sector, Rock Homeworlds." — [[Rock bride]]
    // > "It is unique." — [[Rock bride]]
    // > "A rock captain hails you" — [[Rock bride]]
    flag: "cited:rock-bride",
    aliases: ["Rock bride", "Rock Bride", "Rock Bride Transport"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.a-rock-captain-hails-you-it"),
    choices: [
      {
        id: "c:rock-bride:0",
        // Wiki citations:
        // > "Accept the passenger." — [[Rock bride]]
        // > "A quest marker is added to your map." — [[Rock bride]]
        label: tx("wiki.quests-a-pages.accept-the-passenger"),
        fx: [
          { k: "note", text: tx("wiki.quests-a.you-surprise-me-off-worlder-thank") },
          { k: "quest", id: "rock-bride" },
        ],
      },
      {
        id: "c:rock-bride:1",
        // Wiki citations:
        // > "Nothing happens." — [[Rock bride]]
        label: tx("wiki.quests-a-pages.refuse"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
