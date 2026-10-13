import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ICON_ROWS, ICON_SIZE, iconForName } from "./icons.ts";
import { CRUISER_PAGES } from "./wiki/layout-pages.ts";
import { hangarSheet } from "./wiki/hangar-sheet.ts";

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

  it("cover every system a hangar sheet names", () => {
    const missing = new Set<string>();
    for (const page of CRUISER_PAGES) {
      for (const layout of page.layouts) {
        for (const system of hangarSheet(layout).systems) if (!iconForName(system.name)) missing.add(system.name);
      }
    }
    assert.deepEqual([...missing], []);
  });
});
