import { tutorialScript } from "@stl/pack";
import { displayPhrase, tutorialContinueLabel } from "./interface-copy.ts";
import type { Game } from "./types.ts";

/**
 * Walks every loaded order's steps in order. Each step's words are put on the
 * event card, which stays open so the earlier lines are still there at the end.
 * Returns false when a step has nothing to show.
 */
export function playTutorial(g: Game): boolean {
  const lines: string[] = [];
  for (const order of tutorialScript()) {
    for (const step of order.steps) {
      const text = displayPhrase(step.text.trim());
      if (!text) return false;
      lines.push(text);
    }
  }
  if (lines.length === 0) return false;
  g.training = true;
  const label = tutorialContinueLabel();
  let body = "";
  for (const text of lines) {
    body = body ? `${body}\n\n${text}` : text;
    g.event = {
      title: "Tutorial",
      body,
      choices: [{ id: "ack", label }],
    };
    g.phase = "event";
    g.paused = true;
    g.targeting = false;
    g.beamAnchor = null;
    g.log.unshift(text);
    if (g.log.length > 5) g.log.length = 5;
  }
  const shown = g.event?.body ?? "";
  let at = 0;
  for (const text of lines) {
    const found = shown.indexOf(text, at);
    if (found < 0) return false;
    at = found + text.length;
  }
  return g.phase === "event" && g.event != null;
}
