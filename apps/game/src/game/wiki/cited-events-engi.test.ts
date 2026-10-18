import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-engi.ts";
import { DUMP } from "@stl/wiki-dump";

const TITLES = [
  "Battlefield wreckage",
  "Confused Mantis",
  "Empty beacon (Engi)",
  "Engi fleet discussion",
  "Engi research station",
  "Engi ship attacked by Mantis ship",
  "Engi surrender",
  "Mantis fight (Engi)",
  "Mantis fight choice",
  "Mantis fugitive",
  "Mantis ship attacking civilian",
  "Pirate fight (Engi)",
  "Rebel fight (Engi)",
  "Store (Engi)",
  "Zoltan research facility",
] as const;

const SHIPS = new Set([
  "Auto-ship",
  "Pirate ship",
  "Rebel ship",
  "Rock ship",
  "Mantis ship",
  "Slug ship",
  "Zoltan ship",
  "Lanius ship",
  "Engi ship",
  "Crystal ship",
]);

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function locationNames(text: string): string[] {
  const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(m, "Locations template");
  return m[1]
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("="));
}

function normalizeWiki(text: string): string {
  return text
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/<ref\b[\s\S]*?<\/ref>/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'''|''/g, "")
    .replace(/<[^>]+>/g, "");
}

function loadPages(titles: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line.includes('"ns": 0') && !line.includes('"ns":0')) continue;
    const o = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (o.ns !== 0 || !o.title || !titles.has(o.title)) continue;
    const text = o.text ?? "";
    const prev = out.get(o.title);
    if (!prev || text.length > prev.length) out.set(o.title, text);
  }
  return out;
}

function uniq(ns: number[]): number[] {
  return [...new Set(ns)].sort((a, b) => a - b);
}

function fxNumbers(fx: CitedFx[]): number[] {
  const out: number[] = [];
  for (const step of fx) {
    if (step.k === "res") out.push(step.lo, step.hi);
    else if (step.k === "hull" || step.k === "fleet") out.push(step.n);
  }
  return uniq(out);
}

describe("cited Engi leftover events", () => {
  const pages = loadPages(new Set(TITLES));

  it("exports only these titles, with sectors and numbers taken from the page", () => {
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Mantis fight (Engi)]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fight choice]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis ship attacking civilian]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Pirate fight (Engi)]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Rebel fight (Engi)]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Confused Mantis]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds, Mantis Controlled Sector, Mantis Homeworlds." — [[Mantis fugitive]]
    assert.deepEqual(
      EXTRA_EVENTS.map((ev) => ev.dest),
      [
        "Mantis fight (Engi)",
        "Mantis fight choice",
        "Mantis ship attacking civilian",
        "Pirate fight (Engi)",
        "Rebel fight (Engi)",
        "Confused Mantis",
        "Mantis fugitive",
      ],
    );
    for (const ev of EXTRA_EVENTS) {
      assert.ok((TITLES as readonly string[]).includes(ev.dest));
      const page = pages.get(ev.dest);
      assert.ok(page, ev.dest);
      const names = locationNames(page);
      assert.deepEqual(ev.sectors, names);
      for (const sector of ev.sectors) assert.ok(names.includes(sector), sector);
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.aliases.includes(ev.dest));
      assert.ok(ev.body.length <= 240);
      const plain = normalizeWiki(page);
      if (ev.body) assert.ok(plain.includes(ev.body), ev.body);
      assert.ok(ev.choices.length >= 1);
      ev.choices.forEach((choice, i) => {
        assert.equal(choice.id, `c:${ev.slug}:${i}`);
        assert.equal(choice.fx.length, 1);
        for (const n of fxNumbers(choice.fx)) {
          assert.ok(new RegExp(`(?<!\\d)${n}(?!\\d)`).test(page), `${ev.dest} ${n}`);
        }
        const step = choice.fx[0];
        if (step.k === "fight") {
          assert.ok(SHIPS.has(step.tier), step.tier);
          assert.ok(page.toLowerCase().includes(step.tier.toLowerCase()));
        }
      });
      if (ev.dest !== "Confused Mantis")
        assert.ok(ev.choices.some((choice) => choice.fx.some((step) => step.k === "fight")));
    }
  });
});
