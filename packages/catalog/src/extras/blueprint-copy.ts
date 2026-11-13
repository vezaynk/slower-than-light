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

/** Seconds as the card prints them: whole numbers bare, others to one decimal. */
function seconds(value: number): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))} s`;
}

/**
 * The weapon's stat summary, from the blueprint's own figures: "3 shots, 1 damage each. 12 s charge. 2 power."
 * Hit chances, the missile cost, and shield pierce follow as their own sentences.
 */
export function weaponDetail(row: WeaponBlueprint): string {
  const shots = Math.max(1, row.shots);
  const parts: string[] = [];
  if (row.kind === "beam") parts.push(`Beam, ${row.damage} damage per room.`);
  else if (row.kind === "bomb") {
    const hits: string[] = [];
    if ((row.sysDamage ?? 0) > 0) hits.push(`${row.sysDamage} system damage`);
    if (row.ion > 0) hits.push(`${row.ion} ion`);
    const crew = row.crewDamage ?? 0;
    if (crew > 0) hits.push(`${crew} crew damage`);
    if (crew < 0) hits.push(`heals ${-crew} crew HP`);
    parts.push(hits.length > 0 ? `Bomb, ${hits.join(", ")}.` : "Bomb.");
  } else {
    const hit: string[] = [];
    if (row.damage > 0 || row.ion === 0) hit.push(`${row.damage} damage`);
    if (row.ion > 0) hit.push(`${row.ion} ion`);
    const unit = row.kind === "flak" ? "projectile" : "shot";
    const each = shots > 1 ? " each" : "";
    parts.push(`${plural(shots, unit, `${unit}s`)}, ${hit.join(" and ")}${each}.`);
  }
  if (row.charge > 0) parts.push(`${seconds(row.charge)} charge.`);
  if (row.chargeLevels)
    parts.push(`Stores up to ${plural(row.chargeLevels, "charge", "charges")}.`);
  if (row.power > 0) parts.push(`${row.power} power.`);
  const odds: string[] = [];
  if (row.fire > 0) odds.push(`${percent(row.fire)} fire`);
  if (row.breach > 0) odds.push(`${percent(row.breach)} breach`);
  if ((row.stunChance ?? 0) > 0) odds.push(`${percent(row.stunChance ?? 0)} stun`);
  if (odds.length > 0) parts.push(`${capital(odds.join(", "))}.`);
  if (row.ammo) parts.push("Uses 1 missile.");
  // A missile that spends ammo flies past every layer, and its card already says so. Its `<sp>` stays off the line.
  if (row.pierce && !(row.kind === "missile" && row.ammo))
    parts.push(`Pierces ${plural(row.pierce, "shield layer", "shield layers")}.`);
  return parts.join(" ");
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The weapon-type line a weapon shows in place of its kind. Only flak and charged missiles have one. */
export function weaponFlavor(row: WeaponBlueprint): string | undefined {
  if (row.kind === "flak") return "Flak";
  if (row.kind === "missile" && row.chargeLevels) return "Charge Missile";
  return undefined;
}

const DRONE_JOB: Record<string, string> = {
  COMBAT: "Orbits the enemy ship. Fires at random rooms.",
  DEFENSE: "Orbits your ship. Shoots down incoming missiles.",
  SHIELD: "Adds a temporary shield layer while powered.",
  BOARDER: "Boards the enemy ship. Damages systems and fights crew.",
  REPAIR: "Repairs systems on your ship.",
  SHIP_REPAIR: "Repairs hull.",
  BATTLE: "Fights intruders on your ship.",
};

/** What a defense drone shoots, by its `<target>`. */
const DEFENSE_TARGET: Record<string, string> = {
  DRONES: "Orbits your ship. Shoots down enemy drones.",
  LASERS: "Orbits your ship. Shoots down missiles, lasers, and ion.",
};

/** The drone's stat summary, by its `<type>`, `<target>`, and `<power>`: "Repairs hull. 2 power." */
export function droneDetail(
  type: string | undefined,
  power: number | undefined,
  target?: string,
): string | undefined {
  let job = type ? DRONE_JOB[type] : undefined;
  if (!job) return undefined;
  if (type === "DEFENSE" && target && DEFENSE_TARGET[target]) job = DEFENSE_TARGET[target];
  return power != null ? `${job} ${power} power.` : job;
}

/** Names the hull summary prints, by id. */
export type HullNames = {
  weapon: (id: string) => string;
  drone: (id: string) => string;
  augment: (id: string) => string;
  kin: (id: string) => string;
  kit: (id: string) => string;
};

/** The kits a hull summary reads. */
type SummaryKit = {
  level: number;
  target?: string | null;
  loadout?: string[];
  weapon?: string;
};

/**
 * A cruiser's stat summary, from its own loadout: weapons, drones, extra systems, augments, crew, and reactor.
 * "Weapons: Burst Laser II, Artemis. Crew: 3 Human. Reactor 8."
 */
export function hullDetail(
  hull: {
    reactor: number;
    weapons: readonly string[];
    crew: readonly { kin: string }[];
    kits: Readonly<Partial<Record<string, SummaryKit>>>;
    augments: readonly string[];
  },
  names: HullNames,
): string {
  const parts: string[] = [];
  if (hull.weapons.length > 0) parts.push(`Weapons: ${hull.weapons.map(names.weapon).join(", ")}.`);
  const bay = hull.kits.drones;
  const drones = bay ? (bay.loadout ?? (bay.target ? [bay.target] : [])) : [];
  if (drones.length > 0) parts.push(`Drones: ${drones.map(names.drone).join(", ")}.`);
  const kits: string[] = [];
  for (const [kit, row] of Object.entries(hull.kits)) {
    if (!row) continue;
    const name = kit === "artillery" && row.weapon ? names.weapon(row.weapon) : names.kit(kit);
    kits.push(`${name} ${row.level}`);
  }
  if (kits.length > 0) parts.push(`Systems: ${kits.join(", ")}.`);
  if (hull.augments.length > 0)
    parts.push(`Augments: ${hull.augments.map(names.augment).join(", ")}.`);
  const crew = new Map<string, number>();
  for (const member of hull.crew) crew.set(member.kin, (crew.get(member.kin) ?? 0) + 1);
  if (crew.size > 0)
    parts.push(`Crew: ${[...crew].map(([kin, n]) => `${n} ${names.kin(kin)}`).join(", ")}.`);
  parts.push(`Reactor ${hull.reactor}.`);
  return parts.join(" ");
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
