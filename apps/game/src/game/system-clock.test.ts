import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemySystemClock, ionClock, systemClock } from "./system-clock.ts";
import type { Kit, KitId, Ship, SysId } from "./types.ts";

function kit(id: KitId, patch: Partial<Kit> = {}): Kit {
  return { id, level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0, ...patch };
}

function ship(kits: Kit[] = [], ion: Partial<Record<SysId, number[]>> = {}): Ship {
  const bag: Ship["kits"] = {};
  for (const row of kits) bag[row.id] = row;
  const systems = {} as Ship["systems"];
  for (const [id, times] of Object.entries(ion)) {
    systems[id as SysId] = { level: 2, power: 2, damage: 0, ion: times ?? [], fix: 0 };
  }
  return { kits: bag, systems } as Ship;
}

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ~= ${expected}`);
}

describe("system icon clock", () => {
  it("stays off when nothing is counting", () => {
    assert.equal(systemClock(ship(), "shields"), null);
    assert.equal(systemClock(ship([kit("veil")]), "veil"), null);
    assert.equal(ionClock([]), null);
    assert.equal(ionClock(undefined), null);
  });

  it("traces ionization from the longest point, on a 5 second point", () => {
    const fresh = ionClock([5]);
    assert.equal(fresh?.tone, "ion");
    near(fresh!.progress, 0);

    const half = ionClock([1, 2.5]);
    near(half!.progress, 0.5);

    const s = ship([], { shields: [2] });
    near(systemClock(s, "shields")!.progress, 0.6);
    s.systems.shields.ion = [5, 2];
    near(systemClock(s, "shields")!.progress, 0);
  });

  it("traces a cloak as it runs, and a cut jumps the circle forward", () => {
    const s = ship([kit("veil", { on: true, left: 15 })]);
    assert.equal(systemClock(s, "veil")?.tone, "live");
    near(systemClock(s, "veil")!.progress, 0);
    s.kits.veil!.left = 12;
    near(systemClock(s, "veil")!.progress, 0.2);
    s.kits.veil!.left = 7.5;
    near(systemClock(s, "veil")!.progress, 0.5);
  });

  it("starts the next countdown over after the previous one ends", () => {
    const s = ship([kit("sling", { cool: 20 })]);
    assert.equal(systemClock(s, "sling")?.tone, "cool");
    near(systemClock(s, "sling")!.progress, 0);
    s.kits.sling!.cool = 10;
    near(systemClock(s, "sling")!.progress, 0.5);
    s.kits.sling!.cool = 0;
    assert.equal(systemClock(s, "sling"), null);
    s.kits.sling!.cool = 10;
    near(systemClock(s, "sling")!.progress, 0);
    s.kits.sling!.cool = 5;
    near(systemClock(s, "sling")!.progress, 0.5);
  });

  it("restarts the trace when a cooldown is replaced by a longer one", () => {
    const s = ship([kit("leash", { cool: 20 })]);
    systemClock(s, "leash");
    s.kits.leash!.cool = 10;
    near(systemClock(s, "leash")!.progress, 0.5);
    s.kits.leash!.cool = 25;
    near(systemClock(s, "leash")!.progress, 0);
  });

  it("prefers the running effect, then ion, then the cooldown", () => {
    const s = ship([kit("veil", { on: true, left: 10, cool: 20, ion: [2.5] })]);
    assert.equal(systemClock(s, "veil")?.tone, "live");
    s.kits.veil!.on = false;
    s.kits.veil!.left = 0;
    assert.equal(systemClock(s, "veil")?.tone, "ion");
    near(systemClock(s, "veil")!.progress, 0.5);
    s.kits.veil!.ion = [];
    assert.equal(systemClock(s, "veil")?.tone, "cool");
    near(systemClock(s, "veil")!.progress, 0);
  });

  it("uses the hacking drone's flight total, then the pulse", () => {
    const s = ship([kit("spike", { hackFly: 1.5, hackFlyTotal: 3 })]);
    assert.equal(systemClock(s, "spike")?.tone, "live");
    near(systemClock(s, "spike")!.progress, 0.5);
    s.kits.spike!.hackFly = undefined;
    s.kits.spike!.on = true;
    s.kits.spike!.left = 4;
    near(systemClock(s, "spike")!.progress, 0);
    s.kits.spike!.left = 1;
    near(systemClock(s, "spike")!.progress, 0.75);
  });

  it("keeps two hulls on their own clocks", () => {
    const a = ship([kit("cell", { on: true, left: 30 })]);
    systemClock(a, "cell");
    a.kits.cell!.left = 15;
    near(systemClock(a, "cell")!.progress, 0.5);
    const b = ship([kit("cell", { on: true, left: 30 })]);
    near(systemClock(b, "cell")!.progress, 0);
  });

  it("hides an enemy clock until sensors would reveal that system", () => {
    const cloaked = ship([kit("veil", { on: true, left: 10 })]);
    assert.equal(enemySystemClock(cloaked, "veil", false), null);
    cloaked.kits.veil!.left = 5;
    enemySystemClock(cloaked, "veil", false);
    const shown = enemySystemClock(cloaked, "veil", true);
    assert.equal(shown?.tone, "live");
    near(shown!.progress, 0.5);

    const ionized = ship([], { engines: [2.5] });
    assert.equal(enemySystemClock(ionized, "engines", false), null);
    assert.equal(enemySystemClock(ionized, "engines", true)?.tone, "ion");
    near(enemySystemClock(ionized, "engines", true)!.progress, 0.5);
  });
});
