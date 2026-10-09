import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEAPONS } from "../content.ts";
import { createGame, startCombat } from "../sim.ts";
import { citedEnemy } from "./cited-enemies.ts";
import { ENEMY_CLASSES } from "./enemy-ships.ts";

describe("cited enemies", () => {
  it("leaves a non-boss hull alone", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    // Non-boss hulls are documented classes from the faction pages (enemy-gen.ts); citedEnemy does not touch them.
    const cls = ENEMY_CLASSES.find((row) => row.id === g.enemy?.classId);
    assert.ok(cls);
    assert.ok(g.enemy?.name === cls.name || g.enemy?.name === cls.pirate);
    assert.ok(g.enemy && g.enemy.hull >= cls.hull[0] - 1 && g.enemy.hull <= cls.hull[1]);
  });

  it("applies stage 1 of the Rebel Flagship when the fight has no phase counter", () => {
    const g = createGame(1);
    g.ramStage = 2;
    startCombat(g, "boss");
    const ship = g.enemy;
    assert.ok(ship);
    assert.equal(g.ramStage, 1);
    assert.equal(ship.name, "Rebel Flagship");
    assert.equal(ship.hull, 20);
    assert.equal(ship.hullMax, 20);
    assert.equal(ship.reactor, 42);
    assert.equal(ship.systems.shields.level, 8);
    assert.equal(ship.systems.shields.power, 8);
    assert.equal(ship.shieldNow, 4);
    assert.equal(ship.shieldNow, Math.floor(ship.systems.shields.power / 2));
    assert.equal(ship.systems.engines.level, 2);
    assert.equal(ship.systems.engines.power, 2);
    assert.equal(ship.systems.oxygen.level, 2);
    assert.equal(ship.systems.oxygen.power, 2);
    assert.equal(ship.systems.pilot.level, 3);
    assert.equal(ship.systems.weapons.level, 3);
    assert.equal(ship.systems.weapons.power, 3);
    // @agent:flagship. The traced stage-1 cutaway has Medbay and Door rooms, so "Medbay (3)" and "Door (3)" apply.
    assert.equal(ship.systems.medbay.level, 3);
    assert.equal(ship.systems.medbay.power, 3);
    assert.equal(ship.systems.doors.level, 3);
    assert.equal(ship.kits.veil?.level, 2);
    assert.equal(ship.kits.spike?.level, 3);
    assert.equal(ship.parts, 10);
    const spent =
      ship.systems.shields.power +
      ship.systems.engines.power +
      ship.systems.oxygen.power +
      ship.systems.medbay.power +
      ship.systems.weapons.power;
    assert.ok(spent <= ship.reactor);
    assert.deepEqual(
      ship.weapons.map((weapon) => weapon.defId),
      // @agent:flagship. Boss Laser and Boss Beam are now WeaponDefs (wiki/flagship-weapons.ts).
      ["bossion", "bosslaser", "bossmissile", "bossbeam"],
    );
    assert.equal(WEAPONS.bossion?.power, 3);
    assert.equal(WEAPONS.bossmissile?.power, 4);
    // @agent:flagship. Artillery is not fed from a Weapons power pool ("Weapon cooldowns and status effects"):
    // every mounted gun is armed, the 4-power Boss Missile included.
    assert.ok(ship.weapons.every((weapon) => weapon.enabled));
    // @agent:flagship. Rooms are the traced stage-1 cutaway (wiki/flagship-layout.ts), 52 squares.
    assert.equal(ship.rooms.reduce((n, room) => n + room.w * room.h, 0), 52);
    for (const id of ["e-pilot", "e-shields", "e-doors", "e-cloaking", "e-hacking", "e-medbay", "e-ion", "e-laser", "e-missile", "e-beam"]) {
      assert.ok(ship.rooms.some((room) => room.id === id), id);
    }
    const enemy = g.crew.filter((member) => member.side === "enemy");
    assert.equal(enemy.length, 11);
    // "1st Stage" / "General": the whole crew is Human. makeFlagship seats all 11 (wiki/flagship-systems.ts
    // flagshipSeats), so citedEnemy's addHumans top-up adds nobody.
    const humans = enemy.filter((member) => member.name === "Human");
    assert.equal(humans.length, 11);
    for (const member of humans) {
      assert.match(member.id, /^u[0-9a-z]+$/);
      assert.equal(member.side, "enemy");
      assert.equal(member.aboard, "enemy");
      assert.equal(member.hp, 100);
      assert.equal(member.maxHp, 100);
      assert.ok(ship.rooms.some((room) => room.id === member.room));
    }
    // "Minus the one in the Ion room" / "the Beam room": one crew member per artillery room.
    for (const id of ["e-ion", "e-laser", "e-missile", "e-beam"]) {
      assert.equal(humans.filter((member) => member.room === id).length, 1, id);
    }
  });

  it("reads ramStage only for the ship already in the fight", () => {
    const g = createGame(4);
    startCombat(g, "boss");
    const ship = g.enemy;
    assert.ok(ship);
    g.ramStage = 2;
    citedEnemy(g, "boss", ship, g.crew);
    assert.equal(ship.hull, 22);
    assert.equal(ship.hullMax, 22);
    assert.equal(ship.reactor, 44);
    assert.equal(ship.systems.engines.level, 3);
    assert.equal(ship.systems.shields.level, 8);
    assert.equal(ship.shieldNow, 4);
    assert.deepEqual(
      ship.weapons.map((weapon) => weapon.defId),
      ["bosslaser", "bossmissile", "bossbeam"],
    );
    assert.ok(ship.weapons.every((weapon) => weapon.enabled));
    // citedEnemy alone does not move crew; the stage swap that drops the Ion room is sim.ts advanceRam.
    assert.equal(g.crew.filter((member) => member.side === "enemy").length, 11);

    g.ramStage = 3;
    citedEnemy(g, "boss", ship, g.crew);
    assert.equal(ship.hull, 20);
    assert.equal(ship.hullMax, 20);
    assert.equal(ship.reactor, 32);
    assert.equal(ship.systems.engines.level, 6);
    assert.equal(ship.systems.weapons.level, 4);
    assert.equal(ship.systems.weapons.power, 4);
    assert.deepEqual(
      ship.weapons.map((weapon) => weapon.defId),
      ["bosslaser", "bossmissile"],
    );
    assert.ok(ship.weapons.every((weapon) => weapon.enabled));
    assert.equal(ship.zoltan, 12);
    assert.equal(ship.shieldNow, Math.floor(ship.systems.shields.power / 2));
    const spent =
      ship.systems.shields.power +
      ship.systems.engines.power +
      ship.systems.oxygen.power +
      ship.systems.medbay.power +
      ship.systems.weapons.power;
    assert.ok(spent <= ship.reactor);
  });
});

describe("Zoltan ship shield", () => {
  it("gives every Zoltan ship 5 points except sector 1 on easy", () => {
    const normal = createGame(4);
    normal.sector = 3;
    startCombat(normal, "Zoltan ship");
    assert.equal(normal.enemy?.faction, "zoltan");
    assert.equal(normal.enemy?.zoltan, 5);

    const easy = createGame(4, undefined, "easy");
    assert.equal(easy.sector, 1);
    startCombat(easy, "Zoltan ship");
    assert.equal(easy.enemy?.faction, "zoltan");
    assert.equal(easy.enemy?.zoltan, undefined);

    const hard = createGame(4, undefined, "hard");
    hard.sector = 1;
    startCombat(hard, "Zoltan ship");
    assert.equal(hard.enemy?.zoltan, 5);

    const rebel = createGame(4);
    rebel.sector = 4;
    startCombat(rebel, "scout");
    assert.notEqual(rebel.enemy?.faction, "zoltan");
    assert.equal(rebel.enemy?.zoltan, undefined);
  });
});
