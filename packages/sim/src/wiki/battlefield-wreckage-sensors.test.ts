import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerEvent } from "./filler-events.ts";

const LEAD = eventText("event_WRECKAGE_EVENT_c1_text");
const SCAN = "c:battlefield-wreckage:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "WRECKAGE_EVENT";
  b.name = "Battlefield wreckage";
  g.here = b.id;
  g.event = citedEvent(g, b);
  // The card lives on the filler list, stamped filler:battlefield-wreckage. citedEvent may be null.
  if (!g.event) {
    b.flag = "filler:battlefield-wreckage";
    g.event = fillerEvent(g, b);
  }
  g.phase = "event";
  assert.equal(g.event?.title, "Battlefield wreckage");
}

describe("Battlefield wreckage Improved Sensors", () => {
  it("stays closed below Sensors level 2", () => {
    const g = createGame(1);
    g.player.systems.sensors.level = 1;
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    assert.ok(
      g.event?.choices.some(
        (c) => c.id === SCAN && c.label === "Gain medium resources and some scrap.",
      ),
    );
    // INFERRED: the refusal line. The page names Sensors level 2 and prints no sentence.
    assert.equal(choiceDisabled(g, SCAN), "Needs Sensors level 2");
    choose(g, SCAN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
  });

  it("Sensors level 2 salvages medium resources with some scrap", () => {
    const g = createGame(2);
    g.player.systems.sensors.level = 2;
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const scrap = g.scrap;
    const weapons = g.player.weapons.length;
    assert.equal(
      g.event?.choices.some((c) => c.id === "c:battlefield-wreckage:3"),
      true,
    );
    assert.equal(choiceDisabled(g, "c:battlefield-wreckage:3"), "Needs Sensors level 3");
    assert.equal(choiceDisabled(g, SCAN), null);
    choose(g, SCAN);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    const body = g.event?.body ?? "";
    assert.ok(body.includes(LEAD));
    assert.equal(body.includes("Nothing happens."), false);
    assert.ok(g.scrap > scrap);
    const df = g.fuel - fuel;
    const dm = g.missiles - missiles;
    const dp = g.player.parts - parts;
    assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
    assert.ok(df === 0 || (df >= 2 && df <= 4));
    assert.ok(dm === 0 || (dm >= 2 && dm <= 4));
    assert.ok(dp === 0 || dp === 1);
    assert.equal(g.player.weapons.length, weapons);
  });

  it("Sensors level 3 pays high resources or a weapon with low scrap", () => {
    const ADVANCED = "c:battlefield-wreckage:3";
    let high = false;
    let weapon = false;
    for (let seed = 1; seed <= 40 && (!high || !weapon); seed++) {
      const g = createGame(seed);
      g.player.systems.sensors.level = 3;
      open(g);
      assert.equal(
        g.event?.choices.some((c) => c.id === ADVANCED),
        true,
      );
      assert.equal(choiceDisabled(g, ADVANCED), null);
      const scrap = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, ADVANCED);
      const body = g.event?.body ?? "";
      assert.equal(g.phase, "event");
      assert.equal(g.enemy, null);
      if (body.includes(eventText("event_WRECKAGE_EVENT_c3_weapon_text"))) {
        weapon = true;
        assert.match(body, /mounted\.|stowed in cargo\.|choose what to leave behind/);
        assert.equal(g.player.weapons.length, guns + (/mounted\./.test(body) ? 1 : 0));
        assert.ok(g.scrap > scrap);
      } else {
        high = true;
        assert.ok(body.includes(eventText("event_WRECKAGE_EVENT_c3_high_text")), body);
        assert.equal(g.player.weapons.length, guns);
        assert.ok(g.scrap > scrap);
      }
    }
    assert.equal(high && weapon, true);
  });
});
