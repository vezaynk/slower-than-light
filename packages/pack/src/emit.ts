import { DOMImplementation, XMLSerializer, type Document as XmlDocument, type Element as XmlElement } from "@xmldom/xmldom";
import type { AugmentDef, ContentPack, CrewDef, DroneDef, HullDef, SectorDef, StoreDef, SystemDef, TuneDef, WeaponBlueprint, WeaponKind } from "./types.ts";

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

const HEADER = `
  Base pack written from the loaded crew, weapon, augment, drone, system, hull, sector, store, and tune records.
  Race tags are Hyperspace names. Weapon tags are FTL blueprint names.
  Augment tags are the listing id, title, description, and store cost.
  Drone tags are the listing id, title, and store cost.
  System tags are the listing id, title, store cost, and install slot.
  Hull tags are the ship id, class, layout letter, and starting loadout. Room tiles stay in code.
  Sector tags are the sector id, title, colour group, and page notes. Depth gates stay in code.
  Store tags are the store id, title, section size, weapon shelf, section kinds, and stock lines.
  Tune tags are the system id, the level a purchase installs, and the scrap cost of each owned level.
  sp is shield layers pierced. power is reactor bars.
  shotGap is the seconds between shots in one volley. FTL keeps that delay in the animation.
  A negative oxygenChangeSpeed means the race drains air. The air model does not use the magnitude.
`;

const implementation = new DOMImplementation();
const serializer = new XMLSerializer();

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
  const doc = implementation.createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("pack document has no root");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  doc.insertBefore(doc.createTextNode("\n"), root);
  doc.insertBefore(doc.createComment(HEADER), root);
  doc.insertBefore(doc.createTextNode("\n"), root);

  const crew = doc.createElement("crew");
  for (const race of pack.crew ?? []) add(crew, raceElement(doc, race), 2);
  end(crew, 1);
  add(root, crew, 1);
  for (const weapon of pack.weapons ?? []) add(root, weaponElement(doc, weapon), 1);
  for (const augment of pack.augments ?? []) add(root, augmentElement(doc, augment), 1);
  for (const drone of pack.drones ?? []) add(root, droneElement(doc, drone), 1);
  for (const system of pack.systems ?? []) add(root, systemElement(doc, system), 1);
  for (const hull of pack.hulls ?? []) add(root, hullElement(doc, hull), 1);
  for (const sector of pack.sectors ?? []) add(root, sectorElement(doc, sector), 1);
  for (const store of pack.stores ?? []) add(root, storeElement(doc, store), 1);
  for (const tune of pack.tunes ?? []) add(root, tuneElement(doc, tune), 1);
  end(root, 0);
  const xml = serializer.serializeToString(doc);
  return xml.endsWith("\n") ? xml : `${xml}\n`;
}

function tuneElement(doc: XmlDocument, tune: TuneDef): XmlElement {
  const node = element(doc, "systemTune", { name: tune.id });
  add(node, leaf(doc, "start", tune.start), 2);
  for (const step of tune.costs) {
    const upgrade = element(doc, "upgrade", { level: num(step.level) });
    upgrade.appendChild(doc.createTextNode(num(step.cost)));
    add(node, upgrade, 2);
  }
  end(node, 1);
  return node;
}

function storeElement(doc: XmlDocument, store: StoreDef): XmlElement {
  const node = element(doc, "storeBlueprint", { name: store.id });
  add(node, leaf(doc, "title", store.name), 2);
  add(node, leaf(doc, "slot", store.slot), 2);
  add(node, leaf(doc, "weapons", store.weapons), 2);
  for (const section of store.sections) add(node, leaf(doc, "section", section), 2);
  for (const line of store.lines) {
    const stock = element(doc, "stock", {
      id: line.id,
      kind: line.kind,
      min: num(line.min),
      max: num(line.max),
    });
    add(stock, leaf(doc, "title", line.name), 3);
    add(stock, leaf(doc, "cost", line.cost), 3);
    end(stock, 2);
    add(node, stock, 2);
  }
  end(node, 1);
  return node;
}

function sectorElement(doc: XmlDocument, sector: SectorDef): XmlElement {
  const node = element(doc, "sectorDescription", { name: sector.id });
  add(node, leaf(doc, "title", sector.name), 2);
  add(node, leaf(doc, "type", sector.group), 2);
  for (const note of sector.notes) add(node, leaf(doc, "note", note), 2);
  end(node, 1);
  return node;
}

function hullElement(doc: XmlDocument, hull: HullDef): XmlElement {
  const node = element(doc, "shipBlueprint", { name: hull.id, layout: hull.layout });
  add(node, leaf(doc, "class", hull.cruiser), 2);
  add(node, leaf(doc, "title", hull.name), 2);
  add(node, leaf(doc, "desc", hull.quote), 2);
  add(node, leaf(doc, "unlock", hull.unlock), 2);
  add(node, leaf(doc, "source", hull.source), 2);
  add(node, leaf(doc, "reactor", hull.reactor), 2);
  add(node, leaf(doc, "fuel", hull.fuel), 2);
  add(node, leaf(doc, "missiles", hull.missiles), 2);
  add(node, leaf(doc, "parts", hull.parts), 2);

  const systems = doc.createElement("systemList");
  for (const [id, pair] of Object.entries(hull.systems)) {
    const system = element(doc, "system", { name: id });
    add(system, leaf(doc, "level", pair[0]), 4);
    add(system, leaf(doc, "power", pair[1]), 4);
    end(system, 3);
    add(systems, system, 3);
  }
  end(systems, 2);
  add(node, systems, 2);

  const weapons = doc.createElement("weaponList");
  for (const id of hull.weapons) add(weapons, leaf(doc, "weapon", id), 3);
  end(weapons, 2);
  add(node, weapons, 2);

  const crew = doc.createElement("crewList");
  for (const seat of hull.crew) add(crew, element(doc, "crewMember", { kin: seat.kin, room: seat.room }), 3);
  end(crew, 2);
  add(node, crew, 2);

  const kits = doc.createElement("kitList");
  for (const [id, kit] of Object.entries(hull.kits)) {
    const kitNode = element(doc, "kit", { name: id });
    add(kitNode, leaf(doc, "level", kit.level), 4);
    add(kitNode, leaf(doc, "power", kit.power), 4);
    if (kit.target != null) add(kitNode, leaf(doc, "target", kit.target), 4);
    if (kit.loadout) {
      const loadout = doc.createElement("loadout");
      for (const schematic of kit.loadout) add(loadout, leaf(doc, "schematic", schematic), 5);
      end(loadout, 4);
      add(kitNode, loadout, 4);
    }
    if (kit.on !== undefined) add(kitNode, leaf(doc, "on", kit.on), 4);
    end(kitNode, 3);
    add(kits, kitNode, 3);
  }
  end(kits, 2);
  add(node, kits, 2);

  const augments = doc.createElement("augmentList");
  for (const id of hull.augments) add(augments, leaf(doc, "augment", id), 3);
  end(augments, 2);
  add(node, augments, 2);

  const unfitted = doc.createElement("unfitted");
  for (const label of hull.unfitted) add(unfitted, leaf(doc, "item", label), 3);
  end(unfitted, 2);
  add(node, unfitted, 2);

  end(node, 1);
  return node;
}

function systemElement(doc: XmlDocument, system: SystemDef): XmlElement {
  const node = element(doc, "systemBlueprint", { name: system.id });
  add(node, leaf(doc, "title", system.name), 2);
  add(node, leaf(doc, "cost", system.cost), 2);
  add(node, leaf(doc, "slot", system.slot), 2);
  end(node, 1);
  return node;
}

function droneElement(doc: XmlDocument, drone: DroneDef): XmlElement {
  const node = element(doc, "droneBlueprint", { name: drone.id });
  add(node, leaf(doc, "title", drone.name), 2);
  add(node, leaf(doc, "cost", drone.cost), 2);
  end(node, 1);
  return node;
}

function augmentElement(doc: XmlDocument, augment: AugmentDef): XmlElement {
  const node = element(doc, "augBlueprint", { name: augment.id });
  add(node, leaf(doc, "title", augment.name), 2);
  add(node, leaf(doc, "desc", augment.detail), 2);
  add(node, leaf(doc, "cost", augment.cost), 2);
  end(node, 1);
  return node;
}

function weaponElement(doc: XmlDocument, weapon: WeaponBlueprint): XmlElement {
  const node = element(doc, "weaponBlueprint", { name: weapon.id });
  add(node, leaf(doc, "type", TYPE[weapon.kind]), 2);
  add(node, leaf(doc, "title", weapon.name), 2);
  add(node, leaf(doc, "tooltip", weapon.blurb), 2);
  add(node, leaf(doc, "damage", weapon.damage), 2);
  add(node, leaf(doc, "shots", weapon.shots), 2);
  add(node, leaf(doc, "power", weapon.power), 2);
  add(node, leaf(doc, "cooldown", weapon.charge), 2);
  add(node, leaf(doc, "cost", weapon.price), 2);
  add(node, leaf(doc, "fireChance", tenths(weapon.fire)), 2);
  add(node, leaf(doc, "breachChance", tenths(weapon.breach)), 2);
  add(node, leaf(doc, "ion", weapon.ion), 2);
  add(node, leaf(doc, "shotGap", weapon.gap), 2);
  if (weapon.ammo) add(node, leaf(doc, "missiles", 1), 2);
  if (weapon.lengthTiles != null) add(node, leaf(doc, "length", scaled(weapon.lengthTiles, 45)), 2);
  if (weapon.speed != null) add(node, leaf(doc, "speed", weapon.speed), 2);
  if (weapon.crewDamage != null) add(node, leaf(doc, "crewDamage", weapon.crewDamage), 2);
  if (weapon.pierce != null) add(node, leaf(doc, "sp", weapon.pierce), 2);
  end(node, 1);
  return node;
}

function raceElement(doc: XmlDocument, race: CrewDef): XmlElement {
  const node = element(doc, "race", { name: race.id });
  add(node, leaf(doc, "title", race.name), 3);
  add(node, leaf(doc, "maxHealth", race.hp), 3);
  add(node, leaf(doc, "moveSpeedMultiplier", race.move), 3);
  add(node, leaf(doc, "repairSpeed", race.repair), 3);
  add(node, leaf(doc, "damageMultiplier", race.fight), 3);
  add(node, leaf(doc, "suffocationModifier", race.suffocate), 3);
  add(node, leaf(doc, "fireDamageMultiplier", race.fireTaken), 3);
  add(node, leaf(doc, "fireRepairMultiplier", race.fireRepairMultiplier), 3);
  add(node, leaf(doc, "bonusPower", race.bonusPower), 3);
  add(node, leaf(doc, "hasDeathExplosion", race.hasDeathExplosion), 3);
  add(node, leaf(doc, "oxygenChangeSpeed", race.drainsOxygen ? OXYGEN_DRAIN : 0), 3);
  add(node, leaf(doc, "detectsLifeforms", race.detectsLifeforms), 3);
  add(node, leaf(doc, "resistsMindControl", race.resistsMindControl), 3);
  const power = doc.createElement("powerEffect");
  add(power, leaf(doc, "lockdown", race.lockdown), 4);
  add(power, leaf(doc, "cooldown", race.lockCooldown), 4);
  end(power, 3);
  add(node, power, 3);
  end(node, 2);
  return node;
}

function element(doc: XmlDocument, tag: string, attrs: Record<string, string>): XmlElement {
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function leaf(doc: XmlDocument, tag: string, value: string | number | boolean): XmlElement {
  const node = doc.createElement(tag);
  const text = typeof value === "number" ? num(value) : String(value);
  node.appendChild(doc.createTextNode(text));
  return node;
}

function add(parent: XmlElement, child: XmlElement, depth: number): void {
  parent.appendChild(owner(parent).createTextNode(`\n${"  ".repeat(depth)}`));
  parent.appendChild(child);
}

function end(parent: XmlElement, depth: number): void {
  parent.appendChild(owner(parent).createTextNode(`\n${"  ".repeat(depth)}`));
}

function owner(node: XmlElement): XmlDocument {
  const doc = node.ownerDocument;
  if (!doc) throw new Error("pack element has no document");
  return doc;
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
