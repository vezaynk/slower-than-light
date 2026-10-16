import { standInXml } from "./document.ts";

const HEADER_SIZE = 16;
const ENTRY_SIZE = 20;
const SIGNATURE = [0x50, 0x4b, 0x47, 0x0a];

export type PkgEntry = {
  path: string;
  body: Uint8Array;
};

/**
 * One uncompressed FTL 1.6 PKG. Bit 24 of each path field stays clear.
 * `@stl/ftldat` reads archives; it does not write them.
 */
export function writePkg(files: readonly PkgEntry[]): Uint8Array {
  let pathsSize = 0;
  let bodySize = 0;
  for (const file of files) {
    pathsSize += file.path.length + 1;
    bodySize += file.body.byteLength;
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
    view.setUint32(at + 12, file.body.byteLength, false);
    view.setUint32(at + 16, file.body.byteLength, false);
    for (let i = 0; i < file.path.length; i++) {
      out[pathTable + pathAt + i] = file.path.charCodeAt(i);
    }
    pathAt += file.path.length + 1;
    out.set(file.body, dataAt);
    dataAt += file.body.byteLength;
  });
  return out;
}

/** The stand-in archive: one XML document, no generated art or sounds yet. */
export async function standInDat(): Promise<Uint8Array> {
  const xml = await standInXml();
  return writePkg([{ path: "data/stand-in.xml", body: new TextEncoder().encode(xml) }]);
}

export { standInXml };
