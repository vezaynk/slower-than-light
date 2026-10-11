import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRoute, columnLinks, createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import {
  CELL_MARGIN_PX,
  CELL_PX,
  DANGER_RADIUS,
  LINK_PX,
  beaconXY,
  connectGrid,
  dangerCentre,
  fleetToReach,
  jumpsBetween,
  overtaken,
  pickFedBase,
  pickFlagship,
  populateGrid,
} from "./sector-map.ts";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A connected map straight from the generator, as makeMap builds it. */
function grid(seed: number): Beacon[] {
  const roll = lcg(seed);
  const beacons = populateGrid(roll).map(
    (c) =>
      ({ id: `c${c.col}-r${c.row}`, col: c.col, row: c.row, x: c.x, y: c.y, links: [] }) as unknown as Beacon,
  );
  connectGrid(beacons);
  return beacons;
}

describe("beacon map (xftl doc/sector-map)", () => {
  it("fills a 6x4 grid with 20% empty cells, never more than one empty per four filled after the first", () => {
    let cells = 0;
    let runs = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const grid = populateGrid(lcg(seed));
      const empty = 24 - grid.length;
      assert.ok(empty <= 1 || empty * 4 <= grid.length + 4, `${seed}: ${grid.length}`);
      cells += grid.length;
      runs += 1;
      for (const c of grid) {
        assert.ok(c.x >= c.col * CELL_PX + CELL_MARGIN_PX && c.x <= (c.col + 1) * CELL_PX - CELL_MARGIN_PX, `x ${c.x}`);
        assert.ok(c.y >= c.row * CELL_PX + CELL_MARGIN_PX || (c.row === 0 && c.col >= 4 && c.y >= 30));
        assert.ok(c.y <= 415);
        if (c.row === 0 && c.col >= 4) assert.ok(c.y >= 30);
      }
    }
    // Sectors, lead: 19 to 24 beacons.
    assert.ok(cells / runs >= 19 && cells / runs <= 24, String(cells / runs));
  });

  it("links neighbouring cells within 165px, and every map is one piece", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = createGame(seed);
      const byId = new Map(g.beacons.map((b) => [b.id, b]));
      for (const b of g.beacons) {
        assert.ok(b.x != null && b.y != null);
        for (const id of b.links) {
          const o = byId.get(id)!;
          assert.ok(o.links.includes(b.id));
        }
        assert.ok(Number.isFinite(jumpsBetween(g.beacons, g.here, b.id)), `${seed} ${b.id}`);
      }
      // Most links obey the cutoff; only a bridge across a split may be longer.
      const short = g.beacons.flatMap((b) =>
        b.links.map((id) => {
          const [ax, ay] = beaconXY(b);
          const [bx, by] = beaconXY(byId.get(id)!);
          return Math.hypot(ax - bx, ay - by) <= LINK_PX;
        }),
      );
      assert.ok(short.filter(Boolean).length / short.length > 0.9);
    }
  });

  it("puts the exit in the two right-most columns, usually five or more jumps from the start", () => {
    let far = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      const exit = g.beacons.find((b) => b.kind === "exit");
      assert.ok(exit);
      assert.ok(exit.col >= 4, `${seed} col ${exit.col}`);
      if (jumpsBetween(g.beacons, g.here, exit.id) >= 5) far += 1;
    }
    assert.ok(far >= 54, String(far));
  });

  it("seats the Federation base 4 jumps out (5-6 on Hard) and the Flagship 3-5 jumps from it", () => {
    for (const difficulty of ["normal", "hard"] as const) {
      let base4 = 0;
      let boss35 = 0;
      for (let seed = 1; seed <= 80; seed++) {
        const beacons = grid(seed);
        const start = beacons.filter((b) => b.col === 0)[0] ?? beacons[0];
        const roll = lcg(seed * 7 + 1);
        const base = pickFedBase(beacons, start, difficulty, roll);
        assert.ok(base);
        assert.ok(difficulty === "hard" ? base.col === 3 || base.col === 4 : base.col === 2 || base.col === 3);
        const n = jumpsBetween(beacons, start.id, base.id);
        if (difficulty === "hard" ? n >= 5 && n <= 6 : n === 4) base4 += 1;
        const boss = pickFlagship(beacons, base, roll);
        assert.ok(boss && boss.col >= 4);
        assert.notEqual(boss.id, base.id);
        const m = jumpsBetween(beacons, base.id, boss.id);
        const can = beacons.some((b) => b.col >= 4 && b.id !== base.id && [3, 4, 5].includes(jumpsBetween(beacons, base.id, b.id)));
        if (can) assert.ok(m >= 3 && m <= 5, `${difficulty} ${seed} ${m}`);
        if (m >= 3 && m <= 5) boss35 += 1;
      }
      // The game gives up after 16 tries, so a few maps miss.
      assert.ok(base4 >= 50, `${difficulty} base ${base4}`);
      assert.ok(boss35 >= 60, `${difficulty} flagship ${boss35}`);
    }
  });
});

describe("danger zone (xftl doc/sector-map)", () => {
  it("is a 767px circle starting at x=-959 with a 50-300 centre height, moving 64px a step", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = createGame(seed);
      assert.ok(g.dangerY != null && g.dangerY >= 50 && g.dangerY <= 300);
      assert.deepEqual(dangerCentre(g), [-959, g.dangerY]);
      g.fleet = 2;
      assert.equal(dangerCentre(g)[0], -959 + 128);
    }
    const g = createGame(3);
    // No beacon is inside before the first jump: the circle's right edge starts at -192.
    assert.equal(-959 + DANGER_RADIUS, -192);
    assert.ok(g.beacons.every((b) => !overtaken(g, b)));
    const far = g.beacons.reduce((a, b) => (beaconXY(b)[0] > beaconXY(a)[0] ? b : a));
    const near = g.beacons.reduce((a, b) => (beaconXY(b)[0] < beaconXY(a)[0] ? b : a));
    assert.ok(fleetToReach(g, near) < fleetToReach(g, far));
    g.fleet = fleetToReach(g, near);
    assert.equal(overtaken(g, near), true);
    g.fleet -= 1;
    assert.equal(overtaken(g, near), false);
  });
});

describe("sector chart (xftl doc/sector-map, AddSectorColumn)", () => {
  it("has two sectors in the first column, then 2-4 a column, never the same count twice running", () => {
    const sizes = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const route = buildRoute(seed);
      const counts = Array.from({ length: 8 }, (_, col) => route.filter((n) => n.col === col).length);
      assert.equal(counts[0], 1);
      assert.equal(counts[7], 1);
      assert.equal(counts[1], 2);
      for (let col = 2; col <= 6; col++) {
        assert.ok(counts[col] >= 2 && counts[col] <= 4);
        assert.notEqual(counts[col], counts[col - 1], `${seed} col ${col}`);
        sizes.add(counts[col]);
      }
      for (let col = 0; col < 7; col++) {
        const from = route.filter((n) => n.col === col);
        const to = route.filter((n) => n.col === col + 1);
        // Every sector leads on, and every next sector is reachable.
        assert.ok(from.every((n) => n.links.some((id) => to.some((t) => t.id === id))));
        assert.ok(to.every((t) => from.some((n) => n.links.includes(t.id))));
      }
    }
    assert.deepEqual([...sizes].sort(), [2, 3, 4]);
  });

  it("links 4 to 2 and 2 to 4 as printed, and never crosses", () => {
    assert.deepEqual(columnLinks(4, 2), [[0, 0], [1, 0], [2, 1], [3, 1]]);
    assert.deepEqual(columnLinks(2, 4), [[0, 0], [0, 1], [1, 2], [1, 3]]);
    for (const [p, n] of [[1, 2], [2, 3], [3, 2], [3, 4], [4, 3], [2, 4], [4, 2], [3, 1], [4, 1]]) {
      const l = columnLinks(p, n);
      assert.ok(!l.some(([a, b]) => l.some(([c, d]) => a < c && b > d)), `${p}->${n}`);
    }
  });
});
