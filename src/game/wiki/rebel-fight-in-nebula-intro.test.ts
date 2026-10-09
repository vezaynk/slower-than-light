import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "A ship bearing Rebel colors can be seen waiting near the beacon. They must have been waiting for you, since they engage immediately.",
  "The Rebels must have anticipated you would try to lose them within the nebula. A scout is waiting for you at the beacon.",
  "It looks like you will be unable to avoid the Rebels by traveling through the nebula. A Rebel ship is waiting for you near the beacon.",
  "Shortly after you arrive, a Rebel ship jumps nearby. There looks to be no escape. Prepare for a fight!",
  "Newton-knows what brings this Rebel ship so far out; its captain hails, but does a double take when he identifies your ship. They open fire.",
  "A Rebel ship hails, but you don't take chances in conditions like this. You block the frequency and prepare to engage.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-in-nebula";
  b.name = "Rebel fight in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight in nebula");
}

describe("Rebel fight in nebula intro", () => {
  it("shows one of the seven printed intros, then fights a rebel ship", () => {
    assert.equal(INTROS.length, 7);
    assert.equal(new Set(INTROS).size, 7);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 240 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-in-nebula:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-fight-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-in-nebula");
    assert.equal(g.scrap, 10);
  });

  it("starts the Rebel ship on arrival and leaves no button", () => {
    // The page has no choice. One of the seven printed intros, then "Fight a Rebel ship." nebula=true. unique=false.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:rebel-fight-in-nebula";
    dest.name = "Rebel fight in nebula";
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
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-in-nebula");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});
