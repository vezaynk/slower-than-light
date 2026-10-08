import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:escort-civilians-ftl-haywire";
  b.name = "Escort civilians FTL haywire";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Escort civilians FTL haywire");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Escort civilians FTL haywire", () => {
  it("leading them pays low scrap and a quest marker, and declining spends nothing", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:escort-civilians-ftl-haywire:2"), true);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    choose(g, "c:escort-civilians-ftl-haywire:0");
    const paid = g.log.map((line) => line.match(/^Low scrap: (\d+)\.$/)).find(Boolean);
    assert.ok(paid);
    const n = Number(paid[1]);
    assert.ok(n >= 7 && n <= 10);
    assert.equal(g.scrap, 10 + n);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.match(g.event?.body ?? "", /quest marker/);
    assert.equal(g.beacons.some((b) => b.quest === "escort"), true);
    assert.equal(g.fleet, 5);

    const out = createGame(1);
    open(out);
    choose(out, "c:escort-civilians-ftl-haywire:1");
    assert.equal(out.phase, "map");
    assert.equal(out.scrap, 10);
    assert.equal(out.beacons.some((b) => b.quest === "escort"), false);
    assert.equal(out.fleet, 5);
  });

  it("Advanced FTL Navigation pays high scrap with resources and adds no marker", () => {
    const bare = createGame(2);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:escort-civilians-ftl-haywire:2"), "Needs Adv. FTL Navigation");
    choose(bare, "c:escort-civilians-ftl-haywire:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.beacons.some((b) => b.quest === "escort"), false);

    const g = createGame(3);
    open(g);
    g.augments = ["nav"];
    const guns = g.player.weapons.length;
    const crew = g.crew.filter((c) => c.side === "player").length;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    assert.equal(choiceDisabled(g, "c:escort-civilians-ftl-haywire:2"), null);
    choose(g, "c:escort-civilians-ftl-haywire:2");
    const body = g.event?.body ?? "";
    assert.match(body, /chain-jumping/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(g.beacons.some((b) => b.quest === "escort"), false);
    assert.equal(g.questsNext?.length ?? 0, 0);
    assert.equal(g.fleet, 5);
    assert.equal(g.phase, "event");
  });
});
