import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { cellBonus, installCell, startCell, tickCell, upgradeCell } from "./cell.ts";
import type { Kit } from "../types.ts";

function pushCell(level = 1): Kit {
  return {
    id: "cell",
    level,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

describe("cell", () => {
  it("gives 2 bars for 30s then cools for 20", () => {
    const g = createGame(1);
    g.scrap = 35;
    installCell(g);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.kits.cell?.level, 1);
    assert.equal(g.player.kits.cell?.power, 0);
    startCell(g);
    assert.equal(cellBonus(g.player), 2);
    assert.equal(g.player.kits.cell?.aux, 2);
    assert.equal(g.player.kits.cell?.left, 30);
    tickCell(g, 30);
    assert.equal(cellBonus(g.player), 0);
    assert.equal(g.player.kits.cell?.on, false);
    assert.equal(g.player.kits.cell?.aux, 0);
    assert.equal(g.player.kits.cell?.cool, 20);
    assert.equal(g.player.kits.cell?.power, 0);
  });

  it("cools in 10s when augments include tap", () => {
    const g = createGame(2);
    g.augments = ["tap"];
    g.player.kits.cell = pushCell(1);
    startCell(g);
    assert.equal(cellBonus(g.player), 2);
    tickCell(g, 30);
    assert.equal(cellBonus(g.player), 0);
    assert.equal(g.player.kits.cell?.cool, 10);
  });

  it("upgrades to 4 bars for 50 scrap", () => {
    const g = createGame(3);
    g.scrap = 85;
    installCell(g);
    upgradeCell(g);
    assert.equal(g.scrap, 0);
    assert.equal(g.player.kits.cell?.level, 2);
    assert.equal(g.player.kits.cell?.power, 0);
    startCell(g);
    assert.equal(cellBonus(g.player), 4);
    assert.equal(g.player.kits.cell?.aux, 4);
  });

  it("does not start again until cool reaches 0", () => {
    const g = createGame(4);
    g.player.kits.cell = pushCell(1);
    startCell(g);
    tickCell(g, 30);
    startCell(g);
    assert.equal(cellBonus(g.player), 0);
    assert.equal(g.player.kits.cell?.cool, 20);
    tickCell(g, 20);
    assert.equal(g.player.kits.cell?.cool, 0);
    startCell(g);
    assert.equal(cellBonus(g.player), 2);
  });

  it("does not crash when the enemy is null", () => {
    const g = createGame(5);
    g.enemy = null;
    tickCell(g, 1);
    g.player.kits.cell = pushCell(1);
    startCell(g);
    tickCell(g, 0.5);
    assert.equal(cellBonus(g.player), 2);
  });

  it("starts an enemy cell when spare power is tight", () => {
    const g = createGame(6);
    g.enemy = {
      ...g.player,
      name: "Picket",
      reactor: 7,
      kits: { cell: pushCell(2) },
    };
    tickCell(g, 0.16);
    assert.equal(g.enemy?.kits.cell?.on, true);
    assert.equal(g.enemy?.kits.cell?.left, 30);
    assert.equal(cellBonus(g.enemy!), 4);
  });
});
