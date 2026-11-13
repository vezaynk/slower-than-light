import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { choiceDisabled } from "../sim.ts";
import "../pack/base.ts";
import { fillerChoose } from "./filler-events.ts";
import { startedGame } from "../test-start.ts";

const MINE = "c:large-asteroid-field:2";

describe("Large asteroid field mining", () => {
  it("stays closed without a fitted Scrap Recovery Arm", () => {
    const g = startedGame(4);
    const page = allEvents().find((event) => event.dest === "Large asteroid field");
    assert.ok(
      page?.choices.some((choice) => choice.id === MINE && choice.label === "Gain high scrap."),
    );
    assert.equal(choiceDisabled(g, MINE), "Needs a Scrap Recovery Arm");
    const scrap = g.scrap;
    fillerChoose(g, MINE);
    assert.equal(g.scrap, scrap);
    assert.equal(g.phase, "map");
    assert.equal(g.player.hull, 30);
  });

  it("a fitted arm pays high scrap and nothing else", () => {
    const g = startedGame(4);
    g.augments = ["SCRAP_COLLECTOR"];
    assert.equal(choiceDisabled(g, MINE), null);
    const scrap = g.scrap;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const weapons = g.player.weapons.length;
    fillerChoose(g, MINE);
    assert.ok(g.scrap > scrap);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.player.weapons.length, weapons);
    assert.equal(g.player.hull, 30);
    assert.ok(g.player.rooms.every((room) => room.fire === 0 && room.breach === 0));
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.includes(eventText("event_ASTEROID_EXPLORE_c3_text")));
    assert.match(g.event!.body, /Scrap: /);
  });
});
