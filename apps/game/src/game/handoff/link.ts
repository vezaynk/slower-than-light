/**
 * The two browsers meet through the handoff service. Each one keeps its own WebRTC
 * connection to Cloudflare Realtime's SFU. The typed code names the room. The game
 * files travel on a data channel named stl-handoff.
 *
 * The phone's first message is "ready", which the SFU consumes as the delivery gate.
 * "hello" is the next message, and the computer waits for it before any file bytes.
 */

import { handoffOrigin, postJson, RelayError, normalizeCode } from "./relay.ts";
import { armChannel, waitForText } from "./transfer.ts";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
};

const CONNECT_MS = 20_000;
const HELLO_MS = 3 * 60_000;
const CONNECT_FAILED = "The two devices could not connect. Enter the code again.";
const NOT_CONFIGURED = "Phone handoff is not set up on this copy of the game.";
const CHANNEL_NAME = "stl-handoff";

export type SendLink = {
  code: Promise<string>;
  channel: Promise<RTCDataChannel>;
  close(): void;
};

export type ReceiveLink = {
  channel: Promise<RTCDataChannel>;
  close(): void;
};

export function createSendLink(signal: AbortSignal): SendLink {
  const origin = handoffOrigin();
  const pc = origin ? new RTCPeerConnection(RTC_CONFIG) : null;
  const retained: RTCDataChannel[] = [];
  let app: RTCDataChannel | null = null;
  if (pc) retainTransport(pc, retained);

  let resolveCode: (code: string) => void = () => {};
  let rejectCode: (err: Error) => void = () => {};
  const code = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const channel = (async () => {
    try {
      if (!origin || !pc) throw new Error(NOT_CONFIGURED);
      const created = await postJson(`${origin}/v1/rooms`, {}, signal);
      const roomCode = readCode(created);
      const offer = readOffer(created);
      resolveCode(roomCode);
      await answerTransport(pc, offer, signal);
      await postJson(`${origin}/v1/rooms/${roomCode}/answer`, { sdp: localSdp(pc) }, signal);
      await waitConnected(pc, signal);
      const published = await postJson(`${origin}/v1/rooms/${roomCode}/publish`, {}, signal);
      const dc = pc.createDataChannel(CHANNEL_NAME, {
        negotiated: true,
        id: readChannelId(published),
      });
      app = dc;
      armChannel(dc);
      await waitOpen(dc, signal);
      await waitForText(dc, "hello", signal, HELLO_MS);
      return dc;
    } catch (err) {
      const error = asError(err);
      rejectCode(error);
      pc?.close();
      throw error;
    }
  })();

  return {
    code,
    channel,
    close() {
      app?.close();
      for (const extra of retained) extra.close();
      pc?.close();
    },
  };
}

export function createReceiveLink(roomCode: string, signal: AbortSignal): ReceiveLink {
  const origin = handoffOrigin();
  const pc = origin ? new RTCPeerConnection(RTC_CONFIG) : null;
  const retained: RTCDataChannel[] = [];
  let app: RTCDataChannel | null = null;
  if (pc) retainTransport(pc, retained);

  const channel = (async () => {
    try {
      if (!origin || !pc) throw new Error(NOT_CONFIGURED);
      const joined = await postJson(`${origin}/v1/rooms/${roomCode}/join`, {}, signal);
      await answerTransport(pc, readOffer(joined), signal);
      await postJson(`${origin}/v1/rooms/${roomCode}/join/answer`, { sdp: localSdp(pc) }, signal);
      await waitConnected(pc, signal);
      const subscribed = await subscribeWhenReady(origin, roomCode, signal);
      const dc = pc.createDataChannel(CHANNEL_NAME, { negotiated: true, id: subscribed });
      app = dc;
      armChannel(dc);
      await waitOpen(dc, signal);
      dc.send("ready");
      dc.send("hello");
      return dc;
    } catch (err) {
      pc?.close();
      throw asError(err);
    }
  })();

  return {
    channel,
    close() {
      app?.close();
      for (const extra of retained) extra.close();
      pc?.close();
    },
  };
}

function retainTransport(pc: RTCPeerConnection, retained: RTCDataChannel[]): void {
  pc.addEventListener("datachannel", (ev) => {
    retained.push(ev.channel);
  });
}

async function answerTransport(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit,
  signal: AbortSignal,
): Promise<void> {
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitIce(pc, signal);
}

async function subscribeWhenReady(
  origin: string,
  roomCode: string,
  signal: AbortSignal,
): Promise<number> {
  const deadline = Date.now() + HELLO_MS;
  for (;;) {
    if (signal.aborted) throw new Error("The handoff was cancelled.");
    try {
      const payload = await postJson(`${origin}/v1/rooms/${roomCode}/subscribe`, {}, signal);
      return readChannelId(payload);
    } catch (err) {
      if (err instanceof RelayError && err.status === 409 && Date.now() < deadline) {
        await delay(1000, signal);
        continue;
      }
      throw err;
    }
  }
}

function waitIce(pc: RTCPeerConnection, signal: AbortSignal): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = (err?: Error) => {
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
      signal.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const onAbort = () => finish(new Error("The handoff was cancelled."));
    const timer = window.setTimeout(() => finish(), 5000);
    pc.addEventListener("icegatheringstatechange", onChange);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function waitConnected(pc: RTCPeerConnection, signal: AbortSignal): Promise<void> {
  if (pc.connectionState === "connected") return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      pc.removeEventListener("connectionstatechange", onState);
      pc.removeEventListener("iceconnectionstatechange", onIce);
      signal.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };
    const onState = () => {
      if (pc.connectionState === "connected") finish();
      else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        finish(new Error(CONNECT_FAILED));
      }
    };
    const onIce = () => {
      if (pc.iceConnectionState === "failed") finish(new Error(CONNECT_FAILED));
    };
    const onAbort = () => finish(new Error("The handoff was cancelled."));
    const timer = window.setTimeout(() => finish(new Error(CONNECT_FAILED)), CONNECT_MS);
    pc.addEventListener("connectionstatechange", onState);
    pc.addEventListener("iceconnectionstatechange", onIce);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function waitOpen(dc: RTCDataChannel, signal: AbortSignal): Promise<void> {
  if (dc.readyState === "open") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = (err?: Error) => {
      window.clearTimeout(timer);
      dc.removeEventListener("open", onOpen);
      dc.removeEventListener("close", onClose);
      signal.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };
    const onOpen = () => finish();
    const onClose = () => finish(new Error("The connection closed."));
    const onAbort = () => finish(new Error("The handoff was cancelled."));
    const timer = window.setTimeout(() => finish(new Error(CONNECT_FAILED)), CONNECT_MS);
    dc.addEventListener("open", onOpen, { once: true });
    dc.addEventListener("close", onClose, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new Error("The handoff was cancelled."));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

function localSdp(pc: RTCPeerConnection): string {
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("This browser did not produce a connection answer.");
  return sdp;
}

function readCode(payload: unknown): string {
  const code = payload && typeof payload === "object" ? (payload as { code?: unknown }).code : null;
  const normalized = typeof code === "string" ? normalizeCode(code) : null;
  if (!normalized) throw new Error("The handoff service could not open a connection.");
  return normalized;
}

function readOffer(payload: unknown): RTCSessionDescriptionInit {
  const desc =
    payload && typeof payload === "object"
      ? (payload as { sessionDescription?: { type?: unknown; sdp?: unknown } }).sessionDescription
      : null;
  if (!desc || desc.type !== "offer" || typeof desc.sdp !== "string" || !desc.sdp) {
    throw new Error("The handoff service could not open a connection.");
  }
  return { type: "offer", sdp: desc.sdp };
}

function readChannelId(payload: unknown): number {
  const id =
    payload && typeof payload === "object" ? (payload as { channelId?: unknown }).channelId : null;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0 || id > 65_534) {
    throw new Error("The handoff service could not open a connection.");
  }
  return id;
}

function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error("The handoff service could not open a connection.");
}
