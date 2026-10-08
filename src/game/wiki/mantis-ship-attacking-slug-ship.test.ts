import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { surrenderPlan } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-ship-attacking-slug-ship";
  b.name = "Mantis ship attacking Slug ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Mantis ship attacking Slug ship");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Mantis ship attacking Slug ship", () => {
  it("leaving spends nothing, and attacking starts the named fight", () => {
    const out = createGame(1);
    open(out);
    choose(out, "c:mantis-ship-attacking-slug-ship:2");
    assert.equal(out.phase, "map");
    assert.equal(out.scrap, 10);

    const mantis = createGame(2);
    open(mantis);
    choose(mantis, "c:mantis-ship-attacking-slug-ship:0");
    assert.equal(mantis.phase, "combat");
    assert.equal(mantis.fightEvent, "mantis-ship-attacking-slug-ship");
    assert.equal(mantis.enemy?.faction, "mantis");
    assert.equal(mantis.enemyEscape?.mode, "never");
    assert.equal(mantis.scrap, 10);

    const slug = createGame(3);
    open(slug);
    choose(slug, "c:mantis-ship-attacking-slug-ship:1");
    assert.equal(slug.phase, "combat");
    assert.equal(slug.fightEvent, "mantis-ship-attacking-slug-ship-slug");
    assert.equal(slug.enemy?.faction, "slug");
    assert.equal(slug.enemyEscape?.mode, "never");
    assert.equal(surrenderPlan({ tier: "pool", event: "mantis-ship-attacking-slug-ship-slug", faction: "slug" }, () => 0).chance, 0);
  });

  it("saving the Slugs pays medium scrap with resources, then leaving or finishing them", () => {
    const saved = createGame(4);
    open(saved);
    const fuel = saved.fuel;
    const missiles = saved.missiles;
    const parts = saved.player.parts;
    const guns = saved.player.weapons.length;
    const augs = saved.augments.length;
    assert.equal(pageWin(saved, "mantis-ship-attacking-slug-ship", false), true);
    const body = saved.event?.body ?? "";
    assert.match(body, /liquid asssets/);
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(saved.scrap, 10 + paid[0]!);
    const gained = (saved.fuel - fuel) + (saved.missiles - missiles) + (saved.player.parts - parts);
    assert.ok(gained >= 2 && gained <= 6, body);
    assert.equal(saved.player.weapons.length, guns);
    assert.equal(saved.augments.length, augs);
    assert.equal(pageWin(createGame(5), "mantis-ship-attacking-slug-ship", true), true);

    const leave = createGame(6);
    open(leave);
    pageWin(leave, "mantis-ship-attacking-slug-ship", true);
    const scrap = leave.scrap;
    choose(leave, "q:mantis-slug:leave");
    assert.match(leave.event?.body ?? "", /aren't worth fighting/);
    assert.match(leave.event?.body ?? "", /Nothing happens/);
    assert.equal(leave.scrap, scrap);
    assert.equal(leave.augments.length, augs);

    const tiers = new Set<string>();
    let paidLow = false;
    for (let seed = 1; seed <= 80 && (tiers.size < 3 || !paidLow); seed++) {
      const g = createGame(seed);
      open(g);
      pageWin(g, "mantis-ship-attacking-slug-ship", false);
      const before = g.scrap;
      const beforeGuns = g.player.weapons.length;
      const beforeAugs = g.augments.length;
      const beforeFuel = g.fuel;
      const beforeMissiles = g.missiles;
      const beforeParts = g.player.parts;
      choose(g, "q:mantis-slug:finish");
      const text = g.event?.body ?? "";
      assert.equal(g.player.weapons.length, beforeGuns);
      assert.equal(g.augments.length, beforeAugs);
      const n = scraps(text)[0]!;
      if (/augmentation has already transported/.test(text)) {
        paidLow = true;
        assert.equal(resources(text), 0, text);
        assert.ok(n >= 7 && n <= 10, text);
        assert.equal(g.scrap, before + n);
        assert.equal(g.fuel, beforeFuel);
        assert.equal(g.missiles, beforeMissiles);
        assert.equal(g.player.parts, beforeParts);
      } else {
        assert.match(text, /breaks apart/);
        assert.equal(resources(text), 2, text);
        assert.equal(g.scrap, before + n);
        if (n >= 7 && n <= 10) tiers.add("low");
        else if (n >= 12 && n <= 18) tiers.add("medium");
        else if (n >= 20 && n <= 23) tiers.add("high");
      }
    }
    assert.equal(paidLow, true);
    assert.equal(tiers.has("low") && tiers.has("medium") && tiers.has("high"), true);
  });

  it("destroying the Slug ship pays high scrap with resources either way", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 7 : 8);
      open(g);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "mantis-ship-attacking-slug-ship-slug", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, /prized possessions/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 19 && paid[0]! <= 23, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
      assert.ok(gained >= 2 && gained <= 6, body);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.event?.choices.some((c) => c.id === "q:mantis-slug:finish"), false);
    }
  });
});
