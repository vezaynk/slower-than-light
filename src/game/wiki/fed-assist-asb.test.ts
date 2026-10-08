import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addQuest, pageGotAway, pageWin, QUEST_ADDED } from "./quests.ts";
import { choose, commitJump, createGame, step } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function crewCount(g: Game): number {
  return g.crew.filter((c) => c.side === "player").length;
}

function here(g: Game): Beacon {
  return g.beacons.find((b) => b.id === g.here)!;
}

/** Jump to the marker `id` and return the arrival card, or null when this seed did not place it. */
function arriveQuest(seed: number, id: string): Game | null {
  const g = createGame(seed);
  if (addQuest(g, id) !== QUEST_ADDED) return null;
  const b = g.beacons.find((x) => x.quest === id);
  if (!b) return null;
  const from = here(g);
  if (!from.links.includes(b.id)) from.links.push(b.id);
  g.fuel = Math.max(g.fuel, 3);
  g.fleet = 0;
  g.phase = "map";
  g.event = null;
  commitJump(g, b.id);
  if (g.phase !== "event") return null;
  return g;
}

function cardKind(body: string): "auto" | "asb" | "wing" | null {
  if (body.includes("bombarded by an automated drone")) return "auto";
  if (body.includes("using their Anti-Ship Battery")) return "asb";
  if (body.includes("taking down the wing leader")) return "wing";
  return null;
}

describe("Federation Base Assist Anti-Ship Battery", () => {
  it("each distinct arrival card starts its own fight", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = arriveQuest(seed, "fed-assist");
      if (!g) continue;
      const kind = cardKind(g.event!.body);
      assert.ok(kind, g.event!.body);
      const id = g.event!.choices[0]!.id;
      choose(g, id);
      assert.equal(g.phase, "combat");
      if (kind === "auto") {
        assert.equal(g.fightEvent, "quest-fed-assist");
        assert.equal(g.asb, false);
      } else if (kind === "asb") {
        assert.equal(g.fightEvent, "quest-fed-assist-asb");
        assert.equal(g.asb, true);
      } else {
        assert.equal(g.fightEvent, "quest-fed-assist-wing");
        assert.equal(g.asb, true);
      }
      seen.add(kind!);
    }
    assert.deepEqual([...seen].sort(), ["asb", "auto", "wing"]);
  });

  it("the hidden-base assist branch uses the same three cards", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 240 && seen.size < 3; seed++) {
      const g = arriveQuest(seed, "fed-base");
      if (!g) continue;
      const kind = cardKind(g.event!.body);
      if (!kind) continue;
      choose(g, g.event!.choices[0]!.id);
      if (kind === "auto") assert.equal(g.fightEvent, "quest-fed-assist");
      else if (kind === "asb") assert.equal(g.asb, true);
      else assert.equal(g.fightEvent, "quest-fed-assist-wing");
      seen.add(kind);
    }
    assert.deepEqual([...seen].sort(), ["asb", "auto", "wing"]);
  });

  it("an Auto-ship battery win pays low scrap with resources, then high scrap, 7 repairs, and no crew", () => {
    const g = createGame(1);
    const crew = crewCount(g);
    const guns = g.player.weapons.length;
    choose(g, "q:fed-base:assist-asb");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "quest-fed-assist-asb");
    assert.equal(g.asb, true);
    assert.equal(g.enemy?.faction, "auto");
    assert.equal(pageWin(g, "quest-fed-assist-asb", false), true);
    const body = g.event?.body ?? "";
    assert.ok(body.startsWith("You scrap the wreckage."));
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.scrap, 10 + paid[0]!);
    assert.equal(crewCount(g), crew);
    assert.deepEqual(g.event?.choices.map((c) => c.id), ["q:fed-assist-asb:contact"]);

    g.player.hull = g.player.hullMax - 10;
    const hull = g.player.hull;
    const before = g.scrap;
    choose(g, "q:fed-assist-asb:contact");
    const contact = g.event?.body ?? "";
    assert.ok(contact.startsWith("You contact the station once the Rebel ship is destroyed. The lone survivor responds, \"This base is no longer safe. Let me join your crew and I'll have the station's drones patch up your ship.\""));
    const high = scraps(contact);
    assert.equal(high.length, 1, contact);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, contact);
    assert.equal(resources(contact), 2, contact);
    assert.equal(g.scrap, before + high[0]!);
    assert.match(contact, /Hull repairs: 7/);
    assert.equal(g.player.hull, hull + 7);
    assert.equal(crewCount(g), crew);
    assert.equal(g.player.weapons.length, guns);

    const killed = createGame(2);
    const killedCrew = crewCount(killed);
    choose(killed, "q:fed-base:assist-asb");
    assert.equal(pageWin(killed, "quest-fed-assist-asb", true), true);
    const dead = killed.event?.body ?? "";
    assert.ok(dead.startsWith("You scrap the wreckage."));
    const low = scraps(dead);
    assert.equal(low.length, 1, dead);
    assert.ok(low[0]! >= 7 && low[0]! <= 10, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(crewCount(killed), killedCrew);
  });

  it("the wing leader pays low or medium, and an escape pays nothing", () => {
    const destroyed = createGame(3);
    const crew = crewCount(destroyed);
    choose(destroyed, "q:fed-base:assist-wing");
    assert.equal(destroyed.phase, "combat");
    assert.equal(destroyed.fightEvent, "quest-fed-assist-wing");
    assert.equal(destroyed.asb, true);
    assert.equal(destroyed.enemy?.faction, "rebel");
    assert.equal(destroyed.enemySurrender?.chance, 0);
    assert.equal(destroyed.enemyEscape?.mode, "hull");
    assert.equal(destroyed.enemyEscape?.chance, 20);
    assert.equal(destroyed.enemyEscape?.seconds, 15);
    const threshold = destroyed.enemyEscape?.threshold ?? -1;
    assert.ok(threshold >= 40 && threshold <= 60);
    assert.equal(pageWin(destroyed, "quest-fed-assist-wing", false), true);
    const body = destroyed.event?.body ?? "";
    assert.ok(body.startsWith("You scrap the wreckage."));
    const low = scraps(body);
    assert.equal(low.length, 1, body);
    assert.ok(low[0]! >= 7 && low[0]! <= 10, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + low[0]!);
    assert.equal(crewCount(destroyed), crew);

    const killed = createGame(4);
    const killedCrew = crewCount(killed);
    choose(killed, "q:fed-base:assist-wing");
    assert.equal(pageWin(killed, "quest-fed-assist-wing", true), true);
    const dead = killed.event?.body ?? "";
    assert.ok(dead.startsWith("With the crew dead, you scrap the ship."));
    const mid = scraps(dead);
    assert.equal(mid.length, 1, dead);
    assert.ok(mid[0]! >= 12 && mid[0]! <= 19, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + mid[0]!);
    assert.equal(crewCount(killed), killedCrew);

    const gone = createGame(5);
    const goneCrew = crewCount(gone);
    pageGotAway(gone, "quest-fed-assist-wing");
    assert.equal(gone.event?.body, "The Rebel ship jumped away.");
    assert.equal(gone.scrap, 10);
    assert.equal(crewCount(gone), goneCrew);
    assert.deepEqual(gone.event?.choices.map((c) => c.id), ["q:fed-assist-wing:contact"]);
    choose(gone, "q:fed-assist-wing:contact");
    const contact = gone.event?.body ?? "";
    assert.equal(contact, "With the threat gone, you contact the Federation outpost. They respond, \"Our location has been compromised! Take everything you can and please drop our survivors off at the next station.\" One soldier offers to stay and fight.");
    assert.equal(gone.scrap, 10);
    assert.equal(crewCount(gone), goneCrew);
    assert.equal(scraps(contact).length, 0);
  });

  it("steps the friendly battery once across the warn boundary", () => {
    const g = createGame(6);
    choose(g, "q:fed-base:assist-asb");
    assert.equal(g.asb, true);
    assert.equal(g.asbPhase, "warn");
    assert.ok(g.asbWait >= 15 && g.asbWait < 20);
    g.asbT = g.asbWait;
    step(g, 0.05);
    assert.ok(g.log.includes("The planetary battery is aiming at the other ship."));
    assert.equal(g.asbPhase, "shot");
  });
});
