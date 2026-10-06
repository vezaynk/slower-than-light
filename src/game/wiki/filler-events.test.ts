import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { SECTOR_MIX } from "./beacon-mix.ts";
import { stampCitedEvents } from "./cited-events.ts";
import {
  DISTRESS,
  EMPTY_PAGES,
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

function loadDump(): Map<string, string> {
  const pages = new Map<string, string>();
  for (const line of readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8").split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
    if (row.ns === 0 && row.title) pages.set(row.title, row.text ?? "");
  }
  return pages;
}

function locations(page: string): { sectors: string[]; params: Record<string, string> } {
  const m = page.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "page has a Locations line");
  const parts = m[1].split("|").map((p) => p.trim()).filter(Boolean);
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

const INVENTED = ["Deserter buoy", "Split wreck", "Mayday", "Dust well", "Fuel cache", "Rock field", "Deep cache"];

describe("filler events (Sectors, Fallback events; EventList templates)", () => {
  const dump = loadDump();

  it("FILLER is every page with alsooccur=filler or exitandfiller, with its unique= flag", () => {
    const want: [string, boolean][] = [];
    for (const [title, text] of dump) {
      if (/^#REDIRECT/i.test(text) || !/\{\{Locations\|/.test(text)) continue;
      const { params } = locations(text);
      if (params.alsooccur === "filler" || params.alsooccur === "exitandfiller") want.push([title, params.unique === "true"]);
    }
    assert.deepEqual(
      FILLER.map((r) => [r.dest, r.unique]).sort(),
      want.sort(),
    );
  });

  it("the NEBULA, DISTRESS and ITEMS rows are their templates' rows", () => {
    const rows = (t: string) =>
      [...(dump.get(t) ?? "").matchAll(/^\|'*\w+'*\|\|'*\[\[([^\]]+)\]\]'*\|\|[^|]*\|\|[^|]*\|\|(true|false)\|\|/gm)].map((m) => [m[1], m[2] === "true"]);
    const fetch = (t: string) => {
      const raw = readFileSync("/Users/slava/code/ftl.fandom.com-dump/pages.jsonl", "utf8");
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
    assert.deepEqual(NEBULA.map((r) => [r.dest, r.unique]), parse("Template:EventList NEBULA"));
    assert.deepEqual(DISTRESS.map((r) => [r.dest, r.unique]), parse("Template:EventList DISTRESS BEACON"));
    assert.deepEqual(ITEMS.map((r) => [r.dest, r.unique]), parse("Template:EventList ITEMS"));
  });

  it("new cards follow the table format, name their page's sectors, and every choice has a handler", () => {
    for (const ev of FILLER_PAGES) {
      const slug = ev.dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    const uniques = new Set([...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS].filter((r) => r.unique).map((r) => r.dest));
    for (const name of Object.keys(SECTOR_MIX)) {
      for (let seed = 1; seed <= 40; seed++) {
        const g = dealt(seed, name);
        for (const b of g.beacons) {
          if (b.kind === "distress" || b.kind === "cache" || b.kind === "nebula") assert.ok(b.flag, `${name} ${seed} ${b.kind}`);
          if (b.flag.startsWith(FILLER_FLAG)) assert.ok(b.flag.slice(FILLER_FLAG.length).length > 0);
        }
        const names = g.beacons.filter((b) => b.flag && uniques.has(b.name)).map((b) => b.name);
        assert.equal(new Set(names).size, names.length, `${name} ${seed} ${names}`);
      }
    }
  });

  it("every list row a draw can reach has a card", () => {
    const wired = [...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS].filter((r) => pageForRow(r.dest));
    assert.ok(FILLER.every((r) => pageForRow(r.dest)), "every filler row is wired");
    assert.ok(wired.length >= 50, `${wired.length}`);
  });

  it("plain beacons get documented cards whose choices all run (no invented filler)", () => {
    const valid = new Set(["map", "event", "combat", "reward", "defeat", "store"]);
    for (const name of Object.keys(SECTOR_MIX)) {
      for (let seed = 1; seed <= 12; seed++) {
        const g0 = dealt(seed, name);
        for (const b0 of g0.beacons) {
          if (!(b0.flag.startsWith(FILLER_FLAG) || b0.kind === "empty" || (b0.kind === "event" && !b0.flag))) continue;
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
    for (const id of ["empty-take", "cache-take", "distress-help", "nebula-ping", "wreck-deep", "deserter-pay", "asteroid-skirt"]) {
      assert.ok(!src.includes(`"${id}"`), id);
    }
  });
});
