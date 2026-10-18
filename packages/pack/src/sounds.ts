/**
 * `data/sounds.xml` and `data/dlcSounds.xml`.
 * A cue's text is a path under `audio/waves/`. A track's explore and combat
 * texts are paths under `audio/music/`. `volume` is 0 to 10.
 */
import type { Element as XmlElement } from "@xmldom/xmldom";
import { attr as rawAttr, child, elements, ownText as rawText, readDocument } from "./parse.ts";

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
  const doc = readDocument(xml);
  const root = doc.documentElement;
  if (!root) return { cues: [], tracks: [] };
  const cues = new Map<string, SoundCue>();
  const tracks = new Map<string, MusicTrack>();
  const music = elements(root).find((node) => node.tagName === "music");
  if (music) {
    for (const track of elements(music)) {
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
  for (const node of elements(root)) {
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

function ownText(node: XmlElement): string {
  return rawText(node).trim();
}

function textChild(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found ? ownText(found) : "";
  return text ? text : undefined;
}

function attr(node: XmlElement, name: string): string | undefined {
  return rawAttr(node, name);
}

function intAttr(node: XmlElement, name: string): number | undefined {
  const raw = attr(node, name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}
