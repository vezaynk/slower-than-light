import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemyCloneQueue } from "./extras/cradle.ts";
import { playerHackView } from "./extras/spike.ts";
import { armWeaponsAirlock, buildScene, doorHurt } from "./reel.ts";
import { doorLevel } from "./sim.ts";

describe("combat reel scenes", () => {
  it("builds a paused Kestrel fight with the four guns and the room crew", () => {
    const g = buildScene("quiet");
    assert.equal(g.phase, "combat");
    assert.equal(g.userPaused, true);
    assert.equal(g.enemy?.name, "Pirate Light-Surveyor");
    assert.equal(g.fuel, 4);
    assert.deepEqual(g.player.weapons.map((weapon) => weapon.defId), ["lineburst", "ion2", "halberd", "breach2"]);
    assert.ok(g.player.weapons.every((weapon) => weapon.enabled));
    for (const id of ["veil", "spike", "leash", "sling", "cell", "swarm"] as const) {
      assert.ok(g.player.kits[id], id);
      assert.ok(g.player.rooms.some((room) => room.kit === id), id);
    }
    assert.equal(g.player.kits.swarm?.loadout?.join(","), "ward,striker");
    const pads = g.crew.filter((crew) => crew.room === "p-tele" && crew.pad);
    assert.equal(pads.length, 2);
    assert.ok(g.crew.some((crew) => crew.id === "c-spark" && crew.room === "p-shields"));
    assert.equal(g.player.shieldNow, 1);
    assert.ok(doorHurt(g.player.doors.find((door) => door.a === "p-weapons" && door.b === "void")!));
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
    assert.ok(g.crew.some((crew) => crew.side === "enemy" && crew.aboard === "player" && crew.room === "p-weapons" && crew.hp > 0));
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
    g.enemy!.kits.cradle!.power = 0;
    assert.equal(enemyCloneQueue(g)?.offline, true);
    assert.ok(g.crew.some((crew) => crew.side === "enemy" && crew.aboard === "enemy" && crew.hp > 0));
  });

  it("stacks a live asteroid fight with a pulse, a beam, and a running escape", () => {
    const g = buildScene("stacked");
    assert.equal(g.asteroid, true);
    assert.equal(g.userPaused, false);
    assert.equal(playerHackView(g)?.state, "pulse");
    assert.equal(g.enemy?.hackDrone, "pilot");
    assert.ok((g.enemy?.systems.weapons.ion.length ?? 0) > 0);
    const beam = g.player.weapons.find((weapon) => weapon.defId === "halberd");
    assert.ok(beam?.beamLine);
    assert.ok(g.enemyEscape?.running);
    assert.equal(g.beacons.some((beacon) => beacon.id === "reel-next"), true);
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
    assert.ok(g.enemy?.rooms.some((room) => room.id === "e-missile"));
    assert.ok(g.enemy?.rooms.some((room) => room.id === "e-shields"));
    assert.ok(g.enemy?.weapons.some((weapon) => weapon.defId === "bosslaser"));
    assert.ok((g.enemy?.kits.veil?.cool ?? 0) > 0);
    assert.equal(g.enemySurrender, null);
    const doors = g.player.rooms.find((room) => room.id === "p-doors");
    assert.equal(doors?.fire, 1);
  });
});
