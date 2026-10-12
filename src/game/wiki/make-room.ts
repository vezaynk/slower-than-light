/**
 * Per the user: a "make room" choice when a reward arrives and its rack is full, instead of the item being lost.
 *
 * - Augmentations, intro: "if you loot an augment and don't have room for it, you must choose one augment to leave
 *   behind without receiving any scrap value". A non-stacking duplicate still pays 25 scrap (bonus-item.ts).
 * - Crew: "If the player receives a 9th crew, the game will require to relieve one of the crewmembers, be it the new one
 *   or from the existing crew." The 9th comes aboard, then the choice is made.
 * - Weapons and drone schematics: Environmental Hazards names a "cargo bay to swap weapons and drone schematics". Per
 *   the user: it has 4 slots and takes what does not fit. Only when the rack and the cargo are both full does the
 *   player pick one to leave behind: a fitted one of that kind, anything in cargo, or the new one.
 *
 * The choice queues on Game.overflow and stops the clock (sim.ts halted) until it is answered. The new item can always
 * be the one left behind.
 */
import { CREW_CAP, dismissCrew, log, weaponSlotCap } from "../sim.ts";
import type { AugmentId, CargoItem, Game, Overflow } from "../types.ts";
import { canFieldDrone, fieldDroneSchematic, fieldedSchematics } from "./cited-stores.ts";

/** Per the user: the cargo hold's slot count. */
export const CARGO_SLOTS = 4;

export function cargoOf(g: Game): CargoItem[] {
  return g.cargo ?? [];
}

function stow(g: Game, item: CargoItem): boolean {
  if (cargoOf(g).length >= CARGO_SLOTS) return false;
  g.cargo = [...cargoOf(g), item];
  return true;
}

function mount(g: Game, defId: string, charge = 0, at = g.player.weapons.length) {
  g.uid = (g.uid + 1) >>> 0;
  g.player.weapons.splice(at, 0, { uid: "u" + g.uid.toString(36), defId, charge, enabled: false, autofire: false, target: null });
}

function queue(g: Game, item: Overflow) {
  g.overflow = [...(g.overflow ?? []), item];
}

/** A crew entry is settled once the crew is back to 8 some other way (a death, a dismissal). */
function live(g: Game, item: Overflow): boolean {
  return item.kind !== "crew" || aboardCrew(g).length > CREW_CAP;
}

/** The choice on screen, or null. Read-only, so the UI may call it while rendering. */
export function pendingOverflow(g: Game): Overflow | null {
  return g.overflow?.find((item) => live(g, item)) ?? null;
}

function aboardCrew(g: Game) {
  return g.crew.filter((c) => c.side === "player");
}

/** Mounts a weapon, else stows it in cargo, else asks what to leave behind. */
export function receiveWeapon(g: Game, defId: string): "mounted" | "cargo" | "queued" {
  if (g.player.weapons.length < weaponSlotCap(g)) {
    mount(g, defId);
    return "mounted";
  }
  if (stow(g, { kind: "weapon", id: defId })) return "cargo";
  queue(g, { kind: "weapon", id: defId });
  return "queued";
}

/** Fits an augmentation, or asks which one to leave behind on a full rack. Duplicates are the caller's (25 scrap). */
export function receiveAugment(g: Game, id: AugmentId): "fitted" | "queued" {
  if (g.augments.length >= 3) {
    queue(g, { kind: "augment", id });
    return "queued";
  }
  g.augments.push(id);
  return "fitted";
}

/** Ids of every drone schematic the ship holds, fitted or in cargo. */
export function heldSchematics(g: Game): string[] {
  const kit = g.player.kits.swarm;
  return [...(kit ? fieldedSchematics(kit) : []), ...cargoOf(g).filter((c) => c.kind === "drone").map((c) => c.id)];
}

/**
 * Fits a drone schematic, else stows it in cargo, else asks what to leave behind. INFERRED: a schematic the ship
 * already holds is not taken twice (Stores and resources: "A store will never sell duplicate ... drone schematics").
 * Without Drone Control a schematic still fits in cargo.
 */
export function receiveDrone(g: Game, ref: string): "fitted" | "cargo" | "queued" | "owned" {
  if (heldSchematics(g).includes(ref)) return "owned";
  if (canFieldDrone(g, ref) && fieldDroneSchematic(g, ref)) return "fitted";
  if (stow(g, { kind: "drone", id: ref })) return "cargo";
  queue(g, { kind: "drone", id: ref });
  return "queued";
}

/**
 * Inventory: a fitted weapon goes into cargo. Weapon Control, Overview: "A weapon charge can be stored if a weapon is
 * fully charged and then put into a cargo slot." A partial charge (below 1) is not kept.
 */
export function stowWeapon(g: Game, uid: string): boolean {
  const index = g.player.weapons.findIndex((w) => w.uid === uid);
  const w = g.player.weapons[index];
  if (!w || cargoOf(g).length >= CARGO_SLOTS) return false;
  g.player.weapons.splice(index, 1);
  if (g.armed === uid) {
    g.armed = null;
    g.targeting = false;
    g.beamAnchor = null;
  }
  stow(g, { kind: "weapon", id: w.defId, ...(w.charge >= 1 ? { charge: w.charge } : {}) });
  return true;
}

/** Inventory: a fitted drone schematic goes into cargo. */
export function stowDrone(g: Game, index: number): boolean {
  const kit = g.player.kits.swarm;
  if (!kit || cargoOf(g).length >= CARGO_SLOTS) return false;
  const have = fieldedSchematics(kit);
  const ref = have[index];
  if (ref == null) return false;
  setFielded(kit, have.filter((_, i) => i !== index));
  stow(g, { kind: "drone", id: ref });
  return true;
}

/** Inventory: fit a cargo item into a free weapon slot, or a free drone schematic slot. */
export function fitFromCargo(g: Game, index: number): boolean {
  const item = cargoOf(g)[index];
  if (!item) return false;
  if (item.kind === "weapon") {
    if (g.player.weapons.length >= weaponSlotCap(g)) return false;
    mount(g, item.id, item.charge ?? 0);
  } else if (!canFieldDrone(g, item.id) || !fieldDroneSchematic(g, item.id)) return false;
  g.cargo = cargoOf(g).filter((_, i) => i !== index);
  return true;
}

/** Can a cargo item be fitted right now? */
export function canFitFromCargo(g: Game, index: number): boolean {
  const item = cargoOf(g)[index];
  if (!item) return false;
  return item.kind === "weapon" ? g.player.weapons.length < weaponSlotCap(g) : canFieldDrone(g, item.id);
}

function setFielded(kit: NonNullable<Game["player"]["kits"]["swarm"]>, next: string[]) {
  if (kit.loadout?.length) {
    kit.loadout = next;
    return;
  }
  kit.target = next[0] ?? null;
  kit.on = false;
  kit.left = 0;
  kit.aux = 0;
  delete kit.hp;
}

/** Called after a crewmember joins: a 9th asks who is relieved. */
export function checkCrewRoom(g: Game) {
  if (aboardCrew(g).length > CREW_CAP && !g.overflow?.some((o) => o.kind === "crew")) queue(g, { kind: "crew" });
}

/**
 * A paid hire at full crew (a hiring station or event). Crew: "If the player wishes to replace a crewmember at a store or
 * a hiring station while being at full crew count, the game will require to relieve one of the existing crewmembers
 * before purchase/hire." Call right after joinCrew: the newcomer cannot be the one relieved.
 */
export function keepNewHire(g: Game) {
  const crew = aboardCrew(g);
  const newest = crew[crew.length - 1];
  if (!newest || !g.overflow) return;
  g.overflow = g.overflow.map((item) => (item.kind === "crew" && !item.keep ? { kind: "crew", keep: newest.id } : item));
}

/**
 * Answers the choice on screen. `leave` is "new" (the arriving item stays behind) or what leaves instead: a weapon
 * uid, "a:<index>" for an augmentation, "d:<index>" for a fielded schematic, or a crew id.
 */
export function resolveOverflow(g: Game, leave: string): boolean {
  const head = pendingOverflow(g);
  if (!head) return false;
  if (head.kind === "crew") {
    // The newcomer is already aboard, so "new" is just one of the ids here. A paid hire stays.
    if (leave === head.keep || !dismissCrew(g, leave)) return false;
  } else if (leave === "new") {
    log(g, "Left behind.");
  } else if (/^c:\d+$/.test(leave)) {
    // A cargo item is left behind; the new one takes its cargo slot.
    const index = Number(leave.slice(2));
    if (head.kind === "augment" || !cargoOf(g)[index]) return false;
    g.cargo = cargoOf(g).map((c, i) => (i === index ? { kind: head.kind, id: head.id } : c));
  } else if (head.kind === "weapon") {
    const index = g.player.weapons.findIndex((w) => w.uid === leave);
    if (index < 0) return false;
    g.player.weapons.splice(index, 1);
    if (g.armed === leave) {
      g.armed = null;
      g.targeting = false;
      g.beamAnchor = null;
    }
    // INFERRED: the new weapon takes the freed slot's place in the row.
    mount(g, head.id, 0, index);
  } else if (head.kind === "augment") {
    const index = Number(/^a:(\d+)$/.exec(leave)?.[1] ?? -1);
    if (!(index >= 0 && index < g.augments.length)) return false;
    // Augmentations: the one left behind gives no scrap.
    if (g.augments[index] === "zshield") {
      g.player.zoltan = undefined;
      delete g.player.zoltanOver;
    }
    g.augments.splice(index, 1, head.id);
  } else {
    const kit = g.player.kits.swarm;
    const index = Number(/^d:(\d+)$/.exec(leave)?.[1] ?? -1);
    if (!kit) return false;
    const have = fieldedSchematics(kit);
    if (!(index >= 0 && index < have.length)) return false;
    setFielded(
      kit,
      have.map((ref, i) => (i === index ? head.id : ref)),
    );
  }
  const rest = (g.overflow ?? []).filter((item) => item !== head && live(g, item));
  g.overflow = rest.length ? rest : undefined;
  return true;
}
