import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "You stumble across a Rebel ship distributing supplies to local civilian colonies. It's probably not anything military grade, but every little bit helps...",
  "You find a Rebel combat ship that has been reassigned as an emergency supply vessel. The local civilians are apparently in need of help, and the Rebels are rising to the occasion.",
  "The Rebels in this system are doing supply runs for the local space stations. These civilians have likely been out of supply for months due to the war and are in desperate need.",
  "Civilian colonists loyal to the Rebel cause are present on a nearby planet. It looks like they are currently receiving a supply shipment. Could be useful.",
  "Because of the war, thousands of colonists have had their supply lines disrupted and have found themselves in dire straits. It seems in this system, the Rebels are sympathetic and are distributing what little supplies they can spare.",
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-supplying-civilians";
  b.name = "Rebel ship supplying civilians";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel ship supplying civilians");
}

describe("Rebel ship supplying civilians intro", () => {
  it("shows one of the five printed intros, with Attack and Leave still available", () => {
    assert.equal(INTROS.length, 5);
    assert.equal(new Set(INTROS).size, 5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-supplying-civilians:0"));
      assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-ship-supplying-civilians:1"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);
  });
});
