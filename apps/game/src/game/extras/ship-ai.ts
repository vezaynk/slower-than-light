/**
 * Enemy power allocation, from the xftl reverse-engineering notes (gitlab.com/znixian/xftl, doc/ship-ai,
 * ShipAI::CheckPowerLevels):
 * "First, it turns all systems off, as far as it can (respecting ion power locking, hacking, etc). Next it allocates
 * one power to several systems, in order: Oxygen, Teleporter, Clonebay, Medbay, but only if bHurtCrew is set".
 * "There's then a big loop": "If the ship is hostile and not escaping, power up one weapon", "Next, and also with the
 * hostile-and-not-escaping check, attempt to power up a drone. Then attempt to power up shields, cloaking, and engines,
 * in that order. This loop repeats until no more power was added to any of drones, shields, cloaking, or engines."
 * "Finally, go through each system in this order and try to add as much power to it as possible: Shields, Engines,
 * Oxygen, Weapons, Drone, Medbay, Teleporter, Cloaking, Artillery, Clonebay, Mind Control, Hacking".
 *
 * The pool is the reactor (halved in a plasma storm, Environmental Hazards) plus Backup Battery bars; Zoltan bars sit
 * outside it (sim.ts sparePower). INFERRED: an ionized or hacked system keeps the power it has ("respecting ion power
 * locking, hacking"), and that power still comes out of the pool. The Rebel Flagship keeps its own power code
 * (wiki/flagship-systems.ts).
 */
import { SCHEMATIC_POWER } from "../enemy-gen.ts";
import { weaponDef } from "@stl/pack";
import { kitIonLocked, zoltanBars } from "../sim.ts";
import type { Game, Kit, KitId, Ship, SysId, SystemState } from "../types.ts";
import { stormReactor } from "../wiki/cited-sectors.ts";
import { batteryBonus } from "./index.ts";
import { interruptLeash } from "./leash.ts";
import { hackPulseOn } from "./spike.ts";
import { interruptVeil } from "./veil.ts";

type Slot = { kind: "sys"; id: SysId; box: SystemState } | { kind: "kit"; id: KitId; box: Kit };

const POWERED_KITS: readonly KitId[] = [
  "teleporter",
  "clonebay",
  "drones",
  "cloaking",
  "artillery",
  "mind",
  "hacking",
];

/**
 * Bars reactor power may fill: the undamaged level less the bars Zoltans in the room supply (Zoltans: one bar per
 * Zoltan; sim.ts zoltanBars for systems, the kit.zoltan stamp for subsystems).
 */
function capacity(g: Game, ship: Ship, slot: Slot): number {
  const zoltan =
    slot.kind === "sys" ? zoltanBars(g.crew, ship, "enemy", slot.id) : (slot.box.zoltan ?? 0);
  return Math.max(0, slot.box.level - (slot.box.damage ?? 0) - zoltan);
}

function locked(g: Game, ship: Ship, slot: Slot): boolean {
  if (slot.kind === "sys") return slot.box.ion.length > 0 || hackPulseOn(g, ship, slot.id);
  return kitIonLocked(slot.box) || hackPulseOn(g, ship, slot.id);
}

/**
 * Power each loadout drone needs, first slot first (swarm.ts gives Drone Control bars in that order). A kit with no
 * loadout runs its single fitted target (swarm.ts droneSlots).
 */
function dronePowers(kit: Kit): number[] {
  const list = kit.loadout?.length ? kit.loadout : kit.target ? [kit.target] : [];
  return list.map((kind) => SCHEMATIC_POWER[kind] ?? 1);
}

/** Seconds a weapon has been charging. */
function chargingTime(defId: string, charge: number): number {
  return charge * (weaponDef(defId)?.charge ?? 0);
}

/** Run CheckPowerLevels on the enemy hull. Called each combat tick before weapons charge. */
export function checkEnemyPower(g: Game): void {
  const ship = g.enemy;
  if (!ship || ship.flagship) return;
  const slots: Slot[] = [];
  for (const id of ["shields", "engines", "oxygen", "weapons", "medbay"] as const) {
    const box = ship.systems[id];
    if (box && box.level > 0) slots.push({ kind: "sys", id, box });
  }
  for (const id of POWERED_KITS) {
    const box = ship.kits[id];
    if (box && box.level > 0) slots.push({ kind: "kit", id, box });
  }
  const find = (id: SysId | KitId) => slots.find((s) => s.id === id);

  // "turns all systems off, as far as it can". A locked system keeps its bars.
  const power = new Map<Slot, number>();
  let pool = (ship.storm ? stormReactor(ship.reactor) : ship.reactor) + batteryBonus(ship);
  for (const s of slots) {
    const keep = locked(g, ship, s) ? s.box.power : 0;
    power.set(s, keep);
    pool -= keep;
  }
  const weaponsLocked = (() => {
    const w = find("weapons");
    return !w || locked(g, ship, w);
  })();
  const on = new Set(weaponsLocked ? ship.weapons.filter((w) => w.enabled).map((w) => w.uid) : []);

  const add = (id: SysId | KitId, n = 1): boolean => {
    const s = find(id);
    if (!s || locked(g, ship, s)) return false;
    const have = power.get(s)!;
    if (n <= 0 || pool < n || have + n > capacity(g, ship, s)) return false;
    power.set(s, have + n);
    pool -= n;
    return true;
  };

  /** "power up one weapon": the powered-off weapon "that has been charging for the longest", rounded down as stored. */
  const addWeapon = (): boolean => {
    const sys = find("weapons");
    if (!sys || weaponsLocked) return false;
    let best: (typeof ship.weapons)[number] | null = null;
    let bestTime = -1;
    for (const w of ship.weapons) {
      if (on.has(w.uid)) continue;
      const t = chargingTime(w.defId, w.charge);
      if (t > bestTime) {
        bestTime = Math.floor(t);
        best = w;
      }
    }
    if (!best) return false;
    const need = weaponDef(best.defId)?.power ?? 1;
    if (!add("weapons", need)) return false;
    on.add(best.uid);
    return true;
  };

  /** "power up a drone": the next loadout drone's bars. */
  const addDrone = (): boolean => {
    const s = find("drones");
    if (!s || s.kind !== "kit") return false;
    const have = power.get(s)!;
    let sum = 0;
    for (const p of dronePowers(s.box)) {
      sum += p;
      if (sum > have) return add("drones", sum - have);
    }
    return false;
  };

  // "one power to several systems, in order: Oxygen, Teleporter, Clonebay, Medbay, but only if bHurtCrew is set".
  add("oxygen");
  add("teleporter");
  add("clonebay");
  if (ship.crewAi?.hurt) add("medbay");

  // "If the ship is hostile and not escaping". INFERRED: every fight's enemy is hostile; escaping is a running escape.
  const fighting = !g.enemyEscape?.running;
  for (let guard = 0; guard < 64; guard++) {
    if (fighting) addWeapon();
    let more = false;
    if (fighting && addDrone()) more = true;
    if (add("shields")) more = true;
    if (add("cloaking")) more = true;
    if (add("engines")) more = true;
    if (!more) break;
  }

  // "Finally ... add as much power to it as possible". INFERRED: weapons stop at the first pick that does not fit, as the
  // same longest-charging pick is made again.
  for (const id of [
    "shields",
    "engines",
    "oxygen",
    "weapons",
    "drones",
    "medbay",
    "teleporter",
    "cloaking",
    "artillery",
    "clonebay",
    "mind",
    "hacking",
  ] as const) {
    if (id === "weapons") {
      while (addWeapon());
      continue;
    }
    if (id === "drones") {
      while (addDrone());
      continue;
    }
    while (add(id));
  }

  for (const s of slots) {
    const next = power.get(s)!;
    // A cloak or mind control losing its bars ends, as when a battery runs out (extras/cell.ts shedOverAssigned).
    if (next < s.box.power && s.kind === "kit" && s.id === "cloaking") interruptVeil(s.box, g);
    if (next < s.box.power && s.kind === "kit" && s.id === "mind") interruptLeash(g, s.box);
    s.box.power = next;
  }
  if (!weaponsLocked) for (const w of ship.weapons) w.enabled = on.has(w.uid);
}
