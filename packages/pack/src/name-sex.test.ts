import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "./extras/name-lists.ts";
import { crewNameSex, crewNames, crewNamesOfSex } from "./extras/name-lists.ts";
import { packFromFtl } from "./ftl.ts";

const NAMES = `<FTL>
  <nameList race="human" sex="male"><name>Arlo</name><name>Kip</name></nameList>
  <nameList race="human" sex="female"><name>Bea</name></nameList>
  <nameList race="human" sex="male" language="de"><name>Hans</name></nameList>
  <nameList race="human" sex="other"><name>Quill</name></nameList>
</FTL>`;

describe("name list sex", () => {
  it("keeps one pool per race and remembers each name's list", () => {
    packFromFtl([{ path: "data/names.xml", xml: NAMES }]);
    assert.deepEqual(crewNames("human"), ["Arlo", "Kip", "Bea", "Quill"]);
    assert.deepEqual(crewNamesOfSex("human", "male"), ["Arlo", "Kip"]);
    assert.deepEqual(crewNamesOfSex("human", "female"), ["Bea"]);
    assert.equal(crewNameSex("Bea"), "female");
    assert.equal(crewNameSex("Kip"), "male");
    // A translation is skipped, and a sex that is neither keeps the name unsexed.
    assert.equal(crewNameSex("Hans"), undefined);
    assert.equal(crewNameSex("Quill"), undefined);
  });
});
