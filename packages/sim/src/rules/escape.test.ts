import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, startCombat, step, waitHere } from "../sim.ts";
import type { Game } from "../types.ts";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { escapePlan, eventSlugOf, hullRunSeconds, lastFuelSeconds } from "./escape.ts";

const half = () => 0.5;

function run(g: Game, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 30) && g.phase === "combat"; i++) step(g, 1 / 30);
}

describe("escape rules (Enemy Ships, Surrenders and escape attempts)", () => {
  it("runs a warning ship from the start, and a transport without pursuit", () => {
    const warning = createGame(4);
    warning.player.weapons = [];
    startCombat(warning, "SQUAT_WARNING");
    assert.equal(warning.enemyEscape?.seconds, 40);
    assert.equal(warning.enemyEscape?.pursuit, true);
    assert.equal(
      warning.enemyEscape?.running,
      warning.enemy!.hull <= warning.enemyEscape!.threshold,
    );
    const transport = createGame(4);
    startCombat(transport, "SQUAT_TRANSPORT");
    assert.equal(transport.enemyEscape?.seconds, 40);
    assert.equal(transport.enemyEscape?.pursuit, false);
    assert.equal(
      transport.enemyEscape?.running,
      transport.enemy!.hull <= transport.enemyEscape!.threshold,
    );
  });

  it("uses 80 s for an out-of-fuel ship and 40 s for the auto warning", () => {
    const fuel = createGame(4);
    startCombat(fuel, "REBEL_FUEL");
    assert.equal(fuel.enemyEscape?.seconds, 80);
    assert.equal(fuel.enemyEscape?.hullPoints, true);
    const warn = createGame(4);
    startCombat(warn, "REBEL_AUTO_WARNING");
    assert.equal(warn.enemyEscape?.seconds, 40);
    assert.equal(warn.enemyEscape?.pursuit, true);
  });

  it("does not run a ship whose escape chance is 0", () => {
    const g = createGame(4);
    startCombat(g, "REBEL_NO_ESCAPE");
    g.enemySurrender!.chance = 0;
    g.enemy!.hull = 1;
    run(g, 20);
    assert.equal(g.enemyEscape?.running, false);
    assert.equal(g.phase, "combat");
  });

  it("never runs for the flagship or a Rebel Elite", () => {
    assert.equal(escapePlan({ tier: "boss" }, half).mode, "never");
    assert.equal(escapePlan({ tier: "elite", lastFuel: true }, half).mode, "never");
  });

  it("runs at 90 s after the last fuel is spent", () => {
    const p = escapePlan({ tier: "fighter", lastFuel: true }, half);
    assert.deepEqual([p.mode, p.seconds], ["start", lastFuelSeconds()]);
  });

  it("otherwise rolls the Rebel row: 50% at 30–40% hull, 15 s", () => {
    const p = escapePlan({ tier: "fighter" }, half);
    assert.deepEqual(
      [p.mode, p.chance, p.threshold, p.seconds, p.running],
      ["hull", 50, 35, hullRunSeconds(), false],
    );
  });

  it("uses each faction's row, and pirates use the Pirate row", () => {
    const row = (faction: string, pirate = false) => {
      const p = escapePlan({ tier: "pool", faction, pirate }, () => 0);
      return [p.mode, p.chance, Math.round(p.threshold)];
    };
    assert.deepEqual(row("rebel"), ["hull", 50, 30]);
    assert.deepEqual(row("slug"), ["hull", 50, 30]);
    assert.deepEqual(row("lanius"), ["hull", 80, 20]);
    assert.deepEqual(row("engi", true), ["hull", 50, 20]);
    for (const f of ["auto", "engi", "mantis", "zoltan", "crystal", "rock"])
      assert.equal(row(f)[0], "never", f);
  });

  it("uses the briber ship's hull points, not the pirate percent row", () => {
    const g = createGame(4);
    startCombat(g, "PIRATE_BRIBER");
    assert.equal(g.enemyEscape?.chance, 0.4);
    assert.equal(g.enemyEscape?.hullPoints, true);
    assert.ok(g.enemyEscape!.threshold >= 3 && g.enemyEscape!.threshold <= 4);
    assert.equal(g.enemyEscape?.running, g.enemy!.hull <= g.enemyEscape!.threshold);
  });

  it("reads the event slug from a cited choice id", () => {
    assert.equal(eventSlugOf("c:auto-ship-warning:0"), "auto-ship-warning");
    assert.equal(eventSlugOf("exit-leave"), undefined);
  });
});

describe("escape in a fight", () => {
  it("does not start at full hull", () => {
    const g = createGame(4);
    startCombat(g, "Rebel ship");
    run(g, 30);
    assert.equal(g.enemyEscape?.running, false);
    assert.equal(g.enemyFlee, 0);
  });

  it("flees on a hull-triggered run after 15 s of charging", () => {
    const g = createGame(4);
    startCombat(g, "Rebel ship");
    g.enemyEscape!.chance = 100;
    // wiki/surrender.ts rolls first at low hull; keep this fight to the escape rule.
    g.enemySurrender!.chance = 0;
    g.enemy!.hull = 2;
    run(g, 1);
    assert.equal(g.enemyEscape?.running, true);
    run(g, hullRunSeconds() + 1);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "map");
  });

  it("stalls while their engines are down", () => {
    const g = createGame(4);
    startCombat(g, "SQUAT_TRANSPORT");
    // extras/crewai.ts sends enemy crew to repair Engines, so keep them broken every second.
    // Every tick: a one-second gap lets a crew member mend a bar on some hulls (the archive picks the ship).
    for (let i = 0; i < 60 * 30; i++) {
      g.enemy!.systems.engines.damage = g.enemy!.systems.engines.level;
      g.enemy!.systems.engines.fix = 0;
      run(g, 1 / 30);
    }
    assert.equal(g.enemyFlee, 0);
    assert.equal(g.phase, "combat");
  });

  it("doubles the next fleet advance when a pursuit runner escapes", () => {
    const g = createGame(4);
    g.player.weapons = [];
    startCombat(g, "SQUAT_WARNING");
    run(g, 45);
    assert.match(g.event?.body ?? "", /The scout escapes/);
    assert.ok(g.log.some((line) => line.includes("Rebel Fleet pursuit is doubled")));
    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.equal(g.pursuitDouble, true);
    const before = g.fleet;
    waitHere(g);
    const doubled = g.fleet - before;
    const again = g.fleet;
    waitHere(g);
    assert.equal(doubled, (g.fleet - again) * 2);
  });
});

describe("escape numbers from the gap mod", () => {
  it("reads FTL's numbers from the loaded gap", () => {
    assert.equal(hullRunSeconds(), 15);
    assert.equal(lastFuelSeconds(), 90);
  });

  it("follows a gap file that overrides one number", () => {
    // A mod's gap.xml: the hull-triggered timer is 25 s, and Mantis ships run at 100% below 50% hull.
    loadPack(
      packFromFtl([
        {
          path: "data/gap.xml",
          xml: `<FTL>
  <escapeTimers hull="25"/>
  <shipBlueprint name="mantis"><escape chance="100" min="50" max="50"/></shipBlueprint>
</FTL>`,
        },
      ]),
      "append",
    );
    try {
      const rebel = escapePlan({ tier: "fighter" }, half);
      assert.deepEqual(
        [rebel.mode, rebel.chance, rebel.threshold, rebel.seconds],
        ["hull", 50, 35, 25],
      );
      assert.equal(lastFuelSeconds(), 90);
      const mantis = escapePlan({ tier: "pool", faction: "mantis" }, half);
      assert.deepEqual([mantis.mode, mantis.chance, mantis.threshold], ["hull", 100, 50]);

      // In a fight: a hull-triggered run now takes 25 s, not 15.
      const g = createGame(4);
      startCombat(g, "Rebel ship");
      g.enemyEscape!.chance = 100;
      g.enemySurrender!.chance = 0;
      g.enemy!.hull = 2;
      run(g, 1);
      assert.equal(g.enemyEscape?.running, true);
      assert.equal(g.enemyEscape?.seconds, 25);
      run(g, 16);
      assert.equal(g.phase, "combat");
      run(g, 10);
      assert.equal(g.enemy, null);
    } finally {
      resetPackForTests();
    }
    assert.equal(hullRunSeconds(), 15);
    assert.equal(escapePlan({ tier: "pool", faction: "mantis" }, half).mode, "never");
  });
});

describe("escape ship events the review called out", () => {
  it("keeps a Last Stand class hull and still never runs", () => {
    const scout = createGame(3);
    startCombat(scout, "Auto-Scout", false, "fight-in-last-stand");
    assert.equal(scout.enemy?.classId, "AUTO_BASIC");
    assert.equal(scout.enemyEscape?.mode, "never");
    const fighter = createGame(3);
    startCombat(fighter, "rebel-fighter", false, "fight-in-last-stand");
    assert.equal(fighter.enemy?.classId, "REBEL_SKINNY");
    assert.equal(fighter.enemyEscape?.mode, "never");
  });

  it("does not start a sector-8 transport whose hull is already above the dat band of 14", () => {
    const g = createGame(4);
    g.sector = 8;
    startCombat(g, "SQUAT_TRANSPORT");
    assert.equal(g.enemyEscape?.threshold, 14);
    assert.ok((g.enemy?.hull ?? 0) > 14);
    assert.equal(g.enemyEscape?.running, false);
  });

  it("does not roll an escape miss again on the next tick", () => {
    let found = false;
    for (let seed = 1; seed <= 80 && !found; seed++) {
      const g = createGame(seed);
      g.difficulty = "easy";
      startCombat(g, "BOSS_SCOUT_RESCUE");
      const plan = g.enemyEscape;
      if (!plan?.hullPoints || plan.running || (g.enemy?.hull ?? 0) > plan.threshold) continue;
      found = true;
      assert.equal(plan.rolled, true);
      g.enemySurrender!.chance = 0;
      run(g, 2);
      assert.equal(g.enemyEscape?.running, false);
      assert.equal(g.phase, "combat");
    }
    assert.equal(found, true);
  });

  it("runs the fuel-page ships from the start, on their own timers", () => {
    const dock = createGame(2);
    dock.fuel = 0;
    startCombat(dock, "PIRATE_DOCK_80");
    assert.equal(dock.enemyEscape?.running, true);
    assert.equal(dock.enemyEscape?.seconds, 80);
    const refugee = createGame(2);
    refugee.fuel = 6;
    startCombat(refugee, "PIRATE_REFUGEE");
    assert.equal(refugee.enemyEscape?.running, true);
    assert.equal(refugee.enemyEscape?.seconds, 90);
  });
});
