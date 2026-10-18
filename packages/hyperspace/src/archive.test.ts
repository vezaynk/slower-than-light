import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packFromFtl } from "@stl/pack";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import { emitFtlMod, packFromFtlMod } from "./archive.ts";

const parser = new DOMParser({
  onError(level, message) {
    throw new Error(`${level}: ${message}`);
  },
});

const first = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="LASER_BURST_1">
    <type>LASER</type>
    <title>First Laser</title>
    <tooltip>A fixture laser.</tooltip>
    <damage>1</damage>
    <shots>2</shots>
    <sp>0</sp>
    <fireChance>0</fireChance>
    <breachChance>0</breachChance>
    <cooldown>10</cooldown>
    <power>1</power>
    <cost>20</cost>
    <rarity>4</rarity>
  </weaponBlueprint>
  <weaponBlueprint name="MISSILES_1">
    <type>MISSILES</type>
    <title>Leto</title>
    <tooltip>A fixture missile.</tooltip>
    <damage>1</damage>
    <shots>1</shots>
    <fireChance>10</fireChance>
    <breachChance>0</breachChance>
    <cooldown>10</cooldown>
    <power>1</power>
    <cost>20</cost>
    <missiles>1</missiles>
  </weaponBlueprint>
  <augBlueprint name="O2_MASKS">
    <title>Emergency Respirators</title>
    <desc>A fixture augment.</desc>
    <cost>50</cost>
  </augBlueprint>
  <droneBlueprint name="COMBAT_1">
    <type>COMBAT</type>
    <title>Combat Drone</title>
    <cost>50</cost>
  </droneBlueprint>
  <systemBlueprint name="cloaking">
    <title>Cloaking</title>
    <desc>Hides the ship.</desc>
    <startPower>1</startPower>
    <upgradeCost>
      <level>30</level>
      <level>50</level>
    </upgradeCost>
    <cost>150</cost>
  </systemBlueprint>
  <crewBlueprint name="human">
    <title>Human</title>
    <desc>A fixture crew.</desc>
    <cost>45</cost>
  </crewBlueprint>
  <nameList race="human" sex="male">
    <name>Ada</name>
  </nameList>
</FTL>`;

const second = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="LASER_BURST_1">
    <type>LASER</type>
    <title>Second Laser</title>
    <tooltip>A fixture laser.</tooltip>
    <damage>2</damage>
    <shots>2</shots>
    <sp>1</sp>
    <fireChance>0</fireChance>
    <breachChance>0</breachChance>
    <cooldown>11</cooldown>
    <power>1</power>
    <cost>25</cost>
    <rarity>5</rarity>
  </weaponBlueprint>
  <event name="FIXTURE_BEACON">
    <text>Keep  two spaces.
And this line.</text>
  </event>
  <shipBlueprint name="PLAYER_SHIP_HARD" layout="A">
    <class>Fixture</class>
    <name>Fixture Ship</name>
  </shipBlueprint>
  <sectorDescription name="CIVILIAN" minSector="1">
    <name>Fixture Sector</name>
  </sectorDescription>
</FTL>`;

const odd = `<?xml version="1.0" encoding="UTF-8"?>
<extras>
  <note>kept</note>
</extras>`;

describe("emitFtlMod", () => {
  const xml = emitFtlMod([
    { path: "data/blueprints.xml", xml: first },
    { path: "data/events.xml", xml: second },
    { path: "data/extras.xml", xml: odd },
  ]);

  it("writes one FTL document and keeps archive tags", () => {
    const doc = parser.parseFromString(xml, "text/xml");
    assert.equal(doc.documentElement?.tagName, "FTL");
    assert.equal(xml.includes("<pack"), false);
    assert.equal(xml.includes("<facts"), false);
    const lasers = names(doc, "weaponBlueprint").filter(
      (item) => item.getAttribute("name") === "LASER_BURST_1",
    );
    assert.equal(lasers.length, 2);
    assert.deepEqual(
      lasers.map((item) => childNamed(item, "rarity")),
      ["4", "5"],
    );
    assert.equal(xml.includes("<type>MISSILES</type>"), true);
    assert.equal(text(doc, "event", "FIXTURE_BEACON", "text"), "Keep  two spaces.\nAnd this line.");
    assert.equal(attr(doc, "shipBlueprint", "PLAYER_SHIP_HARD", "layout"), "A");
    assert.equal(attr(doc, "sectorDescription", "CIVILIAN", "minSector"), "1");
    assert.equal(text(doc, "crewBlueprint", "human", "desc"), "A fixture crew.");
    assert.equal(names(doc, "nameList").length, 1);
    assert.equal(text(doc, "extras", "", "note") ?? childText(doc, "note"), "kept");
  });

  it("round-trips the blueprint catalog in file order", () => {
    const sources = [
      { path: "data/blueprints.xml", xml: first },
      { path: "data/events.xml", xml: second },
    ];
    assert.deepEqual(packFromFtlMod(emitFtlMod(sources)), packFromFtl(sources));
    const pack = packFromFtlMod(xml);
    assert.equal(pack.weapons?.find((row) => row.id === "LASER_BURST_1")?.name, "Second Laser");
    assert.equal(pack.weapons?.find((row) => row.id === "MISSILES_1")?.kind, "missile");
    assert.equal(pack.systems?.find((row) => row.id === "cloaking")?.slot, "kit");
    assert.deepEqual(pack.tunes?.find((row) => row.id === "cloaking")?.costs, [
      { level: 1, cost: 30 },
      { level: 2, cost: 50 },
    ]);
    assert.equal(pack.crew?.find((row) => row.id === "human")?.cost, 45);
    assert.equal(pack.facts, undefined);
    assert.equal(pack.names, undefined);
  });

  it("emits an empty FTL document when the archive has no XML", () => {
    const empty = emitFtlMod([]);
    const doc = parser.parseFromString(empty, "text/xml");
    assert.equal(doc.documentElement?.tagName, "FTL");
    assert.equal(doc.documentElement?.childNodes.length, 0);
  });

  it("names the archive file when XML is not well-formed", () => {
    assert.throws(
      () => emitFtlMod([{ path: "data/blueprints.xml", xml: "<FTL><weaponBlueprint></FTL>" }]),
      /data\/blueprints\.xml/,
    );
  });

  it("refuses a pack document", () => {
    assert.throws(
      () => packFromFtlMod(`<?xml version="1.0" encoding="UTF-8"?><pack/>`),
      /starts with <FTL>, found <pack>/,
    );
  });
});

function names(doc: ReturnType<DOMParser["parseFromString"]>, tag: string): XmlElement[] {
  const list = doc.getElementsByTagName(tag);
  const found: XmlElement[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list.item(i);
    if (item) found.push(item);
  }
  return found;
}

function childNamed(node: XmlElement, tag: string): string | undefined {
  for (let i = 0; i < node.childNodes.length; i++) {
    const item = node.childNodes.item(i);
    if (item?.nodeType === 1 && (item as XmlElement).tagName === tag) return item.textContent ?? "";
  }
  return undefined;
}

function text(
  doc: ReturnType<DOMParser["parseFromString"]>,
  tag: string,
  id: string,
  child: string,
): string | undefined {
  const node = names(doc, tag).find((item) => !id || item.getAttribute("name") === id);
  if (!node) return undefined;
  for (let i = 0; i < node.childNodes.length; i++) {
    const item = node.childNodes.item(i);
    if (item?.nodeType === 1 && (item as XmlElement).tagName === child) {
      return item.textContent ?? "";
    }
  }
  return undefined;
}

function childText(doc: ReturnType<DOMParser["parseFromString"]>, tag: string): string | undefined {
  return names(doc, tag)[0]?.textContent ?? undefined;
}

function attr(
  doc: ReturnType<DOMParser["parseFromString"]>,
  tag: string,
  id: string,
  name: string,
): string | null {
  const node = names(doc, tag).find((item) => item.getAttribute("name") === id);
  return node?.getAttribute(name) ?? null;
}
