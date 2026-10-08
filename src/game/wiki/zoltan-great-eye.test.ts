import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, weaponSlotCap } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { fillerChoose } from "./filler-events.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:zoltan-great-eye";
  b.name = "Zoltan Great Eye";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Zoltan Great Eye");
}

function players(g: Game) {
  return g.crew.filter((c) => c.side === "player" && c.hp > 0);
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

describe("Zoltan Great Eye", () => {
  it("leaving spends nothing", () => {
    const g = createGame(1);
    const crew = players(g).length;
    open(g);
    fillerChoose(g, "c:zoltan-great-eye:1");
    assert.match(g.event?.body ?? "", /save the Federation/);
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(players(g).length, crew);
  });

  it("pulling closer loses a crewmember, fights a Zoltan ship, pays high scrap, or mounts Healing Burst", () => {
    let lose = false;
    let fight = false;
    let scrap = false;
    let heal = false;
    for (let seed = 1; seed <= 80 && (!lose || !fight || !scrap || !heal); seed++) {
      const g = createGame(seed);
      const crew = players(g).length;
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      const body = g.event?.body ?? "";
      if (g.phase === "combat") {
        fight = true;
        assert.match(g.log.join(" "), /monolith speaks/);
        assert.equal(g.scrap, 10);
        assert.equal(players(g).length, crew);
      } else if (/kaleidoscope/.test(body)) {
        lose = true;
        assert.equal(players(g).length, crew - 1);
        assert.match(body, /is lost/);
        assert.equal(g.scrap, 10);
      } else if (/enough scrap/.test(body)) {
        scrap = true;
        const got = reward(body);
        assert.ok(got.scrap >= 19 && got.scrap <= 23, body);
        assert.equal(got.fuel, 0);
        assert.equal(got.missiles, 0);
        assert.equal(got.parts, 0);
        assert.equal(players(g).length, crew);
      } else {
        heal = true;
        assert.match(body, /Healing Burst/);
        assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), true);
        assert.equal(g.player.weapons.length, guns + 1);
        assert.equal(g.scrap, 10);
        assert.equal(players(g).length, crew);
      }
    }
    assert.equal(lose && fight && scrap && heal, true);
  });

  it("a clone bay does not bring the lost crewmember back", () => {
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      g.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      const crew = players(g).length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      if (!/kaleidoscope/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.equal(players(g).length, crew - 1);
      assert.match(g.event?.body ?? "", /lies dormant/);
      assert.equal(/revived/.test(g.event?.body ?? ""), false);
    }
    assert.equal(seen, true);
  });

  it("does not mount a second Healing Burst when the weapon list is full", () => {
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = createGame(seed);
      while (g.player.weapons.length < weaponSlotCap(g)) {
        g.player.weapons.push({
          uid: `fill-${g.player.weapons.length}`,
          defId: "artemis",
          charge: 0,
          enabled: false,
          autofire: false,
          target: null,
        });
      }
      const guns = g.player.weapons.length;
      open(g);
      fillerChoose(g, "c:zoltan-great-eye:0");
      if (!/medical equipment/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.player.weapons.some((w) => w.defId === "healburst"), false);
      assert.match(g.event?.body ?? "", /No free weapon slot/);
    }
    assert.equal(seen, true);
  });
});
