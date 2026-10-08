import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "Holy crap! A weapon is just floating in space!",
  "You inform a nearby station of your flight from the Rebels. They offer to outfit your ship with a weapon and wish you well.",
  "A settlement still loyal to the Federation hails your ship. They have prepared a weapon to aid your escape from the Rebels.",
  "As soon as you arrive a small Mantis ship detaches from a wreck and jumps away. You must have interrupted their salvage operation because you find a weapon ready to be installed!",
  `A small merchant ship messages you, "Underground Federation comm channels are all talking about your 'secret' mission. Let us install a weapon to help. Good luck!"`,
  "Debris from a battle is scattered around this system. A few pieces bounce against your ship. You passively scan them and discover there is a functioning weapon among them!",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:free-weapon";
  b.name = "Free weapon";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Free weapon");
}

describe("Free weapon intro", () => {
  it("shows one of the six printed intros and keeps the low-scrap choice", () => {
    assert.equal(INTROS.length, 6);
    assert.equal(new Set(INTROS).size, 6);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:free-weapon:0"));
      assert.equal(g.phase, "event");
      assert.equal(g.scrap, 10);
      assert.equal(g.enemy, null);
      const weapons = g.player.weapons.length;
      seen.add(body);
      choose(g, "c:free-weapon:0");
      assert.ok(g.scrap > 10);
      assert.equal(g.player.weapons.length, weapons);
      assert.ok(g.log.some((line) => line.includes("The page's item is not added.")));
    }
    assert.equal(seen.size, INTROS.length);
  });
});
