/**
 * Rebel pages whose opening outcome states one fight.
 * Not stamped onto a map. Boarder counts are not granted.
 * Winning scrap with two results is not a choice.
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
    dest: "Rebel fight among Rebel fleet",
    slug: "rebel-fight-among-rebel-fleet",
    flag: "cited:rebel-fight-among-rebel-fleet",
    aliases: ["Rebel fight among Rebel fleet"],
    sectors: ["The Last Stand"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-among-rebel-fleet:0",
        label: "Fight a Rebel ship",
        // "Fight a Rebel ship."
        // Destroyed: low scrap. Crew killed: medium scrap with resources. Two Winning results, not granted.
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
    ],
  },
  {
    dest: "Rebel fight with boarders",
    slug: "rebel-fight-with-boarders",
    flag: "cited:rebel-fight-with-boarders",
    aliases: ["Rebel fight with boarders"],
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-with-boarders:0",
        label: "Fight a Rebel ship",
        // "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)."
        // Boarder counts are crew and are not granted.
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
          {
            k: "note",
            text: "Boarders named on the page are not applied.",
          },
        ],
      },
    ],
  },
];
