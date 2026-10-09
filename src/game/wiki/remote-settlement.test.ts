import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { scrapBand } from "./surrender.ts";

const CROP =
  "The pirate watches as you start to light the meager crops on fire. In a few moments the settlement surrenders, offering tribute to leave them alone. The pirate seems impressed.";
const DWELLING =
  "The pirate watches as you teleport an incendiary explosive into their settlement. As the settlers scramble to put out the fires, their rudimentary planetary defenses power down. Forcing their surrender was almost laughably easy, but the pirate seems impressed with your tactics and agrees to share the settlement's 'tribute'.";
const SCHEMATIC = "You receive a drone schematic with high scrap.";

const BODY =
  `Scans show a remote settlement being blockaded by a pirate ship. The ship hastily messages you, "Stay out of this, or you'll be next!...Concentrate fire on..."`;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:remote-settlement";
  b.name = "Remote settlement";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Remote settlement", () => {
  it("prints the blockade sentence and both choices", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.title, "Remote settlement");
    assert.equal(g.event?.body, BODY);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:1"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:2"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:remote-settlement:3"), true);
    assert.equal(
      g.event?.choices.find((c) => c.id === "c:remote-settlement:2")?.label,
      "Show the pirate how to intimidate settlers: burn their crops!",
    );
    assert.equal(
      g.event?.choices.find((c) => c.id === "c:remote-settlement:3")?.label,
      "Show the pirate how to intimidate settlers: start fires in their crude dwellings.",
    );
  });

  it("attacking the pirate starts a pirate fight and changes nothing else", () => {
    const g = createGame(1);
    open(g);
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:remote-settlement:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    assert.equal(g.enemy.faction === "pirate" || g.enemy.pirate === true, true);
    assert.equal(g.fightEvent, "remote-settlement");
    assert.equal(g.scrap, 10);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });

  it("ignoring them shows the printed jump sentence and nothing happens", () => {
    const g = createGame(1);
    const fuel = g.fuel;
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g);
    g.fleet = 5;
    choose(g, "c:remote-settlement:1");
    assert.equal(
      g.event?.body,
      "It's just not possible to save every civilian affected by this war. You prepare to jump.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.fuel, fuel);
    assert.equal(g.fleet, 5);
    assert.equal(g.enemy, null);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
  });

  it("refuses the fire choices without the weapon and changes nothing", () => {
    const g = createGame(1);
    open(g);
    assert.equal(choiceDisabled(g, "c:remote-settlement:2"), "Needs a Fire Beam");
    assert.equal(choiceDisabled(g, "c:remote-settlement:3"), "Needs a Fire Bomb");
    const body = g.event?.body;
    choose(g, "c:remote-settlement:2");
    choose(g, "c:remote-settlement:3");
    assert.equal(g.scrap, 10);
    assert.equal(g.missiles, 0);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.event?.body, body);
  });

  it("a fire beam burns the crops, pays high scrap, and does not grant the schematic", () => {
    const g = createGame(1);
    open(g);
    g.player.weapons.push({ uid: "w-fire", defId: "firebeam", charge: 0, enabled: false, autofire: false, target: null });
    const weapons = g.player.weapons.length;
    const parts = g.player.parts;
    const augments = g.augments.slice();
    const crew = g.crew.length;
    const drone = g.player.kits.swarm?.target;
    assert.equal(choiceDisabled(g, "c:remote-settlement:2"), null);
    choose(g, "c:remote-settlement:2");
    assert.equal(g.event?.body, `${CROP}\n\n${SCHEMATIC}`);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.sector, 1);
    assert.equal(g.difficulty, "normal");
    const [lo, hi] = scrapBand(g, "high");
    const gained = g.scrap - 10;
    assert.ok(gained >= lo && gained <= hi, `${gained} not in ${lo}-${hi}`);
    assert.equal(g.player.weapons.length, weapons);
    assert.equal(g.player.parts, parts);
    assert.deepEqual(g.augments, augments);
    assert.equal(g.crew.length, crew);
    assert.equal(g.player.kits.swarm?.target, drone);
    assert.equal(g.missiles, 0);
  });

  it("a fire bomb spends 1 missile, pays high scrap, and does not grant the schematic", () => {
    const g = createGame(1);
    open(g);
    g.player.weapons.push({ uid: "w-cask", defId: "cask", charge: 0, enabled: false, autofire: false, target: null });
    g.missiles = 1;
    const weapons = g.player.weapons.length;
    const parts = g.player.parts;
    const augments = g.augments.slice();
    const crew = g.crew.length;
    const drone = g.player.kits.swarm?.target;
    assert.equal(choiceDisabled(g, "c:remote-settlement:3"), null);
    choose(g, "c:remote-settlement:3");
    assert.equal(g.event?.body, `${DWELLING}\n\n${SCHEMATIC}`);
    assert.ok(g.event?.body.includes("'tribute'"));
    assert.equal(g.missiles, 0);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    const [lo, hi] = scrapBand(g, "high");
    const gained = g.scrap - 10;
    assert.ok(gained >= lo && gained <= hi, `${gained} not in ${lo}-${hi}`);
    assert.equal(g.player.weapons.length, weapons);
    assert.equal(g.player.parts, parts);
    assert.deepEqual(g.augments, augments);
    assert.equal(g.crew.length, crew);
    assert.equal(g.player.kits.swarm?.target, drone);
  });

  it("a fire bomb with no missiles is refused and changes nothing", () => {
    const g = createGame(1);
    open(g);
    g.player.weapons.push({ uid: "w-cask", defId: "cask", charge: 0, enabled: false, autofire: false, target: null });
    g.missiles = 0;
    const body = g.event?.body;
    const weapons = g.player.weapons.length;
    assert.equal(choiceDisabled(g, "c:remote-settlement:3"), "Need 1 missiles");
    choose(g, "c:remote-settlement:3");
    assert.equal(g.scrap, 10);
    assert.equal(g.missiles, 0);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.event?.body, body);
    assert.equal(g.player.weapons.length, weapons);
  });
});
