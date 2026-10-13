import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const PLANS = "c:crystalline-ship-messaging-about-rebels";
const OUTRUN =
  "It was never your intention to lead the Rebels here, and frankly you could do with the scrap. The Crystalline ship immediately jumps off to inform the Rebels, leaving you with a fleet to outrun!";
const CRUISE =
  "Unable to interpret it themselves, the Crystalline Beings assume your data will mean something to the Rebels. It should see the pursuing fleet taking a leisurely cruise before they get back on track.";
const LIE =
  "They take one look at your fake telemetry and realize what you've done. They apparently do not take being lied to well - they immediately attack";
const BUOY =
  "Your distraction buoy allows you to create a very convincing flight plan. They accept it as true and give you the scrap. The deception may not be the most honorable tactic but staying ahead of the fleet is your highest priority.";
const APOLOGY =
  "You apologize for the trouble you've brought them, but explain that you have no choice. They seem to understand, and break the comm link to set about preparing defenses.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:crystalline-ship-messaging-about-rebels";
  b.name = "Crystalline ship messaging about Rebels";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Crystalline ship messaging about Rebels");
}

function gear(g: Game) {
  return {
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    weapons: g.player.weapons.map((w) => w.defId),
    crew: g.crew.map((c) => c.id),
    augments: [...g.augments],
  };
}

describe("Crystalline ship messaging about Rebels flight plans", () => {
  it("lists the four printed replies", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => [c.id, c.label]),
      [
        [`${PLANS}:0`, "Give them your flight plans"],
        [`${PLANS}:1`, "Accept the scrap but give them false flight plans"],
        [`${PLANS}:2`, "Accept the scrap but give them falsified flight plans."],
        [`${PLANS}:3`, "Refuse"],
      ],
    );
  });

  it("gives the real flight plans, pays high scrap, and speeds the fleet for one jump", () => {
    const g = createGame(1);
    open(g);
    const start = g.scrap;
    const fleet = g.fleet;
    const held = gear(g);
    choose(g, `${PLANS}:0`);
    const gained = g.scrap - start;
    assert.ok(gained >= 19 && gained <= 23, String(gained));
    assert.equal(g.event?.body, `${OUTRUN}\n\nHigh scrap: ${gained}. Rebel Fleet pursuit is doubled for 1 jump.`);
    assert.equal(g.scrap, start + gained);
    assert.equal(g.fleet, fleet + 1);
    assert.deepEqual(gear(g), held);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.enemy, null);
    assert.deepEqual(g.event?.choices, [{ id: "ack", label: "Continue" }]);
    assert.equal(g.event?.body.includes("Resource amounts are not stated."), false);
    assert.ok(g.log.includes(`High scrap: ${gained}.`));
    assert.ok(g.log.includes("Rebel Fleet pursuit is doubled for 1 jump."));
  });

  it("false plans either delay the fleet or start a crystal fight with boarders", () => {
    let cruise = false;
    let attack = false;
    for (let seed = 1; seed <= 80 && !(cruise && attack); seed++) {
      const g = createGame(seed);
      open(g);
      g.fleet = 4;
      const start = g.scrap;
      const held = gear(g);
      const players = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      choose(g, `${PLANS}:1`);
      if (g.phase === "event") {
        cruise = true;
        const gained = g.scrap - start;
        assert.ok(gained >= 19 && gained <= 23, String(gained));
        assert.equal(g.event?.body, `${CRUISE}\n\nHigh scrap: ${gained}. Rebel Fleet pursuit is delayed for 1 jump.`);
        assert.equal(g.scrap, start + gained);
        assert.equal(g.fleet, 3);
        assert.deepEqual(gear(g), held);
        assert.equal(g.enemy, null);
        assert.equal(g.crew.some((c) => c.side === "enemy"), false);
        assert.equal(g.phase, "event");
        assert.ok(g.log.includes("Rebel Fleet pursuit is delayed for 1 jump."));
      } else {
        attack = true;
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "crystalline-ship-messaging-about-rebels");
        assert.equal(g.event, null);
        assert.ok(g.log.includes(LIE));
        const boarders = g.crew.filter((c) => c.side === "enemy" && c.kin === "shard" && c.aboard === "player");
        assert.ok(boarders.length === 1 || boarders.length === 2, String(boarders.length));
        assert.deepEqual(
          g.crew.filter((c) => c.side === "player").map((c) => c.id),
          players,
        );
        assert.deepEqual(g.augments, []);
        assert.equal(g.scrap, start);
        assert.equal(g.fuel, held.fuel);
        assert.equal(g.missiles, held.missiles);
        assert.equal(g.player.parts, held.parts);
      }
    }
    assert.ok(cruise, "cruise branch");
    assert.ok(attack, "attack branch");
  });

  it("refuses falsified plans without Distraction Buoys and delays the fleet when they are fitted", () => {
    const bare = createGame(1);
    open(bare);
    bare.fleet = 4;
    const start = bare.scrap;
    const body = bare.event?.body;
    const log = [...bare.log];
    const held = gear(bare);
    assert.equal(choiceDisabled(bare, `${PLANS}:2`), "Needs Distraction Buoys");
    choose(bare, `${PLANS}:2`);
    assert.equal(bare.scrap, start);
    assert.equal(bare.fleet, 4);
    assert.equal(bare.phase, "event");
    assert.equal(bare.event?.body, body);
    assert.deepEqual(bare.log, log);
    assert.deepEqual(gear(bare), held);
    assert.equal(bare.enemy, null);

    const g = createGame(1);
    open(g);
    g.augments = ["falsebuoy"];
    g.fleet = 4;
    assert.equal(choiceDisabled(g, `${PLANS}:2`), null);
    const scrap = g.scrap;
    const fitted = gear(g);
    choose(g, `${PLANS}:2`);
    const gained = g.scrap - scrap;
    assert.ok(gained >= 19 && gained <= 23, String(gained));
    assert.equal(g.event?.body, `${BUOY}\n\nHigh scrap: ${gained}. Rebel Fleet pursuit is delayed for 1 jump.`);
    assert.equal(g.scrap, scrap + gained);
    assert.equal(g.fleet, 3);
    assert.deepEqual(g.augments, ["falsebuoy"]);
    assert.equal(g.fuel, fitted.fuel);
    assert.equal(g.missiles, fitted.missiles);
    assert.equal(g.player.parts, fitted.parts);
    assert.deepEqual(
      g.player.weapons.map((w) => w.defId),
      fitted.weapons,
    );
    assert.deepEqual(
      g.crew.map((c) => c.id),
      fitted.crew,
    );
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.deepEqual(g.event?.choices, [{ id: "ack", label: "Continue" }]);
  });

  it("refusing apologizes and changes nothing", () => {
    const g = createGame(1);
    open(g);
    g.fleet = 3;
    const held = gear(g);
    choose(g, `${PLANS}:3`);
    assert.equal(g.event?.body, `${APOLOGY}\n\nNothing happens.`);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 3);
    assert.deepEqual(gear(g), held);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.deepEqual(g.event?.choices, [{ id: "ack", label: "Continue" }]);
  });
});
