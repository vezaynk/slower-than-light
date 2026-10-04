import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step, waitHere } from "../sim.ts";
import type { Game } from "../types.ts";
import { HULL_RUN_SECONDS, LAST_FUEL_SECONDS, OUT_OF_FUEL_WAIT_SECONDS, escapePlan, eventSlugOf } from "./escape.ts";

const half = () => 0.5;

function run(g: Game, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 30) && g.phase === "combat"; i++) step(g, 1 / 30);
}

describe("escape rules (Enemy Ships, Surrenders and escape attempts)", () => {
  it("runs from the start with the event's timer", () => {
    assert.deepEqual(
      ["auto-ship-warning", "rebel-ship-warning", "rebel-transport-ship", "rock-war-vessel-encounter", "slug-home-nebula-surrender"].map(
        (event) => {
          const p = escapePlan({ tier: "scout", event }, half);
          return [p.mode, p.seconds, p.pursuit, p.running];
        },
      ),
      [
        ["start", 40, true, true],
        ["start", 40, true, true],
        ["start", 40, false, true],
        ["start", 32, false, true],
        ["start", 35, false, true],
      ],
    );
  });

  it("uses 80 s for out-of-fuel events, except the 40 s auto-ship", () => {
    assert.equal(escapePlan({ tier: "scout", event: "no-fuel-engi-ship-repair" }, half).seconds, OUT_OF_FUEL_WAIT_SECONDS);
    assert.equal(escapePlan({ tier: "scout", event: "no-fuel-auto-ship-warning" }, half).seconds, 40);
  });

  it("never runs for the flagship or a Rebel Elite", () => {
    assert.equal(escapePlan({ tier: "boss" }, half).mode, "never");
    assert.equal(escapePlan({ tier: "elite", lastFuel: true }, half).mode, "never");
  });

  it("runs at 90 s after the last fuel is spent", () => {
    const p = escapePlan({ tier: "fighter", lastFuel: true }, half);
    assert.deepEqual([p.mode, p.seconds], ["start", LAST_FUEL_SECONDS]);
  });

  it("otherwise rolls the Rebel row: 50% at 30–40% hull, 15 s", () => {
    const p = escapePlan({ tier: "fighter" }, half);
    assert.deepEqual([p.mode, p.chance, p.threshold, p.seconds, p.running], ["hull", 50, 35, HULL_RUN_SECONDS, false]);
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
    for (const f of ["auto", "engi", "mantis", "zoltan", "crystal", "rock"]) assert.equal(row(f)[0], "never", f);
  });

  it("reads the event slug from a cited choice id", () => {
    assert.equal(eventSlugOf("c:auto-ship-warning:0"), "auto-ship-warning");
    assert.equal(eventSlugOf("engi-cache-trap"), undefined);
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
    run(g, HULL_RUN_SECONDS + 1);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "map");
  });

  it("stalls while their engines are down", () => {
    const g = createGame(4);
    startCombat(g, "fighter", false, "rebel-transport-ship");
    g.enemy!.systems.engines.damage = g.enemy!.systems.engines.level;
    run(g, 60);
    assert.equal(g.enemyFlee, 0);
    assert.equal(g.phase, "combat");
  });

  it("doubles the next fleet advance when a pursuit runner escapes", () => {
    const g = createGame(4);
    g.player.weapons = [];
    startCombat(g, "scout", false, "rebel-ship-warning");
    run(g, 45);
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
