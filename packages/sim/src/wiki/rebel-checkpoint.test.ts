import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";
import { pageWin } from "./quests.ts";
import { eventText } from "../event-text.ts";

const INTROS = [
  "Rebel checkpoint. Hide, or fight the Rebel ship.",
  "Rebel checkpoint. Hide, or fight the Rebel ship.",
  "Rebel checkpoint. Hide, or fight the Rebel ship.",
  "Rebel checkpoint. Hide, or fight the Rebel ship.",
];
const HIDES = [
  "Fly behind a moon and stay hidden.",
  "Shut down all non-vital systems and stay hidden.",
  "Stay quiet and hope they don't notice you.",
  "Stay out of their way and charge your FTL drive.",
];
const BRIBES = [
  eventText("text_REBEL_BRIBE_TEXT_1"),
  eventText("text_REBEL_BRIBE_TEXT_2"),
  eventText("text_REBEL_BRIBE_TEXT_3"),
  eventText("text_REBEL_BRIBE_TEXT_4"),
];
/** The four printed bribe lines; they may share one archive line. */
const BRIBE_LINES = new Set(BRIBES).size;

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "REBEL_CHECKPOINT";
  b.name = "Rebel checkpoint";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Rebel checkpoint");
}

function bribeId(g: Game): string {
  const id = g.event?.choices.find((c) => c.id.startsWith("q:rebel-checkpoint:bribe:"))?.id;
  assert.ok(id);
  return id;
}

describe("Rebel checkpoint", () => {
  it("shows one of four intros, attacks a Rebel ship, and hiding does nothing", () => {
    const intros = new Set<string>();
    const hides = new Set<string>();
    for (let seed = 1; seed <= 40 && (intros.size < 1 || hides.size < 4); seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      const intro = INTROS.find((s) => body.includes(s));
      assert.ok(intro, body);
      intros.add(intro);
      const hide = g.event?.choices.find((c) => c.id === "c:rebel-checkpoint:1")?.label ?? "";
      assert.ok(HIDES.includes(hide), hide);
      hides.add(hide);
      const cost = Number(bribeId(g).split(":").at(-1));
      assert.ok(cost >= 10 && cost <= 15);
    }
    assert.equal(intros.size, 1);
    assert.equal(hides.size, 4);

    const attack = createGame(2);
    open(attack);
    choose(attack, "c:rebel-checkpoint:0");
    assert.equal(attack.phase, "combat");
    assert.equal(attack.enemy?.faction, "rebel");
    assert.equal(attack.enemy?.pirate, false);
    assert.equal(attack.fightEvent, "rebel-checkpoint");
    assert.equal(pageWin(attack, "rebel-checkpoint", false), false);

    const hide = createGame(3);
    open(hide);
    const scrap = hide.scrap;
    const hull = hide.player.hull;
    choose(hide, "c:rebel-checkpoint:1");
    assert.notEqual(hide.phase, "combat");
    assert.equal(hide.scrap, scrap);
    assert.equal(hide.player.hull, hull);
  });

  it("a 10-15 scrap bribe then contacting the civilians pays low scrap, low scrap with resources, nothing, or a Rebel fight", () => {
    const poor = createGame(4);
    open(poor);
    poor.scrap = 9;
    assert.equal(
      choiceDisabled(poor, bribeId(poor)),
      `Need ${bribeId(poor).split(":").at(-1)} scrap`,
    );

    const texts = new Set<string>();
    const ends = new Set<string>();
    for (let seed = 1; seed <= 80 && (texts.size < BRIBE_LINES || ends.size < 4); seed++) {
      const g = createGame(seed);
      open(g);
      g.scrap = 40;
      const id = bribeId(g);
      const cost = Number(id.split(":").at(-1));
      assert.equal(choiceDisabled(g, id), null);
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      choose(g, id);
      assert.equal(g.scrap, 40 - cost);
      assert.notEqual(g.phase, "combat");
      const body = g.event?.body ?? "";
      const text = BRIBES.find((s) => body.includes(s));
      assert.ok(text, body);
      texts.add(text);
      choose(g, "q:rebel-checkpoint:contact");
      const fighting =
        g.enemy != null && g.event?.choices.some((c) => c.id === "ship-resume") === true;
      if (fighting) {
        const lead = eventText("event_REBEL_BRIBE_RESULT_4_text");
        assert.ok((g.event?.body ?? "").includes(lead));
        assert.equal(g.log.includes(lead), false);
        choose(g, "ship-resume");
        assert.equal(g.phase, "combat");
        assert.equal(g.enemy?.faction, "rebel");
        assert.equal(g.enemy?.pirate, false);
        assert.equal(g.fightEvent, "rebel-checkpoint");
        ends.add("fight");
        continue;
      }
      const paid = g.event?.body ?? "";
      if (paid.includes("Nothing happens")) {
        assert.equal(g.scrap, 40 - cost);
        assert.equal(g.fuel, fuel);
        assert.equal(g.missiles, missiles);
        assert.equal(g.player.parts, parts);
        ends.add("nothing");
        continue;
      }
      const gained = g.scrap - (40 - cost);
      assert.ok(gained >= 7 && gained <= 10, String(gained));
      const resources = g.fuel !== fuel || g.missiles !== missiles || g.player.parts !== parts;
      if (resources) {
        assert.ok(paid.includes(eventText("event_REBEL_BRIBE_RESULT_3_text")), paid);
        assert.equal(resources, true);
        ends.add("standard");
      } else {
        assert.ok(paid.includes(eventText("event_REBEL_BRIBE_RESULT_2_text")), paid);
        ends.add("scrap");
      }
    }
    assert.equal(texts.size, BRIBE_LINES);
    assert.equal(ends.size, 4);
  });
});
