import { log, sparePower } from "../sim.ts";
import { helixHolds } from "./moreaugs.ts";
import type { Crew, Game, Kit, SkillName } from "../types.ts";

/** Wiki page "Clone Bay", section "System Upgrades": level 1 purchasing cost 50. */
export const INSTALL_COST: number | null = 50;

/** Wiki page "Clone Bay", section "System Upgrades": cloning takes 12 / 9 / 7 seconds. */
const CLONE_SECONDS: Record<number, number> = { 1: 12, 2: 9, 3: 7 };

/**
 * Wiki page "Clone Bay", "System Upgrades": 8 / 16 / 25 HP flat per jump, not a percent of max health.
 * "Overview": the jump heal is passive and does not need power.
 */
const JUMP_HEAL: Record<number, number> = { 1: 8, 2: 16, 3: 25 };

/**
 * Wiki page "Clone Bay", "Overview": skills other than combat lose 20%.
 * Combat loses 1 point, not 20%.
 */
const SKILL_KEEP = 0.8;

function blankCradle(level: number): Kit {
  return {
    id: "cradle",
    level,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function poweredCradle(g: Game): Kit | null {
  const kit = g.player.kits.cradle;
  if (!kit || kit.power < 1 || kit.level <= 0) return null;
  return kit;
}

/** Wiki page "Clone Bay", section "System Upgrades": install at the level-1 purchase cost of 50. */
export function installCradle(g: Game) {
  const cost = INSTALL_COST;
  if (cost == null) {
    log(g, "Clone Bay price is not listed.");
    return;
  }
  if (g.player.kits.cradle) return;
  if (g.scrap < cost) {
    log(g, "Not enough scrap.");
    return;
  }
  g.scrap -= cost;
  g.player.kits.cradle = blankCradle(1);
  log(g, "Clone Bay installed.");
}

/**
 * INFERRED: one reactor bar. Wiki page "Clone Bay" lists no power-per-level number.
 * "Overview": jump heal needs no power; this bar only gates cloning.
 */
export function toggleCradlePower(g: Game) {
  const kit = g.player.kits.cradle;
  if (!kit || kit.level <= 0) return;
  if (kit.power >= 1) {
    kit.power = 0;
    kit.on = false;
    return;
  }
  if (sparePower(g.player) < 1) return;
  kit.power = 1;
  kit.on = true;
}

/**
 * Wiki page "Clone Bay", section "System Upgrades": start a 12/9/7 second clone.
 * INFERRED: the timer starts at death. "Overview" also has a death-animation delay (about 1.5–2s) that is not added.
 */
export function onCradleDeath(g: Game, crew: Crew): boolean {
  if (crew.side !== "player") return false;
  const kit = poweredCradle(g);
  if (!kit) return false;
  if ((crew.cloneIn ?? 0) > 0) return true;
  const seconds = CLONE_SECONDS[kit.level];
  if (seconds == null) return false;
  crew.hp = 0;
  crew.cloneIn = seconds;
  crew.room = "p-medbay";
  crew.aboard = "player";
  crew.path = [];
  return true;
}

function restoreSkills(crew: Crew) {
  if (!crew.skills) return;
  for (const key of Object.keys(crew.skills) as SkillName[]) {
    const xp = crew.skills[key];
    if (xp == null) continue;
    if (key === "combat") crew.skills[key] = Math.max(0, xp - 1);
    else crew.skills[key] = xp * SKILL_KEEP;
  }
}

/**
 * Wiki page "Clone Bay", "System Upgrades": the 12/9/7 countdown runs while a bar is assigned.
 * INFERRED: the body returns at maxHp. The page does not state revive HP.
 * "Overview": offline for 3 seconds permanently loses the clone. kit.aux counts those seconds.
 */
export function tickCradle(g: Game, dt: number) {
  const kit = g.player.kits.cradle;
  if (!kit) return;
  const pending = g.crew.some((c) => c.side === "player" && (c.cloneIn ?? 0) > 0);
  if (!poweredCradle(g)) {
    // Augmentations, "Crew Augmentations", Backup DNA Bank: an offline bay does not erase the copy.
    if (helixHolds(g)) return;
    if (!pending) {
      kit.aux = 0;
      return;
    }
    kit.aux += dt;
    if (kit.aux < 3) return;
    for (const crew of g.crew) {
      if (crew.side !== "player" || (crew.cloneIn ?? 0) <= 0) continue;
      crew.cloneIn = undefined;
    }
    kit.aux = 0;
    log(g, "Clone Bay was dark. The copy is gone.");
    return;
  }
  kit.aux = 0;
  for (const crew of g.crew) {
    if (crew.side !== "player") continue;
    if (crew.cloneIn == null || crew.cloneIn <= 0) continue;
    crew.cloneIn -= dt;
    if (crew.cloneIn > 0) continue;
    crew.hp = crew.maxHp;
    crew.cloneIn = undefined;
    restoreSkills(crew);
    log(g, `Clone Bay returned ${crew.name}.`);
  }
}

/**
 * Wiki page "Clone Bay", "System Upgrades": 8/16/25 HP flat per jump.
 * "Overview": jump heal needs no power, and this does not check the bar.
 */
export function onCradleJump(g: Game) {
  const kit = g.player.kits.cradle;
  if (!kit || kit.level <= 0) return;
  const heal = JUMP_HEAL[kit.level];
  if (heal == null) return;
  for (const crew of g.crew) {
    if (crew.side !== "player" || crew.hp <= 0) continue;
    if ((crew.cloneIn ?? 0) > 0) continue;
    crew.hp = Math.min(crew.maxHp, crew.hp + heal);
  }
}
