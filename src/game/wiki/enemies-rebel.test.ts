import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTO_ROWS, REBEL_ROWS, type EnemyRow } from "./enemies-rebel.ts";

const INVENTED = ["Cinder picket", "Margin cutter", "Ash barge", "Hullhook", "Gate hunter"];

const REBEL_IDS = [
  "rebel-fighter",
  "rebel-invader",
  "rebel-rigger",
  "rebel-disruptor",
  "elite-fighter",
  "elite-assault",
];

const AUTO_IDS = ["auto-scout", "auto-surveyor", "auto-assault", "auto-hacker"];

function assertRow(row: EnemyRow, page: string) {
  assert.ok(row.name.trim().length > 0, row.id);
  assert.ok(row.source.includes(page), row.id);
  assert.match(row.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, row.id);
  assert.equal(row.weapons, undefined, row.id);
  assert.equal(row.drones, undefined, row.id);
  assert.equal(row.hull, undefined, row.id);
  assert.equal(row.shields, undefined, row.id);
  assert.equal(row.engines, undefined, row.id);
  assert.ok(row.notes.length > 0, row.id);
  assert.ok(
    row.notes.some((note) => note.includes("positions are a picture, not copied.")),
    row.id,
  );
  assert.ok(
    row.notes.some((note) => note.includes("shared pool")),
    row.id,
  );
  const blob = `${row.id}\n${row.name}\n${row.source}\n${row.crew ?? ""}\n${row.notes.join("\n")}`;
  for (const invented of INVENTED) {
    assert.equal(blob.includes(invented), false, invented);
  }
}

describe("rebel and auto wiki rows", () => {
  it("uses the page headings and not the invented sim names", () => {
    assert.deepEqual(
      REBEL_ROWS.map((row) => row.id),
      REBEL_IDS,
    );
    assert.deepEqual(
      AUTO_ROWS.map((row) => row.id),
      AUTO_IDS,
    );
    for (const row of REBEL_ROWS) assertRow(row, "Rebel Ships");
    for (const row of AUTO_ROWS) assertRow(row, "AI-Controlled Rebel Ships");
  });

  it("keeps each pirate twin on the rebel heading that names it", () => {
    const pirates = ["Pirate Fighter", "Pirate Invader", "Pirate Rigger", "Pirate Disruptor"];
    for (const pirate of pirates) {
      const hits = REBEL_ROWS.filter((row) => row.name.includes(pirate) || row.notes.some((note) => note.includes(pirate)));
      assert.equal(hits.length, 1, pirate);
    }
    assert.equal(
      REBEL_ROWS.some((row) => row.id.startsWith("pirate-")),
      false,
    );
  });

  it("records the stated ranges and leaves drone-less ships off the drone pool", () => {
    const fighter = REBEL_ROWS.find((row) => row.id === "rebel-fighter");
    const assault = AUTO_ROWS.find((row) => row.id === "auto-assault");
    const scout = AUTO_ROWS.find((row) => row.id === "auto-scout");
    assert.ok(fighter);
    assert.ok(assault);
    assert.ok(scout);
    assert.equal(fighter.crew, "3-5 Human (Pirate crew is 3-5 random)");
    assert.ok(fighter.notes.some((note) => note.includes("Hull: 10-17 (9-16 on Easy).")));
    assert.ok(scout.notes.some((note) => note.includes("Hull: 6-13 (5-12 on Easy).")));
    assert.ok(assault.notes.some((note) => note.includes("Weapon Control 0-6")));
    assert.ok(assault.notes.some((note) => note.includes("Combat Drone Mark I")));
    assert.ok(scout.notes.some((note) => note.includes("page drone pool is not copied")));
    assert.equal(scout.crew, undefined);
  });
});
