/**
 * Cruiser-page lines, kept for the article and for checks against the page text.
 * The hangar bay reads the loaded ship (hangar-bay.ts).
 * A layout is Advanced Edition when its own lines say so. Crystal and Lanius have no Layout C.
 */
import { type CruiserLayout, type WikiLine } from "./layout-pages.ts";

export type HangarSystem = { name: string; level: number };

export type HangarSheet = {
  defaultName: string;
  crew: string[];
  systems: HangarSystem[];
  weapons: string[];
  weaponSlots: number | null;
  drones: string[];
  droneSlots: number | null;
  augments: string[];
  unlock: string[];
  advanced: boolean;
  /** A Drone Control line ("Drone Control (3)", "Drones (3)") is in the Systems list. */
  droneSystem: boolean;
};

/**
 * "Unlock" is a header only as the whole line: "The Lanius Cruiser", Layout A has "Unlock" then
 * "Unlock 4 ships (Excluding The Kestrel) to unlock this ship.", and that second line is the unlock text.
 * "The Mantis Cruiser", Layout C ends with "Notes: this layout is one of the ships with most airlocks.",
 * a note, not an unlock line.
 */
const HEADER =
  /^(default name:|starting crew:|crew:|starting reactor:|reactor:|starting systems:|systems:|starting weapons?:|weapons?(?: \(\d+ slots\))?:|starting drones?:|drones?(?: \(\d+ slots\))?:|starting augmentations?:|augmentations?:|starting resources:|resources:|slots:|unlock:?\s*$|special notes:|notes:|total scrap)/i;

function sectionsOf(lines: WikiLine[]) {
  const sections: { header: string; items: string[] }[] = [];
  let current: { header: string; items: string[] } | null = null;
  for (const line of lines) {
    if (line.depth <= 1 && HEADER.test(line.text)) {
      current = { header: line.text, items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    if (line.depth === 0 && line.text.startsWith("\"")) continue;
    current.items.push(line.text);
  }
  return sections;
}

function find(sections: { header: string; items: string[] }[], re: RegExp) {
  return sections.find((section) => re.test(section.header));
}

function afterColon(header: string) {
  return header.split(":").slice(1).join(":").trim();
}

function slotsFor(header: string | undefined, slotsHeader: string | undefined, kind: "Weapon" | "Drone") {
  const inHeader = header?.match(/(\d+)\s*slots/i);
  if (inHeader) return Number(inHeader[1]);
  const inSlots = slotsHeader?.match(new RegExp(`(\\d+)\\s*${kind}`, "i"));
  if (inSlots) return Number(inSlots[1]);
  return null;
}

/** "Human (3)" and "2 Human, 1 Mantis" stay the races the line wrote. */
function crewCards(text: string) {
  const cards: string[] = [];
  const re = /(\d+)\s+([A-Za-z]+)|([A-Za-z]+)\s*\((\d+)\)/g;
  for (const match of text.matchAll(re)) {
    const count = Number(match[1] ?? match[4]);
    const label = match[2] ?? match[3];
    for (let i = 0; i < count; i += 1) cards.push(label);
  }
  return cards.length ? cards : [text];
}

/** Per the user: "Basic Laser (x4)" is four Basic Lasers, one card each, as the run mounts them (hulls.ts). */
function expandCount(items: string[]): string[] {
  return items.flatMap((text) => {
    const match = text.match(/^(.*?)\s*\(x(\d+)\)\s*$/i);
    if (!match) return [text];
    return Array.from({ length: Number(match[2]) }, () => match[1]);
  });
}

/**
 * Placeholder lines, not gear. "The Federation Cruiser", Layout C and "The Crystal Cruiser", Layout B print
 * Weapons: "none"; most layouts print Drones: "none (system not installed)", "none (requires system)" or
 * "none (and requires system)". Those are the empty bay, so no card is drawn for them.
 */
function isNone(text: string) {
  return /^none\b/i.test(text.trim());
}

function gear(items: string[]): string[] {
  return expandCount(items).filter((text) => !isNone(text));
}

/**
 * Per the user: the hangar's cards follow the run. Sheet names are reordered to the order of `ids` (the hull's
 * mounts in hulls.ts), matching each id to the first unused name that resolves to it. Unmatched names keep
 * their wiki order after the matched ones.
 */
export function orderByIds(names: string[], ids: string[], idOf: (name: string) => string | null): string[] {
  const left = [...names];
  const out: string[] = [];
  for (const id of ids) {
    const at = left.findIndex((name) => idOf(name) === id);
    if (at < 0) continue;
    out.push(left[at]);
    left.splice(at, 1);
  }
  return [...out, ...left];
}

export function layoutNeedsAe(layout: CruiserLayout) {
  return layout.lines.some((line) => line.text.includes("Advanced Edition"));
}

export function hangarSheet(layout: CruiserLayout): HangarSheet {
  const sections = sectionsOf(layout.lines);
  const name = find(sections, /^default name:/i);
  const crew = find(sections, /crew:/i);
  const systems = find(sections, /systems:/i);
  const weapons = find(sections, /^(starting )?weapons?/i);
  const drones = find(sections, /^(starting )?drones?/i);
  const augments = find(sections, /augmentation/i);
  const unlock = find(sections, /^unlock:?$/i);
  const slots = find(sections, /^slots:/i);
  const crewLines = [crew ? afterColon(crew.header) : "", ...(crew?.items ?? [])].filter(Boolean);
  const systemRows = (systems?.items ?? []).flatMap((text) => {
    const match = text.match(/^(.*?)\s*\((\d+)\)\s*$/);
    if (!match) return [];
    return [{ name: match[1], level: Number(match[2]) }];
  });
  return {
    defaultName: name ? afterColon(name.header) : "",
    crew: crewLines.flatMap(crewCards),
    systems: systemRows,
    weapons: gear(weapons?.items ?? []),
    weaponSlots: slotsFor(weapons?.header, slots?.header, "Weapon"),
    drones: gear(drones?.items ?? []),
    droneSlots: slotsFor(drones?.header, slots?.header, "Drone"),
    augments: gear(augments?.items ?? []),
    unlock: unlock?.items ?? [],
    advanced: layoutNeedsAe(layout),
    droneSystem: systemRows.some((system) => /^drone/i.test(system.name)),
  };
}
