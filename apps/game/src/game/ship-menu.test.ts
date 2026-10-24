import type { Game } from "./types.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { upgradeCost } from "./content.ts";
import { cellUpgradeCost } from "./extras/cell.ts";
import { cradleUpgradeCost, installCradle, upgradeCradle } from "./extras/cradle.ts";
import { armFlak, upgradeFlak } from "./extras/flakart.ts";
import { installLance, upgradeLance } from "./extras/lance.ts";
import { UPGRADE_COST as LEASH_UPGRADE } from "./extras/leash.ts";
import { slingUpgradeCost } from "./extras/sling.ts";
import { installSpike, spikeUpgradeCost, upgradeSpike } from "./extras/spike.ts";
import { veilUpgradeCost } from "./extras/veil.ts";
import { createGame, openShipMenu, startCombat, upgrade } from "./sim.ts";

describe("ship menu upgrades", () => {
  it("prices a sensors upgrade at 25, then 40, and does not sell level 4", () => {
    // Wiki citations:
    // > "2 25 Ftlgame-scrap.png See interior of all rooms on your and enemy ship" — [[Sensors#System Upgrades]]
    // > "3 40 Ftlgame-scrap.png See interior of all rooms on your and enemy ship, see enemy weapons charge" — [[Sensors#System Upgrades]]
    // > "4 N/A* (Additionally) See enemy systems level, power usage, ion damage, cooldown, repair and sabotage progress" — [[Sensors#System Upgrades]]
    // > "Only available when Level 3 Sensors subsystem is manned." — [[Sensors#System Upgrades]]
    assert.equal(upgradeCost("sensors", 1), 25);
    assert.equal(upgradeCost("sensors", 2), 40);
    assert.equal(upgradeCost("sensors", 3), null);
    const g = createGame(1);
    g.player.systems.sensors.level = 1;
    g.scrap = 25;
    upgrade(g, "sensors");
    assert.equal(g.player.systems.sensors.level, 2);
    assert.equal(g.scrap, 0);
  });

  it("does not sell a missing door system from the upgrade path", () => {
    // Wiki citations:
    // > "1 60* Ftlgame-scrap.png Normal Doors Remote opening/closing of doors" — [[Door System#System Upgrades]]
    // > "Only the Rock Cruiser layout B (Shivan) does not have the Door System pre-installed." — [[Door System#System Upgrades]]
    const g = createGame(1);
    g.player.systems.doors.level = 0;
    g.scrap = 60;
    upgrade(g, "doors");
    assert.equal(g.player.systems.doors.level, 0);
    assert.equal(g.scrap, 60);
  });

  it("charges the printed hacking, clone, artillery, and flak steps", () => {
    // Wiki citations:
    // > "2 35 Ftlgame-scrap.png 7 sec" — [[Hacking#System upgrades]]
    // > "3 60 Ftlgame-scrap.png 10 sec" — [[Hacking#System upgrades]]
    // > "1 80 Ftlgame-scrap.png 4 sec" — [[Hacking#System upgrades]]
    // > "2 35 Ftlgame-scrap.png 9 sec" — [[Clone Bay#System Upgrades]]
    // > "3 45 Ftlgame-scrap.png 7 sec" — [[Clone Bay#System Upgrades]]
    // > "1 50** Ftlgame-scrap.png 12 sec" — [[Clone Bay#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png 10 sec" — [[Cloaking#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png 15 sec" — [[Cloaking#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png 15 sec" — [[Crew Teleporter#System Upgrades]]
    // > "3 60 Ftlgame-scrap.png 10 sec" — [[Crew Teleporter#System Upgrades]]
    // > "2 50 Ftlgame-scrap.png 4 temporary power bars" — [[Backup Battery#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png +15 Health, +25% combat damage boost" — [[Mind Control#System Upgrades]]
    // > "3 60 Ftlgame-scrap.png +30 Health, +100% combat damage boost" — [[Mind Control#System Upgrades]]
    // > "Level Cost Charge time 1 - 50 sec" — [[Artillery Beam#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png 40 sec" — [[Artillery Beam#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png 30 sec" — [[Artillery Beam#System Upgrades]]
    // > "4 80 Ftlgame-scrap.png 20 sec" — [[Artillery Beam#System Upgrades]]
    // > "Level Cost Charge time 1 - 50 sec" — [[Flak Artillery#System Upgrades]]
    // > "2 30 Ftlgame-scrap.png 40 sec" — [[Flak Artillery#System Upgrades]]
    // > "3 50 Ftlgame-scrap.png 30 sec" — [[Flak Artillery#System Upgrades]]
    // > "4 80 Ftlgame-scrap.png 20 sec" — [[Flak Artillery#System Upgrades]]
    assert.deepEqual(
      [spikeUpgradeCost(1), spikeUpgradeCost(2), spikeUpgradeCost(3)],
      [35, 60, null],
    );
    assert.deepEqual(
      [cradleUpgradeCost(1), cradleUpgradeCost(2), cradleUpgradeCost(3)],
      [35, 45, null],
    );
    assert.deepEqual([veilUpgradeCost(1), veilUpgradeCost(2), veilUpgradeCost(3)], [30, 50, null]);
    assert.deepEqual(
      [slingUpgradeCost(1), slingUpgradeCost(2), slingUpgradeCost(3)],
      [30, 60, null],
    );
    assert.equal(cellUpgradeCost(1), 50);
    assert.equal(cellUpgradeCost(2), null);
    assert.equal(LEASH_UPGRADE[2], 30);
    assert.equal(LEASH_UPGRADE[3], 60);

    const hack = createGame(2);
    hack.scrap = 80;
    assert.equal(installSpike(hack), true);
    hack.scrap = 34;
    assert.equal(upgradeSpike(hack), false);
    hack.scrap = 35;
    assert.equal(upgradeSpike(hack), true);
    assert.equal(hack.player.kits.hacking?.level, 2);
    hack.scrap = 60;
    assert.equal(upgradeSpike(hack), true);
    assert.equal(hack.player.kits.hacking?.level, 3);

    const bay = createGame(3);
    bay.scrap = 50;
    installCradle(bay);
    bay.scrap = 35;
    upgradeCradle(bay);
    assert.equal(bay.player.kits.clonebay?.level, 2);
    assert.equal(bay.scrap, 0);
    bay.scrap = 45;
    upgradeCradle(bay);
    assert.equal(bay.player.kits.clonebay?.level, 3);
    assert.equal(bay.scrap, 0);

    // Artillery Beam, "Overview": only Federation A and B carry it.
    const lance = createGame(4, "PLAYER_SHIP_FED");
    delete lance.player.kits.artillery;
    assert.equal(installLance(lance), true);
    lance.scrap = 30;
    assert.equal(upgradeLance(lance), true);
    lance.scrap = 50;
    assert.equal(upgradeLance(lance), true);
    lance.scrap = 80;
    assert.equal(upgradeLance(lance), true);
    assert.equal((lance.player.kits as Game["player"]["kits"]).artillery?.level, 4);
    lance.scrap = 80;
    assert.equal(upgradeLance(lance), false);

    const flak = createGame(5);
    armFlak(flak, 1);
    flak.scrap = 30;
    assert.equal(upgradeFlak(flak), true);
    flak.scrap = 50;
    assert.equal(upgradeFlak(flak), true);
    flak.scrap = 80;
    assert.equal(upgradeFlak(flak), true);
    assert.equal(flak.player.kits.artillery?.level, 4);
    assert.equal(upgradeFlak(flak), false);
  });

  it("opens Upgrades, Crew, and Inventory, and stays shut in a fight or on the title", () => {
    const g = createGame(6);
    openShipMenu(g, "upgrades");
    assert.equal(g.shipSheet, true);
    assert.equal(g.shipTab, "upgrades");
    openShipMenu(g, "inventory");
    assert.equal(g.shipSheet, true);
    assert.equal(g.shipTab, "inventory");
    openShipMenu(g, "inventory");
    assert.equal(g.shipSheet, false);

    openShipMenu(g, "crew");
    startCombat(g, "scout");
    assert.equal(g.shipSheet, false);
    openShipMenu(g, "upgrades");
    assert.equal(g.shipSheet, false);

    g.phase = "title";
    g.shipSheet = false;
    openShipMenu(g, "crew");
    assert.equal(g.shipSheet, false);
  });
});
