/**
 * The browser never sees the App Secret. This client calls Realtime SFU from the worker.
 * Shapes follow the data-channel recipe: establish server-events, renegotiate the answer,
 * then allocate the application channel.
 */

const API_BASE = "https://rtc.live.cloudflare.com/v1";
const CHANNEL_NAME = "stl-handoff";
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;
const REQUEST_MS = 15_000;

export type SessionDescription = { type: "offer" | "answer"; sdp: string };

export type Established = {
  sessionDescription: SessionDescription;
  dataChannelId: number;
};

export interface Sfu {
  createSession(): Promise<string>;
  establish(sessionId: string): Promise<Established>;
  renegotiate(sessionId: string, answer: SessionDescription): Promise<void>;
  publish(sessionId: string): Promise<number>;
  subscribe(sessionId: string, publisherSessionId: string): Promise<number>;
}

export class SfuError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "SfuError";
    this.status = status;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class CloudflareSfu implements Sfu {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;

  constructor(appId: string, token: string, fetchImpl?: FetchLike) {
    if (!appId || !token) throw new SfuError("Realtime SFU credentials are missing.", 503);
    this.token = token;
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
    this.baseUrl = `${API_BASE}/apps/${encodeURIComponent(appId)}`;
  }

  async createSession(): Promise<string> {
    const payload = await this.request("/sessions/new", "POST");
    const sessionId = payload.sessionId;
    if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
      throw new SfuError("Realtime SFU returned an unusable session.");
    }
    return sessionId;
  }

  async establish(sessionId: string): Promise<Established> {
    this.requireSession(sessionId);
    const payload = await this.request(
      `/sessions/${encodeURIComponent(sessionId)}/datachannels/establish`,
      "POST",
      { dataChannel: { location: "remote", dataChannelName: "server-events" } },
    );
    if (payload.requiresImmediateRenegotiation !== true) {
      throw new SfuError("Realtime SFU did not offer a data-channel transport.");
    }
    const sessionDescription = this.readDescription(payload.sessionDescription, "offer");
    const transport = record(payload.dataChannel ?? payload.datachannel);
    return { sessionDescription, dataChannelId: this.readChannelId(transport?.id) };
  }

  async renegotiate(sessionId: string, answer: SessionDescription): Promise<void> {
    this.requireSession(sessionId);
    if (answer.type !== "answer" || !answer.sdp) {
      throw new SfuError("The browser answer was empty.", 400);
    }
    const payload = await this.request(
      `/sessions/${encodeURIComponent(sessionId)}/renegotiate`,
      "PUT",
      { sessionDescription: { type: "answer", sdp: answer.sdp } },
    );
    if (payload.requiresImmediateRenegotiation === true) {
      throw new SfuError("Realtime SFU asked for another connection step.");
    }
  }

  async publish(sessionId: string): Promise<number> {
    this.requireSession(sessionId);
    return this.allocate(sessionId, {
      location: "local",
      dataChannelName: CHANNEL_NAME,
    });
  }

  async subscribe(sessionId: string, publisherSessionId: string): Promise<number> {
    this.requireSession(sessionId);
    this.requireSession(publisherSessionId);
    return this.allocate(sessionId, {
      location: "remote",
      sessionId: publisherSessionId,
      dataChannelName: CHANNEL_NAME,
      canReply: true,
      waitForAck: true,
    });
  }

  private async allocate(sessionId: string, entry: Record<string, unknown>): Promise<number> {
    const payload = await this.request(
      `/sessions/${encodeURIComponent(sessionId)}/datachannels/new`,
      "POST",
      { dataChannels: [entry] },
    );
    if (payload.requiresImmediateRenegotiation === true) {
      throw new SfuError("Realtime SFU asked for another connection step.");
    }
    const rows = payload.dataChannels;
    if (!Array.isArray(rows) || rows.length !== 1) {
      throw new SfuError("Realtime SFU did not allocate the handoff channel.");
    }
    const row = record(rows[0]);
    if (!row) throw new SfuError("Realtime SFU did not allocate the handoff channel.");
    if (typeof row.errorCode === "string" && row.errorCode) {
      throw new SfuError("Realtime SFU rejected the handoff channel.");
    }
    if (row.location !== entry.location || row.dataChannelName !== CHANNEL_NAME) {
      throw new SfuError("Realtime SFU allocated a different channel.");
    }
    return this.readChannelId(row.id);
  }

  private requireSession(sessionId: string): void {
    if (!SESSION_ID.test(sessionId)) throw new SfuError("Realtime SFU session was unusable.", 400);
  }

  private readDescription(value: unknown, type: "offer" | "answer"): SessionDescription {
    const desc = record(value);
    if (!desc || desc.type !== type || typeof desc.sdp !== "string" || !desc.sdp) {
      throw new SfuError("Realtime SFU returned an unusable session description.");
    }
    return { type, sdp: desc.sdp };
  }

  private readChannelId(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 65_534) {
      throw new SfuError("Realtime SFU returned an unusable channel.");
    }
    return value;
  }

  private async request(path: string, method: "POST" | "PUT", body?: unknown): Promise<JsonRecord> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch {
      throw new SfuError("Realtime SFU did not respond.");
    }
    const claimed = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(claimed) && claimed > 1_000_000) {
      throw new SfuError("Realtime SFU returned an unusable response.");
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SfuError("Realtime SFU returned an unusable response.");
    }
    const recordPayload = record(payload);
    if (!recordPayload) throw new SfuError("Realtime SFU returned an unusable response.");
    if (!response.ok || (typeof recordPayload.errorCode === "string" && recordPayload.errorCode)) {
      throw new SfuError("Realtime SFU rejected the session.", response.status || 502);
    }
    return recordPayload;
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}
