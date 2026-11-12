/**
 * The artillery slot fires flak when the hull's gun is a flak blueprint.
 * The id is the hull's. An omitted weapon stays the beam.
 */
import { weaponDef } from "@stl/pack";

export function isFlakArtillery(defId: string | undefined): defId is string {
  return !!defId && weaponDef(defId)?.kind === "flak";
}
