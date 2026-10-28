import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handle, matchRoute, type RoomCaller, type RoomNamespace } from "./http.ts";
import type { RoomResult } from "./room.ts";

const OFFER = { type: "offer" as const, sdp: "v=0\r\noffer" };

function caller(result: (method: string, sdp?: string) => RoomResult<never> | RoomResult<object>): {
  rooms: RoomNamespace;
  calls: { code: string; method: string; sdp?: string }[];
} {
  const calls: { code: string; method: string; sdp?: string }[] = [];
  const rooms: RoomNamespace = {
    getByName(code: string): RoomCaller {
      const run = (method: string, sdp?: string) => {
        calls.push({ code, method, sdp });
        return Promise.resolve(result(method, sdp) as RoomResult<object>);
      };
      return {
        open: () => run("open") as Promise<RoomResult<{ sessionDescription: typeof OFFER }>>,
        answer: (sdp: string) => run("answer", sdp) as Promise<RoomResult<{ ok: true }>>,
        publish: () => run("publish") as Promise<RoomResult<{ channelId: number }>>,
        join: () => run("join") as Promise<RoomResult<{ sessionDescription: typeof OFFER }>>,
        answerJoin: (sdp: string) => run("join-answer", sdp) as Promise<RoomResult<{ ok: true }>>,
        subscribe: () => run("subscribe") as Promise<RoomResult<{ channelId: number }>>,
      };
    },
  };
  return { rooms, calls };
}

const secrets = { REALTIME_SFU_APP_ID: "app", REALTIME_SFU_APP_SECRET: "secret" };

describe("handoff http", () => {
  it("matches the phone answer separately from the join", () => {
    assert.deepEqual(matchRoute("POST", "/v1/rooms/ABCDEF/join/answer"), {
      name: "join-answer",
      code: "ABCDEF",
    });
    assert.deepEqual(matchRoute("POST", "/v1/rooms/ABCDEF/join"), {
      name: "join",
      code: "ABCDEF",
    });
    assert.equal(matchRoute("GET", "/v1/rooms"), null);
  });

  it("answers a preflight without opening a room", async () => {
    const { rooms, calls } = caller(() => ({ ok: false, status: 500, error: "no" }));
    const response = await handle(
      new Request("https://handoff.test/v1/rooms", { method: "OPTIONS" }),
      secrets,
      rooms,
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(calls.length, 0);
  });

  it("stays unavailable until the SFU credentials exist", async () => {
    const { rooms, calls } = caller(() => ({ ok: false, status: 500, error: "no" }));
    const response = await handle(
      new Request("https://handoff.test/v1/rooms", { method: "POST" }),
      {},
      rooms,
    );
    assert.equal(response.status, 503);
    assert.equal(calls.length, 0);
  });

  it("retries a code that is already live", async () => {
    const { rooms, calls } = caller((method) => {
      if (method === "open" && calls.length === 1) {
        return { ok: false, status: 409, error: "This code is already in use." };
      }
      return { ok: true, value: { sessionDescription: OFFER } };
    });
    const codes = ["AAAAAA", "BBBBBB"];
    const response = await handle(
      new Request("https://handoff.test/v1/rooms", { method: "POST" }),
      secrets,
      rooms,
      () => codes.shift() ?? "CCCCCC",
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: "BBBBBB", sessionDescription: OFFER });
    assert.deepEqual(
      calls.map((call) => call.code),
      ["AAAAAA", "BBBBBB"],
    );
  });

  it("normalizes the typed code and forwards the answer", async () => {
    const { rooms, calls } = caller(() => ({ ok: true, value: { ok: true } }));
    const response = await handle(
      new Request("https://handoff.test/v1/rooms/abc%20def/answer", {
        method: "POST",
        body: JSON.stringify({ sdp: "v=0\r\nanswer" }),
      }),
      secrets,
      rooms,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ code: "ABCDEF", method: "answer", sdp: "v=0\r\nanswer" }]);
  });

  it("rejects a code that is not six unambiguous characters", async () => {
    const { rooms, calls } = caller(() => ({ ok: true, value: { ok: true } }));
    const response = await handle(
      new Request("https://handoff.test/v1/rooms/ABCDE0/join", { method: "POST" }),
      secrets,
      rooms,
    );
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
});
