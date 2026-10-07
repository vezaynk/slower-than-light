import { kitBars, log, playerMedicalOff, sparePower } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { helixHolds } from "./moreaugs.ts";
import { hackPulseOn } from "./spike.ts";
import type { Crew, Game, Kit, SkillName } from "../types.ts";

/** Wiki page "Clone Bay", section "System Upgrades": level 1 purchasing cost 50. */
export const INSTALL_COST: number | null = 50;

/** Wiki page "Clone Bay", section "System Upgrades": cloning takes 12 / 9 / 7 seconds. */
const CLONE_SECONDS: Record<number, number> = { 1: 12, 2: 9, 3: 7 };

/**
 * Clone Bay, Overview: cloning starts when the dying animation ends.
 * 2 seconds for Rock, Crystal, and Engi; 1.8 for Humans, Slugs, and Lanius;
 * 1.7 for Mantis; 1.5 for Zoltans.
 * INFERRED: a body with no kin is a Human, the baseline row.
 */
const DEATH_ANIM: Record<string, number> = {
  stone: 2,
  shard: 2,
  shell: 2,
  plain: 1.8,
  gel: 1.8,
  voidlung: 1.8,
  blade: 1.7,
  spark: 1.5,
};

export function deathAnimSeconds(kin: string | undefined): number {
  return DEATH_ANIM[kin ?? "plain"] ?? 1.8;
}

/**
 * Wiki page "Clone Bay", "System Upgrades": 8 / 16 / 25 HP flat per jump, not a percent of max health.
 * "Overview": the jump heal is passive and does not need power.
 */
const JUMP_HEAL: Record<number, number> = { 1: 8, 2: 16, 3: 25 };

/**
 * Wiki page "Clone Bay", "Overview": skills other than combat lose 20%.
 * Crew skills, Skills table: "Cloned crew loses 20% of skill points in every skill
 * (but loses only 1 skill point in Combat skill)."
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
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  if (!kit || kitBars(kit) < 1 || kit.level <= 0) return null;
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
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
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
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  if (kit.level - (kit.damage ?? 0) < 1) return;
  kit.power = 1;
  kit.on = true;
}

/**
 * Player cloning queue, head first. Wiki page "Clone Bay", "Overview": "whatever crew dies earlier is the first one to
 * be in the beginning of the cloning queue. The crew order in the cloning queue cannot be altered."
 */
function playerQueued(g: Game): Crew[] {
  return g.crew
    .filter((c) => c.side === "player" && (c.cloneIn ?? 0) > 0)
    .sort((a, b) => (a.cloneSeq ?? 0) - (b.cloneSeq ?? 0));
}

/**
 * Wiki page "Clone Bay", section "System Upgrades": start a 12/9/7 second clone.
 * "Overview": "Multiple dead crewmembers can be queued for revival, one-by-one". cloneSeq is the queue slot, allocated
 * like the enemy path (one past the current tail).
 * INFERRED: a waiting clone's timer is preset to the full level time plus that body's death animation, and only
 * counts once it reaches the head (tickCradle). The page does not say when a waiting clone's timer is set; an
 * upgrade mid-queue keeps the old time.
 * Overview: the system timer starts when the dying animation ends, so both are on cloneIn.
 */
export function onCradleDeath(g: Game, crew: Crew): boolean {
  if (crew.side === "enemy") return onEnemyCradleDeath(g, crew);
  if (crew.side !== "player") return false;
  // Slug hacker (medical): "Clone Bay offline". A death during that fight does not enter the queue.
  if (playerMedicalOff(g)) return false;
  const kit = poweredCradle(g);
  if (!kit) return false;
  if ((crew.cloneIn ?? 0) > 0) return true;
  const seconds = CLONE_SECONDS[kit.level];
  if (seconds == null) return false;
  const seq = playerQueued(g).reduce((top, c) => Math.max(top, c.cloneSeq ?? 0), 0) + 1;
  crew.hp = 0;
  crew.cloneIn = seconds + deathAnimSeconds(crew.kin);
  crew.cloneSeq = seq;
  // Kit room (layouts.ts seatKits): the clone appears in the Clone Bay room, which is the old medical room when the
  // store swapped it in. Hulls without a medical room (Fed C, Slug C, Lanius B, ...) have no "p-medbay".
  crew.room = g.player.rooms.find((r) => r.kit === "cradle")?.id ?? "p-medbay";
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
 * "Overview": revival is "one-by-one", so only the head of the queue (lowest cloneSeq) counts down.
 * INFERRED: the body returns at maxHp. The page does not state revive HP.
 * "Overview": "The Clone Bay is offline for 3 seconds" loses a clone, and "The crew clone, who entered the Clone Bay
 * last ... will be lost first." kit.aux counts those seconds. "The crew clone loss progression is preserved between
 * jumps": nothing on the jump path resets kit.aux.
 * INFERRED: one clone per 3 offline seconds, then the count restarts for the next. The page does not give the cadence.
 * INFERRED: offline means no working bar (unpowered, or every level damaged), as cradleOffline for the enemy.
 */
export function tickCradle(g: Game, dt: number) {
  tickEnemyCradle(g, dt);
  const kit = g.player.kits.cradle;
  if (!kit) return;
  // Slug hacker (medical): "Clone Bay offline".
  // INFERRED: the queue pauses. The 3-second copy loss is the unpowered bay on the Clone Bay page, not this fight.
  if (playerMedicalOff(g)) return;
  const queued = playerQueued(g);
  // @agent:hacking. Hacking wiki, "Overview" (Active effects): "Clone Bay: disables the clone bay. (Backup DNA Bank
  // augmentation protects your crew from being erased)". INFERRED: disabled = offline for the pulse, so the queue stops
  // and the 3-second loss below runs, which is exactly what the Backup DNA Bank note guards against.
  if (!poweredCradle(g) || cradleOffline(kit) || hackPulseOn(g, g.player, "cradle")) {
    // Augmentations, "Crew Augmentations", Backup DNA Bank: an offline bay does not erase the copy.
    if (helixHolds(g)) return;
    if (!queued.length) {
      kit.aux = 0;
      return;
    }
    kit.aux += dt;
    if (kit.aux < 3) return;
    kit.aux = 0;
    dropClone(queued[queued.length - 1]);
    log(g, "Clone Bay was dark. A copy is gone.");
    return;
  }
  kit.aux = 0;
  const head = queued[0];
  if (!head) return;
  head.cloneIn = (head.cloneIn ?? 0) - dt;
  if (head.cloneIn > 0) return;
  head.hp = head.maxHp;
  dropClone(head);
  restoreSkills(head);
  // Crew skills, Combat: a body the bay returned is cloned crew. Killing it grants no combat experience.
  head.cloned = true;
  log(g, `Clone Bay returned ${head.name}.`);
}

/**
 * Wiki page "Clone Bay", "System Upgrades": 8/16/25 HP flat per jump.
 * "Overview": "Clone Bay does not need to be powered to activate the jump heal, but won't heal crew if it is fully
 * ionized or destroyed." Destroyed = every level damaged (cradleDestroyed). Kits carry no ion in this tree, so the
 * "fully ionized" half has nothing to check yet.
 * "Overview": "Waiting at a beacon applies the jump heal effect": sim.ts waitHere calls this too.
 */
export function onCradleJump(g: Game) {
  const kit = g.player.kits.cradle;
  if (!kit || kit.level <= 0) return;
  // Slug hacker (medical): "Clone Bay offline". INFERRED: the passive jump heal waits too.
  if (playerMedicalOff(g)) return;
  if (cradleDestroyed(kit)) return;
  const heal = JUMP_HEAL[kit.level];
  if (heal == null) return;
  for (const crew of g.crew) {
    if (crew.side !== "player" || crew.hp <= 0) continue;
    if ((crew.cloneIn ?? 0) > 0) continue;
    crew.hp = Math.min(crew.maxHp, crew.hp + heal);
  }
}

// ---------------------------------------------------------------------------
// Enemy Clone Bay. Wiki page "Clone Bay", section "Overview", unless noted.
// ---------------------------------------------------------------------------

/** The enemy's Clone Bay kit, if its hull has one (enemy-gen.ts maps "clonebay" to kit "cradle"). */
function enemyCradle(g: Game): Kit | null {
  const kit = g.enemy?.kits.cradle;
  if (!kit || kit.level <= 0) return null;
  return kit;
}

/**
 * "Destroyed" means every level is damaged, not merely depowered.
 * Overview: "won't heal crew if it is fully ionized or destroyed" names ion and destruction as separate states,
 * so ion never counts as destroyed. Kits carry no ion in this tree anyway.
 */
function cradleDestroyed(kit: Kit): boolean {
  return (kit.damage ?? 0) >= kit.level;
}

/** Overview: "The Clone Bay is offline" — INFERRED: offline means no working bar (destroyed, or power knocked out). */
function cradleOffline(kit: Kit): boolean {
  return kitBars(kit) < 1;
}

function enemyQueued(g: Game): Crew[] {
  return g.crew
    .filter((c) => c.side === "enemy" && c.hp <= 0 && (c.cloneIn ?? 0) > 0)
    .sort((a, b) => (a.cloneSeq ?? 0) - (b.cloneSeq ?? 0));
}

function enemyLive(g: Game): boolean {
  return g.crew.some((c) => c.side === "enemy" && c.hp > 0);
}

function dropClone(crew: Crew) {
  crew.cloneIn = undefined;
  crew.cloneSeq = undefined;
}

/**
 * Overview: "the enemy cloning queue is purged instantly when there are no live crew left and the Clone Bay is
 * destroyed, contrary to a 3-second crew loss process applied to player's crew".
 * Returns true when it purged, so endCheck can award the crew-kill win this tick.
 */
function purgeEnemyClones(g: Game): boolean {
  const kit = enemyCradle(g);
  if (!kit || !cradleDestroyed(kit) || enemyLive(g)) return false;
  const queued = enemyQueued(g);
  if (!queued.length) return false;
  for (const crew of queued) dropClone(crew);
  log(g, "Their Clone Bay is wrecked. The clones are gone.");
  return true;
}

/** Clone Bay room on the enemy hull: the room housing kit "cradle" (enemy-gen.ts names it `e-clonebay`). */
function enemyCradleRoom(g: Game): string | null {
  return g.enemy?.rooms.find((r) => r.kit === "cradle")?.id ?? null;
}

/**
 * Overview: "Multiple dead crewmembers can be queued for revival, one-by-one: whatever crew dies earlier is the first
 * one to be in the beginning of the cloning queue." System Upgrades: cloning takes 12 / 9 / 7 seconds.
 * INFERRED: an enemy boarder who dies aboard the player ship is cloned too. The page only excludes crew "left on the
 * enemy ship" when a ship jumps away, which is about jumping, not about dying aboard.
 * Overview: "The fight will be over despite the enemy having an operational System Repair Drone being able to
 * potentially repair the Clone Bay in time." A death while the bay is already destroyed does not enter the queue.
 * "If the Clone Bay is destroyed while at least one enemy crew is alive, the crew dying animation must complete
 * for the fight to be over." That wait is kit.left, and only when this death leaves no living enemy crew.
 * Overview: the same death animation runs before an enemy clone's 12/9/7 seconds.
 */
function onEnemyCradleDeath(g: Game, crew: Crew): boolean {
  const kit = enemyCradle(g);
  if (!kit) return false;
  if ((crew.cloneIn ?? 0) > 0) return true;
  // A repaired bay does not reopen a death that already missed the queue. kit.left is that animation.
  if (cradleDestroyed(kit) || (!enemyLive(g) && kit.left > 0)) {
    crew.hp = 0;
    if (!enemyLive(g)) {
      if (cradleDestroyed(kit)) kit.left = Math.max(kit.left, deathAnimSeconds(crew.kin));
      purgeEnemyClones(g);
    }
    return false;
  }
  const seconds = CLONE_SECONDS[kit.level];
  const room = enemyCradleRoom(g);
  if (seconds == null || !room) return false;
  const seq = enemyQueued(g).reduce((top, c) => Math.max(top, c.cloneSeq ?? 0), 0) + 1;
  crew.hp = 0;
  crew.cloneIn = seconds + deathAnimSeconds(crew.kin);
  crew.cloneSeq = seq;
  crew.room = room;
  crew.aboard = "enemy";
  crew.path = [];
  // "If the Clone Bay is destroyed while all enemy crew are dead or are in the cloning queue, the fight ends immediately."
  if (purgeEnemyClones(g)) return false;
  return true;
}

/**
 * Enemy queue, one body at a time (Overview: "queued for revival, one-by-one"). The head counts down only while the
 * bay has a working bar.
 * Overview: offline for 3 seconds loses a clone, and "The crew clone, who entered the Clone Bay last ... will be lost
 * first." Backup DNA Bank is "available for player only", so enemies get no exemption.
 * INFERRED: each further clone needs another 3 offline seconds. The page does not give the cadence.
 * INFERRED: revive HP is full and the body appears in the Clone Bay room, as for the player.
 * Overview: revived crew take the 20% skill penalty (1 point of combat), via restoreSkills.
 */
function tickEnemyCradle(g: Game, dt: number) {
  const kit = enemyCradle(g);
  if (!kit) return;
  // Overview: the dying animation must finish before a wrecked bay ends the fight. No revival during that wait.
  if (!enemyLive(g) && kit.left > 0) {
    purgeEnemyClones(g);
    kit.left = Math.max(0, kit.left - dt);
    return;
  }
  if (purgeEnemyClones(g)) return;
  const queued = enemyQueued(g);
  if (!queued.length) {
    kit.aux = 0;
    return;
  }
  // @agent:hacking. Hacking wiki, "Overview" (Active effects): "Clone Bay: disables the clone bay." The row names no
  // side, so the player's pulse on their Clone Bay does the same (spike.ts allows that target when they have one).
  if (cradleOffline(kit) || (!!g.enemy && hackPulseOn(g, g.enemy, "cradle"))) {
    kit.aux += dt;
    if (kit.aux < 3) return;
    kit.aux = 0;
    dropClone(queued[queued.length - 1]);
    log(g, "Their Clone Bay went dark. A clone is lost.");
    return;
  }
  kit.aux = 0;
  const head = queued[0];
  head.cloneIn = (head.cloneIn ?? 0) - dt;
  if (head.cloneIn > 0) return;
  head.hp = head.maxHp;
  dropClone(head);
  head.room = enemyCradleRoom(g) ?? head.room;
  head.aboard = "enemy";
  head.path = [];
  restoreSkills(head);
  head.cloned = true;
  log(g, `Their Clone Bay returned ${head.name}.`);
}

/** Head of the enemy cloning queue for the target panel: seconds left on the head clone and queue length. */
export function enemyCloneQueue(g: Game): { seconds: number; count: number; offline: boolean } | null {
  const kit = enemyCradle(g);
  if (!kit) return null;
  const queued = enemyQueued(g);
  if (!queued.length) return null;
  const hacked = !!g.enemy && hackPulseOn(g, g.enemy, "cradle");
  return { seconds: Math.ceil(queued[0].cloneIn ?? 0), count: queued.length, offline: cradleOffline(kit) || hacked };
}

/**
 * Clone Bay, Overview: "If the enemy ship's crew is dead, the battle will continue until their Clone Bay is destroyed."
 * sim.ts endCheck asks this before awarding a crew-kill win. True while the bay is not destroyed and a body waits.
 * "If the Clone Bay is destroyed while all enemy crew are dead or are in the cloning queue, the fight ends
 * immediately": a destroyed bay with no live crew purges the queue here, so the win lands this tick.
 */
export function enemyCloneHolds(g: Game): boolean {
  const kit = enemyCradle(g);
  if (!kit) return false;
  purgeEnemyClones(g);
  // Overview: a wrecked bay still holds the fight until the last crew's dying animation ends.
  if (!enemyLive(g) && kit.left > 0) return true;
  if (cradleDestroyed(kit)) return false;
  return enemyQueued(g).length > 0;
}
