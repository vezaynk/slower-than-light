import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { eventDef, fillerList, loadPack, packFromFtl, resetPackForTests } from "@stl/pack";
import { choose, createGame, rand, waitHere } from "../sim.ts";
import { citedEvent } from "../wiki/cited-events.ts";
import { choiceOmitted } from "../wiki/choice-locks.ts";
import "./base.ts";

afterEach(() => resetPackForTests());

function parked(seed: number) {
  const g = createGame(seed);
  g.fuel = 0;
  g.phase = "map";
  g.paused = false;
  g.event = null;
  const here = g.beacons.find((item) => item.id === g.here);
  assert.ok(here);
  here.resolved = false;
  return { g, here };
}

function cardOf(
  event: { title?: string; body?: string; choices?: { id: string; label: string }[] } | null,
) {
  return {
    title: event?.title,
    body: event?.body,
    choices: event?.choices?.map((choice) => ({ id: choice.id, label: choice.label })),
  };
}

describe("a fuel list loaded by the wait", () => {
  it("leaves an exit list as a list", () => {
    assert.equal(eventDef("EXIT_NEUTRAL"), undefined);
    assert.equal(eventDef("EXIT_ITEMS"), undefined);
    assert.ok(fillerList("EXIT_NEUTRAL"));
    assert.ok(fillerList("EXIT_LIST")?.entries.some((entry) => entry.id === "EXIT_NEUTRAL"));
  });

  it("fights the ship on an inline page when Continue is chosen", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_AMBUSH"/>
  </eventList>
  <eventList name="STUB_AMBUSH">
    <event>
      <text>Pirates in a refugee ship.</text>
      <ship hostile="true" load="PIRATE"/>
      <choice hidden="true"><text>Continue...</text></choice>
    </event>
  </eventList>
</FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(eventDef("STUB_AMBUSH")?.id, "STUB_AMBUSH");
    assert.equal(fillerList("STUB_AMBUSH")?.entries[0]?.page?.ship?.load, "PIRATE");
    const probe = parked(1);
    const live = parked(1);
    const list = fillerList("NO_FUEL_DISTRESS");
    assert.ok(list);
    const entry = list.entries[Math.floor(rand(probe.g) * list.entries.length)];
    assert.ok(entry);
    const page = eventDef(entry.id);
    assert.ok(page);
    const expected = citedEvent(probe.g, { ...live.here, flag: page.id, name: page.dest });
    assert.ok(expected);
    assert.equal(expected.choices[0]?.label, "Continue...");
    waitHere(live.g);
    assert.deepEqual(cardOf(live.g.event), cardOf(expected));
    const choice = live.g.event?.choices[0];
    assert.ok(choice);
    choose(live.g, choice.id);
    assert.equal(live.g.phase, "combat");
    assert.ok(live.g.enemy);
    assert.equal(live.here.resolved, false);
  });

  it("rotates every sentence when the first one is the body", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <textList name="STUB_FLAT">
    <text>First pirate line.</text>
    <text>Second pirate line.</text>
  </textList>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_FLAT_PAGE"/>
  </eventList>
  <eventList name="STUB_FLAT_PAGE">
    <event load="STUB_FLAT_EVENT"/>
  </eventList>
  <event name="STUB_FLAT_EVENT">
    <text load="STUB_FLAT"/>
    <choice><text>Fight.</text></choice>
  </event>
</FTL>`,
        },
      ]),
      "append",
    );
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const live = parked(seed);
      waitHere(live.g);
      const body = live.g.event?.body ?? "";
      assert.ok(body === "First pirate line." || body === "Second pirate line.", body);
      seen.add(body);
    }
    assert.equal(seen.size, 2);
  });

  it("rotates a loaded text list instead of a blank body", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <textList name="STUB_INNER">
    <text>First pirate line.</text>
    <text>Second pirate line.</text>
  </textList>
  <textList name="STUB_LINES">
    <text load="STUB_INNER"/>
  </textList>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_LINES_PAGE"/>
  </eventList>
  <eventList name="STUB_LINES_PAGE">
    <event load="STUB_PIRATE"/>
  </eventList>
  <event name="STUB_PIRATE">
    <text load="STUB_LINES"/>
    <choice><text>Fight.</text></choice>
  </event>
</FTL>`,
        },
      ]),
      "append",
    );
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const probe = parked(seed);
      const live = parked(seed);
      const list = fillerList("NO_FUEL_DISTRESS");
      assert.ok(list);
      const entry = list.entries[Math.floor(rand(probe.g) * list.entries.length)];
      assert.ok(entry);
      const page = eventDef(entry.id);
      assert.ok(page);
      const expected = citedEvent(probe.g, { ...live.here, flag: page.id, name: page.dest });
      waitHere(live.g);
      assert.deepEqual(cardOf(live.g.event), cardOf(expected));
      const body = live.g.event?.body ?? "";
      assert.ok(body === "First pirate line." || body === "Second pirate line.", body);
      seen.add(body);
    }
    assert.equal(seen.size, 2);
  });

  it("hides an unmet inline choice and pays a page reward on Continue", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_GIFT"/>
  </eventList>
  <eventList name="STUB_GIFT">
    <event>
      <text>A quieter offer.</text>
      <choice hidden="true" req="engi" max_group="1"><text>Engi trade.</text></choice>
      <choice max_group="1"><text>Plain trade.</text></choice>
    </event>
    <event>
      <text>They leave a crate.</text>
      <autoReward level="LOW">fuel_only</autoReward>
    </event>
  </eventList>
</FTL>`,
        },
      ]),
      "append",
    );
    const offer = fillerList("STUB_GIFT")?.entries[0]?.page;
    assert.ok(offer);
    const ids = offer.choices.map((choice) => choice.id);
    const g = createGame(1);
    assert.equal(choiceOmitted(g, ids[0]!, ids), true);
    assert.equal(choiceOmitted(g, ids[1]!, ids), false);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30 && seen.size < 2; seed++) {
      const live = parked(seed);
      waitHere(live.g);
      const body = live.g.event?.body ?? "";
      seen.add(body);
      if (body !== "They leave a crate.") continue;
      const before = live.g.scrap;
      const fuel = live.g.fuel;
      const choice = live.g.event?.choices[0];
      assert.ok(choice);
      assert.match(choice.id, /^listpage:/);
      choose(live.g, choice.id);
      assert.equal(live.g.scrap, before);
      assert.ok(live.g.fuel > fuel, `fuel ${fuel} -> ${live.g.fuel}`);
      assert.equal(live.g.phase, "event");
      assert.equal(live.g.event?.choices[0]?.id, "ack");
    }
    assert.ok(seen.has("They leave a crate."));
    assert.ok(seen.has("A quieter offer."));
  });
});
