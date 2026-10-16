import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { choiceDisabled, choose, commitJump, createGame, step } from "../sim.ts";
import type { Game } from "../types.ts";
import { SECTOR_MIX } from "./beacon-mix.ts";
import { stampCitedEvents } from "./cited-events.ts";
import {
  DISTRESS,
  EMPTY_PAGES,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  FILLER_CHOICES,
  FILLER_FLAG,
  FILLER_PAGES,
  ITEMS,
  NEBULA,
  emptyPageFor,
  fillerEvent,
  pageForRow,
} from "./filler-events.ts";
import { DUMP } from "@stl/wiki-dump";

function storedCopy(): string {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts"))
        parts.push(readFileSync(full, "utf8"));
    }
  };
  walk(root);
  return parts.join("\n");
}

function loadDump(): Map<string, string> {
  const pages = new Map<string, string>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as {
      title?: string;
      text?: string;
      ns?: number;
      redirect?: string;
    };
    // A redirect title reads as its target's page; count each page once, under its own title.
    if (row.ns === 0 && row.title && !row.redirect) pages.set(row.title, row.text ?? "");
  }
  return pages;
}

function fetchTemplate(t: string): string {
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line.includes(t)) continue;
    const row = JSON.parse(line) as { title?: string; text?: string };
    if (row.title === t) return row.text ?? "";
  }
  return "";
}

function locations(page: string): { sectors: string[]; params: Record<string, string> } {
  const m = page.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "page has a Locations line");
  const parts = m[1]
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  const params: Record<string, string> = {};
  for (const p of parts.filter((x) => x.includes("="))) params[p.split("=")[0]] = p.split("=")[1];
  return { sectors: parts.filter((p) => !p.includes("=")), params };
}

/** A fresh map dealt as `name`, as nextSector does (makeMap leaves no flags from an earlier deal). */
function dealt(seed: number, name: string): Game {
  const g = createGame(seed);
  for (const b of g.beacons) {
    if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
    b.flag = "";
    b.kind = "event";
  }
  g.beacons = [...g.beacons];
  g.sector = 4;
  g.sectorName = name;
  stampCitedEvents(g);
  return g;
}

const INVENTED = [
  "Deserter buoy",
  "Split wreck",
  "Mayday",
  "Dust well",
  "Fuel cache",
  "Rock field",
  "Deep cache",
];

describe("filler events (Sectors, Fallback events; EventList templates)", () => {
  const dump = loadDump();

  it("FILLER is every page with alsooccur=filler or exitandfiller, with its unique= flag", () => {
    const want: [string, boolean][] = [];
    for (const [title, text] of dump) {
      if (/^#REDIRECT/i.test(text) || !/\{\{Locations\|/.test(text)) continue;
      const { params } = locations(text);
      if (params.alsooccur === "filler" || params.alsooccur === "exitandfiller")
        want.push([title, params.unique === "true"]);
    }
    assert.deepEqual(FILLER.map((r) => [r.dest, r.unique]).sort(), want.sort());
  });

  it("the NEBULA, DISTRESS and ITEMS rows are their templates' rows", () => {
    const rows = (t: string) =>
      [
        ...(dump.get(t) ?? "").matchAll(
          /^\|'*\w+'*\|\|'*\[\[([^\]]+)\]\]'*\|\|[^|]*\|\|[^|]*\|\|(true|false)\|\|/gm,
        ),
      ].map((m) => [m[1], m[2] === "true"]);
    const fetch = (t: string) => {
      const raw = readFileSync(DUMP, "utf8");
      for (const line of raw.split("\n")) {
        if (!line.includes(t)) continue;
        const row = JSON.parse(line) as { title?: string; text?: string };
        if (row.title === t) return row.text ?? "";
      }
      return "";
    };
    const parse = (t: string) => {
      dump.set(t, fetch(t));
      return rows(t);
    };
    assert.deepEqual(
      NEBULA.map((r) => [r.dest, r.unique]),
      parse("Template:EventList NEBULA"),
    );
    // Rebel ship attacking Federation loyalists is on the distress template, and one choice is a free exit.
    // It is a neutral event, so distress slots do not draw it.
    const distress = parse("Template:EventList DISTRESS BEACON").filter(
      (row) => row[0] !== "Rebel ship attacking Federation loyalists",
    );
    assert.deepEqual(
      DISTRESS.map((r) => [r.dest, r.unique]),
      distress,
    );
    assert.deepEqual(
      ITEMS.map((r) => [r.dest, r.unique]),
      parse("Template:EventList ITEMS"),
    );
  });

  it("new cards follow the table format, name their page's sectors, and every choice has a handler", () => {
    for (const ev of FILLER_PAGES) {
      const slug = ev.dest
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      assert.equal(ev.slug, slug);
      assert.equal(ev.flag, `cited:${slug}`);
      assert.ok(ev.aliases.includes(ev.dest));
      assert.deepEqual(ev.sectors, locations(dump.get(ev.dest) ?? "").sectors, ev.dest);
      ev.choices.forEach((c, i) => {
        assert.equal(c.id, `c:${slug}:${i}`);
        const rolled = c.id === "c:friendly-ship-out-of-fuel:0";
        assert.ok(rolled || FILLER_CHOICES[c.id], c.id);
      });
    }
  });

  it("empty beacon pages: every sector type has one, and each text is on its page", () => {
    for (const name of Object.keys(SECTOR_MIX)) assert.ok(emptyPageFor(name), name);
    for (const p of EMPTY_PAGES) {
      const page = dump.get(p.dest) ?? "";
      assert.deepEqual(p.sectors, locations(page).sectors, p.dest);
      for (const t of p.texts) assert.ok(page.includes(t), `${p.dest}: ${t.slice(0, 30)}`);
      assert.ok(page.includes("Nothing happens."));
    }
  });

  it("deals no plain distress, items or nebula beacon, and no unique page twice", () => {
    const uniques = new Set(
      [...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS].filter((r) => r.unique).map((r) => r.dest),
    );
    for (const name of Object.keys(SECTOR_MIX)) {
      for (let seed = 1; seed <= 40; seed++) {
        const g = dealt(seed, name);
        for (const b of g.beacons) {
          if (b.kind === "distress" || b.kind === "cache" || b.kind === "nebula")
            assert.ok(b.flag, `${name} ${seed} ${b.kind}`);
          if (b.flag.startsWith(FILLER_FLAG))
            assert.ok(b.flag.slice(FILLER_FLAG.length).length > 0);
        }
        const names = g.beacons.filter((b) => b.flag && uniques.has(b.name)).map((b) => b.name);
        assert.equal(new Set(names).size, names.length, `${name} ${seed} ${names}`);
      }
    }
  });

  it("every list row a draw can reach has a card", () => {
    const wired = [...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS].filter((r) => pageForRow(r.dest));
    assert.ok(
      FILLER.every((r) => pageForRow(r.dest)),
      "every filler row is wired",
    );
    assert.ok(wired.length >= 50, `${wired.length}`);
  });

  it("plain beacons get documented cards whose choices all run (no invented filler)", () => {
    const valid = new Set(["map", "event", "combat", "reward", "defeat", "store"]);
    for (const name of Object.keys(SECTOR_MIX)) {
      for (let seed = 1; seed <= 12; seed++) {
        const g0 = dealt(seed, name);
        for (const b0 of g0.beacons) {
          if (!(
            b0.flag.startsWith(FILLER_FLAG) ||
            b0.kind === "empty" ||
            (b0.kind === "event" && !b0.flag)
          ))
            continue;
          for (let pick = 0; pick < 3; pick++) {
            const g = dealt(seed, name);
            const b = g.beacons.find((x) => x.id === b0.id)!;
            g.here = b.id;
            g.phase = "event";
            g.event = fillerEvent(g, b);
            assert.ok(g.event, `${name} ${b.flag}`);
            assert.ok(!INVENTED.includes(g.event.title), g.event.title);
            for (let depth = 0; depth < 5 && g.phase === "event" && g.event; depth++) {
              const cs = g.event.choices;
              choose(g, cs[Math.min(cs.length - 1, depth === 0 ? pick : 0)].id);
            }
            assert.ok(valid.has(g.phase), `${name} ${b.name} -> ${g.phase}`);
          }
        }
      }
    }
  });

  it("sim.ts no longer carries the invented filler events", () => {
    const src = readFileSync(new URL("../sim.ts", import.meta.url), "utf8");
    for (const t of INVENTED) assert.ok(!src.includes(`"${t}"`), t);
    for (const id of [
      "empty-take",
      "cache-take",
      "distress-help",
      "nebula-ping",
      "wreck-deep",
      "deserter-pay",
      "asteroid-skirt",
    ]) {
      assert.ok(!src.includes(`"${id}"`), id);
    }
  });

  it("the exit lists are Template:EventList OVERRIDE NEUTRAL EXIT and OVERRIDE ITEMS", () => {
    const rows = (t: string) =>
      [
        ...(dump.get(t) ?? fetchTemplate(t)).matchAll(
          /^\|'*\w+'*\|\|'*\[\[([^\]]+)\]\]'*\|\|[^|]*\|\|[^|]*\|\|(true|false)\|\|/gm,
        ),
      ].map((m) => [m[1], m[2] === "true"]);
    assert.deepEqual(
      EXIT_NEUTRAL.map((r) => [r.dest, r.unique]),
      rows("Template:EventList OVERRIDE NEUTRAL EXIT"),
    );
    assert.deepEqual(
      EXIT_ITEMS.map((r) => [r.dest, r.unique]),
      rows("Template:EventList OVERRIDE ITEMS"),
    );
    assert.equal(EXIT_NEUTRAL.length, 18);
    assert.equal(EXIT_ITEMS.length, 14);
  });

  it("an exit shows FINISH_BEACON, then Continue draws a neutral exit or an item event, then the lane", () => {
    const pages = new Set([...EXIT_NEUTRAL, ...EXIT_ITEMS].map((r) => r.dest));
    const halves = { neutral: 0, items: 0 };
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      g.sectorName = "Civilian Sector";
      const exit = g.beacons.find((b) => b.kind === "exit")!;
      const from = g.beacons.find((b) => b.id === g.here)!;
      if (!from.links.includes(exit.id)) from.links.push(exit.id);
      g.fuel = 5;
      commitJump(g, exit.id);
      assert.equal(g.phase, "event");
      assert.equal(
        g.event?.body,
        "You've arrived at the Long-Range Beacon. When the FTL Drive is charged you can jump to the next Sector.",
      );
      choose(g, "exit-continue");
      assert.ok(exit.flag.startsWith(FILLER_FLAG), `${seed}`);
      assert.ok(pages.has(exit.name), exit.name);
      if (EXIT_NEUTRAL.some((r) => r.dest === exit.name)) halves.neutral += 1;
      else halves.items += 1;
      if (seed > 3) continue;
      // Play the card out, then the lane card follows on the map.
      for (
        let depth = 0;
        depth < 6 && g.phase === "event" && g.event?.title !== "Exit beacon";
        depth++
      ) {
        const open = g.event!.choices.find((c) => !choiceDisabled(g, c.id)) ?? g.event!.choices[0];
        choose(g, open.id);
      }
      const phase = g.phase as Game["phase"];
      if (phase === "combat") continue;
      if (phase === "store" || phase === "reward") g.phase = "map";
      if ((g.phase as Game["phase"]) === "map") g.event = null;
      step(g, 0.05);
      assert.equal(g.event?.title, "Exit beacon");
      assert.equal(
        g.event?.body,
        "You've arrived at the Long-Range Beacon. When the FTL Drive is charged you can jump to the next Sector.",
      );
      assert.equal(g.event?.choices.find((c) => c.id === "exit-leave")?.label, "Continue...");
    }
    // An even split between the two halves.
    assert.ok(halves.neutral >= 10 && halves.items >= 10, JSON.stringify(halves));
  });

  it("a nebula sector's exit prints FINISH_BEACON_NEBULA and nothing happens", () => {
    const g = createGame(14);
    g.sectorName = "Uncharted Nebula";
    const exit = g.beacons.find((b) => b.kind === "exit")!;
    const from = g.beacons.find((b) => b.id === g.here)!;
    if (!from.links.includes(exit.id)) from.links.push(exit.id);
    g.fuel = 5;
    commitJump(g, exit.id);
    assert.equal(
      g.event?.body,
      "This Long-Range Beacon is almost hidden within a nebula. When the FTL Drive is charged you can jump to the next Sector.",
    );
    assert.deepEqual(
      g.event?.choices.map((c) => c.id),
      ["exit-leave"],
    );
    assert.equal(g.event?.choices[0]?.label, "Continue...");
    assert.equal(exit.flag, "");
  });

  it("an old picket flag starts the Rebel fight and does not print a hail", () => {
    const g = createGame(3);
    const exit = g.beacons.find((b) => b.kind === "exit")!;
    exit.flag = "picket";
    const from = g.beacons.find((b) => b.id === g.here)!;
    if (!from.links.includes(exit.id)) from.links.push(exit.id);
    g.fuel = 5;
    commitJump(g, exit.id);
    assert.equal(g.phase, "combat");
    assert.equal(g.pending, "exit-clear");
    assert.equal(g.event, null);
  });

  it("the invented exit sentences are not stored", () => {
    const stored = storedCopy();
    for (const t of [
      "The picket is scrap",
      "The exit buoy is green",
      "Take the lane",
      "Lane clear",
      "Lane out",
      "A picket sits on the only",
      "Push through",
      "Departure buoy",
      "The line starts over",
      "You hold. The line advances",
      "The buoy is quiet",
    ]) {
      assert.equal(stored.includes(t), false, t);
    }
  });

  it("the unused invented labels are not stored", () => {
    const stored = storedCopy();
    for (const t of [
      "leaves the hangar",
      "Not fitted:",
      "The Flagship jumps toward the Federation base.",
      "The boarders are dead.",
      "They charged FTL and left.",
      '"Departure"',
      '"Silt"',
      '"Wake"',
    ]) {
      assert.equal(stored.includes(t), false, t);
    }
  });
});
