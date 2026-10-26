import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadPack, onPackWarning, packFromFtl, resetPackForTests } from "@stl/pack";
import { installCradle, raiseCradlePower } from "../extras/cradle.ts";
import { bars, choose, commitJump, createGame, evasionPercent, maxBubbles } from "../sim.ts";
import type { Game } from "../types.ts";
import { overtaken } from "../wiki/sector-map.ts";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <event name="ember-engine-cap">
    <text>Engines capped.</text>
    <status type="limit" target="player" system="engines" amount="1"/>
  </event>
  <event name="ember-shield-half">
    <text>Shields.</text>
    <choice>
      <text>Accept</text>
      <event>
        <status type="divide" target="player" system="shields" amount="2"/>
      </event>
    </choice>
  </event>
  <event name="ember-weapon-clear">
    <text>Weapons.</text>
    <status type="limit" target="player" system="weapons" amount="1"/>
    <status type="loss" target="player" system="weapons" amount="2"/>
    <status type="clear" target="player" system="weapons" amount="100"/>
  </event>
  <event name="ember-melt">
    <text>Melt.</text>
    <status type="melt" target="player" system="engines" amount="1"/>
  </event>
  <event name="ember-reactor">
    <text>Reactor.</text>
    <upgrade amount="1" system="reactor"/>
  </event>
  <event name="ember-missing">
    <text>Missing.</text>
    <upgrade amount="1" system="hacking"/>
  </event>
  <event name="ember-crew">
    <text>Crew.</text>
    <removeCrew>
      <clone>false</clone>
      <text>The bay stays dark.</text>
    </removeCrew>
  </event>
  <event name="ember-augment">
    <text>Augment.</text>
    <remove name="STASIS_POD"/>
  </event>
  <event name="ember-unpaid">
    <text>Unpaid.</text>
    <item_modify>
      <item type="scrap" min="-9999" max="-9999"/>
    </item_modify>
    <upgrade amount="1" system="reactor"/>
  </event>
  <event name="ember-divide-zero">
    <text>Zero.</text>
    <status type="divide" target="player" system="shields" amount="0"/>
  </event>
  <event name="ember-clear-bare">
    <text>Clear.</text>
    <status type="limit" target="player" system="engines" amount="1"/>
    <status type="clear" target="player" system="engines"/>
  </event>
</FTL>`;

let warnings: string[] = [];
let restore = (): void => {};

beforeEach(() => {
  warnings = [];
  restore = onPackWarning((message) => warnings.push(message));
  loadPack(packFromFtl([{ path: "data/events.xml", xml: XML }]), "append");
});

afterEach(() => {
  restore();
  resetPackForTests();
});

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
  const jumps = g.jumps;
  commitJump(g, dest.id);
  assert.equal(g.jumps, jumps + 1);
}

describe("archive status, upgrade, crew loss, and augment removal", () => {
  it("caps evasion bars at 1 until the jump", () => {
    const g = createGame(1);
    const engines = g.player.systems.engines;
    engines.level = 5;
    engines.power = 5;
    const open = evasionPercent(g, g.player, "player");
    engines.power = 1;
    const oneBar = evasionPercent(g, g.player, "player");
    engines.power = 5;
    assert.ok(open > oneBar);
    jumpTo(g, "ember-engine-cap");
    assert.equal(bars(engines), 1);
    assert.equal(engines.level, 5);
    assert.equal(engines.archiveLimit, 1);
    assert.equal(evasionPercent(g, g.player, "player"), oneBar);
    jumpTo(g, "ember-quiet");
    assert.equal(engines.archiveLimit, undefined);
    assert.equal(engines.archiveDivide, undefined);
    assert.equal(bars(engines), 5);
    assert.equal(evasionPercent(g, g.player, "player"), open);
  });

  it("floors shield bubbles on a divide of 2", () => {
    const g = createGame(2);
    const shields = g.player.systems.shields;
    shields.level = 4;
    shields.power = 4;
    assert.equal(maxBubbles(g.player), 2);
    choose(g, "ember-shield-half:0");
    assert.equal(bars(shields), 2);
    assert.equal(maxBubbles(g.player), 1);
    assert.equal(shields.level, 4);
    assert.equal(shields.archiveDivide, 2);
  });

  it("clears a cap and leaves weapon damage", () => {
    const g = createGame(3);
    const weapons = g.player.systems.weapons;
    weapons.level = 4;
    weapons.power = 4;
    weapons.damage = 0;
    jumpTo(g, "ember-weapon-clear");
    assert.equal(weapons.archiveLimit, undefined);
    assert.equal(weapons.archiveDivide, undefined);
    assert.equal(weapons.damage, 2);
    assert.equal(weapons.level, 4);
  });

  it("warns on an unknown status type and leaves the ship unchanged", () => {
    const g = createGame(4);
    const engines = g.player.systems.engines;
    const level = engines.level;
    const power = engines.power;
    const damage = engines.damage;
    jumpTo(g, "ember-melt");
    assert.equal(engines.level, level);
    assert.equal(engines.power, power);
    assert.equal(engines.damage, damage);
    assert.equal(engines.archiveLimit, undefined);
    assert.ok(warnings.some((message) => message.includes('type "melt"')));
  });

  it("raises the reactor by 1 and spends no scrap", () => {
    const g = createGame(5);
    const scrap = g.scrap;
    const reactor = g.player.reactor;
    jumpTo(g, "ember-reactor");
    assert.equal(g.player.reactor, reactor + 1);
    assert.equal(g.scrap, scrap);
  });

  it("skips an upgrade for a system the ship lacks", () => {
    const g = createGame(6);
    assert.equal(g.player.kits.hacking, undefined);
    const scrap = g.scrap;
    jumpTo(g, "ember-missing");
    assert.equal(g.player.kits.hacking, undefined);
    assert.equal(g.scrap, scrap);
  });

  it("removes one crew member and leaves the clone bay idle", () => {
    const g = createGame(7);
    g.scrap = 80;
    installCradle(g);
    raiseCradlePower(g);
    assert.equal(g.player.kits.clonebay?.power, 1);
    const roster = g.crew.filter((c) => c.side === "player").length;
    jumpTo(g, "ember-crew");
    assert.equal(g.crew.filter((c) => c.side === "player").length, roster - 1);
    assert.equal(
      g.crew.some((c) => (c.cloneIn ?? 0) > 0),
      false,
    );
    assert.ok(g.event?.body.includes("The bay stays dark."));
    assert.equal(g.log.includes("The bay stays dark."), false);
  });

  it("drops one fitted augment", () => {
    const g = createGame(8);
    g.augments = ["STASIS_POD", "ROCK_ARMOR"];
    jumpTo(g, "ember-augment");
    assert.deepEqual(g.augments, ["ROCK_ARMOR"]);
  });

  it("applies none of the list when the cost is unpaid", () => {
    const g = createGame(9);
    const reactor = g.player.reactor;
    const scrap = g.scrap;
    jumpTo(g, "ember-unpaid");
    assert.equal(g.player.reactor, reactor);
    assert.equal(g.scrap, scrap);
  });

  it("clears a cap when the clear tag has no amount", () => {
    const g = createGame(11);
    const engines = g.player.systems.engines;
    engines.level = 5;
    engines.power = 5;
    jumpTo(g, "ember-clear-bare");
    assert.equal(engines.archiveLimit, undefined);
    assert.equal(engines.archiveDivide, undefined);
    assert.equal(bars(engines), 5);
  });

  it("skips a divide whose amount is below 1", () => {
    const g = createGame(10);
    const shields = g.player.systems.shields;
    shields.level = 4;
    shields.power = 4;
    jumpTo(g, "ember-divide-zero");
    assert.equal(shields.archiveDivide, undefined);
    assert.equal(shields.archiveLimit, undefined);
    assert.equal(bars(shields), 4);
    assert.ok(warnings.some((message) => message.includes("below 1")));
  });
});
