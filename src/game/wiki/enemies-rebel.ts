import { tx } from "../../i18n/index.ts";
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

const REBEL_SOURCE = tx("wiki.enemies-rebel.rebel-ships");
const AUTO_SOURCE = tx("wiki.enemies-rebel.ai-controlled-rebel-ships");

const PICTURE = tx("wiki.enemies-rebel.positions-are-a-picture-not-copied");

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
  return tx("wiki.enemies-rebel.are-a-shared-pool-not-a", { label: label, join: names.join("; ") });
}

const rebelArms = pool(tx("wiki.enemies-rebel.weapons"), REBEL_WEAPONS);
const rebelDrones = pool(tx("wiki.enemies-rebel.drones-for-ships-with-drone-control"), REBEL_DRONES);
const autoArms = pool(tx("wiki.enemies-rebel.weapons"), AUTO_WEAPONS);
const autoDrones = pool(tx("wiki.enemies-rebel.drones-for-ships-with-drone-control"), AUTO_DRONES);

const noDrones = tx("wiki.enemies-rebel.drone-control-is-not-in-this");

const rebelCommon = [
  tx("wiki.enemies-rebel.ordinary-rebel-ships-are-only-crewed"),
  tx("wiki.enemies-rebel.rebel-ships-are-likely-to-offer"),
  tx("wiki.enemies-rebel.in-the-rebel-ship-warning-event"),
  rebelArms,
  PICTURE,
];

const autoCommon = [
  tx("wiki.enemies-rebel.automated-ships-are-unmanned-they-have"),
  tx("wiki.enemies-rebel.despite-having-no-crew-automated-ships"),
  tx("wiki.enemies-rebel.fires-one-is-enough-stop-and"),
  tx("wiki.enemies-rebel.because-automated-ships-belong-to-the"),
  autoArms,
  PICTURE,
];

const dangerous =
  tx("wiki.enemies-rebel.rebel-riggers-and-disruptors-are-two");

const eliteClass =
  tx("wiki.enemies-rebel.rebel-elites-are-a-special-class");

export const REBEL_ROWS: EnemyRow[] = [
  {
    id: "rebel-fighter",
    name: tx("wiki.enemies-rebel.rebel-fighter-pirate-fighter"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-5-human-pirate-crew-is"),
    notes: [
      ...rebelCommon,
      tx("wiki.enemies-rebel.hull-10-17-9-16-on"),
      tx("wiki.enemies-rebel.systems-shields-2-8-engines-2"),
      tx("wiki.enemies-rebel.optional-medbay-1-2-crew-teleporter"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.pirate-fighter-is-the-same-heading"),
      tx("wiki.enemies-rebel.blueprint-rebel-skinny-rebel-skinny-p"),
      noDrones,
    ],
  },
  {
    id: "rebel-invader",
    name: tx("wiki.enemies-rebel.rebel-invader-pirate-invader"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-5-human-pirate-crew-is"),
    notes: [
      ...rebelCommon,
      tx("wiki.enemies-rebel.hull-10-17-9-16-on"),
      tx("wiki.enemies-rebel.systems-shields-2-8-engines-2"),
      tx("wiki.enemies-rebel.optional-clone-bay-1-2-crew"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.pirate-invader-is-the-same-heading"),
      tx("wiki.enemies-rebel.blueprint-rebel-skinny-dlc-rebel-skinny"),
      noDrones,
    ],
  },
  {
    id: "rebel-rigger",
    name: tx("wiki.enemies-rebel.rebel-rigger-pirate-rigger"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-4-human-pirate-crew-is"),
    notes: [
      ...rebelCommon,
      tx("wiki.enemies-rebel.hull-9-16-8-15-on"),
      tx("wiki.enemies-rebel.systems-shields-2-8-engines-2-2"),
      tx("wiki.enemies-rebel.optional-medbay-1-3-door-system"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.pirate-rigger-is-the-same-heading"),
      dangerous,
      rebelDrones,
      tx("wiki.enemies-rebel.blueprint-rebel-fat-rebel-fat-p"),
    ],
  },
  {
    id: "rebel-disruptor",
    name: tx("wiki.enemies-rebel.rebel-disruptor-pirate-disruptor"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-4-human-pirate-crew-is"),
    notes: [
      ...rebelCommon,
      tx("wiki.enemies-rebel.hull-9-16-8-15-on"),
      tx("wiki.enemies-rebel.systems-shields-2-8-engines-2-2"),
      tx("wiki.enemies-rebel.optional-clone-bay-1-3-hacking"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.pirate-disruptor-is-the-same-heading"),
      dangerous,
      tx("wiki.enemies-rebel.example-on-the-page-not-a"),
      rebelDrones,
      tx("wiki.enemies-rebel.blueprint-rebel-fat-dlc-rebel-fat"),
    ],
  },
  {
    id: "elite-fighter",
    name: tx("wiki.enemies-rebel.elite-fighter"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-7-human"),
    notes: [
      ...rebelCommon,
      eliteClass,
      tx("wiki.enemies-rebel.hull-14-21-13-20-on"),
      tx("wiki.enemies-rebel.systems-shields-4-8-engines-3"),
      tx("wiki.enemies-rebel.optional-crew-teleporter-1-3"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8-at"),
      tx("wiki.enemies-rebel.a-rebel-elite-fighter-can-also"),
      tx("wiki.enemies-rebel.blueprint-rebel-skinny-elite"),
      noDrones,
    ],
  },
  {
    id: "elite-assault",
    name: tx("wiki.enemies-rebel.elite-assault"),
    source: REBEL_SOURCE,
    crew: tx("wiki.enemies-rebel.3-7-human"),
    notes: [
      ...rebelCommon,
      eliteClass,
      tx("wiki.enemies-rebel.hull-14-21-13-20-on"),
      tx("wiki.enemies-rebel.systems-shields-4-8-engines-3-2"),
      tx("wiki.enemies-rebel.optional-crew-teleporter-1-3"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8-at-2"),
      tx("wiki.enemies-rebel.blueprint-rebel-skinny-elite-dlc"),
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
      tx("wiki.enemies-rebel.hull-6-13-5-12-on"),
      tx("wiki.enemies-rebel.systems-engines-2-8-weapon-control"),
      tx("wiki.enemies-rebel.optional-shields-2-8-cloaking-1"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.blueprint-auto-basic"),
      noDrones,
    ],
  },
  {
    id: "auto-surveyor",
    name: "Auto-Surveyor",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      tx("wiki.enemies-rebel.hull-6-13-5-12-on"),
      tx("wiki.enemies-rebel.systems-engines-2-8-weapon-control"),
      tx("wiki.enemies-rebel.optional-shields-2-8-mind-control"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.blueprint-auto-basic-dlc"),
      noDrones,
    ],
  },
  {
    id: "auto-assault",
    name: "Auto-Assault",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      tx("wiki.enemies-rebel.hull-8-15-7-14-on"),
      tx("wiki.enemies-rebel.systems-shields-2-9-engines-1"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      autoDrones,
      tx("wiki.enemies-rebel.blueprint-auto-assault"),
    ],
  },
  {
    id: "auto-hacker",
    name: "Auto-Hacker",
    source: AUTO_SOURCE,
    notes: [
      ...autoCommon,
      tx("wiki.enemies-rebel.hull-8-15-7-14-on"),
      tx("wiki.enemies-rebel.systems-shields-2-8-engines-1"),
      tx("wiki.enemies-rebel.encountered-in-sectors-1-8"),
      tx("wiki.enemies-rebel.blueprint-auto-assault-dlc"),
      noDrones,
    ],
  },
];
