import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeAnimations, readAnimations } from "./anim.ts";

const FIRST = `<animations>
<animSheet name="gun" w="4" h="2" fw="2" fh="2">weapons/gun.png</animSheet>
<weaponAnim name="gun">
<sheet>gun</sheet>
<desc length="2" x="1" y="0"/>
<chargedFrame>1</chargedFrame>
<fireFrame>0</fireFrame>
<mountPoint x="3" y="4"/>
</weaponAnim>
<anim name="bolt">
<sheet>gun</sheet>
<desc length="2" x="0" y="0"/>
</anim>
</animations>`;

const LATER = `<animations>
<animSheet name="gun" w="8" h="2" fw="2" fh="2">weapons/gun2.png</animSheet>
<anim name="bolt">
<sheet>gun</sheet>
<desc length="1" x="0" y="0"/>
<time>0.4</time>
</anim>
</animations>`;

describe("animations", () => {
  it("reads a sheet, a weapon anim, and a clip whose time stays off the volley", () => {
    const set = readAnimations(FIRST);
    assert.equal(set.sheets[0]?.file, "img/weapons/gun.png");
    assert.equal(set.weapons[0]?.chargedFrame, 1);
    assert.equal(set.weapons[0]?.mountX, 3);
    assert.equal(set.weapons[0]?.mountY, 4);
    assert.equal(set.clips[0]?.time, 1);
    assert.equal(set.clips[0]?.name, "bolt");
  });

  it("lets the later file replace a shared name", () => {
    const set = mergeAnimations([FIRST, LATER]);
    assert.equal(set.sheets.length, 1);
    assert.equal(set.sheets[0]?.w, 8);
    assert.equal(set.sheets[0]?.file, "img/weapons/gun2.png");
    assert.equal(set.clips[0]?.length, 1);
    assert.equal(set.clips[0]?.time, 0.4);
    assert.equal(set.weapons[0]?.length, 2);
  });

  it("fails on a document that is not well-formed, like the other archive files", () => {
    assert.throws(() => readAnimations("<FTL><broken></FTL>"), /not well-formed/);
  });
});
