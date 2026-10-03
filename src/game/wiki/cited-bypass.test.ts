import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bypassZoltan, type BypassKind } from "./cited-bypass.ts";

const EXPECTED: Record<BypassKind, "pass" | "destroyed" | "launch-then-destroyed"> = {
  crew: "pass",
  bomb: "pass",
  mind: "pass",
  hack: "destroyed",
  board: "launch-then-destroyed",
};

describe("bypassZoltan", () => {
  for (const kind of Object.keys(EXPECTED) as BypassKind[]) {
    it(`${kind} is ${EXPECTED[kind]}`, () => {
      assert.equal(bypassZoltan(kind), EXPECTED[kind]);
    });
  }
});
