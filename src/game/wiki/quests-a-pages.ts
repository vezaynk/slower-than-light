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
import type { CitedEventDef } from "./cited-events-surrender.ts";

export const EXTRA_EVENTS: CitedEventDef[] = [
  // "Ancient device" ({{Locations|Rock Homeworlds|...|unique=true}}), ROCK_CRYSTAL_BEACON, the Crystal Cruiser's 3rd step.
  {
    dest: "Ancient device",
    slug: "ancient-device",
    flag: "cited:ancient-device",
    aliases: ["Ancient device", "Ancient Device"],
    sectors: ["Rock Homeworlds"],
    body: "An ancient device is orbiting within the crystal rings of a nearby gas giant. You can't discern its nature or function, but it seems to have been deactivated for a very long time. Perhaps you can get some scrap from it.",
    choices: [
      {
        id: "c:ancient-device:0",
        label: "Scrap it.",
        // "You receive high scrap." / "Fight a Rock ship (default rewards)." Random branch: quests-a.ts.
        fx: [{ k: "note", text: "You break it apart, or a Rock military ship answers." }],
      },
      {
        id: "c:ancient-device:1",
        label: "Leave it alone.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:ancient-device:2",
        // {{Blue Option|Crystal Crew|Reactivate it.}}: needs a Crystal crewmember (quests-a.ts disabled).
        label: "Reactivate it.",
        fx: [{ k: "note", text: "The device opens a wormhole." }],
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
    body: "You are immediately messaged by an imposing looking Rock war vessel, \"You're the ship off to 'save the Federation,' aren't you? And you expect to survive with that hunk of junk?\"",
    choices: [
      {
        id: "c:rock-war-vessel-encounter:0",
        label: "\"We're going to save them or die trying.\"",
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: "A quest marker is added to your map." }],
      },
      {
        id: "c:rock-war-vessel-encounter:1",
        label: "\"We're strong enough to destroy you!\"",
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: "A quest marker is added to your map." }],
      },
      {
        id: "c:rock-war-vessel-encounter:2",
        label: "Ignore them.",
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
    body: "An unarmed Zoltan transport vessel is slowly making its way toward the beacon here. They hail: \"This is a Zoltan peace envoy. We carry no weapons or shielding and rely on the mercy of others to communicate our message.\"",
    choices: [
      {
        id: "c:unarmed-zoltan-transport:0",
        label: "Attack them.",
        // "Fight an unarmed Zoltan ship." / "Fight a Zoltan ship." Random branch: quests-a.ts.
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:unarmed-zoltan-transport:1",
        label: "Hear them out.",
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: "A quest marker is added to your map." }],
      },
      {
        id: "c:unarmed-zoltan-transport:2",
        label: "Leave.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Zoltan research facility" ({{Locations|Engi Controlled Sector|Engi Homeworlds|Zoltan Controlled Sector|Zoltan
  // Homeworlds|...|unique=false}}), ZOLTAN_CREW_STUDY, the Crystal Cruiser's 2nd step.
  // Not wired: {{Blue Option|Damaged Stasis Pod|Ask if they can fix this.}}: this build has no Damaged Stasis Pod.
  {
    dest: "Zoltan research facility",
    slug: "zoltan-research-facility",
    flag: "cited:zoltan-research-facility",
    aliases: ["Zoltan research facility", "Zoltan Research Facility"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You arrive at a Zoltan research facility. They say they are researching genetic distortion due to stasis sleep and prolonged FTL travel. They ask if your crew has the time to undergo a few scans.",
    choices: [
      {
        id: "c:zoltan-research-facility:0",
        label: "Participate in their study.",
        // "You receive low scrap." / "2 boarders beam aboard your ship, and you fight a Pirate ship." Random branch: quests-a.ts.
        fx: [{ k: "note", text: "The Zoltans take their readings." }],
      },
      {
        id: "c:zoltan-research-facility:1",
        label: "Decline.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:zoltan-research-facility:2",
        // {{Blue Option|Advanced Medbay|Give them your medical records.|level=3}}: Medbay level 3 (quests-a.ts disabled).
        label: "Give them your medical records.",
        fx: [{ k: "note", text: "They pay for the data." }],
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
    body: "You come to a Zoltan trade and supply hub - everything the weary traveler needs, provided they have the right documentation.",
    choices: [
      {
        id: "c:zoltan-trade-hub:0",
        label: "Try to talk your way in.",
        // "2-4 zoltan boarders ... and you fight a Zoltan ship" / "In the Zoltan hub". Random branch: quests-a.ts.
        fx: [{ k: "note", text: "You try your luck at the airlock." }],
      },
      {
        id: "c:zoltan-trade-hub:1",
        // {{Blue_Option|Teleporter|Beam directly to the civilian deck.}} (quests-a.ts disabled).
        label: "Beam directly to the civilian deck.",
        fx: [{ k: "note", text: "In the Zoltan hub." }],
      },
      {
        id: "c:zoltan-trade-hub:2",
        // {{Blue_Option|Zoltan Crew|...}}: "You lose 10 scrap." Paid in quests-a.ts; the price disables the choice here.
        label: "Present his official documentation and pay the entry fee.",
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 }],
      },
      {
        id: "c:zoltan-trade-hub:3",
        label: "Leave.",
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
    body: "A rock captain hails you: \"It is improper of me to contact off-worlders, but this is an emergency. We were on our way to deliver our passenger to her new husband - the Grand Basilisk of Numa V - when our engines broke down. Will you take possession of her, and make haste to Numa V?\"",
    choices: [
      {
        id: "c:rock-bride:0",
        label: "Accept the passenger.",
        // "A quest marker is added to your map."
        fx: [{ k: "note", text: "A quest marker is added to your map." }],
      },
      {
        id: "c:rock-bride:1",
        label: "Refuse.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
