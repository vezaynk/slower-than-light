import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

const INTROS = [
  "You arrive at the beacon and immediately detect a pirate ship. It seems this distress beacon was a trap!",
  "\"Haha! I knew someone would fall into our dastardly trap!\" It appears this distress beacon was nothing but a decoy for a pirate ambush.",
  "Your cockpit lights up with warning signals. You are being targeted by a nearby ship. The distress call was a lure to attract unwitting ships into weapons range. You prepare for a fight.",
  "As soon as you arrive at the distress signal, shots are fired toward your ship. A trap!",
];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Pirate ship distress trap",
    tier: "",
    flag: "filler:pirate-ship-distress-trap",
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

describe("Pirate ship distress trap", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Pirate ship distress trap")?.slug, "pirate-ship-distress-trap");
    const ev = open(createGame(1));
    assert.deepEqual(ev.choices.map((c) => c.id), ["c:pirate-ship-distress-trap:0"]);
  });

  it("shows one of the four printed intros", () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 40 && seen.size < INTROS.length; seed++) {
      const body = open(createGame(seed)).body;
      const hit = INTROS.indexOf(body);
      assert.ok(hit >= 0, body);
      seen.add(hit);
    }
    assert.equal(seen.size, INTROS.length);
  });

  it("starts a pirate fight and pays nothing up front", () => {
    const g = createGame(3);
    const hull = g.player.hull;
    open(g);
    const body = g.event?.body ?? "";
    fillerChoose(g, "c:pirate-ship-distress-trap:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.event, null);
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.scrap, 10);
    assert.equal(g.player.hull, hull);
    assert.ok(g.log.some((line) => line.includes(body.slice(0, 24))));
  });

  it("starts the Pirate ship on arrival and leaves no button", () => {
    // The page has no choice. One of the four printed intros, then "Fight a Pirate ship." distress=true. unique=true.
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:pirate-ship-distress-trap";
    dest.name = "Pirate ship distress trap";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.pirate, true);
    assert.equal(g.fightEvent, "pirate-ship-distress-trap");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});
