import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./cited-fuel.ts";

describe("cited fuel pages", () => {
  it("does not invent a sector", () => {
    assert.deepEqual(
      EXTRA_EVENTS.map((ev) => ev.dest),
      [
        "No fuel: Rebel fleet delay",
        "No fuel: friendly refugee",
        "No fuel: Slug fuel trader",
        "No fuel: drifting debris",
        "No fuel: fuel trader (distress off)",
        "No fuel: fuel trader (distress on)",
        "No fuel: prepare to dock",
        "No fuel: refugee trading",
      ],
    );
    for (const ev of EXTRA_EVENTS) {
      assert.deepEqual(ev.sectors, []);
      assert.equal(ev.flag, `cited:${ev.slug}`);
      assert.ok(ev.body.length <= 240);
      assert.ok(ev.choices.length >= 1);
    }
  });

  it("quotes the Rebel fleet delay as one jump, then another event", () => {
    // Wiki citations:
    // > "Rebel Fleet pursuit is delayed for 1 jump." — [[No fuel: Rebel fleet delay]]
    // > "Another out of fuel event occurs." — [[No fuel: Rebel fleet delay]]
    const ev = EXTRA_EVENTS.find((row) => row.dest === "No fuel: Rebel fleet delay");
    assert.ok(ev);
    assert.equal(ev.body, "");
    assert.equal(ev.choices.length, 1);
    // "Rebel Fleet pursuit is delayed for 1 jump."
    assert.deepEqual(ev.choices[0].fx[0], { k: "fleet", n: 1 });
    // "Another out of fuel event occurs."
    assert.deepEqual(ev.choices[0].fx[1], { k: "note", text: "Another out of fuel event occurs." });
    assert.equal(ev.choices[0].fx.length, 2);
  });

  it("quotes the friendly refugee as medium fuel only, 2-4", () => {
    // Wiki citations:
    // > "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you." — [[No fuel: friendly refugee]]
    // > "You receive medium fuel." — [[No fuel: friendly refugee]]
    const ev = EXTRA_EVENTS.find((row) => row.dest === "No fuel: friendly refugee");
    assert.ok(ev);
    assert.equal(
      ev.body,
      "While it doesn't have much fuel to spare, it recognizes you are part of the Federation and offers to split its remaining fuel with you.",
    );
    assert.ok(ev.body.length <= 240);
    // "You receive {{tooltip|medium|2-4}} [[Rewards#Fuel only|fuel]]."
    assert.deepEqual(ev.choices[0].fx, [{ k: "res", id: "fuel", sign: 1, lo: 2, hi: 4 }]);
  });
});
