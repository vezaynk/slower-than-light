import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROOM_TTL_MS, RoomError, RoomSession } from "./room.ts";
import type { Established, SessionDescription, Sfu } from "./sfu.ts";

class FakeSfu implements Sfu {
  readonly calls: string[] = [];
  establishError: Error | null = null;

  async createSession(): Promise<string> {
    this.calls.push("create");
    return `sess-${this.calls.filter((call) => call === "create").length}`;
  }

  async establish(sessionId: string): Promise<Established> {
    this.calls.push(`establish:${sessionId}`);
    if (this.establishError) {
      const error = this.establishError;
      this.establishError = null;
      throw error;
    }
    return {
      sessionDescription: { type: "offer", sdp: `offer-${sessionId}` },
      dataChannelId: 1,
    };
  }

  async renegotiate(sessionId: string, answer: SessionDescription): Promise<void> {
    this.calls.push(`renegotiate:${sessionId}:${answer.type}`);
  }

  async publish(sessionId: string): Promise<number> {
    this.calls.push(`publish:${sessionId}`);
    return 7;
  }

  async subscribe(sessionId: string, publisherSessionId: string): Promise<number> {
    this.calls.push(`subscribe:${sessionId}:${publisherSessionId}`);
    return 9;
  }
}

function statusOf(err: unknown): number {
  assert.ok(err instanceof RoomError);
  return err.status;
}

describe("handoff room", () => {
  it("negotiates the publisher once, then the phone", async () => {
    const room = new RoomSession();
    const sfu = new FakeSfu();
    const opened = await room.open(sfu, 0);
    assert.equal(opened.sessionDescription.sdp, "offer-sess-1");
    await room.answer(sfu, "answer-sdp", 1);
    await room.answer(sfu, "answer-sdp", 2);
    const published = await room.publish(sfu, 3);
    const again = await room.publish(sfu, 4);
    assert.deepEqual(published, { channelId: 7 });
    assert.deepEqual(again, { channelId: 7 });

    const joined = await room.join(sfu, 5);
    assert.equal(joined.sessionDescription.sdp, "offer-sess-2");
    await room.answerJoin(sfu, "phone-sdp", 6);
    await room.answerJoin(sfu, "phone-sdp", 7);
    const subscribed = await room.subscribe(sfu, 8);
    assert.deepEqual(subscribed, { channelId: 9 });

    assert.deepEqual(sfu.calls, [
      "create",
      "establish:sess-1",
      "renegotiate:sess-1:answer",
      "publish:sess-1",
      "create",
      "establish:sess-2",
      "renegotiate:sess-2:answer",
      "subscribe:sess-2:sess-1",
    ]);
  });

  it("refuses a second phone and a subscribe that arrives too early", async () => {
    const room = new RoomSession();
    const sfu = new FakeSfu();
    await room.open(sfu, 0);
    await room.answer(sfu, "answer-sdp", 1);
    await room.join(sfu, 2);
    await room.answerJoin(sfu, "phone-sdp", 3);
    assert.equal(statusOf(await room.subscribe(sfu, 4).catch((err: unknown) => err)), 409);
    assert.equal(statusOf(await room.join(sfu, 5).catch((err: unknown) => err)), 409);
    await room.publish(sfu, 6);
    assert.deepEqual(await room.subscribe(sfu, 7), { channelId: 9 });
  });

  it("does not keep a room when the transport offer fails", async () => {
    const room = new RoomSession();
    const sfu = new FakeSfu();
    sfu.establishError = new Error("down");
    await assert.rejects(() => room.open(sfu, 0), /down/);
    assert.equal(room.publisher, null);
    const opened = await room.open(sfu, 1);
    assert.equal(opened.sessionDescription.sdp, "offer-sess-2");
  });

  it("lets an expired code be opened again", async () => {
    const room = new RoomSession();
    const sfu = new FakeSfu();
    await room.open(sfu, 0);
    assert.equal(statusOf(await room.join(sfu, ROOM_TTL_MS).catch((err: unknown) => err)), 410);
    const reopened = await room.open(sfu, ROOM_TTL_MS);
    assert.equal(reopened.sessionDescription.sdp, "offer-sess-2");
  });

  it("answers with 404 before a room exists and 409 before the computer has answered", async () => {
    const room = new RoomSession();
    const sfu = new FakeSfu();
    assert.equal(statusOf(await room.answer(sfu, "sdp", 0).catch((err: unknown) => err)), 404);
    await room.open(sfu, 1);
    assert.equal(statusOf(await room.publish(sfu, 2).catch((err: unknown) => err)), 409);
  });
});
