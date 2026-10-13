import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choose, commitJump, createGame } from "../sim.ts";
import type { Game } from "../types.ts";
import { citedEvent } from "./cited-events.ts";

const INTROS = [
  "A Mantis military ship appears on local radar alongside the remains of a human freighter. Prepare for a hostile encounter!",
  `A Mantis military scout hails your ship. "Foolish alien! Your kind has stifled our greatness for too long! You will rue the day you backed the Federation!"`,
  `A small Mantis cruiser is broadcasting a repeating message on a wide-band frequency, "All non-Mantis ships that enter our territory are forfeit. Lower your shields and surrender if you value your lives."`,
  "You detect a small military outpost and a few freighters nearby. This mineral rich planet in an isolated location would be perfect for an illegal Mantis mining operation. As you consider your options, a ship launches from the outpost. Prepare for a fight.",
  "You discover yet another unlicensed and uncharted Mantis colony. They certainly waste no time expanding their claims. A Mantis ship moves to intercept you before you can jump away.",
  "A Mantis military scout seems to have just finished a salvage op on a nearby wreck. They have no time to waste with warnings and appear to wish to fight.",
  `A small military craft hails you and a Mantis captain appears on your receiver. "All local human colonies have been punished for the Federation's transgressions. Submit to processing."`,
  "A nearby Mantis ship begins aggressive maneuvers. You prepare for the worst.",
  "A stream of clicks and gurgling comes on the comm from a hostile Mantis scout. The universal translator might be on the blink, but his intent is obvious.",
  "The Mantis ship is pleased to see you, and fires up its weapon systems.",
  "You recognize the outline of a Mantis ship against the blackness. Engage!",
  "Something red looms. It's the Mantis.",
  `A Mantis vessel hails you. "This hail is merely a distraction!" You notice their shields and weapons have come online.`,
  "You notice a flurry of laser fire glance by the port window. The Mantis are upon you.",
  `The Mantis hail you. Their captain says, "I claim this vessel for my clan. Good hunting!"`,
  "A Mantis female comes on the vidscreen. The females don't make it to authority unless they're particularly vicious. You power the weapons.",
  "A Mantis ship with the markings of a warrior tribe breaks position and attacks!",
  `A Mantis ship hails: "Ah! Fine prey. Fine prey! We honor you with our most eviscerating arsenal!" You sense a cloud to this silver lining and power the weapons.`,
  "Children on Earth are told terrible tales of the blood red Mantis invasion ships - much like the one bearing down on you now - which once threatened the planet. You order weapons free!",
  `A youthful-looking Mantis captain hails. "You, prey, must know. Your death, Kaaazthwak's final kill before maturity. Kaaazthwak pay respects." Seems respects in Mantis culture are paid with lasers.`,
];

function open(g: Game) {
  const b = g.beacons.find((x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss");
  assert.ok(b);
  b.flag = "cited:mantis-fight";
  b.name = "Mantis fight";
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
  assert.equal(g.event?.title, "Mantis fight");
}

describe("Mantis fight", () => {
  it("shows one of the twenty printed intros, then fights a Mantis ship", () => {
    assert.equal(INTROS.length, 20);
    assert.equal(new Set(INTROS).size, 20);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400 && seen.size < INTROS.length; seed++) {
      const g = createGame(seed);
      open(g);
      const body = g.event?.body ?? "";
      assert.ok(INTROS.includes(body), body);
      assert.ok(g.event?.choices.some((c) => c.id === "c:mantis-fight:0"));
      seen.add(body);
    }
    assert.equal(seen.size, INTROS.length);

    const g = createGame(1);
    const before = g.crew.filter((c) => c.side === "player").length;
    open(g);
    choose(g, "c:mantis-fight:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight");
    assert.equal(g.crew.filter((c) => c.side === "player").length, before);
    assert.equal(g.scrap, 10);
  });

  it("starts the Mantis ship on arrival and leaves no button", () => {
    // The page has no choice. One of the twenty printed intros, then "Fight a Mantis ship."
    const g = createGame(1);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "cited:mantis-fight";
    dest.name = "Mantis fight";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    assert.equal(g.event, null);
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    assert.equal(g.enemy?.pirate, false);
    assert.equal(g.fightEvent, "mantis-fight");
    assert.equal(g.flare, false);
    assert.equal(g.fleet, 1);
    assert.ok(INTROS.some((line) => g.log.includes(line)));
  });
});
