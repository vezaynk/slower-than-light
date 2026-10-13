import { type ReactNode } from "react";
import { cover } from "./highlight.ts";
import { inlinePlain, type Block, type Doc, type Inline } from "./wikitext.ts";

type PageLink = { page: string; hash?: string };
type Pick = (phrase: string, link?: PageLink) => void;

function Marked({
  text,
  start,
  ranges,
  link,
  onPick,
}: {
  text: string;
  start: number;
  ranges: { start: number; end: number; phrase: string }[];
  link?: PageLink;
  onPick: Pick;
}) {
  const end = start + text.length;
  const mine = ranges.filter((r) => r.end > start && r.start < end);
  if (!mine.length) return <>{text}</>;
  const bits: ReactNode[] = [];
  let at = start;
  mine.forEach((r, idx) => {
    const a = Math.max(r.start, start);
    const b = Math.min(r.end, end);
    if (a > at) bits.push(text.slice(at - start, a - start));
    bits.push(
      <span
        key={`${r.start}-${idx}`}
        role="button"
        tabIndex={0}
        className="parity-hit"
        onClick={(e) => {
          e.stopPropagation();
          onPick(r.phrase, link);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onPick(r.phrase, link);
          }
        }}
      >
        {text.slice(a - start, b - start)}
      </span>,
    );
    at = b;
  });
  if (at < end) bits.push(text.slice(at - start));
  return <>{bits}</>;
}

function Nodes({
  nodes,
  phrases,
  onPick,
  onOpen,
}: {
  nodes: Inline[];
  phrases: readonly string[];
  onPick: Pick;
  onOpen: (page: string, hash?: string) => void;
}) {
  const ranges = cover(inlinePlain(nodes), phrases);
  let cursor = 0;
  function walk(list: Inline[], prefix: string, link?: PageLink): ReactNode[] {
    return list.map((n, idx) => {
      const key = `${prefix}${idx}`;
      if (n.k === "t") {
        const start = cursor;
        cursor += n.s.length;
        return <Marked key={key} text={n.s} start={start} ranges={ranges} link={link} onPick={onPick} />;
      }
      if (n.k === "b") return <strong key={key}>{walk(n.in, `${key}.`, link)}</strong>;
      if (n.k === "i") return <em key={key}>{walk(n.in, `${key}.`, link)}</em>;
      if (n.k === "c")
        return (
          <span key={key} style={{ color: safeColor(n.color) }}>
            {walk(n.in, `${key}.`, link)}
          </span>
        );
      if (n.k === "a") {
        const page = n.page;
        const hash = n.hash;
        const here = page ? { page, hash } : link;
        return (
          <button key={key} type="button" className="parity-link" onClick={() => onOpen(page, hash)}>
            {walk(n.in, `${key}.`, here)}
          </button>
        );
      }
      if (n.k === "x") {
        const start = cursor;
        cursor += n.s.length;
        return (
          <a key={key} href={n.href} target="_blank" rel="noreferrer">
            <Marked text={n.s} start={start} ranges={ranges} link={link} onPick={onPick} />
          </a>
        );
      }
      if (n.k === "f") {
        const label = n.alt ? `${n.alt} (${n.name})` : n.name;
        const start = cursor;
        cursor += label.length;
        return (
          <span key={key} className="parity-file" title={n.name}>
            <Marked text={label} start={start} ranges={ranges} link={link} onPick={onPick} />
          </span>
        );
      }
      if (n.k === "tip") {
        const start = cursor;
        cursor += n.s.length;
        return (
          <span key={key} className="parity-tip" title={n.tip}>
            <Marked text={n.s} start={start} ranges={ranges} link={link} onPick={onPick} />
          </span>
        );
      }
      if (n.k === "br") return <br key={key} />;
      if (n.k === "ref") return <sup key={key} className="parity-ref">{n.n}</sup>;
      return null;
    });
  }
  return <>{walk(nodes, "n")}</>;
}

function safeColor(c: string): string | undefined {
  return /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(c) ? c : undefined;
}

function Blocks({
  doc,
  phrases,
  onPick,
  onOpen,
}: {
  doc: Doc;
  phrases: readonly string[];
  onPick: Pick;
  onOpen: (page: string, hash?: string) => void;
}) {
  const markers = listMarkers(doc.blocks);
  return (
    <>
      {doc.blocks.map((b, i) => {
        return <BlockView key={i} block={b} marker={markers[i] ?? ""} phrases={phrases} onPick={onPick} onOpen={onOpen} />;
      })}
      {doc.notes.length ? (
        <section className="parity-notes">
          <h2>Notes</h2>
          <ol>
            {doc.notes.map((note) => (
              <li key={note.n} id={`ref-${note.n}`}>
                <Nodes nodes={note.in} phrases={phrases} onPick={onPick} onOpen={onOpen} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {doc.cats.length ? <p className="parity-cats">Categories: {doc.cats.join(", ")}</p> : null}
    </>
  );
}

function listMarkers(blocks: Block[]): string[] {
  const numbers = new Map<number, number>();
  return blocks.map((b) => {
    if (b.k !== "li") {
      numbers.clear();
      return "";
    }
    if (b.mark !== "#") return b.mark === ":" || b.mark === ";" ? "" : "•";
    const n = (numbers.get(b.depth) ?? 0) + 1;
    numbers.set(b.depth, n);
    for (const d of [...numbers.keys()]) if (d > b.depth) numbers.delete(d);
    return `${n}.`;
  });
}

function BlockView({
  block,
  marker,
  phrases,
  onPick,
  onOpen,
}: {
  block: Block;
  marker: string;
  phrases: readonly string[];
  onPick: Pick;
  onOpen: (page: string, hash?: string) => void;
}) {
  if (block.k === "hr") return <hr />;
  if (block.k === "pre") return <pre className="parity-pre">{block.s}</pre>;
  if (block.k === "h") {
    const Tag = block.n <= 2 ? "h2" : block.n === 3 ? "h3" : "h4";
    const id = inlinePlain(block.in).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (
      <Tag id={id}>
        <Nodes nodes={block.in} phrases={phrases} onPick={onPick} onOpen={onOpen} />
      </Tag>
    );
  }
  if (block.k === "p")
    return (
      <p>
        <Nodes nodes={block.in} phrases={phrases} onPick={onPick} onOpen={onOpen} />
      </p>
    );
  if (block.k === "li") {
    return (
      <div className="parity-li" style={{ marginLeft: `${(block.depth - 1) * 16}px` }}>
        {marker ? <span className="parity-marker">{marker}</span> : null}
        <div>
          <Nodes nodes={block.in} phrases={phrases} onPick={onPick} onOpen={onOpen} />
        </div>
      </div>
    );
  }
  return (
    <div className="parity-table-wrap">
      <table>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.cells.map((cell, c) => {
                const Tag = row.head ? "th" : "td";
                return (
                  <Tag key={c}>
                    <Nodes nodes={cell} phrases={phrases} onPick={onPick} onOpen={onOpen} />
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Article({
  doc,
  phrases,
  onPick,
  onOpen,
}: {
  doc: Doc;
  phrases: readonly string[];
  onPick: Pick;
  onOpen: (page: string, hash?: string) => void;
}) {
  return (
    <div className="parity-prose">
      <Blocks doc={doc} phrases={phrases} onPick={onPick} onOpen={onOpen} />
    </div>
  );
}
