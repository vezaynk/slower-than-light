import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitGapDocument } from "./emit.ts";
import { emitFtlSectors } from "./ftl-emit.ts";
import { packFromFtl } from "./ftl.ts";
import { beaconEventId, beaconEvents, loadPack, resetPackForTests } from "./registry.ts";
import { onPackWarning } from "./warnings.ts";

const GAP = `<FTL>
  <beaconEvents>
    <startEvent>START_BEACON</startEvent>
    <finishEvent>FINISH_BEACON</finishEvent>
    <finishEvent nebula="true">FINISH_BEACON_NEBULA</finishEvent>
  </beaconEvents>
</FTL>`;

const SECTORS = `<FTL>
  <sectorDescription name="PLAIN" minSector="0" unique="false"><nameList><name>Plain</name></nameList></sectorDescription>
  <sectorDescription name="OWN" minSector="0" unique="false">
    <nameList><name>Own</name></nameList>
    <startEvent>OWN_START</startEvent>
    <finishEvent>OWN_EXIT</finishEvent>
  </sectorDescription>
  <sectorDescription name="FOGGY" minSector="0" unique="false">
    <nameList><name>Foggy</name></nameList>
    <finishEvent nebula="true">FOGGY_EXIT</finishEvent>
  </sectorDescription>
</FTL>`;

describe("beacon events", () => {
  it("lets a sector's own tag win over <beaconEvents>", () => {
    resetPackForTests();
    const pack = packFromFtl([
      { path: "data/sector_data.xml", xml: SECTORS },
      { path: "data/gap.xml", xml: GAP },
    ]);
    assert.deepEqual(pack.beaconEvents, {
      start: "START_BEACON",
      finish: "FINISH_BEACON",
      finishNebula: "FINISH_BEACON_NEBULA",
    });
    loadPack(pack, "append");
    assert.equal(beaconEventId("start", "PLAIN"), "START_BEACON");
    assert.equal(beaconEventId("start", "OWN"), "OWN_START");
    assert.equal(beaconEventId("finish", "PLAIN"), "FINISH_BEACON");
    assert.equal(beaconEventId("finish", "PLAIN", true), "FINISH_BEACON_NEBULA");
    assert.equal(beaconEventId("finish", "OWN"), "OWN_EXIT");
    // A sector's plain exit does not stand in for the default nebula exit.
    assert.equal(beaconEventId("finish", "OWN", true), "FINISH_BEACON_NEBULA");
    assert.equal(beaconEventId("finish", "FOGGY", true), "FOGGY_EXIT");
    assert.equal(beaconEventId("finish", "FOGGY"), "FINISH_BEACON");
    resetPackForTests();
  });

  it("names nothing with no <beaconEvents> and no sector tag", () => {
    resetPackForTests();
    loadPack({ beaconEvents: {} }, "base");
    assert.equal(beaconEventId("finish", "PLAIN"), undefined);
    assert.deepEqual(beaconEvents(), {});
    resetPackForTests();
  });

  it("warns on an unknown child and keeps the rest", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const pack = packFromFtl([
        {
          path: "data/gap.xml",
          xml: "<FTL><beaconEvents><exitEvent>X</exitEvent><finishEvent>F</finishEvent></beaconEvents></FTL>",
        },
      ]);
      assert.deepEqual(pack.beaconEvents, { finish: "F" });
      assert.ok(warnings.some((line) => line.includes("exitEvent")));
    } finally {
      restore();
    }
  });

  it("writes the defaults and sector tags back", () => {
    const pack = packFromFtl([
      { path: "data/sector_data.xml", xml: SECTORS },
      { path: "data/gap.xml", xml: GAP },
    ]);
    const back = packFromFtl([
      { path: "data/sector_data.xml", xml: emitFtlSectors(pack.sectors ?? []) },
      { path: "data/gap.xml", xml: emitGapDocument(pack) },
    ]);
    assert.deepEqual(back.beaconEvents, pack.beaconEvents);
    const own = back.sectors?.find((row) => row.id === "OWN");
    assert.equal(own?.finishEvent, "OWN_EXIT");
    assert.equal(back.sectors?.find((row) => row.id === "FOGGY")?.finishNebulaEvent, "FOGGY_EXIT");
  });
});
