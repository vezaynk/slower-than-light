import type { FtlExtract } from "@stl/ftldat";

/**
 * One coverage feature. The matching agent owns the module that registers it.
 * `tags` are root elements the scanner will not report as unused.
 */
export type CoverExtra = {
  id: string;
  tags?: readonly string[];
  /** Return true when this text file is handled (credits). False leaves the layout check in charge. */
  textFile?(path: string, body: string, problems: string[]): boolean;
  /** Return true when this sector-type name is handled. False leaves the colour check in charge. */
  sectorType?(name: string, sectors: readonly string[], problems: string[]): boolean;
  /** Return true when this audio path is played by a real game function. */
  playsAudio?(file: string): boolean;
  exercise?(raw: FtlExtract, merged: FtlExtract, problems: string[]): void | Promise<void>;
};

const extras: CoverExtra[] = [];

export function registerCoverExtra(extra: CoverExtra): void {
  const prior = extras.findIndex((row) => row.id === extra.id);
  if (prior >= 0) extras.splice(prior, 1);
  extras.push(extra);
}

export function extraOwnsTag(tag: string): boolean {
  return extras.some((extra) => extra.tags?.includes(tag));
}

export function extraTextFile(path: string, body: string, problems: string[]): boolean {
  return extras.some((extra) => extra.textFile?.(path, body, problems) === true);
}

export function extraSectorType(
  name: string,
  sectors: readonly string[],
  problems: string[],
): boolean {
  return extras.some((extra) => extra.sectorType?.(name, sectors, problems) === true);
}

export function extraPlaysAudio(file: string): boolean {
  return extras.some((extra) => extra.playsAudio?.(file) === true);
}

export async function exerciseExtras(
  raw: FtlExtract,
  merged: FtlExtract,
  problems: string[],
): Promise<void> {
  for (const extra of extras) await extra.exercise?.(raw, merged, problems);
}

/** Sheet file rewrite for animations whose packed path is not the file the client draws. */
const sheetRemaps = new Map<string, (file: string) => string>();

export function registerSheetRemap(name: string, remap: (file: string) => string): void {
  sheetRemaps.set(name, remap);
}

export function remapSheetFile(name: string, file: string): string {
  return sheetRemaps.get(name)?.(file) ?? file;
}
