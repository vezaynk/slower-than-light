import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claimPadTile } from "./crew-spots.ts";
import { startLeash, tickLeash } from "./extras/leash.ts";
import { installSling, sendSling } from "./extras/sling.ts";
import { installVeil, startVeil, tickVeil } from "./extras/veil.ts";
import {
  createGame,
  kitPowerDown,
  kitPowerUp,
  setKitBars,
  sparePower,
  startCombat,
} from "./sim.ts";
import type { Game, Ship } from "./types.ts";

// Systems, "Powering and upgrading systems": "Pressing the key powers one bar of the system and Shift-<key> unpowers
// one bar." Per the user, Cloaking, the Crew Teleporter and Mind Control power the same way.
describe("bar-by-bar power for Cloaking, the Crew Teleporter and Mind Control", () => {
  it("adds and removes one reactor bar at a time, up to the undamaged level", () => {
    const g = createGame(1);
    g.scrap = 400;
    installSling(g);
    const kit = g.player.kits.teleporter!;
    kit.level = 3;
    kit.power = 0;
    const spare = sparePower(g.player);
    assert.equal(kitPowerUp(g, "teleporter"), true);
    assert.equal(kit.power, 1);
    assert.equal(sparePower(g.player), spare - 1);
    setKitBars(g, "teleporter", 3);
    assert.equal(kit.power, Math.min(3, spare));
    kit.damage = 1;
    setKitBars(g, "teleporter", 0);
    setKitBars(g, "teleporter", 3);
    assert.ok(kit.power <= 2);
    assert.equal(kitPowerDown(g, "teleporter"), true);
    kit.cool = 5;
    assert.equal(kitPowerDown(g, "teleporter"), false);
  });

  it("reserves cloak power from activation until the cooldown ends", () => {
    // Cloaking: duration changes by Zoltan power, not by the reactor button.
    // Backup Battery: reactor power stays locked for the whole cooldown.
    const g = createGame(2);
    g.scrap = 200;
    installVeil(g);
    const kit = g.player.kits.cloaking!;
    kit.level = 2;
    kit.power = 1;
    assert.equal(kitPowerDown(g, "cloaking"), true);
    kit.power = 1;
    startVeil(g);
    assert.equal(kit.on, true);
    assert.equal(kit.cool, 0);
    assert.equal(kit.left, 5);
    assert.equal(kitPowerDown(g, "cloaking"), false);
    assert.equal(kitPowerUp(g, "cloaking"), false);
    assert.equal(kit.power, 1);
    tickVeil(g, 5);
    assert.equal(kit.on, false);
    assert.equal(kit.cool, 20);
    assert.equal(kitPowerDown(g, "cloaking"), false);
    tickVeil(g, 20);
    assert.equal(kit.cool, 0);
    assert.equal(kitPowerDown(g, "cloaking"), true);
    assert.equal(kit.power, 0);
  });

  it("reserves mind-control power through the hold and the cooldown after it", () => {
    const g = createGame(3);
    startCombat(g, "Rebel ship");
    g.player.systems.sensors.level = 2;
    g.player.kits.mind = {
      id: "mind",
      level: 2,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    const pilot = g.crew.find((c) => c.side === "enemy" && c.room === "e-pilot");
    assert.ok(pilot);
    startLeash(g, pilot.id);
    const kit = g.player.kits.mind!;
    assert.equal(kit.on, true);
    assert.equal(kit.cool, 0);
    assert.equal(kitPowerDown(g, "mind"), false);
    assert.equal(kitPowerUp(g, "mind"), false);
    assert.equal(kit.power, 1);
    tickLeash(g, kit.left);
    assert.equal(kit.on, false);
    assert.ok(kit.cool > 0);
    assert.equal(kitPowerDown(g, "mind"), false);
    tickLeash(g, kit.cool);
    assert.equal(kit.cool, 0);
    assert.equal(kitPowerDown(g, "mind"), true);
  });

  it("runs the Teleporter on one bar and cools it for the powered level", () => {
    const g = createGame(1);
    g.scrap = 400;
    installSling(g);
    const kit = g.player.kits.teleporter!;
    kit.level = 3;
    kit.power = 1;
    g.phase = "combat";
    g.enemy = { rooms: [{ id: "e-weapons", title: "Weapons" }] } as unknown as Ship;
    padUp(g);
    sendSling(g, "e-weapons");
    // Crew Teleporter, "System Upgrades": 20 seconds at level 1.
    assert.equal(kit.cool, 20);
  });
});

function padUp(g: Game) {
  const pad = g.player.rooms.find((r) => r.kit === "teleporter")!;
  const c = g.crew.find((x) => x.side === "player")!;
  c.room = pad.id;
  c.path = [];
  c.pad = claimPadTile(pad, new Set()) ?? undefined;
}
