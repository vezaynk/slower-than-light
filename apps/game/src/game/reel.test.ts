import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemyCloneQueue } from "./extras/cradle.ts";
import { playerHackView } from "./extras/spike.ts";
import { armWeaponsAirlock, buildScene, doorHurt } from "./reel.ts";
import { continueReward, doorLevel, step } from "./sim.ts";

describe("combat reel scenes", () => {
  it("builds a paused Kestrel fight with the four guns and the room crew", () => {
    const g = buildScene("quiet");
    assert.equal(g.phase, "combat");
    assert.equal(g.userPaused, true);
    assert.equal(g.enemy?.name, "Pirate Light-Surveyor");
    assert.equal(g.fuel, 4);
    assert.deepEqual(
      g.player.weapons.map((weapon) => weapon.defId),
      ["LASER_BURST_3", "ION_4", "BEAM_2", "BOMB_BREACH_2"],
    );
    assert.ok(g.player.weapons.every((weapon) => weapon.enabled));
    for (const id of ["cloaking", "hacking", "mind", "teleporter", "battery", "drones"] as const) {
      assert.ok(g.player.kits[id], id);
      assert.ok(
        g.player.rooms.some((room) => room.kit === id),
        id,
      );
    }
    assert.equal(g.player.kits.drones?.loadout?.join(","), "DEFENSE_1,COMBAT_1");
    const pads = g.crew.filter((crew) => crew.room === "p-tele" && crew.pad);
    assert.equal(pads.length, 2);
    assert.ok(g.crew.some((crew) => crew.id === "c-spark" && crew.room === "p-shields"));
    assert.equal(g.player.shieldNow, 1);
    assert.ok(
      doorHurt(g.player.doors.find((door) => door.a === "p-weapons" && door.b === "void")!),
    );
    assert.ok(doorLevel(g, g.player, "player") >= 2);
  });

  it("opens the reading fight at sensors 1 with an ion lock", () => {
    const g = buildScene("reading");
    assert.equal(g.player.systems.sensors.level, 1);
    assert.ok((g.enemy?.systems.weapons.ion.length ?? 0) > 0);
    assert.equal(g.userPaused, true);
  });

  it("puts a boarder, a hurt crew member, and a clone queue inside the hull", () => {
    const g = buildScene("inside");
    assert.ok(
      g.crew.some(
        (crew) =>
          crew.side === "enemy" &&
          crew.aboard === "player" &&
          crew.room === "p-weapons" &&
          crew.hp > 0,
      ),
    );
    const hurt = g.crew.find((crew) => crew.id === "c-cloak");
    assert.ok(hurt);
    assert.ok(hurt.hp < hurt.maxHp);
    assert.notEqual(hurt.room, "p-medbay");
    assert.equal(g.selected, hurt.id);
    const queue = enemyCloneQueue(g);
    assert.equal(queue?.count, 2);
    assert.equal(queue?.offline, false);
    const airlock = g.player.doors.find((door) => door.a === "p-weapons" && door.b === "void");
    assert.ok(airlock);
    armWeaponsAirlock(g);
    assert.equal(doorHurt(airlock), true);
    g.enemy!.kits.clonebay!.power = 0;
    assert.equal(enemyCloneQueue(g)?.offline, true);
    assert.ok(
      g.crew.some((crew) => crew.side === "enemy" && crew.aboard === "enemy" && crew.hp > 0),
    );
  });

  it("stacks a live asteroid fight with a pulse, a beam, and a running escape", () => {
    const g = buildScene("stacked");
    assert.equal(g.asteroid, true);
    assert.equal(g.userPaused, false);
    assert.equal(playerHackView(g)?.state, "pulse");
    assert.equal(g.enemy?.hackDrone, "pilot");
    assert.ok((g.enemy?.systems.weapons.ion.length ?? 0) > 0);
    const beam = g.player.weapons.find((weapon) => weapon.defId === "BEAM_2");
    assert.ok(beam?.beamLine);
    assert.ok(g.enemyEscape?.running);
    assert.equal(
      g.beacons.some((beacon) => beacon.id === "reel-next"),
      true,
    );
  });

  it("opens a wounded Kestrel against the flagship's first stage", () => {
    const g = buildScene("flagship");
    assert.equal(g.phase, "combat");
    assert.equal(g.userPaused, true);
    assert.equal(g.enemy?.name, "Rebel Flagship");
    assert.equal(g.enemy?.flagship?.stage, 1);
    assert.equal(g.player.hull, 16);
    assert.equal(g.enemy?.hull, 10);
    assert.equal(g.player.systems.shields.level, 8);
    assert.equal(g.player.systems.shields.power, 6);
    assert.equal(g.ramId, g.here);
    assert.equal(g.beacons.find((beacon) => beacon.id === g.here)?.flag, "fed-base");
    assert.ok(g.enemy?.rooms.some((room) => room.id === "e-missile"));
    assert.ok(g.enemy?.rooms.some((room) => room.id === "e-shields"));
    assert.ok(g.enemy?.weapons.some((weapon) => weapon.defId === "ARTILLERY_BOSS_1"));
    assert.ok((g.enemy?.kits.cloaking?.cool ?? 0) > 0);
    assert.equal(g.enemySurrender, null);
    const doors = g.player.rooms.find((room) => room.id === "p-doors");
    assert.equal(doors?.fire, 1);
  });

  it("ends a fallen stage and opens the next hull from the reward card", () => {
    const g = buildScene("flagship");
    assert.ok(g.enemy);
    g.userPaused = false;
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "reward");
    assert.equal(g.enemy == null, true);
    assert.equal(g.flagshipMemo?.stage, 2);
    assert.match(g.reward?.note ?? "", /holds the base/);
    const hull = g.player.hull;
    continueReward(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.flagship?.stage, 2);
    assert.equal(g.enemy?.hull, g.enemy?.hullMax);
    assert.ok((g.enemy?.hull ?? 0) > 10);
    assert.equal(g.flagshipMemo == null, true);
    assert.equal(g.player.hull, hull);
    assert.equal(g.beacons.find((beacon) => beacon.id === g.here)?.kind, "boss");
    g.userPaused = false;
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "reward");
    assert.equal(g.flagshipMemo?.stage, 3);
    continueReward(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.flagship?.stage, 3);
    g.userPaused = false;
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.01);
    assert.equal(g.phase, "victory");
  });
});
