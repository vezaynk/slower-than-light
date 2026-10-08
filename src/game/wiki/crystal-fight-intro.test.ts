import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You arrive near a fleet of crystal ships, civilian or mercantile from the looks of them. You pause to scan one but they react immediately and send an escort to fight you off. Prepare to engage!",
  "You arrive at the Beacon and are immediately greeted by an automatic message or warning of some kind. The translator can't seem to discern its purpose but after a few short moments an alarm goes off and a hostile ship jumps in!",
  `You receive a message, "Hah. It looks like another worthless alien-filled craft. Prepare to meet your maker!" Weapon locks detected.`,
  `A Crystalline ship messages you, "I've heard tales that our isolation has finally ended. As a warrior I must demand to test my skills against you!" Before you can respond they move in to attack.`,
  "You arrive in a busy sector. At first no one pays any mind to your alien ship but soon you're registering a number of scan signatures. You get the feeling you're not wanted here just seconds before registering enemy weapon locks!",
  "You jump next to a node busy with traffic, but before long all nearby ships notice you and keep their distance, uncertain of your allegiance. After an awkward standoff, a military ship breaks away from the rest and charges you.",
  "A barrage of rasps and clicks is broadcast over the comm; the universal translator understands little, but the words 'aliens', 'allowed' and 'no' come through quite clearly. You'll have to prove your right to be here in combat!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystal-fight";
  b.name = "Crystal fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystal fight");
}

describe("Crystal fight intro", () => {
  it("shows one of the seven printed intros, then fights a Crystal ship", () => {
    assert.equal(INTROS.length, 7);
    assert.equal(new Set(INTROS).size, 7);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:crystal-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:crystal-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "crystal");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "crystal-fight");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });
});
