import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { choose, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";

const DESTROYED = "The ship explodes, leaving behind a collection of useful scrap material.";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:auto-ship-carrying-shield-virus";
  b.name = "Auto-ship carrying shield virus";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function quiet(g: Game) {
  assert.ok(g.enemy);
  for (const w of g.enemy.weapons) w.enabled = false;
  if (g.enemy.kits.spike) {
    g.enemy.kits.spike.on = false;
    g.enemy.kits.spike.power = 0;
  }
}

describe("Auto-ship carrying shield virus reward", () => {
  it("a destroyed ship pays medium scrap with resources, and a crew kill is not a separate reward", () => {
    const g = createGame(1);
    open(g);
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    const guns = g.player.weapons.length;
    const crew = g.crew.filter((c) => c.side === "player").length;
    choose(g, "c:auto-ship-carrying-shield-virus:0");
    quiet(g);
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "event");
    const body = g.event?.body ?? "";
    assert.ok(body.includes(DESTROYED), body);
    const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
    const paid = Number(body.match(/Scrap: (\d+)/)?.[1]);
    assert.ok(paid >= lo && paid <= hi, body);
    assert.equal(g.scrap, 10 + paid);
    const df = g.fuel - fuel;
    const dm = g.missiles - missiles;
    const dp = g.player.parts - parts;
    assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
    assert.ok(df === 0 || (df >= 1 && df <= 3), `fuel ${df}`);
    assert.ok(dm === 0 || (dm >= 1 && dm <= 2), `missiles ${dm}`);
    assert.ok(dp === 0 || dp === 1, `parts ${dp}`);
    assert.equal(g.player.weapons.length, guns);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew);

    const killed = createGame(2);
    open(killed);
    assert.equal(pageWin(killed, "auto-ship-carrying-shield-virus", true), false);
    assert.equal(killed.scrap, 10);
    assert.equal(killed.event?.body.includes(DESTROYED), false);
  });
});
