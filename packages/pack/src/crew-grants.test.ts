import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packFromFtl } from "./ftl.ts";
import { onPackWarning } from "./warnings.ts";

function grantsOf(xml: string) {
  const pack = packFromFtl([{ path: "data/events.xml", xml: `<FTL>${xml}</FTL>` }]);
  return pack.events?.[0]?.grants ?? [];
}

describe("crewMember skill attributes", () => {
  it("reads all_skills, and a named skill wins over it", () => {
    const [grant] = grantsOf(
      `<event name="VIRUS"><text>Hi.</text><crewMember amount="1" class="engi" all_skills="2" pilot="1" id="Virus"/></event>`,
    );
    assert.deepEqual(grant?.skills, {
      pilot: 1,
      engines: 2,
      shields: 2,
      weapons: 2,
      repair: 2,
      combat: 2,
    });
  });

  it("reads one skill alone and leaves the rest unset", () => {
    const [grant] = grantsOf(
      `<event name="CHARLIE"><text>Hi.</text><crewMember weapons="1" amount="1"/></event>`,
    );
    assert.deepEqual(grant?.skills, { weapons: 1 });
  });

  it("clamps a level outside 0-2 with a warning", () => {
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      const [grant] = grantsOf(
        `<event name="OVER"><text>Hi.</text><crewMember class="human" repair="5"/></event>`,
      );
      assert.deepEqual(grant?.skills, { repair: 2 });
      assert.ok(warnings.some((line) => line.includes("repair")));
    } finally {
      restore();
    }
  });
});
