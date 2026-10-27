import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import "./base.ts";
import { applyFtlMod } from "@stl/hyperspace";
import {
  allAugments,
  allCrew,
  allDrones,
  allEmptyBeacons,
  allEvents,
  allFillerLists,
  allHulls,
  allSectors,
  allStores,
  allSystems,
  allTunes,
  allWeapons,
  emitFtlSectors,
  emitFtlShips,
  emitNoteAppend,
  packFromFtl,
  emitPack,
  parsePack,
  pictureXml,
  resetPackForTests,
  writeGrid,
} from "@stl/pack";
import type { HullDef, HullSheet } from "@stl/pack";

function pictureFiles(hulls: readonly HullDef[]): { path: string; xml: string }[] {
  const files: { path: string; xml: string }[] = [];
  const seen = new Set<string>();
  for (const hull of hulls) {
    if (!hull.picture || seen.has(hull.layout)) continue;
    seen.add(hull.layout);
    const sheet: HullSheet = {};
    if (hull.glow) sheet.glow = hull.glow;
    if (hull.cloakOffset) sheet.cloakOffset = hull.cloakOffset;
    if (hull.floorOffset) sheet.floorOffset = hull.floorOffset;
    if (hull.gibs) sheet.gibs = hull.gibs;
    const drawn =
      hull.glow || hull.cloakOffset || hull.floorOffset || hull.gibs ? sheet : undefined;
    files.push({
      path: `data/${hull.layout}.xml`,
      xml: pictureXml(hull.picture, hull.mounts, drawn),
    });
  }
  return files;
}

function gridFiles(hulls: readonly HullDef[]): { path: string; text: string }[] {
  const files: { path: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const hull of hulls) {
    if (!hull.grid || seen.has(hull.layout)) continue;
    seen.add(hull.layout);
    files.push({ path: `data/${hull.layout}.txt`, text: writeGrid(hull.grid) });
  }
  return files;
}

describe("base pack xml", () => {
  it("round-trips the loaded records and reads the gap file", () => {
    resetPackForTests();
    const pack = {
      crew: allCrew(),
      weapons: allWeapons(),
      augments: allAugments(),
      drones: allDrones(),
      systems: allSystems(),
      hulls: allHulls(),
      sectors: allSectors(),
      stores: allStores(),
      tunes: allTunes(),
      events: allEvents(),
      lists: allFillerLists(),
      empties: allEmptyBeacons(),
    };
    const xml = emitPack(pack);
    const back = parsePack(xml);
    // Ships travel as ftl.dat blueprints, with their layout text and picture files beside them, as in the dat.
    back.hulls = packFromFtl(
      [{ path: "data/blueprints.xml", xml: emitFtlShips(pack.hulls) }, ...pictureFiles(pack.hulls)],
      gridFiles(pack.hulls),
    ).hulls;
    // Sectors travel as ftl.dat's sector_data.xml. The wiki notes are appended by the gap mod.
    const sectors = applyFtlMod(
      {
        documents: [{ path: "data/sector_data.xml", xml: emitFtlSectors(pack.sectors) }],
        text: new Map(),
        assets: new Map(),
      },
      {
        documents: [{ path: "data/sector_data.xml.append", xml: emitNoteAppend(pack.sectors) }],
        text: new Map(),
        assets: new Map(),
      },
    );
    back.sectors = packFromFtl(sectors.documents).sectors;
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    assert.deepEqual(back.augments, pack.augments);
    assert.deepEqual(back.drones, pack.drones);
    assert.deepEqual(back.systems, pack.systems);
    assert.deepEqual(back.hulls, pack.hulls);
    assert.deepEqual(back.sectors, pack.sectors);
    assert.deepEqual(back.stores, pack.stores);
    assert.deepEqual(back.tunes, pack.tunes);
    // The stand-in document stores page sentences. A nested textList load stays on the loaded event.
    assert.deepEqual(
      pack.events.flatMap((event) => (event.openings ? [[event.id, event.openings] as const] : [])),
      [["STAND_IN_NESTED", [{ text: "The near reading." }, { load: "STAND_IN_MORE" }]]],
    );
    assert.deepEqual(
      back.events,
      pack.events.map((event) => {
        if (!event.openings) return event;
        const copy = { ...event };
        delete copy.openings;
        return copy;
      }),
    );
    assert.deepEqual(back.lists, pack.lists);
    assert.deepEqual(back.empties, pack.empties);
    const gap = parsePack(
      readFileSync(
        new URL("../../../../../packages/campaign/mod/data/gap.xml", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(gap.weapons?.length, 0);
    assert.equal(gap.events?.length, 0);
    assert.ok((gap.stores?.length ?? 0) > 0);
    assert.ok(gap.rewards);
  });
});
