import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { onPackWarning } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { freshGame, installArchive } from "./archive-play.ts";
import { choose } from "./sim.ts";
import { citedEvent } from "./wiki/cited-events.ts";

const dat = process.env.FTL_DAT?.trim();

describe("ftl.dat's trader", { skip: dat ? false : "FTL_DAT is unset", timeout: 120_000 }, () => {
  after(async () => {
    await installStandIn();
  });

  it("plays TRADER_CIV as written: Trade. swaps stock off TRADER_LIST, with no warning", async () => {
    await installArchive(new Uint8Array(readFileSync(dat!)));
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const g = freshGame();
      const beacon = g.beacons.find((row) => row.id === g.here)!;
      const ev = citedEvent(g, { ...beacon, flag: "TRADER_CIV", name: "TRADER_CIV" });
      assert.ok(ev);
      assert.deepEqual(
        ev.choices.map((choice) => choice.label),
        ["Trade.", "Ignore."],
      );
      g.event = ev;
      g.phase = "event";
      const before = g.fuel;
      choose(g, ev.choices[0]!.id);
      // Every TRADER_LIST row gives fuel for missiles or drone parts.
      assert.ok(g.fuel > before, `fuel ${before} -> ${g.fuel}`);
      assert.deepEqual(
        warnings.filter((message) => message.includes("TRADER_CIV")),
        [],
      );
    } finally {
      restore();
    }
  });
});
