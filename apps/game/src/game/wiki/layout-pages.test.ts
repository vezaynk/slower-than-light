import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRUISER_PAGES, PLAYABLE_SHIPS } from "./layout-pages.ts";

const layouts = CRUISER_PAGES.flatMap((page) => page.layouts);

function line(id: string, text: string) {
  const layout = layouts.find((item) => item.id === id);
  assert.ok(layout, id);
  assert.ok(
    layout.lines.some((item) => item.text === text),
    `${id} missing ${text}`,
  );
}

describe("cruiser layout pages", () => {
  it("keeps the Ship page's ten classes and layout rules", () => {
    assert.equal(PLAYABLE_SHIPS.heading, "Playable ships");
    assert.deepEqual(
      PLAYABLE_SHIPS.rows.flat().map((cell) => cell.page),
      [
        "The Kestrel Cruiser",
        "The Engi Cruiser",
        "The Federation Cruiser",
        "The Zoltan Cruiser",
        "The Lanius Cruiser",
        "The Stealth Cruiser",
        "The Rock Cruiser",
        "The Slug Cruiser",
        "The Mantis Cruiser",
        "The Crystal Cruiser",
      ],
    );
    assert.equal(
      PLAYABLE_SHIPS.layouts[2]?.text,
      "Layout C - reach sector 8 with Layout B and Advanced Edition Content enabled.",
    );
    assert.equal(PLAYABLE_SHIPS.layouts.at(-1)?.text, "Do not have Layout C.");
  });

  it("keeps each page's own field labels", () => {
    assert.equal(layouts.length, 28);
    line(
      "PLAYER_SHIP_HARD",
      "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)",
    );
    line("PLAYER_SHIP_HARD", "Weapon Control (3)");
    line("PLAYER_SHIP_HARD", "Door System (1)");
    line("PLAYER_SHIP_HARD", "none (system not installed)");
    line("PLAYER_SHIP_HARD_2", "none (requires system)");
    line("PLAYER_SHIP_STEALTH", "none (and requires system)");
    line("PLAYER_SHIP_MANTIS", "Starting Crew: 3 Mantis, 1 Engi");
    line("PLAYER_SHIP_MANTIS", "Doors (1)");
    line("PLAYER_SHIP_MANTIS", "Slots: 3 Weapon, 2 Drone (requires system)");
    line("PLAYER_SHIP_MANTIS_2", "Default Name: The Basilisk");
    line("PLAYER_SHIP_ENERGY_3", "none (requires system)");
    line("PLAYER_SHIP_ENERGY_3", "Anti-Ship Beam Drone I");
    line("PLAYER_SHIP_JELLY_3", "Starting crew: 3 Slug");
    assert.equal(
      layouts.find((item) => item.id === "PLAYER_SHIP_HARD")?.figureFile,
      "KestralASystems.png",
    );
    assert.equal(layouts.find((item) => item.id === "PLAYER_SHIP_HARD_2")?.figureFile, "KestralB.png");
    assert.equal(layouts.find((item) => item.id === "PLAYER_SHIP_ANAEROBIC_2")?.heading, "Layout B");
    assert.equal(layouts.some((item) => item.id === "lanius-c"), false);
    assert.equal(layouts.some((item) => item.id === "crystal-c"), false);
  });
});
