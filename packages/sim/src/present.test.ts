import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { bindArchiveImages, stampArchiveImage } from "./archive-pay.ts";
import { takeCues } from "./sfx-queue.ts";
import { createGame, step } from "./sim.ts";
import type { Game } from "./types.ts";

after(() => bindArchiveImages(null));

function card(): Game {
  return { seed: 1, sfx: [], event: { title: "t", body: "b", choices: [] } } as Game;
}

describe("event pictures", () => {
  it("keeps the card clear when the pack has no file, so a later picture can land", () => {
    const g = card();
    bindArchiveImages(() => false);
    stampArchiveImage(g, "img/missing.png");
    assert.equal(g.event?.img, undefined);
    bindArchiveImages((path) => path === "img/here.png");
    stampArchiveImage(g, "img/here.png");
    assert.equal(g.event?.img, "img/here.png");
    stampArchiveImage(g, "img/later.png");
    assert.equal(g.event?.img, "img/here.png");
  });
});

describe("sound cues", () => {
  it("hands the queue to the caller", () => {
    const g = card();
    g.sfx.push("sell");
    assert.deepEqual(takeCues(g), ["sell"]);
    assert.deepEqual(g.sfx, []);
  });

  it("step takes the cues it queued, including one already waiting", () => {
    const g = createGame(1);
    g.sfx.push("sell");
    const cues = step(g, 0);
    assert.equal(g.sfx.length, 0);
    assert.ok(cues.includes("sell"));
  });
});
