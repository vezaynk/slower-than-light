import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-events-crystal.ts";
import { DUMP } from "./dump/index.ts";

const TITLES = [
  "Boarders: Crystal",
  "Crystal chat",
  "Crystal fight",
  "Crystal fight choice",
  "Crystal scrap collector",
  "Crystalline cache",
  "Crystalline men buried",
  "Crystalline research facility",
  "Empty beacon (Crystal)",
  "Pirate ship attacking Crystal",
  "Rebel fight (Crystal)",
  "Store (Crystal)",
];


function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function pages(): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line) continue;
    const o = JSON.parse(line) as { title?: string; ns?: number; text?: string };
    if (o.ns === 0 && o.title && TITLES.includes(o.title)) out.set(o.title, o.text ?? "");
  }
  return out;
}

function locationNames(text: string): string[] {
  const line = text.split("\n").find((l) => l.startsWith("{{Locations|"));
  assert.ok(line, "missing Locations");
  return line
    .replace(/^\{\{Locations\|/, "")
    .replace(/\}\}$/, "")
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !p.includes("="));
}

function ints(s: string): number[] {
  return [...s.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

describe("cited crystal events", () => {
  const wiki = pages();

  it("exports only these titles and every Locations name", () => {
    assert.equal(wiki.size, TITLES.length);
    const dests = EXTRA_EVENTS.map((e) => e.dest);
    assert.deepEqual(dests, [
      "Crystal fight",
      "Crystal fight choice",
      "Pirate ship attacking Crystal",
      "Rebel fight (Crystal)",
      "Boarders: Crystal",
    ]);
    for (const ev of EXTRA_EVENTS) {
      assert.ok(TITLES.includes(ev.dest));
      assert.equal(ev.slug, slug(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.deepEqual(ev.sectors, locationNames(wiki.get(ev.dest) ?? ""));
      ev.choices.forEach((c, i) => {
        assert.equal(c.id, `c:${ev.slug}:${i}`);
        assert.ok(c.fx.length > 0);
      });
      const stated = ev.choices.some((c) =>
        c.fx.some((fx) => fx.k === "res" || fx.k === "tier" || fx.k === "hull" || fx.k === "fleet" || fx.k === "fight"),
      );
      // Boarders: Crystal states the boarder line and no resource or fight.
      assert.equal(stated || ev.dest === "Boarders: Crystal", true);
    }
  });

  it("matches every stated number to the wiki sentence in the comment above it", () => {
    const src = readFileSync(new URL("./cited-events-crystal.ts", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export const EXTRA_EVENTS"));
    for (const ev of EXTRA_EVENTS) {
      const start = body.indexOf(`dest: "${ev.dest}"`);
      assert.ok(start >= 0);
      const next = EXTRA_EVENTS[EXTRA_EVENTS.indexOf(ev) + 1];
      const end = next ? body.indexOf(`dest: "${next.dest}"`) : body.length;
      const slice = body.slice(start, end);
      const page = wiki.get(ev.dest) ?? "";
      const lines = slice.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const comment = lines[i].match(/^\s*\/\/\s?(.*)$/);
        if (!comment) continue;
        assert.ok(page.includes(comment[1]), comment[1]);
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        assert.ok(lines[j].includes("{"));
        let depth = 0;
        const fx: string[] = [];
        for (; j < lines.length; j++) {
          fx.push(lines[j]);
          for (const ch of lines[j]) {
            if (ch === "{") depth++;
            else if (ch === "}") depth--;
          }
          if (depth === 0) break;
        }
        const fxText = fx.join("\n");
        const fromFx = [...fxText.matchAll(/\b(?:lo|hi|n)\s*:\s*(-?\d+)/g)].map((m) => Number(m[1]));
        assert.deepEqual(fromFx.sort((a, b) => a - b), ints(comment[1]).sort((a, b) => a - b));
      }
    }
  });
});
