/**
 * Stand-in hover lines. The keys are ftl.dat's, from text_tooltips.xml and text_misc.xml.
 * The sentences are this stand-in's, not ftl.dat's copy. The screen reads them by key.
 *
 * These four have no ftl.dat key. They stay namespaced so they are not mistaken for archive ids:
 * - standin_tooltip_in_danger: the ship-info lock while the ship is in danger
 * - standin_tooltip_clone_queue: the clone bay queue under the crew
 * - standin_tooltip_launch_cost: the hacking drone's part cost
 * - standin_tooltip_ftl_needs_crew: the drive when it has no charge time and is not otherwise blocked
 */
const SYSTEMS: readonly { key: string; text: string; enemy: string }[] = [
  { key: "tooltip_shields", text: "Shields", enemy: "Enemy shields." },
  { key: "tooltip_engines", text: "Engines", enemy: "Enemy engines." },
  { key: "tooltip_oxygen", text: "Oxygen", enemy: "Enemy oxygen." },
  { key: "tooltip_weapons", text: "Weapons", enemy: "Enemy weapons." },
  { key: "tooltip_drones", text: "Drone Control", enemy: "Enemy drones." },
  { key: "tooltip_medbay", text: "Medbay", enemy: "Enemy medbay." },
  { key: "tooltip_pilot", text: "Piloting", enemy: "Enemy piloting." },
  { key: "tooltip_sensors", text: "Sensors", enemy: "Enemy sensors." },
  { key: "tooltip_doors", text: "Doors", enemy: "Enemy doors." },
  { key: "tooltip_teleporter", text: "Teleporter", enemy: "Enemy teleporter." },
  { key: "tooltip_cloaking", text: "Cloaking", enemy: "Enemy cloaking." },
  { key: "tooltip_artillery", text: "Artillery", enemy: "Enemy artillery." },
  { key: "tooltip_battery", text: "Battery", enemy: "Enemy battery." },
  { key: "tooltip_clonebay", text: "Clone Bay", enemy: "Enemy clone bay." },
  { key: "tooltip_mind", text: "Mind Control", enemy: "Enemy mind control." },
  { key: "tooltip_hacking", text: "Hacking", enemy: "Enemy hacking." },
];

export const TOOLTIPS: readonly { name: string; text: string }[] = [
  { name: "tooltip_jump_noPiloting", text: "Piloting is down." },
  { name: "tooltip_jump_noCrew", text: "Nobody is piloting." },
  { name: "tooltip_jump_noEngines", text: "Engines are unpowered." },
  { name: "tooltip_jump_noFuel", text: "No fuel." },
  { name: "tooltip_fuelCount", text: "Fuel" },
  { name: "tooltip_hull", text: "Hull" },
  { name: "tooltip_missileCount", text: "Missiles" },
  { name: "tooltip_droneCount", text: "Drone parts" },
  { name: "tooltip_evadeDisplay", text: "Evasion" },
  { name: "tooltip_oxygenDisplay", text: "Oxygen" },
  { name: "mainmenu_options", text: "Options" },
  { name: "escape_options", text: "Options" },
  { name: "hotkey_savePositions", text: "Save where every crew member stands ( / )" },
  { name: "hotkey_loadPositions", text: "Send the crew back to their saved spots (Return)" },
  { name: "help_power_text_pc_add", text: "Add power" },
  { name: "help_power_text_pc_remove", text: "Remove power" },
  ...SYSTEMS.flatMap((row) => [
    { name: row.key, text: row.text },
    { name: `${row.key}_enemy`, text: row.enemy },
  ]),
  { name: "standin_tooltip_in_danger", text: "In danger" },
  { name: "standin_tooltip_clone_queue", text: "Clone Bay queue: first in line is revived first" },
  { name: "standin_tooltip_launch_cost", text: "Each launch costs one drone part" },
  { name: "standin_tooltip_ftl_needs_crew", text: "FTL needs a pilot or engines." },
];

function escapeXml(text: string): string {
  return text.replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">");
}

/** data/text_tooltips.xml for the stand-in archive. */
export function tooltipsXml(): string {
  const rows = TOOLTIPS.map((row) => `  <text name="${row.name}">${escapeXml(row.text)}</text>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<FTL>\n${rows.join("\n")}\n</FTL>\n`;
}
