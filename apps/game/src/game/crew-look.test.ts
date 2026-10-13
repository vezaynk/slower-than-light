import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNIFORMS, defaultPicks, uniformOf } from "./crew-look.ts";
import { hullById } from "./hulls.ts";
import { createGame } from "./sim.ts";

describe("hangar crew picks", () => {
  it("start the run with the names and uniforms chosen per seat", () => {
    const picks = [
      { name: "  Rhea   Moss ", uniform: 3 },
      { name: "", uniform: 1 },
      { name: "Tov", uniform: 99 },
    ];
    const g = createGame(7, "kestrel-a", "normal", picks);
    const crew = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(crew.map((c) => c.name), ["Rhea Moss", defaultPicks(2)[1].name, "Tov"]);
    assert.deepEqual(crew.map((c) => c.uniform), [3, 1, 0]);
    assert.equal(uniformOf(crew[0]), UNIFORMS[3]);
  });

  it("keep seat order and lineage from the hull spec", () => {
    const g = createGame(7, "fed-a", "normal", defaultPicks(4));
    const crew = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(crew.map((c) => c.kin), hullById("fed-a")?.crew.map((s) => s.kin));
    assert.deepEqual(crew.map((c) => c.name), defaultPicks(4).map((p) => p.name));
  });

  it("dress enemies in red and old saves by tone", () => {
    assert.equal(uniformOf({ side: "enemy", tone: 0, uniform: 2 }), UNIFORMS[UNIFORMS.length - 1]);
    assert.equal(uniformOf({ side: "player", tone: 1 }), UNIFORMS[1]);
  });
});
