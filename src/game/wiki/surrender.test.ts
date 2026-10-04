import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  ACCEPT_ID,
  REFUSE_ID,
  STALEMATE_FUEL,
  STALEMATE_SECONDS,
  rollSurrenderOffer,
  surrenderOfferView,
  surrenderPlan,
} from "./surrender.ts";

function run(g: Game, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 30) && g.phase === "combat"; i++) step(g, 1 / 30);
}

/** A Rebel fight where nothing shoots, so hull only moves when the test moves it. */
function quietFight(seed = 4): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, "Rebel ship");
  g.enemy!.weapons = [];
  g.enemy!.boards = false;
  g.boardTimer = 0;
  return g;
}

function offerNow(g: Game) {
  g.enemySurrender!.chance = 100;
  g.enemySurrender!.threshold = 35;
  g.enemy!.hull = Math.floor(g.enemy!.hullMax * 0.3);
  run(g, 0.1);
}

describe("surrender rows (Enemy Ships, Surrender/escape values)", () => {
  it("uses each faction's chance and hull range; pirates use the Pirate row", () => {
    const row = (faction: string, pirate = false, r = 0) => {
      const p = surrenderPlan({ tier: "pool", faction, pirate }, () => r);
      return [p.chance, Math.round(p.threshold)];
    };
    assert.deepEqual(row("crystal"), [40, 30]);
    assert.deepEqual(row("slug"), [50, 30]);
    assert.deepEqual(row("lanius"), [80, 30]);
    assert.deepEqual(row("rock"), [30, 30]);
    assert.deepEqual(row("rebel"), [50, 20]);
    assert.deepEqual(row("rebel", false, 1), [50, 30]);
    assert.deepEqual(row("mantis", true), [50, 30]);
  });

  it("never surrenders: Auto, Engi, Mantis, Zoltan, Elite, Flagship, and the listed events", () => {
    for (const f of ["auto", "engi", "mantis", "zoltan", "federation"]) {
      assert.equal(surrenderPlan({ tier: "pool", faction: f }, () => 0.5).chance, 0, f);
    }
    assert.equal(surrenderPlan({ tier: "elite", faction: "rebel" }, () => 0.5).chance, 0);
    assert.equal(surrenderPlan({ tier: "boss" }, () => 0.5).chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", faction: "rebel", event: "rebel-ship-supplying-civilians" }, () => 0.5).chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", faction: "rock", pirate: true, event: "rock-pirate-fight" }, () => 0.5).chance, 0);
  });

  it("rolls a Stuff offer: two of fuel / missiles / parts plus scrap", () => {
    const g = createGame(9);
    for (let i = 0; i < 40; i++) {
      const o = rollSurrenderOffer(g);
      const kinds = [o.fuel, o.missiles, o.parts].filter((n) => n > 0).length;
      assert.equal(kinds, 2);
      assert.ok(o.scrap > 0);
      assert.ok(o.fuel <= 6 && o.missiles <= 8 && o.parts <= 2);
    }
  });
});

describe("surrender in a fight", () => {
  it("rolls once at the threshold", () => {
    const g = quietFight();
    g.enemySurrender!.chance = 0.0001;
    g.enemySurrender!.threshold = 35;
    g.enemy!.hull = Math.floor(g.enemy!.hullMax * 0.3);
    run(g, 0.1);
    assert.equal(g.enemySurrender!.rolled, true);
    assert.equal(g.phase, "combat");
    g.enemySurrender!.chance = 100;
    g.enemy!.hull -= 1;
    run(g, 0.5);
    assert.equal(g.enemySurrender!.offered, false, "no second roll");
  });

  it("does not roll above the threshold", () => {
    const g = quietFight();
    g.enemySurrender!.chance = 100;
    g.enemySurrender!.threshold = 35;
    run(g, 1);
    assert.equal(g.enemySurrender!.rolled, false);
  });

  it("opens a paused offer with the cargo listed", () => {
    const g = quietFight();
    offerNow(g);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [ACCEPT_ID, REFUSE_ID],
    );
    assert.ok(surrenderOfferView(g));
    const flee = g.enemyFlee;
    step(g, 1);
    assert.equal(g.enemyFlee, flee, "the fight is frozen while the offer is open");
  });

  it("accept pays the offer and ends the fight", () => {
    const g = quietFight();
    const before = { scrap: g.scrap, fuel: g.fuel, missiles: g.missiles, parts: g.player.parts, kills: g.kills };
    offerNow(g);
    const offer = surrenderOfferView(g)!;
    choose(g, ACCEPT_ID);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "reward");
    assert.equal(g.scrap, before.scrap + offer.scrap);
    assert.equal(g.fuel, before.fuel + offer.fuel);
    assert.equal(g.missiles, before.missiles + offer.missiles);
    assert.equal(g.player.parts, before.parts + offer.parts);
    assert.equal(g.kills, before.kills + 1);
    assert.equal(g.reward?.scrap, offer.scrap);
    assert.equal(g.beacons.find((b) => b.id === g.here)?.resolved, true);
  });

  it("refuse continues the fight and blocks a later escape", () => {
    const g = quietFight();
    g.enemyEscape!.chance = 100;
    g.enemyEscape!.threshold = 35;
    offerNow(g);
    assert.equal(g.enemyEscape!.running, false, "surrender is rolled before the escape on the same tick");
    choose(g, REFUSE_ID);
    assert.equal(g.phase, "combat");
    assert.equal(g.paused, false);
    assert.ok(g.enemy);
    g.enemy!.hull -= 1;
    run(g, 5);
    assert.equal(g.enemyEscape!.running, false, "Enemies will never start running away if they have already offered a surrender");
    assert.equal(g.phase, "combat");
    // "If you jump away after rejecting ... then return, the enemy will not be present."
    assert.equal(g.beacons.find((b) => b.id === g.here)?.resolved, true);
  });

  it("an escape still rolls on that tick when no offer is made", () => {
    const g = quietFight();
    g.enemySurrender!.chance = 0;
    g.enemyEscape!.chance = 100;
    g.enemyEscape!.threshold = 40;
    g.enemy!.hull = Math.floor(g.enemy!.hullMax * 0.3);
    run(g, 0.1);
    assert.equal(g.enemyEscape!.running, true);
  });
});

describe("anti-stalemate (Enemy Ships, Note)", () => {
  function lowAndQuiet(): Game {
    const g = quietFight();
    g.enemySurrender!.chance = 0;
    g.enemyEscape!.mode = "never";
    g.enemy!.hull = Math.floor(g.enemy!.hullMax * 0.3);
    return g;
  }

  it("ends with 2 fuel after a minute below the threshold without hull damage", () => {
    const g = lowAndQuiet();
    const fuel = g.fuel;
    run(g, STALEMATE_SECONDS - 1);
    assert.equal(g.phase, "combat");
    run(g, 2);
    assert.equal(g.phase, "reward");
    assert.equal(g.enemy, null);
    assert.equal(g.fuel, fuel + STALEMATE_FUEL);
    assert.equal(g.reward?.res?.fuel, STALEMATE_FUEL);
  });

  it("hull damage starts the minute over", () => {
    const g = lowAndQuiet();
    run(g, 40);
    g.enemy!.hull -= 1;
    run(g, 40);
    assert.equal(g.phase, "combat");
    run(g, 21);
    assert.equal(g.phase, "reward");
  });

  it("does not count above the threshold", () => {
    const g = quietFight();
    g.enemySurrender!.chance = 0;
    g.enemyEscape!.mode = "never";
    run(g, STALEMATE_SECONDS + 5);
    assert.equal(g.phase, "combat");
  });
});
