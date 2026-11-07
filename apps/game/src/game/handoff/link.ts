/**
 * A direct WebRTC connection between two devices. The ticket (a QR code or pasted text) is the session
 * description. The game files travel on the data channel after both devices have exchanged tickets.
 */

import { decodeTicket, encodeTicket, type SessionTicket } from "./frame.ts";
import { armChannel } from "./transfer.ts";

/**
 * Per the user: local Wi-Fi only, with no outside server. The devices meet on their local (host) candidates,
 * which also keeps the codes short enough for fewer QR pages.
 */
const RTC: RTCConfiguration = { iceServers: [] };

const CONNECT_FAILED =
  "The two devices could not connect. Put both on the same Wi-Fi and try the codes again.";
const NO_ADDRESS =
  "This browser did not share a local network address, so the other device cannot reach it. Allow the camera when asked, then try again.";
const CLOSED = "The connection closed.";

/** Once the sender has the phone's code, both sides have what they need. A LAN pair connects in seconds. */
const CONNECT_MS = 20_000;
/** The phone waits this long for the sender to scan its code, which can take several QR pages. */
const ANSWER_WAIT_MS = 180_000;

function waitIce(pc: RTCPeerConnection, ms = 5000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, ms);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function hasHostCandidate(sdp: string | undefined): boolean {
  return !!sdp && / typ host/.test(sdp);
}

let addressShared = false;

/**
 * With no ICE servers, a code carries host candidates only. WebKit hides those until the page has had camera
 * or microphone access, so when a probe finds none this asks for the camera once and stops it at once. Call it
 * at the start of the tap that makes a code.
 */
export async function shareLocalAddress(): Promise<void> {
  if (addressShared || typeof RTCPeerConnection !== "function") return;
  const probe = new RTCPeerConnection(RTC);
  try {
    probe.createDataChannel("probe");
    await probe.setLocalDescription(await probe.createOffer());
    await waitIce(probe, 2000);
    addressShared = hasHostCandidate(probe.localDescription?.sdp);
  } catch {
    // The real link reports the problem.
  } finally {
    probe.close();
  }
  if (addressShared || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((track) => track.stop());
    addressShared = true;
  } catch {
    // Refused or no camera: `ticketFrom` says why the code cannot work.
  }
}

/**
 * Settles `channel`. ICE `failed` counts only once `armed` (both descriptions are in place). Before that a
 * device can mark pairs failed because the other side has not read its code yet, and a later check from the
 * other side can still connect, so only the deadline ends the wait.
 */
function channelGate() {
  let resolve!: (dc: RTCDataChannel) => void;
  let reject!: (err: Error) => void;
  const channel = new Promise<RTCDataChannel>((ok, no) => {
    resolve = ok;
    reject = no;
  });
  let settled = false;
  let armed = false;
  let timer = 0;
  const done = () => {
    settled = true;
    window.clearTimeout(timer);
  };
  return {
    channel,
    open(dc: RTCDataChannel) {
      if (settled) return;
      done();
      resolve(dc);
    },
    fail(err: Error) {
      if (settled) return;
      done();
      reject(err);
    },
    failed() {
      if (armed) this.fail(new Error(CONNECT_FAILED));
    },
    deadline(ms: number, arm: boolean) {
      if (settled) return;
      armed = arm;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.fail(new Error(CONNECT_FAILED)), ms);
    },
  };
}

function watchFailure(pc: RTCPeerConnection, gate: ReturnType<typeof channelGate>): void {
  const check = () => {
    if (pc.connectionState === "failed" || pc.iceConnectionState === "failed") gate.failed();
    if (pc.connectionState === "closed") gate.fail(new Error(CLOSED));
  };
  pc.addEventListener("connectionstatechange", check);
  pc.addEventListener("iceconnectionstatechange", check);
}

async function ticketFrom(pc: RTCPeerConnection, role: SessionTicket["role"]): Promise<string[]> {
  await waitIce(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("This browser did not produce a connection code.");
  if (!hasHostCandidate(sdp)) throw new Error(NO_ADDRESS);
  return encodeTicket({ v: 1, role, sdp });
}

export type HandoffSocket = {
  tickets: Promise<string[]>;
  channel: Promise<RTCDataChannel>;
  close(): void;
};

export type OfferSocket = HandoffSocket & {
  takeAnswer(text: string): Promise<void>;
};

/** The sending device. Show `tickets`, then pass the phone's code to `takeAnswer`. */
export function createOfferLink(): OfferSocket {
  const pc = new RTCPeerConnection(RTC);
  const dc = pc.createDataChannel("stl-handoff");
  armChannel(dc);
  const gate = channelGate();
  watchFailure(pc, gate);
  if (dc.readyState === "open") gate.open(dc);
  else dc.addEventListener("open", () => gate.open(dc), { once: true });
  dc.addEventListener("close", () => gate.fail(new Error(CLOSED)), { once: true });
  const close = () => {
    gate.fail(new Error(CLOSED));
    dc.close();
    pc.close();
  };
  const tickets = (async () => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return await ticketFrom(pc, "offer");
    } catch (err) {
      close();
      throw err;
    }
  })();
  return {
    tickets,
    channel: gate.channel,
    async takeAnswer(text: string) {
      const answer = await decodeTicket(text);
      if (answer.role !== "answer")
        throw new Error("Paste the code the receiving device is showing.");
      await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
      gate.deadline(CONNECT_MS, true);
    },
    close,
  };
}

/** The receiving device. Pass the computer's code. Show `tickets` while `channel` connects. */
export function createAnswerLink(offerText: string): HandoffSocket {
  const pc = new RTCPeerConnection(RTC);
  const gate = channelGate();
  watchFailure(pc, gate);
  pc.addEventListener("datachannel", (ev) => {
    const dc = ev.channel;
    armChannel(dc);
    if (dc.readyState === "open") gate.open(dc);
    else dc.addEventListener("open", () => gate.open(dc), { once: true });
  });
  const close = () => {
    gate.fail(new Error(CLOSED));
    pc.close();
  };
  const tickets = (async () => {
    try {
      const offer = await decodeTicket(offerText);
      if (offer.role !== "offer") throw new Error("Paste the code the sending device is showing.");
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const codes = await ticketFrom(pc, "answer");
      // This side cannot tell when the sender reads its code, so `failed` is never final here.
      gate.deadline(ANSWER_WAIT_MS, false);
      return codes;
    } catch (err) {
      close();
      throw err;
    }
  })();
  return { tickets, channel: gate.channel, close };
}
