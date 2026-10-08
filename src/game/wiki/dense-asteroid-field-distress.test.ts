import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:dense-asteroid-field-distress";
  b.name = "Dense asteroid field distress";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Dense asteroid field distress");
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function resourcesPaid(body: string): number {
  const got = reward(body);
  return [got.fuel, got.missiles, got.parts].filter((n) => n > 0).length;
}

describe("Dense asteroid field distress", () => {
  it("avoiding the field spends nothing", () => {
    const g = createGame(1);
    const hull = g.player.hull;
    open(g);
    fillerChoose(g, "c:dense-asteroid-field-distress:1");
    assert.match(g.event?.body ?? "", /Discretion is the better part of valor/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    assert.equal(g.player.systems.engines?.damage ?? 0, 0);
  });

  it("searching hits the hull and engines, pays random scrap, or opens the remains", () => {
    let hit = false;
    let scrap = false;
    let remains = false;
    for (let seed = 1; seed <= 80 && (!hit || !scrap || !remains); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:dense-asteroid-field-distress:0");
      const body = g.event?.body ?? "";
      if (/pull out/.test(body)) {
        hit = true;
        assert.equal(g.player.hull, hull - 5);
        assert.equal(g.player.systems.engines?.damage, 1);
        assert.match(body, /Hull damage: 5/);
        assert.match(body, /1 damage to engines/);
        assert.equal(g.scrap, 10);
        assert.equal(g.player.weapons.length, guns);
      } else if (/pirate ship, damaged and abandoned/.test(body)) {
        scrap = true;
        const got = reward(body);
        assert.ok(got.scrap >= 7 && got.scrap <= 23, body);
        assert.equal(resourcesPaid(body), 2, body);
        assert.equal(g.player.hull, hull);
        assert.equal(g.player.weapons.length, guns);
      } else {
        remains = true;
        assert.match(body, /decaying remains/);
        assert.match(body, /stasis pod/);
        assert.equal(g.event?.choices.map((c) => c.id).join(","), "s:dense-asteroid-field-distress:weapon,s:dense-asteroid-field-distress:pod");
        assert.equal(g.scrap, 10);
        assert.equal(g.player.hull, hull);
        assert.equal(g.player.weapons.length, guns);
      }
    }
    assert.equal(hit && scrap && remains, true);
  });

  it("taking the unnamed weapon pays low scrap and does not mount it", () => {
    const g = createGame(2);
    g.augments.push("keel");
    const guns = g.player.weapons.map((w) => w.defId);
    open(g);
    assert.equal(choiceDisabled(g, "c:dense-asteroid-field-distress:2"), null);
    fillerChoose(g, "c:dense-asteroid-field-distress:2");
    assert.match(g.event?.body ?? "", /decaying remains/);
    fillerChoose(g, "s:dense-asteroid-field-distress:weapon");
    const body = g.event?.body ?? "";
    const got = reward(body);
    assert.match(body, /grabs what they can/);
    assert.ok(got.scrap >= 7 && got.scrap <= 10, body);
    assert.equal(got.fuel, 0);
    assert.equal(got.missiles, 0);
    assert.equal(got.parts, 0);
    assert.deepEqual(g.player.weapons.map((w) => w.defId), guns);
    assert.equal(g.augments.includes("stasis"), false);
  });

  it("grabbing the pod mounts Damaged Stasis Pod with low scrap, and a full list does not take a fourth", () => {
    const g = createGame(3);
    g.augments.push("keel");
    open(g);
    fillerChoose(g, "c:dense-asteroid-field-distress:2");
    fillerChoose(g, "s:dense-asteroid-field-distress:pod");
    const body = g.event?.body ?? "";
    const got = reward(body);
    assert.match(body, /shards of crystal/);
    assert.match(body, /Damaged Stasis Pod/);
    assert.ok(got.scrap >= 7 && got.scrap <= 10, body);
    assert.equal(g.augments.filter((id) => id === "stasis").length, 1);

    const full = createGame(4);
    full.augments.push("keel", "glass", "hook");
    open(full);
    fillerChoose(full, "c:dense-asteroid-field-distress:2");
    fillerChoose(full, "s:dense-asteroid-field-distress:pod");
    assert.match(full.event?.body ?? "", /Three augments is the cap/);
    assert.equal(full.augments.includes("stasis"), false);
    assert.equal(full.augments.length, 3);
    const paid = reward(full.event?.body ?? "");
    assert.ok(paid.scrap >= 7 && paid.scrap <= 10, full.event?.body);
  });

  it("refuses the thorough search without Rock Plating", () => {
    const g = createGame(5);
    const hull = g.player.hull;
    open(g);
    assert.equal(choiceDisabled(g, "c:dense-asteroid-field-distress:2"), "Needs Rock Plating");
    fillerChoose(g, "c:dense-asteroid-field-distress:2");
    assert.equal(g.event?.title, "Dense asteroid field distress");
    assert.match(g.event?.body ?? "", /distress call/);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    assert.equal(g.augments.includes("stasis"), false);
  });
});
