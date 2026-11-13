import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allEvents } from "@stl/pack";
import { loadCatalog } from "../pack/base.ts";
import { SECTOR_MIX, classifyEvent, type MixEvent } from "./sector-mix.ts";

loadCatalog();

function byDest(dest: string): MixEvent {
  const ev = allEvents().find((row) => row.dest === dest);
  if (!ev) throw new Error(dest);
  return {
    dest: ev.dest,
    flag: ev.flag,
    aliases: [...ev.aliases],
    choices: ev.choices.map((choice) => ({
      fx: choice.fx.map((fx) => {
        const raw = fx as { k: string; sign?: number; n?: number };
        if (raw.k === "res") return { k: raw.k, sign: raw.sign };
        if (raw.k === "hull") return { k: raw.k, n: raw.n };
        return { k: raw.k };
      }),
    })),
  };
}

describe("sector mix", () => {
  it("lists every sector type the Sectors page gives beacon counts for", () => {
    assert.equal(Object.keys(SECTOR_MIX).length, 19);
    const civ = SECTOR_MIX["CIVILIAN_SECTOR"].find((l) => l.slot === "hostile");
    assert.deepEqual([civ?.lo, civ?.hi, civ?.quote], [6, 8, "6-8 hostile encounters"]);
    const neb = SECTOR_MIX["SLUG_SECTOR"].find((l) => l.slot === "nebula-hostile");
    assert.deepEqual([neb?.lo, neb?.hi], [5, 7]);
    const start = SECTOR_MIX["STANDARD_SPACE"].filter((l) => l.slot === "hostile");
    assert.deepEqual(
      start.map((l) => [l.lo, l.hi]),
      [
        [4, 6],
        [2, 2],
      ],
    );
  });

  it("classifies from the event lists first, then from the page's own choices", () => {
    assert.equal(classifyEvent(byDest("Pirate toll")), "hostile");
    assert.equal(classifyEvent(byDest("Auto-ship attacking civilian")), "hostile");
    assert.equal(classifyEvent(byDest("Auto-ship near storage station")), "neutral");
    assert.equal(classifyEvent(byDest("Pirate ship distress trap")), "distress");
    assert.equal(classifyEvent(byDest("Free weapon")), "items");
    assert.equal(classifyEvent(byDest("Zoltan fight")), "hostile");
    assert.equal(classifyEvent(byDest("Deactivated Auto-ship")), "neutral");
    assert.equal(classifyEvent(byDest("Rebel ship attacking Federation loyalists")), "neutral");
  });
});
