/**
 * INVENTED: the stand-in's own `<short>`, `<desc>`, `<flavorType>`, and `<powerList>` lines.
 * Every line is built from the row's own numbers, so no sentence is copied from a game file.
 * ftl.dat fills these from its text tables. The stand-in writes them so an archive screen has the same lines to show.
 */
import type { CrewDef, WeaponBlueprint } from "@stl/pack";

const ROMAN = new Set(["I", "II", "III", "IV", "V"]);

/**
 * A label short enough for a weapon or drone bar: "Mark" is dropped, and a name over 14 letters keeps its
 * first word and its numeral. "Burst Laser Mark II" is "Burst Laser II", "Heavy Pierce Laser Mark I" is "Heavy I".
 */
export function shortLabel(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((word) => word && word !== "Mark");
  const joined = words.join(" ");
  if (joined.length <= 14) return joined;
  const numeral = words.find((word) => ROMAN.has(word));
  return numeral ? `${words[0]} ${numeral}` : (words[0] ?? name);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function percent(chance: number): string {
  return `${Math.round(chance * 100)}%`;
}

/** One line on what a volley does, from the blueprint's own figures. */
export function weaponDetail(row: WeaponBlueprint): string {
  const shots = Math.max(1, row.shots);
  let line: string;
  if (row.kind === "beam") line = `Sweeps ${row.damage} damage across each room it crosses`;
  else if (row.kind === "bomb") line = "Teleports a charge straight into the target room";
  else if (row.ion > 0 && row.damage === 0)
    line = `Fires ${plural(shots, "pulse", "pulses")} of ${row.ion} ion`;
  else line = `Fires ${plural(shots, "shot", "shots")} of ${row.damage} damage`;
  if (row.charge > 0) line += `, every ${row.charge} seconds`;
  if (row.chargeLevels)
    line += `, and banks up to ${plural(row.chargeLevels, "volley", "volleys")}`;
  line += ".";
  const extras: string[] = [];
  if (row.kind === "bomb" && row.damage > 0) extras.push(`${row.damage} damage`);
  if (row.kind === "bomb" && row.ion > 0) extras.push(`${row.ion} ion`);
  if ((row.stunChance ?? 0) > 0) extras.push(`${percent(row.stunChance ?? 0)} stun`);
  if (row.fire > 0) extras.push(`${percent(row.fire)} fire`);
  if (row.breach > 0) extras.push(`${percent(row.breach)} breach`);
  if (row.ammo) extras.push("uses a missile");
  if (row.pierce) extras.push(`pierces ${plural(row.pierce, "shield layer", "shield layers")}`);
  return extras.length > 0 ? `${line} ${capital(extras.join(", "))}.` : line;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The weapon-type line a weapon shows in place of its kind. Only scatter and charged missiles have one. */
export function weaponFlavor(row: WeaponBlueprint): string | undefined {
  if (row.kind === "flak") return "Scattered Debris Volley";
  if (row.kind === "missile" && row.chargeLevels) return "Stacked Missile Salvo";
  return undefined;
}

const DRONE_JOB: Record<string, string> = {
  COMBAT: "Circles the enemy ship and keeps firing at random rooms.",
  DEFENSE: "Holds station beside your hull and shoots down what comes in.",
  SHIELD: "Adds a temporary shield layer while it is powered.",
  BOARDER: "Rams the enemy hull and fights its way through the rooms.",
  REPAIR: "Walks your ship and fixes damaged systems.",
  SHIP_REPAIR: "Leaves the hull to patch outer plating.",
  BATTLE: "Walks your ship and fights intruders.",
};

/** One line on a drone's job, by its `<type>`. */
export function droneDetail(
  type: string | undefined,
  power: number | undefined,
): string | undefined {
  const job = type ? DRONE_JOB[type] : undefined;
  if (!job) return undefined;
  return power != null ? `${job} Needs ${plural(power, "power bar", "power bars")}.` : job;
}

function scale(label: string, value: number): string | undefined {
  if (value === 1) return undefined;
  return `${label} ${value > 1 ? "faster" : "slower"}: ×${value}`;
}

/** The race's traits as `<power>` lines, from the crew row's numbers and flags. A plain race keeps one line. */
export function crewPowers(row: CrewDef): string[] {
  const lines: string[] = [];
  if (row.hp != null && row.hp !== 100) lines.push(`Health ${row.hp}`);
  const repair = scale("Repairs", row.repair ?? 1);
  if (repair) lines.push(repair);
  if ((row.fight ?? 1) !== 1) lines.push(`Melee damage ×${row.fight}`);
  const move = scale("Moves", row.move ?? 1);
  if (move) lines.push(move);
  if (row.fireTaken === 0) lines.push("Unharmed by fire");
  if (row.suffocate === 0) lines.push("Needs no air");
  if (row.bonusPower)
    lines.push(`Adds ${plural(row.bonusPower, "power bar", "power bars")} to its room`);
  if (row.hasDeathExplosion) lines.push("Bursts when it dies");
  if (row.drainsOxygen) lines.push("Drains the air in its room");
  if (row.detectsLifeforms) lines.push("Sees into nearby rooms");
  if (row.resistsMindControl) lines.push("Cannot be mind controlled");
  if (row.lockdown) lines.push("Can seal the room it stands in");
  if ((row.fireRepairMultiplier ?? 1) > 1) lines.push("Puts out fires faster");
  return lines.length > 0 ? lines : ["No special traits"];
}
