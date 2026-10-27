import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sectorDef } from "@stl/pack";
import { buildRoute } from "../sim.ts";
import "../pack/base.ts";

describe("sector colour chances", () => {
  it("lands the two sector-2 nodes near 48% civilian, 32% hostile, and 20% nebula", () => {
    // Sectors lead: 48% green, 32% red, 20% purple.
    // INFERRED: those colours are the Civilian, Hostile, and Nebula groups.
    // Sector 2 always has all three (repeatable civilian and hostile sectors, and Uncharted Nebula).
    const counts = { civilian: 0, hostile: 0, nebula: 0 };
    const seeds = 4000;
    for (let seed = 1; seed <= seeds; seed++) {
      const route = buildRoute(seed);
      const start = route.filter((node) => node.col === 0);
      assert.equal(start.length, 1);
      // Sector 1 is STANDARD_SPACE and shows that sector's own title.
      assert.equal(start[0]?.sector, "STANDARD_SPACE");
      assert.equal(start[0]?.name, "Civilian (Starting) Sector");
      const lastCol = Math.max(...route.map((node) => node.col));
      const last = route.filter((node) => node.col === lastCol);
      assert.ok(last.length > 0);
      for (const node of last) assert.equal(node.name, "The Last Stand");
      assert.equal(
        route.some((node) => node.name === "Hidden Crystal Worlds"),
        false,
      );
      const sector2 = route.filter((node) => node.col === 1);
      assert.equal(sector2.length, 2);
      for (const node of sector2) {
        const group = sectorDef(node.sector)?.group;
        assert.ok(group === "civilian" || group === "hostile" || group === "nebula");
        counts[group] += 1;
      }
    }
    const total = seeds * 2;
    const share = (n: number) => n / total;
    const civilian = share(counts.civilian);
    const hostile = share(counts.hostile);
    const nebula = share(counts.nebula);
    assert.ok(Math.abs(civilian - 0.48) <= 0.04, `civilian ${civilian}`);
    assert.ok(Math.abs(hostile - 0.32) <= 0.04, `hostile ${hostile}`);
    assert.ok(Math.abs(nebula - 0.2) <= 0.04, `nebula ${nebula}`);
  });
});
