import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Shot } from "../types.ts";
import { citedCrewDamage } from "./cited-weapons.ts";

function shot(partial: Partial<Shot> & Pick<Shot, "kind">): Shot {
  return {
    id: "s",
    from: "player",
    damage: 1,
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: "r",
    wait: 0,
    t: 0,
    duration: 1,
    ...partial,
  };
}

describe("citedCrewDamage", () => {
  it("returns the crew figure a bomb page states", () => {
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_1", damage: 2 }), 2), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_BREACH_1", damage: 1 }), 1), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_BREACH_2", damage: 3 }), 3), 45);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_FIRE", damage: 0 }), 0), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_ION", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_STUN", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_HEAL", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_HEAL_SYSTEM", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "BOMB_LOCK", damage: 0 }), 0), 0);
  });

  it("returns null for a normal laser", () => {
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "LASER_BURST_3", damage: 1 }), 1), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "LASER_HEAVY_1", damage: 2 }), 2), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "LASER_HEAVY_1_SP", damage: 2 }), 2), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", damage: 1 }), 1), null);
  });

  it("returns printed beam HP, including the fitted Pike id, and not a dash", () => {
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_1", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_LONG", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_LONG", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_2", damage: 2 }), 2), 30);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_3", damage: 3 }), 3), 45);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_BIO", damage: 0 }), 0), 60);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "BEAM_FIRE", damage: 0 }), 0), null);
  });

  it("does not invent crew damage for crystal, chain ion, or flak", () => {
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "CRYSTAL_BURST_1", damage: 1 }), 1), null);
    assert.equal(citedCrewDamage(shot({ kind: "ion", defId: "ION_CHAINGUN", damage: 0 }), 0), null);
    assert.equal(citedCrewDamage(shot({ kind: "ion", defId: "ARTILLERY_BOSS_4", damage: 0 }), 0), null);
    assert.equal(citedCrewDamage(shot({ kind: "flak", defId: "SHOTGUN_2", damage: 1 }), 1), null);
  });
});
