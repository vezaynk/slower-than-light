import { tx } from "../../i18n/index.ts";
import type { Game, Kit, Ship } from "../types.ts";
import { seatKits } from "../layouts.ts";
import { kitBars, kitIonLocked, kitPowerDown, kitPowerUp, log, noteZoltanKits, rand } from "../sim.ts";
import { noteAchieve } from "../wiki/achieve-notes.ts";

/** Wiki page "Cloaking", section "System Upgrades": level 1 cost 150. */
const INSTALL_COST = 150;
/** Wiki page "Cloaking", section "Overview": evasion is increased by a flat 60%. */
const EVADE = 60;
/**
 * Wiki page "Cloaking", section "Overview": when the cloak ends it takes 4 ion
 * damage, so it cannot be used again for 20 seconds. Code stores that 20s lockout.
 */
const COOLDOWN = 20;
/** Wiki page "Cloaking", section "System Upgrades": level 2 costs 30, level 3 costs 50. Keyed by the level already owned. */
const UPGRADE_COST: Record<number, number> = { 1: 30, 2: 50 };

export function veilUpgradeCost(level: number): number | null {
  return UPGRADE_COST[level] ?? null;
}

function blankVeil(): Kit {
  return {
    id: "veil",
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function active(kit: Kit | undefined): boolean {
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  return !!kit && kit.on && kit.left > 0 && kitBars(kit) >= 1 && kit.level > 0;
}

function endVeil(kit: Kit) {
  kit.left = 0;
  kit.on = false;
  kit.cool = COOLDOWN;
}

/**
 * Backup Battery, Overview: losing the bar can end an active cloak and start its cooldown early.
 * A cloak that is already cooling is left on that cooldown.
 */
export function interruptVeil(kit: Kit) {
  if (!(kit.on && kit.left > 0)) return;
  if (kitBars(kit) >= 1) return;
  endVeil(kit);
}

function tickKit(kit: Kit | undefined, dt: number) {
  if (!kit) return;
  if (kit.on) {
    kit.left -= dt;
    if (kit.left <= 0) endVeil(kit);
    return;
  }
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
}

/** Wiki page "Cloaking", section "System Upgrades": buy a level-1 Veil for 150. No-op if already fitted or scrap is short. */
export function installVeil(g: Game) {
  if (g.player.kits.veil) return;
  if (g.scrap < INSTALL_COST) return;
  g.scrap -= INSTALL_COST;
  noteAchieve(g, { k: "upgrade" });
  g.player.kits.veil = blankVeil();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, tx("extras.veil.cloaking-fitted"));
}

/** Wiki page "Cloaking", section "System Upgrades": level 1→2 costs 30, level 2→3 costs 50. Level 3 is the cap. */
export function upgradeVeil(g: Game) {
  const kit = g.player.kits.veil;
  if (!kit || kit.level >= 3) return;
  const cost = UPGRADE_COST[kit.level];
  if (cost == null || g.scrap < cost) return;
  g.scrap -= cost;
  kit.level += 1;
  noteAchieve(g, { k: "upgrade" });
}

/** Add a bar (sim kitPowerUp); at the top, or with no spare bar, remove one, as toggleSlingPower does. */
export function toggleVeilPower(g: Game) {
  if (kitPowerUp(g, "veil")) return;
  kitPowerDown(g, "veil");
}

/**
 * Wiki page "Cloaking", "System Upgrades": 5/10/15 seconds. Read per powered bar (Systems: "Powering a system additional
 * levels will make it more powerful"; Cloaking, Zoltan note: "Cloaking duration can be increased or decreased by adding
 * or removing Zoltan power to the system ... the maximum cloak duration cannot exceed the maximum system level
 * duration"). INTENTIONALLY OVERRIDING the earlier read of 5 seconds per bought level.
 */
export function veilSeconds(kit: Kit): number {
  return 5 * kitBars(kit);
}

/** Wiki page "Cloaking": the cloak runs veilSeconds for the bars powered when it starts. */
export function startVeil(g: Game) {
  const kit = g.player.kits.veil;
  if (!kit) return;
  noteZoltanKits(g);
  // Zoltans: Cloaking cannot be activated if it is ionized. A Zoltan bar does not clear that lock.
  if (kitIonLocked(kit)) return;
  if (kit.on) return;
  // Per the user: C or the CLOAK button says why nothing happened, as the Teleporter does.
  if (kitBars(kit) < 1) {
    log(g, tx("extras.veil.cloaking-has-no-power"));
    return;
  }
  if (kit.cool > 0) {
    log(g, tx("extras.veil.cloaking-is-still-cooling-down"));
    return;
  }
  kit.on = true;
  noteAchieve(g, { k: "cloak" });
  kit.left = veilSeconds(kit);
  kit.cool = 0;
  log(g, tx("extras.veil.cloaking-up"));
}

/**
 * Active time is 5s per level, then the 20s lockout ("Overview"; "System Upgrades").
 * Cloaking, "Enemy AI and Cloaking": an enemy with power cloaks as soon as it can, not after a delay.
 */
export function tickVeil(g: Game, dt: number) {
  // Cloaking, Zoltan note: removing power shortens a running cloak, down to "a fraction of a second".
  capVeil(g.player.kits.veil);
  capVeil(g.enemy?.kits.veil);
  tickKit(g.player.kits.veil, dt);
  const foe = g.enemy;
  if (!foe) return;
  const kit = foe.kits.veil;
  tickKit(kit, dt);
  if (!kit || kit.on) return;
  // Zoltans: an ionized Cloaking system cannot be activated.
  if (kit.power >= 1 && kit.cool <= 0 && !kitIonLocked(kit)) {
    kit.on = true;
    kit.left = veilSeconds(kit);
    kit.cool = 0;
    // Cloaking, "Enemy AI and Cloaking": "They will randomly decide whether to fire weapons freely while cloaked,
    // or hold fire until cloaking ends; this pattern may change throughout the fight." Rolled per cloak.
    kit.target = rand(g) < 0.5 ? "hold" : "fire";
  }
}

/** The enemy is cloaked and chose to hold fire for this cloak (see tickVeil). */
export function enemyHoldsFire(g: Game): boolean {
  const kit = g.enemy?.kits.veil;
  return !!kit && active(kit) && kit.target === "hold";
}

function capVeil(kit: Kit | undefined) {
  if (kit && kit.on && kit.left > veilSeconds(kit)) kit.left = veilSeconds(kit);
}

/** Wiki page "Cloaking", section "Overview": flat +60 while that hull's Veil is up, powered, and still counting. */
export function veilEvade(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  void g;
  void aboard;
  return active(ship.kits.veil) ? EVADE : 0;
}

/** Wiki page "Cloaking", section "Overview": weapons cannot target a cloaked ship. */
export function veilBlocks(g: Game, from: "player" | "enemy"): boolean {
  const target = from === "player" ? g.enemy : g.player;
  return active(target?.kits.veil);
}

/**
 * Cloaking, "Overview": a non-beam volley cuts 20% once, on the first projectile.
 * Ion Charger and Charger Laser I cut 20% of the full cloak with each shot.
 * Charger Laser I is Laser (Weapons), "Laser Charger" (the Laser_Charger_I.png row). Laser Charger (S)
 * is a different section and is not named here, so it keeps the single cut.
 * Laser Charger II cuts 20% once, after the final shot of the volley. These chargers have no printed
 * gap, so that final shot leaves with the rest of the volley.
 * Swarm Missiles and Pegasus are an untested note on that page; they keep the single cut.
 */
export function cloakVolleyCuts(defId: string, count: number): number {
  if (count < 1) return 0;
  if (defId === "ioncharger" || defId === "charger") return count;
  return 1;
}

/**
 * Wiki page "Cloaking", "Overview": each non-beam shot removes 20% of the full cloak time.
 * Beams are exempt. Quiet Mounts skips the penalty (Stealth Weapons on that page).
 * A cloak that reaches 0 starts the 20s cooldown.
 * A volley calls this once per cloakVolleyCuts, not once per projectile.
 */
export function veilBrokenByFire(g: Game, from: "player" | "enemy", kind: string) {
  if (kind === "beam") return;
  if (g.augments.includes("quiet")) return;
  const ship = from === "player" ? g.player : g.enemy;
  const kit = ship?.kits.veil;
  if (!kit || !active(kit)) return;
  const full = veilSeconds(kit);
  kit.left -= full * 0.2;
  if (kit.left <= 0) endVeil(kit);
}
