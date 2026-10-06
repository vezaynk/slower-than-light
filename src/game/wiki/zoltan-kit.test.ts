import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installLeash } from "../extras/leash.ts";
import { armSpike, installSpike, launchSpike } from "../extras/spike.ts";
import { installVeil, startVeil } from "../extras/veil.ts";
import { createGame, kitBars, noteZoltanKits, sparePower, startCombat, zoltanBars } from "../sim.ts";
import type { Crew, Game } from "../types.ts";

function spark(room: string, id: string, hp = 70): Crew {
  return {
    id,
    name: id,
    side: "player",
    aboard: "player",
    hp,
    maxHp: 70,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    kin: "spark",
  };
}

function fit(g: Game) {
  g.scrap = 500;
}

describe("Zoltan bar on kit systems", () => {
  it("runs cloaking from a Zoltan without spending a reactor bar", () => {
    const g = createGame(21);
    fit(g);
    installVeil(g);
    const kit = g.player.kits.veil;
    const room = g.player.rooms.find((r) => r.kit === "veil");
    assert.ok(kit && room);
    kit.power = 0;
    const spare = sparePower(g.player);
    assert.equal(startVeil(g), undefined);
    assert.equal(kit.on, false);

    g.crew.push(spark(room.id, "z-cloak"));
    startVeil(g);
    assert.equal(kit.on, true);
    assert.equal(kit.power, 0);
    assert.equal(kitBars(kit), 1);
    assert.equal(sparePower(g.player), spare);

    g.crew.find((c) => c.id === "z-cloak")!.room = "p-sensors";
    noteZoltanKits(g);
    assert.equal(kitBars(kit), 0);
    assert.equal(kit.power, 0);
  });

  it("caps the yellow bars at the undamaged levels and ignores a dead Zoltan", () => {
    const g = createGame(22);
    fit(g);
    installLeash(g);
    const kit = g.player.kits.leash;
    const room = g.player.rooms.find((r) => r.kit === "leash");
    assert.ok(kit && room);
    kit.level = 3;
    kit.power = 0;
    const spare = sparePower(g.player);
    g.crew.push(spark(room.id, "z1"), spark(room.id, "z2"), spark(room.id, "z3"), spark(room.id, "z4"));
    g.crew.push(spark("p-pilot", "z-pilot"));
    noteZoltanKits(g);
    assert.equal(kitBars(kit), 3);
    assert.equal(kit.power, 0);
    assert.equal(sparePower(g.player), spare);
    assert.equal(zoltanBars(g.crew, g.player, "player", "pilot"), 0);

    kit.damage = 2;
    assert.equal(kitBars(kit), 1);
    for (const c of g.crew) if (c.kin === "spark") c.hp = 0;
    noteZoltanKits(g);
    assert.equal(kitBars(kit), 0);
  });

  it("lets a Zoltan power hacking and an enemy kit room", () => {
    const g = createGame(23);
    fit(g);
    g.player.parts = 1;
    assert.equal(installSpike(g), true);
    const kit = g.player.kits.spike;
    const room = g.player.rooms.find((r) => r.kit === "spike");
    assert.ok(kit && room);
    kit.power = 0;
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.zoltan = undefined;
    for (const w of g.enemy.weapons) w.enabled = false;
    assert.equal(armSpike(g, "weapons"), true);
    g.crew.push(spark(room.id, "z-hack"));
    assert.equal(launchSpike(g), true);
    assert.equal(kit.power, 0);
  });

  it("adds one bar in an enemy kit room and does not raise that kit's reactor power", () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const g = createGame(seed);
      g.sector = 6;
      startCombat(g, "Crystal ship");
      const enemy = g.enemy;
      const enemyRoom = enemy?.rooms.find((r) => r.kit && enemy.kits[r.kit]);
      if (!enemy || !enemyRoom?.kit) continue;
      const enemyKit = enemy.kits[enemyRoom.kit]!;
      enemyKit.zoltan = 0;
      const without = kitBars(enemyKit);
      const power = enemyKit.power;
      g.crew.push({
        ...spark(enemyRoom.id, "z-foe"),
        side: "enemy",
        aboard: "enemy",
      });
      noteZoltanKits(g);
      const cap = Math.max(0, enemyKit.level - (enemyKit.damage ?? 0));
      assert.equal(enemyKit.power, power);
      assert.equal(kitBars(enemyKit), Math.min(cap, without + 1));
      found = true;
    }
    assert.equal(found, true);
  });
});
