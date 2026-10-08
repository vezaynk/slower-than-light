import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XP_NEED, skillRank } from "../content.ts";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Beacon, Game, SkillName } from "../types.ts";
import { fillerChoose, fillerEvent, pageForRow } from "./filler-events.ts";

const SKILLS: SkillName[] = ["pilot", "engines", "weapons", "shields", "repair", "combat"];

function beacon(): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name: "Single life form on moon",
    tier: "",
    flag: "filler:single-life-form-on-moon",
    asteroid: false,
  };
}

function open(g: Game) {
  g.beacons = [beacon()];
  g.here = "b";
  const ev = fillerEvent(g, g.beacons[0]);
  assert.ok(ev);
  g.event = ev;
  g.phase = "event";
  return ev;
}

function reward(body: string) {
  const n = (label: string) => {
    const m = body.match(new RegExp(`${label}: (-?\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return { scrap: n("Scrap"), fuel: n("Fuel"), missiles: n("Missiles"), parts: n("Drone parts") };
}

function scrapOnly(body: string, lo: number, hi: number) {
  const got = reward(body);
  assert.ok(got.scrap >= lo && got.scrap <= hi, body);
  assert.equal(got.fuel, 0);
  assert.equal(got.missiles, 0);
  assert.equal(got.parts, 0);
}

function systemDamage(g: Game): number {
  return Object.values(g.player.systems).reduce((n, sys) => n + (sys?.damage ?? 0), 0);
}

function ranks(g: Game, name: string): Record<SkillName, number> {
  const crew = g.crew.find((c) => c.name === name && c.side === "player");
  assert.ok(crew);
  const out = {} as Record<SkillName, number>;
  for (const skill of SKILLS) out[skill] = skillRank(crew.skills?.[skill] ?? 0, XP_NEED[skill]);
  return out;
}

function scene(seed: number, setup?: (g: Game) => void): Game | null {
  const g = createGame(seed);
  setup?.(g);
  open(g);
  fillerChoose(g, "c:single-life-form-on-moon:0");
  return g;
}

describe("Single life form on moon", () => {
  it("is a card a distress draw can reach", () => {
    assert.equal(pageForRow("Single life form on moon")?.slug, "single-life-form-on-moon");
    const g = createGame(1);
    assert.deepEqual(open(g).choices.map((c) => c.id), [
      "c:single-life-form-on-moon:0",
      "c:single-life-form-on-moon:1",
    ]);
  });

  it("ignoring the signal spends nothing", () => {
    const g = createGame(2);
    const crew = g.crew.length;
    const hull = g.player.hull;
    open(g);
    fillerChoose(g, "c:single-life-form-on-moon:1");
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.crew.length, crew);
    assert.equal(g.player.hull, hull);
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("going down finds the colony or the cave", () => {
    let colony = false;
    let cave = false;
    for (let seed = 1; seed <= 40 && (!colony || !cave); seed++) {
      const g = scene(seed);
      assert.ok(g);
      const body = g.event?.body ?? "";
      if (/lone survivor/.test(body)) {
        colony = true;
        assert.deepEqual(g.event?.choices.map((c) => c.id), ["s:moon:invite", "s:moon:home"]);
      } else {
        cave = true;
        assert.match(body, /living alone in a cave/);
        assert.deepEqual(g.event?.choices.map((c) => c.id), ["s:moon:bring", "s:moon:leave"]);
      }
    }
    assert.equal(colony && cave, true);
  });

  it("inviting him adds Charlie with one skill at rank 1", () => {
    const seen = new Set<SkillName>();
    for (let seed = 1; seed <= 160 && seen.size < SKILLS.length; seed++) {
      const g = scene(seed);
      assert.ok(g);
      if (!/lone survivor/.test(g.event?.body ?? "")) continue;
      const crew = g.crew.length;
      fillerChoose(g, "s:moon:invite");
      assert.match(g.event?.body ?? "", /Charlie joins you/);
      assert.equal(g.crew.length, crew + 1);
      const got = ranks(g, "Charlie");
      const hot = SKILLS.filter((skill) => got[skill] === 1);
      assert.equal(hot.length, 1);
      assert.ok(SKILLS.every((skill) => got[skill] === 0 || skill === hot[0]));
      seen.add(hot[0]);
    }
    assert.deepEqual([...seen].sort(), [...SKILLS].sort());
  });

  it("a full ship has no room for Charlie", () => {
    let seen = false;
    for (let seed = 1; seed <= 40 && !seen; seed++) {
      const g = scene(seed, (game) => {
        while (game.crew.filter((c) => c.side === "player").length < 8) {
          const copy = game.crew[0];
          game.crew.push({ ...copy, id: `fill-${game.crew.length}`, name: `Fill ${game.crew.length}` });
        }
      });
      assert.ok(g);
      if (!/lone survivor/.test(g.event?.body ?? "")) continue;
      seen = true;
      const crew = g.crew.length;
      fillerChoose(g, "s:moon:invite");
      assert.match(g.event?.body ?? "", /no room aboard for Charlie/);
      assert.equal(g.crew.length, crew);
    }
    assert.equal(seen, true);
  });

  it("taking him home pays high scrap, medium scrap, or 10 repairs", () => {
    let high = false;
    let medium = false;
    let hull = false;
    for (let seed = 1; seed <= 80 && (!high || !medium || !hull); seed++) {
      const g = scene(seed, (game) => {
        game.player.hull = game.player.hullMax - 15;
      });
      assert.ok(g);
      if (!/lone survivor/.test(g.event?.body ?? "")) continue;
      const before = g.player.hull;
      const crew = g.crew.length;
      fillerChoose(g, "s:moon:home");
      const body = g.event?.body ?? "";
      assert.equal(g.crew.length, crew);
      if (/mining enterprises/.test(body)) {
        high = true;
        scrapOnly(body, 19, 23);
        assert.equal(g.player.hull, before);
      } else if (/modest means/.test(body)) {
        medium = true;
        scrapOnly(body, 12, 19);
        assert.equal(g.player.hull, before);
      } else {
        hull = true;
        assert.match(body, /receives 10 repairs/);
        assert.equal(g.player.hull, before + 10);
        assert.equal(g.scrap, 10);
      }
    }
    assert.equal(high && medium && hull, true);
  });

  it("bringing him back loses a crewmember, adds Charlie, deals 5 hull, or he collapses", () => {
    let lost = false;
    let joined = false;
    let blast = false;
    let collapsed = false;
    for (let seed = 1; seed <= 80 && (!lost || !joined || !blast || !collapsed); seed++) {
      const g = scene(seed);
      assert.ok(g);
      if (!/living alone in a cave/.test(g.event?.body ?? "")) continue;
      const crew = g.crew.length;
      const hull = g.player.hull;
      const broken = systemDamage(g);
      fillerChoose(g, "s:moon:bring");
      const body = g.event?.body ?? "";
      if (/increasingly violent/.test(body)) {
        lost = true;
        assert.equal(g.crew.length, crew - 1);
        assert.match(body, /is lost/);
        assert.equal(g.player.hull, hull);
        assert.equal(g.scrap, 10);
      } else if (/improve immensely/.test(body)) {
        joined = true;
        assert.match(body, /Charlie joins you/);
        assert.equal(g.crew.length, crew + 1);
        assert.deepEqual(ranks(g, "Charlie"), { pilot: 0, engines: 0, weapons: 0, shields: 0, repair: 0, combat: 0 });
        assert.equal(g.player.hull, hull);
      } else if (/makeshift explosive/.test(body)) {
        blast = true;
        assert.equal(g.player.hull, hull - 5);
        assert.equal(systemDamage(g) - broken, 1);
        assert.match(body, /System damage: /);
        assert.equal(g.crew.length, crew);
        assert.equal(g.scrap, 10);
      } else {
        collapsed = true;
        assert.match(body, /collapses on the trip/);
        assert.deepEqual(g.event?.choices.map((c) => c.id), ["s:moon:collapse-continue"]);
        assert.equal(g.crew.length, crew);
      }
    }
    assert.equal(lost && joined && blast && collapsed, true);
  });

  it("a clone bay revives the crewmember he kills", () => {
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = scene(seed, (game) => {
        game.player.kits.cradle = { id: "cradle", level: 1, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      });
      assert.ok(g);
      if (!/living alone in a cave/.test(g.event?.body ?? "")) continue;
      const crew = g.crew.length;
      fillerChoose(g, "s:moon:bring");
      if (!/increasingly violent/.test(g.event?.body ?? "")) continue;
      seen = true;
      assert.match(g.event?.body ?? "", /revived/);
      assert.equal(g.crew.length, crew);
    }
    assert.equal(seen, true);
  });

  it("a level 2 medbay and a level 3 medbay each add Charlie", () => {
    const g2 = scene(1, (game) => {
      game.player.systems.medbay.level = 2;
    });
    // Seed 1 may be the colony. Search until the cave is open at each level.
    let improved = false;
    let advanced = false;
    for (let seed = 1; seed <= 40 && (!improved || !advanced); seed++) {
      const low = scene(seed, (game) => {
        game.player.systems.medbay.level = 2;
      });
      assert.ok(low);
      if (/living alone in a cave/.test(low.event?.body ?? "") && !improved) {
        improved = true;
        assert.ok(low.event?.choices.some((c) => c.id === "s:moon:medbay2"));
        assert.equal(low.event?.choices.some((c) => c.id === "s:moon:medbay3"), false);
        const crew = low.crew.length;
        fillerChoose(low, "s:moon:medbay2");
        assert.match(low.event?.body ?? "", /Charlie joins you/);
        assert.equal(low.crew.length, crew + 1);
        assert.deepEqual(ranks(low, "Charlie"), { pilot: 0, engines: 0, weapons: 0, shields: 0, repair: 0, combat: 0 });
      }
      const high = scene(seed, (game) => {
        game.player.systems.medbay.level = 3;
      });
      assert.ok(high);
      if (/living alone in a cave/.test(high.event?.body ?? "") && !advanced) {
        advanced = true;
        assert.ok(high.event?.choices.some((c) => c.id === "s:moon:medbay2"));
        assert.ok(high.event?.choices.some((c) => c.id === "s:moon:medbay3"));
        const crew = high.crew.length;
        fillerChoose(high, "s:moon:medbay3");
        assert.match(high.event?.body ?? "", /Charlie joins you/);
        assert.equal(high.crew.length, crew + 1);
        assert.deepEqual(ranks(high, "Charlie"), { pilot: 1, engines: 1, weapons: 1, shields: 1, repair: 1, combat: 1 });
      }
    }
    assert.equal(improved && advanced, true);
    assert.equal(g2 && choiceDisabled(createGame(1), "s:moon:medbay2"), "Needs a level 2 Medbay");
    assert.equal(choiceDisabled(createGame(1), "s:moon:medbay3"), "Needs a level 3 Medbay");
  });

  it("the collapse lets a level 2 medbay or clone bay add Charlie, and continue spends nothing", () => {
    let plain = false;
    let med = false;
    let bay = false;
    for (let seed = 1; seed <= 80 && (!plain || !med || !bay); seed++) {
      const g = scene(seed);
      assert.ok(g);
      if (!/living alone in a cave/.test(g.event?.body ?? "")) continue;
      fillerChoose(g, "s:moon:bring");
      if (!/collapses on the trip/.test(g.event?.body ?? "")) continue;
      if (!plain) {
        plain = true;
        const crew = g.crew.length;
        fillerChoose(g, "s:moon:collapse-continue");
        assert.match(g.event?.body ?? "", /Nothing happens/);
        assert.equal(g.crew.length, crew);
        assert.equal(g.scrap, 10);
        continue;
      }
      if (!med) {
        med = true;
        const again = scene(seed, (game) => {
          game.player.systems.medbay.level = 2;
        });
        assert.ok(again);
        fillerChoose(again, "s:moon:bring");
        assert.match(again.event?.body ?? "", /collapses on the trip/);
        assert.ok(again.event?.choices.some((c) => c.id === "s:moon:collapse-medbay"));
        const crew = again.crew.length;
        fillerChoose(again, "s:moon:collapse-medbay");
        assert.match(again.event?.body ?? "", /Charlie joins you/);
        assert.equal(again.crew.length, crew + 1);
        continue;
      }
      bay = true;
      const cloned = scene(seed, (game) => {
        game.player.kits.cradle = { id: "cradle", level: 2, power: 1, left: 0, cool: 0, target: null, on: false, aux: 0 };
      });
      assert.ok(cloned);
      fillerChoose(cloned, "s:moon:bring");
      assert.match(cloned.event?.body ?? "", /collapses on the trip/);
      assert.ok(cloned.event?.choices.some((c) => c.id === "s:moon:collapse-clone"));
      const crew = cloned.crew.length;
      fillerChoose(cloned, "s:moon:collapse-clone");
      assert.match(cloned.event?.body ?? "", /Charlie joins you/);
      assert.equal(cloned.crew.length, crew + 1);
    }
    assert.equal(plain && med && bay, true);
    assert.equal(choiceDisabled(createGame(1), "s:moon:collapse-clone"), "Needs a level 2 Clone Bay");
  });

  it("a Slug assesses him and does not add an unnamed crewmember", () => {
    let stay = false;
    let leave = false;
    for (let seed = 1; seed <= 40 && (!stay || !leave); seed++) {
      const g = scene(seed, (game) => {
        game.crew[0].kin = "gel";
      });
      assert.ok(g);
      if (!/living alone in a cave/.test(g.event?.body ?? "")) continue;
      assert.ok(g.event?.choices.some((c) => c.id === "s:moon:slug"));
      const crew = g.crew.length;
      const names = g.crew.map((c) => c.name);
      fillerChoose(g, "s:moon:slug");
      const body = g.event?.body ?? "";
      assert.equal(g.crew.length, crew);
      assert.deepEqual(g.crew.map((c) => c.name), names);
      assert.equal(g.scrap, 10);
      if (/good intentions/.test(body)) stay = true;
      else {
        leave = true;
        assert.match(body, /clearly unstable/);
      }
    }
    assert.equal(stay && leave, true);
    assert.equal(choiceDisabled(createGame(1), "s:moon:slug"), "Needs a Slug crewmember");
  });
});
