import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import { fillerChoose, pageForRow } from "./filler-events.ts";

describe("Refueling station", () => {
  it("is a card an items draw can reach", () => {
    assert.equal(pageForRow("Refueling station")?.slug, "refueling-station");
  });

  it("sells 6, 3, or 1 fuel for 12, 6, or 2 scrap", () => {
    const rows: [string, number, number][] = [
      ["c:refueling-station:0", 12, 6],
      ["c:refueling-station:1", 6, 3],
      ["c:refueling-station:2", 2, 1],
    ];
    for (const [id, cost, fuel] of rows) {
      const g = createGame(1);
      g.scrap = 40;
      const had = g.fuel;
      g.scrap = cost - 1;
      assert.equal(choiceDisabled(g, id), `Need ${cost} scrap`);
      fillerChoose(g, id);
      assert.equal(g.fuel, had);
      g.scrap = 40;
      fillerChoose(g, id);
      assert.equal(g.scrap, 40 - cost);
      assert.equal(g.fuel, had + fuel);
      assert.match(g.event?.body ?? "", /Thank you for your business/);
      assert.match(g.event?.body ?? "", new RegExp(`You receive ${fuel} fuel`));
    }
  });

  it("ignoring the station spends nothing", () => {
    const g = createGame(2);
    const scrap = g.scrap;
    const fuel = g.fuel;
    fillerChoose(g, "c:refueling-station:3");
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, fuel);
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
  });
});
