import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:lanius-ship-attacking-mantis";
  b.name = "Lanius ship attacking Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius ship attacking Mantis");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Lanius ship attacking Mantis", () => {
  it("attacking starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-mantis:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-mantis");
    assert.equal(g.scrap, 10);
  });

  it("winning either ending pays medium scrap, then contact", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      assert.equal(pageWin(g, "lanius-ship-attacking-mantis", dead), true);
      const body = g.event?.body ?? "";
      assert.match(body, dead ? /no more life-signs/ : /useful scrap material/);
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.event?.choices.some((c) => c.id === "q:lanius-mantis:contact"), true);
    }
  });

  it("contact pays 2-4 missiles with medium scrap, or another medium scrap", () => {
    let missiles = false;
    let wreck = false;
    for (let seed = 1; seed <= 40 && (!missiles || !wreck); seed++) {
      const g = createGame(seed);
      open(g);
      g.phase = "combat";
      pageWin(g, "lanius-ship-attacking-mantis", false);
      const before = g.scrap;
      const missilesBefore = g.missiles;
      const fuel = g.fuel;
      const parts = g.player.parts;
      const guns = g.player.weapons.length;
      choose(g, "q:lanius-mantis:contact");
      const body = g.event?.body ?? "";
      if (/hiss and click/.test(body)) {
        const extra = scraps(body);
        const got = body.match(/Missiles: (\d+)/);
        assert.equal(extra.length, 1, body);
        assert.ok(extra[0]! >= 12 && extra[0]! <= 19, body);
        assert.ok(got, body);
        const n = Number(got![1]);
        assert.ok(n >= 2 && n <= 4, body);
        assert.equal(g.scrap, before + extra[0]!);
        assert.equal(g.missiles, missilesBefore + n);
        assert.equal(g.fuel, fuel);
        assert.equal(g.player.parts, parts);
        assert.equal(resources(body), 1, body);
        missiles = true;
      } else {
        assert.match(body, /no survivors/);
        const extra = scraps(body);
        assert.equal(extra.length, 1, body);
        assert.ok(extra[0]! >= 12 && extra[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + extra[0]!);
        wreck = true;
      }
      assert.equal(g.player.weapons.length, guns);
    }
    assert.equal(missiles, true);
    assert.equal(wreck, true);
  });

  it("leaving shows the printed remains sentence and spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-mantis:1");
    assert.equal(
      g.event?.body,
      "The Mantis ship is quickly overcome by the Lanius vessel, and you move away as the Lanius feed on the remains.\n\nNothing happens.",
    );
    assert.equal(g.phase, "event");
    assert.equal(g.scrap, 10);
    assert.equal(g.enemy, null);
  });
});
