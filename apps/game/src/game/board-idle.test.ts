import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beginBoarding, choose, createGame, step } from "./sim.ts";
import type { Crew, Game } from "./types.ts";
import { fillerChoose } from "./wiki/filler-events.ts";
import { questChoose } from "./wiki/quests.ts";
import { PART_B } from "./wiki/quests-b.ts";

function plant(g: Game, room: string, hp = 100): Crew {
  g.uid = (g.uid + 1) >>> 0;
  const c: Crew = {
    id: "u" + g.uid.toString(36),
    name: "Human",
    side: "enemy",
    aboard: "player",
    hp,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 30,
    tone: 3,
    kin: "human",
  };
  g.crew.push(c);
  return c;
}

function humans(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "enemy" && c.aboard === "player" && c.name === "Human");
}

function pausedBoarding(g: Game): boolean {
  return g.phase === "event" && g.enemy == null && g.event?.choices[0]?.id === "ship-resume";
}

/** A shipless boarding pauses on the narrative card. Continue returns to the fight. */
function resumeBoarding(g: Game, narrative: string) {
  assert.equal(g.phase, "event");
  assert.equal(g.enemy, null);
  assert.equal(g.event?.choices[0]?.id, "ship-resume");
  assert.equal(g.event?.body, narrative);
  assert.equal(g.log.includes(narrative), false);
  choose(g, "ship-resume");
}

describe("Boarders with no enemy ship", () => {
  it("does not open a fight from a quiet map step", () => {
    const g = createGame(1);
    step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
  });

  it("trades blows on the first step and ends with no salvage", () => {
    const g = createGame(1);
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    const boarder = plant(g, nen.room, 0.2);
    const scrap = g.scrap;
    const kills = g.kills;
    beginBoarding(g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const before = boarder.hp;
    step(g, 0.05);
    // Boarding, Combat: the blow is "every few moments", not this first instant.
    assert.equal(boarder.hp, before);
    for (let i = 0; i < 40 && boarder.hp > 0; i++) step(g, 0.05);
    // An unskilled human deals 3 to 7 HP per hit. This boarder had 0.2, so the blow finishes the fight.
    assert.ok(before - boarder.hp >= 3 && before - boarder.hp <= 7);
    assert.equal(g.phase, "map");
    assert.equal(
      g.crew.some((c) => c.side === "enemy" && c.hp > 0),
      false,
    );
    assert.equal(g.kills, kills);
    assert.equal(g.scrap, scrap);
  });

  it("sabotages an empty system room at 0.08 per second", () => {
    const g = createGame(1);
    for (const c of g.crew) c.room = "p-pilot";
    plant(g, "p-weapons");
    const room = g.player.rooms.find((r) => r.id === "p-weapons")!;
    assert.ok(g.player.systems.weapons.level > 0);
    assert.equal(g.player.systems.weapons.damage, 0);
    beginBoarding(g);
    step(g, 0.05);
    assert.ok(Math.abs((room.sabotage ?? 0) - 0.08 * 0.05) < 1e-9);
    assert.equal(g.phase, "combat");
  });

  it("warns 15–20s in, then fires the planet-side battery 5–10s later", () => {
    const g = createGame(1);
    for (const c of g.crew) c.think = 9999;
    plant(g, "p-sensors");
    plant(g, "p-sensors");
    beginBoarding(g, true);
    assert.equal(g.asb, true);
    assert.equal(g.enemy, null);
    assert.equal(g.asbPhase, "warn");
    assert.ok(g.asbWait >= 15 && g.asbWait < 20);
    let t = 0;
    while (g.asbPhase === "warn" && t < 21) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(g.phase, "combat");
    assert.equal(g.asbPhase, "shot");
    assert.ok(t >= 15 && t < 20.1);
    assert.equal(g.log[0], "Planet-side anti-ship batteries are detected in this system.");
    assert.equal(
      g.shots.some((s) => s.label === "Artillery"),
      false,
    );
    assert.ok(g.asbWait >= 5 && g.asbWait < 10);
    const shotAt = t + g.asbWait;
    while (!g.shots.some((s) => s.label === "Artillery") && t < shotAt + 1) {
      step(g, 0.05);
      t += 0.05;
    }
    assert.equal(
      g.shots.some((s) => s.label === "Artillery"),
      true,
    );
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.asbPhase, "warn");
    assert.ok(g.asbWait >= 15 && g.asbWait < 20);
    assert.ok(t >= 20 && t < 30.1);
  });

  it("braces 3-4 human boarders with no hull", () => {
    const g = createGame(1);
    PART_B.choices["q:research:brace"](g);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.ok(humans(g).every((c) => c.kin === "human"));
    assert.equal(g.crew.filter((c) => c.side === "player").length, 3);
  });

  it("turns one crewmember and beams 3-4 more on the drag", () => {
    const g = createGame(1);
    PART_B.choices["q:research:drag"](g);
    resumeBoarding(
      g,
      "As you get back on board, your injured friend rises up and starts to attack you, screaming. Caught off-guard, your remaining crew fall back as the other scientists fight their way onto the ship.",
    );
    assert.match(g.log.join("\n"), /\d+ human boarders beam aboard\./);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const turned = g.crew.filter((c) => c.side === "enemy" && c.name !== "Human");
    assert.equal(turned.length, 1);
    assert.equal(turned[0].aboard, "player");
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.equal(g.crew.filter((c) => c.side === "player" && c.hp > 0).length, 2);
  });

  it("turns one crewmember and no extras on the teleporter retrieve", () => {
    const g = createGame(1);
    PART_B.choices["q:research:beam"](g);
    resumeBoarding(
      g,
      "You beam your away team back to the ship and disengage from the station. Although the ship is safe, the infected crew member quickly becomes frenzied and attacks.",
    );
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(humans(g).length, 0);
    assert.equal(g.crew.filter((c) => c.side === "enemy").length, 1);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 2);
  });

  it("keeps the card when the teleporter retrieve would take the last crewmember", () => {
    const g = createGame(1);
    g.crew = g.crew.filter((c) => c.id === "c-ada");
    PART_B.choices["q:research:beam"](g);
    assert.equal(g.phase, "event");
    assert.equal(g.paused, true);
    assert.equal(g.crew.length, 1);
    assert.equal(g.crew[0].side, "player");
  });

  it("keeps the crew and beams 3-4 boarders from the medbay", () => {
    const g = createGame(1);
    PART_B.choices["q:research:medbay"](g);
    resumeBoarding(
      g,
      "You hold him down and the medbay is able to stop whatever neurotoxin was on the ship from fully infecting your crew. Once he recovers, you prepare to fight off the scientists, who are beyond help.",
    );
    assert.match(g.log.join("\n"), /\d+ human boarders beam aboard\./);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    const n = humans(g).length;
    assert.ok(n >= 3 && n <= 4);
    assert.equal(g.crew.filter((c) => c.side === "player").length, 3);
  });

  it("draws the crazed clone, the refugee boarders, and the station battery", () => {
    let crazed = false;
    let refugee = false;
    let battery = false;
    for (let seed = 1; seed < 80 && !(crazed && refugee && battery); seed++) {
      const dna = createGame(seed);
      questChoose(dna, "q:station:dna");
      if (pausedBoarding(dna) && humans(dna).length === 1) {
        assert.match(dna.event?.body ?? "", /crazed frenzy/);
        assert.equal(dna.log.join("\n").includes("crazed frenzy"), false);
        assert.match(dna.log.join("\n"), /boarder beams aboard/);
        crazed = true;
      }
      const ref = createGame(seed + 1000);
      fillerChoose(ref, "c:refugee-comms-down:0");
      const aboard = humans(ref);
      if (pausedBoarding(ref) && aboard.length >= 2 && aboard.length <= 4 && !ref.asb) {
        assert.match(ref.event?.body ?? "", /cannibalistic refugees/);
        assert.equal(ref.log.join("\n").includes("cannibalistic refugees"), false);
        assert.match(ref.log.join("\n"), /human boarders beam aboard/);
        refugee = true;
      }
      const station = createGame(seed + 2000);
      fillerChoose(station, "c:abandoned-station:0");
      const pirates = humans(station);
      if (pausedBoarding(station) && station.asb && pirates.length >= 2 && pirates.length <= 4) {
        assert.match(station.event?.body ?? "", /planetary defense system/);
        assert.equal(station.log.join("\n").includes("planetary defense system"), false);
        assert.match(station.log.join("\n"), /boarders beam aboard/);
        battery = true;
      }
    }
    assert.equal(crazed, true);
    assert.equal(refugee, true);
    assert.equal(battery, true);
  });
});
