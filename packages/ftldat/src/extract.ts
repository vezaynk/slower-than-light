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
 * An append, raw append, or raw clobber path keeps its suffix until a mod is applied.
 */
export type FtlExtract = {
  /** XML files in container order, including Slipstream patch files from a zip. */
  documents: readonly FtlDocument[];
  /** Ship layouts and the other non-XML text, keyed by inner path. */
  text: ReadonlyMap<string, string>;
  /** Images, audio, and fonts, keyed by inner path. */
  assets: ReadonlyMap<string, Blob>;
};

/** Packs XML documents, then text files, then image and audio bytes, into an uncompressed FTL 1.6 `ftl.dat`. */
export function packFtlDat(
  documents: readonly FtlDocument[],
  text: readonly { path: string; text: string }[] = [],
  assets: readonly { path: string; bytes: Uint8Array }[] = [],
): Uint8Array {
  const encoder = new TextEncoder();
  return writePkg([
    ...documents.map((doc) => ({ path: doc.path, bytes: encoder.encode(doc.xml) })),
    ...text.map((file) => ({ path: file.path, bytes: encoder.encode(file.text) })),
    ...assets.map((file) => ({ path: file.path, bytes: file.bytes })),
  ]);
}

/** Reads one FTL 1.6 `ftl.dat` into the same path map a `.ftl` zip uses. */
export async function extractFtlDat(source: FtlDatSource): Promise<FtlExtract> {
  return collectExtract(await readPkg(await sourceBytes(source)));
}

const PATCH_RULES: { suffix: string; kind: FtlPatchKind; replace: string }[] = [
  { suffix: ".xml.rawappend", kind: "rawappend", replace: ".xml" },
  { suffix: ".rawappend.xml", kind: "rawappend", replace: ".xml" },
  { suffix: ".xml.rawclobber", kind: "rawclobber", replace: ".xml" },
  { suffix: ".rawclobber.xml", kind: "rawclobber", replace: ".xml" },
  { suffix: ".xml.append", kind: "append", replace: ".xml" },
  { suffix: ".append.xml", kind: "append", replace: ".xml" },
];

export type FtlPatchKind = "append" | "rawappend" | "rawclobber";

/**
 * The Slipstream suffix on a mod path, and the `.xml` file it patches.
 * `blueprints.xml.append` and `blueprints.append.xml` both patch `blueprints.xml`.
 * Lookup of the target is case-insensitive.
 */
export function ftlPatch(path: string): { target: string; kind: FtlPatchKind } | undefined {
  const lower = path.toLowerCase();
  for (const rule of PATCH_RULES) {
    if (!lower.endsWith(rule.suffix)) continue;
    const stem = path.slice(0, path.length - rule.suffix.length);
    if (!stem) return undefined;
    return { target: `${stem}${rule.replace}`, kind: rule.kind };
  }
  return undefined;
}

function isFtlDocument(path: string): boolean {
  return path.toLowerCase().endsWith(".xml") || ftlPatch(path) !== undefined;
}

/** Sorts raw container files into the path map. Append and raw patch files stay XML. */
export function collectExtract(files: readonly { path: string; bytes: Uint8Array }[]): FtlExtract {
  const documents: FtlDocument[] = [];
  const text = new Map<string, string>();
  const assets = new Map<string, Blob>();
  for (const file of files) {
    const lower = file.path.toLowerCase();
    if (isFtlDocument(file.path)) {
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
