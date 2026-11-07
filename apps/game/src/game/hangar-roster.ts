/**
 * The hangar's cruisers, from the loaded archive. FTL's executable fixes the roster: ten families in hangar order, each
 * layout the blueprint `PLAYER_SHIP_<family>`, then `_2` and `_3` for Layouts B and C. A layout the archive does not
 * define is left out. Each cruiser's name is its Layout A blueprint's `<class>` ("Kestrel Cruiser").
 */
import { hullDef } from "@stl/pack";

const FAMILIES = [
  "HARD",
  "CIRCLE",
  "FED",
  "ENERGY",
  "ANAEROBIC",
  "STEALTH",
  "ROCK",
  "JELLY",
  "MANTIS",
  "CRYSTAL",
] as const;

const LETTERS = ["A", "B", "C"] as const;

export type HangarLayout = { id: string; heading: string };
export type HangarPage = { page: string; layouts: HangarLayout[] };

export function hangarPages(): HangarPage[] {
  return FAMILIES.flatMap((family) => {
    const base = `PLAYER_SHIP_${family}`;
    const layouts = [base, `${base}_2`, `${base}_3`].flatMap((id, index) =>
      hullDef(id) ? [{ id, heading: `Layout ${LETTERS[index]}` }] : [],
    );
    const first = layouts[0];
    if (!first) return [];
    const page = hullDef(first.id)?.cruiser.trim() || first.id;
    return [{ page, layouts }];
  });
}
