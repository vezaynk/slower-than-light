import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { choose, choiceDisabled, commitJump, createGame } from "../sim.ts";
import { stampEngiCache } from "./engi-cache.ts";

function land(sectorName: string) {
  const g = createGame(3, "kestrel-a", "normal");
  g.sector = 3;
  g.sectorName = sectorName;
  g.fuel = 8;
  g.missiles = 6;
  g.fleet = 4;
  stampEngiCache(g);
  const here = g.beacons.find((b) => b.id === g.here);
  const dest = g.beacons.find((b) => b.flag === "engi-cache");
  assert.ok(here);
  assert.ok(dest);
  if (!here.links.includes(dest.id)) here.links.push(dest.id);
  // The cache is not an overtaken beacon. Fleet 4 is only so the 2-turn delay stays visible.
  dest.col = 6;
  const before = g.fleet;
  commitJump(g, dest.id);
  return { g, jumped: g.fleet - before };
}

describe("Engi cache", () => {
  it("is stamped once, and only in the two sectors the page names", () => {
    const civilian = createGame(2);
    civilian.sectorName = "Civilian (Starting) Sector";
    stampEngiCache(civilian);
    assert.equal(civilian.beacons.some((b) => b.flag === "engi-cache"), false);
    const g = createGame(2);
    g.sectorName = "Engi Homeworlds";
    stampEngiCache(g);
    stampEngiCache(g);
    const marked = g.beacons.filter((b) => b.flag === "engi-cache");
    assert.equal(marked.length, 1);
    assert.equal(marked[0].kind, "event");
    assert.equal(marked[0].name, "Engi cache");
  });

  it("spends 2 missiles and delays the fleet 2 turns", () => {
    const { g, jumped } = land("Engi Controlled Sector");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.title, "Engi cache");
    const fleet = g.fleet;
    const missiles = g.missiles;
    choose(g, "engi-cache-trap");
    assert.equal(g.missiles, missiles - 2);
    assert.equal(g.fleet, Math.max(0, fleet - 2));
    assert.equal(jumped, 1);
    assert.equal(g.phase, "map");
    assert.equal(g.event, null);
  });

  it("grants medium scrap and does not add a schematic", () => {
    const { g } = land("Engi Controlled Sector");
    const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
    const scrap = g.scrap;
    const weapons = g.player.weapons.map((w) => w.defId).join(",");
    const kits = JSON.stringify(g.player.kits);
    const parts = g.player.parts;
    choose(g, "engi-cache-secure");
    const gained = g.scrap - scrap;
    assert.ok(gained >= lo && gained <= hi, `${gained} not in ${lo}-${hi}`);
    assert.equal(g.player.weapons.map((w) => w.defId).join(","), weapons);
    assert.equal(JSON.stringify(g.player.kits), kits);
    assert.equal(g.player.parts, parts);
    assert.equal(g.phase, "map");
  });

  it("refuses the missile choice without 2 missiles", () => {
    const { g } = land("Engi Homeworlds");
    g.missiles = 1;
    assert.equal(choiceDisabled(g, "engi-cache-trap"), "Need 2 missiles");
    const fleet = g.fleet;
    choose(g, "engi-cache-trap");
    assert.equal(g.missiles, 1);
    assert.equal(g.fleet, fleet);
    assert.equal(g.phase, "event");
  });
});
