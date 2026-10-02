import type { Crew, Game, Kit } from "../types";
import { log, roomById, sparePower } from "../sim.ts";
import { mendOnSend } from "./moreaugs.ts";

/** Crew Teleporter wiki, "System Upgrades": level 1 cost is 90. */
const INSTALL_COST = 90;

/** Crew Teleporter wiki, "System Upgrades": level 3 is 10 sec, level 2 is 15 sec, level 1 is 20 sec. */
function cooldown(level: number): number {
  if (level >= 3) return 10;
  if (level === 2) return 15;
  return 20;
}

/** Crew Teleporter wiki, "System Upgrades": the level 2 row costs 30, the level 3 row costs 60. */
function upgradeCost(level: number): number | null {
  if (level === 1) return 30;
  if (level === 2) return 60;
  return null;
}

function sling(g: Game): Kit | undefined {
  return g.player.kits.sling;
}

function blank(): Kit {
  return {
    id: "sling",
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/**
 * Crew Teleporter wiki, "Overview": a use needs the system powered, then it waits out its cooldown.
 * INFERRED: power must already equal the system level. The page never states a reactor-bar count.
 */
function canRun(kit: Kit): boolean {
  return kit.power >= kit.level && kit.level > 0 && kit.cool <= 0;
}

function arm(kit: Kit, target: string | null) {
  kit.aux = 0;
  kit.target = target;
  kit.on = false;
  kit.left = 0;
  kit.cool = cooldown(kit.level);
}

function livingOnLark(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
}

/**
 * Crew Teleporter wiki, "Overview": send as many crew as there are pads.
 * INFERRED: the cap is 2, from "Ships can have only 2-tile Teleporter rooms."
 * That sentence also names four-person rooms (Mantis B, Mantis C, Crystal B); this pick never uses 4.
 * Selected crew go first (even the lone pilot). Otherwise medbay, then any room.
 * The only person in piloting stays put when someone else can go. The page states neither of those orders.
 */
function pickCrew(g: Game): Crew[] {
  const living = livingOnLark(g);
  if (living.length === 0) return [];

  const pilots = living.filter((c) => c.room === "p-pilot");
  const lonePilot = pilots.length === 1 && living.length > 1 ? pilots[0] : null;
  const selected = g.selected ? (living.find((c) => c.id === g.selected) ?? null) : null;

  const picked: Crew[] = [];
  if (selected) picked.push(selected);

  const medbay = living.filter((c) => c.room === "p-medbay");
  const rest = living.filter((c) => c.room !== "p-medbay");
  for (const c of [...medbay, ...rest]) {
    if (picked.length >= 2) break;
    if (picked.includes(c)) continue;
    if (lonePilot && c === lonePilot && c !== selected) continue;
    picked.push(c);
  }
  return picked;
}

/** Crew Teleporter wiki, "System Upgrades": spends the level 1 cost of 90. */
export function installSling(g: Game) {
  if (g.player.kits.sling) return;
  if (g.scrap < INSTALL_COST) return;
  g.scrap -= INSTALL_COST;
  g.player.kits.sling = blank();
  log(g, "Teleporter fitted to the Lark.");
}

/** Crew Teleporter wiki, "System Upgrades": pays the next row, 30 then 60. */
export function upgradeSling(g: Game) {
  const kit = sling(g);
  if (!kit) return;
  const cost = upgradeCost(kit.level);
  if (cost == null || g.scrap < cost) return;
  g.scrap -= cost;
  kit.level += 1;
  log(g, `Sling raised to level ${kit.level}.`);
}

/**
 * Crew Teleporter wiki, "Overview".
 * INFERRED: one bar is added or removed at a time, and power stops at the system level.
 * The page never states a reactor-bar count.
 */
export function toggleSlingPower(g: Game) {
  const kit = sling(g);
  if (!kit) return;
  if (kit.power < kit.level && sparePower(g.player) > 0) {
    kit.power += 1;
    return;
  }
  if (kit.power > 0) kit.power -= 1;
}

/**
 * Crew Teleporter wiki, "Overview": send crew onto the enemy ship, then the system cools down.
 * INFERRED: the pad count is 2 ("only 2-tile Teleporter rooms"). Cooldown seconds are under "System Upgrades".
 */
export function sendSling(g: Game, roomId: string) {
  const kit = sling(g);
  if (!kit) return;
  if (kit.power < kit.level) {
    log(g, "Teleporter has no power.");
    return;
  }
  if (kit.cool > 0) {
    log(g, "Teleporter is still cooling.");
    return;
  }
  if (g.phase !== "combat" || !g.enemy || !roomById(g.enemy, roomId)) {
    log(g, "No hull to teleport onto.");
    return;
  }
  const crew = pickCrew(g);
  if (crew.length < 1) {
    log(g, "No one to teleport.");
    return;
  }
  for (const c of crew) {
    c.aboard = "enemy";
    c.room = roomId;
    c.path = [];
    c.move = 0;
    // Augmentations, "Crew Augmentations", Reconstructive Teleport: a send heals to full.
    if (mendOnSend(g)) c.hp = c.maxHp;
  }
  arm(kit, roomId);
  log(g, `Teleporter sends ${crew.map((c) => c.name).join(" and ")}.`);
}

/**
 * Crew Teleporter wiki, "Overview": bring crew back, then cool down ("System Upgrades" for the seconds).
 * The heading says "Can retrieve up to 4 crew"; this pull has no cap of 4.
 * They are always set down in the medbay. The page says overflow crew go to adjacent rooms and does not name the medbay.
 */
export function recallSling(g: Game) {
  const kit = sling(g);
  if (!kit) return;
  if (!canRun(kit)) {
    if (kit.power < kit.level) log(g, "Teleporter has no power.");
    else if (kit.cool > 0) log(g, "Teleporter is still cooling.");
    return;
  }
  const away = g.crew.filter((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
  if (away.length < 1) {
    log(g, "No one to pull back.");
    return;
  }
  for (const c of away) {
    c.aboard = "player";
    c.room = "p-medbay";
    c.path = [];
    c.move = 0;
    if (mendOnSend(g)) c.hp = c.maxHp;
  }
  arm(kit, null);
  log(g, "Teleporter pulls them back.");
}

/**
 * Crew Teleporter wiki, "Overview": the system ionizes itself between uses.
 * "System Upgrades" sets that wait at 20, 15, or 10 seconds. This only counts the timer down.
 * The same heading says the cooldown resets instantly when the ship is not in danger; this tick does not do that.
 */
export function tickSling(g: Game, dt: number) {
  const kit = sling(g);
  if (!kit || kit.cool <= 0) return;
  kit.cool -= dt;
  if (kit.cool < 0) kit.cool = 0;
}

/**
 * Crew Teleporter wiki, "Overview": crew left on the enemy ship when either ship jumps are permanently lost.
 * INFERRED: that loss is stored as 0 hp. The page does not state a hit-point value.
 */
export function onJumpSling(g: Game) {
  for (const c of g.crew) {
    if (c.side !== "player" || c.aboard !== "enemy" || c.hp <= 0) continue;
    c.hp = 0;
    log(g, `${c.name} is lost on the other hull.`);
  }
}
