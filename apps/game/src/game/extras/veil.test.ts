import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, fireReady, sparePower, startCombat } from "../sim.ts";
import type { Kit, WeaponInst } from "../types.ts";
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
  const kit = g.player.kits.cloaking;
  assert.ok(kit);
  return { g, kit };
}

function arm(kit: Kit) {
  kit.power = 1;
}

describe("cloaking", () => {
  it("pays 150, adds 60 evasion while up, blocks the shooter, then cools for 20", () => {
    const { g, kit } = fit();
    assert.equal(g.scrap, 250);
    assert.equal(g.log[0], "Cloaking fitted.");
    assert.equal(kit.id, "cloaking");
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
    assert.equal(g.player.kits.cloaking, kit);

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
    g.augments.push("CLOAK_FIRE");
    veilBrokenByFire(g, "player", "laser");
    assert.equal(kit.on, true);
    assert.equal(kit.left, 5);
    assert.equal(veilEvade(g, g.player, "player"), 60);
    veilBrokenByFire(g, "player", "missile");
    assert.equal(kit.on, true);
  });

  it("cuts once per Ion Charger and Charger Laser I shot, and once for any other volley", () => {
    // Cloaking, Overview: Ion Charger and Charger Laser I (Laser Charger, not Laser Charger (S)).
    // Laser Charger II cuts once after the volley. A beam is exempt. Stealth Weapons skips the cut.
    const cases: [string, Partial<WeaponInst>, number][] = [
      ["ION_CHARGEGUN", { loaded: 3, charge: 0 }, 6],
      ["LASER_CHARGEGUN", { loaded: 2, charge: 0 }, 9],
      ["LASER_CHARGEGUN_2", { loaded: 4, charge: 0 }, 12],
      ["LASER_CHARGEGUN_PLAYER", { loaded: 2, charge: 0 }, 12],
      ["LASER_BURST_2_A", { charge: 1 }, 12],
      ["BEAM_1", { charge: 1 }, 15],
    ];
    for (const [id, extra, left] of cases) {
      const g = createGame(1);
      startCombat(g, "scout");
      const room = g.enemy!.rooms[0]!.id;
      g.player.kits.cloaking = {
        id: "cloaking",
        level: 3,
        power: 3,
        left: 15,
        cool: 0,
        target: null,
        on: true,
        aux: 0,
      };
      g.player.weapons = [
        {
          uid: "w-" + id,
          defId: id,
          charge: 0,
          enabled: true,
          autofire: false,
          target: room,
          ...extra,
        },
      ];
      g.player.systems.weapons.level = 8;
      g.player.systems.weapons.power = 8;
      g.player.systems.weapons.damage = 0;
      g.player.systems.weapons.ion = [];
      g.autofireAll = false;
      fireReady(g);
      assert.ok(
        g.shots.some((s) => s.defId === id),
        id,
      );
      assert.equal(g.player.kits.cloaking.left, left, id);
      assert.equal(g.player.kits.cloaking.on, left > 0, id);
    }

    const quiet = createGame(2);
    startCombat(quiet, "scout");
    const room = quiet.enemy!.rooms[0]!.id;
    quiet.player.kits.cloaking = {
      id: "cloaking",
      level: 3,
      power: 3,
      left: 15,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    quiet.augments.push("CLOAK_FIRE");
    quiet.player.weapons = [
      {
        uid: "w-ion",
        defId: "ION_CHARGEGUN",
        charge: 0,
        loaded: 3,
        enabled: true,
        autofire: false,
        target: room,
      },
    ];
    quiet.player.systems.weapons.level = 8;
    quiet.player.systems.weapons.power = 8;
    quiet.player.systems.weapons.damage = 0;
    quiet.player.systems.weapons.ion = [];
    quiet.autofireAll = false;
    fireReady(quiet);
    assert.equal(quiet.shots.filter((s) => s.defId === "ION_CHARGEGUN").length, 3);
    assert.equal(quiet.player.kits.cloaking!.on, true);
    assert.equal(quiet.player.kits.cloaking!.left, 15);
  });

  it("refuses a short purse and will not start unpowered or early", () => {
    const g = createGame(1);
    g.scrap = 149;
    installVeil(g);
    assert.equal(g.player.kits.cloaking, undefined);
    assert.equal(g.scrap, 149);

    g.scrap = 150;
    installVeil(g);
    // Cast: the assert.equal(..., undefined) above narrows this path to undefined for TypeScript.
    const kit = g.player.kits.cloaking as Kit | undefined;
    assert.ok(kit);
    assert.equal(g.scrap, 0);
    startVeil(g);
    assert.equal(kit.on, false);
    assert.equal(veilEvade(g, g.player, "player"), 0);
  });

  it("runs 5 seconds per powered bar, and a removed bar shortens a running cloak", () => {
    const { g, kit } = fit(400);
    upgradeVeil(g);
    upgradeVeil(g);
    arm(kit);
    kit.power = 1;
    startVeil(g);
    assert.equal(kit.left, 5);
    assert.equal(kit.level, 3);
    kit.on = false;
    kit.left = 0;
    kit.cool = 0;
    kit.power = 3;
    startVeil(g);
    assert.equal(kit.left, 15);
    kit.power = 1;
    tickVeil(g, 0);
    assert.equal(kit.left, 5);
  });

  it("upgrades for 30 then 50 and stretches the window to 10 and 15", () => {
    const { g, kit } = fit(200);
    assert.equal(g.scrap, 50);
    upgradeVeil(g);
    assert.equal(g.scrap, 20);
    assert.equal(kit.level, 2);
    arm(kit);
    // Systems: the cloak runs 5 seconds per powered bar (veilSeconds), so both bars go on.
    kit.power = 2;
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
    kit.power = 3;
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
    g.enemy.kits.cloaking = {
      id: "cloaking",
      level: 2,
      // Enemy kits run at full power (sim enemy power-up); 5 seconds per powered bar.
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    const ek = g.enemy.kits.cloaking;
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
