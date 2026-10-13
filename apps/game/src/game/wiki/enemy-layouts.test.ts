import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollEnemy, type PoolContext } from "../enemy-gen.ts";
import { createGame, startCombat } from "../sim.ts";
import { ENEMY_LAYOUTS, enemyLayout } from "./enemy-layouts.ts";
import { ENEMY_CLASSES } from "./enemy-ships.ts";

const ctx: PoolContext = { sector: 1, sectorName: "Civilian (Starting) Sector", difficulty: "normal" };

function cls(id: string) {
  const found = ENEMY_CLASSES.find((row) => row.id === id);
  assert.ok(found, id);
  return found;
}

function at<R extends { x: number; y: number }>(rooms: R[], x: number, y: number): R | undefined {
  return rooms.find((room) => room.x === x && room.y === y);
}

describe("traced enemy interiors (ftl-layouts.mikehopley.org)", () => {
  it("seats the Rebel Fighter icons: pilot at the nose, teleporter behind it, weapons and shields at the back", () => {
    // Hard sector 8 fits every optional system (Medbay, Teleporter).
    const spec = rollEnemy(cls("rebel-fighter"), false, { ...ctx, sector: 8, difficulty: "hard" }, () => 0.5);
    assert.equal(spec.cols, 5);
    assert.equal(spec.rows, 7);
    assert.equal(at(spec.rooms, 2, 0)?.id, "e-pilot");
    assert.equal(at(spec.rooms, 1, 3)?.id, "e-medbay");
    assert.equal(at(spec.rooms, 3, 3)?.id, "e-oxygen");
    assert.equal(at(spec.rooms, 0, 5)?.id, "e-weapons");
    assert.equal(at(spec.rooms, 2, 5)?.id, "e-engines");
    assert.equal(at(spec.rooms, 3, 5)?.id, "e-shields");
    assert.equal(at(spec.rooms, 2, 2)?.id, "e-teleporter");
    assert.equal(spec.marks?.length, 8);
    // An optional system that does not roll leaves its room empty.
    const bare = rollEnemy(cls("rebel-fighter"), false, ctx, () => 0.99);
    assert.equal(at(bare.rooms, 2, 2)?.system, null);
    assert.equal(at(bare.rooms, 2, 2)?.kit, undefined);
  });

  it("links the fighter's teleporter to the pilot and the engines to the shields", () => {
    const g = createGame(1);
    startCombat(g, "Rebel Fighter");
    const enemy = g.enemy;
    assert.ok(enemy);
    const linked = (a: string, b: string) =>
      enemy.doors.some((door) => (door.a === a && door.b === b) || (door.a === b && door.b === a));
    const pilot = enemy.rooms.find((room) => room.system === "pilot")!;
    const pads = enemy.rooms.find((room) => room.x === 2 && room.y === 2)!;
    const engines = enemy.rooms.find((room) => room.system === "engines")!;
    const shields = enemy.rooms.find((room) => room.system === "shields")!;
    assert.equal(linked(pilot.id, pads.id), true);
    assert.equal(linked(engines.id, shields.id), true);
  });

  it("gives a pirate version its own interior when the picture differs", () => {
    const regular = enemyLayout("rebel-fighter", false)!;
    const pirate = enemyLayout("rebel-fighter", true)!;
    assert.notDeepEqual(pirate, regular);
    assert.equal(pirate.rooms.length, 10);
    assert.equal(pirate.rooms.find((room) => room.system === "doors")?.x, 0);
    // A pirate with the same interior falls back to the regular one.
    assert.ok(ENEMY_LAYOUTS["federation-scout"]);
    assert.equal(enemyLayout("federation-scout", true), ENEMY_LAYOUTS["federation-scout"]);
    const spec = rollEnemy(cls("rebel-fighter"), true, ctx, () => 0.99);
    assert.equal(spec.rooms.length, 10);
  });

  it("keeps the slug interceptor's five pictured rooms when doors stays off", () => {
    const spec = rollEnemy(cls("slug-interceptor"), false, ctx, () => 0.99);
    assert.equal(spec.cols, 4);
    assert.equal(spec.rows, 4);
    assert.equal(spec.rooms.length, 5);
    assert.equal(at(spec.rooms, 1, 0)?.id, "e-pilot");
    assert.equal(at(spec.rooms, 1, 1)?.id, "e-shields");
    assert.equal(at(spec.rooms, 2, 1)?.id, "e-weapons");
    assert.equal(at(spec.rooms, 0, 2)?.id, "e-oxygen");
    assert.equal(at(spec.rooms, 3, 2)?.id, "e-engines");
  });

  it("traces all 47 classes and gives every installed system its blueprint room", () => {
    for (const row of ENEMY_CLASSES) {
      for (const pirate of [false, true]) {
        const laid = enemyLayout(row.id, pirate);
        assert.ok(laid, row.id);
        const spec = rollEnemy(row, pirate, { ...ctx, sector: 8 }, () => 0);
        const ids = spec.rooms.map((room) => room.id);
        assert.equal(new Set(ids).size, ids.length, row.id);
        // Every system has a pictured room: no generated extra rooms past the traced grid.
        assert.equal(spec.rooms.length, laid.rooms.length, `${row.id}${pirate ? " pirate" : ""}`);
        for (const sys of Object.keys(spec.systems)) assert.ok(spec.rooms.some((room) => room.system === sys), `${row.id} ${sys}`);
        for (const kit of Object.keys(spec.kits)) assert.ok(spec.rooms.some((room) => room.kit === kit), `${row.id} ${kit}`);
        const floor = new Set<string>();
        for (const room of spec.rooms) {
          for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) floor.add(`${x},${y}`);
        }
        for (const mark of spec.marks ?? []) assert.ok(floor.has(`${mark.x},${mark.y}`), `${row.id} ${mark.x},${mark.y},${mark.side}`);
      }
    }
  });

  it("lets every crew member reach the teleporter on a ship that boards", () => {
    for (const row of ENEMY_CLASSES) {
      for (const pirate of [false, true]) {
        const laid = enemyLayout(row.id, pirate)!;
        const pads = laid.rooms.findIndex((room) => room.system === "teleporter");
        if (pads < 0) continue;
        const cell = new Map<string, number>();
        laid.rooms.forEach((room, i) => {
          for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) cell.set(`${x},${y}`, i);
        });
        const step = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as const;
        const links = laid.rooms.map(() => new Set<number>());
        for (const m of laid.marks) {
          const a = cell.get(`${m.x},${m.y}`)!;
          const b = cell.get(`${m.x + step[m.side][0]},${m.y + step[m.side][1]}`);
          if (b != null && b !== a) {
            links[a].add(b);
            links[b].add(a);
          }
        }
        const seen = new Set([pads]);
        const todo = [pads];
        while (todo.length) {
          for (const n of links[todo.pop()!]) {
            if (seen.has(n)) continue;
            seen.add(n);
            todo.push(n);
          }
        }
        const pilot = laid.rooms.findIndex((room) => room.system === "pilot");
        assert.ok(seen.has(pilot), `${row.id}${pirate ? " pirate" : ""}: the teleporter is walled off`);
      }
    }
  });
});
