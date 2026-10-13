import { writeParity } from "../src/wiki-explorer/build.ts";

const { parity, warnings } = writeParity();
console.log(
  `wiki parity: ${parity.stats.pagesWithHits} pages, ${parity.stats.hits} phrases, ${parity.stats.gaps} not verbatim`,
);
for (const line of warnings) console.log(`wiki citation: ${line}`);
