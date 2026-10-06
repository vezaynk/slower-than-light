import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame, evasionPercent, roomWith, sparePower, startCombat, step } from "../sim.ts";
import {
  armSpike,
  hackBlocksManning,
  hackDroneOn,
  hackPulseOn,
  hackRepairScale,
  hackVision,
  installSpike,
  launchSpike,
  playerSensorLevel,
  tickEnemySpike,
  tickSpike,
  toggleSpikePower,
} from "./spike.ts";
import { tickLance } from "./lance.ts";
import { tickFlak } from "./flakart.ts";
import { onCradleDeath, tickCradle } from "./cradle.ts";
import { cellBonus, tickCell } from "./cell.ts";
import { fireEnemyLeash, heldByEnemy, leashOnLeave } from "./leash.ts";
import type { Game, Kit, KitId } from "../types.ts";

/**
 * @agent:hack-rules. Hacking wiki, "Choosing your hacking target": the drone "takes about 2--3 seconds to reach the
 * enemy ship". launchSpike now starts that flight; these pulse checks land it at once.
 */
function launchLanded(g: Game): boolean {
  const ok = launchSpike(g);
  const kit = g.player.kits.spike;
  if (ok && kit && kit.hackFly != null) {
    kit.hackFly = 0;
    tickSpike(g, 1e-6);
  }
  return ok;
}


function kit(id: KitId, level: number, power = level): Kit {
  return { id, level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/** A fight whose enemy has a Hacking kit and no guns. */
function fight(seed = 7): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.kits = { spike: kit("spike", 2) };
  g.enemy.classId = "rebel-fighter";
  g.enemy.parts = 3;
  g.enemy.weapons = [];
  g.enemy.automated = false;
  g.player.zoltan = undefined;
  return g;
}

/** Their drone latched on `target`; `pulse` also starts a 7 s pulse. */
function hacked(target: string, pulse: boolean, seed = 7): Game {
  const g = fight(seed);
  const k = g.enemy!.kits.spike!;
  k.target = target;
  k.hackLatched = true;
  if (pulse) {
    k.on = true;
    k.left = 7;
  }
  return g;
}

/** The player with a level-1 powered Hacking kit and parts. */
function withSpike(g: Game, parts = 2) {
  g.scrap = 80;
  g.player.parts = parts;
  assert.equal(installSpike(g), true);
  toggleSpikePower(g);
}

describe("hacking: artillery drains (Hacking, Artillery Beam / Flak Artillery row)", () => {
  it("an enemy pulse on the Artillery Beam takes charge back at its own charge speed", () => {
    const g = hacked("lance", true);
    g.player.kits.lance = { ...kit("lance", 1, 1), aux: 0.5 };
    assert.equal(hackPulseOn(g, g.player, "lance"), true);
    tickLance(g, 1);
    assert.ok(Math.abs(g.player.kits.lance.aux - (0.5 - 1 / 50)) < 1e-9);
    g.enemy!.kits.spike!.on = false;
    g.enemy!.kits.spike!.left = 0;
    tickLance(g, 1);
    assert.ok(Math.abs(g.player.kits.lance.aux - 0.5) < 1e-9);
  });

  it("an enemy pulse on Flak Artillery drains one second of charge per second", () => {
    const g = hacked("flak", true);
    g.player.kits.flak = { ...kit("flak", 1, 1), on: true, aux: 10 };
    tickFlak(g, 2);
    assert.ok(Math.abs(g.player.kits.flak.aux - 8) < 1e-9);
  });
});

describe("hacking: Clone Bay row", () => {
  it("a pulse disables the player's bay: the queue stops and the last clone is lost after 3 s", () => {
    const g = hacked("cradle", true);
    g.player.kits.cradle = kit("cradle", 1, 1);
    const ada = g.crew.find((c) => c.side === "player")!;
    ada.hp = 0;
    assert.equal(onCradleDeath(g, ada), true);
    const before = ada.cloneIn!;
    tickCradle(g, 2);
    assert.equal(ada.cloneIn, before);
    tickCradle(g, 1.1);
    assert.equal(ada.cloneIn, undefined);
  });
});

describe("hacking: Backup Battery row", () => {
  it("removes two reactor bars for the pulse and sheds assigned power to fit", () => {
    const g = hacked("cell", true);
    g.player.kits.cell = kit("cell", 1, 0);
    while (sparePower(g.player) > 0) {
      const sys = g.player.systems.engines;
      sys.level = Math.max(sys.level, sys.power + 1);
      sys.power += 1;
    }
    tickEnemySpike(g, 0.05);
    assert.equal(g.player.kits.cell.drained, 2);
    assert.equal(cellBonus(g.player), -2);
    tickCell(g, 0.05);
    assert.equal(sparePower(g.player), 0);
    const k = g.enemy!.kits.spike!;
    k.on = false;
    k.left = 0;
    k.cool = 20;
    tickEnemySpike(g, 0.05);
    assert.equal(g.player.kits.cell.drained, undefined);
    assert.equal(cellBonus(g.player), 0);
    assert.equal(sparePower(g.player), 2);
  });
});

describe("hacking: passive rules (no manning, half repair)", () => {
  it("a latched drone blocks manning on that system, not on an automated hull", () => {
    const g = hacked("engines", false);
    assert.equal(hackDroneOn(g, g.player), "engines");
    assert.equal(hackBlocksManning(g, g.player, "engines"), true);
    assert.equal(hackBlocksManning(g, g.player, "shields"), false);
    g.enemy!.hackDrone = "shields";
    assert.equal(hackBlocksManning(g, g.enemy!, "shields"), true);
    g.enemy!.automated = true;
    assert.equal(hackBlocksManning(g, g.enemy!, "shields"), false);
  });

  it("the engines manning bonus is lost under a latched drone", () => {
    const g = fight();
    const eng = roomWith(g.player, "engines")!;
    const pilot = roomWith(g.player, "pilot")!;
    const [a, b] = g.crew.filter((c) => c.side === "player");
    a.room = eng.id;
    a.path = [];
    b.room = pilot.id;
    b.path = [];
    for (const c of g.crew) if (c !== a && c !== b && c.side === "player") c.room = roomWith(g.player, "shields")!.id;
    const free = evasionPercent(g, g.player, "player");
    const k = g.enemy!.kits.spike!;
    k.target = "engines";
    k.hackLatched = true;
    const held = evasionPercent(g, g.player, "player");
    assert.equal(free - held, 5);
  });

  it("repair of the hacked system runs at half speed", () => {
    const h = hacked("shields", false);
    assert.equal(hackRepairScale(h, h.player, "shields"), 0.5);
    assert.equal(hackRepairScale(h, h.player, "oxygen"), 1);
    const progress = (latch: boolean) => {
      const g = fight(3);
      g.enemy!.kits.spike!.cool = 999; // no launch, no pulse
      if (latch) {
        g.enemy!.kits.spike!.target = "oxygen";
        g.enemy!.kits.spike!.hackLatched = true;
      }
      const sys = g.player.systems.oxygen;
      sys.damage = 1;
      sys.fix = 0;
      const room = roomWith(g.player, "oxygen")!;
      const fixer = g.crew.find((c) => c.side === "player")!;
      for (const c of g.crew) if (c.side === "player" && c !== fixer) c.room = roomWith(g.player, "pilot")!.id;
      fixer.room = room.id;
      fixer.path = [];
      for (let i = 0; i < 40; i++) step(g, 0.05);
      return sys.fix;
    };
    const full = progress(false);
    const half = progress(true);
    assert.ok(full > 0);
    assert.ok(Math.abs(half - full / 2) < 1e-6, `${half} vs ${full}`);
  });
});

describe("hacking: Sensors row and vision", () => {
  it("an enemy pulse on Sensors reads 0; a latched drone drops the manning level", () => {
    const g = hacked("sensors", true);
    assert.equal(playerSensorLevel(g), 0);
    const k = g.enemy!.kits.spike!;
    k.on = false;
    k.left = 0;
    const sys = g.player.systems.sensors;
    assert.ok(playerSensorLevel(g) <= Math.min(3, sys.level - sys.damage));
  });

  it("the player's latched drone reveals its room and, on engines, the enemy evasion", () => {
    const g = fight();
    withSpike(g);
    assert.equal(hackVision(g), null);
    armSpike(g, "engines");
    assert.equal(launchLanded(g), true);
    const view = hackVision(g)!;
    assert.equal(view.system, "engines");
    assert.equal(view.sensors, 4);
    assert.equal(view.room, roomWith(g.enemy!, "engines")?.id ?? null);
    assert.equal(typeof view.evasion, "number");
  });
});

describe("hacking: the Hacking row, both directions", () => {
  it("a latched player drone pulses again without a new part", () => {
    const g = fight();
    withSpike(g, 1);
    armSpike(g, "shields");
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 0);
    assert.equal(g.enemy!.hackDrone, "shields");
    tickSpike(g, 4);
    g.enemy!.kits.spike!.cool = 999;
    tickSpike(g, 20);
    assert.equal(launchLanded(g), true);
    assert.equal(g.player.parts, 0);
  });

  it("the player can aim at their Hacking: it ends their pulse and may burn out their latched drone", () => {
    let burned = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = hacked("shields", true, seed);
      withSpike(g);
      armSpike(g, "spike");
      assert.equal(g.player.kits.spike!.target, "spike", "Hacking is a valid target");
      assert.equal(launchLanded(g), true);
      tickSpike(g, 0.05);
      const k = g.enemy!.kits.spike!;
      assert.equal(k.on, false);
      assert.equal(k.cool > 0 || !k.hackLatched, true);
      // One-second delay: never destroyed in the first second.
      tickSpike(g, 0.9);
      assert.equal(k.hackLatched, true);
      for (let i = 0; i < 60; i++) tickSpike(g, 0.05);
      if (!k.hackLatched) burned += 1;
    }
    // 15% a second after the first second of a 4 s pulse: 1 - 0.85^3 ≈ 39%.
    assert.ok(burned > 3 && burned < 25, String(burned));
  });

  it("their pulse on the player's Hacking may burn out the player's latched drone", () => {
    let burned = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = hacked("spike", true, seed);
      withSpike(g);
      g.enemy!.hackDrone = "weapons";
      for (let i = 0; i < 140; i++) tickEnemySpike(g, 0.05);
      if (g.enemy!.hackDrone == null) burned += 1;
    }
    // 7 s pulse at level 2: 1 - 0.85^6 ≈ 62%.
    assert.ok(burned > 8 && burned < 28, String(burned));
  });
});

describe("mind control across a jump", () => {
  it("leaving frees crew the enemy holds and resets the player's hold", () => {
    const g = fight();
    g.enemy!.kits.leash = kit("leash", 1, 1);
    assert.equal(fireEnemyLeash(g), true);
    const held = g.crew.find((c) => heldByEnemy(c))!;
    assert.ok(held);
    g.player.kits.leash = { ...kit("leash", 1, 1), on: true, left: 5, cool: 3, target: "x" };
    leashOnLeave(g);
    assert.equal(heldByEnemy(held), false);
    assert.equal(g.player.kits.leash.on, false);
    assert.equal(g.player.kits.leash.cool, 0);
  });

  it("commitJump out of a fight ends the enemy's hold", () => {
    const g = fight();
    g.enemy!.kits.leash = kit("leash", 1, 1);
    assert.equal(fireEnemyLeash(g), true);
    const held = g.crew.find((c) => heldByEnemy(c))!;
    const here = g.beacons.find((b) => b.id === g.here)!;
    g.flee = 1;
    g.fuel = Math.max(g.fuel, 1);
    commitJump(g, here.links[0]);
    assert.equal(g.here, here.links[0]);
    assert.equal(heldByEnemy(held), false);
  });
});
