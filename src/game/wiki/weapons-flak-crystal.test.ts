import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FLAK1_FAKE_LABEL } from "../extras/ordnance.ts";
import { CHARGE_SECONDS, DAMAGE, PROJECTILES } from "../extras/flakart.ts";
import { ACQUIRE_S, enemyDefenseIntercept, tickSwarm } from "../extras/swarm.ts";
import { applyImpact, createGame, fireReady, rand, startCombat } from "../sim.ts";
import {
  ADV_FLAK_FAKE,
  ADV_NARROW_CUTS,
  ADV_WIDE_CUTS,
  FLAK2_FAKE,
  FLAK2_NARROW_CUTS,
  FLAK2_WIDE_CUTS,
  FLAK_CRYSTAL_GAPS,
  FLAK_CRYSTAL_WEAPONS,
  advFlakAimRolls,
  advFlakLanding,
  flak2AimRolls,
  flak2Landing,
  type Flak2Room,
  type FlakCrystalGap,
} from "./weapons-flak-crystal.ts";
import { wikiPage } from "./dump/index.ts";

const FLAK_PAGE = wikiPage("Flak (Weapons)");
const CRYSTAL_PAGE = wikiPage("Crystal (Weapons)");
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
      assert.equal("pierce" in row, false);
      assert.match(extra.note, /WeaponDef has no pierce field/);
      assert.match(extra.note, /pierce/);
      assert.match(extra.note, /no percent is given/);
      assert.match(extra.note, new RegExp(`rarity ${rarity(section)}`));
    }
  });
});

const narrow: Flak2Room = { id: "aim", x: 1, y: 1, w: 2, h: 1 };
const north: Flak2Room = { id: "north", x: 1, y: 0, w: 2, h: 1 };
const square: Flak2Room = { id: "box", x: 0, y: 0, w: 2, h: 2 };
const beside: Flak2Room = { id: "beside", x: 0, y: -1, w: 2, h: 1 };

describe("Flak II room odds", () => {
  it("keeps the printed 1x2 and 2x2 cuts", () => {
    // Flak (Weapons), Flak Gun Mark II. The last outer long-side tile is 0.27 because the printed percents sum to 100.02.
    assert.equal(FLAK2_NARROW_CUTS[0], 2578 / 10000);
    assert.equal(FLAK2_NARROW_CUTS[4], (2578 + 1206 * 4) / 10000);
    assert.equal(FLAK2_NARROW_CUTS[6], (2578 + 1206 * 4 + 702 * 2) / 10000);
    assert.equal(FLAK2_NARROW_CUTS[10], (2578 + 1206 * 4 + 702 * 2 + 270 * 4) / 10000);
    assert.equal(FLAK2_NARROW_CUTS[FLAK2_NARROW_CUTS.length - 1], 1);
    assert.equal(FLAK2_WIDE_CUTS[0], 5156 / 10000);
    assert.equal(FLAK2_WIDE_CUTS[8], (5156 + 590 * 8) / 10000);
    assert.equal(FLAK2_WIDE_CUTS[FLAK2_WIDE_CUTS.length - 1], 1);
    assert.equal(flak2AimRolls(narrow), true);
    assert.equal(flak2AimRolls(square), true);
    assert.equal(flak2AimRolls({ id: "dot", x: 0, y: 0, w: 1, h: 1 }), false);
  });

  it("stays in a 1x2 on the main-room roll and can leave through a long side or the tile past it", () => {
    assert.deepEqual(flak2Landing([narrow, north], "aim", 0.2577), { kind: "stay" });
    assert.deepEqual(flak2Landing([narrow, north], "aim", 0.2578), { kind: "room", roomId: "north" });
    const past = 0.2578 + 0.1206 * 4 + 0.0702 * 2 + 0.027 * 4;
    assert.deepEqual(flak2Landing([narrow, north], "aim", past), { kind: "miss" });
  });

  it("stays in a 2x2 on the main-room roll and can leave through a side or a corner", () => {
    assert.deepEqual(flak2Landing([square, beside], "box", 0.5155), { kind: "stay" });
    assert.deepEqual(flak2Landing([square, beside], "box", 0.5156), { kind: "room", roomId: "beside" });
    assert.deepEqual(flak2Landing([square], "box", 0.5156 + 0.059 * 8), { kind: "miss" });
  });

  it("uses those odds when Flak II fires, and a 1x1 does not roll", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [
      { ...base, id: "n", x: 1, y: 1, w: 2, h: 1, omit: undefined },
      { ...base, id: "north", title: "North", system: null, x: 1, y: 0, w: 2, h: 1, omit: undefined },
    ];
    g.player.systems.weapons.level = 3;
    g.player.systems.weapons.power = 3;
    g.player.weapons = [{ uid: "f2", defId: "flak2", charge: 1, enabled: true, autofire: false, target: "n" }];
    g.seed = 4;
    const preview = createGame(1);
    preview.seed = 4;
    const rolls = [rand(preview), rand(preview), rand(preview), rand(preview), rand(preview), rand(preview), rand(preview)];
    fireReady(g);
    const reals = g.shots.filter((shot) => shot.kind === "flak");
    assert.equal(reals.length, 7);
    assert.equal(g.shots.filter((shot) => shot.label === FLAK1_FAKE_LABEL).length, FLAK2_FAKE);
    const aim: Flak2Room[] = [
      { id: "n", x: 1, y: 1, w: 2, h: 1 },
      { id: "north", x: 1, y: 0, w: 2, h: 1 },
    ];
    reals.forEach((shot, i) => {
      const land = flak2Landing(aim, "n", rolls[i]);
      assert.equal(shot.damage, 1);
      assert.equal(shot.kind, "flak");
      if (land.kind === "stay") assert.equal(shot.targetRoom, "n");
      else if (land.kind === "room") assert.equal(shot.targetRoom, land.roomId);
      else assert.equal(shot.offRoom, true);
    });

    const quiet = createGame(5);
    startCombat(quiet, "scout");
    assert.ok(quiet.enemy);
    quiet.enemy.weapons = [];
    const dot = quiet.enemy.rooms[0];
    quiet.enemy.rooms = [{ ...dot, id: "dot", x: 0, y: 0, w: 1, h: 1, omit: undefined }];
    quiet.player.systems.weapons.level = 3;
    quiet.player.systems.weapons.power = 3;
    quiet.player.weapons = [{ uid: "f2", defId: "flak2", charge: 1, enabled: true, autofire: false, target: "dot" }];
    const seed = quiet.seed;
    fireReady(quiet);
    assert.equal(quiet.seed, seed);
    const quietReal = quiet.shots.filter((shot) => shot.kind === "flak");
    assert.equal(quietReal.length, 7);
    assert.equal(quiet.shots.filter((shot) => shot.label === FLAK1_FAKE_LABEL).length, FLAK2_FAKE);
    for (const shot of quiet.shots) {
      assert.equal(shot.targetRoom, "dot");
      assert.equal(shot.offRoom, undefined);
    }
  });
});

describe("Adv. Flak room odds", () => {
  it("keeps the printed 1x2 and 2x2 cuts", () => {
    // Flak (Weapons), Adv. Flak Gun. The last 2x2 side tile is 1.31 because the printed percents sum to 99.99.
    assert.equal(ADV_NARROW_CUTS[0], 4874 / 10000);
    assert.equal(ADV_NARROW_CUTS[4], (4874 + 1151 * 4) / 10000);
    assert.equal(ADV_NARROW_CUTS[6], (4874 + 1151 * 4 + 257 * 2) / 10000);
    assert.equal(ADV_NARROW_CUTS[ADV_NARROW_CUTS.length - 1], 1);
    assert.equal(ADV_WIDE_CUTS[0], 8959 / 10000);
    assert.equal(ADV_WIDE_CUTS[ADV_WIDE_CUTS.length - 1], 1);
    assert.equal(advFlakAimRolls(narrow), true);
    assert.equal(advFlakAimRolls({ id: "dot", x: 0, y: 0, w: 1, h: 1 }), false);
  });

  it("stays in a 1x2 on the main-room roll and steps onto a long side", () => {
    assert.deepEqual(advFlakLanding([narrow, north], "aim", 4873 / 10000), { kind: "stay" });
    assert.deepEqual(advFlakLanding([narrow, north], "aim", 4874 / 10000), { kind: "room", roomId: "north" });
  });

  it("stays in a 2x2 on the main-room roll and can leave through a side tile", () => {
    assert.deepEqual(advFlakLanding([square, beside], "box", 8958 / 10000), { kind: "stay" });
    assert.deepEqual(advFlakLanding([square, beside], "box", 8959 / 10000), { kind: "room", roomId: "beside" });
    assert.deepEqual(advFlakLanding([square], "box", 0.999), { kind: "miss" });
  });

  it("uses those odds when Adv. Flak fires", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    const base = g.enemy.rooms[0];
    g.enemy.rooms = [
      { ...base, id: "n", x: 1, y: 1, w: 2, h: 1, omit: undefined },
      { ...base, id: "north", title: "North", system: null, x: 1, y: 0, w: 2, h: 1, omit: undefined },
    ];
    g.player.systems.weapons.level = 1;
    g.player.systems.weapons.power = 1;
    g.player.weapons = [{ uid: "af", defId: "advflak", charge: 1, enabled: true, autofire: false, target: "n" }];
    g.seed = 8;
    const preview = createGame(1);
    preview.seed = 8;
    const rolls = [rand(preview), rand(preview), rand(preview)];
    fireReady(g);
    const reals = g.shots.filter((shot) => shot.kind === "flak");
    assert.equal(reals.length, 3);
    assert.equal(g.shots.filter((shot) => shot.label === FLAK1_FAKE_LABEL).length, ADV_FLAK_FAKE);
    const aim: Flak2Room[] = [
      { id: "n", x: 1, y: 1, w: 2, h: 1 },
      { id: "north", x: 1, y: 0, w: 2, h: 1 },
    ];
    reals.forEach((shot, i) => {
      const land = advFlakLanding(aim, "n", rolls[i]);
      assert.equal(shot.damage, 1);
      assert.equal(shot.kind, "flak");
      if (land.kind === "stay") assert.equal(shot.targetRoom, "n");
      else if (land.kind === "room") assert.equal(shot.targetRoom, land.roomId);
      else assert.equal(shot.offRoom, true);
    });
  });
});

describe("Flak II and Adv. Flak fake pellets", () => {
  it("adds six and three damage-0 decoys that stay on the aimed room and do not drop shields", () => {
    assert.equal(FLAK2_FAKE, 6);
    assert.equal(ADV_FLAK_FAKE, 3);
    const fire = (defId: string, power: number, fake: number, seed: number) => {
      const g = createGame(seed);
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.enemy.weapons = [];
      g.enemy.systems.engines.level = 0;
      g.enemy.systems.engines.power = 0;
      g.enemy.shieldNow = 4;
      g.enemy.zoltan = 2;
      const hull = g.enemy.hull;
      const room = g.enemy.rooms[0]!.id;
      g.player.systems.weapons.level = power;
      g.player.systems.weapons.power = power;
      g.player.weapons = [{ uid: "f", defId, charge: 1, enabled: true, autofire: false, target: room }];
      fireReady(g);
      const fakes = g.shots.filter((shot) => shot.label === FLAK1_FAKE_LABEL);
      const reals = g.shots.filter((shot) => shot.kind === "flak");
      assert.equal(fakes.length, fake);
      assert.equal(g.shots.slice(0, fake).every((shot) => shot.label === FLAK1_FAKE_LABEL), true);
      assert.equal(reals.length, defId === "flak2" ? 7 : 3);
      for (const shot of fakes) {
        assert.equal(shot.kind, "missile");
        assert.equal(shot.damage, 0);
        assert.equal(shot.targetRoom, room);
        assert.equal(shot.offRoom, undefined);
        applyImpact(g, shot);
      }
      assert.equal(g.enemy.shieldNow, 4);
      assert.equal(g.enemy.zoltan, 2);
      assert.equal(g.enemy.hull, hull);
    };
    fire("flak2", 3, 6, 9);
    fire("advflak", 1, 3, 10);
  });

  it("lets a defense drone shoot a Flak II fake pellet", () => {
    const g = createGame(11);
    startCombat(g, "scout");
    assert.ok(g.enemy);
    g.enemy.weapons = [];
    g.enemy.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
      loadout: ["ward"],
    };
    g.enemy.parts = 3;
    tickSwarm(g, 0.05);
    tickSwarm(g, ACQUIRE_S);
    g.player.systems.weapons.level = 3;
    g.player.systems.weapons.power = 3;
    g.player.weapons = [{ uid: "f2", defId: "flak2", charge: 1, enabled: true, autofire: false, target: g.enemy.rooms[0]!.id }];
    fireReady(g);
    const fake = g.shots.find((shot) => shot.label === FLAK1_FAKE_LABEL);
    assert.ok(fake);
    assert.equal(enemyDefenseIntercept(g, fake), true);
    assert.equal(enemyDefenseIntercept(g, fake), false);
  });
});
