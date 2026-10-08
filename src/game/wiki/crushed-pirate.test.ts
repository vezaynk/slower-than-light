import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
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
    name: "Crushed pirate",
    tier: "",
    flag: "filler:crushed-pirate",
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

function gun(defId: string) {
  return { uid: defId, defId, charge: 0, enabled: false, autofire: false, target: null };
}

function kit(id: Kit["id"], extra: Partial<Kit> = {}): Kit {
  return { id, level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0, ...extra };
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function systemDamage(g: Game): number {
  return Object.values(g.player.systems).reduce((n, sys) => n + (sys?.damage ?? 0), 0);
}

function lowPair(got: { fuel: number; missiles: number; parts: number }) {
  const present = [got.fuel > 0, got.missiles > 0, got.parts > 0].filter(Boolean).length;
  assert.equal(present, 2);
  if (got.fuel) assert.ok(got.fuel >= 1 && got.fuel <= 3);
  if (got.missiles) assert.ok(got.missiles >= 1 && got.missiles <= 2);
  if (got.parts) assert.equal(got.parts, 1);
}

describe("Crushed pirate", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Crushed pirate")?.slug, "crushed-pirate");
  });

  it("hides the beam choices until that gear is fitted", () => {
    const plain = createGame(1);
    const ev = open(plain);
    assert.match(ev.body, /pirate markings/);
    assert.deepEqual(ev.choices.map((c) => c.id), ["c:crushed-pirate:0", "c:crushed-pirate:1"]);
    assert.equal(choiceDisabled(plain, "c:crushed-pirate:2"), "Needs a beam weapon");
    assert.equal(choiceDisabled(plain, "c:crushed-pirate:3"), "Needs a beam drone");

    const pike = createGame(1);
    pike.player.weapons.push(gun("shear"));
    assert.ok(open(pike).choices.some((c) => c.id === "c:crushed-pirate:2"));

    const fire = createGame(1);
    fire.player.weapons.push(gun("firebeam"));
    assert.equal(open(fire).choices.some((c) => c.id === "c:crushed-pirate:2"), false);

    const anti = createGame(1);
    anti.player.weapons.push(gun("antibio"));
    assert.equal(open(anti).choices.some((c) => c.id === "c:crushed-pirate:2"), false);

    const lance = createGame(1);
    lance.player.kits.lance = kit("lance");
    assert.ok(open(lance).choices.some((c) => c.id === "c:crushed-pirate:2"));

    const beam = createGame(1);
    beam.player.kits.swarm = kit("swarm", { target: "beam" });
    assert.ok(open(beam).choices.some((c) => c.id === "c:crushed-pirate:3"));

    const mark2 = createGame(1);
    mark2.player.kits.swarm = kit("swarm", { target: null, loadout: ["beam2"] });
    assert.ok(open(mark2).choices.some((c) => c.id === "c:crushed-pirate:3"));

    const fired = createGame(1);
    fired.player.kits.swarm = kit("swarm", { target: "fire" });
    assert.equal(open(fired).choices.some((c) => c.id === "c:crushed-pirate:3"), false);
  });

  it("shooting the rocks deals 2 hull and 2 system damage with low scrap, or medium scrap", () => {
    let shock = false;
    let freed = false;
    for (let seed = 1; seed <= 40 && (!shock || !freed); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const broken = systemDamage(g);
      open(g);
      fillerChoose(g, "c:crushed-pirate:0");
      const body = g.event?.body ?? "";
      if (/mineral patch/.test(body)) {
        shock = true;
        assert.equal(g.player.hull, hull - 2);
        const applied = systemDamage(g) - broken;
        assert.ok(applied >= 1 && applied <= 2);
        assert.match(body, /damage to /);
        const got = reward(body);
        assert.ok(got.scrap >= 7 && got.scrap <= 10);
        assert.equal(got.fuel, 0);
        assert.equal(got.missiles, 0);
        assert.equal(g.fuel, 16);
      } else {
        freed = true;
        assert.match(body, /pulls free/);
        assert.equal(g.player.hull, hull);
        const got = reward(body);
        assert.ok(got.scrap >= 12 && got.scrap <= 19);
        lowPair(got);
      }
    }
    assert.equal(shock && freed, true);
  });

  it("looting pays medium scrap or starts a pirate fight", () => {
    let loot = false;
    let fight = false;
    for (let seed = 1; seed <= 40 && (!loot || !fight); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      open(g);
      fillerChoose(g, "c:crushed-pirate:1");
      if (g.phase === "combat") {
        fight = true;
        assert.ok(g.enemy);
        assert.equal(g.player.hull, hull);
        assert.match(g.log.join(" "), /charging weapons/);
      } else {
        loot = true;
        assert.match(g.event?.body ?? "", /loot the remains/);
        const got = reward(g.event?.body ?? "");
        assert.ok(got.scrap >= 12 && got.scrap <= 19);
        lowPair(got);
        assert.equal(g.player.hull, hull);
      }
    }
    assert.equal(loot && fight, true);
  });

  it("a cutting beam pays medium scrap with resources", () => {
    const g = createGame(3);
    g.player.weapons.push(gun("shear"));
    const hull = g.player.hull;
    const weapons = g.player.weapons.length;
    open(g);
    fillerChoose(g, "c:crushed-pirate:2");
    const body = g.event?.body ?? "";
    assert.match(body, /precision cuts/);
    assert.equal(g.player.hull, hull);
    assert.equal(g.player.weapons.length, weapons);
    const got = reward(body);
    assert.ok(got.scrap >= 12 && got.scrap <= 19);
    lowPair(got);
  });

  it("a beam drone skips the part when the reward includes drone parts", () => {
    let failed = false;
    let kept = false;
    let spent = false;
    for (let seed = 1; seed <= 50 && (!failed || !kept || !spent); seed++) {
      const dry = createGame(seed);
      dry.player.kits.swarm = kit("swarm", { target: "beam" });
      dry.player.parts = 0;
      dry.augments = ["weld"];
      dry.player.hull = dry.player.hullMax - 4;
      const hull = dry.player.hull;
      const ev = open(dry);
      fillerChoose(dry, "c:crushed-pirate:3");
      if (dry.event === ev) {
        failed = true;
        assert.equal(dry.player.parts, 0);
        assert.equal(dry.player.hull, hull);
        assert.equal(dry.log.some((line) => line.includes("Repair Arm")), false);
      } else kept = true;

      const stocked = createGame(seed);
      stocked.player.kits.swarm = kit("swarm", { target: "beam" });
      stocked.player.parts = 5;
      const hull2 = stocked.player.hull;
      open(stocked);
      fillerChoose(stocked, "c:crushed-pirate:3");
      const body = stocked.event?.body ?? "";
      assert.match(body, /slip out of its cage/);
      assert.equal(stocked.player.hull, hull2);
      const got = reward(body);
      assert.ok(got.scrap >= 12 && got.scrap <= 19);
      if (stocked.player.parts === 6) {
        kept = true;
        assert.equal(got.parts, 1);
        assert.equal(/Drone parts: -1/.test(body), false);
      } else {
        spent = true;
        assert.equal(stocked.player.parts, 4);
        assert.match(body, /Drone parts: -1/);
        assert.ok(got.fuel >= 1 && got.fuel <= 3);
        assert.ok(got.missiles >= 1 && got.missiles <= 2);
      }
    }
    assert.equal(failed && kept && spent, true);
  });
});
