/**
 * Hangar fields taken from each cruiser layout's own lines.
 * File:KestralASystems.png is the bay: RENAME, the ship name, LIST, LAYOUT,
 * HIDE ROOMS, CREW, WEAPONS, DRONES, AUGMENTATIONS. The words in those panels
 * are the lines under Default name, Crew, Systems, Weapons, Drones,
 * Augmentations, and Unlock. A layout is Advanced Edition when its own lines
 * say so. Crystal and Lanius have no Layout C in the pages, so none is added.
 */
import type { CruiserLayout, WikiLine } from "./layout-pages.ts";

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
};

const HEADER =
  /^(default name:|starting crew:|crew:|starting reactor:|reactor:|starting systems:|systems:|starting weapons?:|weapons?(?: \(\d+ slots\))?:|starting drones?:|drones?(?: \(\d+ slots\))?:|starting augmentations?:|augmentations?:|starting resources:|resources:|slots:|unlock:?|special notes:|total scrap)/i;

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
  return {
    defaultName: name ? afterColon(name.header) : "",
    crew: crewLines.flatMap(crewCards),
    systems: (systems?.items ?? []).flatMap((text) => {
      const match = text.match(/^(.*?)\s*\((\d+)\)\s*$/);
      if (!match) return [];
      return [{ name: match[1], level: Number(match[2]) }];
    }),
    weapons: weapons?.items ?? [],
    weaponSlots: slotsFor(weapons?.header, slots?.header, "Weapon"),
    drones: drones?.items ?? [],
    droneSlots: slotsFor(drones?.header, slots?.header, "Drone"),
    augments: augments?.items ?? [],
    unlock: unlock?.items ?? [],
    advanced: layoutNeedsAe(layout),
  };
}
