import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { ChoiceReq, EventDef } from "@stl/pack";
import { tx } from "../../i18n/index.ts";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { scrapStock } from "./choice-locks.ts";
import { fillerChoose } from "./filler-events.ts";

afterEach(() => resetPackForTests());

function page(): EventDef {
  const found = eventDef("slocknog");
  assert.ok(found);
  return found;
}

function rewrite(reqs: ChoiceReq[] | undefined) {
  loadPack({
    events: [{
      ...page(),
      choices: page().choices.map((choice) => (choice.id === "c:slocknog:0" ? { ...choice, reqs } : choice)),
    }],
  }, "append");
}

function open(g: Game) {
  const beacon = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(beacon);
  beacon.flag = "cited:slocknog";
  beacon.name = "Slocknog";
  g.here = beacon.id;
  g.event = citedEvent(g, beacon);
  g.phase = "event";
}

function hired(g: Game) {
  return g.crew.some((crew) => crew.side === "player" && crew.hp > 0 && crew.name === "Slocknog");
}

describe("slocknog stock", () => {
  it("spends the packed campaign count", () => {
    assert.equal(scrapStock("c:slocknog:0"), 55);
    const g = createGame(1);
    g.scrap = 55;
    open(g);
    fillerChoose(g, "c:slocknog:0");
    assert.equal(g.scrap, 0);
    assert.equal(hired(g), true);
    assert.match(g.event?.body ?? "", /Scrap: -55\./);
  });

  it("spends a replaced scrap count and refuses below it", () => {
    const text = tx("wiki.filler-events.need-scrap", { v: 7 });
    rewrite([{ k: "stock", id: "scrap", n: 7, text }]);
    const g = createGame(2);
    g.scrap = 6;
    open(g);
    assert.equal(choiceDisabled(g, "c:slocknog:0"), "Need 7 scrap");
    const body = g.event?.body;
    fillerChoose(g, "c:slocknog:0");
    assert.equal(g.scrap, 6);
    assert.equal(hired(g), false);
    assert.equal(g.event?.body, body);
    g.scrap = 7;
    fillerChoose(g, "c:slocknog:0");
    assert.equal(g.scrap, 0);
    assert.equal(hired(g), true);
    assert.match(g.event?.body ?? "", /Scrap: -7\./);
    assert.match(g.event?.body ?? "", /named Slocknog/);
  });

  it("hires nobody when the scrap row is gone", () => {
    rewrite(undefined);
    assert.equal(scrapStock("c:slocknog:0"), null);
    const g = createGame(3);
    g.scrap = 80;
    open(g);
    assert.equal(g.event?.choices.some((choice) => choice.id === "c:slocknog:0"), true);
    assert.equal(choiceDisabled(g, "c:slocknog:0"), null);
    const body = g.event?.body;
    fillerChoose(g, "c:slocknog:0");
    assert.equal(g.scrap, 80);
    assert.equal(hired(g), false);
    assert.equal(g.event?.body, body);
  });

  it("restores the campaign count", () => {
    rewrite(undefined);
    assert.equal(scrapStock("c:slocknog:0"), null);
    resetPackForTests();
    assert.equal(scrapStock("c:slocknog:0"), 55);
  });
});
