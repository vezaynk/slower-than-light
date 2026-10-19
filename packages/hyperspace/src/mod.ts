import {
  emitFtlShips,
  emitPack,
  packFromFtl,
  parsePack,
  prettyXml,
  type ContentPack,
  type CrewDef,
  type SystemDef,
} from "@stl/pack";
import {
  DOMImplementation,
  DOMParser,
  Node,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const implementation = new DOMImplementation();
const serializer = new XMLSerializer();

/**
 * xmldom keeps parsing after a warning or a non-fatal error unless this throws.
 * A mod file that is not well-formed fails the load.
 */
const parser = new DOMParser({
  onError(level, message) {
    throw new Error(`${level}: ${message}`);
  },
});

/**
 * Writes one mod file from a loaded pack.
 * Record tags match the campaign file. Facts, names, crew hire text, and system detail are kept.
 * A Hyperspace extension file (custom systems, scripts) is a different document.
 */
export function emitMod(pack: ContentPack): string {
  const campaign = readXml(emitPack(pack));
  const source = campaign.documentElement;
  if (!source || source.tagName !== "FTL") {
    throw new Error("Campaign writer did not return an FTL document.");
  }
  const doc = implementation.createDocument(null, "pack", null);
  const root = doc.documentElement;
  if (!root) throw new Error("Mod document has no root.");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  if (pack.facts) root.appendChild(doc.createElement("facts"));
  const names = namesElement(doc, pack.names);
  if (names) root.appendChild(names);
  for (const child of elementChildren(source)) {
    if (
      child.tagName === "crew" &&
      !elementChildren(child).some((node) => node.tagName === "race")
    ) {
      continue;
    }
    root.appendChild(doc.importNode(child, true));
  }
  // Ships are ftl.dat blueprints, the same <shipBlueprint> a real archive writes.
  if (pack.hulls?.length) {
    const ships = readXml(emitFtlShips(pack.hulls)).documentElement;
    if (ships)
      for (const child of elementChildren(ships)) root.appendChild(doc.importNode(child, true));
  }
  writeCrewIdentity(root, pack.crew, doc);
  writeSystemDetail(root, pack.systems, doc);
  return prettyXml(serializer.serializeToString(doc));
}

/**
 * Reads a mod file written by emitMod.
 * A campaign `<FTL>` file and a Hyperspace extension file are refused.
 * Empty record lists stay off the pack.
 */
export function packFromMod(xml: string): ContentPack {
  const doc = readXml(xml);
  const root = doc.documentElement;
  if (!root) throw new Error("Mod XML is not well-formed: the document has no root element.");
  assertPackRoot(root.tagName);
  const parsed = parsePack(xml);
  const ships = packFromFtl([{ path: "pack.xml", xml }]).hulls;
  if (ships) parsed.hulls = ships;
  readCrewIdentity(root, parsed.crew);
  readSystemDetail(root, parsed.systems);
  const pack = omitEmpty(parsed);
  if (elementChildren(root).some((node) => node.tagName === "facts")) pack.facts = true;
  const names = readNames(elementChildren(root).find((node) => node.tagName === "names"));
  if (names) pack.names = names;
  return pack;
}

function assertPackRoot(tag: string): void {
  if (tag === "pack") return;
  if (tag === "FTL") throw new Error("Campaign XML is not a pack mod.");
  if (tag === "hyperspace") throw new Error("Hyperspace extension XML is not a pack mod.");
  throw new Error(`A pack mod starts with <pack>, found <${tag}>.`);
}

function omitEmpty(parsed: ContentPack): ContentPack {
  const pack: ContentPack = {};
  const crew = keep(parsed.crew);
  const weapons = keep(parsed.weapons);
  const augments = keep(parsed.augments);
  const drones = keep(parsed.drones);
  const systems = keep(parsed.systems);
  const hulls = keep(parsed.hulls);
  const sectors = keep(parsed.sectors);
  const stores = keep(parsed.stores);
  const tunes = keep(parsed.tunes);
  const events = keep(parsed.events);
  const lists = keep(parsed.lists);
  const empties = keep(parsed.empties);
  const factions = keep(parsed.factions);
  if (crew) pack.crew = crew;
  if (weapons) pack.weapons = weapons;
  if (augments) pack.augments = augments;
  if (drones) pack.drones = drones;
  if (systems) pack.systems = systems;
  if (hulls) pack.hulls = hulls;
  if (sectors) pack.sectors = sectors;
  if (stores) pack.stores = stores;
  if (tunes) pack.tunes = tunes;
  if (events) pack.events = events;
  if (lists) pack.lists = lists;
  if (empties) pack.empties = empties;
  if (parsed.rewards) pack.rewards = parsed.rewards;
  if (factions) pack.factions = factions;
  return pack;
}

function keep<T>(rows: T[] | undefined): T[] | undefined {
  return rows && rows.length > 0 ? rows : undefined;
}

function writeCrewIdentity(root: XmlElement, crew: CrewDef[] | undefined, doc: XmlDocument): void {
  if (!crew) return;
  for (const node of tagged(root, "race")) {
    const row = crew.find((item) => item.id === node.getAttribute("name")?.trim());
    if (!row) continue;
    if (row.detail) appendText(node, doc, "desc", row.detail);
    if (row.cost != null) appendText(node, doc, "cost", String(row.cost));
  }
}

function readCrewIdentity(root: XmlElement, crew: CrewDef[] | undefined): void {
  if (!crew) return;
  for (const node of tagged(root, "race")) {
    const row = crew.find((item) => item.id === node.getAttribute("name")?.trim());
    if (!row) continue;
    const detail = textOf(node, "desc");
    if (detail) row.detail = detail;
    const cost = numOf(node, "cost");
    if (cost != null) row.cost = cost;
  }
}

function writeSystemDetail(
  root: XmlElement,
  systems: SystemDef[] | undefined,
  doc: XmlDocument,
): void {
  if (!systems) return;
  for (const node of tagged(root, "systemBlueprint")) {
    const row = systems.find((item) => item.id === node.getAttribute("name")?.trim());
    if (row?.detail) appendText(node, doc, "desc", row.detail);
  }
}

function readSystemDetail(root: XmlElement, systems: SystemDef[] | undefined): void {
  if (!systems) return;
  for (const node of tagged(root, "systemBlueprint")) {
    const row = systems.find((item) => item.id === node.getAttribute("name")?.trim());
    const detail = row ? textOf(node, "desc") : undefined;
    if (row && detail) row.detail = detail;
  }
}

function namesElement(doc: XmlDocument, names: ContentPack["names"]): XmlElement | undefined {
  if (!names) return undefined;
  const pool = names.pool.map((item) => item.trim()).filter((item) => item.length > 0);
  const syllables = names.syllables.map((item) => item.trim()).filter((item) => item.length > 0);
  if (pool.length === 0 && syllables.length === 0) return undefined;
  const node = doc.createElement("names");
  for (const item of pool) appendText(node, doc, "pool", item);
  for (const item of syllables) appendText(node, doc, "syllable", item);
  return node;
}

function readNames(node: XmlElement | undefined): ContentPack["names"] | undefined {
  if (!node) return undefined;
  const pool: string[] = [];
  const syllables: string[] = [];
  for (const item of elementChildren(node)) {
    const text = ownText(item).trim();
    if (!text) continue;
    if (item.tagName === "pool") pool.push(text);
    if (item.tagName === "syllable") syllables.push(text);
  }
  if (pool.length === 0 && syllables.length === 0) return undefined;
  return { pool, syllables };
}

function appendText(parent: XmlElement, doc: XmlDocument, tag: string, text: string): void {
  const node = doc.createElement(tag);
  node.appendChild(doc.createTextNode(text));
  parent.appendChild(node);
}

function readXml(xml: string): XmlDocument {
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Mod XML is not well-formed: ${detail}`);
  }
}

function elementChildren(node: XmlElement): XmlElement[] {
  const found: XmlElement[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child?.nodeType === Node.ELEMENT_NODE) found.push(child as XmlElement);
  }
  return found;
}

function tagged(node: XmlElement, tag: string): XmlElement[] {
  const list = node.getElementsByTagName(tag);
  const found: XmlElement[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list.item(i);
    if (item) found.push(item);
  }
  return found;
}

function textOf(node: XmlElement, tag: string): string | undefined {
  const found = elementChildren(node).find((item) => item.tagName === tag);
  const text = found ? ownText(found).trim() : "";
  return text ? text : undefined;
}

function numOf(node: XmlElement, tag: string): number | undefined {
  const text = textOf(node, tag);
  if (text == null) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function ownText(node: XmlElement): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const item = node.childNodes.item(i);
    if (!item) continue;
    if (item.nodeType === Node.TEXT_NODE || item.nodeType === Node.CDATA_SECTION_NODE) {
      text += item.nodeValue ?? "";
    }
  }
  return text;
}
