import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, createGame } from "../sim.ts";

const CONTINUE = "Until you are able to jump away from the hostile space station, your sensors will be disabled. You should deal with these boarders first though!";
const HACK = "Your hacking system automatically counters the digital assault. Your Sensors flicker back on and you prepare to fight the boarders.";

describe("Boarders: Humans jammed sensors sentences", () => {
  it("continue logs the sensor sentence and stays in the boarder fight", () => {
    const g = createGame(1);
    choose(g, "c:boarders-humans-jammed-sensors:0");
    assert.ok(g.log.includes(CONTINUE));
    assert.equal(g.phase, "combat");
  });

  it("hacking logs the counter sentence and stays in the boarder fight", () => {
    const g = createGame(2);
    g.player.kits.spike = { id: "spike", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    choose(g, "c:boarders-humans-jammed-sensors:1");
    assert.ok(g.log.includes(HACK));
    assert.equal(g.phase, "combat");
  });
});
