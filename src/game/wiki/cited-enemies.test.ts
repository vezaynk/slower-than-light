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
    assert.equal(ship.systems.medbay.level, 0);
    assert.equal(ship.systems.doors.level, 0);
    const spent =
      ship.systems.shields.power +
      ship.systems.engines.power +
      ship.systems.oxygen.power +
      ship.systems.weapons.power;
    assert.ok(spent <= ship.reactor);
    assert.deepEqual(
      ship.weapons.map((weapon) => weapon.defId),
      ["bossion", "bossmissile"],
    );
    assert.equal(WEAPONS.bossion?.power, 3);
    assert.equal(WEAPONS.bossmissile?.power, 4);
    assert.equal(ship.weapons[0]?.enabled, true);
    assert.equal(ship.weapons[1]?.enabled, false);
    assert.deepEqual(
      ship.rooms.map((room) => room.id),
      ["e-shields", "e-weapons", "e-oxygen", "e-pilot", "e-engines"],
    );
    const enemy = g.crew.filter((member) => member.side === "enemy");
    assert.equal(enemy.length, 11);
    // "1st Stage" / "General": the whole crew is Human, including the three seated before addHumans.
    const humans = enemy.filter((member) => member.name === "Human");
    assert.equal(humans.length, 11);
    // The id checks cover the eight addHumans seats (decimal ids); the first three come from sim uid().
    const added = humans.slice(3);
    const ids = added.map((member) => Number(member.id.slice(1)));
    for (let i = 1; i < ids.length; i++) assert.equal(ids[i], (ids[i - 1] ?? 0) + 1);
    for (const member of added) {
      assert.match(member.id, /^u\d+$/);
      assert.equal(member.side, "enemy");
      assert.equal(member.aboard, "enemy");
      assert.equal(member.hp, 100);
      assert.equal(member.maxHp, 100);
      assert.ok(ship.rooms.some((room) => room.id === member.room));
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
      ["bossmissile"],
    );
    assert.equal(ship.weapons[0]?.enabled, false);
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
      ["bossmissile"],
    );
    assert.equal(ship.weapons[0]?.enabled, true);
    assert.equal(ship.zoltan, 12);
    assert.equal(ship.shieldNow, Math.floor(ship.systems.shields.power / 2));
    const spent =
      ship.systems.shields.power +
      ship.systems.engines.power +
      ship.systems.oxygen.power +
      ship.systems.weapons.power;
    assert.ok(spent <= ship.reactor);
  });
});
