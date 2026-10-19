import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readPkg } from "@stl/ftldat";
import { standInDat } from "./archive.ts";

/**
 * Writes the stand-in archive and its unpacked contents. archive/ holds every file of totallynotftl.dat at its path
 * inside the dat, so a change to any of them shows up as a diff. The tree is rewritten from scratch, so a file the dat
 * no longer carries is deleted.
 */
const bytes = await standInDat();
const root = new URL("../archive/", import.meta.url);
rmSync(root, { recursive: true, force: true });
const files = await readPkg(bytes);
for (const file of files) {
  const out = new URL(file.path, root);
  mkdirSync(new URL(".", out), { recursive: true });
  writeFileSync(out, file.bytes);
}
writeFileSync(new URL("../totallynotftl.dat", import.meta.url), bytes);
console.log(`wrote ${files.length} archive files, ${bytes.byteLength} dat bytes`);
