import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beamStroke, cellsOnSegment, clampBeamEnd, clampTargetPoint, clipBeamEnd, pointInRoom, roomAtPoint, roomCenter, roomsOnSegment, targetableSpan, type BeamGrid } from "./beam-line.ts";
import { beamSwipeSeconds, beamTileLength } from "./wiki/weapons-beam.ts";
import { aim, applyImpact, armWeapon, cancelTargeting, createGame, evasionPercent, nudgeAim, powerMask, startCombat, step, toggleAutoAll } from "./sim.ts";
import type { Room, Shot } from "./types.ts";

function grid(rooms: BeamGrid["rooms"], cols: number, rows: number): BeamGrid {
  return { rooms, cols, rows };
}

function cell(id: string, x: number, y: number, w = 1, h = 1, omit?: { x: number; y: number }[]) {
  return { id, x, y, w, h, omit };
}

describe("beam stroke", () => {
  it("keeps the printed length and walks the leading edge along the aim", () => {
    const start = beamStroke({ x: 0, y: 0 }, { x: 4, y: 0 }, 0, 3.8);
    assert.deepEqual(start.head, { x: 0, y: 0 });
    assert.ok(Math.abs(start.tail.x - -3.8) < 1e-9);
    assert.equal(start.tail.y, 0);

    const mid = beamStroke({ x: 0, y: 0 }, { x: 4, y: 0 }, 0.5, 3.8);
    assert.equal(mid.head.x, 2);
    assert.ok(Math.abs(mid.head.x - mid.tail.x - 3.8) < 1e-9);

    const end = beamStroke({ x: 0, y: 0 }, { x: 4, y: 0 }, 1, 3.8);
    assert.deepEqual(end.head, { x: 4, y: 0 });
    assert.ok(Math.abs(end.tail.x - 0.2) < 1e-9);
  });
});

describe("targetable slider range", () => {
  const ship = grid([cell("left", 1, 1, 1, 2), cell("right", 4, 1)], 6, 4);

  it("stops at the occupied floor and will not sit on hull", () => {
    const span = targetableSpan(ship);
    assert.ok(span);
    assert.equal(span.minX, 1);
    assert.equal(span.minY, 1);
    assert.ok(span.maxX < 5);
    assert.ok(span.maxX > 4);
    assert.ok(span.maxY < 3);
    const outside = clampTargetPoint(ship, { x: -4, y: 20 });
    assert.ok(outside);
    assert.equal(roomAtPoint(ship, outside), "left");
    const gap = clampTargetPoint(ship, { x: 2.4, y: 1.2 });
    assert.ok(gap);
    assert.ok(roomAtPoint(ship, gap));
    const inside = clampTargetPoint(ship, { x: 4.2, y: 1.4 });
    assert.deepEqual(inside, { x: 4.2, y: 1.4 });
  });

  it("keeps a beam end on the floor and inside its tile length", () => {
    const start = { x: 1.2, y: 1.2 };
    const end = clampBeamEnd(ship, start, { x: 40, y: 1.2 }, 1.5);
    assert.ok(end);
    assert.ok(roomAtPoint(ship, end) || Math.hypot(end.x - start.x, end.y - start.y) <= 1.5 + 1e-6);
    assert.ok(Math.hypot(end.x - start.x, end.y - start.y) <= 1.5 + 1e-6 || roomAtPoint(ship, end));
    assert.ok(end.x <= (targetableSpan(ship)?.maxX ?? 0) + 1e-6);
    assert.ok(end.y <= (targetableSpan(ship)?.maxY ?? 0) + 1e-6);
  });
});

describe("slider aim", () => {
  it("moves a queued laser onto the room under the point and does not fire", () => {
    const g = createGame(1, "slug-a");
    startCombat(g, "scout");
    const laser = g.player.weapons.find((gun) => gun.defId !== "antibio" && gun.enabled);
    assert.ok(laser);
    const rooms = g.enemy!.rooms;
    laser.charge = 1;
    armWeapon(g, laser.uid);
    const spot = roomCenter(rooms[rooms.length - 1]);
    nudgeAim(g, "point", spot);
    assert.equal(laser.target, rooms[rooms.length - 1].id);
    assert.equal(g.shots.some((s) => s.defId === laser.defId), false);
    nudgeAim(g, "point", { x: spot.x + 80, y: spot.y - 80 });
    assert.ok(rooms.some((room) => room.id === laser.target));
    assert.equal(g.shots.some((s) => s.defId === laser.defId), false);
  });

  it("sets a beam from two points and will not leave the enemy floor", () => {
    const g = createGame(1, "slug-a");
    startCombat(g, "scout");
    const w = g.player.weapons.find((gun) => gun.defId === "antibio");
    assert.ok(w);
    w.charge = 0;
    armWeapon(g, w.uid);
    const rooms = g.enemy!.rooms;
    const start = roomCenter(rooms[0]);
    nudgeAim(g, "a", start);
    assert.equal(g.targeting, true);
    assert.equal(w.beamLine ?? null, null);
    assert.equal(g.shots.length, 0);
    nudgeAim(g, "b", { x: 80, y: -10 });
    assert.ok(w.beamLine);
    const span = targetableSpan(g.enemy!);
    assert.ok(span);
    assert.ok(w.beamLine.a.x >= span.minX && w.beamLine.a.x <= span.maxX);
    assert.ok(w.beamLine.b.x >= span.minX - 1e-6 && w.beamLine.b.x <= span.maxX + 1e-6);
    assert.ok(w.beamLine.b.y >= span.minY - 1e-6 && w.beamLine.b.y <= span.maxY + 1e-6);
    const tiles = beamTileLength("antibio") ?? 0;
    assert.ok(Math.hypot(w.beamLine.b.x - w.beamLine.a.x, w.beamLine.b.y - w.beamLine.a.y) <= tiles + 0.05);
    assert.equal(g.shots.length, 0);
    nudgeAim(g, "a", roomCenter(rooms[Math.min(1, rooms.length - 1)]));
    assert.ok(w.beamLine);
    assert.equal(g.shots.length, 0);
  });
});

describe("rooms on a beam segment", () => {
  const row = grid(
    [cell("a", 0, 0), cell("b", 1, 0), cell("c", 2, 0), cell("d", 3, 0)],
    4,
    1,
  );

  it("walks a straight row from the start click to the end click", () => {
    assert.deepEqual(roomsOnSegment(row, { x: 0.5, y: 0.5 }, { x: 3.5, y: 0.5 }), ["a", "b", "c", "d"]);
    assert.deepEqual(roomsOnSegment(row, { x: 3.5, y: 0.5 }, { x: 0.5, y: 0.5 }), ["d", "c", "b", "a"]);
  });

  it("counts a wide room once", () => {
    const ship = grid([cell("a", 0, 0), cell("wide", 1, 0, 2, 1), cell("c", 3, 0)], 4, 1);
    assert.deepEqual(roomsOnSegment(ship, { x: 0.5, y: 0.5 }, { x: 3.5, y: 0.5 }), ["a", "wide", "c"]);
  });

  it("stays in one room when both clicks are in it", () => {
    assert.deepEqual(roomsOnSegment(row, { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }), ["a"]);
  });

  it("counts the side rooms when the segment passes through a corner", () => {
    const ship = grid(
      [cell("a", 0, 0), cell("b", 1, 0), cell("d", 0, 1), cell("e", 1, 1)],
      2,
      2,
    );
    assert.deepEqual(roomsOnSegment(ship, { x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }), ["a", "b", "d", "e"]);
  });

  it("does not pull in a room the segment misses", () => {
    const ship = grid(
      [cell("a", 0, 0), cell("b", 1, 0), cell("d", 0, 1), cell("e", 1, 1)],
      2,
      2,
    );
    assert.deepEqual(roomsOnSegment(ship, { x: 0.2, y: 0.5 }, { x: 0.8, y: 1.5 }), ["a", "d"]);
  });

  it("skips an omitted cell and still hits the room through its floor", () => {
    const ship = grid(
      [cell("m", 0, 0, 2, 2, [{ x: 1, y: 1 }]), cell("n", 2, 1)],
      3,
      2,
    );
    assert.deepEqual(roomsOnSegment(ship, { x: 0.5, y: 0.5 }, { x: 2.5, y: 1.5 }), ["m", "n"]);
    assert.deepEqual(roomsOnSegment(ship, { x: 1.2, y: 1.2 }, { x: 1.8, y: 1.8 }), []);
  });

  it("keeps a click on the far edge inside the room", () => {
    const room = { x: 2, y: 1, w: 2, h: 1 };
    const point = pointInRoom(room, 1, 1);
    assert.ok(point.x < 4);
    assert.ok(point.y < 2);
    assert.equal(roomCenter(room).x, 3);
  });
});

describe("printed beam length", () => {
  const row = grid(
    [cell("a", 0, 0), cell("b", 1, 0), cell("c", 2, 0), cell("d", 3, 0), cell("e", 4, 0), cell("f", 5, 0)],
    6,
    1,
  );

  it("stops a longer swipe at the printed tile count and leaves a closer click", () => {
    // Beam (Weapons), Glaive Beam: 1.8 tiles diagonally. The click past that is not the end.
    const start = { x: 0.5, y: 0.5 };
    const far = { x: 5.5, y: 0.5 };
    const end = clipBeamEnd(start, far, 1.8);
    assert.ok(Math.abs(end.x - 2.3) < 1e-9);
    assert.equal(end.y, 0.5);
    assert.deepEqual(roomsOnSegment(row, start, end), ["a", "b", "c"]);
    const near = { x: 1.2, y: 0.5 };
    assert.deepEqual(clipBeamEnd(start, near, 1.8), near);
  });
});

describe("player beam aim", () => {
  function fight() {
    const g = createGame(1, "slug-a");
    startCombat(g, "scout");
    const w = g.player.weapons.find((gun) => gun.defId === "antibio");
    assert.ok(w);
    const index = g.player.weapons.indexOf(w);
    assert.equal(powerMask(g.player)[index], true);
    return { g, w };
  }

  function center(room: Room) {
    return roomCenter(room);
  }

  it("does not fire on the first click", () => {
    const { g, w } = fight();
    const room = g.enemy!.rooms[0];
    w.charge = 1;
    armWeapon(g, w.uid);
    aim(g, room.id);
    assert.equal(g.targeting, true);
    assert.equal(w.target, null);
    assert.equal(w.beamLine, null);
    assert.deepEqual(g.beamAnchor, center(room));
    assert.equal(g.shots.filter((s) => s.defId === "antibio").length, 0);
  });

  it("hits only the clicked room when the line does not leave it", () => {
    const { g, w } = fight();
    const room = g.enemy!.rooms[0];
    w.charge = 1;
    armWeapon(g, w.uid);
    aim(g, room.id);
    aim(g, room.id);
    const shot = g.shots.find((s) => s.defId === "antibio");
    assert.ok(shot);
    assert.deepEqual(shot.beamRooms, [room.id]);
    assert.equal(shot.duration, 1 / 60);
    assert.equal(g.targeting, false);
    assert.equal(w.target, null);
    assert.equal(w.beamLine, null);
  });

  it("fires every room the segment crosses, in order", () => {
    const { g, w } = fight();
    const rooms = g.enemy!.rooms;
    const start = rooms[0];
    const far = rooms[rooms.length - 1];
    w.charge = 1;
    armWeapon(g, w.uid);
    aim(g, start.id, center(start));
    aim(g, far.id, center(far));
    const shot = g.shots.find((s) => s.defId === "antibio");
    assert.ok(shot);
    const clipped = clipBeamEnd(center(start), center(far), beamTileLength("antibio") ?? 0);
    assert.deepEqual(shot.beamRooms, roomsOnSegment(g.enemy!, center(start), clipped));
    assert.equal(shot.beamRooms?.[0], shot.targetRoom);
    assert.deepEqual(shot.beamLine, { a: center(start), b: clipped });
    const span = Math.hypot(clipped.x - center(start).x, clipped.y - center(start).y);
    assert.equal(shot.duration, Math.max(beamSwipeSeconds("antibio", span) ?? 0, 1 / 60));
  });

  it("queues the segment while the beam is still charging", () => {
    const { g, w } = fight();
    const rooms = g.enemy!.rooms;
    w.charge = 0;
    armWeapon(g, w.uid);
    aim(g, rooms[0].id);
    aim(g, rooms[rooms.length - 1].id);
    assert.equal(g.shots.filter((s) => s.defId === "antibio").length, 0);
    assert.equal(g.targeting, false);
    assert.ok(w.beamLine);
    const end = clipBeamEnd(center(rooms[0]), center(rooms[rooms.length - 1]), beamTileLength("antibio") ?? 0);
    assert.equal(w.target, roomsOnSegment(g.enemy!, center(rooms[0]), end)[0]);
  });

  it("keeps the segment on autofire and drops it after a manual shot", () => {
    const { g, w } = fight();
    const room = g.enemy!.rooms[0];
    toggleAutoAll(g);
    w.charge = 1;
    armWeapon(g, w.uid);
    aim(g, room.id);
    aim(g, room.id);
    assert.ok(w.beamLine);
    assert.equal(w.target, room.id);
    toggleAutoAll(g);
    w.charge = 1;
    armWeapon(g, w.uid);
    aim(g, room.id);
    aim(g, room.id);
    assert.equal(w.beamLine, null);
    assert.equal(w.target, null);
  });

  it("drops an unfinished start when targeting is cancelled", () => {
    const { g, w } = fight();
    armWeapon(g, w.uid);
    aim(g, g.enemy!.rooms[0].id);
    cancelTargeting(g);
    assert.equal(g.targeting, false);
    assert.equal(g.beamAnchor, null);
    assert.equal(w.beamLine ?? null, null);
  });

  it("still lets a laser confirm on one click", () => {
    const { g } = fight();
    const laser = g.player.weapons.find((gun) => gun.defId !== "antibio" && gun.enabled);
    assert.ok(laser);
    const room = g.enemy!.rooms[0].id;
    laser.charge = 0;
    armWeapon(g, laser.uid);
    aim(g, room);
    assert.equal(laser.target, room);
    assert.equal(g.targeting, false);
    assert.equal(g.beamAnchor, null);
  });
});

describe("enemy beam aim", () => {
  it("still swipes the aimed room and one door neighbour", () => {
    const g = createGame(4);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    const enemy = g.enemy!;
    enemy.weapons = [
      { uid: "e-beam", defId: "mini", charge: 1, enabled: true, autofire: true, target: g.player.rooms[0].id },
    ];
    step(g, 0.05);
    const shot = g.shots.find((s) => s.from === "enemy" && s.kind === "beam");
    assert.ok(shot);
    assert.ok(shot.beamRooms);
    assert.equal(shot.beamRooms[0], shot.targetRoom);
    assert.ok(shot.beamRooms.length <= 2);
    assert.equal(shot.beamLine, undefined);
    const extra = shot.beamRooms[1];
    if (extra) {
      const linked = g.player.doors.some(
        (d) => (d.a === shot.targetRoom && d.b === extra) || (d.b === shot.targetRoom && d.a === extra),
      );
      assert.equal(linked, true);
    }
    let tiles = 0;
    if (shot.beamRooms.length >= 2) {
      const a = g.player.rooms.find((room) => room.id === shot.beamRooms?.[0]);
      const b = g.player.rooms.find((room) => room.id === shot.beamRooms?.[shot.beamRooms.length - 1]);
      assert.ok(a && b);
      const ca = roomCenter(a);
      const cb = roomCenter(b);
      tiles = Math.hypot(cb.x - ca.x, cb.y - ca.y);
    }
    assert.equal(shot.duration, Math.max(beamSwipeSeconds("mini", tiles) ?? 0, 1 / 60));
  });

  it("swipes the Boss Beam at the printed speed of 5", () => {
    const g = createGame(4);
    startCombat(g, "scout");
    for (const w of g.player.weapons) w.enabled = false;
    const enemy = g.enemy!;
    enemy.weapons = [
      { uid: "e-beam", defId: "bossbeam", charge: 1, enabled: true, autofire: true, target: g.player.rooms[0].id },
    ];
    step(g, 0.05);
    const shot = g.shots.find((s) => s.from === "enemy" && s.kind === "beam");
    assert.ok(shot);
    assert.equal(shot.defId, "bossbeam");
    let tiles = 0;
    if ((shot.beamRooms?.length ?? 0) >= 2) {
      const a = g.player.rooms.find((room) => room.id === shot.beamRooms?.[0]);
      const b = g.player.rooms.find((room) => room.id === shot.beamRooms?.[shot.beamRooms.length - 1]);
      assert.ok(a && b);
      const ca = roomCenter(a);
      const cb = roomCenter(b);
      tiles = Math.hypot(cb.x - ca.x, cb.y - ca.y);
    }
    assert.equal(shot.duration, Math.max(beamSwipeSeconds("bossbeam", tiles) ?? 0, 1 / 60));
  });
});

describe("cells on a beam segment", () => {
  it("hits the cells a short segment crosses and does not invent extra cells", () => {
    const row = grid(
      [cell("a", 0, 0), cell("b", 1, 0), cell("c", 2, 0)],
      3,
      1,
    );
    assert.deepEqual(cellsOnSegment(row, { x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }), [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    assert.deepEqual(cellsOnSegment(row, { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.4 }), [{ x: 0, y: 0 }]);

    const ship = grid(
      [cell("a", 0, 0), cell("b", 1, 0), cell("d", 0, 1), cell("e", 1, 1)],
      2,
      2,
    );
    assert.deepEqual(cellsOnSegment(ship, { x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }), [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });
});

/** Occupied cells, lowest y then lowest x. Omit cells are skipped, matching cellOccupied. */
function floorCells(room: Room): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (room.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

/** A segment that stays inside one cell. */
function across(cell: { x: number; y: number }): { a: { x: number; y: number }; b: { x: number; y: number } } {
  return {
    a: { x: cell.x + 0.25, y: cell.y + 0.5 },
    b: { x: cell.x + 0.75, y: cell.y + 0.5 },
  };
}

function impactShot(partial: Partial<Shot> & Pick<Shot, "kind" | "damage" | "targetRoom">): Shot {
  return {
    id: "tile",
    from: "enemy",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

describe("beam crew standing tile", () => {
  // Mini Beam's printed crew damage is 15 HP. A 1-damage laser's usual crew damage is the same 15.
  const usual = 15;

  function seated() {
    const g = createGame(1);
    g.player.shieldNow = 0;
    g.player.zoltan = 0;
    g.player.systems.engines.power = 0;
    const room = g.player.rooms.find((item) => item.id === "p-weapons");
    assert.ok(room);
    const floors = floorCells(room);
    assert.ok(floors.length >= 2);
    const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0);
    assert.ok(crew.length >= 2);
    for (const c of crew) {
      c.room = room.id;
      c.path = [];
      c.hp = 100;
    }
    assert.equal(evasionPercent(g, g.player, "player"), 0);
    return { g, room, crew, stand: floors[0], other: floors[1] };
  }

  it("leaves crew HP unchanged when the beam crosses the room but misses the standing cell", () => {
    const { g, room, crew, stand, other } = seated();
    // INFERRED: standing cell is the room's first occupied cell, lowest y then lowest x.
    const line = across(other);
    assert.deepEqual(cellsOnSegment(g.player, line.a, line.b), [other]);
    assert.equal(cellsOnSegment(g.player, line.a, line.b).some((cell) => cell.x === stand.x && cell.y === stand.y), false);
    const hull = g.player.hull;
    const damage = g.player.systems.weapons.damage;
    applyImpact(
      g,
      impactShot({
        kind: "beam",
        damage: 1,
        defId: "mini",
        targetRoom: room.id,
        beamRooms: [room.id],
        beamLine: line,
      }),
    );
    for (const c of crew) assert.equal(c.hp, 100);
    assert.equal(g.player.hull, hull - 1);
    assert.equal(g.player.systems.weapons.damage, damage + 1);
    assert.equal(room.fire, 0);
    assert.equal(room.breach, 0);
  });

  it("deals the usual crew damage when the beam crosses the standing cell", () => {
    const { g, room, crew, stand } = seated();
    const line = across(stand);
    assert.deepEqual(cellsOnSegment(g.player, line.a, line.b), [stand]);
    applyImpact(
      g,
      impactShot({
        kind: "beam",
        damage: 1,
        defId: "mini",
        targetRoom: room.id,
        beamRooms: [room.id],
        beamLine: line,
      }),
    );
    for (const c of crew) assert.equal(c.hp, 100 - usual);
  });

  it("still damages every crew member when a beam only lists beamRooms", () => {
    const { g, room, crew } = seated();
    // INFERRED: no beamLine covers every tile of each listed room.
    applyImpact(
      g,
      impactShot({
        kind: "beam",
        damage: 1,
        defId: "mini",
        targetRoom: room.id,
        beamRooms: [room.id],
      }),
    );
    for (const c of crew) assert.equal(c.hp, 100 - usual);
  });

  it("still damages every crew member in the room with a non-beam shot", () => {
    const { g, room, crew } = seated();
    applyImpact(g, impactShot({ kind: "laser", damage: 1, targetRoom: room.id }));
    for (const c of crew) assert.equal(c.hp, 100 - usual);
  });
});
