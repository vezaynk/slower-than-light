import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREW_CAP, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slocknog";
  b.name = "Slocknog";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slocknog");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

describe("Slocknog", () => {
  it("hiring him costs 55 scrap and stores no skills", () => {
    const g = createGame(1);
    g.scrap = 55;
    const crew = players(g).length;
    open(g);
    assert.equal(choiceDisabled(g, "c:slocknog:0"), null);
    fillerChoose(g, "c:slocknog:0");
    const slug = players(g).find((c) => c.name === "Slocknog");
    assert.ok(slug);
    assert.equal(slug.kin, "gel");
    assert.equal(slug.skills, undefined);
    assert.equal(players(g).length, crew + 1);
    assert.equal(g.scrap, 0);
    assert.match(g.event?.body ?? "", /named Slocknog/);
  });

  it("refuses the hire below 55 scrap and when the ship is full", () => {
    const short = createGame(1);
    short.scrap = 54;
    open(short);
    assert.equal(choiceDisabled(short, "c:slocknog:0"), "Need 55 scrap");
    fillerChoose(short, "c:slocknog:0");
    assert.equal(short.scrap, 54);
    assert.equal(players(short).some((c) => c.name === "Slocknog"), false);

    const full = createGame(2);
    full.scrap = 55;
    while (players(full).length < CREW_CAP) assert.equal(joinCrew(full, "Human"), true);
    open(full);
    fillerChoose(full, "c:slocknog:0");
    assert.match(full.event?.body ?? "", /no room aboard for Slocknog/);
    assert.equal(full.scrap, 55);
    assert.equal(players(full).some((c) => c.name === "Slocknog"), false);
  });

  it("rescuing him after the plea is free, and leaving spends nothing", () => {
    const g = createGame(3);
    const crew = players(g).length;
    open(g);
    fillerChoose(g, "c:slocknog:1");
    assert.match(g.event?.body ?? "", /sssentient|sssly|remove me from this rock/);
    fillerChoose(g, "s:slocknog:rescue");
    const slug = players(g).find((c) => c.name === "Slocknog");
    assert.ok(slug);
    assert.equal(slug.skills, undefined);
    assert.equal(players(g).length, crew + 1);
    assert.equal(g.scrap, 10);

    const left = createGame(4);
    open(left);
    fillerChoose(left, "c:slocknog:1");
    fillerChoose(left, "s:slocknog:leave");
    assert.match(left.event?.body ?? "", /find a way off that moon/);
    assert.match(left.event?.body ?? "", /Nothing happens/);
    assert.equal(left.scrap, 10);
    assert.equal(players(left).some((c) => c.name === "Slocknog"), false);
  });
});
