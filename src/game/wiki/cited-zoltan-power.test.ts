import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Crew } from "../types.ts";
import { createGame, startCombat, zoltanBars } from "../sim.ts";
import { citedZoltanPower } from "./cited-zoltan-power.ts";

type Body = Pick<Crew, "kin" | "hp" | "room">;

const ROOM = "p-shields";

function spark(room: string, hp = 70): Body {
  return { kin: "spark", hp, room };
}

describe("citedZoltanPower", () => {
  it("counts one living spark in the system room as 1", () => {
    assert.equal(citedZoltanPower([spark(ROOM)], ROOM), 1);
  });

  it("counts two living sparks in the system room as 2", () => {
    const crew = [spark(ROOM), spark(ROOM)];
    const before = crew.map((member) => ({ ...member }));
    assert.equal(citedZoltanPower(crew, ROOM), 2);
    assert.deepEqual(crew, before);
  });

  it("counts a dead spark as 0", () => {
    assert.equal(citedZoltanPower([spark(ROOM, 0)], ROOM), 0);
  });

  it("counts a spark in another room and any other race as 0", () => {
    const other: Body = { kin: "plain", hp: 100, room: ROOM };
    assert.equal(citedZoltanPower([spark("p-engines")], ROOM), 0);
    assert.equal(citedZoltanPower([other], ROOM), 0);
  });
});

describe("zoltanBars (INTENTIONALLY OVERRIDING SPEC)", () => {
  it("an intruding Zoltan powers nothing on the other side's ship; a mind-controlled one powers its captor's", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    const zoltan = g.crew.find((c) => c.side === "enemy" && c.kin === "spark")!;
    const bay = g.player.rooms.find((r) => r.system === "medbay")!;
    zoltan.aboard = "player";
    zoltan.room = bay.id;
    zoltan.path = [];
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 0);
    zoltan.leashed = 10;
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 1);
    // At home it powers its own ship's system.
    zoltan.leashed = 0;
    const home = g.enemy!.rooms.find((r) => r.system === "shields")!;
    zoltan.aboard = "enemy";
    zoltan.room = home.id;
    assert.equal(zoltanBars(g.crew, g.enemy!, "enemy", "shields"), 1);
  });
});
