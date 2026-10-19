import type { HullDef, HullInstall, HullKitDef } from "./types.ts";

/**
 * What a player ship starts a run with, worked out from its blueprint the way FTL does.
 * A blueprint (`installs`, `crewCounts`, `weapons`, `drones`, `reactor`) carries levels and counts, not powered bars,
 * crew seats, or room names. Everything here is derived, so the stand-in and a real ftl.dat start the same way.
 */
export type StartingFit = {
  /** Main systems and subsystems: [level, powered bars]. */
  systems: Record<string, [number, number]>;
  /** Kit systems (cloaking, drone control, and the rest), at their level and powered bars. */
  kits: Record<string, HullKitDef>;
  /** Starting crew, seated. */
  crew: { kin: string; room: string }[];
};

/** ShipManager's constructor stores 16 fuel for every ship. Blueprints carry none. */
export const START_FUEL = 16;

/** The game's main systems and subsystems, in the order the hangar lists them. Every other installed system is a kit. */
export const SHIP_SYSTEMS = [
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "sensors",
  "pilot",
  "doors",
] as const;

export const KIT_SYSTEMS = [
  "cloaking",
  "teleporter",
  "hacking",
  "drones",
  "mind",
  "clonebay",
  "battery",
  "artillery",
] as const;

/** FTL's system ids (ShipSystem::SystemIdToName). Starting power is handed out in this order. */
const SYSTEM_ORDER = [
  "shields",
  "engines",
  "oxygen",
  "weapons",
  "drones",
  "medbay",
  "pilot",
  "sensors",
  "doors",
  "teleporter",
  "cloaking",
  "artillery",
  "battery",
  "clonebay",
  "mind",
  "hacking",
];

/** Systems that draw no reactor power. ShipSystem's constructor clears their reactor flag. */
const UNPOWERED = new Set(["pilot", "sensors", "doors", "battery"]);

/**
 * Bars a player system starts with, from ShipSystem's constructor: weapons and drone control start off (FTL's
 * tutorial: "You need to power your weapon to fight"), every other reactor system starts at one bar.
 * ShipManager::AddSystem then fills shields to their level.
 */
function startingBars(id: string, level: number): number {
  if (id === "shields") return level;
  if (id === "weapons" || id === "drones") return 0;
  return Math.min(1, level);
}

/**
 * ShipManager::AddInitialCrew seats the player's crew in these systems' rooms, in this order, skipping any the ship
 * does not have. Crew past the last seat go to a random room; here they take the free rooms in index order.
 */
export const SEAT_ORDER = [
  "pilot",
  "engines",
  "weapons",
  "shields",
  "oxygen",
  "sensors",
  "doors",
  "cloaking",
  "medbay",
  "drones",
  "hacking",
  "teleporter",
  "artillery",
];

/** Room name for a room that holds a system, installed or for sale. */
const ROOM_SLUG: Record<string, string> = {
  cloaking: "cloak",
  teleporter: "tele",
  hacking: "hack",
  clonebay: "clone",
};

/**
 * A name for every room in the hull's grid, keyed by room index. A room with a system is `p-<system>`; when two systems
 * share a room (medbay and clone bay), the installed one names it. Every other room is a hall, `p-hall<n>`.
 */
export function roomNames(hull: HullDef): Map<number, string> {
  const names = new Map<number, string>();
  const installs = hull.installs ?? [];
  let halls = 0;
  for (const room of hull.grid?.rooms ?? []) {
    const here = installs.filter((item) => item.room === room.id);
    const named = here.find((item) => item.start) ?? here[0];
    names.set(room.id, named ? roomName(named.id) : `p-hall${halls++}`);
  }
  return names;
}

function roomName(system: string): string {
  return `p-${ROOM_SLUG[system] ?? system}`;
}

/** The installed systems a run starts with. A system the ship can only buy (`start` false) is left out. */
export function startingFit(hull: HullDef): StartingFit {
  const fitted = new Map<string, HullInstall>();
  for (const item of hull.installs ?? []) {
    if (item.start && !fitted.has(item.id)) fitted.set(item.id, item);
  }
  let reactor = hull.reactor;
  const bars = new Map<string, number>();
  for (const id of SYSTEM_ORDER) {
    const item = fitted.get(id);
    if (!item) continue;
    if (UNPOWERED.has(id)) continue;
    const want = Math.min(startingBars(id, item.power), Math.max(0, reactor));
    bars.set(id, want);
    reactor -= want;
  }

  const systems: Record<string, [number, number]> = {};
  for (const id of SHIP_SYSTEMS) {
    const item = fitted.get(id);
    if (!item) continue;
    systems[id] = [item.power, UNPOWERED.has(id) ? item.power : (bars.get(id) ?? 0)];
  }

  const kits: Record<string, HullKitDef> = {};
  for (const id of KIT_SYSTEMS) {
    const item = fitted.get(id);
    if (!item) continue;
    const kit: HullKitDef = { level: item.power, power: bars.get(id) ?? 0 };
    if (id === "artillery" && item.weapon) kit.weapon = item.weapon;
    if (id === "drones" && hull.drones?.length) {
      kit.target = hull.drones[0] ?? null;
      kit.loadout = [...hull.drones];
    }
    kits[id] = kit;
  }

  return { systems, kits, crew: seatCrew(hull, fitted) };
}

function seatCrew(hull: HullDef, fitted: Map<string, HullInstall>): StartingFit["crew"] {
  const names = roomNames(hull);
  const seats: string[] = [];
  for (const id of SEAT_ORDER) {
    const item = fitted.get(id);
    if (!item) continue;
    // A blueprint with no room for the system (no layout file) seats in the room the fallback hull names for it.
    const name = item.room == null ? roomName(id) : names.get(item.room);
    if (name && !seats.includes(name)) seats.push(name);
  }
  const spare = [...names.values()].filter((name) => !seats.includes(name));
  const crew: StartingFit["crew"] = [];
  for (const row of hull.crewCounts ?? []) {
    for (let i = 0; i < row.amount; i++) {
      const at = crew.length;
      const room = seats[at] ?? spare[(at - seats.length) % Math.max(1, spare.length)] ?? seats[0];
      if (room) crew.push({ kin: row.class, room });
    }
  }
  return crew;
}
