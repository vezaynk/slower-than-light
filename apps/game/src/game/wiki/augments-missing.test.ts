import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "../pack/base.ts";
import { allAugments } from "@stl/pack";
import { MISSING_AUGMENTS } from "./augments-missing.ts";
import { wikiPage } from "@stl/wiki-dump";

const augmentsWiki = wikiPage("Augmentations");
const zoltanWiki = wikiPage("Zoltan Shield");

const EXPECTED: Record<string, string> = {
  CRYSTAL_SHARDS: "Crystal Vengeance",
  STASIS_POD: "Damaged Stasis Pod",
  DRONE_SPEED: "Drone Reactor Booster",
  NANO_MEDBAY: "Engi Med-bot Dispersal",
  CREW_STIMS: "Mantis Pheromones",
  SLUG_GEL: "Slug Repair Gel",
  ENERGY_SHIELD: "Zoltan Shield",
};

function figures(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function hasFigure(text: string, figure: string): boolean {
  const escaped = figure.replace(".", "\\.");
  return new RegExp(`(?<![\\d.])${escaped}(?!\\d)`).test(text);
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
    const catalogNames = allAugments().map((row) => row.name);
    for (const row of MISSING_AUGMENTS) {
      assert.equal(row.name, EXPECTED[row.id]);
      assert.equal(catalogNames.includes(row.name), false);
    }
  });

  it("cost is null or the positive purchase price on the page", () => {
    const nonAt = augmentsWiki.indexOf("==Non-Purchasable Augmentations==");
    assert.ok(nonAt > 0);
    for (const row of MISSING_AUGMENTS) {
      const body = section(row.name);
      const price = body.match(/Purchase price:\s*(\d+)/);
      const headAt = augmentsWiki.indexOf(`===${row.name}===`);
      assert.equal(headAt < nonAt, price !== null);
      assert.equal(row.purchasable, price !== null);
      assert.equal(sentenceCount(row.detail), 1);
      if (price === null) {
        assert.equal(row.cost, null);
      } else {
        const cost = Number(price[1]);
        assert.ok(cost > 0);
        assert.equal(row.cost, cost);
      }
      for (const figure of figures(row.detail)) {
        assert.ok(hasFigure(body, figure), `${row.id} section missing ${figure}`);
      }
    }
  });

  it("zshield detail figures are the Zoltan Shield bubble numbers", () => {
    const row = MISSING_AUGMENTS.find((item) => item.id === "ENERGY_SHIELD");
    assert.ok(row);
    const found = figures(row.detail);
    assert.deepEqual(found, ["5"]);
    for (const figure of found) {
      assert.ok(hasFigure(zoltanWiki, figure), `${figure} not on Zoltan Shield`);
    }
    assert.match(row.detail, /5 points/);
    assert.match(row.detail, /completely recharged on an FTL jump/);
    assert.match(row.detail, /initial boarding party/);
    assert.match(row.detail, /mind control/);
    assert.equal(hasFigure(row.detail, "2"), false);
    assert.equal(hasFigure(row.detail, "12"), false);
    assert.equal(hasFigure(row.detail, "40"), false);
  });
});
