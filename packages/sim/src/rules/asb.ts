/**
 * The anti-ship battery's shot.
 * Environmental Hazards: 3 hull and a breach. No fire figure is stated.
 * The shot is the PDS_SHOT blueprint: damage, breach, fire, and shield pierce (`<sp>`, 5 in ftl.dat).
 * An archive without that blueprint warns and keeps the wiki figures, including a shot that passes every shield layer.
 */
import { warnPack, weaponDef } from "@stl/pack";

/** The anti-ship battery's weapon blueprint in ftl.dat. */
export const ASB_WEAPON = "PDS_SHOT";

/**
 * Shield layers the anti-ship battery's shot passes: PDS_SHOT's `<sp>` (5 in ftl.dat).
 * An archive without PDS_SHOT or its `<sp>` warns and keeps the battery's "shield-piercing" shot past every layer.
 */
export function asbPierce(): number {
  const pierce = weaponDef(ASB_WEAPON)?.pierce;
  if (pierce != null) return pierce;
  warnPack(`${ASB_WEAPON} has no <sp>; the anti-ship battery passes every shield layer.`);
  return Infinity;
}

/**
 * Hull, breach, and fire on the anti-ship battery's shot: PDS_SHOT's damage, breach, and fire.
 * An archive without PDS_SHOT warns once and uses the wiki figures: 3 hull, breach 1, fire 0.
 */
export function citedAsbShot(): { damage: number; breachChance: number; fireChance: number } {
  const def = weaponDef(ASB_WEAPON);
  if (def) return { damage: def.damage, breachChance: def.breach, fireChance: def.fire };
  warnPack(`${ASB_WEAPON} is not loaded; the anti-ship battery uses 3 hull, breach 1, and fire 0.`);
  return { damage: 3, breachChance: 1, fireChance: 0 };
}
