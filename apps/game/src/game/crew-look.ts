/**
 * INVENTED crew customization: a name and a uniform colour per seat.
 * The hangar and every in-run view read these helpers, so a crew member
 * looks the same on the bay card, the crew rail, the ship tokens, and the ship sheet.
 */
import { type KinId } from "./extras/kin.ts";
import "./pack/base.ts";
import { allCrewNames, crewDef, textList } from "@stl/pack";
import type { Crew } from "./types.ts";

/** Invented names. Used when the archive has neither CREW_POOL nor data/names.xml. */
const CREW_FALLBACK = ["Ada Voss", "Ivo Park", "Nen Hale", "Brin Sol", "Quill Ade", "Mara Kent"];

/** Invented syllables. Used when the archive has no NAME_SYLLABLES list. */
const SYLLABLE_FALLBACK = [
  "ka",
  "ren",
  "vo",
  "li",
  "mar",
  "tes",
  "an",
  "dru",
  "sel",
  "ko",
  "ny",
  "bel",
  "ta",
  "ri",
  "os",
];

function listLines(id: string): string[] {
  return (textList(id)?.lines ?? []).flatMap((line) => ("text" in line ? [line.text] : []));
}

/**
 * Names a new crew member can take. Read when asked, so a later pack is visible.
 * The stand-in list wins. A real archive uses data/names.xml. Otherwise the invented pool.
 */
export function crewPool(): string[] {
  const listed = listLines("CREW_POOL");
  if (listed.length > 0) return listed;
  const archive = allCrewNames();
  if (archive.length > 0) return [...archive];
  return [...CREW_FALLBACK];
}

/** Uniform swatches. Index 5 is the enemy red and is not offered in the hangar. */
export const UNIFORMS = ["#3d6fb0", "#d0a23a", "#4f9a5c", "#8a5cc0", "#2fa3a3", "#b8402f"] as const;
export const PLAYER_UNIFORMS = UNIFORMS.length - 1;
const ENEMY_UNIFORM = UNIFORMS.length - 1;

/** Head colour per lineage. */
export const KIN_SKIN: Record<KinId, string> = {
  human: "#e8b98a",
  engi: "#9be7c8",
  energy: "#d7f28a",
  mantis: "#8fd14a",
  slug: "#c084fc",
  rock: "#b9a48a",
  anaerobic: "#c9d0d8",
  crystal: "#bfe8ff",
  ghost: "#e7eef6",
};

export const NAME_MAX = 14;

/** What the hangar hands to a new run for one seat. */
export type CrewPick = { name: string; uniform: number };

export function kinLabel(kin: string | undefined) {
  return crewDef(kin).name;
}

export function defaultPick(seat: number): CrewPick {
  const pool = crewPool();
  return { name: pool[seat % pool.length] ?? "Crew", uniform: seat % PLAYER_UNIFORMS };
}

export function defaultPicks(count: number): CrewPick[] {
  return Array.from({ length: count }, (_, i) => defaultPick(i));
}

/** Trimmed, length-capped name, or the seat default when blank. */
export function cleanName(name: string, seat: number) {
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return trimmed || defaultPick(seat).name;
}

export function clampUniform(index: number) {
  return Number.isInteger(index) && index >= 0 && index < PLAYER_UNIFORMS ? index : 0;
}

/** Saves from before customization carry only `tone`; enemies always wear red. */
export function uniformOf(crew: Pick<Crew, "side" | "tone" | "uniform">) {
  if (crew.side === "enemy") return UNIFORMS[ENEMY_UNIFORM];
  if (crew.uniform != null) return UNIFORMS[clampUniform(crew.uniform)];
  return UNIFORMS[crew.tone % PLAYER_UNIFORMS];
}

export function randomName(rand: () => number = Math.random) {
  const listed = listLines("NAME_SYLLABLES");
  if (listed.length === 0) {
    const archive = allCrewNames();
    if (archive.length > 0) {
      return archive[Math.floor(rand() * archive.length)]!.slice(0, NAME_MAX);
    }
  }
  const syllables = listed.length > 0 ? listed : [...SYLLABLE_FALLBACK];
  const part = (n: number) =>
    Array.from({ length: n }, () => syllables[Math.floor(rand() * syllables.length)]).join("");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(part(1 + Math.floor(rand() * 2)))} ${cap(part(2))}`.slice(0, NAME_MAX);
}
