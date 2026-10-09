import { log, noteWeaponManning, rand, sparePower } from "../sim.ts";
import { noteAchieve } from "../wiki/achieve-notes.ts";
import { cellOccupied, seatKits } from "../layouts.ts";
import { feedRate } from "./augments.ts";
import { hackPulseOn } from "./spike.ts";
import { veilBlocks } from "./veil.ts";
import type { Game, Kit, Shot, Ship } from "../types.ts";

/**
 * Charge lives on the hull's flak kit (aux is seconds toward the next burst).
 * Flak Artillery, Overview: pre-installed, not a store item.
 */
type FlakLevel = 1 | 2 | 3 | 4;

/** Flak Artillery, System Upgrades: charge time. */
export const CHARGE_SECONDS: Record<FlakLevel, number> = {
  // Flak Artillery, System Upgrades: level 1, 50 sec
  1: 50,
  // Flak Artillery, System Upgrades: level 2, 40 sec
  2: 40,
  // Flak Artillery, System Upgrades: level 3, 30 sec
  3: 30,
  // Flak Artillery, System Upgrades: level 4, 20 sec
  4: 20,
};

/**
 * Flak Artillery, System Upgrades: cost to reach that level from the one below.
 * Level 1 is a dash on that table (no purchase into the row).
 */
export const UPGRADE_COSTS: Record<2 | 3 | 4, number> = {
  // Flak Artillery, System Upgrades: level 2 costs 30
  2: 30,
  // Flak Artillery, System Upgrades: level 3 costs 50
  3: 50,
  // Flak Artillery, System Upgrades: level 4 costs 80
  4: 80,
};

/**
 * Not sold.
 * Flak Artillery, Overview: pre-installed only.
 * Wiki page "Flak (Weapons)", section "Flak weapons table": Price N/A.
 * Wiki page "Flak Artillery", section "System Upgrades": purchase cost is a dash.
 * armFlak therefore spends no scrap.
 */
export const SOLD_IN_STORES = false;

/**
 * Flak Artillery, Overview: "Automatically fires a 7-flak burst".
 * Wiki page "Flak (Weapons)", section "List of Flak weapons": Shots 7.
 * These are the damaging shots. The extra pellets are FAKE_FLAK.
 */
export const PROJECTILES = 7;

/**
 * Wiki page "Flak (Weapons)", section "List of Flak weapons", ===Flak Artillery===: Additional fake flak 7.
 * Wiki page "Flak (Weapons)", section "Understanding flak accuracy": "These are fake flak, which cannot
 * take down shields or deal damage, but can distract defense drones or collide with other projectiles."
 * That section also says fake flak causes MISS notices when the player's ship evades them.
 * INVENTED: each fake pellet is a missile with damage 0 and this label. A flak shot drops a shield layer
 * whenever the bubble is above pierce, even at damage 0. A missile does not drop a layer, and a hit with
 * damage 0 deals nothing. Defense drones shoot missiles. A missile is a projectile the line-of-fire check
 * can strike. offRoom is the swarm-miss flag, so these pellets do not set it.
 * The page does not print a kind, a damage number, or a label for the fake pellets.
 * INFERRED: this sim has no shot-versus-shot check, so the line-of-fire strike is the collision they get.
 */
export const FAKE_FLAK = 7;
export const FAKE_LABEL = "fake-flak";

/**
 * Flak Artillery, Overview: "does one damage to room that it hits."
 * Wiki page "Flak (Weapons)", section "List of Flak weapons": Damage per shot 1.
 */
export const DAMAGE = 1;

/**
 * Wiki page "Flak (Weapons)", section "Flak weapons table": Power 1-4*.
 * Template:Flak weapons, Flak Artillery: "Artillery system with a maximum of 4 system levels".
 * Charge tooltip: charge time depends on the filled power level, 50/40/30/20.
 * A Zoltan stamp is not a bar. Max bars are the level, minus damage.
 */
export const POWER_BARS: Record<FlakLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

/**
 * INFERRED: 0.7s flight, same as the host's other non-missile projectiles.
 * Wiki page "Flak (Weapons)", section "Flak weapons table": speed 26, which is not a second count.
 */
const FLIGHT_SECONDS = 0.7;

function blank(level: FlakLevel): Kit {
  return { id: "flak", level, power: 0, left: 0, cool: 0, target: null, on: true, aux: 0 };
}

export function chargeFlakSeconds(level: FlakLevel): number {
  return CHARGE_SECONDS[level];
}

/** Install at a level without a store. Flak Artillery, Overview: not sold. The kit is the slot. */
export function armFlak(g: Game, level: FlakLevel): void {
  g.player.kits.flak = blank(level);
  seatKits(g.player); // Kit room (layouts.ts): a fitted system takes its hull's room.
}

/** Flak Artillery, "System Upgrades": scrap to reach the next level. Level 1's cost is a dash. */
export function flakUpgradeCost(level: number): number | null {
  if (level === 1) return UPGRADE_COSTS[2];
  if (level === 2) return UPGRADE_COSTS[3];
  if (level === 3) return UPGRADE_COSTS[4];
  return null;
}

/** Flak Artillery, "System Upgrades": 30, then 50, then 80, through level 4. */
export function upgradeFlak(g: Game): boolean {
  const kit = g.player.kits.flak;
  if (!kit) return false;
  const cost = flakUpgradeCost(kit.level);
  if (cost == null || g.scrap < cost) return false;
  g.scrap -= cost;
  kit.level += 1;
  noteAchieve(g, { k: "upgrade" });
  log(g, "Flak Artillery raised.");
  return true;
}

/** Filled bars cannot pass min(4, level) minus damage. A Zoltan stamp is not part of this cap. */
function powerCap(kit: { level: number; damage?: number }): number {
  const level = Math.max(0, Math.min(4, kit.level));
  return Math.max(0, level - (kit.damage ?? 0));
}

function asFlakLevel(level: number): FlakLevel {
  if (level >= 4) return 4;
  if (level >= 3) return 3;
  if (level >= 2) return 2;
  return 1;
}

/** Reactor bars only, capped by level minus damage. Flak Artillery does not read Zoltan bars. */
function fedBars(kit: Kit): number {
  return Math.max(0, Math.min(kit.power, powerCap(kit)));
}

/**
 * One reactor bar at a time, up to powerCap, and only when a spare reactor bar is free.
 * Template:Flak weapons, Flak Artillery: power 1-4*, maximum of 4 system levels.
 */
export function raiseFlakPower(g: Game): void {
  const kit = g.player.kits.flak;
  if (!kit || kit.power >= powerCap(kit) || sparePower(g.player) < 1) return;
  kit.power += 1;
  kit.on = true;
}

export function lowerFlakPower(g: Game): void {
  const kit = g.player.kits.flak;
  if (!kit || kit.power <= 0) return;
  kit.power -= 1;
  kit.on = kit.power > 0;
}

function tickShip(g: Game, ship: Ship, from: "player" | "enemy", dt: number): void {
  const kit = ship.kits.flak;
  if (!kit) return;
  const other = from === "player" ? g.enemy : g.player;
  // Installed level's charge time. The power-off drain uses this, not the filled bars.
  const seconds = chargeFlakSeconds(asFlakLevel(kit.level));
  const fed = fedBars(kit);
  // Systems, "Damaged and destroyed systems": "A system with all its levels damaged is considered destroyed, i.e.
  // completely unfunctional". Flak Artillery, Overview: "Powering off drains charge quickly".
  // INFERRED: zero reactor bars, kit.on === false, or a destroyed flak drains the same way: a full bar of the
  // installed level empties in 2 seconds.
  if (!kit.on || fed < 1 || (kit.damage ?? 0) >= kit.level) {
    kit.aux = Math.max(0, kit.aux - (dt * seconds) / 2);
    return;
  }
  // Template:Flak weapons, Flak Artillery: charge time depends on the system power level, not the installed level.
  // 1 bar → 50s, 2 → 40s, 3 → 30s, 4 → 20s. A level-4 kit with 1 bar still takes 50.
  const clock = chargeFlakSeconds(asFlakLevel(fed));
  // @agent:hacking. Hacking wiki, "Overview" (Active effects): "Artillery Beam / Flak Artillery / Rebel Flagship
  // weapons: drains charge (same effect as on weapons)"; on weapons "Draining speed is the same as speed as the
  // base-level charging speed". aux is seconds of charge, so it loses one second per second of pulse.
  if (hackPulseOn(g, ship, "flak")) {
    kit.aux = Math.max(0, kit.aux - dt);
    return;
  }
  // Cloaking, Overview: "Weapons and artillery systems stop charging and cannot target a cloaked ship."
  // The <= 20 second exception is a beam trajectory. Flak Artillery is not that beam.
  if (from === "player" && veilBlocks(g, "player")) return;
  // Flak Artillery, Overview: "Automated Re-loaders work." The system "cannot be manned", so crew skill
  // does not shorten this clock. Augmentations, Automated Re-loader: one copy divides cooldown by 1.1,
  // and three raise firing rate by 30%. The drain above stays on the printed clock.
  kit.aux += dt * feedRate(g, from);
  if (kit.aux < clock) return;
  const rooms = other?.rooms ?? [];
  if (rooms.length === 0) {
    kit.aux = clock;
    return;
  }
  kit.aux = 0;
  const targets = spreadRooms(g, rooms, PROJECTILES);
  const born: Shot[] = [];
  // INFERRED: decoys are pushed first. A defense drone takes the first eligible shot in the list.
  // The page does not print which pellet it prefers.
  // INFERRED: a fake pellet is aimed at a room in list order and does not roll the 1x2 split.
  // That split is the damaging shot's landing. The page does not print a separate aim for fakes.
  for (let i = 0; i < FAKE_FLAK; i++) {
    born.push({
      id: nextId(g),
      kind: "missile",
      from,
      damage: 0,
      ion: 0,
      fireChance: 0,
      breachChance: 0,
      targetRoom: rooms[i % rooms.length].id,
      wait: 0,
      t: 0,
      duration: FLIGHT_SECONDS,
      label: FAKE_LABEL,
    });
  }
  for (let i = 0; i < PROJECTILES; i++) {
    const landed = targets[i];
    const shot: Shot = {
      id: nextId(g),
      kind: "flak",
      from,
      damage: DAMAGE,
      ion: 0,
      fireChance: 0,
      breachChance: 0,
      targetRoom: landed.roomId,
      // INFERRED: an empty long-side tile is not a room. offRoom makes the impact deal nothing.
      offRoom: landed.offRoom ? true : undefined,
      wait: 0,
      t: 0,
      duration: FLIGHT_SECONDS,
    };
    born.push(shot);
  }
  g.shots.push(...born);
  // Crew skills, Weapons: one point when an artillery system fires. Seven shots are one fire.
  if (from === "player") noteWeaponManning(g);
}

/**
 * Spools every fitted flak kit. At a full charge, pushes 7 shots of 1 damage and 7 fake pellets.
 * Flak Artillery, Overview: fires when charge is complete, each shot at a room.
 */
export function tickFlak(g: Game, dt: number): void {
  if (!(dt > 0)) return;
  if (g.paused || g.phase !== "combat") return;
  tickShip(g, g.player, "player", dt);
  if (g.enemy) tickShip(g, g.enemy, "enemy", dt);
}

/**
 * Flak (Weapons), ===Flak Artillery===.
 * "When fired at 1x2 room: 60.90% in main room, 9.78% in each tile next to long sides."
 * "When fired at 2x2 room: 100% in main room."
 * Targeting area radius 35 is not simulated as pixels. Fake pellets do not use this split.
 * INFERRED: which room a shot is fired at is still a shuffled round-robin. The page does not print that order.
 * INFERRED: 60.90 + 4×9.78 = 100.02, so the last long-side tile is short the extra two hundredths.
 * INFERRED: a 2×1 is that 1×2 rectangle turned, so it uses the same split.
 * INFERRED: a shape with no printed percent stays in the aimed room.
 * INFERRED: a long-side tile maps to the room whose floor contains that cell. The page does not print the map.
 * INFERRED: a long-side tile with no room is a miss, not a hit on the aimed room.
 * INFERRED: the four long-side percents are equal, ordered north then south, or west then east, along the room.
 */
/** Printed percents, in hundredths of a percent: 60.90, then four steps of 9.78. The last step stops at 100. */
const BOUNDS = [6090, 6090 + 978, 6090 + 978 * 2, 6090 + 978 * 3];
export const FLAK_CUTS = BOUNDS.map((n) => n / 10000);

export type FlakAimRoom = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type FlakLand = { kind: "stay" } | { kind: "room"; roomId: string } | { kind: "miss" };

type Tile = { x: number; y: number };

function floorTiles(room: FlakAimRoom): Tile[] {
  const out: Tile[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/** Two floor tiles that share an edge. A 2×2 and every other shape return null. */
function twoTile(room: FlakAimRoom): [Tile, Tile] | null {
  if (room.w * room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 2) return null;
  const [a, b] = tiles;
  const straight = (a.x === b.x && Math.abs(a.y - b.y) === 1) || (a.y === b.y && Math.abs(a.x - b.x) === 1);
  return straight ? [a, b] : null;
}

/** True only when the shot must roll the printed 1×2 split. A 2×2 does not roll. */
export function flakAimRolls(room: FlakAimRoom): boolean {
  return twoTile(room) != null;
}

/** -1 is the main room. 0..3 are the long-side tiles. The last tile runs to 1. */
function sideIndex(roll: number): number {
  if (roll < FLAK_CUTS[0]) return -1;
  if (roll < FLAK_CUTS[1]) return 0;
  if (roll < FLAK_CUTS[2]) return 1;
  if (roll < FLAK_CUTS[3]) return 2;
  return 3;
}

function longSideTiles(pair: [Tile, Tile]): [Tile, Tile, Tile, Tile] {
  const [a, b] = pair;
  if (a.y === b.y) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    return [
      { x: left.x, y: left.y - 1 },
      { x: right.x, y: right.y - 1 },
      { x: left.x, y: left.y + 1 },
      { x: right.x, y: right.y + 1 },
    ];
  }
  const [top, bot] = a.y < b.y ? [a, b] : [b, a];
  return [
    { x: top.x - 1, y: top.y },
    { x: bot.x - 1, y: bot.y },
    { x: top.x + 1, y: top.y },
    { x: bot.x + 1, y: bot.y },
  ];
}

/**
 * Where one artillery pellet lands. `roll` is used only for a two-tile room.
 * A 2×2 and every unprinted shape ignore `roll` and stay.
 */
export function flakLanding(rooms: readonly FlakAimRoom[], aimId: string, roll: number): FlakLand {
  const aim = rooms.find((room) => room.id === aimId);
  if (!aim) return { kind: "stay" };
  const pair = twoTile(aim);
  if (!pair) return { kind: "stay" };
  const index = sideIndex(roll);
  if (index < 0) return { kind: "stay" };
  const tile = longSideTiles(pair)[index];
  const hit = rooms.find((room) => cellOccupied(room, tile.x, tile.y));
  if (!hit || hit.id === aimId) return hit ? { kind: "stay" } : { kind: "miss" };
  return { kind: "room", roomId: hit.id };
}

function spreadRooms(g: Game, rooms: readonly FlakAimRoom[], count: number): { roomId: string; offRoom: boolean }[] {
  const ids = rooms.map((room) => room.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  const out: { roomId: string; offRoom: boolean }[] = [];
  for (let n = 0; n < count; n++) {
    const aim = ids[n % ids.length];
    const room = rooms.find((item) => item.id === aim);
    if (!room || !flakAimRolls(room)) {
      out.push({ roomId: aim, offRoom: false });
      continue;
    }
    const land = flakLanding(rooms, aim, rand(g));
    if (land.kind === "miss") out.push({ roomId: aim, offRoom: true });
    else if (land.kind === "room") out.push({ roomId: land.roomId, offRoom: false });
    else out.push({ roomId: aim, offRoom: false });
  }
  return out;
}

function nextId(g: Game): string {
  // INVENTED: share the host id counter so shot ids stay unique.
  g.uid = (g.uid + 1) >>> 0;
  return "u" + g.uid.toString(36);
}
