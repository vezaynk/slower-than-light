import { writeFileSync } from "node:fs";
import { standInDat } from "./archive.ts";

const target = new URL("../totallynotftl.dat", import.meta.url);
const bytes = await standInDat();
writeFileSync(target, bytes);
console.log(`wrote ${bytes.byteLength} bytes`);
