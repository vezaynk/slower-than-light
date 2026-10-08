import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = [
  "You look like a military vessel.",
  "You receive a message from a small convoy.",
];

const BUNDLES: { missiles: [number, number]; parts: [number, number]; fuel: [number, number] }[] = [
  { missiles: [3, 5], parts: [0, 2], fuel: [0, 0] },
  { missiles: [0, 2], parts: [2, 3], fuel: [0, 0] },
  { missiles: [0, 2], parts: [0, 2], fuel: [2, 3] },
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Improve reactor for supplies",
    tier: "",
    flag: "filler:improve-reactor-for-supplies",
    asteroid: false,
  };
}

function offer(g: ReturnType<typeof createGame>) {
  g.beacons = [beacon()];
  g.here = "b";
  const ev = fillerEvent(g, g.beacons[0]);
  assert.ok(ev);
  const agree = ev.choices.find((c) => c.id.startsWith("s:improve-reactor-for-supplies:agree:"));
  assert.ok(agree);
  const m = agree.id.match(/^s:improve-reactor-for-supplies:agree:(\d+):(\d+):(\d+)$/);
  assert.ok(m);
  return { ev, id: agree.id, missiles: Number(m[1]), parts: Number(m[2]), fuel: Number(m[3]) };
}

describe("Improve reactor for supplies", () => {
  it("is a card an items draw can reach", () => {
    assert.equal(pageForRow("Improve reactor for supplies")?.slug, "improve-reactor-for-supplies");
  });

  it("shows one printed intro and one printed bundle", () => {
    const seenIntro = new Set<string>();
    const seenBundle = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      const row = offer(g);
      const intro = INTROS.find((text) => row.ev.body.includes(text));
      assert.ok(intro, row.ev.body);
      seenIntro.add(intro);
      const hit = BUNDLES.findIndex((b) =>
        row.missiles >= b.missiles[0] && row.missiles <= b.missiles[1]
        && row.parts >= b.parts[0] && row.parts <= b.parts[1]
        && row.fuel >= b.fuel[0] && row.fuel <= b.fuel[1],
      );
      assert.ok(hit >= 0, row.id);
      seenBundle.add(hit);
      assert.match(row.ev.choices[0].label, /Agree to the trade/);
      assert.equal(row.ev.choices[1].id, "c:improve-reactor-for-supplies:1");
    }
    assert.equal(seenIntro.size, 2);
    assert.equal(seenBundle.size, 3);
  });

  it("spends the shown supplies and adds one reactor bar", () => {
    const g = createGame(3);
    g.missiles = 20;
    g.player.parts = 20;
    g.fuel = 20;
    const reactor = g.player.reactor;
    const row = offer(g);
    g.missiles = row.missiles;
    g.player.parts = row.parts;
    g.fuel = row.fuel;
    fillerChoose(g, row.id);
    assert.equal(g.missiles, 0);
    assert.equal(g.player.parts, 0);
    assert.equal(g.fuel, 0);
    assert.equal(g.player.reactor, reactor + 1);
    assert.match(g.event?.body ?? "", /try to improve your reactor/);
    assert.match(g.event?.body ?? "", /reactor is upgraded/);
  });

  it("leaves the card up when a supply is short", () => {
    const g = createGame(4);
    g.phase = "event";
    g.missiles = 0;
    g.player.parts = 0;
    g.fuel = 0;
    const reactor = g.player.reactor;
    const row = offer(g);
    const need = row.missiles > 0 ? `${row.missiles} missiles` : row.parts > 0 ? `${row.parts} drone parts` : `${row.fuel} fuel`;
    assert.equal(choiceDisabled(g, row.id), `Need ${need}`);
    fillerChoose(g, row.id);
    assert.equal(g.player.reactor, reactor);
    assert.equal(g.missiles, 0);
  });

  it("still takes the supplies when the reactor is already at 25", () => {
    const g = createGame(5);
    g.player.reactor = 25;
    g.missiles = 20;
    g.player.parts = 20;
    g.fuel = 20;
    const row = offer(g);
    fillerChoose(g, row.id);
    assert.equal(g.player.reactor, 25);
    assert.equal(g.missiles, 20 - row.missiles);
    assert.equal(g.player.parts, 20 - row.parts);
    assert.equal(g.fuel, 20 - row.fuel);
    assert.doesNotMatch(g.event?.body ?? "", /reactor is upgraded/);
  });

  it("declining spends nothing", () => {
    const g = createGame(6);
    g.missiles = 8;
    g.player.parts = 4;
    g.fuel = 6;
    const reactor = g.player.reactor;
    fillerChoose(g, "c:improve-reactor-for-supplies:1");
    assert.equal(g.missiles, 8);
    assert.equal(g.player.parts, 4);
    assert.equal(g.fuel, 6);
    assert.equal(g.player.reactor, reactor);
    assert.match(g.event?.body ?? "", /need what supplies you have/);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });
});
