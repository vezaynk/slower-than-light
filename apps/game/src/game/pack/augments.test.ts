import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { installAugment } from "../extras/augments.ts";
import { createGame } from "../sim.ts";
import { grantBonusAugment } from "../wiki/bonus-item.ts";
import { augmentItems, citedBuy, citedSellQuote } from "../wiki/cited-stores.ts";
import "./base.ts";
import { augmentDef, loadPack, resetPackForTests } from "@stl/pack";

afterEach(() => resetPackForTests());

describe("augment listings", () => {
  it("stocks and charges the packed price", () => {
    const feed = augmentDef("AUTO_COOLDOWN");
    assert.ok(feed);
    loadPack({ augments: [{ ...feed, name: "Reloaded", cost: 77 }] }, "append");
    const g = createGame(1);
    g.augments = [];
    g.scrap = 100;
    const shelf = augmentItems(g);
    assert.deepEqual(
      shelf.map((row) => row.ref),
      ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR", "CLOAK_FIRE"],
    );
    assert.equal(shelf[0]?.name, "Reloaded");
    assert.equal(shelf[0]?.cost, 77);
    assert.equal(installAugment(g, "AUTO_COOLDOWN"), true);
    assert.equal(g.scrap, 23);
  });

  it("awards, buys, and sells an appended listing", () => {
    loadPack(
      { augments: [{ id: "ember", name: "Ember", detail: "A packed listing.", cost: 15 }] },
      "append",
    );
    const g = createGame(1);
    g.augments = [];
    assert.deepEqual(
      augmentItems(g).map((row) => row.ref),
      ["AUTO_COOLDOWN", "EXPLOSIVE_REPLICATOR", "CLOAK_FIRE"],
    );
    assert.equal(grantBonusAugment(g, "ember"), "Ember fitted.");
    assert.deepEqual(g.augments, ["ember"]);
    const quote = citedSellQuote(g).find((row) => row.ref === "ember");
    assert.equal(quote?.name, "Ember");
    assert.equal(quote?.scrap, 7);

    const bought = createGame(2);
    bought.augments = [];
    assert.equal(
      citedBuy(bought, {
        id: "aug-ember",
        kind: "augment",
        ref: "ember",
        name: "Ember",
        detail: "A packed listing.",
        cost: 15,
        amount: 1,
      }),
      true,
    );
    assert.deepEqual(bought.augments, ["ember"]);
  });
});
