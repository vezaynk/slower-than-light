import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoiceDisabled, fillerChoose, fillerEvent } from "./filler-events.ts";
import { joinCrew } from "./surrender.ts";

const CURE = "Your advanced medical suite is able to isolate the cause of the problem and administer an antidote. That was a close one.";
const CLONE = "You stop your crew's clone from forming, knowing that the disease would follow into his next life.";
const SICK = /not going to make it/;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:plagued-station";
  b.name = "Plagued station";
  g.here = b.id;
  g.event = citedEvent(g, b);
  // The card lives on the filler list, stamped filler:plagued-station. citedEvent does not list it.
  if (!g.event) {
    b.flag = "filler:plagued-station";
    g.event = fillerEvent(g, b);
  }
  g.phase = "event";
  assert.equal(g.event?.title, "Plagued station");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0 && c.aboard === "player");
}

/** The disease card is one of three equal board results. */
function sick(setup?: (g: Game) => void): Game {
  for (let seed = 1; seed <= 80; seed++) {
    const g = createGame(seed);
    setup?.(g);
    open(g);
    fillerChoose(g, "c:plagued-station:0");
    if (SICK.test(g.event?.body ?? "")) return g;
  }
  assert.fail("no disease card");
}

describe("Plagued station", () => {
  it("shows the cure choice on the disease card and refuses it below a level 2 Medbay", () => {
    const g = sick();
    assert.ok(g.event?.choices.some((c) => c.id === "s:plagued-station:cure" && c.label === "Try to cure the disease."));
    assert.ok(g.event?.choices.some((c) => c.id === "s:plagued-station:continue"));
    g.player.systems.medbay.level = 1;
    assert.equal(fillerChoiceDisabled(g, "s:plagued-station:cure"), "Needs a level 2 Medbay");
    assert.equal(choiceDisabled(g, "s:plagued-station:cure"), "Needs a level 2 Medbay");
    const scrap = g.scrap;
    const crew = players(g).length;
    const weapons = g.player.weapons.length;
    const augments = g.augments.slice();
    fillerChoose(g, "s:plagued-station:cure");
    assert.match(g.event?.body ?? "", SICK);
    assert.equal(g.scrap, scrap);
    assert.equal(players(g).length, crew);
    assert.equal(g.player.weapons.length, weapons);
    assert.deepEqual(g.augments, augments);
  });

  it("a level 2 Medbay cures the disease and pays nothing more", () => {
    const g = sick((game) => {
      game.player.systems.medbay.level = 2;
    });
    assert.equal(fillerChoiceDisabled(g, "s:plagued-station:cure"), null);
    const scrap = g.scrap;
    const crew = players(g).map((c) => c.id);
    const weapons = g.player.weapons.length;
    const augments = g.augments.slice();
    assert.ok(scrap > 10);
    fillerChoose(g, "s:plagued-station:cure");
    assert.equal(g.event?.body, CURE);
    assert.equal(/Nothing happens/.test(g.event?.body ?? ""), false);
    assert.equal(g.scrap, scrap);
    assert.deepEqual(players(g).map((c) => c.id), crew);
    assert.equal(g.player.weapons.length, weapons);
    assert.deepEqual(g.augments, augments);
  });

  it("continuing loses a crewmember, and a Clone Bay does not revive them", () => {
    const plain = sick();
    assert.equal(joinCrew(plain, "Human"), true);
    const before = players(plain).length;
    assert.ok(before >= 2);
    const scrap = plain.scrap;
    fillerChoose(plain, "s:plagued-station:continue");
    const body = plain.event?.body ?? "";
    assert.match(body, /leave them behind/);
    assert.match(body, /is lost\./);
    assert.equal(body.includes(CLONE), false);
    assert.equal(/revived/.test(body), false);
    assert.equal(players(plain).length, before - 1);
    assert.equal(plain.scrap, scrap);

    const cloned = sick((game) => {
      game.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    });
    assert.equal(joinCrew(cloned, "Human"), true);
    const crew = players(cloned).length;
    assert.ok(crew >= 2);
    const paid = cloned.scrap;
    const weapons = cloned.player.weapons.length;
    fillerChoose(cloned, "s:plagued-station:continue");
    const next = cloned.event?.body ?? "";
    assert.match(next, /is lost\./);
    assert.ok(next.includes(CLONE));
    assert.ok(next.indexOf("is lost.") < next.indexOf(CLONE));
    assert.equal(/revived/.test(next), false);
    assert.equal(players(cloned).length, crew - 1);
    assert.equal(cloned.scrap, paid);
    assert.equal(cloned.player.weapons.length, weapons);
  });
});
