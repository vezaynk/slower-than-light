import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rock-and-slug-standoff";
  b.name = "Rock and Slug standoff";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rock and Slug standoff");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Rock and Slug standoff", () => {
  it("leaves them with nothing spent", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:rock-and-slug-standoff:1");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.phase, "event");
  });

  it("shows a 10-15 debt and refuses a shortfall", () => {
    const g = createGame(3);
    open(g);
    choose(g, "c:rock-and-slug-standoff:0");
    const debt = g.event?.choices.find((c) => c.id.startsWith("s:rock-slug:debt:"));
    assert.ok(debt);
    const n = Number(debt.id.split(":").pop());
    assert.ok(n >= 10 && n <= 15, debt.label);
    assert.match(debt.label, new RegExp(`\\[${n} scrap\\]`));
    g.scrap = n - 1;
    assert.equal(choiceDisabled(g, debt.id), `Need ${n} scrap`);
    g.scrap = 0;
    choose(g, debt.id);
    assert.equal(g.scrap, 0);
    assert.match(g.event?.body ?? "", /thick boulder heads/);
  });

  it("paying the debt spends that scrap and the Slug captain answers", () => {
    let free = false;
    let price = false;
    let thanks = false;
    for (let seed = 1; seed <= 80 && (!free || !price || !thanks); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:rock-and-slug-standoff:0");
      const debt = g.event?.choices.find((c) => c.id.startsWith("s:rock-slug:debt:"));
      assert.ok(debt);
      const n = Number(debt.id.split(":").pop());
      g.scrap = 40;
      const reactor = g.player.reactor;
      choose(g, debt.id);
      assert.equal(g.scrap, 40 - n);
      const body = g.event?.body ?? "";
      assert.match(body, /pay off the debt/);
      if (/free reactor upgrade/.test(body)) {
        free = true;
        assert.equal(g.player.reactor, reactor + 1);
        assert.match(body, /Your ship reactor is upgraded/);
      } else if (/fair' price/.test(body)) {
        price = true;
        assert.equal(g.player.reactor, reactor);
        assert.ok(g.event?.choices.some((c) => c.id.startsWith("s:rock-slug:upgrade:")));
      } else {
        thanks = true;
        assert.match(body, /Nothing happens/);
        assert.equal(g.player.reactor, reactor);
      }
    }
    assert.equal(free && price && thanks, true);
  });

  it("demanding payment agrees, fights a Rock ship, or deals 5 hull and two system bars", () => {
    let pay = false;
    let fight = false;
    let boom = false;
    for (let seed = 1; seed <= 80 && (!pay || !fight || !boom); seed++) {
      const g = createGame(seed);
      const hull = g.player.hull;
      const damage = Object.fromEntries(Object.entries(g.player.systems).map(([id, sys]) => [id, sys.damage]));
      open(g);
      choose(g, "c:rock-and-slug-standoff:0");
      choose(g, "s:rock-slug:demand");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.scrap, 10);
        assert.equal(g.enemy?.faction, "rock");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.player.hull, hull);
        assert.ok(g.log.some((line) => line.includes("slime balls")));
      } else if (/massive explosion/.test(g.event?.body ?? "")) {
        boom = true;
        assert.equal(g.player.hull, hull - 5);
        assert.equal(g.scrap, 10);
        const hit = Object.entries(g.player.systems).filter(([id, sys]) => sys.damage > (damage[id] ?? 0));
        assert.equal(hit.length, 2);
      } else {
        pay = true;
        assert.match(g.event?.body ?? "", /agrees to pay the price/);
        assert.equal(g.scrap, 10);
        assert.equal(g.player.hull, hull);
      }
    }
    assert.equal(pay && fight && boom, true);
  });

  it("winning pays low scrap for the hull and medium scrap for the crew, then the Slug captain", () => {
    let free = false;
    let price = false;
    let thanks = false;
    for (let seed = 1; seed <= 80 && (!free || !price || !thanks); seed++) {
      for (const dead of [false, true]) {
        const g = createGame(seed + (dead ? 500 : 0));
        open(g);
        g.phase = "combat";
        const reactor = g.player.reactor;
        assert.equal(pageWin(g, "rock-and-slug-standoff", dead), true);
        const body = g.event?.body ?? "";
        const paid = scraps(body).filter((n) => n > 0);
        assert.equal(paid.length, 1, body);
        if (dead) {
          assert.match(body, /Rock crew dead/);
          assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        } else {
          assert.match(body, /Rock Ship destroyed/);
          assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        }
        assert.equal(resources(body), 2, body);
        if (/free reactor upgrade/.test(body)) {
          free = true;
          assert.equal(g.player.reactor, reactor + 1);
        } else if (/fair' price/.test(body)) {
          price = true;
          assert.equal(g.player.reactor, reactor);
        } else {
          thanks = true;
          assert.match(body, /Nothing happens/);
        }
      }
    }
    assert.equal(free && price && thanks, true);
  });

  it("the priced upgrade spends the shown scrap, and a full reactor stays at 25", () => {
    let agreed = false;
    let declined = false;
    let capped = false;
    for (let seed = 1; seed <= 80 && (!agreed || !declined || !capped); seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      g.scrap = 40;
      pageWin(g, "rock-and-slug-standoff", false);
      const upgrade = g.event?.choices.find((c) => c.id.startsWith("s:rock-slug:upgrade:"));
      if (!upgrade) continue;
      const n = Number(upgrade.id.split(":").pop());
      assert.ok(n >= 10 && n <= 15);
      if (!declined) {
        const scrap = g.scrap;
        const reactor = g.player.reactor;
        choose(g, "s:rock-slug:decline");
        assert.equal(g.scrap, scrap);
        assert.equal(g.player.reactor, reactor);
        assert.match(g.event?.body ?? "", /Nothing happens/);
        declined = true;
        continue;
      }
      if (!agreed) {
        const scrap = g.scrap;
        const reactor = g.player.reactor;
        choose(g, upgrade.id);
        assert.equal(g.scrap, scrap - n);
        assert.equal(g.player.reactor, reactor + 1);
        assert.match(g.event?.body ?? "", /Your ship reactor is upgraded/);
        agreed = true;
      }
    }
    for (let seed = 1; seed <= 80 && !capped; seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      g.player.reactor = 25;
      pageWin(g, "rock-and-slug-standoff", false);
      if (!/free reactor upgrade/.test(g.event?.body ?? "")) continue;
      assert.equal(g.player.reactor, 25);
      assert.equal((g.event?.body ?? "").includes("Your ship reactor is upgraded."), false);
      capped = true;
    }
    assert.equal(agreed && declined && capped, true);
  });
});
