import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { loadCatalog } from "../pack/base.ts";
import { FUEL_GIFTS } from "./fuel-gifts.ts";

loadCatalog();

function packedGifts(): Map<string, { lo: number; hi: number }> {
  const seen = new Map<string, { lo: number; hi: number }>();
  for (const ev of allEvents()) {
    const choices = [...ev.choices, ...(ev.cards ?? []).flatMap((card) => card.choices)];
    for (const choice of choices) {
      if (choice.gift?.k !== "fuel") continue;
      assert.equal(seen.has(choice.id), false, choice.id);
      seen.set(choice.id, { lo: choice.gift.lo, hi: choice.gift.hi });
    }
  }
  return seen;
}

describe("fuel gifts", () => {
  it("packs every authored gift once", () => {
    const seen = packedGifts();
    for (const [id, gift] of Object.entries(FUEL_GIFTS)) {
      assert.deepEqual(seen.get(id), { lo: gift.lo, hi: gift.hi }, id);
    }
  });
});
