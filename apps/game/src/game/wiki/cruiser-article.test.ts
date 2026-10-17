import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "../pack/base.ts";
import { cruiserArticle } from "./hangar-bay.ts";

function texts(id: string): string[] {
  const lines = cruiserArticle(id);
  assert.ok(lines, id);
  return lines.map((line) => line.text);
}

describe("cruiser article", () => {
  it("prints the Kestrel from the loaded ship, with Oxygen before Medbay", () => {
    assert.deepEqual(cruiserArticle("PLAYER_SHIP_HARD"), [
      {
        depth: 0,
        text: '"This class of ship was decommissioned from Federation service years ago. After a number of refits and updating, this classic ship is ready for battle."',
      },
      { depth: 1, text: "Default name: The Kestrel" },
      { depth: 1, text: "Reactor: 8" },
      { depth: 1, text: "Crew:" },
      { depth: 2, text: "Human (3)" },
      { depth: 1, text: "Systems:" },
      { depth: 2, text: "Shields (2)" },
      { depth: 2, text: "Engines (2)" },
      { depth: 2, text: "Oxygen (1)" },
      { depth: 2, text: "Medbay (1)" },
      { depth: 2, text: "Weapons (3)" },
      { depth: 2, text: "Sensors (1)" },
      { depth: 2, text: "Piloting (1)" },
      { depth: 2, text: "Door System (1)" },
      { depth: 1, text: "Weapons (4 slots):" },
      { depth: 2, text: "Burst Laser II" },
      { depth: 2, text: "Artemis Missiles" },
      { depth: 1, text: "Drones (2 slots):" },
      { depth: 2, text: "none (system not installed)" },
      { depth: 1, text: "Resources:" },
      { depth: 2, text: "16 Fuel" },
      { depth: 2, text: "8 Missiles" },
      { depth: 2, text: "2 Drone parts" },
      { depth: 0, text: "Unlock:" },
      {
        depth: 1,
        text: "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)",
      },
    ]);
  });

  it("keeps both Federation unlock paragraphs and leaves augments off", () => {
    const lines = cruiserArticle("PLAYER_SHIP_FED");
    assert.ok(lines);
    assert.deepEqual(
      lines.filter((line) => line.depth === 1 && lines.indexOf(line) > lines.findIndex((row) => row.text === "Unlock:")).map((line) => line.text),
      [
        "Defeat the Flagship prototype in the Rebel Stronghold sector to unlock this ship.",
        "Alternatively, defeat the Rebel Flagship with the Engi Cruiser.",
      ],
    );
    assert.equal(lines.some((line) => line.text === "Augmentations:"), false);
  });

  it("lists Engi B schematics, the unfitted drone, and the augment", () => {
    const shown = texts("PLAYER_SHIP_CIRCLE_2");
    assert.equal(shown.includes("none (system not installed)"), false);
    assert.deepEqual(
      shown.slice(shown.indexOf("Drones (3 slots):") + 1, shown.indexOf("Augmentations:")),
      ["System Repair Drone", "System Repair Drone", "Anti-Personnel Drone"],
    );
    assert.equal(shown[shown.indexOf("Augmentations:") + 1], "Drone Reactor Booster");
    assert.ok(shown.includes("Engi (1)"));
  });

  it("names Federation C's Flak Artillery and its respirators", () => {
    const shown = texts("PLAYER_SHIP_FED_3");
    assert.ok(shown.includes("Flak Artillery (1)"));
    assert.equal(shown.includes("Medbay (0)"), false);
    assert.equal(shown.includes("Medbay (1)"), false);
    const weapons = shown.indexOf("Weapons (4 slots):");
    const drones = shown.indexOf("Drones (2 slots):");
    assert.ok(weapons >= 0 && drones === weapons + 1);
    assert.ok(shown.includes("Augmentations:"));
    assert.ok(shown.includes("Emergency Respirators"));
    assert.deepEqual(
      ["Human (1)", "Zoltan (2)", "Mantis (1)"].every((line) => shown.includes(line)),
      true,
    );
  });

  it("is absent for a ship the pack does not have", () => {
    assert.equal(cruiserArticle("no-such-ship"), undefined);
  });
});
