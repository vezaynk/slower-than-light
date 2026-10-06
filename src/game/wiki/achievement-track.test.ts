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
    assert.deepEqual(earnedNow(five), ["just-getting-started"]);

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
    localStorage.setItem("ashwake-achievements-v1", JSON.stringify(["warlord", "just-getting-started"]));
    resetAchievementMemory();
    assert.deepEqual(earnedIds(), ["just-getting-started"]);

    const run = createGame(1, "lanius-b");
    run.phase = "map";
    run.sector = 8;
    run.scrap = 600;
    assert.deepEqual(noteRun(run).sort(), ["federation-base-in-range", "just-getting-started", "scrap-hoarder"]);
    const quiet = createGame(1);
    quiet.phase = "map";
    assert.deepEqual(noteRun(quiet).sort(), ["federation-base-in-range", "just-getting-started", "scrap-hoarder"]);
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

  it("marks every other named achievement as not tracked", () => {
    const tracked = ACHIEVEMENTS.filter((row) => isTracked(row.id)).map((row) => row.id);
    // @agent:unlocks: six stateless ship achievements added for Layout B unlocks (unlocks.ts).
    assert.deepEqual(tracked, [
      "just-getting-started",
      "federation-base-in-range",
      "federation-victory-easy",
      "federation-victory-normal",
      "your-own-fleet",
      "the-united-federation",
      "full-arsenal",
      "artillery-mastery",
      "ancestry",
      "givin-her-all-shes-got-captain",
      "manpower",
      "scrap-hoarder",
    ]);
    assert.equal(untrackedIds().length, ACHIEVEMENTS.length - tracked.length);
    for (const id of untrackedIds()) assert.equal(isTracked(id), false);
  });
});
