import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-choice-in-nebula";
  b.name = "Rebel fight choice in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function cloak(g: Game) {
  g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
}

describe("Rebel fight choice in nebula conceal", () => {
  it("offers conceal and cloaking beside the attack", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:rebel-fight-choice-in-nebula:0", "c:rebel-fight-choice-in-nebula:1", "c:rebel-fight-choice-in-nebula:2"],
    );
    assert.equal(choiceDisabled(g, "c:rebel-fight-choice-in-nebula:2"), "Needs Cloaking");
    const scrap = g.scrap;
    choose(g, "c:rebel-fight-choice-in-nebula:2");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
    assert.notEqual(g.phase, "combat");
  });

  it("cloaking slips away and spends nothing", () => {
    const g = createGame(2);
    open(g);
    cloak(g);
    assert.equal(choiceDisabled(g, "c:rebel-fight-choice-in-nebula:2"), null);
    const fleet = g.fleet;
    choose(g, "c:rebel-fight-choice-in-nebula:2");
    assert.match(g.event?.body ?? "", /cloaking system/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, fleet);
  });

  it("conceal is caught, doubles pursuit, or stays hidden", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 3; seed++) {
      const g = createGame(seed);
      const fleet = g.fleet;
      open(g);
      choose(g, "c:rebel-fight-choice-in-nebula:1");
      const body = g.event?.body ?? "";
      if (/not quickly enough/.test(body)) {
        seen.add("caught");
        assert.equal(g.phase, "event");
        assert.deepEqual(
          g.event?.choices.map((c) => c.id),
          ["q:rebel-nebula:fight", "q:rebel-nebula:engines"],
        );
        assert.equal(g.fleet, fleet);
        assert.equal(g.scrap, 10);
      } else if (/gives chase/.test(body)) {
        seen.add("chase");
        assert.match(body, /doubled for 1 jump/);
        assert.equal(g.fleet, fleet + 1);
        assert.equal(g.scrap, 10);
        assert.notEqual(g.phase, "combat");
      } else {
        seen.add("hidden");
        assert.match(body, /never noticed you/);
        assert.match(body, /Nothing happens/);
        assert.equal(g.fleet, fleet);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(seen.size, 3);
  });

  it("engines at level 4 lose the ship, and preparing to fight starts a Rebel ship", () => {
    let caught: Game | undefined;
    for (let seed = 1; seed <= 40 && !caught; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:rebel-fight-choice-in-nebula:1");
      if (/not quickly enough/.test(g.event?.body ?? "")) caught = g;
    }
    assert.ok(caught);
    assert.equal(choiceDisabled(caught, "q:rebel-nebula:engines"), "Needs level 4 Engines");
    const low = caught.scrap;
    choose(caught, "q:rebel-nebula:engines");
    assert.equal(caught.phase, "event");
    assert.equal(caught.scrap, low);
    assert.match(caught.event?.body ?? "", /not quickly enough/);

    caught.player.systems.engines.level = 4;
    assert.equal(choiceDisabled(caught, "q:rebel-nebula:engines"), null);
    choose(caught, "q:rebel-nebula:engines");
    assert.match(caught.event?.body ?? "", /powerful engines/);
    assert.match(caught.event?.body ?? "", /Nothing happens/);
    assert.equal(caught.scrap, 10);

    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      const crew = g.crew.filter((c) => c.side === "player").length;
      open(g);
      choose(g, "c:rebel-fight-choice-in-nebula:1");
      if (!/not quickly enough/.test(g.event?.body ?? "")) continue;
      choose(g, "q:rebel-nebula:fight");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "rebel");
      assert.equal(g.enemy?.pirate, false);
      assert.equal(g.fightEvent, "rebel-fight-choice-in-nebula");
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.scrap, 10);
      return;
    }
    assert.fail("no caught result");
  });
});
