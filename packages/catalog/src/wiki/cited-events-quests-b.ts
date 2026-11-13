/**
 * @agent:quests-b. Quest-opening event pages (Category:Events with Quest Markers) that no other cited table wires:
 * Asteroid belt distress, Capture the ship, Encrypted federation signal, Engi ship attacked by Mantis ship, Merchant's
 * request, Nebula wreckage. Same format as the other cited-events-*.ts tables: one card per page, stamped only in the
 * sectors its {{Locations}} line names.
 *
 * Every choice whose page outcome is random, opens a follow-up dialogue or adds a quest marker runs in
 * wiki/quests-b.ts (PART_B.choices, routed through surrenderChoose -> questChoose before citedChoose). Its `fx` below
 * is what this table format can say about it; quests-b.ts holds the full branch with its quotes. Only the plain
 * "Nothing happens." choices are left to citedChoose.
 */

import type { CitedEventDef } from "./cited-events-surrender.ts";

export const EXTRA_EVENTS: CitedEventDef[] = [
  // "Asteroid belt distress" ({{Locations|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|Pirate Controlled
  // Sector|Rebel Controlled Sector|Rebel Stronghold|Rock Controlled Sector|Rock Homeworlds|Uncharted Nebula|distress=true}}).
  {
    dest: "Distress: ship in asteroid belt",
    slug: "asteroid-belt-distress",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Uncharted Nebula." — [[Asteroid belt distress]]
    // > "It is unique." — [[Asteroid belt distress]]
    // > "You follow the distress beacon to a tiny asteroid belt." — [[Asteroid belt distress]]
    flag: "cited:asteroid-belt-distress",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Uncharted Nebula",
    ],
    body: "Ship in an asteroid belt.",
    choices: [
      {
        id: "c:asteroid-belt-distress:0",
        // Wiki citations:
        // > "Hail them to offer assistance." — [[Asteroid belt distress]]
        // > "Help! Our shields are down and we won't last long!" — [[Asteroid belt distress]]
        label: "More options.",
        fx: [{ k: "note", text: "More options." }],
      },
    ],
  },
  // "Capture the ship" ({{Locations|Civilian Sector|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|
  // Zoltan Homeworlds}}). The three blue options lead to "Offer a solution" (wiki/quests-b.ts).
  {
    dest: "Quest: capture a ship",
    slug: "capture-the-ship",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Capture the ship]]
    // > "It is unique." — [[Capture the ship]]
    // > "You arrive to find a number of ships convening around a station." — [[Capture the ship]]
    flag: "cited:capture-the-ship",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Quest offer: capture a ship intact.",
    choices: [
      {
        id: "c:capture-the-ship:0",
        // Wiki citations:
        // > "Offer your services." — [[Capture the ship]]
        // > "you are not \"properly equipped\" for this type of mission." — [[Capture the ship]]
        // > "Nothing happens." — [[Capture the ship]]
        label: "Nothing happens.",
        fx: [{ k: "note", text: "Nothing happens." }],
      },
      {
        id: "c:capture-the-ship:1",
        // Wiki citations:
        // > "Leave them alone." — [[Capture the ship]]
        // > "Nothing happens." — [[Capture the ship]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:capture-the-ship:2",
        // Wiki citations:
        // > "(Teleporter) Offer to board their ship." — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: "More options: quest beacon.",
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:capture-the-ship:3",
        // Wiki citations:
        // > "(Fire Bomb) Offer to burn the crew out." — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: "More options: quest beacon.",
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:capture-the-ship:4",
        // Wiki citations:
        // > "(Bio Beam) Offer to 'remove' their crew. (Requires Anti-Bio Beam)" — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: "More options: quest beacon.",
        fx: [{ k: "note", text: "More options." }],
      },
    ],
  },
  // "Encrypted federation signal" ({{Locations|Abandoned Sector|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|
  // Rebel Controlled Sector|Rebel Stronghold|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|Zoltan
  // Homeworlds}}). The away party rolls one of five results (wiki/quests-b.ts).
  {
    dest: "Planet signal",
    slug: "encrypted-federation-signal",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Encrypted federation signal]]
    // > "It is unique." — [[Encrypted federation signal]]
    // > "A Federation encrypted signal is being broadcast from a nearby planet." — [[Encrypted federation signal]]
    flag: "cited:encrypted-federation-signal",
    aliases: [],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Signal from a planet.",
    choices: [
      {
        id: "c:encrypted-federation-signal:0",
        // Wiki citations:
        // > "Send an away party to investigate." — [[Encrypted federation signal]]
        // > "2-3 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Encrypted federation signal]]
        label:
          "1 in 5: quest beacon. 1 in 5: gain medium resources, quest beacon. 1 in 5: nothing happens. 1 in 5: gain high scrap and resources. 1 in 5: fight and 2-3 Human boarders.",
        fx: [
          {
            k: "note",
            text: "1 in 5: quest beacon. 1 in 5: gain medium resources, quest beacon. 1 in 5: nothing happens. 1 in 5: gain high scrap and resources. 1 in 5: fight and 2-3 Human boarders.",
          },
        ],
      },
      {
        id: "c:encrypted-federation-signal:1",
        // Wiki citations:
        // > "It could be a trap, let's move on." — [[Encrypted federation signal]]
        // > "Nothing happens." — [[Encrypted federation signal]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Engi ship attacked by Mantis ship" ({{Locations|Engi Controlled Sector|Engi Homeworlds}}).
  {
    dest: "Optional fight: Mantis ship (Engi distress)",
    slug: "engi-ship-attacked-by-mantis-ship",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi ship attacked by Mantis ship]]
    // > "You receive a distress call from a nearby Engi ship." — [[Engi ship attacked by Mantis ship]]
    flag: "cited:engi-ship-attacked-by-mantis-ship",
    aliases: [],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "Distress call.",
    choices: [
      {
        id: "c:engi-ship-attacked-by-mantis-ship:0",
        // Wiki citations:
        // > "Respond to the call and move in to assist." — [[Engi ship attacked by Mantis ship]]
        // > "You fight a normal Mantis ship." — [[Engi ship attacked by Mantis ship]]
        // > "1-2 mantis boarders beam aboard your ship and you fight a mantis-controlled Engi ship (default rewards)." — [[Engi ship attacked by Mantis ship]]
        label: "1 in 2: fight a Mantis ship with 1-2 Mantis boarders. 1 in 2: fight a Mantis ship.",
        fx: [{ k: "note", text: "Fight." }],
      },
      {
        id: "c:engi-ship-attacked-by-mantis-ship:1",
        // Wiki citations:
        // > "Keep your distance." — [[Engi ship attacked by Mantis ship]]
        // > "Nothing happens." — [[Engi ship attacked by Mantis ship]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Merchant's request" ({{Locations|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|Pirate Controlled Sector|
  // Rebel Controlled Sector|Rebel Stronghold}}).
  {
    dest: "Quest offer: merchant",
    slug: "merchant-s-request",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold." — [[Merchant's request]]
    // > "It is unique." — [[Merchant's request]]
    // > "You arrive at a populated sector." — [[Merchant's request]]
    flag: "cited:merchant-s-request",
    aliases: [],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "Quest offer.",
    choices: [
      {
        id: "c:merchant-s-request:0",
        // Wiki citations:
        // > "You receive Drone parts gained: 5 and Merchant's Delivery quest marker is added to your map." — [[Merchant's request]]
        // > "Merchant's Investigation quest marker is added to your map." — [[Merchant's request]]
        label: "More options.",
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:merchant-s-request:1",
        // Wiki citations:
        // > "Nothing happens." — [[Merchant's request]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Nebula wreckage" ({{Locations|Slug Controlled Nebula|Uncharted Nebula|nebula=true}}).
  {
    dest: "Wreckage in nebula",
    slug: "nebula-wreckage",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Uncharted Nebula." — [[Nebula wreckage]]
    // > "It is unique." — [[Nebula wreckage]]
    // > "This nebula looks like it's recently seen two ships exchange fire" — [[Nebula wreckage]]
    flag: "cited:nebula-wreckage",
    aliases: [],
    sectors: ["Slug Controlled Nebula", "Uncharted Nebula"],
    body: "Wreckage. Nebula.",
    choices: [
      {
        id: "c:nebula-wreckage:0",
        // Wiki citations:
        // > "(Slug Crew) Ask your Slug crew to scan for survivors." — [[Nebula wreckage]]
        label: "More options: quest beacon or crew.",
        fx: [{ k: "note", text: "More options." }],
      },
      {
        id: "c:nebula-wreckage:1",
        // Wiki citations:
        // > "Investigate the battlefield." — [[Nebula wreckage]]
        // > "3× The wreckage is drifting faster than it first appeared." — [[Nebula wreckage]]
        // > "Your ship takes 5 hull damage" — [[Nebula wreckage]]
        // > "You spot a life form floating within the wreckage." — [[Nebula wreckage]]
        label:
          "1 in 5: take 4 hull damage and a fire. 3 in 5: nothing happens. 1 in 5: more options.",
        fx: [{ k: "note", text: "Searched." }],
      },
      {
        id: "c:nebula-wreckage:2",
        // Wiki citations:
        // > "Leave the battlefield before other ships arrive." — [[Nebula wreckage]]
        // > "Nothing happens." — [[Nebula wreckage]]
        label: "Nothing happens.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
