import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginBoarding,
  choose,
  commitJump,
  createGame,
  showEventLines,
  startCombat,
} from "./sim.ts";

const WAIT =
  "A pirate ship was lying in wait inside this asteroid field. It immediately moves in to attack.";

describe("event lines stay on the card", () => {
  it("opens a continue card and leaves the sky log alone", () => {
    const g = createGame(1);
    g.phase = "map";
    g.event = null;
    g.log = ["Shields up."];
    showEventLines(g, ["Scrap: 12.", "Scrap: 12."]);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.event?.body, "Scrap: 12.");
    assert.equal(g.event?.choices[0]?.id, "ack");
    assert.deepEqual(g.log, ["Shields up."]);
    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
    assert.deepEqual(g.log, ["Shields up."]);
  });

  it("pauses an armed fight until Continue", () => {
    const g = createGame(2);
    startCombat(g, "Pirate ship");
    const onScope = g.log[0];
    assert.match(onScope ?? "", / on the scope\.$/);
    showEventLines(g, ["You power up your weapons and engage the pirate ship."]);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.enemy == null, false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, "You power up your weapons and engage the pirate ship.");
    assert.equal(g.log.includes("You power up your weapons and engage the pirate ship."), false);
    assert.equal(g.log[0], onScope);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.paused, false);
    assert.equal(g.event, null);
    assert.equal(g.log[0], onScope);
  });

  it("pauses a shipless boarding until Continue", () => {
    const g = createGame(4);
    const home = g.crew[0];
    assert.ok(home);
    g.crew.push({
      ...home,
      id: "boarder",
      name: "Pirate",
      side: "enemy",
      aboard: "player",
      hp: home.maxHp,
    });
    g.phase = "map";
    g.event = null;
    beginBoarding(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    showEventLines(g, ["Pirates burst in from the crates."]);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, "Pirates burst in from the crates.");
    assert.equal(g.log.includes("Pirates burst in from the crates."), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.paused, false);
    assert.equal(g.event, null);
    assert.equal(
      g.crew.some((c) => c.id === "boarder" && c.hp > 0),
      true,
    );
  });

  it("shows a pirate arrival on the card until the fight button", () => {
    const g = createGame(3);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "PIRATE_ASTEROID";
    dest.name = "Pirate fight in asteroid field";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, WAIT);
    assert.equal(g.log.includes(WAIT), false);
    assert.equal(g.event?.choices[0]?.id, "c:pirate-fight-in-asteroid-field:0");
    choose(g, "c:pirate-fight-in-asteroid-field:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.asteroid, true);
    assert.equal(g.enemy?.pirate, true);
    assert.match(g.log[0] ?? "", / on the scope\.$/);
    assert.equal(g.log.includes(WAIT), false);
  });
});
