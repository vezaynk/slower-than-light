import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose } from "../sim.ts";
import { goTitle, useGame, verdictRestart } from "../store.ts";
import type { Game } from "../types.ts";

function crystalRun(): Game {
  const played = useGame.getState().game;
  // The verdict screen is this object. The store may still be holding the title placeholder.
  const fresh = structuredClone(played);
  fresh.sectorName = "Hidden Crystal Worlds";
  fresh.phase = "defeat";
  return fresh;
}

function leaveExit(g: Game) {
  const exit = g.beacons.find((b) => b.kind === "exit");
  assert.ok(exit);
  g.here = exit.id;
  g.phase = "map";
  g.event = null;
  choose(g, "exit-leave");
}

describe("crystal sector restart", () => {
  it("restarting in the Hidden Crystal Worlds starts in a Civilian sector and skips the sector map", () => {
    const realNow = Date.now;
    const played = crystalRun();
    const names = new Set<string>();
    try {
      // The store still shows the title placeholder. RESTART is handed the run on the verdict.
      assert.equal(useGame.getState().game.sectorName, "Civilian (Starting) Sector");
      for (let n = 1; n <= 16; n++) {
        Date.now = () => n * 1000;
        verdictRestart(played);
        const next = useGame.getState().game;
        assert.notEqual(next, played);
        assert.equal(next.sector, 1);
        assert.equal(next.sectorName, "Civilian Sector");
        assert.equal(next.crystalRestart, true);
        assert.equal(next.sectorMap, false);
        assert.equal(next.hullId, played.hullId);
        assert.equal(useGame.getState().played, null);
        leaveExit(next);
        assert.equal(next.sectorMap, false);
        assert.equal(next.sector, 2);
        assert.equal(next.crystalRestart, false);
        assert.notEqual(next.sectorName, "Hidden Crystal Worlds");
        assert.notEqual(next.sectorName, "Civilian (Starting) Sector");
        const here = (next.route ?? []).find((node) => node.id === next.routeHere);
        assert.equal(here?.col, 1);
        names.add(next.sectorName);
      }
      assert.ok(names.size > 1);

      // HANGAR keeps the run the player was playing, then the hangar START calls newRun.
      Date.now = () => 6_000;
      useGame.setState({ game: played, played: null, boot: "title" });
      goTitle("hangar");
      const parked = useGame.getState();
      assert.equal(parked.boot, "hangar");
      assert.equal(parked.game.phase, "title");
      assert.equal(parked.game.sectorName, "Civilian (Starting) Sector");
      assert.equal(parked.played, played);
      useGame.getState().newRun("kestrel-a");
      const started = useGame.getState().game;
      assert.equal(useGame.getState().played, null);
      assert.equal(started.sector, 1);
      assert.equal(started.sectorName, "Civilian Sector");
      assert.equal(started.crystalRestart, true);
      assert.equal(started.hullId, "kestrel-a");
      leaveExit(started);
      assert.equal(started.sectorMap, false);
      assert.equal(started.sector, 2);

      // A finished run that was not the crystal sector still opens the chart.
      const plain = structuredClone(played);
      plain.sectorName = "Civilian (Starting) Sector";
      plain.phase = "defeat";
      useGame.setState({ game: plain, played: null, boot: "title" });
      goTitle("hangar");
      assert.equal(useGame.getState().played, plain);
      useGame.getState().newRun("kestrel-a");
      const fresh = useGame.getState().game;
      assert.equal(fresh.sectorName, "Civilian (Starting) Sector");
      assert.equal(fresh.crystalRestart, undefined);
      leaveExit(fresh);
      assert.equal(fresh.sectorMap, true);
      assert.equal(fresh.sector, 1);

      // The title placeholder alone is not a crystal restart.
      fresh.phase = "title";
      useGame.setState({ game: fresh, played: null, boot: "title" });
      goTitle("title");
      assert.equal(useGame.getState().game.phase, "title");
      assert.equal(useGame.getState().played, null);
      assert.equal(useGame.getState().game.sectorName, "Civilian (Starting) Sector");
      useGame.getState().newRun();
      const fromTitle = useGame.getState().game;
      assert.equal(fromTitle.sectorName, "Civilian (Starting) Sector");
      assert.equal(fromTitle.crystalRestart, undefined);
      leaveExit(fromTitle);
      assert.equal(fromTitle.sectorMap, true);
      assert.equal(fromTitle.sector, 1);
    } finally {
      Date.now = realNow;
    }
  });
});
