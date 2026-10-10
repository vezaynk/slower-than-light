import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { restSpot } from "./crew-spots.ts";
import { createGame, orderCrew, step } from "./sim.ts";
import { arriveMove, hopLanding, hopSteps, walkCells, walkPoint } from "./walk-path.ts";
import type { Crew, Game } from "./types.ts";

describe("crew orders outside a fight", () => {
  it("walks into the ordered room on the map", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-oxygen");
    assert.deepEqual(ivo.path, ["p-oxygen"]);
    assert.equal(ivo.room, "p-engines");
    const oxygen = g.player.rooms.find((r) => r.id === "p-oxygen");
    assert.ok(oxygen);
    const spot = restSpot(oxygen, g.crew, ivo.id, "player");
    const across = walkCells(g.player, ivo.room, ivo.path, ivo.via, spot ?? undefined);
    const tiles = hopSteps(across);
    assert.ok(tiles > 1);
    for (let i = 0; i < 12; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    assert.ok(Math.abs(ivo.move - 1 / tiles) < 0.02, String(ivo.move));
    for (let i = 0; i < 200 && ivo.path.length > 0; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-oxygen");
    assert.deepEqual(ivo.path, []);
    assert.equal(ivo.move, 0);
  });

  it("holds the walk while paused", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.paused = true;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-oxygen");
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    assert.equal(ivo.move, 0);
    assert.equal(ivo.via, "2,2");
  });

  it("carries the doorway into the next room", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-medbay");
    assert.equal(ivo.via, "2,2");
    assert.ok(ivo.path.length > 1);
    const from = ivo.room;
    const dest = g.player.rooms.find((r) => r.id === ivo.path[ivo.path.length - 1]);
    assert.ok(dest);
    const spot = restSpot(dest, g.crew, ivo.id, ivo.aboard);
    const landing = hopLanding(g.player, from, ivo.path, ivo.via, spot ?? undefined);
    assert.ok(landing);
    for (let i = 0; i < 200 && ivo.room === from; i++) step(g, 0.05);
    assert.notEqual(ivo.room, from);
    assert.equal(ivo.via, `${landing.x},${landing.y}`);
    const at = walkPoint(g.player, ivo.room, ivo.path, ivo.via, 0);
    assert.deepEqual(at, { x: landing.x + 0.5, y: landing.y + 0.5 });
  });

  it("finishes on the tile they stand on, including a room that is already occupied", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    const ada = g.crew.find((c) => c.name === "Ada Voss");
    const nen = g.crew.find((c) => c.name === "Nen Hale");
    assert.ok(ivo && ada && nen);
    const pilot = g.player.rooms.find((r) => r.id === "p-pilot");
    const engines = g.player.rooms.find((r) => r.id === "p-engines");
    assert.ok(pilot && engines);
    const adaBefore = restSpot(pilot, g.crew, ada.id, "player");
    const ivoHome = restSpot(engines, g.crew, ivo.id, "player");
    assert.ok(adaBefore && ivoHome);

    orderCrew(g, ivo.id, "p-pilot");
    assert.equal(ivo.via, `${ivoHome.x},${ivoHome.y}`);
    const goal = restSpot(pilot, g.crew, ivo.id, "player");
    const adaHeld = restSpot(pilot, g.crew, ada.id, "player");
    assert.ok(goal && adaHeld);
    assert.deepEqual({ x: adaHeld.x, y: adaHeld.y }, { x: adaBefore.x, y: adaBefore.y });
    assert.notDeepEqual({ x: goal.x, y: goal.y }, { x: adaBefore.x, y: adaBefore.y });

    let last: { x: number; y: number } | null = null;
    for (let i = 0; i < 400 && ivo.path.length > 0; i++) {
      if (ivo.path.length === 1) {
        const cells = walkCells(g.player, ivo.room, ivo.path, ivo.via, goal);
        assert.ok(cells?.length);
        last = cells[cells.length - 1]!;
        const painted = walkPoint(
          g.player,
          ivo.room,
          ivo.path,
          ivo.via,
          arriveMove(1 - 0.28 / hopSteps(cells), hopSteps(cells)),
          goal,
        );
        assert.deepEqual(painted, { x: goal.x + 0.5, y: goal.y + 0.5 });
      }
      step(g, 0.05);
    }
    assert.deepEqual(last, { x: goal.x, y: goal.y });
    assert.equal(ivo.room, "p-pilot");
    assert.deepEqual(ivo.path, []);
    const stood = restSpot(pilot, g.crew, ivo.id, "player");
    const adaAfter = restSpot(pilot, g.crew, ada.id, "player");
    assert.ok(stood && adaAfter);
    assert.deepEqual({ x: stood.x, y: stood.y, stack: stood.stack }, { x: goal.x, y: goal.y, stack: goal.stack });
    assert.deepEqual({ x: adaAfter.x, y: adaAfter.y }, { x: adaBefore.x, y: adaBefore.y });

    orderCrew(g, ada.id, "p-engines");
    orderCrew(g, nen.id, "p-engines");
    const goals = new Map(
      [ada, nen].map((c) => {
        const spot = restSpot(engines, g.crew, c.id, "player");
        assert.ok(spot);
        return [c.id, spot] as const;
      }),
    );
    const seen = new Map<string, { x: number; y: number }>();
    for (let i = 0; i < 400 && (ada.path.length > 0 || nen.path.length > 0); i++) {
      for (const c of [ada, nen]) {
        if (c.path.length !== 1 || seen.has(c.id)) continue;
        const spot = goals.get(c.id)!;
        const cells = walkCells(g.player, c.room, c.path, c.via, spot);
        assert.ok(cells?.length);
        seen.set(c.id, cells[cells.length - 1]!);
      }
      step(g, 0.05);
    }
    for (const c of [ada, nen]) {
      const spot = goals.get(c.id)!;
      assert.deepEqual(seen.get(c.id), { x: spot.x, y: spot.y });
      const stoodAt = restSpot(engines, g.crew, c.id, "player");
      assert.ok(stoodAt);
      assert.deepEqual({ x: stoodAt.x, y: stoodAt.y }, { x: spot.x, y: spot.y });
    }
  });

  it("stays on the same tile when the destination changes mid-walk", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-pilot");
    for (let i = 0; i < 5; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    const before = painted(g, ivo);
    assert.equal(orderCrew(g, ivo.id, "p-shields"), "ok");
    assert.equal(ivo.room, "p-engines");
    const after = painted(g, ivo);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.02, `${before.x},${before.y} -> ${after.x},${after.y}`);
    assert.notEqual(ivo.path[ivo.path.length - 1], "p-pilot");
    step(g, 0.05);
    const moved = Math.hypot(painted(g, ivo).x - after.x, painted(g, ivo).y - after.y);
    assert.ok(moved > 0.02 && moved < 0.25, String(moved));

    const again = painted(g, ivo);
    assert.equal(orderCrew(g, ivo.id, "p-weapons"), "ok");
    assert.equal(ivo.path[ivo.path.length - 1], "p-weapons");
    const turned = painted(g, ivo);
    assert.ok(Math.hypot(turned.x - again.x, turned.y - again.y) < 0.02, `${again.x},${again.y} -> ${turned.x},${turned.y}`);
  });

  it("walks to the stand when ordered to stay in the room being crossed", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    const engines = g.player.rooms.find((r) => r.id === "p-engines");
    assert.ok(ivo && engines);
    orderCrew(g, ivo.id, "p-pilot");
    for (let i = 0; i < 5; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    const before = painted(g, ivo);
    assert.equal(orderCrew(g, ivo.id, "p-engines"), "ok");
    assert.equal(ivo.room, "p-engines");
    assert.deepEqual(ivo.path, ["p-engines"]);
    const after = painted(g, ivo);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.02, `${before.x},${before.y} -> ${after.x},${after.y}`);
    for (let i = 0; i < 80 && ivo.path.length > 0; i++) step(g, 0.05);
    assert.deepEqual(ivo.path, []);
    const stood = restSpot(engines, g.crew, ivo.id, "player");
    assert.ok(stood);
    const at = painted(g, ivo);
    assert.ok(Math.hypot(at.x - (stood.x + 0.5), at.y - (stood.y + 0.5)) < 0.02);
  });
});

/** Sprite point: last hop uses the early-arrival clock, every earlier hop uses move. */
function painted(g: Game, c: Crew): { x: number; y: number } {
  const ship = c.aboard === "player" ? g.player : g.enemy;
  assert.ok(ship);
  if (c.path.length === 0) {
    const room = ship.rooms.find((r) => r.id === c.room);
    assert.ok(room);
    const spot = restSpot(room, g.crew, c.id, c.aboard, ship);
    assert.ok(spot);
    return { x: spot.x + 0.5, y: spot.y + 0.5 };
  }
  const dest = ship.rooms.find((r) => r.id === c.path[c.path.length - 1]);
  assert.ok(dest);
  const goal = restSpot(dest, g.crew, c.id, c.aboard, ship) ?? undefined;
  const cells = walkCells(ship, c.room, c.path, c.via, goal);
  const steps = hopSteps(cells, c.via);
  const t = c.path.length === 1 ? arriveMove(c.move, steps) : Math.min(1, Math.max(0, c.move));
  const at = walkPoint(ship, c.room, c.path, c.via, t, goal);
  assert.ok(at);
  return at;
}
