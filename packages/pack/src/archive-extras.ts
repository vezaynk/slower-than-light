import type { Document as XmlDocument } from "@xmldom/xmldom";
import type { ContentPack } from "./types.ts";
import type { FtlTextFile } from "./ftl.ts";

/** One parsed archive XML file. Translation documents are included; extras skip those. */
export type ArchiveDoc = { path: string; doc: XmlDocument };

export type ArchiveExtra = {
  id: string;
  apply(pack: ContentPack, docs: readonly ArchiveDoc[], layouts: readonly FtlTextFile[]): void;
};

const extras: ArchiveExtra[] = [];

/** Registers one archive feature. A second registration with the same id replaces the first. */
export function registerArchiveExtra(extra: ArchiveExtra): void {
  const prior = extras.findIndex((row) => row.id === extra.id);
  if (prior >= 0) extras.splice(prior, 1);
  extras.push(extra);
}

/** Runs every feature reader after the core catalog is built. */
export function applyArchiveExtras(
  pack: ContentPack,
  docs: readonly ArchiveDoc[],
  layouts: readonly FtlTextFile[],
): void {
  for (const extra of extras) extra.apply(pack, docs, layouts);
}
