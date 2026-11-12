import { CREW_POOL, NAME_SYLLABLES } from "@stl/catalog";

/** Original beacon sentences in the archive's textList shape, plus the name lists the game reads. */
const FIXTURES = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
  <text name="stand_in_quiet">Nothing here.</text>
  <textList name="STAND_IN_CALM">
    <text>Empty beacon.</text>
    <text id="stand_in_quiet"/>
  </textList>
  <textList name="STAND_IN_MORE">
    <text>Second line.</text>
  </textList>
  <textList name="STAND_IN_NEST">
    <text>First line.</text>
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

/**
 * INVENTED: the stand-in's data/names.xml. ftl.dat keeps one male and one female human list, and FTL names a
 * crewmember from the list that matches their sex. Every name here is the stand-in's own.
 */
const MALE_NAMES = [
  "Arlo Fenn",
  "Dov Reyes",
  "Hal Ostrow",
  "Jory Vance",
  "Kip Marlo",
  "Orrin Tate",
  "Pell Osei",
  "Rafe Calder",
];
const FEMALE_NAMES = [
  "Bea Lorne",
  "Cass Imani",
  "Dela Wren",
  "Edda Quist",
  "Lio Marsh",
  "Nessa Holt",
  "Sefa Prior",
  "Tamsin Ardo",
];

function nameListXml(sex: "male" | "female", names: readonly string[]): string {
  const rows = names.map((name) => `    <name>${name}</name>`).join("\n");
  return `  <nameList race="human" sex="${sex}">\n${rows}\n  </nameList>`;
}

export const NAMES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FTL>
${nameListXml("male", MALE_NAMES)}
${nameListXml("female", FEMALE_NAMES)}
</FTL>
`;

export const TEXT_LISTS_XML = `${FIXTURES}
${textListXml("NAME_SYLLABLES", NAME_SYLLABLES)}
${textListXml("CREW_POOL", CREW_POOL)}
</FTL>
`;
