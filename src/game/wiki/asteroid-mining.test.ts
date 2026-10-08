import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, WeaponInst } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

function gun(defId: string): WeaponInst {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null };
}

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Asteroid mining colony",
    tier: "",
    flag: "filler:asteroid-mining-colony",
    asteroid: false,
  };
}

describe("Asteroid mining colony", () => {
  it("is a card an items draw can reach", () => {
    assert.equal(pageForRow("Asteroid mining colony")?.slug, "asteroid-mining-colony");
  });

  it("offers a launch only for a missile weapon, and that launch changes nothing", () => {
    const bare = createGame(1);
    bare.player.weapons = [];
    bare.missiles = 9;
    const hidden = fillerEvent(bare, beacon());
    assert.ok(hidden);
    assert.equal(hidden.choices.some((c) => c.id === "c:asteroid-mining-colony:0"), false);

    const hull = createGame(2);
    hull.player.weapons = [gun("hullmissile")];
    const skipped = fillerEvent(hull, beacon());
    assert.equal(skipped?.choices.some((c) => c.id === "c:asteroid-mining-colony:0"), false);

    const g = createGame(3);
    g.player.weapons = [gun("artemis")];
    g.missiles = 9;
    g.here = "b";
    g.beacons = [beacon()];
    const ev = fillerEvent(g, g.beacons[0]);
    assert.ok(ev?.choices.some((c) => c.id === "c:asteroid-mining-colony:0"));
    fillerChoose(g, "c:asteroid-mining-colony:0");
    assert.equal(g.missiles, 9);
    assert.match(g.event?.body ?? "", /union-friendly/);
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["c:asteroid-mining-colony:1", "c:asteroid-mining-colony:2", "c:asteroid-mining-colony:3"],
    );
  });

  it("refuses a short stack and spends 5 or 15 when the stack is there", () => {
    const g = createGame(4);
    g.phase = "event";
    g.missiles = 4;
    assert.equal(choiceDisabled(g, "c:asteroid-mining-colony:1"), "Need 5 missiles");
    fillerChoose(g, "c:asteroid-mining-colony:1");
    assert.equal(g.missiles, 4);
    g.missiles = 14;
    assert.equal(choiceDisabled(g, "c:asteroid-mining-colony:2"), "Need 15 missiles");
    fillerChoose(g, "c:asteroid-mining-colony:2");
    assert.equal(g.missiles, 14);
  });

  it("rolls the printed 5-missile and 15-missile results", () => {
    const five = new Set<string>();
    const fifteen = new Set<string>();
    for (let seed = 1; seed < 80 && (five.size < 3 || fifteen.size < 3); seed++) {
      for (const [n, bag] of [[5, five], [15, fifteen]] as const) {
        const g = createGame(seed);
        g.missiles = n;
        g.scrap = 0;
        g.scrapCollected = 0;
        g.player.hull = g.player.hullMax - 20;
        const reactor = g.player.reactor;
        const augments = g.augments.length;
        fillerChoose(g, n === 5 ? "c:asteroid-mining-colony:1" : "c:asteroid-mining-colony:2");
        assert.equal(g.missiles, 0);
        assert.equal(g.augments.length, augments);
        const body = g.event?.body ?? "";
        if (n === 5 && body.includes("repair some of your ship's hull")) {
          bag.add("hull");
          assert.equal(g.player.hull, g.player.hullMax - 10);
        } else if (n === 5 && body.includes("upgrade your reactor")) {
          bag.add("reactor");
          assert.equal(g.player.reactor, reactor + 1);
        } else if (n === 5 && body.includes("scrap in exchange")) {
          bag.add("scrap");
          assert.ok(g.scrap >= 15 && g.scrap <= 25, String(g.scrap));
          assert.equal(g.scrapCollected, g.scrap);
        } else if (n === 15 && body.includes("fix up your ship")) {
          bag.add("both");
          assert.equal(g.player.hull, g.player.hullMax - 5);
          assert.equal(g.player.reactor, reactor + 1);
        } else if (n === 15 && body.includes("ship Augment")) {
          bag.add("augment");
          assert.equal(g.player.hull, g.player.hullMax - 20);
          assert.equal(g.player.reactor, reactor);
        } else if (n === 15 && body.includes("repair part of your hull")) {
          bag.add("scrap");
          assert.ok(g.scrap >= 30 && g.scrap <= 40, String(g.scrap));
          assert.equal(g.player.hull, g.player.hullMax - 15);
        } else {
          assert.fail(body);
        }
      }
    }
    assert.deepEqual([...five].sort(), ["hull", "reactor", "scrap"]);
    assert.deepEqual([...fifteen].sort(), ["augment", "both", "scrap"]);
  });

  it("does not raise a reactor that is already at 25", () => {
    let seen = false;
    for (let seed = 1; seed < 40 && !seen; seed++) {
      const g = createGame(seed);
      g.missiles = 5;
      g.player.reactor = 25;
      fillerChoose(g, "c:asteroid-mining-colony:1");
      if ((g.event?.body ?? "").includes("upgrade your reactor")) {
        seen = true;
        assert.equal(g.player.reactor, 25);
        assert.equal(g.missiles, 0);
      }
    }
    assert.equal(seen, true);
  });

  it("declining spends nothing", () => {
    const g = createGame(6);
    g.missiles = 8;
    g.scrap = 20;
    const hull = g.player.hull;
    fillerChoose(g, "c:asteroid-mining-colony:3");
    assert.equal(g.missiles, 8);
    assert.equal(g.scrap, 20);
    assert.equal(g.player.hull, hull);
    assert.match(g.event?.body ?? "", /Good luck out there/);
    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
  });
});
