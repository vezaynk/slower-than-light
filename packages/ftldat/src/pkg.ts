/**
 * FTL 1.6.1 stores the game in one big-endian PKG archive.
 * Bit 24 of the path field marks a zlib-deflated body (SIL PKGF_DEFLATED).
 */

const HEADER_SIZE = 16;
const ENTRY_SIZE = 20;
const SIGNATURE = [0x50, 0x4b, 0x47, 0x0a] as const;
const DEFLATE_FLAG = 1 << 24;

export type PkgFile = {
  path: string;
  bytes: Uint8Array;
};

type Row = {
  path: string;
  offset: number;
  size: number;
  unpacked: number;
  deflated: boolean;
};

export async function readPkg(bytes: Uint8Array): Promise<PkgFile[]> {
  if (bytes.byteLength < HEADER_SIZE) throw new Error("ftl.dat is too small to be a PKG archive");
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error("ftl.dat is not a PKG archive");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint16(4, false);
  const entrySize = view.getUint16(6, false);
  if (headerSize !== HEADER_SIZE || entrySize !== ENTRY_SIZE) {
    throw new Error(
      `ftl.dat header is ${headerSize}/${entrySize}, expected ${HEADER_SIZE}/${ENTRY_SIZE}`,
    );
  }
  const entryCount = view.getUint32(8, false);
  const pathsSize = view.getUint32(12, false);
  const indexEnd = HEADER_SIZE + entryCount * ENTRY_SIZE;
  const pathsEnd = indexEnd + pathsSize;
  if (pathsEnd > bytes.byteLength) throw new Error("ftl.dat index runs past the end of the file");

  const paths = bytes.subarray(indexEnd, pathsEnd);
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < entryCount; i++) {
    const at = HEADER_SIZE + i * ENTRY_SIZE;
    const pathAndFlags = view.getUint32(at + 4, false);
    const offset = view.getUint32(at + 8, false);
    if (offset === 0) continue;
    const path = readAscii(paths, pathAndFlags & 0x00ffffff);
    if (path.length === 0) throw new Error("ftl.dat contains an empty path");
    if (seen.has(path)) throw new Error(`ftl.dat repeats ${path}`);
    seen.add(path);
    const size = view.getUint32(at + 12, false);
    if (offset + size > bytes.byteLength)
      throw new Error(`ftl.dat entry ${path} runs past the end of the file`);
    rows.push({
      path,
      offset,
      size,
      unpacked: view.getUint32(at + 16, false),
      deflated: (pathAndFlags & DEFLATE_FLAG) !== 0,
    });
  }

  return Promise.all(
    rows.map(async (row) => {
      const packed = bytes.subarray(row.offset, row.offset + row.size);
      const body = row.deflated ? await inflate(packed, row.path) : packed.slice();
      if (row.unpacked !== 0 && body.byteLength !== row.unpacked) {
        throw new Error(
          `ftl.dat entry ${row.path} is ${body.byteLength} bytes, expected ${row.unpacked}`,
        );
      }
      return { path: row.path, bytes: body };
    }),
  );
}

/** Writes an uncompressed FTL 1.6 PKG. Bit 24 of each path field stays clear. */
export function writePkg(files: readonly PkgFile[]): Uint8Array {
  let pathsSize = 0;
  let bodySize = 0;
  const seen = new Set<string>();
  for (const file of files) {
    if (file.path.length === 0) throw new Error("ftl.dat path is empty");
    if (seen.has(file.path)) throw new Error(`ftl.dat repeats ${file.path}`);
    seen.add(file.path);
    for (let i = 0; i < file.path.length; i++) {
      const code = file.path.charCodeAt(i);
      if (code === 0 || code > 0x7f) throw new Error(`ftl.dat path is not ASCII: ${file.path}`);
    }
    pathsSize += file.path.length + 1;
    bodySize += file.bytes.byteLength;
  }
  const dataStart = HEADER_SIZE + files.length * ENTRY_SIZE + pathsSize;
  const out = new Uint8Array(dataStart + bodySize);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  out.set(SIGNATURE, 0);
  view.setUint16(4, HEADER_SIZE, false);
  view.setUint16(6, ENTRY_SIZE, false);
  view.setUint32(8, files.length, false);
  view.setUint32(12, pathsSize, false);
  let pathAt = 0;
  let dataAt = dataStart;
  const pathTable = HEADER_SIZE + files.length * ENTRY_SIZE;
  files.forEach((file, index) => {
    const at = HEADER_SIZE + index * ENTRY_SIZE;
    view.setUint32(at + 4, pathAt, false);
    view.setUint32(at + 8, dataAt, false);
    view.setUint32(at + 12, file.bytes.byteLength, false);
    view.setUint32(at + 16, file.bytes.byteLength, false);
    for (let i = 0; i < file.path.length; i++)
      out[pathTable + pathAt + i] = file.path.charCodeAt(i);
    pathAt += file.path.length + 1;
    out.set(file.bytes, dataAt);
    dataAt += file.bytes.byteLength;
  });
  return out;
}

function readAscii(region: Uint8Array, offset: number): string {
  if (offset < 0 || offset >= region.byteLength) {
    throw new Error(`ftl.dat path offset ${offset} is outside the path table`);
  }
  let text = "";
  for (let i = offset; i < region.byteLength; i++) {
    const byte = region[i];
    if (byte === 0) return text;
    if (byte === undefined || byte > 0x7f) throw new Error("ftl.dat path is not ASCII");
    text += String.fromCharCode(byte);
  }
  throw new Error("ftl.dat path is missing its terminator");
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

async function inflate(packed: Uint8Array, path: string): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") {
    throw new Error("ftl.dat inflate needs DecompressionStream");
  }
  try {
    const stream = new Blob([arrayBuffer(packed)])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`ftl.dat entry ${path} did not inflate: ${detail}`);
  }
}
