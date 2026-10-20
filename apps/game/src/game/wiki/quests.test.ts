import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, chooseSector, commitJump, createGame, step } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { EXTRA_EVENTS as SURRENDER_PAGES } from "./cited-events-surrender.ts";
import { citedEvent } from "./cited-events.ts";
import {
  addQuest,
  placeQueuedQuests,
  QUEST_ADDED,
  QUEST_CANCELLED,
  QUEST_NEXT,
  QUESTS,
} from "./quests.ts";
import { fleetToReach, jumpsBetween } from "./sector-map.ts";
import { ACCEPT_ID, joinCrew } from "./surrender.ts";
import { placeIn } from "../fixtures.ts";

function here(g: Game): Beacon {
  return g.beacons.find((b) => b.id === g.here)!;
}

/** Open a cited card (by page title) on a middle beacon, the way stampCitedEvents flags one. */
function atCited(g: Game, sector: string, dest: string, ev = citedFlag(dest)): Game {
  placeIn(g, sector);
  const b = g.beacons.find((x) => x.col === 1)!;
  b.flag = ev;
  b.kind = "event";
  b.name = dest;
  g.here = b.id;
  b.visited = true;
  g.event = citedEvent(g, b);
  assert.ok(g.event, dest);
  g.phase = "event";
  return g;
}

function citedFlag(dest: string): string {
  return (
    "cited:" +
    dest
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function questBeacons(g: Game, id?: string): Beacon[] {
  return g.beacons.filter((b) => b.quest && (!id || b.quest === id));
}

/** Jump straight to `b` (a link is added by hand) and return the card it opens. */
function jumpTo(g: Game, b: Beacon) {
  const from = here(g);
  if (!from.links.includes(b.id)) from.links.push(b.id);
  g.fuel = Math.max(g.fuel, 3);
  g.fleet = 0;
  g.phase = "map";
  g.event = null;
  commitJump(g, b.id);
}

function winByHull(g: Game) {
  g.enemy!.hull = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

function winByCrew(g: Game) {
  // Clone Bay, Overview: dead crew on a hull with a Clone Bay are cloned, so the fight would not end. Drop it.
  if (g.enemy) delete g.enemy.kits.clonebay;
  for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

function choiceIds(g: Game) {
  return g.event!.choices.map((c) => c.id);
}

describe("Beacons, Quest (marker) beacon: placement", () => {
  it("adds the marker fewer jumps away than the fleet needs to take it, never on a visited beacon (xftl AddQuest)", () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = createGame(seed);
      assert.equal(addQuest(g, "escort"), QUEST_ADDED);
      const [b] = questBeacons(g);
      assert.ok(b);
      assert.ok(jumpsBetween(g.beacons, here(g).id, b.id) < fleetToReach(g, b) - g.fleet);
      assert.equal(b.kind, "event");
      assert.equal(b.flag, "arrive-escort");
      assert.equal(b.name, QUESTS.escort.title);
      assert.equal(b.resolved, false);
    }
  });

  it("prefers a beacon-mix quest slot (an unflagged event beacon)", () => {
    const g = createGame(4);
    for (const b of g.beacons)
      if (b.kind !== "start" && b.kind !== "exit") {
        b.kind = "hostile";
        b.flag = "";
      }
    const slot = g.beacons.find((b) => b.col === 3)!;
    slot.kind = "event";
    addQuest(g, "escort");
    assert.equal(questBeacons(g)[0].id, slot.id);
  });

  it("pushes to the next sector near the exit, and places it whichever sector is chosen", () => {
    const g = createGame(7);
    const late = g.beacons.find((b) => b.col === 5)!;
    g.here = late.id;
    // The fleet has every beacon: nowhere left this sector.
    g.fleet = Math.max(...g.beacons.map((b) => fleetToReach(g, b)));
    assert.equal(addQuest(g, "mantis-war-camp"), QUEST_NEXT);
    assert.equal(questBeacons(g).length, 0);
    assert.deepEqual(g.questsNext, ["mantis-war-camp"]);
    g.sectorMap = true;
    const next = g.route.find((n) => n.id === g.routeHere)!.links[1];
    chooseSector(g, next);
    assert.equal(g.sector, 2);
    assert.equal(questBeacons(g, "mantis-war-camp").length, 1);
    assert.deepEqual(g.questsNext, []);
  });

  it("is cancelled when pushed out of sector 7, and never placed in sector 8", () => {
    const g = createGame(9);
    g.sector = 7;
    g.here = g.beacons.find((b) => b.col === 5)!.id;
    g.fleet = Math.max(...g.beacons.map((b) => fleetToReach(g, b)));
    assert.equal(addQuest(g, "escort"), QUEST_CANCELLED);
    assert.equal((g.questsNext ?? []).length, 0);
    g.sector = 8;
    g.here = g.beacons[0].id;
    assert.equal(addQuest(g, "escort"), QUEST_CANCELLED);
  });

  it("a marker the Rebel Fleet has overtaken is lost to the Elite fight (INFERRED)", () => {
    const g = createGame(11);
    addQuest(g, "defector-cache");
    const b = questBeacons(g)[0];
    here(g).links.push(b.id);
    g.fleet = fleetToReach(g, b);
    g.fuel = 3;
    commitJump(g, b.id);
    assert.equal(g.phase, "combat");
    assert.equal(g.pending, "dive:1");
  });
});

describe("Cited events that add a marker", () => {
  it("Escort civilians: fuel, then a marker; the escort destination pays one of the template results", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 80 && seen.size < 4; seed++) {
      const g = atCited(createGame(seed), "Civilian Sector", "Escort civilians");
      const fuel = g.fuel;
      choose(g, "c:escort-civilians:0");
      assert.ok(g.fuel > fuel && g.fuel <= fuel + 3);
      assert.equal(
        g.event!.body,
        `"Great. Take this bit of fuel as a down-payment. We'll be one step behind you, following your jump signatures. Don't want to take any risks now, do we?"\n\n${QUEST_ADDED}`,
      );
      choose(g, "ack");
      const [b] = questBeacons(g, "escort");
      jumpTo(g, b);
      assert.equal(g.phase, "event");
      const body = g.event!.body;
      if (body.includes("ambushed")) {
        seen.add("ambush");
        choose(g, "q:escort:fight");
        assert.equal(g.phase, "combat");
      } else if (body.includes("offer you a reward")) seen.add("reward");
      else if (body.includes("show you their wares")) {
        seen.add("store");
        assert.ok(body.includes("Hull repairs: 5."));
        choose(g, "q:open-store");
        assert.equal(g.phase, "store");
      } else {
        seen.add("reactor");
        assert.ok(/Reactor \d+\.|it's maxed/.test(body));
      }
    }
    assert.equal(seen.size, 4);
  });

  it("Mantis war camp, Escort FTL haywire and Space station under construction add their markers", () => {
    const pages: [string, string, string, string][] = [
      ["Civilian Sector", "Mantis war camp", "c:mantis-war-camp:0", "mantis-war-camp"],
      [
        "Civilian Sector",
        "Escort civilians FTL haywire",
        "c:escort-civilians-ftl-haywire:0",
        "escort",
      ],
      [
        "Civilian Sector",
        "Space station under construction",
        "c:space-station-under-construction:0",
        "space-station",
      ],
    ];
    for (const [sector, dest, id, quest] of pages) {
      const g = atCited(createGame(3), sector, dest);
      choose(g, id);
      assert.equal(questBeacons(g, quest).length, 1, dest);
      if (id === "c:mantis-war-camp:0") {
        assert.equal(
          g.event!.body,
          `"Thank you! If you can just give us a count on their numbers perhaps we can get the Rebels to help."\n\n${QUEST_ADDED}`,
        );
      }
      if (id === "c:space-station-under-construction:0") {
        assert.equal(
          g.event!.body,
          `"Great. Thanks for your help. I've marked their last known coordinates and sent over some supplies to help you get there."\n\n${QUEST_ADDED}`,
        );
      }
      if (id === "c:escort-civilians-ftl-haywire:0") {
        assert.equal(
          g.event!.body,
          `"Take this bit of scrap as a down-payment. We'll use your jump signatures to follow you. You're really helping us out here."\n\n${QUEST_ADDED}`,
        );
      }
    }
  });

  it("Mantis ship-collectors: the Fighter runs at 50% hull (5 s); 'After them!' adds the marker; the Bomber fight", () => {
    // Wiki citations:
    // > "Fight a Mantis Fighter with crew entirely composed of Mantis." — [[Mantis ship-collectors]]
    // > "The ship made an emergency FTL jump, but it looks like they didn't mask their signatures. You could easily follow them if you want." — [[Mantis ship-collectors]]
    // > "After them!" — [[Mantis ship-collectors]]
    // > "Forget it." — [[Mantis ship-collectors]]
    // > "You catch up with the Mantis ship that escaped before, only to see them transferring their crew into an even bigger ship!" — [[Mantis ship-collectors#Quest Marker]]
    // > "Fight a Mantis Bomber with crew entirely composed of Mantis." — [[Mantis ship-collectors#Quest Marker]]
    // > "After killing enemy crew You find an intact weapon on their now empty ship. You take as much scrap from the ships as possible." — [[Mantis ship-collectors#Quest Marker]]
    const g = atCited(createGame(5), "Mantis Controlled Sector", "Mantis ship-collectors");
    choose(g, "c:mantis-ship-collectors:0");
    assert.equal(g.phase, "combat");
    assert.ok(
      g.crew
        .filter((c) => c.side === "enemy" && c.aboard === "enemy")
        .every((c) => c.kin === "mantis" && c.name === "Mantis"),
    );
    assert.deepEqual(
      [
        g.enemyEscape!.mode,
        g.enemyEscape!.chance,
        g.enemyEscape!.threshold,
        g.enemyEscape!.seconds,
      ],
      ["hull", 100, 50, 5],
    );
    g.enemyEscape!.running = true;
    g.enemyFlee = 1;
    step(g, 1 / 30);
    assert.equal(g.phase, "event");
    assert.deepEqual(choiceIds(g), ["q:mantis-collectors:follow", "q:mantis-collectors:forget"]);
    choose(g, "q:mantis-collectors:follow");
    choose(g, "ack");
    const [b] = questBeacons(g, "mantis-chase");
    jumpTo(g, b);
    choose(g, "q:mantis-chase:fight");
    assert.equal(g.enemy!.faction, "mantis");
    assert.ok(
      g.crew
        .filter((c) => c.side === "enemy" && c.aboard === "enemy")
        .every((c) => c.kin === "mantis" && c.name === "Mantis"),
    );
    assert.equal(g.enemySurrender!.chance, 100);
    assert.equal(g.enemyEscape!.threshold, 60);
    winByCrew(g);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("You find an intact weapon"));
  });

  it("Rebel defector: reject -> the cache offer -> reluctant accept can add the cache marker", () => {
    // Wiki citations:
    // > "He offers to lead you to a secret cache of scrap nearby if you let him join your crew." — [[Rebel defector]]
    // > "Reluctantly accept his proposal and fight the Rebel ship." — [[Rebel defector]]
    // > "You receive a Human crewmember and a quest marker is added to your map; you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    let found = false;
    for (let seed = 1; seed < 120 && !found; seed++) {
      const g = atCited(createGame(seed), "Rebel Controlled Sector", "Rebel defector");
      choose(g, "c:rebel-defector:1");
      if (g.phase !== "event") {
        assert.equal(g.phase, "combat");
        continue;
      }
      choose(g, "q:defector:reluctant");
      if (questBeacons(g, "defector-cache").length) {
        found = true;
        assert.equal(g.phase, "combat");
        assert.ok(g.crew.some((c) => c.side === "player" && c.kin === "human"));
      }
    }
    assert.ok(found);
  });

  it("Rebel ship attacking Federation loyalists: medium reward, then 'Contact the Federation ship'", () => {
    const g = atCited(
      createGame(2),
      "Civilian Sector",
      "Rebel ship attacking Federation loyalists",
    );
    choose(g, "c:rebel-ship-attacking-federation-loyalists:0");
    assert.equal(g.phase, "combat");
    winByHull(g);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("With the ship destroyed"));
    assert.deepEqual(choiceIds(g), ["q:loyalists:contact"]);
  });
});

describe("Slug comm tapping", () => {
  it("is a Slug nebula card whose tap adds the marker; engaging the pirate offers 'Let the pirate escape' for high scrap", () => {
    // Wiki citations:
    // > "Tap their comm frequency." — [[Slug comm tapping]]
    // > "A quest marker is added to your map." — [[Slug comm tapping]]
    // > "Engage the pirate." — [[Slug comm tapping#Quest Marker]]
    // > "Let the pirate escape and go after the Slugman ship." — [[Slug comm tapping#Quest Marker]]
    // > "The pirate's too badly damaged to pursue you, and you catch up to the Slugs before they jump. \"Ah, of courssse, we would never leave without providing the agreed upon ssspoils.\" They transfer over a decent chunk of the profits and set off." — [[Slug comm tapping#Quest Marker]]
    // > "You receive high scrap." — [[Slug comm tapping#Quest Marker]]
    const ev = SURRENDER_PAGES.find((e) => e.dest === "Slug comm tapping")!;
    assert.deepEqual(ev.sectors, ["Slug Controlled Nebula", "Slug Home Nebula"]);
    const g = atCited(createGame(8), "Slug Home Nebula", "Slug comm tapping");
    choose(g, "c:slug-comm-tapping:0");
    assert.ok(g.event!.body.includes(QUEST_ADDED));
    choose(g, "ack");
    const [b] = questBeacons(g, "slug-pirate-trap");
    assert.equal(b.kind, "nebula");
    jumpTo(g, b);
    assert.deepEqual(choiceIds(g), ["q:slug-trap:engage", "q:slug-trap:cache"]);
    choose(g, "q:slug-trap:engage");
    assert.ok(g.enemy!.pirate);
    assert.equal(g.enemySurrender!.chance, 100);
    g.enemy!.weapons = [];
    g.enemy!.hull = Math.max(1, Math.floor(g.enemy!.hullMax * 0.25));
    for (let i = 0; i < 5 && g.phase === "combat"; i++) step(g, 1 / 30);
    assert.equal(g.event!.choices[0].label, "Let the pirate escape and go after the Slugman ship.");
    const scrap = g.scrap;
    choose(g, ACCEPT_ID);
    assert.equal(g.phase, "reward");
    assert.ok(g.reward!.note.startsWith("The pirate's too badly damaged"));
    assert.ok(g.scrap > scrap);
    assert.equal(g.reward!.res?.fuel ?? 0, 0);
  });

  it("Head for the cache: no surrender; destroyed pays low scrap with resources", () => {
    // Wiki citations:
    // > "Head for the cache." — [[Slug comm tapping#Quest Marker]]
    // > "With the pirate taken care of, you search again for the cache he was protecting, but it's lost in the clouds. You console yourself with the salvage from the well-armed pirate ship." — [[Slug comm tapping#Quest Marker]]
    // > "You receive low scrap with resources." — [[Slug comm tapping#Quest Marker]]
    const g = atCited(createGame(8), "Slug Home Nebula", "Slug comm tapping");
    choose(g, "c:slug-comm-tapping:0");
    choose(g, "ack");
    jumpTo(g, questBeacons(g)[0]);
    choose(g, "q:slug-trap:cache");
    assert.equal(g.enemySurrender!.chance, 0);
    winByHull(g);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("With the pirate taken care of"));
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });
});

describe("Engi fleet discussion", () => {
  it("the Engi Crew blue option needs an Engi crewmember; it adds the real and the fake markers", () => {
    // Wiki citations:
    // > "(Engi Crew) Have your Engi crewmember contact them." — [[Engi fleet discussion]]
    // > "Offer your help." — [[Engi fleet discussion]]
    // > "A quest marker is added to your map." — [[Engi fleet discussion]]
    // > "A second quest marker is added to your map." — [[Engi fleet discussion]]
    const g = atCited(createGame(6), "Engi Homeworlds", "Engi fleet discussion");
    for (const c of g.crew) if (c.side === "player") c.kin = "human";
    assert.equal(choiceDisabled(g, "c:engi-fleet-discussion:2"), "Needs an Engi crewmember");
    g.crew.find((c) => c.side === "player")!.kin = "engi";
    assert.equal(choiceDisabled(g, "c:engi-fleet-discussion:2"), null);
    choose(g, "c:engi-fleet-discussion:2");
    choose(g, "q:engi-fleet:offer");
    assert.equal(
      questBeacons(g, "engi-real").length +
        (g.questsNext ?? []).filter((q) => q === "engi-real").length,
      1,
    );
    assert.equal(
      questBeacons(g, "engi-fake").length +
        (g.questsNext ?? []).filter((q) => q === "engi-fake").length,
      1,
    );
    assert.equal(g.event!.choices[0].label, "Agree.");
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("real marker: runs from the start (40 s); crew killed -> high reward and the final marker; final -> Victory", () => {
    // Wiki citations:
    // > "When the ship wants to escape As soon as they see you they power up their engines to jump away. Stop them!" — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "Once their crew is dead you scan the log for information regarding the envoy. You're in luck! It seems ships matching the thieves' description passed through here not too long ago. You strip the ship and prepare to pursue them." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "You receive high scrap with resources and a final quest marker is added to your map." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "Fight the Mantis Ship controlled by Humans." — [[Engi fleet discussion#Final Quest Marker]]
    // > "You unlock the Stealth Cruiser; you receive Titanium System Casing augmentation, high scrap with resources and your ship receives 20 repairs." — [[Engi fleet discussion#Victory]]
    const g = createGame(12);
    g.sector = 4;
    addQuest(g, "engi-real");
    jumpTo(g, questBeacons(g, "engi-real")[0]);
    choose(g, "q:engi-real:fight");
    assert.deepEqual(
      [g.enemyEscape!.mode, g.enemyEscape!.running, g.enemyEscape!.seconds],
      ["start", true, 40],
    );
    assert.equal(g.enemySurrender!.threshold, 50);
    winByCrew(g);
    assert.ok(g.event!.body.startsWith("Once their crew is dead"));
    choose(g, "ack");
    if (!questBeacons(g, "engi-final").length) {
      // Too close to the exit: pushed to the next sector. Place it from the start beacon for the rest of the check.
      assert.deepEqual(g.questsNext, ["engi-final"]);
      g.questsNext = [];
      g.here = g.beacons[0].id;
      addQuest(g, "engi-final");
    }
    const final = questBeacons(g, "engi-final")[0];
    assert.ok(final);
    jumpTo(g, final);
    choose(g, "q:engi-final:fight");
    assert.equal(g.enemySurrender!.chance, 0);
    assert.ok(g.crew.filter((c) => c.side === "enemy").every((c) => c.kin === "human"));
    winByHull(g);
    assert.deepEqual(choiceIds(g), ["q:engi-victory:ask"]);
    choose(g, "q:engi-victory:ask");
    g.augments = [];
    const hull = (g.player.hull = 5);
    choose(g, "q:engi-victory:transmit");
    assert.ok(g.augments.includes("SYSTEM_CASING"));
    assert.equal(g.player.hull, Math.min(g.player.hullMax, hull + 20));
  });

  it("real marker escaping fails the quest; fake marker surrender -> 'Let them go.' ends the fight with nothing", () => {
    // Wiki citations:
    // > "With the ship gone, you search through the abandoned base for any signs of their destination but find none." — [[Engi fleet discussion#First Quest Marker (Real)]]
    // > "Let them go." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    // > "The ship turns neutral." — [[Engi fleet discussion#Second Quest Marker (Fake)]]
    const g = createGame(13);
    addQuest(g, "engi-real");
    const real = questBeacons(g, "engi-real")[0];
    jumpTo(g, real);
    choose(g, "q:engi-real:fight");
    g.enemyFlee = 1;
    step(g, 1 / 30);
    assert.ok(g.event!.body.startsWith("With the ship gone, you search"));
    assert.ok(real.resolved);
    choose(g, "ack");

    const h = createGame(14);
    addQuest(h, "engi-fake");
    jumpTo(h, questBeacons(h, "engi-fake")[0]);
    choose(h, "q:engi-fake:fight");
    h.enemy!.weapons = [];
    h.enemyEscape!.running = false;
    h.enemy!.hull = Math.max(1, Math.floor(h.enemy!.hullMax * 0.3));
    for (let i = 0; i < 5 && h.phase === "combat"; i++) step(h, 1 / 30);
    assert.deepEqual(choiceIds(h), [ACCEPT_ID]);
    choose(h, ACCEPT_ID);
    assert.deepEqual(choiceIds(h), ["q:engi-fake:go", "q:engi-fake:attack"]);
    const scrap = h.scrap;
    choose(h, "q:engi-fake:go");
    assert.equal(h.enemy, null);
    assert.equal(h.scrap, scrap);
  });
});

describe("Other surrender pages with a marker", () => {
  it("Slug Home Nebula surrender: 'we want information' adds the platform marker; the interceptor pays Slug Repair Gel", () => {
    // Wiki citations:
    // > "We don't want the weapon, we want information." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "A quest marker is added to your map." — [[Slug Home Nebula surrender#When the Slug ship surrenders]]
    // > "Note: this event occurs at a regular quest marker beacon, but when you arrive there will be a nebula environment." — [[Slug Home Nebula surrender#Quest Marker]]
    // > "This ship starts to escape with 35 seconds countdown timer. It is always a Slug Interceptor class." — [[Slug Home Nebula surrender#Fight the interceptor]]
    // > "You unlock the Slug Cruiser; receive high scrap with resources and Slug Repair Gel augmentation." — [[Slug Home Nebula surrender#Fight the interceptor]]
    const g = createGame(15);
    g.sectorId = "SLUG_HOME";
    g.sectorName = "Slug Home Nebula";
    g.phase = "map";
    g.here = g.beacons.find((b) => b.col === 1)!.id;
    g.event = null;
    // The cited fight, as its card starts it.
    choose(g, "c:slug-home-nebula-surrender:0");
    assert.equal(g.phase, "combat");
    g.enemy!.weapons = [];
    g.enemyEscape!.mode = "never";
    g.enemy!.hull = Math.max(1, Math.floor(g.enemy!.hullMax * 0.3));
    for (let i = 0; i < 5 && g.phase === "combat"; i++) step(g, 1 / 30);
    assert.ok(choiceIds(g).includes("s:slug-home-nebula-surrender:info"));
    choose(g, "s:slug-home-nebula-surrender:info");
    assert.equal(g.enemy, null);
    const [b] = questBeacons(g, "slug-platform");
    assert.ok(b);
    assert.equal(b.kind, "nebula");
    choose(g, "ack");
    jumpTo(g, b);
    for (const c of g.crew) if (c.side === "player") c.kin = "slug";
    choose(g, "q:slug-platform:tail");
    choose(g, "q:slug-platform:slug");
    choose(g, "q:slug-platform:interceptor");
    assert.equal(g.enemyEscape!.seconds, 35);
    g.augments = [];
    winByHull(g);
    assert.ok(g.augments.includes("SLUG_GEL"));
  });

  it("Settlement mercenary work: the space dock marker; the rescue pays medium scrap, 5 repairs, and opens a store", () => {
    // Wiki citations:
    // > "Agree to rescue the store." — [[Settlement mercenary work]]
    // > "A quest marker is added to your map." — [[Settlement mercenary work]]
    // > "Engage the Rebel and rescue the space dock." — [[Settlement mercenary work#Quest marker]]
    // > "The \"SQUAT_STORE_RESCUE\" ship assaulting the space dock doesn't surrender, nor tries to escape." — [[Settlement mercenary work#Trivia]]
    // > "The outpost hails you, \"Thank you! I don't know what we did to anger the Rebels, but they were ready to kill us. I'll show you our goods and patch up your hull.\"" — [[Settlement mercenary work#Quest marker]]
    // > "You receive medium scrap, your ship receives 5 repairs and a store opens." — [[Settlement mercenary work#Quest marker]]
    let g: Game | null = null;
    for (let seed = 1; seed < 40 && !g; seed++) {
      const t = createGame(seed);
      t.sectorId = "CIVILIAN_SECTOR";
      t.sectorName = "Civilian Sector";
      const b = t.beacons.find((x) => x.col === 1)!;
      b.flag = "MERCENARY_WORK_START";
      b.kind = "event";
      b.name = "Settlement mercenary work";
      t.here = b.id;
      t.event = citedEvent(t, b);
      t.phase = "event";
      choose(t, "c:settlement-mercenary-work:0");
      if (choiceIds(t).includes("s:settlement-mercenary-work:dock")) g = t;
    }
    assert.ok(g);
    choose(g, "s:settlement-mercenary-work:dock");
    assert.ok(g.event!.body.includes(QUEST_ADDED));
    choose(g, "ack");
    jumpTo(g, questBeacons(g, "store-rescue")[0]);
    choose(g, "q:store-rescue:engage");
    assert.equal(g.enemySurrender!.chance, 0);
    assert.equal(g.enemyEscape!.mode, "never");
    g.player.hull = 10;
    winByHull(g);
    assert.ok(g.event!.body.includes("Hull repairs: 5."));
    choose(g, "q:open-store");
    assert.equal(g.phase, "store");
  });
});

describe("Page win rewards (destroyed / crew killed)", () => {
  const cases: [string, string, string, string, string][] = [
    [
      "Slug Home Nebula",
      "The Black Raven",
      "s:the-black-raven:accept",
      '"The Black Raven" breaks apart',
      "The once-dreaded pirate Nights",
    ],
    [
      "Zoltan Controlled Sector",
      "Zoltan ship asks to dock",
      "c:zoltan-ship-asks-to-dock:0",
      "While you search the debris",
      "While you scrap their ship",
    ],
  ];
  for (const [sector, dest, fightId, destroyed, killed] of cases) {
    it(`${dest}: the page's own text and scrap with resources replace the default salvage`, () => {
      // Wiki citations:
      // > "\"The Black Raven\" breaks apart and you salvage the remains." — [[The Black Raven#Fighting the Black Raven]]
      // > "You receive medium scrap with resources." — [[The Black Raven#Fighting the Black Raven]]
      // > "The once-dreaded pirate Nights has been killed and you proceed to loot his ship." — [[The Black Raven#Fighting the Black Raven]]
      // > "You receive high scrap with resources." — [[The Black Raven#Fighting the Black Raven]]
      // > "While you search the debris, you wonder what it was that could have provoked them to act so irrationally." — [[Zoltan ship asks to dock]]
      // > "You receive low scrap with resources." — [[Zoltan ship asks to dock]]
      // > "While you scrap their ship, you wonder what it was that could have provoked them to act so irrationally." — [[Zoltan ship asks to dock]]
      // > "You receive medium scrap with resources." — [[Zoltan ship asks to dock]]
      for (const how of ["hull", "crew"] as const) {
        let g: Game | null = null;
        for (let seed = 1; seed < 40 && !g; seed++) {
          const t = atCited(createGame(seed), sector, dest);
          if (dest === "The Black Raven") choose(t, "c:the-black-raven:0");
          choose(t, fightId);
          if (t.phase === "combat") g = t;
        }
        assert.ok(g);
        g.enemySurrender!.chance = 0;
        const scrap = g.scrap;
        if (how === "hull") winByHull(g);
        else winByCrew(g);
        assert.equal(g.phase, "event", `${dest} ${how}`);
        assert.ok(g.event!.body.startsWith(how === "hull" ? destroyed : killed), g.event!.body);
        assert.ok(g.scrap > scrap);
        assert.equal(g.reward, null);
      }
    });
  }

  it("Settlement mercenary work, pirates dead: low scrap with resources", () => {
    // Wiki citations:
    // > "After destroying enemy ship or after killing enemy crew With all of the would-be pirates dead, you think it best not to return to the settlement... You prepare to jump." — [[Settlement mercenary work]]
    // > "You receive low scrap with resources." — [[Settlement mercenary work]]
    const g = atCited(createGame(1), "Civilian Sector", "Settlement mercenary work");
    choose(g, "s:settlement-mercenary-work:accept");
    g.enemySurrender!.chance = 0;
    winByHull(g);
    assert.ok(g.event!.body.startsWith("With all of the would-be pirates dead"));
  });
});

function gun(defId: string) {
  return { uid: defId, defId, charge: 0, enabled: true, autofire: false, target: null };
}

describe("Rebel defector, Accept his proposal", () => {
  it("rolls join most often, then deceive, the trigger, and the evisceration, and adds no marker", () => {
    // Wiki citations:
    // > "3× Relieved and light-headed, your new crew member gets to work as the Rebel ship attacks." — [[Rebel defector]]
    // > "You receive a Human crewmember and fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage, 1 damage to engines; Rebel Fleet pursuit is doubled, and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "Your ship takes 3 hull damage; 2 human boarders beam aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    // > "You lose a crewmember; 1 human boarder beams aboard your ship and you fight a Rebel ship (default rewards)." — [[Rebel defector]]
    const seen = { join: 0, deceive: 0, trigger: 0, evisc: 0 };
    for (let seed = 1; seed <= 90; seed++) {
      const g = atCited(createGame(seed), "Rebel Controlled Sector", "Rebel defector");
      g.player.hull = g.player.hullMax;
      g.fleet = 4;
      const hull = g.player.hull;
      const engines = g.player.systems.engines!.damage;
      const pilot = g.player.systems.pilot!.damage;
      const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0).length;
      choose(g, "c:rebel-defector:0");
      assert.equal(g.phase, "combat", String(seed));
      assert.equal(g.fightEvent, "rebel-defector");
      assert.equal(
        g.beacons.some((b) => b.quest),
        false,
      );
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length;
      const left = g.crew.filter((c) => c.side === "player" && c.hp > 0).length;
      const hullLost = hull - g.player.hull;
      const engineHit = g.player.systems.engines!.damage > engines;
      if (left === crew + 1 && hullLost === 0 && boarders === 0 && g.fleet === 4) seen.join++;
      else if (
        hullLost === 3 &&
        engineHit &&
        g.fleet === 8 &&
        boarders === 0 &&
        g.player.systems.pilot!.damage === pilot
      ) {
        assert.ok(g.log.some((line) => line === "Rebel Fleet pursuit is doubled."));
        seen.deceive++;
      } else if (
        hullLost === 3 &&
        !engineHit &&
        boarders === 2 &&
        g.player.systems.pilot!.damage === pilot &&
        g.fleet === 4
      )
        seen.trigger++;
      else if (hullLost === 0 && boarders === 1 && left === crew - 1) {
        assert.ok(g.log.some((line) => line.endsWith("is gone.")));
        seen.evisc++;
      } else
        assert.fail(
          `${seed} hull ${hullLost} crew ${crew}->${left} boarders ${boarders} fleet ${g.fleet}`,
        );
      assert.equal(seen.join + seen.deceive + seen.trigger + seen.evisc, seed);
    }
    assert.ok(seen.deceive > 0 && seen.trigger > 0 && seen.evisc > 0, JSON.stringify(seen));
    assert.ok(
      seen.join > seen.deceive && seen.join > seen.trigger && seen.join > seen.evisc,
      JSON.stringify(seen),
    );
  });

  it("a clone bay keeps the eviscerated crewmember, and the last living crewmember is not removed", () => {
    // Wiki citations:
    // > "The eviscerated crewmember's clone launches out of the clone bay, eager to seek revenge." — [[Rebel defector]]
    let cloned = false;
    for (let seed = 1; seed <= 80 && !cloned; seed++) {
      const g = atCited(createGame(seed), "Rebel Controlled Sector", "Rebel defector");
      g.player.kits.clonebay = {
        id: "clonebay",
        level: 1,
        power: 0,
        left: 0,
        cool: 0,
        target: null,
        on: false,
        aux: 0,
      };
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "c:rebel-defector:0");
      if (!g.log.some((line) => line.includes("clone launches"))) continue;
      cloned = true;
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew);
      assert.equal(g.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 1);
      assert.equal(g.phase, "combat");
    }
    assert.ok(cloned);

    let spared = false;
    for (let seed = 1; seed <= 80 && !spared; seed++) {
      const g = atCited(createGame(seed), "Rebel Controlled Sector", "Rebel defector");
      g.player.hull = g.player.hullMax;
      const living = g.crew.filter((c) => c.side === "player" && c.hp > 0);
      for (const c of living.slice(1)) c.hp = 0;
      const kept = living[0]!.id;
      choose(g, "c:rebel-defector:0");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length;
      if (boarders !== 1 || g.player.hull !== g.player.hullMax) continue;
      spared = true;
      assert.equal(
        g.crew.some((c) => c.id === kept && c.hp > 0),
        true,
      );
      assert.equal(g.crew.filter((c) => c.side === "player" && c.hp > 0).length, 1);
    }
    assert.ok(spared);
  });
});

describe("Space station under construction, Lanius sale", () => {
  it("pays an augmentation and high scrap, and splices the Lanius out even with a clone bay", () => {
    const g = atCited(createGame(3), "Civilian Sector", "Space station under construction");
    assert.ok(joinCrew(g, "Lanius"));
    g.player.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 0,
      left: 0,
      cool: 0,
      target: null,
      on: false,
      aux: 0,
    };
    const scrap = g.scrap;
    choose(g, "c:space-station-under-construction:2");
    assert.ok(choiceIds(g).includes("q:station:sale"));
    choose(g, "q:station:sale");
    const body = g.event!.body;
    assert.ok(body.startsWith("Once your Lanius crewmember understands"));
    const paid = Number(body.match(/Scrap: (\d+)/)?.[1]);
    assert.ok(paid >= 19 && paid <= 23, body);
    assert.equal(/Fuel:|Missiles:|Drone parts:/.test(body), false);
    assert.match(body, /fitted\.|stowed in cargo\./);
    assert.equal(g.scrap, scrap + paid);
    assert.equal(
      g.crew.some((c) => c.kin === "anaerobic"),
      false,
    );
  });

  it("pays nothing when that Lanius is the last living crewmember", () => {
    const g = atCited(createGame(4), "Civilian Sector", "Space station under construction");
    assert.ok(joinCrew(g, "Lanius"));
    for (const c of g.crew) if (c.kin !== "anaerobic") c.hp = 0;
    const scrap = g.scrap;
    const augs = g.augments.length;
    choose(g, "c:space-station-under-construction:2");
    choose(g, "q:station:sale");
    assert.equal(g.scrap, scrap);
    assert.equal(g.augments.length, augs);
    assert.equal(
      g.crew.some((c) => c.kin === "anaerobic" && c.hp > 0),
      true,
    );
  });
});

describe("Federation loyalists, Healing Burst", () => {
  it("stays visible with no missiles, then spends one and sends an engineer toward the hidden base", () => {
    let found = false;
    for (let seed = 1; seed <= 80 && !found; seed++) {
      const g = atCited(
        createGame(seed),
        "Civilian Sector",
        "Rebel ship attacking Federation loyalists",
      );
      choose(g, "c:rebel-ship-attacking-federation-loyalists:0");
      if (g.phase !== "combat") continue;
      winByHull(g);
      g.player.weapons.push(gun("BOMB_HEAL"));
      g.missiles = 0;
      choose(g, "q:loyalists:contact");
      if (!choiceIds(g).includes("q:loyalists:heal")) continue;
      found = true;
      assert.equal(choiceDisabled(g, "q:loyalists:heal"), "Need 1 missiles");
      g.missiles = 1;
      const scrap = g.scrap;
      const crew = g.crew.filter((c) => c.side === "player").length;
      choose(g, "q:loyalists:heal");
      const body = g.event!.body;
      assert.ok(body.startsWith("You launch a healing bomb"));
      assert.match(body, /Missiles: -1/);
      assert.match(body, /crewmember joins you/);
      const paid = Number(body.match(/Scrap: (\d+)/)?.[1]);
      assert.ok(paid >= 12 && paid <= 19, body);
      assert.equal(g.missiles, 0);
      assert.equal(g.scrap, scrap + paid);
      assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
      assert.ok((g.crew[g.crew.length - 1]!.skills?.engines ?? 0) > 0);
      assert.ok(body.includes(QUEST_ADDED) || body.includes(QUEST_NEXT));
    }
    assert.ok(found);
  });
});

describe("Hidden Federation Base scans", () => {
  function emptySearch(setup: (g: Game) => void): Game {
    for (let seed = 1; seed <= 80; seed++) {
      const g = createGame(seed);
      assert.ok(g.player.systems.sensors);
      setup(g);
      if (addQuest(g, "fed-base") !== QUEST_ADDED) continue;
      jumpTo(g, questBeacons(g, "fed-base")[0]!);
      if (g.event?.body.includes("yields no results")) return g;
    }
    assert.fail("no empty search");
  }

  it("offers one scan button per requirement the ship meets", () => {
    const none = emptySearch((g) => {
      g.player.systems.sensors!.level = 0;
      g.augments = g.augments.filter((id) => id !== "ADV_SCANNERS");
    });
    assert.deepEqual(choiceIds(none), ["ack"]);

    const two = emptySearch((g) => {
      g.player.systems.sensors!.level = 2;
    });
    assert.deepEqual(choiceIds(two), ["ack", "q:fed-base:scan-2"]);
    choose(two, "q:fed-base:scan-2");
    const level2 = two.event!.body;
    assert.ok(level2.startsWith("Your Advanced Sensors pick faint signatures"));
    assert.equal(
      ["Fuel:", "Missiles:", "Drone parts:"].filter((label) => level2.includes(label)).length,
      2,
    );
    const mid = Number(level2.match(/Scrap: (\d+)/)?.[1]);
    assert.ok(mid >= 12 && mid <= 19, level2);

    const three = emptySearch((g) => {
      g.player.systems.sensors!.level = 3;
      g.augments = g.augments.filter((id) => id !== "ADV_SCANNERS");
    });
    assert.deepEqual(choiceIds(three), ["ack", "q:fed-base:scan-2", "q:fed-base:scan-3"]);
    choose(three, "q:fed-base:scan-3");
    const level3 = three.event!.body;
    assert.ok(level3.startsWith("Your sensors pick faint signatures"));
    assert.match(level3, /mounted\.|stowed in cargo\./);
    assert.equal(/Fuel:|Missiles:|Drone parts:/.test(level3), false);

    const glass = emptySearch((g) => {
      g.player.systems.sensors!.level = 0;
      if (!g.augments.includes("ADV_SCANNERS")) g.augments.push("ADV_SCANNERS");
    });
    assert.deepEqual(choiceIds(glass), ["ack", "q:fed-base:scan-glass"]);

    const both = emptySearch((g) => {
      g.player.systems.sensors!.level = 3;
      if (!g.augments.includes("ADV_SCANNERS")) g.augments.push("ADV_SCANNERS");
    });
    assert.deepEqual(choiceIds(both), [
      "ack",
      "q:fed-base:scan-2",
      "q:fed-base:scan-3",
      "q:fed-base:scan-glass",
    ]);
  });
});

describe("Mantis war camp, Missile Weapon", () => {
  function arrive(defId: string): Game {
    const g = createGame(6);
    g.player.weapons = [gun(defId)];
    g.missiles = 0;
    assert.equal(addQuest(g, "mantis-war-camp"), QUEST_ADDED);
    jumpTo(g, questBeacons(g, "mantis-war-camp")[0]!);
    return g;
  }

  it("hides the button for a Hull Missile and shows it for a Leto", () => {
    const hull = arrive("MISSILES_HULL");
    assert.equal(choiceIds(hull).includes("q:war-camp:missile"), false);
    const leto = arrive("MISSILES_1");
    assert.ok(choiceIds(leto).includes("q:war-camp:missile"));
    assert.equal(choiceDisabled(leto, "q:war-camp:missile"), "Need 1 missiles");
  });
});

describe("Quest markers sit to the right of the ship", () => {
  function park(g: Game, col: number): Beacon {
    const ship = g.beacons.find((b) => b.col === col && b.kind !== "exit" && b.kind !== "start")!;
    g.here = ship.id;
    g.fleet = 0;
    g.questsNext = [];
    for (const b of g.beacons) {
      if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
      b.visited = false;
      delete b.quest;
      b.flag = "";
      b.asteroid = false;
      b.resolved = false;
      if (b.id === ship.id) continue;
      b.kind = b.col <= ship.col ? "event" : "store";
    }
    return ship;
  }

  it("refuses a beacon at or left of the ship, and a forced placement may use one", () => {
    const blocked = createGame(2);
    const ship = park(blocked, 3);
    assert.equal(addQuest(blocked, "escort"), QUEST_NEXT);
    assert.equal(questBeacons(blocked).length, 0);
    placeQueuedQuests(blocked);
    const placed = questBeacons(blocked, "escort");
    assert.equal(placed.length, 1);
    assert.ok(placed[0]!.col <= ship.col);

    const open = createGame(3);
    const here = park(open, 3);
    const right = open.beacons.find(
      (b) => b.col > here.col && b.kind !== "exit" && b.kind !== "start" && b.kind !== "boss",
    )!;
    right.kind = "event";
    right.flag = "";
    assert.equal(addQuest(open, "escort"), QUEST_ADDED);
    assert.equal(questBeacons(open, "escort")[0]!.id, right.id);
  });
});
