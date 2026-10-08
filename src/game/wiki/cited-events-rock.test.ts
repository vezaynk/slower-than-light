import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kinOf } from "../extras/kin.ts";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { EXTRA_EVENTS } from "./cited-events-rock.ts";
import { citedEvent } from "./cited-events.ts";

const TITLES = [
  "Ancient device",
  "Boarders: Rockmen near sun",
  "Disabled Rock ship",
  "Empty beacon (Rock)",
  "Mantis ship with Rock body parts",
  "Mantis ships battle for Rock freighter",
  "Rock and Slug standoff",
  "Rock bride",
  "Rock fight",
  "Rock fight in asteroid field",
  "Rock fight with boarders",
  "Rock fight with boarders in asteroid field",
  "Rock live mine",
  "Rock pirates fight",
  "Rock pirates fight in asteroid field",
  "Rock pirates fight near sun",
  "Rock war vessel encounter",
  "Store (Rock)",
];

const DUMP = "/Users/slava/code/ftl.fandom.com-dump/pages.jsonl";

function pages(): Map<string, string> {
  const want = new Set(TITLES);
  const found = new Map<string, string>();
  const text = readFileSync(DUMP, "utf8");
  for (const line of text.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    found.set(row.title, row.text ?? "");
  }
  return found;
}

function sectorNames(wikitext: string): string[] {
  const match = wikitext.match(/\{\{Locations\|[^}]+\}\}/);
  assert.ok(match, "Locations line");
  const inner = match[0].slice("{{Locations|".length, -2);
  return inner
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("cited rock events", () => {
  it("keeps only these titles and the sector names on each Locations line", () => {
    const found = pages();
    assert.equal(found.size, TITLES.length);
    const seen = new Set<string>();
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.ok(!seen.has(ev.dest), ev.dest);
      seen.add(ev.dest);
      assert.deepEqual(ev.sectors, sectorNames(found.get(ev.dest) ?? ""));
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
      });
    }
  });

  it("matches every stated number and fight word to the comment above it", () => {
    const src = readFileSync(new URL("./cited-events-rock.ts", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export const EXTRA_EVENTS"));
    let comment = "";
    let fights = 0;
    let numbers = 0;
    for (const line of body.split("\n")) {
      const noted = line.match(/^\s*\/\/\s?(.*)$/);
      if (noted) {
        comment = noted[1] ?? "";
        continue;
      }
      const amount = line.match(/\b(?:lo|hi|n):\s*(-?\d+)/);
      if (amount) {
        numbers += 1;
        const token = amount[1] ?? "";
        assert.match(comment, new RegExp(`(?<![0-9])${token}(?![0-9])`), comment);
      }
      const tier = line.match(/\btier:\s*"([^"]+)"/);
      if (tier && comment.length > 0) {
        fights += 1;
        assert.ok(comment.includes(tier[1] ?? ""), `${tier[1]} not in ${comment}`);
      }
      if (/\basteroid:\s*true/.test(line)) {
        assert.ok(comment.includes("asteroidfield=true"), comment);
      }
    }
    assert.equal(fights, EXTRA_EVENTS.reduce((n, ev) => n + ev.choices.filter((c) => c.fx.some((fx) => fx.k === "fight")).length, 0));
    assert.equal(numbers, 0);
  });
});

function arrive(seed: number, dest: string): Game {
  const g = createGame(seed);
  g.sectorName = "Rock Controlled Sector";
  const ev = EXTRA_EVENTS.find((e) => e.dest === dest)!;
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store")!;
  b.flag = ev.flag;
  b.kind = "event";
  b.name = ev.dest;
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  return g;
}

describe("Rock fight with boarders", () => {
  it("beams 1-3 Rock boarders aboard after the Rock ship fight and grants nothing else", () => {
    const seen = new Set<number>();
    const hp = kinOf("stone").hp;
    for (let seed = 1; seed <= 80 && seen.size < 3; seed++) {
      const g = arrive(seed, "Rock fight with boarders");
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const kits = JSON.stringify(g.player.kits);
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      g.crew.push({
        id: "planted",
        name: "Planted",
        side: "enemy",
        aboard: "player",
        hp: 1,
        maxHp: 1,
        room: g.player.rooms[0]?.id ?? "p-medbay",
        path: [],
        move: 0,
        think: 0,
        tone: 3,
        kin: "plain",
      });
      choose(g, "c:rock-fight-with-boarders:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "rock");
      assert.equal(g.enemy?.pirate, false);
      assert.equal(g.asteroid, false);
      assert.equal(g.fightEvent, "rock-fight-with-boarders");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 1 && boarders.length <= 3, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(boarders.every((c) => c.name === "Rock" && c.kin === "stone" && c.hp === hp && c.maxHp === hp && rooms.has(c.room)));
      assert.equal(boarders.some((c) => c.id === "planted"), false);
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(g.player.weapons.map((w) => w.defId), weapons);
      assert.deepEqual(g.augments, augments);
      assert.equal(JSON.stringify(g.player.kits), kits);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(g.log.some((line) => line.includes("Boarder counts are not applied")), false);
      assert.ok(g.log.some((line) => line === `${boarders.length} rock boarders beam aboard your ship.`));
    }
    assert.deepEqual([...seen].sort(), [1, 2, 3]);
  });

  it("beams 1-2 Rock boarders aboard in the asteroid field and grants nothing else", () => {
    const field = EXTRA_EVENTS.find((e) => e.dest === "Rock fight with boarders in asteroid field")!;
    assert.equal(field.choices[0].fx.some((fx) => fx.k === "note"), false);
    const seen = new Set<number>();
    const hp = kinOf("stone").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = arrive(seed, "Rock fight with boarders in asteroid field");
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const kits = JSON.stringify(g.player.kits);
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      choose(g, "c:rock-fight-with-boarders-in-asteroid-field:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.asteroid, true);
      assert.equal(g.enemy?.faction, "rock");
      assert.equal(g.fightEvent, "rock-fight-with-boarders-in-asteroid-field");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 1 && boarders.length <= 2, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(boarders.every((c) => c.name === "Rock" && c.kin === "stone" && c.hp === hp && c.maxHp === hp && rooms.has(c.room)));
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(g.player.weapons.map((w) => w.defId), weapons);
      assert.deepEqual(g.augments, augments);
      assert.equal(JSON.stringify(g.player.kits), kits);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(g.log.some((line) => line.includes("Boarder counts are not applied")), false);
      assert.ok(g.log.some((line) => line === `${boarders.length} rock boarders beam aboard your ship.`));
    }
    assert.deepEqual([...seen].sort(), [1, 2]);
  });
});

describe("Mantis ship with Rock body parts", () => {
  it("prints the hunter sentence and keeps the attack", () => {
    const g = createGame(1);
    const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
    assert.ok(b);
    b.flag = "cited:mantis-ship-with-rock-body-parts";
    b.name = "Mantis ship with Rock body parts";
    g.here = b.id;
    g.event = citedEvent(g, b);
    assert.equal(
      g.event?.body,
      "A Mantis ship here is adorned with Rock body parts! It would be a gorier display if they had internal organs, but the message is clear enough: this is a hunter of a very specialized kind.",
    );
    assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-ship-with-rock-body-parts:0"));
  });
});
