import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const ID = "c:slaver-hostile:1";
const LABEL = "1 in 3: fight the pirate ship. 2 in 3: nothing happens.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "PIRATE_SLAVER";
  b.name = "Crew demand: pirate ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crew demand: pirate ship");
}

describe("Slaver (hostile) Engines out-run", () => {
  it("stays closed below Engines level 6", () => {
    const g = createGame(1);
    g.player.systems.engines.level = 5;
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === ID && c.label === LABEL));
    assert.equal(choiceDisabled(g, ID), "Needs Engines level 6");
    choose(g, ID);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
  });

  it("level 6 engines get away or fight the pirate, equal among the three printed results", () => {
    let divert = false;
    let pace = false;
    let fought = false;
    for (let seed = 1; seed <= 80 && (!divert || !pace || !fought); seed++) {
      const g = createGame(seed);
      g.player.systems.engines.level = 6;
      open(g);
      choose(g, ID);
      const body = g.event?.body ?? "";
      if (body.includes(eventText("event_PIRATE_SLAVER_RUN_2_text"))) {
        divert = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        assert.equal(g.scrap, 10);
        assert.equal(body.includes("Nothing happens."), false);
      } else if (body.includes(eventText("event_PIRATE_SLAVER_RUN_3_text"))) {
        pace = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        assert.equal(g.scrap, 10);
        assert.equal(body.includes("Nothing happens."), false);
      } else {
        fought = true;
        assert.equal(g.phase, "event");
        assert.equal(g.event?.choices[0]?.id, "ship-resume");
        assert.ok((g.event?.body ?? "").includes(eventText("event_PIRATE_SLAVER_RUN_1_text")));
        assert.equal(
          g.log.some((line) => line.includes(eventText("event_PIRATE_SLAVER_RUN_1_text"))),
          false,
        );
        assert.equal(g.enemy?.pirate, true);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "slaver-hostile");
        assert.equal(g.enemy?.pirate, true);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(divert, true);
    assert.equal(pace, true);
    assert.equal(fought, true);
  });
});
