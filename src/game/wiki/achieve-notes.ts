/**
 * Counters for the Achievements and Ship Achievements lines that are not a single field
 * the run already stored. Each mark is the printed condition. Nothing here grants a reward.
 */
import type { AchieveTally, Game } from "../types.ts";

const LIFE_KEY = "stl-achieve-life-v1";
const contributed = new WeakMap<Game, { scrap: number; kills: number }>();

export type AchieveNote =
  | { k: "tick" }
  | { k: "fight" }
  | { k: "shot"; from: "player" | "enemy"; kind: string; defId: string; rooms: string[] }
  | { k: "evade"; missed: boolean; damage?: number }
  | { k: "upgrade" }
  | { k: "store"; repair: boolean }
  | { k: "hull"; before: number; after: number }
  | { k: "jump"; nebula: boolean; hazard: boolean }
  | { k: "death"; side: "player" | "enemy"; cloned: boolean; fire: boolean; playerThere: boolean; lastEnemy: boolean; lastPlayerAboard: boolean; boarder: boolean }
  | { k: "win"; deadCrew: boolean; allAboard: boolean; defense: boolean; rock: boolean }
  | { k: "teleport" }
  | { k: "drone"; kind: string; functioning: number }
  | { k: "droneHull" }
  | { k: "weaponHull" }
  | { k: "cloak" }
  | { k: "vengeance" };

function box(g: Game): AchieveTally {
  if (!g.tally) g.tally = {};
  return g.tally;
}

function life(): { scrap: number; kills: number } {
  try {
    if (typeof localStorage === "undefined") return { scrap: 0, kills: 0 };
    const raw = localStorage.getItem(LIFE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { scrap?: unknown; kills?: unknown }) : {};
    return {
      scrap: typeof parsed.scrap === "number" ? parsed.scrap : 0,
      kills: typeof parsed.kills === "number" ? parsed.kills : 0,
    };
  } catch {
    return { scrap: 0, kills: 0 };
  }
}

function writeLife(row: { scrap: number; kills: number }) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LIFE_KEY, JSON.stringify(row));
  } catch {
    // Storage can be full or blocked. This run's own scrap and kills still count below.
  }
}

/** Scrap and kills across earlier runs, plus this run, without counting this run twice. */
export function lifetimeOf(g: Game): { scrap: number; kills: number } {
  const bank = life();
  const already = contributed.get(g) ?? { scrap: 0, kills: 0 };
  return {
    scrap: bank.scrap - already.scrap + (g.scrapCollected ?? 0),
    kills: bank.kills - already.kills + (g.kills ?? 0),
  };
}

/** Fold this run's scrap and kills into the cross-game totals. */
export function bankLifetime(g: Game) {
  const prev = contributed.get(g) ?? { scrap: 0, kills: 0 };
  const bank = life();
  bank.scrap += Math.max(0, (g.scrapCollected ?? 0) - prev.scrap);
  bank.kills += Math.max(0, (g.kills ?? 0) - prev.kills);
  contributed.set(g, { scrap: g.scrapCollected ?? 0, kills: g.kills ?? 0 });
  writeLife(bank);
}

function enginesFull(g: Game): boolean {
  const eng = g.player.systems.engines;
  return eng.level >= 8 && eng.power >= eng.level && eng.damage === 0 && eng.ion.length === 0;
}

function offensiveDrone(kind: string): boolean {
  // Drone Control ids are striker and board. The printed names stay accepted too.
  return (
    kind === "combat" ||
    kind === "striker" ||
    kind === "combat2" ||
    kind === "beam" ||
    kind === "beam2" ||
    kind === "fire" ||
    kind === "board" ||
    kind === "boarder" ||
    kind === "boarding" ||
    kind === "ionintruder"
  );
}

function observe(g: Game) {
  const t = box(g);
  // Ship Achievements, Lanius: net oxygen, the same mean the asphyxiation line uses.
  if ((g.jumps ?? 0) > 0 && g.player.rooms.length > 0) {
    const net = g.player.rooms.reduce((sum, r) => sum + r.o2, 0) / g.player.rooms.length;
    if (net > 20) t.o2Broke = true;
  }
  // Ship Achievements, Stealth: "get to sector 8 without jumping to a beacon with an environmental danger."
  if (g.sector >= 8 && !t.envJump) t.reachedClean = true;
  const enemy = g.enemy;
  if (!enemy) return;
  if (enemy.rooms.length > 0 && enemy.rooms.every((r) => r.fire >= 1)) t.burnedAll = true;
  if (!enemy.automated && enemy.rooms.length > 0) {
    const net = enemy.rooms.reduce((sum, r) => sum + r.o2, 0) / enemy.rooms.length;
    if (net < 5) t.asphyxia = true;
  }
  const ioned = Object.values(enemy.systems).filter((sys) => sys.ion.length > 0).length;
  if (ioned >= 4) t.ionFour = true;
  for (const room of enemy.rooms) {
    if ((room.lock ?? 0) <= 0) continue;
    const trapped = g.crew.filter((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy" && c.room === room.id).length;
    if (trapped >= 4) t.trapped = true;
  }
  if (t.shieldArmed && (g.player.zoltan ?? 0) <= 0) t.shieldIntact = false;
  const hack = g.player.kits.spike;
  const mind = g.player.kits.leash;
  const cell = g.player.kits.cell;
  // Ship Achievements, Lanius: "Have Hacking, Mind Control and the Battery all active at once."
  if (hack?.on && mind?.on && cell?.on) t.mastery = true;
  const functioning = (g.player.kits.swarm?.drones ?? []).filter((d) => d.alive && d.powered).length;
  if (functioning > (t.dronePeak ?? 0)) t.dronePeak = functioning;
}

function onShot(g: Game, ev: Extract<AchieveNote, { k: "shot" }>) {
  const t = box(g);
  if (ev.from !== "player") {
    t.enemyShot = true;
    return;
  }
  t.shot = true;
  t.playerShots = (t.playerShots ?? 0) + 1;
  if (ev.kind === "missile" || ev.kind === "bomb") {
    t.missileOrBomb = true;
    if (ev.kind === "missile") t.missileShots = (t.missileShots ?? 0) + 1;
  } else t.otherWeapon = true;
  if (ev.kind === "beam" && g.enemy) {
    const now = g.time;
    if (t.beamAt == null || now - t.beamAt > 5) {
      t.beamAt = now;
      t.beamRooms = [];
    }
    const seen = new Set(t.beamRooms ?? []);
    for (const id of ev.rooms) seen.add(id);
    t.beamRooms = [...seen];
    if (g.enemy.rooms.length > 0 && g.enemy.rooms.every((r) => seen.has(r.id))) t.sliced = true;
  }
  if (ev.defId === "antibio") {
    const n = ev.rooms.reduce(
      (sum, id) => sum + g.crew.filter((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy" && c.room === id).length,
      0,
    );
    if (n > (t.antiBio ?? 0)) t.antiBio = n;
  }
}

function onDeath(g: Game, ev: Extract<AchieveNote, { k: "death" }>) {
  const t = box(g);
  if (ev.side === "player") {
    if (!ev.cloned) {
      t.lostCrew = true;
      t.cleanBroke = true;
    }
    return;
  }
  t.cleanKills = (t.cleanKills ?? 0) + 1;
  // Ship Achievements, Mantis: five crew kills in a fight with no hull damage and no lost crewmember.
  if ((t.cleanKills ?? 0) >= 5 && !t.cleanBroke && !t.fightHull) t.avast = true;
  if (ev.boarder) {
    t.boardKills = (t.boardKills ?? 0) + 1;
    if ((t.boardKills ?? 0) > (t.boardBest ?? 0)) t.boardBest = t.boardKills;
  }
  if (ev.fire && ev.playerThere) t.warmKill = true;
  if (ev.lastEnemy && ev.lastPlayerAboard) t.lastStand = true;
}

function onWin(g: Game, ev: Extract<AchieveNote, { k: "win" }>) {
  const t = box(g);
  if (ev.allAboard) t.allAboard = true;
  if (ev.deadCrew && (g.sector ?? 1) <= 6) t.crewKillShips = (t.crewKillShips ?? 0) + 1;
  if (ev.deadCrew) return;
  const hullKill = !!g.enemy && g.enemy.hull <= 0;
  if (!hullKill) return;
  if (t.artilleryUsed && !t.otherWeapon && !t.weaponHurt && !t.droneHurt && !t.fightHull) t.artilleryKill = true;
  if (t.droneHurt && !t.weaponHurt && !t.otherWeapon && !t.artilleryUsed) t.droneOnly = true;
  if ((t.missileShots ?? 0) > 0 && !t.otherWeapon && ev.defense) t.missileDefense = true;
  if (t.shieldArmed && t.shieldIntact) t.shieldsHeld = true;
  if (t.cloakPrey && g.player.kits.veil?.on) t.bird = true;
  if (ev.rock) t.rockKills = (t.rockKills ?? 0) + 1;
  if (g.augments.includes("hot") && !t.enemyShot && (t.playerShots ?? 0) > 0) t.sawIt = true;
}

/** Record one printed achievement condition. Safe to call when the tally was absent. */
export function noteAchieve(g: Game, ev: AchieveNote) {
  if (ev.k === "tick") {
    observe(g);
    return;
  }
  const t = box(g);
  if (ev.k === "fight") {
    t.evadeStreak = 0;
    t.boardKills = 0;
    t.cleanKills = 0;
    t.cleanBroke = false;
    t.enemyShot = false;
    t.playerShots = 0;
    t.weaponHurt = false;
    t.droneHurt = false;
    t.artilleryUsed = false;
    t.otherWeapon = false;
    t.missileShots = 0;
    t.fightHull = false;
    t.shieldArmed = (g.player.zoltan ?? 0) > 0;
    t.shieldIntact = t.shieldArmed;
    t.cloakPrey = false;
    return;
  }
  if (ev.k === "shot") {
    onShot(g, ev);
    return;
  }
  if (ev.k === "evade") {
    // Ship Achievements, Stealth: "avoid 9 points of damage during a single cloak."
    // A miss while the cloak is up is damage that did not land. Hull that does land is not avoided.
    if (ev.missed && g.player.kits.veil?.on && (ev.damage ?? 0) > 0) {
      t.cloakAvoid = (t.cloakAvoid ?? 0) + (ev.damage ?? 0);
      if ((t.cloakAvoid ?? 0) >= 9) t.phaseShift = true;
    }
    if (!enginesFull(g) || ev.missed) {
      t.evadeStreak = 0;
      return;
    }
    t.evadeStreak = (t.evadeStreak ?? 0) + 1;
    if ((t.evadeStreak ?? 0) > (t.evadeBest ?? 0)) t.evadeBest = t.evadeStreak;
    return;
  }
  if (ev.k === "upgrade") {
    t.upgraded = true;
    return;
  }
  if (ev.k === "store") {
    if (ev.repair) t.storeRepair = true;
    else t.storeBuy = true;
    return;
  }
  if (ev.k === "hull") {
    if (ev.after > ev.before && ev.before <= 1 && ev.after >= g.player.hullMax) t.fromOne = true;
    if (ev.after < ev.before && g.phase === "combat") {
      t.fightHull = true;
      t.cleanBroke = true;
    }
    return;
  }
  if (ev.k === "jump") {
    if (ev.nebula) t.nebulaJumps = (t.nebulaJumps ?? 0) + 1;
    if (ev.hazard) t.envJump = true;
    return;
  }
  if (ev.k === "death") {
    onDeath(g, ev);
    return;
  }
  if (ev.k === "win") {
    onWin(g, ev);
    return;
  }
  if (ev.k === "teleport") {
    t.teleported = true;
    return;
  }
  if (ev.k === "drone") {
    t.usedDrone = true;
    if (offensiveDrone(ev.kind)) t.offensiveDrone = true;
    if (ev.functioning > (t.dronePeak ?? 0)) t.dronePeak = ev.functioning;
    return;
  }
  if (ev.k === "droneHull") {
    t.droneHurt = true;
    return;
  }
  if (ev.k === "weaponHull") {
    t.weaponHurt = true;
    return;
  }
  if (ev.k === "cloak") {
    const enemy = g.enemy;
    t.cloakPrey = !!enemy && enemy.hull > 0 && enemy.hull >= enemy.hullMax;
    t.cloakAvoid = 0;
    return;
  }
  if (ev.k === "vengeance") t.vengeance = true;
}

/** Artillery Beam fired. A normal weapon shot is a different mark. */
export function noteArtillery(g: Game) {
  box(g).artilleryUsed = true;
}
