import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyImpact, createGame, evasionPercent, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import {
  ARTILLERY_BEAM_PX,
  BEAM_CREW,
  BEAM_GAPS,
  BEAM_SPEED,
  BEAM_TILES,
  BEAM_WEAPONS,
  artillerySwipeSeconds,
  beamBodyTiles,
  beamSwipeSeconds,
  beamTileLength,
} from "./weapons-beam.ts";

function beamShot(partial: Partial<Shot> & Pick<Shot, "damage">): Shot {
  return {
    id: "beam-tick",
    kind: "beam",
    from: "enemy",
    ion: 0,
    fireChance: 0,
    breachChance: 0,
    targetRoom: partial.beamRooms?.[0] ?? "p-weapons",
    wait: 0,
    t: 1,
    duration: 1,
    ...partial,
  };
}

function quiet(seed = 4): Game {
  const g = createGame(seed);
  g.player.systems.engines.power = 0;
  g.player.shieldNow = 0;
  g.player.zoltan = 5;
  return g;
}

function systemDamage(g: Game, roomId: string): number {
  const room = g.player.rooms.find((item) => item.id === roomId);
  assert.ok(room?.system);
  return g.player.systems[room.system].damage;
}

const byId = Object.fromEntries(BEAM_WEAPONS.map((w) => [w.id, w]));

function gap(id: string): string {
  return BEAM_GAPS.filter((g) => g.id === id)
    .map((g) => g.note)
    .join("\n");
}

const src = readFileSync(
  new URL("../../../../../packages/catalog/src/wiki/weapons-beam.ts", import.meta.url),
  "utf8",
);

describe("beam weapons", () => {
  it("emits the slotted rows and not Artillery Beam or Boss Beam", () => {
    assert.deepEqual(
      BEAM_WEAPONS.map((w) => w.id),
      ["BEAM_1", "BEAM_LONG", "BEAM_HULL", "BEAM_2", "BEAM_3", "BEAM_FIRE", "BEAM_BIO"],
    );
    assert.deepEqual(
      BEAM_WEAPONS.map((w) => w.name),
      [
        "Mini Beam",
        "Pike Beam",
        "Hull Beam",
        "Halberd Beam",
        "Glaive Beam",
        "Fire Beam",
        "Anti-Bio Beam",
      ],
    );
    assert.equal(
      BEAM_WEAPONS.some((w) => /artillery/i.test(w.id) || /artillery/i.test(w.name)),
      false,
    );
    assert.equal(byId["artillery-beam"], undefined);
  });

  it("is beam, spends no ammo, and does not invent a shot gap", () => {
    for (const w of BEAM_WEAPONS) {
      assert.equal(w.kind, "beam");
      assert.equal(w.ammo, false);
      assert.equal(w.gap, 0);
      assert.equal(w.shots, 1);
      assert.equal(w.ion, 0);
      assert.equal(w.breach, 0);
    }
    assert.match(src, /INFERRED: shots 1, gap 0/);
  });

  it("copies power, charge, damage, fire, price, and the italic blurb", () => {
    assert.equal(byId.BEAM_1.power, 1);
    assert.equal(byId.BEAM_1.charge, 12);
    assert.equal(byId.BEAM_1.damage, 1);
    assert.equal(byId.BEAM_1.fire, 0.1);
    assert.equal(byId.BEAM_1.price, 0);
    assert.equal(byId.BEAM_1.blurb, "Extremely cheap and weak beam weapon.");
    assert.match(src, /Sells for: 10/);

    assert.equal(byId.BEAM_LONG.power, 2);
    assert.equal(byId.BEAM_LONG.charge, 16);
    assert.equal(byId.BEAM_LONG.damage, 1);
    assert.equal(byId.BEAM_LONG.fire, 0);
    assert.equal(byId.BEAM_LONG.price, 55);
    assert.equal(
      byId.BEAM_LONG.blurb,
      "Can cut across entire ships, assuming there's no shield to stop it.",
    );

    assert.equal(byId.BEAM_HULL.power, 2);
    assert.equal(byId.BEAM_HULL.charge, 14);
    assert.equal(byId.BEAM_HULL.damage, 1);
    assert.equal(byId.BEAM_HULL.fire, 0);
    assert.equal(byId.BEAM_HULL.price, 70);
    assert.equal(
      byId.BEAM_HULL.blurb,
      "This beam is most powerful when targeting large, empty sections of hull.",
    );

    assert.equal(byId.BEAM_2.power, 3);
    assert.equal(byId.BEAM_2.charge, 17);
    assert.equal(byId.BEAM_2.damage, 2);
    assert.equal(byId.BEAM_2.fire, 0);
    assert.equal(byId.BEAM_2.price, 65);
    assert.equal(byId.BEAM_2.blurb, "Slow but reliably powerful standard beam weapon.");

    assert.equal(byId.BEAM_3.power, 4);
    assert.equal(byId.BEAM_3.charge, 25);
    assert.equal(byId.BEAM_3.damage, 3);
    assert.equal(byId.BEAM_3.fire, 0);
    assert.equal(byId.BEAM_3.price, 95);
    assert.equal(
      byId.BEAM_3.blurb,
      "One of the most powerful weapons of war ever created. Known to take out some ships in a single blast.",
    );

    assert.equal(byId.BEAM_FIRE.power, 2);
    assert.equal(byId.BEAM_FIRE.charge, 20);
    assert.equal(byId.BEAM_FIRE.damage, 0);
    assert.equal(byId.BEAM_FIRE.fire, 0.8);
    assert.equal(byId.BEAM_FIRE.price, 50);
    assert.equal(
      byId.BEAM_FIRE.blurb,
      "This terrifying beam does no physical damage but ignites fires.",
    );

    assert.equal(byId.BEAM_BIO.power, 2);
    assert.equal(byId.BEAM_BIO.charge, 16);
    assert.equal(byId.BEAM_BIO.damage, 0);
    assert.equal(byId.BEAM_BIO.fire, 0);
    assert.equal(byId.BEAM_BIO.price, 50);
    assert.equal(
      byId.BEAM_BIO.blurb,
      "This terrifying beam does no physical damage, but rips through organic material, dealing heavy damage to crew members.",
    );
  });

  it("stores printed crew-damage HP and leaves the dash and blocked beams out", () => {
    assert.equal(BEAM_CREW.BEAM_1, 15);
    assert.equal(BEAM_CREW.BEAM_LONG, 15);
    assert.equal(BEAM_CREW.BEAM_HULL, 15);
    assert.equal(BEAM_CREW.BEAM_2, 30);
    assert.equal(BEAM_CREW.BEAM_3, 45);
    assert.equal(BEAM_CREW.BEAM_BIO, 60);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "BEAM_FIRE"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "ARTILLERY_BOSS_3"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "artillery-beam"), false);
    assert.match(src, /Fire Beam's crew line is "-"/);
  });

  it("stores the printed tile lengths", () => {
    // Beam (Weapons): the parenthetical is the tile count. Pike Beam is BEAM_LONG.
    assert.equal(BEAM_TILES.BEAM_1, 1);
    assert.equal(BEAM_TILES.BEAM_LONG, 3.8);
    assert.equal(beamTileLength("BEAM_LONG"), 3.8);
    assert.equal(BEAM_TILES.BEAM_HULL, 2.2);
    assert.equal(BEAM_TILES.BEAM_2, 1.8);
    assert.equal(BEAM_TILES.BEAM_3, 1.8);
    assert.equal(BEAM_TILES.BEAM_FIRE, 3.1);
    assert.equal(BEAM_TILES.BEAM_BIO, 3.1);
    assert.equal(BEAM_TILES.ARTILLERY_BOSS_3, 2.2);
    assert.equal(beamTileLength("artillery-beam"), null);
    assert.equal(beamBodyTiles("BEAM_LONG"), 3.8);
    assert.equal(beamBodyTiles("artillery-beam"), ARTILLERY_BEAM_PX / 45);
  });

  it("times a swipe from the Multiverse weapon database speed", () => {
    // Data:WeaponDatabase.map. Speed 5 is 80 pixels per second. 45 pixels is one diagonal tile.
    assert.deepEqual(BEAM_SPEED, {
      BEAM_1: 3,
      BEAM_LONG: 9,
      BEAM_HULL: 5,
      BEAM_2: 5,
      BEAM_3: 5,
      BEAM_FIRE: 5,
      BEAM_BIO: 30,
      ARTILLERY_BOSS_3: 5,
      "artillery-beam": 13,
    });
    assert.equal(beamSwipeSeconds("BEAM_1", 1), 45 / (3 * 16));
    assert.equal(beamSwipeSeconds("BEAM_LONG", BEAM_TILES.BEAM_LONG), (3.8 * 45) / (9 * 16));
    assert.equal(beamSwipeSeconds("BEAM_2", BEAM_TILES.BEAM_2), (1.8 * 45) / (5 * 16));
    assert.equal(beamSwipeSeconds("BEAM_BIO", BEAM_TILES.BEAM_BIO), (3.1 * 45) / (30 * 16));
    assert.equal(
      beamSwipeSeconds("ARTILLERY_BOSS_3", BEAM_TILES.ARTILLERY_BOSS_3),
      (2.2 * 45) / (5 * 16),
    );
    assert.equal(artillerySwipeSeconds(), ARTILLERY_BEAM_PX / (13 * 16));
    assert.equal(beamSwipeSeconds("BEAM_FIRE", 0), 0);
    assert.equal(beamSwipeSeconds(undefined, 1), null);
  });

  it("parks length, rooms, pierce, and anti-bio crew damage in gaps", () => {
    assert.match(gap("BEAM_1"), /beam length 45/);
    assert.match(gap("BEAM_1"), /15 HP/);
    assert.match(gap("BEAM_LONG"), /beam length 170/);
    assert.match(gap("BEAM_HULL"), /beam length 100/);
    assert.match(gap("BEAM_HULL"), /2 damage on systemless rooms/);
    assert.match(gap("BEAM_2"), /beam length 80/);
    assert.match(gap("BEAM_2"), /3-4 rooms straight/);
    assert.match(gap("BEAM_2"), /2-3 diagonally/);
    assert.match(gap("BEAM_2"), /5 max/);
    assert.match(gap("BEAM_2"), /1 damage per room through 1 shield/);
    assert.match(gap("BEAM_3"), /beam length 80/);
    assert.match(gap("BEAM_3"), /1 damage per room through 2 shields/);
    assert.match(gap("BEAM_3"), /2 damage per room through 1 shield/);
    assert.match(gap("BEAM_FIRE"), /beam length 140/);
    assert.match(gap("BEAM_FIRE"), /1 point of damage twice/);
    assert.match(gap("BEAM_BIO"), /beam length 140/);
    assert.match(gap("BEAM_BIO"), /60 HP/);
    assert.match(gap("shield-layers"), /reduced by one for every shield layer/);
    assert.match(gap("swipe"), /second click fires/);
    assert.match(gap("swipe"), /stops at the printed tile length/);
    assert.match(gap("swipe"), /one door-neighbour/);
    assert.match(gap("zoltan-shield"), /33%/);
    assert.match(gap("zoltan-shield"), /80%/);
  });

  it("copies Artillery Beam numbers under lance.ts and keeps Boss Beam out of this catalog", () => {
    const art = gap("artillery-beam");
    assert.match(art, /lance\.ts owns the system/);
    assert.match(art, /4 system levels/);
    assert.match(art, /50s for level 1/);
    assert.match(art, /reduced by 10 seconds/);
    assert.match(art, /20s for level 4/);
    assert.match(art, /Beam length 500/);
    assert.match(art, /1 damage per room hit/);
    assert.match(art, /15 HP/);
    assert.match(art, /10% chance to start fire/);
    assert.equal(art.includes("BLOCKED"), false);

    assert.equal(byId.ARTILLERY_BOSS_3, undefined);
    const boss = gap("ARTILLERY_BOSS_3");
    assert.equal(boss.includes("BLOCKED"), false);
    assert.match(boss, /artillery maximum is 3/);
    assert.match(boss, /not a Weapons-pool cost/);
    assert.match(boss, /flagship-weapons\.ts/);
    assert.match(boss, /does not emit a second WeaponDef/);
    assert.match(boss, /32\.5s/);
    assert.match(boss, /26s/);
    assert.match(boss, /19\.5s/);
    assert.match(boss, /Beam length 100/);
    assert.match(boss, /2 damage per room hit/);
  });

  it("deals Glaive's printed damage through one shield and through two", () => {
    // Beam (Weapons), Glaive Beam: 2 damage per room through 1 shield, or 1 through 2. Layers stay up.
    function hit(layers: number) {
      const g = createGame(3);
      g.player.systems.engines.power = 0;
      g.player.zoltan = 0;
      // Shields, Overview: one barrier for every two powered levels. Two layers need four bars.
      g.player.systems.shields.level = layers * 2;
      g.player.systems.shields.power = layers * 2;
      g.player.shieldNow = layers;
      const hull = g.player.hull;
      applyImpact(
        g,
        beamShot({ damage: 3, defId: "BEAM_3", beamRooms: ["p-weapons"], targetRoom: "p-weapons" }),
      );
      return {
        shields: g.player.shieldNow,
        system: systemDamage(g, "p-weapons"),
        hull: hull - g.player.hull,
      };
    }
    const one = hit(1);
    assert.equal(one.shields, 1);
    assert.equal(one.system, 2);
    assert.equal(one.hull, 2);
    const two = hit(2);
    assert.equal(two.shields, 2);
    assert.equal(two.system, 1);
    assert.equal(two.hull, 1);
  });

  function armed(level: number, power: number, layers: number): Game {
    const g = createGame(3);
    g.player.systems.engines.power = 0;
    g.player.zoltan = 0;
    g.player.systems.shields.level = level;
    g.player.systems.shields.power = power;
    g.player.systems.shields.damage = 0;
    g.player.shieldNow = layers;
    return g;
  }

  it("deals full damage to rooms entered after a Shields-2 hit drops the layer", () => {
    // Beam (Weapons), "Beam targeting and damage mechanics": damage is applied when the beam enters a room.
    // Shields, Overview: one barrier for every two powered bars. Halberd's 1 point through one layer
    // leaves a Shields-2 system with one bar, so the bubble is gone before the next room.
    const g = armed(2, 2, 1);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: 2,
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons", "p-engines"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.shieldNow, 0);
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(systemDamage(g, "p-weapons"), 2);
    assert.equal(systemDamage(g, "p-engines"), 2);
    assert.equal(hull - g.player.hull, 5);
  });

  it("keeps the layer cut on rooms the beam already entered", () => {
    const g = armed(2, 2, 1);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: 2,
        defId: "BEAM_2",
        beamRooms: ["p-weapons", "p-shields", "p-engines"],
        targetRoom: "p-weapons",
      }),
    );
    assert.equal(systemDamage(g, "p-weapons"), 1);
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 0);
    assert.equal(systemDamage(g, "p-engines"), 2);
    assert.equal(hull - g.player.hull, 4);
  });

  it("leaves the bubble up when one point of beam damage still leaves two shield bars", () => {
    // Shields-3 holds one layer and one buffer bar. The 1 point through that layer does not drop it.
    const g = armed(3, 2, 1);
    applyImpact(
      g,
      beamShot({
        damage: 2,
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(systemDamage(g, "p-weapons"), 1);
  });

  it("drops one of two layers when the pierce damage hits Shields-4, then uses the layer that remains", () => {
    // Glaive deals 1 through two layers. That point takes Shields-4 from four bars to three, so one bubble remains.
    const g = armed(4, 4, 2);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: 3,
        defId: "BEAM_3",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.systems.shields.damage, 1);
    assert.equal(g.player.shieldNow, 1);
    assert.equal(systemDamage(g, "p-weapons"), 2);
    assert.equal(hull - g.player.hull, 3);
  });

  it("does not pop a layer when every room's damage is cut to zero", () => {
    const g = armed(4, 4, 2);
    const hull = g.player.hull;
    applyImpact(
      g,
      beamShot({
        damage: 2,
        defId: "BEAM_2",
        beamRooms: ["p-shields", "p-weapons"],
        targetRoom: "p-shields",
      }),
    );
    assert.equal(g.player.shieldNow, 2);
    assert.equal(g.player.systems.shields.damage, 0);
    assert.equal(systemDamage(g, "p-weapons"), 0);
    assert.equal(g.player.hull, hull);
  });

  it("spends a Zoltan Shield at 33% and 80% of the path, once each", () => {
    const path = ["p-engines", "p-shields", "p-oxygen", "p-medbay"];
    const held = quiet();
    const hull = held.player.hull;
    applyImpact(held, beamShot({ damage: 2, defId: "BEAM_2", beamRooms: path }));
    // Halberd: 2 damage times 2 instances. The bubble still has a point, so the hull is untouched.
    assert.equal(held.player.zoltan, 1);
    assert.equal(held.player.hull, hull);
    for (const id of path) assert.equal(systemDamage(held, id), 0);

    const fire = quiet();
    applyImpact(fire, beamShot({ damage: 0, defId: "BEAM_FIRE", fireChance: 1, beamRooms: path }));
    assert.equal(fire.player.zoltan, 3);
    assert.equal(fire.player.rooms.find((room) => room.id === "p-engines")?.fire ?? 0, 0);

    const anti = quiet();
    applyImpact(anti, beamShot({ damage: 0, defId: "BEAM_BIO", beamRooms: path }));
    assert.equal(anti.player.zoltan, 3);
    assert.equal(anti.player.hull, hull);

    // The second tick is at 80%. A 2-point bubble pays both 1-damage instances and breaks there.
    // INFERRED equal slices: only the last quarter of a 4-room path is still ahead of 80%.
    const tail = quiet();
    tail.player.zoltan = 2;
    applyImpact(tail, beamShot({ damage: 1, defId: "BEAM_1", beamRooms: path }));
    assert.equal(tail.player.zoltan, 0);
    assert.equal(systemDamage(tail, "p-engines"), 0);
    assert.equal(systemDamage(tail, "p-shields"), 0);
    assert.equal(systemDamage(tail, "p-oxygen"), 0);
    assert.equal(systemDamage(tail, "p-medbay"), 1);

    // Beam Drone 1 and Fire Drone have no second tick. The first tick breaks a 1-point bubble at 33%.
    const drone = quiet();
    drone.player.zoltan = 1;
    applyImpact(
      drone,
      beamShot({ damage: 1, defId: "COMBAT_BEAM", label: "drone:beam1", beamRooms: path }),
    );
    assert.equal(drone.player.zoltan, 0);
    assert.equal(systemDamage(drone, "p-engines"), 0);
    assert.equal(systemDamage(drone, "p-shields"), 1);

    const flame = quiet();
    flame.player.zoltan = 4;
    applyImpact(
      flame,
      beamShot({ damage: 1, defId: "fire", fireChance: 0.9, label: "drone:fire", beamRooms: path }),
    );
    assert.equal(flame.player.zoltan, 3);
    assert.equal(flame.player.hull, hull);
  });

  it("hits a ship that would dodge every other shot", () => {
    // Beam (Weapons) and Weapons, "Beams": "They are the only weapons that never miss."
    const g = createGame(3);
    startCombat(g, "scout");
    const ship = g.enemy;
    assert.ok(ship);
    ship.systems.engines.level = 8;
    ship.systems.engines.power = 8;
    ship.systems.engines.damage = 0;
    ship.systems.pilot.level = Math.max(1, ship.systems.pilot.level);
    ship.systems.pilot.damage = 0;
    ship.kits.cloaking = {
      id: "cloaking",
      level: 1,
      power: 1,
      left: 5,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    const engines = ship.rooms.find((r) => r.system === "engines");
    const pilot = ship.rooms.find((r) => r.system === "pilot");
    const crew = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0);
    if (engines && crew[0]) {
      crew[0].room = engines.id;
      crew[0].path = [];
    }
    if (pilot && crew[1]) {
      crew[1].room = pilot.id;
      crew[1].path = [];
    }
    assert.equal(evasionPercent(g, ship, "enemy"), 100);
    ship.shieldNow = 0;
    ship.zoltan = 0;
    const room = ship.rooms.find((r) => r.system === "weapons") ?? ship.rooms[0];
    assert.ok(room);
    const before = ship.hull;
    applyImpact(
      g,
      beamShot({
        damage: 1,
        from: "player",
        targetRoom: room.id,
        beamRooms: [room.id],
        defId: "BEAM_1",
      }),
    );
    assert.equal(ship.hull, before - 1);
    applyImpact(g, {
      ...beamShot({ damage: 1, from: "player", targetRoom: room.id, defId: "LASER_BURST_2_A" }),
      kind: "laser",
      beamRooms: undefined,
    });
    assert.equal(ship.hull, before - 1);
  });

  it("cites Beam (Weapons) and each section heading", () => {
    assert.match(src, /Beam \(Weapons\)/);
    for (const heading of [
      "Mini Beam",
      "Pike Beam",
      "Hull Beam",
      "Halberd Beam",
      "Glaive Beam",
      "Fire Beam",
      "Anti-Bio Beam",
      "Artillery Beam",
      "Boss Beam",
    ]) {
      assert.match(src, new RegExp(`"${heading}"`));
    }
  });
});
