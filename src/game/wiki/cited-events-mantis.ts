/**
 * Leftover Mantis pages. A choice is kept only when the opening result is one
 * stated amount or one named fight. Boarder counts, crew, and branched rewards
 * are not granted.
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
  {
    dest: "Mantis fight near sun",
    slug: "mantis-fight-near-sun",
    flag: "cited:mantis-fight-near-sun",
    aliases: ["Mantis fight near sun"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "Who knows why the Mantis would venture so close to a sun.",
    choices: [
      {
        id: "c:mantis-fight-near-sun:0",
        // "Fight a Mantis ship (default rewards)."
        label: "Fight a Mantis ship (default rewards)",
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis ship-collectors",
    slug: "mantis-ship-collectors",
    flag: "cited:mantis-ship-collectors",
    aliases: ["Mantis ship-collectors"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "You are immediately hailed by an impressive-looking Mantis ship.",
    choices: [
      {
        id: "c:mantis-ship-collectors:0",
        // "Fight a Mantis Fighter with crew entirely composed of Mantis."
        label: "Fight a Mantis Fighter",
        fx: [
          { k: "fight", tier: "Mantis Fighter" },
        ],
      },
    ],
  },
];
