import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BOOSTED_CREW_DRONE_SPEED, CREW_DRONE_SPEED, crewDroneSpeed } from "./cited-booster.ts";

const source = readFileSync(new URL("./cited-booster.ts", import.meta.url), "utf8");

describe("Drone Reactor Booster speed", () => {
  it("returns half of crew speed, or 62.5 percent when boosted", () => {
    assert.equal(CREW_DRONE_SPEED, 0.5);
    assert.equal(BOOSTED_CREW_DRONE_SPEED, 0.625);
    assert.equal(crewDroneSpeed(false), 0.5);
    assert.equal(crewDroneSpeed(true), 0.625);
    assert.equal(crewDroneSpeed(true), crewDroneSpeed(false) * 1.25);
  });

  it("comments both sentences from the section", () => {
    assert.match(source, /Your shipboard drones have their movement speed increased by 25 percent\./);
    assert.match(
      source,
      /Increases the speed of crew drones by 25%, however, the actual crew drone speed is increased from 50% of regular crew speed to 62\.5%\./,
    );
  });
});
