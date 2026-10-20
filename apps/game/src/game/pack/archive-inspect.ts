/**
 * Per the user: what a game file holds, in words a player reads. Records come from the same reader the game uses
 * (packFromFtl); a mod's patch files are summarised by what they add, change, and remove.
 */
import { ftlPatch, isPkgDat, type FtlExtract, type FtlPatchKind } from "@stl/ftldat";
import { packFromFtl, type ContentPack } from "@stl/pack";

export type FileKind = "xml" | "patch" | "text" | "image" | "audio" | "font" | "other";

export type ArchiveFile = { path: string; size: number; kind: FileKind };

export type RecordCount = { label: string; count: number; examples: string[] };

export type PatchSummary = {
  path: string;
  target: string;
  kind: FtlPatchKind;
  /** New records the patch adds, by tag ("weaponBlueprint" → 2). */
  adds: [string, number][];
  /** Finds that change records already there. */
  edits: number;
  removes: number;
};

export type ArchiveSummary = {
  /** "dat" is FTL's own package format; "zip" is a .ftl or .zip mod. */
  container: "dat" | "zip";
  /** A base archive defines the game; a mod only patches or adds to one. */
  role: "base" | "mod";
  files: ArchiveFile[];
  bytes: number;
  records: RecordCount[];
  patches: PatchSummary[];
  /** Whole XML files this archive brings. In a mod they replace the file of the same name. */
  replaces: string[];
  assets: { label: string; count: number }[];
};

const AUDIO = /\.(ogg|wav|mp3)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const FONT = /\.(ttf|otf|font|woff2?)$/i;

function fileKind(path: string, isDoc: boolean): FileKind {
  if (isDoc) return ftlPatch(path) ? "patch" : "xml";
  if (IMAGE.test(path)) return "image";
  if (AUDIO.test(path)) return "audio";
  if (FONT.test(path)) return "font";
  if (/\.(txt|csv)$/i.test(path)) return "text";
  return "other";
}

/** Every file in the archive, sorted by path, with its size in bytes. */
export function archiveFiles(files: FtlExtract): ArchiveFile[] {
  const encoder = new TextEncoder();
  const out: ArchiveFile[] = [];
  for (const doc of files.documents)
    out.push({
      path: doc.path,
      size: encoder.encode(doc.xml).length,
      kind: fileKind(doc.path, true),
    });
  for (const [path, text] of files.text)
    out.push({ path, size: encoder.encode(text).length, kind: fileKind(path, false) });
  for (const [path, blob] of files.assets)
    out.push({ path, size: blob.size, kind: fileKind(path, false) });
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Asset groups by folder, the way FTL lays its img/ and audio/ trees out. */
const ASSET_GROUPS: [string, (path: string) => boolean][] = [
  ["Ship pictures", (p) => /^img\/ship\//i.test(p)],
  ["Weapon pictures", (p) => /^img\/weapons\//i.test(p)],
  ["Crew pictures", (p) => /^img\/people\//i.test(p)],
  ["Effects", (p) => /^img\/(effects|ship_explosions)\//i.test(p)],
  ["Backgrounds and planets", (p) => /^img\/(stars|planets|backgrounds?|map)\//i.test(p)],
  ["Interface pictures", (p) => /^img\//i.test(p)],
  ["Music", (p) => /^audio\/music\//i.test(p)],
  ["Sound effects", (p) => /^audio\//i.test(p)],
  ["Fonts", (p) => FONT.test(p)],
];

function assetCounts(files: ArchiveFile[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    if (file.kind !== "image" && file.kind !== "audio" && file.kind !== "font") continue;
    const group =
      ASSET_GROUPS.find(([, test]) => test(file.path))?.[0] ?? "Other pictures and sounds";
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const order = [...ASSET_GROUPS.map(([label]) => label), "Other pictures and sounds"];
  return order.flatMap((label) => {
    const count = counts.get(label);
    return count ? [{ label, count }] : [];
  });
}

function sample(names: (string | undefined)[], n = 6): string[] {
  const out: string[] = [];
  for (const name of names) {
    const clean = name?.trim();
    if (!clean || out.includes(clean)) continue;
    out.push(clean);
    if (out.length >= n) break;
  }
  return out;
}

function recordCounts(pack: ContentPack): RecordCount[] {
  const hulls = pack.hulls ?? [];
  const player = hulls.filter((hull) => hull.id.startsWith("PLAYER_SHIP"));
  const enemy = hulls.filter((hull) => !hull.id.startsWith("PLAYER_SHIP"));
  const rows: RecordCount[] = [
    {
      label: "Playable ships",
      count: player.length,
      examples: sample(player.map((h) => h.name || h.id)),
    },
    { label: "Enemy ships", count: enemy.length, examples: sample(enemy.map((h) => h.id)) },
    {
      label: "Weapons",
      count: pack.weapons?.length ?? 0,
      examples: sample((pack.weapons ?? []).map((w) => w.name || w.id)),
    },
    {
      label: "Drones",
      count: pack.drones?.length ?? 0,
      examples: sample((pack.drones ?? []).map((d) => d.name || d.id)),
    },
    {
      label: "Augments",
      count: pack.augments?.length ?? 0,
      examples: sample((pack.augments ?? []).map((a) => a.name || a.id)),
    },
    {
      label: "Crew races",
      count: pack.crew?.length ?? 0,
      examples: sample((pack.crew ?? []).map((c) => c.name || c.id)),
    },
    {
      label: "Systems",
      count: pack.systems?.length ?? 0,
      examples: sample((pack.systems ?? []).map((s) => s.name || s.id)),
    },
    {
      label: "Sectors",
      count: pack.sectors?.length ?? 0,
      examples: sample((pack.sectors ?? []).map((s) => s.name || s.id)),
    },
    {
      label: "Events",
      count: pack.events?.length ?? 0,
      examples: sample((pack.events ?? []).map((e) => e.id)),
    },
    {
      label: "Event lists",
      count: pack.lists?.length ?? 0,
      examples: sample((pack.lists ?? []).map((l) => l.id)),
    },
    {
      label: "Achievements",
      count: pack.achievements?.length ?? 0,
      examples: sample((pack.achievements ?? []).map((a) => a.name || a.id)),
    },
  ];
  return rows.filter((row) => row.count > 0);
}

const RECORD_TAGS =
  /<(weaponBlueprint|droneBlueprint|augBlueprint|crewBlueprint|systemBlueprint|shipBlueprint|event|eventList|textList|sectorDescription|sectorType|achievement|blueprintList|ship)\b/g;

function patchSummary(path: string, xml: string): PatchSummary | undefined {
  const patch = ftlPatch(path);
  if (!patch) return undefined;
  // Records inside a find (a mod-append under a mod:findName) are changes to that record, not new ones.
  const bare = xml.replace(/<mod:find[\s\S]*?<\/mod:find\w*>/g, "");
  const adds = new Map<string, number>();
  for (const match of bare.matchAll(RECORD_TAGS)) {
    const tag = match[1]!;
    adds.set(tag, (adds.get(tag) ?? 0) + 1);
  }
  return {
    path,
    target: patch.target,
    kind: patch.kind,
    adds: [...adds].sort((a, b) => b[1] - a[1]),
    edits: (xml.match(/<mod:find\w*/g) ?? []).length,
    removes: (xml.match(/<mod:removeTag\b/g) ?? []).length,
  };
}

export function summarize(files: FtlExtract, head?: Uint8Array): ArchiveSummary {
  const list = archiveFiles(files);
  const whole = files.documents.filter((doc) => !ftlPatch(doc.path));
  const layouts = [...files.text]
    .filter(([path]) => path.toLowerCase().endsWith(".txt"))
    .map(([path, text]) => ({ path, text }));
  let records: RecordCount[] = [];
  try {
    records = recordCounts(packFromFtl(whole, layouts));
  } catch {
    records = [];
  }
  const patches = files.documents.flatMap((doc) => patchSummary(doc.path, doc.xml) ?? []);
  const base = whole.some((doc) => /(^|\/)data\/blueprints\.xml$/i.test(doc.path));
  return {
    container: head && isPkgDat(head) ? "dat" : "zip",
    role: base ? "base" : "mod",
    files: list,
    bytes: list.reduce((n, file) => n + file.size, 0),
    records,
    patches,
    replaces: whole.map((doc) => doc.path),
    assets: assetCounts(list),
  };
}

/** Readable tag names for a patch's additions. */
export const TAG_WORDS: Record<string, string> = {
  weaponBlueprint: "weapons",
  droneBlueprint: "drones",
  augBlueprint: "augments",
  crewBlueprint: "crew races",
  systemBlueprint: "systems",
  shipBlueprint: "ships",
  ship: "ship loadouts",
  event: "events",
  eventList: "event lists",
  textList: "text lists",
  sectorDescription: "sectors",
  sectorType: "sector types",
  achievement: "achievements",
  blueprintList: "blueprint lists",
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
