import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame, weaponSlotCap } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { surrenderPlan } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:engi-distress-rebel-fight";
  b.name = "Engi distress Rebel fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Engi distress Rebel fight");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) => new RegExp(`${label}: \\d+`).test(body)).length;
}

describe("Engi distress Rebel fight", () => {
  it("fights a Rebel ship that never runs and never surrenders", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:engi-distress-rebel-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "engi-distress-rebel-fight");
    assert.equal(g.enemy?.faction, "rebel");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.enemyEscape?.mode, "never");
    assert.equal(g.enemySurrender?.chance, 0);
    assert.equal(surrenderPlan({ tier: "pool", event: "engi-distress-rebel-fight", faction: "rebel" }, () => 0).chance, 0);
  });

  it("pays low scrap with resources when the ship is destroyed, and medium on a crew kill", () => {
    for (const deadCrew of [false, true]) {
      const g = createGame(deadCrew ? 2 : 3);
      open(g);
      const guns = g.player.weapons.length;
      const augs = g.augments.length;
      assert.equal(pageWin(g, "engi-distress-rebel-fight", deadCrew), true);
      const body = g.event?.body ?? "";
      assert.match(body, /poorly equipped/);
      const paid = scraps(body).filter((n) => n > 0);
      assert.equal(paid.length, 1, body);
      if (deadCrew) assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
      else assert.ok(paid[0]! >= 7 && paid[0]! <= 10, body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.augments.length, augs);
      assert.equal(g.event?.choices.map((c) => c.id).join(","), "q:engi-distress:scrap,q:engi-distress:supplies,q:engi-distress:nothing");
    }
  });

  it("giving nothing spends nothing more, and the prices stay closed when short", () => {
    const g = createGame(4);
    open(g);
    pageWin(g, "engi-distress-rebel-fight", false);
    const scrap = g.scrap;
    const fuel = g.fuel;
    const missiles = g.missiles;
    choose(g, "q:engi-distress:nothing");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);

    const poor = createGame(5);
    open(poor);
    pageWin(poor, "engi-distress-rebel-fight", false);
    poor.scrap = 10;
    poor.missiles = 1;
    poor.fuel = 1;
    assert.equal(choiceDisabled(poor, "q:engi-distress:scrap"), "Need 25 scrap");
    assert.equal(choiceDisabled(poor, "q:engi-distress:supplies"), "Need 40 scrap");
    const before = poor.scrap;
    choose(poor, "q:engi-distress:scrap");
    assert.equal(poor.scrap, before);
    assert.match(poor.event?.body ?? "", /poorly equipped/);
  });

  it("25 scrap does nothing, mounts Healing Burst, or names no schematic, and the supply gift fits the med-bot", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = createGame(seed);
      open(g);
      pageWin(g, "engi-distress-rebel-fight", false);
      g.scrap = 40;
      const guns = g.player.weapons.length;
      const augs = g.augments.length;
      choose(g, "q:engi-distress:scrap");
      const body = g.event?.body ?? "";
      assert.equal(g.scrap, 15);
      assert.equal(g.augments.length, augs);
      if (/Need = fulfilled/.test(body)) {
        seen.add("nothing");
        assert.match(body, /Nothing else happens/);
        assert.equal(g.player.weapons.length, guns);
      } else if (/med-bot disperser/.test(body)) {
        seen.add("heal");
        assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), true);
        assert.match(body, /Healing Burst/);
      } else {
        seen.add("schematic");
        assert.match(body, /drone schematic/);
        assert.equal(g.player.weapons.length, guns);
      }
    }
    assert.deepEqual([...seen].sort(), ["heal", "nothing", "schematic"]);

    const full = createGame(9);
    open(full);
    pageWin(full, "engi-distress-rebel-fight", true);
    while (full.player.weapons.length < weaponSlotCap(full)) {
      full.uid = (full.uid + 1) >>> 0;
      full.player.weapons.push({
        uid: "u" + full.uid.toString(36),
        defId: "burst2",
        charge: 0,
        enabled: false,
        autofire: false,
        target: null,
      });
    }
    let blocked = false;
    for (let seed = 1; seed <= 40 && !blocked; seed++) {
      const g = createGame(seed + 20);
      open(g);
      pageWin(g, "engi-distress-rebel-fight", true);
      g.scrap = 40;
      g.player.weapons = full.player.weapons.map((w) => ({ ...w }));
      g.uid = full.uid;
      choose(g, "q:engi-distress:scrap");
      if (/med-bot disperser/.test(g.event?.body ?? "")) {
        blocked = true;
        assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), false);
        assert.match(g.event?.body ?? "", /No free weapon slot/);
      }
    }
    assert.equal(blocked, true);

    const paid = createGame(11);
    open(paid);
    pageWin(paid, "engi-distress-rebel-fight", false);
    paid.scrap = 50;
    paid.missiles = 5;
    paid.fuel = 6;
    const guns = paid.player.weapons.length;
    choose(paid, "q:engi-distress:supplies");
    assert.equal(paid.scrap, 10);
    assert.equal(paid.missiles, 3);
    assert.equal(paid.fuel, 4);
    assert.deepEqual(paid.augments, ["medbot"]);
    assert.match(paid.event?.body ?? "", /Engi Med-bot Dispersal fitted/);
    assert.equal(paid.player.weapons.length, guns);
  });
});
