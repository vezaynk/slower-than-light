import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { ACCEPT_ID, REFUSE_ID, surrenderPlan } from "./surrender.ts";

const HAILS = [
  "\"We yield, aliens. We have no wish to die fighting you.\"",
  "\"You have bested us! I will no longer underestimate you Outsiders. Please, let us leave in peace.\"",
  "They appear to be transmitting the universal signals for surrender. Will you let them go?",
  "They message you, \"I see now there was a misunderstanding and there is no need for more bloodshed. Will you forgive our lack of discretion?\"",
  "\"We cannot beat you, we surrender. Surely there is mercy wherever you come from.\"",
];

function quiet(seed: number): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, "Crystal ship", false, "crystal-fight");
  g.enemy!.weapons = [];
  g.enemy!.boards = false;
  g.boardTimer = 0;
  g.enemyEscape!.mode = "never";
  return g;
}

function offer(g: Game) {
  g.enemySurrender!.chance = 100;
  g.enemySurrender!.threshold = 50;
  g.enemy!.hull = Math.max(1, Math.floor(g.enemy!.hullMax * 0.2));
  for (let i = 0; i < 4 && g.phase === "combat"; i++) step(g, 1 / 30);
}

describe("Crystal fight surrender", () => {
  it("offers at 40 percent between 30 and 40 hull", () => {
    const low = surrenderPlan({ tier: "pool", faction: "crystal", event: "crystal-fight" }, () => 0);
    const high = surrenderPlan({ tier: "pool", faction: "crystal", event: "crystal-fight" }, () => 1);
    assert.equal(low.chance, 40);
    assert.equal(low.threshold, 30);
    assert.equal(high.chance, 40);
    assert.equal(high.threshold, 40);
    assert.equal(surrenderPlan({ tier: "pool", faction: "crystal" }, () => 0).chance, 40);
  });

  it("hails with one printed line and does not show a reward yet", () => {
    // Wiki citations:
    // > "The surrender text varies, and could be any of the following:" — [[Crystal fight#The ship surrenders]]
    // > "\"We yield, aliens. We have no wish to die fighting you.\"" — [[Crystal fight#The ship surrenders]]
    // > "\"You have bested us! I will no longer underestimate you Outsiders. Please, let us leave in peace.\"" — [[Crystal fight#The ship surrenders]]
    // > "They appear to be transmitting the universal signals for surrender. Will you let them go?" — [[Crystal fight#The ship surrenders]]
    // > "They message you, \"I see now there was a misunderstanding and there is no need for more bloodshed. Will you forgive our lack of discretion?\"" — [[Crystal fight#The ship surrenders]]
    // > "\"We cannot beat you, we surrender. Surely there is mercy wherever you come from.\"" — [[Crystal fight#The ship surrenders]]
    // > "Accept their surrender." — [[Crystal fight#The ship surrenders]]
    // > "Ignore them." — [[Crystal fight#The ship surrenders]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < HAILS.length; seed++) {
      const g = quiet(seed);
      offer(g);
      assert.equal(g.phase, "event");
      const body = g.event?.body ?? "";
      assert.ok(HAILS.includes(body), body);
      assert.equal(body.includes("They offer"), false);
      assert.deepEqual(
        g.event?.choices.map((c) => c.label),
        ["Accept their surrender.", "Ignore them."],
      );
      seen.add(body);
    }
    assert.equal(seen.size, HAILS.length);
  });

  it("ignoring them keeps the fight going", () => {
    // Wiki citations:
    // > "You cut off communications and prepare to finish them off." — [[Crystal fight#The ship surrenders]]
    const g = quiet(4);
    offer(g);
    choose(g, REFUSE_ID);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "crystal");
    assert.ok(g.log.some((row) => /cut off communications/.test(row)));
    assert.equal(g.scrap, 10);
  });

  it("accepting asks a soldier, pays resources, or does nothing", () => {
    // Wiki citations:
    // > "What appears to be a young soldier pushes its way onto the vid screen, \"A captain both able and merciful? I have always wanted to explore beyond our restricted sector... Please, permit me to join your crew?\"" — [[Crystal fight#The ship surrenders]]
    // > "You receive a Crystal crewmember." — [[Crystal fight#The ship surrenders]]
    // > "\"I understand. We did try to kill you...\" They transfer some materials over before leaving." — [[Crystal fight#The ship surrenders]]
    // > "You receive a random amount of resources with some scrap." — [[Crystal fight#The ship surrenders]]
    // > "\"Thank you. I hope our early aggression will not prevent a future accord between our peoples.\" They transfer some goods as a means of compensation." — [[Crystal fight#The ship surrenders]]
    // > "They thank you for sparing them, their extreme aggression quickly changing to a calm acceptance. You're not sure if they're mocking you when they dryly state that \"your species has a knack for warfare\"." — [[Crystal fight#The ship surrenders]]
    // > "\"We would like to apologize for our xenophobia. You have shown that aliens can be compassionate, a fact unwritten in our history records. Please, take this.\"" — [[Crystal fight#The ship surrenders]]
    // > "Nothing happens." — [[Crystal fight#The ship surrenders]]
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 5; seed++) {
      const g = quiet(seed);
      const crew = g.crew.filter((c) => c.side === "player").length;
      offer(g);
      choose(g, ACCEPT_ID);
      const body = g.event?.body ?? "";
      if (/young soldier/.test(body)) {
        seen.add("soldier");
        assert.equal(g.enemy?.faction, "crystal");
        assert.equal(g.scrap, 10);
        assert.deepEqual(
          g.event?.choices.map((c) => c.id),
          ["s:crystal-fight:yes", "s:crystal-fight:no"],
        );
        if (!seen.has("decline")) {
          choose(g, "s:crystal-fight:no");
          seen.add("decline");
          assert.match(g.event?.body ?? "", /I understand/);
          assert.ok(g.scrap > 10);
          assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
        } else {
          choose(g, "s:crystal-fight:yes");
          seen.add("yes");
          assert.match(g.event?.body ?? "", /Crystal crewmember/);
          assert.equal(g.crew.filter((c) => c.side === "player" && c.kin === "crystal").length, 1);
          assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
        }
        assert.equal(g.enemy, null);
      } else if (/transfer some goods/.test(body) || /knack for warfare/.test(body) || /xenophobia/.test(body)) {
        seen.add("goods");
        assert.ok(g.scrap > 10);
        assert.equal(g.enemy, null);
        assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      } else {
        seen.add("nothing");
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, 10);
        assert.equal(g.enemy, null);
      }
    }
    assert.ok(seen.has("soldier"), [...seen].join(","));
    assert.ok(seen.has("yes"), [...seen].join(","));
    assert.ok(seen.has("decline"), [...seen].join(","));
    assert.ok(seen.has("goods"), [...seen].join(","));
    assert.ok(seen.has("nothing"), [...seen].join(","));
  });
});
