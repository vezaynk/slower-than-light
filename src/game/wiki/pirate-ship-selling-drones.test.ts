import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-selling-drones";
  b.name = "Pirate ship selling drones";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship selling drones");
}

function labels(g: Game): string[] {
  return (g.event?.choices ?? []).map((c) => c.label);
}

function marks(g: Game): { fire: number; breach: number } {
  return g.player.rooms.reduce(
    (a, r) => ({ fire: a.fire + r.fire, breach: a.breach + r.breach }),
    { fire: 0, breach: 0 },
  );
}

describe("Pirate ship selling drones", () => {
  it("hails into a dock that sells five drone parts for 25 scrap and does not sell a schematic", () => {
    const g = createGame(1);
    open(g);
    assert.deepEqual(labels(g), [
      "Hail the ship.",
      "Attack him before he can attack!",
      "Quickly prepare to jump away.",
    ]);
    assert.equal(labels(g).some((l) => /schematic/i.test(l)), false);
    choose(g, "q:pirate-drones:hail");
    assert.match(g.event?.body ?? "", /extensive stock/);
    assert.equal(choiceDisabled(g, "q:pirate-drones:slug"), "Needs a Slug crewmember");
    assert.equal(choiceDisabled(g, "q:pirate-drones:hack"), "Needs a Hacking system");
    choose(g, "q:pirate-drones:dock");
    assert.match(g.event?.body ?? "", /exquisite suit/);
    assert.equal(labels(g).some((l) => /schematic/i.test(l)), false);
    assert.equal(choiceDisabled(g, "c:pirate-ship-selling-drones:0"), "Need 25 scrap");
    assert.equal(choiceDisabled(g, "q:pirate-drones:upgrade"), "Needs Drone Control");
    g.scrap = 25;
    assert.equal(choiceDisabled(g, "c:pirate-ship-selling-drones:0"), null);
    const parts = g.player.parts;
    choose(g, "c:pirate-ship-selling-drones:0");
    assert.equal(g.scrap, 0);
    assert.equal(g.player.parts, parts + 5);
    assert.notEqual(g.phase, "combat");
  });

  it("attack, leaving the dock, and buying nothing each fight a pirate, and jumping does nothing", () => {
    const attack = createGame(2);
    open(attack);
    choose(attack, "c:pirate-ship-selling-drones:1");
    assert.equal(attack.phase, "combat");
    assert.equal(attack.enemy?.pirate, true);
    assert.equal(attack.fightEvent, "pirate-ship-selling-drones");
    assert.equal(pageWin(attack, "pirate-ship-selling-drones", false), false);

    const away = createGame(3);
    open(away);
    const scrap = away.scrap;
    const hull = away.player.hull;
    choose(away, "c:pirate-ship-selling-drones:2");
    assert.notEqual(away.phase, "combat");
    assert.equal(away.scrap, scrap);
    assert.equal(away.player.hull, hull);

    const leave = createGame(4);
    open(leave);
    choose(leave, "q:pirate-drones:hail");
    choose(leave, "q:pirate-drones:leave");
    assert.equal(leave.phase, "combat");
    assert.equal(leave.enemy?.pirate, true);
    assert.equal(leave.fightEvent, "pirate-ship-selling-drones");

    let fired = 0;
    let breached = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const g = createGame(seed);
      open(g);
      const hull0 = g.player.hull;
      const engines = g.player.systems.engines?.damage ?? 0;
      choose(g, "q:pirate-drones:hail");
      choose(g, "q:pirate-drones:dock");
      choose(g, "q:pirate-drones:nothing");
      assert.equal(g.phase, "combat");
      assert.equal(g.fightEvent, "pirate-ship-selling-drones");
      assert.equal(g.player.hull, hull0 - 3);
      assert.ok((g.player.systems.engines?.damage ?? 0) >= engines + 1);
      const m = marks(g);
      if (m.fire > 0) fired += 1;
      if (m.breach > 0) breached += 1;
    }
    assert.ok(fired > 0);
    assert.ok(breached > 0);
  });

  it("a slug docks like the hail, hacking pays low scrap, and an installed Drone Control takes one printed band", () => {
    const slug = createGame(5);
    open(slug);
    choose(slug, "q:pirate-drones:hail");
    joinCrew(slug, "Slug");
    const dead = slug.crew.filter((c) => c.kin === "gel").at(-1);
    assert.ok(dead);
    dead.hp = 0;
    assert.equal(choiceDisabled(slug, "q:pirate-drones:slug"), "Needs a Slug crewmember");
    dead.hp = dead.maxHp;
    assert.equal(choiceDisabled(slug, "q:pirate-drones:slug"), null);
    choose(slug, "q:pirate-drones:slug");
    assert.match(slug.event?.body ?? "", /exquisite suit/);

    const hack = createGame(6);
    open(hack);
    hack.player.kits.spike = { id: "spike", level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
    const fuel = hack.fuel;
    const missiles = hack.missiles;
    const parts = hack.player.parts;
    choose(hack, "q:pirate-drones:hail");
    assert.equal(choiceDisabled(hack, "q:pirate-drones:hack"), null);
    choose(hack, "q:pirate-drones:hack");
    assert.notEqual(hack.phase, "combat");
    assert.ok(hack.scrap >= 17 && hack.scrap <= 20);
    assert.equal(hack.fuel, fuel);
    assert.equal(hack.missiles, missiles);
    assert.equal(hack.player.parts, parts);

    const broke = createGame(7);
    open(broke);
    broke.player.kits.swarm = { id: "swarm", level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
    broke.scrap = 10;
    choose(broke, "q:pirate-drones:hail");
    choose(broke, "q:pirate-drones:dock");
    assert.equal(choiceDisabled(broke, "q:pirate-drones:upgrade"), null);
    choose(broke, "q:pirate-drones:upgrade");
    assert.equal(broke.player.kits.swarm?.level, 1);
    assert.equal(broke.scrap, 10);

    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.swarm = { id: "swarm", level: 1, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
      g.scrap = 200;
      choose(g, "q:pirate-drones:hail");
      choose(g, "q:pirate-drones:dock");
      choose(g, "q:pirate-drones:upgrade");
      const level = g.player.kits.swarm?.level ?? 0;
      const cost = 200 - g.scrap;
      if (level >= 2 && level <= 3) {
        assert.ok(cost >= 15 && cost <= 20);
        seen.add("low");
      } else if (level >= 4 && level <= 5) {
        assert.ok(cost >= 25 && cost <= 33);
        seen.add("mid");
      } else if (level >= 6 && level <= 7) {
        assert.ok(cost >= 50 && cost <= 65);
        seen.add("high");
      } else {
        assert.fail(`level ${level}`);
      }
      assert.equal(g.phase, "event");
      assert.match(g.event?.body ?? "", new RegExp(`level ${level}`));
    }
    assert.equal(seen.size, 3);
  });
});
