import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tickEnemyDrones } from "../extras/swarm.ts";
import { applyImpact, applyPulsarPulse, createGame, startCombat } from "../sim.ts";
import type { Game, Shot, SysId } from "../types.ts";

function ionCount(g: Game, side: "player" | "enemy"): number {
  const ship = side === "player" ? g.player : g.enemy;
  if (!ship) return 0;
  return (Object.keys(ship.systems) as SysId[]).filter((id) => ship.systems[id].ion.length > 0).length;
}

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

function still(g: Game) {
  g.player.systems.engines.power = 0;
  if (g.enemy) g.enemy.systems.engines.power = 0;
}

describe("reverse ion field", () => {
  it("lets two copies keep the bubble and stop a pulsar, an ion shot, and an ion bomb", () => {
    const pulse = createGame(3);
    startCombat(pulse, "Pirate ship", false, "rebel-fight-near-pulsar");
    pulse.augments = ["baffle", "baffle"];
    pulse.player.zoltan = 5;
    applyPulsarPulse(pulse);
    assert.equal(pulse.player.zoltan, 5);
    assert.equal(ionCount(pulse, "player"), 0);
    assert.ok(ionCount(pulse, "enemy") > 0);
    assert.ok(pulse.log.includes("Reverse Ion Field shrugged that off."));

    const bare = createGame(4);
    startCombat(bare, "Pirate ship", false, "pirate-fight-near-pulsar");
    bare.augments = ["baffle", "baffle"];
    bare.player.systems.shields.level = 0;
    bare.player.zoltan = 5;
    applyPulsarPulse(bare);
    assert.equal(bare.player.zoltan, 5);
    assert.equal(ionCount(bare, "player"), 0);

    const hit = createGame(5, "zoltan-a");
    still(hit);
    hit.augments = ["baffle", "baffle"];
    const layers = hit.player.shieldNow;
    applyImpact(hit, shot({ kind: "ion", damage: 0, ion: 1 }));
    assert.equal(hit.player.zoltan, 5);
    assert.equal(hit.player.shieldNow, layers);
    assert.equal(hit.player.systems.weapons.ion.length, 0);

    hit.player.shieldNow = 0;
    applyImpact(hit, shot({ kind: "ion", damage: 0, ion: 1 }));
    assert.equal(hit.player.zoltan, 5);
    assert.equal(hit.player.systems.weapons.ion.length, 1);

    hit.player.systems.weapons.ion = [];
    applyImpact(hit, shot({ kind: "bomb", damage: 0, ion: 4, defId: "ionbomb" }));
    assert.equal(hit.player.zoltan, 5);
    assert.equal(hit.player.systems.weapons.ion.length, 0);

    const enemy = createGame(6);
    startCombat(enemy, "scout");
    still(enemy);
    enemy.augments = ["baffle", "baffle"];
    const room = enemy.enemy?.rooms.find((item) => item.system);
    assert.ok(room && enemy.enemy);
    enemy.enemy.zoltan = 5;
    applyImpact(enemy, shot({ kind: "ion", from: "player", damage: 0, ion: 1, targetRoom: room.id }));
    assert.equal(enemy.enemy.zoltan, 3);
  });

  it("resists half the time with one copy, and a miss still spends the bubble", () => {
    let held = 0;
    let spent = 0;
    for (let seed = 1; seed < 80 && (held === 0 || spent === 0); seed++) {
      const g = createGame(seed, "zoltan-a");
      still(g);
      g.augments = ["baffle"];
      g.player.shieldNow = 2;
      applyImpact(g, shot({ kind: "ion", damage: 0, ion: 1 }));
      if (g.player.zoltan === 5 && g.player.systems.weapons.ion.length === 0) held += 1;
      if (g.player.zoltan === 3 && g.player.systems.weapons.ion.length === 0) spent += 1;
    }
    assert.ok(held > 0);
    assert.ok(spent > 0);

    let through = 0;
    let soaked = 0;
    for (let seed = 1; seed < 80 && (through === 0 || soaked === 0); seed++) {
      const g = createGame(seed, "zoltan-a");
      still(g);
      g.augments = ["baffle"];
      g.player.shieldNow = 0;
      applyImpact(g, shot({ kind: "ion", damage: 0, ion: 1 }));
      if (g.player.zoltan === 5 && g.player.systems.weapons.ion.length === 1) through += 1;
      if (g.player.zoltan === 3 && g.player.systems.weapons.ion.length === 0) soaked += 1;
    }
    assert.ok(through > 0);
    assert.ok(soaked > 0);

    let clear = 0;
    let drained = 0;
    for (let seed = 1; seed < 80 && (clear === 0 || drained === 0); seed++) {
      const g = createGame(seed);
      startCombat(g, "Pirate ship", false, "lanius-fight-near-pulsar");
      g.augments = ["baffle"];
      g.player.zoltan = 5;
      applyPulsarPulse(g);
      if (g.player.zoltan === 5 && ionCount(g, "player") === 0) clear += 1;
      if ((g.player.zoltan === 2 || g.player.zoltan === 1) && ionCount(g, "player") === 0) drained += 1;
    }
    assert.ok(clear > 0);
    assert.ok(drained > 0);
  });

  it("stops an enemy ion intruder's ion and still stuns the crew in that room", () => {
    const g = createGame(9);
    startCombat(g, "scout");
    g.augments = ["baffle", "baffle"];
    const room = g.player.rooms.find((item) => item.system === "weapons");
    assert.ok(room);
    for (const c of g.crew) {
      if (c.aboard === "player") c.room = room.id;
    }
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.parts = 8;
    enemy.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 3,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
      loadout: ["ionintruder"],
      drones: [
        {
          id: "ed-ion",
          kind: "ionintruder",
          alive: true,
          powered: true,
          aux: 0,
          cool: 0,
          fly: 0,
          room: room.id,
          hp: 125,
          left: 0.01,
        },
      ],
    };
    tickEnemyDrones(g, 0.02);
    assert.equal(g.player.systems.weapons.ion.length, 0);
    assert.ok(g.crew.some((c) => c.aboard === "player" && c.room === room.id && (c.stun ?? 0) >= 6));
    assert.ok(g.log.includes("Reverse Ion Field shrugged that off."));
  });
});
