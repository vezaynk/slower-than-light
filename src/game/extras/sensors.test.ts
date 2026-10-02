import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
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
});
