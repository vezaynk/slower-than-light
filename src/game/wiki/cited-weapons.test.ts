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
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "smallbomb", damage: 2 }), 2), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "breach1", damage: 1 }), 1), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "breach2", damage: 3 }), 3), 45);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "cask", damage: 0 }), 0), 30);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "ionbomb", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "stunbomb", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "healburst", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "repairburst", damage: 0 }), 0), 0);
    assert.equal(citedCrewDamage(shot({ kind: "bomb", defId: "lockdown", damage: 0 }), 0), 0);
  });

  it("returns null for a normal laser", () => {
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "lineburst", damage: 1 }), 1), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "heavy", damage: 2 }), 2), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "heavypierce", damage: 2 }), 2), null);
    assert.equal(citedCrewDamage(shot({ kind: "laser", damage: 1 }), 1), null);
  });

  it("returns printed beam HP, including the fitted Pike id, and not a dash", () => {
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "mini", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "pike", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "shear", damage: 1 }), 1), 15);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "halberd", damage: 2 }), 2), 30);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "glaive", damage: 3 }), 3), 45);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "antibio", damage: 0 }), 0), 60);
    assert.equal(citedCrewDamage(shot({ kind: "beam", defId: "firebeam", damage: 0 }), 0), null);
  });

  it("does not invent crew damage for crystal, chain ion, or flak", () => {
    assert.equal(citedCrewDamage(shot({ kind: "laser", defId: "crystalburst", damage: 1 }), 1), null);
    assert.equal(citedCrewDamage(shot({ kind: "ion", defId: "chainion", damage: 0 }), 0), null);
    assert.equal(citedCrewDamage(shot({ kind: "ion", defId: "bossion", damage: 0 }), 0), null);
    assert.equal(citedCrewDamage(shot({ kind: "flak", defId: "flak2", damage: 1 }), 1), null);
  });
});
