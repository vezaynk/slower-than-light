/**
 * Rows from the "Rebel Ships" and "AI-Controlled Rebel Ships" pages.
 * Those sections give hull and system ranges, not one point, so hull, shields,
 * and engines stay unset. Weapon and drone tables are shared pools.
 * Layouts are pictures; coordinates are not written.
 */

export type EnemyRow = {
  id: string;
  name: string;
  source: string;
  /** Numbers present in that ship's section. Omit a key if the section does not state it. */
  hull?: number;
  shields?: number;
  engines?: number;
  weapons?: string[];
  drones?: string[];
  crew?: string;
  notes: string[];
};

const REBEL_SOURCE = "Rebel Ships";
const AUTO_SOURCE = "AI-Controlled Rebel Ships";

const PICTURE = "positions are a picture, not copied.";

const REBEL_WEAPONS = [
  "Basic Laser",
  "Burst Laser Mark I",
  "Burst Laser Mark II",
  "Burst Laser Mark III",
  "Heavy Laser Mark I",
  "Heavy Laser Mark II",
  "Chain Burst Laser (Advanced Edition)",
  "Chain Vulcan (Advanced Edition)",
  "Laser Charger II (Advanced Edition)",
  "Leto Missiles",
  "Artemis Missiles",
  "Hermes Missile",
  "Breach Missiles",
  "Flak Gun I (Advanced Edition)",
  "Flak Gun II (Advanced Edition)",
  "Mini Beam",
  "Halberd Beam",
  "Small Bomb",
] as const;

const REBEL_DRONES = [
  "Combat Drone Mark I",
  "Combat Drone Mark II",
  "Anti-Ship Beam Drone I",
  "Anti-Ship Beam Drone II (Advanced Edition)",
  "Anti-Ship Fire Drone (Advanced Edition)",
  "Defense Drone Mark I",
  "Defense Drone Mark II",
  "Anti-Combat Drone (Advanced Edition)",
  "Shield Overcharger (Advanced Edition)",
  "System Repair Drone",
  "Anti-Personnel Drone",
  "Boarding Drone",
  "Ion Intruder (Advanced Edition)",
] as const;

const AUTO_WEAPONS = [
  "Basic Laser",
  "Burst Laser Mark I",
  "Burst Laser Mark II",
  "Burst Laser Mark III",
  "Heavy Laser Mark I",
  "Heavy Laser Mark II",
  "Chain Burst Laser (Advanced Edition)",
  "Leto Missiles",
  "Artemis Missiles",
  "Hermes Missile",
  "Mini Beam",
  "Halberd Beam",
  "Small Bomb",
  "Fire Bomb",
  "Ion Bomb",
  "Ion Blast",
  "Heavy Ion",
  "Ion Blast Mark II",
  "Ion Charger (Advanced Edition)",
] as const;

const AUTO_DRONES = [
  "Combat Drone Mark I",
  "Combat Drone Mark II",
  "Anti-Ship Beam Drone I",
  "Anti-Ship Beam Drone II (Advanced Edition)",
  "Anti-Ship Fire Drone (Advanced Edition)",
] as const;

function pool(label: string, names: readonly string[]): string {
  return `${label} are a shared pool, not a per-ship loadout: ${names.join("; ")}.`;
}

const rebelArms = pool("Weapons", REBEL_WEAPONS);
const rebelDrones = pool("Drones, for ships with Drone Control", REBEL_DRONES);
const autoArms = pool("Weapons", AUTO_WEAPONS);
const autoDrones = pool("Drones, for ships with Drone Control", AUTO_DRONES);

const noDrones = "Drone Control is not in this section, so the page drone pool is not copied here.";

const rebelCommon = [
  "Ordinary rebel ships are only crewed by humans. This is not true for pirated ships, which can have other races.",
  "Rebel ships are likely to offer a surrender and/or run away after taking damage that exceeds half of their hull.",
  "In the Rebel ship warning event they start charging their FTL drive and double the Rebel Fleet's pursuit if they jump. It takes 40 seconds to escape, regardless of engine level. Destroying piloting or engines, or making the pilot leave the room, delays the escape.",
  rebelArms,
  PICTURE,
];

const autoCommon = [
  "Automated ships are unmanned. They have no oxygen, and they automatically repair systems over time at 1/3 the speed of a human. They cannot repair hull breaches, and as a consequence can never repair a breached system.",
  "Despite having no crew, automated ships get manning bonuses for all their systems. Unlike crewed ships, these bonuses cannot be removed by boarding, passive hacking, ion damage, fires, and breaches by boarding drones. Only damaging the system removes the manning bonus.",
  "Fires (one is enough) stop and reset the repairs in damaged systems.",
  "Because automated ships belong to the Rebels, they may double the fleet pursuit if they escape before you jump in certain events. Automated ships will never begin fleeing mid-battle, and they also never surrender.",
  autoArms,
  PICTURE,
];

const dangerous =
  "Rebel Riggers and Disruptors are two of the most dangerous enemies in the game, especially because they appear in sector 1. They can have up to four drones, although the maximum number of drones is limited by sector progression.";

const eliteClass =
  "Rebel Elites are a special class of ship that almost exclusively appears at beacons overtaken by the Rebel Fleet. They are much stronger than other enemies in the sector. Elites in sector 1 have a minimum of two shields and four or five weapons power, whereas all other enemies have a maximum of one shield and three weapons power. In sector 7 and 8, Elites can have up to 10 power in weapons.";

export const REBEL_ROWS: EnemyRow[] = [
  {
    id: "rebel-fighter",
    name: "Rebel Fighter / Pirate Fighter",
    source: REBEL_SOURCE,
    crew: "3-5 Human (Pirate crew is 3-5 random)",
    notes: [
      ...rebelCommon,
      "Hull: 10-17 (9-16 on Easy).",
      "Systems: Shields 2-8, Engines 2-5, Oxygen 1-2, Weapon Control 2-8, Piloting 1-3.",
      "Optional: Medbay 1-2, Crew Teleporter 1, Door System 1-2 (Pirate Fighter only).",
      "Encountered in sectors 1-8.",
      "Pirate Fighter is the same heading. Door System is marked Pirate Fighter only. Not a second stat block.",
      "Blueprint: REBEL_SKINNY / REBEL_SKINNY_P.",
      noDrones,
    ],
  },
  {
    id: "rebel-invader",
    name: "Rebel Invader / Pirate Invader",
    source: REBEL_SOURCE,
    crew: "3-5 Human (Pirate crew is 3-5 random)",
    notes: [
      ...rebelCommon,
      "Hull: 10-17 (9-16 on Easy).",
      "Systems: Shields 2-8, Engines 2-5, Oxygen 1-2, Weapon Control 2-8, Piloting 1-3.",
      "Optional: Clone Bay 1-2, Crew Teleporter 1, Door System 1-2 (Pirate Invader only).",
      "Encountered in sectors 1-8.",
      "Pirate Invader is the same heading. Door System is marked Pirate Invader only. Not a second stat block.",
      "Blueprint: REBEL_SKINNY_DLC / REBEL_SKINNY_P_DLC.",
      noDrones,
    ],
  },
  {
    id: "rebel-rigger",
    name: "Rebel Rigger / Pirate Rigger",
    source: REBEL_SOURCE,
    crew: "3-4 Human (Pirate crew is 3-4 random)",
    notes: [
      ...rebelCommon,
      "Hull: 9-16 (8-15 on Easy).",
      "Systems: Shields 2-8, Engines 2-4, Oxygen 1-2, Weapon Control 1-6, Drone Control 2-8, Piloting 1-2.",
      "Optional: Medbay 1-3, Door System 1-3.",
      "Encountered in sectors 1-8.",
      "Pirate Rigger is the same heading and is not a second stat block.",
      dangerous,
      rebelDrones,
      "Blueprint: REBEL_FAT / Rebel_FAT_P.",
    ],
  },
  {
    id: "rebel-disruptor",
    name: "Rebel Disruptor / Pirate Disruptor",
    source: REBEL_SOURCE,
    crew: "3-4 Human (Pirate crew is 3-4 random)",
    notes: [
      ...rebelCommon,
      "Hull: 9-16 (8-15 on Easy).",
      "Systems: Shields 2-8, Engines 2-4, Oxygen 1-2, Weapon Control 1-6, Drone Control 2-8, Piloting 1-2.",
      "Optional: Clone Bay 1-3, Hacking 1-2.",
      "Encountered in sectors 1-8.",
      "Pirate Disruptor is the same heading and is not a second stat block.",
      dangerous,
      "Example on the page, not a fixed loadout: a Disruptor that hacks your weapons, with double Heavy Lasers and a Combat Drone, in an asteroid field.",
      rebelDrones,
      "Blueprint: REBEL_FAT_DLC / Rebel_FAT_P_DLC.",
    ],
  },
  {
    id: "elite-fighter",
    name: "Elite Fighter",
    source: REBEL_SOURCE,
    crew: "3-7 Human",
    notes: [
      ...rebelCommon,
      eliteClass,
      "Hull: 14-21 (13-20 on Easy).",
      "Systems: Shields 4-8, Engines 3-5, Medbay 1-3, Oxygen 1-2, Weapon Control 4-10, Piloting 1-3.",
      "Optional: Crew Teleporter 1-3.",
      "Encountered in sectors 1-8, at beacons overtaken by the Rebel Fleet; 1/8 possibility in the Hidden Federation Base/Federation Base Assist sub-event of the Encrypted Federation Signal event.",
      "A Rebel Elite Fighter can also be encountered at the Encrypted Federation Signal quest beacon. The chance is low, and a friendly Anti-Ship Battery assists.",
      "Blueprint: REBEL_SKINNY_ELITE.",
      noDrones,
    ],
  },
  {
    id: "elite-assault",
    name: "Elite Assault",
    source: REBEL_SOURCE,
    crew: "3-7 Human",
    notes: [
      ...rebelCommon,
      eliteClass,
      "Hull: 14-21 (13-20 on Easy).",
      "Systems: Shields 4-8, Engines 3-5, Clone Bay 1-3, Oxygen 1-2, Weapon Control 4-10, Piloting 1-3.",
      "Optional: Crew Teleporter 1-3.",
      "Encountered in sectors 1-8, at beacons overtaken by the Rebel Fleet.",
      "Blueprint: REBEL_SKINNY_ELITE_DLC.",
      noDrones,
    ],
  },
];

export const AUTO_ROWS: EnemyRow[] = [
  {
    id: "auto-scout",
    name: "Auto-Scout",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      "Hull: 6-13 (5-12 on Easy).",
      "Systems: Engines 2-8, Weapon Control 2-8, Piloting 1-2.",
      "Optional: Shields 2-8, Cloaking 1-3.",
      "Encountered in sectors 1-8.",
      "Blueprint: AUTO_BASIC.",
      noDrones,
    ],
  },
  {
    id: "auto-surveyor",
    name: "Auto-Surveyor",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      "Hull: 6-13 (5-12 on Easy).",
      "Systems: Engines 2-8, Weapon Control 2-8, Piloting 1-2.",
      "Optional: Shields 2-8, Mind Control 1-2.",
      "Encountered in sectors 1-8.",
      "Blueprint: AUTO_BASIC_DLC.",
      noDrones,
    ],
  },
  {
    id: "auto-assault",
    name: "Auto-Assault",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      "Hull: 8-15 (7-14 on Easy).",
      "Systems: Shields 2-9, Engines 1-5, Weapon Control 0-6, Drone Control 2-6, Piloting 1-3.",
      "Encountered in sectors 1-8.",
      autoDrones,
      "Blueprint: AUTO_ASSAULT.",
    ],
  },
  {
    id: "auto-hacker",
    name: "Auto-Hacker",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      "Hull: 8-15 (7-14 on Easy).",
      "Systems: Shields 2-8, Engines 1-5, Hacking 1-2, Weapon Control 2-7, Piloting 1-3.",
      "Encountered in sectors 1-8.",
      "Blueprint: AUTO_ASSAULT_DLC.",
      noDrones,
    ],
  },
];
