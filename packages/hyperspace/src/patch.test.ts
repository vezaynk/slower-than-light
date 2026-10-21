import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOMParser } from "@xmldom/xmldom";
import { patchDocument } from "./patch.ts";

const parser = new DOMParser();

const BASE = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>First</title>
  </weaponBlueprint>
  <weaponBlueprint name="EMBER">
    <type>LASER</type>
    <title>Last</title>
  </weaponBlueprint>
  <weaponBlueprint name="SPARK">
    <type>MISSILE</type>
    <title>Spark</title>
  </weaponBlueprint>
  <crewBlueprint name="human">
    <title>Human</title>
    <desc>The standard crew.</desc>
  </crewBlueprint>
</FTL>
`;

function texts(xml: string, tag: string): string[] {
  const doc = parser.parseFromString(xml, "text/xml");
  const nodes = doc.getElementsByTagName(tag);
  const found: string[] = [];
  for (let i = 0; i < nodes.length; i++) found.push(nodes.item(i)?.textContent ?? "");
  return found;
}

describe("patchDocument", () => {
  it("findName defaults to the last match and appends a child", () => {
    const xml = patchDocument(
      BASE,
      `<FTL>
        <mod:findName type="weaponBlueprint" name="EMBER">
          <mod-append:cost>9</mod-append:cost>
        </mod:findName>
      </FTL>`,
      "append",
    );
    const costs = texts(xml, "cost");
    assert.deepEqual(costs, ["9"]);
    assert.equal(xml.includes("<title>Last</title>"), true);
  });

  it("reads an append with several top-level elements and no root, as Slipstream wraps it", () => {
    const xml = patchDocument(
      BASE,
      `<?xml version="1.0" encoding="UTF-8"?>
<weaponBlueprint name="NOVA">
  <type>BEAM</type>
  <title>Nova</title>
</weaponBlueprint>
<mod:findName type="weaponBlueprint" name="SPARK">
  <mod-overwrite:title>Spark II</mod-overwrite:title>
</mod:findName>`,
      "append",
      { path: "data/blueprints.xml.append" },
    );
    assert.deepEqual(texts(xml, "title"), ["First", "Last", "Spark II", "Human", "Nova"]);
  });

  it("runs a find in a later FTL section, and a find nested inside one", () => {
    const siblings = `<FTL>
<weaponBlueprint name="NOVA">
  <type>BEAM</type>
  <title>Nova</title>
</weaponBlueprint>
</FTL>
<FTL>
<mod:findName type="weaponBlueprint" name="SPARK">
  <mod-overwrite:title>Spark II</mod-overwrite:title>
</mod:findName>
</FTL>`;
    const nested = `<FTL>
  <weaponBlueprint name="NOVA">
    <type>BEAM</type>
    <title>Nova</title>
  </weaponBlueprint>
  <FTL>
    <mod:findName type="weaponBlueprint" name="SPARK">
      <mod-overwrite:title>Spark II</mod-overwrite:title>
    </mod:findName>
  </FTL>
</FTL>`;
    for (const patch of [siblings, nested]) {
      const xml = patchDocument(BASE, patch, "append");
      assert.deepEqual(texts(xml, "title"), ["First", "Last", "Spark II", "Human", "Nova"]);
      assert.equal((xml.match(/<FTL\b/g) ?? []).length, 1);
      assert.equal(xml.includes("mod:findName"), false);
    }
  });

  it("throws when panic is set and a find matches nothing", () => {
    const patch = `<FTL><mod:findName type="crewBlueprint" name="missing" panic="true"><mod-append:maxHealth>1</mod-append:maxHealth></mod:findName></FTL>`;
    assert.throws(
      () => patchDocument(BASE, patch, "append", { path: "data/blueprints.xml.append" }),
      /matched nothing/,
    );
    assert.throws(
      () => patchDocument(BASE, patch.replace(' panic="true"', ""), "append", { panic: true }),
      /matched nothing/,
    );
    const kept = patchDocument(BASE, patch.replace(' panic="true"', ""), "append");
    assert.equal(kept.includes("maxHealth"), false);
  });

  it("edits with findLike, overwrite, attributes, and remove", () => {
    const xml = patchDocument(
      BASE,
      `<FTL>
        <mod:findName type="weaponBlueprint" name="SPARK" reverse="false">
          <mod:findLike type="title">
            <mod:selector>Spark</mod:selector>
            <mod:setValue>  Flare  </mod:setValue>
          </mod:findLike>
          <mod-overwrite:type>LASER</mod-overwrite:type>
          <mod:setAttributes img="spark"/>
          <mod:removeAttributes name=""/>
        </mod:findName>
        <mod:findWithChildLike type="crewBlueprint" child-type="title">
          <mod:selector>Human</mod:selector>
          <mod:removeTag/>
        </mod:findWithChildLike>
      </FTL>`,
      "append",
    );
    assert.equal(xml.includes(">Flare<"), true);
    assert.equal(xml.includes(">Spark<"), false);
    assert.equal(xml.includes('img="spark"'), true);
    assert.equal(xml.includes('name="SPARK"'), false);
    assert.equal(xml.includes("crewBlueprint"), false);
    assert.equal(texts(xml, "type").filter((value) => value === "LASER").length >= 1, true);
  });

  it("unions and intersects finds, and ignores commands inside the par", () => {
    const xml = patchDocument(
      BASE,
      `<FTL>
        <mod:findComposite>
          <mod:par op="AND">
            <mod:findLike type="weaponBlueprint"/>
            <mod:findName type="weaponBlueprint" name="EMBER"/>
            <mod:findName type="weaponBlueprint" name="EMBER">
              <mod:setValue>ignored</mod:setValue>
            </mod:findName>
          </mod:par>
          <mod-append:cost>4</mod-append:cost>
        </mod:findComposite>
        <mod:findComposite>
          <mod:par op="OR">
            <mod:findName type="weaponBlueprint" name="none"/>
            <mod:findLike type="weaponBlueprint"><mod:selector name="SPARK"/></mod:findLike>
          </mod:par>
          <mod:setAttributes short="yes"/>
        </mod:findComposite>
      </FTL>`,
      "append",
    );
    assert.equal((xml.match(/<cost>4<\/cost>/g) ?? []).length, 1);
    assert.equal(xml.includes("ignored"), false);
    assert.equal(xml.includes('short="yes"'), true);
  });

  it("matches only the context's direct children", () => {
    const events = `<FTL>
      <event name="ROOT">
        <text>Top</text>
        <choice name="go"><text>Go</text></choice>
      </event>
      <eventList name="LIST">
        <event name="NESTED"><text>Inside</text></event>
        <event load="A"/>
      </eventList>
      <choice name="decoy"><text>No</text></choice>
    </FTL>`;
    const top = patchDocument(
      events,
      `<FTL>
        <mod:findLike type="choice"><mod:setAttributes patched="yes"/></mod:findLike>
        <mod:findLike type="event"><mod-append:seen/></mod:findLike>
      </FTL>`,
      "append",
    );
    assert.equal(top.includes('<choice name="decoy" patched="yes">'), true);
    assert.equal(top.includes('name="go" patched="yes"'), false);
    const listAt = top.indexOf("<eventList");
    assert.equal(top.slice(0, listAt).includes("<seen"), true);
    assert.equal(top.slice(listAt).includes("<seen"), false);
    const nested = patchDocument(
      events,
      `<FTL>
        <mod:findName type="event" name="ROOT">
          <mod:findLike type="text"><mod:setValue>Changed</mod:setValue></mod:findLike>
        </mod:findName>
        <mod:findName type="eventList" name="LIST">
          <mod:findLike type="event"><mod-append:seen/></mod:findLike>
        </mod:findName>
      </FTL>`,
      "append",
    );
    assert.equal(nested.includes("<text>Changed</text>"), true);
    assert.equal(nested.includes("<text>Go</text>"), true);
    assert.equal((nested.match(/<seen\/>/g) ?? []).length, 2);
  });

  it("throws when a par has no op", () => {
    assert.throws(
      () =>
        patchDocument(
          BASE,
          `<FTL><mod:findComposite><mod:par><mod:findName type="weaponBlueprint" name="EMBER"/></mod:par></mod:findComposite></FTL>`,
          "append",
        ),
      /mod:par needs an op/,
    );
  });

  it("searches inside the current match and leaves a nested command literal", () => {
    const xml = patchDocument(
      BASE,
      `<FTL>
        <mod:findName type="crewBlueprint" name="human">
          <mod:findName type="title">
            <mod:setValue>Person</mod:setValue>
          </mod:findName>
          <mod-append:desc><mod:setValue>literal</mod:setValue></mod-append:desc>
        </mod:findName>
      </FTL>`,
      "append",
    );
    assert.deepEqual(texts(xml, "title"), ["First", "Last", "Spark", "Person"]);
    assert.equal(/<mod:setValue\b[^>]*>literal<\/mod:setValue>/.test(xml), true);
    assert.equal(texts(xml, "desc").includes("The standard crew."), true);
  });

  it("overwrites the first child of a tag and appends when there is none", () => {
    const xml = patchDocument(
      BASE,
      `<FTL>
        <mod:findName type="weaponBlueprint" name="SPARK" reverse="false">
          <mod-overwrite:title>Renamed</mod-overwrite:title>
          <mod-overwrite:cost>3</mod-overwrite:cost>
        </mod:findName>
      </FTL>`,
      "append",
    );
    assert.equal(xml.includes(">Spark<"), false);
    assert.equal(xml.includes("<title>Renamed</title>"), true);
    assert.equal(xml.includes("<cost>3</cost>"), true);
  });

  it("raw append keeps inner spaces and a raw clobber replaces the file", () => {
    const appended = patchDocument(
      `<?xml version="1.0" encoding="UTF-8"?>\n<FTL>\n  <a>keep</a>\n</FTL>\n`,
      `<FTL><b> tail </b></FTL>`,
      "rawappend",
    );
    assert.equal(appended.includes("<a>keep</a>"), true);
    assert.equal(appended.includes("<b> tail </b>"), true);
    assert.equal(appended.includes("<FTL><FTL>"), false);
    assert.equal(patchDocument(BASE, "<FTL><only/></FTL>", "rawclobber"), "<FTL><only/></FTL>");
  });

  it("names the append file when it is not well-formed", () => {
    assert.throws(
      () =>
        patchDocument(BASE, "<weaponBlueprint>", "append", { path: "data/blueprints.xml.append" }),
      /data\/blueprints\.xml\.append/,
    );
  });
});
