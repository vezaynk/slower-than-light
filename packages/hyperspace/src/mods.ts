import { ftlPatch, type FtlExtract } from "@stl/ftldat";
import { packFromFtl, type ContentPack } from "@stl/pack";
import { patchDocument } from "./patch.ts";

/** The merged path map and the catalog read from it. */
export type FtlModLoad = {
  /** Dat files with each mod applied. Hull XML and image blobs stay here. */
  files: FtlExtract;
  /** Weapons, ships, sectors, events, and the other records `packFromFtl` reads. */
  pack: ContentPack;
};

/** `panic` makes every find throw when it matches nothing. */
export type FtlModOptions = {
  panic?: boolean;
};

/**
 * Applies one mod onto a path map.
 * Append and raw-append files patch the XML file of the same name. The lookup is
 * case-insensitive, and a missing target is skipped. A raw clobber replaces that
 * file, or creates it. Every other path replaces the file. A new path is added
 * after the files already there, so a later dat file still follows an earlier one.
 */
export function applyFtlMod(
  base: FtlExtract,
  mod: FtlExtract,
  options?: FtlModOptions,
): FtlExtract {
  const documents = base.documents.map((doc) => ({ path: doc.path, xml: doc.xml }));
  const text = new Map(base.text);
  const assets = new Map(base.assets);
  const index = new Map(documents.map((doc, at) => [doc.path, at]));
  for (const doc of mod.documents) {
    const patch = ftlPatch(doc.path);
    if (patch) {
      const at = documents.findIndex(
        (item) => item.path.toLowerCase() === patch.target.toLowerCase(),
      );
      if (at < 0 && patch.kind !== "rawclobber") continue;
      const current = at < 0 ? "" : (documents[at]?.xml ?? "");
      const xml = patchDocument(current, doc.xml, patch.kind, {
        panic: options?.panic,
        path: doc.path,
      });
      if (at < 0) {
        index.set(patch.target, documents.length);
        documents.push({ path: patch.target, xml });
      } else {
        documents[at] = { path: documents[at]?.path ?? patch.target, xml };
      }
      continue;
    }
    const at = index.get(doc.path);
    if (at == null) {
      index.set(doc.path, documents.length);
      documents.push({ path: doc.path, xml: doc.xml });
    } else {
      documents[at] = { path: doc.path, xml: doc.xml };
    }
  }
  for (const [path, value] of mod.text) text.set(path, value);
  for (const [path, blob] of mod.assets) assets.set(path, blob);
  return { documents, text, assets };
}

/**
 * Reads a catalog from one unpacked archive.
 * Every document is read the same way. A later file with the same id replaces the earlier one.
 */
export function packFromExtract(files: FtlExtract): ContentPack {
  return loadFtlMods(files).pack;
}

/**
 * Applies the dat, then each mod, and reads the catalog.
 * Layout text and hull picture boxes are read onto the catalog. Image bytes stay on `files`.
 */
export function loadFtlMods(
  base: FtlExtract,
  mods: readonly FtlExtract[] = [],
  options?: FtlModOptions,
): FtlModLoad {
  let files: FtlExtract = {
    documents: base.documents.map((doc) => ({ path: doc.path, xml: doc.xml })),
    text: new Map(base.text),
    assets: new Map(base.assets),
  };
  for (const mod of mods) files = applyFtlMod(files, mod, options);
  const layouts = [...files.text]
    .filter(([path]) => path.toLowerCase().endsWith(".txt"))
    .map(([path, text]) => ({ path, text }));
  return { files, pack: packFromFtl(files.documents, layouts) };
}
