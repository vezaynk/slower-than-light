import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  ACCEPT_ID,
  REFUSE_ID,
  SCRIPTED_SURRENDERS,
  STALEMATE_FUEL,
  STALEMATE_SECONDS,
  randomRace,
  rollScriptedOffer,
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
    assert.equal(g.kills, before.kills);
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

describe("scripted surrenders (event pages)", () => {
  /** A quiet fight started by the event `slug`, its hull already at the offer threshold. */
  function eventFight(tier: string, slug: string, seed = 6): Game {
    const g = createGame(seed);
    g.player.weapons = [];
    startCombat(g, tier, false, slug);
    g.enemy!.weapons = [];
    g.enemy!.boards = false;
    g.boardTimer = 0;
    g.enemyEscape!.mode = "never";
    return g;
  }
  function offer(g: Game) {
    g.enemySurrender!.chance = 100;
    g.enemy!.hull = Math.max(1, Math.floor((g.enemy!.hullMax * (g.enemySurrender!.threshold - 1)) / 100));
    run(g, 0.1);
    assert.equal(g.phase, "event");
  }

  it("uses the page's chance and hull range instead of the faction row", () => {
    const at = (slug: string, r: number) => {
      const p = surrenderPlan({ tier: "pool", faction: "crystal", pirate: false, event: slug }, () => r);
      return [p.chance, Math.round(p.threshold), p.event];
    };
    assert.deepEqual(at("crystal-fight-with-surrender-offer-human-crew", 0), [50, 30, "crystal-fight-with-surrender-offer-human-crew"]);
    assert.deepEqual(at("crystal-fight-with-surrender-offer-hull-repairs", 1), [100, 40, "crystal-fight-with-surrender-offer-hull-repairs"]);
    assert.deepEqual(at("pirate-briber", 0), [70, 30, "pirate-briber"]);
    assert.deepEqual(at("remote-settlement", 0), [50, 20, "remote-settlement"]);
    assert.deepEqual(at("slaver-hostile", 0), [80, 20, "slaver-hostile"]);
    assert.deepEqual(at("slug-home-nebula-surrender", 0), [100, 30, "slug-home-nebula-surrender"]);
    assert.equal(SCRIPTED_SURRENDERS["slaver-friendly"].chance, 80);
  });

  it("never: the plural Rock pirates slugs, surrenderno pages, and Mantis ship-collectors' first fight", () => {
    for (const slug of ["rock-pirates-fight", "rock-pirates-fight-near-sun", "rebel-transport-ship", "rebel-ship-warning", "mantis-ship-collectors"]) {
      assert.equal(surrenderPlan({ tier: "pool", faction: "rebel", pirate: true, event: slug }, () => 0.5).chance, 0, slug);
    }
  });

  it("startCombat hands the event slug to the plan", () => {
    const g = eventFight("Pirate ship", "pirate-briber");
    assert.equal(g.enemySurrender!.event, "pirate-briber");
    assert.equal(g.enemySurrender!.chance, 70);
  });

  it("Human crew: a Human joins and the fight continues", () => {
    const g = eventFight("Crystal ship", "crystal-fight-with-surrender-offer-human-crew");
    const crew = g.crew.filter((c) => c.side === "player").length;
    offer(g);
    assert.equal(g.event?.choices[0].label, "Accept their surrender.");
    assert.equal(surrenderOfferView(g)?.crew, "Human");
    const kills = g.kills;
    choose(g, ACCEPT_ID);
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy, "the fight continues");
    assert.equal(g.kills, kills);
    const mine = g.crew.filter((c) => c.side === "player");
    assert.equal(mine.length, crew + 1);
    assert.equal(mine[mine.length - 1].kin, "plain");
    g.enemy!.hull -= 1;
    run(g, 0.5);
    assert.equal(g.phase, "combat", "no second offer");
  });

  it("hull repairs: low fuel and scrap plus 8 repairs, and the fight ends", () => {
    const g = eventFight("Crystal ship", "crystal-fight-with-surrender-offer-hull-repairs");
    g.player.hull = g.player.hullMax - 12;
    const fuel = g.fuel;
    offer(g);
    const o = surrenderOfferView(g)!;
    assert.ok(o.fuel >= 1 && o.fuel <= 3);
    assert.equal(o.missiles + o.parts, 0);
    assert.equal(o.repairs, 8);
    assert.ok(o.scrap > 0);
    choose(g, ACCEPT_ID);
    assert.equal(g.phase, "reward");
    assert.equal(g.enemy, null);
    assert.equal(g.player.hull, g.player.hullMax - 4);
    assert.equal(g.fuel, fuel + o.fuel);
    const note = g.reward?.note ?? "";
    assert.ok(note.includes("They accept your explanation and allow you to approach the fleet. It appears they are miners and colonists from a fringe settlement who are fleeing to more protected space after hearing reports of pirate and rebel attacks.\n\nThey apologize for their hasty response to your presence and spend some time refueling and repairing both ships."));
  });

  it("hull repairs: refusing logs their line and the fight continues", () => {
    const g = eventFight("Crystal ship", "crystal-fight-with-surrender-offer-hull-repairs");
    offer(g);
    choose(g, REFUSE_ID);
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    assert.ok(g.log.includes("They wanted to pick a fight with you so that's what they'll get."));
  });

  it("Pirate briber: high-tier Stuff", () => {
    for (let seed = 1; seed < 12; seed++) {
      const g = eventFight("Pirate ship", "pirate-briber", seed);
      offer(g);
      const o = surrenderOfferView(g)!;
      assert.equal(o.tier, "high");
      assert.equal([o.fuel, o.missiles, o.parts].filter((n) => n > 0).length, 2);
      if (o.fuel) assert.ok(o.fuel >= 3 && o.fuel <= 6);
      if (o.missiles) assert.ok(o.missiles >= 4 && o.missiles <= 8);
      assert.equal(g.event?.choices[0].label, "Accept the more generous bribe and leave.");
    }
  });

  it("Remote settlement: medium-tier Stuff", () => {
    const g = eventFight("Pirate ship", "remote-settlement");
    offer(g);
    assert.equal(surrenderOfferView(g)!.tier, "medium");
  });

  it("Slaver: a crewmember and nothing else, and the fight ends", () => {
    const g = eventFight("Pirate ship", "slaver-hostile");
    const crew = g.crew.filter((c) => c.side === "player").length;
    const before = { scrap: g.scrap, fuel: g.fuel };
    offer(g);
    const o = surrenderOfferView(g)!;
    assert.ok(o.crew);
    assert.equal(o.scrap + o.fuel + o.missiles + o.parts, 0);
    choose(g, ACCEPT_ID);
    assert.equal(g.phase, "reward");
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
    assert.deepEqual({ scrap: g.scrap, fuel: g.fuel }, before);
  });

  it("Slug Home Nebula: the Anti-Bio Beam", () => {
    const g = eventFight("Slug ship", "slug-home-nebula-surrender");
    offer(g);
    assert.equal(surrenderOfferView(g)!.weapon, "antibio");
    choose(g, ACCEPT_ID);
    assert.ok(g.player.weapons.some((w) => w.defId === "antibio"));
  });

  it("a fight no event started keeps the generic Stuff cargo", () => {
    const g = quietFight();
    assert.equal(g.enemySurrender!.event, undefined);
    offerNow(g);
    const o = surrenderOfferView(g)!;
    assert.equal(o.crew, undefined);
    assert.equal(o.repairs, undefined);
  });

  it("an unnamed crew reward follows the sector list; a named race stays named", () => {
    const slaver = eventFight("Pirate ship", "slaver-hostile");
    slaver.sectorName = "Hidden Crystal Worlds";
    offer(slaver);
    assert.equal(surrenderOfferView(slaver)!.crew, "Crystal");

    const named = rollScriptedOffer(createGame(4), SCRIPTED_SURRENDERS["crystal-fight-with-surrender-offer-human-crew"]);
    assert.equal(named.crew, "Human");
    const onCrystal = createGame(4);
    onCrystal.sectorName = "Hidden Crystal Worlds";
    assert.equal(rollScriptedOffer(onCrystal, SCRIPTED_SURRENDERS["crystal-fight-with-surrender-offer-human-crew"]).crew, "Human");
  });
});

describe("crew reward races (Category:Crew Rewards)", () => {
  it("Hidden Crystal Worlds draws only Crystal", () => {
    const g = createGame(2);
    g.sectorName = "Hidden Crystal Worlds";
    for (let i = 0; i < 24; i++) assert.equal(randomRace(g), "Crystal");
  });

  it("Engi Homeworlds draws only Engi, Human, and Zoltan, and each appears", () => {
    const allowed = new Set(["Engi", "Human", "Zoltan"]);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      g.sectorName = "Engi Homeworlds";
      for (let i = 0; i < 6; i++) {
        const race = randomRace(g);
        assert.ok(allowed.has(race), race);
        seen.add(race);
      }
    }
    assert.deepEqual([...seen].sort(), ["Engi", "Human", "Zoltan"]);
  });
});
