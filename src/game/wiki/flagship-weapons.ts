/**
 * @agent:flagship. Rebel Flagship artillery: Boss Laser and Boss Beam WeaponDefs, the per-level charge table, and the
 * room each gun lives in. Sources: wiki page "The Rebel Flagship" ("Weapon cooldowns and status effects"), and the
 * "Boss Laser" / "Boss Beam" sections of "Lasers (Weapon)" / "Beam (Weapon)".
 *
 * "The Flagship weapons are artillery systems, working just like the Federation Cruiser artillery system, but with
 * different base charge times. Damaging the system slows down the weapon. In phase 1 and 2, they have 3 system levels.
 * In phase 3, they have 4 levels." Artillery is not fed from a Weapons power pool, so `power` below is only the
 * artillery level the WeaponDef shape needs (the Boss Ion / Boss Missile rows already store theirs the same way).
 *
 * Pure data, no sim imports: content.ts registers the defs (registerFlagshipWeapons).
 */
import type { WeaponDef } from "../content.ts";

/**
 * "Lasers (Weapon)", ===Boss Laser===: "Artillery system: with 4 system levels maximum", "Charge time: depends on
 * system level - 25s for level 1, 20s for level 2, 15s for level 3, 10s for level 4", "Shots: 3", "Damage per shot: 1",
 * "Effect: low chance of fire or breach". "The Rebel Flagship": "The lasers have a 10% fire and 9% breach chance."
 */
export const BOSS_LASER: WeaponDef = {
  id: "bosslaser",
  name: "Boss Laser",
  kind: "laser",
  // INFERRED: the artillery maximum (4), as Boss Missile stores its 4. No power line is printed; unused by the sim.
  power: 4,
  // Level-1 base. The other levels are in ARTILLERY_CHARGE.
  charge: 25,
  shots: 3,
  // INFERRED: 0.25 s between the three bolts so the volley reads as three shots. No gap is printed.
  gap: 0.25,
  damage: 1,
  ion: 0,
  fire: 0.1,
  breach: 0.09,
  ammo: false,
  // Only the Rebel Flagship (and the Rebel shipyard prototype) uses it. Not sold.
  price: 0,
  // The page's description string is "ssss" (sic), inside an HTML comment: not copied.
  blurb: "",
};

/**
 * "Beam (Weapon)", ====Boss Beam====: "Artillery system: with 3 system levels maximum", "32.5s for level 1, 26s for
 * level 2, 19.5s for level 3", "Beam length: 100 (2.2 tiles diagonally)", "Deals 2 damage per room hit".
 * "The Rebel Flagship": "None of the Flagship weapons can stun." No fire or breach percent is printed for it.
 * sim.ts beamRooms sweeps the aimed room and one neighbour, which fits a 2.2-tile beam.
 */
export const BOSS_BEAM: WeaponDef = {
  id: "bossbeam",
  name: "Boss Beam",
  kind: "beam",
  // INFERRED: the artillery maximum (3). No power line is printed; unused by the sim.
  power: 3,
  charge: 32.5,
  shots: 1,
  gap: 0,
  damage: 2,
  ion: 0,
  fire: 0,
  breach: 0,
  ammo: false,
  price: 0,
  // The quote "2 damage beam with a long trail." is inside an HTML comment: not copied.
  blurb: "",
};

/**
 * "The Rebel Flagship", "Weapon cooldowns and status effects": "The missiles have a 30% fire and 14% breach chance."
 * The Missile page row (weapons-missile.ts) prints no breach percent, so WEAPONS.bossmissile takes the flagship page's
 * 14% here. MISSILE_WEAPONS itself is left as the Missile page has it.
 */
export const BOSS_MISSILE_BREACH = 0.14;

/** "Charge time (seconds)" table, rows = artillery system level. "-" cells (Ion / Beam at level 4) are absent. */
export const ARTILLERY_CHARGE: Record<string, Partial<Record<1 | 2 | 3 | 4, number>>> = {
  bossion: { 1: 35, 2: 28, 3: 21 },
  bosslaser: { 1: 25, 2: 20, 3: 15, 4: 10 },
  bossmissile: { 1: 28.75, 2: 23, 3: 17.25, 4: 11.5 },
  bossbeam: { 1: 32.5, 2: 26, 3: 19.5 },
};

/**
 * Seconds for one charge of a flagship gun at `level` working artillery bars, or null when it cannot charge
 * (0 bars). "Damaging the system slows down the weapon": a damaged level reads the lower row. A level above the
 * gun's printed maximum (Ion / Beam have no level-4 cell) uses its highest printed row.
 */
export function artilleryChargeSeconds(defId: string, level: number): number | null {
  const row = ARTILLERY_CHARGE[defId];
  if (!row || level < 1) return null;
  for (let lv = Math.min(4, Math.floor(level)); lv >= 1; lv--) {
    const s = row[lv as 1 | 2 | 3 | 4];
    if (s != null) return s;
  }
  return null;
}

/** Add Boss Laser / Boss Beam and the flagship page's Boss Missile breach to the weapon registry. */
export function registerFlagshipWeapons(weapons: Record<string, WeaponDef>) {
  for (const def of [BOSS_LASER, BOSS_BEAM]) if (!weapons[def.id]) weapons[def.id] = def;
  const missile = weapons.bossmissile;
  // A copy, so MISSILE_WEAPONS keeps the Missile page's row.
  if (missile) weapons.bossmissile = { ...missile, breach: BOSS_MISSILE_BREACH };
}
