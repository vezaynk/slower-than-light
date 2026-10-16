/**
 * Seeded fights for the combat demonstration. The browser hook is installed only in dev.
 * buildScene itself only uses the sim, so the node test can construct a fight without a window.
 */
import { crewDef, weaponDef } from "@stl/pack";
import { clearAims } from "../components/game/aims.ts";
import { useFast } from "../components/game/speed.ts";
import { roomCenter, roomsOnSegment } from "./beam-line.ts";
import { claimPadTile } from "./crew-spots.ts";
import { installCell } from "./extras/cell.ts";
import { enemyCloneQueue } from "./extras/cradle.ts";
import { clearEnemyLeash, installLeash } from "./extras/leash.ts";
import { installSling } from "./extras/sling.ts";
import { installSpike, playerHackView } from "./extras/spike.ts";
import { installVeil } from "./extras/veil.ts";
import { seatKits } from "./layouts.ts";
import { blastHits, createGame, doorHurt, doorLevel, noteDoorArmed, sparePower, startCombat, step, syncShields, zoltanBars } from "./sim.ts";
import { useGame } from "./store.ts";
import type { Beacon, Crew, Door, Game, Kit, Room, Ship, SysId, WeaponInst } from "./types.ts";
import type { EscapePlan } from "./wiki/escape.ts";

export type SceneName = "quiet" | "reading" | "inside" | "stacked" | "flagship";

const SCENE_SEED = 7;
const GUNS = ["lineburst", "ion2", "halberd", "breach2"] as const;

export type ReelInfo = {
  phase: Game["phase"];
  paused: boolean;
  userPaused: boolean;
  picking: boolean;
  fuel: number;
  autofire: boolean;
  sensors: number;
  name: string;
  flee: number;
  asteroid: boolean;
  cloakOn: boolean;
  cloakLeft: number;
  hack: string | null;
  /** Seconds left on the player teleporter. The room menu freezes this clock, so a recall has to wait it out first. */
  slingCool: number;
  away: number;
  doorHurt: boolean;
  weaponsVent: boolean;
  weaponsO2: number;
  cloneOffline: boolean | null;
  cloneCount: number;
  escapeRunning: boolean;
  escapeStalled: boolean;
  beamRooms: number;
  enemyWeaponsIon: number;
  swarmTarget: string | null;
  swarmPower: number;
  enginesPower: number;
  shieldsPower: number;
  batteryOn: boolean;
  hurtHp: number | null;
  hurtRoom: string | null;
  shieldsNow: number;
  enemyShields: number;
  playerHull: number;
  playerMax: number;
  enemyHull: number;
  enemyMax: number;
  stage: number;
  fires: number;
  cloakCool: number;
  /** Seconds until the flagship power surge. Stage 1 leaves this alone. */
  surge: number;
};

function blankKit(id: Kit["id"], level: number, power: number): Kit {
  return { id, level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function system(g: Game, id: keyof Game["player"]["systems"], level: number, power: number) {
  const sys = g.player.systems[id];
  sys.level = level;
  sys.power = power;
  sys.damage = 0;
  sys.ion = [];
  sys.fix = 0;
}

function gun(uid: string, defId: string, charge: number): WeaponInst {
  return { uid, defId, charge, enabled: true, autofire: false, target: null };
}

function body(id: string, name: string, kin: string, room: string, hp?: number): Crew {
  const max = crewDef(kin).hp;
  return {
    id,
    name,
    side: "player",
    aboard: "player",
    hp: hp ?? max,
    maxHp: max,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin,
  };
}

function padCrew(g: Game, crew: Crew, roomId: string, taken: Set<string>) {
  const room = g.player.rooms.find((r) => r.id === roomId);
  if (!room) return;
  const pad = claimPadTile(room, taken);
  if (!pad) return;
  taken.add(pad);
  crew.pad = pad;
  const [x, y] = pad.split(",").map(Number);
  crew.tile = { room: roomId, x, y };
}

function medbayNeighbor(g: Game): string {
  const ids: string[] = [];
  for (const door of g.player.doors) {
    if (door.b === "void") continue;
    const other = door.a === "p-medbay" ? door.b : door.b === "p-medbay" ? door.a : "";
    if (other && !ids.includes(other)) ids.push(other);
  }
  return ids.find((id) => id !== "p-shields") ?? ids[0] ?? "p-medbay";
}

/** Kestrel A's traced weapons room has no airlock. The west wall faces space, so the demo adds that door. */
export function armWeaponsAirlock(g: Game) {
  const marks = g.player.doorMarks ?? [];
  if (!marks.some((mark) => mark.x === 4 && mark.y === 2 && mark.side === "w")) {
    g.player.doorMarks = [...marks, { x: 4, y: 2, side: "w" }];
  }
  let door = g.player.doors.find((item) => item.a === "p-weapons" && item.b === "void");
  if (!door) {
    door = { a: "p-weapons", b: "void", open: false, hp: 0, stuck: 0 };
    g.player.doors.push(door);
  }
  const max = blastHits(Math.max(2, doorLevel(g, g.player, "player")), g.difficulty);
  door.open = false;
  door.stuck = 0;
  door.hp = Math.max(1, Math.floor(max / 2));
  noteDoorArmed(door, max);
}

function weaponsAirlock(g: Game): Door | undefined {
  return g.player.doors.find((door) => door.a === "p-weapons" && door.b === "void");
}

function putBoarder(g: Game) {
  if (g.crew.some((crew) => crew.side === "enemy" && crew.aboard === "player" && crew.hp > 0 && crew.room === "p-weapons")) return;
  const donor = g.crew.find((crew) => crew.side === "enemy" && crew.hp > 0 && crew.aboard === "enemy");
  if (!donor) return;
  g.crew.push({
    id: `c-board-${g.uid++}`,
    name: donor.name,
    side: "enemy",
    aboard: "player",
    hp: donor.maxHp,
    maxHp: donor.maxHp,
    room: "p-weapons",
    path: [],
    move: 0,
    think: 0,
    tone: donor.tone,
    kin: donor.kin,
  });
}

function beamAcross(g: Game) {
  const foe = g.enemy;
  const beam = g.player.weapons.find((weapon) => weapon.defId === "halberd");
  if (!foe || !beam) return;
  let best: string[] = [];
  let line: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null;
  for (const start of foe.rooms) {
    for (const end of foe.rooms) {
      if (start.id === end.id) continue;
      const hit = roomsOnSegment(foe, roomCenter(start), roomCenter(end));
      if (hit.length > best.length) {
        best = hit;
        line = { a: roomCenter(start), b: roomCenter(end) };
      }
    }
  }
  if (!line || best.length < 2) return;
  beam.beamLine = line;
  beam.target = best[0] ?? null;
  beam.charge = 1;
  beam.enabled = true;
  g.armed = beam.uid;
}

function latchHack(g: Game, systemId: string) {
  const kit = g.player.kits.spike;
  const foe = g.enemy;
  if (!kit || !foe) return;
  kit.level = Math.max(kit.level, 2);
  kit.power = Math.max(kit.power, 1);
  kit.on = true;
  kit.left = 8;
  kit.cool = 0;
  kit.target = systemId;
  delete kit.hackQueued;
  delete kit.hackFly;
  delete kit.hackFlyTotal;
  foe.hackDrone = systemId;
  delete foe.hackFlying;
}

function stampMap(g: Game) {
  const here: Beacon = {
    id: "reel-here",
    col: 0,
    row: 1,
    x: 55,
    y: 165,
    links: ["reel-next"],
    kind: "start",
    visited: true,
    resolved: true,
    name: "Here",
    tier: "",
    flag: "",
    asteroid: false,
  };
  const next: Beacon = {
    id: "reel-next",
    col: 1,
    row: 1,
    x: 165,
    y: 165,
    links: ["reel-here"],
    kind: "empty",
    visited: false,
    resolved: false,
    name: "Next",
    tier: "pool",
    flag: "",
    asteroid: false,
  };
  g.beacons = [here, next];
  g.here = here.id;
  g.fleet = 0;
  g.dangerY = 200;
}

function fitCrew(g: Game) {
  const byId = (id: string) => g.crew.find((crew) => crew.id === id);
  const pilot = byId("c-h0");
  const engines = byId("c-h1");
  const weapons = byId("c-h2");
  if (pilot) {
    pilot.room = "p-pilot";
    pilot.path = [];
  }
  if (engines) {
    engines.room = "p-engines";
    engines.path = [];
  }
  if (weapons) {
    weapons.room = "p-weapons";
    weapons.path = [];
  }
  const extra = [
    body("c-spark", "Zed", "spark", "p-shields"),
    body("c-blade-a", "Kesh", "blade", "p-tele"),
    body("c-blade-b", "Vek", "blade", "p-tele"),
    body("c-cloak", "Ivo", "plain", "p-cloak"),
    body("c-hack", "Nen", "plain", "p-hack"),
  ];
  for (const crew of extra) {
    if (!g.crew.some((have) => have.id === crew.id)) g.crew.push(crew);
  }
  const taken = new Set<string>();
  for (const id of ["c-blade-a", "c-blade-b"]) {
    const crew = byId(id);
    if (crew) padCrew(g, crew, "p-tele", taken);
  }
}

function installGear(g: Game) {
  g.scrap = 8000;
  g.player.reactor = 48;
  installVeil(g);
  installSpike(g);
  installLeash(g);
  installSling(g);
  installCell(g);
  g.player.kits.swarm = { ...blankKit("swarm", 4, 4), loadout: ["ward", "striker"] };
  seatKits(g.player);
  const power: [Kit["id"], number, number][] = [
    ["veil", 1, 1],
    ["spike", 2, 1],
    ["leash", 1, 1],
    ["sling", 1, 1],
    ["cell", 1, 0],
    ["swarm", 4, 4],
  ];
  for (const [id, level, bars] of power) {
    const kit = g.player.kits[id];
    if (!kit) continue;
    kit.level = level;
    kit.power = bars;
    kit.on = false;
    kit.left = 0;
    kit.cool = 0;
    kit.target = null;
  }
}

function fitGuns(g: Game) {
  const charges = [1, 0.5, 1, 0.35];
  g.player.weapons = GUNS.map((defId, index) => gun(`w-${defId}`, defId, charges[index] ?? 0));
  const cost = GUNS.reduce((sum, defId) => sum + (weaponDef(defId)?.power ?? 1), 0);
  system(g, "weapons", Math.max(cost, 8), Math.max(cost, 8));
  g.armed = g.player.weapons[0]?.uid ?? null;
  g.missiles = 24;
  g.player.parts = 12;
}

function settleFight(g: Game, scene: SceneName, sensors: number) {
  const foe = g.enemy;
  if (!foe) return;
  foe.name = "Pirate Light-Surveyor";
  foe.hull = 40;
  foe.hullMax = Math.max(foe.hullMax, 40);
  foe.zoltan = 0;
  foe.boards = false;
  foe.systems.shields.level = Math.max(foe.systems.shields.level, 2);
  foe.systems.shields.power = Math.max(2, Math.min(foe.systems.shields.power, foe.systems.shields.level));
  foe.shieldNow = 1;
  foe.shieldCharge = 0;
  for (const weapon of foe.weapons) weapon.charge = 0.2;
  g.boardTimer = 0;
  g.enemySurrender = null;
  g.tutorial = false;
  g.hint = false;
  g.event = null;
  g.muted = true;
  g.paused = false;
  g.menuHold = false;
  g.picking = false;
  g.manual = false;
  g.shipSheet = false;
  g.autofireAll = false;
  g.fuel = 4;
  g.player.hull = 40;
  g.player.hullMax = Math.max(g.player.hullMax, 40);
  g.player.shieldNow = 1;
  g.player.shieldCharge = 1;
  system(g, "sensors", sensors, sensors);
  g.userPaused = scene !== "stacked";
  const running = scene === "stacked";
  const plan: EscapePlan = {
    mode: "start",
    seconds: 90,
    chance: 100,
    threshold: 100,
    rolled: true,
    running,
    pursuit: false,
  };
  g.enemyEscape = plan;
  g.enemyFlee = running ? 0.08 : 0;
  armWeaponsAirlock(g);
  stampMap(g);
}

function queueClones(g: Game) {
  const foe = g.enemy;
  if (!foe) return;
  foe.kits.cradle = blankKit("cradle", 1, 1);
  const room = foe.rooms[0]?.id ?? "e-pilot";
  for (let seq = 1; seq <= 2; seq += 1) {
    g.crew.push({
      id: `c-clone-${seq}`,
      name: `Clone ${seq}`,
      side: "enemy",
      aboard: "enemy",
      hp: 0,
      maxHp: 100,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 0,
      kin: "plain",
      cloneIn: 20,
      cloneSeq: seq,
    });
  }
}

/**
 * A late Kestrel already in a flagship fight. Both hulls are wounded, the flagship's first
 * volley is almost charged, and its cloak and hack are held off until the reel springs them.
 */
function settleFlagship(g: Game) {
  const foe = g.enemy;
  if (!foe) return;
  system(g, "shields", 8, 6);
  system(g, "engines", 5, 5);
  system(g, "oxygen", 2, 2);
  system(g, "medbay", 2, 2);
  system(g, "pilot", 3, 3);
  system(g, "doors", 3, 2);
  system(g, "sensors", 4, 4);
  g.player.shieldNow = 2;
  g.player.shieldCharge = 0;
  g.player.hull = 16;
  g.player.hullMax = Math.max(g.player.hullMax, 30);
  foe.hull = 10;
  foe.hullMax = Math.max(foe.hullMax, 20);
  foe.shieldNow = 4;
  foe.ammo = 24;
  const veil = foe.kits.veil;
  if (veil) {
    veil.on = false;
    veil.left = 0;
    veil.cool = 80;
    veil.power = Math.max(1, veil.power);
  }
  const spike = foe.kits.spike;
  if (spike) spike.cool = 60;
  for (const weapon of foe.weapons) {
    weapon.charge = weapon.defId === "bosslaser" || weapon.defId === "bossmissile" ? 0.93 : 0.2;
    weapon.enabled = true;
  }
  const burst = g.player.weapons.find((weapon) => weapon.defId === "lineburst");
  if (burst) burst.charge = 1;
  const ion = g.player.weapons.find((weapon) => weapon.defId === "ion2");
  if (ion) ion.charge = 0.35;
  const beam = g.player.weapons.find((weapon) => weapon.defId === "halberd");
  if (beam) beam.charge = 0.2;
  const bomb = g.player.weapons.find((weapon) => weapon.defId === "breach2");
  if (bomb) bomb.charge = 0.15;
  const sling = g.player.kits.sling;
  if (sling) {
    sling.level = 3;
    sling.power = 2;
    sling.cool = 0;
    sling.on = false;
  }
  const cloak = g.player.kits.veil;
  if (cloak) {
    cloak.level = 2;
    cloak.power = 2;
    cloak.cool = 0;
    cloak.on = false;
  }
  const hack = g.player.kits.spike;
  if (hack) {
    hack.level = 3;
    hack.power = 2;
    hack.cool = 0;
    hack.on = false;
  }
  const mind = g.player.kits.leash;
  if (mind) {
    mind.level = 2;
    mind.power = 1;
    mind.cool = 0;
    mind.on = false;
  }
  const doors = g.player.rooms.find((room) => room.id === "p-doors");
  if (doors) doors.fire = 1;
  armWeaponsAirlock(g);
  stampMap(g);
  const here = g.beacons.find((beacon) => beacon.id === g.here);
  if (here) here.kind = "boss";
  g.enemySurrender = null;
  g.enemyEscape = null;
  g.tutorial = false;
  g.hint = false;
  g.event = null;
  g.muted = true;
  g.paused = false;
  g.menuHold = false;
  g.picking = false;
  g.autofireAll = false;
  g.userPaused = true;
}

/** A paused or live fight with the demonstration's rooms, guns, and crew already in place. */
export function buildScene(scene: SceneName, sensors = scene === "reading" ? 1 : 4): Game {
  const g = createGame(SCENE_SEED, "kestrel-a");
  installGear(g);
  system(g, "shields", 4, 3);
  system(g, "engines", 4, 4);
  system(g, "oxygen", 1, 1);
  system(g, "medbay", 1, 1);
  system(g, "pilot", 2, 1);
  system(g, "doors", 2, 2);
  system(g, "sensors", sensors, sensors);
  fitGuns(g);
  fitCrew(g);
  startCombat(g, scene === "flagship" ? "boss" : "pirate", scene === "stacked");
  if (scene === "flagship") {
    settleFlagship(g);
    return g;
  }
  settleFight(g, scene, sensors);
  if (scene === "reading") {
    const weapons = g.enemy?.systems.weapons;
    if (weapons) weapons.ion = [4];
  }
  if (scene === "inside") {
    putBoarder(g);
    queueClones(g);
    const hurt = g.crew.find((crew) => crew.id === "c-cloak");
    if (hurt) {
      hurt.room = medbayNeighbor(g);
      hurt.hp = 18;
      hurt.path = [];
      hurt.aboard = "player";
      g.selected = hurt.id;
      g.squad = [hurt.id];
    }
  }
  if (scene === "stacked") {
    putBoarder(g);
    latchHack(g, "pilot");
    beamAcross(g);
    const weapons = g.enemy?.systems.weapons;
    if (weapons) weapons.ion = [4];
    const ionGun = g.player.weapons.find((weapon) => weapon.defId === "ion2");
    if (ionGun) ionGun.charge = 0.92;
  }
  return g;
}

function current(): Game {
  return useGame.getState().game;
}

function edit(fn: (g: Game) => void) {
  useGame.getState().act(fn);
}

let ticket = 0;

function show(scene: SceneName, sensors?: number) {
  const game = buildScene(scene, sensors);
  ticket += 1;
  game.seed = (SCENE_SEED + ticket * 9973) >>> 0 || 1;
  clearAims();
  useFast.setState({ on: false });
  useGame.setState({
    game,
    played: null,
    version: useGame.getState().version + 1,
    frame: (useGame.getState().frame ?? 0) + 1,
  });
}

function enemyEngines(power: number) {
  edit((g) => {
    const engines = g.enemy?.systems.engines;
    if (!engines) return;
    engines.power = power;
    if (power > 0) engines.level = Math.max(engines.level, power);
  });
}

function paintPoster(g: Game) {
  g.asteroid = true;
  armWeaponsAirlock(g);
  putBoarder(g);
  latchHack(g, "pilot");
  beamAcross(g);
  const weapons = g.enemy?.systems.weapons;
  if (weapons) weapons.ion = [4.5];
  g.player.shieldNow = 1;
  g.player.shieldCharge = 1;
  system(g, "shields", 4, 3);
  const burst = g.player.weapons.find((weapon) => weapon.defId === "lineburst");
  if (burst) burst.charge = 1;
}

export type ReelApi = {
  show: (scene: SceneName, sensors?: number) => void;
  play: () => void;
  hold: () => void;
  setSensors: (level: number) => void;
  stallEnemyEngines: () => void;
  restoreEnemyEngines: () => void;
  cutClonePower: () => void;
  setFuel: (fuel: number) => void;
  readyJump: () => void;
  killEnemy: () => void;
  freshHack: () => void;
  setEnemyShields: (layers: number) => void;
  primeHits: () => void;
  cloakEnemy: () => void;
  boardOne: () => void;
  poster: () => void;
  /** Let the flagship cloak on the next live tick. */
  springEnemyCloak: () => void;
  /** Bring both sides' next volley up so a short unpause still shows fire. */
  armVolley: () => void;
  /** Aim every player gun at the flagship and turn autofire on. A beam gets a line across the hull. */
  pointGuns: () => void;
  /** Leave a fire in the doors room when the hull is clear, so a vent has something to put out. */
  ensureFire: () => void;
  /** A fire can sabotage cloaking off the ship. Put it back so the last stages can still cloak. */
  readyCloak: () => void;
  enemyRoom: (systemId: string) => string | null;
  info: () => ReelInfo;
};

/** Bars still free after the current assignment. Sensors stay at 2 so the enemy interior remains readable. */
function feed(ship: Ship, have: number, want: number): number {
  const need = Math.max(0, want - have);
  if (need <= 0) return have;
  let spare = Math.max(0, sparePower(ship));
  if (spare < need) {
    const sensors = ship.systems.sensors;
    const floor = Math.min(2, Math.max(0, sensors.level - sensors.damage));
    const take = Math.min(Math.max(0, sensors.power - floor), need - spare);
    sensors.power -= take;
    spare += take;
  }
  return have + Math.min(need, Math.max(0, spare));
}

function quenchWhere(ship: Ship, match: (room: Room) => boolean) {
  const room = ship.rooms.find(match);
  if (!room || room.fire <= 0) return;
  room.fire = 0;
  room.sabotage = 0;
}

function restoreSys(g: Game, id: SysId, minCap: number, wantPower: number) {
  const ship = g.player;
  const sys = ship.systems[id];
  if (sys.level - sys.damage >= minCap) return;
  sys.damage = 0;
  sys.ion = [];
  sys.power = Math.min(sys.level, feed(ship, sys.power, Math.max(sys.power, wantPower)));
  if (id === "shields") syncShields(ship, zoltanBars(g.crew, ship, "player", "shields"));
  quenchWhere(ship, (room) => room.system === id);
}

/**
 * The finishing stretch outlasts a fire in cloaking. Put the bars the last stages
 * actually fire with back on the ship, and keep an unlatched enemy hack from launching
 * into that stretch. Hull is left where the fight put it.
 */
export function steadyShip(g: Game) {
  const ship = g.player;
  const veil = ship.kits.veil;
  if (veil) {
    const ioned = (veil.ion?.length ?? 0) > 0;
    const broken = (veil.damage ?? 0) >= veil.level || veil.power < 1 || ioned;
    if ((veil.damage ?? 0) > 0 || veil.level < 2 || veil.power < 1 || ioned) {
      veil.damage = 0;
      veil.level = Math.max(veil.level, 2);
      veil.ion = [];
      if (broken && veil.left <= 0) {
        veil.on = false;
        veil.left = 0;
        veil.cool = 0;
      }
      veil.power = feed(ship, veil.power, 2);
      quenchWhere(ship, (room) => room.id === "p-cloak" || room.kit === "veil");
    }
  }
  restoreSys(g, "shields", 4, 6);
  restoreSys(g, "weapons", 5, 8);
  restoreSys(g, "oxygen", 1, 1);
  const engines = ship.systems.engines;
  if (engines.damage > 0 || engines.power < 4 || (engines.ion?.length ?? 0) > 0) {
    engines.damage = 0;
    engines.ion = [];
    engines.power = Math.min(engines.level, feed(ship, engines.power, 5));
  }
  // Stage 3 mind-controls the pilot off the helm and then boards. Evade collapses and the surge lands.
  clearEnemyLeash(g);
  const pilot = g.crew.find((crew) => crew.id === "c-h0");
  if (pilot) {
    if (pilot.hp < 40) pilot.hp = 70;
    pilot.aboard = "player";
    pilot.room = "p-pilot";
    pilot.path = [];
    pilot.move = 0;
  }
  const enginesCrew = g.crew.find((crew) => crew.id === "c-h1");
  if (enginesCrew && enginesCrew.hp > 0) {
    if (enginesCrew.hp < 40) enginesCrew.hp = 70;
    enginesCrew.aboard = "player";
    enginesCrew.room = "p-engines";
    enginesCrew.path = [];
    enginesCrew.move = 0;
  }
  for (const kitId of ["leash", "sling"] as const) {
    const kit = g.enemy?.kits[kitId];
    if (!kit) continue;
    kit.power = 0;
    kit.on = false;
    kit.left = 0;
    if (kit.cool < 30) kit.cool = 30;
  }
  const swarm = ship.kits.swarm;
  if (swarm && ((swarm.damage ?? 0) > 0 || swarm.power < 1)) {
    swarm.damage = 0;
    swarm.ion = [];
    swarm.level = Math.max(swarm.level, 2);
    swarm.power = feed(ship, swarm.power, Math.max(2, swarm.power));
    quenchWhere(ship, (room) => room.id === "p-drones" || room.kit === "swarm");
  }
  const hack = g.enemy?.kits.spike;
  if (hack && hack.hackFly == null && !hack.hackLatched && hack.cool < 30) hack.cool = 30;
  // Stage 3's laser surge can erase a hull that is already this low. Leave enough to finish the stage.
  if ((g.enemy?.flagship?.stage ?? 0) >= 3 && ship.hull < 6) ship.hull = 9;
}

const api: ReelApi = {
  show,
  play: () => edit((g) => {
    g.userPaused = false;
  }),
  hold: () => edit((g) => {
    g.userPaused = true;
  }),
  setSensors: (level) => edit((g) => system(g, "sensors", level, level)),
  stallEnemyEngines: () => enemyEngines(0),
  restoreEnemyEngines: () => enemyEngines(2),
  cutClonePower: () => edit((g) => {
    const kit = g.enemy?.kits.cradle;
    if (kit) kit.power = 0;
  }),
  setFuel: (fuel) => edit((g) => {
    g.fuel = fuel;
  }),
  readyJump: () => edit((g) => {
    g.flee = 1;
    const pilot = g.crew.find((crew) => crew.id === "c-h0");
    if (pilot) {
      pilot.room = "p-pilot";
      pilot.aboard = "player";
      pilot.path = [];
      pilot.hp = Math.max(pilot.hp, 1);
    }
    system(g, "engines", Math.max(g.player.systems.engines.level, 2), Math.max(g.player.systems.engines.power, 2));
  }),
  killEnemy: () => edit((g) => {
    if (g.enemy) g.enemy.hull = 0;
    g.userPaused = false;
    g.menuHold = false;
    g.paused = false;
    g.picking = false;
    g.shipSheet = false;
    g.manual = false;
    for (let i = 0; i < 8 && g.phase === "combat"; i += 1) step(g, 0.05);
  }),
  freshHack: () => edit((g) => {
    const kit = g.player.kits.spike;
    const foe = g.enemy;
    if (!kit || !foe) return;
    delete foe.hackDrone;
    delete foe.hackFlying;
    kit.on = false;
    kit.left = 0;
    kit.cool = 0;
    kit.target = null;
    kit.power = Math.max(1, kit.power);
    delete kit.hackQueued;
    delete kit.hackFly;
    delete kit.hackFlyTotal;
    if (g.player.parts < 1) g.player.parts = 4;
  }),
  setEnemyShields: (layers) => edit((g) => {
    const foe = g.enemy;
    if (!foe) return;
    const sys = foe.systems.shields;
    sys.level = Math.max(sys.level, layers * 2, 2);
    sys.power = Math.max(layers * 2, 2);
    sys.damage = 0;
    sys.ion = [];
    foe.shieldNow = layers;
    foe.shieldCharge = 0;
  }),
  primeHits: () => edit((g) => {
    for (const weapon of g.player.weapons) {
      if (weapon.defId === "lineburst" || weapon.defId === "halberd") weapon.charge = 1;
      if (weapon.defId === "ion2") weapon.charge = 0.9;
      if (weapon.defId === "breach2") weapon.charge = 0.85;
    }
    g.missiles = Math.max(g.missiles, 6);
    const foe = g.enemy;
    if (!foe) return;
    foe.systems.shields.level = Math.max(foe.systems.shields.level, 4);
    foe.systems.shields.power = 4;
    foe.shieldNow = 2;
    foe.shieldCharge = 0;
  }),
  cloakEnemy: () => edit((g) => {
    const foe = g.enemy;
    if (!foe) return;
    foe.kits.veil = { ...blankKit("veil", 1, 1), on: true, left: 12, target: "hold" };
  }),
  boardOne: () => edit((g) => {
    const foe = g.enemy;
    if (!foe) return;
    const crew = g.crew.find((body) => body.side === "player" && body.aboard === "player" && body.hp > 0 && body.id !== "c-h0");
    const room = foe.rooms.find((item) => item.system === "weapons") ?? foe.rooms[0];
    if (!crew || !room) return;
    crew.aboard = "enemy";
    crew.room = room.id;
    crew.path = [];
    crew.move = 0;
    delete crew.pad;
  }),
  poster: () => edit((g) => {
    paintPoster(g);
    g.userPaused = true;
    g.paused = false;
    g.menuHold = false;
    g.picking = false;
  }),
  springEnemyCloak: () => edit((g) => {
    const kit = g.enemy?.kits.veil;
    if (!kit) return;
    kit.on = false;
    kit.left = 0;
    kit.cool = 0;
    kit.power = Math.max(1, kit.power);
  }),
  armVolley: () => edit((g) => {
    for (const weapon of g.enemy?.weapons ?? []) {
      if (weapon.defId === "bosslaser" || weapon.defId === "bossmissile") weapon.charge = 0.97;
    }
    const burst = g.player.weapons.find((weapon) => weapon.defId === "lineburst");
    if (burst) burst.charge = 1;
    const ion = g.player.weapons.find((weapon) => weapon.defId === "ion2");
    if (ion) ion.charge = 0.98;
    const hack = g.enemy?.kits.spike;
    if (hack && hack.hackFly == null && !hack.hackLatched) hack.cool = Math.max(hack.cool, 45);
  }),
  pointGuns: () => {
    clearAims();
    edit((g) => {
      const foe = g.enemy;
      if (!foe) return;
      const shields = foe.rooms.find((room) => room.system === "shields") ?? foe.rooms[0];
      if (!shields) return;
      let best: string[] = [];
      let line: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null;
      for (const start of foe.rooms) {
        for (const end of foe.rooms) {
          if (start.id === end.id) continue;
          const hit = roomsOnSegment(foe, roomCenter(start), roomCenter(end));
          if (hit.length > best.length) {
            best = hit;
            line = { a: roomCenter(start), b: roomCenter(end) };
          }
        }
      }
      for (const weapon of g.player.weapons) {
        weapon.enabled = true;
        const kind = weaponDef(weapon.defId)?.kind;
        if (kind === "beam" && line) {
          weapon.beamLine = line;
          weapon.target = best[0] ?? shields.id;
        } else {
          weapon.target = shields.id;
          weapon.beamLine = null;
          weapon.own = false;
        }
      }
      g.autofireAll = true;
      g.targeting = false;
      g.beamAnchor = null;
      if (g.missiles < 4) g.missiles = 8;
      for (const weapon of g.player.weapons) weapon.charge = Math.max(weapon.charge, 0.9);
    });
  },
  ensureFire: () => edit((g) => {
    if (g.player.rooms.some((room) => room.fire > 0)) return;
    const doors = g.player.rooms.find((room) => room.id === "p-doors");
    if (doors) doors.fire = 1;
  }),
  readyCloak: () => edit((g) => {
    steadyShip(g);
  }),
  enemyRoom: (systemId) => {
    const foe = current().enemy;
    return foe?.rooms.find((room) => room.system === systemId || room.kit === systemId)?.id ?? null;
  },
  info: () => {
    const g = current();
    const hack = playerHackView(g);
    const clone = enemyCloneQueue(g);
    const weapons = g.player.rooms.find((room) => room.id === "p-weapons");
    const hurt = g.crew.find((crew) => crew.id === "c-cloak");
    const beam = g.player.weapons.find((weapon) => weapon.defId === "halberd");
    const rooms = g.enemy && beam?.beamLine ? roomsOnSegment(g.enemy, beam.beamLine.a, beam.beamLine.b) : [];
    const escape = g.enemyEscape;
    return {
      phase: g.phase,
      paused: g.paused,
      userPaused: !!g.userPaused,
      picking: g.picking,
      fuel: g.fuel,
      autofire: g.autofireAll,
      sensors: g.player.systems.sensors.level,
      name: g.enemy?.name ?? "",
      flee: g.flee,
      asteroid: g.asteroid,
      cloakOn: !!g.player.kits.veil?.on,
      cloakLeft: g.player.kits.veil?.left ?? 0,
      hack: hack?.state ?? null,
      slingCool: g.player.kits.sling?.cool ?? 0,
      away: g.crew.filter((crew) => crew.side === "player" && crew.aboard === "enemy" && crew.hp > 0).length,
      doorHurt: !!weaponsAirlock(g) && doorHurt(weaponsAirlock(g)!),
      weaponsVent: !!weapons?.venting,
      weaponsO2: weapons?.o2 ?? 0,
      cloneOffline: clone ? clone.offline : null,
      cloneCount: clone?.count ?? 0,
      escapeRunning: !!escape?.running,
      escapeStalled: !!g.enemy && g.enemy.systems.engines.power <= 0 && !!escape?.running,
      beamRooms: rooms.length,
      enemyWeaponsIon: g.enemy?.systems.weapons.ion.length ?? 0,
      swarmTarget: g.player.kits.swarm?.target ?? null,
      swarmPower: g.player.kits.swarm?.power ?? 0,
      enginesPower: g.player.systems.engines.power,
      shieldsPower: g.player.systems.shields.power,
      batteryOn: !!g.player.kits.cell?.on,
      hurtHp: hurt?.hp ?? null,
      hurtRoom: hurt?.room ?? null,
      shieldsNow: g.player.shieldNow,
      enemyShields: g.enemy?.shieldNow ?? 0,
      playerHull: g.player.hull,
      playerMax: g.player.hullMax,
      enemyHull: g.enemy?.hull ?? 0,
      enemyMax: g.enemy?.hullMax ?? 0,
      stage: g.enemy?.flagship?.stage ?? 0,
      fires: g.player.rooms.filter((room) => room.fire > 0).length,
      cloakCool: g.player.kits.veil?.on ? 0 : (g.player.kits.veil?.cool ?? 0),
      surge: g.bossSurge ?? -1,
    };
  },
};

export function installReel() {
  (window as unknown as { __stlReel?: ReelApi }).__stlReel = api;
}

export { doorHurt };
