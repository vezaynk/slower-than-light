import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { weaponDef } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { freshGame, installArchive } from "./archive-play.ts";
import { applyImpact, evasionPercent } from "./sim.ts";
import { asbPierce } from "./wiki/cited-sectors.ts";
import type { Shot } from "./types.ts";

const dat = process.env.FTL_DAT?.trim();

/** One shot of `id` at `room`, with no fire, breach, or stun roll. */
function shotOf(id: string, room: string): Shot {
  const def = weaponDef(id);
  assert.ok(def, `${id} is in the archive`);
  return {
    id: "t",
    kind: def.kind,
    from: "enemy",
    defId: id,
    damage: def.damage,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: room,
    wait: 0,
    t: 1,
    duration: 1,
  };
}

/** Layers up after the shot, and hull lost. Evasion and the Zoltan Shield are pinned to 0. */
function fire(
  id: string,
  layers: number,
  patch: Partial<Shot> = {},
): { shieldNow: number; lost: number } {
  const g = freshGame();
  g.player.systems.engines.power = 0;
  g.player.zoltan = 0;
  assert.equal(evasionPercent(g, g.player, "player"), 0);
  g.player.shieldNow = layers;
  const before = g.player.hull;
  // A hit on the Shields room would cut the bubble by system damage, so aim at a room without systems.
  const room = g.player.rooms.find((row) => !row.system && !row.kit);
  assert.ok(room, "a room without systems");
  applyImpact(g, { ...shotOf(id, room.id), ...patch });
  return { shieldNow: g.player.shieldNow, lost: before - g.player.hull };
}

/**
 * `<sp>` from the archive decides the bubble: a shot passes when the layers up are at most its sp.
 * Six layers is above a missile's 5, so a missile is not let through for being a missile.
 */
function checkPierce(): void {
  const cases: Array<[id: string, sp: number]> = [
    ["MISSILES_2", 5],
    ["CRYSTAL_BURST_1", 1],
    ["LASER_HEAVY_1_SP", 1],
    ["LASER_BURST_1", 0],
  ];
  for (const [id, sp] of cases) {
    assert.equal(weaponDef(id)?.pierce ?? 0, sp, `${id} <sp>`);
    const damage = weaponDef(id)!.damage;
    for (const layers of [1, 2, 3, 6]) {
      const out = fire(id, layers);
      if (layers <= sp) {
        assert.deepEqual(out, { shieldNow: layers, lost: damage }, `${id} through ${layers}`);
      } else {
        assert.deepEqual(out, { shieldNow: layers - 1, lost: 0 }, `${id} stopped by ${layers}`);
      }
    }
  }
}

describe("shield pierce on the stand-in", () => {
  it("passes a missile through 3 layers, a crystal burst and heavy pierce through 1, a laser through none", () => {
    checkPierce();
  });

  it("stops a crystal burst at two layers and lets it through one", () => {
    // ftl.dat types the crystal guns MISSILES with no <missiles> and <sp>1. Kind must not let them through.
    const def = weaponDef("CRYSTAL_BURST_1");
    assert.ok(def);
    assert.equal(def.kind, "missile");
    assert.equal(def.ammo, false);
    assert.equal(def.pierce, 1);
    assert.deepEqual(fire("CRYSTAL_BURST_1", 1), { shieldNow: 1, lost: def.damage });
    assert.deepEqual(fire("CRYSTAL_BURST_1", 2), { shieldNow: 1, lost: 0 });
  });

  it("passes the anti-ship battery through PDS_SHOT's <sp> layers and stops it above", () => {
    assert.equal(asbPierce(), 5);
    const battery: Partial<Shot> = { kind: "missile", from: "env", defId: undefined, damage: 3 };
    assert.deepEqual(fire("PDS_SHOT", 5, battery), { shieldNow: 5, lost: 3 });
    assert.deepEqual(fire("PDS_SHOT", 6, battery), { shieldNow: 5, lost: 0 });
  });

  it("leaves the layers up under a fake flak pellet", () => {
    const g = freshGame();
    g.player.systems.engines.power = 0;
    g.player.shieldNow = 2;
    applyImpact(g, { ...shotOf("SHOTGUN", g.player.rooms[0]!.id), damage: 0, label: "fake-flak" });
    assert.equal(g.player.shieldNow, 2);
  });
});

describe(
  "shield pierce on ftl.dat",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 120_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("passes a missile through 3 layers, a crystal burst and heavy pierce through 1, a laser through none", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      assert.equal(weaponDef("CRYSTAL_BURST_1")?.kind, "missile");
      checkPierce();
      assert.equal(asbPierce(), 5);
    });
  },
);
