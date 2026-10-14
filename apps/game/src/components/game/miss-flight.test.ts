import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flightSpeed, leftCamera, missVelocity, shotFliesPast } from "./miss-flight.ts";

describe("missed shots", () => {
  it("flies a projectile past the aim point and out of the camera", () => {
    const at = { x: 100, y: 100 };
    const aim = { x: 160, y: 100 };
    const speed = flightSpeed({ x: 40, y: 100 }, aim, 0.4);
    const vel = missVelocity(at, aim, 0, speed);
    assert.ok(vel);
    const camera = { x: 0, y: 0, w: 200, h: 200 };
    let x = at.x;
    let y = at.y;
    let passed = false;
    for (let i = 0; i < 180; i++) {
      x += vel.vx / 60;
      y += vel.vy / 60;
      if (x > aim.x + 4) passed = true;
      if (leftCamera({ x, y }, camera, 36)) break;
    }
    assert.equal(passed, true);
    assert.equal(leftCamera({ x, y }, camera, 36), true);
    assert.ok(x > aim.x);
  });

  it("keeps the inbound angle once the bolt has reached the room", () => {
    const aim = { x: 50, y: 80 };
    const vel = missVelocity(aim, aim, Math.PI / 2, 200);
    assert.ok(vel);
    assert.ok(Math.abs(vel.vx) < 1e-6);
    assert.ok(vel.vy > 0);
  });

  it("heads through the aim point while the bolt is still short of it", () => {
    const vel = missVelocity({ x: 0, y: 0 }, { x: 30, y: 40 }, Math.PI, 50);
    assert.ok(vel);
    assert.ok(Math.abs(vel.ang - Math.atan2(40, 30)) < 1e-9);
    assert.ok(Math.abs(Math.hypot(vel.vx, vel.vy) - 50) < 1e-6);
  });

  it("does not invent a path when the bolt never moved", () => {
    assert.equal(missVelocity({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 0), null);
    assert.equal(flightSpeed({ x: 0, y: 0 }, { x: 30, y: 40 }, 0.5), 100);
  });

  it("flies lasers, ions, missiles, and flak, and leaves beams and bombs on the room", () => {
    assert.equal(shotFliesPast("laser"), true);
    assert.equal(shotFliesPast("ion"), true);
    assert.equal(shotFliesPast("missile"), true);
    assert.equal(shotFliesPast("flak"), true);
    assert.equal(shotFliesPast("beam"), false);
    assert.equal(shotFliesPast("bomb"), false);
  });
});
