import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ICON_ROWS, ICON_SIZE } from "./icons.ts";

describe("pixel icons", () => {
  it("are 16×16 with only known paint", () => {
    for (const [name, rows] of Object.entries(ICON_ROWS)) {
      assert.equal(rows.length, ICON_SIZE, `${name} rows`);
      rows.forEach((row, y) => assert.match(row, /^[.#+]{16}$/, `${name} row ${y}`));
    }
  });

  it("never draw two things the same", () => {
    const seen = new Map<string, string>();
    for (const [name, rows] of Object.entries(ICON_ROWS)) {
      const key = rows.join("");
      assert.equal(seen.get(key), undefined, `${name} copies ${seen.get(key)}`);
      seen.set(key, name);
    }
  });
});
