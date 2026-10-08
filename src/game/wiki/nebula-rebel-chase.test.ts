import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

const SENSORS = "c:rebel-fight-chance-in-nebula:2";
const SCANNERS = "c:rebel-fight-chance-in-nebula:3";
const LIFE = "c:rebel-fight-chance-in-nebula:4";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-fight-chance-in-nebula";
  b.name = "Rebel fight chance in nebula";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel fight chance in nebula");
}

describe("Rebel fight chance in nebula", () => {
  it("staying hidden spends nothing", () => {
    const g = createGame(1);
    g.fleet = 4;
    open(g);
    fillerChoose(g, "c:rebel-fight-chance-in-nebula:0");
    assert.match(g.event?.body ?? "", /out of sight/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 4);
    assert.equal(g.phase, "event");
  });

  it("a chase finds the Rebel ship, doubles pursuit, or loses the lock", () => {
    let fight = false;
    let doubled = false;
    let gone = false;
    for (let seed = 1; seed <= 80 && (!fight || !doubled || !gone); seed++) {
      const g = createGame(seed);
      g.fleet = 4;
      open(g);
      fillerChoose(g, "c:rebel-fight-chance-in-nebula:1");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.scrap, 10);
        assert.match(g.log.join(" "), /vapour trails/);
        assert.equal(g.fleet, 4);
      } else if (/disoriented/.test(g.event?.body ?? "")) {
        doubled = true;
        assert.equal(g.fleet, 8);
        assert.match(g.event?.body ?? "", /pursuit is doubled/);
        assert.equal(g.scrap, 10);
      } else {
        gone = true;
        assert.match(g.event?.body ?? "", /slip away/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.fleet, 4);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(fight && doubled && gone, true);
  });

  it("Sensors level 3, Long-Ranged Scanners, or a Lifeform Scanner start a Rebel fight", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, SENSORS), "Needs Sensors level 3");
    assert.equal(choiceDisabled(bare, SCANNERS), "Needs Long-Ranged Scanners");
    assert.equal(choiceDisabled(bare, LIFE), "Needs a Lifeform Scanner");

    const sensors = createGame(2);
    sensors.player.systems.sensors.level = 3;
    open(sensors);
    assert.equal(choiceDisabled(sensors, SENSORS), null);
    fillerChoose(sensors, SENSORS);
    assert.equal(sensors.phase, "combat");
    assert.match(sensors.log.join(" "), /malfunctioning sensors/);
    assert.equal(sensors.scrap, 10);

    const glass = createGame(3);
    glass.augments = ["glass"];
    open(glass);
    assert.equal(choiceDisabled(glass, SCANNERS), null);
    fillerChoose(glass, SCANNERS);
    assert.equal(glass.phase, "combat");
    assert.match(glass.log.join(" "), /malfunctioning sensors/);

    const life = createGame(4);
    life.augments = ["pulseeye"];
    open(life);
    assert.equal(choiceDisabled(life, LIFE), null);
    fillerChoose(life, LIFE);
    assert.equal(life.phase, "combat");
    assert.match(life.log.join(" "), /life signatures/);
    assert.equal(life.scrap, 10);
  });
});
