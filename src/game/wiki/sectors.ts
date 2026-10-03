/**
 * Wiki page "Sectors".
 * Each note is a mechanic from that heading. Counts below are the figures
 * printed there, not extra beacon chances. Event outcomes are not filled in.
 */

export type SectorType = {
  id: string;
  name: string;
  group: "civilian" | "hostile" | "nebula" | "hidden" | "last-stand";
  /** Facts copied from that section. No invented beacon odds. */
  notes: string[];
};

export const SECTOR_TYPES: SectorType[] = [
  // wiki page "Sectors", heading "Civilian (Starting) Sector"
  {
    id: "civilian-start",
    name: "Civilian (Starting) Sector",
    group: "civilian",
    notes: [
      "Always and only sector 1. It is not the usual Civilian Sector: fewer stores, items, quests, and nebulas.",
      "The beacon list gives 1-2 stores, 1 quests event, and 0-4 nebula beacons.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Civilian Sector"
  {
    id: "civilian",
    name: "Civilian Sector",
    group: "civilian",
    notes: [
      "Can occur multiple times per game, and it is a different sector from the starting one.",
      "The beacon list gives 2-3 stores, 0-2 quests, and 0-8 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Engi Controlled Sector"
  {
    id: "engi",
    name: "Engi Controlled Sector",
    group: "civilian",
    notes: [
      "Can occur multiple times per game.",
      "The beacon list gives 2-3 stores and 1 quest.",
      "Crew bought or received as a crew-kill reward, common to rare: Engi rarity 1, Human 3, Zoltan 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Engi Homeworlds"
  {
    id: "engi-home",
    name: "Engi Homeworlds",
    group: "civilian",
    notes: [
      "Only once per game, and only at sector 3 or higher.",
      "The beacon list places 1 Engi fleet discussion event, 2-3 stores, and 1 quest.",
      "Crew bought or received as a crew-kill reward, common to rare: Engi rarity 1, Human 3, Zoltan 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Zoltan Controlled Sector"
  {
    id: "zoltan",
    name: "Zoltan Controlled Sector",
    group: "civilian",
    notes: [
      "Can occur multiple times per game.",
      "The beacon list places 1 Zoltan research facility event, 2 stores, 0-1 quests, and 2-6 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Zoltan rarity 1, Human 2, Engi, Mantis, Rockmen, and Slug 3. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Zoltan Homeworlds"
  {
    id: "zoltan-home",
    name: "Zoltan Homeworlds",
    group: "civilian",
    notes: [
      "Only once per game, and only at sector 3 or higher.",
      "The beacon list places 1 Zoltan research facility event, 1 Unarmed Zoltan transport event, 2 stores, 0-1 quests, and 2-6 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Zoltan rarity 1, Human 2, Engi, Mantis, Rockmen, and Slug 3. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Abandoned Sector"
  {
    id: "abandoned",
    name: "Abandoned Sector",
    group: "hostile",
    notes: [
      "Advanced Edition sector. Can occur multiple times per game.",
      "The beacon list gives 2 stores and 0-1 quests.",
      "Crew bought or received as a crew-kill reward, common to rare: Lanius and Human rarity 2, Engi, Mantis, and Rockmen 3, Zoltan and Slug 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Mantis Controlled Sector"
  {
    id: "mantis",
    name: "Mantis Controlled Sector",
    group: "hostile",
    notes: [
      "Can occur multiple times per game.",
      "The beacon list gives 1-2 stores.",
      "Crew bought or received as a crew-kill reward, common to rare: Mantis rarity 1, Human 2, Engi 3, Rockmen 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Mantis Homeworlds"
  {
    id: "mantis-home",
    name: "Mantis Homeworlds",
    group: "hostile",
    notes: [
      "Only once per game, and only at sector 3 or higher.",
      "The beacon list places 1 Legendary thief KazaaakplethKilik event and 1-2 stores.",
      "Crew bought or received as a crew-kill reward, common to rare: Mantis rarity 1, Human 2, Engi 3, Rockmen 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Pirate Controlled Sector"
  {
    id: "pirate",
    name: "Pirate Controlled Sector",
    group: "hostile",
    notes: [
      "Can occur multiple times per game.",
      "The beacon list gives 1-2 stores, 0-1 quests, and 0-5 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Rebel Controlled Sector"
  {
    id: "rebel",
    name: "Rebel Controlled Sector",
    group: "hostile",
    notes: [
      "Can occur multiple times per game.",
      "The beacon list gives 1-2 stores, 0-2 quests, and 0-5 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Rebel Stronghold"
  {
    id: "rebel-stronghold",
    name: "Rebel Stronghold",
    group: "hostile",
    notes: [
      "Only once per game, and only at sector 5 or higher.",
      "The beacon list places 1 Rebel shipyard event, 1-2 stores, 0-2 quests, and 0-5 nebula spaces.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Rock Controlled Sector"
  {
    id: "rock",
    name: "Rock Controlled Sector",
    group: "hostile",
    notes: [
      "Can occur multiple times per game.",
      "Crystal Lockdown Bombs can be found or bought here, at a high rarity (4).",
      "The beacon list gives 2 stores and 0-1 quests.",
      "Crew bought or received as a crew-kill reward, common to rare: Rockmen rarity 1, Human 2, Zoltan 3. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Rock Homeworlds"
  {
    id: "rock-home",
    name: "Rock Homeworlds",
    group: "hostile",
    notes: [
      "Only once per game, and only at sector 5 or higher.",
      "Crystal Lockdown Bombs can be found or bought here, at an average rarity (2).",
      "The beacon list places 1 Ancient device event, 1 Rock war vessel encounter event, 2 stores, and 0-1 quests.",
      "Crew bought or received as a crew-kill reward, common to rare: Rockmen rarity 1, Human 2, Zoltan 3. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Slug Controlled Nebula"
  {
    id: "slug-nebula",
    name: "Slug Controlled Nebula",
    group: "nebula",
    notes: [
      "Can occur multiple times per game, and only at sector 4 or higher.",
      "Visiting a nebula beacon slows the Rebel Fleet by only 20% instead of the regular 50%, because the fleet was prepared for the nebula.",
      "The beacon list gives 0-1 stores and 2 nebula stores.",
      "Crew bought or received as a crew-kill reward, common to rare: Slug and Human rarity 2, Engi, Mantis, Zoltan, and Rockmen 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Slug Home Nebula"
  {
    id: "slug-home",
    name: "Slug Home Nebula",
    group: "nebula",
    notes: [
      "Only once per game, and only at sector 4 or higher.",
      "Visiting a nebula beacon slows the Rebel Fleet by only 20% instead of the regular 50%, because the fleet was prepared for the nebula.",
      "The beacon list places 1 Slug Home Nebula surrender event, 0-1 stores, and 2 nebula stores.",
      "Crew bought or received as a crew-kill reward, common to rare: Slug and Human rarity 2, Engi, Mantis, Zoltan, and Rockmen 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Uncharted Nebula"
  {
    id: "uncharted",
    name: "Uncharted Nebula",
    group: "nebula",
    notes: [
      "Can occur multiple times per game.",
      "Visiting a nebula beacon slows the Rebel Fleet by only 20% instead of the regular 50%, because the fleet was prepared for the nebula.",
      "In normal circumstances the sector has 1-2 stores. Map generation leaves about 0.8% with no stores at all.",
      "The beacon list also shows 0-1 stores and 1 nebula store.",
      "Crew bought or received as a crew-kill reward, common to rare: Human rarity 1, Slug 3, Engi, Mantis, Zoltan, and Rockmen 4. Rarity only affects store assortment probability.",
    ],
  },
  // wiki page "Sectors", heading "Hidden Crystal Worlds"
  {
    id: "crystal-worlds",
    name: "Hidden Crystal Worlds",
    group: "hidden",
    notes: [
      "Only once per game, and only through the Ancient device event. It is not technically part of the map.",
      "It is a standalone sector, separate from Rock Homeworlds. The Rebels keep following you through it.",
      "Exiting sends you to a random sector after the Rock Homeworlds. That next sector may not be connected to the Rock Homeworlds.",
      "Stores and crew-kill rewards offer only crystal weapons, including the Lockdown Bomb. Only Crystal crew can be bought or received as a crew-kill reward.",
      "The beacon list gives 2-3 stores.",
      "Restarting while still in this sector drops the run into a Civilian sector. The exit will not open the sector map, so sector 2 is chosen at random.",
    ],
  },
  // wiki page "Sectors", heading "The Last Stand"
  {
    id: "last-stand",
    name: "The Last Stand",
    group: "last-stand",
    notes: [
      "Always sector 8. As the final sector, it occurs only once.",
      "At the start the ship receives 10 repairs and 10 fuel.",
      "The Rebel Flagship spawns on the right and jumps every two jumps you make. A dotted or solid line shows whether it jumps this turn. Sharing its beacon starts the fight.",
      "The Rebel Fleet does not advance from the left. It overtakes random beacons each turn, marked by flashing red outlines. The Flagship also overtakes the beacon it is on.",
      "The Federation base sits slightly right of centre, and the Flagship jumps toward it. 3 consecutive jumps on the base lose the game.",
      "The base is never overtaken. If the Flagship is forced off, it returns to Federation control. The base acts like an empty beacon.",
      "Waiting is allowed even with fuel, and it advances the Flagship and the flashing beacons. A fight after a wait starts with full FTL charge.",
      "Each repair beacon gives 15 repairs, 22-44 scrap, 5 fuel, 4 missiles, and 5 drones. Each can be used once, and it may be overtaken before you arrive.",
      "The beacon list gives 1 store and 3 repair stations.",
      "Crew bought or received as a reward, common to rare: Human rarity 1, Engi and Mantis 2, Rockmen 3, Zoltan 5. Rarity only affects store assortment probability.",
    ],
  },
];

/**
 * Wiki page "Sectors" does not state a full generation order.
 * Per-heading depth gates are on each sector above; they are not a path.
 */
export const SECTOR_ORDER: null = null;
