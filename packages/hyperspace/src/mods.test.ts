import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FtlExtract } from "@stl/ftldat";
import {
  emitPack,
  overlayGap,
  parsePack,
  type CrewDef,
  type HullDef,
  type WeaponBlueprint,
} from "@stl/pack";
import { applyFtlMod, loadFtlMods, packFromExtract } from "./mods.ts";

const BASE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>First</title>
  </weaponBlueprint>
  <shipBlueprint name="PLAYER_SHIP_EASY" layout="kestral" img="kestral">
    <class>Kestrel</class>
    <name>The Kestrel</name>
    <health amount="30"/>
    <maxPower amount="8"/>
  </shipBlueprint>
</FTL>
`;

const OVERWRITE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Overwrite</title>
  </weaponBlueprint>
</FTL>
`;

const APPEND_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Appended</title>
  </weaponBlueprint>
  <weaponBlueprint name="SPARK">
    <type>LASER</type>
    <title>Spark</title>
  </weaponBlueprint>
</FTL>
`;

const LAYOUT = `X_OFFSET
0
Y_OFFSET
0
VERTICAL
0
ELLIPSE
10
20
1
2
ROOM
0
1
2
3
4
`;

const LAYOUT_TWO = `${LAYOUT}ROOM
1
5
6
2
2
`;

function extract(parts: {
  documents?: { path: string; xml: string }[];
  text?: [string, string][];
  assets?: [string, Blob][];
}): FtlExtract {
  return {
    documents: parts.documents ?? [],
    text: new Map(parts.text ?? []),
    assets: new Map(parts.assets ?? []),
  };
}

const base = (): FtlExtract =>
  extract({
    documents: [
      { path: "data/blueprints.xml", xml: BASE_XML },
      { path: "data/dlcBlueprintsOverwrite.xml", xml: OVERWRITE_XML },
    ],
    text: [["data/kestral.txt", LAYOUT]],
    assets: [["img/ship/kestral.png", new Blob([Uint8Array.of(1, 2)], { type: "image/png" })]],
  });

describe("loadFtlMods", () => {
  it("appends xml into the named file and keeps later dat files after it", () => {
    const dat = base();
    const loaded = loadFtlMods(dat, [
      extract({ documents: [{ path: "data/blueprints.xml.append", xml: APPEND_XML }] }),
    ]);
    assert.deepEqual(
      loaded.files.documents.map((doc) => doc.path),
      ["data/blueprints.xml", "data/dlcBlueprintsOverwrite.xml"],
    );
    assert.equal(loaded.pack.weapons?.find((row) => row.id === "EMBER")?.name, "Overwrite");
    assert.equal(loaded.pack.weapons?.find((row) => row.id === "SPARK")?.name, "Spark");
    assert.equal(loaded.pack.hulls?.[0]?.layout, "kestral");
    assert.equal(loaded.pack.hulls?.[0]?.grid?.rooms.length, 1);
    assert.equal(dat.text.get("data/kestral.txt"), LAYOUT);
  });

  it("lets a later mod replace a layout, an image, and a whole record", () => {
    const dat = base();
    const image = new Blob([Uint8Array.of(9, 8, 7)], { type: "image/png" });
    const loaded = loadFtlMods(dat, [
      extract({ documents: [{ path: "data/blueprints.xml.append", xml: APPEND_XML }] }),
      extract({
        documents: [
          {
            path: "data/dlcBlueprintsOverwrite.xml.append",
            xml: `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Modded</title>
  </weaponBlueprint>
</FTL>
`,
          },
        ],
        text: [["data/kestral.txt", LAYOUT_TWO]],
        assets: [["img/ship/kestral.png", image]],
      }),
    ]);
    assert.equal(loaded.pack.weapons?.find((row) => row.id === "EMBER")?.name, "Modded");
    assert.equal(loaded.pack.hulls?.[0]?.grid?.rooms.length, 2);
    assert.equal(loaded.files.assets.get("img/ship/kestral.png"), image);
    assert.notEqual(dat.assets.get("img/ship/kestral.png"), image);
    assert.equal(loaded.files.documents[0]?.xml.includes("SPARK"), true);
  });

  it("adds a new file after the dat files and replaces a whole xml file in place", () => {
    const extra = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="NOVA">
    <type>LASER</type>
    <title>Nova</title>
  </weaponBlueprint>
</FTL>
`;
    const replaced = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="ONLY">
    <type>LASER</type>
    <title>Only</title>
  </weaponBlueprint>
</FTL>
`;
    const loaded = loadFtlMods(base(), [
      extract({
        documents: [
          { path: "data/blueprints.xml", xml: replaced },
          { path: "data/extra.xml", xml: extra },
        ],
      }),
    ]);
    assert.deepEqual(
      loaded.files.documents.map((doc) => doc.path),
      ["data/blueprints.xml", "data/dlcBlueprintsOverwrite.xml", "data/extra.xml"],
    );
    assert.equal(
      loaded.pack.weapons?.some((row) => row.id === "ONLY"),
      true,
    );
    assert.equal(
      loaded.pack.weapons?.some((row) => row.id === "SPARK"),
      false,
    );
    assert.equal(loaded.pack.weapons?.find((row) => row.id === "NOVA")?.name, "Nova");
    assert.equal(loaded.pack.hulls, undefined);
  });

  it("creates the target file when the append has nothing to extend", () => {
    const merged = applyFtlMod(extract({}), {
      documents: [{ path: "data/hyperspace.xml.append", xml: APPEND_XML }],
      text: new Map(),
      assets: new Map(),
    });
    assert.deepEqual(
      merged.documents.map((doc) => doc.path),
      ["data/hyperspace.xml"],
    );
    assert.equal(merged.documents[0]?.xml.includes("SPARK"), true);
  });

  it("names the append file when it is not well-formed", () => {
    assert.throws(
      () =>
        applyFtlMod(base(), {
          documents: [{ path: "data/blueprints.xml.append", xml: "<weaponBlueprint>" }],
          text: new Map(),
          assets: new Map(),
        }),
      /data\/blueprints\.xml\.append/,
    );
  });
});

describe("packFromExtract", () => {
  it("reads the stand-in as a campaign document", () => {
    const pack = packFromExtract(
      extract({
        documents: [
          {
            path: "data/stand-in.xml",
            xml: `<FTL><race name="human"><title>Human</title><maxHealth>70</maxHealth></race></FTL>`,
          },
        ],
      }),
    );
    assert.equal(pack.crew?.[0]?.name, "Human");
    assert.equal(pack.crew?.[0]?.hp, 70);
  });

  it("reads any other single file as vanilla XML", () => {
    const pack = packFromExtract(
      extract({
        documents: [
          {
            path: "data/blueprints.xml",
            xml: `<FTL><race name="human"><title>Human</title><maxHealth>70</maxHealth></race></FTL>`,
          },
        ],
      }),
    );
    assert.equal(pack.crew, undefined);
  });

  it("keeps the archive rows and takes combat, colour, and the store from the gap", () => {
    const archive = packFromExtract(
      extract({ documents: [{ path: "data/blueprints.xml", xml: VANILLA }] }),
    );
    const gap = parseGap();
    const merged = overlayGap(archive, gap);
    assert.deepEqual(
      merged.weapons?.map((row) => row.id),
      ["LETO", "ONLY"],
    );
    assert.equal(merged.weapons?.[0]?.name, "Leto");
    assert.equal(merged.weapons?.some((row) => row.id === "GAP_GUN"), false);
    const human = merged.crew?.find((row) => row.id === "human");
    assert.equal(human?.name, "Human");
    assert.equal(human?.detail, "The standard crew.");
    assert.equal(human?.cost, 45);
    assert.equal(human?.hp, 50);
    const energy = merged.crew?.find((row) => row.id === "energy");
    assert.equal(energy?.hp, 70);
    assert.equal(merged.sectors?.length, 1);
    assert.equal(merged.sectors?.[0]?.name, "Civilian Sector");
    assert.equal(merged.sectors?.[0]?.group, "civilian");
    assert.deepEqual(merged.sectors?.[0]?.notes, ["Quiet."]);
    assert.deepEqual(merged.sectors?.[0]?.quotas, [{ id: "START", min: 1, max: 2 }]);
    assert.equal(merged.hulls?.[0]?.layout, "kestral");
    assert.equal(merged.hulls?.[0]?.name, "The Kestrel");
    assert.equal(merged.stores?.[0]?.id, "general");
    assert.equal(merged.facts, undefined);
  });
});

const VANILLA = `<FTL>
  <weaponBlueprint name="LETO">
    <type>MISSILES</type>
    <title>Leto</title>
    <damage>1</damage>
    <shots>1</shots>
    <power>1</power>
    <cost>20</cost>
  </weaponBlueprint>
  <weaponBlueprint name="ONLY">
    <type>LASER</type>
    <title>Archive Only</title>
    <damage>1</damage>
  </weaponBlueprint>
  <crewBlueprint name="human">
    <title>Human</title>
    <desc>The standard crew.</desc>
    <cost>45</cost>
  </crewBlueprint>
  <sectorDescription name="civilian">
    <name>Civilian Sector</name>
    <event name="START" min="1" max="2"/>
  </sectorDescription>
  <shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">
    <class>Kestrel</class>
    <name>The Kestrel</name>
  </shipBlueprint>
</FTL>`;

function crew(id: string, name: string, hp: number): CrewDef {
  return {
    id,
    name,
    hp,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
    bonusPower: 0,
    hasDeathExplosion: false,
    drainsOxygen: false,
    detectsLifeforms: false,
    resistsMindControl: false,
    lockdown: false,
    lockCooldown: 0,
    fireRepairMultiplier: 1,
  };
}

function parseGap() {
  const gun: WeaponBlueprint = {
    id: "GAP_GUN",
    name: "Should Not Load",
    kind: "laser",
    power: 1,
    charge: 1,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 1,
    blurb: "",
  };
  const hull: HullDef = {
    id: "PLAYER_SHIP_HARD",
    cruiser: "Kestrel",
    layout: "A",
    name: "Campaign Kestrel",
    quote: "",
    unlock: "",
    source: "",
    reactor: 0,
    fuel: 0,
    missiles: 0,
    parts: 0,
    systems: {},
    weapons: [],
    crew: [],
    kits: {},
    augments: [],
    unfitted: [],
  };
  return parsePack(
    emitPack(
      {
        crew: [crew("human", "Ignored", 50), crew("energy", "Zoltan", 70)],
        sectors: [
          { id: "civilian", name: "Wrong", group: "civilian", notes: ["Quiet."] },
          { id: "nebula", name: "Nebula", group: "nebula", notes: ["Skip."] },
        ],
        stores: [
          {
            id: "general",
            name: "Store",
            slot: 3,
            weapons: 2,
            sections: ["weapons"],
            lines: [{ id: "fuel", kind: "fuel", name: "Fuel", cost: 3, min: 2, max: 5 }],
          },
        ],
        weapons: [gun],
        hulls: [hull],
      },
      { crew: "stats", sector: "gap" },
    ),
  );
}
