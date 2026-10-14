import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, weaponSlotCap } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-great-eye";
  b.name = "Zoltan Great Eye";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan Great Eye");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

describe("Zoltan Great Eye", () => {
  it("leaving spends nothing", () => {
    // Wiki citations:
    // > "Your mission is to save the Federation, not discover new wonders around the galaxy. You prepare to jump." — [[Zoltan Great Eye]]
    const g = createGame(1);
    const crew = players(g).length;
    open(g);
    fillerChoose(g, "c:zoltan-great-eye:1");
    assert.match(g.event?.body ?? "", /save the Federation/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(players(g).length, crew);
  });

  it("pulling closer loses a crewmember, fights a Zoltan ship, pays high scrap, or mounts Healing Burst", () => {
    // Wiki citations:
    // > "Pull the ship in closer." — [[Zoltan Great Eye]]
    // > "As you approach, a kaleidoscope of colours fills the view-screen and one of your crew begins to age rapidly in reverse, eventually disappearing into nothingness. Let's hope they've transcended physical existence, and not just been forced out of it." — [[Zoltan Great Eye]]
    // > "You lose a crewmember." — [[Zoltan Great Eye]]
    // > "You approach the planet and wait, but nothing happens. The Zoltan hail: \"And in the coming times, when the monolith speaks not with a man he has no future and must be left wanting.\"" — [[Zoltan Great Eye]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan Great Eye]]
    // > "You approach the planet carefully, trying to keep your ship from breaking up in orbit. The monolith, whatever it is, must sense as much because the next thing you know you have enough scrap to patch up your damage and more besides!" — [[Zoltan Great Eye]]
    // > "You receive high scrap." — [[Zoltan Great Eye]]
    // > "As you approach, an ancient alien voice speaks to you: \"Your mission has brought you great battles, and great losses. This will help ease the pain.\" A few minutes later someone reports medical equipment has appeared on the ship!" — [[Zoltan Great Eye]]
    // > "You receive Healing Burst." — [[Zoltan Great Eye]]
    let lose = false;
    let fight = false;
    let scrap = false;
    let heal = false;
    for (let seed = 1; seed <= 80 && (!lose || !fight || !scrap || !heal); seed++) {
      const g = createGame(seed);
      const crew = players(g).length;
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      const body = g.event?.body ?? "";
      if (g.phase === "combat") {
        fight = true;
        assert.match(g.log.join(" "), /monolith speaks/);
        assert.equal(g.scrap, 10);
        assert.equal(players(g).length, crew);
      } else if (/kaleidoscope/.test(body)) {
        lose = true;
        assert.equal(players(g).length, crew - 1);
        assert.match(body, /is lost/);
        assert.equal(g.scrap, 10);
      } else if (/enough scrap/.test(body)) {
        scrap = true;
        const got = reward(body);
        assert.ok(got.scrap >= 19 && got.scrap <= 23, body);
        assert.equal(got.fuel, 0);
        assert.equal(got.missiles, 0);
        assert.equal(got.parts, 0);
        assert.equal(players(g).length, crew);
      } else {
        heal = true;
        assert.match(body, /Healing Burst/);
        assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), true);
        assert.equal(g.player.weapons.length, guns + 1);
        assert.equal(g.scrap, 10);
        assert.equal(players(g).length, crew);
      }
    }
    assert.equal(lose && fight && scrap && heal, true);
  });

  it("a clone bay does not bring the lost crewmember back", () => {
    // Wiki citations:
    // > "(Clone Bay) [no effect] You check your Cloning Bay but it lies dormant. Whatever just happened to your crewmember must be irreversible." — [[Zoltan Great Eye]]
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = players(g).length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      if (!/kaleidoscope/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.equal(players(g).length, crew - 1);
      assert.match(g.event?.body ?? "", /lies dormant/);
      assert.equal(/revived/.test(g.event?.body ?? ""), false);
    }
    assert.equal(seen, true);
  });

  it("stows a Healing Burst in cargo when the weapon list is full", () => {
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      while (g.player.weapons.length < weaponSlotCap(g)) {
        g.player.weapons.push({
          uid: `fill-${g.player.weapons.length}`,
          defId: "artemis",
          charge: 0,
          enabled: false,
          autofire: false,
          target: null,
        });
      }
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      if (!/medical equipment/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), false);
      // Per the user: a full rack stows it in cargo (make-room.ts).
      assert.match(g.event?.body ?? "", /stowed in cargo/);
      assert.deepEqual(g.cargo, [{ kind: "weapon", id: "healburst" }]);
    }
    assert.equal(seen, true);
  });
});
