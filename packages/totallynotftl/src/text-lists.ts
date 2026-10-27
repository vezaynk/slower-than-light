import { CREW_POOL, NAME_SYLLABLES } from "@stl/catalog";

/** Original beacon sentences in the archive's textList shape, plus the name lists the game reads. */
const FIXTURES = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="stand_in_quiet">The beacon holds still.</text>
  <textList name="STAND_IN_CALM">
    <text>Nothing moves.</text>
    <text id="stand_in_quiet"/>
  </textList>
  <textList name="STAND_IN_MORE">
    <text>A second line waits.</text>
  </textList>
  <textList name="STAND_IN_NEST">
    <text>The near reading.</text>
    <text load="STAND_IN_MORE"/>
  </textList>
  <event name="STAND_IN_BEACON">
    <text load="STAND_IN_CALM"/>
  </event>
  <event name="STAND_IN_NESTED">
    <text load="STAND_IN_NEST"/>
  </event>`;

function textListXml(name: string, lines: readonly string[]): string {
  const rows = lines.map((line) => `    <text>${line}</text>`).join("\n");
  return `  <textList name="${name}">\n${rows}\n  </textList>`;
}

export const TEXT_LISTS_XML = `${FIXTURES}
${textListXml("NAME_SYLLABLES", NAME_SYLLABLES)}
${textListXml("CREW_POOL", CREW_POOL)}
</FTL>
`;
