import type { Game, Kit, Room, Ship } from "../types.ts";
import { cellOccupied, seatKits } from "../layouts.ts";
import { kitBars, log, noteWeaponManning, rand, sparePower } from "../sim.ts";
import { ARTILLERY_SHOT_LABEL, artillerySwipeSeconds } from "../wiki/weapons-beam.ts";
import { noteAchieve, noteArtillery } from "../wiki/achieve-notes.ts";
import { feedRate } from "./augments.ts";
import { hackPulseOn } from "./spike.ts";
import { veilBlocks } from "./veil.ts";

/** Shown wherever the kit is named. Artillery Beam, "Overview". */
export const DISPLAY_NAME = "Artillery Beam";

/**
 * Artillery Beam "Overview": pre-installed, not a store item. "System Upgrades" level 1 cost is "-".
 * INFERRED: null, so installLance spends no scrap. The page gives no purchase price.
 */
export const INSTALL_COST: number | null = null;

/** Artillery Beam "System Upgrades" charge time: level 1 = 50 sec, 2 = 40, 3 = 30, 4 = 20. */
export const CHARGE_SECONDS: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 20,
};

/**
 * Artillery Beam "System Upgrades" cost: level 2 = 30, 3 = 50, 4 = 80 scrap.
 * Level 1 on that table is "-", so it has no row here.
 */
export const UPGRADE_COSTS: Record<number, number> = {
  2: 30,
  3: 50,
  4: 80,
};

/**
 * Template:Beam weapons, Artillery Beam row: power {{tooltip|1-4*|Artillery system with a maximum of 4 system levels}}.
 * Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
 */
function powerCap(kit: { level: number; damage?: number }): number {
  const level = Math.max(0, Math.min(4, kit.level));
  return Math.max(0, level - (kit.damage ?? 0));
}

function chargeSeconds(level: number): number {
  const lv = Math.min(4, Math.max(1, Math.floor(level)));
  return CHARGE_SECONDS[lv] ?? CHARGE_SECONDS[1];
}

function blankKit(): Kit {
  return {
    id: "artillery",
    weapon: "ARTILLERY_FED",
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/** Artillery Beam, "Overview": the system is pre-installed only on the Federation Cruiser's Type A and Type B. */
const LANCE_HULLS: ReadonlySet<string> = new Set(["PLAYER_SHIP_FED", "PLAYER_SHIP_FED_2"]);

/**
 * Mount the cutter on a hull that carries it. Template:Purchasable systems prints no price for the Artillery Beam, and
 * "Overview" names only Federation A and B, so no other hull can fit one (hulls.ts already fits theirs).
 * Artillery Beam "System Upgrades": a fresh kit is level 1, whose cost is "-".
 */
export function installLance(g: Game): boolean {
  if (g.player.kits.artillery) return false;
  if (!LANCE_HULLS.has(g.hullId ?? "")) return false;
  if (INSTALL_COST != null) {
    if (g.scrap < INSTALL_COST) return false;
    g.scrap -= INSTALL_COST;
  }
  g.player.kits.artillery = blankKit();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  return true;
}

/** Artillery Beam, "System Upgrades": scrap to reach the next level. Level 1's cost is a dash. */
export function lanceUpgradeCost(level: number): number | null {
  return UPGRADE_COSTS[level + 1] ?? null;
}

/** Artillery Beam, "System Upgrades": 30, then 50, then 80, through level 4. */
export function upgradeLance(g: Game): boolean {
  const kit = g.player.kits.artillery;
  if (!kit || kit.weapon === "ARTILLERY_FED_C" || kit.level >= 4) return false;
  const cost = lanceUpgradeCost(kit.level);
  if (cost == null || g.scrap < cost) return false;
  g.scrap -= cost;
  kit.level += 1;
  noteAchieve(g, { k: "upgrade" });
  log(g, "Artillery Beam raised.");
  return true;
}

/**
 * One reactor bar at a time, up to powerCap. Unpowered charge does not advance.
 * Artillery Beam "Overview": no console, so it cannot be manned to shorten the charge.
 * "Overview": powering off drains the charge. The page says "quickly" and gives no seconds, so a full bar empties in 2s. INFERRED.
 */
export function raiseLancePower(g: Game): void {
  const kit = g.player.kits.artillery;
  if (
    !kit ||
    kit.weapon === "ARTILLERY_FED_C" ||
    kit.power >= powerCap(kit) ||
    sparePower(g.player) < 1
  )
    return;
  kit.power += 1;
  kit.on = true;
}

export function lowerLancePower(g: Game): void {
  const kit = g.player.kits.artillery;
  if (!kit || kit.weapon === "ARTILLERY_FED_C" || kit.power <= 0) return;
  kit.power -= 1;
  kit.on = kit.power > 0;
}

export function toggleLancePower(g: Game): void {
  const kit = g.player.kits.artillery;
  if (!kit || kit.weapon === "ARTILLERY_FED_C") return;
  if (kit.power < powerCap(kit) && sparePower(g.player) >= 1) {
    raiseLancePower(g);
    return;
  }
  lowerLancePower(g);
}

/**
 * Artillery Beam, "Overview": the beam swipe "cannot be controlled", so a chosen room is ignored. Kept so a caller has
 * nothing to store. xftl doc/artillery: each shot picks its own random room.
 */
export function aimLance(_g: Game, _roomId: string): void {}

/** Geometry for cutLine's INFERRED line: a room's centre in tile units. */
function centre(room: Room): [number, number] {
  return [room.x + room.w / 2, room.y + room.h / 2];
}

/** Liang-Barsky: does the segment p0-p1 pass through the room's rectangle (not just touch an edge)? */
function crosses(room: Room, p0: [number, number], p1: [number, number]): boolean {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, p0[0] - room.x],
    [dx, room.x + room.w - p0[0]],
    [-dy, p0[1] - room.y],
    [dy, room.y + room.h - p0[1]],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 >= t1) return false;
  }
  return true;
}

/**
 * xftl doc/artillery (ArtillerySystem::OnLoop): "For beam weapons, it randomly selects one room and then picks a
 * second room that is as far away from the first room as possible."
 * INFERRED: distance is between room centres, and the beam cuts every room the line between those centres passes
 * through, in order from the first room.
 * INFERRED: a tie for farthest goes to the first such room in ship.rooms order.
 */
export function cutLine(ship: Ship, origin: string): Room[] {
  const first = ship.rooms.find((r) => r.id === origin);
  if (!first) return [];
  const from = centre(first);
  let far = first;
  let best = -1;
  for (const room of ship.rooms) {
    const [x, y] = centre(room);
    const d = (x - from[0]) ** 2 + (y - from[1]) ** 2;
    if (d > best) {
      best = d;
      far = room;
    }
  }
  const to = centre(far);
  const along = (r: Room) => {
    const [x, y] = centre(r);
    return (x - from[0]) ** 2 + (y - from[1]) ** 2;
  };
  return ship.rooms
    .filter((r) => r === first || r === far || crosses(r, from, to))
    .sort((a, z) => along(a) - along(z));
}

/**
 * Artillery Beam "Overview": 1 hull damage and 1 system damage per room, and a 10% fire chance
 * in each tile the beam passes. Fires, "Fires and enemy AI": the stack stops at 4.
 * INFERRED: the uncontrolled swipe passes every occupied tile of each cut room. The page does not print that path.
 */
function nick(g: Game, ship: Ship, room: Room): void {
  ship.hull -= 1;
  if (ship.hull < 0) ship.hull = 0;
  if (room.system) {
    const sys = ship.systems[room.system];
    if (sys.damage < sys.level) sys.damage += 1;
  }
  let tiles = 0;
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) tiles += 1;
    }
  }
  for (let i = 0; i < tiles; i++) {
    if (rand(g) < 0.1) room.fire = Math.min(4, room.fire + 1);
  }
}

/**
 * Charges on the power-level clock. Zero bars drain.
 * Beam (Weapons), Artillery Beam: "More power means faster cooldown."
 * "Charge time (depends on the system power level): 50s for level 1, reduced by 10 seconds
 * for each level above 1 to a minimum of 20s for level 4."
 * Working bars are kitBars: reactor power plus a Zoltan bar already stamped on the kit.
 * The Zoltan bar counts as a power level and does not change kit.power.
 * On completion the beam starts its swipe. Template:Beam weapons gives Artillery Beam speed 13 and length 500.
 * Hull and system damage land when that swipe finishes, and shield layers are neither popped nor subtracted.
 * Artillery Beam "Overview": the beam pierces regular shields.
 * Artillery Beam "Overview": a full charge fires on its own. The swipe still cannot be aimed; a room is chosen when the bar fills.
 * "Overview": powering off drains charge. INFERRED: a full bar empties in 2 seconds.
 * Artillery Beam, Overview: "Deals 1 damage to Zoltan Shield per each of the 2 ticks."
 * Zoltan Shield: Artillery Beam deals 2 damage in total, and that damage does not grow with rooms hit.
 * A bubble that survives both ticks still protects the hull. Beam (Weapons) puts the ticks at 33% and 80%.
 * INFERRED: this swipe has no drawn path, so a bubble that breaks still lets the cut rooms land.
 * @agent:hacking. Under an enemy Hacking pulse on this kit the charge runs backwards at its own charge speed.
 * Artillery Beam "Overview": "Hacking disruption reduces the charge progress only by 4-7-10 seconds." Hacking wiki,
 * "Overview" (Active effects): "Artillery Beam / Flak Artillery / Rebel Flagship weapons: drains charge (same effect as
 * on weapons)", and on weapons "Draining speed is the same as speed as the base-level charging speed".
 */
function clearArtilleryShot(g: Game): void {
  g.shots = g.shots.filter((shot) => shot.label !== ARTILLERY_SHOT_LABEL);
}

/** Artillery Beam, Overview: 1 damage on each of the 2 Zoltan Shield ticks, 2 in total. */
function landCut(g: Game, ship: Ship, ids: string[]): void {
  const rooms = ids
    .map((id) => ship.rooms.find((room) => room.id === id))
    .filter((room): room is Room => !!room);
  clearArtilleryShot(g);
  if (rooms.length === 0) return;
  // Zoltan Shield protects the hull until it is depleted. Room hits do not add more bubble damage.
  const bubble = ship.zoltan ?? 0;
  if (bubble > 0) ship.zoltan = Math.max(0, bubble - 2);
  const held = bubble > 2;
  if (!held) {
    const shieldNow = ship.shieldNow;
    for (const room of rooms) nick(g, ship, room);
    ship.shieldNow = shieldNow;
    log(g, `${DISPLAY_NAME} cuts ${ship.name}.`);
  }
}

/** Time still crossing. Returns whatever part of `dt` is left after the swipe. */
function advanceSwipe(g: Game, dt: number): number {
  const kit = g.player.kits.artillery;
  const enemy = g.enemy;
  if (!kit || !(kit.left > 0) || !kit.path?.length || !enemy) return dt;
  const step = Math.min(dt, kit.left);
  kit.left -= step;
  if (kit.left > 0) return 0;
  const ids = kit.path;
  kit.left = 0;
  kit.path = undefined;
  landCut(g, enemy, ids);
  return dt - step;
}

function beginSwipe(g: Game, enemy: Ship): void {
  const kit = g.player.kits.artillery;
  if (!kit) return;
  // xftl doc/artillery: "it randomly selects one room" each shot (the wiki's uncontrolled swipe).
  const first = enemy.rooms[Math.floor(rand(g) * enemy.rooms.length)];
  if (!first) return;
  const rooms = cutLine(enemy, first.id);
  if (rooms.length === 0) return;
  kit.target = null;
  kit.aux = 0;
  kit.path = rooms.map((room) => room.id);
  kit.left = artillerySwipeSeconds();
  const from = centre(rooms[0]);
  const to = centre(rooms[rooms.length - 1]);
  g.uid = (g.uid + 1) >>> 0;
  clearArtilleryShot(g);
  g.shots.push({
    id: "u" + g.uid.toString(36),
    kind: "beam",
    from: "player",
    damage: 0,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: rooms[0].id,
    beamRooms: rooms.map((room) => room.id),
    beamLine: { a: { x: from[0], y: from[1] }, b: { x: to[0], y: to[1] } },
    defId: "artillery-beam",
    wait: 0,
    t: 0,
    duration: kit.left,
    label: ARTILLERY_SHOT_LABEL,
  });
  noteArtillery(g);
  // Crew skills, Weapons: one point when an artillery system fires. The swipe is one fire.
  noteWeaponManning(g);
}

export function tickLance(g: Game, dt: number): void {
  const kit = g.player.kits.artillery;
  // Flak Artillery shares the kit id. An omitted weapon stays the beam so older fixtures still fire.
  if (!kit || kit.weapon === "ARTILLERY_FED_C" || !(dt > 0)) return;
  let left = dt;
  if (kit.left > 0 && kit.path?.length) {
    if (g.paused || !!g.menuHold) return;
    if (g.phase !== "combat" || !g.enemy) {
      kit.left = 0;
      kit.path = undefined;
      clearArtilleryShot(g);
      return;
    }
    advanceSwipe(g, left);
    return;
  }

  const fed = kitBars(kit);
  if (fed < 1) {
    kit.aux = Math.max(0, kit.aux - left / 2);
    return;
  }
  if (g.paused || !!g.menuHold || g.phase !== "combat" || !g.enemy) return;

  // Beam (Weapons), Artillery Beam: the clock is the filled power level, not the installed level.
  const seconds = chargeSeconds(fed);
  if (hackPulseOn(g, g.player, "artillery")) {
    kit.aux = Math.max(0, kit.aux - left / seconds);
    return;
  }
  // Cloaking, Overview: "Weapons and artillery systems stop charging and cannot target a cloaked ship."
  // A beam whose charge time is <= 20 seconds still fires. The example is Artillery Beam at system level 4.
  if (veilBlocks(g, "player") && seconds > 20) return;
  // Artillery Beam, Overview: "Automated Re-loaders augmentations work." The system "cannot be manned
  // to reduce the charge time", so crew skill stays out. Augmentations, Automated Re-loader: one copy
  // divides cooldown by 1.1, and three raise firing rate by 30%. The unpowered drain stays dt/2.
  const rate = feedRate(g, "player");
  const need = kit.aux >= 1 ? 0 : ((1 - kit.aux) * seconds) / rate;
  if (left < need) {
    kit.aux += (left * rate) / seconds;
    return;
  }
  left -= need;
  kit.aux = 1;
  beginSwipe(g, g.enemy);
  if (kit.left > 0) advanceSwipe(g, left);
}
