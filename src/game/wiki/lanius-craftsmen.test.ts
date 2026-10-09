import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-craftsmen";
  b.name = "Lanius craftsmen";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius craftsmen");
}

function stock(g: Game) {
  return {
    scrap: g.scrap,
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    guns: g.player.weapons.length,
    augs: g.augments.length,
    crew: g.crew.filter((c) => c.side === "player").length,
  };
}

function sameStock(g: Game, before: ReturnType<typeof stock>) {
  assert.equal(g.scrap, before.scrap);
  assert.equal(g.fuel, before.fuel);
  assert.equal(g.missiles, before.missiles);
  assert.equal(g.player.parts, before.parts);
  assert.equal(g.player.weapons.length, before.guns);
  assert.equal(g.augments.length, before.augs);
  assert.equal(g.crew.filter((c) => c.side === "player").length, before.crew);
}

describe("Lanius craftsmen", () => {
  it("is one Abandoned Sector card", () => {
    const pages = citedPagesFor("Abandoned Sector").filter((e) => e.dest === "Lanius craftsmen");
    assert.equal(pages.length, 1);
    assert.equal(citedPagesFor("Civilian Sector").some((e) => e.dest === "Lanius craftsmen"), false);
  });

  it("opens on the merchant sentence and does not sell the unnamed crafts", () => {
    const g = createGame(1);
    open(g);
    assert.match(g.event?.body ?? "", /studying the Lanius's ability to reshape metal/);
    assert.deepEqual(g.event?.choices.map((c) => c.label), [
      "Inquire about the process.",
      "Leave them to their research.",
    ]);
    assert.equal(g.event?.choices.some((c) => /45|50|40|discount/.test(c.label)), false);
  });

  it("inquiring can be declined, and nothing is spent", () => {
    const g = createGame(2);
    open(g);
    const before = stock(g);
    choose(g, "c:lanius-craftsmen:0");
    assert.match(g.event?.body ?? "", /foggiest idea how it works/);
    assert.deepEqual(g.event?.choices.map((c) => c.label), ["Decline their offer."]);
    choose(g, "s:lanius-craftsmen:decline");
    assert.match(g.event?.body ?? "", /thank them for the information/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    sameStock(g, before);
    assert.equal(g.phase, "event");
  });

  it("leaving them to their research does nothing", () => {
    const g = createGame(3);
    open(g);
    const before = stock(g);
    choose(g, "c:lanius-craftsmen:1");
    assert.match(g.event?.body ?? "", /commercial manufacturing/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    sameStock(g, before);
    assert.equal(g.phase, "event");
  });
});
