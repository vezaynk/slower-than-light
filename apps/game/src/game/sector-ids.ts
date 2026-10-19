/**
 * The sectors FTL's StarMap::GenerateSectorMap names in code, by their ftl.dat sector_data.xml ids. Every other sector
 * is drawn from the archive's sectorType lists.
 */
import { sectorDef } from "@stl/pack";

/** Sector 1. GenerateSectorMap loads GetSpecificSector("STANDARD_SPACE"): its beacon quotas and START_BEACON. */
export const START_SECTOR = "STANDARD_SPACE";
/** The name sector 1 shows: GenerateSectorMap gives it the type CIVILIAN_SECTOR and "sectorname_CIVILIAN_SECTOR". */
export const CIVILIAN_SECTOR = "CIVILIAN_SECTOR";
/** The last column, GetSpecificSector("FINAL"). */
export const FINAL_SECTOR = "FINAL";
/** The secret sector, GetSpecificSector("CRYSTAL_HOME"). It is never on the chart. */
export const CRYSTAL_SECTOR = "CRYSTAL_HOME";

/** The name a sector shows on the chart and the HUD. Sector 1 is named after CIVILIAN_SECTOR, as in FTL. */
export function sectorTitle(id: string): string {
  const shown = id === START_SECTOR ? CIVILIAN_SECTOR : id;
  return sectorDef(shown)?.name ?? sectorDef(id)?.name ?? id;
}
