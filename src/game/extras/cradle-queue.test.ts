import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, waitHere } from "../sim.ts";
import { onCradleDeath, onCradleJump, tickCradle } from "./cradle.ts";
import type { Crew, Game, Kit } from "../types.ts";

function poweredKit(level = 1): Kit {
  return { id: "cradle", level, power: 1, left: 0, cool: 0, target: null, on: true, aux: 0 };
}

function players(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "player");
}

function kill(g: Game, c: Crew) {
  c.hp = 0;
  assert.equal(onCradleDeath(g, c), true);
}

describe("player Clone Bay queue (wiki Clone Bay, Overview)", () => {
  it("clones one-by-one in death order", () => {
    const g = createGame(1);
    g.player.kits.cradle = poweredKit(1);
    const [a, b] = players(g);
    kill(g, a);
    kill(g, b);
    assert.ok((a.cloneSeq ?? 0) < (b.cloneSeq ?? 0));
    tickCradle(g, 6);
    assert.equal(a.cloneIn, 6);
    assert.equal(b.cloneIn, 12, "waiting clone does not count down");
    tickCradle(g, 6);
    assert.equal(a.hp, a.maxHp);
    assert.equal(a.cloneSeq, undefined);
    assert.equal(b.cloneIn, 12);
    tickCradle(g, 12);
    assert.equal(b.hp, b.maxHp);
  });

  it("offline loses the last-entered clone every 3 s; the head survives longer", () => {
    const g = createGame(1);
    const kit = poweredKit(1);
    g.player.kits.cradle = kit;
    const [a, b, c] = players(g);
    kill(g, a);
    kill(g, b);
    kill(g, c);
    kit.power = 0;
    tickCradle(g, 2.9);
    assert.ok((c.cloneIn ?? 0) > 0);
    tickCradle(g, 0.2);
    assert.equal(c.cloneIn, undefined);
    assert.ok((a.cloneIn ?? 0) > 0 && (b.cloneIn ?? 0) > 0);
    tickCradle(g, 3);
    assert.equal(b.cloneIn, undefined);
    assert.ok((a.cloneIn ?? 0) > 0);
  });

  it("a destroyed bay counts as offline", () => {
    const g = createGame(1);
    const kit = poweredKit(1);
    g.player.kits.cradle = kit;
    const [a] = players(g);
    kill(g, a);
    kit.damage = 1;
    tickCradle(g, 3);
    assert.equal(a.cloneIn, undefined);
  });

  it("loss progression survives a jump heal", () => {
    const g = createGame(1);
    const kit = poweredKit(1);
    g.player.kits.cradle = kit;
    const [a] = players(g);
    kill(g, a);
    kit.power = 0;
    tickCradle(g, 2);
    onCradleJump(g);
    assert.equal(kit.aux, 2);
    tickCradle(g, 1);
    assert.equal(a.cloneIn, undefined);
  });

  it("jump heal skips a destroyed bay", () => {
    const g = createGame(1);
    const kit = poweredKit(2);
    g.player.kits.cradle = kit;
    const [a] = players(g);
    a.hp = 50;
    kit.damage = 2;
    onCradleJump(g);
    assert.equal(a.hp, 50);
    kit.damage = 1;
    kit.power = 0;
    onCradleJump(g);
    assert.equal(a.hp, Math.min(a.maxHp, 66), "partly damaged, unpowered bay still heals");
  });

  it("waiting at a beacon applies the jump heal", () => {
    const g = createGame(1);
    g.player.kits.cradle = poweredKit(1);
    g.phase = "map";
    const [a] = players(g);
    a.hp = 40;
    waitHere(g);
    assert.equal(a.hp, Math.min(a.maxHp, 48));
  });
});
