import type { WeaponKind } from "../types.ts";
import type { AugmentDef, ContentPack, CrewDef, DroneDef, HullDef, SectorDef, StoreDef, SystemDef, TuneDef, WeaponBlueprint } from "./types.ts";

const TYPE: Record<WeaponKind, string> = {
  laser: "LASER",
  missile: "MISSILE",
  beam: "BEAM",
  bomb: "BOMB",
  ion: "ION",
  flak: "BURST",
};

/** Hyperspace's anaerobic sample uses this. Any negative value sets drainsOxygen. */
const OXYGEN_DRAIN = -0.5;

/**
 * Writes the pack as FTL weapon blueprints, Hyperspace race tags, and the store listings.
 * shotGap is the seconds between shots in one volley. FTL keeps that delay in the animation.
 * A negative oxygenChangeSpeed means the race drains air. The magnitude is not the vent rate.
 * sp is shield layers pierced. power is reactor bars.
 * An augment listing is its id, title, description, and store cost.
 * A drone listing is its id, title, and store cost.
 * A system listing is its id, title, store cost, and whether it installs as a system or a kit.
 * A hull is its id, class, layout letter, name, and starting loadout. Room tiles are not in the document.
 * A sector is its id, title, colour group, and page notes. Depth gates stay in the chart code.
 * A store is its id, title, section size, weapon shelf, section kinds, and stock lines.
 * A tune is its system id, the level a purchase installs, and the scrap cost of each owned level.
 * Section count, the hull-repair rate, and the reactor formula stay in code.
 */
export function emitPack(pack: ContentPack): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!--`,
    `  Base pack written from the loaded crew, weapon, augment, drone, system, hull, sector, store, and tune records.`,
    `  Race tags are Hyperspace names. Weapon tags are FTL blueprint names.`,
    `  Augment tags are the listing id, title, description, and store cost.`,
    `  Drone tags are the listing id, title, and store cost.`,
    `  System tags are the listing id, title, store cost, and install slot.`,
    `  Hull tags are the ship id, class, layout letter, and starting loadout. Room tiles stay in code.`,
    `  Sector tags are the sector id, title, colour group, and page notes. Depth gates stay in code.`,
    `  Store tags are the store id, title, section size, weapon shelf, section kinds, and stock lines.`,
    `  Tune tags are the system id, the level a purchase installs, and the scrap cost of each owned level.`,
    `  sp is shield layers pierced. power is reactor bars.`,
    `  shotGap is the seconds between shots in one volley. FTL keeps that delay in the animation.`,
    `  A negative oxygenChangeSpeed means the race drains air. The air model does not use the magnitude.`,
    `-->`,
    `<FTL>`,
    `  <crew>`,
  ];
  for (const race of pack.crew ?? []) {
    lines.push(`    <race name="${escAttr(race.id)}">`);
    lines.push(el(3, "title", race.name));
    lines.push(el(3, "maxHealth", race.hp));
    lines.push(el(3, "moveSpeedMultiplier", race.move));
    lines.push(el(3, "repairSpeed", race.repair));
    lines.push(el(3, "damageMultiplier", race.fight));
    lines.push(el(3, "suffocationModifier", race.suffocate));
    lines.push(el(3, "fireDamageMultiplier", race.fireTaken));
    lines.push(el(3, "fireRepairMultiplier", race.fireRepairMultiplier));
    lines.push(el(3, "bonusPower", race.bonusPower));
    lines.push(el(3, "hasDeathExplosion", race.hasDeathExplosion));
    lines.push(el(3, "oxygenChangeSpeed", race.drainsOxygen ? OXYGEN_DRAIN : 0));
    lines.push(el(3, "detectsLifeforms", race.detectsLifeforms));
    lines.push(el(3, "resistsMindControl", race.resistsMindControl));
    lines.push(`      <powerEffect>`);
    lines.push(el(4, "lockdown", race.lockdown));
    lines.push(el(4, "cooldown", race.lockCooldown));
    lines.push(`      </powerEffect>`);
    lines.push(`    </race>`);
  }
  lines.push(`  </crew>`);
  for (const weapon of pack.weapons ?? []) lines.push(...weaponXml(weapon));
  for (const augment of pack.augments ?? []) lines.push(...augmentXml(augment));
  for (const drone of pack.drones ?? []) lines.push(...droneXml(drone));
  for (const system of pack.systems ?? []) lines.push(...systemXml(system));
  for (const hull of pack.hulls ?? []) lines.push(...hullXml(hull));
  for (const sector of pack.sectors ?? []) lines.push(...sectorXml(sector));
  for (const store of pack.stores ?? []) lines.push(...storeXml(store));
  for (const tune of pack.tunes ?? []) lines.push(...tuneXml(tune));
  lines.push(`</FTL>`);
  return lines.join("\n") + "\n";
}

function tuneXml(tune: TuneDef): string[] {
  const lines = [`  <systemTune name="${escAttr(tune.id)}">`];
  lines.push(el(2, "start", tune.start));
  for (const step of tune.costs) {
    lines.push(`    <upgrade level="${num(step.level)}">${num(step.cost)}</upgrade>`);
  }
  lines.push(`  </systemTune>`);
  return lines;
}

function storeXml(store: StoreDef): string[] {
  const lines = [`  <storeBlueprint name="${escAttr(store.id)}">`];
  lines.push(el(2, "title", store.name));
  lines.push(el(2, "slot", store.slot));
  lines.push(el(2, "weapons", store.weapons));
  for (const section of store.sections) lines.push(el(2, "section", section));
  for (const line of store.lines) {
    lines.push(
      `    <stock id="${escAttr(line.id)}" kind="${escAttr(line.kind)}" min="${num(line.min)}" max="${num(line.max)}">`,
    );
    lines.push(el(3, "title", line.name));
    lines.push(el(3, "cost", line.cost));
    lines.push(`    </stock>`);
  }
  lines.push(`  </storeBlueprint>`);
  return lines;
}

function sectorXml(sector: SectorDef): string[] {
  const lines = [`  <sectorDescription name="${escAttr(sector.id)}">`];
  lines.push(el(2, "title", sector.name));
  lines.push(el(2, "type", sector.group));
  for (const note of sector.notes) lines.push(el(2, "note", note));
  lines.push(`  </sectorDescription>`);
  return lines;
}

function hullXml(hull: HullDef): string[] {
  const lines = [`  <shipBlueprint name="${escAttr(hull.id)}" layout="${escAttr(hull.layout)}">`];
  lines.push(el(2, "class", hull.cruiser));
  lines.push(el(2, "title", hull.name));
  lines.push(el(2, "desc", hull.quote));
  lines.push(el(2, "unlock", hull.unlock));
  lines.push(el(2, "source", hull.source));
  lines.push(el(2, "reactor", hull.reactor));
  lines.push(el(2, "fuel", hull.fuel));
  lines.push(el(2, "missiles", hull.missiles));
  lines.push(el(2, "parts", hull.parts));
  lines.push(`    <systemList>`);
  for (const [id, pair] of Object.entries(hull.systems)) {
    lines.push(`      <system name="${escAttr(id)}">`);
    lines.push(el(4, "level", pair[0]));
    lines.push(el(4, "power", pair[1]));
    lines.push(`      </system>`);
  }
  lines.push(`    </systemList>`);
  lines.push(`    <weaponList>`);
  for (const id of hull.weapons) lines.push(el(3, "weapon", id));
  lines.push(`    </weaponList>`);
  lines.push(`    <crewList>`);
  for (const seat of hull.crew) {
    lines.push(`      <crewMember kin="${escAttr(seat.kin)}" room="${escAttr(seat.room)}"/>`);
  }
  lines.push(`    </crewList>`);
  lines.push(`    <kitList>`);
  for (const [id, kit] of Object.entries(hull.kits)) {
    lines.push(`      <kit name="${escAttr(id)}">`);
    lines.push(el(4, "level", kit.level));
    lines.push(el(4, "power", kit.power));
    if (kit.target != null) lines.push(el(4, "target", kit.target));
    if (kit.loadout) {
      lines.push(`        <loadout>`);
      for (const schematic of kit.loadout) lines.push(el(5, "schematic", schematic));
      lines.push(`        </loadout>`);
    }
    if (kit.on !== undefined) lines.push(el(4, "on", kit.on));
    lines.push(`      </kit>`);
  }
  lines.push(`    </kitList>`);
  lines.push(`    <augmentList>`);
  for (const id of hull.augments) lines.push(el(3, "augment", id));
  lines.push(`    </augmentList>`);
  lines.push(`    <unfitted>`);
  for (const label of hull.unfitted) lines.push(el(3, "item", label));
  lines.push(`    </unfitted>`);
  lines.push(`  </shipBlueprint>`);
  return lines;
}

function systemXml(system: SystemDef): string[] {
  return [
    `  <systemBlueprint name="${escAttr(system.id)}">`,
    el(2, "title", system.name),
    el(2, "cost", system.cost),
    el(2, "slot", system.slot),
    `  </systemBlueprint>`,
  ];
}

function droneXml(drone: DroneDef): string[] {
  return [
    `  <droneBlueprint name="${escAttr(drone.id)}">`,
    el(2, "title", drone.name),
    el(2, "cost", drone.cost),
    `  </droneBlueprint>`,
  ];
}

function augmentXml(augment: AugmentDef): string[] {
  return [
    `  <augBlueprint name="${escAttr(augment.id)}">`,
    el(2, "title", augment.name),
    el(2, "desc", augment.detail),
    el(2, "cost", augment.cost),
    `  </augBlueprint>`,
  ];
}

function weaponXml(weapon: WeaponBlueprint): string[] {
  const lines = [`  <weaponBlueprint name="${escAttr(weapon.id)}">`];
  lines.push(el(2, "type", TYPE[weapon.kind]));
  lines.push(el(2, "title", weapon.name));
  lines.push(el(2, "tooltip", weapon.blurb));
  lines.push(el(2, "damage", weapon.damage));
  lines.push(el(2, "shots", weapon.shots));
  lines.push(el(2, "power", weapon.power));
  lines.push(el(2, "cooldown", weapon.charge));
  lines.push(el(2, "cost", weapon.price));
  lines.push(el(2, "fireChance", tenths(weapon.fire)));
  lines.push(el(2, "breachChance", tenths(weapon.breach)));
  lines.push(el(2, "ion", weapon.ion));
  lines.push(el(2, "shotGap", weapon.gap));
  if (weapon.ammo) lines.push(el(2, "missiles", 1));
  if (weapon.lengthTiles != null) lines.push(el(2, "length", scaled(weapon.lengthTiles, 45)));
  if (weapon.speed != null) lines.push(el(2, "speed", weapon.speed));
  if (weapon.crewDamage != null) lines.push(el(2, "crewDamage", weapon.crewDamage));
  if (weapon.pierce != null) lines.push(el(2, "sp", weapon.pierce));
  lines.push(`  </weaponBlueprint>`);
  return lines;
}

function el(depth: number, tag: string, value: string | number | boolean): string {
  return `${"  ".repeat(depth)}<${tag}>${esc(value)}</${tag}>`;
}

function esc(value: string | number | boolean): string {
  const text = typeof value === "number" ? num(value) : String(value);
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(value: string): string {
  return esc(value).replace(/"/g, "&quot;");
}

function num(value: number): string {
  if (Object.is(value, -0)) return "0";
  return String(value);
}

/** FTL stores fire and breach chance in tenths. */
function tenths(fraction: number): string {
  return scaled(fraction, 10);
}

/** A decimal that divides back to the same number. */
function scaled(value: number, factor: number): string {
  const raw = value * factor;
  const text = num(raw);
  if (Number(text) / factor === value) return text;
  for (let digits = 0; digits <= 12; digits++) {
    const candidate = raw.toFixed(digits);
    if (Number(candidate) / factor === value) return candidate;
  }
  return text;
}
