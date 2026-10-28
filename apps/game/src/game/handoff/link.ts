/**
 * A direct WebRTC connection between two devices. The ticket (a QR code or pasted text) is the session
 * description. The game files travel on the data channel after both devices have exchanged tickets.
 */

import { decodeTicket, encodeTicket, type SessionTicket } from "./frame.ts";
import { armChannel } from "./transfer.ts";

const RTC: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CONNECT_FAILED = "The two devices could not connect. On the same Wi-Fi, try the codes again.";

function waitIce(pc: RTCPeerConnection): Promise<void> {
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
    const timer = window.setTimeout(finish, 5000);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

function failLater(pc: RTCPeerConnection, reject: (err: Error) => void): void {
  const fail = () => reject(new Error(CONNECT_FAILED));
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed") fail();
  });
  pc.addEventListener("iceconnectionstatechange", () => {
    if (pc.iceConnectionState === "failed") fail();
  });
}

async function ticketFrom(pc: RTCPeerConnection, role: SessionTicket["role"]): Promise<string[]> {
  await waitIce(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("This browser did not produce a connection code.");
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
  const channel = new Promise<RTCDataChannel>((resolve, reject) => {
    failLater(pc, reject);
    if (dc.readyState === "open") resolve(dc);
    else dc.addEventListener("open", () => resolve(dc), { once: true });
    dc.addEventListener("close", () => reject(new Error("The connection closed.")), { once: true });
  });
  const tickets = (async () => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return await ticketFrom(pc, "offer");
    } catch (err) {
      pc.close();
      throw err;
    }
  })();
  return {
    tickets,
    channel,
    async takeAnswer(text: string) {
      const answer = await decodeTicket(text);
      if (answer.role !== "answer")
        throw new Error("Paste the code the receiving device is showing.");
      await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
    },
    close() {
      dc.close();
      pc.close();
    },
  };
}

/** The receiving device. Pass the computer's code. Show `tickets` while `channel` connects. */
export function createAnswerLink(offerText: string): HandoffSocket {
  const pc = new RTCPeerConnection(RTC);
  const channel = new Promise<RTCDataChannel>((resolve, reject) => {
    failLater(pc, reject);
    pc.addEventListener("datachannel", (ev) => {
      const dc = ev.channel;
      armChannel(dc);
      if (dc.readyState === "open") resolve(dc);
      else dc.addEventListener("open", () => resolve(dc), { once: true });
    });
  });
  const tickets = (async () => {
    try {
      const offer = await decodeTicket(offerText);
      if (offer.role !== "offer") throw new Error("Paste the code the sending device is showing.");
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return await ticketFrom(pc, "answer");
    } catch (err) {
      pc.close();
      throw err;
    }
  })();
  return {
    tickets,
    channel,
    close() {
      pc.close();
    },
  };
}
