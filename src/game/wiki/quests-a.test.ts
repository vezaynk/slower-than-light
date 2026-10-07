import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classIdFor, pickEnemy, requestFor } from "../enemy-gen.ts";
import { choiceDisabled, choose, commitJump, createGame, dropCrystalRestart, startCombat, step } from "../sim.ts";
import type { Beacon, Game } from "../types.ts";
import { SECTOR_TYPES } from "./sectors.ts";
import { citedEvent, citedPagesFor, stampCitedEvents } from "./cited-events.ts";
import { addQuest } from "./quests.ts";
import { EXTRA_EVENTS } from "./quests-a-pages.ts";
import { markRuwenEntry } from "./ruwen-entry.ts";
import { joinCrew } from "./surrender.ts";

function here(g: Game): Beacon {
  return g.beacons.find((b) => b.id === g.here)!;
}

function atCited(g: Game, sector: string, dest: string): Game {
  g.sectorName = sector;
  const b = g.beacons.find((x) => x.col === 1)!;
  b.flag = "cited:" + dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  b.kind = "event";
  b.name = dest;
  g.here = b.id;
  b.visited = true;
  g.event = citedEvent(g, b);
  assert.ok(g.event, dest);
  g.phase = "event";
  return g;
}

function questBeacon(g: Game, id: string): Beacon | undefined {
  return g.beacons.find((b) => b.quest === id && !b.resolved);
}

function jumpTo(g: Game, b: Beacon) {
  const from = here(g);
  if (!from.links.includes(b.id)) from.links.push(b.id);
  g.fuel = Math.max(g.fuel, 3);
  g.fleet = 0;
  g.phase = "map";
  g.event = null;
  commitJump(g, b.id);
}

/** The marker `id` from the current beacon; re-placed from the start beacon if it was pushed to the next sector. */
function goToQuest(g: Game, id: string) {
  let b = questBeacon(g, id);
  if (!b) {
    g.questsNext = [];
    g.here = g.beacons[0].id;
    addQuest(g, id);
    b = questBeacon(g, id);
  }
  assert.ok(b, id);
  jumpTo(g, b);
}

function ids(g: Game) {
  return g.event!.choices.map((c) => c.id);
}

function winByHull(g: Game) {
  g.enemy!.hull = 0;
  for (let i = 0; i < 3 && g.phase === "combat"; i++) step(g, 1 / 30);
}

/** First seed (from 1) whose run of `pick` returns true. */
function seedWhere(pick: (g: Game) => boolean): Game {
  for (let seed = 1; seed < 200; seed++) {
    const g = createGame(seed);
    g.sector = 5;
    if (pick(g)) return g;
  }
  throw new Error("no seed");
}

describe("enemy-gen: a fight can ask for one ship class", () => {
  it("reads the class from the fight string, longest name first; a faction word alone names none", () => {
    assert.equal(classIdFor("Mantis Bomber"), "mantis-bomber");
    assert.equal(classIdFor("Rock Assault (Elite)"), "rock-assault-elite");
    assert.equal(classIdFor("Rock Assault"), "rock-assault");
    assert.equal(classIdFor("slug-interceptor"), "slug-interceptor");
    assert.equal(classIdFor("Mantis ship"), undefined);
    assert.equal(classIdFor("Rebel Ship"), undefined);
    assert.deepEqual(requestFor("Slug Assault pirate ship"), { faction: "slug", pirate: true, classId: "slug-assault" });
    assert.deepEqual(requestFor("Mantis ship"), { faction: "mantis", pirate: false });
  });

  it("fields the named class outside its normal sectors (Mantis Bomber in sector 2, Slug Assault in 4)", () => {
    const ctx = { sector: 2, sectorName: "Civilian Sector", difficulty: "normal" as const };
    for (let i = 0; i < 20; i++) {
      const r = () => (i + 0.5) / 20;
      assert.equal(pickEnemy(ctx, r, requestFor("Mantis Bomber")).cls.id, "mantis-bomber");
      const raven = pickEnemy({ ...ctx, sector: 4 }, r, requestFor("Slug Assault pirate ship"));
      assert.deepEqual([raven.cls.id, raven.pirate], ["slug-assault", true]);
    }
  });

  it("startCombat builds that class (quest fights: Slug Interceptor, Rock Assault (Elite))", () => {
    const g = createGame(3);
    startCombat(g, "Slug Interceptor", false, "quest-slug-interceptor");
    assert.equal(g.enemy!.classId, "slug-interceptor");
    startCombat(g, "Rock Assault (Elite)", false, "quest-rock-sun");
    assert.equal(g.enemy!.classId, "rock-assault-elite");
  });
});

describe("quest openers (quests-a)", () => {
  it("stamps the Sectors page's special lines in their homeworlds", () => {
    const flags = (name: string, seed: number) => {
      const g = createGame(seed);
      g.sector = 5;
      g.sectorName = name;
      stampCitedEvents(g);
      return g.beacons.map((b) => b.flag);
    };
    for (let seed = 1; seed <= 10; seed++) {
      assert.ok(flags("Rock Homeworlds", seed).includes("cited:ancient-device"));
      assert.ok(flags("Rock Homeworlds", seed).includes("cited:rock-war-vessel-encounter"));
      assert.ok(flags("Zoltan Homeworlds", seed).includes("cited:unarmed-zoltan-transport"));
      assert.ok(flags("Zoltan Homeworlds", seed).includes("cited:zoltan-research-facility"));
      assert.ok(flags("Zoltan Controlled Sector", seed).includes("cited:zoltan-research-facility"));
    }
    assert.ok(citedPagesFor("Rock Controlled Sector").some((e) => e.dest === "Rock bride"));
    for (const ev of EXTRA_EVENTS) ev.choices.forEach((c, i) => assert.equal(c.id, `c:${ev.slug}:${i}`));
  });

  it("Rock war vessel encounter: marker -> Rock Assault (Elite) that runs at 32 s -> got away -> shipyard unlocks the Rock Cruiser", () => {
    const g = atCited(createGame(7), "Rock Homeworlds", "Rock war vessel encounter");
    g.sector = 5;
    choose(g, "c:rock-war-vessel-encounter:0");
    choose(g, "ack");
    goToQuest(g, "rock-sun");
    assert.deepEqual(ids(g), ["qa:rock-sun:fight"]);
    choose(g, "qa:rock-sun:fight");
    assert.equal(g.enemy!.classId, "rock-assault-elite");
    assert.deepEqual([g.enemyEscape!.mode, g.enemyEscape!.running, g.enemyEscape!.seconds], ["start", true, 32]);
    assert.equal(g.enemySurrender!.chance, 0);
    g.enemyFlee = 1;
    g.enemyEscape!.seconds = 0;
    for (let i = 0; i < 5 && g.phase === "combat"; i++) step(g, 1 / 30);
    assert.equal(g.phase, "event");
    assert.ok(g.event!.body.startsWith("As they jump away"));
    choose(g, "ack");
    goToQuest(g, "rock-shipyard");
    assert.ok(g.unlocked?.includes("rock-a"));
    assert.ok(g.augments.includes("keel") || g.augments.length >= 3);
  });

  it("Rock war vessel, Sun marker destroyed: medium scrap with resources and no shipyard", () => {
    const g = createGame(8);
    g.sector = 5;
    addQuest(g, "rock-sun");
    goToQuest(g, "rock-sun");
    choose(g, "qa:rock-sun:fight");
    winByHull(g);
    assert.ok(g.event!.body.startsWith("Their ship breaks apart"));
    assert.equal(questBeacon(g, "rock-shipyard"), undefined);
  });

  it("Ancient device: the Crystal Crew option needs a Crystal crewmember; it leads to the Crystal Cruiser and Crystal Vengeance", () => {
    const g = atCited(createGame(9), "Rock Homeworlds", "Ancient device");
    g.sector = 5;
    assert.equal(choiceDisabled(g, "c:ancient-device:2"), "Needs a Crystal crewmember");
    g.crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
    assert.ok(joinCrew(g, "Crystal"));
    assert.equal(choiceDisabled(g, "c:ancient-device:2"), null);
    const fuelBefore = g.fuel;
    choose(g, "c:ancient-device:2");
    // Ancient device: the jump stays on the Rock Homeworlds sector number. The granted fuel is spent on the jump.
    assert.equal(g.sector, 5);
    assert.equal(g.sectorName, "Hidden Crystal Worlds");
    assert.equal(g.fuel, fuelBefore);
    assert.equal(g.sectorMap, false);
    assert.ok(questBeacon(g, "crystal-unlock"));
    choose(g, "ack");
    g.augments = [];
    const fuel = g.fuel;
    goToQuest(g, "crystal-unlock");
    assert.ok(g.unlocked?.includes("crystal-a"));
    assert.ok(g.augments.includes("vengeance"));
    assert.ok(g.fuel >= fuel - 1 + 2);
  });

  it("Ancient device: the exit skips the chart and can land off the Rock Homeworlds links", () => {
    const names = new Set<string>();
    let offChart = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const g = atCited(createGame(seed), "Rock Homeworlds", "Ancient device");
      g.sector = 5;
      g.crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
      assert.ok(joinCrew(g, "Crystal"));
      choose(g, "c:ancient-device:2");
      choose(g, "ack");
      const exit = g.beacons.find((b) => b.kind === "exit");
      assert.ok(exit);
      g.here = exit.id;
      g.phase = "map";
      g.event = null;
      const rock = (g.route ?? []).find((n) => n.name === "Rock Homeworlds");
      const linked = new Set(
        (rock?.links ?? [])
          .map((id) => (g.route ?? []).find((n) => n.id === id)?.name)
          .filter((name): name is string => !!name),
      );
      choose(g, "exit-leave");
      assert.equal(g.sectorMap, false);
      assert.equal(g.sector, 6);
      assert.ok(SECTOR_TYPES.some((s) => s.name === g.sectorName));
      assert.notEqual(g.sectorName, "Hidden Crystal Worlds");
      names.add(g.sectorName);
      if (!linked.has(g.sectorName)) offChart += 1;
    }
    assert.ok(names.size > 1);
    assert.ok(offChart > 0);

    const last = atCited(createGame(3), "Rock Homeworlds", "Ancient device");
    last.sector = 7;
    last.crew = last.crew.filter((c) => c.side === "player").slice(0, 3);
    assert.ok(joinCrew(last, "Crystal"));
    choose(last, "c:ancient-device:2");
    choose(last, "ack");
    const lane = last.beacons.find((b) => b.kind === "exit");
    assert.ok(lane);
    last.here = lane.id;
    last.phase = "map";
    last.event = null;
    choose(last, "exit-leave");
    assert.equal(last.sector, 8);
    assert.equal(last.sectorName, "The Last Stand");
    assert.equal(last.sectorMap, false);
  });

  it("restarting in the Hidden Crystal Worlds starts in a Civilian sector and skips the sector map", () => {
    const prev = createGame(2);
    prev.sectorName = "Hidden Crystal Worlds";
    const names = new Set<string>();
    for (let seed = 1; seed <= 16; seed++) {
      const next = createGame(seed);
      dropCrystalRestart(prev, next);
      assert.equal(next.sector, 1);
      assert.equal(next.sectorName, "Civilian Sector");
      assert.equal(next.crystalRestart, true);
      assert.equal(next.sectorMap, false);
      const exit = next.beacons.find((b) => b.kind === "exit");
      assert.ok(exit);
      next.here = exit.id;
      next.phase = "map";
      next.event = null;
      choose(next, "exit-leave");
      assert.equal(next.sectorMap, false);
      assert.equal(next.sector, 2);
      assert.equal(next.crystalRestart, false);
      assert.notEqual(next.sectorName, "Hidden Crystal Worlds");
      assert.notEqual(next.sectorName, "Civilian (Starting) Sector");
      const here = (next.route ?? []).find((n) => n.id === next.routeHere);
      assert.equal(here?.col, 1);
      names.add(next.sectorName);
    }
    assert.ok(names.size > 1);

    const plain = createGame(3);
    const fresh = createGame(4);
    dropCrystalRestart(plain, fresh);
    assert.equal(fresh.sectorName, "Civilian (Starting) Sector");
    assert.equal(fresh.crystalRestart, undefined);
    const lane = fresh.beacons.find((b) => b.kind === "exit");
    assert.ok(lane);
    fresh.here = lane.id;
    fresh.phase = "map";
    fresh.event = null;
    choose(fresh, "exit-leave");
    assert.equal(fresh.sectorMap, true);
    assert.equal(fresh.sector, 1);
  });

  it("Ruwen marks the Ancient device beacon in Rock Homeworlds, and another Crystal does not", () => {
    const quiet = createGame(4);
    quiet.sector = 5;
    quiet.sectorName = "Rock Homeworlds";
    quiet.crew = quiet.crew.filter((c) => c.side === "player").slice(0, 2);
    assert.ok(joinCrew(quiet, "Crystal", "Sera"));
    stampCitedEvents(quiet);
    const plain = quiet.beacons.find((b) => b.flag === "cited:ancient-device");
    assert.ok(plain);
    assert.equal(plain.quest, undefined);
    assert.equal(plain.name, "Ancient device");
    assert.ok(joinCrew(quiet, "Crystal", "Ruwen"));
    assert.equal(plain.quest, "ruwen-entry");
    assert.equal(plain.flag, "cited:ancient-device");
    assert.equal(plain.name, "Ancient device");

    const dead = createGame(5);
    dead.sector = 5;
    dead.sectorName = "Rock Homeworlds";
    dead.crew = dead.crew.filter((c) => c.side === "player").slice(0, 2);
    assert.ok(joinCrew(dead, "Crystal", "Ruwen"));
    const body = dead.crew.find((c) => c.name === "Ruwen");
    assert.ok(body);
    body.hp = 0;
    stampCitedEvents(dead);
    const unmarked = dead.beacons.find((b) => b.flag === "cited:ancient-device");
    assert.ok(unmarked);
    assert.equal(unmarked.quest, undefined);

    const g = createGame(6);
    g.sector = 5;
    g.sectorName = "Civilian Sector";
    g.crew = g.crew.filter((c) => c.side === "player").slice(0, 2);
    const stray = g.beacons.find((b) => b.kind !== "start" && b.kind !== "exit")!;
    stray.flag = "cited:ancient-device";
    assert.ok(joinCrew(g, "Crystal", "Ruwen"));
    assert.equal(stray.quest, undefined);
    stray.flag = "";

    g.sectorName = "Rock Homeworlds";
    stampCitedEvents(g);
    const entry = g.beacons.find((b) => b.flag === "cited:ancient-device");
    assert.ok(entry);
    assert.equal(entry.quest, "ruwen-entry");
    assert.equal(entry.flag, "cited:ancient-device");
    assert.equal(entry.name, "Ancient device");

    const start = g.beacons.find((b) => b.kind === "start")!;
    g.here = start.id;
    g.phase = "map";
    g.event = null;
    g.fuel = 5;
    g.fleet = 0;
    if (!start.links.includes(entry.id)) start.links.push(entry.id);
    commitJump(g, entry.id);
    assert.equal(g.phase, "event");
    assert.match(g.event!.body, /ancient device/i);
    assert.ok(g.event!.choices.some((c) => c.id === "c:ancient-device:2"));
    assert.equal(entry.quest, "ruwen-entry");

    entry.quest = "other-quest";
    markRuwenEntry(g);
    assert.equal(entry.quest, "other-quest");
    entry.quest = undefined;
    entry.resolved = true;
    markRuwenEntry(g);
    assert.equal(entry.quest, undefined);
  });

  it("Ancient device, Scrap it: high scrap, or a Rock ship", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 40 && seen.size < 2; seed++) {
      const g = atCited(createGame(seed), "Rock Homeworlds", "Ancient device");
      choose(g, "c:ancient-device:0");
      seen.add(g.phase === "combat" ? `fight:${g.enemy!.faction}` : "scrap");
    }
    assert.deepEqual([...seen].sort(), ["fight:rock", "scrap"]);
  });

  it("Unarmed Zoltan transport: the unarmed ship has no guns or shields and surrenders; 'Let them go.' ends it with nothing", () => {
    const g = seedWhere((x) => {
      atCited(x, "Zoltan Homeworlds", "Unarmed Zoltan transport");
      choose(x, "c:unarmed-zoltan-transport:0");
      return x.phase === "event";
    });
    assert.equal(g.enemy!.faction, "zoltan");
    assert.equal(g.enemy!.weapons.length, 0);
    assert.equal(g.enemy!.shieldNow, 0);
    assert.deepEqual(ids(g), ["qa:uzt:finish", "qa:uzt:go"]);
    const scrap = g.scrap;
    choose(g, "qa:uzt:go");
    assert.equal(g.enemy, null);
    assert.equal(g.scrap, scrap);
    assert.ok(g.event!.body.startsWith("You power down your weapons"));
  });

  it("Unarmed Zoltan transport: hear them out -> marker; the bloodless answer unlocks the Zoltan Cruiser", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 40 && seen.size < 2; seed++) {
      const g = atCited(createGame(seed), "Zoltan Homeworlds", "Unarmed Zoltan transport");
      g.sector = 4;
      choose(g, "c:unarmed-zoltan-transport:1");
      choose(g, "ack");
      goToQuest(g, "zoltan-peace");
      assert.deepEqual(ids(g), ["qa:peace:attack", "qa:peace:hail"]);
      choose(g, "qa:peace:hail");
      choose(g, "qa:peace:reconcile");
      g.crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
      choose(g, "qa:peace:bloodless");
      assert.ok(g.unlocked?.includes("zoltan-a"));
      if (g.player.zoltan === 5) seen.add("shield");
      if (g.crew.some((c) => c.name === "Envoy" && c.kin === "spark")) seen.add("envoy");
    }
    assert.deepEqual([...seen].sort(), ["envoy", "shield"]);
  });

  it("Unarmed Zoltan transport marker: the Rebel fights pay default rewards", () => {
    const g = createGame(11);
    g.sector = 4;
    addQuest(g, "zoltan-peace");
    goToQuest(g, "zoltan-peace");
    choose(g, "qa:peace:attack");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy!.faction, "rebel");
    assert.equal(g.fightEvent, "quest-zoltan-peace");
  });

  it("Zoltan research facility: Advanced Medbay blue option; the ambush pirate never surrenders and pays twice", () => {
    const g0 = atCited(createGame(2), "Zoltan Controlled Sector", "Zoltan research facility");
    if ((g0.player.systems.medbay?.level ?? 0) < 3) assert.equal(choiceDisabled(g0, "c:zoltan-research-facility:2"), "Needs Medbay level 3");
    const g = seedWhere((x) => {
      atCited(x, "Zoltan Controlled Sector", "Zoltan research facility");
      choose(x, "c:zoltan-research-facility:0");
      return x.phase === "combat";
    });
    assert.equal(g.enemy!.pirate, true);
    assert.equal(g.enemySurrender!.chance, 0);
    assert.equal(g.enemyEscape!.mode, "never");
    assert.equal(g.crew.filter((c) => c.side === "enemy" && c.aboard === "player").length, 2);
    winByHull(g);
    assert.ok(g.event!.body.startsWith("You take out the ship"));
    assert.deepEqual(ids(g), ["qa:zrf:thanks"]);
    const scrap = g.scrap;
    choose(g, "qa:zrf:thanks");
    assert.ok(g.event!.body.startsWith("\"Thank you for rescuing us!"));
    assert.ok(g.scrap > scrap);
  });

  it("Zoltan trade hub: blue options; the hub opens a store or adds the primitives marker, which shows that page's card", () => {
    const g0 = atCited(createGame(4), "Zoltan Controlled Sector", "Zoltan trade hub");
    g0.crew = g0.crew.filter((c) => c.kin !== "spark");
    assert.equal(choiceDisabled(g0, "c:zoltan-trade-hub:2"), "Needs a Zoltan crewmember");
    const seen = new Set<string>();
    for (let seed = 1; seed < 60 && seen.size < 3; seed++) {
      const g = atCited(createGame(seed), "Zoltan Controlled Sector", "Zoltan trade hub");
      g.sector = 4;
      choose(g, "c:zoltan-trade-hub:0");
      if (g.phase === "combat") {
        assert.equal(g.enemy!.faction, "zoltan");
        const n = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player" && c.kin === "spark").length;
        assert.ok(n >= 2 && n <= 4);
        seen.add("fight");
      } else if (ids(g).includes("q:open-store")) seen.add("store");
      else {
        seen.add("quest");
        choose(g, "ack");
        goToQuest(g, "zoltan-primitives");
        assert.deepEqual(ids(g), ["c:zoltan-quest-primitives:0", "c:zoltan-quest-primitives:1", "c:zoltan-quest-primitives:2"]);
        choose(g, "c:zoltan-quest-primitives:1");
        assert.equal(g.enemy!.faction, "rebel");
      }
    }
    assert.deepEqual([...seen].sort(), ["fight", "quest", "store"]);
  });

  it("Rock bride: marker; refusing adds Ariadne and fights a Rock ship for medium scrap with resources", () => {
    const g = atCited(createGame(6), "Rock Controlled Sector", "Rock bride");
    g.sector = 5;
    choose(g, "c:rock-bride:0");
    choose(g, "ack");
    goToQuest(g, "rock-bride");
    assert.deepEqual(ids(g), ["qa:bride:hand", "qa:bride:refuse"]);
    g.crew = g.crew.filter((c) => c.side === "player").slice(0, 3);
    choose(g, "qa:bride:refuse");
    assert.ok(g.crew.some((c) => c.name === "Ariadne" && c.kin === "stone"));
    assert.equal(g.enemy!.faction, "rock");
    winByHull(g);
    assert.ok(g.event!.body.startsWith("His escort eliminated"));
  });
});
