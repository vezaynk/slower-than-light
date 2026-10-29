/**
 * Public rendezvous. SDP stays on this worker. Accounts, when they exist, belong in
 * `authorize` — it currently allows every caller, and nothing here stores a user.
 */

import { normalizeCode, randomCode } from "./code.ts";
import type { RoomResult } from "./room.ts";
import type { SessionDescription } from "./sfu.ts";

export type OpenValue = { sessionDescription: SessionDescription };
export type JoinValue = { sessionDescription: SessionDescription };
export type ChannelValue = { channelId: number };

export interface RoomCaller {
  open(): Promise<RoomResult<OpenValue>>;
  answer(sdp: string): Promise<RoomResult<{ ok: true }>>;
  publish(): Promise<RoomResult<ChannelValue>>;
  join(): Promise<RoomResult<JoinValue>>;
  answerJoin(sdp: string): Promise<RoomResult<{ ok: true }>>;
  subscribe(): Promise<RoomResult<ChannelValue>>;
}

export interface RoomNamespace {
  getByName(name: string): RoomCaller;
}

export interface HandoffSecrets {
  REALTIME_SFU_APP_ID?: string;
  REALTIME_SFU_APP_SECRET?: string;
}

type Route =
  | { name: "create" }
  | { name: "answer"; code: string }
  | { name: "publish"; code: string }
  | { name: "join"; code: string }
  | { name: "join-answer"; code: string }
  | { name: "subscribe"; code: string };

const ATTEMPTS = 8;

/** Accounts will check the caller here. Until then every caller may open a handoff. */
export function authorize(_request: Request): boolean {
  return true;
}

export function matchRoute(method: string, pathname: string): Route | "options" | null {
  if (method === "OPTIONS") return "options";
  if (method !== "POST") return null;
  if (pathname === "/v1/rooms") return { name: "create" };
  const code = (pattern: RegExp) => {
    const found = pathname.match(pattern);
    return found?.[1] ?? null;
  };
  const joinAnswer = code(/^\/v1\/rooms\/([^/]+)\/join\/answer$/);
  if (joinAnswer) return { name: "join-answer", code: joinAnswer };
  const subscribe = code(/^\/v1\/rooms\/([^/]+)\/subscribe$/);
  if (subscribe) return { name: "subscribe", code: subscribe };
  const join = code(/^\/v1\/rooms\/([^/]+)\/join$/);
  if (join) return { name: "join", code: join };
  const answer = code(/^\/v1\/rooms\/([^/]+)\/answer$/);
  if (answer) return { name: "answer", code: answer };
  const publish = code(/^\/v1\/rooms\/([^/]+)\/publish$/);
  if (publish) return { name: "publish", code: publish };
  return null;
}

export async function handle(
  request: Request,
  env: HandoffSecrets,
  rooms: RoomNamespace,
  random: () => string = () => randomCode(),
): Promise<Response> {
  const route = matchRoute(request.method, new URL(request.url).pathname);
  if (route === "options") return new Response(null, { status: 204, headers: corsHeaders() });
  if (!route) return json({ error: "That handoff request does not exist." }, 404);
  if (!authorize(request)) return json({ error: "The handoff service refused this request." }, 401);
  if (!env.REALTIME_SFU_APP_ID || !env.REALTIME_SFU_APP_SECRET) {
    return json({ error: "The handoff service is not configured." }, 503);
  }
  try {
    rejectHuge(request);
    if (route.name === "create") return await createRoom(rooms, random);
    const code = normalizeCode(decodeURIComponent(route.code));
    if (!code) return json({ error: "Enter the six-character code." }, 400);
    const room = rooms.getByName(code);
    if (route.name === "publish") return relay(await room.publish());
    if (route.name === "subscribe") return relay(await room.subscribe());
    if (route.name === "join") return relay(await room.join());
    const sdp = readSdp(await readJson(request));
    if (!sdp) return json({ error: "The connection answer was missing." }, 400);
    if (route.name === "answer") return relay(await room.answer(sdp));
    return relay(await room.answerJoin(sdp));
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: "The handoff service could not open a connection." }, 502);
  }
}

async function createRoom(rooms: RoomNamespace, random: () => string): Promise<Response> {
  for (let i = 0; i < ATTEMPTS; i++) {
    const code = normalizeCode(random()) ?? "";
    if (!code) continue;
    const result = await rooms.getByName(code).open();
    if (result.ok) {
      return json({ code, sessionDescription: result.value.sessionDescription });
    }
    if (result.status !== 409) return json({ error: result.error }, result.status);
  }
  return json({ error: "Could not open a handoff. Try again." }, 503);
}

function relay<T extends object>(result: RoomResult<T>): Response {
  if (!result.ok) return json({ error: result.error }, result.status);
  return json(result.value);
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function rejectHuge(request: Request): void {
  const claimed = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(claimed) && claimed > 65_536) {
    throw new HttpError(400, "That request was too large.");
  }
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 65_536) throw new HttpError(400, "That request was too large.");
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "The handoff service could not read that request.");
  }
}

function readSdp(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const sdp = (body as { sdp?: unknown }).sdp;
  if (typeof sdp !== "string" || sdp.length < 8 || sdp.length > 60_000) return null;
  if (sdp.includes("\0")) return null;
  return sdp;
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "cache-control": "no-store",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}
