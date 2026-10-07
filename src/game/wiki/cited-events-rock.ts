/**
 * Rock pages whose opening outcome is one stated amount or one named fight.
 * A choice with several results is left out. Blue options, crew, map reveals,
 * and upgrades are not granted. Boarder counts are not granted except
 * Rock fight with boarders and Rock fight with boarders in asteroid field
 * (citedChoose, after the fight).
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
    dest: "Mantis ship with Rock body parts",
    slug: "mantis-ship-with-rock-body-parts",
    flag: "cited:mantis-ship-with-rock-body-parts",
    aliases: [
      "Mantis ship with Rock body parts",
      "Mantis Ship Rock Body Parts",
      "Mantis Ship Rock body parts",
      "Mantis ship Rock body parts",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "A Mantis ship here is adorned with Rock body parts.",
    choices: [
      {
        id: "c:mantis-ship-with-rock-body-parts:0",
        label: "Attack!",
        fx: [
          // "Fight the Mantis ship (default rewards)."
          { k: "fight", tier: "Mantis ship" },
        ],
      },
      {
        id: "c:mantis-ship-with-rock-body-parts:1",
        label: "Ignore them.",
        fx: [
          // "Nothing happens."
          { k: "nothing" },
        ],
      },
    ],
  },
  {
    dest: "Rock fight",
    slug: "rock-fight",
    flag: "cited:rock-fight",
    aliases: ["Rock fight", "Rock Fight"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight:0",
        label: "Fight a Rock ship",
        fx: [
          // "Fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  {
    dest: "Rock fight in asteroid field",
    slug: "rock-fight-in-asteroid-field",
    flag: "cited:rock-fight-in-asteroid-field",
    aliases: ["Rock fight in asteroid field", "Rock Fight in Asteroid Field"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-in-asteroid-field:0",
        label: "Fight a Rock ship",
        fx: [
          // "Fight a Rock ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock ship", asteroid: true },
        ],
      },
    ],
  },
  {
    dest: "Rock fight with boarders",
    slug: "rock-fight-with-boarders",
    flag: "cited:rock-fight-with-boarders",
    aliases: ["Rock fight with boarders", "Rock Fight With Boarders", "Rock Fight with Boarders"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders:0",
        label: "Fight a Rock ship",
        fx: [
          // "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)."
          { k: "fight", tier: "Rock ship" },
        ],
      },
    ],
  },
  {
    dest: "Rock fight with boarders in asteroid field",
    slug: "rock-fight-with-boarders-in-asteroid-field",
    flag: "cited:rock-fight-with-boarders-in-asteroid-field",
    aliases: [
      "Rock fight with boarders in asteroid field",
      "Rock Fight With Boarders in Asteroid Field",
      "Rock Fight with Boarders in Asteroid Field",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-fight-with-boarders-in-asteroid-field:0",
        label: "Fight a Rock ship",
        fx: [
          // "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock ship", asteroid: true },
        ],
      },
    ],
  },
  {
    dest: "Rock pirates fight",
    slug: "rock-pirates-fight",
    flag: "cited:rock-pirates-fight",
    aliases: ["Rock pirates fight", "Rock Pirate Fight", "Rock pirate fight"],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight:0",
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)."
          { k: "fight", tier: "Rock pirate ship" },
        ],
      },
    ],
  },
  {
    dest: "Rock pirates fight in asteroid field",
    slug: "rock-pirates-fight-in-asteroid-field",
    flag: "cited:rock-pirates-fight-in-asteroid-field",
    aliases: [
      "Rock pirates fight in asteroid field",
      "Rock Pirate in Asteroid Field",
      "Rock pirate fight in asteroid field",
      "Rock pirate in asteroid field",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-in-asteroid-field:0",
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)." Locations: asteroidfield=true.
          { k: "fight", tier: "Rock pirate ship", asteroid: true },
        ],
      },
    ],
  },
  {
    dest: "Rock pirates fight near sun",
    slug: "rock-pirates-fight-near-sun",
    flag: "cited:rock-pirates-fight-near-sun",
    aliases: [
      "Rock pirates fight near sun",
      "Rock Pirate Near Sun",
      "Rock pirate fight near sun",
      "Rock pirate near sun",
    ],
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    body: "",
    choices: [
      {
        id: "c:rock-pirates-fight-near-sun:0",
        label: "Fight a Rock pirate ship",
        fx: [
          // "Fight a Rock pirate ship (default rewards)."
          { k: "fight", tier: "Rock pirate ship" },
        ],
      },
    ],
  },
];
