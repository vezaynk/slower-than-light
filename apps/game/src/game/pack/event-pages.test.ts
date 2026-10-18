import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createGame } from "../sim.ts";
import { citedChoose, citedEvent, citedPagesFor } from "../wiki/cited-events.ts";
import { questEvent } from "../wiki/quests.ts";
import "./base.ts";
import { allEvents, eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { Game } from "../types.ts";

afterEach(() => resetPackForTests());

function pay(g: Game, id: string, fight?: (tier: string, asteroid?: boolean) => void): boolean {
  return citedChoose(
    {
      g,
      resolve: () => {},
      fight: (tier, asteroid) => fight?.(tier, asteroid),
      scrap: (n) => {
        g.scrap += n;
      },
      note: () => {},
      irand: () => 0,
    },
    id,
  );
}

describe("event pages", () => {
  it("pays an appended choice and leaves the authored pages alone", () => {
    loadPack(
      {
        events: [
          {
            id: "ember",
            dest: "Ember",
            flag: "cited:ember",
            aliases: ["Ember"],
            sectors: ["Civilian Sector"],
            body: "A packed beacon.",
            choices: [
              {
                id: "c:ember:0",
                label: "Take",
                fx: [{ k: "res", id: "scrap", sign: 1, lo: 7, hi: 7 }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    const before = g.scrap;
    assert.equal(pay(g, "c:ember:0"), true);
    assert.equal(g.scrap, before + 7);
    assert.equal(allEvents().at(-1)?.id, "ember");
    assert.equal(
      citedPagesFor("Civilian Sector").some((ev) => ev.slug === "ember"),
      false,
    );
  });

  it("starts the fight an appended choice names", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-fight",
            dest: "Ember Fight",
            flag: "cited:ember-fight",
            aliases: [],
            sectors: ["Civilian Sector"],
            body: "Fight.",
            choices: [
              {
                id: "c:ember-fight:0",
                label: "Fight",
                fx: [{ k: "fight", tier: "pirate", asteroid: true }],
              },
            ],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    let tier = "";
    let asteroid: boolean | undefined;
    assert.equal(
      pay(g, "c:ember-fight:0", (next, field) => {
        tier = next;
        asteroid = field;
      }),
      true,
    );
    assert.equal(tier, "pirate");
    assert.equal(asteroid, true);
  });

  it("shows an overwritten page from the pack", () => {
    const page = eventDef("auto-ship-attacking-civilian");
    assert.ok(page);
    loadPack({ events: [{ ...page, body: "Packed page." }] }, "append");
    const g = createGame(1);
    const beacon = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit");
    assert.ok(beacon);
    beacon.flag = page.flag;
    beacon.name = page.dest;
    const card = citedEvent(g, beacon);
    assert.equal(card?.body, "Packed page.");
    assert.equal(card?.title, page.dest);
    resetPackForTests();
    const restored = citedEvent(g, beacon);
    assert.equal(restored?.body, page.body);
  });

  it("places a quest marker from an appended choice and shows that arrival page", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-mark",
            dest: "Ember Mark",
            flag: "cited:ember-mark",
            aliases: [],
            sectors: [],
            body: "A marker.",
            choices: [
              {
                id: "c:ember-mark:0",
                label: "Mark",
                fx: [
                  { k: "note", text: "Coordinates received." },
                  { k: "quest", id: "ember-quest" },
                ],
              },
            ],
          },
          {
            id: "arrive-ember-quest",
            dest: "Ember Quest",
            flag: "quest:ember-quest",
            aliases: [],
            sectors: [],
            body: "The platform.",
            choices: [{ id: "q:ember-quest:go", label: "Look", fx: [{ k: "nothing" }] }],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    g.sector = 3;
    assert.equal(pay(g, "c:ember-mark:0"), true);
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /Coordinates received/);
    const spot = g.beacons.find((b) => b.quest === "ember-quest");
    assert.ok(spot);
    assert.equal(spot.flag, "quest:ember-quest");
    g.here = spot.id;
    const card = questEvent(g, spot);
    assert.equal(card?.body, "The platform.");
    assert.equal(card?.choices[0]?.id, "q:ember-quest:go");
    assert.equal(
      citedPagesFor("Civilian Sector").some((ev) => ev.slug === "arrive-ember-quest"),
      false,
    );
  });

  it("opens the page a goto effect names", () => {
    loadPack(
      {
        events: [
          {
            id: "ember-goto",
            dest: "Ember Goto",
            flag: "cited:ember-goto",
            aliases: [],
            sectors: [],
            body: "Leave.",
            choices: [{ id: "c:ember-goto:0", label: "Go", fx: [{ k: "goto", id: "ember-next" }] }],
          },
          {
            id: "ember-next",
            dest: "Ember Next",
            flag: "cited:ember-next",
            aliases: [],
            sectors: [],
            body: "Next page.",
            choices: [{ id: "c:ember-next:0", label: "Stay", fx: [{ k: "nothing" }] }],
          },
        ],
      },
      "append",
    );
    const g = createGame(1);
    assert.equal(pay(g, "c:ember-goto:0"), true);
    assert.equal(g.event?.body, "Next page.");
    assert.equal(g.event?.choices[0]?.id, "c:ember-next:0");
    assert.equal(g.paused, true);
  });
});
