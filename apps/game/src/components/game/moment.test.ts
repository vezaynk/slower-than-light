import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { momentDown, momentLive, momentMarkHeld, momentUp } from "./moment.ts";

describe("a press that flips until release", () => {
  it("keeps the flip when the press is a tap", () => {
    for (const was of [false, true]) {
      const down = momentDown(was);
      assert.equal(momentLive(down), !was);
      assert.equal(momentUp(down), !was);
    }
  });

  it("puts the old value back when the press was held", () => {
    for (const was of [false, true]) {
      const held = momentMarkHeld(momentDown(was));
      assert.equal(momentLive(held), !was);
      assert.equal(momentUp(held), was);
    }
  });
});
