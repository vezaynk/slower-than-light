import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fugitive";
  b.name = "Mantis fugitive";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis fugitive");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

function systemDamage(g: Game): number {
  return Object.values(g.player.systems).reduce((n, sys) => n + (sys?.damage ?? 0), 0);
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

describe("Mantis fugitive", () => {
  it("siding with him is a trap or a thanks, and the unnamed Mantis does not join", () => {
    let trap = false;
    let thanks = false;
    for (let seed = 1; seed <= 40 && (!trap || !thanks); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const crew = players(g).length;
      open(g);
      fillerChoose(g, "c:mantis-fugitive:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "engi");
      assert.equal(g.enemy?.pirate, false);
      assert.equal(g.scrap, 10);
      assert.equal(players(g).length, crew);
      const aboard = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
      assert.ok(aboard.length > 0);
      if (g.player.hull === hull - 5) {
        trap = true;
        assert.ok(systemDamage(g) >= 1);
        assert.ok(aboard.every((c) => c.kin === "blade"));
        assert.ok(g.log.some((line) => line.includes("sabotages your ship")));
      } else {
        thanks = true;
        assert.equal(g.player.hull, hull);
        assert.equal(systemDamage(g), 0);
        assert.ok(aboard.some((c) => c.kin === "shell"));
        assert.ok(g.log.some((line) => line.includes("expresses his thanks")));
      }
    }
    assert.equal(trap && thanks, true);
  });

  it("the bounty pays high scrap, or that scrap with hull and fire, or one Mantis boarder", () => {
    let scrap = false;
    let fire = false;
    let trap = false;
    for (let seed = 1; seed <= 60 && (!scrap || !fire || !trap); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const crew = players(g).length;
      open(g);
      fillerChoose(g, "c:mantis-fugitive:1");
      if (g.phase === "combat") {
        trap = true;
        assert.equal(g.enemy?.faction, "engi");
        assert.equal(g.scrap, 10);
        assert.equal(g.player.hull, hull);
        assert.equal(players(g).length, crew);
        const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
        assert.equal(boarders.length, 1);
        assert.equal(boarders[0]?.kin, "blade");
        const aboard = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
        assert.ok(aboard.every((c) => c.kin === "blade"));
      } else {
        const body = g.event?.body ?? "";
        const got = reward(body);
        assert.ok(got.scrap >= 19 && got.scrap <= 23, body);
        assert.equal(got.fuel, 0);
        assert.equal(got.missiles, 0);
        assert.equal(got.parts, 0);
        assert.equal(players(g).length, crew);
        if (/delighted/.test(body)) {
          scrap = true;
          assert.equal(g.player.hull, hull);
          assert.equal(g.player.rooms.some((r) => r.fire > 0), false);
        } else {
          fire = true;
          assert.match(body, /Fury sparks/);
          assert.equal(g.player.hull, hull - 5);
          const flames = g.player.rooms.reduce((n, r) => n + r.fire, 0);
          assert.ok(flames === 1 || flames === 2, String(flames));
        }
      }
    }
    assert.equal(scrap && fire && trap, true);
  });
});
