import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { onPackWarning, quietPackWarnings, warnPack } from "./warnings.ts";

let restore: (() => void) | undefined;
afterEach(() => restore?.());

describe("quiet pack warnings", () => {
  it("drops warnings inside, and still prints the same warning later", () => {
    const seen: string[] = [];
    restore = onPackWarning((message) => seen.push(message));
    const out = quietPackWarnings(() => {
      warnPack("No sector is eligible for sector 2.");
      return 7;
    });
    assert.equal(out, 7);
    assert.deepEqual(seen, []);
    warnPack("No sector is eligible for sector 2.");
    assert.deepEqual(seen, ["No sector is eligible for sector 2."]);
  });

  it("ends the quiet stretch when the build throws", () => {
    const seen: string[] = [];
    restore = onPackWarning((message) => seen.push(message));
    assert.throws(() =>
      quietPackWarnings(() => {
        throw new Error("boom");
      }),
    );
    warnPack("after");
    assert.deepEqual(seen, ["after"]);
  });
});
