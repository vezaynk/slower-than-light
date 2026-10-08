import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { mediumScrapBand } from "../content.ts";
import { citedEvent } from "./cited-events.ts";

const BODY =
  "You find two heavily damaged ships floating nearby, the remains of a battle. You begin to harvest some usable debris when you hear the sounds of someone beaming aboard followed by the shouts of a boarding party.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:boarders-humans-in-plasma-storm";
  b.name = "Boarders: Humans in plasma storm";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Boarders: Humans in plasma storm opening", () => {
  it("prints the boarding-party sentence and keeps the scrap choice", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Boarders: Humans in plasma storm");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.ok(g.event?.choices.some((c) => c.id === "c:boarders-humans-in-plasma-storm:0"));
  });

  it("applies the red line on arrival and leaves no button", () => {
    // The page has no choice. Medium scrap with resources, and "3-4 human boarders beam aboard your ship."
    // Resource amounts are not stated.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:boarders-humans-in-plasma-storm";
    dest.name = "Boarders: Humans in plasma storm";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    const scrap = g.scrap;
    const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const gained = g.scrap - scrap;
    assert.ok(gained >= lo && gained <= hi, String(gained));
    const humans = g.crew.filter((c) => c.side === "enemy" && c.kin === "plain" && c.aboard === "player");
    assert.ok(humans.length >= 3 && humans.length <= 4, String(humans.length));
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
    assert.ok(g.log.some((line) => line.startsWith("Medium scrap: ")));
  });
});
