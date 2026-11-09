/**
 * The stand-in's ship lists and the ship events its fights load, laid out as ftl.dat lays out its own.
 *
 * - `SHIP_LISTS`: one `blueprintList` per faction (`SHIPS_REBEL`, `SHIPS_JELLY` for the Slugs, `SHIPS_CIRCLE` for the
 *   Engi), its pirate lists, and `SHIPS_REBEL_ELITE`, built from ENEMY_BLUEPRINTS. A faction list holds that faction's
 *   ordinary ships; a class that only an event or the Rebel fleet fields stays off it, as in ftl.dat.
 * - `SHIP_EVENTS`: `<ship name auto_blueprint>` definitions, one per fight the stand-in's pages ask for.
 * - `FIGHT_SHIP`: the page wording of a fight ("Pirate ship") to the ship event it loads (`PIRATE`).
 * - `SHIP_LIST_RULES`: the gap's `<shipList>` rows, which give each list's fights a faction and a pirate flag. ftl.dat
 *   uses the same list names, so the rows cover it too.
 */
import type {
  BlueprintListDef,
  EventDef,
  ShipEventDef,
  ShipEventEscape,
  ShipListRule,
} from "@stl/pack";
import { ENEMY_BLUEPRINTS } from "./enemy-blueprints.ts";

/** Class id prefix to faction. Zoltan classes are `energy-`, as the hulls are. */
const FACTION_OF_PREFIX: Record<string, string> = {
  rebel: "rebel",
  auto: "auto",
  engi: "engi",
  mantis: "mantis",
  slug: "slug",
  rock: "rock",
  energy: "zoltan",
  crystal: "crystal",
  lanius: "lanius",
  federation: "federation",
};

/** ftl.dat's list for each faction. */
const FACTION_LIST: Record<string, string> = {
  rebel: "SHIPS_REBEL",
  auto: "SHIPS_AUTO",
  engi: "SHIPS_CIRCLE",
  mantis: "SHIPS_MANTIS",
  slug: "SHIPS_JELLY",
  rock: "SHIPS_ROCK",
  zoltan: "SHIPS_ZOLTAN",
  crystal: "SHIPS_CRYSTAL",
  lanius: "SHIPS_LANIUS",
  federation: "SHIPS_FED",
};

/** Pirate lists for one faction. ftl.dat has the Rock and Zoltan ones; the Slug one is the stand-in's own. */
const PIRATE_LIST: Record<string, string> = {
  rock: "SHIPS_ROCK_PIRATE",
  zoltan: "SHIPS_ZOLTAN_PIRATE",
  slug: "SHIPS_JELLY_PIRATE",
};

/** Classes only an event or the Rebel fleet fields. */
const NOT_LISTED = new Set(["elite-fighter", "elite-assault", "rock-assault-elite"]);
const ELITES = ["elite-fighter", "elite-assault"];

function factionOf(classId: string): string {
  const faction = FACTION_OF_PREFIX[classId.split("-")[0]!];
  if (!faction) throw new Error(`ship class ${classId} has no faction prefix`);
  return faction;
}

function pushUnique(map: Map<string, string[]>, list: string, id: string): void {
  const names = map.get(list) ?? [];
  if (!names.includes(id)) names.push(id);
  map.set(list, names);
}

function buildLists(): BlueprintListDef[] {
  const lists = new Map<string, string[]>();
  for (const row of ENEMY_BLUEPRINTS) {
    if (ELITES.includes(row.classId)) pushUnique(lists, "SHIPS_REBEL_ELITE", row.blueprint);
    if (NOT_LISTED.has(row.classId)) continue;
    const faction = factionOf(row.classId);
    pushUnique(lists, FACTION_LIST[faction]!, row.blueprint);
    if (!row.pirateBlueprint) continue;
    pushUnique(lists, "SHIPS_PIRATE", row.pirateBlueprint);
    const own = PIRATE_LIST[faction];
    if (own) pushUnique(lists, own, row.pirateBlueprint);
  }
  return [...lists].map(([id, names]) => ({ id, names }));
}

export const SHIP_LISTS: readonly BlueprintListDef[] = buildLists();

export const SHIP_LIST_RULES: readonly ShipListRule[] = [
  ...Object.entries(FACTION_LIST).map(([faction, id]) => ({ id, faction })),
  { id: "SHIPS_REBEL_ELITE", faction: "rebel" },
  { id: "SHIPS_PIRATE", pirate: true },
  ...Object.entries(PIRATE_LIST).map(([faction, id]) => ({ id, faction, pirate: true })),
];

/** Page wording of a fight to the ship event it loads, and that event's list (or one blueprint). */
const FIGHTS: [string[], string, string][] = [
  [["Pirate ship"], "PIRATE", "SHIPS_PIRATE"],
  [["Rebel ship", "Rebel Ship"], "REBEL", "SHIPS_REBEL"],
  [["Auto-ship"], "REBEL_AUTO", "SHIPS_AUTO"],
  [["Slug ship"], "JELLY", "SHIPS_JELLY"],
  [["Mantis ship", "Mantis Ship"], "MANTIS_SHIP", "SHIPS_MANTIS"],
  [["Lanius ship"], "LANIUS_SHIP", "SHIPS_LANIUS"],
  [["Zoltan ship"], "ZOLTAN_SHIP", "SHIPS_ZOLTAN"],
  [["Rock ship"], "ROCK_SHIP", "SHIPS_ROCK"],
  [["Crystal ship"], "CRYSTAL_SHIP", "SHIPS_CRYSTAL"],
  [["Engi ship"], "ENGI_SHIP", "SHIPS_CIRCLE"],
  [["Federation ship"], "FED_SHIP", "SHIPS_FED"],
  [["Rock pirate ship"], "ROCK_PIRATE", "SHIPS_ROCK_PIRATE"],
  [["Zoltan pirate ship"], "ZOLTAN_PIRATE", "SHIPS_ZOLTAN_PIRATE"],
  [["Slug pirate ship"], "JELLY_PIRATE", "SHIPS_JELLY_PIRATE"],
  [["Mantis Fighter"], "MANTIS_FIGHTER_SHIP", "MANTIS_FIGHTER"],
];

const AUTO_GOTAWAY =
  "The scout jumps away. It will certainly have informed the fleet of your position. You must get to the next sector as soon as possible!";
const REBEL_GOTAWAY =
  "The scout jumps away. They are sure to have informed the fleet of your position. You must get to the next Sector as soon as possible!";

function gotawayPage(id: string, body: string): EventDef {
  return { id: `${id}:gotaway`, dest: id, flag: id, aliases: [], sectors: [], body, choices: [] };
}

function escapeShip(
  id: string,
  autoBlueprint: string,
  escape: ShipEventEscape,
  pursuit = false,
  gotaway?: string,
): ShipEventDef {
  const row: ShipEventDef = { id, autoBlueprint, escape };
  if (pursuit) row.pursuit = true;
  if (gotaway) row.gotaway = { page: gotawayPage(id, gotaway) };
  return row;
}

function neverShip(id: string, autoBlueprint: string): ShipEventDef {
  return { id, autoBlueprint, escape: { chance: 0, min: 0, max: 0 } };
}

/** Ship events whose `<escape>` is the page's own line. A chance of 0 does not run. */
const ESCAPE_SHIPS: readonly ShipEventDef[] = [
  escapeShip(
    "REBEL_AUTO_WARNING",
    "SHIPS_AUTO",
    { timer: 40, min: 22, max: 22 },
    true,
    AUTO_GOTAWAY,
  ),
  escapeShip("SQUAT_WARNING", "SHIPS_REBEL", { timer: 40, min: 22, max: 22 }, true, REBEL_GOTAWAY),
  escapeShip("SQUAT_TRANSPORT", "SHIPS_REBEL", { timer: 40, min: 14, max: 14 }),
  escapeShip("REBEL_FUEL", "SHIPS_REBEL", { timer: 80, min: 30, max: 30 }),
  escapeShip("MANTIS_FUEL", "SHIPS_MANTIS", { timer: 80, min: 30, max: 30 }),
  escapeShip("JELLY_OVERPRICED", "SHIPS_JELLY", { timer: 80, min: 30, max: 30 }),
  escapeShip("AUTO_FUEL_SELLER", "SHIPS_AUTO", { timer: 80, min: 30, max: 30 }),
  escapeShip("PIRATE_BRIBER", "SHIPS_PIRATE", { chance: 0.4, min: 3, max: 4 }),
  escapeShip("PIRATE_SMUGGLE", "SHIPS_PIRATE", { timer: 35, min: 3, max: 4 }),
  escapeShip("BOSS_SCOUT_RESCUE", "SHIPS_REBEL", { chance: 0.5, min: 4, max: 8 }),
  neverShip("REBEL_NO_ESCAPE", "SHIPS_REBEL"),
  neverShip("PIRATE_NO_ESCAPE", "SHIPS_PIRATE"),
  neverShip("LANIUS_NO_ESCAPE", "SHIPS_LANIUS"),
  neverShip("JELLY_NO_ESCAPE", "SHIPS_JELLY"),
];

export const SHIP_EVENTS: readonly ShipEventDef[] = [
  ...FIGHTS.map(([, id, autoBlueprint]) => ({ id, autoBlueprint })),
  // The Rebel fleet's Elite at an overtaken beacon. ftl.dat's FLEET_EASY events load this ship by this name.
  { id: "LONG_FLEET", autoBlueprint: "SHIPS_REBEL_ELITE" },
  ...ESCAPE_SHIPS,
];

/**
 * A page's fight loads this ship event instead of the faction's ordinary ship.
 * The ids are ftl.dat's `<ship load>`. The escape band and a gotaway pursuit live on that ship.
 */
export const PAGE_SHIPS: Readonly<Record<string, string>> = {
  "c:auto-ship-warning:0": "REBEL_AUTO_WARNING",
  "c:auto-ship-warning-in-nebula:0": "REBEL_AUTO_WARNING",
  "c:no-fuel-auto-ship-warning:0": "REBEL_AUTO_WARNING",
  "c:rebel-ship-warning:0": "SQUAT_WARNING",
  "c:rebel-transport-ship:0": "SQUAT_TRANSPORT",
  "c:no-fuel-rebel-fight:0": "REBEL_FUEL",
  "c:no-fuel-mantis-fight:0": "MANTIS_FUEL",
  "c:no-fuel-slug-fuel-depot:2": "JELLY_OVERPRICED",
  "c:no-fuel-automated-refueling-ship:3": "AUTO_FUEL_SELLER",
  "c:pirate-briber:1": "PIRATE_BRIBER",
  "c:pirate-smuggler:0": "PIRATE_SMUGGLE",
  "c:rebel-ship-attacking-civilians-in-last-stand:0": "BOSS_SCOUT_RESCUE",
  "c:rebel-fight-among-rebel-fleet:0": "REBEL_NO_ESCAPE",
  "c:rebel-fight-among-federation-and-rebel-fleets:0": "REBEL_NO_ESCAPE",
  "c:rebel-ship-attacking-federation-loyalists:0": "REBEL_NO_ESCAPE",
  "c:rebel-ship-attacking-refueling-outpost:0": "REBEL_NO_ESCAPE",
  "c:rebel-ship-supplying-civilians:0": "REBEL_NO_ESCAPE",
  "c:fight-in-last-stand:0": "REBEL_NO_ESCAPE",
  "c:pirate-ship-attacking-civilian-distress:0": "PIRATE_NO_ESCAPE",
  "c:pirate-ship-attacking-civilian:0": "PIRATE_NO_ESCAPE",
  "c:pirate-engine-hacker:0": "PIRATE_NO_ESCAPE",
  "c:lanius-ship-attacking-civilian-distress:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-attacking-civilian:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-attacking-rock:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-attacking-mantis:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-attacking-slug:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-in-rich-debris-field:0": "LANIUS_NO_ESCAPE",
  "c:lanius-ship-in-rich-debris-field:1": "LANIUS_NO_ESCAPE",
  "c:lanius-fight-with-friendly-asb-support:0": "LANIUS_NO_ESCAPE",
  "c:slug-hacker-oxygen:0": "JELLY_NO_ESCAPE",
  "c:slug-hacker-oxygen:1": "JELLY_NO_ESCAPE",
  "c:slug-hacker-oxygen:2": "JELLY_NO_ESCAPE",
};

const FIGHT_SHIP = new Map(
  FIGHTS.flatMap(([words, id]) => words.map((word) => [word, id] as const)),
);

/** A fight that is not a ship event: the Rebel Flagship's own path. */
const NOT_A_SHIP = /flagship/i;

/**
 * The ship event a page's fight loads. Throws on a wording with no ship event, so a new page cannot ship a fight the
 * archive does not define.
 */
export function fightShipEvent(tier: string): string {
  if (NOT_A_SHIP.test(tier) || SHIP_EVENTS.some((row) => row.id === tier)) return tier;
  const id = FIGHT_SHIP.get(tier);
  if (!id)
    throw new Error(
      `fight "${tier}" names no ship event (packages/catalog/src/ship-lists.ts FIGHTS)`,
    );
  return id;
}
