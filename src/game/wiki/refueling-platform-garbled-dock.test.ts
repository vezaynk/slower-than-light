import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame, step } from "../sim.ts";
import type { Game, SysId } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const DOCK = "c:refueling-platform-garbled-broadcast:2";
const HAIL = "c:refueling-platform-garbled-broadcast:0";
const SIGNAL = "s:garbled-dock:signal";
const DOORS = "s:garbled-dock:doors";
const CONT = "s:garbled-dock:continue";
const S2 = "s:garbled-dock:sensors2";
const S3 = "s:garbled-dock:sensors3";

const BERTH = "Your ship enters one of the refueling station berths, grateful for a rest.";
const ABANDONED =
  "No one answers your hails. You run some scans and discover that the station has been recently abandoned, no doubt due to the threat of the Lanius. You empty their fuel reserves before leaving.";
const TRAP =
  "What seemed to be a brief respite turns into a Lanius trap... the first warning is an explosion from your engine room, followed moments later by detection of a Lanius ship at sensor range!";
const BREACH =
  "Your ship's dash suddenly lights up with warnings - a hull breach! Lanius were on board the platform and are now on board your ship. A hidden cruiser comes into view!";
const DOORS_TEXT =
  "Your reinforced doors save you from an attempted ambush by the Lanius, who cluster around the doors and hull, attempting to consume your ship. Coldly, you wipe them out one by one with your weapon array, then take control of the station and take its fuel reserves.";
const SCAN_FUEL =
  "You run an additional more focused scan and find one of the auxiliary refueling platforms has some unclaimed fuel.";
const SCAN_PARTS =
  "You run an additional more focused scan and find one of the auxiliary refueling platforms has some unclaimed fuel and drone parts.";
const DESTROYED = "The ship explodes, leaving behind a collection of useful scrap material.";
const STATION_FUEL =
  "It looks as if the Lanius were uninterested in the fuel reserves on the station, and there is a good amount of fuel left. You take what your ship can hold and prepare to jump to the next beacon.";

const HIDDEN = [S2, S3, DOORS];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform-garbled-broadcast";
  b.name = "Refueling platform garbled broadcast";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Refueling platform garbled broadcast");
}

function docked(seed: number): Game {
  const g = createGame(seed);
  open(g);
  choose(g, DOCK);
  return g;
}

function hasId(g: Game, id: string): boolean {
  return g.event?.choices.some((c) => c.id === id) ?? false;
}

type Kind = "abandoned" | "trap" | "breach";

function kindOf(g: Game): Kind | null {
  if (g.event?.body === ABANDONED) return "abandoned";
  const text = g.log.join("\n");
  if (text.includes(TRAP)) return "trap";
  if (text.includes(BREACH)) return "breach";
  return null;
}

let found: Record<Kind, number> | null = null;

function seeds(): Record<Kind, number> {
  if (found) return found;
  const got: Partial<Record<Kind, number>> = {};
  for (let seed = 1; seed <= 400 && (got.abandoned == null || got.trap == null || got.breach == null); seed++) {
    const g = docked(seed);
    choose(g, SIGNAL);
    const kind = kindOf(g);
    if (kind && got[kind] == null) got[kind] = seed;
  }
  assert.ok(got.abandoned != null && got.trap != null && got.breach != null, `missing signal result ${JSON.stringify(got)}`);
  found = got as Record<Kind, number>;
  return found;
}

describe("Refueling platform garbled broadcast dock", () => {
  it("offers dock on the opening card and keeps the sensor and blast-door buttons off it", () => {
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.choices.find((c) => c.id === DOCK)?.label, "Dock with the platform");
    assert.equal(hasId(g, HAIL), true);
    for (const id of HIDDEN) assert.equal(hasId(g, id), false, id);
    choose(g, DOCK);
    assert.equal(g.event?.body, BERTH);
    assert.equal(g.phase, "event");
    assert.equal(hasId(g, SIGNAL), true);
    assert.equal(hasId(g, DOORS), true);
    for (const id of [S2, S3]) assert.equal(hasId(g, id), false, id);
  });

  it("refuses blast doors below level 2 and pays exactly 5 fuel at level 2", () => {
    const low = docked(1);
    assert.ok((low.player.systems.doors?.level ?? 0) < 2);
    const fuel = low.fuel;
    const hull = low.player.hull;
    assert.equal(choiceDisabled(low, DOORS), "Needs level 2 Door System");
    choose(low, DOORS);
    assert.equal(low.fuel, fuel);
    assert.equal(low.player.hull, hull);
    assert.equal(low.phase, "event");
    assert.equal(low.enemy, null);
    assert.equal(low.event?.body, BERTH);

    const g = docked(1);
    g.player.systems.doors.level = 2;
    const before = g.fuel;
    const hull2 = g.player.hull;
    assert.equal(choiceDisabled(g, DOORS), null);
    choose(g, DOORS);
    assert.equal(g.event?.body, DOORS_TEXT);
    assert.equal(g.fuel, before + 5);
    assert.equal(g.phase, "event");
    assert.equal(g.enemy, null);
    assert.equal(g.player.hull, hull2);
  });

  it("reaches abandoned, trap, and breach across seeds", () => {
    const { abandoned, trap, breach } = seeds();

    const left = docked(abandoned);
    const fuel = left.fuel;
    choose(left, SIGNAL);
    const gained = left.fuel - fuel;
    assert.ok(gained >= 3 && gained <= 5, `abandoned fuel ${gained}`);
    assert.equal(left.event?.body, ABANDONED);
    assert.equal(left.phase, "event");
    assert.equal(hasId(left, CONT), true);
    assert.equal(hasId(left, S2), true);
    assert.equal(hasId(left, S3), true);
    const held = left.fuel;
    choose(left, CONT);
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.fuel, held);
    assert.equal(left.phase, "event");

    const sprung = docked(trap);
    const hull = sprung.player.hull;
    const eng = sprung.player.systems.engines;
    const damage = eng.damage;
    const bars = eng.level - eng.damage;
    choose(sprung, SIGNAL);
    assert.ok(sprung.log.includes(TRAP));
    assert.equal(sprung.player.hull, hull - 3);
    assert.equal(sprung.player.systems.engines.damage, damage + Math.min(3, bars));
    assert.equal(sprung.phase, "combat");
    assert.equal(sprung.enemy?.faction, "lanius");
    assert.equal(sprung.fightEvent, "refueling-platform-garbled-broadcast");
    assert.equal(sprung.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 0);

    const boarded = docked(breach);
    const hullB = boarded.player.hull;
    const before = boarded.player.rooms.map((r) => r.breach);
    const systems = (Object.keys(boarded.player.systems) as SysId[]).map((id) => [id, boarded.player.systems[id].damage] as const);
    choose(boarded, SIGNAL);
    assert.ok(boarded.log.includes(BREACH));
    assert.equal(boarded.player.hull, hullB);
    for (const [id, dmg] of systems) assert.equal(boarded.player.systems[id].damage, dmg, id);
    const diffs = boarded.player.rooms.map((r, i) => r.breach - before[i]);
    assert.equal(diffs.filter((d) => d !== 0).length, 1);
    assert.equal(diffs.reduce((a, b) => a + b, 0), 1);
    const boarders = boarded.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(boarders.length, 1);
    assert.equal(boarders[0]?.kin, "voidlung");
    assert.equal(boarders[0]?.name, "Lanius");
    assert.equal(boarded.phase, "combat");
    assert.equal(boarded.fightEvent, "refueling-platform-garbled-broadcast");
  });

  it("keeps the sensor scans off until the station is abandoned, then gates them by level", () => {
    const { abandoned } = seeds();
    const bare = docked(abandoned);
    bare.player.systems.sensors.level = 1;
    choose(bare, SIGNAL);
    assert.equal(choiceDisabled(bare, S2), "Needs Sensors level 2");
    assert.equal(choiceDisabled(bare, S3), "Needs Sensors level 3");
    const fuel = bare.fuel;
    const parts = bare.player.parts;
    choose(bare, S2);
    choose(bare, S3);
    assert.equal(bare.fuel, fuel);
    assert.equal(bare.player.parts, parts);
    assert.equal(bare.phase, "event");
    assert.equal(bare.enemy, null);
    assert.equal(bare.event?.body, ABANDONED);

    const mid = docked(abandoned);
    choose(mid, SIGNAL);
    mid.player.systems.sensors.level = 2;
    assert.equal(choiceDisabled(mid, S2), null);
    assert.equal(choiceDisabled(mid, S3), "Needs Sensors level 3");
    const midFuel = mid.fuel;
    const midParts = mid.player.parts;
    choose(mid, S2);
    const df = mid.fuel - midFuel;
    assert.ok(df >= 1 && df <= 3, `sensors2 fuel ${df}`);
    assert.equal(mid.event?.body, SCAN_FUEL);
    assert.equal(mid.player.parts, midParts);
    assert.equal(mid.phase, "event");
    assert.equal(mid.enemy, null);

    const high = docked(abandoned);
    choose(high, SIGNAL);
    high.player.systems.sensors.level = 3;
    assert.equal(hasId(high, S2), true);
    assert.equal(hasId(high, S3), true);
    assert.equal(choiceDisabled(high, S2), null);
    assert.equal(choiceDisabled(high, S3), null);
    const highFuel = high.fuel;
    const highParts = high.player.parts;
    choose(high, S3);
    const df3 = high.fuel - highFuel;
    const dp = high.player.parts - highParts;
    assert.ok(df3 >= 2 && df3 <= 3, `sensors3 fuel ${df3}`);
    assert.ok(dp >= 1 && dp <= 3, `sensors3 parts ${dp}`);
    assert.equal(high.event?.body, SCAN_PARTS);
    assert.equal(high.phase, "event");
    assert.equal(high.enemy, null);
  });

  it("hailing still starts the Lanius fight at 10 scrap, and the wreck pays the station fuel", () => {
    const g = createGame(1);
    open(g);
    const fuel = g.fuel;
    choose(g, HAIL);
    assert.ok(g.log.includes("There is a screech from your comm system, and the broadcast suddenly cuts off. The platform suddenly begins to move, revealing itself to be a Lanius ship!"));
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "refueling-platform-garbled-broadcast");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body.includes(DESTROYED));
    assert.ok(g.event?.body.includes(STATION_FUEL));
    assert.equal(g.event?.choices.some((c) => /investigate/i.test(c.label)), false);
    const d = g.fuel - fuel;
    assert.ok(d >= 3 && d <= 8, `fuel delta ${d}`);
    assert.ok(g.scrap > 10);
    assert.ok(g.log.some((line) => /^Fuel: [3-5]\.$/.test(line)));
  });
});
