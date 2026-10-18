/**
 * `data/animations.xml` and `data/dlcAnimations.xml`.
 * A later entry with the same name replaces the earlier one.
 * `<time>` is how long the clip plays. It is not the gap between shots.
 */
import { DOMParser, Node, type Element as XmlElement } from "@xmldom/xmldom";

export type AnimSheet = {
  name: string;
  w: number;
  h: number;
  fw: number;
  fh: number;
  /** Path inside the archive, `img/` plus the sheet text. */
  file: string;
};

export type AnimClip = {
  name: string;
  sheet: string;
  length: number;
  x: number;
  y: number;
  /** Seconds the whole clip lasts. Missing text means 1. */
  time: number;
};

export type WeaponAnim = {
  name: string;
  sheet: string;
  length: number;
  x: number;
  y: number;
  chargedFrame: number;
  fireFrame: number;
  mountX: number;
  mountY: number;
};

export type AnimationSet = {
  sheets: AnimSheet[];
  clips: AnimClip[];
  weapons: WeaponAnim[];
};

export function readAnimations(xml: string): AnimationSet {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const sheets = new Map<string, AnimSheet>();
  const clips = new Map<string, AnimClip>();
  const weapons = new Map<string, WeaponAnim>();
  const root = doc.documentElement;
  if (!root) return { sheets: [], clips: [], weapons: [] };
  for (const node of children(root)) {
    const name = attr(node, "name");
    if (!name) continue;
    if (node.tagName === "animSheet") {
      const sheet = readSheet(node, name);
      if (sheet) sheets.set(name, sheet);
    } else if (node.tagName === "anim") {
      const clip = readClip(node, name);
      if (clip) clips.set(name, clip);
    } else if (node.tagName === "weaponAnim") {
      const weapon = readWeaponAnim(node, name);
      if (weapon) weapons.set(name, weapon);
    }
  }
  return {
    sheets: [...sheets.values()],
    clips: [...clips.values()],
    weapons: [...weapons.values()],
  };
}

/** Later files win on a shared name. Sheets, clips, and weapon anims are separate. */
export function mergeAnimations(files: readonly string[]): AnimationSet {
  const sheets = new Map<string, AnimSheet>();
  const clips = new Map<string, AnimClip>();
  const weapons = new Map<string, WeaponAnim>();
  for (const xml of files) {
    const next = readAnimations(xml);
    for (const row of next.sheets) sheets.set(row.name, row);
    for (const row of next.clips) clips.set(row.name, row);
    for (const row of next.weapons) weapons.set(row.name, row);
  }
  return {
    sheets: [...sheets.values()],
    clips: [...clips.values()],
    weapons: [...weapons.values()],
  };
}

function readSheet(node: XmlElement, name: string): AnimSheet | undefined {
  const w = intAttr(node, "w");
  const h = intAttr(node, "h");
  const fw = intAttr(node, "fw");
  const fh = intAttr(node, "fh");
  const body = ownText(node);
  if (w == null || h == null || fw == null || fh == null || fw < 1 || fh < 1 || !body)
    return undefined;
  const file = body.startsWith("img/") ? body : `img/${body}`;
  return { name, w, h, fw, fh, file };
}

function readClip(node: XmlElement, name: string): AnimClip | undefined {
  const sheet = textChild(node, "sheet");
  const desc = child(node, "desc");
  const length = desc ? intAttr(desc, "length") : undefined;
  const x = desc ? intAttr(desc, "x") : undefined;
  const y = desc ? intAttr(desc, "y") : undefined;
  if (!sheet || length == null || length < 1 || x == null || y == null) return undefined;
  const timeText = textChild(node, "time");
  const time = timeText == null ? 1 : Number(timeText);
  if (!Number.isFinite(time)) return undefined;
  return { name, sheet, length, x, y, time };
}

function readWeaponAnim(node: XmlElement, name: string): WeaponAnim | undefined {
  const sheet = textChild(node, "sheet");
  const desc = child(node, "desc");
  const length = desc ? intAttr(desc, "length") : undefined;
  if (!sheet || length == null || length < 1) return undefined;
  const mount = child(node, "mountPoint");
  return {
    name,
    sheet,
    length,
    x: (desc && intAttr(desc, "x")) || 0,
    y: (desc && intAttr(desc, "y")) || 0,
    chargedFrame: intText(node, "chargedFrame") ?? 0,
    fireFrame: intText(node, "fireFrame") ?? 0,
    mountX: (mount && intAttr(mount, "x")) || 0,
    mountY: (mount && intAttr(mount, "y")) || 0,
  };
}

function children(node: XmlElement): XmlElement[] {
  const out: XmlElement[] = [];
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const item = node.childNodes.item(i);
    if (item && item.nodeType === Node.ELEMENT_NODE) out.push(item as XmlElement);
  }
  return out;
}

function child(node: XmlElement, tag: string): XmlElement | undefined {
  return children(node).find((item) => item.tagName === tag);
}

function ownText(node: XmlElement): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const item = node.childNodes.item(i);
    if (!item) continue;
    if (item.nodeType === Node.TEXT_NODE || item.nodeType === Node.CDATA_SECTION_NODE) {
      text += item.nodeValue ?? "";
    }
  }
  return text.trim();
}

function textChild(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found ? ownText(found) : "";
  return text ? text : undefined;
}

function attr(node: XmlElement, name: string): string | undefined {
  const value = node.getAttribute(name);
  return value == null || value.trim() === "" ? undefined : value.trim();
}

function intAttr(node: XmlElement, name: string): number | undefined {
  const raw = attr(node, name);
  if (raw == null) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

function intText(node: XmlElement, tag: string): number | undefined {
  const text = textChild(node, tag);
  if (text == null) return undefined;
  const value = Number(text);
  return Number.isInteger(value) ? value : undefined;
}
