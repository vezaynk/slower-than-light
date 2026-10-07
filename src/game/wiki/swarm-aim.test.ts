import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SWARM_CUTS, swarmAimRolls, swarmLanding, type SwarmRoom } from "./swarm-aim.ts";

const bp = (n: number) => n / 10000;

const narrow: SwarmRoom = { id: "n", x: 1, y: 0, w: 1, h: 2 };
const west: SwarmRoom = { id: "w", x: 0, y: 0, w: 1, h: 1 };
const east: SwarmRoom = { id: "e", x: 2, y: 0, w: 1, h: 2 };
const vertical = [narrow, west, east];

const wide: SwarmRoom = { id: "n", x: 0, y: 1, w: 2, h: 1 };
const northL: SwarmRoom = { id: "nl", x: 0, y: 0, w: 1, h: 1 };
const northR: SwarmRoom = { id: "nr", x: 1, y: 0, w: 1, h: 1 };
const southL: SwarmRoom = { id: "sl", x: 0, y: 2, w: 1, h: 1 };
const horizontal = [wide, northL, northR, southL];

describe("swarm aim", () => {
  it("keeps a 1x2 shot in the room under 67.85 percent", () => {
    assert.equal(swarmAimRolls(narrow), true);
    assert.deepEqual(swarmLanding(vertical, "n", 0), { kind: "stay" });
    assert.deepEqual(swarmLanding(vertical, "n", bp(6784)), { kind: "stay" });
  });

  it("puts the other 1x2 shots on the four long-side tiles", () => {
    assert.deepEqual(swarmLanding(vertical, "n", SWARM_CUTS[0]), { kind: "room", roomId: "w" });
    assert.deepEqual(swarmLanding(vertical, "n", bp(6785 + 804 - 1)), { kind: "room", roomId: "w" });
    assert.deepEqual(swarmLanding(vertical, "n", SWARM_CUTS[1]), { kind: "miss" });
    assert.deepEqual(swarmLanding(vertical, "n", SWARM_CUTS[2]), { kind: "room", roomId: "e" });
    assert.deepEqual(swarmLanding(vertical, "n", SWARM_CUTS[3]), { kind: "room", roomId: "e" });
    assert.deepEqual(swarmLanding(vertical, "n", bp(9999)), { kind: "room", roomId: "e" });
  });

  it("uses the same split on a 2x1, north then south", () => {
    assert.equal(swarmAimRolls(wide), true);
    assert.deepEqual(swarmLanding(horizontal, "n", SWARM_CUTS[0]), { kind: "room", roomId: "nl" });
    assert.deepEqual(swarmLanding(horizontal, "n", SWARM_CUTS[1]), { kind: "room", roomId: "nr" });
    assert.deepEqual(swarmLanding(horizontal, "n", SWARM_CUTS[2]), { kind: "room", roomId: "sl" });
    assert.deepEqual(swarmLanding(horizontal, "n", SWARM_CUTS[3]), { kind: "miss" });
  });

  it("keeps a 2x2 shot in that room and does not treat the roll as a split", () => {
    const box: SwarmRoom = { id: "b", x: 0, y: 0, w: 2, h: 2 };
    assert.equal(swarmAimRolls(box), false);
    assert.deepEqual(swarmLanding([box, west], "b", 0.99), { kind: "stay" });
  });

  it("leaves shapes with no printed percent on the aimed room", () => {
    const one: SwarmRoom = { id: "o", x: 0, y: 0, w: 1, h: 1 };
    const three: SwarmRoom = { id: "t", x: 0, y: 0, w: 3, h: 1 };
    const punched: SwarmRoom = { id: "p", x: 0, y: 0, w: 2, h: 2, omit: [{ x: 1, y: 1 }] };
    assert.equal(swarmAimRolls(one), false);
    assert.equal(swarmAimRolls(three), false);
    assert.equal(swarmAimRolls(punched), false);
    assert.deepEqual(swarmLanding([one, three, punched], "o", 0.99), { kind: "stay" });
    assert.deepEqual(swarmLanding([one, three, punched], "t", 0.1), { kind: "stay" });
    assert.deepEqual(swarmLanding([one, three, punched], "p", 0.5), { kind: "stay" });
  });
});
