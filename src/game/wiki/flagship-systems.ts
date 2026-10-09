/**
 * @agent:flagship. Rebel Flagship per-stage rooms, systems, Power Surge, and AI takeover.
 * Source: wiki page "The Rebel Flagship" (plus "Crew Teleporter" and "Hacking" where named).
 *
 * Rooms come from the traced cutaways in wiki/flagship-layout.ts. The enemy systems run through the existing
 * modules on `ship.kits`, each in a room with `room.kit`: Hacking (extras/spike.ts), Cloaking (extras/veil.ts),
 * Drone Control (extras/swarm.ts, `kit.loadout`), Teleporter (extras/sling.ts, room "e-teleporter"), and
 * Mind Control (extras/leash.ts). sim.ts makeFlagship / advanceRam / bossThink call into this file.
 */
import type { Crew, DoorMark, Game, Kit, KitId, Room, Ship, SysId, WeaponInst } from "../types.ts";
import { log, rand } from "../sim.ts";
import { veilBlocks } from "../extras/veil.ts";
import { spikeEvadeZero } from "../extras/spike.ts";
import { artilleryChargeSeconds } from "./flagship-weapons.ts";
import { BEAM1_SPEED, DRONE_LABEL, pickOrbitBearing } from "../extras/swarm.ts";
import { COMBAT1_SPEED, orbitLegSeconds } from "./cited-combat2.ts";
import { randomRoom } from "./targeting.ts";
import { flagshipHardLinks, flagshipStage1, flagshipStage2, flagshipStage3 } from "./flagship-layout.ts";
import type { Layout } from "../layouts.ts";

/**
 * One Power Surge drone (stage 2). Not a Drone Control unit: "They are an independent hazard."
 * heading, bearing, and left are the orbit leg. The page prints no separate shot clock.
 */
export type SurgeDrone = {
  id: string;
  kind: "beam" | "striker";
  shots: number;
  aux: number;
  heading?: number;
  bearing?: number;
  left?: number;
};

/** Per-fight flagship bookkeeping. Lives on the enemy ship (Ship.flagship), so it leaves with it. */
export type FlagshipState = {
  stage: 1 | 2 | 3;
  /** The 5-second Power Surge warning has sounded for the current countdown. */
  warned: boolean;
  /**
   * "2nd stage" / "Power Surge": "The split between Beam and Combat drones remains fixed for every surge, unless you
   * jump away and come back." Rolled once per ship (a new fight is a new ship).
   */
  split?: { beam: number; striker: number };
  /** Stage 2 surge drones still flying. */
  surge: SurgeDrone[];
  /** "Final stage" / "Power Surge": laser surges since the last Zoltan restore. */
  lasers: number;
  /** "Global behavior": "a message will state that the AI took control of the ship." */
  ai: boolean;
  /**
   * Per-gun artillery damage, keyed by artillery room id ("e-ion" ...). "The Flagship's 'weapons' are artillery
   * systems, each located in its own room": each room's gun is its own system, so a hit on one room slows only that
   * gun. Fresh each stage (applyFlagshipSystems); artilleryGun fills a missing entry (older saves).
   */
  guns?: Record<string, ArtilleryGun>;
};

/** One artillery gun's own system state: damaged bars, ion locks (seconds left per point), repair progress. */
export type ArtilleryGun = { damage: number; ion: number[]; fix: number };

/**
 * What the Lark remembers of the boss fight after jumping away mid-stage (Game.flagshipMemo).
 * "Global behavior": "Hull and system damage of the Rebel Flagship will be repaired on the next stage. Breach and fire
 * will also be cleared. Only the crew is persistent through each stage; crew members killed are not replaced on the
 * next stage. If the player jumps away from the Flagship before completing a stage, the same applies, with one
 * exception: the crew is fully replaced if the player retreats during the first stage."
 * So only the stage and the surviving crew aboard it are kept; hull, systems, fire, and breaches come back fresh.
 */
export type FlagshipMemo = { stage: 2 | 3; crew: Crew[] };

export function isFlagship(ship: Ship | null | undefined): boolean {
  return !!ship?.flagship;
}

// ---------------------------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------------------------

export type FlagshipRoomSpec = { id: string; title: string; system: SysId | null; kit?: KitId; x: number; y: number; w: number; h: number };

/**
 * Traced id suffix -> enemy room id / system / kit. Kit rooms use the ids the extras modules expect
 * (sling.ts PADS is "e-teleporter"; sling.ts falls back to "e-pilot").
 * "The Flagship's 'weapons' are artillery systems, each located in its own room."
 * Each artillery room is tagged `system: "weapons"` for targeting, but its damage, ion, and repair are its own
 * (FlagshipState.guns, artilleryGun below). sim.ts manning() keeps them unmanned ("They cannot be manned").
 */
const ROLE: Record<string, { id: string; system: SysId | null; kit?: KitId }> = {
  pilot: { id: "e-pilot", system: "pilot" },
  shields: { id: "e-shields", system: "shields" },
  oxygen: { id: "e-oxygen", system: "oxygen" },
  engines: { id: "e-engines", system: "engines" },
  medbay: { id: "e-medbay", system: "medbay" },
  doors: { id: "e-doors", system: "doors" },
  cloak: { id: "e-cloaking", system: null, kit: "veil" },
  hack: { id: "e-hacking", system: null, kit: "spike" },
  drone: { id: "e-drones", system: null, kit: "swarm" },
  teleporter: { id: "e-teleporter", system: null, kit: "sling" },
  mind: { id: "e-mindcontrol", system: null, kit: "leash" },
  ion: { id: "e-ion", system: "weapons" },
  laser: { id: "e-laser", system: "weapons" },
  missile: { id: "e-missile", system: "weapons" },
  beam: { id: "e-beam", system: "weapons" },
  "laser-link": { id: "e-laser-link", system: null },
  "missile-link": { id: "e-missile-link", system: null },
};

const STAGE_LAYOUT: Record<1 | 2 | 3, Layout> = { 1: flagshipStage1, 2: flagshipStage2, 3: flagshipStage3 };

/**
 * The stage's rooms and door bars. "Flagship variation": "On Hard mode, two additional rooms link the Laser and
 * Missile ones to the main section of the ship." Every stage keeps the Laser and Missile rooms, so the Hard links
 * are added on all three. Halls get a position id ("e-hall-x-y") so crew in the same cell keep a stable room.
 */
export function flagshipRooms(stage: 1 | 2 | 3, hard: boolean): { rooms: FlagshipRoomSpec[]; marks: DoorMark[]; cols: number; rows: number } {
  const base = STAGE_LAYOUT[stage];
  const layouts = hard ? [base, flagshipHardLinks] : [base];
  const rooms: FlagshipRoomSpec[] = [];
  const marks: DoorMark[] = [];
  for (const layout of layouts) {
    for (const r of layout.rooms) {
      const key = r.id.replace(/^f[123h]-/, "");
      const role = ROLE[key];
      const id = role?.id ?? `e-hall-${r.x}-${r.y}`;
      rooms.push({ id, title: r.title, system: role ? role.system : null, ...(role?.kit ? { kit: role.kit } : {}), x: r.x, y: r.y, w: r.w, h: r.h });
    }
    marks.push(...(layout.marks ?? []));
  }
  return { rooms, marks, cols: base.cols, rows: base.rows };
}

/**
 * Stage 1 crew seats. "1st Stage" / "General": "Crew: 11 Humans". The 2nd and Final stage lines ("Minus the one in
 * the Ion room" / "Minus the one in the Beam room") put one crew member in each artillery room.
 * INFERRED: the other seven man piloting, shields, engines, oxygen, doors, cloaking, and hacking.
 * FLAGSHIP_HARD, "Boarding strategy / Hard mode": "The main body has two extra crew." INFERRED seats: medbay and shields.
 */
export function flagshipSeats(hard: boolean): string[] {
  const seats = ["e-pilot", "e-shields", "e-engines", "e-oxygen", "e-doors", "e-cloaking", "e-hacking", "e-ion", "e-laser", "e-missile", "e-beam"];
  if (hard) seats.push("e-medbay", "e-shields");
  return seats;
}

// ---------------------------------------------------------------------------------------------
// Systems (kits)
// ---------------------------------------------------------------------------------------------

/**
 * Stage 2 Drone Control loadout, in power order. "Drones": "Combat Drone Mark I (2), Anti-Ship Beam Drone I (2),
 * Defense Drone Mark I (2), Boarding Drone (Boss) (2)". "Handling phase 2 drones": "If you damage the Flagship's
 * drone system, the Boarding Drone is the first drone to go down. Further damage will take the regular beam and
 * combat drones offline (not the power surge drones), and finally the defense drone." swarm.ts powers drones in
 * loadout order, so the defense drone is first and the boarding drone last.
 * INFERRED: "Boarding Drone (Boss)" runs as swarm.ts "board" (the regular Boarding Drone), at the printed (2) power.
 */
export const STAGE2_DRONES = ["ward", "beam", "striker", "board"] as const;

/**
 * Power of one Drone Control schematic on the flagship, or null to use the regular figure.
 * "Drones": every row prints (2), and 4 x 2 = the printed Drone (8). The regular Boarding Drone is 3.
 */
export function flagshipDronePower(ship: Ship, kind: string): number | null {
  if (!isFlagship(ship)) return null;
  return kind === "board" ? 2 : null;
}

/** Printed system levels that the sim runs as kits, per stage ("Systems" lists). */
const STAGE_KITS: Record<1 | 2 | 3, Partial<Record<KitId, number>>> = {
  // "1st Stage" / "Systems": "Cloaking (2)", "Hacking (3) [Advanced Edition]".
  1: { veil: 2, spike: 3 },
  // "2nd stage" / "Systems": "Drone (8)".
  2: { swarm: 8 },
  // "Final stage" / "Systems": "Teleporter (2)", "Mind Control (3) [Advanced Edition]".
  3: { sling: 2, leash: 3 },
};

function blankKit(id: KitId, level: number): Kit {
  return { id, level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/**
 * Fresh kits for a stage. "Global behavior": "Hull and system damage of the Rebel Flagship will be repaired on the
 * next stage", so nothing carries over.
 */
export function flagshipKits(stage: 1 | 2 | 3): Ship["kits"] {
  const kits: Ship["kits"] = {};
  for (const [id, level] of Object.entries(STAGE_KITS[stage]) as [KitId, number][]) kits[id] = blankKit(id, level);
  if (kits.swarm) kits.swarm.loadout = [...STAGE2_DRONES];
  return kits;
}

/**
 * "1st Stage" / "General" and "2nd stage" / "General": "Drone parts: 10". "The Rebel Flagship has 10 drone parts
 * (reset each time you fight it)". INFERRED: stage 3 also starts at 10; it has no part users.
 */
export const FLAGSHIP_PARTS = 10;

/**
 * Crew Teleporter, "Enemy Crew Teleporter": "The Rebel Flagship in phase 3 will send all its crew except for 1 or 2
 * crewmembers". sling.ts keeps 1 or 2 home per party; INFERRED: no cap on how many trips it makes (the regular
 * hull's 2-boarding limit does not apply).
 */
const PHASE3_BOARDINGS = 99;

/** Apply the stage's kits, parts, and boarding plan to an already-built hull. */
export function applyFlagshipSystems(ship: Ship, stage: 1 | 2 | 3) {
  ship.kits = flagshipKits(stage);
  ship.parts = FLAGSHIP_PARTS;
  ship.boards = stage === 3;
  ship.boarding = stage === 3 ? { sent: 0, limit: PHASE3_BOARDINGS, party: [], away: [], home: {} } : undefined;
  ship.crewAi = undefined;
  const prev = ship.flagship;
  // "Hull and system damage of the Rebel Flagship will be repaired on the next stage": fresh guns.
  ship.flagship = { stage, warned: false, split: prev?.split, surge: [], lasers: 0, ai: prev?.ai ?? false, guns: {} };
  for (const r of ship.rooms) if (r.system === "weapons") ship.flagship.guns![r.id] = { damage: 0, ion: [], fix: 0 };
}

// ---------------------------------------------------------------------------------------------
// Crew across stages
// ---------------------------------------------------------------------------------------------

function cellsOf(r: { x: number; y: number; w: number; h: number }): [number, number][] {
  const out: [number, number][] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
}

/**
 * Move crew aboard the flagship onto the next stage's rooms. "Only the crew is persistent through each stage; crew
 * members killed are not replaced on the next stage." "2nd stage" / "General": "The remaining crew from the previous
 * stage (Minus the one in the Ion room if left alive)." "Final stage": "(Minus the one in the Beam room if left alive)."
 * So enemy crew in a lost artillery room leave with it. INFERRED: anyone else in a lost room (cloaking, hacking,
 * drone rooms, halls; player boarders too) steps to the nearest surviving room.
 */
export function carryCrew(g: Game, oldRooms: Room[], ship: Ship) {
  const at = new Map<string, string>();
  for (const r of ship.rooms) for (const [x, y] of cellsOf(r)) at.set(`${x},${y}`, r.id);
  const lostArtillery = new Set(oldRooms.filter((r) => r.system === "weapons" && !ship.rooms.some((n) => n.id === r.id)).map((r) => r.id));
  g.crew = g.crew.filter((c) => !(c.aboard === "enemy" && c.side === "enemy" && lostArtillery.has(c.room)));
  for (const c of g.crew) {
    if (c.aboard !== "enemy") continue;
    c.path = [];
    c.move = 0;
    if (ship.rooms.some((r) => r.id === c.room)) continue;
    const old = oldRooms.find((r) => r.id === c.room);
    const same = old ? cellsOf(old).map(([x, y]) => at.get(`${x},${y}`)).find((id) => !!id) : undefined;
    if (same) {
      c.room = same;
      continue;
    }
    const cx = old ? old.x + old.w / 2 : 0;
    const cy = old ? old.y + old.h / 2 : 0;
    // Main-body rooms only: never drop someone into an isolated artillery room.
    const pool = ship.rooms.filter((r) => r.system !== "weapons");
    let best = pool[0] ?? ship.rooms[0];
    let bestD = Infinity;
    for (const r of pool) {
      const d = Math.abs(r.x + r.w / 2 - cx) + Math.abs(r.y + r.h / 2 - cy);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    if (best) c.room = best.id;
  }
}

// ---------------------------------------------------------------------------------------------
// Power Surge
// ---------------------------------------------------------------------------------------------

/** "2nd stage" / "Power Surge": "4 on Easy, 6 on Normal, and 7 on Hard." */
export function surgeDroneCount(difficulty: Game["difficulty"]): number {
  return difficulty === "easy" ? 4 : difficulty === "hard" ? 7 : 6;
}

/** "A warning sounds exactly 5 seconds before the surge begins." */
export const SURGE_WARNING_S = 5;

/** "The extra drones will take two shots each and then disappear." */
export const SURGE_DRONE_SHOTS = 2;

/** "Final stage" / "Power Surge": "Shoots 7 laser shots simultaneously". */
export const SURGE_LASERS = 7;

/** "After every 3 laser Power Surges, the 4th will instead fully restore the Zoltan Shield." */
export const LASER_SURGES_PER_RESTORE = 3;

/** "Final stage" / "General": "The Flagship's Zoltan Shield has 12 health points." */
export const FLAGSHIP_ZOLTAN = 12;

/**
 * The Rebel Flagship, 2nd stage, Power Surge: extra drones are "randomly split between Beam and Combat (both mark 1)".
 * Drone Control, Combat Drone Mark I and Anti-Ship Beam Drone I: "Speed: 15".
 * Combat Drones (offensive drones): offensive drones orbit and attack when that leg finishes.
 * "The extra drones will take two shots each and then disappear. As a result, the length of the power surge varies,
 * but is about 7 seconds." The variation is the orbit leg. Beam speed is not this wait.
 */
function surgeSpeed(kind: SurgeDrone["kind"]): number {
  return kind === "beam" ? BEAM1_SPEED : COMBAT1_SPEED;
}

function armSurgeLeg(g: Game, d: SurgeDrone, speed: number) {
  if (d.heading == null) d.heading = 0;
  if (d.bearing == null || !(d.left != null && d.left > 0)) {
    d.bearing = pickOrbitBearing(g, d.heading);
    d.left = orbitLegSeconds(d.heading, d.bearing, speed);
  }
}

/**
 * "Final stage" / "Power Surge": "The power surge lasers use the Heavy Laser Mark I blueprint, but are hard-coded to
 * do one damage instead of two. That means their status effect chances are 30% fire, 21% breach, and 20% stun."
 * NOT MODELLED: the 20% stun (a Shot has no stun field).
 */
const SURGE_LASER = { damage: 1, fireChance: 0.3, breachChance: 0.21, stunChance: 0.2 };

/**
 * INFERRED: 3 s stun. The flagship page prints the 20% chance but no duration. The closest printed figure for a
 * 20% weapon stun is Crystal Vengeance's shard, "has a 20 percent chance to stun for 3 seconds" (wiki/augments-missing.ts),
 * and the Missile page's source comment also names 3 seconds. Read by sim.ts strikeRoom for any Shot.stunChance.
 */
export const SURGE_STUN_S = 3;

/** Combat Drone Mark I and Anti-Ship Beam Drone I: "10% chance to set a tile on fire", 1 damage (swarm.ts). */
const SURGE_DRONE_HIT = { damage: 1, fireChance: 0.1 };

function nextId(g: Game): string {
  g.uid = (g.uid + 1) >>> 0;
  return "u" + g.uid.toString(36);
}

function rollSplit(g: Game): { beam: number; striker: number } {
  // "randomly split between Beam and Combat (both mark 1)". INFERRED: each drone is a coin flip.
  const n = surgeDroneCount(g.difficulty);
  let beam = 0;
  for (let i = 0; i < n; i++) if (rand(g) < 0.5) beam += 1;
  return { beam, striker: n - beam };
}

/** Called by sim.ts bossThink when the surge countdown reaches 0 on stage 2 or 3. */
export function firePowerSurge(g: Game, ship: Ship) {
  const state = ship.flagship;
  if (!state) return;
  if (state.stage === 2) {
    state.split ??= rollSplit(g);
    for (let i = 0; i < state.split.beam; i++) state.surge.push({ id: "surge-" + nextId(g), kind: "beam", shots: 0, aux: 0 });
    for (let i = 0; i < state.split.striker; i++) state.surge.push({ id: "surge-" + nextId(g), kind: "striker", shots: 0, aux: 0 });
    log(g, `Power surge: ${state.split.beam + state.split.striker} drones deploy.`);
    return;
  }
  if (state.stage === 3) {
    if (state.lasers >= LASER_SURGES_PER_RESTORE) {
      state.lasers = 0;
      ship.zoltan = FLAGSHIP_ZOLTAN;
      log(g, "Power surge: their Zoltan Shield is back online.");
      return;
    }
    state.lasers += 1;
    for (let i = 0; i < SURGE_LASERS; i++) {
      g.shots.push({
        id: nextId(g),
        kind: "laser",
        from: "enemy",
        damage: SURGE_LASER.damage,
        ion: 0,
        fireChance: SURGE_LASER.fireChance,
        breachChance: SURGE_LASER.breachChance,
        stunChance: SURGE_LASER.stunChance,
        targetRoom: randomRoom(g, g.player),
        // "simultaneously": one volley, no stagger.
        wait: 0,
        t: 0,
        duration: 0.7,
        label: "Surge",
      });
    }
    log(g, `Power surge: ${SURGE_LASERS} lasers.`);
  }
}

/**
 * Stage 2 surge drones. "If you are cloaked, they will position for taking a shot, and that will count as one of
 * their allowed two shots." "Hacking or destroying the drone system does not affect the power surge drones."
 */
function tickSurgeDrones(g: Game, state: FlagshipState, dt: number) {
  for (const d of state.surge) {
    const speed = surgeSpeed(d.kind);
    armSurgeLeg(g, d, speed);
    d.aux += dt;
    if (d.aux < (d.left ?? 0)) continue;
    d.aux -= d.left ?? 0;
    d.heading = d.bearing;
    d.bearing = undefined;
    d.left = undefined;
    d.shots += 1;
    // The next leg starts as the shot is taken, so two shots are two orbit legs.
    armSurgeLeg(g, d, speed);
    // "If you are cloaked, they will position for taking a shot, and that will count as one of their allowed two shots."
    if (veilBlocks(g, "enemy")) continue;
    const room = randomRoom(g, g.player);
    const beam = d.kind === "beam";
    // Anti-Ship Beam Drone I: a beam, "100% accurate" but "cannot penetrate shields at all". sim.ts applyImpact skips
    // the miss roll for a "drone:" beam and cuts its damage by each shield layer. Combat Drone Mark I: a laser.
    g.shots.push({
      id: nextId(g),
      kind: beam ? "beam" : "laser",
      from: "enemy",
      damage: SURGE_DRONE_HIT.damage,
      ion: 0,
      fireChance: SURGE_DRONE_HIT.fireChance,
      breachChance: 0,
      targetRoom: room,
      ...(beam ? { beamRooms: [room] } : {}),
      wait: 0,
      t: 0,
      // INVENTED: no projectile flight time is printed. Must be > 0 because shot progress divides by duration.
      duration: beam ? 0.45 : 0.7,
      label: DRONE_LABEL + d.id,
    });
  }
  state.surge = state.surge.filter((d) => d.shots < SURGE_DRONE_SHOTS);
}

// ---------------------------------------------------------------------------------------------
// AI takeover
// ---------------------------------------------------------------------------------------------

/**
 * "Global behavior": "killing the entire enemy crew won't defeat the Flagship. Instead, a message will state that
 * the AI took control of the ship. The Flagship will then behave like an automated ship: undamaged systems are
 * treated as manned (even those that are hacked), and damaged systems are all progressively repaired at a set rate,
 * except those with fire or a breach in their room."
 * AI-Controlled Rebel Ships: automated ships repair "at 1/3 the speed of a human" (sim.ts REPAIR_SECONDS, 37.5 s a bar).
 * INFERRED: this page's "set rate" is that pace. Fire or a breach still skips the room, which is this sentence,
 * not the auto-ship split where a fire resets progress and a breach freezes it. autoRepair stays off this hull.
 */
export const AI_REPAIR_S = 37.5;

function tickAi(g: Game, ship: Ship, state: FlagshipState, dt: number) {
  if (!state.ai) {
    const alive = g.crew.some((c) => c.side === "enemy" && c.hp > 0);
    if (alive) return;
    state.ai = true;
    // sim.ts present(): automated systems run with nobody aboard; crewai.ts stops planning.
    ship.automated = true;
    log(g, "The Flagship's AI has taken control of the ship.");
  }
  for (const r of ship.rooms) {
    if (r.fire > 0 || r.breach > 0) continue;
    // "damaged systems are all progressively repaired": each artillery room is its own system, at the same rate.
    const gun = artilleryGun(ship, r.id);
    if (gun) {
      if (gun.damage <= 0) continue;
      gun.fix += dt;
      if (gun.fix >= AI_REPAIR_S) {
        gun.fix = 0;
        gun.damage -= 1;
      }
    } else if (r.system) {
      const sys = ship.systems[r.system];
      if (sys.damage <= 0) continue;
      sys.fix += dt;
      if (sys.fix >= AI_REPAIR_S) {
        sys.fix = 0;
        sys.damage -= 1;
        sys.power = Math.min(sys.level - sys.damage, sys.power + 1);
      }
    } else if (r.kit) {
      const kit = ship.kits[r.kit];
      if (!kit || (kit.damage ?? 0) <= 0) continue;
      kit.fix = (kit.fix ?? 0) + dt;
      if (kit.fix >= AI_REPAIR_S) {
        kit.fix = 0;
        kit.damage = (kit.damage ?? 0) - 1;
        kit.power = kit.level - kit.damage;
      }
    }
  }
}

/**
 * Evasion bonus while the AI flies the ship. Dodge Rate, every stage: "If controlled by AI" equals "fully manned"
 * (20 / 25 / 38), which is the base plus +5 engines and +5 piloting for unskilled crew (sim.ts EVADE_SKILL[0]).
 * "undamaged systems are treated as manned": each of Engines and Piloting adds its 5 only while undamaged.
 * Called from extras/index.ts extraEvade.
 */
export function flagshipAiEvade(g: Game, ship: Ship): number {
  if (!ship.flagship?.ai) return 0;
  // Hacking, "Overview": a latched drone means "System cannot be manned, but automated ships still get their manning
  // bonuses" (and this page: "undamaged systems are treated as manned (even those that are hacked)"), so a latch alone
  // keeps the bonus. The pulse is different: "Piloting/Engines: reduces base evasion to 0 ... Does not affect evasion
  // gained from Cloak." INFERRED: the AI's manning bonus is part of that base evasion, so it is 0 during the pulse
  // (sim.ts evasionPercent then returns only extraEvade, i.e. the cloak).
  if (spikeEvadeZero(g, ship)) return 0;
  const { engines, pilot } = ship.systems;
  // No dodge at all without working engines (sim.ts evasionPercent returns only this bonus then).
  if (Math.min(engines.power, engines.level - engines.damage) - engines.ion.length <= 0) return 0;
  return (engines.damage === 0 ? 5 : 0) + (pilot.damage === 0 ? 5 : 0);
}

/**
 * "The Rebel Flagship limits Sensors functionality capping them at level 2". Applied in extras/sensors.ts to the
 * player's sensor level while fighting the flagship.
 */
export const FLAGSHIP_SENSOR_CAP = 2;

// ---------------------------------------------------------------------------------------------
// Per-tick
// ---------------------------------------------------------------------------------------------

/**
 * "Global behavior": "Although the Flagship uses a missile launcher, it does not consume any missiles and will
 * therefore never run out of ammunition." sim.ts launch() spends ship.ammo, so it is topped back up each tick.
 */
const ENDLESS_AMMO = 99;

/** Everything flagship-specific per combat tick, except the surge countdown itself (sim.ts bossThink). */
export function tickFlagship(g: Game, dt: number) {
  const ship = g.enemy;
  const state = ship?.flagship;
  if (!ship || !state || g.phase !== "combat") return;
  ship.ammo = ENDLESS_AMMO;
  // Each gun's ion locks run down like a system's (sim.ts tickIon), 5 s per point.
  for (const gun of Object.values(state.guns ?? {})) {
    if (gun.ion.length) gun.ion = gun.ion.map((t) => t - dt).filter((t) => t > 0.05);
  }
  tickSurgeDrones(g, state, dt);
  tickAi(g, ship, state, dt);
}

/** "A warning sounds exactly 5 seconds before the surge begins." Called with the countdown after this tick. */
export function surgeWarning(g: Game, ship: Ship, left: number) {
  const state = ship.flagship;
  if (!state || state.warned || left > SURGE_WARNING_S) return;
  state.warned = true;
  log(g, "Warning: power surge in 5 seconds.");
  g.sfx.push("alarm");
}

/** The countdown restarted: arm the next warning. */
export function surgeRearm(ship: Ship) {
  if (ship.flagship) ship.flagship.warned = false;
}

// ---------------------------------------------------------------------------------------------
// Artillery
// ---------------------------------------------------------------------------------------------

/** Artillery room of each boss gun (wiki/flagship-layout.ts traced rooms, ROLE above). */
export const GUN_ROOM: Record<string, string> = {
  bossion: "e-ion",
  bosslaser: "e-laser",
  bossmissile: "e-missile",
  bossbeam: "e-beam",
};

/**
 * The gun state of a flagship artillery room, or null when `roomId` is not one (or this is not the flagship).
 * "The Flagship's 'weapons' are artillery systems, each located in its own room." "Weapon cooldowns and status
 * effects": "Damaging the system slows down the weapon." So each room is its own system: damage, ion, and repair are
 * per room, and a hit on the Laser room slows only the Boss Laser. The rooms stay `system: "weapons"` for targeting
 * and manning; the shared ship.systems.weapons only carries the stage's artillery level (3, or 4 on the final stage).
 */
export function artilleryGun(ship: Ship, roomId: string): ArtilleryGun | null {
  const state = ship.flagship;
  if (!state) return null;
  const r = ship.rooms.find((x) => x.id === roomId);
  if (!r || r.system !== "weapons") return null;
  state.guns ??= {};
  return (state.guns[roomId] ??= { damage: 0, ion: [], fix: 0 });
}

/**
 * Damage an artillery room's own gun. Returns false (nothing done) for any other room, so the caller falls back to
 * hurtSystem. Capped at the artillery level, like a system ("roomLeft" in sim.ts hurtSystem).
 */
export function hurtArtillery(ship: Ship, roomId: string, amount: number): boolean {
  const gun = artilleryGun(ship, roomId);
  if (!gun) return false;
  gun.damage = Math.min(ship.systems.weapons.level, gun.damage + Math.max(0, amount));
  return true;
}

/**
 * Ion on an artillery room locks bars of that gun only, 5 s per point, up to 5 (sim.ts applyIon). "Hard mode":
 * "even a single point of damage to the missiles (including ion damage) will allow your cloak to recharge in time
 * for the next volley", so ion slows a gun like damage does.
 */
export function ionArtillery(ship: Ship, roomId: string, points: number): boolean {
  const gun = artilleryGun(ship, roomId);
  if (!gun) return false;
  for (let i = 0; i < points && gun.ion.length < 5; i++) gun.ion.push(5);
  return true;
}

/**
 * Working bars of the gun in `roomId`: the stage's artillery level minus that room's damage and ion.
 * INFERRED: damage or ion on the shared Weapons system (any path that still hits it as a whole) counts against every gun.
 */
export function artilleryBars(ship: Ship, roomId: string): number {
  const sys = ship.systems.weapons;
  const gun = artilleryGun(ship, roomId);
  const own = gun ? gun.damage + gun.ion.length : 0;
  return Math.max(0, sys.level - sys.damage - sys.ion.length - own);
}

/** Working bars of a gun by its WeaponDef id. INFERRED: a boss gun with no artillery room uses the bare level. */
function gunBars(ship: Ship, defId: string): number {
  return artilleryBars(ship, GUN_ROOM[defId] ?? "");
}

/**
 * Seconds for one charge of a flagship gun, or null when this is not a flagship artillery piece. A gun with no
 * working bar never charges (Infinity). "Weapon cooldowns and status effects" table (wiki/flagship-weapons.ts):
 * level 3 on stages 1–2, level 4 on the final stage, lower rows as its own room takes damage. Called by sim.ts chargeSide.
 */
export function flagshipChargeSeconds(ship: Ship, w: WeaponInst): number | null {
  if (!ship.flagship) return null;
  const bars = gunBars(ship, w.defId);
  const s = artilleryChargeSeconds(w.defId, bars);
  if (s != null) return s;
  return bars > 0 ? null : Infinity;
}

/**
 * powerMask for the flagship: "The Flagship's 'weapons' are artillery systems, each located in its own room", not
 * guns on a shared Weapons power pool, so each armed gun runs while its own room has a working bar. Before the pool
 * was dropped the 4-power Boss Missile never fired on stages 1–2 (pool of 3).
 */
export function flagshipPowerMask(ship: Ship): boolean[] | null {
  if (!ship.flagship) return null;
  return ship.weapons.map((w) => w.enabled && gunBars(ship, w.defId) > 0);
}

/** Target-panel chips: one per artillery room still on the hull, with its gun's working bars. */
export function artilleryView(ship: Ship | null | undefined): { room: string; defId: string; level: number; bars: number; ion: number }[] {
  if (!ship?.flagship) return [];
  const out = [];
  for (const [defId, room] of Object.entries(GUN_ROOM)) {
    if (!ship.rooms.some((r) => r.id === room)) continue;
    out.push({ room, defId, level: ship.systems.weapons.level, bars: artilleryBars(ship, room), ion: artilleryGun(ship, room)?.ion.length ?? 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Retreat memory
// ---------------------------------------------------------------------------------------------

/**
 * Called by sim.ts jump before the boss fight is dropped. Stage 1: "the crew is fully replaced if the player retreats
 * during the first stage", so nothing is kept and the next fight is a fresh stage 1. Stage 2/3: the stage and the
 * enemy crew still aboard the Flagship are kept. INFERRED: Flagship boarders on the Lark are not returned (they
 * jump with the Lark; the page's "kidnap" strategy), and Mind Control holds are cleared by the jump itself.
 */
export function rememberFlagship(g: Game) {
  const ship = g.enemy;
  const stage = ship?.flagship?.stage;
  if (!ship || !stage) return;
  if (g.beacons.find((b) => b.id === g.here)?.kind !== "boss") return;
  if (stage === 1) {
    g.flagshipMemo = undefined;
    return;
  }
  const crew = g.crew
    .filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0)
    .map((c) => ({ ...c, path: [], move: 0, think: 0, stun: 0, leashed: 0 }));
  g.flagshipMemo = { stage, crew };
}

/**
 * Called by sim.ts makeFlagship for the boss fight: the remembered stage, or null for a fresh stage 1. The memo is
 * spent, so a later retreat writes a new one. "Hull and system damage ... repaired", "Breach and fire ... cleared":
 * the caller builds the stage fresh. The surge drone split is re-rolled (Ship.flagship is new): "The split between
 * Beam and Combat drones remains fixed for every surge, unless you jump away and come back."
 */
export function takeFlagshipMemo(g: Game): FlagshipMemo | null {
  const memo = g.flagshipMemo;
  g.flagshipMemo = undefined;
  return memo ?? null;
}

/**
 * Enemy crew for a resumed stage: the remembered survivors, each put back in their room if the stage still has it,
 * else the nearest main-body room (carryCrew's rule).
 */
export function resumeCrew(ship: Ship, memo: FlagshipMemo): Crew[] {
  const main = ship.rooms.filter((r) => r.system !== "weapons");
  return memo.crew.map((c, i) => {
    const room = ship.rooms.some((r) => r.id === c.room) ? c.room : (main[i % Math.max(1, main.length)] ?? ship.rooms[0])?.id ?? c.room;
    return { ...c, room, aboard: "enemy" as const };
  });
}

// ---------------------------------------------------------------------------------------------
// Advanced Edition
// ---------------------------------------------------------------------------------------------

/**
 * "Flagship variation": "On Easy mode with Advanced Edition Content disabled, the Flagship only has 3 layers of shield
 * instead of the usual 4 (which means the shield system level is 6 instead of 8)."
 * Advanced Edition content is always on, so this shield row stays at the printed 8.
 * Hacking and Mind Control stay on the flagship.
 */
export const FLAGSHIP_AE_ALWAYS_ON = true;

// ---------------------------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------------------------

/** Stage-2 surge drones currently out, for CombatFx (drawn like other enemy drones, orbiting the Lark). */
export function surgeDroneView(ship: Ship | null | undefined): SurgeDrone[] {
  return ship?.flagship?.surge ?? [];
}
