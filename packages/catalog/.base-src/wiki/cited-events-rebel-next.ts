/**
 * Next Rebel titles. Redirects are not followed. A chase that sometimes
 * fights, sometimes doubles pursuit, and sometimes does nothing is left out.
 * Accept's four results run in wiki/quests.ts. Reject's three results run there too.
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
    dest: "Rebel defector",
    slug: "rebel-defector",
    // Wiki citations:
    // > "This random event occurs in Rebel Controlled Sector, Rebel Stronghold." — [[Rebel defector]]
    // > "It is unique." — [[Rebel defector]]
    flag: "cited:rebel-defector",
    aliases: ["Rebel defector"],
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    body: "",
    choices: [
      {
        id: "c:rebel-defector:0",
        // Wiki citations:
        // > "Accept his proposal, and prepare to fight the Rebel ship." — [[Rebel defector]]
        label: "Accept his proposal",
        // Accept's four results (crew, hull and engines, boarders, the evisceration) run in wiki/quests.ts.
        // This fx must not also start a fight.
        fx: [{ k: "nothing" }],
      },
      // @agent:quests. "Reject his offer. You can never trust these Rebels." Its three results (the cache offer that can
      // add a quest marker, boarders, the fight) run in wiki/quests.ts before citedChoose; this fx is what the table
      // format can say about it.
      {
        id: "c:rebel-defector:1",
        // Wiki citations:
        // > "Reject his offer. You can never trust these Rebels." — [[Rebel defector]]
        label: "Reject his offer. You can never trust these Rebels.",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
];
