import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HullGib } from "@stl/pack";
import { GIB_SECONDS, gibFlight } from "./ship-art.ts";

/** kestral.xml's gib1: a lower piece, heading 60-120 degrees. */
const KESTREL_GIB1: HullGib = {
  id: 1,
  x: -5,
  y: 114,
  velocityMin: 0.6,
  velocityMax: 1,
  directionMin: 60,
  directionMax: 120,
  angularMin: -0.4,
  angularMax: -0.1,
};

describe("gib flight", () => {
  it("rolls each range once and moves along the heading, 90 degrees being down", () => {
    const flight = gibFlight(KESTREL_GIB1, "PLAYER_SHIP_HARD");
    const frames = GIB_SECONDS * 60;
    const dist = Math.hypot(flight.dx, flight.dy);
    assert.ok(dist >= 0.6 * frames - 1e-6 && dist <= 1 * frames + 1e-6, `distance ${dist}`);
    const heading = (Math.atan2(flight.dy, flight.dx) * 180) / Math.PI;
    assert.ok(heading >= 60 - 1e-6 && heading <= 120 + 1e-6, `heading ${heading}`);
    assert.ok(flight.dy > 0, "a lower piece falls down the screen");
    assert.ok(flight.spin <= -0.1 * frames + 1e-6 && flight.spin >= -0.4 * frames - 1e-6);
  });

  it("breaks the same hull the same way every time, and another hull differently", () => {
    assert.deepEqual(gibFlight(KESTREL_GIB1, "A"), gibFlight(KESTREL_GIB1, "A"));
    assert.notDeepEqual(gibFlight(KESTREL_GIB1, "A"), gibFlight(KESTREL_GIB1, "B"));
  });

  it("holds still for a gib with zero ranges", () => {
    const still = gibFlight(
      { ...KESTREL_GIB1, velocityMin: 0, velocityMax: 0, angularMin: 0, angularMax: 0 },
      "A",
    );
    assert.equal(Math.hypot(still.dx, still.dy), 0);
    assert.equal(still.spin, 0);
  });
});
