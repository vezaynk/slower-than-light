/**
 * Next Zoltan titles. None are exported.
 * Redirects are not followed: Homeworlds, Shield Bypass, Trade Hub, free
 * stuff, science ship, Life Raft, and Research Facility state no outcome.
 * Great Eye, odd moon, ship asks to dock, and the Refugee template hail
 * each branch across more than one result. A nothing or blue option does
 * not qualify a page by itself. Zoltan Shield Bypass is the augment article.
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

export const EXTRA_EVENTS: CitedEventDef[] = [];
