import { tx } from "../../i18n/index.ts";
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
    // Wiki citations:
    // > "This random event occurs in Hidden Crystal Worlds." — [[Crystal scrap collector]]
    // > "It is unique." — [[Crystal scrap collector]]
    flag: "cited:crystal-scrap-collector",
    aliases: ["Crystal scrap collector"],
    sectors: ["Hidden Crystal Worlds"],
    body: "",
    choices: [
      {
        id: "c:crystal-scrap-collector:0",
        // Wiki citations:
        // > "Offer 35 scrap." — [[Crystal scrap collector]]
        // > "Scrap lost: 35" — [[Crystal scrap collector]]
        label: tx("wiki.cited-events-crystal-next.offer-35-scrap"),
        // "Offer 35 scrap."
        // sign -1
        // Crystal crewmember, Crystal Lockdown Bomb, or Crystal Burst Mark II. Branched reward is not granted.
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 35, hi: 35 },
          { k: "note", text: tx("wiki.cited-events-crystal-next.branched-crew-and-weapon-rewards-are") },
        ],
      },
      {
        id: "c:crystal-scrap-collector:1",
        // Wiki citations:
        // > "Turn him down." — [[Crystal scrap collector]]
        // > "Nothing happens." — [[Crystal scrap collector]]
        label: tx("wiki.cited-events-crystal-next.turn-him-down"),
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
