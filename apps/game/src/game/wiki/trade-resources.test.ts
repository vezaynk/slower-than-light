import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `You arrive at a quiet spaceport and are immediately hailed by another ship at port with a "once in a lifetime deal!"`,
  "You jump into a sector filled with civilian activity. Your scan the various advertisement channels while waiting for your FTL to charge, and are intrigued by a grey-market shipwright.",
  "Your ship is flooded with advertisement transmissions from nearby merchants as soon as you arrive at this beacon. You arbitrarily pick one to examine in detail.",
  "Despite the barren area, a trader has set up shop at this beacon. He presents his offer.",
  "The beacon at first glance seems home to a junk yard. Upon closer inspection, it reveals itself to be a ramshackle market. One trader has a deal that catches your eye.",
  "A pawn broker has set up shop at this obscure beacon. He might be offering something worth looking at.",
];

const TAKE = /^c:trade-resources:take:(fuel|missiles|parts):(\d+):(fuel|missiles|parts):(\d+)$/;

const BANDS: Record<string, { cost: [number, number]; gain: [number, number] }> = {
  "parts:fuel": { cost: [1, 2], gain: [5, 10] },
  "fuel:missiles": { cost: [1, 2], gain: [4, 5] },
  "missiles:parts": { cost: [2, 3], gain: [2, 3] },
  "missiles:fuel": { cost: [2, 4], gain: [4, 10] },
};

type Res = "fuel" | "missiles" | "parts";

function word(id: Res): string {
  return id === "parts" ? "drone parts" : id;
}

function have(g: Game, id: Res): number {
  if (id === "fuel") return g.fuel;
  if (id === "missiles") return g.missiles;
  return g.player.parts;
}

function setHave(g: Game, id: Res, n: number) {
  if (id === "fuel") g.fuel = n;
  else if (id === "missiles") g.missiles = n;
  else g.player.parts = n;
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:trade-resources";
  b.name = "Trade resources";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  return g.event;
}

describe("Trade resources", () => {
  it("shows one rolled offer, and Trade pays exactly those numbers", () => {
    const kinds = new Set<string>();
    const intros = new Set<string>();
    for (let seed = 1; seed <= 240 && (kinds.size < 4 || intros.size < 6); seed++) {
      const g = createGame(seed);
      const ev = open(g);
      assert.ok(ev);
      assert.equal(ev.title, "Trade resources");
      assert.equal(ev.choices.length, 2);
      const take = ev.choices[0]!;
      const ignore = ev.choices[1]!;
      assert.equal(take.label, "Trade.");
      assert.match(take.id, TAKE);
      assert.equal(ignore.id, "c:trade-resources:4");
      assert.equal(ignore.label, "Ignore.");
      const m = TAKE.exec(take.id);
      assert.ok(m);
      const pay = m[1] as Res;
      const cost = Number(m[2]);
      const get = m[3] as Res;
      const gain = Number(m[4]);
      const key = `${pay}:${get}`;
      const band = BANDS[key];
      assert.ok(band, key);
      assert.ok(cost >= band.cost[0] && cost <= band.cost[1], `${key} cost ${cost}`);
      assert.ok(gain >= band.gain[0] && gain <= band.gain[1], `${key} gain ${gain}`);
      const sentence = `You lose ${cost} ${word(pay)} and receive ${gain} ${word(get)}.`;
      const hits = INTROS.filter((line) => ev.body.includes(line));
      assert.equal(hits.length, 1);
      assert.ok(ev.body.includes(sentence));
      assert.ok(ev.body.indexOf(sentence) > ev.body.indexOf(hits[0]!));
      kinds.add(key);
      intros.add(hits[0]!);

      const third = (["fuel", "missiles", "parts"] as const).find((id) => id !== pay && id !== get);
      assert.ok(third);
      g.fuel = 30;
      g.missiles = 30;
      g.player.parts = 30;
      const scrap = g.scrap;
      assert.equal(choiceDisabled(g, take.id), null);
      choose(g, take.id);
      assert.equal(g.phase, "map");
      assert.equal(g.scrap, scrap);
      assert.equal(have(g, pay), 30 - cost);
      assert.equal(have(g, get), 30 + gain);
      assert.equal(have(g, third), 30);
      assert.ok(g.log.includes(pay === "fuel" ? `Fuel: -${cost}.` : pay === "missiles" ? `Missiles: -${cost}.` : `Drone parts: -${cost}.`));
      assert.ok(g.log.includes(get === "fuel" ? `Fuel: ${gain}.` : get === "missiles" ? `Missiles: ${gain}.` : `Drone parts: ${gain}.`));
    }
    assert.deepEqual([...kinds].sort(), ["fuel:missiles", "missiles:fuel", "missiles:parts", "parts:fuel"]);
    assert.equal(intros.size, 6);
    assert.ok(intros.has(INTROS[1]));
  });

  it("Ignore returns to the map and changes nothing", () => {
    const g = createGame(4);
    open(g);
    g.fuel = 11;
    g.missiles = 12;
    g.player.parts = 13;
    const scrap = g.scrap;
    const log = [...g.log];
    choose(g, "c:trade-resources:4");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, 11);
    assert.equal(g.missiles, 12);
    assert.equal(g.player.parts, 13);
    assert.deepEqual(g.log, log);
  });

  it("a short stock is named and Trade changes nothing", () => {
    const g = createGame(8);
    const ev = open(g);
    assert.ok(ev);
    const id = ev.choices[0]!.id;
    const m = TAKE.exec(id);
    assert.ok(m);
    const pay = m[1] as Res;
    const cost = Number(m[2]);
    g.fuel = 20;
    g.missiles = 20;
    g.player.parts = 20;
    setHave(g, pay, cost - 1);
    assert.equal(choiceDisabled(g, id), `Need ${cost} ${word(pay)}`);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const scrap = g.scrap;
    const log = [...g.log];
    choose(g, id);
    assert.equal(g.phase, "event");
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.scrap, scrap);
    assert.equal(g.event?.title, "Trade resources");
    assert.deepEqual(g.log, log);
  });
});
