/**
 * Per the user: Options › Game files. Upload ftl.dat, .ftl and .zip files, set the order they load in, and look inside
 * each one. The first enabled file is the base game; each later one is applied over it, top to bottom. The campaign
 * rules always load last. Applying reloads the page, and boot reads the saved order (pack/boot.ts).
 * INVENTED layout, on the Options sheet's rows and switches.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  addFiles,
  loadOrder,
  orderKey,
  removeFile,
  resetArchives,
  saveOrder,
  type ArchiveEntry,
} from "@/game/pack/archive-list";
import {
  formatBytes,
  TAG_WORDS,
  type ArchiveFile,
  type ArchiveSummary,
  type FileKind,
} from "@/game/pack/archive-inspect";
import { bootSkipped, bootedOrderKey, urlArchive } from "@/game/pack/boot";
import { CAMPAIGN_ID, combineEntries, forgetEntry, openEntry } from "@/game/pack/archive-reader";
import type { FtlExtract } from "@stl/ftldat";

const ACCEPT = ".dat,.ftl,.zip";

type Opened =
  | { state: "loading" }
  | { state: "error"; reason: string }
  | { state: "ready"; files: FtlExtract; summary: ArchiveSummary };

type Checked =
  | { state: "loading" }
  | { state: "error"; reason: string }
  | { state: "done"; summary: ArchiveSummary; skipped: string[] };

const CAMPAIGN_ENTRY: ArchiveEntry = {
  id: CAMPAIGN_ID,
  name: "Campaign rules",
  size: 0,
  enabled: true,
  builtin: true,
};

function guessRole(entry: ArchiveEntry, opened?: Opened): "base" | "mod" {
  if (opened?.state === "ready") return opened.summary.role;
  if (entry.builtin) return entry.id === CAMPAIGN_ID ? "mod" : "base";
  return /\.dat$/i.test(entry.name) ? "base" : "mod";
}

export function GameFilesPanel() {
  const [order, setOrder] = useState<ArchiveEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, Opened>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dropping, setDropping] = useState(false);
  const [preview, setPreview] = useState<Checked | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const booted = bootedOrderKey();
  const fromUrl = urlArchive();
  const skipped = bootSkipped();

  useEffect(() => {
    let live = true;
    loadOrder().then((list) => {
      if (!live) return;
      setOrder(list);
      setSelected((at) => at ?? list.find((row) => row.enabled)?.id ?? list[0]?.id ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  // Read the selected file, and the first enabled one so its role (base or mod) is known.
  const firstOn = order?.find((row) => row.enabled)?.id;
  useEffect(() => {
    for (const id of [selected, firstOn]) {
      if (!id || opened[id]) continue;
      setOpened((all) => ({ ...all, [id]: { state: "loading" } }));
      openEntry(id).then(
        ({ files, summary }) =>
          setOpened((all) => ({ ...all, [id]: { state: "ready", files, summary } })),
        (err: unknown) =>
          setOpened((all) => ({
            ...all,
            [id]: { state: "error", reason: err instanceof Error ? err.message : String(err) },
          })),
      );
    }
  }, [selected, firstOn, opened]);

  if (!order) return <p className="gf-note">{"Reading your game files…"}</p>;

  const pending = booted !== undefined && booted !== "url" && orderKey(order) !== booted;
  const first = order.find((row) => row.enabled);
  const firstIsMod = first ? guessRole(first, opened[first.id]) === "mod" : false;

  async function commit(next: ArchiveEntry[]) {
    setOrder(next);
    setPreview(null);
    try {
      await saveOrder(next);
      setMessage(null);
    } catch (err) {
      setMessage(`Could not save the order: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function upload(files: File[]) {
    const wanted = files.filter((file) => /\.(dat|ftl|zip)$/i.test(file.name));
    const ignored = files.length - wanted.length;
    if (!wanted.length || !order) {
      if (ignored) setMessage("Only .dat, .ftl and .zip files can be added.");
      return;
    }
    setBusy(true);
    try {
      const next = await addFiles(order, wanted);
      setOrder(next);
      setPreview(null);
      setSelected(next[next.length - 1]!.id);
      setMessage(
        ignored
          ? `${ignored} file${ignored === 1 ? " was" : "s were"} not .dat, .ftl or .zip and were skipped.`
          : null,
      );
    } catch (err) {
      setMessage(
        `Could not store the file: ${err instanceof Error ? err.message : String(err)}. The browser may be out of space.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function move(from: number, to: number) {
    if (!order || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row!);
    void commit(next);
  }

  async function remove(entry: ArchiveEntry) {
    if (!order) return;
    forgetEntry(entry.id);
    setOpened(({ [entry.id]: _gone, ...rest }) => rest);
    if (selected === entry.id) setSelected(order.find((row) => row.id !== entry.id)?.id ?? null);
    try {
      setOrder(await removeFile(order, entry.id));
      setPreview(null);
    } catch (err) {
      setMessage(`Could not remove the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function reset() {
    for (const row of order ?? []) forgetEntry(row.id);
    setOpened({});
    setPreview(null);
    const next = await resetArchives();
    setOrder(next);
    setSelected(next[0]?.id ?? null);
  }

  async function check() {
    if (!order) return;
    setPreview({ state: "loading" });
    try {
      const { summary, skipped } = await combineEntries(
        order.filter((row) => row.enabled).map((row) => row.id),
      );
      const names = skipped.map(
        (id) =>
          order.find((row) => row.id === id)?.name ?? (id === CAMPAIGN_ID ? "Campaign rules" : id),
      );
      setPreview({ state: "done", summary, skipped: names });
    } catch (err) {
      setPreview({ state: "error", reason: err instanceof Error ? err.message : String(err) });
    }
  }

  function onPanelDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDropping(false);
    void upload([...e.dataTransfer.files]);
  }

  const selectedEntry =
    selected === CAMPAIGN_ID ? CAMPAIGN_ENTRY : order.find((row) => row.id === selected);

  return (
    <div
      className={`gf${dropping ? " is-dropping" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDropping(false);
      }}
      onDrop={onPanelDrop}
    >
      <section className="gf-order" aria-label={"Load order"}>
        <h3 className="sheet-group-head">{"Load order"}</h3>
        <p className="gf-note">
          {
            "The game reads these from the top down. The first file that is on is the base game. Each one after it is applied over it as a mod, so a lower file wins where two change the same thing."
          }
        </p>
        {pending && !fromUrl ? (
          <div className="gf-pending" role="status">
            <p>
              {
                "Saved. The game is still running the previous files. Restarting reloads the page; a saved run may not continue if its ship or events are gone."
              }
            </p>
            <button
              type="button"
              className="gf-button is-primary"
              onClick={() => location.reload()}
            >
              {"Apply and restart"}
            </button>
          </div>
        ) : null}
        {fromUrl ? (
          <p className="gf-alert">
            {`This page was opened with ?dat=, so the game is using ${fromUrl} instead of this list. Open the game without it to use these files.`}
          </p>
        ) : null}
        {skipped.length ? (
          <div className="gf-alert">
            {"Skipped when the game started:"}
            <ul>
              {skipped.map((row) => (
                <li key={row.name}>{`${row.name}: ${row.reason}`}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {firstIsMod ? (
          <p className="gf-alert">
            {`${first!.name} is at the top but looks like a mod, not a full game. Put ftl.dat or the stand-in above it.`}
          </p>
        ) : null}

        <ol className="gf-list">
          {order.map((entry, at) => {
            const role = guessRole(entry, opened[entry.id]);
            const isBase = entry.id === first?.id;
            return (
              <li
                key={entry.id}
                className={[
                  "gf-row",
                  entry.enabled ? "" : "is-off",
                  selected === entry.id ? "is-selected" : "",
                  dragOver === at && dragFrom !== null && dragFrom !== at ? "is-drop-target" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable
                onDragStart={(e) => {
                  setDragFrom(at);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", entry.id);
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(at);
                }}
                onDrop={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  move(dragFrom, at);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
              >
                <span className="gf-grip" aria-hidden="true">
                  {"⋮⋮"}
                </span>
                <span className="gf-index">{at + 1}</span>
                <button type="button" className="gf-name" onClick={() => setSelected(entry.id)}>
                  <b>{entry.name}</b>
                  <span className="gf-tags">
                    {opened[entry.id]?.state === "error" ? (
                      <span className="gf-tag is-bad">{"Can't be read"}</span>
                    ) : null}
                    {entry.enabled ? (
                      <span className={`gf-tag ${isBase ? "is-base" : ""}`}>
                        {isBase ? "Base game" : role === "base" ? "Full archive, as a mod" : "Mod"}
                      </span>
                    ) : (
                      <span className="gf-tag">{"Off"}</span>
                    )}
                    {entry.builtin ? <span className="gf-tag">{"Built in"}</span> : null}
                    {entry.size ? <span className="gf-size">{formatBytes(entry.size)}</span> : null}
                  </span>
                </button>
                <span className="gf-actions">
                  <button
                    type="button"
                    aria-label={`Move ${entry.name} up`}
                    disabled={at === 0}
                    onClick={() => move(at, at - 1)}
                  >
                    {"▲"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${entry.name} down`}
                    disabled={at === order.length - 1}
                    onClick={() => move(at, at + 1)}
                  >
                    {"▼"}
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={entry.enabled}
                    aria-label={`Load ${entry.name}`}
                    className={`opt-switch${entry.enabled ? " is-on" : ""}`}
                    onClick={() =>
                      void commit(
                        order.map((row) =>
                          row.id === entry.id ? { ...row, enabled: !row.enabled } : row,
                        ),
                      )
                    }
                  >
                    {entry.enabled ? "ON" : "OFF"}
                  </button>
                  {entry.builtin ? null : (
                    <button
                      type="button"
                      className="gf-remove"
                      aria-label={`Remove ${entry.name}`}
                      onClick={() => void remove(entry)}
                    >
                      {"✕"}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
          <li className={`gf-row is-pinned${selected === CAMPAIGN_ID ? " is-selected" : ""}`}>
            <span className="gf-grip" aria-hidden="true">
              {"🔒"}
            </span>
            <span className="gf-index">{order.length + 1}</span>
            <button type="button" className="gf-name" onClick={() => setSelected(CAMPAIGN_ID)}>
              <b>{CAMPAIGN_ENTRY.name}</b>
              <span className="gf-tags">
                <span className="gf-tag">{"Always last"}</span>
                <span className="gf-tag">{"Built in"}</span>
              </span>
            </button>
          </li>
        </ol>

        <div className="gf-add">
          <button
            type="button"
            className="gf-button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "Storing…" : "Add files"}
          </button>
          <span className="gf-note">{"or drop .dat, .ftl and .zip files here"}</span>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              void upload(files);
            }}
          />
        </div>
        {message ? <p className="gf-alert">{message}</p> : null}

        <div className="gf-result">
          <div className="gf-result-head">
            <h3 className="sheet-group-head">{"With this order"}</h3>
            <button
              type="button"
              className="gf-button"
              disabled={preview?.state === "loading"}
              onClick={() => void check()}
            >
              {preview?.state === "loading" ? "Checking…" : "Check"}
            </button>
          </div>
          {preview?.state === "done" ? (
            <>
              {preview.skipped.length ? (
                <p className="gf-alert">
                  {`Left out because they could not be read or applied: ${preview.skipped.join(", ")}.`}
                </p>
              ) : null}
              <RecordGrid summary={preview.summary} />
            </>
          ) : preview?.state === "error" ? (
            <p className="gf-alert">{preview.reason}</p>
          ) : (
            <p className="gf-note">{"See what the game will have once every file is applied."}</p>
          )}
        </div>

        <div className="gf-apply">
          <button type="button" className="gf-button" onClick={() => void reset()}>
            {"Back to the stand-in"}
          </button>
          <p className="gf-note">
            {"Removes every file you added and turns the stand-in back on."}
          </p>
        </div>
      </section>

      <section className="gf-inspect" aria-label={"File details"}>
        {selectedEntry ? (
          <Inspector entry={selectedEntry} opened={opened[selectedEntry.id]} />
        ) : (
          <p className="gf-note">{"Pick a file to see what is inside."}</p>
        )}
      </section>
    </div>
  );
}

function RecordGrid({ summary }: { summary: ArchiveSummary }) {
  if (!summary.records.length) return <p className="gf-note">{"No game records."}</p>;
  return (
    <ul className="gf-records">
      {summary.records.map((row) => (
        <li key={row.label} title={row.examples.join(", ")}>
          <b>{row.count}</b>
          <span>{row.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Inspector({ entry, opened }: { entry: ArchiveEntry; opened?: Opened }) {
  if (!opened || opened.state === "loading")
    return <p className="gf-note">{`Reading ${entry.name}…`}</p>;
  if (opened.state === "error")
    return (
      <>
        <h3 className="gf-title">{entry.name}</h3>
        <p className="gf-alert">{`This file could not be read: ${opened.reason}`}</p>
      </>
    );
  const { summary, files } = opened;
  return (
    <>
      <h3 className="gf-title">{entry.name}</h3>
      <p className="gf-tags">
        <span className="gf-tag is-base">
          {summary.role === "base" ? "Full game archive" : "Mod"}
        </span>
        <span className="gf-tag">
          {summary.container === "dat" ? "FTL package (.dat)" : "Zip archive (.ftl / .zip)"}
        </span>
        <span className="gf-tag">{count(summary.files.length, "file")}</span>
        <span className="gf-tag">{formatBytes(summary.bytes)}</span>
      </p>

      {summary.records.length ? (
        <details className="gf-section" open>
          <summary>
            {summary.role === "base" ? "What it defines" : "Whole records it brings"}
          </summary>
          <ul className="gf-defines">
            {summary.records.map((row) => (
              <li key={row.label}>
                <b>{row.count}</b>
                <span>
                  {row.label}
                  {row.examples.length ? (
                    <small>
                      {row.examples.join(", ")}
                      {row.count > row.examples.length ? "…" : ""}
                    </small>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {summary.patches.length ? (
        <details className="gf-section" open>
          <summary>{`What it changes (${count(summary.patches.length, "file")})`}</summary>
          <ul className="gf-patches">
            {summary.patches.map((patch) => (
              <li key={patch.path}>
                <code>{patch.target}</code>
                <span>{patchWords(patch)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {summary.role === "mod" && summary.replaces.length ? (
        <details className="gf-section">
          <summary>{`Whole files it replaces (${summary.replaces.length})`}</summary>
          <p className="gf-note">
            {"A mod's plain .xml file replaces the game's file of the same name entirely."}
          </p>
          <ul className="gf-patches">
            {summary.replaces.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {summary.assets.length ? (
        <details className="gf-section" open>
          <summary>{"Pictures and sounds"}</summary>
          <ul className="gf-records">
            {summary.assets.map((row) => (
              <li key={row.label}>
                <b>{row.count}</b>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <FileBrowser key={entry.id} files={files} list={summary.files} />
    </>
  );
}

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "1 weapon", "3 crew races". TAG_WORDS holds the plural. */
function tagCount(tag: string, n: number): string {
  const plural = TAG_WORDS[tag] ?? tag;
  if (n !== 1) return `${n} ${plural}`;
  return `1 ${plural.replace(/ies$/, "y").replace(/(?<!s)s$/, "")}`;
}

function patchWords(patch: ArchiveSummary["patches"][number]): string {
  const parts: string[] = [];
  for (const [tag, n] of patch.adds) parts.push(`adds ${tagCount(tag, n)}`);
  if (patch.edits)
    parts.push(`changes ${patch.edits} existing ${patch.edits === 1 ? "entry" : "entries"}`);
  if (patch.removes) parts.push(`removes ${patch.removes}`);
  if (!parts.length) parts.push(patch.kind === "append" ? "appends to it" : "patches it");
  const text = parts.join(", ");
  return text[0]!.toUpperCase() + text.slice(1);
}

const FILTERS: [FileKind | "all", string][] = [
  ["all", "All"],
  ["xml", "Data"],
  ["patch", "Patches"],
  ["image", "Pictures"],
  ["audio", "Sounds"],
  ["text", "Text"],
];

const SHOWN = 400;

function FileBrowser({ files, list }: { files: FtlExtract; list: ArchiveFile[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileKind | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const kinds = useMemo(() => new Set(list.map((file) => file.kind)), [list]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(
      (file) =>
        (filter === "all" || file.kind === filter) && (!q || file.path.toLowerCase().includes(q)),
    );
  }, [list, query, filter]);
  const folders = useMemo(() => {
    const byFolder = new Map<string, ArchiveFile[]>();
    for (const file of matches.slice(0, SHOWN)) {
      const cut = file.path.lastIndexOf("/");
      const folder = cut >= 0 ? file.path.slice(0, cut) : "(top level)";
      const bag = byFolder.get(folder) ?? [];
      bag.push(file);
      byFolder.set(folder, bag);
    }
    return [...byFolder];
  }, [matches]);
  const searching = query.trim().length > 0 || filter !== "all";

  return (
    <details className="gf-section" open={list.length < 60}>
      <summary>{`Files (${list.length})`}</summary>
      <div className="gf-browse">
        <input
          type="search"
          className="gf-search"
          placeholder={"Search files, e.g. kestral or blueprints"}
          aria-label={"Search files"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="opt-choice" role="group" aria-label={"File type"}>
          {FILTERS.filter(([kind]) => kind === "all" || kinds.has(kind)).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filter === kind}
              onClick={() => setFilter(kind)}
            >
              {label}
            </button>
          ))}
        </span>
      </div>
      {matches.length > SHOWN ? (
        <p className="gf-note">{`Showing the first ${SHOWN} of ${matches.length}. Search to narrow it down.`}</p>
      ) : null}
      {matches.length === 0 ? <p className="gf-note">{"No files match."}</p> : null}
      <div className="gf-tree">
        {folders.map(([folder, rows]) => (
          <details key={folder} open={searching || folders.length === 1}>
            <summary>
              <span>{folder}</span>
              <small>{rows.length}</small>
            </summary>
            <ul>
              {rows.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    className={open === file.path ? "is-open" : ""}
                    onClick={() => setOpen(open === file.path ? null : file.path)}
                  >
                    <span className={`gf-kind is-${file.kind}`}>{kindLabel(file.kind)}</span>
                    <span className="gf-file">
                      {file.path.slice(file.path.lastIndexOf("/") + 1)}
                    </span>
                    <small>{formatBytes(file.size)}</small>
                  </button>
                  {open === file.path ? <FilePreview files={files} file={file} /> : null}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </details>
  );
}

function kindLabel(kind: FileKind): string {
  return {
    xml: "XML",
    patch: "MOD",
    text: "TXT",
    image: "IMG",
    audio: "SND",
    font: "FNT",
    other: "BIN",
  }[kind];
}

const PREVIEW_LINES = 400;

function FilePreview({ files, file }: { files: FtlExtract; file: ArchiveFile }) {
  const blob = files.assets.get(file.path);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob || (file.kind !== "image" && file.kind !== "audio")) return;
    const made = URL.createObjectURL(blob);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [blob, file.kind]);
  if (file.kind === "image")
    return (
      <div className="gf-preview is-image">{url ? <img src={url} alt={file.path} /> : null}</div>
    );
  if (file.kind === "audio")
    return (
      <div className="gf-preview">{url ? <audio controls src={url} preload="none" /> : null}</div>
    );
  const text =
    files.documents.find((doc) => doc.path === file.path)?.xml ?? files.text.get(file.path);
  if (text == null)
    return <p className="gf-note gf-preview">{"No preview for this kind of file."}</p>;
  const lines = text.split("\n");
  return (
    <div className="gf-preview">
      <pre>{lines.slice(0, PREVIEW_LINES).join("\n")}</pre>
      {lines.length > PREVIEW_LINES ? (
        <p className="gf-note">{`First ${PREVIEW_LINES} of ${lines.length} lines.`}</p>
      ) : null}
    </div>
  );
}
