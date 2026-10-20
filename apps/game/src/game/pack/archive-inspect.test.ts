import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FtlExtract } from "@stl/ftldat";
import { formatBytes, summarize } from "./archive-inspect.ts";

function extract(
  documents: { path: string; xml: string }[],
  assets: [string, number][] = [],
): FtlExtract {
  return {
    documents,
    text: new Map(),
    assets: new Map(assets.map(([path, size]) => [path, new Blob([new Uint8Array(size)])])),
  };
}

describe("archive inspector", () => {
  it("reads a base archive's records and groups its pictures and sounds", () => {
    const summary = summarize(
      extract(
        [
          {
            path: "data/blueprints.xml",
            xml: `<FTL>
  <weaponBlueprint name="LASER_A"><type>LASER</type><title>Basic Laser</title><power>1</power></weaponBlueprint>
  <weaponBlueprint name="LASER_B"><type>LASER</type><title>Burst Laser</title><power>2</power></weaponBlueprint>
</FTL>`,
          },
        ],
        [
          ["img/ship/kestral_base.png", 10],
          ["img/weapons/laser.png", 5],
          ["audio/music/bp_MUS_Space.ogg", 7],
          ["audio/waves/ui/click.ogg", 3],
        ],
      ),
    );
    assert.equal(summary.role, "base");
    assert.equal(summary.container, "zip");
    const weapons = summary.records.find((row) => row.label === "Weapons");
    assert.equal(weapons?.count, 2);
    assert.deepEqual(weapons?.examples, ["Basic Laser", "Burst Laser"]);
    assert.deepEqual(summary.assets, [
      { label: "Ship pictures", count: 1 },
      { label: "Weapon pictures", count: 1 },
      { label: "Music", count: 1 },
      { label: "Sound effects", count: 1 },
    ]);
    assert.equal(summary.files.length, 5);
  });

  it("says what a mod adds, changes, and removes in each file", () => {
    const summary = summarize(
      extract([
        {
          path: "data/blueprints.xml.append",
          xml: `<weaponBlueprint name="NEW_ONE"><type>LASER</type></weaponBlueprint>
<mod:findName type="weaponBlueprint" name="LASER_B">
  <mod-overwrite:power>3</mod-overwrite:power>
</mod:findName>
<mod:findName type="weaponBlueprint" name="LASER_A">
  <mod:removeTag/>
</mod:findName>`,
        },
        { path: "data/events.xml.append", xml: `<event name="A"/><event name="B"/>` },
      ]),
    );
    assert.equal(summary.role, "mod");
    assert.deepEqual(summary.patches, [
      {
        path: "data/blueprints.xml.append",
        target: "data/blueprints.xml",
        kind: "append",
        adds: [["weaponBlueprint", 1]],
        edits: 2,
        removes: 1,
      },
      {
        path: "data/events.xml.append",
        target: "data/events.xml",
        kind: "append",
        adds: [["event", 2]],
        edits: 0,
        removes: 0,
      },
    ]);
    assert.deepEqual(summary.replaces, []);
  });

  it("formats sizes the way a player reads them", () => {
    assert.equal(formatBytes(14), "14 B");
    assert.equal(formatBytes(10_726), "10 KB");
    assert.equal(formatBytes(278_188_330), "265 MB");
  });
});
