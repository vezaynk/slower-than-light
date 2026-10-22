import { sectorDef } from "@stl/pack";
import { readSectorTypes } from "../../../../../packages/pack/src/ftl.ts";
import { readDocument } from "../../../../../packages/pack/src/parse.ts";
import { registerCoverExtra } from "../archive-cover-extra.ts";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Sector type UNKNOWN is not a chart colour. `readSectorTypes` records no colour, and the loaded sector stays that
 * way, so the chart does not roll it. Any other type name stays with the default colour check.
 */
registerCoverExtra({
  id: "sector-type",
  sectorType(name, sectors) {
    if (name !== "UNKNOWN") return false;
    const body = sectors.map((id) => `<sector>${escapeXml(id)}</sector>`).join("");
    const colours = readSectorTypes([
      readDocument(`<FTL><sectorType name="UNKNOWN">${body}</sectorType></FTL>`),
    ]);
    return sectors.every((id) => colours.get(id) === "" && (sectorDef(id)?.group ?? "") === "");
  },
});
