import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const DULL = "The cargo appears to contain nothing of much interest. You salvage some scrap from the destroyed ship.";
const SUPPLIES = "Your Advanced Sensors are able to breach the protective barrier and scan the cargo. It appears to be filled with military supplies! You take everything you can use.";
const AMBUSH = "Your advanced sensors pick up faint life signatures inside the cargo. The life forms appear to be armed. This looks like a planned pirate ambush.";
const FIRE = "You fire on the crates, breaking them open and scattering the pirates into empty space. A pirate ship appears out of nowhere with a message, \"You will pay for that!\"";
const SENSORS = "c:destroyed-cargo-ship:2";
const SCANNERS = "c:destroyed-cargo-ship:3";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:destroyed-cargo-ship";
  b.name = "Destroyed cargo ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Destroyed cargo ship");
}

describe("Destroyed cargo ship scan", () => {
  it("stays closed without Sensors level 2 or Long-Ranged Scanners", () => {
    const g = createGame(1);
    g.player.systems.sensors.level = 1;
    g.augments = g.augments.filter((id) => id !== "glass");
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === SENSORS && c.label === "Run an advanced scan on the boxes."));
    assert.ok(g.event?.choices.some((c) => c.id === SCANNERS && c.label === "Run an advanced scan on the boxes."));
    // INFERRED: the refusal lines. The page names the requirement and prints no sentence.
    assert.equal(choiceDisabled(g, SENSORS), "Needs Sensors level 2");
    assert.equal(choiceDisabled(g, SCANNERS), "Needs Long-Ranged Scanners");
    choose(g, SENSORS);
    choose(g, SCANNERS);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.match(g.event?.body ?? "", /destroyed cargo ship/);
  });

  it("Sensors level 2 scans without the augment, and the augment scans at level 1", () => {
    const sensors = createGame(2);
    sensors.player.systems.sensors.level = 2;
    sensors.augments = sensors.augments.filter((id) => id !== "glass");
    open(sensors);
    assert.equal(choiceDisabled(sensors, SENSORS), null);
    assert.equal(choiceDisabled(sensors, SCANNERS), "Needs Long-Ranged Scanners");

    const glass = createGame(3);
    glass.player.systems.sensors.level = 1;
    glass.augments = [...glass.augments.filter((id) => id !== "glass"), "glass"];
    open(glass);
    assert.equal(choiceDisabled(glass, SENSORS), "Needs Sensors level 2");
    assert.equal(choiceDisabled(glass, SCANNERS), null);
  });

  it("scans to dull scrap, military supplies, or the pirate ambush", () => {
    let dull = false;
    let supplies = false;
    let ambush = false;
    for (let seed = 1; seed <= 80 && !(dull && supplies && ambush); seed++) {
      const g = createGame(seed);
      g.player.systems.sensors.level = 2;
      open(g);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, SENSORS);
      const body = g.event?.body ?? "";
      if (body.includes(DULL)) {
        dull = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        const gained = g.scrap - 10;
        assert.ok(gained >= 20 && gained <= 35, `scrap ${gained}`);
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else if (body.includes(SUPPLIES)) {
        supplies = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        assert.ok(g.scrap > 10);
        const df = g.fuel - fuel;
        const dm = g.missiles - missiles;
        const dp = g.player.parts - parts;
        assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
        assert.ok(df === 0 || (df >= 1 && df <= 3));
        assert.ok(dm === 0 || (dm >= 1 && dm <= 2));
        assert.ok(dp === 0 || dp === 1);
        assert.equal(g.player.weapons.length, createGame(seed).player.weapons.length);
      } else if (body.includes(AMBUSH)) {
        ambush = true;
        assert.equal(g.phase, "event");
        assert.equal(g.scrap, 10);
        assert.equal(g.fuel, fuel);
        assert.ok(g.event?.choices.some((c) => c.id === "s:destroyed-cargo-ship:destroy"));
        assert.ok(g.event?.choices.some((c) => c.id === "s:destroyed-cargo-ship:leave"));
      } else {
        assert.fail(body);
      }
    }
    assert.equal(dull && supplies && ambush, true);
  });

  it("destroying the crates starts a Pirate fight, and leaving does nothing", () => {
    let fight: Game | null = null;
    let left: Game | null = null;
    for (let seed = 1; seed <= 80 && (!fight || !left); seed++) {
      const g = createGame(seed);
      g.player.systems.sensors.level = 2;
      open(g);
      choose(g, SENSORS);
      if (!g.event?.body.includes(AMBUSH)) continue;
      if (!fight) {
        fight = g;
        choose(g, "s:destroyed-cargo-ship:destroy");
      } else if (!left) {
        left = g;
        choose(g, "s:destroyed-cargo-ship:leave");
      }
    }
    assert.ok(fight);
    assert.equal(fight.phase, "combat");
    assert.ok(fight.log.includes(FIRE));
    assert.equal(fight.fightEvent, "destroyed-cargo-ship-scan");
    assert.equal(fight.enemy?.pirate, true);
    assert.equal(fight.scrap, 10);
    assert.equal(fight.enemySurrender?.chance, 50);
    assert.ok((fight.enemySurrender?.threshold ?? 0) >= 30 && (fight.enemySurrender?.threshold ?? 0) <= 40);
    assert.equal(fight.enemyEscape?.chance, 50);
    assert.ok((fight.enemyEscape?.threshold ?? 0) >= 20 && (fight.enemyEscape?.threshold ?? 0) <= 40);
    assert.equal(fight.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 0);
    assert.ok(left);
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.phase, "event");
    assert.equal(left.scrap, 10);
    assert.equal(left.enemy, null);
  });
});
