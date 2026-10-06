import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { choose, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { EXTRA_EVENTS } from "./cited-events-surrender.ts";
import { citedEvent } from "./cited-events.ts";
import { ACCEPT_ID, PAGE_CHOICES, REFUSE_ID, SCRIPTED_SURRENDERS } from "./surrender.ts";

const DUMP = "/Users/slava/code/ftl.fandom.com-dump/pages.jsonl";

function pageText(title: string): string | null {
  if (!existsSync(DUMP)) return null;
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line.includes(`"title": "${title}"`)) continue;
    const o = JSON.parse(line) as { title: string; ns: number; text?: string };
    if (o.ns === 0 && o.title === title) return o.text ?? "";
  }
  return null;
}

/**
 * Put the ship at a beacon carrying `dest` with its card open. The beacon is flagged by hand, the way
 * stampCitedEvents does it, so the test does not depend on which beacon the sector's seeded deal (beacon-mix.ts) gives it.
 */
function arrive(seed: number, sector: string, dest: string): Game {
  const g = createGame(seed);
  g.sectorName = sector;
  const ev = EXTRA_EVENTS.find((e) => e.dest === dest)!;
  assert.ok(ev.sectors.includes(sector));
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store")!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = ev.dest;
  g.here = b.id;
  g.event = citedEvent(g, b);
  assert.ok(g.event);
  g.phase = "event";
  return g;
}

function kinds(g0: { fuel: number; missiles: number; parts: number }, g: Game) {
  return { fuel: g.fuel - g0.fuel, missiles: g.missiles - g0.missiles, parts: g.player.parts - g0.parts };
}

function snap(g: Game) {
  return { fuel: g.fuel, missiles: g.missiles, parts: g.player.parts, scrap: g.scrap, crew: g.crew.length };
}

/** Hull to 25% (inside every row's range) so the surrender roll fires on the next tick. */
function forceOffer(g: Game) {
  g.enemy!.weapons = [];
  g.enemySurrender!.chance = 100;
  g.enemy!.hull = Math.max(1, Math.floor(g.enemy!.hullMax * 0.25));
  g.enemySurrender!.threshold = 50;
  for (let i = 0; i < 5 && g.phase === "combat"; i++) step(g, 1 / 30);
  assert.equal(g.phase, "event");
}

describe("Ship surrender Events pages: cited table", () => {
  it("takes sectors from {{Locations}} and the body from the page text", () => {
    for (const ev of EXTRA_EVENTS) {
      const text = pageText(ev.dest);
      if (text == null) continue;
      const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
      assert.ok(m, ev.dest);
      const names = m[1].split("|").map((s) => s.trim()).filter((s) => s && !s.includes("="));
      assert.deepEqual(ev.sectors, names, ev.dest);
      const plain = text.replace(/''/g, "").replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
      assert.ok(plain.includes(ev.body), ev.dest);
      for (const c of ev.choices) assert.ok(plain.includes(c.label.replace(/\.$/, "")), c.label);
    }
  });

  it("routes every random branch to surrender.ts and every page fight to a scripted surrender row", () => {
    const ids = new Set(EXTRA_EVENTS.flatMap((ev) => ev.choices.map((c) => c.id)));
    for (const id of Object.keys(PAGE_CHOICES).filter((k) => k.startsWith("c:"))) assert.ok(ids.has(id), id);
    // @agent:quests. Slug comm tapping and Engi fleet discussion open quest markers (wiki/quests.ts); their fights are
    // the "quest-*" surrender rows, not a row under the page slug.
    const questPages = new Set(["slug-comm-tapping", "engi-fleet-discussion"]);
    for (const ev of EXTRA_EVENTS) {
      for (const c of ev.choices) {
        if (questPages.has(ev.slug)) continue;
        if (c.fx.some((f) => f.k === "fight") || c.fx.some((f) => f.k === "note")) assert.ok(PAGE_CHOICES[c.id], c.id);
      }
      if (ev.slug !== "engi-surrender" && !questPages.has(ev.slug)) assert.ok(SCRIPTED_SURRENDERS[ev.slug], ev.slug);
    }
    assert.ok(SCRIPTED_SURRENDERS["quest-slug-pirate-trap-engage"] && SCRIPTED_SURRENDERS["quest-engi-real"] && SCRIPTED_SURRENDERS["quest-engi-fake"]);
  });
});

describe("Engi surrender (no fight)", () => {
  it("Accept their offer: scrap with low resources, no fight", () => {
    const g = arrive(3, "Engi Homeworlds", "Engi surrender");
    const s0 = snap(g);
    choose(g, "c:engi-surrender:1");
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("The Engi obediently transfer"));
    assert.ok(g.scrap > s0.scrap);
    const d = kinds(s0, g);
    assert.equal([d.fuel, d.missiles, d.parts].filter((n) => n > 0).length, 2);
    assert.ok(d.fuel <= 3 && d.missiles <= 2 && d.parts <= 1);
    choose(g, "ack");
    assert.equal(g.phase, "map");
    assert.ok(g.beacons.find((b) => b.id === g.here)!.resolved);
  });

  it("Explain that you're friendly: nothing, or the gear", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 40 && seen.size < 2; seed++) {
      const g = arrive(seed, "Engi Controlled Sector", "Engi surrender");
      const s0 = snap(g);
      choose(g, "c:engi-surrender:0");
      if (g.event!.body.startsWith("The Engi seem relieved")) {
        assert.equal(g.scrap, s0.scrap);
        seen.add("nothing");
      } else {
        assert.ok(g.event!.body.startsWith("The Engi are satisfied"));
        assert.ok(g.scrap > s0.scrap);
        seen.add("gear");
      }
    }
    assert.equal(seen.size, 2);
  });
});

describe("Zoltan ship asks to dock", () => {
  it("Dock: a fight with a forced 50% surrender, or a medium Stuff gift", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 60 && seen.size < 2; seed++) {
      const g = arrive(seed, "Zoltan Controlled Sector", "Zoltan ship asks to dock");
      const s0 = snap(g);
      choose(g, "c:zoltan-ship-asks-to-dock:0");
      if (g.phase === "combat") {
        seen.add("fight");
        assert.equal(g.enemy!.faction, "zoltan");
        assert.equal(g.enemySurrender!.chance, 50);
        assert.ok(g.enemySurrender!.threshold >= 30 && g.enemySurrender!.threshold <= 40);
        assert.equal(g.enemyEscape!.mode, "never");
        forceOffer(g);
        assert.deepEqual(g.event!.choices.map((c) => c.id), [ACCEPT_ID]);
        const before = snap(g);
        choose(g, REFUSE_ID); // no decline: read as accept
        assert.equal(g.phase, "reward");
        assert.equal(g.enemy, null);
        assert.ok(g.scrap > before.scrap);
        assert.ok(g.crew.some((c) => c.side === "player" && c.kin === "spark") || before.crew >= 5);
      } else {
        seen.add("gift");
        const d = kinds(s0, g);
        assert.equal([d.fuel, d.missiles, d.parts].filter((n) => n > 0).length, 2);
        assert.ok(d.fuel <= 4 && d.missiles <= 4 && d.parts <= 1);
        assert.equal(g.player.weapons.length, createGame(seed).player.weapons.length);
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "gift"]);
  });
});

describe("Settlement mercenary work", () => {
  it("pirate job: never runs, guaranteed surrender at 30-40%, medium scrap (the unnamed weapon is not granted)", () => {
    let done = false;
    for (let seed = 1; seed < 40 && !done; seed++) {
      const g = arrive(seed, "Civilian Sector", "Settlement mercenary work");
      choose(g, "c:settlement-mercenary-work:0");
      const ids = g.event!.choices.map((c) => c.id);
      if (!ids.includes("s:settlement-mercenary-work:accept")) {
        assert.deepEqual(ids, ["s:settlement-mercenary-work:dock", "s:settlement-mercenary-work:nodock"]);
        choose(g, "s:settlement-mercenary-work:dock");
        choose(g, "ack");
        assert.equal(g.phase, "map");
        continue;
      }
      choose(g, "s:settlement-mercenary-work:accept");
      assert.equal(g.phase, "combat");
      assert.ok(g.enemy!.pirate);
      assert.equal(g.enemyEscape!.mode, "never");
      assert.equal(g.enemySurrender!.chance, 100);
      assert.ok(g.enemySurrender!.threshold >= 30 && g.enemySurrender!.threshold <= 40);
      const weapons = g.player.weapons.length;
      forceOffer(g);
      assert.equal(g.event!.choices[0].label, "Let them live and then return to the settlement.");
      assert.equal(g.event!.choices[1].label, "Forget your promise, they die!");
      const before = g.scrap;
      choose(g, ACCEPT_ID);
      const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
      assert.ok(g.reward!.scrap > 0 && g.scrap - before === g.reward!.scrap);
      assert.ok(g.reward!.scrap >= Math.floor(lo * 0.5) && g.reward!.scrap <= hi * 2);
      assert.equal(g.player.weapons.length, weapons);
      done = true;
    }
    assert.ok(done);
  });
});

describe("The Black Raven", () => {
  it("No -> challenge; declining still fights a Slug pirate with a guaranteed offer of high scrap", () => {
    const g = arrive(5, "Slug Home Nebula", "The Black Raven");
    choose(g, "c:the-black-raven:0");
    assert.deepEqual(g.event!.choices.map((c) => c.id), ["s:the-black-raven:accept", "s:the-black-raven:decline"]);
    choose(g, "s:the-black-raven:decline");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy!.faction, "slug");
    assert.ok(g.enemy!.pirate);
    assert.equal(g.enemySurrender!.chance, 100);
    forceOffer(g);
    assert.equal(g.event!.choices[0].label, "Accept his surrender.");
    choose(g, ACCEPT_ID);
    assert.equal(g.phase, "reward");
    assert.ok(g.reward!.scrap > 0);
  });
});

describe("Destroyed cargo ship", () => {
  it("Bring it aboard: supplies, scrap, boarders with no ship, or the pirate ambush", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 80 && seen.size < 4; seed++) {
      const g = arrive(seed, "Pirate Controlled Sector", "Destroyed cargo ship");
      const s0 = snap(g);
      const kills = g.kills;
      choose(g, "c:destroyed-cargo-ship:0");
      if (g.phase === "combat" && g.enemy) {
        seen.add("ambush");
        const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
        assert.ok(boarders.length >= 2 && boarders.length <= 4);
        assert.ok(boarders.every((c) => c.name === "Human" && c.kin === "plain"));
        assert.equal(g.enemyEscape!.chance, 70);
        assert.equal(g.enemySurrender!.chance, 100);
        assert.ok(g.enemySurrender!.threshold >= 0 && g.enemySurrender!.threshold <= 50);
        for (let i = 0; i < 300 && g.phase === "combat"; i++) step(g, 1 / 30);
      } else if (g.phase === "combat" && !g.enemy) {
        seen.add("boarders");
        const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
        assert.ok(boarders.length >= 2 && boarders.length <= 4);
        assert.ok(boarders.every((c) => c.name === "Human" && c.kin === "plain"));
        assert.equal(g.kills, kills);
        assert.equal(g.scrap, s0.scrap);
        assert.equal(g.asb, false);
      } else if (g.event!.body.startsWith("They appear to be filled")) {
        seen.add("supplies");
        const d = kinds(s0, g);
        assert.equal([d.fuel, d.missiles, d.parts].filter((n) => n > 0).length, 2);
      } else {
        seen.add("scrap");
        assert.ok(g.event!.body.startsWith("The cargo was primarily consumer goods"));
        assert.deepEqual(kinds(s0, g), { fuel: 0, missiles: 0, parts: 0 });
        assert.ok(g.scrap > s0.scrap);
      }
    }
    assert.equal(seen.size, 4);
  });
});
