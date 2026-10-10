import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS, type CitedFx } from "./cited-events-zoltan.ts";
import { DUMP } from "./dump/index.ts";

const TITLES = [
  "Boarders: Humans jammed sensors",
  "Empty beacon (Zoltan)",
  "Engi fight",
  "Free scrap with resources (Zoltan)",
  "Mantis fight (Zoltan)",
  "Pirate fight (Zoltan)",
  "Pirate ships in plasma storm",
  "Refugee (Zoltan)",
  "Refugee distress (Zoltan)",
  "Rock fight in nebula",
  "Store (Zoltan)",
  "Unarmed Zoltan transport",
  "Zoltan Great Eye",
  "Zoltan border police",
  "Zoltan fight",
  "Zoltan fight in asteroid field",
  "Zoltan free augment",
  "Zoltan free map",
  "Zoltan quest primitives",
  "Zoltan security checkpoint",
  "Zoltan ship asks to dock",
  "Zoltan ship follows Mantis ship",
  "Zoltan trade hub",
];


function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function locationNames(wikitext: string): string[] {
  const match = wikitext.match(/\{\{Locations\|([^}]+)\}\}/);
  assert.ok(match, "Locations line");
  return match[1]
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

function pages(): Map<string, string> {
  const want = new Set(TITLES);
  const found = new Map<string, string>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (row.ns !== 0 || !row.title || !want.has(row.title)) continue;
    const text = row.text ?? "";
    const prev = found.get(row.title);
    if (!prev || text.length > prev.length) found.set(row.title, text);
  }
  return found;
}

function fxNumbers(fx: CitedFx): number[] {
  if (fx.k === "res") return [fx.lo, fx.hi];
  if (fx.k === "hull" || fx.k === "fleet") return [fx.n];
  return [];
}

function choiceSlice(src: string, id: string): string {
  const at = src.indexOf(`id: "${id}"`);
  assert.ok(at >= 0, id);
  const next = src.indexOf("\n      {", at + 10);
  const end = src.indexOf("\n    ],", at);
  const stop = next !== -1 && next < (end === -1 ? src.length : end) ? next : end;
  return src.slice(at, stop === -1 ? src.length : stop);
}

function hasNumber(comment: string, n: number): boolean {
  return new RegExp(`(?<![\\d.])${n}(?![\\d.])`).test(comment);
}

describe("cited zoltan events", () => {
  const wiki = pages();

  it("exports only these titles, with Locations sectors and commented numbers", () => {
    assert.equal(wiki.size, TITLES.length);
    const seen = new Set<string>();
    const src = readFileSync(new URL("./cited-events-zoltan.ts", import.meta.url), "utf8");
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest), ev.dest);
      assert.equal(seen.has(ev.dest), false, ev.dest);
      seen.add(ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.aliases.includes(ev.dest));
      // The printed Zoltan asteroid intro is 260 characters.
      // The printed Great Eye opening is 302 characters.
      // Zoltan quest primitives opening is both printed sentences, 365 characters.
      assert.ok(ev.body.length <= 370);
      assert.ok(ev.choices.length >= 1);
      const text = wiki.get(ev.dest);
      assert.ok(text, ev.dest);
      const names = locationNames(text);
      assert.deepEqual(ev.sectors, names);
      for (const sector of ev.sectors) assert.ok(names.includes(sector), sector);
      const plain = normalizeWiki(text);
      // A two-sentence opening is joined with a blank line. The wiki puts a list mark between them.
      for (const part of ev.body.split("\n\n")) {
        if (part) assert.ok(plain.includes(part), part);
      }
      ev.choices.forEach((choice, index) => {
        assert.equal(choice.id, `c:${ev.slug}:${index}`);
        assert.ok(choice.fx.length >= 1);
        const slice = choiceSlice(src, choice.id);
        const comments = [...slice.matchAll(/\/\/(.*)/g)].map((m) => m[1] ?? "").join("\n");
        assert.ok(comments.length > 0, choice.id);
        for (const quoted of comments.matchAll(/"([^"]*)"/g)) {
          const sentence = quoted[1] ?? "";
          assert.ok(sentence.length > 0);
          assert.ok(plain.includes(sentence), `${ev.dest}: ${sentence}`);
        }
        for (const fx of choice.fx) {
          for (const n of fxNumbers(fx)) {
            assert.ok(hasNumber(comments, n), `${ev.dest} ${n}`);
          }
          if (fx.k === "fight") {
            assert.ok(comments.includes(fx.tier), `${ev.dest} ${fx.tier}`);
            assert.ok(text.includes(fx.tier), fx.tier);
            if (fx.asteroid) assert.ok(comments.includes("asteroidfield=true"), ev.dest);
            else assert.equal(comments.includes("asteroidfield=true"), false, ev.dest);
          }
        }
      });
    }
  });
});
