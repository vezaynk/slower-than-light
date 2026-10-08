import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-transport-ship";
  b.name = "Rebel transport ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel transport ship");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

describe("Rebel transport ship", () => {
  it("demanding the cargo starts a Rebel ship that is already running and does not surrender", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rebel-transport-ship:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "rebel-transport-ship");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemyEscape?.mode, "start");
    assert.equal(g.enemyEscape?.seconds, 40);
    assert.equal(g.enemyEscape?.running, true);
    assert.equal(g.enemyEscape?.pursuit, false);
    assert.equal(g.enemySurrender?.chance, 0);
    assert.equal(g.scrap, 10);
  });

  it("avoiding the ship does nothing", () => {
    const g = createGame(2);
    open(g);
    const fuel = g.fuel;
    choose(g, "c:rebel-transport-ship:1");
    assert.equal(
      g.event?.body,
      "They stay outside your weapons range, and eventually jump away.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.enemy, null);
  });

  it("a destroyed ship or a crew kill pays the shared cargo list and grants no unnamed item", () => {
    const hull = new Set<string>();
    const crew = new Set<string>();
    let hullOnly = false;
    let crewOnly = false;
    for (let seed = 1; seed <= 40; seed++) {
      for (const dead of [false, true]) {
        const g = createGame(seed + (dead ? 100 : 0));
        open(g);
        const guns = g.player.weapons.length;
        const people = g.crew.length;
        assert.equal(pageWin(g, "rebel-transport-ship", dead), true);
        const body = g.event?.body ?? "";
        const text = body.split("\n\n")[0] ?? "";
        (dead ? crew : hull).add(text);
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.equal(g.scrap, 10 + paid[0]!);
        assert.equal(g.player.weapons.length, guns);
        assert.equal(g.crew.length, people);
        const resources = ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
        if (resources === 0) {
          if (dead) crewOnly = true;
          else hullOnly = true;
        }
      }
    }
    assert.ok(hull.size >= 4);
    assert.ok(crew.size >= 2);
    assert.equal(hullOnly && crewOnly, true);
  });
});
