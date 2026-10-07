import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollEnemy, type PoolContext } from "../enemy-gen.ts";
import { createGame, startCombat } from "../sim.ts";
import { ENEMY_LAYOUTS } from "./enemy-layouts.ts";
import { ENEMY_CLASSES } from "./enemy-ships.ts";

const ctx: PoolContext = { sector: 1, sectorName: "Civilian (Starting) Sector", difficulty: "normal" };

function cls(id: string) {
  const found = ENEMY_CLASSES.find((row) => row.id === id);
  assert.ok(found, id);
  return found;
}

function at(rooms: { x: number; y: number; id: string }[], x: number, y: number) {
  return rooms.find((room) => room.x === x && room.y === y);
}

describe("traced enemy interiors", () => {
  it("seats the Rebel Fighter icons and gives the unlabeled doors room to the teleporter", () => {
    const spec = rollEnemy(cls("rebel-fighter"), false, ctx, () => 0);
    assert.equal(spec.cols, 5);
    assert.equal(spec.rows, 7);
    assert.equal(spec.rooms.length, 7);
    assert.equal(at(spec.rooms, 2, 0)?.id, "e-shields");
    assert.equal(spec.rooms.find((room) => room.id === "e-shields")?.h, 2);
    assert.equal(at(spec.rooms, 2, 2)?.id, "e-weapons");
    assert.equal(at(spec.rooms, 1, 3)?.id, "e-medbay");
    assert.equal(at(spec.rooms, 3, 3)?.id, "e-oxygen");
    assert.equal(at(spec.rooms, 2, 5)?.id, "e-engines");
    assert.equal(at(spec.rooms, 3, 5)?.id, "e-pilot");
    assert.equal(at(spec.rooms, 0, 5)?.id, "e-teleporter");
    assert.equal(spec.rooms.find((room) => room.id === "e-teleporter")?.w, 2);
    assert.equal(spec.rooms.some((room) => room.id === "e-doors"), false);
    assert.equal(spec.marks?.length, 21);
    // The upper shared edge is a black wall. The lower edge is the orange bar.
    assert.equal(spec.marks?.some((mark) => mark.x === 2 && mark.y === 5 && mark.side === "e"), false);
    assert.equal(spec.marks?.some((mark) => mark.x === 2 && mark.y === 6 && mark.side === "e"), true);
  });

  it("links the fighter engines and pilot through the lower orange bar", () => {
    const g = createGame(1);
    startCombat(g, "Rebel Fighter");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(enemy.doorMarks?.length, 21);
    const engines = enemy.rooms.find((room) => room.system === "engines");
    const pilot = enemy.rooms.find((room) => room.system === "pilot");
    assert.ok(engines && pilot);
    const linked = enemy.doors.some(
      (door) =>
        (door.a === engines.id && door.b === pilot.id) || (door.a === pilot.id && door.b === engines.id),
    );
    assert.equal(linked, true);
  });

  it("reads Rebel Invader icons from that screenshot, not the fighter's", () => {
    const spec = rollEnemy(cls("rebel-invader"), false, ctx, () => 0);
    assert.equal(at(spec.rooms, 1, 3)?.id, "e-oxygen");
    assert.equal(at(spec.rooms, 0, 5)?.id, "e-pilot");
    assert.equal(at(spec.rooms, 2, 5)?.id, "e-engines");
    assert.notEqual(at(spec.rooms, 2, 2)?.id, "e-weapons");
    assert.equal(spec.rooms.some((room) => room.id === "e-doors"), false);
    const mid = ENEMY_LAYOUTS["elite-fighter"].rooms.find((room) => room.x === 2 && room.y === 2);
    assert.equal(mid?.system, null);
    assert.equal(ENEMY_LAYOUTS["elite-fighter"].rooms.find((room) => room.x === 2 && room.y === 0)?.system, "shields");
  });

  it("keeps the slug interceptor's five pictured rooms when doors stays off", () => {
    const spec = rollEnemy(cls("slug-interceptor"), false, ctx, () => 0.99);
    assert.equal(spec.cols, 4);
    assert.equal(spec.rows, 4);
    assert.equal(spec.rooms.length, 5);
    assert.equal(at(spec.rooms, 1, 0)?.id, "e-shields");
    assert.equal(at(spec.rooms, 1, 1)?.id, "e-pilot");
    assert.equal(at(spec.rooms, 2, 1)?.id, "e-weapons");
    assert.equal(at(spec.rooms, 0, 2)?.id, "e-oxygen");
    assert.equal(at(spec.rooms, 3, 2)?.id, "e-engines");
  });

  it("gives every installed system a room and keeps every bar on a floor cell", () => {
    for (const row of ENEMY_CLASSES) {
      const spec = rollEnemy(row, false, ctx, () => 0);
      const ids = spec.rooms.map((room) => room.id);
      assert.equal(new Set(ids).size, ids.length, row.id);
      for (const sys of Object.keys(spec.systems)) {
        assert.ok(
          spec.rooms.some((room) => room.system === sys),
          `${row.id} ${sys}`,
        );
      }
      for (const kit of Object.keys(spec.kits)) {
        assert.ok(
          spec.rooms.some((room) => room.kit === kit),
          `${row.id} ${kit}`,
        );
      }
      for (const unwired of spec.unwired) {
        assert.ok(
          spec.rooms.some((room) => room.id === `e-${unwired.id}`),
          `${row.id} ${unwired.id}`,
        );
      }
      if (!spec.marks) {
        assert.ok(row.id === "engi-hacker" || row.id === "crystal-outrider", row.id);
        assert.equal(spec.rows, 2, row.id);
        assert.ok(spec.rooms.every((room) => room.h === 1), row.id);
        continue;
      }
      const floor = new Set<string>();
      for (const room of spec.rooms) {
        const skip = new Set((room.omit ?? []).map((cell) => `${cell.x},${cell.y}`));
        for (let y = room.y; y < room.y + room.h; y++) {
          for (let x = room.x; x < room.x + room.w; x++) {
            if (!skip.has(`${x},${y}`)) floor.add(`${x},${y}`);
          }
        }
      }
      for (const mark of spec.marks) {
        assert.ok(floor.has(`${mark.x},${mark.y}`), `${row.id} ${mark.x},${mark.y},${mark.side}`);
        assert.ok(mark.x >= 0 && mark.y >= 0 && mark.x < spec.cols && mark.y < spec.rows, row.id);
      }
    }
    assert.equal(Object.keys(ENEMY_LAYOUTS).length, 45);
    assert.equal(ENEMY_LAYOUTS["engi-hacker"], undefined);
    assert.equal(ENEMY_LAYOUTS["crystal-outrider"], undefined);
  });

  it("leaves Engi Hacker on the generated strip", () => {
    const g = createGame(1);
    startCombat(g, "Engi Hacker");
    const enemy = g.enemy;
    assert.ok(enemy);
    assert.equal(enemy.doorMarks, undefined);
    assert.equal(enemy.rows, 2);
    assert.ok(enemy.rooms.every((room) => room.h === 1));
  });
});
