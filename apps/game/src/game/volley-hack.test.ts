import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { weaponDef } from "@stl/pack";
import { createGame, powerMask, startCombat, step } from "./sim.ts";
import { hackHoldsWeapons } from "./extras/spike.ts";
import type { Kit } from "./types.ts";

/** The player's hacking pulse on the enemy's Weapons. */
function pulse(on: boolean): Kit {
  return {
    id: "hacking",
    level: 3,
    power: 3,
    left: on ? 30 : 0,
    cool: 0,
    target: "weapons",
    on,
    aux: 0,
  };
}

describe("hacking splits a volley (Hacking, Overview)", () => {
  it("holds the shots still waiting to leave, then fires them when the charge refills", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    const i = enemy.weapons.findIndex((_, n) => powerMask(enemy)[n]);
    assert.ok(i >= 0);
    const w = enemy.weapons[i]!;
    w.defId = "LASER_BURST_2";
    const def = weaponDef(w.defId);
    assert.ok(def && def.shots === 2 && def.gap > 0);
    assert.equal(powerMask(enemy)[i], true);
    for (const other of enemy.weapons) if (other !== w) other.charge = 0;
    w.charge = 1;
    g.shots = [];
    step(g, 0.01);
    const volley = g.shots.filter((s) => s.weapon === w.uid);
    assert.equal(volley.length, 2);

    // A two-shot burst, as in the wiki example: "Burst Laser I will shoot only 1 laser on the hack start and another one - after the hack, upon charge completion".
    g.player.kits.hacking = pulse(true);
    assert.equal(hackHoldsWeapons(g, "enemy"), true);
    step(g, 0.01);
    assert.equal(w.held?.length, 1);
    assert.equal(g.shots.filter((s) => s.weapon === w.uid && s.wait > 0).length, 0);

    g.player.kits.hacking = pulse(false);
    w.charge = 0.999;
    step(g, 0.05);
    assert.equal(w.held, undefined);
    assert.equal(w.charge, 0);
    assert.equal(g.shots.filter((s) => s.id === volley[1]!.id).length, 1);
  });
});
