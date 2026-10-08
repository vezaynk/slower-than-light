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
  b.flag = "cited:lanius-powered-down-ship";
  b.name = "Lanius powered-down ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius powered-down ship");
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

function assertDefaultFight(g: Game) {
  assert.equal(g.phase, "combat");
  assert.equal(g.fightEvent, "lanius-powered-down-ship");
  assert.equal(pageWin(g, "lanius-powered-down-ship", false), false);
  assert.equal(pageWin(g, "lanius-powered-down-ship", true), false);
  assert.equal(g.scrap, 10);
}

describe("Lanius powered-down ship", () => {
  it("scanning starts a Lanius fight on default rewards", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "You have picked up a Lanius vessel drifting in this sector. There is no damage to the hull, and it appears to be powered down.");
    choose(g, "c:lanius-powered-down-ship:0");
    assertDefaultFight(g);
  });

  it("powering weapons fights or finds them silent", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:lanius-powered-down-ship:1");
      if (g.phase === "combat") {
        assertDefaultFight(g);
        assert.match(g.log.join("\n"), /does the same/);
        seen.add("fight");
      } else {
        assert.match(g.event?.body ?? "", /don't get a response/);
        assert.deepEqual(
          g.event?.choices.map((c) => c.id),
          ["q:lanius-dormant:investigate", "q:lanius-dormant:destroy"],
        );
        assert.equal(g.scrap, 10);
        seen.add("silent");
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "silent"]);
  });

  it("destroying the silent ship starts a default fight", () => {
    let g: Game | undefined;
    for (let seed = 1; seed <= 40 && !g; seed++) {
      const next = createGame(seed);
      open(next);
      choose(next, "c:lanius-powered-down-ship:1");
      if (next.phase === "event") g = next;
    }
    assert.ok(g);
    choose(g, "q:lanius-dormant:destroy");
    assertDefaultFight(g);
    assert.match(g.log.join("\n"), /hibernation/);
  });

  it("stripping the hull fights or pays low scrap only", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const g = createGame(seed);
      open(g);
      const guns = g.player.weapons.length;
      choose(g, "c:lanius-powered-down-ship:2");
      assert.match(g.event?.body ?? "", /dormant/);
      choose(g, "q:lanius-dormant:navigate");
      if (g.phase === "combat") {
        assertDefaultFight(g);
        seen.add("fight");
      } else {
        const body = g.event?.body ?? "";
        assert.match(body, /hull plating/);
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        inBand(paid[0]!, 7, 10);
        assert.equal(resources(body), 0, body);
        assert.equal(g.scrap, 10 + paid[0]!);
        assert.equal(g.player.weapons.length, guns);
        seen.add("scrap");
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "scrap"]);
  });

  it("ignoring the vessel spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-powered-down-ship:2");
    choose(g, "q:lanius-dormant:ignore");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
  });

  it("a Lanius plunders medium resources with some scrap and level 2 piloting pays medium scrap", () => {
    const low = createGame(1);
    open(low);
    choose(low, "c:lanius-powered-down-ship:2");
    low.player.systems.pilot.level = 1;
    assert.equal(choiceDisabled(low, "q:lanius-dormant:plunder"), "Needs a Lanius crewmember");
    assert.equal(choiceDisabled(low, "q:lanius-dormant:autopilot"), "Needs level 2 Piloting");
    choose(low, "q:lanius-dormant:plunder");
    assert.equal(low.scrap, 10);
    assert.match(low.event?.body ?? "", /dormant/);

    const dead = createGame(2);
    open(dead);
    assert.equal(joinCrew(dead, "Lanius"), true);
    const lan = dead.crew.find((c) => c.kin === "voidlung");
    assert.ok(lan);
    lan.hp = 0;
    choose(dead, "c:lanius-powered-down-ship:2");
    assert.equal(choiceDisabled(dead, "q:lanius-dormant:plunder"), "Needs a Lanius crewmember");

    const plunder = createGame(3);
    open(plunder);
    assert.equal(joinCrew(plunder, "Lanius"), true);
    const guns = plunder.player.weapons.length;
    choose(plunder, "c:lanius-powered-down-ship:2");
    assert.equal(choiceDisabled(plunder, "q:lanius-dormant:plunder"), null);
    choose(plunder, "q:lanius-dormant:plunder");
    const body = plunder.event?.body ?? "";
    assert.match(body, /without waking/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    inBand(paid[0]!, 7, 10);
    assert.equal(resources(body), 2, body);
    assert.equal(plunder.scrap, 10 + paid[0]!);
    assert.equal(plunder.player.weapons.length, guns);

    const pilot = createGame(4);
    open(pilot);
    pilot.player.systems.pilot.level = 2;
    choose(pilot, "q:lanius-dormant:investigate");
    assert.equal(choiceDisabled(pilot, "q:lanius-dormant:autopilot"), null);
    choose(pilot, "q:lanius-dormant:autopilot");
    const haul = pilot.event?.body ?? "";
    assert.match(haul, /excellent haul/);
    const high = scraps(haul);
    assert.equal(high.length, 1, haul);
    inBand(high[0]!, 12, 19);
    assert.equal(resources(haul), 2, haul);
    assert.equal(pilot.scrap, 10 + high[0]!);
  });
});
