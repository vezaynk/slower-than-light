import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:engi-smashed-ships";
  b.name = "Engi smashed ships";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Engi smashed ships");
}

describe("Engi smashed ships", () => {
  it("winning pays nothing after either ending", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "engi-smashed-ships", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /ship disabled/ : /ship destroyed/);
      assert.match(body, /consolidation/);
      assert.match(body, /Nothing happens/);
      assert.equal(body.includes("Scrap:"), false);
      assert.equal(g.scrap, 10);
      assert.equal(g.player.weapons.length, guns);
    }
  });

  it("ignoring them spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:engi-smashed-ships:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });

  it("an Engi crewmember is paid random resources, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:engi-smashed-ships:2"), "Needs an Engi crewmember");
    choose(bare, "c:engi-smashed-ships:2");
    assert.equal(bare.scrap, 10);

    const g = createGame(4);
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const guns = g.player.weapons.length;
    assert.equal(joinCrew(g, "Engi"), true);
    assert.equal(choiceDisabled(g, "c:engi-smashed-ships:2"), null);
    choose(g, "c:engi-smashed-ships:2");
    const body = g.event?.body ?? "";
    assert.match(body, /achieve a union/);
    const paid = [...body.matchAll(/Scrap: (\d+)/g)].map((m) => Number(m[1]));
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    const kinds = ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body));
    assert.equal(kinds.length, 2, body);
    assert.equal([g.fuel - fuel, g.missiles - missiles, g.player.parts - parts].filter((n) => n > 0).length, 2);
    assert.equal(g.player.weapons.length, guns);
  });
});
