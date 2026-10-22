import type { Document as XmlDocument, Element as XmlElement } from "@xmldom/xmldom";
import { registerArchiveExtra } from "../archive-extras.ts";
import { attr, child, elements, ownText, tagged } from "../parse.ts";

export type TutorialStep = { id: string; text: string };
export type TutorialOrder = { id: string; steps: TutorialStep[] };

let orders: TutorialOrder[] = [];

/** Orders and steps from data/tutorial.xml. Empty until that file is loaded. */
export function tutorialScript(): readonly TutorialOrder[] {
  return orders;
}

/** `text-<code>.xml` is a translation. English tables use an underscore, not a hyphen. */
function translationFile(path: string): boolean {
  return /^text-[A-Za-z0-9_]+\.xml(?:\.append)?$/.test(fileName(path));
}

function fileName(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(slash + 1);
}

function tutorialFile(path: string): boolean {
  return fileName(path).toLowerCase() === "tutorial.xml";
}

function spoken(node: XmlElement | undefined): string {
  if (!node) return "";
  return ownText(node).trim();
}

/**
 * The order's platform (`PC`, `IPAD`) wins. `default` is the shared line.
 * A step with neither uses the first other sentence, matching the file's note.
 */
function words(node: XmlElement | undefined, platform: string): string {
  if (!node) return "";
  const specific = spoken(child(node, platform));
  if (specific) return specific;
  const shared = spoken(child(node, "default"));
  if (shared) return shared;
  for (const item of elements(node)) {
    if (item.tagName === "continue" || item.tagName === "arrow") continue;
    const text = spoken(item);
    if (text) return text;
  }
  return spoken(node);
}

function rootChild(node: XmlElement, doc: XmlDocument): boolean {
  return node.parentNode === doc.documentElement;
}

function readOrders(doc: XmlDocument): TutorialOrder[] {
  const defined = new Map<string, XmlElement>();
  for (const node of tagged(doc, "step")) {
    if (!rootChild(node, doc)) continue;
    const id = attr(node, "name")?.trim();
    if (id) defined.set(id, node);
  }
  const read: TutorialOrder[] = [];
  let index = 0;
  for (const node of tagged(doc, "order")) {
    if (!rootChild(node, doc)) continue;
    index += 1;
    const platform = attr(node, "type")?.trim() || "";
    const id = platform || attr(node, "name")?.trim() || String(index);
    const steps: TutorialStep[] = [];
    for (const item of elements(node)) {
      if (item.tagName !== "step") continue;
      const stepId = ownText(item).trim() || attr(item, "name")?.trim() || "";
      if (!stepId) continue;
      steps.push({ id: stepId, text: words(defined.get(stepId), platform || id) });
    }
    read.push({ id, steps });
  }
  return read;
}

registerArchiveExtra({
  id: "tutorial",
  apply(_pack, docs) {
    const next: TutorialOrder[] = [];
    for (const source of docs) {
      if (translationFile(source.path) || !tutorialFile(source.path)) continue;
      next.push(...readOrders(source.doc));
    }
    orders = next;
  },
});
