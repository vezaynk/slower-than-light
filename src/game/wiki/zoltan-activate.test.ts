import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { startLeash } from "../extras/leash.ts";
import { sendSling } from "../extras/sling.ts";
import { launchSpike } from "../extras/spike.ts";
import { startVeil } from "../extras/veil.ts";
import { applyImpact, createGame, startCombat, step } from "../sim.ts";
import type { Crew, Kit, KitId, Shot } from "../types.ts";

function spark(room: string, id: string): Crew {
  return {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp: 70,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "spark",
  };
}

function kit(id: KitId, power: number): Kit {
  return { id, level: 1, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function ionShot(room: string, points: number): Shot {
  return {
    id: "ion",
    kind: "ion",
    from: "enemy",
    damage: 0,
    ion: points,
    fireChance: 0,
    breachChance: 0,
    targetRoom: room,
    wait: 0,
    t: 1,
    duration: 1,
  };
}

describe("Zoltans ionized activation", () => {
  it("refuses cloaking, hacking, mind control, and the teleporter", () => {
    // Zoltans: "Cloaking, Hacking, Mind Control, and Crew Teleporter cannot be activated if they are ionized".
    const g = createGame(30);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.player.systems.engines.power = 0;
    g.player.systems.shields.power = 0;
    g.player.shieldNow = 0;
    g.player.parts = 4;
    g.enemy.zoltan = 0;
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy.weapons) w.enabled = false;
    if (g.enemy.kits.veil) {
      g.enemy.kits.veil.on = false;
      g.enemy.kits.veil.power = 0;
    }

    const room = g.player.rooms.find((item) => item.system === "sensors");
    assert.ok(room);
    for (const item of g.player.rooms) delete item.kit;
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0 && c.kin !== "gel");
    assert.ok(foe);
    const pad = g.enemy.rooms.find((item) => item.system)?.id;
    assert.ok(pad);

    const strike = (id: KitId, points: number) => {
      room.kit = id;
      applyImpact(g, ionShot(room.id, points));
    };

    g.player.kits.veil = kit("veil", 0);
    strike("veil", 6);
    assert.equal(g.player.kits.veil.ion?.length, 5);
    assert.ok(g.player.kits.veil.ion?.every((t) => t === 5));
    g.crew.push(spark(room.id, "z-cloak"));
    startVeil(g);
    assert.equal(g.player.kits.veil.on, false);

    g.player.kits.spike = kit("spike", 1);
    g.player.kits.spike.target = "shields";
    const parts = g.player.parts;
    strike("spike", 1);
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, parts);

    g.player.kits.leash = kit("leash", 1);
    // Mind Control, Overview: the hold needs a view. This test ions the Sensors room, so a living Slug is the view.
    const watcher = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(watcher);
    watcher.kin = "gel";
    strike("leash", 1);
    startLeash(g, foe.id);
    assert.equal(foe.leashed ?? 0, 0);

    g.player.kits.sling = kit("sling", 1);
    strike("sling", 1);
    sendSling(g, pad);
    assert.ok(g.crew.filter((c) => c.side === "player").every((c) => c.aboard === "player"));

    delete g.player.kits.spike.ion;
    assert.equal(launchSpike(g), true);
    assert.equal(g.player.parts, parts - 1);

    delete g.player.kits.leash.ion;
    startLeash(g, foe.id);
    assert.ok((foe.leashed ?? 0) > 0);

    delete g.player.kits.sling.ion;
    // Crew Teleporter: a send needs someone standing in the teleporter room.
    const standing = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(standing);
    const slingRoom = g.player.rooms.find((r) => r.kit === "sling") ?? g.player.rooms[0];
    assert.ok(slingRoom);
    standing.room = slingRoom.id;
    standing.path = [];
    sendSling(g, pad);
    assert.ok(g.crew.some((c) => c.side === "player" && c.aboard === "enemy"));

    for (let i = 0; i < 101; i++) step(g, 0.05);
    assert.equal(g.player.kits.veil.ion, undefined);
    const body = g.crew.find((c) => c.id === "z-cloak");
    assert.ok(body);
    body.room = room.id;
    body.path = [];
    room.kit = "veil";
    startVeil(g);
    assert.equal(g.player.kits.veil.on, true);
  });
});
