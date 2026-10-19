import {
  DOMImplementation,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import { prettyXml } from "./format.ts";
import type { HullDef } from "./types.ts";

/**
 * Writes ship blueprints the way ftl.dat's data/blueprints.xml does, so packFromFtl reads the stand-in with the same
 * code as a real archive. Every field is one ftl.dat carries; nothing here is stand-in only.
 */
export function emitFtlShips(hulls: readonly HullDef[]): string {
  const doc = new DOMImplementation().createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("could not create the FTL root");
  for (const hull of hulls) root.appendChild(shipElement(doc, hull));
  return prettyXml(new XMLSerializer().serializeToString(doc));
}

function element(doc: XmlDocument, tag: string, attrs: Record<string, string> = {}): XmlElement {
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function leaf(doc: XmlDocument, tag: string, text: string | number): XmlElement {
  const node = doc.createElement(tag);
  node.appendChild(doc.createTextNode(String(text)));
  return node;
}

function shipElement(doc: XmlDocument, hull: HullDef): XmlElement {
  const attrs: Record<string, string> = { name: hull.id, layout: hull.layout };
  if (hull.img) attrs.img = hull.img;
  const ship = element(doc, "shipBlueprint", attrs);
  if (hull.cruiser) ship.appendChild(leaf(doc, "class", hull.cruiser));
  ship.appendChild(leaf(doc, "name", hull.name));
  if (hull.unlock) ship.appendChild(leaf(doc, "unlock", hull.unlock));
  if (hull.quote) ship.appendChild(leaf(doc, "desc", hull.quote));
  if (hull.minSector != null) ship.appendChild(leaf(doc, "minSector", hull.minSector));
  if (hull.maxSector != null) ship.appendChild(leaf(doc, "maxSector", hull.maxSector));

  const systems = element(doc, "systemList");
  for (const item of hull.installs ?? []) {
    const install: Record<string, string> = { power: String(item.power) };
    if (item.max != null) install.max = String(item.max);
    if (item.room != null) install.room = String(item.room);
    install.start = item.start ? "true" : "false";
    if (item.img) install.img = item.img;
    if (item.weapon) install.weapon = item.weapon;
    systems.appendChild(element(doc, item.id, install));
  }
  ship.appendChild(systems);

  if (hull.weaponSlots != null) ship.appendChild(leaf(doc, "weaponSlots", hull.weaponSlots));
  if (hull.droneSlots != null) ship.appendChild(leaf(doc, "droneSlots", hull.droneSlots));

  const guns: Record<string, string> = {};
  if (hull.weaponCount != null) guns.count = String(hull.weaponCount);
  guns.missiles = String(hull.missiles);
  if (hull.weaponLoad) guns.load = hull.weaponLoad;
  const weapons = element(doc, "weaponList", guns);
  for (const id of hull.weapons) weapons.appendChild(element(doc, "weapon", { name: id }));
  ship.appendChild(weapons);

  const drones = hull.drones ?? [];
  if (drones.length > 0 || hull.droneLoad || hull.parts > 0) {
    const list: Record<string, string> = {};
    if (hull.droneCount != null) list.count = String(hull.droneCount);
    list.drones = String(hull.parts);
    if (hull.droneLoad) list.load = hull.droneLoad;
    const node = element(doc, "droneList", list);
    for (const id of drones) node.appendChild(element(doc, "drone", { name: id }));
    ship.appendChild(node);
  }

  for (const id of hull.augments) ship.appendChild(element(doc, "aug", { name: id }));
  if (hull.health != null)
    ship.appendChild(element(doc, "health", { amount: String(hull.health) }));
  ship.appendChild(element(doc, "maxPower", { amount: String(hull.reactor) }));
  for (const row of hull.crewCounts ?? []) {
    const crew: Record<string, string> = { amount: String(row.amount) };
    if (row.max != null) crew.max = String(row.max);
    crew.class = row.class;
    ship.appendChild(element(doc, "crewCount", crew));
  }
  if (hull.shield) ship.appendChild(leaf(doc, "shieldImage", hull.shield));
  if (hull.cloak) ship.appendChild(leaf(doc, "cloakImage", hull.cloak));
  if (hull.floor) ship.appendChild(leaf(doc, "floorImage", hull.floor));
  return ship;
}
