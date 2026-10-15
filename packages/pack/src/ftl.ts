import type { Element as XmlElement } from "@xmldom/xmldom";
import type { ContentPack, SystemDef, SystemSlot, TuneDef, TuneStep } from "./types.ts";
import { attr, child, elements, numOf, readAugment, readDocument, readDrone, readWeapon, tagged, textOf } from "./parse.ts";

/**
 * FTL system ids that install into a kit slot. Artillery ids share that slot.
 * Every other system id installs as a system.
 */
const KIT_SYSTEMS = new Set(["battery", "cloaking", "clonebay", "drones", "hacking", "mind", "teleporter"]);

export type FtlBlueprintFile = {
  path: string;
  xml: string;
};

/**
 * Weapons, augments, drones, systems, and tunes from vanilla FTL blueprint XML.
 * Files are applied in order, and a later blueprint with the same id replaces the earlier one.
 * Crew, stores, hulls, sectors, and events stay out of this catalog.
 */
export function packFromFtl(documents: readonly FtlBlueprintFile[]): ContentPack {
  const weapons = new Catalog<NonNullable<ContentPack["weapons"]>[number]>();
  const augments = new Catalog<NonNullable<ContentPack["augments"]>[number]>();
  const drones = new Catalog<NonNullable<ContentPack["drones"]>[number]>();
  const systems = new Catalog<SystemDef>();
  const tunes = new Catalog<TuneDef>();
  for (const source of documents) {
    let doc;
    try {
      doc = readDocument(source.xml);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`${source.path}: ${detail}`);
    }
    for (const node of tagged(doc, "weaponBlueprint")) {
      const row = readWeapon(node);
      if (row) weapons.put(row);
    }
    for (const node of tagged(doc, "augBlueprint")) {
      const row = readAugment(node);
      if (row) augments.put(row);
    }
    for (const node of tagged(doc, "droneBlueprint")) {
      const row = readDrone(node);
      if (row) drones.put(row);
    }
    for (const node of tagged(doc, "systemBlueprint")) {
      const read = readFtlSystem(node);
      if (!read) continue;
      systems.put(read.system);
      tunes.put(read.tune);
    }
  }
  return {
    weapons: weapons.rows,
    augments: augments.rows,
    drones: drones.rows,
    systems: systems.rows,
    tunes: tunes.rows,
  };
}

class Catalog<T extends { id: string }> {
  readonly rows: T[] = [];
  private readonly index = new Map<string, number>();

  put(row: T) {
    const at = this.index.get(row.id);
    if (at == null) {
      this.index.set(row.id, this.rows.length);
      this.rows.push(row);
      return;
    }
    this.rows[at] = row;
  }
}

function readFtlSystem(node: XmlElement): { system: SystemDef; tune: TuneDef } | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return {
    system: {
      id,
      name: textOf(node, "title") ?? id,
      cost: numOf(node, "cost") ?? 0,
      slot: systemSlot(id),
    },
    tune: {
      id,
      start: numOf(node, "startPower") ?? 1,
      costs: upgradeCosts(node),
    },
  };
}

function systemSlot(id: string): SystemSlot {
  if (KIT_SYSTEMS.has(id) || id.startsWith("artillery")) return "kit";
  return "sys";
}

/** The first upgradeCost level is the scrap to leave level 1. */
function upgradeCosts(node: XmlElement): TuneStep[] {
  const costs: TuneStep[] = [];
  let level = 1;
  for (const item of elements(child(node, "upgradeCost"))) {
    if (item.tagName !== "level") continue;
    const cost = Number(item.textContent?.trim());
    if (!Number.isFinite(cost)) continue;
    costs.push({ level, cost });
    level += 1;
  }
  return costs;
}
