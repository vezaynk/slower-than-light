import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DUMP } from "@stl/wiki-dump";
import { EXTRA_EVENTS } from "./cited-events-surrender.ts";
import { SCRIPTED_SURRENDERS } from "./surrender-offers.ts";

function pageText(title: string): string | null {
  if (!existsSync(DUMP)) return null;
  for (const line of readFileSync(DUMP, "utf8").split("\n")) {
    if (!line.includes(`"title": "${title}"`)) continue;
    const o = JSON.parse(line) as { title: string; ns: number; text?: string };
    if (o.ns === 0 && o.title === title) return o.text ?? "";
  }
  return null;
}

describe("ship surrender pages", () => {
  it("takes sectors from {{Locations}} and the body from the page text", () => {
    // Wiki citations:
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi surrender]]
    // > "It is unique." — [[Engi surrender]]
    // > "This random event occurs in Pirate Controlled Sector." — [[Destroyed cargo ship]]
    // > "It is unique." — [[Destroyed cargo ship]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rock Controlled Sector, Rock Homeworlds." — [[Settlement mercenary work]]
    // > "It is unique." — [[Settlement mercenary work]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[The Black Raven]]
    // > "It is unique." — [[The Black Raven]]
    // > "This random event occurs in Zoltan Controlled Sector, Zoltan Homeworlds." — [[Zoltan ship asks to dock]]
    // > "It is unique." — [[Zoltan ship asks to dock]]
    // > "This random event occurs in Slug Controlled Nebula, Slug Home Nebula." — [[Slug comm tapping]]
    // > "It is unique." — [[Slug comm tapping]]
    // > "This random event occurs in Engi Homeworlds." — [[Engi fleet discussion]]
    // > "It is unique." — [[Engi fleet discussion]]
    for (const ev of EXTRA_EVENTS) {
      const text = pageText(ev.dest);
      if (text == null) continue;
      const m = text.match(/\{\{Locations\|([^}]+)\}\}/);
      assert.ok(m, ev.dest);
      const names = m[1]
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s && !s.includes("="));
      assert.deepEqual(ev.sectors, names, ev.dest);
      const plain = text.replace(/''/g, "").replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
      assert.ok(plain.includes(ev.body), ev.dest);
      for (const c of ev.choices) assert.ok(plain.includes(c.label.replace(/\.$/, "")), c.label);
    }
  });

  it("gives every page fight a scripted surrender row", () => {
    // @agent:quests. Slug comm tapping and Engi fleet discussion open quest markers; their fights are
    // the "quest-*" surrender rows, not a row under the page slug.
    const questPages = new Set(["slug-comm-tapping", "engi-fleet-discussion"]);
    for (const ev of EXTRA_EVENTS) {
      if (ev.slug !== "engi-surrender" && !questPages.has(ev.slug))
        assert.ok(SCRIPTED_SURRENDERS[ev.slug], ev.slug);
    }
    assert.ok(
      SCRIPTED_SURRENDERS["quest-slug-pirate-trap-engage"] &&
        SCRIPTED_SURRENDERS["quest-engi-real"] &&
        SCRIPTED_SURRENDERS["quest-engi-fake"],
    );
  });
});
