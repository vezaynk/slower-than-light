import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:space-station-under-construction";
  b.name = "Space station under construction";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Space station under construction");
}

describe("Space station under construction decline", () => {
  it("declining shows the printed cut-transmission sentence and nothing happens", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:space-station-under-construction:1");
    assert.equal(g.event?.body, `"I understand." Transmission has been cut.\n\nNothing happens.`);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});

const OFFER =
  `"Interesting. So this metal man can help us make some of these unique parts out of scrap? That would be a huge help." Your crewmember checks over the blueprints and quickly converts some of their base metal sheets into the specialized parts.\n\n"Amazing! This robot thing could save us a ton of time. Could I buy it off you?"`;
const PITY =
  "A pity. In terms of payment, here's some of the scrap metal we don't need, now that we've got the necessary parts.";

describe("Space station under construction Lanius help", () => {
  it("refusing the sale shows the printed pity sentence and pays medium scrap", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:space-station-under-construction:2"), "Needs a Lanius crewmember");
    choose(bare, "c:space-station-under-construction:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "voidlung");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(choiceDisabled(dead, "c:space-station-under-construction:2"), "Needs a Lanius crewmember");

    const g = createGame(3);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    const crew = g.crew.filter((c) => c.side === "player").length;
    const augments = [...g.augments];
    assert.equal(choiceDisabled(g, "c:space-station-under-construction:2"), null);
    choose(g, "c:space-station-under-construction:2");
    assert.equal(g.event?.body, OFFER);
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["Our crew is not for sale."],
    );
    const before = g.scrap;
    choose(g, "q:station:nosale");
    const [lo, hi] = mediumScrapBand(g.difficulty ?? "normal", g.sector);
    assert.equal(g.event?.body, `${PITY}\n\nScrap: ${g.scrap - before}.`);
    assert.ok(g.scrap - before >= lo && g.scrap - before <= hi);
    assert.equal(g.crew.filter((c) => c.side === "player" && c.hp > 0).length, crew);
    assert.deepEqual(g.augments, augments);
  });
});
