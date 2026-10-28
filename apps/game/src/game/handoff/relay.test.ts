import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCode, normalizeCode } from "./relay.ts";

describe("handoff code", () => {
  it("reads a code with spaces or dashes and keeps O distinct from zero", () => {
    assert.equal(normalizeCode("abc def"), "ABCDEF");
    assert.equal(normalizeCode("abc-def"), "ABCDEF");
    assert.equal(normalizeCode("AB CDEF"), "ABCDEF");
    assert.equal(normalizeCode("ABCDEO"), null);
    assert.equal(normalizeCode("ABCDE0"), null);
    assert.equal(normalizeCode("ABCDE"), null);
    assert.equal(normalizeCode("ABCDEFG"), null);
    assert.equal(formatCode("ABCDEF"), "ABC DEF");
  });
});
