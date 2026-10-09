/**
 * Stated outcomes from the pirate title list.
 * A page is absent when no opening choice has one resource amount, scrap tier,
 * hull number, fleet delay, or named fight. Blue options and crew are not granted.
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
  // "Fight a Pirate ship (default rewards)." Pirate fight in nebula has no choice. Arrival calls this fight. One of the five printed intros. nebula=true. unique=false. No nebula environment is added.
  {
    dest: "Pirate fight in nebula",
    slug: "pirate-fight-in-nebula",
    flag: "cited:pirate-fight-in-nebula",
    aliases: ["Pirate fight in nebula"],
    sectors: ["Pirate Controlled Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-in-nebula:0",
        label: "Fight a Pirate ship",
        fx: [
          // "Fight a Pirate ship (default rewards)."
          { k: "fight", tier: "Pirate ship" },
        ],
      },
    ],
  },
];
