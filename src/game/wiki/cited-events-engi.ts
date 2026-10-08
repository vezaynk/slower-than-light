/**
 * Leftover Engi pages whose opening choice states one amount, tier, hull
 * number, fleet delay, or one named ship. Several results, blue options,
 * crew, map reveals, upgrades, and unnamed items are omitted.
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
    dest: "Mantis fight (Engi)",
    slug: "mantis-fight-engi",
    flag: "cited:mantis-fight-engi",
    aliases: ["Mantis fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-engi:0",
        label: "Fight a Mantis ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis fight choice",
    slug: "mantis-fight-choice",
    flag: "cited:mantis-fight-choice",
    aliases: ["Mantis fight choice"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-choice:0",
        label: "Attack the ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis ship attacking civilian",
    slug: "mantis-ship-attacking-civilian",
    flag: "cited:mantis-ship-attacking-civilian",
    aliases: ["Mantis ship attacking civilian"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-ship-attacking-civilian:0",
        label: "Aid the civilian ship",
        // "Fight the Mantis Ship."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
      {
        id: "c:mantis-ship-attacking-civilian:1",
        label: "Stay out of it",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Pirate fight (Engi)",
    slug: "pirate-fight-engi",
    flag: "cited:pirate-fight-engi",
    aliases: ["Pirate fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "There must have been rich pickings for pirates around here up until war broke out. The pirate you encounter here looks worn down, but hungry. You'll have to fight!",
    choices: [
      {
        id: "c:pirate-fight-engi:0",
        label: "Fight a Pirate ship",
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  {
    dest: "Rebel fight (Engi)",
    slug: "rebel-fight-engi",
    flag: "cited:rebel-fight-engi",
    aliases: ["Rebel fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "The rebel fighter here would seem to suggest elements of the rebel fleet are already making incursions on Engi space. You move to engage.",
    choices: [
      {
        id: "c:rebel-fight-engi:0",
        label: "Fight a Rebel ship",
        // "Fight a Rebel ship (default rewards)."
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  {
    // Confused Mantis. The branches, Robert Smith, and the engine upgrade run in filler-events.ts.
    dest: "Confused Mantis",
    slug: "confused-mantis",
    flag: "cited:confused-mantis",
    aliases: ["Confused Mantis"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "As soon as you jump into the system, you receive a hail from a nearby civilian Engi vessel. Their Captain appears on your screen: \"Strange bug. Can you assist in debugging?\"",
    choices: [
      {
        id: "c:confused-mantis:0",
        label: "Listen to their problem.",
        // "Listen to their problem."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:confused-mantis:1",
        label: "Explain that you can't do any programming and leave.",
        // "Explain that you can't do any programming and leave."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    // Mantis fugitive. The sabotage, the bounty, and the Engi fight run in filler-events.ts.
    // The thanked crewmember is not named, so that grant stays unwired.
    dest: "Mantis fugitive",
    slug: "mantis-fugitive",
    flag: "cited:mantis-fugitive",
    aliases: ["Mantis fugitive"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds", "Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "You arrive just in time to see an unusually well-armed Engi ship destroying a small pirate craft. A teleporter signal is detected...intruder on deck!",
    choices: [
      {
        id: "c:mantis-fugitive:0",
        label: "Side with the fugitive and fight the Engi ship.",
        // "Side with the fugitive and fight the Engi ship."
        fx: [{ k: "fight", tier: "Engi ship" }],
      },
      {
        id: "c:mantis-fugitive:1",
        label: "Agree to offer up the Mantis in exchange for a bounty.",
        // "Agree to offer up the Mantis in exchange for a bounty."
        fx: [{ k: "note", text: "High scrap, hull and fire, or a boarder and an Engi ship." }],
      },
    ],
  },
];
