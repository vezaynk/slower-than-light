import { writeFileSync } from "node:fs";
import { standInDat, standInMod, standInXml } from "./archive.ts";

const xml = await standInXml();
const bytes = await standInDat();
const mod = await standInMod();
writeFileSync(new URL("../totallynotftl.xml", import.meta.url), xml);
writeFileSync(new URL("../totallynotftl.dat", import.meta.url), bytes);
writeFileSync(new URL("../totallynotftl.hyperspace.xml", import.meta.url), mod);
console.log(
  `wrote ${xml.length} xml chars, ${bytes.byteLength} dat bytes, ${mod.length} mod chars`,
);
