/**
 * Ship, boarders, grants, autoReward, and environment already stored on an archive event.
 * A page or choice that does not carry them is left to its campaign handler.
 */
import type { KitId, SysId } from "@stl/catalog";
import type {
  ArchiveAlter,
  ArchiveBoarders,
  ArchiveGrant,
  ArchiveReward,
  EventChoice,
  EventDef,
  EventEffect,
} from "@stl/pack";
import {
  allEvents,
  allFillerLists,
  allShipEvents,
  augmentDef,
  crewDef,
  droneDef,
  eventDef,
  shipEndingPage,
  shipEventDef,
  warnPack,
  weaponDef,
} from "@stl/pack";
import { upgradeCost } from "./content.ts";
import { onCradleDeath, cradleUpgradeCost } from "./extras/cradle.ts";
import { adjustScrap } from "./extras/index.ts";
import type { KinId } from "./extras/kin.ts";
import { spikeUpgradeCost } from "./extras/spike.ts";
import {
  armEventEnvironment,
  beginBoarding,
  hurtKit,
  hurtSystem,
  isMain,
  log,
  rand,
  startCombat,
  syncIonStorm,
  syncShields,
} from "./sim.ts";
import type { Game, Kit, SystemState } from "./types.ts";
import { grantRandomItem } from "./wiki/bonus-item.ts";
import { receiveAugment, receiveDrone, receiveWeapon } from "./wiki/make-room.ts";
import {
  between,
  closeFight,
  joinCrew,
  payOffer,
  resourceBand,
  rollStandard,
  rollSurrenderOffer,
  scrapBand,
  type SurrenderOffer,
  type SurrenderTier,
} from "./wiki/surrender.ts";

const CREW: Record<string, { kin: KinId; name: string }> = {
  human: { kin: "human", name: "Human" },
  engi: { kin: "engi", name: "Engi" },
  mantis: { kin: "mantis", name: "Mantis" },
  slug: { kin: "slug", name: "Slug" },
  rock: { kin: "rock", name: "Rock" },
  energy: { kin: "energy", name: "Zoltan" },
  zoltan: { kin: "energy", name: "Zoltan" },
  crystal: { kin: "crystal", name: "Crystal" },
  anaerobic: { kin: "anaerobic", name: "Lanius" },
  lanius: { kin: "anaerobic", name: "Lanius" },
};

export type ArchiveSnap = {
  scrap: number;
  fuel: number;
  missiles: number;
  parts: number;
  hull: number;
  phase: Game["phase"];
  enemy: boolean;
  boarders: number;
  holdings: string;
};

export function archiveSnap(g: Game): ArchiveSnap {
  return {
    scrap: g.scrap,
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    hull: g.player.hull,
    phase: g.phase,
    enemy: g.enemy != null,
    boarders: boarderCount(g),
    holdings: holdings(g),
  };
}

/**
 * The pack page this beacon is showing, when it carries archive fields that take the screen.
 * A filler beacon stores `filler:` plus the event id. A page can also be found by its flag.
 */
export function showArchiveArrival(g: Game, flag: string): boolean {
  const id = flag.replace(/^filler:/, "");
  const page =
    eventDef(id) ?? allEvents().find((ev) => ev.flag === flag || ev.flag === id || ev.id === id);
  if (!page) return false;
  return showArchivePage(g, page) === true;
}

/**
 * Applies a page's effects, grants, and reward, and starts its hostile ship or its boarders.
 * True when a fight or boarding started. "unpaid" when a cost is more than the ship holds: nothing is paid.
 * False when the card should stay up. Paying effects does not by itself return true.
 */
export function showArchivePage(
  g: Game,
  page: EventDef,
  notes?: string[],
): true | false | "unpaid" {
  const lines: string[] = [];
  if (!payPageFx(g, page.fx, lines)) return "unpaid";
  for (const line of lines) {
    log(g, line);
    notes?.push(line);
  }
  if (g.player.hull <= 0) {
    g.phase = "defeat";
    g.outcome = g.training ? "tutorial" : "hull";
    g.paused = true;
    g.event = null;
    return false;
  }
  applyArchiveAlters(g, page.alters, "player");
  if (!pageHasArchive(page) && !page.environment) {
    applyArchiveAlters(g, page.alters, "enemy");
    return false;
  }
  // This page's environment replaces the one the previous event stored.
  delete g.eventStorm;
  delete g.eventNebula;
  syncIonStorm(g);
  applyGrants(g, page.grants);
  if (page.reward) payAutoReward(g, page.reward);
  if (page.ship?.hostile && page.ship.load) {
    if (g.event?.body) log(g, g.event.body);
    startCombat(
      g,
      page.ship.load,
      page.ship.asteroid === true || page.environment?.type === "asteroid",
      page.id,
      page.ship.autoBlueprint,
    );
    if (page.boarders) beamBoarders(g, page.boarders);
    armEventEnvironment(g, page.environment);
    applyArchiveAlters(g, page.alters, "enemy");
    return true;
  }
  if (page.boarders) {
    beamBoarders(g, page.boarders);
    if (!g.enemy) {
      beginBoarding(g, page.environment?.type === "PDS", page.environment?.type === "sun");
    }
    armEventEnvironment(g, page.environment);
    applyArchiveAlters(g, page.alters, "enemy");
    return g.phase === "combat";
  }
  armEventEnvironment(g, page.environment);
  applyArchiveAlters(g, page.alters, "enemy");
  return false;
}

/** The surrender page for the offer surrenderTick just marked. The enemy stays. */
export function openArchiveSurrender(g: Game): void {
  const page = shipEndingPage(shipEventDef(g.fightShip ?? undefined)?.surrender, (n) =>
    Math.floor(rand(g) * n),
  );
  presentShipPage(g, page, false);
}

/** The escape announcement, when that ending has a page. A ship with no load does not build a hull. */
export function openShipEscapePage(g: Game): void {
  const page = shipEndingPage(shipEventDef(g.fightShip ?? undefined)?.escape, (n) =>
    Math.floor(rand(g) * n),
  );
  if (!page) return;
  presentShipPage(g, page, true);
}

/** Destroyed or dead-crew ending. True when that child exists and its page resolved, so default salvage stays off. */
export function showShipVictory(g: Game, deadCrew: boolean): boolean {
  const def = shipEventDef(g.fightShip ?? undefined);
  if (!def) return false;
  const ending = deadCrew ? def.deadCrew : def.destroyed;
  if (!ending) return false;
  const page = shipEndingPage(ending, (n) => Math.floor(rand(g) * n));
  if (!page) return false;
  presentShipPage(g, page, false);
  const won = g.beacons.find((beacon) => beacon.id === g.here);
  if (won) won.resolved = true;
  g.fightEvent = null;
  return true;
}

/** Archive gotaway. True when the definition has that child, so the wiki gotaway card stays off. */
export function showShipGotAway(g: Game): boolean {
  const ending = shipEventDef(g.fightShip ?? undefined)?.gotaway;
  if (!ending) return false;
  const page = shipEndingPage(ending, (n) => Math.floor(rand(g) * n));
  if (page) presentShipPage(g, page, false);
  const beacon = g.beacons.find((item) => item.id === g.here);
  if (beacon) beacon.resolved = true;
  return true;
}

function presentShipPage(g: Game, page: EventDef | undefined, resume: boolean): void {
  if (!page) return;
  const choices = page.choices.map((choice) => ({ id: choice.id, label: choice.label }));
  if (choices.length === 0) {
    choices.push({ id: resume ? "ship-resume" : "ack", label: "Continue" });
  }
  const title = g.beacons.find((beacon) => beacon.id === g.here)?.name ?? "Event";
  g.event = { title, body: page.body, choices };
  g.targeting = false;
  g.beamAnchor = null;
  const shown = showArchivePage(g, page);
  if (shown === true || g.phase === "defeat") return;
  g.phase = "event";
  g.paused = true;
}

/**
 * Grants, reward, and boarders on the chosen result.
 * A campaign id whose handler already fought, paid, or beamed does not apply them again.
 * A hostile ship that is still only stored on the choice starts one fight.
 */
export function applyChoiceArchive(g: Game, id: string, before: ArchiveSnap): void {
  const choice = findArchiveChoice(id);
  // An empty archive surrender result goes back to the fight. resolve() already sent the phase to the map.
  if (
    choice &&
    emptySurrenderResult(choice) &&
    g.enemy &&
    g.enemySurrender?.hullPoints &&
    g.enemySurrender.offered &&
    !g.enemySurrender.refused
  ) {
    g.enemySurrender.refused = true;
    g.phase = "combat";
    g.paused = false;
    const beacon = g.beacons.find((item) => item.id === g.here);
    if (beacon && beacon.kind !== "boss") beacon.resolved = true;
    return;
  }
  if (!choice || (!choiceHasArchive(choice) && !choice.environment && !choice.alters?.length))
    return;
  if (isCampaign(id) && handlerActed(g, before)) return;
  applyArchiveAlters(g, choice.alters, "player");
  const enemyPresent = g.enemy != null;
  if (enemyPresent) applyArchiveAlters(g, choice.alters, "enemy");
  if (choice.ship && !choice.ship.hostile && !choice.ship.load && g.enemy) closeFight(g);
  applyGrants(g, choice.grants);
  if (choice.reward) payAutoReward(g, choice.reward);
  const fought = g.enemy != null || g.phase === "combat";
  if (!fought && choice.ship?.hostile && choice.ship.load) {
    startCombat(
      g,
      choice.ship.load,
      choice.ship.asteroid === true || choice.environment?.type === "asteroid",
      undefined,
      choice.ship.autoBlueprint,
    );
  }
  if (!enemyPresent) applyArchiveAlters(g, choice.alters, "enemy");
  if (choice.boarders && boarderCount(g) === before.boarders) beamBoarders(g, choice.boarders);
  if (!g.enemy && boarderCount(g) > before.boarders) {
    beginBoarding(g, choice.environment?.type === "PDS", choice.environment?.type === "sun");
  }
  armEventEnvironment(g, choice.environment);
}

function pageHasArchive(page: EventDef): boolean {
  return Boolean(page.ship || page.boarders || page.reward || page.grants?.length);
}

function choiceHasArchive(choice: EventChoice): boolean {
  return Boolean(choice.ship || choice.boarders || choice.reward || choice.grants?.length);
}

/** Refuse, an empty event, or a result with no ship, reward, grants, boarders, or environment. */
function emptySurrenderResult(choice: EventChoice): boolean {
  if (
    choice.ship ||
    choice.reward ||
    choice.grants?.length ||
    choice.boarders ||
    choice.environment ||
    choice.alters?.length
  )
    return false;
  return !choice.fx.some((fx) => fx.k !== "nothing" && fx.k !== "note");
}

function isCampaign(id: string): boolean {
  return id.startsWith("c:") || id.startsWith("q:");
}

function handlerActed(g: Game, before: ArchiveSnap): boolean {
  return (
    g.scrap !== before.scrap ||
    g.fuel !== before.fuel ||
    g.missiles !== before.missiles ||
    g.player.parts !== before.parts ||
    g.player.hull !== before.hull ||
    (g.enemy != null && !before.enemy) ||
    (g.phase === "combat" && before.phase !== "combat") ||
    boarderCount(g) > before.boarders ||
    holdings(g) !== before.holdings
  );
}

function findArchiveChoice(id: string): EventChoice | undefined {
  const events = [...allEvents(), ...shipPages()];
  for (const ev of events) {
    const top = ev.choices.find((choice) => choice.id === id);
    if (top) return top;
  }
  for (const ev of events) {
    const nested = findNested(ev.choices, id);
    if (nested) return nested;
  }
  return undefined;
}

function shipPages(): EventDef[] {
  const pages: EventDef[] = [];
  for (const ship of allShipEvents()) {
    for (const ending of [
      ship.surrender,
      ship.escape,
      ship.destroyed,
      ship.deadCrew,
      ship.gotaway,
    ]) {
      if (ending?.page) pages.push(ending.page);
    }
  }
  for (const list of allFillerLists()) {
    for (const entry of list.entries) if (entry.page) pages.push(entry.page);
  }
  return pages;
}

const ARCHIVE_SYSTEMS = new Set<SysId>([
  "shields",
  "engines",
  "weapons",
  "oxygen",
  "medbay",
  "pilot",
  "sensors",
  "doors",
]);
const ARCHIVE_KITS = new Set<KitId>(["hacking", "clonebay", "drones"]);

/** Page and choice alters. Player rows apply as soon as the cost is paid. Enemy rows wait until that ship exists. */
function applyArchiveAlters(
  g: Game,
  alters: readonly ArchiveAlter[] | undefined,
  side: "player" | "enemy",
): void {
  if (!alters?.length) return;
  if (side === "enemy" && !g.enemy) return;
  for (const alter of alters) {
    if (alter.k === "status") {
      if (alter.target === side) applyStatus(g, alter);
      continue;
    }
    if (side !== "player") continue;
    if (alter.k === "upgrade") applyUpgrade(g, alter);
    else if (alter.k === "removeCrew") applyRemoveCrew(g, alter);
    else applyRemove(g, alter);
  }
}

function applyStatus(g: Game, alter: Extract<ArchiveAlter, { k: "status" }>): void {
  if (alter.type === "divide" && alter.amount < 1) {
    warnPack(`A <status type="divide" amount="${alter.amount}"> is below 1; it is skipped.`);
    return;
  }
  const ship = alter.target === "player" ? g.player : g.enemy;
  if (!ship) return;
  if (ARCHIVE_SYSTEMS.has(alter.system as SysId)) {
    const id = alter.system as SysId;
    const sys = ship.systems[id];
    if (!sys) {
      warnPack(`A <status system="${alter.system}"> is not on this ship; it is skipped.`);
      return;
    }
    writeStatus(sys, alter.type, alter.amount);
    if (alter.type === "loss") hurtSystem(ship, id, alter.amount);
    if (id === "shields") syncShields(ship);
    return;
  }
  if (ARCHIVE_KITS.has(alter.system as KitId)) {
    const id = alter.system as KitId;
    const kit = ship.kits[id];
    if (!kit) {
      warnPack(`A <status system="${alter.system}"> is not on this ship; it is skipped.`);
      return;
    }
    writeStatus(kit, alter.type, alter.amount);
    if (alter.type === "loss") hurtKit(ship, id, alter.amount);
    return;
  }
  warnPack(`A <status system="${alter.system}"> is not on this ship; it is skipped.`);
}

function writeStatus(
  row: SystemState | Kit,
  type: "limit" | "divide" | "clear" | "loss",
  amount: number,
): void {
  if (type === "limit") {
    row.archiveLimit = amount;
    delete row.archiveDivide;
  } else if (type === "divide") {
    row.archiveDivide = amount;
    delete row.archiveLimit;
  } else if (type === "clear") {
    delete row.archiveLimit;
    delete row.archiveDivide;
  }
}

function applyUpgrade(g: Game, alter: Extract<ArchiveAlter, { k: "upgrade" }>): void {
  const steps = Math.max(0, Math.floor(alter.amount));
  if (steps === 0) return;
  const ship = g.player;
  if (alter.system === "reactor") {
    for (let i = 0; i < steps; i++) {
      if (upgradeCost("reactor", ship.reactor) == null) break;
      ship.reactor += 1;
    }
    return;
  }
  if (ARCHIVE_SYSTEMS.has(alter.system as SysId)) {
    const id = alter.system as SysId;
    const sys = ship.systems[id];
    if (!sys || sys.level <= 0) return;
    for (let i = 0; i < steps; i++) {
      if (upgradeCost(id, sys.level) == null) break;
      sys.level += 1;
      if (!isMain(id)) sys.power = sys.level;
    }
    return;
  }
  if (!ARCHIVE_KITS.has(alter.system as KitId)) return;
  const id = alter.system as KitId;
  const kit = ship.kits[id];
  if (!kit || kit.level <= 0) return;
  for (let i = 0; i < steps; i++) {
    if (!kitCanRise(id, kit.level)) break;
    kit.level += 1;
  }
}

function kitCanRise(id: KitId, level: number): boolean {
  if (id === "hacking") return spikeUpgradeCost(level) != null;
  if (id === "clonebay") return cradleUpgradeCost(level) != null;
  // Drone Control fits stop at 3. The store bundle and the hulls both use that top.
  if (id === "drones") return level < 3;
  return false;
}

function applyRemoveCrew(g: Game, alter: Extract<ArchiveAlter, { k: "removeCrew" }>): void {
  const crew = g.crew.find((c) => c.side === "player" && c.hp > 0 && (c.cloneIn ?? 0) <= 0);
  if (crew && !(alter.clone && onCradleDeath(g, crew))) {
    const index = g.crew.indexOf(crew);
    if (index >= 0) g.crew.splice(index, 1);
  }
  if (alter.text) log(g, alter.text);
}

function applyRemove(g: Game, alter: Extract<ArchiveAlter, { k: "remove" }>): void {
  const index = g.augments.indexOf(alter.name);
  if (index >= 0) g.augments.splice(index, 1);
}

type ResId = "scrap" | "fuel" | "missiles" | "parts";

const RES_LABEL: Record<ResId, string> = {
  scrap: "Scrap",
  fuel: "Fuel",
  missiles: "Missiles",
  parts: "Drone parts",
};

/** Page item_modify, hull, pursuit, and a nameless item. False, and nothing paid, when a cost is short. */
function payPageFx(g: Game, fxs: readonly EventEffect[] | undefined, notes: string[]): boolean {
  const costs: { id: ResId; n: number }[] = [];
  const gains: { id: ResId; n: number }[] = [];
  for (const fx of fxs ?? []) {
    if (fx.k !== "res") continue;
    const n = rollRange(g, fx.lo, fx.hi);
    if (fx.sign < 0) {
      if (stock(g, fx.id) < n) return false;
      costs.push({ id: fx.id, n });
    } else gains.push({ id: fx.id, n });
  }
  for (const cost of costs) {
    spend(g, cost.id, cost.n);
    notes.push(`${RES_LABEL[cost.id]}: -${cost.n}.`);
  }
  for (const gain of gains) {
    if (gain.id === "scrap") {
      if (gain.n > 0) {
        g.scrap += gain.n;
        g.scrapCollected = (g.scrapCollected ?? 0) + gain.n;
      }
    } else if (gain.id === "fuel") g.fuel += gain.n;
    else if (gain.id === "missiles") g.missiles += gain.n;
    else g.player.parts += gain.n;
    notes.push(`${RES_LABEL[gain.id]}: ${gain.n}.`);
  }
  for (const fx of fxs ?? []) {
    if (fx.k !== "hull") continue;
    if (fx.n >= 0) g.player.hull = Math.min(g.player.hullMax, g.player.hull + fx.n);
    else g.player.hull = Math.max(0, g.player.hull + fx.n);
    notes.push(fx.n >= 0 ? `Hull repairs: ${fx.n}.` : `Hull damage: ${-fx.n}.`);
  }
  for (const fx of fxs ?? []) {
    if (fx.k !== "fleet") continue;
    const last = !!fx.lastStand && (g.sector === 8 || g.sectorId === "FINAL");
    if (fx.faster) {
      g.fleet += fx.n;
      notes.push(`Rebel Fleet pursuit is doubled for ${fx.n} ${fx.n === 1 ? "jump" : "jumps"}.`);
    } else if (fx.double) {
      g.fleet *= 2;
      notes.push("Rebel Fleet pursuit is doubled.");
    } else if (last) {
      notes.push("No effect in The Last Stand.");
    } else {
      g.fleet = Math.max(0, g.fleet - fx.n);
      notes.push(`Rebel Fleet is delayed for ${fx.n} turns.`);
    }
  }
  for (const fx of fxs ?? []) {
    if (fx.k === "item") notes.push(grantRandomItem(g, fx.item));
  }
  return true;
}

function rollRange(g: Game, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return lo + Math.floor(rand(g) * (hi - lo + 1));
}

function stock(g: Game, id: ResId): number {
  if (id === "scrap") return g.scrap;
  if (id === "fuel") return g.fuel;
  if (id === "missiles") return g.missiles;
  return g.player.parts;
}

function spend(g: Game, id: ResId, n: number): void {
  if (id === "scrap") g.scrap -= n;
  else if (id === "fuel") g.fuel -= n;
  else if (id === "missiles") g.missiles -= n;
  else g.player.parts -= n;
}

function findNested(choices: EventChoice[], id: string): EventChoice | undefined {
  for (const choice of choices) {
    if (!choice.choices) continue;
    for (const nested of choice.choices) {
      if (nested.id === id) return nested;
      const deeper = nested.choices ? findNested([nested], id) : undefined;
      if (deeper) return deeper;
    }
  }
  return undefined;
}

function applyGrants(g: Game, grants: ArchiveGrant[] | undefined): void {
  for (const grant of grants ?? []) giveGrant(g, grant);
}

function giveGrant(g: Game, grant: ArchiveGrant): void {
  const count = grant.amount ?? 1;
  if (count <= 0) return;
  if (grant.kind === "crew") {
    const race = crewName(grant.id);
    if (!race) {
      warnPack(`A grant names "${grant.id}", which is not a crew race; it is skipped.`);
      return;
    }
    for (let i = 0; i < count; i++) joinCrew(g, race);
    return;
  }
  const known =
    grant.kind === "weapon"
      ? weaponDef(grant.id)
      : grant.kind === "drone"
        ? droneDef(grant.id)
        : augmentDef(grant.id);
  if (!known) {
    warnPack(`A grant names "${grant.id}", which is not a ${grant.kind}; it is skipped.`);
    return;
  }
  for (let i = 0; i < count; i++) {
    if (grant.kind === "weapon") receiveWeapon(g, grant.id);
    else if (grant.kind === "drone") receiveDrone(g, grant.id);
    else receiveAugment(g, grant.id);
  }
}

function crewName(id: string): string | undefined {
  const row = CREW[id.trim().toLowerCase()];
  if (row) return row.name;
  const titled = id.trim();
  if (Object.values(CREW).some((crew) => crew.name === titled)) return titled;
  return undefined;
}

function beamBoarders(g: Game, row: ArchiveBoarders): void {
  const crew = boarderCrew(row.class);
  const lo = Math.min(row.min, row.max);
  const hi = Math.max(row.min, row.max);
  const n = between(g, [lo, hi]);
  const hp = crewDef(crew.kin).hp;
  for (let i = 0; i < n; i++) {
    const rooms = g.player.rooms;
    const room =
      rooms[Math.min(rooms.length - 1, Math.floor(rand(g) * rooms.length))]?.id ?? "p-medbay";
    g.uid = (g.uid + 1) >>> 0;
    g.crew.push({
      id: "u" + g.uid.toString(36),
      name: crew.name,
      side: "enemy",
      aboard: "player",
      hp,
      maxHp: hp,
      room,
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: crew.kin,
    });
  }
  log(g, `${n} ${crew.name.toLowerCase()} boarders beam aboard your ship.`);
}

function boarderCrew(cls: string | undefined): { kin: KinId; name: string } {
  if (!cls?.trim()) return CREW.human!;
  const row = CREW[cls.trim().toLowerCase()];
  if (row) return row;
  warnPack(`Boarders class "${cls}" is not a race the game has crew for; human boarders are used.`);
  return CREW.human!;
}

function payAutoReward(g: Game, reward: ArchiveReward): void {
  const tier = rewardTier(g, reward.level);
  if (!tier) return;
  const name = reward.name.trim();
  if (name === "standard") {
    payOffer(g, rollStandard(g, tier), true);
    return;
  }
  if (name === "stuff") {
    payOffer(g, rollSurrenderOffer(g, tier), true);
    return;
  }
  if (name === "scrap_only") {
    payOffer(g, scrapOffer(g, tier), true);
    return;
  }
  if (name === "fuel" || name === "missiles" || name === "droneparts") {
    const offer = scrapOffer(g, tier);
    const kind = name === "droneparts" ? "parts" : name;
    offer[kind] = between(g, resourceBand(kind, tier));
    payOffer(g, offer, true);
    return;
  }
  if (name === "weapon" || name === "augment" || name === "drone") {
    const offer = scrapOffer(g, tier);
    offer.random = name;
    payOffer(g, offer, true);
  }
}

function rewardTier(g: Game, level: string): SurrenderTier | undefined {
  const key = level.trim().toUpperCase();
  if (key === "LOW") return "low";
  if (key === "MED" || key === "MEDIUM") return "medium";
  if (key === "HIGH") return "high";
  if (key === "RANDOM") {
    const bands = ["low", "medium", "high"] as const;
    return bands[Math.min(2, Math.floor(rand(g) * 3))];
  }
  return undefined;
}

function scrapOffer(g: Game, tier: SurrenderTier): SurrenderOffer {
  const eligible = between(g, scrapBand(g, tier));
  return {
    tier,
    scrap: adjustScrap(g, eligible),
    eligible,
    fuel: 0,
    missiles: 0,
    parts: 0,
  };
}

function boarderCount(g: Game): number {
  return g.crew.filter((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0).length;
}

function holdings(g: Game): string {
  const drones = g.player.kits.drones;
  return [
    g.player.weapons.map((w) => w.defId).join(","),
    g.augments.join(","),
    (g.cargo ?? []).map((c) => `${c.kind}:${c.id}`).join(","),
    `${drones?.target ?? ""}:${(drones?.loadout ?? []).join(",")}`,
    String(g.crew.filter((c) => c.side === "player" && c.hp > 0).length),
  ].join("|");
}
