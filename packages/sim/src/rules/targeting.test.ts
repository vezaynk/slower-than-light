import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, evasionPercent, startCombat, step } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import type { Game, Kit, KitId } from "../types.ts";
import {
  enemyTarget,
  hardShares,
  installedSystems,
  prioritizeSystem,
  priorityList,
  priorityRooms,
  randomRoom,
  SYSTEM_TARGETS,
} from "./targeting.ts";
import { powerGuns } from "../fixtures.ts";
import {
  aiTarget,
  aiTargets,
  loadPack,
  onPackWarning,
  packFromFtl,
  resetPackForTests,
} from "@stl/pack";

function kit(id: KitId, over: Partial<Kit> = {}): Kit {
  return { id, level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0, ...over };
}

/** Kestrel A with nothing on the Hard list: shields and weapons unpowered, no evasion, full air. */
function calm(difficulty: "easy" | "normal" | "hard"): Game {
  const g = createGame(7, "PLAYER_SHIP_HARD", difficulty);
  g.player.systems.engines.power = 0;
  g.player.systems.shields.power = 0;
  g.player.systems.weapons.power = 0;
  return g;
}

function share(g: Game, n: number, hit: (room: string | null) => boolean): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (hit(prioritizeSystem(g))) k++;
  return k / n;
}

describe("enemy targeting (combat-ai, PrioritizeSystem)", () => {
  it("Easy and Normal pick from system_targets 20% / 33% of the time, else a random room", () => {
    for (const [d, chance] of [
      ["easy", 0.2],
      ["normal", 0.33],
    ] as const) {
      const g = calm(d);
      const installed = installedSystems(g).length / SYSTEM_TARGETS.length;
      const got = share(g, 20000, (r) => r != null);
      assert.ok(Math.abs(got - chance * installed) < 0.015, `${d} ${got}`);
      g.player.rooms[0].fire = 1;
      assert.deepEqual(priorityRooms(g), [], "no priority list below Hard");
    }
  });

  it("Hard: half the shots pick no system, a quarter any system, a quarter the priority list", () => {
    const g = calm("hard");
    assert.deepEqual(priorityList(g), []);
    assert.ok(Math.abs(share(g, 20000, (r) => r == null) - 0.5) < 0.015);
    // With only Doors listed, Doors takes the list quarter plus its share of the any-system quarter.
    g.player.rooms.find((r) => r.system === "medbay")!.fire = 1;
    assert.deepEqual(priorityRooms(g), ["p-doors"]);
    const any = installedSystems(g).length;
    const got = share(g, 20000, (r) => r === "p-doors");
    assert.ok(Math.abs(got - (0.25 + 0.25 / any)) < 0.015, `doors ${got}`);
  });

  it("Hard list: Shields and Weapons only while powered (a Zoltan bar counts for weapons)", () => {
    const g = calm("hard");
    g.player.systems.shields.power = 1;
    assert.deepEqual(priorityList(g), ["shields"]);
    powerGuns(g);
    assert.deepEqual(priorityList(g), ["shields", "weapons"]);
  });

  it("Hard list: Engines and Piloting above 25% evasion; Oxygen below 50% average air", () => {
    const g = calm("hard");
    g.player.systems.engines.power = g.player.systems.engines.level = 4;
    assert.ok(evasionPercent(g, g.player, "player") > 25);
    assert.deepEqual(priorityList(g), ["engines", "pilot"]);
    g.player.systems.engines.power = 0;
    for (const r of g.player.rooms) r.o2 = 49;
    assert.deepEqual(priorityList(g), ["oxygen"]);
  });

  it("Hard list: Cloaking off cooldown and not cloaked, even unpowered; Battery while active", () => {
    const g = calm("hard");
    g.player.kits.cloaking = kit("cloaking", { power: 0, cool: 5 });
    g.player.kits.battery = kit("battery");
    seatKits(g.player);
    assert.deepEqual(priorityList(g), []);
    g.player.kits.cloaking!.cool = 0;
    assert.deepEqual(priorityList(g), ["cloaking"]);
    g.player.kits.cloaking!.on = true;
    g.player.kits.cloaking!.left = 5;
    assert.deepEqual(priorityList(g), [], "an active cloak is not listed");
    g.player.kits.battery!.on = true;
    g.player.kits.battery!.left = 10;
    assert.deepEqual(priorityList(g), ["battery"]);
    assert.deepEqual(priorityRooms(g), ["p-battery"]);
  });

  it("Hard list: Doors for intruders; Sensors never", () => {
    const g = calm("hard");
    g.crew.push({ ...g.crew[0], id: "boarder", side: "enemy", aboard: "player" });
    assert.deepEqual(priorityList(g), ["doors"]);
    assert.ok(!priorityList(g).includes("sensors"));
  });

  it("randomRoom covers every room", () => {
    const g = createGame(9);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(randomRoom(g, g.player));
    assert.equal(seen.size, g.player.rooms.length);
  });

  it("an enemy gun re-aims each volley", () => {
    const g = createGame(11, undefined, "normal");
    startCombat(g, "Rebel ship");
    const gun = g.enemy!.weapons.find((w) => w.enabled !== false);
    assert.ok(gun);
    const aims = new Set<string>();
    let last = gun.charge;
    for (let i = 0; i < 4000 && aims.size < 2; i++) {
      step(g, 0.05);
      if (!g.enemy) break;
      if (gun.charge < last && gun.target) aims.add(gun.target);
      last = gun.charge;
      g.player.hull = g.player.hullMax;
    }
    assert.ok(aims.size >= 2, `aims ${[...aims]}`);
  });

  it("each shot of an enemy burst rolls its own room (combat-ai UpdateWeapons)", () => {
    const g = createGame(5, "PLAYER_SHIP_HARD", "normal");
    startCombat(g, "Rebel ship");
    const gun = g.enemy!.weapons[0];
    gun.defId = "LASER_BURST_5";
    gun.enabled = true;
    g.enemy!.weapons = [gun];
    g.enemy!.systems.weapons.level = g.enemy!.systems.weapons.power = 4;
    let spread = 0;
    for (let i = 0; i < 20; i++) {
      g.shots = [];
      gun.charge = 1;
      gun.target = enemyTarget(g, gun);
      // sim.ts launch is internal; a full charge fires on the next tick.
      step(g, 0.001);
      const rooms = new Set(
        g.shots
          .filter((s) => s.from === "enemy" && s.defId === "LASER_BURST_5")
          .map((s) => s.targetRoom),
      );
      if (rooms.size >= 2) spread++;
    }
    assert.ok(spread > 10, `volleys that split: ${spread} of 20`);
  });
});

function warned(run: () => void): string[] {
  const lines: string[] = [];
  const restore = onPackWarning((message) => lines.push(message));
  try {
    run();
  } finally {
    restore();
  }
  return lines;
}

describe("targeting numbers from the gap mod", () => {
  it("reads FTL's numbers from the loaded gap", () => {
    // aiTarget() falls back to these same numbers, so check the loaded row itself and that no read warned.
    assert.deepEqual(aiTargets(), {
      easy: 0.2,
      normal: 0.33,
      hardRoom: 0.5,
      hardAny: 0.25,
      evasion: 25,
      oxygen: 50,
      artillery: 4,
    });
    const lines = warned(() => {
      assert.equal(aiTarget("easy"), 0.2);
      assert.equal(aiTarget("normal"), 0.33);
      assert.equal(aiTarget("hardRoom"), 0.5);
      assert.equal(aiTarget("hardAny"), 0.25);
      assert.equal(aiTarget("evasion"), 25);
      assert.equal(aiTarget("oxygen"), 50);
      assert.equal(aiTarget("artillery"), 4);
      assert.deepEqual(hardShares(), { hardRoom: 0.5, hardAny: 0.25 });
    });
    assert.deepEqual(lines, []);
  });

  it("warns once when hardRoom and hardAny sum past 1, and gives hardAny only the rest", () => {
    // A mod's gap.xml raises hardRoom and keeps the stock hardAny of 0.25: 1.05 in all.
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><aiTarget hardRoom="0.8"/></FTL>` }]),
      "append",
    );
    try {
      const lines = warned(() => {
        assert.deepEqual(hardShares(), { hardRoom: 0.8, hardAny: 1 - 0.8 });
        assert.deepEqual(hardShares(), { hardRoom: 0.8, hardAny: 1 - 0.8 });
        // Every roll is no system or any system: the priority list gets no share.
        const g = calm("hard");
        g.player.systems.shields.power = 1;
        const shields = g.player.rooms.find((room) => room.system === "shields");
        assert.ok(shields);
        assert.deepEqual(priorityList(g), ["shields"]);
        const rolls = 4000;
        const shieldShare = share(g, rolls, (room) => room === shields.id);
        // Any-system picks shields 1 in installedSystems(g).length; the priority list would add 0.2 on top.
        const expected = 0.2 / installedSystems(g).length;
        assert.ok(Math.abs(shieldShare - expected) < 0.03, `shields ${shieldShare} vs ${expected}`);
      });
      assert.equal(lines.length, 1, lines.join("\n"));
      assert.match(lines[0], /hardRoom="0.8" plus hardAny="0.25" is more than 1/);
    } finally {
      resetPackForTests();
    }
  });

  it("follows a gap file that overrides one number", () => {
    // A mod's gap.xml: oxygen is a priority under 1000 average air, and Hard always consults that list.
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL><aiTarget oxygen="1000" hardRoom="0" hardAny="0"/></FTL>`,
        },
      ]),
      "append",
    );
    try {
      const g = calm("hard");
      const oxygen = g.player.rooms.find((room) => room.system === "oxygen");
      assert.ok(oxygen);
      assert.deepEqual(priorityList(g), ["oxygen"]);
      assert.deepEqual(priorityRooms(g), [oxygen.id]);
      startCombat(g, "Rebel ship");
      const gun = g.enemy!.weapons[0];
      gun.defId = "LASER_BURST_3";
      gun.enabled = true;
      g.enemy!.weapons = [gun];
      g.enemy!.systems.weapons.level = g.enemy!.systems.weapons.power = 4;
      g.shots = [];
      gun.charge = 1;
      gun.target = oxygen.id;
      step(g, 0.001);
      const rooms = g.shots
        .filter((shot) => shot.from === "enemy" && shot.defId === "LASER_BURST_3")
        .map((shot) => shot.targetRoom);
      assert.ok(rooms.length >= 2, `shots ${rooms.length}`);
      assert.ok(
        rooms.every((id) => id === oxygen.id),
        `aimed ${rooms.join(",")}`,
      );
    } finally {
      resetPackForTests();
    }
    const after = calm("hard");
    assert.deepEqual(priorityList(after), []);
    assert.equal(aiTarget("oxygen"), 50);
    assert.equal(aiTarget("hardRoom"), 0.5);
  });
});
