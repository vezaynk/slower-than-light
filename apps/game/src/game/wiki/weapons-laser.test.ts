import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame } from "../sim.ts";
import type { Game, Shot } from "../types.ts";

function laserShot(partial: Partial<Shot> & Pick<Shot, "targetRoom">): Shot {
  return {
    id: "hl",
    kind: "laser",
    from: "enemy",
    damage: 2,
    ion: 0,
    fireChance: 0.3,
    breachChance: 0.3,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function bare(seed = 1): { g: Game; roomId: string } {
  const g = createGame(seed);
  g.player.systems.engines.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = 0;
  g.augments = g.augments.filter((id) => id !== "ROCK_ARMOR" && id !== "SYSTEM_CASING");
  const room = g.player.rooms.find((item) => item.system);
  if (!room) throw new Error("no system room");
  room.fire = 0;
  room.breach = 0;
  return { g, roomId: room.id };
}

function marks(g: Game, roomId: string): { fire: number; breach: number } {
  const room = g.player.rooms.find((item) => item.id === roomId);
  if (!room) throw new Error("room gone");
  return { fire: room.fire, breach: room.breach };
}

describe("Heavy Laser fire then breach", () => {
  it("skips the breach roll when the fire roll starts a fire", () => {
    for (const defId of ["LASER_HEAVY_1", "LASER_HEAVY_2", "LASER_HEAVY_1_SP"]) {
      const { g, roomId } = bare();
      applyImpact(g, laserShot({ defId, targetRoom: roomId, fireChance: 1, breachChance: 1 }));
      const hit = marks(g, roomId);
      assert.ok(hit.fire > 0, defId);
      assert.equal(hit.breach, 0, defId);
    }
  });

  it("still breaches when the fire roll starts nothing", () => {
    const { g, roomId } = bare();
    applyImpact(
      g,
      laserShot({ defId: "LASER_HEAVY_1", targetRoom: roomId, fireChance: 0, breachChance: 1 }),
    );
    const hit = marks(g, roomId);
    assert.equal(hit.fire, 0);
    assert.ok(hit.breach > 0);

    let started = false;
    let missed = false;
    for (let seed = 1; seed < 400 && !(started && missed); seed++) {
      const trial = bare();
      trial.g.seed = seed;
      applyImpact(
        trial.g,
        laserShot({
          defId: "LASER_HEAVY_1",
          targetRoom: trial.roomId,
          fireChance: 0.3,
          breachChance: 0.3,
        }),
      );
      const next = marks(trial.g, trial.roomId);
      if (next.fire > 0) {
        assert.equal(next.breach, 0);
        started = true;
      } else if (next.breach > 0) missed = true;
    }
    assert.equal(started, true);
    assert.equal(missed, true);
  });

  it("still rolls both effects on a shot that is not a Heavy Laser", () => {
    const { g, roomId } = bare();
    applyImpact(
      g,
      laserShot({ defId: "burst2", targetRoom: roomId, fireChance: 1, breachChance: 1 }),
    );
    const hit = marks(g, roomId);
    assert.ok(hit.fire > 0);
    assert.ok(hit.breach > 0);

    const surge = bare();
    applyImpact(
      surge.g,
      laserShot({ targetRoom: surge.roomId, fireChance: 1, breachChance: 1, label: "Surge" }),
    );
    const surgeHit = marks(surge.g, surge.roomId);
    assert.ok(surgeHit.fire > 0);
    assert.ok(surgeHit.breach > 0);
  });
});
