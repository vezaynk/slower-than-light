import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildRoute, createGame, enterHiddenCrystal } from "../sim.ts";
import { SECTOR_TYPES } from "../wiki/sectors.ts";
import { citedFleetAdvance } from "../wiki/cited-sectors.ts";
import "./base.ts";
import { loadPack, resetPackForTests, sectorDef } from "@stl/pack";
import type { SectorDef } from "@stl/pack";

afterEach(() => resetPackForTests());

function seenOnChart(name: string, seeds = 400): boolean {
  for (let seed = 1; seed <= seeds; seed++) {
    if (buildRoute(seed).some((node) => node.name === name)) return true;
  }
  return false;
}

describe("sector listings", () => {
  it("names the chart ends from the pack while the authored rows stay", () => {
    const start = sectorDef("civilian-start");
    const last = sectorDef("last-stand");
    assert.ok(start && last);
    loadPack(
      {
        sectors: [
          { ...start, name: "Ember Reach" },
          { ...last, name: "Ember Gate" },
        ],
      },
      "append",
    );
    const route = buildRoute(1);
    assert.equal(route[0]?.name, "Ember Reach");
    assert.equal(route[route.length - 1]?.name, "Ember Gate");
    assert.equal(SECTOR_TYPES.find((row) => row.id === "civilian-start")?.name, "Civilian (Starting) Sector");
    assert.equal(SECTOR_TYPES.find((row) => row.id === "last-stand")?.name, "The Last Stand");
    assert.equal(route.some((node) => node.name === "Hidden Crystal Worlds"), false);
  });

  it("slows the fleet for a renamed nebula and jumps to a renamed crystal sector", () => {
    const nebula = sectorDef("slug-nebula");
    const crystal = sectorDef("crystal-worlds");
    assert.ok(nebula && crystal);
    loadPack(
      {
        sectors: [
          { ...nebula, name: "Ember Nebula" },
          { ...crystal, name: "Ember Worlds" },
        ],
      },
      "append",
    );
    const g = createGame(1);
    g.sectorName = "Ember Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.8);
    g.sectorName = "Slug Controlled Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.5);
    enterHiddenCrystal(g);
    assert.equal(g.sectorName, "Ember Worlds");
    assert.equal(SECTOR_TYPES.find((row) => row.id === "slug-nebula")?.name, "Slug Controlled Nebula");
    assert.equal(SECTOR_TYPES.find((row) => row.id === "crystal-worlds")?.name, "Hidden Crystal Worlds");
    assert.equal(seenOnChart("Ember Worlds", 40), false);
  });

  it("can place an appended hostile sector and leaves a non-colour group off the chart", () => {
    const ember: SectorDef = { id: "ember", name: "Ember Reach", group: "hostile", notes: ["A later column."] };
    const vault: SectorDef = { id: "vault", name: "Vault", group: "vault", notes: [] };
    loadPack({ sectors: [ember, vault] }, "append");
    assert.equal(SECTOR_TYPES.some((row) => row.id === "ember"), false);
    assert.equal(seenOnChart("Ember Reach"), true);
    assert.equal(seenOnChart("Vault", 80), false);
  });
});
