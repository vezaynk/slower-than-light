import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DUMP } from "@stl/wiki-dump";
import { EXTRA_EVENTS } from "./cited-events-quests-b.ts";
import { classifyEvent } from "./sector-mix.ts";

function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("quests-b pages", () => {
  it("each page's sectors are its {{Locations}} line, and ids follow the table format", () => {
    // Wiki citations:
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Uncharted Nebula." — [[Asteroid belt distress]]
    // > "This random event occurs in Civilian Sector, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Capture the ship]]
    // > "This random event occurs in Abandoned Sector, Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Rebel Controlled Sector, Rebel Stronghold, Rock Controlled Sector, Rock Homeworlds, Zoltan Controlled Sector, Zoltan Homeworlds." — [[Encrypted federation signal]]
    // > "This random event occurs in Engi Controlled Sector, Engi Homeworlds." — [[Engi ship attacked by Mantis ship]]
    // > "This random event occurs in Civilian Sector, Engi Controlled Sector, Engi Homeworlds, Pirate Controlled Sector, Rebel Controlled Sector, Rebel Stronghold." — [[Merchant's request]]
    // > "This random event occurs in Slug Controlled Nebula, Uncharted Nebula." — [[Nebula wreckage]]
    const want = new Set(EXTRA_EVENTS.map((e) => e.dest));
    const pages = new Map<string, string>();
    for (const line of readFileSync(DUMP, "utf8").split("\n")) {
      if (!line) continue;
      const row = JSON.parse(line) as { title?: string; text?: string; ns?: number };
      if (row.ns === 0 && row.title && want.has(row.title)) pages.set(row.title, row.text ?? "");
    }
    assert.equal(pages.size, 6);
    for (const ev of EXTRA_EVENTS) {
      const m = pages.get(ev.dest)!.match(/\{\{Locations\|([^}]+)\}\}/)!;
      const names = m[1]
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s && !s.includes("="));
      assert.deepEqual(ev.sectors, names, ev.dest);
      assert.equal(ev.slug, slugOf(ev.dest));
      assert.equal(ev.flag, `cited:${ev.slug}`);
      ev.choices.forEach((c, i) => assert.equal(c.id, `c:${ev.slug}:${i}`));
    }
  });

  it("classifies as the event lists say (distress / neutral)", () => {
    const cls = Object.fromEntries(EXTRA_EVENTS.map((e) => [e.dest, classifyEvent(e)]));
    assert.equal(cls["Asteroid belt distress"], "distress");
    for (const d of [
      "Capture the ship",
      "Encrypted federation signal",
      "Merchant's request",
      "Engi ship attacked by Mantis ship",
      "Nebula wreckage",
    ]) {
      assert.equal(cls[d], "neutral", d);
    }
  });
});
