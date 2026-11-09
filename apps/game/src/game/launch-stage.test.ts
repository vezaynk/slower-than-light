import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialStage, openingControlLabel, relaunchReloads } from "./launch-stage.ts";

describe("launch stage", () => {
  it("opens setup on a first visit", () => {
    assert.equal(initialStage({ urlArchive: false, launched: false, launchNow: false }), "setup");
  });

  it("boots straight to the title after a launch, a reload from setup, or a ?dat= link", () => {
    assert.equal(initialStage({ urlArchive: false, launched: true, launchNow: false }), "booting");
    assert.equal(initialStage({ urlArchive: false, launched: false, launchNow: true }), "booting");
    assert.equal(initialStage({ urlArchive: true, launched: false, launchNow: false }), "booting");
  });

  it("says Launch on the server and the first paint, and Loading the game files only after a remembered boot", () => {
    assert.equal(openingControlLabel("setup"), "Launch");
    assert.equal(
      openingControlLabel(initialStage({ urlArchive: false, launched: false, launchNow: false })),
      "Launch",
    );
    assert.equal(
      openingControlLabel(initialStage({ urlArchive: false, launched: true, launchNow: false })),
      "Loading the game files",
    );
    assert.equal(
      openingControlLabel(initialStage({ urlArchive: true, launched: false, launchNow: false })),
      "Loading the game files",
    );
  });

  it("reloads a relaunch only when the file order changed", () => {
    assert.equal(relaunchReloads("a|b", "a|b"), false);
    assert.equal(relaunchReloads("a|c", "a|b"), true);
    assert.equal(relaunchReloads("a|c", "url"), false);
    assert.equal(relaunchReloads("a|c", undefined), false);
  });
});
