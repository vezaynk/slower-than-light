import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLAGSHIP_HARD, FLAGSHIP_PHASES } from "./flagship.ts";

describe("Rebel Flagship phases", () => {
  it("has three phases and a source on each", () => {
    assert.equal(FLAGSHIP_PHASES.length, 3);
    assert.deepEqual(
      FLAGSHIP_PHASES.map((phase) => phase.phase),
      [1, 2, 3],
    );
    assert.equal(FLAGSHIP_PHASES[0]?.source, 'Wiki page "The Rebel Flagship", section "1st Stage"');
    assert.equal(FLAGSHIP_PHASES[1]?.source, 'Wiki page "The Rebel Flagship", section "2nd stage"');
    assert.equal(FLAGSHIP_PHASES[2]?.source, 'Wiki page "The Rebel Flagship", section "Final stage"');
  });

  it("keeps the printed hull pools of 20, 22, and 20", () => {
    assert.equal(FLAGSHIP_PHASES[0]?.hull, 20);
    assert.equal(FLAGSHIP_PHASES[1]?.hull, 22);
    assert.equal(FLAGSHIP_PHASES[2]?.hull, 20);
  });

  it("names the printed weapons", () => {
    assert.deepEqual(FLAGSHIP_PHASES[0]?.weapons, ["Boss Ion", "Boss Laser", "Boss Missile", "Boss Beam"]);
    assert.deepEqual(FLAGSHIP_PHASES[1]?.weapons, ["Boss Laser", "Boss Missile", "Boss Beam"]);
    assert.deepEqual(FLAGSHIP_PHASES[2]?.weapons, ["Boss Laser", "Boss Missile"]);
  });

  it("keeps printed system levels, including shields at 8", () => {
    assert.deepEqual(
      FLAGSHIP_PHASES[0]?.systems.map((system) => [system.name, system.level]),
      [
        ["Piloting", 3],
        ["Shields", 8],
        ["Door", 3],
        ["Cloaking", 2],
        ["Medbay", 3],
        ["Engines", 2],
        ["Oxygen", 2],
        ["Hacking", 3],
      ],
    );
    assert.deepEqual(
      FLAGSHIP_PHASES[1]?.systems.map((system) => [system.name, system.level]),
      [
        ["Piloting", 3],
        ["Shields", 8],
        ["Medbay", 3],
        ["Engines", 3],
        ["Oxygen", 2],
        ["Drone", 8],
      ],
    );
    assert.deepEqual(
      FLAGSHIP_PHASES[2]?.systems.map((system) => [system.name, system.level]),
      [
        ["Piloting", 3],
        ["Shields", 8],
        ["Teleporter", 2],
        ["Medbay", 3],
        ["Engines", 6],
        ["Oxygen", 2],
        ["Mind Control", 3],
      ],
    );
  });

  it("copies surge timing as 20 to 30 seconds and does not use a fixed 16", () => {
    assert.equal(FLAGSHIP_PHASES[0]?.surge, undefined);
    const second = FLAGSHIP_PHASES[1]?.surge ?? "";
    const third = FLAGSHIP_PHASES[2]?.surge ?? "";
    assert.match(second, /between 20 and 30 seconds/);
    assert.match(second, /about 7 seconds/);
    assert.match(second, /exactly 5 seconds/);
    assert.match(second, /4 on Easy, 6 on Normal, and 7 on Hard/);
    assert.doesNotMatch(second, /16 seconds/);
    assert.match(third, /randomly between 20 and 30 seconds/);
    assert.match(third, /exactly 5 seconds/);
    assert.match(third, /7 laser shots/);
    assert.match(third, /1 damage instead of 2/);
    assert.match(third, /30% fire, 21% breach, and 20% stun/);
    assert.doesNotMatch(third, /16 seconds/);
  });

  it("records the other printed phase numbers in notes", () => {
    const first = FLAGSHIP_PHASES[0]?.notes.join(" ") ?? "";
    const second = FLAGSHIP_PHASES[1]?.notes.join(" ") ?? "";
    const third = FLAGSHIP_PHASES[2]?.notes.join(" ") ?? "";

    assert.match(first, /Reactor 42/);
    assert.match(first, /Crew 11 Humans/);
    assert.match(first, /Drone parts 10/);
    assert.match(first, /Boss Ion 3, Boss Laser 3, Boss Missile 3, Boss Beam 3/);
    assert.match(first, /Ion 21 seconds, Laser 15 seconds, Missile 17\.25 seconds, Beam 19\.5 seconds/);
    assert.match(first, /base 10%/);
    assert.match(first, /Fully manned 20%/);
    assert.match(first, /piloting room empty 8%/);
    assert.match(first, /Controlled by AI 20%/);
    assert.match(first, /shield system level 6/);
    assert.match(first, /positions are a picture/);

    assert.match(second, /Reactor 44/);
    assert.match(second, /Ion room if left alive/);
    assert.match(second, /Combat Drone Mark I \(2\)/);
    assert.match(second, /Anti-Ship Beam Drone I \(2\)/);
    assert.match(second, /Defense Drone Mark I \(2\)/);
    assert.match(second, /Boarding Drone \(Boss\) \(2\)/);
    assert.match(second, /Uses 4 drones at once/);
    assert.match(second, /Laser 15 seconds, Missile 17\.25 seconds, Beam 19\.5 seconds/);
    assert.match(second, /base 15%/);
    assert.match(second, /Fully manned 25%/);
    assert.match(second, /piloting room empty 12%/);
    assert.match(second, /Controlled by AI 25%/);
    assert.match(second, /positions are a picture/);
    assert.doesNotMatch(second, /Crew 9|Crew 10/);

    assert.match(third, /Reactor 32/);
    assert.match(third, /Beam room if left alive/);
    assert.match(third, /12 health points/);
    assert.match(third, /Boss Laser 4, Boss Missile 4/);
    assert.match(third, /Laser 10 seconds, Missile 11\.5 seconds/);
    assert.match(third, /base 28%/);
    assert.match(third, /Fully manned 38%/);
    assert.match(third, /piloting room empty 22%/);
    assert.match(third, /Controlled by AI 38%/);
    assert.match(third, /10% fire and 9% breach/);
    assert.match(third, /30% fire and 14% breach/);
    assert.match(third, /positions are a picture/);
    assert.doesNotMatch(third, /Crew 8|Crew 9/);
  });

  it("keeps hard differences in FLAGSHIP_HARD instead of a blended figure", () => {
    assert.match(FLAGSHIP_HARD.source, /The Rebel Flagship/);
    assert.match(FLAGSHIP_HARD.source, /Hard mode/);
    const notes = FLAGSHIP_HARD.notes.join(" ");
    assert.match(notes, /two additional rooms/);
    assert.match(notes, /Positions are a picture/);
    assert.match(notes, /7 extra drones on Hard/);
    assert.match(notes, /Easy is 4 and Normal is 6/);
    assert.match(notes, /not averaged/);
    assert.match(notes, /two extra crew/);
    assert.match(notes, /5% lower evasion/);
    assert.doesNotMatch(notes, /\b(5\.5|5\.67|6\.5)\b/);
  });
});
