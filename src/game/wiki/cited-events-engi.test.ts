import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-engi.ts";

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

const DUMP = "/Users/slava/code/ftl.fandom.com-dump/pages.jsonl";

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

function commentNumbers(sentence: string): number[] {
  return uniq([...sentence.matchAll(/\d+/g)].map((m) => Number(m[0])));
}

function fxNumbers(fx: CitedFx[]): number[] {
  const out: number[] = [];
  for (const step of fx) {
    if (step.k === "res") out.push(step.lo, step.hi);
    else if (step.k === "hull" || step.k === "fleet") out.push(step.n);
  }
  return uniq(out);
}

function choiceNotes(src: string): Map<string, string> {
  const notes = new Map<string, string>();
  const re = /id:\s*"(c:[^"]+)"[\s\S]*?\/\/ "([^"]*)"\s*fx:/g;
  for (const m of src.matchAll(re)) notes.set(m[1], m[2]);
  return notes;
}

describe("cited Engi leftover events", () => {
  const pages = loadPages(new Set(TITLES));
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "cited-events-engi.ts"), "utf8");
  const notes = choiceNotes(src);

  it("exports only these titles, with sectors and numbers taken from the page", () => {
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
        const sentence = notes.get(choice.id);
        assert.ok(sentence, choice.id);
        assert.ok(plain.includes(sentence), sentence);
        assert.deepEqual(commentNumbers(sentence), fxNumbers(choice.fx));
        const step = choice.fx[0];
        if (step.k === "fight") {
          assert.ok(SHIPS.has(step.tier), step.tier);
          assert.ok(sentence.toLowerCase().includes(step.tier.toLowerCase()));
        }
      });
      if (ev.dest !== "Confused Mantis") assert.ok(ev.choices.some((choice) => choice.fx.some((step) => step.k === "fight")));
    }
  });
});
