/**
 * `data/animations.xml` and `data/dlcAnimations.xml`.
 * A later entry with the same name replaces the earlier one.
 * `<time>` is how long the clip plays. It is not the gap between shots.
 */
import type { Element as XmlElement } from "@xmldom/xmldom";
import { attr as rawAttr, child, elements, ownText as rawText, readDocument } from "./parse.ts";

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
  /** `<firePoint>`. Absent when the tag is missing. */
  firePoint?: { x: number; y: number };
  /** `<fireSound>` names, in file order. A weapon may repeat the tag. */
  fireSounds: string[];
  /** `<chargeImage>` anim name. Absent when the tag is missing. */
  chargeImage?: string;
};

export type AnimationSet = {
  sheets: AnimSheet[];
  clips: AnimClip[];
  weapons: WeaponAnim[];
};

export function readAnimations(xml: string): AnimationSet {
  const doc = readDocument(xml);
  const sheets = new Map<string, AnimSheet>();
  const clips = new Map<string, AnimClip>();
  const weapons = new Map<string, WeaponAnim>();
  const root = doc.documentElement;
  if (!root) return { sheets: [], clips: [], weapons: [] };
  for (const node of elements(root)) {
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
  const fire = child(node, "firePoint");
  const chargeImage = textChild(node, "chargeImage");
  const fireSounds = elements(node)
    .filter((item) => item.tagName === "fireSound")
    .map((item) => ownText(item))
    .filter((name) => name.length > 0);
  const anim: WeaponAnim = {
    name,
    sheet,
    length,
    x: (desc && intAttr(desc, "x")) || 0,
    y: (desc && intAttr(desc, "y")) || 0,
    chargedFrame: intText(node, "chargedFrame") ?? 0,
    fireFrame: intText(node, "fireFrame") ?? 0,
    mountX: (mount && intAttr(mount, "x")) || 0,
    mountY: (mount && intAttr(mount, "y")) || 0,
    fireSounds,
  };
  if (fire) anim.firePoint = { x: intAttr(fire, "x") ?? 0, y: intAttr(fire, "y") ?? 0 };
  if (chargeImage) anim.chargeImage = chargeImage;
  return anim;
}

function ownText(node: XmlElement): string {
  return rawText(node).trim();
}

function textChild(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found ? ownText(found) : "";
  return text ? text : undefined;
}

function attr(node: XmlElement, name: string): string | undefined {
  const value = rawAttr(node, name)?.trim();
  return value ? value : undefined;
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
