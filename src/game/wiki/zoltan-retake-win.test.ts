import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { scrapBand } from "./surrender.ts";

const ENGAGE = "c:zoltan-retake-the-ship:0";
const SALVAGE = "You salvage what you can from the ship.";
const AIM = "deeply dissatisfied with your aiming";
const CREW = "The last pirate life-signs blink out and the Zoltan returns to his bridge.";
const ACCEPT = "I accept your offer.";
const REFUSE = "I must decline.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-retake-the-ship";
  b.name = "Zoltan retake the ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function paid(g: Game): number {
  return Number(g.event?.body.match(/Scrap: (\d+)/)?.[1]);
}

describe("Zoltan retake the ship reward", () => {
  it("pays medium scrap when the ship is destroyed, high scrap on a crew kill, and hires a Zoltan for 40", () => {
    const won = createGame(1);
    open(won);
    const fuel = won.fuel;
    const missiles = won.missiles;
    const parts = won.player.parts;
    const augs = won.augments.length;
    choose(won, ENGAGE);
    assert.ok(won.enemy);
    for (const w of won.enemy.weapons) w.enabled = false;
    won.enemy.hull = 0;
    step(won, 0.05);
    assert.equal(won.phase, "event");
    assert.ok(won.event?.body.includes(SALVAGE), won.event?.body);
    assert.ok(won.event?.body.includes(AIM));
    const med = paid(won);
    const [lo, hi] = scrapBand(won, "medium");
    assert.ok(med >= lo && med <= hi, `scrap ${med}`);
    assert.equal(won.scrap, 10 + med);
    const df = won.fuel - fuel;
    const dm = won.missiles - missiles;
    const dp = won.player.parts - parts;
    assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
    assert.equal(won.augments.length, augs);
    assert.equal(won.event?.choices.some((c) => c.id === "s:zoltan-raft:hire"), true);

    won.scrap = 39;
    assert.equal(choiceDisabled(won, "s:zoltan-raft:hire"), "Need 40 scrap");
    choose(won, "s:zoltan-raft:hire");
    assert.equal(won.scrap, 39);
    assert.ok(won.event?.body.includes(AIM));

    const gone = createGame(2);
    assert.equal(pageWin(gone, "zoltan-retake-the-ship", false), true);
    const held = gone.scrap;
    choose(gone, "s:zoltan-raft:go");
    assert.equal(gone.event?.body, "Nothing happens.");
    assert.equal(gone.scrap, held);

    let accepted = 0;
    let refused = 0;
    for (let seed = 1; seed <= 80 && (accepted === 0 || refused === 0); seed++) {
      const g = createGame(seed);
      assert.equal(pageWin(g, "zoltan-retake-the-ship", false), true);
      g.scrap = 80;
      const sparks = g.crew.filter((c) => c.side === "player" && c.kin === "spark").length;
      choose(g, "s:zoltan-raft:hire");
      if (g.event?.body.includes(ACCEPT)) {
        accepted++;
        assert.equal(g.scrap, 40);
        assert.ok(g.event.body.includes("A Zoltan crewmember joins you."));
        assert.equal(g.crew.filter((c) => c.side === "player" && c.kin === "spark").length, sparks + 1);
        assert.equal(g.augments.length, g.augments.length);
      } else if (g.event?.body.includes(REFUSE)) {
        refused++;
        assert.equal(g.scrap, 80);
        assert.ok(g.event.body.includes("Nothing happens."));
        assert.equal(g.crew.filter((c) => c.side === "player" && c.kin === "spark").length, sparks);
      }
    }
    assert.ok(accepted > 0 && refused > 0, `accept ${accepted} refuse ${refused}`);

    const killed = createGame(5);
    const before = killed.augments.length;
    assert.equal(pageWin(killed, "zoltan-retake-the-ship", true), true);
    assert.ok(killed.event?.body.includes(CREW), killed.event?.body);
    const high = paid(killed);
    const [hlo, hhi] = scrapBand(killed, "high");
    assert.ok(high >= hlo && high <= hhi, `high ${high}`);
    assert.equal(killed.scrap, 10 + high);
    assert.equal(killed.augments.length, before);
    assert.equal(killed.event?.choices.some((c) => c.id === "s:zoltan-raft:hire"), false);
  });
});
