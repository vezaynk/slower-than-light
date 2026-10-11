import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AIRLOCK_C,
  BREACH_C,
  BREATH_PER_CREW,
  CLOSED_DOOR_C,
  FIRE_BURN,
  HULL_LEAK,
  OPEN_DOOR_C,
  REFILL,
  VACUUM_FALLOFF,
  VACUUM_REACH,
  stepAir,
  vacuumExposure,
  volume,
  type AirInputs,
} from "./air.ts";
import { createGame } from "./sim.ts";
import type { Door, Room, Ship } from "./types.ts";

function room(id: string, w: number, h: number, o2 = 100): Room {
  return { id, x: 0, y: 0, w, h, o2, fire: 0, breach: 0, breachFix: 0, title: id } as unknown as Room;
}

function door(a: string, b: string, open = true): Door {
  return { a, b, open } as unknown as Door;
}

function ship(rooms: Room[], doors: Door[]): Ship {
  return { rooms, doors } as unknown as Ship;
}

const off = (over: Partial<AirInputs> = {}): AirInputs => ({
  o2Bars: 0,
  doorLevel: 1,
  breathers: new Map(),
  lanius: new Map(),
  ...over,
});

function run(s: Ship, input: AirInputs, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds - 1e-9; t += dt) stepAir(s, input, dt);
}

const amount = (s: Ship) => s.rooms.reduce((n, r) => n + r.o2 * volume(r), 0);

/** What the passive hull leak leaves of a room's air after `t` seconds. */
const kept = (t: number) => Math.exp((-HULL_LEAK / 100) * t);

describe("air model (air.ts, INTENTIONALLY OVERRIDING SPEC)", () => {
  it("a full room pushes 16 tile-%/s into an empty one through an open door, and less as they converge", () => {
    const a = room("a", 2, 1, 100);
    const b = room("b", 2, 1, 0);
    const s = ship([a, b], [door("a", "b")]);
    stepAir(s, off(), 0.001);
    // 16 tile-%/s for 1 ms over 2 tiles is 0.008% each way.
    assert.ok(Math.abs(100 * kept(0.001) - a.o2 - 0.008) < 1e-4, `${a.o2}`);
    assert.ok(Math.abs(b.o2 - 0.008) < 1e-4, `${b.o2}`);
    assert.equal(OPEN_DOOR_C * 100, 16);
    // Against a half-full neighbour the push is half as strong.
    const c = room("c", 2, 1, 100);
    const d = room("d", 2, 1, 50);
    stepAir(ship([c, d], [door("c", "d")]), off(), 0.001);
    assert.ok(Math.abs(100 * kept(0.001) - c.o2 - 0.004) < 1e-4, `${c.o2}`);
  });

  it("sealed rooms even out to their volume-weighted average and lose only the hull leak", () => {
    const big = room("big", 2, 2, 100);
    const small = room("small", 1, 1, 0);
    const s = ship([big, small], [door("big", "small")]);
    const before = amount(s);
    run(s, off(), 60);
    assert.ok(Math.abs(amount(s) - before * kept(60)) < 1e-6);
    const even = 80 * kept(60);
    assert.ok(Math.abs(big.o2 - even) < 0.1 && Math.abs(small.o2 - even) < 0.1, `${big.o2} ${small.o2}`);
  });

  it("a bigger room empties more slowly through the same breach", () => {
    const small = room("small", 2, 1);
    const big = room("big", 2, 2);
    small.breach = 1;
    big.breach = 1;
    stepAir(ship([small], []), off(), 1);
    stepAir(ship([big], []), off(), 1);
    // A 2-tile room loses about 8%/s when full; a 4-tile room about half that.
    assert.ok(Math.abs(small.o2 - 100 * kept(1) * Math.exp(-BREACH_C / 2)) < 1e-9);
    assert.ok(Math.abs(big.o2 - 100 * kept(1) * Math.exp(-BREACH_C / 4)) < 1e-9);
    assert.ok(100 - small.o2 > 7.5 && 100 - small.o2 < 8);
    assert.ok(big.o2 > small.o2);
  });

  it("an open airlock empties its room in about half a second, and space reaches through open doors beyond it", () => {
    const lock = room("lock", 2, 1);
    const next = room("next", 2, 1);
    const far = room("far", 2, 1);
    const shut = room("shut", 2, 1);
    const s = ship([lock, next, far, shut], [door("lock", "void"), door("lock", "next"), door("next", "far"), door("lock", "shut", false)]);
    assert.deepEqual(
      Object.fromEntries(vacuumExposure(s)),
      { lock: 1, next: VACUUM_REACH, far: VACUUM_REACH * VACUUM_FALLOFF },
    );
    run(s, off(), 0.5);
    assert.ok(lock.o2 < 15, `${lock.o2}`);
    // The neighbour feels a quarter of the vacuum on top of its door: most of its air is gone in 2 s, yet it empties
    // well behind the airlock room itself.
    run(s, off(), 1.5);
    assert.ok(next.o2 > lock.o2 && next.o2 < 30, `${next.o2}`);
    run(s, off(), 8);
    assert.ok(next.o2 < 5 && far.o2 < 5, `${next.o2} ${far.o2}`);
    // A closed door passes none of the pull.
    assert.ok(shut.o2 > 85, `${shut.o2}`);
    assert.ok(AIRLOCK_C > OPEN_DOOR_C * 40);
  });

  it("with every door and airlock open, a Kestrel on level-1 Oxygen loses its air fairly quickly", () => {
    const g = createGame(3, "kestrel-a");
    const s = g.player;
    for (const d of s.doors) d.open = true;
    for (const r of s.rooms) r.o2 = 100;
    const avg = () => amount(s) / s.rooms.reduce((n, r) => n + volume(r), 0);
    run(s, off({ o2Bars: 1 }), 8);
    assert.ok(avg() < 10, `${avg()}`);
    run(s, off({ o2Bars: 1 }), 12);
    for (const r of s.rooms) assert.ok(r.o2 <= 5, `${r.id} ${r.o2}`);
  });

  it("a closed airlock seals; closed interior doors seep less at each Door System level", () => {
    const lock = room("lock", 2, 1);
    stepAir(ship([lock], [door("lock", "void", false)]), off(), 10);
    assert.ok(Math.abs(lock.o2 - 100 * kept(10)) < 1e-9);
    const seep = (level: number) => {
      const a = room("a", 2, 1, 100);
      const b = room("b", 2, 1, 0);
      run(ship([a, b], [door("a", "b", false)]), off({ doorLevel: level }), 10);
      return b.o2;
    };
    const levels = [0, 1, 2, 3, 4].map(seep);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] < levels[i - 1], `${levels}`);
    assert.ok(levels[4] < 1);
    assert.ok(CLOSED_DOOR_C[1] < OPEN_DOOR_C);
  });

  it("crew breathe a fixed amount, so a crowded small room thins faster than a big one", () => {
    const small = room("small", 1, 1, 50);
    const big = room("big", 2, 2, 50);
    stepAir(ship([small, big], []), off({ breathers: new Map([["small", 2], ["big", 2]]) }), 1);
    assert.ok(Math.abs(small.o2 - (50 - 2 * BREATH_PER_CREW) * kept(1)) < 1e-9);
    assert.ok(Math.abs(big.o2 - (50 - (2 * BREATH_PER_CREW) / 4) * kept(1)) < 1e-9);
    // A sealed, unpowered room with nobody in it loses only the hull leak.
    const empty = room("empty", 2, 1, 70);
    stepAir(ship([empty], []), off(), 10);
    assert.ok(Math.abs(empty.o2 - 70 * kept(10)) < 1e-9);
  });

  it("Oxygen refills every room by the same %, 1.2/4.8/8.4 per second by level, and fire burns a fixed amount", () => {
    for (const [bars, rate] of [[1, 1.2], [2, 4.8], [3, 8.4]] as const) {
      const a = room("a", 1, 1, 50);
      const b = room("b", 2, 2, 50);
      stepAir(ship([a, b], []), off({ o2Bars: bars }), 1);
      const want = (50 + rate) * kept(1);
      assert.ok(Math.abs(a.o2 - want) < 1e-9 && Math.abs(b.o2 - want) < 1e-9, `${bars}`);
    }
    assert.equal(REFILL, 1.2);
    const lit = room("lit", 2, 1, 50);
    lit.fire = 1;
    stepAir(ship([lit], []), off(), 1);
    assert.ok(Math.abs(lit.o2 - (50 - FIRE_BURN / 2) * kept(1)) < 1e-9);
  });

  it("crew breathe half a tile's level-1 refill and every room leaks a quarter of it", () => {
    assert.equal(BREATH_PER_CREW, REFILL / 2);
    assert.equal(HULL_LEAK, REFILL / 4);
    // A full, empty, unpowered room seeps about 0.3%/s.
    const idle = room("idle", 2, 2, 100);
    stepAir(ship([idle], []), off(), 1);
    assert.ok(Math.abs(100 - idle.o2 - 0.3) < 0.001, `${idle.o2}`);
    // Level 1 still gains on one crew member in a 1-tile room: 1.2 - 0.6 - 0.15 (the leak at half air).
    const cell = room("cell", 1, 1, 50);
    run(ship([cell], []), off({ o2Bars: 1, breathers: new Map([["cell", 1]]) }), 10);
    assert.ok(cell.o2 > 54 && cell.o2 < 55, `${cell.o2}`);
    // Unpowered, that room thins.
    const dark = room("dark", 1, 1, 50);
    run(ship([dark], []), off({ breathers: new Map([["dark", 1]]) }), 10);
    assert.ok(dark.o2 < 50 - 6, `${dark.o2}`);
  });

  it("Oxygen-3 holds a full 2-tile room against one breach, and Oxygen-2 does not", () => {
    const hold = (bars: number) => {
      const r = room("r", 2, 1, 100);
      r.breach = 1;
      run(ship([r], []), off({ o2Bars: bars }), 30);
      return r.o2;
    };
    assert.ok(hold(3) > 95, `${hold(3)}`);
    assert.ok(hold(2) < 70, `${hold(2)}`);
  });

  it("a Lanius is a breach-sized hole, and several stack", () => {
    const one = room("one", 2, 1);
    const two = room("two", 2, 1);
    stepAir(ship([one, two], []), off({ lanius: new Map([["one", 1], ["two", 2]]) }), 1);
    assert.ok(Math.abs(one.o2 - 100 * kept(1) * Math.exp(-BREACH_C / 2)) < 1e-9);
    assert.ok(Math.abs(two.o2 - 100 * kept(1) * Math.exp((-2 * BREACH_C) / 2)) < 1e-9);
  });

  it("stays within 0-100 and is stable at any tick length", () => {
    const lock = room("lock", 1, 1);
    const next = room("next", 2, 2, 30);
    const s = ship([lock, next], [door("lock", "void"), door("lock", "next")]);
    stepAir(s, off({ o2Bars: 3 }), 5);
    for (const r of s.rooms) assert.ok(r.o2 >= 0 && r.o2 <= 100, `${r.id} ${r.o2}`);
  });
});
