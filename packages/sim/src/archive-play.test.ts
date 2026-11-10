import { after, before, describe, it } from "node:test";
import { installStandIn } from "@stl/standin";
import {
  archiveCases,
  assertNewGame,
  assertPlayable,
  assertSaveRoundTrip,
  enterSectorTwo,
  freshGame,
  installArchive,
  walkToExit,
} from "./archive-play.ts";

describe("archive plays", () => {
  after(async () => {
    await installStandIn();
  });

  for (const item of archiveCases()) {
    describe(item.name, item.timeout ? { timeout: item.timeout } : {}, () => {
      before(async () => {
        await installArchive(item.bytes);
      });

      it("loads a playable pack", () => {
        assertPlayable();
      });

      it("starts a run on the player hull", () => {
        assertNewGame(freshGame());
      });

      it("reaches the exit beacon", () => {
        walkToExit(freshGame());
      });

      it("enters the next sector", () => {
        enterSectorTwo(freshGame());
      });

      it("saves and loads the run", () => {
        assertSaveRoundTrip(freshGame());
      });
    });
  }
});
