import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { INTRUDER } from "./cited-intruder.ts";

const src = readFileSync(new URL("./cited-intruder.ts", import.meta.url), "utf8");

describe("Ion Intruder pulse", () => {
  it("records power, ion, and stun", () => {
    assert.equal(INTRUDER.power, 3);
    assert.equal(INTRUDER.ion, 3);
    assert.equal(INTRUDER.stunSeconds, 6);
  });

  it("keeps the pulse a range", () => {
    assert.equal(INTRUDER.pulseMin, 8.2);
    assert.equal(INTRUDER.pulseMax, 10);
    assert.notEqual(INTRUDER.pulseMin, INTRUDER.pulseMax);
    assert.ok(INTRUDER.pulseMax > INTRUDER.pulseMin);
    assert.equal("pulse" in INTRUDER, false);
    assert.equal("cooldown" in INTRUDER, false);
    assert.deepEqual(Object.keys(INTRUDER), ["power", "ion", "stunSeconds", "pulseMin", "pulseMax"]);
  });

  it("comments the sentences and does not fire", () => {
    assert.match(src, /Power requirement: 3 power/);
    assert.match(
      src,
      /Periodically emits an ion blast that deals 3 ion damage to the system and stuns enemy crew, then moves to a different system/,
    );
    assert.match(src, /Pulse time varies between 8\.2 and 10 seconds\. Stun lasts for 6 seconds/);
    assert.match(src, /The blast is not fired/);
    assert.equal(src.includes("function "), false);
    assert.equal(src.includes("export function"), false);
    assert.equal(src.includes("export const pulse"), false);
  });
});
