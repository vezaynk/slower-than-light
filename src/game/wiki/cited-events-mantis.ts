import { tx } from "../../i18n/index.ts";
/**
 * Leftover Mantis pages. A choice is kept only when the opening result is one
 * stated amount or one named fight. Boarders: Humans near sun beams 2-4 humans.
 * Boarders: Mantis beams 2-4 mantis. Neither is a crew grant.
 * Other boarder counts and branched rewards are not granted.
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
  // "Fight a Mantis ship (default rewards)." Mantis fight near sun has no choice. Arrival calls this fight. The printed sentence is the card body. redgiant=true. unique=false.
  {
    dest: "Mantis fight near sun",
    slug: "mantis-fight-near-sun",
    flag: "cited:mantis-fight-near-sun",
    aliases: ["Mantis fight near sun"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: tx("wiki.cited-events-mantis.who-knows-why-the-mantis-would"),
    choices: [
      {
        id: "c:mantis-fight-near-sun:0",
        // "Fight a Mantis ship (default rewards)."
        label: tx("wiki.cited-events-mantis.fight-a-mantis-ship-default-rewards"),
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis ship-collectors",
    // Arrival calls this fight. The printed hail is the card body. The quest marker stays after the escape.
    slug: "mantis-ship-collectors",
    flag: "cited:mantis-ship-collectors",
    aliases: ["Mantis ship-collectors"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: tx("wiki.cited-events-mantis.you-are-immediately-hailed-by-an"),
    choices: [
      {
        id: "c:mantis-ship-collectors:0",
        // "Fight a Mantis Fighter with crew entirely composed of Mantis."
        label: tx("wiki.cited-events-mantis.fight-a-mantis-fighter"),
        fx: [
          { k: "fight", tier: "Mantis Fighter" },
        ],
      },
    ],
  },
  {
    // Boarders: Humans near sun. The page prints no button. The red line is the outcome, applied on arrival.
    // redgiant=true, LRSmap=noship+redgiant, unique=true. Not a crew grant.
    dest: "Boarders: Humans near sun",
    slug: "boarders-humans-near-sun",
    flag: "cited:boarders-humans-near-sun",
    aliases: ["Boarders: Humans near sun"],
    sectors: [
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: tx("wiki.cited-events-mantis.you-arrive-to-find-yourself-extremely"),
    choices: [
      {
        id: "c:boarders-humans-near-sun:0",
        label: tx("wiki.cited-events-mantis.2-4-human-boarders-beam-aboard"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Boarders: Mantis. The page prints no button. The red line is the outcome, applied on arrival.
    // LRSmap=noship, unique=true. Not a crew grant.
    dest: "Boarders: Mantis",
    slug: "boarders-mantis",
    flag: "cited:boarders-mantis",
    aliases: ["Boarders: Mantis"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: tx("wiki.cited-events-mantis.a-derelict-and-still-smoking-mantis"),
    choices: [
      {
        id: "c:boarders-mantis:0",
        label: tx("wiki.cited-events-mantis.2-4-mantis-boarders-beam-aboard"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Escape pod. Jettison does nothing. Prying it open is three results with no odds.
    // The Mantis and the Human are not named, so those grants stay unwired. The boarder is not a crew grant.
    dest: "Escape pod",
    slug: "escape-pod",
    flag: "cited:escape-pod",
    aliases: ["Escape pod"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: tx("wiki.cited-events-mantis.you-detect-and-retrieve-an-escape"),
    choices: [
      { id: "c:escape-pod:0", label: tx("wiki.cited-events-mantis.jettison-the-pod"), fx: [{ k: "nothing" }] },
      { id: "c:escape-pod:1", label: tx("wiki.cited-events-mantis.pry-it-open"), fx: [{ k: "note", text: tx("wiki.cited-events-mantis.a-mantis-boarder-and-a-lost") }] },
    ],
  },
];
