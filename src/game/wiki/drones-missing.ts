import { tx } from "../../i18n/index.ts";
/**
 * Wiki page "Drone Control", section "Drone Schematics".
 * Schematic headings that are not the eight SwarmKind ids in swarm.ts.
 * Boarding Drone Mark II is not a heading on the page.
 */

export type DroneRow = {
  id: string;
  name: string;
  power: number | null;
  cooldown: string | null;
  note: string;
  source: string;
};

function cite(heading: string): string {
  return tx("wiki.drones-missing.wiki-page-drone-control-section", { heading: heading });
}

/** Printed under Shield Overcharger. The + heading says that schematic is identical except power. */
const OVERCHARGER_COOLDOWN = tx("wiki.drones-missing.8s-10s-13s-16s-20s-for");

export const MISSING_DRONES: DroneRow[] = [
  {
    id: "ionintruder",
    name: tx("wiki.drones-missing.ion-intruder-drone"),
    power: 3,
    cooldown: tx("wiki.drones-missing.pulse-time-varies-between-8-2"),
    note: tx("wiki.drones-missing.periodically-emits-an-ion-blast-that"),
    source: cite(tx("wiki.drones-missing.ion-intruder-drone")),
  },
  {
    id: "combat2",
    name: tx("wiki.drones-missing.combat-drone-mark-ii"),
    power: 4,
    cooldown: null,
    note: tx("wiki.drones-missing.fires-a-laser-blast-that-deals"),
    source: cite(tx("wiki.drones-missing.combat-drone-mark-ii")),
  },
  {
    id: "beam2",
    name: tx("wiki.drones-missing.anti-ship-beam-drone-ii"),
    power: 3,
    cooldown: null,
    note: tx("wiki.drones-missing.a-beam-of-length-40-0"),
    source: cite(tx("wiki.drones-missing.anti-ship-beam-drone-ii")),
  },
  {
    id: "firedrone",
    name: tx("wiki.drones-missing.anti-ship-fire-drone"),
    power: 3,
    cooldown: null,
    note: tx("wiki.drones-missing.a-fire-beam-of-length-10"),
    source: cite(tx("wiki.drones-missing.anti-ship-fire-drone")),
  },
  {
    id: "antipersonnel",
    name: tx("wiki.drones-missing.anti-personnel-drone"),
    power: 2,
    cooldown: null,
    note: tx("wiki.drones-missing.attacks-intruders-dealing-the-same-damage"),
    source: cite(tx("wiki.drones-missing.anti-personnel-drone")),
  },
  {
    id: "overcharger",
    name: tx("wiki.drones-missing.shield-overcharger"),
    power: 3,
    cooldown: OVERCHARGER_COOLDOWN,
    note: tx("wiki.drones-missing.periodically-adds-1-point-of-zoltan"),
    source: cite(tx("wiki.drones-missing.shield-overcharger")),
  },
  {
    id: "overchargerplus",
    name: tx("wiki.drones-missing.shield-overcharger-2"),
    power: 2,
    cooldown: OVERCHARGER_COOLDOWN,
    note: tx("wiki.drones-missing.totally-identical-to-a-regular-shield"),
    source: cite(tx("wiki.drones-missing.shield-overcharger-2")),
  },
];
