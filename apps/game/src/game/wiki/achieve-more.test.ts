import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { deriveUnlocks } from "../unlocks.ts";
import { noteAchieve } from "./achieve-notes.ts";
import { earnedNow } from "./achievement-track.ts";
import { stampCitedEvents } from "./cited-events.ts";
import { drawFiller } from "./filler-events.ts";

function quietMap(seed = 1, hullId?: string) {
  const g = createGame(seed, hullId);
  g.phase = "map";
  return g;
}

describe("achievement counters", () => {
  it("a shot, an upgrade, and a boarding drone end the quiet sector-5 lines", () => {
    const shot = quietMap();
    shot.sector = 5;
    assert.equal(earnedNow(shot).includes("coming-in-for-my-pacifism-run"), true);
    noteAchieve(shot, { k: "shot", from: "player", kind: "laser", defId: "burst2", rooms: ["a"] });
    assert.equal(earnedNow(shot).includes("coming-in-for-my-pacifism-run"), false);

    const raised = quietMap();
    raised.sector = 5;
    noteAchieve(raised, { k: "upgrade" });
    assert.equal(earnedNow(raised).includes("i-dont-need-no-stinkin-upgrades"), false);

    const drone = quietMap();
    drone.sector = 5;
    noteAchieve(drone, { k: "drone", kind: "COMBAT_1", functioning: 1 });
    assert.equal(earnedNow(drone).includes("coming-in-for-my-pacifism-run"), false);
    assert.equal(drone.tally?.droneHurt, undefined);
  });

  it("five failed evades with full engines latch, and a miss resets the streak", () => {
    const g = quietMap();
    const engines = g.player.systems.engines;
    engines.level = 8;
    engines.power = 8;
    engines.damage = 0;
    engines.ion = [];
    noteAchieve(g, { k: "fight" });
    for (let i = 0; i < 5; i++) noteAchieve(g, { k: "evade", missed: false });
    assert.equal(earnedNow(g).includes("astronomically-low-odds"), true);
    noteAchieve(g, { k: "evade", missed: true, damage: 1 });
    assert.equal(g.tally?.evadeStreak, 0);
    assert.equal(earnedNow(g).includes("astronomically-low-odds"), true);
  });

  it("a miss during a cloak counts that shot's damage as avoided", () => {
    const g = quietMap(1, "PLAYER_SHIP_STEALTH");
    g.player.kits.cloaking = {
      id: "cloaking",
      level: 1,
      power: 1,
      left: 5,
      cool: 0,
      target: null,
      on: true,
      aux: 0,
    };
    noteAchieve(g, { k: "cloak" });
    noteAchieve(g, { k: "evade", missed: true, damage: 9 });
    assert.equal(earnedNow(g).includes("phase-shift"), true);
  });

  it("repair from 1 hull to full latches Tough Little Ship on the Kestrel", () => {
    const g = quietMap(1, "PLAYER_SHIP_HARD");
    noteAchieve(g, { k: "hull", before: 1, after: g.player.hullMax });
    assert.equal(earnedNow(g).includes("tough-little-ship"), true);
  });

  it("a fire in every enemy room latches the burn line", () => {
    const g = quietMap();
    startCombat(g, "scout");
    assert.ok(g.enemy);
    for (const room of g.enemy.rooms) room.fire = 1;
    noteAchieve(g, { k: "tick" });
    assert.equal(earnedNow(g).includes("some-people-just-like-to-watch-ships-burn"), true);
  });

  it("sector 8 with no jump does not earn loss of cabin pressure", () => {
    const g = quietMap(1, "PLAYER_SHIP_ANAEROBIC");
    g.sector = 8;
    g.jumps = 0;
    noteAchieve(g, { k: "tick" });
    assert.equal(earnedNow(g).includes("loss-of-cabin-pressure"), false);
  });
});

/** Category:Advanced Edition Content Events. An old save may still carry ae: false. That field is ignored. */
const AE_TITLES = new Set([
  "Abandoned station",
  "Empty beacon (Lanius)",
  "Free scrap with resources (Lanius)",
  "Lanius craftsmen",
  "Lanius fight",
  "Lanius fight distress",
  "Lanius fight in asteroid field",
  "Lanius fight near pulsar",
  "Lanius fight with friendly ASB support",
  "Lanius lone ship",
  "Lanius powered-down ship",
  "Lanius ship absorbing automated scout",
  "Lanius ship absorbing jump beacon",
  "Lanius ship absorbing rebel base",
  "Lanius ship attacking Mantis",
  "Lanius ship attacking civilian",
  "Lanius ship attacking civilian distress",
  "Lanius ship in rich debris field",
  "Lanius ship salvager",
  "Lanius trader",
  "Lanius trader with translator",
  "Lanius with Federation science craft",
  "Large trade station",
  "Pirate fight (Lanius)",
  "Pirate fight near pulsar",
  "Pirate ship attacking civilian (Lanius)",
  "Rebel fight (Lanius)",
  "Rebel fight near pulsar",
  "Refueling platform garbled broadcast",
  "Space station under construction",
  "Store (Lanius)",
]);

describe("Advanced Edition content", () => {
  it("places tagged event titles even when an old save says content is off", () => {
    const g = quietMap(2);
    (g as { ae?: boolean }).ae = false;
    g.sectorId = "LANIUS_SECTOR";
    g.sectorName = "Abandoned Sector";
    for (const beacon of g.beacons) {
      if (beacon.kind === "start" || beacon.kind === "exit" || beacon.kind === "boss") continue;
      beacon.flag = "";
      beacon.name = "open";
    }
    stampCitedEvents(g);
    assert.equal(
      g.beacons.some((beacon) => AE_TITLES.has(beacon.name)),
      true,
    );
  });

  it("still draws an Advanced Edition filler page when an old save says content is off", () => {
    const g = quietMap();
    (g as { ae?: boolean }).ae = false;
    let saw = false;
    for (let i = 0; i < 400 && !saw; i++) {
      const page = drawFiller(g, "FILLER", []);
      if (page?.dest === "Abandoned station") saw = true;
    }
    assert.equal(saw, true);
  });

  it("unlocks layout C at sector 8 on layout B when an old save says content is off", () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const store = new Map<string, string>([["stl:ae", "0"]]);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    try {
      const g = createGame(1, "PLAYER_SHIP_HARD_2");
      assert.equal(Object.hasOwn(g, "ae"), false);
      (g as { ae?: boolean }).ae = false;
      g.sector = 8;
      const open = deriveUnlocks({ ships: ["PLAYER_SHIP_HARD"], wins: [] }, g, []);
      assert.equal(open.ships.includes("PLAYER_SHIP_HARD_3"), true);
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe("Givin' her all she's got, Captain!", () => {
  // The page: "a fully upgraded reactor plus 4 Zoltan crewmembers manning systems to provide 29 power".
  it("counts Zoltan bars toward the 29", () => {
    const g = quietMap(1, "PLAYER_SHIP_ENERGY");
    for (const sys of Object.values(g.player.systems)) {
      sys.power = 0;
      sys.ion = [];
      sys.damage = 0;
    }
    g.player.kits = {};
    const { shields, engines, weapons, oxygen, medbay } = g.player.systems;
    for (const [sys, level, power] of [
      [shields, 8, 8],
      [engines, 8, 8],
      [weapons, 8, 8],
      [oxygen, 3, 1],
      [medbay, 3, 0],
    ] as const) {
      sys.level = level;
      sys.power = power;
    }
    g.crew = [];
    assert.equal(earnedNow(g).includes("givin-her-all-shes-got-captain"), false);
    const room = (id: string) => g.player.rooms.find((r) => r.system === id)!.id;
    const spark = (id: string, at: string) => ({
      id,
      name: id,
      side: "player" as const,
      aboard: "player" as const,
      hp: 70,
      maxHp: 70,
      room: room(at),
      path: [],
      move: 0,
      think: 0,
      tone: 0,
      kin: "energy",
    });
    g.crew.push(spark("a", "medbay"), spark("b", "medbay"), spark("c", "medbay"));
    assert.equal(earnedNow(g).includes("givin-her-all-shes-got-captain"), false);
    g.crew.push(spark("d", "oxygen"));
    assert.equal(earnedNow(g).includes("givin-her-all-shes-got-captain"), true);
  });
});
