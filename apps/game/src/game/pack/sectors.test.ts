import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildRoute, createGame, enterHiddenCrystal } from "../sim.ts";
import { citedFleetAdvance } from "../wiki/cited-sectors.ts";
import "./base.ts";
import {
  allSectors,
  loadPack,
  onPackWarning,
  packFromFtl,
  resetPackForTests,
  sectorDef,
} from "@stl/pack";
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
    // Sector 1 shows STANDARD_SPACE's own title; the last column is FINAL.
    assert.equal(allSectors().length, 19);
    assert.equal(allSectors()[0]?.id, "STANDARD_SPACE");
    assert.equal(allSectors().at(-1)?.id, "FINAL");
    assert.equal(sectorDef("STANDARD_SPACE")?.name, "Civilian (Starting) Sector");
    assert.equal(sectorDef("FINAL")?.name, "The Last Stand");
    assert.ok((sectorDef("STANDARD_SPACE")?.notes.length ?? 0) > 0);
    const start = sectorDef("STANDARD_SPACE");
    const last = sectorDef("FINAL");
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
    assert.equal(route[0]?.sector, "STANDARD_SPACE");
    assert.equal(route[0]?.name, "Ember Reach");
    assert.equal(route[route.length - 1]?.name, "Ember Gate");
    assert.equal(
      route.some((node) => node.name === "Hidden Crystal Worlds"),
      false,
    );
    resetPackForTests();
    assert.equal(sectorDef("STANDARD_SPACE")?.name, "Civilian (Starting) Sector");
    assert.equal(sectorDef("FINAL")?.name, "The Last Stand");
  });

  it("slows the fleet for a renamed nebula and jumps to a renamed crystal sector", () => {
    assert.equal(sectorDef("SLUG_SECTOR")?.name, "Slug Controlled Nebula");
    assert.equal(sectorDef("CRYSTAL_HOME")?.name, "Hidden Crystal Worlds");
    const nebula = sectorDef("SLUG_SECTOR");
    const crystal = sectorDef("CRYSTAL_HOME");
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
    // The fleet goes by the sector's id and colour, not its name.
    const g = createGame(1);
    g.sectorId = "SLUG_SECTOR";
    g.sectorName = "Ember Nebula";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.8);
    g.sectorId = "CIVILIAN_SECTOR";
    assert.equal(citedFleetAdvance(g, { kind: "nebula" }), 0.5);
    enterHiddenCrystal(g);
    assert.equal(g.sectorName, "Ember Worlds");
    assert.equal(seenOnChart("Ember Worlds", 40), false);
    resetPackForTests();
    assert.equal(sectorDef("SLUG_SECTOR")?.name, "Slug Controlled Nebula");
    assert.equal(sectorDef("CRYSTAL_HOME")?.name, "Hidden Crystal Worlds");
  });

  it("can place an appended hostile sector and leaves a non-colour group off the chart", () => {
    const ember: SectorDef = {
      id: "ember",
      name: "Ember Reach",
      group: "hostile",
      notes: ["A later column."],
    };
    const vault: SectorDef = { id: "vault", name: "Vault", group: "vault", notes: [] };
    assert.equal(
      allSectors().some((row) => row.id === "ember"),
      false,
    );
    loadPack({ sectors: [ember, vault] }, "append");
    assert.equal(
      allSectors().some((row) => row.id === "ember"),
      true,
    );
    assert.equal(seenOnChart("Ember Reach"), true);
    assert.equal(seenOnChart("Vault", 80), false);
    resetPackForTests();
    assert.equal(
      allSectors().some((row) => row.id === "ember"),
      false,
    );
  });
});

describe("a chart from FTL's own sector data", () => {
  // sector_data.xml's shape: FTL ids, colour from the sectorType lists, a 0-based minSector, and unique.
  const XML = `<FTL>
  <sectorType name="CIVILIAN"><sector>CIVILIAN_SECTOR</sector><sector>ENGI_HOME</sector></sectorType>
  <sectorType name="HOSTILE"><sector>REBEL_SECTOR</sector><sector>REBEL_SECTOR_MINIBOSS</sector></sectorType>
  <sectorType name="NEBULA"><sector>NEBULA_SECTOR</sector></sectorType>
  <sectorDescription name="STANDARD_SPACE" minSector="0" unique="true"><nameList><name>Civilian (Starting) Sector</name></nameList></sectorDescription>
  <sectorDescription name="CIVILIAN_SECTOR" minSector="0" unique="false"><nameList><name>Civilian Sector</name></nameList></sectorDescription>
  <sectorDescription name="ENGI_HOME" minSector="2" unique="true"><nameList><name>Engi Homeworlds</name></nameList></sectorDescription>
  <sectorDescription name="REBEL_SECTOR" minSector="0" unique="false"><nameList><name>Rebel Controlled Sector</name></nameList></sectorDescription>
  <sectorDescription name="REBEL_SECTOR_MINIBOSS" minSector="4" unique="true"><nameList><name>Rebel Stronghold</name></nameList></sectorDescription>
  <sectorDescription name="NEBULA_SECTOR" minSector="0" unique="false"><nameList><name>Uncharted Nebula</name></nameList></sectorDescription>
  <sectorDescription name="CRYSTAL_HOME" minSector="0" unique="true"><nameList><name>Hidden Crystal Worlds</name></nameList></sectorDescription>
  <sectorDescription name="FINAL" minSector="7" unique="true"><nameList><name>The Last Stand</name></nameList></sectorDescription>
</FTL>`;

  it("opens on STANDARD_SPACE's own title, ends on FINAL, and keeps each sector's gate and uniqueness", () => {
    loadPack(
      { sectors: packFromFtl([{ path: "data/sector_data.xml", xml: XML }]).sectors },
      "base",
    );
    for (let seed = 1; seed <= 300; seed++) {
      const route = buildRoute(seed);
      assert.equal(route[0]?.sector, "STANDARD_SPACE");
      assert.equal(route[0]?.name, "Civilian (Starting) Sector");
      assert.equal(route[route.length - 1]?.name, "The Last Stand");
      const cols = (name: string) =>
        route.filter((n) => n.name === name && n.col > 0 && n.col < 7).map((n) => n.col);
      assert.ok(cols("Engi Homeworlds").length <= 1);
      assert.ok(cols("Engi Homeworlds").every((col) => col >= 2));
      assert.ok(cols("Rebel Stronghold").length <= 1);
      assert.ok(cols("Rebel Stronghold").every((col) => col >= 4));
      assert.equal(cols("Hidden Crystal Worlds").length, 0);
    }
    assert.ok(seenOnChart("Engi Homeworlds") && seenOnChart("Rebel Stronghold"));
  });

  it("warns and repeats a sector when a column has nothing eligible", () => {
    const xml = `<FTL>
  <sectorType name="CIVILIAN"><sector>CIVILIAN_SECTOR</sector><sector>LATE</sector></sectorType>
  <sectorDescription name="CIVILIAN_SECTOR" minSector="0" unique="true"><nameList><name>Civilian Sector</name></nameList></sectorDescription>
  <sectorDescription name="LATE" minSector="5" unique="false"><nameList><name>Late Sector</name></nameList></sectorDescription>
</FTL>`;
    loadPack({ sectors: packFromFtl([{ path: "data/sector_data.xml", xml }]).sectors }, "base");
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const route = buildRoute(1);
      assert.equal(route.length, route.filter((n) => n.name).length);
      assert.ok(warnings.some((line) => line.includes("No sector is eligible")));
    } finally {
      restore();
    }
  });
});
