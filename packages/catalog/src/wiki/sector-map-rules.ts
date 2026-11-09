import type { SectorMap } from "@stl/pack";

/**
 * xftl doc/sector-map (StarMap::GenerateMap / PopulateGrid, the danger zone, the exit, the Last Stand, the flagship).
 *
 * "a 6x4 grid". "Each cell represents a 110x110px area, and the beacon is placed randomly inside that with 10px of
 * margin". This game ships 28px instead of that 10, so neighbouring beacons stay at least 56px apart and tappable;
 * a missing tag still falls back to FTL's 10. "There's a 20% chance for a cell on the map to not have a beacon."
 * "The y coordinate is then limited to at most 415, and if it's in the two top-right cells, the y is limited to at
 * least 30". "within 165px".
 *
 * "The danger zone can be modelled as a circle of radius of 767. The Y position of the centre of the circle is
 * picked at random in the range of 50-300, and it's X starts at -959. The X position proceeds 64px" per normal jump.
 *
 * "the X is randomised between the two right-most columns", "at least five jumps". "The game will try upto 16 times".
 * "On easy/normal, the base's x is picked from {2,3} while on hard it's picked from {3,4}. On easy/normal, the path
 * to the base must be 4 jumps long, while on hard it must be between 5-6 jumps (inclusive)."
 * Flagship: "4-6 jumps (which includes both the start and end beacons)" is 3-5 jumps between them.
 *
 * The gap mod writes these as one `<sectorMap>` tag. Connecting a split map and diagonal adjacency stay code.
 */
export const SECTOR_MAP: Required<SectorMap> = {
  cols: 6,
  rows: 4,
  cell: 110,
  margin: 28,
  empty: 0.2,
  yMax: 415,
  topRightY: 30,
  link: 165,
  dangerRadius: 767,
  startX: -959,
  step: 64,
  dangerYMin: 50,
  dangerYMax: 300,
  exitColMin: 4,
  exitColMax: 5,
  exitMinJumps: 5,
  tries: 16,
  fedColMin: 2,
  fedColMax: 3,
  fedHardColMin: 3,
  fedHardColMax: 4,
  fedJumps: 4,
  fedHardJumpsMin: 5,
  fedHardJumpsMax: 6,
  flagshipJumpsMin: 3,
  flagshipJumpsMax: 5,
};
