import { eventText } from "../event-text.ts";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tests: a pattern that finds the archive's line for any of these text ids inside a printed body. */
export function textRe(...ids: string[]): RegExp {
  return new RegExp(ids.map((id) => escape(eventText(id))).join("|"));
}
