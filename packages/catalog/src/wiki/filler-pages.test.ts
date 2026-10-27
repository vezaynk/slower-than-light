import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { eventDef, fillerList } from "@stl/pack";
import { DUMP } from "@stl/wiki-dump";
import { loadCatalog } from "../pack/base.ts";
import { ftlEventId } from "./ftl-event-ids.ts";
import {
  DISTRESS,
  EMPTY_PAGES,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  ITEMS,
  NEBULA,
  fillerListRecords,
} from "./filler-lists.ts";
import { FILLER_PAGES } from "./filler-pages.ts";
import { packId } from "./ftl-slugs.ts";

loadCatalog();

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

describe("filler lists and opening cards", () => {
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
    const parse = (t: string) => {
      dump.set(t, fetchTemplate(t));
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

  it("opening cards follow the table format and name their page's sectors", () => {
    assert.equal(FILLER_PAGES.length, 26);
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
      });
    }
  });

  it("empty beacon pages quote their page, and each text is on it", () => {
    for (const p of EMPTY_PAGES) {
      const page = dump.get(p.dest) ?? "";
      assert.deepEqual(p.sectors, locations(page).sectors, p.dest);
      for (const t of p.texts) assert.ok(page.includes(t), `${p.dest}: ${t.slice(0, 30)}`);
      assert.ok(page.includes("Nothing happens."));
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

  it("packs every authored list and keeps the two shared opening cards off the sector page", () => {
    for (const list of fillerListRecords()) assert.deepEqual(fillerList(list.id), list);
    assert.equal(
      fillerList("FILLER")?.entries[0]?.id,
      ftlEventId(FILLER[0]?.dest ?? "") ?? FILLER[0]?.id,
    );
    assert.equal(fillerList("FILLER")?.entries.length, FILLER.length);
    assert.equal(fillerList("NEBULA")?.entries.length, NEBULA.length);
    assert.equal(fillerList("DISTRESS")?.entries.length, DISTRESS.length);
    assert.equal(fillerList("ITEMS")?.entries.length, ITEMS.length);
    assert.equal(fillerList("EXIT_NEUTRAL")?.entries.length, EXIT_NEUTRAL.length);
    assert.equal(fillerList("EXIT_ITEMS")?.entries.length, EXIT_ITEMS.length);
    assert.equal(
      fillerList("EXIT_ITEMS")?.entries.some((entry) => entry.id === "STORE_REBELSIDE"),
      true,
    );

    const shared = new Set(["refueling-station", "pirate-ship-distress-trap"]);
    let packed = 0;
    for (const page of FILLER_PAGES) {
      const record = eventDef(packId(page.slug));
      assert.ok(record, page.slug);
      const same =
        record.body === page.body &&
        record.choices.length === page.choices.length &&
        record.choices.every((choice, i) => choice.label === page.choices[i]?.label);
      if (shared.has(page.slug)) assert.equal(same, false, page.slug);
      else {
        assert.equal(same, true, page.slug);
        packed += 1;
      }
    }
    assert.equal(packed, 24);
  });
});
