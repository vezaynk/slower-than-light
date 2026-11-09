import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { allFillerLists, eventDef } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { archiveCases, installArchive } from "./archive-play.ts";
import { playSide, type EventDiffCase } from "./event-diff.ts";

/**
 * Events that used to be code pages (wiki/README.md, "How to migrate an event module") and now play only from the
 * archive. Each row plays on the stand-in and, when FTL_DAT is set, on ftl.dat, through the same checker.
 */
for (const archive of archiveCases()) {
  describe(`archive events on ${archive.name}`, { timeout: archive.timeout ?? 60_000 }, () => {
    after(async () => {
      await installStandIn();
    });

    it("plays ENGI_FLEET_DELAY (Engi cache) from the archive, with no pack warning", async () => {
      await installArchive(archive.bytes);
      assert.ok(eventDef("ENGI_FLEET_DELAY"), "the archive carries the page");
      const lists = allFillerLists().filter((list) =>
        list.entries.some((entry) => entry.id === "ENGI_FLEET_DELAY"),
      );
      // An item list, as ftl.dat's ITEMS_ENGI. The stand-in names its lists <SECTOR>__items__<n>.
      const ids = lists.map((list) => list.id);
      assert.ok(ids.length > 0, "an event list deals it");
      for (const id of ids) assert.match(id, /ITEMS|__items__/, id);
      const c: EventDiffCase = {
        sector: "ENGI_SECTOR",
        old: { flag: "ENGI_FLEET_DELAY" },
        archive: { flag: "ENGI_FLEET_DELAY" },
        seeds: [1, 2, 3],
      };
      for (const seed of c.seeds) {
        const snap = playSide(c, seed, c.archive);
        assert.deepEqual(snap.warnings, []);
        assert.match(snap.body, /Engi colony hiding/);
        assert.equal(snap.labels.length, 2);
        // Booby trap: 2 missiles, the fleet 2 turns back.
        assert.equal(snap.outcomes[0]?.missiles, "-2");
        assert.equal(snap.outcomes[0]?.fleet, "-2");
        // Secure: MED drone autoReward, scrap and one schematic.
        assert.ok(Number(snap.outcomes[1]?.scrap) > 0, JSON.stringify(snap.outcomes[1]));
        assert.equal(snap.outcomes[1]?.gained, "drone");
        assert.match(snap.outcomes[1]?.cards ?? "", /Scrap: \d+\./);
      }
      const poor = playSide(
        { ...c, setup: (g) => ((g.sector = 3), (g.missiles = 1)) },
        1,
        c.archive,
      );
      assert.ok(poor.locks[0], "the trap is locked below 2 missiles");
    });

    it("deals an out-of-fuel wait from NO_FUEL or NO_FUEL_DISTRESS", async () => {
      await installArchive(archive.bytes);
      const off = allFillerLists().find((list) => list.id === "NO_FUEL");
      const on = allFillerLists().find((list) => list.id === "NO_FUEL_DISTRESS");
      assert.ok(off && on);
      const ids = (list: { entries: { id: string }[] }) => list.entries.map((entry) => entry.id);
      assert.deepEqual(ids(off), [
        "FUEL_FLEET_DELAY",
        "FUEL_NOTHING",
        "FUEL_NOTHING",
        "FUEL_NOTHING",
        "FUEL_NOTHING",
        "FUEL_TRADER",
        "FUEL_EXPLORE",
        "FUEL_APPROACH",
        "FUEL_OFF_ENGI_DUBIOUS",
        "FUEL_OFF_ROCK_WRECK",
        "NO_FUEL_REFUGEE_FRIENDLY",
      ]);
      assert.deepEqual(ids(on), [
        "FUEL_NOTHING_DISTRESS",
        "FUEL_NOTHING_DISTRESS",
        "FUEL_SELLER_DISTRESS",
        "FUEL_TRADER_DISTRESS",
        "FUEL_EXPLORE",
        "FUEL_APPROACH",
        "FUEL_ON_SLUG_OVERPRICED",
        "FUEL_ON_SLUG_CHUCKLE",
        "FUEL_ON_MANTIS_ATTACK",
        "FUEL_ON_REBEL_WARNING",
        "FUEL_ON_REBEL_ATTACK",
        "NO_FUEL_REFUGEE",
      ]);
      for (const id of [...new Set([...ids(off), ...ids(on)])]) {
        assert.ok(eventDef(id), id);
      }
      const lines = (id: string) => {
        const page = eventDef(id);
        return Math.max(page?.texts?.length ?? 0, page?.openings?.length ?? 0);
      };
      assert.ok(lines("FUEL_NOTHING") > 1);
      assert.ok(lines("FUEL_NOTHING_DISTRESS") > 1);
      assert.ok((eventDef("FUEL_NOTHING")?.choices.length ?? 0) >= 1);
      assert.ok((eventDef("FUEL_NOTHING_DISTRESS")?.choices.length ?? 0) >= 1);
    });

    it('marks a sun fight with <environment type="sun">', async () => {
      await installArchive(archive.bytes);
      for (const id of [
        "AUTO_SUN",
        "MANTIS_SUN_FIGHT",
        "PIRATE_SUN",
        "ROCK_PIRATE_SUN",
        "BOARDERS_SUN",
        "ROCK_BOARDERS_SUN",
      ]) {
        assert.equal(eventDef(id)?.environment?.type, "sun", id);
      }
      // The Sun Quest Marker has no datafile id. The stand-in stamps the sun on the arrival.
      if (archive.name === "totallynotftl") {
        const arrival = eventDef("arrive-rock-sun");
        assert.equal(arrival?.environment?.type, "sun");
        assert.ok(arrival?.aliases.includes("quest-rock-sun"));
        assert.equal(eventDef("quest-rock-sun")?.id, "arrive-rock-sun");
      }
    });
  });
}
