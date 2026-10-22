import type { FtlExtract } from "@stl/ftldat";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { freshGame } from "../archive-play.ts";
import { playTutorial } from "../tutorial.ts";

function present(raw: FtlExtract): boolean {
  return raw.documents.some((doc) => fileName(doc.path).toLowerCase() === "tutorial.xml");
}

function fileName(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(slash + 1);
}

/** Plays data/tutorial.xml. An archive without that file has nothing to walk. */
registerCoverExtra({
  id: "tutorial",
  tags: ["order", "step"],
  exercise(raw, _merged, problems) {
    if (!present(raw)) return;
    if (!playTutorial(freshGame())) problems.push("tutorial steps were not shown");
  },
});
