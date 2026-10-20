import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { enemyBlueprintId } from "@stl/catalog/src/enemy-blueprints.ts";
import { hullDef, loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import type { HullDef } from "@stl/pack";
import { openArchiveSurrender } from "../archive-pay.ts";
import { mixCrewRaces } from "../enemy-gen.ts";
import { choose, commitJump, createGame, rand, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { overtaken } from "../wiki/sector-map.ts";
import { ACCEPT_ID, REFUSE_ID, surrenderTick } from "../wiki/surrender.ts";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <blueprintList name="SHIPS_PIRATE">
    <name>PIRATE_HULL</name>
  </blueprintList>
  <ship name="PIRATE" auto_blueprint="SHIPS_PIRATE">
    <surrender min="3" max="4">
      <text>Hail.</text>
      <choice>
        <text>Take</text>
        <event>
          <text>Paid.</text>
          <autoReward level="LOW">scrap_only</autoReward>
          <ship hostile="false"/>
        </event>
      </choice>
      <choice>
        <text>Refuse</text>
        <event/>
      </choice>
    </surrender>
    <destroyed load="DESTROYED_DEFAULT"/>
  </ship>
  <ship name="PIRATE_ODDS">
    <surrender chance="0.5" min="1" max="8">
      <text>Odds.</text>
      <choice>
        <text>Take</text>
        <event><text>Ok.</text></event>
      </choice>
    </surrender>
  </ship>
  <ship name="PIRATE_FUEL">
    <surrender min="0" max="0"/>
    <escape min="30" max="30" timer="80">
      <text>The fuel runner spools its drive.</text>
      <ship hostile="true"/>
    </escape>
    <gotaway>
      <text>The fuel runner got away with the archive sentence.</text>
    </gotaway>
  </ship>
  <ship name="PIRATE_SMUGGLE">
    <escape min="30" max="30" timer="35">
      <text>Smuggle.</text>
    </escape>
  </ship>
  <ship name="PIRATE_RUN">
    <escape min="1" max="2"/>
  </ship>
  <eventList name="DESTROYED_DEFAULT">
    <event>
      <text>The hull breaks apart.</text>
      <autoReward level="LOW">scrap_only</autoReward>
    </event>
  </eventList>
  <blueprintList name="SHIPS_JELLY">
    <name>JELLY_HULL</name>
  </blueprintList>
  <ship name="JELLY_STATUS" auto_blueprint="SHIPS_JELLY">
    <crew>
      <crewMember type="mantis" prop="0.8"/>
      <crewMember class="engi" prop="0.2"/>
    </crew>
    <weaponOverride count="1">
      <name>BEAM_FIRE</name>
      <name>BOMB_FIRE</name>
    </weaponOverride>
  </ship>
  <event name="PIRATE_FIGHT">
    <text>A pirate.</text>
    <ship load="PIRATE" hostile="true"/>
  </event>
  <event name="PAY_SCRAP">
    <text>Paid scrap.</text>
    <item_modify>
      <item type="scrap" min="7" max="7"/>
    </item_modify>
  </event>
  <event name="GO_SCRAP">
    <text>Go.</text>
    <choice>
      <text>Pay</text>
      <event load="PAY_SCRAP"/>
    </choice>
  </event>
  <event name="NEED_SCRAP">
    <text>Too much.</text>
    <item_modify>
      <item type="scrap" min="-9999" max="-9999"/>
    </item_modify>
  </event>
  <event name="GO_NEED">
    <text>Try.</text>
    <choice>
      <text>Pay</text>
      <event load="NEED_SCRAP"/>
    </choice>
  </event>
</FTL>`;

afterEach(() => resetPackForTests());

beforeEach(() => {
  const pack = packFromFtl([{ path: "data/events_ships.xml", xml: XML }]);
  pack.hulls = [
    emberHull("PIRATE_HULL", "Pirate Hull", "LASER_BURST_3"),
    emberHull("JELLY_HULL", "Jelly Hull", "LASER_BURST_3", [{ amount: 5, class: "human" }]),
  ];
  loadPack(pack, "append");
});

function emberHull(
  id: string,
  name: string,
  weapon: string,
  crewCounts: HullDef["crewCounts"] = [{ amount: 2, class: "mantis" }],
): HullDef {
  const base = hullDef(enemyBlueprintId("rebel-fighter"));
  assert.ok(base);
  return {
    ...base,
    id,
    name,
    weapons: [weapon],
    weaponLoad: undefined,
    weaponCount: 1,
    crewCounts,
    augments: [],
  };
}

function jumpTo(g: Game, flag: string): void {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here);
  const dest = here.links
    .map((id) => g.beacons.find((b) => b.id === id))
    .find((b) => b && !overtaken({ fleet: g.fleet + 1, dangerY: g.dangerY }, b));
  assert.ok(dest);
  dest.kind = "event";
  dest.flag = flag;
  dest.name = flag;
  dest.resolved = false;
  dest.tier = "";
  g.fuel = 5;
  g.phase = "map";
  g.paused = false;
  g.enemy = null;
  g.event = null;
  g.flee = 1;
  commitJump(g, dest.id);
}

function quiet(tier: string, seed = 4): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, tier);
  if (g.enemy) {
    g.enemy.weapons = [];
    g.enemy.boards = false;
  }
  g.boardTimer = 0;
  return g;
}

function seedYielding(lo: number, hi: number): number {
  const probe = createGame(1);
  for (let seed = 1; seed < 200000; seed++) {
    probe.seed = seed;
    const n = rand(probe);
    if (n >= lo && n < hi) return seed;
  }
  throw new Error(`no seed in [${lo}, ${hi})`);
}

describe("ship events", () => {
  it("fights the definition's blueprint list when an event loads the ship", () => {
    const g = createGame(3);
    jumpTo(g, "PIRATE_FIGHT");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightShip, "PIRATE");
    assert.equal(g.enemy?.name, "Pirate Hull");
    assert.equal(g.enemySurrender?.hullPoints, true);
    const campaign = quiet("pirate", 5);
    assert.equal(campaign.fightShip, null);
    assert.notEqual(campaign.enemySurrender?.hullPoints, true);
  });

  it("rolls the ship event crew weights across the blueprint seats", () => {
    const g = createGame(21);
    startCombat(g, "JELLY_STATUS");
    const crew = g.crew.filter((member) => member.side === "enemy");
    assert.equal(crew.length, 5);
    for (const member of crew) {
      assert.ok(member.name === "Mantis" || member.name === "Engi");
      assert.ok(member.kin === "mantis" || member.kin === "engi");
    }
  });

  it("a zero roll of the crew weights picks the first race", () => {
    assert.deepEqual(
      mixCrewRaces(
        [
          { race: "mantis", prop: 0.8 },
          { race: "engi", prop: 0.2 },
        ],
        5,
        () => 0,
        "JELLY_STATUS",
      ),
      ["Mantis", "Mantis", "Mantis", "Mantis", "Mantis"],
    );
  });

  it("mounts one weapon from the override and leaves the blueprint guns off", () => {
    const g = createGame(22);
    startCombat(g, "JELLY_STATUS");
    const guns = g.enemy?.weapons.map((weapon) => weapon.defId) ?? [];
    assert.equal(guns.length, 1);
    assert.ok(guns[0] === "BEAM_FIRE" || guns[0] === "BOMB_FIRE");
  });

  it("a ship event with no weapon override keeps the blueprint loadout", () => {
    const g = createGame(23);
    startCombat(g, "PIRATE");
    assert.deepEqual(
      g.enemy?.weapons.map((weapon) => weapon.defId),
      ["LASER_BURST_3"],
    );
  });

  it("draws a hull-point surrender threshold and opens on the hull, not a percent", () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = quiet("PIRATE", seed);
      const threshold = g.enemySurrender?.threshold ?? -1;
      assert.equal(Number.isInteger(threshold), true);
      assert.ok(threshold >= 3 && threshold <= 4, String(threshold));
      seen.add(threshold);
    }
    assert.equal(seen.size, 2);

    const high = quiet("PIRATE", 6);
    high.enemy!.hullMax = 10;
    high.enemy!.hull = 5;
    high.enemySurrender!.threshold = 4;
    step(high, 1 / 30);
    assert.equal(high.phase, "combat");
    assert.equal(high.enemySurrender?.rolled, false);
    assert.equal(high.enemy?.hull, 5);

    high.enemy!.hull = 4;
    step(high, 1 / 30);
    assert.equal(high.phase, "event");
    assert.equal(high.enemySurrender?.offered, true);
    assert.equal(high.event?.body, "Hail.");
    assert.equal(high.enemy?.name, "Pirate Hull");
    assert.equal(high.enemyEscape?.running, false);
    assert.equal(high.enemyEscape?.rolled, true);
    assert.ok(
      high.event?.choices.every((choice) => choice.id !== ACCEPT_ID && choice.id !== REFUSE_ID),
    );

    const dropped = quiet("PIRATE", 7);
    dropped.enemy!.hullMax = 10;
    dropped.enemy!.hull = 5;
    dropped.enemySurrender!.threshold = 4;
    step(dropped, 1 / 30);
    assert.equal(dropped.enemySurrender?.rolled, false);
    dropped.enemy!.hull = 2;
    step(dropped, 1 / 30);
    assert.equal(dropped.phase, "event");
    assert.equal(dropped.event?.body, "Hail.");
  });

  it("rolls a surrender chance once as a probability, and an omitted chance always opens", () => {
    const openSeed = seedYielding(0.4, 0.5);
    const shutSeed = seedYielding(0.5, 0.6);
    const opened = quiet("PIRATE_ODDS", 8);
    opened.enemy!.hullMax = 10;
    opened.enemy!.hull = 4;
    opened.enemySurrender!.threshold = 4;
    opened.seed = openSeed;
    assert.equal(surrenderTick(opened, 1 / 30), true);
    assert.equal(opened.enemySurrender?.rolled, true);
    assert.equal(opened.phase, "combat");
    const after = opened.seed;
    assert.equal(surrenderTick(opened, 1 / 30), false);
    assert.equal(opened.seed, after);
    openArchiveSurrender(opened);
    assert.equal(opened.phase, "event");
    assert.equal(opened.event?.body, "Odds.");

    const shut = quiet("PIRATE_ODDS", 9);
    shut.enemy!.hullMax = 10;
    shut.enemy!.hull = 4;
    shut.enemySurrender!.threshold = 4;
    shut.seed = shutSeed;
    assert.equal(surrenderTick(shut, 1 / 30), false);
    assert.equal(shut.enemySurrender?.rolled, true);
    assert.equal(shut.phase, "combat");
    const spent = shut.seed;
    assert.equal(surrenderTick(shut, 1 / 30), false);
    assert.equal(shut.seed, spent);

    const certain = quiet("PIRATE", 10);
    certain.enemy!.hullMax = 10;
    certain.enemy!.hull = 4;
    certain.enemySurrender!.threshold = 4;
    const seed = certain.seed;
    assert.equal(certain.enemySurrender?.chance, 1);
    assert.equal(surrenderTick(certain, 1 / 30), true);
    assert.equal(certain.seed, seed);
    assert.equal(certain.enemySurrender?.offered, true);
  });

  it("pays the destroyed page and skips default salvage when the hull reaches 0", () => {
    const g = quiet("PIRATE", 11);
    g.fightEvent = "quest-fed-assist-asb";
    g.enemy!.hull = 0;
    const scrap = g.scrap;
    step(g, 1 / 30);
    assert.ok(g.scrap > scrap);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, "The hull breaks apart.");
    assert.equal(g.reward, null);
    assert.equal(g.fightEvent, null);
  });

  it("runs an archive escape clock from hull points and shows gotaway instead of the wiki card", () => {
    const fuel = quiet("PIRATE_FUEL", 12);
    const enemy = fuel.enemy;
    assert.ok(enemy);
    enemy.hullMax = Math.max(enemy.hullMax, 10);
    enemy.hull = 10;
    assert.equal(fuel.enemyEscape?.seconds, 80);
    assert.equal(fuel.enemyEscape?.hullPoints, true);
    step(fuel, 1 / 30);
    assert.equal(fuel.enemyEscape?.running, true);
    assert.equal(fuel.phase, "event");
    assert.equal(fuel.event?.body, "The fuel runner spools its drive.");
    assert.equal(fuel.event?.choices[0]?.id, "ship-resume");
    assert.equal(fuel.enemy, enemy);
    assert.equal(fuel.enemy?.hull, 10);
    choose(fuel, "ship-resume");
    assert.equal(fuel.phase, "combat");
    assert.equal(fuel.paused, false);
    assert.equal(fuel.enemy, enemy);
    assert.equal(fuel.enemyEscape?.running, true);
    fuel.fightEvent = "pirate-briber";
    fuel.enemyFlee = 1;
    step(fuel, 1 / 30);
    assert.equal(fuel.enemy, null);
    assert.match(fuel.event?.body ?? "", /archive sentence/);
    assert.doesNotMatch(fuel.event?.body ?? "", /abandoned pursuit/);

    const smuggle = quiet("PIRATE_SMUGGLE", 13);
    assert.equal(smuggle.enemyEscape?.seconds, 35);
    const bare = quiet("PIRATE_RUN", 14);
    assert.equal(bare.enemyEscape?.seconds, 15);
    bare.enemy!.hullMax = 10;
    bare.enemy!.hull = 8;
    bare.enemyEscape!.threshold = 8;
    step(bare, 1 / 30);
    assert.equal(bare.phase, "combat");
    assert.equal(bare.enemyEscape?.running, true);
    assert.ok(bare.log.some((line) => line.includes("powering their FTL drive")));
  });

  it("ends a surrender without salvage, and a refusal returns to the fight", () => {
    const accept = offer(15);
    const kills = accept.kills;
    const scrap = accept.scrap;
    const id = accept.event?.choices[0]?.id;
    assert.equal(id, "PIRATE:surrender:0");
    choose(accept, id!);
    assert.equal(accept.enemy, null);
    assert.notEqual(accept.phase, "reward");
    assert.equal(accept.reward, null);
    assert.ok(accept.scrap > scrap);
    assert.equal(accept.kills, kills);

    const refuse = offer(16);
    const foe = refuse.enemy;
    const refuseId = refuse.event?.choices[1]?.id;
    assert.equal(refuseId, "PIRATE:surrender:1");
    choose(refuse, refuseId!);
    assert.equal(refuse.phase, "combat");
    assert.equal(refuse.paused, false);
    assert.equal(refuse.enemy, foe);
    assert.equal(refuse.enemySurrender?.refused, true);
    const beacon = refuse.beacons.find((item) => item.id === refuse.here);
    assert.equal(beacon?.resolved, true);
    refuse.enemy!.hull = 4;
    step(refuse, 1 / 30);
    assert.equal(refuse.phase, "combat");
    assert.equal(refuse.event, null);
    assert.equal(refuse.enemy, foe);
  });

  it("pays an item_modify page once on arrival and once through goto", () => {
    const arrived = createGame(17);
    const before = arrived.scrap;
    jumpTo(arrived, "PAY_SCRAP");
    assert.equal(arrived.scrap, before + 7);
    assert.equal(arrived.phase, "event");

    const gone = createGame(18);
    const start = gone.scrap;
    gone.phase = "event";
    gone.event = { title: "Go", body: "Go.", choices: [{ id: "GO_SCRAP:0", label: "Pay" }] };
    choose(gone, "GO_SCRAP:0");
    assert.equal(gone.scrap, start + 7);
    assert.match(gone.event?.body ?? "", /Scrap: 7/);
    assert.match(gone.event?.body ?? "", /Paid scrap/);

    const poor = createGame(19);
    poor.scrap = 10;
    poor.phase = "event";
    poor.paused = true;
    poor.event = { title: "Try", body: "Try.", choices: [{ id: "GO_NEED:0", label: "Pay" }] };
    choose(poor, "GO_NEED:0");
    assert.equal(poor.scrap, 10);
    assert.equal(poor.phase, "event");
    assert.equal(poor.event?.body, "Try.");
  });
});

function offer(seed: number): Game {
  const g = quiet("PIRATE", seed);
  g.enemy!.hullMax = 10;
  g.enemy!.hull = 4;
  g.enemySurrender!.threshold = 4;
  step(g, 1 / 30);
  assert.equal(g.phase, "event");
  return g;
}
