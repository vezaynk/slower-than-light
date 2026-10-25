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
/** Defects this Hard session fixed. Empty means the session found none. */
const DEFECTS = [];

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

export function nextBeacon(snap, state) {
  const avoidFleet = (b) => inFleet(snap, b);
  const avoidHard = (b) =>
    avoidFleet(b) || b.kind === "hostile" || b.kind === "distress" || b.kind === "boss";
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  const crew = playerCrew(snap).length;
  const fuel = snap.fuel || 0;
  const scrap = snap.scrap || 0;
  const avoid = ratio < 0.85 || crew <= 2 || fuel < 5 ? avoidHard : avoidFleet;
  if (snap.sector >= 8) {
    const bosses = snap.beacons
      .filter((b) => b.kind === "boss" || b.id === snap.ramId)
      .map((b) => b.id);
    return shortest(snap, bosses, null) || shortest(snap, bosses, () => false) || null;
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
    const via = shortest(snap, goals, avoidFleet);
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
  const hurt = ratio < 0.6;
  const safeExit = exit ? pathTo(snap, exit.id, avoid) : null;
  const fleetExit = exit ? pathTo(snap, exit.id, avoidFleet) : null;
  const anyExit = exit ? pathTo(snap, exit.id, null) : null;
  // A hurt ship stays off hostile beacons when a safe exit path exists.
  const exitPath = safeExit || (hurt ? null : fleetExit || anyExit) || anyExit;
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
      const repairWorth = canRepair && ratio < 0.9 && gain >= 0;
      if (gain <= 0 && !repairWorth) continue;
      if (fuel >= exitHops && hops > exitHops + 3) continue;
      const score = gain * 100 - hops;
      if (score > bestScore) {
        bestScore = score;
        bestStore = via;
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
    const safe = (here?.links || [])
      .map((id) => snap.beacons.find((b) => b.id === id))
      .filter((b) => b && !avoidHard(b));
    safe.sort((a, b) => {
      const rank = (n) =>
        n.kind === "store" ? 0 : n.kind === "empty" || n.kind === "event" ? 1 : 2;
      return rank(a) - rank(b);
    });
    if (safe[0]) return [snap.here, safe[0].id];
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
    !/attack|fight/.test(label)
  )
    score = 2;
  // A no-fuel distress offer ("missiles for fuel", "emergency fuel") beats refusing it.
  else if (
    (snap.fuel || 0) <= 2 &&
    /fuel/.test(label) &&
    !/attack|fight|refuse|decline|ignore/.test(label)
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

function sparePower(snap) {
  const used = ["shields", "engines", "oxygen", "weapons", "medbay"].reduce(
    (n, id) => n + (snap.systems[id]?.power || 0),
    0,
  );
  const pool = snap.storm ? Math.ceil(snap.reactor / 2) : snap.reactor;
  return pool - used;
}

function intruders(snap) {
  return snap.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
}

function playerCrew(snap) {
  return snap.crew.filter((c) => c.side === "player" && c.aboard === "player");
}

function roomBySystem(snap, system) {
  return snap.rooms.find((r) => r.system === system);
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

/** Stay on this beacon while a system is broken or the air is still thin. The fleet overrides the hold. */
export function shouldHold(snap) {
  if (snap.phase !== "map" || hazard(snap)) return false;
  const here = snap.beacons?.find((b) => b.id === snap.here);
  if (here && inFleet(snap, here)) return false;
  const broken = ["pilot", "oxygen", "engines", "weapons", "shields"].some(
    (id) => (snap.systems[id]?.damage ?? 0) > 0,
  );
  if (broken) return true;
  if (snap.rooms?.some((r) => (r.breach || 0) > 0 || (r.fire || 0) > 0)) return true;
  return (snap.o2 ?? 100) < 85 && systemUsable(snap, "oxygen");
}

/** A full drive leaves a hazard at once. A quiet beacon can still spend a moment on repairs and upgrades. */
export function shouldDepart(snap, fleeing) {
  return snap.flee >= 1 && driveReady(snap) && !shouldHold(snap) && (fleeing || hazard(snap));
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
  const crew = playerCrew(snap);
  const inDanger = !!snap.enemy || hazard(snap);
  if (crew.length <= 1 && inDanger) return true;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  // An ion storm halves the reactor, so the Burst laser leaves the shields dark. Leave before the hull goes with them.
  if (snap.enemy && snap.storm && ratio < 0.8) return true;
  // A merely hurt ship can still win. Leaving at the first scratch chains the next fight.
  if (ratio < 0.4 && inDanger) return true;
  if (
    snap.enemy &&
    state.fightPlayer != null &&
    snap.hull <= state.fightPlayer - 6 &&
    snap.enemy.hull >= (state.fightHull ?? snap.enemy.hull) - 1
  ) {
    return true;
  }
  if (snap.enemy && crew.some((c) => c.hp < c.maxHp * 0.45)) return true;
  if (snap.enemy && (snap.o2 ?? 100) < 40 && (snap.systems.oxygen?.power ?? 0) < 1) return true;
  const pool = snap.storm ? Math.ceil(snap.reactor / 2) : snap.reactor;
  if (snap.enemy && snap.storm && snap.sector >= 3 && pool < 6) return true;
  const armed = (snap.weapons || []).some((w) => w.enabled);
  // Unpowered guns at the start of a fight still get a power click. A destroyed system cannot.
  if (snap.enemy && !armed && intruders(snap).length === 0 && !systemUsable(snap, "weapons"))
    return true;
  const gunsReady =
    systemUsable(snap, "weapons") && armed && (snap.systems.weapons?.power ?? 0) >= 1;
  if (snap.enemy && gunsReady) {
    if (state.gunsAt == null) state.gunsAt = snap.time;
  } else state.gunsAt = null;
  // The no-damage clock starts when a shot can actually leave the ship.
  if (
    snap.enemy &&
    state.fightHull != null &&
    state.gunsAt != null &&
    snap.time - state.gunsAt > 12 &&
    snap.enemy.hull > state.fightHull - 1
  ) {
    return true;
  }
  return false;
}

/** Stay in a fight a healthy ship can still win. The drive bar from the map is not a reason to leave. */
export function fightStay(snap, state) {
  if (snap.phase !== "combat" || !snap.enemy) return false;
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  if (snap.storm && ratio < 0.8) return false;
  if (ratio >= 0.55 && systemUsable(snap, "weapons")) return true;
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
      if (!row) return { power: 0, level: 0, damage: 0 };
      return { power: row.power || 0, level: row.level || 0, damage: row.damage || 0 };
    };
    const here = g.beacons.find((b) => b.id === g.here);
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
      },
      crew: g.crew
        .filter((c) => c.hp > 0)
        .map((c) => ({
          name: c.name,
          side: c.side,
          aboard: c.aboard,
          room: c.room,
          hp: c.hp,
          maxHp: c.maxHp,
          path: (c.path || []).length,
          dest: (c.path || []).length ? c.path[c.path.length - 1] : c.room,
        })),
      rooms: g.player.rooms.map((r) => ({
        id: r.id,
        title: r.title || "",
        system: r.system || "",
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
          }
        : null,
      enemyRooms: (g.enemy?.rooms || []).map((r) => ({
        id: r.id,
        title: r.title || "",
        system: r.system || "",
      })),
      weapons: g.player.weapons.map((w, slot) => ({
        slot,
        defId: w.defId,
        enabled: !!w.enabled,
        target: w.target || "",
      })),
      weaponsOff: g.player.weapons.filter((w) => !w.enabled).length,
      fired: !!(g.tally && g.tally.shot),
      playerShots: (g.tally && g.tally.playerShots) || 0,
      droneUsed: !!(g.tally && (g.tally.usedDrone || g.tally.offensiveDrone)),
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
  const ok = await click(
    page.locator("button.choice-line", { hasText: "Continue" }),
    "reward continue",
  );
  if (ok) {
    state.reward = true;
    console.log("reward");
  }
}

async function storeAct(page, snap, state) {
  if ((await page.locator(".make-room-store").count()) > 0) {
    if (await click(page.getByRole("button", { name: "Cancel" }), "cancel hire")) markStore(state);
    return;
  }
  const ratio = snap.hull / Math.max(1, snap.hullMax);
  const all = page.locator(".store-repair button", { hasText: "Repair all" });
  const one = page.locator(".store-repair button", { hasText: "Repair 1" });
  const rate = snap.sector >= 7 ? 4 : snap.sector >= 4 ? 3 : 2;
  const missing = Math.max(0, (snap.hullMax || 0) - (snap.hull || 0));
  const repairCost = missing * rate;
  const desperate = ratio < 0.65;
  if (desperate && missing > 0 && snap.scrap >= repairCost && (await enabled(all))) {
    if (await click(all, "repair all")) markStore(state);
    return;
  }
  if (desperate && snap.scrap >= rate && (await enabled(one))) {
    if (await click(one, "repair 1")) markStore(state);
    return;
  }
  // Fuel first. A hull above 65% can wait; a tank under 10 cannot reach the next store.
  const fuelGoal = snap.fuel < 10 ? 12 : 10;
  if (snap.fuel < fuelGoal) {
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
  if (ratio < 0.92 && missing > 0 && snap.scrap >= repairCost && (await enabled(all))) {
    if (await click(all, "repair all")) {
      markStore(state);
      console.log("repair hull");
    }
    return;
  }
  if (ratio < 0.85 && snap.scrap >= rate && (await enabled(one))) {
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
      `left store hull ${snap.hull}/${snap.hullMax} scrap ${snap.scrap} fuel ${snap.fuel}`,
    );
  }
}

function markStore(state) {
  if (!state.store) console.log("store");
  state.store = true;
}

export function upgradeWant(snap, state) {
  if (state.upgrades >= 24) return null;
  // A damaged hull spends the next store visit on repairs. Upgrades wait.
  if (snap.hull / Math.max(1, snap.hullMax) < 0.8) return null;
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
  if (snap.reactor < 9 && !blocked("reactor", snap.reactor)) return "reactor";
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

async function orderTo(page, snap, names, title, roomId) {
  if (!names.length || (!title && !roomId)) return false;
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

/** Where the crew should walk. Boarders are fought in their room; a medbay does not pull them. */
export function crewOrders(snap, fleeing = false) {
  const foes = intruders(snap);
  const crew = playerCrew(snap);
  const pilot = roomBySystem(snap, "pilot");
  const med = roomBySystem(snap, "medbay");
  if (foes.length && crew.length) {
    const bay = roomBySystem(snap, "medbay");
    const bayLive = bay && (snap.systems.medbay?.damage ?? 0) < (snap.systems.medbay?.level ?? 0);
    // Stand together in a working medbay. Chasing a boarder from room to room means nobody is standing to hit back.
    if (bay && bayLive) {
      const movers = crew.filter((c) => c.dest !== bay.id);
      if (movers.length)
        return sendCrew(
          movers.map((c) => c.name),
          bay,
        );
      return null;
    }
  }
  if (foes.length && crew.length) {
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
        !contested(c.room),
    );
    if (movers.length && room)
      return sendCrew(
        movers.map((c) => c.name),
        room,
      );
    const goHeal = healing.find((c) => c.dest !== med.id);
    if (goHeal) return sendCrew([goHeal.name], med);
    if (seated && pilot && seated.dest !== pilot.id) return sendCrew([seated.name], pilot);
    return null;
  }
  const hot = (snap.rooms || []).find((r) => (r.fire || 0) > 0 && r.title);
  const leaking = (snap.rooms || []).find((r) => (r.breach || 0) > 0 && r.title);
  const airRoom = roomBySystem(snap, "oxygen");
  const airBroken = (snap.systems.oxygen?.damage ?? 0) > 0;
  // A lone crew sent to the chair and back to oxygen never stands long enough to finish the bar.
  if (
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
  const chairJob = (hot && hot.id === pilot?.id) || (leaking && leaking.id === pilot?.id);
  const loneEmergency = crew.length === 1 && !!(hot || leaking || airBroken);
  const locked = repairLock(snap, crew);
  const freeHands = () => crew.filter((c) => c !== locked);
  if (
    enginesLive &&
    pilot &&
    !seatedPilot &&
    !chairJob &&
    crew.length &&
    !loneEmergency &&
    !crew.some((c) => c.dest === pilot.id) &&
    snap.phase !== "event"
  ) {
    const mover = freeHands().sort((a, b) => b.hp - a.hp)[0];
    if (mover) return sendCrew([mover.name], pilot);
  }
  const besidesPilot = (roomId) =>
    crew.filter(
      (c) => c.dest !== roomId && (crew.length === 1 || c !== seatedPilot || roomId === pilot?.id),
    );
  if (hot && crew.length) {
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
          (escape.id === "pilot" || !enginesLive || c !== seatedPilot) && c.dest !== escape.room.id,
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
    !crew.some((c) => c.dest === pilot.id) &&
    snap.phase !== "event"
  ) {
    const mover = freeHands().sort((a, b) => b.hp - a.hp)[0];
    if (mover) return sendCrew([mover.name], pilot);
  }
  const broken = ["pilot", "oxygen", "engines", "weapons", "shields", "medbay"]
    .filter((id) => !(id === "oxygen" && snap.enemy && (snap.o2 ?? 100) >= 50))
    .map((id) => ({ id, room: roomBySystem(snap, id), sys: snap.systems[id] }))
    .find((row) => row.room && row.sys && row.sys.damage > 0);
  if (broken && crew.length) {
    const spares = crew.filter((c) => broken.id === "pilot" || !pilot || c.dest !== pilot.id);
    const movers = (spares.length ? spares : crew).filter((c) => c.dest !== broken.room.id);
    if (movers.length)
      return sendCrew(
        movers.map((c) => c.name),
        broken.room,
      );
  }
  if (
    fleeing &&
    pilot &&
    crew.length >= 2 &&
    crew.some((c) => c.room === pilot.id && c.path === 0)
  ) {
    const engines = roomBySystem(snap, "engines");
    if (engines && !crew.some((c) => c.dest === engines.id || c.room === engines.id)) {
      const spare = crew.find((c) => c.dest !== pilot.id && c.room !== pilot.id);
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

export function powerWant(snap, fleeing = false) {
  const shields = snap.systems.shields;
  const engines = snap.systems.engines;
  const weapons = snap.systems.weapons;
  const medbay = snap.systems.medbay;
  const boarded = intruders(snap).length > 0;
  const pool = snap.storm ? Math.ceil((snap.reactor || 0) / 2) : snap.reactor || 0;
  const want = { oxygen: 0, engines: 0, shields: 0, weapons: 0, medbay: 0 };
  const give = (id, bars) => {
    const sys = snap.systems[id];
    if (!sys) return;
    const cap = Math.max(0, (sys.level || 0) - (sys.damage || 0));
    const used = Object.values(want).reduce((n, v) => n + v, 0);
    let add = Math.min(Math.max(0, bars), cap - want[id], pool - used);
    // Shields, Overview: one click moves a whole pair of bars. An odd target never sticks.
    if (id === "shields") add = Math.floor(add / 2) * 2;
    if (add > 0) want[id] += add;
  };
  if (boarded && !snap.enemy) {
    // The medbay heals without air. Oxygen stays dark so an open hull can drop below the suffocation line.
    give("medbay", medbay?.level || 0);
    return want;
  }
  if (boarded) {
    give("oxygen", 1);
    give("engines", 1);
    // The first gun needs a full step. Shields and the medbay take what remains.
    give("weapons", Math.min(2, weapons.level));
    give("medbay", Math.min(snap.storm ? 1 : medbay?.level || 0, medbay?.level || 0));
    give("shields", Math.min(snap.storm ? 2 : 4, shields.level));
    return want;
  }
  // Two engine bars charge the drive. Shields and the Burst laser stay up while that bar fills.
  if (fleeing) {
    give("oxygen", 1);
    give("engines", Math.min(2, engines.level));
    give("shields", Math.min(snap.storm ? 2 : 4, shields.level));
    give("weapons", Math.min(2, weapons.level));
    give("engines", engines.level);
    return want;
  }
  // One engine bar has to stay powered or a charged drive can never jump.
  // The Burst laser needs two bars. One leftover bar never turns it on, so it is funded before shields.
  give("oxygen", 1);
  give("engines", 1);
  give("weapons", Math.min(2, weapons.level));
  const shieldCap = snap.storm ? (snap.sector >= 3 && shields.level >= 4 && pool >= 8 ? 4 : 2) : 4;
  give("shields", Math.min(shieldCap, shields.level));
  give("weapons", snap.missiles > 0 ? weapons.level : Math.min(2, weapons.level));
  give("engines", Math.min(2, engines.level));
  if (playerCrew(snap).some((c) => c.hp < c.maxHp * 0.92)) give("medbay", 1);
  return want;
}

let powerTried = "";

async function powerAct(page, snap, fleeing = false) {
  if (snap.phase !== "combat" && snap.phase !== "map") return false;
  if (snap.picking || snap.sectorMap || snap.shipSheet) return false;
  const want = powerWant(snap, fleeing);
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
      if (!sys || sys.power >= want[key] || sys.power >= sys.level - sys.damage) continue;
      id = key;
      kind = "power";
      break;
    }
  }
  if (!id) return false;
  const token = `${kind}:${id}:${snap.systems[id]?.power ?? 0}`;
  if (powerTried === token) {
    powerTried = "";
    return false;
  }
  powerTried = token;
  return click(
    page.locator(
      `.power-dock button[aria-label="${POWER_LABEL[id]}: add power (right-click removes)"]`,
    ),
    `${kind} ${POWER_LABEL[id]}`,
    kind === "depower" ? { button: "right" } : {},
  );
}

/** Where the door controls should go. Pure boarding opens the hull once the crew are standing in a live medbay. */
export function ventWant(snap) {
  if (snap.picking || snap.sectorMap || snap.shipSheet) return null;
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

async function aimAct(page, snap) {
  if (snap.phase !== "combat" || !snap.enemy) return false;
  if (snap.picking || snap.shipSheet) return false;
  const weapons = snap.weapons || [];
  const dark = weapons.find((w) => !w.enabled);
  // A dark slot claims the bars it needs. Autofire does not turn a gun on.
  if (dark && !weapons.some((w) => w.enabled && !w.target)) {
    return click(page.locator(`button.gun-slot[data-slot="${dark.slot}"]`), `power ${dark.defId}`);
  }
  const gun = weapons.find((w) => w.enabled && !w.target);
  if (!gun) {
    if (!snap.autofire)
      return click(page.locator("button[title='Autofire every weapon']"), "autofire");
    return false;
  }
  if ((snap.systems.weapons?.power ?? 0) < 1) return false;
  const prefer = ["weapons", "shields", "pilot", "oxygen", "engines", "medbay"];
  const room =
    prefer.map((id) => (snap.enemyRooms || []).find((r) => r.system === id)).find(Boolean) ||
    (snap.enemyRooms || [])[0];
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

function noteProgress(snap, state) {
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
    await page.getByRole("button", { name: "NEW GAME" }).click();
    const difficultyLabel = profile === "hard" ? "HARD" : "EASY";
    await page.getByRole("button", { name: difficultyLabel, exact: true }).click();
    if (hangarShot) await page.screenshot({ path: hangarShot });
    await page.getByRole("button", { name: "START", exact: true }).click();
    await page.waitForFunction(
      (seed) => {
        const g = window.__stl?.game();
        return g && g.phase !== "title" && g.runSeed === seed;
      },
      SEED,
      { timeout: 30000 },
    );
    const opened = await readRun(page);
    console.log(`pinned seed ${SEED}`);
    console.log(`live run seed matches ${opened.runSeed}`);
    console.log(`difficulty ${opened.difficulty}`);
    console.log(`starting scrap ${opened.scrap}`);
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
      armedJump: false,
      jumpFrom: opened.here,
      sector: opened.sector,
      upgrades: 0,
      blocked: new Map(),
      fightName: "",
      fightHull: null,
      fightPlayer: null,
      fightAt: 0,
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
      if (snap.phase === "combat" && snap.enemy) {
        if (state.fightName !== snap.enemy.name) {
          state.fightName = snap.enemy.name;
          state.fightHull = snap.enemy.hull;
          state.fightPlayer = snap.hull;
          state.fightAt = snap.time;
          state.gunsAt = null;
        }
      } else state.fightName = "";
      if (profile === "hard" && hardReady(state)) {
        done = snap;
        break;
      }
      if (snap.phase === "victory" || snap.phase === "defeat") {
        done = snap;
        if (profile === "hard" && !hardReady(state)) state.hardEarly = true;
        break;
      }
      if (snap.hull <= 0 || playerCrew(snap).length === 0) {
        if (!state.deadAt) state.deadAt = Date.now();
        else if (Date.now() - state.deadAt > 8000) {
          throw new Error(
            `dead ship stayed in ${snap.phase} sector ${snap.sector} hull ${snap.hull} crew ${playerCrew(snap).length}`,
          );
        }
      } else state.deadAt = 0;
      if (shouldHold(snap)) {
        const breaches = (snap.rooms || []).reduce((n, r) => n + (r.breach || 0), 0);
        const fires = (snap.rooms || []).reduce((n, r) => n + (r.fire || 0), 0);
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
        !shouldHold(snap)
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
      if (snap.phase === "combat" && snap.enemy && !gunsOn) {
        if (!state.coldAt) state.coldAt = Date.now();
        else if (Date.now() - state.coldAt > 25000) {
          throw new Error(`combat with weapons dark for 25s in sector ${snap.sector}`);
        }
      } else state.coldAt = 0;
      if (Date.now() - lastBeat > 20000) {
        lastBeat = Date.now();
        const mins = ((Date.now() - started) / 60000).toFixed(1);
        console.log(
          `t+${mins}m sector ${snap.sector} ${snap.phase} hull ${snap.hull}/${snap.hullMax} fuel ${snap.fuel} scrap ${snap.scrap} flee ${snap.flee.toFixed(2)} crew ${playerCrew(snap).length} o2 ${Math.round(snap.o2 ?? 0)} o2p ${snap.systems.oxygen?.power ?? 0} enemy ${snap.enemy ? Math.ceil(snap.enemy.hull) : "-"} guns ${(snap.weapons || []).filter((w) => w.enabled).length} wp ${snap.systems.weapons?.power ?? 0} eng ${snap.systems.engines?.power ?? 0} sh ${snap.systems.shields?.power ?? 0} st ${snap.storm ? 1 : 0} dmg O${snap.systems.oxygen?.damage ?? 0}/E${snap.systems.engines?.damage ?? 0}/W${snap.systems.weapons?.damage ?? 0}/S${snap.systems.shields?.damage ?? 0} br ${(snap.rooms || []).reduce((n, r) => n + (r.breach || 0), 0)}`,
        );
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
        const hereBeacon = snap.beacons.find((b) => b.id === snap.here);
        const fleetClose =
          !!hereBeacon &&
          (inFleet(snap, hereBeacon) || overtaken((snap.fleet || 0) + 1, snap.dangerY, hereBeacon));
        const fleeReady = shouldDepart(snap, fleeingNow);
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
        } else if (!acted && (await powerAct(page, snap, fleeingNow))) acted = true;
        else if (!acted && (await aimAct(page, snap))) acted = true;
        else if (!acted && (await ventAct(page, snap))) acted = true;
        else if (!acted && (await crewAct(page, snap, fleeingNow))) acted = true;
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
      if (state.hardEarly) problems.push(`early ${done.phase} in sector ${done.sector}`);
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
