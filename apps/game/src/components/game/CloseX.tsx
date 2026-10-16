import { useEffect, useRef } from "react";
/**
 * The one close control for every dismissible panel: an × in the panel's top-right corner.
 * The panel carries `has-x` so it is the positioning parent. INVENTED, after the beacon map's ×.
 * Per the user: Esc dismisses it too. With panels stacked, Esc closes only the newest one.
 */
const open: { close: () => void }[] = [];

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !open.length) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open[open.length - 1]!.close();
  });
}

export function CloseX({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    const entry = { close: () => latest.current() };
    open.push(entry);
    return () => {
      const at = open.indexOf(entry);
      if (at >= 0) open.splice(at, 1);
    };
  }, []);
  return (
    <button type="button" className="modal-x" aria-label={label} title={label} onClick={onClose}>
      ×
    </button>
  );
}
