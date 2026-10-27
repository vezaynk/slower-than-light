/**
 * Lines the screens render from the loaded archive.
 * A stand-in with no string table leaves these empty, and the screen keeps its own English.
 */
import {
  allItemBlueprints,
  allTextLists,
  archivePhrase,
  textList,
  tutorialScript,
  type OpeningLine,
  type WeaponKind,
} from "@stl/pack";
import { INTERFACE_KEYS, type InterfaceScreen } from "./interface-keys.ts";

export function phraseOr(key: string, fallback: string): string {
  return archivePhrase(key) ?? fallback;
}

/** Archive wording for one screen. Empty when this pack has none of those keys. */
export function interfaceLines(screen: InterfaceScreen): string[] {
  const lines: string[] = [];
  for (const key of INTERFACE_KEYS[screen]) {
    const text = archivePhrase(key);
    if (text) lines.push(text);
  }
  return lines;
}

/** Every screen's archive lines, in the same order the screens ask for them. */
export function allInterfaceLines(): string[] {
  const lines: string[] = [];
  for (const screen of Object.keys(INTERFACE_KEYS) as InterfaceScreen[]) {
    lines.push(...interfaceLines(screen));
  }
  return lines;
}

/** The tutorial's continue button. The stand-in keeps the word Continue. */
export function tutorialContinueLabel(): string {
  return phraseOr("event_TUTORIAL_START_c1_c2_choice", "Continue");
}

/** Raw tutorial step text, plus the continue phrase when the archive has one. */
export function tutorialLines(): string[] {
  const lines: string[] = [];
  for (const order of tutorialScript()) {
    for (const step of order.steps) {
      if (step.text.trim()) lines.push(step.text);
    }
  }
  const label = archivePhrase("event_TUTORIAL_START_c1_c2_choice");
  if (label) lines.push(label);
  return lines;
}

function listText(line: OpeningLine, seen: Set<string>): string[] {
  if ("text" in line) return line.text.trim() ? [line.text] : [];
  if (!line.load || seen.has(line.load)) return [];
  seen.add(line.load);
  const nested = textList(line.load);
  if (!nested) return [];
  return nested.lines.flatMap((row) => listText(row, seen));
}

function listsMatching(pattern: RegExp): string[] {
  const lines: string[] = [];
  for (const list of allTextLists()) {
    if (!pattern.test(list.id)) continue;
    const seen = new Set<string>([list.id]);
    for (const line of list.lines) lines.push(...listText(line, seen));
  }
  return lines;
}

/** Tip and hide lists on the help screen. */
export function helpListLines(): string[] {
  return listsMatching(/tip|hide/i);
}

/** Game-over lists on the verdict. */
export function verdictListLines(): string[] {
  return listsMatching(/gameover/i);
}

/** Fuel, missile, and drone-part titles and descriptions. The store shows these on the supply chips. */
export function itemLines(): string[] {
  const lines: string[] = [];
  for (const row of allItemBlueprints()) {
    if (row.title.trim()) lines.push(row.title);
    if (row.desc?.trim()) lines.push(row.desc);
  }
  return lines;
}

/** FTL WeaponBlueprint::GetDescription. Ion is a laser with ion damage. Crystal is a missile that spends none. */
function weaponTypeKey(row: {
  kind?: WeaponKind;
  ion?: number;
  ammo?: boolean;
}): string | undefined {
  if (row.kind === "ion" || (row.kind === "laser" && (row.ion ?? 0) > 0)) return "type_ion";
  if (row.kind === "laser") return "type_laser";
  if (row.kind === "beam") return "type_beam";
  if (row.kind === "bomb") return "type_bomb";
  if (row.kind === "flak") return "type_burst";
  if (row.kind === "missile") return row.ammo ? "type_missile" : "type_crystal";
  return undefined;
}

/** Hull damage, or a bomb's system bars when hull damage is 0. */
export function weaponDamageLabel(row: {
  damage?: number;
  sysDamage?: number;
  shots?: number;
}): string | null {
  const hull = row.damage ?? 0;
  const bars = row.sysDamage ?? 0;
  const n = hull > 0 ? hull : bars > 0 ? bars : 0;
  if (n <= 0) return null;
  const shots = row.shots ?? 1;
  return shots > 1 ? `${shots}×${n}` : String(n);
}

export function weaponCopy(row: {
  kind?: WeaponKind;
  ion?: number;
  ammo?: boolean;
  short?: string;
  detail?: string;
  flavor?: string;
}): string[] {
  const type = archivePhrase(weaponTypeKey(row));
  return [type, row.short, row.detail, row.flavor].filter((line): line is string =>
    Boolean(line?.trim()),
  );
}

export function droneCopy(row: { short?: string; detail?: string } | undefined): string[] {
  if (!row) return [];
  return [row.short, row.detail].filter((line): line is string => Boolean(line?.trim()));
}

export function crewCopy(
  row: { short?: string; detail?: string; powers?: string[] } | undefined,
): string[] {
  if (!row) return [];
  return [row.short, row.detail, ...(row.powers ?? [])].filter((line): line is string =>
    Boolean(line?.trim()),
  );
}

/** The archive keeps `\\n` as two characters. Screens turn that into a newline when they paint. */
export function displayPhrase(text: string): string {
  return text.replace(/\\n/g, "\n");
}
