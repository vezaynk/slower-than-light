import { useEffect, useMemo, useState } from "react";
import dumpRaw from "@/game/wiki/dump/pages.jsonl?raw";
import type { Cite } from "./scan.ts";
import { Article } from "./View.tsx";
import { parseWiki } from "./wikitext.ts";
import "./wiki.css";

type Row = { title: string; ns?: number; text?: string; redirect?: string };
type PhraseCite = { phrase: string; cites: Cite[] };
type Parity = {
  built: string;
  stats: { hits: number; gaps: number; pagesWithHits: number };
  pages: Record<string, { hits: PhraseCite[]; gaps: PhraseCite[] }>;
};

const BASE = import.meta.env.BASE_URL;
const REPO = "https://github.com/vezaynk/slower-than-light/blob/master/";

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
    fetch(`${BASE}wiki-reader/parity.json`)
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
    const id = target.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    document.getElementById(id)?.scrollIntoView();
  }, [section, shown.section, doc]);

  useEffect(() => {
    if (!active || !window.matchMedia("(max-width: 800px)").matches) return;
    document.getElementById("parity-wording")?.scrollIntoView({ block: "start" });
  }, [active]);

  const picked = cites?.hits.find((h) => h.phrase === active) ?? null;

  return (
    <div className="parity">
      <header className="parity-bar">
        <div>
          <p className="parity-kicker">Code and wiki</p>
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
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="parity-list-toggle" onClick={() => setListOpen((v) => !v)}>
              {listOpen ? "Hide pages" : `Pages (${titles.length})`}
            </button>
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
              <button type="button" onClick={() => onPage(shown.title)}>
                {shown.title}
              </button>
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
                  onOpen={(next, section) => {
                    if (!next && section) {
                      document.getElementById(section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))?.scrollIntoView();
                      return;
                    }
                    onPage(next || shown.title, section);
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
            <p>
              A cite is <code>file#anchor</code>. The anchor is a choice id, an i18n key, or the function or const that
              holds the wording. Search the repo for that anchor and it still finds the code after lines move. The
              wording itself joins the page to the code, so the cite stores neither a line number nor a character offset.
            </p>
            <p>
              A paraphrase can be marked with <code>wikiCite(&quot;Page title&quot;, &quot;the wiki sentence&quot;)</code>{" "}
              beside the code. The anchor is the enclosing function, or a third argument when you pass a choice id.
            </p>
          </section>
          {picked ? (
            <section id="parity-wording">
              <h2>This wording</h2>
              <blockquote>{picked.phrase}</blockquote>
              {activeLink?.page ? (
                <p className="parity-actions">
                  <button type="button" onClick={() => onPage(activeLink.page, activeLink.hash)}>
                    Open {activeLink.page}
                  </button>
                </p>
              ) : null}
              <ul className="parity-cites">
                {picked.cites.map((cite) => (
                  <li key={`${cite.file}#${cite.anchor}#${cite.kind}#${cite.key ?? ""}`}>
                    <p className="parity-kind">{KIND[cite.kind]}</p>
                    <CiteCode file={cite.file} anchor={cite.anchor} />
                    {cite.key ? <CiteCode className="parity-key" file="src/i18n/en.json" anchor={cite.key} /> : null}
                    <p className="parity-actions">
                      <button type="button" onClick={() => copy(`${cite.file}#${cite.anchor}`)}>
                        Copy cite
                      </button>
                      <a href={`${REPO}${cite.file}`} target="_blank" rel="noreferrer">
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
                        <li key={`${cite.file}#${cite.anchor}#${cite.key ?? ""}`}>
                          <CiteCode file={cite.file} anchor={cite.anchor} />
                          <button type="button" onClick={() => copy(`${cite.file}#${cite.anchor}`)}>
                            Copy cite
                          </button>
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

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}

/** Break a `file#anchor` after a slash or hash, never in the middle of a name. */
function CiteCode({ file, anchor, className }: { file: string; anchor: string; className?: string }) {
  const parts = `${file}#${anchor}`.split(/([/#])/);
  return (
    <code className={className ? `parity-cite ${className}` : "parity-cite"}>
      {parts.map((part, i) =>
        part === "/" || part === "#" ? (
          <span key={i}>
            {part}
            <wbr />
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </code>
  );
}
