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
    // Wiki citations:
    // > "This random event occurs in Rock Homeworlds." — [[Ancient device]]
    // > "It is unique." — [[Ancient device]]
    // > "An ancient device is orbiting within the crystal rings of a nearby gas giant." — [[Ancient device]]
    flag: "cited:ancient-device",
    aliases: ["Ancient device", "Ancient Device"],
    sectors: ["Rock Homeworlds"],
    body: "An ancient device is orbiting within the crystal rings of a nearby gas giant. You can't discern its nature or function, but it seems to have been deactivated for a very long time. Perhaps you can get some scrap from it.",
    choices: [
      {
        id: "c:ancient-device:0",
        // Wiki citations:
        // > "Scrap it." — [[Ancient device]]
        // > "You receive high scrap." — [[Ancient device]]
        // > "Fight a Rock ship (default rewards)." — [[Ancient device]]
        label: "Scrap it.",
        fx: [{ k: "note", text: "You break it apart, or a Rock military ship answers." }],
      },
      {
        id: "c:ancient-device:1",
        // Wiki citations:
        // > "Leave it alone." — [[Ancient device]]
        // > "Nothing happens." — [[Ancient device]]
        label: "Leave it alone.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:ancient-device:2",
        // Wiki citations:
        // > "(Crystal Crew) Reactivate it." — [[Ancient device]]
        label: "Reactivate it.",
        fx: [{ k: "note", text: "The device opens a wormhole." }],
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
    body: "You are immediately messaged by an imposing looking Rock war vessel, \"You're the ship off to 'save the Federation,' aren't you? And you expect to survive with that hunk of junk?\"",
    choices: [
      {
        id: "c:rock-war-vessel-encounter:0",
        // Wiki citations:
        // > "We're going to save them or die trying." — [[Rock war vessel encounter]]
        // > "A quest marker is added to your map." — [[Rock war vessel encounter]]
        label: '"We\'re going to save them or die trying."',
        fx: [
          {
            k: "note",
            text: '"The latter being more likely. Still... we can potentially help you and your precious fleet, but you\'ll need to prove yourself first. Meet us at these coordinates." They jump away.',
          },
          { k: "quest", id: "rock-sun" },
        ],
      },
      {
        id: "c:rock-war-vessel-encounter:1",
        // Wiki citations:
        // > "We're strong enough to destroy you!" — [[Rock war vessel encounter]]
        // > "A quest marker is added to your map." — [[Rock war vessel encounter]]
        label: '"We\'re strong enough to destroy you!"',
        fx: [
          {
            k: "note",
            text: '"One ship is not the same as a fleet, but at least you\'ve got some fire. Meet us at these coordinates if you want to prove to us that the Federation is worth saving." They jump away.',
          },
          { k: "quest", id: "rock-sun" },
        ],
      },
      {
        id: "c:rock-war-vessel-encounter:2",
        // Wiki citations:
        // > "Ignore them." — [[Rock war vessel encounter]]
        // > "Nothing happens." — [[Rock war vessel encounter]]
        label: "Ignore them.",
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
    body: 'An unarmed Zoltan transport vessel is slowly making its way toward the beacon here. They hail: "This is a Zoltan peace envoy. We carry no weapons or shielding and rely on the mercy of others to communicate our message."',
    choices: [
      {
        id: "c:unarmed-zoltan-transport:0",
        // Wiki citations:
        // > "Attack them." — [[Unarmed Zoltan transport]]
        // > "Fight an unarmed Zoltan ship." — [[Unarmed Zoltan transport]]
        // > "Fight a Zoltan ship." — [[Unarmed Zoltan transport]]
        label: "Attack them.",
        fx: [{ k: "fight", tier: "Zoltan ship" }],
      },
      {
        id: "c:unarmed-zoltan-transport:1",
        // Wiki citations:
        // > "Hear them out." — [[Unarmed Zoltan transport]]
        // > "A quest marker is added to your map." — [[Unarmed Zoltan transport]]
        label: "Hear them out.",
        fx: [
          {
            k: "note",
            text: `They continue. "We take your silence for interested contemplation." They talk at length about peace and harmony, but either it's beyond your simple mind or it's all nonsense.

They finish: "Please, spread the word of enlightenment to those that have not heard. Once you have, contact our brethren." They transmit coordinates of their so-called "brethren".`,
          },
          { k: "quest", id: "zoltan-peace" },
        ],
      },
      {
        id: "c:unarmed-zoltan-transport:2",
        // Wiki citations:
        // > "Nothing happens." — [[Unarmed Zoltan transport]]
        label: "Leave.",
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
    sectors: [
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "You arrive at a Zoltan research facility. They say they are researching genetic distortion due to stasis sleep and prolonged FTL travel. They ask if your crew has the time to undergo a few scans.",
    choices: [
      {
        id: "c:zoltan-research-facility:0",
        // Wiki citations:
        // > "Participate in their study." — [[Zoltan research facility]]
        label: "Participate in their study.",
        fx: [{ k: "note", text: "The Zoltans take their readings." }],
      },
      {
        id: "c:zoltan-research-facility:1",
        // Wiki citations:
        // > "Decline." — [[Zoltan research facility]]
        label: "Decline.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:zoltan-research-facility:2",
        // Wiki citations:
        // > "Give them your medical records." — [[Zoltan research facility]]
        label: "Give them your medical records.",
        fx: [{ k: "note", text: "They pay for the data." }],
      },
      {
        id: "c:zoltan-research-facility:3",
        // Wiki citations:
        // > "(Damaged Stasis Pod) Ask if they can fix this." — [[Zoltan research facility]]
        label: "Ask if they can fix this.",
        fx: [
          {
            k: "note",
            text: `"Interesting. I've never seen a cryogenic system like this. It appears to still be functioning..." They hook it up to their system and run a number of tests on it.

"Amazing! It has the ability to reconstruct the body if it was damaged during transit. Watch." They reactivate the pod and you watch as the hunks of crystal inside reform to build a humanoid structure. The pod slides open and the re-formed alien steps out.

It speaks slowly, "Greetings. I appear to be in your debt. My people isolated themselves a long time ago, but perhaps it's time to re-establish a connection. There's a hidden wormhole near the Rock home-worlds. Perhaps you can take me there so I can properly repay you?"`,
          },
        ],
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
    body: "You come to a Zoltan trade and supply hub - everything the weary traveler needs, provided they have the right documentation.",
    choices: [
      {
        id: "c:zoltan-trade-hub:0",
        // Wiki citations:
        // > "Try to talk your way in." — [[Zoltan trade hub]]
        // > "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship (default rewards)." — [[Zoltan trade hub]]
        label: "Try to talk your way in.",
        fx: [{ k: "note", text: "You try your luck at the airlock." }],
      },
      {
        id: "c:zoltan-trade-hub:1",
        // Wiki citations:
        // > "(Teleporter) Beam directly to the civilian deck." — [[Zoltan trade hub]]
        label: "Beam directly to the civilian deck.",
        fx: [{ k: "note", text: "In the Zoltan hub." }],
      },
      {
        id: "c:zoltan-trade-hub:2",
        // Wiki citations:
        // > "(Zoltan Crew) Present his official documentation and pay the entry fee." — [[Zoltan trade hub]]
        // > "You lose Scrap lost: 10." — [[Zoltan trade hub]]
        label: "Present his official documentation and pay the entry fee.",
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 }],
      },
      {
        id: "c:zoltan-trade-hub:3",
        // Wiki citations:
        // > "Nothing happens." — [[Zoltan trade hub]]
        label: "Leave.",
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
    body: 'A rock captain hails you: "It is improper of me to contact off-worlders, but this is an emergency. We were on our way to deliver our passenger to her new husband - the Grand Basilisk of Numa V - when our engines broke down. Will you take possession of her, and make haste to Numa V?"',
    choices: [
      {
        id: "c:rock-bride:0",
        // Wiki citations:
        // > "Accept the passenger." — [[Rock bride]]
        // > "A quest marker is added to your map." — [[Rock bride]]
        label: "Accept the passenger.",
        fx: [
          {
            k: "note",
            text: '"You surprise me, off-worlder. Thank you. The passenger will be with you momentarily." She refuses to enter the main hold and prefers to wait in the cargo bay.',
          },
          { k: "quest", id: "rock-bride" },
        ],
      },
      {
        id: "c:rock-bride:1",
        // Wiki citations:
        // > "Nothing happens." — [[Rock bride]]
        label: "Refuse.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
