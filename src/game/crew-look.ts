/**
 * INVENTED crew customization: a name and a uniform colour per seat.
 * The hangar and every in-run view read these helpers, so a crew member
 * looks the same on the bay card, the crew rail, the ship tokens, and the ship sheet.
 */
import { CREW_POOL } from "./content.ts";
import { KIN, type KinId } from "./extras/kin.ts";
import type { Crew } from "./types.ts";

/** Uniform swatches. Index 5 is the enemy red and is not offered in the hangar. */
export const UNIFORMS = ["#3d6fb0", "#d0a23a", "#4f9a5c", "#8a5cc0", "#2fa3a3", "#b8402f"] as const;
export const PLAYER_UNIFORMS = UNIFORMS.length - 1;
const ENEMY_UNIFORM = UNIFORMS.length - 1;

/** Head colour per lineage. */
export const KIN_SKIN: Record<KinId, string> = {
  plain: "#e8b98a",
  shell: "#9be7c8",
  spark: "#d7f28a",
  blade: "#8fd14a",
  gel: "#c084fc",
  stone: "#b9a48a",
  voidlung: "#c9d0d8",
  shard: "#bfe8ff",
};

export const NAME_MAX = 14;

/** What the hangar hands to a new run for one seat. */
export type CrewPick = { name: string; uniform: number };

export function kinLabel(kin: KinId | undefined) {
  return KIN[kin ?? "plain"].name;
}

export function defaultPick(seat: number): CrewPick {
  return { name: CREW_POOL[seat % CREW_POOL.length] ?? "Crew", uniform: seat % PLAYER_UNIFORMS };
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

const SYLLABLES = ["ka", "ren", "vo", "li", "mar", "tes", "an", "dru", "sel", "ko", "ny", "bel", "ta", "ri", "os"];

export function randomName(rand: () => number = Math.random) {
  const part = (n: number) =>
    Array.from({ length: n }, () => SYLLABLES[Math.floor(rand() * SYLLABLES.length)]).join("");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(part(1 + Math.floor(rand() * 2)))} ${cap(part(2))}`.slice(0, NAME_MAX);
}
