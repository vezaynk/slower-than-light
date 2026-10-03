import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BEAM_CREW, BEAM_GAPS, BEAM_WEAPONS } from "./weapons-beam.ts";

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
    assert.match(gap("zoltan-shield"), /33%/);
    assert.match(gap("zoltan-shield"), /80%/);
  });

  it("copies Artillery Beam numbers under lance.ts and blocks Boss Beam", () => {
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
    assert.match(boss, /BLOCKED/);
    assert.match(boss, /missing field: power/);
    assert.match(boss, /32\.5s/);
    assert.match(boss, /26s/);
    assert.match(boss, /19\.5s/);
    assert.match(boss, /Beam length 100/);
    assert.match(boss, /2 damage per room hit/);
    assert.match(boss, /no WeaponDef is emitted/);
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
