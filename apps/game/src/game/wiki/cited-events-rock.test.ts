import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { kinOf } from "../extras/kin.ts";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";

function arrive(seed: number, dest: string): Game {
  const g = createGame(seed);
  g.sectorId = "ROCK_SECTOR";
  g.sectorName = "Rock Controlled Sector";
  const ev = allEvents().find((e) => e.dest === dest);
  assert.ok(ev, dest);
  const b = g.beacons.find(
    (x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store",
  )!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = ev.dest;
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  return g;
}

describe("Rock fight with boarders", () => {
  it("beams 1-3 Rock boarders aboard after the Rock ship fight and grants nothing else", () => {
    // Wiki citations:
    // > "1-3 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders]]
    const seen = new Set<number>();
    const hp = kinOf("rock").hp;
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = arrive(seed, "Rock fight with boarders");
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const kits = JSON.stringify(g.player.kits);
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      choose(g, "c:rock-fight-with-boarders:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "rock");
      assert.equal(g.enemy?.pirate, false);
      assert.equal(g.asteroid, false);
      assert.equal(g.fightEvent, "rock-fight-with-boarders");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 1 && boarders.length <= 3, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Rock" &&
            c.kin === "rock" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.equal(JSON.stringify(g.player.kits), kits);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarder counts are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} rock boarders beam aboard your ship.`),
      );
    }
    assert.deepEqual([...seen].sort(), [1, 2, 3]);
  });

  it("beams 1-2 Rock boarders aboard in the asteroid field and grants nothing else", () => {
    // Wiki citations:
    // > "1-2 rock boarders beam aboard your ship, and you fight a Rock ship (default rewards)." — [[Rock fight with boarders in asteroid field]]
    const seen = new Set<number>();
    const hp = kinOf("rock").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = arrive(seed, "Rock fight with boarders in asteroid field");
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const kits = JSON.stringify(g.player.kits);
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      choose(g, "c:rock-fight-with-boarders-in-asteroid-field:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.asteroid, true);
      assert.equal(g.enemy?.faction, "rock");
      assert.equal(g.fightEvent, "rock-fight-with-boarders-in-asteroid-field");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 1 && boarders.length <= 2, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Rock" &&
            c.kin === "rock" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.equal(JSON.stringify(g.player.kits), kits);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarder counts are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} rock boarders beam aboard your ship.`),
      );
    }
    assert.deepEqual([...seen].sort(), [1, 2]);
  });
});

describe("Mantis ship with Rock body parts", () => {
  it("prints the hunter sentence and keeps the attack", () => {
    const g = createGame(1);
    const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
    assert.ok(b);
    b.flag = "ROCK_MANTIS_HUNTER";
    b.name = "Mantis ship with Rock body parts";
    g.here = b.id;
    g.event = citedEvent(g, b);
    assert.equal(
      g.event?.body,
      "A Mantis ship here is adorned with Rock body parts! It would be a gorier display if they had internal organs, but the message is clear enough: this is a hunter of a very specialized kind.",
    );
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-with-rock-body-parts:0"));
  });
});
