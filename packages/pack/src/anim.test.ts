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
    assert.equal(set.weapons[0]?.firePoint, undefined);
    assert.deepEqual(set.weapons[0]?.fireSounds, []);
    assert.equal(set.weapons[0]?.chargeImage, undefined);
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

  it("reads the fire point, every fire sound, and the charge image", () => {
    const set = readAnimations(`<animations>
<weaponAnim name="gun">
<sheet>gun</sheet>
<desc length="1" x="0" y="0"/>
<firePoint x="8" y="5"/>
<fireSound>heavy1</fireSound>
<fireSound>heavy2</fireSound>
<chargeImage>gun_glow</chargeImage>
</weaponAnim>
<weaponAnim name="plain">
<sheet>gun</sheet>
<desc length="1" x="0" y="0"/>
<firePoint x="0" y="0"/>
<fireSound> </fireSound>
</weaponAnim>
</animations>`);
    assert.deepEqual(set.weapons[0]?.firePoint, { x: 8, y: 5 });
    assert.deepEqual(set.weapons[0]?.fireSounds, ["heavy1", "heavy2"]);
    assert.equal(set.weapons[0]?.chargeImage, "gun_glow");
    assert.deepEqual(set.weapons[1]?.firePoint, { x: 0, y: 0 });
    assert.deepEqual(set.weapons[1]?.fireSounds, []);
    assert.equal(set.weapons[1]?.chargeImage, undefined);
  });

  it("fails on a document that is not well-formed, like the other archive files", () => {
    assert.throws(() => readAnimations("<FTL><broken></FTL>"), /not well-formed/);
  });
});
