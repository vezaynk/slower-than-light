import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyImpact,
  commitJump,
  createGame,
  lockdown,
  lockdownSelected,
  openAllDoors,
  orderCrew,
  selectCrew,
  startCombat,
  step,
  toggleDoor,
} from "../sim.ts";
import type { Shot } from "../types.ts";

function shot(partial: Partial<Shot> & Pick<Shot, "kind" | "damage">): Shot {
  return {
    id: "t",
    from: "enemy",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: "p-weapons",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function advance(g: ReturnType<typeof createGame>, seconds: number) {
  const target = g.time + seconds;
  let n = 0;
  while (g.time + 1e-4 < target && n < 20000) {
    step(g, 0.05);
    n += 1;
  }
  assert.ok(n < 20000);
}

function parkEngines(g: ReturnType<typeof createGame>) {
  g.player.systems.engines.power = 0;
  for (const c of g.crew) {
    if (c.aboard === "player" && c.room === "p-engines") c.room = "p-medbay";
  }
}

function quiet(g: ReturnType<typeof createGame>) {
  g.player.systems.engines.power = 0;
  if (g.enemy) {
    g.enemy.systems.engines.power = 0;
    for (const w of g.enemy.weapons) w.enabled = false;
  }
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
}

describe("zoltan shield", () => {
  it("starts Zoltan A, B, and C with 5 points and does not give other hulls one", () => {
    for (const id of ["zoltan-a", "zoltan-b", "zoltan-c"] as const) {
      const g = createGame(1, id);
      assert.equal(g.player.zoltan, 5, id);
    }
    const kestrel = createGame(1, "kestrel-a");
    assert.equal(kestrel.player.zoltan, undefined);
  });

  it("absorbs damage before regular shields and hull, and only a jump refills it", () => {
    const g = createGame(2, "zoltan-a");
    parkEngines(g);
    const hull = g.player.hull;
    const bubble = g.player.shieldNow;
    const sys = g.player.systems.weapons.damage;
    applyImpact(g, shot({ kind: "laser", damage: 2 }));
    assert.equal(g.player.zoltan, 3);
    assert.equal(g.player.shieldNow, bubble);
    assert.equal(g.player.hull, hull);
    assert.equal(g.player.systems.weapons.damage, sys);

    applyImpact(g, shot({ kind: "missile", damage: 2 }));
    assert.equal(g.player.zoltan, 1);
    assert.equal(g.player.shieldNow, bubble);
    assert.equal(g.player.hull, hull);

    applyImpact(g, shot({ kind: "laser", damage: 3 }));
    assert.equal(g.player.zoltan, 0);
    assert.equal(g.player.shieldNow, bubble - 1);
    assert.equal(g.player.hull, hull);

    g.player.zoltan = 1;
    g.player.shieldNow = 0;
    applyImpact(g, shot({ kind: "missile", damage: 4 }));
    assert.equal(g.player.zoltan, 0);
    assert.equal(g.player.hull, hull - 3);

    startCombat(g, "scout");
    quiet(g);
    g.player.zoltan = 2;
    advance(g, 15);
    assert.equal(g.player.zoltan, 2);

    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here && here.links[0]);
    g.phase = "map";
    g.fuel = 3;
    commitJump(g, here.links[0]);
    assert.equal(g.player.zoltan, 5);
  });

  it("doubles ion and beam damage against the bubble, and utility bombs do nothing to it", () => {
    const g = createGame(3, "zoltan-b");
    parkEngines(g);
    const hull = g.player.hull;
    applyImpact(g, shot({ kind: "ion", damage: 0, ion: 1 }));
    assert.equal(g.player.zoltan, 3);
    assert.equal(g.player.systems.weapons.ion.length, 0);
    assert.equal(g.player.hull, hull);

    applyImpact(g, shot({ kind: "beam", damage: 1, beamRooms: ["p-weapons", "p-sensors"] }));
    assert.equal(g.player.zoltan, 1);
    assert.equal(g.player.hull, hull);
    assert.equal(g.player.systems.weapons.damage, 0);
    assert.equal(g.player.systems.sensors.damage, 0);

    applyImpact(g, shot({ kind: "beam", damage: 3 }));
    assert.equal(g.player.zoltan, 0);
    assert.ok(g.player.hull < hull);

    const fresh = createGame(4, "zoltan-b");
    parkEngines(fresh);
    applyImpact(fresh, shot({ kind: "beam", damage: 0, defId: "antibio" }));
    assert.equal(fresh.player.zoltan, 3);
    assert.equal(fresh.player.hull, fresh.player.hullMax);

    const fire = roomFire(fresh);
    applyImpact(fresh, shot({ kind: "bomb", damage: 0, fireChance: 1 }));
    assert.equal(fresh.player.zoltan, 3);
    assert.equal(roomFire(fresh), fire);

    applyImpact(fresh, shot({ kind: "bomb", damage: 0, defId: "lockdown" }));
    assert.equal(fresh.player.zoltan, 3);
    assert.equal(fresh.player.rooms.find((r) => r.id === "p-weapons")?.lock ?? 0, 0);

    const plain = createGame(5);
    plain.player.systems.engines.power = 0;
    plain.player.systems.doors.level = 2;
    applyImpact(plain, shot({ kind: "bomb", damage: 0, defId: "lockdown" }));
    const room = plain.player.rooms.find((r) => r.id === "p-weapons");
    assert.equal(room?.lock, 12);
    const door = plain.player.doors.find(
      (d) =>
        (d.a === "p-weapons" && d.b === "p-sensors") || (d.a === "p-sensors" && d.b === "p-weapons"),
    );
    assert.ok(door);
    assert.equal(door.hp, 8);
  });
});

function roomFire(g: ReturnType<typeof createGame>) {
  return g.player.rooms.find((r) => r.id === "p-weapons")?.fire ?? 0;
}

describe("crystal lockdown", () => {
  it("coats for 12 seconds, recharges in 50, and blocks new passage", () => {
    const g = createGame(6, "crystal-a");
    startCombat(g, "scout");
    quiet(g);
    const shards = g.crew.filter((c) => c.kin === "shard" && c.hp > 0);
    const human = g.crew.find((c) => c.kin === "plain" && c.hp > 0);
    assert.ok(shards.length >= 2);
    assert.ok(human);
    const [first, second] = shards;

    assert.equal(lockdown(g, human.id), false);
    selectCrew(g, human.id);
    lockdownSelected(g);
    assert.equal(g.player.rooms.find((r) => r.id === human.room)?.lock ?? 0, 0);

    // Crystal A hall beside weapons shares that door and has an airlock. The traced picture has no sensors room.
    const from = "p-cah0";
    first.room = from;
    first.path = ["p-weapons"];
    first.move = 0;
    assert.equal(lockdown(g, first.id), true);
    assert.equal(g.player.rooms.find((r) => r.id === from)?.lock, 12);
    assert.equal(first.lockCool, 50);
    assert.equal(lockdown(g, first.id), false);

    second.room = "p-oxygen";
    assert.equal(lockdown(g, second.id), true);
    assert.equal(g.player.rooms.find((r) => r.id === "p-oxygen")?.lock, 12);

    advance(g, 2);
    assert.equal(first.room, "p-weapons");
    assert.ok((g.player.rooms.find((r) => r.id === from)?.lock ?? 0) > 0);

    human.room = from;
    human.path = [];
    orderCrew(g, human.id, "p-weapons");
    assert.deepEqual(human.path, []);

    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(foe);
    foe.aboard = "player";
    foe.room = "p-weapons";
    foe.path = [from];
    foe.move = 0;
    foe.think = 10;
    step(g, 0.05);
    assert.equal(foe.room, "p-weapons");
    assert.deepEqual(foe.path, []);

    const interior = g.player.doors.find(
      (d) =>
        (d.a === from && d.b === "p-weapons") || (d.a === "p-weapons" && d.b === from),
    );
    assert.ok(interior);
    interior.open = false;
    toggleDoor(g, from, "p-weapons");
    assert.equal(interior.open, false);
    const air = g.player.doors.find((d) => d.b === "void" && d.a === from);
    assert.ok(air);
    assert.equal(air.open, false);
    toggleDoor(g, from, "void");
    assert.equal(air.open, true);
    openAllDoors(g);
    assert.equal(interior.open, true);
    for (const door of g.player.doors) {
      if (door.b === "void" && door.open) toggleDoor(g, door.a, "void");
    }

    let guard = 0;
    while ((g.player.rooms.find((r) => r.id === from)?.lock ?? 0) > 0 && guard < 20000) {
      step(g, 0.05);
      guard += 1;
    }
    assert.ok(guard < 20000);
    // Crystal, "Crystal Lockdown": 50 seconds recharge and 12 seconds coating, so 38 seconds remain when the coating ends.
    assert.ok(Math.abs((first.lockCool ?? 0) - 38) < 0.15);

    advance(g, first.lockCool ?? 0);
    assert.ok((first.lockCool ?? 0) < 0.001);
  });

  it("recharges on a jump unless the Crystal is in the Clone Bay", () => {
    const g = createGame(7, "crystal-a");
    const shards = g.crew.filter((c) => c.kin === "shard");
    assert.ok(shards.length >= 2);
    shards[0].lockCool = 40;
    shards[1].lockCool = 40;
    shards[1].cloneIn = 6;
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    commitJump(g, here.links[0]);
    assert.equal(shards[0].lockCool, 0);
    assert.equal(shards[1].lockCool, 40);

    const bay = createGame(8, "zoltan-c");
    const crystal = {
      id: "gem",
      name: "Gem",
      side: "player" as const,
      aboard: "player" as const,
      hp: 125,
      maxHp: 125,
      room: "p-medbay",
      path: [] as string[],
      move: 0,
      think: 0,
      tone: 0,
      kin: "shard" as const,
      lockCool: 22,
    };
    // The jump rule reads the room title. This picture has no clone-bay icon, so the check uses a titled room.
    const clone = bay.player.rooms.find((r) => r.title === "Hall");
    assert.ok(clone);
    clone.title = "Clone Bay";
    crystal.room = clone.id;
    bay.crew.push(crystal);
    bay.player.zoltan = 0;
    const spot = bay.beacons.find((b) => b.id === bay.here);
    assert.ok(spot?.links[0]);
    commitJump(bay, spot.links[0]);
    assert.equal(crystal.lockCool, 22);
    assert.equal(bay.player.zoltan, 5);
  });
});
