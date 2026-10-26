import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { choose, createGame, evasionPercent, ftlSeconds, startCombat, step } from "../sim.ts";
import "../pack/base.ts";
import { citedEvent } from "./cited-events.ts";

describe("Pirate engine hacker", () => {
  it("limits evasion and the FTL charge to level 1, then restores them when that ship is destroyed", () => {
    // Wiki citations:
    // > "Once you arrive, your screen lights up with warnings. A nearby pirate seems to have advanced hacking tools and they have tried to shut down our engines. Your crew manages to keep them operational and you move in to attack." — [[Pirate engine hacker]]
    // > "Continue..." — [[Pirate engine hacker]]
    // > "Fight the Pirate ship with your Engines limited to level 1." — [[Pirate engine hacker]]
    const g = createGame(4);
    g.sectorId = "CIVILIAN_SECTOR";
    g.sectorName = "Civilian Sector";
    const ev = allEvents().find((e) => e.dest === "Pirate engine hacker");
    assert.ok(ev);
    const b = g.beacons.find(
      (x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store",
    );
    assert.ok(b);
    b.flag = ev.flag;
    b.kind = "event";
    b.name = ev.dest;
    g.here = b.id;
    g.event = citedEvent(g, b);
    g.phase = "event";
    assert.equal(
      g.event?.body,
      "Once you arrive, your screen lights up with warnings. A nearby pirate seems to have advanced hacking tools and they have tried to shut down our engines. Your crew manages to keep them operational and you move in to attack.",
    );
    g.player.systems.engines.level = 5;
    g.player.systems.engines.power = 5;
    g.player.systems.engines.damage = 0;
    choose(g, "c:pirate-engine-hacker:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    if (g.enemy.kits.hacking) {
      g.enemy.kits.hacking.on = false;
      g.enemy.kits.hacking.power = 0;
    }
    if (g.enemy.kits.cloaking) g.enemy.kits.cloaking.on = false;
    const high = evasionPercent(g, g.player, "player");
    const highFtl = ftlSeconds(g, g.player);
    g.player.systems.engines.level = 1;
    g.player.systems.engines.power = 1;
    assert.equal(evasionPercent(g, g.player, "player"), high);
    assert.equal(ftlSeconds(g, g.player), highFtl);
    g.player.systems.engines.level = 5;
    g.player.systems.engines.power = 5;
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    const restored = evasionPercent(g, g.player, "player");
    assert.ok(restored > high, `${restored} vs ${high}`);
    startCombat(g, "scout");
    assert.ok(evasionPercent(g, g.player, "player") > high);
  });
});

describe("Rebel fight choice in nebula", () => {
  it("prints the opening sentence, and attacking starts a Rebel fight", () => {
    // Wiki citations:
    // > "Your ship emerges quite far away from the beacon. You see a rebel ship waiting nearby, undoubtedly stationed to look for you." — [[Rebel fight choice in nebula]]
    // > "Attack the ship." — [[Rebel fight choice in nebula]]
    // > "Fight a Rebel ship (default rewards)." — [[Rebel fight choice in nebula]]
    const g = createGame(1);
    const b = g.beacons.find((x) => x.kind !== "start");
    assert.ok(b);
    b.flag = "NEBULA_REBEL_UNDETECTED";
    b.name = "Rebel fight choice in nebula";
    g.here = b.id;
    g.event = citedEvent(g, b);
    g.phase = "event";
    assert.equal(
      g.event?.body,
      "Your ship emerges quite far away from the beacon. You see a rebel ship waiting nearby, undoubtedly stationed to look for you.",
    );
    assert.ok(g.event?.choices.some((c) => c.id === "c:rebel-fight-choice-in-nebula:0"));
    choose(g, "c:rebel-fight-choice-in-nebula:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "rebel-fight-choice-in-nebula");
    assert.equal(g.scrap, 10);
  });
});
