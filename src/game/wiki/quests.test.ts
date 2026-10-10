import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choiceDisabled, choose, chooseSector, commitJump, createGame, step } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { EXTRA_EVENTS as SURRENDER_PAGES } from "./cited-events-surrender.ts";
import { citedEvent } from "./cited-events.ts";
import { addQuest, QUEST_ADDED, QUEST_CANCELLED, QUEST_NEXT, QUESTS } from "./quests.ts";
import { ACCEPT_ID } from "./surrender.ts";

function here(g: Game): Beacon {
  return g.beacons.find((b) => b.id === g.here)!;
}

/** Open a cited card (by page title) on a middle beacon, the way stampCitedEvents flags one. */
function atCited(g: Game, sector: string, dest: string, ev = citedFlag(dest)): Game {
  g.sectorName = sector;
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
  return "cited:" + dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  if (g.enemy) delete g.enemy.kits.cradle;
  for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

function choiceIds(g: Game) {
  return g.event!.choices.map((c) => c.id);
}

describe("Beacons, Quest (marker) beacon: placement", () => {
  it("adds the marker two or more columns to the right, never on a store, exit, nebula, or visited beacon", () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = createGame(seed);
      assert.equal(addQuest(g, "escort"), QUEST_ADDED);
      const [b] = questBeacons(g);
      assert.ok(b);
      assert.ok(b.col >= here(g).col + 2);
      assert.equal(b.kind, "event");
      assert.equal(b.flag, "quest:escort");
      assert.equal(b.name, QUESTS.escort.title);
      assert.equal(b.resolved, false);
    }
  });

  it("prefers a beacon-mix quest slot (an unflagged event beacon)", () => {
    const g = createGame(4);
    for (const b of g.beacons) if (b.col >= 2 && b.kind !== "exit") { b.kind = "hostile"; b.flag = ""; }
    const slot = g.beacons.find((b) => b.col === 3)!;
    slot.kind = "event";
    addQuest(g, "escort");
    assert.equal(questBeacons(g)[0].id, slot.id);
  });

  it("pushes to the next sector near the exit, and places it whichever sector is chosen", () => {
    const g = createGame(7);
    const late = g.beacons.find((b) => b.col === 5)!;
    g.here = late.id;
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
    g.fleet = b.col + 1;
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
      ["Civilian Sector", "Escort civilians FTL haywire", "c:escort-civilians-ftl-haywire:0", "escort"],
      ["Civilian Sector", "Space station under construction", "c:space-station-under-construction:0", "space-station"],
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
    const g = atCited(createGame(5), "Mantis Controlled Sector", "Mantis ship-collectors");
    choose(g, "c:mantis-ship-collectors:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").every((c) => c.kin === "blade" && c.name === "Mantis"));
    assert.deepEqual([g.enemyEscape!.mode, g.enemyEscape!.chance, g.enemyEscape!.threshold, g.enemyEscape!.seconds], ["hull", 100, 50, 5]);
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
    assert.ok(g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").every((c) => c.kin === "blade" && c.name === "Mantis"));
    assert.equal(g.enemySurrender!.chance, 100);
    assert.equal(g.enemyEscape!.threshold, 60);
    winByCrew(g);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("You find an intact weapon"));
  });

  it("Rebel defector: reject -> the cache offer -> reluctant accept can add the cache marker", () => {
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
        assert.ok(g.crew.some((c) => c.side === "player" && c.kin === "plain"));
      }
    }
    assert.ok(found);
  });

  it("Rebel ship attacking Federation loyalists: medium reward, then 'Contact the Federation ship'", () => {
    const g = atCited(createGame(2), "Civilian Sector", "Rebel ship attacking Federation loyalists");
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
    const ev = SURRENDER_PAGES.find((e) => e.dest === "Slug comm tapping")!;
    assert.deepEqual(ev.sectors, ["Slug Controlled Nebula", "Slug Home Nebula"]);
    const g = atCited(createGame(8), "Slug Home Nebula", "Slug comm tapping");
    choose(g, "c:slug-comm-tapping:0");
    assert.ok(g.event!.body.includes(QUEST_ADDED));
    choose(g, "ack");
    const [b] = questBeacons(g, "slug-pirate-trap");
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
    const g = atCited(createGame(6), "Engi Homeworlds", "Engi fleet discussion");
    for (const c of g.crew) if (c.side === "player") c.kin = "plain";
    assert.equal(choiceDisabled(g, "c:engi-fleet-discussion:2"), "Needs an Engi crewmember");
    g.crew.find((c) => c.side === "player")!.kin = "shell";
    assert.equal(choiceDisabled(g, "c:engi-fleet-discussion:2"), null);
    choose(g, "c:engi-fleet-discussion:2");
    choose(g, "q:engi-fleet:offer");
    assert.equal(questBeacons(g, "engi-real").length + (g.questsNext ?? []).filter((q) => q === "engi-real").length, 1);
    assert.equal(questBeacons(g, "engi-fake").length + (g.questsNext ?? []).filter((q) => q === "engi-fake").length, 1);
    assert.equal(g.event!.choices[0].label, "Agree.");
    choose(g, "ack");
    assert.equal(g.phase, "map");
  });

  it("real marker: runs from the start (40 s); crew killed -> high reward and the final marker; final -> Victory", () => {
    const g = createGame(12);
    g.sector = 4;
    addQuest(g, "engi-real");
    jumpTo(g, questBeacons(g, "engi-real")[0]);
    choose(g, "q:engi-real:fight");
    assert.deepEqual([g.enemyEscape!.mode, g.enemyEscape!.running, g.enemyEscape!.seconds], ["start", true, 40]);
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
    assert.ok(g.crew.filter((c) => c.side === "enemy").every((c) => c.kin === "plain"));
    winByHull(g);
    assert.deepEqual(choiceIds(g), ["q:engi-victory:ask"]);
    choose(g, "q:engi-victory:ask");
    g.augments = [];
    const hull = (g.player.hull = 5);
    choose(g, "q:engi-victory:transmit");
    assert.ok(g.augments.includes("casing"));
    assert.equal(g.player.hull, Math.min(g.player.hullMax, hull + 20));
  });

  it("real marker escaping fails the quest; fake marker surrender -> 'Let them go.' ends the fight with nothing", () => {
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
    const g = createGame(15);
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
    choose(g, "ack");
    jumpTo(g, b);
    for (const c of g.crew) if (c.side === "player") c.kin = "gel";
    choose(g, "q:slug-platform:tail");
    choose(g, "q:slug-platform:slug");
    choose(g, "q:slug-platform:interceptor");
    assert.equal(g.enemyEscape!.seconds, 35);
    g.augments = [];
    winByHull(g);
    assert.ok(g.augments.includes("gel"));
  });

  it("Settlement mercenary work: the space dock marker; the rescue pays medium scrap, 5 repairs, and opens a store", () => {
    let g: Game | null = null;
    for (let seed = 1; seed < 40 && !g; seed++) {
      const t = createGame(seed);
      t.sectorName = "Civilian Sector";
      const b = t.beacons.find((x) => x.col === 1)!;
      b.flag = "cited:settlement-mercenary-work";
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
    ["Slug Home Nebula", "The Black Raven", "s:the-black-raven:accept", "\"The Black Raven\" breaks apart", "The once-dreaded pirate Nights"],
    ["Zoltan Controlled Sector", "Zoltan ship asks to dock", "c:zoltan-ship-asks-to-dock:0", "While you search the debris", "While you scrap their ship"],
  ];
  for (const [sector, dest, fightId, destroyed, killed] of cases) {
    it(`${dest}: the page's own text and scrap with resources replace the default salvage`, () => {
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
    const g = atCited(createGame(1), "Civilian Sector", "Settlement mercenary work");
    choose(g, "s:settlement-mercenary-work:accept");
    g.enemySurrender!.chance = 0;
    winByHull(g);
    assert.ok(g.event!.body.startsWith("With all of the would-be pirates dead"));
  });
});
