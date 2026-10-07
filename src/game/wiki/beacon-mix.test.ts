import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { SECTOR_MIX, classifyEvent, takeLines, type MixEvent } from "./beacon-mix.ts";
import { citedPagesFor, stampCitedEvents } from "./cited-events.ts";

/**
 * A fresh map dealt as `name`. createGame already stamped the starting sector onto these beacons.
 * nextSector builds a new map and stamps once, so the starting flags are cleared first.
 */
function dealt(seed: number, name: string, sector = 4): Game {
  const g = createGame(seed);
  g.sector = sector;
  g.sectorName = name;
  // createGame already stamped Civilian (Starting) Sector onto this map. A later sector is a new
  // map; clear that stamp. The same name is already the one pass, and a second stamp would no-op.
  if (name !== "Civilian (Starting) Sector") {
    for (const b of g.beacons) {
      if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
      b.flag = "";
      b.kind = "empty";
    }
    stampCitedEvents(g);
  }
  return g;
}

const middles = (g: Game) => g.beacons.filter((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
const byDest = (dest: string): MixEvent => {
  for (const name of Object.keys(SECTOR_MIX)) {
    const ev = citedPagesFor(name).find((e) => e.dest === dest);
    if (ev) return ev;
  }
  throw new Error(dest);
};

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
      for (let col = 0; col <= 5; col++) assert.ok(g.beacons.some((b) => b.col === col), `${seed} col ${col}`);
    }
    assert.ok(counts.size > 1);
  });

  it("lists every sector type the Sectors page gives beacon counts for", () => {
    assert.equal(Object.keys(SECTOR_MIX).length, 19);
    const civ = SECTOR_MIX["Civilian Sector"].find((l) => l.slot === "hostile");
    assert.deepEqual([civ?.lo, civ?.hi, civ?.quote], [6, 8, "6-8 hostile encounters"]);
    const neb = SECTOR_MIX["Slug Controlled Nebula"].find((l) => l.slot === "nebula-hostile");
    assert.deepEqual([neb?.lo, neb?.hi], [5, 7]);
    const start = SECTOR_MIX["Civilian (Starting) Sector"].filter((l) => l.slot === "hostile");
    assert.deepEqual(start.map((l) => [l.lo, l.hi]), [[4, 6], [2, 2]]);
  });

  it("classifies from the event lists first, then from the page's own choices", () => {
    assert.equal(classifyEvent(byDest("Pirate toll")), "hostile");
    assert.equal(classifyEvent(byDest("Auto-ship attacking civilian")), "hostile");
    assert.equal(classifyEvent(byDest("Auto-ship near storage station")), "neutral");
    assert.equal(classifyEvent(byDest("Pirate ship distress trap")), "distress");
    assert.equal(classifyEvent(byDest("Free weapon")), "items");
    assert.equal(classifyEvent(byDest("Zoltan fight")), "hostile");
    assert.equal(classifyEvent(byDest("Deactivated Auto-ship")), "neutral");
  });

  it("fills each line in order and stops when the map is full", () => {
    // Sectors, Technical details: min and max inclusive, then the next line, then stop.
    assert.deepEqual(takeLines([2, 3, 7], 20), [2, 3, 7]);
    assert.deepEqual(takeLines([2, 2, 3, 1, 1, 7, 1, 5], 11), [2, 2, 3, 1, 1, 2, 0, 0]);
    assert.deepEqual(takeLines([0, 10], 5), [0, 5]);
    assert.equal(takeLines([2, 2, 3, 1, 1, 7, 1, 5], 11).reduce((a, b) => a + b, 0), 11);
  });

  it("re-deals every free beacon, is deterministic per seed, and leaves start, exit and existing flags", () => {
    for (const name of Object.keys(SECTOR_MIX)) {
      for (let seed = 1; seed <= 20; seed++) {
        const a = dealt(seed, name);
        const b = dealt(seed, name);
        assert.deepEqual(
          a.beacons.map((x) => [x.kind, x.flag]),
          b.beacons.map((x) => [x.kind, x.flag]),
          name,
        );
        assert.equal(a.beacons.filter((x) => x.kind === "start").length, 1);
        const flags = a.beacons.map((x) => x.flag).filter((f) => f.startsWith("cited:"));
        assert.equal(new Set(flags).size, flags.length, name);
        // Running the stamp again does not re-deal.
        const before = JSON.stringify(a.beacons);
        stampCitedEvents(a);
        assert.equal(JSON.stringify(a.beacons), before);
      }
    }
    // A beacon that already has a flag is not a free slot, so the deal leaves it.
    const kept = createGame(3);
    const mid = kept.beacons.find((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss");
    if (!mid) throw new Error("no middle beacon");
    mid.flag = "keep-me";
    kept.sectorName = "Civilian Sector";
    stampCitedEvents(kept);
    assert.equal(kept.beacons.find((b) => b.id === mid.id)?.flag, "keep-me");
  });

  it("keeps a store, the special events, and plain hostile beacons for the sector's ship list", () => {
    for (const name of Object.keys(SECTOR_MIX)) {
      let plain = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const g = dealt(seed, name);
        const lines = SECTOR_MIX[name];
        const mustStore = lines.some((l) => l.slot === "store" && l.lo > 0);
        if (mustStore) assert.ok(g.beacons.some((b) => b.kind === "store"), `${name} ${seed}`);
        for (const l of lines.filter((x) => x.event)) {
          const page = citedPagesFor(name).find((e) => e.dest === l.event);
          if (page) assert.ok(g.beacons.some((b) => b.flag === page.flag), `${name} ${l.event}`);
        }
        plain += g.beacons.filter((b) => b.kind === "hostile").length;
      }
      assert.ok(plain > 0, name);
    }
  });

  it("gives The Last Stand its 3 repair stations and 1 store", () => {
    const g = dealt(5, "The Last Stand", 8);
    assert.equal(g.beacons.filter((b) => b.flag === "last-stand-repair").length, 3);
    assert.equal(g.beacons.filter((b) => b.kind === "store").length, 1);
  });

  it("hostile slots outnumber neutral ones where the page says so (Civilian Sector 6-8 vs 2-4)", () => {
    let hostile = 0;
    let neutral = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const g = dealt(seed, "Civilian Sector");
      for (const b of middles(g)) {
        if (b.kind === "hostile") hostile++;
        const page = citedPagesFor("Civilian Sector").find((e) => e.flag === b.flag);
        if (page && classifyEvent(page) === "hostile") hostile++;
        if (page && classifyEvent(page) === "neutral") neutral++;
      }
    }
    assert.ok(hostile > neutral * 1.5, `${hostile} vs ${neutral}`);
  });

  it("reaches every cited page whose line still fits on the smallest map", () => {
    // Sectors, Technical details: once the map is full the process stops, so a page from a
    // later line can be absent. A line that still has room when every earlier line rolls its
    // maximum does get events. INFERRED: a 19-beacon map keeps the start and the exit, so 17 remain.
    const minFree = 17;
    const hostileSlots = new Set(["hostile", "nebula-hostile", "storm", "boarder", "environment"]);
    for (const name of Object.keys(SECTOR_MIX)) {
      let prevMax = 0;
      const guaranteed = new Set<string>();
      for (const line of SECTOR_MIX[name]) {
        if (prevMax < minFree && line.hi > 0) {
          if (hostileSlots.has(line.slot)) guaranteed.add("hostile");
          else if (line.slot === "neutral" || line.slot === "nebula-neutral") guaranteed.add("neutral");
          else if (line.slot === "distress" || line.slot === "items") guaranteed.add(line.slot);
        }
        prevMax += line.hi;
      }
      const pages = citedPagesFor(name).filter((p) => guaranteed.has(classifyEvent(p)));
      const want = new Set(pages.map((p) => p.flag));
      const seen = new Set<string>();
      for (let seed = 1; seed <= 200 && seen.size < want.size; seed++) {
        for (const b of dealt(seed, name).beacons) if (want.has(b.flag)) seen.add(b.flag);
      }
      const missing = pages.filter((p) => !seen.has(p.flag)).map((p) => p.dest);
      assert.deepEqual(missing, [], name);
    }
  });
});
