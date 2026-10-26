import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playerHulls } from "./hulls.ts";
import { createGame } from "./sim.ts";
import type { Game } from "./types.ts";
import {
  A_RULES,
  UNLOCKS_KEY,
  allUnlocks,
  deriveUnlocks,
  emptyUnlocks,
  fightUnlock,
  grantUnlock,
  isUnlockedIn,
  parseUnlocks,
  ruleFor,
  shipAchievements,
  type UnlockState,
} from "./unlocks.ts";
import {
  getUnlocks,
  isUnlocked,
  noteUnlocks,
  resetUnlockMemory,
  resetUnlocks,
  unlockAll,
} from "./unlock-store.ts";
import { resetAchievementMemory } from "./wiki/achievement-track.ts";

function run(hull: string, patch: Partial<Game> = {}): Game {
  const g = createGame(1, hull);
  g.phase = "map";
  return Object.assign(g, patch);
}

function won(hull: string): Game {
  return run(hull, { phase: "victory", outcome: "victory", sector: 8 });
}

function memoryStorage(seed: Record<string, string> = {}) {
  const bag = new Map<string, string>(Object.entries(seed));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => bag.get(key) ?? null,
      setItem: (key: string, value: string) => void bag.set(key, value),
      removeItem: (key: string) => void bag.delete(key),
      clear: () => bag.clear(),
      key: () => null,
      length: 0,
    },
  });
  resetUnlockMemory();
  resetAchievementMemory();
  return bag;
}

const start = emptyUnlocks();

describe("ship unlocks (Ships, Layouts)", () => {
  it("starts with only the Kestrel A", () => {
    assert.deepEqual(start.ships, ["PLAYER_SHIP_HARD"]);
    for (const hull of playerHulls())
      assert.equal(isUnlockedIn(start, hull.id), hull.id === "PLAYER_SHIP_HARD", hull.id);
  });

  it("has a rule and a page line for every hull", () => {
    for (const hull of playerHulls()) {
      assert.ok(ruleFor(hull.id).quote.length > 10, hull.id);
      assert.ok(hull.unlock.length > 10, hull.id);
    }
    assert.deepEqual(
      A_RULES.map((r) => r.hull).sort(),
      playerHulls()
        .filter((h) => h.layout === "A")
        .map((h) => h.id)
        .sort(),
    );
  });

  it("unlocks the Engi Cruiser at sector 5 with any Kestrel layout, not before", () => {
    assert.equal(deriveUnlocks(start, run("PLAYER_SHIP_HARD", { sector: 4 }), []), start);
    assert.ok(
      deriveUnlocks(start, run("PLAYER_SHIP_HARD", { sector: 5 }), []).ships.includes(
        "PLAYER_SHIP_CIRCLE",
      ),
    );
    assert.ok(
      deriveUnlocks(start, run("PLAYER_SHIP_HARD_2", { sector: 5 }), []).ships.includes(
        "PLAYER_SHIP_CIRCLE",
      ),
    );
    assert.equal(
      deriveUnlocks(start, run("PLAYER_SHIP_FED", { sector: 5 }), []).ships.includes(
        "PLAYER_SHIP_CIRCLE",
      ),
      false,
    );
  });

  it("ignores the title placeholder", () => {
    const title = run("PLAYER_SHIP_HARD", { sector: 8 });
    title.phase = "title";
    assert.equal(deriveUnlocks(start, title, []), start);
  });

  it("follows the Flagship chain: Engi > Fed > Zoltan > Mantis > Slug > Rock > Stealth", () => {
    const chain: [string, string][] = [
      ["PLAYER_SHIP_CIRCLE", "PLAYER_SHIP_FED"],
      ["PLAYER_SHIP_FED_2", "PLAYER_SHIP_ENERGY"],
      ["PLAYER_SHIP_ENERGY", "PLAYER_SHIP_MANTIS"],
      ["PLAYER_SHIP_MANTIS_3", "PLAYER_SHIP_JELLY"],
      ["PLAYER_SHIP_JELLY", "PLAYER_SHIP_ROCK"],
      ["PLAYER_SHIP_ROCK", "PLAYER_SHIP_STEALTH"],
    ];
    for (const [hull, next] of chain) {
      const after = deriveUnlocks(start, won(hull), []);
      assert.ok(after.ships.includes(next), `${hull} -> ${next}`);
      assert.ok(after.wins.includes(hull));
    }
    // The Kestrel's win is not on any event page's parenthetical (sector 8 still passes the Engi's sector 5).
    assert.deepEqual(deriveUnlocks(start, won("PLAYER_SHIP_HARD"), []).ships, [
      "PLAYER_SHIP_HARD",
      "PLAYER_SHIP_CIRCLE",
    ]);
  });

  it("grants Layout A from an event outcome through the run (pure)", () => {
    const g = run("PLAYER_SHIP_HARD");
    assert.equal(grantUnlock(g, "PLAYER_SHIP_STEALTH"), "You unlock the Stealth Cruiser.");
    grantUnlock(g, "PLAYER_SHIP_STEALTH");
    assert.deepEqual(g.unlocked, ["PLAYER_SHIP_STEALTH"]);
    assert.equal(g.log[0], "You unlock the Stealth Cruiser.");
    assert.ok(deriveUnlocks(start, g, []).ships.includes("PLAYER_SHIP_STEALTH"));
    assert.equal(grantUnlock(g, "nope"), "");
  });

  it("unlocks the Federation Cruiser from the Rebel shipyard fight, nothing from other fights", () => {
    const g = run("PLAYER_SHIP_HARD");
    fightUnlock(g, "some-other-page");
    fightUnlock(g, null);
    assert.equal(g.unlocked, undefined);
    fightUnlock(g, "rebel-shipyard");
    assert.deepEqual(g.unlocked, ["PLAYER_SHIP_FED"]);
  });

  it("unlocks Layout B with 2 of the 3 ship achievements", () => {
    const ids = shipAchievements("Kestrel Cruiser");
    assert.equal(ids.length, 3);
    assert.equal(
      deriveUnlocks(start, run("PLAYER_SHIP_HARD"), ids.slice(0, 1)).ships.includes(
        "PLAYER_SHIP_HARD_2",
      ),
      false,
    );
    assert.ok(
      deriveUnlocks(start, run("PLAYER_SHIP_HARD"), ids.slice(0, 2)).ships.includes(
        "PLAYER_SHIP_HARD_2",
      ),
    );
  });

  it("unlocks Layout C at sector 8 with Layout B only", () => {
    assert.ok(
      deriveUnlocks(start, run("PLAYER_SHIP_ENERGY_2", { sector: 8 }), []).ships.includes(
        "PLAYER_SHIP_ENERGY_3",
      ),
    );
    assert.equal(
      deriveUnlocks(start, run("PLAYER_SHIP_ENERGY_2", { sector: 7 }), []).ships.includes(
        "PLAYER_SHIP_ENERGY_3",
      ),
      false,
    );
    assert.equal(
      deriveUnlocks(start, run("PLAYER_SHIP_ENERGY", { sector: 8 }), []).ships.includes(
        "PLAYER_SHIP_ENERGY_3",
      ),
      false,
    );
    // Lanius and Crystal have no Layout C.
    const lanius = deriveUnlocks(start, run("PLAYER_SHIP_ANAEROBIC_2", { sector: 8 }), []);
    assert.equal(lanius.ships.includes("PLAYER_SHIP_ANAEROBIC_3"), false);
  });

  it("unlocks the Lanius after 4 cruisers besides the Kestrel", () => {
    const three: UnlockState = {
      ships: [
        "PLAYER_SHIP_HARD",
        "PLAYER_SHIP_CIRCLE",
        "PLAYER_SHIP_FED",
        "PLAYER_SHIP_ENERGY",
        "PLAYER_SHIP_HARD_2",
      ],
      wins: [],
    };
    assert.equal(deriveUnlocks(three, run("PLAYER_SHIP_HARD"), []), three);
    const g = run("PLAYER_SHIP_HARD");
    grantUnlock(g, "PLAYER_SHIP_MANTIS");
    assert.ok(deriveUnlocks(three, g, []).ships.includes("PLAYER_SHIP_ANAEROBIC"));
  });

  it("unlocks the Crystal after Flagship wins with A and B of every ship but the Lanius", () => {
    const cruisers = [...new Set(playerHulls().map((h) => h.cruiser))].filter(
      (c) => c !== "Lanius Cruiser" && c !== "Crystal Cruiser",
    );
    const wins = playerHulls()
      .filter((h) => cruisers.includes(h.cruiser) && h.layout !== "C")
      .map((h) => h.id);
    const most: UnlockState = { ships: ["PLAYER_SHIP_HARD"], wins: wins.slice(1) };
    const missing = playerHulls().find((h) => h.id === wins[0])!;
    assert.equal(
      deriveUnlocks(most, run("PLAYER_SHIP_HARD"), []).ships.includes("PLAYER_SHIP_CRYSTAL"),
      false,
    );
    assert.ok(deriveUnlocks(most, won(missing.id), []).ships.includes("PLAYER_SHIP_CRYSTAL"));
  });

  it("unlock-all opens every hull and keeps wins", () => {
    const all = allUnlocks({ ships: ["PLAYER_SHIP_HARD"], wins: ["PLAYER_SHIP_CIRCLE"] });
    for (const hull of playerHulls()) assert.ok(isUnlockedIn(all, hull.id));
    assert.deepEqual(all.wins, ["PLAYER_SHIP_CIRCLE"]);
  });

  it("records the difficulty of a Flagship win", () => {
    const easy = deriveUnlocks(
      start,
      run("PLAYER_SHIP_HARD", {
        phase: "victory",
        outcome: "victory",
        sector: 8,
        difficulty: "easy",
      }),
      [],
    );
    assert.deepEqual(easy.boss, ["easy"]);
    assert.ok(easy.wins.includes("PLAYER_SHIP_HARD"));
    const both = deriveUnlocks(
      easy,
      run("PLAYER_SHIP_CIRCLE", {
        phase: "victory",
        outcome: "victory",
        sector: 8,
        difficulty: "normal",
      }),
      [],
    );
    assert.deepEqual(both.boss, ["easy", "normal"]);
    const hard = deriveUnlocks(
      start,
      run("PLAYER_SHIP_HARD", { phase: "victory", outcome: "victory", difficulty: "hard" }),
      [],
    );
    assert.deepEqual(hard.boss, ["hard"]);
    assert.deepEqual(parseUnlocks(JSON.stringify(both)).boss, ["easy", "normal"]);
  });

  it("reads bad storage as the start state", () => {
    assert.deepEqual(parseUnlocks(null), start);
    assert.deepEqual(parseUnlocks("{nope"), start);
    assert.deepEqual(
      parseUnlocks(JSON.stringify({ ships: ["PLAYER_SHIP_CIRCLE", "bogus", 4], wins: "x" })),
      {
        ships: ["PLAYER_SHIP_HARD", "PLAYER_SHIP_CIRCLE"],
        wins: [],
      },
    );
  });
});

describe("unlock storage (stl:unlocks)", () => {
  it("persists progress across runs and survives a reload", () => {
    const bag = memoryStorage();
    assert.equal(isUnlocked("PLAYER_SHIP_CIRCLE"), false);
    assert.deepEqual(noteUnlocks(run("PLAYER_SHIP_HARD", { sector: 5 })), ["PLAYER_SHIP_CIRCLE"]);
    assert.deepEqual(noteUnlocks(run("PLAYER_SHIP_HARD", { sector: 5 })), []);
    assert.ok(JSON.parse(bag.get(UNLOCKS_KEY)!).ships.includes("PLAYER_SHIP_CIRCLE"));
    resetUnlockMemory();
    assert.ok(isUnlocked("PLAYER_SHIP_CIRCLE"));
    // A later run that does nothing keeps the unlock.
    noteUnlocks(run("PLAYER_SHIP_HARD"));
    assert.ok(getUnlocks().ships.includes("PLAYER_SHIP_CIRCLE"));
  });

  it("unlock all and reset", () => {
    memoryStorage();
    unlockAll();
    for (const hull of playerHulls()) assert.ok(isUnlocked(hull.id), hull.id);
    resetUnlocks();
    assert.deepEqual(getUnlocks().ships, ["PLAYER_SHIP_HARD"]);
  });

  it("works with no localStorage at all", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    resetUnlockMemory();
    assert.equal(isUnlocked("PLAYER_SHIP_HARD"), true);
    unlockAll();
    assert.equal(isUnlocked("PLAYER_SHIP_ROCK_3"), true);
    memoryStorage();
  });
});
