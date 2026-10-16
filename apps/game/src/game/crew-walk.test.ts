import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { restSpot, roomConsole, shiftPoint } from "./crew-spots.ts";
import { createGame, manning, orderCrew, returnToStations, saveStations, startCombat, step } from "./sim.ts";
import { arriveMove, hopLanding, hopSteps, walkCells, walkPoint } from "./walk-path.ts";
import type { Crew, Game } from "./types.ts";

describe("crew orders outside a fight", () => {
  it("walks into the ordered room on the map", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD");
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
    const g = createGame(4, "PLAYER_SHIP_HARD");
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
    const g = createGame(4, "PLAYER_SHIP_HARD");
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
    const g = createGame(4, "PLAYER_SHIP_HARD");
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
    const g = createGame(4, "PLAYER_SHIP_HARD");
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
    const g = createGame(4, "PLAYER_SHIP_HARD");
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

describe("crew keep their tiles in a shared room (per the user)", () => {
  /** Three crew idle in the Shields room of a Kestrel, tiles stamped by a tick. */
  function crowd() {
    const g = createGame(4, "PLAYER_SHIP_HARD");
    g.phase = "map";
    g.enemy = null;
    const room = g.player.rooms.find((r) => r.system === "shields")!;
    const crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
    for (const c of crew) {
      c.room = room.id;
      c.path = [];
      c.move = 0;
      delete c.via;
      delete c.tile;
      delete c.shift;
    }
    step(g, 0.05);
    const cell = roomConsole(room, g.player)!;
    const op = crew.find((c) => c.tile?.x === cell.x && c.tile?.y === cell.y)!;
    assert.ok(op, "someone takes the terminal");
    return { g, room, crew, cell, op, others: crew.filter((c) => c !== op) };
  }

  it("leaves everyone else where they stand when a crew member who is not on the terminal leaves", () => {
    const { g, op, others } = crowd();
    const [leaving, staying] = others;
    const before = { ...staying.tile! };
    const opBefore = { ...op.tile! };
    orderCrew(g, leaving.id, "p-oxygen");
    for (let i = 0; i < 80; i++) {
      step(g, 0.05);
      assert.deepEqual({ ...staying.tile! }, before);
      assert.deepEqual({ ...op.tile! }, opBefore);
      assert.equal(staying.shift, undefined);
    }
  });

  it("fights an intruder before anyone heads for the terminal", () => {
    const { g, room, cell, op, others } = crowd();
    startCombat(g, "scout");
    const foe = g.crew.find((c) => c.side === "enemy" && c.kin !== "energy")!;
    foe.aboard = "player";
    foe.room = room.id;
    foe.path = [];
    foe.move = 0;
    const foeHp = foe.hp;
    orderCrew(g, op.id, "p-oxygen");
    const at = others.map((c) => ({ ...c.tile! }));
    for (let i = 0; i < 20; i++) {
      step(g, 0.05);
      // Nobody leaves their tile for the terminal while the intruder stands here.
      assert.deepEqual(others.map((c) => ({ ...c.tile! })), at);
      assert.equal(manning(g, g.player, "player", "shields"), false);
    }
    assert.ok(foe.hp < foeHp, "the crew fight the intruder");
    // With the room clear, the nearest crew member walks over.
    g.crew = g.crew.filter((c) => c !== foe);
    step(g, 0.05);
    assert.ok(others.some((c) => c.tile!.x === cell.x && c.tile!.y === cell.y && c.shift));
  });

  it("walks the nearest crew member to an empty terminal, and the system is manned only once they arrive", () => {
    const { g, cell, op, others } = crowd();
    assert.equal(manning(g, g.player, "player", "shields"), true);
    orderCrew(g, op.id, "p-oxygen");
    step(g, 0.05);
    const near = (c: Crew) => Math.abs(c.tile!.x - cell.x) + Math.abs(c.tile!.y - cell.y);
    const walker = others.find((c) => c.tile!.x === cell.x && c.tile!.y === cell.y)!;
    assert.ok(walker, "someone heads for the terminal");
    assert.ok(walker.shift, "they walk, not teleport");
    const still = others.find((c) => c !== walker)!;
    const stillAt = { ...still.tile! };
    assert.ok(near(still) >= 1);
    assert.equal(manning(g, g.player, "player", "shields"), false);
    // The walker's drawn point moves a little each tick until it reaches the terminal.
    let last = shiftPoint(walker)!;
    for (let i = 0; i < 60 && walker.shift; i++) {
      step(g, 0.05);
      const at = shiftPoint(walker)!;
      assert.ok(Math.hypot(at.x - last.x, at.y - last.y) < 0.5, `${JSON.stringify(last)} -> ${JSON.stringify(at)}`);
      last = at;
      assert.deepEqual({ ...still.tile! }, stillAt);
    }
    assert.equal(walker.shift, undefined);
    assert.deepEqual({ x: last.x, y: last.y }, { x: cell.x, y: cell.y });
    assert.equal(manning(g, g.player, "player", "shields"), true);
  });
});

describe("saved stations keep the exact tile (per the user)", () => {
  it("sends each crew member back to the tile they stood on when stations were saved", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD");
    g.phase = "map";
    g.enemy = null;
    const room = g.player.rooms.find((r) => r.system === "shields")!;
    const crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
    for (const c of crew) {
      c.room = room.id;
      c.path = [];
      c.move = 0;
      delete c.via;
      delete c.tile;
    }
    step(g, 0.05);
    // Rotate who stands where, so the fresh order they would be handed on arrival does not match by chance.
    const tiles = crew.map((c) => ({ ...c.tile! }));
    crew.forEach((c, i) => {
      c.tile = tiles[(i + 1) % tiles.length]!;
    });
    step(g, 0.05);
    const saved = new Map(crew.map((c) => [c.id, { ...c.tile! }]));
    assert.deepEqual(crew.map((c) => saved.get(c.id)), crew.map((_, i) => tiles[(i + 1) % tiles.length]));
    saveStations(g);
    // Somewhere roomy enough for all three, then back.
    const away = g.player.rooms.find((r) => r.id !== room.id && r.w * r.h >= 4 && r.system !== "medbay" && !r.kit)!;
    for (const c of crew) orderCrew(g, c.id, away.id);
    for (let i = 0; i < 400 && crew.some((c) => c.path.length); i++) step(g, 0.05);
    assert.ok(crew.every((c) => c.room === away.id));
    returnToStations(g);
    for (let i = 0; i < 400 && crew.some((c) => c.path.length || c.shift); i++) step(g, 0.05);
    for (const c of crew) {
      assert.equal(c.room, room.id);
      const want = saved.get(c.id)!;
      assert.deepEqual({ x: c.tile!.x, y: c.tile!.y }, { x: want.x, y: want.y }, c.name);
    }
  });
});

describe("walking crew are not immune to damage (per the user)", () => {
  /** A crew member mid-walk through `through`, toward the next room, held there by resetting the walk each tick. */
  function walker(g: Game, through: string) {
    const ship = g.player;
    const c = g.crew.find((x) => x.side === "player")!;
    const room = ship.rooms.find((r) => r.id === through)!;
    const next = ship.doors.find((d) => d.b !== "void" && (d.a === through || d.b === through))!;
    c.room = through;
    c.path = [next.a === through ? next.b : next.a];
    c.move = 0;
    delete c.via;
    const hold = () => {
      c.room = through;
      c.path = [next.a === through ? next.b : next.a];
      c.move = 0;
    };
    return { c, room, hold };
  }

  it("suffocates in an airless room and burns in a fire while walking through", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD");
    g.phase = "map";
    g.paused = false;
    const { c, room, hold } = walker(g, "p-engines");
    room.o2 = -20;
    c.hp = 100;
    step(g, 0.05);
    assert.ok(c.hp < 100 - 0.25, `suffocation ${c.hp}`);
    hold();
    for (const r of g.player.rooms) r.o2 = 100;
    room.fire = 1;
    c.hp = 100;
    step(g, 0.05);
    assert.ok(c.hp < 100 - 0.05, `fire ${c.hp}`);
  });

  it("is struck by an enemy standing in the room it walks through", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD");
    g.phase = "map";
    startCombat(g, "scout");
    const { c, hold } = walker(g, "p-engines");
    // Nobody of ours stands in the room: those standing are struck before anyone walking through.
    for (const other of g.crew) {
      if (other.side === "player" && other !== c && other.room === "p-engines") {
        other.room = "p-pilot";
        other.path = [];
      }
    }
    const foe = g.crew.find((x) => x.side === "enemy")!;
    foe.aboard = "player";
    foe.room = "p-engines";
    foe.path = [];
    foe.move = 0;
    c.hp = 100;
    for (let i = 0; i < 60; i++) {
      hold();
      step(g, 0.05);
    }
    assert.ok(c.hp < 100, `melee ${c.hp}`);
  });
});
