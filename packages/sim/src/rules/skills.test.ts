import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { createGame, repairPace, startCombat, step } from "../sim.ts";
import "../pack/base.ts";
import { XP_NEED } from "../content.ts";
import {
  combatSkillMult,
  enginesEvasion,
  pilotEvasion,
  repairSkillMult,
  shieldsRecharge,
  weaponsCharge,
} from "./skills.ts";
import type { Game } from "../types.ts";

function lone(g: Game) {
  startCombat(g, "Rebel ship");
  const room = g.player.rooms.find((r) => r.system && r.system !== "oxygen")!;
  const worker = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
  const away = g.player.rooms.find((r) => r.id !== room.id)!;
  for (const c of g.crew)
    if (c.side === "player" && c.id !== worker.id && c.room === room.id) c.room = away.id;
  worker.room = room.id;
  worker.path = [];
  worker.stun = 0;
  worker.kin = "human";
  return { worker, roomId: room.id, sys: room.system! };
}

describe("skill speed from the gap", () => {
  it("uses FTL's 1 / 1.1 / 1.2 for repair and combat", () => {
    assert.deepEqual(
      [0, 1, 2].map((rank) => repairSkillMult(rank as 0 | 1 | 2)),
      [1, 1.1, 1.2],
    );
    assert.deepEqual(
      [0, 1, 2].map((rank) => combatSkillMult(rank as 0 | 1 | 2)),
      [1, 1.1, 1.2],
    );
    assert.deepEqual(
      [0, 1, 2].map((rank) => pilotEvasion(rank as 0 | 1 | 2)),
      [5, 7, 10],
    );
    assert.deepEqual(
      [0, 1, 2].map((rank) => enginesEvasion(rank as 0 | 1 | 2)),
      [5, 7, 10],
    );
    assert.deepEqual(
      [0, 1, 2].map((rank) => shieldsRecharge(rank as 0 | 1 | 2)),
      [1.1, 1.2, 1.3],
    );
    assert.deepEqual(
      [0, 1, 2].map((rank) => weaponsCharge(rank as 0 | 1 | 2)),
      [0.9, 0.85, 0.8],
    );
  });

  it("a gap file that sets repair2 changes how fast that crew fixes a bar", () => {
    loadPack(
      packFromFtl([{ path: "data/gap.xml", xml: `<FTL><skillSpeed repair2="2"/></FTL>` }]),
      "append",
    );
    try {
      assert.equal(repairSkillMult(2), 2);
      assert.equal(repairSkillMult(1), 1.1);
      const rates = ([0, 2] as const).map((rank) => {
        const g = createGame(5);
        const { worker, roomId, sys } = lone(g);
        worker.skills = { repair: rank * XP_NEED.repair };
        const room = g.player.rooms.find((r) => r.id === roomId)!;
        room.fire = 0;
        room.breach = 0;
        room.o2 = 100;
        const bar = g.player.systems[sys as keyof typeof g.player.systems];
        bar.damage = 1;
        bar.fix = 0;
        step(g, 0.05);
        return bar.fix;
      });
      assert.ok(rates[0]! > 0);
      assert.ok(Math.abs(rates[1]! / rates[0]! - 2) < 1e-6);
    } finally {
      resetPackForTests();
      assert.equal(repairSkillMult(2), 1.2);
    }
  });

  it("repair pace follows the loaded multiplier", () => {
    const g = createGame(3);
    const { worker } = lone(g);
    worker.skills = { repair: 2 * XP_NEED.repair };
    assert.ok(Math.abs(repairPace(worker) - 1.2) < 1e-9);
  });
});
