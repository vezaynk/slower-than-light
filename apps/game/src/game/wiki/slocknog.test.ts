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
    // Wiki citations:
    // > "Hire Slocknog." — [[Slocknog]]
    // > "Scrap lost: 55" — [[Slocknog]]
    // > "You receive a Slug crewmember named Slocknog." — [[Slocknog]]
    const g = createGame(1);
    g.scrap = 55;
    const crew = players(g).length;
    open(g);
    assert.equal(choiceDisabled(g, "c:slocknog:0"), null);
    fillerChoose(g, "c:slocknog:0");
    const slug = players(g).find((c) => c.name === "Slocknog");
    assert.ok(slug);
    assert.equal(slug.kin, "slug");
    assert.equal(slug.skills, undefined);
    assert.equal(players(g).length, crew + 1);
    assert.equal(g.scrap, 0);
    assert.match(g.event?.body ?? "", /named Slocknog/);
  });

  it("refuses the hire below 55 scrap, and a full ship relieves someone already aboard", () => {
    // Wiki citations:
    // > "Scrap lost: 55" — [[Slocknog]]
    const short = createGame(1);
    short.scrap = 54;
    open(short);
    assert.equal(choiceDisabled(short, "c:slocknog:0"), "Need 55 scrap");
    fillerChoose(short, "c:slocknog:0");
    assert.equal(short.scrap, 54);
    assert.equal(
      players(short).some((c) => c.name === "Slocknog"),
      false,
    );

    const full = createGame(2);
    full.scrap = 55;
    while (players(full).length < CREW_CAP) assert.equal(joinCrew(full, "Human"), true);
    open(full);
    fillerChoose(full, "c:slocknog:0");
    // Crew: at full crew a hire relieves "one of the existing crewmembers" (make-room.ts keepNewHire).
    assert.equal(full.scrap, 0);
    const slug = players(full).find((c) => c.name === "Slocknog");
    assert.ok(slug);
    assert.deepEqual(full.overflow, [{ kind: "crew", keep: slug.id }]);
  });

  it("rescuing him after the plea is free, and leaving spends nothing", () => {
    // Wiki citations:
    // > "Ignore Slocknog." — [[Slocknog]]
    // > "You power up the FTL, at which point the Slug sends an urgent plea. \"Please, I ssee you are a sssly captain. You have an advantage. Very well. I will join your crew - but please remove me from this rock!\"" — [[Slocknog]]
    // > "Rescue him." — [[Slocknog]]
    // > "When he sees the shuttle headed for his position the Slug thanks you with what looks like sincerity. He readily joins your crew." — [[Slocknog]]
    // > "You receive a Slug crewmember named Slocknog." — [[Slocknog]]
    // > "Leave him." — [[Slocknog]]
    // > "You close the frequency and continue jump prep. If this Slug is such a hero he'll find a way off that moon on his own." — [[Slocknog]]
    // > "Nothing happens." — [[Slocknog]]
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
    assert.equal(
      players(left).some((c) => c.name === "Slocknog"),
      false,
    );
  });
});
