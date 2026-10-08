import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-choice";
  b.name = "Slug hacker (choice)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function fitHacking(g: Game) {
  g.player.kits.spike = {
    id: "spike",
    level: 1,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function paid(g: Game, deadCrew: boolean, id: string, band: [number, number], text: RegExp) {
  if (id === "c:slug-hacker-choice:4") fitHacking(g);
  open(g);
  const crew = g.crew.filter((c) => c.side === "player").length;
  const guns = g.player.weapons.length;
  choose(g, id);
  assert.equal(g.fightEvent, "slug-hacker-choice");
  assert.equal(pageWin(g, "slug-hacker-choice", deadCrew), true);
  const body = g.event?.body ?? "";
  assert.match(body, text);
  const scrap = scraps(body);
  assert.equal(scrap.length, 1, body);
  assert.ok(scrap[0]! >= band[0] && scrap[0]! <= band[1], body);
  assert.equal(resources(body), 2, body);
  assert.equal(g.scrap, 10 + scrap[0]!);
  assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  assert.equal(g.player.weapons.length, guns);
}

describe("Slug hacker (choice) reward", () => {
  it("shields pays medium scrap when the ship is destroyed and high scrap on a crew kill", () => {
    paid(
      createGame(1),
      false,
      "c:slug-hacker-choice:0",
      [12, 19],
      /The Slug ship breaks apart and your shields return to normal/,
    );
    paid(
      createGame(2),
      true,
      "c:slug-hacker-choice:0",
      [19, 23],
      /your shields return to normal/,
    );
  });

  it("oxygen pays medium scrap with resources either way", () => {
    paid(
      createGame(3),
      false,
      "c:slug-hacker-choice:1",
      [12, 19],
      /The Slug ship breaks apart and your systems return to normal/,
    );
    paid(
      createGame(4),
      true,
      "c:slug-hacker-choice:1",
      [12, 19],
      /your systems return to normal/,
    );
  });

  it("weapons pays high scrap with resources either way", () => {
    paid(
      createGame(5),
      false,
      "c:slug-hacker-choice:2",
      [19, 23],
      /The Slug ship breaks apart and your weapon system returns to normal/,
    );
    paid(
      createGame(6),
      true,
      "c:slug-hacker-choice:2",
      [19, 23],
      /your weapon system returns to normal/,
    );
  });

  it("countering the hack pays high scrap with resources either way", () => {
    paid(
      createGame(7),
      false,
      "c:slug-hacker-choice:4",
      [19, 23],
      /their hacking module is destroyed/,
    );
    paid(
      createGame(8),
      true,
      "c:slug-hacker-choice:4",
      [19, 23],
      /your weapon system returns to normal/,
    );
  });
});
