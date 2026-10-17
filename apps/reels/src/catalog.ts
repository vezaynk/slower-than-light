import fs from "node:fs";
import path from "node:path";
import { scenarios } from "./scenarios.ts";

export type Take = {
  id: string;
  scenario: string;
  label: string;
  branch: string;
  sha: string;
  dirty: boolean;
  ok: boolean;
  recordedAt: string;
  /** URL the viewer fetches. Range requests are served by the Vite plugin. */
  video: string;
  bytes: number;
  replay: boolean;
};

type MetaFile = Partial<Omit<Take, "video" | "bytes" | "replay">>;

/** Takes on disk that have a video. Newest first. */
export function readCatalog(root: string): Take[] {
  if (!fs.existsSync(root)) return [];
  const takes: Take[] = [];
  for (const scenario of scenarios) {
    const dir = path.join(root, scenario.id);
    if (!fs.existsSync(dir)) continue;
    for (const id of fs.readdirSync(dir)) {
      const takeDir = path.join(dir, id);
      let dirStat: fs.Stats;
      try {
        dirStat = fs.statSync(takeDir);
      } catch {
        continue;
      }
      if (!dirStat.isDirectory()) continue;
      const videoPath = path.join(takeDir, "video.webm");
      if (!fs.existsSync(videoPath)) continue;
      const videoStat = fs.statSync(videoPath);
      const meta = readMeta(path.join(takeDir, "meta.json"));
      takes.push({
        id,
        scenario: scenario.id,
        label: meta.label || id,
        branch: meta.branch || "",
        sha: meta.sha || "",
        dirty: !!meta.dirty,
        ok: meta.ok !== false,
        recordedAt: meta.recordedAt || videoStat.mtime.toISOString(),
        video: `/media/${scenario.id}/${encodeURIComponent(id)}/video.webm`,
        bytes: videoStat.size,
        replay: fs.existsSync(path.join(takeDir, "replay.json")),
      });
    }
  }
  takes.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return takes;
}

function readMeta(file: string): MetaFile {
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as MetaFile;
  } catch {
    return {};
  }
}

/** Resolve a media URL onto a file inside `root`, or null when it escapes. */
export function mediaFile(root: string, urlPath: string): string | null {
  const match = /^\/media\/([^/]+)\/([^/]+)\/video\.webm$/.exec(urlPath.split("?")[0] ?? "");
  if (!match) return null;
  let scenario: string;
  let id: string;
  try {
    scenario = decodeURIComponent(match[1] ?? "");
    id = decodeURIComponent(match[2] ?? "");
  } catch {
    return null;
  }
  if (!scenario || !id || scenario.includes("..") || id.includes("..")) return null;
  const rootResolved = path.resolve(root);
  const file = path.resolve(rootResolved, scenario, id, "video.webm");
  if (file !== path.join(rootResolved, scenario, id, "video.webm")) return null;
  return file;
}
