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

import { tx } from "../../i18n/index.ts";
import type { CitedEventDef } from "./cited-events-surrender.ts";

export const EXTRA_EVENTS: CitedEventDef[] = [
  // "Asteroid belt distress" ({{Locations|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|Pirate Controlled
  // Sector|Rebel Controlled Sector|Rebel Stronghold|Rock Controlled Sector|Rock Homeworlds|Uncharted Nebula|distress=true}}).
  {
    dest: "Asteroid belt distress",
    slug: "asteroid-belt-distress",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Uncharted Nebula." — [[Asteroid belt distress]]
    // > "It is unique." — [[Asteroid belt distress]]
    // > "You follow the distress beacon to a tiny asteroid belt." — [[Asteroid belt distress]]
    flag: "cited:asteroid-belt-distress",
    aliases: ["Asteroid belt distress", "Asteroid Belt Distress"],
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
    body: tx("wiki.cited-events-quests-b.you-follow-the-distress-beacon-to"),
    choices: [
      {
        id: "c:asteroid-belt-distress:0",
        // Wiki citations:
        // > "Hail them to offer assistance." — [[Asteroid belt distress]]
        // > "Help! Our shields are down and we won't last long!" — [[Asteroid belt distress]]
        label: tx("wiki.cited-events-quests-b.hail-them-to-offer-assistance"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.they-beg-for-help") }],
      },
    ],
  },
  // "Capture the ship" ({{Locations|Civilian Sector|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|
  // Zoltan Homeworlds}}). The three blue options lead to "Offer a solution" (wiki/quests-b.ts).
  {
    dest: "Capture the ship",
    slug: "capture-the-ship",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Capture the ship]]
    // > "It is unique." — [[Capture the ship]]
    // > "You arrive to find a number of ships convening around a station." — [[Capture the ship]]
    flag: "cited:capture-the-ship",
    aliases: ["Capture the ship", "Capture the Ship"],
    sectors: ["Civilian Sector", "Rock Controlled Sector", "Rock Homeworlds", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: tx("wiki.cited-events-quests-b.you-arrive-to-find-a-number"),
    choices: [
      {
        id: "c:capture-the-ship:0",
        // Wiki citations:
        // > "Offer your services." — [[Capture the ship]]
        // > "you are not \"properly equipped\" for this type of mission." — [[Capture the ship]]
        // > "Nothing happens." — [[Capture the ship]]
        label: tx("wiki.cited-events-quests-b.offer-your-services"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.they-decline") }],
      },
      {
        id: "c:capture-the-ship:1",
        // Wiki citations:
        // > "Leave them alone." — [[Capture the ship]]
        // > "Nothing happens." — [[Capture the ship]]
        label: tx("wiki.cited-events-quests-b.leave-them-alone"),
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:capture-the-ship:2",
        // Wiki citations:
        // > "(Teleporter) Offer to board their ship." — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: tx("wiki.cited-events-quests-b.offer-to-board-their-ship"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.they-hear-your-offer") }],
      },
      {
        id: "c:capture-the-ship:3",
        // Wiki citations:
        // > "(Fire Bomb) Offer to burn the crew out." — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: tx("wiki.cited-events-quests-b.offer-to-burn-the-crew-out"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.they-hear-your-offer") }],
      },
      {
        id: "c:capture-the-ship:4",
        // Wiki citations:
        // > "(Bio Beam) Offer to 'remove' their crew. (Requires Anti-Bio Beam)" — [[Capture the ship]]
        // > "Offer a solution." — [[Capture the ship]]
        label: tx("wiki.cited-events-quests-b.offer-to-remove-their-crew"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.they-hear-your-offer") }],
      },
    ],
  },
  // "Encrypted federation signal" ({{Locations|Abandoned Sector|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|
  // Rebel Controlled Sector|Rebel Stronghold|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|Zoltan
  // Homeworlds}}). The away party rolls one of five results (wiki/quests-b.ts).
  {
    dest: "Encrypted federation signal",
    slug: "encrypted-federation-signal",
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Encrypted federation signal]]
    // > "It is unique." — [[Encrypted federation signal]]
    // > "A Federation encrypted signal is being broadcast from a nearby planet." — [[Encrypted federation signal]]
    flag: "cited:encrypted-federation-signal",
    aliases: ["Encrypted federation signal", "Encrypted Federation Signal"],
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
    body: tx("wiki.cited-events-quests-b.a-federation-encrypted-signal-is-being"),
    choices: [
      {
        id: "c:encrypted-federation-signal:0",
        // Wiki citations:
        // > "Send an away party to investigate." — [[Encrypted federation signal]]
        // > "2-3 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Encrypted federation signal]]
        label: tx("wiki.cited-events-quests-b.send-an-away-party-to-investigate"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.the-away-party-reports-back") }],
      },
      {
        id: "c:encrypted-federation-signal:1",
        // Wiki citations:
        // > "It could be a trap, let's move on." — [[Encrypted federation signal]]
        // > "Nothing happens." — [[Encrypted federation signal]]
        label: tx("wiki.cited-events-quests-b.it-could-be-a-trap-let"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Engi ship attacked by Mantis ship" ({{Locations|Engi Controlled Sector|Engi Homeworlds}}).
  {
    dest: "Engi ship attacked by Mantis ship",
    slug: "engi-ship-attacked-by-mantis-ship",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi ship attacked by Mantis ship]]
    // > "You receive a distress call from a nearby Engi ship." — [[Engi ship attacked by Mantis ship]]
    flag: "cited:engi-ship-attacked-by-mantis-ship",
    aliases: ["Engi ship attacked by Mantis ship", "Engi Ship Attacked by Mantis Ship"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: tx("wiki.cited-events-quests-b.you-receive-a-distress-call-from"),
    choices: [
      {
        id: "c:engi-ship-attacked-by-mantis-ship:0",
        // Wiki citations:
        // > "Respond to the call and move in to assist." — [[Engi ship attacked by Mantis ship]]
        // > "You fight a normal Mantis ship." — [[Engi ship attacked by Mantis ship]]
        // > "1-2 mantis boarders beam aboard your ship and you fight a mantis-controlled Engi ship (default rewards)." — [[Engi ship attacked by Mantis ship]]
        label: tx("wiki.cited-events-quests-b.respond-to-the-call-and-move"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.you-move-in") }],
      },
      {
        id: "c:engi-ship-attacked-by-mantis-ship:1",
        // Wiki citations:
        // > "Keep your distance." — [[Engi ship attacked by Mantis ship]]
        // > "Nothing happens." — [[Engi ship attacked by Mantis ship]]
        label: tx("wiki.cited-events-quests-b.keep-your-distance"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Merchant's request" ({{Locations|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|Pirate Controlled Sector|
  // Rebel Controlled Sector|Rebel Stronghold}}).
  {
    dest: "Merchant's request",
    slug: "merchant-s-request",
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold." — [[Merchant's request]]
    // > "It is unique." — [[Merchant's request]]
    // > "You arrive at a populated sector." — [[Merchant's request]]
    flag: "cited:merchant-s-request",
    aliases: ["Merchant's request", "Merchant's Request"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: tx("wiki.cited-events-quests-b.you-arrive-at-a-populated-sector"),
    choices: [
      {
        id: "c:merchant-s-request:0",
        // Wiki citations:
        // > "You receive Drone parts gained: 5 and Merchant's Delivery quest marker is added to your map." — [[Merchant's request]]
        // > "Merchant's Investigation quest marker is added to your map." — [[Merchant's request]]
        label: tx("wiki.cited-events-quests-b.yes"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.the-merchant-explains") }],
      },
      {
        id: "c:merchant-s-request:1",
        // Wiki citations:
        // > "Nothing happens." — [[Merchant's request]]
        label: tx("wiki.cited-events-quests-b.no"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Nebula wreckage" ({{Locations|Slug Controlled Nebula|Uncharted Nebula|nebula=true}}).
  {
    dest: "Nebula wreckage",
    slug: "nebula-wreckage",
    // Wiki citations:
    // > "This random event occurs in Slug Controlled Nebula, Uncharted Nebula." — [[Nebula wreckage]]
    // > "It is unique." — [[Nebula wreckage]]
    // > "This nebula looks like it's recently seen two ships exchange fire" — [[Nebula wreckage]]
    flag: "cited:nebula-wreckage",
    aliases: ["Nebula wreckage", "Nebula Wreckage"],
    sectors: ["Slug Controlled Nebula", "Uncharted Nebula"],
    body: tx("wiki.cited-events-quests-b.this-nebula-looks-like-it-s"),
    choices: [
      {
        id: "c:nebula-wreckage:0",
        // Wiki citations:
        // > "(Slug Crew) Ask your Slug crew to scan for survivors." — [[Nebula wreckage]]
        label: tx("wiki.cited-events-quests-b.ask-your-slug-crew-to-scan"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.your-slug-finds-a-survivor") }],
      },
      {
        id: "c:nebula-wreckage:1",
        // Wiki citations:
        // > "Investigate the battlefield." — [[Nebula wreckage]]
        // > "3× The wreckage is drifting faster than it first appeared." — [[Nebula wreckage]]
        // > "Your ship takes 5 hull damage" — [[Nebula wreckage]]
        // > "You spot a life form floating within the wreckage." — [[Nebula wreckage]]
        label: tx("wiki.cited-events-quests-b.investigate-the-battlefield"),
        fx: [{ k: "note", text: tx("wiki.cited-events-quests-b.you-search-the-wreckage") }],
      },
      {
        id: "c:nebula-wreckage:2",
        // Wiki citations:
        // > "Leave the battlefield before other ships arrive." — [[Nebula wreckage]]
        // > "Nothing happens." — [[Nebula wreckage]]
        label: tx("wiki.cited-events-quests-b.leave-the-battlefield-before-other-ships"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
