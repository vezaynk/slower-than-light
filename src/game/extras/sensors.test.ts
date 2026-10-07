import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playerSensorLevel } from "./spike.ts";
import { REPAIR_SECONDS, createGame, roomWith, startCombat } from "../sim.ts";
import { sensorLevel, sensorSystemDetail } from "./sensors.ts";

describe("sensorLevel", () => {
  it("is 2 on a fresh Lark and 3 when a crew stands in sensors", () => {
    const g = createGame(1);
    assert.equal(g.player.systems.sensors.level, 2);
    assert.equal(g.player.systems.sensors.power, 2);
    const starters = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(
      starters.map((c) => c.room).sort(),
      ["p-engines", "p-pilot", "p-weapons"],
    );
    assert.equal(sensorLevel(g, g.player, "player"), 2);

    const crew = starters[0];
    assert.ok(crew);
    crew.room = "p-sensors";
    crew.path = [];
    assert.equal(sensorLevel(g, g.player, "player"), 3);
  });

  it("reads 0 on a nebula beacon and stays at 2 against the Flagship", () => {
    const g = createGame(2);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here);
    assert.notEqual(here.kind, "nebula");
    const crew = g.crew.find((c) => c.side === "player");
    assert.ok(crew);
    crew.room = "p-sensors";
    crew.path = [];
    g.player.systems.sensors.level = 3;
    assert.equal(sensorLevel(g, g.player, "player"), 4);
    assert.equal(playerSensorLevel(g), 4);
    here.kind = "nebula";
    assert.equal(sensorLevel(g, g.player, "player"), 4);
    assert.equal(playerSensorLevel(g), 0);

    here.kind = "start";
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.flagship = { stage: 1, warned: false, surge: [], lasers: 0, ai: false };
    assert.equal(sensorLevel(g, g.player, "player"), 2);
    assert.ok(playerSensorLevel(g) <= 2);
  });
});

describe("sensorSystemDetail", () => {
  it("lists level, power, each ion cooldown, and INFERRED repair and sabotage percents", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const sys = enemy.systems.shields;
    sys.level = 4;
    sys.power = 3;
    sys.ion = [5, 2.5];
    sys.fix = REPAIR_SECONDS / 2;
    const room = roomWith(enemy, "shields");
    assert.ok(room);
    room.sabotage = 0.4;
    // shownPower is the panel's powered bars, not SystemState.power.
    assert.equal(
      sensorSystemDetail(enemy, "shields", "Shields", 1),
      "Shields: level 4, power 1 of 4, ion 2, cooldown 5.0s / 2.5s, repair 50%, sabotage 40%",
    );
    assert.equal(sensorSystemDetail(enemy, "shields", "Shields", 1).includes("hacking"), false);
    assert.equal(sensorSystemDetail(enemy, "shields", "Shields", 1).includes("cloaking"), false);
    assert.equal(sensorSystemDetail(enemy, "shields", "Shields", 1).includes("mind"), false);
    assert.equal(sensorSystemDetail(enemy, "shields", "Shields", 1).includes("clone"), false);
    assert.equal(sensorSystemDetail(enemy, "shields", "Shields", 1).includes("queue"), false);
  });

  it("reads ion 0, cooldown none, and 0% when repair and sabotage are empty", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const sys = enemy.systems.weapons;
    sys.ion = [];
    sys.fix = 0;
    const room = roomWith(enemy, "weapons");
    assert.ok(room);
    room.sabotage = undefined;
    assert.equal(
      sensorSystemDetail(enemy, "weapons", "Weapons", sys.power),
      `Weapons: level ${sys.level}, power ${sys.power} of ${sys.level}, ion 0, cooldown none, repair 0%, sabotage 0%`,
    );
  });

  it("INFERRED: repair and sabotage percents round and clamp to 0..100", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const sys = enemy.systems.engines;
    sys.fix = REPAIR_SECONDS * 2;
    const room = roomWith(enemy, "engines");
    assert.ok(room);
    room.sabotage = 0.126;
    assert.match(sensorSystemDetail(enemy, "engines", "Engines", 0), /repair 100%, sabotage 13%/);
    sys.fix = -1;
    room.sabotage = -0.2;
    assert.match(sensorSystemDetail(enemy, "engines", "Engines", 0), /repair 0%, sabotage 0%/);
  });
});
