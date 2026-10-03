import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buy, commitJump, createGame, repairHull, runScore, startCombat, step } from "../sim.ts";

function openStore(seed: number) {
  const g = createGame(seed);
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = g.beacons.find((b) => b.id !== g.here);
  assert.ok(dest);
  dest.kind = "store";
  dest.resolved = false;
  if (!here.links.includes(dest.id)) here.links.push(dest.id);
  g.fuel = 5;
  commitJump(g, dest.id);
  assert.equal(g.phase, "store");
  return g;
}

describe("score", () => {
  it("starts at 30, 10, or 0 and does not count that scrap", () => {
    assert.equal(createGame(1).scrap, 10);
    assert.equal(createGame(1).difficulty, "normal");
    assert.equal(createGame(1).scrapCollected, 0);
    assert.equal(createGame(1, undefined, "easy").scrap, 30);
    assert.equal(createGame(1, undefined, "hard").scrap, 0);
    assert.equal(createGame(1, "kestrel-a", "easy").scrap, 30);
  });

  it("multiplies (s + 10b + 20k) by 1, 1.25, or 1.5 and floors", () => {
    const g = createGame(1, undefined, "easy");
    g.scrapCollected = 10;
    g.beaconsVisited = 1;
    g.kills = 2;
    assert.equal(runScore(g), 10 + 10 + 40);
    g.difficulty = "normal";
    assert.equal(runScore(g), Math.floor(60 * 1.25));
    g.difficulty = "hard";
    assert.equal(runScore(g), Math.floor(60 * 1.5));
    g.phase = "victory";
    g.kills = 1;
    g.scrapCollected = 0;
    g.beaconsVisited = 0;
    assert.equal(runScore(g), 0);
  });

  it("keeps the Scrap Recovery Arm bonus out of s and does not let Repair Arm reduce s", () => {
    const hook = createGame(4);
    hook.augments = ["hook"];
    const start = hook.scrap;
    startCombat(hook, "scout");
    assert.ok(hook.enemy);
    hook.enemy.hull = 0;
    step(hook, 0.01);
    assert.equal(hook.phase, "reward");
    const wallet = hook.scrap - start;
    assert.ok(wallet - hook.scrapCollected >= 1);
    assert.ok(hook.scrapCollected >= 12);

    const weld = createGame(4);
    weld.augments = ["weld"];
    weld.player.hull = 20;
    const weldStart = weld.scrap;
    startCombat(weld, "scout");
    assert.ok(weld.enemy);
    weld.enemy.hull = 0;
    step(weld, 0.01);
    assert.ok(weld.scrapCollected > weld.scrap - weldStart);
  });
});

describe("store resources", () => {
  it("sells fuel at 3, missiles at 6, and drone parts at 8 inside the printed stock ranges", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const g = openStore(seed);
      const fuel = g.stock?.find((item) => item.kind === "fuel");
      const missiles = g.stock?.find((item) => item.kind === "missiles");
      const parts = g.stock?.find((item) => item.kind === "parts");
      assert.ok(fuel && missiles && parts);
      assert.ok(fuel.amount >= 3 && fuel.amount <= 7);
      assert.equal(fuel.cost, fuel.amount * 3);
      assert.ok(missiles.amount >= 2 && missiles.amount <= 6);
      assert.equal(missiles.cost, missiles.amount * 6);
      assert.ok(parts.amount >= 2 && parts.amount <= 4);
      assert.equal(parts.cost, parts.amount * 8);
    }
  });

  it("adds drone parts to the ship and repairs at the sector rate", () => {
    const g = openStore(2);
    const parts = g.stock?.find((item) => item.kind === "parts");
    assert.ok(parts);
    g.scrap = parts.cost;
    const before = g.player.parts;
    buy(g, parts.id);
    assert.equal(g.player.parts, before + parts.amount);
    assert.equal(g.scrap, 0);

    const easy = createGame(1);
    easy.scrap = 20;
    easy.player.hull = 20;
    repairHull(easy, "one");
    assert.equal(easy.player.hull, 21);
    assert.equal(easy.scrap, 18);

    easy.sector = 7;
    repairHull(easy, "one");
    assert.equal(easy.player.hull, 22);
    assert.equal(easy.scrap, 14);
  });
});
