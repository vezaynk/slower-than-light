import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACH_ICON_ROWS, ACH_ICON_SIZE } from "./achievement-icons.ts";
import { ACHIEVEMENTS } from "@stl/catalog/src/wiki/achievements.ts";

describe("achievement icons", () => {
  it("draw every achievement, and nothing else", () => {
    assert.deepEqual(Object.keys(ACH_ICON_ROWS).sort(), ACHIEVEMENTS.map((row) => row.id).sort());
  });

  it("are 16×16 with only known paint", () => {
    for (const [id, rows] of Object.entries(ACH_ICON_ROWS)) {
      assert.equal(rows.length, ACH_ICON_SIZE, `${id} rows`);
      rows.forEach((row, y) => assert.match(row, /^[.#+*]{16}$/, `${id} row ${y}`));
    }
  });

  it("never draw two achievements the same", () => {
    const seen = new Map<string, string>();
    for (const [id, rows] of Object.entries(ACH_ICON_ROWS)) {
      const key = rows.join("");
      assert.equal(seen.get(key), undefined, `${id} copies ${seen.get(key)}`);
      seen.set(key, id);
    }
  });
});
