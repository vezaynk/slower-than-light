import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "SLUG_DISTRESS_ROCK";
  b.name = "Slug ship boarding Rock ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Slug ship boarding Rock ship");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

describe("Slug ship boarding Rock ship", () => {
  it("engaging fights a Slug ship or the Slugs back down", () => {
    // Wiki citations:
    // > "Engage the Slug ship." — [[Slug ship boarding Rock ship]]
    // > "You charge weapons and the Slugs quickly change course to meet your charge." — [[Slug ship boarding Rock ship]]
    // > "Fight a Slug ship." — [[Slug ship boarding Rock ship]]
    // > "You charge your weapons and the Slugs immediately back down. When you return to the freighter, the Rockmen have already repaired the worst of their damage and jump away without another word." — [[Slug ship boarding Rock ship]]
    // > "Nothing happens." — [[Slug ship boarding Rock ship]]
    let fight = false;
    let down = false;
    for (let seed = 1; seed <= 40 && (!fight || !down); seed++) {
      const g = createGame(seed);
      open(g);
      fillerChoose(g, "c:slug-ship-boarding-rock-ship:0");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.enemy?.faction, "slug");
        assert.equal(g.scrap, 10);
        assert.ok(g.log.some((line) => line.includes("change course")));
      } else {
        down = true;
        assert.match(g.event?.body ?? "", /back down/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(fight && down, true);
  });

  it("ignoring them spends nothing twice as often as it starts a Rock fight", () => {
    // Wiki citations:
    // > "Ignore them." — [[Slug ship boarding Rock ship]]
    // > "2× You have no desire to provoke Slugs in their own territory. You leave them alone." — [[Slug ship boarding Rock ship]]
    // > "Nothing happens." — [[Slug ship boarding Rock ship]]
    // > "After the Slugs board the ship, you are surprised to see the Rock ship spring to life and decimate the other ship. They message you, \"Pathetic. You are either a coward or an ally of the Slugs. Either way, you don't deserve to live.\"" — [[Slug ship boarding Rock ship]]
    // > "Fight a Rock ship (default rewards)." — [[Slug ship boarding Rock ship]]
    let nothing = 0;
    let fight = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = createGame(seed);
      open(g);
      fillerChoose(g, "c:slug-ship-boarding-rock-ship:1");
      if (g.phase === "combat") {
        fight += 1;
        assert.equal(g.enemy?.faction, "rock");
        assert.equal(g.scrap, 10);
        assert.ok(g.log.some((line) => line.includes("don't deserve to live")));
      } else {
        nothing += 1;
        assert.match(g.event?.body ?? "", /leave them alone/);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.scrap, 10);
      }
    }
    assert.ok(nothing > fight);
    assert.ok(fight > 0);
  });

  it("winning the Slug fight pays medium scrap, then nothing or another medium from the freighter", () => {
    // Wiki citations:
    // > "After destroying enemy ship With the Slug ship destroyed, you retrieve some scrap and return to the Rock ship.After killing enemy crew With the Slugs no longer a threat, you strip the ship and return to the Rockmen." — [[Slug ship boarding Rock ship]]
    // > "You receive medium scrap with resources." — [[Slug ship boarding Rock ship]]
    // > "2× It appears that the Rock ship left during your battle. You doubt they could have been more ungrateful for your assistance. OR After the battle the Rock ship hails you. Their captain simply says, \"Thanks.\" and jumps away. That's pretty gracious of them, considering the Rockmen's reputation." — [[Slug ship boarding Rock ship]]
    // > "Nothing happens." — [[Slug ship boarding Rock ship]]
    // > "It appears the Rock ship was long since abandoned. You strip what you can from it." — [[Slug ship boarding Rock ship]]
    let left = false;
    let thanks = false;
    let abandoned = false;
    for (let seed = 1; seed <= 80 && (!left || !thanks || !abandoned); seed++) {
      for (const dead of [false, true]) {
        const g = createGame(seed + (dead ? 1000 : 0));
        open(g);
        g.phase = "combat";
        assert.equal(pageWin(g, "slug-ship-boarding-rock-ship", dead), true);
        const body = g.event?.body ?? "";
        const paid = scraps(body);
        assert.ok(paid.length >= 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        if (dead) assert.match(body, /no longer a threat/);
        else assert.match(body, /Slug ship destroyed/);
        if (/long since abandoned/.test(body)) {
          abandoned = true;
          assert.equal(paid.length, 2, body);
          assert.ok(paid[1]! >= 12 && paid[1]! <= 19, body);
        } else {
          assert.match(body, /Nothing happens/);
          assert.equal(paid.length, 1, body);
          if (/ungrateful/.test(body)) left = true;
          else {
            thanks = true;
            assert.match(body, /Thanks/);
          }
        }
      }
    }
    assert.equal(left && thanks && abandoned, true);
  });
});
