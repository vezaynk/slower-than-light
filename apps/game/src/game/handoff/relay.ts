/**
 * The public handoff origin. The SFU app secret stays on the worker.
 */

export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== 6) return null;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return code;
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function handoffOrigin(): string | null {
  const env = (import.meta as ImportMeta & { env?: { VITE_HANDOFF_URL?: string } }).env;
  const raw = env?.VITE_HANDOFF_URL;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed || null;
}

export class RelayError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RelayError";
    this.status = status;
  }
}

export async function postJson(url: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch {
    if (signal.aborted) throw new Error("The handoff was cancelled.");
    throw new Error("The handoff service could not open a connection.");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? safeError((payload as { error?: unknown }).error)
        : null;
    throw new RelayError(
      response.status,
      message ?? "The handoff service could not open a connection.",
    );
  }
  return payload;
}

function safeError(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 200) return null;
  if (/[\r\n]/.test(value)) return null;
  return value;
}
