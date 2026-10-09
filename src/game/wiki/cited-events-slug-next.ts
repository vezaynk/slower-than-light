/**
 * Slug titles from this batch.
 * A redirect has no Locations line. A title that starts with "No fuel:" stays out.
 * Slug moons question is the playable card. The moon count and the answers run in cited-events.ts.
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
  // Slug Controlled Nebula and Slug Home Nebula. distress=true, unique=true, LRSmap=noship.
  // The note says a regular beacon, then a nebula environment on arrival. That kind change is in cited-events.ts.
  {
    dest: "Slug moons question",
    slug: "slug-moons-question",
    flag: "cited:slug-moons-question",
    aliases: ["Slug moons question"],
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    body: "You arrive near the distress beacon's signal.",
    choices: [
      {
        id: "c:slug-moons-question:0",
        label: "Investigate.",
        fx: [{ k: "note", text: "The question follows." }],
      },
    ],
  },
];
