import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

const INQUIRE = "c:trade-scrap-for-upgrades:0";

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

describe("Trade scrap for upgrades", () => {
  it("is a card an items draw can reach", () => {
    assert.equal(pageForRow("Trade scrap for upgrades")?.slug, "trade-scrap-for-upgrades");
  });

  it("draws one of the four printed intros", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      const b = g.beacons.find((x) => x.kind === "event");
      assert.ok(b);
      b.flag = "filler:trade-scrap-for-upgrades";
      const card = fillerEvent(g, b);
      assert.ok(card);
      seen.add(card.body);
      assert.equal(card.choices[0]?.id, INQUIRE);
    }
    assert.equal(seen.size, 4);
  });

  it("spends the shown oxygen band and raises that system one level", () => {
    const g = quiet(4);
    g.player.systems.oxygen.level = 1;
    fillerChoose(g, INQUIRE);
    const deal = agree(g);
    assert.ok(deal);
    assert.ok(deal.cost >= 15 && deal.cost <= 20);
    assert.match(g.event?.body ?? "", /Oxygen system/);
    g.scrap = deal.cost - 1;
    assert.equal(choiceDisabled(g, deal.id), `Need ${deal.cost} scrap`);
    fillerChoose(g, deal.id);
    assert.equal(g.player.systems.oxygen.level, 1);
    g.scrap = 80;
    fillerChoose(g, deal.id);
    assert.equal(g.player.systems.oxygen.level, 2);
    assert.equal(g.scrap, 80 - deal.cost);
    assert.match(g.event?.body ?? "", /Oxygen system is upgraded to level 2/);
  });

  it("raises Sensors from 2 to 3 inside 35-45 scrap", () => {
    const g = quiet(6);
    g.player.systems.sensors.level = 2;
    g.player.systems.sensors.power = 2;
    fillerChoose(g, INQUIRE);
    const deal = agree(g);
    assert.ok(deal);
    assert.ok(deal.cost >= 35 && deal.cost <= 45);
    fillerChoose(g, deal.id);
    assert.equal(g.player.systems.sensors.level, 3);
    assert.equal(g.player.systems.sensors.power, 3);
    assert.match(g.event?.body ?? "", /Sensors are upgraded to level 3/);
  });

  it("adds one reactor bar and does not count it as a bought upgrade", () => {
    const g = quiet(8);
    g.player.reactor = 24;
    fillerChoose(g, INQUIRE);
    const deal = agree(g);
    assert.ok(deal);
    assert.ok(deal.cost >= 15 && deal.cost <= 25);
    fillerChoose(g, deal.id);
    assert.equal(g.player.reactor, 25);
    assert.equal(g.reactorEvent, 1);
    assert.match(g.event?.body ?? "", /reactor is upgraded/);
  });

  it("a decline spends nothing", () => {
    const g = quiet(2);
    g.player.systems.pilot.level = 1;
    fillerChoose(g, INQUIRE);
    const before = g.scrap;
    const level = g.player.systems.pilot.level;
    fillerChoose(g, "s:trade-scrap-for-upgrades:decline");
    assert.equal(g.scrap, before);
    assert.equal(g.player.systems.pilot.level, level);
    assert.match(g.event?.body ?? "", /prepare to move on/);
  });

  it("offers nothing when every printed specialty is closed", () => {
    const g = quiet(3);
    for (const id of ["oxygen", "pilot", "doors", "sensors"] as SysId[]) g.player.systems[id].level = 0;
    fillerChoose(g, INQUIRE);
    assert.equal(agree(g), null);
    assert.match(g.event?.body ?? "", /prepare to move on/);
    assert.equal(g.scrap, 80);
  });

  it("can offer each specialty that is still open", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = quiet(seed);
      g.player.systems.oxygen.level = 2;
      g.player.systems.pilot.level = 1;
      g.player.systems.doors.level = 2;
      g.player.systems.sensors.level = 1;
      g.player.reactor = 10;
      fillerChoose(g, INQUIRE);
      const id = agree(g)?.id ?? "";
      const kind = id.split(":")[3];
      assert.ok(kind);
      seen.add(kind);
    }
    assert.deepEqual([...seen].sort(), ["doors", "oxygen", "pilot", "reactor", "sensors"]);
  });
});
