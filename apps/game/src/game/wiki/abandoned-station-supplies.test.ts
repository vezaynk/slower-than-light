import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";
import { questChoose } from "./quests.ts";

const REST = "small rest stop that was abandoned";
const HULL = "large portion of its hull destroyed";

function seen(run: (g: Game) => void): Set<string> {
  const found = new Set<string>();
  for (let seed = 1; seed <= 80 && found.size < 2; seed++) {
    const g = createGame(seed);
    const scrap = g.scrap;
    const weapons = g.player.weapons.length;
    run(g);
    const body = g.event?.body ?? "";
    const kind = body.includes(HULL) ? "hull" : body.includes(REST) ? "rest" : "";
    if (!kind) continue;
    found.add(kind);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.ok(g.scrap > scrap);
    assert.equal(g.player.weapons.length, weapons);
    assert.ok(body.includes("Scrap:"));
  }
  return found;
}

describe("Abandoned station supply lines", () => {
  it("the filler examine shows either printed supply sentence and low scrap", () => {
    const found = seen((g) => fillerChoose(g, "c:abandoned-station:0"));
    assert.deepEqual([...found].sort(), ["hull", "rest"]);
  });

  it("the quest examine shows either printed supply sentence and low scrap", () => {
    const found = seen((g) => questChoose(g, "q:station:examine"));
    assert.deepEqual([...found].sort(), ["hull", "rest"]);
  });
});
