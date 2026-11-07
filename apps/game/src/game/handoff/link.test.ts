import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

/**
 * A stand-in browser: `RTCPeerConnection` puts a host candidate in its offer only while `net.host` says so,
 * the way WebKit hides local addresses until the page has had camera access.
 */
const net = { host: false, hostAfterCamera: true, cameraAllowed: true, cameraAsks: 0, peers: 0 };

class FakeChannel extends EventTarget {
  readyState = "connecting";
  binaryType = "blob";
  close() {}
}

class FakePeer extends EventTarget {
  iceGatheringState = "new";
  connectionState = "new";
  iceConnectionState = "new";
  localDescription: { type: string; sdp: string } | null = null;
  constructor() {
    super();
    net.peers += 1;
  }
  createDataChannel() {
    return new FakeChannel();
  }
  async createOffer() {
    const candidate = net.host ? "a=candidate:1 1 udp 1 abc.local 9 typ host\r\n" : "";
    return {
      type: "offer",
      sdp: `v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n${candidate}`,
    };
  }
  async setLocalDescription(desc: { type: string; sdp: string }) {
    this.localDescription = desc;
    this.iceGatheringState = "complete";
  }
  close() {}
}

const saved = {
  window: Object.getOwnPropertyDescriptor(globalThis, "window"),
  navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
  rtc: Object.getOwnPropertyDescriptor(globalThis, "RTCPeerConnection"),
};

function restore(key: string, desc: PropertyDescriptor | undefined) {
  if (desc) Object.defineProperty(globalThis, key, desc);
  else delete (globalThis as Record<string, unknown>)[key];
}

/** An offer link's tickets, with its channel's rejection handled as PhoneHandoffPanel does. */
function offerTickets(link: typeof import("./link.ts")): Promise<string[]> {
  const offer = link.createOfferLink();
  void offer.channel.catch(() => {});
  return offer.tickets.finally(() => offer.close());
}

let fresh = 0;
/** link.ts remembers what it found, so each case loads its own copy. */
async function loadLink(): Promise<typeof import("./link.ts")> {
  fresh += 1;
  return import(`./link.ts?case=${fresh}`);
}

describe("local address probe", () => {
  beforeEach(() => {
    Object.assign(net, {
      host: false,
      hostAfterCamera: true,
      cameraAllowed: true,
      cameraAsks: 0,
      peers: 0,
    });
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, "RTCPeerConnection", {
      value: FakePeer,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          async getUserMedia() {
            net.cameraAsks += 1;
            if (!net.cameraAllowed) throw new Error("NotAllowedError");
            if (net.hostAfterCamera) net.host = true;
            return { getTracks: () => [{ stop() {} }] };
          },
        },
      },
    });
  });

  afterEach(() => {
    restore("window", saved.window);
    restore("navigator", saved.navigator);
    restore("RTCPeerConnection", saved.rtc);
  });

  it("asks for the camera once when that reveals a local address", async () => {
    const link = await loadLink();
    await link.shareLocalAddress();
    assert.equal(net.cameraAsks, 1);
    await link.shareLocalAddress();
    assert.equal(net.cameraAsks, 1, "an address was seen, so the camera is not asked again");
    const codes = await offerTickets(link);
    assert.ok(codes.length >= 1);
  });

  it("does not ask for the camera when a local address is already there", async () => {
    net.host = true;
    const link = await loadLink();
    await link.shareLocalAddress();
    assert.equal(net.cameraAsks, 0);
  });

  it("keeps trying, and says to check the network, when the camera is allowed but no address appears", async () => {
    net.hostAfterCamera = false;
    const link = await loadLink();
    await link.shareLocalAddress();
    assert.equal(net.cameraAsks, 1);
    await assert.rejects(
      () => offerTickets(link),
      (err: Error) => {
        assert.match(err.message, /Wi-Fi/);
        assert.doesNotMatch(err.message, /Allow the camera/);
        return true;
      },
    );
    await link.shareLocalAddress();
    assert.equal(net.cameraAsks, 2, "no address was seen, so the next tap tries again");
  });

  it("asks to allow the camera when it was refused", async () => {
    net.cameraAllowed = false;
    const link = await loadLink();
    await link.shareLocalAddress();
    await assert.rejects(() => offerTickets(link), /Allow the camera/);
  });
});
