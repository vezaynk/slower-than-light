import { writeFileSync } from "node:fs";
import { standInDat, standInXml } from "./archive.ts";

const xml = await standInXml();
const bytes = await standInDat();
writeFileSync(new URL("../totallynotftl.xml", import.meta.url), xml);
writeFileSync(new URL("../totallynotftl.dat", import.meta.url), bytes);
console.log(`wrote ${xml.length} xml chars, ${bytes.byteLength} dat bytes`);
