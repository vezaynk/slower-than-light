import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:disabled-rock-ship";
  b.name = "Disabled Rock ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Disabled Rock ship");
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function raised(g: Game, fuel: number, missiles: number, parts: number): number {
  return [g.fuel - fuel, g.missiles - missiles, g.player.parts - parts].filter((n) => n > 0).length;
}

describe("Disabled Rock ship", () => {
  it("stripping pays random scrap, and a patrol may arrive after that scrap", () => {
    let quiet = false;
    let patrol = false;
    for (let seed = 1; seed <= 40 && (!quiet || !patrol); seed++) {
      const g = createGame(seed);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:disabled-rock-ship:0");
      if (g.phase === "combat") {
        patrol = true;
        assert.equal(g.enemy?.faction, "rock");
        assert.equal(g.enemy?.pirate, false);
        assert.ok(g.scrap - 10 >= 7 && g.scrap - 10 <= 23);
        assert.equal(raised(g, fuel, missiles, parts), 2);
        assert.ok(g.log.some((line) => line.includes("Filthy pirates")));
        assert.equal(g.player.weapons.length, guns);
      } else {
        quiet = true;
        const body = g.event?.body ?? "";
        const got = reward(body);
        assert.match(body, /No one bothers you/);
        assert.ok(got.scrap >= 7 && got.scrap <= 23, body);
        assert.equal([got.fuel, got.missiles, got.parts].filter((n) => n > 0).length, 2);
        assert.equal(g.player.weapons.length, guns);
      }
    }
    assert.equal(quiet && patrol, true);
  });

  it("leaving spends nothing twice as often as it starts a Rock fight", () => {
    let nothing = 0;
    let fight = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      open(g);
      fillerChoose(g, "c:disabled-rock-ship:1");
      if (g.phase === "combat") {
        fight += 1;
        assert.equal(g.scrap, 10);
        assert.equal(g.enemy?.faction, "rock");
        assert.ok(g.log.some((line) => line.includes("killing spree")));
      } else {
        nothing += 1;
        assert.match(g.event?.body ?? "", /hasten to leave/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
      }
    }
    assert.ok(nothing > fight);
    assert.ok(fight > 0);
  });

  it("a Slug lookout pays random scrap, and the choice stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:disabled-rock-ship:2"), "Needs a Slug crewmember");
    fillerChoose(bare, "c:disabled-rock-ship:2");
    assert.match(bare.event?.body ?? "", /disabled rock transport/);
    assert.equal(bare.scrap, 10);

    let clear = false;
    let ship = false;
    for (let seed = 2; seed <= 40 && (!clear || !ship); seed++) {
      const g = createGame(seed);
      assert.equal(joinCrew(g, "Slug"), true);
      const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0).length;
      open(g);
      assert.equal(choiceDisabled(g, "c:disabled-rock-ship:2"), null);
      fillerChoose(g, "c:disabled-rock-ship:2");
      const body = g.event?.body ?? "";
      const got = reward(body);
      assert.equal(g.phase, "event");
      assert.ok(got.scrap >= 7 && got.scrap <= 23, body);
      assert.equal([got.fuel, got.missiles, got.parts].filter((n) => n > 0).length, 2);
      assert.equal(g.crew.filter((c) => c.side === "player" && c.hp > 0).length, crew);
      if (/No lifeforms/.test(body)) clear = true;
      else {
        ship = true;
        assert.match(body, /approaching ship/);
      }
    }
    assert.equal(clear && ship, true);
  });
});
