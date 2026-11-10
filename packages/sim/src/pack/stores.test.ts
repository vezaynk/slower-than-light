import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buy, createGame, openStoreHere } from "../sim.ts";
import { citedStock, storeSections } from "../wiki/cited-stores.ts";
import "./base.ts";
import { allStores, loadPack, resetPackForTests, storeDef } from "@stl/pack";
import type { StoreDef } from "@stl/pack";

afterEach(() => resetPackForTests());

function withCrew() {
  for (let seed = 1; seed < 400; seed++) {
    const g = createGame(seed);
    if (storeSections(g).includes("crew")) return g;
  }
  throw new Error("no crew section");
}

describe("store listings", () => {
  it("prices fuel from the pack while the authored row stays", () => {
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.name, "Fuel");
    const standard = storeDef("standard");
    assert.ok(standard);
    loadPack(
      {
        stores: [
          {
            ...standard,
            lines: standard.lines.map((line) =>
              line.id === "fuel" ? { ...line, cost: 11 } : line,
            ),
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    g.scrap = 40;
    openStoreHere(g);
    const fuel = g.stock?.find((item) => item.id === "fuel");
    assert.equal(fuel?.cost, 11);
    assert.equal(fuel?.name, "Fuel");
    buy(g, "fuel");
    assert.equal(g.scrap, 29);
    resetPackForTests();
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.name, "Fuel");
  });

  it("hires crew at the packed price while the authored row stays", () => {
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.name, "Human");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.cost, 45);
    const standard = storeDef("standard");
    assert.ok(standard);
    loadPack(
      {
        stores: [
          {
            ...standard,
            lines: standard.lines.map((line) =>
              line.kind === "crew" && line.id === "human" ? { ...line, cost: 99 } : line,
            ),
          },
        ],
      },
      "append",
    );
    const g = withCrew();
    const human = citedStock(g).find((item) => item.ref === "human");
    assert.equal(human?.name, "Human");
    assert.equal(human?.cost, 99);
    resetPackForTests();
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.name, "Human");
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "human")?.cost, 45);
  });

  it("opens an appended store and leaves an unknown stock kind off the shelf", () => {
    const ember: StoreDef = {
      id: "ember",
      name: "Ember",
      slot: 3,
      weapons: 2,
      sections: ["crew"],
      lines: [
        { id: "fuel", kind: "fuel", name: "Ember Fuel", cost: 4, min: 3, max: 3 },
        { id: "relic", kind: "relic", name: "Relic", cost: 9, min: 1, max: 1 },
        { id: "energy", kind: "crew", name: "Ember Hand", cost: 12, min: 1, max: 1 },
      ],
    };
    assert.equal(
      allStores().some((row) => row.id === "ember"),
      false,
    );
    loadPack({ stores: [ember] }, "append");
    assert.equal(
      allStores().some((row) => row.id === "ember"),
      true,
    );
    const g = createGame(1);
    openStoreHere(g, "ember");
    assert.equal(g.stock?.find((item) => item.id === "fuel")?.name, "Ember Fuel");
    assert.equal(g.stock?.find((item) => item.id === "fuel")?.cost, 4);
    assert.equal(
      g.stock?.some((item) => item.name === "Relic"),
      false,
    );
    assert.equal(g.stock?.find((item) => item.ref === "energy")?.cost, 12);
    const campaign = createGame(2);
    openStoreHere(campaign);
    assert.equal(campaign.stock?.find((item) => item.id === "fuel")?.cost, 3);
    assert.equal(campaign.stock?.find((item) => item.id === "fuel")?.name, "Fuel");
    resetPackForTests();
    assert.equal(
      allStores().some((row) => row.id === "ember"),
      false,
    );
    assert.equal(storeDef("standard")?.lines.find((line) => line.id === "fuel")?.cost, 3);
  });
});
