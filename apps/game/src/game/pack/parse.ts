import type { WeaponKind } from "../types.ts";
import type { ContentPack, CrewDef, WeaponBlueprint } from "./types.ts";

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

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"|([A-Za-z_:][\w:.-]*)\s*=\s*'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    if (match[1]) attrs[match[1]] = match[2] ?? "";
    else if (match[3]) attrs[match[3]] = match[4] ?? "";
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
      stack[stack.length - 1]!.text += match[5];
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
    power: numOf(node, "sp") ?? numOf(node, "power") ?? 0,
    charge: numOf(node, "cooldown") ?? 0,
    shots: numOf(node, "shots") ?? 0,
    gap: 0,
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
  const pierce = numOf(node, "pierce");
  if (pierce != null) row.pierce = pierce;
  return row;
}

/** Reads the crew and weapon tags this milestone stores. Other tags are ignored. */
export function parsePack(xml: string): ContentPack {
  const crew: CrewDef[] = [];
  const weapons: WeaponBlueprint[] = [];
  walk(parseXml(xml), (node) => {
    if (node.tag === "race") {
      const row = readCrew(node);
      if (row) crew.push(row);
    } else if (node.tag === "weaponBlueprint") {
      const row = readWeapon(node);
      if (row) weapons.push(row);
    }
  });
  return { crew, weapons };
}
