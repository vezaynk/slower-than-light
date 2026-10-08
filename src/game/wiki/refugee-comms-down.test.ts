import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";

const ID = "c:refugee-comms-down:0";
const CLONE = "Your abandoned crewmember is waiting on the ship when you return, trying not to dwell on the fate of his previous incarnation.";

function board(seed: number, cradle: boolean): Game {
  const g = createGame(seed);
  if (cradle) g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
  fillerChoose(g, ID);
  return g;
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

describe("Refugee comms down clone bay", () => {
  it("the cannibal loss revives that crewmember and prints the waiting sentence", () => {
    let seed = 0;
    for (let n = 1; n <= 40; n++) {
      const g = board(n, false);
      if ((g.event?.body ?? "").includes("leave them behind")) {
        seed = n;
        break;
      }
    }
    assert.ok(seed > 0);
    const plain = board(seed, false);
    const start = players(createGame(seed)).length;
    assert.equal(players(plain).length, start - 1);
    assert.equal(plain.event?.body?.includes(CLONE), false);
    assert.equal(plain.event?.body?.includes("revived"), false);

    const cloned = board(seed, true);
    assert.equal(players(cloned).length, start);
    assert.equal(cloned.event?.body?.includes(CLONE), true);
    assert.equal(cloned.event?.body?.includes("The lost crewmember is revived."), true);
    assert.equal(cloned.enemy, null);
  });
});
