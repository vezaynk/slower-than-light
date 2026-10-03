import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onNewSector } from "../extras/augments.ts";
import { deploy, swarmIntercept } from "../extras/swarm.ts";
import { applyImpact, commitJump, createGame, startCombat, step, waitHere } from "../sim.ts";
import { citedPierce } from "./cited-weapons.ts";
import type { Shot } from "../types.ts";

function shot(partial: Partial<Shot> & Pick<Shot, "kind" | "from" | "damage">): Shot {
  return {
    id: "s",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: "",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

describe("one-layer pierce, bombs, and the battery", () => {
  it("lets Heavy Pierce and crystal shots through one shield layer and not two", () => {
    assert.equal(citedPierce("heavypierce"), 1);
    assert.equal(citedPierce("crystalburst"), 1);
    assert.equal(citedPierce("heavycrystal2"), 1);
    assert.equal(citedPierce("burst2"), 0);
    assert.equal(citedPierce(undefined), 0);

    const g = createGame(1);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = 0;
    const room = enemy.rooms.find((item) => item.system);
    assert.ok(room);
    enemy.shieldNow = 1;
    enemy.hull = 10;
    applyImpact(
      g,
      shot({ kind: "laser", from: "player", damage: 2, defId: "heavypierce", targetRoom: room.id }),
    );
    assert.equal(enemy.shieldNow, 0);
    assert.equal(enemy.hull, 8);

    enemy.shieldNow = 2;
    enemy.hull = 10;
    applyImpact(
      g,
      shot({ kind: "laser", from: "player", damage: 2, defId: "crystalburst", targetRoom: room.id }),
    );
    assert.equal(enemy.shieldNow, 1);
    assert.equal(enemy.hull, 10);
  });

  it("heals 150 through a Zoltan Shield and repairs 8 system bars without touching fire", () => {
    const g = createGame(2);
    startCombat(g, "scout");
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = 0;
    enemy.zoltan = 5;
    const room = enemy.rooms.find((item) => item.system);
    assert.ok(room && room.system);
    const crew = g.crew.find((member) => member.side === "player");
    assert.ok(crew);
    crew.aboard = "enemy";
    crew.room = room.id;
    crew.hp = 10;
    crew.maxHp = 100;
    applyImpact(g, shot({ kind: "bomb", from: "player", damage: 0, defId: "healburst", targetRoom: room.id }));
    assert.equal(crew.hp, 100);
    assert.equal(enemy.zoltan, 5);

    enemy.systems[room.system].damage = 3;
    room.fire = 1;
    room.breach = 1;
    applyImpact(g, shot({ kind: "bomb", from: "player", damage: 0, defId: "repairburst", targetRoom: room.id }));
    assert.equal(enemy.systems[room.system].damage, 0);
    assert.equal(room.fire, 1);
    assert.equal(room.breach, 1);
    assert.equal(enemy.zoltan, 5);
  });

  it("lets the battery hit hull and ignores a defense drone and a Zoltan Shield", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    g.player.systems.engines.power = 0;
    g.player.zoltan = 5;
    g.player.parts = 2;
    g.player.kits.swarm = { id: "swarm", level: 3, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    assert.equal(deploy(g, "ward"), true);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "env" }), false);
    assert.equal(g.player.kits.swarm?.cool, 0);
    const room = g.player.rooms[0];
    const hull = g.player.hull;
    applyImpact(
      g,
      shot({
        kind: "missile",
        from: "env",
        damage: 3,
        breachChance: 1,
        targetRoom: room.id,
        label: "Artillery",
      }),
    );
    assert.equal(g.player.zoltan, 5);
    assert.equal(g.player.hull, hull - 3);
    assert.equal(room.breach, 1);
    assert.equal(g.player.kits.swarm?.cool ?? 0, 0);
  });
});

describe("Distraction Buoys at a fleet of 0", () => {
  it("skips the next advance and then lets the following jump count", () => {
    const g = createGame(4);
    g.sector = 3;
    g.augments = ["falsebuoy"];
    g.fleet = 0;
    g.fuel = 6;
    g.phase = "map";
    onNewSector(g);
    assert.equal(g.buoyDelay, 1);
    const here = g.beacons.find((beacon) => beacon.id === g.here);
    const dest = g.beacons.find((beacon) => beacon.id !== g.here);
    assert.ok(here && dest);
    if (!here.links.includes(dest.id)) here.links.push(dest.id);
    dest.kind = "empty";
    commitJump(g, dest.id);
    assert.equal(g.fleet, 0);
    assert.equal(g.buoyDelay, 0);
    const next = g.beacons.find((beacon) => beacon.id !== dest.id && beacon.id !== here.id);
    assert.ok(next);
    if (!dest.links.includes(next.id)) dest.links.push(next.id);
    next.kind = "empty";
    commitJump(g, next.id);
    assert.equal(g.fleet, 1);
  });
});

describe("fleet dive fuel", () => {
  it("pays 1 fuel for jumping into the fleet, and 4 when the fleet takes an empty tank", () => {
    const jumped = createGame(2);
    jumped.phase = "map";
    jumped.fuel = 3;
    jumped.fleet = 3;
    jumped.scrap = 40;
    const here = jumped.beacons.find((beacon) => beacon.id === jumped.here);
    const dest = jumped.beacons.find((beacon) => beacon.id !== jumped.here);
    assert.ok(here && dest);
    dest.col = 1;
    dest.kind = "store";
    dest.resolved = false;
    if (!here.links.includes(dest.id)) here.links.push(dest.id);
    commitJump(jumped, dest.id);
    assert.equal(jumped.phase, "combat");
    assert.equal(jumped.enemy?.name, "Rebel Elite");
    assert.equal(jumped.pending, "dive:1");
    assert.equal(jumped.fuel, 2);
    assert.ok(jumped.enemy);
    jumped.enemy.hull = 0;
    step(jumped, 0.01);
    assert.equal(jumped.phase, "reward");
    assert.equal(jumped.fuel, 3);
    assert.equal(jumped.scrap, 40);
    assert.equal(jumped.reward?.scrap, 0);
    assert.equal(jumped.kills, 1);

    const waiting = createGame(3);
    waiting.phase = "map";
    waiting.fuel = 0;
    waiting.fleet = 0;
    waiting.scrap = 11;
    const spot = waiting.beacons.find((beacon) => beacon.id === waiting.here);
    assert.ok(spot);
    spot.col = 0;
    spot.resolved = false;
    waitHere(waiting);
    assert.equal(waiting.phase, "combat");
    assert.equal(waiting.pending, "dive:4");
    assert.ok(waiting.enemy);
    waiting.enemy.hull = 0;
    step(waiting, 0.01);
    assert.equal(waiting.fuel, 4);
    assert.equal(waiting.scrap, 11);
    assert.equal(waiting.reward?.scrap, 0);
  });

  it("leaves a fueled wait on the map, and does not dive in sector 8", () => {
    const waiting = createGame(2);
    waiting.phase = "map";
    waiting.fuel = 2;
    waiting.fleet = 1;
    const spot = waiting.beacons.find((beacon) => beacon.id === waiting.here);
    assert.ok(spot);
    spot.col = 0;
    const hull = waiting.player.hull;
    waitHere(waiting);
    assert.equal(waiting.phase, "map");
    assert.equal(waiting.player.hull, Math.max(1, hull - 2));

    const last = createGame(1);
    last.sector = 8;
    last.ramId = null;
    last.phase = "map";
    last.fuel = 4;
    last.fleet = 5;
    const from = last.beacons.find((beacon) => beacon.id === last.here);
    const dest = last.beacons.find((beacon) => beacon.id !== last.here);
    assert.ok(from && dest);
    dest.col = 1;
    dest.kind = "empty";
    dest.resolved = false;
    if (!from.links.includes(dest.id)) from.links.push(dest.id);
    commitJump(last, dest.id);
    assert.notEqual(last.pending, "dive:1");
    assert.notEqual(last.enemy?.name, "Rebel Elite");
  });
});

describe("flagship stages inside the fight", () => {
  it("applies stage 2 and stage 3 numbers when the hull is destroyed", () => {
    const g = createGame(5);
    const boss = g.beacons.find((beacon) => beacon.kind === "exit");
    assert.ok(boss);
    boss.kind = "boss";
    g.here = boss.id;
    startCombat(g, "boss");
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.ramStage, 2);
    assert.equal(g.enemy?.hull, 22);
    assert.equal(g.enemy?.reactor, 44);
    assert.equal(g.enemy?.systems.engines.level, 3);
    assert.deepEqual(
      g.enemy?.weapons.map((weapon) => weapon.defId),
      ["bossmissile"],
    );
    assert.equal(g.enemy?.zoltan, undefined);
    g.enemy!.hull = 0;
    step(g, 0.01);
    assert.equal(g.ramStage, 3);
    assert.equal(g.enemy?.hull, 20);
    assert.equal(g.enemy?.reactor, 32);
    assert.equal(g.enemy?.zoltan, 12);
    assert.equal(g.enemy?.systems.weapons.level, 4);
    const afterTwo = g.scrap;
    assert.ok(afterTwo - 10 >= 19 * 2 && afterTwo - 10 <= 23 * 2, String(afterTwo));
    g.enemy!.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "victory");
    assert.equal(g.scrap, afterTwo);
  });
});
