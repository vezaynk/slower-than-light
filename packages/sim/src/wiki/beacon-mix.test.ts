import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allEmptyBeacons,
  allSectors,
  eventDef,
  fillerList,
  sectorDef,
  type SectorQuota,
} from "@stl/pack";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { takeLines } from "./beacon-mix.ts";
import { citedPagesFor, stampCitedEvents } from "./cited-events.ts";
import { placeIn } from "../fixtures.ts";

function storyFlag(flag: string): boolean {
  return flag !== "" && !flag.includes(":") && eventDef(flag) != null;
}

const BOARDERS = new Set(["LANIUS_PIRATE_BOARDERS", "BOARDERS_CRYSTAL"]);
const HOSTILE_SLOTS = new Set(["hostile", "nebula-hostile", "storm", "boarder", "environment"]);

function slotOf(id: string): string | undefined {
  const parts = id.split("__");
  if (parts.length !== 3) return undefined;
  return parts[1];
}

function isHostileQuota(id: string): boolean {
  if (BOARDERS.has(id)) return true;
  return fillerList(id)?.entries.some((entry) => entry.id.endsWith("__HOSTILE_SHIP")) ?? false;
}

/** Earlier lines whose maximums already cover a 19-beacon map leave the ship line unplaced. */
function earlierMaxFillsMap(lines: readonly SectorQuota[]): boolean {
  let used = 0;
  for (const line of lines) {
    if (isHostileQuota(line.id)) return used >= 17;
    used += line.max;
  }
  return true;
}

function isSpecial(id: string, min: number, max: number): boolean {
  if (min !== 1 || max !== 1) return false;
  if (id === "STORE" || id === "QUEST" || id === "BOSS_REPAIR_STATION") return false;
  if (id === "NEBULA" || id === "NEBULA_EMPTY" || id === "NEBULA_NOTHING_SLUG") return false;
  if (BOARDERS.has(id)) return false;
  if (allEmptyBeacons().some((page) => page.id === id)) return false;
  if (fillerList(id)) return false;
  return eventDef(id) != null;
}

function slotsFor(sectorId: string, flag: string): string[] {
  const slots: string[] = [];
  for (const quota of sectorDef(sectorId)?.quotas ?? []) {
    const slot = slotOf(quota.id);
    if (!slot) continue;
    if (fillerList(quota.id)?.entries.some((entry) => entry.id === flag)) slots.push(slot);
  }
  return slots;
}

/**
 * A fresh map dealt as `name`. createGame already stamped the starting sector onto these beacons.
 * nextSector builds a new map and stamps once, so the starting flags are cleared first.
 */
function dealt(seed: number, name: string, sector = 4): Game {
  const g = createGame(seed);
  g.sector = sector;
  placeIn(g, name);
  // createGame already stamped sector 1 (STANDARD_SPACE) onto this map. A later sector is a new
  // map; clear that stamp. The same sector is already the one pass, and a second stamp would no-op.
  if (g.sectorId !== "STANDARD_SPACE") {
    for (const b of g.beacons) {
      if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
      b.flag = "";
      b.kind = "empty";
    }
    stampCitedEvents(g);
  }
  return g;
}

const middles = (g: Game) =>
  g.beacons.filter((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");

function reachable(g: Game): number {
  const start = g.beacons.find((b) => b.kind === "start");
  if (!start) return 0;
  const seen = new Set<string>();
  const queue = [start.id];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = g.beacons.find((x) => x.id === id);
    if (!b) continue;
    for (const next of b.links) if (!seen.has(next)) queue.push(next);
  }
  return seen.size;
}

describe("beacon mix (Sectors, Beacons lists)", () => {
  it("places 19 to 24 beacons on the 6 by 4 grid, all reachable", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = createGame(seed);
      counts.add(g.beacons.length);
      assert.ok(g.beacons.length >= 19 && g.beacons.length <= 24, `${seed} ${g.beacons.length}`);
      assert.equal(g.beacons.filter((b) => b.kind === "start").length, 1);
      assert.equal(g.beacons.filter((b) => b.kind === "exit").length, 1);
      assert.equal(reachable(g), g.beacons.length);
      assert.ok(g.beacons.every((b) => b.col >= 0 && b.col <= 5 && b.row >= 0 && b.row <= 3));
      for (let col = 0; col <= 5; col++)
        assert.ok(
          g.beacons.some((b) => b.col === col),
          `${seed} col ${col}`,
        );
    }
    assert.ok(counts.size > 1);
  });

  it("fills each line in order and stops when the map is full", () => {
    // Sectors, Technical details: min and max inclusive, then the next line, then stop.
    assert.deepEqual(takeLines([2, 3, 7], 20), [2, 3, 7]);
    assert.deepEqual(takeLines([2, 2, 3, 1, 1, 7, 1, 5], 11), [2, 2, 3, 1, 1, 2, 0, 0]);
    assert.deepEqual(takeLines([0, 10], 5), [0, 5]);
    assert.equal(
      takeLines([2, 2, 3, 1, 1, 7, 1, 5], 11).reduce((a, b) => a + b, 0),
      11,
    );
  });

  it("re-deals every free beacon, is deterministic per seed, and leaves start, exit and existing flags", () => {
    for (const sector of allSectors()) {
      const name = sector.id;
      for (let seed = 1; seed <= 20; seed++) {
        const a = dealt(seed, name);
        const b = dealt(seed, name);
        assert.deepEqual(
          a.beacons.map((x) => [x.kind, x.flag]),
          b.beacons.map((x) => [x.kind, x.flag]),
          name,
        );
        assert.equal(a.beacons.filter((x) => x.kind === "start").length, 1);
        const flags = a.beacons.map((x) => x.flag).filter(storyFlag);
        // unique=false boarder pages may stamp the same flag on both beacons of the 1-2 line.
        // unique=false openers (escorts, the Engi distress, Zoltan research) may share a flag. Zoltan research stops at two.
        const repeatable = new Set([
          "LANIUS_PIRATE_BOARDERS",
          "BOARDERS_CRYSTAL",
          "QUEST_ESCORT",
          "ENGI_STATION_DISTRESS",
          "ZOLTAN_CREW_STUDY",
        ]);
        const once = flags.filter((f) => !repeatable.has(f));
        assert.ok(flags.filter((f) => f === "ZOLTAN_CREW_STUDY").length <= 2, name);
        assert.equal(new Set(once).size, once.length, name);
        // Running the stamp again does not re-deal.
        const before = JSON.stringify(a.beacons);
        stampCitedEvents(a);
        assert.equal(JSON.stringify(a.beacons), before);
      }
    }
    // A beacon that already has a flag is not a free slot, so the deal leaves it.
    const kept = createGame(3);
    const mid = kept.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
    );
    if (!mid) throw new Error("no middle beacon");
    mid.flag = "keep-me";
    kept.sectorId = "CIVILIAN_SECTOR";
    kept.sectorName = "Civilian Sector";
    stampCitedEvents(kept);
    assert.equal(kept.beacons.find((b) => b.id === mid.id)?.flag, "keep-me");
  });

  it("keeps a store, the special events, and plain hostile beacons for the sector's ship list", () => {
    for (const sector of allSectors()) {
      let plain = 0;
      const lines = sector.quotas ?? [];
      const mustStore = lines.some((line) => line.id === "STORE" && line.min > 0);
      for (let seed = 1; seed <= 40; seed++) {
        const g = dealt(seed, sector.id);
        if (mustStore)
          assert.ok(
            g.beacons.some((b) => b.kind === "store"),
            `${sector.id} ${seed}`,
          );
        for (const line of lines) {
          if (!isSpecial(line.id, line.min, line.max)) continue;
          const page = citedPagesFor(sector.id).find((e) => e.slug === line.id);
          if (page)
            assert.ok(
              g.beacons.some((b) => b.flag === page.slug),
              `${sector.id} ${page.dest}`,
            );
        }
        plain += g.beacons.filter((b) => b.kind === "hostile").length;
      }
      // A 19-beacon map keeps the start and the exit, so 17 beacons are free.
      // Engi Homeworlds puts the ship line last, after lines whose maximums already fill that map.
      if (!earlierMaxFillsMap(lines)) assert.ok(plain > 0, sector.id);
    }
  });

  it("unique=false boarder events can fill both beacons of the 1-2 line", () => {
    // Template:Locations unique=false: "This event can occur multiple times per sector."
    // Abandoned Sector and Hidden Crystal Worlds, Beacons: "1-2 boarders".
    const cases = [
      ["Abandoned Sector", "LANIUS_PIRATE_BOARDERS", 1],
      ["Hidden Crystal Worlds", "BOARDERS_CRYSTAL", 0],
    ] as const;
    for (const [sector, flag, floor] of cases) {
      let twice = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const g = dealt(seed, sector);
        const n = g.beacons.filter((b) => b.flag === flag).length;
        assert.ok(n >= floor && n <= 2, `${sector} ${seed} ${n}`);
        if (n === 2) twice++;
      }
      assert.ok(twice > 0, `${sector} never placed the event twice`);
    }
  });

  it("gives The Last Stand its 3 repair stations and 1 store", () => {
    const g = dealt(5, "The Last Stand", 8);
    assert.equal(g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION").length, 3);
    assert.equal(g.beacons.filter((b) => b.kind === "store").length, 1);
  });

  it("hostile slots outnumber neutral ones where the page says so (Civilian Sector 6-8 vs 2-4)", () => {
    let hostile = 0;
    let neutral = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const g = dealt(seed, "Civilian Sector");
      for (const b of middles(g)) {
        if (b.kind === "hostile") hostile++;
        const slots = slotsFor("CIVILIAN_SECTOR", b.flag);
        if (slots.some((slot) => HOSTILE_SLOTS.has(slot))) hostile++;
        if (slots.some((slot) => slot === "neutral" || slot === "nebula-neutral")) neutral++;
      }
    }
    assert.ok(hostile > neutral * 1.5, `${hostile} vs ${neutral}`);
  });

  it("reaches every cited page whose line still fits on the smallest map", () => {
    // Sectors, Technical details: once the map is full the process stops, so a page from a
    // later line can be absent. A line that still has room when every earlier line rolls its
    // maximum does get events. INFERRED: a 19-beacon map keeps the start and the exit, so 17 remain.
    const minFree = 17;
    for (const sector of allSectors()) {
      let prevMax = 0;
      const want = new Set<string>();
      const cited = new Set(citedPagesFor(sector.id).map((page) => page.slug));
      for (const line of sector.quotas ?? []) {
        const slot = slotOf(line.id);
        const hostile = isHostileQuota(line.id);
        const neutral = slot === "neutral" || slot === "nebula-neutral";
        const bucket = slot === "distress" || slot === "items";
        if (prevMax < minFree && line.max > 0 && (hostile || neutral || bucket)) {
          if (cited.has(line.id)) want.add(line.id);
          for (const entry of fillerList(line.id)?.entries ?? []) {
            if (entry.id.endsWith("__HOSTILE_SHIP")) continue;
            if (cited.has(entry.id)) want.add(entry.id);
          }
        }
        prevMax += line.max;
      }
      const seen = new Set<string>();
      for (let seed = 1; seed <= 200 && seen.size < want.size; seed++) {
        for (const b of dealt(seed, sector.id).beacons) {
          if (want.has(b.flag)) seen.add(b.flag);
          const bare = b.flag.startsWith("filler:") ? b.flag.slice("filler:".length) : "";
          if (bare && want.has(bare)) seen.add(bare);
        }
      }
      const missing = [...want].filter((id) => !seen.has(id)).map((id) => eventDef(id)?.dest ?? id);
      assert.deepEqual(missing, [], sector.id);
    }
  });

  it("keeps Federation loyalists off distress beacons, and haywire distress stays a distress beacon", () => {
    let haywire = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const g = dealt(seed, "Civilian Sector");
      for (const b of g.beacons) {
        if (
          b.name === "Rebel ship attacking Federation loyalists" ||
          b.flag === "REBEL_VS_FEDERATION"
        ) {
          assert.notEqual(b.kind, "distress");
        }
        // dealt() clears the flag and kind of a re-stamp but leaves the starting-sector name, so a
        // hostile beacon can still be named haywire. Only a stamped haywire flag is this page.
        if (
          b.flag === "ESCORT_BEACON" ||
          b.flag === "filler:ESCORT_BEACON" ||
          b.flag === "filler:escort-civilians-ftl-haywire"
        ) {
          assert.equal(b.kind, "distress", b.flag);
          haywire++;
        }
      }
    }
    assert.ok(haywire > 0);
  });

  it("puts nebula openers on nebula beacons", () => {
    const byFlag = new Map([
      ["QUEST_SLUG_PIRATE_TRAP", "Slug comm tapping"],
      ["NEBULA_SLUG_FIGHT_UNLOCK", "Slug Home Nebula surrender"],
      ["NEBULA_BATTLEFIELD", "Nebula wreckage"],
    ]);
    const seen = new Set<string>();
    for (const sector of ["SLUG_HOME", "SLUG_SECTOR", "NEBULA_SECTOR"]) {
      for (let seed = 1; seed <= 80; seed++) {
        for (const b of dealt(seed, sector, 5).beacons) {
          const stored = b.flag.startsWith("filler:") ? b.flag.slice("filler:".length) : b.flag;
          const name = byFlag.get(stored);
          if (!name) continue;
          assert.equal(b.kind, "nebula", `${sector} ${name}`);
          assert.equal(b.name, name);
          seen.add(stored);
        }
      }
    }
    // Slug comm tapping shares the last neutral line and is often never drawn. The two that do land are nebulae.
    assert.ok(seen.has("NEBULA_SLUG_FIGHT_UNLOCK"));
    assert.ok(seen.has("NEBULA_BATTLEFIELD"));
  });

  it("never places a third escort or a third Zoltan research facility", () => {
    // Wiki citations:
    // > "at one beacon per Zoltan sector" — [[Zoltan research facility#Trivia]]
    for (let seed = 1; seed <= 120; seed++) {
      const n = dealt(seed, "Civilian Sector").beacons.filter(
        (b) => b.flag === "QUEST_ESCORT",
      ).length;
      assert.ok(n <= 2, `Civilian Sector ${seed} ${n}`);
    }
    for (const sector of ["ZOLTAN_SECTOR", "ZOLTAN_HOME"]) {
      for (let seed = 1; seed <= 40; seed++) {
        const n = dealt(seed, sector).beacons.filter((b) => b.flag === "ZOLTAN_CREW_STUDY").length;
        assert.ok(n <= 2, `${sector} ${seed} ${n}`);
      }
    }
  });
});
