import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blueprintList,
  hullDef,
  loadPack,
  shipAllegiance,
  onPackWarning,
  resetPackForTests,
  shipClassBlueprint,
  weaponDef,
} from "@stl/pack";
import type { HullDef } from "@stl/pack";
import "./pack/base.ts";
import {
  archiveFight,
  arm,
  blueprintCrew,
  blueprintHull,
  fightHull,
  hullDisplayName,
  specFromHull,
  optionalChance,
  rollMaxLevel,
  UPGRADE_BUDGET,
} from "./enemy-gen.ts";
import { listWasPlayed, resetPlayedLists } from "./played-lists.ts";
import { createGame, startCombat } from "./sim.ts";

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

describe("enemy generation by difficulty (Mathchamp, Details on enemy ship generation)", () => {
  const ctx = (sector: number, difficulty: "easy" | "normal" | "hard" = "normal") => ({
    sector,
    sectorId: "CIVILIAN_SECTOR",
    sectorName: "Civilian Sector",
    difficulty,
  });
  const ship = (id: string) => hullDef(id)!;
  /** Share of generated ships with a Crew Teleporter (the sling kit). */
  const teleporters = (
    id: string,
    sector: number,
    difficulty: "easy" | "normal" | "hard" = "hard",
  ) => {
    const rand = seeded(sector * 97);
    let n = 0;
    for (let i = 0; i < 4000; i++)
      if (specFromHull(ship(id), ctx(sector, difficulty), rand).kits.teleporter) n++;
    return n / 4000;
  };

  it("fits an optional system 20% of the time on Normal in sector 1, +10% each sector, Hard +10%, Easy delayed and -10%", () => {
    const pct = (d: "easy" | "normal" | "hard") =>
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => Math.round(optionalChance(s, d) * 100));
    assert.deepEqual(pct("normal"), [20, 30, 40, 50, 60, 70, 80, 90]);
    assert.deepEqual(pct("hard"), [30, 40, 50, 60, 70, 80, 90, 100]);
    assert.deepEqual(pct("easy"), [10, 10, 20, 30, 40, 50, 60, 70]);
    // REBEL_SKINNY's Teleporter is start="false".
    assert.ok(Math.abs(teleporters("REBEL_SKINNY", 1, "normal") - 0.2) < 0.03);
    assert.ok(Math.abs(teleporters("REBEL_SKINNY", 4, "hard") - 0.6) < 0.03);
  });

  it("rolls the per-sector maximum from the printed range, and Easy sector 1 ships stay at their starting levels", () => {
    // ftl-layouts.mikehopley.org, Rebel Fighter Shields 2-8 on Hard: sectors 1-2 "2-3", 3 "3-5", 4 "4-6", 8 "7-8".
    const want: Record<number, [number, number]> = { 1: [2, 3], 3: [3, 5], 4: [4, 6], 8: [7, 8] };
    const rand = seeded(5);
    for (const [sector, [lo, hi]] of Object.entries(want)) {
      const seen = new Set<number>();
      for (let i = 0; i < 400; i++)
        seen.add(rollMaxLevel([2, 8], ctx(Number(sector), "hard"), rand));
      assert.deepEqual([Math.min(...seen), Math.max(...seen)], [lo, hi], `sector ${sector}`);
    }
    const easy = seeded(9);
    for (let i = 0; i < 200; i++) {
      const spec = specFromHull(ship("REBEL_SKINNY"), ctx(1, "easy"), easy);
      assert.equal(spec.systems.shields?.[0], 2);
      assert.equal(spec.systems.weapons?.[0], 2);
    }
  });

  it("spends no more than the sector's offensive, defensive, and general budget", () => {
    for (const d of ["easy", "normal", "hard"] as const) {
      for (let sector = 1; sector <= 8; sector++) {
        const [o, def, gen] = UPGRADE_BUDGET[d][sector - 1];
        const rand = seeded(sector + 31);
        for (let i = 0; i < 50; i++) {
          const hull = ship("REBEL_SKINNY");
          const spec = specFromHull(hull, ctx(sector, d), rand);
          let upgrades = 0;
          for (const install of hull.installs ?? []) {
            if (!install.start) continue;
            const lvl = (spec.systems as Record<string, [number, number]>)[install.id]?.[0];
            if (lvl != null) upgrades += lvl - install.power;
          }
          assert.ok(upgrades <= o + def + gen, `${d} sector ${sector}: ${upgrades}`);
        }
      }
    }
  });

  it("crew and hull follow the per-sector tables", () => {
    // Mantis Scout crew 3-4: 3 in sectors 1-4, 4 in sectors 5-6. Rebel Fighter crew 3-5: 3, 3, 3, 4, 4, 4, 5, 5.
    const crew = (id: string, sector: number) => {
      const row = ship(id).crewCounts![0]!;
      return blueprintCrew(row.amount, row.max, ctx(sector));
    };
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6].map((s) => crew("MANTIS_SCOUT", s)),
      [3, 3, 3, 3, 4, 4],
    );
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => crew("REBEL_SKINNY", s)),
      [3, 3, 3, 4, 4, 4, 5, 5],
    );
    // Mantis Fighter hull 10-16 from sector 2. Rebel Fighter 10-17, "(9-16 on Easy)".
    assert.deepEqual(
      [2, 5, 8].map((s) => blueprintHull(ship("MANTIS_FIGHTER"), ctx(s))),
      [10, 13, 16],
    );
    assert.deepEqual(
      [1, 8].map((s) => blueprintHull(ship("REBEL_SKINNY"), ctx(s, "easy"))),
      [9, 16],
    );
  });

  it("arms by Mathchamp's weapon rules", () => {
    const rand = seeded(3);
    for (let i = 0; i < 300; i++) {
      for (const level of [1, 2, 3, 4, 6, 8]) {
        const { weapons } = arm([...(blueprintList("WEAPONS_REBEL") ?? [])], level, rand);
        const power = weapons.map((id) => weaponDef(id)!.power);
        assert.ok(power.reduce((a, b) => a + b, 0) <= level);
        assert.ok(
          power.every((p) => p < level || p === 1),
          `level ${level}: ${weapons}`,
        );
        if (level >= 3) assert.ok(power[0] >= 2, `level ${level} first gun ${weapons[0]}`);
        // A ship never opens on a gun that clears neither flag (non-damaging beam or bomb).
        const first = weaponDef(weapons[0])!;
        assert.ok(
          first.kind === "laser" ||
            first.kind === "ion" ||
            (first.damage > 0 && first.kind !== "bomb"),
          weapons[0],
        );
      }
    }
  });
});

describe("archive loadout", () => {
  const ctx = {
    sector: 1,
    sectorId: "CIVILIAN_SECTOR",
    sectorName: "Civilian Sector",
    difficulty: "normal" as const,
  };

  /** The stand-in's REBEL_SKINNY with its gun list and crew count taken off. */
  function bareRebel(): HullDef {
    const hull = hullDef(shipClassBlueprint("rebel-fighter"))!;
    const { weaponLoad: _load, crewCounts: _crew, ...rest } = hull;
    return { ...rest, weapons: [] };
  }

  it("warns about a blueprint the game cannot fully read, and falls back", () => {
    const hull = bareRebel();
    loadPack({ hulls: [hull] }, "append");
    let plain: ReturnType<typeof specFromHull>;
    try {
      plain = specFromHull(hullDef(hull.id)!, ctx, seeded(4));
    } finally {
      resetPackForTests();
    }
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    const roll = (patch: Partial<typeof hull>) => {
      loadPack({ hulls: [{ ...hull, ...patch }] }, "append");
      try {
        return specFromHull(hullDef(hull.id)!, ctx, seeded(4));
      } finally {
        resetPackForTests();
      }
    };
    try {
      // A missing list leaves the class table's guns.
      assert.deepEqual(roll({ weaponLoad: "NO_SUCH_LIST" }).weapons, plain.weapons);
      // Tags beside a load that names nothing: the tags, and a warning about the list.
      assert.deepEqual(roll({ weapons: ["LASER_BURST_1"], weaponLoad: "NO_SUCH_LIST" }).weapons, [
        "LASER_BURST_1",
      ]);
      // FTL never picks an unknown name (its stand-in blueprint has 0 power), so it is skipped.
      assert.deepEqual(roll({ weapons: ["NOT_A_GUN", "LASER_BURST_1"] }).weapons, [
        "LASER_BURST_1",
      ]);
      // Ghost is a race. One counted seat replaces the class table.
      const ghosts = roll({ crewCounts: [{ amount: 1, class: "ghost" }] }).crew;
      assert.deepEqual(
        ghosts.map((member) => member.race),
        ["Ghost"],
      );
      assert.deepEqual(
        ghosts.map((member) => member.kin),
        ["ghost"],
      );
      assert.deepEqual(warnings, [
        `${hull.id}: load="NO_SUCH_LIST" names no blueprintList; it is treated as empty.`,
        `${hull.id}: its weaponList names "NOT_A_GUN", which is not a weapon; it is skipped.`,
      ]);
    } finally {
      restore();
    }
  });

  it("counts blueprint crew and mounts blueprint guns the way FTL's generator does", () => {
    const normal = (sector: number) => ({
      sector,
      sectorId: "CIVILIAN_SECTOR",
      sectorName: "Civilian Sector",
      difficulty: "normal" as const,
    });
    // CreateShip: min + (max − min) × min(1, level × 0.125), truncated; a minimum of 0 is not interpolated.
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((sector) => blueprintCrew(2, 6, normal(sector))),
      [2, 2, 3, 3, 4, 4, 5, 5],
    );
    assert.equal(blueprintCrew(0, 4, normal(8)), 0);
    assert.equal(blueprintCrew(3, undefined, normal(8)), 3);
    // Easy is one level lower, and never below 0.
    assert.equal(blueprintCrew(1, 3, { ...normal(1), difficulty: "easy" }), 1);
    assert.equal(blueprintCrew(1, 3, { ...normal(5), difficulty: "easy" }), 1);
    assert.equal(blueprintCrew(1, 3, { ...normal(6), difficulty: "easy" }), 2);

    // CreateArmory mounts the tags in order up to count, then CreateShip draws from the load list for what is left.
    const hull = hullDef(shipClassBlueprint("rebel-rigger"))!;
    loadPack(
      {
        hulls: [
          {
            ...hull,
            weapons: ["LASER_BURST_1"],
            weaponCount: 1,
            weaponLoad: "MIXED",
            weaponSlots: 2,
          },
        ],
        blueprints: [{ id: "MIXED", names: ["LASER_BURST_3"] }],
      },
      "append",
    );
    try {
      const spec = specFromHull(hullDef(shipClassBlueprint("rebel-rigger"))!, ctx, seeded(3));
      assert.equal(spec.weapons[0], "LASER_BURST_1");
      assert.ok(spec.weapons.length <= 2);
      assert.ok(spec.weapons.slice(1).every((id) => id === "LASER_BURST_3"));
    } finally {
      resetPackForTests();
    }
  });

  it("mounts a repeated blueprint id on two slots", () => {
    assert.deepEqual(arm(["LASER_BURST_1", "LASER_BURST_1"], 2, seeded(1), 2).weapons, [
      "LASER_BURST_1",
      "LASER_BURST_1",
    ]);
  });

  it("equips the blueprint crew, weapon list, and drone list", () => {
    const fighterHull = hullDef(shipClassBlueprint("rebel-fighter"))!;
    const riggerHull = hullDef(shipClassBlueprint("rebel-rigger"))!;
    loadPack(
      {
        hulls: [
          {
            ...fighterHull,
            weapons: ["LASER_BURST_3", "LASER_BURST_1", "LASER_BURST_1"],
            weaponCount: 2,
            missiles: 4,
            crewCounts: [
              { amount: 2, class: "human" },
              { amount: 1, max: 3, class: "mantis" },
              { amount: 1, class: "random" },
            ],
          },
          {
            ...riggerHull,
            weapons: [],
            weaponLoad: "WEAPONS_TEST",
            weaponSlots: 1,
            drones: [],
            droneLoad: "DRONES_TEST",
            droneCount: 1,
            parts: 5,
          },
        ],
        blueprints: [
          { id: "WEAPONS_TEST", names: ["LASER_BURST_3"] },
          { id: "DRONES_TEST", names: ["DEFENSE_1"] },
        ],
      },
      "append",
    );
    try {
      const crystal = { ...ctx, sectorId: "CRYSTAL_HOME", sectorName: "Hidden Crystal Worlds" };
      const spec = specFromHull(hullDef(shipClassBlueprint("rebel-fighter"))!, crystal, seeded(1));
      // ftl.dat's explicit weaponList is that ship's loadout: mounted in order, up to count.
      assert.deepEqual(spec.weapons, ["LASER_BURST_3", "LASER_BURST_1"]);
      assert.equal(spec.missiles, 4);
      assert.equal(spec.crew.filter((member) => member.race === "Human").length, 2);
      assert.equal(spec.crew.filter((member) => member.race === "Mantis").length, 1);
      assert.equal(spec.crew.filter((member) => member.race === "Crystal").length, 1);

      // FTL's CreateShip: 1 + 2 × min(1, level / 8), truncated, with sector 1 as level 0. 1 through sector 4, then 2.
      // The 3 would only arrive in a ninth sector.
      const crewIn = (sector: number) =>
        specFromHull(
          hullDef(shipClassBlueprint("rebel-fighter"))!,
          { ...crystal, sector },
          seeded(1),
        ).crew.filter((member) => member.race === "Mantis").length;
      assert.deepEqual([1, 4, 5, 8].map(crewIn), [1, 1, 2, 2]);
      const delayed = specFromHull(
        hullDef(shipClassBlueprint("rebel-fighter"))!,
        { ...crystal, sector: 2, difficulty: "easy" },
        seeded(1),
      );
      assert.equal(delayed.crew.filter((member) => member.race === "Mantis").length, 1);

      const armed = specFromHull(hullDef(shipClassBlueprint("rebel-rigger"))!, ctx, seeded(2));
      assert.deepEqual(armed.weapons, ["LASER_BURST_3"]);
      assert.deepEqual(armed.drones, ["DEFENSE_1"]);
      assert.equal(armed.parts, 5);
    } finally {
      resetPackForTests();
    }
  });

  it("fields a circle ship's drone list where it overlaps DRONES_CIRCLE", () => {
    const base = hullDef(shipClassBlueprint("rebel-fighter"));
    assert.ok(base);
    loadPack(
      {
        hulls: [
          {
            ...base,
            id: "CIRCLE_TEST",
            layout: "circle_test",
            drones: [],
            droneLoad: "DRONES_NARROW",
            droneCount: 4,
            parts: 8,
            installs: [{ id: "drones", power: 8, start: true, room: 0 }],
          },
        ],
        blueprints: [
          { id: "DRONES_NARROW", names: ["DEFENSE_1", "COMBAT_1"] },
          { id: "DRONES_CIRCLE", names: ["DEFENSE_1"] },
          { id: "OVERRIDE_DRONES_CIRCLE", names: ["DEFENSE_1", "BATTLE"] },
        ],
      },
      "append",
    );
    try {
      resetPlayedLists();
      const hull = hullDef("CIRCLE_TEST");
      assert.ok(hull);
      const spec = specFromHull(hull, ctx, seeded(1));
      assert.equal(listWasPlayed("DRONES_CIRCLE"), true);
      assert.equal(listWasPlayed("OVERRIDE_DRONES_CIRCLE"), true);
      assert.ok(spec.drones.length > 0);
      assert.ok(spec.drones.every((id) => id === "DEFENSE_1"));
    } finally {
      resetPackForTests();
    }
  });
});

describe("blueprint sector range", () => {
  function gated(id: string, gate: { minSector?: number; maxSector?: number } = {}) {
    const base = hullDef(shipClassBlueprint("rebel-fighter"));
    assert.ok(base);
    return { ...base, id, name: id, cruiser: "", ...gate };
  }

  it("skips a hull outside the world level and builds one inside it", () => {
    loadPack(
      {
        blueprints: [{ id: "SHIPS_LATE", names: ["LATE_HULL"] }],
        hulls: [gated("LATE_HULL", { minSector: 4 }), gated("OPEN_HULL")],
      },
      "append",
    );
    try {
      // A list with no ship for this level still fights one of its own ships, with a warning.
      const warnings: string[] = [];
      const restore = onPackWarning((message) => warnings.push(message));
      try {
        assert.equal(fightHull("pirate", "SHIPS_LATE", () => 0, 0)?.id, "LATE_HULL");
      } finally {
        restore();
      }
      assert.match(warnings.join("\n"), /SHIPS_LATE has no ship for sector level 0/);
      assert.equal(fightHull("pirate", "SHIPS_LATE", () => 0, 4)?.id, "LATE_HULL");
      // The draw skips a ship the level does not allow instead of rejecting the fight.
      loadPack(
        { blueprints: [{ id: "SHIPS_MIXED", names: ["LATE_HULL", "OPEN_HULL"] }] },
        "append",
      );
      for (const roll of [0, 0.4, 0.6, 0.99]) {
        assert.equal(fightHull("pirate", "SHIPS_MIXED", () => roll, 0)?.id, "OPEN_HULL");
      }
      loadPack({ blueprints: [{ id: "SHIPS_OPEN", names: ["OPEN_HULL"] }] }, "append");
      assert.equal(fightHull("pirate", "SHIPS_OPEN", () => 0, 0)?.id, "OPEN_HULL");
      assert.equal(fightHull("LATE_HULL", undefined, () => 0, 0)?.id, "LATE_HULL");
    } finally {
      resetPackForTests();
    }
  });

  it("builds a named ship, then DEFAULT, and still warns when neither exists", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      assert.equal(
        fightHull("pirate", "NO_SUCH_SHIP", () => 0, 0),
        undefined,
      );
      assert.deepEqual(warnings, [
        'auto_blueprint="NO_SUCH_SHIP" names no blueprintList; the fight rolls a class.',
      ]);
      loadPack(
        {
          hulls: [gated("SCOUT", { minSector: 4 }), gated("DEFAULT")],
        },
        "append",
      );
      warnings.length = 0;
      // A direct ship id ignores minSector. A list draw of this hull would not.
      assert.equal(fightHull("pirate", "SCOUT", () => 0, 0)?.id, "SCOUT");
      assert.equal(fightHull("pirate", "NO_SUCH_SHIP", () => 0, 0)?.id, "DEFAULT");
      assert.equal(fightHull("pirate", "DEFAULT", () => 0, 0)?.id, "DEFAULT");
      assert.deepEqual(warnings, []);
    } finally {
      restore();
      resetPackForTests();
    }
  });

  it("startCombat consults that world level", () => {
    loadPack(
      {
        blueprints: [{ id: "SHIPS_LATE", names: ["LATE_HULL", "OPEN_HULL"] }],
        hulls: [gated("LATE_HULL", { minSector: 4 }), gated("OPEN_HULL")],
        shipEvents: [{ id: "LATE", autoBlueprint: "SHIPS_LATE" }],
      },
      "append",
    );
    try {
      for (let seed = 1; seed <= 6; seed++) {
        const early = createGame(seed);
        early.sector = 1;
        early.difficulty = "normal";
        startCombat(early, "LATE");
        assert.equal(early.enemy?.name, "OPEN_HULL");
      }
      const late = new Set<string | undefined>();
      for (let seed = 1; seed <= 12; seed++) {
        const g = createGame(seed);
        g.sector = 5;
        g.difficulty = "normal";
        startCombat(g, "LATE");
        late.add(g.enemy?.name);
      }
      assert.deepEqual([...late].sort(), ["LATE_HULL", "OPEN_HULL"]);
    } finally {
      resetPackForTests();
    }
  });
});

describe("Federation requests", () => {
  it("field a Federation ship, regular or pirate, wherever the event is", () => {
    const ctx = {
      sector: 3,
      sectorId: "CIVILIAN_SECTOR",
      sectorName: "Civilian Sector",
      difficulty: "normal" as const,
    };
    for (let i = 1; i <= 10; i++) {
      const fight = archiveFight("Federation ship", ctx, seeded(i * 97));
      assert.ok(fight);
      assert.equal(shipAllegiance(fight.hull.id, fight.list).faction, "federation");
    }
  });
});

describe("enemy hull names", () => {
  it("shows a blueprint's class text when it has no name of its own, as ftl.dat's enemy ships do", () => {
    // packFromFtl sets name to the id when <name> is missing.
    assert.equal(
      hullDisplayName({ id: "REBEL_SKINNY", name: "REBEL_SKINNY", cruiser: "Rebel Fighter" }),
      "Rebel Fighter",
    );
    assert.equal(
      hullDisplayName({ id: "ROCK_FIGHT_P", name: "ROCK_FIGHT_P", cruiser: "Pirate Fighter" }),
      "Pirate Fighter",
    );
    assert.equal(
      hullDisplayName({ id: "X", name: "The Kestrel", cruiser: "Kestrel Cruiser" }),
      "The Kestrel",
    );
    assert.equal(hullDisplayName({ id: "X", name: "X", cruiser: "" }), "X");
  });
});
