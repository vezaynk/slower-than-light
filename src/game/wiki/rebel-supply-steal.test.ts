import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { scrapBand } from "./surrender.ts";

const WAIT = "c:rebel-ship-supplying-civilians:2";
const ATTACK = "c:rebel-ship-supplying-civilians:0";
const LEAVE = "c:rebel-ship-supplying-civilians:1";
const FARM = "mostly equipment meant for automated farming";
const SCRAP = "building construction supplies";
const TRAP = "The cargo was booby-trapped!";
const PLAGUE = "vaccinations for a local plague";
const DESTROYED = "With the Rebel ship destroyed, you take the time to collect what little scrap remains. They had already made the delivery to the civilians.";
const CREW = "With the Rebel crew dead, you strip their ship for equipment. They had already made their delivery to the civilians.";
const LEAVE_LINES = [
  "You have doomed us all.",
  "its unlikely they'll live long.",
  "a few more dead Rebels matter more",
  "My son was on that ship.",
];

type Kind = "parts" | "scrap" | "trap" | "plague";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:rebel-ship-supplying-civilians";
  b.name = "Rebel ship supplying civilians";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function stole(seed: number): Game {
  const g = createGame(seed);
  open(g);
  choose(g, WAIT);
  return g;
}

function kindOf(g: Game): Kind | null {
  const body = g.event?.body ?? "";
  if (body.includes(FARM)) return "parts";
  if (body.includes(SCRAP)) return "scrap";
  if (body.includes(TRAP)) return "trap";
  if (body.includes(PLAGUE)) return "plague";
  return null;
}

function seeds(): Record<Kind, number> {
  const got: Partial<Record<Kind, number>> = {};
  for (let seed = 1; seed <= 400 && Object.keys(got).length < 4; seed++) {
    const kind = kindOf(stole(seed));
    if (kind && got[kind] == null) got[kind] = seed;
  }
  assert.equal(Object.keys(got).length, 4, JSON.stringify(got));
  return got as Record<Kind, number>;
}

function paidScrap(g: Game): number {
  return Number(g.event?.body.match(/Scrap: (\d+)/)?.[1]);
}

function inBand(g: Game, tier: "low" | "medium", n: number) {
  const [lo, hi] = scrapBand(g, tier);
  assert.ok(n >= lo && n <= hi, `${tier} scrap ${n} not in ${lo}-${hi}`);
}

describe("Rebel ship supplying civilians supplies", () => {
  it("steals the printed supplies, and a destroyed ship or a crew kill pays before that choice", () => {
    const g0 = createGame(1);
    open(g0);
    assert.equal(g0.event?.choices.some((c) => c.id === WAIT && c.label === "Wait and steal the supplies from the civilians"), true);

    const left = createGame(1);
    open(left);
    choose(left, LEAVE);
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.scrap, 10);
    assert.equal(left.phase, "event");

    const found = seeds();

    const farmed = stole(found.parts);
    const farmPaid = paidScrap(farmed);
    inBand(farmed, "low", farmPaid);
    assert.equal(farmed.scrap, 10 + farmPaid);
    assert.equal(farmed.player.parts, stole(found.parts).player.parts);
    const fresh = createGame(found.parts);
    assert.equal(farmed.player.parts, fresh.player.parts + 1);
    assert.equal(farmed.fuel, fresh.fuel);
    assert.equal(farmed.missiles, fresh.missiles);

    const built = stole(found.scrap);
    const builtPaid = paidScrap(built);
    inBand(built, "low", builtPaid);
    assert.equal(built.scrap, 10 + builtPaid);
    const builtFresh = createGame(found.scrap);
    assert.equal(built.player.parts, builtFresh.player.parts);
    assert.equal(built.fuel, builtFresh.fuel);
    assert.equal(built.missiles, builtFresh.missiles);

    const boom = createGame(found.trap);
    open(boom);
    const hull = boom.player.hull;
    const rooms = boom.player.rooms.map((r) => ({ fire: r.fire, breach: r.breach, system: r.system, damage: r.system ? boom.player.systems[r.system].damage : 0, level: r.system ? boom.player.systems[r.system].level : 0 }));
    const scrap = boom.scrap;
    choose(boom, WAIT);
    assert.ok(boom.event?.body.includes(TRAP));
    assert.ok(boom.event?.body.includes("Hull damage: 2."));
    assert.equal(boom.player.hull, hull - 2);
    assert.equal(boom.scrap, scrap);
    assert.equal(boom.enemy, null);
    const changed = boom.player.rooms.map((r, i) => ({
      fire: r.fire - rooms[i].fire,
      breach: r.breach - rooms[i].breach,
      system: r.system,
      damage: r.system ? boom.player.systems[r.system].damage - rooms[i].damage : 0,
      bars: rooms[i].level - rooms[i].damage,
    })).filter((r) => r.fire !== 0 || r.breach !== 0);
    assert.equal(changed.length, 1);
    const hit = changed[0];
    assert.ok((hit.fire === 0 && hit.breach === 1) || ((hit.fire === 1 || hit.fire === 2) && hit.breach === 0), JSON.stringify(hit));
    if (hit.system && hit.bars > 0) assert.equal(hit.damage, Math.min(2, hit.bars));
    else assert.equal(hit.damage, 0);

    const plague = stole(found.plague);
    assert.ok(plague.event?.body.includes(PLAGUE));
    assert.ok(plague.event?.body.includes("Nothing happens."));
    assert.equal(plague.scrap, 10);
    assert.equal(plague.player.hull, createGame(found.plague).player.hull);

    const won = createGame(3);
    open(won);
    const fuel = won.fuel;
    const missiles = won.missiles;
    const parts = won.player.parts;
    choose(won, ATTACK);
    assert.ok(won.enemy);
    for (const w of won.enemy.weapons) w.enabled = false;
    won.enemy.hull = 0;
    step(won, 0.05);
    assert.equal(won.phase, "event");
    assert.ok(won.event?.body.includes(DESTROYED), won.event?.body);
    const low = paidScrap(won);
    inBand(won, "low", low);
    assert.equal(won.scrap, 10 + low);
    const df = won.fuel - fuel;
    const dm = won.missiles - missiles;
    const dp = won.player.parts - parts;
    assert.equal([df, dm, dp].filter((n) => n > 0).length, 2);
    assert.ok(df === 0 || (df >= 1 && df <= 3), `fuel ${df}`);
    assert.ok(dm === 0 || (dm >= 1 && dm <= 2), `missiles ${dm}`);
    assert.ok(dp === 0 || dp === 1, `parts ${dp}`);
    assert.equal(won.event?.choices.some((c) => c.id === "s:rebel-supply:steal"), true);
    assert.equal(won.event?.choices.some((c) => c.id === "s:rebel-supply:leave"), true);
    choose(won, "s:rebel-supply:leave");
    assert.ok(LEAVE_LINES.some((line) => won.event?.body.includes(line)), won.event?.body);
    assert.ok(won.event?.body.includes("Nothing happens."));

    const killed = createGame(4);
    open(killed);
    assert.equal(pageWin(killed, "rebel-ship-supplying-civilians", true), true);
    assert.ok(killed.event?.body.includes(CREW), killed.event?.body);
    const med = paidScrap(killed);
    inBand(killed, "medium", med);
    assert.equal(killed.scrap, 10 + med);
    const kf = killed.fuel - createGame(4).fuel;
    const km = killed.missiles - createGame(4).missiles;
    const kp = killed.player.parts - createGame(4).player.parts;
    assert.equal([kf, km, kp].filter((n) => n > 0).length, 2);
  });
});
