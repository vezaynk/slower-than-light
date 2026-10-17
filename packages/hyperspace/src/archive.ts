import { packFromFtl, type ContentPack, type FtlBlueprintFile } from "@stl/pack";
import {
  DOMImplementation,
  DOMParser,
  Node,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const implementation = new DOMImplementation();
const serializer = new XMLSerializer();

/**
 * xmldom keeps parsing after a warning or a non-fatal error unless this throws.
 * A mod file that is not well-formed fails the load.
 */
const parser = new DOMParser({
  onError(level, message) {
    throw new Error(`${level}: ${message}`);
  },
});

/**
 * Joins archive XML into one `<FTL>` mod document.
 * Each data file in an ftl.dat is already that document. Children stay in the
 * order given, including a later copy of the same id. Layout text, images, and
 * audio are not XML and stay beside this document.
 * `hyperspace.xml` is Hyperspace's extension file. A vanilla archive does not have one.
 * The joined document is not indented. Indenting the full archive rewrites text the
 * files already stored and dominates the time to build the mod.
 */
export function emitFtlMod(documents: readonly FtlBlueprintFile[]): string {
  const doc = implementation.createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("Mod document has no root.");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  for (const source of documents) {
    const top = readXml(source).documentElement;
    if (!top) throw new Error(`${source.path}: the document has no root element.`);
    const nodes = top.tagName === "FTL" ? elementChildren(top) : [top];
    for (const node of nodes) root.appendChild(doc.importNode(node, true));
  }
  const xml = serializer.serializeToString(doc);
  return xml.endsWith("\n") ? xml : `${xml}\n`;
}

/**
 * Reads a document written by emitFtlMod.
 * Blueprint catalogs, ships, sectors, and events come back.
 * Layout text is not in the document, so a ship has no room grid until
 * packFromFtl is called with those files.
 */
export function packFromFtlMod(xml: string): ContentPack {
  let root: string;
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    root = doc.documentElement?.tagName ?? "";
    if (!root) throw new Error("the document has no root element");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Mod XML is not well-formed: ${detail}`);
  }
  if (root !== "FTL") throw new Error(`An ftl.dat mod starts with <FTL>, found <${root}>.`);
  return packFromFtl([{ path: "ftl.xml", xml }]);
}

function readXml(source: FtlBlueprintFile): XmlDocument {
  try {
    const doc = parser.parseFromString(source.xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${source.path}: ${detail}`);
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
