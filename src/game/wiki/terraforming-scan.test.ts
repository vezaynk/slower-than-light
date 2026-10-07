import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";

const SCAN = "s:terraforming-scan:scan";
const SENSORS = "s:terraforming-scan:sensors";
const ZOLTAN = "s:terraforming-scan:zoltan";

function offer(seed: number): Game {
  const g = createGame(seed);
  fillerChoose(g, "c:terraforming-scan:0");
  return g;
}

function kind(g: Game): "fail" | "oxygen" | "pirate" | "mold" | "offer" {
  const body = g.event?.body ?? "";
  if (body.includes("no more powerful")) return "fail";
  if (body.includes("simple mold")) return "mold";
  if (body.includes("Oxygen system upgraded")) return "oxygen";
  if (g.phase === "combat") return "pirate";
  if (body.includes("schedule to keep")) return "offer";
  return "offer";
}

describe("Terraforming scan blue options", () => {
  it("stays closed below Sensors level 2 and without a living Zoltan", () => {
    const g = offer(3);
    g.player.systems.sensors.level = 1;
    assert.equal(choiceDisabled(g, SENSORS), "Needs Sensors level 2");
    assert.equal(choiceDisabled(g, ZOLTAN), "Needs a Zoltan crewmember");
    const oxygen = g.player.systems.oxygen.level;
    fillerChoose(g, SENSORS);
    fillerChoose(g, ZOLTAN);
    assert.equal(kind(g), "offer");
    assert.equal(g.phase, "event");
    assert.equal(g.player.systems.oxygen.level, oxygen);
    g.crew[0].kin = "spark";
    g.crew[0].hp = 0;
    assert.equal(choiceDisabled(g, ZOLTAN), "Needs a Zoltan crewmember");
    fillerChoose(g, ZOLTAN);
    assert.equal(kind(g), "offer");
    g.player.systems.sensors.level = 0;
    assert.equal(choiceDisabled(g, SENSORS), "Needs Sensors level 2");
  });

  it("Sensors level 2 and a living Zoltan each skip the failed scan", () => {
    const seen = { sensors: new Set<string>(), zoltan: new Set<string>() };
    for (let seed = 1; seed <= 90; seed++) {
      const sensors = offer(seed);
      sensors.player.systems.sensors.level = 2;
      sensors.player.systems.sensors.damage = 2;
      assert.equal(choiceDisabled(sensors, SENSORS), null);
      fillerChoose(sensors, SENSORS);
      const sk = kind(sensors);
      assert.notEqual(sk, "fail");
      assert.notEqual(sk, "offer");
      seen.sensors.add(sk);
      if (sk === "pirate") {
        assert.equal(sensors.fightEvent, "terraforming-scan");
        assert.equal(sensors.enemy!.pirate, true);
      }
      if (sk === "oxygen") assert.equal(sensors.player.systems.oxygen.level, 2);

      const zoltan = offer(seed + 200);
      zoltan.player.systems.sensors.level = 1;
      zoltan.crew[0].kin = "spark";
      assert.equal(choiceDisabled(zoltan, ZOLTAN), null);
      assert.equal(choiceDisabled(zoltan, SENSORS), "Needs Sensors level 2");
      fillerChoose(zoltan, ZOLTAN);
      const zk = kind(zoltan);
      assert.notEqual(zk, "fail");
      assert.notEqual(zk, "offer");
      seen.zoltan.add(zk);
      if (zk === "oxygen") assert.equal(zoltan.player.systems.oxygen.level, 2);
    }
    assert.deepEqual([...seen.sensors].sort(), ["mold", "oxygen", "pirate"]);
    assert.deepEqual([...seen.zoltan].sort(), ["mold", "oxygen", "pirate"]);
  });

  it("a plain scan can still fail", () => {
    let failed = false;
    let succeeded = false;
    for (let seed = 1; seed <= 40 && !(failed && succeeded); seed++) {
      const g = offer(seed);
      g.player.systems.sensors.level = 1;
      fillerChoose(g, SCAN);
      const k = kind(g);
      if (k === "fail") failed = true;
      else succeeded = true;
    }
    assert.ok(failed && succeeded);
  });
});
