import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { joinCrew } from "./surrender.ts";
import { textRe } from "./quest-text-re.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_DISTRESS_FIGHT";
  b.name = "Optional fight: Lanius ship (distress)";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Optional fight: Lanius ship (distress)");
}

function scraps(body: string): number[] {
  return [...body.matchAll(/Scrap: (-?\d+)/g)].map((m) => Number(m[1]));
}

function resources(body: string): number {
  return ["Fuel", "Missiles", "Drone parts"].filter((label) =>
    new RegExp(`${label}: \\d+`).test(body),
  ).length;
}

describe("Optional fight: Lanius ship (distress)", () => {
  it("fighting starts a Lanius fight", () => {
    const g = createGame(1);
    open(g);
    const lead = eventText("event_LANIUS_DISTRESS_FIGHT_c1_text");
    choose(g, "c:lanius-ship-attacking-civilian-distress:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, lead);
    assert.equal(g.log.includes(lead), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.fightEvent, "lanius-ship-attacking-civilian-distress");
    assert.equal(g.enemy?.faction, "lanius");
    assert.equal(g.scrap, 10);
  });

  it("a destroyed ship pays medium scrap and a crew kill pays high", () => {
    for (const dead of [false, true]) {
      const g = createGame(dead ? 2 : 1);
      open(g);
      g.phase = "combat";
      const guns = g.player.weapons.length;
      const crew = g.crew.filter((c) => c.side === "player").length;
      assert.equal(pageWin(g, "lanius-ship-attacking-civilian-distress", dead), true);
      const body = g.event?.body ?? "";
      assert.match(
        body,
        dead
          ? textRe("ship_LANIUS_CIVILIAN_deadCrew_text")
          : textRe("ship_LANIUS_AUTO_REBEL_destroyed_text", "ship_LANIUS_CIVILIAN_destroyed_text"),
      );
      const paid = scraps(body);
      assert.equal(paid.length, 1, body);
      assert.ok(paid[0]! >= (dead ? 19 : 12) && paid[0]! <= (dead ? 23 : 19), body);
      assert.equal(resources(body), 2, body);
      assert.equal(g.scrap, 10 + paid[0]!);
      assert.equal(g.player.weapons.length, guns);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(
        g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"),
        true,
      );
    }
  });

  it("avoiding the conflict spends nothing", () => {
    const g = createGame(1);
    open(g);
    choose(g, "c:lanius-ship-attacking-civilian-distress:1");
    assert.equal(
      g.event?.body,
      [eventText("event_LANIUS_DISTRESS_FIGHT_c2_text"), "Nothing happens."].join("\n\n"),
    );
    assert.equal(g.phase, "event");
    assert.notEqual(g.phase, "combat");
    assert.equal(g.scrap, 10);
  });

  it("a Lanius crewmember starts that fight or powers the ship down, and the button stays shut without one", () => {
    const bare = createGame(1);
    open(bare);
    assert.equal(
      choiceDisabled(bare, "c:lanius-ship-attacking-civilian-distress:2"),
      "Needs a Lanius crewmember",
    );
    choose(bare, "c:lanius-ship-attacking-civilian-distress:2");
    assert.equal(bare.phase, "event");
    assert.equal(bare.scrap, 10);

    let fight = false;
    let peace = false;
    for (let seed = 1; seed <= 40 && (!fight || !peace); seed++) {
      const g = createGame(seed);
      open(g);
      assert.equal(joinCrew(g, "Lanius"), true);
      assert.equal(choiceDisabled(g, "c:lanius-ship-attacking-civilian-distress:2"), null);
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:lanius-ship-attacking-civilian-distress:2");
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      const rogue =
        g.event?.choices.some((c) => c.id === "ship-resume") === true && g.enemy != null;
      if (rogue) {
        fight = true;
        assert.ok(
          (g.event?.body ?? "").includes(eventText("event_LANIUS_DISTRESS_FIGHT_LANIUS_2_text")),
        );
        assert.equal(
          g.log.some((line) =>
            line.includes(eventText("event_LANIUS_DISTRESS_FIGHT_LANIUS_2_text")),
          ),
          false,
        );
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.fightEvent, "lanius-ship-attacking-civilian-distress");
        assert.equal(g.enemy?.faction, "lanius");
        assert.equal(g.scrap, 10);
      } else {
        peace = true;
        assert.ok(
          (g.event?.body ?? "").includes(eventText("event_LANIUS_DISTRESS_FIGHT_LANIUS_1_text")),
        );
        assert.equal(g.event?.body.includes("Scrap:"), false);
        assert.equal(g.scrap, 10);
        assert.equal(
          g.event?.choices.some((c) => c.id === "q:lanius-civilian:contact"),
          true,
        );
      }
    }
    assert.equal(fight && peace, true);
  });
});
