/**
 * Mantis and Rock titles in this lane.
 * A page is exported only when an opening choice states one scrap tier,
 * resource range, hull number, fleet delay, or one named fight, and the
 * first Locations list still has a sector name. Redirects, blue options,
 * crew, quest markers, augments, and choices with several results are out.
 * Mantis pheromones and Rock firefighting are not implemented.
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
