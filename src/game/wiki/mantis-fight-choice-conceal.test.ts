import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight-choice";
  b.name = "Mantis fight choice";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function cloak(g: Game) {
  g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
}

const CONCEAL_FIGHT = [
  "You power down non-essential systems in an attempt to remain unnoticed. It looks like they are about to leave when suddenly they turn and set course toward you, weapons powered.",
  "Before you have a chance to slink away the Mantis ship notices you and powers up their weapons.",
];

const CLOAK_AWAY = [
  "You cloak and shut down non-essential systems. In a short time the Mantis ship jumps away, no doubt in search of prey.",
  "You quickly cloak the ship and move out of immediate scanning range. You appear to have gotten away undetected.",
];

describe("Mantis fight choice conceal", () => {
  it("offers conceal and cloaking beside the attack", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:mantis-fight-choice:0", "c:mantis-fight-choice:1", "c:mantis-fight-choice:2"],
    );
    assert.equal(choiceDisabled(g, "c:mantis-fight-choice:2"), "Needs Cloaking");
    const scrap = g.scrap;
    choose(g, "c:mantis-fight-choice:2");
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, scrap);
    assert.notEqual(g.phase, "combat");
  });

  it("conceal fights twice as often as it slips away", () => {
    let fights = 0;
    let hidden = 0;
    const lines = new Set<string>();
    for (let seed = 1; seed <= 90; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:mantis-fight-choice:1");
      if (g.phase === "combat") {
        fights += 1;
        assert.equal(g.enemy?.faction, "mantis");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.fightEvent, "mantis-fight-choice");
        assert.equal(g.scrap, 10);
        const line = g.log.find((row) => CONCEAL_FIGHT.includes(row));
        assert.ok(line, g.log.join(" | "));
        lines.add(line);
      } else {
        hidden += 1;
        assert.match(g.event?.body ?? "", /failed to notice your ship/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.notEqual(g.phase, "combat");
      }
    }
    assert.equal(lines.size, CONCEAL_FIGHT.length);
    assert.ok(fights > hidden, `${fights} fights, ${hidden} hidden`);
    assert.ok(hidden > 0);
  });

  it("cloaking slips away twice as often as it is spotted", () => {
    let away = 0;
    let fights = 0;
    const lines = new Set<string>();
    for (let seed = 1; seed <= 90; seed++) {
      const g = createGame(seed);
      open(g);
      cloak(g);
      assert.equal(choiceDisabled(g, "c:mantis-fight-choice:2"), null);
      choose(g, "c:mantis-fight-choice:2");
      if (g.phase === "combat") {
        fights += 1;
        assert.equal(g.enemy?.faction, "mantis");
        assert.equal(g.fightEvent, "mantis-fight-choice");
        assert.equal(g.scrap, 10);
        assert.ok(g.log.some((row) => /not quickly enough/.test(row)));
      } else {
        away += 1;
        const body = g.event?.body ?? "";
        assert.match(body, /Nothing happens/);
        const line = CLOAK_AWAY.find((row) => body.includes(row));
        assert.ok(line, body);
        lines.add(line);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(lines.size, CLOAK_AWAY.length);
    assert.ok(away > fights, `${away} away, ${fights} fights`);
    assert.ok(fights > 0);
  });
});
