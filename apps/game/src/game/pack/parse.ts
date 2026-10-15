import type { WeaponKind } from "../types.ts";
import type { AugmentDef, ContentPack, CrewDef, DroneDef, HullDef, HullKitDef, HullLayout, SectorDef, StoreDef, StoreLine, SystemDef, TuneDef, TuneStep, WeaponBlueprint } from "./types.ts";

type Node = { tag: string; attrs: Record<string, string>; text: string; children: Node[] };

const KINDS: Record<string, WeaponKind> = {
  LASER: "laser",
  MISSILE: "missile",
  BEAM: "beam",
  BOMB: "bomb",
  ION: "ion",
  BURST: "flak",
  FLAK: "flak",
};

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"|([A-Za-z_:][\w:.-]*)\s*=\s*'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    if (match[1]) attrs[match[1]] = decode(match[2] ?? "");
    else if (match[3]) attrs[match[3]] = decode(match[4] ?? "");
  }
  return attrs;
}

function parseXml(xml: string): Node[] {
  const root: Node = { tag: "#root", attrs: {}, text: "", children: [] };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    if (match[0].startsWith("<!--") || match[0].startsWith("<![CDATA[")) continue;
    if (match[2]) {
      const closing = match[1] === "/";
      const self = match[4] === "/";
      const node: Node = { tag: match[2], attrs: parseAttrs(match[3] ?? ""), text: "", children: [] };
      if (closing) {
        while (stack.length > 1 && stack[stack.length - 1]!.tag !== node.tag) stack.pop();
        if (stack.length > 1) stack.pop();
      } else {
        stack[stack.length - 1]!.children.push(node);
        if (!self) stack.push(node);
      }
    } else if (match[5] && stack.length > 1) {
      stack[stack.length - 1]!.text += decode(match[5]);
    }
  }
  return root.children;
}

function walk(nodes: Node[], visit: (node: Node) => void): void {
  for (const node of nodes) {
    visit(node);
    walk(node.children, visit);
  }
}

function child(node: Node, tag: string): Node | undefined {
  return node.children.find((item) => item.tag === tag);
}

function textOf(node: Node, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found?.text.trim();
  return text ? text : undefined;
}

function numOf(node: Node, tag: string): number | undefined {
  const text = textOf(node, tag);
  if (text == null) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function attrNum(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function boolOf(node: Node, tag: string): boolean | undefined {
  const text = textOf(node, tag)?.toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return undefined;
}

function blankCrew(id: string): CrewDef {
  return {
    id,
    name: id,
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
}

function readCrew(node: Node): CrewDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  const row = blankCrew(id);
  const title = textOf(node, "title");
  if (title) row.name = title;
  const hp = numOf(node, "maxHealth");
  if (hp != null) row.hp = hp;
  const move = numOf(node, "moveSpeedMultiplier");
  if (move != null) row.move = move;
  const repair = numOf(node, "repairSpeed");
  if (repair != null) row.repair = repair;
  const fight = numOf(node, "damageMultiplier");
  if (fight != null) row.fight = fight;
  if (boolOf(node, "canSuffocate") === false) row.suffocate = 0;
  const suffocate = numOf(node, "suffocationModifier");
  if (suffocate != null) row.suffocate = suffocate;
  if (boolOf(node, "canBurn") === false) row.fireTaken = 0;
  const fire = numOf(node, "fireDamageMultiplier");
  if (fire != null) row.fireTaken = fire;
  const extinguish = numOf(node, "fireRepairMultiplier");
  if (extinguish != null) row.fireRepairMultiplier = extinguish;
  const bonus = numOf(node, "bonusPower");
  if (bonus != null) row.bonusPower = bonus;
  if (boolOf(node, "hasDeathExplosion") === true) row.hasDeathExplosion = true;
  const oxygen = numOf(node, "oxygenChangeSpeed");
  if (oxygen != null && oxygen < 0) row.drainsOxygen = true;
  if (boolOf(node, "detectsLifeforms") === true) row.detectsLifeforms = true;
  if (boolOf(node, "resistsMindControl") === true) row.resistsMindControl = true;
  const power = child(node, "powerEffect");
  if (power) {
    if (boolOf(power, "lockdown") === true) row.lockdown = true;
    const cooldown = numOf(power, "cooldown");
    if (cooldown != null) row.lockCooldown = cooldown;
  }
  return row;
}

function readWeapon(node: Node): WeaponBlueprint | undefined {
  const id = node.attrs.name?.trim();
  const kind = KINDS[(textOf(node, "type") ?? "").toUpperCase()];
  if (!id || !kind) return undefined;
  const row: WeaponBlueprint = {
    id,
    name: textOf(node, "title") ?? id,
    kind,
    power: numOf(node, "power") ?? 0,
    charge: numOf(node, "cooldown") ?? 0,
    shots: numOf(node, "shots") ?? 0,
    gap: numOf(node, "shotGap") ?? 0,
    damage: numOf(node, "damage") ?? 0,
    ion: numOf(node, "ion") ?? 0,
    fire: (numOf(node, "fireChance") ?? 0) / 10,
    breach: (numOf(node, "breachChance") ?? 0) / 10,
    ammo: kind === "missile" || (numOf(node, "missiles") ?? 0) > 0,
    price: numOf(node, "cost") ?? 0,
    blurb: textOf(node, "tooltip") ?? textOf(node, "desc") ?? "",
  };
  const length = numOf(node, "length");
  if (length != null) row.lengthTiles = length / 45;
  const speed = numOf(node, "speed");
  if (speed != null) row.speed = speed;
  const crew = numOf(node, "crewDamage");
  if (crew != null) row.crewDamage = crew;
  // FTL names shield pierce <sp>. <pierce> is the same field.
  const pierce = numOf(node, "sp") ?? numOf(node, "pierce");
  if (pierce != null) row.pierce = pierce;
  return row;
}

function readAugment(node: Node): AugmentDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    detail: textOf(node, "desc") ?? "",
    cost: numOf(node, "cost") ?? 0,
  };
}

function readDrone(node: Node): DroneDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
  };
}

function readSystem(node: Node): SystemDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
    slot: textOf(node, "slot") === "kit" ? "kit" : "sys",
  };
}

function hullLayout(value: string | undefined): HullLayout {
  return value === "B" || value === "C" ? value : "A";
}

function readHull(node: Node): HullDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  const systems: Record<string, [number, number]> = {};
  for (const item of child(node, "systemList")?.children ?? []) {
    if (item.tag !== "system") continue;
    const sysId = item.attrs.name?.trim();
    if (!sysId) continue;
    systems[sysId] = [numOf(item, "level") ?? 0, numOf(item, "power") ?? 0];
  }
  const weapons: string[] = [];
  for (const item of child(node, "weaponList")?.children ?? []) {
    if (item.tag !== "weapon") continue;
    const weaponId = (item.text.trim() || item.attrs.name?.trim()) ?? "";
    if (weaponId) weapons.push(weaponId);
  }
  const crew: HullDef["crew"] = [];
  for (const item of child(node, "crewList")?.children ?? []) {
    if (item.tag !== "crewMember") continue;
    const kin = item.attrs.kin?.trim();
    const room = item.attrs.room?.trim();
    if (!kin || !room) continue;
    crew.push({ kin, room });
  }
  const kits: Record<string, HullKitDef> = {};
  for (const item of child(node, "kitList")?.children ?? []) {
    if (item.tag !== "kit") continue;
    const kitId = item.attrs.name?.trim();
    if (!kitId) continue;
    const kit: HullKitDef = { level: numOf(item, "level") ?? 0, power: numOf(item, "power") ?? 0 };
    const target = textOf(item, "target");
    if (target != null) kit.target = target;
    const loadout = child(item, "loadout");
    if (loadout) {
      kit.loadout = loadout.children
        .filter((entry) => entry.tag === "schematic")
        .map((entry) => entry.text.trim())
        .filter((entry) => entry.length > 0);
    }
    const on = boolOf(item, "on");
    if (on !== undefined) kit.on = on;
    kits[kitId] = kit;
  }
  const augments: string[] = [];
  for (const item of child(node, "augmentList")?.children ?? []) {
    if (item.tag !== "augment") continue;
    const augmentId = item.text.trim();
    if (augmentId) augments.push(augmentId);
  }
  const unfitted: string[] = [];
  for (const item of child(node, "unfitted")?.children ?? []) {
    if (item.tag !== "item") continue;
    const label = item.text.trim();
    if (label) unfitted.push(label);
  }
  return {
    id,
    cruiser: textOf(node, "class") ?? "",
    layout: hullLayout(node.attrs.layout?.trim()),
    name: textOf(node, "title") ?? id,
    quote: textOf(node, "desc") ?? "",
    unlock: textOf(node, "unlock") ?? "",
    source: textOf(node, "source") ?? "",
    reactor: numOf(node, "reactor") ?? 0,
    fuel: numOf(node, "fuel") ?? 0,
    missiles: numOf(node, "missiles") ?? 0,
    parts: numOf(node, "parts") ?? 0,
    systems,
    weapons,
    crew,
    kits,
    augments,
    unfitted,
  };
}

function readStore(node: Node): StoreDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  const sections: string[] = [];
  const lines: StoreLine[] = [];
  for (const item of node.children) {
    if (item.tag === "section") {
      const text = item.text.trim();
      if (text) sections.push(text);
      continue;
    }
    if (item.tag !== "stock") continue;
    const lineId = item.attrs.id?.trim();
    if (!lineId) continue;
    const min = attrNum(item.attrs.min) ?? 0;
    lines.push({
      id: lineId,
      kind: item.attrs.kind?.trim() ?? "",
      name: textOf(item, "title") ?? lineId,
      cost: numOf(item, "cost") ?? 0,
      min,
      max: attrNum(item.attrs.max) ?? min,
    });
  }
  return {
    id,
    name: textOf(node, "title") ?? id,
    slot: numOf(node, "slot") ?? 3,
    weapons: numOf(node, "weapons") ?? 2,
    sections,
    lines,
  };
}

function readTune(node: Node): TuneDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  const costs: TuneStep[] = [];
  for (const item of node.children) {
    if (item.tag !== "upgrade") continue;
    const level = attrNum(item.attrs.level);
    if (level == null) continue;
    const cost = Number(item.text.trim());
    if (!Number.isFinite(cost)) continue;
    costs.push({ level, cost });
  }
  return {
    id,
    start: numOf(node, "start") ?? 1,
    costs,
  };
}

function readSector(node: Node): SectorDef | undefined {
  const id = node.attrs.name?.trim();
  if (!id) return undefined;
  const notes: string[] = [];
  for (const item of node.children) {
    if (item.tag !== "note") continue;
    const text = item.text.trim();
    if (text) notes.push(text);
  }
  return {
    id,
    name: textOf(node, "title") ?? id,
    group: textOf(node, "type") ?? "",
    notes,
  };
}

/** Reads the crew, weapon, augment, drone, system, hull, sector, store, and tune tags this milestone stores. Other tags are ignored. */
export function parsePack(xml: string): ContentPack {
  const crew: CrewDef[] = [];
  const weapons: WeaponBlueprint[] = [];
  const augments: AugmentDef[] = [];
  const drones: DroneDef[] = [];
  const systems: SystemDef[] = [];
  const hulls: HullDef[] = [];
  const sectors: SectorDef[] = [];
  const stores: StoreDef[] = [];
  const tunes: TuneDef[] = [];
  walk(parseXml(xml), (node) => {
    if (node.tag === "race") {
      const row = readCrew(node);
      if (row) crew.push(row);
    } else if (node.tag === "weaponBlueprint") {
      const row = readWeapon(node);
      if (row) weapons.push(row);
    } else if (node.tag === "augBlueprint") {
      const row = readAugment(node);
      if (row) augments.push(row);
    } else if (node.tag === "droneBlueprint") {
      const row = readDrone(node);
      if (row) drones.push(row);
    } else if (node.tag === "systemBlueprint") {
      const row = readSystem(node);
      if (row) systems.push(row);
    } else if (node.tag === "shipBlueprint") {
      const row = readHull(node);
      if (row) hulls.push(row);
    } else if (node.tag === "sectorDescription") {
      const row = readSector(node);
      if (row) sectors.push(row);
    } else if (node.tag === "storeBlueprint") {
      const row = readStore(node);
      if (row) stores.push(row);
    } else if (node.tag === "systemTune") {
      const row = readTune(node);
      if (row) tunes.push(row);
    }
  });
  return { crew, weapons, augments, drones, systems, hulls, sectors, stores, tunes };
}
