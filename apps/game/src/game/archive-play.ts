import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  allCrew,
  allEvents,
  allFillerLists,
  allHulls,
  allSectors,
  allShipEvents,
  allWeapons,
  hullDef,
  rewardTable,
  sectorDef,
  type EventChoice,
  type EventDef,
} from "@stl/pack";
import type { Beacon, Game } from "./types.ts";
import { START_SECTOR } from "./sector-ids.ts";
import {
  choose,
  chooseSector,
  commitJump,
  continueReward,
  createGame,
  ftlDriveCharging,
  halted,
  jumpBlocked,
  leaveStore,
  loadGame,
  orderCrew,
  powerUp,
  saveGame,
  step,
} from "./sim.ts";
import { extractArchive, type FtlExtract } from "@stl/ftldat";
import { loadExtractedPack } from "./pack/install.ts";

/** Same seed for every archive, so a failure names one run. */
export const PLAY_SEED = 2;

const PREFERRED_HULL = "PLAYER_SHIP_HARD";
const MAX_CARDS = 40;
const MAX_JUMPS = 25;
/**
 * Slowest in-fight charge is 67.9s at one unmanned bar.
 * Ion or a repair can hold the drive, so the wait is longer than that cell.
 */
const CHARGE_S = 120;

const GAP_URL = new URL("../../../../packages/campaign/base.ftl", import.meta.url);
const STAND_IN_URL = new URL(
  "../../../../packages/totallynotftl/totallynotftl.dat",
  import.meta.url,
);

export type ArchiveCase = {
  name: string;
  bytes: Uint8Array;
  /** Node test timeout. A real archive spends this on unpack. */
  timeout?: number;
};

let gapBytes: Uint8Array | undefined;
let gapExtract: FtlExtract | undefined;
let choiceIndex: Map<string, EventChoice> | undefined;

/** The stand-in always. `FTL_DAT` and comma-separated `STL_DATS` join it when set. */
export function archiveCases(): ArchiveCase[] {
  const cases: ArchiveCase[] = [{ name: "totallynotftl", bytes: readFileSync(STAND_IN_URL) }];
  const ftl = process.env.FTL_DAT?.trim();
  if (ftl) cases.push({ name: "ftl.dat", bytes: readFileSync(ftl), timeout: 120_000 });
  const extra = process.env.STL_DATS;
  if (extra) {
    for (const path of extra.split(",")) {
      const name = path.trim();
      if (!name) continue;
      cases.push({ name, bytes: readFileSync(name), timeout: 120_000 });
    }
  }
  return cases;
}

/** The title-screen pack for an archive that is already unpacked. Returns the merged extract. */
export async function installExtract(archive: FtlExtract): Promise<FtlExtract> {
  gapBytes ??= readFileSync(GAP_URL);
  gapExtract ??= await extractArchive(gapBytes);
  choiceIndex = undefined;
  return loadExtractedPack(archive, gapExtract);
}

/** The title-screen pack: this archive, then the gap mod. Returns the merged extract. */
export async function installArchive(bytes: Uint8Array): Promise<FtlExtract> {
  return installExtract(await extractArchive(bytes));
}

/** `PLAYER_SHIP_HARD` when the archive has it, otherwise the first hull with health and a layout. */
export function playerHull() {
  const preferred = hullDef(PREFERRED_HULL);
  if (preferred) return preferred;
  const found = allHulls().find((hull) => hull.health != null && hull.layout);
  assert.ok(found, "no playable hull");
  return found;
}

/** A loaded pack can start a run: start sector, a player hull, crew, weapons, and the gap rewards. */
export function assertPlayable(): void {
  assert.ok(sectorDef(START_SECTOR), START_SECTOR);
  playerHull();
  assert.ok(allCrew().length > 0);
  assert.ok(allWeapons().length > 0);
  assert.ok(allSectors().length > 0);
  assert.ok(allHulls().length > 0);
  assert.ok(rewardTable());
}

export function freshGame(): Game {
  return createGame(PLAY_SEED, playerHull().id);
}

export function assertNewGame(g: Game): void {
  assert.equal(g.sector, 1);
  assert.equal(g.sectorId, START_SECTOR);
  assert.ok(g.player.hull > 0);
  assert.ok(g.fuel > 0);
  assert.ok(g.crew.some((crew) => crew.side === "player"));
  assert.ok(g.beacons.some((beacon) => beacon.kind === "start"));
  assert.ok(g.beacons.some((beacon) => beacon.kind === "exit"));
  assert.ok(g.beacons.some((beacon) => beacon.id === g.here));
  assert.ok(g.phase === "map" || g.phase === "event" || g.phase === "combat");
}

/** Dismiss the opening, then jump to the exit. A fight charges the drive and jumps along the path. */
export function walkToExit(g: Game): void {
  const startFuel = g.fuel;
  settle(g);
  let hops = 0;
  while (here(g)?.kind !== "exit") {
    stop(g);
    if (g.fuel < 1) fail(g, "out of fuel before the exit");
    if (hops >= MAX_JUMPS) fail(g, "took more than 25 jumps");
    const hop = jumpTarget(g);
    if (!hop) fail(g, "no path to the exit");
    if (g.phase !== "map") settle(g);
    if (here(g)?.kind === "exit") break;
    jumpToward(g, hop);
    hops += 1;
    settle(g);
  }
  stop(g);
  assert.equal(here(g)?.kind, "exit");
  assert.ok(g.player.hull > 0);
  assert.ok(g.jumps > 0);
  assert.ok(g.fuel < startFuel);
}

/**
 * From the exit, open the sector chart and take the first linked sector.
 * A filler exit returns to the map first; one step then offers the jump.
 */
export function enterSectorTwo(g: Game): void {
  walkToExit(g);
  for (let card = 0; card < MAX_CARDS && !g.sectorMap; card++) {
    stop(g);
    if (g.phase === "map") {
      step(g, 0.05);
      if (g.phase === "map" && !g.sectorMap) fail(g, "exit did not open the sector chart");
      continue;
    }
    settle(g);
  }
  if (!g.sectorMap) fail(g, "exit did not open the sector chart");
  const node = g.route.find((item) => item.id === g.routeHere);
  const next = node?.links[0];
  if (!next) fail(g, "no sector linked from the chart");
  chooseSector(g, next);
  assert.equal(g.sector, 2);
  assert.ok(g.beacons.some((beacon) => beacon.id === g.here));
  assert.ok(g.phase === "map" || g.phase === "event");
  assert.ok(g.player.hull > 0);
}

/** Save and load through a storage stand-in. Node has no localStorage unless one is installed. */
export function assertSaveRoundTrip(g: Game): void {
  const mem = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => void mem.set(key, value),
      removeItem: (key: string) => void mem.delete(key),
    },
  });
  try {
    saveGame(g);
    const loaded = loadGame();
    assert.ok(loaded);
    assert.equal(loaded.seed, g.seed);
    assert.equal(loaded.sectorId, g.sectorId);
    assert.equal(loaded.here, g.here);
    assert.equal(loaded.player.hull, g.player.hull);
    assert.equal(loaded.fuel, g.fuel);
    assert.equal(
      loaded.crew.filter((crew) => crew.side === "player").length,
      g.crew.filter((crew) => crew.side === "player").length,
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
}

function settle(g: Game): void {
  for (let card = 0; card < MAX_CARDS; card++) {
    if (g.phase === "defeat" || g.phase === "victory") return;
    if (g.phase === "map") return;
    if (g.phase === "store") {
      assert.ok(g.stock && g.stock.length > 0, "store opened with nothing on the shelf");
      leaveStore(g);
      continue;
    }
    if (g.phase === "reward") {
      continueReward(g);
      continue;
    }
    if (g.phase === "combat") {
      chargeAndJump(g);
      continue;
    }
    if (g.phase === "event") {
      press(g);
      continue;
    }
    fail(g, `unexpected phase ${g.phase}`);
  }
  fail(g, "event did not return to the map");
}

function chargeAndJump(g: Game): void {
  const beacon = g.here;
  seatPilot(g);
  let charged = 0;
  while (g.phase === "combat" && g.flee < 1 && charged < CHARGE_S) {
    // Ion clamps the bars off and does not put them back. One bar lets the drive charge.
    if (jumpBlocked(g) === "Engines are unpowered.") powerUp(g, "engines");
    step(g, 0.05);
    charged += 0.05;
  }
  if (g.phase !== "combat") return;
  if (g.flee < 1) {
    const why = jumpBlocked(g);
    fail(g, why ? `${why} at ${beacon}` : `FTL drive did not charge at ${beacon}`);
  }
  const hop = jumpTarget(g);
  if (!hop) fail(g, `no jump from the fight at ${beacon}`);
  jumpToward(g, hop);
}

function jumpToward(g: Game, hop: string): void {
  const beacon = g.here;
  seatPilot(g);
  let waited = 0;
  // A distress can take the pilot. The drive also waits out a hazard or boarders.
  while (waited < CHARGE_S && (jumpBlocked(g) || ftlDriveCharging(g))) {
    if (g.phase === "defeat") fail(g, "defeated while the jump drive charged");
    if ((g.phase !== "map" && g.phase !== "combat") || halted(g)) break;
    if (jumpBlocked(g) === "Engines are unpowered.") powerUp(g, "engines");
    step(g, 0.05);
    waited += 0.05;
  }
  commitJump(g, hop);
  if (g.here === beacon) {
    const why = jumpBlocked(g);
    fail(g, why ? `${why} at ${beacon}` : `jump did not leave ${beacon}`);
  }
}

/** An empty pilot chair cannot jump. Send one living crew member, as a player would. */
function seatPilot(g: Game): void {
  if (jumpBlocked(g) !== "Nobody is piloting.") return;
  const room = g.player.rooms.find((item) => item.system === "pilot");
  if (!room) return;
  const crew = g.crew.find(
    (member) => member.side === "player" && member.hp > 0 && member.aboard === "player",
  );
  if (crew) orderCrew(g, crew.id, room.id);
}

function press(g: Game): void {
  const event = g.event;
  if (!event || event.choices.length === 0) fail(g, "event has no choices");
  const order = [...event.choices].sort((a, b) => rank(g, a.id) - rank(g, b.id));
  const before = signature(g);
  for (const choice of order) {
    choose(g, choice.id);
    if (signature(g) !== before) return;
  }
  fail(
    g,
    `no choice moved the card ${event.title}: ${event.choices.map((choice) => choice.id).join(", ")}`,
  );
}

function rank(g: Game, id: string): number {
  const onExit = here(g)?.kind === "exit";
  if (onExit && id === "exit-leave") return 0;
  if (onExit && id === "exit-continue") return 1;
  if (id === "ack" || id === "fuel-wait-done") return 2;
  const choice = lookup(id);
  if (choice && dangerous(choice)) return 50;
  if (choice) return 10;
  return 20;
}

function dangerous(choice: EventChoice): boolean {
  if (choice.boarders) return true;
  return !!(choice.ship?.hostile && choice.ship.load);
}

function lookup(id: string): EventChoice | undefined {
  choiceIndex ??= indexChoices();
  return choiceIndex.get(id);
}

function indexChoices(): Map<string, EventChoice> {
  const map = new Map<string, EventChoice>();
  const add = (choice: EventChoice) => {
    if (!map.has(choice.id)) map.set(choice.id, choice);
  };
  const nest = (choices: readonly EventChoice[]) => {
    for (const choice of choices) {
      if (!choice.choices) continue;
      for (const child of choice.choices) add(child);
      nest(choice.choices);
    }
  };
  const pages = packPages();
  for (const page of pages) for (const choice of page.choices) add(choice);
  for (const page of pages) nest(page.choices);
  return map;
}

function packPages(): EventDef[] {
  const pages = [...allEvents()];
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

function jumpTarget(g: Game): string | undefined {
  const exit = g.beacons.find((beacon) => beacon.kind === "exit");
  if (exit && exit.id !== g.here) {
    const byId = new Map(g.beacons.map((beacon) => [beacon.id, beacon]));
    const path = route(g, byId, exit.id, true) ?? route(g, byId, exit.id, false);
    if (path && path.length > 1) return path[1];
  }
  return here(g)?.links[0];
}

function route(
  g: Game,
  byId: Map<string, Beacon>,
  exitId: string,
  avoid: boolean,
): string[] | undefined {
  const prev = new Map<string, string | null>([[g.here, null]]);
  const queue = [g.here];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id == null) break;
    if (id === exitId) break;
    const beacon = byId.get(id);
    if (!beacon) continue;
    for (const link of beacon.links) {
      if (prev.has(link)) continue;
      const next = byId.get(link);
      if (!next) continue;
      if (avoid && next.id !== exitId && (next.kind === "hostile" || next.kind === "boss"))
        continue;
      prev.set(link, id);
      queue.push(link);
    }
  }
  if (!prev.has(exitId)) return undefined;
  const path: string[] = [];
  for (let id: string | null = exitId; id != null; id = prev.get(id) ?? null) path.push(id);
  path.reverse();
  return path;
}

function here(g: Game): Beacon | undefined {
  return g.beacons.find((beacon) => beacon.id === g.here);
}

function signature(g: Game): string {
  const ids = g.event?.choices.map((choice) => choice.id).join(",") ?? "";
  return `${g.phase}|${g.here}|${g.sector}|${g.sectorMap ? 1 : 0}|${g.event?.title ?? ""}|${ids}`;
}

function stop(g: Game): void {
  if (g.phase === "defeat") fail(g, "the run was lost");
  if (g.phase === "victory") fail(g, "the run ended early");
}

function fail(g: Game, message: string): never {
  const beacon = here(g);
  throw new Error(
    `${message} (sector ${g.sector} ${g.sectorId}, ${beacon?.kind ?? "no beacon"} ${g.here}, ${g.phase})`,
  );
}
