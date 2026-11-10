import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "ROCK_LOOTING";
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
    // Wiki citations:
    // > "Strip the ship." — [[Disabled Rock ship]]
    // > "A Rock patrol ship jumps in while you are salvaging the ship. They message you, \"Filthy pirates! Prepare to die!\" You doubt explaining your mission will convince them of your need." — [[Disabled Rock ship]]
    // > "You salvage what you can from the ship. No one bothers you during the operation." — [[Disabled Rock ship]]
    // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
    // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
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
      const fighting =
        g.enemy != null && g.event?.choices.some((c) => c.id === "ship-resume") === true;
      if (fighting) {
        patrol = true;
        assert.match(g.event?.body ?? "", /Filthy pirates/);
        assert.equal(
          g.log.some((line) => line.includes("Filthy pirates")),
          false,
        );
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemy?.faction, "rock");
        assert.equal(g.enemy?.pirate, false);
        assert.ok(g.scrap - 10 >= 7 && g.scrap - 10 <= 23);
        assert.equal(raised(g, fuel, missiles, parts), 2);
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
    // Wiki citations:
    // > "Leave it alone." — [[Disabled Rock ship]]
    // > "2× The Rock people are not known for setting traps but you hasten to leave anyway." — [[Disabled Rock ship]]
    // > "Nothing happens." — [[Disabled Rock ship]]
    // > "Before you have a chance to leave, a Rock patrol ship arrives and you intercept their comm chatter, \"...appears we've finally found them. Their killing spree ends now!\" Before you can plead your innocence they move in to attack." — [[Disabled Rock ship]]
    // > "Fight a Rock Ship (default rewards)." — [[Disabled Rock ship]]
    let nothing = 0;
    let fight = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      open(g);
      fillerChoose(g, "c:disabled-rock-ship:1");
      const fighting =
        g.enemy != null && g.event?.choices.some((c) => c.id === "ship-resume") === true;
      if (fighting) {
        fight += 1;
        assert.match(g.event?.body ?? "", /killing spree/);
        assert.equal(
          g.log.some((line) => line.includes("killing spree")),
          false,
        );
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.scrap, 10);
        assert.equal(g.enemy?.faction, "rock");
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
    // Wiki citations:
    // > "(Slug Crew) Check for lifeforms and keep a lookout for ships while looting the wreck." — [[Disabled Rock ship]]
    // > "You salvage what you can from the ship. No lifeforms or ships are detected nearby." — [[Disabled Rock ship]]
    // > "You begin the salvage operation but before long your crew warns you of an approaching ship. You hasten to leave before they get within firing range." — [[Disabled Rock ship]]
    // > "You receive a random amount of scrap with resources." — [[Disabled Rock ship]]
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
