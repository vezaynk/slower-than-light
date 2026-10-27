import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

const byId = Object.fromEntries(BEAM_WEAPONS.map((w) => [w.id, w]));

function gap(id: string): string {
  return BEAM_GAPS.filter((row) => row.id === id)
    .map((row) => row.note)
    .join("\n");
}

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
  });

  it("copies power, charge, damage, fire, price, and the italic blurb", () => {
    assert.equal(byId.BEAM_1.power, 1);
    assert.equal(byId.BEAM_1.charge, 12);
    assert.equal(byId.BEAM_1.damage, 1);
    assert.equal(byId.BEAM_1.fire, 0.1);
    assert.equal(byId.BEAM_1.price, 0);
    assert.equal(byId.BEAM_1.blurb, "Extremely cheap and weak beam weapon.");

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
});
