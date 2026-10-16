import assert from "node:assert/strict";
import test from "node:test";
import { takeId } from "./take-id.ts";

test("names a clean take by branch and short sha", () => {
  assert.equal(takeId({ branch: "master", sha: "e59324fabc", dirty: false }), "master-e59324f");
});

test("keeps a dirty tree from overwriting the clean take", () => {
  assert.equal(takeId({ branch: "master", sha: "e59324fabc", dirty: true }), "master-e59324f-dirty");
});

test("a label is the take name even when the tree is dirty", () => {
  assert.equal(
    takeId({ branch: "feature/vent", sha: "abcdef1234", dirty: true, label: "before vent" }),
    "before-vent",
  );
});
