import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bubbleCrossing, bubbleLayout, frameRoom, struckPad, zoltanPad } from "./shield-bubble.ts";

describe("shield bubbles", () => {
  it("draws one ellipse per live layer, then the charge, then the Zoltan shield", () => {
    const open = bubbleLayout(80, 2, true, true);
    assert.deepEqual(open.live, [16, 24]);
    assert.equal(open.charge, 32);
    assert.equal(open.zoltan, 40);

    const bare = bubbleLayout(80, 0, false, false);
    assert.deepEqual(bare.live, []);
    assert.equal(bare.charge, null);
    assert.equal(bare.zoltan, null);
  });

  it("compresses the stack so the outer stroke stays inside a tight frame", () => {
    const tight = bubbleLayout(20, 4, false, false);
    assert.equal(tight.live.length, 4);
    assert.ok(tight.live[0]! < tight.live[1]!);
    assert.ok(tight.live[3]! <= 16);
    assert.ok(tight.live[3]! > tight.live[0]!);
  });

  it("puts a shield hit on the bubble that just dropped, and the Zoltan ring outside the blue ones", () => {
    assert.equal(struckPad(80, 1, false), 24);
    assert.equal(struckPad(80, 0, true), bubbleLayout(80, 1, false, true).live[0]);
    assert.equal(zoltanPad(80, 2, false), 32);
    assert.ok(zoltanPad(80, 2, false) > bubbleLayout(80, 2, false, true).live[1]!);
  });

  it("keeps the bubble inside the frame and never lets a large stage inflate it", () => {
    assert.equal(frameRoom(800, 600, 200, 120), 56);
    assert.equal(frameRoom(100, 80, 90, 70), 12);
  });

  it("shrinks the pads with the target ship's scale", () => {
    const half = bubbleLayout(80, 2, true, true, 0.5);
    assert.deepEqual(half.live, [8, 12]);
    assert.equal(half.charge, 16);
    assert.equal(half.zoltan, 20);
    assert.equal(struckPad(80, 1, false, 0.5), 12);
    assert.equal(zoltanPad(80, 2, false, 0.5), 16);
  });

  it("stops a beam where it first meets the bubble", () => {
    const hit = bubbleCrossing({ x: -50, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 20, 10);
    assert.ok(hit);
    assert.ok(Math.abs(hit.x - -20) < 1e-9);
    assert.equal(hit.y, 0);
    assert.deepEqual(bubbleCrossing({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 20, 10), {
      x: 1,
      y: 1,
    });
    assert.equal(bubbleCrossing({ x: -50, y: 30 }, { x: 50, y: 30 }, { x: 0, y: 0 }, 20, 10), null);
  });
});
