/**
 * "Charge time (seconds)" table, rows = artillery system level. "-" cells (Ion / Beam at level 4) are absent.
 * The archive does not store this table. The fight reads it here.
 */
const ARTILLERY_CHARGE: Record<string, Partial<Record<1 | 2 | 3 | 4, number>>> = {
  ARTILLERY_BOSS_4: { 1: 35, 2: 28, 3: 21 },
  ARTILLERY_BOSS_1: { 1: 25, 2: 20, 3: 15, 4: 10 },
  ARTILLERY_BOSS_2: { 1: 28.75, 2: 23, 3: 17.25, 4: 11.5 },
  ARTILLERY_BOSS_3: { 1: 32.5, 2: 26, 3: 19.5 },
};

/**
 * Seconds for one charge of a flagship gun at `level` working artillery bars, or null when it cannot charge
 * (0 bars). A damaged level reads the lower row. A level above the gun's printed maximum uses its highest row.
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
