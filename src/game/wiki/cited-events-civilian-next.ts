/**
 * Next civilian titles. Redirects and the Abandoned Sector article have no
 * opening choice. Titles that start with "No fuel:" stay unexported.
 * A choice with several results, a blue option, crew, a boarder count,
 * or a random amount is not granted.
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
    // Dense asteroid field distress. The search, the remains, and Rock Plating run in filler-events.ts.
    // The weapon taken with the scrap is not named, so it is not installed.
    dest: "Dense asteroid field distress",
    slug: "dense-asteroid-field-distress",
    flag: "cited:dense-asteroid-field-distress",
    aliases: ["Dense asteroid field distress"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Pirate Controlled Sector", "Rock Controlled Sector", "Rock Homeworlds"],
    body: "A ship without life forms within a nearby dense asteroid field is giving off the distress call. Shall we investigate? It could be dangerous.",
    choices: [
      {
        id: "c:dense-asteroid-field-distress:0",
        label: "Search for the ship.",
        // Search. Hull and engines, random scrap, or the remains. No odds. INFERRED: equal.
        fx: [{ k: "note", text: "Hull and engines, random scrap, or the remains." }],
      },
      {
        id: "c:dense-asteroid-field-distress:1",
        label: "Avoid the area.",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:dense-asteroid-field-distress:2",
        label: "Make a thorough search for the ship without fear of stray asteroids.",
        // Rock Plating. The remains.
        fx: [{ k: "note", text: "The remains." }],
      },
    ],
  },
];
