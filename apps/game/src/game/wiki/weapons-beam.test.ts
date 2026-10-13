import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyImpact, createGame, evasionPercent, startCombat } from "../sim.ts";
import type { Game, Shot } from "../types.ts";
import { BEAM_CREW, BEAM_GAPS, BEAM_TILES, BEAM_WEAPONS, beamTileLength } from "./weapons-beam.ts";

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

const src = readFileSync(new URL("./weapons-beam.ts", import.meta.url), "utf8");

describe("beam weapons", () => {
  it("emits the slotted rows and not Artillery Beam or Boss Beam", () => {
    assert.deepEqual(
      BEAM_WEAPONS.map((w) => w.id),
      ["mini", "pike", "hullbeam", "halberd", "glaive", "firebeam", "antibio"],
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
    assert.equal(byId.mini.power, 1);
    assert.equal(byId.mini.charge, 12);
    assert.equal(byId.mini.damage, 1);
    assert.equal(byId.mini.fire, 0.1);
    assert.equal(byId.mini.price, 0);
    assert.equal(byId.mini.blurb, "Extremely cheap and weak beam weapon.");
    assert.match(src, /Sells for: 10/);

    assert.equal(byId.pike.power, 2);
    assert.equal(byId.pike.charge, 16);
    assert.equal(byId.pike.damage, 1);
    assert.equal(byId.pike.fire, 0);
    assert.equal(byId.pike.price, 55);
    assert.equal(byId.pike.blurb, "Can cut across entire ships, assuming there's no shield to stop it.");

    assert.equal(byId.hullbeam.power, 2);
    assert.equal(byId.hullbeam.charge, 14);
    assert.equal(byId.hullbeam.damage, 1);
    assert.equal(byId.hullbeam.fire, 0);
    assert.equal(byId.hullbeam.price, 70);
    assert.equal(
      byId.hullbeam.blurb,
      "This beam is most powerful when targeting large, empty sections of hull.",
    );

    assert.equal(byId.halberd.power, 3);
    assert.equal(byId.halberd.charge, 17);
    assert.equal(byId.halberd.damage, 2);
    assert.equal(byId.halberd.fire, 0);
    assert.equal(byId.halberd.price, 65);
    assert.equal(byId.halberd.blurb, "Slow but reliably powerful standard beam weapon.");

    assert.equal(byId.glaive.power, 4);
    assert.equal(byId.glaive.charge, 25);
    assert.equal(byId.glaive.damage, 3);
    assert.equal(byId.glaive.fire, 0);
    assert.equal(byId.glaive.price, 95);
    assert.equal(
      byId.glaive.blurb,
      "One of the most powerful weapons of war ever created. Known to take out some ships in a single blast.",
    );

    assert.equal(byId.firebeam.power, 2);
    assert.equal(byId.firebeam.charge, 20);
    assert.equal(byId.firebeam.damage, 0);
    assert.equal(byId.firebeam.fire, 0.8);
    assert.equal(byId.firebeam.price, 50);
    assert.equal(byId.firebeam.blurb, "This terrifying beam does no physical damage but ignites fires.");

    assert.equal(byId.antibio.power, 2);
    assert.equal(byId.antibio.charge, 16);
    assert.equal(byId.antibio.damage, 0);
    assert.equal(byId.antibio.fire, 0);
    assert.equal(byId.antibio.price, 50);
    assert.equal(
      byId.antibio.blurb,
      "This terrifying beam does no physical damage, but rips through organic material, dealing heavy damage to crew members.",
    );
  });

  it("stores printed crew-damage HP and leaves the dash and blocked beams out", () => {
    assert.equal(BEAM_CREW.mini, 15);
    assert.equal(BEAM_CREW.pike, 15);
    assert.equal(BEAM_CREW.hullbeam, 15);
    assert.equal(BEAM_CREW.halberd, 30);
    assert.equal(BEAM_CREW.glaive, 45);
    assert.equal(BEAM_CREW.antibio, 60);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "firebeam"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "bossbeam"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(BEAM_CREW, "artillery-beam"), false);
    assert.match(src, /Fire Beam's crew line is "-"/);
  });

  it("stores the printed tile lengths", () => {
    // Beam (Weapons): the parenthetical is the tile count. shear is the fitted Pike id.
    assert.equal(BEAM_TILES.mini, 1);
    assert.equal(BEAM_TILES.pike, 3.8);
    assert.equal(beamTileLength("shear"), 3.8);
    assert.equal(BEAM_TILES.hullbeam, 2.2);
    assert.equal(BEAM_TILES.halberd, 1.8);
    assert.equal(BEAM_TILES.glaive, 1.8);
    assert.equal(BEAM_TILES.firebeam, 3.1);
    assert.equal(BEAM_TILES.antibio, 3.1);
    assert.equal(beamTileLength("artillery-beam"), null);
  });

  it("parks length, rooms, pierce, and anti-bio crew damage in gaps", () => {
    assert.match(gap("mini"), /beam length 45/);
    assert.match(gap("mini"), /15 HP/);
    assert.match(gap("pike"), /beam length 170/);
    assert.match(gap("hullbeam"), /beam length 100/);
    assert.match(gap("hullbeam"), /2 damage on systemless rooms/);
    assert.match(gap("halberd"), /beam length 80/);
    assert.match(gap("halberd"), /3-4 rooms straight/);
    assert.match(gap("halberd"), /2-3 diagonally/);
    assert.match(gap("halberd"), /5 max/);
    assert.match(gap("halberd"), /1 damage per room through 1 shield/);
    assert.match(gap("glaive"), /beam length 80/);
    assert.match(gap("glaive"), /1 damage per room through 2 shields/);
    assert.match(gap("glaive"), /2 damage per room through 1 shield/);
    assert.match(gap("firebeam"), /beam length 140/);
    assert.match(gap("firebeam"), /1 point of damage twice/);
    assert.match(gap("antibio"), /beam length 140/);
    assert.match(gap("antibio"), /60 HP/);
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

    assert.equal(byId.bossbeam, undefined);
    const boss = gap("bossbeam");
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
      applyImpact(g, beamShot({ damage: 3, defId: "glaive", beamRooms: ["p-weapons"], targetRoom: "p-weapons" }));
      return { shields: g.player.shieldNow, system: systemDamage(g, "p-weapons"), hull: hull - g.player.hull };
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

  it("spends a Zoltan Shield at 33% and 80% of the path, once each", () => {
    const path = ["p-engines", "p-shields", "p-oxygen", "p-medbay"];
    const held = quiet();
    const hull = held.player.hull;
    applyImpact(held, beamShot({ damage: 2, defId: "halberd", beamRooms: path }));
    // Halberd: 2 damage times 2 instances. The bubble still has a point, so the hull is untouched.
    assert.equal(held.player.zoltan, 1);
    assert.equal(held.player.hull, hull);
    for (const id of path) assert.equal(systemDamage(held, id), 0);

    const fire = quiet();
    applyImpact(fire, beamShot({ damage: 0, defId: "firebeam", fireChance: 1, beamRooms: path }));
    assert.equal(fire.player.zoltan, 3);
    assert.equal(fire.player.rooms.find((room) => room.id === "p-engines")?.fire ?? 0, 0);

    const anti = quiet();
    applyImpact(anti, beamShot({ damage: 0, defId: "antibio", beamRooms: path }));
    assert.equal(anti.player.zoltan, 3);
    assert.equal(anti.player.hull, hull);

    // The second tick is at 80%. A 2-point bubble pays both 1-damage instances and breaks there.
    // INFERRED equal slices: only the last quarter of a 4-room path is still ahead of 80%.
    const tail = quiet();
    tail.player.zoltan = 2;
    applyImpact(tail, beamShot({ damage: 1, defId: "mini", beamRooms: path }));
    assert.equal(tail.player.zoltan, 0);
    assert.equal(systemDamage(tail, "p-engines"), 0);
    assert.equal(systemDamage(tail, "p-shields"), 0);
    assert.equal(systemDamage(tail, "p-oxygen"), 0);
    assert.equal(systemDamage(tail, "p-medbay"), 1);

    // Beam Drone 1 and Fire Drone have no second tick. The first tick breaks a 1-point bubble at 33%.
    const drone = quiet();
    drone.player.zoltan = 1;
    applyImpact(drone, beamShot({ damage: 1, defId: "beam", label: "drone:beam1", beamRooms: path }));
    assert.equal(drone.player.zoltan, 0);
    assert.equal(systemDamage(drone, "p-engines"), 0);
    assert.equal(systemDamage(drone, "p-shields"), 1);

    const flame = quiet();
    flame.player.zoltan = 4;
    applyImpact(flame, beamShot({ damage: 1, defId: "fire", fireChance: 0.9, label: "drone:fire", beamRooms: path }));
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
    ship.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
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
      beamShot({ damage: 1, from: "player", targetRoom: room.id, beamRooms: [room.id], defId: "mini" }),
    );
    assert.equal(ship.hull, before - 1);
    applyImpact(g, {
      ...beamShot({ damage: 1, from: "player", targetRoom: room.id, defId: "burst1" }),
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
