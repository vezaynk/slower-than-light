import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImpact, createGame } from "../sim.ts";
import type { Shot } from "../types.ts";

function missileShot(partial: Partial<Shot> & Pick<Shot, "targetRoom">): Shot {
  return {
    id: "ms",
    kind: "missile",
    from: "enemy",
    damage: 1,
    ion: 0,
    fireChance: 0.3,
    breachChance: 0.56,
    wait: 0,
    t: 1,
    duration: 1,
    defId: "MISSILES_BREACH",
    ...partial,
  };
}

function quietRoom(seed: number): { g: ReturnType<typeof createGame>; roomId: string } {
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

describe("Missile fire or breach", () => {
  it("starts one or two fires and skips the breach when the fire roll hits", () => {
    let one = false;
    let two = false;
    for (let seed = 1; seed < 80 && !(one && two); seed++) {
      const { g, roomId } = quietRoom(seed);
      applyImpact(g, missileShot({ targetRoom: roomId, fireChance: 1, breachChance: 1 }));
      const room = g.player.rooms.find((item) => item.id === roomId);
      assert.ok(room);
      assert.equal(room.breach, 0);
      assert.ok(room.fire === 1 || room.fire === 2);
      if (room.fire === 1) one = true;
      if (room.fire === 2) two = true;
    }
    assert.equal(one, true);
    assert.equal(two, true);
  });

  it("breaches only after the fire roll fails", () => {
    const missed = quietRoom(1);
    applyImpact(
      missed.g,
      missileShot({ targetRoom: missed.roomId, fireChance: 0, breachChance: 1 }),
    );
    const open = missed.g.player.rooms.find((item) => item.id === missed.roomId);
    assert.equal(open?.fire, 0);
    assert.ok((open?.breach ?? 0) > 0);

    let started = false;
    let failed = false;
    for (let seed = 1; seed < 200 && !(started && failed); seed++) {
      const { g, roomId } = quietRoom(seed);
      applyImpact(g, missileShot({ targetRoom: roomId, fireChance: 0.3, breachChance: 1 }));
      const room = g.player.rooms.find((item) => item.id === roomId);
      assert.ok(room);
      if (room.fire > 0) {
        assert.equal(room.breach, 0);
        started = true;
      } else if (room.breach > 0) failed = true;
    }
    assert.equal(started, true);
    assert.equal(failed, true);
  });

  it("still lets an environmental missile breach without the weapon's fire gate", () => {
    const { g, roomId } = quietRoom(1);
    applyImpact(
      g,
      missileShot({
        targetRoom: roomId,
        from: "env",
        fireChance: 1,
        breachChance: 1,
        defId: undefined,
      }),
    );
    const room = g.player.rooms.find((item) => item.id === roomId);
    assert.ok((room?.fire ?? 0) > 0);
    assert.ok((room?.breach ?? 0) > 0);
  });
});
