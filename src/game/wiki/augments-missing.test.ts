import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MISSING_AUGMENTS } from "./augments-missing.ts";

const source = readFileSync(new URL("./augments-missing.ts", import.meta.url), "utf8");
const augmentsWiki = readFileSync("/tmp/wiki-pages/Augmentations.wikitext", "utf8");
const zoltanWiki = readFileSync("/tmp/wiki-pages/Zoltan_Shield.wikitext", "utf8");
const catalogSrc = readFileSync(new URL("../extras/augments.ts", import.meta.url), "utf8");

const EXPECTED: Record<string, string> = {
  vengeance: "Crystal Vengeance",
  stasis: "Damaged Stasis Pod",
  booster: "Drone Reactor Booster",
  medbot: "Engi Med-bot Dispersal",
  pheromone: "Mantis Pheromones",
  gel: "Slug Repair Gel",
  zshield: "Zoltan Shield",
};

function figures(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function hasFigure(text: string, figure: string): boolean {
  const escaped = figure.replace(".", "\\.");
  return new RegExp(`(?<![\\d.])${escaped}(?!\\d)`).test(text);
}

function commentFor(id: string): string {
  const at = source.indexOf(`id: "${id}"`);
  assert.ok(at >= 0, id);
  const before = source.slice(0, at);
  const start = before.lastIndexOf("/**");
  const end = before.lastIndexOf("*/");
  assert.ok(start >= 0 && end > start, id);
  return before.slice(start + 3, end);
}

function section(heading: string): string {
  const marker = `===${heading}===`;
  const at = augmentsWiki.indexOf(marker);
  assert.ok(at >= 0, heading);
  const rest = augmentsWiki.slice(at + marker.length);
  const next = rest.search(/\n==/);
  return next < 0 ? rest : rest.slice(0, next);
}

function sentenceCount(detail: string): number {
  const stripped = detail.replace(/\d+\.\d+/g, "N");
  return stripped.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}

describe("missing augments", () => {
  it("ids are unique and are the headings missing from the catalog", () => {
    const ids = MISSING_AUGMENTS.map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids.slice().sort(), Object.keys(EXPECTED).sort());
    const catalogBlock = catalogSrc.slice(
      catalogSrc.indexOf("export const CATALOG"),
      catalogSrc.indexOf("function copies"),
    );
    const catalogNames = [...catalogBlock.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
    for (const row of MISSING_AUGMENTS) {
      assert.equal(row.name, EXPECTED[row.id]);
      assert.equal(catalogNames.includes(row.name), false);
    }
  });

  it("cost is null or a positive purchase price cited in the comment", () => {
    const nonAt = augmentsWiki.indexOf("==Non-Purchasable Augmentations==");
    assert.ok(nonAt > 0);
    for (const row of MISSING_AUGMENTS) {
      const body = section(row.name);
      const comment = commentFor(row.id);
      const price = body.match(/Purchase price:\s*(\d+)/);
      const headAt = augmentsWiki.indexOf(`===${row.name}===`);
      assert.equal(headAt < nonAt, price !== null);
      assert.equal(row.purchasable, price !== null);
      assert.equal(sentenceCount(row.detail), 1);
      if (price === null) {
        assert.equal(row.cost, null);
        assert.match(comment, /Augmentations/);
        assert.match(comment, /No purchase price|no purchase price/);
      } else {
        const cost = Number(price[1]);
        assert.ok(cost > 0);
        assert.equal(row.cost, cost);
        assert.ok(hasFigure(comment, String(row.cost)));
        assert.match(comment, /Augmentations/);
        assert.match(comment, new RegExp(row.name.replace(".", "\\.")));
      }
      for (const figure of figures(row.detail)) {
        assert.ok(hasFigure(comment, figure), `${row.id} comment missing ${figure}`);
        assert.ok(hasFigure(body, figure), `${row.id} section missing ${figure}`);
      }
    }
  });

  it("zshield detail figures are the Zoltan Shield bubble numbers", () => {
    const row = MISSING_AUGMENTS.find((item) => item.id === "zshield");
    assert.ok(row);
    const comment = commentFor("zshield");
    const found = figures(row.detail);
    assert.deepEqual(found, ["5"]);
    for (const figure of found) {
      assert.ok(hasFigure(zoltanWiki, figure), `${figure} not on Zoltan Shield`);
      assert.ok(hasFigure(comment, figure));
    }
    assert.match(comment, /Augmentations/);
    assert.match(comment, /Zoltan Shield/);
    assert.match(row.detail, /5 points/);
    assert.match(row.detail, /completely recharged on an FTL jump/);
    assert.match(row.detail, /initial boarding party/);
    assert.match(row.detail, /mind control/);
    assert.equal(hasFigure(row.detail, "2"), false);
    assert.equal(hasFigure(row.detail, "12"), false);
    assert.equal(hasFigure(row.detail, "40"), false);
  });
});
