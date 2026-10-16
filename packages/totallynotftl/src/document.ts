import {
  DOMImplementation,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import { allCrew, type CrewDef, type TuneDef } from "@stl/pack";
import formatXml from "xml-formatter";
import { loadSources, type StandInSources, type SystemRow, type WeaponRow } from "./sources.ts";

const TYPE: Record<WeaponRow["kind"], string> = {
  laser: "LASER",
  missile: "MISSILE",
  ion: "ION",
  beam: "BEAM",
  flak: "FLAK",
  bomb: "BOMB",
};

const implementation = new DOMImplementation();
const serializer = new XMLSerializer();

function percent(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

function leaf(doc: XmlDocument, parent: XmlElement, tag: string, value: string | number): void {
  const node = doc.createElement(tag);
  node.appendChild(doc.createTextNode(String(value)));
  parent.appendChild(node);
}

function pretty(xml: string): string {
  const formatted = formatXml(xml, {
    indentation: "  ",
    collapseContent: true,
    lineSeparator: "\n",
    whiteSpaceAtEndOfSelfclosingTag: false,
    forceSelfClosingEmptyTag: true,
  });
  return formatted.endsWith("\n") ? formatted : `${formatted}\n`;
}

function weaponFact(sources: StandInSources, row: WeaponRow): string {
  const kind = row.kind.charAt(0).toUpperCase() + row.kind.slice(1);
  const bits = [
    `${kind}.`,
    `${row.power} power.`,
    `Charges in ${row.charge} seconds.`,
    `${row.shots} ${row.shots === 1 ? "shot" : "shots"} of ${row.damage} damage.`,
  ];
  if (row.ion) bits.push(`${row.ion} ion damage.`);
  if (row.gap) bits.push(`${row.gap} seconds between shots.`);
  if (row.fire) bits.push(`Fire chance ${percent(row.fire)}.`);
  if (row.breach) bits.push(`Breach chance ${percent(row.breach)}.`);
  const tiles = sources.beamTiles[row.id];
  if (tiles != null) bits.push(`Length ${tiles} ${tiles === 1 ? "tile" : "tiles"}.`);
  const speed = sources.beamSpeed[row.id];
  if (speed != null) bits.push(`Beam speed ${speed}.`);
  const crew = sources.beamCrew[row.id];
  if (crew != null) bits.push(`Crew damage ${crew}.`);
  if (row.ammo) bits.push("Uses a missile.");
  bits.push(row.price > 0 ? `Costs ${row.price} scrap.` : "Not sold.");
  return bits.join(" ");
}

function weaponElement(doc: XmlDocument, sources: StandInSources, row: WeaponRow): XmlElement {
  const node = doc.createElement("weaponBlueprint");
  node.setAttribute("name", row.id);
  leaf(doc, node, "type", TYPE[row.kind]);
  leaf(doc, node, "title", row.name);
  leaf(doc, node, "tooltip", weaponFact(sources, row));
  leaf(doc, node, "power", row.power);
  leaf(doc, node, "cooldown", row.charge);
  leaf(doc, node, "shots", row.shots);
  leaf(doc, node, "shotGap", row.gap);
  leaf(doc, node, "damage", row.damage);
  leaf(doc, node, "ion", row.ion);
  leaf(doc, node, "fireChance", row.fire * 10);
  leaf(doc, node, "breachChance", row.breach * 10);
  leaf(doc, node, "cost", row.price);
  const tiles = sources.beamTiles[row.id];
  if (tiles != null) leaf(doc, node, "length", tiles * 45);
  const speed = sources.beamSpeed[row.id];
  if (speed != null) leaf(doc, node, "speed", speed);
  const crew = sources.beamCrew[row.id];
  if (crew != null) leaf(doc, node, "crewDamage", crew);
  if (row.ammo) leaf(doc, node, "missiles", 1);
  return node;
}

function crewFact(row: CrewDef): string {
  const bits = [
    `Health ${row.hp}.`,
    `Move ×${row.move}.`,
    `Repair ×${row.repair}.`,
    `Combat ×${row.fight}.`,
    `Suffocation ×${row.suffocate}.`,
    `Fire damage taken ×${row.fireTaken}.`,
  ];
  if (row.bonusPower) bits.push(`Supplies ${row.bonusPower} power.`);
  if (row.hasDeathExplosion) bits.push("Explodes on death.");
  if (row.drainsOxygen) bits.push("Drains oxygen.");
  if (row.detectsLifeforms) bits.push("Detects lifeforms.");
  if (row.resistsMindControl) bits.push("Resists mind control.");
  if (row.lockdown) bits.push(`Locks a room for ${row.lockCooldown} seconds.`);
  if (row.fireRepairMultiplier !== 1) bits.push(`Fire repair ×${row.fireRepairMultiplier}.`);
  return bits.join(" ");
}

function systemFact(listing: SystemRow | undefined, tune: TuneDef | undefined): string {
  const bits = [
    (listing?.slot ?? "sys") === "kit" ? "Installs as a kit." : "Installs as a system.",
    `A purchase starts at level ${tune?.start ?? 1}.`,
    listing
      ? listing.cost > 0
        ? `Store cost ${listing.cost} scrap.`
        : "Not sold."
      : "Not on the store shelf.",
  ];
  for (const step of tune?.costs ?? [])
    bits.push(`Leaving level ${step.level} costs ${step.cost} scrap.`);
  return bits.join(" ");
}

function systemName(sources: StandInSources, id: string, listing: SystemRow | undefined): string {
  const tuneName: Record<string, string> = {
    engines: sources.tx("game.content.engines"),
    oxygen: sources.tx("game.content.oxygen"),
    weapons: sources.tx("game.content.weapons"),
    pilot: sources.tx("game.content.piloting"),
  };
  return listing?.name ?? tuneName[id] ?? id;
}

function systemElement(
  doc: XmlDocument,
  sources: StandInSources,
  id: string,
  listing: SystemRow | undefined,
  tune: TuneDef | undefined,
): XmlElement {
  const node = doc.createElement("systemBlueprint");
  node.setAttribute("name", id);
  leaf(doc, node, "title", systemName(sources, id, listing));
  leaf(doc, node, "desc", systemFact(listing, tune));
  leaf(doc, node, "cost", listing?.cost ?? 0);
  leaf(doc, node, "slot", listing?.slot ?? "sys");
  leaf(doc, node, "startPower", tune?.start ?? 1);
  const costs = doc.createElement("upgradeCost");
  for (const step of tune?.costs ?? []) leaf(doc, costs, "level", step.cost);
  node.appendChild(costs);
  return node;
}

function documentXml(sources: StandInSources, crew: readonly CrewDef[]): string {
  const doc = implementation.createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("stand-in document has no root");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  root.appendChild(doc.createElement("facts"));

  const names = doc.createElement("names");
  for (const name of sources.crewPool) leaf(doc, names, "pool", name);
  for (const part of sources.syllables) leaf(doc, names, "syllable", part);
  root.appendChild(names);

  for (const row of crew) {
    const node = doc.createElement("crewBlueprint");
    node.setAttribute("name", row.id);
    leaf(doc, node, "title", row.name);
    leaf(doc, node, "desc", crewFact(row));
    root.appendChild(node);
  }
  for (const row of sources.weapons) root.appendChild(weaponElement(doc, sources, row));
  for (const row of sources.augments) {
    const node = doc.createElement("augBlueprint");
    node.setAttribute("name", row.id);
    leaf(doc, node, "title", row.name);
    leaf(doc, node, "desc", row.detail);
    leaf(doc, node, "cost", row.cost);
    root.appendChild(node);
  }
  for (const row of sources.drones) {
    const node = doc.createElement("droneBlueprint");
    node.setAttribute("name", row.ref);
    leaf(doc, node, "title", row.name);
    leaf(doc, node, "cost", row.cost);
    root.appendChild(node);
  }
  const cited = new Map(sources.systems.map((row) => [row.ref, row]));
  const tunes = new Map(sources.tunes.map((row) => [row.id, row]));
  for (const id of new Set([...cited.keys(), ...tunes.keys()])) {
    root.appendChild(systemElement(doc, sources, id, cited.get(id), tunes.get(id)));
  }
  return pretty(serializer.serializeToString(doc));
}

/** FTL blueprint XML for the stand-in archive. Descriptions state the catalog numbers. */
export async function standInXml(): Promise<string> {
  return documentXml(await loadSources(), allCrew());
}
