import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "./sim.ts";
import type { Crew } from "./types.ts";

function body(partial: Pick<Crew, "id" | "name" | "side" | "room"> & Partial<Crew>): Crew {
  return {
    aboard: "player",
    hp: 100,
    maxHp: 100,
    path: [],
    move: 0,
    think: 10,
    tone: 0,
    ...partial,
  };
}

describe("zoltan death burst", () => {
  it("deals 15 HP to an enemy in the same room and not to one elsewhere", () => {
    const g = createGame(1);
    startCombat(g, "scout");
    const spark = body({
      id: "z",
      name: "Zed",
      side: "player",
      room: "p-sensors",
      kin: "spark",
      hp: 0,
      maxHp: 70,
    });
    const ally = body({ id: "ally", name: "Pell", side: "player", room: "p-sensors", hp: 90 });
    const near = body({ id: "near", name: "Near", side: "enemy", room: "p-sensors", hp: 100 });
    const far = body({ id: "far", name: "Far", side: "enemy", room: "p-doors", hp: 80 });
    g.crew.push(spark, ally, near, far);
    step(g, 0);
    assert.equal(near.hp, 85);
    assert.equal(far.hp, 80);
    assert.equal(ally.hp, 90);
    assert.equal(
      g.crew.some((c) => c.id === "z"),
      false,
    );
  });

  it("does not burst when a human dies", () => {
    const g = createGame(2);
    startCombat(g, "scout");
    const plain = body({
      id: "h",
      name: "Hue",
      side: "player",
      room: "p-sensors",
      kin: "plain",
      hp: 0,
    });
    const near = body({ id: "near", name: "Near", side: "enemy", room: "p-sensors", hp: 100 });
    g.crew.push(plain, near);
    step(g, 0);
    assert.equal(near.hp, 100);

    const g2 = createGame(3);
    startCombat(g2, "scout");
    const unmarked = body({
      id: "u",
      name: "Una",
      side: "player",
      room: "p-oxygen",
      hp: 0,
    });
    const near2 = body({ id: "near2", name: "Near2", side: "enemy", room: "p-oxygen", hp: 40 });
    g2.crew.push(unmarked, near2);
    step(g2, 0);
    assert.equal(near2.hp, 40);
  });
});
