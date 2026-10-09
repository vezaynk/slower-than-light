/**
 * Opening choices that state one amount, one hull number, or one named fight.
 * A choice with several possible results is omitted. Blue options, crew, map
 * reveals, upgrades, and unnamed items are not granted.
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
  /** "Fight a Mantis Ship (default rewards)." Mantis fight has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Mantis fight",
    slug: "mantis-fight",
    flag: "cited:mantis-fight",
    aliases: ["Mantis fight"],
    sectors: ["Civilian Sector", "Mantis Controlled Sector", "Mantis Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight:0",
        label: "Fight a Mantis ship",
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  /** "Fight a Mantis ship (default rewards)." Mantis fight in nebula has no choice. Arrival calls this fight. nebula=true. unique=false. */
  {
    dest: "Mantis fight in nebula",
    slug: "mantis-fight-in-nebula",
    flag: "cited:mantis-fight-in-nebula",
    aliases: ["Mantis fight in nebula"],
    sectors: ["Civilian Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:mantis-fight-in-nebula:0",
        label: "Fight a Mantis ship",
        fx: [{ k: "fight", tier: "Mantis ship" }],
      },
    ],
  },
  /** "Fight the Pirate ship with your Engines limited to level 1." */
  {
    dest: "Pirate engine hacker",
    slug: "pirate-engine-hacker",
    flag: "cited:pirate-engine-hacker",
    aliases: ["Pirate engine hacker"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "Once you arrive, your screen lights up with warnings. A nearby pirate seems to have advanced hacking tools and they have tried to shut down our engines. Your crew manages to keep them operational and you move in to attack.",
    choices: [
      {
        id: "c:pirate-engine-hacker:0",
        label: "Continue",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-engine-hacker:1",
        label: "Counter the remote hacking.",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Pirate fight",
    slug: "pirate-fight",
    flag: "cited:pirate-fight",
    aliases: ["Pirate fight"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-fight:0",
        label: "Fight a Pirate ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." Pirate fight (Lanius) has no choice. Arrival calls this fight. unique=false. */
  {
    dest: "Pirate fight (Lanius)",
    slug: "pirate-fight-lanius",
    flag: "cited:pirate-fight-lanius",
    aliases: ["Pirate fight (Lanius)"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-lanius:0",
        label: "Fight a Pirate ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /**
   * "Fight a Pirate ship (default rewards)." Pirate fight in asteroid field has no choice.
   * Arrival calls this fight. The wait sentence is the card body. asteroidfield=true. unique=false.
   */
  {
    dest: "Pirate fight in asteroid field",
    slug: "pirate-fight-in-asteroid-field",
    flag: "cited:pirate-fight-in-asteroid-field",
    aliases: ["Pirate fight in asteroid field"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "A pirate ship was lying in wait inside this asteroid field. It immediately moves in to attack.",
    choices: [
      {
        id: "c:pirate-fight-in-asteroid-field:0",
        label: "Turn and fight",
        fx: [{ k: "fight", tier: "Pirate ship", asteroid: true }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." */
  {
    dest: "Pirate fight near pulsar",
    slug: "pirate-fight-near-pulsar",
    flag: "cited:pirate-fight-near-pulsar",
    aliases: ["Pirate fight near pulsar"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-fight-near-pulsar:0",
        label: "Fight a Pirate ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." */
  {
    dest: "Pirate fight near sun",
    slug: "pirate-fight-near-sun",
    flag: "cited:pirate-fight-near-sun",
    aliases: ["Pirate fight near sun"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: "This beacon has been placed too close to a super-giant class M star! The ship will gradually overheat until you get out of here... or die. A pirate, apparently oblivious to the danger of the sun, moves in to engage.",
    choices: [
      {
        id: "c:pirate-fight-near-sun:0",
        label: "Fight a Pirate ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "You power up your weapons and engage the pirate ship." */
  {
    dest: "Pirate ship attacking civilian",
    slug: "pirate-ship-attacking-civilian",
    flag: "cited:pirate-ship-attacking-civilian",
    aliases: ["Pirate ship attacking civilian"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-ship-attacking-civilian:0",
        label: "Aid the civilian ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-ship-attacking-civilian:1",
        label: "Stay out of it",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "Fight a Pirate ship (default rewards)." */
  {
    dest: "Pirate ship distress trap",
    slug: "pirate-ship-distress-trap",
    flag: "cited:pirate-ship-distress-trap",
    aliases: ["Pirate ship distress trap"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:pirate-ship-distress-trap:0",
        label: "Fight a Pirate ship",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight the pirate ship." */
  {
    dest: "Pirate smuggler",
    slug: "pirate-smuggler",
    flag: "cited:pirate-smuggler",
    aliases: ["Pirate smuggler"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: "",
    choices: [
      {
        id: "c:pirate-smuggler:0",
        label: "Attack the pirate",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:pirate-smuggler:1",
        label: "Ignore the ship",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "Pay their toll." [15-25 scrap]. "You avoid the fight."
   * "Reject their 'offer'." "Fight a Pirate ship (default rewards)."
   */
  {
    dest: "Pirate toll",
    slug: "pirate-toll",
    flag: "cited:pirate-toll",
    aliases: ["Pirate toll"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
    ],
    body: `Upon completing your jump, you receive a message from a nearby ship. "Greetings and welcome to our beacon! For a small fee, we'll let you continue on your way."`,
    choices: [
      {
        id: "c:pirate-toll:0",
        label: "Pay their toll",
        fx: [{ k: "res", id: "scrap", sign: -1, lo: 15, hi: 25 }],
      },
      {
        id: "c:pirate-toll:1",
        label: "Reject their offer",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." */
  {
    dest: "Rebel fight",
    slug: "rebel-fight",
    flag: "cited:rebel-fight",
    aliases: ["Rebel fight"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "The Last Stand",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight:0",
        label: "Fight a Rebel ship",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." */
  {
    dest: "Rebel fight (Lanius)",
    slug: "rebel-fight-lanius",
    flag: "cited:rebel-fight-lanius",
    aliases: ["Rebel fight (Lanius)"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-lanius:0",
        label: "Fight a Rebel ship",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Attack the ship." "Fight a Rebel ship (default rewards)." */
  {
    dest: "Rebel fight choice in nebula",
    slug: "rebel-fight-choice-in-nebula",
    flag: "cited:rebel-fight-choice-in-nebula",
    aliases: ["Rebel fight choice in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "Your ship emerges quite far away from the beacon. You see a rebel ship waiting nearby, undoubtedly stationed to look for you.",
    choices: [
      {
        id: "c:rebel-fight-choice-in-nebula:0",
        label: "Attack the ship",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
      {
        id: "c:rebel-fight-choice-in-nebula:1",
        label: "Attempt to remain concealed",
        // Three results, no odds. INFERRED: equal. The caught branch opens the follow-up. quests.ts.
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:rebel-fight-choice-in-nebula:2",
        label: "Cloak to stay hidden.",
        // Cloaking. "Nothing happens." quests.ts.
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." */
  {
    dest: "Rebel fight in nebula",
    slug: "rebel-fight-in-nebula",
    flag: "cited:rebel-fight-in-nebula",
    aliases: ["Rebel fight in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-in-nebula:0",
        label: "Fight a Rebel ship",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Rebel ship (default rewards)." */
  {
    dest: "Rebel fight near pulsar",
    slug: "rebel-fight-near-pulsar",
    flag: "cited:rebel-fight-near-pulsar",
    aliases: ["Rebel fight near pulsar"],
    sectors: [
      "Civilian Sector",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:rebel-fight-near-pulsar:0",
        label: "Fight a Rebel ship",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** Rebel ship warning has no choice. Arrival applies this fight. "Fight a Rebel ship that is running away." unique=true. */
  {
    dest: "Rebel ship warning",
    slug: "rebel-ship-warning",
    flag: "cited:rebel-ship-warning",
    aliases: ["Rebel ship warning"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
    ],
    body: "You stumble across a forward scout of the Rebel fleet.",
    choices: [
      {
        id: "c:rebel-ship-warning:0",
        label: "Fight a Rebel ship that is running away",
        fx: [{ k: "fight", tier: "Rebel ship" }],
      },
    ],
  },
  /** "Fight a Lanius ship." */
  {
    dest: "Refueling platform garbled broadcast",
    slug: "refueling-platform-garbled-broadcast",
    flag: "cited:refueling-platform-garbled-broadcast",
    aliases: ["Refueling platform garbled broadcast"],
    sectors: ["Abandoned Sector"],
    body: "You detect a refueling platform near the beacon, although its broadcast signal is garbled, and you can't make out the message.",
    choices: [
      {
        id: "c:refueling-platform-garbled-broadcast:0",
        label: "Hail the platform and attempt to communicate",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:refueling-platform-garbled-broadcast:1",
        label: "Ignore the platform",
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:refueling-platform-garbled-broadcast:2",
        label: "Dock with the platform",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "Fight the pirate ship." */
  {
    dest: "Remote settlement",
    slug: "remote-settlement",
    flag: "cited:remote-settlement",
    aliases: ["Remote settlement"],
    sectors: ["Civilian Sector"],
    body: `Scans show a remote settlement being blockaded by a pirate ship. The ship hastily messages you, "Stay out of this, or you'll be next!...Concentrate fire on..."`,
    choices: [
      {
        id: "c:remote-settlement:0",
        label: "Attack the pirate",
        fx: [{ k: "fight", tier: "Pirate ship" }],
      },
      {
        id: "c:remote-settlement:1",
        label: "Ignore them",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "Repair 20 damage." [40 scrap]. "Your ship receives 20 repairs."
   * "Repair 10 damage." [20 scrap]. "Your ship receives 10 repairs."
   * "Repair 5 damage." [10 scrap]. "Your ship receives 5 repairs."
   */
  {
    dest: "Repair station",
    slug: "repair-station",
    flag: "cited:repair-station",
    aliases: ["Repair station"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Hidden Crystal Worlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: `You see a small station fitted with hundreds of Repair drones. You receive an automated message, "We don't know who you are and we don't care, but this is the right place for some ship repair!"`,
    choices: [
      {
        id: "c:repair-station:0",
        label: "Repair 20 damage for 40 scrap",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 40, hi: 40 },
          { k: "hull", n: 20 },
          { k: "note", text: "\"Thank you for your business, no refunds!\"" },
        ],
      },
      {
        id: "c:repair-station:1",
        label: "Repair 10 damage for 20 scrap",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 20, hi: 20 },
          { k: "hull", n: 10 },
          { k: "note", text: "\"Thank you for your business, no refunds!\"" },
        ],
      },
      {
        id: "c:repair-station:2",
        label: "Repair 5 damage for 10 scrap",
        fx: [
          { k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 },
          { k: "hull", n: 5 },
          { k: "note", text: "\"Thank you for your business, no refunds!\"" },
        ],
      },
      {
        id: "c:repair-station:3",
        label: "Ignore the station",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /** "You lose 2-4 fuel and receive 1-3 drones." */
  {
    dest: "Trade fuel for drone parts",
    slug: "trade-fuel-for-drone-parts",
    flag: "cited:trade-fuel-for-drone-parts",
    aliases: ["Trade fuel for drone parts"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-fuel-for-drone-parts:0",
        label: "Trade 2-4 fuel for 1-3 drone parts",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "parts", sign: 1, lo: 1, hi: 3 },
        ],
      },
      {
        id: "c:trade-fuel-for-drone-parts:1",
        label: "Reject their offer",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "You lose 1-2 drones and receive 5-10 fuel."
   * "You lose 1-2 fuel and receive 4-5 missiles."
   * "You lose 2-3 missiles and receive 2-3 drones."
   * "You lose 2-4 missiles and receive 4-10 fuel."
   */
  {
    dest: "Trade resources",
    slug: "trade-resources",
    flag: "cited:trade-resources",
    aliases: ["Trade resources"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Mantis Controlled Sector",
      "Mantis Homeworlds",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Rock Controlled Sector",
      "Rock Homeworlds",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-resources:0",
        label: "Trade 1-2 drone parts for 5-10 fuel",
        fx: [
          { k: "res", id: "parts", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "fuel", sign: 1, lo: 5, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources:1",
        label: "Trade 1-2 fuel for 4-5 missiles",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "missiles", sign: 1, lo: 4, hi: 5 },
        ],
      },
      {
        id: "c:trade-resources:2",
        label: "Trade 2-3 missiles for 2-3 drone parts",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 3 },
          { k: "res", id: "parts", sign: 1, lo: 2, hi: 3 },
        ],
      },
      {
        id: "c:trade-resources:3",
        label: "Trade 2-4 missiles for 4-10 fuel",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "fuel", sign: 1, lo: 4, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources:4",
        label: "Ignore",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  /**
   * "You lose 1-2 drones and receive 5-10 fuel."
   * "You lose 1-2 fuel and receive 4-5 missiles."
   * "You lose 2-3 missiles and receive 2-3 drones."
   * "You lose 2-4 missiles and receive 4-10 fuel."
   */
  {
    dest: "Trade resources in nebula",
    slug: "trade-resources-in-nebula",
    flag: "cited:trade-resources-in-nebula",
    aliases: ["Trade resources in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:trade-resources-in-nebula:0",
        label: "Trade 1-2 drone parts for 5-10 fuel",
        fx: [
          { k: "res", id: "parts", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "fuel", sign: 1, lo: 5, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:1",
        label: "Trade 1-2 fuel for 4-5 missiles",
        fx: [
          { k: "res", id: "fuel", sign: -1, lo: 1, hi: 2 },
          { k: "res", id: "missiles", sign: 1, lo: 4, hi: 5 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:2",
        label: "Trade 2-3 missiles for 2-3 drone parts",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 3 },
          { k: "res", id: "parts", sign: 1, lo: 2, hi: 3 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:3",
        label: "Trade 2-4 missiles for 4-10 fuel",
        fx: [
          { k: "res", id: "missiles", sign: -1, lo: 2, hi: 4 },
          { k: "res", id: "fuel", sign: 1, lo: 4, hi: 10 },
        ],
      },
      {
        id: "c:trade-resources-in-nebula:4",
        label: "Ignore",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
