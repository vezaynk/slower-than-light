import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame, powerMask } from "../sim.ts";
import type { Game, Kit } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-security-checkpoint";
  b.name = "Zoltan security checkpoint";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Zoltan security checkpoint");
}

function kit(id: Kit["id"]): Kit {
  return { id, level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

function boarders(g: Game): number {
  return g.crew.filter((c) => c.side === "enemy" && c.aboard === "player" && c.kin === "energy")
    .length;
}

describe("Zoltan security checkpoint", () => {
  it("attacking starts a Zoltan fight, and the blue options stay closed", () => {
    // Wiki citations:
    // > "You don't have time for this nonsense. Attack!" — [[Zoltan security checkpoint]]
    // > "Expecting resistance, their Energy Shield is raised and ready for combat." — [[Zoltan security checkpoint]]
    // > "Fight a Zoltan ship (default rewards)." — [[Zoltan security checkpoint]]
    // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
    // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
    const g = createGame(1);
    open(g);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      [
        "c:zoltan-security-checkpoint:0",
        "c:zoltan-security-checkpoint:1",
        "c:zoltan-security-checkpoint:2",
        "c:zoltan-security-checkpoint:3",
      ],
    );
    assert.equal(choiceDisabled(g, "c:zoltan-security-checkpoint:2"), "Needs a Slug crewmember");
    assert.equal(choiceDisabled(g, "c:zoltan-security-checkpoint:3"), "Needs Mind Control");
    choose(g, "c:zoltan-security-checkpoint:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "zoltan-security-checkpoint");
    assert.equal(g.enemy?.faction, "zoltan");
    assert.equal(boarders(g), 0);
    assert.equal(g.scrap, 10);
    assert.equal(pageWin(g, "zoltan-security-checkpoint", false), false);
  });

  it("profiling lets the crew pass, or takes one and does not clone them", () => {
    // Wiki citations:
    // > "Submit to profiling." — [[Zoltan security checkpoint]]
    // > "After a few moments of uncertainty, your crew is allowed to pass." — [[Zoltan security checkpoint]]
    // > "Nothing happens." — [[Zoltan security checkpoint]]
    // > "The Zoltan security staff board your ship and begin scanning the crew's faces into a computer. Suddenly alarms go off and the Zoltan leap on one of your crew! \"This person is wanted on five charges of Utter Villainy! Surrender them to us!\"" — [[Zoltan security checkpoint]]
    // > "Give up your crewmember." — [[Zoltan security checkpoint]]
    // > "It's a tough call, but Zoltan law holds sway here. Besides, that one always seemed a bit shifty." — [[Zoltan security checkpoint]]
    // > "You lose a crewmember." — [[Zoltan security checkpoint]]
    // > "(Clone Bay) [no effect] Unfortunately your crewmember was taken away unharmed so your Clone Bay was unable to retrieve them." — [[Zoltan security checkpoint]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const g = createGame(seed);
      open(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:zoltan-security-checkpoint:1");
      const body = g.event?.body ?? "";
      if (/allowed to pass/.test(body)) {
        seen.add("pass");
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      } else {
        seen.add("wanted");
        assert.match(body, /Utter Villainy/);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(seen.has("pass") && seen.has("wanted"), true);

    const lone = createGame(2);
    open(lone);
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:zoltan-security-checkpoint:1");
      if (!/Utter Villainy/.test(g.event?.body ?? "")) continue;
      g.crew = g.crew.filter((c) => c.side === "player").slice(0, 1);
      choose(g, "q:zoltan-checkpoint:give");
      assert.equal(g.crew.filter((c) => c.side === "player").length, 1);
      assert.match(g.event?.body ?? "", /shifty/);
      assert.equal(/unharmed/.test(g.event?.body ?? ""), false);
      break;
    }

    let cloned = false;
    for (let seed = 1; seed <= 40 && !cloned; seed++) {
      const g = createGame(seed);
      open(g);
      const crew = g.crew.filter((c) => c.side === "player").length;
      g.crew.push({ ...g.crew[0]!, id: "spare", name: "Spare" });
      g.player.kits.clonebay = kit("clonebay");
      choose(g, "c:zoltan-security-checkpoint:1");
      if (!/Utter Villainy/.test(g.event?.body ?? "")) continue;
      cloned = true;
      choose(g, "q:zoltan-checkpoint:give");
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.match(g.event?.body ?? "", /Clone Bay was unable to retrieve them/);
      assert.equal(g.phase, "event");
    }
    assert.equal(cloned, true);
  });

  it("refusing the surrender fights with halved weapons and 2-4 Zoltan boarders", () => {
    // Wiki citations:
    // > "Refuse and fight." — [[Zoltan security checkpoint]]
    // > "You're not going to leave anyone behind. You pull away from the station with the enemy guards on board. Unfortunately, they are able to sabotage your weapon system in the chaos. It's time to leave!" — [[Zoltan security checkpoint]]
    // > "2-4 zoltan boarders beam aboard your ship and you fight a Zoltan ship with your Weapon Control halved." — [[Zoltan security checkpoint]]
    // > "After destroying enemy ship You scrap what you can and prepare to jump before the other guards arrive." — [[Zoltan security checkpoint]]
    // > "You receive low scrap with resources." — [[Zoltan security checkpoint]]
    // > "After killing enemy crew You scrap what you can and prepare to jump before the other guards arrive." — [[Zoltan security checkpoint]]
    // > "You receive medium scrap with resources." — [[Zoltan security checkpoint]]
    let fought = false;
    for (let seed = 1; seed <= 40 && !fought; seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:zoltan-security-checkpoint:1");
      if (!/Utter Villainy/.test(g.event?.body ?? "")) continue;
      fought = true;
      assert.equal(powerMask(g.player).some(Boolean), true);
      choose(g, "q:zoltan-checkpoint:fight");
      assert.equal(g.phase, "combat");
      assert.equal(g.fightEvent, "zoltan-security-checkpoint-scan");
      assert.equal(g.enemy?.faction, "zoltan");
      assert.equal(powerMask(g.player).some(Boolean), false);
      const n = boarders(g);
      assert.ok(n >= 2 && n <= 4, String(n));
      assert.ok(g.log.some((line) => /zoltan boarders/.test(line)));
    }
    assert.equal(fought, true);

    const destroyed = createGame(5);
    open(destroyed);
    assert.equal(pageWin(destroyed, "zoltan-security-checkpoint-scan", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /other guards arrive/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
    assert.equal(resources(body), 2, body);

    const killed = createGame(6);
    open(killed);
    assert.equal(pageWin(killed, "zoltan-security-checkpoint-scan", true), true);
    const high = scraps(killed.event?.body ?? "");
    assert.equal(high.length, 1);
    assert.ok(high[0]! >= 12 && high[0]! <= 19);
    assert.equal(resources(killed.event?.body ?? ""), 2);
  });

  it("a Slug or Mind Control is paid 2-4 fuel", () => {
    // Wiki citations:
    // > "(Slug Crew) Have your Slug talk them into letting you go." — [[Zoltan security checkpoint]]
    // > "You give the guards permission to dock with the ship, but before they come on board your crew member slowly advances to meet them. As far as you can tell no words were exchanged, but the guards offer you some supplies and say the ship checks out. Best to not ask questions." — [[Zoltan security checkpoint]]
    // > "You receive medium fuel." — [[Zoltan security checkpoint]]
    // > "(Mind Control) Make the guards believe they have already checked your crew today." — [[Zoltan security checkpoint]]
    // > "The captain of the guard appears on the vid screen \"Back so soon friend! Well, no need to waste your time further. Here, take these spare fuel canisters and get on with your mission.\" Your ship is cleared to pass." — [[Zoltan security checkpoint]]
    // > "You receive medium fuel." — [[Zoltan security checkpoint]]
    const slug = createGame(7);
    open(slug);
    slug.crew[0]!.kin = "slug";
    const missiles = slug.missiles;
    const parts = slug.player.parts;
    assert.equal(choiceDisabled(slug, "c:zoltan-security-checkpoint:2"), null);
    choose(slug, "c:zoltan-security-checkpoint:2");
    const body = slug.event?.body ?? "";
    assert.match(body, /ship checks out/);
    const fuel = Number(body.match(/Fuel: (\d+)/)?.[1]);
    assert.ok(fuel >= 2 && fuel <= 4, body);
    assert.equal(slug.fuel, fuel + createGame(7).fuel);
    assert.equal(slug.scrap, 10);
    assert.equal(slug.missiles, missiles);
    assert.equal(slug.player.parts, parts);

    const dead = createGame(8);
    open(dead);
    dead.crew[0]!.kin = "slug";
    dead.crew[0]!.hp = 0;
    assert.equal(choiceDisabled(dead, "c:zoltan-security-checkpoint:2"), "Needs a Slug crewmember");

    const mind = createGame(9);
    open(mind);
    mind.player.kits.mind = kit("mind");
    const base = mind.fuel;
    assert.equal(choiceDisabled(mind, "c:zoltan-security-checkpoint:3"), null);
    choose(mind, "c:zoltan-security-checkpoint:3");
    const mindBody = mind.event?.body ?? "";
    assert.match(mindBody, /spare fuel canisters/);
    const got = Number(mindBody.match(/Fuel: (\d+)/)?.[1]);
    assert.ok(got >= 2 && got <= 4, mindBody);
    assert.equal(mind.fuel, base + got);
    assert.equal(mind.scrap, 10);
  });
});
