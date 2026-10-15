import { allEvents, weaponDef } from "@stl/pack";
import type { ChoiceReq } from "@stl/pack";
import type { Game, KitId, SysId } from "../types.ts";
import { CHOICE_REQS } from "./choice-reqs.ts";

const KITS = new Set<string>([
  "veil",
  "sling",
  "spike",
  "swarm",
  "leash",
  "cradle",
  "cell",
  "lance",
  "flak",
]);
const RADAR = new Set(["striker", "combat2", "beam", "beam2"]);

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
  if (!mine && Object.prototype.hasOwnProperty.call(CHOICE_REQS, id)) return null;
  return choiceLock(g, id);
}

function choiceLock(g: Game, id: string): string | null {
  const reqs = reqsFor(id);
  if (!reqs) return null;
  for (const req of reqs) {
    if (!meets(g, req)) return req.text;
  }
  return null;
}

function reqsFor(id: string): readonly ChoiceReq[] | null {
  for (const ev of allEvents()) {
    for (const choice of ev.choices) {
      if (choice.id === id && choice.reqs?.length) return choice.reqs;
    }
    for (const card of ev.cards ?? []) {
      for (const choice of card.choices) {
        if (choice.id === id && choice.reqs?.length) return choice.reqs;
      }
    }
  }
  return null;
}

function meets(g: Game, req: ChoiceReq): boolean {
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
  if (req.k === "stock") return have(g, req.id) >= req.n;
  return false;
}

function levelOf(g: Game, id: string): number {
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
      (w) => w.defId !== "hullmissile" && weaponDef(w.defId)?.kind === "missile",
    );
  }
  if (id === "ion") {
    return g.player.weapons.some((w) => {
      const def = weaponDef(w.defId);
      return !!def && (def.kind === "ion" || def.ion > 0);
    });
  }
  if (id === "beam") {
    if ((g.player.kits.lance?.level ?? 0) > 0) return true;
    return g.player.weapons.some((w) => {
      const def = weaponDef(w.defId);
      return def?.kind === "beam" && w.defId !== "antibio" && w.defId !== "firebeam";
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
  const kit = g.player.kits.swarm;
  if (id === "board" || id === "hull" || id === "personnel" || id === "patch") {
    if (!kit) return false;
    return kit.target === id || (kit.loadout ?? []).includes(id);
  }
  if (id === "beam") {
    if (!kit) return false;
    return [kit.target, ...(kit.loadout ?? [])].some((kind) => kind === "beam" || kind === "beam2");
  }
  if (id === "mine") {
    if (!kit) return false;
    return kit.target === "beam" || (kit.loadout ?? []).includes("beam");
  }
  if (id === "radar") return !!kit && kit.level > 0 && RADAR.has(kit.target ?? "");
  if (id === "antipersonnel") return !!kit && kit.level > 0 && kit.target === "antipersonnel";
  return false;
}
