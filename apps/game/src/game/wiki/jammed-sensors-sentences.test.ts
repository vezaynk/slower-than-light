import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";

const CONTINUE =
  "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!";
const HACK =
  "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders.";

describe("Boarders: Humans jammed sensors sentences", () => {
  it("continue shows the sensor sentence on the card and returns to the boarder fight", () => {
    // Wiki citations:
    // > "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!" — [[Boarders: Humans jammed sensors]]
    const g = createGame(1);
    choose(g, "c:boarders-humans-jammed-sensors:0");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(CONTINUE));
    assert.equal(g.log.includes(CONTINUE), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0));
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0));
    assert.equal(g.log.includes(CONTINUE), false);
  });

  it("hacking shows the counter sentence on the card and returns to the boarder fight", () => {
    // Wiki citations:
    // > "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders." — [[Boarders: Humans jammed sensors]]
    const g = createGame(2);
    g.player.kits.hacking = {
      id: "hacking",
      level: 2,
      power: 2,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    choose(g, "c:boarders-humans-jammed-sensors:1");
    assert.equal(g.phase, "event");
    assert.ok(g.event?.body?.includes(HACK));
    assert.equal(g.log.includes(HACK), false);
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0));
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0));
    assert.equal(g.log.includes(HACK), false);
  });
});
