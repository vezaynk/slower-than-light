import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const IGNORE = "c:pirate-ship-selling-weapon:1";
const MIND = "c:pirate-ship-selling-weapon:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:pirate-ship-selling-weapon";
  b.name = "Pirate ship selling weapon";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship selling weapon");
}

function mind(): Kit {
  return { id: "leash", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

describe("Pirate ship selling weapon", () => {
  it("ignoring the trader shows nothing and spends nothing", () => {
    const g = createGame(1);
    open(g);
    const scrap = g.scrap;
    const guns = g.player.weapons.length;
    choose(g, IGNORE);
    assert.equal(g.event?.body, "Nothing happens.");
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.phase, "event");
  });

  it("Mind Control stays closed until the system is installed", () => {
    const g = createGame(1);
    open(g);
    assert.equal(choiceDisabled(g, MIND), "Needs Mind Control");
    const scrap = g.scrap;
    choose(g, MIND);
    assert.match(g.event?.body ?? "", /black market weapons trader/);
    assert.equal(g.scrap, scrap);
    assert.equal(g.phase, "event");
  });

  it("a deal can be declined for nothing, or the lie starts a Pirate ship fight", () => {
    let deal = false;
    let lie = false;
    for (let seed = 1; seed <= 40 && (!deal || !lie); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.leash = mind();
      const scrap = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, MIND);
      const body = g.event?.body ?? g.log.join(" ");
      if (g.phase === "event") {
        deal = true;
        assert.match(body, /takes back his discount/);
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        assert.deepEqual(g.event?.choices.map((c) => c.label), ["Decline."]);
        choose(g, "s:pirate-weapon:decline");
        assert.match(g.event?.body ?? "", /thank him for his offer/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        assert.equal(g.phase, "event");
      } else {
        lie = true;
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "pirate-ship-selling-weapon");
        assert.match(g.log.join(" "), /planned to attack your ship/);
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
      }
    }
    assert.equal(deal, true);
    assert.equal(lie, true);
  });
});
