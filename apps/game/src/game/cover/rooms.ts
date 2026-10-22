import type { FtlExtract } from "@stl/ftldat";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { archiveBlob, archiveImage } from "../pack/media.ts";
import { systemRoomInterior, type RoomInterior } from "../room-layout.ts";

/**
 * data/rooms.xml. Each roomLayout id has to come back from room-layout as a
 * pixel box or as an image the archive actually stored. No file, no problem.
 */
registerCoverExtra({
  id: "rooms",
  tags: ["roomLayout"],
  exercise(raw, _merged, problems) {
    for (const id of layoutIds(raw)) {
      if (!drawn(systemRoomInterior(id))) problems.push(`room layout ${id} is not drawn`);
    }
  },
});

function layoutIds(raw: FtlExtract): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const doc of raw.documents) {
    if (!roomsFile(doc.path)) continue;
    const pattern = /<roomLayout\b[^>]*?\bname\s*=\s*(["'])([^"']+)\1/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(doc.xml))) {
      const id = match[2]?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function roomsFile(path: string): boolean {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = (slash === -1 ? path : path.slice(slash + 1)).toLowerCase();
  return base === "rooms.xml";
}

function drawn(row: RoomInterior | undefined): boolean {
  if (!row) return false;
  if (boxed(row.width, row.height)) return true;
  if (boxed(row.glow?.width, row.glow?.height)) return true;
  if (stored(row.image)) return true;
  if (stored(row.glow?.image)) return true;
  return false;
}

function boxed(width: number | undefined, height: number | undefined): boolean {
  return (width ?? 0) > 0 && (height ?? 0) > 0;
}

/** A full archive path, or a bare interior name such as `room_pilot`. */
function stored(name: string | undefined): boolean {
  const text = name?.trim();
  if (!text) return false;
  const stem = text.replace(/\.png$/i, "");
  const paths = text.includes("/") ? [text] : [`img/ship/interior/${stem}.png`, text];
  return paths.some((path) => {
    const blob = archiveBlob(path);
    if (blob && blob.size > 0) return true;
    return archiveImage(path) != null;
  });
}
