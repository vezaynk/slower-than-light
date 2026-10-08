import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREW_CAP, choose, createGame } from "../sim.ts";
import type { KinId } from "../extras/kin.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoiceDisabled, fillerChoose } from "./filler-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:confused-mantis";
  b.name = "Confused Mantis";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Confused Mantis");
  return g.event;
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

function kin(g: Game, id: KinId) {
  for (const c of players(g)) c.kin = id;
}

function ids(g: Game) {
  return (g.event?.choices ?? []).map((c) => c.id);
}

function listen(g: Game) {
  open(g);
  fillerChoose(g, "c:confused-mantis:0");
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function standard(body: string, lo: number, hi: number) {
  const got = reward(body);
  assert.ok(got.scrap >= lo && got.scrap <= hi, body);
  const resources = [got.fuel, got.missiles, got.parts].filter((n) => n > 0);
  assert.equal(resources.length, 2, body);
  if (got.fuel) assert.ok(got.fuel >= 1 && got.fuel <= 3, body);
  if (got.missiles) assert.ok(got.missiles >= 1 && got.missiles <= 2, body);
  if (got.parts) assert.equal(got.parts, 1, body);
}

describe("Confused Mantis", () => {
  it("leaving without programming spends nothing", () => {
    const g = createGame(1);
    const crew = players(g).length;
    open(g);
    fillerChoose(g, "c:confused-mantis:1");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(players(g).length, crew);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("listening shows the human blue and hides Mantis and Mind Control", () => {
    const g = createGame(1);
    kin(g, "plain");
    listen(g);
    assert.match(g.event?.body ?? "", /malfunctioning Mantis/);
    assert.ok(ids(g).includes("s:confused-mantis:shuttle"));
    assert.ok(ids(g).includes("s:confused-mantis:leave"));
    assert.ok(ids(g).includes("s:confused-mantis:human"));
    assert.equal(ids(g).includes("s:confused-mantis:mantis"), false);
    assert.equal(ids(g).includes("s:confused-mantis:mind"), false);
    assert.match(fillerChoiceDisabled(g, "s:confused-mantis:mantis") ?? "", /Mantis/);
    assert.match(fillerChoiceDisabled(g, "s:confused-mantis:mind") ?? "", /Mind Control/);
  });

  it("a shuttle returns him home, loses a crewmember, or leaves him subdued", () => {
    let home = false;
    let lose = false;
    let nothing = false;
    for (let seed = 1; seed <= 80 && (!home || !lose || !nothing); seed++) {
      const g = createGame(seed);
      kin(g, "plain");
      const crew = players(g).length;
      listen(g);
      fillerChoose(g, "s:confused-mantis:shuttle");
      const body = g.event?.body ?? "";
      if (/introduces himself as Robert Smith/.test(body) && /hour of convincing/.test(body)) {
        home = true;
        assert.ok(ids(g).includes("s:confused-mantis:return"));
        assert.equal(players(g).length, crew);
      } else if (/eviscerated/.test(body)) {
        lose = true;
        assert.equal(players(g).length, crew - 1);
        assert.match(body, /is lost/);
      } else {
        nothing = true;
        assert.match(body, /subdue him/);
        assert.match(body, /Nothing happens/);
        assert.equal(players(g).length, crew);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(home && lose && nothing, true);
  });

  it("a clone bay brings back the crewmember the Mantis kills", () => {
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = players(g).length;
      listen(g);
      fillerChoose(g, "s:confused-mantis:shuttle");
      if (!/eviscerated/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.equal(players(g).length, crew);
      assert.match(g.event?.body ?? "", /clone is waiting/);
      assert.match(g.event?.body ?? "", /revived/);
    }
    assert.equal(seen, true);
  });

  it("a human returns Robert Smith, or the ship is already full", () => {
    const g = createGame(1);
    kin(g, "plain");
    listen(g);
    fillerChoose(g, "s:confused-mantis:human");
    assert.match(g.event?.body ?? "", /another human/);
    fillerChoose(g, "s:confused-mantis:return");
    assert.match(g.event?.body ?? "", /mining operation/);
    fillerChoose(g, "s:confused-mantis:hire");
    const robert = players(g).find((c) => c.name === "Robert Smith");
    assert.ok(robert);
    assert.equal(robert.kin, "blade");
    assert.equal(robert.skills, undefined);

    const full = createGame(2);
    kin(full, "plain");
    while (players(full).length < CREW_CAP) assert.equal(joinCrew(full, "Human"), true);
    listen(full);
    fillerChoose(full, "s:confused-mantis:human");
    fillerChoose(full, "s:confused-mantis:return");
    fillerChoose(full, "s:confused-mantis:hire");
    assert.match(full.event?.body ?? "", /no room aboard for Robert Smith/);
    assert.equal(players(full).filter((c) => c.name === "Robert Smith").length, 0);
    assert.equal(players(full).length, CREW_CAP);
  });

  it("the colony upgrades engines one level, and a maxed system stays put", () => {
    const g = createGame(1);
    kin(g, "plain");
    const before = g.player.systems.engines.level;
    const power = g.player.systems.engines.power;
    listen(g);
    fillerChoose(g, "s:confused-mantis:human");
    fillerChoose(g, "s:confused-mantis:return");
    fillerChoose(g, "s:confused-mantis:engines");
    assert.equal(g.player.systems.engines.level, before + 1);
    assert.equal(g.player.systems.engines.power, power);
    assert.match(g.event?.body ?? "", /Engines upgraded/);

    const maxed = createGame(3);
    kin(maxed, "plain");
    maxed.player.systems.engines.level = 8;
    listen(maxed);
    fillerChoose(maxed, "s:confused-mantis:human");
    fillerChoose(maxed, "s:confused-mantis:return");
    fillerChoose(maxed, "s:confused-mantis:engines");
    assert.equal(maxed.player.systems.engines.level, 8);
    assert.match(maxed.event?.body ?? "", /cannot take the upgrade/);
  });

  it("a Mantis crewmember pays low scrap and does not join", () => {
    const g = createGame(4);
    kin(g, "blade");
    const crew = players(g).length;
    listen(g);
    assert.ok(ids(g).includes("s:confused-mantis:mantis"));
    assert.equal(ids(g).includes("s:confused-mantis:human"), false);
    fillerChoose(g, "s:confused-mantis:mantis");
    standard(g.event?.body ?? "", 7, 10);
    assert.equal(players(g).length, crew);
    assert.equal(players(g).some((c) => c.name === "Robert Smith"), false);
  });

  it("Mind Control pays medium scrap and does not add Robert Smith", () => {
    const g = createGame(5);
    kin(g, "plain");
    g.player.kits.leash = { id: "leash", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
    const crew = players(g).length;
    listen(g);
    assert.ok(ids(g).includes("s:confused-mantis:mind"));
    fillerChoose(g, "s:confused-mantis:mind");
    standard(g.event?.body ?? "", 12, 19);
    assert.equal(players(g).length, crew);
    assert.match(g.event?.body ?? "", /calms down/);
  });

  it("leaving the cornered Mantis spends nothing", () => {
    const g = createGame(1);
    listen(g);
    fillerChoose(g, "s:confused-mantis:leave");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
  });
});
