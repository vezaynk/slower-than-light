import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { eventDef, loadPack, onPackWarning, packFromFtl, resetPackForTests } from "@stl/pack";
import { showArchivePage } from "../archive-pay.ts";
import { beaconMark } from "../beacon-mark.ts";
import { CRYSTAL_SECTOR } from "../sector-ids.ts";
import { canJumpTo, choose, commitJump, continueReward, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { playerShipIds } from "../unlocks.ts";
import { QUEST_CANCELLED } from "../wiki/quests.ts";
import { overtaken } from "../wiki/sector-map.ts";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">
    <class>Kestrel</class>
    <name>The Kestrel</name>
    <health amount="30"/>
    <maxPower amount="8"/>
  </shipBlueprint>
  <shipBlueprint name="PLAYER_SHIP_CIRCLE" layout="circle" img="circle">
    <class>Engi</class>
    <name>The Torus</name>
    <health amount="30"/>
    <maxPower amount="8"/>
  </shipBlueprint>
  <event name="ember-stash">
    <text>The stash is here.</text>
  </event>
  <event name="ember-quest">
    <text>A marker.</text>
    <quest event="ember-stash"/>
  </event>
  <event name="ember-quest-missing">
    <text>Missing.</text>
    <quest event="ember-no-such-event"/>
  </event>
  <event name="ember-secret">
    <text>Gate.</text>
    <choice>
      <text>Enter</text>
      <event>
        <secretSector/>
      </event>
    </choice>
  </event>
  <event name="ember-secret-fight">
    <text>Fight first.</text>
    <choice>
      <text>Fight</text>
      <event>
        <ship load="pirate" hostile="true"/>
        <secretSector/>
      </event>
    </choice>
  </event>
  <event name="ember-distress">
    <text>Distress.</text>
    <distressBeacon/>
  </event>
  <event name="ember-repair">
    <text>Repair.</text>
    <repair/>
  </event>
  <event name="ember-fleet">
    <text>Fleet.</text>
    <fleet/>
  </event>
  <event name="ember-reveal">
    <text>Reveal.</text>
    <reveal_map/>
  </event>
  <event name="ember-unlock">
    <text>Unlock.</text>
    <unlockShip id="1"/>
  </event>
  <event name="ember-unlock-far">
    <text>Far.</text>
    <unlockShip id="9999"/>
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

function here(g: Game) {
  const beacon = g.beacons.find((item) => item.id === g.here);
  assert.ok(beacon);
  return beacon;
}

function show(g: Game, id: string): void {
  const page = eventDef(id);
  assert.ok(page);
  showArchivePage(g, page);
}

function jumpTo(g: Game, flag: string): void {
  const start = here(g);
  const dest = start.links
    .map((id) => g.beacons.find((beacon) => beacon.id === id))
    .find((beacon) => beacon && !overtaken({ fleet: g.fleet + 1, dangerY: g.dangerY }, beacon));
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

describe("archive quest, secret sector, and map marks", () => {
  it("plays the quest event when the marker is reached, and cancels it in sector 8", () => {
    const g = createGame(1);
    show(g, "ember-quest");
    const marker = g.beacons.find((beacon) => beacon.quest === "ember-stash");
    assert.ok(marker);
    assert.equal(beaconMark(marker), "QUEST");
    const start = here(g);
    if (!start.links.includes(marker.id)) start.links.push(marker.id);
    g.fuel = 5;
    g.phase = "map";
    g.paused = false;
    g.enemy = null;
    g.event = null;
    g.flee = 1;
    commitJump(g, marker.id);
    assert.equal(g.event?.body, "The stash is here.");

    const late = createGame(2);
    late.sector = 8;
    show(late, "ember-quest");
    assert.equal(
      late.beacons.some((beacon) => beacon.quest === "ember-stash"),
      false,
    );
    assert.ok(late.log.includes(QUEST_CANCELLED));
  });

  it("places nothing when the quest event is missing", () => {
    const g = createGame(3);
    show(g, "ember-quest-missing");
    assert.equal(
      g.beacons.some((beacon) => beacon.quest === "ember-no-such-event"),
      false,
    );
    assert.ok(warnings.some((message) => message.includes("ember-no-such-event")));
  });

  it("jumps to the hidden crystal sector when the choice starts no fight", () => {
    const g = createGame(4);
    const sector = g.sectorId;
    choose(g, "ember-secret:0");
    assert.equal(g.sectorId, CRYSTAL_SECTOR);
    assert.notEqual(g.sectorId, sector);
    assert.equal(g.phase, "map");
    assert.equal(g.secretSector, false);
    assert.ok(g.log.includes("Hidden Crystal Worlds."));
  });

  it("waits for the fight a secret-sector choice started, and a jump away clears the tag", () => {
    const g = createGame(5);
    choose(g, "ember-secret-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.secretSector, true);
    assert.notEqual(g.sectorId, CRYSTAL_SECTOR);
    g.enemy = null;
    continueReward(g);
    assert.equal(g.sectorId, CRYSTAL_SECTOR);
    assert.equal(g.secretSector, false);

    const fled = createGame(6);
    fled.secretSector = true;
    jumpTo(fled, "ember-quiet");
    assert.equal(fled.secretSector, false);
    assert.notEqual(fled.sectorId, CRYSTAL_SECTOR);
  });

  it("marks a distress beacon and leaves a start beacon's kind alone", () => {
    const g = createGame(7);
    const start = here(g);
    assert.equal(start.kind, "start");
    show(g, "ember-distress");
    assert.equal(start.kind, "start");
    assert.notEqual(beaconMark(start), "DISTRESS");

    jumpTo(g, "ember-distress");
    const landed = here(g);
    assert.equal(landed.kind, "distress");
    assert.equal(beaconMark(landed), "DISTRESS");
  });

  it("draws a repair mark without the Last Stand repair station", () => {
    const g = createGame(8);
    const beacon = here(g);
    const flag = beacon.flag;
    show(g, "ember-repair");
    assert.equal(beacon.repair, true);
    assert.equal(beacon.flag, flag);
    assert.notEqual(flag, "BOSS_REPAIR_STATION");
    assert.equal(beaconMark(beacon), "REPAIR");
  });

  it("reveals stored marks and leaves an unlinked beacon closed", () => {
    const g = createGame(9);
    const hidden = g.beacons.find(
      (beacon) => !beacon.visited && !here(g).links.includes(beacon.id),
    );
    assert.ok(hidden);
    const score = g.beaconsVisited ?? 0;
    assert.equal(hidden.visited, false);
    assert.equal(canJumpTo(g, hidden.id), false);
    show(g, "ember-reveal");
    assert.equal(hidden.known, true);
    assert.equal(hidden.visited, false);
    assert.equal(g.beaconsVisited ?? 0, score);
    assert.equal(canJumpTo(g, hidden.id), false);
  });

  it("moves the rebel fleet onto the current beacon and leaves the ship there", () => {
    const g = createGame(10);
    const beacon = here(g);
    const fleet = g.fleet;
    const id = g.here;
    show(g, "ember-fleet");
    assert.equal(overtaken(g, beacon), true);
    assert.equal(g.here, id);
    assert.ok(g.fleet >= fleet);
  });

  it("grants the player ship at that index, and grants nothing past the list", () => {
    const hullId = playerShipIds()[1];
    assert.ok(hullId);
    const g = createGame(11);
    assert.equal(g.unlocked, undefined);
    show(g, "ember-unlock");
    assert.deepEqual(g.unlocked, [hullId]);

    const far = createGame(12);
    show(far, "ember-unlock-far");
    assert.equal(far.unlocked, undefined);
    assert.ok(warnings.some((message) => message.includes('id="9999"')));
  });
});
