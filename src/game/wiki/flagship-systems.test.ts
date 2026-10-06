import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, evasionPercent, powerMask, startCombat, step } from "../sim.ts";
import { sensorLevel } from "../extras/sensors.ts";
import type { Game } from "../types.ts";
import {
  FLAGSHIP_ZOLTAN,
  SURGE_LASERS,
  SURGE_STUN_S,
  firePowerSurge,
  flagshipAiEvade,
  flagshipChargeSeconds,
  flagshipPowerMask,
  flagshipRooms,
  hurtArtillery,
  surgeDroneCount,
} from "./flagship-systems.ts";
import { WEAPONS } from "../content.ts";
import { applyImpact, commitJump } from "../sim.ts";

function bossFight(seed: number, difficulty: Game["difficulty"] = "normal"): Game {
  const g = createGame(seed, undefined, difficulty);
  const boss = g.beacons.find((b) => b.kind === "exit");
  assert.ok(boss);
  boss.kind = "boss";
  g.here = boss.id;
  startCombat(g, "boss");
  return g;
}

/** Destroy the current stage's hull and let endCheck advance it. */
function nextStage(g: Game) {
  g.enemy!.hull = 0;
  step(g, 0.01);
}

function linked(g: Game, id: string): string[] {
  return g.enemy!.doors.filter((d) => d.b !== "void" && (d.a === id || d.b === id)).map((d) => (d.a === id ? d.b : d.a));
}

function enemyCrew(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.hp > 0);
}

describe("Rebel Flagship rooms per stage", () => {
  it("uses the traced cutaways: 52, 42, and 32 squares", () => {
    const g = bossFight(11);
    const squares = () => g.enemy!.rooms.reduce((n, r) => n + r.w * r.h, 0);
    assert.equal(squares(), 52);
    nextStage(g);
    assert.equal(g.ramStage, 2);
    assert.equal(squares(), 42);
    nextStage(g);
    assert.equal(g.ramStage, 3);
    assert.equal(squares(), 32);
  });

  it("isolates the artillery rooms, except Laser and Missile on Hard", () => {
    const g = bossFight(12);
    for (const id of ["e-ion", "e-laser", "e-missile", "e-beam"]) assert.deepEqual(linked(g, id), [], id);
    const hard = bossFight(12, "hard");
    assert.equal(hard.enemy!.rooms.reduce((n, r) => n + r.w * r.h, 0), 56);
    assert.deepEqual(linked(hard, "e-laser"), ["e-laser-link"]);
    assert.deepEqual(linked(hard, "e-missile"), ["e-missile-link"]);
    assert.deepEqual(linked(hard, "e-ion"), []);
    assert.ok(linked(hard, "e-laser-link").includes("e-shields"));
    // FLAGSHIP_HARD: "The main body has two extra crew."
    assert.equal(enemyCrew(hard).length, 13);
  });

  it("keeps Hard links on every stage", () => {
    for (const stage of [1, 2, 3] as const) {
      const { rooms } = flagshipRooms(stage, true);
      assert.ok(rooms.some((r) => r.id === "e-laser-link"));
      assert.ok(rooms.some((r) => r.id === "e-missile-link"));
    }
  });

  it("does not let crew man the artillery", () => {
    // "They cannot be manned, despite containing crew." @agent:flagship (task 1): the artillery now charges on the
    // page's table, so a crewed artillery room charges at exactly the unmanned table rate (Boss Ion, level 3: 21 s).
    // A manned gun would charge faster (sim.ts WEAPON_RATE).
    const g = bossFight(13);
    const e = g.enemy!;
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.room === "e-ion"));
    const gun = e.weapons[0];
    assert.equal(gun.defId, "bossion");
    gun.charge = 0;
    step(g, 0.05);
    assert.ok(Math.abs(gun.charge - 0.05 / 21) < 1e-9, String(gun.charge));
  });
});

describe("Rebel Flagship systems per stage", () => {
  it("stage 1: Cloaking 2, Hacking 3, Door 3, Medbay 3, 10 drone parts", () => {
    const g = bossFight(21);
    const e = g.enemy!;
    assert.equal(e.kits.veil?.level, 2);
    assert.equal(e.kits.spike?.level, 3);
    assert.equal(e.rooms.find((r) => r.kit === "veil")?.id, "e-cloaking");
    assert.equal(e.rooms.find((r) => r.kit === "spike")?.id, "e-hacking");
    assert.equal(e.systems.doors.level, 3);
    assert.equal(e.systems.medbay.level, 3);
    assert.equal(e.parts, 10);
    step(g, 0.05);
    // Hacking, "Hacking specifics for enemy ships": "the Flagship in phase 1" has level 3 hacking.
    assert.equal(e.kits.spike?.level, 3);
    // "Like any other ship, the Flagship consumes 1 drone part to deploy its hacking drone".
    assert.equal(e.parts, 9);
    assert.ok(e.kits.spike?.hackFly != null);
  });

  it("stage 2: loses Hacking, Door, Cloaking and the Ion room crew; Drone Control 8 with four drones", () => {
    const g = bossFight(22);
    assert.equal(enemyCrew(g).length, 11);
    nextStage(g);
    const e = g.enemy!;
    assert.equal(e.kits.veil, undefined);
    assert.equal(e.kits.spike, undefined);
    assert.equal(e.systems.doors.level, 0);
    assert.equal(e.kits.swarm?.level, 8);
    assert.equal(e.parts, 10);
    assert.ok(!e.rooms.some((r) => r.id === "e-ion"));
    // "The remaining crew from the previous stage (Minus the one in the Ion room if left alive)."
    assert.equal(enemyCrew(g).length, 10);
    for (const c of enemyCrew(g)) assert.ok(e.rooms.some((r) => r.id === c.room), c.room);
    step(g, 0.05);
    const drones = e.kits.swarm?.drones ?? [];
    assert.deepEqual(
      drones.map((d) => d.kind),
      ["ward", "beam", "striker", "board"],
    );
    // "Since it uses 4 drones at once": all four fit the printed Drone (8) at (2) each.
    assert.ok(drones.every((d) => d.alive && d.powered));
    assert.equal(e.parts, 6);
  });

  it("stage 3: Teleporter 2 and Mind Control 3, loses Drone and the Beam room crew, Zoltan Shield 12", () => {
    const g = bossFight(23);
    nextStage(g);
    nextStage(g);
    const e = g.enemy!;
    assert.equal(e.kits.swarm, undefined);
    assert.equal(e.kits.sling?.level, 2);
    assert.equal(e.kits.leash?.level, 3);
    assert.ok(e.rooms.some((r) => r.id === "e-teleporter" && r.kit === "sling"));
    assert.equal(e.zoltan, FLAGSHIP_ZOLTAN);
    assert.equal(enemyCrew(g).length, 9);
    assert.ok(e.boards);
    assert.ok((e.boarding?.limit ?? 0) > 2);
  });

  it("clears fire and breaches between stages", () => {
    const g = bossFight(24);
    for (const r of g.enemy!.rooms) {
      r.fire = 1;
      r.breach = 1;
    }
    nextStage(g);
    assert.ok(g.enemy!.rooms.every((r) => r.fire === 0 && r.breach === 0));
  });

  it("never runs out of missiles", () => {
    const g = bossFight(25);
    g.enemy!.ammo = 0;
    step(g, 0.05);
    assert.ok(g.enemy!.ammo > 0);
  });

  it("caps the player's sensors at level 2 during the fight", () => {
    const g = bossFight(26);
    g.player.systems.sensors.level = 3;
    g.player.systems.sensors.damage = 0;
    assert.ok(sensorLevel(g, g.player, "player") <= 2);
  });
});

describe("Rebel Flagship Power Surge", () => {
  it("stage 2 deploys 4 / 6 / 7 drones with a fixed split, two shots each", () => {
    assert.deepEqual(
      (["easy", "normal", "hard"] as const).map(surgeDroneCount),
      [4, 6, 7],
    );
    const g = bossFight(31);
    nextStage(g);
    g.bossSurge = 0.01;
    step(g, 0.02);
    const state = g.enemy!.flagship!;
    assert.equal(state.surge.length, 6);
    const split = { ...state.split! };
    assert.equal(split.beam + split.striker, 6);
    // Run past the surge: every drone takes its two shots and leaves.
    for (let i = 0; i < 200; i++) step(g, 0.05);
    assert.equal(g.enemy!.flagship!.surge.length, 0);
    g.bossSurge = 0.01;
    step(g, 0.02);
    assert.deepEqual(g.enemy!.flagship!.split, split);
  });

  it("stage 3 fires 7 lasers three times, then restores the Zoltan Shield", () => {
    const g = bossFight(32);
    nextStage(g);
    nextStage(g);
    const e = g.enemy!;
    for (let i = 0; i < 3; i++) {
      g.shots = [];
      g.bossSurge = 0.01;
      step(g, 0.02);
      assert.equal(g.shots.filter((s) => s.label === "Surge").length, SURGE_LASERS);
    }
    e.zoltan = 0;
    g.shots = [];
    g.bossSurge = 0.01;
    step(g, 0.02);
    assert.equal(g.shots.filter((s) => s.label === "Surge").length, 0);
    assert.equal(e.zoltan, FLAGSHIP_ZOLTAN);
  });

  it("warns 5 seconds ahead", () => {
    const g = bossFight(33);
    nextStage(g);
    g.bossSurge = 5.02;
    step(g, 0.01);
    assert.ok(!g.log.some((line) => /power surge in 5 seconds/i.test(line)));
    step(g, 0.02);
    assert.ok(g.log.some((line) => /power surge in 5 seconds/i.test(line)));
  });
});

describe("Rebel Flagship AI takeover", () => {
  it("keeps fighting after the crew dies, flies at the manned dodge rate, and repairs", () => {
    const g = bossFight(41);
    const e = g.enemy!;
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    // Take the 10-second cloak out of the dodge reading.
    e.kits.veil!.power = 0;
    e.kits.veil!.on = false;
    step(g, 0.01);
    assert.equal(g.phase, "combat");
    assert.ok(e.automated);
    assert.ok(e.flagship?.ai);
    // "1st Stage" / "Dodge Rate": "If controlled by AI: 20%".
    assert.equal(evasionPercent(g, e, "enemy"), 20);
    e.systems.shields.damage = 2;
    for (let i = 0; i < 300; i++) step(g, 0.05);
    assert.ok(e.systems.shields.damage < 2);
  });

  it("matches the printed AI dodge on stages 2 and 3", () => {
    const g = bossFight(42);
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    step(g, 0.01);
    nextStage(g);
    assert.equal(evasionPercent(g, g.enemy!, "enemy"), 25);
    nextStage(g);
    assert.equal(evasionPercent(g, g.enemy!, "enemy"), 38);
  });
});

describe("@agent:flagship Rebel Flagship artillery, retreat, surge stun, AI dodge", () => {
  it("each artillery gun charges on its own printed time per stage, outside any power pool", () => {
    // "Weapon cooldowns and status effects": level 3 on stages 1-2, level 4 on the final stage.
    const g = bossFight(31);
    const secs = () => Object.fromEntries(g.enemy!.weapons.map((w) => [w.defId, flagshipChargeSeconds(g.enemy!, w)]));
    assert.deepEqual(secs(), { bossion: 21, bosslaser: 15, bossmissile: 17.25, bossbeam: 19.5 });
    // The 4-power Boss Missile is armed with only 3 artillery bars (it never fired before).
    assert.ok(g.enemy!.weapons.every((w) => w.enabled));
    nextStage(g);
    assert.deepEqual(secs(), { bosslaser: 15, bossmissile: 17.25, bossbeam: 19.5 });
    nextStage(g);
    assert.deepEqual(secs(), { bosslaser: 10, bossmissile: 11.5 });
    // "Damaging the system slows down the weapon": 2 damage on the level-4 Laser room reads its level-2 row; each
    // gun is its own artillery system, so the Missile keeps its time.
    hurtArtillery(g.enemy!, "e-laser", 2);
    assert.deepEqual(secs(), { bosslaser: 20, bossmissile: 11.5 });
    hurtArtillery(g.enemy!, "e-laser", 2);
    hurtArtillery(g.enemy!, "e-missile", 4);
    assert.deepEqual(secs(), { bosslaser: Infinity, bossmissile: Infinity });
  });

  it("arms Boss Laser and Boss Beam when the Weapons pool is empty", () => {
    // Laser (Weapons) / Beam (Weapons): no power requirement. The stored 4 and 3 are artillery maxima.
    const g = bossFight(31);
    const e = g.enemy!;
    e.systems.weapons.power = 0;
    assert.equal(WEAPONS.bosslaser.power, 4);
    assert.equal(WEAPONS.bossbeam.power, 3);
    const mask = powerMask(e);
    const laser = e.weapons.findIndex((w) => w.defId === "bosslaser");
    const beam = e.weapons.findIndex((w) => w.defId === "bossbeam");
    assert.equal(mask[laser], true);
    assert.equal(mask[beam], true);
    const before = e.weapons[laser].charge;
    step(g, 0.05);
    assert.ok(e.weapons[laser].charge > before);
  });

  it("prints the boss weapon stats", () => {
    assert.equal(WEAPONS.bosslaser.shots, 3);
    assert.equal(WEAPONS.bosslaser.damage, 1);
    assert.equal(WEAPONS.bosslaser.fire, 0.1);
    assert.equal(WEAPONS.bosslaser.breach, 0.09);
    assert.equal(WEAPONS.bossbeam.kind, "beam");
    assert.equal(WEAPONS.bossbeam.damage, 2);
    assert.equal(WEAPONS.bossmissile.fire, 0.3);
    assert.equal(WEAPONS.bossmissile.breach, 0.14);
  });

  it("the Boss Missile fires in stage 1", () => {
    const g = bossFight(32);
    const missile = g.enemy!.weapons.find((w) => w.defId === "bossmissile")!;
    missile.charge = 0.999;
    let launched = false;
    for (let i = 0; i < 30 && !launched; i++) {
      step(g, 0.05);
      launched = g.shots.some((s) => s.defId === "bossmissile");
    }
    assert.ok(launched);
  });

  it("retreat during stage 1 replaces the crew; during stage 2 resumes the stage with the survivors", () => {
    const g = bossFight(33);
    const away = g.beacons.find((b) => b.id === g.here)!.links[0];
    // Stage 1 retreat: nothing remembered.
    g.flee = 1;
    g.fuel = 5;
    commitJump(g, away);
    assert.notEqual(g.here, undefined);
    assert.equal(g.flagshipMemo, undefined);

    const h = bossFight(34);
    nextStage(h);
    assert.equal(h.ramStage, 2);
    const alive = enemyCrew(h).filter((c) => c.aboard === "enemy");
    alive[0].hp = 0;
    const survivors = alive.length - 1;
    h.enemy!.hull = 7;
    h.enemy!.systems.shields.damage = 3;
    h.flee = 1;
    h.fuel = 5;
    const bossId = h.here;
    commitJump(h, h.beacons.find((b) => b.id === h.here)!.links[0]);
    assert.notEqual(h.here, bossId);
    assert.equal(h.flagshipMemo?.stage, 2);
    assert.equal(h.flagshipMemo?.crew.length, survivors);
    // Come back: stage 2, fresh hull and systems, only the survivors.
    h.here = bossId;
    startCombat(h, "boss");
    assert.equal(h.ramStage, 2);
    assert.equal(h.enemy!.flagship?.stage, 2);
    assert.equal(h.enemy!.hull, 22);
    assert.equal(h.enemy!.systems.shields.damage, 0);
    assert.equal(h.enemy!.kits.swarm?.level, 8);
    assert.equal(enemyCrew(h).length, survivors);
    assert.equal(h.flagshipMemo, undefined);
  });

  it("stage-3 surge lasers carry the 20% stun, and a stun lands on the room's crew", () => {
    const g = bossFight(35);
    nextStage(g);
    nextStage(g);
    g.shots = [];
    firePowerSurge(g, g.enemy!);
    assert.equal(g.shots.length, SURGE_LASERS);
    assert.ok(g.shots.every((s) => s.stunChance === 0.2));
    // A forced stun: chance 1, no evasion, no shields.
    const target = g.crew.find((c) => c.side === "player" && c.aboard === "player")!;
    g.player.shieldNow = 0;
    g.player.systems.engines.power = 0;
    g.player.zoltan = 0;
    applyImpact(g, { ...g.shots[0], targetRoom: target.room, stunChance: 1 });
    assert.equal(target.stun, SURGE_STUN_S);
  });

  it("the AI dodge bonus is off while the player's hack pulse runs on Engines or Piloting, not while latched", () => {
    const g = bossFight(36);
    const e = g.enemy!;
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    step(g, 0.05);
    assert.equal(e.flagship?.ai, true);
    assert.equal(flagshipAiEvade(g, e), 10);
    g.player.kits.spike = { id: "spike", level: 1, power: 1, left: 0, cool: 0, target: "engines", on: false, aux: 0 };
    assert.equal(flagshipAiEvade(g, e), 10);
    g.player.kits.spike.on = true;
    g.player.kits.spike.left = 3;
    assert.equal(flagshipAiEvade(g, e), 0);
    g.player.kits.spike.target = "pilot";
    assert.equal(flagshipAiEvade(g, e), 0);
    g.player.kits.spike.target = "shields";
    assert.equal(flagshipAiEvade(g, e), 10);
  });
});

describe("@agent:flagship Rebel Flagship per-room artillery", () => {
  /** A player shot that cannot miss or be blocked, aimed at `room`. */
  function hit(g: Game, room: string, kind: "laser" | "ion", amount: number) {
    const e = g.enemy!;
    e.shieldNow = 0;
    e.systems.engines.power = 0;
    e.zoltan = 0;
    if (e.kits.veil) {
      e.kits.veil.on = false;
      e.kits.veil.left = 0;
    }
    applyImpact(g, {
      id: 999,
      kind,
      from: "player",
      damage: kind === "ion" ? 0 : amount,
      ion: kind === "ion" ? amount : 0,
      fireChance: 0,
      breachChance: 0,
      targetRoom: room,
      wait: 0,
      t: 0,
      duration: 0.7,
      label: "test",
    } as never);
  }
  const secs = (g: Game) => Object.fromEntries(g.enemy!.weapons.map((w) => [w.defId, flagshipChargeSeconds(g.enemy!, w)]));

  it("a hit on one artillery room slows only that gun", () => {
    const g = bossFight(61);
    hit(g, "e-laser", "laser", 1);
    assert.equal(g.enemy!.flagship!.guns!["e-laser"].damage, 1);
    assert.equal(g.enemy!.systems.weapons.damage, 0);
    assert.deepEqual(secs(g), { bossion: 21, bosslaser: 20, bossmissile: 17.25, bossbeam: 19.5 });
    hit(g, "e-missile", "laser", 3);
    const mask = flagshipPowerMask(g.enemy!)!;
    const idx = g.enemy!.weapons.findIndex((w) => w.defId === "bossmissile");
    assert.equal(mask[idx], false);
    assert.equal(mask.filter(Boolean).length, 3);
  });

  it("ion on an artillery room slows that gun while it lasts (Hard mode: 'including ion damage')", () => {
    const g = bossFight(62);
    hit(g, "e-missile", "ion", 1);
    assert.equal(secs(g).bossmissile, 23);
    assert.equal(secs(g).bosslaser, 15);
    for (let i = 0; i < 120; i++) step(g, 0.05);
    assert.equal(secs(g).bossmissile, 17.25);
  });

  it("the crew member in an isolated artillery room repairs its gun", () => {
    const g = bossFight(63);
    const e = g.enemy!;
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.room === "e-beam" && c.hp > 0));
    hurtArtillery(e, "e-beam", 2);
    for (let i = 0; i < 400; i++) step(g, 0.05);
    assert.ok(e.flagship!.guns!["e-beam"].damage < 2);
    assert.equal(e.flagship!.guns!["e-ion"].damage, 0);
  });

  it("player boarders sabotage only the gun in their room", () => {
    const g = bossFight(64);
    const e = g.enemy!;
    for (const c of g.crew) if (c.side === "enemy" && c.room === "e-ion") c.hp = 0;
    const boarder = g.crew.find((c) => c.side === "player")!;
    boarder.aboard = "enemy";
    boarder.room = "e-ion";
    boarder.path = [];
    for (let i = 0; i < 300; i++) step(g, 0.05);
    assert.ok(e.flagship!.guns!["e-ion"].damage >= 1);
    assert.equal(e.flagship!.guns!["e-laser"].damage, 0);
    assert.equal(e.systems.weapons.damage, 0);
  });

  it("the AI repairs each gun once per 12.5 s, and the next stage starts with fresh guns", () => {
    const g = bossFight(65);
    const e = g.enemy!;
    for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
    hurtArtillery(e, "e-laser", 2);
    hurtArtillery(e, "e-missile", 1);
    step(g, 0.01);
    assert.ok(e.flagship!.ai);
    for (let i = 0; i < 260; i++) step(g, 0.05);
    assert.equal(e.flagship!.guns!["e-laser"].damage, 1);
    assert.equal(e.flagship!.guns!["e-missile"].damage, 0);
    nextStage(g);
    assert.ok(Object.values(e.flagship!.guns!).every((gun) => gun.damage === 0));
  });
});
