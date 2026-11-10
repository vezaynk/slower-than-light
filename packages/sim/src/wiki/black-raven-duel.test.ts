import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { choose, createGame, choiceDisabled } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";

const DUEL = "s:the-black-raven:duel";

function arrive(seed: number): Game {
  const g = createGame(seed);
  g.sectorId = "SLUG_HOME";
  g.sectorName = "Slug Home Nebula";
  const ev = allEvents().find((e) => e.dest === "The Black Raven")!;
  const b = g.beacons.find(
    (x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store",
  )!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = ev.dest;
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  choose(g, "c:the-black-raven:0");
  return g;
}

function slugsAboard(g: Game) {
  return g.crew.filter((c) => c.side === "enemy" && c.kin === "slug" && c.aboard === "player");
}

describe("The Black Raven mind duel", () => {
  it("stays closed without a living Slug, including a dead one", () => {
    // Wiki citations:
    // > "(Slugman Crew) Engage in a duel of the mind." — [[The Black Raven]]
    const g = arrive(4);
    assert.equal(choiceDisabled(g, DUEL), "Needs a Slug crewmember");
    const weapons = g.player.weapons.length;
    choose(g, DUEL);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.player.weapons.length, weapons);
    g.crew[0].kin = "slug";
    g.crew[0].hp = 0;
    assert.equal(choiceDisabled(g, DUEL), "Needs a Slug crewmember");
    choose(g, DUEL);
    assert.equal(g.phase, "event");
  });

  it("a living Slug either beams 1-2 slug boarders into the fight or pays high scrap and a random weapon", () => {
    // Wiki citations:
    // > "Your Slug crewman's eyes glaze over as the two telepaths concentrate. You can only wonder what is happening. After a short time your comrade grunts in pain and collapses onto the floor, stunned. Nights responds, \"Hah! It'll take more than that to defeat me! Let the real battle begin!\"" — [[The Black Raven]]
    // > "1-2 slug boarders beam aboard your ship and you fight the Black Raven." — [[The Black Raven]]
    // > "Your Slug crewman's eyes glaze over as the two telepaths concentrate. You are powerless to help, but after a short time your comrade shakes off the daze and appears victorious." — [[The Black Raven]]
    // > "His face contorted with pain, Nights concedes his defeat: \"If this is the caliber of subordinatesss you keep, there iss no way we can defeat you. Take thisss and let us leave in shame.\"" — [[The Black Raven]]
    // > "You receive a weapon with high scrap." — [[The Black Raven]]
    let boarded = false;
    let paid = false;
    for (let seed = 1; seed <= 80 && !(boarded && paid); seed++) {
      const g = arrive(seed);
      g.crew[0].kin = "slug";
      assert.equal(choiceDisabled(g, DUEL), null);
      const weapons = g.player.weapons.map((w) => w.defId);
      const scrap = g.scrap;
      choose(g, DUEL);
      const charging =
        g.phase === "event" && g.enemy != null && g.event?.choices[0]?.id === "ship-resume";
      if (charging) {
        boarded = true;
        const boarders = slugsAboard(g);
        assert.ok(boarders.length >= 1 && boarders.length <= 2, String(boarders.length));
        assert.ok(boarders.every((c) => c.name === "Slug" && c.hp === 100));
        assert.equal(g.enemy!.faction, "slug");
        assert.ok(g.enemy!.pirate);
        assert.equal(g.fightEvent, "the-black-raven");
        assert.match(g.event?.body ?? "", /grunts in pain and collapses onto the floor, stunned/);
        assert.equal(
          g.log.some((line) =>
            line.includes("grunts in pain and collapses onto the floor, stunned."),
          ),
          false,
        );
        assert.match(g.log.join("\n"), /slug boarders beam aboard/);
        assert.equal(g.scrap, scrap);
        assert.deepEqual(
          g.player.weapons.map((w) => w.defId),
          weapons,
        );
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
      } else {
        paid = true;
        assert.equal(g.phase, "event");
        assert.equal(g.enemy, null);
        assert.equal(slugsAboard(g).length, 0);
        assert.ok(g.scrap > scrap);
        // "You receive a weapon with high scrap." Rewards, "Weapon": "A random weapon & T scrap."
        const stowed = [...(g.cargo ?? []), ...(g.overflow ?? [])].filter(
          (x) => x.kind === "weapon",
        ).length;
        assert.equal(g.player.weapons.length + stowed, weapons.length + 1);
        assert.match(g.event!.body, /shakes off the daze and appears victorious/);
        assert.match(g.event!.body, /concedes his defeat/);
        assert.match(g.event!.body, /mounted\.|stowed in cargo\.|choose what to leave behind\./);
      }
    }
    assert.ok(boarded && paid);
  });
});
