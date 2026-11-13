import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, commitJump, createGame } from "../sim.ts";
import type { Beacon, Game, WeaponInst } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerEvent } from "./filler-events.ts";
import { addQuest, questAdded } from "./quests.ts";

const CRYSTALS = ["CRYSTAL_BURST_1", "CRYSTAL_BURST_2", "CRYSTAL_HEAVY_1", "CRYSTAL_HEAVY_2"];

function gun(defId: string): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null };
}

function fit(seed: number, defId: string): Game {
  const g = createGame(seed);
  g.player.weapons = [gun(defId)];
  g.missiles = 0;
  return g;
}

function warCampOffers(defId: string): boolean {
  const g = fit(6, defId);
  assert.equal(addQuest(g, "mantis-war-camp"), questAdded());
  const beacon = g.beacons.find((b) => b.quest === "mantis-war-camp");
  assert.ok(beacon);
  const from = g.beacons.find((b) => b.id === g.here)!;
  if (!from.links.includes(beacon.id)) from.links.push(beacon.id);
  g.fuel = Math.max(g.fuel, 3);
  g.fleet = 0;
  g.phase = "map";
  g.event = null;
  g.flee = 1;
  commitJump(g, beacon.id);
  return g.event?.choices.some((c) => c.id === "q:war-camp:missile") ?? false;
}

function miningOffers(defId: string): boolean {
  const g = fit(3, defId);
  const beacon: Beacon = {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Asteroid mining colony",
    tier: "",
    flag: "filler:asteroid-mining-colony",
    asteroid: false,
  };
  const ev = fillerEvent(g, beacon);
  return ev?.choices.some((c) => c.id === "c:asteroid-mining-colony:0") ?? false;
}

/** True when the rock-mine missile choice actually detonates. */
function mineDetonates(defId: string): boolean {
  const g = fit(2, defId);
  const beacon = g.beacons.find(
    (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss",
  );
  assert.ok(beacon);
  beacon.flag = "ROCK_STARSHIP_MINE";
  beacon.name = "Rock live mine";
  g.here = beacon.id;
  g.event = citedEvent(g, beacon);
  g.phase = "event";
  const before = g.player.hull;
  choose(g, "c:rock-live-mine:0");
  const locked = choiceDisabled(g, "s:rock-mine:missile");
  choose(g, "s:rock-mine:missile");
  const blew = (g.event?.body ?? "").includes(eventText("event_ROCK_STARSHIP_MINE_c1_c2_text"));
  if (blew) {
    assert.equal(locked, null, defId);
    assert.equal(g.player.hull, before - 4);
  } else {
    assert.equal(locked, "Needs a missile weapon", defId);
    assert.equal(g.player.hull, before);
    assert.ok((g.event?.body ?? "").includes(eventText("event_ROCK_STARSHIP_MINE_c1_text")));
  }
  return blew;
}

describe("an ammo-less crystal gun is not a Missile Weapon", () => {
  it("does not open the war-camp bombard, the mining launch, or the rock-mine detonation, and a Leto still does", () => {
    for (const id of CRYSTALS) {
      assert.equal(warCampOffers(id), false, id);
      assert.equal(miningOffers(id), false, id);
      assert.equal(mineDetonates(id), false, id);
    }
    assert.equal(warCampOffers("MISSILES_1"), true);
    assert.equal(choiceDisabled(fit(6, "MISSILES_1"), "q:war-camp:missile"), "Need 1 missiles");
    assert.equal(miningOffers("MISSILES_1"), true);
    assert.equal(mineDetonates("MISSILES_1"), true);
  });
});
