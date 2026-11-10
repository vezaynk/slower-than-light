import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_REBEL_UNDETECTED";
  b.name = "Rebel fight choice in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function cloak(g: Game) {
  g.player.kits.cloaking = {
    id: "cloaking",
    level: 1,
    power: 1,
    left: 5,
    cool: 0,
    target: null,
    on: true,
    aux: 0,
  };
}

describe("Rebel fight choice in nebula conceal", () => {
  it("offers conceal and cloaking beside the attack", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [
        "c:rebel-fight-choice-in-nebula:0",
        "c:rebel-fight-choice-in-nebula:1",
        "c:rebel-fight-choice-in-nebula:2",
      ],
    );
    assert.equal(choiceDisabled(g, "c:rebel-fight-choice-in-nebula:2"), "Needs Cloaking");
    const scrap = g.scrap;
    choose(g, "c:rebel-fight-choice-in-nebula:2");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
    assert.notEqual(g.phase, "combat");
  });

  it("cloaking slips away and spends nothing", () => {
    // Wiki citations:
    // > "(Cloaking) Cloak to stay hidden." — [[Rebel fight choice in nebula]]
    // > "You use your cloaking system to slip further into the nebula undetected." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
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
    // Wiki citations:
    // > "Attempt to remain concealed." — [[Rebel fight choice in nebula]]
    // > "You immediately slip further into the clouds, but not quickly enough. The rebel catches sight of you and moves in to engage!" — [[Rebel fight choice in nebula]]
    // > "The ship spots you and gives chase. After some quick maneuvering you were able to lose your pursuers in the clouds. You expect they warned the fleet of your position, however." — [[Rebel fight choice in nebula]]
    // > "Rebel Fleet pursuit is doubled for 1 jump." — [[Rebel fight choice in nebula]]
    // > "You power down non-essential systems and slip into the cloud. The ship never noticed you." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
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
    // Wiki citations:
    // > "(Engines) Fully power the engines to out-run them." — [[Rebel fight choice in nebula]]
    // > "Your powerful engines allow you to out-distance the ship and eventually lose it within the nebula." — [[Rebel fight choice in nebula]]
    // > "Nothing happens." — [[Rebel fight choice in nebula]]
    // > "Prepare to fight." — [[Rebel fight choice in nebula]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight choice in nebula]]
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
      const lead = "Prepare to fight.";
      assert.equal(g.phase, "event");
      assert.equal(g.event?.body, lead);
      assert.equal(g.log.includes(lead), false);
      assert.equal(g.event?.choices[0]?.id, "ship-resume");
      choose(g, "ship-resume");
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
