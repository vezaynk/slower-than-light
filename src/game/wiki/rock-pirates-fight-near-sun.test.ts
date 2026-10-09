import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship.",
  `A Rock ship is silhouetted against a sun in supernova. They hail: "Even out here you follow us! We only wish to be left alone!" Out of panic or anger, they charge their weapons.`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-pirates-fight-near-sun";
  b.name = "Rock pirates fight near sun";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock pirates fight near sun");
}

describe("Rock pirates fight near sun", () => {
  it("shows one of the two intros, and the fight starts beside a red giant", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rock-pirates-fight-near-sun:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rock-pirates-fight-near-sun:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "rock-pirates-fight-near-sun");
    assert.equal(g.flare, true);
    assert.equal(g.scrap, 10);
  });

  it("starts the Rock pirate ship beside a red giant on arrival and leaves no button", () => {
    // The page has no choice. One of the two printed intros, then "Fight a Rock pirate ship." redgiant=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rock-pirates-fight-near-sun";
    dest.name = "Rock pirates fight near sun";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rock");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.flare, true);
    assert.equal(g.fightEvent, "rock-pirates-fight-near-sun");
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});
