import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";
import { textRe } from "./quest-text-re.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "MANTIS_FIGHT_CHOICE";
  b.name = "Optional fight: Mantis ship";
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

const CONCEAL_FIGHT = [
  eventText("event_MANTIS_FIGHT_CHOICE_AVOID_3_text"),
  eventText("event_MANTIS_FIGHT_CHOICE_AVOID_2_text"),
];

const CLOAK_AWAY = [
  eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_2_text"),
  eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_1_text"),
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
    // Wiki citations:
    // > "You power down non-essential systems and wait for the FTL drive to charge. They either don't want to fight or have failed to notice your ship, the latter being more likely." — [[Mantis fight choice]]
    // > "Nothing happens." — [[Mantis fight choice]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice]]
    let fights = 0;
    let hidden = 0;
    const lines = new Set<string>();
    for (let seed = 1; seed <= 90; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:mantis-fight-choice:1");
      const fightCard =
        g.phase === "combat" ||
        (g.phase === "event" && g.enemy != null && g.event?.choices[0]?.id === "ship-resume");
      if (fightCard) {
        fights += 1;
        const line = CONCEAL_FIGHT.find((row) => g.event?.body === row);
        assert.ok(line, g.event?.body ?? "");
        assert.equal(g.log.includes(line), false);
        lines.add(line);
        if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemy?.faction, "mantis");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.fightEvent, "mantis-fight-choice");
        assert.equal(g.scrap, 10);
      } else {
        hidden += 1;
        assert.match(g.event?.body ?? "", textRe("event_MANTIS_FIGHT_CHOICE_AVOID_1_text"));
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
    // Wiki citations:
    // > "(Cloaking) Cloak to stay hidden." — [[Mantis fight choice]]
    // > "Nothing happens." — [[Mantis fight choice]]
    // > "You quickly cloak the ship, but not quickly enough. They spot you and move in to engage." — [[Mantis fight choice]]
    // > "Fight a Mantis ship (default rewards)." — [[Mantis fight choice]]
    let away = 0;
    let fights = 0;
    const lines = new Set<string>();
    for (let seed = 1; seed <= 90; seed++) {
      const g = createGame(seed);
      open(g);
      cloak(g);
      assert.equal(choiceDisabled(g, "c:mantis-fight-choice:2"), null);
      choose(g, "c:mantis-fight-choice:2");
      const spotted =
        eventText("event_MANTIS_FIGHT_CHOICE_CLOAK_3_text");
      const fightCard =
        g.phase === "combat" ||
        (g.phase === "event" && g.enemy != null && g.event?.choices[0]?.id === "ship-resume");
      if (fightCard) {
        fights += 1;
        assert.equal(g.event?.body, spotted);
        assert.equal(g.log.includes(spotted), false);
        if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemy?.faction, "mantis");
        assert.equal(g.fightEvent, "mantis-fight-choice");
        assert.equal(g.scrap, 10);
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
