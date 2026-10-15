import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { allMantisCrew, joinCrew, rollScriptedOffer } from "../wiki/surrender.ts";
import "./base.ts";
import { crewDef, loadPack, resetPackForTests, weaponDef } from "@stl/pack";

afterEach(() => resetPackForTests());

describe("event grants", () => {
  it("stamps an appended race's health onto a joined crew and a rewritten enemy", () => {
    loadPack({ crew: [{ ...crewDef("blade"), hp: 40 }] }, "append");
    const g = createGame(1);
    assert.equal(joinCrew(g, "Mantis"), true);
    const joined = g.crew[g.crew.length - 1];
    assert.equal(joined?.kin, "blade");
    assert.equal(joined?.hp, 40);
    assert.equal(joined?.maxHp, 40);

    g.crew.push({
      id: "e1",
      name: "Human",
      side: "enemy",
      aboard: "enemy",
      hp: 100,
      maxHp: 100,
      room: "e-pilot",
      path: [],
      move: 0,
      think: 0,
      tone: 3,
      kin: "plain",
    });
    allMantisCrew(g);
    const turned = g.crew.find((c) => c.id === "e1");
    assert.equal(turned?.kin, "blade");
    assert.equal(turned?.hp, 40);
    assert.equal(turned?.maxHp, 40);
  });

  it("resolves a named weapon reward from the pack", () => {
    const spark = weaponDef("spark");
    assert.ok(spark);
    loadPack({ weapons: [{ ...spark, id: "ember", name: "Ember", price: 20 }] }, "append");
    const offer = rollScriptedOffer(createGame(1), {
      page: "test",
      chance: 100,
      low: 0,
      high: 100,
      reward: { k: "weapon", name: "Ember" },
      hail: "hail",
      accept: "accept",
      refuse: "refuse",
    });
    assert.equal(offer.weapon, "ember");
  });
});
