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
  // "Fight a Mantis ship (default rewards)." Mantis fight (Engi) has no choice. Arrival calls this fight. One of the four printed intros. unique=false.
  {
    dest: "Mantis fight (Engi)",
    slug: "mantis-fight-engi",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Mantis fight (Engi)]]
    flag: "cited:mantis-fight-engi",
    aliases: ["Mantis fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-engi:0",
        // Wiki citations:
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight (Engi)]]
        label: "Fight a Mantis ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  {
    dest: "Mantis fight choice",
    slug: "mantis-fight-choice",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fight choice]]
    flag: "cited:mantis-fight-choice",
    aliases: ["Mantis fight choice"],
    sectors: [
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-choice:0",
        // Wiki citations:
        // > "Attack the ship." — [[Mantis fight choice]]
        // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice]]
        label: "Attack the ship",
        // "Fight a Mantis ship (default rewards)."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
      {
        id: "c:mantis-fight-choice:1",
        // Wiki citations:
        // > "Attempt to remain concealed." — [[Mantis fight choice]]
        // > "You power down non-essential systems and wait for the FTL drive to charge. They either don't want to fight or have failed to notice your ship, the latter being more likely." — [[Mantis fight choice]]
        // > "Nothing happens." — [[Mantis fight choice]]
        label: "Attempt to remain concealed",
        // "You power down non-essential systems and wait for the FTL drive to charge. They either don't want to fight or have failed to notice your ship, the latter being more likely."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:mantis-fight-choice:2",
        // Wiki citations:
        // > "(Cloaking) Cloak to stay hidden." — [[Mantis fight choice]]
        // > "You cloak and shut down non-essential systems. In a short time the Mantis ship jumps away, no doubt in search of prey." — [[Mantis fight choice]]
        // > "Nothing happens." — [[Mantis fight choice]]
        label: "Cloak to stay hidden.",
        // "You cloak and shut down non-essential systems. In a short time the Mantis ship jumps away, no doubt in search of prey."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  {
    dest: "Mantis ship attacking civilian",
    slug: "mantis-ship-attacking-civilian",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis ship attacking civilian]]
    flag: "cited:mantis-ship-attacking-civilian",
    aliases: ["Mantis ship attacking civilian"],
    sectors: [
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:mantis-ship-attacking-civilian:0",
        // Wiki citations:
        // > "Aid the civilian ship." — [[Mantis ship attacking civilian]]
        // > "Fight the Mantis Ship." — [[Mantis ship attacking civilian]]
        label: "Aid the civilian ship",
        // "Fight the Mantis Ship."
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
      {
        id: "c:mantis-ship-attacking-civilian:1",
        // Wiki citations:
        // > "Stay out of it." — [[Mantis ship attacking civilian]]
        // > "Nothing happens." — [[Mantis ship attacking civilian]]
        label: "Stay out of it",
        // "Nothing happens."
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // "Fight a Pirate ship (default rewards)." Pirate fight (Engi) has no choice. Arrival calls this fight. The printed sentence is the card body. unique=false.
  {
    dest: "Pirate fight (Engi)",
    slug: "pirate-fight-engi",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Pirate fight (Engi)]]
    // > "There must have been rich pickings for pirates around here up until war broke out. The pirate you encounter here looks worn down, but hungry. You'll have to fight!" — [[Pirate fight (Engi)]]
    flag: "cited:pirate-fight-engi",
    aliases: ["Pirate fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "There must have been rich pickings for pirates around here up until war broke out. The pirate you encounter here looks worn down, but hungry. You'll have to fight!",
    choices: [
      {
        id: "c:pirate-fight-engi:0",
        // Wiki citations:
        // > "Fight a Pirate ship (default rewards)." — [[Pirate fight (Engi)]]
        label: "Fight a Pirate ship",
        // "Fight a Pirate ship (default rewards)."
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  // "Fight a Rebel ship (default rewards)." Rebel fight (Engi) has no choice. Arrival calls this fight. The printed sentence is the card body. unique=false.
  {
    dest: "Rebel fight (Engi)",
    slug: "rebel-fight-engi",
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Rebel fight (Engi)]]
    // > "The rebel fighter here would seem to suggest elements of the rebel fleet are already making incursions on Engi space. You move to engage." — [[Rebel fight (Engi)]]
    flag: "cited:rebel-fight-engi",
    aliases: ["Rebel fight (Engi)"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: "The rebel fighter here would seem to suggest elements of the rebel fleet are already making incursions on Engi space. You move to engage.",
    choices: [
      {
        id: "c:rebel-fight-engi:0",
        // Wiki citations:
        // > "Fight a Rebel ship (default rewards)." — [[Rebel fight (Engi)]]
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
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Confused Mantis]]
    // > "It is unique." — [[Confused Mantis]]
    // > "As soon as you jump into the system, you receive a hail from a nearby civilian Engi vessel. Their Captain appears on your screen: \"Strange bug. Can you assist in debugging?\"" — [[Confused Mantis]]
    flag: "cited:confused-mantis",
    aliases: ["Confused Mantis"],
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    body: 'As soon as you jump into the system, you receive a hail from a nearby civilian Engi vessel. Their Captain appears on your screen: "Strange bug. Can you assist in debugging?"',
    choices: [
      {
        id: "c:confused-mantis:0",
        // Wiki citations:
        // > "Listen to their problem." — [[Confused Mantis]]
        label: "Listen to their problem.",
        // "Listen to their problem."
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:confused-mantis:1",
        // Wiki citations:
        // > "Explain that you can't do any programming and leave." — [[Confused Mantis]]
        // > "Nothing happens." — [[Confused Mantis]]
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
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fugitive]]
    // > "It is unique." — [[Mantis fugitive]]
    // > "You arrive just in time to see an unusually well-armed Engi ship destroying a small pirate craft. A teleporter signal is detected...intruder on deck!" — [[Mantis fugitive]]
    flag: "cited:mantis-fugitive",
    aliases: ["Mantis fugitive"],
    sectors: [
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
    ],
    body: "You arrive just in time to see an unusually well-armed Engi ship destroying a small pirate craft. A teleporter signal is detected...intruder on deck!",
    choices: [
      {
        id: "c:mantis-fugitive:0",
        // Wiki citations:
        // > "Side with the fugitive and fight the Engi ship." — [[Mantis fugitive]]
        label: "Side with the fugitive and fight the Engi ship.",
        // "Side with the fugitive and fight the Engi ship."
        fx: [{ k: "fight", tier: "Engi ship" }],
      },
      {
        id: "c:mantis-fugitive:1",
        // Wiki citations:
        // > "Agree to offer up the Mantis in exchange for a bounty." — [[Mantis fugitive]]
        label: "Agree to offer up the Mantis in exchange for a bounty.",
        // "Agree to offer up the Mantis in exchange for a bounty."
        fx: [{ k: "note", text: "High scrap, hull and fire, or a boarder and an Engi ship." }],
      },
    ],
  },
];
