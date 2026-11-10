import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { loadPack, onPackWarning, packFromFtl, resetPackForTests, sectorMap } from "@stl/pack";
import { buildRoute, columnLinks, createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import {
  beaconXY,
  connectGrid,
  dangerCentre,
  fleetToReach,
  jumpsBetween,
  overtaken,
  pickExit,
  pickFedBase,
  pickFlagship,
  populateGrid,
  startRow,
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
      ({
        id: `c${c.col}-r${c.row}`,
        col: c.col,
        row: c.row,
        x: c.x,
        y: c.y,
        links: [],
      }) as unknown as Beacon,
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
        const cell = sectorMap("cell");
        const margin = sectorMap("margin");
        assert.ok(c.x >= c.col * cell + margin && c.x <= (c.col + 1) * cell - margin, `x ${c.x}`);
        assert.ok(
          c.y >= c.row * cell + margin ||
            (c.row === 0 && c.col >= sectorMap("cols") - 2 && c.y >= sectorMap("topRightY")),
        );
        assert.ok(c.y <= sectorMap("yMax"));
        if (c.row === 0 && c.col >= sectorMap("cols") - 2) assert.ok(c.y >= sectorMap("topRightY"));
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
          return Math.hypot(ax - bx, ay - by) <= sectorMap("link");
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
        assert.ok(
          difficulty === "hard"
            ? base.col === 3 || base.col === 4
            : base.col === 2 || base.col === 3,
        );
        const n = jumpsBetween(beacons, start.id, base.id);
        if (difficulty === "hard" ? n >= 5 && n <= 6 : n === 4) base4 += 1;
        const boss = pickFlagship(beacons, base, roll);
        assert.ok(boss && boss.col >= 4);
        assert.notEqual(boss.id, base.id);
        const m = jumpsBetween(beacons, base.id, boss.id);
        const can = beacons.some(
          (b) =>
            b.col >= 4 &&
            b.id !== base.id &&
            [3, 4, 5].includes(jumpsBetween(beacons, base.id, b.id)),
        );
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
    assert.equal(sectorMap("startX"), -959);
    assert.equal(sectorMap("dangerRadius"), 767);
    assert.equal(sectorMap("step"), 64);
    assert.equal(-959 + 767, -192);
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
      const counts = Array.from(
        { length: 8 },
        (_, col) => route.filter((n) => n.col === col).length,
      );
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
    assert.deepEqual(columnLinks(4, 2), [
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]);
    assert.deepEqual(columnLinks(2, 4), [
      [0, 0],
      [0, 1],
      [1, 2],
      [1, 3],
    ]);
    for (const [p, n] of [
      [1, 2],
      [2, 3],
      [3, 2],
      [3, 4],
      [4, 3],
      [2, 4],
      [4, 2],
      [3, 1],
      [4, 1],
    ]) {
      const l = columnLinks(p, n);
      assert.ok(!l.some(([a, b]) => l.some(([c, d]) => a < c && b > d)), `${p}->${n}`);
    }
  });
});

const MAP_SEEDS = [1, 2, 3, 7, 11, 13, 21, 42];
const SEAT_SEEDS = [1, 2, 5, 9, 17];

/** Maps drawn before the numbers moved onto `<sectorMap>`, with the stand-in loaded. */
function sectorMapProbe(): string {
  const maps = MAP_SEEDS.map((seed) => {
    const g = createGame(seed);
    return {
      seed,
      dangerY: g.dangerY,
      here: g.here,
      beacons: g.beacons.map((b) => ({
        id: b.id,
        col: b.col,
        row: b.row,
        x: b.x,
        y: b.y,
        kind: b.kind,
        links: [...b.links].sort(),
      })),
    };
  });
  const seats: {
    difficulty: string;
    seed: number;
    ids: string[];
    start: string;
    exit: string | null;
    base: string | null;
    boss: string | null;
  }[] = [];
  for (const difficulty of ["normal", "hard"] as const) {
    for (const seed of SEAT_SEEDS) {
      const beacons = grid(seed);
      const start = beacons.filter((b) => b.col === 0)[0] ?? beacons[0];
      const roll = lcg(seed * 7 + 1);
      const base = pickFedBase(beacons, start, difficulty, roll);
      const boss = base ? pickFlagship(beacons, base, roll) : undefined;
      const exit = pickExit(beacons, start, lcg(seed * 3 + 9));
      seats.push({
        difficulty,
        seed,
        ids: beacons.map((b) => `${b.id}:${b.x},${b.y}:${[...b.links].sort().join("+")}`),
        start: start.id,
        exit: exit?.id ?? null,
        base: base?.id ?? null,
        boss: boss?.id ?? null,
      });
    }
  }
  return JSON.stringify({ maps, seats });
}

function warned(run: () => void): string[] {
  const lines: string[] = [];
  const restore = onPackWarning((message) => lines.push(message));
  try {
    run();
  } finally {
    restore();
  }
  return lines;
}

describe("sector map from the gap mod", () => {
  it("matches the maps the stand-in drew before the numbers moved", () => {
    const lines = warned(() => {
      assert.equal(sectorMap("margin"), 28);
      assert.equal(sectorMap("link"), 165);
      assert.equal(
        createHash("sha256").update(sectorMapProbe()).digest("hex"),
        "0457a47e28f828436df026ad9b4d42a06c3ca7b456606c27690f004bc959b267",
      );
    });
    assert.deepEqual(lines, []);
  });

  it("follows a gap file that overrides the cell margin", () => {
    const before = populateGrid(lcg(1)).map((c) => [c.x, c.y]);
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><sectorMap margin="0"/></FTL>` }]),
      "append",
    );
    try {
      assert.equal(sectorMap("margin"), 0);
      const after = populateGrid(lcg(1)).map((c) => [c.x, c.y]);
      assert.notDeepEqual(after, before);
    } finally {
      resetPackForTests();
    }
    assert.equal(sectorMap("margin"), 28);
    assert.deepEqual(
      populateGrid(lcg(1)).map((c) => [c.x, c.y]),
      before,
    );
  });

  it("keeps a beacon when a 1×1 grid rolls empty", () => {
    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><sectorMap cols="1" rows="1" empty="1"/></FTL>` },
      ]),
      "append",
    );
    try {
      const cells = populateGrid(lcg(1));
      assert.equal(cells.length, 1);
      assert.deepEqual([cells[0].col, cells[0].row], [0, 0]);
      const g = createGame(1);
      assert.equal(g.here, "s1-c0-r0");
    } finally {
      resetPackForTests();
    }
  });

  it("picks a column in a wide range without building that range", () => {
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><sectorMap exitColMax="40000000"/></FTL>` }]),
      "append",
    );
    try {
      const beacons = grid(1);
      const start = beacons[0];
      const exit = pickExit(beacons, start, lcg(2));
      assert.ok(exit);
      assert.ok(exit.col <= 5);
    } finally {
      resetPackForTests();
    }
  });

  it("keeps a wide margin inside the cell", () => {
    loadPack(
      packFromFtl([
        { path: "data/gap.xml", xml: `<FTL><sectorMap margin="200" cell="110"/></FTL>` },
      ]),
      "append",
    );
    try {
      const lines = warned(() => {
        const cells = populateGrid(lcg(3));
        assert.ok(cells.length > 0);
        for (const c of cells) {
          assert.ok(c.x >= c.col * 110 && c.x <= (c.col + 1) * 110, `x ${c.x}`);
          assert.ok(c.y >= 0 && c.y <= 440, `y ${c.y}`);
        }
      });
      assert.ok(lines.some((line) => line.includes('margin="200"')));
    } finally {
      resetPackForTests();
    }
  });

  it("searches past 64 steps, and does not pretend a missed beacon arrived", () => {
    const y = 175;
    const far = { col: 0, row: 0, x: 0, y };
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><sectorMap startX="-10000"/></FTL>` }]),
      "append",
    );
    try {
      const n = fleetToReach({ fleet: 0, dangerY: y }, far);
      assert.ok(n > 64, `steps ${n}`);
      assert.equal(overtaken({ fleet: n, dangerY: y }, far), true);
      assert.equal(overtaken({ fleet: n - 1, dangerY: y }, far), false);
      const away = { col: 0, row: 0, x: -20000, y };
      assert.equal(Number.isFinite(fleetToReach({ fleet: 0, dangerY: y }, away)), false);
    } finally {
      resetPackForTests();
    }
    const g = createGame(3);
    for (const b of g.beacons) {
      const n = fleetToReach(g, b);
      assert.equal(overtaken({ fleet: n, dangerY: g.dangerY }, b), true, b.id);
      if (n > 0) assert.equal(overtaken({ fleet: n - 1, dangerY: g.dangerY }, b), false, b.id);
    }
  });

  it("puts the start nearest the middle of the loaded rows", () => {
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><sectorMap rows="6"/></FTL>` }]),
      "append",
    );
    try {
      assert.equal(startRow(), 2.5);
      let moved = false;
      for (let seed = 1; seed <= 30; seed++) {
        const g = createGame(seed);
        const start = g.beacons.find((b) => b.kind === "start");
        assert.ok(start, String(seed));
        const inCol = g.beacons.filter((b) => b.col === start.col);
        const nearest = (bias: number) =>
          [...inCol].sort(
            (a, b) => Math.abs(a.row - bias) - Math.abs(b.row - bias) || a.row - b.row,
          )[0];
        assert.equal(start.id, nearest(2.5).id, String(seed));
        if (nearest(1.5).id !== start.id) moved = true;
      }
      assert.equal(moved, true);
    } finally {
      resetPackForTests();
    }
  });
});
