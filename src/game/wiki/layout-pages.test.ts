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
      "kestrel-a",
      "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)",
    );
    line("kestrel-a", "Weapon Control (3)");
    line("kestrel-a", "Door System (1)");
    line("kestrel-a", "none (system not installed)");
    line("kestrel-b", "none (requires system)");
    line("stealth-a", "none (and requires system)");
    line("mantis-a", "Starting Crew: 3 Mantis, 1 Engi");
    line("mantis-a", "Doors (1)");
    line("mantis-a", "Slots: 3 Weapon, 2 Drone (requires system)");
    line("mantis-b", "Default Name: The Basilisk");
    line("zoltan-c", "none (requires system)");
    line("zoltan-c", "Anti-Ship Beam Drone I");
    line("slug-c", "Starting crew: 3 Slug");
    assert.equal(
      layouts.find((item) => item.id === "kestrel-a")?.figureFile,
      "KestralASystems.png",
    );
    assert.equal(layouts.find((item) => item.id === "kestrel-b")?.figureFile, "KestralB.png");
    assert.equal(layouts.find((item) => item.id === "lanius-b")?.heading, "Layout B");
    assert.equal(layouts.some((item) => item.id === "lanius-c"), false);
    assert.equal(layouts.some((item) => item.id === "crystal-c"), false);
  });
});
