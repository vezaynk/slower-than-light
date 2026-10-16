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
    // Wiki citations:
    // > "Avoid the area." — [[Dense asteroid field distress]]
    // > "Discretion is the better part of valor. Better not risk it." — [[Dense asteroid field distress]]
    // > "Nothing happens." — [[Dense asteroid field distress]]
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
    // Wiki citations:
    // > "Search for the ship." — [[Dense asteroid field distress]]
    // > "You find what appears to be pieces of a derelict ship coated with ice or crystal." — [[Dense asteroid field distress]]
    // > "Your ship takes 5 hull damage, 1 damage to engines." — [[Dense asteroid field distress]]
    // > "You find a pirate ship, damaged and abandoned. You salvage what you can and move on." — [[Dense asteroid field distress]]
    // > "You receive a random amount of scrap with resources." — [[Dense asteroid field distress]]
    // > "You find the decaying remains of some kind of ship coated with ice or crystal." — [[Dense asteroid field distress#Find remains of a ship]]
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

  // Rewards, "Weapon": "A random weapon & T scrap."
  it("taking the unnamed weapon pays low scrap and grants a random weapon", () => {
    // Wiki citations:
    // > "Take the weapon and any spare scrap." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "Your crew grabs what they can and returns to the ship before the asteroid hits." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "You receive a weapon with low scrap." — [[Dense asteroid field distress#Find remains of a ship]]
    const g = createGame(2);
    g.augments.push("ROCK_ARMOR");
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
    const added = g.player.weapons.map((w) => w.defId).filter((id) => !guns.includes(id));
    const stowed = (g.cargo ?? []).filter((c) => c.kind === "weapon");
    assert.equal(added.length + stowed.length, 1, body);
    assert.match(body, /mounted\.|stowed in cargo/);
    assert.equal(g.augments.includes("STASIS_POD"), false);
  });

  it("grabbing the pod mounts Damaged Stasis Pod with low scrap, and a full list asks what to leave behind", () => {
    // Wiki citations:
    // > "Grab the stasis chamber." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "The pod appears to be functioning but you see nothing but shards of crystal inside." — [[Dense asteroid field distress#Find remains of a ship]]
    // > "You receive Damaged Stasis Pod augmentation with low scrap." — [[Dense asteroid field distress#Find remains of a ship]]
    const g = createGame(3);
    g.augments.push("ROCK_ARMOR");
    open(g);
    fillerChoose(g, "c:dense-asteroid-field-distress:2");
    fillerChoose(g, "s:dense-asteroid-field-distress:pod");
    const body = g.event?.body ?? "";
    const got = reward(body);
    assert.match(body, /shards of crystal/);
    assert.match(body, /Damaged Stasis Pod/);
    assert.ok(got.scrap >= 7 && got.scrap <= 10, body);
    assert.equal(g.augments.filter((id) => id === "STASIS_POD").length, 1);

    const full = createGame(4);
    full.augments.push("ROCK_ARMOR", "ADV_SCANNERS", "SCRAP_COLLECTOR");
    open(full);
    fillerChoose(full, "c:dense-asteroid-field-distress:2");
    fillerChoose(full, "s:dense-asteroid-field-distress:pod");
    // Augmentations: a full rack asks which one to leave behind (make-room.ts).
    assert.match(full.event?.body ?? "", /choose what to leave behind/);
    assert.equal(full.augments.includes("STASIS_POD"), false);
    assert.equal(full.augments.length, 3);
    assert.deepEqual(full.overflow, [{ kind: "augment", id: "STASIS_POD" }]);
    const paid = reward(full.event?.body ?? "");
    assert.ok(paid.scrap >= 7 && paid.scrap <= 10, full.event?.body);
  });

  it("refuses the thorough search without Rock Plating", () => {
    // Wiki citations:
    // > "Make a thorough search for the ship without fear of stray asteroids." — [[Dense asteroid field distress]]
    // > "A ship without life forms within a nearby dense asteroid field is giving off the distress call." — [[Dense asteroid field distress]]
    const g = createGame(5);
    const hull = g.player.hull;
    open(g);
    assert.equal(choiceDisabled(g, "c:dense-asteroid-field-distress:2"), "Needs Rock Plating");
    fillerChoose(g, "c:dense-asteroid-field-distress:2");
    assert.equal(g.event?.title, "Dense asteroid field distress");
    assert.match(g.event?.body ?? "", /distress call/);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    assert.equal(g.augments.includes("STASIS_POD"), false);
  });
});
