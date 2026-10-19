import { ftlPatch, type FtlExtract } from "@stl/ftldat";
import { attachTextLists, packFromFtl, parsePack, type ContentPack } from "@stl/pack";
import { patchDocument } from "./patch.ts";

/** The bundled stand-in is this one campaign document. */
const STAND_IN = "data/stand-in.xml";

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
 * The stand-in is the campaign document at `data/stand-in.xml`, even when hull
 * pictures are packed beside it. Any other archive is read as vanilla XML.
 */
export function packFromExtract(files: FtlExtract): ContentPack {
  const standIn = files.documents.find((doc) => doc.path === STAND_IN);
  if (standIn) {
    const pack = parsePack(standIn.xml);
    const layouts = [...files.text]
      .filter(([path]) => path.toLowerCase().endsWith(".txt"))
      .map(([path, text]) => ({ path, text }));
    // Ships and sectors are ftl.dat's data/blueprints.xml and data/sector_data.xml, read by the same code as a real
    // archive.
    const ftl = packFromFtl(
      files.documents.filter((doc) => doc.path !== STAND_IN),
      layouts,
    );
    if (ftl.hulls) pack.hulls = ftl.hulls;
    if (ftl.sectors) pack.sectors = ftl.sectors;
    if (ftl.stores?.length) pack.stores = ftl.stores;
    if (ftl.rewards) pack.rewards = ftl.rewards;
    if (ftl.factions?.length) pack.factions = ftl.factions;
    if (ftl.empties?.length) pack.empties = ftl.empties;
    attachTextLists(
      pack,
      files.documents.filter((doc) => doc.path !== STAND_IN),
    );
    return pack;
  }
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
