import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { ChoiceReq, EventDef } from "@stl/pack";
import { tx } from "../../i18n/index.ts";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { scrapStock } from "./choice-locks.ts";
import { joinCrew } from "./surrender.ts";

afterEach(() => resetPackForTests());

function holder(): EventDef {
  const found = eventDef("blue-button-reqs");
  assert.ok(found);
  return found;
}

function rewrite(id: string, reqs: ChoiceReq[] | undefined) {
  loadPack({
    events: [{
      ...holder(),
      choices: holder().choices.map((choice) => (choice.id === id ? { ...choice, reqs } : choice)),
    }],
  }, "append");
}

function open(g: Game) {
  const beacon = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(beacon);
  beacon.flag = "cited:lanius-craftsmen";
  beacon.name = "Lanius craftsmen";
  g.here = beacon.id;
  g.phase = "event";
}

describe("craftsmen stock", () => {
  it("packs the six campaign scrap counts", () => {
    assert.equal(scrapStock("s:lanius-craftsmen:aug"), 45);
    assert.equal(scrapStock("s:lanius-craftsmen:weapon"), 50);
    assert.equal(scrapStock("s:lanius-craftsmen:drone"), 40);
    assert.equal(scrapStock("s:lanius-craftsmen:help:aug"), 35);
    assert.equal(scrapStock("s:lanius-craftsmen:help:weapon"), 40);
    assert.equal(scrapStock("s:lanius-craftsmen:help:drone"), 30);
  });

  it("prints and spends a replaced scrap count", () => {
    const text = tx("wiki.filler-events.need-scrap", { v: 7 });
    rewrite("s:lanius-craftsmen:aug", [{ k: "stock", id: "scrap", n: 7, text }]);
    const g = createGame(1);
    open(g);
    g.scrap = 7;
    choose(g, "c:lanius-craftsmen:0");
    const aug = g.event?.choices.find((choice) => choice.id === "s:lanius-craftsmen:aug");
    assert.equal(aug?.label, "Give 7 scrap to craft an augmentation.");
    g.scrap = 6;
    assert.equal(choiceDisabled(g, "s:lanius-craftsmen:aug"), "Need 7 scrap");
    const body = g.event?.body;
    choose(g, "s:lanius-craftsmen:aug");
    assert.equal(g.scrap, 6);
    assert.equal(g.event?.body, body);
    g.scrap = 7;
    choose(g, "s:lanius-craftsmen:aug");
    assert.equal(g.scrap, 0);
    assert.match(g.event?.body ?? "", /construct the augmentation/);
  });

  it("spends a replaced discount and nothing when that row is gone", () => {
    const text = tx("wiki.filler-events.need-scrap", { v: 4 });
    rewrite("s:lanius-craftsmen:help:drone", [{ k: "stock", id: "scrap", n: 4, text }]);
    const paid = createGame(2);
    open(paid);
    paid.scrap = 4;
    joinCrew(paid, "Lanius");
    choose(paid, "c:lanius-craftsmen:0");
    choose(paid, "s:lanius-craftsmen:help");
    const drone = paid.event?.choices.find((choice) => choice.id === "s:lanius-craftsmen:help:drone");
    assert.equal(drone?.label, "Give 4 scrap to craft a drone schematic.");
    choose(paid, "s:lanius-craftsmen:help:drone");
    assert.equal(paid.scrap, 0);
    assert.match(paid.event?.body ?? "", /construct the schematic/);

    resetPackForTests();
    rewrite("s:lanius-craftsmen:aug", undefined);
    const skipped = createGame(3);
    open(skipped);
    skipped.scrap = 80;
    const augments = skipped.augments.length;
    choose(skipped, "c:lanius-craftsmen:0");
    assert.equal(skipped.event?.choices.some((choice) => choice.id === "s:lanius-craftsmen:aug"), false);
    const body = skipped.event?.body;
    choose(skipped, "s:lanius-craftsmen:aug");
    assert.equal(skipped.scrap, 80);
    assert.equal(skipped.augments.length, augments);
    assert.equal(skipped.event?.body, body);
    assert.equal(scrapStock("s:lanius-craftsmen:aug"), null);
  });

  it("restores the campaign counts", () => {
    rewrite("s:lanius-craftsmen:weapon", undefined);
    assert.equal(scrapStock("s:lanius-craftsmen:weapon"), null);
    resetPackForTests();
    assert.equal(scrapStock("s:lanius-craftsmen:weapon"), 50);
  });
});
