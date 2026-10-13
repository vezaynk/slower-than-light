import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRUISER_PAGES } from "./layout-pages.ts";
import { hangarSheet, layoutNeedsAe, orderByIds } from "./hangar-sheet.ts";

const layouts = CRUISER_PAGES.flatMap((page) => page.layouts);

function sheet(id: string) {
  const layout = layouts.find((item) => item.id === id);
  assert.ok(layout, id);
  return hangarSheet(layout);
}

describe("hangar sheet", () => {
  it("reads Kestrel A from that layout's lines", () => {
    const row = sheet("kestrel-a");
    assert.equal(row.defaultName, "The Kestrel");
    assert.deepEqual(row.crew, ["Human", "Human", "Human"]);
    assert.deepEqual(
      row.systems.map((system) => `${system.name} ${system.level}`),
      [
        "Shields 2",
        "Engines 2",
        "Medbay 1",
        "Oxygen 1",
        "Weapon Control 3",
        "Piloting 1",
        "Sensors 1",
        "Door System 1",
      ],
    );
    assert.deepEqual(row.weapons, ["Artemis Missiles", "Burst Laser II"]);
    assert.equal(row.weaponSlots, 4);
    // "none (system not installed)" is the empty bay, not a drone.
    assert.deepEqual(row.drones, []);
    assert.equal(row.droneSystem, false);
    assert.deepEqual(row.augments, []);
    assert.equal(
      row.unlock[0],
      "Does not require unlocking (it is the only ship, the cruiser and the layout, available from the very start of the game)",
    );
    assert.equal(row.advanced, false);
  });

  it("keeps system levels out of the weapon list", () => {
    const row = sheet("zoltan-c");
    assert.equal(row.defaultName, "Cerenkov");
    assert.deepEqual(row.weapons, ["Ion Charger"]);
    assert.equal(row.systems.find((system) => system.name === "Weapons")?.level, 2);
    assert.equal(row.systems.find((system) => system.name === "Drones")?.level, 3);
    assert.deepEqual(row.drones, ["Anti-Ship Beam Drone I"]);
    assert.equal(row.droneSystem, true);
    assert.deepEqual(row.augments, ["Zoltan Shield"]);
  });

  it("reads slot lines and singular weapon headings", () => {
    const lanius = sheet("lanius-a");
    assert.deepEqual(lanius.weapons, ["Chain Burst Laser", "Ion Stunner"]);
    assert.equal(lanius.weaponSlots, 4);
    assert.equal(lanius.droneSlots, 2);
    assert.deepEqual(lanius.drones, []);
    assert.deepEqual(lanius.crew, ["Human", "Lanius", "Lanius"]);
    const stealth = sheet("stealth-b");
    assert.deepEqual(stealth.weapons, ["Glaive Beam"]);
    assert.equal(stealth.weaponSlots, 3);
    assert.deepEqual(stealth.crew, ["Human", "Human", "Zoltan"]);
    const mantis = sheet("mantis-a");
    assert.deepEqual(mantis.weapons, ["Small Bomb", "Basic Laser"]);
    assert.deepEqual(mantis.crew, ["Mantis", "Mantis", "Mantis", "Engi"]);
    assert.deepEqual(mantis.augments, ["Mantis Pheromones"]);
    const slug = sheet("slug-c");
    assert.equal(slug.defaultName, "Ariolimax");
    assert.deepEqual(slug.crew, ["Slug", "Slug", "Slug"]);
  });

  it("draws no card for a Weapons: none line, and reads bare Unlock headings", () => {
    // "The Federation Cruiser", Layout C (The Fregatidae) and "The Crystal Cruiser", Layout B print Weapons: none.
    assert.deepEqual(sheet("fed-c").weapons, []);
    assert.deepEqual(sheet("crystal-b").weapons, []);
    assert.equal(sheet("fed-c").weaponSlots, 4);
    // "The Lanius Cruiser", Layout A: "Unlock" then "Unlock 4 ships (Excluding The Kestrel) to unlock this ship."
    assert.deepEqual(sheet("lanius-a").unlock, ["Unlock 4 ships (Excluding The Kestrel) to unlock this ship."]);
    // "The Mantis Cruiser", Layout C: the "Notes:" line is not an unlock line.
    assert.equal(sheet("mantis-c").unlock.length, 1);
    assert.deepEqual(orderByIds(["a1", "b1", "a2"], ["b", "a"], (name) => name[0]), ["b1", "a1", "a2"]);
  });

  it("marks Advanced Edition only where that layout's lines say so", () => {
    const marked = layouts.filter(layoutNeedsAe).map((layout) => layout.id);
    assert.deepEqual(marked, ["kestrel-c", "engi-c", "fed-c", "zoltan-c", "slug-c", "mantis-c"]);
    assert.equal(layouts.some((layout) => layout.id === "crystal-c"), false);
    assert.equal(layouts.some((layout) => layout.id === "lanius-c"), false);
  });

  it("gives every stored layout a name and a system list", () => {
    for (const layout of layouts) {
      const row = hangarSheet(layout);
      assert.ok(row.defaultName, layout.id);
      assert.ok(row.systems.length > 0, layout.id);
    }
  });
});
