import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREW_CAP, createGame } from "./sim.ts";
import { joinCrew } from "./wiki/surrender.ts";

function players(g: ReturnType<typeof createGame>) {
  return g.crew.filter((c) => c.side === "player");
}

describe("crew cap", () => {
  it("lets a ship carry eight and refuses a ninth", () => {
    const g = createGame(1, "mantis-a");
    assert.ok(players(g).length > 0);
    assert.ok(players(g).length < CREW_CAP);
    while (players(g).length < CREW_CAP) assert.equal(joinCrew(g, "Human"), true);
    assert.equal(players(g).length, 8);
    const joined = players(g).at(-1);
    assert.equal(joined?.hp, 100);
    assert.equal(joined?.maxHp, 100);
    assert.equal(joinCrew(g, "Human"), false);
    assert.equal(players(g).length, 8);
  });
});
