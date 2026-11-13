// Temporary: dump every packed event's texts, body, dest and slug.
import { writeFileSync } from "node:fs";
import { allEvents } from "@stl/pack";
import { loadCatalog } from "./src/pack/base.ts";

loadCatalog();
const out: Record<string, unknown> = {};
for (const ev of allEvents()) {
  out[ev.id] = {
    dest: ev.dest,
    flag: ev.flag,
    body: ev.body,
    texts: ev.texts ?? null,
    labels: ev.choices.map((c) => [c.id, c.label]),
  };
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
