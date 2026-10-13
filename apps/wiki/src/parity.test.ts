import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cover } from "./highlight.ts";
import { normTitle, scanSource } from "./scan.ts";
import { citationWarnings, inlinePlain, parseWiki, plainText } from "./wikitext.ts";

const en = JSON.parse(readFileSync(new URL("../../game/src/i18n/en.json", import.meta.url), "utf8"));

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
  const src = readFileSync(new URL("../../game/src/game/wiki/quests-a-pages.ts", import.meta.url), "utf8");
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/quests-a-pages.ts", src, titles, new Map(Object.entries(en)));
  const hit = sightings.find((s) => s.cite.key === "wiki.quests-a-pages.you-arrive-at-a-zoltan-research");
  assert.ok(hit);
  assert.equal(hit.cite.file, "src/game/wiki/quests-a-pages.ts");
  assert.equal(hit.cite.anchor, "zoltan-research-facility");
  assert.deepEqual(hit.pages, ["Zoltan research facility"]);
  assert.equal("line" in hit.cite, false);
  const quoted = sightings.find((s) => s.phrase === "You arrive at a Zoltan research facility." && s.cite.pinned);
  assert.equal(quoted?.cite.anchor, "zoltan-research-facility");
});

test("the stasis button cites its choice id", () => {
  const src = readFileSync(new URL("../../game/src/game/wiki/quests-a-pages.ts", import.meta.url), "utf8");
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/quests-a-pages.ts", src, titles, new Map(Object.entries(en)));
  const hit = sightings.find((s) => s.phrase === "Ask if they can fix this.");
  assert.ok(hit);
  assert.equal(hit.cite.anchor, "c:zoltan-research-facility:3");
});

test("a page comment cites the enclosing function", () => {
  const src = readFileSync(new URL("../../game/src/game/unlocks.ts", import.meta.url), "utf8");
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

test("a wiki citation quotes the page once and keeps its section", () => {
  const src =
    'export function openPod() {\n' +
    "  // Wiki citations:\n" +
    '  // > "Ask if they can fix this." — [[Zoltan research facility]]\n' +
    '  // > "doesn\'t surrender, nor tries to escape" — [[Zoltan research facility#Trivia]]\n' +
    "}\n";
  const titles = new Map([[normTitle("Zoltan research facility"), "Zoltan research facility"]]);
  const sightings = scanSource("src/game/wiki/quests-a.ts", src, titles, new Map());
  const ask = sightings.filter((s) => s.phrase === "Ask if they can fix this.");
  assert.equal(ask.length, 1);
  assert.equal(ask[0]!.cite.kind, "comment");
  assert.equal(ask[0]!.cite.anchor, "openPod");
  assert.equal(ask[0]!.cite.pinned, true);
  assert.equal(ask[0]!.cite.section, undefined);
  assert.deepEqual(ask[0]!.pages, ["Zoltan research facility"]);
  const trivia = sightings.filter((s) => s.phrase === "doesn't surrender, nor tries to escape");
  assert.equal(trivia.length, 1);
  assert.equal(trivia[0]!.cite.section, "Trivia");
  assert.equal(trivia[0]!.cite.pinned, true);
  assert.equal(trivia[0]!.cite.anchor, "openPod");
  const tested = scanSource("src/game/wiki/quests-a.test.ts", src, titles, new Map());
  assert.equal(tested.find((s) => s.phrase === "Ask if they can fix this.")?.cite.kind, "test");
  const label = scanSource(
    "src/game/wiki/quests-a-pages.ts",
    'export function leave() {\n  // > "Decline." — [[Zoltan research facility]]\n}\n',
    titles,
    new Map(),
  );
  assert.equal(label.length, 1);
  assert.equal(label[0]!.phrase, "Decline.");
  assert.equal(label[0]!.cite.pinned, true);
  const chained =
    "const CHOICES = {\n" +
    '  "c:zoltan-research-facility:3": (g) => {\n' +
    "    const joined = crew();\n" +
    "  },\n" +
    '  "qa:zrf:thanks": (g) => {\n' +
    '    // > "Thank you for rescuing us." — [[Zoltan research facility]]\n' +
    "  },\n" +
    "};\n";
  const thanks = scanSource("src/game/wiki/quests-a.ts", chained, titles, new Map());
  assert.equal(thanks.find((s) => s.phrase.startsWith("Thank you"))?.cite.anchor, "qa:zrf:thanks");
});

test("a pinned citation warns only when the passage is not one block", () => {
  const wiki = [
    "Lead sentence about scrap.",
    "== Trivia ==",
    "This event can occur multiple times per game.",
    "",
    "This event can occur multiple times per game.",
    "== Other ==",
    "A different line about scrap rewards.",
  ].join("\n");
  assert.equal(citationWarnings(wiki, "This event can occur multiple times per game.", "Trivia"), null);
  assert.equal(citationWarnings(wiki, "This event can occur multiple times per game."), null);
  assert.equal(citationWarnings(wiki, "Lead sentence about scrap.", "Trivia"), "outside the section");
  assert.equal(citationWarnings(wiki, "no such sentence anywhere on this page"), "not on the page");
  assert.equal(citationWarnings(wiki, "no such sentence anywhere on this page", "Nope"), "heading not on the page");
  assert.equal(citationWarnings(wiki, "about scrap"), "matches 2 places");
});

test("the longer phrase keeps the highlight", () => {
  const text = "You arrive at a Zoltan research facility and stay.";
  const marks = cover(text, ["Zoltan research facility", text]);
  assert.equal(marks.length, 1);
  assert.equal(marks[0].phrase, text);
});
