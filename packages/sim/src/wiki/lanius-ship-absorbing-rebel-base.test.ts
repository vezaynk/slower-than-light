import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_GROUP_AUTO";
  b.name = "Lanius ships: fleet delay";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  g.fleet = 5;
  assert.equal(g.event?.title, "Lanius ships: fleet delay");
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Lanius ships: fleet delay", () => {
  it("leaves them with nothing spent", () => {
    // Wiki citations:
    // > "Leave them alone." — [[Lanius ship absorbing rebel base]]
    // > "You decide it would be better to leave them be." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-absorbing-rebel-base:1");
    assert.ok((g.event?.body ?? "").startsWith(eventText("event_LANIUS_GROUP_AUTO_c2_text")));
    assert.match(g.event?.body ?? "", /Nothing happens/);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);
  });

  it("asking them delays the fleet with medium scrap, starts a Lanius fight, or does nothing", () => {
    // Wiki citations:
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. They thank you for the tip and prepare to jump in the direction you came. That will hopefully delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. You're not certain if you were misunderstood but they appear to scoff at your suggestion. Most ships continue what they were doing but a single ship moves to fight you." — [[Lanius ship absorbing rebel base]]
    // > "Fight a Lanius ship (default Lanius rewards)." — [[Lanius ship absorbing rebel base]]
    // > "You try your best to convey the notion that the approaching Rebel fleet has countless automated ships scouting for them. However, either the translation device has failed or they're simply not interested. They cut the channel and continue to absorb the ships." — [[Lanius ship absorbing rebel base]]
    // > "Nothing happens." — [[Lanius ship absorbing rebel base]]
    let delay = false;
    let fight = false;
    let nothing = false;
    for (let seed = 1; seed <= 80 && (!delay || !fight || !nothing); seed++) {
      const g = createGame(seed);
      open(g);
      choose(g, "c:lanius-ship-absorbing-rebel-base:0");
      if (g.event?.choices.some((c) => c.id === "ship-resume")) {
        fight = true;
        assert.ok((g.event?.body ?? "").includes(eventText("event_LANIUS_GROUP_AUTO_LIST_2_text")));
        assert.equal(
          g.log.some((line) => line.includes(eventText("event_LANIUS_GROUP_AUTO_LIST_2_text"))),
          false,
        );
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemy?.faction, "lanius");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
        assert.equal(
          g.log.some((line) => line.includes(eventText("event_LANIUS_GROUP_AUTO_LIST_2_text"))),
          false,
        );
      } else if (g.fleet === 4) {
        delay = true;
        const body = g.event?.body ?? "";
        assert.ok(body.startsWith(eventText("event_LANIUS_GROUP_AUTO_LIST_3_text")), body);
        const paid = [...body.matchAll(/Scrap: (\d+)/g)].map((m) => Number(m[1]));
        assert.equal(paid.length, 1, body);
        assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
        assert.equal(resources(body), 2, body);
      } else {
        nothing = true;
        assert.ok(
          (g.event?.body ?? "").startsWith(eventText("event_LANIUS_GROUP_AUTO_LIST_1_text")),
        );
        assert.equal(g.scrap, 10);
        assert.equal(g.fleet, 5);
      }
    }
    assert.equal(delay && fight && nothing, true);
  });

  it("a Lanius crewmember delays the fleet for medium scrap, and the button stays shut without one", () => {
    // Wiki citations:
    // > "(Lanius Crew) Try to use them to delay the Rebels." — [[Lanius ship absorbing rebel base]]
    // > "Your crewmember tells them of the approaching fleet and the number of automated ships they use to scout ahead. They thank you for the tip and prepare to jump in the direction you came. That will hopefully will delay the fleet. You scrap what remains of the Rebel station." — [[Lanius ship absorbing rebel base]]
    // > "You receive medium scrap with resources and Rebel Fleet is delayed for 1 turn." — [[Lanius ship absorbing rebel base]]
    const bare = createGame(1);
    open(bare);
    assert.equal(
      choiceDisabled(bare, "c:lanius-ship-absorbing-rebel-base:2"),
      "Needs a Lanius crewmember",
    );
    choose(bare, "c:lanius-ship-absorbing-rebel-base:2");
    assert.equal(bare.scrap, 10);
    assert.equal(bare.fleet, 5);

    const g = createGame(2);
    open(g);
    assert.equal(joinCrew(g, "Lanius"), true);
    assert.equal(choiceDisabled(g, "c:lanius-ship-absorbing-rebel-base:2"), null);
    choose(g, "c:lanius-ship-absorbing-rebel-base:2");
    assert.equal(g.fleet, 4);
    const body = g.event?.body ?? "";
    assert.ok(body.startsWith(eventText("event_LANIUS_GROUP_AUTO_c3_text")), body);
    const paid = [...body.matchAll(/Scrap: (\d+)/g)].map((m) => Number(m[1]));
    assert.equal(paid.length, 1, body);
    assert.ok(paid[0]! >= 12 && paid[0]! <= 19, body);
    assert.equal(resources(body), 2, body);
    assert.equal(g.phase, "event");
  });
});
