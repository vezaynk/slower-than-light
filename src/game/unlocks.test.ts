import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "./hulls.ts";
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
import { getUnlocks, isUnlocked, noteUnlocks, resetUnlockMemory, resetUnlocks, unlockAll } from "./unlock-store.ts";
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
    assert.deepEqual(start.ships, ["kestrel-a"]);
    for (const hull of HULLS) assert.equal(isUnlockedIn(start, hull.id), hull.id === "kestrel-a", hull.id);
  });

  it("has a rule and a page line for every hull", () => {
    for (const hull of HULLS) {
      assert.ok(ruleFor(hull.id).quote.length > 10, hull.id);
      assert.ok(hull.unlock.length > 10, hull.id);
    }
    assert.deepEqual(
      A_RULES.map((r) => r.hull).sort(),
      HULLS.filter((h) => h.layout === "A").map((h) => h.id).sort(),
    );
  });

  it("unlocks the Engi Cruiser at sector 5 with any Kestrel layout, not before", () => {
    assert.equal(deriveUnlocks(start, run("kestrel-a", { sector: 4 }), []), start);
    assert.ok(deriveUnlocks(start, run("kestrel-a", { sector: 5 }), []).ships.includes("engi-a"));
    assert.ok(deriveUnlocks(start, run("kestrel-b", { sector: 5 }), []).ships.includes("engi-a"));
    assert.equal(deriveUnlocks(start, run("fed-a", { sector: 5 }), []).ships.includes("engi-a"), false);
  });

  it("ignores the title placeholder", () => {
    const title = run("kestrel-a", { sector: 8 });
    title.phase = "title";
    assert.equal(deriveUnlocks(start, title, []), start);
  });

  it("follows the Flagship chain: Engi > Fed > Zoltan > Mantis > Slug > Rock > Stealth", () => {
    const chain: [string, string][] = [
      ["engi-a", "fed-a"],
      ["fed-b", "zoltan-a"],
      ["zoltan-a", "mantis-a"],
      ["mantis-c", "slug-a"],
      ["slug-a", "rock-a"],
      ["rock-a", "stealth-a"],
    ];
    for (const [hull, next] of chain) {
      const after = deriveUnlocks(start, won(hull), []);
      assert.ok(after.ships.includes(next), `${hull} -> ${next}`);
      assert.ok(after.wins.includes(hull));
    }
    // The Kestrel's win is not on any event page's parenthetical (sector 8 still passes the Engi's sector 5).
    assert.deepEqual(deriveUnlocks(start, won("kestrel-a"), []).ships, ["kestrel-a", "engi-a"]);
  });

  it("grants Layout A from an event outcome through the run (pure)", () => {
    const g = run("kestrel-a");
    assert.equal(grantUnlock(g, "stealth-a"), "You unlock the Stealth Cruiser.");
    grantUnlock(g, "stealth-a");
    assert.deepEqual(g.unlocked, ["stealth-a"]);
    assert.equal(g.log[0], "You unlock the Stealth Cruiser.");
    assert.ok(deriveUnlocks(start, g, []).ships.includes("stealth-a"));
    assert.equal(grantUnlock(g, "nope"), "");
  });

  it("unlocks the Federation Cruiser from the Rebel shipyard fight, nothing from other fights", () => {
    const g = run("kestrel-a");
    fightUnlock(g, "some-other-page");
    fightUnlock(g, null);
    assert.equal(g.unlocked, undefined);
    fightUnlock(g, "rebel-shipyard");
    assert.deepEqual(g.unlocked, ["fed-a"]);
  });

  it("unlocks Layout B with 2 of the 3 ship achievements", () => {
    const ids = shipAchievements("Kestrel Cruiser");
    assert.equal(ids.length, 3);
    assert.equal(deriveUnlocks(start, run("kestrel-a"), ids.slice(0, 1)).ships.includes("kestrel-b"), false);
    assert.ok(deriveUnlocks(start, run("kestrel-a"), ids.slice(0, 2)).ships.includes("kestrel-b"));
  });

  it("unlocks Layout C at sector 8 with Layout B only", () => {
    assert.ok(deriveUnlocks(start, run("zoltan-b", { sector: 8 }), []).ships.includes("zoltan-c"));
    assert.equal(deriveUnlocks(start, run("zoltan-b", { sector: 7 }), []).ships.includes("zoltan-c"), false);
    assert.equal(deriveUnlocks(start, run("zoltan-a", { sector: 8 }), []).ships.includes("zoltan-c"), false);
    // Lanius and Crystal have no Layout C.
    const lanius = deriveUnlocks(start, run("lanius-b", { sector: 8 }), []);
    assert.equal(lanius.ships.some((id) => id.endsWith("-c") && id.startsWith("lanius")), false);
  });

  it("unlocks the Lanius after 4 cruisers besides the Kestrel", () => {
    const three: UnlockState = { ships: ["kestrel-a", "engi-a", "fed-a", "zoltan-a", "kestrel-b"], wins: [] };
    assert.equal(deriveUnlocks(three, run("kestrel-a"), []), three);
    const g = run("kestrel-a");
    grantUnlock(g, "mantis-a");
    assert.ok(deriveUnlocks(three, g, []).ships.includes("lanius-a"));
  });

  it("unlocks the Crystal after Flagship wins with A and B of every ship but the Lanius", () => {
    const cruisers = [...new Set(HULLS.map((h) => h.cruiser))].filter(
      (c) => c !== "Lanius Cruiser" && c !== "Crystal Cruiser",
    );
    const wins = HULLS.filter((h) => cruisers.includes(h.cruiser) && h.layout !== "C").map((h) => h.id);
    const most: UnlockState = { ships: ["kestrel-a"], wins: wins.slice(1) };
    const missing = HULLS.find((h) => h.id === wins[0])!;
    assert.equal(deriveUnlocks(most, run("kestrel-a"), []).ships.includes("crystal-a"), false);
    assert.ok(deriveUnlocks(most, won(missing.id), []).ships.includes("crystal-a"));
  });

  it("unlock-all opens every hull and keeps wins", () => {
    const all = allUnlocks({ ships: ["kestrel-a"], wins: ["engi-a"] });
    for (const hull of HULLS) assert.ok(isUnlockedIn(all, hull.id));
    assert.deepEqual(all.wins, ["engi-a"]);
  });

  it("records the difficulty of a Flagship win", () => {
    const easy = deriveUnlocks(
      start,
      run("kestrel-a", { phase: "victory", outcome: "victory", sector: 8, difficulty: "easy" }),
      [],
    );
    assert.deepEqual(easy.boss, ["easy"]);
    assert.ok(easy.wins.includes("kestrel-a"));
    const both = deriveUnlocks(
      easy,
      run("engi-a", { phase: "victory", outcome: "victory", sector: 8, difficulty: "normal" }),
      [],
    );
    assert.deepEqual(both.boss, ["easy", "normal"]);
    const hard = deriveUnlocks(
      start,
      run("kestrel-a", { phase: "victory", outcome: "victory", difficulty: "hard" }),
      [],
    );
    assert.deepEqual(hard.boss, ["hard"]);
    assert.deepEqual(parseUnlocks(JSON.stringify(both)).boss, ["easy", "normal"]);
  });

  it("reads bad storage as the start state", () => {
    assert.deepEqual(parseUnlocks(null), start);
    assert.deepEqual(parseUnlocks("{nope"), start);
    assert.deepEqual(parseUnlocks(JSON.stringify({ ships: ["engi-a", "bogus", 4], wins: "x" })), {
      ships: ["kestrel-a", "engi-a"],
      wins: [],
    });
  });
});

describe("unlock storage (ashwake:unlocks)", () => {
  it("persists progress across runs and survives a reload", () => {
    const bag = memoryStorage();
    assert.equal(isUnlocked("engi-a"), false);
    assert.deepEqual(noteUnlocks(run("kestrel-a", { sector: 5 })), ["engi-a"]);
    assert.deepEqual(noteUnlocks(run("kestrel-a", { sector: 5 })), []);
    assert.ok(JSON.parse(bag.get(UNLOCKS_KEY)!).ships.includes("engi-a"));
    resetUnlockMemory();
    assert.ok(isUnlocked("engi-a"));
    // A later run that does nothing keeps the unlock.
    noteUnlocks(run("kestrel-a"));
    assert.ok(getUnlocks().ships.includes("engi-a"));
  });

  it("unlock all and reset", () => {
    memoryStorage();
    unlockAll();
    for (const hull of HULLS) assert.ok(isUnlocked(hull.id), hull.id);
    resetUnlocks();
    assert.deepEqual(getUnlocks().ships, ["kestrel-a"]);
  });

  it("works with no localStorage at all", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    resetUnlockMemory();
    assert.equal(isUnlocked("kestrel-a"), true);
    unlockAll();
    assert.equal(isUnlocked("rock-c"), true);
    memoryStorage();
  });
});
