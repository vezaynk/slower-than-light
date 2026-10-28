import { displayPhrase } from "@/game/interface-copy";

/** A scroll of archive sentences. Clicks stay on the block, so a parent button does not take them. */
export function ArchiveLines({ lines, mark }: { lines: readonly string[]; mark?: string }) {
  if (lines.length === 0) return null;
  return (
    <span
      className="archive-copy"
      data-archive-copy={mark}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {lines.map((line, index) => (
        <span key={index} className="archive-copy-line">
          {displayPhrase(line)}
        </span>
      ))}
    </span>
  );
}
