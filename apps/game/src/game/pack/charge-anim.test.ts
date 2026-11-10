import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAnimations } from "@stl/pack";
import "@stl/sim/pack/base.ts";
import { weaponAccentHot, weaponSheetCharged } from "@stl/sim/sim.ts";
import type { WeaponInst } from "@stl/sim/types.ts";
import {
  chargeAnimProgress,
  chargingFrameIndex,
  rememberArchive,
  weaponChargeAlpha,
  weaponChargeFrame,
} from "./media.ts";

describe("weapon charge animation", () => {
  it("runs the charge frames over the whole charge with no delay", () => {
    assert.equal(chargeAnimProgress(0), 0);
    assert.equal(chargeAnimProgress(0.5), 0.5);
    assert.equal(chargeAnimProgress(1), 1);
    // chargedFrame 5: frames 0 to 4 play while charging.
    assert.equal(chargingFrameIndex(5, 0), 0);
    assert.equal(chargingFrameIndex(5, 0.5), 2);
    assert.equal(chargingFrameIndex(5, 0.99), 4);
    assert.equal(chargingFrameIndex(5, 1), 4);
    assert.equal(chargingFrameIndex(0, 0.7), 0);
  });

  it("holds a bomb launcher idle until 98% of the charge", () => {
    assert.equal(chargeAnimProgress(0.5, 0.98), 0);
    assert.equal(chargeAnimProgress(0.98, 0.98), 0);
    assert.ok(Math.abs(chargeAnimProgress(0.99, 0.98) - 0.5) < 1e-9);
    assert.equal(chargeAnimProgress(1, 0.98), 1);
    assert.equal(chargeAnimProgress(1, 1), 1);
  });

  it("reads delayChargeAnim and the charge image path", () => {
    const set = readAnimations(`<FTL>
      <weaponAnim name="bomb_1"><sheet>bomb_1</sheet><desc length="17" x="0" y="0"/>
        <chargedFrame>5</chargedFrame><fireFrame>16</fireFrame>
        <delayChargeAnim>0.98</delayChargeAnim><chargeImage>weapons/bomblauncher_1_glow.png</chargeImage>
      </weaponAnim>
    </FTL>`);
    const anim = set.weapons.find((row) => row.name === "bomb_1");
    assert.equal(anim?.delayChargeAnim, 0.98);
    assert.equal(anim?.chargeImage, "weapons/bomblauncher_1_glow.png");
  });

  it("draws a charge image from its picture path, brighter as the bomb charges", async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    await rememberArchive(
      [
        {
          path: "data/animations.xml",
          xml: `<animations>
            <animSheet name="ember_bomb" w="35" h="52" fw="35" fh="52">weapons/ember_bomb.png</animSheet>
            <weaponAnim name="ember_bomb"><sheet>ember_bomb</sheet><desc length="1" x="0" y="0"/>
              <chargedFrame>0</chargedFrame><fireFrame>0</fireFrame>
              <delayChargeAnim>0.98</delayChargeAnim><chargeImage>weapons/ember_bomb_glow.png</chargeImage>
            </weaponAnim>
          </animations>`,
        },
      ],
      new Map([
        ["img/weapons/ember_bomb.png", png],
        ["img/weapons/ember_bomb_glow.png", png],
      ]),
    );
    try {
      const glow = weaponChargeFrame("ember_bomb");
      assert.ok(glow?.url, "the glow picture is found by its path");
      assert.equal(glow?.fw, 35);
      assert.equal(glow?.fh, 52);
      assert.equal(weaponChargeAlpha("ember_bomb", "idle", 0.5), 0);
      assert.ok(weaponChargeAlpha("ember_bomb", "idle", 0.99) > 0);
      assert.equal(weaponChargeAlpha("ember_bomb", "charged"), 1);
      assert.equal(weaponChargeAlpha("ember_bomb", "fire", 1), 0);
      // The accent lights a pip early, at 95%. The sheet stays idle there, so the delayed burst still plays.
      const bomb = { defId: "ember_bomb", charge: 0.95 } as WeaponInst;
      assert.equal(weaponAccentHot(bomb), true);
      assert.equal(weaponSheetCharged(bomb), false);
      assert.equal(weaponChargeAlpha("ember_bomb", "idle", bomb.charge), 0);
      assert.equal(weaponSheetCharged({ ...bomb, charge: 1 }), true);
    } finally {
      await rememberArchive([], new Map());
    }
  });
});
