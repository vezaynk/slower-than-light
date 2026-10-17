import { readPkg, writePkg } from "./pkg.ts";

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

/**
 * One path map. `extractFtlDat` and `extractFtlZip` both return this.
 * `documents` stay in the order the container listed them.
 * A `*.xml.append` path keeps that suffix until a mod is applied.
 */
export type FtlExtract = {
  /** XML files in container order, including `*.xml.append` from a zip. */
  documents: readonly FtlDocument[];
  /** Ship layouts and the other non-XML text, keyed by inner path. */
  text: ReadonlyMap<string, string>;
  /** Images, audio, and fonts, keyed by inner path. */
  assets: ReadonlyMap<string, Blob>;
};

/** Packs XML documents into an uncompressed FTL 1.6 `ftl.dat`. */
export function packFtlDat(documents: readonly FtlDocument[]): Uint8Array {
  const encoder = new TextEncoder();
  return writePkg(documents.map((doc) => ({ path: doc.path, bytes: encoder.encode(doc.xml) })));
}

/** Reads one FTL 1.6 `ftl.dat` into the same path map a `.ftl` zip uses. */
export async function extractFtlDat(source: FtlDatSource): Promise<FtlExtract> {
  return collectExtract(await readPkg(await sourceBytes(source)));
}

/** Sorts raw container files into the path map. A `*.xml.append` stays XML. */
export function collectExtract(files: readonly { path: string; bytes: Uint8Array }[]): FtlExtract {
  const documents: FtlDocument[] = [];
  const text = new Map<string, string>();
  const assets = new Map<string, Blob>();
  for (const file of files) {
    const lower = file.path.toLowerCase();
    if (lower.endsWith(".xml") || lower.endsWith(".xml.append")) {
      documents.push({ path: file.path, xml: decodeText(file.bytes) });
      continue;
    }
    if (lower.endsWith(".txt")) {
      text.set(file.path, decodeText(file.bytes));
      continue;
    }
    const copy = new ArrayBuffer(file.bytes.byteLength);
    new Uint8Array(copy).set(file.bytes);
    assets.set(file.path, new Blob([copy], { type: assetType(file.path) }));
  }
  return { documents, text, assets };
}

export async function sourceBytes(source: FtlDatSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof Blob !== "undefined" && source instanceof Blob)
    return new Uint8Array(await source.arrayBuffer());
  throw new Error("Archive source must be bytes or a Blob");
}

function assetType(path: string): string {
  const slash = path.lastIndexOf("/");
  const base = slash === -1 ? path : path.slice(slash + 1);
  const dot = base.lastIndexOf(".");
  const kind = dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
  return ASSET_TYPES[kind] ?? "application/octet-stream";
}

function decodeText(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}
