import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREW_CAP, choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-absorbing-jump-beacon";
  b.name = "Lanius ship absorbing jump beacon";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship absorbing jump beacon");
}

function drone(kind: string): Kit {
  return { id: "swarm", level: 2, power: 2, left: 0, cool: 0, target: kind, on: false, aux: 0 };
}

function stock(g: Game) {
  return {
    scrap: g.scrap,
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    guns: g.player.weapons.length,
    augs: g.augments.length,
    crew: g.crew.filter((c) => c.side === "player").length,
  };
}

function sameStock(g: Game, before: ReturnType<typeof stock>) {
  assert.equal(g.scrap, before.scrap);
  assert.equal(g.fuel, before.fuel);
  assert.equal(g.missiles, before.missiles);
  assert.equal(g.player.parts, before.parts);
  assert.equal(g.player.weapons.length, before.guns);
  assert.equal(g.augments.length, before.augs);
}

function assertLaniusFight(g: Game) {
  assert.equal(g.phase, "combat");
  assert.equal(g.enemy?.faction, "lanius");
  assert.equal(g.enemy?.pirate, false);
  assert.equal(g.fightEvent, "lanius-ship-absorbing-jump-beacon");
  assert.equal(g.enemySurrender?.chance, 80);
  const surrender = g.enemySurrender?.threshold ?? 0;
  assert.ok(surrender >= 30 && surrender <= 40);
  assert.equal(g.enemyEscape?.mode, "hull");
  assert.equal(g.enemyEscape?.chance, 80);
  const escape = g.enemyEscape?.threshold ?? 0;
  assert.ok(escape >= 20 && escape <= 40);
}

describe("Lanius ship absorbing jump beacon", () => {
  it("is one Abandoned Sector card", () => {
    const pages = citedPagesFor("Abandoned Sector").filter((e) => e.dest === "Lanius ship absorbing jump beacon");
    assert.equal(pages.length, 1);
    assert.equal(citedPagesFor("Civilian Sector").some((e) => e.dest === "Lanius ship absorbing jump beacon"), false);
  });

  it("opens on the printed dock sentence and does not offer the scrap gifts", () => {
    const g = createGame(1);
    open(g);
    assert.match(g.event?.body ?? "", /damaged vessel docked with the jump beacon/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [
        "c:lanius-ship-absorbing-jump-beacon:0",
        "c:lanius-ship-absorbing-jump-beacon:1",
        "c:lanius-ship-absorbing-jump-beacon:2",
        "c:lanius-ship-absorbing-jump-beacon:3",
      ],
    );
    assert.equal(g.event?.choices.some((c) => /30 scrap|6 missiles|6 drone/.test(c.label)), false);
  });

  it("asking starts a Lanius fight or the translator, and leaving then is three nothings to one fight", () => {
    let fight = false;
    let quiet = false;
    let pulled = false;
    for (let seed = 1; seed <= 80 && (!fight || !quiet || !pulled); seed++) {
      const g = createGame(seed);
      open(g);
      const before = stock(g);
      choose(g, "c:lanius-ship-absorbing-jump-beacon:0");
      if (g.phase === "combat") {
        fight = true;
        assertLaniusFight(g);
        sameStock(g, before);
        assert.ok(g.log.some((line) => line.includes("fully functional and looking for a fight")));
        continue;
      }
      assert.match(g.event?.body ?? "", /critical\.\.\. must\.\.\. metal\.\.\./);
      assert.deepEqual(g.event?.choices.map((c) => c.label), ["Leave."]);
      choose(g, "s:lanius-beacon-eater:leave");
      if (g.phase === "combat") {
        pulled = true;
        assertLaniusFight(g);
        sameStock(g, before);
        assert.ok(g.log.some((line) => line.includes("fully operational")));
      } else {
        quiet = true;
        assert.match(g.event?.body ?? "", /disable this beacon/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        sameStock(g, before);
      }
    }
    assert.equal(fight && quiet && pulled, true);
  });

  it("leaving does nothing three times as often as it starts a Lanius fight", () => {
    let quiet = 0;
    let fight = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const g = createGame(seed);
      open(g);
      const before = stock(g);
      choose(g, "c:lanius-ship-absorbing-jump-beacon:1");
      sameStock(g, before);
      if (g.phase === "combat") {
        fight += 1;
        assertLaniusFight(g);
        assert.ok(g.log.some((line) => line.includes("fully operational")));
      } else {
        quiet += 1;
        assert.match(g.event?.body ?? "", /Nothing happens/);
      }
    }
    assert.ok(quiet > fight, `${quiet} nothing, ${fight} fights`);
  });

  it("a Lanius crewmember can decline, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    const before = stock(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-ship-absorbing-jump-beacon:2"), "Needs a Lanius crewmember");
    choose(bare, "c:lanius-ship-absorbing-jump-beacon:2");
    sameStock(bare, before);
    assert.equal(bare.event?.choices.some((c) => c.id === "s:lanius-beacon-eater:decline"), false);

    const g = createGame(2);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    assert.equal(choiceDisabled(g, "c:lanius-ship-absorbing-jump-beacon:2"), null);
    const crew = g.crew.filter((c) => c.side === "player").length;
    const held = stock(g);
    choose(g, "c:lanius-ship-absorbing-jump-beacon:2");
    assert.match(g.event?.body ?? "", /lack of metal/);
    assert.deepEqual(g.event?.choices.map((c) => c.label), ["Decline."]);
    choose(g, "s:lanius-beacon-eater:decline");
    assert.equal(g.event?.body, "Nothing happens.");
    sameStock(g, held);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(g.phase, "event");
  });

  it("a Hull Repair Drone adds a Lanius and spends no drone part", () => {
    const bare = createGame(1);
    open(bare);
    const before = stock(bare);
    assert.equal(choiceDisabled(bare, "c:lanius-ship-absorbing-jump-beacon:3"), "Needs a Hull Repair Drone");
    choose(bare, "c:lanius-ship-absorbing-jump-beacon:3");
    sameStock(bare, before);
    assert.equal(bare.phase, "event");

    const g = createGame(3);
    open(g);
    g.player.kits.swarm = drone("hull");
    const parts = g.player.parts;
    const crew = g.crew.filter((c) => c.side === "player").length;
    assert.equal(choiceDisabled(g, "c:lanius-ship-absorbing-jump-beacon:3"), null);
    choose(g, "c:lanius-ship-absorbing-jump-beacon:3");
    assert.match(g.event?.body ?? "", /breaking it down for metal/);
    assert.match(g.event?.body ?? "", /You receive a Lanius crewmember/);
    assert.equal(g.player.parts, parts);
    assert.equal(g.player.kits.swarm?.target, "hull");
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
    assert.equal(g.crew.filter((c) => c.kin === "voidlung").length, 1);
    assert.equal(g.phase, "event");

    const full = createGame(4);
    open(full);
    full.player.kits.swarm = drone("hull");
    while (joinCrew(full, "Human")) {}
    assert.equal(full.crew.filter((c) => c.side === "player").length, CREW_CAP);
    const fullParts = full.player.parts;
    choose(full, "c:lanius-ship-absorbing-jump-beacon:3");
    assert.match(full.event?.body ?? "", /There is no room aboard for the new crewmember/);
    assert.equal(full.crew.filter((c) => c.side === "player").length, CREW_CAP);
    assert.equal(full.crew.filter((c) => c.kin === "voidlung").length, 0);
    assert.equal(full.player.parts, fullParts);
  });
});
