import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { deriveUnlocks } from "../unlocks.ts";
import { noteAchieve } from "./achieve-notes.ts";
import { earnedNow } from "./achievement-track.ts";
import { aeEventTitle } from "./ae-events.ts";
import { stampCitedEvents } from "./cited-events.ts";

function quietMap(seed = 1, hullId?: string) {
  const g = createGame(seed, hullId);
  g.phase = "map";
  return g;
}

describe("achievement counters", () => {
  it("a shot, an upgrade, and a boarding drone end the quiet sector-5 lines", () => {
    const shot = quietMap();
    shot.sector = 5;
    assert.equal(earnedNow(shot).includes("coming-in-for-my-pacifism-run"), true);
    noteAchieve(shot, { k: "shot", from: "player", kind: "laser", defId: "burst2", rooms: ["a"] });
    assert.equal(earnedNow(shot).includes("coming-in-for-my-pacifism-run"), false);

    const raised = quietMap();
    raised.sector = 5;
    noteAchieve(raised, { k: "upgrade" });
    assert.equal(earnedNow(raised).includes("i-dont-need-no-stinkin-upgrades"), false);

    const drone = quietMap();
    drone.sector = 5;
    noteAchieve(drone, { k: "drone", kind: "striker", functioning: 1 });
    assert.equal(earnedNow(drone).includes("coming-in-for-my-pacifism-run"), false);
    assert.equal(drone.tally?.droneHurt, undefined);
  });

  it("five failed evades with full engines latch, and a miss resets the streak", () => {
    const g = quietMap();
    const engines = g.player.systems.engines;
    engines.level = 8;
    engines.power = 8;
    engines.damage = 0;
    engines.ion = [];
    noteAchieve(g, { k: "fight" });
    for (let i = 0; i < 5; i++) noteAchieve(g, { k: "evade", missed: false });
    assert.equal(earnedNow(g).includes("astronomically-low-odds"), true);
    noteAchieve(g, { k: "evade", missed: true, damage: 1 });
    assert.equal(g.tally?.evadeStreak, 0);
    assert.equal(earnedNow(g).includes("astronomically-low-odds"), true);
  });

  it("a miss during a cloak counts that shot's damage as avoided", () => {
    const g = quietMap(1, "stealth-a");
    g.player.kits.veil = { id: "veil", level: 1, power: 1, left: 5, cool: 0, target: null, on: true, aux: 0 };
    noteAchieve(g, { k: "cloak" });
    noteAchieve(g, { k: "evade", missed: true, damage: 9 });
    assert.equal(earnedNow(g).includes("phase-shift"), true);
  });

  it("repair from 1 hull to full latches Tough Little Ship on the Kestrel", () => {
    const g = quietMap(1, "kestrel-a");
    noteAchieve(g, { k: "hull", before: 1, after: g.player.hullMax });
    assert.equal(earnedNow(g).includes("tough-little-ship"), true);
  });

  it("a fire in every enemy room latches the burn line", () => {
    const g = quietMap();
    startCombat(g, "scout");
    assert.ok(g.enemy);
    for (const room of g.enemy.rooms) room.fire = 1;
    noteAchieve(g, { k: "tick" });
    assert.equal(earnedNow(g).includes("some-people-just-like-to-watch-ships-burn"), true);
  });

  it("sector 8 with no jump does not earn loss of cabin pressure", () => {
    const g = quietMap(1, "lanius-a");
    g.sector = 8;
    g.jumps = 0;
    noteAchieve(g, { k: "tick" });
    assert.equal(earnedNow(g).includes("loss-of-cabin-pressure"), false);
  });
});

describe("Advanced Edition event gate", () => {
  it("names the tagged pages and skips them when the run is off", () => {
    assert.equal(aeEventTitle("Lanius trader"), true);
    assert.equal(aeEventTitle("Free scrap with resources (Lanius)"), true);
    assert.equal(aeEventTitle("Zoltan odd moon"), false);

    const off = quietMap();
    off.ae = false;
    off.sectorName = "Abandoned Sector";
    for (const beacon of off.beacons) {
      if (beacon.kind === "start" || beacon.kind === "exit" || beacon.kind === "boss") continue;
      beacon.flag = "";
      beacon.name = "open";
    }
    stampCitedEvents(off);
    assert.equal(off.beacons.some((beacon) => aeEventTitle(beacon.name)), false);

    const on = quietMap(2);
    delete on.ae;
    on.sectorName = "Abandoned Sector";
    for (const beacon of on.beacons) {
      if (beacon.kind === "start" || beacon.kind === "exit" || beacon.kind === "boss") continue;
      beacon.flag = "";
      beacon.name = "open";
    }
    stampCitedEvents(on);
    assert.equal(on.beacons.some((beacon) => aeEventTitle(beacon.name)), true);
  });

  it("layout C stays locked when Advanced Edition content is off", () => {
    const g = quietMap(1, "kestrel-b");
    g.sector = 8;
    g.ae = false;
    const locked = deriveUnlocks({ ships: ["kestrel-a"], wins: [] }, g, []);
    assert.equal(locked.ships.includes("kestrel-c"), false);
    delete g.ae;
    const open = deriveUnlocks({ ships: ["kestrel-a"], wins: [] }, g, []);
    assert.equal(open.ships.includes("kestrel-c"), true);
  });
});
