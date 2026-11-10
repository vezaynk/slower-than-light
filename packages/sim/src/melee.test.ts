import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, crewBlowDamage, crewBlowDue } from "./sim.ts";
import type { Crew } from "./types.ts";

describe("crew blows (xftl doc/damage-notes)", () => {
  it("lands the first blow at 0.5-0.65 s, then every 1.0-1.3 s, for 3.0-7.0 base damage", () => {
    const g = createGame(9);
    const dt = 0.001;
    for (let trial = 0; trial < 20; trial++) {
      const c = { swing: undefined, swingAt: undefined } as unknown as Crew;
      const hits: number[] = [];
      for (let t = dt; t < 8 && hits.length < 5; t += dt) if (crewBlowDue(g, c, dt)) hits.push(t);
      assert.ok(hits[0] >= 0.5 - 2 * dt && hits[0] <= 0.65 + 2 * dt, String(hits[0]));
      for (let i = 1; i < hits.length; i++) {
        const gap = hits[i] - hits[i - 1];
        assert.ok(gap >= 1 - 2 * dt && gap <= 1.3 + 2 * dt, String(gap));
      }
    }
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (let i = 0; i < 4000; i++) {
      const d = crewBlowDamage(g);
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
      sum += d;
    }
    assert.ok(lo >= 3 && hi <= 7 && lo < 3.1 && hi > 6.9);
    assert.ok(Math.abs(sum / 4000 - 5) < 0.1);
  });
});
