/**
 * One room is one code. The publisher (the computer) and one subscriber (the phone)
 * each negotiate once. A later call with the same stage returns the stored result
 * instead of renegotiating again.
 */

import type { Established, SessionDescription, Sfu } from "./sfu.ts";

export const ROOM_TTL_MS = 15 * 60 * 1000;

export type Stage = "established" | "answered" | "ready";

export type Side = {
  sessionId: string;
  stage: Stage;
  transportChannelId: number;
  channelId?: number;
};

export type RoomSnapshot = {
  expiresAt: number;
  publisher: Side | null;
  subscriber: Side | null;
};

export type RoomResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export class RoomError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RoomError";
    this.status = status;
  }
}

export class RoomSession {
  expiresAt = 0;
  publisher: Side | null = null;
  subscriber: Side | null = null;

  static restore(raw: RoomSnapshot | null): RoomSession {
    const room = new RoomSession();
    if (!raw) return room;
    room.expiresAt = raw.expiresAt;
    room.publisher = raw.publisher ? { ...raw.publisher } : null;
    room.subscriber = raw.subscriber ? { ...raw.subscriber } : null;
    return room;
  }

  snapshot(): RoomSnapshot {
    return {
      expiresAt: this.expiresAt,
      publisher: this.publisher ? { ...this.publisher } : null,
      subscriber: this.subscriber ? { ...this.subscriber } : null,
    };
  }

  async open(sfu: Sfu, now: number): Promise<{ sessionDescription: SessionDescription }> {
    if (this.live(now)) throw new RoomError(409, "This code is already in use.");
    this.publisher = null;
    this.subscriber = null;
    this.expiresAt = 0;
    const sessionId = await sfu.createSession();
    const established = await sfu.establish(sessionId);
    this.rememberPublisher(established, sessionId, now);
    return { sessionDescription: established.sessionDescription };
  }

  async answer(sfu: Sfu, sdp: string, now: number): Promise<void> {
    const side = this.requirePublisher(now);
    if (side.stage !== "established") return;
    await sfu.renegotiate(side.sessionId, { type: "answer", sdp });
    side.stage = "answered";
  }

  async publish(sfu: Sfu, now: number): Promise<{ channelId: number }> {
    const side = this.requirePublisher(now);
    if (side.stage === "established") throw new RoomError(409, "This device is still connecting.");
    if (side.channelId !== undefined) return { channelId: side.channelId };
    const channelId = await sfu.publish(side.sessionId);
    side.channelId = channelId;
    side.stage = "ready";
    return { channelId };
  }

  async join(sfu: Sfu, now: number): Promise<{ sessionDescription: SessionDescription }> {
    this.requirePublisher(now);
    if (this.subscriber) throw new RoomError(409, "Another device already entered this code.");
    const sessionId = await sfu.createSession();
    const established = await sfu.establish(sessionId);
    this.subscriber = {
      sessionId,
      stage: "established",
      transportChannelId: established.dataChannelId,
    };
    return { sessionDescription: established.sessionDescription };
  }

  async answerJoin(sfu: Sfu, sdp: string, now: number): Promise<void> {
    this.requirePublisher(now);
    const side = this.subscriber;
    if (!side) throw new RoomError(409, "This device has not joined.");
    if (side.stage !== "established") return;
    await sfu.renegotiate(side.sessionId, { type: "answer", sdp });
    side.stage = "answered";
  }

  async subscribe(sfu: Sfu, now: number): Promise<{ channelId: number }> {
    const publisher = this.requirePublisher(now);
    const subscriber = this.subscriber;
    if (!subscriber) throw new RoomError(409, "This device has not joined.");
    if (subscriber.stage === "established") {
      throw new RoomError(409, "This device is still connecting.");
    }
    if (subscriber.channelId !== undefined) return { channelId: subscriber.channelId };
    if (publisher.stage !== "ready")
      throw new RoomError(409, "The other device is still connecting.");
    const channelId = await sfu.subscribe(subscriber.sessionId, publisher.sessionId);
    subscriber.channelId = channelId;
    subscriber.stage = "ready";
    return { channelId };
  }

  private live(now: number): boolean {
    return this.publisher !== null && now < this.expiresAt;
  }

  private requirePublisher(now: number): Side {
    if (!this.publisher || this.expiresAt === 0) {
      throw new RoomError(404, "That code is not a handoff.");
    }
    if (now >= this.expiresAt) throw new RoomError(410, "That code has expired.");
    return this.publisher;
  }

  private rememberPublisher(established: Established, sessionId: string, now: number): void {
    this.publisher = {
      sessionId,
      stage: "established",
      transportChannelId: established.dataChannelId,
    };
    this.expiresAt = now + ROOM_TTL_MS;
  }
}
