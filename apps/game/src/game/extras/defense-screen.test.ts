import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { droneDef, onPackWarning, weaponDef } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { installArchive } from "../archive-play.ts";
import { createGame, fireReady, startCombat, stepShots } from "../sim.ts";
import type { Game } from "../types.ts";
import { defenseAs } from "./flown.ts";
import { ACQUIRE_S, tickSwarm } from "./swarm.ts";

const dat = process.env.FTL_DAT?.trim();

const MISSILE = "MISSILES_1";
const LASER = "LASER_BURST_1";
const CUT = "Their drone cut that shot down.";

/** A fight with the enemy guns off and one deployed, acquired defense schematic. */
function screened(drone: string): Game {
  const g = createGame(7);
  startCombat(g, "Rebel ship");
  const enemy = g.enemy!;
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  enemy.weapons = [];
  enemy.kits.drones = {
    id: "drones",
    level: 8,
    power: 8,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
    loadout: [drone],
  };
  enemy.parts = 4;
  tickSwarm(g, 0.05);
  tickSwarm(g, ACQUIRE_S + 0.05);
  const unit = enemy.kits.drones.drones?.[0];
  assert.ok(unit?.alive && unit.powered, `${drone} deployed`);
  assert.equal(unit.cool, 0, `${drone} acquired`);
  return g;
}

/**
 * The player fires one charged gun at the enemy. `cut` is true when their drone shot it down before it landed;
 * `cool` is that drone's cooldown right after.
 */
function fire(drone: string, gun: string): { cut: boolean; cool: number } {
  assert.ok(weaponDef(gun), gun);
  const g = screened(drone);
  g.player.systems.weapons.level = 8;
  g.player.systems.weapons.power = 8;
  g.missiles = 10;
  g.player.weapons = [
    {
      uid: "w",
      defId: gun,
      charge: 1,
      enabled: true,
      autofire: false,
      target: g.enemy!.rooms[0]!.id,
    },
  ];
  fireReady(g);
  assert.ok(
    g.shots.some((shot) => shot.from === "player"),
    `${gun} fired`,
  );
  const cuts = () => g.log.filter((line) => line.includes(CUT)).length;
  const before = cuts();
  let cool = 0;
  for (let i = 0; i < 400 && g.shots.some((shot) => shot.from === "player"); i++) {
    stepShots(g, 0.05);
    cool = Math.max(cool, g.enemy!.kits.drones!.drones![0]!.cool);
  }
  return { cut: cuts() > before, cool };
}

/** What each schematic shoots down: [missile, laser]. */
function screen(drones: string[]): Record<string, [boolean, boolean]> {
  return Object.fromEntries(drones.map((id) => [id, [fire(id, MISSILE).cut, fire(id, LASER).cut]]));
}

describe("defense drones screen by droneBlueprint type and target (stand-in)", () => {
  it("Mark I cuts the missile only, Mark II both, Anti-Combat neither", () => {
    assert.equal(droneDef("DEFENSE_2")?.target, "LASERS");
    assert.equal(droneDef("ANTI_DRONE")?.target, "DRONES");
    assert.deepEqual(screen(["DEFENSE_1", "DEFENSE_2", "ANTI_DRONE"]), {
      DEFENSE_1: [true, false],
      DEFENSE_2: [true, true],
      ANTI_DRONE: [false, false],
    });
  });
});

describe(
  "ftl.dat's defense drone variants",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 120_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("DEFENSE_2_ENEMY screens like Mark II and BOSS_DEFENSE_2 like Mark I, each on its own cooldown", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      const warnings: string[] = [];
      const restore = onPackWarning((message) => warnings.push(message));
      try {
        assert.equal(defenseAs("DEFENSE_2_ENEMY"), "DEFENSE_2");
        // ftl.dat titles it "Defense Drone Mark II" but writes no <target> and gives it the Mark I gun.
        assert.equal(defenseAs("BOSS_DEFENSE_2"), "DEFENSE_1");
        assert.deepEqual(
          screen(["DEFENSE_1", "DEFENSE_2", "DEFENSE_2_ENEMY", "BOSS_DEFENSE_2", "ANTI_DRONE"]),
          {
            DEFENSE_1: [true, false],
            DEFENSE_2: [true, true],
            DEFENSE_2_ENEMY: [true, true],
            BOSS_DEFENSE_2: [true, false],
            ANTI_DRONE: [false, false],
          },
        );
        // The cooldown after a cut is the schematic's own <cooldown>: 880 ms and 750 ms.
        assert.equal(fire("DEFENSE_2_ENEMY", MISSILE).cool, 0.88);
        assert.equal(fire("BOSS_DEFENSE_2", MISSILE).cool, 0.75);
        assert.deepEqual(
          warnings.filter((message) => /DEFENSE/.test(message)),
          [],
        );
      } finally {
        restore();
      }
    });
  },
);
