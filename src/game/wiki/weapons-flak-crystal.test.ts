import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { CHARGE_SECONDS, DAMAGE, PROJECTILES } from "../extras/flakart.ts";
import {
  FLAK_CRYSTAL_GAPS,
  FLAK_CRYSTAL_WEAPONS,
  type FlakCrystalGap,
} from "./weapons-flak-crystal.ts";

const FLAK_PAGE = readFileSync("/tmp/wiki-pages/Flak_Weapons.wikitext", "utf8");
const CRYSTAL_PAGE = readFileSync("/tmp/wiki-pages/Crystal_Weapons.wikitext", "utf8");
const SOURCE = readFileSync(
  fileURLToPath(new URL("./weapons-flak-crystal.ts", import.meta.url)),
  "utf8",
);

const CRYSTAL_IDS = ["crystalburst", "crystalburst2", "heavycrystal", "heavycrystal2"] as const;

function sections(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const chunk of text.split(/\n(?====)/)) {
    const match = chunk.match(/^===(.+?)===\n([\s\S]*)$/);
    if (!match) continue;
    let title = match[1];
    const tip = title.match(/\{\{tooltip\|([^|]+)\|/);
    if (tip) title = tip[1];
    map.set(title.replace(/''/g, "").trim(), match[2]);
  }
  return map;
}

function field(section: string, label: string): number {
  const match = section.match(new RegExp(`^\\*${label}:\\s*(\\d+)`, "m"));
  assert.ok(match, label);
  return Number(match[1]);
}

function quote(section: string): string {
  const match = section.match(/''"([^"]*)"''/);
  assert.ok(match);
  return match[1];
}

function rooms(section: string): string[] {
  return [...section.matchAll(/^\*\*(When fired at [^\n]+)/gm)].map((match) => match[1].trim());
}

function rarity(section: string): number {
  const match = section.match(/Store rarity:\s*(?:\{\{tooltip\|)?(\d+)/);
  assert.ok(match);
  return Number(match[1]);
}

function weapon(id: string) {
  const found = FLAK_CRYSTAL_WEAPONS.find((row) => row.id === id);
  assert.ok(found, id);
  return found;
}

function gap(id: string): FlakCrystalGap {
  const found = FLAK_CRYSTAL_GAPS.find((row) => row.id === id);
  assert.ok(found, id);
  return found;
}

const flak = sections(FLAK_PAGE);
const crystal = sections(CRYSTAL_PAGE);

describe("flak and crystal wiki weapons", () => {
  it("cites both page titles and the unmodeled crystal kind", () => {
    assert.match(SOURCE, /Flak \(Weapons\)/);
    assert.match(SOURCE, /Crystal \(Weapons\)/);
    assert.match(
      SOURCE,
      /kind "laser" is the closest stored kind and pierce is NOT modeled by kind/,
    );
    assert.match(SOURCE, /no percent is given/);
    assert.match(SOURCE, /they never cause fires or breaches/);
    assert.match(FLAK_PAGE, /they never cause fires or breaches/);
    assert.match(FLAK_PAGE, /all the shots arrive almost simultaneously/);
    assert.match(CRYSTAL_PAGE, /pierce one shield layer/);
  });

  it("fits Adv. Flak and Flak II and leaves Mark I and artillery off the list", () => {
    assert.deepEqual(
      FLAK_CRYSTAL_WEAPONS.map((row) => row.id),
      ["advflak", "flak2", ...CRYSTAL_IDS],
    );
    assert.equal(flak.has("Flak Gun Mark I"), true);
    assert.equal(
      FLAK_CRYSTAL_WEAPONS.some(
        (row) => row.name === "Flak Gun Mark I" || row.name === "Flak I" || row.id === "scatter",
      ),
      false,
    );
    assert.equal(
      FLAK_CRYSTAL_WEAPONS.some(
        (row) => row.name === "Flak Artillery" || row.id === "flak-artillery",
      ),
      false,
    );
    assert.equal(
      FLAK_CRYSTAL_GAPS.some((row) => row.id === "scatter" || row.id === "flak1"),
      false,
    );
  });

  it("copies Adv. Flak numbers, with price 0 because it is unsold", () => {
    const section = flak.get("Adv. Flak Gun");
    assert.ok(section);
    const row = weapon("advflak");
    assert.equal(row.name, "Adv. Flak Gun");
    assert.equal(row.kind, "flak");
    assert.equal(row.power, field(section, "Power requirement"));
    assert.equal(row.charge, field(section, "Charge time"));
    assert.equal(row.shots, field(section, "Shots"));
    assert.equal(row.damage, field(section, "Damage per shot"));
    assert.equal(row.gap, 0);
    assert.equal(row.ion, 0);
    assert.equal(row.fire, 0);
    assert.equal(row.breach, 0);
    assert.equal(row.ammo, false);
    assert.match(section, /cannot be bought or found/);
    assert.equal(section.includes("Purchase price"), false);
    assert.equal(row.price, 0);
    assert.notEqual(row.price, field(section, "Sells for"));
    assert.equal(row.blurb, quote(section));
    const extra = gap("advflak");
    assert.equal(extra.radius, field(section, "Targeting area radius"));
    assert.equal(extra.fake, field(section, "Additional fake flak"));
    assert.equal(extra.sell, field(section, "Sells for"));
    assert.deepEqual(extra.rooms, rooms(section));
    assert.equal(extra.pierce, undefined);
  });

  it("copies Flak II as seven projectiles of 1 damage", () => {
    const section = flak.get("Flak Gun Mark II");
    assert.ok(section);
    const row = weapon("flak2");
    assert.equal(row.name, "Flak Gun Mark II");
    assert.equal(row.kind, "flak");
    assert.equal(row.power, field(section, "Power requirement"));
    assert.equal(row.charge, field(section, "Charge time"));
    assert.equal(row.shots, field(section, "Shots"));
    assert.equal(row.damage, field(section, "Damage per shot"));
    assert.equal(row.price, field(section, "Purchase price"));
    assert.equal(row.gap, 0);
    assert.equal(row.fire, 0);
    assert.equal(row.breach, 0);
    assert.equal(row.ammo, false);
    assert.equal(row.blurb, quote(section));
    const extra = gap("flak2");
    assert.equal(extra.radius, field(section, "Targeting area radius"));
    assert.equal(extra.fake, field(section, "Additional fake flak"));
    assert.deepEqual(extra.rooms, rooms(section));
    assert.match(extra.note, new RegExp(`rarity ${rarity(section)}`));
  });

  it("records artillery radius and fake flak without taking the system from flakart.ts", () => {
    const section = flak.get("Flak Artillery");
    assert.ok(section);
    assert.match(section, /4 system levels maximum/);
    assert.match(
      section,
      /50s for level 1, reduced by 10 seconds for each level above 1 to a minimum of 20s for level 4/,
    );
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.equal(field(section, "Shots"), PROJECTILES);
    assert.equal(field(section, "Damage per shot"), DAMAGE);
    const extra = gap("flak-artillery");
    assert.match(extra.note, /flakart\.ts owns the system/);
    assert.equal(extra.radius, field(section, "Targeting area radius"));
    assert.equal(extra.fake, field(section, "Additional fake flak"));
    assert.deepEqual(extra.rooms, rooms(section));
    assert.match(section, /each flak projectile is auto-targeted at a random room/);
    assert.match(extra.note, /auto-targeted at a random room/);
  });

  it("stores crystal rows as lasers and keeps pierce 1 only in the gaps", () => {
    const titles = {
      crystalburst: "Crystal Burst Mark I",
      crystalburst2: "Crystal Burst Mark II",
      heavycrystal: "Heavy Crystal Mark I",
      heavycrystal2: "Heavy Crystal Mark II",
    } as const;
    for (const id of CRYSTAL_IDS) {
      const section = crystal.get(titles[id]);
      assert.ok(section, id);
      const row = weapon(id);
      assert.equal(row.name, titles[id]);
      assert.equal(row.kind, "laser");
      assert.equal(row.power, field(section, "Power requirement"));
      assert.equal(row.charge, field(section, "Charge time"));
      assert.equal(row.shots, field(section, "Shots"));
      assert.equal(row.damage, field(section, "Damage per shot"));
      assert.equal(row.price, field(section, "Purchase price"));
      assert.equal(row.gap, 0);
      assert.equal(row.ion, 0);
      assert.equal(row.fire, 0);
      assert.equal(row.ammo, false);
      assert.equal(row.blurb, quote(section));
      const effect = section.match(/^\*Effect: (.+)$/m);
      assert.ok(effect);
      assert.equal(effect[1].includes("%"), false);
      if (effect[1].includes("guaranteed breach")) {
        assert.equal(row.breach, 1);
      } else {
        assert.match(effect[1], /low chance of breach/);
        assert.equal(row.breach, 0);
      }
      const extra = gap(id);
      assert.equal(extra.pierce, 1);
      assert.equal(extra.radius, undefined);
      assert.equal(extra.fake, undefined);
      assert.match(extra.note, /pierce/);
      assert.match(extra.note, /no percent is given/);
      assert.match(extra.note, new RegExp(`rarity ${rarity(section)}`));
    }
  });
});
