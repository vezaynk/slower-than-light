import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game, Kit } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";
import { heldSchematics } from "./make-room.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Fire on research station",
    tier: "",
    flag: "filler:fire-on-research-station",
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

function scrapOnly(body: string, lo: number, hi: number) {
  const got = reward(body);
  assert.ok(got.scrap >= lo && got.scrap <= hi, body);
  assert.equal(got.fuel, 0);
  assert.equal(got.missiles, 0);
  assert.equal(got.parts, 0);
}

function systemDamage(g: Game): number {
  return Object.values(g.player.systems).reduce((n, sys) => n + (sys?.damage ?? 0), 0);
}

function repairDrone(): Kit {
  return { id: "drones", level: 2, power: 2, left: 0, cool: 0, target: "REPAIR", on: false, aux: 0 };
}

describe("Fire on research station", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Fire on research station")?.slug, "fire-on-research-station");
  });

  it("hides the Rock and repair drone until they are aboard", () => {
    const plain = createGame(1);
    assert.deepEqual(open(plain).choices.map((c) => c.id), [
      "c:fire-on-research-station:0",
      "c:fire-on-research-station:1",
      "c:fire-on-research-station:2",
    ]);
    assert.equal(choiceDisabled(plain, "c:fire-on-research-station:3"), "Needs a Rock crewmember");
    assert.equal(choiceDisabled(plain, "c:fire-on-research-station:4"), "Needs a Repair Drone");

    const rock = createGame(1);
    rock.crew[0].kin = "rock";
    assert.ok(open(rock).choices.some((c) => c.id === "c:fire-on-research-station:3"));

    const drone = createGame(1);
    drone.player.kits.drones = repairDrone();
    assert.ok(open(drone).choices.some((c) => c.id === "c:fire-on-research-station:4"));
  });

  it("sending the crew loses one with low scrap, or pays high scrap", () => {
    let lost = false;
    let paid = false;
    for (let seed = 1; seed <= 40 && (!lost || !paid); seed++) {
      const g = createGame(seed);
      const crew = g.crew.length;
      open(g);
      fillerChoose(g, "c:fire-on-research-station:0");
      const body = g.event?.body ?? "";
      if (/fuel cell/.test(body)) {
        lost = true;
        assert.equal(g.crew.length, crew - 1);
        assert.match(body, /is lost/);
        scrapOnly(body, 7, 10);
      } else {
        paid = true;
        assert.match(body, /drop them off/);
        assert.equal(g.crew.length, crew);
        scrapOnly(body, 19, 23);
      }
    }
    assert.equal(lost && paid, true);
  });

  it("a clone bay revives the crewmember lost in the fire", () => {
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.clonebay = { id: "clonebay", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = g.crew.length;
      open(g);
      fillerChoose(g, "c:fire-on-research-station:0");
      if (!/fuel cell/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.match(g.event?.body ?? "", /revived/);
      assert.equal(g.crew.length, crew);
      scrapOnly(g.event?.body ?? "", 7, 10);
    }
    assert.equal(seen, true);
  });

  it("docking deals 4 hull and 1 system damage, or Dr. Jones joins", () => {
    let blast = false;
    let jones = false;
    for (let seed = 1; seed <= 40 && (!blast || !jones); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const broken = systemDamage(g);
      const crew = g.crew.length;
      open(g);
      fillerChoose(g, "c:fire-on-research-station:1");
      const body = g.event?.body ?? "";
      if (/huge blast/.test(body)) {
        blast = true;
        assert.equal(g.player.hull, hull - 4);
        assert.equal(systemDamage(g) - broken, 1);
        assert.match(body, /System damage: /);
        scrapOnly(body, 7, 10);
      } else {
        jones = true;
        assert.match(body, /Dr. Jones joins you/);
        assert.ok(g.crew.some((c) => c.name === "Dr. Jones" && c.side === "player"));
        assert.equal(g.crew.length, crew + 1);
        assert.equal(g.player.hull, hull);
        scrapOnly(body, 7, 10);
      }
    }
    assert.equal(blast && jones, true);
  });

  it("leaving spends nothing", () => {
    const g = createGame(2);
    const crew = g.crew.length;
    open(g);
    fillerChoose(g, "c:fire-on-research-station:2");
    assert.match(g.event?.body ?? "", /nothing could have been done/);
    assert.equal(g.scrap, 10);
    assert.equal(g.crew.length, crew);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  // Rewards, "Augment": "A random augmentation & T scrap."
  it("a Rock pays high scrap and installs a random augment", () => {
    const g = createGame(3);
    g.crew[0].kin = "rock";
    g.augments = ["SCRAP_COLLECTOR"];
    const weapons = g.player.weapons.length;
    open(g);
    fillerChoose(g, "c:fire-on-research-station:3");
    assert.match(g.event?.body ?? "", /fire suppressant/);
    scrapOnly(g.event?.body ?? "", 19, 23);
    assert.equal(g.augments.length, 2);
    assert.equal(g.augments[0], "SCRAP_COLLECTOR");
    assert.match(g.event?.body ?? "", / fitted\.$/);
    assert.equal(g.player.weapons.length, weapons);
  });

  // Rewards, "Drone": "A random drone schematic & T scrap."
  it("a repair drone pays high scrap and grants a random schematic", () => {
    const g = createGame(4);
    g.player.kits.drones = repairDrone();
    const held = heldSchematics(g).length;
    const weapons = g.player.weapons.length;
    open(g);
    fillerChoose(g, "c:fire-on-research-station:4");
    assert.match(g.event?.body ?? "", /repair drone/);
    scrapOnly(g.event?.body ?? "", 19, 23);
    assert.equal(g.player.kits.drones.target, "REPAIR");
    assert.equal(heldSchematics(g).length, held + 1);
    assert.match(g.event?.body ?? "", /schematic (fitted|stowed in cargo)\.$/);
    assert.equal(g.player.weapons.length, weapons);
  });
});
