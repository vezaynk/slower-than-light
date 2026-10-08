/**
 * Leftover Mantis pages. A choice is kept only when the opening result is one
 * stated amount or one named fight. Boarders: Humans near sun beams 2-4 humans.
 * Boarders: Mantis beams 2-4 mantis. Neither is a crew grant.
 * Other boarder counts and branched rewards are not granted.
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
  {
    // Boarders: Humans near sun. The page prints no button. The red line is the label.
    // redgiant=true, LRSmap=noship+redgiant, unique=true. Not a crew grant.
    dest: "Boarders: Humans near sun",
    slug: "boarders-humans-near-sun",
    flag: "cited:boarders-humans-near-sun",
    aliases: ["Boarders: Humans near sun"],
    sectors: [
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "You arrive to find yourself extremely close to a star. You receive a message from a pirate ship, \"I'm glad you arrived; our ship is damaged and we were getting desperate... I hope you don't mind if we take yours.\"",
    choices: [
      {
        id: "c:boarders-humans-near-sun:0",
        label: "2-4 human boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Boarders: Mantis. The page prints no button. The red line is the label.
    // LRSmap=noship, unique=true. Not a crew grant.
    dest: "Boarders: Mantis",
    slug: "boarders-mantis",
    flag: "cited:boarders-mantis",
    aliases: ["Boarders: Mantis"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!",
    choices: [
      {
        id: "c:boarders-mantis:0",
        label: "2-4 mantis boarders beam aboard your ship.",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Escape pod. Jettison does nothing. Prying it open is three results with no odds.
    // The Mantis and the Human are not named, so those grants stay unwired. The boarder is not a crew grant.
    dest: "Escape pod",
    slug: "escape-pod",
    flag: "cited:escape-pod",
    aliases: ["Escape pod"],
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "You detect and retrieve an escape pod floating nearby. You consider returning it to space when you learn it's Mantis.",
    choices: [
      { id: "c:escape-pod:0", label: "Jettison the pod.", fx: [{ k: "nothing" }] },
      { id: "c:escape-pod:1", label: "Pry it open.", fx: [{ k: "note", text: "A Mantis boarder and a lost crewmember, or nothing." }] },
    ],
  },
];
