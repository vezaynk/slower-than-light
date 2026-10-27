import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { hullById } from "./hulls.ts";
import { createGame } from "./sim.ts";
import { UNIFORMS, crewPool, defaultPicks, randomName, uniformOf } from "./crew-look.ts";

const NAMES = `<?xml version="1.0" encoding="UTF-8"?>
<nameLists>
  <nameList race="human" sex="male"><name>Alice Chen</name></nameList>
  <nameList race="human" sex="female"><name>Bea Diaz</name></nameList>
  <nameList race="mantis" sex="male"><name>Kazaakplethkilik</name></nameList>
  <nameList race="human" sex="male" language="es"><name>No Espanol</name></nameList>
  <nameList><name>Sector Name</name></nameList>
</nameLists>
`;

describe("hangar crew picks", () => {
  it("start the run with the names and uniforms chosen per seat", () => {
    const picks = [
      { name: "  Rhea   Moss ", uniform: 3 },
      { name: "", uniform: 1 },
      { name: "Tov", uniform: 99 },
    ];
    const g = createGame(7, "PLAYER_SHIP_HARD", "normal", picks);
    const crew = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(
      crew.map((c) => c.name),
      ["Rhea Moss", defaultPicks(2)[1].name, "Tov"],
    );
    assert.deepEqual(
      crew.map((c) => c.uniform),
      [3, 1, 0],
    );
    assert.equal(uniformOf(crew[0]), UNIFORMS[3]);
  });

  it("keep seat order and lineage from the hull spec", () => {
    const g = createGame(7, "PLAYER_SHIP_FED", "normal", defaultPicks(4));
    const crew = g.crew.filter((c) => c.side === "player");
    assert.deepEqual(
      crew.map((c) => c.kin),
      hullById("PLAYER_SHIP_FED")?.crew.map((s) => s.kin),
    );
    assert.deepEqual(
      crew.map((c) => c.name),
      defaultPicks(4).map((p) => p.name),
    );
  });

  it("dress enemies in red and old saves by tone", () => {
    assert.equal(uniformOf({ side: "enemy", tone: 0, uniform: 2 }), UNIFORMS[UNIFORMS.length - 1]);
    assert.equal(uniformOf({ side: "player", tone: 1 }), UNIFORMS[1]);
  });
});

describe("crew names", () => {
  it("keeps the stand-in pool", () => {
    assert.equal(crewPool()[0], "Ada Voss");
    assert.notEqual(
      randomName(() => 0),
      "Crew",
    );
  });

  it("reads data/names.xml when the stand-in lists are empty", async () => {
    try {
      packFromFtl([{ path: "data/names.xml", xml: NAMES }]);
      assert.equal(crewPool()[0], "Ada Voss");
      assert.notEqual(
        randomName(() => 0),
        "Alice Chen",
      );
      loadPack(
        {
          textLists: [
            { id: "CREW_POOL", lines: [] },
            { id: "NAME_SYLLABLES", lines: [] },
          ],
        },
        "append",
      );
      assert.deepEqual(crewPool(), ["Alice Chen", "Bea Diaz", "Kazaakplethkilik"]);
      assert.equal(
        randomName(() => 0),
        "Alice Chen",
      );
      assert.equal(
        randomName(() => 0.9),
        "Kazaakplethkil",
      );
    } finally {
      await installStandIn();
    }
  });

  it("invents a name when the archive has neither list", () => {
    loadPack(
      {
        textLists: [
          { id: "CREW_POOL", lines: [] },
          { id: "NAME_SYLLABLES", lines: [] },
        ],
      },
      "append",
    );
    try {
      assert.equal(crewPool()[0], "Ada Voss");
      assert.equal(
        randomName(() => 0),
        "Ka Kaka",
      );
    } finally {
      resetPackForTests();
    }
  });
});
