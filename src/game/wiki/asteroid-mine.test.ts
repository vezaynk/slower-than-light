import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import { FILLER_PAGES, fillerChoose } from "./filler-events.ts";

const MINE = "c:large-asteroid-field:2";

describe("Large asteroid field mining", () => {
  it("stays closed without a fitted Scrap Recovery Arm", () => {
    const g = createGame(4);
    const page = FILLER_PAGES.find((row) => row.slug === "large-asteroid-field");
    assert.ok(page?.choices.some((choice) => choice.id === MINE && choice.label === "Attempt to mine the asteroids."));
    assert.equal(choiceDisabled(g, MINE), "Needs a Scrap Recovery Arm");
    const scrap = g.scrap;
    fillerChoose(g, MINE);
    assert.equal(g.scrap, scrap);
    assert.equal(g.phase, "map");
    assert.equal(g.player.hull, 30);
  });

  it("a fitted arm pays high scrap and nothing else", () => {
    const g = createGame(4);
    g.augments = ["hook"];
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
    assert.match(g.event!.body, /usable material/);
    assert.match(g.event!.body, /Scrap: /);
  });
});
