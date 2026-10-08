import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerEvent } from "./filler-events.ts";

const LEAD = "You scan the battlefield, and with the aid of your Sensors, you are able to salvage a moderate amount of material from the wreckage. You prepare to jump.";
const SCAN = "c:battlefield-wreckage:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:battlefield-wreckage";
  b.name = "Battlefield wreckage";
  g.here = b.id;
  g.event = citedEvent(g, b);
  // The card lives on the filler list, stamped filler:battlefield-wreckage. citedEvent may be null.
  if (!g.event) {
    b.flag = "filler:battlefield-wreckage";
    g.event = fillerEvent(g, b);
  }
  g.phase = "event";
  assert.equal(g.event?.title, "Battlefield wreckage");
}

describe("Battlefield wreckage Improved Sensors", () => {
  it("stays closed below Sensors level 2", () => {
    const g = createGame(1);
    g.player.systems.sensors.level = 1;
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    assert.ok(g.event?.choices.some((c) => c.id === SCAN && c.label === "Use your Sensors to scan the wreckage."));
    // INFERRED: the refusal line. The page names Sensors level 2 and prints no sentence.
    assert.equal(choiceDisabled(g, SCAN), "Needs Sensors level 2");
    choose(g, SCAN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
  });

  it("Sensors level 2 salvages medium resources with some scrap", () => {
    const g = createGame(2);
    g.player.systems.sensors.level = 2;
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const scrap = g.scrap;
    const weapons = g.player.weapons.length;
    assert.equal(choiceDisabled(g, SCAN), null);
    choose(g, SCAN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    const body = g.event?.body ?? "";
    assert.ok(body.includes(LEAD));
    assert.equal(body.includes("Nothing happens."), false);
    assert.ok(g.scrap > scrap);
    const df = g.fuel - fuel;
    const dm = g.missiles - missiles;
    const dp = g.player.parts - parts;
    assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
    assert.ok(df === 0 || (df >= 2 && df <= 4));
    assert.ok(dm === 0 || (dm >= 2 && dm <= 4));
    assert.ok(dp === 0 || dp === 1);
    assert.equal(g.player.weapons.length, weapons);
  });
});
