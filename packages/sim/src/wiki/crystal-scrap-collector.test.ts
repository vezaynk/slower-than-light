import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { eventText } from "../event-text.ts";

const OFFER = "c:crystal-scrap-collector:0";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "crystal-scrap-collector";
  b.name = "Crystal scrap collector";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal scrap collector");
}

describe("Crystal scrap collector", () => {
  it("spends 35 scrap, then grants a Crystal or one of the two Crystal weapons", () => {
    const poor = createGame(1);
    open(poor);
    poor.scrap = 34;
    assert.equal(choiceDisabled(poor, OFFER), "Need 35 scrap");
    choose(poor, OFFER);
    assert.equal(poor.scrap, 34);
    assert.equal(poor.event?.title, "Crystal scrap collector");

    let crew = false;
    let lockdown = false;
    let burst = false;
    for (let seed = 1; seed <= 40 && (!crew || !lockdown || !burst); seed++) {
      const g = createGame(seed);
      open(g);
      g.scrap = 35;
      const people = g.crew.filter((c) => c.side === "player").length;
      const guns = g.player.weapons.length;
      choose(g, OFFER);
      assert.equal(g.scrap, 0);
      assert.ok((g.event?.body ?? "").includes(eventText("event_CRYSTAL_SCRAP_EXCITED_c1_text")));
      const join = g.event?.choices.find((c) => c.id === "q:crystal-collector:join");
      const kind = g.event?.choices.find((c) => c.id === "q:crystal-collector:kind");
      assert.ok(join && kind);
      if (seed % 2 === 0) {
        choose(g, join.id);
        crew = true;
        const body = g.event?.body ?? "";
        assert.ok(body.includes(eventText("event_CRYSTAL_SCRAP_EXCITED_c1_c1_text")), body);
        assert.match(body, /Crystal crewmember joins you/);
        assert.equal(g.crew.filter((c) => c.side === "player").length, people + 1);
        assert.equal(g.player.weapons.length, guns);
      } else {
        choose(g, kind.id);
        const body = g.event?.body ?? "";
        assert.ok(body.includes(eventText("event_CRYSTAL_SCRAP_EXCITED_c1_c2_text")), body);
        assert.match(body, /mounted\.|stowed in cargo\.|choose what to leave behind/);
        assert.equal(g.player.weapons.length, guns + (/mounted\./.test(body) ? 1 : 0));
        assert.equal(g.crew.filter((c) => c.side === "player").length, people);
        if (body.includes("Crystal Lockdown Bomb")) lockdown = true;
        if (body.includes("Crystal Burst Mark II")) burst = true;
      }
    }
    assert.equal(crew && lockdown && burst, true);
  });
});
