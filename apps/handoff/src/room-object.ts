import { DurableObject } from "cloudflare:workers";
import type { HandoffEnv } from "./env.ts";
import { RoomError, RoomSession, type RoomResult, type RoomSnapshot } from "./room.ts";
import { CloudflareSfu, SfuError, type SessionDescription, type Sfu } from "./sfu.ts";

/**
 * One Durable Object per code. SFU calls on that object run one at a time.
 * The snapshot is saved after a stage change, including when the SFU call throws,
 * so a retry does not renegotiate a step that already landed.
 */
export class HandoffRoom extends DurableObject<HandoffEnv> {
  #tail: Promise<void> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: HandoffEnv) {
    super(ctx, env);
  }

  async open(): Promise<RoomResult<{ sessionDescription: SessionDescription }>> {
    return this.#run((room, sfu, now) => room.open(sfu, now));
  }

  async answer(sdp: string): Promise<RoomResult<{ ok: true }>> {
    return this.#run(async (room, sfu, now) => {
      await room.answer(sfu, sdp, now);
      return { ok: true as const };
    });
  }

  async publish(): Promise<RoomResult<{ channelId: number }>> {
    return this.#run((room, sfu, now) => room.publish(sfu, now));
  }

  async join(): Promise<RoomResult<{ sessionDescription: SessionDescription }>> {
    return this.#run((room, sfu, now) => room.join(sfu, now));
  }

  async answerJoin(sdp: string): Promise<RoomResult<{ ok: true }>> {
    return this.#run(async (room, sfu, now) => {
      await room.answerJoin(sfu, sdp, now);
      return { ok: true as const };
    });
  }

  async subscribe(): Promise<RoomResult<{ channelId: number }>> {
    return this.#run((room, sfu, now) => room.subscribe(sfu, now));
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }

  #sfu(): Sfu | null {
    const appId = this.env.REALTIME_SFU_APP_ID;
    const secret = this.env.REALTIME_SFU_APP_SECRET;
    if (!appId || !secret) return null;
    return new CloudflareSfu(appId, secret);
  }

  #run<T>(fn: (room: RoomSession, sfu: Sfu, now: number) => Promise<T>): Promise<RoomResult<T>> {
    const run = this.#tail.then(async () => {
      const sfu = this.#sfu();
      if (!sfu) {
        return { ok: false, status: 503, error: "The handoff service is not configured." } as const;
      }
      const stored = await this.ctx.storage.get<RoomSnapshot>("room");
      const room = RoomSession.restore(stored ?? null);
      const now = Date.now();
      try {
        const value = await fn(room, sfu, now);
        await this.#persist(room, now);
        return { ok: true, value } as const;
      } catch (err) {
        await this.#persist(room, now);
        return failure(err);
      }
    });
    this.#tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async #persist(room: RoomSession, now: number): Promise<void> {
    const snap = room.snapshot();
    if (!snap.publisher) {
      await this.ctx.storage.delete("room");
      if ((await this.ctx.storage.getAlarm()) !== null) await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.put("room", snap);
    if (snap.expiresAt > now) await this.ctx.storage.setAlarm(snap.expiresAt);
  }
}

function failure(err: unknown): RoomResult<never> {
  if (err instanceof RoomError) return { ok: false, status: err.status, error: err.message };
  if (err instanceof SfuError) {
    console.error("sfu", err.status);
    if (err.status === 401 || err.status === 403) {
      return { ok: false, status: 503, error: "The handoff service is not configured." };
    }
  } else {
    console.error("handoff", err instanceof Error ? err.name : "error");
  }
  return { ok: false, status: 502, error: "The handoff service could not open a connection." };
}
