import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { augmentDef, loadPack, resetPackForTests } from "@stl/pack";
import { installAugment } from "../extras/augments.ts";
import { buy, createGame } from "../sim.ts";
import type { AugmentId } from "../types.ts";
import { grantRandomItem, rollBonusItem } from "../rules/bonus-item.ts";
import { citedSellQuote } from "../rules/sell.ts";
import { augmentItems } from "./cited-stores.ts";

/** The ship and event grants the stand-in writes with `<rarity>0</rarity>`, with their blueprint cost. */
const GRANTS: Record<string, number> = {
  NANO_MEDBAY: 60,
  SLUG_GEL: 60,
  CREW_STIMS: 50,
  DRONE_SPEED: 50,
  CRYSTAL_SHARDS: 80,
  STASIS_POD: 30,
  ENERGY_SHIELD: 80,
};

describe("shelf augments (store rarity 0 or missing is never offered)", () => {
  it("leaves a rarity-0 or rarity-less row off the store shelf even when it comes first", () => {
    const first = augmentDef("AUTO_COOLDOWN");
    const second = augmentDef("EXPLOSIVE_REPLICATOR");
    assert.ok(first && second);
    const before = augmentItems(createGame(1)).map((item) => item.ref);
    assert.deepEqual(before.slice(0, 2), ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR"]);
    const { rarity: _drop, ...noRarity } = second;
    loadPack({ augments: [{ ...first, rarity: 0 }, noRarity] }, "append");
    try {
      const refs = augmentItems(createGame(1)).map((item) => item.ref);
      assert.equal(refs.length, 3);
      assert.equal(refs.includes("AUTO_COOLDOWN"), false);
      assert.equal(refs.includes("EXPLOSIVE_REPLICATOR"), false);
    } finally {
      resetPackForTests();
    }
  });

  it("never draws a ship or event grant as a bonus item or a random augment", () => {
    const g = createGame(1);
    for (let i = 0; i < 400; i++) {
      const item = rollBonusItem(g);
      if (item?.kind === "augment") assert.equal(item.id in GRANTS, false, item.id);
    }
    for (let i = 0; i < 200; i++) {
      const run = createGame(i + 1);
      grantRandomItem(run, "augment");
      for (const id of run.augments) assert.equal(id in GRANTS, false, id);
    }
  });

  it("does not sell a grant, and buys it back at half its blueprint cost", () => {
    for (const [id, cost] of Object.entries(GRANTS)) {
      const g = createGame(1);
      g.scrap = 500;
      assert.equal(installAugment(g, id as AugmentId), false, id);
      assert.equal(g.scrap, 500, id);
      g.augments = [id as AugmentId];
      const quote = citedSellQuote(g).find((row) => row.ref === id);
      assert.equal(quote?.scrap, cost / 2, id);
      assert.equal(quote?.name, augmentDef(id)?.name, id);
    }
  });

  it("refuses a store row that names a grant: no scrap spent, nothing fitted, the row stays", () => {
    const g = createGame(1);
    g.scrap = 500;
    g.augments = [];
    const row = augmentDef("ENERGY_SHIELD");
    assert.ok(row);
    g.stock = [
      {
        id: "aug-ENERGY_SHIELD",
        kind: "augment",
        ref: "ENERGY_SHIELD",
        name: row.name,
        detail: row.detail,
        cost: row.cost,
        amount: 1,
      },
    ];
    buy(g, "aug-ENERGY_SHIELD");
    assert.equal(g.scrap, 500);
    assert.deepEqual(g.augments, []);
    assert.deepEqual(
      g.stock.map((item) => item.id),
      ["aug-ENERGY_SHIELD"],
    );
  });
});
