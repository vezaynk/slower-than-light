import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { SECTOR_MIX, classifyEvent, scaleCounts, type MixEvent } from "./beacon-mix.ts";
import { citedPagesFor, stampCitedEvents } from "./cited-events.ts";

/** A fresh map dealt as `name` (the sector-1 map, re-dealt under another sector name). */
function dealt(seed: number, name: string, sector = 4): Game {
  const g = createGame(seed);
  g.sector = sector;
  g.sectorName = name;
  stampCitedEvents(g);
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

  it("scales by largest remainder and keeps a floor", () => {
    assert.deepEqual(scaleCounts([2, 3, 7], 20, [1, 0, 0]), [2, 3, 7]);
    const s = scaleCounts([2, 2, 3, 1, 1, 7, 1, 5], 11, [1, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(s.reduce((a, b) => a + b, 0), 11);
    assert.ok(s[0] >= 1);
    assert.deepEqual(scaleCounts([0, 10], 5, [1, 0]), [1, 4]);
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

  it("reaches every cited page of every sector in 200 seeds", () => {
    for (const name of Object.keys(SECTOR_MIX)) {
      const pages = citedPagesFor(name);
      const want = new Set(pages.map((p) => p.flag));
      const seen = new Set<string>();
      for (let seed = 1; seed <= 200 && seen.size < pages.length; seed++) {
        for (const b of dealt(seed, name).beacons) if (want.has(b.flag)) seen.add(b.flag);
      }
      const missing = pages.filter((p) => !seen.has(p.flag)).map((p) => p.dest);
      assert.deepEqual(missing, [], name);
    }
  });
});
