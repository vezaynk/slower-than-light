import { tx } from "../../i18n/index.ts";
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
    // Arrival calls this fight. One of the seven printed intros.
    slug: "rebel-fight-among-rebel-fleet",
    // Wiki citations:
    // > "This random event occurs in The Last Stand." — [[Rebel fight among Rebel fleet]]
    flag: "cited:rebel-fight-among-rebel-fleet",
    aliases: ["Rebel fight among Rebel fleet"],
    sectors: ["The Last Stand"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-among-rebel-fleet:0",
        // Wiki citations:
        // > "Fight a Rebel ship." — [[Rebel fight among Rebel fleet]]
        // > "no surrender offers, no escape attempts" — [[Rebel fight among Rebel fleet]]
        label: tx("wiki.cited-events-rebel.fight-a-rebel-ship"),
        // Destroyed: low scrap. Crew killed: medium scrap with resources. Those results run in quests.ts.
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
    // Wiki citations:
    // > "This random event occurs in Rebel Controlled Sector, Rebel Stronghold." — [[Rebel fight with boarders]]
    flag: "cited:rebel-fight-with-boarders",
    aliases: ["Rebel fight with boarders"],
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-with-boarders:0",
        // Wiki citations:
        // > "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)." — [[Rebel fight with boarders]]
        label: tx("wiki.cited-events-rebel.fight-a-rebel-ship"),
        fx: [
          {
            k: "fight",
            tier: "Rebel ship",
          },
        ],
      },
    ],
  },
];
