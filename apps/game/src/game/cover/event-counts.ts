import type { FtlExtract } from "@stl/ftldat";
import { allSectors, eventCount, eventCountsIn } from "@stl/pack";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { freshGame } from "../archive-play.ts";
import { enterSector } from "../sim.ts";
import { lastEventDeals, mixBeacons } from "../wiki/beacon-mix.ts";

function present(raw: FtlExtract): boolean {
  const needle = "newevents.xml";
  return raw.documents.some((doc) => doc.path.toLowerCase().endsWith(needle));
}

type Declared = { sector: number; id: string; min: number; max: number };

function declared(raw: FtlExtract): Declared[] {
  const rows: Declared[] = [];
  for (const doc of raw.documents) {
    if (!doc.path.toLowerCase().endsWith("newevents.xml")) continue;
    for (const block of doc.xml.matchAll(/<eventCounts\b([^>]*)>([\s\S]*?)<\/eventCounts>/gi)) {
      const sector = Number(/sector="(-?\d+)"/.exec(block[1] ?? "")?.[1]);
      if (!Number.isInteger(sector)) continue;
      for (const event of block[2].matchAll(/<event\b([^>]*)\/?>/gi)) {
        const attrs = event[1] ?? "";
        const id = /name="([^"]+)"/.exec(attrs)?.[1];
        const min = Number(/min="(-?\d+)"/.exec(attrs)?.[1]);
        const max = Number(/max="(-?\d+)"/.exec(attrs)?.[1]);
        if (!id || !Number.isInteger(min) || !Number.isInteger(max)) continue;
        rows.push({ sector, id, min, max });
      }
    }
  }
  return rows;
}

registerCoverExtra({
  id: "event-counts",
  tags: ["eventCounts"],
  exercise(raw, _merged, problems) {
    if (!present(raw)) return;
    const rows = declared(raw);
    if (rows.length === 0) {
      problems.push("event counts were not loaded");
      return;
    }
    for (const row of rows) {
      const loaded = eventCount(row.id, row.sector);
      if (!loaded || loaded.min !== row.min || loaded.max !== row.max)
        problems.push(`event count ${row.id} for sector ${row.sector} was not loaded`);
    }
    const sector = allSectors().find((item) => (item.quotas?.length ?? 0) > 0);
    if (!sector) {
      problems.push("event counts have no sector to deal");
      return;
    }
    const depths = [...new Set(rows.map((row) => row.sector))];
    for (const depth of depths) {
      const g = freshGame();
      g.sector = depth + 1;
      enterSector(g, sector.id);
      g.beacons = g.beacons.map((beacon) => ({ ...beacon, links: [...beacon.links] }));
      for (const beacon of g.beacons) {
        if (beacon.kind === "start" || beacon.kind === "exit" || beacon.kind === "boss") continue;
        beacon.kind = "empty";
        beacon.flag = "";
      }
      const sample = g.beacons.find((beacon) => beacon.kind === "empty");
      if (!sample) {
        problems.push("event counts have no free beacon");
        return;
      }
      for (let i = 0; i < 80; i += 1) {
        g.beacons.push({
          ...sample,
          id: `event-count-${depth}-${i}`,
          flag: "",
          kind: "empty",
          links: [],
        });
      }
      if (!mixBeacons(g)) {
        problems.push("event counts were not dealt");
        return;
      }
      for (const row of eventCountsIn(depth)) {
        const n = lastEventDeals(row.id);
        if (n > row.max)
          problems.push(
            `event ${row.id} in sector ${depth} was dealt ${n} times, above ${row.max}`,
          );
        if (n < row.min)
          problems.push(
            `event ${row.id} in sector ${depth} was dealt ${n} times, below ${row.min}`,
          );
      }
    }
  },
});
