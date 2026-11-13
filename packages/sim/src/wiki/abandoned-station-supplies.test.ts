import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { fillerChoose } from "./filler-events.ts";
import { questChoose } from "./quests.ts";

/** The filler card reads the archive. The stand-in may print one line for both results. */
function seenLines(run: (g: Game) => void): Set<string> {
  const lines = [
    eventText("event_EMPTY_STATION2_LIST_2_text"),
    eventText("event_EMPTY_STATION2_LIST_3_text"),
  ];
  const want = new Set(lines);
  const found = new Set<string>();
  for (let seed = 1; seed <= 80 && found.size < want.size; seed++) {
    const g = createGame(seed);
    const scrap = g.scrap;
    const weapons = g.player.weapons.length;
    run(g);
    const body = g.event?.body ?? "";
    const line = lines.find((l) => body.startsWith(l));
    if (!line) continue;
    found.add(line);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.ok(g.scrap > scrap);
    assert.equal(g.player.weapons.length, weapons);
    assert.ok(body.includes("Scrap:"));
  }
  assert.deepEqual(found, want);
  return found;
}

describe("Abandoned station supply lines", () => {
  it("the filler examine shows either printed supply sentence and low scrap", () => {
    seenLines((g) => fillerChoose(g, "c:abandoned-station:0"));
  });

  it("the quest examine shows either printed supply sentence and low scrap", () => {
    seenLines((g) => questChoose(g, "q:station:examine"));
  });
});
