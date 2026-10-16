import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claimPadTile } from "./crew-spots.ts";
import { installSling, sendSling } from "./extras/sling.ts";
import { createGame, kitPowerDown, kitPowerUp, setKitBars, sparePower } from "./sim.ts";
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
