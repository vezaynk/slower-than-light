import type { Document as XmlDocument, Element as XmlElement } from "@xmldom/xmldom";
import type {
  ContentPack,
  CrewDef,
  StoreDef,
  SystemDef,
  SystemSlot,
  TuneDef,
  TuneStep,
} from "./types.ts";
import {
  attr,
  child,
  elements,
  numOf,
  readAugment,
  readDocument,
  readDrone,
  readWeapon,
  tagged,
  textOf,
} from "./parse.ts";

/**
 * FTL system ids that install into a kit slot. Artillery ids share that slot.
 * Every other system id installs as a system.
 */
const KIT_SYSTEMS = new Set([
  "battery",
  "cloaking",
  "clonebay",
  "drones",
  "hacking",
  "mind",
  "teleporter",
]);

export type FtlBlueprintFile = {
  path: string;
  xml: string;
};

/**
 * Weapons, augments, drones, systems, tunes, and crew identity from blueprint XML.
 * Files are applied in order, and a later blueprint with the same id replaces the earlier one.
 * Crew combat stats stay at neutral defaults. A `<facts/>` marker and a `<names>` list are kept.
 * A weaponAnim `<time>` is the seconds between shots in one volley. It is written onto the
 * weapon whose `<weaponArt>` names that animation. Vanilla weapon animations omit `<time>`,
 * and those weapons keep gap 0. Stores, hulls, sectors, and events stay out of this catalog.
 */
export function packFromFtl(documents: readonly FtlBlueprintFile[]): ContentPack {
  const weapons = new Catalog<NonNullable<ContentPack["weapons"]>[number]>();
  const augments = new Catalog<NonNullable<ContentPack["augments"]>[number]>();
  const drones = new Catalog<NonNullable<ContentPack["drones"]>[number]>();
  const systems = new Catalog<SystemDef>();
  const tunes = new Catalog<TuneDef>();
  const crew = new Catalog<CrewDef>();
  let facts = false;
  let names: ContentPack["names"];
  const arts = new Map<string, string>();
  const animTime = new Map<string, number>();
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
      if (!row) continue;
      weapons.put(row);
      const art = textOf(node, "weaponArt")?.trim();
      if (art) arts.set(row.id, art);
      else arts.delete(row.id);
    }
    for (const node of tagged(doc, "weaponAnim")) {
      const name = attr(node, "name")?.trim();
      const time = numOf(node, "time");
      if (name && time != null) animTime.set(name, time);
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
    for (const node of tagged(doc, "crewBlueprint")) {
      const row = readFtlCrew(node);
      if (row) crew.put(row);
    }
    if (tagged(doc, "facts").length > 0) facts = true;
    const read = readNames(doc);
    if (read) names = read;
  }
  for (const row of weapons.rows) {
    const time = animTime.get(arts.get(row.id) ?? "");
    if (time != null) row.gap = time;
  }
  const pack: ContentPack = {
    weapons: weapons.rows,
    augments: augments.rows,
    drones: drones.rows,
    systems: systems.rows,
    tunes: tunes.rows,
  };
  if (crew.rows.length > 0) pack.crew = crew.rows;
  if (facts) pack.facts = true;
  if (names) pack.names = names;
  return pack;
}

function readNames(doc: XmlDocument): ContentPack["names"] | undefined {
  const node = tagged(doc, "names")[0];
  if (!node) return undefined;
  const pool: string[] = [];
  const syllables: string[] = [];
  for (const item of elements(node)) {
    const text = item.textContent?.trim() ?? "";
    if (!text) continue;
    if (item.tagName === "pool") pool.push(text);
    if (item.tagName === "syllable") syllables.push(text);
  }
  if (!pool.length && !syllables.length) return undefined;
  return { pool, syllables };
}

function readFtlCrew(node: XmlElement): CrewDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const row: CrewDef = {
    id,
    name: textOf(node, "title") ?? id,
    hp: 100,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
    bonusPower: 0,
    hasDeathExplosion: false,
    drainsOxygen: false,
    detectsLifeforms: false,
    resistsMindControl: false,
    lockdown: false,
    lockCooldown: 0,
    fireRepairMultiplier: 1,
  };
  const detail = textOf(node, "desc");
  if (detail) row.detail = detail;
  const cost = numOf(node, "cost");
  if (cost != null) row.cost = cost;
  return row;
}

/**
 * The archive is the base pack. Rules supply only what the archive does not:
 * crew combat stats (joined by id, leaving the archive name, blurb, and hire price),
 * the store shelf, hulls, sectors, events, filler lists, and empty beacons.
 * A rules weapon, augment, drone, system, or tune is dropped so it cannot replace the archive row.
 * A rules race whose id is not in the archive is kept, so a hull seat that still uses that id can resolve.
 */
export function joinFtlPack(archive: ContentPack, rules: ContentPack): ContentPack {
  const crew = mergeCrew(archive.crew ?? [], rules.crew ?? []);
  return {
    weapons: (archive.weapons ?? []).map((row) => ({ ...row })),
    augments: (archive.augments ?? []).map((row) => ({ ...row })),
    drones: (archive.drones ?? []).map((row) => ({ ...row })),
    systems: (archive.systems ?? []).map((row) => ({ ...row })),
    tunes: (archive.tunes ?? []).map((row) => ({
      ...row,
      costs: row.costs.map((step) => ({ ...step })),
    })),
    crew,
    stores: (rules.stores ?? []).map((row) => withCrewPrices(row, crew)),
    hulls: rules.hulls ?? [],
    sectors: rules.sectors ?? [],
    events: rules.events ?? [],
    lists: rules.lists ?? [],
    empties: rules.empties ?? [],
  };
}

function mergeCrew(archive: readonly CrewDef[], rules: readonly CrewDef[]): CrewDef[] {
  const rows = archive.map((row) => ({ ...row }));
  const index = new Map(rows.map((row, i) => [row.id, i]));
  for (const rule of rules) {
    const at = index.get(rule.id);
    if (at == null) {
      index.set(rule.id, rows.length);
      rows.push({ ...rule });
      continue;
    }
    const kept = rows[at];
    if (!kept) continue;
    const next: CrewDef = { ...rule, id: kept.id, name: kept.name };
    if (kept.detail != null) next.detail = kept.detail;
    else delete next.detail;
    if (kept.cost != null) next.cost = kept.cost;
    else delete next.cost;
    rows[at] = next;
  }
  return rows;
}

function withCrewPrices(store: StoreDef, crew: readonly CrewDef[]): StoreDef {
  const byId = new Map(crew.map((row) => [row.id, row]));
  return {
    ...store,
    sections: [...store.sections],
    lines: store.lines.map((line) => {
      if (line.kind !== "crew") return { ...line };
      const race = byId.get(line.id);
      if (!race) return { ...line };
      return { ...line, name: race.name, cost: race.cost ?? line.cost };
    }),
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
  const system: SystemDef = {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
    slot: systemSlot(id, node),
  };
  const detail = textOf(node, "desc");
  if (detail) system.detail = detail;
  return {
    system,
    tune: {
      id,
      start: numOf(node, "startPower") ?? 1,
      costs: upgradeCosts(node),
    },
  };
}

function systemSlot(id: string, node: XmlElement): SystemSlot {
  const written = textOf(node, "slot");
  if (written === "kit" || written === "sys") return written;
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
