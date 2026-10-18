/**
 * `data/sounds.xml` and `data/dlcSounds.xml`.
 * A cue's text is a path under `audio/waves/`. A track's explore and combat
 * texts are paths under `audio/music/`. `volume` is 0 to 10.
 */
import { DOMParser, Node, type Element as XmlElement } from "@xmldom/xmldom";

export type SoundCue = {
  name: string;
  file: string;
  /** 0 to 1, from the volume attribute divided by 10. */
  volume: number;
  loop: boolean;
};

export type MusicTrack = {
  name: string;
  explore: string;
  combat?: string;
};

export type SoundSet = {
  cues: SoundCue[];
  tracks: MusicTrack[];
};

export function readSounds(xml: string): SoundSet {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root) return { cues: [], tracks: [] };
  const cues = new Map<string, SoundCue>();
  const tracks = new Map<string, MusicTrack>();
  const music = children(root).find((node) => node.tagName === "music");
  if (music) {
    for (const track of children(music)) {
      if (track.tagName !== "track") continue;
      const name = textChild(track, "name");
      const explore = textChild(track, "explore");
      if (!name || !explore) continue;
      const combat = textChild(track, "combat");
      const row: MusicTrack = { name, explore: `audio/music/${explore}` };
      if (combat) row.combat = `audio/music/${combat}`;
      tracks.set(name, row);
    }
  }
  for (const node of children(root)) {
    if (node.tagName === "music") continue;
    const file = ownText(node);
    if (!file.endsWith(".wav") && !file.endsWith(".ogg")) continue;
    const volume = intAttr(node, "volume");
    cues.set(node.tagName, {
      name: node.tagName,
      file: `audio/waves/${file}`,
      volume: (volume ?? 10) / 10,
      loop: attr(node, "loop") === "true",
    });
  }
  return { cues: [...cues.values()], tracks: [...tracks.values()] };
}

/** Later files win on a shared cue or track name. */
export function mergeSounds(files: readonly string[]): SoundSet {
  const cues = new Map<string, SoundCue>();
  const tracks = new Map<string, MusicTrack>();
  for (const xml of files) {
    const next = readSounds(xml);
    for (const row of next.cues) cues.set(row.name, row);
    for (const row of next.tracks) tracks.set(row.name, row);
  }
  return { cues: [...cues.values()], tracks: [...tracks.values()] };
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
  return value == null ? undefined : value;
}

function intAttr(node: XmlElement, name: string): number | undefined {
  const raw = attr(node, name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}
