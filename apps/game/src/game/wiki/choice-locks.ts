import {
  allCrew,
  allEvents,
  augmentDef,
  blueprintList,
  droneDef,
  systemDef,
  weaponDef,
} from "@stl/pack";
import type { ChoiceReq, LockOwner } from "@stl/pack";
import type { Game, KitId, SysId } from "../types.ts";

type Button = {
  id: string;
  owner?: LockOwner;
  hidden?: boolean;
  maxGroup?: number;
  blue?: false;
  reqs?: readonly ChoiceReq[];
  choices?: readonly Button[];
};

function walkButtons(choices: readonly Button[] | undefined, visit: (choice: Button) => void) {
  for (const choice of choices ?? []) {
    visit(choice);
    walkButtons(choice.choices, visit);
  }
}

function eachChoice(visit: (choice: Button) => void) {
  for (const ev of allEvents()) {
    walkButtons(ev.choices, visit);
    for (const card of ev.cards ?? []) walkButtons(card.choices, visit);
  }
}

/** Choice ids this handler owns, with the reqs stored on them. Built from the loaded pack. */
export function locksOwned(owner: LockOwner): Record<string, readonly ChoiceReq[]> {
  const out: Record<string, readonly ChoiceReq[]> = {};
  eachChoice((choice) => {
    if (choice.owner === owner) out[choice.id] = choice.reqs ?? [];
  });
  return out;
}

/** True when a handler claimed this id. Reqs with no owner are a mod lock any handler may read. */
function hasPackedReq(id: string): boolean {
  let found = false;
  eachChoice((choice) => {
    if (choice.id === id && choice.owner) found = true;
  });
  return found;
}

const KITS = new Set<string>([
  "cloaking",
  "teleporter",
  "hacking",
  "drones",
  "mind",
  "clonebay",
  "battery",
  "artillery",
  "artillery",
]);
const RADAR = new Set(["COMBAT_1", "COMBAT_2", "COMBAT_BEAM", "COMBAT_BEAM_2"]);

/**
 * The first packed lock that fails, or null when the button has no locks or every lock passes.
 * A campaign id is claimed by the disable function that used to check it, so a later price
 * effect still runs in the same place. An id the campaign does not list is a mod lock and
 * any of those functions may return it.
 */
export function ownedLock(
  g: Game,
  id: string,
  owned: Readonly<Record<string, readonly ChoiceReq[]>>,
): string | null {
  const mine = Object.prototype.hasOwnProperty.call(owned, id);
  if (!mine && hasPackedReq(id)) return null;
  return choiceLock(g, id);
}

function choiceLock(g: Game, id: string): string | null {
  const reqs = reqsFor(id);
  if (!reqs) return null;
  for (const req of reqs) {
    if (req.k === "attr") {
      if (!attrMet(g, req)) return attrRefusalText(req);
      continue;
    }
    if (!meets(g, req)) return req.text;
  }
  return null;
}

export type StockKind = "scrap" | "fuel" | "missiles" | "parts";

/** The packed count this button spends, or null when the button stores none of that resource. */
export function stockCount(id: string, kind: StockKind): number | null {
  const req = reqsFor(id)?.find((row) => row.k === "stock" && row.id === kind);
  if (!req || req.k !== "stock") return null;
  return req.n;
}

/** The packed scrap this button spends, or null when the button stores none. */
export function scrapStock(id: string): number | null {
  return stockCount(id, "scrap");
}

function reqsFor(id: string): readonly ChoiceReq[] | null {
  const walk = (choices: readonly Button[] | undefined): readonly ChoiceReq[] | null => {
    for (const choice of choices ?? []) {
      if (choice.id === id && choice.reqs?.length) return choice.reqs;
      const nested = walk(choice.choices);
      if (nested) return nested;
    }
    return null;
  };
  for (const ev of allEvents()) {
    const found = walk(ev.choices);
    if (found) return found;
    for (const card of ev.cards ?? []) {
      const nested = walk(card.choices);
      if (nested) return nested;
    }
  }
  return null;
}

function meets(g: Game, req: ChoiceReq): boolean {
  if (req.k === "attr") return attrMet(g, req);
  if (req.k === "crew")
    return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === req.id);
  if (req.k === "system") return levelOf(g, req.id) >= req.level;
  if (req.k === "band") {
    const level = levelOf(g, req.id);
    return level >= req.lo && level <= req.hi;
  }
  if (req.k === "augment") return g.augments.includes(req.id);
  if (req.k === "weapon") return g.player.weapons.some((w) => w.defId === req.id);
  if (req.k === "family") return meetsFamily(g, req.id);
  if (req.k === "drone") return meetsDrone(g, req.id);
  if (req.k === "list") return meetsList(g, req.id);
  if (req.k === "stock") return have(g, req.id) >= req.n;
  return false;
}

/** A blueprint list is aboard when any of its names is mounted, installed, or carried. */
function meetsList(g: Game, id: string): boolean {
  const over = id.startsWith("OVERRIDE_") ? undefined : blueprintList(`OVERRIDE_${id}`);
  const names = over ?? blueprintList(id);
  if (!names) return false;
  const kit = g.player.kits.drones;
  const carried = new Set<string>([
    ...g.player.weapons.map((weapon) => weapon.defId),
    ...g.augments,
    ...(kit?.target ? [kit.target] : []),
    ...(kit?.loadout ?? []),
  ]);
  return names.some((name) => carried.has(name));
}

function levelOf(g: Game, id: string): number {
  if (id === "reactor") return g.player.reactor;
  if (KITS.has(id)) return g.player.kits[id as KitId]?.level ?? 0;
  return g.player.systems[id as SysId]?.level ?? 0;
}

function have(g: Game, id: string): number {
  if (id === "scrap") return g.scrap;
  if (id === "missiles") return g.missiles;
  if (id === "fuel") return g.fuel;
  if (id === "parts") return g.player.parts;
  return 0;
}

/** Missile excludes Hull Missile. Ion includes any ion damage. Beam includes the artillery lance and excludes the two named beams. */
function meetsFamily(g: Game, id: string): boolean {
  if (id === "missile") {
    return g.player.weapons.some(
      (w) => w.defId !== "MISSILES_HULL" && weaponDef(w.defId)?.kind === "missile",
    );
  }
  if (id === "ion") {
    return g.player.weapons.some((w) => {
      const def = weaponDef(w.defId);
      return !!def && (def.kind === "ion" || def.ion > 0);
    });
  }
  if (id === "beam") {
    if ((g.player.kits.artillery?.level ?? 0) > 0) return true;
    return g.player.weapons.some((w) => {
      const def = weaponDef(w.defId);
      return def?.kind === "beam" && w.defId !== "BEAM_BIO" && w.defId !== "BEAM_FIRE";
    });
  }
  return false;
}

/**
 * board, hull, personnel, and patch count a fitted schematic or a loadout entry.
 * beam also counts Beam Drone II. mine is Beam Drone only.
 * radar and antipersonnel require Drone Control power and ignore the loadout.
 */
function meetsDrone(g: Game, id: string): boolean {
  const kit = g.player.kits.drones;
  if (id === "BOARDER" || id === "SHIP_REPAIR" || id === "personnel" || id === "REPAIR") {
    if (!kit) return false;
    return kit.target === id || (kit.loadout ?? []).includes(id);
  }
  if (id === "COMBAT_BEAM") {
    if (!kit) return false;
    return [kit.target, ...(kit.loadout ?? [])].some(
      (kind) => kind === "COMBAT_BEAM" || kind === "COMBAT_BEAM_2",
    );
  }
  if (id === "mine") {
    if (!kit) return false;
    return kit.target === "COMBAT_BEAM" || (kit.loadout ?? []).includes("COMBAT_BEAM");
  }
  if (id === "radar") return !!kit && kit.level > 0 && RADAR.has(kit.target ?? "");
  if (id === "BATTLE") return !!kit && kit.level > 0 && kit.target === "BATTLE";
  return false;
}

const LEVEL_IDS = new Set([
  "reactor",
  "shields",
  "engines",
  "oxygen",
  "weapons",
  "drones",
  "medbay",
  "pilot",
  "sensors",
  "doors",
  "clonebay",
  "teleporter",
  "cloaking",
  "battery",
  "mind",
  "hacking",
  "artillery",
]);

function isLevelId(id: string): boolean {
  return LEVEL_IDS.has(id) || KITS.has(id) || systemDef(id) != null;
}

function attrOf(choice: Button): Extract<ChoiceReq, { k: "attr" }> | undefined {
  const req = choice.reqs?.find((row) => row.k === "attr");
  return req?.k === "attr" ? req : undefined;
}

function packedChoice(id: string): Button | undefined {
  let found: Button | undefined;
  eachChoice((choice) => {
    if (!found && choice.id === id) found = choice;
  });
  return found;
}

/** System, kit, and reactor are a level. A crew race is one living crewmember. Anything else fails closed. */
function attrMet(g: Game, req: Extract<ChoiceReq, { k: "attr" }>): boolean {
  const id = req.id;
  if (isLevelId(id)) {
    const level = levelOf(g, id);
    const lo = req.min ?? 1;
    if (level < lo) return false;
    if (req.max != null && level > req.max) return false;
    return true;
  }
  if (allCrew().some((row) => row.id === id)) {
    return g.crew.some((c) => c.side === "player" && c.hp > 0 && c.kin === id);
  }
  if (augmentDef(id)) return g.augments.includes(id);
  if (weaponDef(id)) return g.player.weapons.some((w) => w.defId === id);
  if (droneDef(id)) {
    const kit = g.player.kits.drones;
    return !!kit && (kit.target === id || (kit.loadout ?? []).includes(id));
  }
  if (blueprintList(id) || blueprintList(`OVERRIDE_${id}`)) return meetsList(g, id);
  return false;
}

function levelName(id: string): string {
  if (id === "reactor") return systemDef(id)?.name ?? "Reactor";
  return systemDef(id)?.name ?? id;
}

function attrRefusalText(req: Extract<ChoiceReq, { k: "attr" }>): string {
  if (!isLevelId(req.id)) {
    if (
      allCrew().some((row) => row.id === req.id) ||
      augmentDef(req.id) ||
      weaponDef(req.id) ||
      droneDef(req.id) ||
      blueprintList(req.id)
    ) {
      const named = allCrew().find((row) => row.id === req.id)?.name ?? systemDef(req.id)?.name;
      return named ? `Needs ${named}` : `Requires ${req.id}.`;
    }
    return `Requires ${req.id}.`;
  }
  const name = levelName(req.id);
  if (req.min != null && req.max != null) return `Needs ${name} level ${req.min} to ${req.max}`;
  if (req.max != null) return `Needs ${name} up to level ${req.max}`;
  if (req.min != null) return `Needs ${name} level ${req.min}`;
  return `Needs ${name}`;
}

/** Rank used by `max_group`. No req is 0. A system or reactor with no minimum is 1. Unmet is null. */
function matchRank(g: Game, choice: Button): number | null {
  const req = attrOf(choice);
  if (!req) return 0;
  if (!attrMet(g, req)) return null;
  if (isLevelId(req.id)) return req.min ?? 1;
  return req.min ?? 0;
}

function groupWinner(g: Game, siblings: readonly string[], group: number): string | null {
  let best: { id: string; index: number; min: number } | null = null;
  for (let index = 0; index < siblings.length; index++) {
    const id = siblings[index];
    if (id == null) continue;
    const choice = packedChoice(id);
    if (!choice || choice.maxGroup !== group) continue;
    const rank = matchRank(g, choice);
    if (rank == null) continue;
    if (!best || rank > best.min || (rank === best.min && index < best.index)) {
      best = { id, index, min: rank };
    }
  }
  return best?.id ?? null;
}

/**
 * Hidden unmet choices stay off the card. A `max_group` keeps one match: highest minimum, then the earlier row.
 * A group that matches nothing is omitted. A group does not cross into another page's sibling list.
 */
export function choiceOmitted(g: Game, id: string, siblings: readonly string[]): boolean {
  const choice = packedChoice(id);
  if (!choice) return false;
  if (choice.maxGroup != null) return groupWinner(g, siblings, choice.maxGroup) !== id;
  const req = attrOf(choice);
  return !!req && choice.hidden === true && !attrMet(g, req);
}

/** Met gear is blue unless the choice says `blue="false"`. A choice with no req is not blue. */
export function choiceBlue(g: Game, id: string): boolean {
  const choice = packedChoice(id);
  const req = choice ? attrOf(choice) : undefined;
  if (!choice || !req || choice.blue === false) return false;
  return attrMet(g, req);
}

/** Refusal for a shown, unmet attribute. Quest text still wins when the caller asks it first. */
export function attrRefusal(g: Game, id: string): string | null {
  const choice = packedChoice(id);
  const req = choice ? attrOf(choice) : undefined;
  if (!req || attrMet(g, req)) return null;
  return attrRefusalText(req);
}
