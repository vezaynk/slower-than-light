import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";

const ID = "c:refugee-comms-down:0";
const CLONE = eventText("event_REFUGEE_GHOST_LIST_4_c0_clone");

function board(seed: number, cradle: boolean): Game {
  const g = createGame(seed);
  if (cradle)
    g.player.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
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
      if ((g.event?.body ?? "").startsWith(eventText("event_REFUGEE_GHOST_LIST_4_text"))) {
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
    assert.equal(cloned.event?.body?.includes("Clone Bay: crew revived."), true);
    assert.equal(cloned.enemy, null);
  });
});
