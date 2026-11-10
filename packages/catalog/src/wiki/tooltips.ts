/**
 * Stand-in hover lines. ftl.dat has its own text_tooltips.xml. These sentences are not that copy.
 * The screen reads them by key. The English stays in this table, not in the game.
 */
export const TOOLTIPS: readonly { name: string; text: string }[] = [
  { name: "tooltip_pilot_down", text: "Piloting is down." },
  { name: "tooltip_no_pilot", text: "Nobody is piloting." },
  { name: "tooltip_engines_unpowered", text: "Engines are unpowered." },
  { name: "tooltip_ftl_needs_crew", text: "FTL needs a pilot or engines." },
  { name: "tooltip_fuel", text: "Fuel" },
  { name: "tooltip_hull", text: "Hull" },
  { name: "tooltip_missiles", text: "Missiles" },
  { name: "tooltip_drone_parts", text: "Drone parts" },
  { name: "tooltip_evasion", text: "Evasion" },
  { name: "tooltip_oxygen", text: "Oxygen" },
  { name: "tooltip_options", text: "Options" },
  { name: "tooltip_in_danger", text: "In danger" },
  { name: "tooltip_launch_cost", text: "Each launch costs one drone part" },
  { name: "tooltip_power_remove", text: "Remove power" },
  { name: "tooltip_power_add", text: "Add power" },
  { name: "tooltip_save_spots", text: "Save where every crew member stands ( / )" },
  { name: "tooltip_recall_spots", text: "Send the crew back to their saved spots (Return)" },
  { name: "tooltip_clone_queue", text: "Clone Bay queue: first in line is revived first" },
];

function escapeXml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** data/text_tooltips.xml for the stand-in archive. */
export function tooltipsXml(): string {
  const rows = TOOLTIPS.map((row) => `  <text name="${row.name}">${escapeXml(row.text)}</text>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<FTL>\n${rows.join("\n")}\n</FTL>\n`;
}
