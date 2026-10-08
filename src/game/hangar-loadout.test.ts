import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HULLS } from "./hulls.ts";
import { createGame, hangarLoadout } from "./sim.ts";

const picks = [
  { name: "Ada", uniform: 1 },
  { name: "Ivo", uniform: 2 },
];

describe("hangar loadout", () => {
  it("matches the rooms, weapons, doors, and crew a run starts with", () => {
    for (const spec of HULLS) {
      const preview = hangarLoadout(spec.id, picks);
      const run = createGame(3, spec.id, "normal", picks);
      assert.equal(preview.ship.cols, run.player.cols, spec.id);
      assert.equal(preview.ship.rows, run.player.rows, spec.id);
      assert.deepEqual(
        preview.ship.rooms.map((room) => `${room.id}:${room.x},${room.y},${room.w},${room.h}`),
        run.player.rooms.map((room) => `${room.id}:${room.x},${room.y},${room.w},${room.h}`),
        spec.id,
      );
      assert.deepEqual(
        preview.ship.weapons.map((w) => w.defId),
        run.player.weapons.map((w) => w.defId),
        spec.id,
      );
      assert.deepEqual(
        preview.ship.doors.map((d) => `${d.a}|${d.b}|${d.open}`),
        run.player.doors.map((d) => `${d.a}|${d.b}|${d.open}`),
        spec.id,
      );
      assert.deepEqual(
        preview.crew.map((c) => `${c.name}|${c.kin}|${c.room}|${c.uniform}`),
        run.crew.filter((c) => c.side === "player").map((c) => `${c.name}|${c.kin}|${c.room}|${c.uniform}`),
        spec.id,
      );
    }
  });
});
