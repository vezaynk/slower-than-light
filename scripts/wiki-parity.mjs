import { writeParity } from "../src/wiki-explorer/build.ts";

const parity = writeParity();
console.log(
  `wiki parity: ${parity.stats.pagesWithHits} pages, ${parity.stats.hits} phrases, ${parity.stats.gaps} not verbatim`,
);
