import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allEvents, eventDef, loadPack, resetPackForTests } from "@stl/pack";
import type { ChoiceReq, EventCard } from "@stl/pack";
import { choiceDisabled, createGame } from "../sim.ts";
import "../pack/base.ts";
import { missingDisabled } from "./cited-missing.ts";
import { CHOICE_REQS } from "./choice-reqs.ts";
import { fillerChoiceDisabled } from "./filler-events.ts";
import { questChoiceDisabled } from "./quests.ts";

afterEach(() => resetPackForTests());

function packedReqIds(): Set<string> {
  const seen = new Set<string>();
  for (const ev of allEvents()) {
    for (const choice of ev.choices) if (choice.reqs?.length) seen.add(choice.id);
    for (const card of ev.cards ?? [])
      for (const choice of card.choices) if (choice.reqs?.length) seen.add(choice.id);
  }
  return seen;
}

function copyCard(card: EventCard): EventCard {
  return {
    body: card.body,
    choices: card.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      ...(choice.reqs ? { reqs: choice.reqs.map((req) => ({ ...req })) } : {}),
    })),
  };
}

describe("choice requirements", () => {
  it("finds every authored lock, and keeps the leftover page off the chart", () => {
    const seen = packedReqIds();
    for (const id of Object.keys(CHOICE_REQS)) assert.equal(seen.has(id), true, id);
    const holder = eventDef("blue-button-reqs");
    assert.ok(holder);
    assert.deepEqual(holder.sectors, []);
    assert.equal(holder.flag, "reqs:blue-button-reqs");
    assert.equal(holder.body, "");
    assert.equal(
      holder.choices.some((choice) => choice.id === "c:no-fuel-refugee-trading:engi"),
      false,
    );
    const engi = eventDef("no-fuel-refugee-trading")
      ?.cards?.flatMap((card) => card.choices)
      .find((choice) => choice.id === "c:no-fuel-refugee-trading:engi");
    assert.equal(engi?.reqs?.[0]?.k, "crew");
    assert.equal(engi?.reqs?.[0]?.id, "engi");
    const g = createGame(1);
    assert.equal(
      g.beacons.some((beacon) => beacon.flag === "reqs:blue-button-reqs"),
      false,
    );
  });

  it("refuses with the same sentences, in the same order", () => {
    const plain = createGame(1);
    const engi = "Needs an Engi crewmember";
    assert.equal(missingDisabled(plain, "c:no-fuel-refugee-trading:engi"), engi);
    assert.equal(choiceDisabled(plain, "c:no-fuel-refugee-trading:engi"), engi);
    assert.equal(fillerChoiceDisabled(plain, "c:no-fuel-refugee-trading:engi"), null);

    const band = "Needs Engines level 3-5";
    for (const level of [2, 6]) {
      const g = createGame(level);
      g.player.systems.engines.level = level;
      assert.equal(questChoiceDisabled(g, "c:auto-ship-fight-in-plasma-storm:1"), band);
      assert.equal(choiceDisabled(g, "c:auto-ship-fight-in-plasma-storm:1"), band);
      assert.equal(fillerChoiceDisabled(g, "c:auto-ship-fight-in-plasma-storm:1"), null);
    }
    const mid = createGame(4);
    mid.player.systems.engines.level = 4;
    assert.equal(questChoiceDisabled(mid, "c:auto-ship-fight-in-plasma-storm:1"), null);

    const broke = createGame(3);
    broke.scrap = 0;
    assert.equal(fillerChoiceDisabled(broke, "c:refueling-station:0"), "Need 12 scrap");
    broke.scrap = 12;
    assert.equal(fillerChoiceDisabled(broke, "c:refueling-station:0"), null);

    const hub = createGame(5);
    hub.scrap = 0;
    assert.equal(questChoiceDisabled(hub, "c:zoltan-trade-hub:2"), "Needs a Zoltan crewmember");
    assert.equal(choiceDisabled(hub, "c:zoltan-trade-hub:2"), `Need ${10} ${"scrap"}`);
  });

  it("reads an appended lock and restores the campaign sentence", () => {
    const row = eventDef("no-fuel-refugee-trading");
    assert.ok(row?.cards);
    const cards = row.cards.map(copyCard);
    const button = cards
      .flatMap((card) => card.choices)
      .find((choice) => choice.id === "c:no-fuel-refugee-trading:engi");
    assert.ok(button);
    button.reqs = [{ k: "crew", id: "engi", text: "Ember engi." }];
    loadPack({ events: [{ ...row, cards }] }, "append");
    assert.equal(missingDisabled(createGame(1), "c:no-fuel-refugee-trading:engi"), "Ember engi.");
    resetPackForTests();
    assert.equal(
      missingDisabled(createGame(1), "c:no-fuel-refugee-trading:engi"),
      "Needs an Engi crewmember",
    );

    const ember: ChoiceReq = { k: "crew", id: "engi", text: "Need an Ember engi." };
    loadPack(
      {
        events: [
          {
            id: "ember-lock",
            dest: "",
            flag: "reqs:ember-lock",
            aliases: [],
            sectors: [],
            body: "",
            choices: [
              { id: "c:ember-lock:go", label: "Go", fx: [{ k: "nothing" }], reqs: [ember] },
            ],
          },
        ],
      },
      "append",
    );
    assert.equal(fillerChoiceDisabled(createGame(2), "c:ember-lock:go"), "Need an Ember engi.");
    assert.equal(questChoiceDisabled(createGame(2), "c:ember-lock:go"), "Need an Ember engi.");
    resetPackForTests();
    assert.equal(fillerChoiceDisabled(createGame(2), "c:ember-lock:go"), null);
  });
});
