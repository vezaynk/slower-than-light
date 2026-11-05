import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import type { EventDef } from "./types.ts";
import { onPackWarning } from "./warnings.ts";

const PAGE: EventDef = {
  id: "ember-quest-page",
  dest: "Ember",
  flag: "ember-quest-page",
  aliases: [],
  sectors: [],
  body: "Ember.",
  choices: [
    {
      id: "ember-go",
      label: "Go",
      fx: [
        { k: "note", text: "They send coordinates." },
        { k: "quest", id: "ember-quest" },
        { k: "close" },
      ],
    },
    { id: "ember-bare", label: "Bare", fx: [{ k: "quest", id: "ember-bare" }] },
  ],
};

describe("quest tags", () => {
  it("writes ftl.dat's <quest event> inside the result event and reads the quest back", () => {
    const xml = emitPack({ events: [PAGE] });
    assert.match(
      xml,
      /<event>\s*<text>They send coordinates\.<\/text>\s*<quest event="arrive-ember-quest"\/>\s*<\/event>/,
    );
    assert.match(xml, /<event>\s*<quest event="arrive-ember-bare"\/>\s*<\/event>/);
    assert.doesNotMatch(xml, /<effect k="quest"/);
    const back = parsePack(xml).events?.find((row) => row.id === PAGE.id);
    assert.deepEqual(back?.choices[0]?.fx, PAGE.choices[0]?.fx);
    assert.deepEqual(back?.choices[1]?.fx, PAGE.choices[1]?.fx);
  });

  it("warns on a campaign quest that names no arrive- page", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const xml = emitPack({ events: [PAGE] }).replace("arrive-ember-bare", "SOMEWHERE");
      const back = parsePack(xml).events?.find((row) => row.id === PAGE.id);
      assert.deepEqual(back?.choices[1]?.fx, [{ k: "nothing" }]);
      assert.ok(warnings.some((line) => line.includes("SOMEWHERE")));
    } finally {
      restore();
    }
  });
});
