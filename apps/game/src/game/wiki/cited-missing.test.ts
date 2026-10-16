import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame, evasionPercent, powerMask, step, weaponsSealed } from "../sim.ts";
import type { Beacon, Game, Kit } from "../types.ts";
import { citedChoiceDisabled, citedChoose, citedEvent, type CitedChoice } from "./cited-events.ts";
import { cacheFuelLoss } from "./cited-missing.ts";

function beacon(name: string, flag = ""): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name,
    tier: "",
    flag,
    asteroid: false,
  };
}

function harness(g: Game, rolls: number[]) {
  const ctx: CitedChoice = {
    g,
    resolve() {
      g.event = null;
      g.phase = "map";
    },
    fight() {
      g.event = null;
      g.phase = "combat";
    },
    scrap() {},
    note() {},
    irand(n) {
      const v = rolls.shift();
      assert.equal(typeof v, "number");
      assert.ok(v !== undefined && v >= 0 && v < n, `irand ${v} of ${n}`);
      return v as number;
    },
  };
  return ctx;
}

function here(g: Game): Beacon {
  const b = g.beacons.find((x) => x.id === g.here);
  assert.ok(b);
  return b;
}

function open(g: Game, name: string, flag: string): Beacon {
  const b = here(g);
  b.flag = flag;
  b.name = name;
  b.kind = "event";
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.paused = true;
  return b;
}

function manPilot(g: Game) {
  const room = g.player.rooms.find((r) => r.system === "pilot");
  const crew = g.crew.find((c) => c.side === "player" && c.hp > 0);
  assert.ok(room && crew);
  crew.aboard = "player";
  crew.room = room.id;
  crew.path = [];
}

const cradle = (): Kit => ({
  id: "clonebay",
  level: 1,
  power: 1,
  left: 0,
  cool: 0,
  target: null,
  on: true,
  aux: 0,
});

const HULLS = new Set([
  "Auto-Scout",
  "Auto-Surveyor",
  "Auto-Assault",
  "Auto-Hacker",
  "rebel-rigger",
  "rebel-disruptor",
  "rebel-fighter",
  "rebel-invader",
]);

describe("missing location pages", () => {
  it("closes an empty Lanius distress on the printed nothing", () => {
    const g = createGame(3);
    const ev = citedEvent(g, beacon("Lanius empty distress beacon 1", "cited:lanius-empty-distress-beacon-1"));
    assert.ok(ev);
    assert.match(ev.body, /plastic satellite/);
    assert.equal(citedChoose(harness(g, []), ev.choices[0]!.id), true);
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
  });

  it("shows the Zoltan map sentence and uncovers nothing", () => {
    const g = createGame(4);
    const visited = g.beacons.map((b) => b.visited);
    const chart = g.sectorMap;
    const ev = citedEvent(g, beacon("Zoltan free map", "cited:zoltan-free-map"));
    assert.ok(ev);
    assert.match(ev.body, /star charts/);
    assert.match(ev.body, /map is revealed/);
    assert.equal(citedChoose(harness(g, []), ev.choices[0]!.id), true);
    assert.deepEqual(g.beacons.map((b) => b.visited), visited);
    assert.equal(g.sectorMap, chart);
  });

  it("encodes a fuel-trader price and refuses a short stock", () => {
    // Wiki citations:
    // > "Gladly trade. [ the actual trade offer is shown prior to the exchange ]" — [[No fuel: fuel trader (distress off)]]
    // > "Respectfully decline." — [[No fuel: fuel trader (distress off)]]
    const g = createGame(5);
    g.scrap = 0;
    g.missiles = 0;
    g.player.parts = 0;
    const ev = citedEvent(g, beacon("No fuel: fuel trader (distress off)", "cited:no-fuel-fuel-trader-distress-off"));
    assert.ok(ev);
    const buy = ev.choices.find((c) => c.id.includes(":buy:"));
    assert.ok(buy);
    const coded = /:buy:(\d+):(parts|missiles|scrap):(\d+)$/.exec(buy.id);
    assert.ok(coded);
    assert.ok(Number(coded[1]) >= 2);
    assert.equal(citedChoiceDisabled(g, buy.id)?.startsWith("Need "), true);
    assert.equal(citedChoose(harness(g, []), buy.id), false);
    assert.equal(g.fuel, createGame(5).fuel);
  });

  it("keeps the Crystal chat blue option until a Crystal is aboard", () => {
    const g = createGame(6);
    const ev = citedEvent(g, beacon("Crystal chat", "cited:crystal-chat"));
    assert.ok(ev);
    const blue = ev.choices.find((c) => c.id.endsWith(":crystal"));
    assert.ok(blue);
    assert.equal(citedChoiceDisabled(g, blue.id), "Needs a Crystal crewmember");
    g.crew[0]!.kin = "crystal";
    assert.equal(citedChoiceDisabled(g, blue.id), null);
  });

  it("fights one of the twelve Last Stand hulls", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const g = createGame(seed);
      const ev = citedEvent(g, beacon("Fight in Last Stand", "cited:fight-in-last-stand"));
      assert.ok(ev);
      const hull = ev.choices[0]!.id.split(":").pop() ?? "";
      assert.ok(HULLS.has(hull), hull);
      seen.add(hull);
    }
    assert.ok(seen.size > 1);
  });

  it("drops cache fuel only when the detonation gift includes none", () => {
    assert.equal(cacheFuelLoss(40, 2), 0);
    assert.equal(cacheFuelLoss(40, 0), 40);
    assert.equal(cacheFuelLoss(150, 0), 100);
    assert.equal(cacheFuelLoss(0, 0), 0);
    let dropped = false;
    let kept = false;
    for (let seed = 1; seed <= 80 && !(dropped && kept); seed++) {
      const g = createGame(seed);
      g.fuel = 40;
      assert.equal(citedChoose(harness(g, [1, 2]), "c:crystalline-cache:weapons"), true);
      assert.match(g.event?.body ?? "", /singularity/);
      const before = g.player.weapons.length;
      assert.equal(citedChoose(harness(g, []), "c:crystalline-cache:detonate"), true);
      if (g.fuel < 40) dropped = true;
      else kept = true;
      assert.ok(g.player.weapons.length >= before);
    }
    assert.equal(dropped, true);
    assert.equal(kept, true);
  });

  it("does not print the Clone Bay's silence when the buried crew stays", () => {
    const g = createGame(2);
    g.player.kits.clonebay = cradle();
    const crew = g.crew.filter((c) => c.side === "player").length;
    open(g, "Crystalline men buried", "cited:crystalline-men-buried");
    choose(g, "c:crystalline-men-buried:send");
    choose(g, "c:crystalline-men-buried:leave");
    assert.match(g.event?.body ?? "", /remain/);
    assert.equal((g.event?.body ?? "").includes("no sign of activity"), false);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crew - 1);
  });

  it("caps repair-station engines, and a marked return does not", () => {
    const first = createGame(8);
    manPilot(first);
    first.player.systems.engines.level = 4;
    first.player.systems.engines.power = 4;
    const openEvade = evasionPercent(first, first.player, "player");
    open(first, "Slug repair station", "cited:slug-repair-station");
    choose(first, "c:slug-repair-station:engines");
    assert.equal(first.phase, "combat");
    assert.equal(here(first).mark, "slug-repair");
    assert.ok(evasionPercent(first, first.player, "player") < openEvade);

    const again = createGame(8);
    manPilot(again);
    again.player.systems.engines.level = 4;
    again.player.systems.engines.power = 4;
    const steady = evasionPercent(again, again.player, "player");
    const b = open(again, "Slug repair station", "cited:slug-repair-station");
    b.mark = "slug-repair";
    choose(again, "c:slug-repair-station:engines");
    assert.equal(evasionPercent(again, again.player, "player"), steady);
    assert.equal(again.fightEvent, "slug-repair-engines");
  });

  it("pays the engine-repair win in the printed sentence", () => {
    const g = createGame(11);
    g.scrap = 0;
    const b = open(g, "Slug repair station", "cited:slug-repair-station");
    choose(g, "c:slug-repair-station:engines");
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /engines return to normal/);
    assert.ok(g.scrap > 0);
    assert.equal(b.resolved, true);
  });

  it("keeps store-ship weapons offline through the win and clears them on the jump", () => {
    const g = createGame(12);
    open(g, "Slug store ship", "cited:slug-store-ship");
    choose(g, "c:slug-store-ship:weapons");
    assert.equal(g.phase, "combat");
    assert.equal(weaponsSealed(g.player), true);
    assert.ok(g.player.weapons.length > 0);
    for (const w of g.player.weapons) w.enabled = true;
    g.player.systems.weapons.power = Math.max(2, g.player.systems.weapons.power);
    assert.ok(powerMask(g.player).every((on) => on === false));
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "reward");
    assert.equal(weaponsSealed(g.player), true);
    const spot = here(g);
    assert.ok(spot.links[0]);
    g.fuel = 3;
    g.player.systems.engines.power = Math.max(1, g.player.systems.engines.power);
    // The weapons choice beams one Slug. They stay after the win, so the drive has to finish before the jump.
    g.flee = 1;
    commitJump(g, spot.links[0]);
    assert.equal(weaponsSealed(g.player), false);
  });
});
