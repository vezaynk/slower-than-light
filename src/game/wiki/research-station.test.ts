import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";

const DOCK = "c:research-station-with-no-response:0";
const LEAVE = "c:research-station-with-no-response:1";
const DRONE = "c:research-station-with-no-response:2";
const SCAN = "c:research-station-with-no-response:3";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:research-station-with-no-response";
  b.name = "Research station with no response";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Research station with no response");
}

function drone(kind: string): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: kind, on: false, aux: 0 };
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Research station with no response", () => {
  it("is one pirate sector card with the arrival sentence", () => {
    const pages = citedPagesFor("Pirate Controlled Sector").filter((p) => p.dest === "Research station with no response");
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0]?.sectors, ["Pirate Controlled Sector"]);
    const g = createGame(1);
    open(g);
    assert.match(g.event?.body ?? "", /no response to your hails/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      [
        "Dock with the station and investigate.",
        "Leave it alone.",
        "Send your battle drone in to help.",
        "Run advanced life scans.",
      ],
    );
  });

  it("docking reaches the struggle, the survivor, or the cough", () => {
    let parts = false;
    let survivor = false;
    let cough = false;
    for (let seed = 1; seed <= 40 && (!parts || !survivor || !cough); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, DOCK);
      const body = g.event?.body ?? "";
      assert.equal(g.phase, "event");
      if (body.includes("brutally dismembered")) {
        parts = true;
        const paid = scraps(body);
        assert.equal(paid.length, 1);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.match(body, /Drone parts: 1/);
      } else if (body.includes("frantic person")) {
        survivor = true;
        assert.match(body, /Prepare for a fight|joins the crew|crewmember/);
      } else {
        cough = true;
        assert.match(body, /starts to cough/);
      }
    }
    assert.equal(parts, true);
    assert.equal(survivor, true);
    assert.equal(cough, true);
  });

  it("leaving shows nothing and spends nothing", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    choose(g, LEAVE);
    assert.equal(g.event?.body, "Nothing happens.");
    assert.equal(g.scrap, scrap);
    assert.equal(g.phase, "event");
  });

  it("the battle drone stays closed until an Anti-Personnel drone is fitted", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, DRONE), "Needs an Anti-Personnel Drone");
    choose(bare, DRONE);
    assert.match(bare.event?.body ?? "", /no response to your hails/);
    assert.equal(bare.scrap, 10);

    const broke = createGame(2);
    open(broke);
    broke.player.kits.swarm = drone("antipersonnel");
    broke.player.parts = 0;
    assert.equal(choiceDisabled(broke, DRONE), null);
  });

  it("nothing spends one part, and medium scrap skips that part when the reward includes drone parts", () => {
    let tear = false;
    let mob = false;
    let charged = false;
    let waived = false;
    for (let seed = 1; seed <= 80 && (!tear || !mob || !charged || !waived); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.swarm = drone("antipersonnel");
      g.player.parts = 4;
      choose(g, DRONE);
      const body = g.event?.body ?? "";
      if (body.includes("tear each other")) {
        tear = true;
        assert.match(body, /Nothing happens/);
        assert.match(body, /Drone parts: -1/);
        assert.equal(g.player.parts, 3);
        assert.equal(g.scrap, 10);
      } else if (body.includes("torn apart")) {
        mob = true;
        assert.match(body, /Nothing happens/);
        assert.equal(g.player.parts, 3);
      } else if (body.includes("cameras mounted")) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        if (/Drone parts: -1/.test(body)) {
          charged = true;
          assert.equal(g.player.parts, 3);
        } else {
          waived = true;
          assert.match(body, /Drone parts: \d+/);
          assert.ok(g.player.parts > 4);
        }
      } else {
        assert.fail(body);
      }
    }
    assert.equal(tear, true);
    assert.equal(mob, true);
    assert.equal(charged, true);
    assert.equal(waived, true);
  });

  it("with no parts, a reward that includes drone parts still runs and a nothing roll does not", () => {
    let ran = false;
    let held = false;
    for (let seed = 1; seed <= 80 && (!ran || !held); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.swarm = drone("antipersonnel");
      g.player.parts = 0;
      const scrap = g.scrap;
      choose(g, DRONE);
      const body = g.event?.body ?? "";
      if (body.includes("cameras mounted")) {
        ran = true;
        assert.ok(g.player.parts > 0);
        assert.match(body, /Drone parts: \d+/);
        assert.equal(/Drone parts: -1/.test(body), false);
      } else {
        held = true;
        assert.match(body, /no response to your hails/);
        assert.equal(g.player.parts, 0);
        assert.equal(g.scrap, scrap);
      }
    }
    assert.equal(ran, true);
    assert.equal(held, true);
  });

  it("the life scan stays closed without a Lifeform Scanner, then pays medium scrap or nothing", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, SCAN), "Needs a Lifeform Scanner");
    choose(bare, SCAN);
    assert.match(bare.event?.body ?? "", /no response to your hails/);

    let clear = false;
    let life = false;
    for (let seed = 1; seed <= 40 && (!clear || !life); seed++) {
      const g = createGame(seed);
      open(g);
      g.augments = ["pulseeye"];
      const parts = g.player.parts;
      choose(g, SCAN);
      const body = g.event?.body ?? "";
      if (body.includes("no life signs")) {
        clear = true;
        const paid = scraps(body);
        assert.equal(paid.length, 1);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
      } else {
        life = true;
        assert.match(body, /violent and unstable/);
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.equal(g.player.parts, parts);
      }
    }
    assert.equal(clear, true);
    assert.equal(life, true);
  });
});
