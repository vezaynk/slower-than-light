/**
 * Leftover Civilian and Abandoned pages with one stated opening outcome.
 * A choice with several results is left out. Blue options, crew, map reveals,
 * upgrades, and unnamed items are not granted.
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
  // Fight an Auto-ship.
  {
    dest: "Auto-ship fight",
    slug: "auto-ship-fight",
    flag: "cited:auto-ship-fight",
    aliases: ["Auto-ship fight"],
    sectors: [
      "Abandoned Sector",
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:auto-ship-fight:0",
        label: "Fight an Auto-ship",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // Prepare to fight. Fight an Auto-ship.
  {
    dest: "Auto-ship fight in plasma storm",
    slug: "auto-ship-fight-in-plasma-storm",
    flag: "cited:auto-ship-fight-in-plasma-storm",
    aliases: ["Auto-ship fight in plasma storm"],
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
        id: "c:auto-ship-fight-in-plasma-storm:0",
        label: "Prepare to fight",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // Attack the automated ship to get to the storage cache. Fight the Auto-ship.
  {
    dest: "Auto-ship near storage station",
    slug: "auto-ship-near-storage-station",
    flag: "cited:auto-ship-near-storage-station",
    aliases: ["Auto-ship near storage station"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Slug Controlled Nebula",
      "Slug Home Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:auto-ship-near-storage-station:0",
        label: "Attack the automated ship to get to the storage cache",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
      {
        id: "c:auto-ship-near-storage-station:1",
        label: "Avoid provoking the ship",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Fight an Auto-ship that is running away.
  {
    dest: "Auto-ship warning in nebula",
    slug: "auto-ship-warning-in-nebula",
    flag: "cited:auto-ship-warning-in-nebula",
    aliases: ["Auto-ship warning in nebula"],
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
        id: "c:auto-ship-warning-in-nebula:0",
        label: "Fight an Auto-ship that is running away",
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
    ],
  },
  // You receive {{tooltip|low|1-3}} fuel and a quest marker is added to your map.
  {
    dest: "Escort civilians",
    slug: "escort-civilians",
    flag: "cited:escort-civilians",
    aliases: ["Escort civilians"],
    sectors: [
      "Civilian Sector",
      "Engi Controlled Sector",
      "Engi Homeworlds",
      "Pirate Controlled Sector",
      "Rock Controlled Sector",
      "Rock Homeworlds",
    ],
    body: "",
    choices: [
      {
        id: "c:escort-civilians:0",
        label: "Accept",
        fx: [
          { k: "res", id: "fuel", sign: 1, lo: 1, hi: 3 },
          { k: "note", text: "The page's quest marker is not added." },
        ],
      },
      {
        id: "c:escort-civilians:1",
        label: "Decline",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // You receive a weapon with low scrap.
  {
    dest: "Free weapon",
    slug: "free-weapon",
    flag: "cited:free-weapon",
    aliases: ["Free weapon"],
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
    ],
    body: "",
    choices: [
      {
        id: "c:free-weapon:0",
        label: "You receive a weapon with low scrap",
        fx: [
          { k: "tier", tier: "low" },
          { k: "note", text: "The page's item is not added." },
        ],
      },
    ],
  },
  // Fight a Lanius ship.
  {
    dest: "Lanius fight",
    slug: "lanius-fight",
    flag: "cited:lanius-fight",
    aliases: ["Lanius fight"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-fight:0",
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // Fight a Lanius ship.
  {
    dest: "Lanius fight distress",
    slug: "lanius-fight-distress",
    flag: "cited:lanius-fight-distress",
    aliases: ["Lanius fight distress"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-fight-distress:0",
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // Fight a Lanius ship.
  {
    dest: "Lanius fight in asteroid field",
    slug: "lanius-fight-in-asteroid-field",
    flag: "cited:lanius-fight-in-asteroid-field",
    aliases: ["Lanius fight in asteroid field"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-fight-in-asteroid-field:0",
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // Fight a Lanius ship.
  {
    dest: "Lanius fight near pulsar",
    slug: "lanius-fight-near-pulsar",
    flag: "cited:lanius-fight-near-pulsar",
    aliases: ["Lanius fight near pulsar"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-fight-near-pulsar:0",
        label: "Fight a Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // Attack the Lanius ship. Fight a Lanius ship.
  {
    dest: "Lanius lone ship",
    slug: "lanius-lone-ship",
    flag: "cited:lanius-lone-ship",
    aliases: ["Lanius lone ship"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-lone-ship:0",
        label: "Attack the Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-lone-ship:1",
        label: "Stay out of it",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Scan the ship for lifeforms. Fight a Lanius ship.
  {
    dest: "Lanius powered-down ship",
    slug: "lanius-powered-down-ship",
    flag: "cited:lanius-powered-down-ship",
    aliases: ["Lanius powered-down ship"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-powered-down-ship:0",
        label: "Scan the ship for lifeforms",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-powered-down-ship:1",
        label: "Ignore the vessel",
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Attack the Lanius ship. Fight a Lanius ship.
  {
    dest: "Lanius ship attacking Slug",
    slug: "lanius-ship-attacking-slug",
    flag: "cited:lanius-ship-attacking-slug",
    aliases: ["Lanius ship attacking Slug"],
    sectors: ["Abandoned Sector"],
    body: "",
    choices: [
      {
        id: "c:lanius-ship-attacking-slug:0",
        label: "Attack the Lanius ship",
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-ship-attacking-slug:1",
        label: "Leave the Slugs to their fate",
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
