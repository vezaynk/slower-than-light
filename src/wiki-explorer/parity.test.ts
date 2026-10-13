import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cover } from "./highlight.ts";
import { normTitle, scanSource } from "./scan.ts";
import { inlinePlain, parseWiki, plainText } from "./wikitext.ts";

const en = JSON.parse(readFileSync(new URL("../i18n/en.json", import.meta.url), "utf8"));

test("blue options and surrender lines stay readable", () => {
  const text = plainText(
    "{{Blue Option|Clonebay|Search for a surviving DNA bank.|shortreq=Clone Bay}}\n" +
      "{{Winning|destroyed=true|You take out the ship.}}\n" +
      "{{SurrenderEscape(alt)|escape+surrender|PIRATE|events_ships.xml|50|20-40|2-4|50|30-40|3-4}}",
  );
  assert.match(text, /Search for a surviving DNA bank/);
  assert.match(text, /After destroying enemy ship/);
  assert.match(text, /50% chance for escape attempt at 20-40% hull/);
  assert.match(text, /30-40% hull/);
});

test("a multiline footnote stays in the notes and the numbered list continues", () => {
  const src = '# One.\n#* Item.<ref name=":0">Note body\ncontinues.\n</ref>\n# Two.\n{{Locations|Engi Controlled Sector|Zoltan Homeworlds|LRSmap=noship}}';
  const doc = parseWiki(src);
  assert.equal(
    doc.blocks.some((b) => b.k === "p" && inlinePlain(b.in) === ""),
    false,
  );
  const numbered = doc.blocks.filter((b) => b.k === "li" && b.mark === "#" && b.depth === 1);
  assert.equal(numbered.length, 2);
  assert.equal(doc.notes.length, 1);
  assert.match(inlinePlain(doc.notes[0]!.in), /Note body continues/);
  const text = plainText(src);
  assert.match(text, /One/);
  assert.match(text, /Two/);
  assert.match(text, /Engi Controlled Sector/);
  assert.doesNotMatch(text, /Note body/);
  const links = doc.blocks.flatMap((b) => (b.k === "p" ? b.in : [])).filter((n) => n.k === "a");
  assert.ok(links.some((n) => n.k === "a" && n.page === "Engi Controlled Sector"));
});

test("an html heading stays a heading a section link can find", () => {
  const src = 'Intro <ref name="a"/>\n=== <h2>Engi Controlled Sector</h2> ===\nBody text.\n<ref name="b">A note</ref>';
  const doc = parseWiki(src);
  const heading = doc.blocks.find((b) => b.k === "h");
  assert.ok(heading && heading.k === "h");
  assert.equal(heading.n, 3);
  assert.equal(inlinePlain(heading.in), "Engi Controlled Sector");
  assert.match(plainText(src), /Intro/);
  assert.match(plainText(src), /Body text/);
});

test("a cited arrival sentence survives italics", () => {
  const wiki = "''You arrive at a Zoltan research facility. They say they are researching genetic distortion due to stasis sleep and prolonged FTL travel. They ask if your crew has the time to undergo a few scans.''";
  const phrase = en["wiki.quests-a-pages.you-arrive-at-a-zoltan-research"];
  assert.ok(plainText(wiki).includes(phrase));
});

test("the arrival sentence cites the event slug, not a line", () => {
  const src = readFileSync(new URL("../game/wiki/quests-a-pages.ts", import.meta.url), "utf8");
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/quests-a-pages.ts", src, titles, new Map(Object.entries(en)));
  const hit = sightings.find((s) => s.phrase.startsWith("You arrive at a Zoltan research facility"));
  assert.ok(hit);
  assert.equal(hit.cite.file, "src/game/wiki/quests-a-pages.ts");
  assert.equal(hit.cite.anchor, "zoltan-research-facility");
  assert.deepEqual(hit.pages, ["Zoltan research facility"]);
  assert.equal(hit.cite.key, "wiki.quests-a-pages.you-arrive-at-a-zoltan-research");
  assert.equal("line" in hit.cite, false);
});

test("the stasis button cites its choice id", () => {
  const src = readFileSync(new URL("../game/wiki/quests-a-pages.ts", import.meta.url), "utf8");
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/quests-a-pages.ts", src, titles, new Map(Object.entries(en)));
  const hit = sightings.find((s) => s.phrase === "Ask if they can fix this.");
  assert.ok(hit);
  assert.equal(hit.cite.anchor, "c:zoltan-research-facility:3");
});

test("a page comment cites the enclosing function", () => {
  const src = readFileSync(new URL("../game/unlocks.ts", import.meta.url), "utf8");
  const titles = new Map([[normTitle("Engi Cruiser"), "Engi Cruiser"]]);
  const sightings = scanSource("src/game/unlocks.ts", src, titles, new Map());
  const hit = sightings.find((s) => s.phrase.startsWith("Reaching a sector 5"));
  assert.ok(hit);
  assert.equal(hit.cite.anchor, "deriveUnlocks");
  assert.equal(hit.cite.kind, "comment");
  assert.deepEqual(hit.pages, ["Engi Cruiser"]);
});

test("wikiCite records a paraphrase on the enclosing function", () => {
  const src = 'export function openPod() {\n  wikiCite("Zoltan research facility", "They hook it up to their system.");\n}\n';
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/cite.ts", src, titles, new Map());
  const hit = sightings.find((s) => s.cite.kind === "marker");
  assert.ok(hit);
  assert.equal(hit.cite.anchor, "openPod");
  assert.equal(hit.phrase, "They hook it up to their system.");
});

test("the longer phrase keeps the highlight", () => {
  const text = "You arrive at a Zoltan research facility and stay.";
  const marks = cover(text, ["Zoltan research facility", text]);
  assert.equal(marks.length, 1);
  assert.equal(marks[0].phrase, text);
});
