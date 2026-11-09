import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOSTED_CREW_DRONE_SPEED, CREW_DRONE_SPEED, crewDroneSpeed } from "./cited-booster.ts";

describe("Drone Reactor Booster speed", () => {
  it("returns half of crew speed, or 62.5 percent when boosted", () => {
    assert.equal(CREW_DRONE_SPEED, 0.5);
    assert.equal(BOOSTED_CREW_DRONE_SPEED, 0.625);
    assert.equal(crewDroneSpeed(false), 0.5);
    assert.equal(crewDroneSpeed(true), 0.625);
    assert.equal(crewDroneSpeed(true), crewDroneSpeed(false) * 1.25);
  });
});
