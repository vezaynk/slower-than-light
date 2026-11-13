import assert from "node:assert/strict";
import { eventText } from "../event-text.ts";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent, citedPagesFor } from "./cited-events.ts";
import { joinCrew } from "./surrender.ts";

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "LANIUS_RESEARCHER_CRAFT";
  b.name = "Lanius craftsmen";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Lanius craftsmen");
}

function stock(g: Game) {
  return {
    scrap: g.scrap,
    fuel: g.fuel,
    missiles: g.missiles,
    parts: g.player.parts,
    guns: g.player.weapons.length,
    augs: g.augments.length,
    crew: g.crew.filter((c) => c.side === "player").length,
  };
}

function sameStock(g: Game, before: ReturnType<typeof stock>) {
  assert.equal(g.scrap, before.scrap);
  assert.equal(g.fuel, before.fuel);
  assert.equal(g.missiles, before.missiles);
  assert.equal(g.player.parts, before.parts);
  assert.equal(g.player.weapons.length, before.guns);
  assert.equal(g.augments.length, before.augs);
  assert.equal(g.crew.filter((c) => c.side === "player").length, before.crew);
}

describe("Lanius craftsmen", () => {
  it("is one Abandoned Sector card", () => {
    // Wiki citations:
    // > "This random event occurs in Abandoned Sector." — [[Lanius craftsmen]]
    const pages = citedPagesFor("LANIUS_SECTOR").filter((e) => e.dest === "Lanius craftsmen");
    assert.equal(pages.length, 1);
    assert.equal(
      citedPagesFor("CIVILIAN_SECTOR").some((e) => e.dest === "Lanius craftsmen"),
      false,
    );
  });

  it("opens on the merchant sentence and does not sell the unnamed crafts", () => {
    // Wiki citations:
    // > "A merchant ship is docked with a Lanius transport. You message them to see if they need any help. It turns out they have been studying the Lanius's ability to reshape metal." — [[Lanius craftsmen]]
    // > "Inquire about the process." — [[Lanius craftsmen]]
    // > "Leave them to their research." — [[Lanius craftsmen]]
    const g = createGame(1);
    open(g);
    assert.equal(g.event?.body, "Item seller.");
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      ["More options: buy an augment, weapon or drone for scrap.", "Nothing happens."],
    );
    assert.equal(
      g.event?.choices.some((c) => /45|50|40|discount/.test(c.label)),
      false,
    );
  });

  it("inquiring can be declined, and nothing is spent", () => {
    // Wiki citations:
    // > "They respond, \"We haven't the foggiest idea how it works. They appear to meld part of their bodies into the metal and reshape it. They have been willing to demonstrate their ability if you have some extra metal that you would like converted into something.\"" — [[Lanius craftsmen]]
    // > "Give 45 scrap to craft an augmentation." — [[Lanius craftsmen]]
    // > "Give 50 scrap to craft a weapon." — [[Lanius craftsmen]]
    // > "Give 40 scrap to craft a drone schematic." — [[Lanius craftsmen]]
    // > "Decline their offer." — [[Lanius craftsmen]]
    // > "Offer to help in the process." — [[Lanius craftsmen]]
    // > "You thank them for the information and prepare to jump." — [[Lanius craftsmen]]
    // > "Nothing happens." — [[Lanius craftsmen]]
    const g = createGame(2);
    open(g);
    const before = stock(g);
    choose(g, "c:lanius-craftsmen:0");
    assert.ok((g.event?.body ?? "").includes(eventText("event_LANIUS_RESEARCHER_CRAFT_c1_text")));
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      [
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c1_choice")} [45 scrap]`,
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c2_choice")} [50 scrap]`,
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c3_choice")} [40 scrap]`,
        eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c4_choice"),
        eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_choice"),
      ],
    );
    assert.equal(choiceDisabled(g, "s:lanius-craftsmen:help"), "Needs a Lanius crewmember");
    choose(g, "s:lanius-craftsmen:decline");
    assert.ok(
      (g.event?.body ?? "").includes(eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c4_text")),
    );
    assert.match(g.event?.body ?? "", /Nothing happens/);
    sameStock(g, before);
    assert.equal(g.phase, "event");
  });

  it("a Lanius crewmember discounts the same crafts by 10 scrap", () => {
    // Wiki citations:
    // > "(Lanius Crew) Offer to help in the process." — [[Lanius craftsmen]]
    // > "Your crewmember offers to aid in the process to speed it along. They think it can be performed a bit more efficiently with the extra help and request less scrap." — [[Lanius craftsmen]]
    // > "Same options as above with a Ftlgame-scrap.png 10 discount." — [[Lanius craftsmen]]
    // > "You transfer over the scrap and watch the master craftsmen work. They easily reshape the metal into pieces they can use and then add various additional materials on their ship to construct the schematic. You thank them and load it onto your ship." — [[Lanius craftsmen]]
    // > "You receive an Advanced Edition Content drone schematic." — [[Lanius craftsmen]]
    const g = createGame(4);
    open(g);
    g.scrap = 30;
    joinCrew(g, "Lanius");
    choose(g, "c:lanius-craftsmen:0");
    assert.equal(choiceDisabled(g, "s:lanius-craftsmen:help"), null);
    assert.equal(choiceDisabled(g, "s:lanius-craftsmen:aug"), "Need 45 scrap");
    choose(g, "s:lanius-craftsmen:help");
    assert.ok(
      (g.event?.body ?? "").includes(eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_text")),
    );
    assert.deepEqual(
      g.event?.choices.map((c) => c.label),
      [
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_c1_choice")} [35 scrap]`,
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_c2_choice")} [40 scrap]`,
        `${eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c5_c3_choice")} [30 scrap]`,
        eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c4_choice"),
      ],
    );
    g.scrap = 29;
    assert.equal(choiceDisabled(g, "s:lanius-craftsmen:help:drone"), "Need 30 scrap");
    g.scrap = 30;
    const before = g.augments.length;
    choose(g, "s:lanius-craftsmen:help:drone");
    assert.equal(g.scrap, 0);
    assert.ok(
      (g.event?.body ?? "").includes(eventText("event_LANIUS_RESEARCHER_CRAFT_c1_c3_text")),
    );
    assert.match(
      g.event?.body ?? "",
      /schematic (fitted|stowed in cargo)\.|choose what to leave behind\./,
    );
    assert.ok(g.player.parts >= 0);
    assert.ok(g.augments.length === before);
  });

  it("leaving them to their research does nothing", () => {
    // Wiki citations:
    // > "Leave them to their research." — [[Lanius craftsmen]]
    // > "While replicating their innate ability would have immeasurable consequences on commercial manufacturing, your mission has a much higher priority at the moment." — [[Lanius craftsmen]]
    // > "Nothing happens." — [[Lanius craftsmen]]
    const g = createGame(3);
    open(g);
    const before = stock(g);
    choose(g, "c:lanius-craftsmen:1");
    assert.ok((g.event?.body ?? "").includes(eventText("event_LANIUS_RESEARCHER_CRAFT_c2_text")));
    assert.match(g.event?.body ?? "", /Nothing happens/);
    sameStock(g, before);
    assert.equal(g.phase, "event");
  });
});
