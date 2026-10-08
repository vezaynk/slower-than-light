import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ships-battle-for-rock-freighter";
  b.name = "Mantis ships battle for Rock freighter";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis ships battle for Rock freighter");
}

function drone(kind: string): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: kind, on: false, aux: 0 };
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Mantis ships battle for Rock freighter", () => {
  it("waits, then fights a weakened Mantis ship or a normal one", () => {
    let weak = false;
    let full = false;
    let dropped = false;
    for (let seed = 1; seed <= 40 && (!weak || !full || !dropped); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:mantis-ships-battle-for-rock-freighter:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.fightEvent, "mantis-ships-battle-for-rock-freighter");
      const guns = g.enemy?.systems.weapons;
      assert.ok(guns);
      const text = g.log.join(" ");
      if (/blown a fuse/.test(text)) {
        weak = true;
        assert.equal(guns.damage, Math.min(2, guns.level));
        assert.equal(guns.power, guns.level - guns.damage);
        if (guns.damage === 2) dropped = true;
      } else {
        full = true;
        assert.match(text, /one mind/);
        assert.equal(guns.damage, 0);
      }
    }
    assert.equal(weak, true);
    assert.equal(full, true);
    assert.equal(dropped, true);
  });

  it("ignoring them spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:mantis-ships-battle-for-rock-freighter:1");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.phase, "event");
  });

  it("a Repair Drone pays high scrap, and skips the part when that reward includes drone parts", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:mantis-ships-battle-for-rock-freighter:2"), "Needs a Repair Drone");
    choose(bare, "c:mantis-ships-battle-for-rock-freighter:2");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.phase, "event");

    let charged = false;
    let waived = false;
    for (let seed = 1; seed <= 40 && (!charged || !waived); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.swarm = drone("patch");
      g.player.parts = 4;
      const guns = g.player.weapons.length;
      assert.equal(choiceDisabled(g, "c:mantis-ships-battle-for-rock-freighter:2"), null);
      choose(g, "c:mantis-ships-battle-for-rock-freighter:2");
      const body = g.event?.body ?? "";
      assert.match(body, /kamikaze/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.player.weapons.length, guns);
      if (/Drone parts: -1/.test(body)) {
        charged = true;
        assert.equal(g.player.parts, 3);
      } else {
        waived = true;
        assert.match(body, /Drone parts: \d+/);
        assert.ok(g.player.parts > 4);
      }
    }
    assert.equal(charged, true);
    assert.equal(waived, true);
  });

  it("a Hull Repair Drone spends one drone part and fights a Mantis ship", () => {
    const bare = createGame(1);
    open(bare);
    const parts = bare.player.parts;
    assert.equal(choiceDisabled(bare, "c:mantis-ships-battle-for-rock-freighter:3"), "Needs a Hull Repair Drone");
    choose(bare, "c:mantis-ships-battle-for-rock-freighter:3");
    assert.equal(bare.phase, "event");
    assert.equal(bare.player.parts, parts);

    const broke = createGame(2);
    open(broke);
    broke.player.kits.swarm = drone("hull");
    broke.player.parts = 0;
    assert.equal(choiceDisabled(broke, "c:mantis-ships-battle-for-rock-freighter:3"), "Need 1 drone part");
    choose(broke, "c:mantis-ships-battle-for-rock-freighter:3");
    assert.equal(broke.phase, "event");
    assert.equal(broke.player.parts, 0);

    const g = createGame(3);
    open(g);
    g.player.kits.swarm = drone("hull");
    g.player.parts = 2;
    assert.equal(choiceDisabled(g, "c:mantis-ships-battle-for-rock-freighter:3"), null);
    choose(g, "c:mantis-ships-battle-for-rock-freighter:3");
    assert.equal(g.phase, "combat");
    assert.equal(g.player.parts, 1);
    assert.equal(g.fightEvent, "mantis-ships-battle-for-rock-freighter");
    assert.equal(g.enemy?.systems.weapons.damage, 0);
    assert.match(g.log.join(" "), /second Mantis/);
  });

  it("winning either ending pays medium scrap", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "mantis-ships-battle-for-rock-freighter", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, /pick the bones of both Mantis vessels/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
    }
  });
});
