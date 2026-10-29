/** Unambiguous alphabet: no 0/O and no 1/I. 32 symbols, so a byte modulo 32 is unbiased. */
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const CODE_LENGTH = 6;

export function randomCode(random: () => number = cryptoRandom): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[random() % ALPHABET.length];
  return out;
}

function cryptoRandom(): number {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] ?? 0;
}

/** The wire form of a room code. Spaces and dashes are display only. O is not zero. */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return code;
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
