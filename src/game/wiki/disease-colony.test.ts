import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Unknown disease on mining colony",
    tier: "",
    flag: "filler:unknown-disease-on-mining-colony",
    asteroid: false,
  };
}

function open(g: Game) {
  g.beacons = [beacon()];
  g.here = "b";
  const ev = fillerEvent(g, g.beacons[0]);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function mediumStuff(body: string) {
  const got = reward(body);
  assert.ok(got.scrap >= 7 && got.scrap <= 10);
  const present = [got.fuel > 0, got.missiles > 0, got.parts > 0].filter(Boolean).length;
  assert.equal(present, 2);
  if (got.fuel) assert.ok(got.fuel >= 2 && got.fuel <= 4);
  if (got.missiles) assert.ok(got.missiles >= 2 && got.missiles <= 4);
  if (got.parts) assert.equal(got.parts, 1);
}

describe("Unknown disease on mining colony", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Unknown disease on mining colony")?.slug, "unknown-disease-on-mining-colony");
  });

  it("hides the blue options until that crew or medbay is aboard", () => {
    const plain = createGame(1);
    assert.deepEqual(open(plain).choices.map((c) => c.id), [
      "c:unknown-disease-on-mining-colony:0",
      "c:unknown-disease-on-mining-colony:1",
    ]);
    assert.equal(choiceDisabled(plain, "c:unknown-disease-on-mining-colony:2"), "Needs a Rock crewmember");
    assert.equal(choiceDisabled(plain, "c:unknown-disease-on-mining-colony:3"), "Needs an Engi crewmember");
    assert.equal(choiceDisabled(plain, "c:unknown-disease-on-mining-colony:4"), "Needs a level 2 Medbay");

    const dead = createGame(1);
    dead.crew[0].kin = "stone";
    dead.crew[0].hp = 0;
    assert.equal(open(dead).choices.some((c) => c.id === "c:unknown-disease-on-mining-colony:2"), false);

    const rock = createGame(1);
    rock.crew[0].kin = "stone";
    assert.ok(open(rock).choices.some((c) => c.id === "c:unknown-disease-on-mining-colony:2"));

    const engi = createGame(1);
    engi.crew[0].kin = "shell";
    assert.ok(open(engi).choices.some((c) => c.id === "c:unknown-disease-on-mining-colony:3"));

    const bay = createGame(1);
    bay.player.systems.medbay.level = 2;
    assert.ok(open(bay).choices.some((c) => c.id === "c:unknown-disease-on-mining-colony:4"));
  });

  it("sending the crew loses one and pays medium resources, or nothing", () => {
    let lost = false;
    let quiet = false;
    for (let seed = 1; seed <= 40 && (!lost || !quiet); seed++) {
      const g = createGame(seed);
      assert.ok(g.crew.length >= 2);
      const crew = g.crew.length;
      const weapons = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:unknown-disease-on-mining-colony:0");
      const body = g.event?.body ?? "";
      if (/signs of infection/.test(body)) {
        lost = true;
        assert.equal(g.crew.length, crew - 1);
        assert.equal(g.player.weapons.length, weapons);
        mediumStuff(body);
      } else {
        quiet = true;
        assert.match(body, /retreat hastily/);
        assert.equal(g.crew.length, crew);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(lost && quiet, true);
  });

  it("a clone bay does not bring the infected crewmember back", () => {
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = g.crew.length;
      open(g);
      fillerChoose(g, "c:unknown-disease-on-mining-colony:0");
      if (!/signs of infection/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.match(g.event?.body ?? "", /against Federation regulation/);
      assert.equal(/revived/.test(g.event?.body ?? ""), false);
      assert.equal(g.crew.length, crew - 1);
    }
    assert.equal(seen, true);
  });

  it("ignoring the colony spends nothing", () => {
    const g = createGame(2);
    const crew = g.crew.length;
    open(g);
    fillerChoose(g, "c:unknown-disease-on-mining-colony:1");
    assert.match(g.event?.body ?? "", /mission is too important/);
    assert.equal(g.crew.length, crew);
    assert.equal(g.scrap, 10);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("a Rock or an Engi is paid medium resources and stays aboard", () => {
    const rock = createGame(4);
    rock.crew[0].kin = "stone";
    const crew = rock.crew.length;
    open(rock);
    fillerChoose(rock, "c:unknown-disease-on-mining-colony:2");
    assert.match(rock.event?.body ?? "", /immune system/);
    assert.equal(rock.crew.length, crew);
    mediumStuff(rock.event?.body ?? "");

    const engi = createGame(5);
    engi.crew[0].kin = "shell";
    const aboard = engi.crew.length;
    open(engi);
    fillerChoose(engi, "c:unknown-disease-on-mining-colony:3");
    assert.match(engi.event?.body ?? "", /human physiology/);
    assert.equal(engi.crew.length, aboard);
    mediumStuff(engi.event?.body ?? "");
  });

  it("a level 2 medbay pays medium resources, and the med-bots pay high scrap without a weapon", () => {
    const g = createGame(6);
    g.player.systems.medbay.level = 2;
    const weapons = g.player.weapons.length;
    open(g);
    fillerChoose(g, "c:unknown-disease-on-mining-colony:4");
    assert.match(g.event?.body ?? "", /unknown spore/);
    assert.equal(g.event?.choices.some((c) => c.id === "s:unknown-disease:medbot"), false);
    fillerChoose(g, "s:unknown-disease:continue");
    mediumStuff(g.event?.body ?? "");
    assert.equal(g.player.weapons.length, weapons);

    const bots = createGame(7);
    bots.player.systems.medbay.level = 2;
    bots.augments = ["medbot"];
    const guns = bots.player.weapons.length;
    open(bots);
    fillerChoose(bots, "c:unknown-disease-on-mining-colony:4");
    assert.ok(bots.event?.choices.some((c) => c.id === "s:unknown-disease:medbot"));
    fillerChoose(bots, "s:unknown-disease:medbot");
    const body = bots.event?.body ?? "";
    assert.match(body, /nano dispersal/);
    const got = reward(body);
    assert.ok(got.scrap >= 19 && got.scrap <= 23);
    assert.equal(got.fuel, 0);
    assert.equal(got.missiles, 0);
    assert.equal(got.parts, 0);
    assert.equal(bots.player.weapons.length, guns);
  });
});
