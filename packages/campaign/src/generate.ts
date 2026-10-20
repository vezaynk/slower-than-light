import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { packFtlZip } from "@stl/ftldat";
import { gapModFiles } from "./xml.ts";

const files = gapModFiles();
const root = new URL("../mod/", import.meta.url);
rmSync(root, { recursive: true, force: true });
const encoder = new TextEncoder();
for (const file of files) {
  const out = new URL(file.path, root);
  mkdirSync(new URL(".", out), { recursive: true });
  writeFileSync(out, file.xml);
}
writeFileSync(
  new URL("../base.ftl", import.meta.url),
  packFtlZip(files.map((file) => ({ path: file.path, bytes: encoder.encode(file.xml) }))),
);
console.log(`wrote ${files.length} gap files, base.ftl`);
