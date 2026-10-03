/**
 * Crystal event pages whose opening choice is one stated outcome.
 * A follow-up menu, a blue option, crew, and a random list of results are omitted.
 * "Scrap with resources" would be a tier with resources:true. None of these openings say that.
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
    dest: "Crystal fight",
    slug: "crystal-fight",
    flag: "cited:crystal-fight",
    aliases: ["Crystal fight"],
    sectors: ["Hidden Crystal Worlds"],
    body: "",
    choices: [
      {
        id: "c:crystal-fight:0",
        label: "Fight a Crystal ship (default rewards)",
        fx: [
          // Fight a [[Crystal Ships|Crystal ship]]
          { k: "fight", tier: "Crystal ship" },
        ],
      },
    ],
  },
  {
    dest: "Crystal fight choice",
    slug: "crystal-fight-choice",
    flag: "cited:crystal-fight-choice",
    aliases: ["Crystal fight choice"],
    sectors: ["Hidden Crystal Worlds"],
    body: "You're greeted by an unwelcome sight - a Rebel advance ship is laying down fire on a Crystalline vessel in the distance.",
    choices: [
      {
        id: "c:crystal-fight-choice:0",
        label: "Engage the Rebel ship",
        fx: [
          // Fight a [[Crystal Ships|Crystal ship]]
          { k: "fight", tier: "Crystal ship" },
        ],
      },
      {
        id: "c:crystal-fight-choice:1",
        label: "Leave them alone",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Pirate ship attacking Crystal",
    slug: "pirate-ship-attacking-crystal",
    flag: "cited:pirate-ship-attacking-crystal",
    aliases: ["Pirate ship attacking Crystal"],
    sectors: ["Hidden Crystal Worlds"],
    body: "A pirate ship jumps in right after you arrive at the beacon.",
    choices: [
      {
        id: "c:pirate-ship-attacking-crystal:0",
        label: "Attack the pirate",
        fx: [
          // Fight a [[Enemy Ships|Pirate ship]]
          { k: "fight", tier: "Pirate ship" },
        ],
      },
      {
        id: "c:pirate-ship-attacking-crystal:1",
        label: "Ignore them",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Rebel fight (Crystal)",
    slug: "rebel-fight-crystal",
    flag: "cited:rebel-fight-crystal",
    aliases: ["Rebel fight (Crystal)"],
    sectors: ["Hidden Crystal Worlds"],
    body: "As soon as you arrive, a Rebel ship jumps in after you; they must be really hot on your tail.",
    choices: [
      {
        id: "c:rebel-fight-crystal:0",
        label: "Fight a Rebel ship (default rewards)",
        fx: [
          // Fight a [[Rebel Ships|Rebel ship]]
          { k: "fight", tier: "Rebel ship" },
        ],
      },
    ],
  },
];
