import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "A Slug ship hails you: \"We've detected some worrying radiation coming from your medical unit, perhaps you should take a look?\" As he signs off, your medical bay shuts off and their crew teleports aboard from a nearby station. They don't look like engineers.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-medical";
  b.name = "Slug hacker (medical)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Slug hacker (medical) opening", () => {
  it("prints the radiation hail and keeps the continue choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Slug hacker (medical)");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:slug-hacker-medical:0"));
  });
});
