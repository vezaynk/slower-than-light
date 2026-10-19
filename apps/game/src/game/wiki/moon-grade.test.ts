import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { eventGrade } from "./event-grades.ts";

afterEach(() => resetPackForTests());

const WORDS: Record<string, number> = { five: 5, six: 6, seven: 7, eleven: 11 };

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: true,
    resolved: false,
    name: "Slug moons question",
    tier: "",
    flag: "cited:slug-moons-question",
    asteroid: false,
  };
}

function open(seed: number): Game {
  const g = createGame(seed);
  g.sectorId = "SLUG_SECTOR";
  g.sectorName = "Slug Controlled Nebula";
  const b = beacon();
  g.beacons = [b];
  g.here = b.id;
  const ev = citedEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  g.paused = true;
  return g;
}

function moons(body: string): number {
  const found = body.match(/one of the (five|six|seven|eleven) moons/);
  assert.ok(found, body);
  return WORDS[found[1]!]!;
}

function answer(g: Game, picked: number) {
  const n = moons(g.event?.body ?? "");
  choose(g, g.event?.choices[0]?.id ?? "");
  choose(g, `c:slug-moons-question:answer:${n}:${picked}`);
  return n;
}

describe("slug moon grade", () => {
  it("packs the hire and the penalty, and an appended grade replaces both", () => {
    assert.deepEqual(eventDef("slug-moons-question")?.grade, {
      hire: "Slug",
      pays: [
        { k: "scrap", lo: 35, hi: 35 },
        { k: "fuel", lo: 2, hi: 4 },
        { k: "parts", lo: 1, hi: 2 },
      ],
    });
    assert.equal(eventGrade("slug-moons-question")?.hire, "Slug");

    const row = eventDef("slug-moons-question");
    assert.ok(row);
    loadPack(
      { events: [{ ...row, grade: { hire: "Engi", pays: row.grade?.pays ?? [] } }] },
      "append",
    );
    const hired = open(2);
    const gels = hired.crew.filter((c) => c.kin === "slug").length;
    const shells = hired.crew.filter((c) => c.kin === "engi").length;
    const scrap = hired.scrap;
    answer(hired, moons(hired.event?.body ?? ""));
    assert.equal(hired.crew.filter((c) => c.kin === "slug").length, gels);
    assert.equal(hired.crew.filter((c) => c.kin === "engi").length, shells + 1);
    assert.equal(hired.scrap, scrap);
    assert.match(hired.event?.body ?? "", /That isss\.\.\. correct/);

    loadPack(
      {
        events: [
          {
            ...row,
            grade: {
              hire: "Slug",
              pays: [
                { k: "scrap", lo: 10, hi: 10 },
                { k: "fuel", lo: 3, hi: 3 },
                { k: "parts", lo: 1, hi: 1 },
              ],
            },
          },
        ],
      },
      "append",
    );
    const poor = open(4);
    poor.scrap = 9;
    poor.fuel = 10;
    poor.player.parts = 10;
    const count = moons(poor.event?.body ?? "");
    const wrong = count === 5 ? 6 : 5;
    choose(poor, poor.event?.choices[0]?.id ?? "");
    choose(poor, `c:slug-moons-question:answer:${count}:${wrong}`);
    assert.equal(poor.scrap, 9);
    assert.equal(poor.fuel, 10);
    assert.equal(poor.player.parts, 10);
    assert.match(poor.event?.body ?? "", /How many moons are there in orbit here/);
    poor.scrap = 40;
    choose(poor, `c:slug-moons-question:answer:${count}:${wrong}`);
    assert.equal(poor.scrap, 30);
    assert.equal(poor.fuel, 7);
    assert.equal(poor.player.parts, 9);

    loadPack(
      {
        events: [
          {
            ...row,
            grade: {
              hire: "Slug",
              pays: [
                { k: "scrap", lo: 10, hi: 10 },
                { k: "fuel", lo: 5, hi: 7 },
                { k: "parts", lo: 1, hi: 1 },
              ],
            },
          },
        ],
      },
      "append",
    );
    const fuels = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = open(seed);
      g.scrap = 80;
      g.fuel = 10;
      g.player.parts = 10;
      const count = moons(g.event?.body ?? "");
      answer(g, count === 5 ? 6 : 5);
      assert.equal(g.scrap, 70);
      assert.equal(g.player.parts, 9);
      const fuel = 10 - g.fuel;
      assert.ok(fuel >= 5 && fuel <= 7, String(fuel));
      fuels.add(fuel);
    }
    assert.deepEqual(
      [...fuels].sort((a, b) => a - b),
      [5, 6, 7],
    );

    loadPack({ events: [{ ...row, grade: undefined }] }, "append");
    const quiet = open(3);
    const before = quiet.crew.filter((c) => c.side === "player").length;
    quiet.scrap = 80;
    quiet.fuel = 10;
    quiet.player.parts = 10;
    const quietCount = answer(quiet, moons(quiet.event?.body ?? ""));
    assert.equal(quiet.crew.filter((c) => c.side === "player").length, before);
    assert.equal(quiet.scrap, 80);
    assert.match(quiet.event?.body ?? "", /How many moons are there in orbit here/);
    choose(quiet, `c:slug-moons-question:answer:${quietCount}:${quietCount === 5 ? 6 : 5}`);
    assert.equal(quiet.scrap, 80);
    assert.equal(quiet.fuel, 10);
    assert.equal(quiet.player.parts, 10);
    assert.equal(eventGrade("slug-moons-question"), null);

    resetPackForTests();
    assert.equal(eventGrade("slug-moons-question")?.hire, "Slug");

    loadPack(
      {
        events: [
          {
            id: "ember-grade",
            dest: "ember-grade",
            flag: "cited:ember-grade",
            aliases: [],
            sectors: [],
            body: "",
            choices: [],
            grade: { hire: "Rock", pays: [{ k: "scrap", lo: 4, hi: 4 }] },
          },
        ],
      },
      "append",
    );
    assert.equal(eventGrade("ember-grade")?.hire, "Rock");
    resetPackForTests();
    assert.equal(eventGrade("ember-grade"), null);
    assert.equal(eventGrade("slug-moons-question")?.hire, "Slug");
  });
});
