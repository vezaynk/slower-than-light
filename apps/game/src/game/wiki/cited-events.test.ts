import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediumScrapBand } from "../content.ts";
import { kinOf } from "../extras/kin.ts";
import {
  choose,
  chooseSector,
  closeAllDoors,
  commitJump,
  createGame,
  doorLevel,
  evasionPercent,
  openAllDoors,
  powerMask,
  startCombat,
  step,
  toggleDoor,
} from "../sim.ts";
import { eventDef } from "@stl/pack";
import type { Beacon, Game } from "../types.ts";
import { onCradleDeath } from "../extras/cradle.ts";
import {
  citedChoiceDisabled,
  citedChoose,
  citedEvent,
  stampCitedEvents,
  type CitedChoice,
} from "./cited-events.ts";
import { heldSchematics } from "./make-room.ts";
import { placeIn } from "../fixtures.ts";

function storyFlags(beacons: readonly { flag: string }[]): string[] {
  return beacons
    .map((b) => b.flag)
    .filter((flag) => flag !== "" && !flag.includes(":") && eventDef(flag) != null);
}

function beacon(name: string, flag = ""): Beacon {
  return {
    id: "b",
    col: 1,
    row: 1,
    links: [],
    kind: "event",
    visited: false,
    resolved: false,
    name,
    tier: "",
    flag,
    asteroid: false,
  };
}

function harness(g: Game, rolls: number[]) {
  const notes: string[] = [];
  const scrapCalls: number[] = [];
  let fought: { tier: string; asteroid?: boolean } | null = null;
  const ctx: CitedChoice = {
    g,
    resolve() {
      g.event = null;
      g.phase = "map";
    },
    fight(tier, asteroid) {
      fought = { tier, asteroid };
      g.event = null;
      g.phase = "combat";
    },
    scrap(n) {
      scrapCalls.push(n);
      if (n > 0) {
        g.scrap += n;
        g.scrapCollected += n;
      }
    },
    note(text) {
      notes.push(text);
    },
    irand(n) {
      const v = rolls.shift();
      assert.equal(typeof v, "number");
      assert.ok(v !== undefined && v >= 0 && v < n, `irand ${v} of ${n}`);
      return v as number;
    },
  };
  return { ctx, notes, scrapCalls, fought: () => fought };
}

describe("cited events", () => {
  it("spends 3 drone parts for 12 scrap and refuses when short", () => {
    const g = createGame(4, "PLAYER_SHIP_HARD", "normal");
    const ev = citedEvent(g, beacon("Sell drone parts for scrap"));
    assert.ok(ev);
    const sell = ev.choices.find((c) => c.label === "Sell 3 drone parts for 12 scrap");
    assert.ok(sell);
    g.player.parts = 2;
    g.scrap = 40;
    g.scrapCollected = 0;
    assert.equal(citedChoiceDisabled(g, sell.id), "Need 3 drone parts");
    const short = harness(g, []);
    assert.equal(citedChoose(short.ctx, sell.id), false);
    assert.equal(g.player.parts, 2);
    assert.equal(g.scrap, 40);
    assert.equal(g.scrapCollected, 0);
    assert.deepEqual(short.scrapCalls, []);

    g.player.parts = 3;
    assert.equal(citedChoiceDisabled(g, sell.id), null);
    const paid = harness(g, []);
    assert.equal(citedChoose(paid.ctx, sell.id), true);
    assert.equal(g.player.parts, 0);
    assert.equal(g.scrap, 52);
    assert.equal(g.scrapCollected, 12);
    // The station applies the scrap itself so Scrap Recovery Arm and Repair Arm can change it.
    assert.deepEqual(paid.scrapCalls, []);
    assert.ok(paid.notes.includes('"Thank you for your business."'));
    assert.ok(paid.notes.includes("You receive 12 scrap."));
    assert.equal(g.phase, "map");
  });

  it("rolls medium scrap inside the cited band and does not invent resources", () => {
    const g = createGame(5, "PLAYER_SHIP_HARD", "normal");
    g.sector = 1;
    g.difficulty = "normal";
    const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
    assert.deepEqual([lo, hi], [12, 19]);
    const ev = citedEvent(g, beacon("Free scrap with resources", "FREE_ITEMS"));
    assert.ok(ev);
    assert.notEqual(ev.body, "");
    assert.equal(ev.choices.length, 1);
    const id = ev.choices[0].id;
    const weapons = g.player.weapons.map((w) => w.defId).join(",");
    const kits = JSON.stringify(g.player.kits);
    const parts = g.player.parts;
    const crew = g.crew.length;
    const augments = g.augments.length;

    g.scrap = 0;
    g.scrapCollected = 0;
    const low = harness(g, [0]);
    assert.equal(citedChoose(low.ctx, id), true);
    assert.equal(g.scrap, lo);
    assert.equal(g.scrapCollected, lo);
    assert.ok(low.notes.some((n) => n === "Resource amounts are not stated."));
    assert.ok(low.notes.some((n) => n === `Medium scrap: ${lo}.`));

    g.scrap = 0;
    g.scrapCollected = 0;
    const high = harness(g, [hi - lo]);
    assert.equal(citedChoose(high.ctx, id), true);
    assert.equal(g.scrap, hi);
    assert.equal(g.player.weapons.map((w) => w.defId).join(","), weapons);
    assert.equal(JSON.stringify(g.player.kits), kits);
    assert.equal(g.player.parts, parts);
    assert.equal(g.crew.length, crew);
    assert.equal(g.augments.length, augments);
  });

  it("pays Free drone schematic's low scrap and a random drone schematic", () => {
    const g = createGame(5, "PLAYER_SHIP_HARD", "normal");
    const ev = citedEvent(g, beacon("Free drone schematic", "FIND_DRONE"));
    assert.ok(ev);
    assert.equal(ev.choices[0]?.label, "You receive a drone schematic with low scrap");
    const held = heldSchematics(g).length;
    g.scrap = 0;
    const run = harness(g, [0]);
    assert.equal(citedChoose(run.ctx, "c:free-drone-schematic:0"), true);
    assert.ok(g.scrap > 0);
    // Rewards, "Drone": "A random drone schematic & T scrap."
    assert.equal(heldSchematics(g).length, held + 1);
    assert.ok(
      run.notes.some((n) => / schematic (fitted|stowed in cargo)\.$/.test(n)),
      run.notes.join("\n"),
    );
  });

  it("pays Free scrap with resources (Engi) as a standard gift", () => {
    const g = createGame(6);
    const ev = citedEvent(g, beacon("Free scrap with resources (Engi)"));
    assert.ok(ev);
    assert.notEqual(ev.body, "");
    assert.equal(citedEvent(g, beacon("Engi Free Stuff")), null);
    g.scrap = 0;
    const run = harness(g, []);
    assert.equal(citedChoose(run.ctx, ev.choices[0]!.id), true);
    assert.ok(g.scrap > 0);
  });

  it("stamps a named sector once and leaves an existing flag alone", () => {
    const quiet = createGame(7);
    quiet.sectorId = "CINDER";
    quiet.sectorName = "Cinder Reach";
    for (const b of quiet.beacons) {
      if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
      b.flag = "";
      b.kind = "empty";
    }
    stampCitedEvents(quiet);
    assert.deepEqual(storyFlags(quiet.beacons), []);

    const g = createGame(8);
    g.sectorId = "CIVILIAN_SECTOR";
    g.sectorName = "Civilian Sector";
    for (const b of g.beacons) {
      if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
      b.flag = "";
      b.kind = "empty";
    }
    const held = g.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && b.kind !== "store",
    );
    assert.ok(held);
    held.flag = "engi-cache";
    held.name = "Engi cache";
    stampCitedEvents(g);
    const first = storyFlags(g.beacons);
    stampCitedEvents(g);
    const second = storyFlags(g.beacons);
    assert.ok(first.length >= 1);
    assert.deepEqual(second, first);
    assert.equal(new Set(first).size, first.length);
    assert.equal(held.flag, "engi-cache");
    assert.equal(
      g.beacons.some(
        (b) =>
          (b.kind === "exit" || b.kind === "start" || b.kind === "store") &&
          storyFlags([b]).length > 0,
      ),
      false,
    );
    const marked = g.beacons.find((b) => storyFlags([b]).length > 0);
    assert.ok(marked);
    assert.equal(marked.kind, "event");
    assert.ok(citedEvent(g, marked));
  });

  it("rolls the mercenary's 10-25 scrap cost and skips the delay in The Last Stand", () => {
    const g = createGame(9);
    g.sector = 3;
    g.sectorId = "CIVILIAN_SECTOR";
    g.sectorName = "Civilian Sector";
    const ev = citedEvent(g, beacon("The mercenary"));
    assert.ok(ev);
    const hire = ev.choices.find((c) => c.label === "Hire the mercenary to delay the Rebels");
    assert.ok(hire);
    g.scrap = 9;
    assert.equal(citedChoiceDisabled(g, hire.id), "Need 10 scrap");
    g.scrap = 10;
    g.fleet = 5;
    assert.equal(citedChoiceDisabled(g, hire.id), null);
    const over = harness(g, [15]);
    assert.equal(citedChoose(over.ctx, hire.id), false);
    assert.equal(g.scrap, 10);
    assert.equal(g.fleet, 5);

    g.scrap = 40;
    g.scrapCollected = 0;
    g.fleet = 6;
    const hired = harness(g, [0]);
    assert.equal(citedChoose(hired.ctx, hire.id), true);
    assert.equal(g.scrap, 30);
    assert.equal(g.scrapCollected, 0);
    assert.equal(g.fleet, 4);

    g.sector = 8;
    g.sectorId = "FINAL";
    g.sectorName = "The Last Stand";
    g.scrap = 40;
    g.fleet = 6;
    const last = harness(g, [0]);
    assert.equal(citedChoose(last.ctx, hire.id), true);
    assert.equal(g.scrap, 30);
    assert.equal(g.fleet, 6);
    assert.ok(last.notes.includes("No effect in The Last Stand."));
  });

  it("places the station when the sector opens and keeps the panel up if the price is short", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD", "normal");
    const start = g.route.find((node) => node.id === g.routeHere);
    assert.ok(start);
    g.phase = "map";
    g.sectorMap = true;
    const destId = start.links[0];
    const dest = g.route.find((node) => node.id === destId);
    assert.ok(dest);
    chooseSector(g, destId);
    assert.equal(g.sectorName, dest.name);
    const stamped = storyFlags(g.beacons);
    assert.ok(stamped.length >= 1, dest.name);
    assert.equal(
      g.beacons.filter((b) => b.flag === "BOSS_REPAIR_STATION").length,
      dest.name === "The Last Stand" ? 3 : 0,
    );

    const shop = createGame(4, "PLAYER_SHIP_HARD", "normal");
    const sell = shop.beacons.find(
      (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "store",
    );
    assert.ok(sell);
    sell.flag = "SELL_DRONES_STATION";
    sell.name = "Sell drone parts for scrap";
    sell.kind = "event";
    const here = shop.beacons.find((b) => b.id === shop.here);
    assert.ok(here);
    sell.col = 6;
    shop.fleet = 0;
    shop.fuel = 6;
    shop.phase = "map";
    shop.player.parts = 1;
    if (!here.links.includes(sell.id)) here.links.push(sell.id);
    commitJump(shop, sell.id);
    assert.equal(shop.phase, "event");
    const choice = shop.event?.choices.find((c) => c.label === "Sell 3 drone parts for 12 scrap");
    assert.ok(choice);
    choose(shop, choice.id);
    assert.equal(shop.phase, "event");
    assert.equal(shop.player.parts, 1);
    shop.player.parts = 3;
    const scrap = shop.scrap;
    choose(shop, choice.id);
    assert.equal(shop.phase, "event");
    assert.ok(shop.event?.body?.includes('"Thank you for your business."'));
    assert.ok(shop.event?.body?.includes("You receive 12 scrap."));
    assert.equal(shop.log.includes('"Thank you for your business."'), false);
    assert.equal(shop.log.includes("You receive 12 scrap."), false);
    assert.equal(shop.player.parts, 0);
    assert.equal(shop.scrap, scrap + 12);
    choose(shop, "ack");
    assert.equal(shop.phase, "map");
  });
});

describe("Auto-ship carrying shield virus", () => {
  it("halves player shield bars, rounding down, until that fight ends", () => {
    const g = createGame(31);
    g.sectorId = "CIVILIAN_SECTOR";
    g.sectorName = "Civilian Sector";
    const b = g.beacons.find(
      (x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store",
    );
    assert.ok(b);
    b.flag = "AUTO_HACKER";
    b.kind = "event";
    b.name = "Auto-ship carrying shield virus";
    g.here = b.id;
    g.event = citedEvent(g, b);
    g.phase = "event";
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.systems.shields.damage = 0;
    g.player.systems.shields.ion = [];
    g.player.shieldNow = 2;
    choose(g, "c:auto-ship-carrying-shield-virus:0");
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    if (g.enemy.kits.hacking) {
      g.enemy.kits.hacking.on = false;
      g.enemy.kits.hacking.power = 0;
    }
    assert.equal(g.player.shieldNow, 1);
    g.player.shieldNow = 2;
    step(g, 0.05);
    assert.equal(g.player.shieldNow, 1);
    g.player.systems.shields.level = 2;
    g.player.systems.shields.power = 2;
    g.player.shieldNow = 1;
    step(g, 0.05);
    assert.equal(g.player.shieldNow, 0);
    g.enemy.systems.shields.level = 4;
    g.enemy.systems.shields.power = 4;
    g.enemy.systems.shields.damage = 0;
    g.enemy.systems.shields.ion = [];
    g.enemy.shieldNow = 2;
    step(g, 0.05);
    assert.equal(g.enemy.shieldNow, 2);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    startCombat(g, "scout");
    assert.ok(g.enemy);
    for (const w of g.enemy.weapons) w.enabled = false;
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.systems.shields.damage = 0;
    g.player.shieldNow = 2;
    step(g, 0.05);
    assert.equal(g.player.shieldNow, 2);
  });
});

function openCited(g: ReturnType<typeof createGame>, sector: string, flag: string, name: string) {
  placeIn(g, sector);
  const b = g.beacons.find(
    (x) => x.kind !== "start" && x.kind !== "exit" && x.kind !== "boss" && x.kind !== "store",
  );
  assert.ok(b);
  b.flag = flag;
  b.kind = "event";
  b.name = name;
  g.here = b.id;
  g.event = citedEvent(g, b);
  g.phase = "event";
}

function quietEnemy(g: ReturnType<typeof createGame>) {
  assert.ok(g.enemy);
  for (const w of g.enemy.weapons) w.enabled = false;
  if (g.enemy.kits.hacking) {
    g.enemy.kits.hacking.on = false;
    g.enemy.kits.hacking.power = 0;
  }
}

describe("crew entirely composed of Mantis", () => {
  it("replaces any other race on the collector Fighter and the followed Mantis ship", () => {
    const hp = kinOf("mantis").hp;
    let fighter = false;
    let followed = false;
    for (let seed = 1; seed <= 40 && (!fighter || !followed); seed++) {
      const g = createGame(seed);
      openCited(g, "Mantis Controlled Sector", "DONOR_MANTIS_CHASE", "Mantis ship-collectors");
      choose(g, "c:mantis-ship-collectors:0");
      const aboard = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
      assert.ok(aboard.length > 0);
      assert.ok(
        aboard.every(
          (c) => c.kin === "mantis" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp,
        ),
      );
      assert.equal(
        g.log.some((line) => line.includes("Mantis crew is not applied")),
        false,
      );
      fighter = true;

      const z = createGame(seed);
      openCited(
        z,
        "Zoltan Controlled Sector",
        "ZOLTAN_DISTRESS_MANTIS",
        "Zoltan ship follows Mantis ship",
      );
      const lead =
        "You overtake the Zoltan and catch up with the Mantis ship in the asteroid belt. Time to make some friends.";
      choose(z, "c:zoltan-ship-follows-mantis-ship:1");
      assert.equal(z.phase, "event");
      assert.equal(z.event?.choices[0]?.id, "ship-resume");
      assert.equal(z.event?.body, lead);
      assert.equal(z.log.includes(lead), false);
      const theirs = z.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy");
      assert.ok(theirs.length > 0);
      assert.ok(
        theirs.every(
          (c) => c.kin === "mantis" && c.name === "Mantis" && c.hp === hp && c.maxHp === hp,
        ),
      );
      assert.equal(
        z.log.some((line) => line.includes("Mantis crew is not applied")),
        false,
      );
      choose(z, "ship-resume");
      assert.equal(z.phase, "combat");
      assert.equal(z.asteroid, true);
      assert.equal(z.enemy?.faction, "mantis");
      assert.equal(z.log.includes(lead), false);
      followed = true;
    }
    assert.equal(fighter && followed, true);
  });
});

describe("Zoltan border police", () => {
  it("beams 3-4 Zoltan boarders aboard with the Zoltan ship and grants nothing else", () => {
    const seen = new Set<number>();
    const hp = kinOf("energy").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      openCited(g, "Zoltan Controlled Sector", "ZOLTAN_BOARDERS", "Zoltan border police");
      choose(g, "c:zoltan-border-police:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "zoltan");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 3 && boarders.length <= 4, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Zoltan" &&
            c.kin === "energy" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarders named on the page are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} zoltan boarders beam aboard your ship.`),
      );
    }
    assert.deepEqual([...seen].sort(), [3, 4]);
  });

  it("shows the intro card on arrival, then the button starts the Zoltan boarders", () => {
    // The printed intro stays on the card. The button beams 3-4 zoltan boarders and starts the Zoltan ship.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "ZOLTAN_BOARDERS";
    dest.name = "Zoltan border police";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    commitJump(g, dest.id);
    const body =
      "There are few more zealous in their customs checks than the Zoltan. A team of border police beam on board. There's just a little confusion over your weapons licences, but things escalate rapidly from heated discussion to gunfire!";
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:zoltan-border-police:0");
    choose(g, "c:zoltan-border-police:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "zoltan");
    const zoltan = g.crew.filter(
      (c) => c.side === "enemy" && c.kin === "energy" && c.aboard === "player",
    );
    assert.ok(zoltan.length >= 3 && zoltan.length <= 4, String(zoltan.length));
    assert.ok(g.log.some((line) => line.includes("zoltan boarders beam aboard your ship.")));
    assert.equal(g.log.includes(body), false);
  });
});

describe("Boarders: Humans in plasma storm", () => {
  it("pays medium scrap and beams 3-4 human boarders aboard with no enemy ship", () => {
    const seen = new Set<number>();
    const hp = kinOf("human").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = createGame(seed);
      const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const kills = g.kills;
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      openCited(g, "Civilian Sector", "STORM_BOARDING", "Boarders: Humans in plasma storm");
      choose(g, "c:boarders-humans-in-plasma-storm:0");
      assert.equal(g.phase, "event");
      assert.equal(g.enemy, null);
      assert.equal(g.event?.choices[0]?.id, "ship-resume");
      const gained = g.scrap - scrap;
      assert.ok(gained >= lo && gained <= hi, String(gained));
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 3 && boarders.length <= 4, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Human" &&
            c.kin === "human" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.equal(g.kills, kills);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarders named on the page are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} human boarders beam aboard your ship.`),
      );
      assert.ok(g.event?.body?.includes("Medium scrap:"));
      assert.equal(
        g.log.some((line) => line.startsWith("Medium scrap: ")),
        false,
      );
      choose(g, "ship-resume");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy, null);
    }
    assert.deepEqual([...seen].sort(), [3, 4]);
  });
});

describe("Rebel fight with boarders", () => {
  it("beams 2-3 human boarders aboard with the Rebel ship and grants nothing else", () => {
    // Wiki citations:
    // > "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)." — [[Rebel fight with boarders]]
    const seen = new Set<number>();
    const hp = kinOf("human").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      openCited(g, "Rebel Controlled Sector", "BOARDERS_REBEL_SHIP", "Rebel fight with boarders");
      choose(g, "c:rebel-fight-with-boarders:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "rebel");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 2 && boarders.length <= 3, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Human" &&
            c.kin === "human" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarders named on the page are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} human boarders beam aboard your ship.`),
      );
    }
    assert.deepEqual([...seen].sort(), [2, 3]);
  });

  it("shows the intro card on arrival, then the button starts the Rebel boarders", () => {
    // The printed intro stays on the card. The button beams 2-3 human boarders and starts the Rebel ship.
    // Wiki citations:
    // > "2-3 human boarders beam aboard your ship, and you fight a Rebel ship (default rewards)." — [[Rebel fight with boarders]]
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "BOARDERS_REBEL_SHIP";
    dest.name = "Rebel fight with boarders";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    const intros = [
      'You receive a message from a nearby Rebel station, "You have a lot of guts passing through our space, I\'ll give you that." He turns giving an order, "Kill their crew, I want that ship intact."',
      'Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, "Ready to die? I sure am ready to get a promotion!"',
      'Incoming message, "Hello Captain," says a Rebel in an officer\'s garb. "How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient."',
      'You receive a message on a low-band channel. "You\'re surrounded, just like the last of your Federation friends. Just die already." The enemy has teleported onto your ship!',
    ];
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    const body = g.event?.body ?? "";
    assert.ok(intros.includes(body), body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:rebel-fight-with-boarders:0");
    choose(g, "c:rebel-fight-with-boarders:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "rebel");
    const humans = g.crew.filter(
      (c) => c.side === "enemy" && c.kin === "human" && c.aboard === "player",
    );
    assert.ok(humans.length >= 2 && humans.length <= 3, String(humans.length));
    assert.ok(g.log.some((line) => line.includes("human boarders beam aboard your ship.")));
    assert.equal(g.log.includes(body), false);
  });
});

describe("Mantis outcasts", () => {
  it("beams 2-3 Mantis boarders aboard with the Mantis ship and grants nothing else", () => {
    const seen = new Set<number>();
    const hp = kinOf("mantis").hp;
    for (let seed = 1; seed <= 80 && seen.size < 2; seed++) {
      const g = createGame(seed);
      const scrap = g.scrap;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      const weapons = g.player.weapons.map((w) => w.defId);
      const augments = [...g.augments];
      const crewIds = g.crew.filter((c) => c.side === "player").map((c) => c.id);
      const rooms = new Set(g.player.rooms.map((r) => r.id));
      openCited(g, "Zoltan Controlled Sector", "ZOLTAN_BOARDERS_MANTIS", "Mantis outcasts");
      choose(g, "c:mantis-outcasts:0");
      assert.equal(g.phase, "combat");
      assert.equal(g.enemy?.faction, "mantis");
      const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
      assert.ok(boarders.length >= 2 && boarders.length <= 3, String(boarders.length));
      seen.add(boarders.length);
      assert.ok(
        boarders.every(
          (c) =>
            c.name === "Mantis" &&
            c.kin === "mantis" &&
            c.hp === hp &&
            c.maxHp === hp &&
            rooms.has(c.room),
        ),
      );
      assert.equal(g.scrap, scrap);
      assert.equal(g.fuel, fuel);
      assert.equal(g.missiles, missiles);
      assert.equal(g.player.parts, parts);
      assert.deepEqual(
        g.player.weapons.map((w) => w.defId),
        weapons,
      );
      assert.deepEqual(g.augments, augments);
      assert.deepEqual(
        g.crew.filter((c) => c.side === "player").map((c) => c.id),
        crewIds,
      );
      assert.equal(
        g.log.some((line) => line.includes("Boarders named on the page are not applied")),
        false,
      );
      assert.ok(
        g.log.some((line) => line === `${boarders.length} mantis boarders beam aboard your ship.`),
      );
    }
    assert.deepEqual([...seen].sort(), [2, 3]);
  });

  it("shows the intro card on arrival, then the button starts the Mantis outcasts", () => {
    // The printed intro stays on the card. The button beams 2-3 mantis boarders and starts the Mantis ship.
    const g = createGame(4);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here?.links[0]);
    const dest = g.beacons.find((b) => b.id === here!.links[0]);
    assert.ok(dest);
    dest.kind = "event";
    dest.flag = "ZOLTAN_BOARDERS_MANTIS";
    dest.name = "Mantis outcasts";
    dest.resolved = false;
    dest.tier = "";
    dest.col = 20;
    g.fuel = 3;
    g.fleet = 0;
    g.sector = 1;
    g.phase = "map";
    g.event = null;
    const body =
      "The Mantis outcasts sometimes make the mistake of taking the Zoltan for easy game. A scout moves in to attack while a boarding party beams aboard from a nearby transport!";
    commitJump(g, dest.id);
    assert.equal(g.phase, "event");
    assert.equal(g.event?.body, body);
    assert.equal(g.log.includes(body), false);
    assert.equal(g.event?.choices[0]?.id, "c:mantis-outcasts:0");
    choose(g, "c:mantis-outcasts:0");
    if (g.event?.choices[0]?.id === "ship-resume") choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "mantis");
    const mantis = g.crew.filter(
      (c) => c.side === "enemy" && c.kin === "mantis" && c.aboard === "player",
    );
    assert.ok(mantis.length >= 2 && mantis.length <= 3, String(mantis.length));
    assert.ok(g.log.some((line) => line.includes("mantis boarders beam aboard your ship.")));
    assert.equal(g.log.includes(body), false);
  });
});

describe("Slug hacker (choice)", () => {
  it("halves the chosen system, rounding down, until that fight ends", () => {
    const shields = createGame(41);
    openCited(
      shields,
      "Slug Controlled Nebula",
      "NEBULA_SLUG_CHOOSE_DEATH",
      "Slug hacker (choice)",
    );
    shields.player.systems.shields.level = 4;
    shields.player.systems.shields.power = 4;
    shields.player.systems.shields.damage = 0;
    shields.player.systems.shields.ion = [];
    shields.player.shieldNow = 2;
    const shieldsLead = `"Very good then!" Your shield power suddenly drops and they charge.`;
    choose(shields, "c:slug-hacker-choice:0");
    assert.equal(shields.phase, "event");
    assert.equal(shields.event?.choices[0]?.id, "ship-resume");
    assert.equal(shields.event?.body, shieldsLead);
    assert.equal(shields.log.includes(shieldsLead), false);
    assert.equal(shields.player.shieldNow, 1);
    choose(shields, "ship-resume");
    assert.equal(shields.phase, "combat");
    assert.equal(shields.player.shieldNow, 1);

    const air = createGame(42);
    openCited(air, "Slug Controlled Nebula", "NEBULA_SLUG_CHOOSE_DEATH", "Slug hacker (choice)");
    air.player.systems.oxygen.level = 2;
    air.player.systems.oxygen.power = 2;
    air.player.systems.oxygen.damage = 0;
    air.player.systems.oxygen.ion = [];
    const away = air.player.rooms.find((r) => r.system !== "oxygen");
    assert.ok(away);
    for (const c of air.crew) if (c.side === "player") c.room = away.id;
    for (const d of air.player.doors) d.open = false;
    for (const r of air.player.rooms) {
      r.o2 = 50;
      r.fire = 0;
      r.breach = 0;
    }
    const airLead = `"A being that would choose sssuffocation? Who am I to judge..." Your life support shuts off and they move in to attack.`;
    choose(air, "c:slug-hacker-choice:1");
    assert.equal(air.phase, "event");
    assert.equal(air.event?.choices[0]?.id, "ship-resume");
    assert.equal(air.event?.body, airLead);
    assert.equal(air.log.includes(airLead), false);
    quietEnemy(air);
    choose(air, "ship-resume");
    assert.equal(air.phase, "combat");
    // A room nobody breathes in (air.ts), so the change is the refill alone.
    const room = air.player.rooms.find(
      (r) => !air.crew.some((c) => c.aboard === "player" && c.hp > 0 && c.room === r.id),
    );
    assert.ok(room);
    const before = room.o2;
    step(air, 0.05);
    const gained = room.o2 - before;
    assert.ok(gained > 0.04 && gained < 0.1, String(gained));

    const guns = createGame(43);
    openCited(guns, "Slug Controlled Nebula", "NEBULA_SLUG_CHOOSE_DEATH", "Slug hacker (choice)");
    guns.player.systems.weapons.level = 2;
    guns.player.systems.weapons.power = 2;
    guns.player.systems.weapons.damage = 0;
    guns.player.systems.weapons.ion = [];
    guns.player.weapons = [
      { uid: "a", defId: "LASER_BURST_1", charge: 0, enabled: true, autofire: false, target: null },
      { uid: "b", defId: "LASER_BURST_1", charge: 0, enabled: true, autofire: false, target: null },
    ];
    const gunsLead = `"Your acceptance of death is almosst admirable... Almosst." Your weapons system registers a hacking module. You hardly have time to respond before they attack.`;
    choose(guns, "c:slug-hacker-choice:2");
    assert.equal(guns.phase, "event");
    assert.equal(guns.event?.choices[0]?.id, "ship-resume");
    assert.equal(guns.event?.body, gunsLead);
    assert.equal(guns.log.includes(gunsLead), false);
    assert.deepEqual(powerMask(guns.player), [true, false]);
    choose(guns, "ship-resume");
    assert.equal(guns.phase, "combat");
    assert.deepEqual(powerMask(guns.player), [true, false]);
    quietEnemy(guns);
    assert.ok(guns.enemy);
    guns.enemy.hull = 0;
    step(guns, 0.05);
    assert.notEqual(guns.phase, "combat");
    startCombat(guns, "scout");
    assert.deepEqual(powerMask(guns.player), [true, true]);
  });
});

describe("The Engi virus", () => {
  it("halves Engines and Shields, rounding down, until that fight ends", () => {
    const g = createGame(51);
    openCited(g, "Engi Controlled Sector", "ENGI_VIRUS", "The Engi virus");
    g.player.systems.shields.level = 4;
    g.player.systems.shields.power = 4;
    g.player.systems.shields.damage = 0;
    g.player.systems.shields.ion = [];
    g.player.shieldNow = 2;
    g.player.systems.engines.level = 6;
    g.player.systems.engines.power = 6;
    g.player.systems.engines.damage = 0;
    g.player.systems.engines.ion = [];
    const wipe =
      "Wiping your engine core and shields proves useless... eventually you trap the virus in the weapons systems to purge it, but before you do, the Engi grow restless and attack!";
    choose(g, "c:the-engi-virus:0");
    assert.equal(g.phase, "event");
    assert.equal(g.event?.choices[0]?.id, "ship-resume");
    assert.equal(g.event?.body, wipe);
    assert.equal(g.log.includes(wipe), false);
    choose(g, "ship-resume");
    assert.equal(g.phase, "combat");
    quietEnemy(g);
    assert.equal(g.player.shieldNow, 1);
    const halved = evasionPercent(g, g.player, "player");
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    assert.ok(evasionPercent(g, g.player, "player") > halved);
  });
});

describe("Slug hacker (doors)", () => {
  it("takes the Door System offline until that fight ends", () => {
    const g = createGame(61);
    openCited(g, "Slug Controlled Nebula", "NEBULA_SLUG_DOORS", "Slug hacker (doors)");
    g.player.systems.doors.level = 3;
    g.player.systems.doors.damage = 0;
    g.player.systems.doors.ion = [];
    assert.ok(doorLevel(g, g.player, "player") >= 2);
    const door = g.player.doors.find((d) => d.b !== "void");
    assert.ok(door);
    const open = door.open;
    choose(g, "c:slug-hacker-doors:0");
    assert.equal(g.phase, "combat");
    quietEnemy(g);
    assert.equal(doorLevel(g, g.player, "player"), 0);
    assert.ok(g.enemy);
    if (g.enemy.systems.doors.level > g.enemy.systems.doors.damage) {
      assert.ok(doorLevel(g, g.enemy, "enemy") > 0);
    }
    toggleDoor(g, door.a, door.b);
    assert.equal(door.open, open);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    assert.ok(doorLevel(g, g.player, "player") >= 2);
  });
});

describe("Door System open and close", () => {
  it("opens every door, then shuts them again", () => {
    const g = createGame(3);
    startCombat(g, "scout");
    g.player.systems.doors.level = 2;
    g.player.systems.doors.damage = 0;
    g.player.systems.doors.ion = [];
    for (const door of g.player.doors) door.open = false;
    openAllDoors(g);
    assert.ok(g.player.doors.some((door) => door.open));
    closeAllDoors(g);
    assert.ok(g.player.doors.every((door) => !door.open));
    assert.ok(g.player.rooms.every((room) => !room.venting));
  });
});

describe("Slug hacker (oxygen)", () => {
  it("takes the Oxygen system offline until that fight ends", () => {
    const g = createGame(71);
    openCited(g, "Slug Controlled Nebula", "NEBULA_SLUG_OXYGEN", "Slug hacker (oxygen)");
    g.player.systems.oxygen.level = 2;
    g.player.systems.oxygen.power = 2;
    g.player.systems.oxygen.damage = 0;
    g.player.systems.oxygen.ion = [];
    choose(g, "c:slug-hacker-oxygen:0");
    assert.equal(g.phase, "combat");
    quietEnemy(g);
    assert.equal(g.player.systems.oxygen.level, 2);
    for (const d of g.player.doors) d.open = false;
    for (const r of g.player.rooms) {
      r.o2 = 50;
      r.fire = 0;
      r.breach = 0;
    }
    // A room nobody breathes in (air.ts): with no production it holds its air. Level 2 would add 0.24 per step.
    const room = g.player.rooms.find(
      (r) => !g.crew.some((c) => c.aboard === "player" && c.hp > 0 && c.room === r.id),
    );
    assert.ok(room);
    const before = room.o2;
    step(g, 0.05);
    const change = room.o2 - before;
    // The hull leak (air.ts, toward space at -50%) takes about 0.01 a step; production would add 0.24.
    assert.ok(Math.abs(change) < 0.02, String(change));
    assert.ok(g.enemy);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    startCombat(g, "scout");
    quietEnemy(g);
    for (const d of g.player.doors) d.open = false;
    for (const r of g.player.rooms) {
      r.o2 = 50;
      r.fire = 0;
      r.breach = 0;
    }
    const again = g.player.rooms[0];
    assert.ok(again);
    const held = again.o2;
    step(g, 0.05);
    const gained = again.o2 - held;
    assert.ok(gained > 0.2 && gained < 0.3, String(gained));
  });
});

describe("Slug hacker (medical)", () => {
  it("takes the Medbay and Clone Bay offline until that fight ends", () => {
    const g = createGame(81);
    openCited(g, "Slug Controlled Nebula", "NEBULA_SLUG_MEDBAY", "Slug hacker (medical)");
    g.player.systems.medbay.level = 3;
    g.player.systems.medbay.power = 3;
    g.player.systems.medbay.damage = 0;
    g.player.systems.medbay.ion = [];
    g.player.kits.clonebay = {
      id: "clonebay",
      level: 1,
      power: 1,
      left: 0,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    const bay = g.player.rooms.find((r) => r.system === "medbay");
    assert.ok(bay);
    const patient = g.crew.find((c) => c.side === "player" && c.hp > 0);
    assert.ok(patient);
    patient.room = bay.id;
    patient.aboard = "player";
    patient.path = [];
    patient.hp = Math.max(1, patient.maxHp - 20);
    bay.fire = 0;
    bay.o2 = 100;
    const crewBefore = g.crew.filter((c) => c.side === "player").length;
    const scrap = g.scrap;
    const fuel = g.fuel;
    const missiles = g.missiles;
    const parts = g.player.parts;
    choose(g, "c:slug-hacker-medical:0");
    assert.equal(g.phase, "combat");
    assert.equal(g.enemy?.faction, "slug");
    const hp = kinOf("slug").hp;
    const rooms = new Set(g.player.rooms.map((r) => r.id));
    const boarders = g.crew.filter((c) => c.side === "enemy" && c.aboard === "player");
    assert.equal(boarders.length, 2);
    assert.ok(
      boarders.every(
        (c) =>
          c.name === "Slug" &&
          c.kin === "slug" &&
          c.hp === hp &&
          c.maxHp === hp &&
          rooms.has(c.room),
      ),
    );
    assert.equal(g.scrap, scrap);
    assert.equal(g.fuel, fuel);
    assert.equal(g.missiles, missiles);
    assert.equal(g.player.parts, parts);
    assert.equal(
      g.log.some((line) => line.includes("Boarders named on the page are not applied")),
      false,
    );
    assert.ok(g.log.some((line) => line === "2 slug boarders beam aboard your ship."));
    const away = g.player.rooms.find((r) => r.id !== bay.id);
    assert.ok(away);
    for (const boarder of boarders) boarder.room = away.id;
    quietEnemy(g);
    assert.ok(g.enemy);
    for (const kit of Object.values(g.enemy.kits)) {
      if (!kit) continue;
      kit.power = 0;
      kit.on = false;
    }
    assert.equal(g.player.systems.medbay.level, 3);
    assert.equal(g.crew.filter((c) => c.side === "player").length, crewBefore);
    patient.room = bay.id;
    patient.path = [];
    const hurt = patient.hp;
    step(g, 0.05);
    assert.equal(patient.hp, hurt);
    patient.hp = 0;
    assert.equal(onCradleDeath(g, patient), false);
    assert.equal(patient.cloneIn, undefined);
    patient.hp = patient.maxHp;
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    startCombat(g, "scout");
    quietEnemy(g);
    patient.room = bay.id;
    patient.aboard = "player";
    patient.path = [];
    patient.hp = Math.max(1, patient.maxHp - 20);
    bay.fire = 0;
    bay.o2 = 100;
    const held = patient.hp;
    step(g, 0.05);
    assert.ok(patient.hp > held);
    patient.hp = 0;
    assert.equal(onCradleDeath(g, patient), true);
    assert.ok((patient.cloneIn ?? 0) > 0);
  });
});

describe("Lanius fight with friendly ASB support", () => {
  it("fires the Anti-Ship Battery at the other ship", () => {
    const g = createGame(91);
    openCited(
      g,
      "Abandoned Sector",
      "LANIUS_NOBOARDERS_PDS",
      "Lanius fight with friendly ASB support",
    );
    choose(g, "c:lanius-fight-with-friendly-asb-support:0");
    assert.equal(g.phase, "combat");
    quietEnemy(g);
    assert.equal(g.asb, true);
    assert.ok(g.asbWait > 0);
    assert.ok(g.enemy);
    g.asbT = g.asbWait;
    step(g, 0.05);
    assert.equal(g.asbPhase, "shot");
    g.asbT = g.asbWait;
    const hull = g.player.hull;
    step(g, 0.05);
    const shot = g.shots.find((s) => s.from === "env" && s.label === "Artillery");
    assert.ok(shot);
    assert.equal(shot.at, "enemy");
    assert.equal(shot.damage, 3);
    assert.equal(shot.breachChance, 1);
    assert.ok(g.enemy.rooms.some((r) => r.id === shot.targetRoom));
    assert.equal(g.player.hull, hull);
    g.enemy.hull = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    startCombat(g, "scout");
    quietEnemy(g);
    g.shots = [];
    g.asb = true;
    g.asbPhase = "shot";
    g.asbWait = 0.01;
    g.asbT = 0.01;
    step(g, 0.05);
    const later = g.shots.find((s) => s.from === "env" && s.label === "Artillery");
    assert.ok(later);
    assert.equal(later.at, undefined);
    assert.ok(g.player.rooms.some((r) => r.id === later.targetRoom));
  });
});
