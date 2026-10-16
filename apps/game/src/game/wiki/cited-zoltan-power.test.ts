import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Crew } from "../types.ts";
import { createGame, settleZoltanPower, startCombat, zoltanBars } from "../sim.ts";
import { citedZoltanPower } from "./cited-zoltan-power.ts";

type Body = Pick<Crew, "kin" | "hp" | "room">;

const ROOM = "p-shields";

function spark(room: string, hp = 70): Body {
  return { kin: "energy", hp, room };
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
    const other: Body = { kin: "human", hp: 100, room: ROOM };
    assert.equal(citedZoltanPower([spark("p-engines")], ROOM), 0);
    assert.equal(citedZoltanPower([other], ROOM), 0);
  });
});

describe("zoltanBars", () => {
  it("powers the system of the room a Zoltan is standing in, including an intruder", () => {
    // Zoltans, lead: "the ship system whose corresponding room they are currently standing in".
    // Race characteristics: one yellow bar on an occupied system. Mind control leaves that bar where they stand.
    const g = createGame(6);
    startCombat(g, "scout");
    const zoltan = g.crew.find((c) => c.side === "enemy" && c.kin === "energy")!;
    const bay = g.player.rooms.find((r) => r.system === "medbay")!;
    zoltan.aboard = "player";
    zoltan.room = bay.id;
    zoltan.path = [];
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 1);
    zoltan.leashed = 10;
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 1);
    // Zoltans: as many Zoltans as power levels replace reactor power in the Medbay.
    g.player.systems.medbay.level = 1;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    delete g.player.systems.medbay.zoltanHeld;
    settleZoltanPower(g);
    assert.equal(g.player.systems.medbay.power, 0);
    assert.equal(g.player.systems.medbay.zoltanHeld, 1);
    const home = g.enemy!.rooms.find((r) => r.system === "shields")!;
    zoltan.leashed = 10;
    zoltan.aboard = "enemy";
    zoltan.room = home.id;
    assert.equal(zoltanBars(g.crew, g.enemy!, "enemy", "shields"), 1);
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 0);
  });

  it("keeps a mind-controlled Zoltan's bar on the room they still occupy", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    const friend = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
    const bay = g.player.rooms.find((r) => r.system === "medbay")!;
    const shields = zoltanBars(g.crew, g.enemy!, "enemy", "shields");
    friend.kin = "energy";
    friend.room = bay.id;
    friend.aboard = "player";
    friend.path = [];
    friend.leashed = 10;
    assert.equal(zoltanBars(g.crew, g.player, "player", "medbay"), 1);
    assert.equal(zoltanBars(g.crew, g.enemy!, "enemy", "shields"), shields);
  });

  it("powers the enemy system a boarding Zoltan stands in", () => {
    const g = createGame(6);
    startCombat(g, "scout");
    const room = g.enemy!.rooms.find((r) => r.system === "engines")!;
    const before = zoltanBars(g.crew, g.enemy!, "enemy", "engines");
    const you = g.crew.find((c) => c.side === "player" && c.hp > 0)!;
    you.kin = "energy";
    you.aboard = "enemy";
    you.room = room.id;
    you.path = [];
    assert.equal(zoltanBars(g.crew, g.enemy!, "enemy", "engines"), before + 1);
    you.leashed = 10;
    assert.equal(zoltanBars(g.crew, g.enemy!, "enemy", "engines"), before + 1);
  });
});
