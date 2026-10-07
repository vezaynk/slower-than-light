import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, applyPulsarPulse, createGame, waitHere } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { cellBonus, installCell, ionOnCell, startCell, tickCell, upgradeCell } from "./cell.ts";
import { onPlayerJump } from "./index.ts";
import type { Kit, Shot } from "../types.ts";

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
    g.phase = "combat";
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
    g.phase = "combat";
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
    g.phase = "combat";
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

  it("stays ready when it runs out and the ship is not in danger", () => {
    const g = createGame(7);
    g.player.kits.cell = pushCell(1);
    assert.equal(g.phase, "map");
    startCell(g);
    tickCell(g, 30);
    assert.equal(g.player.kits.cell?.on, false);
    assert.equal(g.player.kits.cell?.cool, 0);
    startCell(g);
    assert.equal(cellBonus(g.player), 2);

    // Backup Battery's IN DANGER note: an asteroid field still counts off the combat phase.
    g.asteroid = true;
    tickCell(g, 30);
    assert.equal(g.player.kits.cell?.cool, 20);
    startCell(g);
    assert.equal(cellBonus(g.player), 0);
  });

  it("resets a cooldown on an FTL jump and not when waiting", () => {
    const g = createGame(8);
    g.player.kits.cell = pushCell(1);
    g.player.kits.cell.cool = 12;
    onPlayerJump(g);
    assert.equal(g.player.kits.cell.cool, 0);
    assert.equal(g.log[0], "Backup Battery is ready.");

    g.player.kits.cell.cool = 12;
    g.phase = "map";
    g.fuel = 3;
    waitHere(g);
    assert.equal(g.player.kits.cell.cool, 12);
  });

  it("starts the 25s cooldown when one hit ionizes every level", () => {
    const g = createGame(9);
    g.phase = "map";
    g.augments = ["tap"];
    g.player.kits.cell = pushCell(1);
    startCell(g);
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), true);
    assert.equal(g.player.kits.cell?.on, false);
    assert.equal(g.player.kits.cell?.cool, 25);
    assert.equal(cellBonus(g.player), 0);
    assert.equal(g.log[0], "Backup Battery cooling.");
    tickCell(g, 5);
    assert.equal(g.player.kits.cell?.cool, 20);

    g.player.kits.cell = pushCell(2);
    startCell(g);
    assert.equal(cellBonus(g.player), 4);
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), false);
    assert.equal(g.player.kits.cell?.on, true);
    assert.equal(g.player.kits.cell?.cool, 0);
    assert.equal(cellBonus(g.player), 4);
    assert.equal(ionOnCell(g, g.player.kits.cell!, 2), true);
    assert.equal(g.player.kits.cell?.cool, 25);
    assert.equal(cellBonus(g.player), 0);
  });

  it("locks an activated level 2 battery when two 1-ion sources land together", () => {
    const g = createGame(11);
    g.phase = "combat";
    g.player.kits.cell = pushCell(2);
    startCell(g);
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), false);
    assert.equal(g.player.kits.cell?.on, true);
    assert.equal(g.log[0], "Backup Battery online.");
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), true);
    assert.equal(g.player.kits.cell?.cool, 25);
    assert.equal(g.player.kits.cell?.on, false);
    assert.equal(cellBonus(g.player), 0);

    g.player.kits.cell = pushCell(2);
    startCell(g);
    g.time = 1;
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), false);
    g.time = 2;
    assert.equal(ionOnCell(g, g.player.kits.cell!, 1), false);
    assert.equal(g.player.kits.cell?.on, true);
    assert.equal(g.player.kits.cell?.cool, 0);

    const hit = createGame(12);
    hit.player.kits.cell = pushCell(2);
    seatKits(hit.player);
    const room = hit.player.rooms.find((r) => r.kit === "cell");
    assert.ok(room);
    hit.player.systems.engines.power = 0;
    hit.player.shieldNow = 0;
    hit.player.zoltan = 0;
    startCell(hit);
    const bomb: Shot = {
      id: "b",
      kind: "bomb",
      from: "enemy",
      damage: 0,
      ion: 1,
      fireChance: 0,
      breachChance: 0,
      defId: "stunbomb",
      targetRoom: room.id,
      wait: 0,
      t: 1,
      duration: 1,
    };
    applyImpact(hit, bomb);
    assert.equal(hit.player.kits.cell?.on, true);
    applyImpact(hit, { ...bomb, id: "b2" });
    assert.equal(hit.player.kits.cell?.cool, 25);
    assert.equal(hit.player.kits.cell?.on, false);
  });

  it("lets an ion bomb and a pulsar cover the battery", () => {
    const g = createGame(10);
    g.scrap = 85;
    installCell(g);
    upgradeCell(g);
    const room = g.player.rooms.find((r) => r.kit === "cell");
    assert.ok(room);
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 0;
    g.player.zoltan = 0;
    startCell(g);
    const bomb: Shot = {
      id: "b",
      kind: "bomb",
      from: "enemy",
      damage: 0,
      ion: 1,
      fireChance: 0,
      breachChance: 0,
      defId: "stunbomb",
      targetRoom: room.id,
      wait: 0,
      t: 1,
      duration: 1,
    };
    applyImpact(g, bomb);
    assert.notEqual(g.log[0], "Bomb missed the Lark.");
    assert.equal(g.player.kits.cell?.on, true);
    assert.equal(g.player.kits.cell?.cool, 0);
    applyImpact(g, { ...bomb, defId: "ionbomb", ion: 4 });
    assert.equal(g.player.kits.cell?.cool, 25);
    assert.equal(g.player.kits.cell?.on, false);
    assert.equal(g.log[0], "Backup Battery cooling.");

    let pulsed = false;
    for (let seed = 1; seed < 80 && !pulsed; seed++) {
      const pulse = createGame(seed);
      pulse.player.kits.cell = pushCell(2);
      pulse.player.zoltan = 0;
      pulse.player.systems.shields.power = 0;
      startCell(pulse);
      applyPulsarPulse(pulse);
      pulsed = pulse.player.kits.cell?.cool === 25;
    }
    assert.equal(pulsed, true);
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
