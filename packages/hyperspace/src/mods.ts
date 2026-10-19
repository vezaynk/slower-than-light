import type { FtlDocument, FtlExtract } from "@stl/ftldat";
import { attachTextLists, packFromFtl, parsePack, type ContentPack } from "@stl/pack";

/** The bundled stand-in is this one campaign document. */
const STAND_IN = "data/stand-in.xml";
import {
  DOMParser,
  Node,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const serializer = new XMLSerializer();

const parser = new DOMParser({
  onError(level, message) {
    throw new Error(`${level}: ${message}`);
  },
});

/** The merged path map and the catalog read from it. */
export type FtlModLoad = {
  /** Dat files with each mod applied. Hull XML and image blobs stay here. */
  files: FtlExtract;
  /** Weapons, ships, sectors, events, and the other records `packFromFtl` reads. */
  pack: ContentPack;
};

/**
 * Applies one mod onto a path map.
 * A `*.xml.append` file adds its element children to the XML file of the same name.
 * Every other path replaces that file. A new path is added after the files already there,
 * so a later dat file still follows an earlier one.
 */
export function applyFtlMod(base: FtlExtract, mod: FtlExtract): FtlExtract {
  const documents = base.documents.map((doc) => ({ path: doc.path, xml: doc.xml }));
  const text = new Map(base.text);
  const assets = new Map(base.assets);
  const index = new Map(documents.map((doc, at) => [doc.path, at]));
  for (const doc of mod.documents) {
    if (isAppend(doc.path)) {
      const target = doc.path.slice(0, -".append".length);
      const at = index.get(target);
      const xml = at == null ? standalone(doc) : appendChildren(documents[at]?.xml ?? "", doc);
      if (at == null) {
        index.set(target, documents.length);
        documents.push({ path: target, xml });
      } else {
        documents[at] = { path: target, xml };
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
export function loadFtlMods(base: FtlExtract, mods: readonly FtlExtract[] = []): FtlModLoad {
  let files: FtlExtract = {
    documents: base.documents.map((doc) => ({ path: doc.path, xml: doc.xml })),
    text: new Map(base.text),
    assets: new Map(base.assets),
  };
  for (const mod of mods) files = applyFtlMod(files, mod);
  const layouts = [...files.text]
    .filter(([path]) => path.toLowerCase().endsWith(".txt"))
    .map(([path, text]) => ({ path, text }));
  return { files, pack: packFromFtl(files.documents, layouts) };
}

function isAppend(path: string): boolean {
  return path.toLowerCase().endsWith(".xml.append");
}

function standalone(doc: FtlDocument): string {
  readRoot(doc.xml, doc.path);
  return doc.xml.endsWith("\n") ? doc.xml : `${doc.xml}\n`;
}

function appendChildren(baseXml: string, extra: FtlDocument): string {
  const base = readXml(baseXml, extra.path.replace(/\.append$/i, ""));
  const root = base.documentElement;
  if (!root) throw new Error(`${extra.path}: the document has no root element.`);
  const extraRoot = readRoot(extra.xml, extra.path);
  const nodes = extraRoot.tagName === "FTL" ? elementChildren(extraRoot) : [extraRoot];
  for (const node of nodes) root.appendChild(base.importNode(node, true));
  const xml = serializer.serializeToString(base);
  return xml.endsWith("\n") ? xml : `${xml}\n`;
}

function readRoot(xml: string, path: string): XmlElement {
  const root = readXml(xml, path).documentElement;
  if (!root) throw new Error(`${path}: the document has no root element.`);
  return root;
}

function readXml(xml: string, path: string): XmlDocument {
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${path}: ${detail}`);
  }
}

function elementChildren(node: XmlElement): XmlElement[] {
  const found: XmlElement[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child?.nodeType === Node.ELEMENT_NODE) found.push(child as XmlElement);
  }
  return found;
}
