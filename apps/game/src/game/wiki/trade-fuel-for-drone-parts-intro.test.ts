import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  `A nearby space station hails you. "Greetings! Your arrival is most fortuitous. We recently came across some extra drones. If you have some fuel, perhaps we can make a deal?"`,
  `A strange vessel approaches. A digital message appears on your view-screen: "This is an automated merchant. Refill this vessel with fuel and it will supply you with drones."`,
  `You arrive in the sector and are greeted by a science vessel waiting by the beacon. They hail you, "We find ourselves low on fuel and have a proposition."`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:trade-fuel-for-drone-parts";
  b.name = "Trade fuel for drone parts";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Trade fuel for drone parts");
}

describe("Trade fuel for drone parts intro", () => {
  it("shows one of the three printed intros before the trade and the reject", () => {
    assert.equal(INTROS.length, 3);
    assert.equal(new Set(INTROS).size, 3);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.deepEqual(
        g.event?.choices.map((c) => c.id),
        ["c:trade-fuel-for-drone-parts:0", "c:trade-fuel-for-drone-parts:1"],
      );
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const fuel = g.fuel;
    const parts = g.player.parts;
    open(g);
    choose(g, "c:trade-fuel-for-drone-parts:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.player.parts, parts);
  });
});
