import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Crew } from "../types.ts";
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
