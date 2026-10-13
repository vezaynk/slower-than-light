import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game, Kit } from "../types.ts";
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
    name: "Giant alien spiders",
    tier: "",
    flag: "filler:giant-alien-spiders",
    asteroid: false,
  };
}

function swarm(target: string | null, loadout: string[] = []): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target, on: false, aux: 0, loadout };
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

describe("Giant alien spiders", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Giant alien spiders")?.slug, "giant-alien-spiders");
  });

  it("hides the blue options until that gear is fitted", () => {
    const plain = createGame(1);
    const ev = open(plain);
    assert.match(ev.body, /giant alien spiders/);
    assert.deepEqual(ev.choices.map((c) => c.id), ["c:giant-alien-spiders:0", "c:giant-alien-spiders:1"]);
    assert.equal(choiceDisabled(plain, "c:giant-alien-spiders:2"), "Needs an Anti-Personnel Drone");
    assert.equal(choiceDisabled(plain, "c:giant-alien-spiders:3"), "Needs a Boarding Drone");
    assert.equal(choiceDisabled(plain, "c:giant-alien-spiders:4"), "Needs an Anti-Bio Beam");

    const personnel = createGame(1);
    personnel.player.kits.swarm = swarm("personnel");
    assert.ok(open(personnel).choices.some((c) => c.id === "c:giant-alien-spiders:2"));
    assert.equal(open(personnel).choices.some((c) => c.id === "c:giant-alien-spiders:3"), false);

    const boarding = createGame(1);
    boarding.player.kits.swarm = swarm(null, ["board"]);
    assert.ok(open(boarding).choices.some((c) => c.id === "c:giant-alien-spiders:3"));

    const beam = createGame(1);
    beam.player.weapons.push({ uid: "beam", defId: "antibio", charge: 0, enabled: false, autofire: false, target: null });
    assert.ok(open(beam).choices.some((c) => c.id === "c:giant-alien-spiders:4"));
  });

  it("leaves them alone and spends nothing", () => {
    const g = createGame(2);
    const scrap = g.scrap;
    const crew = g.crew.length;
    open(g);
    fillerChoose(g, "c:giant-alien-spiders:1");
    assert.match(g.event?.body ?? "", /unknown alien/);
    assert.equal(g.scrap, scrap);
    assert.equal(g.crew.length, crew);
    assert.equal(g.player.hull, g.player.hullMax);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("sending the crew either loses one or pays high resources", () => {
    let lost = false;
    let paid = false;
    for (let seed = 1; seed <= 40 && (!lost || !paid); seed++) {
      const g = createGame(seed);
      assert.ok(g.crew.length >= 2);
      const crew = g.crew.length;
      const weapons = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:giant-alien-spiders:0");
      const body = g.event?.body ?? "";
      if (/Not everybody made it back/.test(body)) {
        lost = true;
        assert.equal(g.crew.length, crew - 1);
        assert.equal(g.scrap, 10);
        assert.match(body, /is lost/);
      } else {
        paid = true;
        assert.match(body, /thrilled with your success/);
        assert.equal(g.crew.length, crew);
        assert.equal(g.player.weapons.length, weapons);
        const got = reward(body);
        assert.ok(got.scrap >= 7 && got.scrap <= 10);
        const present = [got.fuel > 0, got.missiles > 0, got.parts > 0].filter(Boolean).length;
        assert.equal(present, 2);
        if (got.fuel) assert.ok(got.fuel >= 3 && got.fuel <= 6);
        if (got.missiles) assert.ok(got.missiles >= 4 && got.missiles <= 8);
        if (got.parts) assert.ok(got.parts >= 1 && got.parts <= 2);
      }
    }
    assert.equal(lost && paid, true);
  });

  it("a clone bay revives the crewmember the spiders take", () => {
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = g.crew.length;
      open(g);
      fillerChoose(g, "c:giant-alien-spiders:0");
      if (!/Not everybody made it back/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.match(g.event?.body ?? "", /revived/);
      assert.equal(g.crew.length, crew);
    }
    assert.equal(seen, true);
  });

  it("skips the drone part when the reward includes drone parts", () => {
    let failed = false;
    let kept = false;
    let spent = false;
    for (let seed = 1; seed <= 50 && (!failed || !kept || !spent); seed++) {
      const dry = createGame(seed);
      dry.player.kits.swarm = swarm("personnel");
      dry.player.parts = 0;
      dry.augments = ["weld"];
      dry.player.hull = dry.player.hullMax - 4;
      const hull = dry.player.hull;
      const ev = open(dry);
      fillerChoose(dry, "c:giant-alien-spiders:2");
      if (dry.event === ev) {
        failed = true;
        assert.equal(dry.player.parts, 0);
        assert.equal(dry.player.hull, hull);
        assert.equal(dry.log.some((line) => line.includes("Repair Arm")), false);
        assert.equal(dry.scrap, 10);
      } else {
        kept = true;
        assert.ok(dry.player.parts > 0);
        assert.match(dry.event?.body ?? "", /sincere gratitude/);
      }

      const stocked = createGame(seed);
      stocked.player.kits.swarm = swarm("personnel");
      stocked.player.parts = 5;
      open(stocked);
      fillerChoose(stocked, "c:giant-alien-spiders:2");
      const body = stocked.event?.body ?? "";
      const got = reward(body);
      assert.match(body, /sincere gratitude/);
      assert.ok(got.scrap >= 7 && got.scrap <= 10);
      if (stocked.player.parts === 6) {
        kept = true;
        assert.equal(got.parts, 1);
        assert.equal(/Drone parts: -1/.test(body), false);
        const other = (got.fuel > 0 ? 1 : 0) + (got.missiles > 0 ? 1 : 0);
        assert.equal(other, 1);
        if (got.fuel) assert.ok(got.fuel >= 2 && got.fuel <= 4);
        if (got.missiles) assert.ok(got.missiles >= 2 && got.missiles <= 4);
      } else {
        spent = true;
        assert.equal(stocked.player.parts, 4);
        assert.match(body, /Drone parts: -1/);
        assert.ok(got.fuel >= 2 && got.fuel <= 4);
        assert.ok(got.missiles >= 2 && got.missiles <= 4);
      }
    }
    assert.equal(failed && kept && spent, true);
  });

  it("a boarding drone pays low scrap with resources and does not damage the hull", () => {
    let kept = false;
    let spent = false;
    for (let seed = 1; seed <= 40 && (!kept || !spent); seed++) {
      const g = createGame(seed);
      g.player.kits.swarm = swarm("board");
      g.player.parts = 5;
      const hull = g.player.hull;
      open(g);
      fillerChoose(g, "c:giant-alien-spiders:3");
      const body = g.event?.body ?? "";
      assert.match(body, /meager payment/);
      assert.equal(g.player.hull, hull);
      const got = reward(body);
      assert.ok(got.scrap >= 7 && got.scrap <= 10);
      if (g.player.parts === 6) {
        kept = true;
        assert.equal(got.parts, 1);
        const other = (got.fuel > 0 ? 1 : 0) + (got.missiles > 0 ? 1 : 0);
        assert.equal(other, 1);
      } else {
        spent = true;
        assert.equal(g.player.parts, 4);
        assert.ok(got.fuel >= 1 && got.fuel <= 3);
        assert.ok(got.missiles >= 1 && got.missiles <= 2);
      }
      if (got.fuel) assert.ok(got.fuel >= 1 && got.fuel <= 3);
      if (got.missiles) assert.ok(got.missiles >= 1 && got.missiles <= 2);
    }
    assert.equal(kept && spent, true);
  });

  it("an Anti-Bio Beam pays high resources and spends no drone part", () => {
    const g = createGame(7);
    g.player.weapons.push({ uid: "beam", defId: "antibio", charge: 0, enabled: false, autofire: false, target: null });
    g.player.parts = 3;
    const weapons = g.player.weapons.length;
    open(g);
    fillerChoose(g, "c:giant-alien-spiders:4");
    const body = g.event?.body ?? "";
    assert.match(body, /terrifying weapon/);
    assert.equal(g.player.weapons.length, weapons);
    const got = reward(body);
    assert.ok(got.scrap >= 7 && got.scrap <= 10);
    assert.equal(g.player.parts, 3 + got.parts);
    const present = [got.fuel > 0, got.missiles > 0, got.parts > 0].filter(Boolean).length;
    assert.equal(present, 2);
    if (got.fuel) assert.ok(got.fuel >= 3 && got.fuel <= 6);
    if (got.missiles) assert.ok(got.missiles >= 4 && got.missiles <= 8);
    if (got.parts) assert.ok(got.parts >= 1 && got.parts <= 2);
  });
});
