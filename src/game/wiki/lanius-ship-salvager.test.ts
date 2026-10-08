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
  b.flag = "cited:lanius-ship-salvager";
  b.name = "Lanius ship salvager";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship salvager");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function inBand(n: number, lo: number, hi: number) {
  assert.ok(n >= lo && n <= hi, `${n} not in ${lo}-${hi}`);
}

function withLanius(seed: number): Game {
  const g = createGame(seed);
  open(g);
  assert.equal(joinCrew(g, "Lanius"), true);
  return g;
}

describe("Lanius ship salvager", () => {
  it("attacking starts a Lanius fight on default rewards", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-salvager:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-salvager");
    assert.equal(pageWin(g, "lanius-ship-salvager", false), false);
    assert.equal(pageWin(g, "lanius-ship-salvager", true), false);
    assert.equal(g.scrap, 10);
  });

  it("leaving spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-salvager:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });

  it("requesting scrap needs a living Lanius", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-ship-salvager:2"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-ship-salvager:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.event?.choices.some((c) => c.id === "c:lanius-ship-salvager:2"), true);

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "voidlung");
    assert.ok(lan);
    lan.hp = 0;
    assert.equal(choiceDisabled(dead, "c:lanius-ship-salvager:2"), "Needs a Lanius crewmember");
  });

  it("a Lanius receives medium scrap only, a scoff, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = withLanius(seed);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      assert.equal(choiceDisabled(g, "c:lanius-ship-salvager:2"), null);
      choose(g, "c:lanius-ship-salvager:2");
      const body = g.event?.body ?? "";
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.player.weapons.length, guns);
      if (/happy to share/.test(body)) {
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        inBand(paid[0]!, 12, 19);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, 10 + paid[0]!);
        seen.add("share");
      } else if (/lazy solder/.test(body)) {
        assert.equal(g.scrap, 10);
        assert.equal(g.phase, "event");
        assert.deepEqual(
          g.event?.choices.map((c) => c.id),
          ["q:lanius-salvager:attack", "q:lanius-salvager:leave"],
        );
        seen.add("scoff");
      } else {
        assert.match(body, /extremely low/);
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, 10);
        seen.add("low");
      }
    }
    assert.deepEqual([...seen].sort(), ["low", "scoff", "share"]);
  });

  it("the scoff fight stays on default Lanius rewards and leaving spends nothing", () => {
    let fight: Game | undefined;
    let leave: Game | undefined;
    for (let seed = 1; seed <= 80 && (!fight || !leave); seed++) {
      const g = withLanius(seed);
      choose(g, "c:lanius-ship-salvager:2");
      if (/lazy solder/.test(g.event?.body ?? "")) {
        if (!fight) fight = g;
        else if (!leave) leave = g;
      }
    }
    assert.ok(fight);
    assert.ok(leave);
    const fuel = fight.fuel;
    choose(fight, "q:lanius-salvager:attack");
    assert.equal(fight.phase, "combat");
    assert.equal(fight.fightEvent, "lanius-ship-salvager");
    assert.equal(pageWin(fight, "lanius-ship-salvager", false), false);
    assert.equal(pageWin(fight, "lanius-ship-salvager", true), false);
    assert.equal(fight.scrap, 10);
    assert.equal(fight.fuel, fuel);

    choose(leave, "q:lanius-salvager:leave");
    assert.match(leave.event?.body ?? "", /derisive tone/);
    assert.match(leave.event?.body ?? "", /Nothing happens/);
    assert.equal(leave.scrap, 10);
    assert.equal(leave.fuel, fuel);
  });
});
