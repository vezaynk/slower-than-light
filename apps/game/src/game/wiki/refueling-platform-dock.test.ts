import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const DOCK = "c:refueling-platform:0";
const OFFER = "The platform makes an offer.";
const STEAL = "The automated platform seems to be damaged. You can likely steal as much fuel as remains.";
const IGNITE = "The platform seems to be malfunctioning and could ignite at any moment.";
const STAFF = "You dock and signal the fuel station's staff to begin refueling.";
const AMBUSH = "The refueling station welcomes you into one of its berths, and as you hail them, there is an explosion from your engine room! While assessing the damage, you detect a Pirate Ship closing fast!";
const BOOM = "Just as you hook up to refuel, the station ignites and explodes. Your own fuel reserve ignites, losing your precious fuel and damaging your ship.";
const WAIT = "As you dock with the refueling platform, there is an explosion from your engine room! Warning lights flash in your ship as pirates from the station swarm aboard your vessel!";

type Kind = "offer" | "steal" | "ignite" | "staff" | "ambush";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:refueling-platform";
  b.name = "Refueling platform";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function docked(seed: number): Game {
  const g = createGame(seed);
  open(g);
  choose(g, DOCK);
  return g;
}

function kindOf(g: Game): Kind | null {
  if (g.event?.body === OFFER) return "offer";
  if (g.event?.body === STEAL) return "steal";
  if (g.event?.body === IGNITE) return "ignite";
  if (g.event?.body === STAFF) return "staff";
  if (g.phase === "combat" && g.log.includes(AMBUSH)) return "ambush";
  return null;
}

function seeds(): Record<Kind, number> {
  const got: Partial<Record<Kind, number>> = {};
  for (let seed = 1; seed <= 400 && Object.keys(got).length < 5; seed++) {
    const kind = kindOf(docked(seed));
    if (kind && got[kind] == null) got[kind] = seed;
  }
  assert.equal(Object.keys(got).length, 5, JSON.stringify(got));
  return got as Record<Kind, number>;
}

describe("Refueling platform dock", () => {
  it("offers, steals, ignites, signals the staff, or opens the printed pirate ambush", () => {
    const found = seeds();

    const offer = docked(found.offer);
    assert.equal(choiceDisabled(offer, "s:refuel-dock:accept"), null);
    const scrap = offer.scrap;
    const fuel = offer.fuel;
    choose(offer, "s:refuel-dock:accept");
    const paid = scrap - offer.scrap;
    assert.ok(paid >= 5 && paid <= 10, `scrap ${paid}`);
    assert.equal(offer.fuel, fuel + 5);
    assert.equal(offer.event?.body.includes("You receive 5 fuel."), true);
    assert.equal(offer.phase, "event");
    assert.equal(offer.enemy, null);

    const poor = docked(found.offer);
    poor.scrap = 4;
    assert.equal(choiceDisabled(poor, "s:refuel-dock:accept"), "Need 5 scrap");
    choose(poor, "s:refuel-dock:accept");
    assert.equal(poor.scrap, 4);
    assert.equal(poor.event?.body, OFFER);

    const rejected = docked(found.offer);
    const held = rejected.scrap;
    const heldFuel = rejected.fuel;
    choose(rejected, "s:refuel-dock:reject");
    assert.equal(rejected.event?.body, "Nothing happens.");
    assert.equal(rejected.scrap, held);
    assert.equal(rejected.fuel, heldFuel);

    const stolen = docked(found.steal);
    const before = stolen.fuel;
    choose(stolen, "s:refuel-dock:steal");
    const gained = stolen.fuel - before;
    assert.ok(gained >= 3 && gained <= 5, `fuel ${gained}`);
    assert.ok(stolen.event?.body.includes("fuel reserves"));
    const left = docked(found.steal);
    const leftFuel = left.fuel;
    choose(left, "s:refuel-dock:values");
    assert.equal(left.event?.body, "Nothing happens.");
    assert.equal(left.fuel, leftFuel);

    const lit = docked(found.ignite);
    const hull = lit.player.hull;
    const eng = lit.player.systems.engines;
    const engDamage = eng.damage;
    const bars = eng.level - engDamage;
    const room = lit.player.rooms.find((r) => r.system === "engines");
    const flames = room?.fire ?? 0;
    const litFuel = lit.fuel;
    choose(lit, "s:refuel-dock:quick");
    if (lit.event?.body.includes("safely refuel")) {
      assert.equal(lit.fuel, litFuel + 5);
      assert.equal(lit.player.hull, hull);
      assert.equal(lit.enemy, null);
    } else {
      assert.ok(lit.event?.body.includes(BOOM));
      assert.equal(lit.player.hull, hull - 3);
      assert.equal(lit.player.systems.engines.damage, engDamage + Math.min(3, bars));
      assert.equal(lit.fuel, litFuel - 3);
      const now = lit.player.rooms.find((r) => r.system === "engines")?.fire ?? 0;
      assert.ok(now === flames + 1 || now === flames + 2, `fires ${now}`);
      assert.equal(lit.enemy, null);
    }
    const wide = docked(found.ignite);
    choose(wide, "s:refuel-dock:berth");
    assert.ok(wide.event?.body.includes("depressurized tanks"));
    assert.ok(wide.event?.body.includes("Nothing happens."));
    assert.equal(wide.enemy, null);

    const sprung = docked(found.staff);
    assert.equal(choiceDisabled(sprung, "s:refuel-dock:doors"), "Needs level 2 Door System");
    const sprungHull = sprung.player.hull;
    const sprungEng = sprung.player.systems.engines.damage;
    const sprungBars = sprung.player.systems.engines.level - sprungEng;
    choose(sprung, "s:refuel-dock:wait");
    assert.ok(sprung.log.includes(WAIT));
    assert.equal(sprung.player.hull, sprungHull - 3);
    assert.equal(sprung.player.systems.engines.damage, sprungEng + Math.min(3, sprungBars));
    const boarders = sprung.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.ok(boarders.length >= 2 && boarders.length <= 4, `boarders ${boarders.length}`);
    assert.ok(boarders.every((c) => c.kin === "plain"));
    assert.equal(sprung.phase, "combat");
    assert.equal(sprung.enemy, null);

    const sealed = docked(found.staff);
    sealed.player.systems.doors.level = 2;
    const sealedFuel = sealed.fuel;
    const sealedHull = sealed.player.hull;
    assert.equal(choiceDisabled(sealed, "s:refuel-dock:doors"), null);
    choose(sealed, "s:refuel-dock:doors");
    assert.equal(sealed.fuel, sealedFuel + 5);
    assert.equal(sealed.player.hull, sealedHull);
    assert.equal(sealed.enemy, null);
    assert.ok(sealed.event?.body.includes("fish-in-a-barrel"));

    const pirate = docked(found.ambush);
    assert.equal(pirate.phase, "combat");
    assert.equal(pirate.fightEvent, "refueling-platform");
    assert.equal(pirate.enemy?.pirate, true);
    assert.equal(pirate.scrap, 10);
    assert.ok(pirate.log.includes(AMBUSH));
    assert.equal(pirate.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 0);
  });
});
