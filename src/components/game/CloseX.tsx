import { tx } from "@/i18n";
/**
 * The one close control for every dismissible panel: an × in the panel's top-right corner.
 * The panel carries `has-x` so it is the positioning parent. INVENTED, after the beacon map's ×.
 */
export function CloseX({ onClose, label = tx("ui.CloseX.close") }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" className="modal-x" aria-label={label} title={label} onClick={onClose}>
      ×
    </button>
  );
}
