import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, sparePower } from "../sim.ts";
import type { Kit } from "../types.ts";
import {
  installVeil,
  startVeil,
  tickVeil,
  toggleVeilPower,
  upgradeVeil,
  veilBlocks,
  veilBrokenByFire,
  veilEvade,
} from "./veil.ts";

function fit(scrap = 400) {
  const g = createGame(1);
  g.scrap = scrap;
  installVeil(g);
  const kit = g.player.kits.veil;
  assert.ok(kit);
  return { g, kit };
}

function arm(kit: Kit) {
  kit.power = 1;
}

describe("veil", () => {
  it("pays 150, adds 60 evasion while up, blocks the shooter, then cools for 20", () => {
    const { g, kit } = fit();
    assert.equal(g.scrap, 250);
    assert.equal(g.log[0], "Cloaking fitted.");
    assert.equal(kit.id, "veil");
    assert.equal(kit.level, 1);
    assert.equal(kit.power, 0);
    assert.equal(kit.left, 0);
    assert.equal(kit.cool, 0);
    assert.equal(kit.target, null);
    assert.equal(kit.on, false);
    assert.equal(kit.aux, 0);
    assert.equal(veilEvade(g, g.player, "player"), 0);

    const again = g.scrap;
    installVeil(g);
    assert.equal(g.scrap, again);
    assert.equal(g.player.kits.veil, kit);

    arm(kit);
    startVeil(g);
    assert.equal(g.log[0], "Cloaking up.");
    assert.equal(kit.on, true);
    assert.equal(kit.left, 5);
    assert.equal(veilEvade(g, g.player, "player"), 60);
    assert.equal(veilBlocks(g, "enemy"), true);
    assert.equal(veilBlocks(g, "player"), false);

    tickVeil(g, 5);
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.cool, 20);
    assert.equal(veilEvade(g, g.player, "player"), 0);
    assert.equal(veilBlocks(g, "enemy"), false);

    startVeil(g);
    assert.equal(kit.on, false);
    tickVeil(g, 5);
    assert.equal(kit.cool, 15);
    tickVeil(g, 15);
    assert.equal(kit.cool, 0);
    startVeil(g);
    assert.equal(kit.on, true);
    assert.equal(kit.left, 5);
  });

  it("holds through a beam and drops on a laser unless quiet is fitted", () => {
    const { g, kit } = fit();
    arm(kit);
    startVeil(g);

    veilBrokenByFire(g, "player", "beam");
    assert.equal(kit.on, true);
    assert.equal(kit.left, 5);
    assert.equal(kit.cool, 0);
    assert.equal(veilEvade(g, g.player, "player"), 60);
    assert.equal(veilBlocks(g, "enemy"), true);

    veilBrokenByFire(g, "player", "laser");
    assert.equal(kit.on, true);
    assert.equal(kit.left, 4);
    assert.equal(kit.cool, 0);
    assert.equal(veilEvade(g, g.player, "player"), 60);

    veilBrokenByFire(g, "player", "laser");
    veilBrokenByFire(g, "player", "laser");
    veilBrokenByFire(g, "player", "laser");
    veilBrokenByFire(g, "player", "laser");
    assert.equal(kit.on, false);
    assert.equal(kit.left, 0);
    assert.equal(kit.cool, 20);
    assert.equal(veilEvade(g, g.player, "player"), 0);

    kit.cool = 0;
    startVeil(g);
    g.augments.push("quiet");
    veilBrokenByFire(g, "player", "laser");
    assert.equal(kit.on, true);
    assert.equal(kit.left, 5);
    assert.equal(veilEvade(g, g.player, "player"), 60);
    veilBrokenByFire(g, "player", "missile");
    assert.equal(kit.on, true);
  });

  it("refuses a short purse and will not start unpowered or early", () => {
    const g = createGame(1);
    g.scrap = 149;
    installVeil(g);
    assert.equal(g.player.kits.veil, undefined);
    assert.equal(g.scrap, 149);

    g.scrap = 150;
    installVeil(g);
    const kit = g.player.kits.veil;
    assert.ok(kit);
    assert.equal(g.scrap, 0);
    startVeil(g);
    assert.equal(kit.on, false);
    assert.equal(veilEvade(g, g.player, "player"), 0);
  });

  it("upgrades for 30 then 50 and stretches the window to 10 and 15", () => {
    const { g, kit } = fit(200);
    assert.equal(g.scrap, 50);
    upgradeVeil(g);
    assert.equal(g.scrap, 20);
    assert.equal(kit.level, 2);
    arm(kit);
    startVeil(g);
    assert.equal(kit.left, 10);
    tickVeil(g, 10);
    assert.equal(kit.cool, 20);
    assert.equal(kit.on, false);

    kit.cool = 0;
    g.scrap = 49;
    upgradeVeil(g);
    assert.equal(kit.level, 2);
    assert.equal(g.scrap, 49);
    g.scrap = 50;
    upgradeVeil(g);
    assert.equal(kit.level, 3);
    assert.equal(g.scrap, 0);
    upgradeVeil(g);
    assert.equal(kit.level, 3);
    startVeil(g);
    assert.equal(kit.left, 15);
    tickVeil(g, 14);
    assert.equal(kit.on, true);
    assert.equal(veilEvade(g, g.player, "player"), 60);
    tickVeil(g, 1);
    assert.equal(kit.on, false);
    assert.equal(kit.cool, 20);
  });

  it("spends one spare bar and refunds it", () => {
    const { g, kit } = fit();
    const before = sparePower(g.player);
    assert.ok(before >= 1);
    toggleVeilPower(g);
    assert.equal(kit.power, 1);
    assert.equal(sparePower(g.player), before - 1);
    toggleVeilPower(g);
    assert.equal(kit.power, 0);
    assert.equal(sparePower(g.player), before);
    kit.power = 1;
    assert.equal(sparePower(g.player), before - 1);
    toggleVeilPower(g);
    assert.equal(kit.power, 0);
    g.player.reactor = 0;
    toggleVeilPower(g);
    assert.equal(kit.power, 0);
  });

  it("is not up without power, time left, or a live level", () => {
    const { g, kit } = fit();
    arm(kit);
    startVeil(g);
    kit.power = 0;
    assert.equal(veilEvade(g, g.player, "player"), 0);
    assert.equal(veilBlocks(g, "enemy"), false);
    kit.power = 1;
    kit.left = 0;
    assert.equal(veilEvade(g, g.player, "player"), 0);
    kit.left = 5;
    kit.level = 0;
    assert.equal(veilEvade(g, g.player, "player"), 0);
    kit.level = 1;
    kit.on = false;
    assert.equal(veilEvade(g, g.player, "player"), 0);
  });

  it("raises the other hull after time is past 8, then blocks our guns", () => {
    const g = createGame(1);
    g.enemy = { ...g.player, name: "Picket", kits: {} };
    g.enemy.kits.veil = {
      id: "veil",
      level: 2,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    const ek = g.enemy.kits.veil;
    g.time = 0;
    tickVeil(g, 0);
    assert.equal(ek.on, true);
    assert.equal(ek.left, 10);
    assert.equal(veilEvade(g, g.enemy, "enemy"), 60);
    assert.equal(veilBlocks(g, "player"), true);
    assert.equal(veilBlocks(g, "enemy"), false);

    tickVeil(g, 3);
    assert.equal(ek.on, true);
    assert.equal(ek.left, 7);
    veilBrokenByFire(g, "enemy", "beam");
    assert.equal(ek.on, true);
    veilBrokenByFire(g, "enemy", "ion");
    assert.equal(ek.on, true);
    assert.equal(ek.left, 5);
    assert.equal(ek.cool, 0);

    ek.power = 0;
    ek.cool = 0;
    ek.on = false;
    g.time = 30;
    tickVeil(g, 1);
    assert.equal(ek.on, false);
  });
});
