import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-slug";
  b.name = "Lanius ship attacking Slug";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking Slug");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius ship attacking Slug", () => {
  it("attacking starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-slug:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-slug");
    assert.equal(g.scrap, 10);
  });

  it("winning either ending pays medium scrap, then contact", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "lanius-ship-attacking-slug", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /no more life-signs/ : /useful scrap material/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-slug:contact"), true);
    }
  });

  it("contact pays another medium scrap or nothing", () => {
    let paid = false;
    let nothing = false;
    for (let seed = 1; seed <= 40 && (!paid || !nothing); seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-attacking-slug", false);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, "q:lanius-slug:contact");
      const body = g.event?.body ?? "";
      if (/reluctantly thank you/.test(body)) {
        const extra = scraps(body);
        assert.equal(extra.length, 1, body);
        assert.ok(extra[0]! >= 12 && extra[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + extra[0]!);
        paid = true;
      } else {
        assert.match(body, /fled the system/);
        assert.match(body, /Nothing happens/);
        assert.equal(body.includes("Scrap:"), false);
        assert.equal(g.scrap, before);
        nothing = true;
      }
      assert.equal(g.player.weapons.length, guns);
    }
    assert.equal(paid, true);
    assert.equal(nothing, true);
  });

  it("leaving spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-slug:1");
    assert.equal(g.phase, "map");
    assert.equal(g.scrap, 10);
  });
});
