import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playerSensorLevel } from "./spike.ts";
import { createGame, startCombat } from "../sim.ts";
import { sensorLevel } from "./sensors.ts";

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
