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
    name: "Malfunctioning defense system",
    tier: "",
    flag: "filler:malfunctioning-defense-system",
    asteroid: false,
  };
}

function cloak(level: number): Kit {
  return { id: "veil", level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0 };
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

function standard(body: string, scrap: [number, number]) {
  const got = reward(body);
  assert.ok(got.scrap >= scrap[0] && got.scrap <= scrap[1], body);
  const present = [got.fuel > 0, got.missiles > 0, got.parts > 0].filter(Boolean).length;
  assert.equal(present, 2);
  if (got.fuel) assert.ok(got.fuel >= 1 && got.fuel <= 3);
  if (got.missiles) assert.ok(got.missiles >= 1 && got.missiles <= 2);
  if (got.parts) assert.equal(got.parts, 1);
}

function arm(g: Game, defId: string) {
  g.player.weapons.push({ uid: defId, defId, charge: 0, enabled: false, autofire: false, target: null });
}

describe("Malfunctioning defense system", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Malfunctioning defense system")?.slug, "malfunctioning-defense-system");
  });

  it("opens on the distress and hides the blue options", () => {
    const g = createGame(1);
    const ev = open(g);
    assert.match(ev.body, /satellite defense system has gone haywire/);
    assert.deepEqual(ev.choices.map((c) => c.id), [
      "c:malfunctioning-defense-system:0",
      "c:malfunctioning-defense-system:1",
    ]);
    assert.equal(choiceDisabled(g, "c:malfunctioning-defense-system:3"), "Needs an ion weapon");
    assert.equal(choiceDisabled(g, "c:malfunctioning-defense-system:4"), "Needs Cloaking");
    assert.equal(choiceDisabled(g, "c:malfunctioning-defense-system:5"), "Needs Improved Cloaking");
    assert.equal(choiceDisabled(g, "c:malfunctioning-defense-system:6"), "Needs Advanced Cloaking");
    assert.equal(choiceDisabled(g, "c:malfunctioning-defense-system:7"), "Needs an Engi crewmember");
  });

  it("leaves them alone and spends nothing", () => {
    const g = createGame(2);
    const scrap = g.scrap;
    const hull = g.player.hull;
    open(g);
    fillerChoose(g, "c:malfunctioning-defense-system:1");
    assert.match(g.event?.body ?? "", /prepare to move on/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.hull, hull);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("simply fire pays low scrap and does not apply the 5 hull result", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const bars = g.player.rooms.map((r) => r.breach);
      open(g);
      fillerChoose(g, "c:malfunctioning-defense-system:0");
      assert.match(g.event?.body ?? "", /consider your options/);
      assert.deepEqual(g.event?.choices.map((c) => c.id), ["c:malfunctioning-defense-system:2"]);
      fillerChoose(g, "c:malfunctioning-defense-system:2");
      const body = g.event?.body ?? "";
      assert.match(body, /no match for your weapons/);
      assert.equal(/aren't able to penetrate/.test(body), false);
      assert.equal(g.player.hull, hull);
      assert.deepEqual(g.player.rooms.map((r) => r.breach), bars);
      standard(body, [7, 10]);
    }
  });

  it("an ion weapon, including Ion Bomb and Stun Bomb, pays high scrap and wastes no missile", () => {
    for (const defId of ["needle", "ionbomb", "stunbomb"]) {
      const g = createGame(3);
      arm(g, defId);
      g.missiles = 4;
      open(g);
      fillerChoose(g, "c:malfunctioning-defense-system:0");
      assert.ok(g.event?.choices.some((c) => c.id === "c:malfunctioning-defense-system:3"));
      fillerChoose(g, "c:malfunctioning-defense-system:3");
      const body = g.event?.body ?? "";
      assert.match(body, /I've never seen a weapon like that before/);
      standard(body, [19, 23]);
      assert.ok(g.missiles >= 4);
    }
  });

  it("shows each cloaking option the installed level meets", () => {
    const plain = createGame(4);
    plain.player.kits.veil = cloak(1);
    open(plain);
    fillerChoose(plain, "c:malfunctioning-defense-system:0");
    assert.deepEqual(
      plain.event?.choices.map((c) => c.id),
      ["c:malfunctioning-defense-system:2", "c:malfunctioning-defense-system:4"],
    );
    fillerChoose(plain, "c:malfunctioning-defense-system:4");
    const low = plain.event?.body ?? "";
    assert.match(low, /cloaking gives out/);
    standard(low, [7, 10]);

    const improved = createGame(5);
    improved.player.kits.veil = cloak(2);
    open(improved);
    fillerChoose(improved, "c:malfunctioning-defense-system:0");
    assert.deepEqual(
      improved.event?.choices.map((c) => c.id),
      ["c:malfunctioning-defense-system:2", "c:malfunctioning-defense-system:4", "c:malfunctioning-defense-system:5"],
    );
    fillerChoose(improved, "c:malfunctioning-defense-system:5");
    const mid = improved.event?.body ?? "";
    assert.match(mid, /sloppy job/);
    standard(mid, [12, 19]);

    const advanced = createGame(6);
    advanced.player.kits.veil = cloak(3);
    open(advanced);
    fillerChoose(advanced, "c:malfunctioning-defense-system:0");
    assert.deepEqual(
      advanced.event?.choices.map((c) => c.id),
      [
        "c:malfunctioning-defense-system:2",
        "c:malfunctioning-defense-system:4",
        "c:malfunctioning-defense-system:5",
        "c:malfunctioning-defense-system:6",
      ],
    );
    fillerChoose(advanced, "c:malfunctioning-defense-system:6");
    const high = advanced.event?.body ?? "";
    assert.match(high, /safely disable the system/);
    standard(high, [19, 23]);
  });

  it("an Engi crewmember pays high scrap", () => {
    const g = createGame(7);
    g.crew[0].kin = "shell";
    open(g);
    fillerChoose(g, "c:malfunctioning-defense-system:0");
    assert.ok(g.event?.choices.some((c) => c.id === "c:malfunctioning-defense-system:7"));
    fillerChoose(g, "c:malfunctioning-defense-system:7");
    const body = g.event?.body ?? "";
    assert.match(body, /remotely fix the glitch/);
    standard(body, [19, 23]);
  });
});
