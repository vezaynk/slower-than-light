import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-attacking-civilians-in-last-stand";
  b.name = "Rebel ship attacking civilians in Last Stand";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

describe("Rebel ship attacking civilians in Last Stand reward", () => {
  it("pays medium scrap when the ship is destroyed and high scrap on a crew kill", () => {
    const destroyed = createGame(1);
    open(destroyed);
    const crew = destroyed.crew.filter((c) => c.side === "player").length;
    const guns = destroyed.player.weapons.length;
    choose(destroyed, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(destroyed.fightEvent, "rebel-ship-attacking-civilians-in-last-stand");
    assert.equal(pageWin(destroyed, "rebel-ship-attacking-civilians-in-last-stand", false), true);
    const body = destroyed.event?.body ?? "";
    assert.match(body, /With the Rebel ship destroyed you are free to contact their would-be victim/);
    assert.ok(destroyed.event?.choices.some((c) => c.id === "q:last-stand-survivors:contact"));
    const paid = scraps(body);
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(destroyed.scrap, 10 + paid[0]!);
    assert.equal(destroyed.crew.filter((c) => c.side === "player").length, crew);
    assert.equal(destroyed.player.weapons.length, guns);

    const killed = createGame(2);
    open(killed);
    choose(killed, "c:rebel-ship-attacking-civilians-in-last-stand:0");
    assert.equal(pageWin(killed, "rebel-ship-attacking-civilians-in-last-stand", true), true);
    const dead = killed.event?.body ?? "";
    assert.match(dead, /With the Rebel ship defeated you quickly salvage what you can/);
    const high = scraps(dead);
    assert.equal(high.length, 1, dead);
    assert.ok(high[0]! >= 19 && high[0]! <= 23, dead);
    assert.equal(resources(dead), 2, dead);
    assert.equal(killed.scrap, 10 + high[0]!);
  });

  it("contacting the survivors repairs 8 hull, pays medium resources with low scrap, or nothing", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      open(g);
      const hull = g.player.hull;
      const max = g.player.hullMax;
      choose(g, "c:rebel-ship-attacking-civilians-in-last-stand:0");
      assert.equal(pageWin(g, "rebel-ship-attacking-civilians-in-last-stand", false), true);
      const before = g.scrap;
      const guns = g.player.weapons.length;
      choose(g, "q:last-stand-survivors:contact");
      const body = g.event?.body ?? "";
      if (body.includes("repair a bit of damage")) {
        seen.add("repair");
        assert.match(body, /Hull repairs: 8/);
        assert.equal(g.player.hull, Math.min(max, hull + 8));
        assert.equal(g.scrap, before);
      } else if (body.includes("Take some supplies")) {
        seen.add("supplies");
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, before + paid[0]!);
        assert.equal(g.player.weapons.length, guns);
      } else if (body.includes("sincere gratitude")) {
        seen.add("thanks");
        assert.match(body, /Nothing happens/);
        assert.equal(g.scrap, before);
      } else {
        assert.fail(body);
      }
    }
    assert.deepEqual([...seen].sort(), ["repair", "supplies", "thanks"]);
  });
});
