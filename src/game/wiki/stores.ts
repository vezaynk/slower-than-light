/**
 * wiki page "Stores and resources".
 * Numeric store and resource rules from that page.
 * A null value means the figure is described and not numbered.
 * The page does not describe a sell-back ratio.
 */
export const STORE_RULES: { id: string; source: string; text: string; value: number | null }[] = [
  // wiki page "Stores and resources", heading "Guaranteed stores".
  // The count is determined by sector type and is not numbered.
  {
    id: "guaranteed-store-count",
    source: "Guaranteed stores",
    text: "The number of guaranteed stores is determined by the sector type.",
    value: null,
  },
  // wiki page "Stores and resources", heading "Additional stores".
  // The count sits in an unexpanded template and is not numbered.
  {
    id: "additional-store-count",
    source: "Additional stores",
    text: "Additional stores come from events, and how many depends on the sector.",
    value: null,
  },

  // wiki page "Stores and resources", heading "Store bugs".
  {
    id: "ae-off-weapons",
    source: "Store bugs",
    text: "With Advanced Edition content off, a store might sell only 2 weapons instead of a regular 3.",
    value: 2,
  },
  {
    id: "ae-off-crew",
    source: "Store bugs",
    text: "With Advanced Edition content off, a store might sell only 1 crew instead of a regular 3.",
    value: 1,
  },
  {
    id: "ae-off-regular-count",
    source: "Store bugs",
    text: "A regular store offering is 3 items, which the empty-slot bug can undercut.",
    value: 3,
  },
  {
    id: "main-systems",
    source: "Store bugs",
    text: "With all 8 main systems installed, some system slots in a store can be empty.",
    value: 8,
  },

  // wiki page "Stores and resources", heading "Stores assortment".
  // Missile price is fixed, but the page does not number it.
  {
    id: "missile-price",
    source: "Stores assortment",
    text: "Missile stock varies, but the missile price is fixed.",
    value: null,
  },
  // Drone part price is fixed, but the page does not number it.
  {
    id: "drone-part-price",
    source: "Stores assortment",
    text: "Drone part stock varies, but the drone part price is fixed.",
    value: null,
  },
  // Repair price per hull point varies by sector and is not numbered.
  {
    id: "repair-per-hull",
    source: "Stores assortment",
    text: "The cost of repairing 1 hull point of damage is determined by the sector number.",
    value: null,
  },
  // Stock size is limited and varies, and it is not numbered.
  {
    id: "resource-stock",
    source: "Stores assortment",
    text: "Stores sell limited quantities of fuel, missiles, and drone parts, and that stock varies.",
    value: null,
  },
  {
    id: "assortment-slots-min",
    source: "Stores assortment",
    text: "Stores sell 2-4 slots of systems, weapons, drone schematics, augmentations, and crewmembers.",
    value: 2,
  },
  {
    id: "assortment-slots-max",
    source: "Stores assortment",
    text: "Stores sell 2-4 slots of systems, weapons, drone schematics, augmentations, and crewmembers.",
    value: 4,
  },
  {
    id: "items-per-slot",
    source: "Stores assortment",
    text: "Each slot contains 3 random items or crewmembers of that type.",
    value: 3,
  },

  // wiki page "Stores and resources", heading "Systems".
  {
    id: "systems-offered",
    source: "Systems",
    text: "Stores may sell 3 random systems.",
    value: 3,
  },
  {
    id: "teleporter-slots",
    source: "Systems",
    text: "A bought teleporter always has 2 slots, not 4.",
    value: 2,
  },
  {
    id: "teleporter-not-four",
    source: "Systems",
    text: "A bought teleporter always has 2 slots, not 4.",
    value: 4,
  },
  {
    id: "systems-force-count",
    source: "Systems",
    text: "If a ship has less than 11 systems and subsystems, there is a 50% chance the first store slot is forced to be systems.",
    value: 11,
  },
  {
    id: "systems-force-chance",
    source: "Systems",
    text: "If a ship has less than 11 systems and subsystems, there is a 50% chance the first store slot is forced to be systems.",
    value: 50,
  },

  // wiki page "Stores and resources", heading "Items and crew rarity".
  {
    id: "rarity-common",
    source: "Items and crew rarity",
    text: "Rarity normally goes from 1 to 5, with 1 being common.",
    value: 1,
  },
  {
    id: "rarity-rare",
    source: "Items and crew rarity",
    text: "Rarity normally goes from 1 to 5, with 5 being rare.",
    value: 5,
  },
  {
    id: "rarity-unlisted",
    source: "Items and crew rarity",
    text: "If rarity is set to 0, that item cannot be randomly found in game.",
    value: 0,
  },

  // wiki page "Stores and resources", heading "Crewmembers".
  {
    id: "crew-offered",
    source: "Crewmembers",
    text: "Stores may sell 3 random crew.",
    value: 3,
  },

  // wiki page "Stores and resources", heading "Fuel".
  {
    id: "fuel-store-price",
    source: "Fuel",
    text: "Fuel costs 3 scrap from stores.",
    value: 3,
  },
  {
    id: "fuel-event-price",
    source: "Fuel",
    text: "Fuel costs 2 scrap from refuelling station events.",
    value: 2,
  },
  {
    id: "fuel-per-jump",
    source: "Fuel",
    text: "Each jump between beacons costs 1 fuel, including backtracking.",
    value: 1,
  },
  {
    id: "starting-fuel",
    source: "Fuel",
    text: "All ships start with 16 fuel.",
    value: 16,
  },
  {
    id: "no-fuel-jump",
    source: "Fuel",
    text: "Out of fuel, enemy ships usually jump away after 90 seconds if not stopped.",
    value: 90,
  },
  // The page guesses this threshold and does not give a precise hull value.
  {
    id: "no-fuel-hull-likely",
    source: "Fuel",
    text: "Out of fuel, the anti-stalemate hull threshold is likely below 50%.",
    value: 50,
  },
  {
    id: "no-fuel-hull-low",
    source: "Fuel",
    text: "Out of fuel, that hull threshold is closer to 30-40%.",
    value: 30,
  },
  {
    id: "no-fuel-hull-high",
    source: "Fuel",
    text: "Out of fuel, that hull threshold is closer to 30-40%.",
    value: 40,
  },
  {
    id: "no-fuel-grant",
    source: "Fuel",
    text: "Out of fuel, the anti-stalemate ends the fight by granting 2 fuel.",
    value: 2,
  },
  {
    id: "no-fuel-quiet",
    source: "Fuel",
    text: "Out of fuel, the anti-stalemate waits 1 minute without further hull damage.",
    value: 1,
  },
  {
    id: "no-fuel-boarder",
    source: "Fuel",
    text: "Out of fuel, the anti-stalemate trigger works 60 seconds after an enemy boarder dies.",
    value: 60,
  },

  // wiki page "Stores and resources", heading "Missiles".
  {
    id: "missile-per-shot",
    source: "Missiles",
    text: "Firing a missile or a bomb consumes 1 missile.",
    value: 1,
  },
  {
    id: "explosive-replicator",
    source: "Missiles",
    text: "The Explosive Replicator gives a 50% chance of not consuming a missile.",
    value: 50,
  },

  // wiki page "Stores and resources", heading "Drone parts".
  {
    id: "drone-part-per-deploy",
    source: "Drone parts",
    text: "Each drone deployment costs 1 drone part.",
    value: 1,
  },
];
