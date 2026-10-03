/**
 * Crystal pages whose opening choice states one scrap amount, scrap tier,
 * hull number, fleet delay, or named fight.
 * Redirects have no Locations. A branched crew or weapon reward is not granted.
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
    dest: "Crystal scrap collector",
    slug: "crystal-scrap-collector",
    flag: "cited:crystal-scrap-collector",
    aliases: ["Crystal scrap collector"],
    sectors: ["Hidden Crystal Worlds"],
    body: "",
    choices: [
      {
        id: "c:crystal-scrap-collector:0",
        label: "Offer 35 scrap",
        // "Offer 35 scrap."
        // sign -1
        // Crystal crewmember, Crystal Lockdown Bomb, or Crystal Burst Mark II. Branched reward is not granted.
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 35, hi: 35 },
          { k: "note", text: "Branched crew and weapon rewards are not granted." },
        ],
      },
      {
        id: "c:crystal-scrap-collector:1",
        label: "Turn him down",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
