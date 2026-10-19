/**
 * The sectors FTL's StarMap::GenerateSectorMap names in code, by their ftl.dat sector_data.xml ids. Every other sector
 * is drawn from the archive's sectorType lists.
 */
import { allSectors, sectorDef } from "@stl/pack";

/** Sector 1. GenerateSectorMap loads GetSpecificSector("STANDARD_SPACE"): its beacon quotas and START_BEACON. */
export const START_SECTOR = "STANDARD_SPACE";
/** A civilian sector id. An empty chart column and the crystal-restart bug both land here. */
export const CIVILIAN_SECTOR = "CIVILIAN_SECTOR";
/** The last column, GetSpecificSector("FINAL"). */
export const FINAL_SECTOR = "FINAL";
/** The secret sector, GetSpecificSector("CRYSTAL_HOME"). It is never on the chart. */
export const CRYSTAL_SECTOR = "CRYSTAL_HOME";

/** The name a sector shows on the chart and the HUD: that sector's own stored title. */
export function sectorTitle(id: string): string {
  return sectorDef(id)?.name ?? id;
}

/** An archive id, or the id whose stored title is this label. Anything else is not a sector. */
export function sectorIdOf(label: string | undefined): string | undefined {
  if (!label) return undefined;
  if (sectorDef(label)) return label;
  return allSectors().find((sector) => sector.name === label)?.id;
}
