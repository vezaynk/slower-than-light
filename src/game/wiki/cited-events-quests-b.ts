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
    dest: "Asteroid belt distress",
    slug: "asteroid-belt-distress",
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
    body: "You follow the distress beacon to a tiny asteroid belt. You find a small ship struggling to maneuver through the field.",
    choices: [
      {
        id: "c:asteroid-belt-distress:0",
        label: "Hail them to offer assistance.",
        // "Help! Our shields are down and we won't last long!" Follow-up card: wiki/quests-b.ts.
        fx: [{ k: "note", text: "They beg for help." }],
      },
    ],
  },
  // "Capture the ship" ({{Locations|Civilian Sector|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|
  // Zoltan Homeworlds}}). The three blue options lead to "Offer a solution" (wiki/quests-b.ts).
  {
    dest: "Capture the ship",
    slug: "capture-the-ship",
    flag: "cited:capture-the-ship",
    aliases: ["Capture the ship", "Capture the Ship"],
    sectors: ["Civilian Sector", "Rock Controlled Sector", "Rock Homeworlds", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "You arrive to find a number of ships convening around a station. There is some unencrypted chatter between the ships, you tune in and listen for anything interesting.\n\nOverhearing their conversation, it seems that they need to take possession of an enemy ship intact.",
    choices: [
      {
        id: "c:capture-the-ship:0",
        label: "Offer your services.",
        // "Nothing happens." (they say you are not "properly equipped"; the text is in wiki/quests-b.ts)
        fx: [{ k: "note", text: "They decline." }],
      },
      {
        id: "c:capture-the-ship:1",
        label: "Leave them alone.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:capture-the-ship:2",
        // {{Blue Option|Teleporter|Offer to board their ship.}}
        label: "Offer to board their ship.",
        fx: [{ k: "note", text: "They hear your offer." }],
      },
      {
        id: "c:capture-the-ship:3",
        // {{Blue Option|Fire Bomb|Offer to burn the crew out.}}
        label: "Offer to burn the crew out.",
        fx: [{ k: "note", text: "They hear your offer." }],
      },
      {
        id: "c:capture-the-ship:4",
        // {{Blue Option|Bio Beam|Offer to 'remove' their crew.|shortreq=Anti-Bio Beam}}
        label: "Offer to 'remove' their crew.",
        fx: [{ k: "note", text: "They hear your offer." }],
      },
    ],
  },
  // "Encrypted federation signal" ({{Locations|Abandoned Sector|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|
  // Rebel Controlled Sector|Rebel Stronghold|Rock Controlled Sector|Rock Homeworlds|Zoltan Controlled Sector|Zoltan
  // Homeworlds}}). The away party rolls one of five results (wiki/quests-b.ts).
  {
    dest: "Encrypted federation signal",
    slug: "encrypted-federation-signal",
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
    body: "A Federation encrypted signal is being broadcast from a nearby planet.",
    choices: [
      {
        id: "c:encrypted-federation-signal:0",
        label: "Send an away party to investigate.",
        // One of five results, one of them a Rebel ship fight. Random branch: wiki/quests-b.ts.
        fx: [{ k: "note", text: "The away party reports back." }],
      },
      {
        id: "c:encrypted-federation-signal:1",
        label: "It could be a trap, let's move on.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Engi ship attacked by Mantis ship" ({{Locations|Engi Controlled Sector|Engi Homeworlds}}).
  {
    dest: "Engi ship attacked by Mantis ship",
    slug: "engi-ship-attacked-by-mantis-ship",
    flag: "cited:engi-ship-attacked-by-mantis-ship",
    aliases: ["Engi ship attacked by Mantis ship", "Engi Ship Attacked by Mantis Ship"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "You receive a distress call from a nearby Engi ship. \"Assistance requested. Danger present. Imminent destruction.\"",
    choices: [
      {
        id: "c:engi-ship-attacked-by-mantis-ship:0",
        label: "Respond to the call and move in to assist.",
        // Fight a Mantis ship, or a mantis-controlled Engi ship with boarders. Random branch: wiki/quests-b.ts.
        fx: [{ k: "note", text: "You move in." }],
      },
      {
        id: "c:engi-ship-attacked-by-mantis-ship:1",
        label: "Keep your distance.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Merchant's request" ({{Locations|Civilian Sector|Engi Controlled Sector|Engi Homeworlds|Pirate Controlled Sector|
  // Rebel Controlled Sector|Rebel Stronghold}}).
  {
    dest: "Merchant's request",
    slug: "merchant-s-request",
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
    body: "You arrive at a populated sector. One merchant seems to be mass-broadcasting a request for a mercenary ship to aid him. Shall we respond?",
    choices: [
      {
        id: "c:merchant-s-request:0",
        label: "Yes.",
        // One of two requests (a delivery or an investigation). Random branch: wiki/quests-b.ts.
        fx: [{ k: "note", text: "The merchant explains." }],
      },
      {
        id: "c:merchant-s-request:1",
        label: "No.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Nebula wreckage" ({{Locations|Slug Controlled Nebula|Uncharted Nebula|nebula=true}}).
  {
    dest: "Nebula wreckage",
    slug: "nebula-wreckage",
    flag: "cited:nebula-wreckage",
    aliases: ["Nebula wreckage", "Nebula Wreckage"],
    sectors: ["Slug Controlled Nebula", "Uncharted Nebula"],
    body: "This nebula looks like it's recently seen two ships exchange fire... with mutually-assured destructive results. Wreckage drifts by your screens and tumbles into the depths of the nebula to be lost to sight. It's hard to determine who the combatants were without closer investigation.",
    choices: [
      {
        id: "c:nebula-wreckage:0",
        // {{Blue Option|Slug Crew|Ask your Slug crew to scan for survivors.}}
        label: "Ask your Slug crew to scan for survivors.",
        fx: [{ k: "note", text: "Your Slug finds a survivor." }],
      },
      {
        id: "c:nebula-wreckage:1",
        label: "Investigate the battlefield.",
        // {{DuplicateEvent|3}} nothing, 5 hull damage with a fire, or a survivor. Random branch: wiki/quests-b.ts.
        fx: [{ k: "note", text: "You search the wreckage." }],
      },
      {
        id: "c:nebula-wreckage:2",
        label: "Leave the battlefield before other ships arrive.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
