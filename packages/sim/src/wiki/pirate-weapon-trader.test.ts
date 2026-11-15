import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const IGNORE = "c:pirate-ship-selling-weapon:1";
const MIND = "c:pirate-ship-selling-weapon:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "NEBULA_WEAPONS_TRADER";
  b.name = "Pirate ship selling weapon";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Pirate ship selling weapon");
}

function mind(): Kit {
  return { id: "mind", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
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
    assert.equal(g.event?.body, "Weapon seller. Nebula.");
    assert.equal(g.scrap, scrap);
    assert.equal(g.phase, "event");
  });

  it("a deal can be declined for nothing, or the lie starts a Pirate ship fight", () => {
    let deal = false;
    let lie = false;
    for (let seed = 1; seed <= 40 && (!deal || !lie); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.mind = mind();
      const scrap = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, MIND);
      const body = g.event?.body ?? "";
      if (g.event?.choices.some((c) => c.id === "ship-resume")) {
        lie = true;
        assert.ok(body.includes(eventText("event_NEBULA_WEAPONS_TRADER_LIST2_2_text")));
        assert.equal(
          g.log.join(" ").includes(eventText("event_NEBULA_WEAPONS_TRADER_LIST2_2_text")),
          false,
        );
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "pirate-ship-selling-weapon");
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        assert.equal(
          g.log.join(" ").includes(eventText("event_NEBULA_WEAPONS_TRADER_LIST2_2_text")),
          false,
        );
      } else {
        deal = true;
        assert.equal(g.phase, "event");
        assert.ok(body.includes(eventText("event_NEBULA_WEAPONS_TRADER_LIST2_1_text")));
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        const ids = g.event?.choices.map((c) => c.id) ?? [];
        assert.equal(ids.includes("s:pirate-weapon:decline"), true);
        assert.equal(
          ids.some((choice) => choice.startsWith("s:pirate-weapon:take:")),
          true,
        );
        choose(g, "s:pirate-weapon:decline");
        assert.ok(
          (g.event?.body ?? "").includes(eventText("event_NEBULA_WEAPONS_TRADER_LIST2_1_c2_text")),
        );
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.weapons.length, guns);
        assert.equal(g.phase, "event");
      }
    }
    assert.equal(deal, true);
    assert.equal(lie, true);
  });

  it("45 scrap buys a weapon or is kept after a cheat", () => {
    const BUY = "c:pirate-ship-selling-weapon:3";
    let bought = false;
    let cheated = false;
    for (let seed = 1; seed <= 40 && (!bought || !cheated); seed++) {
      const g = createGame(seed);
      open(g);
      g.scrap = 45;
      const guns = g.player.weapons.length;
      assert.equal(choiceDisabled(g, BUY), null);
      choose(g, BUY);
      assert.equal(g.scrap, 0);
      const body = g.event?.body ?? "";
      if (g.event?.choices.some((c) => c.id === "c:pirate-ship-selling-weapon:0")) {
        cheated = true;
        assert.ok(body.includes(eventText("event_NEBULA_WEAPONS_TRADER_CHEAT_text")));
        assert.equal(g.player.weapons.length, guns);
        choose(g, "c:pirate-ship-selling-weapon:0");
        if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "pirate-ship-selling-weapon");
        assert.equal(g.scrap, 0);
      } else {
        bought = true;
        assert.ok(body.includes(eventText("event_NEBULA_WEAPONS_TRADER_BUY_text")));
        assert.match(body, /mounted\.|stowed in cargo\.|choose what to leave behind/);
        assert.equal(g.player.weapons.length, guns + (/mounted\./.test(body) ? 1 : 0));
      }
    }
    assert.equal(bought && cheated, true);
    const poor = createGame(2);
    open(poor);
    poor.scrap = 44;
    assert.equal(choiceDisabled(poor, BUY), "Need 45 scrap");
    const guns = poor.player.weapons.length;
    choose(poor, BUY);
    assert.equal(poor.scrap, 44);
    assert.equal(poor.player.weapons.length, guns);
    assert.equal(poor.event?.title, "Pirate ship selling weapon");
  });

  it("Mind Control shows the weapon, then the buy still costs 45 scrap", () => {
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = createGame(seed);
      open(g);
      g.player.kits.mind = mind();
      g.scrap = 45;
      choose(g, MIND);
      const take = g.event?.choices.find((c) => c.id.startsWith("s:pirate-weapon:take:"));
      if (!take) continue;
      seen = true;
      assert.equal(g.scrap, 45);
      assert.match(take.label, /45 scrap/);
      const guns = g.player.weapons.length;
      choose(g, take.id);
      const body = g.event?.body ?? "";
      assert.equal(g.scrap, 0);
      assert.match(body, /mounted\.|stowed in cargo\.|choose what to leave behind/);
      assert.equal(g.player.weapons.length, guns + (/mounted\./.test(body) ? 1 : 0));
    }
    assert.equal(seen, true);
  });
});
