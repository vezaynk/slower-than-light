import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { EventDef, TradeStep } from "@stl/pack";
import { createGame } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import "../pack/base.ts";
import { fillerChoose } from "./filler-events.ts";

const INQUIRE = "c:trade-scrap-for-upgrades:0";

const CAMPAIGN: TradeStep[] = [
  { id: "oxygen", level: 1, lo: 15, hi: 20 },
  { id: "oxygen", level: 2, lo: 25, hi: 40 },
  { id: "pilot", level: 1, lo: 8, hi: 15 },
  { id: "pilot", level: 2, lo: 25, hi: 40 },
  { id: "doors", level: 1, lo: 8, hi: 15 },
  { id: "doors", level: 2, lo: 25, hi: 40 },
  { id: "sensors", level: 1, lo: 10, hi: 20 },
  { id: "sensors", level: 2, lo: 35, hi: 45 },
  { id: "reactor", lo: 15, hi: 25 },
];

afterEach(() => resetPackForTests());

function row(): EventDef {
  const found = eventDef("trade-scrap-for-upgrades");
  assert.ok(found);
  return found;
}

function replace(trades: TradeStep[] | undefined) {
  loadPack({ events: [{ ...row(), trades }] }, "append");
}

function quiet(seed: number): Game {
  const g = createGame(seed);
  g.player.systems.oxygen.level = 3;
  g.player.systems.pilot.level = 3;
  g.player.systems.doors.level = 3;
  g.player.systems.sensors.level = 3;
  g.player.reactor = 25;
  g.scrap = 80;
  return g;
}

function agree(g: Game): { id: string; cost: number } | null {
  const choice = g.event?.choices.find((c) => c.id.startsWith("s:trade-scrap-for-upgrades:agree:"));
  if (!choice) return null;
  const cost = Number(choice.id.split(":").pop());
  return { id: choice.id, cost };
}

describe("trade scrap table", () => {
  it("packs the nine campaign rows", () => {
    assert.deepEqual(eventDef("trade-scrap-for-upgrades")?.trades, CAMPAIGN);
  });

  it("pays a fixed oxygen band and refuses a cost outside it", () => {
    replace([{ id: "oxygen", level: 1, lo: 12, hi: 12 }]);
    const g = quiet(4);
    g.player.systems.oxygen.level = 1;
    fillerChoose(g, INQUIRE);
    const deal = agree(g);
    assert.ok(deal);
    assert.equal(deal.id, "s:trade-scrap-for-upgrades:agree:oxygen:12");
    g.scrap = 40;
    fillerChoose(g, deal.id);
    assert.equal(g.scrap, 28);
    assert.equal(g.player.systems.oxygen.level, 2);

    const forged = quiet(5);
    forged.player.systems.oxygen.level = 1;
    forged.scrap = 100;
    fillerChoose(forged, INQUIRE);
    const body = forged.event?.body;
    fillerChoose(forged, "s:trade-scrap-for-upgrades:agree:oxygen:11");
    assert.equal(forged.scrap, 100);
    assert.equal(forged.player.systems.oxygen.level, 1);
    assert.equal(forged.event?.body, body);
  });

  it("offers nothing when the table is missing", () => {
    replace(undefined);
    const g = quiet(4);
    g.player.systems.oxygen.level = 1;
    g.player.reactor = 10;
    fillerChoose(g, INQUIRE);
    assert.equal(agree(g), null);
    assert.match(g.event?.body ?? "", /prepare to move on/);
    assert.equal(g.scrap, 80);
    assert.equal(g.player.systems.oxygen.level, 1);
  });

  it("rolls a wider band and pays the number on the button", () => {
    replace([{ id: "oxygen", level: 1, lo: 1, hi: 100 }]);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const g = quiet(seed);
      g.player.systems.oxygen.level = 1;
      g.scrap = 200;
      fillerChoose(g, INQUIRE);
      const deal = agree(g);
      assert.ok(deal);
      assert.ok(deal.cost >= 1 && deal.cost <= 100);
      seen.add(deal.cost);
      fillerChoose(g, deal.id);
      assert.equal(g.scrap, 200 - deal.cost);
      assert.equal(g.player.systems.oxygen.level, 2);
    }
    assert.ok(seen.size > 1);
  });

  it("raises oxygen past the printed maximum when that level has a row", () => {
    replace([{ id: "oxygen", level: 3, lo: 50, hi: 50 }]);
    const g = quiet(4);
    const power = g.player.systems.oxygen.power;
    fillerChoose(g, INQUIRE);
    const deal = agree(g);
    assert.ok(deal);
    assert.equal(deal.id, "s:trade-scrap-for-upgrades:agree:oxygen:50");
    fillerChoose(g, deal.id);
    assert.equal(g.player.systems.oxygen.level, 4);
    assert.equal(g.player.systems.oxygen.power, power);
    assert.equal(g.scrap, 30);
  });

  it("offers nothing when the only open specialty has no row", () => {
    replace([{ id: "oxygen", level: 1, lo: 15, hi: 20 }]);
    const g = quiet(4);
    for (const id of ["oxygen", "pilot", "doors", "sensors"] as SysId[]) g.player.systems[id].level = 0;
    g.player.reactor = 24;
    fillerChoose(g, INQUIRE);
    assert.equal(agree(g), null);
    assert.match(g.event?.body ?? "", /prepare to move on/);
    assert.equal(g.scrap, 80);
    assert.equal(g.player.reactor, 24);
  });

  it("skips an unleveled system row and an unknown specialty", () => {
    replace([
      { id: "oxygen", lo: 15, hi: 20 },
      { id: "ember", level: 1, lo: 5, hi: 5 },
      { id: "pilot", level: 1, lo: 9, hi: 9 },
    ]);
    const g = quiet(4);
    g.player.systems.oxygen.level = 1;
    g.player.systems.pilot.level = 1;
    fillerChoose(g, INQUIRE);
    assert.equal(agree(g)?.id, "s:trade-scrap-for-upgrades:agree:pilot:9");
  });

  it("matches a reactor row for that bar, then a row with no level", () => {
    replace([
      { id: "reactor", level: 10, lo: 3, hi: 3 },
      { id: "reactor", lo: 40, hi: 40 },
    ]);
    const atTen = quiet(4);
    atTen.player.reactor = 10;
    fillerChoose(atTen, INQUIRE);
    assert.equal(agree(atTen)?.id, "s:trade-scrap-for-upgrades:agree:reactor:3");

    const open = quiet(5);
    open.player.reactor = 24;
    fillerChoose(open, INQUIRE);
    assert.equal(agree(open)?.id, "s:trade-scrap-for-upgrades:agree:reactor:40");
    open.scrap = 80;
    fillerChoose(open, "s:trade-scrap-for-upgrades:agree:reactor:40");
    assert.equal(open.player.reactor, 25);
    assert.equal(open.reactorEvent, 1);
    assert.equal(open.scrap, 40);

    const capped = quiet(6);
    fillerChoose(capped, INQUIRE);
    assert.equal(agree(capped), null);
  });

  it("restores the campaign rows", () => {
    replace(undefined);
    assert.equal(eventDef("trade-scrap-for-upgrades")?.trades, undefined);
    resetPackForTests();
    assert.deepEqual(eventDef("trade-scrap-for-upgrades")?.trades, CAMPAIGN);
  });
});
