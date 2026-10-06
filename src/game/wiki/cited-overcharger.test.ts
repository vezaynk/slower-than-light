import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DRONE_POWER, deploy, swarmIntercept, tickSwarm } from "../extras/swarm.ts";
import { HULLS } from "../hulls.ts";
import { commitJump, createGame, startCombat } from "../sim.ts";
import type { Game } from "../types.ts";
import { OVERCHARGER, OVERCHARGER_PLUS } from "./cited-overcharger.ts";
import { CITED_DRONES, citedSell, citedSellQuote, citedStock } from "./cited-stores.ts";

const src = readFileSync(new URL("./cited-overcharger.ts", import.meta.url), "utf8");

function arm(g: Game, power: number) {
  g.player.parts = 3;
  g.player.kits.swarm = {
    id: "swarm",
    level: 4,
    power,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function jump(g: Game) {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here?.links[0]);
  g.phase = "map";
  g.fuel = 3;
  commitJump(g, here.links[0]!);
}

describe("Shield Overcharger citation", () => {
  it("records the power requirements and the five waits", () => {
    assert.equal(OVERCHARGER.power, 3);
    assert.equal(OVERCHARGER_PLUS.power, 2);
    assert.deepEqual(OVERCHARGER.waits, [8, 10, 13, 16, 20]);
    assert.equal(OVERCHARGER_PLUS.sell, 30);
    assert.equal("speed" in OVERCHARGER, false);
    assert.equal("cooldown" in OVERCHARGER, false);
    assert.deepEqual(Object.keys(OVERCHARGER), ["power", "waits"]);
    assert.deepEqual(Object.keys(OVERCHARGER_PLUS), ["power", "sell"]);
  });

  it("quotes the table and does not define a function", () => {
    assert.match(src, /Power requirement: 3 power/);
    assert.match(src, /Power requirement: 2 power/);
    assert.match(src, /8s\/10s\/13s\/16s\/20s for 0\/1\/2\/3\/4 existing layers/);
    assert.match(src, /Sells for: 30 \(cannot be bought or found\)/);
    assert.match(src, /Speed: 5/);
    assert.equal(src.includes("function "), false);
    assert.equal(src.includes("export function"), false);
  });
});

describe("Shield Overcharger", () => {
  it("adds one point on each printed wait and then stops", () => {
    const g = createGame(1);
    arm(g, 3);
    const seed = g.seed;
    assert.equal(deploy(g, "overcharger"), true);
    assert.equal(g.player.parts, 2);
    assert.equal(deploy(g, "overcharger"), true);
    assert.equal(g.player.parts, 2);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(kit.target, "overcharger");
    assert.equal(g.player.zoltan ?? null, null);
    assert.equal(kit.left, 0);
    assert.equal(kit.aux, 0);

    tickSwarm(g, 7.9);
    assert.equal(g.player.zoltan ?? null, null);
    assert.equal(kit.left, 8);
    assert.ok(kit.aux < 8);
    assert.equal(g.shots.length, 0);
    assert.equal(g.seed, seed);

    const exact = createGame(21);
    arm(exact, 3);
    assert.equal(deploy(exact, "overcharger"), true);
    const ready = exact.player.kits.swarm;
    assert.ok(ready);
    tickSwarm(exact, 8);
    assert.equal(exact.player.zoltan, 1);
    assert.equal(exact.player.zoltanOver, true);
    assert.equal(ready.left, 10);
    assert.equal(ready.aux, 0);
    assert.equal(exact.shots.length, 0);

    tickSwarm(exact, 10);
    assert.equal(exact.player.zoltan, 2);
    assert.equal(ready.left, 13);
    tickSwarm(exact, 13);
    assert.equal(exact.player.zoltan, 3);
    assert.equal(ready.left, 16);
    tickSwarm(exact, 16);
    assert.equal(exact.player.zoltan, 4);
    assert.equal(ready.left, 20);
    tickSwarm(exact, 20);
    assert.equal(exact.player.zoltan, 5);
    assert.equal(ready.left, 0);
    assert.equal(ready.aux, 0);
    tickSwarm(exact, 30);
    assert.equal(exact.player.zoltan, 5);
    assert.equal(ready.left, 0);
  });

  it("reaches five layers in one 67 second tick and not in 66", () => {
    const full = createGame(2);
    arm(full, 3);
    assert.equal(deploy(full, "overcharger"), true);
    tickSwarm(full, 67);
    assert.equal(full.player.zoltan, 5);
    assert.equal(full.player.kits.swarm?.left, 0);
    tickSwarm(full, 30);
    assert.equal(full.player.zoltan, 5);

    const short = createGame(3);
    arm(short, 3);
    assert.equal(deploy(short, "overcharger"), true);
    tickSwarm(short, 66);
    assert.equal(short.player.zoltan, 4);
    assert.equal(short.player.kits.swarm?.left, 20);
    assert.equal(short.player.kits.swarm?.aux, 19);
    tickSwarm(short, 1);
    assert.equal(short.player.zoltan, 5);
  });

  it("resets the timer when power drops and does not charge below 3", () => {
    const g = createGame(4);
    arm(g, 3);
    assert.equal(deploy(g, "overcharger"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    tickSwarm(g, 7);
    assert.equal(g.player.zoltan ?? null, null);
    assert.equal(kit.aux, 7);
    assert.equal(kit.left, 8);

    kit.power = 0;
    tickSwarm(g, 10);
    assert.equal(g.player.zoltan ?? null, null);
    assert.equal(kit.aux, 0);
    assert.equal(kit.left, 0);

    kit.power = 3;
    tickSwarm(g, 1);
    assert.equal(g.player.zoltan ?? null, null);
    assert.equal(kit.left, 8);
    assert.equal(kit.aux, 1);
    tickSwarm(g, 7);
    assert.equal(g.player.zoltan, 1);

    const weak = createGame(5);
    arm(weak, 2);
    assert.equal(deploy(weak, "overcharger"), true);
    tickSwarm(weak, 67);
    assert.equal(weak.player.zoltan ?? null, null);
    assert.equal(weak.player.kits.swarm?.aux, 0);
    assert.equal(weak.player.kits.swarm?.left, 0);
  });

  it("keeps the wait that already started when the layer count changes", () => {
    const g = createGame(6);
    arm(g, 3);
    assert.equal(deploy(g, "overcharger"), true);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    tickSwarm(g, 3);
    assert.equal(kit.left, 8);
    assert.equal(kit.aux, 3);
    g.player.zoltan = 1;
    tickSwarm(g, 5);
    assert.equal(g.player.zoltan, 2);
    assert.equal(kit.left, 13);
    assert.equal(kit.aux, 0);
    assert.equal(g.player.zoltanOver ?? false, false);
  });

  it("does not start a wait at five or twelve existing layers", () => {
    const five = createGame(7);
    arm(five, 3);
    five.player.zoltan = 5;
    assert.equal(deploy(five, "overcharger"), true);
    tickSwarm(five, 100);
    assert.equal(five.player.zoltan, 5);
    assert.equal(five.player.zoltanOver ?? false, false);
    assert.equal(five.player.kits.swarm?.left, 0);

    const twelve = createGame(8);
    arm(twelve, 3);
    twelve.player.zoltan = 12;
    assert.equal(deploy(twelve, "overcharger"), true);
    tickSwarm(twelve, 40);
    assert.equal(twelve.player.zoltan, 12);
    assert.equal(twelve.player.zoltanOver ?? false, false);
  });

  it("does not shoot and does not intercept", () => {
    const g = createGame(9);
    arm(g, 3);
    assert.equal(deploy(g, "overcharger"), true);
    tickSwarm(g, 3);
    const kit = g.player.kits.swarm;
    assert.ok(kit);
    assert.equal(swarmIntercept(g, { kind: "missile", from: "enemy" }), false);
    assert.equal(kit.aux, 3);
    assert.equal(kit.left, 8);
    assert.equal(g.shots.length, 0);
    assert.equal(Object.hasOwn(DRONE_POWER, "overcharger"), false);
    assert.equal(Object.hasOwn(DRONE_POWER, "overchargerplus"), false);
  });

  it("loses a bubble it created and still recharges one that was already there", () => {
    const made = createGame(10);
    arm(made, 3);
    assert.equal(deploy(made, "overcharger"), true);
    tickSwarm(made, 8);
    assert.equal(made.player.zoltan, 1);
    assert.equal(made.player.zoltanOver, true);
    jump(made);
    assert.equal(made.player.zoltan ?? null, null);
    assert.equal(made.player.zoltanOver ?? false, false);

    const spent = createGame(11);
    arm(spent, 3);
    assert.equal(deploy(spent, "overcharger"), true);
    tickSwarm(spent, 8);
    spent.player.zoltan = 0;
    jump(spent);
    assert.equal(spent.player.zoltan ?? null, null);

    const cruiser = createGame(12, "zoltan-a");
    assert.equal(cruiser.player.zoltan, 5);
    arm(cruiser, 3);
    assert.equal(deploy(cruiser, "overcharger"), true);
    tickSwarm(cruiser, 30);
    assert.equal(cruiser.player.zoltan, 5);
    jump(cruiser);
    assert.equal(cruiser.player.zoltan, 5);

    const depleted = createGame(13, "zoltan-a");
    depleted.player.zoltan = 0;
    arm(depleted, 3);
    assert.equal(deploy(depleted, "overcharger"), true);
    tickSwarm(depleted, 8);
    assert.equal(depleted.player.zoltan, 1);
    assert.equal(depleted.player.zoltanOver ?? false, false);
    jump(depleted);
    assert.equal(depleted.player.zoltan, 5);

    const flag = createGame(14);
    flag.player.zoltan = 12;
    arm(flag, 3);
    assert.equal(deploy(flag, "overcharger"), true);
    tickSwarm(flag, 40);
    assert.equal(flag.player.zoltan, 12);
    jump(flag);
    assert.equal(flag.player.zoltan, 5);
  });
});

describe("Shield Overcharger +", () => {
  it("uses the same table at 2 power and stays off the store and off Stealth C", () => {
    const g = createGame(15);
    arm(g, 2);
    const seed = g.seed;
    assert.equal(deploy(g, "overchargerplus"), true);
    tickSwarm(g, 8);
    assert.equal(g.player.zoltan, 1);
    assert.equal(g.player.zoltanOver, true);
    assert.equal(g.player.kits.swarm?.left, 10);
    assert.equal(g.shots.length, 0);
    assert.equal(g.seed, seed);
    jump(g);
    assert.equal(g.player.zoltan ?? null, null);

    const weak = createGame(16);
    arm(weak, 1);
    assert.equal(deploy(weak, "overchargerplus"), true);
    tickSwarm(weak, 67);
    assert.equal(weak.player.zoltan ?? null, null);
    assert.equal(weak.player.kits.swarm?.left, 0);

    const fed = createGame(17);
    arm(fed, 2);
    fed.player.zoltan = 4;
    assert.equal(deploy(fed, "overchargerplus"), true);
    tickSwarm(fed, 19);
    assert.equal(fed.player.zoltan, 4);
    tickSwarm(fed, 1);
    assert.equal(fed.player.zoltan, 5);
    assert.equal(fed.player.zoltanOver ?? false, false);
    tickSwarm(fed, 30);
    assert.equal(fed.player.zoltan, 5);

    assert.equal(
      CITED_DRONES.some((row) => row.name === "Shield Overcharger +"),
      false,
    );
    assert.deepEqual(
      CITED_DRONES.filter((row) => row.name === "Shield Overcharger").map((row) => [row.name, row.cost]),
      [["Shield Overcharger", 60]],
    );
    const stock = citedStock(createGame(18));
    assert.equal(
      stock.some((item) => item.ref === "overcharger" || item.ref === "overchargerplus"),
      false,
    );
    const quotes = citedSellQuote(createGame(22));
    assert.equal(
      quotes.some((quote) => /overcharger/i.test(quote.name)),
      false,
    );
    const fitted = createGame(23);
    fitted.scrap = 0;
    fitted.player.kits.swarm = {
      id: "swarm",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: "overchargerplus",
      on: true,
      aux: 0,
    };
    const plus = citedSellQuote(fitted).find((quote) => quote.ref === "overchargerplus");
    assert.ok(plus);
    assert.equal(plus.id, "d:overchargerplus");
    assert.equal(plus.kind, "drone");
    assert.equal(plus.scrap, 30);
    assert.equal(citedSell(fitted, plus.id), true);
    assert.equal(fitted.scrap, 30);
    assert.equal(fitted.player.kits.swarm?.target, null);
    fitted.player.kits.swarm = {
      id: "swarm",
      level: 3,
      power: 3,
      left: 0,
      cool: 0,
      target: "overcharger",
      on: true,
      aux: 0,
    };
    assert.equal(
      citedSellQuote(fitted).some((quote) => quote.ref === "overcharger" || quote.ref === "overchargerplus"),
      false,
    );

    const spec = HULLS.find((hull) => hull.id === "stealth-c");
    assert.ok(spec);
    assert.ok(spec.unfitted.includes("Shield Overcharger +"));
    assert.ok(spec.unfitted.includes("Anti-Drone"));
    assert.equal(spec.kits.swarm?.target ?? null, null);
    const simo = createGame(19, "stealth-c");
    assert.equal(simo.player.kits.swarm?.target ?? null, null);
    assert.equal(simo.player.kits.swarm?.on, false);
    assert.equal(simo.player.zoltan ?? null, null);

    const fight = createGame(20);
    startCombat(fight, "scout");
    const enemy = fight.enemy;
    assert.ok(enemy);
    const before = enemy.zoltan ?? null;
    const enemyKit = enemy.kits.swarm;
    if (enemyKit) {
      assert.equal(enemyKit.target, null);
      assert.equal(enemyKit.on, false);
    }
    arm(fight, 3);
    assert.equal(deploy(fight, "overcharger"), true);
    tickSwarm(fight, 8);
    assert.equal(fight.player.zoltan, 1);
    assert.equal(enemy.zoltan ?? null, before);
  });
});
