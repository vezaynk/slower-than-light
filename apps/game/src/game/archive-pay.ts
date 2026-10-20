/**
 * Ship, boarders, grants, and autoReward already stored on an archive event.
 * A page or choice that does not carry them is left to its campaign handler.
 */
import type {
  ArchiveBoarders,
  ArchiveGrant,
  ArchiveReward,
  EventChoice,
  EventDef,
} from "@stl/pack";
import { allEvents, augmentDef, crewDef, droneDef, eventDef, warnPack, weaponDef } from "@stl/pack";
import { adjustScrap } from "./extras/index.ts";
import type { KinId } from "./extras/kin.ts";
import { beginBoarding, log, rand, startCombat } from "./sim.ts";
import type { Game } from "./types.ts";
import { receiveAugment, receiveDrone, receiveWeapon } from "./wiki/make-room.ts";
import {
  between,
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
  return showArchivePage(g, page);
}

/**
 * Applies a page's grants and reward, and starts its hostile ship or its boarders.
 * False when the card should stay up. A page with none of these fields is false and changes nothing.
 */
export function showArchivePage(g: Game, page: EventDef): boolean {
  if (!pageHasArchive(page)) return false;
  applyGrants(g, page.grants);
  if (page.reward) payAutoReward(g, page.reward);
  if (page.ship?.hostile) {
    if (g.event?.body) log(g, g.event.body);
    startCombat(g, page.ship.load, page.ship.asteroid === true, page.id, page.ship.autoBlueprint);
    if (page.boarders) beamBoarders(g, page.boarders);
    return true;
  }
  if (page.boarders) {
    beamBoarders(g, page.boarders);
    if (!g.enemy) beginBoarding(g);
    return g.phase === "combat";
  }
  return false;
}

/**
 * Grants, reward, and boarders on the chosen result.
 * A campaign id whose handler already fought, paid, or beamed does not apply them again.
 * A hostile ship that is still only stored on the choice starts one fight.
 */
export function applyChoiceArchive(g: Game, id: string, before: ArchiveSnap): void {
  const choice = findArchiveChoice(id);
  if (!choice || !choiceHasArchive(choice)) return;
  if (isCampaign(id) && handlerActed(g, before)) return;
  applyGrants(g, choice.grants);
  if (choice.reward) payAutoReward(g, choice.reward);
  const fought = g.enemy != null || g.phase === "combat";
  if (!fought && choice.ship?.hostile) {
    startCombat(
      g,
      choice.ship.load,
      choice.ship.asteroid === true,
      undefined,
      choice.ship.autoBlueprint,
    );
  }
  if (choice.boarders && boarderCount(g) === before.boarders) beamBoarders(g, choice.boarders);
  if (!g.enemy && boarderCount(g) > before.boarders) beginBoarding(g);
}

function pageHasArchive(page: EventDef): boolean {
  return Boolean(page.ship || page.boarders || page.reward || page.grants?.length);
}

function choiceHasArchive(choice: EventChoice): boolean {
  return Boolean(choice.ship || choice.boarders || choice.reward || choice.grants?.length);
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
  const events = allEvents();
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
