import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  archivePhrase,
  clearArchivePhrases,
  eventDef,
  fillerList,
  loadPack,
  onPackWarning,
  packFromFtl,
  resetPackForTests,
} from "@stl/pack";
import { continueLabel } from "../interface-copy.ts";
import { choose, createGame, rand, waitHere } from "../sim.ts";
import { drawLoadedPage, presentLoadedEvent } from "../wiki/cited-events.ts";
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

function drawnWait(
  g: ReturnType<typeof createGame>,
  beacon: NonNullable<(typeof g.beacons)[number]>,
) {
  const listId = g.distress !== false ? "NO_FUEL_DISTRESS" : "NO_FUEL";
  const list = fillerList(listId);
  assert.ok(list && list.entries.length > 0, listId);
  const entry = list.entries[Math.floor(rand(g) * list.entries.length)];
  assert.ok(entry);
  const page = drawLoadedPage(entry.id, (n) => Math.floor(rand(g) * n));
  assert.ok(page, entry.id);
  const card = presentLoadedEvent(g, page, beacon);
  assert.ok(card);
  return card;
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
    assert.equal(eventDef("STUB_AMBUSH"), undefined);
    assert.equal(fillerList("STUB_AMBUSH")?.entries[0]?.page?.ship?.load, "PIRATE");
    const probe = parked(1);
    const live = parked(1);
    const expected = drawnWait(probe.g, live.here);
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
      const expected = drawnWait(probe.g, live.here);
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

  it("pays the damaged ship's fuel when the choice is taken", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_REFUGEE"/>
  </eventList>
  <eventList name="STUB_REFUGEE">
    <event load="STUB_DAMAGED"/>
  </eventList>
  <event name="STUB_DAMAGED">
    <text>A damaged refugee ship.</text>
    <choice>
      <text>Offer scrap for fuel.</text>
      <event>
        <item_modify>
          <item type="fuel" min="3" max="3"/>
          <item type="scrap" min="-10" max="-10"/>
        </item_modify>
      </event>
    </choice>
  </event>
</FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(eventDef("STUB_REFUGEE"), undefined);
    const help = eventDef("STUB_DAMAGED")?.choices[0];
    assert.deepEqual(
      help?.fx.filter((fx) => fx.k === "res"),
      [
        { k: "res", id: "fuel", sign: 1, lo: 3, hi: 3 },
        { k: "res", id: "scrap", sign: -1, lo: 10, hi: 10 },
      ],
    );
    const { g } = parked(1);
    g.scrap = 40;
    waitHere(g);
    const choice = g.event?.choices.find((row) => row.label === "Offer scrap for fuel.");
    assert.ok(choice);
    choose(g, choice.id);
    assert.equal(g.fuel, 3);
    assert.equal(g.scrap, 30);
  });

  it("draws the pirate's accept list and plays that page", () => {
    loadPack(
      packFromFtl([
        {
          path: "data/events_fuel.xml",
          xml: `<FTL>
  <eventList name="NO_FUEL_DISTRESS">
    <event load="STUB_REFUGEE"/>
  </eventList>
  <eventList name="STUB_REFUGEE">
    <event load="STUB_PIRATE"/>
  </eventList>
  <event name="STUB_PIRATE">
    <text>Pirates pretending to be refugees.</text>
    <choice>
      <text>Accept.</text>
      <event load="STUB_ACCEPT"/>
    </choice>
    <choice>
      <text>Reject.</text>
      <event load="STUB_REJECT"/>
    </choice>
  </event>
  <eventList name="STUB_ACCEPT">
    <event>
      <text>They hand over fuel.</text>
      <item_modify>
        <item type="fuel" min="5" max="5"/>
      </item_modify>
    </event>
    <event>
      <text>They hand over fuel and attack.</text>
      <item_modify>
        <item type="fuel" min="5" max="5"/>
      </item_modify>
      <ship load="PIRATE" hostile="true"/>
    </event>
  </eventList>
  <eventList name="STUB_REJECT">
    <event>
      <text>They leave.</text>
    </event>
  </eventList>
</FTL>`,
        },
      ]),
      "append",
    );
    assert.equal(eventDef("STUB_REFUGEE"), undefined);
    assert.equal(eventDef("STUB_ACCEPT"), undefined);
    assert.equal(eventDef("STUB_REJECT"), undefined);
    assert.ok(fillerList("STUB_ACCEPT"));
    assert.ok(fillerList("STUB_REJECT"));
    let traded = false;
    let ambush = false;
    for (let seed = 1; seed <= 40 && (!traded || !ambush); seed++) {
      const { g } = parked(seed);
      waitHere(g);
      const accept = g.event?.choices.find((row) => row.label.startsWith("Accept."));
      assert.ok(accept);
      choose(g, accept.id);
      assert.equal(g.fuel, 5);
      // The fight page shows its fuel line over the battle. Continue starts the fight.
      if (g.enemy) {
        ambush = true;
        const resume = g.event?.choices.find((row) => row.id === "ship-resume");
        assert.ok(resume);
        choose(g, resume.id);
        assert.equal(g.phase, "combat");
      } else traded = true;
    }
    assert.equal(traded, true);
    assert.equal(ambush, true);
    const { g } = parked(1);
    waitHere(g);
    const reject = g.event?.choices.find((row) => row.label === "Reject.");
    assert.ok(reject);
    choose(g, reject.id);
    assert.equal(g.phase, "event");
    assert.match(g.event?.body ?? "", /They leave/);
    assert.equal(g.enemy, null);
  });

  it("reads the nothing page's button from the archive continue phrase", () => {
    resetPackForTests();
    clearArchivePhrases();
    const warnings: string[] = [];
    const restore = onPackWarning((message) => warnings.push(message));
    try {
      assert.equal(continueLabel(), "Carry on.");
      continueLabel();
      assert.deepEqual(warnings, ["continue is not loaded; the button says Carry on."]);
      loadPack(
        packFromFtl([
          {
            path: "data/text_misc.xml",
            xml: `<FTL><text name="continue">Press onward.</text></FTL>`,
          },
        ]),
        "append",
      );
      assert.equal(archivePhrase("continue"), "Press onward.");
      assert.equal(continueLabel(), "Press onward.");
      const page = eventDef("FUEL_NOTHING");
      assert.equal(page?.choices.length, 0);
      const { g, here } = parked(1);
      const card = presentLoadedEvent(g, page!, here);
      assert.equal(card?.choices[0]?.id, "fuel-wait-done");
      assert.equal(card?.choices[0]?.label, "Press onward.");
    } finally {
      restore();
    }
  });
});
