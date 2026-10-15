import { writeFileSync } from "node:fs";
import { campaignXml } from "./xml.ts";

const target = new URL("../base.xml", import.meta.url);
writeFileSync(target, await campaignXml());
