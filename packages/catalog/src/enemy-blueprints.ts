/**
 * Campaign class id to the archive shipBlueprint name.
 * The pairing is each faction page's "Ships blueprints names" trivia, spelled
 * as the Hyperspace vanilla ship list spells the id.
 * A wiki "*_DLC" name that list does not contain is the Advanced Edition
 * overwrite of the base id, so those two classes share one blueprint.
 * Rows are in class-table order. A later row replaces an earlier ship of the
 * same name, which is the overwrite a loaded archive keeps.
 * The shared room grid is one layout file, named for the first class.
 * Pirate ids are their own blueprints. A class with no pirate id uses the regular ship.
 */

export type EnemyBlueprint = {
  classId: string;
  blueprint: string;
  pirateBlueprint?: string;
};

export const ENEMY_BLUEPRINTS: readonly EnemyBlueprint[] = [
  { classId: "rebel-fighter", blueprint: "REBEL_SKINNY", pirateBlueprint: "REBEL_SKINNY_P" },
  { classId: "rebel-invader", blueprint: "REBEL_SKINNY", pirateBlueprint: "REBEL_SKINNY_P_DLC" },
  { classId: "rebel-rigger", blueprint: "REBEL_FAT", pirateBlueprint: "REBEL_FAT_P" },
  { classId: "rebel-disruptor", blueprint: "REBEL_FAT", pirateBlueprint: "REBEL_FAT_P_DLC" },
  { classId: "elite-fighter", blueprint: "REBEL_SKINNY_ELITE" },
  { classId: "elite-assault", blueprint: "REBEL_SKINNY_ELITE" },
  { classId: "auto-scout", blueprint: "AUTO_BASIC" },
  { classId: "auto-surveyor", blueprint: "AUTO_BASIC" },
  { classId: "auto-assault", blueprint: "AUTO_ASSAULT" },
  { classId: "auto-hacker", blueprint: "AUTO_ASSAULT" },
  { classId: "engi-scout", blueprint: "CIRCLE_SCOUT" },
  { classId: "engi-outrider", blueprint: "CIRCLE_SCOUT" },
  { classId: "engi-bomber", blueprint: "CIRCLE_BOMBER" },
  { classId: "engi-hacker", blueprint: "CIRCLE_BOMBER" },
  { classId: "mantis-scout", blueprint: "MANTIS_SCOUT", pirateBlueprint: "MANTIS_SCOUT_P" },
  {
    classId: "mantis-interceptor",
    blueprint: "MANTIS_SCOUT",
    pirateBlueprint: "MANTIS_SCOUT_P_DLC",
  },
  { classId: "mantis-fighter", blueprint: "MANTIS_FIGHTER", pirateBlueprint: "MANTIS_FIGHTER_P" },
  {
    classId: "mantis-assault",
    blueprint: "MANTIS_FIGHTER",
    pirateBlueprint: "MANTIS_FIGHTER_P_DLC",
  },
  { classId: "mantis-bomber", blueprint: "MANTIS_BOMBER", pirateBlueprint: "MANTIS_BOMBER_P" },
  {
    classId: "mantis-aggressor",
    blueprint: "MANTIS_BOMBER",
    pirateBlueprint: "MANTIS_BOMBER_P_DLC",
  },
  { classId: "slug-interceptor", blueprint: "JELLY_BUTTON", pirateBlueprint: "JELLY_BUTTON_P" },
  { classId: "slug-scout", blueprint: "JELLY_BUTTON", pirateBlueprint: "JELLY_BUTTON_P_DLC" },
  {
    classId: "slug-light-cruiser",
    blueprint: "JELLY_CROISSANT",
    pirateBlueprint: "JELLY_CROISSANT_P",
  },
  {
    classId: "slug-light-surveyor",
    blueprint: "JELLY_CROISSANT",
    pirateBlueprint: "JELLY_CROISSANT_P_DLC",
  },
  { classId: "slug-assault", blueprint: "JELLY_TRUFFLE", pirateBlueprint: "JELLY_TRUFFLE_P" },
  {
    classId: "slug-instigator",
    blueprint: "JELLY_TRUFFLE",
    pirateBlueprint: "JELLY_TRUFFLE_P_DLC",
  },
  { classId: "rock-scout", blueprint: "ROCK_SCOUT", pirateBlueprint: "ROCK_SCOUT_P" },
  { classId: "rock-investigator", blueprint: "ROCK_SCOUT", pirateBlueprint: "ROCK_SCOUT_P_DLC" },
  { classId: "rock-fighter", blueprint: "ROCK_FIGHT", pirateBlueprint: "ROCK_FIGHT_P" },
  { classId: "rock-interceptor", blueprint: "ROCK_FIGHT", pirateBlueprint: "ROCK_FIGHT_P_DLC" },
  { classId: "rock-assault", blueprint: "ROCK_ASSAULT" },
  { classId: "rock-aggressor", blueprint: "ROCK_ASSAULT" },
  { classId: "rock-assault-elite", blueprint: "ROCK_ASSAULT_ELITE" },
  { classId: "energy-fighter", blueprint: "ZOLTAN_FIGHTER", pirateBlueprint: "ZOLTAN_FIGHTER_P" },
  {
    classId: "energy-instigator",
    blueprint: "ZOLTAN_FIGHTER",
    pirateBlueprint: "ZOLTAN_FIGHTER_P_DLC",
  },
  { classId: "energy-bomber", blueprint: "ZOLTAN_BOMBER", pirateBlueprint: "ZOLTAN_BOMBER_P" },
  { classId: "energy-hacker", blueprint: "ZOLTAN_BOMBER", pirateBlueprint: "ZOLTAN_BOMBER_P_DLC" },
  { classId: "crystal-scout", blueprint: "CRYSTAL_SCOUT" },
  { classId: "crystal-outrider", blueprint: "CRYSTAL_SCOUT" },
  { classId: "crystal-bomber", blueprint: "CRYSTAL_BOMBER" },
  { classId: "crystal-instigator", blueprint: "CRYSTAL_BOMBER" },
  { classId: "lanius-scout", blueprint: "ANAEROBIC_SCOUT" },
  { classId: "lanius-bomber", blueprint: "ANAEROBIC_BOMBER" },
  { classId: "federation-scout", blueprint: "FED_SCOUT", pirateBlueprint: "FED_SCOUT_P" },
  { classId: "federation-outrider", blueprint: "FED_SCOUT", pirateBlueprint: "FED_SCOUT_P_DLC" },
  { classId: "federation-bomber", blueprint: "FED_BOMBER", pirateBlueprint: "FED_BOMBER_P" },
  { classId: "federation-hacker", blueprint: "FED_BOMBER", pirateBlueprint: "FED_BOMBER_P_DLC" },
];

const BY_CLASS = new Map(ENEMY_BLUEPRINTS.map((row) => [row.classId, row]));

/** Archive blueprint a fight asks for. A pirate with no pirate blueprint uses the regular ship. */
export function enemyBlueprintId(classId: string, pirate = false): string {
  const row = BY_CLASS.get(classId);
  if (!row) return classId;
  if (pirate && row.pirateBlueprint) return row.pirateBlueprint;
  return row.blueprint;
}
