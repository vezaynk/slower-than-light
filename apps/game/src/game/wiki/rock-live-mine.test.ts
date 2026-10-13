import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit, WeaponInst } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-live-mine";
  b.name = "Rock live mine";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock live mine");
}

function gun(defId: string): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null };
}

function beam(): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: "beam", on: false, aux: 0 };
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function damage(g: Game): number {
  return Object.values(g.player.systems).reduce((n, sys) => n + (sys?.damage ?? 0), 0);
}

function breaches(g: Game): number {
  return g.player.rooms.reduce((n, r) => n + r.breach, 0);
}

describe("Rock live mine", () => {
  it("always bites down, then defusing pays medium scrap or opens the wires", () => {
    let paid = false;
    let wires = false;
    for (let seed = 1; seed <= 40 && (!paid || !wires); seed++) {
      const g = createGame(seed);
      open(g);
      const hull = g.player.hull;
      const crew = g.crew.length;
      choose(g, "c:rock-live-mine:0");
      assert.match(g.event?.body ?? "", /bites down/);
      choose(g, "s:rock-mine:defuse");
      const body = g.event?.body ?? "";
      if (/good scrap pickings/.test(body)) {
        paid = true;
        const got = scraps(body);
        assert.equal(got.length, 1, body);
        assert.ok(got[0]! >= 12 && got[0]! <= 19, body);
        assert.equal(g.scrap, 10 + got[0]!);
        assert.equal(g.player.hull, hull);
        assert.equal(g.crew.length, crew);
      } else {
        wires = true;
        assert.match(body, /red wire or the blue/);
        assert.deepEqual(g.event?.choices.map((c) => c.id), ["s:rock-mine:red", "s:rock-mine:blue"]);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(paid, true);
    assert.equal(wires, true);
  });

  it("cutting either wire pays medium scrap, or deals 6 hull, a breach, and loses a crewmember", () => {
    let safe = false;
    let boom = false;
    let revived = false;
    for (let seed = 1; seed <= 60 && (!safe || !boom || !revived); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:rock-live-mine:0");
      choose(g, "s:rock-mine:defuse");
      if (!g.event?.choices.some((c) => c.id === "s:rock-mine:red")) continue;
      const hull = g.player.hull;
      const crew = g.crew.length;
      const holes = breaches(g);
      if (seed % 2 === 0) g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      choose(g, seed % 3 === 0 ? "s:rock-mine:blue" : "s:rock-mine:red");
      const body = g.event?.body ?? "";
      if (/You did it/.test(body)) {
        safe = true;
        const got = scraps(body);
        assert.equal(got.length, 1, body);
        assert.ok(got[0]! >= 12 && got[0]! <= 19, body);
        assert.equal(g.player.hull, hull);
        assert.equal(g.crew.length, crew);
      } else {
        boom = true;
        assert.match(body, /weapon detonates/);
        assert.match(body, /Hull damage: 6/);
        assert.match(body, /breach opens/);
        assert.equal(g.player.hull, hull - 6);
        assert.equal(breaches(g), holes + 1);
        assert.equal(g.scrap, 10);
        if (g.player.kits.cradle) {
          revived = true;
          assert.match(body, /revived/);
          assert.equal(g.crew.length, crew);
        } else {
          assert.match(body, /is lost/);
          assert.equal(g.crew.length, crew - 1);
        }
      }
    }
    assert.equal(safe, true);
    assert.equal(boom, true);
    assert.equal(revived, true);
  });

  it("a missile weapon deals 4 hull and 1 system damage for low scrap and spends no missile", () => {
    const bare = createGame(1);
    open(bare);
    bare.player.weapons = [gun("hullmissile")];
    choose(bare, "c:rock-live-mine:0");
    assert.equal(choiceDisabled(bare, "s:rock-mine:missile"), "Needs a missile weapon");
    const hull = bare.player.hull;
    choose(bare, "s:rock-mine:missile");
    assert.equal(bare.player.hull, hull);
    assert.match(bare.event?.body ?? "", /bites down/);

    const g = createGame(2);
    open(g);
    g.player.weapons = [gun("artemis")];
    g.missiles = 3;
    const before = g.player.hull;
    const broken = damage(g);
    choose(g, "c:rock-live-mine:0");
    assert.equal(choiceDisabled(g, "s:rock-mine:missile"), null);
    choose(g, "s:rock-mine:missile");
    const body = g.event?.body ?? "";
    assert.match(body, /modified warhead/);
    const got = scraps(body);
    assert.equal(got.length, 1, body);
    assert.ok(got[0]! >= 7 && got[0]! <= 10, body);
    assert.equal(g.scrap, 10 + got[0]!);
    assert.equal(g.player.hull, before - 4);
    assert.equal(damage(g), broken + 1);
    assert.equal(g.missiles, 3);
  });

  it("a Beam Drone spends one drone part for low scrap", () => {
    const bare = createGame(1);
    open(bare);
    choose(bare, "c:rock-live-mine:0");
    assert.equal(choiceDisabled(bare, "s:rock-mine:beam"), "Needs a Beam Drone");

    const broke = createGame(2);
    open(broke);
    broke.player.kits.swarm = beam();
    broke.player.parts = 0;
    choose(broke, "c:rock-live-mine:0");
    assert.equal(choiceDisabled(broke, "s:rock-mine:beam"), "Need 1 drone part");
    choose(broke, "s:rock-mine:beam");
    assert.match(broke.event?.body ?? "", /bites down/);
    assert.equal(broke.player.parts, 0);

    const g = createGame(3);
    open(g);
    g.player.kits.swarm = beam();
    g.player.parts = 2;
    const hull = g.player.hull;
    choose(g, "c:rock-live-mine:0");
    assert.equal(choiceDisabled(g, "s:rock-mine:beam"), null);
    choose(g, "s:rock-mine:beam");
    const body = g.event?.body ?? "";
    assert.match(body, /grappling arms/);
    assert.match(body, /Drone parts: -1/);
    const got = scraps(body);
    assert.equal(got.length, 1, body);
    assert.ok(got[0]! >= 7 && got[0]! <= 10, body);
    assert.equal(g.player.parts, 1);
    assert.equal(g.player.hull, hull);
  });

  it("level 5 engines outrun the mine and spend nothing", () => {
    const low = createGame(1);
    open(low);
    assert.equal(choiceDisabled(low, "c:rock-live-mine:1"), "Needs Engines level 5");
    choose(low, "c:rock-live-mine:1");
    assert.equal(low.scrap, 10);
    assert.match(low.event?.body ?? "", /live mine/);

    const g = createGame(2);
    open(g);
    g.player.systems.engines.level = 5;
    assert.equal(choiceDisabled(g, "c:rock-live-mine:1"), null);
    choose(g, "c:rock-live-mine:1");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, createGame(2).player.hull);
  });
});
