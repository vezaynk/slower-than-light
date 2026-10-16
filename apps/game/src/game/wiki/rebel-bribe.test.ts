import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, loadPack, resetPackForTests } from "@stl/pack";
import { choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";
import { bribeBand } from "./event-bribes.ts";

afterEach(() => resetPackForTests());

function beacon(g: Game): Beacon {
  const found = g.beacons.find((item) => item.kind !== "start" && item.kind !== "exit" && item.kind !== "boss");
  assert.ok(found);
  return found;
}

function open(g: Game) {
  const here = beacon(g);
  here.flag = "cited:rebel-checkpoint";
  here.name = "Rebel checkpoint";
  g.here = here.id;
  g.event = citedEvent(g, here);
  g.phase = "event";
}

describe("rebel bribe band", () => {
  it("packs the checkpoint band and pays an appended price", () => {
    assert.deepEqual(eventDef("rebel-checkpoint")?.bribe, { k: "scrap", lo: 10, hi: 15 });
    assert.deepEqual(bribeBand("rebel-checkpoint"), [10, 15]);

    const row = eventDef("rebel-checkpoint");
    assert.ok(row);
    loadPack({ events: [{ ...row, bribe: { k: "scrap", lo: 8, hi: 8 } }] }, "append");
    const fixed = createGame(1);
    open(fixed);
    const id = fixed.event?.choices.find((choice) => choice.id.startsWith("q:rebel-checkpoint:bribe:"))?.id;
    assert.equal(id, "q:rebel-checkpoint:bribe:8");
    fixed.scrap = 40;
    choose(fixed, "q:rebel-checkpoint:bribe:8");
    assert.equal(fixed.scrap, 32);
    fixed.scrap = 100;
    choose(fixed, "q:rebel-checkpoint:bribe:12");
    assert.equal(fixed.scrap, 100);

    const wide = eventDef("rebel-checkpoint");
    assert.ok(wide);
    loadPack({ events: [{ ...wide, bribe: { k: "scrap", lo: 20, hi: 30 } }] }, "append");
    const rolled = createGame(2);
    open(rolled);
    const cost = Number(
      rolled.event?.choices.find((choice) => choice.id.startsWith("q:rebel-checkpoint:bribe:"))?.id.split(":").at(-1),
    );
    assert.ok(cost >= 20 && cost <= 30, String(cost));
    rolled.scrap = 100;
    choose(rolled, `q:rebel-checkpoint:bribe:${cost}`);
    assert.equal(rolled.scrap, 100 - cost);

    loadPack({ events: [{ ...row, bribe: undefined }] }, "append");
    const quiet = createGame(3);
    open(quiet);
    assert.equal(
      quiet.event?.choices.some((choice) => choice.id.startsWith("q:rebel-checkpoint:bribe:")),
      false,
    );
    assert.equal(bribeBand("rebel-checkpoint"), null);

    resetPackForTests();
    assert.deepEqual(bribeBand("rebel-checkpoint"), [10, 15]);

    loadPack(
      {
        events: [
          {
            id: "ember-bribe",
            dest: "ember-bribe",
            flag: "cited:ember-bribe",
            aliases: [],
            sectors: [],
            body: "",
            choices: [],
            bribe: { k: "scrap", lo: 4, hi: 6 },
          },
        ],
      },
      "append",
    );
    assert.deepEqual(bribeBand("ember-bribe"), [4, 6]);
    resetPackForTests();
    assert.equal(bribeBand("ember-bribe"), null);
  });
});
