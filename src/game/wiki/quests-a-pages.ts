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
    flag: "cited:ancient-device",
    aliases: ["Ancient device", "Ancient Device"],
    sectors: ["Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.an-ancient-device-is-orbiting-within"),
    choices: [
      {
        id: "c:ancient-device:0",
        label: tx("wiki.quests-a-pages.scrap-it"),
        // "You receive high scrap." / "Fight a Rock ship (default rewards)." Random branch: quests-a.ts.
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.you-break-it-apart-or-a") }],
      },
      {
        id: "c:ancient-device:1",
        label: tx("wiki.quests-a-pages.leave-it-alone"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:ancient-device:2",
        // {{Blue Option|Crystal Crew|Reactivate it.}}: needs a Crystal crewmember (quests-a.ts disabled).
        label: tx("wiki.quests-a-pages.reactivate-it"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.the-device-opens-a-wormhole") }],
      },
    ],
  },
  // "Rock war vessel encounter" ({{Locations|Rock Homeworlds|...|unique=true}}), ROCK_UNLOCK, the Rock Cruiser unlock.
  {
    dest: "Rock war vessel encounter",
    slug: "rock-war-vessel-encounter",
    flag: "cited:rock-war-vessel-encounter",
    aliases: ["Rock war vessel encounter", "Rock War Vessel Encounter"],
    sectors: ["Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.you-are-immediately-messaged-by-an"),
    choices: [
      {
        id: "c:rock-war-vessel-encounter:0",
        label: tx("wiki.quests-a-pages.we-re-going-to-save-them"),
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.a-quest-marker-is-added-to") }],
      },
      {
        id: "c:rock-war-vessel-encounter:1",
        label: tx("wiki.quests-a-pages.we-re-strong-enough-to-destroy"),
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.a-quest-marker-is-added-to") }],
      },
      {
        id: "c:rock-war-vessel-encounter:2",
        label: tx("wiki.quests-a-pages.ignore-them"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Unarmed Zoltan transport" ({{Locations|Zoltan Homeworlds|...|unique=true}}), ZOLTAN_PEACE_QUEST, the Zoltan Cruiser unlock.
  {
    dest: "Unarmed Zoltan transport",
    slug: "unarmed-zoltan-transport",
    flag: "cited:unarmed-zoltan-transport",
    aliases: ["Unarmed Zoltan transport", "Unarmed Zoltan Transport"],
    sectors: ["Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.an-unarmed-zoltan-transport-vessel-is"),
    choices: [
      {
        id: "c:unarmed-zoltan-transport:0",
        label: tx("wiki.quests-a-pages.attack-them"),
        // "Fight an unarmed Zoltan ship." / "Fight a Zoltan ship." Random branch: quests-a.ts.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:unarmed-zoltan-transport:1",
        label: tx("wiki.quests-a-pages.hear-them-out"),
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.a-quest-marker-is-added-to") }],
      },
      {
        id: "c:unarmed-zoltan-transport:2",
        label: tx("wiki.quests-a-pages.leave"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Zoltan research facility" ({{Locations|Engi Controlled Sector|Engi Homeworlds|Zoltan Controlled Sector|Zoltan
  // Homeworlds|...|unique=false}}), ZOLTAN_CREW_STUDY, the Crystal Cruiser's 2nd step.
  // {{Blue Option|Damaged Stasis Pod|Ask if they can fix this.}} opens Ruwen (quests-a.ts). The button stays visible.
  {
    dest: "Zoltan research facility",
    slug: "zoltan-research-facility",
    flag: "cited:zoltan-research-facility",
    aliases: ["Zoltan research facility", "Zoltan Research Facility"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.you-arrive-at-a-zoltan-research"),
    choices: [
      {
        id: "c:zoltan-research-facility:0",
        label: tx("wiki.quests-a-pages.participate-in-their-study"),
        // "You receive low scrap." / "2 boarders beam aboard your ship, and you fight a Pirate ship." Random branch: quests-a.ts.
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.the-zoltans-take-their-readings") }],
      },
      {
        id: "c:zoltan-research-facility:1",
        label: tx("wiki.quests-a-pages.decline"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:zoltan-research-facility:2",
        // {{Blue Option|Advanced Medbay|Give them your medical records.|level=3}}: Medbay level 3 (quests-a.ts disabled).
        label: tx("wiki.quests-a-pages.give-them-your-medical-records"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.they-pay-for-the-data") }],
      },
      {
        id: "c:zoltan-research-facility:3",
        // {{Blue Option|Damaged Stasis Pod|Ask if they can fix this.}} (quests-a.ts disabled).
        label: tx("wiki.quests-a.ask-if-they-can-fix-this"),
        fx: [{ k: "note", text: tx("wiki.quests-a.interesting-i-ve-never-seen") }],
      },
    ],
  },
  // "Zoltan trade hub" ({{Locations|Zoltan Controlled Sector|Zoltan Homeworlds|...|unique=true}}), ZOLTAN_TRADE_HUB.
  {
    dest: "Zoltan trade hub",
    slug: "zoltan-trade-hub",
    flag: "cited:zoltan-trade-hub",
    aliases: ["Zoltan trade hub", "Zoltan Trade Hub"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.quests-a-pages.you-come-to-a-zoltan-trade"),
    choices: [
      {
        id: "c:zoltan-trade-hub:0",
        label: tx("wiki.quests-a-pages.try-to-talk-your-way-in"),
        // "2-4 zoltan boarders ... and you fight a Zoltan ship" / "In the Zoltan hub". Random branch: quests-a.ts.
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.you-try-your-luck-at-the") }],
      },
      {
        id: "c:zoltan-trade-hub:1",
        // {{Blue_Option|Teleporter|Beam directly to the civilian deck.}} (quests-a.ts disabled).
        label: tx("wiki.quests-a-pages.beam-directly-to-the-civilian-deck"),
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.in-the-zoltan-hub") }],
      },
      {
        id: "c:zoltan-trade-hub:2",
        // {{Blue_Option|Zoltan Crew|...}}: "You lose 10 scrap." Paid in quests-a.ts; the price disables the choice here.
        label: tx("wiki.quests-a-pages.present-his-official-documentation-and-pay"),
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 }],
      },
      {
        id: "c:zoltan-trade-hub:3",
        label: tx("wiki.quests-a-pages.leave"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Rock bride" ({{Locations|Rock Controlled Sector|Rock Homeworlds|...|unique=true}}), ROCK_QUEST_MARRIAGE_START.
  {
    dest: "Rock bride",
    slug: "rock-bride",
    flag: "cited:rock-bride",
    aliases: ["Rock bride", "Rock Bride", "Rock Bride Transport"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: tx("wiki.quests-a-pages.a-rock-captain-hails-you-it"),
    choices: [
      {
        id: "c:rock-bride:0",
        label: tx("wiki.quests-a-pages.accept-the-passenger"),
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: tx("wiki.quests-a-pages.a-quest-marker-is-added-to") }],
      },
      {
        id: "c:rock-bride:1",
        label: tx("wiki.quests-a-pages.refuse"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
