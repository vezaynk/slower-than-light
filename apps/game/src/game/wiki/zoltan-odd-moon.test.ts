import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { CREW_CAP, choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { cargoOf } from "./make-room.ts";
import { joinCrew } from "./surrender.ts";

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: true,
    resolved: false,
    name: "Zoltan odd moon",
    tier: "",
    flag: "cited:zoltan-odd-moon",
    asteroid: false,
  };
}

function open(seed: number): Game {
  const g = createGame(seed);
  g.sectorId = "ZOLTAN_SECTOR";
  g.sectorName = "Zoltan Controlled Sector";
  const b = beacon();
  g.beacons = [b];
  g.here = b.id;
  const ev = citedEvent(g, b);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  g.paused = true;
  return g;
}

/** Weapons mounted plus weapons in cargo. A random weapon lands in one of the two. */
function heldWeapons(g: Game): number {
  return g.player.weapons.length + cargoOf(g).filter((c) => c.kind === "weapon").length;
}

function look(g: Game) {
  choose(g, "c:zoltan-odd-moon:look");
}

function fitBoard(g: Game) {
  g.player.kits.drones = {
    id: "drones",
    level: 2,
    power: 0,
    left: 0,
    cool: 0,
    target: "BOARDER",
    on: true,
    aux: 0,
    hp: 125,
  };
}

describe("Zoltan odd moon", () => {
  it("is placed in the two Zoltan sectors", () => {
    // Wiki citations:
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan odd moon]]
    assert.ok(citedPagesFor("ZOLTAN_SECTOR").some((ev) => ev.dest === "Zoltan odd moon"));
    assert.ok(citedPagesFor("ZOLTAN_HOME").some((ev) => ev.dest === "Zoltan odd moon"));
    assert.equal(
      citedPagesFor("CIVILIAN_SECTOR").some((ev) => ev.dest === "Zoltan odd moon"),
      false,
    );
  });

  it("opens on the moon and hides the boarding drone", () => {
    // Wiki citations:
    // > "Something strikes you as odd about a moon in the distance." — [[Zoltan odd moon]]
    // > "Send a drone to probe the surface." — [[Zoltan odd moon]]
    // > "(Boarding Drone)" — [[Zoltan odd moon]]
    // > "Drone parts lost: 1" — [[Zoltan odd moon]]
    const g = open(1);
    assert.match(g.event?.body ?? "", /odd about a moon/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:zoltan-odd-moon:look", "c:zoltan-odd-moon:leave", "c:zoltan-odd-moon:drone"],
    );
    assert.equal(choiceDisabled(g, "c:zoltan-odd-moon:drone"), "Needs a Boarding Drone");
    fitBoard(g);
    g.player.parts = 0;
    assert.equal(choiceDisabled(g, "c:zoltan-odd-moon:drone"), "Need 1 drone part");
  });

  it("leaves the moon and spends nothing", () => {
    // Wiki citations:
    // > "You try not to fixate on the moon in the aft scanner as you set the coordinates for the next jump." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    const g = open(2);
    const scrap = g.scrap;
    choose(g, "c:zoltan-odd-moon:leave");
    assert.equal(g.scrap, scrap);
    assert.match(g.event?.body ?? "", /aft scanner/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
  });

  it("check it out reaches the cavern, the low scrap, the medium scrap, and nothing", () => {
    // Wiki citations:
    // > "It looks as if a team could break through the fragile layer of the moon's surface into a hidden cavern." — [[Zoltan odd moon]]
    // > "Sending a shuttle to explore a beckoning cave system you discover signs of a battle - and a still-functioning weapon!" — [[Zoltan odd moon]]
    // > "You receive a weapon with low scrap." — [[Zoltan odd moon]]
    // > "A deep scan of the surface reveals a cave system that runs for miles, and what looks like a scrap heap left over from some heavy-duty construction." — [[Zoltan odd moon]]
    // > "You receive medium scrap." — [[Zoltan odd moon]]
    // > "A closer inspection reveals signs of habitation on the surface, but nothing else particularly interesting." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const g = open(seed);
      const weapons = heldWeapons(g);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      look(g);
      const body = g.event?.body ?? "";
      if (body.includes("hidden cavern")) seen.add("cave");
      else if (body.includes("still-functioning weapon")) {
        seen.add("shuttle");
        // Rewards, "Weapon": "A random weapon & T scrap."
        assert.equal(heldWeapons(g), weapons + 1);
        assert.match(body, /(mounted|stowed in cargo)\./);
        const paid = body.match(/Low scrap: (\d+)/);
        assert.ok(paid);
        const n = Number(paid[1]);
        assert.ok(n >= 7 && n <= 10, String(n));
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else if (body.includes("scrap heap")) {
        seen.add("medium");
        const paid = body.match(/Medium scrap: (\d+)/);
        assert.ok(paid);
        const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
        const n = Number(paid[1]);
        assert.ok(n >= lo && n <= hi, String(n));
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
      } else if (body.includes("signs of habitation")) {
        seen.add("quiet");
        assert.match(body, /Nothing happens/);
      } else {
        assert.fail(body);
      }
    }
    assert.deepEqual([...seen].sort(), ["cave", "medium", "quiet", "shuttle"]);
  });

  it("keeps the missile when excavation is not worth it, and refuses a dry magazine", () => {
    // Wiki citations:
    // > "It looks as if a team could break through the fragile layer of the moon's surface into a hidden cavern." — [[Zoltan odd moon]]
    // > "Explosives are too valuable to waste on excavation work. Let's get out of here." — [[Zoltan odd moon]]
    // > "Nothing happens." — [[Zoltan odd moon]]
    let spare = false;
    let dry = false;
    for (let seed = 1; seed <= 40 && (!spare || !dry); seed++) {
      const g = open(seed);
      look(g);
      if (!g.event?.body.includes("hidden cavern")) continue;
      if (!spare) {
        const missiles = g.missiles;
        choose(g, "c:zoltan-odd-moon:spare");
        assert.equal(g.missiles, missiles);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        spare = true;
      }
      if (!dry) {
        const again = open(seed);
        look(again);
        if (!again.event?.body.includes("hidden cavern")) continue;
        again.missiles = 0;
        const scrap = again.scrap;
        choose(again, "c:zoltan-odd-moon:boom");
        assert.equal(again.missiles, 0);
        assert.equal(again.scrap, scrap);
        assert.match(again.event?.body ?? "", /hidden cavern/);
        dry = true;
      }
    }
    assert.equal(spare, true);
    assert.equal(dry, true);
  });

  it("spends one missile; the base gives a weapon with a random scrap band, the remains a scrap band", () => {
    // Wiki citations:
    // > "Missiles lost: 1" — [[Zoltan odd moon]]
    // > "Your explosives reveal the 'cave' is actually a secret base, located in a network of bunkers just under the surface. Everyone inside is dead; Mantis clearly came through here recently. It looks like the Zoltan were researching advanced ship weaponry. You take one of the better examples back to your ship." — [[Zoltan odd moon]]
    // > "You receive a weapon with a random amount of scrap." — [[Zoltan odd moon]]
    // > "A portion of the surface layer is destroyed in an impressive display, revealing miles of caves. You don't have time to fully explore them, but you find some remains of an old subterranean base that could be useful." — [[Zoltan odd moon]]
    // > "You receive a random amount of scrap." — [[Zoltan odd moon]]
    // > "The explosives are set remotely, but the detonation achieves nothing. What a waste." — [[Zoltan odd moon]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const g = open(seed);
      look(g);
      if (!g.event?.body.includes("hidden cavern")) continue;
      const weapons = heldWeapons(g);
      const scrap = g.scrap;
      g.missiles = 4;
      choose(g, "c:zoltan-odd-moon:boom");
      assert.equal(g.missiles, 3);
      const body = g.event?.body ?? "";
      if (body.includes("secret base")) {
        // "You receive a weapon with a random amount of scrap."
        assert.ok(g.scrap > scrap);
        assert.match(body, /(Low|Medium|High) scrap: \d+\./);
        assert.equal(heldWeapons(g), weapons + 1);
        assert.match(body, /(mounted|stowed in cargo)\./);
        seen.add("base");
      } else if (body.includes("subterranean base")) {
        assert.ok(g.scrap > scrap);
        assert.equal(heldWeapons(g), weapons);
        seen.add("remains");
      } else if (body.includes("What a waste")) {
        assert.equal(g.scrap, scrap);
        assert.equal(heldWeapons(g), weapons);
        seen.add("waste");
      } else assert.fail(body);
    }
    assert.deepEqual([...seen].sort(), ["base", "remains", "waste"]);
  });

  it("a boarding drone spends one part and a Zoltan joins", () => {
    // Wiki citations:
    // > "Drone parts lost: 1" — [[Zoltan odd moon]]
    // > "Initial scans indicate a network of caves not far underground. You launch a boarding drone and it breaks through the surface into the cavern below." — [[Zoltan odd moon]]
    // > "Your drone discovers a vast cave network and evidence of excavation. Buried deep below you find a Zoltan scientist, still hard at work. He tells you that all his colleagues are long dead. You decide not to ask questions and offer to let him join your crew." — [[Zoltan odd moon]]
    // > "You receive a Zoltan crewmember." — [[Zoltan odd moon]]
    const g = open(6);
    fitBoard(g);
    g.player.parts = 3;
    const before = g.crew.filter((c) => c.side === "player").length;
    const sparks = g.crew.filter((c) => c.kin === "energy").length;
    choose(g, "c:zoltan-odd-moon:drone");
    assert.equal(g.player.parts, 2);
    assert.equal(g.crew.filter((c) => c.side === "player").length, before + 1);
    assert.equal(g.crew.filter((c) => c.kin === "energy").length, sparks + 1);
    assert.match(g.event?.body ?? "", /You receive a Zoltan crewmember/);
    assert.match(g.event?.body ?? "", /boarding drone/);
  });

  it("a ninth crewmember asks who is relieved", () => {
    const g = open(7);
    fitBoard(g);
    g.player.parts = 2;
    while (g.crew.filter((c) => c.side === "player").length < CREW_CAP)
      assert.equal(joinCrew(g, "Human"), true);
    choose(g, "c:zoltan-odd-moon:drone");
    assert.equal(g.player.parts, 1);
    // Crew: a 9th comes aboard and the player picks who is relieved (make-room.ts).
    assert.equal(g.crew.filter((c) => c.side === "player").length, CREW_CAP + 1);
    assert.deepEqual(g.overflow, [{ kind: "crew" }]);
  });
});
