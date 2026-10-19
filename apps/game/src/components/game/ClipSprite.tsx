/** One archive animation clip. A missing clip renders nothing so the caller keeps its drawing. */
import { useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import { archiveGeneration, clipFrame, subscribeArchive } from "@/game/pack/media";

export function ClipSprite({ name, className }: { name: string; className?: string }) {
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, [name]);
  const frame = generation >= 0 ? clipFrame(name, tick) : undefined;
  if (!frame) return null;
  return (
    <i
      className={className ? `clip-sprite ${className}` : "clip-sprite"}
      aria-hidden="true"
      style={{
        width: frame.fw,
        height: frame.fh,
        backgroundImage: `url(${frame.url})`,
        backgroundPosition: `-${frame.sx}px -${frame.sy}px`,
        backgroundSize: `${frame.sheetW}px ${frame.sheetH}px`,
      }}
    />
  );
}
