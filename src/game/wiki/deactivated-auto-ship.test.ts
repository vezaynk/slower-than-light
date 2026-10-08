import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, choiceDisabled, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:deactivated-auto-ship";
  b.name = "Deactivated Auto-ship";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Deactivated Auto-ship");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

function visited(g: Game): boolean[] {
  return g.beacons.map((b) => b.visited);
}

describe("Deactivated Auto-ship", () => {
  it("shows the download, the strip, and the sensors scan", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.some((c) => c.id === "c:deactivated-auto-ship:1"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:deactivated-auto-ship:0"), true);
    assert.equal(g.event?.choices.some((c) => c.id === "c:deactivated-auto-ship:2"), true);
    assert.match(g.event?.body ?? "", /de-activated/);
  });

  it("stripping the ship pays low scrap only", () => {
    const g = createGame(1);
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const seen = visited(g);
    choose(g, "c:deactivated-auto-ship:0");
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
    const note = g.log.find((line) => line.startsWith("Low scrap:"));
    assert.ok(note, g.log.join(" | "));
    const n = Number(note.slice("Low scrap: ".length).replace(".", ""));
    assert.ok(n >= 7 && n <= 10, note);
    assert.equal(g.scrap, 10 + n);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(g.fleet, 5);
    assert.deepEqual(visited(g), seen);
  });

  it("downloading the data pays low scrap with resources or starts an Auto-ship fight", () => {
    let data = false;
    let fight = false;
    for (let seed = 1; seed <= 40 && (!data || !fight); seed++) {
      const g = createGame(seed);
      open(g);
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const seen = visited(g);
      choose(g, "c:deactivated-auto-ship:1");
      if (g.phase === "combat") {
        fight = true;
        assert.equal(g.fightEvent, "deactivated-auto-ship");
        assert.equal(g.enemy?.faction, "auto");
        assert.equal(g.scrap, 10);
        assert.match(g.log.join("\n"), /reactivate the ships AI/);
      } else {
        data = true;
        const body = g.event?.body ?? "";
        assert.match(body, /map has been updated/);
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, 10 + paid[0]!);
        assert.equal(g.phase, "event");
        const gained = (g.fuel - fuel) + (g.missiles - missiles) + (g.player.parts - parts);
        assert.ok(gained >= 2 && gained <= 6, body);
      }
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.deepEqual(visited(g), seen);
      assert.equal(g.fleet, 5);
    }
    assert.equal(data && fight, true);
  });

  it("level 3 sensors pays that scrap or asks, and yes uses the download", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(choiceDisabled(bare, "c:deactivated-auto-ship:2"), "Needs level 3 Sensors");
    choose(bare, "c:deactivated-auto-ship:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);
    assert.match(bare.event?.body ?? "", /de-activated/);

    let safe = false;
    let standby = false;
    let yesData = false;
    let yesFight = false;
    for (let seed = 1; seed <= 80 && (!safe || !standby || !yesData || !yesFight); seed++) {
      const g = createGame(seed);
      open(g);
      g.player.systems.sensors.level = 3;
      assert.equal(choiceDisabled(g, "c:deactivated-auto-ship:2"), null);
      const seen = visited(g);
      choose(g, "c:deactivated-auto-ship:2");
      const body = g.event?.body ?? "";
      if (/safe to hack/.test(body)) {
        safe = true;
        const paid = scraps(body);
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
        assert.equal(resources(body), 2, body);
        assert.equal(g.scrap, 10 + paid[0]!);
        assert.equal(g.phase, "event");
        assert.deepEqual(visited(g), seen);
      } else {
        standby = true;
        assert.match(body, /on standby/);
        assert.equal(g.scrap, 10);
        assert.equal(g.event?.choices.some((c) => c.id === "q:deactivated-auto:yes"), true);
        assert.equal(g.event?.choices.some((c) => c.id === "q:deactivated-auto:no"), true);
        const no = createGame(seed);
        open(no);
        no.player.systems.sensors.level = 3;
        choose(no, "c:deactivated-auto-ship:2");
        choose(no, "q:deactivated-auto:no");
        assert.match(no.event?.body ?? "", /leave the ship alone/);
        assert.match(no.event?.body ?? "", /Nothing happens/);
        assert.equal(no.scrap, 10);
        assert.equal(no.fleet, 5);
        assert.equal(no.phase, "event");
        choose(g, "q:deactivated-auto:yes");
        if (g.phase === "combat") {
          yesFight = true;
          assert.equal(g.fightEvent, "deactivated-auto-ship");
          assert.equal(g.enemy?.faction, "auto");
          assert.equal(g.scrap, 10);
        } else {
          yesData = true;
          const next = g.event?.body ?? "";
          assert.match(next, /map has been updated/);
          const paid = scraps(next);
          assert.equal(paid.length, 1, next);
          assert.ok(paid[0]! >= 7 && paid[0]! <= 10, next);
          assert.equal(resources(next), 2, next);
          assert.deepEqual(visited(g), seen);
        }
      }
    }
    assert.equal(safe && standby && yesData && yesFight, true);
  });
});
