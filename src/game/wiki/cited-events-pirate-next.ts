/**
 * Next pirate titles. Redirects have no opening choice and no Locations
 * template, so they are not events. Boarders: Humans (Pirate) beams 3-5
 * human boarders and is not a crew grant. unique=true matches the existing
 * once-per-sector stamp.
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
    // Boarders: Humans (Pirate). The page prints no button. The red line is the label.
    // unique=true is the once-per-sector stamp. Not a crew grant. No ship (LRSmap=noship).
    dest: "Boarders: Humans (Pirate)",
    slug: "boarders-humans-pirate",
    flag: "cited:boarders-humans-pirate",
    aliases: ["Boarders: Humans (Pirate)"],
    sectors: ["Pirate Controlled Sector"],
    body: "What appears to be a civilian ship sends a friendly hail. As you approach the vessel, you detect a teleporter signal but it's too late... intruders have beamed aboard!",
    choices: [
      {
        id: "c:boarders-humans-pirate:0",
        label: "3-5 human boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
