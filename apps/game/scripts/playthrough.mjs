#!/usr/bin/env node
/**
 * One pinned-seed campaign through the served UI.
 * Playwright clicks and keys only. The page snapshot is read from window.__stl.game().
 * This file does not call the in-page act mutator or any simulation function.
 *
 * The seed below was drawn once (uint32). Later runs replay it.
 */
import { writeSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

console.log = (...args) => writeSync(1, args.map((part) => String(part)).join(" ") + "\n");
console.error = (...args) => writeSync(2, args.map((part) => String(part)).join(" ") + "\n");

const SEED = 1902176094;
const DANGER_RADIUS = 767;
const DANGER_START_X = -959;
const DANGER_STEP_PX = 64;

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const url = arg("--url", process.env.PLAYTHROUGH_URL || "http://127.0.0.1:8080/");
const shot = arg("--shot", "");
const hangarShot = arg("--hangar", "");
const edgeShot = arg("--edge", "");
const launchLog = arg("--launch-log", "");
const maxMs = Number(arg("--max-ms", String(50 * 60 * 1000)));
/** `campaign` plays Easy to a terminal verdict. `hard` stops once the Hard edges are on screen. */
const profile = arg("--profile", "campaign");
/** Hangar hull id. Empty keeps the hangar default (Kestrel A). */
const hullArg = arg("--hull", "");
/** Defects this Hard session fixed. Empty means the session found none. */
const DEFECTS = [];

/**
 * Every hangar layout, in cruiser-page order.
 * `name` is the hull name on the LIST button. `locked` is the clean-profile gate.
 */
export const LAYOUTS = [
  { id: "PLAYER_SHIP_HARD", name: "The Kestrel", letter: "A", locked: false },
  { id: "PLAYER_SHIP_HARD_2", name: "Red-Tail", letter: "B", locked: true },
  { id: "PLAYER_SHIP_HARD_3", name: "The Swallow", letter: "C", locked: true },
  { id: "PLAYER_SHIP_CIRCLE", name: "The Torus", letter: "A", locked: true },
  { id: "PLAYER_SHIP_CIRCLE_2", name: "The Vortex", letter: "B", locked: true },
  { id: "PLAYER_SHIP_CIRCLE_3", name: "Tetragon", letter: "C", locked: true },
  { id: "PLAYER_SHIP_FED", name: "The Osprey", letter: "A", locked: true },
  { id: "PLAYER_SHIP_FED_2", name: "Nisos", letter: "B", locked: true },
  { id: "PLAYER_SHIP_FED_3", name: "The Fregatidae", letter: "C", locked: true },
  { id: "PLAYER_SHIP_ENERGY", name: "The Adjudicator", letter: "A", locked: true },
  { id: "PLAYER_SHIP_ENERGY_2", name: "Noether", letter: "B", locked: true },
  { id: "PLAYER_SHIP_ENERGY_3", name: "Cerenkov", letter: "C", locked: true },
  { id: "PLAYER_SHIP_ANAEROBIC", name: "Kruos", letter: "A", locked: true },
  { id: "PLAYER_SHIP_ANAEROBIC_2", name: "The Shrike", letter: "B", locked: true },
  { id: "PLAYER_SHIP_STEALTH", name: "The Nesasio", letter: "A", locked: true },
  { id: "PLAYER_SHIP_STEALTH_2", name: "DA-SR 12", letter: "B", locked: true },
  { id: "PLAYER_SHIP_STEALTH_3", name: "Simo-H", letter: "C", locked: true },
  { id: "PLAYER_SHIP_ROCK", name: "Bulwark", letter: "A", locked: true },
  { id: "PLAYER_SHIP_ROCK_2", name: "Shivan", letter: "B", locked: true },
  { id: "PLAYER_SHIP_ROCK_3", name: "Tektite", letter: "C", locked: true },
  { id: "PLAYER_SHIP_JELLY", name: "Man of War", letter: "A", locked: true },
  { id: "PLAYER_SHIP_JELLY_2", name: "The Stormwalker", letter: "B", locked: true },
  { id: "PLAYER_SHIP_JELLY_3", name: "Ariolimax", letter: "C", locked: true },
  { id: "PLAYER_SHIP_MANTIS", name: "The Gila Monster", letter: "A", locked: true },
  { id: "PLAYER_SHIP_MANTIS_2", name: "The Basilisk", letter: "B", locked: true },
  { id: "PLAYER_SHIP_MANTIS_3", name: "The Theseus", letter: "C", locked: true },
  { id: "PLAYER_SHIP_CRYSTAL", name: "Bravais", letter: "A", locked: true },
  { id: "PLAYER_SHIP_CRYSTAL_2", name: "Carnelian", letter: "B", locked: true },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssAttr(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function overtaken(fleet, dangerY, beacon) {
  const cx = DANGER_START_X + DANGER_STEP_PX * fleet;
  const cy = dangerY ?? 175;
  const x = beacon.x ?? beacon.col * 110 + 55;
  const y = beacon.y ?? beacon.row * 110 + 55;
  return Math.hypot(x - cx, y - cy) < DANGER_RADIUS;
}

function inFleet(snap, beacon) {
  if (snap.sector >= 8) return false;
  return overtaken(snap.fleet, snap.dangerY, beacon);
}

function pathTo(snap, goalId, avoid) {
  const byId = new Map(snap.beacons.map((b) => [b.id, b]));
  const prev = new Map([[snap.here, null]]);
  const queue = [snap.here];
  while (queue.length) {
    const id = queue.shift();
    if (id === goalId) break;
    const beacon = byId.get(id);
    if (!beacon) continue;
    for (const link of beacon.links) {
      if (prev.has(link)) continue;
      const next = byId.get(link);
      if (!next) continue;
      if (avoid && avoid(next) && next.id !== goalId) continue;
      prev.set(link, id);
      queue.push(link);
    }
  }
  if (!prev.has(goalId)) return null;
  const path = [];
  for (let id = goalId; id != null; id = prev.get(id) ?? null) path.push(id);
  path.reverse();
  return path;
}

function shortest(snap, goals, avoid) {
  let best = null;
  for (const goal of goals) {
    if (!goal || goal === snap.here) continue;
    const path = pathTo(snap, goal, avoid);
    if (path && path.length > 1 && (!best || path.length < best.length)) best = path;
  }
  return best;
}

function hopCount(path) {
  return path && path.length > 1 ? path.length - 1 : Infinity;
}

function pathFrom(snap, fromId, goalId, avoid) {
  return pathTo({ ...snap, here: fromId }, goalId, avoid);
}

const ION_POWER = {
  ION_1: 1,
  ION_STUN: 1,
  ION_2: 2,
  ION_CHARGEGUN: 2,
  ION_4: 3,
  ION_CHAINGUN: 3,
};

/** Bank size. A charger fires the whole bank the moment it has a target, so the cap is the only full volley. */
const CHARGER_CAP = {
  ION_CHARGEGUN: 3,
  LASER_CHARGEGUN_PLAYER: 2,
  LASER_CHARGEGUN: 2,
  LASER_CHARGEGUN_2: 4,
  MISSILE_CHARGEGUN: 3,
};

function chargerCap(defId) {
  return CHARGER_CAP[defId] || 0;
}

function ionBars(weapon) {
  const listed = Number(weapon?.power);
  if (listed > 0) return listed;
  return ION_POWER[weapon?.defId] || (isIonDef(weapon?.defId) ? 2 : 0);
}

/** Ion-only, and the reactor cannot feed oxygen, one engine bar, and the ion together. */
export function ionStarve(snap) {
  const guns = (snap.weapons || []).filter((w) => w.defId);
  if (!guns.length || guns.some((w) => !isIonDef(w.defId))) return false;
  const life = (snap.systems?.oxygen ? 1 : 0) + (snap.systems?.engines ? 1 : 0);
  const need = guns.reduce((n, w) => n + ionBars(w), 0);
  const pool = snap.storm ? Math.ceil((snap.reactor || 0) / 2) : snap.reactor || 0;
  return pool < life + need;
}

/** The ion is mounted and the damaged console cannot feed it. */
function ionFeedShort(snap) {
  if (!ionStarve(snap) || !snap.systems?.weapons) return false;
  const weaponCap = Math.max(
    0,
    (snap.systems.weapons.level || 0) - (snap.systems.weapons.damage || 0),
  );
  const ionNeed = (snap.weapons || [])
    .filter((w) => isIonDef(w.defId))
    .reduce((n, w) => n + ionBars(w), 0);
  return ionNeed > weaponCap;
}

function beamDrone(snap) {
  return (snap.droneIds || []).some(
    (id) => id === "COMBAT_BEAM" || id === "COMBAT_BEAM_2" || id === "fire",
  );
}

/** The beam is flying and the enemy has nothing that stops a swipe. */
export function beamCanCut(snap) {
  if (!snap?.enemy || !snap.droneOn || !beamDrone(snap)) return false;
  if ((snap.dronePower || 0) < Math.max(1, droneBars(snap))) return false;
  if ((snap.enemy.zoltan || 0) > 0) return false;
  if ((snap.enemy.shields || 0) > 0) return false;
  return true;
}

/**
 * Ion guns do no hull damage. A beam that is not cutting, and has not cut for a full
 * extra cycle, will not. One scratch used to freeze the old clock for the rest of the fight.
 * Forty game seconds covers one ion bank and a five-point Zoltan bubble.
 */
function ionBeamStalled(snap, state) {
  if (!snap.enemy || beamCanCut(snap)) return false;
  const guns = snap.weapons || [];
  if (!guns.length || !guns.every((w) => isIonDef(w.defId))) return false;
  if (!beamDrone(snap)) return false;
  if (state?.enemyHullAt == null) return false;
  return snap.time - state.enemyHullAt > 40;
}

/**
 * Manual aim dumps every stored shot. Autofire launches one charge and never banks.
 * Wait while the bank is short. A beam drone cannot cut until the Zoltan bubble is gone,
 * so the ion volley stays stored until that bubble is down and the drone is powered.
 * Returns "wait", "aim", "off", or null when no enabled charger is on the dock.
 */
export function chargerHold(snap) {
  const chargers = (snap.weapons || []).filter((w) => w.enabled && chargerCap(w.defId));
  if (!chargers.length) return null;
  const banking = chargers.some((w) => (w.loaded || 0) < chargerCap(w.defId));
  if (banking) return snap.autofire ? "off" : "wait";
  if (!chargers.some((w) => !w.target)) return null;
  if (beamDrone(snap)) {
    if ((snap.dronePower || 0) < Math.max(1, droneBars(snap))) return "wait";
    if ((snap.enemy?.zoltan || 0) > 0) return "wait";
  }
  return "aim";
}

/** The only armed gun is a charger that is not ready to fire. One ion cannot hold a shield down. */
function chargerFilling(snap) {
  const guns = (snap.weapons || []).filter((w) => w.defId);
  if (guns.some((w) => !chargerCap(w.defId) && w.enabled)) return false;
  const hold = chargerHold(snap);
  return hold === "wait" || hold === "off";
}

export function nextBeacon(snap, state) {
  const avoidFleet = (b) => inFleet(snap, b);
  const avoidHard = (b) =>
    avoidFleet(b) || b.kind === "hostile" || b.kind === "distress" || b.kind === "boss";
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  const crew = playerCrew(snap).length;
  const fuel = snap.fuel || 0;
  const scrap = snap.scrap || 0;
  // A dark gun and a flak-only ship have not fired for the session yet. Stay off hostile beacons.
  const shotReady =
    (snap.weapons || []).some((w) => w.enabled !== false) ||
    (offensiveDrone(snap) && (snap.droneLevel || 0) > 0);
  // One shield bar loses the first fight. A store visit comes before the hunt.
  // An ion can be "on" while the beam is still dark. That shot does not count as ready.
  const needsHull = (snap.weapons || []).some((w) => w.defId && !isIonDef(w.defId));
  const hullReady =
    !needsHull ||
    (snap.weapons || []).some(
      (w) =>
        w.defId &&
        !isIonDef(w.defId) &&
        w.enabled === true &&
        (snap.systems.weapons?.power || 0) >= 1,
    );
  const thin =
    ((snap.systems.shields?.level ?? 2) < 2 && !state.store) || (needsHull && !hullReady);
  const avoid =
    thin || !shotReady || ratio < 0.85 || crew <= 2 || fuel < 5 ? avoidHard : avoidFleet;
  // A 2-bar reactor cannot hold the ion plus life support. Distress still leads to the store.
  // Hostile nodes stay off the chart until that store has been opened, and the ship does not hunt them after.
  const starved = ionStarve(snap);
  const ionWait = starved && !state.store;
  const avoidIon = (b) => avoidFleet(b) || b.kind === "hostile" || b.kind === "boss";
  const routeAvoid = starved ? avoidIon : avoid;
  if (snap.sector >= 8) {
    const bosses = snap.beacons
      .filter((b) => b.kind === "boss" || b.id === snap.ramId)
      .map((b) => b.id);
    return shortest(snap, bosses, null) || shortest(snap, bosses, () => false) || null;
  }
  // Event cards pay scrap without the reward phase. A healthy gunship still needs one ordinary hostile.
  // A flak volley can open the reward phase without tally.shot. The bought gun still has to fire.
  const boardShip =
    (snap.weapons || []).length === 0 &&
    offensiveDrone(snap) &&
    (snap.droneLevel || 0) > 0 &&
    (snap.parts || 0) > 0;
  const needFight =
    (shotReady &&
      (snap.weapons || []).length > 0 &&
      systemUsable(snap, "weapons") &&
      ratio > 0.8 &&
      fuel >= 3 &&
      !thin &&
      hullReady &&
      !starved &&
      (!state.reward || !state.fired)) ||
    (boardShip && ratio > 0.8 && fuel >= 3 && !state.reward && snap.sector < 8);
  if (needFight && snap.sector < 8) {
    const hostiles = snap.beacons
      .filter((b) => !b.visited && b.id !== snap.here && b.kind === "hostile" && !avoidFleet(b))
      .map((b) => b.id);
    const via = shortest(snap, hostiles, avoidFleet);
    if (via) return via;
  }
  if (
    snap.sector <= 2 &&
    snap.reactor < 11 &&
    crew >= 3 &&
    ratio > 0.85 &&
    fuel >= 8 &&
    snap.jumps < 22
  ) {
    const goals = snap.beacons
      .filter(
        (b) =>
          !b.visited &&
          b.id !== snap.here &&
          (b.kind === "empty" || b.kind === "store" || b.kind === "cache") &&
          !avoidFleet(b),
      )
      .sort((a, b) => (a.kind === "store" ? 0 : 1) - (b.kind === "store" ? 0 : 1))
      .map((b) => b.id);
    const via = shortest(snap, goals, routeAvoid);
    if (via) return via;
  }
  const exit = snap.beacons.find((b) => b.kind === "exit");
  // Already on the exit and losing: the chart has nowhere forward to go. Step back to a beacon already cleared.
  if (exit && snap.here === exit.id && ratio < 0.45) {
    const here = snap.beacons.find((b) => b.id === snap.here);
    const back = (here?.links || [])
      .map((id) => snap.beacons.find((b) => b.id === id))
      .filter((b) => b && b.kind !== "boss");
    back.sort((a, b) => Number(!!b.visited) - Number(!!a.visited));
    if (back[0]) return [snap.here, back[0].id];
  }
  const stores = snap.beacons
    .filter((b) => b.kind === "store" && !b.visited && b.id !== snap.here)
    .map((b) => b.id);
  // Still weaponless in a hostile sector. A store reached without a fight can sell the augment for a gun.
  if (
    snap.hullId === "PLAYER_SHIP_CRYSTAL_2" &&
    (snap.weapons || []).length === 0 &&
    !state.reward &&
    !state.fired &&
    snap.sector >= 3 &&
    stores.length
  ) {
    const avoidFight = (b) =>
      avoidFleet(b) ||
      b.kind === "hostile" ||
      b.kind === "boss" ||
      b.kind === "nebula" ||
      b.kind === "distress" ||
      (b.kind === "event" && !b.visited);
    const via = shortest(snap, stores, avoidFight);
    const hops = hopCount(via);
    if (via && hops <= fuel) {
      console.log(`arm via ${via[1]}`);
      return via;
    }
    // The store sits behind an event beacon. Hostile, distress, and nebula nodes stay off this path.
    const loose = shortest(
      snap,
      stores,
      (b) =>
        avoidFleet(b) ||
        b.kind === "hostile" ||
        b.kind === "boss" ||
        b.kind === "nebula" ||
        b.kind === "distress",
    );
    const looseHops = hopCount(loose);
    if (loose && looseHops <= fuel) {
      const chain = loose
        .map((id) => {
          const node = snap.beacons.find((b) => b.id === id);
          return node ? `${node.kind}${node.visited ? "*" : ""}` : id;
        })
        .join(">");
      console.log(`arm via ${loose[1]} (${chain})`);
      return loose;
    }
    if (!state.armReach) {
      state.armReach = true;
      console.log(
        `arm reach ${via ? hops : "none"} loose ${loose ? looseHops : "none"} fuel ${fuel} stores ${stores.length}`,
      );
    }
  }
  // The crew kill paid a 2-power gun. The same store is still ahead, through the event beacons.
  const feedCap = Math.max(
    0,
    (snap.systems?.weapons?.level || 0) - (snap.systems?.weapons?.damage || 0),
  );
  const unfedHeavy =
    snap.hullId === "PLAYER_SHIP_CRYSTAL_2" &&
    state.reward &&
    !state.fired &&
    (snap.weapons || []).some((w) => w.defId === "BEAM_LONG" || w.defId === "LASER_CHARGEGUN") &&
    feedCap < 2;
  if (unfedHeavy && snap.sector < 8 && stores.length) {
    const loose = shortest(
      snap,
      stores,
      (b) =>
        avoidFleet(b) ||
        b.kind === "hostile" ||
        b.kind === "boss" ||
        b.kind === "nebula" ||
        b.kind === "distress",
    );
    const looseHops = hopCount(loose);
    if (loose && looseHops <= fuel) {
      const chain = loose
        .map((id) => {
          const node = snap.beacons.find((b) => b.id === id);
          return node ? `${node.kind}${node.visited ? "*" : ""}` : id;
        })
        .join(">");
      console.log(`feed via ${loose[1]} (${chain})`);
      return loose;
    }
    if (!state.feedReach) {
      state.feedReach = true;
      console.log(`feed reach ${loose ? looseHops : "none"} fuel ${fuel} stores ${stores.length}`);
    }
  }
  // Reward is in. A nebula on the way to the store is a forced fight, and the hull is already down.
  // A boarding ship still needs that store after the crew kill, even at full hull.
  if (
    state.reward &&
    !state.store &&
    (ratio < 0.85 || boardShip) &&
    snap.sector < 8 &&
    stores.length
  ) {
    const avoidNebula = (b) =>
      avoidFleet(b) || b.kind === "hostile" || b.kind === "boss" || b.kind === "nebula";
    const via = shortest(snap, stores, avoidNebula);
    if (via && hopCount(via) <= fuel) return via;
  }
  const weaponCap = Math.max(
    0,
    (snap.systems?.weapons?.level || 0) - (snap.systems?.weapons?.damage || 0),
  );
  const listed = Math.max(
    Number(snap.dockPower) || 0,
    ...(snap.weapons || []).map((w) => (w.defId === "BEAM_LONG" ? 2 : 0)),
  );
  // A Pike beam on a level-1 console cannot fire. The event past this pulsar is a fight.
  const darkGun =
    (snap.weapons || []).length > 0 &&
    !state.fired &&
    listed > weaponCap + (snap.rooms ? weaponZoltan(snap) : 0);
  // The crew kill sometimes pays scrap and no gun. This hull still cannot shoot, and the fresh neighbor is a fight.
  const crystalBare =
    snap.hullId === "PLAYER_SHIP_CRYSTAL_2" &&
    (snap.weapons || []).length === 0 &&
    !state.fired &&
    !!state.reward;
  const retreat = darkGun || crystalBare;
  // The crew kill paid scrap and no gun. Another event from here is a fight this hull cannot shoot.
  if (
    state.reward &&
    !state.fired &&
    ((snap.weapons || []).length === 0 || darkGun) &&
    !offensiveDrone(snap) &&
    ratio < 0.85 &&
    snap.sector < 8 &&
    stores.length
  ) {
    // A fresh event is a fight. A beacon already resolved is just a step back toward the store.
    const avoidEvent = (b) =>
      avoidFleet(b) ||
      b.kind === "hostile" ||
      b.kind === "boss" ||
      b.kind === "nebula" ||
      (b.kind === "event" && !(retreat && b.visited));
    const via = shortest(snap, stores, avoidEvent);
    if (via && hopCount(via) <= fuel) {
      if (retreat) console.log(`retreat via ${via[1]}`);
      return via;
    }
  }
  // No store the fuel can reach without a new fight. Step back through cleared beacons to the exit.
  if (retreat && state.reward && !state.fired && exit && ratio < 0.85 && snap.sector < 8) {
    const avoidFresh = (b) =>
      avoidFleet(b) ||
      b.kind === "hostile" ||
      b.kind === "boss" ||
      b.kind === "distress" ||
      b.kind === "nebula" ||
      (b.kind === "event" && !b.visited);
    const via = pathTo(snap, exit.id, avoidFresh);
    if (via && hopCount(via) <= fuel) {
      console.log(`retreat via ${via[1]}`);
      return via;
    }
    const here = snap.beacons.find((b) => b.id === snap.here);
    const near = (here?.links || [])
      .map((id) => snap.beacons.find((b) => b.id === id))
      .filter(Boolean);
    console.log(
      `retreat neighbors ${near.map((b) => `${b.kind}${b.visited ? ":seen" : ""}`).join(",") || "none"}`,
    );
  }
  const hurt = ratio < 0.6;
  const safeExit = exit ? pathTo(snap, exit.id, ionWait ? avoidIon : avoid) : null;
  const fleetExit = exit ? pathTo(snap, exit.id, avoidFleet) : null;
  const anyExit = exit ? pathTo(snap, exit.id, null) : null;
  // A hurt ship stays off hostile beacons when a safe exit path exists.
  // Before the store, an ion the reactor cannot hold must not fall through onto a hostile hop.
  const exitPath =
    safeExit || (hurt || ionWait ? null : fleetExit || anyExit) || (ionWait ? null : anyExit);
  const exitHops = hopCount(exitPath);
  const canBuy = Math.floor(scrap / 3);
  const repairRate = snap.sector >= 7 ? 4 : snap.sector >= 4 ? 3 : 2;
  const missing = Math.max(0, (snap.hullMax || 0) - (snap.hull || 0));
  const canRepair = missing > 0 && scrap >= repairRate;
  const straight = exit ? fuel - exitHops : fuel;

  // A store detour is worth it only when the fuel bought there still reaches the exit.
  // Scrap that cannot buy a unit of fuel must not pull the ship through another store.
  let bestStore = null;
  let bestScore = -Infinity;
  if ((canBuy > 0 || canRepair) && stores.length) {
    for (const id of stores) {
      const via = shortest(snap, [id], avoid) || (hurt ? null : shortest(snap, [id], avoidFleet));
      const hops = hopCount(via);
      if (!via || hops > fuel) continue;
      const afterBuy = fuel - hops + canBuy;
      let leave = 0;
      if (exit) {
        const back =
          pathFrom(snap, id, exit.id, avoid) ||
          pathFrom(snap, id, exit.id, avoidFleet) ||
          pathFrom(snap, id, exit.id, null);
        leave = hopCount(back);
        if (afterBuy < leave) continue;
      }
      const atExit = afterBuy - leave;
      const gain = atExit - straight;
      // A quarter hull spends the fuel. The repair is the point, and the exit still has to be in range.
      const repairWorth = canRepair && (ratio < 0.35 || (ratio < 0.9 && gain >= 0));
      if (gain <= 0 && !repairWorth) continue;
      if (ratio >= 0.35 && fuel >= exitHops && hops > exitHops + 3) continue;
      const score = gain * 100 - hops;
      if (score > bestScore) {
        bestScore = score;
        bestStore = via;
      }
    }
  }
  // An unvisited event on the way out is a fight. At a quarter hull, a store or an empty neighbor comes first.
  // The same detour applies when the only gun needs a console this ship does not have.
  if (ratio < 0.35 || (darkGun && ratio < 0.85)) {
    const stepId = (bestStore && bestStore[1]) || (exitPath && exitPath[1]);
    const step = stepId ? snap.beacons.find((b) => b.id === stepId) : null;
    if (step && step.kind === "event" && !step.visited) {
      const here = snap.beacons.find((b) => b.id === snap.here);
      const quiet = (here?.links || [])
        .map((id) => snap.beacons.find((b) => b.id === id))
        .filter(
          (b) => b && !b.visited && (b.kind === "store" || b.kind === "empty") && !avoidFleet(b),
        );
      quiet.sort((a, b) => (a.kind === "store" ? 0 : 1) - (b.kind === "store" ? 0 : 1));
      for (const hop of quiet) {
        const rest = exit ? hopCount(pathFrom(snap, hop.id, exit.id, null)) : 0;
        if (fuel - 1 >= rest) return [snap.here, hop.id];
      }
    }
  }
  if (bestStore) return bestStore;

  if (hurt && exitPath && exitPath.length > 1) {
    const next = snap.beacons.find((b) => b.id === exitPath[1]);
    if (next && (next.kind === "hostile" || next.kind === "distress" || next.kind === "boss")) {
      const here = snap.beacons.find((b) => b.id === snap.here);
      const safe = (here?.links || [])
        .map((id) => snap.beacons.find((b) => b.id === id))
        .filter((b) => b && !avoidHard(b));
      safe.sort((a, b) => {
        const rank = (n) =>
          n.kind === "store" ? 0 : n.kind === "empty" || n.kind === "event" ? 1 : 2;
        return rank(a) - rank(b);
      });
      if (safe[0]) {
        const rest = exit ? hopCount(pathFrom(snap, safe[0].id, exit.id, null)) : 0;
        if (fuel - 1 >= rest) return [snap.here, safe[0].id];
      }
    }
  }
  if (exitPath) return exitPath;
  if (hurt) {
    const here = snap.beacons.find((b) => b.id === snap.here);
    const linked = (here?.links || [])
      .map((id) => snap.beacons.find((b) => b.id === id))
      .filter((b) => b && !avoidFleet(b) && b.kind !== "boss");
    const rank = (n) =>
      n.kind === "store"
        ? 0
        : n.kind === "empty" || n.kind === "event" || n.kind === "nebula" || n.kind === "cache"
          ? 1
          : 2;
    linked.sort((a, b) => rank(a) - rank(b));
    const safe = linked.filter((b) => !avoidHard(b));
    if (safe[0]) return [snap.here, safe[0].id];
    // No exit and no quiet neighbor. A hostile hop is the way off a nebula entrance.
    if (linked[0]) return [snap.here, linked[0].id];
  }
  return null;
}

function walksAway(label) {
  return /continue|on your way|leave|walk away|jump|depart|slaver|fight|attack|ship|beacon/.test(
    label,
  );
}

/** A button that starts a fight. Walk-away wording stays false even if it also says "attack". */
export function fightChoice(choice) {
  const label = choice.label.toLowerCase();
  if (
    /ignore|continue|leave|decline|avoid|refuse|stay out|move on|jump away|no thanks|do not|don't|without a fight|no fight|keep your position|charge your ftl|stay hidden|stay near|mind your/.test(
      label,
    )
  ) {
    return false;
  }
  return /fight|attack|engage|hostile|battle|destroy|board|sabotage|steal|kill|raid|ambush|prepare to fight/.test(
    label,
  );
}

export function rankChoice(snap, choice, index) {
  const here = snap.beacons.find((b) => b.id === snap.here);
  const label = choice.label.toLowerCase();
  const id = choice.id.toLowerCase();
  let score = 40;
  if (/surrender/.test(id) && /accept/.test(id + label)) score = 0;
  else if (/surrender/.test(id) || /keep firing/.test(label)) score = 95;
  // Low fuel should accept a fuel trade. It must not turn "Ignore the slaver and continue" into a fight.
  else if ((snap.fuel || 0) <= 3 && /decline|ignore|reject/.test(label) && !walksAway(label))
    score = 90;
  else if (
    (snap.fuel || 0) <= 3 &&
    /pay|trade|gladly|accept/.test(label) &&
    !/attack|fight/.test(label) &&
    !/trade \d|fuel for /.test(label)
  )
    score = 2;
  // A no-fuel distress offer ("missiles for fuel", "emergency fuel") beats refusing it.
  else if (
    (snap.fuel || 0) <= 2 &&
    /fuel/.test(label) &&
    !/attack|fight|refuse|decline|ignore/.test(label) &&
    !/trade \d|fuel for /.test(label)
  )
    score = 1;
  else if (/trade \d|fuel for /.test(label) && (snap.fuel || 0) < 12) score = 85;
  else if (/trap|booby|mine the|explore the asteroid/.test(label)) score = 75;
  else if (
    here?.kind === "exit" &&
    (id.includes("leave") || id.includes("continue") || /leave|continue|jump|depart/.test(label))
  ) {
    score = 0;
  } else if (id === "ack" || id === "fuel-wait-done") score = 1;
  else if (
    /fight|attack|engage|hostile|battle|destroy|board|sabotage|steal|kill|raid|ambush|follow and help|attempt to follow/.test(
      label,
    ) &&
    !/don't|do not|not our|avoid|refuse|decline|no thanks|without a fight|no fight/.test(label)
  ) {
    // "Fend for yourself, attack, and escape" is a fight. The word escape does not make it safe.
    score = 80;
  } else if (
    /continue|leave|ignore|decline|refuse|avoid|nothing|depart|walk away|go back|no thanks|don't|do not|retreat|skip|stay out|leave it|leave them|mind your|not our fight|keep going|move on|jump away|out-run|outrun|stay near|flee|escape|reject|secure|too dangerous|wait for the ftl|keep your position|handle themselves|stay hidden/.test(
      label,
    )
  ) {
    score = 5;
  } else if (
    /accept|surrender|offer|spare|let them live|take the|pay|trade|give them/.test(label)
  ) {
    score = 12;
  } else if (/fight|attack/.test(id)) score = 70;
  return score * 100 + index;
}

function weaponZoltan(snap) {
  const room = roomBySystem(snap, "weapons");
  if (!room) return 0;
  return playerCrew(snap).filter(
    (c) => c.kin === "energy" && c.room === room.id && (c.path || 0) === 0 && (c.hp || 0) > 0,
  ).length;
}

/** Keep enough reactor bars on the gun. A second engine bar must not switch a Glaive off. */
export function holdGunFloor(snap, want) {
  const cost = Number(snap.dockPower) || 0;
  const sys = snap.systems?.weapons;
  if (!want || cost < 1 || !sys) return;
  const cap = Math.max(0, (sys.level || 0) - (sys.damage || 0));
  const zoltan = weaponZoltan(snap);
  // One bar never turns a 2-power gun on. Stealing it from shields makes an odd bubble the click cannot hold.
  if (cap + zoltan < cost) return;
  const floor = Math.min(cap, Math.max(0, cost - zoltan));
  if ((want.weapons || 0) >= floor) return;
  let short = floor - (want.weapons || 0);
  for (const key of ["shields", "medbay", "engines"]) {
    if (short <= 0) break;
    const keep = key === "engines" ? 1 : 0;
    const spare = Math.max(0, (want[key] || 0) - keep);
    const take = Math.min(spare, short);
    want[key] -= take;
    short -= take;
  }
  want.weapons = floor - short;
}

function sparePower(snap) {
  const used = ["shields", "engines", "oxygen", "weapons", "medbay"].reduce(
    (n, id) => n + (snap.systems[id]?.power || 0),
    0,
  );
  const pool = (snap.storm ? Math.ceil(snap.reactor / 2) : snap.reactor) + (snap.batteryBars || 0);
  // Clone bay, hacking, and the other kits draw bars the weapon dock does not show.
  return pool - used - (snap.dronePower || 0) - (snap.kitDraw || 0);
}

function hasDrone(snap) {
  return (snap.droneSlots || 0) > 0 || (snap.droneLevel || 0) > 0;
}

function intruders(snap) {
  return snap.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
}

function playerCrew(snap) {
  return snap.crew.filter(
    (c) => c.side === "player" && c.aboard === "player" && !c.cloning && (c.hp || 0) > 0,
  );
}

function roomBySystem(snap, system) {
  return snap.rooms.find((r) => r.system === system || r.kit === system);
}

/** Level 2 is the first bubble. One damaged bar is the same as none. */
function noBubble(snap) {
  const sys = snap.systems?.shields;
  if (!sys || (sys.level || 0) < 2) return false;
  return Math.max(0, (sys.level || 0) - (sys.damage || 0)) < 2;
}

/** The console can put this gun on. An empty dock, or a 2-power missile on one bar, cannot. */
function gunReachable(snap) {
  const list = snap.weapons || [];
  if (!list.length) return false;
  const need = Number(snap.dockPower) || knownGunPower(snap) || 0;
  if (need <= 0) return true;
  const sys = snap.systems?.weapons;
  const cap = Math.max(0, (sys?.level || 0) - (sys?.damage || 0));
  return cap + weaponZoltan(snap) >= need;
}

/** A mounted gun the console cannot power. Empty hands are not this case. */
function cargoGun(snap) {
  return (snap.weapons || []).length > 0 && !gunReachable(snap);
}

/**
 * Combat with a gun this console cannot feed. Weaponless fights, including the pulsar, stay false.
 * The Pike prints no cost until the power keys read the dock, so its price is named here.
 */
export function unfedFight(snap) {
  if (!snap || snap.phase !== "combat" || !(snap.weapons || []).length) return false;
  const listed = Math.max(
    Number(snap.dockPower) || dockPower || 0,
    ...(snap.weapons || []).map((w) => (w.defId === "BEAM_LONG" ? 2 : 0)),
  );
  if (listed <= 0) return false;
  const sys = snap.systems?.weapons;
  const cap = Math.max(0, (sys?.level || 0) - (sys?.damage || 0));
  return cap + weaponZoltan(snap) < listed;
}

/** After the crew kill, a thin hull still has to cloak and raise a bubble before the next fight. */
function thinCargo(snap) {
  if (!cargoGun(snap) || snap.enemy) return false;
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  if (!Number.isFinite(ratio) || ratio >= 0.5) return false;
  if (playerCrew(snap).length < 2) return false;
  return systemUsable(snap, "oxygen") && systemUsable(snap, "engines");
}

function cloakBroken(snap) {
  const kit = snap.cloak;
  return !!kit && (kit.level || 0) >= 1 && (kit.damage || 0) >= (kit.level || 1);
}

/** A thin hull with no bubble. The next shot is the hull, gun or not. */
function bubbleJumpHold(snap) {
  if (snap.enemy || !noBubble(snap)) return false;
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  if (!Number.isFinite(ratio) || ratio >= 0.5) return false;
  if (playerCrew(snap).length < 2) return false;
  return systemUsable(snap, "oxygen") && systemUsable(snap, "engines");
}

function enemyGunsLive(snap) {
  const guns = (snap.enemyRooms || []).find((r) => r.system === "weapons");
  return !!guns && (guns.level || 1) > (guns.damage || 0);
}

/** A mounted ion that needs more bars than the console has is cargo, not a shot. */
function canShoot(snap) {
  const list = snap.weapons || [];
  if (!list.length) return false;
  const need = Number(snap.dockPower) || 0;
  if (need <= 0) return true;
  const sys = snap.systems?.weapons;
  const cap = Math.max(0, (sys?.level || 0) - (sys?.damage || 0));
  return cap + weaponZoltan(snap) >= need;
}

/** Crew should stand on the pad while an enemy crew is still aboard their own ship. */
export function boardParty(snap) {
  if (!snap?.enemy) return null;
  const roster = (snap?.crew || []).filter((c) => c.side === "player" && (c.hp || 0) > 0);
  // Two crew cannot leave the hull while boarders are already on it. Three can spare a defender.
  if (intruders(snap).length && roster.length < 3) return null;
  const pad = (snap.rooms || []).find((r) => r.kit === "teleporter");
  const tele = snap.tele;
  if (!pad || !tele || (tele.level || 0) < 1) return null;
  if ((tele.damage || 0) >= (tele.level || 1)) return null;
  const foe = (snap.crew || []).some(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  // An auto-scout has no crew. The pad is how a dark gun reaches their weapons.
  if (!foe && (canShoot(snap) || !enemyGunsLive(snap))) return null;
  return pad;
}

/**
 * A weaponless ship on a pulsar waits until the enemy guns are ionized.
 * The cloak also blocks the pad, so the send waits through that too.
 * Ships that can already shoot, and fights off a pulsar, send as soon as the party is ready.
 */
export function waitForIon(snap) {
  if (!snap?.pulsar || canShoot(snap)) return false;
  if (snap.cloak?.on) return true;
  const guns = (snap.enemyRooms || []).find((r) => r.system === "weapons");
  if (!guns) return false;
  if ((guns.level || 1) <= (guns.damage || 0)) return false;
  return (guns.ion || 0) <= 0;
}

/**
 * The pulsar ionizes their guns for one tick. Powering shields on that tick misses the send.
 * Only a weaponless ship on a pulsar takes the pad ahead of the power keys.
 */
export function ionSendFirst(snap) {
  if (!snap?.pulsar || (snap.weapons || []).length) return false;
  if (waitForIon(snap)) return false;
  return boardersReady(snap);
}

/** The whole party has to be on a pad. One crew starts the cooldown and leaves the other behind. */
export function boardersReady(snap) {
  const pad = boardParty(snap);
  if (!pad) return false;
  const crew = playerCrew(snap);
  const roster = (snap.crew || []).filter((c) => c.side === "player" && (c.hp || 0) > 0);
  let stay = null;
  if (roster.length >= 3) {
    const pilot = roomBySystem(snap, "pilot");
    stay =
      crew.find((c) => c.kin === "engi") ||
      (pilot && crew.find((c) => c.room === pilot.id && c.path === 0)) ||
      crew[crew.length - 1];
  }
  const party = crew.filter((c) => c !== stay);
  // The click sends everyone standing on the pad. The pilot has to step off first.
  if (stay && stay.room === pad.id && (stay.path || 0) === 0) return false;
  return party.length > 0 && party.every((c) => c.room === pad.id && c.path === 0 && c.pad);
}

/**
 * Bring boarders home only when the pad can run.
 * A fresh send is still cooling. Healthy crew stay aboard until the fight ends.
 * "home" presses R. "power" gives the pad a bar. "wait" leaves them aboard. Null stays in the fight.
 */
export function boardRecall(snap) {
  const away = (snap?.crew || []).filter(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (!away.length) return null;
  const fightOver = !snap || snap.phase !== "combat" || !snap.enemy;
  const hurt = away.some((c) => (c.maxHp || 0) > 0 && c.hp < c.maxHp * 0.45);
  const tele = snap.tele;
  // A destroyed pad cannot take a bar. Key G only repeats. A cooling pad cannot pull anyone.
  const broken = !!tele && (tele.damage || 0) >= (tele.level || 1);
  // The pulsar is still landing and this pad cannot pull anyone home. Holding the chart here loses the hull.
  if (fightOver && broken && snap.pulsar) return null;
  if ((tele?.cool || 0) > 0 || broken) return "wait";
  // Cloaking refuses the pull. Pressing R only spends the tick while they are still aboard.
  if (snap.cloak?.on) return "wait";
  // Healthy crew finish the ship. A hull dip used to press R and leave the pirate alive.
  // A wounded crystal still comes home. The medbay is the only way they live to board again.
  if (!fightOver && !hurt) return null;
  if (!tele || (tele.power || 0) < 1) return "power";
  const foeAboard = (snap.crew || []).some(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  // A live pad would pull the wounded crystal home and leave their gunners alive.
  if (!fightOver && snap.pulsar && !canShoot(snap) && foeAboard) return null;
  return "home";
}

/**
 * The lockdown coat or the stun ion is on their guns.
 * Sending before either lands lets the gunners walk into the helm.
 */
export function holdForGuns(snap) {
  const ids = (snap?.weapons || []).map((w) => w.defId);
  if (!ids.includes("BOMB_LOCK") || !ids.includes("BOMB_STUN")) return false;
  const weapons = (snap?.enemyRooms || []).find((r) => r.system === "weapons");
  if (!weapons) return false;
  if ((weapons.coat || 0) > 0 || (weapons.ion || 0) > 0) return false;
  const inRoom = (snap?.crew || []).filter(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0 && c.room === weapons.id,
  );
  if (inRoom.length > 0 && inRoom.every((c) => (c.stun || 0) > 0)) return false;
  return true;
}

/** A lockdown or stun bomb has not left the tube. Boarding before it fires skips the only thing that stops their guns. */
export function bombBeforeBoard(snap) {
  const bombs = (snap?.weapons || []).filter((w) => w.defId && isMissileDef(w.defId));
  if (!bombs.length) return false;
  if ((snap.missiles || 0) <= 0) return false;
  if (!systemUsable(snap, "weapons")) return false;
  if ((snap.playerShots || 0) > 0) return false;
  if (!bombs.some((w) => w.enabled) && (snap.systems?.weapons?.power || 0) < 1) return false;
  return true;
}

function pilotSeated(snap) {
  const room = roomBySystem(snap, "pilot");
  if (!room) return true;
  return playerCrew(snap).some((c) => c.room === room.id && c.path === 0);
}

function systemUsable(snap, id) {
  const sys = snap.systems[id];
  if (!sys || sys.level <= 0) return false;
  return sys.damage < sys.level;
}

/** commitJump refuses a destroyed helm or unpowered engines and leaves the chart open. */
function driveReady(snap) {
  return (
    systemUsable(snap, "pilot") &&
    systemUsable(snap, "engines") &&
    pilotSeated(snap) &&
    (snap.systems.engines?.power ?? 0) >= 1
  );
}

/** A Lanius is a standing hole. Oxygen-1 never brings that room back to 85. */
function laniusRoom(snap, roomId) {
  return playerCrew(snap).some((c) => c.room === roomId && c.kin === "anaerobic");
}

/** Stay on this beacon while a system is broken or the air is still thin. The fleet overrides the hold. */
export function shouldHold(snap) {
  if (snap.phase !== "map" || hazard(snap)) return false;
  const here = snap.beacons?.find((b) => b.id === snap.here);
  if (here && inFleet(snap, here)) return false;
  const kind = snap.beaconKind || here?.kind || "";
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  // A hall fire on the sector entrance, or on a nebula, is how the ship dies while the drive sits at full.
  // Pilot, engines, and oxygen still get repaired before the jump. A smashed gun can wait.
  const entrance =
    kind === "nebula" || (kind === "start" && Number.isFinite(snap.hull) && ratio <= 0.55);
  const damaged = (id) => (snap.systems[id]?.damage ?? 0) > 0;
  // A quarter hull dies while the crew finish a smashed gun. Oxygen, the helm, and the drive still wait.
  const urgent = Number.isFinite(ratio) && ratio < 0.25;
  if (["pilot", "oxygen", "engines"].some(damaged)) return true;
  if (!entrance && !urgent && ["weapons", "shields"].some(damaged)) return true;
  // The flak tube is the only gun. Leave it broken and the next fight has nothing to fire.
  if (
    (snap.weapons || []).length === 0 &&
    snap.artillery?.weapon === "ARTILLERY_FED_C" &&
    (snap.artillery?.damage || 0) > 0
  )
    return true;
  const burning = (snap.rooms || []).filter((r) => (r.breach || 0) > 0 || (r.fire || 0) > 0);
  const lifeBurn = burning.some(
    (r) => r.system === "pilot" || r.system === "engines" || r.system === "oxygen",
  );
  if (burning.length && lifeBurn) return true;
  if (burning.length && !entrance && !urgent) return true;
  if (entrance) return false;
  // A quarter hull cannot sit while the tanks refill. Pilot, oxygen, and engines already held above.
  if (urgent) return false;
  if ((snap.o2 ?? 100) >= 85 || !systemUsable(snap, "oxygen")) return false;
  const thin = (snap.rooms || []).filter((r) => (r.o2 ?? 100) < 85);
  if (thin.length > 0 && thin.every((r) => laniusRoom(snap, r.id))) return false;
  return true;
}

/** A full drive leaves a hazard at once. A quiet beacon can still spend a moment on repairs and upgrades. */
export function shouldDepart(snap, fleeing) {
  const here = snap.beacons?.find((b) => b.id === snap.here);
  const kind = snap.beaconKind || here?.kind || "";
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  // Sector entry at half hull, and any nebula beacon, feed a fire the longer the ship waits.
  const leaveSit =
    snap.phase === "map" &&
    (kind === "nebula" ||
      (kind === "start" && Number.isFinite(snap.hull) && ratio <= 0.55) ||
      (Number.isFinite(ratio) && ratio < 0.25));
  // The next beacon is a fight. A smashed cloak on a thin hull is the only dodge, so finish the bar first.
  if (cloakJumpHold(snap)) return false;
  if (bubbleJumpHold(snap)) return false;
  // Swarm Missiles cannot shoot on a level-1 console. Leave once the cloak and the bubble are back.
  if (thinCargo(snap) && (cloakBroken(snap) || noBubble(snap))) return false;
  // A charged drive on a pulsar is not a reason to abandon the boarding party.
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (away) return false;
  const fighting = snap.phase === "combat" && !!snap.enemy;
  return (
    snap.flee >= 1 &&
    driveReady(snap) &&
    !shouldHold(snap) &&
    (fleeing || (!fighting && hazard(snap)) || leaveSit)
  );
}

/** A crystal already standing on a broken cloak. The chair can take someone else. */
function onCloakRepair(snap, crew) {
  if (!crewReadyCloak(snap)) return false;
  const room = (snap.rooms || []).find((r) => r.kit === "cloaking");
  return !!room && (crew.room === room.id || crew.dest === room.id);
}

function onBubbleRepair(snap, crew) {
  if (!bubbleJumpHold(snap)) return false;
  const room = roomBySystem(snap, "shields");
  return !!room && (crew.room === room.id || crew.dest === room.id);
}

/** A crystal already on the cloak, or on the shields once the cloak is whole, stays there. */
export function cargoStick(snap, names, roomId) {
  if (!snap || snap.enemy || snap.phase === "combat") return false;
  if (!thinCargo(snap) || (!cloakBroken(snap) && !noBubble(snap))) return false;
  const room = cloakBroken(snap)
    ? (snap.rooms || []).find((r) => r.kit === "cloaking")
    : roomBySystem(snap, "shields");
  if (!room || room.id === roomId) return false;
  const crew = playerCrew(snap);
  return (names || []).some((name) => {
    const mate = crew.find((c) => c.name === name);
    return !!mate && (mate.room === room.id || mate.dest === room.id);
  });
}

/** A weaponless ship whose cloak is fully broken, with air and engines still able to leave. */
function crewReadyCloak(snap) {
  const kit = snap.cloak;
  if (!kit || (kit.level || 0) < 1 || (kit.damage || 0) < kit.level) return false;
  if ((snap.weapons || []).length > 0) return false;
  if (snap.enemy) return false;
  return systemUsable(snap, "oxygen") && systemUsable(snap, "engines");
}

function cloakJumpHold(snap) {
  if (!crewReadyCloak(snap)) return false;
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  return Number.isFinite(ratio) && ratio < 0.35 && playerCrew(snap).length >= 2;
}

function healing(snap) {
  const room = roomBySystem(snap, "medbay");
  if (!room || (snap.systems.medbay?.level ?? 0) < 1) return false;
  if ((snap.systems.medbay?.power ?? 0) < 1) return false;
  return playerCrew(snap).some((c) => c.room === room.id && c.hp < c.maxHp - 0.5);
}

function hazard(snap) {
  return snap.asteroid || snap.pulsar || snap.flare || snap.asb || intruders(snap).length > 0;
}

function charging(snap) {
  if (snap.flee >= 1) return false;
  if (snap.enemy) return snap.phase === "combat";
  return hazard(snap);
}

function flagshipFight(snap) {
  if (snap.enemy?.flagship) return true;
  if (snap.enemy && /flagship/i.test(snap.enemy.name || "")) return true;
  return false;
}

export function shouldFlee(snap, state) {
  if (flagshipFight(snap)) return false;
  if (snap.sector >= 8 && (snap.beaconKind === "boss" || snap.here === snap.ramId)) return false;
  if ((snap.fuel || 0) <= 0) return false;
  // Shields are already down and the beam is in orbit. Jumping now spends the only damage this hull has.
  if (beamCanCut(snap)) return false;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  // The salvage is already logged. Another fight is how a hurt ship misses the store.
  if (state?.reward && !state.store && snap.enemy && ratio < 0.85) return true;
  // Bombs do not move hull. Jumping spends the boarding party before their crew are dead.
  if (crewBoardWait(snap)) return false;
  // No bubble. Half hull with the shot already logged is the jump that still charges.
  // An enemy on its last two points is the salvage, so that fight stays.
  if (
    snap.enemy &&
    (snap.systems.shields?.level ?? 0) < 1 &&
    state.fired &&
    ratio <= 0.5 &&
    snap.enemy.hull > 2
  )
    return true;
  // The anti-combat drone keeps killing the beam. Another ion volley will not finish the hull.
  if (ionBeamStalled(snap, state)) return true;
  // A smashed console cannot feed the chain laser. Waiting for half hull lets the engines die too.
  const weaponCap = Math.max(
    0,
    (snap.systems.weapons?.level || 0) - (snap.systems.weapons?.damage || 0),
  );
  // The snapshot is read before this tick's power click. The dock cost from the previous click still stands.
  const dock = Number(snap.dockPower) || dockPower || 0;
  if (
    snap.enemy &&
    (snap.weapons || []).length > 0 &&
    dock > 0 &&
    weaponCap + weaponZoltan(snap) < dock &&
    !offensiveDrone(snap) &&
    !flakReady(snap) &&
    !crewFightWait(snap) &&
    snap.enemy.hull > 2
  )
    return true;
  const crew = playerCrew(snap);
  const inDanger = !!snap.enemy || hazard(snap);
  const awayFight = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  // One crew member can still win. Leave only when the hull is thin or nothing aboard can fight.
  // The pilot is the only one home while the crystals are already on the rebel ship.
  if (crew.length <= 1 && inDanger && !awayFight) {
    const guns = systemUsable(snap, "weapons") && (snap.weapons || []).length > 0;
    const drone = offensiveDrone(snap) && (snap.droneLevel || 0) > 0;
    if (ratio < 0.7 || (!guns && !drone)) return true;
  }
  // An ion storm halves the reactor. One bubble is two bars. What remains has to run a 2-bar gun or the laser never punches through.
  if (snap.enemy && snap.storm) {
    const pool = Math.ceil((snap.reactor || 0) / 2);
    const afterBubble = pool - 4;
    if ((snap.systems.shields?.power ?? 0) < 2 || ratio < 0.8 || afterBubble < 2) return true;
  }
  // A merely hurt ship can still win. Leaving at the first scratch chains the next fight.
  // A hull that is already falling stays while a shot can still finish it.
  // A shieldless enemy on its last four points is that finish, even under a quarter of our own hull.
  const winning = !!snap.enemy && state.fightHull != null && snap.enemy.hull <= state.fightHull - 1;
  const finishing =
    winning &&
    (flakReady(snap) ||
      ((snap.weapons || []).some((w) => w.enabled) && systemUsable(snap, "weapons")) ||
      (offensiveDrone(snap) && ((snap.dronePower || 0) >= 1 || !!snap.droneUsed)));
  const exposed = finishing && (snap.enemy?.shields ?? 1) <= 0 && snap.enemy.hull <= 4;
  if (
    ratio < 0.4 &&
    inDanger &&
    !(finishing && ratio >= 0.22) &&
    !exposed &&
    !glaiveYoung(snap, state) &&
    !crewFightWait(snap)
  )
    return true;
  // A beam drone needs a sweep before the enemy hull moves. Six of our own points is not a loss yet.
  const droneReady =
    offensiveDrone(snap) &&
    ((snap.parts || 0) > 0 || snap.droneUsed || (snap.dronePower || 0) >= 1);
  // The burst has not left the tube yet. Six hull points during that charge is not a reason to jump.
  const flakYoung = flakReady(snap) && snap.time - (state.fightAt ?? snap.time) < 70;
  // A one-shot laser never marks hull through a bubble. The bomb has to land first.
  // Half hull is the leave. Above that, six of our own points still waits for the peel.
  if (
    snap.enemy &&
    state.fightPlayer != null &&
    snap.hull <= state.fightPlayer - 6 &&
    snap.enemy.hull >= (state.fightHull ?? snap.enemy.hull) - 1 &&
    !droneReady &&
    !flakYoung &&
    !glaiveYoung(snap, state) &&
    !bombPierceWait(snap, state) &&
    !boardWait(snap) &&
    !crewFightWait(snap)
  ) {
    return true;
  }
  // A scratched crew member can leave a fight that is not moving. A hull that is already falling stays.
  if (
    snap.enemy &&
    crew.some((c) => c.hp < c.maxHp * 0.45) &&
    !crewFightWait(snap) &&
    !(flakReady(snap) || glaiveYoung(snap, state) || (winning && crew.length >= 3))
  )
    return true;
  if (snap.enemy && (snap.o2 ?? 100) < 40 && (snap.systems.oxygen?.power ?? 0) < 1) return true;
  const pool = snap.storm ? Math.ceil(snap.reactor / 2) : snap.reactor;
  if (snap.enemy && snap.storm && snap.sector >= 3 && pool < 6) return true;
  const armed = (snap.weapons || []).some((w) => w.enabled);
  // Unpowered guns at the start of a fight still get a power click. A destroyed system cannot.
  // A drone ship with no weapon system stays: the drone keys still have to land.
  if (
    snap.enemy &&
    !armed &&
    intruders(snap).length === 0 &&
    !systemUsable(snap, "weapons") &&
    !hasDrone(snap) &&
    !crewFightWait(snap)
  )
    return true;
  const gunsReady =
    (systemUsable(snap, "weapons") && armed && (snap.systems.weapons?.power ?? 0) >= 1) ||
    ((snap.weapons || []).length === 0 && hasDrone(snap) && (snap.dronePower || 0) >= 1) ||
    flakReady(snap);
  // A short bank is not a shot yet. Counting those seconds made the ship jump before the volley.
  const filling = chargerFilling(snap);
  if (snap.enemy && gunsReady && !filling) {
    if (state.gunsAt == null) state.gunsAt = snap.time;
  } else state.gunsAt = null;
  // A combat drone needs a moment to launch. An ion gun alone never scratches the hull.
  const droneHelp =
    offensiveDrone(snap) &&
    ((snap.parts || 0) > 0 || snap.droneUsed || (snap.dronePower || 0) >= 2);
  // Heavy Ion does no hull damage. The hull gun beside it needs a full extra cycle.
  // Flak Artillery level 1 charges for 50 game seconds.
  // Bomb charge plus two laser cycles. The no-damage clock used to jump before the bubble fell.
  const quiet = bombPierceWait(snap, state)
    ? 90
    : flakReady(snap)
      ? 70
      : glaiveYoung(snap, state)
        ? 32
        : droneHelp
          ? 36
          : ionAndHull(snap)
            ? 30
            : 12;
  // The no-damage clock starts when a shot can actually leave the ship.
  // A Heavy Ion does not scratch the hull. Leave that pairing alone while our own hull is still intact.
  const patient = ionAndHull(snap) && ratio >= 0.85;
  if (
    snap.enemy &&
    state.fightHull != null &&
    state.gunsAt != null &&
    snap.time - state.gunsAt > quiet &&
    snap.enemy.hull > state.fightHull - 1 &&
    !patient &&
    !boardWait(snap)
  ) {
    return true;
  }
  // The beam cannot pierce shields, and a damaged console cannot power the ion.
  // The clock starts when the console breaks. A fight that already sat while the bank grew must not jump on the first hit.
  if (
    snap.enemy &&
    ionFeedShort(snap) &&
    state.fightHull != null &&
    snap.enemy.hull >= state.fightHull - 1 &&
    state.ionBrokeAt != null &&
    snap.time - state.ionBrokeAt > 45
  ) {
    return true;
  }
  return false;
}

/** Stay in a fight this ship can still win. A charged drive is not a reason to leave. */
export function fightStay(snap, state) {
  if (snap.phase !== "combat" || !snap.enemy) return false;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  if (snap.storm && ratio < 0.8) return false;
  // An ion volley that never scratches the hull used to sit here until the ship died.
  return !shouldFlee(snap, state);
}

function signature(snap) {
  const choices = snap.event?.choices.map((c) => c.id).join(",") ?? "";
  return [
    snap.phase,
    snap.sector,
    snap.here,
    snap.jumps,
    snap.hull,
    snap.enemy?.hull ?? "",
    snap.fuel,
    snap.scrap,
    snap.sectorMap ? 1 : 0,
    snap.picking ? 1 : 0,
    snap.shipSheet ? 1 : 0,
    snap.overflow ? 1 : 0,
    choices,
    snap.reward ? 1 : 0,
    Math.floor(snap.flee * 20),
    Math.floor(snap.time * 2),
    snap.menuHold ? 1 : 0,
    snap.userPaused ? 1 : 0,
  ].join("|");
}

async function readRun(page) {
  return page.evaluate(() => {
    const hook = window.__stl;
    if (!hook || typeof hook.game !== "function") return null;
    const g = hook.game();
    const sys = (id) => {
      const row = g.player.systems[id];
      if (!row) return { power: 0, level: 0, damage: 0, ion: 0 };
      return {
        power: row.power || 0,
        level: row.level || 0,
        damage: row.damage || 0,
        ion: row.ion?.length || 0,
      };
    };
    const here = g.beacons.find((b) => b.id === g.here);
    const cell = g.player.kits.battery;
    const cellLevel = cell ? (cell.level || 0) - (cell.damage || 0) : 0;
    const batteryBars =
      cell?.on && cell.left > 0 ? (cellLevel >= 2 ? 4 : cellLevel === 1 ? 2 : 0) : 0;
    return {
      runSeed: g.runSeed ?? null,
      phase: g.phase,
      sector: g.sector,
      sectorName: g.sectorName,
      difficulty: g.difficulty,
      hullId: g.hullId ?? "",
      here: g.here,
      beaconKind: here?.kind ?? "",
      beaconName: here?.name ?? "",
      beaconFlag: here?.flag ?? "",
      beaconQuest: here?.quest ?? "",
      ramId: g.ramId ?? "",
      jumps: g.jumps || 0,
      fleet: g.fleet || 0,
      dangerY: g.dangerY ?? null,
      fuel: g.fuel,
      scrap: g.scrap,
      missiles: g.missiles || 0,
      hull: g.player.hull,
      hullMax: g.player.hullMax,
      reactor: g.player.reactor || 0,
      batteryBars,
      battery: cell
        ? {
            level: cell.level || 0,
            on: !!cell.on,
            left: cell.left || 0,
            cool: cell.cool || 0,
          }
        : null,
      flee: g.flee || 0,
      time: g.time || 0,
      sectorMap: !!g.sectorMap,
      picking: !!g.picking,
      shipSheet: !!g.shipSheet,
      manual: !!g.manual,
      paused: !!g.paused,
      menuHold: !!g.menuHold,
      userPaused: !!g.userPaused,
      overflow: Array.isArray(g.overflow) && g.overflow.length > 0,
      autofire: !!g.autofireAll,
      storm: !!g.player.storm,
      vent: g.mode === "vent",
      o2: Math.min(...g.player.rooms.map((r) => r.o2 ?? 100)),
      airOpen: g.player.doors.some((d) => d.b === "void" && d.open),
      roomOpen: g.player.doors.some((d) => d.b !== "void" && d.open),
      training: !!g.training,
      outcome: g.outcome || "",
      asteroid: !!g.asteroid,
      pulsar: !!g.pulsar,
      flare: !!g.flare,
      asb: !!g.asb,
      systems: {
        shields: sys("shields"),
        engines: sys("engines"),
        oxygen: sys("oxygen"),
        weapons: sys("weapons"),
        medbay: sys("medbay"),
        pilot: sys("pilot"),
        doors: sys("doors"),
      },
      crew: g.crew
        .filter((c) => c.hp > 0 || (c.side === "player" && (c.cloneIn ?? 0) > 0))
        .map((c) => ({
          name: c.name,
          kin: c.kin || "",
          side: c.side,
          aboard: c.aboard,
          room: c.room,
          hp: c.hp,
          maxHp: c.maxHp,
          path: (c.path || []).length,
          dest: (c.path || []).length ? c.path[c.path.length - 1] : c.room,
          pad: !!c.pad,
          cloning: (c.cloneIn ?? 0) > 0,
          stun: c.stun || 0,
          lockCool: c.lockCool || 0,
        })),
      rooms: g.player.rooms.map((r) => ({
        id: r.id,
        title: r.title || "",
        system: r.system || "",
        kit: r.kit || "",
        fire: r.fire || 0,
        breach: r.breach || 0,
        o2: r.o2 ?? 100,
      })),
      beacons: g.beacons.map((b) => ({
        id: b.id,
        kind: b.kind,
        col: b.col,
        row: b.row,
        x: b.x,
        y: b.y,
        links: b.links.slice(),
        visited: !!b.visited,
        name: b.name,
      })),
      route: (g.route || []).map((n) => ({
        id: n.id,
        links: n.links.slice(),
        group: n.group,
        name: n.name,
        col: n.col,
        row: n.row,
      })),
      routeHere: g.routeHere || "",
      event: g.event
        ? {
            title: g.event.title || "",
            body: g.event.body || "",
            choices: g.event.choices.map((c) => ({ id: c.id, label: c.label })),
          }
        : null,
      reward: !!g.reward,
      enemy: g.enemy
        ? {
            name: g.enemy.name || "",
            hull: g.enemy.hull,
            hullMax: g.enemy.hullMax,
            flagship: !!g.enemy.flagship,
            stage: g.enemy.flagship ? g.enemy.flagship.stage : 0,
            zoltan: g.enemy.zoltan || 0,
            shields: g.enemy.shieldNow || 0,
            shieldLevel: g.enemy.systems?.shields?.level || 0,
            shieldPower: g.enemy.systems?.shields?.power || 0,
            shieldIon: g.enemy.systems?.shields?.ion?.length || 0,
          }
        : null,
      enemyRooms: (g.enemy?.rooms || []).map((r) => ({
        id: r.id,
        title: r.title || "",
        system: r.system || "",
        coat: r.coat || 0,
        ion: r.system ? g.enemy.systems?.[r.system]?.ion?.length || 0 : 0,
        damage: r.system ? g.enemy.systems?.[r.system]?.damage || 0 : 0,
        level: r.system ? g.enemy.systems?.[r.system]?.level || 0 : 0,
      })),
      weapons: g.player.weapons.map((w, slot) => ({
        slot,
        defId: w.defId,
        enabled: !!w.enabled,
        target: w.target || "",
        beam: !!w.beamLine,
        loaded: w.loaded || 0,
      })),
      weaponsOff: g.player.weapons.filter((w) => !w.enabled).length,
      beamAim: !!g.beamAnchor,
      fired: !!(g.tally && g.tally.shot),
      playerShots: (g.tally && g.tally.playerShots) || 0,
      droneUsed: !!(g.tally && (g.tally.usedDrone || g.tally.offensiveDrone)),
      dronePower: g.player.kits.drones?.power || 0,
      droneLevel: g.player.kits.drones?.level || 0,
      droneOn: !!g.player.kits.drones?.on,
      droneLost: g.player.kits.drones?.lost || 0,
      cloak: g.player.kits.cloaking
        ? {
            level: g.player.kits.cloaking.level || 0,
            power: g.player.kits.cloaking.power || 0,
            damage: g.player.kits.cloaking.damage || 0,
            on: !!g.player.kits.cloaking.on && (g.player.kits.cloaking.left || 0) > 0,
            cool: g.player.kits.cloaking.cool || 0,
          }
        : null,
      droneSlots: g.player.kits.drones?.loadout?.length
        ? g.player.kits.drones.loadout.length
        : g.player.kits.drones?.target
          ? 1
          : 0,
      droneIds: (() => {
        const kit = g.player.kits.drones;
        const ids = kit?.loadout?.length ? kit.loadout.slice() : kit?.target ? [kit.target] : [];
        if (kit?.target && !ids.includes(kit.target)) ids.push(kit.target);
        return ids;
      })(),
      kitDraw: ["teleporter", "cloaking", "mind", "hacking", "clonebay", "artillery"].reduce(
        (n, id) => n + (g.player.kits?.[id]?.power || 0),
        0,
      ),
      telePower: g.player.kits?.teleporter?.power || 0,
      tele: g.player.kits.teleporter
        ? {
            level: g.player.kits.teleporter.level || 0,
            power: g.player.kits.teleporter.power || 0,
            damage: g.player.kits.teleporter.damage || 0,
            cool: g.player.kits.teleporter.cool || 0,
          }
        : null,
      clone: g.player.kits.clonebay
        ? {
            level: g.player.kits.clonebay.level || 0,
            power: g.player.kits.clonebay.power || 0,
            damage: g.player.kits.clonebay.damage || 0,
          }
        : null,
      artillery: g.player.kits?.artillery
        ? {
            power: g.player.kits.artillery.power || 0,
            level: g.player.kits.artillery.level || 0,
            damage: g.player.kits.artillery.damage || 0,
            weapon: g.player.kits.artillery.weapon || "",
          }
        : null,
      parts: g.player.parts || 0,
      boarders: g.crew.some((c) => c.hp > 0 && c.side !== "player" && c.aboard === "player"),
      log: (g.log || []).slice(0, 5),
    };
  });
}

async function enabled(locator) {
  if ((await locator.count()) < 1) return false;
  return locator
    .first()
    .isEnabled()
    .catch(() => false);
}

async function dismiss(page, snap) {
  const options = page.locator(".options-sheet button[aria-label='Close']");
  if ((await options.count()) > 0) return click(options, "close options");
  if (snap.manual) {
    const close = page.locator(".manual button[aria-label='Close']");
    if ((await close.count()) > 0) return click(close, "close manual");
  }
  const radial = page.locator(".radial-shade");
  if ((await radial.count()) > 0) {
    return click(radial, "close room menu");
  }
  if (snap.userPaused) return click(page.getByRole("button", { name: "Resume" }), "resume");
  return false;
}

async function ensureFast(page) {
  const off = page.getByRole("button", { name: "Fast forward" });
  if ((await off.count()) > 0 && (await off.isVisible().catch(() => false))) {
    return click(off, "fast forward");
  }
  return false;
}

async function makeRoom(page) {
  const fresh = page.locator(".make-room-pick.is-new");
  if (await enabled(fresh)) {
    await click(fresh, "leave the new item");
    return;
  }
  const any = page.locator(".make-room-pick:not([disabled])");
  if (await enabled(any)) await click(any, "pick what to leave");
  const go = page.locator(".make-room-go");
  if (await enabled(go)) await click(go, "confirm leave behind");
}

async function pickChoice(page, snap, state) {
  if (snap.overflow) {
    await makeRoom(page);
    return;
  }
  const buttons = await page.$$eval("button.choice-line", (nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute("data-choice"),
      disabled: node.disabled,
    })),
  );
  const open = new Set(buttons.filter((b) => b.id && !b.disabled).map((b) => b.id));
  if (open.size === 0) return;
  const ranked = (snap.event?.choices ?? [])
    .map((choice, index) => ({ choice, index, score: rankChoice(snap, choice, index) }))
    .filter((row) => open.has(row.choice.id))
    .sort((a, b) => a.score - b.score);
  let pick = ranked[0];
  if (!pick) return;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  if (fightChoice(pick.choice) && ratio < 0.9) {
    const peaceful = ranked.find((row) => !fightChoice(row.choice));
    if (peaceful) pick = peaceful;
  }
  if (fightChoice(pick.choice)) {
    const rest = (snap.event?.choices ?? [])
      .map((choice) => `${open.has(choice.id) ? "open" : "off"}:${choice.label}`)
      .join(" | ");
    console.log(`fight options: ${rest}`);
  }
  const ok = await click(
    page.locator(`button.choice-line[data-choice="${cssAttr(pick.choice.id)}"]`),
    pick.choice.label,
  );
  if (ok) {
    state.choice = true;
    console.log(`event choice: ${pick.choice.label}`);
  }
}

async function takeReward(page, state) {
  const button = page.locator("button.choice-line", { hasText: "Continue" });
  // The card ignores the first half-second. A low hull shortens every other click, and the
  // button unmounts as soon as Continue lands, so a failed click can still have left the card.
  let clicked = false;
  try {
    await button.first().click({ timeout: 2500 });
    clicked = true;
  } catch {
    clicked = false;
  }
  const phase = await page.evaluate(() => window.__stl?.game?.()?.phase || "").catch(() => "");
  if (clicked || (phase && phase !== "reward")) {
    state.reward = true;
    console.log("reward");
    return;
  }
  console.log("click failed (reward continue): still on the reward card");
}

/**
 * Crystal Vengeance sells for 40. A Pike beam spends that on the missing weapons bar and stays mounted.
 * A crew kill that paid scrap and no gun spends it on a 1-power weapon instead.
 */
/** A 1-power gun on the shelf that the vengeance sale can pay for. */
async function shelfFits(page, budget, level) {
  const tab = page.locator("#store-tab-weapon");
  if ((await tab.count()) < 1) return false;
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    if (!(await click(tab, "weapons tab"))) return false;
  }
  const cards = page.locator("#store-tab-panel .store-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const button = card.locator("button.store-price");
    if ((await button.count()) < 1 || !(await button.isEnabled())) continue;
    const label = (await button.getAttribute("aria-label")) || "";
    const cost = Number((label.match(/(\d+)\s+scrap/i) || [])[1]);
    if (!Number.isFinite(cost) || cost > budget) continue;
    const text = await card.innerText().catch(() => "");
    const power = Number((text.match(/(\d+)\s*power/i) || [])[1]);
    if (Number.isFinite(power) && power <= level) return true;
  }
  return false;
}

async function sellVengeance(page, snap, state) {
  // A sale with a full tank buys a reactor, and the pulsar's first ion misses their weapons.
  // Sector 3 is already under 10 fuel, so the reactor button stays dark. Sell only when a gun is on the shelf.
  if (state.fired || state.feedBeam || state.holdGunScrap) return false;
  const early =
    !state.reward &&
    snap.hullId === "PLAYER_SHIP_CRYSTAL_2" &&
    (snap.weapons || []).length === 0 &&
    (snap.sector || 0) >= 3 &&
    (snap.fuel || 0) < 10;
  if (!state.reward && !early) return false;
  const guns = snap.weapons || [];
  const pike = guns.some((w) => w.defId === "BEAM_LONG" || w.defId === "LASER_CHARGEGUN");
  const bare =
    snap.hullId === "PLAYER_SHIP_CRYSTAL_2" && guns.length === 0 && (snap.scrap || 0) < 30;
  if (!pike && !bare) return false;
  if (pike) {
    const cap = Math.max(
      0,
      (snap.systems?.weapons?.level || 0) - (snap.systems?.weapons?.damage || 0),
    );
    if (cap >= 2 || (snap.scrap || 0) >= 40) return false;
  }
  if (
    early &&
    !(await shelfFits(page, (snap.scrap || 0) + 40, snap.systems?.weapons?.level || 1))
  ) {
    await showSupplies(page);
    return false;
  }
  const tab = page.locator("#store-tab-sell");
  if ((await tab.count()) < 1) return false;
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    if (!(await click(tab, "sell tab"))) return false;
  }
  const sell = page.getByRole("button", { name: /Sell Crystal Vengeance for \d+ scrap/i });
  if ((await sell.count()) < 1 || !(await enabled(sell))) {
    await showSupplies(page);
    return false;
  }
  if (!(await click(sell, "sell crystal vengeance"))) {
    await showSupplies(page);
    return false;
  }
  if (pike) {
    state.feedBeam = true;
    state.weaponUpgrade = true;
    state.weaponBars = Math.max(state.weaponBars || 0, 2);
  } else state.holdGunScrap = true;
  console.log("sell crystal vengeance");
  await showSupplies(page);
  return true;
}

async function storeAct(page, snap, state) {
  if ((await page.locator(".make-room-store").count()) > 0) {
    if (await click(page.getByRole("button", { name: "Cancel" }), "cancel hire")) markStore(state);
    return;
  }
  if (await sellVengeance(page, snap, state)) {
    markStore(state);
    return;
  }
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  const all = page.locator(".store-repair button", { hasText: "Repair all" });
  const one = page.locator(".store-repair button", { hasText: "Repair 1" });
  const rate = snap.sector >= 7 ? 4 : snap.sector >= 4 ? 3 : 2;
  const missing = Math.max(0, (snap.hullMax || 0) - (snap.hull || 0));
  const repairCost = missing * rate;
  const weaponless = (snap.weapons || []).length === 0 && !offensiveDrone(snap);
  const weaponLevel = snap.systems.weapons?.level || 1;
  // A mounted gun that needs one more weapon bar costs 40. Ion Blast, the cheap 1-power gun, costs 30.
  const savingGun =
    (!!state.weaponUpgrade && weaponLevel < (state.weaponBars || 2) && (snap.scrap || 0) < 40) ||
    (weaponless && (snap.scrap || 0) > 0 && (snap.scrap || 0) < 30);
  // A hull above a third can spend the scrap on a gun first. Repair would price a 1-power weapon out.
  if (
    weaponless &&
    ratio >= 0.45 &&
    ((snap.fuel || 0) >= 3 || state.holdGunScrap) &&
    (await buyWeapon(page, weaponLevel, state, snap.scrap || 0))
  ) {
    markStore(state);
    return;
  }
  // The Pike beam still needs its console. Repair and extra fuel would spend the 40-scrap upgrade.
  // The vengeance sale is the gun fund when the crew kill paid no weapon. Repair would spend it.
  const feedBeam = !!state.feedBeam && weaponLevel < (state.weaponBars || 2);
  const keepGunFund = !!state.holdGunScrap && weaponless && (snap.scrap || 0) >= 30;
  const desperate = savingGun ? ratio < 0.45 : ratio < 0.65;
  if (
    !feedBeam &&
    !keepGunFund &&
    desperate &&
    missing > 0 &&
    snap.scrap >= repairCost &&
    (await enabled(all))
  ) {
    if (await click(all, "repair all")) markStore(state);
    return;
  }
  if (!feedBeam && !keepGunFund && desperate && snap.scrap >= rate && (await enabled(one))) {
    if (await click(one, "repair 1")) markStore(state);
    return;
  }
  // A ship with no gun cannot meet the fight. Buy one before the scrap becomes fuel.
  if (
    weaponless &&
    ((snap.fuel || 0) >= 3 || state.holdGunScrap) &&
    (await buyWeapon(page, weaponLevel, state, snap.scrap || 0))
  ) {
    markStore(state);
    return;
  }
  // Fuel first. A hull above 65% can wait; a tank under 10 cannot reach the next store.
  // While 40 scrap is still short, buy fuel only when the next jump would empty the tank.
  const fuelGoal = savingGun || feedBeam || keepGunFund ? 3 : snap.fuel < 10 ? 12 : 10;
  if (
    snap.fuel < fuelGoal &&
    !(feedBeam && (snap.scrap || 0) - 3 < 40) &&
    !(keepGunFund && (snap.scrap || 0) - 3 < 30)
  ) {
    // The button's accessible name is "Buy 1 fuel, N scrap".
    const buy = page.getByRole("button", { name: /Buy 1 fuel/i });
    if (await enabled(buy)) {
      if (await click(buy, "buy fuel")) {
        markStore(state);
        console.log("buy fuel");
      }
      return;
    }
  }
  // A later store is the fuel source. A desperate hull already repaired above.
  // Fuel can wait one beacon. A hole in the hull cannot, once the tank is no longer for sale.
  // The 40-scrap weapons upgrade is the hole that cannot wait: extra repair spends it.
  if (
    !savingGun &&
    !feedBeam &&
    !keepGunFund &&
    ratio < 0.92 &&
    missing > 0 &&
    snap.scrap >= repairCost &&
    (await enabled(all))
  ) {
    if (await click(all, "repair all")) {
      markStore(state);
      console.log("repair hull");
    }
    return;
  }
  if (
    !savingGun &&
    !feedBeam &&
    !keepGunFund &&
    ratio < 0.85 &&
    snap.scrap >= rate &&
    (await enabled(one))
  ) {
    if (await click(one, "repair 1")) {
      markStore(state);
      console.log("repair hull");
    }
    return;
  }
  if (snap.missiles < 4 && snap.scrap > 50 && snap.fuel >= 8) {
    const buy = page.getByRole("button", { name: /Buy 1 missiles/i });
    if (await enabled(buy)) {
      if (await click(buy, "buy missiles")) markStore(state);
      return;
    }
  }
  if (await click(page.getByRole("button", { name: "Leave the store" }), "leave store")) {
    markStore(state);
    console.log(
      `left store hull ${snap.hull}/${snap.hullMax} scrap ${snap.scrap} fuel ${snap.fuel}${savingGun ? " hold scrap for weapons" : ""}`,
    );
  }
}

/** Fuel and hull repair live on the Supplies tab. A weapons tab hides both. */
async function showSupplies(page) {
  const tab = page.locator("#store-tab-supplies");
  if ((await tab.count()) < 1) return;
  if ((await tab.getAttribute("aria-selected")) === "true") return;
  await click(tab, "supplies tab");
}

/**
 * Cheapest gun the weapon system can power.
 * One extra bar is allowed when the scrap left over can buy that weapons level.
 * The button name is the store's own label.
 */
async function buyWeapon(page, weaponLevel, state, scrap) {
  const tab = page.locator("#store-tab-weapon");
  if ((await tab.count()) < 1) return false;
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    if (!(await click(tab, "weapons tab"))) return false;
  }
  const cards = page.locator("#store-tab-panel .store-card");
  const n = await cards.count();
  let best = null;
  let bestCost = Infinity;
  let bestLabel = "";
  let bestPower = 0;
  let bestTier = 2;
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const button = card.locator("button.store-price");
    if ((await button.count()) < 1 || !(await button.isEnabled())) continue;
    const label = (await button.getAttribute("aria-label")) || "";
    const cost = Number((label.match(/(\d+)\s+scrap/i) || [])[1]);
    if (!Number.isFinite(cost)) continue;
    const text = await card.innerText().catch(() => "");
    const power = Number((text.match(/(\d+)\s*power/i) || [])[1]);
    const known = Number.isFinite(power);
    // Weapon Control level 2 costs 40. A gun one bar over the system can wait for that purchase.
    const tier =
      !known || power <= weaponLevel ? 0 : power <= weaponLevel + 1 && cost + 40 <= scrap ? 1 : 2;
    if (tier > 1) continue;
    if (tier > bestTier || (tier === bestTier && cost >= bestCost)) continue;
    best = button;
    bestCost = cost;
    bestLabel = label;
    bestPower = known ? power : weaponLevel;
    bestTier = tier;
  }
  if (!best) {
    if (!state.weaponNote) {
      state.weaponNote = true;
      console.log(`no weapon within ${weaponLevel} power`);
    }
    await showSupplies(page);
    return false;
  }
  if (!(await click(best, bestLabel || "buy weapon"))) {
    await showSupplies(page);
    return false;
  }
  console.log(bestLabel ? `buy weapon ${bestLabel}` : `buy weapon ${bestCost}`);
  if (bestTier === 1 && state) {
    state.weaponUpgrade = true;
    state.weaponBars = Math.max(state.weaponBars || 0, bestPower);
  }
  await showSupplies(page);
  return true;
}

function markStore(state) {
  if (!state.store) console.log("store");
  state.store = true;
}

export function upgradeWant(snap, state) {
  if (state.upgrades >= 24) return null;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  // A bought gun that needs one more bar. The weapons upgrade is 40 scrap.
  if (
    state.weaponUpgrade &&
    (snap.systems.weapons?.level || 1) < (state.weaponBars || 2) &&
    (snap.fuel || 0) >= 3 &&
    (snap.scrap || 0) >= 40 &&
    ratio >= 0.2
  ) {
    return "weapons";
  }
  // A damaged hull spends the next store visit on repairs. Upgrades wait.
  if (ratio < 0.8) return null;
  // Below 10 fuel the scrap buys fuel. An upgrade that empties the wallet strands the next sector.
  if ((snap.fuel || 0) < 10) return null;
  // A store sells fuel for 3 scrap. Keep that reserve until the tank is comfortable.
  const fuelShort = Math.max(0, 12 - (snap.fuel || 0));
  if (snap.scrap < fuelShort * 3 + 10) return null;
  const shields = snap.systems.shields.level;
  const engines = snap.systems.engines.level;
  const medbay = snap.systems.medbay?.level ?? 0;
  const blocked = (id, level) => {
    const at = state.blocked.get(`${id}:${level}`);
    return at != null && snap.scrap < at + 8;
  };
  // A reactor under 9 cannot feed another shield bubble. An unaffordable reactor waits. It does not buy the bubble.
  if (snap.reactor < 9) {
    if (!blocked("reactor", snap.reactor)) return "reactor";
    return null;
  }
  if (shields < 4 && !blocked("shields", shields)) return "shields";
  if (snap.reactor < 11 && shields >= 4 && !blocked("reactor", snap.reactor)) return "reactor";
  if (engines < 3 && shields >= 4 && !blocked("engines", engines)) return "engines";
  if (snap.sector >= 4 && shields < 6 && !blocked("shields", shields)) return "shields";
  if (medbay < 2 && shields >= 4 && !blocked("medbay", medbay)) return "medbay";
  if (snap.reactor < 13 && shields >= 4 && !blocked("reactor", snap.reactor)) return "reactor";
  return null;
}

async function upgradeAct(page, snap, state) {
  if (snap.phase !== "map" || snap.picking || snap.sectorMap || hazard(snap) || healing(snap)) {
    return false;
  }
  const key = upgradeWant(snap, state);
  if (!key) return false;
  if (!snap.shipSheet) {
    await page.keyboard.press("u");
    return true;
  }
  const btn = page.locator(`[data-sheet="ship"] button[data-upgrade="${key}"]`);
  const on = await enabled(btn);
  if (on) {
    await click(btn, `upgrade ${key}`);
    state.upgrades += 1;
    console.log(`upgrade ${key}`);
  } else {
    const level = key === "reactor" ? snap.reactor : snap.systems[key]?.level;
    state.blocked.set(`${key}:${level}`, snap.scrap);
  }
  await click(page.locator("[data-sheet='ship'] button[aria-label='Close']"), "close ship");
  return true;
}

let lastOrderLog = "";
let partySent = false;

/** The weaponless send has left the pad. Tests and the next fight clear it. */
export function notePartySent(sent = true) {
  partySent = sent;
}

/**
 * After the send, a crystal who is not already on the pad must not walk onto it.
 * The live driver seals the click after the send. Calling this on the walk moves the fight.
 */
export function padFollow(snap, names, roomId) {
  if (!partySent || !snap || snap.phase !== "combat" || !roomId) return false;
  const teleRoom = (snap.rooms || []).find((r) => r.kit === "teleporter");
  if (!teleRoom || roomId !== teleRoom.id) return false;
  const onPad = new Set(
    (snap.crew || [])
      .filter(
        (c) =>
          c.side === "player" &&
          (c.hp || 0) > 0 &&
          (c.room === teleRoom.id || c.dest === teleRoom.id),
      )
      .map((c) => c.name),
  );
  return (names || []).some((name) => !onPad.has(name));
}

async function orderTo(page, snap, names, title, roomId) {
  if (!names.length || (!title && !roomId)) return false;
  // The map order is the only place this runs. The fight never pays the call.
  if (snap.phase !== "combat" && cargoStick(snap, names, roomId)) return false;
  // Q selects every living crew member and does not toggle off the way a second card click does.
  await page.keyboard.press("q");
  const skip = playerCrew(snap)
    .map((c) => c.name)
    .filter((name) => !names.includes(name));
  for (const name of skip) {
    await page
      .locator(".crew-card-hit", { hasText: name })
      .click({ modifiers: ["Shift"], timeout: 3000 })
      .catch(() => {});
  }
  // Several rooms share the title Hall. The button lives on the room id, which is unique.
  const room = roomId
    ? page.locator(".sky .ship-well").locator(`[data-room="${cssAttr(roomId)}"] button.room-hit`)
    : page
        .locator(".sky .ship-well")
        .locator(`button.room-hit[aria-label="Open ${cssAttr(title)}"]`);
  const ok = await click(room, `order to ${roomId || title}`, { button: "right" });
  if (ok) {
    const line = `order ${names.join(",")} -> ${roomId || title}`;
    if (line !== lastOrderLog) {
      lastOrderLog = line;
      console.log(line);
    }
  }
  return ok;
}

let clickBudget = 4000;

async function click(locator, label, options = {}) {
  const timeout = options.timeout ?? clickBudget;
  const { timeout: _timeout, ...rest } = options;
  try {
    await locator.first().click({ timeout, ...rest });
    return true;
  } catch (err) {
    try {
      await locator.first().click({ timeout: Math.min(1200, timeout), force: true, ...rest });
      return true;
    } catch (err2) {
      const message = String(err2?.message || err?.message || err).split("\n")[0];
      console.log(`click failed (${label}): ${message}`);
      return false;
    }
  }
}

function sendCrew(names, room) {
  if (!room || !names.length) return null;
  return { names, title: room.title, roomId: room.id };
}

/** A body already walking to a damaged oxygen or engine bar. The empty chair must not pull them off it. */
function repairLock(snap, crew) {
  for (const id of ["oxygen", "engines"]) {
    const room = roomBySystem(snap, id);
    const sys = snap.systems[id];
    if (!room || !sys || !(sys.damage > 0)) continue;
    const who =
      crew.find((c) => c.room === room.id && c.path === 0) || crew.find((c) => c.dest === room.id);
    if (who) return who;
  }
  return null;
}

/** Already on a damaged clone bay or teleporter. Later walks must leave them there. */
function holdingBay(snap, c) {
  const id = c?.dest || c?.room;
  const room = (snap?.rooms || []).find((r) => r.id === id);
  if (!room) return false;
  if (room.kit === "clonebay" && (snap.clone?.damage || 0) > 0) return true;
  if (room.kit === "teleporter" && (snap.tele?.damage || 0) > 0) return true;
  return false;
}

/** The engi is already walking onto a bar that is still broken. The chair must not pull them off it. */
function fixingSystem(snap, c) {
  if (holdingBay(snap, c)) return true;
  const id = c?.dest || c?.room;
  const room = (snap?.rooms || []).find((r) => r.id === id);
  if (!room) return false;
  const sys = room.system ? snap.systems?.[room.system] : null;
  return !!sys && (sys.damage || 0) > 0;
}

/** Where the crew should walk. Boarders are fought in their room; a medbay does not pull them. */
export function crewOrders(snap, fleeing = false) {
  const foes = intruders(snap);
  const crew = playerCrew(snap);
  const pilot = roomBySystem(snap, "pilot");
  const med = roomBySystem(snap, "medbay");
  // Zoltans are the power bars. Pulling them into the medbay during a ship fight drops engines and shields.
  const zoltanFight = !!snap.enemy && crew.some((c) => c.kin === "energy");
  if (foes.length && crew.length && !zoltanFight) {
    const bay = roomBySystem(snap, "medbay");
    const bayLive = bay && (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 0);
    // Stand together in a working medbay. Chasing one boarder from room to room kills the only crew.
    // After the fight, four healthy crew piled into a full medbay and the empty chair froze the drive.
    if (bay && bayLive) {
      // A dead door system cannot vent the boarders. Two crew in the medbay then sit until the hold timer.
      const shelterAll = !!snap.enemy || (crew.length <= 2 && !doorsDead(snap));
      if (shelterAll) {
        const movers = crew.filter((c) => c.dest !== bay.id);
        if (movers.length)
          return sendCrew(
            movers.map((c) => c.name),
            bay,
          );
        return null;
      }
      const hurt = crew.filter((c) => c.hp < c.maxHp * 0.45 && c.dest !== bay.id);
      if (hurt.length)
        return sendCrew(
          hurt.map((c) => c.name),
          bay,
        );
    }
  }
  // A hit on the pad strands whoever is already across. The engi fixes that before a door breach.
  const stranded = (snap.crew || []).filter(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  const teleRoom = (snap.rooms || []).find((r) => r.kit === "teleporter");
  const tele = snap.tele;
  // Nobody is across yet. The smashed pad is still the only gun, so it gets the fixer.
  // Once the party has been sent, the last crystal stays off that room until the fight ends.
  if (!snap.enemy) partySent = false;
  const padIsGun = !canShoot(snap) && !!snap.enemy;
  const lastAboard = padIsGun && (partySent || stranded.length > 0) && crew.length <= 1;
  if (
    (stranded.length || padIsGun) &&
    teleRoom &&
    tele &&
    (tele.damage || 0) > 0 &&
    crew.length &&
    !fleeing &&
    !lastAboard &&
    !(padIsGun && partySent)
  ) {
    const already = crew.some(
      (c) => c.dest === teleRoom.id || (c.room === teleRoom.id && c.path === 0),
    );
    if (already) return null;
    const fixer = crew.find((c) => c.kin === "engi") || crew[0];
    return sendCrew([fixer.name], teleRoom);
  }
  const cloning = (snap.crew || []).some((c) => c.side === "player" && c.cloning);
  const cloneRoom = (snap.rooms || []).find((r) => r.kit === "clonebay");
  // One sabotage point is the whole warning. The next point destroys the bay and the deaths stick.
  if (cloneRoom && (snap.clone?.damage || 0) > 0 && crew.length) {
    const already = crew.some(
      (c) => c.dest === cloneRoom.id || (c.room === cloneRoom.id && c.path === 0),
    );
    // Stopping here left the other crew idle while boarders broke the helm.
    if (!already) {
      const fixer = crew.find((c) => c.kin === "engi") || crew[0];
      return sendCrew([fixer.name], cloneRoom);
    }
  }
  // A boarding ship wins on their hull. The medbay keeps the mantis home, and the drone never finishes the crew.
  const pad = boardParty(snap);
  if (pad && !fleeing) {
    const bay = roomBySystem(snap, "medbay");
    const bayLive = bay && (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 0);
    // An empty hull has no melee. A medbay walk there is the scout's beam landing first.
    const foeAboard = (snap.crew || []).some(
      (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
    );
    if (bay && bayLive && foeAboard) {
      const wounded = crew.filter((c) => (c.maxHp || 0) > 0 && c.hp < c.maxHp * 0.55);
      const leaving = wounded.filter((c) => c.dest !== bay.id);
      // Back on the pad at half health, they die in the same room. The medbay goes first.
      if (leaving.length)
        return sendCrew(
          leaving.map((c) => c.name),
          bay,
        );
      if (wounded.length) return null;
    }
    // Three crew can spare the engi. An empty ship cannot repair the pad once their boarders arrive.
    const pilot = roomBySystem(snap, "pilot");
    const roster = (snap.crew || []).filter((c) => c.side === "player" && (c.hp || 0) > 0);
    const away = (snap.crew || []).some(
      (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
    );
    let stay = null;
    if (roster.length >= 3 && pilot) {
      stay =
        crew.find((c) => c.kin === "engi") ||
        crew.find((c) => c.room === pilot.id && c.path === 0) ||
        crew[crew.length - 1];
      // The party is already across. Pulling the engi back to the chair leaves a hit teleporter broken.
      if (
        stay &&
        !away &&
        stay.room !== pilot.id &&
        stay.dest !== pilot.id &&
        !fixingSystem(snap, stay)
      )
        return sendCrew([stay.name], pilot);
    }
    const movers = crew.filter((c) => c !== stay && (c.room !== pad.id || c.path !== 0));
    // Someone is already across. The last body at home repairs instead of emptying the helm.
    if (!(away && crew.length <= 1) && movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        pad,
      );
    // The party is still waiting on the pad. A repair walk pulls them off before the send.
    if (!away) return null;
  }
  // A clone bay has no medbay to shelter in. Chasing boarders during the fight leaves the guns dark.
  if (
    foes.length &&
    crew.length &&
    !zoltanFight &&
    !(snap.enemy && (snap.systems.medbay?.level ?? 0) < 1)
  ) {
    const counts = new Map();
    for (const foe of foes) counts.set(foe.room, (counts.get(foe.room) || 0) + 1);
    const roomId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const room = snap.rooms.find((r) => r.id === roomId);
    const foeInPilot = pilot && foes.some((f) => f.room === pilot.id || f.dest === pilot.id);
    const keepPilot = !!(snap.enemy && pilot && !foeInPilot && crew.length >= 3);
    const seated = keepPilot
      ? crew.find((c) => c.room === pilot.id && c.path === 0 && !foeInPilot) ||
        [...crew].sort((a, b) => b.hp - a.hp)[0]
      : null;
    const bayClear = med && foes.every((f) => f.room !== med.id && f.dest !== med.id);
    const contested = (id) => foes.some((f) => f.room === id || f.dest === id);
    // A light wound in the medbay does not recall someone already walking to the fight.
    // Anyone standing in a room a boarder is in, or walking to, stays there.
    const healing =
      bayClear && med
        ? crew.filter(
            (c) =>
              c !== seated &&
              c.room !== roomId &&
              c.dest !== roomId &&
              c.hp < c.maxHp * 0.45 &&
              (c.room === med.id || c.dest === med.id),
          )
        : [];
    const fixer = repairLock(snap, crew);
    const movers = crew.filter(
      (c) =>
        c !== seated &&
        c !== fixer &&
        !healing.includes(c) &&
        c.dest !== roomId &&
        !contested(c.room) &&
        !holdingBay(snap, c),
    );
    if (movers.length && room) {
      // A vacuum plus a full room suffocates everyone but the lanius, and the clone bay spends the hull.
      const airless = (room.o2 ?? 100) < 40 || ((room.breach || 0) > 0 && (snap.o2 ?? 100) < 60);
      if (airless) {
        const one =
          movers.find((c) => c.kin === "anaerobic") ||
          movers.find((c) => c.kin !== "engi") ||
          movers[0];
        if (one) return sendCrew([one.name], room);
      }
      return sendCrew(
        movers.map((c) => c.name),
        room,
      );
    }
    const goHeal = healing.find((c) => c.dest !== med.id);
    if (goHeal) return sendCrew([goHeal.name], med);
    if (seated && pilot && seated.dest !== pilot.id) return sendCrew([seated.name], pilot);
    return null;
  }
  // A quiet beacon with a live medbay. Walking the wounded into a breach or a broken gun finishes them.
  if (
    !snap.enemy &&
    snap.phase === "map" &&
    !hazard(snap) &&
    med &&
    (snap.systems.medbay?.level ?? 0) >= 1 &&
    (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 1)
  ) {
    const hurt = crew.filter((c) => c.hp < c.maxHp * 0.55 && c.dest !== med.id);
    if (hurt.length)
      return sendCrew(
        hurt.map((c) => c.name),
        med,
      );
  }
  // A Zoltan in shields, engines, or the chair is the bar that keeps that room alive. A doors breach can wait.
  const pinned = (c) => {
    if (!zoltanFight || c.kin !== "energy" || c.path !== 0) return false;
    const room = (snap.rooms || []).find((r) => r.id === c.room);
    if (!room || (room.fire || 0) > 0 || (room.breach || 0) > 0) return false;
    if (room.system === "weapons") {
      const cost = Number(snap.dockPower) || knownGunPower(snap);
      const have = snap.systems.weapons?.power || 0;
      // The Glaive's last bar is this Zoltan. Walking him to the chair turns the beam off.
      return cost > 0 && have < cost;
    }
    if (room.system !== "shields" && room.system !== "engines" && room.system !== "pilot")
      return false;
    if ((snap.systems[room.system]?.damage ?? 0) > 0) return false;
    if (room.system === "pilot") return true;
    // A broken weapon console cannot feed the ion. A Zoltan standing in healthy shields never walks over.
    const weapons = snap.systems.weapons;
    const weaponRoom = roomBySystem(snap, "weapons");
    const ionNeedsRoom =
      !!weapons &&
      (weapons.damage || 0) > 0 &&
      (snap.weapons || []).some((w) => isIonDef(w.defId)) &&
      !!weaponRoom &&
      !crew.some(
        (mate) =>
          (mate.room === weaponRoom.id && mate.path === 0) ||
          (mate.dest === weaponRoom.id && mate.path > 0),
      );
    if (ionNeedsRoom) return false;
    return true;
  };
  const burningRooms = (snap.rooms || []).filter((r) => (r.fire || 0) > 0 && r.title);
  // A hall fire listed first left the oxygen fire to break the bar again.
  const hot =
    burningRooms.find((r) => r.system === "oxygen") ||
    burningRooms.find((r) => r.system === "pilot") ||
    burningRooms.find((r) => r.system === "engines") ||
    burningRooms.find((r) => r.system === "shields") ||
    burningRooms[0];
  const leaking = (snap.rooms || []).find((r) => (r.breach || 0) > 0 && r.title);
  const airRoom = roomBySystem(snap, "oxygen");
  const airBroken = (snap.systems.oxygen?.damage ?? 0) > 0;
  // A lone crew sent to the chair and back to oxygen never stands long enough to finish the bar.
  if (
    !fleeing &&
    !hazard(snap) &&
    !hot &&
    airBroken &&
    airRoom &&
    crew.length === 1 &&
    (snap.phase === "map" || snap.phase === "combat")
  ) {
    const only = crew[0];
    if (only.dest === airRoom.id) return null;
    return sendCrew([only.name], airRoom);
  }
  // The drive does not charge with an empty chair. One pilot stays unless the chair itself is the emergency.
  const seatedPilot = pilot ? crew.find((c) => c.room === pilot.id && c.path === 0) : null;
  const enginesLive = (snap.systems.engines?.damage ?? 0) < (snap.systems.engines?.level ?? 1);
  // The next fight has no gun. One crystal finishes the cloak while the others hold the chair.
  if (crewReadyCloak(snap) && crew.length >= 2 && enginesLive && !airBroken) {
    const room = (snap.rooms || []).find((r) => r.kit === "cloaking");
    if (room && !crew.some((c) => c.room === room.id || c.dest === room.id)) {
      const fixer = crew.find((c) => c !== seatedPilot && (!pilot || c.room !== pilot.id));
      if (fixer) return sendCrew([fixer.name], room);
    }
  }
  // The swarm missile cannot shoot yet. Repair the cloak, then the bubble, before the next fight.
  if (thinCargo(snap) && enginesLive && !airBroken && (cloakBroken(snap) || noBubble(snap))) {
    const room = cloakBroken(snap)
      ? (snap.rooms || []).find((r) => r.kit === "cloaking")
      : roomBySystem(snap, "shields");
    if (room && !crew.some((c) => c.room === room.id || c.dest === room.id)) {
      const fixer = crew.find((c) => c !== seatedPilot && (!pilot || c.room !== pilot.id));
      if (fixer) return sendCrew([fixer.name], room);
    }
  }
  // No gun and no bubble. One crystal finishes the shield bar before the jump.
  if (bubbleJumpHold(snap) && enginesLive && !airBroken) {
    const room = roomBySystem(snap, "shields");
    if (room && !crew.some((c) => c.room === room.id || c.dest === room.id)) {
      const fixer = crew.find((c) => c !== seatedPilot && (!pilot || c.room !== pilot.id));
      if (fixer) return sendCrew([fixer.name], room);
    }
  }
  const chairJob = (hot && hot.id === pilot?.id) || (leaking && leaking.id === pilot?.id);
  const loneEmergency = crew.length === 1 && !!(hot || leaking || airBroken);
  // One person sent to the helm and then to a broken gun never sits long enough for the drive to charge.
  const loneStaysOnRepair =
    !fleeing &&
    crew.length === 1 &&
    ["oxygen", "engines", "weapons", "shields", "medbay"].some((id) => {
      const sys = snap.systems[id];
      return !!sys && (sys.damage ?? 0) > 0;
    });
  const locked = repairLock(snap, crew);
  const freeHands = () => crew.filter((c) => c !== locked && !holdingBay(snap, c));
  // No enemy on the scope. Seating the pilot cancels the oxygen walk, or the breach seal, on the next tick.
  const airFirst =
    !snap.enemy &&
    ((airBroken && ((snap.o2 ?? 100) < 85 || (snap.systems.oxygen?.power ?? 0) < 1)) ||
      ((leaking || hot) && (snap.o2 ?? 100) < 50));
  if (
    enginesLive &&
    pilot &&
    !seatedPilot &&
    !chairJob &&
    crew.length &&
    !loneEmergency &&
    !loneStaysOnRepair &&
    !airFirst &&
    !crew.some((c) => c.dest === pilot.id) &&
    snap.phase !== "event" &&
    // No fuel and a dead oxygen bar: the chair cannot jump, and pulling the repair crew back empties the ship.
    !(airBroken && (snap.fuel || 0) <= 0)
  ) {
    const mover = freeHands()
      .filter((c) => !pinned(c) && !onCloakRepair(snap, c))
      .sort((a, b) => b.hp - a.hp)[0];
    if (mover) return sendCrew([mover.name], pilot);
  }
  const besidesPilot = (roomId) =>
    crew.filter(
      (c) =>
        !pinned(c) &&
        !holdingBay(snap, c) &&
        c.dest !== roomId &&
        (crew.length === 1 || c !== seatedPilot || roomId === pilot?.id) &&
        (snap.enemy || (!onCloakRepair(snap, c) && !onBubbleRepair(snap, c))),
    );
  // One damaged shield bar cannot hold a bubble. A fire in the teleporter can wait.
  const shieldRoom = roomBySystem(snap, "shields");
  const shieldDown =
    !!snap.enemy &&
    !!shieldRoom &&
    (snap.systems.shields?.damage ?? 0) > 0 &&
    (snap.systems.shields?.power ?? 0) < 2;
  const lifeFire =
    hot &&
    [shieldRoom?.id, airRoom?.id, roomBySystem(snap, "engines")?.id, pilot?.id].includes(hot.id);
  // A dead oxygen bar empties the ship. A shield fire can wait until someone is breathing.
  const airDying =
    !snap.enemy && airBroken && ((snap.o2 ?? 100) < 85 || (snap.systems.oxygen?.power ?? 0) < 1);
  // The dead helm can wait. Walking off an oxygen fire lets it break the bar again, and the air runs out.
  if (!snap.enemy && lifeFire && hot && !(airDying && hot.system !== "oxygen")) {
    const movers = besidesPilot(hot.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        hot,
      );
    return null;
  }
  // A destroyed flak tube does no damage. Repair it before a shield bar when the gun is dark.
  const artRoom = roomBySystem(snap, "artillery");
  const gunLive =
    (snap.weapons || []).some((w) => w.enabled) && (snap.systems.weapons?.power ?? 0) >= 1;
  const artDown =
    !!artRoom &&
    snap.artillery?.weapon === "ARTILLERY_FED_C" &&
    (snap.artillery?.damage || 0) > 0 &&
    !gunLive;
  // A working oxygen bar can wait while the air is still high. A broken one empties the ship
  // before anyone arrives, so the walk starts as soon as the bar is damaged. A jump already
  // in progress keeps the pilot in the chair.
  const skipAir = !!snap.enemy && (snap.o2 ?? 100) >= 50 && (fleeing || !airBroken);
  const airFailing =
    airBroken && !skipAir && ((snap.o2 ?? 100) < 85 || (snap.systems.oxygen?.power ?? 0) < 1);
  if (airFailing && airRoom && (!lifeFire || (airDying && hot?.system !== "oxygen"))) {
    const movers = besidesPilot(airRoom.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        airRoom,
      );
    return null;
  }
  // Open hulls drain a repaired oxygen bar. Seal one before walking off to the flak tube.
  // The last crystal seals a breach and suffocates. The chair finishes the jump off the pulsar.
  if (
    hazard(snap) &&
    !snap.enemy &&
    !airBroken &&
    enginesLive &&
    pilot &&
    crew.length === 1 &&
    !seatedPilot
  ) {
    const only = crew[0];
    if (only.dest !== pilot.id) return sendCrew([only.name], pilot);
    return null;
  }
  // A pulsar keeps landing while a hall is sealed. The drive has to charge before the next bar breaks.
  const driveDown =
    hazard(snap) &&
    !snap.enemy &&
    ((snap.systems.engines?.damage ?? 0) > 0 || (snap.systems.pilot?.damage ?? 0) > 0);
  if (!airBroken && (snap.o2 ?? 100) < 50 && leaking && !lifeFire && !driveDown) {
    const movers = besidesPilot(leaking.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        leaking,
      );
    return null;
  }
  if (artDown && !lifeFire) {
    const movers = besidesPilot(artRoom.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        artRoom,
      );
    // Already walking to the tube. A shield or breach order would turn them around forever.
    return null;
  }
  if (shieldDown && !lifeFire && !(fleeing && !enginesLive)) {
    const movers = besidesPilot(shieldRoom.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        shieldRoom,
      );
    return null;
  }
  // The chain laser needs two bars. One damaged weapon bar cannot feed it, and the click never turns it on.
  // The scratched engine is what finishes the jump. Repair that before the gun.
  const engineRoom = roomBySystem(snap, "engines");
  const enginesHurt = (snap.systems.engines?.damage ?? 0) > 0;
  const dockNow = Number(snap.dockPower) || dockPower || 0;
  const gunUnfed = fleeing && (snap.weapons || []).length > 0 && !feedableGun(snap, dockNow);
  if (gunUnfed && enginesHurt && engineRoom && !lifeFire) {
    const movers = besidesPilot(engineRoom.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        engineRoom,
      );
    if (crew.some((c) => c !== seatedPilot && c.dest === engineRoom.id)) return null;
  }
  // A doors breach can wait. The gun has to come back before the next shot lands.
  const weaponRoom = roomBySystem(snap, "weapons");
  const gunsDown =
    !!snap.enemy &&
    !!weaponRoom &&
    (snap.weapons || []).length > 0 &&
    (snap.systems.weapons?.damage || 0) > 0;
  if (gunsDown && !lifeFire && !(fleeing && !enginesLive)) {
    const movers = besidesPilot(weaponRoom.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        weaponRoom,
      );
    if (crew.some((c) => c !== seatedPilot && c.dest === weaponRoom.id)) return null;
  }
  // A fire in an empty install slot can wait while a system is already broken.
  // A weapons-room fire was cancelling the walk to a dead engine, and the entrance never charged.
  const driveBroken =
    !snap.enemy &&
    ((snap.systems.engines?.damage ?? 0) > 0 || (snap.systems.pilot?.damage ?? 0) > 0);
  const hotMatters = hot && (hot.system || hot.kit);
  if (hotMatters && crew.length && !lifeFire && !driveBroken) {
    const movers = besidesPilot(hot.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        hot,
      );
    if (crew.some((c) => c !== seatedPilot && c.dest === hot.id)) return null;
  }
  // An asteroid field keeps punching holes. The drive has to work before those are sealed.
  if (hazard(snap)) {
    const escape = ["pilot", "engines", "oxygen"]
      .map((id) => ({ id, room: roomBySystem(snap, id), sys: snap.systems[id] }))
      .find((row) => row.room && row.sys && row.sys.damage > 0);
    if (escape && crew.length) {
      const enginesLive = (snap.systems.engines?.damage ?? 0) < (snap.systems.engines?.level ?? 1);
      const movers = crew.filter(
        (c) =>
          (escape.id === "pilot" || !enginesLive || c !== seatedPilot) &&
          c.dest !== escape.room.id &&
          !holdingBay(snap, c),
      );
      if (movers.length)
        return sendCrew(
          movers.map((c) => c.name),
          escape.room,
        );
      return null;
    }
  }
  if (leaking && crew.length) {
    const movers = besidesPilot(leaking.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        leaking,
      );
    if (crew.some((c) => c !== seatedPilot && c.dest === leaking.id)) return null;
  }
  if (
    pilot &&
    crew.length &&
    !loneEmergency &&
    !loneStaysOnRepair &&
    !airFirst &&
    !(fleeing && crew.length === 1 && !enginesLive) &&
    !crew.some((c) => c.dest === pilot.id) &&
    snap.phase !== "event"
  ) {
    const mover = freeHands()
      .filter((c) => !pinned(c) && !onCloakRepair(snap, c))
      .sort((a, b) => b.hp - a.hp)[0];
    if (mover) return sendCrew([mover.name], pilot);
  }
  const enginesDead = (snap.systems.engines?.damage ?? 0) >= (snap.systems.engines?.level ?? 1);
  const repairOrder =
    snap.enemy && (snap.systems.shields?.damage ?? 0) > 0 && !(fleeing && enginesDead)
      ? ["pilot", "oxygen", "shields", "engines", "weapons", "medbay"]
      : ["pilot", "oxygen", "engines", "weapons", "shields", "medbay"];
  const broken = repairOrder
    .filter((id) => !(id === "oxygen" && snap.enemy && (snap.o2 ?? 100) >= 50))
    .map((id) => ({ id, room: roomBySystem(snap, id), sys: snap.systems[id] }))
    .find((row) => {
      if (!row.room || !row.sys || !(row.sys.damage > 0)) return false;
      if (row.id !== "pilot") return true;
      // One person already has the chair. A second body cannot fit, and the gun stays broken.
      return !crew.some(
        (c) =>
          (c.room === row.room.id && (c.path || 0) === 0) ||
          (c.dest === row.room.id && (c.path || 0) > 0),
      );
    });
  if (broken && crew.length === 1 && fleeing && !enginesLive && pilot && repairDroneReady(snap)) {
    // A fitted repair drone brings the engine back. The only crew stays seated or the drive never finishes.
    const only = crew[0];
    if (only.room === pilot.id && only.path === 0) return null;
    if (only.dest === pilot.id) return null;
    return sendCrew([only.name], pilot);
  }
  if (broken && crew.length === 1 && fleeing && enginesLive && pilot && broken.id !== "pilot") {
    // A scratched engine still charges the drive. Pulling the only crew off the helm to fix it never finishes either job.
    const only = crew[0];
    if (only.room === pilot.id && only.path === 0) return null;
    if (only.dest === pilot.id) return null;
    return sendCrew([only.name], pilot);
  }
  if (broken && crew.length) {
    const spares = crew.filter((c) => broken.id === "pilot" || !pilot || c.dest !== pilot.id);
    const movers = (spares.length ? spares : crew).filter(
      (c) =>
        c.dest !== broken.room.id &&
        !pinned(c) &&
        !holdingBay(snap, c) &&
        (snap.enemy || (!onCloakRepair(snap, c) && !onBubbleRepair(snap, c))),
    );
    if (movers.length) {
      const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
      // The whole crew on a broken engine leaves the oxygen room empty, and the next fire destroys it.
      const thin = Number.isFinite(ratio) && ratio < 0.25 && (snap.o2 ?? 100) < 50;
      const names =
        broken.id === "pilot" || (thin && broken.id !== "oxygen")
          ? [movers[0].name]
          : movers.map((c) => c.name);
      return sendCrew(names, broken.room);
    }
  }
  // Systems are whole. An empty Shields slot still spreads into the guns.
  if (hot && !broken && crew.length && !lifeFire && !(hot.system || hot.kit)) {
    const movers = besidesPilot(hot.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        hot,
      );
    if (crew.some((c) => c !== seatedPilot && c.dest === hot.id)) return null;
  }
  if (
    fleeing &&
    pilot &&
    crew.length >= 2 &&
    crew.some((c) => c.room === pilot.id && c.path === 0)
  ) {
    const engines = roomBySystem(snap, "engines");
    if (engines && !crew.some((c) => c.dest === engines.id || c.room === engines.id)) {
      const spare = crew.find(
        (c) =>
          c.dest !== pilot.id &&
          c.room !== pilot.id &&
          (snap.enemy || (!onCloakRepair(snap, c) && !onBubbleRepair(snap, c))),
      );
      if (spare) return sendCrew([spare.name], engines);
    }
  }
  if (
    snap.phase === "map" &&
    !snap.picking &&
    !hazard(snap) &&
    med &&
    (snap.systems.medbay?.power ?? 0) > 0 &&
    (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 1)
  ) {
    const hurt = crew.find((c) => c.hp < c.maxHp * 0.92 && c.dest !== med.id);
    if (hurt && crew.some((c) => c !== hurt && c.dest === pilot?.id))
      return sendCrew([hurt.name], med);
  }
  return null;
}

async function crewAct(page, snap, fleeing = false) {
  const order = crewOrders(snap, fleeing);
  if (!order) return false;
  if (intruders(snap).length && !snap.enemy) {
    const bay = snap.systems.medbay;
    console.log(
      `shelter med ${bay?.damage ?? 0}/${bay?.level ?? 0} p${bay?.power ?? 0} foes ${intruders(snap)
        .map((f) => f.room)
        .join(",")}`,
    );
  }
  return orderTo(page, snap, order.names, order.title, order.roomId);
}

const POWER_LABEL = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  weapons: "Weapons",
  medbay: "Medbay",
};

function isIonDef(defId) {
  return String(defId || "").startsWith("ION");
}

function isMissileDef(defId) {
  return /MISSILE|BOMB/.test(String(defId || ""));
}

/** A beam or laser is mounted and still dark, and the spare bars can feed the dearest gun on the dock. */
export function holdWeaponBars(snap, dockNeed) {
  const list = snap.weapons || [];
  const hull = list.filter((w) => w.defId && !isIonDef(w.defId));
  if (!hull.length || hull.some((w) => w.enabled)) return false;
  const have = snap.systems?.weapons?.power || 0;
  const need = Number(dockNeed) || 0;
  return need > 0 && have + sparePower(snap) >= need;
}

/**
 * Ions do not drop hull. Move the bars onto a beam or laser that fits.
 * Right-click turns an ion off. Left-click claims the hull gun.
 */
/** Arming a cheaper slot pulls one bar. powerWant takes it back when the dearest gun does not fit. */
export function skipUnfedGun(cap, dock) {
  return dock > 0 && cap < dock;
}

/** A smashed weapons console cannot turn this gun on. Clicking the slot only repeats the refusal. */
export function feedableGun(snap, cost) {
  const sys = snap.systems?.weapons;
  const cap = Math.max(0, (sys?.level || 0) - (sys?.damage || 0) - (sys?.ion || 0));
  return !skipUnfedGun(cap + weaponZoltan(snap), cost);
}

/** The bars already held by other guns leave no room. The click only repeats "Not enough power." */
export function claimableGun(snap, cost, enabledCost) {
  if (!feedableGun(snap, cost)) return false;
  const sys = snap.systems?.weapons;
  const cap = Math.max(0, (sys?.level || 0) - (sys?.damage || 0) - (sys?.ion || 0));
  const free = cap + weaponZoltan(snap) - Math.max(0, enabledCost || 0);
  return cost <= free;
}

/** Slot to switch off so a bomb can take the only weapon bar. Null when the bomb already fits. */
export function freeBomb(weapons, costs, cap) {
  const list = weapons || [];
  const bomb = list.find((w) => !w.enabled && isMissileDef(w.defId));
  if (!bomb) return null;
  const bombCost = costs[bomb.slot] || 0;
  if (bombCost < 1 || bombCost > cap) return null;
  let used = 0;
  for (const w of list) if (w.enabled) used += costs[w.slot] || 0;
  if (bombCost <= cap - used) return null;
  const holders = list
    .filter((w) => w.enabled && !isMissileDef(w.defId))
    .sort((a, b) => (costs[a.slot] || 0) - (costs[b.slot] || 0));
  for (const w of holders) {
    used -= costs[w.slot] || 0;
    if (bombCost <= cap - used) return w.slot;
  }
  return null;
}

/** Slot of a bomb to switch off once the enemy bubble is down, so the laser can take the bar. */
export function bombDone(weapons, costs, cap, shields) {
  if ((shields ?? 1) > 0) return null;
  const list = weapons || [];
  const bomb = list.find((w) => w.enabled && isMissileDef(w.defId));
  const laser = list.find(
    (w) => !w.enabled && w.defId && !isMissileDef(w.defId) && !isIonDef(w.defId),
  );
  if (!bomb || !laser) return null;
  const laserCost = costs[laser.slot] || 0;
  if (laserCost < 1 || laserCost > cap) return null;
  return bomb.slot;
}

/** Shots from enabled hull guns. A basic laser is one bolt. Anything else is treated as a volley that can mark hull through two layers. */
export function volleyCanPierce(weapons, shields) {
  if ((shields ?? 0) <= 0) return true;
  let shots = 0;
  for (const w of weapons || []) {
    if (!w.enabled || !w.defId || isMissileDef(w.defId) || isIonDef(w.defId)) continue;
    shots += w.defId === "LASER_BURST_1" ? 1 : 3;
  }
  return shots > shields;
}

/** A basic laser and a bomb share the dock, and the bubble still eats the laser. */
export function needsBomb(weapons, shields) {
  if ((shields ?? 0) <= 0) return false;
  const list = weapons || [];
  if (!list.some((w) => w.defId === "LASER_BURST_1")) return false;
  if (!list.some((w) => isMissileDef(w.defId))) return false;
  return !volleyCanPierce(list, shields);
}

/**
 * Stay with the basic laser and the bomb until two hull points land, or until our own hull is at half.
 * The no-damage clock and the six-point leave both used to jump while the bolt was still hitting the bubble.
 */
export function bombPierceWait(snap, state) {
  if (!snap?.enemy) return false;
  const list = snap.weapons || [];
  if (!list.some((w) => w.defId === "LASER_BURST_1")) return false;
  if (!list.some((w) => isMissileDef(w.defId))) return false;
  const ratio = (snap.hull || 0) / Math.max(1, snap.hullMax || 1);
  if (ratio < 0.5) return false;
  const start = state?.fightHull;
  if (start != null && snap.enemy.hull <= start - 2) return false;
  return true;
}

/** Stun lands on the crew. Lockdown lands on their guns. Other bombs keep the shared aim order. */
export function bombRoom(defId) {
  if (defId === "BOMB_STUN") return "crew";
  if (defId === "BOMB_LOCK") return "weapons";
  return null;
}

function boarderRooms(snap) {
  return new Set(
    (snap?.crew || [])
      .filter((c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0)
      .map((c) => c.room),
  );
}

/** Rooms the boarding party is in, or walking into. A bomb on either one hits them. */
function boarderBound(snap) {
  const ids = boarderRooms(snap);
  for (const c of snap?.crew || []) {
    if (c.side !== "player" || c.aboard !== "enemy" || (c.hp || 0) <= 0) continue;
    if ((c.path || 0) > 0 && c.dest) ids.add(c.dest);
  }
  return ids;
}

/** A broken pad cannot recall. The fight is still on, so the boarders should walk to the gunners. */
export function boardChase(snap) {
  if (!snap || snap.phase !== "combat" || !snap.enemy) return false;
  return (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
}

/**
 * A stun bomb hits every body in the room, including our own boarders.
 * Prefer enemy crew who are somewhere else. Never drop it on the boarding party.
 */
export function stunTarget(snap) {
  const rooms = snap?.enemyRooms || [];
  if (!rooms.length) return null;
  const bound = boarderBound(snap);
  // Their gunners are the crew who walk into the melee. A stun on that room holds them there.
  const weapons = rooms.find((r) => r.system === "weapons" && !bound.has(r.id));
  if (weapons) return weapons;
  const foe = (snap?.crew || []).find(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0 && !bound.has(c.room),
  );
  if (foe) {
    const room = rooms.find((r) => r.id === foe.room);
    if (room) return room;
  }
  return rooms.find((r) => !bound.has(r.id)) || null;
}

/** Lockdown stays on their guns until our crew walk in. Coating that room seals the door on them. */
export function lockTarget(snap) {
  const rooms = snap?.enemyRooms || [];
  if (!rooms.length) return null;
  const bound = boarderBound(snap);
  return rooms.find((r) => r.system === "weapons" && !bound.has(r.id)) || null;
}

/** Shields first while the bomb is peeling a bubble the basic laser cannot break. */
export function aimOrder(weapons, shields) {
  const bomb = (weapons || []).some((w) => w.enabled && isMissileDef(w.defId));
  if (bomb && (shields ?? 0) > 0 && (weapons || []).some((w) => w.defId === "LASER_BURST_1")) {
    return ["shields", "weapons", "pilot", "oxygen", "engines", "medbay"];
  }
  return ["weapons", "shields", "pilot", "oxygen", "engines", "medbay"];
}

/** What to click while a bomb and a laser share one bar. Right-click frees it. Left-click arms the bomb. */
export function bombAction(weapons, costs, cap, shields) {
  if ((shields ?? 0) >= 2 || needsBomb(weapons, shields)) {
    const off = freeBomb(weapons, costs, cap);
    if (off != null) return { slot: off, button: "right" };
    const list = weapons || [];
    let used = 0;
    for (const w of list) if (w.enabled) used += costs[w.slot] || 0;
    const bomb = list.find((w) => !w.enabled && isMissileDef(w.defId));
    if (bomb && (costs[bomb.slot] || 0) <= cap - used) return { slot: bomb.slot, button: "left" };
    return null;
  }
  const off = bombDone(weapons, costs, cap, shields ?? 0);
  if (off != null) return { slot: off, button: "right" };
  return null;
}

export function hullGunAction(weapons, costs, power, spare, cap) {
  const list = weapons || [];
  const budget = Math.min(Math.max(0, cap), (power || 0) + Math.max(0, spare || 0));
  const hull = list.filter((w) => w.defId && !isIonDef(w.defId));
  if (!hull.length || hull.some((w) => w.enabled)) return null;
  const affordable = hull.filter((w) => {
    const cost = costs[w.slot] || 0;
    return cost > 0 && cost <= budget;
  });
  if (!affordable.length) return null;
  const ions = list.filter((w) => isIonDef(w.defId) && w.enabled);
  if (ions.length) return { slot: ions[ions.length - 1].slot, button: "right" };
  const beams = affordable.filter((w) => !isMissileDef(w.defId));
  const pool = beams.length ? beams : affordable;
  const pick = [...pool].sort((a, b) => costs[a.slot] - costs[b.slot] || a.slot - b.slot)[0];
  return { slot: pick.slot, button: "left" };
}

export function powerWant(snap, fleeing = false, weaponBars = null) {
  const shields = snap.systems.shields;
  const engines = snap.systems.engines;
  const weapons = snap.systems.weapons;
  const medbay = snap.systems.medbay;
  const boarded = intruders(snap).length > 0;
  const mounted = (snap.weapons || []).length;
  const weaponCap = Math.max(0, (weapons?.level || 0) - (weapons?.damage || 0));
  // dockPower is the dearest gun on the dock. One bar never turns a 2-power gun on, and the click is a no-op.
  const dockNeed = Number(snap.dockPower) || 0;
  const unfeedable = mounted > 0 && dockNeed > weaponCap;
  const fundGun = mounted > 0 && !unfeedable;
  // A gun that needs more than two bars (Glaive, Halberd) stays funded after it turns on.
  // Omit weaponBars and the Burst laser still takes two, then the rest of the system if a missile is aboard.
  // While a beam is still dark, adding bars here turns the ions on first and the beam never claims them.
  const holdGuns = holdWeaponBars(snap, snap.dockPower);
  const haveGuns = weapons?.power || 0;
  const firstBars = holdGuns
    ? haveGuns
    : fundGun
      ? weaponBars == null
        ? Math.min(2, weapons.level)
        : Math.min(weapons.level || 0, weaponBars)
      : 0;
  const basePool =
    (snap.storm ? Math.ceil((snap.reactor || 0) / 2) : snap.reactor || 0) + (snap.batteryBars || 0);
  // Oxygen and one engine bar stay on the reactor. A drone wish cannot spend those, or a 2-bar ship suffocates.
  // The mounted gun is funded next. Only the bars still free are left for the drone key.
  const life = (snap.systems.oxygen ? 1 : 0) + (snap.systems.engines ? 1 : 0);
  const reserveRoom = Math.max(0, basePool - life - (holdGuns ? 0 : firstBars));
  const reserved = Math.min(droneReserve(snap) + (snap.kitDraw || 0), reserveRoom);
  const pool = Math.max(0, basePool - reserved);
  const want = { oxygen: 0, engines: 0, shields: 0, weapons: 0, medbay: 0 };
  const give = (id, bars) => {
    const sys = snap.systems[id];
    if (!sys) return;
    const cap = Math.max(0, (sys.level || 0) - (sys.damage || 0));
    const used = Object.values(want).reduce((n, v) => n + v, 0);
    let add = Math.min(Math.max(0, bars), cap - want[id], pool - used);
    // Shields, Overview: one click moves a whole pair of bars. An odd target never sticks.
    // A level-1 shield system has only the one bar. Flooring that to zero turns the bubble off.
    if (id === "shields" && cap >= 2) add = Math.floor(add / 2) * 2;
    if (add > 0) want[id] += add;
  };
  // A dark ion sits to the left of the beam. One more bar turns that ion on, and the
  // next depower click shuts the beam off. Stay on the bars the beam already holds.
  // give() adds. A second call must not stack bars on top of a beam that is already fed.
  const guns = snap.weapons || [];
  const hullLive = guns.some((w) => w.defId && !isIonDef(w.defId) && w.enabled);
  const needsHull = guns.some((w) => w.defId && !isIonDef(w.defId));
  const ionDark = guns.some((w) => isIonDef(w.defId) && !w.enabled);
  const hullCost = Number(snap.dockPower) || 0;
  const hullFed = !needsHull || (hullLive && haveGuns >= Math.max(hullCost, 1));
  // A Zoltan in the weapons room finishes a 2-power ion on one reactor bar.
  // Another click does not move the system, and it blocks the aim that keeps the ion firing.
  const ionOnly = guns.length > 0 && guns.every((w) => !w.defId || isIonDef(w.defId));
  const ionLive = ionOnly && haveGuns > 0 && guns.some((w) => w.enabled);
  const giveGuns = (bars) => {
    if (holdGuns) {
      give("weapons", haveGuns);
      return;
    }
    if (ionLive) {
      give("weapons", Math.max(0, haveGuns - want.weapons));
      return;
    }
    if (needsHull && hullFed && ionDark) {
      give("weapons", Math.max(0, Math.min(bars, haveGuns) - want.weapons));
      return;
    }
    give("weapons", bars);
  };
  // The second engine bar is clicked before weapons. Leave it until the beam is fed.
  // A reactor that cannot hold the ion loses that bar every time the battery cools, and the click war never aims.
  const secondEngine = !holdGuns && hullFed && !ionStarve(snap);
  // A reactor that cannot hold the ion has no spare pair for a shield bubble. Those clicks never stick.
  const starved = ionStarve(snap);
  if (boarded && !snap.enemy) {
    // The medbay heals without air. Oxygen stays dark so an open hull can drop below the suffocation line.
    give("medbay", medbay?.level || 0);
    return want;
  }
  if (boarded) {
    give("oxygen", 1);
    give("engines", 1);
    // The Heavy Ion takes the first two bars. The Heavy Laser still needs one more or the hull never drops.
    giveGuns(firstBars);
    if (!starved) give("shields", Math.min(snap.storm ? 2 : 4, shields.level));
    if (fundGun) giveGuns(weapons.level);
    give("medbay", Math.min(snap.storm ? 1 : medbay?.level || 0, medbay?.level || 0));
    return want;
  }
  // One engine bar charges the drive. The first gun bar comes before a second engine bar or the shot never leaves.
  if (fleeing) {
    give("oxygen", 1);
    // No shield bubble. The engine bars are the evasion, and they also finish the jump.
    // A second cloak bar is ten seconds of cover. The Glaive needs that more than the extra evade.
    const bare = (shields?.level ?? 0) < 1;
    // A shieldless hull spends every spare bar on evasion. A cloak that still wants a bar keeps it.
    // A fed bubble with a gun the console cannot power spends the second bar on the drive.
    give(
      "engines",
      bare && cloakSpare(snap) < 1
        ? engines?.level || 1
        : unfeedable && cloakSpare(snap) < 1
          ? Math.min(2, engines?.level || 1)
          : 1,
    );
    giveGuns(firstBars);
    if (!bare && secondEngine) give("engines", Math.min(2, engines.level));
    if (!starved) give("shields", Math.min(snap.storm ? 2 : 4, shields.level));
    return want;
  }
  // A storm halves the reactor. One shield bubble has to come before the guns or the hull melts while the drive charges.
  if (snap.storm) {
    give("oxygen", 1);
    give("engines", 1);
    if (!starved) give("shields", Math.min(2, shields.level));
    giveGuns(firstBars);
    if (secondEngine) give("engines", Math.min(2, engines.level));
    if (fundGun) giveGuns(weapons.level);
    return want;
  }
  // One engine bar has to stay powered or a charged drive can never jump.
  // The Burst laser needs two bars. One leftover bar never turns it on, so it is funded before shields.
  give("oxygen", 1);
  give("engines", 1);
  giveGuns(firstBars);
  const shieldCap = snap.storm ? (snap.sector >= 3 && shields.level >= 4 && pool >= 8 ? 4 : 2) : 4;
  if (!starved) give("shields", Math.min(shieldCap, shields.level));
  giveGuns(
    fundGun && weaponBars == null
      ? snap.missiles > 0
        ? weapons.level
        : Math.min(2, weapons.level)
      : firstBars,
  );
  if (secondEngine) give("engines", Math.min(2, engines.level));
  if ((shields?.level ?? 0) < 1 && cloakSpare(snap) < 1) give("engines", engines?.level || 0);
  // A second gun that costs one bar (Heavy Laser beside Heavy Ion) stays dark on the Burst budget.
  if (fundGun) giveGuns(weapons.level);
  if (playerCrew(snap).some((c) => c.hp < c.maxHp * 0.92)) give("medbay", 1);
  return want;
}

let powerTried = "";
let powerStall = 0;

async function powerAct(page, snap, fleeing = false) {
  if (snap.phase !== "combat" && snap.phase !== "map") return false;
  if (snap.picking || snap.sectorMap || snap.shipSheet) return false;
  const budget = await weaponBudget(page, snap);
  snap.dockPower = dockPower;
  const want = powerWant(snap, fleeing, budget);
  holdGunFloor(snap, want);
  let id = "";
  let kind = "";
  for (const key of Object.keys(want)) {
    const have = snap.systems[key]?.power ?? 0;
    if (have <= want[key]) continue;
    if ((snap.systems[key]?.damage ?? 0) >= (snap.systems[key]?.level ?? 0)) continue;
    id = key;
    kind = "depower";
    break;
  }
  if (!id && sparePower(snap) > 0) {
    for (const key of ["oxygen", "engines", "medbay", "shields", "weapons"]) {
      const sys = snap.systems[key];
      const room = Math.max(0, (sys.level || 0) - (sys.damage || 0) - (sys.ion || 0));
      if (!sys || sys.power >= want[key] || sys.power >= room) continue;
      // A Zoltan already supplies the last bar. Another click does not move the system.
      // A smashed console cannot hold the Glaive. The click reverts and the repair never starts.
      const gunCost = Number(snap.dockPower) || 0;
      const gunCap = Math.max(0, (sys.level || 0) - (sys.damage || 0));
      if (
        key === "weapons" &&
        gunCost > 0 &&
        (sys.power + weaponZoltan(snap) >= gunCost || gunCap + weaponZoltan(snap) < gunCost)
      )
        continue;
      id = key;
      kind = "power";
      break;
    }
  }
  if (!id) return false;
  const token = `${kind}:${id}:${snap.systems[id]?.power ?? 0}`;
  if (token !== powerTried) {
    powerTried = token;
    powerStall = 0;
  }
  powerStall += 1;
  // Two clicks, then four quiet loops so a repair or a jump can run, then try the bar again.
  if ((powerStall - 1) % 6 >= 2) return false;
  console.log(`${kind} ${id} ${snap.systems[id]?.power ?? 0}->${want[id]}`);
  return click(
    page.locator(
      `.power-dock button[aria-label="${POWER_LABEL[id]}: add power (right-click removes)"]`,
    ),
    `${kind} ${POWER_LABEL[id]}`,
    kind === "depower" ? { button: "right" } : {},
  );
}

function doorsDead(snap) {
  const doors = snap.systems?.doors;
  return !!doors && (doors.level ?? 0) > 0 && (doors.damage ?? 0) >= doors.level;
}

/** Where the door controls should go. Pure boarding opens the hull once the crew are standing in a live medbay. */
export function ventWant(snap) {
  if (snap.picking || snap.sectorMap || snap.shipSheet) return null;
  if (doorsDead(snap)) return null;
  const foes = intruders(snap);
  if (foes.length && !snap.enemy) {
    const med = roomBySystem(snap, "medbay");
    const bay = snap.systems.medbay;
    const crew = playerCrew(snap);
    const hiding =
      !!med &&
      !!bay &&
      (bay.power ?? 0) >= 1 &&
      (bay.damage ?? 0) < (bay.level ?? 0) &&
      crew.length > 0 &&
      crew.every((c) => c.room === med.id && c.path === 0);
    if (!hiding || snap.airOpen) return null;
    return "open";
  }
  if (snap.airOpen || snap.roomOpen) return "shut";
  return null;
}

async function ventAct(page, snap) {
  const want = ventWant(snap);
  if (want === "open") {
    // Z is the door-all key: the first press opens interior doors, the next opens the airlocks.
    console.log(snap.roomOpen ? "vent airlocks" : "vent interior");
    await page.keyboard.press("z");
    return true;
  }
  if (want !== "shut") {
    if (snap.vent) return click(page.locator('button[aria-label="Doors"]'), "leave door controls");
    return false;
  }
  // X shuts airlocks first, then the interior doors.
  console.log(snap.airOpen ? "seal airlocks" : "seal interior");
  await page.keyboard.press("x");
  return true;
}

async function gunCost(page, slot) {
  const text = await page
    .locator(`button.gun-slot[data-slot="${slot}"] .power-num`)
    .first()
    .innerText()
    .catch(() => "");
  const n = Number(String(text).trim());
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Highest gun power on the dock. Two or less keeps the Burst-laser budget. */
let dockPower = 0;

/** A dark slot does not print its cost. The Glaive is 4 whether or not the number is on screen. */
const GUN_POWER = { BEAM_3: 4 };

export function knownGunPower(snap) {
  return (snap.weapons || []).reduce((n, w) => Math.max(n, GUN_POWER[w.defId] || 0), 0);
}

async function weaponBudget(page, snap) {
  const known = knownGunPower(snap);
  if ((snap.weapons || []).length === 0) {
    dockPower = 0;
    return null;
  }
  const nums = await page
    .locator(".weapon-dock .power-num")
    .allTextContents()
    .catch(() => []);
  const powers = nums.map((text) => Number(String(text).trim())).filter((n) => n > 0);
  const need = Math.max(known, ...(powers.length ? powers : [0]));
  dockPower = need;
  return need > 2 ? need : null;
}

function offensiveDrone(snap) {
  return (snap.droneIds || []).some((id) => /COMBAT|BOARDER|BEAM|FIRE/.test(id));
}

/** Lockdown and stun bombs never mark hull. Stay while their crew are alive and the pad can still send. */
export function crewBoardWait(snap) {
  if (!snap?.enemy) return false;
  const list = snap.weapons || [];
  if (!list.length || !list.every((w) => isMissileDef(w.defId))) return false;
  const ratio = (snap.hull || 0) / Math.max(1, snap.hullMax || 1);
  if (ratio < 0.5) return false;
  const foe = (snap.crew || []).some(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (!foe) return false;
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (away) return true;
  if ((snap.missiles || 0) <= 0) return false;
  const tele = snap.tele;
  if (!tele || (tele.level || 0) < 1) return false;
  if ((tele.damage || 0) >= (tele.level || 1)) return false;
  return playerCrew(snap).length >= 1;
}

/** Crew already on the enemy ship are the only gun. Six of our hull points is not a reason to recall them. */
export function crewFightWait(snap) {
  if (!snap?.enemy) return false;
  if (canShoot(snap)) return false;
  const ratio = (snap.hull || 0) / Math.max(1, snap.hullMax || 1);
  // Their gun is still the thing killing us. A thin hull can still walk over and break it.
  if (ratio < 0.35 && !enemyGunsLive(snap)) return false;
  const living = (snap.crew || []).some((c) => c.side === "player" && (c.hp || 0) > 0);
  if (!living) return false;
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (away) return true;
  // The walk to the pad is the shot. A smashed pad is the repair, not the jump.
  const tele = snap.tele;
  return !!tele && (tele.level || 0) >= 1;
}

/** A boarding drone wins by emptying the enemy ship. Hull that does not move is not a stalled gun. */
export function boardWait(snap) {
  if (!snap?.enemy) return false;
  if ((snap.weapons || []).length > 0) return false;
  if (!offensiveDrone(snap)) return false;
  if ((snap.dronePower || 0) < 1 && !snap.droneOn && !snap.droneUsed) return false;
  const ratio = (snap.hull || 0) / Math.max(1, snap.hullMax || 1);
  if (ratio < 0.5) return false;
  return (snap.crew || []).some(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
}

/** The Glaive charges for 25s. Leaving at the first scratches spends the cloak and never fires. */
function glaiveYoung(snap, state) {
  const live = (snap.weapons || []).some((w) => w.defId === "BEAM_3" && w.enabled);
  if (!live || !systemUsable(snap, "weapons")) return false;
  return snap.time - (state?.fightAt ?? snap.time) < 32;
}

/** Flak Artillery is the only gun. Level 1 needs 50 game seconds before the burst. */
function flakReady(snap) {
  return (
    (snap.weapons || []).length === 0 &&
    snap.artillery?.weapon === "ARTILLERY_FED_C" &&
    (snap.artillery?.power || 0) >= 1
  );
}

/** Heavy Ion plus a hull gun. The ion shot does not reset the no-damage clock. */
function ionAndHull(snap) {
  const ids = (snap.weapons || []).map((w) => w.defId || "");
  const ion = ids.some((id) => id.startsWith("ION"));
  const hull = ids.some((id) => id && !id.startsWith("ION"));
  return ion && hull;
}

function repairDroneReady(snap) {
  const ids = snap.droneIds || [];
  if (!ids.includes("REPAIR") && !ids.includes("SHIP_REPAIR")) return false;
  return (snap.parts || 0) > 0 || !!snap.droneOn || !!snap.droneUsed;
}

function needsRepair(snap) {
  return ["pilot", "oxygen", "engines", "weapons", "shields", "medbay"].some((id) => {
    const sys = snap.systems?.[id];
    return !!sys && (sys.damage ?? 0) > 0;
  });
}

/** Bars the fitted offensive schematic actually flies on. A level-3 system does not make a beam cost 3. */
function droneBars(snap) {
  const table = {
    COMBAT_1: 2,
    COMBAT_2: 4,
    COMBAT_BEAM: 2,
    COMBAT_BEAM_2: 3,
    BOARDER: 3,
    BOARDER_ION: 3,
    fire: 3,
  };
  let need = 0;
  for (const id of snap.droneIds || []) need = Math.max(need, table[id] || 0);
  if (!need) return 0;
  const level = snap.droneLevel || 0;
  return Math.min(need, Math.max(level, 1));
}

/** Bars Drone Control should hold. A fitted repair drone takes one when a system is broken. */
export function droneWant(snap) {
  const level = snap.droneLevel || 0;
  if (level < 1 && (snap.droneSlots || 0) < 1) return 0;
  if (needsRepair(snap)) {
    if ((snap.droneIds || []).includes("SHIP_REPAIR")) return 2;
    if ((snap.droneIds || []).includes("REPAIR")) return 1;
  }
  const weaponless = (snap.weapons || []).length === 0;
  if ((weaponless && level > 0) || (offensiveDrone(snap) && level > 0)) {
    return Math.min(Math.max(level, 1), 3);
  }
  // Stealth C has no shields. The overcharger is the bubble, and it needs two bars.
  if ((snap.systems?.shields?.level ?? 0) < 1) {
    const ids = snap.droneIds || [];
    if (ids.includes("DRONE_SHIELD_PLAYER") || ids.includes("DRONE_SHIELD"))
      return Math.min(Math.max(level, 1), 2);
    if (ids.includes("ANTI_DRONE")) return Math.min(Math.max(level, 1), 1);
  }
  return 0;
}

function droneReserve(snap) {
  const held = snap.dronePower || 0;
  const want = droneWant(snap);
  if (want > 0) return Math.max(held, want);
  return held;
}

let droneTries = 0;
let droneStall = 0;
let droneSeen = -1;
let flakStall = 0;
let flakSeen = -1;

/** Key Y powers Flak Artillery. Shift+G drops one Teleporter bar when the reactor is full. */
async function artilleryAct(page, snap) {
  const art = snap.artillery;
  if (!art || art.weapon !== "ARTILLERY_FED_C") return false;
  if (snap.phase !== "combat" && snap.phase !== "map") {
    flakStall = 0;
    flakSeen = -1;
    return false;
  }
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  // A destroyed tube has to be repaired. Y does not raise a bar the system no longer has.
  if ((art.damage || 0) >= (art.level || 1)) return false;
  if ((art.power || 0) >= 1) {
    flakStall = 0;
    flakSeen = art.power;
    return false;
  }
  if ((art.power || 0) !== flakSeen) {
    flakSeen = art.power || 0;
    flakStall = 0;
  }
  if (flakStall >= 2) return false;
  if (sparePower(snap) <= 0 && (snap.telePower || 0) > 0) {
    flakStall += 1;
    console.log("depower teleporter");
    await page.keyboard.press("Shift+g");
    return true;
  }
  if (sparePower(snap) <= 0) return false;
  flakStall += 1;
  console.log("power flak");
  await page.keyboard.press("y");
  return true;
}

let batteryTries = 0;
let batterySeen = "";

/** True when Key B should start the cell. Two presses that do not change the ship yield the loop. */
export function batteryPress(snap, tries) {
  const bat = snap.battery;
  if (!bat || bat.level < 1 || bat.on || (bat.left || 0) > 0 || (bat.cool || 0) > 0) return false;
  if (snap.phase !== "combat" && snap.phase !== "map") return false;
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  if (tries >= 2) return false;
  const oxygen = snap.systems?.oxygen;
  if (oxygen && (oxygen.level || 0) > (oxygen.damage || 0) && (oxygen.power || 0) < 1) return false;
  const weapons = snap.systems?.weapons;
  const gunCap = Math.max(0, (weapons?.level || 0) - (weapons?.damage || 0));
  const gunShort = (snap.weapons || []).length > 0 && (weapons?.power || 0) < Math.min(2, gunCap);
  const droneShort = !snap.droneUsed && droneWant(snap) > (snap.dronePower || 0);
  return gunShort || droneShort;
}

/** Key B starts the Backup Battery. A 2-bar reactor cannot feed oxygen, engines, and the ion together. */
async function batteryAct(page, snap) {
  const bat = snap.battery;
  const signature = bat
    ? `${bat.on}:${bat.left}:${bat.cool}:${snap.systems.weapons?.power || 0}`
    : "";
  if (signature !== batterySeen) {
    batterySeen = signature;
    batteryTries = 0;
  }
  if (!batteryPress(snap, batteryTries)) return false;
  batteryTries += 1;
  console.log("battery");
  await page.keyboard.press("b");
  return true;
}

/** Left-click a dark beam or laser. Right-click an ion that is holding the bars it needs. */
async function gunPowerAct(page, snap) {
  if (snap.phase !== "combat" && snap.phase !== "map") return false;
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  const weapons = snap.weapons || [];
  if (!weapons.length) return false;
  const costs = {};
  for (const w of weapons) costs[w.slot] = await gunCost(page, w.slot);
  const cap = Math.max(0, (snap.systems.weapons?.level || 0) - (snap.systems.weapons?.damage || 0));
  if (skipUnfedGun(cap, dockPower)) return false;
  // One bolt never marks hull through a bubble. The bomb takes the bar until the bubble drops,
  // then the laser takes it back. Two layers out of fuel still uses the same swap.
  const layers = snap.enemy?.shields ?? 0;
  const peel = snap.enemy && (needsBomb(weapons, layers) || ((snap.fuel || 0) <= 0 && layers >= 2));
  const handoff =
    snap.enemy && layers <= 0 && weapons.some((w) => w.enabled && isMissileDef(w.defId));
  if (peel || handoff) {
    const swap = bombAction(weapons, costs, cap, layers);
    if (swap) {
      console.log(swap.button === "left" ? "arm bomb" : "free the bomb");
      return click(page.locator(`button.gun-slot[data-slot="${swap.slot}"]`), "bomb swap", {
        button: swap.button,
      });
    }
  }
  const action = hullGunAction(
    weapons,
    costs,
    snap.systems.weapons?.power || 0,
    sparePower(snap),
    cap,
  );
  if (!action) return false;
  console.log(`${action.button === "right" ? "depower ion" : "arm hull gun"} slot ${action.slot}`);
  return click(
    page.locator(`button.gun-slot[data-slot="${action.slot}"]`),
    `gun slot ${action.slot}`,
    action.button === "right" ? { button: "right" } : {},
  );
}

/** Bars still free to add to the cloak before it is started. A running cloak keeps what it has. */
function cloakSpare(snap) {
  const kit = snap.cloak;
  if (!kit || snap.phase !== "combat" || !snap.enemy) return 0;
  if (kit.on || (kit.cool || 0) > 0) return 0;
  const bars = Math.max(0, (kit.level || 0) - (kit.damage || 0));
  return Math.max(0, Math.min(2, bars) - (kit.power || 0));
}

/** Key H adds one cloak bar. Shift+H removes one. Key C starts the cloak. A lockout stays untouched. */
export function cloakWant(snap) {
  const kit = snap.cloak;
  if (!kit || snap.phase !== "combat" || !snap.enemy) return null;
  if (kit.on || (kit.cool || 0) > 0) return null;
  const bars = Math.max(0, (kit.level || 0) - (kit.damage || 0));
  if (bars < 1) return null;
  const cost = Number(snap.dockPower) || knownGunPower(snap);
  const have = (snap.systems.weapons?.power || 0) + weaponZoltan(snap);
  const armed = (snap.weapons || []).length > 0;
  // Cloak power locks for the whole cooldown. Starting it while the Glaive is short parks that bar for twenty seconds.
  // A missile the console can never feed is cargo. Holding the cloak for it leaves the hull open.
  if (armed && gunReachable(snap) && cost > 0 && have < cost)
    return (kit.power || 0) > 0 ? "drop" : null;
  if (!armed && cost > 0 && have < cost) return (kit.power || 0) > 0 ? "drop" : null;
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  // The pad cannot send through a cloak. While the party is still walking, the cloak saves the system.
  // A cooldown longer than the cloak still eats hull. The cloak ends before the pad is ready.
  const darkGun = !armed || !gunReachable(snap);
  if (darkGun && !away) {
    const cool = snap.tele?.cool || 0;
    const cloakFor = Math.max(5, 5 * (kit.power || 0));
    const onPad = (snap.crew || []).some(
      (c) => c.side === "player" && c.aboard === "player" && c.pad && (c.path || 0) === 0,
    );
    if (onPad && cool <= cloakFor) return null;
    if (!onPad && cool > 0 && cool <= cloakFor) return null;
  }
  if ((snap.weapons || []).length === 0 && away) {
    const mates = (snap.crew || []).filter(
      (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
    );
    const foeAboard = (snap.crew || []).some(
      (f) => f.side !== "player" && f.aboard === "enemy" && (f.hp || 0) > 0,
    );
    const brawling = mates.some((c) =>
      (snap.crew || []).some(
        (f) => f.side !== "player" && f.aboard === "enemy" && (f.hp || 0) > 0 && f.room === c.room,
      ),
    );
    const bleeding = mates.some((c) => (c.maxHp || 0) > 0 && c.hp < c.maxHp * 0.8);
    // A cloak blocks the pull. Leave it folded while they are still in the brawl.
    // An empty scout has nothing to pull them out of, and the beam is the hull.
    if (foeAboard && (brawling || bleeding)) return null;
  }
  // Two bars is ten seconds. One bar runs out while the Glaive is still charging.
  if ((kit.power || 0) < Math.min(2, bars) && sparePower(snap) >= 1) return "power";
  if ((kit.power || 0) < 1) return null;
  return "cast";
}

async function cloakAct(page, snap) {
  const want = cloakWant(snap);
  if (!want || snap.picking || snap.shipSheet) return false;
  if (want === "drop") {
    console.log("depower cloak");
    await page.keyboard.press("Shift+h");
    return true;
  }
  if (want === "power") {
    console.log("power cloak");
    await page.keyboard.press("h");
    return true;
  }
  console.log("cloak");
  await page.keyboard.press("c");
  return true;
}

let slingArmed = false;
let saidStrand = false;
let boardMoveRoom = "";
let boardMoveTries = 0;
let coatRoom = "";
let coatAt = -1;

/** The party is standing in an empty room. Walk them onto the crew. Two tries, then leave the tick free. */
async function moveBoarders(page, snap) {
  const ours = boarderRooms(snap);
  if (!ours.size) {
    boardMoveRoom = "";
    boardMoveTries = 0;
    return false;
  }
  const foe = (snap.crew || []).find(
    (c) => c.side !== "player" && c.aboard === "enemy" && (c.hp || 0) > 0 && !ours.has(c.room),
  );
  const sharing = (snap.crew || []).some(
    (c) =>
      c.side === "player" &&
      c.aboard === "enemy" &&
      (c.hp || 0) > 0 &&
      (snap.crew || []).some(
        (f) => f.side !== "player" && f.aboard === "enemy" && (f.hp || 0) > 0 && f.room === c.room,
      ),
  );
  if (sharing) {
    const crystal = (snap.crew || []).find(
      (c) =>
        c.kin === "crystal" &&
        c.side === "player" &&
        c.aboard === "enemy" &&
        (c.hp || 0) > 0 &&
        (c.lockCool || 0) <= 0 &&
        (snap.crew || []).some(
          (f) =>
            f.side !== "player" && f.aboard === "enemy" && (f.hp || 0) > 0 && f.room === c.room,
        ),
    );
    const guns = (snap.enemyRooms || []).find((r) => r.system === "weapons");
    const gunsLive = guns && (guns.level || 1) > (guns.damage || 0);
    const crystalRoom = (snap.enemyRooms || []).find((r) => r.id === crystal?.room);
    // A lock on the helm trapped them there. Coat the guns, where the fight has to happen.
    // Both crystals locking one room spends the second cooldown before the coat even shows.
    const coated = coatRoom === crystal?.room && Date.now() - coatAt < 15000;
    if (
      crystal &&
      !coated &&
      (crystalRoom?.coat || 0) <= 0 &&
      (!gunsLive || crystal.room === guns.id)
    ) {
      const pip = page
        .locator(".crew-card", { hasText: crystal.name })
        .locator("button[aria-label='Lockdown']");
      if ((await pip.count()) > 0 && (await pip.isEnabled().catch(() => false))) {
        coatRoom = crystal.room;
        coatAt = Date.now();
        console.log(`lockdown ${crystal.name}`);
        return click(pip, `lockdown ${crystal.name}`);
      }
    }
    return false;
  }
  const sealed = (snap.enemyRooms || []).some((r) => ours.has(r.id) && (r.coat || 0) > 0);
  if (sealed) return false;
  // A ship with no gun has to break their weapons. Following a runner never lands the hit.
  if (!canShoot(snap)) {
    const guns = (snap.enemyRooms || []).find((r) => r.system === "weapons");
    const gunsLive = guns && (guns.level || 1) > (guns.damage || 0);
    if (guns && gunsLive) {
      if (ours.has(guns.id)) return false;
      const walking = (snap.crew || []).some(
        (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0 && (c.path || 0) > 0,
      );
      if (walking) return false;
      console.log(`move boarders to ${guns.title}`);
      await page.keyboard.press("q");
      for (const c of playerCrew(snap)) {
        await page
          .locator(".crew-card-hit", { hasText: c.name })
          .click({ modifiers: ["Shift"], timeout: 3000 })
          .catch(() => {});
      }
      return click(
        page
          .locator(".target-body")
          .locator(`button.room-hit[aria-label="Target ${cssAttr(guns.title)}"]`),
        `boarders to ${guns.title}`,
        { button: "right" },
      );
    }
  }
  if (!foe) return false;
  // A new order every time the foe steps aside turns the walk around before it arrives.
  const walking = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0 && (c.path || 0) > 0,
  );
  if (walking) return false;
  const room = (snap.enemyRooms || []).find((r) => r.id === foe.room);
  if (!room) return false;
  if (boardMoveRoom !== room.id) {
    boardMoveRoom = room.id;
    boardMoveTries = 0;
  }
  boardMoveTries += 1;
  // Two clicks, then the repair gets the tick. A coated door used to spend both tries and never walk.
  if ((boardMoveTries - 1) % 6 >= 2) return false;
  await page.keyboard.press("q");
  for (const c of playerCrew(snap)) {
    await page
      .locator(".crew-card-hit", { hasText: c.name })
      .click({ modifiers: ["Shift"], timeout: 3000 })
      .catch(() => {});
  }
  console.log(`move boarders to ${room.title}`);
  return click(
    page
      .locator(".target-body")
      .locator(`button.room-hit[aria-label="Target ${cssAttr(room.title)}"]`),
    `boarders to ${room.title}`,
    { button: "right" },
  );
}

let cloneToken = "";
let cloneStall = 0;

/** Theseus leaves the clone bay dark. One engine bar funds it so a death walks back onto the hull. */
async function cloneAct(page, snap) {
  const bay = snap.clone;
  if (!bay || (bay.level || 0) < 1) return false;
  if ((snap.systems.medbay?.level || 0) > 0) return false;
  if (!snap.tele) return false;
  if ((bay.damage || 0) >= (bay.level || 1)) return false;
  if ((bay.power || 0) >= 1) return false;
  if (snap.phase !== "combat" && snap.phase !== "map") return false;
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  const ratio = (snap.hull ?? NaN) / Math.max(1, snap.hullMax || 1);
  const airDown = (snap.systems.oxygen?.damage || 0) > 0;
  // After the fight nobody is away, so a dark bay used to stay dark and the next death stuck.
  const urgent =
    snap.phase === "map" && !snap.enemy && (airDown || (Number.isFinite(ratio) && ratio < 0.25));
  if (!away && !boardParty(snap) && !urgent) return false;
  // Two presses, then the repair and the jump get the tick. A dark bay after the fight kept retrying forever.
  if (urgent && !away && !boardParty(snap)) {
    const token = `${snap.here || ""}:${bay.power || 0}`;
    if (token !== cloneToken) {
      cloneToken = token;
      cloneStall = 0;
    }
    cloneStall += 1;
    if ((cloneStall - 1) % 6 >= 2) return false;
  }
  if (sparePower(snap) < 1) {
    if ((snap.systems.engines?.power || 0) <= 1) return false;
    console.log("depower engines for the clone bay");
    await page.keyboard.press("Shift+s");
    return true;
  }
  console.log("power clone bay");
  await page.keyboard.press("d");
  return true;
}

let padHold = null;

/**
 * The send click has already landed. Later right-clicks onto that pad are refused until the
 * fight ends, so the pilot is not walked onto a room the shot is about to destroy.
 * The walk itself never reaches this. A check inside the order used to move which room was hit.
 */
async function sealPad(page) {
  if (!padHold) {
    padHold = { on: false, sent: false, parkedDest: "", quiet: false, teleId: "" };
    const proto = Object.getPrototypeOf(page.locator("html"));
    const orig = proto.click;
    if (typeof orig !== "function") throw new Error("locator click missing");
    const hold = padHold;
    const roomIdOf = (locator) =>
      locator
        .evaluate((btn) => {
          if (!btn || !btn.closest) return "";
          const well = btn.closest(".ship-well");
          if (!well || !well.closest(".sky") || well.closest(".target-body")) return "";
          return btn.closest("[data-room]")?.getAttribute("data-room") || "";
        })
        .catch(() => "");
    const press = page.keyboard.press.bind(page.keyboard);
    page.keyboard.press = async (key, options) => {
      // Q on every refused pad order kept the tick longer than the drive charge.
      if (hold.quiet && String(key).toLowerCase() === "q") return;
      return press(key, options);
    };
    proto.click = async function (options = {}) {
      // Installed after the send. A power click with an unfed Pike becomes the cloak, before the hack lands.
      if (hold.on && (options.button || "left") === "left") {
        const cast = await this.evaluate((el) => {
          if (!el || !el.closest || !el.closest(".power-dock")) return false;
          const game = window.__stl?.game?.();
          if (!game || game.phase !== "combat" || !game.enemy) return false;
          const weapons = game.player?.weapons || [];
          if (!weapons.some((w) => w.defId === "BEAM_LONG")) return false;
          const wsys = game.player?.systems?.weapons;
          const cap = Math.max(0, (wsys?.level || 0) - (wsys?.damage || 0));
          if (cap >= 2) return false;
          const cloak = game.player?.kits?.cloaking;
          if (!cloak || cloak.on || (cloak.cool || 0) > 0 || (cloak.power || 0) < 1) return false;
          return Math.max(0, (cloak.level || 0) - (cloak.damage || 0)) >= 1;
        }).catch(() => false);
        if (cast) {
          console.log("cloak");
          await press("c");
          return;
        }
      }
      if (hold.on && (options.button || "left") === "right") {
        if (hold.quiet && hold.teleId) {
          const id = await roomIdOf(this);
          if (id && id === hold.teleId) {
            const fighting = await this.page()
              .evaluate(() => {
                const game = window.__stl?.game?.();
                return !!(game && game.phase === "combat" && game.enemy);
              })
              .catch(() => false);
            if (fighting) hold.quiet = false;
            else throw new Error("pad sealed");
          }
        }
        const live = await this.page().evaluate(() => {
          const game = window.__stl?.game?.();
          const fighting = !!(game && game.phase === "combat" && game.enemy);
          const rooms = game?.player?.rooms || [];
          const tele = rooms.find((r) => r.kit === "teleporter");
          const kit = game?.player?.kits?.teleporter;
          const systems = game?.player?.systems || {};
          const pilot = rooms.find((r) => r.system === "pilot");
          const engines = rooms.find((r) => r.system === "engines");
          const oxygen = rooms.find((r) => r.system === "oxygen");
          const homeCrew = (game?.crew || []).filter(
            (c) => c.side === "player" && c.hp > 0 && c.aboard === "player",
          );
          const home = homeCrew[0];
          const stood = home && !(home.path || []).length ? home.room : "";
          const air = rooms.length ? Math.min(...rooms.map((r) => r.o2 ?? 100)) : 100;
          const down = (sys) => !!sys && (sys.damage || 0) >= (sys.level || 1);
          const foes = (game?.crew || []).filter(
            (c) => c.side !== "player" && c.aboard === "player" && (c.hp || 0) > 0,
          );
          const foe =
            foes.find((c) => rooms.some((r) => r.id === c.room && (r.system || r.kit))) || foes[0];
          const burning = rooms.find((r) => (r.fire || 0) > 0 && (r.system || r.kit));
          const wsys = systems.weapons;
          const away = (game?.crew || []).some(
            (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
          );
          return {
            fighting,
            hazard: !!(game?.pulsar || game?.asteroid || game?.flare || game?.asb),
            tele: tele?.id || "",
            teleDown: !!kit && (kit.damage || 0) >= (kit.level || 1),
            gunsLive:
              (game?.player?.weapons || []).length > 0 &&
              !!wsys &&
              (wsys.damage || 0) < (wsys.level || 1),
            unfedPike:
              (game?.player?.weapons || []).some((w) => w.defId === "BEAM_LONG") &&
              Math.max(0, (wsys?.level || 0) - (wsys?.damage || 0)) < 2,
            away,
            pilot: pilot?.id || "",
            engines: engines?.id || "",
            oxygen: oxygen?.id || "",
            foeRoom: foe?.room || "",
            fireRoom: burning?.id || "",
            stood,
            lone: homeCrew.length === 1,
            airDown: air < 50 || down(systems.oxygen),
            enginesDown: down(systems.engines),
          };
        });
        const sent = hold.sent;
        if (!live.fighting) hold.sent = false;
        // The Pike cannot fire from a level-1 console. The engines walk is where the last crystal died.
        if (live.fighting && live.unfedPike && live.engines) {
          const stepped = await roomIdOf(this);
          if (stepped && stepped === live.engines) throw new Error("pad sealed");
        }
        // The last crystal was sealing a hall breach and walking back to the chair, so the drive never finished.
        // A later fight with no gun and a dead pad did the same walk and lost her.
        const chair =
          live.pilot &&
          live.lone &&
          !live.enginesDown &&
          ((!live.fighting && live.hazard) ||
            (live.fighting && live.teleDown && !live.gunsLive && !live.away));
        if (chair) {
          const held = await roomIdOf(this);
          if (held && held !== live.pilot) {
            if (live.stood !== live.pilot && hold.parkedDest !== live.pilot) {
              hold.parkedDest = live.pilot;
              const roomBtn = this.page().locator(
                `.sky .ship-well [data-room="${live.pilot}"] button.room-hit`,
              );
              await orig.call(roomBtn, { button: "right", timeout: 800 }).catch(() => {});
              console.log(`park ${live.pilot}`);
            }
            throw new Error("pad sealed");
          }
        }
        const blockWalk = (sent && live.fighting) || (live.teleDown && live.hazard);
        if (blockWalk) {
          const id = await roomIdOf(this);
          if (id && id === live.tele) {
            // One park per destination. Repeating it left her in the hall while the boarder broke the engines.
            let dest = "";
            if (!live.fighting) {
              if (live.airDown && live.oxygen) dest = live.oxygen;
              else if (live.foeRoom) dest = live.foeRoom;
              else if (live.fireRoom) dest = live.fireRoom;
              else if (live.enginesDown && live.engines) dest = live.engines;
              else dest = live.pilot;
              if (
                dest &&
                dest === live.stood &&
                !live.foeRoom &&
                !live.fireRoom &&
                !live.airDown &&
                !live.enginesDown
              ) {
                hold.teleId = live.tele;
                hold.quiet = true;
              }
            }
            if (dest && dest !== live.stood && hold.parkedDest !== dest) {
              hold.parkedDest = dest;
              const roomBtn = this.page().locator(
                `.sky .ship-well [data-room="${dest}"] button.room-hit`,
              );
              await orig.call(roomBtn, { button: "right", timeout: 800 }).catch(() => {});
              console.log(`park ${dest}`);
            }
            throw new Error("pad sealed");
          }
        }
      }
      return orig.call(this, options);
    };
  }
  padHold.on = true;
  padHold.sent = true;
}

/** Key G powers the pad. Key T aims it. The next click sends whoever is standing on a pad. Key R brings them home. */
async function boardAct(page, snap) {
  const recall = boardRecall(snap);
  if (recall === "power") {
    const fightOver = snap.phase !== "combat" || !snap.enemy;
    if (sparePower(snap) < 1) {
      // The fight is over and the reactor is full. A bar from a lit system lets the pad pull them home.
      if (!fightOver) return false;
      const donor = ["medbay", "shields", "engines", "weapons", "oxygen"].find(
        (id) => (snap.systems?.[id]?.power || 0) > 0,
      );
      if (!donor) return false;
      console.log(`free a bar from ${donor}`);
      return click(
        page.locator(
          `.power-dock button[aria-label="${POWER_LABEL[donor]}: add power (right-click removes)"]`,
        ),
        `depower ${POWER_LABEL[donor]} for the pad`,
        { button: "right" },
      );
    }
    slingArmed = false;
    console.log("power teleporter");
    await page.keyboard.press("g");
    return true;
  }
  if (recall === "home") {
    slingArmed = false;
    console.log("recall boarders");
    await page.keyboard.press("r");
    return true;
  }
  // A broken pad cannot press R. The boarders are still on that hull, so walk them onto the gunners.
  if (recall === "wait") {
    const fightOver = snap.phase !== "combat" || !snap.enemy;
    if (!fightOver && boardChase(snap) && (await moveBoarders(page, snap))) return true;
    const away = (snap.crew || []).some(
      (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
    );
    if (fightOver && away && !saidStrand) {
      saidStrand = true;
      const tele = snap.tele;
      console.log(
        `stranded tele d${tele?.damage ?? "-"}/${tele?.level ?? "-"} p${tele?.power ?? "-"} c${Math.ceil(tele?.cool || 0)}`,
      );
    }
    return false;
  }
  if (snap.phase !== "combat" || !snap.enemy) {
    slingArmed = false;
    return false;
  }
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  const away = (snap.crew || []).some(
    (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
  );
  if (away) return moveBoarders(page, snap);
  if (bombBeforeBoard(snap)) return false;
  if (!boardersReady(snap)) return false;
  if (holdForGuns(snap)) return false;
  // A live gun on this pulsar deletes the hull before the crystals finish the crew.
  if (waitForIon(snap)) return false;
  const tele = snap.tele;
  if (!tele || (tele.cool || 0) > 0) return false;
  if ((tele.power || 0) < 1) {
    if (sparePower(snap) < 1) return false;
    console.log("power teleporter");
    await page.keyboard.press("g");
    return true;
  }
  const rooms = snap.enemyRooms || [];
  const foe = (snap.crew || []).find((c) => c.side !== "player" && c.aboard === "enemy");
  const guns = rooms.find((r) => r.system === "weapons");
  const gunsLive = guns && (guns.level || 1) > (guns.damage || 0);
  const room =
    !canShoot(snap) && gunsLive
      ? guns
      : rooms.find((r) => foe && r.id === foe.room) || guns || rooms[0];
  if (!room) return false;
  if (!slingArmed) {
    slingArmed = true;
    console.log("arm teleporter");
    await page.keyboard.press("t");
    return true;
  }
  slingArmed = false;
  console.log(`send boarders to ${room.title}`);
  partySent = true;
  const sent = await click(
    page
      .locator(".target-body")
      .locator(`button.room-hit[aria-label="Target ${cssAttr(room.title)}"]`),
    `board ${room.title}`,
  );
  await sealPad(page);
  console.log("seal pad");
  return sent;
}

/** Key E raises Drone Control. Key 5 deploys the first schematic. */
async function droneAct(page, snap) {
  if (snap.phase !== "combat" || !snap.enemy) {
    droneTries = 0;
    droneStall = 0;
    droneSeen = -1;
    return false;
  }
  if (snap.picking || snap.shipSheet || snap.sectorMap) return false;
  if ((snap.droneLevel || 0) < 1 && (snap.droneSlots || 0) < 1) return false;
  const feed = droneBars(snap);
  const want = feed > 0 ? feed : droneWant(snap);
  if (want < 1) return false;
  if ((snap.dronePower || 0) < want) {
    // E does nothing when the reactor is full. Holding the action loop there never deploys the drone.
    if (sparePower(snap) <= 0) {
      droneStall = 0;
      return false;
    }
    if ((snap.dronePower || 0) !== droneSeen) {
      droneSeen = snap.dronePower || 0;
      droneStall = 0;
    }
    if (droneStall >= 2) return false;
    droneStall += 1;
    console.log("power drones");
    await page.keyboard.press("e");
    return true;
  }
  droneStall = 0;
  droneSeen = snap.dronePower || 0;
  // The battery dropping pulls the bars back. The drone is still deployed. Feed it again.
  // A destroyed drone stays in the tally, so the part key has to launch the next one.
  if (snap.droneOn) {
    droneTries = 0;
    return false;
  }
  // Destroyed drones need the rebuild. Pressing the key during it only spends the retry budget.
  if ((snap.droneLost || 0) > 0) return false;
  if ((snap.parts || 0) <= 0) return false;
  if (droneTries >= 4) return false;
  droneTries += 1;
  console.log("deploy drone");
  await page.keyboard.press("5");
  return true;
}

async function aimAct(page, snap) {
  if (snap.phase !== "combat" || !snap.enemy) return false;
  if (snap.picking || snap.shipSheet) return false;
  const weapons = snap.weapons || [];
  if (weapons.length === 0) return false;
  if (snap.beamAim) {
    const rooms = snap.enemyRooms || [];
    const room = rooms.length > 1 ? rooms[rooms.length - 1] : rooms[0];
    if (!room) return false;
    return click(
      page
        .locator(".target-body")
        .locator(`button.room-hit[aria-label="Target ${cssAttr(room.title)}"]`),
      `beam end ${room.title}`,
    );
  }
  const have = snap.systems.weapons?.power ?? 0;
  const costs = [];
  let enabledCost = 0;
  for (const w of weapons) {
    const cost = await gunCost(page, w.slot);
    costs.push(cost);
    if (w.enabled) enabledCost += cost;
  }
  let dark = null;
  let anyFeedable = false;
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i];
    const cost = costs[i];
    if (!feedableGun(snap, cost)) continue;
    anyFeedable = true;
    if (w.enabled) continue;
    // The laser already holds the only bar. Clicking the bomb repeats the refusal.
    if (!claimableGun(snap, cost, enabledCost)) continue;
    // One leftover bar turns the Heavy Laser on. The Heavy Ion needs two and would sit dark.
    if (have > 0 && cost > have) continue;
    dark = w;
    break;
  }
  // Every slot refuses the click. Toggling autofire here never arms the chain laser.
  if (!anyFeedable && !weapons.some((w) => w.enabled)) return false;
  // A charger that is still filling is not an aim. The beam beside it has to be turned on.
  const blocking = weapons.some((w) => {
    if (!w.enabled || w.target) return false;
    const cap = chargerCap(w.defId);
    return !(cap && (w.loaded || 0) < cap);
  });
  if (dark && !blocking) {
    return click(page.locator(`button.gun-slot[data-slot="${dark.slot}"]`), `power ${dark.defId}`);
  }
  const hold = chargerHold(snap);
  if (hold === "off") {
    console.log("autofire off");
    return click(page.locator("button[title='Autofire every weapon']"), "autofire off");
  }
  const gun = weapons.find((w) => {
    if (!w.enabled) return false;
    const cap = chargerCap(w.defId);
    if (cap && (w.loaded || 0) < cap) return false;
    if (!w.target) return true;
    // The first stun lands before the send. Once our crew walk into that room, the next bomb stuns them too.
    const bound = boarderBound(snap);
    if (bombRoom(w.defId) === "crew" && bound.has(w.target)) return true;
    if (bombRoom(w.defId) === "weapons") {
      const want = lockTarget(snap);
      if (!want) return bound.has(w.target);
      return want.id !== w.target;
    }
    return false;
  });
  if (!gun) {
    // Autofire launches one charger shot and clears the bank. Leave it off while a charger is armed.
    if (hold === "wait" || weapons.some((w) => w.enabled && chargerCap(w.defId))) return false;
    if (!snap.autofire)
      return click(page.locator("button[title='Autofire every weapon']"), "autofire");
    return false;
  }
  if ((snap.systems.weapons?.power ?? 0) < 1) return false;
  if (chargerCap(gun.defId)) console.log(`aim ${gun.defId} bank ${gun.loaded || 0}`);
  const rooms = snap.enemyRooms || [];
  const aimed = bombRoom(gun.defId);
  const prefer = aimOrder(weapons, snap.enemy.shields ?? 0);
  const room =
    aimed === "crew"
      ? stunTarget(snap)
      : aimed === "weapons"
        ? lockTarget(snap) || rooms.find((r) => !boarderBound(snap).has(r.id)) || rooms[0]
        : prefer.map((id) => rooms.find((r) => r.system === id)).find(Boolean) || rooms[0];
  if (!room) return false;
  const slot = page.locator(`button.gun-slot[data-slot="${gun.slot}"]`);
  if (!(await click(slot, `arm ${gun.defId}`))) return false;
  return click(
    page
      .locator(".target-body")
      .locator(`button.room-hit[aria-label="Target ${cssAttr(room.title)}"]`),
    `aim ${room.title}`,
  );
}

async function jumpAct(page, snap, state) {
  // A jump with crew still on the other hull loses them. Recall first.
  if (boardRecall(snap)) {
    if (snap.picking)
      return click(page.locator("button.ftl-drive"), "close chart for the teleporter");
    return false;
  }
  if (!driveReady(snap)) {
    const stay = page.getByRole("button", { name: "Stay", exact: true });
    if (await enabled(stay)) return click(stay, "stay and repair");
    if (snap.picking) return click(page.locator("button.ftl-drive"), "close chart to repair");
    return false;
  }
  // A fight with an empty tank cannot jump. An open chart freezes the clock on "No fuel."
  if ((snap.fuel || 0) <= 0 && snap.phase === "combat") {
    if (snap.picking) return click(page.locator("button.ftl-drive"), "close chart with no fuel");
    return false;
  }
  if (snap.phase === "combat" && fightStay(snap, state)) {
    if (snap.picking) return click(page.locator("button.ftl-drive"), "close chart and fight");
    return false;
  }
  const fuelDialog = page.locator(".map-confirm button.is-jump");
  if ((await fuelDialog.count()) > 0) {
    state.armedJump = true;
    return click(fuelDialog, "confirm last fuel");
  }
  if (shouldHold(snap)) {
    if (snap.picking) return click(page.locator("button.ftl-drive"), "close chart to repair");
    return false;
  }
  if (snap.phase === "map" && snap.fuel <= 0) {
    if (!snap.picking) return click(page.locator("button.ftl-drive"), "open chart to wait");
    return click(page.locator("button.map-wait-btn"), "wait");
  }
  // fightStay already returned. A fight we are losing continues on to the chart.
  const here = snap.beacons.find((b) => b.id === snap.here);
  const hurt = playerCrew(snap).some((c) => c.hp < c.maxHp * 0.92);
  const medHeals =
    (snap.systems.medbay?.power ?? 0) > 0 &&
    (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 1);
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  if (snap.phase === "map" && hurt && medHeals && !hazard(snap) && here && !inFleet(snap, here)) {
    // A low hull is repaired at a store. Waiting on the map only lets the fleet catch up.
    if (ratio < 0.7) state.healAt = 0;
    else {
      if (!state.healAt) state.healAt = Date.now();
      if (Date.now() - state.healAt < 20000) return false;
    }
  } else state.healAt = 0;
  if (charging(snap)) {
    if (snap.picking) return click(page.locator("button.ftl-drive"), "close chart while charging");
    return false;
  }
  if (!pilotSeated(snap)) return false;
  if ((snap.systems.engines?.power ?? 0) < 1 && (snap.systems.engines?.level ?? 0) > 0)
    return false;
  if (!snap.picking) return click(page.locator("button.ftl-drive"), "open beacon chart");
  const path = nextBeacon(snap, state);
  const hop = path && path.length > 1 ? path[1] : null;
  if (!hop) return click(page.locator("button.ftl-drive"), "close chart without a hop");
  state.armedJump = true;
  state.jumpFrom = snap.here;
  const ok = await click(
    page.locator(`button.map-beacon[data-beacon="${cssAttr(hop)}"]`),
    `jump ${hop}`,
  );
  return ok;
}

function edgeCount(state) {
  return [state.boarders, state.storm, state.halfHull, state.noFuel, state.sysDamage].filter(
    Boolean,
  ).length;
}

function noteEdges(snap, state) {
  if (!state.fired && (snap.fired || snap.playerShots > 0)) {
    state.fired = true;
    console.log(`player weapon fired (${snap.playerShots})`);
  }
  if (!state.drone && snap.droneUsed) {
    state.drone = true;
    console.log("player drone deployed");
  }
  if (!state.boarders && snap.boarders) {
    state.boarders = true;
    console.log("edge boarders");
  }
  const nebula = snap.storm || snap.beaconKind === "nebula";
  if (!state.storm && nebula) {
    state.storm = true;
    console.log(snap.storm ? "edge ion storm" : "edge nebula");
  }
  if (!state.halfHull && snap.hullMax > 0 && snap.hull * 2 <= snap.hullMax) {
    state.halfHull = true;
    console.log(`edge hull ${snap.hull}/${snap.hullMax}`);
  }
  if (!state.noFuel && snap.phase !== "title" && snap.fuel <= 0) {
    state.noFuel = true;
    console.log("edge fuel 0");
  }
  const broken = ["pilot", "oxygen", "engines", "weapons", "shields", "medbay"].some(
    (id) => (snap.systems[id]?.damage ?? 0) > 0,
  );
  if (!state.sysDamage && broken) {
    state.sysDamage = true;
    console.log("edge system damage");
  }
}

function hardReady(state) {
  return (
    state.jump &&
    state.choice &&
    state.store &&
    state.reward &&
    (state.fired || state.drone) &&
    edgeCount(state) >= 2
  );
}

/** A destroyed-ship card pays the salvage in the event text. That page never opens the reward phase. */
export function fightSalvage(snap) {
  const body = snap.event?.body || "";
  if (snap.phase !== "event" || !/Scrap:/.test(body)) return false;
  return /explodes|breaks apart|goes silent|useful scrap material/i.test(body);
}

function noteProgress(snap, state) {
  if (!state.reward && fightSalvage(snap)) {
    state.reward = true;
    console.log("reward");
  }
  if (flagshipFight(snap)) {
    state.flagship = true;
    if (!state.flagshipLogged) {
      state.flagshipLogged = true;
      console.log(
        `flagship combat shown (sector ${snap.sector}, stage ${snap.enemy?.stage || "?"}, ${snap.enemy?.name})`,
      );
    }
  }
  if (state.armedJump && snap.here !== state.jumpFrom && snap.phase !== "title") {
    state.jump = true;
    state.armedJump = false;
    console.log(`beacon jump to ${snap.beaconKind || snap.here} in sector ${snap.sector}`);
  }
  if (snap.sector !== state.sector) {
    state.sector = snap.sector;
    console.log(
      `sector ${snap.sector} ${snap.sectorName} hull ${snap.hull}/${snap.hullMax} fuel ${snap.fuel} scrap ${snap.scrap}`,
    );
  }
}

async function verdictText(page) {
  const cinema = page.locator(".victory-cinema");
  if ((await cinema.count()) > 0) return (await cinema.innerText()).replace(/\s+/g, " ").trim();
  const card = page.locator(".verdict");
  if ((await card.count()) > 0) return (await card.innerText()).replace(/\s+/g, " ").trim();
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().slice(0, 500);
}

function verdictOk(text) {
  if (text.includes("VICTORY!")) return true;
  if (text.includes("The Rebel's flagship was destroyed")) return true;
  if (!text.includes("GAME OVER")) return false;
  return (
    /crew members have died/i.test(text) ||
    /Rebel Flagship is within range/i.test(text) ||
    /explosion marks your fate/i.test(text) ||
    /torn apart/i.test(text) ||
    /introduction training/i.test(text)
  );
}

async function launchBrowser() {
  const args = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--no-sandbox",
  ];
  const errors = [];
  try {
    return await chromium.launch({ headless: true, args });
  } catch (err) {
    errors.push(String(err?.message || err));
  }
  try {
    return await chromium.launch({ headless: true, channel: "chrome", args });
  } catch (err) {
    errors.push(String(err?.message || err));
  }
  const message = errors.join("\n");
  if (launchLog) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(launchLog, message);
  }
  throw new Error(message);
}

export async function main() {
  const browser = await launchBrowser();
  const pageErrors = [];
  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    await context.addInitScript((seed) => {
      window.__stlSeed = seed;
    }, SEED);
    page = await context.newPage();
    page.on("pageerror", (err) => {
      pageErrors.push(String(err?.message || err));
      console.log(`page error: ${err?.message || err}`);
    });
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`opened ${url} status ${response?.status() ?? 0}`);
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button[aria-label="NEW GAME"]');
        return button && !button.disabled && !document.querySelector(".pack-boot");
      },
      null,
      { timeout: 180000 },
    );
    const layout = hullArg ? LAYOUTS.find((row) => row.id === hullArg) : null;
    if (hullArg && !layout) throw new Error(`unknown hull ${hullArg}`);
    await page.getByRole("button", { name: "NEW GAME" }).click();
    if (layout) {
      await page.getByRole("button", { name: "LIST" }).click();
      await page.getByRole("dialog", { name: "Ships" }).waitFor({ state: "visible" });
      const typeName = new RegExp(`^${escapeRegExp(layout.name)}, type ${layout.letter}\\b`);
      await page.getByRole("button", { name: typeName }).click();
      console.log(`hangar ${layout.name} type ${layout.letter}`);
      if (layout.locked) {
        await page.getByRole("button", { name: "UNLOCK ALL" }).click();
        console.log("UNLOCK ALL");
      }
    }
    const difficultyLabel = profile === "hard" ? "HARD" : "EASY";
    await page.getByRole("button", { name: difficultyLabel, exact: true }).click();
    const start = page.getByRole("button", { name: "START", exact: true });
    await page.waitForFunction(
      () => {
        const startBtn = [...document.querySelectorAll("button")].find(
          (button) => button.textContent?.trim() === "START",
        );
        return startBtn && !startBtn.disabled;
      },
      null,
      { timeout: 10000 },
    );
    if (hangarShot) await page.screenshot({ path: hangarShot });
    await start.click();
    await page.waitForFunction(
      (seed) => {
        const g = window.__stl?.game();
        return g && g.phase !== "title" && g.runSeed === seed;
      },
      SEED,
      { timeout: 30000 },
    );
    const opened = await readRun(page);
    const mountedGuns = (opened.weapons || []).map((w) => w.defId);
    console.log(`hull ${opened.hullId}`);
    console.log(`pinned seed ${SEED}`);
    console.log(`live run seed matches ${opened.runSeed}`);
    console.log(`difficulty ${opened.difficulty}`);
    console.log(`starting scrap ${opened.scrap}`);
    console.log(
      `mounted before START weapons ${mountedGuns.length ? mountedGuns.join(", ") : "none"}; drones ${(opened.droneIds || []).join(", ") || "none"}; parts ${opened.parts || 0}`,
    );
    if (layout && opened.hullId !== layout.id) {
      throw new Error(`hull ${opened.hullId} != ${layout.id}`);
    }
    if (opened.runSeed !== SEED) throw new Error(`live run seed ${opened.runSeed} != ${SEED}`);
    const expectDifficulty = profile === "hard" ? "hard" : "easy";
    if (opened.difficulty !== expectDifficulty) throw new Error(`difficulty ${opened.difficulty}`);
    if (profile === "hard" && opened.scrap !== 0) throw new Error(`starting scrap ${opened.scrap}`);
    if (opened.training) throw new Error("tutorial run");

    const state = {
      choice: false,
      store: false,
      reward: false,
      jump: false,
      flagship: false,
      flagshipLogged: false,
      fired: false,
      drone: false,
      boarders: false,
      storm: false,
      halfHull: false,
      noFuel: false,
      sysDamage: false,
      edgePng: false,
      hardEarly: false,
      said: "",
      armedJump: false,
      jumpFrom: opened.here,
      sector: opened.sector,
      upgrades: 0,
      weaponUpgrade: false,
      weaponBars: 0,
      weaponNote: false,
      blocked: new Map(),
      fightName: "",
      fightHere: "",
      fightHull: null,
      fightPlayer: null,
      fightAt: 0,
      ionBrokeAt: null,
      enemyHullMark: null,
      enemyHullAt: null,
      healAt: 0,
      holdMark: "",
      holdAt: 0,
      idleHere: "",
      idleAt: 0,
      deadAt: 0,
    };
    const started = Date.now();
    let lastSig = "";
    let lastChange = Date.now();
    let lastBeat = 0;
    let done = null;

    while (Date.now() - started < maxMs) {
      const snap = await readRun(page);
      if (!snap) throw new Error("live run snapshot missing");
      noteProgress(snap, state);
      noteEdges(snap, state);
      if (profile === "hard" && edgeShot && !state.edgePng && edgeCount(state) >= 1) {
        await page.screenshot({ path: edgeShot });
        state.edgePng = true;
      }
      // One baseline per beacon. A one-frame gap must not re-arm the flee clock mid-volley.
      if (snap.here !== state.fightHere) {
        state.fightHere = snap.here;
        state.fightName = "";
        state.fightHull = null;
        state.fightPlayer = null;
        state.fightAt = 0;
        state.gunsAt = null;
        state.ionBrokeAt = null;
        state.enemyHullMark = null;
        state.enemyHullAt = null;
      }
      if (snap.phase === "combat" && snap.enemy && state.fightName !== snap.enemy.name) {
        state.fightName = snap.enemy.name;
        state.fightHull = snap.enemy.hull;
        state.fightPlayer = snap.hull;
        state.fightAt = snap.time;
        state.gunsAt = null;
        state.ionBrokeAt = null;
        state.enemyHullMark = null;
        state.enemyHullAt = null;
      }
      if (snap.phase === "combat" && snap.enemy) {
        const hullNow = snap.enemy.hull;
        if (state.enemyHullMark == null || hullNow < state.enemyHullMark - 0.5) {
          state.enemyHullMark = hullNow;
          state.enemyHullAt = snap.time;
        }
      }
      if (snap.phase === "combat" && snap.enemy && ionFeedShort(snap)) {
        if (state.ionBrokeAt == null) state.ionBrokeAt = snap.time;
      } else state.ionBrokeAt = null;
      if (profile === "hard" && hardReady(state)) {
        done = snap;
        break;
      }
      if (snap.phase === "victory" || snap.phase === "defeat") {
        done = snap;
        if (profile === "hard" && !hardReady(state)) {
          state.hardEarly = true;
          if (edgeShot && !state.edgePng) {
            await page.screenshot({ path: edgeShot });
            state.edgePng = true;
          }
        }
        break;
      }
      const boarded = (snap.crew || []).filter(
        (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
      ).length;
      const cloning = (snap.crew || []).filter((c) => c.side === "player" && c.cloning).length;
      if (snap.hull <= 0 || playerCrew(snap).length + boarded + cloning === 0) {
        if (!state.deadAt) state.deadAt = Date.now();
        else if (Date.now() - state.deadAt > 8000) {
          throw new Error(
            `dead ship stayed in ${snap.phase} sector ${snap.sector} hull ${snap.hull} crew ${playerCrew(snap).length}`,
          );
        }
      } else state.deadAt = 0;
      if (shouldHold(snap)) {
        const breaches = (snap.rooms || []).reduce((n, r) => n + (r.breach || 0), 0);
        const fires = Math.round((snap.rooms || []).reduce((n, r) => n + (r.fire || 0), 0));
        const mark = [
          snap.here,
          Math.round(snap.o2 ?? 0),
          breaches,
          fires,
          snap.systems.oxygen?.damage ?? 0,
          snap.systems.engines?.damage ?? 0,
          snap.systems.weapons?.damage ?? 0,
          snap.systems.shields?.damage ?? 0,
        ].join(":");
        if (state.holdMark !== mark) {
          state.holdMark = mark;
          state.holdAt = Date.now();
        } else if (Date.now() - state.holdAt > 40000) {
          console.log(
            `hold stall o2=${Math.round(snap.o2 ?? 0)} o2p=${snap.systems.oxygen?.power ?? 0} breaches=${breaches} fires=${fires} leaks=${
              (snap.rooms || [])
                .filter((r) => (r.breach || 0) > 0)
                .map((r) => r.id)
                .join(",") || "-"
            } doors=${snap.airOpen ? "open" : "shut"} paused=${snap.paused ? 1 : 0} pick=${snap.picking ? 1 : 0} menu=${snap.menuHold ? 1 : 0} sheet=${snap.shipSheet ? 1 : 0}`,
          );
          console.log(
            `hold crew ${(playerCrew(snap) || []).map((c) => `${c.name}@${c.room}>${c.dest}`).join(",")}`,
          );
          console.log(`hold log: ${(snap.log || []).join(" | ")}`);
          throw new Error(`repair hold sat on ${snap.here} for 40s`);
        }
      } else {
        state.holdMark = "";
        state.holdAt = 0;
      }
      const sig = signature(snap);
      if (sig !== lastSig) {
        lastSig = sig;
        lastChange = Date.now();
      } else if (Date.now() - lastChange > 45000) {
        console.log(`softlock ${sig}`);
        console.log(
          `beacon ${snap.beaconFlag} name=${snap.beaconName} quest=${snap.beaconQuest} title=${snap.event?.title ?? ""} body=${snap.event?.body?.length ?? 0}`,
        );
        console.log(`log: ${(snap.log || []).join(" | ")}`);
        throw new Error(`no change for 45s in ${snap.phase} sector ${snap.sector} at ${snap.here}`);
      }
      if (
        snap.phase === "map" &&
        snap.flee >= 1 &&
        driveReady(snap) &&
        !snap.sectorMap &&
        !snap.picking &&
        !snap.shipSheet &&
        !shouldHold(snap) &&
        !cloakJumpHold(snap) &&
        !bubbleJumpHold(snap) &&
        !(thinCargo(snap) && (cloakBroken(snap) || noBubble(snap)))
      ) {
        if (state.idleHere !== snap.here) {
          state.idleHere = snap.here;
          state.idleAt = Date.now();
        } else if (Date.now() - state.idleAt > 30000) {
          const sh = snap.systems.shields;
          console.log(
            `map stall pilot=${pilotSeated(snap)} engines=${snap.systems.engines?.power} shields=${sh?.power}/${sh?.level} weapons=${snap.systems.weapons?.power}`,
          );
          throw new Error(`charged drive sat on ${snap.here} for 30s`);
        }
      } else {
        state.idleHere = "";
        state.idleAt = 0;
      }
      const gunsOn = (snap.weapons || []).some((w) => w.enabled);
      const weaponless = (snap.weapons || []).length === 0;
      const droneFight = weaponless && hasDrone(snap);
      const flakFight = flakReady(snap);
      // A destroyed tube is a repair, not a dark gun. The cold-gun clock starts once it is whole again.
      const flakHurt =
        snap.artillery?.weapon === "ARTILLERY_FED_C" && (snap.artillery?.damage || 0) > 0;
      const flakLive =
        snap.artillery?.weapon === "ARTILLERY_FED_C" && (snap.artillery?.power || 0) >= 1;
      const weaponCap = Math.max(
        0,
        (snap.systems.weapons?.level || 0) - (snap.systems.weapons?.damage || 0),
      );
      const gunsBroken =
        (snap.weapons || []).length > 0 &&
        (!systemUsable(snap, "weapons") ||
          (dockPower > 0 && weaponCap + weaponZoltan(snap) < dockPower));
      // The Carnelian has no gun. Crew already on the enemy ship pause this clock.
      // The opening walk still uses the 25s comparison. The longer wait is inside that branch.
      const boarding =
        weaponless &&
        (snap.crew || []).some(
          (c) => c.side === "player" && c.aboard === "enemy" && (c.hp || 0) > 0,
        );
      // A destroyed pad cannot send. The cold-gun clock starts once the crystals can cross.
      const padHurt =
        weaponless &&
        !!snap.tele &&
        (snap.tele.level || 0) >= 1 &&
        (snap.tele.damage || 0) >= (snap.tele.level || 1);
      // The pad is cooling after the pull. The clock starts once they can cross again.
      const padCool =
        weaponless &&
        !!snap.tele &&
        (snap.tele.level || 0) > (snap.tele.damage || 0) &&
        (snap.tele.cool || 0) > 0;
      if (dockPower > weaponCap && (snap.weapons || []).length > 0) {
        state.weaponUpgrade = true;
        state.weaponBars = Math.max(state.weaponBars || 0, dockPower);
      }
      if (
        snap.phase === "combat" &&
        snap.enemy &&
        !gunsOn &&
        !droneFight &&
        !snap.droneUsed &&
        !flakFight &&
        !flakHurt &&
        !flakLive &&
        !gunsBroken &&
        !boarding &&
        !padHurt &&
        !padCool
      ) {
        if (!state.coldAt) state.coldAt = Date.now();
        else if (Date.now() - state.coldAt > 25000) {
          // Armed ships still fail here. A weaponless ship may still be walking to the pad.
          if (!(weaponless && Date.now() - state.coldAt <= 90000)) {
            throw new Error(
              `combat with weapons dark for ${weaponless ? 90 : 25}s in sector ${snap.sector}`,
            );
          }
        }
      } else state.coldAt = 0;
      if (Date.now() - lastBeat > 20000) {
        lastBeat = Date.now();
        const mins = ((Date.now() - started) / 60000).toFixed(1);
        console.log(
          `t+${mins}m sector ${snap.sector} ${snap.phase} hull ${snap.hull}/${snap.hullMax} fuel ${snap.fuel} scrap ${snap.scrap} flee ${snap.flee.toFixed(2)} crew ${playerCrew(snap).length} o2 ${Math.round(snap.o2 ?? 0)} o2p ${snap.systems.oxygen?.power ?? 0} enemy ${snap.enemy ? `${Math.ceil(snap.enemy.hull)}/${snap.enemy.hullMax || "?"}` : "-"} guns ${(snap.weapons || []).filter((w) => w.enabled).length} wp ${snap.systems.weapons?.power ?? 0} eng ${snap.systems.engines?.power ?? 0} sh ${snap.systems.shields?.power ?? 0} st ${snap.storm ? 1 : 0} dmg O${snap.systems.oxygen?.damage ?? 0}/E${snap.systems.engines?.damage ?? 0}/W${snap.systems.weapons?.damage ?? 0}/S${snap.systems.shields?.damage ?? 0} br ${(snap.rooms || []).reduce((n, r) => n + (r.breach || 0), 0)} fk ${snap.artillery ? `${snap.artillery.power}/${snap.artillery.damage}` : "-"} gun ${(snap.weapons || []).map((w) => `${w.defId}${w.loaded ? `:${w.loaded}` : ""}`).join("+") || "-"} dock ${dockPower} dp ${snap.dronePower || 0} on ${snap.droneOn ? 1 : 0} tl ${snap.tele ? `${snap.tele.damage}/${snap.tele.level}p${snap.tele.power}c${Math.ceil(snap.tele.cool || 0)}` : "-"} cl ${snap.clone ? `${snap.clone.power}/${snap.clone.damage}` : "-"} zb ${snap.enemy ? snap.enemy.zoltan || 0 : "-"} es ${snap.enemy ? `${snap.enemy.shields}/${snap.enemy.shieldLevel}p${snap.enemy.shieldPower}i${snap.enemy.shieldIon}` : "-"} ps ${snap.playerShots}`,
        );
      }
      const said = (snap.log || [])[0] || "";
      if (said && said !== state.said) {
        state.said = said;
        console.log(`say ${said}`);
      }

      const stayFight = fightStay(snap, state);
      const fleeingNow =
        (snap.phase === "combat" || snap.phase === "map") && shouldFlee(snap, state) && !stayFight;
      clickBudget = fleeingNow || snap.hull / Math.max(1, snap.hullMax) < 0.45 ? 900 : 4000;

      let acted = false;
      if (await dismiss(page, snap)) acted = true;
      else if (await ensureFast(page)) acted = true;
      else if (snap.overflow) {
        await makeRoom(page);
        acted = true;
      } else if (snap.phase === "event") {
        await pickChoice(page, snap, state);
        acted = true;
      } else if (snap.phase === "reward") {
        await takeReward(page, state);
        acted = true;
      } else if (snap.phase === "store") {
        await storeAct(page, snap, state);
        acted = true;
      } else if (snap.sectorMap) {
        const here = snap.route.find((n) => n.id === snap.routeHere);
        const next = snap.route
          .filter((n) => here?.links.includes(n.id))
          .sort((a, b) => {
            const rank = (n) => {
              let score =
                n.group === "civilian"
                  ? 0
                  : n.group === "nebula"
                    ? 1
                    : n.group === "hostile"
                      ? 2
                      : 3;
              if (/mantis|lanius/i.test(n.name || "")) score += 1;
              return score;
            };
            return rank(a) - rank(b);
          });
        const pick = next[0];
        if (pick) {
          console.log(`sector jump ${pick.group} ${pick.name}`);
          const node = page.locator(`.sector-plot button[data-node="${cssAttr(pick.id)}"]`);
          await node.scrollIntoViewIfNeeded().catch(() => {});
          await click(node, pick.name);
        }
        acted = true;
      } else {
        // The reward click lands on the map with the boarding party still away. Pull them before a jump or an upgrade.
        if (!acted && boardRecall(snap)) acted = await boardAct(page, snap);
        const hereBeacon = snap.beacons.find((b) => b.id === snap.here);
        const fleetClose =
          !!hereBeacon &&
          (inFleet(snap, hereBeacon) || overtaken((snap.fleet || 0) + 1, snap.dangerY, hereBeacon));
        const fleeReady = shouldDepart(snap, fleeingNow);
        // The weapons upgrade is what lets a dark 2-power gun fire. Buy it before the next jump.
        if (
          !acted &&
          snap.phase === "map" &&
          !snap.picking &&
          !snap.sectorMap &&
          upgradeWant(snap, state) === "weapons"
        ) {
          acted = await upgradeAct(page, snap, state);
        }
        if (
          snap.picking &&
          (!driveReady(snap) || ((snap.fuel || 0) <= 0 && snap.phase === "combat"))
        ) {
          acted = await jumpAct(page, snap, state);
        }
        if (!acted && fleeReady) acted = await jumpAct(page, snap, state);
        if (
          !acted &&
          snap.phase === "map" &&
          !fleetClose &&
          !fleeingNow &&
          upgradeWant(snap, state)
        ) {
          acted = await upgradeAct(page, snap, state);
        }
        if (!acted && snap.shipSheet && !upgradeWant(snap, state)) {
          acted = await click(
            page.locator("[data-sheet='ship'] button[aria-label='Close']"),
            "close ship",
          );
        } else if (!acted && (await gunPowerAct(page, snap))) acted = true;
        else if (!acted && ionSendFirst(snap) && (await boardAct(page, snap))) acted = true;
        else if (!acted && (await powerAct(page, snap, fleeingNow))) acted = true;
        else if (!acted && (await cloakAct(page, snap))) acted = true;
        else if (!acted && (await batteryAct(page, snap))) acted = true;
        else if (!acted && (await artilleryAct(page, snap))) acted = true;
        else if (!acted && (await droneAct(page, snap))) acted = true;
        else if (!acted && (await aimAct(page, snap))) acted = true;
        else if (!acted && (await ventAct(page, snap))) acted = true;
        else if (!acted && (await crewAct(page, snap, fleeingNow))) acted = true;
        else if (!acted && (await cloneAct(page, snap))) acted = true;
        else if (!acted && (await boardAct(page, snap))) acted = true;
        else if (!acted && !fleeingNow && (await upgradeAct(page, snap, state))) acted = true;
        else if (!acted && (snap.phase === "combat" || snap.phase === "map")) {
          acted = await jumpAct(page, snap, state);
        }
      }

      await page.waitForTimeout(acted ? 180 : 250);
    }

    if (!done) {
      throw new Error(
        profile === "hard"
          ? "hard session timed out before the required situations"
          : "playthrough timed out before a terminal verdict",
      );
    }
    const text = await verdictText(page);
    if (shot) await page.screenshot({ path: shot });
    if (profile === "hard") {
      console.log(`terminal verdict: ${text}`);
      console.log(`hull ${done.hullId}`);
      console.log(`pinned seed ${SEED}`);
      console.log(`live run seed matches ${done.runSeed}`);
      console.log("difficulty hard");
      console.log("starting scrap 0");
      console.log(state.jump ? "beacon jump" : "beacon jump missing");
      console.log(state.choice ? "event choice" : "event choice missing");
      console.log(state.store ? "store" : "store missing");
      console.log(state.reward ? "reward" : "reward missing");
      console.log(
        state.fired
          ? "player weapon fired"
          : state.drone
            ? "player drone deployed"
            : "player weapon fired missing",
      );
      for (const [flag, label] of [
        [state.boarders, "edge boarders"],
        [state.storm, "edge nebula"],
        [state.halfHull, "edge hull"],
        [state.noFuel, "edge fuel 0"],
        [state.sysDamage, "edge system damage"],
      ]) {
        if (flag) console.log(label);
      }
      console.log(
        pageErrors.length ? `page errors: ${pageErrors.join(" | ")}` : "page errors: none",
      );
      console.log(DEFECTS.length ? `defects fixed: ${DEFECTS.join("; ")}` : "no bug was found");
      const problems = [];
      if (done.runSeed !== SEED) problems.push("seed mismatch");
      if (done.difficulty !== "hard") problems.push(`difficulty ${done.difficulty}`);
      if (!state.jump) problems.push("no beacon jump");
      if (!state.choice) problems.push("no event choice");
      if (!state.store) problems.push("no store");
      if (!state.reward) problems.push("no reward");
      if (!state.fired && !state.drone) problems.push("no weapon or drone");
      if (edgeCount(state) < 2) problems.push(`only ${edgeCount(state)} edges`);
      if (state.hardEarly) {
        problems.push(
          `early ${done.phase} ${done.outcome || "end"} hull ${done.hullId} sector ${done.sector}`,
        );
      }
      if (pageErrors.length) problems.push("page errors");
      if (problems.length) throw new Error(problems.join("; "));
      console.log("hard play ok");
      return 0;
    }
    console.log(`terminal verdict: ${text}`);
    console.log(`pinned seed ${SEED}`);
    console.log(`live run seed matches ${done.runSeed}`);
    console.log(state.jump ? "beacon jump" : "beacon jump missing");
    console.log(state.choice ? "event choice" : "event choice missing");
    console.log(state.store ? "store" : "store missing");
    console.log(state.reward ? "reward" : "reward missing");
    console.log(`sector ${done.sector}`);
    console.log(state.flagship ? "flagship combat shown" : "flagship combat missing");
    console.log(pageErrors.length ? `page errors: ${pageErrors.join(" | ")}` : "page errors: none");

    const problems = [];
    if (done.runSeed !== SEED) problems.push("seed mismatch");
    if (!state.jump) problems.push("no beacon jump");
    if (!state.choice) problems.push("no event choice");
    if (!state.store) problems.push("no store");
    if (!state.reward) problems.push("no reward");
    if (done.sector < 8) problems.push(`ended in sector ${done.sector}`);
    if (!state.flagship) problems.push("no flagship combat");
    if (!verdictOk(text)) problems.push("verdict text was not a terminal card");
    if (pageErrors.length) problems.push("page errors");
    if (problems.length) throw new Error(problems.join("; "));
    console.log("playthrough ok");
    return 0;
  } catch (err) {
    console.error(String(err?.stack || err));
    if (shot && page) {
      await page.screenshot({ path: shot }).catch(() => {});
    }
    return 1;
  } finally {
    await browser.close();
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry === import.meta.url) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(String(err?.stack || err));
      process.exit(1);
    });
}
