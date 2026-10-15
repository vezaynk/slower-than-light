import { readPkg } from "./pkg.ts";

const ASSET_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export type FtlDatSource = ArrayBuffer | Uint8Array | Blob;

/** One XML file from the archive. `xml` is the text `parsePack` reads. */
export type FtlDocument = {
  path: string;
  xml: string;
};

export type FtlExtract = {
  /** XML files in archive order. */
  documents: readonly FtlDocument[];
  /** Ship layouts and the other non-XML text, keyed by inner path. */
  text: ReadonlyMap<string, string>;
  /** Images, audio, and fonts, keyed by inner path. */
  assets: ReadonlyMap<string, Blob>;
};

/** Reads one FTL 1.6 `ftl.dat` into pack XML documents and asset blobs. */
export async function extractFtlDat(source: FtlDatSource): Promise<FtlExtract> {
  const files = await readPkg(await sourceBytes(source));
  const documents: FtlDocument[] = [];
  const text = new Map<string, string>();
  const assets = new Map<string, Blob>();
  for (const file of files) {
    const kind = extension(file.path);
    if (kind === "xml") {
      documents.push({ path: file.path, xml: decodeText(file.bytes) });
      continue;
    }
    if (kind === "txt") {
      text.set(file.path, decodeText(file.bytes));
      continue;
    }
    const copy = new ArrayBuffer(file.bytes.byteLength);
    new Uint8Array(copy).set(file.bytes);
    assets.set(file.path, new Blob([copy], { type: ASSET_TYPES[kind] ?? "application/octet-stream" }));
  }
  return { documents, text, assets };
}

async function sourceBytes(source: FtlDatSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof Blob !== "undefined" && source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
  throw new Error("ftl.dat source must be bytes or a Blob");
}

function extension(path: string): string {
  const slash = path.lastIndexOf("/");
  const base = slash === -1 ? path : path.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

function decodeText(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}
