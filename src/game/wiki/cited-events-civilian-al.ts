import { tx } from "../../i18n/index.ts";
/**
 * Leftover Civilian and Abandoned pages with one stated opening outcome.
 * A choice with several results is left out. Blue options, crew, map reveals,
 * and upgrades are not granted. An unnamed weapon, augmentation or drone schematic is a random one
 * (Rewards; the "item" fx).
 */

export type CitedFx =
  | { k: "res"; id: "scrap" | "fuel" | "missiles" | "parts"; sign: 1 | -1; lo: number; hi: number }
  | { k: "tier"; tier: "low" | "medium" | "high"; resources?: boolean }
  | { k: "hull"; n: number }
  | { k: "fleet"; n: number; double?: boolean; faster?: boolean; lastStand?: boolean }
  | { k: "fight"; tier: string; asteroid?: boolean }
  | { k: "note"; text: string }
  /** Rewards, "Weapon" / "Augment" / "Drone": a random one the page does not name (bonus-item.ts grantRandomItem). */
  | { k: "item"; item: "weapon" | "augment" | "drone" }
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
  // Auto-ship fight has no choice. Arrival applies this fight.
  // "Fight an Auto-ship." unique=false.
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
        label: tx("wiki.cited-events-civilian-al.fight-an-auto-ship"),
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
    body: tx("wiki.cited-events-civilian-al.you-jump-into-a-sector-of"),
    choices: [
      {
        id: "c:auto-ship-fight-in-plasma-storm:0",
        label: tx("wiki.cited-events-civilian-al.prepare-to-fight"),
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
    body: tx("wiki.cited-events-civilian-al.an-advanced-rebel-automated-ship-remains"),
    choices: [
      {
        id: "c:auto-ship-near-storage-station:0",
        label: tx("wiki.cited-events-civilian-al.attack-the-automated-ship-to-get"),
        fx: [{ k: "fight", tier: "Auto-ship" }],
      },
      {
        id: "c:auto-ship-near-storage-station:1",
        label: tx("wiki.cited-events-civilian-al.avoid-provoking-the-ship"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Auto-ship warning in nebula has no choice. Arrival applies this fight.
  // "Fight an Auto-ship that is running away." unique=true. nebula=true.
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
    body: tx("wiki.cited-events-civilian-al.it-appears-that-an-automated-rebel"),
    choices: [
      {
        id: "c:auto-ship-warning-in-nebula:0",
        label: tx("wiki.cited-events-civilian-al.fight-an-auto-ship-that-is"),
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
        label: tx("wiki.cited-events-civilian-al.accept"),
        fx: [
          { k: "res", id: "fuel", sign: 1, lo: 1, hi: 3 },
          // @agent:quests. The page's quest marker is added after this choice (wiki/quests.ts questAfterCited).
          { k: "nothing" },
        ],
      },
      {
        id: "c:escort-civilians:1",
        label: tx("wiki.cited-events-civilian-al.decline"),
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
        label: tx("wiki.cited-events-civilian-al.you-receive-a-weapon-with-low"),
        fx: [
          { k: "tier", tier: "low" },
          { k: "item", item: "weapon" },
        ],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight has no choice. Arrival calls this fight. One of the eleven printed intros, including the repeated line. unique=false.
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
        label: tx("wiki.cited-events-civilian-al.fight-a-lanius-ship"),
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight distress has no choice. Arrival calls this fight. The printed sentence is the card body. distress=true. unique=true.
  {
    dest: "Lanius fight distress",
    slug: "lanius-fight-distress",
    flag: "cited:lanius-fight-distress",
    aliases: ["Lanius fight distress"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-civilian-al.you-are-too-late-whatever-once"),
    choices: [
      {
        id: "c:lanius-fight-distress:0",
        label: tx("wiki.cited-events-civilian-al.fight-a-lanius-ship"),
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight in asteroid field has no choice. Arrival calls this fight. The printed sentence is the card body. asteroidfield=true. unique=true.
  {
    dest: "Lanius fight in asteroid field",
    slug: "lanius-fight-in-asteroid-field",
    flag: "cited:lanius-fight-in-asteroid-field",
    aliases: ["Lanius fight in asteroid field"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-civilian-al.this-beacon-appears-to-have-been"),
    choices: [
      {
        id: "c:lanius-fight-in-asteroid-field:0",
        label: tx("wiki.cited-events-civilian-al.fight-a-lanius-ship"),
        fx: [{ k: "fight", tier: "Lanius ship", asteroid: true }],
      },
    ],
  },
  // "Fight a Lanius ship (default Lanius rewards)." Lanius fight near pulsar has no choice. Arrival calls this fight. The printed sentence is the card body. pulsar=true. unique=true.
  {
    dest: "Lanius fight near pulsar",
    slug: "lanius-fight-near-pulsar",
    flag: "cited:lanius-fight-near-pulsar",
    aliases: ["Lanius fight near pulsar"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-civilian-al.there-appears-to-be-some-sort"),
    choices: [
      {
        id: "c:lanius-fight-near-pulsar:0",
        label: tx("wiki.cited-events-civilian-al.fight-a-lanius-ship"),
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
    body: tx("wiki.cited-events-civilian-al.you-arrive-at-the-beacon-to"),
    choices: [
      {
        id: "c:lanius-lone-ship:0",
        label: tx("wiki.cited-events-civilian-al.attack-the-lanius-ship"),
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-lone-ship:1",
        label: tx("wiki.cited-events-civilian-al.stay-out-of-it"),
        fx: [{ k: "nothing" }],
      },
      {
        id: "c:lanius-lone-ship:2",
        label: tx("wiki.cited-events-civilian-al.try-to-contact-the-lanius-ship"),
        fx: [{ k: "note", text: tx("wiki.cited-events-civilian-al.continuing-may-open-a-store-start") }],
      },
      {
        id: "c:lanius-lone-ship:3",
        label: tx("wiki.cited-events-civilian-al.try-to-contact-the-ship"),
        fx: [{ k: "note", text: tx("wiki.cited-events-civilian-al.a-lanius-crewmember-opens-a-store") }],
      },
    ],
  },
  // Scan the ship for lifeforms. Fight a Lanius ship. Power weapons and investigate are quest branches.
  {
    dest: "Lanius powered-down ship",
    slug: "lanius-powered-down-ship",
    flag: "cited:lanius-powered-down-ship",
    aliases: ["Lanius powered-down ship"],
    sectors: ["Abandoned Sector"],
    body: tx("wiki.cited-events-civilian-al.you-have-picked-up-a-lanius"),
    choices: [
      {
        id: "c:lanius-powered-down-ship:0",
        label: tx("wiki.cited-events-civilian-al.scan-the-ship-for-lifeforms"),
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-powered-down-ship:1",
        label: tx("wiki.cited-events-civilian-al.power-weapons-to-attack"),
        fx: [{ k: "note", text: tx("wiki.cited-events-civilian-al.they-wake-and-fight-or-stay") }],
      },
      {
        id: "c:lanius-powered-down-ship:2",
        label: tx("wiki.cited-events-civilian-al.investigate-the-vessel"),
        fx: [{ k: "note", text: tx("wiki.cited-events-civilian-al.ignore-strip-the-hull-send-a") }],
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
    body: tx("wiki.cited-events-civilian-al.the-distress-signal-from-this-system"),
    choices: [
      {
        id: "c:lanius-ship-attacking-slug:0",
        label: tx("wiki.cited-events-civilian-al.attack-the-lanius-ship"),
        fx: [{ k: "fight", tier: "Lanius ship" }],
      },
      {
        id: "c:lanius-ship-attacking-slug:1",
        label: tx("wiki.cited-events-civilian-al.leave-the-slugs-to-their-fate"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Boarders: Humans in nebula. The page prints no button. The red line is the outcome, applied on arrival.
  // "2-4 human boarders beam aboard your ship." nebula=true, LRSmap=noship+nebula, unique=true.
  // The page prints three intros; this card uses the first. Not a crew grant. No ship.
  {
    dest: "Boarders: Humans in nebula",
    slug: "boarders-humans-in-nebula",
    flag: "cited:boarders-humans-in-nebula",
    aliases: ["Boarders: Humans in nebula"],
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Uncharted Nebula"],
    body: tx("wiki.cited-events-civilian-al.you-see-a-small-station-nearby"),
    choices: [
      {
        id: "c:boarders-humans-in-nebula:0",
        label: tx("wiki.cited-events-civilian-al.2-4-human-boarders-beam-aboard"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
  // Boarders: rebels in nebula. The page prints no button. The red line is the outcome, applied on arrival.
  // "3-4 human boarders beam aboard your ship." nebula=true, LRSmap=noship+nebula, unique=true.
  // Not a crew grant. No ship.
  {
    dest: "Boarders: rebels in nebula",
    slug: "boarders-rebels-in-nebula",
    flag: "cited:boarders-rebels-in-nebula",
    aliases: ["Boarders: rebels in nebula"],
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    body: tx("wiki.cited-events-civilian-al.there-appear-to-be-a-number"),
    choices: [
      {
        id: "c:boarders-rebels-in-nebula:0",
        label: tx("wiki.cited-events-civilian-al.3-4-human-boarders-beam-aboard"),
        fx: [{ k: "nothing" }],
      },
    ],
  },
];
