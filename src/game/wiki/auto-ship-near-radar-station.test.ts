import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-near-radar-station";
  b.name = "Auto-ship near radar station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.player.parts = 3;
  g.fleet = 5;
  assert.equal(g.event?.title, "Auto-ship near radar station");
}

function swarm(target: string | null): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target, on: true, aux: 0 };
}

function spike(level: number): Kit {
  return { id: "spike", level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

describe("Auto-ship near radar station", () => {
  it("approaching starts an Auto-ship fight, and waiting does nothing", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:auto-ship-near-radar-station:2"), true);
    choose(g, "c:auto-ship-near-radar-station:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "auto-ship-near-radar-station");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.parts, 3);
    assert.equal(g.fleet, 5);

    const wait = createGame(1);
    open(wait);
    choose(wait, "c:auto-ship-near-radar-station:1");
    assert.equal(wait.phase, "map");
    assert.equal(wait.scrap, 10);
    assert.equal(wait.player.parts, 3);
    assert.equal(wait.fleet, 5);
  });

  it("a destroyed ship pays medium scrap only, then the station", () => {
    const g = createGame(1);
    open(g);
    const guns = g.player.weapons.length;
    assert.equal(pageWin(g, "auto-ship-near-radar-station", false), true);
    const body = g.event?.body ?? "";
    assert.match(body, /salvage what you can/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.player.parts, 3);
    for (const id of ["q:auto-radar:hack", "q:auto-radar:leave", "q:auto-radar:drone"]) {
      assert.equal(g.event?.choices.some((c) => c.id === id), true);
    }

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-near-radar-station", true), false);
    assert.equal(killed.scrap, 10);
  });

  it("a combat drone spends one part, and the station is twice as likely as the fight", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-radar-station:2"), "Needs a Combat Drone");
    bare.player.kits.swarm = swarm("ward");
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-radar-station:2"), "Needs a Combat Drone");
    for (const kind of ["striker", "combat2", "beam", "beam2"]) {
      bare.player.kits.swarm = swarm(kind);
      assert.equal(choiceDisabled(bare, "c:auto-ship-near-radar-station:2"), null);
    }
    bare.player.kits.swarm = swarm("striker");
    bare.player.parts = 0;
    assert.equal(choiceDisabled(bare, "c:auto-ship-near-radar-station:2"), "Need 1 drone part");
    choose(bare, "c:auto-ship-near-radar-station:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.player.parts, 0);

    let fight = 0;
    let station = 0;
    const leads = new Set<string>();
    for (let seed = 1; seed <= 90; seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.swarm = swarm("striker");
      const target = g.player.kits.swarm.target;
      choose(g, "c:auto-ship-near-radar-station:2");
      assert.equal(g.player.parts, 2);
      assert.equal(g.player.kits.swarm?.target, target);
      assert.equal(g.scrap, 10);
      if (g.phase === "combat") {
        fight += 1;
        assert.equal(g.fightEvent, "auto-ship-near-radar-station");
        assert.equal(g.fleet, 5);
      } else {
        station += 1;
        const body = g.event?.body ?? "";
        if (body.includes("luring it away")) leads.add("lure");
        if (body.includes("repeatedly fires")) leads.add("fire");
        assert.match(body, /luring it away|repeatedly fires/);
      }
    }
    assert.ok(fight > 0 && station > fight, `${station} station, ${fight} fight`);
    assert.equal(leads.size, 2);
  });

  it("hacking the station by hand delays the fleet, doubles pursuit, or pays nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 4; seed++) {
      const g = createGame(seed);
      open(g);
      const seenMap = g.beacons.map((b) => b.visited);
      choose(g, "q:auto-radar:hack");
      const body = g.event?.body ?? "";
      assert.equal(g.scrap, 10);
      assert.equal(g.player.parts, 3);
      assert.deepEqual(g.beacons.map((b) => b.visited), seenMap);
      if (body.includes("delayed for 1 turn")) {
        seen.add("delay");
        assert.equal(g.fleet, 4);
        assert.equal(g.pursuitDouble, undefined);
      } else if (body.includes("map is updated")) {
        seen.add("map");
        assert.equal(g.fleet, 5);
        assert.equal(g.pursuitDouble, undefined);
      } else if (body.includes("pursuit is doubled")) {
        seen.add("pursuit");
        assert.equal(g.fleet, 5);
        assert.equal(g.pursuitDouble, true);
      } else if (body.includes("Nothing happens")) {
        seen.add("nothing");
        assert.equal(g.fleet, 5);
        assert.equal(g.pursuitDouble, undefined);
      } else {
        assert.fail(body);
      }
    }
    assert.deepEqual([...seen].sort(), ["delay", "map", "nothing", "pursuit"]);

    const leave = createGame(3);
    open(leave);
    choose(leave, "q:auto-radar:leave");
    assert.match(leave.event?.body ?? "", /Nothing happens/);
    assert.equal(leave.fleet, 5);
    assert.equal(leave.scrap, 10);
    assert.equal(leave.pursuitDouble, undefined);
  });

  it("a hacking drone spends one part and delays the fleet one turn", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "q:auto-radar:drone"), "Needs a Hacking system");
    bare.player.kits.spike = spike(1);
    bare.player.parts = 0;
    assert.equal(choiceDisabled(bare, "q:auto-radar:drone"), "Need 1 drone part");
    choose(bare, "q:auto-radar:drone");
    assert.equal(bare.player.parts, 0);
    assert.equal(bare.fleet, 5);

    const g = createGame(1);
    open(g);
    g.player.kits.spike = spike(1);
    assert.equal(choiceDisabled(g, "q:auto-radar:drone"), null);
    const seenMap = g.beacons.map((b) => b.visited);
    choose(g, "q:auto-radar:drone");
    assert.equal(g.player.parts, 2);
    assert.equal(g.fleet, 4);
    assert.match(g.event?.body ?? "", /download data about the surrounding beacons/);
    assert.match(g.event?.body ?? "", /delayed for 1 turn/);
    assert.equal(g.scrap, 10);
    assert.deepEqual(g.beacons.map((b) => b.visited), seenMap);
  });
});
