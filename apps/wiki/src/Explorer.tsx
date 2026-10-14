import { Button, Kicker } from "@stl/ui";
import { useEffect, useMemo, useState } from "react";
import dumpRaw from "@stl/wiki-dump/pages.jsonl?raw";
import type { Cite } from "./scan.ts";
import { Article } from "./View.tsx";
import { parseWiki, wikiSlug } from "./wikitext.ts";
import "./wiki.css";

type Row = { title: string; ns?: number; text?: string; redirect?: string };
type PhraseCite = { phrase: string; cites: Cite[] };
type Parity = {
  built: string;
  stats: { hits: number; gaps: number; pagesWithHits: number };
  pages: Record<string, { hits: PhraseCite[]; gaps: PhraseCite[] }>;
};

const BASE = import.meta.env.BASE_URL;
const REPO = "https://github.com/vezaynk/slower-than-light/blob/master/apps/game/";

const KIND: Record<Cite["kind"], string> = {
  copy: "Printed by the game",
  comment: "Quoted beside the code",
  test: "Locked by a test",
  marker: "Marked in the code",
};

function loadRows(raw: string): Map<string, Row> {
  const rows = new Map<string, Row>();
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as Row;
    rows.set(row.title, row);
  }
  return rows;
}

function canonical(rows: Map<string, Row>, title: string, seen = new Set<string>()): string {
  if (seen.has(title)) return title;
  seen.add(title);
  const next = rows.get(title)?.redirect?.split("#")[0];
  return next && next !== title ? canonical(rows, next, seen) : title;
}

function articleText(
  rows: Map<string, Row>,
  title: string,
  seen = new Set<string>(),
): { title: string; from?: string; text: string; section?: string } {
  if (seen.has(title)) return { title, text: "" };
  seen.add(title);
  const row = rows.get(title);
  if (!row) return { title, text: "" };
  const redirect = row.redirect ?? "";
  const hashAt = redirect.indexOf("#");
  const next = (hashAt < 0 ? redirect : redirect.slice(0, hashAt)).trim();
  const section = hashAt < 0 ? undefined : redirect.slice(hashAt + 1).trim();
  if (next && next !== title) {
    const target = articleText(rows, next, seen);
    return { ...target, from: title, section: target.section || section };
  }
  return { title: row.title, text: row.text ?? "" };
}

export function Explorer({
  page,
  section,
  onPage,
}: {
  page: string;
  section: string;
  onPage: (title: string, section?: string) => void;
}) {
  const rows = useMemo(() => loadRows(dumpRaw), []);
  const [parity, setParity] = useState<Parity | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "linked" | "differ" | "plain">("linked");
  const [active, setActive] = useState("");
  const [activeLink, setActiveLink] = useState<{ page: string; hash?: string } | null>(null);
  const [listOpen, setListOpen] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetch(`${BASE}parity.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`The cite index is missing (${res.status}).`);
        return res.json() as Promise<Parity>;
      })
      .then((data) => {
        if (!cancel) setParity(data);
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "The cite index did not load.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const shown = articleText(rows, page);
  const cites = parity?.pages[shown.title];
  const doc = useMemo(() => (shown.text ? parseWiki(shown.text) : null), [shown.text, shown.title]);
  const phrases = cites?.hits.map((h) => h.phrase) ?? [];

  const titles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: { title: string; hits: number; gaps: number }[] = [];
    for (const row of rows.values()) {
      if ((row.ns ?? 0) !== 0) continue;
      if (q && !row.title.toLowerCase().includes(q)) continue;
      const can = canonical(rows, row.title);
      const info = parity?.pages[can];
      const hits = info?.hits.length ?? 0;
      const gaps = info?.gaps.length ?? 0;
      if (filter === "linked" && hits === 0) continue;
      if (filter === "differ" && gaps === 0) continue;
      if (filter === "plain" && (hits > 0 || gaps > 0)) continue;
      if (row.redirect && !(q && row.title !== can)) continue;
      list.push({ title: row.title, hits, gaps });
    }
    list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [rows, query, filter, parity]);

  useEffect(() => {
    setActive("");
    setActiveLink(null);
  }, [shown.title]);

  useEffect(() => {
    const target = section || shown.section || "";
    if (!target || !doc) return;
    document.getElementById(wikiSlug(target))?.scrollIntoView();
  }, [section, shown.section, doc]);

  useEffect(() => {
    if (!active || !window.matchMedia("(max-width: 800px)").matches) return;
    document.getElementById("parity-wording")?.scrollIntoView({ block: "start" });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const named = cites?.hits.find((h) => h.phrase === active)?.cites.find((c) => c.section)?.section;
    const root = document.querySelector(".parity-prose");
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>(".parity-hit")].filter((el) => el.dataset.phrase === active);
    const slug = named ? wikiSlug(named) : "";
    const scoped = slug
      ? nodes.filter((el) => el.closest("[data-wiki-section]")?.getAttribute("data-wiki-section") === slug)
      : nodes;
    (scoped[0] ?? nodes[0])?.scrollIntoView({ block: "nearest" });
  }, [active, cites, doc]);

  const picked = cites?.hits.find((h) => h.phrase === active) ?? null;

  return (
    <div className="parity">
      <header className="parity-bar">
        <div>
          <Kicker className="parity-kicker">Code and wiki</Kicker>
          <h1>Wiki parity</h1>
        </div>
        <p className="parity-stats">
          {parity
            ? `${parity.stats.pagesWithHits} pages linked · ${parity.stats.hits} phrases · ${parity.stats.gaps} not verbatim`
            : error || "Indexing wording against the code…"}
        </p>
        <a className="parity-back" href={BASE}>
          Back to the ship
        </a>
      </header>
      <div className="parity-body">
        <aside className={listOpen ? "parity-list" : "parity-list is-shut"}>
          <div className="parity-list-tools">
            <label>
              Find a page
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Page name"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <div className="parity-filters" role="group" aria-label="Which pages">
              {(
                [
                  ["linked", "Linked"],
                  ["differ", "Differ"],
                  ["plain", "Not linked"],
                  ["all", "All"],
                ] as const
              ).map(([id, label]) => (
                <Button key={id} variant="ghost" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}
                </Button>
              ))}
            </div>
            <Button variant="ghost" className="parity-list-toggle" onClick={() => setListOpen((v) => !v)}>
              {listOpen ? "Hide pages" : `Pages (${titles.length})`}
            </Button>
          </div>
          <ul>
            {titles.map((row) => (
              <li key={row.title}>
                <button
                  type="button"
                  aria-current={row.title === page ? "page" : undefined}
                  onClick={() => {
                    onPage(row.title);
                    if (window.matchMedia("(max-width: 800px)").matches) setListOpen(false);
                  }}
                >
                  <span>{row.title}</span>
                  {row.hits ? <small>{row.hits}</small> : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <article className="parity-article">
          {shown.from ? (
            <p className="parity-redirect">
              {shown.from} redirects here.{" "}
              <Button variant="text" onClick={() => onPage(shown.title)}>
                {shown.title}
              </Button>
            </p>
          ) : null}
          {page ? (
            <>
              <h1 id="top">{shown.title}</h1>
              <p className="parity-count">
                {cites
                  ? `${cites.hits.length} highlighted phrase${cites.hits.length === 1 ? "" : "s"} in the code`
                  : "No wording from this page was found in the code."}
                {cites && cites.gaps.length ? ` · ${cites.gaps.length} in the code but not verbatim` : ""}
              </p>
              {doc ? (
                <Article
                  doc={doc}
                  phrases={phrases}
                  onPick={(phrase, link) => {
                    setActive(phrase);
                    setActiveLink(link ?? null);
                  }}
                  onOpen={(next, hash) => {
                    if (!next && hash) {
                      document.getElementById(wikiSlug(hash))?.scrollIntoView();
                      return;
                    }
                    onPage(next || shown.title, hash);
                  }}
                />
              ) : (
                <p>This title is not in the dump.</p>
              )}
            </>
          ) : (
            <p className="parity-empty">Choose a page. Yellow marks wording the implementation uses.</p>
          )}
        </article>
        <aside className="parity-side">
          <section>
            <h2>How a cite works</h2>
            <p>The number is the line where this wording sits in the source. View file opens that line.</p>
            <p>
              A quotation in the source is <code>&gt; &quot;the wiki words&quot; — [[Page]]</code>, or{" "}
              <code>[[Page#Section]]</code> when the words sit under a heading. Selecting it scrolls to that passage.
            </p>
          </section>
          {picked ? (
            <section id="parity-wording">
              <h2>This wording</h2>
              <blockquote>{picked.phrase}</blockquote>
              {activeLink?.page ? (
                <p className="parity-actions">
                  <Button variant="ghost" onClick={() => onPage(activeLink.page, activeLink.hash)}>
                    Open {activeLink.page}
                  </Button>
                </p>
              ) : null}
              <ul className="parity-cites">
                {picked.cites.map((cite) => (
                  <li key={`${cite.file}#${cite.anchor}#${cite.line}#${cite.kind}#${cite.key ?? ""}#${cite.section ?? ""}`}>
                    <p className="parity-kind">{KIND[cite.kind]}</p>
                    <CiteCode file={cite.file} line={cite.line} />
                    {cite.section ? <p>{`[[${shown.title}#${cite.section}]]`}</p> : null}
                    {cite.key ? <code className="parity-cite parity-key">{cite.key}</code> : null}
                    <p className="parity-actions">
                      <a href={fileHref(cite.file, cite.line)} target="_blank" rel="noreferrer">
                        View file
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="parity-hint">Select a yellow phrase to see where the code uses it.</p>
          )}
          {cites && cites.gaps.length ? (
            <section>
              <h2>In the code, not verbatim</h2>
              <ul className="parity-gaps">
                {cites.gaps.map((gap) => (
                  <li key={gap.phrase}>
                    <p>{gap.phrase}</p>
                    <ul className="parity-cites">
                      {gap.cites.map((cite) => (
                        <li key={`${cite.file}#${cite.anchor}#${cite.line}#${cite.key ?? ""}`}>
                          <CiteCode file={cite.file} line={cite.line} />
                          <a href={fileHref(cite.file, cite.line)} target="_blank" rel="noreferrer">
                            View file
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="parity-attr">
            Wiki text is from the FTL Wiki, CC BY-SA 3.0. File names stand in for pictures.
          </p>
        </aside>
      </div>
    </div>
  );
}

function fileHref(file: string, line: number): string {
  const at = line > 0 ? `#L${line}` : "";
  return `${REPO}${file}${at}`;
}

/** Break a path after a slash, and keep the line number on its own piece. */
function CiteCode({ file, line, className }: { file: string; line: number; className?: string }) {
  const parts = file.split(/(\/)/);
  return (
    <code className={className ? `parity-cite ${className}` : "parity-cite"}>
      {parts.map((part, i) =>
        part === "/" ? (
          <span key={i}>
            {part}
            <wbr />
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
      {line > 0 ? <span>:{line}</span> : null}
    </code>
  );
}
