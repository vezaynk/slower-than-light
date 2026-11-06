import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { loadPack, resetPackForTests } from "@stl/pack";
import "./pack/base.ts";
import { shownEventTitle } from "./event-title.ts";

afterEach(() => resetPackForTests());

describe("event card heading", () => {
  it("drops an archive event id that stood in for a missing title", () => {
    assert.equal(shownEventTitle("REBEL_VS_FEDERATION"), undefined);
    assert.equal(shownEventTitle("AUTO_DEFENSE_RADAR"), undefined);
    assert.equal(shownEventTitle(""), undefined);
    assert.equal(shownEventTitle(undefined), undefined);
  });

  it("drops a loaded lower-case event id too", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-page",
            dest: "ember-page",
            flag: "ember-page",
            aliases: [],
            sectors: [],
            body: "Ember.",
            choices: [],
          },
        ],
      },
      "append",
    );
    assert.equal(shownEventTitle("ember-page"), undefined);
  });

  it("keeps a written title", () => {
    assert.equal(shownEventTitle("Auto-ship near radar station"), "Auto-ship near radar station");
    assert.equal(shownEventTitle("Ember"), "Ember");
  });
});
