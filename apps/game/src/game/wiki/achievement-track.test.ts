import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "../hulls.ts";
import { createGame, startCombat } from "../sim.ts";
import { UNLOCKS_KEY } from "../unlocks.ts";
import { ACHIEVEMENTS } from "@stl/catalog/src/wiki/achievements.ts";
import {
  earnedIds,
  earnedNow,
  isTracked,
  noteCrewBlue,
  noteReactorEvent,
  noteRun,
  resetAchievementMemory,
  untrackedIds,
} from "./achievement-track.ts";
import type { Crew } from "../types.ts";

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
      "ACH_SECTOR_5",
      "ACH_PACIFIST",
      "ACH_NO_UPGRADES",
      "ACH_NO_REPAIR",
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
      "ACH_SECTOR_5",
      "ACH_SECTOR_8",
      "ACH_WIN_EASY",
      "ACH_SCRAP",
      "ACH_SHIPS",
      "ACH_PACIFIST",
      "ACH_NO_UPGRADES",
      "ACH_NO_REPAIR",
      "ACH_NO_MISSILES",
      "ACH_NO_DRONES",
      "ACH_NO_BUYING",
      "ACH_NO_DEATH",
    ]);
    eight.difficulty = "normal";
    assert.ok(earnedNow(eight).includes("ACH_WIN_NORMAL"));
    assert.equal(earnedNow(eight).includes("ACH_WIN_EASY"), false);
    eight.difficulty = "hard";
    assert.equal(earnedNow(eight).includes("ACH_WIN_EASY"), false);
    assert.equal(earnedNow(eight).includes("ACH_WIN_NORMAL"), false);

    const short = createGame(1, "PLAYER_SHIP_ANAEROBIC");
    short.phase = "map";
    short.scrap = 599;
    assert.equal(earnedNow(short).includes("ACH_LANIUS_SCRAP"), false);
    short.scrap = 600;
    assert.deepEqual(earnedNow(short), ["ACH_LANIUS_SCRAP"]);

    const other = createGame(1, "PLAYER_SHIP_HARD");
    other.phase = "map";
    other.scrap = 600;
    assert.equal(earnedNow(other).includes("ACH_LANIUS_SCRAP"), false);

    const title = createGame(1, "PLAYER_SHIP_ANAEROBIC");
    title.phase = "title";
    title.sector = 8;
    title.scrap = 600;
    assert.deepEqual(earnedNow(title), []);
  });

  it("reads achievements saved under the old wiki slugs as their archive ids", () => {
    memoryStorage();
    localStorage.setItem(
      "stl-achievements-v1",
      JSON.stringify(["just-getting-started", "scrap-hoarder", "were-in-position", "ACH_SECTOR_8"]),
    );
    resetAchievementMemory();
    assert.deepEqual(earnedIds().sort(), [
      "ACH_LANIUS_SCRAP",
      "ACH_SECTOR_5",
      "ACH_SECTOR_8",
      "ACH_SLUG_VISION",
    ]);
  });

  it("keeps earned ids in localStorage and ignores an untracked id", () => {
    memoryStorage();
    localStorage.setItem("stl-achievements-v1", JSON.stringify(["ACH_NO_SUCH", "ACH_SECTOR_5"]));
    resetAchievementMemory();
    assert.deepEqual(earnedIds(), ["ACH_SECTOR_5"]);

    localStorage.setItem("stl-achievements-v1", JSON.stringify(["ACH_SHIPS", "ACH_SECTOR_5"]));
    resetAchievementMemory();
    const run = createGame(1, "PLAYER_SHIP_ANAEROBIC_2");
    run.phase = "map";
    run.sector = 8;
    run.scrap = 600;
    assert.deepEqual(
      noteRun(run).sort(),
      [
        "ACH_NO_MISSILES",
        "ACH_PACIFIST",
        "ACH_SECTOR_8",
        "ACH_NO_UPGRADES",
        "ACH_SECTOR_5",
        "ACH_NO_BUYING",
        "ACH_NO_DEATH",
        "ACH_NO_REPAIR",
        "ACH_LANIUS_SCRAP",
        "ACH_NO_DRONES",
        "ACH_SHIPS",
      ].sort(),
    );
    const quiet = createGame(1);
    quiet.phase = "map";
    assert.deepEqual(
      noteRun(quiet).sort(),
      [
        "ACH_NO_MISSILES",
        "ACH_PACIFIST",
        "ACH_SECTOR_8",
        "ACH_NO_UPGRADES",
        "ACH_SECTOR_5",
        "ACH_NO_BUYING",
        "ACH_NO_DEATH",
        "ACH_NO_REPAIR",
        "ACH_LANIUS_SCRAP",
        "ACH_NO_DRONES",
        "ACH_SHIPS",
      ].sort(),
    );
  });

  it("reads Your Own Fleet from the saved Type A unlocks", () => {
    memoryStorage();
    const typeA = HULLS.filter((hull) => hull.layout === "A").map((hull) => hull.id);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ ships: typeA.slice(0, -1), wins: [] }));
    resetAchievementMemory();
    const shy = createGame(2);
    shy.phase = "map";
    assert.equal(earnedNow(shy).includes("ACH_UNLOCK_ALL"), false);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ ships: typeA, wins: [], boss: ["easy"] }));
    resetAchievementMemory();
    const fleet = createGame(3);
    fleet.phase = "map";
    assert.ok(earnedNow(fleet).includes("ACH_UNLOCK_ALL"));
    assert.ok(earnedNow(fleet).includes("ACH_WIN_EASY"));
    assert.equal(earnedNow(fleet).includes("ACH_WIN_NORMAL"), false);
  });

  it("Manpower ignores an event reactor bar and counts an upgrades-tab bar", () => {
    const g = createGame(1, "PLAYER_SHIP_ENERGY");
    g.sector = 5;
    assert.equal(earnedNow(g).includes("ACH_ENERGY_MANPOWER"), true);
    g.player.reactor += 1;
    noteReactorEvent(g);
    assert.equal(earnedNow(g).includes("ACH_ENERGY_MANPOWER"), true);
    g.player.reactor += 1;
    assert.equal(earnedNow(g).includes("ACH_ENERGY_MANPOWER"), false);
  });

  it("tracks every named achievement", () => {
    const tracked = ACHIEVEMENTS.filter((row) => isTracked(row.id)).map((row) => row.id);
    assert.deepEqual(
      tracked,
      ACHIEVEMENTS.map((row) => row.id),
    );
    assert.deepEqual(untrackedIds(), []);
  });

  it("earns four crew-blue choices by sector 5, and full enemy vision without sensors", () => {
    const fed = createGame(1, "PLAYER_SHIP_FED");
    fed.phase = "map";
    fed.sector = 5;
    const blues = [
      "s:confused-mantis:human",
      "s:moon:slug",
      "c:engi-smashed-ships:2",
      "c:fire-on-research-station:3",
    ];
    for (const id of blues) noteCrewBlue(fed, id);
    noteCrewBlue(fed, blues[0]!);
    noteCrewBlue(fed, "c:slocknog:0");
    assert.equal(fed.tally?.blueCrew, 4);
    assert.ok(earnedNow(fed).includes("ACH_FED_DIPLOMACY"));

    const late = createGame(2, "PLAYER_SHIP_FED");
    late.phase = "map";
    late.sector = 6;
    for (const id of blues) noteCrewBlue(late, id);
    assert.equal(earnedNow(late).includes("ACH_FED_DIPLOMACY"), false);

    const other = createGame(3, "PLAYER_SHIP_HARD");
    other.phase = "map";
    other.sector = 3;
    for (const id of blues) noteCrewBlue(other, id);
    assert.equal(earnedNow(other).includes("ACH_FED_DIPLOMACY"), false);

    const slug = createGame(4, "PLAYER_SHIP_JELLY");
    slug.phase = "map";
    assert.equal(earnedNow(slug).includes("ACH_SLUG_VISION"), false);
    startCombat(slug, "scout");
    assert.ok(slug.enemy);
    slug.player.systems.sensors.level = 0;
    slug.player.systems.sensors.power = 0;
    slug.player.systems.sensors.damage = 0;
    slug.player.systems.sensors.ion = [];
    slug.enemy.rooms.forEach((room, index) => {
      const body: Crew = {
        id: `board-${index}`,
        name: `board-${index}`,
        side: "player",
        aboard: "enemy",
        hp: 100,
        maxHp: 100,
        room: room.id,
        path: [],
        move: 0,
        think: 0,
        tone: 0,
        kin: "slug",
      };
      slug.crew.push(body);
    });
    assert.ok(earnedNow(slug).includes("ACH_SLUG_VISION"));
    slug.player.systems.sensors.level = 2;
    slug.player.systems.sensors.power = 2;
    assert.equal(earnedNow(slug).includes("ACH_SLUG_VISION"), false);
  });
});
