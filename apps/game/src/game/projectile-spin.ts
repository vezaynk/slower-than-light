/** Degrees per second from `<spin>`, as radians over `elapsed` seconds. Flak only. No spin is 0. */
import { weaponDef } from "@stl/pack";

export function projectileSpin(defId: string | undefined, kind: string, elapsed: number): number {
  if (kind !== "flak" || !defId) return 0;
  const deg = weaponDef(defId)?.spin;
  if (deg == null || deg === 0) return 0;
  return (deg * elapsed * Math.PI) / 180;
}
