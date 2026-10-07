import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, evasionPercent, ftlSeconds, roomWith, startCombat, step } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { WEAPONS } from "../content.ts";
import {
  enemyHackTargets,
  enemyHackView,
  hackFreezesFtl,
  hackHoldsShields,
  hackHoldsWeapons,
  hackLocksDoor,
  launchSpike,
  launchEnemySpike,
  playerCloakHacked,
  tickEnemySpike,
  tickSpike,
} from "./spike.ts";
import { sideOf } from "./leash.ts";
import type { Game, Kit } from "../types.ts";

function kit(level: number, power = level): Kit {
  return { id: "spike", level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/** A fight whose enemy has only a Hacking kit (room `e-hacking`), drone parts, and no guns. */
function fight(seed: number, level = 2, classId = "rebel-fighter"): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.kits = { spike: kit(level) };
  g.enemy.classId = classId;
  g.enemy.parts = 3;
  g.enemy.weapons = [];
  g.enemy.automated = false;
  g.player.zoltan = undefined;
  return g;
}

/** Same, with the drone already latched onto `target` and ready to pulse. */
function latched(target: string, level = 2, seed = 7): Game {
  const g = fight(seed, level);
  const k = g.enemy!.kits.spike!;
  k.target = target;
  k.hackLatched = true;
  return g;
}

const spike = (g: Game) => g.enemy!.kits.spike!;

describe("enemy hacking: launch and flight", () => {
  it("picks a random player system each launch", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = fight(seed);
      assert.equal(launchEnemySpike(g), true);
      const t = spike(g).target!;
      assert.ok(enemyHackTargets(g).includes(t), t);
      seen.add(t);
    }
    assert.ok(seen.size >= 4, [...seen].join(","));
  });

  it("caps hacking at level 2 except Lanius Scouts and Engi Hackers", () => {
    const capped = fight(1, 3, "auto-hacker");
    tickEnemySpike(capped, 0.01);
    assert.equal(spike(capped).level, 2);
    assert.equal(spike(capped).power, 2);
    for (const id of ["engi-hacker", "lanius-scout"]) {
      const g = fight(1, 3, id);
      tickEnemySpike(g, 0.01);
      assert.equal(spike(g).level, 3, id);
    }
  });

  it("spends one part, flies 2-3 s, then latches", () => {
    const g = fight(5);
    assert.equal(launchEnemySpike(g), true);
    const k = spike(g);
    assert.equal(g.enemy!.parts, 2);
    assert.ok(k.hackFly! >= 2 && k.hackFly! <= 3, String(k.hackFly));
    assert.equal(launchEnemySpike(g), false, "one drone at a time");
    tickEnemySpike(g, 1.9);
    assert.equal(k.hackLatched, undefined);
    assert.equal(enemyHackView(g)?.phase, "flying");
    tickEnemySpike(g, 1.2);
    assert.equal(k.hackLatched, true);
    assert.equal(k.hackFly, undefined);
    assert.equal(g.enemy!.parts, 2);
  });

  it("needs a part and a working system; an unpowered drone freezes in flight", () => {
    const dry = fight(2);
    dry.enemy!.parts = 0;
    tickEnemySpike(dry, 0.1);
    assert.equal(spike(dry).hackFly, undefined);

    const g = fight(3);
    tickEnemySpike(g, 0.1);
    const k = spike(g);
    const fly = k.hackFly!;
    k.damage = k.level;
    k.power = 0;
    tickEnemySpike(g, 5);
    assert.equal(k.hackFly, fly);
  });

  it("a player Defense Drone shoots the flying drone down; it relaunches after a delay", () => {
    let downed = false;
    for (let seed = 1; seed <= 20 && !downed; seed++) {
      const g = fight(seed);
      g.player.kits.swarm = { id: "swarm", level: 3, power: 3, left: 0, cool: 0, target: "ward", on: true, aux: 0 };
      assert.equal(launchEnemySpike(g), true);
      for (let i = 0; i < 70 && spike(g).hackFly != null; i++) tickEnemySpike(g, 0.05);
      if (!spike(g).hackLatched && spike(g).hackFly == null) {
        downed = true;
        assert.equal(spike(g).target, null);
        assert.ok(spike(g).cool > 0);
      }
    }
    assert.ok(downed, "never shot down");
  });

  it("cannot launch at a Zoltan Shield, and a flying drone breaks on one", () => {
    const g = fight(4);
    g.player.zoltan = 5;
    assert.equal(launchEnemySpike(g), false);
    assert.equal(g.enemy!.parts, 3);

    g.player.zoltan = undefined;
    assert.equal(launchEnemySpike(g), true);
    g.player.zoltan = 5;
    tickEnemySpike(g, 3.1);
    const k = spike(g);
    assert.equal(k.hackLatched, false);
    assert.equal(k.target, null);
    assert.equal(g.player.zoltan, 5, "the bubble takes no damage");
    assert.ok(k.cool > 0, "relaunch waits a short delay");
  });
});

describe("enemy hacking: pulse effects", () => {
  it("pulses 4/7/10 s by level, then cools 20 s", () => {
    for (const [level, seconds] of [
      [1, 4],
      [2, 7],
      [3, 10],
    ] as const) {
      const g = latched("oxygen", level);
      g.enemy!.classId = "engi-hacker";
      tickEnemySpike(g, 0.01);
      assert.equal(spike(g).left, seconds);
      tickEnemySpike(g, seconds);
      assert.equal(spike(g).on, false);
      assert.equal(spike(g).cool, 20);
    }
  });

  it("discharges a shield layer every 2 s and holds the recharge", () => {
    const g = latched("shields");
    g.player.shieldNow = 2;
    tickEnemySpike(g, 0.01);
    assert.equal(hackHoldsShields(g, g.player), true);
    assert.equal(hackHoldsShields(g, g.enemy!), false);
    tickEnemySpike(g, 2);
    assert.equal(g.player.shieldNow, 1);
  });

  it("drains player weapons at base speed and stops them charging", () => {
    const g = latched("weapons");
    for (const w of g.player.weapons) w.charge = 1;
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 1);
    for (const w of g.player.weapons) {
      const seconds = WEAPONS[w.defId]!.charge;
      assert.ok(w.charge <= 0.99);
      assert.ok(Math.abs(w.charge - Math.min(0.99, 1 - 1 / seconds)) < 1e-6);
    }
    assert.equal(hackHoldsWeapons(g, "player"), true);
    assert.equal(hackHoldsWeapons(g, "enemy"), false);
  });

  it("zeroes the player's evasion and freezes FTL on Engines or Piloting", () => {
    for (const target of ["engines", "pilot"]) {
      const g = latched(target);
      assert.notEqual(ftlSeconds(g, g.player), null);
      tickEnemySpike(g, 0.01);
      assert.equal(hackFreezesFtl(g, g.player), true);
      assert.equal(ftlSeconds(g, g.player), null);
      assert.equal(evasionPercent(g, g.player, "player"), 0);
    }
  });

  it("drains oxygen 6%/s and hurts the player's crew in the medbay 13/s", () => {
    const g = latched("oxygen");
    for (const r of g.player.rooms) r.o2 = 100;
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 1);
    for (const r of g.player.rooms) assert.ok(Math.abs(r.o2 - 94) < 1e-6);

    const m = latched("medbay");
    const bay = roomWith(m.player, "medbay")!;
    const crew = m.crew.find((c) => c.side === "player")!;
    crew.room = bay.id;
    crew.aboard = "player";
    crew.hp = 100;
    tickEnemySpike(m, 0.01);
    tickEnemySpike(m, 1);
    assert.ok(Math.abs(crew.hp - 87) < 1e-6, String(crew.hp));
  });

  it("locks the hacked room's doors, and every door on a Doors pulse, as level-3 blast doors for the player", () => {
    const g = latched("doors");
    const room = roomWith(g.player, "doors")!.id;
    const own = g.player.doors.filter((d) => d.b !== "void" && (d.a === room || d.b === room));
    const other = g.player.doors.find((d) => d.b !== "void" && d.a !== room && d.b !== room)!;
    for (const d of g.player.doors) d.open = true;
    g.enemy!.kits.spike!.cool = 5;
    tickEnemySpike(g, 0.01);
    assert.ok(own.length > 0);
    for (const d of own) {
      assert.equal(d.open, false);
      assert.equal(hackLocksDoor(g, g.player, d), true);
    }
    assert.equal(other.open, true, "only the hacked room before the pulse");
    tickEnemySpike(g, 5);
    tickEnemySpike(g, 0.01);
    assert.equal(spike(g).on, true);
    assert.equal(other.open, false);
    assert.equal(hackLocksDoor(g, g.player, other), true);
    const airlock = g.player.doors.find((d) => d.b === "void");
    if (airlock) assert.equal(airlock.open, true);
    assert.ok(g.player.rooms.some((r) => r.hacked === "pulse"));
  });

  it("stops the player's crew at a hacked door while enemy boarders walk through", () => {
    const g = latched("doors");
    tickEnemySpike(g, 0.01);
    const door = g.player.doors.find((d) => d.b !== "void" && d.hacked)!;
    const crew = g.crew.find((c) => c.side === "player")!;
    for (const c of g.crew) if (c !== crew) c.hp = c.side === "player" ? c.hp : 0;
    crew.aboard = "player";
    crew.room = door.a;
    crew.path = [door.b];
    crew.move = 0;
    step(g, 0.05);
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(crew.room, door.a, "player crew still breaking the door");

    const g2 = latched("doors");
    tickEnemySpike(g2, 0.01);
    const d2 = g2.player.doors.find((d) => d.b !== "void" && d.hacked)!;
    const foe = g2.crew.find((c) => c.side === "enemy")!;
    foe.aboard = "player";
    foe.room = d2.a;
    foe.path = [d2.b];
    foe.move = 0;
    for (let i = 0; i < 40; i++) step(g2, 0.05);
    assert.notEqual(foe.room, d2.a, "boarder passed the hacked door");
  });

  it("ends the player's cloak and blocks a new one", () => {
    const g = latched("veil");
    g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    tickEnemySpike(g, 0.01);
    const veil = g.player.kits.veil!;
    assert.equal(veil.on, false);
    assert.equal(veil.cool, 20);
    assert.equal(playerCloakHacked(g), true);
    veil.cool = 0;
    veil.on = true;
    veil.left = 5;
    tickEnemySpike(g, 0.1);
    assert.equal(veil.on, false);
    assert.equal(veil.cool, 20);
  });

  it("ends the player's own hack and blocks a launch", () => {
    const g = latched("spike");
    g.player.kits.spike = { id: "spike", level: 1, power: 1, left: 3, cool: 0, target: "shields", on: true, aux: 0 };
    g.player.parts = 2;
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 0.1);
    const own = g.player.kits.spike!;
    assert.equal(own.on, false);
    assert.equal(own.cool, 20);
    own.cool = 0;
    assert.equal(launchSpike(g), false);
    assert.equal(g.player.parts, 2);
  });

  it("turns one player crew member and frees enemy crew the player holds; not from automated ships", () => {
    const g = latched("leash");
    g.player.kits.leash = { id: "leash", level: 1, power: 1, left: 10, cool: 0, target: null, on: true, aux: 0 };
    const foe = g.crew.find((c) => c.side === "enemy")!;
    foe.leashed = 10;
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 0.1);
    assert.equal(foe.leashed, undefined);
    const turned = g.crew.filter((c) => c.side === "player" && sideOf(c) === "enemy");
    assert.equal(turned.length, 1);
    assert.equal(spike(g).hackHeld, turned[0]!.id);
    tickEnemySpike(g, 7);
    assert.equal(sideOf(turned[0]!), "player");

    const auto = latched("leash");
    auto.enemy!.automated = true;
    tickEnemySpike(auto, 0.01);
    tickEnemySpike(auto, 0.1);
    assert.equal(auto.crew.filter((c) => c.side === "player" && sideOf(c) === "enemy").length, 0);
  });

  it("recalls the player's boarders and cools the teleporter", () => {
    const g = latched("sling");
    g.player.kits.sling = { id: "sling", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    seatKits(g.player);
    const pad = g.player.rooms.find((r) => r.kit === "sling");
    assert.ok(pad);
    const crew = g.crew.find((c) => c.side === "player")!;
    crew.aboard = "enemy";
    crew.room = g.enemy!.rooms[0]!.id;
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 0.1);
    assert.equal(crew.aboard, "player");
    // Crew Teleporter: a retrieved crewmember fits in the teleporter room.
    assert.equal(crew.room, pad.id);
    assert.equal(g.player.kits.sling!.cool, 15);
  });

  it("seats a hacked retrieve in the teleporter room and the overflow next door", () => {
    // Crew Teleporter: "Retrieved crew that cannot fit in the teleporter room will be placed in adjacent room(s)."
    // Hacking does not reprint "up to 4", so every hostile boarder comes back.
    const g = latched("sling");
    g.player.kits.sling = { id: "sling", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    seatKits(g.player);
    const pad = g.player.rooms.find((r) => r.kit === "sling");
    assert.ok(pad);
    assert.equal(pad.w * pad.h - (pad.omit?.length ?? 0), 2);
    const neighbors = g.player.doors.flatMap((d) => {
      if (d.b === "void") return [];
      if (d.a === pad.id) return [d.b];
      if (d.b === pad.id) return [d.a];
      return [];
    });
    assert.ok(neighbors.length > 0);
    const source = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(source);
    while (g.crew.filter((c) => c.side === "player" && c.hp > 0).length < 5) {
      const n = g.crew.length;
      g.crew.push({ ...source, id: `c-hack-${n}`, name: `Hack ${n}`, path: [] });
    }
    for (const c of g.crew) {
      if (c.side !== "player" || c.hp <= 0) continue;
      c.aboard = "enemy";
      c.room = g.enemy!.rooms[0]!.id;
      c.path = [];
    }
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 0.1);
    const back = g.crew.filter((c) => c.side === "player" && c.aboard === "player" && c.hp > 0);
    assert.equal(back.length, 5);
    assert.equal(back.filter((c) => c.room === pad.id).length, 2);
    const overflow = back.filter((c) => c.room !== pad.id);
    assert.equal(overflow.length, 3);
    for (const c of overflow) assert.ok(neighbors.includes(c.room));
  });

  it("lands their recalled boarders in their teleporter room, overflow adjacent", () => {
    const g = fight(8);
    g.enemy!.kits.spike!.cool = 999;
    const foe = g.enemy!;
    const pad = foe.rooms[0]!;
    pad.kit = "sling";
    pad.w = 2;
    pad.h = 1;
    delete pad.omit;
    const next = foe.rooms.find((r) => r.id !== pad.id);
    assert.ok(next);
    if (!foe.doors.some((d) => (d.a === pad.id && d.b === next.id) || (d.b === pad.id && d.a === next.id))) {
      foe.doors.unshift({ a: pad.id, b: next.id, open: true, hp: 0, stuck: 0 });
    }
    foe.kits.sling = { id: "sling", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    const source = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(source);
    while (g.crew.filter((c) => c.side === "enemy" && c.hp > 0).length < 3) {
      const n = g.crew.length;
      g.crew.push({ ...source, id: `e-hack-${n}`, name: `Foe ${n}`, path: [] });
    }
    for (const c of g.crew) {
      if (c.side !== "enemy" || c.hp <= 0) continue;
      c.aboard = "player";
      c.room = g.player.rooms[0]!.id;
      c.path = [];
      delete c.leashed;
    }
    g.player.kits.spike = {
      id: "spike",
      level: 1,
      power: 1,
      left: 4,
      cool: 0,
      target: "sling",
      on: true,
      aux: 0,
    };
    tickSpike(g, 0.1);
    const back = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);
    assert.equal(back.length, 3);
    assert.equal(back.filter((c) => c.room === pad.id).length, 2);
    // INFERRED: the first door in the list is the first adjacent room.
    const neighbor = foe.doors.find((d) => d.b !== "void" && (d.a === pad.id || d.b === pad.id));
    const beside = neighbor ? (neighbor.a === pad.id ? neighbor.b : neighbor.a) : "";
    assert.equal(back.filter((c) => c.room === beside).length, 1);
    assert.equal(foe.kits.sling!.cool, 20);
  });

  it("stuns the player's drone and may destroy it", () => {
    let killed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = latched("swarm", 2, seed);
      g.player.kits.swarm = { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: "ward", on: true, aux: 0 };
      tickEnemySpike(g, 0.01);
      tickEnemySpike(g, 0.5);
      if (seed === 1) assert.ok((g.player.kits.swarm!.stun ?? 0) > 0);
      for (let i = 0; i < 70; i++) tickEnemySpike(g, 0.1);
      if (!g.player.kits.swarm!.on) killed += 1;
    }
    // Level 2: 62% on the wiki.
    assert.ok(killed > 5 && killed < 28, String(killed));
  });

  it("ends an active backup battery", () => {
    const g = latched("cell");
    g.player.kits.cell = { id: "cell", level: 1, power: 0, left: 20, cool: 0, target: null, on: true, aux: 2 };
    tickEnemySpike(g, 0.01);
    tickEnemySpike(g, 0.1);
    assert.equal(g.player.kits.cell!.on, false);
    assert.equal(g.player.kits.cell!.cool, 20);
  });
});

describe("enemy hacking: interruption and cleanup", () => {
  it("stops the effect while their hacking room is destroyed, and resumes after repair", () => {
    const g = latched("oxygen");
    for (const r of g.player.rooms) r.o2 = 100;
    tickEnemySpike(g, 0.01);
    const k = spike(g);
    k.damage = k.level;
    k.power = 0;
    tickEnemySpike(g, 1);
    for (const r of g.player.rooms) assert.ok(r.o2 > 99.9);
    assert.equal(enemyHackView(g)?.phase, "latched");
    assert.ok(!g.player.doors.some((d) => d.hacked), "doors unlock");
    k.damage = 0;
    k.power = k.level;
    tickEnemySpike(g, 1);
    for (const r of g.player.rooms) assert.ok(r.o2 < 95);
  });

  it("clears the marks when the fight ends, and runs from tickSpike without a player kit", () => {
    const g = latched("doors");
    tickSpike(g, 0.01);
    assert.ok(g.player.rooms.some((r) => r.hacked));
    g.enemy = null;
    g.phase = "map";
    step(g, 0.05);
    assert.ok(!g.player.rooms.some((r) => r.hacked));
    assert.ok(!g.player.doors.some((d) => d.hacked));
  });

  it("an Engi or Lanius fight launches and latches through the normal tick", () => {
    let launched = false;
    for (let seed = 1; seed <= 40 && !launched; seed++) {
      for (const tier of ["Engi ship", "Lanius ship"]) {
        const g = createGame(seed);
        g.sector = 4;
        startCombat(g, tier);
        if (!g.enemy?.kits.spike || g.enemy.parts < 1) continue;
        g.player.zoltan = undefined;
        for (let i = 0; i < 80; i++) tickSpike(g, 0.05);
        if (g.enemy.kits.spike.hackLatched) {
          launched = true;
          assert.ok(g.enemy.kits.spike.level <= 3);
          break;
        }
      }
    }
    assert.ok(launched, "no hacking enemy latched");
  });
});
