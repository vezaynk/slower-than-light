import { after, describe, it } from "node:test";
import { installStandIn } from "@stl/standin";
import { extractArchive } from "@stl/ftldat";
import { assertArchiveCovered } from "./archive-cover.ts";
import { archiveCases, installExtract } from "./archive-play.ts";

describe("archive coverage", () => {
  after(async () => {
    await installStandIn();
  });

  for (const item of archiveCases()) {
    describe(item.name, { timeout: item.name === "totallynotftl" ? 120_000 : 300_000 }, () => {
      it("loads and exercises every archive record", async () => {
        const raw = await extractArchive(item.bytes);
        const merged = await installExtract(raw);
        await assertArchiveCovered(raw, merged);
      });
    });
  }
});
