import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FtlExtract } from "@stl/ftldat";
import {
  emitBlueprintAppend,
  emitGapDocument,
  emitNoteAppend,
  emitStatAppend,
  type CrewDef,
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

  it("skips an append whose target file is missing", () => {
    const merged = applyFtlMod(extract({}), {
      documents: [{ path: "data/hyperspace.xml.append", xml: APPEND_XML }],
      text: new Map(),
      assets: new Map(),
    });
    assert.deepEqual(merged.documents, []);
  });

  it("patches a file whose path differs only by case", () => {
    const merged = applyFtlMod(
      extract({ documents: [{ path: "data/blueprints.xml", xml: BASE_XML }] }),
      {
        documents: [{ path: "Data/Blueprints.append.xml", xml: APPEND_XML }],
        text: new Map(),
        assets: new Map(),
      },
    );
    assert.deepEqual(
      merged.documents.map((doc) => doc.path),
      ["data/blueprints.xml"],
    );
    assert.equal(merged.documents[0]?.xml.includes("SPARK"), true);
  });

  it("appends the same children again when the mod is applied twice", () => {
    const append = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <mod:findName type="crewBlueprint" name="human">
    <mod-append:maxHealth>50</mod-append:maxHealth>
  </mod:findName>
</FTL>
`;
    const dat = extract({
      documents: [
        {
          path: "data/blueprints.xml",
          xml: `<FTL><crewBlueprint name="human"><title>Human</title></crewBlueprint></FTL>`,
        },
      ],
    });
    const mod = extract({ documents: [{ path: "data/blueprints.xml.append", xml: append }] });
    const twice = applyFtlMod(applyFtlMod(dat, mod), mod);
    assert.equal((twice.documents[0]?.xml.match(/<maxHealth>/g) ?? []).length, 2);
  });

  it("creates a file for a raw clobber and skips a raw append with no target", () => {
    const created = applyFtlMod(extract({}), {
      documents: [{ path: "data/misc.xml.rawclobber", xml: "<FTL><c/></FTL>" }],
      text: new Map(),
      assets: new Map(),
    });
    assert.equal(created.documents[0]?.path, "data/misc.xml");
    assert.equal(created.documents[0]?.xml, "<FTL><c/></FTL>");
    const skipped = applyFtlMod(extract({}), {
      documents: [{ path: "data/misc.xml.rawappend", xml: "<b/>" }],
      text: new Map(),
      assets: new Map(),
    });
    assert.deepEqual(skipped.documents, []);
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
  it("reads a crew blueprint from a file named stand-in the same way as any other file", () => {
    const pack = packFromExtract(
      extract({
        documents: [
          {
            path: "data/stand-in.xml",
            xml: `<FTL><crewBlueprint name="human"><title>Human</title><maxHealth>70</maxHealth></crewBlueprint></FTL>`,
          },
        ],
      }),
    );
    assert.equal(pack.crew?.[0]?.name, "Human");
    assert.equal(pack.crew?.[0]?.hp, 70);
  });

  it("lets a later file replace an event and keeps the text lists", () => {
    const pack = packFromExtract(
      extract({
        documents: [
          {
            path: "data/stand-in.xml",
            xml: `<FTL><event name="HOME"><text>Campaign page.</text></event></FTL>`,
          },
          {
            path: "data/text_lists.xml",
            xml: `<FTL>
              <textList name="NEST"><text>Near.</text><text load="MORE"/></textList>
              <textList name="MORE"><text>Far.</text></textList>
              <event name="HOME"><text>Replaced.</text></event>
            </FTL>`,
          },
        ],
      }),
    );
    assert.equal(pack.events?.length, 1);
    assert.equal(pack.events?.[0]?.body, "Replaced.");
    assert.deepEqual(
      pack.textLists?.map((row) => row.id),
      ["NEST", "MORE"],
    );
    assert.deepEqual(pack.textLists?.[0]?.lines, [{ text: "Near." }, { load: "MORE" }]);
  });

  it("reads the stand-in's ships from its ftl.dat blueprints, with hull pictures beside them", () => {
    const pack = packFromExtract(
      extract({
        documents: [
          { path: "data/stand-in.xml", xml: `<FTL></FTL>` },
          {
            path: "data/blueprints.xml",
            xml: `<FTL><shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral"><name>The Kestrel</name></shipBlueprint></FTL>`,
          },
          {
            path: "data/kestral.xml",
            xml: `<FTL><img x="-35" y="-35" w="140" h="105"/></FTL>`,
          },
        ],
      }),
    );
    assert.equal(pack.hulls?.[0]?.name, "The Kestrel");
    assert.equal(pack.hulls?.[0]?.img, "kestral");
    assert.deepEqual(pack.hulls?.[0]?.picture, { x: -35, y: -35, w: 140, h: 105 });
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

  it("overwrites combat in blueprints.xml and in dlcBlueprints.xml", () => {
    const human = crew("human", "Human", 50);
    const lanius = crew("anaerobic", "Lanius", 70);
    lanius.drainsOxygen = true;
    const xml = emitStatAppend([human, lanius], "crewBlueprint");
    const dat = extract({
      documents: [
        {
          path: "data/blueprints.xml",
          xml: `<FTL><crewBlueprint name="human"><title>Human</title><maxHealth>100</maxHealth></crewBlueprint></FTL>`,
        },
        {
          path: "data/dlcBlueprints.xml",
          xml: `<FTL><crewBlueprint name="anaerobic"><title>Lanius</title></crewBlueprint></FTL>`,
        },
      ],
    });
    const mod = extract({
      documents: [
        { path: "data/blueprints.xml.append", xml },
        { path: "data/dlcBlueprints.xml.append", xml },
      ],
    });
    const once = packFromExtract(applyFtlMod(dat, mod));
    assert.equal(once.crew?.find((row) => row.id === "human")?.hp, 50);
    assert.equal(once.crew?.find((row) => row.id === "anaerobic")?.hp, 70);
    assert.equal(once.crew?.find((row) => row.id === "anaerobic")?.drainsOxygen, true);
    const twice = applyFtlMod(applyFtlMod(dat, mod), mod);
    const blueprints = twice.documents.find((doc) => doc.path === "data/blueprints.xml")?.xml ?? "";
    const dlc = twice.documents.find((doc) => doc.path === "data/dlcBlueprints.xml")?.xml ?? "";
    assert.equal((blueprints.match(/<maxHealth>/g) ?? []).length, 1);
    assert.equal(blueprints.includes("<maxHealth>50</maxHealth>"), true);
    assert.equal((dlc.match(/<maxHealth>/g) ?? []).length, 1);
    assert.equal(dlc.includes("<oxygenChangeSpeed>-0.5</oxygenChangeSpeed>"), true);
  });

  it("overwrites shotGap in blueprints.xml and in dlcBlueprints.xml", () => {
    const xml = emitBlueprintAppend([], [{ id: "LASER_BURST_3", gap: 0.28 }]);
    const dat = extract({
      documents: [
        {
          path: "data/blueprints.xml",
          xml: `<FTL><weaponBlueprint name="LASER_BURST_3"><type>LASER</type><title>Burst</title><shotGap>1</shotGap></weaponBlueprint></FTL>`,
        },
        {
          path: "data/dlcBlueprints.xml",
          xml: `<FTL><weaponBlueprint name="LASER_BURST_3"><type>LASER</type><title>Burst</title></weaponBlueprint></FTL>`,
        },
      ],
    });
    const mod = extract({
      documents: [
        { path: "data/blueprints.xml.append", xml },
        { path: "data/dlcBlueprints.xml.append", xml },
      ],
    });
    const once = packFromExtract(applyFtlMod(dat, mod));
    assert.equal(once.weapons?.find((row) => row.id === "LASER_BURST_3")?.gap, 0.28);
    const twice = applyFtlMod(applyFtlMod(dat, mod), mod);
    const blueprints = twice.documents.find((doc) => doc.path === "data/blueprints.xml")?.xml ?? "";
    const dlc = twice.documents.find((doc) => doc.path === "data/dlcBlueprints.xml")?.xml ?? "";
    assert.equal((blueprints.match(/<shotGap>/g) ?? []).length, 1);
    assert.equal(blueprints.includes("<shotGap>0.28</shotGap>"), true);
    assert.equal((dlc.match(/<shotGap>/g) ?? []).length, 1);
    assert.equal(dlc.includes("<shotGap>0.28</shotGap>"), true);
  });

  it("keeps the archive rows and colour, and takes combat, notes, and the store from the gap", () => {
    const ignored = crew("human", "Ignored", 50);
    const energyXml = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <crewBlueprint name="energy">
    <title>Zoltan</title>
    <maxHealth>70</maxHealth>
  </crewBlueprint>
</FTL>
`;
    const merged = packFromExtract(
      applyFtlMod(
        extract({ documents: [{ path: "data/blueprints.xml", xml: VANILLA }] }),
        extract({
          documents: [
            { path: "data/blueprints.xml.append", xml: emitStatAppend([ignored], "crewBlueprint") },
            {
              path: "data/blueprints.xml.append",
              xml: emitNoteAppend([
                { id: "civilian", name: "Wrong", group: "civilian", notes: ["Quiet."] },
                { id: "nebula", name: "Nebula", group: "nebula", notes: ["Skip."] },
              ]),
            },
            {
              path: "data/gap.xml",
              xml: emitGapDocument({
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
              }),
            },
            { path: "data/energy.xml", xml: energyXml },
          ],
        }),
      ),
    );
    assert.deepEqual(
      merged.weapons?.map((row) => row.id),
      ["LETO", "ONLY"],
    );
    assert.equal(merged.weapons?.[0]?.name, "Leto");
    assert.equal(
      merged.weapons?.some((row) => row.id === "GAP_GUN"),
      false,
    );
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
  <sectorType name="CIVILIAN"><sector>civilian</sector></sectorType>
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
