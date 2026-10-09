import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "../hulls.ts";
import { createGame } from "../sim.ts";
import { UNLOCKS_KEY } from "../unlocks.ts";
import { ACHIEVEMENTS } from "./achievements.ts";
import {
  earnedIds,
  earnedNow,
  isTracked,
  noteReactorEvent,
  noteRun,
  resetAchievementMemory,
  untrackedIds,
} from "./achievement-track.ts";

function memoryStorage() {
  const bag = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => bag.get(key) ?? null,
      setItem: (key: string, value: string) => {
        bag.set(key, value);
      },
      removeItem: (key: string) => {
        bag.delete(key);
      },
      clear: () => {
        bag.clear();
      },
      key: () => null,
      length: 0,
    },
  });
  resetAchievementMemory();
}

describe("achievement tracker", () => {
  it("earns sector arrivals and Lanius scrap storage, and nothing else", () => {
    const early = createGame(1);
    early.phase = "map";
    assert.deepEqual(earnedNow(early), []);

    const four = createGame(1);
    four.phase = "map";
    four.sector = 4;
    assert.deepEqual(earnedNow(four), []);

    const five = createGame(1);
    five.phase = "map";
    five.sector = 5;
    assert.deepEqual(earnedNow(five), [
      "just-getting-started",
      "coming-in-for-my-pacifism-run",
      "i-dont-need-no-stinkin-upgrades",
      "on-a-wing-and-a-prayer",
    ]);

    const eight = createGame(1);
    eight.phase = "map";
    eight.sector = 8;
    eight.kills = 1000;
    eight.scrapCollected = 10000;
    eight.scrap = 600;
    eight.beaconsVisited = 100;
    eight.player.hull = 1;
    eight.phase = "victory";
    eight.outcome = "victory";
    eight.difficulty = "easy";
    assert.deepEqual(earnedNow(eight), [
      "just-getting-started",
      "federation-base-in-range",
      "federation-victory-easy",
      "rule-ten-greed-is-eternal",
      "warlord",
      "coming-in-for-my-pacifism-run",
      "i-dont-need-no-stinkin-upgrades",
      "on-a-wing-and-a-prayer",
      "ballistophobia",
      "technophobia",
      "living-off-the-land",
      "no-redshirts-here",
    ]);
    eight.difficulty = "normal";
    assert.ok(earnedNow(eight).includes("federation-victory-normal"));
    assert.equal(earnedNow(eight).includes("federation-victory-easy"), false);
    eight.difficulty = "hard";
    assert.equal(earnedNow(eight).includes("federation-victory-easy"), false);
    assert.equal(earnedNow(eight).includes("federation-victory-normal"), false);

    const short = createGame(1, "lanius-a");
    short.phase = "map";
    short.scrap = 599;
    assert.equal(earnedNow(short).includes("scrap-hoarder"), false);
    short.scrap = 600;
    assert.deepEqual(earnedNow(short), ["scrap-hoarder"]);

    const other = createGame(1, "kestrel-a");
    other.phase = "map";
    other.scrap = 600;
    assert.equal(earnedNow(other).includes("scrap-hoarder"), false);

    const title = createGame(1, "lanius-a");
    title.phase = "title";
    title.sector = 8;
    title.scrap = 600;
    assert.deepEqual(earnedNow(title), []);
  });

  it("keeps earned ids in localStorage and ignores an untracked id", () => {
    memoryStorage();
    localStorage.setItem("stl-achievements-v1", JSON.stringify(["were-in-position", "just-getting-started"]));
    resetAchievementMemory();
    assert.deepEqual(earnedIds(), ["just-getting-started"]);

    localStorage.setItem("stl-achievements-v1", JSON.stringify(["warlord", "just-getting-started"]));
    resetAchievementMemory();
    const run = createGame(1, "lanius-b");
    run.phase = "map";
    run.sector = 8;
    run.scrap = 600;
    assert.deepEqual(noteRun(run).sort(), [
      "ballistophobia",
      "coming-in-for-my-pacifism-run",
      "federation-base-in-range",
      "i-dont-need-no-stinkin-upgrades",
      "just-getting-started",
      "living-off-the-land",
      "no-redshirts-here",
      "on-a-wing-and-a-prayer",
      "scrap-hoarder",
      "technophobia",
      "warlord",
    ]);
    const quiet = createGame(1);
    quiet.phase = "map";
    assert.deepEqual(noteRun(quiet).sort(), [
      "ballistophobia",
      "coming-in-for-my-pacifism-run",
      "federation-base-in-range",
      "i-dont-need-no-stinkin-upgrades",
      "just-getting-started",
      "living-off-the-land",
      "no-redshirts-here",
      "on-a-wing-and-a-prayer",
      "scrap-hoarder",
      "technophobia",
      "warlord",
    ]);
  });

  it("reads Your Own Fleet from the saved Type A unlocks", () => {
    memoryStorage();
    const typeA = HULLS.filter((hull) => hull.layout === "A").map((hull) => hull.id);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ ships: typeA.slice(0, -1), wins: [] }));
    resetAchievementMemory();
    const shy = createGame(2);
    shy.phase = "map";
    assert.equal(earnedNow(shy).includes("your-own-fleet"), false);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ ships: typeA, wins: [], boss: ["easy"] }));
    resetAchievementMemory();
    const fleet = createGame(3);
    fleet.phase = "map";
    assert.ok(earnedNow(fleet).includes("your-own-fleet"));
    assert.ok(earnedNow(fleet).includes("federation-victory-easy"));
    assert.equal(earnedNow(fleet).includes("federation-victory-normal"), false);
  });

  it("Manpower ignores an event reactor bar and counts an upgrades-tab bar", () => {
    const g = createGame(1, "zoltan-a");
    g.sector = 5;
    assert.equal(earnedNow(g).includes("manpower"), true);
    g.player.reactor += 1;
    noteReactorEvent(g);
    assert.equal(earnedNow(g).includes("manpower"), true);
    g.player.reactor += 1;
    assert.equal(earnedNow(g).includes("manpower"), false);
  });

  it("tracks every named achievement except slug vision and the four blue events", () => {
    const open = ["diplomatic-immunity", "were-in-position"];
    const tracked = ACHIEVEMENTS.filter((row) => isTracked(row.id)).map((row) => row.id);
    assert.deepEqual(
      tracked,
      ACHIEVEMENTS.map((row) => row.id).filter((id) => !open.includes(id)),
    );
    assert.deepEqual(untrackedIds().sort(), open);
    assert.equal(tracked.length, ACHIEVEMENTS.length - open.length);
    for (const id of untrackedIds()) assert.equal(isTracked(id), false);
  });
});
