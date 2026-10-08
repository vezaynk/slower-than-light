import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choiceDisabled, choose, createGame, playerHackingOff, playerMedicalOff, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const LEAD = "Fearing the imminent battle you desperately try to get the medbay working again. It's lights flicker back on and you turn to face the intruders.";
const ID = "c:slug-hacker-medical:2";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:slug-hacker-medical";
  b.name = "Slug hacker (medical)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug hacker (medical)");
}

function quiet(g: Game) {
  assert.ok(g.enemy);
  for (const w of g.enemy.weapons) w.enabled = false;
  for (const kit of Object.values(g.enemy.kits)) {
    if (!kit) continue;
    kit.power = 0;
    kit.on = false;
  }
}

describe("Slug hacker (medical) improved medbay", () => {
  it("stays closed below Medbay level 2", () => {
    const g = createGame(1);
    g.player.systems.medbay.level = 1;
    g.player.systems.medbay.power = 1;
    open(g);
    assert.ok(g.event?.choices.some((c) => c.id === ID && c.label === "Try to squeeze some extra power to the system."));
    assert.equal(choiceDisabled(g, ID), "Needs level 2 Medbay");
    choose(g, ID);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, 10);
    assert.equal(playerMedicalOff(g), false);
  });

  it("shows the printed flicker sentence, halves the medbay, and beams two slugs", () => {
    const g = createGame(2);
    g.player.systems.medbay.level = 2;
    g.player.systems.medbay.power = 2;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay);
    const patient = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(patient);
    patient.room = bay.id;
    patient.aboard = "player";
    patient.path = [];
    patient.hp = Math.max(1, patient.maxHp - 20);
    bay.fire = 0;
    bay.o2 = 100;
    open(g);
    assert.equal(choiceDisabled(g, ID), null);
    choose(g, ID);
    assert.ok(g.log.includes(LEAD));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "slug-hacker-medical");
    assert.equal(g.enemy?.faction, "slug");
    assert.equal(g.scrap, 10);
    assert.equal(g.player.systems.medbay.level, 2);
    assert.equal(playerMedicalOff(g), false);
    assert.equal(playerHackingOff(g), false);
    const hp = kinOf("gel").hp;
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(boarders.length, 2);
    assert.ok(boarders.every((c) => c.kin === "gel" && c.hp === hp));
    assert.ok(g.log.includes("2 slug boarders beam aboard your ship."));
    const away = g.player.rooms.find((r) => r.id !== bay.id);
    assert.ok(away);
    for (const boarder of boarders) boarder.room = away.id;
    quiet(g);
    const hurt = patient.hp;
    step(g, 0.05);
    // Level 2 heals at 9.6. Halved bars round down to 1, which heals at 6.4.
    assert.ok(Math.abs(patient.hp - hurt - 6.4 * 0.05) < 0.02);
  });
});
