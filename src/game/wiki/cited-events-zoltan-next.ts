/**
 * Next Zoltan titles.
 * Redirects are not followed: Homeworlds, Shield Bypass, Trade Hub, free
 * stuff, science ship, Life Raft, and Research Facility state no outcome.
 * Zoltan odd moon is the playable card. Its branches run in cited-events.ts.
 * Great Eye, ship asks to dock, and the Refugee template hail each branch
 * across more than one result. A nothing or blue option does not qualify a
 * page by itself. Zoltan Shield Bypass is the augment article.
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
  // Zoltan Controlled Sector and Zoltan Homeworlds. unique=true. LRSmap=noship.
  {
    dest: "Zoltan odd moon",
    slug: "zoltan-odd-moon",
    flag: "cited:zoltan-odd-moon",
    aliases: ["Zoltan odd moon"],
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    body: "Something strikes you as odd about a moon in the distance.",
    choices: [
      {
        id: "c:zoltan-odd-moon:0",
        label: "Check it out.",
        fx: [{ k: "note", text: "The moon has more than one result." }],
      },
      {
        id: "c:zoltan-odd-moon:1",
        label: "Leave it be.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
